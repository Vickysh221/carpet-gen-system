import { buildGenericImagePrompt } from "./promptAdapters.ts";
import { OPENING_OPTION_INDEX } from "./openingOptionRegistry.ts";
import type { PoeticMapping } from "./poeticMappings";
import { POETIC_MAPPINGS } from "./poeticMappings.ts";
import { EXPLICIT_MOTIF_CANDIDATES, type SemanticCandidateSource, type SemanticRetrievalMatch } from "./semanticRetrieval.ts";
import type { GenerationSemanticSpec, MotifTraceState } from "./types.visualIntent.ts";

type NumericRecord = Record<string, number>;

export interface RetrievalWeightedSlotDeltaBundle {
  color: NumericRecord;
  atmosphere: NumericRecord;
  pattern: NumericRecord;
  presence: NumericRecord;
  arrangement: NumericRecord;
  motifTraces: MotifTraceState[];
  supportingCandidates: Array<{
    id: string;
    source: SemanticCandidateSource;
    score: number;
    appliedWeight: number;
    rationale: string;
  }>;
}

export interface RetrievalBridgeSemanticSpec extends GenerationSemanticSpec {
  pattern?: NonNullable<GenerationSemanticSpec["pattern"]> & {
    motifTraces?: MotifTraceState[];
    renderingMode?: "suggestive" | "silhouette" | "structural";
  };
}

export interface RetrievalSemanticBridgeOutput {
  weightedSlotDeltaBundle: RetrievalWeightedSlotDeltaBundle;
  semanticSpec: RetrievalBridgeSemanticSpec;
  generationPrompt: string;
  negativePrompt: string;
  unresolvedQuestions: string[];
}

interface QueryIntentProfile {
  tags: string[];
  explicitSubjects: string[];
  negatedTerms: string[];
  imageryAnchors: string[];
  favorsSuggestiveRendering: boolean;
}

interface CandidateDeltaEnvelope {
  color?: NumericRecord;
  atmosphere?: NumericRecord;
  pattern?: NumericRecord;
  presence?: NumericRecord;
  arrangement?: NumericRecord;
  motifTraceHints?: MotifTraceState[];
  tags?: string[];
  rationale: string;
}

interface AggregationAccumulator {
  color: NumericRecord;
  atmosphere: NumericRecord;
  pattern: NumericRecord;
  presence: NumericRecord;
  arrangement: NumericRecord;
  motifTraces: MotifTraceState[];
  supportingCandidates: RetrievalWeightedSlotDeltaBundle["supportingCandidates"];
}

const POETIC_MAPPING_INDEX = new Map<string, PoeticMapping>(POETIC_MAPPINGS.map((mapping) => [mapping.key, mapping]));
const EXPLICIT_MOTIF_INDEX = new Map(EXPLICIT_MOTIF_CANDIDATES.map((candidate) => [candidate.id, candidate]));

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function normalizeNegatedTerm(term: string) {
  const cleaned = term.trim().replace(/^(太|很|那么|这种|那种)/, "").replace(/(那种|这种)$/, "");
  return cleaned;
}

function extractNegatedTerms(query: string) {
  const matches = [...query.matchAll(/(?:不是|不要|别做成|别太|别|不想要|不做)\s*([^，。；、\s]+)/g)];
  const rawTerms = matches.flatMap((match) => match.slice(1));
  const normalized = rawTerms
    .map((term) => term?.trim())
    .filter((term): term is string => Boolean(term))
    .flatMap((term) => {
      const base = normalizeNegatedTerm(term);
      const expanded = [base];
      if (base.includes("也不是")) {
        expanded.push(...base.split("也不是"));
      }
      if (base.includes("而不是")) {
        expanded.push(...base.split("而不是"));
      }
      return expanded;
    })
    .map((term) => normalizeNegatedTerm(term))
    .filter(Boolean);

  return unique(normalized);
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => needle.length > 0 && text.includes(needle));
}

function addWeightedRecord(target: NumericRecord, source: NumericRecord | undefined, weight: number) {
  if (!source) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value * weight;
  }
}

function mergeMotifTrace(target: MotifTraceState[], incoming: MotifTraceState, weight: number) {
  const existing = target.find(
    (item) => item.sourceSubject === incoming.sourceSubject && item.traceType === incoming.traceType,
  );
  const visibility = clamp(incoming.visibility * weight);
  const literalRisk = clamp(incoming.literalRisk * (0.7 + weight * 0.3));

  if (!existing) {
    target.push({
      ...incoming,
      visibility,
      literalRisk,
      structuralFeatures: unique(incoming.structuralFeatures),
    });
    return;
  }

  existing.visibility = clamp(Math.max(existing.visibility, visibility));
  existing.literalRisk = clamp(Math.max(existing.literalRisk, literalRisk));
  existing.structuralFeatures = unique([...existing.structuralFeatures, ...incoming.structuralFeatures]);
  if (incoming.renderingMode === "silhouette" || existing.renderingMode === "silhouette") {
    existing.renderingMode = "silhouette";
  } else if (incoming.renderingMode === "structural" || existing.renderingMode === "structural") {
    existing.renderingMode = "structural";
  }
}

