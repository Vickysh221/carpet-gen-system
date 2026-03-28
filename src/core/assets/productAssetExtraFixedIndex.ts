import productAssetExtraFixedIndex from "./generated/productAssetExtraFixedIndex.json";

export interface ProductAssetExtraFixedIndexRecord {
  imageId: string;
  title: string;
  imageUrl: string;
  filename: string;
  sourceUrl: string;
  remoteImageUrl: string;
}

export const productAssetsExtraFixed = productAssetExtraFixedIndex as ProductAssetExtraFixedIndexRecord[];
