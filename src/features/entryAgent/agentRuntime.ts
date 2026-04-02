import { analyzeEntryText } from "./index";
import { applyOpeningSelectionToAgentState } from "./openingOptionDelta";
import type {
  AgentNextAction,
  AgentStateUpdateSource,
  EntryAgentResult,
  EntryAgentSlotKey,
  HighValueField,
  IntakeMacroSlot,
  IntakePhase,
  IntentIntakeAgentState,
  IntentSemanticMapping,
  IntakeSignal,
  MacroSlotState,
  MacroSlotStatus,
  MacroSlotTrend,
  QuestionTrace,
  RawCue,
  SlotDirectionCandidate,
  SlotStateStatus,
  TextIntakeSignal,
} from "./types";

const MACRO_SLOTS: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement", "space"];
const AFFIRM_LOCK_CUES = ["可以", "可以先这样", "好", "好的", "行", "对", "是的", "嗯", "就这个", "就按这个", "先按这个", "先这样"];
const REOPEN_LOCK_CUES = ["不是这个", "不按这个", "不要这个", "先别锁", "别锁", "再看看", "换个方向", "换一换", "想改", "重新", "不确定"];
const SLOT_KEYWORDS: Record<IntakeMacroSlot, string[]> = {
  impression: ["氛围", "感觉", "气质", "整体", "安静", "存在感"],
  color: ["颜色", "色彩", "暖", "冷", "淡", "跳"],
  pattern: ["图案", "花", "纹样", "荷花", "几何", "自然"],
  arrangement: ["排布", "留白", "松", "密", "整齐", "秩序"],
  space: ["空间", "卧室", "客厅", "书房", "办公室"],
};

function joinUserTexts(previousText: string | undefined, nextText: string) {
  const trimmedNext = nextText.trim();
  if (!previousText?.trim()) return trimmedNext;
  if (!trimmedNext) return previousText.trim();
  return `${previousText.trim()}\n${trimmedNext}`;
}

function normalizeText(text: string | undefined) {
  return (text ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function mapMacroSlotToField(slot: IntakeMacroSlot): HighValueField | undefined {
  if (slot === "impression") return "overallImpression";
  if (slot === "color") return "colorMood";
  if (slot === "pattern") return "patternTendency";
  if (slot === "arrangement") return "arrangementTendency";
  if (slot === "space") return "spaceContext";
  return undefined;
}

function mapFieldToMacroSlot(field: HighValueField | undefined): IntakeMacroSlot | undefined {
  if (field === "overallImpression") return "impression";
  if (field === "colorMood") return "color";
  if (field === "patternTendency") return "pattern";
  if (field === "arrangementTendency") return "arrangement";
  if (field === "spaceContext") return "space";
  return undefined;
}

function mapEntrySlotToMacroSlot(slot: EntryAgentSlotKey | undefined): IntakeMacroSlot | undefined {
  if (slot === "impression") return "impression";
  if (slot === "color") return "color";
  if (slot === "motif") return "pattern";
  if (slot === "arrangement") return "arrangement";
  return undefined;
}

function isCriticalSlot(slot: IntakeMacroSlot) {
  return slot === "impression" || slot === "color" || slot === "pattern" || slot === "arrangement";
}

function isTextAffirmingLock(text: string) {
  return AFFIRM_LOCK_CUES.some((cue) => text.includes(cue));
}

function isTextReopeningLock(text: string) {
  return REOPEN_LOCK_CUES.some((cue) => text.includes(cue));
}

function mentionsSlot(text: string, slot: IntakeMacroSlot, direction?: string) {
  if (direction && text.includes(direction.toLowerCase())) {
    return true;
  }
  return SLOT_KEYWORDS[slot].some((cue) => text.includes(cue));
}

function buildQuestionTraceFromAnalysis(
  analysis: EntryAgentResult,
  turnIndex: number,
): QuestionTrace | undefined {
  const selectedQuestion = analysis.questionPlan?.selectedQuestion;
  if (!selectedQuestion) {
    return undefined;
  }

  return {
    turnIndex,
    prompt: selectedQuestion.prompt,
    targetField: selectedQuestion.targetField,
    targetSlot: selectedQuestion.targetSlot,
    targetAxes: selectedQuestion.targetAxes,
    gapId: selectedQuestion.resolvesGapIds[0],
    questionMode: selectedQuestion.questionMode,
    questionIntent: selectedQuestion.questionIntent,
    questionFamilyId: selectedQuestion.questionFamilyId,
  };
}

function mapSlotPhaseToStatus(phase: string | undefined): MacroSlotStatus {
  if (phase === "lock-candidate") return "lock-candidate";
  if (phase === "base-captured") return "base-ready";
  if (phase === "hinted") return "hinted";
  return "empty";
}

function mapMacroSlotStatusToLegacy(status: MacroSlotStatus): SlotStateStatus {
  if (status === "empty") return "unknown";
  if (status === "hinted") return "weak-signal";
  if (status === "base-ready") return "tentative";
  return "locked";
}

function deriveLegacySlotStates(currentState: IntentIntakeAgentState | undefined) {
  return (currentState?.slots ?? []).reduce<Partial<Record<HighValueField, SlotStateStatus>>>((acc, slot) => {
    const field = mapMacroSlotToField(slot.slot);
    if (field) {
      acc[field] = mapMacroSlotStatusToLegacy(slot.status);
    }
    return acc;
  }, {});
}

function dedupeCandidates(candidates: SlotDirectionCandidate[]) {
  const merged = new Map<string, SlotDirectionCandidate>();
  for (const candidate of candidates) {
    const existing = merged.get(candidate.label);
    if (!existing || candidate.score > existing.score) {
      merged.set(candidate.label, candidate);
    }
  }
  return [...merged.values()].sort((left, right) => right.score - left.score).slice(0, 3);
}

function isReadingForSlot(
  item: EntryAgentResult["interpretationMerge"]["finalResolvedReadings"][number] | undefined,
  slot: IntakeMacroSlot,
): item is EntryAgentResult["interpretationMerge"]["finalResolvedReadings"][number] {
  return item !== undefined && mapFieldToMacroSlot(item.field) === slot;
}

function collectCandidatesForSlot(analysis: EntryAgentResult, slot: IntakeMacroSlot): SlotDirectionCandidate[] {
  const candidates: SlotDirectionCandidate[] = [];

  for (const direction of analysis.semanticUnderstanding.confirmedDirections) {
    const relatedReadings = direction.sourceReadingIds
      .map((readingId) => analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === readingId))
      .filter((item) => isReadingForSlot(item, slot));
    if (relatedReadings.length === 0) continue;
    candidates.push({
      label: direction.label,
      score: direction.confidence,
      evidence: relatedReadings.flatMap((item) => item.matchedCues).slice(0, 3),
      sourceReadingIds: direction.sourceReadingIds,
    });
  }

  for (const reading of analysis.semanticUnderstanding.activeReadings) {
    const fullReading = analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === reading.readingId);
    if (!fullReading || mapFieldToMacroSlot(fullReading.field) !== slot) continue;
    candidates.push({
      label: reading.label,
      score: reading.confidence,
      evidence: fullReading.matchedCues.slice(0, 3),
      sourceReadingIds: [reading.readingId],
    });
  }

  const openGap = analysis.semanticGaps.find((gap) => mapFieldToMacroSlot(gap.targetField) === slot);
  if (candidates.length === 0 && openGap) {
    candidates.push({
      label: openGap.reason,
      score: 0.2,
      evidence: openGap.evidence.slice(0, 3),
      sourceReadingIds: [],
    });
  }

  return dedupeCandidates(candidates);
}