function inferQueryIntentProfile(query: string): QueryIntentProfile {
  const tags: string[] = [];
  const explicitSubjects: string[] = [];
  const imageryAnchors: string[] = [];
  const negatedTerms = extractNegatedTerms(query);
  const hasNegatedFlower = includesAny(query, ["别太花", "不要花", "不是花", "花花草草"]);
  const hasNegatedGoldBrocade = negatedTerms.some((term) => /金尊|锦/.test(term));

  if (/雪|雪地/.test(query)) {
    tags.push("snow", "cold", "boundary-dissolution", "open-field");
    explicitSubjects.push("雪");
    imageryAnchors.push("雪地消隐边界");
  }
  if (/天空|天际|分界线/.test(query)) {
    tags.push("sky", "horizon", "boundary-dissolution", "open-field");
  }
  if (/光|微光|灯/.test(query)) {
    tags.push("light", "indirect-luminance");
    explicitSubjects.push("光");
    imageryAnchors.push("被遮蔽的光");
  }
  if (/薄纱|纱|幕/.test(query)) {
    tags.push("veil", "filtered", "diffused");
  }
  if (/水|涟漪|波纹|触碰/.test(query)) {
    tags.push("water", "wave", "touch-trace", "ring-motion");
    explicitSubjects.push("水波");
    imageryAnchors.push("涟漪扩散");
  }
  if (/帆/.test(query)) {
    tags.push("sail", "open-field", "isolated-accent");
    explicitSubjects.push("帆");
    imageryAnchors.push("孤帆留白");
  }
  if (/荷|莲/.test(query) && !negatedTerms.some((term) => /荷|莲/.test(term))) {
    tags.push("lotus", "botanical", "organic", "water-born");
    explicitSubjects.push("荷花");
    imageryAnchors.push("荷叶摇曳");
  }
  if (/花|叶|竹/.test(query) && !hasNegatedFlower) {
    tags.push("botanical", "organic");
    explicitSubjects.push("植物");
    imageryAnchors.push("花叶碎片");
  }
  if (/石|岩|矿/.test(query)) {
    tags.push("stone-texture", "mineral", "layered-grain");
    explicitSubjects.push("石纹");
    imageryAnchors.push("石纹层理");
  }
  if (/下雨前|雨前|五分钟的空气|空气被压住|潮气/.test(query)) {
    tags.push("pre-rain-air", "humid-air", "suspended-pressure", "boundary-lowered");
    imageryAnchors.push("雨前潮气");
  }

  return {
    tags: unique([...tags, ...(hasNegatedGoldBrocade ? ["anti-gold-brocade"] : [])]),
    explicitSubjects: unique(explicitSubjects),
    negatedTerms,
    imageryAnchors: unique(imageryAnchors),
    favorsSuggestiveRendering: !/具象|写实|明确画出|主体/.test(query),
  };
}

function normalizeCandidateId(rawId: string) {
  const [, suffix] = rawId.split(":");
  return suffix ?? rawId;
}

function buildPoeticEnvelope(mapping: PoeticMapping): CandidateDeltaEnvelope {
  const impression = mapping.slotDelta.impression ?? {};
  const color = mapping.slotDelta.color ?? {};
  const patternIntent = mapping.slotDelta.patternIntent ?? {};
  const presence = mapping.slotDelta.presence ?? {};

  const tags = unique([
    ...mapping.aliases,
    ...(mapping.compatibleWith ?? []),
    ...(mapping.conflictWith ?? []),
  ]);

  return {
    color: {
      temperature: color.temperature ?? 0,
      saturation: -(color.saturation ?? 0),
      brightness: color.luminosity ?? 0,
      haze: color.haze ?? 0,
      contrastSoftness: color.contrastSoftness ?? 0,
      muted: color.muted ?? 0,
    },
    atmosphere: {
      quietness: impression.calm ?? 0,
      warmth: Math.max(0, color.temperature ?? 0),
      distance: impression.distance ?? 0,
      softness: impression.softness ?? 0,
      humidity: color.haze ?? 0,
      clarity: clamp(0.45 - (color.haze ?? 0) * 0.25),
      haze: color.haze ?? 0,
      restraint: impression.restrained ?? impression.restraint ?? 0,
      liveliness: impression.poetic ?? 0.22,
    },
    pattern: {
      abstraction: patternIntent.abstraction ?? 0,
      density: clamp(0.45 + (patternIntent.density ?? 0)),
      motionFlow: patternIntent.flow ?? 0,
      edgeSoftness: clamp((color.contrastSoftness ?? 0) * 0.8 + (patternIntent.blurred ?? 0) * 0.2),
      motifVisibility: clamp(0.3 + (presence.focalness ?? 0) * 0.3),
      structuralBias: clamp(0.4 - (patternIntent.geometry ?? 0) * 0.4 + (patternIntent.flow ?? 0) * 0.2),
    },
    presence: {
      blending: presence.blending ?? 0,
      focalness: presence.focalness ?? 0,
      visualWeight: presence.visualWeight ?? 0,
    },
    arrangement: {
      spread: clamp(0.55 - (patternIntent.density ?? 0) * 0.4),
      directionalFlow: patternIntent.flow ?? 0,
      rhythm: clamp(0.4 + (patternIntent.flow ?? 0) * 0.4),
      orderliness: clamp(0.35 + (patternIntent.geometry ?? 0) * 0.5),
    },
    tags,
    rationale: `poetic mapping ${mapping.key} translated into atmosphere/color/pattern bias`,
  };
}

