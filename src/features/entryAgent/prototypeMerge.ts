import type {
  FallbackCandidateSet,
  InterpretationCandidate,
  InterpretationMergeResult,
  MergeDecisionGroup,
  MergeRelation,
  PrototypeMatch,
  ReadingDecision,
} from "./types";

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function relationFromCandidates(primary: InterpretationCandidate, secondary: InterpretationCandidate): MergeRelation {
  if (primary.primarySlot !== secondary.primarySlot) {
    return "refinement";
  }

  if (primary.polarity !== secondary.polarity) {
    const strengthDelta = Math.abs(primary.strength - secondary.strength);
    if (strengthDelta <= 0.16) {
      return "conflict";
    }
  }

  return "reinforcement";
}

function buildDecision(readingId: string, status: "kept" | "suppressed", mergeRelation: MergeRelation, reason: string, suppressedByReadingId?: string): ReadingDecision {
  return {
    readingId,
    status,
    mergeRelation,
    reason,
    suppressedByReadingId,
  };
}

export function mergeInterpretationCandidates(input: {
  directCandidates: InterpretationCandidate[];
  prototypeMatches: PrototypeMatch[];
  prototypeCandidates: InterpretationCandidate[];
  fallback: FallbackCandidateSet;
}): InterpretationMergeResult {
  const { directCandidates, prototypeMatches, prototypeCandidates, fallback } = input;
  const candidateReadings = [...directCandidates, ...prototypeCandidates, ...fallback.candidates];
  const mergeGroups: MergeDecisionGroup[] = [];
  const keptReadings: ReadingDecision[] = [];
  const suppressedReadings: ReadingDecision[] = [];
  const finalResolvedReadings: InterpretationCandidate[] = [];

  if (candidateReadings.length === 0) {
    return {
      directCandidates,
      prototypeMatches,
      candidateReadings,
      mergeGroups,
      keptReadings,
      suppressedReadings,
      finalResolvedReadings,
      fallback,
    };
  }

  const sorted = [...candidateReadings].sort((left, right) => {
    if (right.strength !== left.strength) {
      return right.strength - left.strength;
    }

    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }

    const sourceRank = { direct: 3, prototype: 2, "fallback-candidate": 1 } as const;
    return sourceRank[right.sourceType] - sourceRank[left.sourceType];
  });

  const hasNonFallbackCandidate = sorted.some((c) => c.sourceType !== "fallback-candidate");
  const primary = sorted[0];
  const keptIds = new Set<string>([primary.id]);
  finalResolvedReadings.push(primary);

  keptReadings.push(
    buildDecision(
      primary.id,
      "kept",
      prototypeCandidates.length > 0 && directCandidates.length === 0 ? "reinforcement" : "refinement",
      primary.sourceType === "fallback-candidate"
        ? "无 direct/prototype 候选，LLM fallback 成为唯一主解释。"
        : primary.sourceType === "prototype"
          ? "prototype reading 成为当前主解释。"
          : "direct reading 成为当前主解释。",
    ),
  );

  sorted.slice(1).forEach((candidate) => {
    const relation = relationFromCandidates(primary, candidate);
    const sameSlot = candidate.primarySlot === primary.primarySlot;
    const sameDirection = candidate.polarity === primary.polarity;
    const shouldKeepAsSecondary = relation === "refinement" && candidate.confidence >= 0.45 && !keptIds.has(candidate.id);
    const shouldSuppress =
      (candidate.sourceType === "fallback-candidate" && hasNonFallbackCandidate) ||
      relation === "conflict" ||
      (sameSlot && !sameDirection) ||
      (sameSlot && candidate.strength < primary.strength);

    if (shouldKeepAsSecondary && !shouldSuppress) {
      keptIds.add(candidate.id);
      finalResolvedReadings.push(candidate);
      keptReadings.push(
        buildDecision(candidate.id, "kept", relation, "保留为次槽位或补充 reading，与主解释共存。"),
      );
    } else {
      suppressedReadings.push(
        buildDecision(
          candidate.id,
          "suppressed",
          relation,
          relation === "conflict"
            ? "与主解释在同一主槽位上形成冲突，当前降为 suppressed。"
            : candidate.sourceType === "fallback-candidate"
              ? "fallback 只补 candidate，不直接进入最终 patch。"
              : "在当前主解释下被抑制为次要 reading。",
          primary.id,
        ),
      );
    }

    mergeGroups.push({
      id: `merge:${primary.id}:${candidate.id}`,
      relation,
      primarySlot: primary.primarySlot,
      participatingReadingIds: [primary.id, candidate.id],
      keptReadingIds: unique(
        [primary.id, shouldKeepAsSecondary && !shouldSuppress ? candidate.id : undefined].filter(Boolean) as string[],
      ),
      suppressedReadingIds: shouldKeepAsSecondary && !shouldSuppress ? [] : [candidate.id],
      decision:
        relation === "conflict"
          ? "同主槽位冲突，主解释保留，次解释抑制并建议 follow-up。"
          : shouldKeepAsSecondary && !shouldSuppress
            ? "主槽位保留，次槽位共存。"
            : "主解释保留，次解释抑制。",
      confidence: Number(Math.max(primary.confidence, candidate.confidence).toFixed(2)),
      followUpRequired: relation === "conflict",
    });
  });

  return {
    directCandidates,
    prototypeMatches,
    candidateReadings,
    mergeGroups,
    keptReadings,
    suppressedReadings,
    finalResolvedReadings,
    fallback,
  };
}
