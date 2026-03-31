import { PROTOTYPE_REGISTRY } from "./prototypeRegistry";
import { backendPrototypeRetrievalProvider, type PrototypeRetrievalProvider } from "./prototypeRetrievalAdapter";
import type {
  EntryAgentDetectionResult,
  EntryAgentInput,
  InterpretationCandidate,
  PrototypeMatch,
  PrototypeRetrievalEvidence,
  PrototypeRouteType,
  SemanticUnit,
} from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function buildCandidateId(prototypeId: string, readingId: string) {
  return `prototype:${prototypeId}:${readingId}`;
}

function computeAliasScore(aliasCount: number) {
  if (aliasCount === 0) {
    return 0;
  }
  return Math.min(0.92, 0.58 + aliasCount * 0.14);
}

function normalizeRetrievalScore(score: number) {
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

function getFieldCompatibilityScore(routeType: PrototypeRouteType, fieldMatched: boolean) {
  if (fieldMatched) {
    return 1;
  }
  return routeType === "prototype-first" ? 0.65 : 0;
}

function passesRouteTypeGate(input: {
  routeType: PrototypeRouteType;
  aliasScore: number;
  retrievalScore: number;
}): boolean {
  if (input.routeType === "prototype-first") {
    return input.aliasScore >= 0.58 || input.retrievalScore >= 0.66;
  }

  if (input.routeType === "dual-route") {
    return input.aliasScore >= 0.52 || input.retrievalScore >= 0.74;
  }

  return input.aliasScore >= 0.58 || input.retrievalScore >= 0.82;
}

function computeCombinedScore(input: {
  aliasScore: number;
  retrievalScore: number;
  fieldCompatibility: number;
}) {
  if (input.aliasScore <= 0) {
    return 0.8 * input.retrievalScore + 0.2 * input.fieldCompatibility;
  }

  return 0.55 * input.aliasScore + 0.35 * input.retrievalScore + 0.1 * input.fieldCompatibility;
}

function buildRetrievalEvidence(matches: Array<{ entryId: string; label: string; score: number; explainText: string; matchedText: string }>): PrototypeRetrievalEvidence[] {
  return matches.slice(0, 2).map((item) => ({
    entryId: item.entryId,
    entryLabel: item.label,
    matchedText: item.matchedText,
    similarityScore: item.score,
    scoreLabel: `${Math.round(item.score * 100)}% semantic similarity`,
    explainText: item.explainText,
  }));
}

export async function resolvePrototypeCandidates(
  input: Pick<EntryAgentInput, "text">,
  detection: EntryAgentDetectionResult,
  semanticUnits: SemanticUnit[] = [],
  provider: PrototypeRetrievalProvider = backendPrototypeRetrievalProvider,
): Promise<{
  prototypeMatches: PrototypeMatch[];
  candidates: InterpretationCandidate[];
}> {
  const text = normalizeText(input.text);
  const prototypeMatches: PrototypeMatch[] = [];
  const candidates: InterpretationCandidate[] = [];
  const retrievalQueryUnits = semanticUnits.filter((unit) => unit.routeHint === "prototype" || unit.routeHint === "retrieval-entry");
  const retrievalQueries = retrievalQueryUnits.length > 0 ? retrievalQueryUnits.map((unit) => unit.cue) : [text];
  const retrievalHitGroups = await Promise.all(retrievalQueries.map((query) => provider.search({ text: query, topK: 5 })));
  const retrievalHits = retrievalHitGroups.flat();

  PROTOTYPE_REGISTRY.forEach((prototype) => {
    const matchedAliases = prototype.aliases.filter((alias) => text.includes(alias));
    const matchedUnits = semanticUnits.filter((unit) => prototype.aliases.some((alias) => unit.cue.includes(alias) || alias.includes(unit.cue)));
    const aliasScore = computeAliasScore(matchedAliases.length);

    const prototypeRetrievalHits = retrievalHits
      .filter((hit) => hit.prototypeId === prototype.id)
      .map((hit) => ({
        entryId: hit.entryId,
        label: hit.label,
        score: normalizeRetrievalScore(hit.similarityScore),
        explainText: hit.explainText,
        matchedText: text,
        fieldMatched: hit.field === prototype.readings[0]?.field,
      }));
    const retrievalScore = prototypeRetrievalHits.length > 0 ? Math.max(...prototypeRetrievalHits.map((hit) => hit.score)) : 0;
    const fieldCompatibility = getFieldCompatibilityScore(
      prototype.routeType,
      prototype.readings.some((reading) => detection.hitFields.includes(reading.field)),
    );

    if (!passesRouteTypeGate({ routeType: prototype.routeType, aliasScore, retrievalScore })) {
      return;
    }

    if (fieldCompatibility <= 0) {
      return;
    }

    const combinedScore = computeCombinedScore({
      aliasScore,
      retrievalScore,
      fieldCompatibility,
    });

    if (combinedScore < 0.56) {
      return;
    }

    const candidateIds: string[] = [];

    prototype.readings.forEach((reading) => {
      if (!detection.hitFields.includes(reading.field) && prototype.routeType !== "prototype-first") {
        return;
      }

      const candidateId = buildCandidateId(prototype.id, reading.id);
      candidateIds.push(candidateId);
      const sourceUnitIds = matchedUnits.map((unit) => unit.id);
      const inheritedQuestionKind = matchedUnits[0]?.questionKindHint ?? prototype.defaultQuestionKindHint;
      const inheritedAxes = matchedUnits[0]?.disambiguationAxes ?? prototype.defaultDisambiguationAxes;
      const inheritedOwnership = matchedUnits[0]?.ownershipClass ?? prototype.defaultOwnershipClass;
      const inheritedGainHint = matchedUnits[0]?.informationGainHint ?? prototype.defaultInformationGainHint;
      candidates.push({
        id: candidateId,
        label: reading.label,
        sourceType: "prototype",
        sourceId: prototype.id,
        field: reading.field,
        primarySlot: reading.primarySlot,
        secondarySlots: reading.secondarySlots,
        polarity: reading.polarity,
        strength: reading.strength,
        confidence: Number(Math.max(reading.confidence, combinedScore).toFixed(2)),
        matchedCues: matchedAliases.length > 0 ? matchedAliases : prototypeRetrievalHits.map((hit) => hit.label),
        semanticHints: reading.semanticHints,
        axisHints: reading.axisHints,
        patchIntent: reading.patchIntent,
        matchedSemanticUnitIds: sourceUnitIds.length > 0 ? sourceUnitIds : undefined,
        ownershipClass: inheritedOwnership,
        questionKindHint: inheritedQuestionKind,
        disambiguationAxes: inheritedAxes,
        informationGainHint: inheritedGainHint,
        note: reading.note,
      });
    });

    if (candidateIds.length === 0) {
      return;
    }

    prototypeMatches.push({
      prototypeId: prototype.id,
      label: prototype.label,
      routeType: prototype.routeType,
      confidence: Number(combinedScore.toFixed(2)),
      matchedAliases,
      matchMode:
        matchedAliases.length > 0 && prototypeRetrievalHits.length > 0
          ? "alias+retrieval"
          : matchedAliases.length > 0
            ? "alias"
            : "retrieval-only",
      aliasScore: Number(aliasScore.toFixed(2)),
      retrievalScore: Number(retrievalScore.toFixed(2)),
      rationale: prototype.rationale,
      candidateIds,
      retrievalEvidence: buildRetrievalEvidence(prototypeRetrievalHits),
    });
  });

  return {
    prototypeMatches,
    candidates,
  };
}
