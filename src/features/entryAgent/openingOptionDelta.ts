import { createIntentIntakeAgentState } from "./agentRuntime";
import { OPENING_OPTION_INDEX } from "./openingOptionRegistry";
import type { IntentIntakeAgentState, IntakeMacroSlot, IntakeSlotProgress, MacroSlotState, PatternIntentState } from "./types";
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

function derivePatternIntentFromDelta(delta: Record<string, number>): PatternIntentState | undefined {
  if (Object.keys(delta).length === 0) {
    return undefined;
  }

  const geometry = delta.geometry ?? 0;
  const organic = delta.organic ?? 0;
  const abstraction = delta.abstraction ?? 0;
  const complexity = delta.complexity ?? 0;

  return {
    abstractionPreference: abstraction >= 0.66 ? "abstract" : abstraction >= 0.42 ? "semi-abstract" : "concrete",
    renderingMode:
      geometry >= 0.62
        ? "geometricized"
        : abstraction >= 0.58
          ? "suggestive"
          : "literal",
    motionFeeling:
      organic >= 0.68
        ? "flowing"
        : complexity <= 0.32
          ? "still"
          : undefined,
  };
}

function deriveOpeningDirectionLabel(slot: OpeningPatchSlot, delta: Record<string, number>, options: OpeningOptionDefinition[]) {
  if (slot === "impression") {
    if ((delta.calm ?? 0) >= 0.7) return "calm";
    if ((delta.warmth ?? 0) >= 0.72) return "warm";
    if ((delta.softness ?? 0) >= 0.66) return "soft";
    if ((delta.energy ?? 0) >= 0.68) return "energetic";
    return options[0]?.label;
  }

  if (slot === "color") {
    if ((delta.warmth ?? 0) >= 0.7) return "warm";
    if ((delta.saturation ?? 0) <= 0.3 && (delta.visibility ?? 0) <= 0.34) return "muted";
    if ((delta.visibility ?? 0) >= 0.6 || (delta.contrast ?? 0) >= 0.6) return "visible";
    return options[0]?.label;
  }

  if (slot === "pattern") {
    if ((delta.geometry ?? 0) >= 0.68) return "geometric";
    if ((delta.organic ?? 0) >= 0.68) return "organic";
    if ((delta.complexity ?? 0) <= 0.28 && (delta.motifPresence ?? 0) <= 0.24) return "texture-like";
    return options[0]?.label;
  }

  if (slot === "arrangement") {
    if ((delta.order ?? 0) >= 0.68) return "ordered";
    if ((delta.openness ?? 0) >= 0.64 || (delta.flow ?? 0) >= 0.68) return "open";
    return options[0]?.label;
  }

  if (slot === "space") {
    if ((delta.officeLike ?? 0) >= 0.72) return "office";
    if ((delta.resting ?? 0) >= 0.72) return "resting";
    if ((delta.social ?? 0) >= 0.68) return "social";
    if ((delta.domestic ?? 0) >= 0.72) return "domestic";
    return options[0]?.label;
  }

  return options[0]?.label;
}

function derivePatternKeyElement(options: OpeningOptionDefinition[]): string | undefined {
  const joined = options.map((option) => `${option.id} ${option.label}`).join(" ");
  if (joined.includes("花叶") || joined.includes("花卉") || joined.includes("floral")) return "floral";
  if (joined.includes("botanical") || joined.includes("植物") || joined.includes("叶")) return "botanical";
  if (joined.includes("landscape") || joined.includes("山水") || joined.includes("地貌")) return "landscape";
  if (joined.includes("花")) return "floral";
  if (joined.includes("geometric") || joined.includes("几何")) return "geometric-motif";
  if (joined.includes("wave") || joined.includes("云气") || joined.includes("水意")) return "water-wave";
  if (joined.includes("texture") || joined.includes("肌理")) return "stone-texture";
  return undefined;
}

function buildOpeningSlotPatches(options: OpeningOptionDefinition[]): OpeningSlotPatch[] {
  const suggestedNextTargets = buildSuggestedTargets(options);
  return DELTA_SLOTS.flatMap((slot) => {
    const parameterDelta = aggregateSlotDelta(options, slot);
    if (Object.keys(parameterDelta).length === 0) return [];
    return [{
      slot,
      parameterDelta,
      topCandidateLabel: deriveOpeningDirectionLabel(slot, parameterDelta, options) ?? options.map((option) => option.label).join(" + "),
      score: scorePatch(parameterDelta),
      supportingOptionIds: options.map((option) => option.id),
      suggestedNextTargets,
    }];
  });
}

function applyPatchToMacroSlotState(currentSlot: MacroSlotState, patch: OpeningSlotPatch): MacroSlotState {
  const label = patch.topCandidateLabel;
  const existingCandidates = currentSlot.topCandidates.filter((candidate) => candidate.label !== label);
  const nextScore = Math.max(currentSlot.topScore, patch.score);
  const nextStatus = currentSlot.status === "empty" && patch.score >= 0.58
    ? "base-ready"
    : currentSlot.status === "empty"
      ? "hinted"
      : currentSlot.status;
  return {
    ...currentSlot,
    status: nextStatus,
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
    topScore: nextScore,
    supportingSignals: [...new Set([...currentSlot.supportingSignals, ...patch.supportingOptionIds])],
    openBranches: [...new Set([...currentSlot.openBranches, ...patch.suggestedNextTargets])].slice(0, 4),
    patternIntent: patch.slot === "pattern"
      ? (() => {
          const derivedPatternIntent = derivePatternIntentFromDelta(patch.parameterDelta);
          if (!derivedPatternIntent) {
            return currentSlot.patternIntent;
          }
          return {
            abstractionPreference: currentSlot.patternIntent?.abstractionPreference ?? derivedPatternIntent.abstractionPreference,
            keyElement: currentSlot.patternIntent?.keyElement ?? derivePatternKeyElement(
              patch.supportingOptionIds
                .map((id) => OPENING_OPTION_INDEX.get(id))
                .filter((option): option is OpeningOptionDefinition => Boolean(option)),
            ),
            renderingMode: derivedPatternIntent.renderingMode ?? currentSlot.patternIntent?.renderingMode,
            motionFeeling: derivedPatternIntent.motionFeeling ?? currentSlot.patternIntent?.motionFeeling,
          };
        })()
      : currentSlot.patternIntent,
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
  const arrangement = progressSlots.find((slot) => slot.slot === "arrangement");
  const hasBasicConfidence = (slot: IntakeSlotProgress | undefined) =>
    Boolean(slot && slot.topScore >= 0.38 && slot.supportingSignals.length >= 1);
  const readyForFirstGeneration =
    hasBasicConfidence(impression) &&
    [color, pattern, arrangement].some((slot) => hasBasicConfidence(slot));

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
