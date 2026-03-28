import { useMemo, useState } from "react";
import { RefreshCw, Play, Heart, X, Trophy } from "lucide-react";

import { collectLikedAnchors, createRandomBaseState, generateRoundVariants, getPrimarySlot, getRoundMode, reduceRound } from "./mockEngine";
import { explainRound } from "./ontology";
import { getReferenceAssets, type AssetSourceMode } from "@/core/assets/assetSources";
import { findNearestAnnotatedAssets } from "@/core/assets/matching";
import type { AnnotatedAssetRecord } from "@/core/assets/types";
import type { AnchorCard, FeedbackRecord, SimulatorState, VariantCard } from "./types";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
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
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(80,55,40,0.16) 0px, rgba(80,55,40,0.16) 8px, transparent 8px, transparent 28px)",
          opacity: opacityA,
          transform: `scale(${0.95 + state.motif.complexity * 0.1}) rotate(${(state.arrangement.direction - 0.5) * 10}deg)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 20px)",
          opacity: opacityB,
          transform: `translateY(${(state.arrangement.spacing - 0.5) * 12}px)`,
        }}
      />
      <div className="absolute bottom-3 left-3 rounded-full bg-white/75 px-3 py-1 text-xs text-stone-700 backdrop-blur-sm">
        calm {formatPercent(state.impression.calm)} · graphic {formatPercent(state.style.graphic)}
      </div>
    </div>
  );
}

function MatchedFuliPreview({
  state,
  matchedAsset,
}: {
  state: SimulatorState;
  matchedAsset?: AnnotatedAssetRecord & { distance: number };
}) {
  if (!matchedAsset) {
    return <MiniPreview state={state} />;
  }

  return (
    <div className="relative h-40 overflow-hidden rounded-2xl border border-stone-300 bg-stone-100">
      <img src={matchedAsset.imageUrl} alt={matchedAsset.title} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-3">
        <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-stone-800 backdrop-blur-sm">
          matched FULI ref · dist {matchedAsset.distance.toFixed(2)}
        </div>
        <div className="mt-2 text-sm font-semibold text-white">{matchedAsset.title}</div>
        <div className="mt-1 text-xs text-white/85">
          source {matchedAsset.annotation?.annotationSource ?? (matchedAsset.tags?.includes("extended") ? "extended-registry" : "unknown")}
        </div>
      </div>
    </div>
  );
}

function SlotSnapshot({
  title,
  values,
  tone = "direct",
  highlighted = false,
}: {
  title: string;
  values: Record<string, number>;
  tone?: "direct" | "meta";
  highlighted?: boolean;
}) {
  const toneLabel = tone === "direct" ? "direct visual" : "modulation state";
  const barClass = tone === "direct" ? "bg-stone-700" : "bg-amber-700";

  return (
    <div className={`rounded-2xl border p-3 ${highlighted ? "border-stone-900 bg-white shadow-sm" : "border-stone-200 bg-stone-50"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</div>
        <div className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone === "direct" ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-800"}`}>
          {toneLabel}
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-xs text-stone-600">
              <span>{key}</span>
              <span>{formatPercent(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200">
              <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefAssetCard({
  asset,
}: {
  asset: AnnotatedAssetRecord & { distance: number };
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="h-36 overflow-hidden bg-stone-100">
        <img src={asset.imageUrl} alt={asset.title} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 text-xs text-stone-700">
          <span className="truncate font-medium text-stone-800">{asset.title}</span>
          <span className="shrink-0 text-stone-500">dist {asset.distance.toFixed(2)}</span>
        </div>
        <div className="mt-1 text-[11px] text-stone-500">
          source {asset.annotation?.annotationSource ?? (asset.tags?.includes("extended") ? "extended-registry" : "unknown")}
        </div>
      </div>
    </div>
  );
}

function VariantCardView({
  variant,
  feedback,
  matchedAsset,
  onFeedback,
  onFinalize,
}: {
  variant: VariantCard;
  feedback?: "liked" | "disliked";
  matchedAsset?: AnnotatedAssetRecord & { distance: number };
  onFeedback: (variantId: string, value: "liked" | "disliked") => void;
  onFinalize: (variant: VariantCard) => void;
}) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <MatchedFuliPreview state={variant.state} matchedAsset={matchedAsset} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-stone-900">{variant.label}</div>
          <div className="mt-1 text-xs text-stone-500">{variant.summary}</div>
        </div>
        <button
          onClick={() => onFinalize(variant)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
        >
          <Trophy className="h-3.5 w-3.5" /> Final
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onFeedback(variant.id, "liked")}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
            feedback === "liked" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <Heart className="h-4 w-4" /> Like
        </button>
        <button
          onClick={() => onFeedback(variant.id, "disliked")}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
            feedback === "disliked" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
        >
          <X className="h-4 w-4" /> Dislike
        </button>
      </div>
    </div>
  );
}

export function SimulatorPage() {
  const [round, setRound] = useState(1);
  const [baseState, setBaseState] = useState<SimulatorState>(() => createRandomBaseState());
  const [variants, setVariants] = useState<VariantCard[]>(() => generateRoundVariants(createRandomBaseState(), 1));
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "liked" | "disliked">>({});
  const [anchors, setAnchors] = useState<AnchorCard[]>([]);
  const [finalChoice, setFinalChoice] = useState<VariantCard | null>(null);
  const [assetSourceMode, setAssetSourceMode] = useState<AssetSourceMode>("core-only");

  const feedbackRecords = useMemo<FeedbackRecord[]>(() => Object.entries(feedbackMap).map(([variantId, value]) => ({ variantId, value })), [feedbackMap]);
  const roundMode = getRoundMode(round);
  const primarySlot = getPrimarySlot(round);
  const roundExplanation = explainRound(primarySlot, roundMode);
  const referenceAssets = useMemo(() => getReferenceAssets(assetSourceMode), [assetSourceMode]);

  const nearestRefs = useMemo(
    () =>
      findNearestAnnotatedAssets(
        {
          color: baseState.color,
          motif: baseState.motif,
          arrangement: baseState.arrangement,
        },
        referenceAssets,
        3
      ),
    [baseState, referenceAssets]
  );

  const variantNearestRefsMap = useMemo(
    () =>
      Object.fromEntries(
        variants.map((variant) => [
          variant.id,
          findNearestAnnotatedAssets(
            {
              color: variant.state.color,
              motif: variant.state.motif,
              arrangement: variant.state.arrangement,
            },
            referenceAssets,
            1
          ),
        ])
      ),
    [variants, referenceAssets]
  );

  const handleReset = () => {
    const nextBase = createRandomBaseState();
    setRound(1);
    setBaseState(nextBase);
    setVariants(generateRoundVariants(nextBase, 1));
    setFeedbackMap({});
    setAnchors([]);
    setFinalChoice(null);
  };

  const handleFeedback = (variantId: string, value: "liked" | "disliked") => {
    setFeedbackMap((prev) => ({ ...prev, [variantId]: prev[variantId] === value ? undefined as never : value }));
  };

  const handleContinue = () => {
    if (feedbackRecords.length === 0) return;

    const nextBase = reduceRound(baseState, variants, feedbackRecords);
    const likedAnchors = collectLikedAnchors(variants, feedbackRecords);
    const nextRound = round + 1;

    setAnchors((prev) => [...prev, ...likedAnchors]);
    setBaseState(nextBase);
    setRound(nextRound);
    setVariants(generateRoundVariants(nextBase, nextRound));
    setFeedbackMap({});
  };

  const canContinue = feedbackRecords.length > 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ee_0%,#f1ebe2_100%)] text-stone-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-stone-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">carpet gen simulator</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">参数闭环数值模拟器</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              先不接真实生图。这里先模拟：随机 base → 变体卡牌 → 喜欢/不喜欢反馈 → reducer 风格更新 → 下一轮参数。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              <RefreshCw className="h-4 w-4" /> 重置
            </button>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4" /> 继续生成下一轮
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Base State</div>
                  <div className="mt-1 text-lg font-semibold text-stone-900">Round {round}</div>
                </div>
                {finalChoice && <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">已选最终方案</div>}
              </div>
              <MatchedFuliPreview state={baseState} matchedAsset={nearestRefs[0]} />
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Round logic</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-800">
                  <span>本轮类型：</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${roundMode === "direct" ? "bg-stone-900 text-white" : "bg-amber-100 text-amber-800"}`}>{roundMode}</span>
                  <span>主更新对象：</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">{primarySlot}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{roundExplanation.description}</p>
                {roundExplanation.effects.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Influence targets</div>
                    {roundExplanation.effects.map((effect: string) => (
                      <div key={effect} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">{effect}</div>
                    ))}
                  </div>
                )}
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
                  <button
                    onClick={() => setAssetSourceMode("core-only")}
                    className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core-only" ? "bg-stone-900 text-white" : "text-stone-600"}`}
                  >
                    core only
                  </button>
                  <button
                    onClick={() => setAssetSourceMode("core+extended")}
                    className={`rounded-full px-3 py-1 font-medium ${assetSourceMode === "core+extended" ? "bg-stone-900 text-white" : "text-stone-600"}`}
                  >
                    core + extended
                  </button>
                </div>
              </div>
              <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                当前 source：<span className="font-semibold text-stone-800">{assetSourceMode}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {nearestRefs.map((asset) => (
                  <div key={asset.imageId} className="space-y-2">
                    <RefAssetCard asset={asset} />
                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
                      confidence {asset.annotation?.confidence ?? "n/a"}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(asset.roleMap?.roles ?? []).map((role: string) => (
                          <span key={role} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2">strong: {(asset.roleMap?.strongSlots ?? []).join(", ") || "-"}</div>
                    </div>
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
                      <div className="flex items-center justify-between text-sm font-medium text-stone-800">
                        <span>{anchor.label}</span>
                        <span className="text-xs text-stone-500">Round {anchor.round}</span>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">{anchor.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {finalChoice && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Trophy className="h-4 w-4" /> 最终选择
                </div>
                <div className="text-sm text-stone-700">{finalChoice.label}</div>
                <div className="mt-1 text-xs text-stone-500">{finalChoice.summary}</div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current variants</div>
                <div className="mt-1 text-sm text-stone-600">当前先 mock 4 张变体卡；大多数轮次围绕一阶参数，少数轮次由二阶参数调制一阶趋势。</div>
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
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
