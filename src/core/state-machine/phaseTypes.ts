/**
 * Explicit exploration phase state machine.
 *
 * Replaces the implicit round/phase combination that was scattered across
 * App.tsx and the backend session schema. Each phase has clear entry/exit
 * conditions and drives different system behavior.
 */

export type ExplorationPhase =
  | "reference_calibration"
  | "preference_exploration"
  | "conflict_resolution"
  | "preference_stabilization"
  | "generation_ready"
  | "generation_refinement"
  | "recovery";

// Human-readable labels for each phase (product-visible)
export const PHASE_LABELS: Record<ExplorationPhase, string> = {
  reference_calibration: "参考图校准",
  preference_exploration: "偏好探索",
  conflict_resolution: "冲突解析",
  preference_stabilization: "偏好趋于稳定",
  generation_ready: "可以生成",
  generation_refinement: "生成精调",
  recovery: "重新校准中",
};

// Context hints shown to the user in each phase
export const PHASE_HINTS: Record<ExplorationPhase, string> = {
  reference_calibration: "正在理解参考图风格，请稍候……",
  preference_exploration: "请对候选方案进行喜欢/不喜欢反馈，帮助系统学习你的偏好",
  conflict_resolution: "检测到偏好冲突，请继续反馈帮助澄清设计方向",
  preference_stabilization: "偏好趋于稳定，可以考虑锁定关键风格槽位",
  generation_ready: "已充分理解你的方向，点击生成可以创作新方案",
  generation_refinement: "正在基于生成结果继续精调",
  recovery: "检测到偏好漂移，系统正在重新校准方向",
};

export interface PhaseTransitionInput {
  /** Current phase before potential transition */
  currentPhase: ExplorationPhase;
  /** Total like/dislike feedback events recorded */
  feedbackCount: number;
  /** Number of explicitly locked slots */
  lockedSlotCount: number;
  /** Max conflict score across all axes [0, 1] */
  conflictScore: number;
  /** Mean confidence across all 21 axes [0, 1] */
  averageConfidence: number;
  /** Number of axes with confidence > 0.7 (out of 21) */
  highConfidenceAxesCount: number;
  /** Number of images with net positive feedback */
  positiveAnchorCount: number;
}

/**
 * Pure function: given current state metrics, return the appropriate next phase.
 *
 * Transitions are evaluated in priority order:
 *  1. Recovery / conflict resolution (urgent overrides)
 *  2. Generation ready (achievement gate)
 *  3. Stabilization (good progress signal)
 *  4. Ongoing exploration
 *  5. Initial calibration (no feedback yet)
 */
export function computeNextPhase(input: PhaseTransitionInput): ExplorationPhase {
  const {
    currentPhase,
    feedbackCount,
    lockedSlotCount,
    conflictScore,
    averageConfidence,
    highConfidenceAxesCount,
    positiveAnchorCount,
  } = input;

  // --- Priority 1: Conflict or recovery ---
  if (conflictScore > 0.65 && feedbackCount >= 3) {
    return "conflict_resolution";
  }
  // If was in conflict and conflict has dropped, return to exploration
  if (currentPhase === "conflict_resolution" && conflictScore < 0.40) {
    return "preference_exploration";
  }
  // Recovery: if after many rounds confidence is still very low
  if (feedbackCount >= 8 && averageConfidence < 0.20) {
    return "recovery";
  }

  // --- Priority 2: Generation ready ---
  // All must be satisfied:
  // - enough axes are confident (≥9 of 21 at >0.7)
  // - at least 1 slot locked
  // - conflict is low
  // - has some positive feedback
  // - minimum 4 feedback events
  if (
    highConfidenceAxesCount >= 9 &&
    lockedSlotCount >= 1 &&
    conflictScore < 0.35 &&
    positiveAnchorCount >= 2 &&
    feedbackCount >= 4
  ) {
    return "generation_ready";
  }

  // --- Priority 3: Stabilization ---
  if (averageConfidence > 0.50 && conflictScore < 0.40 && feedbackCount >= 3) {
    return "preference_stabilization";
  }

  // --- Priority 4: Initial calibration ---
  if (feedbackCount === 0) {
    return "reference_calibration";
  }

  // --- Default: keep exploring ---
  return "preference_exploration";
}

/** Returns true if the phase allows the user to trigger generation */
export function isGenerationAllowed(phase: ExplorationPhase): boolean {
  return phase === "generation_ready" || phase === "generation_refinement";
}
