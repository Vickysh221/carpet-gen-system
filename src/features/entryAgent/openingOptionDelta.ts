import { createIntentIntakeAgentState } from "./agentRuntime";
import { OPENING_OPTION_INDEX } from "./openingOptionRegistry";
import type { IntentIntakeAgentState, IntakeMacroSlot, IntakeSlotProgress, MacroSlotState } from "./types";
import type {
  OpeningFamily,
  OpeningOptionDefinition,
  OpeningParameterDelta,
  OpeningPatchSlot,
  OpeningSelectionResult,
  OpeningSlotPatch,
  OpeningTargetSlot,
} from "./openingOptionsTypes";

const DELTA_SLOTS: OpeningPatchSlot[] = ["impression", "color", "pattern", "arrangement", "space", "presence"];

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function mapDeltaSlotKey(slot: OpeningPatchSlot) {
  if (slot === "pattern") return "patternIntent" as const;
  return slot;
}

function mapTargetSlotToAgentSlot(slot: OpeningTargetSlot): IntakeMacroSlot | undefined {
  if (slot === "patternIntent") return "pattern";
  if (slot === "impression" || slot === "color" || slot === "arrangement" || slot === "space") return slot;
  return undefined;
}

function resolveSelections(input: Array<string | OpeningOptionDefinition>) {
  return input.map((item) => {
    if (typeof item !== "string") return item;
    const found = OPENING_OPTION_INDEX.get(item);
    if (!found) {
      throw new Error(`Unknown opening option id: ${item}`);
    }
    return found;
  });
}

function aggregateSlotDelta(
  options: OpeningOptionDefinition[],
  slot: OpeningPatchSlot,
): Record<string, number> {
  const slotKey = mapDeltaSlotKey(slot);
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const option of options) {
    const slotDelta = option.parameterDelta[slotKey];
    if (!slotDelta) continue;
    for (const [axis, value] of Object.entries(slotDelta)) {
      totals.set(axis, (totals.get(axis) ?? 0) + value);
      counts.set(axis, (counts.get(axis) ?? 0) + 1);
    }
  }

  return [...totals.entries()].reduce<Record<string, number>>((acc, [axis, total]) => {
    acc[axis] = clamp(total / Math.max(1, counts.get(axis) ?? 1));
    return acc;
  }, {});
}

function aggregateParameterDelta(options: OpeningOptionDefinition[]): OpeningParameterDelta {
  const aggregated: OpeningParameterDelta = {};
  for (const slot of DELTA_SLOTS) {
    const averaged = aggregateSlotDelta(options, slot);
    if (Object.keys(averaged).length === 0) continue;
    aggregated[mapDeltaSlotKey(slot)] = averaged;
  }
  return aggregated;
}

function buildSuggestedTargets(options: OpeningOptionDefinition[]) {
  return [...new Set(options.flatMap((option) => option.suggestedNextTargets ?? []))];
}

