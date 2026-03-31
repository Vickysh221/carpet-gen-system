import type {
  EntryAgentBridgeResult,
  EntryAgentAxisPath,
  EntryAgentResult,
  HighValueField,
  InterpretationCandidate,
  SemanticGap,
  SlotStateStatus,
  SlotQuestionMode,
} from "./types";
import { getSlotQuestionSpec } from "./slotQuestionSpec";

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

function pickAnchoredMissingField(input: {
  finalResolvedReadings: InterpretationCandidate[];
  updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>;
}) {
  const rankedAnchors = [...input.finalResolvedReadings].sort((left, right) => right.confidence - left.confidence);

  for (const reading of rankedAnchors) {
    const state = input.updatedSlotStates[reading.field];
    if (state === "tentative" || state === "weak-signal") {
      return reading.field;
    }
  }

  return undefined;
}

function pickReadingForField(readings: InterpretationCandidate[], field: HighValueField | undefined) {
  if (!field) {
    return undefined;
  }

  return [...readings]
    .filter((reading) => reading.field === field)
    .sort((left, right) => right.confidence - left.confidence)[0];
}

function pickQuestionMode(input: {
  field?: HighValueField;
  type: SemanticGap["type"];
  reason: string;
  reading?: InterpretationCandidate;
}): { questionMode?: SlotQuestionMode; targetAxes: EntryAgentAxisPath[]; expectedGain: string } {
  const spec = getSlotQuestionSpec(input.field);
  if (!spec) {
    return {
      questionMode: undefined,
      targetAxes: [],
      expectedGain: input.type === "prototype-conflict"
        ? "先确认主解释，避免后续围绕错误方向补槽。"
        : input.type === "unresolved-ambiguity"
          ? "先把当前语义歧义拆开，避免一个词同时指向多个槽位。"
          : input.type === "weak-anchor"
            ? "先确认这个弱方向是否值得保留，避免 subtle cue 过早主导解释。"
          : "补齐当前最关键的缺失槽位，让语义状态更完整。",
    };
  }

  const reason = input.reason;
  const reading = input.reading;
  if (input.field === "patternTendency") {
    const mode =
      reason.includes("自然一点") || reading?.semanticHints?.patternTendency === "natural"
        ? "contrast-geometry-vs-organic"
        : "contrast-complexity-vs-geometry";
    const modeSpec = spec.modes.find((item) => item.mode === mode) ?? spec.modes[0];
    return {
      questionMode: modeSpec?.mode,
      targetAxes: modeSpec?.targetAxes ?? [],
      expectedGain: modeSpec?.expectedInformationGain ?? "",
    };
  }

  if (input.field === "overallImpression") {
    const mode =
      reading?.semanticHints?.impression === "warm" || reading?.semanticHints?.impression === "soft"
        ? "contrast-soft-vs-crisp"
        : "contrast-calm-vs-presence";
    const modeSpec = spec.modes.find((item) => item.mode === mode) ?? spec.modes[0];
    return {
      questionMode: modeSpec?.mode,
      targetAxes: modeSpec?.targetAxes ?? [],
      expectedGain: modeSpec?.expectedInformationGain ?? "",
    };
  }

  const modeSpec = spec.modes[0];
  return {
    questionMode: modeSpec?.mode,
    targetAxes: modeSpec?.targetAxes ?? [],
    expectedGain: modeSpec?.expectedInformationGain ?? "",
  };
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
      const targetField = group.primarySlot === "impression"
        ? "overallImpression"
        : group.primarySlot === "color"
          ? "colorMood"
          : group.primarySlot === "motif"
            ? "patternTendency"
            : group.primarySlot === "arrangement"
              ? "arrangementTendency"
              : undefined;
      const planning = pickQuestionMode({
        field: targetField,
        type: "prototype-conflict",
        reason: group.decision,
        reading: pickReadingForField(input.interpretationMerge.finalResolvedReadings, targetField),
      });
      gaps.push({
        id: `prototype-conflict:${group.id}:${index}`,
        type: "prototype-conflict",
        priority: 100 - index,
        targetField,
        targetSlot: group.primarySlot,
      targetAxes: planning.targetAxes,
      questionMode: planning.questionMode,
      questionKind: "contrast",
      relatedReadingIds: group.participatingReadingIds,
      reason: group.decision,
      evidence: [group.decision],
      expectedGain: planning.expectedGain,
      informationGainHint: "用户回答后，可减少两个可主导解释之间谁该成为主方向的不确定性。",
      rankingReason: "主解释存在冲突，优先级高于单纯补 missing slot。",
    });
  });

  input.bridge.ambiguities.forEach((ambiguity, index) => {
    const planning = pickQuestionMode({
      field: ambiguity.field,
      type: "unresolved-ambiguity",
      reason: ambiguity.note,
      reading: pickReadingForField(input.interpretationMerge.finalResolvedReadings, ambiguity.field),
    });
    gaps.push({
      id: `ambiguity:${ambiguity.field}:${index}`,
      type: "unresolved-ambiguity",
      priority: 80 - index,
      targetField: ambiguity.field,
      targetSlot: mapFieldToSlot(ambiguity.field),
      targetAxes: planning.targetAxes,
      questionMode: planning.questionMode,
      questionKind: "clarify",
      relatedReadingIds: [],
      reason: ambiguity.note,
      evidence: [ambiguity.note],
      expectedGain: planning.expectedGain,
      informationGainHint: "用户回答后，可减少当前词语在不同槽位或不同读法之间摇摆的不确定性。",
      rankingReason: "当前语义存在未决歧义，需要先确认用户真正想表达的方向。",
    });
  });

  input.interpretationMerge.semanticUnits
    .filter((unit) => unit.cueType === "poetic" || unit.routeHint === "retrieval-entry")
    .forEach((unit, index) => {
      gaps.push({
        id: `weak-anchor:${unit.id}`,
        type: "weak-anchor",
        priority: 60 - index,
        targetField: unit.targetField,
        targetSlot: unit.targetSlot,
        targetAxes: unit.disambiguationAxes,
        questionMode: pickQuestionMode({
          field: unit.targetField,
          type: "weak-anchor",
          reason: `${unit.cue} 目前只形成 subtle 弱信号。`,
          reading: pickReadingForField(input.interpretationMerge.finalResolvedReadings, unit.targetField),
        }).questionMode,
        questionKind: unit.questionKindHint,
        relatedReadingIds: input.interpretationMerge.candidateReadings
          .filter((reading) => reading.matchedSemanticUnitIds?.includes(unit.id))
          .map((reading) => reading.id),
        sourceUnitIds: [unit.id],
        reason: `${unit.cue} 目前只形成 subtle 弱信号。`,
        evidence: [unit.cue],
        expectedGain: "确认这个 subtle 方向是否值得稳定保留，而不是只作为弱修饰。",
        informationGainHint: unit.informationGainHint,
        rankingReason: "poetic / retrieval-only cue 只能先作为 weak-anchor，避免弱证据过早主导 narrative。",
      });
    });

  const anchoredField = pickAnchoredMissingField({
    finalResolvedReadings: input.interpretationMerge.finalResolvedReadings,
    updatedSlotStates: input.updatedSlotStates,
  });
  const missingField = anchoredField ?? getMissingField(input.updatedSlotStates);
  if (missingField) {
    const targetReading = pickReadingForField(input.interpretationMerge.finalResolvedReadings, missingField);
    const planning = pickQuestionMode({
      field: missingField,
      type: "missing-slot",
      reason: targetReading
        ? `${missingField} 已经有初步方向，但内部取向还没收清楚。`
        : `${missingField} 还没有稳定 anchor。`,
      reading: targetReading,
    });
    gaps.push({
      id: `missing-slot:${missingField}`,
      type: "missing-slot",
      priority: 40,
      targetField: missingField,
      targetSlot: mapFieldToSlot(missingField),
      targetAxes: planning.targetAxes,
      questionMode: planning.questionMode,
      questionKind: targetReading?.questionKindHint ?? "anchor",
      relatedReadingIds: [],
      reason: targetReading
        ? `${missingField} 已经有初步方向，但内部取向还没收清楚。`
        : `${missingField} 还没有稳定 anchor。`,
      evidence: [missingField],
      expectedGain: planning.expectedGain,
      informationGainHint:
        targetReading?.informationGainHint ??
        `用户回答后，可减少 ${missingField} 当前还没有稳定 anchor 的不确定性。`,
      rankingReason: targetReading
        ? "当前已有一个初步方向，优先继续收窄这个 field 的内部语义。"
        : "当前缺少关键槽位 anchor，需要补齐核心风格信息。",
    });
  }

  return gaps.sort((left, right) => right.priority - left.priority);
}
