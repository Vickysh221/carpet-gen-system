import type { AnnotatedAssetRecord } from "./types";

/**
 * Minimal engineering placeholder for the future FULI asset annotation system.
 * Start with a few hand-authored examples, then replace with real asset imports / generated JSON.
 */
export const mockAnnotatedAssets: AnnotatedAssetRecord[] = [
  {
    imageId: "fuli-seed-001",
    title: "Warm geometric anchor",
    imageUrl: "/placeholder-assets/fuli-seed-001.jpg",
    annotation: {
      imageId: "fuli-seed-001",
      firstOrder: {
        color: { warmth: 0.74, saturation: 0.42, lightness: 0.58 },
        motif: { geometry: 0.78, organic: 0.18, complexity: 0.36 },
        arrangement: { order: 0.71, spacing: 0.44, direction: 0.52 },
      },
      secondOrder: {
        impression: { calm: 0.61, energy: 0.29, softness: 0.48 },
        style: { graphic: 0.73, painterly: 0.16, heritage: 0.41 },
      },
      annotationSource: "manual",
      confidence: "high",
      notes: "Seed example for engineering structure only.",
    },
    roleMap: {
      imageId: "fuli-seed-001",
      roles: ["retrieval_anchor", "motif_prior", "evaluation_reference"],
      strongSlots: ["color", "motif", "style"],
      weakSlots: ["arrangement"],
      brandRepresentativeness: 0.78,
    },
    tags: ["warm", "geometric", "graphic"],
  },
  {
    imageId: "fuli-seed-002",
    title: "Organic airy reference",
    imageUrl: "/placeholder-assets/fuli-seed-002.jpg",
    annotation: {
      imageId: "fuli-seed-002",
      firstOrder: {
        color: { warmth: 0.59, saturation: 0.33, lightness: 0.67 },
        motif: { geometry: 0.24, organic: 0.81, complexity: 0.39 },
        arrangement: { order: 0.46, spacing: 0.72, direction: 0.41 },
      },
      secondOrder: {
        impression: { calm: 0.76, energy: 0.21, softness: 0.72 },
        style: { graphic: 0.28, painterly: 0.58, heritage: 0.34 },
      },
      annotationSource: "assisted",
      confidence: "medium",
      nearestSeedIds: ["fuli-seed-001"],
    },
    roleMap: {
      imageId: "fuli-seed-002",
      roles: ["retrieval_anchor", "arrangement_prior"],
      strongSlots: ["arrangement", "impression"],
      weakSlots: ["style"],
      brandRepresentativeness: 0.65,
    },
    tags: ["airy", "organic", "soft"],
  },
];
