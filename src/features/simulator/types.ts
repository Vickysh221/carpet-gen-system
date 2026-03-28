export type SimulatorSlotKey = "color" | "motif" | "arrangement" | "impression" | "style";

export interface SimulatorState {
  color: {
    warmth: number;
    saturation: number;
    lightness: number;
  };
  motif: {
    geometry: number;
    organic: number;
    complexity: number;
  };
  arrangement: {
    order: number;
    spacing: number;
    direction: number;
  };
  impression: {
    calm: number;
    energy: number;
    softness: number;
  };
  style: {
    graphic: number;
    painterly: number;
    heritage: number;
  };
}

export type FeedbackValue = "liked" | "disliked";

export interface VariantCard {
  id: string;
  round: number;
  label: string;
  state: SimulatorState;
  changedSlots: SimulatorSlotKey[];
  summary: string;
  mode?: "direct" | "modulated";
}

export interface FeedbackRecord {
  variantId: string;
  value: FeedbackValue;
}

export interface AnchorCard {
  id: string;
  round: number;
  label: string;
  state: SimulatorState;
  summary: string;
}
