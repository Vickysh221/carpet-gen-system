import { activeAnswerAlignmentProvider } from "./answerAlignmentAdapter";
import { getSlotQuestionSpec } from "./slotQuestionSpec";
import type { AnswerAlignment, EntryAgentResult, NextQuestionCandidate, HighValueField, QuestionPlan, QuestionResolution, QuestionResolutionState, QuestionTrace, SemanticGap } from "./types";

const FIELD_NEIGHBORS: Partial<Record<HighValueField, HighValueField[]>> = {
  overallImpression: ["patternTendency", "arrangementTendency", "colorMood"],
  patternTendency: ["arrangementTendency", "overallImpression", "colorMood"],
  arrangementTendency: ["patternTendency", "overallImpression"],
  colorMood: ["overallImpression", "patternTendency"],
  spaceContext: ["overallImpression", "arrangementTendency"],
};

function quoteCue(cue: string) {
  return `“${cue.replace(/^“|”$/g, "")}”`;
}

function getPrimaryCue(gap: SemanticGap) {
  return gap.evidence.find((item) => item && item !== gap.targetField && item !== gap.reason) ?? gap.evidence[0];
}

function buildCueGroundedPrompt(gap: SemanticGap) {
  const cue = getPrimaryCue(gap);
  if (!cue) {
    return undefined;
  }

  if (gap.targetField === "colorMood" || gap.targetSlot === "color") {
    return `${quoteCue(cue)} 这层感觉，你更想让颜色本身被看见一点，还是只作为整体气息轻轻带到？`;
  }

  if (gap.targetField === "patternTendency" || gap.targetSlot === "motif") {
    return `${quoteCue(cue)} 如果先挂到图案这一层，你更像是在回避太碎太花，还是太硬太几何？`;
  }

  if (gap.targetField === "arrangementTendency" || gap.targetSlot === "arrangement") {
    return `${quoteCue(cue)} 如果先挂到排布这一层，你更想让它松一点、有呼吸感，还是更整齐一些？`;
  }

  if (gap.targetField === "overallImpression" || gap.targetSlot === "impression") {
    return `${quoteCue(cue)} 我先把它理解成整体气质线索，你更想让它偏安静松一点，还是保留一点存在感？`;
  }

  if (gap.targetField === "spaceContext") {
    return `${quoteCue(cue)} 这层更像是在指向一个具体空间场景吗？`;
  }

  return undefined;
}

function isGenericPrompt(prompt: string, field: HighValueField | undefined) {
  const genericPatterns = [
    "如果先只收一个大方向",
    "如果先只确认一个最关键的缺口",
    "你更想让它整体偏安静放松",
  ];

  return field === "overallImpression" && genericPatterns.some((pattern) => prompt.includes(pattern));
}

function buildPromptForGap(gap: SemanticGap) {
  if (gap.questionPromptOverride) {
    return gap.questionPromptOverride;
  }

  const cueGroundedPrompt = buildCueGroundedPrompt(gap);

  if (gap.type === "prototype-conflict") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "有两种理解方向都说得通，你更希望我先按哪边走？";
  }

  if (gap.type === "unresolved-ambiguity") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "你更想先往哪个方向确认一下？";
  }

  if (gap.type === "weak-anchor") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (gap.questionKind === "strength") {
      const cue = getPrimaryCue(gap);
      return cue
        ? `${quoteCue(cue)} 这层感觉你是明确想保留，还是只是希望别太重、点到为止就好？`
        : "这个方向你是明确想保留，还是只是顺带有一点就行？";
    }
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "这个方向你是明确想保留，还是顺带有一点就行？";
  }

  const spec = getSlotQuestionSpec(gap.targetField);
  const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
  if (cueGroundedPrompt) {
    return cueGroundedPrompt;
  }
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
        : gap.type === "weak-anchor"
          ? "stabilize-weak-anchor"
          : "fill-missing-slot";

  const prompt = buildPromptForGap(gap);
  const genericPenalty = isGenericPrompt(prompt, gap.targetField) ? 8 : 0;
  const cueBonus = gap.questionPromptOverride ? 10 : gap.evidence.some((item) => item && item !== gap.targetField) ? 6 : 0;

  return {
    id: `question:${gap.id}`,
    targetType,
    targetRef: gap.id,
    targetField: gap.targetField,
    targetSlot: gap.targetSlot,
    targetAxes: gap.targetAxes,
    questionMode: gap.questionMode,
    questionKind: gap.questionKind,
    questionFamilyId: gap.questionFamilyId,
    questionIntent,
    prompt,
    priority: gap.priority + cueBonus - genericPenalty,
    resolvesGapIds: [gap.id],
    expectedInformationGain: gap.expectedGain,
    questionWhy: `${gap.rankingReason}${cueBonus > 0 ? " 优先顺着当前 cue 往最近槽位继续追问。" : ""}${genericPenalty > 0 ? " 当前候选较泛，已下调优先级。" : ""}`.trim(),
  };
}

