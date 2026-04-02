import { useMemo, useState } from "react";
import { RefreshCw, Play, Heart, X, Trophy, ChevronDown, ChevronUp } from "lucide-react";

import { collectLikedAnchors, createRandomBaseState, generateRoundVariants, getPrimarySlot, getRoundMode, reduceRound } from "./mockEngine";
import { buildIntentStabilizationSnapshot, buildIntentStabilizationSnapshotFromAgentState, type IntentUnderstandingSnapshot } from "./intentStabilization";
import { explainRound } from "./ontology";
import { buildInitializationExplainability } from "./semanticInitialization";
import { buildConversationStateLogSummary, type ConversationStateLogSummary, type InitializationExplainabilityResult } from "./explainability";
import { MatchedRefInspectPanel } from "./MatchedRefInspectPanel";
import { getReferenceAssets, type AssetSourceMode } from "@/core/assets/assetSources";
import { assignDiverseNearestAnnotatedAssets, assignProbingCarriers, findNearestAnnotatedAssets, findExploratoryAnnotatedAssets } from "@/core/assets/matching";
import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "@/core/assets/types";
import {
  buildDerivedEntryAnalysisFromAgentState,
  buildVisualIntentCompiler,
  buildVisualIntentTestBundle,
  createIntentIntakeAgentState,
  getOpeningFamiliesForFirstTurns,
  OPENING_OPTION_INDEX,
  type IntentIntakeAgentState,
  type OpeningQuestionFamilyDefinition,
  type EntryAgentResult,
  type IntakeMacroSlot,
  type OpeningSelectionSignal,
  type TextIntakeSignal,
  type VisualIntentTestBundle,
  updateAgentStateFromSignal,
} from "@/features/entryAgent";
import type { AnchorCard, FeedbackRecord, SimulatorState, VariantCard } from "./types";

const PROBING_ROUND_LIMIT = 3;

interface LikedHistoryCard {
  id: string;
  round: number;
  variant: VariantCard;
  matchedAsset?: AnnotatedAssetRecord & { distance: number };
}

interface SelectedRefInspectState {
  label: string;
  asset: AnnotatedAssetRecord & { distance: number };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function summarizeEntryAnalysis(analysis: EntryAgentResult) {
  const hitFields = analysis.hitFields.length > 0 ? analysis.hitFields.join(", ") : "none";
  const semanticHintKeys = Object.keys(analysis.provisionalStateHints);
  const semanticHintsLabel = semanticHintKeys.length > 0 ? semanticHintKeys.join(", ") : "none";
  const followUpTarget = analysis.suggestedFollowUpTarget ?? "none";

  return [
    `hit fields: ${hitFields}`,
    `qa mode: ${analysis.suggestedQaMode}`,
    `follow-up target: ${followUpTarget}`,
    `semantic hints: ${semanticHintsLabel}`,
    `ambiguities: ${analysis.ambiguities.length}`,
  ].join(" · ");
}

function formatOpeningPromptForPanel(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function firstOrderFromState(state: SimulatorState): FirstOrderSlotValues {
  return { color: state.color, motif: state.motif, arrangement: state.arrangement };
}

function averagePreferenceState(states: SimulatorState[]): FirstOrderSlotValues | null {
  if (states.length === 0) return null;
  const total = states.reduce(
    (acc, state) => {
      acc.color.warmth += state.color.warmth;
      acc.color.saturation += state.color.saturation;
      acc.color.lightness += state.color.lightness;
      acc.motif.geometry += state.motif.geometry;
      acc.motif.organic += state.motif.organic;
      acc.motif.complexity += state.motif.complexity;
      acc.arrangement.order += state.arrangement.order;
      acc.arrangement.spacing += state.arrangement.spacing;
      acc.arrangement.direction += state.arrangement.direction;
      return acc;
    },
    { color: { warmth: 0, saturation: 0, lightness: 0 }, motif: { geometry: 0, organic: 0, complexity: 0 }, arrangement: { order: 0, spacing: 0, direction: 0 } }
  );
  const count = states.length;
  return {
    color: { warmth: total.color.warmth / count, saturation: total.color.saturation / count, lightness: total.color.lightness / count },
    motif: { geometry: total.motif.geometry / count, organic: total.motif.organic / count, complexity: total.motif.complexity / count },
    arrangement: { order: total.arrangement.order / count, spacing: total.arrangement.spacing / count, direction: total.arrangement.direction / count },
  };
}

function MiniPreview({ state }: { state: SimulatorState }) {
  const bg = `linear-gradient(135deg,
    hsl(${20 + state.color.warmth * 40} 60% ${82 - state.color.saturation * 22}%) 0%,
    hsl(${35 + state.impression.softness * 18} 45% ${74 - state.motif.complexity * 18}%) 45%,
    hsl(${12 + state.style.heritage * 25} 32% ${68 - state.arrangement.order * 16}%) 100%)`;
  const opacityA = 0.18 + state.motif.geometry * 0.35;
  const opacityB = 0.12 + state.arrangement.direction * 0.28;
  return (
    <div className="relative h-40 overflow-hidden rounded-2xl border border-stone-300" style={{ background: bg }}>
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(80,55,40,0.16) 0px, rgba(80,55,40,0.16) 8px, transparent 8px, transparent 28px)", opacity: opacityA, transform: `scale(${0.95 + state.motif.complexity * 0.1}) rotate(${(state.arrangement.direction - 0.5) * 10}deg)` }} />
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 20px)", opacity: opacityB, transform: `translateY(${(state.arrangement.spacing - 0.5) * 12}px)` }} />
      <div className="absolute bottom-3 left-3 rounded-full bg-white/75 px-3 py-1 text-xs text-stone-700 backdrop-blur-sm">calm {formatPercent(state.impression.calm)} · graphic {formatPercent(state.style.graphic)}</div>
    </div>
  );
}

