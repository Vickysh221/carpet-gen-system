import { getSlotQuestionSpec } from "./slotQuestionSpec";
import type { NextQuestionCandidate, QuestionPlan, SemanticGap } from "./types";

function buildPromptForGap(gap: SemanticGap) {
  if (gap.type === "prototype-conflict") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (modeSpec) {
      return `${gap.reason} ${modeSpec.buildPrompt({ reason: gap.reason })}`;
    }
    return `我现在卡在一个主解释冲突上。${gap.reason} 你更希望我先按哪一边理解？`;
  }

  if (gap.type === "unresolved-ambiguity") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (modeSpec) {
      return `${gap.reason} ${modeSpec.buildPrompt({ reason: gap.reason })}`;
    }
    return `${gap.reason} 你更想先确认哪一种理解？`;
  }

  const spec = getSlotQuestionSpec(gap.targetField);
  const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
  if (modeSpec) {
    return modeSpec.buildPrompt({ reason: gap.reason });
  }
  return "如果先只确认一个最关键的缺口，你希望我先补氛围、颜色，还是图案方向？";
}

function buildCandidate(gap: SemanticGap): NextQuestionCandidate {
  const targetType = gap.type === "missing-slot" ? "slot" : gap.type === "prototype-conflict" ? "conflict" : "ambiguity";
  const questionIntent =
    gap.type === "prototype-conflict"
      ? "resolve-prototype-conflict"
      : gap.type === "unresolved-ambiguity"
        ? "resolve-ambiguity"
        : "fill-missing-slot";

  return {
    id: `question:${gap.id}`,
    targetType,
    targetRef: gap.id,
    targetField: gap.targetField,
    targetSlot: gap.targetSlot,
    targetAxes: gap.targetAxes,
    questionMode: gap.questionMode,
    questionIntent,
    prompt: buildPromptForGap(gap),
    priority: gap.priority,
    resolvesGapIds: [gap.id],
    expectedInformationGain: gap.expectedGain,
    questionWhy: gap.rankingReason,
  };
}

export function buildQuestionPlan(input: { semanticGaps: SemanticGap[] }): {
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
} {
  const questionCandidates = input.semanticGaps.map(buildCandidate).sort((left, right) => right.priority - left.priority);
  const selectedQuestion = questionCandidates[0];

  if (!selectedQuestion) {
    return {
      questionCandidates,
      questionPlan: undefined,
    };
  }

  return {
    questionCandidates,
    questionPlan: {
      selectedGapId: selectedQuestion.resolvesGapIds[0],
      primaryTargetType: selectedQuestion.targetType,
      primaryTargetRef: selectedQuestion.targetRef,
      selectedTargetField: selectedQuestion.targetField,
      selectedTargetSlot: selectedQuestion.targetSlot,
      selectedTargetAxes: selectedQuestion.targetAxes,
      selectedQuestion,
      whyThisQuestion: `${selectedQuestion.questionWhy} ${selectedQuestion.expectedInformationGain}`.trim(),
      blockedBy: [],
      deferredTargets: questionCandidates.slice(1).map((item) => item.targetRef),
    },
  };
}
