import {
  buildDerivedEntryAnalysisFromAgentState,
  type ComparisonCandidate,
  type CompositionProposal,
  type EntryAgentResult,
  type FuliSemanticCanvas,
  type FrontstageResponsePlan,
  type HighValueField,
  type IntakeMacroSlot,
  type IntentIntakeAgentState,
  type IntentIntakeGoalState,
  type QuestionTrace,
  type RefinementPrompt,
  type TextIntakeSignal,
} from "@/features/entryAgent";
import { processIntakeSignal } from "@/features/entryAgent/signalProcessor";
import { renderPersonaUnderstanding } from "./personaRenderer";
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
  source: "text" | "opening-selection" | "comparison-selection";
  userText: string;
  expertReply: string;
  nextQuestion: string;
}

interface IntentUnderstandingSnapshot {
  text: string;
  analysis: EntryAgentResult;
  replySnapshot: string;
  optionalDomainCheck?: string;
  compositionProposals: CompositionProposal[];
  refinementPrompt?: RefinementPrompt;
  /** Whether the snapshot is rendered from frontstageResponsePlan rather than legacy displayPlan. */
  usesFrontstagePlan: boolean;
  comparisonCandidates: ComparisonCandidate[];
  currentUnderstanding: string;
  followUpQuestion?: string;
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

function getEffectiveFrontstagePlan(analysis: EntryAgentResult): FrontstageResponsePlan | undefined {
  if (analysis.frontstageResponsePlan) {
    return analysis.frontstageResponsePlan;
  }

  const comparisonCandidates = analysis.displayPlan?.comparisonCandidates ?? [];
  const followUpQuestion = analysis.displayPlan?.whetherToAskQuestion
    ? analysis.displayPlan.followUpQuestion ?? analysis.questionPlan?.selectedQuestion.prompt ?? buildFollowUpQuestion(analysis)
    : undefined;

  return {
    replySnapshot: analysis.displayPlan?.replySnapshot ?? buildSnapshotSentence({ analysis }),
    compositionProposals: comparisonCandidates.map((candidate, index) => ({
      id: candidate.id,
      title: `方向 ${index + 1}`,
      summary: candidate.curatedDisplayText,
      dominantHandles: [candidate.intendedSplitDimension],
      blendNotes: [candidate.semanticDeltaHint],
    })),
    refinementPrompt: followUpQuestion
      ? {
          mode: "nudge",
          text: followUpQuestion,
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle"],
        }
      : {
          mode: "nudge",
          text: "你可以告诉我更像哪种，也可以说哪一层该再轻一点。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle"],
        },
  };
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

function trimQuestionPrompt(prompt: string) {
  return prompt
    .replace(/“?\w+Tendency”?/g, "")
    .replace(/如果先挂到[^，。]*这一层，?/g, "")
    .replace(/如果先不谈细节，?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCue(canvas: FuliSemanticCanvas | undefined, cues: string[]) {
  const text = [
    ...(canvas?.rawCues ?? []),
    ...(canvas?.narrativePolicy.mustPreserve ?? []),
    ...(canvas?.designTranslations.colorIdentity ?? []),
    ...(canvas?.designTranslations.impressionTone ?? []),
  ].join(" ");
  return cues.some((cue) => text.includes(cue));
}

function hasCumulativeTextCue(analysis: EntryAgentResult, canvas: FuliSemanticCanvas | undefined, cues: string[]) {
  const cumulativeText = analysis.agentState?.cumulativeText ?? "";
  return hasCue(canvas, cues) || cues.some((cue) => cumulativeText.includes(cue));
}

function dedupeByStem(parts: string[]) {
  const stems = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const stem = part.replace(/[，。、“”\s]/g, "");
    if (stems.has(stem)) continue;
    stems.add(stem);
    result.push(part);
  }

  return result;
}

function describePatternKeyElement(keyElement: string | undefined) {
  if (keyElement === "cloud-mist") return "图案像雾气一样轻轻铺开";
  if (keyElement === "botanical") return "图案像枝影一样疏一点";
  if (keyElement === "water-wave") return "图案带一点水纹流线";
  if (keyElement === "light-trace") return "图案像灯影一样留下痕迹";
  if (keyElement === "stone-texture") return "图案有一点石面肌理";
  if (keyElement === "landscape") return "图案更像抽象地貌在铺开";
  if (keyElement === "floral") return "图案留一点花叶意味";
  return undefined;
}

function describeImpression(analysis: EntryAgentResult) {
  const impressionSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "impression");
  const topDirection = impressionSlot?.topDirection ?? analysis.provisionalStateHints.impression;

  if (topDirection === "calm") return "整体安静、收着";
  if (topDirection === "presence" || topDirection === "energetic") return "整体不会太弱，会留一点存在感";
  if (topDirection === "warm") return "整体更温润一些";
  if (topDirection === "soft") return "整体更柔和一些";
  return undefined;
}

function describeColor(analysis: EntryAgentResult) {
  const colorSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "color");
  const topDirection = colorSlot?.topDirection ?? analysis.provisionalStateHints.colorMood;

