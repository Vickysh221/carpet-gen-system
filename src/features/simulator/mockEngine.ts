import type { AnchorCard, FeedbackRecord, SimulatorSlotKey, SimulatorState, VariantCard } from "./types";
import type { RoundMode } from "./ontology";

const SLOT_LABELS: Record<SimulatorSlotKey, string> = {
  color: "Color",
  motif: "Motif",
  arrangement: "Arrangement",
  impression: "Impression",
  style: "Style",
};

const SLOT_AXES: Record<SimulatorSlotKey, string[]> = {
  color: ["warmth", "saturation", "lightness"],
  motif: ["geometry", "organic", "complexity"],
  arrangement: ["order", "spacing", "direction"],
  impression: ["calm", "energy", "softness"],
  style: ["graphic", "painterly", "heritage"],
};

/**
 * MVP judgment from the design docs:
 * - First-order slots drive visible change directly.
 * - Second-order slots modulate first-order movement, rather than acting as equal direct knobs.
 */
const FIRST_ORDER_PLAN: SimulatorSlotKey[] = ["color", "motif", "arrangement", "color", "motif", "arrangement"];
const SECOND_ORDER_PLAN: SimulatorSlotKey[] = ["impression", "style"];
const DELTAS = [0.14, -0.14, 0.1, -0.1];

function clamp(value: number, min = 0.08, max = 0.92) {
  return Math.max(min, Math.min(max, value));
}

function randomAxis() {
  return clamp(0.25 + Math.random() * 0.5);
}

export function createRandomBaseState(): SimulatorState {
  return {
    color: {
      warmth: randomAxis(),
      saturation: randomAxis(),
      lightness: randomAxis(),
    },
    motif: {
      geometry: randomAxis(),
      organic: randomAxis(),
      complexity: randomAxis(),
    },
    arrangement: {
      order: randomAxis(),
      spacing: randomAxis(),
      direction: randomAxis(),
    },
    impression: {
      calm: randomAxis(),
      energy: randomAxis(),
      softness: randomAxis(),
    },
    style: {
      graphic: randomAxis(),
      painterly: randomAxis(),
      heritage: randomAxis(),
    },
  };
}

export function cloneState(state: SimulatorState): SimulatorState {
  return JSON.parse(JSON.stringify(state)) as SimulatorState;
}

function buildSummary(slot: SimulatorSlotKey, axis: string, delta: number, phase: "direct" | "modulated") {
  const sign = delta > 0 ? "+" : "";
  const suffix = phase === "modulated" ? " (meta-shaped)" : "";
  return `${SLOT_LABELS[slot]} · ${axis} ${sign}${delta.toFixed(2)}${suffix}`;
}

export function getRoundMode(round: number): "direct" | "modulated" {
  // Every 4th round, expose a meta-shaping round; otherwise stay on direct visible slots.
  return round % 4 === 0 ? "modulated" : "direct";
}

export function getPrimarySlot(round: number): SimulatorSlotKey {
  const mode = getRoundMode(round);
  if (mode === "direct") {
    return FIRST_ORDER_PLAN[(round - 1) % FIRST_ORDER_PLAN.length];
  }
  return SECOND_ORDER_PLAN[Math.floor(round / 4 - 1) % SECOND_ORDER_PLAN.length] ?? "impression";
}

function applyMetaInfluence(state: SimulatorState) {
  const next = cloneState(state);

  // Impression modulates first-order tendencies.
  next.color.saturation = clamp(next.color.saturation + (state.impression.energy - 0.5) * 0.08 - (state.impression.calm - 0.5) * 0.06);
  next.color.lightness = clamp(next.color.lightness + (state.impression.softness - 0.5) * 0.06 + (state.impression.calm - 0.5) * 0.04);
  next.arrangement.spacing = clamp(next.arrangement.spacing + (state.impression.calm - 0.5) * 0.08);
  next.arrangement.order = clamp(next.arrangement.order + (state.impression.calm - 0.5) * 0.06 - (state.impression.energy - 0.5) * 0.04);
  next.motif.complexity = clamp(next.motif.complexity - (state.impression.softness - 0.5) * 0.06 + (state.impression.energy - 0.5) * 0.04);

  // Style modulates how sharp / structured / traditional the first-order result feels.
  next.arrangement.order = clamp(next.arrangement.order + (state.style.graphic - 0.5) * 0.08);
  next.motif.geometry = clamp(next.motif.geometry + (state.style.graphic - 0.5) * 0.08);
  next.motif.organic = clamp(next.motif.organic + (state.style.painterly - 0.5) * 0.08);
  next.color.warmth = clamp(next.color.warmth + (state.style.heritage - 0.5) * 0.05);
  next.color.saturation = clamp(next.color.saturation - (state.style.heritage - 0.5) * 0.04);

  return next;
}

