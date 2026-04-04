import { activeAnswerAlignmentProvider } from "./answerAlignmentAdapter";
import { composeComparisonCandidatesFromRetrieval, fallbackComparisonCandidatesForPath } from "./comparisonLibrary";
import { detectHighValueFieldHits } from "./fieldHitDetection";
import { getSlotQuestionSpec } from "./slotQuestionSpec";
import type { AnswerAlignment, ComparisonCandidate, ComparisonSelectionRecord, DisplayPlan, EntryAgentResult, HighValueField, InterpretationLayerResult, NextQuestionCandidate, PatternSemanticProjection, QueryRouteDecision, QuestionPlan, QuestionResolution, QuestionResolutionState, QuestionTrace, RetrievalLayerResult, SemanticGap, SemanticRoleHints } from "./types";
import type { SemanticRetrievalMatchResult } from "@/lib/api";

/** Fields that must be covered in first 3 turns of dialogue. */
const INITIAL_COVERAGE_FIELDS: HighValueField[] = ["overallImpression", "patternTendency", "spaceContext"];
const COVERAGE_BOOST = 18;
const REPEAT_PENALTY_THRESHOLD = 2; // same field asked this many times → penalty
const REPEAT_PENALTY = 20;

const FIELD_NEIGHBORS: Partial<Record<HighValueField, HighValueField[]>> = {
  overallImpression: ["patternTendency", "arrangementTendency", "colorMood"],
  patternTendency: ["arrangementTendency", "overallImpression", "colorMood"],
  arrangementTendency: ["patternTendency", "overallImpression"],
  colorMood: ["overallImpression", "patternTendency"],
  spaceContext: ["overallImpression", "arrangementTendency"],
};

function quoteCue(cue: string) {
  return `“${cue.replace(/^“|”$/g, "")}”`;
}

function getPrimaryCue(gap: SemanticGap) {
  return gap.evidence.find((item) => item && item !== gap.targetField && item !== gap.reason) ?? gap.evidence[0];
}

function buildCueGroundedPrompt(gap: SemanticGap) {
  const cue = getPrimaryCue(gap);
  if (!cue) {
    return undefined;
  }

  if (gap.targetField === "colorMood" || gap.targetSlot === "color") {
    return `${quoteCue(cue)} 这层感觉，你更想让颜色本身被看见一点，还是只作为整体气息轻轻带到？`;
  }

  if (gap.targetField === "patternTendency" || gap.targetSlot === "motif") {
    return `${quoteCue(cue)} 如果先挂到图案这一层，你更像是在回避太碎太花，还是太硬太几何？`;
  }

  if (gap.targetField === "arrangementTendency" || gap.targetSlot === "arrangement") {
    return `${quoteCue(cue)} 如果先挂到排布这一层，你更想让它松一点、有呼吸感，还是更整齐一些？`;
  }

  if (gap.targetField === "overallImpression" || gap.targetSlot === "impression") {
    return `${quoteCue(cue)} 我先把它理解成整体气质线索，你更想让它偏安静松一点，还是保留一点存在感？`;
  }

  if (gap.targetField === "spaceContext") {
    return `${quoteCue(cue)} 这层更像是在指向一个具体空间场景吗？`;
  }

  return undefined;
}

function isGenericPrompt(prompt: string, field: HighValueField | undefined) {
  const genericPatterns = [
    "如果先只收一个大方向",
    "如果先只确认一个最关键的缺口",
    "你更想让它整体偏安静放松",
  ];

  return field === "overallImpression" && genericPatterns.some((pattern) => prompt.includes(pattern));
}

function buildPromptForGap(gap: SemanticGap) {
  if (gap.questionPromptOverride) {
    return gap.questionPromptOverride;
  }

  const cueGroundedPrompt = buildCueGroundedPrompt(gap);

  if (gap.type === "prototype-conflict") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "有两种理解方向都说得通，你更希望我先按哪边走？";
  }

  if (gap.type === "unresolved-ambiguity") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "你更想先往哪个方向确认一下？";
  }

  if (gap.type === "weak-anchor") {
    const spec = getSlotQuestionSpec(gap.targetField);
    const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
    if (gap.questionKind === "strength") {
      const cue = getPrimaryCue(gap);
      return cue
        ? `${quoteCue(cue)} 这层感觉你是明确想保留，还是只是希望别太重、点到为止就好？`
        : "这个方向你是明确想保留，还是只是顺带有一点就行？";
    }
    if (cueGroundedPrompt) {
      return cueGroundedPrompt;
    }
    if (modeSpec) {
      return modeSpec.buildPrompt({ reason: gap.reason });
    }
    return "这个方向你是明确想保留，还是顺带有一点就行？";
  }

  const spec = getSlotQuestionSpec(gap.targetField);
  const modeSpec = spec?.modes.find((item) => item.mode === gap.questionMode) ?? spec?.modes[0];
  if (cueGroundedPrompt) {
    return cueGroundedPrompt;
  }
  if (modeSpec) {
    return modeSpec.buildPrompt({ reason: gap.reason });
  }
  return "如果先只确认一个最关键的缺口，你希望我先补氛围、颜色，还是图案方向？";
}

