import type { SimulatorState } from "@/features/simulator/types";

export type HighValueField =
  | "spaceContext"
  | "overallImpression"
  | "colorMood"
  | "patternTendency"
  | "arrangementTendency";

export type SlotStateStatus = "unknown" | "weak-signal" | "tentative" | "locked" | "conflicted";

export type ConfidenceLevel = "low" | "medium" | "high";

export type QaMode =
  | "exploratory-intake"
  | "slot-completion"
  | "preference-shift"
  | "slot-revision"
  | "lock-reinforcement";

export type SemanticGapType = "prototype-conflict" | "unresolved-ambiguity" | "missing-slot" | "weak-anchor";

export type QuestionTargetType = "conflict" | "ambiguity" | "slot";

export type QuestionIntent = "resolve-prototype-conflict" | "resolve-ambiguity" | "fill-missing-slot" | "stabilize-weak-anchor";

export type QuestionKind = "contrast" | "clarify" | "anchor" | "strength";

export type QuestionFamilyId = string;

export type QuestionResolutionStatus = "unresolved" | "narrowed" | "resolved" | "rejected";

export type SlotQuestionMode =
  | "contrast-calm-vs-presence"
  | "contrast-soft-vs-crisp"
  | "contrast-warm-vs-muted"
  | "contrast-complexity-vs-geometry"
  | "contrast-geometry-vs-organic"
  | "contrast-open-vs-ordered"
  | "anchor-space-context";

export type EntryAgentSlotKey = "color" | "motif" | "arrangement" | "impression";

export type EntryAgentAxisMap = {
  color: "warmth" | "saturation";
  motif: "complexity" | "geometry" | "organic";
  arrangement: "order" | "spacing";
  impression: "calm" | "energy" | "softness";
};

export type EntryAgentAxisPath = {
  [Slot in EntryAgentSlotKey]: `${Slot}.${EntryAgentAxisMap[Slot]}`;
}[EntryAgentSlotKey];

export type EntryAgentAxisHints = {
  [Slot in EntryAgentSlotKey]?: Partial<Record<EntryAgentAxisMap[Slot], number>>;
};

export type EntryAgentStatePatch = {
  [Slot in EntryAgentSlotKey]?: Partial<Record<EntryAgentAxisMap[Slot], number>>;
};

export interface WeakBiasHint {
  source: string;
  axes: EntryAgentAxisHints;
}

export interface FuliSemanticCanvas {
  source?: "rule-based" | "llm" | "hybrid";
  confidence?: number;
  rawCues: string[];
  conceptualAxes: string[];
  metaphoricDomains: string[];
  designTranslations: {
    colorIdentity?: string[];
    colorRestraint?: string[];
    motifLogic?: string[];
    arrangementLogic?: string[];
    impressionTone?: string[];
    materialSuggestion?: string[];
    presenceIntensity?: string[];
  };
  slotMappings: {
    targetFields: HighValueField[];
    targetSlots: EntryAgentSlotKey[];
    targetAxes: string[];
  };
  narrativePolicy: {
    mustPreserve: string[];
    mustNotOverLiteralize: string[];
    directionalDominant: string[];
  };
  questionImplications: {
    likelyQuestionKinds: string[];
    likelyInformationGains: string[];
  };
  poeticSignal?: {
    hits: Array<{
      key: string;
      matchedText: string;
      weight: number;
    }>;
    aggregatedSlotDelta: {
      color?: Record<string, number>;
      impression?: Record<string, number>;
      patternIntent?: Record<string, number>;
      presence?: Record<string, number>;
    };
    fieldSemanticHints?: Partial<Record<HighValueField, Record<string, string>>>;
    axisHints?: EntryAgentAxisHints;
    patternIntent?: PatternIntentState;
    presence?: {
      blendingMode: "blended" | "softly-noticeable" | "focal";
      visualWeight: "light" | "medium" | "strong";
      blending: number;
      focalness: number;
      visualWeightScore: number;
    };
    followupHints: string[];
  };
}

export interface FieldAmbiguity {
  field: HighValueField;
  note: string;
  candidateAxes?: EntryAgentAxisHints;
}

export type PrototypeRouteType = "prototype-first" | "dual-route" | "direct-first-with-fallback";

export type InterpretationSourceType = "semantic-canvas" | "direct" | "prototype" | "fallback-candidate";

export type MergeRelation = "reinforcement" | "refinement" | "conflict";