  if (topDirection === "restrained" || topDirection === "muted") return "颜色不太跳";
  if (topDirection === "warm") return "颜色带一点暖意";
  if (topDirection === "earthy") return "颜色更自然温和";
  if (topDirection === "spring-green" || topDirection === "spring-green-subtle") return "颜色轻轻透一点绿意";
  if (topDirection === "cool") return "颜色偏冷净";
  return undefined;
}

function describePattern(analysis: EntryAgentResult) {
  const patternSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern");
  const patternIntent = patternSlot?.patternIntent;
  const keyElementDescription = describePatternKeyElement(patternIntent?.keyElement);
  if (keyElementDescription) {
    return keyElementDescription;
  }

  if (patternIntent?.renderingMode === "suggestive") {
    return "图案不太实，更像轻轻带到";
  }

  if (patternSlot?.topDirection === "abstract") {
    return "图案不会太实，会更抽象一点";
  }

  return undefined;
}

function describeArrangement(analysis: EntryAgentResult) {
  const arrangementSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "arrangement");
  const topDirection = arrangementSlot?.topDirection;

  if (topDirection === "open") return "排布更松一点";
  if (topDirection === "ordered") return "排布会更整齐一点";
  return undefined;
}

function describeResolutionCarryover(analysis: EntryAgentResult, cumulativeCanvas?: FuliSemanticCanvas) {
  const families = Object.values(analysis.questionResolutionState?.families ?? {}).sort((left, right) => right.sourceTurn - left.sourceTurn);
  const baseParts: string[] = [];
  const accentParts: string[] = [];

  for (const resolution of families) {
    if (resolution.chosenBranch === "flow") {
      accentParts.push("图案带一点水汽走势的轻流线");
    } else if (resolution.chosenBranch === "fog") {
      accentParts.push("图案更像雾气一样轻轻铺开");
    } else if (resolution.chosenBranch === "calm") {
      baseParts.push("整体偏安静、克制");
    } else if (resolution.chosenBranch === "presence") {
      baseParts.push("整体不会太弱，还能被感觉到一点");
    } else if (resolution.chosenBranch === "open") {
      accentParts.push("排布更松，像自然散开");
    } else if (resolution.chosenBranch === "ordered") {
      accentParts.push("排布会更整齐一些");
    } else if (resolution.chosenBranch === "muted") {
      baseParts.push("颜色会更收一点");
    } else if (resolution.chosenBranch === "warm") {
      accentParts.push("颜色里会带一点暖意");
    }
  }

  if (hasCumulativeTextCue(analysis, cumulativeCanvas, ["自然"]) && !baseParts.some((part) => part.includes("自然"))) {
    baseParts.unshift("整体自然、不太修饰");
  }

  if (hasCumulativeTextCue(analysis, cumulativeCanvas, ["烟雨三月", "烟雨"]) && !baseParts.some((part) => part.includes("湿润"))) {
    baseParts.push("气氛偏湿润");
  }

  if (hasCumulativeTextCue(analysis, cumulativeCanvas, ["灯火", "夜色", "暮色"]) && !accentParts.some((part) => part.includes("暖"))) {
    accentParts.push("里面留一点夜里的温度");
  }

  if (hasCumulativeTextCue(analysis, cumulativeCanvas, ["月白"]) && !baseParts.some((part) => part.includes("轻、偏净"))) {
    baseParts.push("底子偏轻、偏净");
  }

  return dedupeByStem([...baseParts, ...accentParts]);
}

