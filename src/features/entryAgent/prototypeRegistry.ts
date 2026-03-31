import type {
  EntryAgentAxisHints,
  EntryAgentAxisPath,
  EntryAgentStatePatch,
  HighValueField,
  NarrativeOwnershipClass,
  PrototypeRouteType,
  QuestionKind,
} from "./types";

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
  defaultOwnershipClass?: NarrativeOwnershipClass;
  defaultQuestionKindHint?: QuestionKind;
  defaultDisambiguationAxes?: EntryAgentAxisPath[];
  defaultInformationGainHint?: string;
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
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "anchor",
    defaultDisambiguationAxes: ["color.warmth", "impression.softness"],
    defaultInformationGainHint: "用户回答后，可减少当前表达更接近咖啡式日常陪伴原型，还是只是在说一般暖色感的不确定性。",
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
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "clarify",
    defaultDisambiguationAxes: ["motif.geometry", "motif.organic"],
    defaultInformationGainHint: "用户回答后，可减少“自然一点”是在说图案更 organic，还是只是不想太几何的不确定性。",
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
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "clarify",
    defaultDisambiguationAxes: ["motif.complexity", "color.saturation"],
    defaultInformationGainHint: "用户回答后，可减少“不要太花”是在说图案复杂度，还是颜色不要太跳的不确定性。",
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
  {
    id: "coffee-time",
    label: "咖啡时光",
    routeType: "prototype-first",
    aliases: ["咖啡时光"],
    rationale: "比单纯咖啡更偏日常仪式感和轻陪伴感的生活方式原型。",
    semanticSummary: "偏暖、低刺激、日常放松、仪式感但不重。",
    slotSummary: "主指向 color，次指向 impression calm/softness。",
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "anchor",
    defaultDisambiguationAxes: ["color.warmth", "impression.softness"],
    defaultInformationGainHint: "用户回答后，可减少当前表达是在要咖啡时光式的日常陪伴感，还是一般暖和印象的不确定性。",
    readings: [
      {
        id: "coffee-time-ritual",
        label: "coffee time ritual",
        field: "colorMood",
        primarySlot: "color",
        secondarySlots: ["impression"],
        polarity: "mixed",
        strength: 0.8,
        confidence: 0.78,
        semanticHints: {
          colorMood: "coffee-time",
          impression: "warm",
        },
        axisHints: {
          color: { warmth: 0.68, saturation: 0.38 },
          impression: { calm: 0.62, softness: 0.64 },
        },
        patchIntent: {
          color: { warmth: 0.1, saturation: -0.08 },
          impression: { calm: 0.06, softness: 0.08 },
        },
        note: "以日常仪式感的暖色和轻柔陪伴感为主。",
      },
    ],
  },
  {
    id: "quiet-daily",
    label: "安静日常感",
    routeType: "prototype-first",
    aliases: ["安静日常感"],
    rationale: "偏低刺激、稳定、日常可久处的生活方式原型。",
    semanticSummary: "低刺激、安静、自然陪伴、不过度表现。",
    slotSummary: "主指向 impression，次指向 motif restraint。",
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "anchor",
    defaultDisambiguationAxes: ["impression.calm", "impression.softness"],
    defaultInformationGainHint: "用户回答后，可减少当前表达是在要安静日常原型，还是只是一般安静柔和印象的不确定性。",
    readings: [
      {
        id: "quiet-daily-main",
        label: "quiet daily",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: ["motif"],
        polarity: "increase",
        strength: 0.8,
        confidence: 0.76,
        semanticHints: {
          impression: "calm",
          lifestyle: "daily",
        },
        axisHints: {
          impression: { calm: 0.76, softness: 0.66 },
          motif: { complexity: 0.4 },
        },
        patchIntent: {
          impression: { calm: 0.12, softness: 0.08 },
          motif: { complexity: -0.06 },
        },
        note: "以低刺激安静感为主，同时让图案别太满太抢。",
      },
    ],
  },
  {
    id: "light-companionship",
    label: "轻陪伴感",
    routeType: "prototype-first",
    aliases: ["轻陪伴感"],
    rationale: "比温暖更轻、比陪伴感更克制的细弱日常氛围原型。",
    semanticSummary: "轻柔、陪伴、不过度占据注意力。",
    slotSummary: "主指向 impression softness，次指向 color warmth。",
    defaultOwnershipClass: "primary-eligible",
    defaultQuestionKindHint: "anchor",
    defaultDisambiguationAxes: ["impression.softness", "impression.calm"],
    defaultInformationGainHint: "用户回答后，可减少用户是想要轻陪伴原型，还是只是在说温暖柔和的不确定性。",
    readings: [
      {
        id: "light-companionship-main",
        label: "light companionship",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: ["color"],
        polarity: "increase",
        strength: 0.78,
        confidence: 0.74,
        semanticHints: {
          impression: "warm",
          companionship: "light",
        },
        axisHints: {
          impression: { softness: 0.74, calm: 0.62 },
          color: { warmth: 0.58 },
        },
        patchIntent: {
          impression: { softness: 0.1, calm: 0.06 },
          color: { warmth: 0.04 },
        },
        note: "把陪伴感控制在轻柔、不冷、不抢的范围。",
      },
    ],
  },
  {
    id: "subtle-presence",
    label: "若有若无",
    routeType: "prototype-first",
    aliases: ["草色遥看近却无", "若有若无", "轻存在感"],
    rationale: "强调近乎不可见但并非缺席的 subtle presence 原型。",
    semanticSummary: "轻微存在、低对比、不是空白、也不是明确抢眼。",
    slotSummary: "主指向 color saturation，次指向 impression energy。",
    defaultOwnershipClass: "secondary-only",
    defaultQuestionKindHint: "strength",
    defaultDisambiguationAxes: ["color.saturation", "impression.energy"],
    defaultInformationGainHint: "用户回答后，可减少这个 subtle cue 是否真要保留轻微存在感，还是只是不要太显眼的不确定性。",
    readings: [
      {
        id: "subtle-presence-color",
        label: "subtle presence color",
        field: "colorMood",
        primarySlot: "color",
        secondarySlots: ["impression"],
        polarity: "decrease",
        strength: 0.62,
        confidence: 0.66,
        semanticHints: {
          colorMood: "subtle-presence",
        },
        axisHints: {
          color: { saturation: 0.28, warmth: 0.54 },
          impression: { energy: 0.42, calm: 0.62 },
        },
        patchIntent: {
          color: { saturation: -0.08 },
          impression: { calm: 0.04 },
        },
        note: "更适合作为 subtle color presence 的次级解释，而不是直接主导 narrative。",
      },
    ],
  },
];
