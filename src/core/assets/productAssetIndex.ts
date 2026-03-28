import productAssetIndex from "./generated/productAssetIndex.json";

export interface ProductAssetIndexRecord {
  imageId: string;
  title: string;
  imageUrl: string;
  filename: string;
}

export const productAssets = productAssetIndex as ProductAssetIndexRecord[];