function buildCandidate(gap: SemanticGap): NextQuestionCandidate {
  const targetType = gap.type === "missing-slot" ? "slot" : gap.type === "prototype-conflict" ? "conflict" : "ambiguity";
  const questionIntent =
    gap.type === "prototype-conflict"
      ? "resolve-prototype-conflict"
      : gap.type === "unresolved-ambiguity"
        ? "resolve-ambiguity"
        : gap.type === "weak-anchor"
          ? "stabilize-weak-anchor"
          : "fill-missing-slot";

  const prompt = buildPromptForGap(gap);
  const genericPenalty = isGenericPrompt(prompt, gap.targetField) ? 8 : 0;
  const cueBonus = gap.questionPromptOverride ? 10 : gap.evidence.some((item) => item && item !== gap.targetField) ? 6 : 0;

  return {
    id: `question:${gap.id}`,
    targetType,
    targetRef: gap.id,
    targetField: gap.targetField,
    targetSlot: gap.targetSlot,
    targetAxes: gap.targetAxes,
    questionMode: gap.questionMode,
    questionKind: gap.questionKind,
    questionFamilyId: gap.questionFamilyId,
    questionIntent,
    prompt,
    priority: gap.priority + cueBonus - genericPenalty,
    resolvesGapIds: [gap.id],
    expectedInformationGain: gap.expectedGain,
    questionWhy: `${gap.rankingReason}${cueBonus > 0 ? " 优先顺着当前 cue 往最近槽位继续追问。" : ""}${genericPenalty > 0 ? " 当前候选较泛，已下调优先级。" : ""}`.trim(),
  };
}

function countSharedAxes(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((axis) => rightSet.has(axis)).length;
}

function isNeighborField(source: HighValueField | undefined, target: HighValueField | undefined) {
  if (!source || !target || source === target) {
    return false;
  }

  return FIELD_NEIGHBORS[source]?.includes(target) ?? false;
}

function scoreContinuation(input: {
  candidate: NextQuestionCandidate;
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}) {
  const { candidate, previousQuestion, answerAlignment } = input;
  if (!previousQuestion || !answerAlignment) {
    return 0;
  }

  let score = 0;
  const sameField = candidate.targetField !== undefined && candidate.targetField === previousQuestion.targetField;
  const sharedAxes = countSharedAxes(candidate.targetAxes, previousQuestion.targetAxes);
  const sameAxes =
    candidate.targetAxes.length > 0 &&
    previousQuestion.targetAxes.length > 0 &&
    sharedAxes === candidate.targetAxes.length &&
    sharedAxes === previousQuestion.targetAxes.length;

  if (candidate.prompt === previousQuestion.prompt) {
    score -= 100;
  }

  if (candidate.targetRef === previousQuestion.gapId) {
    score -= 28;
  }

  if (sameField && sameAxes) {
    score -= 26;
  } else if (sameField && sharedAxes > 0) {
    score += 14;
  } else if (sameField) {
    score += 6;
  }

  if (isNeighborField(previousQuestion.targetField, candidate.targetField)) {
    score += 18;
  }

  if (answerAlignment.introducedFields.length > 0 && candidate.targetField && answerAlignment.introducedFields.includes(candidate.targetField)) {
    score += answerAlignment.status === "shifted" ? 24 : 12;
  }

  if (
    previousQuestion.targetField === "overallImpression" &&
    candidate.targetField === "overallImpression" &&
    answerAlignment.status !== "shifted"
  ) {
    score -= 22;
  }

  if (answerAlignment.status === "answered") {
    if (isNeighborField(previousQuestion.targetField, candidate.targetField)) {
      score += 12;
    }
    if (sameField && sharedAxes === 0) {
      score -= 8;
    }
  }

  if (answerAlignment.status === "partial") {
    if (sameField && !sameAxes) {
      score += 8;
    }
    if (!sameField && !isNeighborField(previousQuestion.targetField, candidate.targetField)) {
      score -= 10;
    }
  }

  if (answerAlignment.status === "shifted" && candidate.targetField && !answerAlignment.introducedFields.includes(candidate.targetField)) {
    score -= 12;
  }

  return score;
}

function rerankQuestionCandidates(input: {
  questionCandidates: NextQuestionCandidate[];
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}) {
  return [...input.questionCandidates].sort((left, right) => {
    const leftScore = left.priority + scoreContinuation({ candidate: left, previousQuestion: input.previousQuestion, answerAlignment: input.answerAlignment });
    const rightScore = right.priority + scoreContinuation({ candidate: right, previousQuestion: input.previousQuestion, answerAlignment: input.answerAlignment });
    return rightScore - leftScore;
  });
}

