import { readFile } from "node:fs/promises";
import path from "node:path";

const datasetRoot = path.resolve("datasets/frontstage");

const files = {
  package: path.join(datasetRoot, "package/gold-v0.1.jsonl"),
  responsePlan: path.join(datasetRoot, "response-plan/gold-v0.1.jsonl"),
  feedbackSignals: path.join(datasetRoot, "feedback-signals/gold-v0.1.jsonl"),
  closedLoop: path.join(datasetRoot, "closed-loop/gold-v0.1.jsonl"),
};

function parseJsonl(text, file) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${file} is empty`);
  }
  return trimmed.split("\n").map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file} line ${index + 1} is not valid JSON: ${error.message}`);
    }
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function required(obj, keys, label) {
  for (const key of keys) {
    assert(obj && Object.prototype.hasOwnProperty.call(obj, key), `${label} missing required key: ${key}`);
  }
}

function normalizeText(text) {
  return (text ?? "").replace(/\s+/g, "").replace(/[，。！？、,.!?:：]/g, "");
}

function toBigrams(text) {
  const normalized = normalizeText(text);
  const grams = new Set();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.add(normalized.slice(index, index + 2));
  }
  if (normalized.length >= 1) grams.add(normalized);
  return grams;
}

function hasMeaningfulOverlap(handleLabel, text) {
  const handleBigrams = toBigrams(handleLabel);
  const textBigrams = toBigrams(text);
  for (const gram of handleBigrams) {
    if (gram.length >= 2 && textBigrams.has(gram)) {
      return true;
    }
  }
  return false;
}

function validateProposalConsistency(proposal, label) {
  const dominant = proposal.dominantHandles ?? [];
  const suppressed = proposal.suppressedHandles ?? [];
  const overlap = dominant.filter((item) => suppressed.includes(item));
  assert(overlap.length === 0, `${label} dominant/suppressed overlap: ${overlap.join(", ")}`);

  const combinedText = `${proposal.title ?? ""}${proposal.summary ?? ""}`;
  if (dominant.length > 0) {
    const aligned = dominant.some((handle) => hasMeaningfulOverlap(handle, combinedText));
    assert(aligned, `${label} title/summary diverges from dominant handles`);
  }
}

function validateResponsePlan(plan, label) {
  required(plan, ["replySnapshot", "compositionProposals", "refinementPrompt"], label);
  assert(Array.isArray(plan.compositionProposals), `${label} compositionProposals must be an array`);
  for (const proposal of plan.compositionProposals) {
    validateProposalConsistency(proposal, `${label} -> ${proposal.id ?? "proposal"}`);
  }
}

function validateClosedLoopSample(sample) {
  required(sample, ["input", "output", "difficultyTags"], `closed-loop ${sample.id}`);
  required(
    sample.input,
    ["inputText", "package", "responsePlan", "feedbackText", "feedbackSignal"],
    `closed-loop ${sample.id}.input`,
  );
  required(sample.output, ["nextPackage", "nextResponsePlan"], `closed-loop ${sample.id}.output`);
  validateResponsePlan(sample.input.responsePlan, `closed-loop ${sample.id}.input.responsePlan`);
  validateResponsePlan(sample.output.nextResponsePlan, `closed-loop ${sample.id}.output.nextResponsePlan`);
  assert(sample.output.nextResponsePlan.compositionProposals.length >= 1, `closed-loop ${sample.id} must include at least one proposal`);

  if (sample.input.feedbackSignal?.correctedDomain) {
    assert(
      sample.output.nextPackage?.interpretationDomain === sample.input.feedbackSignal.correctedDomain,
      `closed-loop ${sample.id} corrected-domain mismatch: expected ${sample.input.feedbackSignal.correctedDomain}, got ${sample.output.nextPackage?.interpretationDomain}`,
    );
  }
}

function validatePackageSupervision(sample) {
  const supervision = sample.output?.supervision;
  if (!supervision) return;

  required(supervision, ["evidenceCues", "associationReadings", "designTranslationHints"], `package ${sample.id}.output.supervision`);
  required(supervision.evidenceCues, ["domain", "handles", "misleadingPaths"], `package ${sample.id}.output.supervision.evidenceCues`);
  assert(Array.isArray(supervision.evidenceCues.domain) && supervision.evidenceCues.domain.length >= 1, `package ${sample.id} needs at least one domain evidence cue`);

  const handleIds = new Set((sample.output?.package?.interpretationHandles ?? []).map((item) => item.id));
  for (const handleId of Object.keys(supervision.evidenceCues.handles ?? {})) {
    assert(handleIds.has(handleId), `package ${sample.id} supervision references unknown handle id ${handleId}`);
  }

  required(supervision.associationReadings, ["primary", "secondary", "nearbyButSuppressed"], `package ${sample.id}.output.supervision.associationReadings`);
  required(supervision.designTranslationHints, ["baseLayer", "traceLayer", "suppressedLiteralization"], `package ${sample.id}.output.supervision.designTranslationHints`);
}

const packageSamples = parseJsonl(await readFile(files.package, "utf8"), files.package);
const responsePlanSamples = parseJsonl(await readFile(files.responsePlan, "utf8"), files.responsePlan);
const feedbackSignalSamples = parseJsonl(await readFile(files.feedbackSignals, "utf8"), files.feedbackSignals);
const closedLoopSamples = parseJsonl(await readFile(files.closedLoop, "utf8"), files.closedLoop);

for (const sample of packageSamples) {
  required(sample, ["id", "sampleType", "status", "sourceCase", "sourceRunner", "input", "output"], `package ${sample.id}`);
  validatePackageSupervision(sample);
}
for (const sample of responsePlanSamples) {
  required(sample, ["id", "sampleType", "status", "sourceCase", "sourceRunner", "input", "output"], `response-plan ${sample.id}`);
  validateResponsePlan(sample.output.responsePlan, `response-plan ${sample.id}.output.responsePlan`);
}
for (const sample of feedbackSignalSamples) {
  required(sample, ["id", "sampleType", "status", "sourceCase", "sourceRunner", "input", "output"], `feedback-signal ${sample.id}`);
  required(sample.input, ["previousResponsePlan", "userFeedbackText"], `feedback-signal ${sample.id}.input`);
  validateResponsePlan(sample.input.previousResponsePlan, `feedback-signal ${sample.id}.input.previousResponsePlan`);
}
for (const sample of closedLoopSamples) {
  validateClosedLoopSample(sample);
}

assert(closedLoopSamples.length >= 6 && closedLoopSamples.length <= 10, `closed-loop sample count must be between 6 and 10, got ${closedLoopSamples.length}`);

const correctedDomainClosedLoops = closedLoopSamples.filter((sample) => sample.difficultyTags.includes("corrected-domain"));
assert(correctedDomainClosedLoops.length >= 1, "expected at least one corrected-domain closed-loop sample");

console.log(`package: ${packageSamples.length}`);
console.log(`response-plan: ${responsePlanSamples.length}`);
console.log(`feedback-signals: ${feedbackSignalSamples.length}`);
console.log(`closed-loop: ${closedLoopSamples.length}`);
console.log(`corrected-domain closed-loop: ${correctedDomainClosedLoops.length}`);
console.log("validation: OK");
