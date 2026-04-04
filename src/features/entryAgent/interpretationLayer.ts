import { routeEntryQuery } from "./queryRouting";
import type {
  InterpretationConfidenceSummary,
  InterpretationLayerResult,
  InterpretationUnresolvedSplit,
  NormalizedInputEvent,
  PatternSemanticProjection,
  PatternSemanticSlotCandidate,
  QueryRouteDecision,
  RetrievalLayerResult,
  SemanticInputSpan,
  SemanticRoleCandidate,
  SemanticRoleHints,
} from "./types";

const ATMOSPHERE_PATTERNS = [
  { label: "humid suspended air", patterns: ["空气", "气息", "湿度", "潮气", "香气", "雾", "雾气"] },
  { label: "clear sun-washed openness", patterns: ["清透", "通透", "留白", "亮", "日照", "晒", "薄"] },
  { label: "lowered boundary hush", patterns: ["边界", "没有分界线", "压低", "沉"] },
];

const MOTIF_PATTERNS = [
  { label: "botanical linear trace", patterns: ["叶", "竹", "荷", "花", "枝", "藤"] },
  { label: "wave or shoreline trace", patterns: ["帆", "波", "海", "岸", "沙滩"] },
  { label: "grain or mineral texture", patterns: ["石", "肌理", "纹理", "石纹"] },
];

const SENSORY_PATTERNS = [
  { label: "diffusion and evaporation", patterns: ["香气", "气息", "挥发", "扩散", "漂"] },
  { label: "floating humidity", patterns: ["空气", "湿度", "潮气", "悬着"] },
];

const COLOR_PATTERNS = [
  { label: "pale aqua or washed blue", patterns: ["海", "天空", "水", "烟雨"] },
  { label: "washed green accent", patterns: ["叶", "草", "竹", "青", "绿"] },
  { label: "sun-bleached sand brightness", patterns: ["沙", "日照", "亮", "白"] },
];

const STRUCTURE_PATTERNS = [
  { label: "scattered field", patterns: ["一点", "散", "散开", "局部"] },
  { label: "breathing gradient", patterns: ["留白", "通透", "空气", "呼吸"] },
  { label: "directional drift", patterns: ["流动", "风", "漂", "摇曳"] },
];

const CONSTRAINT_PATTERNS = [
  { label: "avoid literal scenic illustration", patterns: ["海边", "沙滩", "天空", "景"] },
  { label: "avoid fully literal object rendering", patterns: ["叶", "花", "果", "帆"] },
  { label: "suppress overfilled density", patterns: ["不要太满", "别太满", "不要太花", "别太花"] },
];

const RENDERING_BIAS_PATTERNS = [
  { label: "anti-literal / suggestive", patterns: ["香气", "空气", "薄纱", "若有若无"] },
  { label: "ambient over illustrative", patterns: ["留白", "通透", "边界", "没有分界线"] },
];

