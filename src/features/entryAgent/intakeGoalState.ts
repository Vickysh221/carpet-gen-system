import { buildSlotConfirmationPrompt } from "./slotConfirmationRenderer";
import type {
  EntryAgentResult,
  HighValueField,
  IntakeMacroSlot,
  IntakeSlotConfirmation,
  IntakeSlotPhase,
  IntakeSlotProgress,
  IntentIntakeGoalState,
  PatternIntentState,
} from "./types";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const BASE_CAPTURE_THRESHOLD = 0.5;
const BASE_CAPTURE_MIN_SIGNALS = 2;
const LOCK_CANDIDATE_THRESHOLD = 0.68;

const CRITICAL_SLOTS: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement"];

// ---------------------------------------------------------------------------
// Field → macro slot mapping
// ---------------------------------------------------------------------------

function mapFieldToMacroSlot(field: HighValueField | undefined): IntakeMacroSlot | undefined {
  if (field === "overallImpression") return "impression";
  if (field === "colorMood") return "color";
  if (field === "patternTendency") return "pattern";
  if (field === "arrangementTendency") return "arrangement";
  if (field === "spaceContext") return "space";
  return undefined;
}

// ---------------------------------------------------------------------------
// Phase computation (3-condition heuristic)
// ---------------------------------------------------------------------------

function computePhase(topScore: number, supportingSignals: string[]): IntakeSlotPhase {
  if (topScore === 0) return "empty";
  if (topScore < BASE_CAPTURE_THRESHOLD) return "hinted";
  if (topScore >= LOCK_CANDIDATE_THRESHOLD && supportingSignals.length >= BASE_CAPTURE_MIN_SIGNALS) {
    return "lock-candidate";
  }
  if (topScore >= BASE_CAPTURE_THRESHOLD && supportingSignals.length >= BASE_CAPTURE_MIN_SIGNALS) {
    return "base-captured";
  }
  // Score is above threshold but only one supporting signal yet
  return "hinted";
}

// ---------------------------------------------------------------------------
// Pattern intent extraction from semantic canvas rawCues
// ---------------------------------------------------------------------------

const KEY_ELEMENT_MAP: Array<{ keywords: string[]; element: string }> = [
  { keywords: ["荷花", "莲花", "荷叶", "莲", "荷"], element: "lotus" },
  { keywords: ["草叶", "草色", "草", "叶", "枝", "枝叶", "芦苇", "竹"], element: "botanical" },
  { keywords: ["山水", "山", "峰", "丘", "岭"], element: "landscape" },
  { keywords: ["波纹", "波", "涟漪", "水纹", "水波", "浪"], element: "water-wave" },
  { keywords: ["云", "雾", "晨雾", "烟", "霭"], element: "cloud-mist" },
  { keywords: ["石", "岩", "砾", "纹理"], element: "stone-texture" },
  { keywords: ["花瓣", "花", "梅", "樱"], element: "floral" },
  { keywords: ["几何", "方", "圆", "菱", "格"], element: "geometric-motif" },
];

const MOTION_MAP: Array<{ keywords: string[]; feeling: PatternIntentState["motionFeeling"] }> = [
  { keywords: ["风", "风中", "飘", "摇曳", "随风"], feeling: "wind-like" },
  { keywords: ["流", "流动", "流淌", "漂"], feeling: "flowing" },
  { keywords: ["层", "叠", "层叠", "重叠"], feeling: "layered" },
  { keywords: ["散", "分散", "零散", "稀疏"], feeling: "dispersed" },
  { keywords: ["静", "静止", "沉静", "安静"], feeling: "still" },
];

const CONCRETE_KEYWORDS = ["具象", "写实", "真实", "像真的", "很像", "清楚", "清晰"];
const ABSTRACT_KEYWORDS = ["抽象", "意向", "意境", "若有若无", "感觉", "气息", "印象"];

function extractPatternIntent(rawCues: string[]): PatternIntentState | undefined {
  const allText = rawCues.join(" ");

  let keyElement: string | undefined;
  for (const entry of KEY_ELEMENT_MAP) {
    if (entry.keywords.some((kw) => allText.includes(kw))) {
      keyElement = entry.element;
      break;
    }
  }

  if (!keyElement) return undefined;

  let motionFeeling: PatternIntentState["motionFeeling"] | undefined;
  for (const entry of MOTION_MAP) {
    if (entry.keywords.some((kw) => allText.includes(kw))) {
      motionFeeling = entry.feeling;
      break;
    }
  }

  const wantsConcrete = CONCRETE_KEYWORDS.some((kw) => allText.includes(kw));
  const wantsAbstract = ABSTRACT_KEYWORDS.some((kw) => allText.includes(kw));
  const abstractionPreference: PatternIntentState["abstractionPreference"] = wantsConcrete
    ? "concrete"
    : wantsAbstract
      ? "abstract"
      : "abstract"; // default to abstract per product principle

  const renderingMode: PatternIntentState["renderingMode"] = wantsConcrete
    ? "literal"
    : motionFeeling === "wind-like" || motionFeeling === "flowing"
      ? "suggestive"
      : "suggestive";

  return { keyElement, abstractionPreference, renderingMode, motionFeeling };
}