function buildReplySnapshot(input: {
  queryRoute: QueryRouteDecision;
  interpretation?: InterpretationLayerResult;
  semanticCanvas?: EntryAgentResult["semanticCanvas"];
  hitFields: EntryAgentResult["hitFields"];
  selectedQuestion?: NextQuestionCandidate;
}) {
  const baseAtmosphere = input.interpretation?.semanticRoles.baseAtmosphere[0]?.label;
  const accentMotif = input.interpretation?.semanticRoles.accentMotif[0]?.label;

  if (input.queryRoute.detectedType === "mixed-compositional") {
    return `我会先把它拆成两层来看：底子先保 ${baseAtmosphere ?? "空气和气氛"}，再决定那一点 ${accentMotif ?? "题材痕迹"} 要保留到什么程度。`;
  }

  if (input.queryRoute.detectedType === "poetic-atmospheric") {
    return `我会先把它理解成 ${baseAtmosphere ?? "空气、边界和表面天气"}，不急着把它落成具体对象。`;
  }

  if (input.queryRoute.detectedType === "explicit-motif") {
    return `我先把它收成 ${accentMotif ?? "可控的母题痕迹"}，重点不是把对象画出来，而是决定痕迹保留到什么强度。`;
  }

  if (input.queryRoute.detectedType === "constraint-negation") {
    return "我先把反方向收住，先明确哪些倾向不能放大，再决定正向意图该如何成立。";
  }

  return "我先把它看成一个还没完全落稳的方向，先给你几种更值钱的差异，帮你辨认真正要保哪一层。";
}

function createDerivedComparison(input: {
  id: string;
  groupId: string;
  intendedSplitDimension: string;
  text: string;
  delta: string;
  derivedFrom?: string[];
  targetField?: ComparisonCandidate["selectionEffect"]["targetField"];
  targetSlot?: ComparisonCandidate["selectionEffect"]["targetSlot"];
  path?: ComparisonCandidate["selectionEffect"]["intendedPath"];
  canonicalEffects?: ComparisonCandidate["selectionEffect"]["canonicalEffects"];
}): ComparisonCandidate {
  return {
    id: input.id,
    groupId: input.groupId,
    intendedSplitDimension: input.intendedSplitDimension,
    curatedDisplayText: input.text,
    semanticDeltaHint: input.delta,
    derivedFrom: input.derivedFrom,
    selectionEffect: {
      targetField: input.targetField,
      targetSlot: input.targetSlot,
      intendedPath: input.path,
      patchHint: input.delta,
      semanticDeltaHint: input.delta,
      preferredPolarity: "prefer",
      canonicalEffects: input.canonicalEffects,
    },
  };
}

function topValues(projection: PatternSemanticProjection, path: keyof PatternSemanticProjection["formativeStructure"] | keyof PatternSemanticProjection["semanticMaterial"] | "colorClimate") {
  if (path === "colorClimate") {
    return projection.atmosphericSurface.colorClimate.map((item) => item.value);
  }
  if (path in projection.formativeStructure) {
    return projection.formativeStructure[path as keyof PatternSemanticProjection["formativeStructure"]].map((item) => item.value);
  }
  return projection.semanticMaterial[path as keyof PatternSemanticProjection["semanticMaterial"]].map((item) => item.value);
}

