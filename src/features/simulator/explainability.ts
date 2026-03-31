import type { AssetSlotAnnotation, FirstOrderSlotValues, SecondOrderSlotValues } from "@/core/assets/types";
import type { EntryAgentAxisMap, EntryAgentStatePatch, EntryAgentSlotKey, QaMode, HighValueField, EntryAgentResult, WeakBiasHint } from "@/features/entryAgent";
import type { SimulatorState } from "@/features/simulator/types";

export type ExplainabilityAxisPath =
  | "color.warmth"
  | "color.saturation"
  | "motif.complexity"
  | "motif.geometry"
  | "motif.organic"
  | "arrangement.order"
  | "arrangement.spacing"
  | "impression.calm"
  | "impression.energy"
  | "impression.softness";

type ExplainabilityAxisValue = {
  path: ExplainabilityAxisPath;
  slot: EntryAgentSlotKey;
  axis: EntryAgentAxisMap[EntryAgentSlotKey];
  value: number;
};

interface AxisGlossDefinition {
  label: string;
  shortLabel: string;
  higherGloss: string;
  lowerGloss: string;
  highValueGloss: string;
  lowValueGloss: string;
}

export interface AppliedInitializationDelta {
  slot: EntryAgentSlotKey;
  axis: EntryAgentAxisMap[EntryAgentSlotKey];
  axisPath: ExplainabilityAxisPath;
  delta: number;
  before: number;
  after: number;
}

export interface InitializationExplainabilityResult {
  initialBase: SimulatorState;
  finalBase: SimulatorState;
  appliedDeltaList: AppliedInitializationDelta[];
  statePatch: EntryAgentStatePatch;
}

export interface DeltaExplanationItem {
  axisPath: ExplainabilityAxisPath;
  label: string;
  direction: "up" | "down";
  delta: number;
  before: number;
  after: number;
  summary: string;
  gloss: string;
}

export interface WeakBiasSummaryItem {
  source: string;
  summaries: string[];
}

export interface InterpretationSummary {
  hitFieldLabels: string[];
  ambiguitySummary: string;
  qaModeLabel: string;
  followUpTargetLabel: string;
}

export interface StateConstructionSummary {
  axisHintSummaries: string[];
  weakBiasSummaries: WeakBiasSummaryItem[];
  appliedDeltaSummaries: string[];
}

export interface PrototypeExplainabilitySummary {
  mainSignals: string[];
  expandedSignals: string[];
  candidateSummaries: string[];
  keptSummaries: string[];
  suppressedSummaries: string[];
  mergeSummaries: string[];
  fallbackSummary: string;
}

export interface ConversationStateLogSummary {
  userText: string;
  turnCount: number;
  currentUnderstanding: string;
  followUpQuestion: string;
  readyToGenerate: boolean;
  interpretation: InterpretationSummary;
  prototypeExplainability: PrototypeExplainabilitySummary;
  stateConstruction: StateConstructionSummary;
  deltaExplanation: DeltaExplanationItem[];
}

export interface RefProfileValue {
  axisPath: ExplainabilityAxisPath;
  label: string;
  value: number;
  valueSummary: string;
}

export interface RefComparisonItem {
  axisPath: ExplainabilityAxisPath;
  label: string;
  baseValue: number;
  refValue: number;
  delta: number;
  direction: "higher" | "lower" | "close";
  summary: string;
  gloss: string;
}

export interface MatchedRefComparisonSummary {
  profile: RefProfileValue[];
  higherThanBase: RefComparisonItem[];
  lowerThanBase: RefComparisonItem[];
  closeToBase: RefComparisonItem[];
}

const ALL_AXIS_PATHS: ExplainabilityAxisPath[] = [
  "color.warmth",
  "color.saturation",
  "motif.complexity",
  "motif.geometry",
  "motif.organic",
  "arrangement.order",
  "arrangement.spacing",
  "impression.calm",
  "impression.energy",
  "impression.softness",
];