// ---------------------------------------------------------------------------
// Top direction per slot
// ---------------------------------------------------------------------------

function getTopDirectionForSlot(input: { analysis: EntryAgentResult; slot: IntakeMacroSlot }) {
  const { analysis, slot } = input;

  const confirmedCandidate = analysis.semanticUnderstanding.confirmedDirections.find((direction) =>
    direction.sourceReadingIds.some((readingId) => {
      const reading = analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === readingId);
      return mapFieldToMacroSlot(reading?.field) === slot;
    }),
  );

  if (confirmedCandidate) {
    return {
      label: confirmedCandidate.label,
      score: confirmedCandidate.confidence,
      supportingSignals: confirmedCandidate.sourceReadingIds,
    };
  }

  const activeReading = analysis.semanticUnderstanding.activeReadings.find((reading) => {
    const fullReading = analysis.interpretationMerge.finalResolvedReadings.find((item) => item.id === reading.readingId);
    return mapFieldToMacroSlot(fullReading?.field) === slot;
  });

  if (activeReading) {
    return {
      label: activeReading.label,
      score: activeReading.confidence,
      supportingSignals: [activeReading.readingId],
    };
  }

  const openGap = analysis.semanticGaps.find((gap) => mapFieldToMacroSlot(gap.targetField) === slot);
  if (openGap) {
    return { label: undefined, score: 0.2, supportingSignals: openGap.evidence.slice(0, 2) };
  }

  const latestResolution = Object.values(analysis.questionResolutionState?.families ?? {})
    .filter((resolution) => mapFieldToMacroSlot((resolution.familyId.split(":")[0] as HighValueField | undefined)) === slot)
    .sort((left, right) => right.sourceTurn - left.sourceTurn)[0];
  if (latestResolution?.chosenBranch) {
    return {
      label: latestResolution.chosenBranch,
      score: latestResolution.status === "resolved" ? 0.78 : 0.62,
      supportingSignals: [latestResolution.familyId],
    };
  }

  if (slot === "impression") {
    const impression = analysis.provisionalStateHints.impression;
    if (typeof impression === "string") {
      return { label: impression, score: 0.64, supportingSignals: ["provisional:impression"] };
    }
  }

  if (slot === "color") {
    const colorMood = analysis.provisionalStateHints.colorMood;
    if (typeof colorMood === "string") {
      return { label: colorMood, score: 0.62, supportingSignals: ["provisional:color"] };
    }
  }

  if (slot === "arrangement") {
    const arrangementTendency = analysis.provisionalStateHints.arrangementTendency;
    if (typeof arrangementTendency === "string") {
      return { label: arrangementTendency, score: 0.6, supportingSignals: ["provisional:arrangement"] };
    }
  }

  if (slot === "space") {
    const roomType = analysis.provisionalStateHints.roomType;
    if (typeof roomType === "string") {
      return { label: roomType, score: 0.7, supportingSignals: ["provisional:space"] };
    }
  }

  if (slot === "pattern") {
    const rawCues = analysis.semanticCanvas?.rawCues ?? [];
    const patternIntent = extractPatternIntent(rawCues);
    if (patternIntent?.keyElement) {
      return {
        label: patternIntent.keyElement,
        score: 0.66,
        supportingSignals: [`pattern:${patternIntent.keyElement}`],
      };
    }
  }

  return { label: undefined, score: 0, supportingSignals: [] };
}

// ---------------------------------------------------------------------------
// Build per-slot progress
// ---------------------------------------------------------------------------

