import type {
  CompositionAxis,
  DomainConfidence,
  FrontstageSemanticPackage,
  FuliSemanticCanvas,
  InterpretationDomain,
  InterpretationHandle,
  InterpretationLayerResult,
  MisleadingPath,
  ProposalFeedbackSignal,
  RetrievalLayerResult,
} from "./types";

function normalizeForMatch(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function createHandle(input: {
  id: string;
  label: string;
  kind: InterpretationHandle["kind"];
  sourceSignals?: string[];
  plannerWeight?: number;
}): InterpretationHandle {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    userFacing: true,
    sourceSignals: input.sourceSignals,
    plannerWeight: input.plannerWeight,
  };
}

function createAxis(input: {
  id: string;
  label: string;
  leftPole: string;
  rightPole: string;
  currentBias?: CompositionAxis["currentBias"];
}): CompositionAxis {
  return {
    id: input.id,
    label: input.label,
    leftPole: input.leftPole,
    rightPole: input.rightPole,
    currentBias: input.currentBias,
    blendable: true,
  };
}

function createMisleadingPath(input: {
  label: string;
  reason: string;
  severity: MisleadingPath["severity"];
}): MisleadingPath {
  return input;
}

function dedupeByLabel<T extends { label: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}

function addIf<T>(bucket: T[], value: T | undefined) {
  if (value) bucket.push(value);
}

function inferDomain(input: {
  text: string;
  interpretation: InterpretationLayerResult;
  semanticCanvas?: FuliSemanticCanvas;
}): InterpretationDomain {
  const text = normalizeForMatch(input.text);
  const route = input.interpretation.queryRoute.detectedType;
  const hasLavender = text.includes("薰衣草");
  const hasBeach = text.includes("海滩") || text.includes("沙滩") || text.includes("海边") || text.includes("加州");
  const hasLemonLeaf = text.includes("柠檬叶");
  const hasRainThreshold = text.includes("下雨前") || text.includes("烟雨") || text.includes("空气");
  const hasStone = text.includes("石头") || text.includes("肌理");
  const hasVague = route === "vague-underspecified" || text.includes("不确定") || text.includes("高级一点");

  if (hasLavender) return "floralHerbalScent";
  if (hasStone) return "softMineralTexture";
  if (route === "mixed-compositional" || (hasBeach && hasLemonLeaf)) return "mixedImageryComposition";
  if (hasBeach) return "coastalAiryBrightness";
  if (hasRainThreshold || route === "poetic-atmospheric") return "moistThresholdAtmosphere";
  if (hasVague) return "vagueRefinementPreference";

  const metaphoricDomains = input.semanticCanvas?.metaphoricDomains ?? [];
  if (metaphoricDomains.some((item) => item.toLowerCase().includes("coast"))) return "coastalAiryBrightness";
  if (metaphoricDomains.some((item) => item.toLowerCase().includes("floral") || item.toLowerCase().includes("herbal"))) {
    return "floralHerbalScent";
  }

  return "unknown";
}

function latestCorrectedDomain(signals?: ProposalFeedbackSignal[]) {
  return [...(signals ?? [])].reverse().find((signal) => signal.correctedDomain)?.correctedDomain;
}

function latestDomainCorrectionSignal(signals?: ProposalFeedbackSignal[]) {
  return [...(signals ?? [])].reverse().find((signal) => signal.correctedDomain);
}

function deriveFrontstageSeedText(input: {
  queryText: string;
  proposalFeedbackSignals?: ProposalFeedbackSignal[];
}) {
  const correctionSignal = latestDomainCorrectionSignal(input.proposalFeedbackSignals);
  if (!correctionSignal?.sourceText?.trim()) {
    return input.queryText;
  }
  return correctionSignal.sourceText.trim();
}

