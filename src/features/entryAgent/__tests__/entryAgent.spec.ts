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

export const ENTRY_AGENT_SPEC_CASES = ENTRY_AGENT_FIXTURES.map((fixture) => {
  const result = analyzeEntryText(fixture.input);

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
    },
  };
});

export const ENTRY_AGENT_SPEC_SUMMARY = ENTRY_AGENT_SPEC_CASES.map((item) => ({
  name: item.name,
  pass: Object.values(item.checks).every(Boolean),
  checks: item.checks,
}));
