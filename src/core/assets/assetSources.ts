import { realAnnotatedAssets } from "./realAnnotatedAssets";
import { realAnnotatedAssetsExtra } from "./realAnnotatedAssetsExtra";
import { seedPreannotations } from "./seedPreannotations";
import { extendedPreannotationsBatch1 } from "./extendedPreannotationsBatch1";
import type { AnnotatedAssetRecord } from "./types";

export type AssetSourceMode = "core-only" | "core+extended";

/**
 * Core layer = manually selected seed assets with draft semantic annotation.
 * Extended layer = broader retrieval pool from fixed extra downloads.
 * Batch 1 of extended assets now carries simplified pre-annotations so it can enter matching space.
 */
export const coreAnnotatedAssets: AnnotatedAssetRecord[] = seedPreannotations;

export const extendedRetrievalAssets: AnnotatedAssetRecord[] = [
  ...extendedPreannotationsBatch1,
  ...realAnnotatedAssetsExtra.filter((asset) => !extendedPreannotationsBatch1.some((annotated) => annotated.imageId === asset.imageId)),
];

export const allReferenceAssets: AnnotatedAssetRecord[] = [
  ...coreAnnotatedAssets,
  ...extendedRetrievalAssets,
  ...realAnnotatedAssets.filter((asset) => !coreAnnotatedAssets.some((core) => core.imageId === asset.imageId)),
];

export function getReferenceAssets(mode: AssetSourceMode): AnnotatedAssetRecord[] {
  if (mode === "core-only") {
    return coreAnnotatedAssets;
  }

  return [...coreAnnotatedAssets, ...extendedRetrievalAssets];
}
