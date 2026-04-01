import type {
  EntryAgentBridgeResult,
  EntryAgentAxisPath,
  FuliSemanticCanvas,
  EntryAgentResult,
  HighValueField,
  InterpretationCandidate,
  QuestionResolutionState,
  SemanticGap,
  SlotStateStatus,
  SlotQuestionMode,
} from "./types";
import { getSemanticCanvasQuestionPrompt } from "./semanticCanvas";
import { isGapBlockedByResolution } from "./questionResolution";
import { getSlotQuestionSpec } from "./slotQuestionSpec";

const MISSING_SLOT_PRIORITY: HighValueField[] = [
  "colorMood",
  "patternTendency",
  "arrangementTendency",
  "overallImpression",
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
  const rankedAnchors = [...input.finalResolvedReadings].sort((left, right) => {
    const leftState = input.updatedSlotStates[left.field];
    const rightState = input.updatedSlotStates[right.field];
    const leftCueBonus = left.matchedCues.some((cue) => cue && cue !== left.field) ? 0.08 : 0;
    const rightCueBonus = right.matchedCues.some((cue) => cue && cue !== right.field) ? 0.08 : 0;
    const leftImpressionPenalty = left.field === "overallImpression" && (leftState === "weak-signal" || leftState === "tentative") ? 0.06 : 0;
    const rightImpressionPenalty = right.field === "overallImpression" && (rightState === "weak-signal" || rightState === "tentative") ? 0.06 : 0;
    return (right.confidence + rightCueBonus - rightImpressionPenalty) - (left.confidence + leftCueBonus - leftImpressionPenalty);
  });

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

function buildQuestionFamilyId(field: HighValueField | undefined, mode: SlotQuestionMode | undefined, type: SemanticGap["type"]) {
  if (!field) {
    return `${type}:unknown`;
  }

  return `${field}:${mode ?? type}`;
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
  bridge: Pick<EntryAgentBridgeResult, "ambiguities" | "semanticCanvas">;
  updatedSlotStates: EntryAgentResult["updatedSlotStates"];
  resolutionState?: QuestionResolutionState;
}): SemanticGap[] {
  const gaps: SemanticGap[] = [];
  const buildQuestionPromptOverride = (gap: Pick<SemanticGap, "targetField" | "targetSlot">) =>
    getSemanticCanvasQuestionPrompt(input.bridge.semanticCanvas as FuliSemanticCanvas | undefined, gap);

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
        questionFamilyId: buildQuestionFamilyId(targetField, planning.questionMode, "prototype-conflict"),
        relatedReadingIds: group.participatingReadingIds,
        reason: group.decision,
        evidence: [group.decision],
        expectedGain: planning.expectedGain,
        informationGainHint: "用户回答后，可减少两个可主导解释之间谁该成为主方向的不确定性。",
        rankingReason: "主解释存在冲突，优先级高于单纯补 missing slot。",
        questionPromptOverride: buildQuestionPromptOverride({ targetField, targetSlot: group.primarySlot }),
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
      questionFamilyId: buildQuestionFamilyId(ambiguity.field, planning.questionMode, "unresolved-ambiguity"),
      relatedReadingIds: [],
      reason: ambiguity.note,
      evidence: [ambiguity.note],
      expectedGain: planning.expectedGain,
      informationGainHint: "用户回答后，可减少当前词语在不同槽位或不同读法之间摇摆的不确定性。",
      rankingReason: "当前语义存在未决歧义，需要先确认用户真正想表达的方向。",
      questionPromptOverride: buildQuestionPromptOverride({
        targetField: ambiguity.field,
        targetSlot: mapFieldToSlot(ambiguity.field),
      }),
    });
  });

  input.interpretationMerge.semanticUnits
    .filter((unit) => unit.cueType === "poetic" || unit.routeHint === "retrieval-entry")
    .forEach((unit, index) => {
      const weakPlanning = pickQuestionMode({
        field: unit.targetField,
        type: "weak-anchor",
        reason: `${unit.cue} 目前只形成 subtle 弱信号。`,
        reading: pickReadingForField(input.interpretationMerge.finalResolvedReadings, unit.targetField),
      });
      gaps.push({
        id: `weak-anchor:${unit.id}`,
        type: "weak-anchor",
        priority: 60 - index,
        targetField: unit.targetField,
        targetSlot: unit.targetSlot,
        targetAxes: unit.disambiguationAxes,
        questionMode: weakPlanning.questionMode,
        questionKind: unit.questionKindHint,
        questionFamilyId: buildQuestionFamilyId(unit.targetField, weakPlanning.questionMode, "weak-anchor"),
        relatedReadingIds: input.interpretationMerge.candidateReadings
          .filter((reading) => reading.matchedSemanticUnitIds?.includes(unit.id))
          .map((reading) => reading.id),
        sourceUnitIds: [unit.id],
        reason: `${unit.cue} 目前只形成 subtle 弱信号。`,
        evidence: [unit.cue],
        expectedGain: "确认这个 subtle 方向是否值得稳定保留，而不是只作为弱修饰。",
        informationGainHint: unit.informationGainHint,
        rankingReason: "poetic / retrieval-only cue 只能先作为 weak-anchor，避免弱证据过早主导 narrative。",
        questionPromptOverride: buildQuestionPromptOverride({
          targetField: unit.targetField,
          targetSlot: unit.targetSlot,
        }),
      });
    });

  // Generate up to 2 missing-slot gaps so the planner has coverage options
  const anchoredField = pickAnchoredMissingField({
    finalResolvedReadings: input.interpretationMerge.finalResolvedReadings,
    updatedSlotStates: input.updatedSlotStates,
  });
  const missingField = anchoredField ?? getMissingField(input.updatedSlotStates);

  function pushMissingSlotGap(field: HighValueField, basePriority: number) {
    const targetReading = pickReadingForField(input.interpretationMerge.finalResolvedReadings, field);
    const planning = pickQuestionMode({
      field,
      type: "missing-slot",
      reason: targetReading ? `${field} 已经有初步方向，但内部取向还没收清楚。` : `${field} 还没有稳定 anchor。`,
      reading: targetReading,
    });
    gaps.push({
      id: `missing-slot:${field}`,
      type: "missing-slot",
      priority: basePriority,
      targetField: field,
      targetSlot: mapFieldToSlot(field),
      targetAxes: planning.targetAxes,
      questionMode: planning.questionMode,
      questionKind: targetReading?.questionKindHint ?? "anchor",
      questionFamilyId: buildQuestionFamilyId(field, planning.questionMode, "missing-slot"),
      relatedReadingIds: [],
      reason: targetReading ? `${field} 已经有初步方向，但内部取向还没收清楚。` : `${field} 还没有稳定 anchor。`,
      evidence: [field],
      expectedGain: planning.expectedGain,
      informationGainHint:
        targetReading?.informationGainHint ?? `用户回答后，可减少 ${field} 当前还没有稳定 anchor 的不确定性。`,
      rankingReason: targetReading
        ? "当前已有一个初步方向，优先继续收窄这个 field 的内部语义。"
        : "当前缺少关键槽位 anchor，需要补齐核心风格信息。",
      questionPromptOverride: buildQuestionPromptOverride({ targetField: field, targetSlot: mapFieldToSlot(field) }),
    });
  }

  if (missingField) {
    pushMissingSlotGap(missingField, 40);
    // Second gap: find the next uncovered field for coverage balance
    const secondMissingField = MISSING_SLOT_PRIORITY.find(
      (f) => f !== missingField && (input.updatedSlotStates[f] === undefined || input.updatedSlotStates[f] === "unknown"),
    );
    if (secondMissingField) {
      pushMissingSlotGap(secondMissingField, 28);
    }
  }

  return gaps
    .filter((gap) => !isGapBlockedByResolution(gap, input.resolutionState))
    .sort((left, right) => right.priority - left.priority);
}
