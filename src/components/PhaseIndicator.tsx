/**
 * PhaseIndicator — shows the current exploration phase and generation readiness.
 *
 * Designed to be "debug-visible first, product-visible later" per the roadmap.
 * Currently renders as a slim contextual banner below the header.
 */

import { PHASE_LABELS, PHASE_HINTS, type ExplorationPhase } from "@/core/state-machine/phaseTypes";
import { checkGenerationReadiness, readinessPercent } from "@/core/policy/generationReadiness";
import { computePreferenceSummary, type PreferenceStateWithMeta } from "@/core/preference/preferenceReducer";

const PHASE_COLORS: Record<ExplorationPhase, string> = {
  reference_calibration: "bg-gray-100 text-gray-600 border-gray-200",
  preference_exploration: "bg-blue-50 text-blue-700 border-blue-200",
  conflict_resolution: "bg-amber-50 text-amber-700 border-amber-200",
  preference_stabilization: "bg-emerald-50 text-emerald-700 border-emerald-200",
  generation_ready: "bg-green-100 text-green-800 border-green-300",
  generation_refinement: "bg-purple-50 text-purple-700 border-purple-200",
  recovery: "bg-red-50 text-red-700 border-red-200",
};

const PHASE_DOT: Record<ExplorationPhase, string> = {
  reference_calibration: "bg-gray-400",
  preference_exploration: "bg-blue-500",
  conflict_resolution: "bg-amber-500",
  preference_stabilization: "bg-emerald-500",
  generation_ready: "bg-green-600",
  generation_refinement: "bg-purple-500",
  recovery: "bg-red-500",
};

interface PhaseIndicatorProps {
  phase: ExplorationPhase;
  preferenceState: PreferenceStateWithMeta;
  lockedSlotCount: number;
}

export function PhaseIndicator({ phase, preferenceState, lockedSlotCount }: PhaseIndicatorProps) {
  const readiness = checkGenerationReadiness(preferenceState, lockedSlotCount);
  const pct = readinessPercent(readiness);
  const { averageConfidence, highConfidenceAxesCount } = computePreferenceSummary(preferenceState);

  const colorClass = PHASE_COLORS[phase] ?? PHASE_COLORS.preference_exploration;
  const dotClass = PHASE_DOT[phase] ?? PHASE_DOT.preference_exploration;

  return (
    <div
      className={`mx-4 mt-2 mb-1 sm:mx-6 lg:mx-8 border rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 ${colorClass}`}
      style={{ fontFamily: "'PingFang SC', sans-serif" }}
    >
      {/* Left: phase name + hint */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span className="text-[13px] font-semibold whitespace-nowrap">
          {PHASE_LABELS[phase]}
        </span>
        <span className="text-[12px] opacity-70 truncate hidden sm:block">
          {PHASE_HINTS[phase]}
        </span>
      </div>

      {/* Right: readiness stats */}
      <div className="flex items-center gap-4 flex-shrink-0 text-[11px]">
        <span className="opacity-60">
          反馈 {preferenceState.totalFeedbackCount} 次
        </span>
        <span className="opacity-60">
          {highConfidenceAxesCount}/21 维已确定
        </span>
        {/* Readiness progress bar */}
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                readiness.ready ? "bg-green-500" : "bg-current opacity-50"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="opacity-70 tabular-nums">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