function countSharedAxes(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((axis) => rightSet.has(axis)).length;
}

function isNeighborField(source: HighValueField | undefined, target: HighValueField | undefined) {
  if (!source || !target || source === target) {
    return false;
  }

  return FIELD_NEIGHBORS[source]?.includes(target) ?? false;
}

function scoreContinuation(input: {
  candidate: NextQuestionCandidate;
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}) {
  const { candidate, previousQuestion, answerAlignment } = input;
  if (!previousQuestion || !answerAlignment) {
    return 0;
  }

  let score = 0;
  const sameField = candidate.targetField !== undefined && candidate.targetField === previousQuestion.targetField;
  const sharedAxes = countSharedAxes(candidate.targetAxes, previousQuestion.targetAxes);
  const sameAxes =
    candidate.targetAxes.length > 0 &&
    previousQuestion.targetAxes.length > 0 &&
    sharedAxes === candidate.targetAxes.length &&
    sharedAxes === previousQuestion.targetAxes.length;

  if (candidate.prompt === previousQuestion.prompt) {
    score -= 100;
  }

  if (candidate.targetRef === previousQuestion.gapId) {
    score -= 28;
  }

  if (sameField && sameAxes) {
    score -= 26;
  } else if (sameField && sharedAxes > 0) {
    score += 14;
  } else if (sameField) {
    score += 6;
  }

  if (isNeighborField(previousQuestion.targetField, candidate.targetField)) {
    score += 18;
  }

  if (answerAlignment.introducedFields.length > 0 && candidate.targetField && answerAlignment.introducedFields.includes(candidate.targetField)) {
    score += answerAlignment.status === "shifted" ? 24 : 12;
  }

  if (
    previousQuestion.targetField === "overallImpression" &&
    candidate.targetField === "overallImpression" &&
    answerAlignment.status !== "shifted"
  ) {
    score -= 22;
  }

  if (answerAlignment.status === "answered") {
    if (isNeighborField(previousQuestion.targetField, candidate.targetField)) {
      score += 12;
    }
    if (sameField && sharedAxes === 0) {
      score -= 8;
    }
  }

  if (answerAlignment.status === "partial") {
    if (sameField && !sameAxes) {
      score += 8;
    }
    if (!sameField && !isNeighborField(previousQuestion.targetField, candidate.targetField)) {
      score -= 10;
    }
  }

  if (answerAlignment.status === "shifted" && candidate.targetField && !answerAlignment.introducedFields.includes(candidate.targetField)) {
    score -= 12;
  }

  return score;
}

function rerankQuestionCandidates(input: {
  questionCandidates: NextQuestionCandidate[];
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}) {
  return [...input.questionCandidates].sort((left, right) => {
    const leftScore = left.priority + scoreContinuation({ candidate: left, previousQuestion: input.previousQuestion, answerAlignment: input.answerAlignment });
    const rightScore = right.priority + scoreContinuation({ candidate: right, previousQuestion: input.previousQuestion, answerAlignment: input.answerAlignment });
    return rightScore - leftScore;
  });
}

function buildRuleBasedAnswerAlignment(input: {
  previousQuestion?: QuestionTrace;
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
}): AnswerAlignment | undefined {
  const previousQuestion = input.previousQuestion;
  if (!previousQuestion) {
    return {
      status: "initial",
      introducedFields: input.hitFields,
      note: "首轮输入，还没有上一问需要对齐。",
      source: "rules",
      confidence: 0.96,
    };
  }

  const introducedFields = input.hitFields.filter((field) => field !== previousQuestion.targetField);
  const answeredPreviousField = previousQuestion.targetField ? input.hitFields.includes(previousQuestion.targetField) : false;
  const answeredPreviousAxes = previousQuestion.targetAxes.some((axis) => input.bridge.semanticCanvas?.slotMappings.targetAxes.includes(axis));
  const poeticShift = introducedFields.length > 0 && (input.bridge.semanticCanvas?.rawCues.length ?? 0) > 0;

  if (!answeredPreviousField && !answeredPreviousAxes && poeticShift) {
    return {
      status: "shifted",
      introducedFields,
      note: "用户没有顺着上一问回答，而是主动切到了新的语义线程。",
      source: "rules",
      confidence: 0.78,
    };
  }

  if ((answeredPreviousField || answeredPreviousAxes) && introducedFields.length > 0) {
    return {
      status: "partial",
      introducedFields,
      note: "用户部分回应了上一问，同时补入了新的语义线程。",
      source: "rules",
      confidence: 0.72,
    };
  }

  return {
    status: answeredPreviousField || answeredPreviousAxes ? "answered" : "partial",
    introducedFields,
    note: answeredPreviousField || answeredPreviousAxes ? "用户基本回应了上一轮问题。" : "用户只部分回应了上一轮问题。",
    source: "rules",
    confidence: answeredPreviousField || answeredPreviousAxes ? 0.74 : 0.64,
  };
}

