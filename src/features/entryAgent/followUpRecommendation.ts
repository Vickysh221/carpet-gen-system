import type {
  EntryAgentBridgeResult,
  EntryAgentDetectionResult,
  EntryAgentRecommendationResult,
  HighValueField,
  QaMode,
  QuestionPlan,
  SemanticGap,
  SlotStateStatus,
} from "./types";

interface FollowUpRecommendationInput {
  detection: EntryAgentDetectionResult;
  bridge: EntryAgentBridgeResult;
  updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>;
  previousSlotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
  semanticGaps?: SemanticGap[];
  questionPlan?: QuestionPlan;
}

const FIELD_PRIORITY: HighValueField[] = [
  "overallImpression",
  "colorMood",
  "patternTendency",
  "arrangementTendency",
  "spaceContext",
];

function countKnownStates(updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>) {
  return Object.values(updatedSlotStates).filter((state) => state && state !== "unknown").length;
}

function getConflictedField(updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>) {
  return FIELD_PRIORITY.find((field) => updatedSlotStates[field] === "conflicted");
}

function getWeakField(updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>) {
  return FIELD_PRIORITY.find((field) => updatedSlotStates[field] === "weak-signal");
}

function getMissingPriorityField(updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>) {
  return FIELD_PRIORITY.find((field) => updatedSlotStates[field] === undefined || updatedSlotStates[field] === "unknown");
}

function hasRevisionSignal(
  previousSlotStates: Partial<Record<HighValueField, SlotStateStatus>> | undefined,
  updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>,
) {
  if (!previousSlotStates) {
    return false;
  }

  return Object.entries(updatedSlotStates).some(([field, state]) => {
    const previousState = previousSlotStates[field as HighValueField];

    if (previousState === undefined || previousState === "unknown") {
      return false;
    }

    return state === "conflicted";
  });
}

function getQuestionIntent(target: HighValueField | undefined, state: SlotStateStatus | undefined) {
  if (!target) {
    return undefined;
  }

  if (state === "weak-signal") {
    return "clarify-weak-signal";
  }

  if (state === "conflicted") {
    return "resolve-ambiguity";
  }

  return "fill-missing-slot";
}

function mapQuestionPlanToField(questionPlan: QuestionPlan | undefined, semanticGaps: SemanticGap[] | undefined) {
  if (!questionPlan || !semanticGaps) {
    return undefined;
  }

  return semanticGaps.find((gap) => gap.id === questionPlan.selectedQuestion.resolvesGapIds[0])?.targetField;
}

function mapQuestionPlanToQaMode(questionPlan: QuestionPlan | undefined) {
  if (!questionPlan) {
    return undefined;
  }

  if (questionPlan.selectedQuestion.questionIntent === "resolve-prototype-conflict") {
    return "slot-revision" satisfies QaMode;
  }

  if (questionPlan.selectedQuestion.questionIntent === "resolve-ambiguity") {
    return "exploratory-intake" satisfies QaMode;
  }

  return "slot-completion" satisfies QaMode;
}

export function deriveFollowUpRecommendation({
  detection,
  bridge,
  updatedSlotStates,
  previousSlotStates,
  semanticGaps,
  questionPlan,
}: FollowUpRecommendationInput): EntryAgentRecommendationResult {
  const semanticTargetField = mapQuestionPlanToField(questionPlan, semanticGaps);
  const semanticQaMode = mapQuestionPlanToQaMode(questionPlan);

  if (questionPlan && semanticQaMode) {
    return {
      updatedSlotStates,
      suggestedQaMode: semanticQaMode,
      suggestedFollowUpTarget: semanticTargetField,
      suggestedQuestionIntent:
        questionPlan.selectedQuestion.questionIntent === "fill-missing-slot"
          ? "fill-missing-slot"
          : questionPlan.selectedQuestion.questionIntent,
    };
  }

  const knownStateCount = countKnownStates(updatedSlotStates);
  const conflictedField = getConflictedField(updatedSlotStates);
  const weakField = getWeakField(updatedSlotStates);
  const missingField = getMissingPriorityField(updatedSlotStates);
  const revisionSignal = hasRevisionSignal(previousSlotStates, updatedSlotStates);
  const hasAmbiguity = bridge.ambiguities.length > 0;

  let suggestedQaMode: QaMode = "exploratory-intake";
  let suggestedFollowUpTarget: HighValueField | undefined;

  if (revisionSignal || conflictedField) {
    suggestedQaMode = "slot-revision";
    suggestedFollowUpTarget = conflictedField;
  } else if (knownStateCount === 0 || (knownStateCount <= 1 && hasAmbiguity)) {
    suggestedQaMode = "exploratory-intake";
    suggestedFollowUpTarget = weakField ?? missingField ?? detection.hitFields[0];
  } else if (missingField) {
    suggestedQaMode = "slot-completion";
    suggestedFollowUpTarget = missingField;
  } else if (weakField) {
    suggestedQaMode = "exploratory-intake";
    suggestedFollowUpTarget = weakField;
  } else if (
    previousSlotStates &&
    Object.values(previousSlotStates).some((state) => state === "locked") &&
    detection.hitFields.length > 0
  ) {
    suggestedQaMode = "lock-reinforcement";
    suggestedFollowUpTarget = detection.hitFields[0];
  } else if (previousSlotStates && detection.hitFields.length > 0) {
    suggestedQaMode = "preference-shift";
    suggestedFollowUpTarget = detection.hitFields[0];
  }

  return {
    updatedSlotStates,
    suggestedQaMode,
    suggestedFollowUpTarget,
    suggestedQuestionIntent: getQuestionIntent(
      suggestedFollowUpTarget,
      suggestedFollowUpTarget ? updatedSlotStates[suggestedFollowUpTarget] : undefined,
    ),
  };
}
