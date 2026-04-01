import type { IntentIntakeAgentState, IntakeMacroSlot, MacroSlotState } from "./types";

export type OpeningFamily = "mood" | "space" | "pattern-style" | "presence";
export type OpeningTargetSlot = "impression" | "color" | "patternIntent" | "arrangement" | "space" | "presence";
export type OpeningPatchSlot = IntakeMacroSlot | "presence";

export type OpeningImpressionAxis = "calm" | "warmth" | "softness" | "energy" | "luxury";
export type OpeningColorAxis = "warmth" | "saturation" | "contrast" | "visibility";
export type OpeningPatternIntentAxis =
  | "figurativeness"
  | "abstraction"
  | "organic"
  | "geometry"
  | "complexity"
  | "motifPresence";
export type OpeningArrangementAxis = "order" | "openness" | "density" | "flow";
export type OpeningSpaceAxis = "domestic" | "hospitality" | "officeLike" | "resting" | "social";
export type OpeningPresenceAxis = "blending" | "focalness" | "visualWeight";

export interface OpeningParameterDelta {
  impression?: Partial<Record<OpeningImpressionAxis, number>>;
  color?: Partial<Record<OpeningColorAxis, number>>;
  patternIntent?: Partial<Record<OpeningPatternIntentAxis, number>>;
  arrangement?: Partial<Record<OpeningArrangementAxis, number>>;
  space?: Partial<Record<OpeningSpaceAxis, number>>;
  presence?: Partial<Record<OpeningPresenceAxis, number>>;
}

export interface OpeningOptionDefinition {
  id: string;
  family: OpeningFamily;
  label: string;
  aliases?: string[];
  description?: string;
  parameterDelta: OpeningParameterDelta;
  suggestedNextTargets?: OpeningTargetSlot[];
}

export interface OpeningQuestionFamilyDefinition {
  family: OpeningFamily;
  prompt: string;
  allowsMultiple: boolean;
  maxSelections: number;
  primary: boolean;
  targetSlots: OpeningTargetSlot[];
  optionIds: string[];
  escapeHatchLabel?: string;
}

export interface OpeningSlotPatch {
  slot: OpeningPatchSlot;
  parameterDelta: Record<string, number>;
  topCandidateLabel: string;
  score: number;
  supportingOptionIds: string[];
  suggestedNextTargets: OpeningTargetSlot[];
}

export interface OpeningSelectionResult {
  selections: OpeningOptionDefinition[];
  aggregatedDelta: OpeningParameterDelta;
  slotPatches: OpeningSlotPatch[];
  suggestedNextTargets: OpeningTargetSlot[];
  updatedAgentState: IntentIntakeAgentState;
  appliedSlotUpdates: MacroSlotState[];
}