function buildSnapshotCore(input: {
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
}) {
  const parts = dedupeByStem(unique([
    ...describeResolutionCarryover(input.analysis, input.cumulativeCanvas),
    describeImpression(input.analysis),
    describeColor(input.analysis),
    describePattern(input.analysis),
    describeArrangement(input.analysis),
  ].filter((item): item is string => Boolean(item))));

  if (parts.length > 0) {
    return parts.slice(0, 3).join("，");
  }

  const cue = input.analysis.semanticCanvas?.rawCues[0] ?? input.cumulativeCanvas?.rawCues[0];
  if (cue) {
    return `${cue} 这层感觉已经有了，只是还差一个更具体的画面`;
  }

  return "方向已经有了一个轮廓，但还差最后一个关键判断";
}

function buildSnapshotSentence(input: {
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
}) {
  return `我现在会先把它看成：${buildSnapshotCore(input)}。`;
}

function buildChoiceInterpretationSentence(input: {
  userText: string;
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
}) {
  return `好，那我会先把它定在${buildSnapshotCore({
    analysis: input.analysis,
    cumulativeCanvas: input.cumulativeCanvas,
  })}这条线上。`;
}

function buildChoiceEffectSentence(analysis: EntryAgentResult) {
  const focus = analysis.questionPlan?.selectedTargetField;
  if (focus === "overallImpression") {
    return "这意味着整体气质会先稳下来，而不是急着把图案做实。";
  }
  if (focus === "colorMood") {
    return "这意味着颜色会先定调，而不是先把视觉存在感往前推。";
  }
  if (focus === "patternTendency") {
    return "这意味着图案语言会先被收清，而不是只停在一个抽象氛围里。";
  }
  if (focus === "arrangementTendency") {
    return "这意味着画面节奏会先被定下来，而不是让排布继续模糊着。";
  }
  return "这会让后面的判断更集中，不会几条线一起发散。";
}

function buildQuestionConsequence(analysis: EntryAgentResult) {
  const familyId = analysis.questionPlan?.selectedQuestion?.questionFamilyId;
  if (familyId === "colorMood:poetic-fog-vs-flow") {
    return "这两个方向最后出来，一个更朦胧，一个更有流动方向。";
  }
  if (familyId === "overallImpression:contrast-calm-vs-presence") {
    return "这会直接影响它最后是更安静地融进去，还是更有一点被看见。";
  }
  if (familyId === "patternTendency:contrast-complexity-vs-geometry") {
    return "这会直接影响最后它更像自然铺开的纹样，还是更有明确骨架。";
  }
  if (familyId === "arrangementTendency:contrast-open-vs-ordered") {
    return "这两个方向最后出来，一个更松，一个更有秩序。";
  }

  const focus = analysis.questionPlan?.selectedTargetField;
  if (focus === "patternTendency") {
    return "这会直接影响图案最后是轻轻带到，还是更有骨架。";
  }
  if (focus === "colorMood") {
    return "这会直接影响最后它更偏气息，还是更偏被看见。";
  }
  return undefined;
}

function buildQuestionLead(input: {
  analysis: EntryAgentResult;
  answerAlignment?: AnswerAlignment;
}) {
  if (input.answerAlignment?.status === "answered" || input.answerAlignment?.status === "partial") {
    return "接下来我想先确认：";
  }

  const familyId = input.analysis.questionPlan?.selectedQuestion?.questionFamilyId;
  if (familyId === "colorMood:poetic-fog-vs-flow") {
    return "这里真正要分清的是：";
  }

  return "接下来我想先确认：";
}

