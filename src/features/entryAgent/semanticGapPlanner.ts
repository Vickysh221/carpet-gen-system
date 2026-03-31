import type {
  EntryAgentBridgeResult,
  EntryAgentResult,
  HighValueField,
  SemanticGap,
  SlotStateStatus,
} from "./types";

const MISSING_SLOT_PRIORITY: HighValueField[] = [
  "overallImpression",
  "colorMood",
  "patternTendency",
  "arrangementTendency",
  "spaceContext",
];

function getMissingField(updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>) {
  return MISSING_SLOT_PRIORITY.find((field) => updatedSlotStates[field] === undefined || updatedSlotStates[field] === "unknown");
}

function mapFieldToSlot(field: HighValueField | undefined) {
  if (field === "overallImpression") return "impression";
  if (field === "colorMood") return "color";
  if (field === "patternTendency") return "motif";
  if (field === "arrangementTendency") return "arrangement";
  return undefined;
}

export function buildSemanticGaps(input: {
  interpretationMerge: EntryAgentResult["interpretationMerge"];
  bridge: Pick<EntryAgentBridgeResult, "ambiguities">;
  updatedSlotStates: EntryAgentResult["updatedSlotStates"];
}): SemanticGap[] {
  const gaps: SemanticGap[] = [];

  input.interpretationMerge.mergeGroups
    .filter((group) => group.followUpRequired || group.relation === "conflict")
    .forEach((group, index) => {
      gaps.push({
        id: `prototype-conflict:${group.id}:${index}`,
        type: "prototype-conflict",
        priority: 100 - index,
        targetSlot: group.primarySlot,
        relatedReadingIds: group.participatingReadingIds,
        reason: group.decision,
        evidence: [group.decision],
        expectedGain: "先确认主解释，避免后续围绕错误方向补槽。",
      });
    });

  input.bridge.ambiguities.forEach((ambiguity, index) => {
    gaps.push({
      id: `ambiguity:${ambiguity.field}:${index}`,
      type: "unresolved-ambiguity",
      priority: 80 - index,
      targetField: ambiguity.field,
      targetSlot: mapFieldToSlot(ambiguity.field),
      relatedReadingIds: [],
      reason: ambiguity.note,
      evidence: [ambiguity.note],
      expectedGain: "先把当前语义歧义拆开，避免一个词同时指向多个槽位。",
    });
  });

  const missingField = getMissingField(input.updatedSlotStates);
  if (missingField) {
    gaps.push({
      id: `missing-slot:${missingField}`,
      type: "missing-slot",
      priority: 40,
      targetField: missingField,
      targetSlot: mapFieldToSlot(missingField),
      relatedReadingIds: [],
      reason: `${missingField} 还没有稳定 anchor。`,
      evidence: [missingField],
      expectedGain: "补齐当前最关键的缺失槽位，让语义状态更完整。",
    });
  }

  return gaps.sort((left, right) => right.priority - left.priority);
}
