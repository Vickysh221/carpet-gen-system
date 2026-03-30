import { detectHighValueFieldHits } from "./fieldHitDetection";
import { deriveFollowUpRecommendation } from "./followUpRecommendation";
import { buildSemanticToAxisBridge } from "./semanticToAxisBridge";
import { deriveUpdatedSlotStates } from "./slotStateMachine";
import type { EntryAgentInput, EntryAgentResult } from "./types";

export function analyzeEntryText(input: EntryAgentInput): EntryAgentResult {
  const detection = detectHighValueFieldHits(input.text);
  const bridge = buildSemanticToAxisBridge(input, detection);
  const updatedSlotStates = deriveUpdatedSlotStates({
    detection,
    bridge,
    previousSlotStates: input.slotStates,
  });
  const recommendation = deriveFollowUpRecommendation({
    detection,
    bridge,
    updatedSlotStates,
    previousSlotStates: input.slotStates,
  });

  return {
    ...detection,
    ...bridge,
    ...recommendation,
    updatedSlotStates,
  };
}

export * from "./types";