export type SemanticCueType = "direct" | "prototype" | "poetic" | "impression-energy" | "unsupported";

export type SemanticRouteHint = "direct" | "prototype" | "retrieval-entry" | "fallback" | "weak-retain";

export type NarrativeOwnershipClass = "primary-eligible" | "secondary-only" | "ambiguity-only";

export type QueryRouteType =
  | "poetic-atmospheric"
  | "explicit-motif"
  | "constraint-negation"
  | "mixed-compositional"
  | "vague-underspecified";

export type QueryInterpretationPath =
  | "atmosphere-first"
  | "motif-trace-first"
  | "constraint-first"
  | "compositional-bridge"
  | "guided-disambiguation";

export interface QueryRouteSignal {
  kind:
    | "poetic-cue"
    | "atmosphere-cue"
    | "motif-cue"
    | "constraint-cue"
    | "vague-cue"
    | "composition-cue";
  cue: string;
  weight: number;
  note: string;
}

export interface QueryRouteDecision {
  detectedType: QueryRouteType;
  confidence: number;
  rationale: string;
  recommendedInterpretationPath: QueryInterpretationPath;
  trace: QueryRouteSignal[];
}

export interface NormalizedInputEvent {
  kind: "text";
  rawText: string;
  normalizedText: string;
  preservedPhrases: string[];
  spans: SemanticInputSpan[];
  duplicateFlags: string[];
  pollutionFlags: string[];
  languageHints: string[];
  preprocessingTrace: string[];
}

export type SemanticSpanType =
  | "phrase-span"
  | "modifier-span"
  | "composition-span"
  | "negation-span"
  | "anchor-span";

export interface SemanticInputSpan {
  id: string;
  text: string;
  normalizedText: string;
  spanType: SemanticSpanType;
  confidence: number;
  trace: string[];
  preservedReason: string;
}

export interface RetrievalTraceItem {
  id: string;
  source: string;
  score: number;
  text: string;
}

export interface RetrievalLayerResult {
  query: string;
  preservedPhrases: string[];
  semanticCandidates: RetrievalTraceItem[];
  comparisonCandidates: RetrievalTraceItem[];
  trace: string[];
}

export type SemanticRoleName =
  | "base-atmosphere"
  | "accent-motif"
  | "sensory-modifier"
  | "color-cue"
  | "structure-hint"
  | "constraint"
  | "rendering-bias";

export interface SemanticRoleCandidate {
  id: string;
  role: SemanticRoleName;
  label: string;
  evidence: string[];
  sourceSpanIds: string[];
  semanticFunction: "base" | "accent" | "modifier" | "constraint" | "rendering-bias";
  confidence: number;
  polarity?: "support" | "avoid";
  source: "preprocess" | "retrieval" | "route" | "rule";
  rationale: string;
}

export interface SemanticRoleHints {
  baseAtmosphere: SemanticRoleCandidate[];
  accentMotif: SemanticRoleCandidate[];
  sensoryModifiers: SemanticRoleCandidate[];
  colorCues: SemanticRoleCandidate[];
  structureHints: SemanticRoleCandidate[];
  constraints: SemanticRoleCandidate[];
  renderingBiases: SemanticRoleCandidate[];
}

export interface PatternSemanticSlotCandidate {
  value: string;
  confidence: number;
  sourceRoles: string[];
  source: "semantic-role" | "retrieval" | "route" | "constraint";
  projectionRationale: string;
  status: "locked" | "candidate-only" | "unresolved";
}

export interface PatternSemanticProjection {
  formativeStructure: {
    patternArchitecture: PatternSemanticSlotCandidate[];
    structuralOrder: PatternSemanticSlotCandidate[];
    densityBreathing: PatternSemanticSlotCandidate[];
    flowDirection: PatternSemanticSlotCandidate[];
  };
  semanticMaterial: {
    motifFamily: PatternSemanticSlotCandidate[];
    abstractionLevel: PatternSemanticSlotCandidate[];
    semanticAnchorStrength: PatternSemanticSlotCandidate[];
  };
  atmosphericSurface: {
    colorClimate: PatternSemanticSlotCandidate[];
  };
  anchorHints: string[];
  variantHints: string[];
  constraintHints: string[];
  slotTrace: string[];
}

