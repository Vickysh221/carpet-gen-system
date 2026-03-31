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

export type SemanticGapType = "prototype-conflict" | "unresolved-ambiguity" | "missing-slot";

export type QuestionTargetType = "conflict" | "ambiguity" | "slot";

export type QuestionIntent = "resolve-prototype-conflict" | "resolve-ambiguity" | "fill-missing-slot";

export type EntryAgentSlotKey = "color" | "motif" | "arrangement" | "impression";

export type EntryAgentAxisMap = {
  color: "warmth" | "saturation";
  motif: "complexity" | "geometry" | "organic";
  arrangement: "order" | "spacing";
  impression: "calm" | "energy" | "softness";
};

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

export interface FieldAmbiguity {
  field: HighValueField;
  note: string;
  candidateAxes?: EntryAgentAxisHints;
}

export type PrototypeRouteType = "prototype-first" | "dual-route" | "direct-first-with-fallback";

export type InterpretationSourceType = "direct" | "prototype" | "fallback-candidate";

export type MergeRelation = "reinforcement" | "refinement" | "conflict";

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
  candidates: InterpretationCandidate[];
}

export interface InterpretationMergeResult {
  directCandidates: InterpretationCandidate[];
  prototypeMatches: PrototypeMatch[];
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
}

export interface SemanticGap {
  id: string;
  type: SemanticGapType;
  priority: number;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  relatedReadingIds: string[];
  reason: string;
  evidence: string[];
  expectedGain: string;
}

export interface NextQuestionCandidate {
  id: string;
  targetType: QuestionTargetType;
  targetRef: string;
  questionIntent: QuestionIntent;
  prompt: string;
  priority: number;
  resolvesGapIds: string[];
  expectedInformationGain: string;
}

export interface QuestionPlan {
  primaryTargetType: QuestionTargetType;
  primaryTargetRef: string;
  selectedQuestion: NextQuestionCandidate;
  whyThisQuestion: string;
  blockedBy: string[];
  deferredTargets: string[];
}

export interface EntryAgentSemanticPlanningResult {
  semanticUnderstanding: SemanticUnderstanding;
  semanticGaps: SemanticGap[];
  questionCandidates: NextQuestionCandidate[];
  questionPlan?: QuestionPlan;
}

export interface EntryAgentResult
  extends EntryAgentDetectionResult,
    EntryAgentBridgeResult,
    EntryAgentRecommendationResult,
    EntryAgentInterpretationResult,
    EntryAgentSemanticPlanningResult {}
