/**
 * Generation Readiness Gate
 *
 * Defines when the system transitions from "explore library" to "generate new".
 * Without this, the system never clearly signals the user that they can move forward.
 */

import { computePreferenceSummary, type PreferenceStateWithMeta } from "@/core/preference/preferenceReducer";

export interface GenerationReadinessResult {
  /** Whether all conditions are met to proceed to generation */
  ready: boolean;
  /** Progress score [0, 1] — how close to being ready */
  score: number;
  /** Conditions that have been satisfied */
  reasons: string[];
  /** Conditions that still need to be met */
  blocking: string[];
}

/**
 * Check whether the preference state meets generation-ready conditions.
 *
 * Conditions:
 *  - Minimum 4 feedback events
 *  - At least 9/21 axes with confidence > 0.7
 *  - Low conflict score (< 0.35)
 *  - At least 1 locked slot
 *  - At least 2 positive anchor candidates
 */
export function checkGenerationReadiness(
  state: PreferenceStateWithMeta,
  lockedSlotCount: number
): GenerationReadinessResult {
  const { averageConfidence, highConfidenceAxesCount, conflictScore } =
    computePreferenceSummary(state);

  const reasons: string[] = [];
  const blocking: string[] = [];

  // Condition 1: enough feedback
  const hasEnoughFeedback = state.totalFeedbackCount >= 4;
  if (hasEnoughFeedback) {
    reasons.push(`已收集 ${state.totalFeedbackCount} 次有效反馈`);
  } else {
    blocking.push(`需要至少 4 次反馈（当前 ${state.totalFeedbackCount} 次）`);
  }

  // Condition 2: enough high-confidence axes
  const hasHighConfidenceAxes = highConfidenceAxesCount >= 9;
  if (hasHighConfidenceAxes) {
    reasons.push(`${highConfidenceAxesCount}/21 个设计维度已确定`);
  } else {
    blocking.push(`需要更多维度确定（已确定 ${highConfidenceAxesCount}/21，目标 ≥9）`);
  }

  // Condition 3: low conflict
  const hasLowConflict = conflictScore < 0.35;
  if (hasLowConflict) {
    reasons.push("偏好方向一致，无明显冲突");
  } else {
    blocking.push(`偏好存在冲突（冲突分 ${(conflictScore * 100).toFixed(0)}%），请继续反馈澄清`);
  }

  // Condition 4: at least one locked slot
  const hasLockedSlots = lockedSlotCount >= 1;
  if (hasLockedSlots) {
    reasons.push(`${lockedSlotCount} 个风格槽位已锁定`);
  } else {
    blocking.push("建议在历史记录中锁定至少 1 个核心风格方案");
  }

  // Condition 5: positive anchors
  const hasPositiveAnchors = state.positiveAnchors.length >= 2;
  if (hasPositiveAnchors) {
    reasons.push(`已有 ${state.positiveAnchors.length} 个正向参考锚点`);
  } else {
    blocking.push(`需要至少 2 个喜欢的方案作为参考锚点（当前 ${state.positiveAnchors.length} 个）`);
  }

  const conditionsMet = [
    hasEnoughFeedback,
    hasHighConfidenceAxes,
    hasLowConflict,
    hasLockedSlots,
    hasPositiveAnchors,
  ];
  const score = conditionsMet.filter(Boolean).length / conditionsMet.length;
  const ready = score >= 0.8; // at least 4/5 conditions must be met

  return { ready, score, reasons, blocking };
}

/** Compact readiness percentage for display */
export function readinessPercent(result: GenerationReadinessResult): number {
  return Math.round(result.score * 100);
}
