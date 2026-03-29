import { realAnnotatedAssets } from "./realAnnotatedAssets";
import { realAnnotatedAssetsExtra } from "./realAnnotatedAssetsExtra";
import { seedPreannotations } from "./seedPreannotations";
import { extendedPreannotationsBatch1 } from "./extendedPreannotationsBatch1";
import { extendedPreannotationsBatch2 } from "./extendedPreannotationsBatch2";
import { extendedPreannotationsBatch3 } from "./extendedPreannotationsBatch3";
import type { AnnotatedAssetRecord } from "./types";

export type AssetSourceMode = "core-only" | "core+extended";

export const coreAnnotatedAssets: AnnotatedAssetRecord[] = seedPreannotations;

const extendedAnnotatedAssets = [
  ...extendedPreannotationsBatch1,
  ...extendedPreannotationsBatch2,
  ...extendedPreannotationsBatch3,
];

export const extendedRetrievalAssets: AnnotatedAssetRecord[] = [
  ...extendedAnnotatedAssets,
  ...realAnnotatedAssetsExtra.filter((asset) => !extendedAnnotatedAssets.some((annotated) => annotated.imageId === asset.imageId)),
];

export const allReferenceAssets: AnnotatedAssetRecord[] = [
  ...coreAnnotatedAssets,
  ...extendedRetrievalAssets,
  ...realAnnotatedAssets.filter((asset) => !coreAnnotatedAssets.some((core) => core.imageId === asset.imageId)),
];

export function getReferenceAssets(mode: AssetSourceMode): AnnotatedAssetRecord[] {
  if (mode === "core-only") return coreAnnotatedAssets;
  return [...coreAnnotatedAssets, ...extendedRetrievalAssets];
}