export function generateRoundVariants(base: SimulatorState, round: number): VariantCard[] {
  const mode = getRoundMode(round);
  const slot = getPrimarySlot(round);
  const axes = SLOT_AXES[slot];

  return DELTAS.map((delta, index) => {
    const axis = axes[index % axes.length];
    const next = cloneState(base);
    // @ts-expect-error structured slot indexed by string axis in simulator mock layer
    next[slot][axis] = clamp(next[slot][axis] + delta);

    const state = mode === "modulated" ? applyMetaInfluence(next) : next;

    return {
      id: `round-${round}-variant-${index + 1}`,
      round,
      label: `${slot}-${index + 1}`,
      state,
      changedSlots: [slot],
      summary: buildSummary(slot, axis, delta, mode),
    };
  });
}

export function reduceRound(base: SimulatorState, variants: VariantCard[], feedback: FeedbackRecord[]): SimulatorState {
  const next = cloneState(base);
  const feedbackMap = new Map(feedback.map((item) => [item.variantId, item.value]));

  const liked = variants.filter((variant) => feedbackMap.get(variant.id) === "liked");
  const disliked = variants.filter((variant) => feedbackMap.get(variant.id) === "disliked");

  const allConsidered = [...liked, ...disliked];
  const primarySlot = allConsidered[0]?.changedSlots[0] ?? null;

  const directLearningRate = liked.length > 0 ? 0.24 : 0.1;
  const directRepelRate = disliked.length > 0 ? 0.12 : 0.05;
  const metaLearningRate = liked.length > 0 ? 0.12 : 0.04;
  const metaRepelRate = disliked.length > 0 ? 0.08 : 0.03;

  (Object.keys(next) as SimulatorSlotKey[]).forEach((slotKey) => {
    const axes = Object.keys(next[slotKey]) as Array<keyof SimulatorState[typeof slotKey]>;
    const isPrimaryDirectSlot = primarySlot !== null && slotKey === primarySlot && ["color", "motif", "arrangement"].includes(slotKey);
    const isMetaSlot = slotKey === "impression" || slotKey === "style";

    axes.forEach((axisKey) => {
      let value = next[slotKey][axisKey] as number;

      liked.forEach((variant) => {
        const target = variant.state[slotKey][axisKey] as number;
        if (isPrimaryDirectSlot) {
          value += directLearningRate * (target - value);
        } else if (isMetaSlot) {
          value += metaLearningRate * (target - value);
        } else {
          value += 0.06 * (target - value);
        }
      });

      disliked.forEach((variant) => {
        const target = variant.state[slotKey][axisKey] as number;
        if (isPrimaryDirectSlot) {
          value -= directRepelRate * (target - value);
        } else if (isMetaSlot) {
          value -= metaRepelRate * (target - value);
        } else {
          value -= 0.04 * (target - value);
        }
      });

      next[slotKey][axisKey] = clamp(value) as never;
    });
  });

  return next;
}

export function collectLikedAnchors(variants: VariantCard[], feedback: FeedbackRecord[]): AnchorCard[] {
  const feedbackMap = new Map(feedback.map((item) => [item.variantId, item.value]));
  return variants
    .filter((variant) => feedbackMap.get(variant.id) === "liked")
    .map((variant) => ({
      id: variant.id,
      round: variant.round,
      label: variant.label,
      state: variant.state,
      summary: variant.summary,
    }));
}