function mapMacroSlotToOpportunitySlot(slot: IntakeMacroSlot | undefined): "impression" | "color" | "patternIntent" | "arrangement" | "space" | "presence" {
  if (slot === "pattern") return "patternIntent";
  if (slot === "impression" || slot === "color" || slot === "arrangement" || slot === "space") return slot;
  return "presence";
}

function computeRecentTrend(input: {
  analysis: EntryAgentResult;
  slot: IntakeMacroSlot;
  topScore: number;
  previousSlot?: MacroSlotState;
}): MacroSlotTrend {
  if (input.analysis.semanticGaps.some((gap) => gap.type === "prototype-conflict" && mapFieldToMacroSlot(gap.targetField) === input.slot)) {
    return "conflicted";
  }

  const previousScore = input.previousSlot?.topScore ?? 0;
  const delta = input.topScore - previousScore;
  if (delta >= 0.08) return "strengthening";
  if (delta <= -0.08) return "weakening";
  return "stable";
}

function buildMacroSlotState(input: {
  slot: IntakeMacroSlot;
  analysis: EntryAgentResult;
  previousSlot?: MacroSlotState;
  updatedBy: AgentStateUpdateSource;
}): MacroSlotState {
  const progress = input.analysis.intakeGoalState?.slots.find((item) => item.slot === input.slot);
  const shouldReusePrevious =
    Boolean(input.previousSlot) &&
    (progress?.topScore ?? 0) < input.previousSlot!.topScore &&
    input.previousSlot!.topScore >= 0.5;
  const effectiveProgress = shouldReusePrevious
    ? {
        topDirection: input.previousSlot?.topDirection,
        topScore: input.previousSlot?.topScore,
        supportingSignals: input.previousSlot?.supportingSignals ?? [],
        phase:
          input.previousSlot?.status === "soft-locked" || input.previousSlot?.status === "lock-candidate"
            ? "lock-candidate"
            : input.previousSlot?.status === "base-ready"
              ? "base-captured"
              : input.previousSlot?.status === "hinted"
                ? "hinted"
                : "empty",
        patternIntent: input.previousSlot?.patternIntent,
      }
    : progress;
  const status = input.previousSlot?.status === "soft-locked"
    ? "soft-locked"
    : mapSlotPhaseToStatus(effectiveProgress?.phase);
  const topCandidates = collectCandidatesForSlot(input.analysis, input.slot);
  const topDirection = effectiveProgress?.topDirection ?? topCandidates[0]?.label;
  const topScore = Number((effectiveProgress?.topScore ?? topCandidates[0]?.score ?? 0).toFixed(2));
  const questionFamilyIds = input.analysis.semanticGaps
    .filter((gap) => mapFieldToMacroSlot(gap.targetField) === input.slot && gap.questionFamilyId)
    .map((gap) => gap.questionFamilyId as string);

  return {
    slot: input.slot,
    status,
    topCandidates,
    recentTrend: computeRecentTrend({
      analysis: input.analysis,
      slot: input.slot,
      topScore,
      previousSlot: input.previousSlot,
    }),
    lastUpdatedBy: input.updatedBy,
    openBranches: input.analysis.semanticGaps
      .filter((gap) => mapFieldToMacroSlot(gap.targetField) === input.slot)
      .map((gap) => gap.reason)
      .slice(0, 3),
    questionFamilyIds,
    topDirection,
    topScore,
    supportingSignals: effectiveProgress?.supportingSignals ?? topCandidates[0]?.evidence ?? [],
    patternIntent: effectiveProgress?.patternIntent,
  };
}

