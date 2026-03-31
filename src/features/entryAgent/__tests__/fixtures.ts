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
  {
    name: "poetic subtle spring green",
    input: { text: "草色遥看近却无" },
    expectation: {
      hitFields: ["colorMood"],
      requiredSemanticHints: ["colorMood"],
      requiredSemanticGapTypes: ["weak-anchor"],
      selectedTargetField: "colorMood",
      selectedTargetSlot: "color",
      questionPromptIncludes: ["绿意", "春天的气息"],
    },
  },
  {
    name: "spring vivid green presence",
    input: { text: "春天 鲜艳 明媚 绿意盎然" },
    expectation: {
      hitFields: ["colorMood", "overallImpression"],
      requiredSemanticHints: ["colorMood"],
      requiredSemanticGapTypes: ["missing-slot"],
      questionPromptIncludes: ["绿意", "春天的气息"],
    },
  },
  {
    name: "coffee time atmosphere",
    input: { text: "咖啡时光" },
    expectation: {
      hitFields: ["colorMood"],
      requiredSemanticHints: ["colorMood"],
      requiredPrototypeMatches: ["coffee-time"],
      questionPromptIncludes: ["温度感", "日常陪伴"],
    },
  },
  {
    name: "showy joyful presence",
    input: { text: "张扬快乐" },
    expectation: {
      hitFields: ["overallImpression"],
      requiredSemanticHints: ["impression"],
      selectedTargetField: "overallImpression",
      questionPromptIncludes: ["快乐有张力", "存在感稍微收一点"],
    },
  },
];
