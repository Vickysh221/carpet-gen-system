import type { EntryAgentBridgeResult, EntryAgentDetectionResult, EntryAgentInput, EntryAgentStatePatch, FieldAmbiguity, WeakBiasHint } from "./types";

type AxisSlot = keyof NonNullable<EntryAgentBridgeResult["axisHints"]>;

interface BridgeContext {
  text: string;
  detection: EntryAgentDetectionResult;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function createEmptyBridgeResult(): EntryAgentBridgeResult {
  return {
    provisionalStateHints: {},
    ambiguities: [],
    axisHints: {},
    weakBiasHints: [],
    statePatch: {},
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function pushSemanticHint(
  result: EntryAgentBridgeResult,
  key: string,
  value: string,
) {
  const existing = result.provisionalStateHints[key];

  if (existing === undefined) {
    result.provisionalStateHints[key] = value;
    return;
  }

  if (Array.isArray(existing)) {
    if (!existing.includes(value)) {
      result.provisionalStateHints[key] = [...existing, value];
    }
    return;
  }

  if (existing !== value) {
    result.provisionalStateHints[key] = [existing, value];
  }
}

function pushAmbiguity(result: EntryAgentBridgeResult, ambiguity: FieldAmbiguity) {
  const duplicated = result.ambiguities.some(
    (item) => item.field === ambiguity.field && item.note === ambiguity.note,
  );

  if (!duplicated) {
    result.ambiguities.push(ambiguity);
  }
}

function setAxisHint(
  result: EntryAgentBridgeResult,
  slot: AxisSlot,
  axis: string,
  value: number,
) {
  const currentSlotHints = result.axisHints[slot] ?? {};
  const currentValue = currentSlotHints[axis as keyof typeof currentSlotHints];
  const nextValue = currentValue === undefined ? value : Math.max(Number(currentValue), value);

  result.axisHints[slot] = {
    ...currentSlotHints,
    [axis]: clamp01(nextValue),
  } as never;
}

function setPatch(
  patch: EntryAgentStatePatch,
  slot: AxisSlot,
  axis: string,
  delta: number,
) {
  const currentSlotPatch = patch[slot] ?? {};
  const currentValue = currentSlotPatch[axis as keyof typeof currentSlotPatch];
  const nextValue = (currentValue === undefined ? 0 : Number(currentValue)) + delta;

  patch[slot] = {
    ...currentSlotPatch,
    [axis]: Number(nextValue.toFixed(3)),
  } as never;
}

function pushWeakBias(result: EntryAgentBridgeResult, weakBias: WeakBiasHint) {
  result.weakBiasHints.push(weakBias);
}

function applySpaceContextBridge(result: EntryAgentBridgeResult, context: BridgeContext) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("spaceContext")) {
    return;
  }

  if (text.includes("卧室")) {
    pushSemanticHint(result, "roomType", "bedroom");
    pushWeakBias(result, {
      source: "spaceContext: bedroom",
      axes: {
        impression: { calm: 0.58, softness: 0.56 },
        motif: { complexity: 0.44 },
        color: { saturation: 0.46 },
      },
    });
    return;
  }

  if (text.includes("客厅")) {
    pushSemanticHint(result, "roomType", "livingRoom");
    pushWeakBias(result, {
      source: "spaceContext: livingRoom",
      axes: {
        impression: { energy: 0.52, calm: 0.5 },
      },
    });
    return;
  }

  if (text.includes("书房")) {
    pushSemanticHint(result, "roomType", "study");
    pushWeakBias(result, {
      source: "spaceContext: study",
      axes: {
        arrangement: { order: 0.57 },
        impression: { calm: 0.56 },
      },
    });
    return;
  }

  if (text.includes("办公室") || text.includes("会议室")) {
    pushSemanticHint(result, "roomType", text.includes("会议室") ? "conferenceRoom" : "office");
    pushWeakBias(result, {
      source: text.includes("会议室") ? "spaceContext: conferenceRoom" : "spaceContext: office",
      axes: {
        arrangement: { order: 0.58 },
        motif: { complexity: 0.43 },
      },
    });
  }
}

function applyOverallImpressionBridge(result: EntryAgentBridgeResult, context: BridgeContext) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("overallImpression")) {
    return;
  }

  if (text.includes("安静") || text.includes("宁静") || text.includes("平静")) {
    pushSemanticHint(result, "impression", "calm");
    setAxisHint(result, "impression", "calm", 0.72);
    setAxisHint(result, "impression", "energy", 0.34);
    setAxisHint(result, "arrangement", "spacing", 0.58);
    setAxisHint(result, "color", "saturation", 0.42);

    setPatch(result.statePatch, "impression", "calm", 0.18);
    setPatch(result.statePatch, "impression", "energy", -0.12);
    setPatch(result.statePatch, "arrangement", "spacing", 0.08);
    setPatch(result.statePatch, "color", "saturation", -0.08);
  }

  if (text.includes("温暖") || text.includes("温馨")) {
    pushSemanticHint(result, "impression", "warm");
    setAxisHint(result, "impression", "softness", 0.64);
    setAxisHint(result, "color", "warmth", 0.66);

    pushAmbiguity(result, {
      field: "overallImpression",
      note: "“温暖/温馨”可能指向氛围柔和，也可能指向色彩偏暖。",
      candidateAxes: {
        impression: { softness: 0.64 },
        color: { warmth: 0.66 },
      },
    });

    setPatch(result.statePatch, "impression", "softness", 0.08);
    setPatch(result.statePatch, "color", "warmth", 0.08);
  }

  if (text.includes("柔和")) {
    pushSemanticHint(result, "impression", "soft");
    setAxisHint(result, "impression", "softness", 0.68);
    setAxisHint(result, "color", "saturation", 0.4);

    setPatch(result.statePatch, "impression", "softness", 0.14);
    setPatch(result.statePatch, "color", "saturation", -0.08);
  }

  if (text.includes("柔软")) {
    pushSemanticHint(result, "impression", "soft");
    setAxisHint(result, "impression", "softness", 0.61);

    pushAmbiguity(result, {
      field: "overallImpression",
      note: "“柔软”更像触感/氛围弱线索，当前 simulator 只能近似映到 softness。",
      candidateAxes: {
        impression: { softness: 0.61 },
      },
    });

    setPatch(result.statePatch, "impression", "softness", 0.06);
  }

  if (text.includes("舒服")) {
    pushSemanticHint(result, "impression", "comfortable");

    pushAmbiguity(result, {
      field: "overallImpression",
      note: "“舒服”是宽泛的总体评价，可能涉及 calm、softness 或 saturation restraint，不能强写成单一路径。",
      candidateAxes: {
        impression: { calm: 0.58, softness: 0.58 },
        color: { saturation: 0.44 },
      },
    });
  }

  if (text.includes("活力") || text.includes("存在感")) {
    pushSemanticHint(result, "impression", "energetic");
    setAxisHint(result, "impression", "energy", 0.72);
    setAxisHint(result, "color", "saturation", 0.62);
    setAxisHint(result, "arrangement", "order", 0.44);

    setPatch(result.statePatch, "impression", "energy", 0.16);
    setPatch(result.statePatch, "color", "saturation", 0.1);
    setPatch(result.statePatch, "arrangement", "order", -0.06);
  }
}