function applySoftLockTransitions(input: {
  slots: MacroSlotState[];
  currentState: IntentIntakeAgentState;
  latestReplyText: string;
}): MacroSlotState[] {
  const normalizedReply = normalizeText(input.latestReplyText);
  if (!normalizedReply) {
    return input.slots;
  }

  const pendingConfirmationSlot = input.currentState.nextAction?.type === "request-slot-confirmation"
    ? input.currentState.nextAction.targetSlot
    : input.currentState.goalState?.pendingConfirmations[0]?.slot;

  return input.slots.map((slot) => {
    const shouldHandlePendingConfirmation = pendingConfirmationSlot === slot.slot;

    if (shouldHandlePendingConfirmation && isTextAffirmingLock(normalizedReply)) {
      return {
        ...slot,
        status: "soft-locked",
        recentTrend: "stable",
        lastUpdatedBy: "text",
        openBranches: [],
      };
    }

    if (shouldHandlePendingConfirmation && isTextReopeningLock(normalizedReply)) {
      return {
        ...slot,
        status: slot.topScore >= 0.5 ? "base-ready" : "hinted",
        recentTrend: "weakening",
        lastUpdatedBy: "text",
      };
    }

    if (
      slot.status === "soft-locked" &&
      isTextReopeningLock(normalizedReply) &&
      (mentionsSlot(normalizedReply, slot.slot, slot.topDirection) || input.currentState.nextAction?.targetSlot === slot.slot)
    ) {
      return {
        ...slot,
        status: slot.topScore >= 0.5 ? "base-ready" : "hinted",
        recentTrend: "weakening",
        lastUpdatedBy: "text",
      };
    }

    return slot;
  });
}

function syncGoalStateAfterTransitions(input: {
  goalState: EntryAgentResult["intakeGoalState"] | undefined;
  slots: MacroSlotState[];
}): EntryAgentResult["intakeGoalState"] | undefined {
  if (!input.goalState) {
    return input.goalState;
  }

  const lockCandidateSlots = new Set(input.slots.filter((slot) => slot.status === "lock-candidate").map((slot) => slot.slot));
  return {
    ...input.goalState,
    pendingConfirmations: input.goalState.pendingConfirmations.filter((confirmation) => lockCandidateSlots.has(confirmation.slot)),
  };
}

function scoreSlotForNextAction(slot: MacroSlotState, goalState: IntentIntakeAgentState["goalState"]): number {
  if (slot.status === "soft-locked") return -100;

  let score = 0;
  if (slot.recentTrend === "conflicted") score += 40;
  if (slot.openBranches.length > 0) score += Math.min(18, slot.openBranches.length * 6);
  if (slot.recentTrend === "weakening") score += 12;
  if (slot.recentTrend === "strengthening") score += 6;

  if (slot.status === "empty") score += isCriticalSlot(slot.slot) ? 28 : 14;
  if (slot.status === "hinted") score += isCriticalSlot(slot.slot) ? 22 : 10;
  if (slot.status === "base-ready") score += slot.recentTrend === "conflicted" ? 14 : 4;
  if (slot.status === "lock-candidate") score += 8;

  if (goalState?.missingSlots.includes(slot.slot)) {
    score += isCriticalSlot(slot.slot) ? 24 : 10;
  }

  return score;
}

