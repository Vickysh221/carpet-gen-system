import { buildIntentSemanticMappingFromAnalysis } from "./agentRuntime";
import { expandExplicitMotifs } from "./explicitMotifExpansion";
import { buildGenericImagePrompt } from "./promptAdapters";
import { semanticRetrievalToSlotDelta } from "./retrievalSemanticBridge.ts";
import type {
  AntiBiasState,
  ArrangementState,
  AtmosphereState,
  CanonicalIntentState,
  ColorState,
  CompiledVisualIntentPackage,
  ConfidenceState,
  ConstraintState,
  GenerationSemanticSpec,
  ImpressionState,
  MaterialityState,
  PatternState,
  PresenceState,
  ReadinessState,
  SignalSourceType,
  SlotStatus,
  SourcedValue,
  TraceBundle,
  VisualIntentCompilerInput,
} from "./types.visualIntent";
import type { EntryAgentResult, PatternIntentState } from "./types";

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueStrings(items: Array<string | undefined>) {
  return unique(items.filter((item): item is string => Boolean(item && item.trim())));
}

function splitCommaList(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferSlotStatus(score: number, phase?: string): SlotStatus {
  if (phase === "lock-candidate" || score >= 0.76) return "committed";
  if (phase === "base-captured" || score >= 0.56) return "stable";
  if (score > 0) return "tentative";
  return "missing";
}

function cleanDiagnosticText(text: string) {
  return text
    .replace(/arrangementTendency|patternTendency|colorMood|overallImpression|spaceContext/g, "")
    .replace(/field|anchor|slot/gi, "")
    .replace(/当前缺少关键\s*位\s*，需要补齐核心风格信息。?/g, "这一层还没有真正收稳。")
    .replace(/还没有稳定\s*。?/g, "还没有真正收稳。")
    .replace(/\s+/g, " ")
    .replace(/\s([，。！？])/g, "$1")
    .trim();
}

function isInternalDescriptor(text: string | undefined) {
  if (!text) return true;
  return /(semantic|canvas|overallimpression|patterntendency|colormood|arrangementtendency|spacecontext)/i.test(text);
}

function cleanDescriptorList(values: Array<string | undefined>) {
  return uniqueStrings(
    values
      .map((value) => (value ? cleanDiagnosticText(value) : value))
      .filter((value) => value && !isInternalDescriptor(value)),
  );
}

function normalizeQuestionText(text: string, fallback: string) {
  const cleaned = cleanDiagnosticText(text)
    .replace(/^还没有真正收稳。?$/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function buildVisualIntentFollowup(gap: EntryAgentResult["semanticGaps"][number], analysis: EntryAgentResult) {
  if (gap.targetField === "arrangementTendency") {
    const motion = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent?.motionFeeling;
    return motion === "flowing"
      ? "这种流动你更希望它松一点自然散开，还是更有方向感一点？"
      : "排布上你更想要松一点、有呼吸感，还是更整齐一点？";
  }

  if (gap.targetField === "colorMood") {
    const hits = analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];
    if (hits.some((item) => item.includes("月白")) && hits.some((item) => item.includes("灯火"))) {
      return "这点暖光你更希望它融进去，还是能被轻轻看见一点？";
    }
    if (hits.some((item) => item.includes("烟雨"))) {
      return "你更想把这层颜色做得更雾一点，还是更清透一点？";
    }
    return "颜色上你更想让它更收一点，还是稍微被看见一点？";
  }

  if (gap.targetField === "patternTendency") {
    const keyElement = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent?.keyElement;
    if (keyElement === "botanical") {
      return "图案上你更想要疏一点、轻一点，还是让节奏更明确一点？";
    }
    if (keyElement === "cloud-mist") {
      return "图案上你更想要雾气一样轻轻铺开，还是保留一点更清楚的走势？";
    }
    return "图案上你更想让它更轻一点，还是更有骨架一点？";
  }

  if (gap.targetField === "overallImpression") {
    return "整体气质上你更想让它更安静克制，还是留一点被看见的存在感？";
  }

  return "这一层还需要再确认一下。";
}

function buildSources(input: {
  hasExplicitText?: boolean;
  hasOptions?: boolean;
  hasPoetic?: boolean;
  hasInference?: boolean;
  hasPlanner?: boolean;
  hasRetrieval?: boolean;
}): SignalSourceType[] {
  return unique([
    input.hasExplicitText ? "explicit_user_text" : undefined,
    input.hasOptions ? "option_click" : undefined,
    input.hasPoetic ? "poetic_mapping" : undefined,
    input.hasInference ? "semantic_inference" : undefined,
    input.hasPlanner ? "planner_bridge" : undefined,
    input.hasRetrieval ? "retrieval_bridge" : undefined,
  ].filter((item): item is SignalSourceType => Boolean(item)));
}

function createSourcedValue<T>(input: {
  value: T | undefined;
  confidence: number;
  status: SlotStatus;
  sources: SignalSourceType[];
  traces: string[];
}): SourcedValue<T> | undefined {
  if (!input.value) {
    return undefined;
  }

  return {
    value: input.value,
    confidence: Number(clamp(input.confidence).toFixed(2)),
    status: input.status,
    sources: unique(input.sources),
    traces: unique(input.traces).slice(0, 8),
  };
}

function getSlotScore(analysis: EntryAgentResult, slot: "impression" | "color" | "pattern" | "arrangement" | "space") {
  return analysis.intakeGoalState?.slots.find((item) => item.slot === slot)?.topScore ?? 0;
}

function getSlotPhase(analysis: EntryAgentResult, slot: "impression" | "color" | "pattern" | "arrangement" | "space") {
  return analysis.intakeGoalState?.slots.find((item) => item.slot === slot)?.phase;
}

function mapPatternAbstraction(patternIntent: PatternIntentState | undefined): PatternState["abstraction"] {
  if (patternIntent?.abstractionPreference === "concrete") return "figurative";
  if (patternIntent?.abstractionPreference === "semi-abstract") return "semi-abstract";
  return "abstract";
}

function mapPatternMotion(patternIntent: PatternIntentState | undefined): PatternState["motion"] {
  if (patternIntent?.motionFeeling === "flowing") return "directional-flow";
  if (patternIntent?.motionFeeling === "wind-like" || patternIntent?.motionFeeling === "layered") return "gentle-flow";
  if (patternIntent?.motionFeeling === "dispersed") return "pulsed";
  return "still";
}

function buildAtmosphereState(analysis: EntryAgentResult): AtmosphereState | undefined {
  const poetic = analysis.semanticCanvas?.poeticSignal;
  const poeticColor = poetic?.aggregatedSlotDelta.color;
  const poeticImpression = poetic?.aggregatedSlotDelta.impression;
  const color = analysis.semanticMapping?.slotHypotheses.color;
  const impression = analysis.semanticMapping?.slotHypotheses.impression;
  const state: AtmosphereState = {};

  if (analysis.intakeGoalState?.slots.find((slot) => slot.slot === "impression")?.topDirection === "calm") {
    state.quietness = 0.82;
    state.restraint = 0.74;
  }
  if (impression?.topDirections.some((item) => item.label.includes("warm"))) {
    state.warmth = 0.68;
  }
  if (poetic?.presence) {
    state.haze = Number(clamp(poetic.presence.blending).toFixed(2));
    state.softness = Number(clamp(1 - poetic.presence.focalness * 0.4).toFixed(2));
  }
  if ((poeticColor?.haze ?? 0) > 0) {
    state.humidity = poeticColor?.haze;
    state.haze = Math.max(state.haze ?? 0, poeticColor?.haze ?? 0);
  }
  if ((poeticImpression?.calm ?? 0) > 0.45) {
    state.quietness = Math.max(state.quietness ?? 0, poeticImpression?.calm ?? 0);
    state.restraint = Math.max(state.restraint ?? 0, poeticImpression?.restrained ?? poeticImpression?.calm ?? 0);
  }
  if (color?.warmth?.top === "cool") {
    state.distance = 0.62;
    state.clarity = 0.48;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

function buildColorState(analysis: EntryAgentResult): ColorState | undefined {
  const poetic = analysis.semanticCanvas?.poeticSignal;
  const poeticColor = poetic?.aggregatedSlotDelta.color;
  const presence = poetic?.presence;
  const mapping = analysis.semanticMapping ?? buildIntentSemanticMappingFromAnalysis(analysis);
  const state: ColorState = {
    temperature:
      poeticColor?.temperature && poeticColor.temperature < -0.2
        ? "cool"
        : poeticColor?.temperature && poeticColor.temperature > 0.2
          ? "warm"
          : mapping.slotHypotheses.color?.warmth?.top === "cool"
            ? "cool"
            : mapping.slotHypotheses.color?.warmth?.top === "warm"
              ? "warm"
              : "cool-neutral",
    saturation:
      poeticColor?.saturation && poeticColor.saturation <= -0.55
        ? "very-low"
        : poeticColor?.saturation && poeticColor.saturation <= -0.2
          ? "low"
        : "medium-low",
    brightness:
      poeticColor?.brightness && poeticColor.brightness >= 0.35
        ? "light"
        : poeticColor?.brightness && poeticColor.brightness <= -0.2
          ? "mid-dark"
          : "medium-light",
    contrast: presence?.visualWeight === "strong" ? "moderate" : "soft",
    haze:
      (poeticColor?.haze ?? 0) >= 0.72 ? "high" : (poeticColor?.haze ?? 0) >= 0.45 ? "medium" : (poeticColor?.haze ?? 0) > 0 ? "low" : "none",
    paletteBias: unique([
      ...(analysis.semanticCanvas?.designTranslations.colorIdentity ?? []),
    ]).slice(0, 4),
  };

  const cues = analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];
  if (cues.some((cue) => cue.includes("月白"))) {
    state.baseAccentRelation = { base: "pale cool-light base", relation: "base-only" };
  }
  if (cues.some((cue) => cue.includes("灯火"))) {
    state.baseAccentRelation = {
      base: state.baseAccentRelation?.base ?? "restrained cool-neutral base",
      accent: "soft warm light accent",
      relation: state.baseAccentRelation?.base ? "base-plus-accent" : "dual-tone",
    };
  }
  if (cues.some((cue) => cue.includes("暮色"))) {
    state.baseAccentRelation = {
      base: "dusk-toned restrained base",
      accent: state.baseAccentRelation?.accent,
      relation: state.baseAccentRelation?.accent ? "base-plus-accent" : "base-only",
    };
  }
  if (cues.some((cue) => cue.includes("月白")) && cues.some((cue) => cue.includes("灯火"))) {
    state.temperature = "cool-neutral";
    state.brightness = "medium-light";
    state.baseAccentRelation = {
      base: "pale cool-light base",
      accent: "soft warm lamp-glow accent",
      relation: "base-plus-accent",
    };
  }
  if (cues.some((cue) => cue.includes("暮色")) && cues.some((cue) => cue.includes("灯火"))) {
    state.temperature = "warm-neutral";
    state.brightness = "mid-dark";
    state.haze = "medium";
    state.baseAccentRelation = {
      base: "dusk-toned muted base",
      accent: "embedded warm light accent",
      relation: "base-plus-accent",
    };
  }

  return state;
}

function buildImpressionState(analysis: EntryAgentResult): ImpressionState | undefined {
  const directions = analysis.semanticMapping?.slotHypotheses.impression?.topDirections ?? [];
  const poeticImpression = analysis.semanticCanvas?.poeticSignal?.aggregatedSlotDelta.impression;
  const primary = cleanDescriptorList(
    directions.slice(0, 3).flatMap((item) => {
      if (item.label === "calm") return ["quiet", "restrained"];
      if (item.label === "warm") return ["intimate"];
      if (item.label === "soft") return ["delicate"];
      if (item.label === "energetic" || item.label === "presence") return ["quietly luminous"];
      return [item.label];
    }),
  );
  const secondary = cleanDescriptorList([
    ...(analysis.semanticCanvas?.designTranslations.impressionTone ?? []),
    (poeticImpression?.calm ?? 0) > 0.45 ? "quiet" : undefined,
    (poeticImpression?.softness ?? 0) > 0.45 ? "delicate" : undefined,
    (poeticImpression?.warmth ?? 0) > 0.45 ? "intimate" : undefined,
    (poeticImpression?.restrained ?? 0) > 0.45 ? "restrained" : undefined,
  ]).slice(0, 4);
  const tension = cleanDescriptorList([
    primary.includes("quiet") && secondary.some((item) => item.includes("warm")) ? "calm-with-warmth" : undefined,
    primary.includes("quiet") && secondary.some((item) => item.includes("distance")) ? "calm-with-distance" : undefined,
    primary.includes("quietly luminous") ? "restrained-but-present" : undefined,
  ]);

  if (primary.length === 0 && secondary.length === 0 && tension.length === 0) {
    return undefined;
  }

  return { primary, secondary, tension };
}

function buildPatternState(input: VisualIntentCompilerInput): PatternState | undefined {
  const analysis = input.analysis;
  const patternSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern");
  const patternIntent = patternSlot?.patternIntent;
  const hypotheses = analysis.semanticMapping?.slotHypotheses.patternIntent;
  const cues = analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];
  const motifExpansion = expandExplicitMotifs(input, patternIntent);
  const explicitMotifs = uniqueStrings([
    ...motifExpansion.coreExplicitMotifs,
    ...motifExpansion.temporaryMotifs.flatMap((item) => item.explicitMotifPhrases),
  ]);
  const structuralPattern = uniqueStrings([
    patternIntent?.motionFeeling === "flowing" ? "terrain-flow" : undefined,
    patternIntent?.motionFeeling === "wind-like" ? "linear-rhythm" : undefined,
    patternIntent?.keyElement === "stone-texture" ? "stone-texture" : undefined,
    ...motifExpansion.coreStructuralPatterns,
    ...motifExpansion.temporaryMotifs.flatMap((item) => item.structuralPatternCandidates),
    patternIntent?.keyElement === "water-wave" ? "water-trace" : undefined,
    patternIntent?.keyElement === "light-trace" ? "light-trace" : undefined,
  ]);
  const atmosphericPattern = uniqueStrings([
    patternIntent?.keyElement === "cloud-mist" || cues.some((cue) => cue.includes("烟雨")) ? "cloud-mist" : undefined,
    cues.some((cue) => cue.includes("烟雨") || cue.includes("雾")) ? "diffusion" : undefined,
    cues.some((cue) => cue.includes("月白")) ? "soft layering" : undefined,
  ]);

  const state: PatternState = {
    abstraction: mapPatternAbstraction(patternIntent),
    density:
      hypotheses?.complexity?.top === "low" ? "low" : patternSlot && patternSlot.topScore >= 0.7 ? "medium-low" : "low",
    scale: "medium",
    motion: mapPatternMotion(patternIntent),
    edgeDefinition:
      atmosphericPattern.includes("cloud-mist") || atmosphericPattern.includes("diffusion") ? "blurred" : patternIntent?.renderingMode === "suggestive" ? "soft" : "mixed",
    motifBehavior:
      patternIntent?.renderingMode === "literal" ? "visible" : patternIntent?.renderingMode === "suggestive" ? "suggestive" : "implicit",
    coreExplicitMotifs: motifExpansion.coreExplicitMotifs,
    explicitMotifs,
    structuralPattern,
    atmosphericPattern,
    keyElements: uniqueStrings([patternIntent?.keyElement, ...motifExpansion.coreSubjects]),
    temporaryMotifs: motifExpansion.temporaryMotifs,
  };

  return state;
}

function buildPresenceState(analysis: EntryAgentResult): PresenceState | undefined {
  const presence = analysis.semanticMapping?.slotHypotheses.presence;
  if (!presence) {
    return undefined;
  }

  const blending = presence.blendingMode?.top;
  const visualWeight = presence.visualWeight?.top;
  const focalness: PresenceState["focalness"] =
    blending === "focal" ? "high" : blending === "softly-noticeable" ? "medium" : "low";
  const behavior: PresenceState["behavior"] =
    blending === "focal" ? "visible-anchor" : blending === "softly-noticeable" ? "local-lift" : "embedded";
  const cues = analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];

  if (cues.some((cue) => cue.includes("月白")) && cues.some((cue) => cue.includes("灯火"))) {
    return {
      blending: "softly-noticeable",
      focalness: "medium",
      visualWeight: "light",
      behavior: "embedded",
    };
  }

  if (cues.some((cue) => cue.includes("暮色")) && cues.some((cue) => cue.includes("灯火"))) {
    return {
      blending: "softly-noticeable",
      focalness: "medium",
      visualWeight: "medium",
      behavior: "local-lift",
    };
  }

  return {
    blending,
    focalness,
    visualWeight,
    behavior,
  };
}

function buildArrangementState(analysis: EntryAgentResult): ArrangementState | undefined {
  const arrangement = analysis.semanticMapping?.slotHypotheses.arrangement;
  const patternIntent = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent;
  const state: ArrangementState = {
    spread:
      arrangement?.density?.top === "open" ? "airy" : arrangement?.density?.top === "dense" ? "compact" : "balanced",
    directionalFlow:
      patternIntent?.motionFeeling === "flowing" ? "clear" : patternIntent?.motionFeeling === "wind-like" ? "gentle" : "none",
    rhythm:
      patternIntent?.motionFeeling === "wind-like" ? "linear" : patternIntent?.motionFeeling === "flowing" ? "soft" : "soft",
    orderliness:
      arrangement?.order?.top === "ordered" ? "ordered" : arrangement?.order?.top === "free" ? "loose" : "balanced",
  };
  return state;
}

function buildMaterialityState(analysis: EntryAgentResult): MaterialityState | undefined {
  const cues = analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];
  const surfaceFeel = unique([
    cues.some((cue) => cue.includes("石")) ? "dry mineral calm" : undefined,
    cues.some((cue) => cue.includes("灯火")) ? "soft matte warmth" : undefined,
  ].filter((item): item is string => Boolean(item)));
  const textureBias = unique([
    cues.some((cue) => cue.includes("竹影")) ? "fine linear texture" : undefined,
    cues.some((cue) => cue.includes("烟雨")) ? "mist-softened transitions" : undefined,
  ].filter((item): item is string => Boolean(item)));

  if (surfaceFeel.length === 0 && textureBias.length === 0) {
    return undefined;
  }

  return { surfaceFeel, textureBias };
}