function deriveSlotDrivenComparisonCandidates(input: {
  queryText: string;
  queryRoute: QueryRouteDecision;
  interpretation: InterpretationLayerResult;
  retrievalLayer?: RetrievalLayerResult;
}): { comparisonCandidates: ComparisonCandidate[]; retrievalMatches: SemanticRetrievalMatchResult[] } {
  const fallback = fallbackComparisonCandidatesForPath(input.queryRoute.recommendedInterpretationPath);
  const retrievalMatches = (input.retrievalLayer?.comparisonCandidates ?? [])
    .map((item) => ({
      id: item.id,
      text: item.text,
      score: item.score,
      source: item.source as SemanticRetrievalMatchResult["source"],
    }));
  const roles = input.interpretation.semanticRoles;
  const projection = input.interpretation.patternSemanticProjection;
  const unresolved = input.interpretation.unresolvedSplits;
  const slotDerived: ComparisonCandidate[] = [];

  if (unresolved.some((item) => item.id === "base-atmosphere-vs-accent-motif")) {
    slotDerived.push(
      createDerivedComparison({
        id: "slot-base-atmosphere",
        groupId: "slot-derived",
        intendedSplitDimension: "base-atmosphere-priority",
        text: `更偏把 ${roles.baseAtmosphere[0]?.label ?? "空气和气氛"} 放在最前面，先保住整体被风和留白洗过的底子。`,
        delta: "raise atmosphere priority; keep motif trace secondary",
        derivedFrom: ["unresolved:base-atmosphere-vs-accent-motif", ...(input.interpretation.unresolvedSplits[0]?.derivedFrom ?? [])],
        targetField: "overallImpression",
        targetSlot: "impression",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: {
          atmosphereQualities: [roles.baseAtmosphere[0]?.label ?? "atmosphere-first"],
          presenceQualities: ["low motif presence"],
        },
      }),
      createDerivedComparison({
        id: "slot-accent-motif",
        groupId: "slot-derived",
        intendedSplitDimension: "accent-motif-priority",
        text: `更偏把 ${roles.accentMotif[0]?.label ?? "那一点母题痕迹"} 轻轻提出来，但仍只保留在组织和轮廓层。`,
        delta: "raise motif trace presence while keeping anti-literal bias",
        derivedFrom: ["unresolved:base-atmosphere-vs-accent-motif", ...(input.interpretation.unresolvedSplits[0]?.derivedFrom ?? [])],
        targetField: "patternTendency",
        targetSlot: "motif",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: {
          patternQualities: [roles.accentMotif[0]?.label ?? "motif-trace"],
          presenceQualities: ["controlled motif visibility"],
        },
      }),
    );
  }

  if (unresolved.some((item) => item.id === "diffused-scent-vs-trace-retention")) {
    slotDerived.push(
      createDerivedComparison({
        id: "slot-sensory-diffusion",
        groupId: "slot-derived",
        intendedSplitDimension: "sensory-diffusion",
        text: `更偏让 ${roles.sensoryModifiers[0]?.label ?? "气味和气息"} 融进空气里，不立成对象，只留下轻微挥发和扩散。`,
        delta: "favor diffusion and evaporation over object readability",
        derivedFrom: ["unresolved:diffused-scent-vs-trace-retention", ...(input.interpretation.unresolvedSplits.find((item) => item.id === "diffused-scent-vs-trace-retention")?.derivedFrom ?? [])],
        targetField: "overallImpression",
        targetSlot: "impression",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: {
          atmosphereQualities: ["diffused sensory air"],
          patternQualities: ["soft diffusion"],
        },
      }),
      createDerivedComparison({
        id: "slot-trace-retention",
        groupId: "slot-derived",
        intendedSplitDimension: "trace-retention",
        text: `更偏局部留一点 ${roles.accentMotif[0]?.label ?? "叶感或轮廓痕迹"}，让它被看见，但不走到插画化。`,
        delta: "retain local trace without literal scenic rendering",
        derivedFrom: ["unresolved:diffused-scent-vs-trace-retention", ...(input.interpretation.unresolvedSplits.find((item) => item.id === "diffused-scent-vs-trace-retention")?.derivedFrom ?? [])],
        targetField: "patternTendency",
        targetSlot: "motif",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: {
          patternQualities: ["outline-retention"],
          presenceQualities: ["local-focus"],
        },
      }),
    );
  }

  if (slotDerived.length === 0 && input.queryRoute.detectedType === "poetic-atmospheric") {
    const flows = topValues(projection, "flowDirection");
    const colors = topValues(projection, "colorClimate");
    slotDerived.push(
      createDerivedComparison({
        id: "slot-atmosphere-clarity",
        groupId: "slot-derived",
        intendedSplitDimension: "clarity-and-air",
        text: `更偏把空气擦得更薄一点，留下 ${colors[0] ?? "清透的亮"}，而不是让雾层变厚。`,
        delta: "raise clarity and thin-air brightness",
        derivedFrom: [...projection.atmosphericSurface.colorClimate.map((item) => `slot:${item.value}`)],
        targetField: "colorMood",
        targetSlot: "color",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: { colorQualities: [colors[0] ?? "thin-air clarity"] },
      }),
      createDerivedComparison({
        id: "slot-atmosphere-flow",
        groupId: "slot-derived",
        intendedSplitDimension: "flow-direction",
        text: `更偏保住 ${flows[0] ?? "轻微流向"}，让气息像在表面慢慢漂移，而不是整片静止。`,
        delta: "raise directional drift and flow",
        derivedFrom: [...projection.formativeStructure.flowDirection.map((item) => `slot:${item.value}`)],
        targetField: "arrangementTendency",
        targetSlot: "arrangement",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: { arrangementQualities: [flows[0] ?? "directional drift"] },
      }),
    );
  }

  if (slotDerived.length === 0 && input.queryRoute.detectedType === "explicit-motif") {
    slotDerived.push(
      createDerivedComparison({
        id: "slot-motif-trace",
        groupId: "slot-derived",
        intendedSplitDimension: "trace-strength",
        text: "更偏只留痕迹，让母题退到后面，只剩图案语言里的轻微回声。",
        delta: "keep motif as residual trace",
        derivedFrom: [...projection.semanticMaterial.motifFamily.map((item) => `slot:${item.value}`), ...roles.accentMotif.map((item) => item.id)],
        targetField: "patternTendency",
        targetSlot: "motif",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: { patternQualities: ["trace-strength"], presenceQualities: ["controlled motif visibility"] },
      }),
      createDerivedComparison({
        id: "slot-motif-outline",
        groupId: "slot-derived",
        intendedSplitDimension: "outline-retention",
        text: "更偏留一点轮廓，让人能感觉到原来是什么，但不走到具象描写。",
        delta: "retain weak outline; stay anti-literal",
        derivedFrom: [...projection.semanticMaterial.motifFamily.map((item) => `slot:${item.value}`), ...roles.accentMotif.map((item) => item.id)],
        targetField: "patternTendency",
        targetSlot: "motif",
        path: input.queryRoute.recommendedInterpretationPath,
        canonicalEffects: { patternQualities: ["outline-retention"], presenceQualities: ["controlled motif visibility"] },
      }),
    );
  }

  if (slotDerived.length >= 2) {
    return {
      comparisonCandidates: slotDerived.slice(0, 4),
      retrievalMatches,
    };
  }

  if (retrievalMatches.length > 0) {
    return {
      comparisonCandidates: composeComparisonCandidatesFromRetrieval({
        query: input.queryText,
        matches: retrievalMatches,
        preferredPath: input.queryRoute.recommendedInterpretationPath,
      }),
      retrievalMatches,
    };
  }

  return {
    comparisonCandidates: fallback,
    retrievalMatches: [],
  };
}

