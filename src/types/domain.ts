export type SlotKey =
  | "colorPalette"
  | "motif"
  | "style"
  | "arrangement"
  | "impression"
  | "shape"
  | "scale";

export interface InternalAxis {
  key: string;
  label: string;
  value: number;
  range: [number, number];
  exploration: "wide" | "narrow" | "late-lock";
  semanticAnchors: string[];
}

export interface SlotDefinition {
  key: SlotKey;
  label: string;
  role: string;
  promptRule: string;
  recommendedStatus: "open" | "locked";
  axes: InternalAxis[];
}

export interface TechnicalModule {
  id: string;
  title: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  models: string[];
}

export interface DeliveryStage {
  id: string;
  title: string;
  goal: string;
  deliverables: string[];
}

export interface ModelChoice {
  label: string;
  selected: string;
  reason: string;
  alternatives: string[];
}

export interface ModelConfig {
  ingestion: ModelChoice;
  preference: ModelChoice;
  semanticMapping: ModelChoice;
  promptAssembly: ModelChoice;
  generation: ModelChoice;
  storage: ModelChoice;
}

export interface CandidateDesign {
  id: string;
  title: string;
  rationale: string;
  promptExcerpt: string;
  deltaSummary: string;
  palette: [string, string, string];
  pattern: "radial" | "grid" | "organic" | "stripes" | "scatter";
  status?: "liked" | "disliked" | "neutral";
}

export interface ExplorationSession {
  sessionId: string;
  round: number;
  phase: "initial" | "continue";
  lockedSlots: SlotKey[];
  prompt: string;
  negativePrompt: string;
  strategy: string;
  slotStates: SlotState[];
  promptTrace: PromptTrace;
  candidates: CandidateDesign[];
}

export interface SlotState {
  key: SlotKey;
  label: string;
  role: string;
  promptRule: string;
  recommendedStatus: "open" | "locked";
  confidence: number;
  status: "open" | "locked";
  axes: InternalAxis[];
}

export interface PromptTrace {
  impression: string[];
  motif: string[];
  arrangement: string[];
  scale: string[];
  colorPalette: string[];
  style: string[];
  shape: string[];
}

export interface ImageSlotValues {
  colorPalette: { hueBias: number; saturation: number; lightness: number };
  motif: { geometryDegree: number; organicDegree: number; complexity: number };
  style: { graphicness: number; painterlyDegree: number; heritageSense: number };
  arrangement: { orderliness: number; density: number; directionality: number };
  impression: { calmness: number; energy: number; softness: number };
  shape: { angularity: number; edgeSoftness: number; irregularity: number };
  scale: { motifScale: number; rhythm: number; contrast: number };
}

export interface LibraryImage {
  id: string;
  src: string;
  name: string;
  slots: ImageSlotValues;
  prompt: string;
  tags: string[];
  sourceUrl?: string;
  score?: number;
}