export interface InterpretationUnresolvedSplit {
  id: string;
  dimension: string;
  prompt: string;
  options: string[];
  rationale: string;
  derivedFrom: string[];
  whyHighValue: string;
  misleadingPathsPrevented: string[];
  confidence: number;
}

export interface InterpretationConfidenceSummary {
  lockedSignals: string[];
  candidateOnlySignals: string[];
  unresolvedSignals: string[];
  confidenceScore: number;
}

export interface InterpretationLayerResult {
  queryRoute: QueryRouteDecision;
  semanticRoleHints: string[];
  semanticRoles: SemanticRoleHints;
  patternSemanticProjection: PatternSemanticProjection;
  unresolvedSplits: InterpretationUnresolvedSplit[];
  misleadingPathsToAvoid: string[];
  confidenceSummary: InterpretationConfidenceSummary;
  retrievalHints: string[];
  trace: string[];
}

export interface SemanticUnit {
  id: string;
  cue: string;
  cueType: SemanticCueType;
  routeHint: SemanticRouteHint;
  ownershipClass: NarrativeOwnershipClass;
  questionKindHint: QuestionKind;
  disambiguationAxes: EntryAgentAxisPath[];
  informationGainHint: string;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  candidateReadings: string[];
  axisHints?: EntryAgentAxisHints;
  confidence: number;
  weight: number;
}

export interface PrototypeRetrievalEvidence {
  entryId: string;
  entryLabel: string;
  matchedText: string;
  similarityScore: number;
  scoreLabel: string;
  explainText: string;
}

export interface InterpretationCandidate {
  id: string;
  label: string;
  sourceType: InterpretationSourceType;
  sourceId: string;
  field: HighValueField;
  primarySlot: EntryAgentSlotKey;
  secondarySlots: EntryAgentSlotKey[];
  polarity: "increase" | "decrease" | "mixed";
  strength: number;
  confidence: number;
  matchedCues: string[];
  semanticHints?: Record<string, string | string[]>;
  axisHints: EntryAgentAxisHints;
  patchIntent: EntryAgentStatePatch;
  matchedSemanticUnitIds?: string[];
  ownershipClass?: NarrativeOwnershipClass;
  questionKindHint?: QuestionKind;
  disambiguationAxes?: EntryAgentAxisPath[];
  informationGainHint?: string;
  note?: string;
}

export interface PrototypeMatch {
  prototypeId: string;
  label: string;
  routeType: PrototypeRouteType;
  confidence: number;
  matchedAliases: string[];
  matchMode: "alias" | "alias+retrieval" | "retrieval-only";
  aliasScore: number;
  retrievalScore: number;
  rationale: string;
  candidateIds: string[];
  retrievalEvidence: PrototypeRetrievalEvidence[];
}

export interface ReadingDecision {
  readingId: string;
  status: "kept" | "suppressed";
  mergeRelation: MergeRelation;
  reason: string;
  suppressedByReadingId?: string;
}

export interface MergeDecisionGroup {
  id: string;
  relation: MergeRelation;
  primarySlot: EntryAgentSlotKey;
  participatingReadingIds: string[];
  keptReadingIds: string[];
  suppressedReadingIds: string[];
  decision: string;
  confidence: number;
  followUpRequired: boolean;
}

export interface FallbackCandidateSet {
  triggered: boolean;
  reasons: string[];
  provider: "ollama-direct" | "backend" | "rules-only";
  available: boolean;
  degraded: boolean;
  errorMessage?: string;
  candidates: InterpretationCandidate[];
}

export interface InterpretationMergeResult {
  semanticCanvasCandidates: InterpretationCandidate[];
  directCandidates: InterpretationCandidate[];
  prototypeMatches: PrototypeMatch[];
  semanticUnits: SemanticUnit[];
  candidateReadings: InterpretationCandidate[];
  mergeGroups: MergeDecisionGroup[];
  keptReadings: ReadingDecision[];
  suppressedReadings: ReadingDecision[];
  finalResolvedReadings: InterpretationCandidate[];
  fallback: FallbackCandidateSet;
}

export interface EntryAgentInput {
  text: string;
  slotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
  evidenceSource?: string;
  simulatorState?: SimulatorState;
  previousQuestionTrace?: QuestionTrace;
  /** Full question history for coverage balance checks. */
  questionHistory?: QuestionTrace[];
  latestReplyText?: string;
  resolutionState?: QuestionResolutionState;
  comparisonSelections?: ComparisonSelectionRecord[];
  /** Previous goal state — used to detect slot phase transitions (e.g. lock-candidate). */
  previousGoalState?: IntentIntakeGoalState;
}