function shouldAskQuestion(input: {
  queryRoute: QueryRouteDecision;
  selectedQuestion?: NextQuestionCandidate;
  comparisonCandidates: ComparisonCandidate[];
  comparisonSelections?: ComparisonSelectionRecord[];
}) {
  if (!input.selectedQuestion) {
    return false;
  }

  if (input.queryRoute.detectedType === "vague-underspecified") {
    return false;
  }

  if ((input.comparisonSelections?.length ?? 0) >= 2) {
    return false;
  }

  return input.comparisonCandidates.length > 0;
}

function buildComparisonLedFollowUp(input: {
  queryRoute: QueryRouteDecision;
  interpretation?: InterpretationLayerResult;
  comparisonCandidates: ComparisonCandidate[];
  selectedQuestion?: NextQuestionCandidate;
  answerAlignment?: AnswerAlignment;
  comparisonSelections?: ComparisonSelectionRecord[];
}) {
  const preferred = input.comparisonSelections?.filter((item) => item.mode === "prefer") ?? [];
  const first = input.comparisonCandidates[0];
  const second = input.comparisonCandidates[1];
  const unresolved = input.interpretation?.unresolvedSplits[0];

  if (unresolved) {
    return unresolved.prompt;
  }

  if (input.selectedQuestion?.targetField === "colorMood") {
    if (input.queryRoute.detectedType === "mixed-compositional") {
      return "这一步我更想确认的是：颜色要融在烟雨里，还是要让一点亮度轻轻浮出来？";
    }
    return "这一轮更值钱的一道分叉是：颜色要被轻轻看见一点，还是继续退到空气里不直接跳出来？";
  }

  if (input.selectedQuestion?.targetField === "arrangementTendency") {
    return "接下来我更想分清的是：整体排布要更松一点有呼吸，还是再收住一点，不让画面散开？";
  }

  if (input.selectedQuestion?.targetField === "overallImpression") {
    return "这里我更想确认的是：整体先往安静收，还是还要保一点轻微存在感？";
  }

  if (input.queryRoute.detectedType === "poetic-atmospheric") {
    if (preferred.some((item) => item.candidateId === "atmosphere-humidity-suspended")) {
      return "你更想保住潮气悬着的空气，还是让边界再压低一点？";
    }
    return "这里我更想确认的是：你更靠近潮气悬着，还是更靠近边界被压低？";
  }

  if (input.queryRoute.detectedType === "explicit-motif") {
    if (preferred.some((item) => item.candidateId === "motif-outline-hint")) {
      return "这一步我只想确认：你要的是留一点轮廓，还是让它再可辨认一点？";
    }
    return "这里真正要分清的是：你更想只留痕迹，还是还要保一点轮廓？";
  }

  if (input.queryRoute.detectedType === "mixed-compositional") {
    return "接下来最值钱的一道分叉是：你更想保住烟雨的空气，还是让竹影再清楚一点？";
  }

  if (input.queryRoute.detectedType === "constraint-negation") {
    return "边界先收住以后，你更想让它融进去，还是只在局部轻轻浮出来一点？";
  }

  if (first && second) {
    return `你更靠近“${first.intendedSplitDimension}”还是“${second.intendedSplitDimension}”？`;
  }

  return undefined;
}