function buildOpeningEnvelope(optionId: string): CandidateDeltaEnvelope | undefined {
  const option = OPENING_OPTION_INDEX.get(optionId);
  if (!option) {
    return undefined;
  }

  const impression = option.parameterDelta.impression ?? {};
  const color = option.parameterDelta.color ?? {};
  const patternIntent = option.parameterDelta.patternIntent ?? {};
  const arrangement = option.parameterDelta.arrangement ?? {};
  const presence = option.parameterDelta.presence ?? {};

  return {
    color: {
      temperature: (color.warmth ?? 0) - 0.5,
      saturation: color.saturation ?? 0,
      brightness: color.visibility ?? 0,
      contrastSoftness: clamp(1 - (color.contrast ?? 0)),
    },
    atmosphere: {
      quietness: impression.calm ?? 0,
      warmth: impression.warmth ?? color.warmth ?? 0,
      softness: impression.softness ?? 0,
      restraint: clamp(1 - (impression.energy ?? 0) * 0.7),
      liveliness: impression.energy ?? 0,
      intimacy: option.family === "space" && option.id.includes("bedroom") ? 0.76 : 0,
    },
    pattern: {
      abstraction: patternIntent.abstraction ?? clamp(1 - (patternIntent.figurativeness ?? 0)),
      density: patternIntent.complexity ?? 0,
      motionFlow: arrangement.flow ?? 0,
      edgeSoftness: clamp(0.55 + (impression.softness ?? 0) * 0.3 - (patternIntent.geometry ?? 0) * 0.2),
      motifVisibility: patternIntent.motifPresence ?? 0,
      structuralBias: clamp((patternIntent.geometry ?? 0) * 0.8 + (patternIntent.organic ?? 0) * 0.25),
      organicBias: patternIntent.organic ?? 0,
    },
    presence: {
      blending: presence.blending ?? 0.45,
      focalness: presence.focalness ?? 0.4,
      visualWeight: presence.visualWeight ?? 0.4,
    },
    arrangement: {
      spread: arrangement.openness ?? 0.5,
      directionalFlow: arrangement.flow ?? 0.4,
      rhythm: clamp(0.35 + (arrangement.flow ?? 0) * 0.3 + (patternIntent.complexity ?? 0) * 0.2),
      orderliness: arrangement.order ?? 0.45,
    },
    tags: [option.family, option.label, ...(option.aliases ?? [])],
    rationale: `opening option ${option.label} contributes controllable parameter delta`,
  };
}

function buildExplicitMotifEnvelope(candidateId: string): CandidateDeltaEnvelope | undefined {
  const candidate = EXPLICIT_MOTIF_INDEX.get(candidateId);
  if (!candidate) {
    return undefined;
  }

  const common = {
    pattern: {
      abstraction: 0.72,
      density: 0.34,
      edgeSoftness: 0.64,
      motifVisibility: 0.54,
      structuralBias: 0.62,
    },
    presence: {
      blending: 0.58,
      focalness: 0.42,
      visualWeight: 0.38,
    },
    arrangement: {
      spread: 0.68,
      directionalFlow: 0.54,
      rhythm: 0.58,
      orderliness: 0.42,
    },
  };

  const motifTraceById: Record<string, MotifTraceState> = {
    floral: {
      sourceSubject: "花",
      traceType: "organic-fragment",
      structuralFeatures: ["petal clustering", "organic curvature", "fragmented botanical accents"],
      visibility: 0.52,
      literalRisk: 0.64,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    },
    lotus: {
      sourceSubject: "荷花",
      traceType: "organic-fragment",
      structuralFeatures: ["water-born petals", "elongated leaf arcs", "soft swaying stems"],
      visibility: 0.58,
      literalRisk: 0.68,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    },
    botanical: {
      sourceSubject: "叶片",
      traceType: "organic-fragment",
      structuralFeatures: ["slender leaf silhouettes", "branch-like linear rhythm", "plant-growth cadence"],
      visibility: 0.54,
      literalRisk: 0.52,
      renderingMode: "structural",
      keepObjectIdentity: true,
    },
    sail: {
      sourceSubject: "帆",
      traceType: "silhouette-accent",
      structuralFeatures: ["distant sail silhouette", "isolated vertical accent", "open-field tension"],
      visibility: 0.46,
      literalRisk: 0.72,
      renderingMode: "silhouette",
      keepObjectIdentity: true,
    },
    "water-wave": {
      sourceSubject: "水波",
      traceType: "wave-ring",
      structuralFeatures: ["concentric ring expansion", "touch-origin ripple", "soft radial spread"],
      visibility: 0.56,
      literalRisk: 0.36,
      renderingMode: "structural",
      keepObjectIdentity: true,
    },
    "light-trace": {
      sourceSubject: "光",
      traceType: "light-trace",
      structuralFeatures: ["subtle glow band", "indirect luminance", "embedded light accent"],
      visibility: 0.48,
      literalRisk: 0.58,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    },
    "stone-texture": {
      sourceSubject: "石纹",
      traceType: "organic-fragment",
      structuralFeatures: ["layered mineral grain", "weathered surface shifts", "sedimentary streaks"],
      visibility: 0.46,
      literalRisk: 0.28,
      renderingMode: "structural",
      keepObjectIdentity: true,
    },
  };

  if (candidateId === "pre-rain-air") {
    return {
      color: {
        temperature: -0.08,
        saturation: 0.18,
        brightness: 0.16,
        haze: 0.68,
        contrastSoftness: 0.76,
        muted: 0.52,
      },
      atmosphere: {
        quietness: 0.58,
        distance: 0.2,
        softness: 0.36,
        humidity: 0.82,
        haze: 0.68,
        restraint: 0.62,
        clarity: 0.16,
      },
      pattern: {
        abstraction: 0.76,
        density: 0.24,
        motionFlow: 0.38,
        edgeSoftness: 0.7,
        motifVisibility: 0.18,
        structuralBias: 0.22,
      },
      presence: {
        blending: 0.76,
        focalness: 0.18,
        visualWeight: 0.2,
      },
      arrangement: {
        spread: 0.72,
        directionalFlow: 0.34,
        rhythm: 0.32,
        orderliness: 0.24,
      },
      tags: [candidate.label, ...candidate.aliases, "pre-rain-air", "humid-air", "boundary-lowered"],
      rationale: "explicit imagery pre-rain air converted to atmospheric boundary-pressure bias",
    };
  }

  return {
    ...common,
    motifTraceHints: motifTraceById[candidateId] ? [motifTraceById[candidateId]] : undefined,
    tags: [candidate.label, ...candidate.aliases],
    rationale: `explicit motif ${candidate.label} converted to object-derived motif trace`,
  };
}