function buildConstraintState(input: VisualIntentCompilerInput): ConstraintState {
  const textCorpus = [
    ...(input.freeTextInputs ?? []),
    input.analysis.agentState?.cumulativeText ?? "",
  ].join(" ");
  const patternIntent = input.analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent;
  const motifExpansion = expandExplicitMotifs(input, patternIntent);
  const avoidMotifs = unique([
    /不要太花|别太花/.test(textCorpus) ? "dense decorative floral ornament" : undefined,
    /不要literal landscape|不要山水写实|不要景观感/.test(textCorpus) ? "literal landscape imagery" : undefined,
    /不要floral ornament/.test(textCorpus) ? "floral ornament" : undefined,
    ...motifExpansion.temporaryMotifs.flatMap((item) => item.provisionalNegativeHints),
  ].filter((item): item is string => Boolean(item)));
  const avoidStyles = unique([
    /不要酒店感/.test(textCorpus) ? "hotel-luxury styling" : undefined,
    /不要rustic/.test(textCorpus) ? "rustic styling" : undefined,
  ].filter((item): item is string => Boolean(item)));
  const avoidPalette = unique([
    /不要太亮/.test(textCorpus) ? "over-bright highlight accent" : undefined,
    /不要bright gold/.test(textCorpus) ? "bright gold" : undefined,
  ].filter((item): item is string => Boolean(item)));
  const avoidComposition = unique([
    "room scene",
    "product mockup",
    "perspective composition",
  ]);
  const keepQualities = unique([
    /自然/.test(textCorpus) ? "natural restraint" : undefined,
    /烟雨|雾感/.test(textCorpus) ? "mist-softened transitions" : undefined,
    /水汽流动感/.test(textCorpus) ? "directional soft flow" : undefined,
  ].filter((item): item is string => Boolean(item)));

  return {
    avoidMotifs,
    avoidStyles,
    avoidPalette,
    avoidComposition,
    keepQualities,
  };
}