function scoreSlotWithSemanticMapping(agentState: IntentIntakeAgentState, slot: MacroSlotState): number {
  const baseScore = scoreSlotForNextAction(slot, agentState.goalState);
  const mapping = agentState.latestSemanticMapping;
  if (!mapping) {
    return baseScore;
  }

  const missingBonus = mapping.confidenceSummary.missingCriticalSlots.includes(slot.slot) ? 12 : 0;
  const baseReadyPenalty = mapping.confidenceSummary.baseReadySlots.includes(slot.slot) ? -10 : 0;
  const openQuestionCount =
    slot.slot === "impression"
      ? (mapping.slotHypotheses.impression?.openQuestions.length ?? 0)
      : slot.slot === "color"
        ? (mapping.slotHypotheses.color?.openQuestions.length ?? 0)
        : slot.slot === "pattern"
          ? (mapping.slotHypotheses.patternIntent?.openQuestions.length ?? 0)
          : slot.slot === "arrangement"
            ? (mapping.slotHypotheses.arrangement?.openQuestions.length ?? 0)
            : (mapping.slotHypotheses.space?.evidence.length ?? 0);

  return baseScore + missingBonus + baseReadyPenalty + Math.min(10, openQuestionCount * 3);
}

function pickCandidateFromAgentState(agentState: IntentIntakeAgentState) {
  const candidates = agentState.latestAnalysis?.questionCandidates ?? [];
  if (candidates.length === 0) {
    return undefined;
  }

  const slotScores = new Map<IntakeMacroSlot, number>(
    agentState.slots.map((slot) => [slot.slot, scoreSlotWithSemanticMapping(agentState, slot)]),
  );

  return [...candidates]
    .map((candidate) => {
      const targetSlot = mapEntrySlotToMacroSlot(candidate.targetSlot) ?? mapFieldToMacroSlot(candidate.targetField);
      const slotScore = targetSlot ? (slotScores.get(targetSlot) ?? 0) : 0;
      const openBranchBonus = targetSlot
        ? (agentState.slots.find((slot) => slot.slot === targetSlot)?.openBranches.length ?? 0) * 2
        : 0;
      const gainBonus = Math.max(0, Math.round(candidate.priority / 8));
      return {
        candidate,
        score: slotScore + openBranchBonus + gainBonus,
      };
    })
    .sort((left, right) => right.score - left.score)[0]?.candidate;
}

function derivePhase(state: {
  slots: MacroSlotState[];
  goalState?: EntryAgentResult["intakeGoalState"];
  turnIndex: number;
}): IntakePhase {
  if (state.slots.some((slot) => slot.status === "soft-locked")) return "soft-locked";
  if (state.goalState?.pendingConfirmations.length) return "awaiting-slot-confirmation";
  if (state.goalState?.readyForFirstGeneration) return "ready-for-first-generation";
  if (state.turnIndex > 0) return "text-intake-active";
  return "idle";
}

function inferCueType(text: string): RawCue["cueType"] {
  if (/(别|不要|别太|不要太)/.test(text)) return "negative-boundary";
  if (/(卧室|客厅|书房|办公室|会议室)/.test(text)) return "spatial";
  if (/(像|仿佛|好像|风中|若有若无)/.test(text)) return "metaphoric";
  if (/(更|一点|还是)/.test(text)) return "comparative";
  if (/(存在感|抢|轻|重)/.test(text)) return "visual-weight";
  return "explicit";
}

function determineDominantEntryPoint(analysis: EntryAgentResult): IntentSemanticMapping["interpretedIntent"]["dominantEntryPoint"] {
  if (analysis.hitFields.includes("spaceContext")) return "space";
  if (analysis.hitFields.includes("patternTendency")) return "pattern-intent";
  if (analysis.hitFields.includes("colorMood")) return "color";
  if (analysis.hitFields.includes("overallImpression")) return "mood";
  if ((analysis.semanticCanvas?.poeticSignal?.presence?.focalness ?? 0) > 0.5) return "presence";
  return "presence";
}

