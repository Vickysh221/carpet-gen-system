import type {
  EntryAgentBridgeResult,
  EntryAgentResult,
  HighValueField,
  InterpretationCandidate,
  QuestionPlan,
  SemanticDirection,
  SemanticGap,
  SemanticUnderstanding,
} from "./types";

function buildDirectionLabel(reading: InterpretationCandidate) {
  if (reading.semanticHints?.patternComplexity === "lower") {
    return "图案先收一点，视觉噪音更低";
  }

  if (reading.semanticHints?.colorMood === "spring-green") {
    return "颜色先往偏春绿、轻可见的方向收";
  }

  if (reading.semanticHints?.colorMood === "spring-green-subtle") {
    return "颜色先保留一点若有若无的春绿存在";
  }

  if (reading.semanticHints?.colorMood === "earthy") {
    return "颜色偏暖、偏自然一些";
  }

  if (reading.semanticHints?.colorMood === "warm") {
    return "颜色偏暖、更有包裹感";
  }

  if (reading.semanticHints?.colorMood === "muted") {
    return "颜色先收、别太跳";
  }

  if (reading.semanticHints?.impression === "calm") {
    return "整体先偏安静放松一点";
  }

  if (reading.semanticHints?.impression === "energetic") {
    return "整体先带一点存在感和活力";
  }

  if (reading.semanticHints?.impression === "warm") {
    return "整体氛围偏温暖、有陪伴感";
  }

  if (reading.semanticHints?.patternTendency === "natural") {
    return "图案倾向更自然生长感";
  }

  if (reading.semanticHints?.arrangementTendency === "open") {
    return "排布先松一点、留些呼吸感";
  }

  if (reading.semanticHints?.arrangementTendency === "ordered") {
    return "先保持整齐有秩序";
  }

  return reading.label;
}

function collectConfirmedDirections(readings: InterpretationCandidate[]): SemanticDirection[] {
  return readings
    .filter((reading) => reading.ownershipClass !== "ambiguity-only")
    .slice(0, 3)
    .map((reading) => ({
      label: buildDirectionLabel(reading),
      sourceReadingIds: [reading.id],
      confidence: reading.confidence,
    }));
}

function toFriendlyFocus(field: HighValueField | undefined): string | undefined {
  if (field === "colorMood") return "颜色方向";
  if (field === "patternTendency") return "图案感";
  if (field === "arrangementTendency") return "排布方式";
  if (field === "overallImpression") return "整体氛围";
  if (field === "spaceContext") return "空间场景";
  return undefined;
}

function buildNarrative(input: {
  confirmedDirections: SemanticDirection[];
  activeReadings: SemanticUnderstanding["activeReadings"];
  secondaryReadings: SemanticUnderstanding["secondaryReadings"];
  openQuestions: string[];
  conflictSummary: string[];
  primaryGap?: SemanticGap;
  questionPlan?: QuestionPlan;
}) {
  const parts: string[] = [];

  if (input.confirmedDirections.length > 0) {
    parts.push(`我先把这里理解成：${input.confirmedDirections.map((item) => item.label).join("、")}。`);
  } else if (input.activeReadings.length > 0) {
    parts.push(`目前先保留的方向是${input.activeReadings.map((item) => item.label).join("、")}。`);
  } else {
    parts.push("我先有一个很粗的感觉，还需要再多了解一点。");
  }

  if (input.secondaryReadings.length > 0) {
    parts.push(`${input.secondaryReadings.map((item) => item.label).join("、")}这边也还没完全排除。`);
  }

  if (input.conflictSummary.length > 0) {
    parts.push("有一点还没想清楚，下一句想再确认一下。");
  } else if (input.openQuestions.length > 0) {
    parts.push("还有一块还没完全收清楚。");
  }

  const friendlyFocus = toFriendlyFocus(input.questionPlan?.selectedTargetField ?? input.primaryGap?.targetField);
  if (friendlyFocus) {
    parts.push(`下一个想多了解一点你对${friendlyFocus}的感觉。`);
  } else if (input.primaryGap?.targetSlot) {
    parts.push("还有一块想再多问问你。");
  }

  return parts.join("");
}

export function buildSemanticUnderstanding(input: {
  interpretationMerge: EntryAgentResult["interpretationMerge"];
  bridge: Pick<EntryAgentBridgeResult, "ambiguities">;
  semanticGaps: SemanticGap[];
  questionPlan?: QuestionPlan;
}): SemanticUnderstanding {
  const finalReadings = input.interpretationMerge.finalResolvedReadings;
  const activeReadings = finalReadings.map((reading) => ({
    readingId: reading.id,
    label: reading.label,
    sourceType: reading.sourceType,
    primarySlot: reading.primarySlot,
    confidence: reading.confidence,
  }));
  const secondaryReadings = input.interpretationMerge.suppressedReadings
    .map((decision) => {
      const candidate = input.interpretationMerge.candidateReadings.find((item) => item.id === decision.readingId);
      if (!candidate) {
        return null;
      }

      return {
        readingId: candidate.id,
        label: candidate.label,
        sourceType: candidate.sourceType,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 2);
  const conflictSummary = input.interpretationMerge.mergeGroups
    .filter((group) => group.followUpRequired || group.relation === "conflict")
    .map((group) => group.decision);
  const openQuestions = [
    ...input.bridge.ambiguities.map((item) => item.note),
    ...conflictSummary,
  ].slice(0, 3);
  const confirmedDirections = collectConfirmedDirections(finalReadings);
  const primaryGap = input.questionPlan
    ? input.semanticGaps.find((item) => item.id === input.questionPlan?.selectedGapId)
    : input.semanticGaps[0];

  const isWeakNarrative = confirmedDirections.length === 0 && activeReadings.length === 0;

  return {
    confirmedDirections,
    activeReadings,
    secondaryReadings,
    openQuestions,
    conflictSummary,
    isWeakNarrative,
    narrative: buildNarrative({
      confirmedDirections,
      activeReadings,
      secondaryReadings,
      openQuestions,
      conflictSummary,
      primaryGap,
      questionPlan: input.questionPlan,
    }),
  };
}
