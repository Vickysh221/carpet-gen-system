import type { NormalizedInputEvent, QueryInterpretationPath, QueryRouteDecision, QueryRouteSignal, QueryRouteType, RetrievalLayerResult } from "./types";

const POETIC_CUES = ["清明", "烟雨", "薄纱", "月白", "清辉", "山岚", "暮色", "灯火", "雪地", "雪", "光"];
const ATMOSPHERE_CUES = ["空气", "气息", "香气", "湿度", "潮气", "边界", "扩散", "清透", "留白", "通透", "挥发", "漂移", "雾", "雾气"];
const MOTIF_CUES = ["花", "叶", "竹", "荷", "帆", "波", "肌理", "石纹", "轮廓", "纹理", "影"];
const CONSTRAINT_CUES = ["不要", "别", "不是", "避免", "不想", "不做", "太", "别太"];
const VAGUE_CUES = ["不确定", "说不清", "先看看", "高级一点", "自然一点", "还没想好"];
const COMPOSITION_CUES = ["和", "有一点", "带一点", "里有", "同时", "但", "而", "以及"];
const SENSORY_CUES = ["香气", "气息", "空气", "湿度", "触感", "味道", "亮度"];

function normalizeForMatch(text: string) {
  return text.replace(/\s+/g, "");
}

function pushSignal(
  signals: QueryRouteSignal[],
  kind: QueryRouteSignal["kind"],
  cue: string,
  weight: number,
  note: string,
) {
  signals.push({ kind, cue, weight, note });
}

function countHits(text: string, cues: string[]) {
  return cues.filter((cue) => cue && text.includes(cue));
}

function buildRouteOutcome(input: {
  detectedType: QueryRouteType;
  confidence: number;
  rationale: string;
  recommendedInterpretationPath: QueryInterpretationPath;
  trace: QueryRouteSignal[];
}): QueryRouteDecision {
  return {
    detectedType: input.detectedType,
    confidence: Number(input.confidence.toFixed(2)),
    rationale: input.rationale,
    recommendedInterpretationPath: input.recommendedInterpretationPath,
    trace: input.trace.sort((left, right) => right.weight - left.weight),
  };
}

export function routeEntryQuery(
  event: Pick<NormalizedInputEvent, "normalizedText" | "preservedPhrases" | "duplicateFlags" | "pollutionFlags">,
  retrieval?: Pick<RetrievalLayerResult, "semanticCandidates" | "comparisonCandidates">,
): QueryRouteDecision {
  const text = normalizeForMatch(event.normalizedText);
  const phraseText = event.preservedPhrases.join(" ");
  const retrievalText = [
    ...(retrieval?.semanticCandidates.slice(0, 3).map((item) => item.id) ?? []),
    ...(retrieval?.comparisonCandidates.slice(0, 3).map((item) => item.id) ?? []),
  ].join(" ");
  const matchSurface = `${text} ${phraseText} ${retrievalText}`.trim();
  const signals: QueryRouteSignal[] = [];

  const poeticHits = countHits(matchSurface, POETIC_CUES);
  const atmosphereHits = countHits(matchSurface, ATMOSPHERE_CUES);
  const motifHits = countHits(matchSurface, MOTIF_CUES);
  const constraintHits = countHits(matchSurface, CONSTRAINT_CUES);
  const vagueHits = countHits(matchSurface, VAGUE_CUES);
  const compositionHits = countHits(text, COMPOSITION_CUES);
  const sensoryHits = countHits(matchSurface, SENSORY_CUES);

  for (const cue of poeticHits) pushSignal(signals, "poetic-cue", cue, 1.05, "命中诗性意象或光感线索。");
  for (const cue of atmosphereHits) pushSignal(signals, "atmosphere-cue", cue, 0.92, "命中空气、扩散、边界或感官天气线索。");
  for (const cue of motifHits) pushSignal(signals, "motif-cue", cue, 0.7, "命中对象痕迹或轮廓类线索，但不直接决定主路径。");
  for (const cue of constraintHits) pushSignal(signals, "constraint-cue", cue, 1.15, "命中约束或反向意向。");
  for (const cue of vagueHits) pushSignal(signals, "vague-cue", cue, 0.95, "命中低承诺或未定向表达。");
  for (const cue of compositionHits) pushSignal(signals, "composition-cue", cue, 0.84, "命中并置、加法或转折结构。");

  const poeticScore = poeticHits.length * 1.05 + atmosphereHits.length * 0.92 + sensoryHits.length * 0.4;
  const motifScore = motifHits.length * 0.7 + (retrieval?.semanticCandidates.some((item) => item.source === "explicitMotifs") ? 0.45 : 0);
  const constraintScore = constraintHits.length * 1.15;
  const compositionScore = compositionHits.length * 0.84;
  const vagueScore = vagueHits.length * 0.95;

  if (constraintScore >= 1.15 && poeticScore < 1.2 && motifScore < 1.05) {
    return buildRouteOutcome({
      detectedType: "constraint-negation",
      confidence: 0.9,
      rationale: "约束信号比正向锚点更稳定，当前应先走 constraint-first，避免过早补正向图案。",
      recommendedInterpretationPath: "constraint-first",
      trace: signals,
    });
  }

  if (
    (poeticScore >= 1.2 && motifScore >= 0.9) ||
    (compositionScore >= 0.84 && (poeticScore >= 1 || motifScore >= 0.8))
  ) {
    return buildRouteOutcome({
      detectedType: "mixed-compositional",
      confidence: Math.min(0.94, 0.7 + poeticScore * 0.05 + motifScore * 0.04),
      rationale: "文本同时存在空气性与对象痕迹，且有并置结构，优先保 base / accent 关系。",
      recommendedInterpretationPath: "compositional-bridge",
      trace: signals,
    });
  }

  if (motifScore >= 1.15 && poeticScore < 1.2 && sensoryHits.length === 0) {
    return buildRouteOutcome({
      detectedType: "explicit-motif",
      confidence: Math.min(0.9, 0.66 + motifScore * 0.08),
      rationale: "对象痕迹比空气性更稳定，且未形成明显感官扩散层，优先按 motif-trace-first 处理。",
      recommendedInterpretationPath: "motif-trace-first",
      trace: signals,
    });
  }

  if (vagueScore >= 0.95 && poeticScore < 1 && motifScore < 0.9) {
    return buildRouteOutcome({
      detectedType: "vague-underspecified",
      confidence: 0.82,
      rationale: "当前输入更像开放偏好，先进入 guided-disambiguation，而不是假定已有稳定母题。",
      recommendedInterpretationPath: "guided-disambiguation",
      trace: signals,
    });
  }

  if (poeticScore >= 0.92 || sensoryHits.length > 0 || event.preservedPhrases.length > 0 || event.duplicateFlags.length > 0) {
    return buildRouteOutcome({
      detectedType: "poetic-atmospheric",
      confidence: Math.min(0.9, 0.6 + poeticScore * 0.08 + sensoryHits.length * 0.05),
      rationale: "输入更像在传达空气、光感、扩散或感官天气，应先保 atmosphere-first 解释。",
      recommendedInterpretationPath: "atmosphere-first",
      trace: signals,
    });
  }

  return buildRouteOutcome({
    detectedType: "vague-underspecified",
    confidence: 0.64,
    rationale: "未命中稳定主锚点，先作为 guided-disambiguation 处理，避免误写实或误具象。",
    recommendedInterpretationPath: "guided-disambiguation",
    trace: signals,
  });
}
