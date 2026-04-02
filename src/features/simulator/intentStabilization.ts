import { buildDerivedEntryAnalysisFromAgentState, type EntryAgentResult, type FuliSemanticCanvas, type HighValueField, type IntakeMacroSlot, type IntentIntakeAgentState, type IntentIntakeGoalState, type QuestionTrace, type TextIntakeSignal } from "@/features/entryAgent";
import { processIntakeSignal } from "@/features/entryAgent/signalProcessor";
import { renderPersonaQuestionBridge, renderPersonaUnderstanding } from "./personaRenderer";
import { buildUnderstandingSummary, renderUnderstandingSummary } from "./understandingSummary";

/** Goal-state drives generation; turn counts are safety caps only. */
const SOFT_TURN_CAP = 5;
const HARD_TURN_CAP = 7;

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
  dialogue: ExpertDialogueTurn[];
  questionHistory: QuestionTrace[];
  cumulativeCanvas?: FuliSemanticCanvas;
  resolutionState?: EntryAgentResult["questionResolutionState"];
  agentState?: IntentIntakeAgentState;
  /** Slots confirmed by the user via confirm-direction signal. */
  lockedSlots: Partial<Record<IntakeMacroSlot, string>>;
}

export interface ExpertDialogueTurn {
  id: string;
  turnIndex: number;
  source: "text" | "opening-selection";
  userText: string;
  expertReply: string;
  nextQuestion: string;
}