async function evaluateAnswerAlignment(input: {
  previousQuestion?: QuestionTrace;
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
}): Promise<AnswerAlignment | undefined> {
  const ruleAlignment = buildRuleBasedAnswerAlignment(input);
  if (!input.previousQuestion || !input.bridge.semanticCanvas) {
    return ruleAlignment;
  }

  const llmResult = await activeAnswerAlignmentProvider.generate({
    previousQuestion: input.previousQuestion,
    hitFields: input.hitFields,
    semanticCanvas: input.bridge.semanticCanvas,
  });

  if (!llmResult.alignment) {
    return ruleAlignment;
  }

  if (
    ruleAlignment &&
    (ruleAlignment.status === "shifted" || ruleAlignment.status === "answered") &&
    ruleAlignment.status !== llmResult.alignment.status &&
    (ruleAlignment.confidence ?? 0) >= 0.76
  ) {
    return {
      ...ruleAlignment,
      source: "hybrid",
      note: `${ruleAlignment.note} LLM guard 给出了不同判断，但规则护栏保留了更强的本地结论。`,
    };
  }

  return {
    ...llmResult.alignment,
    source: ruleAlignment ? "hybrid" : "llm-guard",
  };
}

function selectQuestionCandidate(input: {
  questionCandidates: NextQuestionCandidate[];
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}): { selectedQuestion?: NextQuestionCandidate; planningStrategy: QuestionPlan["planningStrategy"] } {
  const defaultQuestion = input.questionCandidates[0];
  if (!defaultQuestion) {
    return { selectedQuestion: undefined, planningStrategy: "default" };
  }

  if (!input.previousQuestion || !input.answerAlignment) {
    return { selectedQuestion: defaultQuestion, planningStrategy: "default" };
  }

  if (input.answerAlignment.status === "shifted" && input.answerAlignment.introducedFields.length > 0) {
    const shiftedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      candidate.targetField !== undefined &&
      input.answerAlignment?.introducedFields.includes(candidate.targetField),
    );
    if (shiftedQuestion) {
      return { selectedQuestion: shiftedQuestion, planningStrategy: "switch-thread" };
    }
  }

  if (input.answerAlignment.status === "answered") {
    const advancedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      (candidate.targetField !== input.previousQuestion?.targetField || candidate.targetRef !== input.previousQuestion?.gapId),
    );
    if (advancedQuestion) {
      return { selectedQuestion: advancedQuestion, planningStrategy: "advance" };
    }
  }

  if (input.answerAlignment.status === "partial") {
    const reframedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      candidate.targetField === input.previousQuestion?.targetField,
    );
    if (reframedQuestion) {
      return { selectedQuestion: reframedQuestion, planningStrategy: "reframe" };
    }
  }

  return {
    selectedQuestion: input.questionCandidates.find((candidate) => candidate.prompt !== input.previousQuestion?.prompt) ?? defaultQuestion,
    planningStrategy: "default",
  };
}

export async function buildQuestionPlan(input: {
  semanticGaps: SemanticGap[];
  previousQuestion?: QuestionTrace;
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
  resolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
}): Promise<{
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
  resolutionState?: QuestionResolutionState;
}> {
  const baseCandidates = input.semanticGaps.map(buildCandidate).sort((left, right) => right.priority - left.priority);
  const answerAlignment = await evaluateAnswerAlignment({
    previousQuestion: input.previousQuestion,
    bridge: input.bridge,
    hitFields: input.hitFields,
  });
  const resolutionState = input.resolutionState;
  const resolution = input.latestResolution;
  const unresolvedCandidates = baseCandidates.filter((candidate) => {
    if (!candidate.questionFamilyId || !resolutionState) {
      return true;
    }
    const familyResolution = resolutionState.families[candidate.questionFamilyId];
    return familyResolution?.status !== "resolved";
  });
  const questionCandidates = rerankQuestionCandidates({
    questionCandidates: unresolvedCandidates,
    previousQuestion: input.previousQuestion,
    answerAlignment,
  });
  const { selectedQuestion, planningStrategy } = selectQuestionCandidate({
    questionCandidates,
    previousQuestion: input.previousQuestion,
    answerAlignment,
  });

  if (!selectedQuestion) {
    return {
      questionCandidates,
      questionPlan: undefined,
      resolutionState,
    };
  }

  return {
    questionCandidates,
    resolutionState,
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
      answerAlignment,
      planningStrategy,
      resolutionState,
      latestResolution: resolution,
    },
  };
}