export interface EntryAgentDetectionResult {
  hitFields: HighValueField[];
  evidence: Partial<Record<HighValueField, string[]>>;
  confidence: Partial<Record<HighValueField, ConfidenceLevel>>;
}

export interface EntryAgentBridgeResult {
  provisionalStateHints: Record<string, string | string[]>;
  ambiguities: FieldAmbiguity[];
  axisHints: EntryAgentAxisHints;
  weakBiasHints: WeakBiasHint[];
  statePatch: EntryAgentStatePatch;
  semanticCanvas?: FuliSemanticCanvas;
}

export interface EntryAgentInterpretationResult {
  interpretationMerge: InterpretationMergeResult;
}

export interface EntryAgentRecommendationResult {
  updatedSlotStates: Partial<Record<HighValueField, SlotStateStatus>>;
  suggestedQaMode: QaMode;
  suggestedFollowUpTarget?: HighValueField;
  suggestedQuestionIntent?: string;
}

export interface EntryAgentRoutingResult {
  queryRoute: QueryRouteDecision;
  interpretationLayer?: InterpretationLayerResult;
  retrievalLayer?: RetrievalLayerResult;
}

export interface SemanticDirection {
  label: string;
  sourceReadingIds: string[];
  confidence: number;
}

export interface SemanticUnderstanding {
  confirmedDirections: SemanticDirection[];
  activeReadings: Array<{
    readingId: string;
    label: string;
    sourceType: InterpretationSourceType;
    primarySlot: EntryAgentSlotKey;
    confidence: number;
  }>;
  secondaryReadings: Array<{
    readingId: string;
    label: string;
    sourceType: InterpretationSourceType;
  }>;
  openQuestions: string[];
  conflictSummary: string[];
  narrative: string;
  /** true when narrative is a fallback placeholder — no resolved readings were found */
  isWeakNarrative: boolean;
}

export interface SemanticGap {
  id: string;
  type: SemanticGapType;
  priority: number;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  targetAxes: EntryAgentAxisPath[];
  questionMode?: SlotQuestionMode;
  questionKind?: QuestionKind;
  questionFamilyId?: QuestionFamilyId;
  relatedReadingIds: string[];
  sourceUnitIds?: string[];
  reason: string;
  evidence: string[];
  expectedGain: string;
  informationGainHint?: string;
  rankingReason: string;
  questionPromptOverride?: string;
}

export interface NextQuestionCandidate {
  id: string;
  targetType: QuestionTargetType;
  targetRef: string;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  targetAxes: EntryAgentAxisPath[];
  questionMode?: SlotQuestionMode;
  questionKind?: QuestionKind;
  questionFamilyId?: QuestionFamilyId;
  questionIntent: QuestionIntent;
  prompt: string;
  priority: number;
  resolvesGapIds: string[];
  expectedInformationGain: string;
  questionWhy: string;
}

export interface QuestionTrace {
  turnIndex: number;
  prompt: string;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  targetAxes: EntryAgentAxisPath[];
  gapId?: string;
  questionMode?: SlotQuestionMode;
  questionIntent?: QuestionIntent;
  questionFamilyId?: QuestionFamilyId;
}

export interface QuestionResolution {
  familyId: QuestionFamilyId;
  status: QuestionResolutionStatus;
  chosenBranch?: string;
  rejectedBranches: string[];
  sourceTurn: number;
  sourceQuestionGapId?: string;
  sourceQuestionPrompt: string;
  reason: string;
}

export interface QuestionResolutionState {
  families: Record<QuestionFamilyId, QuestionResolution>;
}

export type IntakeMacroSlot = "impression" | "color" | "pattern" | "arrangement" | "space";
export type IntakePhase =
  | "idle"
  | "text-intake-active"
  | "awaiting-slot-confirmation"
  | "ready-for-first-generation"
  | "soft-locked";
export type MacroSlotStatus = "empty" | "hinted" | "base-ready" | "lock-candidate" | "soft-locked";
export type MacroSlotTrend = "strengthening" | "weakening" | "stable" | "conflicted";
export type AgentStateUpdateSource = IntakeSignal["type"] | "bootstrap";

/** Lifecycle phase of a single macro slot during intake. */
export type IntakeSlotPhase = "empty" | "hinted" | "base-captured" | "lock-candidate";

