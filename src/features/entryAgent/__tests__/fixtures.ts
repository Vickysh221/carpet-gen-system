import type { EntryAgentInput, HighValueField, QaMode, SlotStateStatus } from "../types";

interface EntryAgentFixtureExpectation {
  hitFields?: HighValueField[];
  updatedSlotStates?: Partial<Record<HighValueField, SlotStateStatus>>;
  suggestedQaMode?: QaMode;
  ambiguityIncludes?: string[];
  requiredAxisHints?: string[];
  requiredWeakBiasSources?: string[];
  requiredPatchPaths?: string[];
  requiredSemanticHints?: string[];
}

export interface EntryAgentFixture {
  name: string;
  input: EntryAgentInput;
  expectation: EntryAgentFixtureExpectation;
}

export const ENTRY_AGENT_FIXTURES: EntryAgentFixture[] = [
  {
    name: "impression-led warm",
    input: { text: "想要温暖一点" },
    expectation: {
      hitFields: ["overallImpression", "colorMood"],
      suggestedQaMode: "exploratory-intake",
      ambiguityIncludes: ["温暖/温馨"],
      requiredAxisHints: ["impression.softness", "color.warmth"],
      requiredPatchPaths: ["impression.softness", "color.warmth"],
      requiredSemanticHints: ["impression"],
    },
  },
  {
    name: "impression-led calm",
    input: { text: "想更安静一点" },
    expectation: {
      hitFields: ["overallImpression"],
      updatedSlotStates: { overallImpression: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredAxisHints: ["impression.calm", "arrangement.spacing"],
      requiredPatchPaths: ["impression.calm", "color.saturation"],
      requiredSemanticHints: ["impression"],
    },
  },
  {
    name: "pattern-led floral restraint",
    input: { text: "不要太花" },
    expectation: {
      hitFields: ["patternTendency"],
      updatedSlotStates: { patternTendency: "weak-signal" },
      suggestedQaMode: "exploratory-intake",
      ambiguityIncludes: ["不要太花"],
      requiredAxisHints: ["motif.complexity"],
      requiredPatchPaths: ["motif.complexity", "color.saturation"],
      requiredSemanticHints: ["patternComplexity"],
    },
  },
  {
    name: "pattern-led fragmented restraint",
    input: { text: "图案别太碎" },
    expectation: {
      hitFields: ["patternTendency"],
      updatedSlotStates: { patternTendency: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredAxisHints: ["motif.complexity"],
      requiredPatchPaths: ["motif.complexity"],
      requiredSemanticHints: ["patternComplexity"],
    },
  },
  {
    name: "space-led bedroom",
    input: { text: "给卧室用的" },
    expectation: {
      hitFields: ["spaceContext"],
      updatedSlotStates: { spaceContext: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredWeakBiasSources: ["spaceContext: bedroom"],
      requiredSemanticHints: ["roomType"],
    },
  },
  {
    name: "space-led living room",
    input: { text: "想放客厅" },
    expectation: {
      hitFields: ["spaceContext"],
      updatedSlotStates: { spaceContext: "tentative" },
      suggestedQaMode: "slot-completion",
      requiredWeakBiasSources: ["spaceContext: livingRoom"],
      requiredSemanticHints: ["roomType"],
    },
  },
  {
    name: "mixed bedroom calm restrained pattern",
    input: { text: "想给卧室找一块更安静一点、不要太花的地毯" },
    expectation: {
      hitFields: ["spaceContext", "overallImpression", "patternTendency"],
      updatedSlotStates: {
        spaceContext: "tentative",
        overallImpression: "tentative",
        patternTendency: "weak-signal",
      },
      suggestedQaMode: "slot-completion",
      ambiguityIncludes: ["不要太花"],
      requiredAxisHints: ["impression.calm", "motif.complexity"],
      requiredWeakBiasSources: ["spaceContext: bedroom"],
      requiredPatchPaths: ["impression.calm", "motif.complexity"],
      requiredSemanticHints: ["roomType", "impression", "patternComplexity"],
    },
  },
  {
    name: "mixed living room presence but not tacky",
    input: { text: "客厅想更有存在感一点，但别太俗" },
    expectation: {
      hitFields: ["spaceContext", "overallImpression"],
      updatedSlotStates: {
        spaceContext: "tentative",
        overallImpression: "tentative",
      },
      suggestedQaMode: "slot-completion",
      requiredAxisHints: ["impression.energy", "color.saturation"],
      requiredWeakBiasSources: ["spaceContext: livingRoom"],
      requiredPatchPaths: ["impression.energy", "color.saturation"],
      requiredSemanticHints: ["roomType", "impression"],
    },
  },
  {
    name: "low-information browse",
    input: { text: "先给我看看" },
    expectation: {
      suggestedQaMode: "exploratory-intake",
    },
  },
  {
    name: "low-information undecided",
    input: { text: "还没想好" },
    expectation: {
      suggestedQaMode: "exploratory-intake",
    },
  },
  {
    name: "low-information pretty",
    input: { text: "想要好看一点" },
    expectation: {
      suggestedQaMode: "exploratory-intake",
    },
  },
];
