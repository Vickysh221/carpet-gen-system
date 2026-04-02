import { POETIC_MAPPINGS, type PoeticMapping, type PoeticSlotDelta } from "./poeticMappings";
import type { EntryAgentAxisHints, FuliSemanticCanvas, HighValueField, PatternIntentState } from "./types";

export interface PoeticMappingHit {
  key: PoeticMapping["key"];
  matchedText: string;
  matchSource: "key" | "alias";
  weight: number;
  mapping: PoeticMapping;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function averageRecord(values: Array<Record<string, number> | undefined>, weights: number[]) {
  const totals = new Map<string, { weighted: number; weight: number }>();

  values.forEach((record, index) => {
    if (!record) return;
    const weight = weights[index];
    Object.entries(record).forEach(([key, value]) => {
      if (typeof value !== "number") return;
      const current = totals.get(key) ?? { weighted: 0, weight: 0 };
      current.weighted += value * weight;
      current.weight += weight;
      totals.set(key, current);
    });
  });

  if (totals.size === 0) return undefined;

  return [...totals.entries()].reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = Number((value.weighted / value.weight).toFixed(3));
    return acc;
  }, {});
}

function scoreMatch(mapping: PoeticMapping, matchedText: string) {
  const normalizedMatch = normalizeText(matchedText);
  return Number((mapping.weight * (1 + normalizedMatch.length * 0.015)).toFixed(3));
}

function findBestMatchedText(text: string, mapping: PoeticMapping) {
  const candidates = [mapping.key, ...mapping.aliases]
    .map((candidate) => ({ candidate, normalized: normalizeText(candidate) }))
    .filter((candidate) => candidate.normalized.length > 0 && text.includes(candidate.normalized))
    .sort((left, right) => right.normalized.length - left.normalized.length);

  return candidates[0];
}

export function extractPoeticMappingsFromText(text: string): PoeticMappingHit[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return POETIC_MAPPINGS
    .map((mapping) => {
      const matched = findBestMatchedText(normalized, mapping);
      if (!matched) return undefined;
      return {
        key: mapping.key,
        matchedText: matched.candidate,
        matchSource: matched.candidate === mapping.key ? "key" : "alias",
        weight: scoreMatch(mapping, matched.candidate),
        mapping,
      } satisfies PoeticMappingHit;
    })
    .filter((hit): hit is PoeticMappingHit => Boolean(hit))
    .sort((left, right) => right.weight - left.weight);
}

function aggregatePoeticSlotDelta(hits: PoeticMappingHit[]): PoeticSlotDelta {
  const weights = hits.map((hit) => hit.weight);
  const color = averageRecord(hits.map((hit) => hit.mapping.slotDelta.color), weights);
  const impression = averageRecord(hits.map((hit) => hit.mapping.slotDelta.impression), weights);
  const patternIntent = averageRecord(hits.map((hit) => hit.mapping.slotDelta.patternIntent), weights);
  const presence = averageRecord(hits.map((hit) => hit.mapping.slotDelta.presence), weights);

  return {
    color,
    impression,
    patternIntent,
    presence,
  };
}

function buildColorSemanticHint(delta: NonNullable<PoeticSlotDelta["color"]>) {
  const saturation = delta.saturation ?? 0;
  const haze = delta.haze ?? 0;
  const temperature = delta.temperature ?? 0;

  if (temperature >= 0.22) return "warm";
  if (saturation <= -0.22 || haze >= 0.4) return "muted";
  return undefined;
}

function buildImpressionSemanticHint(delta: NonNullable<PoeticSlotDelta["impression"]>) {
  const calm = delta.calm ?? 0;
  const softness = delta.softness ?? 0;
  const warmth = delta.warmth ?? 0;
  const energetic = delta.energetic ?? 0;

  if (energetic >= 0.56 || warmth >= 0.64) return "energetic";
  if (warmth >= 0.42) return "warm";
  if (calm >= 0.56 || softness >= 0.52) return "calm";
  if (softness >= 0.4) return "soft";
  return undefined;
}

function buildPatternSemanticHints(delta: NonNullable<PoeticSlotDelta["patternIntent"]>) {
  const hints: Record<string, string> = {};
  const density = delta.density ?? 0;
  const geometry = delta.geometry ?? 0;
  const flow = delta.flow ?? 0;
  const figurativeness = delta.figurativeness ?? 0;

  if (density <= -0.18) {
    hints.patternComplexity = "lower";
  }
  if (geometry <= 0.12 && (flow >= 0.28 || figurativeness >= 0.28)) {
    hints.patternTendency = "natural";
  }

  return Object.keys(hints).length > 0 ? hints : undefined;
}

