import type {
  EntryAgentAxisHints,
  EntryAgentStatePatch,
  FieldAmbiguity,
  InterpretationCandidate,
  InterpretationMergeResult,
} from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function mergeAxisHints(target: EntryAgentAxisHints, source: EntryAgentAxisHints) {
  (Object.keys(source) as Array<keyof EntryAgentAxisHints>).forEach((slot) => {
    const slotHints = source[slot];
    if (!slotHints) {
      return;
    }

    const current = target[slot] ?? {};
    const next: Record<string, number> = { ...current } as Record<string, number>;

    Object.entries(slotHints).forEach(([axis, value]) => {
      if (typeof value !== "number") {
        return;
      }

      const currentValue = next[axis];
      next[axis] = currentValue === undefined ? clamp01(value) : clamp01(Math.max(currentValue, value));
    });

    target[slot] = next as never;
  });
}

function mergePatch(target: EntryAgentStatePatch, source: EntryAgentStatePatch) {
  (Object.keys(source) as Array<keyof EntryAgentStatePatch>).forEach((slot) => {
    const slotPatch = source[slot];
    if (!slotPatch) {
      return;
    }

    const current = target[slot] ?? {};
    const next: Record<string, number> = { ...current } as Record<string, number>;

    Object.entries(slotPatch).forEach(([axis, value]) => {
      if (typeof value !== "number") {
        return;
      }

      next[axis] = Number(((next[axis] ?? 0) + value).toFixed(3));
    });

    target[slot] = next as never;
  });
}

function mergeSemanticHints(
  target: Record<string, string | string[]>,
  source: Record<string, string | string[]> | undefined,
) {
  if (!source) {
    return;
  }

  Object.entries(source).forEach(([key, value]) => {
    const existing = target[key];

    if (existing === undefined) {
      target[key] = value;
      return;
    }

    const nextValues = new Set<string>([
      ...(Array.isArray(existing) ? existing : [existing]),
      ...(Array.isArray(value) ? value : [value]),
    ]);
    target[key] = [...nextValues];
  });
}

function buildAmbiguityNote(candidate: InterpretationCandidate): FieldAmbiguity | null {
  if (!candidate.note) {
    return null;
  }

  return {
    field: candidate.field,
    note: candidate.note,
    candidateAxes: candidate.axisHints,
  };
}

export function reduceMergeResultToState(input: {
  interpretationMerge: InterpretationMergeResult;
  baseAmbiguities?: FieldAmbiguity[];
}): {
  provisionalStateHints: Record<string, string | string[]>;
  ambiguities: FieldAmbiguity[];
  axisHints: EntryAgentAxisHints;
  statePatch: EntryAgentStatePatch;
} {
  const provisionalStateHints: Record<string, string | string[]> = {};
  const axisHints: EntryAgentAxisHints = {};
  const statePatch: EntryAgentStatePatch = {};
  const ambiguities = [...(input.baseAmbiguities ?? [])];

  input.interpretationMerge.finalResolvedReadings.forEach((reading) => {
    mergeSemanticHints(provisionalStateHints, reading.semanticHints);
    mergeAxisHints(axisHints, reading.axisHints);
    mergePatch(statePatch, reading.patchIntent);
  });

  input.interpretationMerge.suppressedReadings.forEach((decision) => {
    const suppressed = input.interpretationMerge.candidateReadings.find((candidate) => candidate.id === decision.readingId);

    if (!suppressed || (suppressed.sourceType !== "fallback-candidate" && decision.mergeRelation !== "conflict")) {
      return;
    }

    const ambiguity = buildAmbiguityNote(suppressed);
    if (ambiguity) {
      ambiguities.push(ambiguity);
    }
  });

  return {
    provisionalStateHints,
    ambiguities,
    axisHints,
    statePatch,
  };
}