function applyColorMoodBridge(result: EntryAgentBridgeResult, context: BridgeContext) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("colorMood")) {
    return;
  }

  if (text.includes("大地色") || text.includes("自然一点的颜色") || text.includes("颜色自然")) {
    pushSemanticHint(result, "colorMood", "earthy");
    setAxisHint(result, "color", "warmth", 0.66);
    setAxisHint(result, "color", "saturation", 0.42);

    setPatch(result.statePatch, "color", "warmth", 0.12);
    setPatch(result.statePatch, "color", "saturation", -0.08);
  }

  if (text.includes("不要太跳") || text.includes("别太跳")) {
    pushSemanticHint(result, "colorMood", "restrained");
    setAxisHint(result, "color", "saturation", 0.34);

    pushAmbiguity(result, {
      field: "colorMood",
      note: "“不要太跳”主要指向 saturation restraint，也可能部分涉及 motif complexity restraint。",
      candidateAxes: {
        color: { saturation: 0.34 },
        motif: { complexity: 0.42 },
      },
    });

    setPatch(result.statePatch, "color", "saturation", -0.14);
  }

  if (text.includes("暖一点")) {
    pushSemanticHint(result, "colorMood", "warmer");
    setAxisHint(result, "color", "warmth", 0.64);
    setPatch(result.statePatch, "color", "warmth", 0.1);
  }
}

