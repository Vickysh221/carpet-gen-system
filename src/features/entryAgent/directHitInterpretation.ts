import type { EntryAgentDetectionResult, InterpretationCandidate, EntryAgentInput, SemanticUnit } from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function buildDirectInterpretationCandidates(
  input: Pick<EntryAgentInput, "text">,
  detection: EntryAgentDetectionResult,
  semanticUnits: SemanticUnit[] = [],
): InterpretationCandidate[] {
  const text = normalizeText(input.text);
  const candidates: InterpretationCandidate[] = [];

  const directUnits = semanticUnits.filter((unit) => unit.routeHint === "direct");
  directUnits.forEach((unit) => {
    if (!unit.targetField || !unit.targetSlot || !detection.hitFields.includes(unit.targetField)) {
      return;
    }

    if (unit.cue === "张扬") {
      candidates.push({
        id: "direct-impression-showy",
        label: "张扬",
        sourceType: "direct",
        sourceId: "direct:impression-showy",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: [],
        polarity: "increase",
        strength: 0.82,
        confidence: 0.8,
        matchedCues: [unit.cue],
        semanticHints: { impression: "energetic" },
        axisHints: {
          impression: { energy: clamp01(0.84), calm: clamp01(0.24) },
        },
        patchIntent: {
          impression: { energy: 0.14, calm: -0.08 },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: "direct hit：用户明确在要更外放、更有表现力的整体印象。",
      });
      return;
    }

    if (unit.cue === "快乐") {
      candidates.push({
        id: "direct-impression-joyful",
        label: "快乐",
        sourceType: "direct",
        sourceId: "direct:impression-joyful",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: [],
        polarity: "increase",
        strength: 0.74,
        confidence: 0.72,
        matchedCues: [unit.cue],
        semanticHints: { impression: "joyful" },
        axisHints: {
          impression: { energy: clamp01(0.7), softness: clamp01(0.56) },
        },
        patchIntent: {
          impression: { energy: 0.1, softness: 0.04 },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: "direct hit：用户表达偏明快、轻快、有活力的快乐感。",
      });
      return;
    }

    if (unit.cue === "低调" || unit.cue === "别太抢") {
      candidates.push({
        id: unit.cue === "低调" ? "direct-impression-lowkey" : "direct-impression-not-too-loud",
        label: unit.cue,
        sourceType: "direct",
        sourceId: unit.cue === "低调" ? "direct:impression-lowkey" : "direct:impression-not-too-loud",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: [],
        polarity: "decrease",
        strength: 0.8,
        confidence: 0.78,
        matchedCues: [unit.cue],
        semanticHints: { impression: "restrained" },
        axisHints: {
          impression: { calm: clamp01(0.76), energy: clamp01(0.28) },
        },
        patchIntent: {
          impression: { calm: 0.1, energy: -0.08 },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: "direct hit：用户希望整体更低调克制，不要太抢眼。",
      });
      return;
    }

    if (unit.cue === "克制") {
      candidates.push({
        id: "direct-impression-restrained",
        label: "克制",
        sourceType: "direct",
        sourceId: "direct:impression-restrained",
        field: "overallImpression",
        primarySlot: "impression",
        secondarySlots: ["color"],
        polarity: "decrease",
        strength: 0.62,
        confidence: 0.58,
        matchedCues: [unit.cue],
        semanticHints: { impression: "restrained" },
        axisHints: {
          impression: { calm: clamp01(0.66), energy: clamp01(0.34) },
          color: { saturation: clamp01(0.38) },
        },
        patchIntent: {
          impression: { calm: 0.06, energy: -0.04 },
          color: { saturation: -0.02 },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: "“克制”可能在说整体气质，也可能在说颜色存在感，当前先保留 impression 主读法。",
      });
      candidates.push({
        id: "direct-color-restrained",
        label: "克制",
        sourceType: "direct",
        sourceId: "direct:color-restrained",
        field: "colorMood",
        primarySlot: "color",
        secondarySlots: ["impression"],
        polarity: "decrease",
        strength: 0.64,
        confidence: 0.6,
        matchedCues: [unit.cue],
        semanticHints: { colorMood: "muted" },
        axisHints: {
          color: { saturation: clamp01(0.32) },
          impression: { calm: clamp01(0.58) },
        },
        patchIntent: {
          color: { saturation: -0.08 },
          impression: { calm: 0.02 },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: "“克制”也可能在说颜色存在感 restraint，当前保留 color 次读法等待澄清。",
      });
      return;
    }

    if (unit.cue === "草色" || unit.cue === "淡一点" || unit.cue === "收一点") {
      candidates.push({
        id:
          unit.cue === "草色"
            ? "direct-color-grassy"
            : unit.cue === "淡一点"
              ? "direct-color-lighter"
              : "direct-color-more-muted",
        label: unit.cue,
        sourceType: "direct",
        sourceId:
          unit.cue === "草色"
            ? "direct:color-grassy"
            : unit.cue === "淡一点"
              ? "direct:color-lighter"
              : "direct:color-more-muted",
        field: "colorMood",
        primarySlot: "color",
        secondarySlots: unit.cue === "草色" ? ["impression"] : [],
        polarity: "decrease",
        strength: unit.cue === "草色" ? 0.64 : 0.76,
        confidence: unit.cue === "草色" ? 0.62 : 0.74,
        matchedCues: [unit.cue],
        semanticHints: unit.cue === "草色" ? { colorMood: "spring-green" } : { colorMood: "muted" },
        axisHints: {
          color: {
            warmth: clamp01(unit.cue === "草色" ? 0.46 : 0.5),
            saturation: clamp01(unit.cue === "草色" ? 0.38 : 0.28),
          },
        },
        patchIntent: {
          color: {
            warmth: unit.cue === "草色" ? 0 : 0,
            saturation: unit.cue === "草色" ? -0.04 : -0.1,
          },
        },
        matchedSemanticUnitIds: [unit.id],
        ownershipClass: unit.ownershipClass,
        questionKindHint: unit.questionKindHint,
        disambiguationAxes: unit.disambiguationAxes,
        informationGainHint: unit.informationGainHint,
        note: unit.cue === "草色" ? "direct hit：先把它理解为偏春绿、轻可见、但不过度浓重的颜色方向。" : "direct hit：颜色先收一点，别太跳。",
      });
    }
  });

  if (detection.hitFields.includes("patternTendency") && (text.includes("不要太花") || text.includes("别太花"))) {
    candidates.push({
      id: "direct-pattern-not-too-floral",
      label: "不要太花",
      sourceType: "direct",
      sourceId: "direct:not-too-floral",
      field: "patternTendency",
      primarySlot: "motif",
      secondarySlots: ["color"],
      polarity: "decrease",
      strength: 0.86,
      confidence: 0.84,
      matchedCues: text.includes("不要太花") ? ["不要太花"] : ["别太花"],
      semanticHints: {
        patternComplexity: "lower",
      },
      axisHints: {
        motif: { complexity: clamp01(0.32) },
        color: { saturation: clamp01(0.4) },
      },
      patchIntent: {
        motif: { complexity: -0.14 },
        color: { saturation: -0.06 },
      },
      note: "direct hit 明确优先把主问题解释为图案复杂度过高。",
    });
  }

  if (detection.hitFields.includes("patternTendency") && text.includes("自然一点")) {
    candidates.push({
      id: "direct-pattern-natural",
      label: "自然一点",
      sourceType: "direct",
      sourceId: "direct:natural",
      field: "patternTendency",
      primarySlot: "motif",
      secondarySlots: ["color", "impression"],
      polarity: "mixed",
      strength: 0.6,
      confidence: 0.52,
      matchedCues: ["自然一点"],
      semanticHints: {
        patternTendency: "natural",
      },
      axisHints: {
        motif: { organic: clamp01(0.6), geometry: clamp01(0.42) },
      },
      patchIntent: {
        motif: { organic: 0.08, geometry: -0.06 },
      },
      note: 'direct hit 先把"自然一点"解释为图案少一点几何感。',
    });
  }

  const calmCues = ["偏安静", "安静柔和", "更安静", "安静一点", "安静", "宁静", "平静", "柔和", "柔软"];
  const calmMatched = calmCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("overallImpression") && calmMatched.length > 0) {
    const isPrecise = text.includes("安静柔和") || text.includes("偏安静") || text.includes("宁静");
    const topCue = text.includes("安静柔和") ? "安静柔和" : text.includes("偏安静") ? "偏安静" : calmMatched[0];
    candidates.push({
      id: "direct-impression-calm-soft",
      label: topCue,
      sourceType: "direct",
      sourceId: "direct:impression-calm-soft",
      field: "overallImpression",
      primarySlot: "impression",
      secondarySlots: [],
      polarity: "increase",
      strength: isPrecise ? 0.78 : 0.64,
      confidence: isPrecise ? 0.74 : 0.58,
      matchedCues: calmMatched.slice(0, 2),
      semanticHints: { impression: "calm" },
      axisHints: {
        impression: { calm: clamp01(0.78), softness: clamp01(0.72) },
      },
      patchIntent: {
        impression: { calm: 0.12, softness: 0.08 },
      },
      note: "direct hit：用户表达偏安静柔和的整体印象方向。",
    });
  }

  const energyCues = ["存在感", "有存在感", "更有存在感", "活力", "有活力"];
  const energyMatched = energyCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("overallImpression") && energyMatched.length > 0) {
    const topCue = text.includes("有存在感") ? "有存在感" : text.includes("存在感") ? "存在感" : energyMatched[0];
    candidates.push({
      id: "direct-impression-energetic",
      label: topCue,
      sourceType: "direct",
      sourceId: "direct:impression-energetic",
      field: "overallImpression",
      primarySlot: "impression",
      secondarySlots: [],
      polarity: "increase",
      strength: 0.74,
      confidence: 0.7,
      matchedCues: energyMatched.slice(0, 2),
      semanticHints: { impression: "energetic" },
      axisHints: {
        impression: { energy: clamp01(0.75), calm: clamp01(0.32) },
      },
      patchIntent: {
        impression: { energy: 0.12, calm: -0.06 },
      },
      note: "direct hit：用户表达希望整体有存在感/活力的方向。",
    });
  }

  const warmImprCues = ["温暖", "温馨", "陪伴感", "有陪伴感"];
  const warmImprMatched = warmImprCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("overallImpression") && warmImprMatched.length > 0) {
    const topCue = text.includes("温暖") ? "温暖" : text.includes("温馨") ? "温馨" : warmImprMatched[0];
    candidates.push({
      id: "direct-impression-warm",
      label: topCue,
      sourceType: "direct",
      sourceId: "direct:impression-warm",
      field: "overallImpression",
      primarySlot: "impression",
      secondarySlots: ["color"],
      polarity: "increase",
      strength: 0.68,
      confidence: 0.64,
      matchedCues: warmImprMatched.slice(0, 2),
      semanticHints: { impression: "warm" },
      axisHints: {
        impression: { softness: clamp01(0.72), calm: clamp01(0.65) },
      },
      patchIntent: {
        impression: { softness: 0.1, calm: 0.06 },
      },
      note: "direct hit：用户表达温暖/温馨/陪伴感的整体印象方向。",
    });
  }

  const colorWarmCues = ["更暖", "暖一点", "偏暖", "暖色"];
  const colorWarmMatched = colorWarmCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("colorMood") && colorWarmMatched.length > 0) {
    candidates.push({
      id: "direct-color-warm",
      label: colorWarmMatched[0],
      sourceType: "direct",
      sourceId: "direct:color-warm",
      field: "colorMood",
      primarySlot: "color",
      secondarySlots: [],
      polarity: "increase",
      strength: 0.78,
      confidence: 0.72,
      matchedCues: colorWarmMatched.slice(0, 2),
      semanticHints: { colorMood: "warm" },
      axisHints: {
        color: { warmth: clamp01(0.78) },
      },
      patchIntent: {
        color: { warmth: 0.12 },
      },
      note: "direct hit：颜色偏暖方向。",
    });
  }

  const colorMutedCues = ["柔和一点", "更温和", "温和", "不要太跳", "别太跳", "克制", "淡一点", "更淡"];
  const colorMutedMatched = colorMutedCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("colorMood") && colorMutedMatched.length > 0) {
    candidates.push({
      id: "direct-color-muted",
      label: "颜色更温和克制",
      sourceType: "direct",
      sourceId: "direct:color-muted",
      field: "colorMood",
      primarySlot: "color",
      secondarySlots: [],
      polarity: "decrease",
      strength: 0.72,
      confidence: 0.66,
      matchedCues: colorMutedMatched.slice(0, 2),
      semanticHints: { colorMood: "muted" },
      axisHints: {
        color: { saturation: clamp01(0.34) },
      },
      patchIntent: {
        color: { saturation: -0.1 },
      },
      note: "direct hit：颜色更克制、饱和度收低。",
    });
  }

  const arrOpenCues = ["呼吸感", "有呼吸感", "更有呼吸感", "更松", "更松一点", "松一点", "疏一点"];
  const arrOpenMatched = arrOpenCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("arrangementTendency") && arrOpenMatched.length > 0) {
    const topCue = text.includes("呼吸感") ? "有呼吸感" : arrOpenMatched[0];
    candidates.push({
      id: "direct-arrangement-open",
      label: topCue,
      sourceType: "direct",
      sourceId: "direct:arrangement-open",
      field: "arrangementTendency",
      primarySlot: "arrangement",
      secondarySlots: [],
      polarity: "increase",
      strength: 0.76,
      confidence: 0.72,
      matchedCues: arrOpenMatched.slice(0, 2),
      semanticHints: { arrangementTendency: "open" },
      axisHints: {
        arrangement: { spacing: clamp01(0.74) },
      },
      patchIntent: {
        arrangement: { spacing: 0.12 },
      },
      note: "direct hit：排布偏松、留呼吸感。",
    });
  }

  const arrOrderCues = ["整齐一点", "更整齐", "整齐", "有秩序", "秩序感", "有序"];
  const arrOrderMatched = arrOrderCues.filter((cue) => text.includes(cue));
  if (detection.hitFields.includes("arrangementTendency") && arrOrderMatched.length > 0) {
    const topCue = text.includes("有秩序") ? "有秩序" : text.includes("秩序感") ? "秩序感" : arrOrderMatched[0];
    candidates.push({
      id: "direct-arrangement-ordered",
      label: topCue,
      sourceType: "direct",
      sourceId: "direct:arrangement-ordered",
      field: "arrangementTendency",
      primarySlot: "arrangement",
      secondarySlots: [],
      polarity: "increase",
      strength: 0.76,
      confidence: 0.72,
      matchedCues: arrOrderMatched.slice(0, 2),
      semanticHints: { arrangementTendency: "ordered" },
      axisHints: {
        arrangement: { order: clamp01(0.76) },
      },
      patchIntent: {
        arrangement: { order: 0.12 },
      },
      note: "direct hit：排布偏整齐有秩序。",
    });
  }

  return candidates;
}