export function buildIntentSemanticMappingFromAgentState(agentState: IntentIntakeAgentState): IntentSemanticMapping {
  const impressionSlot = agentState.slots.find((slot) => slot.slot === "impression");
  const colorSlot = agentState.slots.find((slot) => slot.slot === "color");
  const patternSlot = agentState.slots.find((slot) => slot.slot === "pattern");
  const arrangementSlot = agentState.slots.find((slot) => slot.slot === "arrangement");
  const spaceSlot = agentState.slots.find((slot) => slot.slot === "space");

  return {
    rawCues: [],
    interpretedIntent: {
      dominantEntryPoint:
        (patternSlot?.topScore ?? 0) >= Math.max(impressionSlot?.topScore ?? 0, colorSlot?.topScore ?? 0)
          ? "pattern-intent"
          : (colorSlot?.topScore ?? 0) >= (impressionSlot?.topScore ?? 0)
            ? "color"
            : "mood",
      summary: agentState.slots
        .filter((slot) => slot.topDirection)
        .slice(0, 3)
        .map((slot) => `${slot.slot}:${slot.topDirection}`)
        .join(" · "),
      designReading: agentState.slots.flatMap((slot) => slot.openBranches).slice(0, 6),
      metaphorNotes: [],
    },
    slotHypotheses: {
      impression: impressionSlot
        ? {
            topDirections: impressionSlot.topCandidates.map((candidate) => ({
              label: candidate.label,
              score: candidate.score,
              evidence: candidate.evidence,
            })),
            openQuestions: impressionSlot.openBranches,
          }
        : undefined,
      color: colorSlot
        ? {
            evidence: colorSlot.supportingSignals,
            openQuestions: colorSlot.openBranches,
          }
        : undefined,
      patternIntent: patternSlot
        ? {
            subject: patternSlot.patternIntent?.keyElement
              ? { candidates: [{ label: patternSlot.patternIntent.keyElement, score: patternSlot.topScore, evidence: patternSlot.supportingSignals }] }
              : undefined,
            rendering: patternSlot.patternIntent?.renderingMode
              ? { top: patternSlot.patternIntent.renderingMode, score: patternSlot.topScore }
              : undefined,
            abstractionPreference: patternSlot.patternIntent
              ? { top: patternSlot.patternIntent.abstractionPreference, score: patternSlot.topScore }
              : undefined,
            compositionFeeling: patternSlot.patternIntent?.motionFeeling
              ? { tags: [patternSlot.patternIntent.motionFeeling], score: patternSlot.topScore }
              : undefined,
            evidence: patternSlot.supportingSignals,
            openQuestions: patternSlot.openBranches,
          }
        : undefined,
      arrangement: arrangementSlot
        ? {
            evidence: arrangementSlot.supportingSignals,
            openQuestions: arrangementSlot.openBranches,
          }
        : undefined,
      space: spaceSlot
        ? {
            usageMode: spaceSlot.topDirection ? { tags: [spaceSlot.topDirection], score: spaceSlot.topScore } : undefined,
            evidence: spaceSlot.supportingSignals,
          }
        : undefined,
      presence: { evidence: [], openQuestions: [] },
    },
    questionOpportunities: [],
    resolutionHints: Object.values(agentState.resolutionState?.families ?? {}).map((resolution) => ({
      familyId: resolution.familyId,
      status: resolution.status === "rejected" ? "unresolved" : resolution.status,
      chosenBranch: resolution.chosenBranch,
      rejectedBranches: resolution.rejectedBranches,
      rationale: resolution.reason,
    })),
    confidenceSummary: {
      macroSlotCoverage: {
        impression: impressionSlot?.topScore ?? 0,
        color: colorSlot?.topScore ?? 0,
        patternIntent: patternSlot?.topScore ?? 0,
        arrangement: arrangementSlot?.topScore ?? 0,
        space: spaceSlot?.topScore ?? 0,
        presence: 0,
      },
      baseReadySlots: agentState.goalState?.slots.filter((slot) => slot.isBaseCaptured).map((slot) => slot.slot) ?? [],
      lockCandidateSlots: agentState.goalState?.slots.filter((slot) => slot.phase === "lock-candidate").map((slot) => slot.slot) ?? [],
      missingCriticalSlots: agentState.goalState?.missingSlots ?? [],
      readyForFirstBatch: agentState.goalState?.readyForFirstGeneration ?? false,
    },
  };
}

export function buildDerivedEntryAnalysisFromAgentState(agentState: IntentIntakeAgentState): EntryAgentResult {
  const semanticMapping = agentState.latestSemanticMapping ?? buildIntentSemanticMappingFromAgentState(agentState);
  const nextMissingSlot = agentState.goalState?.missingSlots[0];
  const hitFields = agentState.slots
    .filter((slot) => slot.topScore > 0)
    .map((slot) => mapMacroSlotToField(slot.slot))
    .filter((field): field is HighValueField => Boolean(field));
  const latestResolution = Object.values(agentState.resolutionState?.families ?? {})
    .sort((left, right) => right.sourceTurn - left.sourceTurn)[0];

  return {
    hitFields,
    evidence: {},
    confidence: {},
    provisionalStateHints: {
      impression: agentState.slots.find((slot) => slot.slot === "impression")?.topDirection ?? "",
      colorMood: agentState.slots.find((slot) => slot.slot === "color")?.topDirection ?? "",
      arrangementTendency: agentState.slots.find((slot) => slot.slot === "arrangement")?.topDirection ?? "",
      roomType: agentState.slots.find((slot) => slot.slot === "space")?.topDirection ?? "",
    },
    ambiguities: [],
    axisHints: {},
    weakBiasHints: [],
    statePatch: {},
    semanticCanvas: undefined,
    updatedSlotStates: deriveLegacySlotStates(agentState),
    suggestedQaMode: "slot-completion",
    suggestedFollowUpTarget: nextMissingSlot ? mapMacroSlotToField(nextMissingSlot) : undefined,
    suggestedQuestionIntent: undefined,
    interpretationMerge: {
      semanticCanvasCandidates: [],
      directCandidates: [],
      prototypeMatches: [],
      semanticUnits: [],
      candidateReadings: [],
      mergeGroups: [],
      keptReadings: [],
      suppressedReadings: [],
      finalResolvedReadings: [],
      fallback: {
        triggered: false,
        reasons: [],
        provider: "rules-only",
        available: true,
        degraded: false,
        candidates: [],
      },
    },
    semanticUnderstanding: {
      confirmedDirections: agentState.slots
        .filter((slot) => Boolean(slot.topDirection))
        .map((slot) => ({
          label: slot.topDirection as string,
          sourceReadingIds: slot.supportingSignals,
          confidence: slot.topScore,
        })),
      activeReadings: [],
      secondaryReadings: [],
      openQuestions: agentState.goalState?.missingSlots.map((slot) => `${slot} 还需要再确认一点。`) ?? [],
      conflictSummary: [],
      narrative: semanticMapping.interpretedIntent.summary || "opening 方向已进入主状态，等待这一轮确认。",
      isWeakNarrative: false,
    },
    semanticGaps: [],
    questionCandidates: [],
    questionPlan: undefined,
    questionResolutionState: agentState.resolutionState,
    latestResolution,
    intakeGoalState: agentState.goalState,
    semanticMapping,
    agentState,
    nextAction: agentState.nextAction,
  };
}