function buildEnvelope(match: SemanticRetrievalMatch): CandidateDeltaEnvelope | undefined {
  const normalizedId = normalizeCandidateId(match.id);
  if (match.source === "poeticMappings") {
    const mapping = POETIC_MAPPING_INDEX.get(normalizedId);
    return mapping ? buildPoeticEnvelope(mapping) : undefined;
  }
  if (match.source === "openingOptions") {
    return buildOpeningEnvelope(normalizedId);
  }
  if (match.source === "explicitMotifs") {
    return buildExplicitMotifEnvelope(normalizedId);
  }
  return undefined;
}

function computeSourceWeight(source: SemanticCandidateSource) {
  switch (source) {
    case "poeticMappings":
      return 1.04;
    case "openingOptions":
      return 0.96;
    case "explicitMotifs":
      return 1.08;
    default:
      return 1;
  }
}

function computeConsistencyWeight(queryProfile: QueryIntentProfile, envelope: CandidateDeltaEnvelope, match: SemanticRetrievalMatch) {
  const candidateTags = envelope.tags ?? [];
  const overlap = queryProfile.tags.filter((tag) => candidateTags.some((candidateTag) => candidateTag.includes(tag) || tag.includes(candidateTag)));
  const semanticOverlap = overlap.length / Math.max(1, queryProfile.tags.length);
  const scoreBias = clamp((match.score - 0.45) / 0.35);
  const candidateText = [match.id, match.text, ...candidateTags].join(" ").toLowerCase();
  const negatedOverlap = queryProfile.negatedTerms.filter((term) => candidateText.includes(term.toLowerCase()));
  if (negatedOverlap.length > 0) {
    return 0;
  }
  return 0.72 + semanticOverlap * 0.55 + scoreBias * 0.35;
}

function buildQueryDerivedMotifTraces(query: string, queryProfile: QueryIntentProfile): MotifTraceState[] {
  const traces: MotifTraceState[] = [];

  if (queryProfile.tags.includes("boundary-dissolution")) {
    traces.push({
      sourceSubject: "雪",
      traceType: "boundary-dissolution",
      structuralFeatures: ["soft accumulation field", "cold-white field", "blurred horizon merge"],
      visibility: 0.58,
      literalRisk: 0.62,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    });
  }

  if (queryProfile.tags.includes("indirect-luminance")) {
    traces.push({
      sourceSubject: "光",
      traceType: "filtered-glow",
      structuralFeatures: ["filtered glow", "indirect luminance", "veil-softened light band"],
      visibility: 0.52,
      literalRisk: 0.56,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    });
  }

  if (queryProfile.tags.includes("wave")) {
    traces.push({
      sourceSubject: "水波",
      traceType: "wave-ring",
      structuralFeatures: ["single ripple ring", "touch-origin expansion", "water-surface displacement"],
      visibility: 0.62,
      literalRisk: 0.3,
      renderingMode: "structural",
      keepObjectIdentity: true,
    });
  }

  if (/帆/.test(query)) {
    traces.push({
      sourceSubject: "帆",
      traceType: "silhouette-accent",
      structuralFeatures: ["distant sail silhouette", "isolated accent", "open-field tension"],
      visibility: 0.48,
      literalRisk: 0.74,
      renderingMode: "silhouette",
      keepObjectIdentity: true,
    });
  }

  if (queryProfile.tags.includes("lotus")) {
    traces.push({
      sourceSubject: "荷花",
      traceType: "organic-fragment",
      structuralFeatures: ["water-born petals", "leaf-disc arcs", "swaying stem rhythm"],
      visibility: 0.56,
      literalRisk: 0.64,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    });
  }

  if (queryProfile.tags.includes("botanical") && /花|叶/.test(query)) {
    traces.push({
      sourceSubject: "花叶",
      traceType: "organic-fragment",
      structuralFeatures: ["fragmented petals", "leaf-edge cadence", "botanical scatter"],
      visibility: 0.5,
      literalRisk: 0.58,
      renderingMode: "suggestive",
      keepObjectIdentity: true,
    });
  }

  if (queryProfile.tags.includes("stone-texture")) {
    traces.push({
      sourceSubject: "石纹",
      traceType: "organic-fragment",
      structuralFeatures: ["sedimentary bands", "mineral grain shifts", "weathered strata"],
      visibility: 0.48,
      literalRisk: 0.26,
      renderingMode: "structural",
      keepObjectIdentity: true,
    });
  }

  return traces;
}

