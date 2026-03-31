import type {
  EntryAgentAxisPath,
  EntryAgentDetectionResult,
  EntryAgentSlotKey,
  HighValueField,
  NarrativeOwnershipClass,
  QuestionKind,
  SemanticCueType,
  SemanticRouteHint,
  SemanticUnit,
} from "./types";

interface CueRule {
  cue: string;
  cueType: SemanticCueType;
  routeHint: SemanticRouteHint;
  ownershipClass: NarrativeOwnershipClass;
  questionKindHint: QuestionKind;
  disambiguationAxes: EntryAgentAxisPath[];
  informationGainHint: string;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  confidence: number;
  weight: number;
}

const CUE_RULES: CueRule[] = [
  {
    cue: "草色遥看近却无",
    cueType: "poetic",
    routeHint: "prototype",
    ownershipClass: "ambiguity-only",
    questionKindHint: "strength",
    disambiguationAxes: ["color.saturation", "impression.energy"],
    informationGainHint: "用户回答后，可减少这个 subtle cue 是想保留轻微颜色存在，还是只是不要太显眼的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.64,
    weight: 0.48,
  },
  {
    cue: "安静日常感",
    cueType: "prototype",
    routeHint: "prototype",
    ownershipClass: "primary-eligible",
    questionKindHint: "anchor",
    disambiguationAxes: ["impression.calm", "impression.softness"],
    informationGainHint: "用户回答后，可减少当前表达更接近日常安静原型，还是只是一般柔和印象的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.82,
    weight: 0.78,
  },
  {
    cue: "轻陪伴感",
    cueType: "prototype",
    routeHint: "prototype",
    ownershipClass: "primary-eligible",
    questionKindHint: "anchor",
    disambiguationAxes: ["impression.softness", "impression.calm"],
    informationGainHint: "用户回答后，可减少用户要的是轻陪伴氛围，还是更泛的温暖柔和感的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.78,
    weight: 0.72,
  },
  {
    cue: "咖啡时光",
    cueType: "prototype",
    routeHint: "prototype",
    ownershipClass: "primary-eligible",
    questionKindHint: "anchor",
    disambiguationAxes: ["color.warmth", "impression.softness"],
    informationGainHint: "用户回答后，可减少当前入口语义更接近日常陪伴型咖啡原型，还是更偏一般温暖印象的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.82,
    weight: 0.76,
  },
  {
    cue: "若有若无",
    cueType: "poetic",
    routeHint: "prototype",
    ownershipClass: "secondary-only",
    questionKindHint: "clarify",
    disambiguationAxes: ["color.saturation", "impression.energy"],
    informationGainHint: "用户回答后，可减少这个 subtle cue 更像轻微色彩存在，还是更像整体存在感降低的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.68,
    weight: 0.5,
  },
  {
    cue: "轻存在感",
    cueType: "poetic",
    routeHint: "prototype",
    ownershipClass: "secondary-only",
    questionKindHint: "clarify",
    disambiguationAxes: ["impression.energy", "impression.calm"],
    informationGainHint: "用户回答后，可减少用户是想保留轻微存在感，还是主要想避免太抢眼的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.68,
    weight: 0.54,
  },
  {
    cue: "别太抢",
    cueType: "impression-energy",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["impression.energy", "impression.calm"],
    informationGainHint: "用户回答后，可减少整体氛围到底要更低刺激，还是仍要保留存在感的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.86,
    weight: 0.8,
  },
  {
    cue: "存在感",
    cueType: "impression-energy",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["impression.energy", "impression.calm"],
    informationGainHint: "用户回答后，可减少整体氛围到底偏安静，还是要保留存在感的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.84,
    weight: 0.8,
  },
  {
    cue: "张扬",
    cueType: "impression-energy",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["impression.energy", "impression.calm"],
    informationGainHint: "用户回答后，可减少整体印象是明确想更外放，还是只是不想太平淡的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.84,
    weight: 0.82,
  },
  {
    cue: "快乐",
    cueType: "impression-energy",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["impression.energy", "impression.softness"],
    informationGainHint: "用户回答后，可减少用户要的是更有活力的快乐感，还是更轻柔明快的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.78,
    weight: 0.74,
  },
  {
    cue: "低调",
    cueType: "impression-energy",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["impression.calm", "impression.energy"],
    informationGainHint: "用户回答后，可减少用户是在要更低刺激低调，还是只是不要太抢的不确定性。",
    targetField: "overallImpression",
    targetSlot: "impression",
    confidence: 0.84,
    weight: 0.78,
  },
  {
    cue: "克制",
    cueType: "direct",
    routeHint: "direct",
    ownershipClass: "secondary-only",
    questionKindHint: "clarify",
    disambiguationAxes: ["impression.energy", "color.saturation"],
    informationGainHint: "用户回答后，可减少“克制”是在说整体气质 restraint，还是颜色存在感 restraint 的不确定性。",
    confidence: 0.72,
    weight: 0.58,
  },
  {
    cue: "草色",
    cueType: "direct",
    routeHint: "direct",
    ownershipClass: "secondary-only",
    questionKindHint: "contrast",
    disambiguationAxes: ["color.warmth", "color.saturation"],
    informationGainHint: "用户回答后，可减少颜色问题到底是更自然偏草木，还是主要想更淡更收的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.74,
    weight: 0.62,
  },
  {
    cue: "淡一点",
    cueType: "direct",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["color.saturation", "color.warmth"],
    informationGainHint: "用户回答后，可减少颜色上是主要想更淡更克制，还是想往更暖一点走的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.82,
    weight: 0.76,
  },
  {
    cue: "收一点",
    cueType: "direct",
    routeHint: "direct",
    ownershipClass: "primary-eligible",
    questionKindHint: "contrast",
    disambiguationAxes: ["color.saturation", "impression.energy"],
    informationGainHint: "用户回答后，可减少用户是在说颜色收一点，还是整体存在感收一点的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.76,
    weight: 0.72,
  },
  {
    cue: "雾里有色",
    cueType: "poetic",
    routeHint: "retrieval-entry",
    ownershipClass: "ambiguity-only",
    questionKindHint: "strength",
    disambiguationAxes: ["color.saturation"],
    informationGainHint: "用户回答后，可减少这种雾感色彩只是辅助修饰，还是需要被稳定保留的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.62,
    weight: 0.42,
  },
  {
    cue: "朦胧",
    cueType: "poetic",
    routeHint: "retrieval-entry",
    ownershipClass: "ambiguity-only",
    questionKindHint: "strength",
    disambiguationAxes: ["color.saturation", "impression.softness"],
    informationGainHint: "用户回答后，可减少这种朦胧感是颜色层面的 subtle 感，还是整体氛围 softening 的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.6,
    weight: 0.4,
  },
  {
    cue: "雾感",
    cueType: "poetic",
    routeHint: "retrieval-entry",
    ownershipClass: "ambiguity-only",
    questionKindHint: "strength",
    disambiguationAxes: ["color.saturation", "impression.softness"],
    informationGainHint: "用户回答后，可减少 retrieval 命中的雾感是否只是辅助修饰，还是用户明确想保留的方向的不确定性。",
    targetField: "colorMood",
    targetSlot: "color",
    confidence: 0.62,
    weight: 0.42,
  },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function buildUnitId(index: number, cue: string) {
  return `semantic-unit:${index}:${cue}`;
}

function createUnit(index: number, rule: CueRule): SemanticUnit {
  return {
    id: buildUnitId(index, rule.cue),
    cue: rule.cue,
    cueType: rule.cueType,
    routeHint: rule.routeHint,
    ownershipClass: rule.ownershipClass,
    questionKindHint: rule.questionKindHint,
    disambiguationAxes: rule.disambiguationAxes,
    informationGainHint: rule.informationGainHint,
    targetField: rule.targetField,
    targetSlot: rule.targetSlot,
    candidateReadings: [],
    confidence: rule.confidence,
    weight: rule.weight,
  };
}

export function decomposeSemanticCues(
  input: { text: string },
  detection: EntryAgentDetectionResult,
): SemanticUnit[] {
  const text = normalizeText(input.text);
  const seenCues = new Set<string>();
  const units: SemanticUnit[] = [];

  [...CUE_RULES]
    .sort((left, right) => right.cue.length - left.cue.length)
    .forEach((rule) => {
      if (!text.includes(rule.cue) || seenCues.has(rule.cue)) {
        return;
      }

      if (rule.targetField && !detection.hitFields.includes(rule.targetField)) {
        return;
      }

      seenCues.add(rule.cue);
      units.push(createUnit(units.length, rule));
    });

  if (units.length > 0) {
    return units;
  }

  return detection.hitFields.map((field, index) => ({
    id: buildUnitId(index, field),
    cue: detection.evidence[field]?.[0] ?? field,
    cueType: "unsupported",
    routeHint: "fallback",
    ownershipClass: "ambiguity-only",
    questionKindHint: "anchor",
    disambiguationAxes: [],
    informationGainHint: `用户回答后，可减少 ${field} 当前还没有稳定 anchor 的不确定性。`,
    targetField: field,
    targetSlot:
      field === "overallImpression"
        ? "impression"
        : field === "colorMood"
          ? "color"
          : field === "patternTendency"
            ? "motif"
            : field === "arrangementTendency"
              ? "arrangement"
              : undefined,
    candidateReadings: [],
    confidence: 0.4,
    weight: 0.36,
  }));
}