/**
 * Rich pattern intent state — captures key element and abstraction level.
 * Default is "abstract" (carpet design sensibility); respect user if they want concrete.
 */
export interface PatternIntentState {
  /** e.g. "lotus", "wave", "branch", "cloud", "stone-texture" */
  keyElement?: string;
  /** How the element should be rendered. Default: "abstract". */
  abstractionPreference: "concrete" | "semi-abstract" | "abstract";
  renderingMode?: "suggestive" | "literal" | "texture-like" | "geometricized";
  motionFeeling?: "still" | "flowing" | "wind-like" | "layered" | "dispersed";
}

/** A pending user-facing confirmation for a slot that has reached lock-candidate phase. */
export interface IntakeSlotConfirmation {
  slot: IntakeMacroSlot;
  direction: string;
  confirmationType: "base-direction" | "lock-candidate";
  /** Persona-rendered confirmation prompt to show the user. */
  prompt: string;
}

export interface IntakeSlotProgress {
  slot: IntakeMacroSlot;
  topDirection?: string;
  topScore: number;
  supportingSignals: string[];
  isBaseCaptured: boolean;
  /** Current lifecycle phase based on multi-condition heuristic. */
  phase: IntakeSlotPhase;
  /** Only populated when slot === "pattern" and a key element was identified. */
  patternIntent?: PatternIntentState;
}

export interface SlotDirectionCandidate {
  label: string;
  score: number;
  evidence: string[];
  sourceReadingIds: string[];
}

export interface MacroSlotState {
  slot: IntakeMacroSlot;
  status: MacroSlotStatus;
  topCandidates: SlotDirectionCandidate[];
  recentTrend: MacroSlotTrend;
  lastUpdatedBy?: AgentStateUpdateSource;
  openBranches: string[];
  questionFamilyIds: QuestionFamilyId[];
  topDirection?: string;
  topScore: number;
  supportingSignals: string[];
  patternIntent?: PatternIntentState;
}

export interface IntentIntakeGoalState {
  slots: IntakeSlotProgress[];
  completed: boolean;
  completionReason?: string;
  missingSlots: IntakeMacroSlot[];
  /** True when enough slots are captured to generate the first exploration batch. */
  readyForFirstGeneration: boolean;
  firstGenerationReason?: string;
  /**
   * Slots that just crossed lock-candidate threshold and need user confirmation.
   * Consumed by intentStabilization and rendered as a confirmation prompt.
   */
  pendingConfirmations: IntakeSlotConfirmation[];
}

export interface RawCue {
  text: string;
  cueType:
    | "explicit"
    | "metaphoric"
    | "comparative"
    | "negative-boundary"
    | "spatial"
    | "visual-weight";
  strength: number;
}

export interface MetaphorNote {
  sourceCue: string;
  interpretedAs: string[];
  uncertaintyNote?: string;
}

export interface InterpretedIntent {
  dominantEntryPoint: "space" | "mood" | "pattern-intent" | "color" | "presence";
  summary: string;
  designReading: string[];
  metaphorNotes: MetaphorNote[];
}

export interface SlotHypothesisBundle {
  impression?: {
    topDirections: Array<{ label: string; score: number; evidence: string[] }>;
    openQuestions: string[];
  };
  color?: {
    warmth?: { top: "warm" | "neutral" | "cool"; score: number };
    saturation?: { top: "muted" | "visible" | "vivid"; score: number };
    role?: { top: "atmospheric" | "noticeable"; score: number };
    evidence: string[];
    openQuestions: string[];
  };
  patternIntent?: {
    subject?: {
      candidates: Array<{ label: string; score: number; evidence: string[] }>;
    };
    rendering?: { top: string; score: number };
    abstractionPreference?: { top: "concrete" | "semi-abstract" | "abstract"; score: number };
    compositionFeeling?: { tags: string[]; score: number };
    complexity?: { top: "low" | "medium" | "high"; score: number };
    geometryVsOrganic?: { top: "organic" | "balanced" | "geometric"; score: number };
    evidence: string[];
    openQuestions: string[];
  };
  arrangement?: {
    density?: { top: "open" | "balanced" | "dense"; score: number };
    order?: { top: "free" | "balanced" | "ordered"; score: number };
    evidence: string[];
    openQuestions: string[];
  };
  space?: {
    roomType?: { top: "bedroom" | "living-room" | "study" | "office" | "other"; score: number };
    usageMode?: { tags: string[]; score: number };
    evidence: string[];
  };
  presence?: {
    blendingMode?: { top: "blended" | "softly-noticeable" | "focal"; score: number };
    visualWeight?: { top: "light" | "medium" | "strong"; score: number };
    evidence: string[];
    openQuestions: string[];
  };
}

