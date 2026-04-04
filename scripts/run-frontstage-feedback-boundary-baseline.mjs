import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const datasetPath = path.resolve("datasets/frontstage/pilot-v0.1/feedback-signals/gold-v0.1.jsonl");
const resultPath = path.resolve("experiments/frontstage-pilot/results/feedback-boundary-baseline-v0.1.json");

function parseJsonl(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function inferSignal(sample) {
  const text = sample.input.userFeedbackText;
  const proposals = sample.input.previousResponsePlan?.compositionProposals ?? [];
  const firstProposalId = proposals[0]?.id;
  const secondProposalId = proposals[1]?.id;
  const thirdProposalId = proposals[2]?.id;
  const previousDomain = sample.input.previousPackage?.interpretationDomain;

  const signal = { sourceText: text };

  const corrected = hasAny(text, ["另起", "作废", "换成", "改走", "pure coastal", "纯雨前空气", "退出"]);
  const blend = hasAny(text, ["揉成", "揉在一起", "拼在一起", "混成", "叠在一起", "不要单选", "不单定"]);
  const explicitSelectFirst = hasAny(text, ["就定第一种", "就按第一种", "只留第一种", "第一种走"]);
  const explicitSelectSecond = hasAny(text, ["就定第二种", "就按第二种", "只留第二种", "第二种走"]);

  if (corrected) {
    if (hasAny(text, ["草本花香", "花香那边"])) signal.correctedDomain = "floralHerbalScent";
    if (hasAny(text, ["雨前空气", "下雨前", "压着的空气"])) signal.correctedDomain = "moistThresholdAtmosphere";
    if (hasAny(text, ["亮白空气", "靠海", "coastal"])) signal.correctedDomain = "coastalAiryBrightness";
  } else if (blend) {
    if (hasAny(text, ["第一种"]) && hasAny(text, ["第三种"]) && firstProposalId && thirdProposalId) {
      signal.blendedProposalIds = [firstProposalId, thirdProposalId];
    } else if (hasAny(text, ["第二种"]) && hasAny(text, ["第三种"]) && secondProposalId && thirdProposalId) {
      signal.blendedProposalIds = [secondProposalId, thirdProposalId];
    } else if (hasAny(text, ["第一种"]) && hasAny(text, ["第二种"]) && firstProposalId && secondProposalId) {
      signal.blendedProposalIds = [firstProposalId, secondProposalId];
    }
  } else if (explicitSelectFirst && firstProposalId) {
    signal.selectedProposalIds = [firstProposalId];
  } else if (explicitSelectSecond && secondProposalId) {
    signal.selectedProposalIds = [secondProposalId];
  }

  if (hasAny(text, ["空气多一点", "空气再收一点", "亮空气再收一点", "空气别丢"])) {
    signal.boostedHandles = [...new Set([...(signal.boostedHandles ?? []), "coastal-bright-air"])];
  }
  if (hasAny(text, ["香气再散开", "香气往前一点"])) {
    signal.boostedHandles = [...new Set([...(signal.boostedHandles ?? []), "scent-floating", "scent-into-air"])];
  }
  if (hasAny(text, ["竹影再轻", "竹影整个拿掉", "竹影那个方向先收掉"])) {
    signal.reducedHandles = [...new Set([...(signal.reducedHandles ?? []), "bamboo-shadow-trace"])];
  }
  if (hasAny(text, ["叶感再轻", "叶子先别那么重", "不要叶痕", "叶痕整组拿掉", "叶子先拿掉"])) {
    signal.reducedHandles = [...new Set([...(signal.reducedHandles ?? []), "lemon-leaf-trace"])];
  }
  if (hasAny(text, ["植物影子再少一点", "植物那层再退一点"])) {
    signal.reducedHandles = [...new Set([...(signal.reducedHandles ?? []), "lavender-botanical-trace"])];
  }

  if (previousDomain === "moistThresholdAtmosphere" && hasAny(text, ["再轻一点", "沿原案", "不另起别案"])) {
    signal.boostedHandles = [...new Set([...(signal.boostedHandles ?? []), "low-presence"])];
    signal.reducedHandles = [...new Set([...(signal.reducedHandles ?? []), "mist-rain-field"])];
  }
  if (previousDomain === "coastalAiryBrightness" && hasAny(text, ["别那么铺", "收边", "沿着这版"])) {
    signal.boostedHandles = [...new Set([...(signal.boostedHandles ?? []), "coastal-bright-air"])];
    signal.reducedHandles = [...new Set([...(signal.reducedHandles ?? []), "scent-floating"])];
  }

  return signal;
}

function arrayEqual(left = [], right = []) {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

const samples = parseJsonl(await readFile(datasetPath, "utf8"));
const details = [];

for (const sample of samples) {
  const predicted = inferSignal(sample);
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
  baseline: "rule-based boundary baseline",
  dataset: path.relative(process.cwd(), datasetPath),
  sampleCount: samples.length,
  exactMatchAccuracy: Number((details.filter((item) => item.exactMatch).length / details.length).toFixed(4)),
  selectedProposalAccuracy: accuracyFor("selectedProposalIds"),
  blendedProposalAccuracy: accuracyFor("blendedProposalIds"),
  boostedHandlesAccuracy: accuracyFor("boostedHandles"),
  reducedHandlesAccuracy: accuracyFor("reducedHandles"),
  correctedDomainAccuracy: accuracyFor("correctedDomain"),
  observations: [
    "This baseline is intentionally aligned to explicit boundary language rather than nearest-neighbor copying.",
    "If this baseline materially outperforms nearest-neighbor, the main bottleneck is likely evaluator weakness rather than unresolved boundary ambiguity.",
    "If corrected-domain still stays low here, the dataset still needs more decisive domain-exit supervision.",
  ],
};

const output = { summary, details };
await mkdir(path.dirname(resultPath), { recursive: true });
await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
