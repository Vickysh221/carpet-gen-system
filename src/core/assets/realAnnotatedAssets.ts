import { productAssets } from "./productAssetIndex";
import type { AnnotatedAssetRecord } from "./types";

/**
 * Bridge layer:
 * turns real product assets into AnnotatedAssetRecords,
 * even before annotations are fully available.
 */
export const realAnnotatedAssets: AnnotatedAssetRecord[] = productAssets.map((asset) => ({
  imageId: asset.imageId,
  title: asset.title,
  imageUrl: asset.imageUrl,
}));