export interface QuestionOpportunity {
  targetMacroSlot: "impression" | "color" | "patternIntent" | "arrangement" | "space" | "presence";
  targetSubslot: string;
  questionGoal: "disambiguate" | "narrow-branch" | "confirm-base-direction" | "collect-missing-slot";
  expectedGain: number;
  suggestedUserFacingAngle: string;
  basedOnEvidence: string[];
}

export interface ResolutionHint {
  familyId: string;
  status: "unresolved" | "narrowed" | "resolved";
  chosenBranch?: string;
  rejectedBranches?: string[];
  rationale: string;
}

export interface ConfidenceSummary {
  macroSlotCoverage: {
    impression: number;
    color: number;
    patternIntent: number;
    arrangement: number;
    space: number;
    presence: number;
  };
  baseReadySlots: string[];
  lockCandidateSlots: string[];
  missingCriticalSlots: string[];
  readyForFirstBatch: boolean;
}

export interface IntentSemanticMapping {
  rawCues: RawCue[];
  interpretedIntent: InterpretedIntent;
  slotHypotheses: SlotHypothesisBundle;
  questionOpportunities: QuestionOpportunity[];
  resolutionHints: ResolutionHint[];
  confidenceSummary: ConfidenceSummary;
}

export interface AgentNextAction {
  type: "ask-follow-up-question" | "request-slot-confirmation" | "generate-first-batch" | "hold";
  reason: string;
  prompt?: string;
  targetSlot?: IntakeMacroSlot;
  targetField?: HighValueField;
  questionFamilyId?: QuestionFamilyId;
}

export interface IntentIntakeAgentState {
  phase: IntakePhase;
  turnIndex: number;
  cumulativeText: string;
  slots: MacroSlotState[];
  goalState?: IntentIntakeGoalState;
  resolutionState?: QuestionResolutionState;
  previousQuestion?: QuestionTrace;
  questionHistory: QuestionTrace[];
  latestSemanticMapping?: IntentSemanticMapping;
  latestAnalysis?: EntryAgentResult;
  comparisonSelections: ComparisonSelectionRecord[];
  nextAction?: AgentNextAction;
  lastSignalType?: IntakeSignal["type"];
}

// ---------------------------------------------------------------------------
// Signal schema v1 — unified intake signal types for signal-first architecture
// ---------------------------------------------------------------------------

/** A user text utterance (the primary signal type for Stage 0). */
export interface TextIntakeSignal {
  type: "text";
  text: string;
  turnIndex: number;
  source: "user";
  /** Set when this text is a direct reply to a specific question. */
  replyToQuestionId?: string;
  /** Set when the reply maps to a known question family (helps resolution). */
  replyToQuestionFamilyId?: string;
}

/** User selects one or more opening options before or during text intake. */
export interface OpeningSelectionSignal {
  type: "opening-selection";
  selections: string[];
  turnIndex: number;
  source: "user";
}

export interface ComparisonSelectionSignal {
  type: "comparison-selection";
  selection: ComparisonSelectionRecord;
  turnIndex: number;
  source: "user";
}

/** User expresses a preference on a single image (Stage 1+). */
export interface ImagePreferenceSignal {
  type: "image-preference";
  action: "like" | "dislike" | "neutral-save";
  imageId: string;
  roundIndex: number;
  source: "user";
  note?: string;
  /**
   * Annotation values from the image, provided by the caller.
   * Used to map the image preference back to macro slot belief updates.
   */
  annotationHints?: {
    color?: { warmth?: number; saturation?: number };
    motif?: { complexity?: number; geometry?: number; organic?: number };
    arrangement?: { order?: number; spacing?: number };
    impression?: { calm?: number; energy?: number; softness?: number };
  };
}

/** User expresses a pairwise preference between two images (Stage 1+). */
export interface ImageComparisonSignal {
  type: "image-compare";
  preferredImageId: string;
  rejectedImageId: string;
  roundIndex: number;
  source: "user";
  note?: string;
}

