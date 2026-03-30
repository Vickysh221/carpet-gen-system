import type { EntryAgentBridgeResult, EntryAgentDetectionResult, HighValueField, SlotStateStatus } from "./types";

interface SlotStateMachineInput {
  detection: EntryAgentDetectionResult;
  bridge: EntryAgentBridgeResult;
  previousSlotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
}

function getFieldAmbiguityCount(field: HighValueField, bridge: EntryAgentBridgeResult) {
  return bridge.ambiguities.filter((item) => item.field === field).length;
}

function getEvidenceCount(field: HighValueField, detection: EntryAgentDetectionResult) {
  return detection.evidence[field]?.length ?? 0;
}

function getConfidenceLevel(field: HighValueField, detection: EntryAgentDetectionResult) {
  return detection.confidence[field];
}

function resolveStateFromSignals(
  field: HighValueField,
  detection: EntryAgentDetectionResult,
  bridge: EntryAgentBridgeResult,
) {
  const confidence = getConfidenceLevel(field, detection);
  const evidenceCount = getEvidenceCount(field, detection);
  const ambiguityCount = getFieldAmbiguityCount(field, bridge);

  if (!detection.hitFields.includes(field)) {
    return "unknown" as SlotStateStatus;
  }

  if (ambiguityCount >= 2) {
    return "conflicted" as SlotStateStatus;
  }

  if (ambiguityCount >= 1) {
    return confidence === "high" && evidenceCount >= 2 ? "tentative" : "weak-signal";
  }

  if (confidence === "high" && evidenceCount >= 2) {
    return "tentative" as SlotStateStatus;
  }

  if (confidence === "medium") {
    return "tentative" as SlotStateStatus;
  }

  return "weak-signal" as SlotStateStatus;
}

function mergeWithPreviousState(
  previous: SlotStateStatus | undefined,
  next: SlotStateStatus,
) {
  if (previous === undefined || previous === "unknown") {
    return next;
  }

  if (previous === "locked") {
    if (next === "conflicted") {
      return "conflicted" as SlotStateStatus;
    }
    return "locked" as SlotStateStatus;
  }

  if (previous === "tentative" && next === "weak-signal") {
    return "tentative" as SlotStateStatus;
  }

  if (previous === "weak-signal" && next === "tentative") {
    return "tentative" as SlotStateStatus;
  }

  if (previous === "conflicted" && next !== "locked") {
    return "conflicted" as SlotStateStatus;
  }

  return next;
}

export function deriveUpdatedSlotStates({
  detection,
  bridge,
  previousSlotStates,
}: SlotStateMachineInput) {
  const fields = detection.hitFields;

  return fields.reduce<Partial<Record<HighValueField, SlotStateStatus>>>((acc, field) => {
    const nextState = resolveStateFromSignals(field, detection, bridge);
    acc[field] = mergeWithPreviousState(previousSlotStates?.[field], nextState);
    return acc;
  }, {});
}