function inferDomainConfidence(input: {
  domain: InterpretationDomain;
  interpretation: InterpretationLayerResult;
  handles: InterpretationHandle[];
  domainWasCorrected?: boolean;
}): DomainConfidence {
  if (input.domainWasCorrected) {
    if (input.handles.length >= 3) return "high";
    if (input.handles.length >= 2) return "medium";
    return "low";
  }

  const routeConfidence = input.interpretation.queryRoute.confidence;
  const unresolvedCount = input.interpretation.unresolvedSplits.length;
  const roleCount =
    input.interpretation.semanticRoles.baseAtmosphere.length +
    input.interpretation.semanticRoles.accentMotif.length +
    input.interpretation.semanticRoles.sensoryModifiers.length +
    input.interpretation.semanticRoles.constraints.length;

  if (input.domain === "unknown") return "low";
  if (input.domain === "vagueRefinementPreference") return routeConfidence >= 0.8 ? "high" : "medium";
  if (routeConfidence >= 0.78 && roleCount >= 2 && input.handles.length >= 3 && unresolvedCount <= 2) {
    return "high";
  }
  if (routeConfidence >= 0.6 && input.handles.length >= 2) {
    return "medium";
  }
  return "low";
}

function buildHandles(input: {
  text: string;
  domain: InterpretationDomain;
  interpretation: InterpretationLayerResult;
  domainWasCorrected?: boolean;
}): InterpretationHandle[] {
  const text = normalizeForMatch(input.text);
  const handles: InterpretationHandle[] = [];
  const roles = input.domainWasCorrected
    ? {
        baseAtmosphere: [],
        accentMotif: [],
        sensoryModifiers: [],
      }
    : input.interpretation.semanticRoles;

  const allowFloral = input.domain === "floralHerbalScent";
  const allowMixed = input.domain === "mixedImageryComposition";
  const allowCoastal = input.domain === "coastalAiryBrightness";
  const allowMist = input.domain === "moistThresholdAtmosphere";
  const allowVague = input.domain === "vagueRefinementPreference";
  const allowMineral = input.domain === "softMineralTexture";

  if (allowFloral && (text.includes("薰衣草") || text.includes("花香") || text.includes("芳香"))) {
    addIf(handles, createHandle({
      id: "lavender-scent",
      label: "草本花香轻轻浮出来",
      kind: "scent",
      sourceSignals: ["薰衣草", "芳香"],
      plannerWeight: 0.95,
    }));
    addIf(handles, createHandle({
      id: "lavender-purple-grey",
      label: "柔紫灰的香气气候",
      kind: "colorClimate",
      sourceSignals: ["薰衣草"],
      plannerWeight: 0.82,
    }));
    addIf(handles, createHandle({
      id: "lavender-botanical-trace",
      label: "植物那层只留一点轻轻的影子",
      kind: "trace",
      sourceSignals: ["薰衣草", "植物"],
      plannerWeight: 0.7,
    }));
    addIf(handles, createHandle({
      id: "scent-into-air",
      label: "香气融进空气里，不急着长成花形",
      kind: "modifier",
      sourceSignals: ["芳香"],
      plannerWeight: 0.9,
    }));
  }

  if ((allowMixed || allowCoastal) && (text.includes("加州") || text.includes("沙滩") || text.includes("海滩") || text.includes("海边"))) {
    addIf(handles, createHandle({
      id: "coastal-bright-air",
      label: "海边空气的亮和留白先成立",
      kind: "atmosphere",
      sourceSignals: ["加州沙滩", "海滩"],
      plannerWeight: 0.96,
    }));
  }

  if (allowMixed && text.includes("柠檬叶")) {
    addIf(handles, createHandle({
      id: "lemon-leaf-trace",
      label: "叶感只留一点清绿苦感的痕迹",
      kind: "trace",
      sourceSignals: ["柠檬叶"],
      plannerWeight: 0.84,
    }));
  }

  if ((allowFloral || allowMixed || allowCoastal) && (text.includes("香气") || text.includes("花香") || text.includes("芳香"))) {
    addIf(handles, createHandle({
      id: "scent-floating",
      label: "香气轻轻浮在表面，不立成对象",
      kind: "scent",
      sourceSignals: ["香气"],
      plannerWeight: 0.92,
    }));
  }

  if ((allowMixed || allowMist) && (text.includes("烟雨") || text.includes("下雨前"))) {
    addIf(handles, createHandle({
      id: "mist-rain-field",
      label: "烟雨一样的湿润空气做底",
      kind: "atmosphere",
      sourceSignals: ["烟雨"],
      plannerWeight: 0.95,
    }));
  }

  if (allowMixed && text.includes("竹影")) {
    addIf(handles, createHandle({
      id: "bamboo-shadow-trace",
      label: "竹影只留一点若有若无的线性影痕",
      kind: "trace",
      sourceSignals: ["竹影"],
      plannerWeight: 0.86,
    }));
  }

  if ((allowMixed || allowMist) && text.includes("一点")) {
    addIf(handles, createHandle({
      id: "low-presence",
      label: "那一点痕迹要轻，不要浮得太出来",
      kind: "presence",
      sourceSignals: ["一点"],
      plannerWeight: 0.8,
    }));
  }

  if (allowMixed && text.includes("花叶意向")) {
    addIf(handles, createHandle({
      id: "botanical-intent",
      label: "花叶只停在意向层，不需要长得很满",
      kind: "trace",
      sourceSignals: ["花叶意向"],
      plannerWeight: 0.82,
    }));
  }

  if ((allowMixed || allowVague) && text.includes("不要太满")) {
    addIf(handles, createHandle({
      id: "airy-breathing",
      label: "整体要有呼吸感，不能被花叶铺满",
      kind: "structure",
      sourceSignals: ["不要太满"],
      plannerWeight: 0.92,
    }));
  }

  if (allowVague && (text.includes("不确定") || text.includes("高级一点"))) {
    addIf(handles, createHandle({
      id: "restrained-refinement",
      label: "更像在找一种克制但不单薄的高级感",
      kind: "modifier",
      sourceSignals: ["还不确定", "高级一点"],
      plannerWeight: 0.88,
    }));
    addIf(handles, createHandle({
      id: "open-not-locked",
      label: "方向还没锁死，先不要急着补成具体图样",
      kind: "presence",
      sourceSignals: ["还不确定"],
      plannerWeight: 0.9,
    }));
  }

  if (allowMineral && (text.includes("石头") || text.includes("肌理") || text.includes("别太硬"))) {
    addIf(handles, createHandle({
      id: "mineral-surface-soft",
      label: "矿物表面感要在，但边缘是软的",
      kind: "structure",
      sourceSignals: ["石头", "肌理"],
      plannerWeight: 0.92,
    }));
    addIf(handles, createHandle({
      id: "mineral-density-softened",
      label: "硬度要往回收，留下温一点的密度",
      kind: "modifier",
      sourceSignals: ["别太硬"],
      plannerWeight: 0.86,
    }));
  }

  if (handles.length === 0) {
    const baseLabel = roles.baseAtmosphere[0]?.label;
    const accentLabel = roles.accentMotif[0]?.label;
    const sensoryLabel = roles.sensoryModifiers[0]?.label;

    if (allowFloral) {
      addIf(handles, createHandle({
        id: "floral-scent-fallback",
        label: "先留住草本花香浮出来的那层气息",
        kind: "scent",
        sourceSignals: [sensoryLabel ?? "花香"],
        plannerWeight: 0.9,
      }));
      addIf(handles, createHandle({
        id: "floral-air-fallback",
        label: "香气先融进空气，不急着长成花形",
        kind: "modifier",
        sourceSignals: [baseLabel ?? "空气"],
        plannerWeight: 0.84,
      }));
    }

    if (allowMixed) {
      addIf(handles, createHandle({
        id: "mixed-atmosphere-fallback",
        label: `整体先保住 ${baseLabel ?? "那层空气"}`,
        kind: "atmosphere",
        sourceSignals: [baseLabel ?? "空气"],
        plannerWeight: 0.82,
      }));
      addIf(handles, createHandle({
        id: "mixed-trace-fallback",
        label: `局部只留一点 ${accentLabel ?? "轻痕迹"}`,
        kind: "trace",
        sourceSignals: [accentLabel ?? "痕迹"],
        plannerWeight: 0.76,
      }));
    }

    if (allowCoastal) {
      addIf(handles, createHandle({
        id: "coastal-air-fallback",
        label: "先把通透空气和留白撑起来",
        kind: "atmosphere",
        sourceSignals: [baseLabel ?? "空气"],
        plannerWeight: 0.9,
      }));
      addIf(handles, createHandle({
        id: "coastal-scent-fallback",
        label: "气息只是贴着空气走，不单独立起来",
        kind: "modifier",
        sourceSignals: [sensoryLabel ?? "气息"],
        plannerWeight: 0.8,
      }));
    }

    if (allowMist) {
      addIf(handles, createHandle({
        id: "mist-atmosphere-fallback",
        label: "先留住将落未落的湿润空气",
        kind: "atmosphere",
        sourceSignals: [baseLabel ?? "空气"],
        plannerWeight: 0.9,
      }));
      addIf(handles, createHandle({
        id: "mist-presence-fallback",
        label: "那一点存在感要贴着边走，别浮出来",
        kind: "presence",
        sourceSignals: [accentLabel ?? "一点"],
        plannerWeight: 0.82,
      }));
    }

    if (allowMineral) {
      addIf(handles, createHandle({
        id: "mineral-texture-fallback",
        label: `先保住 ${baseLabel ?? "矿物表面感"}，但别让边缘变硬`,
        kind: "structure",
        sourceSignals: [baseLabel ?? "矿物"],
        plannerWeight: 0.86,
      }));
    }

    if (allowVague) {
      addIf(handles, createHandle({
        id: "vague-refinement-fallback",
        label: "方向先别锁太死，把分寸感留住",
        kind: "modifier",
        sourceSignals: [baseLabel ?? "分寸"],
        plannerWeight: 0.86,
      }));
    }

    if (handles.length === 0) {
      addIf(handles, baseLabel ? createHandle({
        id: "base-atmosphere-fallback",
        label: `整体先保住 ${baseLabel}`,
        kind: "atmosphere",
        sourceSignals: [baseLabel],
        plannerWeight: 0.75,
      }) : undefined);
      addIf(handles, accentLabel ? createHandle({
        id: "accent-trace-fallback",
        label: `局部只留一点 ${accentLabel}`,
        kind: "trace",
        sourceSignals: [accentLabel],
        plannerWeight: 0.7,
      }) : undefined);
      addIf(handles, sensoryLabel ? createHandle({
        id: "sensory-fallback",
        label: `${sensoryLabel} 更像融进空气里的感觉`,
        kind: "modifier",
        sourceSignals: [sensoryLabel],
        plannerWeight: 0.74,
      }) : undefined);
    }
  }

  return dedupeByLabel(handles).slice(0, 6);
}