/** User confirms or adjusts the agent's exploration strategy (Stage 2+). */
export interface ConfirmationSignal {
  type: "confirm-direction" | "phase-control";
  slot?: string;
  familyId?: string;
  choice:
    | "continue-this-direction"
    | "explore-other-options"
    | "soft-lock"
    | "unlock"
    | "go-broader"
    | "go-finer";
  source: "user";
  note?: string;
}

/** Unified intake signal — single entry point for all modalities. */
export type IntakeSignal =
  | TextIntakeSignal
  | OpeningSelectionSignal
  | ComparisonSelectionSignal
  | ImagePreferenceSignal
  | ImageComparisonSignal
  | ConfirmationSignal;

/**
 * Stateful context passed alongside a signal to `processIntakeSignal`.
 * Carries the inter-turn state that the signal alone does not contain.
 */
export interface IntakeSignalContext {
  /**
   * Full accumulated text from all turns including the current one.
   * Computed by the caller (e.g. intentStabilization) before invoking processIntakeSignal.
   * If absent, signal.text is used as the full text.
   */
  cumulativeText?: string;
  previousQuestionTrace?: QuestionTrace;
  questionHistory?: QuestionTrace[];
  resolutionState?: QuestionResolutionState;
  /** Previous goal state — passed through for phase-transition detection. */
  previousGoalState?: IntentIntakeGoalState;
  currentAgentState?: IntentIntakeAgentState;
  /**
   * Previous analysis result — required for image-preference and confirm-direction
   * signals that need to build on the existing semantic state.
   */
  previousAnalysis?: EntryAgentResult;
}

// ---------------------------------------------------------------------------

export interface AnswerAlignment {
  status: "initial" | "answered" | "partial" | "shifted";
  introducedFields: HighValueField[];
  note: string;
  source?: "rules" | "llm-guard" | "hybrid";
  confidence?: number;
}

export interface QuestionPlan {
  selectedGapId: string;
  primaryTargetType: QuestionTargetType;
  primaryTargetRef: string;
  selectedTargetField?: HighValueField;
  selectedTargetSlot?: EntryAgentSlotKey;
  selectedTargetAxes: EntryAgentAxisPath[];
  selectedQuestion: NextQuestionCandidate;
  whyThisQuestion: string;
  blockedBy: string[];
  deferredTargets: string[];
  answerAlignment?: AnswerAlignment;
  planningStrategy?: "default" | "advance" | "reframe" | "switch-thread";
  resolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
}

export interface ComparisonSelectionEffect {
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  intendedPath?: QueryInterpretationPath;
  patchHint: string;
  semanticDeltaHint: string;
  preferredPolarity?: "prefer" | "avoid";
  statePatch?: EntryAgentStatePatch;
  canonicalEffects?: {
    atmosphereQualities?: string[];
    patternQualities?: string[];
    presenceQualities?: string[];
    colorQualities?: string[];
    arrangementQualities?: string[];
  };
}

export interface ComparisonCandidate {
  id: string;
  groupId: string;
  intendedSplitDimension: string;
  curatedDisplayText: string;
  semanticDeltaHint: string;
  derivedFrom?: string[];
  selectionEffect: ComparisonSelectionEffect;
}

export interface ComparisonSelectionRecord {
  candidateId: string;
  groupId: string;
  intendedSplitDimension: string;
  mode: "prefer" | "reject";
  userFacingText: string;
  selectionEffect: ComparisonSelectionEffect;
}

export interface DisplayPlan {
  replySnapshot: string;
  comparisonCandidates: ComparisonCandidate[];
  whetherToAskQuestion: boolean;
  followUpQuestion?: string;
  plannerTrace: string[];
}

export interface EntryAgentSemanticPlanningResult {
  semanticUnderstanding: SemanticUnderstanding;
  semanticGaps: SemanticGap[];
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
  displayPlan?: DisplayPlan;
  questionResolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
  intakeGoalState?: IntentIntakeGoalState;
  semanticMapping?: IntentSemanticMapping;
  agentState?: IntentIntakeAgentState;
  nextAction?: AgentNextAction;
}

export interface EntryAgentResult
  extends EntryAgentDetectionResult,
    EntryAgentBridgeResult,
    EntryAgentRecommendationResult,
    EntryAgentInterpretationResult,
    EntryAgentSemanticPlanningResult,
    EntryAgentRoutingResult {}
