import { buildDirectInterpretationCandidates } from "./directHitInterpretation";
import { buildFallbackCandidateSet } from "./fallbackCandidateGenerator";
import { detectHighValueFieldHits } from "./fieldHitDetection";
import { deriveFollowUpRecommendation } from "./followUpRecommendation";
import { buildFrontstageSemanticPackage } from "./frontstageSemanticPackage";
import { normalizeTextInputEvent } from "./inputLayer";
import { interpretRetrievedQuery } from "./interpretationLayer";
import { mergeInterpretationCandidates } from "./prototypeMerge";
import { resolvePrototypeCandidates } from "./prototypeMatching";
import { buildIntentIntakeGoalState } from "./intakeGoalState";
import { buildDisplayAwarePlan } from "./planningLayer";
import { resolvePreviousQuestion } from "./questionResolution";
import { retrieveSemanticContext } from "./retrievalLayer";
import { buildSemanticCanvas, buildSemanticCanvasCandidates, enrichDetectionWithSemanticCanvas } from "./semanticCanvas";
import { decomposeSemanticCues } from "./semanticCueDecomposition";
import { buildSemanticGaps } from "./semanticGapPlanner";
import { buildSemanticUnderstanding } from "./semanticUnderstanding";
import { buildSemanticToAxisBridge } from "./semanticToAxisBridge";
import { deriveUpdatedSlotStates } from "./slotStateMachine";
import type { EntryAgentInput, EntryAgentResult } from "./types";

export async function analyzeEntryText(input: EntryAgentInput): Promise<EntryAgentResult> {
  const normalizedEvent = normalizeTextInputEvent(input.text);
  const retrievalLayer = await retrieveSemanticContext({ event: normalizedEvent });
  const interpretationLayer = interpretRetrievedQuery({
    event: normalizedEvent,
    retrieval: retrievalLayer,
  });
  const queryRoute = interpretationLayer.queryRoute;
  const initialDetection = detectHighValueFieldHits(normalizedEvent.normalizedText);
  const semanticUnits = decomposeSemanticCues(input, initialDetection);
  const semanticCanvas = await buildSemanticCanvas({
    text: normalizedEvent.normalizedText,
    detection: initialDetection,
    semanticUnits,
  });
  const detection = enrichDetectionWithSemanticCanvas(initialDetection, semanticCanvas);
  const semanticCanvasCandidates = buildSemanticCanvasCandidates({
    semanticCanvas,
    text: normalizedEvent.normalizedText,
  });
  const directCandidates = buildDirectInterpretationCandidates(input, detection, semanticUnits);
  const { prototypeMatches, candidates: prototypeCandidates } = await resolvePrototypeCandidates(input, detection, semanticUnits);
  const fallback = await buildFallbackCandidateSet({
    text: input.text,
    detection,
    semanticCanvas,
    semanticCanvasCandidates,
    directCandidates,
    prototypeMatches,
    prototypeCandidates,
  });
  const interpretationMerge = mergeInterpretationCandidates({
    semanticCanvas,
    semanticCanvasCandidates,
    directCandidates,
    prototypeMatches,
    prototypeCandidates,
    semanticUnits,
    fallback,
  });
  const bridge = buildSemanticToAxisBridge(input, detection, interpretationMerge, semanticCanvas);
  const updatedSlotStates = deriveUpdatedSlotStates({
    detection,
    bridge,
    previousSlotStates: input.slotStates,
  });
  const { resolution: latestResolution, resolutionState } = resolvePreviousQuestion({
    previousQuestion: input.previousQuestionTrace,
    latestReplyText: input.latestReplyText,
    previousResolutionState: input.resolutionState,
  });
  const semanticGaps = buildSemanticGaps({
    interpretationMerge,
    bridge,
    updatedSlotStates,
    resolutionState,
  });
  const frontstageSemanticPackage = buildFrontstageSemanticPackage({
    queryText: normalizedEvent.normalizedText,
    interpretation: interpretationLayer,
    semanticCanvas,
    retrieval: retrievalLayer,
  });
  const { questionCandidates, questionPlan, displayPlan, frontstageResponsePlan } = await buildDisplayAwarePlan({
    queryText: normalizedEvent.normalizedText,
    semanticGaps,
    previousQuestion: input.previousQuestionTrace,
    questionHistory: input.questionHistory,
    bridge,
    hitFields: detection.hitFields,
    interpretation: interpretationLayer,
    retrieval: retrievalLayer,
    frontstageSemanticPackage,
    comparisonSelections: input.comparisonSelections,
    proposalFeedbackSignals: input.proposalFeedbackSignals,
    latestReplyText: input.latestReplyText,
    resolutionState,
    latestResolution,
  });
  const semanticUnderstanding = buildSemanticUnderstanding({
    interpretationMerge,
    bridge,
    semanticGaps,
    questionPlan,
  });
  const recommendation = deriveFollowUpRecommendation({
    detection,
    bridge,
    updatedSlotStates,
    previousSlotStates: input.slotStates,
    semanticGaps,
    questionPlan,
  });
  // Build the full analysis result first so intakeGoalState can use it
  const partialResult = {
    queryRoute,
    interpretationLayer,
    retrievalLayer,
    ...detection,
    interpretationMerge,
    ...bridge,
    semanticUnderstanding,
    frontstageSemanticPackage,
    frontstageResponsePlan,
    semanticGaps,
    questionCandidates,
    questionPlan,
    displayPlan,
    questionResolutionState: questionPlan?.resolutionState ?? resolutionState,
    latestResolution: questionPlan?.latestResolution ?? latestResolution,
    ...recommendation,
    updatedSlotStates,
  };
  const intakeGoalState = buildIntentIntakeGoalState(partialResult, input.previousGoalState);

  return { ...partialResult, intakeGoalState };
}

export * from "./types";
export * from "./agentRuntime";
export * from "./openingOptionsTypes";
export * from "./openingQuestionFamilyConfig";
export * from "./openingOptionRegistry";
export * from "./openingOptionDelta";
export * from "./types.visualIntent";
export * from "./explicitMotifExpansion";
export * from "./visualIntentCompiler";
export * from "./visualIntentTestBundle";
export * from "./promptAdapters";
export * from "./queryRouting";
export * from "./inputLayer";
export * from "./retrievalLayer";
export * from "./interpretationLayer";
export * from "./planningLayer";
export * from "./compilerLayer";
export * from "./frontstageSemanticPackage";
export * from "./frontstageResponsePlanner";
export * from "./proposalFeedbackSignals";
