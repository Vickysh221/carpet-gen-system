/**
 * Preference Learning Layer — axis-level confidence model with conflict and repulsion tracking.
 *
 * Replaces the naive `correctBaseFromFeedback` in parameterManager.ts.
 *
 * Key improvements over the old system:
 * - Each axis tracks a confidence score, not just a value
 * - Like/dislike feedback updates axes with attribution-weighted learning rates
 * - Conflict is detected when feedback contradicts established high-confidence axes
 * - Disliked images contribute to repulsion zones, not just "move away" signals
 * - The system knows "what it knows" vs "what it still needs to learn"
 */

import type { ImageSlotValues } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AxisState {
  /** Current best estimate of user preference for this axis [0, 1] */
  value: number;
  /** How certain we are about this axis [0, 1]; increases with consistent feedback */
  confidence: number;
  /** Number of feedback events that have influenced this axis */
  feedbackCount: number;
  /** Contradictory evidence score [0, 1]; increases when feedback reverses direction */
  conflictScore: number;
  /** Magnitude and sign of last applied delta (for conflict detection) */
  lastDelta: number;
}

export type SlotPreference = { [axisKey: string]: AxisState };
export type PreferenceAxes = { [K in keyof ImageSlotValues]: SlotPreference };

/**
 * A region of the axis space that the user has shown aversion to.
 * When composing generation specs, candidates near repulsion zones are penalized.
 */
export interface RepulsionZone {
  slotKey: keyof ImageSlotValues;
  axisKey: string;
  /** Center of the repulsion zone in axis space */
  center: number;
  /** Half-width of the zone */
  radius: number;
  /** How strongly to penalize (0-1) */
  strength: number;
}

export interface PreferenceStateWithMeta {
  axes: PreferenceAxes;
  repulsionZones: RepulsionZone[];
  /** Candidate IDs that received net positive feedback */
  positiveAnchors: string[];
  /** Candidate IDs that received net negative feedback */
  negativeAnchors: string[];
  /** Total feedback events applied to this state */
  totalFeedbackCount: number;
}

/**
 * Specifies which slot axes were the "intentional delta" for an exploration image.
 * If provided, attributed axes receive boosted learning; others receive dampened learning.
 * This enables per-axis preference attribution even without explicit user annotation.
 */
export type FeedbackAttribution = Partial<Record<keyof ImageSlotValues, string[]>>;

export interface FeedbackEvent {
  type: "liked" | "disliked";
  candidateId: string;
  slots: ImageSlotValues;
  /**
   * Optional: which axes differ from the base in this exploration image.
   * When present, learning is concentrated on these axes.
   * When absent, uniform learning rate is applied to all axes.
   */
  attribution?: FeedbackAttribution;
}

// ---------------------------------------------------------------------------
// Axis catalogue (used for iteration)
// ---------------------------------------------------------------------------

const AXIS_KEYS: Array<{ slot: keyof ImageSlotValues; axis: string }> = [
  { slot: "colorPalette", axis: "hueBias" },
  { slot: "colorPalette", axis: "saturation" },
  { slot: "colorPalette", axis: "lightness" },
  { slot: "motif", axis: "geometryDegree" },
  { slot: "motif", axis: "organicDegree" },
  { slot: "motif", axis: "complexity" },
  { slot: "style", axis: "graphicness" },
  { slot: "style", axis: "painterlyDegree" },
  { slot: "style", axis: "heritageSense" },
  { slot: "arrangement", axis: "orderliness" },
  { slot: "arrangement", axis: "density" },
  { slot: "arrangement", axis: "directionality" },
  { slot: "impression", axis: "calmness" },
  { slot: "impression", axis: "energy" },
  { slot: "impression", axis: "softness" },
  { slot: "shape", axis: "angularity" },
  { slot: "shape", axis: "edgeSoftness" },
  { slot: "shape", axis: "irregularity" },
  { slot: "scale", axis: "motifScale" },
  { slot: "scale", axis: "rhythm" },
  { slot: "scale", axis: "contrast" },
];

const SLOT_KEYS: Array<keyof ImageSlotValues> = [
  "colorPalette",
  "motif",
  "style",
  "arrangement",
  "impression",
  "shape",
  "scale",
];

// ---------------------------------------------------------------------------
// Learning rate constants
// ---------------------------------------------------------------------------

