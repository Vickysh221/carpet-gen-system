import type { NextQuestionCandidate, QuestionPlan, SemanticGap } from "./types";

function buildPromptForGap(gap: SemanticGap) {
  if (gap.type === "prototype-conflict") {
    return `我现在卡在一个主解释冲突上。${gap.reason} 你更希望我先按哪一边理解？`;
  }

  if (gap.type === "unresolved-ambiguity") {
    return `${gap.reason} 你更想先确认哪一种理解？`;
  }

  if (gap.targetField === "overallImpression") {
    return "如果先只确认一个方向，你更想让它整体偏安静柔和，还是更有一点存在感？";
  }

  if (gap.targetField === "patternTendency") {
    return "如果先补图案方向，你更在意图案别太碎，还是先别太几何？";
  }

  if (gap.targetField === "colorMood") {
    return "如果先补颜色方向，你更想确认偏暖偏自然，还是先把颜色收得更克制？";
  }

  if (gap.targetField === "arrangementTendency") {
    return "如果先补排布方向，你更希望整体更松、更有呼吸感，还是更整齐有秩序？";
  }

  if (gap.targetField === "spaceContext") {
    return "这块地毯现在主要还是想服务哪个空间场景？";
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
    questionIntent,
    prompt: buildPromptForGap(gap),
    priority: gap.priority,
    resolvesGapIds: [gap.id],
    expectedInformationGain: gap.expectedGain,
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
      primaryTargetType: selectedQuestion.targetType,
      primaryTargetRef: selectedQuestion.targetRef,
      selectedQuestion,
      whyThisQuestion: selectedQuestion.expectedInformationGain,
      blockedBy: [],
      deferredTargets: questionCandidates.slice(1).map((item) => item.targetRef),
    },
  };
}
