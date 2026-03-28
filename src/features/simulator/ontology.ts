import type { SimulatorSlotKey } from "./types";

export type RoundMode = "direct" | "modulated";

export const SLOT_LAYER: Record<SimulatorSlotKey, "pattern" | "modulation"> = {
  color: "pattern",
  motif: "pattern",
  arrangement: "pattern",
  impression: "modulation",
  style: "modulation",
};

export const SLOT_DESCRIPTIONS: Record<SimulatorSlotKey, string> = {
  color: "一阶参数：直接影响色彩基调、纯度与明度。",
  motif: "一阶参数：直接影响纹样单元的几何/有机/复杂度。",
  arrangement: "一阶参数：直接影响图案组织方式、疏密和方向。",
  impression: "二阶参数：不直接独立出图，而是调制整体气质趋势。",
  style: "二阶参数：不直接独立出图，而是调制表达方式和品牌感。",
};

export const MODULATION_EFFECTS: Record<Exclude<SimulatorSlotKey, "color" | "motif" | "arrangement">, string[]> = {
  impression: [
    "calm → spacing / order / saturation",
    "energy → saturation / complexity / direction",
    "softness → lightness / complexity",
  ],
  style: [
    "graphic → geometry / order",
    "painterly → organic",
    "heritage → warmth / saturation restraint",
  ],
};

export function explainRound(slot: SimulatorSlotKey, mode: RoundMode) {
  return {
    layer: SLOT_LAYER[slot],
    description: SLOT_DESCRIPTIONS[slot],
    effects: mode === "modulated" && (slot === "impression" || slot === "style") ? MODULATION_EFFECTS[slot] : [],
  };
}
