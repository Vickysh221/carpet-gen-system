import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "./types";

const FIRST_ORDER_WEIGHTS = [0.55, 0.45, 0.4, 1.35, 1.35, 0.85, 1.25, 0.6, 1.15];

// Slot index ranges in the flattened first-order array:
//  color [0-2]: warmth, saturation, lightness
//  motif [3-5]: geometry, organic, complexity
//  arrangement [6-8]: order, spacing, direction
type FirstOrderSlotName = "color" | "motif" | "arrangement";

function flattenFirstOrder(values: FirstOrderSlotValues): number[] {
  return [
    values.color.warmth,
    values.color.saturation,
    values.color.lightness,
    values.motif.geometry,
    values.motif.organic,
    values.motif.complexity,
    values.arrangement.order,
    values.arrangement.spacing,
    values.arrangement.direction,
  ];
}

function weightedDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, index) => sum + FIRST_ORDER_WEIGHTS[index] * (value - b[index]) ** 2, 0));
}

function scoreAsset(target: FirstOrderSlotValues, asset: AnnotatedAssetRecord): number {
  if (!asset.annotation) return Number.POSITIVE_INFINITY;
  return weightedDistance(flattenFirstOrder(target), flattenFirstOrder(asset.annotation.firstOrder));
}

function filterCandidates(assets: AnnotatedAssetRecord[], hardExcludeIds?: string[]) {
  const excluded = new Set(hardExcludeIds ?? []);
  return assets.filter((asset) => asset.annotation && !excluded.has(asset.imageId));
}

export function findNearestAnnotatedAssets(
  target: FirstOrderSlotValues,
  assets: AnnotatedAssetRecord[],
  limit = 3,
  options?: { hardExcludeIds?: string[]; softAvoidIds?: string[]; softAvoidPenalty?: number }
): Array<AnnotatedAssetRecord & { distance: number }> {
  const softAvoid = options?.softAvoidIds ?? [];
  const softAvoidPenalty = options?.softAvoidPenalty ?? 0.08;

  return filterCandidates(assets, options?.hardExcludeIds)
    .map((asset) => {
      const distance = scoreAsset(target, asset);
      const seenCount = softAvoid.filter((id) => id === asset.imageId).length;
      return { ...asset, distance, score: distance + seenCount * softAvoidPenalty };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ score: _score, ...asset }) => asset);
}

export function findExploratoryAnnotatedAssets(
  target: FirstOrderSlotValues,
  assets: AnnotatedAssetRecord[],
  options?: {
    limit?: number;
    poolSize?: number;
    seenIds?: string[];
    noveltyBonus?: number;
    hardExcludeIds?: string[];
  }
): Array<AnnotatedAssetRecord & { distance: number }> {
  const limit = options?.limit ?? 1;
  const poolSize = options?.poolSize ?? 8;
  const seenIds = options?.seenIds ?? [];
  const noveltyBonus = options?.noveltyBonus ?? 0.12;

  const ranked = findNearestAnnotatedAssets(target, assets, poolSize, {
    hardExcludeIds: options?.hardExcludeIds,
    softAvoidIds: seenIds,
    softAvoidPenalty: 0.05,
  }).map((asset, index) => {
    const seenCount = seenIds.filter((id) => id === asset.imageId).length;
    return { ...asset, exploratoryScore: asset.distance + seenCount * noveltyBonus + index * 0.015 };
  });

  return ranked
    .sort((a, b) => a.exploratoryScore - b.exploratoryScore)
    .slice(0, limit)
    .map(({ exploratoryScore: _score, ...asset }) => asset);
}

export function assignDiverseNearestAnnotatedAssets(
  targets: Array<{ key: string; values: FirstOrderSlotValues }>,
  assets: AnnotatedAssetRecord[],
  options?: {
    diversityPenalty?: number;
    nearDuplicatePenalty?: number;
    duplicateThreshold?: number;
    explorationSeenIds?: string[];
    noveltyBonus?: number;
    mode?: "stable" | "explore";
    hardExcludeIds?: string[];
  }
): Record<string, Array<AnnotatedAssetRecord & { distance: number }>> {
  const diversityPenalty = options?.diversityPenalty ?? 0.18;
  const nearDuplicatePenalty = options?.nearDuplicatePenalty ?? 0.08;
  const duplicateThreshold = options?.duplicateThreshold ?? 0.12;
  const explorationSeenIds = options?.explorationSeenIds ?? [];
  const noveltyBonus = options?.noveltyBonus ?? 0.12;
  const mode = options?.mode ?? "stable";

  const candidates = filterCandidates(assets, options?.hardExcludeIds);
  const selectedIds: string[] = [];
  const result: Record<string, Array<AnnotatedAssetRecord & { distance: number }>> = {};

  for (const target of targets) {
    const ranked = candidates
      .filter((asset) => !selectedIds.includes(asset.imageId))
      .map((asset, index) => {
        const baseDistance = scoreAsset(target.values, asset);
        const seenCount = explorationSeenIds.filter((id) => id === asset.imageId).length;
        const similarityCost = selectedIds.some((id) => {
          const selected = candidates.find((item) => item.imageId === id);
          if (!selected?.annotation || !asset.annotation) return false;
          return weightedDistance(flattenFirstOrder(selected.annotation.firstOrder), flattenFirstOrder(asset.annotation.firstOrder)) < duplicateThreshold;
        })
          ? nearDuplicatePenalty
          : 0;
        const noveltyCost = mode === "explore" ? seenCount * noveltyBonus + index * 0.01 : seenCount * 0.05;
        const diversityCost = selectedIds.length > 0 ? diversityPenalty : 0;
        return { ...asset, distance: baseDistance, score: baseDistance + diversityCost + similarityCost + noveltyCost };
      })
      .sort((a, b) => a.score - b.score);

    const chosen = ranked[0];
    if (chosen) {
      result[target.key] = [{ ...chosen, distance: chosen.distance }];
      selectedIds.push(chosen.imageId);
      continue;
    }

    const fallback = candidates
      .map((asset, index) => {
        const baseDistance = scoreAsset(target.values, asset);
        const seenCount = explorationSeenIds.filter((id) => id === asset.imageId).length;
        const repeatPenalty = selectedIds.includes(asset.imageId) ? 0.06 : 0;
        return { ...asset, distance: baseDistance, score: baseDistance + seenCount * 0.04 + repeatPenalty + index * 0.005 };
      })
      .sort((a, b) => a.score - b.score)[0];

    result[target.key] = fallback ? [{ ...fallback, distance: fallback.distance }] : [];
  }

  return result;
}

