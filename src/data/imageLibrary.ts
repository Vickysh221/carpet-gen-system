import type { LibraryImage } from "@/types/domain";

import img1 from "@/assets/b6dd505b250571fc53f58ad0fe392a93a3e7846a.png";
import img2 from "@/assets/13f99fecf4d10fae2e2ed4ba4174fc87fa3a3f96.png";
import img3 from "@/assets/c9e88114ceab979959b9b9326e445337371e2024.png";
import img4 from "@/assets/f388e72e028f6996638daecb2e4f1ddef9acc8f5.png";
import img5 from "@/assets/4d380627eec25cb6130ce419a12e70cf321ae37e.png";
import img6 from "@/assets/4f1130b3dd48bbf02568141e8d683b8f8a7a6fb5.png";
import img7 from "@/assets/fd407a342467125411c172ada697b4ff5262c37b.png";
import img8 from "@/assets/2219ff8640fb32b5fe4d36035933e968ad811d29.png";
import img9 from "@/assets/3b0f7e643a37e50bcc084af66c1676c7548863fd.png";
import img10 from "@/assets/06b2a022fae9627b99cd7cdcbde93041c712c19e.png";
import img11 from "@/assets/5802c8bd2d23935230bf071ebeffba91a400c6bd.png";
import img12 from "@/assets/a4a5725df8c842a1d1123ea35fafaec34755333e.png";