function MatchedFuliPreview({
  title,
  state,
  matchedAsset,
  badge,
  onInspect,
}: {
  title: string;
  state?: SimulatorState;
  matchedAsset?: AnnotatedAssetRecord & { distance: number };
  badge: string;
  onInspect?: (asset: AnnotatedAssetRecord & { distance: number }) => void;
}) {
  if (!matchedAsset && state) {
    return <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</div><MiniPreview state={state} /></div>;
  }
  if (!matchedAsset) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</div>
      <div className="relative h-40 overflow-hidden rounded-2xl border border-stone-300 bg-stone-100">
        <img src={matchedAsset.imageUrl} alt={matchedAsset.title} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-3">
          <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-stone-800 backdrop-blur-sm">{badge} · dist {matchedAsset.distance.toFixed(2)}</div>
          <div className="mt-2 text-sm font-semibold text-white">{matchedAsset.title}</div>
          <div className="mt-1 text-xs text-white/85">source {matchedAsset.annotation?.annotationSource ?? (matchedAsset.tags?.includes("extended") ? "extended-registry" : "unknown")}</div>
          {onInspect && matchedAsset.annotation && (
            <button
              type="button"
              onClick={() => onInspect(matchedAsset)}
              className="mt-3 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-800 backdrop-blur-sm"
            >
              Inspect ref
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotSnapshot({ title, values, tone = "direct", highlighted = false }: { title: string; values: Record<string, number>; tone?: "direct" | "meta"; highlighted?: boolean }) {
  const toneLabel = tone === "direct" ? "direct visual" : "modulation state";
  const barClass = tone === "direct" ? "bg-stone-700" : "bg-amber-700";
  return (
    <div className={`rounded-2xl border p-3 ${highlighted ? "border-stone-900 bg-white shadow-sm" : "border-stone-200 bg-stone-50"}`}>
      <div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</div><div className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone === "direct" ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-800"}`}>{toneLabel}</div></div>
      <div className="space-y-2">{Object.entries(values).map(([key, value]) => <div key={key}><div className="mb-1 flex items-center justify-between text-xs text-stone-600"><span>{key}</span><span>{formatPercent(value)}</span></div><div className="h-2 rounded-full bg-stone-200"><div className={`h-2 rounded-full ${barClass}`} style={{ width: `${value * 100}%` }} /></div></div>)}</div>
    </div>
  );
}

function RefAssetCard({ asset }: { asset: AnnotatedAssetRecord & { distance: number } }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="h-36 overflow-hidden bg-stone-100"><img src={asset.imageUrl} alt={asset.title} className="h-full w-full object-cover" loading="lazy" /></div>
      <div className="p-3"><div className="flex items-center justify-between gap-3 text-xs text-stone-700"><span className="truncate font-medium text-stone-800">{asset.title}</span><span className="shrink-0 text-stone-500">dist {asset.distance.toFixed(2)}</span></div></div>
    </div>
  );
}

const SLOT_PHASE_COLORS: Record<string, string> = {
  empty: "bg-stone-100 text-stone-400",
  hinted: "bg-stone-200 text-stone-600",
  "base-captured": "bg-emerald-100 text-emerald-700",
  "lock-candidate": "bg-amber-100 text-amber-700",
};
const SLOT_PHASE_LABELS: Record<string, string> = {
  empty: "空",
  hinted: "有线索",
  "base-captured": "初步确认",
  "lock-candidate": "待锁定",
};
const SLOT_NAME_LABELS: Record<string, string> = {
  impression: "氛围",
  color: "颜色",
  pattern: "图案",
  arrangement: "排布",
  space: "空间",
};

function SlotPhasePill({ slot }: { slot: { slot: string; phase: string; topScore: number; topDirection?: string } }) {
  const label = SLOT_NAME_LABELS[slot.slot] ?? slot.slot;
  const phaseLabel = SLOT_PHASE_LABELS[slot.phase] ?? slot.phase;
  const colorClass = SLOT_PHASE_COLORS[slot.phase] ?? "bg-stone-100 text-stone-500";
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`} title={slot.topDirection}>
      <span>{label}</span>
      <span className="opacity-60">·</span>
      <span>{phaseLabel}</span>
      {slot.topScore > 0 && <span className="ml-0.5 opacity-60">{Math.round(slot.topScore * 100)}%</span>}
    </div>
  );
}

function mapMacroStatusToDisplayPhase(status: string) {
  if (status === "base-ready") return "base-captured";
  if (status === "soft-locked") return "lock-candidate";
  return status;
}

function hasOpeningOptionBeenApplied(agentState: IntentIntakeAgentState | null, optionId: string) {
  if (!agentState) {
    return false;
  }

  return agentState.slots.some((slot) => slot.supportingSignals.includes(optionId));
}

function buildOpeningSelectionPreview(agentState: IntentIntakeAgentState | null, family: {
  options: Array<{ id: string; label: string }>;
} | undefined) {
  if (!agentState || !family) {
    return "";
  }

  const labels = family.options
    .filter((option) => hasOpeningOptionBeenApplied(agentState, option.id))
    .map((option) => option.label);
  if (labels.length === 0) {
    return "";
  }

  return labels.join("，");
}

function DialogueBubble({
  role,
  text,
  compact = false,
}: {
  role: "user" | "expert";
  text: string;
  compact?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "border border-stone-900 bg-stone-900 text-white"
            : "border border-stone-200 bg-stone-50 text-stone-800"
        } ${compact ? "text-[13px] leading-5" : ""}`}
      >
        {!compact && (
          <div className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isUser ? "text-white/65" : "text-stone-500"}`}>
            {isUser ? "你" : "地毯设计顾问"}
          </div>
        )}
        <div>{text}</div>
      </div>
    </div>
  );
}

function buildVisualIntentDiff(current: VisualIntentTestBundle, previous: VisualIntentTestBundle | null) {
  if (!previous) {
    return ["当前是第一版 visual intent bundle。"];
  }

  const diff: string[] = [];
  if (current.semanticSpec.palette?.base !== previous.semanticSpec.palette?.base || current.semanticSpec.palette?.accent !== previous.semanticSpec.palette?.accent) {
    diff.push(`palette · ${previous.semanticSpec.palette?.base ?? "none"} / ${previous.semanticSpec.palette?.accent ?? "none"} -> ${current.semanticSpec.palette?.base ?? "none"} / ${current.semanticSpec.palette?.accent ?? "none"}`);
  }
  if (current.semanticSpec.pattern?.motion !== previous.semanticSpec.pattern?.motion) {
    diff.push(`pattern motion · ${previous.semanticSpec.pattern?.motion ?? "none"} -> ${current.semanticSpec.pattern?.motion ?? "none"}`);
  }
  if (current.semanticSpec.presence?.behavior !== previous.semanticSpec.presence?.behavior || current.semanticSpec.presence?.visualWeight !== previous.semanticSpec.presence?.visualWeight) {
    diff.push(`presence · ${previous.semanticSpec.presence?.behavior ?? "none"} / ${previous.semanticSpec.presence?.visualWeight ?? "none"} -> ${current.semanticSpec.presence?.behavior ?? "none"} / ${current.semanticSpec.presence?.visualWeight ?? "none"}`);
  }
  if (current.unresolvedQuestions.join(" / ") !== previous.unresolvedQuestions.join(" / ")) {
    diff.push(`next split · ${current.unresolvedQuestions[0] ?? "none"}`);
  }

  return diff.length > 0 ? diff : ["本轮 semanticSpec 相比上一轮没有明显结构变化。"];
}

function VisualIntentBundleCard({ bundle, previousBundle }: { bundle: VisualIntentTestBundle; previousBundle: VisualIntentTestBundle | null }) {
  const [showCanonical, setShowCanonical] = useState(false);
  const semanticSpecEntries = [
    bundle.semanticSpec.baseMood?.length ? `base mood · ${bundle.semanticSpec.baseMood.join(", ")}` : undefined,
    bundle.semanticSpec.palette
      ? `palette · ${[
          bundle.semanticSpec.palette.temperature,
          bundle.semanticSpec.palette.saturation,
          bundle.semanticSpec.palette.brightness,
          bundle.semanticSpec.palette.base,
          bundle.semanticSpec.palette.accent,
        ].filter(Boolean).join(" · ")}`
      : undefined,
    bundle.semanticSpec.pattern
      ? `pattern · ${[
          ...(bundle.semanticSpec.pattern.structuralPattern ?? []),
          ...(bundle.semanticSpec.pattern.atmosphericPattern ?? []),
          bundle.semanticSpec.pattern.motion,
          bundle.semanticSpec.pattern.edgeDefinition,
        ].filter(Boolean).join(" · ")}`
      : undefined,
    bundle.semanticSpec.presence
      ? `presence · ${[
          bundle.semanticSpec.presence.blending,
          bundle.semanticSpec.presence.focalness,
          bundle.semanticSpec.presence.visualWeight,
          bundle.semanticSpec.presence.behavior,
        ].filter(Boolean).join(" · ")}`
      : undefined,
    bundle.semanticSpec.arrangement
      ? `arrangement · ${[
          bundle.semanticSpec.arrangement.spread,
          bundle.semanticSpec.arrangement.directionalFlow,
          bundle.semanticSpec.arrangement.orderliness,
        ].filter(Boolean).join(" · ")}`
      : undefined,
  ].filter(Boolean);

  const tuningRows = Object.entries(bundle.tuningSuggestions).filter(([, value]) => Boolean(value && value.length > 0));
  const diffRows = buildVisualIntentDiff(bundle, previousBundle);

  return (
    <div className="rounded-[24px] border border-stone-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Visual intent bundle</div>
          <div className="mt-2 text-sm font-medium text-stone-800">{bundle.testLabel}</div>
        </div>
        <div className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
          readiness {Math.round(bundle.confidenceState.readiness.score * 100)}%
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-stone-700">
        {bundle.summary}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Turn diff</div>
          <div className="mt-2 space-y-2">
            {diffRows.map((row) => (
              <div key={row} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-700">
                {row}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Semantic spec</div>
          <div className="mt-2 space-y-2 text-sm leading-6 text-stone-700">
            {semanticSpecEntries.map((entry) => (
              <div key={entry}>{entry}</div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Prompt outputs</div>
          <div className="mt-2 space-y-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-700">
              <div className="mb-1 font-semibold text-stone-800">Midjourney prompt</div>
              {bundle.prompt}
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-700">
              <div className="mb-1 font-semibold text-stone-800">Negative prompt</div>
              {bundle.negativePrompt}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Risks</div>
            <div className="mt-2 space-y-2">
              {bundle.risks.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">No obvious current risk.</div>
              ) : (
                bundle.risks.map((risk) => (
                  <div key={`${risk.type}-${risk.description}`} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-700">
                    <div className="font-semibold text-stone-800">{risk.type} · {risk.severity}</div>
                    <div className="mt-1">{risk.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Tuning suggestions</div>
            <div className="mt-2 space-y-2">
              {tuningRows.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">No tuning suggestion yet.</div>
              ) : (
                tuningRows.map(([key, values]) => (
                  <div key={key} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-700">
                    <div className="font-semibold text-stone-800">{key}</div>
                    <div className="mt-1">{(values ?? []).join(" · ")}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Unresolved + trace</div>
          <div className="mt-2 space-y-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-700">
              <div className="font-semibold text-stone-800">Unresolved questions</div>
              <div className="mt-1">{bundle.unresolvedQuestions.join(" / ") || "none"}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-700">
              <div className="font-semibold text-stone-800">Poetic hits + traces</div>
              <div className="mt-1">{bundle.trace?.poeticHits.join(" / ") || "none"}</div>
              <div className="mt-1 text-stone-500">{bundle.trace?.sourceNotes.join(" / ") || "none"}</div>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowCanonical((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700"
          >
            {showCanonical ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showCanonical ? "Hide canonical state" : "Show canonical state"}
          </button>
          {showCanonical && (
            <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-[11px] leading-5 text-stone-700">
              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(bundle.canonicalState, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationStateInspectCard({ summary, expanded, onToggle }: { summary: ConversationStateLogSummary; expanded: boolean; onToggle: () => void }) {
  const compactLines = [
    `Turn ${summary.turnCount} · ${summary.readyToGenerate ? "ready to generate" : "still stabilizing"}`,
    summary.currentUnderstanding,
    summary.stateConstruction.appliedDeltaSummaries[0] ?? "No initialization delta was applied.",
    summary.stateConstruction.appliedDeltaSummaries[1],
  ].filter(Boolean);

  return (
    <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">State inspect</div>
          <div className="mt-2 space-y-1.5 text-sm leading-6 text-stone-700">
            {compactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Collapse" : "Inspect"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-stone-200 pt-4 text-sm text-stone-700">
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Turn summary</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">Accumulated text:</span> {summary.userText}</div>
              <div><span className="font-medium text-stone-800">Current understanding:</span> {summary.currentUnderstanding}</div>
              <div><span className="font-medium text-stone-800">Follow-up / decision:</span> {summary.followUpQuestion}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Interpretation summary</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">Hit fields:</span> {summary.interpretation.hitFieldLabels.join(", ") || "none"}</div>
              <div><span className="font-medium text-stone-800">Ambiguity:</span> {summary.interpretation.ambiguitySummary}</div>
              <div><span className="font-medium text-stone-800">QA mode:</span> {summary.interpretation.qaModeLabel}</div>
              <div><span className="font-medium text-stone-800">Follow-up target:</span> {summary.interpretation.followUpTargetLabel}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Question planning</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">LLM status:</span> {summary.questionPlanning.llmStatus}</div>
              <div><span className="font-medium text-stone-800">LLM summary:</span> {summary.questionPlanning.llmSummary}</div>
              <div><span className="font-medium text-stone-800">Gap type:</span> {summary.questionPlanning.selectedGapType}</div>
              <div><span className="font-medium text-stone-800">Planning strategy:</span> {summary.questionPlanning.planningStrategy}</div>
              <div><span className="font-medium text-stone-800">Answer alignment:</span> {summary.questionPlanning.answerAlignment}</div>
              <div><span className="font-medium text-stone-800">Target field:</span> {summary.questionPlanning.targetFieldLabel}</div>
              <div><span className="font-medium text-stone-800">Target slot:</span> {summary.questionPlanning.targetSlotLabel}</div>
              <div><span className="font-medium text-stone-800">Target axes:</span> {summary.questionPlanning.targetAxesSummary}</div>
              <div><span className="font-medium text-stone-800">Question mode:</span> {summary.questionPlanning.questionModeLabel}</div>
              <div><span className="font-medium text-stone-800">Expected information gain:</span> {summary.questionPlanning.expectedInformationGain}</div>
              <div><span className="font-medium text-stone-800">Why this question:</span> {summary.questionPlanning.whyThisQuestion}</div>
              <div><span className="font-medium text-stone-800">Selected gap id:</span> {summary.questionPlanning.selectedGapId}</div>
              <div><span className="font-medium text-stone-800">Selected prompt:</span> {summary.questionPlanning.selectedPrompt}</div>
              <div><span className="font-medium text-stone-800">Selected because:</span> {summary.questionPlanning.selectedBecause}</div>
              <div><span className="font-medium text-stone-800">Selected family:</span> {summary.questionPlanning.selectedQuestionFamily}</div>
              <div><span className="font-medium text-stone-800">Latest resolution:</span> {summary.questionPlanning.latestResolution}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Resolution + understanding trace</div>
            <div className="mt-2 space-y-3 text-sm leading-6 text-stone-700">
              <div>
                <div><span className="font-medium text-stone-800">Resolved families:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.questionPlanning.resolvedFamilies.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Latest shift:</span> {summary.understandingSummary.latestShift}</div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Resolved items:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.understandingSummary.resolvedItems.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Active items:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.understandingSummary.activeItems.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Open items:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.understandingSummary.openItems.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Next focus:</span> {summary.understandingSummary.nextFocus}</div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Intake goal completed:</span> {summary.intakeGoal.completed}</div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Missing macro slots:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.intakeGoal.missingSlots.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Macro slot progress:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.intakeGoal.slotProgress.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Question trace</div>
            <div className="mt-2 space-y-3 text-sm leading-6 text-stone-700">
              <div>
                <div><span className="font-medium text-stone-800">Hit field evidence:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.questionPlanning.hitFieldEvidence.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Semantic gaps ranked:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.questionPlanning.semanticGapSummaries.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Question candidates:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.questionPlanning.questionCandidateSummaries.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
              <div>
                <div><span className="font-medium text-stone-800">Deferred targets:</span></div>
                <div className="mt-1 space-y-1 text-stone-600">
                  {summary.questionPlanning.deferredTargets.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Cumulative imagery cues</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">Source:</span> {summary.cumulativeCanvas.source}</div>
              <div><span className="font-medium text-stone-800">Captured cues:</span> {summary.cumulativeCanvas.rawCues.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">High-level reading:</span> {summary.cumulativeCanvas.conceptualAxes.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Must preserve:</span> {summary.cumulativeCanvas.mustPreserve.join(" / ")}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Prototype explainability</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">Main signals:</span> {summary.prototypeExplainability.mainSignals.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Expanded:</span> {summary.prototypeExplainability.expandedSignals.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Candidates:</span> {summary.prototypeExplainability.candidateSummaries.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Kept readings:</span> {summary.prototypeExplainability.keptSummaries.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Suppressed readings:</span> {summary.prototypeExplainability.suppressedSummaries.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Merge:</span> {summary.prototypeExplainability.mergeSummaries.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Fallback:</span> {summary.prototypeExplainability.fallbackSummary}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">State construction</div>
            <div className="mt-2 space-y-3 text-sm leading-6">
              <div>
                <span className="font-medium text-stone-800">Axis hints:</span>{" "}
                {summary.stateConstruction.axisHintSummaries.join(" · ") || "none"}
              </div>
              <div>
                <span className="font-medium text-stone-800">Weak bias:</span>{" "}
                {summary.stateConstruction.weakBiasSummaries.length === 0
                  ? "none"
                  : summary.stateConstruction.weakBiasSummaries
                      .map((item) => `${item.source} (${item.summaries.join(" · ")})`)
                      .join(" / ")}
              </div>
              <div>
                <span className="font-medium text-stone-800">Applied initialization delta:</span>{" "}
                {summary.stateConstruction.appliedDeltaSummaries.join(" / ") || "none"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Delta explanation</div>
            <div className="mt-2 space-y-2">
              {summary.deltaExplanation.length === 0 ? (
                <div className="text-sm text-stone-600">No direct initialization delta was applied.</div>
              ) : (
                summary.deltaExplanation.map((item) => (
                  <div key={item.axisPath} className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">
                    <span className="font-medium text-stone-800">{item.summary}</span>
                    {" · "}
                    {item.gloss}
                    {" · "}
                    {Math.round(item.before * 100)}% → {Math.round(item.after * 100)}%
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VariantCardView({
  variant,
  feedback,
  matchedAsset,
  onFeedback,
  onFinalize,
  onInspectRef,
  likedPinned = false,
}: {
  variant: VariantCard;
  feedback?: "liked" | "disliked";
  matchedAsset?: AnnotatedAssetRecord & { distance: number };
  onFeedback?: (variantId: string, value: "liked" | "disliked") => void;
  onFinalize?: (variant: VariantCard) => void;
  onInspectRef?: (asset: AnnotatedAssetRecord & { distance: number }) => void;
  likedPinned?: boolean;
}) {
  return (
    <div className={`rounded-[28px] border bg-white p-4 shadow-sm ${likedPinned ? "border-emerald-300" : "border-stone-200"}`}>
      <MatchedFuliPreview
        title={likedPinned ? "Liked ref" : "Matched ref"}
        state={variant.state}
        matchedAsset={matchedAsset}
        badge={likedPinned ? "liked" : "variant ref"}
        onInspect={onInspectRef}
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div><div className="text-sm font-semibold text-stone-900">{variant.label}</div><div className="mt-1 text-xs text-stone-500">{variant.summary}</div></div>
        {onFinalize ? <button onClick={() => onFinalize(variant)} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"><Trophy className="h-3.5 w-3.5" /> Final</button> : <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Liked</div>}
      </div>
      {onFeedback && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => onFeedback(variant.id, "liked")} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${feedback === "liked" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}><Heart className="h-4 w-4" /> Like</button>
          <button onClick={() => onFeedback(variant.id, "disliked")} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${feedback === "disliked" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}><X className="h-4 w-4" /> Dislike</button>
        </div>
      )}
    </div>
  );
}

export function SimulatorPage() {
  const [layoutMode, setLayoutMode] = useState<"default" | "immersive">("default");
  const [round, setRound] = useState(1);
  const [baseState, setBaseState] = useState<SimulatorState>(() => createRandomBaseState());
  const [variants, setVariants] = useState<VariantCard[]>(() => generateRoundVariants(createRandomBaseState(), 1));
  const [entryText, setEntryText] = useState("");
  const [intentSnapshot, setIntentSnapshot] = useState<IntentUnderstandingSnapshot | null>(null);
  const [entryAnalysis, setEntryAnalysis] = useState<EntryAgentResult | null>(null);
  const [currentAgentState, setCurrentAgentState] = useState<IntentIntakeAgentState | null>(null);
  const [initializationExplainability, setInitializationExplainability] = useState<InitializationExplainabilityResult | null>(null);
  const [previousVisualIntentBundle, setPreviousVisualIntentBundle] = useState<VisualIntentTestBundle | null>(null);
  const [isInspectExpanded, setIsInspectExpanded] = useState(false);
  const [selectedRefInspect, setSelectedRefInspect] = useState<SelectedRefInspectState | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "liked" | "disliked">>({});
  const [anchors, setAnchors] = useState<AnchorCard[]>([]);
  const [likedHistory, setLikedHistory] = useState<LikedHistoryCard[]>([]);
  const [finalChoice, setFinalChoice] = useState<VariantCard | null>(null);
  const [assetSourceMode, setAssetSourceMode] = useState<AssetSourceMode>("core+extended");
  const [matchMode, setMatchMode] = useState<"auto" | "stable" | "explore">("explore");
  const [seenRefIds, setSeenRefIds] = useState<string[]>([]);
  const [rejectedRefIds, setRejectedRefIds] = useState<string[]>([]);
  const [assetPoolExhausted, setAssetPoolExhausted] = useState(false);
  const [isIntentAnalyzing, setIsIntentAnalyzing] = useState(false);
  const [dismissedConfirmationSlots, setDismissedConfirmationSlots] = useState<IntakeMacroSlot[]>([]);
  const [isImmersiveQaOpen, setIsImmersiveQaOpen] = useState(true);

  const feedbackRecords = useMemo<FeedbackRecord[]>(() => Object.entries(feedbackMap).map(([variantId, value]) => ({ variantId, value })), [feedbackMap]);
  const roundMode = getRoundMode(round);
  const primarySlot = getPrimarySlot(round);
  const roundExplanation = explainRound(primarySlot, roundMode);
  const openingFamiliesForFirstTurns = useMemo(
    () => getOpeningFamiliesForFirstTurns(3).map((family) => ({
      family,
      options: family.optionIds
        .map((id) => OPENING_OPTION_INDEX.get(id))
        .filter((option): option is NonNullable<typeof option> => Boolean(option)),
    })),
    [],
  );
  const currentOpeningStep = intentSnapshot?.turnCount ?? 0;
  const activeOpeningFamily = currentOpeningStep < openingFamiliesForFirstTurns.length
    ? openingFamiliesForFirstTurns[currentOpeningStep]
    : undefined;
  const authoritativeAgentState = currentAgentState ?? intentSnapshot?.conversationState.agentState ?? intentSnapshot?.analysis.agentState ?? null;
  const openingSelectionPreview = buildOpeningSelectionPreview(authoritativeAgentState, activeOpeningFamily);
  const composerValue = entryText;
  const referenceAssets = useMemo(() => getReferenceAssets(assetSourceMode), [assetSourceMode]);
  const effectiveMatchMode = useMemo<"stable" | "explore">(() => {
    if (matchMode === "stable" || matchMode === "explore") return matchMode;
    if (round <= 2) return "explore";
    if (round <= 4) return "explore";
    return "stable";
  }, [matchMode, round]);
  const blockedRefIds = useMemo(() => [...new Set([...seenRefIds, ...rejectedRefIds])], [seenRefIds, rejectedRefIds]);

  const preferenceCenter = useMemo(() => averagePreferenceState(anchors.map((anchor) => anchor.state)), [anchors]);
  const totalAnnotatedAssetCount = useMemo(() => referenceAssets.filter((asset) => asset.annotation).length, [referenceAssets]);
  const conversationStateLogSummary = useMemo(() => {
    if (!intentSnapshot) {
      return null;
    }

    return buildConversationStateLogSummary({
      text: intentSnapshot.text,
      turnCount: intentSnapshot.turnCount,
      currentUnderstanding: intentSnapshot.currentUnderstanding,
      followUpQuestion: intentSnapshot.followUpQuestion,
      readyToGenerate: intentSnapshot.readyToGenerate,
      analysis: intentSnapshot.analysis,
      cumulativeCanvas: intentSnapshot.conversationState.cumulativeCanvas,
      initialization: initializationExplainability ?? undefined,
    });
  }, [intentSnapshot, initializationExplainability]);

  const visualIntentBundle = useMemo(() => {
    const baseAnalysis =
      intentSnapshot?.analysis ??
      (authoritativeAgentState ? buildDerivedEntryAnalysisFromAgentState(authoritativeAgentState) : null);

    if (!baseAnalysis) {
      return null;
    }

    const pkg = buildVisualIntentCompiler({
      analysis: baseAnalysis,
      freeTextInputs: intentSnapshot?.text
        ? intentSnapshot.text.split("\n").map((item) => item.trim()).filter(Boolean)
        : authoritativeAgentState?.cumulativeText.split("\n").map((item) => item.trim()).filter(Boolean) ?? [],
      selectedOptions: (intentSnapshot?.conversationState.dialogue ?? [])
        .filter((turn) => turn.source === "opening-selection")
        .map((turn, index) => ({
          questionId: `opening-${index + 1}`,
          optionId: turn.userText,
          label: turn.userText,
        })),
      turnHistory: (intentSnapshot?.conversationState.dialogue ?? []).map((turn) => ({
        turnIndex: turn.turnIndex,
        text: turn.userText,
        source: turn.source,
      })),
    });

    return buildVisualIntentTestBundle(pkg);
  }, [intentSnapshot, authoritativeAgentState]);

  const baseNearestRefs = useMemo(() => findNearestAnnotatedAssets(firstOrderFromState(baseState), referenceAssets, 3), [baseState, referenceAssets]);
  const preferenceRef = useMemo(() => {
    if (!preferenceCenter) return undefined;
    if (effectiveMatchMode === "explore") {
      return findExploratoryAnnotatedAssets(preferenceCenter, referenceAssets, { limit: 1, seenIds: seenRefIds, hardExcludeIds: blockedRefIds })[0];
    }
    return findNearestAnnotatedAssets(preferenceCenter, referenceAssets, 1, { hardExcludeIds: blockedRefIds })[0];
  }, [preferenceCenter, referenceAssets, effectiveMatchMode, seenRefIds, blockedRefIds]);

  const variantNearestRefsMap = useMemo(() => {
    if (round <= PROBING_ROUND_LIMIT) {
      return assignProbingCarriers(
        variants.map((variant) => ({
          key: variant.id,
          variantValues: firstOrderFromState(variant.state),
          changedSlots: variant.changedSlots.filter(
            (s): s is "color" | "motif" | "arrangement" =>
              s === "color" || s === "motif" || s === "arrangement",
          ),
        })),
        referenceAssets,
        { hardExcludeIds: blockedRefIds, seenIds: seenRefIds },
      );
    }
    return assignDiverseNearestAnnotatedAssets(
      variants.map((variant) => ({ key: variant.id, values: firstOrderFromState(variant.state) })),
      referenceAssets,
      {
        diversityPenalty: 0.2,
        nearDuplicatePenalty: 0.1,
        duplicateThreshold: 0.14,
        explorationSeenIds: seenRefIds,
        noveltyBonus: 0.14,
        mode: effectiveMatchMode,
        hardExcludeIds: blockedRefIds,
      },
    );
  }, [variants, referenceAssets, seenRefIds, effectiveMatchMode, blockedRefIds, round]);

  const handleReset = () => {
    const nextBase = createRandomBaseState();
    setRound(1);
    setBaseState(nextBase);
    setVariants(generateRoundVariants(nextBase, 1));
    setEntryText("");
    setIntentSnapshot(null);
    setEntryAnalysis(null);
    setCurrentAgentState(null);
    setInitializationExplainability(null);
    setPreviousVisualIntentBundle(null);
    setIsInspectExpanded(false);
    setSelectedRefInspect(null);
    setFeedbackMap({});
    setAnchors([]);
    setLikedHistory([]);
    setFinalChoice(null);
    setSeenRefIds([]);
    setRejectedRefIds([]);
    setAssetPoolExhausted(false);
    setDismissedConfirmationSlots([]);
    setIsImmersiveQaOpen(true);
  };

  const handleFeedback = (variantId: string, value: "liked" | "disliked") => {
    setFeedbackMap((prev) => ({ ...prev, [variantId]: prev[variantId] === value ? undefined as never : value }));
  };

  const submitIntentText = async (rawText: string) => {
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      setIntentSnapshot(null);
      setEntryAnalysis(null);
      return;
    }

    setIsIntentAnalyzing(true);
    try {
      const signal: TextIntakeSignal = {
        type: "text",
        text: trimmedText,
        turnIndex: (intentSnapshot?.turnCount ?? 0) + 1,
        source: "user",
      };
      const nextSnapshot = await buildIntentStabilizationSnapshot({
        previousSnapshot: intentSnapshot,
        previousText: intentSnapshot?.text,
        signal,
        previousTurnCount: intentSnapshot?.turnCount ?? 0,
        currentAgentStateOverride: authoritativeAgentState ?? undefined,
      });

      setPreviousVisualIntentBundle(visualIntentBundle);
      setIntentSnapshot(nextSnapshot);
      setEntryAnalysis(nextSnapshot.analysis);
      setCurrentAgentState(nextSnapshot.analysis.agentState ?? null);
      setEntryText("");
    } finally {
      setIsIntentAnalyzing(false);
    }
  };

  const handleContinueIntent = async () => {
    await submitIntentText(entryText);
  };

  const handleOpeningOptionClick = async (label: string, _family: OpeningQuestionFamilyDefinition) => {
    const selectedOption = activeOpeningFamily?.options.find((option) => option.label === label);
    if (!selectedOption) {
      return;
    }

    const signal: OpeningSelectionSignal = {
      type: "opening-selection",
      selections: [selectedOption.id],
      turnIndex: authoritativeAgentState?.turnIndex ?? 0,
      source: "user",
    };
    const nextAgentState = await updateAgentStateFromSignal(
      signal,
      authoritativeAgentState ?? createIntentIntakeAgentState(),
    );
    const nextSnapshot = buildIntentStabilizationSnapshotFromAgentState({
      previousSnapshot: intentSnapshot,
      previousText: intentSnapshot?.text,
      previousTurnCount: intentSnapshot?.turnCount ?? 0,
      currentAgentState: nextAgentState,
      committedReplyText: selectedOption.label,
      source: "opening-selection",
    });
    setPreviousVisualIntentBundle(visualIntentBundle);
    setCurrentAgentState(nextAgentState);
    setIntentSnapshot(nextSnapshot);
    setEntryAnalysis(nextSnapshot.analysis);
    setEntryText("");
  };

  const handleConfirmDirection = (slot: IntakeMacroSlot, choice: "confirm" | "defer") => {
    if (choice === "confirm" && intentSnapshot) {
      const confirmation = intentSnapshot.analysis.intakeGoalState?.pendingConfirmations.find((c) => c.slot === slot);
      setIntentSnapshot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          conversationState: {
            ...prev.conversationState,
            lockedSlots: { ...prev.conversationState.lockedSlots, [slot]: confirmation?.direction ?? "" },
          },
        };
      });
    }
    setDismissedConfirmationSlots((prev) => [...prev, slot]);
  };

  const handleStartFromText = () => {
    if (!intentSnapshot?.readyToGenerate) {
      return;
    }

    const analysis = intentSnapshot.analysis;
    const initialization = buildInitializationExplainability(analysis);
    const nextBase = initialization.finalBase;

    setRound(1);
    setBaseState(nextBase);
    setVariants(generateRoundVariants(nextBase, 1));
    setEntryAnalysis(analysis);
    setInitializationExplainability(initialization);
    setIsInspectExpanded(false);
    setSelectedRefInspect(null);
    setFeedbackMap({});
    setAnchors([]);
    setLikedHistory([]);
    setFinalChoice(null);
    setSeenRefIds([]);
    setRejectedRefIds([]);
    setAssetPoolExhausted(false);
    setIsImmersiveQaOpen(false);
  };

  const handleContinue = () => {
    if (feedbackRecords.length === 0 || assetPoolExhausted) return;

    const nextBase = reduceRound(baseState, variants, feedbackRecords);
    const likedAnchors = collectLikedAnchors(variants, feedbackRecords);
    const likedVariantIds = new Set(feedbackRecords.filter((item) => item.value === "liked").map((item) => item.variantId));
    const dislikedVariantIds = new Set(feedbackRecords.filter((item) => item.value === "disliked").map((item) => item.variantId));
    const nextRound = round + 1;

    const likedHistoryBatch = variants
      .filter((variant) => likedVariantIds.has(variant.id))
      .map((variant) => ({ id: `${variant.id}-liked`, round: variant.round, variant, matchedAsset: variantNearestRefsMap[variant.id]?.[0] }));

    const dislikedRefIds = variants
      .filter((variant) => dislikedVariantIds.has(variant.id))
      .map((variant) => variantNearestRefsMap[variant.id]?.[0]?.imageId)
      .filter(Boolean) as string[];

    const chosenRefIds = [
      ...likedHistoryBatch.map((item) => item.matchedAsset?.imageId).filter(Boolean),
      ...dislikedRefIds,
      ...Object.values(variantNearestRefsMap).flat().map((asset) => asset.imageId),
    ] as string[];

    const nextSeen = [...seenRefIds, ...chosenRefIds];
    const nextRejected = [...rejectedRefIds, ...dislikedRefIds];
    const nextBlocked = [...new Set(nextRejected)];

    setSeenRefIds(nextSeen);
    setRejectedRefIds(nextRejected);
    setLikedHistory((prev) => [...prev, ...likedHistoryBatch]);
    setAnchors((prev) => [...prev, ...likedAnchors]);
    setBaseState(nextBase);
    setRound(nextRound);
    setVariants(generateRoundVariants(nextBase, nextRound));
    setSelectedRefInspect(null);
    setFeedbackMap({});
    setAssetPoolExhausted(nextBlocked.length >= totalAnnotatedAssetCount);
  };

  const canContinue = feedbackRecords.length > 0 && !assetPoolExhausted;

  const layoutModeToggle = (
    <div className="inline-flex rounded-2xl border border-stone-300 bg-white p-1 text-xs">
      <button
        type="button"
        onClick={() => setLayoutMode("default")}
        className={`rounded-xl px-3 py-1.5 font-medium ${layoutMode === "default" ? "bg-stone-900 text-white" : "text-stone-600"}`}
      >
        当前版
      </button>
      <button
        type="button"
        onClick={() => setLayoutMode("immersive")}
        className={`rounded-xl px-3 py-1.5 font-medium ${layoutMode === "immersive" ? "bg-stone-900 text-white" : "text-stone-600"}`}
      >
        少参数沉浸版
      </button>
    </div>
  );

  const intentComposer = (
    <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Expert-guided conversation</div>
          <div className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            先像和资深地毯设计师聊 2-3 轮。每次我会先接住你刚说的判断，再只推进一个最值得确认的分叉。
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
          当前轮次：{intentSnapshot?.turnCount ?? 0}/7
          <div className="mt-1">{intentSnapshot?.readyToGenerate ? "方向已经够稳，可以进入探索。" : "还在收关键边界，不急着跳图。"} </div>
        </div>
      </div>

      <div className="mt-5 max-h-[520px] space-y-4 overflow-y-auto pr-1">
        {!intentSnapshot && (
          <DialogueBubble
            role="expert"
            text="先告诉我你想让这块地毯解决什么感觉问题。可以从气质、颜色、图案存在感，或者你脑子里的一句意象开始。"
          />
        )}

        {intentSnapshot?.conversationState.dialogue.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <DialogueBubble role="user" text={turn.userText} />
            <DialogueBubble role="expert" text={turn.expertReply} />
          </div>
        ))}
      </div>

      {activeOpeningFamily && (
        <div className="mt-5 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            可直接回答这一步
          </div>
          <div className="mt-2 text-sm leading-6 text-stone-700">
            {formatOpeningPromptForPanel(activeOpeningFamily.family.prompt)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeOpeningFamily.options.map((option) => {
              const selected = hasOpeningOptionBeenApplied(authoritativeAgentState, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => void handleOpeningOptionClick(option.label, activeOpeningFamily.family)}
                  disabled={isIntentAnalyzing}
                  className={`rounded-2xl border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                  } ${isIntentAnalyzing ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {activeOpeningFamily.family.allowsMultiple && openingSelectionPreview && (
            <div className="mt-3 text-xs text-stone-500">
              当前已选：{openingSelectionPreview}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">继续补充</div>
        <textarea
          value={composerValue}
          onChange={(event) => setEntryText(event.target.value)}
          placeholder={intentSnapshot ? "顺着上面的回应继续补一句就行" : "例如：想给卧室找一块更安静一点、不要太花的地毯"}
          className="mt-3 min-h-[112px] w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleContinueIntent}
            disabled={isIntentAnalyzing}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white"
          >
            <Play className="h-4 w-4" /> {isIntentAnalyzing ? "分析中..." : intentSnapshot ? "发送这句" : "开始对话"}
          </button>
          <button
            type="button"
            onClick={handleStartFromText}
            disabled={!intentSnapshot?.readyToGenerate}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> 进入探索
          </button>
        </div>
      </div>
    </div>
  );

  const understandingPanel = (
    <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Side summary</div>
      <div className="mt-3 space-y-3 text-sm text-stone-600">
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Current understanding</div>
          <div className="mt-2 text-sm leading-6 text-stone-700">
            {intentSnapshot?.currentUnderstanding ?? "前三轮会依次确认氛围、空间、图案这三条主轴；这一轮先只问一个维度。"}
          </div>
          {!intentSnapshot && authoritativeAgentState && authoritativeAgentState.slots.some((slot) => slot.topScore > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {authoritativeAgentState.slots
                .filter((slot) => slot.topScore > 0)
                .map((slot) => (
                  <SlotPhasePill
                    key={slot.slot}
                    slot={{
                      slot: slot.slot,
                      phase: mapMacroStatusToDisplayPhase(slot.status),
                      topScore: slot.topScore,
                      topDirection: slot.topDirection,
                    }}
                  />
                ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Expert next move</div>
          <div className="mt-2 text-sm leading-6 text-stone-700">
            {intentSnapshot?.followUpQuestion ?? (activeOpeningFamily
              ? formatOpeningPromptForPanel(activeOpeningFamily.family.prompt)
              : "我会先抓最值得确认的一点，再问你下一句。")}
          </div>
        </div>
        {intentSnapshot?.analysis.intakeGoalState && (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">槽位进度</div>
            <div className="flex flex-wrap gap-1.5">
              {intentSnapshot.analysis.intakeGoalState.slots.map((slot) => (
                <SlotPhasePill key={slot.slot} slot={slot} />
              ))}
            </div>
          </div>
        )}
        {(() => {
          const pending = (intentSnapshot?.analysis.intakeGoalState?.pendingConfirmations ?? []).filter(
            (c) => !dismissedConfirmationSlots.includes(c.slot),
          );
          if (pending.length === 0) return null;
          return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">需要确认方向</div>
              <div className="space-y-3">
                {pending.map((confirmation) => (
                  <div key={confirmation.slot}>
                    <div className="text-sm leading-5 text-stone-700">{confirmation.prompt}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmDirection(confirmation.slot, "confirm")}
                        className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        确认方向
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDirection(confirmation.slot, "defer")}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700"
                      >
                        先看其他
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {visualIntentBundle && <VisualIntentBundleCard bundle={visualIntentBundle} previousBundle={previousVisualIntentBundle} />}
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs leading-5 text-stone-500">
          <div className="mb-1">
            分析状态：
            <span className="ml-1 font-semibold text-stone-700">
              {isIntentAnalyzing ? "analyzing with semantic pipeline..." : conversationStateLogSummary?.questionPlanning.llmStatus ?? "waiting for input"}
            </span>
          </div>
          当前轮次：{intentSnapshot?.turnCount ?? 0}/5
          <div className="mt-1">
            {intentSnapshot?.readyToGenerate ? "当前方向已经足够粗稳，可以进入第一轮探索。" : "还不会立刻进入探索，先把最关键的一点再收清楚。"}
          </div>
          {!isIntentAnalyzing && conversationStateLogSummary?.questionPlanning.llmSummary && (
            <div className="mt-2 text-stone-500">{conversationStateLogSummary.questionPlanning.llmSummary}</div>
          )}
        </div>
      </div>
    </div>
  );

  const selectedInspectPanel = selectedRefInspect ? (
    <MatchedRefInspectPanel
      asset={selectedRefInspect.asset}
      baseState={baseState}
      label={selectedRefInspect.label}
      onClose={() => setSelectedRefInspect(null)}
    />
  ) : null;

  const currentVariantsList = (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current variants</div>
          <div className="mt-1 text-sm text-stone-600">点击继续生成下一轮后：liked 保留到下方，disliked 消失，新出现的素材不会重复，直到素材池穷尽。</div>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {variants.map((variant) => (
          <VariantCardView
            key={variant.id}
            variant={variant}
            feedback={feedbackMap[variant.id]}
            matchedAsset={variantNearestRefsMap[variant.id]?.[0]}
            onFeedback={handleFeedback}
            onFinalize={(nextFinal) => setFinalChoice(nextFinal)}
            onInspectRef={(asset) => setSelectedRefInspect({ label: `${variant.label} matched ref`, asset })}
          />
        ))}
      </div>
    </div>
  );

  const previouslyLikedList = likedHistory.length > 0 ? (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Previously liked</div>
      <div className="grid gap-5 xl:grid-cols-2">
        {likedHistory.map((item) => (
          <VariantCardView key={item.id} variant={item.variant} matchedAsset={item.matchedAsset} likedPinned />
        ))}
      </div>
    </div>
  ) : (
    <div className="text-sm text-stone-500">还没有累计 liked 结果，先在当前列表里标记喜欢项。</div>
  );

  if (layoutMode === "immersive") {
    return (
      <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f7f3ee_0%,#efe7dc_100%)] text-stone-900">
        <div className="fixed inset-x-0 top-0 z-40 border-b border-stone-200 bg-white/88 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-4 lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">carpet gen simulator</div>
              <div className="mt-1 text-xl font-semibold text-stone-900">参数闭环数值模拟器</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {layoutModeToggle}
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600">Round <span className="font-semibold text-stone-900">{round}</span></div>
              <button
                type="button"
                onClick={() => setIsImmersiveQaOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
              >
                {isImmersiveQaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {isImmersiveQaOpen ? "收起问答面板" : "展开问答面板"}
              </button>
            </div>
          </div>
        </div>

        {isImmersiveQaOpen && (
          <div className="fixed left-1/2 top-24 z-30 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
            <div className="rounded-[32px] border border-stone-200 bg-white/94 p-5 shadow-lg backdrop-blur-md">
              <div className="space-y-4">
                {intentComposer}
                {understandingPanel}
              </div>
            </div>
          </div>
        )}

        <div className={`mx-auto h-full max-w-[1600px] px-6 pb-[240px] pt-28 lg:px-8 ${isImmersiveQaOpen ? "pt-[680px]" : "pt-28"}`}>
          <div className="grid h-full gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-stone-200 bg-white/78 p-5 shadow-sm backdrop-blur-sm">
              <div className="h-full pr-1">{currentVariantsList}</div>
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white/78 p-5 shadow-sm backdrop-blur-sm">
              <div className="h-full overflow-y-auto pr-1">{previouslyLikedList}</div>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/92 backdrop-blur-md">
          <div className="mx-auto max-w-[1600px] px-6 py-4 lg:px-8">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div>{intentComposer}</div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"><RefreshCw className="h-4 w-4" /> 重置</button>
                <button onClick={handleContinue} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4" /> 继续生成下一轮</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ee_0%,#f1ebe2_100%)] text-stone-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-stone-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">carpet gen simulator</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">参数闭环数值模拟器</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">先不接真实生图。这里先模拟：随机 base → 变体卡牌 → 喜欢/不喜欢反馈 → reducer 风格更新 → 下一轮参数。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {layoutModeToggle}
            <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"><RefreshCw className="h-4 w-4" /> 重置</button>
            <button onClick={handleContinue} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4" /> 继续生成下一轮</button>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
            <div>{intentComposer}</div>
            <div>{understandingPanel}</div>
          </div>

          {conversationStateLogSummary && (
            <div className="mt-5">
              <ConversationStateInspectCard
                summary={conversationStateLogSummary}
                expanded={isInspectExpanded}
                onToggle={() => setIsInspectExpanded((prev) => !prev)}
              />
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Base state</div>
                  <div className="mt-1 text-lg font-semibold text-stone-900">Round {round}</div>
                </div>
                {finalChoice && <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">已选最终方案</div>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <MatchedFuliPreview
                  title="Base ref"
                  state={baseState}
                  matchedAsset={baseNearestRefs[0]}
                  badge="base ref"
                  onInspect={(asset) => setSelectedRefInspect({ label: "base ref", asset })}
                />
                <MatchedFuliPreview title="Preference ref" matchedAsset={preferenceRef} badge="preference ref" />
              </div>
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Round logic</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-800">
                  <span>本轮类型：</span><span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${roundMode === "direct" ? "bg-stone-900 text-white" : "bg-amber-100 text-amber-800"}`}>{roundMode}</span>
                  <span>主更新对象：</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">{primarySlot}</span>
                  <span>匹配模式：</span>
                  <span className="inline-flex rounded-full border border-stone-200 bg-white p-1 text-xs">
                    <button onClick={() => setMatchMode("auto")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "auto" ? "bg-stone-900 text-white" : "text-stone-600"}`}>auto</button>
                    <button onClick={() => setMatchMode("stable")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "stable" ? "bg-stone-900 text-white" : "text-stone-600"}`}>stable</button>
                    <button onClick={() => setMatchMode("explore")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "explore" ? "bg-stone-900 text-white" : "text-stone-600"}`}>explore</button>
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
                  当前生效模式：<span className="font-semibold text-stone-800">{effectiveMatchMode}</span>
                  {matchMode === "auto" && <span> · auto 在前两轮默认更 explorative，后续逐步转稳</span>}
                  <div className="mt-2 text-stone-500">Preference ref 只在点击“继续生成下一轮”后，基于已提交的 liked anchors 更新。</div>
                  {assetPoolExhausted && <div className="mt-2 font-medium text-amber-700">素材池已穷尽。重置试试。</div>}
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{roundExplanation.description}</p>
              </div>
              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Direct visual controls</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SlotSnapshot title="Color" values={baseState.color} tone="direct" highlighted={primarySlot === "color"} />
                  <SlotSnapshot title="Motif" values={baseState.motif} tone="direct" highlighted={primarySlot === "motif"} />
                  <SlotSnapshot title="Arrangement" values={baseState.arrangement} tone="direct" highlighted={primarySlot === "arrangement"} />
                </div>
                <div className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Modulation state</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SlotSnapshot title="Impression" values={baseState.impression} tone="meta" highlighted={primarySlot === "impression"} />
                  <SlotSnapshot title="Style" values={baseState.style} tone="meta" highlighted={primarySlot === "style"} />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Closest FULI refs</div>
                <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1 text-xs">
                  <button onClick={() => setAssetSourceMode("core-only")} className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core-only" ? "bg-stone-900 text-white" : "text-stone-600"}`}>core only</button>
                  <button onClick={() => setAssetSourceMode("core+extended")} className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core+extended" ? "bg-stone-900 text-white" : "text-stone-600"}`}>core + extended</button>
                </div>
              </div>
              <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">当前 source：<span className="font-semibold text-stone-800">{assetSourceMode}</span> · blocked refs {blockedRefIds.length}/{totalAnnotatedAssetCount}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {baseNearestRefs.map((asset) => (
                  <div key={asset.imageId} className="space-y-2">
                    <RefAssetCard asset={asset} />
                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">confidence {asset.annotation?.confidence ?? "n/a"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Liked anchors</div>
              {anchors.length === 0 ? (
                <p className="text-sm text-stone-500">还没有保留下来的喜欢卡牌。先在当前 round 里标记喜欢项。</p>
              ) : (
                <div className="space-y-3">
                  {anchors.map((anchor) => (
                    <div key={`${anchor.id}-${anchor.round}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="flex items-center justify-between text-sm font-medium text-stone-800"><span>{anchor.label}</span><span className="text-xs text-stone-500">Round {anchor.round}</span></div>
                      <div className="mt-1 text-xs text-stone-500">{anchor.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {finalChoice && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><Trophy className="h-4 w-4" /> 最终选择</div>
                <div className="text-sm text-stone-700">{finalChoice.label}</div>
                <div className="mt-1 text-xs text-stone-500">{finalChoice.summary}</div>
              </div>
            )}
          </div>

          <div>
            {selectedInspectPanel && <div className="mb-5">{selectedInspectPanel}</div>}
            {currentVariantsList}
            {likedHistory.length > 0 && <div className="mt-6">{previouslyLikedList}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
