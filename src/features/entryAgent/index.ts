import { buildDirectInterpretationCandidates } from "./directHitInterpretation";
import { buildFallbackCandidateSet } from "./fallbackCandidateGenerator";
import { detectHighValueFieldHits } from "./fieldHitDetection";
import { deriveFollowUpRecommendation } from "./followUpRecommendation";
import { mergeInterpretationCandidates } from "./prototypeMerge";
import { resolvePrototypeCandidates } from "./prototypeMatching";
import { buildIntentIntakeGoalState } from "./intakeGoalState";
import { buildQuestionPlan } from "./questionPlanning";
import { resolvePreviousQuestion } from "./questionResolution";
import { buildSemanticCanvas, buildSemanticCanvasCandidates } from "./semanticCanvas";
import { decomposeSemanticCues } from "./semanticCueDecomposition";
import { buildSemanticGaps } from "./semanticGapPlanner";
import { buildSemanticUnderstanding } from "./semanticUnderstanding";
import { buildSemanticToAxisBridge } from "./semanticToAxisBridge";
import { deriveUpdatedSlotStates } from "./slotStateMachine";
import type { EntryAgentInput, EntryAgentResult } from "./types";

export async function analyzeEntryText(input: EntryAgentInput): Promise<EntryAgentResult> {
  const detection = detectHighValueFieldHits(input.text);
  const semanticUnits = decomposeSemanticCues(input, detection);
  const semanticCanvas = await buildSemanticCanvas({
    text: input.text,
    detection,
    semanticUnits,
  });
  const semanticCanvasCandidates = buildSemanticCanvasCandidates({
    semanticCanvas,
    text: input.text,
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
  const { questionCandidates, questionPlan } = await buildQuestionPlan({
    semanticGaps,
    previousQuestion: input.previousQuestionTrace,
    questionHistory: input.questionHistory,
    bridge,
    hitFields: detection.hitFields,
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
    ...detection,
    interpretationMerge,
    ...bridge,
    semanticUnderstanding,
    semanticGaps,
    questionCandidates,
    questionPlan,
    questionResolutionState: questionPlan?.resolutionState ?? resolutionState,
    latestResolution: questionPlan?.latestResolution ?? latestResolution,
    ...recommendation,
    updatedSlotStates,
  };
  const intakeGoalState = buildIntentIntakeGoalState(partialResult, input.previousGoalState);

  return { ...partialResult, intakeGoalState };
}

export * from "./types";