function inferPatternKeyElement(hits: PoeticMappingHit[]) {
  const matchedText = hits.map((hit) => hit.matchedText).join(" ");

  if (/(竹|松|花|桃|杏)/.test(matchedText)) return "botanical";
  if (/(烟雨|云雾|山岚|夜色|暮色)/.test(matchedText)) return "cloud-mist";
  if (/(水波|春水初生|寒江)/.test(matchedText)) return "water-wave";
  if (/(旧木头被太阳晒过|冷石头|石)/.test(matchedText)) return "stone-texture";
  if (/(灯火|炉火|星河|清辉)/.test(matchedText)) return "light-trace";
  return undefined;
}

function inferPatternIntent(hits: PoeticMappingHit[], delta: PoeticSlotDelta): PatternIntentState | undefined {
  const pattern = delta.patternIntent;
  if (!pattern) return undefined;

  const figurativeness = pattern.figurativeness ?? 0;
  const abstraction = pattern.abstraction ?? 0;
  const geometry = pattern.geometry ?? 0;
  const flow = pattern.flow ?? 0;
  const blurred = pattern.blurred ?? 0;
  const texture = pattern.texture ?? 0;

  const keyElement = inferPatternKeyElement(hits);
  const abstractionPreference: PatternIntentState["abstractionPreference"] = figurativeness >= 0.62
    ? "concrete"
    : abstraction >= 0.55 || blurred >= 0.48
      ? "abstract"
      : "semi-abstract";
  const renderingMode: PatternIntentState["renderingMode"] | undefined = texture >= 0.58
    ? "texture-like"
    : geometry >= 0.56
      ? "geometricized"
      : flow >= 0.28 || abstraction >= 0.42 || blurred >= 0.42
        ? "suggestive"
        : figurativeness >= 0.62
          ? "literal"
          : undefined;
  const motionFeeling: PatternIntentState["motionFeeling"] | undefined = flow >= 0.54
    ? "flowing"
    : (pattern.linear ?? 0) >= 0.56
      ? "wind-like"
      : (pattern.rhythm ?? 0) >= 0.52
        ? "layered"
        : undefined;

  if (!keyElement && !renderingMode && !motionFeeling) {
    return undefined;
  }

  return {
    keyElement,
    abstractionPreference,
    renderingMode,
    motionFeeling,
  };
}

function inferPresenceMode(delta: PoeticSlotDelta) {
  const blending = delta.presence?.blending ?? 0;
  const focalness = delta.presence?.focalness ?? 0;
  const visualWeight = delta.presence?.visualWeight ?? 0;

  return {
    blendingMode: blending >= 0.62 ? "blended" : focalness >= 0.56 ? "focal" : "softly-noticeable",
    visualWeight: visualWeight >= 0.58 ? "strong" : visualWeight >= 0.34 ? "medium" : "light",
    blending: Number(blending.toFixed(3)),
    focalness: Number(focalness.toFixed(3)),
    visualWeightScore: Number(visualWeight.toFixed(3)),
  } as const;
}

function buildPoeticAxisHints(delta: PoeticSlotDelta): EntryAgentAxisHints {
  const axisHints: EntryAgentAxisHints = {};

  if (delta.color) {
    const warmth = delta.color.temperature !== undefined ? Number((0.5 + delta.color.temperature).toFixed(3)) : undefined;
    const saturation = delta.color.saturation !== undefined
      ? Number((0.5 + delta.color.saturation).toFixed(3))
      : delta.color.muted !== undefined
        ? Number((0.62 - delta.color.muted * 0.32).toFixed(3))
        : undefined;
    axisHints.color = {
      ...(warmth !== undefined ? { warmth } : {}),
      ...(saturation !== undefined ? { saturation: Math.max(0.12, Math.min(0.88, saturation)) } : {}),
    };
  }

  if (delta.impression) {
    const calmSeed = Math.max(delta.impression.calm ?? 0, delta.impression.restrained ?? 0);
    const softnessSeed = Math.max(delta.impression.softness ?? 0, delta.impression.delicate ?? 0, delta.impression.misty ?? 0);
    const energySeed = Math.max(delta.impression.energetic ?? 0, delta.impression.warmth ?? 0);
    const presenceEnergySeed = delta.presence ? ((delta.presence.focalness ?? 0) - (delta.presence.blending ?? 0)) : undefined;
    axisHints.impression = {
      ...(calmSeed > 0 ? { calm: Math.min(0.86, Number((0.5 + calmSeed * 0.28).toFixed(3))) } : {}),
      ...(softnessSeed > 0 ? { softness: Math.min(0.84, Number((0.5 + softnessSeed * 0.24).toFixed(3))) } : {}),
      ...(energySeed > 0
        ? { energy: Math.min(0.82, Number((0.44 + energySeed * 0.3).toFixed(3))) }
        : presenceEnergySeed !== undefined
          ? { energy: Math.max(0.22, Math.min(0.72, Number((0.4 + presenceEnergySeed * 0.2).toFixed(3)))) }
          : {}),
    };
  }

  if (delta.patternIntent) {
    const density = delta.patternIntent.density ?? 0;
    const geometry = delta.patternIntent.geometry ?? 0;
    const flow = delta.patternIntent.flow ?? 0;
    axisHints.motif = {
      complexity: Math.max(0.18, Math.min(0.82, Number((0.46 + density * 0.3).toFixed(3)))),
      geometry: Math.max(0.14, Math.min(0.86, Number((0.4 + geometry * 0.34).toFixed(3)))),
      organic: Math.max(0.16, Math.min(0.88, Number((0.48 + (flow - geometry * 0.3) * 0.34).toFixed(3)))),
    };
  }

  return axisHints;
}

