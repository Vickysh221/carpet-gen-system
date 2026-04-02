import {
  createIntentIntakeAgentState,
  updateAgentStateFromSignal,
  buildDerivedEntryAnalysisFromAgentState,
  OPENING_OPTION_INDEX,
} from "@/features/entryAgent";
import { buildVisualIntentCompiler } from "../visualIntentCompiler";
import { buildVisualIntentTestBundle } from "../visualIntentTestBundle";
import { buildMidjourneyPrompt } from "../promptAdapters";

async function runCase(label: string, turns: string[]) {
  let state = createIntentIntakeAgentState();

  for (const [index, text] of turns.entries()) {
    state = await updateAgentStateFromSignal({
      type: "text",
      text,
      turnIndex: index + 1,
      source: "user",
    }, state);
  }

  const analysis = state.latestAnalysis ?? buildDerivedEntryAnalysisFromAgentState(state);
  const pkg = buildVisualIntentCompiler({
    analysis,
    freeTextInputs: turns,
    turnHistory: turns.map((text, index) => ({
      turnIndex: index + 1,
      text,
      source: "text" as const,
    })),
  });
  const bundle = buildVisualIntentTestBundle(pkg);

  return {
    label,
    canonicalState: pkg.canonicalState,
    compiledPackage: pkg,
    testBundle: bundle,
    midjourneyPrompt: buildMidjourneyPrompt(bundle.semanticSpec),
  };
}

async function runOpeningCase(label: string, selections: string[]) {
  let state = createIntentIntakeAgentState();
  state = await updateAgentStateFromSignal({
    type: "opening-selection",
    selections,
    turnIndex: 1,
    source: "user",
  }, state);

  const analysis = state.latestAnalysis ?? buildDerivedEntryAnalysisFromAgentState(state);
  const selectedOptions = selections.map((id) => {
    const option = OPENING_OPTION_INDEX.get(id);
    return {
      questionId: option?.family ?? "opening",
      optionId: id,
      label: option?.label ?? id,
    };
  });
  const pkg = buildVisualIntentCompiler({
    analysis,
    selectedOptions,
    turnHistory: selectedOptions.map((option, index) => ({
      turnIndex: index + 1,
      text: option.label,
      source: "opening-selection" as const,
    })),
  });
  const bundle = buildVisualIntentTestBundle(pkg);

  return {
    label,
    canonicalState: pkg.canonicalState,
    compiledPackage: pkg,
    testBundle: bundle,
    midjourneyPrompt: buildMidjourneyPrompt(bundle.semanticSpec),
  };
}

async function main() {
  const cases = await Promise.all([
    runCase("Case A", ["自然", "烟雨三月", "水汽流动感"]),
    runCase("Case B", ["不要太花", "像竹影", "想被看见一点"]),
    runCase("Case C", ["月白", "带一点灯火", "不要太亮"]),
    runOpeningCase("Case D", ["pattern-floral-accent"]),
    runCase("Case E", ["葡萄", "不要太写实"]),
    runCase("Case F", ["贝壳", "更抽象一点"]),
  ]);

  for (const result of cases) {
    console.log(`\n=== ${result.label} ===`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