function buildCompositionAxes(input: {
  text: string;
  domain: InterpretationDomain;
  interpretation: InterpretationLayerResult;
}): CompositionAxis[] {
  const text = normalizeForMatch(input.text);
  const axes: CompositionAxis[] = [];

  if (input.domain === "floralHerbalScent" && (text.includes("薰衣草") || text.includes("花香") || text.includes("芳香"))) {
    axes.push(createAxis({
      id: "lavender-scent-vs-trace",
      label: "香气与植物痕迹的进入方式",
      leftPole: "让香气本身轻轻散开",
      rightPole: "局部留一点细细的植物痕迹",
      currentBias: "left",
    }));
    axes.push(createAxis({
      id: "lavender-air-vs-bloom",
      label: "香气是退进空气还是更贴近花本身",
      leftPole: "更像柔紫灰空气",
      rightPole: "更像草本花香本身",
      currentBias: "balanced",
    }));
  }

  if ((input.domain === "mixedImageryComposition" || input.domain === "coastalAiryBrightness") && (text.includes("加州") || text.includes("沙滩") || text.includes("海边"))) {
    axes.push(createAxis({
      id: "coastal-air-vs-leaf-trace",
      label: "空气和叶感的主次",
      leftPole: "海边空气先做底",
      rightPole: "叶感痕迹稍微浮出来",
      currentBias: "left",
    }));
  }

  if ((input.domain === "floralHerbalScent" || input.domain === "mixedImageryComposition" || input.domain === "coastalAiryBrightness") && (text.includes("香气") || text.includes("花香") || text.includes("芳香"))) {
    axes.push(createAxis({
      id: "scent-diffusion-vs-trace-retention",
      label: "香气进入图样的方式",
      leftPole: "香气更融进空气里",
      rightPole: "局部保一点可辨认痕迹",
      currentBias: "left",
    }));
  }

  if ((input.domain === "mixedImageryComposition" || input.domain === "moistThresholdAtmosphere") && (text.includes("烟雨") || text.includes("下雨前"))) {
    axes.push(createAxis({
      id: "mist-vs-bamboo-shadow",
      label: "烟雨和竹影的主导关系",
      leftPole: "先保住烟雨整体",
      rightPole: "让竹影稍微可见一点",
      currentBias: "left",
    }));
  }

  if ((input.domain === "mixedImageryComposition" || input.domain === "moistThresholdAtmosphere") && text.includes("一点")) {
    axes.push(createAxis({
      id: "trace-presence",
      label: "痕迹保留强度",
      leftPole: "只留一点影子",
      rightPole: "让痕迹再清楚一点",
      currentBias: "left",
    }));
  }

  if ((input.domain === "mixedImageryComposition" || input.domain === "vagueRefinementPreference") && text.includes("不要太满")) {
    axes.push(createAxis({
      id: "breathing-vs-cluster",
      label: "留白和局部聚集的比例",
      leftPole: "整体更松、更有呼吸感",
      rightPole: "局部可以有一点小簇",
      currentBias: "left",
    }));
  }

  if (input.domain === "vagueRefinementPreference" && (text.includes("不确定") || text.includes("高级一点"))) {
    axes.push(createAxis({
      id: "restraint-vs-presence",
      label: "高级感的成立方式",
      leftPole: "更克制、更留白",
      rightPole: "更有存在感但不俗",
      currentBias: "balanced",
    }));
    axes.push(createAxis({
      id: "abstract-vs-light-trace",
      label: "是偏抽象气质还是带一点轻痕迹",
      leftPole: "先偏抽象气质",
      rightPole: "只带一点轻对象痕迹",
      currentBias: "balanced",
    }));
  }

  if (input.domain === "softMineralTexture" && (text.includes("石头") || text.includes("肌理") || text.includes("别太硬"))) {
    axes.push(createAxis({
      id: "mineral-density-vs-softness",
      label: "矿物密度和软化程度",
      leftPole: "保留材质感，但边缘更柔",
      rightPole: "强调表面硬度和棱角",
      currentBias: "left",
    }));
  }

  if (axes.length === 0 && input.interpretation.unresolvedSplits[0]) {
    const unresolved = input.interpretation.unresolvedSplits[0];
    axes.push(createAxis({
      id: `unresolved-${unresolved.id}`,
      label: unresolved.dimension,
      leftPole: unresolved.options[0] ?? "左侧成立方式",
      rightPole: unresolved.options[1] ?? "右侧成立方式",
      currentBias: "balanced",
    }));
  }

  return dedupeByLabel(axes).slice(0, 4);
}