function buildAntiBiasState(input: VisualIntentCompilerInput, constraints: ConstraintState): AntiBiasState {
  const hits = input.analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? [];
  const patternIntent = input.analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent;
  const motifExpansion = expandExplicitMotifs(input, patternIntent);
  return {
    antiLiteralization: unique([
      hits.some((item) => item.includes("烟雨") || item.includes("竹影") || item.includes("月白")) ? "translate poetic cues into sensory pattern behavior" : undefined,
      "avoid scenic illustration",
      ...motifExpansion.antiLiteralRules,
    ].filter((item): item is string => Boolean(item))),
    antiDecorative: unique([
      constraints.avoidMotifs.length > 0 ? "avoid dense decorative ornament" : undefined,
      "avoid overfilled ornamental rhythm",
    ].filter((item): item is string => Boolean(item))),
    antiLuxury: unique([
      constraints.avoidStyles.includes("hotel-luxury styling") ? "avoid glossy luxury finish" : undefined,
      "avoid metallic opulence",
    ].filter((item): item is string => Boolean(item))),
    antiScene: ["no room scene", "no product mockup", "no perspective staging"],
  };
}

function buildUnresolvedSplits(analysis: EntryAgentResult) {
  return unique(
    (analysis.semanticGaps ?? []).slice(0, 6).map((gap) => JSON.stringify({
      id: gap.id,
      slot: gap.targetSlot ?? gap.targetField ?? "unknown",
      question: normalizeQuestionText(
        gap.questionPromptOverride ?? gap.reason,
        buildVisualIntentFollowup(gap, analysis),
      ),
      reason: cleanDiagnosticText(gap.rankingReason),
    })),
  ).map((item) => JSON.parse(item));
}