/**
 * Score a carrier asset for a probing hypothesis.
 *
 * Hypothesis-aware scoring boosts the weight on "vary" slot axes (those being explored)
 * so the carrier genuinely represents the hypothesis direction, rather than just being
 * the nearest overall asset. "Keep" slot axes are down-weighted so the carrier isn't
 * penalised for incidental differences on non-hypothesis dimensions.
 */
function scoreCarrierForHypothesis(
  variantValues: FirstOrderSlotValues,
  asset: AnnotatedAssetRecord,
  changedSlots: ReadonlyArray<FirstOrderSlotName>,
  varySlotBoost = 2.0,
  keepSlotScale = 0.6
): number {
  if (!asset.annotation) return Number.POSITIVE_INFINITY;
  const assetFlat = flattenFirstOrder(asset.annotation.firstOrder);
  const variantFlat = flattenFirstOrder(variantValues);
  const changedSet = new Set<FirstOrderSlotName>(changedSlots);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const slot: FirstOrderSlotName = i < 3 ? "color" : i < 6 ? "motif" : "arrangement";
    const multiplier = changedSet.has(slot) ? varySlotBoost : keepSlotScale;
    sum += FIRST_ORDER_WEIGHTS[i] * multiplier * (variantFlat[i] - assetFlat[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Round-level carrier assignment for probing hypothesis cards (rounds 1–3).
 *
 * Unlike assignDiverseNearestAnnotatedAssets (plain nearness + diversity penalty),
 * this function uses hypothesis-aware scoring: the vary-slot axes are weighted higher
 * so each carrier genuinely represents its hypothesis direction rather than just being
 * the nearest overall match.
 *
 * Assets are assigned greedily with strict uniqueness across the round:
 * - hardExcludeIds are filtered out before scoring (disliked refs)
 * - seenIds receive a soft penalty (seen refs)
 * - No two hypothesis cards in the same round will share a carrier
 */
export function assignProbingCarriers(
  hypotheses: Array<{
    key: string;
    variantValues: FirstOrderSlotValues;
    changedSlots: ReadonlyArray<FirstOrderSlotName>;
  }>,
  assets: AnnotatedAssetRecord[],
  options?: {
    hardExcludeIds?: string[];
    seenIds?: string[];
    seenPenalty?: number;
    varySlotBoost?: number;
    keepSlotScale?: number;
  }
): Record<string, Array<AnnotatedAssetRecord & { distance: number }>> {
  const hardExclude = new Set(options?.hardExcludeIds ?? []);
  const seenIds = options?.seenIds ?? [];
  const seenPenalty = options?.seenPenalty ?? 0.10;
  const varySlotBoost = options?.varySlotBoost ?? 2.0;
  const keepSlotScale = options?.keepSlotScale ?? 0.6;

  const candidates = assets.filter((a) => a.annotation && !hardExclude.has(a.imageId));
  const selectedIds = new Set<string>();
  const result: Record<string, Array<AnnotatedAssetRecord & { distance: number }>> = {};

  for (const hypothesis of hypotheses) {
    // Primary pass: pick best unselected candidate
    const ranked = candidates
      .filter((asset) => !selectedIds.has(asset.imageId))
      .map((asset) => {
        const baseDistance = scoreCarrierForHypothesis(
          hypothesis.variantValues,
          asset,
          hypothesis.changedSlots,
          varySlotBoost,
          keepSlotScale
        );
        const seenCount = seenIds.filter((id) => id === asset.imageId).length;
        return { ...asset, distance: baseDistance, score: baseDistance + seenCount * seenPenalty };
      })
      .sort((a, b) => a.score - b.score);

    const chosen = ranked[0];
    if (chosen) {
      result[hypothesis.key] = [{ ...chosen, distance: chosen.distance }];
      selectedIds.add(chosen.imageId);
      continue;
    }

    // Fallback: allow a repeat with a soft repeat penalty
    const fallback = candidates
      .map((asset) => {
        const baseDistance = scoreCarrierForHypothesis(
          hypothesis.variantValues,
          asset,
          hypothesis.changedSlots,
          varySlotBoost,
          keepSlotScale
        );
        const seenCount = seenIds.filter((id) => id === asset.imageId).length;
        const repeatPenalty = selectedIds.has(asset.imageId) ? 0.08 : 0;
        return { ...asset, distance: baseDistance, score: baseDistance + seenCount * 0.05 + repeatPenalty };
      })
      .sort((a, b) => a.score - b.score)[0];

    result[hypothesis.key] = fallback ? [{ ...fallback, distance: fallback.distance }] : [];
  }

  return result;
}