interface IntentUnderstandingSnapshot {
  text: string;
  analysis: EntryAgentResult;
  currentUnderstanding: string;
  followUpQuestion: string;
  expertReply: string;
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

function buildCumulativeUnderstanding(input: {
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
  answerAlignment: AnswerAlignment;
  turnCount: number;
}) {
  const summary = buildUnderstandingSummary(input.analysis);
  const personaRendered = renderPersonaUnderstanding({
    analysis: input.analysis,
    summary,
    goalState: input.analysis.intakeGoalState,
  });

  if (personaRendered.trim().length > 0) {
    return personaRendered;
  }

  const fallbackRendered = renderUnderstandingSummary(summary);
  if (fallbackRendered.trim().length > 0) {
    return fallbackRendered;
  }

  return getSemanticUnderstandingNarrative(input.analysis);
}

function mapFieldToFriendlyLabel(field: HighValueField | undefined) {
  if (field === "overallImpression") return "整体气质";
  if (field === "colorMood") return "颜色层";
  if (field === "patternTendency") return "图案语言";
  if (field === "arrangementTendency") return "排布方式";
  if (field === "spaceContext") return "使用场景";
  return "方向";
}

function buildShiftSummary(input: {
  analysis: EntryAgentResult;
  previousAnalysis?: EntryAgentResult;
}) {
  const patternIntent = input.analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent;
  if (patternIntent?.keyElement && patternIntent.renderingMode) {
    return `这会把图案语言先收向 ${patternIntent.keyElement}，表达方式更偏 ${patternIntent.renderingMode}。`;
  }

  const focus = input.analysis.questionPlan?.selectedTargetField;
  if (focus) {
    return `现在真正被你推实的是${mapFieldToFriendlyLabel(focus)}，后面的判断会围着这条线继续收。`;
  }

  const previousSlots = input.previousAnalysis?.intakeGoalState?.slots ?? [];
  const strengthened = input.analysis.intakeGoalState?.slots.find((slot) => {
    const previous = previousSlots.find((item) => item.slot === slot.slot)?.topScore ?? 0;
    return slot.topScore - previous >= 0.12;
  });
  if (strengthened) {
    return `${mapFieldToFriendlyLabel(
      strengthened.slot === "impression"
        ? "overallImpression"
        : strengthened.slot === "color"
          ? "colorMood"
          : strengthened.slot === "pattern"
            ? "patternTendency"
            : strengthened.slot === "arrangement"
              ? "arrangementTendency"
              : "spaceContext",
    )}这一层比刚才明显更稳了。`;
  }

  return "这次输入把原来有点散的感觉先压成了一个可继续推进的方向。";
}

function buildSourceAwareOpening(input: {
  source: "text" | "opening-selection";
  userText: string;
  analysis: EntryAgentResult;
}) {
  if (input.source === "opening-selection") {
    return `我先按你刚才选的“${input.userText}”来收，而且会把它当成真实方向，不只是记一条偏好。`;
  }

  const focus = input.analysis.questionPlan?.selectedTargetField;
  if (focus === "patternTendency") {
    return "这句话里真正起作用的，不是字面对象本身，而是它对图案密度、节奏和边界的要求。";
  }
  if (focus === "colorMood") {
    return "我先不把它压成单一颜色词，而是按它带出来的明度、饱和度和气息去判断。";
  }
  if (focus === "overallImpression") {
    return "我先抓的是它推动的整体气质，而不是表面上那些形容词。";
  }

  return "我先抓住这句话里真正起作用的感知特征，再决定下一步该往哪条线收。";
}

function buildExpertReply(input: {
  source: "text" | "opening-selection";
  userText: string;
  analysis: EntryAgentResult;
  previousAnalysis?: EntryAgentResult;
  currentUnderstanding: string;
  nextQuestion: string;
}) {
  return [
    buildSourceAwareOpening({
      source: input.source,
      userText: input.userText,
      analysis: input.analysis,
    }),
    input.currentUnderstanding,
    buildShiftSummary({
      analysis: input.analysis,
      previousAnalysis: input.previousAnalysis,
    }),
    `接下来我只想把这一处分叉问清：${input.nextQuestion}`,
  ].join(" ");
}


function shouldGenerateNow(analysis: EntryAgentResult, turnCount: number) {
  const mappingReady = analysis.semanticMapping?.confidenceSummary.readyForFirstBatch ?? false;
  if (turnCount < 3) {
    return false;
  }

  // Goal-state driven: readyForFirstGeneration is the primary gate.
  if (analysis.intakeGoalState?.readyForFirstGeneration && mappingReady) return true;

  // Hard cap no longer forces generation when critical slots are still missing.
  if (turnCount >= HARD_TURN_CAP) {
    return Boolean(analysis.intakeGoalState?.completed && mappingReady);
  }

  return false;
}

export async function buildIntentStabilizationSnapshot({
  previousSnapshot,
  previousText,
  signal,
  previousTurnCount = 0,
  currentAgentStateOverride,
}: {
  previousSnapshot?: IntentUnderstandingSnapshot | null;
  previousText?: string;
  /** The user's current input as a TextIntakeSignal. */
  signal: TextIntakeSignal;
  previousTurnCount?: number;
  currentAgentStateOverride?: IntentIntakeAgentState;
}): Promise<IntentUnderstandingSnapshot> {
  // Accumulate text across turns so the full semantic context is available.
  const text = joinUserTexts(previousText, signal.text);
  const turnCount = Math.min(previousTurnCount + 1, HARD_TURN_CAP);
  const previousAgentState =
    currentAgentStateOverride ??
    previousSnapshot?.conversationState.agentState ??
    previousSnapshot?.analysis.agentState;
  const previousQuestionHistory = previousAgentState?.questionHistory ?? previousSnapshot?.conversationState.questionHistory ?? [];
  const previousQuestion = previousQuestionHistory[previousQuestionHistory.length - 1];
  // Route through the unified signal-first entry point.
  const analysis = await processIntakeSignal(signal, {
    cumulativeText: text,
    currentAgentState: previousAgentState,
    previousQuestionTrace: previousQuestion,
    resolutionState: previousAgentState?.resolutionState ?? previousSnapshot?.conversationState.resolutionState,
    previousGoalState: previousAgentState?.goalState ?? previousSnapshot?.analysis.intakeGoalState,
    questionHistory: previousQuestionHistory,
  });
  const answerAlignment = analysis.questionPlan?.answerAlignment ?? {
    status: "initial",
    introducedFields: analysis.hitFields,
    note: "当前没有可用的上一问对齐信息。",
  };
  const cumulativeCanvas = mergeSemanticCanvas(previousSnapshot?.conversationState.cumulativeCanvas, analysis.semanticCanvas);
  const readyToGenerate = shouldGenerateNow(analysis, turnCount);
  const rawSelectedPrompt = readyToGenerate
    ? "我已经有一个初步方向了，我们先进入第一轮看看。"
    : analysis.questionPlan?.selectedQuestion.prompt ?? buildFollowUpQuestion(analysis);
  const selectedPrompt = readyToGenerate
    ? rawSelectedPrompt
    : `${renderPersonaQuestionBridge({ analysis, goalState: analysis.intakeGoalState })} ${rawSelectedPrompt}`.trim();
  const currentUnderstanding = buildCumulativeUnderstanding({
    analysis,
    cumulativeCanvas,
    answerAlignment,
    turnCount,
  });
  const expertReply = buildExpertReply({
    source: "text",
    userText: signal.text.trim(),
    analysis,
    previousAnalysis: previousSnapshot?.analysis,
    currentUnderstanding,
    nextQuestion: selectedPrompt,
  });
  const nextQuestionHistory = analysis.agentState?.questionHistory ?? previousQuestionHistory;
  const conversationState: IntentConversationState = {
    turns: [
      ...(previousSnapshot?.conversationState.turns ?? []),
      {
        turnIndex: turnCount,
        replyText: signal.text.trim(),
        hitFields: analysis.hitFields,
        answerAlignment,
      },
    ],
    dialogue: [
      ...(previousSnapshot?.conversationState.dialogue ?? []),
      {
        id: `text-turn-${turnCount}`,
        turnIndex: turnCount,
        source: "text",
        userText: signal.text.trim(),
        expertReply,
        nextQuestion: selectedPrompt,
      },
    ],
    questionHistory: nextQuestionHistory,
    cumulativeCanvas,
    agentState: analysis.agentState,
    resolutionState: analysis.agentState?.resolutionState ?? analysis.questionResolutionState,
    lockedSlots: previousSnapshot?.conversationState.lockedSlots ?? {},
  };

  return {
    text,
    analysis,
    currentUnderstanding,
    followUpQuestion: selectedPrompt,
    expertReply,
    readyToGenerate,
    turnCount,
    canAskAnotherQuestion: !readyToGenerate && turnCount < HARD_TURN_CAP,
    conversationState,
  };
}

export function buildIntentStabilizationSnapshotFromAgentState(input: {
  previousSnapshot?: IntentUnderstandingSnapshot | null;
  previousText?: string;
  previousTurnCount?: number;
  currentAgentState: IntentIntakeAgentState;
  committedReplyText?: string;
  source?: "text" | "opening-selection";
}): IntentUnderstandingSnapshot {
  const turnCount = Math.min((input.previousTurnCount ?? 0) + 1, HARD_TURN_CAP);
  const analysis = buildDerivedEntryAnalysisFromAgentState(input.currentAgentState);
  const cumulativeCanvas = mergeSemanticCanvas(input.previousSnapshot?.conversationState.cumulativeCanvas, analysis.semanticCanvas);
  const readyToGenerate = shouldGenerateNow(analysis, turnCount);
  const committedText = input.committedReplyText?.trim() ?? "";
  const text = committedText ? joinUserTexts(input.previousText, committedText) : (input.previousText ?? "");
  const rawSelectedPrompt = readyToGenerate
    ? "我已经有一个初步方向了，我们先进入第一轮看看。"
    : buildFollowUpQuestion(analysis);
  const selectedPrompt = readyToGenerate
    ? rawSelectedPrompt
    : `${renderPersonaQuestionBridge({ analysis, goalState: analysis.intakeGoalState })} ${rawSelectedPrompt}`.trim();
  const answerAlignment = {
    status: "initial" as const,
    introducedFields: analysis.hitFields,
    note: "这一轮通过 opening 选项先建立了主方向。",
  };
  const currentUnderstanding = buildCumulativeUnderstanding({
    analysis,
    cumulativeCanvas,
    answerAlignment,
    turnCount,
  });
  const expertReply = buildExpertReply({
    source: input.source ?? "opening-selection",
    userText: committedText || "这次选择",
    analysis,
    previousAnalysis: input.previousSnapshot?.analysis,
    currentUnderstanding,
    nextQuestion: selectedPrompt,
  });

  return {
    text,
    analysis,
    currentUnderstanding,
    followUpQuestion: selectedPrompt,
    expertReply,
    readyToGenerate,
    turnCount,
    canAskAnotherQuestion: !readyToGenerate && turnCount < HARD_TURN_CAP,
    conversationState: {
      turns: [
        ...(input.previousSnapshot?.conversationState.turns ?? []),
        ...(committedText
          ? [{
              turnIndex: turnCount,
              replyText: committedText,
              hitFields: analysis.hitFields,
              answerAlignment,
            }]
          : []),
      ],
      dialogue: [
        ...(input.previousSnapshot?.conversationState.dialogue ?? []),
        ...(committedText
          ? [{
              id: `${input.source ?? "opening-selection"}-turn-${turnCount}`,
              turnIndex: turnCount,
              source: input.source ?? "opening-selection",
              userText: committedText,
              expertReply,
              nextQuestion: selectedPrompt,
            } satisfies ExpertDialogueTurn]
          : []),
      ],
      questionHistory: analysis.agentState?.questionHistory ?? input.previousSnapshot?.conversationState.questionHistory ?? [],
      cumulativeCanvas,
      resolutionState: analysis.agentState?.resolutionState ?? analysis.questionResolutionState,
      agentState: analysis.agentState,
      lockedSlots: input.previousSnapshot?.conversationState.lockedSlots ?? {},
    },
  };
}

export type { IntentUnderstandingSnapshot };
