import { analyzeEntryText } from "../src/features/entryAgent/index.ts";

const inputs = [
  "下雨前五分钟的空气",
  "花叶意向",
  "烟雨里有一点竹影",
];

const results = await Promise.all(inputs.map(async (text) => {
  const result = await analyzeEntryText({ text });
  return {
    text,
    route: result.queryRoute.detectedType,
    snapshot: result.displayPlan?.replySnapshot,
    ask: result.displayPlan?.whetherToAskQuestion,
    followUp: result.displayPlan?.followUpQuestion ?? null,
    comparisons: (result.displayPlan?.comparisonCandidates ?? []).map((item) => ({
      id: item.id,
      groupId: item.groupId,
      splitDimension: item.intendedSplitDimension,
      displayText: item.curatedDisplayText,
      semanticDeltaHint: item.semanticDeltaHint,
      selectionEffect: item.selectionEffect.patchHint,
    })),
  };
}));

console.log(JSON.stringify(results, null, 2));
