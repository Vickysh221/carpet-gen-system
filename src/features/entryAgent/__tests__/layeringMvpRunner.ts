import { analyzeEntryText } from "../index";
import { compileVisualIntent } from "../compilerLayer";

const cases = [
  {
    label: "Path A / poetic atmospheric",
    input: "下雨前五分钟的空气",
  },
  {
    label: "Path B / explicit motif",
    input: "花叶意向",
  },
  {
    label: "Path C / mixed",
    input: "烟雨里有一点竹影",
  },
];

const results = await Promise.all(cases.map(async (testCase) => {
  const analysis = await analyzeEntryText({ text: testCase.input });
  const compiled = compileVisualIntent({
    analysis,
    freeTextInputs: [testCase.input],
  });

  return {
    label: testCase.label,
    input: testCase.input,
    route: analysis.queryRoute.detectedType,
    path: analysis.queryRoute.recommendedInterpretationPath,
    retrievalTrace: analysis.retrievalLayer?.trace ?? [],
    interpretationTrace: analysis.interpretationLayer?.trace ?? [],
    frontstage: {
      replySnapshot: analysis.frontstageResponsePlan?.replySnapshot ?? null,
      optionalDomainCheck: analysis.frontstageResponsePlan?.optionalDomainCheck ?? null,
      compositionProposals: (analysis.frontstageResponsePlan?.compositionProposals ?? []).map((proposal) => ({
        id: proposal.id,
        title: proposal.title,
        summary: proposal.summary,
        dominantHandles: proposal.dominantHandles,
        suppressedHandles: proposal.suppressedHandles ?? [],
        blendNotes: proposal.blendNotes ?? [],
      })),
      refinementPrompt: analysis.frontstageResponsePlan?.refinementPrompt ?? null,
    },
    legacyDisplayPlan: {
      replySnapshot: analysis.displayPlan?.replySnapshot ?? null,
      comparisonCandidates: (analysis.displayPlan?.comparisonCandidates ?? []).map((candidate) => ({
        id: candidate.id,
        text: candidate.curatedDisplayText,
        split: candidate.intendedSplitDimension,
        effect: candidate.selectionEffect.patchHint,
      })),
      whetherToAskQuestion: analysis.displayPlan?.whetherToAskQuestion ?? false,
      followUpQuestion: analysis.displayPlan?.followUpQuestion ?? null,
    },
    frontstageSemanticPackage: {
      interpretationDomain: analysis.frontstageSemanticPackage?.interpretationDomain ?? null,
      domainConfidence: analysis.frontstageSemanticPackage?.domainConfidence ?? null,
      interpretationHandles: analysis.frontstageSemanticPackage?.interpretationHandles ?? [],
      compositionAxes: analysis.frontstageSemanticPackage?.compositionAxes ?? [],
      misleadingPaths: analysis.frontstageSemanticPackage?.misleadingPaths ?? [],
    },
    compilerSummary: compiled.summary,
  };
}));

console.log(JSON.stringify(results, null, 2));
