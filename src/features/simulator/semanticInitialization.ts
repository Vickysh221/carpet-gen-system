import { createRandomBaseState } from "@/features/simulator/mockEngine";
import type { SimulatorState } from "@/features/simulator/types";
import type { EntryAgentResult, EntryAgentStatePatch } from "@/features/entryAgent";
import type { AppliedInitializationDelta, InitializationExplainabilityResult } from "@/features/simulator/explainability";

const MIN_AXIS_VALUE = 0.08;
const MAX_AXIS_VALUE = 0.92;

function clampAxisValue(value: number) {
  return Math.max(MIN_AXIS_VALUE, Math.min(MAX_AXIS_VALUE, value));
}

function cloneSimulatorState(state: SimulatorState): SimulatorState {
  return JSON.parse(JSON.stringify(state)) as SimulatorState;
}

function buildAxisPath(slotKey: string, axisKey: string) {
  return `${slotKey}.${axisKey}` as AppliedInitializationDelta["axisPath"];
}

function applyStatePatchWithExplainability(
  baseState: SimulatorState,
  statePatch: EntryAgentStatePatch,
): InitializationExplainabilityResult {
  const initialBase = cloneSimulatorState(baseState);
  const next = cloneSimulatorState(baseState);
  const appliedDeltaList: AppliedInitializationDelta[] = [];

  (Object.keys(statePatch) as Array<keyof EntryAgentStatePatch>).forEach((slotKey) => {
    const slotPatch = statePatch[slotKey];

    if (!slotPatch) {
      return;
    }

    (Object.keys(slotPatch) as string[]).forEach((axisKey) => {
      const delta = slotPatch[axisKey as keyof typeof slotPatch];

      if (typeof delta !== "number") {
        return;
      }

      const currentValue = next[slotKey][axisKey as keyof typeof next[typeof slotKey]];
      const before = Number(currentValue);
      const after = clampAxisValue(before + delta);

      next[slotKey][axisKey as keyof typeof next[typeof slotKey]] = after as never;
      appliedDeltaList.push({
        slot: slotKey,
        axis: axisKey as AppliedInitializationDelta["axis"],
        axisPath: buildAxisPath(slotKey, axisKey),
        delta: Number((after - before).toFixed(3)),
        before,
        after,
      });
    });
  });

  return {
    initialBase,
    finalBase: next,
    appliedDeltaList,
    statePatch: JSON.parse(JSON.stringify(statePatch)) as EntryAgentStatePatch,
  };
}

function applyStatePatch(
  baseState: SimulatorState,
  statePatch: EntryAgentStatePatch,
): SimulatorState {
  return applyStatePatchWithExplainability(baseState, statePatch).finalBase;
}

export function buildInitializationExplainability(
  analysis: Pick<EntryAgentResult, "statePatch">,
  baseState?: SimulatorState,
): InitializationExplainabilityResult {
  const nextBaseState = baseState ?? createRandomBaseState();
  const initialBase = cloneSimulatorState(nextBaseState);

  if (Object.keys(analysis.statePatch).length === 0) {
    return {
      initialBase,
      finalBase: initialBase,
      appliedDeltaList: [],
      statePatch: {},
    };
  }

  return applyStatePatchWithExplainability(nextBaseState, analysis.statePatch);
}

export function initializeBaseStateFromEntryAgent(
  analysis: Pick<EntryAgentResult, "statePatch">,
  baseState?: SimulatorState,
): SimulatorState {
  return buildInitializationExplainability(analysis, baseState).finalBase;
}