function normalizeForMatch(text: string) {
  return text.replace(/\s+/g, "");
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function takeUniqueLabels(candidates: SemanticRoleCandidate[]) {
  return [...new Set(candidates.map((candidate) => candidate.label))];
}

function createRoleCandidate(input: {
  id: string;
  role: SemanticRoleCandidate["role"];
  label: string;
  evidence: string[];
  sourceSpanIds: string[];
  semanticFunction: SemanticRoleCandidate["semanticFunction"];
  confidence: number;
  source: SemanticRoleCandidate["source"];
  rationale: string;
  polarity?: "support" | "avoid";
}): SemanticRoleCandidate {
  return {
    id: input.id,
    role: input.role,
    label: input.label,
    evidence: [...new Set(input.evidence)],
    sourceSpanIds: [...new Set(input.sourceSpanIds)],
    semanticFunction: input.semanticFunction,
    confidence: Number(input.confidence.toFixed(2)),
    source: input.source,
    rationale: input.rationale,
    polarity: input.polarity,
  };
}

function matchingSpanIds(spans: SemanticInputSpan[], patterns: string[]) {
  return spans
    .filter((span) => patterns.some((pattern) => span.normalizedText.includes(pattern)))
    .map((span) => span.id);
}

function matchingEvidence(spans: SemanticInputSpan[], patterns: string[]) {
  return spans
    .filter((span) => patterns.some((pattern) => span.normalizedText.includes(pattern)))
    .map((span) => span.text);
}

function buildSemanticRoleHints(
  event: NormalizedInputEvent,
  retrieval: RetrievalLayerResult,
  route: QueryRouteDecision,
): SemanticRoleHints {
  const text = normalizeForMatch(event.normalizedText);
  const phraseText = event.preservedPhrases.join(" ");
  const matchSurface = `${text} ${phraseText}`.trim();
  const retrievalText = retrieval.semanticCandidates.slice(0, 4).map((item) => item.id).join(" ");
  let roleCounter = 0;
  const nextRoleId = () => `role-${++roleCounter}`;

  const baseAtmosphere: SemanticRoleCandidate[] = [];
  const accentMotif: SemanticRoleCandidate[] = [];
  const sensoryModifiers: SemanticRoleCandidate[] = [];
  const colorCues: SemanticRoleCandidate[] = [];
  const structureHints: SemanticRoleCandidate[] = [];
  const constraints: SemanticRoleCandidate[] = [];
  const renderingBiases: SemanticRoleCandidate[] = [];

  for (const pattern of ATMOSPHERE_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    baseAtmosphere.push(createRoleCandidate({
      id: nextRoleId(),
      role: "base-atmosphere",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "base",
      confidence: 0.54 + matches.length * 0.11 + (route.detectedType === "poetic-atmospheric" ? 0.08 : 0),
      source: "rule",
      rationale: "空气、边界或表面天气信号优先作为 atmosphere base 保留。",
    }));
  }

  for (const pattern of MOTIF_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    accentMotif.push(createRoleCandidate({
      id: nextRoleId(),
      role: "accent-motif",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "accent",
      confidence: 0.45 + matches.length * 0.09 + (route.detectedType === "explicit-motif" ? 0.06 : 0),
      source: "rule",
      rationale: "对象线索先保留为 motif trace 候选，不直接拉成主路径。",
    }));
  }

  for (const pattern of SENSORY_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    sensoryModifiers.push(createRoleCandidate({
      id: nextRoleId(),
      role: "sensory-modifier",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "modifier",
      confidence: 0.52 + matches.length * 0.1,
      source: "rule",
      rationale: "感官词优先解释为扩散、悬浮或挥发行为，而不是对象本体。",
    }));
  }

  for (const pattern of COLOR_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item) || retrievalText.includes(item));
    if (matches.length === 0) continue;
    colorCues.push(createRoleCandidate({
      id: nextRoleId(),
      role: "color-cue",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "modifier",
      confidence: 0.44 + matches.length * 0.09,
      source: retrievalText ? "retrieval" : "rule",
      rationale: "环境与植物线索优先作为色彩天气候选，而不是孤立色名。",
    }));
  }

  for (const pattern of STRUCTURE_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    structureHints.push(createRoleCandidate({
      id: nextRoleId(),
      role: "structure-hint",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "modifier",
      confidence: 0.42 + matches.length * 0.1,
      source: "rule",
      rationale: "结构线索用于决定织物上的呼吸、疏密和流向。",
    }));
  }

  for (const pattern of CONSTRAINT_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    constraints.push(createRoleCandidate({
      id: nextRoleId(),
      role: "constraint",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "constraint",
      confidence: 0.55 + matches.length * 0.08,
      source: "rule",
      rationale: "这些线索说明要防止系统滑向过度写实或过满构图。",
      polarity: "avoid",
    }));
  }

  for (const pattern of RENDERING_BIAS_PATTERNS) {
    const matches = matchingEvidence(event.spans, pattern.patterns).length > 0
      ? matchingEvidence(event.spans, pattern.patterns)
      : pattern.patterns.filter((item) => matchSurface.includes(item));
    if (matches.length === 0) continue;
    renderingBiases.push(createRoleCandidate({
      id: nextRoleId(),
      role: "rendering-bias",
      label: pattern.label,
      evidence: matches,
      sourceSpanIds: matchingSpanIds(event.spans, pattern.patterns),
      semanticFunction: "rendering-bias",
      confidence: 0.5 + matches.length * 0.09,
      source: "rule",
      rationale: "这些线索要求 rendering 偏 suggestive / ambient，避免说明书式对象画法。",
      polarity: "avoid",
    }));
  }

  if (route.detectedType === "mixed-compositional" || includesAny(text, ["和", "有一点", "带一点", "里有"])) {
    structureHints.push(createRoleCandidate({
      id: nextRoleId(),
      role: "structure-hint",
      label: "base-accent split",
      evidence: event.preservedPhrases.length > 0 ? event.preservedPhrases : [event.normalizedText],
      sourceSpanIds: event.spans.filter((span) => span.spanType === "composition-span" || span.spanType === "phrase-span").map((span) => span.id),
      semanticFunction: "modifier",
      confidence: 0.72,
      source: "route",
      rationale: "句内存在 base / accent 并置结构，planner 需要保留这道分叉。",
    }));
  }

  return {
    baseAtmosphere,
    accentMotif,
    sensoryModifiers,
    colorCues,
    structureHints,
    constraints,
    renderingBiases,
  };
}