/** Base gradient step for liked images (toward target) */
const BASE_LIKE_LR = 0.20;
/** Base gradient step for disliked images (away from target) */
const BASE_DISLIKE_LR = 0.12;
/** Attributed axes receive this multiplier on the base learning rate */
const ATTRIBUTED_BOOST = 2.5;
/** Non-attributed axes receive this fraction of the base learning rate */
const NON_ATTRIBUTED_SCALE = 0.25;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Create a fresh PreferenceState from optional initial slot values.
 * If initial slot values are provided (e.g. from retrieval bootstrap),
 * non-neutral axes start with slightly higher initial confidence.
 */
export function initPreferenceState(initialSlots?: ImageSlotValues): PreferenceStateWithMeta {
  const axes = {} as PreferenceAxes;

  for (const slotKey of SLOT_KEYS) {
    const slotAxes: SlotPreference = {};
    const initSlot = initialSlots?.[slotKey] as Record<string, number> | undefined;
    const axisKeys = Object.keys(initSlot ?? getDefaultSlot(slotKey));

    for (const axisKey of axisKeys) {
      const initVal = initSlot?.[axisKey] ?? 0.5;
      // If the bootstrap produced a non-neutral value, start with marginal confidence
      const initConf = initSlot && Math.abs(initVal - 0.5) > 0.08 ? 0.25 : 0.05;
      slotAxes[axisKey] = {
        value: initVal,
        confidence: initConf,
        feedbackCount: 0,
        conflictScore: 0,
        lastDelta: 0,
      };
    }

    axes[slotKey] = slotAxes;
  }

  return {
    axes,
    repulsionZones: [],
    positiveAnchors: [],
    negativeAnchors: [],
    totalFeedbackCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Core reducer
// ---------------------------------------------------------------------------

/**
 * Apply one feedback event to the preference state and return the updated state.
 * This is a pure function (no mutations).
 */
export function reducePreference(
  state: PreferenceStateWithMeta,
  event: FeedbackEvent
): PreferenceStateWithMeta {
  const newAxes = deepCloneAxes(state.axes);
  const newRepulsions: RepulsionZone[] = [...state.repulsionZones];

  for (const { slot, axis } of AXIS_KEYS) {
    const current = newAxes[slot]?.[axis];
    if (!current) continue;

    const targetVal = (event.slots[slot] as Record<string, number>)[axis] ?? 0.5;

    // Determine learning rate scale based on attribution
    const attributed = event.attribution?.[slot]?.includes(axis) ?? false;
    const scale = event.attribution
      ? attributed
        ? ATTRIBUTED_BOOST
        : NON_ATTRIBUTED_SCALE
      : 1.0;

    if (event.type === "liked") {
      const lr = BASE_LIKE_LR * scale;
      const rawDelta = lr * (targetVal - current.value);

      // Conflict: new feedback significantly reverses a previously established direction
      const isConflicting =
        Math.abs(rawDelta) > 0.05 &&
        current.feedbackCount > 1 &&
        current.confidence > 0.3 &&
        Math.sign(rawDelta) !== Math.sign(current.lastDelta) &&
        Math.sign(current.lastDelta) !== 0;

      newAxes[slot][axis] = {
        value: clamp(current.value + rawDelta, 0.05, 0.95),
        confidence: clamp(
          current.confidence + (isConflicting ? -0.06 : 0.07 * Math.sqrt(scale)),
          0,
          1
        ),
        feedbackCount: current.feedbackCount + 1,
        conflictScore: clamp(
          current.conflictScore + (isConflicting ? 0.25 : -0.02),
          0,
          1
        ),
        lastDelta: rawDelta,
      };
    } else {
      // disliked: push away from the disliked axis value
      const lr = BASE_DISLIKE_LR * scale;
      const rawDelta = -lr * (targetVal - current.value);

      newAxes[slot][axis] = {
        value: clamp(current.value + rawDelta, 0.05, 0.95),
        confidence: clamp(current.confidence + 0.04 * Math.sqrt(scale), 0, 1),
        feedbackCount: current.feedbackCount + 1,
        conflictScore: current.conflictScore, // dislike doesn't add conflict by itself
        lastDelta: rawDelta,
      };

      // Record repulsion zone for attributed (or uniform) axes on dislike
      if (attributed || !event.attribution) {
        const existingIdx = newRepulsions.findIndex(
          (z) => z.slotKey === slot && z.axisKey === axis
        );
        const zone: RepulsionZone = {
          slotKey: slot,
          axisKey: axis,
          center: targetVal,
          radius: 0.18,
          strength: 0.70,
        };
        if (existingIdx >= 0) {
          newRepulsions[existingIdx] = zone;
        } else {
          newRepulsions.push(zone);
        }
      }
    }
  }

  const newPositive =
    event.type === "liked"
      ? [...new Set([...state.positiveAnchors, event.candidateId])]
      : state.positiveAnchors;
  const newNegative =
    event.type === "disliked"
      ? [...new Set([...state.negativeAnchors, event.candidateId])]
      : state.negativeAnchors;

  return {
    axes: newAxes,
    repulsionZones: newRepulsions,
    positiveAnchors: newPositive,
    negativeAnchors: newNegative,
    totalFeedbackCount: state.totalFeedbackCount + 1,
  };
}

// ---------------------------------------------------------------------------
// Batch apply (for processing multiple feedback events at once)
// ---------------------------------------------------------------------------

export function applyFeedbackBatch(
  state: PreferenceStateWithMeta,
  events: FeedbackEvent[]
): PreferenceStateWithMeta {
  return events.reduce((s, event) => reducePreference(s, event), state);
}

// ---------------------------------------------------------------------------
// Derived data helpers
// ---------------------------------------------------------------------------

/** Extract a flat ImageSlotValues from the preference state (uses axis value estimates) */
export function extractSlotValues(state: PreferenceStateWithMeta): ImageSlotValues {
  const result: Partial<ImageSlotValues> = {};
  for (const slotKey of SLOT_KEYS) {
    const slotAxes = state.axes[slotKey];
    if (!slotAxes) continue;
    (result as Record<string, unknown>)[slotKey] = Object.fromEntries(
      Object.entries(slotAxes).map(([k, v]) => [k, v.value])
    );
  }
  return result as ImageSlotValues;
}

export interface PreferenceSummary {
  averageConfidence: number;
  highConfidenceAxesCount: number;
  /** Max conflict score across all axes */
  conflictScore: number;
  /** Axes ranked by how uncertain they are (most uncertain first) */
  mostUncertainAxes: Array<{ slot: keyof ImageSlotValues; axis: string; confidence: number }>;
}

export function computePreferenceSummary(state: PreferenceStateWithMeta): PreferenceSummary {
  const allAxes = AXIS_KEYS.map(({ slot, axis }) => ({
    slot,
    axis,
    state: state.axes[slot]?.[axis],
  })).filter((x) => x.state != null) as Array<{
    slot: keyof ImageSlotValues;
    axis: string;
    state: AxisState;
  }>;

  if (allAxes.length === 0) {
    return { averageConfidence: 0, highConfidenceAxesCount: 0, conflictScore: 0, mostUncertainAxes: [] };
  }

  const averageConfidence = allAxes.reduce((s, x) => s + x.state.confidence, 0) / allAxes.length;
  const highConfidenceAxesCount = allAxes.filter((x) => x.state.confidence > 0.7).length;
  const conflictScore = Math.max(...allAxes.map((x) => x.state.conflictScore));
  const mostUncertainAxes = [...allAxes]
    .sort((a, b) => a.state.confidence - b.state.confidence)
    .slice(0, 6)
    .map(({ slot, axis, state }) => ({ slot, axis, confidence: state.confidence }));

  return { averageConfidence, highConfidenceAxesCount, conflictScore, mostUncertainAxes };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function deepCloneAxes(axes: PreferenceAxes): PreferenceAxes {
  const result = {} as PreferenceAxes;
  for (const slotKey of SLOT_KEYS) {
    result[slotKey] = {};
    for (const [axisKey, axisState] of Object.entries(axes[slotKey] ?? {})) {
      result[slotKey][axisKey] = { ...axisState };
    }
  }
  return result;
}

function getDefaultSlot(slotKey: keyof ImageSlotValues): Record<string, number> {
  const defaults: Record<keyof ImageSlotValues, Record<string, number>> = {
    colorPalette: { hueBias: 0.5, saturation: 0.5, lightness: 0.5 },
    motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
    style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
    arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
    impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
    shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
    scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
  };
  return defaults[slotKey];
}
