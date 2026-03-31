import type { EntryAgentBridgeResult, EntryAgentResult, InterpretationCandidate, SemanticDirection, SemanticUnderstanding } from "./types";

function buildDirectionLabel(reading: InterpretationCandidate) {
  if (reading.semanticHints?.patternComplexity === "lower") {
    return "图案先收一点，视觉噪音更低";
  }

  if (reading.semanticHints?.colorMood === "earthy") {
    return "颜色偏暖、偏自然一些";
  }

  if (reading.semanticHints?.impression === "warm") {
    return "整体氛围偏温暖、有陪伴感";
  }

  if (reading.semanticHints?.patternTendency === "natural") {
    return "图案倾向更自然生长感";
  }

  return reading.label;
}

function collectConfirmedDirections(readings: InterpretationCandidate[]): SemanticDirection[] {
  return readings.slice(0, 3).map((reading) => ({
    label: buildDirectionLabel(reading),
    sourceReadingIds: [reading.id],
    confidence: reading.confidence,
  }));
}

function buildNarrative(input: {
  confirmedDirections: SemanticDirection[];
  activeReadings: SemanticUnderstanding["activeReadings"];
  secondaryReadings: SemanticUnderstanding["secondaryReadings"];
  openQuestions: string[];
  conflictSummary: string[];
}) {
  const parts: string[] = [];

  if (input.confirmedDirections.length > 0) {
    parts.push(`当前主要在往${input.confirmedDirections.map((item) => item.label).join("、")}的方向收。`);
  } else if (input.activeReadings.length > 0) {
    parts.push(`当前先保留的解释是${input.activeReadings.map((item) => item.label).join("、")}。`);
  } else {
    parts.push("当前只抓到了一些很粗的方向，还没有形成稳定主解释。");
  }

  if (input.secondaryReadings.length > 0) {
    parts.push(`同时还保留了${input.secondaryReadings.map((item) => item.label).join("、")}作为次级解释。`);
  }

  if (input.conflictSummary.length > 0) {
    parts.push(`眼下最需要处理的是${input.conflictSummary[0]}。`);
  } else if (input.openQuestions.length > 0) {
    parts.push(`还没完全确认的是${input.openQuestions[0]}。`);
  }

  return parts.join("");
}

export function buildSemanticUnderstanding(input: {
  interpretationMerge: EntryAgentResult["interpretationMerge"];
  bridge: Pick<EntryAgentBridgeResult, "ambiguities">;
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

  return {
    confirmedDirections,
    activeReadings,
    secondaryReadings,
    openQuestions,
    conflictSummary,
    narrative: buildNarrative({
      confirmedDirections,
      activeReadings,
      secondaryReadings,
      openQuestions,
      conflictSummary,
    }),
  };
}