function scorePatch(delta: Record<string, number>) {
  const values = Object.values(delta);
  if (values.length === 0) return 0;
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildOpeningSlotPatches(options: OpeningOptionDefinition[]): OpeningSlotPatch[] {
  const suggestedNextTargets = buildSuggestedTargets(options);
  return DELTA_SLOTS.flatMap((slot) => {
    const parameterDelta = aggregateSlotDelta(options, slot);
    if (Object.keys(parameterDelta).length === 0) return [];
    return [{
      slot,
      parameterDelta,
      topCandidateLabel: options.map((option) => option.label).join(" + "),
      score: scorePatch(parameterDelta),
      supportingOptionIds: options.map((option) => option.id),
      suggestedNextTargets,
    }];
  });
}

function applyPatchToMacroSlotState(currentSlot: MacroSlotState, patch: OpeningSlotPatch): MacroSlotState {
  const label = patch.topCandidateLabel;
  const existingCandidates = currentSlot.topCandidates.filter((candidate) => candidate.label !== label);
  return {
    ...currentSlot,
    status: currentSlot.status === "empty" ? "hinted" : currentSlot.status,
    recentTrend: "strengthening",
    lastUpdatedBy: "bootstrap",
    topCandidates: [
      {
        label,
        score: patch.score,
        evidence: patch.supportingOptionIds,
        sourceReadingIds: [],
      },
      ...existingCandidates,
    ].slice(0, 3),
    topDirection: currentSlot.topDirection ?? label,
    topScore: Math.max(currentSlot.topScore, patch.score),
    supportingSignals: [...new Set([...currentSlot.supportingSignals, ...patch.supportingOptionIds])],
    openBranches: [...new Set([...currentSlot.openBranches, ...patch.suggestedNextTargets])].slice(0, 4),
  };
}

function mapMacroStatusToGoalPhase(status: MacroSlotState["status"]): IntakeSlotProgress["phase"] {
  if (status === "soft-locked" || status === "lock-candidate") return "lock-candidate";
  if (status === "base-ready") return "base-captured";
  if (status === "hinted") return "hinted";
  return "empty";
}

function buildGoalStateFromOpeningSlots(slots: MacroSlotState[]): IntentIntakeAgentState["goalState"] {
  const progressSlots: IntakeSlotProgress[] = slots.map((slot) => {
    const phase = mapMacroStatusToGoalPhase(slot.status);
    return {
      slot: slot.slot,
      topDirection: slot.topDirection,
      topScore: slot.topScore,
      supportingSignals: slot.supportingSignals,
      isBaseCaptured: phase === "base-captured" || phase === "lock-candidate",
      phase,
      patternIntent: slot.patternIntent,
    };
  });

  const criticalSlots: IntakeMacroSlot[] = ["impression", "color", "pattern", "arrangement"];
  const missingSlots = progressSlots
    .filter((slot) => criticalSlots.includes(slot.slot) && !slot.isBaseCaptured)
    .map((slot) => slot.slot);
  const impression = progressSlots.find((slot) => slot.slot === "impression");
  const pattern = progressSlots.find((slot) => slot.slot === "pattern");
  const color = progressSlots.find((slot) => slot.slot === "color");
  const capturedCount = progressSlots.filter((slot) => criticalSlots.includes(slot.slot) && slot.isBaseCaptured).length;
  const readyForFirstGeneration =
    Boolean(impression?.isBaseCaptured && (pattern?.isBaseCaptured || color?.isBaseCaptured)) || capturedCount >= 3;

  return {
    slots: progressSlots,
    completed: missingSlots.length === 0,
    completionReason: missingSlots.length === 0 ? "opening priors already cover all critical macro slots" : undefined,
    missingSlots,
    readyForFirstGeneration,
    firstGenerationReason: readyForFirstGeneration ? "opening priors already form a usable base profile" : undefined,
    pendingConfirmations: [],
  };
}

function buildOpeningNextAction(input: {
  family: OpeningFamily | "mixed";
  suggestedNextTargets: OpeningTargetSlot[];
  previousState: IntentIntakeAgentState;
}) {
  if (input.suggestedNextTargets.length === 0) {
    return input.previousState.nextAction ?? {
      type: "hold" as const,
      reason: "opening 选项已注入初始 bias，等待后续 text signal 或下一步引导。",
    };
  }

  return {
    type: "hold" as const,
    reason: `opening ${input.family} 已注入初始 bias，建议下一步优先补 ${input.suggestedNextTargets.join(" / ")}。`,
    targetSlot: mapTargetSlotToAgentSlot(input.suggestedNextTargets[0]),
  };
}

export function applyOpeningSelectionToAgentState(input: {
  selections: Array<string | OpeningOptionDefinition>;
  currentState?: IntentIntakeAgentState;
}): OpeningSelectionResult {
  const currentState = createIntentIntakeAgentState(input.currentState);
  const selections = resolveSelections(input.selections);
  const aggregatedDelta = aggregateParameterDelta(selections);
  const slotPatches = buildOpeningSlotPatches(selections);
  const suggestedNextTargets = buildSuggestedTargets(selections);
  const updatedSlots = currentState.slots.map((slot) => {
    const patch = slotPatches.find((item) => item.slot === slot.slot);
    return patch ? applyPatchToMacroSlotState(slot, patch) : slot;
  });

  const updatedAgentState: IntentIntakeAgentState = {
    ...currentState,
    phase: currentState.phase === "idle" ? "text-intake-active" : currentState.phase,
    slots: updatedSlots,
    goalState: buildGoalStateFromOpeningSlots(updatedSlots),
    nextAction: buildOpeningNextAction({
      family: selections.length === 1 ? selections[0].family : "mixed",
      suggestedNextTargets,
      previousState: currentState,
    }),
  };

  return {
    selections,
    aggregatedDelta,
    slotPatches,
    suggestedNextTargets,
    updatedAgentState,
    appliedSlotUpdates: updatedSlots,
  };
}