const AXIS_GLOSS_REGISTRY: Record<ExplainabilityAxisPath, AxisGlossDefinition> = {
  "color.warmth": {
    label: "Color warmth",
    shortLabel: "warmth",
    higherGloss: "更暖、更包裹",
    lowerGloss: "更冷、更疏离",
    highValueGloss: "整体偏暖，包裹感更强",
    lowValueGloss: "整体偏冷，距离感更强",
  },
  "color.saturation": {
    label: "Color saturation",
    shortLabel: "saturation",
    higherGloss: "颜色更饱和、更显眼",
    lowerGloss: "颜色更收、更克制",
    highValueGloss: "色彩更浓、更有存在感",
    lowValueGloss: "色彩更克制，刺激更低",
  },
  "motif.complexity": {
    label: "Motif complexity",
    shortLabel: "complexity",
    higherGloss: "图案更复杂、信息量更高",
    lowerGloss: "图案更收、视觉噪音更低",
    highValueGloss: "图案层次更多，更丰富",
    lowValueGloss: "图案更简洁，不那么碎",
  },
  "motif.geometry": {
    label: "Motif geometry",
    shortLabel: "geometry",
    higherGloss: "线条更几何、更硬朗",
    lowerGloss: "几何感更弱、边界更柔",
    highValueGloss: "更偏几何、结构感更强",
    lowValueGloss: "更少硬边几何感",
  },
  "motif.organic": {
    label: "Motif organic",
    shortLabel: "organic",
    higherGloss: "更自然、更有流动感",
    lowerGloss: "自然感更弱、形态更收",
    highValueGloss: "更偏自然生长感",
    lowValueGloss: "自然流动感较弱",
  },
  "arrangement.order": {
    label: "Arrangement order",
    shortLabel: "order",
    higherGloss: "更有秩序、更规整",
    lowerGloss: "更松、更不规则",
    highValueGloss: "整体组织更规整",
    lowValueGloss: "整体更自由、不那么规整",
  },
  "arrangement.spacing": {
    label: "Arrangement spacing",
    shortLabel: "spacing",
    higherGloss: "更松、更有呼吸感",
    lowerGloss: "更满、更紧凑",
    highValueGloss: "留白更大，更透气",
    lowValueGloss: "排布更紧，更充满",
  },
  "impression.calm": {
    label: "Impression calm",
    shortLabel: "calm",
    higherGloss: "更安静、低刺激",
    lowerGloss: "更活跃、张力更强",
    highValueGloss: "整体更安静放松",
    lowValueGloss: "整体更活跃，不那么安静",
  },
  "impression.energy": {
    label: "Impression energy",
    shortLabel: "energy",
    higherGloss: "更有活力、存在感更强",
    lowerGloss: "更收、更低刺激",
    highValueGloss: "存在感更明显，活力更强",
    lowValueGloss: "存在感更低，更克制",
  },
  "impression.softness": {
    label: "Impression softness",
    shortLabel: "softness",
    higherGloss: "更柔和、更放松",
    lowerGloss: "更硬、更利落",
    highValueGloss: "整体更柔和、更松弛",
    lowValueGloss: "整体更利落，不那么柔",
  },
};

const FIELD_LABELS: Record<HighValueField, string> = {
  spaceContext: "space context",
  overallImpression: "overall impression",
  colorMood: "color mood",
  patternTendency: "pattern tendency",
  arrangementTendency: "arrangement tendency",
};

