import type { EntryAgentResult } from "./types";

export type SlotStatus = "missing" | "tentative" | "stable" | "committed";
export type SignalSourceType =
  | "explicit_user_text"
  | "option_click"
  | "poetic_mapping"
  | "semantic_inference"
  | "planner_bridge";

export interface SourcedValue<T> {
  value: T;
  confidence: number;
  status: SlotStatus;
  sources: SignalSourceType[];
  traces: string[];
}

export interface AtmosphereState {
  quietness?: number;
  warmth?: number;
  distance?: number;
  softness?: number;
  humidity?: number;
  clarity?: number;
  haze?: number;
  restraint?: number;
  liveliness?: number;
  intimacy?: number;
}

export interface ColorState {
  temperature?: "cool" | "cool-neutral" | "neutral" | "warm-neutral" | "warm";
  saturation?: "very-low" | "low" | "medium-low" | "medium" | "high";
  brightness?: "dark" | "mid-dark" | "medium" | "medium-light" | "light";
  contrast?: "very-soft" | "soft" | "moderate" | "high";
  haze?: "none" | "low" | "medium" | "high";
  paletteBias?: string[];
  baseAccentRelation?: {
    base?: string;
    accent?: string;
    relation?: "base-only" | "base-plus-accent" | "dual-tone";
  };
}

export interface ImpressionState {
  primary?: string[];
  secondary?: string[];
  tension?: string[];
}

export interface PatternState {
  abstraction?: "figurative" | "semi-abstract" | "abstract";
  density?: "very-low" | "low" | "medium-low" | "medium" | "high";
  scale?: "micro" | "small" | "medium" | "large";
  motion?: "still" | "gentle-flow" | "directional-flow" | "pulsed";
  edgeDefinition?: "blurred" | "soft" | "mixed" | "clear";
  motifBehavior?: "implicit" | "suggestive" | "visible";
  structuralPattern?: string[];
  atmosphericPattern?: string[];
  keyElements?: string[];
}

export interface PresenceState {
  blending?: "blended" | "softly-noticeable" | "focal";
  focalness?: "low" | "medium" | "high";
  visualWeight?: "light" | "medium" | "strong";
  behavior?: "embedded" | "local-lift" | "visible-anchor";
}

export interface ArrangementState {
  spread?: "airy" | "balanced" | "compact";
  directionalFlow?: "none" | "gentle" | "clear";
  rhythm?: "soft" | "linear" | "pulsed";
  orderliness?: "loose" | "balanced" | "ordered";
}

export interface MaterialityState {
  surfaceFeel?: string[];
  textureBias?: string[];
}

export interface ConstraintState {
  avoidMotifs: string[];
  avoidStyles: string[];
  avoidPalette: string[];
  avoidComposition: string[];
  keepQualities: string[];
}

export interface AntiBiasState {
  antiLiteralization: string[];
  antiDecorative: string[];
  antiLuxury: string[];
  antiScene: string[];
}

export interface UnresolvedSplit {
  id: string;
  slot: string;
  question: string;
  reason: string;
}

export interface ReadinessState {
  score: number;
  mode: "exploratory" | "preview" | "committed";
}

export interface ConfidenceState {
  readiness: ReadinessState;
  slotCoverage: Record<string, number>;
  stableSlots: string[];
  committedSlots: string[];
}

export interface TraceBundle {
  freeTextInputs: string[];
  selectedOptions: Array<{ questionId: string; optionId: string; label: string }>;
  turnHistory: Array<{ turnIndex: number; text: string; source: "text" | "opening-selection" }>;
  poeticHits: string[];
  sourceNotes: string[];
  latestResolutionReasons: string[];
}

export interface GenerationSemanticSpec {
  baseMood?: string[];
  palette?: {
    temperature?: string;
    saturation?: string;
    brightness?: string;
    contrast?: string;
    haze?: string;
    base?: string | null;
    accent?: string | null;
    relation?: "base-only" | "base-plus-accent" | "dual-tone";
  };
  atmosphere?: string[];
  pattern?: {
    abstraction?: string;
    density?: string;
    scale?: string;
    structuralPattern?: string[];
    atmosphericPattern?: string[];
    motion?: string;
    edgeDefinition?: string;
    motifBehavior?: string;
    keyElements?: string[];
  };
  presence?: {
    blending?: string;
    focalness?: string;
    visualWeight?: string;
    behavior?: string;
  };
  arrangement?: {
    spread?: string;
    directionalFlow?: string;
    rhythm?: string;
    symmetry?: string;
    orderliness?: string;
  };
  materiality?: {
    surfaceFeel?: string[];
    textureBias?: string[];
  };
  constraints?: ConstraintState;
}

export interface CanonicalIntentState {
  atmosphere?: SourcedValue<AtmosphereState>;
  color?: SourcedValue<ColorState>;
  impression?: SourcedValue<ImpressionState>;
  pattern?: SourcedValue<PatternState>;
  presence?: SourcedValue<PresenceState>;
  arrangement?: SourcedValue<ArrangementState>;
  materiality?: SourcedValue<MaterialityState>;
  constraints?: SourcedValue<ConstraintState>;
  antiBias?: SourcedValue<AntiBiasState>;
  unresolvedSplits: UnresolvedSplit[];
  readiness: ReadinessState;
}

export interface CompiledVisualIntentPackage {
  canonicalState: CanonicalIntentState;
  summary: string;
  developerBrief: string;
  semanticSpec: GenerationSemanticSpec;
  generationPrompt: string;
  negativePrompt: string;
  confidenceState: ConfidenceState;
  unresolvedQuestions: string[];
  trace: TraceBundle;
}

export interface VisualIntentRisk {
  type:
    | "too-literal"
    | "too-flat"
    | "too-decorative"
    | "too-loud"
    | "too-cold"
    | "too-luxury"
    | "pattern-collapse"
    | "accent-loss"
    | "presence-loss";
  description: string;
  severity: "low" | "medium" | "high";
}

export interface TuningSuggestions {
  ifTooFlat?: string[];
  ifTooLiteral?: string[];
  ifTooDecorative?: string[];
  ifTooLoud?: string[];
  ifPresenceTooWeak?: string[];
  ifAccentLost?: string[];
}

export interface VisualIntentTestBundle {
  testLabel: string;
  canonicalState: CanonicalIntentState;
  summary: string;
  semanticSpec: GenerationSemanticSpec;
  prompt: string;
  negativePrompt: string;
  risks: VisualIntentRisk[];
  tuningSuggestions: TuningSuggestions;
  confidenceState: ConfidenceState;
  unresolvedQuestions: string[];
  trace?: TraceBundle;
}

export interface VisualIntentCompilerInput {
  analysis: EntryAgentResult;
  freeTextInputs?: string[];
  selectedOptions?: Array<{ questionId: string; optionId: string; label: string }>;
  turnHistory?: Array<{ turnIndex: number; text: string; source: "text" | "opening-selection" }>;
}