export function buildIntentSemanticMappingFromAnalysis(analysis: EntryAgentResult): IntentSemanticMapping {
  const rawCueTexts = analysis.semanticCanvas?.rawCues ?? [];
  const poeticPresence = analysis.semanticCanvas?.poeticSignal?.presence;
  const patternSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern");
  const impressionCandidates = collectCandidatesForSlot(analysis, "impression");
  const colorCandidates = collectCandidatesForSlot(analysis, "color");
  const arrangementCandidates = collectCandidatesForSlot(analysis, "arrangement");
  const spaceCandidates = collectCandidatesForSlot(analysis, "space");

  return {
    rawCues: rawCueTexts.map((text) => ({
      text,
      cueType: inferCueType(text),
      strength: 0.6,
    })),
    interpretedIntent: {
      dominantEntryPoint: determineDominantEntryPoint(analysis),
      summary: analysis.semanticUnderstanding.narrative,
      designReading: analysis.semanticCanvas?.conceptualAxes ?? [],
      metaphorNotes: analysis.semanticCanvas?.narrativePolicy.mustNotOverLiteralize.map((cue) => ({
        sourceCue: cue,
        interpretedAs: analysis.semanticCanvas?.designTranslations.motifLogic ?? [],
      })) ?? [],
    },
    slotHypotheses: {
      impression: {
        topDirections: impressionCandidates.map((candidate) => ({
          label: candidate.label,
          score: candidate.score,
          evidence: candidate.evidence,
        })),
        openQuestions: analysis.semanticGaps
          .filter((gap) => mapFieldToMacroSlot(gap.targetField) === "impression")
          .map((gap) => gap.reason),
      },
      color: {
        evidence: colorCandidates.flatMap((candidate) => candidate.evidence).slice(0, 4),
        openQuestions: analysis.semanticGaps
          .filter((gap) => mapFieldToMacroSlot(gap.targetField) === "color")
          .map((gap) => gap.reason),
      },
      patternIntent: {
        subject: patternSlot?.patternIntent?.keyElement
          ? {
              candidates: [
                {
                  label: patternSlot.patternIntent.keyElement,
                  score: patternSlot.topScore,
                  evidence: patternSlot.supportingSignals,
                },
              ],
            }
          : undefined,
        rendering: patternSlot?.patternIntent?.renderingMode
          ? { top: patternSlot.patternIntent.renderingMode, score: patternSlot.topScore }
          : undefined,
        abstractionPreference: patternSlot?.patternIntent
          ? { top: patternSlot.patternIntent.abstractionPreference, score: patternSlot.topScore }
          : undefined,
        compositionFeeling: patternSlot?.patternIntent?.motionFeeling
          ? { tags: [patternSlot.patternIntent.motionFeeling], score: patternSlot.topScore }
          : undefined,
        evidence: patternSlot?.supportingSignals ?? [],
        openQuestions: analysis.semanticGaps
          .filter((gap) => mapFieldToMacroSlot(gap.targetField) === "pattern")
          .map((gap) => gap.reason),
      },
      arrangement: {
        evidence: arrangementCandidates.flatMap((candidate) => candidate.evidence).slice(0, 4),
        openQuestions: analysis.semanticGaps
          .filter((gap) => mapFieldToMacroSlot(gap.targetField) === "arrangement")
          .map((gap) => gap.reason),
      },
      space: {
        usageMode: spaceCandidates[0] ? { tags: [spaceCandidates[0].label], score: spaceCandidates[0].score } : undefined,
        evidence: spaceCandidates.flatMap((candidate) => candidate.evidence).slice(0, 4),
      },
      presence: {
        blendingMode: poeticPresence
          ? { top: poeticPresence.blendingMode, score: Math.max(poeticPresence.blending, 1 - poeticPresence.focalness) }
          : undefined,
        visualWeight: poeticPresence
          ? { top: poeticPresence.visualWeight, score: poeticPresence.visualWeightScore }
          : undefined,
        evidence: unique([
          ...(analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? []),
          ...analysis.semanticGaps
            .filter((gap) => gap.reason.includes("存在感") || gap.reason.includes("别太抢"))
            .flatMap((gap) => gap.evidence),
        ]).slice(0, 4),
        openQuestions: unique([
          ...(analysis.semanticCanvas?.poeticSignal?.followupHints ?? []),
          ...analysis.semanticGaps
            .filter((gap) => gap.reason.includes("存在感") || gap.reason.includes("别太抢"))
            .map((gap) => gap.reason),
        ]).slice(0, 3),
      },
    },
    questionOpportunities: analysis.semanticGaps.map((gap) => ({
      targetMacroSlot: mapMacroSlotToOpportunitySlot(mapFieldToMacroSlot(gap.targetField)),
      targetSubslot: gap.questionMode ?? gap.type,
      questionGoal:
        gap.type === "missing-slot"
          ? "collect-missing-slot"
          : gap.type === "weak-anchor"
            ? "confirm-base-direction"
            : gap.type === "prototype-conflict"
              ? "narrow-branch"
              : "disambiguate",
      expectedGain: Math.max(0.2, Math.min(1, gap.priority / 100)),
      suggestedUserFacingAngle: gap.questionPromptOverride ?? gap.reason,
      basedOnEvidence: gap.evidence,
    })),
    resolutionHints: Object.values(analysis.questionResolutionState?.families ?? {}).map((resolution) => ({
      familyId: resolution.familyId,
      status: resolution.status === "rejected" ? "unresolved" : resolution.status,
      chosenBranch: resolution.chosenBranch,
      rejectedBranches: resolution.rejectedBranches,
      rationale: resolution.reason,
    })),
    confidenceSummary: {
      macroSlotCoverage: {
        impression: analysis.intakeGoalState?.slots.find((slot) => slot.slot === "impression")?.topScore ?? 0,
        color: analysis.intakeGoalState?.slots.find((slot) => slot.slot === "color")?.topScore ?? 0,
        patternIntent: analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.topScore ?? 0,
        arrangement: analysis.intakeGoalState?.slots.find((slot) => slot.slot === "arrangement")?.topScore ?? 0,
        space: analysis.intakeGoalState?.slots.find((slot) => slot.slot === "space")?.topScore ?? 0,
        presence: poeticPresence
          ? Number(Math.max(poeticPresence.visualWeightScore, poeticPresence.focalness, poeticPresence.blending).toFixed(2))
          : analysis.semanticGaps.some((gap) => gap.reason.includes("存在感")) ? 0.3 : 0,
      },
      baseReadySlots: analysis.intakeGoalState?.slots.filter((slot) => slot.isBaseCaptured).map((slot) => slot.slot) ?? [],
      lockCandidateSlots: analysis.intakeGoalState?.slots.filter((slot) => slot.phase === "lock-candidate").map((slot) => slot.slot) ?? [],
      missingCriticalSlots: analysis.intakeGoalState?.missingSlots ?? [],
      readyForFirstBatch: analysis.intakeGoalState?.readyForFirstGeneration ?? false,
    },
  };
}

