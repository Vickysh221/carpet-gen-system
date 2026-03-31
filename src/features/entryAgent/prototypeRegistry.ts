import type { EntryAgentAxisHints, EntryAgentStatePatch, HighValueField, PrototypeRouteType } from "./types";

export interface PrototypeReadingTemplate {
  id: string;
  label: string;
  field: HighValueField;
  primarySlot: "color" | "motif" | "arrangement" | "impression";
  secondarySlots: Array<"color" | "motif" | "arrangement" | "impression">;
  polarity: "increase" | "decrease" | "mixed";
  strength: number;
  confidence: number;
  semanticHints?: Record<string, string | string[]>;
  axisHints: EntryAgentAxisHints;
  patchIntent: EntryAgentStatePatch;
  note: string;
}

export interface PrototypeDefinition {
  id: string;
  label: string;
  routeType: PrototypeRouteType;
  aliases: string[];
  rationale: string;
  semanticSummary?: string;
  slotSummary?: string;
  readings: PrototypeReadingTemplate[];
}

export const PROTOTYPE_REGISTRY: PrototypeDefinition[] = [
  {
    id: "coffee",
    label: "咖啡",
    routeType: "prototype-first",
    aliases: ["咖啡", "咖啡感", "咖色"],
    rationale: "偏暖、低刺激、带一点生活化陪伴感的 imagery prototype。",
    semanticSummary: "偏暖、低刺激、生活化陪伴感。",
    slotSummary: "主指向 color，次指向 impression softness。",
    readings: [
      {
        id: "coffee-color-warmth",
        label: "coffee warmth",
        field: "colorMood",
        primarySlot: "color",
        secondarySlots: ["impression"],
        polarity: "mixed",
        strength: 0.82,
        confidence: 0.78,
        semanticHints: {
          colorMood: "coffee",
          impression: "warm",
        },
        axisHints: {
          color: { warmth: 0.7, saturation: 0.4 },
          impression: { softness: 0.6 },
        },
        patchIntent: {
          color: { warmth: 0.12, saturation: -0.08 },
          impression: { softness: 0.06 },
        },
        note: "以偏暖、克制的颜色为主指向，并保留轻微柔和感。",
      },
    ],
  },
  {
    id: "natural-ease",
    label: "自然一点",
    routeType: "dual-route",
    aliases: ["自然一点", "更自然一点", "自然些"],
    rationale: "既可能落在图案更 organic，也可能带出颜色更收、氛围更松。",
    semanticSummary: "更自然生长感，少一点硬几何，同时允许颜色和氛围更收。",
    slotSummary: "主指向 motif，次指向 color 和 impression。",
    readings: [
      {
        id: "natural-organic",
        label: "natural organic",
        field: "patternTendency",
        primarySlot: "motif",
        secondarySlots: ["color", "impression"],
        polarity: "mixed",
        strength: 0.72,
        confidence: 0.62,
        semanticHints: {
          patternTendency: "natural",
        },
        axisHints: {
          motif: { organic: 0.64, geometry: 0.42 },
          color: { saturation: 0.44 },
          impression: { softness: 0.58 },
        },
        patchIntent: {
          motif: { organic: 0.1, geometry: -0.08 },
          color: { saturation: -0.04 },
          impression: { softness: 0.04 },
        },
        note: "以图案自然生长感为主，同时允许颜色和氛围更收一点。",
      },
    ],
  },
  {
    id: "visual-restraint",
    label: "不要太花",
    routeType: "direct-first-with-fallback",
    aliases: ["不要太花", "别太花"],
    rationale: "主指向通常是图案复杂度降低，但存在颜色也别太跳的歧义。",
    semanticSummary: "图案复杂度降低，视觉噪音更低，颜色 restraint 只是次解释。",
    slotSummary: "主指向 motif complexity，次指向 color saturation。",
    readings: [
      {
        id: "visual-restraint-pattern",
        label: "visual restraint pattern",
        field: "patternTendency",
        primarySlot: "motif",
        secondarySlots: ["color"],
        polarity: "decrease",
        strength: 0.68,
        confidence: 0.58,
        semanticHints: {
          patternComplexity: "lower",
        },
        axisHints: {
          motif: { complexity: 0.34 },
          color: { saturation: 0.42 },
        },
        patchIntent: {
          motif: { complexity: -0.1 },
          color: { saturation: -0.04 },
        },
        note: "prototype reading 认为主问题在图案复杂度，颜色克制是次指向。",
      },
    ],
  },
];
