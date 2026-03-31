import { buildDirectInterpretationCandidates } from "./directHitInterpretation";
import { buildFallbackCandidateSet } from "./fallbackCandidateGenerator";
import { detectHighValueFieldHits } from "./fieldHitDetection";
import { deriveFollowUpRecommendation } from "./followUpRecommendation";
import { mergeInterpretationCandidates } from "./prototypeMerge";
import { resolvePrototypeCandidates } from "./prototypeMatching";
import { buildQuestionPlan } from "./questionPlanning";
import { buildSemanticGaps } from "./semanticGapPlanner";
import { buildSemanticUnderstanding } from "./semanticUnderstanding";
import { buildSemanticToAxisBridge } from "./semanticToAxisBridge";
import { deriveUpdatedSlotStates } from "./slotStateMachine";
import type { EntryAgentInput, EntryAgentResult } from "./types";

export async function analyzeEntryText(input: EntryAgentInput): Promise<EntryAgentResult> {
  const detection = detectHighValueFieldHits(input.text);
  const directCandidates = buildDirectInterpretationCandidates(input, detection);
  const { prototypeMatches, candidates: prototypeCandidates } = await resolvePrototypeCandidates(input, detection);
  const fallback = await buildFallbackCandidateSet({
    text: input.text,
    detection,
    directCandidates,
    prototypeMatches,
    prototypeCandidates,
  });
  const interpretationMerge = mergeInterpretationCandidates({
    directCandidates,
    prototypeMatches,
    prototypeCandidates,
    fallback,
  });
  const bridge = buildSemanticToAxisBridge(input, detection, interpretationMerge);
  const updatedSlotStates = deriveUpdatedSlotStates({
    detection,
    bridge,
    previousSlotStates: input.slotStates,
  });
  const semanticUnderstanding = buildSemanticUnderstanding({
    interpretationMerge,
    bridge,
  });
  const semanticGaps = buildSemanticGaps({
    interpretationMerge,
    bridge,
    updatedSlotStates,
  });
  const { questionCandidates, questionPlan } = buildQuestionPlan({
    semanticGaps,
  });
  const recommendation = deriveFollowUpRecommendation({
    detection,
    bridge,
    updatedSlotStates,
    previousSlotStates: input.slotStates,
    semanticGaps,
    questionPlan,
  });

  return {
    ...detection,
    interpretationMerge,
    ...bridge,
    semanticUnderstanding,
    semanticGaps,
    questionCandidates,
    questionPlan,
    ...recommendation,
    updatedSlotStates,
  };
}

export * from "./types";
