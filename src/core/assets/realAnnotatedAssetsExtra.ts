import { productAssetsExtraFixed } from "./productAssetExtraFixedIndex";
import type { AnnotatedAssetRecord } from "./types";

/**
 * Extended retrieval layer:
 * real downloaded assets without full semantic annotation yet.
 * These should expand the retrieval/reference pool, not replace core seed assets.
 */
export const realAnnotatedAssetsExtra: AnnotatedAssetRecord[] = productAssetsExtraFixed.map((asset) => ({
  imageId: asset.imageId,
  title: asset.title,
  imageUrl: asset.imageUrl,
  tags: ["extended", "unannotated"],
}));