export const imageLibrary: LibraryImage[] = [
  {
    id: "lib-001",
    src: img1,
    name: "暖赭几何",
    tags: ["geometric", "warm", "structured", "heritage"],
    slots: {
      colorPalette: { hueBias: 0.75, saturation: 0.65, lightness: 0.45 },
      motif: { geometryDegree: 0.85, organicDegree: 0.15, complexity: 0.6 },
      style: { graphicness: 0.8, painterlyDegree: 0.2, heritageSense: 0.75 },
      arrangement: { orderliness: 0.9, density: 0.6, directionality: 0.5 },
      impression: { calmness: 0.55, energy: 0.45, softness: 0.3 },
      shape: { angularity: 0.85, edgeSoftness: 0.15, irregularity: 0.2 },
      scale: { motifScale: 0.55, rhythm: 0.85, contrast: 0.65 },
    },
    prompt:
      "Serene abstract textile pattern featuring bold geometric lattice motifs arranged in a strict grid repetition with medium-scale tiling using warm terracotta and amber tones in a graphic heritage style with crisp angular edges",
  },
  {
    id: "lib-002",
    src: img2,
    name: "冷青有机",
    tags: ["organic", "cool", "fluid", "modern"],
    slots: {
      colorPalette: { hueBias: 0.2, saturation: 0.55, lightness: 0.55 },
      motif: { geometryDegree: 0.2, organicDegree: 0.8, complexity: 0.5 },
      style: { graphicness: 0.35, painterlyDegree: 0.65, heritageSense: 0.25 },
      arrangement: { orderliness: 0.3, density: 0.45, directionality: 0.4 },
      impression: { calmness: 0.75, energy: 0.25, softness: 0.7 },
      shape: { angularity: 0.2, edgeSoftness: 0.8, irregularity: 0.6 },
      scale: { motifScale: 0.6, rhythm: 0.4, contrast: 0.4 },
    },
    prompt:
      "Tranquil abstract textile pattern featuring flowing botanical vine motifs arranged in a loose scattered layout with large organic shapes using cool teal and seafoam tones in a painterly modern style with soft curved edges",
  },
  {
    id: "lib-003",
    src: img3,
    name: "深暗繁密",
    tags: ["dense", "dark", "complex", "ornate"],
    slots: {
      colorPalette: { hueBias: 0.6, saturation: 0.5, lightness: 0.2 },
      motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.9 },
      style: { graphicness: 0.6, painterlyDegree: 0.4, heritageSense: 0.85 },
      arrangement: { orderliness: 0.7, density: 0.95, directionality: 0.5 },
      impression: { calmness: 0.4, energy: 0.6, softness: 0.3 },
      shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.4 },
      scale: { motifScale: 0.3, rhythm: 0.75, contrast: 0.8 },
    },
    prompt:
      "Intense abstract textile pattern featuring intricate arabesque medallion motifs arranged in an all-over dense fill with small-scale micro-repeat using deep indigo and charcoal tones in a graphic traditional style with refined mixed edges",
  },
  {
    id: "lib-004",
    src: img4,
    name: "明亮简约",
    tags: ["minimal", "bright", "clean", "modern"],
    slots: {
      colorPalette: { hueBias: 0.5, saturation: 0.3, lightness: 0.85 },
      motif: { geometryDegree: 0.7, organicDegree: 0.3, complexity: 0.2 },
      style: { graphicness: 0.9, painterlyDegree: 0.1, heritageSense: 0.1 },
      arrangement: { orderliness: 0.85, density: 0.2, directionality: 0.3 },
      impression: { calmness: 0.9, energy: 0.1, softness: 0.6 },
      shape: { angularity: 0.6, edgeSoftness: 0.4, irregularity: 0.1 },
      scale: { motifScale: 0.7, rhythm: 0.6, contrast: 0.3 },
    },
    prompt:
      "Calm abstract textile pattern featuring minimal geometric stripe motifs arranged in an orderly sparse layout with large-scale clean repeat using pale ivory and soft white tones in a graphic contemporary style with precise clean edges",
  },
  {
    id: "lib-005",
    src: img5,
    name: "橙红活力",
    tags: ["vibrant", "warm", "energetic", "folk"],
    slots: {
      colorPalette: { hueBias: 0.85, saturation: 0.9, lightness: 0.5 },
      motif: { geometryDegree: 0.6, organicDegree: 0.4, complexity: 0.65 },
      style: { graphicness: 0.75, painterlyDegree: 0.25, heritageSense: 0.6 },
      arrangement: { orderliness: 0.6, density: 0.7, directionality: 0.6 },
      impression: { calmness: 0.2, energy: 0.9, softness: 0.2 },
      shape: { angularity: 0.7, edgeSoftness: 0.3, irregularity: 0.35 },
      scale: { motifScale: 0.5, rhythm: 0.8, contrast: 0.85 },
    },
    prompt:
      "Energetic abstract textile pattern featuring bold diamond and chevron motifs arranged in a directional diagonal repeat with medium-scale high-contrast using vivid orange and crimson tones in a graphic folk style with sharp angular edges",
  },
  {
    id: "lib-006",
    src: img6,
    name: "淡雅花卉",
    tags: ["floral", "pastel", "soft", "romantic"],
    slots: {
      colorPalette: { hueBias: 0.9, saturation: 0.4, lightness: 0.75 },
      motif: { geometryDegree: 0.1, organicDegree: 0.9, complexity: 0.55 },
      style: { graphicness: 0.2, painterlyDegree: 0.8, heritageSense: 0.4 },
      arrangement: { orderliness: 0.5, density: 0.55, directionality: 0.3 },
      impression: { calmness: 0.7, energy: 0.3, softness: 0.9 },
      shape: { angularity: 0.1, edgeSoftness: 0.9, irregularity: 0.65 },
      scale: { motifScale: 0.55, rhythm: 0.5, contrast: 0.25 },
    },
    prompt:
      "Soft abstract textile pattern featuring delicate floral bloom motifs arranged in a naturalistic scattered layout with medium organic scale using blush pink and pale rose tones in a painterly romantic style with soft petal-like edges",
  },
  {
    id: "lib-007",
    src: img7,
    name: "蓝白经典",
    tags: ["classic", "blue-white", "geometric", "traditional"],
    slots: {
      colorPalette: { hueBias: 0.15, saturation: 0.7, lightness: 0.6 },
      motif: { geometryDegree: 0.75, organicDegree: 0.25, complexity: 0.5 },
      style: { graphicness: 0.7, painterlyDegree: 0.3, heritageSense: 0.8 },
      arrangement: { orderliness: 0.85, density: 0.5, directionality: 0.5 },
      impression: { calmness: 0.65, energy: 0.35, softness: 0.45 },
      shape: { angularity: 0.65, edgeSoftness: 0.35, irregularity: 0.25 },
      scale: { motifScale: 0.5, rhythm: 0.8, contrast: 0.75 },
    },
    prompt:
      "Serene abstract textile pattern featuring classic geometric tile motifs arranged in a symmetrical grid repeat with balanced medium scale using cobalt blue and crisp white tones in a graphic traditional style with precise angular edges",
  },
  {
    id: "lib-008",
    src: img8,
    name: "绿意盎然",
    tags: ["green", "nature", "fresh", "botanical"],
    slots: {
      colorPalette: { hueBias: 0.35, saturation: 0.6, lightness: 0.5 },
      motif: { geometryDegree: 0.15, organicDegree: 0.85, complexity: 0.6 },
      style: { graphicness: 0.4, painterlyDegree: 0.6, heritageSense: 0.3 },
      arrangement: { orderliness: 0.35, density: 0.6, directionality: 0.35 },
      impression: { calmness: 0.8, energy: 0.2, softness: 0.65 },
      shape: { angularity: 0.15, edgeSoftness: 0.85, irregularity: 0.7 },
      scale: { motifScale: 0.65, rhythm: 0.45, contrast: 0.45 },
    },
    prompt:
      "Tranquil abstract textile pattern featuring lush leaf and fern motifs arranged in a naturalistic flowing layout with large botanical scale using forest green and sage tones in a painterly nature style with organic flowing edges",
  },
  {
    id: "lib-009",
    src: img9,
    name: "紫金华贵",
    tags: ["luxurious", "purple", "gold", "ornate"],
    slots: {
      colorPalette: { hueBias: 0.72, saturation: 0.75, lightness: 0.4 },
      motif: { geometryDegree: 0.4, organicDegree: 0.6, complexity: 0.8 },
      style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.9 },
      arrangement: { orderliness: 0.75, density: 0.8, directionality: 0.5 },
      impression: { calmness: 0.45, energy: 0.55, softness: 0.5 },
      shape: { angularity: 0.4, edgeSoftness: 0.6, irregularity: 0.35 },
      scale: { motifScale: 0.45, rhythm: 0.7, contrast: 0.7 },
    },
    prompt:
      "Stately abstract textile pattern featuring ornate damask medallion motifs arranged in a formal symmetric fill with medium-ornate scale using deep violet and antique gold tones in a painterly heritage style with curved decorative edges",
  },
  {
    id: "lib-010",
    src: img10,
    name: "黑白抽象",
    tags: ["abstract", "monochrome", "modern", "graphic"],
    slots: {
      colorPalette: { hueBias: 0.5, saturation: 0.05, lightness: 0.5 },
      motif: { geometryDegree: 0.55, organicDegree: 0.45, complexity: 0.7 },
      style: { graphicness: 0.95, painterlyDegree: 0.05, heritageSense: 0.15 },
      arrangement: { orderliness: 0.45, density: 0.65, directionality: 0.55 },
      impression: { calmness: 0.5, energy: 0.5, softness: 0.2 },
      shape: { angularity: 0.6, edgeSoftness: 0.4, irregularity: 0.55 },
      scale: { motifScale: 0.5, rhythm: 0.55, contrast: 0.95 },
    },
    prompt:
      "Bold abstract textile pattern featuring high-contrast geometric abstract motifs arranged in an asymmetric dynamic layout with varied scale using pure black and white tones in a graphic contemporary style with strong defined edges",
  },
  {
    id: "lib-011",
    src: img11,
    name: "沙漠沉香",
    tags: ["earthy", "neutral", "textured", "minimal"],
    slots: {
      colorPalette: { hueBias: 0.7, saturation: 0.35, lightness: 0.6 },
      motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.35 },
      style: { graphicness: 0.55, painterlyDegree: 0.45, heritageSense: 0.5 },
      arrangement: { orderliness: 0.6, density: 0.35, directionality: 0.4 },
      impression: { calmness: 0.85, energy: 0.15, softness: 0.55 },
      shape: { angularity: 0.45, edgeSoftness: 0.55, irregularity: 0.4 },
      scale: { motifScale: 0.6, rhythm: 0.55, contrast: 0.35 },
    },
    prompt:
      "Calm abstract textile pattern featuring subtle texture weave motifs arranged in a relaxed open layout with medium natural scale using sand and warm taupe tones in a mixed minimal style with softly defined edges",
  },
  {
    id: "lib-012",
    src: img12,
    name: "红黑锐利",
    tags: ["bold", "red-black", "high-contrast", "dramatic"],
    slots: {
      colorPalette: { hueBias: 0.95, saturation: 0.95, lightness: 0.35 },
      motif: { geometryDegree: 0.8, organicDegree: 0.2, complexity: 0.6 },
      style: { graphicness: 0.9, painterlyDegree: 0.1, heritageSense: 0.45 },
      arrangement: { orderliness: 0.7, density: 0.6, directionality: 0.65 },
      impression: { calmness: 0.1, energy: 0.95, softness: 0.1 },
      shape: { angularity: 0.9, edgeSoftness: 0.1, irregularity: 0.25 },
      scale: { motifScale: 0.55, rhythm: 0.75, contrast: 0.95 },
    },
    prompt:
      "Intense abstract textile pattern featuring sharp geometric diamond motifs arranged in a bold directional repeat with medium dramatic scale using vivid red and deep black tones in a graphic strong style with razor-sharp angular edges",
  },
];