function buildMisleadingPaths(input: {
  text: string;
  domain: InterpretationDomain;
  interpretation: InterpretationLayerResult;
  domainWasCorrected?: boolean;
}): MisleadingPath[] {
  const text = normalizeForMatch(input.text);
  const paths: MisleadingPath[] = [];

  if (!input.domainWasCorrected) {
    for (const label of input.interpretation.misleadingPathsToAvoid) {
      const severity = label.includes("literal") || label.includes("scenic") ? "hard" : "soft";
      paths.push(createMisleadingPath({
        label,
        reason: "interpretation layer 已经判断这条路径会把前台带进错误的成立方式。",
        severity,
      }));
    }
  }

  if (input.domain === "floralHerbalScent") {
    paths.push(createMisleadingPath({
      label: "generic moist atmosphere",
      reason: "薰衣草的芳香不应直接塌成潮湿雾感；重点应是草本花香与香气气候。",
      severity: "hard",
    }));
    paths.push(createMisleadingPath({
      label: "literal lavender field illustration",
      reason: "前台不应把它引向大片薰衣草田的写实叙事。",
      severity: "hard",
    }));
  }

  if (input.domain === "mixedImageryComposition" && ((text.includes("加州") || text.includes("沙滩") || text.includes("海边")) || text.includes("柠檬叶"))) {
    paths.push(createMisleadingPath({
      label: "coastal postcard rendering",
      reason: "海边空气应作为底子，而不是写实海景。",
      severity: "hard",
    }));
    paths.push(createMisleadingPath({
      label: "literal lemon leaf motif",
      reason: "叶感只应作为轻痕迹，不应成为对象主图。",
      severity: "hard",
    }));
  }

  if (input.domain === "mixedImageryComposition" && (text.includes("烟雨") || text.includes("竹影"))) {
    paths.push(createMisleadingPath({
      label: "bamboo forest scene illustration",
      reason: "竹影应停在影痕层，而不是导向竹林场景。",
      severity: "hard",
    }));
    paths.push(createMisleadingPath({
      label: "generic mist card with no trace",
      reason: "如果只剩雾感，用户会丢失那一点竹影命中感。",
      severity: "soft",
    }));
  }

  if (input.domain === "coastalAiryBrightness") {
    paths.push(createMisleadingPath({
      label: "literal seaside postcard",
      reason: "重点应是空气与亮度，不是把前台推成写实海报感。",
      severity: "hard",
    }));
  }

  if (input.domain === "moistThresholdAtmosphere") {
    paths.push(createMisleadingPath({
      label: "over-scenic rainy illustration",
      reason: "前台应保留阈值空气感，而不是落入完整雨景叙事。",
      severity: "hard",
    }));
  }

  if (input.domain === "softMineralTexture") {
    paths.push(createMisleadingPath({
      label: "over-hard stone rendering",
      reason: "矿物感成立不等于把边缘做硬做重。",
      severity: "hard",
    }));
  }

  if (input.domain === "vagueRefinementPreference") {
    paths.push(createMisleadingPath({
      label: "premature style locking",
      reason: "高级一点不应被提前锁成黑金、法式、中古等模板。",
      severity: "hard",
    }));
  }

  return dedupeByLabel(paths).slice(0, 6);
}

