import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "./types";

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

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

export function findNearestAnnotatedAssets(
  target: FirstOrderSlotValues,
  assets: AnnotatedAssetRecord[],
  limit = 3
): Array<AnnotatedAssetRecord & { distance: number }> {
  const targetVec = flattenFirstOrder(target);

  return assets
    .filter((asset) => asset.annotation)
    .map((asset) => ({
      ...asset,
      distance: euclideanDistance(targetVec, flattenFirstOrder(asset.annotation!.firstOrder)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
