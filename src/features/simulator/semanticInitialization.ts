import { createRandomBaseState } from "@/features/simulator/mockEngine";
import type { SimulatorState } from "@/features/simulator/types";
import type { EntryAgentResult, EntryAgentStatePatch } from "@/features/entryAgent";

const MIN_AXIS_VALUE = 0.08;
const MAX_AXIS_VALUE = 0.92;

function clampAxisValue(value: number) {
  return Math.max(MIN_AXIS_VALUE, Math.min(MAX_AXIS_VALUE, value));
}

function cloneSimulatorState(state: SimulatorState): SimulatorState {
  return JSON.parse(JSON.stringify(state)) as SimulatorState;
}

function applyStatePatch(
  baseState: SimulatorState,
  statePatch: EntryAgentStatePatch,
): SimulatorState {
  const next = cloneSimulatorState(baseState);

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
      next[slotKey][axisKey as keyof typeof next[typeof slotKey]] = clampAxisValue(
        Number(currentValue) + delta,
      ) as never;
    });
  });

  return next;
}

export function initializeBaseStateFromEntryAgent(
  analysis: Pick<EntryAgentResult, "statePatch">,
  baseState?: SimulatorState,
): SimulatorState {
  const nextBaseState = baseState ?? createRandomBaseState();

  if (Object.keys(analysis.statePatch).length === 0) {
    return nextBaseState;
  }

  return applyStatePatch(nextBaseState, analysis.statePatch);
}