function buildReadiness(analysis: EntryAgentResult): ReadinessState {
  const summary = analysis.semanticMapping?.confidenceSummary ?? buildIntentSemanticMappingFromAnalysis(analysis).confidenceSummary;
  const score = Number(
    average([
      summary.macroSlotCoverage.impression,
      summary.macroSlotCoverage.color,
      summary.macroSlotCoverage.patternIntent,
      summary.macroSlotCoverage.arrangement,
      summary.macroSlotCoverage.presence,
    ]).toFixed(2),
  );
  return {
    score,
    mode: summary.readyForFirstBatch ? "preview" : score >= 0.72 ? "committed" : "exploratory",
  };
}

function buildTraceBundle(input: VisualIntentCompilerInput): TraceBundle {
  const analysis = input.analysis;
  return {
    freeTextInputs: input.freeTextInputs ?? (analysis.agentState?.cumulativeText ? analysis.agentState.cumulativeText.split("\n").filter(Boolean) : []),
    selectedOptions: input.selectedOptions ?? [],
    comparisonSelections: input.comparisonSelections ?? [],
    turnHistory: input.turnHistory ?? [],
    poeticHits: unique(analysis.semanticCanvas?.poeticSignal?.hits.map((hit) => hit.matchedText) ?? []),
    sourceNotes: unique([
      ...(analysis.semanticCanvas?.rawCues ?? []),
      ...(analysis.semanticCanvas?.designTranslations.motifLogic ?? []),
      ...(analysis.semanticCanvas?.designTranslations.impressionTone ?? []),
    ].map(cleanDiagnosticText).filter(Boolean)).slice(0, 10),
    latestResolutionReasons: Object.values(analysis.questionResolutionState?.families ?? {})
      .sort((left, right) => right.sourceTurn - left.sourceTurn)
      .map((item) => cleanDiagnosticText(item.reason))
      .slice(0, 4),
  };
}

function applyComparisonSelectionsToCanonicalState(
  state: CanonicalIntentState,
  selections: VisualIntentCompilerInput["comparisonSelections"] = [],
): CanonicalIntentState {
  if (selections.length === 0) {
    return state;
  }

  const preferred = selections.filter((item) => item.mode === "prefer");
  const rejected = selections.filter((item) => item.mode === "reject");

  const impressionQualities = uniqueStrings(preferred.flatMap((item) => item.selectionEffect.canonicalEffects?.atmosphereQualities ?? []));
  const patternQualities = uniqueStrings(preferred.flatMap((item) => item.selectionEffect.canonicalEffects?.patternQualities ?? []));
  const colorQualities = uniqueStrings(preferred.flatMap((item) => item.selectionEffect.canonicalEffects?.colorQualities ?? []));
  const arrangementQualities = uniqueStrings(preferred.flatMap((item) => item.selectionEffect.canonicalEffects?.arrangementQualities ?? []));
  const keepQualities = uniqueStrings(preferred.map((item) => item.selectionEffect.patchHint));
  const avoidQualities = uniqueStrings(rejected.map((item) => item.selectionEffect.patchHint));
  const comparisonTraces = selections.map((item) => `comparison:${item.candidateId}:${item.mode}`);

  return {
    ...state,
    impression: state.impression
      ? {
          ...state.impression,
          value: {
            ...state.impression.value,
            primary: uniqueStrings([...(state.impression.value.primary ?? []), ...impressionQualities]),
          },
          sources: unique([...state.impression.sources, "planner_bridge"]),
          traces: unique([...state.impression.traces, ...comparisonTraces]),
        }
      : state.impression,
    color: state.color
      ? {
          ...state.color,
          value: {
            ...state.color.value,
            paletteBias: uniqueStrings([...(state.color.value.paletteBias ?? []), ...colorQualities]),
          },
          sources: unique([...state.color.sources, "planner_bridge"]),
          traces: unique([...state.color.traces, ...comparisonTraces]),
        }
      : state.color,
    pattern: state.pattern
      ? {
          ...state.pattern,
          value: {
            ...state.pattern.value,
            atmosphericPattern: uniqueStrings([...(state.pattern.value.atmosphericPattern ?? []), ...patternQualities]),
            structuralPattern: uniqueStrings([...(state.pattern.value.structuralPattern ?? []), ...arrangementQualities]),
          },
          sources: unique([...state.pattern.sources, "planner_bridge"]),
          traces: unique([...state.pattern.traces, ...comparisonTraces]),
        }
      : state.pattern,
    constraints: state.constraints
      ? {
          ...state.constraints,
          value: {
            ...state.constraints.value,
            keepQualities: unique([...(state.constraints.value.keepQualities ?? []), ...keepQualities]),
            avoidComposition: unique([...(state.constraints.value.avoidComposition ?? []), ...avoidQualities]),
          },
          sources: unique([...state.constraints.sources, "planner_bridge"]),
          traces: unique([...state.constraints.traces, ...comparisonTraces]),
        }
      : state.constraints,
  };
}