function pushCandidate(
  bucket: PatternSemanticSlotCandidate[],
  value: string,
  confidence: number,
  sourceRoles: string[],
  source: PatternSemanticSlotCandidate["source"],
  projectionRationale: string,
  status: PatternSemanticSlotCandidate["status"] = confidence >= 0.72 ? "locked" : confidence >= 0.58 ? "candidate-only" : "unresolved",
) {
  const existing = bucket.find((item) => item.value === value);
  if (!existing) {
    bucket.push({
      value,
      confidence: Number(confidence.toFixed(2)),
      sourceRoles: [...new Set(sourceRoles)],
      source,
      projectionRationale,
      status,
    });
    return;
  }
  existing.confidence = Number(Math.max(existing.confidence, confidence).toFixed(2));
  existing.sourceRoles = [...new Set([...existing.sourceRoles, ...sourceRoles])];
  if (status === "locked" || existing.status !== "locked") {
    existing.status = status;
  }
}

function projectPatternSemanticSlots(
  roles: SemanticRoleHints,
  route: QueryRouteDecision,
): PatternSemanticProjection {
  const patternArchitecture: PatternSemanticSlotCandidate[] = [];
  const structuralOrder: PatternSemanticSlotCandidate[] = [];
  const densityBreathing: PatternSemanticSlotCandidate[] = [];
  const flowDirection: PatternSemanticSlotCandidate[] = [];
  const motifFamily: PatternSemanticSlotCandidate[] = [];
  const abstractionLevel: PatternSemanticSlotCandidate[] = [];
  const semanticAnchorStrength: PatternSemanticSlotCandidate[] = [];
  const colorClimate: PatternSemanticSlotCandidate[] = [];

  if (roles.baseAtmosphere.length > 0) {
    pushCandidate(patternArchitecture, "field", 0.74, roles.baseAtmosphere.map((item) => item.id), "semantic-role", "空气性输入优先让图案以 field 方式成立。");
    pushCandidate(structuralOrder, "hidden_grid", 0.62, roles.baseAtmosphere.map((item) => item.id), "semantic-role", "气氛主导时需要弱骨架托住织物秩序。");
    pushCandidate(densityBreathing, "breathing_gradient", 0.7, roles.baseAtmosphere.map((item) => item.id), "semantic-role", "空气与留白更适合渐变式呼吸。");
  }

  if (roles.structureHints.some((item) => item.label.includes("scattered"))) {
    pushCandidate(patternArchitecture, "scattered", 0.68, roles.structureHints.filter((item) => item.label.includes("scattered")).map((item) => item.id), "semantic-role", "局部出现和散点节奏更适合轻量 accent。");
  }

  if (roles.structureHints.some((item) => item.label.includes("directional drift"))) {
    pushCandidate(flowDirection, "diagonal_breeze", 0.66, roles.structureHints.filter((item) => item.label.includes("directional drift")).map((item) => item.id), "semantic-role", "结构线索显示图样存在轻微方向性。");
    pushCandidate(flowDirection, "upward_evaporation", 0.63, roles.structureHints.filter((item) => item.label.includes("directional drift")).map((item) => item.id), "semantic-role", "扩散和挥发感支持 upward evaporation。");
  }

  if (roles.sensoryModifiers.length > 0) {
    pushCandidate(flowDirection, "upward_evaporation", 0.71, roles.sensoryModifiers.map((item) => item.id), "semantic-role", "香气、湿度或挥发词支持 upward evaporation。");
    pushCandidate(densityBreathing, "clustered_sparse", 0.64, roles.sensoryModifiers.map((item) => item.id), "semantic-role", "感官悬浮更适合稀疏但局部成簇。");
  }

  if (roles.accentMotif.some((item) => item.label.includes("botanical"))) {
    pushCandidate(motifFamily, "botanical_linear", 0.64, roles.accentMotif.filter((item) => item.label.includes("botanical")).map((item) => item.id), "semantic-role", "植物性痕迹更适合线性 motif family。");
    pushCandidate(motifFamily, "hybrid_botanical_fluid", 0.72, [...roles.accentMotif.map((item) => item.id), ...roles.baseAtmosphere.map((item) => item.id)], "semantic-role", "当植物痕迹和空气性并存时，更适合 botanical + fluid 混合。");
  }

  if (roles.accentMotif.some((item) => item.label.includes("wave"))) {
    pushCandidate(motifFamily, "wave_fluid", 0.61, roles.accentMotif.filter((item) => item.label.includes("wave")).map((item) => item.id), "semantic-role", "岸线或水波痕迹更接近 fluid family。");
  }

  if (roles.baseAtmosphere.length > 0) {
    pushCandidate(abstractionLevel, "ambient", 0.72, roles.baseAtmosphere.map((item) => item.id), "route", "atmosphere-first 时，抽象层级应优先 ambient。");
    pushCandidate(abstractionLevel, "suggestive", 0.66, [...roles.baseAtmosphere.map((item) => item.id), ...roles.renderingBiases.map((item) => item.id)], "semantic-role", "保留气味与痕迹时，suggestive 更适合织物图样。");
  } else if (roles.accentMotif.length > 0) {
    pushCandidate(abstractionLevel, "suggestive", 0.7, roles.accentMotif.map((item) => item.id), "route", "motif trace-first 时优先 suggestive，而非 literal。");
  }

  if (route.detectedType === "explicit-motif") {
    pushCandidate(semanticAnchorStrength, "object_anchor:medium", 0.7, roles.accentMotif.map((item) => item.id), "route", "存在对象痕迹，但仍应控制在 trace 级别。");
  } else if (route.detectedType === "mixed-compositional") {
    pushCandidate(semanticAnchorStrength, "hybrid_anchor:medium_high", 0.76, [...roles.baseAtmosphere.map((item) => item.id), ...roles.accentMotif.map((item) => item.id)], "route", "base atmosphere 与 accent motif 并置，需要 hybrid anchor。");
  } else {
    pushCandidate(semanticAnchorStrength, "mood_anchor:medium", 0.68, roles.baseAtmosphere.map((item) => item.id), "route", "空气性输入优先依赖 mood anchor。");
  }

  if (roles.colorCues.some((item) => item.label.includes("pale aqua"))) {
    pushCandidate(colorClimate, "pale aqua", 0.58, roles.colorCues.filter((item) => item.label.includes("pale aqua")).map((item) => item.id), "semantic-role", "海风与水气线索支持 pale aqua。");
  }
  if (roles.colorCues.some((item) => item.label.includes("washed green"))) {
    pushCandidate(colorClimate, "washed sage", 0.6, roles.colorCues.filter((item) => item.label.includes("washed green")).map((item) => item.id), "semantic-role", "植物痕迹更适合作为洗浅的绿。");
    pushCandidate(colorClimate, "lemon-leaf green", 0.56, roles.colorCues.filter((item) => item.label.includes("washed green")).map((item) => item.id), "semantic-role", "植物青绿更适合作为 accent climate。");
  }
  if (roles.colorCues.some((item) => item.label.includes("sand"))) {
    pushCandidate(colorClimate, "sun-bleached sand", 0.62, roles.colorCues.filter((item) => item.label.includes("sand")).map((item) => item.id), "semantic-role", "日照与沙感支持 sun-bleached sand。");
  }
  if (colorClimate.length === 0 && route.detectedType === "poetic-atmospheric") {
    pushCandidate(colorClimate, "sea-salt white", 0.48, roles.baseAtmosphere.map((item) => item.id), "route", "气氛型输入默认保留高亮留白的色彩天气。");
  }

  return {
    formativeStructure: {
      patternArchitecture,
      structuralOrder,
      densityBreathing,
      flowDirection,
    },
    semanticMaterial: {
      motifFamily,
      abstractionLevel,
      semanticAnchorStrength,
    },
    atmosphericSurface: {
      colorClimate,
    },
    anchorHints: takeUniqueLabels([...roles.baseAtmosphere, ...roles.accentMotif, ...roles.colorCues]).slice(0, 6),
    variantHints: takeUniqueLabels([...roles.structureHints, ...roles.sensoryModifiers]).slice(0, 6),
    constraintHints: takeUniqueLabels([...roles.constraints, ...roles.renderingBiases]).slice(0, 6),
    slotTrace: [
      `patternArchitecture=${patternArchitecture.map((item) => item.value).join(",") || "none"}`,
      `structuralOrder=${structuralOrder.map((item) => item.value).join(",") || "none"}`,
      `densityBreathing=${densityBreathing.map((item) => item.value).join(",") || "none"}`,
      `flowDirection=${flowDirection.map((item) => item.value).join(",") || "none"}`,
      `motifFamily=${motifFamily.map((item) => item.value).join(",") || "none"}`,
      `abstractionLevel=${abstractionLevel.map((item) => item.value).join(",") || "none"}`,
      `semanticAnchorStrength=${semanticAnchorStrength.map((item) => item.value).join(",") || "none"}`,
      `colorClimate=${colorClimate.map((item) => item.value).join(",") || "none"}`,
    ],
  };
}