function buildDisplayPlan(input: {
  queryText: string;
  queryRoute: QueryRouteDecision;
  interpretation?: InterpretationLayerResult;
  semanticCanvas?: EntryAgentResult["semanticCanvas"];
  hitFields: EntryAgentResult["hitFields"];
  selectedQuestion?: NextQuestionCandidate;
  answerAlignment?: AnswerAlignment;
  comparisonCandidates: ComparisonCandidate[];
  retrievalMatches: SemanticRetrievalMatchResult[];
  comparisonSelections?: ComparisonSelectionRecord[];
}): DisplayPlan {
  const comparisonCandidates = input.comparisonCandidates;
  const whetherToAskQuestion = shouldAskQuestion({
    queryRoute: input.queryRoute,
    selectedQuestion: input.selectedQuestion,
    comparisonCandidates,
    comparisonSelections: input.comparisonSelections,
  });
  const followUpQuestion = whetherToAskQuestion
    ? buildComparisonLedFollowUp({
        queryRoute: input.queryRoute,
        interpretation: input.interpretation,
        comparisonCandidates,
        selectedQuestion: input.selectedQuestion,
        answerAlignment: input.answerAlignment,
        comparisonSelections: input.comparisonSelections,
      })
    : undefined;

  return {
    replySnapshot: buildReplySnapshot(input),
    comparisonCandidates,
    whetherToAskQuestion,
    followUpQuestion,
    plannerTrace: [
      `route=${input.queryRoute.detectedType}`,
      `path=${input.queryRoute.recommendedInterpretationPath}`,
      `comparison-groups=${[...new Set(comparisonCandidates.map((item) => item.groupId))].join(",") || "none"}`,
      ...(input.interpretation?.patternSemanticProjection.slotTrace ?? []),
      `unresolved=${input.interpretation?.unresolvedSplits.map((item) => item.id).join(",") || "none"}`,
      `comparison-retrieval=${input.retrievalMatches.length > 0 ? input.retrievalMatches.map((item) => item.id).join(",") : "fallback"}`,
      `comparison-selections=${input.comparisonSelections?.map((item) => `${item.candidateId}:${item.mode}`).join(",") || "none"}`,
      `ask=${whetherToAskQuestion ? "yes" : "no"}`,
    ],
  };
}

function buildRuleBasedAnswerAlignment(input: {
  previousQuestion?: QuestionTrace;
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
  latestReplyText?: string;
  latestResolution?: QuestionResolution;
}): AnswerAlignment | undefined {
  const previousQuestion = input.previousQuestion;
  const latestReplyHitFields = input.latestReplyText ? detectHighValueFieldHits(input.latestReplyText).hitFields : [];
  const activeReplyFields = latestReplyHitFields.length > 0 ? latestReplyHitFields : input.hitFields;
  if (!previousQuestion) {
    return {
      status: "initial",
      introducedFields: activeReplyFields,
      note: "首轮输入，还没有上一问需要对齐。",
      source: "rules",
      confidence: 0.96,
    };
  }

  const latestResolution = input.latestResolution;
  const resolvedPreviousFamily =
    latestResolution?.familyId === previousQuestion.questionFamilyId &&
    (latestResolution?.status === "resolved" || latestResolution?.status === "narrowed");
  const introducedFields = activeReplyFields.filter((field) => field !== previousQuestion.targetField);
  const answeredPreviousField = resolvedPreviousFamily || (previousQuestion.targetField ? activeReplyFields.includes(previousQuestion.targetField) : false);
  const answeredPreviousAxes = previousQuestion.targetAxes.some((axis) => input.bridge.semanticCanvas?.slotMappings.targetAxes.includes(axis));
  const poeticShift = introducedFields.length > 0 && (input.bridge.semanticCanvas?.rawCues.length ?? 0) > 0;
  const fullyResolvedPreviousFamily = latestResolution?.familyId === previousQuestion.questionFamilyId && latestResolution?.status === "resolved";
  const narrowedPreviousFamily = latestResolution?.familyId === previousQuestion.questionFamilyId && latestResolution?.status === "narrowed";

  if (fullyResolvedPreviousFamily && introducedFields.length === 0) {
    return {
      status: "answered",
      introducedFields,
      note: "用户这句是在顺着上一轮的问题选边，已经把那道分叉收窄到了明确方向。",
      source: "rules",
      confidence: 0.9,
    };
  }

  if (narrowedPreviousFamily && introducedFields.length === 0) {
    return {
      status: "partial",
      introducedFields,
      note: "用户这句明显是在回应上一轮的问题，方向已经靠近其中一支，但边界还没有完全锁死。",
      source: "rules",
      confidence: 0.84,
    };
  }

  if (!answeredPreviousField && !answeredPreviousAxes && poeticShift) {
    return {
      status: "shifted",
      introducedFields,
      note: "用户没有顺着上一问回答，而是主动切到了新的语义线程。",
      source: "rules",
      confidence: 0.78,
    };
  }

  if ((answeredPreviousField || answeredPreviousAxes) && introducedFields.length > 0) {
    return {
      status: "partial",
      introducedFields,
      note: "用户部分回应了上一问，同时补入了新的语义线程。",
      source: "rules",
      confidence: 0.72,
    };
  }

  return {
    status: answeredPreviousField || answeredPreviousAxes ? "answered" : "partial",
    introducedFields,
    note: answeredPreviousField || answeredPreviousAxes ? "用户基本回应了上一轮问题。" : "用户只部分回应了上一轮问题。",
    source: "rules",
    confidence: answeredPreviousField || answeredPreviousAxes ? 0.74 : 0.64,
  };
}