function applyPatternSemanticProjectionToCanonicalState(
  state: CanonicalIntentState,
  analysis: EntryAgentResult,
): CanonicalIntentState {
  const projection = analysis.interpretationLayer?.patternSemanticProjection;
  const unresolved = analysis.interpretationLayer?.unresolvedSplits ?? [];
  const misleading = analysis.interpretationLayer?.misleadingPathsToAvoid ?? [];
  if (!projection) {
    return state;
  }

  const architecture = projection.formativeStructure.patternArchitecture.map((item) => item.value);
  const order = projection.formativeStructure.structuralOrder.map((item) => item.value);
  const density = projection.formativeStructure.densityBreathing.map((item) => item.value);
  const flow = projection.formativeStructure.flowDirection.map((item) => item.value);
  const motifFamily = projection.semanticMaterial.motifFamily.map((item) => item.value);
  const abstraction = projection.semanticMaterial.abstractionLevel[0]?.value;
  const anchorStrength = projection.semanticMaterial.semanticAnchorStrength.map((item) => item.value);
  const colorClimate = projection.atmosphericSurface.colorClimate.map((item) => item.value);
  const slotTrace = projection.slotTrace.map((item) => `pattern-slot:${item}`);

  return {
    ...state,
    impression: state.impression
      ? {
          ...state.impression,
          value: {
            ...state.impression.value,
            primary: uniqueStrings([...(state.impression.value.primary ?? []), ...projection.anchorHints]),
          },
          sources: unique([...state.impression.sources, "semantic_inference"]),
          traces: unique([...state.impression.traces, ...slotTrace]),
        }
      : state.impression,
    color: state.color
      ? {
          ...state.color,
          value: {
            ...state.color.value,
            paletteBias: uniqueStrings([...(state.color.value.paletteBias ?? []), ...colorClimate]),
          },
          sources: unique([...state.color.sources, "semantic_inference"]),
          traces: unique([...state.color.traces, ...slotTrace]),
        }
      : state.color,
    pattern: state.pattern
      ? {
          ...state.pattern,
          value: {
            ...state.pattern.value,
            abstraction: (abstraction === "ambient" ? "abstract" : abstraction === "suggestive" ? "semi-abstract" : state.pattern.value.abstraction),
            density: density.includes("sparse") || density.includes("breathing_gradient")
              ? "low"
              : density.includes("clustered_sparse")
                ? "medium-low"
                : state.pattern.value.density,
            motion: flow.includes("upward_evaporation")
              ? "gentle-flow"
              : flow.length > 0
                ? "directional-flow"
                : state.pattern.value.motion,
            renderingMode: abstraction === "ambient" || abstraction === "suggestive" ? "suggestive" : state.pattern.value.renderingMode,
            structuralPattern: uniqueStrings([...(state.pattern.value.structuralPattern ?? []), ...architecture, ...order]),
            atmosphericPattern: uniqueStrings([...(state.pattern.value.atmosphericPattern ?? []), ...flow, ...projection.variantHints]),
            keyElements: uniqueStrings([...(state.pattern.value.keyElements ?? []), ...motifFamily, ...anchorStrength]),
          },
          sources: unique([...state.pattern.sources, "semantic_inference"]),
          traces: unique([...state.pattern.traces, ...slotTrace]),
        }
      : state.pattern,
    arrangement: state.arrangement
      ? {
          ...state.arrangement,
          value: {
            ...state.arrangement.value,
            spread: density.includes("sparse") || density.includes("breathing_gradient") ? "airy" : state.arrangement.value.spread,
            directionalFlow: flow.length > 0 ? "gentle" : state.arrangement.value.directionalFlow,
            orderliness: order.includes("hidden_grid") ? "balanced" : state.arrangement.value.orderliness,
          },
          sources: unique([...state.arrangement.sources, "semantic_inference"]),
          traces: unique([...state.arrangement.traces, ...slotTrace]),
        }
      : state.arrangement,
    constraints: state.constraints
      ? {
          ...state.constraints,
          value: {
            ...state.constraints.value,
            avoidComposition: unique([
              ...(state.constraints.value.avoidComposition ?? []),
              ...projection.constraintHints,
              ...misleading,
            ]),
            keepQualities: unique([...(state.constraints.value.keepQualities ?? []), ...projection.anchorHints]),
          },
          sources: unique([...state.constraints.sources, "semantic_inference"]),
          traces: unique([...state.constraints.traces, ...slotTrace]),
        }
      : state.constraints,
    unresolvedSplits: unique(
      [
        ...state.unresolvedSplits.map((item) => JSON.stringify(item)),
        ...unresolved.map((item) =>
          JSON.stringify({
            id: item.id,
            slot: item.dimension,
            question: item.prompt,
            reason: item.rationale,
          }),
        ),
      ],
    ).map((item) => JSON.parse(item)),
  };
}

type RetrievalBridgeOutput = ReturnType<typeof semanticRetrievalToSlotDelta>;

function buildRetrievalBridgeOutputs(input: VisualIntentCompilerInput): RetrievalBridgeOutput[] {
  return (input.retrievalBridgeInputs ?? []).map((item) => semanticRetrievalToSlotDelta(item.query, item.retrievalResults));
}

function mergePatternRenderingMode(
  current: PatternState["renderingMode"] | undefined,
  incoming: PatternState["renderingMode"] | undefined,
): PatternState["renderingMode"] | undefined {
  const order: Array<NonNullable<PatternState["renderingMode"]>> = ["suggestive", "structural", "silhouette"];
  const currentIndex = current ? order.indexOf(current) : -1;
  const incomingIndex = incoming ? order.indexOf(incoming) : -1;
  return currentIndex >= incomingIndex ? current : incoming;
}

