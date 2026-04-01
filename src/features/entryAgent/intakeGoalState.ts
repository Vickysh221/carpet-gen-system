import type { EntryAgentResult, HighValueField, IntakeMacroSlot, IntakeSlotProgress, IntentIntakeGoalState, SemanticDirection } from "./types";

const BASE_CAPTURE_THRESHOLD = 0.5;
const CRITICAL_SLOTS: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement"];

function mapFieldToMacroSlot(field: HighValueField | undefined): IntakeMacroSlot | undefined {
  if (field === "overallImpression") return "impression";
  if (field === "colorMood") return "color";
  if (field === "patternTendency") return "pattern";
  if (field === "arrangementTendency") return "arrangement";
  if (field === "spaceContext") return "space";
  return undefined;
}

function getTopDirectionForSlot(input: { analysis: EntryAgentResult; slot: IntakeMacroSlot }) {
  const candidate = input.analysis.semanticUnderstanding.confirmedDirections.find((direction) =>
    direction.sourceReadingIds.some((readingId) => {
      const reading = input.analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === readingId);
      return mapFieldToMacroSlot(reading?.field) === input.slot;
    }),
  );

  if (candidate) {
    return {
      label: candidate.label,
      score: candidate.confidence,
      supportingSignals: candidate.sourceReadingIds,
    };
  }

  const activeReading = input.analysis.semanticUnderstanding.activeReadings.find((reading) => {
    const fullReading = input.analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === reading.readingId);
    return mapFieldToMacroSlot(fullReading?.field) === input.slot;
  });

  if (activeReading) {
    return {
      label: activeReading.label,
      score: activeReading.confidence,
      supportingSignals: [activeReading.readingId],
    };
  }

  const openGap = input.analysis.semanticGaps.find((gap) => mapFieldToMacroSlot(gap.targetField) === input.slot);
  if (openGap) {
    return {
      label: undefined,
      score: 0.2,
      supportingSignals: openGap.evidence.slice(0, 2),
    };
  }

  return {
    label: undefined,
    score: 0,
    supportingSignals: [],
  };
}

function buildSlotProgress(analysis: EntryAgentResult, slot: IntakeMacroSlot): IntakeSlotProgress {
  const top = getTopDirectionForSlot({ analysis, slot });

  return {
    slot,
    topDirection: top.label,
    topScore: Number(top.score.toFixed(2)),
    supportingSignals: top.supportingSignals,
    isBaseCaptured: top.score >= BASE_CAPTURE_THRESHOLD,
  };
}

export function buildIntentIntakeGoalState(analysis: EntryAgentResult): IntentIntakeGoalState {
  const macroSlots: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement", "space"];
  const slots: IntakeSlotProgress[] = macroSlots.map((slot) => buildSlotProgress(analysis, slot));

  const missingSlots = slots
    .filter((slot) => CRITICAL_SLOTS.includes(slot.slot) && !slot.isBaseCaptured)
    .map((slot) => slot.slot);

  const completed = missingSlots.length === 0;

  return {
    slots,
    completed,
    completionReason: completed ? "critical macro slots have base directions above threshold" : undefined,
    missingSlots,
  };
}