async function evaluateAnswerAlignment(input: {
  previousQuestion?: QuestionTrace;
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
  latestReplyText?: string;
  latestResolution?: QuestionResolution;
}): Promise<AnswerAlignment | undefined> {
  const ruleAlignment = buildRuleBasedAnswerAlignment(input);
  if (!input.previousQuestion || !input.bridge.semanticCanvas) {
    return ruleAlignment;
  }

  const llmResult = await activeAnswerAlignmentProvider.generate({
    previousQuestion: input.previousQuestion,
    hitFields: input.hitFields,
    semanticCanvas: input.bridge.semanticCanvas,
  });

  if (!llmResult.alignment) {
    return ruleAlignment;
  }

  if (
    ruleAlignment &&
    (ruleAlignment.status === "shifted" || ruleAlignment.status === "answered") &&
    ruleAlignment.status !== llmResult.alignment.status &&
    (ruleAlignment.confidence ?? 0) >= 0.76
  ) {
    return {
      ...ruleAlignment,
      source: "hybrid",
      note: `${ruleAlignment.note} LLM guard 给出了不同判断，但规则护栏保留了更强的本地结论。`,
    };
  }

  return {
    ...llmResult.alignment,
    source: ruleAlignment ? "hybrid" : "llm-guard",
  };
}

function selectQuestionCandidate(input: {
  questionCandidates: NextQuestionCandidate[];
  previousQuestion?: QuestionTrace;
  answerAlignment?: AnswerAlignment;
}): { selectedQuestion?: NextQuestionCandidate; planningStrategy: QuestionPlan["planningStrategy"] } {
  const defaultQuestion = input.questionCandidates[0];
  if (!defaultQuestion) {
    return { selectedQuestion: undefined, planningStrategy: "default" };
  }

  if (!input.previousQuestion || !input.answerAlignment) {
    return { selectedQuestion: defaultQuestion, planningStrategy: "default" };
  }

  if (input.answerAlignment.status === "shifted" && input.answerAlignment.introducedFields.length > 0) {
    const shiftedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      candidate.targetField !== undefined &&
      input.answerAlignment?.introducedFields.includes(candidate.targetField),
    );
    if (shiftedQuestion) {
      return { selectedQuestion: shiftedQuestion, planningStrategy: "switch-thread" };
    }
  }

  if (input.answerAlignment.status === "answered") {
    const advancedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      (candidate.targetField !== input.previousQuestion?.targetField || candidate.targetRef !== input.previousQuestion?.gapId),
    );
    if (advancedQuestion) {
      return { selectedQuestion: advancedQuestion, planningStrategy: "advance" };
    }
  }

  if (input.answerAlignment.status === "partial") {
    const reframedQuestion = input.questionCandidates.find((candidate) =>
      candidate.prompt !== input.previousQuestion?.prompt &&
      candidate.targetField === input.previousQuestion?.targetField,
    );
    if (reframedQuestion) {
      return { selectedQuestion: reframedQuestion, planningStrategy: "reframe" };
    }
  }

  return {
    selectedQuestion: input.questionCandidates.find((candidate) => candidate.prompt !== input.previousQuestion?.prompt) ?? defaultQuestion,
    planningStrategy: "default",
  };
}

/**
 * Boost candidates targeting fields not yet covered in dialogue.
 * Penalty for fields asked too many times.
 */