function buildUnresolvedManagement(
  roles: SemanticRoleHints,
  slots: PatternSemanticProjection,
  route: QueryRouteDecision,
): {
  unresolvedSplits: InterpretationUnresolvedSplit[];
  misleadingPathsToAvoid: string[];
  confidenceSummary: InterpretationConfidenceSummary;
} {
  const unresolvedSplits: InterpretationUnresolvedSplit[] = [];
  const misleadingPathsToAvoid: string[] = [];
  const lockedSignals: string[] = [];
  const candidateOnlySignals: string[] = [];
  const unresolvedSignals: string[] = [];
  const roleTensions: string[] = [];
  const slotTensions: string[] = [];

  if (roles.baseAtmosphere.length > 0 && roles.accentMotif.length > 0) {
    roleTensions.push("objectness-vs-atmosphericity");
    slotTensions.push("anchor-vs-variant");
    unresolvedSplits.push({
      id: "base-atmosphere-vs-accent-motif",
      dimension: "base-atmosphere-vs-accent-motif",
      prompt: "你更想保住整体空气，还是保住那一点母题痕迹？",
      options: ["保空气", "保痕迹"],
      rationale: "整句同时成立为 atmosphere base 与 motif accent，不应由单个对象词抢走主导权。",
      derivedFrom: [
        ...roles.baseAtmosphere.map((item) => item.id),
        ...roles.accentMotif.map((item) => item.id),
        "tension:objectness-vs-atmosphericity",
      ],
      whyHighValue: "这道分叉决定系统先保整体空气，还是先保对象痕迹，会直接改变图样成立方式。",
      misleadingPathsPrevented: ["motif-only collapse", "flat generic atmosphere fallback"],
      confidence: 0.76,
    });
    misleadingPathsToAvoid.push("motif-only collapse");
    unresolvedSignals.push("base-atmosphere-vs-accent-motif");
  }

  if (roles.sensoryModifiers.length > 0 && roles.accentMotif.length > 0) {
    roleTensions.push("diffusion-vs-trace-retention");
    slotTensions.push("anchor-strength-vs-abstraction");
    unresolvedSplits.push({
      id: "diffused-scent-vs-trace-retention",
      dimension: "diffused-scent-vs-trace-retention",
      prompt: "你更想让感官气息融进空气，还是局部保一点痕迹？",
      options: ["融进空气", "留一点痕迹"],
      rationale: "感官修饰语和对象痕迹并存时，应保留 diffusion 与 trace retention 的分叉。",
      derivedFrom: [
        ...roles.sensoryModifiers.map((item) => item.id),
        ...roles.accentMotif.map((item) => item.id),
        "tension:diffusion-vs-trace-retention",
      ],
      whyHighValue: "这道分叉决定香气是作为空气行为存在，还是作为局部图案痕迹保留。",
      misleadingPathsPrevented: ["literal object rendering", "mist-only collapse"],
      confidence: 0.72,
    });
    unresolvedSignals.push("diffused-scent-vs-trace-retention");
  }

  if (roles.constraints.length > 0 || roles.renderingBiases.length > 0) {
    lockedSignals.push(...takeUniqueLabels([...roles.constraints, ...roles.renderingBiases]));
    misleadingPathsToAvoid.push("scenic illustration");
    misleadingPathsToAvoid.push("literal object rendering");
  }

  if (slots.semanticMaterial.motifFamily.length === 0) {
    candidateOnlySignals.push("motif-family-open");
  }
  if (slots.atmosphericSurface.colorClimate.length === 0) {
    candidateOnlySignals.push("color-climate-open");
  }
  if (slots.formativeStructure.flowDirection.some((item) => item.status !== "locked")) {
    candidateOnlySignals.push("flow-direction-open");
  }
  if (route.detectedType === "vague-underspecified") {
    unresolvedSignals.push("guided-disambiguation");
  }

  return {
    unresolvedSplits,
    misleadingPathsToAvoid: [...new Set(misleadingPathsToAvoid)],
    confidenceSummary: {
      lockedSignals: [...new Set(lockedSignals)],
      candidateOnlySignals: [...new Set([...candidateOnlySignals, ...slotTensions])],
      unresolvedSignals: [...new Set([...unresolvedSignals, ...roleTensions])],
      confidenceScore: Number((0.46 + lockedSignals.length * 0.06 + roles.baseAtmosphere.length * 0.04 + roles.accentMotif.length * 0.04).toFixed(2)),
    },
  };
}

