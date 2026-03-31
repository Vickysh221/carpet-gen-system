import { backendLlmFallbackProvider, type LlmFallbackProvider } from "./llmFallbackAdapter";
import type {
  EntryAgentDetectionResult,
  EntryAgentInput,
  FallbackCandidateSet,
  InterpretationCandidate,
  PrototypeMatch,
} from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function roundDelta(value: number) {
  return Number(value.toFixed(3));
}

function inferPrimarySlot(candidateAxisHints: Record<string, Record<string, number>>) {
  const entries = Object.entries(candidateAxisHints);
  if (entries.length === 0) {
    return "impression" as const;
  }

  return entries.sort((left, right) => Object.keys(right[1]).length - Object.keys(left[1]).length)[0][0] as
    | "color"
    | "motif"
    | "arrangement"
    | "impression";
}

function inferSecondarySlots(primarySlot: "color" | "motif" | "arrangement" | "impression", candidateAxisHints: Record<string, Record<string, number>>) {
  return Object.keys(candidateAxisHints)
    .filter((slot) => slot !== primarySlot)
    .slice(0, 3) as Array<"color" | "motif" | "arrangement" | "impression">;
}

function buildPatchIntentFromAxisHints(candidateAxisHints: Record<string, Record<string, number>>) {
  const patchIntent: InterpretationCandidate["patchIntent"] = {};

  Object.entries(candidateAxisHints).forEach(([slot, axes]) => {
    const slotPatch: Record<string, number> = {};
    Object.entries(axes).forEach(([axis, value]) => {
      slotPatch[axis] = roundDelta((value - 0.5) * 0.2);
    });

    if (Object.keys(slotPatch).length > 0) {
      patchIntent[slot as keyof InterpretationCandidate["patchIntent"]] = slotPatch as never;
    }
  });

  return patchIntent;
}

function mapLlmCandidateToInterpretationCandidate(input: {
  item: {
    candidatePrototypes: string[];
    candidateFields: string[];
    candidateAxisHints: Record<string, Record<string, number>>;
    ambiguityNotes: string[];
    needsFollowUp: boolean;
  };
  index: number;
  text: string;
}): InterpretationCandidate | null {
  const field = input.item.candidateFields[0];
  if (
    field !== "spaceContext" &&
    field !== "overallImpression" &&
    field !== "colorMood" &&
    field !== "patternTendency" &&
    field !== "arrangementTendency"
  ) {
    return null;
  }

  const primarySlot = inferPrimarySlot(input.item.candidateAxisHints);
  const secondarySlots = inferSecondarySlots(primarySlot, input.item.candidateAxisHints);

  return {
    id: `llm-fallback:${input.index}:${field}`,
    label: input.item.candidatePrototypes.join(" / ") || `llm fallback ${field}`,
    sourceType: "fallback-candidate",
    sourceId: "llm-fallback",
    field,
    primarySlot,
    secondarySlots,
    polarity: "mixed",
    strength: 0.32,
    confidence: 0.28,
    matchedCues: input.item.candidatePrototypes.length > 0 ? input.item.candidatePrototypes : [input.text],
    axisHints: input.item.candidateAxisHints as InterpretationCandidate["axisHints"],
    patchIntent: buildPatchIntentFromAxisHints(input.item.candidateAxisHints),
    note: input.item.ambiguityNotes[0] ?? (input.item.needsFollowUp ? "LLM fallback 建议继续 follow-up 确认。" : "LLM fallback 提供了一个弱候选解释。"),
  };
}

function shouldTriggerLlmFallback(input: {
  text: string;
  detection: EntryAgentDetectionResult;
  directCandidates: InterpretationCandidate[];
  prototypeMatches: PrototypeMatch[];
  prototypeCandidates: InterpretationCandidate[];
}) {
  const reasons: string[] = [];
  const normalized = normalizeText(input.text);
  const topPrototypeConfidence = input.prototypeMatches.length > 0 ? Math.max(...input.prototypeMatches.map((item) => item.confidence)) : 0;

  if (normalized.length >= 4 && input.directCandidates.length === 0 && input.prototypeCandidates.length === 0) {
    reasons.push("输入有语义内容，但 direct / prototype 解释层均未产出候选。");
  }

  if (input.directCandidates.length === 0 && input.prototypeCandidates.length === 0) {
    reasons.push("direct / prototype 都没有形成候选解释。");
  }

  if (input.prototypeMatches.length === 0) {
    reasons.push("prototype retrieval 没有明显命中。");
  } else if (topPrototypeConfidence < 0.62) {
    reasons.push("prototype retrieval 命中较弱，仍然缺少稳定解释。");
  }

  return {
    triggered: reasons.length > 0,
    reasons,
  };
}

export async function buildFallbackCandidateSet(
  input: Pick<EntryAgentInput, "text"> & {
    detection: EntryAgentDetectionResult;
    directCandidates: InterpretationCandidate[];
    prototypeMatches: PrototypeMatch[];
    prototypeCandidates: InterpretationCandidate[];
  },
  provider: LlmFallbackProvider = backendLlmFallbackProvider,
): Promise<FallbackCandidateSet> {
  const text = normalizeText(input.text);
  const reasons: string[] = [];
  const candidates: InterpretationCandidate[] = [];

  if (text.includes("不要太花") || text.includes("别太花")) {
    reasons.push("direct hit 存在颜色 restraint 的次解释，需要补充 candidate 供 merge 裁决。");
    candidates.push({
      id: "fallback:not-too-floral-color-restraint",
      label: "不要太花 -> color restraint",
      sourceType: "fallback-candidate",
      sourceId: "fallback:not-too-floral",
      field: "patternTendency",
      primarySlot: "color",
      secondarySlots: ["motif"],
      polarity: "decrease",
      strength: 0.48,
      confidence: 0.34,
      matchedCues: text.includes("不要太花") ? ["不要太花"] : ["别太花"],
      semanticHints: {
        colorMood: "restrained",
      },
      axisHints: {
        color: { saturation: 0.38 },
      },
      patchIntent: {
        color: { saturation: -0.08 },
      },
      note: "“不要太花”也可能是在说颜色别太跳，fallback 只补充这一候选，不直接进入最终 patch。",
    });
  }

  const weakCoverage = shouldTriggerLlmFallback({
    text: input.text,
    detection: input.detection,
    directCandidates: input.directCandidates,
    prototypeMatches: input.prototypeMatches,
    prototypeCandidates: input.prototypeCandidates,
  });

  if (weakCoverage.triggered) {
    const response = await provider.generate({
      text: input.text,
      hitFields: input.detection.hitFields,
      prototypeLabels: input.prototypeMatches.map((item) => item.label),
      triggerReasons: weakCoverage.reasons,
      topK: 2,
    });

    if (response.items.length > 0) {
      reasons.push(...weakCoverage.reasons);
      response.items.forEach((item, index) => {
        const candidate = mapLlmCandidateToInterpretationCandidate({
          item,
          index,
          text,
        });
        if (candidate) {
          candidates.push(candidate);
        }
      });
    }
  }

  return {
    triggered: reasons.length > 0,
    reasons,
    candidates,
  };
}
