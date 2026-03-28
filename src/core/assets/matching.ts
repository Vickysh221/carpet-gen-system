import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "./types";

const FIRST_ORDER_WEIGHTS = [
  0.55, // color.warmth
  0.45, // color.saturation
  0.4, // color.lightness
  1.35, // motif.geometry
  1.35, // motif.organic
  0.85, // motif.complexity
  1.25, // arrangement.order
  0.6, // arrangement.spacing
  1.15, // arrangement.direction
];

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
  return Math.sqrt(
    a.reduce((sum, value, index) => {
      const diff = value - b[index];
      return sum + FIRST_ORDER_WEIGHTS[index] * diff * diff;
    }, 0)
  );
}

function scoreAsset(target: FirstOrderSlotValues, asset: AnnotatedAssetRecord): number {
  if (!asset.annotation) {
    return Number.POSITIVE_INFINITY;
  }

  const targetVec = flattenFirstOrder(target);
  const assetVec = flattenFirstOrder(asset.annotation.firstOrder);
  return weightedDistance(targetVec, assetVec);
}

export function findNearestAnnotatedAssets(
  target: FirstOrderSlotValues,
  assets: AnnotatedAssetRecord[],
  limit = 3
): Array<AnnotatedAssetRecord & { distance: number }> {
  return assets
    .filter((asset) => asset.annotation)
    .map((asset) => ({
      ...asset,
      distance: scoreAsset(target, asset),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function findExploratoryAnnotatedAssets(
  target: FirstOrderSlotValues,
  assets: AnnotatedAssetRecord[],
  options?: {
    limit?: number;
    poolSize?: number;
    seenIds?: string[];
    noveltyBonus?: number;
  }
): Array<AnnotatedAssetRecord & { distance: number }> {
  const limit = options?.limit ?? 1;
  const poolSize = options?.poolSize ?? 8;
  const seenIds = options?.seenIds ?? [];
  const noveltyBonus = options?.noveltyBonus ?? 0.12;

  const ranked = findNearestAnnotatedAssets(target, assets, poolSize).map((asset, index) => {
    const seenCount = seenIds.filter((id) => id === asset.imageId).length;
    const noveltyAdjustment = seenCount * noveltyBonus + index * 0.015;
    return {
      ...asset,
      exploratoryScore: asset.distance + noveltyAdjustment,
    };
  });

  return ranked.sort((a, b) => a.exploratoryScore - b.exploratoryScore).slice(0, limit).map(({ exploratoryScore: _score, ...asset }) => asset);
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
  }
): Record<string, Array<AnnotatedAssetRecord & { distance: number }>> {
  const diversityPenalty = options?.diversityPenalty ?? 0.18;
  const nearDuplicatePenalty = options?.nearDuplicatePenalty ?? 0.08;
  const duplicateThreshold = options?.duplicateThreshold ?? 0.12;
  const explorationSeenIds = options?.explorationSeenIds ?? [];
  const noveltyBonus = options?.noveltyBonus ?? 0.12;
  const mode = options?.mode ?? "stable";

  const candidates = assets.filter((asset) => asset.annotation);
  const selectedIds: string[] = [];
  const result: Record<string, Array<AnnotatedAssetRecord & { distance: number }>> = {};

  for (const target of targets) {
    const ranked = candidates
      .map((asset, index) => {
        const baseDistance = scoreAsset(target.values, asset);
        const repeatCount = selectedIds.filter((id) => id === asset.imageId).length;
        const explorationRepeatCount = explorationSeenIds.filter((id) => id === asset.imageId).length;
        const diversityCost = repeatCount * diversityPenalty;
        const similarityCost = selectedIds.some((id) => {
          const selected = candidates.find((item) => item.imageId === id);
          if (!selected?.annotation || !asset.annotation) return false;
          const selectedVec = flattenFirstOrder(selected.annotation.firstOrder);
          const assetVec = flattenFirstOrder(asset.annotation.firstOrder);
          return weightedDistance(selectedVec, assetVec) < duplicateThreshold;
        })
          ? nearDuplicatePenalty
          : 0;
        const noveltyCost = mode === "explore" ? explorationRepeatCount * noveltyBonus + index * 0.01 : 0;

        return {
          ...asset,
          distance: baseDistance,
          score: baseDistance + diversityCost + similarityCost + noveltyCost,
        };
      })
      .sort((a, b) => a.score - b.score);

    const chosen = ranked[0];
    if (chosen) {
      selectedIds.push(chosen.imageId);
      result[target.key] = [{ ...chosen, distance: chosen.distance }];
    } else {
      result[target.key] = [];
    }
  }

  return result;
}