function buildFieldSemanticHints(delta: PoeticSlotDelta) {
  const hints: Partial<Record<HighValueField, Record<string, string>>> = {};

  if (delta.color) {
    const colorMood = buildColorSemanticHint(delta.color);
    if (colorMood) {
      hints.colorMood = { colorMood };
    }
  }

  if (delta.impression) {
    const impression = buildImpressionSemanticHint(delta.impression);
    if (impression) {
      hints.overallImpression = { impression };
    }
  }

  if (delta.patternIntent) {
    const patternHints = buildPatternSemanticHints(delta.patternIntent);
    if (patternHints) {
      hints.patternTendency = patternHints;
    }
  }

  return hints;
}

export function buildPoeticSemanticCanvas(text: string): FuliSemanticCanvas | undefined {
  const hits = extractPoeticMappingsFromText(text);
  if (hits.length === 0) return undefined;

  const aggregatedSlotDelta = aggregatePoeticSlotDelta(hits);
  const fieldSemanticHints = buildFieldSemanticHints(aggregatedSlotDelta);
  const patternIntent = inferPatternIntent(hits, aggregatedSlotDelta);
  const presence = inferPresenceMode(aggregatedSlotDelta);
  const axisHints = buildPoeticAxisHints(aggregatedSlotDelta);

  const targetFields: HighValueField[] = [];
  const targetSlots: FuliSemanticCanvas["slotMappings"]["targetSlots"] = [];
  const targetAxes: string[] = [];

  if (aggregatedSlotDelta.color) {
    targetFields.push("colorMood");
    targetSlots.push("color");
    targetAxes.push("color.warmth", "color.saturation");
  }
  if (aggregatedSlotDelta.impression) {
    targetFields.push("overallImpression");
    targetSlots.push("impression");
    targetAxes.push("impression.calm", "impression.energy", "impression.softness");
  }
  if (aggregatedSlotDelta.patternIntent || patternIntent) {
    targetFields.push("patternTendency");
    targetSlots.push("motif");
    targetAxes.push("motif.complexity", "motif.geometry", "motif.organic");
  }

  return {
    source: "rule-based",
    confidence: Number(Math.min(0.92, 0.58 + hits.length * 0.1).toFixed(2)),
    rawCues: hits.map((hit) => hit.matchedText),
    conceptualAxes: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.impression ?? [])),
    metaphoricDomains: unique(hits.map((hit) => `poetic:${hit.key}`)),
    designTranslations: {
      colorIdentity: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.color ?? [])),
      colorRestraint: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.color ?? [])),
      motifLogic: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.patternIntent ?? [])),
      impressionTone: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.impression ?? [])),
      presenceIntensity: unique(hits.flatMap((hit) => hit.mapping.perceptualEffects?.presence ?? [])),
      materialSuggestion: unique(
        hits
          .filter((hit) => ["旧木头被太阳晒过", "冬天太阳照在冷石头上"].includes(hit.key))
          .map((hit) => hit.key),
      ),
    },
    slotMappings: {
      targetFields: unique(targetFields),
      targetSlots: unique(targetSlots),
      targetAxes: unique(targetAxes),
    },
    narrativePolicy: {
      mustPreserve: unique(hits.map((hit) => hit.mapping.key)),
      mustNotOverLiteralize: unique(hits.flatMap((hit) => hit.mapping.antiBias ?? [])),
      directionalDominant: unique(hits.flatMap((hit) => hit.mapping.compatibleWith ?? []).slice(0, 4)),
    },
    questionImplications: {
      likelyQuestionKinds: unique(hits.flatMap((hit) => hit.mapping.followupHints?.length ? ["clarify"] : [])),
      likelyInformationGains: unique(hits.flatMap((hit) => hit.mapping.followupHints ?? [])),
    },
    poeticSignal: {
      hits: hits.map((hit) => ({
        key: hit.key,
        matchedText: hit.matchedText,
        weight: hit.weight,
      })),
      aggregatedSlotDelta,
      fieldSemanticHints,
      axisHints,
      patternIntent,
      presence,
      followupHints: unique(hits.flatMap((hit) => hit.mapping.followupHints ?? [])),
    },
  };
}
