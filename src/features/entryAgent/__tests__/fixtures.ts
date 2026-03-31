import type { EntryAgentInput, HighValueField, QaMode, SlotStateStatus } from "../types";
import type { SemanticGapType } from "../types";

interface EntryAgentFixtureExpectation {
  hitFields?: HighValueField[];
  updatedSlotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
  suggestedQaMode?: QaMode;
  ambiguityIncludes?: string[];
  requiredAxisHints?: string[];
  requiredWeakBiasSources?: string[];
  requiredPatchPaths?: string[];
  requiredSemanticHints?: string[];
  requiredPrototypeMatches?: string[];
  requiredKeptReadings?: string[];
  requiredSuppressedReadings?: string[];
  requiredMergeRelations?: string[];
  fallbackTriggered?: boolean;
  requiredSemanticGapTypes?: SemanticGapType[];
  questionIntent?: string;
  selectedTargetField?: HighValueField;
  selectedTargetSlot?: string;
  requiredTargetAxes?: string[];
  questionPromptIncludes?: string[];
}

export interface EntryAgentFixture {
  name: string;
  input: EntryAgentInput;
  expectation: EntryAgentFixtureExpectation;
}

export const ENTRY_AGENT_FIXTURES: EntryAgentFixture[] = [
  {
    name: "prototype-first coffee",
    input: { text: "想要一点咖啡感" },
    expectation: {
      hitFields: ["colorMood"],
      updatedSlotStates: { colorMood: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredAxisHints: ["color.warmth", "color.saturation"],
      requiredPatchPaths: ["color.warmth", "impression.softness"],
      requiredSemanticHints: ["colorMood", "impression"],
      requiredPrototypeMatches: ["coffee"],
      requiredKeptReadings: ["prototype:coffee:coffee-color-warmth"],
      requiredMergeRelations: [],
      fallbackTriggered: false,
      requiredSemanticGapTypes: ["missing-slot"],
      questionIntent: "fill-missing-slot",
      selectedTargetField: "colorMood",
      selectedTargetSlot: "color",
      requiredTargetAxes: ["color.warmth", "color.saturation"],
      questionPromptIncludes: ["颜色", "偏暖", "别太跳"],
    },
  },
  {
    name: "dual-route natural",
    input: { text: "想自然一点" },
    expectation: {
      hitFields: ["patternTendency"],
      updatedSlotStates: { patternTendency: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredAxisHints: ["motif.organic", "color.saturation"],
      requiredPatchPaths: ["motif.organic", "impression.softness"],
      requiredSemanticHints: ["patternTendency"],
      requiredPrototypeMatches: ["natural-ease"],
      requiredKeptReadings: ["prototype:natural-ease:natural-organic"],
      requiredSuppressedReadings: ["direct-pattern-natural"],
      requiredMergeRelations: ["reinforcement"],
      fallbackTriggered: false,
      requiredSemanticGapTypes: ["missing-slot"],
      questionIntent: "fill-missing-slot",
      selectedTargetField: "patternTendency",
      selectedTargetSlot: "motif",
      requiredTargetAxes: ["motif.geometry", "motif.organic"],
      questionPromptIncludes: ["自然一点", "几何", "自然生长"],
    },
  },
  {
    name: "direct-first floral restraint",
    input: { text: "不要太花" },
    expectation: {
      hitFields: ["patternTendency"],
      updatedSlotStates: { patternTendency: "weak-signal" },
      suggestedQaMode: "exploratory-intake",
      ambiguityIncludes: ["不要太花"],
      requiredAxisHints: ["motif.complexity"],
      requiredPatchPaths: ["motif.complexity", "color.saturation"],
      requiredSemanticHints: ["patternComplexity"],
      requiredPrototypeMatches: ["visual-restraint"],
      requiredKeptReadings: ["direct-pattern-not-too-floral"],
      requiredSuppressedReadings: ["fallback:not-too-floral-color-restraint"],
      requiredMergeRelations: ["reinforcement", "refinement"],
      fallbackTriggered: true,
      requiredSemanticGapTypes: ["unresolved-ambiguity"],
      questionIntent: "resolve-ambiguity",
      selectedTargetField: "patternTendency",
      selectedTargetSlot: "motif",
      requiredTargetAxes: ["motif.complexity", "motif.geometry"],
      questionPromptIncludes: ["图案太碎太花", "太几何"],
    },
  },
];
