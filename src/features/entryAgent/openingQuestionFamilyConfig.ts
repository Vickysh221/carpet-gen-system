import type { IntentIntakeAgentState, IntakeMacroSlot } from "./types";
import { OPENING_OPTION_REGISTRY } from "./openingOptionRegistry";
import type { OpeningFamily, OpeningQuestionFamilyDefinition } from "./openingOptionsTypes";

const PRIMARY_OPENING_FAMILIES: OpeningFamily[] = ["mood", "space", "pattern-style"];
export const OPENING_FAMILY_SEQUENCE: OpeningFamily[] = ["mood", "space", "pattern-style"];

export const OPENING_QUESTION_FAMILY_CONFIG: Record<OpeningFamily, OpeningQuestionFamilyDefinition> = {
  mood: {
    family: "mood",
    prompt: "我们可以先从感觉开始，不急着想太具体。如果先只抓一个大方向，你更希望这块地毯偏哪种气质？可以先选 1-2 个：",
    allowsMultiple: true,
    maxSelections: 2,
    primary: true,
    targetSlots: ["impression", "color", "patternIntent", "presence"],
    optionIds: OPENING_OPTION_REGISTRY.filter((option) => option.family === "mood").map((option) => option.id),
    escapeHatchLabel: "都不是，我自己说",
  },
  space: {
    family: "space",
    prompt: "我们也可以先从场景切入。这块地毯你更想把它放在哪种空间里？",
    allowsMultiple: false,
    maxSelections: 1,
    primary: true,
    targetSlots: ["space", "impression", "patternIntent", "presence"],
    optionIds: OPENING_OPTION_REGISTRY.filter((option) => option.family === "space").map((option) => option.id),
    escapeHatchLabel: "都不是，我自己说",
  },
  "pattern-style": {
    family: "pattern-style",
    prompt: "如果先从图案方向开始，你更容易被哪类感觉打动？",
    allowsMultiple: false,
    maxSelections: 1,
    primary: true,
    targetSlots: ["patternIntent", "impression", "presence"],
    optionIds: OPENING_OPTION_REGISTRY.filter((option) => option.family === "pattern-style").map((option) => option.id),
    escapeHatchLabel: "都不是，我自己说",
  },
  presence: {
    family: "presence",
    prompt: "最后再确认一小步：你更希望这块地毯是融进整体，还是稍微跳出来一点？",
    allowsMultiple: false,
    maxSelections: 1,
    primary: false,
    targetSlots: ["presence", "color", "patternIntent"],
    optionIds: OPENING_OPTION_REGISTRY.filter((option) => option.family === "presence").map((option) => option.id),
  },
};

function slotNeedsOpening(slot: IntakeMacroSlot, agentState: IntentIntakeAgentState) {
  const slotState = agentState.slots.find((item) => item.slot === slot);
  if (!slotState) return true;
  return slotState.status === "empty" || slotState.status === "hinted";
}

function scoreOpeningFamily(family: OpeningFamily, agentState: IntentIntakeAgentState) {
  if (family === "mood") {
    return (slotNeedsOpening("impression", agentState) ? 3 : 0) + (slotNeedsOpening("color", agentState) ? 1 : 0);
  }
  if (family === "space") {
    return slotNeedsOpening("space", agentState) ? 4 : 0;
  }
  if (family === "pattern-style") {
    return slotNeedsOpening("pattern", agentState) ? 4 : 0;
  }
  return 0;
}

export function pickOpeningFamilyForAgentState(
  agentState: IntentIntakeAgentState,
  random: () => number = Math.random,
): OpeningQuestionFamilyDefinition {
  const firstUncovered = OPENING_FAMILY_SEQUENCE.find((family) => scoreOpeningFamily(family, agentState) > 0);
  if (firstUncovered) {
    return OPENING_QUESTION_FAMILY_CONFIG[firstUncovered];
  }

  const ranked = PRIMARY_OPENING_FAMILIES
    .map((family) => ({
      family,
      score: scoreOpeningFamily(family, agentState),
    }))
    .sort((left, right) => right.score - left.score);

  const topScore = ranked[0]?.score ?? 0;
  const candidates = ranked.filter((item) => item.score === topScore).map((item) => item.family);
  const selected = candidates[Math.floor(random() * Math.max(1, candidates.length))] ?? "mood";
  return OPENING_QUESTION_FAMILY_CONFIG[selected];
}

export function getOpeningFamiliesForFirstTurns(count = 3): OpeningQuestionFamilyDefinition[] {
  return OPENING_FAMILY_SEQUENCE.slice(0, count).map((family) => OPENING_QUESTION_FAMILY_CONFIG[family]);
}
