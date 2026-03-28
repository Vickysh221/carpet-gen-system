import { useState } from "react";
import { Beaker, PanelsTopLeft } from "lucide-react";

import LegacyExplorerApp from "@/features/legacy/LegacyExplorerApp";
import { SimulatorPage } from "./SimulatorPage";

export function SimulatorSandbox() {
  const [viewMode, setViewMode] = useState<"explorer" | "simulator">("simulator");

  if (viewMode === "simulator") {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">carpet gen system</div>
              <div className="mt-1 text-lg font-semibold text-stone-900">Simulator Sandbox</div>
            </div>
            <button
              onClick={() => setViewMode("explorer")}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
            >
              <PanelsTopLeft className="h-4 w-4" /> 原主界面
            </button>
          </div>
        </div>
        <SimulatorPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">explorer mode</div>
          <button
            onClick={() => setViewMode("simulator")}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
          >
            <Beaker className="h-4 w-4" /> 数值模拟器
          </button>
        </div>
      </div>
      <LegacyExplorerApp />
    </div>
  );
}
