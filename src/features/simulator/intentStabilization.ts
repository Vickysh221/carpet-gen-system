import { analyzeEntryText, type EntryAgentResult, type FuliSemanticCanvas, type HighValueField, type QuestionTrace } from "@/features/entryAgent";

const MAX_INTENT_TURNS = 3;

interface AnswerAlignment {
  status: "initial" | "answered" | "partial" | "shifted";
  introducedFields: HighValueField[];
  note: string;
}

interface TurnSemanticRecord {
  turnIndex: number;
  replyText: string;
  hitFields: HighValueField[];
  answerAlignment: AnswerAlignment;
}

interface IntentConversationState {
  turns: TurnSemanticRecord[];
  questionHistory: QuestionTrace[];
  cumulativeCanvas?: FuliSemanticCanvas;
}

interface IntentUnderstandingSnapshot {
  text: string;
  analysis: EntryAgentResult;
  currentUnderstanding: string;
  followUpQuestion: string;
  readyToGenerate: boolean;
  turnCount: number;
  canAskAnotherQuestion: boolean;
  conversationState: IntentConversationState;
}

function joinUserTexts(previousText: string | undefined, nextReply: string) {
  if (!previousText || previousText.trim().length === 0) {
    return nextReply.trim();
  }

  return `${previousText.trim()} ${nextReply.trim()}`.trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function mergeStringArrays(...values: Array<string[] | undefined>) {
  return unique(values.flatMap((value) => value ?? []));
}

function mergeSemanticCanvas(
  previousCanvas: FuliSemanticCanvas | undefined,
  nextCanvas: FuliSemanticCanvas | undefined,
): FuliSemanticCanvas | undefined {
  if (!previousCanvas) {
    return nextCanvas;
  }

  if (!nextCanvas) {
    return previousCanvas;
  }

  return {
    source: previousCanvas.source === nextCanvas.source ? previousCanvas.source : "hybrid",
    confidence: Number((((previousCanvas.confidence ?? 0.65) + (nextCanvas.confidence ?? 0.72)) / 2).toFixed(2)),
    rawCues: mergeStringArrays(previousCanvas.rawCues, nextCanvas.rawCues),
    conceptualAxes: mergeStringArrays(previousCanvas.conceptualAxes, nextCanvas.conceptualAxes),
    metaphoricDomains: mergeStringArrays(previousCanvas.metaphoricDomains, nextCanvas.metaphoricDomains),
    designTranslations: {
      colorIdentity: mergeStringArrays(previousCanvas.designTranslations.colorIdentity, nextCanvas.designTranslations.colorIdentity),
      colorRestraint: mergeStringArrays(previousCanvas.designTranslations.colorRestraint, nextCanvas.designTranslations.colorRestraint),
      motifLogic: mergeStringArrays(previousCanvas.designTranslations.motifLogic, nextCanvas.designTranslations.motifLogic),
      arrangementLogic: mergeStringArrays(previousCanvas.designTranslations.arrangementLogic, nextCanvas.designTranslations.arrangementLogic),
      impressionTone: mergeStringArrays(previousCanvas.designTranslations.impressionTone, nextCanvas.designTranslations.impressionTone),
      materialSuggestion: mergeStringArrays(previousCanvas.designTranslations.materialSuggestion, nextCanvas.designTranslations.materialSuggestion),
      presenceIntensity: mergeStringArrays(previousCanvas.designTranslations.presenceIntensity, nextCanvas.designTranslations.presenceIntensity),
    },
    slotMappings: {
      targetFields: unique([...previousCanvas.slotMappings.targetFields, ...nextCanvas.slotMappings.targetFields]),
      targetSlots: unique([...previousCanvas.slotMappings.targetSlots, ...nextCanvas.slotMappings.targetSlots]),
      targetAxes: unique([...previousCanvas.slotMappings.targetAxes, ...nextCanvas.slotMappings.targetAxes]),
    },
    narrativePolicy: {
      mustPreserve: mergeStringArrays(previousCanvas.narrativePolicy.mustPreserve, nextCanvas.narrativePolicy.mustPreserve),
      mustNotOverLiteralize: mergeStringArrays(previousCanvas.narrativePolicy.mustNotOverLiteralize, nextCanvas.narrativePolicy.mustNotOverLiteralize),
      directionalDominant: mergeStringArrays(previousCanvas.narrativePolicy.directionalDominant, nextCanvas.narrativePolicy.directionalDominant),
    },
    questionImplications: {
      likelyQuestionKinds: mergeStringArrays(previousCanvas.questionImplications.likelyQuestionKinds, nextCanvas.questionImplications.likelyQuestionKinds),
      likelyInformationGains: mergeStringArrays(previousCanvas.questionImplications.likelyInformationGains, nextCanvas.questionImplications.likelyInformationGains),
    },
  };
}

function buildOverallUnderstanding(analysis: EntryAgentResult) {
  const phrases: string[] = [];

  if (analysis.hitFields.includes("overallImpression")) {
    if (analysis.provisionalStateHints.impression === "calm") {
      phrases.push("我先理解成你更在意整体安静、放松的感觉。");
    } else if (analysis.provisionalStateHints.impression === "energetic") {
      phrases.push("我先理解成你希望它带一点更明显的存在感和活力。");
    } else if (analysis.provisionalStateHints.impression === "warm") {
      phrases.push("我先理解成你想要一种偏温暖、带陪伴感的氛围。");
    } else if (analysis.provisionalStateHints.impression === "soft") {
      phrases.push("目前看起来你更靠近柔和、放松的一边。");
    } else {
      phrases.push("我抓到了整体氛围方向，但还没有形成稳定的具体理解，需要再确认一下。");
    }
  }

  if (analysis.hitFields.includes("patternTendency")) {
    if (analysis.provisionalStateHints.patternComplexity === "lower") {
      phrases.push("同时你似乎也不希望图案太花或太碎，想先把视觉收一收。");
    } else if (analysis.provisionalStateHints.patternGeometry === "lessGeometric") {
      phrases.push("我也感觉你在回避太硬、太几何的图案方向。");
    } else if (phrases.length === 0) {
      phrases.push("我注意到你对图案有一些倾向，但具体方向还不太明确。");
    }
  }

  if (analysis.hitFields.includes("colorMood") && phrases.length === 0) {
    if (analysis.provisionalStateHints.colorMood === "spring-green") {
      phrases.push("我先理解成你想让颜色带一点春绿感，而且这层颜色需要被轻轻看见。");
    } else if (analysis.provisionalStateHints.colorMood === "spring-green-subtle") {
      phrases.push("我先理解成你想保留一点若有若无的春绿存在，而不是把颜色做得很重。");
    } else if (analysis.provisionalStateHints.colorMood === "earthy") {
      phrases.push("我先理解成你想让颜色更自然、更温和一点。");
    } else if (analysis.provisionalStateHints.colorMood === "restrained") {
      phrases.push("目前看起来你更希望颜色先收敛一点，不要太跳。");
    } else {
      phrases.push("我先感觉你对颜色有一些想法，但还需要再确认一下方向。");
    }
  }

  if (phrases.length === 0 && analysis.hitFields.includes("arrangementTendency")) {
    phrases.push("我先抓到了你对排布方式有一些倾向，但还没完全确认方向。");
  }

  if (phrases.length === 0 && analysis.hitFields.includes("spaceContext")) {
    phrases.push("我先抓到的是这块地毯会服务于一个具体空间，但方向还需要再收一收。");
  }

  if (phrases.length === 0 && analysis.hitFields.length > 0) {
    phrases.push("我先捕捉到了一些初步方向，还需要继续确认。");
  }

  if (phrases.length === 0) {
    return "我先有一个很粗的感觉，但还不想太早替你下结论。";
  }

  return phrases.slice(0, 2).join("");
}

function getPrimaryAmbiguityQuestion(analysis: EntryAgentResult) {
  const ambiguityNotes = analysis.ambiguities.map((item) => item.note);

  if (ambiguityNotes.some((note) => note.includes("不要太花"))) {
    return "你更想避免的是颜色太跳，还是图案太碎一点？";
  }

  if (ambiguityNotes.some((note) => note.includes("自然一点"))) {
    return "你说的“自然一点”，更偏向图案别太几何，还是颜色更柔和一点？";
  }

  if (ambiguityNotes.some((note) => note.includes("温暖") || note.includes("温馨"))) {
    return "你说的温暖，更偏向颜色更暖，还是整体氛围更柔和放松？";
  }

  if (ambiguityNotes.some((note) => note.includes("舒服"))) {
    return "你更在意的是整体更安静放松，还是视觉别太跳、别太碎？";
  }

  if (ambiguityNotes.some((note) => note.includes("柔软"))) {
    return "你说的柔软，更像是想要氛围更放松，还是图案和线条别太硬？";
  }

  return undefined;
}

function getTargetedFollowUpQuestion(target: HighValueField | undefined) {
  if (target === "overallImpression") {
    return "如果先不谈细节，你更想让它偏安静柔和，还是更有一点存在感？";
  }

  if (target === "patternTendency") {
    return "你更在意的是图案别太花太碎，还是先避免太强的几何感？";
  }

  if (target === "colorMood") {
    return "你现在更想先确认颜色更温和一点，还是先把图案存在感压低一点？";
  }

  if (target === "arrangementTendency") {
    return "你希望整体更松一点、有呼吸感，还是更整齐有秩序一点？";
  }

  if (target === "spaceContext") {
    return "这块地毯主要还是想服务哪个空间场景？";
  }

  return "如果先抓一个最重要的方向，你最想先确认的是氛围、颜色，还是图案感？";
}

function buildFollowUpQuestion(analysis: EntryAgentResult) {
  return getPrimaryAmbiguityQuestion(analysis) ?? getTargetedFollowUpQuestion(analysis.suggestedFollowUpTarget);
}

function getSemanticUnderstandingNarrative(analysis: EntryAgentResult) {
  if (!analysis.semanticUnderstanding.isWeakNarrative) {
    return analysis.semanticUnderstanding.narrative;
  }
  return buildOverallUnderstanding(analysis) || analysis.semanticUnderstanding.narrative;
}

function buildQuestionTrace(input: {
  selectedPrompt: string;
  analysis: EntryAgentResult;
  turnCount: number;
}): QuestionTrace | undefined {
  const selectedQuestion =
    input.analysis.questionCandidates.find((candidate) => candidate.prompt === input.selectedPrompt) ??
    input.analysis.questionPlan?.selectedQuestion;

  if (!selectedQuestion) {
    return undefined;
  }

  return {
    turnIndex: input.turnCount,
    prompt: selectedQuestion.prompt,
    targetField: selectedQuestion.targetField,
    targetSlot: selectedQuestion.targetSlot,
    targetAxes: selectedQuestion.targetAxes,
    gapId: selectedQuestion.resolvesGapIds[0],
  };
}

function buildCumulativeUnderstanding(input: {
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
  answerAlignment: AnswerAlignment;
  turnCount: number;
}) {
  const canvas = input.cumulativeCanvas;
  if (!canvas) {
    return getSemanticUnderstandingNarrative(input.analysis);
  }

  const phrases: string[] = [];

  if (canvas.narrativePolicy.mustPreserve.some((cue) => ["绿意", "绿意盎然", "草色", "春意"].includes(cue))) {
    phrases.push("目前几轮累积下来，主意象稳定落在春绿、轻可见、不是浓重铺满的方向。");
  } else if (canvas.narrativePolicy.mustNotOverLiteralize.includes("咖啡时光")) {
    phrases.push("目前几轮累积下来，主意象更像日常陪伴、慢下来、低刺激温度感，而不是一个具体咖啡色方案。");
  } else if (canvas.narrativePolicy.directionalDominant.some((cue) => ["张扬", "快乐"].includes(cue))) {
    phrases.push("目前几轮累积下来，主意象偏向快乐、有张力、存在感明确，但还没完全收清楚边界。");
  } else if (canvas.conceptualAxes.length > 0) {
    phrases.push(`目前几轮累积下来，主意象主要在往${canvas.conceptualAxes.slice(0, 3).join("、")}的方向收。`);
  }

  if (input.answerAlignment.status === "shifted") {
    phrases.push("这一轮用户明显把方向切到了新的语义线程，所以下一句会跟着新意象继续问，而不是重复上一问。");
  } else if (input.answerAlignment.status === "partial") {
    phrases.push("这一轮既回应了上一问，也补进了新线索，所以下一句会顺着更强的新线索改写问题。");
  }

  if (input.analysis.questionPlan?.selectedQuestion.expectedInformationGain) {
    phrases.push(`下一句会继续收还没完全确认的部分，重点是${input.analysis.questionPlan.selectedQuestion.expectedInformationGain}`);
  }

  return phrases.join("");
}

function hasCoreIntentAnchor(analysis: EntryAgentResult) {
  const hasImpression = analysis.updatedSlotStates.overallImpression === "tentative";
  const hasVisualAnchor =
    analysis.updatedSlotStates.patternTendency === "tentative" ||
    analysis.updatedSlotStates.colorMood === "tentative" ||
    analysis.updatedSlotStates.arrangementTendency === "tentative";

  return hasImpression && hasVisualAnchor;
}

function shouldGenerateNow(analysis: EntryAgentResult, turnCount: number) {
  if (turnCount >= MAX_INTENT_TURNS) {
    return true;
  }

  if (turnCount < 2) {
    return false;
  }

  return hasCoreIntentAnchor(analysis);
}

export async function buildIntentStabilizationSnapshot({
  previousSnapshot,
  previousText,
  nextReply,
  previousTurnCount = 0,
}: {
  previousSnapshot?: IntentUnderstandingSnapshot | null;
  previousText?: string;
  nextReply: string;
  previousTurnCount?: number;
}): Promise<IntentUnderstandingSnapshot> {
  const text = joinUserTexts(previousText, nextReply);
  const turnCount = Math.min(previousTurnCount + 1, MAX_INTENT_TURNS);
  const previousQuestionHistory = previousSnapshot?.conversationState.questionHistory ?? [];
  const previousQuestion = previousQuestionHistory[previousQuestionHistory.length - 1];
  const analysis = await analyzeEntryText({
    text,
    previousQuestionTrace: previousQuestion,
  });
  const answerAlignment = analysis.questionPlan?.answerAlignment ?? {
    status: "initial",
    introducedFields: analysis.hitFields,
    note: "当前没有可用的上一问对齐信息。",
  };
  const cumulativeCanvas = mergeSemanticCanvas(previousSnapshot?.conversationState.cumulativeCanvas, analysis.semanticCanvas);
  const readyToGenerate = shouldGenerateNow(analysis, turnCount);
  const selectedPrompt = readyToGenerate
    ? "我已经有一个初步方向了，我们先进入第一轮看看。"
    : analysis.questionPlan?.selectedQuestion.prompt ?? buildFollowUpQuestion(analysis);
  const nextQuestionTrace = readyToGenerate
    ? undefined
    : buildQuestionTrace({
        selectedPrompt,
        analysis,
        turnCount,
      });
  const conversationState: IntentConversationState = {
    turns: [
      ...(previousSnapshot?.conversationState.turns ?? []),
      {
        turnIndex: turnCount,
        replyText: nextReply.trim(),
        hitFields: analysis.hitFields,
        answerAlignment,
      },
    ],
    questionHistory: nextQuestionTrace
      ? [...(previousSnapshot?.conversationState.questionHistory ?? []), nextQuestionTrace]
      : [...(previousSnapshot?.conversationState.questionHistory ?? [])],
    cumulativeCanvas,
  };

  return {
    text,
    analysis,
    currentUnderstanding: buildCumulativeUnderstanding({
      analysis,
      cumulativeCanvas,
      answerAlignment,
      turnCount,
    }),
    followUpQuestion: selectedPrompt,
    readyToGenerate,
    turnCount,
    canAskAnotherQuestion: !readyToGenerate && turnCount < MAX_INTENT_TURNS,
    conversationState,
  };
}

export type { IntentUnderstandingSnapshot };