function applyRetrievalBridgeToCanonicalState(
  state: CanonicalIntentState,
  retrievalOutputs: RetrievalBridgeOutput[],
): CanonicalIntentState {
  if (retrievalOutputs.length === 0 || !state.pattern) {
    return state;
  }

  const mergedPatternValue: PatternState = {
    ...(state.pattern.value ?? {}),
    structuralPattern: uniqueStrings([
      ...(state.pattern.value.structuralPattern ?? []),
      ...retrievalOutputs.flatMap((output) => output.semanticSpec.pattern?.structuralPattern ?? []),
    ]),
    atmosphericPattern: uniqueStrings([
      ...(state.pattern.value.atmosphericPattern ?? []),
      ...retrievalOutputs.flatMap((output) => output.semanticSpec.pattern?.atmosphericPattern ?? []),
    ]),
    keyElements: uniqueStrings([
      ...(state.pattern.value.keyElements ?? []),
      ...retrievalOutputs.flatMap((output) => output.semanticSpec.pattern?.keyElements ?? []),
    ]),
    motifTraces: unique(
      [
        ...(state.pattern.value.motifTraces ?? []),
        ...retrievalOutputs.flatMap((output) => output.semanticSpec.pattern?.motifTraces ?? []),
      ].map((item) => JSON.stringify(item)),
    ).map((item) => JSON.parse(item)),
    renderingMode: retrievalOutputs.reduce(
      (mode, output) =>
        mergePatternRenderingMode(
          mode,
          output.semanticSpec.pattern?.renderingMode as PatternState["renderingMode"] | undefined,
        ),
      state.pattern.value.renderingMode,
    ),
    motifBehavior:
      state.pattern.value.motifBehavior === "visible"
        ? state.pattern.value.motifBehavior
        : retrievalOutputs.some((output) => output.semanticSpec.pattern?.motifBehavior === "suggestive")
          ? "suggestive"
          : state.pattern.value.motifBehavior,
  };

  const mergedConstraints = state.constraints
    ? {
        ...state.constraints,
        value: {
          ...state.constraints.value,
          avoidMotifs: unique([
            ...state.constraints.value.avoidMotifs,
            ...retrievalOutputs.flatMap((output) => splitCommaList(output.negativePrompt).filter((item) => item.includes("literal"))),
          ]),
          avoidComposition: unique([
            ...state.constraints.value.avoidComposition,
            ...retrievalOutputs.flatMap((output) =>
              splitCommaList(output.negativePrompt).filter((item) => item.includes("scene") || item.includes("illustration")),
            ),
          ]),
          keepQualities: unique([
            ...state.constraints.value.keepQualities,
            ...retrievalOutputs.flatMap((output) => output.semanticSpec.constraints?.keepQualities ?? []),
          ]),
        },
        confidence: Number(clamp(Math.max(state.constraints.confidence, 0.72)).toFixed(2)),
        status: (state.constraints.status === "committed" ? "committed" : "stable") as SlotStatus,
        sources: unique([...state.constraints.sources, "retrieval_bridge"]) as SignalSourceType[],
      }
    : state.constraints;

  return {
    ...state,
    pattern: {
      ...state.pattern,
      value: mergedPatternValue,
      confidence: Number(clamp(Math.max(state.pattern.confidence, 0.72)).toFixed(2)),
      status: state.pattern.status === "committed" ? "committed" : "stable",
      sources: unique([...state.pattern.sources, "retrieval_bridge"]),
      traces: unique([
        ...state.pattern.traces,
        ...retrievalOutputs.flatMap((output) =>
          output.weightedSlotDeltaBundle.supportingCandidates.map((item) => `${item.id}:${item.appliedWeight}`),
        ),
      ]).slice(0, 12),
    },
    constraints: mergedConstraints,
    unresolvedSplits: unique(
      [
        ...state.unresolvedSplits.map((item) => JSON.stringify(item)),
        ...retrievalOutputs.flatMap((output, index) =>
          output.unresolvedQuestions.map((question, questionIndex) =>
            JSON.stringify({
              id: `retrieval-bridge-${index}-${questionIndex}`,
              slot: "pattern",
              question,
              reason: "retrieval bridge detected unresolved motif-trace control split",
            }),
          ),
        ),
      ],
    ).map((item) => JSON.parse(item)),
  };
}

export function buildCanonicalIntentState(input: VisualIntentCompilerInput): CanonicalIntentState {
  const analysis = input.analysis;
  const semanticMapping = analysis.semanticMapping ?? buildIntentSemanticMappingFromAnalysis(analysis);
  const readiness = buildReadiness({ ...analysis, semanticMapping });
  const trace = buildTraceBundle(input);
  const constraints = buildConstraintState(input);
  const antiBias = buildAntiBiasState(input, constraints);
  const retrievalOutputs = buildRetrievalBridgeOutputs(input);
  const hasPoetic = (trace.poeticHits.length ?? 0) > 0;
  const hasOptions = (input.selectedOptions?.length ?? 0) > 0;
  const hasText = (trace.freeTextInputs.length ?? 0) > 0;
  const hasRetrieval = retrievalOutputs.length > 0;

  const atmosphere = buildAtmosphereState(analysis);
  const color = buildColorState(analysis);
  const impression = buildImpressionState(analysis);
  const pattern = buildPatternState(input);
  const presence = buildPresenceState(analysis);
  const arrangement = buildArrangementState(analysis);
  const materiality = buildMaterialityState(analysis);

  return applyComparisonSelectionsToCanonicalState(applyPatternSemanticProjectionToCanonicalState(applyRetrievalBridgeToCanonicalState({
    atmosphere: createSourcedValue({
      value: atmosphere,
      confidence: Math.max(getSlotScore(analysis, "impression"), semanticMapping.confidenceSummary.macroSlotCoverage.presence),
      status: inferSlotStatus(getSlotScore(analysis, "impression"), getSlotPhase(analysis, "impression")),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasPoetic, hasInference: true, hasPlanner: true, hasRetrieval }),
      traces: [...trace.poeticHits, ...trace.latestResolutionReasons],
    }),
    color: createSourcedValue({
      value: color,
      confidence: getSlotScore(analysis, "color"),
      status: inferSlotStatus(getSlotScore(analysis, "color"), getSlotPhase(analysis, "color")),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasPoetic, hasInference: true, hasPlanner: true, hasRetrieval }),
      traces: [...trace.poeticHits, ...(semanticMapping.slotHypotheses.color?.evidence ?? [])],
    }),
    impression: createSourcedValue({
      value: impression,
      confidence: getSlotScore(analysis, "impression"),
      status: inferSlotStatus(getSlotScore(analysis, "impression"), getSlotPhase(analysis, "impression")),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasPoetic, hasInference: true, hasPlanner: true, hasRetrieval }),
      traces: [...trace.latestResolutionReasons, ...(semanticMapping.slotHypotheses.impression?.topDirections.flatMap((item) => item.evidence) ?? [])],
    }),
    pattern: createSourcedValue({
      value: pattern,
      confidence: getSlotScore(analysis, "pattern"),
      status: inferSlotStatus(getSlotScore(analysis, "pattern"), getSlotPhase(analysis, "pattern")),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasPoetic, hasInference: true, hasPlanner: true, hasRetrieval }),
      traces: [...trace.poeticHits, ...(semanticMapping.slotHypotheses.patternIntent?.evidence ?? [])],
    }),
    presence: createSourcedValue({
      value: presence,
      confidence: semanticMapping.confidenceSummary.macroSlotCoverage.presence,
      status: inferSlotStatus(semanticMapping.confidenceSummary.macroSlotCoverage.presence),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasPoetic, hasInference: true, hasRetrieval }),
      traces: [...trace.poeticHits, ...(semanticMapping.slotHypotheses.presence?.evidence ?? [])],
    }),
    arrangement: createSourcedValue({
      value: arrangement,
      confidence: getSlotScore(analysis, "arrangement"),
      status: inferSlotStatus(getSlotScore(analysis, "arrangement"), getSlotPhase(analysis, "arrangement")),
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasInference: true, hasPlanner: true, hasRetrieval }),
      traces: semanticMapping.slotHypotheses.arrangement?.evidence ?? [],
    }),
    materiality: createSourcedValue({
      value: materiality,
      confidence: materiality ? 0.44 : 0,
      status: materiality ? "tentative" : "missing",
      sources: buildSources({ hasExplicitText: hasText, hasPoetic, hasInference: true, hasRetrieval }),
      traces: [...trace.poeticHits],
    }),
    constraints: createSourcedValue({
      value: constraints,
      confidence: constraints.avoidMotifs.length + constraints.avoidStyles.length + constraints.avoidPalette.length > 0 ? 0.78 : 0.42,
      status: constraints.avoidMotifs.length + constraints.avoidStyles.length + constraints.avoidPalette.length > 0 ? "stable" : "tentative",
      sources: buildSources({ hasExplicitText: hasText, hasOptions, hasInference: true, hasRetrieval }),
      traces: trace.freeTextInputs,
    }),
    antiBias: createSourcedValue({
      value: antiBias,
      confidence: 0.72,
      status: "stable",
      sources: buildSources({ hasPoetic, hasInference: true, hasRetrieval }),
      traces: [...trace.poeticHits, ...antiBias.antiLiteralization],
    }),
    unresolvedSplits: buildUnresolvedSplits(analysis),
    readiness,
  }, retrievalOutputs), analysis), input.comparisonSelections);
}

