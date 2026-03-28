import { realAnnotatedAssets } from "./realAnnotatedAssets";
import { realAnnotatedAssetsExtra } from "./realAnnotatedAssetsExtra";
import { seedPreannotations } from "./seedPreannotations";
import type { AnnotatedAssetRecord } from "./types";

export type AssetSourceMode = "core-only" | "core+extended";

/**
 * Core layer = manually selected seed assets with draft semantic annotation.
 * Extended layer = broader retrieval pool from fixed extra downloads, currently unannotated.
 */
export const coreAnnotatedAssets: AnnotatedAssetRecord[] = seedPreannotations;

export const extendedRetrievalAssets: AnnotatedAssetRecord[] = realAnnotatedAssetsExtra;

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
