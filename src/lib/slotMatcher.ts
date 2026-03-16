import type { ImageSlotValues, LibraryImage } from "@/types/domain";

// ---------------------------------------------------------------------------
// analyzeUploadedImage
// Draws the image onto a 50×50 canvas, reads pixel data, and derives
// colorPalette slot values. All other axes default to 0.5 (neutral).
// ---------------------------------------------------------------------------
export async function analyzeUploadedImage(file: File): Promise<ImageSlotValues> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const SIZE = 50;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        let totalH = 0, totalS = 0, totalL = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const { h, s, l } = rgbToHsl(r, g, b);
          totalH += h;
          totalS += s;
          totalL += l;
          count++;
        }

        const avgH = totalH / count; // 0–1
        const avgS = totalS / count; // 0–1
        const avgL = totalL / count; // 0–1

        // hueBias: warm hues (red/orange/yellow ~0–60° and ~300–360°) → high value
        // hue is 0–1 (wrapping). Warm range: 0–0.167 or 0.833–1.0
        const hueBias = computeWarmBias(avgH);

        resolve({
          colorPalette: {
            hueBias,
            saturation: avgS,
            lightness: avgL,
          },
          motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
          style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
          arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
          impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
          shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
          scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
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
// matchImages
// Euclidean distance in 21-dimensional slot space. Returns `count` closest
// images, with a diversity guarantee: at least one image per motif quadrant.
// ---------------------------------------------------------------------------
export function matchImages(
  query: ImageSlotValues,
  library: LibraryImage[],
  count: number
): LibraryImage[] {
  const queryVec = flattenSlots(query);

  const ranked = library
    .map((img) => ({
      img,
      dist: euclideanDistance(queryVec, flattenSlots(img.slots)),
    }))
    .sort((a, b) => a.dist - b.dist);

  // Diversity: pick at least one representative from each motif quadrant
  //   Q1: high geom + high complexity
  //   Q2: high organic + high complexity
  //   Q3: high geom + low complexity
  //   Q4: high organic + low complexity
  const quadrantPick = pickDiversityImages(ranked.map((r) => r.img));

  // Build result set: diversity picks first, then fill with top ranked (no dupes)
  const result: LibraryImage[] = [...quadrantPick];
  const resultIds = new Set(result.map((x) => x.id));

  for (const { img } of ranked) {
    if (result.length >= count) break;
    if (!resultIds.has(img.id)) {
      result.push(img);
      resultIds.add(img.id);
    }
  }

  return result.slice(0, count);
}

// ---------------------------------------------------------------------------
// composePromptFromSlots
// Threshold-based semantic anchor selection per axis.
// ---------------------------------------------------------------------------
export function composePromptFromSlots(slots: ImageSlotValues): string {
  const impression = selectAnchor(slots.impression.calmness, ["Intense", "Balanced", "Serene"]);
  const motifType = selectMotif(slots.motif);
  const arrangementDesc = selectAnchor(slots.arrangement.orderliness, [
    "a free-form scattered",
    "a balanced structured",
    "a strict grid",
  ]);
  const scaleDesc = selectAnchor(slots.scale.motifScale, ["small micro-detail", "medium balanced", "large statement"]);
  const colorDesc = composeColorDesc(slots.colorPalette);
  const styleDesc = selectStyle(slots.style);
  const shapeDesc = selectShape(slots.shape);

  return (
    `${impression} abstract textile pattern featuring ${motifType} ` +
    `arranged in ${arrangementDesc} layout with ${scaleDesc} scale ` +
    `using ${colorDesc} in a ${styleDesc} with ${shapeDesc}`
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
  // Warm: red (0–0.083), orange/yellow (0.083–0.167), pink/red (0.9–1.0)
  const distFromRed = Math.min(hue, 1 - hue); // 0 = pure red
  // Map: 0 → 1.0 (very warm), 0.5 → 0.0 (cool)
  return Math.max(0, 1 - distFromRed * 6);
}

function flattenSlots(slots: ImageSlotValues): number[] {
  return [
    slots.colorPalette.hueBias,
    slots.colorPalette.saturation,
    slots.colorPalette.lightness,
    slots.motif.geometryDegree,
    slots.motif.organicDegree,
    slots.motif.complexity,
    slots.style.graphicness,
    slots.style.painterlyDegree,
    slots.style.heritageSense,
    slots.arrangement.orderliness,
    slots.arrangement.density,
    slots.arrangement.directionality,
    slots.impression.calmness,
    slots.impression.energy,
    slots.impression.softness,
    slots.shape.angularity,
    slots.shape.edgeSoftness,
    slots.shape.irregularity,
    slots.scale.motifScale,
    slots.scale.rhythm,
    slots.scale.contrast,
  ];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function pickDiversityImages(ranked: LibraryImage[]): LibraryImage[] {
  const quadrants = [
    (img: LibraryImage) => img.slots.motif.geometryDegree > 0.5 && img.slots.motif.complexity > 0.5,
    (img: LibraryImage) => img.slots.motif.organicDegree > 0.5 && img.slots.motif.complexity > 0.5,
    (img: LibraryImage) => img.slots.motif.geometryDegree > 0.5 && img.slots.motif.complexity <= 0.5,
    (img: LibraryImage) => img.slots.motif.organicDegree > 0.5 && img.slots.motif.complexity <= 0.5,
  ];

  const picks: LibraryImage[] = [];
  const used = new Set<string>();
  for (const pred of quadrants) {
    const match = ranked.find((img) => !used.has(img.id) && pred(img));
    if (match) {
      picks.push(match);
      used.add(match.id);
    }
  }
  return picks;
}

function selectAnchor(value: number, anchors: [string, string, string]): string {
  if (value < 0.35) return anchors[0];
  if (value > 0.65) return anchors[2];
  return anchors[1];
}

function selectMotif(motif: ImageSlotValues["motif"]): string {
  if (motif.geometryDegree > 0.65 && motif.complexity > 0.65) return "intricate geometric lattice motifs";
  if (motif.geometryDegree > 0.65) return "clean geometric pattern motifs";
  if (motif.organicDegree > 0.65 && motif.complexity > 0.65) return "elaborate botanical and organic motifs";
  if (motif.organicDegree > 0.65) return "flowing organic natural motifs";
  if (motif.complexity > 0.65) return "detailed mixed-origin motifs";
  return "balanced geometric-organic motifs";
}

function composeColorDesc(cp: ImageSlotValues["colorPalette"]): string {
  const warmth = cp.hueBias > 0.6 ? "warm" : cp.hueBias < 0.4 ? "cool" : "neutral";
  const satWord = cp.saturation > 0.65 ? "vivid" : cp.saturation < 0.35 ? "muted" : "balanced";
  const lightWord = cp.lightness > 0.65 ? "light" : cp.lightness < 0.35 ? "deep" : "mid-tone";
  return `${satWord} ${warmth} ${lightWord} tones`;
}

function selectStyle(style: ImageSlotValues["style"]): string {
  if (style.heritageSense > 0.65) return "traditional heritage style";
  if (style.graphicness > 0.65) return "graphic contemporary style";
  if (style.painterlyDegree > 0.65) return "painterly expressive style";
  return "balanced mixed style";
}

function selectShape(shape: ImageSlotValues["shape"]): string {
  if (shape.angularity > 0.65) return "sharp angular edges";
  if (shape.edgeSoftness > 0.65) return "soft flowing edges";
  if (shape.irregularity > 0.65) return "irregular organic edges";
  return "balanced refined edges";
}