function mergeSemanticSpecs(baseSpec: GenerationSemanticSpec, retrievalOutputs: RetrievalBridgeOutput[]): GenerationSemanticSpec {
  if (retrievalOutputs.length === 0) {
    return baseSpec;
  }

  return retrievalOutputs.reduce<GenerationSemanticSpec>((merged, output) => ({
    ...merged,
    baseMood: unique([...(merged.baseMood ?? []), ...(output.semanticSpec.baseMood ?? [])]),
    palette: {
      temperature: output.semanticSpec.palette?.temperature ?? merged.palette?.temperature,
      saturation: output.semanticSpec.palette?.saturation ?? merged.palette?.saturation,
      brightness: output.semanticSpec.palette?.brightness ?? merged.palette?.brightness,
      contrast: output.semanticSpec.palette?.contrast ?? merged.palette?.contrast,
      haze: output.semanticSpec.palette?.haze ?? merged.palette?.haze,
      base: output.semanticSpec.palette?.base ?? merged.palette?.base ?? null,
      accent: output.semanticSpec.palette?.accent ?? merged.palette?.accent ?? null,
      relation: output.semanticSpec.palette?.relation ?? merged.palette?.relation,
    },
    atmosphere: unique([...(merged.atmosphere ?? []), ...(output.semanticSpec.atmosphere ?? [])]),
    pattern: {
      abstraction: output.semanticSpec.pattern?.abstraction ?? merged.pattern?.abstraction,
      density: output.semanticSpec.pattern?.density ?? merged.pattern?.density,
      scale: output.semanticSpec.pattern?.scale ?? merged.pattern?.scale,
      renderingMode: output.semanticSpec.pattern?.renderingMode ?? merged.pattern?.renderingMode,
      coreExplicitMotifs: unique([...(merged.pattern?.coreExplicitMotifs ?? []), ...(output.semanticSpec.pattern?.coreExplicitMotifs ?? [])]),
      explicitMotifs: unique([...(merged.pattern?.explicitMotifs ?? []), ...(output.semanticSpec.pattern?.explicitMotifs ?? [])]),
      structuralPattern: unique([...(merged.pattern?.structuralPattern ?? []), ...(output.semanticSpec.pattern?.structuralPattern ?? [])]),
      atmosphericPattern: unique([...(merged.pattern?.atmosphericPattern ?? []), ...(output.semanticSpec.pattern?.atmosphericPattern ?? [])]),
      motion: output.semanticSpec.pattern?.motion ?? merged.pattern?.motion,
      edgeDefinition: output.semanticSpec.pattern?.edgeDefinition ?? merged.pattern?.edgeDefinition,
      motifBehavior: output.semanticSpec.pattern?.motifBehavior ?? merged.pattern?.motifBehavior,
      keyElements: unique([...(merged.pattern?.keyElements ?? []), ...(output.semanticSpec.pattern?.keyElements ?? [])]),
      temporaryMotifs: unique([...(merged.pattern?.temporaryMotifs ?? []), ...(output.semanticSpec.pattern?.temporaryMotifs ?? [])]),
      motifTraces: unique(
        [...(merged.pattern?.motifTraces ?? []), ...(output.semanticSpec.pattern?.motifTraces ?? [])].map((item) => JSON.stringify(item)),
      ).map((item) => JSON.parse(item)),
    },
    presence: {
      blending: output.semanticSpec.presence?.blending ?? merged.presence?.blending,
      focalness: output.semanticSpec.presence?.focalness ?? merged.presence?.focalness,
      visualWeight: output.semanticSpec.presence?.visualWeight ?? merged.presence?.visualWeight,
      behavior: output.semanticSpec.presence?.behavior ?? merged.presence?.behavior,
    },
    arrangement: {
      spread: output.semanticSpec.arrangement?.spread ?? merged.arrangement?.spread,
      directionalFlow: output.semanticSpec.arrangement?.directionalFlow ?? merged.arrangement?.directionalFlow,
      rhythm: output.semanticSpec.arrangement?.rhythm ?? merged.arrangement?.rhythm,
      symmetry: merged.arrangement?.symmetry,
      orderliness: output.semanticSpec.arrangement?.orderliness ?? merged.arrangement?.orderliness,
    },
    constraints: {
      avoidMotifs: unique([...(merged.constraints?.avoidMotifs ?? []), ...(output.semanticSpec.constraints?.avoidMotifs ?? [])]),
      avoidStyles: unique([...(merged.constraints?.avoidStyles ?? []), ...(output.semanticSpec.constraints?.avoidStyles ?? [])]),
      avoidPalette: unique([...(merged.constraints?.avoidPalette ?? []), ...(output.semanticSpec.constraints?.avoidPalette ?? [])]),
      avoidComposition: unique([...(merged.constraints?.avoidComposition ?? []), ...(output.semanticSpec.constraints?.avoidComposition ?? [])]),
      keepQualities: unique([...(merged.constraints?.keepQualities ?? []), ...(output.semanticSpec.constraints?.keepQualities ?? [])]),
    },
    materiality: merged.materiality,
  }), baseSpec);
}

