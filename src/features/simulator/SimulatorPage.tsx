import { useMemo, useState } from "react";
import { RefreshCw, Play, Heart, X, Trophy, ChevronDown, ChevronUp } from "lucide-react";

import { collectLikedAnchors, createRandomBaseState, generateRoundVariants, getPrimarySlot, getRoundMode, reduceRound } from "./mockEngine";
import { buildIntentStabilizationSnapshot, type IntentUnderstandingSnapshot } from "./intentStabilization";
import { explainRound } from "./ontology";
import { buildInitializationExplainability } from "./semanticInitialization";
import { buildConversationStateLogSummary, type ConversationStateLogSummary, type InitializationExplainabilityResult } from "./explainability";
import { MatchedRefInspectPanel } from "./MatchedRefInspectPanel";
import { getReferenceAssets, type AssetSourceMode } from "@/core/assets/assetSources";
import { assignDiverseNearestAnnotatedAssets, assignProbingCarriers, findNearestAnnotatedAssets, findExploratoryAnnotatedAssets } from "@/core/assets/matching";
import type { AnnotatedAssetRecord, FirstOrderSlotValues } from "@/core/assets/types";
import { analyzeEntryText, type EntryAgentResult } from "@/features/entryAgent";
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Resolution + understanding debug</div>
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Question trace debug</div>
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Cumulative semantic canvas</div>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <div><span className="font-medium text-stone-800">Source:</span> {summary.cumulativeCanvas.source}</div>
              <div><span className="font-medium text-stone-800">Raw cues:</span> {summary.cumulativeCanvas.rawCues.join(" / ")}</div>
              <div><span className="font-medium text-stone-800">Conceptual axes:</span> {summary.cumulativeCanvas.conceptualAxes.join(" / ")}</div>
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
  const [round, setRound] = useState(1);
  const [baseState, setBaseState] = useState<SimulatorState>(() => createRandomBaseState());
  const [variants, setVariants] = useState<VariantCard[]>(() => generateRoundVariants(createRandomBaseState(), 1));
  const [entryText, setEntryText] = useState("");
  const [intentSnapshot, setIntentSnapshot] = useState<IntentUnderstandingSnapshot | null>(null);
  const [entryAnalysis, setEntryAnalysis] = useState<EntryAgentResult | null>(null);
  const [initializationExplainability, setInitializationExplainability] = useState<InitializationExplainabilityResult | null>(null);
  const [isInspectExpanded, setIsInspectExpanded] = useState(false);
  const [selectedRefInspect, setSelectedRefInspect] = useState<SelectedRefInspectState | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "liked" | "disliked">>({});
  const [anchors, setAnchors] = useState<AnchorCard[]>([]);
  const [likedHistory, setLikedHistory] = useState<LikedHistoryCard[]>([]);
  const [finalChoice, setFinalChoice] = useState<VariantCard | null>(null);
  const [assetSourceMode, setAssetSourceMode] = useState<AssetSourceMode>("core+extended");
  const [matchMode, setMatchMode] = useState<"auto" | "stable" | "explore">("auto");
  const [seenRefIds, setSeenRefIds] = useState<string[]>([]);
  const [rejectedRefIds, setRejectedRefIds] = useState<string[]>([]);
  const [assetPoolExhausted, setAssetPoolExhausted] = useState(false);
  const [isIntentAnalyzing, setIsIntentAnalyzing] = useState(false);

  const feedbackRecords = useMemo<FeedbackRecord[]>(() => Object.entries(feedbackMap).map(([variantId, value]) => ({ variantId, value })), [feedbackMap]);
  const roundMode = getRoundMode(round);
  const primarySlot = getPrimarySlot(round);
  const roundExplanation = explainRound(primarySlot, roundMode);
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

  const baseNearestRefs = useMemo(() => findNearestAnnotatedAssets(firstOrderFromState(baseState), referenceAssets, 3), [baseState, referenceAssets]);
  const preferenceRef = useMemo(() => {
    if (!preferenceCenter) return undefined;
    if (effectiveMatchMode === "explore") return findExploratoryAnnotatedAssets(preferenceCenter, referenceAssets, { limit: 1, seenIds: seenRefIds, hardExcludeIds: blockedRefIds })[0];
    return findNearestAnnotatedAssets(preferenceCenter, referenceAssets, 1, { hardExcludeIds: blockedRefIds })[0];
  }, [preferenceCenter, referenceAssets, effectiveMatchMode, seenRefIds, blockedRefIds]);

  const variantNearestRefsMap = useMemo(() => {
    if (round <= PROBING_ROUND_LIMIT) {
      // Probing rounds: use hypothesis-aware carrier assignment so each card
      // genuinely represents a different exploration direction rather than
      // clustering around the same nearest asset.
      return assignProbingCarriers(
        variants.map((variant) => ({
          key: variant.id,
          variantValues: firstOrderFromState(variant.state),
          changedSlots: variant.changedSlots.filter(
            (s): s is "color" | "motif" | "arrangement" =>
              s === "color" || s === "motif" || s === "arrangement"
          ),
        })),
        referenceAssets,
        { hardExcludeIds: blockedRefIds, seenIds: seenRefIds }
      );
    }
    return assignDiverseNearestAnnotatedAssets(
      variants.map((variant) => ({ key: variant.id, values: firstOrderFromState(variant.state) })),
      referenceAssets,
      { diversityPenalty: 0.2, nearDuplicatePenalty: 0.1, duplicateThreshold: 0.14, explorationSeenIds: seenRefIds, noveltyBonus: 0.14, mode: effectiveMatchMode, hardExcludeIds: blockedRefIds }
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
    setInitializationExplainability(null);
    setIsInspectExpanded(false);
    setSelectedRefInspect(null);
    setFeedbackMap({});
    setAnchors([]);
    setLikedHistory([]);
    setFinalChoice(null);
    setSeenRefIds([]);
    setRejectedRefIds([]);
    setAssetPoolExhausted(false);
  };

  const handleFeedback = (variantId: string, value: "liked" | "disliked") => {
    setFeedbackMap((prev) => ({ ...prev, [variantId]: prev[variantId] === value ? undefined as never : value }));
  };

  const handleContinueIntent = async () => {
    const trimmedText = entryText.trim();

    if (!trimmedText) {
      setIntentSnapshot(null);
      setEntryAnalysis(null);
      return;
    }

    setIsIntentAnalyzing(true);
    try {
      const nextSnapshot = await buildIntentStabilizationSnapshot({
        previousSnapshot: intentSnapshot,
        previousText: intentSnapshot?.text,
        nextReply: trimmedText,
        previousTurnCount: intentSnapshot?.turnCount ?? 0,
      });

      setIntentSnapshot(nextSnapshot);
      setEntryAnalysis(nextSnapshot.analysis);
      setEntryText("");
    } finally {
      setIsIntentAnalyzing(false);
    }
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
            <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"><RefreshCw className="h-4 w-4" /> 重置</button>
            <button onClick={handleContinue} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4" /> 继续生成下一轮</button>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Intent stabilization</div>
              <div className="mt-2 text-sm leading-6 text-stone-600">
                先用 2-3 轮简短交流把方向收一收，再进入第一轮视觉探索。
              </div>
              <textarea
                value={entryText}
                onChange={(event) => setEntryText(event.target.value)}
                placeholder={intentSnapshot ? "顺着上面的问题继续回应即可" : "例如：想给卧室找一块更安静一点、不要太花的地毯"}
                className="mt-4 min-h-[112px] w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleContinueIntent}
                  disabled={isIntentAnalyzing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white"
                >
                  <Play className="h-4 w-4" /> {isIntentAnalyzing ? "分析中..." : intentSnapshot ? "继续回应" : "开始理解"}
                </button>
                <button
                  type="button"
                  onClick={handleStartFromText}
                  disabled={!intentSnapshot?.readyToGenerate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-4 w-4" /> 进入探索
                </button>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
                  最多 3 轮，最快 2 轮进入探索。
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current understanding</div>
              <div className="mt-3 space-y-3 text-sm text-stone-600">
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Current understanding</div>
                  <div className="mt-2 text-sm leading-6 text-stone-700">
                    {intentSnapshot?.currentUnderstanding ?? "你先说一句你的直觉，我会先帮你收一个粗方向。"}
                  </div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Next question</div>
                  <div className="mt-2 text-sm leading-6 text-stone-700">
                    {intentSnapshot?.followUpQuestion ?? "我会先抓最值得确认的一点，再问你下一句。"}
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs leading-5 text-stone-500">
                  <div className="mb-1">
                    分析状态：
                    <span className="ml-1 font-semibold text-stone-700">
                      {isIntentAnalyzing ? "analyzing with semantic pipeline..." : conversationStateLogSummary?.questionPlanning.llmStatus ?? "waiting for input"}
                    </span>
                  </div>
                  当前轮次：{intentSnapshot?.turnCount ?? 0}/3
                  <div className="mt-1">
                    {intentSnapshot?.readyToGenerate
                      ? "当前方向已经足够粗稳，可以进入第一轮探索。"
                      : "还不会立刻进入探索，先把最关键的一点再收清楚。"}
                  </div>
                  {!isIntentAnalyzing && conversationStateLogSummary?.questionPlanning.llmSummary && (
                    <div className="mt-2 text-stone-500">{conversationStateLogSummary.questionPlanning.llmSummary}</div>
                  )}
                </div>
              </div>
            </div>
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
              <div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Base State</div><div className="mt-1 text-lg font-semibold text-stone-900">Round {round}</div></div>{finalChoice && <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">已选最终方案</div>}</div>
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
                  <span className="inline-flex rounded-full border border-stone-200 bg-white p-1 text-xs"><button onClick={() => setMatchMode("auto")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "auto" ? "bg-stone-900 text-white" : "text-stone-600"}`}>auto</button><button onClick={() => setMatchMode("stable")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "stable" ? "bg-stone-900 text-white" : "text-stone-600"}`}>stable</button><button onClick={() => setMatchMode("explore")} className={`rounded-full px-3 py-1 font-medium ${matchMode === "explore" ? "bg-stone-900 text-white" : "text-stone-600"}`}>explore</button></span>
                </div>
                <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">当前生效模式：<span className="font-semibold text-stone-800">{effectiveMatchMode}</span>{matchMode === "auto" && <span> · auto 在前两轮默认更 explorative，后续逐步转稳</span>}<div className="mt-2 text-stone-500">Preference ref 只在点击“继续生成下一轮”后，基于已提交的 liked anchors 更新。</div>{assetPoolExhausted && <div className="mt-2 font-medium text-amber-700">素材池已穷尽。重置试试。</div>}</div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{roundExplanation.description}</p>
              </div>
              <div className="mt-4 space-y-3"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Direct visual controls</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><SlotSnapshot title="Color" values={baseState.color} tone="direct" highlighted={primarySlot === "color"} /><SlotSnapshot title="Motif" values={baseState.motif} tone="direct" highlighted={primarySlot === "motif"} /><SlotSnapshot title="Arrangement" values={baseState.arrangement} tone="direct" highlighted={primarySlot === "arrangement"} /></div><div className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Modulation state</div><div className="grid gap-3 md:grid-cols-2"><SlotSnapshot title="Impression" values={baseState.impression} tone="meta" highlighted={primarySlot === "impression"} /><SlotSnapshot title="Style" values={baseState.style} tone="meta" highlighted={primarySlot === "style"} /></div></div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Closest FULI refs</div><div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1 text-xs"><button onClick={() => setAssetSourceMode("core-only")} className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core-only" ? "bg-stone-900 text-white" : "text-stone-600"}`}>core only</button><button onClick={() => setAssetSourceMode("core+extended")} className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core+extended" ? "bg-stone-900 text-white" : "text-stone-600"}`}>core + extended</button></div></div><div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">当前 source：<span className="font-semibold text-stone-800">{assetSourceMode}</span> · blocked refs {blockedRefIds.length}/{totalAnnotatedAssetCount}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{baseNearestRefs.map((asset) => <div key={asset.imageId} className="space-y-2"><RefAssetCard asset={asset} /><div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">confidence {asset.annotation?.confidence ?? "n/a"}</div></div>)}</div></div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm"><div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Liked anchors</div>{anchors.length === 0 ? <p className="text-sm text-stone-500">还没有保留下来的喜欢卡牌。先在当前 round 里标记喜欢项。</p> : <div className="space-y-3">{anchors.map((anchor) => <div key={`${anchor.id}-${anchor.round}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3"><div className="flex items-center justify-between text-sm font-medium text-stone-800"><span>{anchor.label}</span><span className="text-xs text-stone-500">Round {anchor.round}</span></div><div className="mt-1 text-xs text-stone-500">{anchor.summary}</div></div>)}</div>}</div>
            {finalChoice && <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><Trophy className="h-4 w-4" /> 最终选择</div><div className="text-sm text-stone-700">{finalChoice.label}</div><div className="mt-1 text-xs text-stone-500">{finalChoice.summary}</div></div>}
          </div>

          <div>
            {selectedRefInspect && (
              <div className="mb-5">
                <MatchedRefInspectPanel
                  asset={selectedRefInspect.asset}
                  baseState={baseState}
                  label={selectedRefInspect.label}
                  onClose={() => setSelectedRefInspect(null)}
                />
              </div>
            )}
            <div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current variants</div><div className="mt-1 text-sm text-stone-600">点击继续生成下一轮后：liked 保留到下方，disliked 消失，新出现的素材不会重复，直到素材池穷尽。</div></div></div>
            <div className="grid gap-5 xl:grid-cols-2">{variants.map((variant) => <VariantCardView key={variant.id} variant={variant} feedback={feedbackMap[variant.id]} matchedAsset={variantNearestRefsMap[variant.id]?.[0]} onFeedback={handleFeedback} onFinalize={(nextFinal) => setFinalChoice(nextFinal)} onInspectRef={(asset) => setSelectedRefInspect({ label: `${variant.label} matched ref`, asset })} />)}</div>
            {likedHistory.length > 0 && <div className="mt-6"><div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Previously liked</div><div className="grid gap-5 xl:grid-cols-2">{likedHistory.map((item) => <VariantCardView key={item.id} variant={item.variant} matchedAsset={item.matchedAsset} likedPinned />)}</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