function buildExpertReply(input: {
  source: "text" | "opening-selection" | "comparison-selection";
  userText: string;
  analysis: EntryAgentResult;
  cumulativeCanvas?: FuliSemanticCanvas;
  answerAlignment?: AnswerAlignment;
  frontstagePlan?: FrontstageResponsePlan;
  fallbackQuestion?: string;
}) {
  const frontstagePlan = input.frontstagePlan ?? getEffectiveFrontstagePlan(input.analysis);
  const nextQuestion = frontstagePlan?.refinementPrompt?.text
    ? trimQuestionPrompt(frontstagePlan.refinementPrompt.text)
    : input.fallbackQuestion
      ? trimQuestionPrompt(input.fallbackQuestion)
      : undefined;
  const domainCheck = frontstagePlan?.optionalDomainCheck?.trim();
  const lines =
    input.source !== "text"
      ? [
          frontstagePlan?.replySnapshot ?? buildChoiceInterpretationSentence({
            userText: input.userText,
            analysis: input.analysis,
            cumulativeCanvas: input.cumulativeCanvas,
          }),
          buildChoiceEffectSentence(input.analysis),
          domainCheck,
          nextQuestion ? `我现在只想先确认这一件事：${nextQuestion}` : undefined,
        ].filter((item): item is string => Boolean(item))
      : [
          frontstagePlan?.replySnapshot ?? buildSnapshotSentence({
            analysis: input.analysis,
            cumulativeCanvas: input.cumulativeCanvas,
          }),
          domainCheck,
          nextQuestion
            ? `${buildQuestionLead({
                analysis: input.analysis,
                answerAlignment: input.answerAlignment,
              })}${nextQuestion}`
            : undefined,
          nextQuestion ? buildQuestionConsequence(input.analysis) : undefined,
        ].filter((item): item is string => Boolean(item));

  return lines.join(" ");
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
  const frontstagePlan = getEffectiveFrontstagePlan(analysis);
  const usesFrontstagePlan = Boolean(analysis.frontstageResponsePlan);
  const selectedPrompt =
    frontstagePlan?.refinementPrompt.text ??
    analysis.displayPlan?.followUpQuestion ??
    analysis.questionPlan?.selectedQuestion.prompt ??
    buildFollowUpQuestion(analysis);
  const replySnapshot = frontstagePlan?.replySnapshot ?? buildSnapshotSentence({
    analysis,
    cumulativeCanvas,
  });
  const optionalDomainCheck = frontstagePlan?.optionalDomainCheck;
  const compositionProposals = frontstagePlan?.compositionProposals ?? [];
  const refinementPrompt = frontstagePlan?.refinementPrompt;
  const comparisonCandidates = analysis.displayPlan?.comparisonCandidates ?? [];
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
    cumulativeCanvas,
    answerAlignment,
    frontstagePlan,
    fallbackQuestion: analysis.displayPlan?.whetherToAskQuestion ? selectedPrompt : undefined,
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
    replySnapshot,
    optionalDomainCheck,
    compositionProposals,
    refinementPrompt,
    usesFrontstagePlan,
    comparisonCandidates,
    currentUnderstanding,
    followUpQuestion: refinementPrompt?.text ?? (analysis.displayPlan?.whetherToAskQuestion ? selectedPrompt : undefined),
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
  source?: "text" | "opening-selection" | "comparison-selection";
}): IntentUnderstandingSnapshot {
  const turnCount = Math.min((input.previousTurnCount ?? 0) + 1, HARD_TURN_CAP);
  const analysis = buildDerivedEntryAnalysisFromAgentState(input.currentAgentState);
  const cumulativeCanvas = mergeSemanticCanvas(input.previousSnapshot?.conversationState.cumulativeCanvas, analysis.semanticCanvas);
  const readyToGenerate = shouldGenerateNow(analysis, turnCount);
  const committedText = input.committedReplyText?.trim() ?? "";
  const text = committedText ? joinUserTexts(input.previousText, committedText) : (input.previousText ?? "");
  const frontstagePlan = getEffectiveFrontstagePlan(analysis);
  const usesFrontstagePlan = Boolean(analysis.frontstageResponsePlan);
  const selectedPrompt =
    frontstagePlan?.refinementPrompt.text ??
    analysis.displayPlan?.followUpQuestion ??
    analysis.questionPlan?.selectedQuestion.prompt ??
    buildFollowUpQuestion(analysis);
  const answerAlignment = {
    status: "initial" as const,
    introducedFields: analysis.hitFields,
    note: "这一轮通过 opening 选项先建立了主方向。",
  };
  const replySnapshot = frontstagePlan?.replySnapshot ?? buildSnapshotSentence({
    analysis,
    cumulativeCanvas,
  });
  const optionalDomainCheck = frontstagePlan?.optionalDomainCheck;
  const compositionProposals = frontstagePlan?.compositionProposals ?? [];
  const refinementPrompt = frontstagePlan?.refinementPrompt;
  const comparisonCandidates = analysis.displayPlan?.comparisonCandidates ?? [];
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
    cumulativeCanvas,
    answerAlignment,
    frontstagePlan,
    fallbackQuestion: analysis.displayPlan?.whetherToAskQuestion ? selectedPrompt : undefined,
  });

  return {
    text,
    analysis,
    replySnapshot,
    optionalDomainCheck,
    compositionProposals,
    refinementPrompt,
    usesFrontstagePlan,
    comparisonCandidates,
    currentUnderstanding,
    followUpQuestion: refinementPrompt?.text ?? (analysis.displayPlan?.whetherToAskQuestion ? selectedPrompt : undefined),
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
