import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const datasetPath = path.resolve("datasets/frontstage/pilot-v0.1/feedback-signals/gold-v0.1.jsonl");
const resultPath = path.resolve("experiments/frontstage-pilot/results/feedback-baseline-v0.1.json");

function parseJsonl(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

function normalize(text) {
  return (text ?? "").replace(/\s+/g, "").replace(/[，。！？、,.!?:：]/g, "").toLowerCase();
}

function featureSet(sample) {
  const features = new Set();
  const pieces = [
    sample.input.userFeedbackText,
    sample.input.inputText,
    sample.input.previousPackage?.interpretationDomain,
    ...(sample.input.previousResponsePlan?.compositionProposals ?? []).map((item) => item.title),
  ];
  for (const piece of pieces) {
    const normalized = normalize(piece);
    for (const char of normalized) features.add(char);
    for (let index = 0; index < normalized.length - 1; index += 1) {
      features.add(normalized.slice(index, index + 2));
    }
  }
  return features;
}

function jaccard(left, right) {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function arrayEqual(left = [], right = []) {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

const samples = parseJsonl(await readFile(datasetPath, "utf8"));
const details = [];

for (const sample of samples) {
  const train = samples.filter((candidate) => candidate.id !== sample.id);
  const evalFeatures = featureSet(sample);
  let best = train[0];
  let bestScore = -1;
  for (const candidate of train) {
    const score = jaccard(evalFeatures, featureSet(candidate))
      + (candidate.input.previousPackage?.interpretationDomain === sample.input.previousPackage?.interpretationDomain ? 0.15 : 0);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const predicted = best.output.proposalFeedbackSignal;
  const gold = sample.output.proposalFeedbackSignal;
  const fieldMatches = {
    selectedProposalIds: arrayEqual(predicted.selectedProposalIds, gold.selectedProposalIds),
    blendedProposalIds: arrayEqual(predicted.blendedProposalIds, gold.blendedProposalIds),
    boostedHandles: arrayEqual(predicted.boostedHandles, gold.boostedHandles),
    reducedHandles: arrayEqual(predicted.reducedHandles, gold.reducedHandles),
    correctedDomain: (predicted.correctedDomain ?? null) === (gold.correctedDomain ?? null),
  };

  details.push({
    id: sample.id,
    inputText: sample.input.inputText,
    feedbackText: sample.input.userFeedbackText,
    matchedTrainId: best.id,
    matchedTrainText: best.input.userFeedbackText,
    similarity: Number(bestScore.toFixed(4)),
    goldSignal: gold,
    predictedSignal: predicted,
    fieldMatches,
    exactMatch: Object.values(fieldMatches).every(Boolean),
  });
}

function accuracyFor(field) {
  return Number((details.filter((item) => item.fieldMatches[field]).length / details.length).toFixed(4));
}

const summary = {
  task: "feedback-task",
  baseline: "leave-one-out nearest-neighbor retrieval",
  dataset: path.relative(process.cwd(), datasetPath),
  sampleCount: samples.length,
  exactMatchAccuracy: Number((details.filter((item) => item.exactMatch).length / details.length).toFixed(4)),
  selectedProposalAccuracy: accuracyFor("selectedProposalIds"),
  blendedProposalAccuracy: accuracyFor("blendedProposalIds"),
  boostedHandlesAccuracy: accuracyFor("boostedHandles"),
  reducedHandlesAccuracy: accuracyFor("reducedHandles"),
  correctedDomainAccuracy: accuracyFor("correctedDomain"),
  observations: [
    "Corrected-domain is comparatively learnable because the feedback phrasing contains strong lexical anchors.",
    "Boost/reduce conflicts remain the main failure mode because nearest-neighbor retrieval copies the wrong prior intent emphasis.",
    "Blend-proposals coverage is better than before but still sparser than select/boost, so current blend metrics are only a pilot warning signal.",
  ],
};

const output = { summary, details };
await mkdir(path.dirname(resultPath), { recursive: true });
await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
