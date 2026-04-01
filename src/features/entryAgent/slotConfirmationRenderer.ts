import type { IntakeMacroSlot, IntakeSlotConfirmation, PatternIntentState } from "./types";

type ConfirmationType = IntakeSlotConfirmation["confirmationType"];

/**
 * Persona-voice confirmation prompts for each macro slot.
 * Tone: friendly design expert, natural Chinese, not system-facing.
 */

const IMPRESSION_LOCK_VARIANTS = [
  (direction: string) => `整体那个${direction}的感觉我已经摸得比较稳了。我以后先沿这边走，还是你想看看另一种气质？`,
  (direction: string) => `我感觉"${direction}"这条线现在已经挺明确了。要不要以后都优先往这边探索？`,
  (direction: string) => `整体氛围方向我理解成${direction}，这个方向合适吗？还是你先不急着锁？`,
];

const COLOR_LOCK_VARIANTS = [
  (direction: string) => `颜色方向我摸得差不多了，更偏${direction}这边。我先沿这个方向走，还是你先不急着锁颜色？`,
  (direction: string) => `在颜色这块，${direction}的方向已经比较清晰了。我们要不要以后先往这边？`,
  (direction: string) => `颜色这层我现在更稳地理解成${direction}。后面优先按这个走，还是你还想留着别的可能？`,
];

const PATTERN_LOCK_VARIANTS = [
  (direction: string) => `图案方向我理解成${direction}，要不要以后先沿这条线？`,
  (direction: string) => `你对图案的想法现在更像是"${direction}"。我先按这个来，还是你还想看看其他图案风格？`,
  (direction: string) => `图案这层我比较稳地摸到了${direction}的方向。这个方向合适吗？`,
];

const PATTERN_KEY_ELEMENT_VARIANTS = [
  (el: string, abstraction: string) => `我抓到的是你想要"${el}"意向的感觉，默认会往更${abstraction}的表达走。这个方向合适吗，还是你更想要具象一点？`,
  (el: string, abstraction: string) => `"${el}"这个意向我已经记住了，会优先推${abstraction}感的方向。你觉得合适吗？`,
];

const ARRANGEMENT_LOCK_VARIANTS = [
  (direction: string) => `排布方式现在看起来更偏${direction}。要不要先沿这条线多探索？`,
  (direction: string) => `整体排布感觉已经收出了一个方向：${direction}。我先按这个来，还是你还没想好？`,
  (direction: string) => `排布这块我比较稳地摸到了${direction}的方向，以后优先往这边走？`,
];

const SPACE_LOCK_VARIANTS = [
  (direction: string) => `这块地毯主要服务"${direction}"的场景，是这样吗？`,
  (direction: string) => `我先理解成它放在${direction}，后面的推荐方向会按这个来调，可以吗？`,
];

function pickVariant<T>(variants: T[], seed: string): T {
  // Simple deterministic pick based on direction string length
  return variants[seed.length % variants.length];
}

function abstractionLabel(pref: PatternIntentState["abstractionPreference"]): string {
  if (pref === "concrete") return "具象";
  if (pref === "semi-abstract") return "半抽象";
  return "抽象";
}

export function buildSlotConfirmationPrompt(
  slot: IntakeMacroSlot,
  direction: string,
  confirmationType: ConfirmationType,
  patternIntent?: PatternIntentState,
): string {
  switch (slot) {
    case "impression":
      return pickVariant(IMPRESSION_LOCK_VARIANTS, direction)(direction);

    case "color":
      return pickVariant(COLOR_LOCK_VARIANTS, direction)(direction);

    case "pattern":
      // When we have a key element, use the pattern intent confirmation
      if (patternIntent?.keyElement) {
        const abstraction = abstractionLabel(patternIntent.abstractionPreference);
        return pickVariant(PATTERN_KEY_ELEMENT_VARIANTS, patternIntent.keyElement)(patternIntent.keyElement, abstraction);
      }
      return pickVariant(PATTERN_LOCK_VARIANTS, direction)(direction);

    case "arrangement":
      return pickVariant(ARRANGEMENT_LOCK_VARIANTS, direction)(direction);

    case "space":
      return pickVariant(SPACE_LOCK_VARIANTS, direction)(direction);

    default:
      return `"${direction}"这个方向我已经比较稳了。要不要以后优先往这边探索？`;
  }
}
