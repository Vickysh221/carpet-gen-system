import { compileVisualIntent } from "../compilerLayer";
import { normalizeTextInputEvent } from "../inputLayer";
import { analyzeEntryText } from "../index";

const cases = [
  "加州沙滩和柠檬叶的香气",
  "下雨前五分钟的空气",
  "烟雨里有一点竹影",
  "花叶意向，但不要太满",
  "雪地与天空没有分界线",
  "薄纱后面的光",
  "一点孤帆远影",
  "石头肌理但别太硬",
  "荷花在风里摇曳",
  "还不确定，想高级一点",
];

const results = await Promise.all(cases.map(async (text) => {
  const preprocessing = normalizeTextInputEvent(text);
  const analysis = await analyzeEntryText({ text });
  const compiled = compileVisualIntent({
    analysis,
    freeTextInputs: [text],
  });

  return {
    input: text,
    preprocessing,
    spans: preprocessing.spans,
    retrieval: analysis.retrievalLayer,
    route: analysis.queryRoute,
    semanticRoles: analysis.interpretationLayer?.semanticRoles,
    patternSemanticSlots: analysis.interpretationLayer?.patternSemanticProjection,
    unresolvedSplits: analysis.interpretationLayer?.unresolvedSplits,
    misleadingPathsToAvoid: analysis.interpretationLayer?.misleadingPathsToAvoid,
    planner: {
      replySnapshot: analysis.displayPlan?.replySnapshot,
      comparisonCandidates: (analysis.displayPlan?.comparisonCandidates ?? []).map((item) => ({
        id: item.id,
        curatedDisplayText: item.curatedDisplayText,
        intendedSplitDimension: item.intendedSplitDimension,
        semanticDeltaHint: item.semanticDeltaHint,
        derivedFrom: item.derivedFrom ?? [],
        selectionEffect: item.selectionEffect.patchHint,
      })),
      followUpQuestion: analysis.displayPlan?.followUpQuestion ?? null,
      plannerTrace: analysis.displayPlan?.plannerTrace ?? [],
    },
    compilerSummary: compiled.summary,
  };
}));

console.log(JSON.stringify(results, null, 2));
