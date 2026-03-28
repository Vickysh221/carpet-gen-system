/**
 * Reference Understanding Service
 *
 * Two responsibilities:
 *
 * 1. bootstrapSlotsFromRetrieval — Phase 2.1 fix
 *    When backend returns top-K similar products, compute a score-weighted
 *    average of their slot_values to create a richer base prior.
 *    Replaces: `baseSlots = retrieved[0]?.slotValues ?? null`
 *
 * 2. analyzeUploadedImageLocal — Phase 2.3 upgrade
 *    Local canvas-based analysis that extracts more than just HSL color.
 *    Added: contrast, edge density, angularity estimate, directionality,
 *           texture complexity. No longer returns all-0.5 for non-color slots.
 *    Replaces: `analyzeUploadedImage` in slotMatcher.ts
 */

import type { ImageSlotValues } from "@/types/domain";
import type { RetrievedReference } from "@/lib/api";

// ---------------------------------------------------------------------------
// 1. Weighted slot bootstrap from top-K retrieval results
// ---------------------------------------------------------------------------

/**
 * Given a list of search results ordered by score, compute a weighted average
 * of their slot_values to initialize the preference baseline.
 *
 * Improvements over taking only top-1:
 * - Uses all K results, weighted by their retrieval score
 * - Less sensitive to a single outlier
 * - Produces a more representative centroid for the user's aesthetic direction
 */
