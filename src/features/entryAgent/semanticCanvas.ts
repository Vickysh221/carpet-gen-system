import { activeSemanticCanvasProvider } from "./semanticCanvasAdapter";
import { buildPoeticSemanticCanvas } from "./poeticSemanticLayer";
import type {
  ConfidenceLevel,
  EntryAgentAxisHints,
  EntryAgentAxisPath,
  EntryAgentDetectionResult,
  EntryAgentSlotKey,
  EntryAgentStatePatch,
  FuliSemanticCanvas,
  HighValueField,
  InterpretationCandidate,
  QuestionKind,
  SemanticGap,
  SemanticUnit,
} from "./types";

interface SemanticCanvasRule {
  cue: string;
  matches: string[];
  conceptualAxes: string[];
  metaphoricDomains: string[];
  designTranslations: FuliSemanticCanvas["designTranslations"];
  slotMappings: {
    targetFields: HighValueField[];
    targetSlots: EntryAgentSlotKey[];
    targetAxes: string[];
  };
  narrativePolicy: FuliSemanticCanvas["narrativePolicy"];
  questionImplications: FuliSemanticCanvas["questionImplications"];
}

const SEMANTIC_CANVAS_RULES: SemanticCanvasRule[] = [
  {
    cue: "咖啡时光",
    matches: ["咖啡时光"],
    conceptualAxes: ["daily ritual", "companionship", "slowing down", "low-stimulation warmth"],
    metaphoricDomains: ["domestic", "ritual", "tactile", "atmospheric"],
    designTranslations: {
      colorIdentity: ["earthy", "warm", "restrained"],
      impressionTone: ["warm", "calm", "companionable"],
      materialSuggestion: ["tactile", "grounded", "soft"],
      presenceIntensity: ["present but not loud"],
    },
    slotMappings: {
      targetFields: ["colorMood", "overallImpression"],
      targetSlots: ["color", "impression"],
      targetAxes: ["color.warmth", "color.saturation", "impression.calm", "impression.softness"],
    },
    narrativePolicy: {
      mustPreserve: [],
      mustNotOverLiteralize: ["咖啡时光"],
      directionalDominant: [],
    },
    questionImplications: {
      likelyQuestionKinds: ["anchor", "clarify"],
      likelyInformationGains: ["区分用户更在意温度感，还是更在意日常陪伴和慢下来这层氛围。"],
    },
  },
  {
    cue: "春绿明媚",
    matches: ["春天", "春意", "鲜艳", "明媚", "绿意", "绿意盎然"],
    conceptualAxes: ["seasonal emergence", "freshness", "green presence", "visible vitality"],
    metaphoricDomains: ["seasonal", "natural", "atmospheric", "conceptual"],
    designTranslations: {
      colorIdentity: ["green", "spring", "fresh"],
      colorRestraint: ["visible but not neon"],
      impressionTone: ["uplifting", "open", "bright"],
      presenceIntensity: ["visible but not aggressive"],
    },
    slotMappings: {
      targetFields: ["colorMood", "overallImpression"],
      targetSlots: ["color", "impression"],
      targetAxes: ["color.saturation", "color.warmth", "impression.energy"],
    },
    narrativePolicy: {
      mustPreserve: ["绿意", "绿意盎然", "春意"],
      mustNotOverLiteralize: [],
      directionalDominant: ["鲜艳", "明媚"],
    },
    questionImplications: {
      likelyQuestionKinds: ["clarify", "contrast"],
      likelyInformationGains: ["区分颜色 identity 是否必须被看见，以及鲜活感更多落在颜色还是整体印象。"],
    },
  },
  {
    cue: "草色遥看近却无",
    matches: ["草色遥看近却无", "草色", "若有若无"],
    conceptualAxes: ["spring emergence", "subtle visibility", "soft presence", "green trace"],
    metaphoricDomains: ["seasonal", "atmospheric", "natural", "conceptual"],
    designTranslations: {
      colorIdentity: ["grass-toned", "fresh", "faintly green"],
      colorRestraint: ["diffuse", "low-contrast", "barely-there but not absent"],
      impressionTone: ["light", "soft", "airy"],
      presenceIntensity: ["subtle but preserved"],
    },
    slotMappings: {
      targetFields: ["colorMood", "overallImpression"],
      targetSlots: ["color", "impression"],
      targetAxes: ["color.saturation", "impression.energy"],
    },
    narrativePolicy: {
      mustPreserve: ["草色", "若有若无"],
      mustNotOverLiteralize: [],
      directionalDominant: [],
    },
    questionImplications: {
      likelyQuestionKinds: ["strength", "clarify"],
      likelyInformationGains: ["区分 subtle color presence 是否需要稳定保留，还是只是不要太显眼。"],
    },
  },
  {
    cue: "张扬快乐",
    matches: ["张扬", "快乐"],
    conceptualAxes: ["expressive energy", "visible joy", "outward presence"],
    metaphoricDomains: ["conceptual", "atmospheric", "formal"],
    designTranslations: {
      impressionTone: ["energetic", "joyful", "confident"],
      colorRestraint: ["less restrained"],
      presenceIntensity: ["clear presence"],
    },
    slotMappings: {
      targetFields: ["overallImpression"],
      targetSlots: ["impression"],
      targetAxes: ["impression.energy", "impression.calm", "impression.softness"],
    },
    narrativePolicy: {
      mustPreserve: [],
      mustNotOverLiteralize: [],
      directionalDominant: ["张扬", "快乐"],
    },
    questionImplications: {
      likelyQuestionKinds: ["contrast"],
      likelyInformationGains: ["区分更想保留快乐张力，还是只要一点可见存在感。"],
    },
  },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function hasPoeticSignal(units: SemanticUnit[]) {
  return units.some((unit) => unit.cueType === "poetic");
}

function shouldUseSemanticCanvasMode(input: {
  text: string;
  detection: EntryAgentDetectionResult;
  semanticUnits: SemanticUnit[];
  poeticCanvas?: FuliSemanticCanvas;
}) {
  const normalized = normalizeText(input.text);
  if (normalized.length < 4) {
    return false;
  }

  return Boolean(input.poeticCanvas) || hasPoeticSignal(input.semanticUnits) || input.semanticUnits.length >= 2 || input.detection.hitFields.length >= 2;
}

function buildRuleBasedSemanticCanvas(input: {
  text: string;
  detection: EntryAgentDetectionResult;
  semanticUnits: SemanticUnit[];
}): FuliSemanticCanvas | undefined {
  const text = normalizeText(input.text);
  const matchedRules = SEMANTIC_CANVAS_RULES.filter((rule) => rule.matches.some((cue) => text.includes(cue)));

  if (matchedRules.length === 0 && !hasPoeticSignal(input.semanticUnits)) {
    return undefined;
  }

  return {
    source: "rule-based",
    confidence: matchedRules.length > 0 ? 0.72 : 0.56,
    rawCues: unique(matchedRules.flatMap((rule) => rule.matches.filter((cue) => text.includes(cue)))),
    conceptualAxes: unique(matchedRules.flatMap((rule) => rule.conceptualAxes)),
    metaphoricDomains: unique(matchedRules.flatMap((rule) => rule.metaphoricDomains)),
    designTranslations: {
      colorIdentity: unique(matchedRules.flatMap((rule) => rule.designTranslations.colorIdentity ?? [])),
      colorRestraint: unique(matchedRules.flatMap((rule) => rule.designTranslations.colorRestraint ?? [])),
      motifLogic: unique(matchedRules.flatMap((rule) => rule.designTranslations.motifLogic ?? [])),
      arrangementLogic: unique(matchedRules.flatMap((rule) => rule.designTranslations.arrangementLogic ?? [])),
      impressionTone: unique(matchedRules.flatMap((rule) => rule.designTranslations.impressionTone ?? [])),
      materialSuggestion: unique(matchedRules.flatMap((rule) => rule.designTranslations.materialSuggestion ?? [])),
      presenceIntensity: unique(matchedRules.flatMap((rule) => rule.designTranslations.presenceIntensity ?? [])),
    },
    slotMappings: {
      targetFields: unique(matchedRules.flatMap((rule) => rule.slotMappings.targetFields)),
      targetSlots: unique(matchedRules.flatMap((rule) => rule.slotMappings.targetSlots)),
      targetAxes: unique(matchedRules.flatMap((rule) => rule.slotMappings.targetAxes)),
    },
    narrativePolicy: {
      mustPreserve: unique(matchedRules.flatMap((rule) => rule.narrativePolicy.mustPreserve)),
      mustNotOverLiteralize: unique(matchedRules.flatMap((rule) => rule.narrativePolicy.mustNotOverLiteralize)),
      directionalDominant: unique(matchedRules.flatMap((rule) => rule.narrativePolicy.directionalDominant)),
    },
    questionImplications: {
      likelyQuestionKinds: unique(matchedRules.flatMap((rule) => rule.questionImplications.likelyQuestionKinds)),
      likelyInformationGains: unique(matchedRules.flatMap((rule) => rule.questionImplications.likelyInformationGains)),
    },
  };
}

function mergeStringArrays(...values: Array<string[] | undefined>) {
  return unique(values.flatMap((value) => value ?? []));
}

function mergeSemanticCanvases(
  base: FuliSemanticCanvas | undefined,
  extra: FuliSemanticCanvas | undefined,
): FuliSemanticCanvas | undefined {
  if (!base) {
    return extra;
  }

  if (!extra) {
    return base;
  }

  return {
    source: base.source === extra.source ? base.source : "hybrid",
    confidence: Number((((base.confidence ?? 0.62) + (extra.confidence ?? 0.7)) / 2).toFixed(2)),
    rawCues: mergeStringArrays(base.rawCues, extra.rawCues),
    conceptualAxes: mergeStringArrays(base.conceptualAxes, extra.conceptualAxes),
    metaphoricDomains: mergeStringArrays(base.metaphoricDomains, extra.metaphoricDomains),
    designTranslations: {
      colorIdentity: mergeStringArrays(base.designTranslations.colorIdentity, extra.designTranslations.colorIdentity),
      colorRestraint: mergeStringArrays(base.designTranslations.colorRestraint, extra.designTranslations.colorRestraint),
      motifLogic: mergeStringArrays(base.designTranslations.motifLogic, extra.designTranslations.motifLogic),
      arrangementLogic: mergeStringArrays(base.designTranslations.arrangementLogic, extra.designTranslations.arrangementLogic),
      impressionTone: mergeStringArrays(base.designTranslations.impressionTone, extra.designTranslations.impressionTone),
      materialSuggestion: mergeStringArrays(base.designTranslations.materialSuggestion, extra.designTranslations.materialSuggestion),
      presenceIntensity: mergeStringArrays(base.designTranslations.presenceIntensity, extra.designTranslations.presenceIntensity),
    },
    slotMappings: {
      targetFields: unique([...base.slotMappings.targetFields, ...extra.slotMappings.targetFields]),
      targetSlots: unique([...base.slotMappings.targetSlots, ...extra.slotMappings.targetSlots]),
      targetAxes: unique([...base.slotMappings.targetAxes, ...extra.slotMappings.targetAxes]),
    },
    narrativePolicy: {
      mustPreserve: mergeStringArrays(base.narrativePolicy.mustPreserve, extra.narrativePolicy.mustPreserve),
      mustNotOverLiteralize: mergeStringArrays(base.narrativePolicy.mustNotOverLiteralize, extra.narrativePolicy.mustNotOverLiteralize),
      directionalDominant: mergeStringArrays(base.narrativePolicy.directionalDominant, extra.narrativePolicy.directionalDominant),
    },
    questionImplications: {
      likelyQuestionKinds: mergeStringArrays(base.questionImplications.likelyQuestionKinds, extra.questionImplications.likelyQuestionKinds),
      likelyInformationGains: mergeStringArrays(base.questionImplications.likelyInformationGains, extra.questionImplications.likelyInformationGains),
    },
    poeticSignal: extra.poeticSignal ?? base.poeticSignal,
  };
}

export async function buildSemanticCanvas(input: {
  text: string;
  detection: EntryAgentDetectionResult;
  semanticUnits: SemanticUnit[];
}): Promise<FuliSemanticCanvas | undefined> {
  const ruleCanvas = buildRuleBasedSemanticCanvas(input);
  const poeticCanvas = buildPoeticSemanticCanvas(input.text);
  const baseCanvas = mergeSemanticCanvases(ruleCanvas, poeticCanvas);

  if (!shouldUseSemanticCanvasMode({ ...input, poeticCanvas })) {
    return baseCanvas;
  }

  const llmResult = await activeSemanticCanvasProvider.generate({
    text: input.text,
    hitFields: input.detection.hitFields,
    semanticUnits: input.semanticUnits,
  });

  return mergeSemanticCanvases(baseCanvas, llmResult.canvas);
}

function inferCanvasConfidence(canvas: FuliSemanticCanvas): ConfidenceLevel {
  if ((canvas.confidence ?? 0) >= 0.8) return "high";
  if ((canvas.confidence ?? 0) >= 0.56) return "medium";
  return "low";
}

export function enrichDetectionWithSemanticCanvas(
  detection: EntryAgentDetectionResult,
  semanticCanvas: FuliSemanticCanvas | undefined,
): EntryAgentDetectionResult {
  if (!semanticCanvas || semanticCanvas.slotMappings.targetFields.length === 0) {
    return detection;
  }

  const hitFields = unique([...detection.hitFields, ...semanticCanvas.slotMappings.targetFields]);
  const evidence = { ...detection.evidence };
  const confidence = { ...detection.confidence };
  const sharedEvidence = unique([
    ...(semanticCanvas.poeticSignal?.hits.map((hit) => hit.matchedText) ?? []),
    ...semanticCanvas.rawCues,
    ...semanticCanvas.narrativePolicy.mustPreserve,
  ]);
  const inferredConfidence = inferCanvasConfidence(semanticCanvas);

  semanticCanvas.slotMappings.targetFields.forEach((field) => {
    evidence[field] = unique([...(evidence[field] ?? []), ...sharedEvidence]).slice(0, 5);
    confidence[field] = confidence[field] ?? inferredConfidence;
  });

  return {
    hitFields,
    evidence,
    confidence,
  };
}

function tokenSet(canvas: FuliSemanticCanvas) {
  return new Set(
    [
      ...canvas.rawCues,
      ...canvas.conceptualAxes,
      ...canvas.metaphoricDomains,
      ...(canvas.designTranslations.colorIdentity ?? []),
      ...(canvas.designTranslations.colorRestraint ?? []),
      ...(canvas.designTranslations.motifLogic ?? []),
      ...(canvas.designTranslations.arrangementLogic ?? []),
      ...(canvas.designTranslations.impressionTone ?? []),
      ...(canvas.designTranslations.materialSuggestion ?? []),
      ...(canvas.designTranslations.presenceIntensity ?? []),
      ...canvas.narrativePolicy.mustPreserve,
      ...canvas.narrativePolicy.mustNotOverLiteralize,
      ...canvas.narrativePolicy.directionalDominant,
    ].map((item) => item.toLowerCase()),
  );
}

function tokenMatches(tokens: Set<string>, patterns: string[]) {
  return patterns.some((pattern) => [...tokens].some((token) => token.includes(pattern)));
}

function buildPatchIntentFromAxisHints(axisHints: EntryAgentAxisHints): EntryAgentStatePatch {
  const patchIntent: EntryAgentStatePatch = {};

  (Object.keys(axisHints) as EntryAgentSlotKey[]).forEach((slot) => {
    const slotHints = axisHints[slot];
    if (!slotHints) {
      return;
    }

    const slotPatch: Record<string, number> = {};
    Object.entries(slotHints).forEach(([axis, value]) => {
      if (typeof value !== "number") {
        return;
      }
      slotPatch[axis] = Number(((value - 0.5) * 0.2).toFixed(3));
    });

    if (Object.keys(slotPatch).length > 0) {
      patchIntent[slot] = slotPatch as never;
    }
  });

  return patchIntent;
}

function inferQuestionKind(canvas: FuliSemanticCanvas): QuestionKind {
  const firstKind = canvas.questionImplications.likelyQuestionKinds[0];
  if (firstKind === "contrast" || firstKind === "clarify" || firstKind === "anchor" || firstKind === "strength") {
    return firstKind;
  }
  return "clarify";
}

function inferDisambiguationAxes(canvas: FuliSemanticCanvas, field: HighValueField): EntryAgentAxisPath[] {
  const allowed: Record<HighValueField, EntryAgentAxisPath[]> = {
    colorMood: ["color.warmth", "color.saturation"],
    overallImpression: ["impression.calm", "impression.energy", "impression.softness"],
    patternTendency: ["motif.complexity", "motif.geometry", "motif.organic"],
    arrangementTendency: ["arrangement.order", "arrangement.spacing"],
    spaceContext: [],
  };

  return canvas.slotMappings.targetAxes.filter((axis): axis is EntryAgentAxisPath => allowed[field].includes(axis as EntryAgentAxisPath));
}

function buildColorAxisHints(canvas: FuliSemanticCanvas): EntryAgentAxisHints {
  if (canvas.poeticSignal?.axisHints?.color) {
    return { color: canvas.poeticSignal.axisHints.color };
  }

  const tokens = tokenSet(canvas);
  const hints: EntryAgentAxisHints = { color: {} };

  if (tokenMatches(tokens, ["green", "spring", "grass", "fresh"])) {
    hints.color!.warmth = 0.46;
  } else if (tokenMatches(tokens, ["warm", "earthy", "coffee", "amber"])) {
    hints.color!.warmth = 0.68;
  }

  if (tokenMatches(tokens, ["visible", "vivid", "bright", "鲜艳", "明媚", "lively"])) {
    hints.color!.saturation = 0.7;
  }

  if (tokenMatches(tokens, ["diffuse", "low-contrast", "restrained", "subtle", "faintly", "barely-there", "not neon"])) {
    hints.color!.saturation = hints.color!.saturation === undefined ? 0.34 : Number(((hints.color!.saturation + 0.34) / 2).toFixed(2));
  }

  if (tokenMatches(tokens, ["绿意", "草色"])) {
    hints.color!.saturation = hints.color!.saturation === undefined ? 0.56 : hints.color!.saturation;
  }

  return hints;
}

function buildImpressionAxisHints(canvas: FuliSemanticCanvas): EntryAgentAxisHints {
  if (canvas.poeticSignal?.axisHints?.impression) {
    return { impression: canvas.poeticSignal.axisHints.impression };
  }

  const tokens = tokenSet(canvas);
  const hints: EntryAgentAxisHints = { impression: {} };

  if (tokenMatches(tokens, ["calm", "slow", "companionship", "ritual", "low-stimulation", "airy"])) {
    hints.impression!.calm = 0.68;
  }

  if (tokenMatches(tokens, ["soft", "tactile", "companionable", "warm"])) {
    hints.impression!.softness = 0.66;
  }

  if (tokenMatches(tokens, ["energetic", "joyful", "bright", "uplifting", "visible vitality", "presence", "张扬", "快乐"])) {
    hints.impression!.energy = 0.72;
  }

  if (tokenMatches(tokens, ["subtle", "light", "soft presence"])) {
    hints.impression!.energy = hints.impression!.energy === undefined ? 0.44 : Number(((hints.impression!.energy + 0.44) / 2).toFixed(2));
  }

  return hints;
}

function buildPatternAxisHints(canvas: FuliSemanticCanvas): EntryAgentAxisHints {
  if (canvas.poeticSignal?.axisHints?.motif) {
    return { motif: canvas.poeticSignal.axisHints.motif };
  }

  const tokens = tokenSet(canvas);
  const hints: EntryAgentAxisHints = { motif: {} };

  if (tokenMatches(tokens, ["sparse", "minimal", "low-density", "low visual weight"])) {
    hints.motif!.complexity = 0.28;
  } else if (tokenMatches(tokens, ["dense", "clustered", "layered"])) {
    hints.motif!.complexity = 0.68;
  }

  if (tokenMatches(tokens, ["geometry", "structured", "clear-edged"])) {
    hints.motif!.geometry = 0.68;
  }

  if (tokenMatches(tokens, ["organic", "flowing", "blurred", "bamboo", "mist"])) {
    hints.motif!.organic = 0.72;
  }

  return hints;
}

function buildCanvasCandidateLabel(canvas: FuliSemanticCanvas, field: HighValueField) {
  if (canvas.poeticSignal?.hits.length) {
    const cueSummary = canvas.poeticSignal.hits.slice(0, 2).map((hit) => hit.matchedText).join(" / ");
    if (field === "colorMood") return `${cueSummary} color mood`;
    if (field === "overallImpression") return `${cueSummary} impression`;
    if (field === "patternTendency") return `${cueSummary} pattern intent`;
  }

  if (field === "colorMood" && canvas.narrativePolicy.mustPreserve.some((cue) => ["绿意", "绿意盎然", "春意", "草色"].includes(cue))) {
    return "spring green presence";
  }

  if (canvas.narrativePolicy.mustNotOverLiteralize.includes("咖啡时光")) {
    return field === "colorMood" ? "coffee-time warmth" : "coffee-time atmosphere";
  }

  if (canvas.narrativePolicy.directionalDominant.some((cue) => ["张扬", "快乐"].includes(cue))) {
    return "joyful presence";
  }

  return `semantic canvas ${field}`;
}

function buildCanvasSemanticHints(canvas: FuliSemanticCanvas, field: HighValueField) {
  const poeticHints = canvas.poeticSignal?.fieldSemanticHints?.[field];
  if (poeticHints) {
    return poeticHints as Record<string, string | string[]>;
  }

  if (field === "colorMood" && canvas.narrativePolicy.mustPreserve.some((cue) => ["绿意", "绿意盎然"].includes(cue))) {
    return { colorMood: canvas.narrativePolicy.mustPreserve.includes("草色") ? "spring-green-subtle" : "spring-green" } as Record<string, string | string[]>;
  }

  if (canvas.narrativePolicy.mustNotOverLiteralize.includes("咖啡时光")) {
    return field === "colorMood"
      ? ({ colorMood: "coffee-time", impression: "warm" } as Record<string, string | string[]>)
      : ({ impression: "warm" } as Record<string, string | string[]>);
  }

  if (field === "overallImpression" && canvas.narrativePolicy.directionalDominant.some((cue) => ["张扬", "快乐"].includes(cue))) {
    return { impression: "energetic" } as Record<string, string | string[]>;
  }

  return undefined;
}

function buildCanvasAxisHints(canvas: FuliSemanticCanvas, field: HighValueField) {
  if (field === "colorMood") {
    return {
      ...buildColorAxisHints(canvas),
      ...buildImpressionAxisHints(canvas),
    };
  }

  if (field === "overallImpression") {
    return buildImpressionAxisHints(canvas);
  }

  if (field === "patternTendency") {
    return buildPatternAxisHints(canvas);
  }

  return {};
}

export function buildSemanticCanvasCandidates(input: {
  semanticCanvas?: FuliSemanticCanvas;
  text: string;
}): InterpretationCandidate[] {
  const canvas = input.semanticCanvas;
  if (!canvas) {
    return [];
  }

  return canvas.slotMappings.targetFields.slice(0, 2).map((field, index) => {
    const primarySlot = field === "colorMood"
      ? "color"
      : field === "overallImpression"
        ? "impression"
        : field === "patternTendency"
          ? "motif"
          : field === "arrangementTendency"
            ? "arrangement"
            : "impression";
    const axisHints = buildCanvasAxisHints(canvas, field);

    return {
      id: `semantic-canvas:${field}:${index}`,
      label: buildCanvasCandidateLabel(canvas, field),
      sourceType: "semantic-canvas",
      sourceId: canvas.source === "llm" ? "semantic-canvas:llm" : canvas.source === "hybrid" ? "semantic-canvas:hybrid" : "semantic-canvas:rule-based",
      field,
      primarySlot,
      secondarySlots: canvas.slotMappings.targetSlots.filter((slot) => slot !== primarySlot).slice(0, 2),
      polarity: "mixed",
      strength: canvas.source === "llm" || canvas.source === "hybrid" ? 0.84 : 0.72,
      confidence: canvas.source === "llm" || canvas.source === "hybrid" ? 0.8 : 0.68,
      matchedCues: canvas.rawCues.length > 0 ? canvas.rawCues : [input.text],
      semanticHints: buildCanvasSemanticHints(canvas, field),
      axisHints,
      patchIntent: buildPatchIntentFromAxisHints(axisHints),
      ownershipClass: "primary-eligible",
      questionKindHint: inferQuestionKind(canvas),
      disambiguationAxes: inferDisambiguationAxes(canvas, field),
      informationGainHint: canvas.questionImplications.likelyInformationGains[0],
      note: `semantic canvas ${canvas.source ?? "rule-based"}：先按高层语义结构落到 ${field}。`,
    };
  });
}

function hasAny(values: string[], patterns: string[]) {
  return patterns.some((pattern) => values.includes(pattern));
}

export function getSemanticCanvasQuestionPrompt(
  semanticCanvas: FuliSemanticCanvas | undefined,
  gap: Pick<SemanticGap, "targetField" | "targetSlot">,
) {
  if (!semanticCanvas) {
    return undefined;
  }

  if (semanticCanvas.poeticSignal?.followupHints.length) {
    if (gap.targetField === "colorMood" || gap.targetField === "overallImpression" || gap.targetField === "patternTendency") {
      return semanticCanvas.poeticSignal.followupHints[0];
    }
  }

  if (
    hasAny(semanticCanvas.narrativePolicy.mustPreserve, ["绿意", "绿意盎然", "春意", "草色"]) &&
    (gap.targetField === "colorMood" || gap.targetSlot === "color")
  ) {
    return "你说的“绿意”，更像颜色本身要被看见，还是只是整体要有一点春天的气息？";
  }

  if (hasAny(semanticCanvas.narrativePolicy.mustNotOverLiteralize, ["咖啡时光"])) {
    return "咖啡时光这层，对你更重要的是温度感，还是那种日常陪伴的氛围？";
  }

  if (
    hasAny(semanticCanvas.narrativePolicy.directionalDominant, ["张扬", "快乐"]) &&
    (gap.targetField === "overallImpression" || gap.targetSlot === "impression")
  ) {
    return "你更想让它快乐有张力，还是把存在感稍微收一点？";
  }

  return undefined;
}