function buildSemanticSpec(state: CanonicalIntentState, retrievalOutputs: RetrievalBridgeOutput[] = []): GenerationSemanticSpec {
  const baseSpec: GenerationSemanticSpec = {
    baseMood: unique([
      ...(state.impression?.value.primary ?? []),
      ...(state.impression?.value.tension ?? []),
    ]),
    palette: {
      temperature: state.color?.value.temperature,
      saturation: state.color?.value.saturation,
      brightness: state.color?.value.brightness,
      contrast: state.color?.value.contrast,
      haze: state.color?.value.haze,
      base: state.color?.value.baseAccentRelation?.base ?? null,
      accent: state.color?.value.baseAccentRelation?.accent ?? null,
      relation: state.color?.value.baseAccentRelation?.relation,
    },
    atmosphere: unique([
      ...(state.impression?.value.secondary ?? []),
      ...(state.atmosphere?.value.humidity ? ["humid"] : []),
      ...(state.atmosphere?.value.haze ? ["mist-softened"] : []),
    ]),
    pattern: {
      abstraction: state.pattern?.value.abstraction,
      density: state.pattern?.value.density,
      scale: state.pattern?.value.scale,
      renderingMode: state.pattern?.value.renderingMode,
      coreExplicitMotifs: state.pattern?.value.coreExplicitMotifs,
      explicitMotifs: state.pattern?.value.explicitMotifs,
      structuralPattern: state.pattern?.value.structuralPattern,
      atmosphericPattern: state.pattern?.value.atmosphericPattern,
      motion: state.pattern?.value.motion,
      edgeDefinition: state.pattern?.value.edgeDefinition,
      motifBehavior: state.pattern?.value.motifBehavior,
      keyElements: state.pattern?.value.keyElements,
      temporaryMotifs: state.pattern?.value.temporaryMotifs,
      motifTraces: state.pattern?.value.motifTraces,
    },
    presence: {
      blending: state.presence?.value.blending,
      focalness: state.presence?.value.focalness,
      visualWeight: state.presence?.value.visualWeight,
      behavior: state.presence?.value.behavior,
    },
    arrangement: {
      spread: state.arrangement?.value.spread,
      directionalFlow: state.arrangement?.value.directionalFlow,
      rhythm: state.arrangement?.value.rhythm,
      symmetry: state.arrangement?.value.orderliness === "ordered" ? "soft-symmetry" : "asymmetric",
      orderliness: state.arrangement?.value.orderliness,
    },
    materiality: state.materiality?.value,
    constraints: state.constraints?.value,
  };

  return mergeSemanticSpecs(baseSpec, retrievalOutputs);
}

function buildNegativePrompt(constraints: ConstraintState, antiBias: AntiBiasState, bridgeNegatives: string[] = []) {
  return unique([
    ...constraints.avoidMotifs,
    ...constraints.avoidStyles,
    ...constraints.avoidPalette,
    ...constraints.avoidComposition,
    ...antiBias.antiLiteralization,
    ...antiBias.antiDecorative,
    ...antiBias.antiLuxury,
    ...antiBias.antiScene,
    ...bridgeNegatives.flatMap(splitCommaList),
  ]).join(", ");
}

function buildSummary(spec: GenerationSemanticSpec) {
  const baseMood = spec.baseMood?.slice(0, 2).join(", ");
  const pattern = unique([
    ...(spec.pattern?.structuralPattern ?? []),
    ...(spec.pattern?.atmosphericPattern ?? []),
  ]).slice(0, 2).join(", ");
  const presence = spec.presence?.visualWeight ? `${spec.presence?.blending} ${spec.presence.visualWeight} presence` : undefined;
  return [baseMood, pattern, presence].filter(Boolean).join(" | ");
}

function buildDeveloperBrief(spec: GenerationSemanticSpec, unresolvedQuestions: string[]) {
  const lines = [
    `Base mood: ${(spec.baseMood ?? []).join(", ") || "unspecified"}`,
    `Palette: ${[
      spec.palette?.temperature,
      spec.palette?.saturation,
      spec.palette?.brightness,
      spec.palette?.base,
      spec.palette?.accent,
    ].filter(Boolean).join(", ") || "unspecified"}`,
    `Pattern: ${[
      ...(spec.pattern?.structuralPattern ?? []),
      ...(spec.pattern?.atmosphericPattern ?? []),
      spec.pattern?.motion,
      spec.pattern?.edgeDefinition,
    ].filter(Boolean).join(", ") || "unspecified"}`,
  ];

  if (unresolvedQuestions.length > 0) {
    lines.push(`Unresolved: ${unresolvedQuestions.join(" | ")}`);
  }

  return lines.join("\n");
}

function buildConfidenceState(state: CanonicalIntentState, analysis: EntryAgentResult): ConfidenceState {
  const slotCoverage = {
    atmosphere: state.atmosphere?.confidence ?? 0,
    color: state.color?.confidence ?? 0,
    impression: state.impression?.confidence ?? 0,
    pattern: state.pattern?.confidence ?? 0,
    presence: state.presence?.confidence ?? 0,
    arrangement: state.arrangement?.confidence ?? 0,
    materiality: state.materiality?.confidence ?? 0,
  };
  const stableSlots = Object.entries({
    atmosphere: state.atmosphere?.status,
    color: state.color?.status,
    impression: state.impression?.status,
    pattern: state.pattern?.status,
    presence: state.presence?.status,
    arrangement: state.arrangement?.status,
    materiality: state.materiality?.status,
  }).filter(([, status]) => status === "stable" || status === "committed").map(([slot]) => slot);
  const committedSlots = Object.entries({
    atmosphere: state.atmosphere?.status,
    color: state.color?.status,
    impression: state.impression?.status,
    pattern: state.pattern?.status,
    presence: state.presence?.status,
    arrangement: state.arrangement?.status,
    materiality: state.materiality?.status,
  }).filter(([, status]) => status === "committed").map(([slot]) => slot);

  return {
    readiness: state.readiness,
    slotCoverage,
    stableSlots,
    committedSlots: committedSlots.length > 0 ? committedSlots : analysis.semanticMapping?.confidenceSummary.lockCandidateSlots ?? [],
  };
}

export function buildVisualIntentCompiler(input: VisualIntentCompilerInput): CompiledVisualIntentPackage {
  const canonicalState = buildCanonicalIntentState(input);
  const retrievalOutputs = buildRetrievalBridgeOutputs(input);
  const semanticSpec = buildSemanticSpec(canonicalState, retrievalOutputs);
  const unresolvedQuestions = unique([
    ...canonicalState.unresolvedSplits.map((item) => item.question),
    ...retrievalOutputs.flatMap((output) => output.unresolvedQuestions),
  ]);
  const developerBrief = buildDeveloperBrief(semanticSpec, unresolvedQuestions);
  const summary = buildSummary(semanticSpec);
  const generationPrompt = buildGenericImagePrompt(semanticSpec);
  const negativePrompt = buildNegativePrompt(
    canonicalState.constraints?.value ?? { avoidMotifs: [], avoidStyles: [], avoidPalette: [], avoidComposition: [], keepQualities: [] },
    canonicalState.antiBias?.value ?? { antiLiteralization: [], antiDecorative: [], antiLuxury: [], antiScene: [] },
    retrievalOutputs.map((output) => output.negativePrompt),
  );

  return {
    canonicalState,
    summary,
    developerBrief,
    semanticSpec,
    generationPrompt,
    negativePrompt,
    confidenceState: buildConfidenceState(canonicalState, input.analysis),
    unresolvedQuestions,
    trace: buildTraceBundle(input),
  };
}