function buildSlotProgress(
  analysis: EntryAgentResult,
  slot: IntakeMacroSlot,
  previousGoalState?: IntentIntakeGoalState,
): IntakeSlotProgress {
  const top = getTopDirectionForSlot({ analysis, slot });
  const previousSlot = previousGoalState?.slots.find((item) => item.slot === slot);
  const mergedTop = previousSlot && previousSlot.topScore > top.score
    ? {
        label: previousSlot.topDirection,
        score: previousSlot.topScore,
        supportingSignals: [...new Set([...previousSlot.supportingSignals, ...top.supportingSignals])],
      }
    : top;
  const phase = computePhase(mergedTop.score, mergedTop.supportingSignals);
  const isBaseCaptured = phase === "base-captured" || phase === "lock-candidate";

  const result: IntakeSlotProgress = {
    slot,
    topDirection: mergedTop.label,
    topScore: Number(mergedTop.score.toFixed(2)),
    supportingSignals: mergedTop.supportingSignals,
    isBaseCaptured,
    phase,
  };

  // Pattern intent: extract from semantic canvas rawCues
  if (slot === "pattern") {
    const rawCues = analysis.semanticCanvas?.rawCues ?? [];
    const patternIntent = extractPatternIntent(rawCues);
    if (patternIntent) {
      result.patternIntent = patternIntent;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// First-generation readiness (Conditions A / B)
// ---------------------------------------------------------------------------

function computeReadyForFirstGeneration(slots: IntakeSlotProgress[]): { ready: boolean; reason: string } {
  const impression = slots.find((s) => s.slot === "impression");
  const pattern = slots.find((s) => s.slot === "pattern");
  const color = slots.find((s) => s.slot === "color");

  // Condition A: impression + (pattern OR color) both base-captured
  if (impression?.isBaseCaptured && (pattern?.isBaseCaptured || color?.isBaseCaptured)) {
    const second = pattern?.isBaseCaptured ? "pattern" : "color";
    return { ready: true, reason: `impression and ${second} both have base directions` };
  }

  // Condition B: any 3 critical slots base-captured
  const capturedCount = slots.filter((s) => CRITICAL_SLOTS.includes(s.slot) && s.isBaseCaptured).length;
  if (capturedCount >= 3) {
    return { ready: true, reason: "3 or more critical slots have base directions" };
  }

  return { ready: false, reason: "core slot directions not yet established" };
}

// ---------------------------------------------------------------------------
// Pending confirmations — detect new lock-candidate transitions
// ---------------------------------------------------------------------------

function buildPendingConfirmations(
  slots: IntakeSlotProgress[],
  previousGoalState: IntentIntakeGoalState | undefined,
): IntakeSlotConfirmation[] {
  const confirmations: IntakeSlotConfirmation[] = [];

  for (const slot of slots) {
    if (slot.phase !== "lock-candidate") continue;
    if (!slot.topDirection) continue;

    const previousSlot = previousGoalState?.slots.find((s) => s.slot === slot.slot);
    const wasAlreadyLockCandidate = previousSlot?.phase === "lock-candidate";

    // Only generate a confirmation when the slot FIRST reaches lock-candidate
    if (wasAlreadyLockCandidate) continue;

    // Also skip if this slot was already confirmed before
    const alreadyConfirmed = previousGoalState?.pendingConfirmations.some(
      (c) => c.slot === slot.slot && c.confirmationType === "lock-candidate",
    );
    if (alreadyConfirmed) continue;

    confirmations.push({
      slot: slot.slot,
      direction: slot.topDirection,
      confirmationType: "lock-candidate",
      prompt: buildSlotConfirmationPrompt(slot.slot, slot.topDirection, "lock-candidate", slot.patternIntent),
    });
  }

  return confirmations;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildIntentIntakeGoalState(
  analysis: EntryAgentResult,
  previousGoalState?: IntentIntakeGoalState,
): IntentIntakeGoalState {
  const macroSlots: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement", "space"];
  const slots: IntakeSlotProgress[] = macroSlots.map((slot) => buildSlotProgress(analysis, slot, previousGoalState));

  const missingSlots = slots
    .filter((slot) => CRITICAL_SLOTS.includes(slot.slot) && !slot.isBaseCaptured)
    .map((slot) => slot.slot);

  const completed = missingSlots.length === 0;
  const { ready: readyForFirstGeneration, reason: firstGenerationReason } = computeReadyForFirstGeneration(slots);
  const pendingConfirmations = buildPendingConfirmations(slots, previousGoalState);

  return {
    slots,
    completed,
    completionReason: completed ? "all critical macro slots have base directions above threshold" : undefined,
    missingSlots,
    readyForFirstGeneration,
    firstGenerationReason: readyForFirstGeneration ? firstGenerationReason : undefined,
    pendingConfirmations,
  };
}

// ---------------------------------------------------------------------------
// Image signal: apply annotation hints to update slot confidence
// ---------------------------------------------------------------------------

function annotationValueToDirection(value: number, highLabel: string, lowLabel: string): { direction: string; confidence: number } {
  if (value >= 0.65) return { direction: highLabel, confidence: value };
  if (value <= 0.35) return { direction: lowLabel, confidence: 1 - value };
  return { direction: highLabel, confidence: 0.5 }; // ambiguous middle
}

export function applyImageSignalToGoalState(
  action: "like" | "dislike" | "neutral-save",
  annotationHints: NonNullable<import("./types").ImagePreferenceSignal["annotationHints"]>,
  currentGoalState: IntentIntakeGoalState,
  previousGoalState?: IntentIntakeGoalState,
): IntentIntakeGoalState {
  const LIKE_BOOST = 0.12;
  const DISLIKE_PENALTY = 0.10;
  const NEUTRAL_BOOST = 0.04;
  const delta = action === "like" ? LIKE_BOOST : action === "dislike" ? -DISLIKE_PENALTY : NEUTRAL_BOOST;

  // Derive direction signals from annotation
  type SlotSignal = { slot: IntakeMacroSlot; direction: string; confidence: number };
  const annotationSignals: SlotSignal[] = [];

  if (annotationHints.impression) {
    const { calm = 0.5, energy = 0.5 } = annotationHints.impression;
    if (Math.abs(calm - 0.5) >= 0.12) {
      annotationSignals.push(annotationValueToDirection(calm, "calm / restrained", "energetic / presence") as SlotSignal & { slot: "impression" });
      annotationSignals[annotationSignals.length - 1] = { ...annotationSignals[annotationSignals.length - 1], slot: "impression" };
    } else if (Math.abs(energy - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "impression", ...annotationValueToDirection(energy, "energetic / presence", "calm / restrained") });
    }
  }

  if (annotationHints.color) {
    const { warmth = 0.5, saturation = 0.5 } = annotationHints.color;
    if (Math.abs(warmth - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "color", ...annotationValueToDirection(warmth, "warm", "cool / muted") });
    } else if (Math.abs(saturation - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "color", ...annotationValueToDirection(saturation, "vivid", "restrained / muted") });
    }
  }

  if (annotationHints.motif) {
    const { complexity = 0.5, geometry = 0.5, organic = 0.5 } = annotationHints.motif;
    if (Math.abs(organic - 0.5) >= 0.15) {
      annotationSignals.push({ slot: "pattern", ...annotationValueToDirection(organic, "organic / natural", "geometric / structured") });
    } else if (Math.abs(complexity - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "pattern", ...annotationValueToDirection(complexity, "rich / complex", "minimal / clean") });
    } else if (Math.abs(geometry - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "pattern", ...annotationValueToDirection(geometry, "geometric", "non-geometric") });
    }
  }

  if (annotationHints.arrangement) {
    const { order = 0.5, spacing = 0.5 } = annotationHints.arrangement;
    if (Math.abs(spacing - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "arrangement", ...annotationValueToDirection(spacing, "open / spacious", "packed / dense") });
    } else if (Math.abs(order - 0.5) >= 0.12) {
      annotationSignals.push({ slot: "arrangement", ...annotationValueToDirection(order, "ordered / structured", "free / irregular") });
    }
  }

  // Apply delta to matching slots
  const updatedSlots = currentGoalState.slots.map((slotProgress) => {
    const signal = annotationSignals.find((s) => s.slot === slotProgress.slot);
    if (!signal) return slotProgress;

    const newScore = Math.max(0, Math.min(1, slotProgress.topScore + delta));
    const newDirection = action !== "dislike" ? (slotProgress.topDirection ?? signal.direction) : slotProgress.topDirection;
    const newSignals =
      action !== "dislike" && !slotProgress.supportingSignals.includes(`img:${action}`)
        ? [...slotProgress.supportingSignals, `img:${action}`]
        : slotProgress.supportingSignals;
    const newPhase = computePhase(newScore, newSignals);

    return {
      ...slotProgress,
      topScore: Number(newScore.toFixed(2)),
      topDirection: newDirection,
      supportingSignals: newSignals,
      isBaseCaptured: newPhase === "base-captured" || newPhase === "lock-candidate",
      phase: newPhase,
    } satisfies IntakeSlotProgress;
  });

  const missingSlots = updatedSlots
    .filter((slot) => CRITICAL_SLOTS.includes(slot.slot) && !slot.isBaseCaptured)
    .map((slot) => slot.slot);
  const completed = missingSlots.length === 0;
  const { ready: readyForFirstGeneration, reason: firstGenerationReason } = computeReadyForFirstGeneration(updatedSlots);
  const pendingConfirmations = buildPendingConfirmations(updatedSlots, previousGoalState ?? currentGoalState);

  return {
    slots: updatedSlots,
    completed,
    completionReason: completed ? "all critical macro slots have base directions above threshold" : undefined,
    missingSlots,
    readyForFirstGeneration,
    firstGenerationReason: readyForFirstGeneration ? firstGenerationReason : undefined,
    pendingConfirmations: [...currentGoalState.pendingConfirmations, ...pendingConfirmations],
  };
}
