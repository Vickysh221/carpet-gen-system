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
  latestReplyText?: string;
  resolutionState?: QuestionResolutionState;
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

export interface EntryAgentSemanticPlanningResult {
  semanticUnderstanding: SemanticUnderstanding;
  semanticGaps: SemanticGap[];
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
  questionResolutionState?: QuestionResolutionState;
  latestResolution?: QuestionResolution;
}

export interface EntryAgentResult
  extends EntryAgentDetectionResult,
    EntryAgentBridgeResult,
    EntryAgentRecommendationResult,
    EntryAgentInterpretationResult,
    EntryAgentSemanticPlanningResult {}
