import type { EntryAgentDetectionResult, InterpretationCandidate, EntryAgentInput } from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function buildDirectInterpretationCandidates(
  input: Pick<EntryAgentInput, "text">,
  detection: EntryAgentDetectionResult,
): InterpretationCandidate[] {
  const text = normalizeText(input.text);
  const candidates: InterpretationCandidate[] = [];

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
      note: "direct hit 先把“自然一点”解释为图案少一点几何感。",
    });
  }

  return candidates;
}
