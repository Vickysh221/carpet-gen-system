import type { ComparisonSelectionRecord, EntryAgentResult, NextQuestionCandidate, QuestionPlan, QuestionResolution, QuestionResolutionState, QuestionTrace, RetrievalLayerResult, DisplayPlan, SemanticGap, InterpretationLayerResult } from "./types";
import { buildQuestionPlan } from "./questionPlanning";

export async function buildDisplayAwarePlan(input: {
  queryText: string;
  semanticGaps: SemanticGap[];
  previousQuestion?: QuestionTrace;
  questionHistory?: QuestionTrace[];
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
  latestReplyText?: string;
  resolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
  interpretation: InterpretationLayerResult;
  retrieval: RetrievalLayerResult;
  comparisonSelections?: ComparisonSelectionRecord[];
}): Promise<{
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
  displayPlan: DisplayPlan;
  resolutionState?: QuestionResolutionState;
}> {
  return buildQuestionPlan({
    queryText: input.queryText,
    semanticGaps: input.semanticGaps,
    previousQuestion: input.previousQuestion,
    questionHistory: input.questionHistory,
    bridge: input.bridge,
    hitFields: input.hitFields,
    interpretation: input.interpretation,
    queryRoute: input.interpretation.queryRoute,
    retrievalLayer: input.retrieval,
    comparisonSelections: input.comparisonSelections,
    latestReplyText: input.latestReplyText,
    resolutionState: input.resolutionState,
    latestResolution: input.latestResolution,
  });
}