function buildQueryDerivedEnvelope(query: string, queryProfile: QueryIntentProfile): CandidateDeltaEnvelope | undefined {
  const hasPreRainAir = queryProfile.tags.includes("pre-rain-air");
  const hasImageryOnly = queryProfile.imageryAnchors.length > 0 && queryProfile.explicitSubjects.length === 0;

  if (!hasPreRainAir && !hasImageryOnly) {
    return undefined;
  }

  return {
    color: {
      temperature: hasPreRainAir ? -0.08 : 0,
      saturation: hasPreRainAir ? 0.18 : 0,
      brightness: hasPreRainAir ? 0.16 : 0,
      haze: hasPreRainAir ? 0.62 : 0.28,
      contrastSoftness: hasPreRainAir ? 0.7 : 0.46,
      muted: hasPreRainAir ? 0.48 : 0.2,
    },
    atmosphere: {
      quietness: hasPreRainAir ? 0.52 : 0.26,
      distance: hasPreRainAir ? 0.22 : 0.18,
      softness: hasPreRainAir ? 0.34 : 0.2,
      humidity: hasPreRainAir ? 0.78 : 0.24,
      haze: hasPreRainAir ? 0.62 : 0.28,
      restraint: hasPreRainAir ? 0.58 : 0.24,
      clarity: hasPreRainAir ? 0.2 : 0.36,
    },
    pattern: {
      abstraction: 0.74,
      density: hasPreRainAir ? 0.28 : 0.2,
      motionFlow: hasPreRainAir ? 0.42 : 0.24,
      edgeSoftness: hasPreRainAir ? 0.66 : 0.42,
      motifVisibility: 0.24,
      structuralBias: hasPreRainAir ? 0.3 : 0.24,
    },
    presence: {
      blending: hasPreRainAir ? 0.72 : 0.48,
      focalness: 0.22,
      visualWeight: 0.24,
    },
    arrangement: {
      spread: 0.66,
      directionalFlow: hasPreRainAir ? 0.4 : 0.24,
      rhythm: hasPreRainAir ? 0.38 : 0.24,
      orderliness: 0.28,
    },
    tags: queryProfile.tags,
    rationale: hasPreRainAir
      ? "query-derived vivid imagery preserved as pre-rain atmospheric bias"
      : "query-derived imagery preserved as non-generic atmospheric fallback",
  };
}

