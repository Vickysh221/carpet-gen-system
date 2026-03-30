import type { EntryAgentAxisMap, EntryAgentSlotKey, HighValueField, QaMode, SlotStateStatus } from "./types";

export const HIGH_VALUE_FIELDS: HighValueField[] = [
  "spaceContext",
  "overallImpression",
  "colorMood",
  "patternTendency",
  "arrangementTendency",
];

export const SLOT_STATE_STATUSES: SlotStateStatus[] = ["unknown", "weak-signal", "tentative", "locked", "conflicted"];

export const QA_MODES: QaMode[] = [
  "exploratory-intake",
  "slot-completion",
  "preference-shift",
  "slot-revision",
  "lock-reinforcement",
];

export const MVP_ENTRY_AGENT_AXES: { [Slot in EntryAgentSlotKey]: EntryAgentAxisMap[Slot][] } = {
  color: ["warmth", "saturation"],
  motif: ["complexity", "geometry", "organic"],
  arrangement: ["order", "spacing"],
  impression: ["calm", "energy", "softness"],
};

export const DEFAULT_SLOT_STATE_BY_FIELD: Record<HighValueField, SlotStateStatus> = {
  spaceContext: "unknown",
  overallImpression: "unknown",
  colorMood: "unknown",
  patternTendency: "unknown",
  arrangementTendency: "unknown",
};

export const STATE_PATCH_NOTE =
  "statePatch uses signed delta values as provisional numeric bridge output, not final simulator target values.";

export const AXIS_HINTS_NOTE =
  "axisHints uses 0-1 tendency values aligned to current simulator axes.";

export const PROVISIONAL_STATE_HINTS_NOTE =
  "provisionalStateHints are semantic-only hints for roomType, impression labels, and pattern-level descriptors; they must not overwrite simulator state directly.";

export const SPACE_CONTEXT_NOTE =
  "spaceContext should only contribute weak bias hints and follow-up priors in MVP, not direct numeric statePatch output.";
