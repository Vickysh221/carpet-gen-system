import type { ImageSlotValues, LibraryImage } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExplorationEntry {
  img: LibraryImage;
  slotKey: keyof ImageSlotValues;
  axisKey: string;
  delta: number;
  deltaSummary: string;
}

export interface Round1Result {
  base: LibraryImage;
  explorations: ExplorationEntry[];
  baseSlots: ImageSlotValues;
}

// ---------------------------------------------------------------------------
// Round 1 exploration specs (static fallback)
// Used only when the dynamic explorationAxisSelector cannot run.
// Prefer passing dynamicSpecs from explorationAxisSelector.selectExplorationAxes().
// ---------------------------------------------------------------------------

const FALLBACK_EXPLORATION_SPECS: Array<{
  slotKey: keyof ImageSlotValues;
  axisKey: string;
  delta: number;
}> = [
  { slotKey: "colorPalette", axisKey: "saturation", delta: 0.08 },
  { slotKey: "arrangement", axisKey: "orderliness", delta: 0.12 },
  { slotKey: "shape", axisKey: "edgeSoftness", delta: 0.10 },
  { slotKey: "motif", axisKey: "complexity", delta: -0.10 },
];

// Learning rates for feedback correction
const LIKE_LR = 0.25;
const DISLIKE_LR = 0.15;

// ---------------------------------------------------------------------------
// buildRound1Candidates
//
// Given analyzed slot values from the uploaded image and the image library:
//   1. Finds the Base image (closest match in 21-dimensional slot space).
//   2. For each exploration spec, shifts one axis of the base slots and finds
//      the library image closest to those shifted parameters.
//
// Returns base + up to 4 exploration images, each attributable to a single
// slot-axis delta — enabling clear per-axis preference attribution.
// ---------------------------------------------------------------------------
export function buildRound1Candidates(
  querySlots: ImageSlotValues,
  library: LibraryImage[],
  /** Optional dynamic exploration specs from explorationAxisSelector (preferred over static fallback) */
  dynamicSpecs?: Array<{ slotKey: keyof ImageSlotValues; axisKey: string; delta: number }>
): Round1Result {
  const ranked = rankByDistance(querySlots, library);
  const base = ranked[0];
  const usedIds = new Set<string>([base.id]);

  const specs = dynamicSpecs && dynamicSpecs.length > 0 ? dynamicSpecs : FALLBACK_EXPLORATION_SPECS;
  const explorations: ExplorationEntry[] = [];
  for (const spec of specs) {
    const shiftedSlots = applyAxisDelta(base.slots, spec.slotKey, spec.axisKey, spec.delta);
    const candidate = findClosestExcluding(shiftedSlots, library, usedIds);
    if (candidate) {
      usedIds.add(candidate.id);
      const sign = spec.delta > 0 ? "+" : "";
      explorations.push({
        img: candidate,
        slotKey: spec.slotKey,
        axisKey: spec.axisKey,
        delta: spec.delta,
        deltaSummary: `${spec.slotKey}.${spec.axisKey} ${sign}${spec.delta.toFixed(2)}`,
      });
    }
  }

  return { base, explorations, baseSlots: base.slots };
}

// ---------------------------------------------------------------------------
// correctBaseFromFeedback
//
// Applies a gradient step to baseSlots:
//   - Move toward each liked image's slot values  (LIKE_LR per liked)
//   - Move away from each disliked image's slot values (DISLIKE_LR per disliked)
//
// All resulting axis values are clamped to [0.1, 0.9] to prevent the
// base from reaching extreme boundaries (per the spec constraint).
// ---------------------------------------------------------------------------
export function correctBaseFromFeedback(
  currentBase: ImageSlotValues,
  likedSlots: ImageSlotValues[],
  dislikedSlots: ImageSlotValues[]
): ImageSlotValues {
  const updated = deepCloneSlots(currentBase);
  const slotKeys = Object.keys(updated) as (keyof ImageSlotValues)[];

  for (const slotKey of slotKeys) {
    const axisMap = updated[slotKey] as Record<string, number>;
    const axisKeys = Object.keys(axisMap);

    for (const axisKey of axisKeys) {
      let value = axisMap[axisKey];

      for (const liked of likedSlots) {
        const likedVal = (liked[slotKey] as Record<string, number>)[axisKey] ?? 0.5;
        value += LIKE_LR * (likedVal - value);
      }
      for (const disliked of dislikedSlots) {
        const dislikedVal = (disliked[slotKey] as Record<string, number>)[axisKey] ?? 0.5;
        value -= DISLIKE_LR * (dislikedVal - value);
      }

      axisMap[axisKey] = clamp(value, 0.1, 0.9);
    }
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rankByDistance(query: ImageSlotValues, library: LibraryImage[]): LibraryImage[] {
  const queryVec = flattenSlots(query);
  return library
    .map((img) => ({ img, dist: euclideanDistance(queryVec, flattenSlots(img.slots)) }))
    .sort((a, b) => a.dist - b.dist)
    .map((x) => x.img);
}

function findClosestExcluding(
  query: ImageSlotValues,
  library: LibraryImage[],
  excludeIds: Set<string>
): LibraryImage | null {
  return rankByDistance(query, library).find((img) => !excludeIds.has(img.id)) ?? null;
}

function applyAxisDelta(
  slots: ImageSlotValues,
  slotKey: keyof ImageSlotValues,
  axisKey: string,
  delta: number
): ImageSlotValues {
  const slotCopy = { ...(slots[slotKey] as Record<string, number>) };
  slotCopy[axisKey] = clamp((slotCopy[axisKey] ?? 0.5) + delta, 0.1, 0.9);
  return { ...slots, [slotKey]: slotCopy };
}

function flattenSlots(slots: ImageSlotValues): number[] {
  return [
    slots.colorPalette.hueBias,
    slots.colorPalette.saturation,
    slots.colorPalette.lightness,
    slots.motif.geometryDegree,
    slots.motif.organicDegree,
    slots.motif.complexity,
    slots.style.graphicness,
    slots.style.painterlyDegree,
    slots.style.heritageSense,
    slots.arrangement.orderliness,
    slots.arrangement.density,
    slots.arrangement.directionality,
    slots.impression.calmness,
    slots.impression.energy,
    slots.impression.softness,
    slots.shape.angularity,
    slots.shape.edgeSoftness,
    slots.shape.irregularity,
    slots.scale.motifScale,
    slots.scale.rhythm,
    slots.scale.contrast,
  ];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function deepCloneSlots(slots: ImageSlotValues): ImageSlotValues {
  return {
    colorPalette: { ...slots.colorPalette },
    motif: { ...slots.motif },
    style: { ...slots.style },
    arrangement: { ...slots.arrangement },
    impression: { ...slots.impression },
    shape: { ...slots.shape },
    scale: { ...slots.scale },
  };
}
