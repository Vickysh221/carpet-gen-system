import type { SimulatorState } from "@/features/simulator/types";

export type HighValueField =
  | "spaceContext"
  | "overallImpression"
  | "colorMood"
  | "patternTendency"
  | "arrangementTendency";

export type SlotStateStatus = "unknown" | "weak-signal" | "tentative" | "locked" | "conflicted";

export type ConfidenceLevel = "low" | "medium" | "high";

export type QaMode =
  | "exploratory-intake"
  | "slot-completion"
  | "preference-shift"
  | "slot-revision"
  | "lock-reinforcement";

export type EntryAgentSlotKey = "color" | "motif" | "arrangement" | "impression";

export type EntryAgentAxisMap = {
  color: "warmth" | "saturation";
  motif: "complexity" | "geometry" | "organic";
  arrangement: "order" | "spacing";
  impression: "calm" | "energy" | "softness";
};

export type EntryAgentAxisHints = {
  [Slot in EntryAgentSlotKey]?: Partial<Record<EntryAgentAxisMap[Slot], number>>;
};

export type EntryAgentStatePatch = {
  [Slot in EntryAgentSlotKey]?: Partial<Record<EntryAgentAxisMap[Slot], number>>;
};

export interface WeakBiasHint {
  source: string;
  axes: EntryAgentAxisHints;
}

export interface FieldAmbiguity {
  field: HighValueField;
  note: string;
  candidateAxes?: EntryAgentAxisHints;
}

export interface EntryAgentInput {
  text: string;
  slotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
  evidenceSource?: string;
  simulatorState?: SimulatorState;
}

export interface EntryAgentDetectionResult {
  hitFields: HighValueField[];
  evidence: Partial<Record<HighValueField, string[]>>;
  confidence: Partial<Record<HighValueField, ConfidenceLevel>>;
}

export interface EntryAgentBridgeResult {
  provisionalStateHints: Record<string, string | string[]>;
  ambiguities: FieldAmbiguity[];
  axisHints: EntryAgentAxisHints;
  weakBiasHints: WeakBiasHint[];
  statePatch: EntryAgentStatePatch;
}

export interface EntryAgentRecommendationResult {
  updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>;
  suggestedQaMode: QaMode;
  suggestedFollowUpTarget?: HighValueField;
  suggestedQuestionIntent?: string;
}

export interface EntryAgentResult extends EntryAgentDetectionResult, EntryAgentBridgeResult, EntryAgentRecommendationResult {}