function applyCoverageBalance(
  candidates: NextQuestionCandidate[],
  hitFields: HighValueField[],
  questionHistory: QuestionTrace[],
): NextQuestionCandidate[] {
  const uncoveredCritical = INITIAL_COVERAGE_FIELDS.filter((f) => !hitFields.includes(f));

  // Count how many times each field was asked in history
  const fieldAskCount = new Map<string, number>();
  for (const trace of questionHistory) {
    if (trace.targetField) {
      fieldAskCount.set(trace.targetField, (fieldAskCount.get(trace.targetField) ?? 0) + 1);
    }
  }

  return candidates.map((candidate) => {
    let delta = 0;
    if (candidate.targetField && uncoveredCritical.includes(candidate.targetField)) {
      delta += COVERAGE_BOOST;
    }
    const askCount = candidate.targetField ? (fieldAskCount.get(candidate.targetField) ?? 0) : 0;
    if (askCount >= REPEAT_PENALTY_THRESHOLD) {
      delta -= REPEAT_PENALTY * (askCount - REPEAT_PENALTY_THRESHOLD + 1);
    }
    if (delta === 0) return candidate;
    return { ...candidate, priority: candidate.priority + delta };
  });
}

export async function buildQuestionPlan(input: {
  queryText: string;
  semanticGaps: SemanticGap[];
  previousQuestion?: QuestionTrace;
  questionHistory?: QuestionTrace[];
  bridge: Pick<EntryAgentResult, "semanticCanvas">;
  hitFields: EntryAgentResult["hitFields"];
  interpretation: InterpretationLayerResult;
  queryRoute: QueryRouteDecision;
  retrievalLayer?: RetrievalLayerResult;
  comparisonSelections?: ComparisonSelectionRecord[];
  latestReplyText?: string;
  resolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
}): Promise<{
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
  displayPlan: DisplayPlan;
  resolutionState?: QuestionResolutionState;
}> {
  const rawCandidates = input.semanticGaps.map(buildCandidate).sort((left, right) => right.priority - left.priority);
  const baseCandidates = applyCoverageBalance(rawCandidates, input.hitFields, input.questionHistory ?? []);
  const answerAlignment = await evaluateAnswerAlignment({
    previousQuestion: input.previousQuestion,
    bridge: input.bridge,
    hitFields: input.hitFields,
    latestReplyText: input.latestReplyText,
    latestResolution: input.latestResolution,
  });
  const resolutionState = input.resolutionState;
  const resolution = input.latestResolution;
  const unresolvedCandidates = baseCandidates.filter((candidate) => {
    if (!candidate.questionFamilyId || !resolutionState) {
      return true;
    }
    const familyResolution = resolutionState.families[candidate.questionFamilyId];
    if (
      input.previousQuestion?.questionFamilyId &&
      candidate.questionFamilyId === input.previousQuestion.questionFamilyId &&
      (familyResolution?.status === "resolved" || familyResolution?.status === "narrowed")
    ) {
      return false;
    }
    return familyResolution?.status !== "resolved";
  });
  const questionCandidates = rerankQuestionCandidates({
    questionCandidates: unresolvedCandidates,
    previousQuestion: input.previousQuestion,
    answerAlignment,
  });
  const { selectedQuestion, planningStrategy } = selectQuestionCandidate({
    questionCandidates,
    previousQuestion: input.previousQuestion,
    answerAlignment,
  });
  const { comparisonCandidates, retrievalMatches } = deriveSlotDrivenComparisonCandidates({
    queryText: input.queryText,
    queryRoute: input.queryRoute,
    interpretation: input.interpretation,
    retrievalLayer: input.retrievalLayer,
  });

  if (!selectedQuestion) {
    return {
      questionCandidates,
      questionPlan: undefined,
      displayPlan: buildDisplayPlan({
        queryText: input.queryText,
        queryRoute: input.queryRoute,
        interpretation: input.interpretation,
        semanticCanvas: input.bridge.semanticCanvas,
        hitFields: input.hitFields,
        answerAlignment,
        comparisonCandidates,
        retrievalMatches,
        comparisonSelections: input.comparisonSelections,
      }),
      resolutionState,
    };
  }

  return {
    questionCandidates,
    displayPlan: buildDisplayPlan({
      queryText: input.queryText,
      queryRoute: input.queryRoute,
      interpretation: input.interpretation,
      semanticCanvas: input.bridge.semanticCanvas,
      hitFields: input.hitFields,
      selectedQuestion,
      answerAlignment,
      comparisonCandidates,
      retrievalMatches,
      comparisonSelections: input.comparisonSelections,
    }),
    resolutionState,
    questionPlan: {
      selectedGapId: selectedQuestion.resolvesGapIds[0],
      primaryTargetType: selectedQuestion.targetType,
      primaryTargetRef: selectedQuestion.targetRef,
      selectedTargetField: selectedQuestion.targetField,
      selectedTargetSlot: selectedQuestion.targetSlot,
      selectedTargetAxes: selectedQuestion.targetAxes,
      selectedQuestion,
      whyThisQuestion: `${selectedQuestion.questionWhy} ${selectedQuestion.expectedInformationGain}`.trim(),
      blockedBy: [],
      deferredTargets: questionCandidates.slice(1).map((item) => item.targetRef),
      answerAlignment,
      planningStrategy,
      resolutionState,
      latestResolution: resolution,
    },
  };
}
