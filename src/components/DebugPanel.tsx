import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageSlotValues } from "@/types/domain";

type DebugTarget = {
  image: string;
  name: string;
  slots: ImageSlotValues;
  prompt: string;
};

type DebugPanelProps = {
  target: DebugTarget | null;
};

const SLOT_SECTIONS: {
  key: keyof ImageSlotValues;
  label: string;
  axes: { key: string; label: string }[];
}[] = [
  {
    key: "colorPalette",
    label: "Color Palette",
    axes: [
      { key: "hueBias", label: "Hue Bias (Warm)" },
      { key: "saturation", label: "Saturation" },
      { key: "lightness", label: "Lightness" },
    ],
  },
  {
    key: "motif",
    label: "Motif",
    axes: [
      { key: "geometryDegree", label: "Geometry" },
      { key: "organicDegree", label: "Organic" },
      { key: "complexity", label: "Complexity" },
    ],
  },
  {
    key: "style",
    label: "Style",
    axes: [
      { key: "graphicness", label: "Graphic" },
      { key: "painterlyDegree", label: "Painterly" },
      { key: "heritageSense", label: "Heritage" },
    ],
  },
  {
    key: "arrangement",
    label: "Arrangement",
    axes: [
      { key: "orderliness", label: "Orderliness" },
      { key: "density", label: "Density" },
      { key: "directionality", label: "Directionality" },
    ],
  },
  {
    key: "impression",
    label: "Impression",
    axes: [
      { key: "calmness", label: "Calmness" },
      { key: "energy", label: "Energy" },
      { key: "softness", label: "Softness" },
    ],
  },
  {
    key: "shape",
    label: "Shape",
    axes: [
      { key: "angularity", label: "Angularity" },
      { key: "edgeSoftness", label: "Edge Softness" },
      { key: "irregularity", label: "Irregularity" },
    ],
  },
  {
    key: "scale",
    label: "Scale",
    axes: [
      { key: "motifScale", label: "Motif Scale" },
      { key: "rhythm", label: "Rhythm" },
      { key: "contrast", label: "Contrast" },
    ],
  },
];

export function DebugPanel({ target }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when a target is set
  const effectiveOpen = isOpen && target !== null;

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 flex"
      style={{ fontFamily: "monospace" }}
    >
      {/* Expanded panel */}
      <div
        className="h-full bg-gray-950 border-l border-gray-800 overflow-hidden flex flex-col"
        style={{
          width: effectiveOpen ? 340 : 0,
          transition: "width 300ms ease",
          minWidth: effectiveOpen ? 340 : 0,
        }}
      >
        {target && effectiveOpen && (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={target.image}
                  alt={target.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <div>
                  <p className="text-white text-xs font-bold">{target.name}</p>
                  <p className="text-gray-500 text-[10px]">Slot Analysis</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slot sections */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {SLOT_SECTIONS.map(({ key, label, axes }) => {
                const slotData = target.slots[key] as Record<string, number>;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-300 text-[11px] font-bold uppercase tracking-wider">
                        {label}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        Open
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {axes.map(({ key: axisKey, label: axisLabel }) => {
                        const val = slotData[axisKey] ?? 0;
                        const pct = Math.round(val * 100);
                        return (
                          <div key={axisKey}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-500 text-[10px]">{axisLabel}</span>
                              <span className="text-gray-400 text-[10px]">{pct}%</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Composed prompt */}
              <div>
                <p className="text-gray-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Prompt
                </p>
                <pre className="text-[10px] text-emerald-400 bg-gray-900 border border-gray-800 rounded p-3 whitespace-pre-wrap leading-relaxed">
                  {target.prompt}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapsed tab */}
      <button
        onClick={() => {
          if (target) setIsOpen((v) => !v);
        }}
        className={`flex flex-col items-center justify-center gap-2 w-12 bg-gray-950 border-l border-gray-800 hover:bg-gray-900 transition-colors ${
          !target ? "opacity-40 cursor-default" : "cursor-pointer"
        }`}
        title={target ? (effectiveOpen ? "Collapse debug panel" : "Expand debug panel") : "Select a pattern first"}
      >
        {effectiveOpen ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        )}
        <span
          className="text-gray-500 text-[10px] font-bold tracking-widest"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
        >
          DEBUG
        </span>
      </button>
    </div>
  );
}
