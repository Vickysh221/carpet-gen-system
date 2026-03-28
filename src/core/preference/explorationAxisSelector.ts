/**
 * Dynamic Exploration Axis Selector
 *
 * Replaces the fixed EXPLORATION_SPECS array in parameterManager.ts.
 *
 * Instead of always testing saturation / orderliness / edgeSoftness / complexity,
 * this module selects which axes to explore based on the current preference state:
 *
 * Priority:
 *  1. High-conflict axes (need disambiguation most urgently)
 *  2. Low-confidence axes that are critical for generation
 *  3. Low-confidence axes in general
 *  4. Critical-generation axes below stabilization threshold
 */

import type { ImageSlotValues } from "@/types/domain";
import type { PreferenceStateWithMeta } from "./preferenceReducer";

export interface AxisExploration {
  slotKey: keyof ImageSlotValues;
  axisKey: string;
  /** How much to shift the axis value for the exploration image */
  targetDelta: number;
  /** Higher = more important to explore */
  priority: number;
  /** Why this axis was selected */
  reason: "high_conflict" | "low_confidence_critical" | "low_confidence" | "critical_axis";
}

/**
 * Axes that have the most influence on generation quality.
 * These get a priority boost even if confidence is moderate.
 */
const CRITICAL_AXES = new Set([
  "motif.geometryDegree",
  "motif.organicDegree",
  "motif.complexity",
  "arrangement.orderliness",
  "arrangement.density",
  "style.heritageSense",
  "style.graphicness",
  "scale.motifScale",
  "scale.rhythm",
  "colorPalette.saturation",
  "colorPalette.lightness",
]);

/**
 * Select the most informative axes to explore in the next round.
 *
 * @param state Current preference state
 * @param count How many axes to return (default: 4)
 * @returns Sorted list (highest priority first) of axes to build exploration candidates for
 */
export function selectExplorationAxes(
  state: PreferenceStateWithMeta,
  count = 4
): AxisExploration[] {
  const candidates: AxisExploration[] = [];

  for (const [slotKey, axes] of Object.entries(state.axes) as Array<
    [keyof ImageSlotValues, Record<string, { value: number; confidence: number; conflictScore: number }>]
  >) {
    for (const [axisKey, axisState] of Object.entries(axes)) {
      const fullKey = `${slotKey}.${axisKey}`;
      const isCritical = CRITICAL_AXES.has(fullKey);

      let priority = 0;
      let reason: AxisExploration["reason"] = "low_confidence";

      if (axisState.conflictScore > 0.40) {
        // Conflict axes need the most urgent disambiguation
        priority = 120 + axisState.conflictScore * 60;
        reason = "high_conflict";
      } else if (axisState.confidence < 0.35 && isCritical) {
        priority = 90 + (1 - axisState.confidence) * 30;
        reason = "low_confidence_critical";
      } else if (axisState.confidence < 0.40) {
        priority = 55 + (1 - axisState.confidence) * 25;
        if (isCritical) priority += 20;
        reason = isCritical ? "low_confidence_critical" : "low_confidence";
      } else if (isCritical && axisState.confidence < 0.60) {
        priority = 35;
        reason = "critical_axis";
      }

      if (priority > 0) {
        // Explore the less-tested side: push toward opposite of current value
        const currentVal = axisState.value;
        // For conflict axes: test both extremes → delta moves to mid-point first
        const targetDelta =
          axisState.conflictScore > 0.40
            ? 0.5 - currentVal // push toward neutral
            : currentVal > 0.5
            ? -0.14 // current is high, explore low side
            : 0.14; // current is low, explore high side

        candidates.push({ slotKey, axisKey, targetDelta, priority, reason });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.slice(0, count);
}

/**
 * Convert exploration axis selections into the format expected by
 * buildRound1Candidates / local exploration builder.
 */
export function toExplorationSpecs(
  axes: AxisExploration[]
): Array<{ slotKey: keyof ImageSlotValues; axisKey: string; delta: number }> {
  return axes.map(({ slotKey, axisKey, targetDelta }) => ({
    slotKey,
    axisKey,
    delta: targetDelta,
  }));
}