function aggregateWeightedSlotDeltas(query: string, retrievalResults: SemanticRetrievalMatch[]): RetrievalWeightedSlotDeltaBundle {
  const queryProfile = inferQueryIntentProfile(query);
  const accumulator: AggregationAccumulator = {
    color: {},
    atmosphere: {},
    pattern: {},
    presence: {},
    arrangement: {},
    motifTraces: [],
    supportingCandidates: [],
  };

  for (const inferredTrace of buildQueryDerivedMotifTraces(query, queryProfile)) {
    mergeMotifTrace(accumulator.motifTraces, inferredTrace, 1);
  }

  const queryDerivedEnvelope = buildQueryDerivedEnvelope(query, queryProfile);
  if (queryDerivedEnvelope) {
    addWeightedRecord(accumulator.color, queryDerivedEnvelope.color, 1);
    addWeightedRecord(accumulator.atmosphere, queryDerivedEnvelope.atmosphere, 1);
    addWeightedRecord(accumulator.pattern, queryDerivedEnvelope.pattern, 1);
    addWeightedRecord(accumulator.presence, queryDerivedEnvelope.presence, 1);
    addWeightedRecord(accumulator.arrangement, queryDerivedEnvelope.arrangement, 1);
    accumulator.supportingCandidates.push({
      id: "query-derived:imagery-fallback",
      source: "poeticMappings",
      score: 1,
      appliedWeight: 1,
      rationale: queryDerivedEnvelope.rationale,
    });
  }

  retrievalResults.forEach((match, index) => {
    const envelope = buildEnvelope(match);
    if (!envelope) {
      return;
    }

    const rankPenalty = 1 - index * 0.08;
    const sourceWeight = computeSourceWeight(match.source);
    const consistencyWeight = computeConsistencyWeight(queryProfile, envelope, match);
    const appliedWeight = clamp(match.score * sourceWeight * consistencyWeight * rankPenalty, 0, 1.2);
    if (appliedWeight <= 0.04) {
      return;
    }

    addWeightedRecord(accumulator.color, envelope.color, appliedWeight);
    addWeightedRecord(accumulator.atmosphere, envelope.atmosphere, appliedWeight);
    addWeightedRecord(accumulator.pattern, envelope.pattern, appliedWeight);
    addWeightedRecord(accumulator.presence, envelope.presence, appliedWeight);
    addWeightedRecord(accumulator.arrangement, envelope.arrangement, appliedWeight);
    for (const motifTrace of envelope.motifTraceHints ?? []) {
      mergeMotifTrace(accumulator.motifTraces, motifTrace, appliedWeight);
    }

    accumulator.supportingCandidates.push({
      id: match.id,
      source: match.source,
      score: match.score,
      appliedWeight: Number(appliedWeight.toFixed(3)),
      rationale: envelope.rationale,
    });
  });

  accumulator.pattern.motifTraceSupport = accumulator.motifTraces.length > 0 ? average(accumulator.motifTraces.map((item) => item.visibility)) : 0;
  accumulator.pattern.literalSuppression = accumulator.motifTraces.length > 0 ? average(accumulator.motifTraces.map((item) => item.literalRisk)) : 0;

  return accumulator;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mapTemperature(value: number | undefined) {
  if ((value ?? 0) <= -0.24) return "cool";
  if ((value ?? 0) <= -0.05) return "cool-neutral";
  if ((value ?? 0) >= 0.24) return "warm";
  if ((value ?? 0) >= 0.08) return "warm-neutral";
  return "neutral";
}

function mapSaturation(value: number | undefined) {
  if ((value ?? 0) <= 0.16) return "very-low";
  if ((value ?? 0) <= 0.32) return "low";
  if ((value ?? 0) <= 0.48) return "medium-low";
  if ((value ?? 0) <= 0.7) return "medium";
  return "high";
}

function mapBrightness(value: number | undefined) {
  if ((value ?? 0) <= 0.18) return "mid-dark";
  if ((value ?? 0) <= 0.42) return "medium";
  if ((value ?? 0) <= 0.68) return "medium-light";
  return "light";
}

function mapContrast(value: number | undefined) {
  if ((value ?? 0) >= 0.72) return "very-soft";
  if ((value ?? 0) >= 0.48) return "soft";
  if ((value ?? 0) >= 0.26) return "moderate";
  return "high";
}

function mapHaze(value: number | undefined) {
  if ((value ?? 0) >= 0.74) return "high";
  if ((value ?? 0) >= 0.42) return "medium";
  if ((value ?? 0) > 0.14) return "low";
  return "none";
}

function mapAbstraction(value: number | undefined) {
  if ((value ?? 0) >= 0.7) return "abstract";
  if ((value ?? 0) >= 0.42) return "semi-abstract";
  return "figurative";
}

function mapDensity(value: number | undefined) {
  if ((value ?? 0) <= 0.24) return "very-low";
  if ((value ?? 0) <= 0.38) return "low";
  if ((value ?? 0) <= 0.54) return "medium-low";
  if ((value ?? 0) <= 0.72) return "medium";
  return "high";
}

function mapMotion(value: number | undefined) {
  if ((value ?? 0) >= 0.72) return "directional-flow";
  if ((value ?? 0) >= 0.4) return "gentle-flow";
  if ((value ?? 0) >= 0.18) return "pulsed";
  return "still";
}

function mapEdgeDefinition(value: number | undefined) {
  if ((value ?? 0) >= 0.72) return "blurred";
  if ((value ?? 0) >= 0.48) return "soft";
  if ((value ?? 0) >= 0.26) return "mixed";
  return "clear";
}

function mapMotifBehavior(value: number | undefined) {
  if ((value ?? 0) >= 0.62) return "visible";
  if ((value ?? 0) >= 0.34) return "suggestive";
  return "implicit";
}

function mapSpread(value: number | undefined) {
  if ((value ?? 0) >= 0.66) return "airy";
  if ((value ?? 0) >= 0.38) return "balanced";
  return "compact";
}

function mapDirectionalFlow(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "clear";
  if ((value ?? 0) >= 0.36) return "gentle";
  return "none";
}

function mapRhythm(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "pulsed";
  if ((value ?? 0) >= 0.42) return "linear";
  return "soft";
}

function mapOrderliness(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "ordered";
  if ((value ?? 0) >= 0.4) return "balanced";
  return "loose";
}

function mapBlending(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "blended";
  if ((value ?? 0) >= 0.38) return "softly-noticeable";
  return "focal";
}

function mapFocalness(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "high";
  if ((value ?? 0) >= 0.36) return "medium";
  return "low";
}

function mapVisualWeight(value: number | undefined) {
  if ((value ?? 0) >= 0.68) return "strong";
  if ((value ?? 0) >= 0.36) return "medium";
  return "light";
}

function buildAtmosphereDescriptors(weighted: RetrievalWeightedSlotDeltaBundle): string[] {
  const descriptors: string[] = [];
  if ((weighted.atmosphere.quietness ?? 0) > 0.42) descriptors.push("quiet restrained field");
  if ((weighted.atmosphere.haze ?? 0) > 0.5) descriptors.push("diffused boundary atmosphere");
  if ((weighted.atmosphere.distance ?? 0) > 0.42) descriptors.push("distant open-field calm");
  if ((weighted.atmosphere.softness ?? 0) > 0.38) descriptors.push("softened edge perception");
  if ((weighted.atmosphere.humidity ?? 0) > 0.46) descriptors.push("humid suspended air");
  if ((weighted.atmosphere.warmth ?? 0) > 0.42) descriptors.push("embedded warmth rather than direct glow");
  return unique(descriptors);
}

function buildPatternDescriptors(weighted: RetrievalWeightedSlotDeltaBundle): {
  structuralPattern: string[];
  atmosphericPattern: string[];
  keyElements: string[];
} {
  const structuralPattern = unique(
    weighted.motifTraces.flatMap((trace) => trace.structuralFeatures).slice(0, 6),
  );
  const atmosphericPattern = unique([
    (weighted.pattern.edgeSoftness ?? 0) > 0.58 ? "soft edge dissolution" : undefined,
    (weighted.pattern.motionFlow ?? 0) > 0.52 ? "directional drift" : undefined,
    (weighted.pattern.motifTraceSupport ?? 0) > 0.44 ? "object-derived motif traces retained" : undefined,
    (weighted.pattern.structuralBias ?? 0) > 0.56 ? "structural pattern skeleton preserved" : undefined,
  ].filter((value): value is string => Boolean(value)));
  const keyElements = unique(
    weighted.motifTraces.map((trace) => `${trace.sourceSubject}:${trace.traceType}`),
  );
  return { structuralPattern, atmosphericPattern, keyElements };
}

function buildPaletteBias(weighted: RetrievalWeightedSlotDeltaBundle): string[] {
  const biases: string[] = [];
  if ((weighted.color.temperature ?? 0) < -0.1) biases.push("cold white");
  if ((weighted.color.haze ?? 0) > 0.46) biases.push("mist-softened neutrals");
  if ((weighted.color.brightness ?? 0) > 0.44) biases.push("light-valued field");
  if ((weighted.atmosphere.warmth ?? 0) > 0.36) biases.push("embedded indirect glow");
  return unique(biases);
}

function buildSemanticSpecFromWeightedBundle(weighted: RetrievalWeightedSlotDeltaBundle): RetrievalBridgeSemanticSpec {
  const { structuralPattern, atmosphericPattern, keyElements } = buildPatternDescriptors(weighted);
  const renderingMode =
    weighted.motifTraces.some((trace) => trace.renderingMode === "silhouette")
      ? "silhouette"
      : weighted.motifTraces.some((trace) => trace.renderingMode === "structural")
        ? "structural"
        : "suggestive";

  return {
    baseMood: unique([
      (weighted.atmosphere.quietness ?? 0) > 0.44 ? "restrained" : undefined,
      (weighted.atmosphere.distance ?? 0) > 0.44 ? "open and distant" : undefined,
      (weighted.atmosphere.softness ?? 0) > 0.38 ? "softened" : undefined,
    ].filter((value): value is string => Boolean(value))),
    palette: {
      temperature: mapTemperature(weighted.color.temperature),
      saturation: mapSaturation(weighted.color.saturation),
      brightness: mapBrightness(weighted.color.brightness),
      contrast: mapContrast(weighted.color.contrastSoftness),
      haze: mapHaze(weighted.color.haze),
      base: buildPaletteBias(weighted)[0] ?? null,
      accent: weighted.motifTraces.some((trace) => trace.sourceSubject === "光") ? "subtle filtered glow" : null,
      relation: weighted.motifTraces.some((trace) => trace.sourceSubject === "光") ? "base-plus-accent" : "base-only",
    },
    atmosphere: buildAtmosphereDescriptors(weighted),
    pattern: {
      abstraction: mapAbstraction(weighted.pattern.abstraction),
      density: mapDensity(weighted.pattern.density),
      scale: (weighted.arrangement.spread ?? 0) > 0.6 ? "large" : "medium",
      structuralPattern,
      atmosphericPattern,
      motion: mapMotion(weighted.pattern.motionFlow),
      edgeDefinition: mapEdgeDefinition(weighted.pattern.edgeSoftness),
      motifBehavior: mapMotifBehavior(weighted.pattern.motifVisibility),
      keyElements,
      motifTraces: weighted.motifTraces,
      renderingMode,
      explicitMotifs: [],
      coreExplicitMotifs: [],
    },
    presence: {
      blending: mapBlending(weighted.presence.blending),
      focalness: mapFocalness(weighted.presence.focalness),
      visualWeight: mapVisualWeight(weighted.presence.visualWeight),
      behavior: (weighted.presence.blending ?? 0) > 0.62 ? "embedded" : (weighted.presence.focalness ?? 0) > 0.56 ? "visible-anchor" : "local-lift",
    },
    arrangement: {
      spread: mapSpread(weighted.arrangement.spread),
      directionalFlow: mapDirectionalFlow(weighted.arrangement.directionalFlow),
      rhythm: mapRhythm(weighted.arrangement.rhythm),
      orderliness: mapOrderliness(weighted.arrangement.orderliness),
    },
    constraints: {
      avoidMotifs: [],
      avoidStyles: [],
      avoidPalette: [],
      avoidComposition: [],
      keepQualities: unique([
        "keep object identity as motif trace rather than literal subject",
        weighted.motifTraces.length > 0 ? "retain object-derived structural cues" : undefined,
      ].filter((value): value is string => Boolean(value))),
    },
  };
}

function buildNegativePromptFromSpec(spec: RetrievalBridgeSemanticSpec): string {
  const negatives = unique([
    "no literal scenery illustration",
    "no direct figurative object rendering",
    "no decorative clip-art motifs",
    ...((spec.pattern?.motifTraces ?? []).flatMap((trace) => {
      const phrases = [`avoid literal ${trace.sourceSubject}`];
      if (trace.sourceSubject === "雪") {
        phrases.push("avoid explicit snowy landscape horizon");
      }
      if (trace.sourceSubject === "光") {
        phrases.push("avoid visible lamp or spotlight source");
      }
      if (trace.sourceSubject === "帆") {
        phrases.push("avoid detailed boat illustration");
      }
      return phrases;
    })),
  ]);
  return negatives.join(", ");
}

function buildUnresolvedQuestions(query: string, weighted: RetrievalWeightedSlotDeltaBundle, spec: RetrievalBridgeSemanticSpec): string[] {
  const questions: string[] = [];
  if ((weighted.motifTraces[0]?.literalRisk ?? 0) > 0.62) {
    questions.push("这层对象痕迹要更接近轮廓暗示，还是更接近结构残影？");
  }
  if ((weighted.atmosphere.haze ?? 0) > 0.52 && (weighted.color.brightness ?? 0) > 0.44) {
    questions.push("你要的是更接近留白融化的边界，还是更接近雾光里被柔化的层次？");
  }
  if (/光/.test(query) && spec.palette?.accent) {
    questions.push("这束光更希望只是被感觉到，还是允许形成一个轻微的亮部轨迹？");
  }
  if (/涟漪|波/.test(query) && spec.pattern?.motion === "directional-flow") {
    questions.push("这圈涟漪要更偏同心扩散，还是更偏被风带开的流向？");
  }
  if (/下雨前|雨前|五分钟的空气|空气被压住|潮气/.test(query)) {
    questions.push("更偏潮气悬着的空气，还是更偏压低的边界感？");
    questions.push("更像空气被压住，还是更像水汽在飘？");
  }
  if (/荷|莲/.test(query) && (spec.pattern?.motifTraces?.length ?? 0) > 0) {
    questions.push("这层荷意更偏叶盘的弧线，还是更偏花瓣的轻微开合？");
  }
  if (/花|叶/.test(query) && (spec.pattern?.motifTraces?.length ?? 0) > 0) {
    questions.push("这些花叶痕迹更偏碎片点缀，还是更偏连续生长的节奏？");
  }
  if (/石|岩|矿/.test(query) && (spec.pattern?.motifTraces?.length ?? 0) > 0) {
    questions.push("这层石纹更偏层理流向，还是更偏表面颗粒起伏？");
  }
  return unique(questions).slice(0, 3);
}

function buildGenerationPromptFromSpec(spec: RetrievalBridgeSemanticSpec): string {
  const basePrompt = buildGenericImagePrompt(spec);
  const traceBlock = spec.pattern?.motifTraces
    ?.map((trace) => `${trace.sourceSubject} as ${trace.traceType}, ${trace.renderingMode}, ${trace.structuralFeatures.join(", ")}`)
    .join(", ");
  return [basePrompt, traceBlock, spec.constraints?.keepQualities?.join(", ")].filter(Boolean).join(", ");
}

export function semanticRetrievalToSlotDelta(
  query: string,
  retrievalResults: SemanticRetrievalMatch[],
): RetrievalSemanticBridgeOutput {
  const weightedSlotDeltaBundle = aggregateWeightedSlotDeltas(query, retrievalResults);
  const semanticSpec = buildSemanticSpecFromWeightedBundle(weightedSlotDeltaBundle);
  const queryProfile = inferQueryIntentProfile(query);
  const generationPrompt = buildGenerationPromptFromSpec(semanticSpec);
  const negativePrompt = unique([
    buildNegativePromptFromSpec(semanticSpec),
    ...queryProfile.negatedTerms.map((term) => `avoid ${term} cues`),
  ]).join(", ");
  const unresolvedQuestions = buildUnresolvedQuestions(query, weightedSlotDeltaBundle, semanticSpec);

  return {
    weightedSlotDeltaBundle,
    semanticSpec,
    generationPrompt,
    negativePrompt,
    unresolvedQuestions,
  };
}
