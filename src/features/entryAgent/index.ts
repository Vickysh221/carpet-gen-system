import { buildDirectInterpretationCandidates } from "./directHitInterpretation";
import { buildFallbackCandidateSet } from "./fallbackCandidateGenerator";
import { detectHighValueFieldHits } from "./fieldHitDetection";
import { deriveFollowUpRecommendation } from "./followUpRecommendation";
import { mergeInterpretationCandidates } from "./prototypeMerge";
import { resolvePrototypeCandidates } from "./prototypeMatching";
import { buildQuestionPlan } from "./questionPlanning";
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
  const semanticGaps = buildSemanticGaps({
    interpretationMerge,
    bridge,
    updatedSlotStates,
  });
  const { questionCandidates, questionPlan } = await buildQuestionPlan({
    semanticGaps,
    previousQuestion: input.previousQuestionTrace,
    bridge,
    hitFields: detection.hitFields,
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
