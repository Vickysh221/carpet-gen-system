import type { EntryAgentAxisPath, EntryAgentSlotKey, HighValueField, SlotQuestionMode } from "./types";

export interface SlotQuestionModeSpec {
  mode: SlotQuestionMode;
  targetAxes: EntryAgentAxisPath[];
  expectedInformationGain: string;
  buildPrompt: (context: { reason?: string }) => string;
}

export interface SlotQuestionSpec {
  field: HighValueField;
  slot?: EntryAgentSlotKey;
  modes: SlotQuestionModeSpec[];
}

export const SLOT_QUESTION_SPEC: Record<HighValueField, SlotQuestionSpec> = {
  overallImpression: {
    field: "overallImpression",
    slot: "impression",
    modes: [
      {
        mode: "contrast-calm-vs-presence",
        targetAxes: ["impression.calm", "impression.energy"],
        expectedInformationGain: "区分用户更在意整体低刺激安静，还是更希望保留存在感和活力。",
        buildPrompt: () => "如果先只收一个大方向，你更想让它整体偏安静放松，还是保留一点存在感和张力？",
      },
      {
        mode: "contrast-soft-vs-crisp",
        targetAxes: ["impression.softness"],
        expectedInformationGain: "确认用户要的是柔和松弛感，还是更利落清爽的整体印象。",
        buildPrompt: () => "你更想让整体感觉偏柔和松一点，还是更利落、干净一点？",
      },
    ],
  },
  colorMood: {
    field: "colorMood",
    slot: "color",
    modes: [
      {
        mode: "contrast-warm-vs-muted",
        targetAxes: ["color.warmth", "color.saturation"],
        expectedInformationGain: "区分用户是在要颜色更暖，还是主要想把颜色收住、别太跳。",
        buildPrompt: () => "如果先只收颜色方向，你更在意颜色偏暖一点，还是先把颜色收住、别太跳？",
      },
    ],
  },
  patternTendency: {
    field: "patternTendency",
    slot: "motif",
    modes: [
      {
        mode: "contrast-complexity-vs-geometry",
        targetAxes: ["motif.complexity", "motif.geometry"],
        expectedInformationGain: "区分用户是在回避图案太碎太花，还是主要在回避太强的几何硬感。",
        buildPrompt: () => "你现在更想先避免的是图案太碎太花，还是太硬、太几何？",
      },
      {
        mode: "contrast-geometry-vs-organic",
        targetAxes: ["motif.geometry", "motif.organic"],
        expectedInformationGain: "区分用户说的自然感是在追求更 organic 的图案，还是只是少一点几何感。",
        buildPrompt: () => "你说的自然一点，更像是想让图案少一点几何硬感，还是更有自然生长的感觉？",
      },
    ],
  },
  arrangementTendency: {
    field: "arrangementTendency",
    slot: "arrangement",
    modes: [
      {
        mode: "contrast-open-vs-ordered",
        targetAxes: ["arrangement.spacing", "arrangement.order"],
        expectedInformationGain: "区分用户更想要留白和呼吸感，还是更在意整体排布的秩序感。",
        buildPrompt: () => "如果先收排布方向，你更想让它留点呼吸感、松一点，还是更整齐、有秩序一点？",
      },
    ],
  },
  spaceContext: {
    field: "spaceContext",
    modes: [
      {
        mode: "anchor-space-context",
        targetAxes: [],
        expectedInformationGain: "补齐空间场景 anchor，减少后续风格解释的漂移。",
        buildPrompt: () => "这块地毯现在主要还是想服务哪个空间场景？",
      },
    ],
  },
};

export function getSlotQuestionSpec(field: HighValueField | undefined) {
  return field ? SLOT_QUESTION_SPEC[field] : undefined;
}
