import type { EntryAgentInput, FallbackCandidateSet, InterpretationCandidate } from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

export function buildFallbackCandidateSet(input: Pick<EntryAgentInput, "text">): FallbackCandidateSet {
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

  return {
    triggered: reasons.length > 0,
    reasons,
    candidates,
  };
}
