import { X } from "lucide-react";

import { compareAnnotationToBaseState } from "./explainability";
import type { AnnotatedAssetRecord } from "@/core/assets/types";
import type { SimulatorState } from "./types";

interface MatchedRefInspectPanelProps {
  asset: AnnotatedAssetRecord & { distance: number };
  baseState: SimulatorState;
  label: string;
  onClose: () => void;
}

function ComparisonSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: ReturnType<typeof compareAnnotationToBaseState>["higherThanBase"];
  tone: "higher" | "lower" | "close";
}) {
  const toneClass =
    tone === "higher"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "lower"
        ? "border-amber-200 bg-amber-50/70"
        : "border-stone-200 bg-stone-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-stone-500">none</div>
        ) : (
          items.map((item) => (
            <div key={item.axisPath} className="rounded-xl bg-white/85 px-3 py-2 text-sm text-stone-700">
              <div className="font-medium text-stone-800">{item.summary}</div>
              <div className="mt-1 text-xs leading-5 text-stone-500">
                ref {Math.round(item.refValue * 100)}% · base {Math.round(item.baseValue * 100)}% · {item.gloss}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function MatchedRefInspectPanel({ asset, baseState, label, onClose }: MatchedRefInspectPanelProps) {
  if (!asset.annotation) {
    return null;
  }

  const comparison = compareAnnotationToBaseState(baseState, asset.annotation);

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Matched ref inspect</div>
          <div className="mt-2 text-lg font-semibold text-stone-900">{asset.title}</div>
          <div className="mt-1 text-sm text-stone-600">
            {label} · dist {asset.distance.toFixed(2)} · compare target: current base
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            <img src={asset.imageUrl} alt={asset.title} className="h-48 w-full object-cover" loading="lazy" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Ref profile</div>
            <div className="mt-3 space-y-2">
              {comparison.profile.map((item) => (
                <div key={item.axisPath} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
                  <div className="font-medium text-stone-800">{item.label}</div>
                  <div className="mt-1 text-xs text-stone-500">{item.valueSummary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ComparisonSection title="Higher than current base" items={comparison.higherThanBase} tone="higher" />
          <ComparisonSection title="Lower than current base" items={comparison.lowerThanBase} tone="lower" />
          <ComparisonSection title="Close to current base" items={comparison.closeToBase} tone="close" />
        </div>
      </div>
    </div>
  );
}
