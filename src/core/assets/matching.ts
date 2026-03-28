import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "./types";

const FIRST_ORDER_WEIGHTS = [0.55, 0.45, 0.4, 1.35, 1.35, 0.85, 1.25, 0.6, 1.15];

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