function applyPatternTendencyBridge(result: EntryAgentBridgeResult, context: BridgeContext) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("patternTendency")) {
    return;
  }

  if (text.includes("不要太花") || text.includes("别太花")) {
    pushSemanticHint(result, "patternComplexity", "lower");
    setAxisHint(result, "motif", "complexity", 0.32);

    pushAmbiguity(result, {
      field: "patternTendency",
      note: "“不要太花”主要指向 motif complexity lower，也可能部分涉及 color saturation restraint。",
      candidateAxes: {
        motif: { complexity: 0.32 },
        color: { saturation: 0.4 },
      },
    });

    setPatch(result.statePatch, "motif", "complexity", -0.14);
    setPatch(result.statePatch, "color", "saturation", -0.06);
  }

  if (text.includes("不要太碎") || text.includes("别太碎") || text.includes("图案别太碎") || text.includes("图案不要太碎")) {
    pushSemanticHint(result, "patternComplexity", "lower");
    setAxisHint(result, "motif", "complexity", 0.28);
    setPatch(result.statePatch, "motif", "complexity", -0.16);
  }

  if (text.includes("不要太几何") || text.includes("别太几何")) {
    pushSemanticHint(result, "patternGeometry", "lessGeometric");
    setAxisHint(result, "motif", "geometry", 0.34);
    setAxisHint(result, "motif", "organic", 0.62);

    setPatch(result.statePatch, "motif", "geometry", -0.14);
    setPatch(result.statePatch, "motif", "organic", 0.1);
  }

  if (text.includes("纹理感")) {
    pushSemanticHint(result, "patternTexture", "textured");
    setAxisHint(result, "motif", "complexity", 0.54);
    setAxisHint(result, "motif", "organic", 0.58);

    setPatch(result.statePatch, "motif", "complexity", 0.04);
    setPatch(result.statePatch, "motif", "organic", 0.06);
  }

  if (text.includes("自然一点")) {
    pushSemanticHint(result, "patternTendency", "natural");

    pushAmbiguity(result, {
      field: "patternTendency",
      note: "“自然一点”可能指向 motif organic，也可能指向色彩更克制或整体氛围更柔和，第一版不强写单一路径。",
      candidateAxes: {
        motif: { organic: 0.62, geometry: 0.4 },
        color: { saturation: 0.44 },
        impression: { softness: 0.58 },
      },
    });

    setAxisHint(result, "motif", "organic", 0.62);
    setAxisHint(result, "motif", "geometry", 0.4);
  }
}

function applyArrangementBridge(result: EntryAgentBridgeResult, context: BridgeContext) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("arrangementTendency")) {
    return;
  }

  if (text.includes("秩序感") || text.includes("有秩序") || text.includes("整齐一点")) {
    pushSemanticHint(result, "arrangement", "ordered");
    setAxisHint(result, "arrangement", "order", 0.72);
    setPatch(result.statePatch, "arrangement", "order", 0.14);
  }

  if (text.includes("呼吸感") || text.includes("不要太满") || text.includes("别太满")) {
    pushSemanticHint(result, "arrangementSpacing", "moreOpen");
    setAxisHint(result, "arrangement", "spacing", 0.7);
    setPatch(result.statePatch, "arrangement", "spacing", 0.16);
  }

  if (text.includes("松一点") || text.includes("更松一点") || text.includes("疏一点")) {
    pushSemanticHint(result, "arrangementSpacing", "looser");
    setAxisHint(result, "arrangement", "spacing", 0.68);
    setAxisHint(result, "arrangement", "order", 0.44);

    setPatch(result.statePatch, "arrangement", "spacing", 0.14);
    setPatch(result.statePatch, "arrangement", "order", -0.06);
  }

  if (text.includes("别太硬") || text.includes("不要太硬")) {
    pushSemanticHint(result, "arrangement", "lessRigid");

    pushAmbiguity(result, {
      field: "arrangementTendency",
      note: "“别太硬”高度歧义，可能涉及 arrangement order、motif geometry，当前不适合强写 direct patch。",
      candidateAxes: {
        arrangement: { order: 0.42 },
        motif: { geometry: 0.4 },
      },
    });
  }
}

export function buildSemanticToAxisBridge(
  input: Pick<EntryAgentInput, "text">,
  detection: EntryAgentDetectionResult,
): EntryAgentBridgeResult {
  const result = createEmptyBridgeResult();
  const context: BridgeContext = {
    text: normalizeText(input.text),
    detection,
  };

  applySpaceContextBridge(result, context);
  applyOverallImpressionBridge(result, context);
  applyColorMoodBridge(result, context);
  applyPatternTendencyBridge(result, context);
  applyArrangementBridge(result, context);

  return result;
}