export function interpretRetrievedQuery(input: {
  event: NormalizedInputEvent;
  retrieval: RetrievalLayerResult;
}): InterpretationLayerResult {
  const initialRoute = routeEntryQuery(input.event, input.retrieval);
  const semanticRoles = buildSemanticRoleHints(input.event, input.retrieval, initialRoute);
  const patternSemanticProjection = projectPatternSemanticSlots(semanticRoles, initialRoute);
  const unresolved = buildUnresolvedManagement(semanticRoles, patternSemanticProjection, initialRoute);
  const retrievalHints = [
    ...input.retrieval.semanticCandidates.slice(0, 3).map((item) => `semantic-hit:${item.id}`),
    ...input.retrieval.comparisonCandidates.slice(0, 3).map((item) => `comparison-hit:${item.id}`),
  ];

  return {
    queryRoute: initialRoute,
    semanticRoleHints: [
      ...(semanticRoles.baseAtmosphere.length > 0 ? ["base-atmosphere"] : []),
      ...(semanticRoles.accentMotif.length > 0 ? ["accent-motif"] : []),
      ...(semanticRoles.sensoryModifiers.length > 0 ? ["sensory-modifier"] : []),
      ...(semanticRoles.colorCues.length > 0 ? ["color-cue"] : []),
      ...(semanticRoles.structureHints.length > 0 ? ["structure-hint"] : []),
      ...(semanticRoles.constraints.length > 0 ? ["constraint"] : []),
      ...(semanticRoles.renderingBiases.length > 0 ? ["rendering-bias"] : []),
    ],
    semanticRoles,
    patternSemanticProjection,
    unresolvedSplits: unresolved.unresolvedSplits,
    misleadingPathsToAvoid: unresolved.misleadingPathsToAvoid,
    confidenceSummary: unresolved.confidenceSummary,
    retrievalHints,
    trace: [
      ...input.event.preprocessingTrace,
      `spans=${input.event.spans.map((span) => `${span.id}:${span.spanType}:${span.text}`).join("|") || "none"}`,
      `route=${initialRoute.detectedType}`,
      `path=${initialRoute.recommendedInterpretationPath}`,
      `baseAtmosphere=${takeUniqueLabels(semanticRoles.baseAtmosphere).join(",") || "none"}`,
      `accentMotif=${takeUniqueLabels(semanticRoles.accentMotif).join(",") || "none"}`,
      `sensoryModifiers=${takeUniqueLabels(semanticRoles.sensoryModifiers).join(",") || "none"}`,
      ...patternSemanticProjection.slotTrace,
      `unresolved=${unresolved.unresolvedSplits.map((item) => item.id).join(",") || "none"}`,
      `misleading=${unresolved.misleadingPathsToAvoid.join(",") || "none"}`,
      ...retrievalHints,
    ],
  };
}