export function createIntentIntakeAgentState(seed: Partial<IntentIntakeAgentState> = {}): IntentIntakeAgentState {
  return {
    phase: seed.phase ?? "idle",
    turnIndex: seed.turnIndex ?? 0,
    cumulativeText: seed.cumulativeText ?? "",
    slots: seed.slots ?? MACRO_SLOTS.map((slot) => ({
      slot,
      status: "empty",
      topCandidates: [],
      recentTrend: "stable",
      openBranches: [],
      questionFamilyIds: [],
      topScore: 0,
      supportingSignals: [],
    })),
    goalState: seed.goalState,
    resolutionState: seed.resolutionState,
    previousQuestion: seed.previousQuestion,
    questionHistory: seed.questionHistory ?? [],
    latestSemanticMapping: seed.latestSemanticMapping,
    latestAnalysis: seed.latestAnalysis,
    nextAction: seed.nextAction,
    lastSignalType: seed.lastSignalType,
  };
}

function appendQuestionTraceIfNeeded(input: {
  questionHistory: QuestionTrace[];
  analysis: EntryAgentResult;
  nextTurnIndex: number;
}): QuestionTrace[] {
  const trace = buildQuestionTraceFromAnalysis(input.analysis, input.nextTurnIndex);
  if (!trace) {
    return input.questionHistory;
  }

  const previous = input.questionHistory[input.questionHistory.length - 1];
  const isDuplicate =
    previous?.prompt === trace.prompt &&
    previous?.questionFamilyId === trace.questionFamilyId &&
    previous?.gapId === trace.gapId;

  return isDuplicate ? input.questionHistory : [...input.questionHistory, trace];
}

