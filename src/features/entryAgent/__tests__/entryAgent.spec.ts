import { analyzeEntryText } from "../index";
import { ENTRY_AGENT_FIXTURES } from "./fixtures";

function readPath(record: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, record);
}

export async function buildEntryAgentSpecCases() {
  return Promise.all(ENTRY_AGENT_FIXTURES.map(async (fixture) => {
    const result = await analyzeEntryText(fixture.input);

    return {
      name: fixture.name,
      result,
      checks: {
        hitFieldsMatch:
          fixture.expectation.hitFields === undefined ||
          fixture.expectation.hitFields.every((field) => result.hitFields.includes(field)),
        slotStatesMatch:
          fixture.expectation.updatedSlotStates === undefined ||
          Object.entries(fixture.expectation.updatedSlotStates).every(
            ([field, state]) => result.updatedSlotStates[field as keyof typeof result.updatedSlotStates] === state,
          ),
        qaModeMatch:
          fixture.expectation.suggestedQaMode === undefined ||
          result.suggestedQaMode === fixture.expectation.suggestedQaMode,
        ambiguityMatch:
          fixture.expectation.ambiguityIncludes === undefined ||
          fixture.expectation.ambiguityIncludes.every((needle) =>
            result.ambiguities.some((item) => item.note.includes(needle)),
          ),
        axisHintsMatch:
          fixture.expectation.requiredAxisHints === undefined ||
          fixture.expectation.requiredAxisHints.every((path) => readPath(result.axisHints as Record<string, unknown>, path) !== undefined),
        weakBiasMatch:
          fixture.expectation.requiredWeakBiasSources === undefined ||
          fixture.expectation.requiredWeakBiasSources.every((source) =>
            result.weakBiasHints.some((item) => item.source === source),
          ),
        patchMatch:
          fixture.expectation.requiredPatchPaths === undefined ||
          fixture.expectation.requiredPatchPaths.every((path) => readPath(result.statePatch as Record<string, unknown>, path) !== undefined),
        semanticHintsMatch:
          fixture.expectation.requiredSemanticHints === undefined ||
          fixture.expectation.requiredSemanticHints.every((key) => result.provisionalStateHints[key] !== undefined),
        prototypeMatch:
          fixture.expectation.requiredPrototypeMatches === undefined ||
          fixture.expectation.requiredPrototypeMatches.every((prototypeId) =>
            result.interpretationMerge.prototypeMatches.some((item) => item.prototypeId === prototypeId),
          ),
        keptReadingMatch:
          fixture.expectation.requiredKeptReadings === undefined ||
          fixture.expectation.requiredKeptReadings.every((readingId) =>
            result.interpretationMerge.keptReadings.some((item) => item.readingId === readingId),
          ),
        suppressedReadingMatch:
          fixture.expectation.requiredSuppressedReadings === undefined ||
          fixture.expectation.requiredSuppressedReadings.every((readingId) =>
            result.interpretationMerge.suppressedReadings.some((item) => item.readingId === readingId),
          ),
        mergeRelationMatch:
          fixture.expectation.requiredMergeRelations === undefined ||
          fixture.expectation.requiredMergeRelations.every((relation) =>
            result.interpretationMerge.mergeGroups.some((item) => item.relation === relation),
          ),
        fallbackMatch:
          fixture.expectation.fallbackTriggered === undefined ||
          result.interpretationMerge.fallback.triggered === fixture.expectation.fallbackTriggered,
        semanticNarrativeMatch: typeof result.semanticUnderstanding.narrative === "string" && result.semanticUnderstanding.narrative.length > 0,
        semanticGapMatch:
          fixture.expectation.requiredSemanticGapTypes === undefined ||
          fixture.expectation.requiredSemanticGapTypes.every((type) =>
            result.semanticGaps.some((item) => item.type === type),
          ),
        questionPlanMatch:
          fixture.expectation.questionIntent === undefined ||
          result.questionPlan?.selectedQuestion.questionIntent === fixture.expectation.questionIntent,
      },
    };
  }));
}

export async function buildEntryAgentSpecSummary() {
  const cases = await buildEntryAgentSpecCases();
  return cases.map((item) => ({
    name: item.name,
    pass: Object.values(item.checks).every(Boolean),
    checks: item.checks,
  }));
}