const QA_MODE_LABELS: Record<QaMode, string> = {
  "exploratory-intake": "exploratory intake",
  "slot-completion": "slot completion",
  "preference-shift": "preference shift",
  "slot-revision": "slot revision",
  "lock-reinforcement": "lock reinforcement",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function formatPercent(value: number) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function roundDelta(value: number) {
  return Number(value.toFixed(3));
}

function getAxisGloss(path: ExplainabilityAxisPath) {
  return AXIS_GLOSS_REGISTRY[path];
}

function getFieldLabel(field: HighValueField | undefined) {
  return field ? FIELD_LABELS[field] : "none";
}

function pickTopAxisValues(axisValues: ExplainabilityAxisValue[], limit: number) {
  return [...axisValues]
    .sort((left, right) => Math.abs(right.value - 0.5) - Math.abs(left.value - 0.5))
    .slice(0, limit);
}

function sortDeltaItems<T extends { delta: number }>(items: T[]) {
  return [...items].sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}

function flattenStatePatch(statePatch: EntryAgentStatePatch) {
  const axisValues: ExplainabilityAxisValue[] = [];

  (Object.keys(statePatch) as EntryAgentSlotKey[]).forEach((slot) => {
    const slotPatch = statePatch[slot];
    if (!slotPatch) return;
    const slotPatchRecord = slotPatch as Record<string, number | undefined>;

    (Object.keys(slotPatch) as Array<EntryAgentAxisMap[typeof slot]>).forEach((axis) => {
      const value = slotPatchRecord[String(axis)];
      if (typeof value !== "number") return;
      axisValues.push({
        path: `${slot}.${axis}` as ExplainabilityAxisPath,
        slot,
        axis,
        value,
      });
    });
  });

  return axisValues;
}

function flattenWeakBiasAxes(weakBias: WeakBiasHint) {
  return flattenStatePatch(weakBias.axes);
}

function flattenAxisHints(result: Pick<EntryAgentResult, "axisHints">) {
  return flattenStatePatch(result.axisHints);
}

function flattenSimulatorState(state: SimulatorState) {
  return ALL_AXIS_PATHS.map((path) => {
    const [slot, axis] = path.split(".") as [EntryAgentSlotKey, EntryAgentAxisMap[EntryAgentSlotKey]];
    const slotRecord = state[slot] as Record<string, number>;
    return {
      path,
      slot,
      axis,
      value: Number(slotRecord[String(axis)]),
    };
  });
}

function flattenAnnotation(annotation: Pick<AssetSlotAnnotation, "firstOrder" | "secondOrder">) {
  const axisValues: ExplainabilityAxisValue[] = [];

  const pushAxisValue = (path: ExplainabilityAxisPath, value: number | undefined) => {
    if (typeof value !== "number") return;

    const [slot, axis] = path.split(".") as [EntryAgentSlotKey, EntryAgentAxisMap[EntryAgentSlotKey]];
    axisValues.push({
      path,
      slot,
      axis,
      value,
    });
  };

  // Keep annotation explainability intentionally narrow for the temporary
  // inspection layer. We only surface axes that already have stable gloss coverage.
  pushAxisValue("color.warmth", annotation.firstOrder.color.warmth);
  pushAxisValue("color.saturation", annotation.firstOrder.color.saturation);
  pushAxisValue("motif.complexity", annotation.firstOrder.motif.complexity);
  pushAxisValue("motif.geometry", annotation.firstOrder.motif.geometry);
  pushAxisValue("motif.organic", annotation.firstOrder.motif.organic);
  pushAxisValue("arrangement.order", annotation.firstOrder.arrangement.order);
  pushAxisValue("arrangement.spacing", annotation.firstOrder.arrangement.spacing);
  pushAxisValue("impression.calm", annotation.secondOrder?.impression?.calm);
  pushAxisValue("impression.energy", annotation.secondOrder?.impression?.energy);
  pushAxisValue("impression.softness", annotation.secondOrder?.impression?.softness);

  return axisValues;
}

export function getAxisLabel(path: ExplainabilityAxisPath) {
  return getAxisGloss(path).label;
}

export function getAxisShortLabel(path: ExplainabilityAxisPath) {
  return getAxisGloss(path).shortLabel;
}

export function describeAxisValue(path: ExplainabilityAxisPath, value: number) {
  const gloss = getAxisGloss(path);
  return value >= 0.5 ? gloss.highValueGloss : gloss.lowValueGloss;
}

export function explainInitializationDeltas(appliedDeltaList: AppliedInitializationDelta[]) {
  return sortDeltaItems(appliedDeltaList).map<DeltaExplanationItem>((item) => {
    const gloss = getAxisGloss(item.axisPath);
    const direction = item.delta >= 0 ? "up" : "down";
    const signedDelta = Math.abs(item.delta);

    return {
      axisPath: item.axisPath,
      label: gloss.label,
      direction,
      delta: item.delta,
      before: item.before,
      after: item.after,
      summary: `${gloss.shortLabel} ${direction === "up" ? "↑" : "↓"} ${Math.round(signedDelta * 100)} pts`,
      gloss: direction === "up" ? gloss.higherGloss : gloss.lowerGloss,
    };
  });
}

export function summarizeWeakBiasHints(weakBiasHints: WeakBiasHint[]) {
  return weakBiasHints.map<WeakBiasSummaryItem>((item) => ({
    source: item.source,
    summaries: pickTopAxisValues(flattenWeakBiasAxes(item), 2).map((axisItem) => {
      const gloss = getAxisGloss(axisItem.path);
      return `${gloss.shortLabel} ${formatPercent(axisItem.value)} · ${describeAxisValue(axisItem.path, axisItem.value)}`;
    }),
  }));
}

function summarizePrototypeExplainability(analysis: EntryAgentResult): PrototypeExplainabilitySummary {
  const mainSignals =
    analysis.interpretationMerge.prototypeMatches.length === 0
      ? ["none"]
      : analysis.interpretationMerge.prototypeMatches.map((match) => {
          const aliasLabel = match.matchedAliases.length > 0 ? `alias ${match.matchedAliases.join(", ")}` : "alias none";
          return `${match.label} · ${match.matchMode} · conf ${Math.round(match.confidence * 100)}% · ${aliasLabel}`;
        });
  const expandedSignals =
    analysis.interpretationMerge.prototypeMatches.length === 0
      ? ["none"]
      : analysis.interpretationMerge.prototypeMatches.flatMap((match) => {
          if (match.retrievalEvidence.length === 0) {
            return [`${match.label} · retrieval none · route ${match.routeType}`];
          }
          return match.retrievalEvidence.map((item) => {
            return `${match.label} · ${item.scoreLabel} · ${item.explainText}`;
          });
        });

  const candidateSummaries =
    analysis.interpretationMerge.candidateReadings.length === 0
      ? ["none"]
      : analysis.interpretationMerge.candidateReadings.map((candidate) => {
          return `${candidate.label} · ${candidate.sourceType} · ${candidate.primarySlot} · conf ${Math.round(candidate.confidence * 100)}%`;
        });

  const keptSummaries =
    analysis.interpretationMerge.keptReadings.length === 0
      ? ["none"]
      : analysis.interpretationMerge.keptReadings.map((item) => `${item.readingId} · ${item.reason}`);

  const suppressedSummaries =
    analysis.interpretationMerge.suppressedReadings.length === 0
      ? ["none"]
      : analysis.interpretationMerge.suppressedReadings.map((item) => `${item.readingId} · ${item.reason}`);

  const mergeSummaries =
    analysis.interpretationMerge.mergeGroups.length === 0
      ? ["none"]
      : analysis.interpretationMerge.mergeGroups.map((group) => {
          return `${group.relation} · ${group.primarySlot} · ${group.decision}`;
        });

  const fallbackSummary = analysis.interpretationMerge.fallback.triggered
    ? analysis.interpretationMerge.fallback.reasons.join(" / ")
    : "not triggered";

  return {
    mainSignals,
    expandedSignals,
    candidateSummaries,
    keptSummaries,
    suppressedSummaries,
    mergeSummaries,
    fallbackSummary,
  };
}

export function buildConversationStateLogSummary(input: {
  text: string;
  turnCount: number;
  currentUnderstanding: string;
  followUpQuestion: string;
  readyToGenerate: boolean;
  analysis: EntryAgentResult;
  initialization: InitializationExplainabilityResult;
}) {
  const { analysis, initialization } = input;
  const deltaExplanation = explainInitializationDeltas(initialization.appliedDeltaList);
  const topAxisHints = pickTopAxisValues(flattenAxisHints(analysis), 4).map((item) => {
    const gloss = getAxisGloss(item.path);
    return `${gloss.shortLabel} ${formatPercent(item.value)} · ${describeAxisValue(item.path, item.value)}`;
  });
  const ambiguitySummary =
    analysis.ambiguities.length === 0
      ? "no major ambiguity"
      : `${analysis.ambiguities.length} ambiguity note${analysis.ambiguities.length > 1 ? "s" : ""}: ${analysis.ambiguities
          .slice(0, 2)
          .map((item) => item.note)
          .join(" / ")}`;

  return {
    userText: input.text,
    turnCount: input.turnCount,
    currentUnderstanding: input.currentUnderstanding,
    followUpQuestion: input.followUpQuestion,
    readyToGenerate: input.readyToGenerate,
    interpretation: {
      hitFieldLabels: analysis.hitFields.map((field) => getFieldLabel(field)),
      ambiguitySummary,
      qaModeLabel: QA_MODE_LABELS[analysis.suggestedQaMode],
      followUpTargetLabel: getFieldLabel(analysis.suggestedFollowUpTarget),
    },
    prototypeExplainability: summarizePrototypeExplainability(analysis),
    stateConstruction: {
      axisHintSummaries: topAxisHints,
      weakBiasSummaries: summarizeWeakBiasHints(analysis.weakBiasHints),
      appliedDeltaSummaries: deltaExplanation.map((item) => `${item.summary} · ${item.gloss}`),
    },
    deltaExplanation,
  } satisfies ConversationStateLogSummary;
}

function buildRefProfile(axisValues: ExplainabilityAxisValue[]) {
  return axisValues.map<RefProfileValue>((item) => ({
    axisPath: item.path,
    label: getAxisGloss(item.path).label,
    value: item.value,
    valueSummary: `${formatPercent(item.value)} · ${describeAxisValue(item.path, item.value)}`,
  }));
}

export function compareAnnotationToBaseState(
  baseState: SimulatorState,
  annotation: Pick<AssetSlotAnnotation, "firstOrder" | "secondOrder">,
  options?: {
    closeThreshold?: number;
    significantThreshold?: number;
    maxPerBucket?: number;
  },
) {
  const closeThreshold = options?.closeThreshold ?? 0.06;
  const significantThreshold = options?.significantThreshold ?? 0.12;
  const maxPerBucket = options?.maxPerBucket ?? 5;

  const baseMap = new Map(flattenSimulatorState(baseState).map((item) => [item.path, item.value]));
  const refAxisValues = flattenAnnotation(annotation);
  const comparisonItems = refAxisValues
    .map<RefComparisonItem>((item) => {
      const baseValue = baseMap.get(item.path) ?? 0;
      const delta = roundDelta(item.value - baseValue);
      const gloss = getAxisGloss(item.path);
      const direction: RefComparisonItem["direction"] =
        Math.abs(delta) <= closeThreshold ? "close" : delta > 0 ? "higher" : "lower";

      return {
        axisPath: item.path,
        label: gloss.label,
        baseValue,
        refValue: item.value,
        delta,
        direction,
        summary:
          direction === "close"
            ? `${gloss.shortLabel} 接近 base`
            : `${gloss.shortLabel} ${direction === "higher" ? "高于" : "低于"} base ${Math.round(Math.abs(delta) * 100)} pts`,
        gloss:
          direction === "close"
            ? "和 current base 很接近"
            : direction === "higher"
              ? gloss.higherGloss
              : gloss.lowerGloss,
      };
    })
    .filter((item) => item.direction === "close" || Math.abs(item.delta) >= significantThreshold);

  const sorted = sortDeltaItems(comparisonItems);

  return {
    profile: buildRefProfile(refAxisValues),
    higherThanBase: sorted.filter((item) => item.direction === "higher").slice(0, maxPerBucket),
    lowerThanBase: sorted.filter((item) => item.direction === "lower").slice(0, maxPerBucket),
    closeToBase: sorted.filter((item) => item.direction === "close").slice(0, maxPerBucket),
  } satisfies MatchedRefComparisonSummary;
}

export function buildAnnotationFromStateSlice(input: {
  firstOrder: FirstOrderSlotValues;
  secondOrder?: SecondOrderSlotValues;
}) {
  return {
    firstOrder: input.firstOrder,
    secondOrder: input.secondOrder,
  } satisfies Pick<AssetSlotAnnotation, "firstOrder" | "secondOrder">;
}