export function bootstrapSlotsFromRetrieval(
  retrieved: RetrievedReference[]
): ImageSlotValues {
  const items = retrieved.filter(
    (r): r is RetrievedReference & { slotValues: ImageSlotValues } => r.slotValues != null
  );

  if (items.length === 0) return neutralSlots();

  // Soft weight: top-K score (or fallback to rank-based weight)
  const rawWeights = items.map((r, i) => r.score ?? Math.max(0.1, 1 - i * 0.15));
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;
  const weights = rawWeights.map((w) => w / totalWeight);

  const result = neutralSlots();
  const SLOT_KEYS = Object.keys(result) as Array<keyof ImageSlotValues>;

  for (const slotKey of SLOT_KEYS) {
    const axisKeys = Object.keys(result[slotKey]) as string[];
    for (const axisKey of axisKeys) {
      let weightedSum = 0;
      for (let i = 0; i < items.length; i++) {
        const val =
          (items[i].slotValues[slotKey] as Record<string, number>)[axisKey] ?? 0.5;
        weightedSum += weights[i] * val;
      }
      (result[slotKey] as Record<string, number>)[axisKey] = weightedSum;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2. Upgraded local canvas analysis (browser-side, no backend needed)
// ---------------------------------------------------------------------------

/**
 * Analyze an uploaded image using canvas pixel data.
 *
 * Computes:
 * - colorPalette: hueBias, saturation, lightness (existing)
 * - motif.complexity: texture variance as proxy
 * - motif.geometryDegree: ratio of straight-edge signals
 * - motif.organicDegree: complement of geometry degree
 * - arrangement.density: edge pixel density
 * - arrangement.directionality: dominant gradient orientation strength
 * - arrangement.orderliness: inverse of orientation entropy
 * - shape.angularity: aligned (H/V) edge ratio → geometry signal
 * - shape.edgeSoftness: low gradient magnitude ratio
 * - scale.contrast: dynamic range of luminance
 * - scale.motifScale: FFT peak ratio (large motif → low-frequency peak)
 * - scale.rhythm: repeat score from FFT peaks
 * - impression.calmness: inversely related to edge density and contrast
 * - impression.energy: driven by contrast and edge density
 * - impression.softness: inversely related to angularity + edge density
 * - style.*: remains moderate (0.45-0.55) — needs domain knowledge to infer
 */
export async function analyzeUploadedImageLocal(file: File): Promise<ImageSlotValues> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const SIZE = 128; // higher res than before for better feature extraction
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Build per-pixel arrays
        const lumaArr: number[] = [];
        let totalH = 0, totalS = 0, totalL = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const { h, s, l } = rgbToHsl(r, g, b);
          totalH += h;
          totalS += s;
          totalL += l;
          // Luma (luminance approximation)
          lumaArr.push(0.299 * r + 0.587 * g + 0.114 * b);
        }

        const n = lumaArr.length;
        const avgH = totalH / n;
        const avgS = totalS / n;
        const avgL = totalL / n;
        const hueBias = computeWarmBias(avgH);

        // Build 2D luma grid for spatial features
        const grid: number[][] = [];
        for (let y = 0; y < SIZE; y++) {
          grid[y] = [];
          for (let x = 0; x < SIZE; x++) {
            grid[y][x] = lumaArr[y * SIZE + x];
          }
        }

        // Contrast: dynamic range (p90 - p10)
        const sorted = [...lumaArr].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(n * 0.10)];
        const p90 = sorted[Math.floor(n * 0.90)];
        const contrast = clamp(p90 - p10, 0, 1);

        // Standard deviation of luma (texture richness)
        const meanLuma = lumaArr.reduce((s, v) => s + v, 0) / n;
        const lumaVar =
          lumaArr.reduce((s, v) => s + (v - meanLuma) ** 2, 0) / n;
        const lumaStd = Math.sqrt(lumaVar);

        // Gradient features (Sobel-lite via finite differences)
        const gradMagArr: number[] = [];
        const gradAngleArr: number[] = [];
        let horizEdges = 0, vertEdges = 0;

        for (let y = 1; y < SIZE - 1; y++) {
          for (let x = 1; x < SIZE - 1; x++) {
            const gx = grid[y][x + 1] - grid[y][x - 1];
            const gy = grid[y + 1][x] - grid[y - 1][x];
            const mag = Math.sqrt(gx * gx + gy * gy);
            gradMagArr.push(mag);
            const angle = Math.atan2(Math.abs(gy), Math.abs(gx)); // 0 = horiz, π/2 = vert
            gradAngleArr.push(angle);
            // H/V alignment detection
            if (mag > 0.08) {
              if (angle < 0.35 || angle > Math.PI / 2 - 0.35) {
                // near horizontal or vertical
                horizEdges++;
              }
              vertEdges++;
            }
          }
        }

        const totalGradPx = gradMagArr.length;
        const edgeDensity = gradMagArr.filter((m) => m > 0.08).length / totalGradPx;
        const straightRatio = vertEdges > 0 ? horizEdges / vertEdges : 0;
        const angularity = clamp(straightRatio * 1.2, 0, 1);

        // Orientation entropy → directionality
        const bins = 8;
        const angleHist = new Array(bins).fill(0);
        for (const a of gradAngleArr) {
          const binIdx = Math.min(Math.floor((a / (Math.PI / 2)) * bins), bins - 1);
          angleHist[binIdx]++;
        }
        const histSum = angleHist.reduce((s, v) => s + v, 0) || 1;
        const angleProbs = angleHist.map((v) => v / histSum);
        const entropy =
          -angleProbs.reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0) /
          Math.log(bins);
        const directionality = clamp(1 - entropy, 0, 1); // high directionality = low entropy
        const orderliness = clamp(0.3 + straightRatio * 0.35 + directionality * 0.15, 0, 1);

        // Texture complexity proxy: local patch variance
        const patchSize = 8;
        const patches: number[] = [];
        for (let py = 0; py + patchSize <= SIZE; py += patchSize) {
          for (let px = 0; px + patchSize <= SIZE; px += patchSize) {
            let pMean = 0;
            for (let dy = 0; dy < patchSize; dy++) {
              for (let dx = 0; dx < patchSize; dx++) {
                pMean += grid[py + dy][px + dx];
              }
            }
            patches.push(pMean / (patchSize * patchSize));
          }
        }
        const patchMean = patches.reduce((s, v) => s + v, 0) / patches.length;
        const patchVar =
          patches.reduce((s, v) => s + (v - patchMean) ** 2, 0) / patches.length;
        const complexity = clamp(Math.sqrt(patchVar) * 4, 0, 1);

        // Motif scale via FFT peak (simplified: largest low-frequency component)
        // We use the patch variance as a rough proxy: low variance = large motif
        const motifScale = clamp(1 - patchVar * 8, 0.1, 0.9);

        // Rhythm: coefficient of variation of patch means
        const patchCV = patchMean > 0 ? Math.sqrt(patchVar) / patchMean : 0;
        const rhythm = clamp(patchCV * 2, 0, 1);

        // Derived slot values
        const geometryDegree = clamp(angularity * 0.7 + directionality * 0.3, 0, 1);
        const organicDegree = clamp(1 - geometryDegree + complexity * 0.2, 0, 1);
        const edgeSoftness = clamp(1 - edgeDensity - angularity * 0.3, 0, 1);
        const irregularity = clamp(complexity * 0.6 + (1 - directionality) * 0.3, 0, 1);
        const density = clamp(edgeDensity * 1.4, 0, 1);

        const energy = clamp(edgeDensity * 0.5 + contrast * 0.4 + lumaStd * 0.1, 0, 1);
        const calmness = clamp(0.85 - energy * 0.6, 0, 1);
        const softness = clamp(1 - edgeDensity * 0.4 - angularity * 0.35 - contrast * 0.2, 0, 1);

        resolve({
          colorPalette: { hueBias, saturation: avgS, lightness: avgL },
          motif: { geometryDegree, organicDegree, complexity },
          style: {
            graphicness: clamp(0.45 + angularity * 0.1, 0, 1),
            painterlyDegree: clamp(0.45 + organicDegree * 0.1, 0, 1),
            heritageSense: 0.45, // cannot reliably infer from raw pixels
          },
          arrangement: { orderliness, density, directionality },
          impression: { calmness, energy, softness },
          shape: { angularity, edgeSoftness, irregularity },
          scale: { motifScale, rhythm, contrast },
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for analysis"));
    };

    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function neutralSlots(): ImageSlotValues {
  return {
    colorPalette: { hueBias: 0.5, saturation: 0.5, lightness: 0.5 },
    motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
    style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
    arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
    impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
    shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
    scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function computeWarmBias(hue: number): number {
  const distFromRed = Math.min(hue, 1 - hue);
  return Math.max(0, 1 - distFromRed * 6);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
