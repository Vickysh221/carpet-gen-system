import type { AnnotatedAssetRecord, AssetSlotAnnotation } from "./types";

/**
 * Engineering skeleton only:
 * - today: supports manual seeds + inherited/assisted annotations
 * - later: can be backed by embedding nearest neighbors, cluster priors, or VLM labeling.
 */
export function pickNearestAnnotatedSeeds(
  targetId: string,
  assets: AnnotatedAssetRecord[],
  limit = 3
): AnnotatedAssetRecord[] {
  return assets
    .filter((asset) => asset.imageId !== targetId && asset.annotation)
    .slice(0, limit);
}

export function inheritInitialAnnotation(
  imageId: string,
  seeds: AnnotatedAssetRecord[]
): AssetSlotAnnotation | null {
  if (seeds.length === 0) return null;

  const valid = seeds.filter((seed) => seed.annotation);
  if (valid.length === 0) return null;

  const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    imageId,
    firstOrder: {
      color: {
        warmth: avg(valid.map((seed) => seed.annotation!.firstOrder.color.warmth)),
        saturation: avg(valid.map((seed) => seed.annotation!.firstOrder.color.saturation)),
        lightness: avg(valid.map((seed) => seed.annotation!.firstOrder.color.lightness)),
      },
      motif: {
        geometry: avg(valid.map((seed) => seed.annotation!.firstOrder.motif.geometry)),
        organic: avg(valid.map((seed) => seed.annotation!.firstOrder.motif.organic)),
        complexity: avg(valid.map((seed) => seed.annotation!.firstOrder.motif.complexity)),
      },
      arrangement: {
        order: avg(valid.map((seed) => seed.annotation!.firstOrder.arrangement.order)),
        spacing: avg(valid.map((seed) => seed.annotation!.firstOrder.arrangement.spacing)),
        direction: avg(valid.map((seed) => seed.annotation!.firstOrder.arrangement.direction)),
      },
    },
    annotationSource: "inherited",
    confidence: "low",
    nearestSeedIds: valid.map((seed) => seed.imageId),
    notes: "Auto-initialized from nearest annotated seeds. Needs review.",
  };
}