function buildPlannerNotes(input: {
  domain: InterpretationDomain;
  confidence: DomainConfidence;
  axes: CompositionAxis[];
  misleadingPaths: MisleadingPath[];
}): string[] {
  const notes: string[] = [];
  if (input.confidence === "low") {
    notes.push("domain unstable: frontstage should prefer alignment before strong proposal.");
  }
  if (input.domain === "mixedImageryComposition") {
    notes.push("frontstage should treat axes as blendable composition arrangements, not binary exclusion.");
  }
  if (input.axes.length > 0) {
    notes.push("composition axes are intended for weighted blending, not slot-axis leakage.");
  }
  if (input.misleadingPaths.some((item) => item.severity === "hard")) {
    notes.push("hard misleading paths present: proposal planner must avoid literalization.");
  }
  return notes;
}

export function buildFrontstageSemanticPackage(input: {
  queryText: string;
  interpretation: InterpretationLayerResult;
  semanticCanvas?: FuliSemanticCanvas;
  retrieval?: RetrievalLayerResult;
  proposalFeedbackSignals?: ProposalFeedbackSignal[];
}): FrontstageSemanticPackage {
  const frontstageSeedText = deriveFrontstageSeedText({
    queryText: input.queryText,
    proposalFeedbackSignals: input.proposalFeedbackSignals,
  });
  const inferredDomain = inferDomain({
    text: frontstageSeedText,
    interpretation: input.interpretation,
    semanticCanvas: input.semanticCanvas,
  });
  const correctedDomain = latestCorrectedDomain(input.proposalFeedbackSignals);
  const domain = correctedDomain ?? inferredDomain;
  const interpretationHandles = buildHandles({
    text: frontstageSeedText,
    domain,
    interpretation: input.interpretation,
    domainWasCorrected: Boolean(correctedDomain),
  });
  const compositionAxes = buildCompositionAxes({
    text: frontstageSeedText,
    domain,
    interpretation: input.interpretation,
  });
  const misleadingPaths = buildMisleadingPaths({
    text: frontstageSeedText,
    domain,
    interpretation: input.interpretation,
    domainWasCorrected: Boolean(correctedDomain),
  });
  const domainConfidence = inferDomainConfidence({
    domain,
    interpretation: input.interpretation,
    handles: interpretationHandles,
    domainWasCorrected: Boolean(correctedDomain),
  });

  return {
    interpretationDomain: domain,
    domainConfidence,
    interpretationHandles,
    compositionAxes,
    misleadingPaths,
    plannerNotes: buildPlannerNotes({
      domain,
      confidence: domainConfidence,
      axes: compositionAxes,
      misleadingPaths,
    }),
  };
}
