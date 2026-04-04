import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const datasetPath = path.resolve("datasets/frontstage/pilot-v0.1/package/gold-v0.1.jsonl");
const resultPath = path.resolve("experiments/frontstage-pilot/results/package-baseline-v0.1.json");

function parseJsonl(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

function normalize(text) {
  return (text ?? "").replace(/\s+/g, "").replace(/[，。！？、,.!?:：]/g, "").toLowerCase();
}

function charFeatures(text) {
  const normalized = normalize(text);
  const features = new Set();
  for (const char of normalized) features.add(char);
  for (let index = 0; index < normalized.length - 1; index += 1) {
    features.add(normalized.slice(index, index + 2));
  }
  return features;
}

function jaccard(left, right) {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreCandidate(query, candidate) {
  return jaccard(charFeatures(query.input.inputText), charFeatures(candidate.input.inputText));
}

function uniqueStrings(items) {
  return [...new Set(items)];
}

function f1(predictedItems, goldItems) {
  const predicted = new Set(predictedItems);
  const gold = new Set(goldItems);
  const truePositive = [...predicted].filter((item) => gold.has(item)).length;
  const precision = predicted.size === 0 ? 1 : truePositive / predicted.size;
  const recall = gold.size === 0 ? 1 : truePositive / gold.size;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

const samples = parseJsonl(await readFile(datasetPath, "utf8"));
const details = [];

for (const sample of samples) {
  const train = samples.filter((candidate) => candidate.id !== sample.id);
  let best = train[0];
  let bestScore = -1;
  for (const candidate of train) {
    const score = scoreCandidate(sample, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const predicted = best.output.package;
  const gold = sample.output.package;
  const handleF1 = f1(
    predicted.interpretationHandles.map((item) => item.id),
    gold.interpretationHandles.map((item) => item.id),
  );
  const axisF1 = f1(
    predicted.compositionAxes.map((item) => item.id),
    gold.compositionAxes.map((item) => item.id),
  );
  const misleadingF1 = f1(
    predicted.misleadingPaths.map((item) => item.label),
    gold.misleadingPaths.map((item) => item.label),
  );

  details.push({
    id: sample.id,
    inputText: sample.input.inputText,
    matchedTrainId: best.id,
    matchedTrainText: best.input.inputText,
    similarity: Number(bestScore.toFixed(4)),
    goldDomain: gold.interpretationDomain,
    predictedDomain: predicted.interpretationDomain,
    goldConfidence: gold.domainConfidence,
    predictedConfidence: predicted.domainConfidence,
    handleF1: Number(handleF1.toFixed(4)),
    axisF1: Number(axisF1.toFixed(4)),
    misleadingPathF1: Number(misleadingF1.toFixed(4)),
    missingHandleIds: gold.interpretationHandles.map((item) => item.id).filter((item) => !predicted.interpretationHandles.some((candidate) => candidate.id === item)),
    extraHandleIds: predicted.interpretationHandles.map((item) => item.id).filter((item) => !gold.interpretationHandles.some((candidate) => candidate.id === item)),
  });
}

const summary = {
  task: "package-task",
  baseline: "leave-one-out nearest-neighbor retrieval",
  dataset: path.relative(process.cwd(), datasetPath),
  sampleCount: samples.length,
  domainAccuracy: Number((details.filter((item) => item.goldDomain === item.predictedDomain).length / details.length).toFixed(4)),
  confidenceAccuracy: Number((details.filter((item) => item.goldConfidence === item.predictedConfidence).length / details.length).toFixed(4)),
  averageHandleF1: Number((details.reduce((sum, item) => sum + item.handleF1, 0) / details.length).toFixed(4)),
  averageAxisF1: Number((details.reduce((sum, item) => sum + item.axisF1, 0) / details.length).toFixed(4)),
  averageMisleadingPathF1: Number((details.reduce((sum, item) => sum + item.misleadingPathF1, 0) / details.length).toFixed(4)),
  domainErrors: uniqueStrings(
    details
      .filter((item) => item.goldDomain !== item.predictedDomain)
      .map((item) => `${item.id}: ${item.goldDomain} -> ${item.predictedDomain}`),
  ),
  observations: [
    "Domain retrieval is strongest when the input contains unique lexical anchors such as 薰衣草, 烟雨, 石头.",
    "Handles and axes degrade first on mixed-imagery and vague-preference cases because nearest-neighbor copying over-commits to one prior structure.",
    "If package training is attempted next, the first likely gains should come from domain + handle extraction before trying to predict full axis inventories perfectly.",
  ],
};

const output = { summary, details };
await mkdir(path.dirname(resultPath), { recursive: true });
await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