function buildNextAgentState(input: {
  analysis: EntryAgentResult;
  currentState: IntentIntakeAgentState;
  signal: TextIntakeSignal;
  cumulativeText: string;
}): IntentIntakeAgentState {
  const nextTurnIndex = input.currentState.turnIndex + 1;
  const nextQuestionHistory = appendQuestionTraceIfNeeded({
    questionHistory: input.currentState.questionHistory,
    analysis: input.analysis,
    nextTurnIndex,
  });
  const slots = MACRO_SLOTS.map((slot) =>
    buildMacroSlotState({
      slot,
      analysis: input.analysis,
      previousSlot: input.currentState.slots.find((item) => item.slot === slot),
      updatedBy: input.signal.type,
    }),
  );
  const transitionedSlots = applySoftLockTransitions({
    slots,
    currentState: input.currentState,
    latestReplyText: input.signal.text,
  });
  const goalState = syncGoalStateAfterTransitions({
    goalState: input.analysis.intakeGoalState,
    slots: transitionedSlots,
  });
  return {
    phase: derivePhase({
      slots: transitionedSlots,
      goalState,
      turnIndex: nextTurnIndex,
    }),
    turnIndex: nextTurnIndex,
    cumulativeText: input.cumulativeText,
    slots: transitionedSlots,
    goalState,
    resolutionState: input.analysis.questionResolutionState,
    previousQuestion: nextQuestionHistory[nextQuestionHistory.length - 1],
    questionHistory: nextQuestionHistory,
    latestSemanticMapping: buildIntentSemanticMappingFromAnalysis(input.analysis),
    latestAnalysis: input.analysis,
    lastSignalType: input.signal.type,
  };
}

export async function updateAgentStateFromSignal(
  signal: IntakeSignal,
  currentState?: IntentIntakeAgentState,
): Promise<IntentIntakeAgentState> {
  const state = createIntentIntakeAgentState(currentState);

  if (signal.type === "opening-selection") {
    const openingApplied = applyOpeningSelectionToAgentState({
      selections: signal.selections,
      currentState: state,
    });
    const latestSemanticMapping = buildIntentSemanticMappingFromAgentState(openingApplied.updatedAgentState);
    const nextState = {
      ...openingApplied.updatedAgentState,
      latestSemanticMapping,
    };
    return {
      ...nextState,
      turnIndex: Math.max(state.turnIndex, signal.turnIndex),
      nextAction: decideNextAction(nextState),
      lastSignalType: signal.type,
    };
  }

  if (signal.type !== "text") {
    throw new Error(`updateAgentStateFromSignal: "${signal.type}" signals are not yet implemented.`);
  }

  const cumulativeText = joinUserTexts(state.cumulativeText, signal.text);
  const analysis = await analyzeEntryText({
    text: cumulativeText,
    slotStates: deriveLegacySlotStates(state),
    previousQuestionTrace: state.questionHistory[state.questionHistory.length - 1],
    latestReplyText: signal.text,
    resolutionState: state.resolutionState,
    previousGoalState: state.goalState,
    questionHistory: state.questionHistory,
  });

  return buildNextAgentState({
    analysis,
    currentState: state,
    signal,
    cumulativeText,
  });
}

export function decideNextAction(agentState: IntentIntakeAgentState): AgentNextAction {
  const confirmation = agentState.goalState?.pendingConfirmations[0];
  if (confirmation) {
    return {
      type: "request-slot-confirmation",
      reason: `${confirmation.slot} 已进入 lock-candidate，先确认是否软锁定。`,
      prompt: confirmation.prompt,
      targetSlot: confirmation.slot,
    };
  }

  if (agentState.goalState?.readyForFirstGeneration) {
    return {
      type: "generate-first-batch",
      reason: agentState.goalState.firstGenerationReason ?? "关键槽位已经达到 first batch 条件。",
    };
  }

  if (!agentState.latestAnalysis && agentState.latestSemanticMapping) {
    const targetSlot = (agentState.goalState?.missingSlots[0] ??
      agentState.latestSemanticMapping.confidenceSummary.missingCriticalSlots[0]) as IntakeMacroSlot | undefined;
    return {
      type: "hold",
      reason: targetSlot
        ? `${targetSlot} 还没有形成稳定主方向，先沿这条主状态继续收集。`
        : "opening priors 已进入主状态，等待下一条用户输入继续收敛。",
      targetSlot,
    };
  }

  const selectedQuestion = pickCandidateFromAgentState(agentState) ?? agentState.latestAnalysis?.questionPlan?.selectedQuestion;
  if (selectedQuestion) {
    const targetSlot = mapEntrySlotToMacroSlot(selectedQuestion.targetSlot) ?? mapFieldToMacroSlot(selectedQuestion.targetField);
    const targetSlotState = targetSlot ? agentState.slots.find((slot) => slot.slot === targetSlot) : undefined;
    return {
      type: "ask-follow-up-question",
      reason: targetSlotState
        ? `${targetSlot} 当前状态为 ${targetSlotState.status}，趋势 ${targetSlotState.recentTrend}，仍有 ${targetSlotState.openBranches.length} 个未收束分支。`
        : (agentState.latestAnalysis?.questionPlan?.whyThisQuestion ?? "当前仍有高价值语义缺口需要追问。"),
      prompt: selectedQuestion.prompt,
      targetField: selectedQuestion.targetField,
      targetSlot,
      questionFamilyId: selectedQuestion.questionFamilyId,
    };
  }

  return {
    type: "hold",
    reason: "当前没有新的追问、确认或出图动作。",
  };
}
