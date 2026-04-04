import { normalizeTextInputEvent } from "../src/features/entryAgent/inputLayer.ts";
import { routeEntryQuery } from "../src/features/entryAgent/queryRouting.ts";

const cases = [
  {
    input: "清明时节雨纷纷",
    expectedType: "poetic-atmospheric",
  },
  {
    input: "花叶意向",
    expectedType: "explicit-motif",
  },
  {
    input: "不要太花",
    expectedType: "constraint-negation",
  },
  {
    input: "烟雨里有一点竹影",
    expectedType: "mixed-compositional",
  },
  {
    input: "还不确定，想高级一点",
    expectedType: "vague-underspecified",
  },
];

const results = cases.map((item) => {
  const route = routeEntryQuery(normalizeTextInputEvent(item.input));
  return {
    input: item.input,
    expectedType: item.expectedType,
    actualType: route.detectedType,
    path: route.recommendedInterpretationPath,
    confidence: route.confidence,
    rationale: route.rationale,
    trace: route.trace.map((signal) => `${signal.kind}:${signal.cue}`),
    pass: route.detectedType === item.expectedType,
  };
});

const failed = results.filter((item) => !item.pass);

console.log(JSON.stringify({
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
}, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
