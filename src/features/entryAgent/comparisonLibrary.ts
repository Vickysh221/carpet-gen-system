import type { SemanticRetrievalCandidate, SemanticRetrievalMatchResult } from "@/lib/api";
import type { ComparisonCandidate, EntryAgentSlotKey, HighValueField, QueryInterpretationPath } from "./types";

interface ComparisonSeed {
  id: string;
  groupId: string;
  intendedSplitDimension: string;
  curatedDisplayText: string;
  semanticDeltaHint: string;
  retrievalText: string;
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  intendedPath?: QueryInterpretationPath;
  patchHint: string;
}

function toCandidate(seed: ComparisonSeed): ComparisonCandidate {
  return {
    id: seed.id,
    groupId: seed.groupId,
    intendedSplitDimension: seed.intendedSplitDimension,
    curatedDisplayText: seed.curatedDisplayText,
    semanticDeltaHint: seed.semanticDeltaHint,
    selectionEffect: {
      targetField: seed.targetField,
      targetSlot: seed.targetSlot,
      intendedPath: seed.intendedPath,
      patchHint: seed.patchHint,
      semanticDeltaHint: seed.semanticDeltaHint,
      preferredPolarity: "prefer",
      canonicalEffects: buildCanonicalEffects(seed),
    },
  };
}

function buildCanonicalEffects(seed: ComparisonSeed): NonNullable<ComparisonCandidate["selectionEffect"]["canonicalEffects"]> {
  if (seed.id === "atmosphere-humidity-suspended") {
    return {
      atmosphereQualities: ["humid suspended air", "pre-rain tension"],
      patternQualities: ["suspended field"],
      presenceQualities: ["low motif presence"],
    };
  }
  if (seed.id === "atmosphere-boundary-lowered") {
    return {
      atmosphereQualities: ["lowered boundary", "restrained pressure"],
      patternQualities: ["compressed horizon"],
    };
  }
  if (seed.id === "atmosphere-mist-flow") {
    return {
      atmosphereQualities: ["mist drift"],
      arrangementQualities: ["directional flow"],
      patternQualities: ["soft vapor movement"],
    };
  }
  if (seed.id === "atmosphere-clear-quiet") {
    return {
      atmosphereQualities: ["clear quiet"],
      colorQualities: ["thin air clarity"],
    };
  }
  if (seed.id === "atmosphere-soft-diffusion") {
    return {
      atmosphereQualities: ["soft diffusion"],
      patternQualities: ["blurred edge"],
    };
  }
  if (seed.groupId === "motif-trace") {
    return {
      patternQualities: [seed.intendedSplitDimension, seed.id.replace(/^motif-/, "")],
      presenceQualities: ["controlled motif visibility"],
    };
  }
  return {
    presenceQualities: [seed.intendedSplitDimension],
  };
}

const ATMOSPHERE_COMPARISONS: ComparisonSeed[] = [
  {
    id: "atmosphere-humidity-suspended",
    groupId: "atmosphere",
    intendedSplitDimension: "humidity-vs-suspension",
    curatedDisplayText: "更偏潮气悬在表面上，空气像还没落下来的雨，图案不会急着成形。",
    semanticDeltaHint: "raise humidity and suspension; keep motif presence low",
    retrievalText: "雨前空气 潮气悬着 湿度高 临界 悬浮 未落下来的雨 轻压感",
    targetField: "overallImpression",
    targetSlot: "impression",
    intendedPath: "atmosphere-first",
    patchHint: "让 atmosphere 更湿、更悬浮，优先保留未落下来的空气感。",
  },
  {
    id: "atmosphere-boundary-lowered",
    groupId: "atmosphere",
    intendedSplitDimension: "boundary-pressure",
    curatedDisplayText: "更偏边界被压低，天和地的分界往下沉，整体更安静也更收住。",
    semanticDeltaHint: "lower visual horizon; increase restraint and pressure",
    retrievalText: "边界压低 地平线下沉 压力 沉 静 收住 浓重 厚重 墨压下来",
    targetField: "overallImpression",
    targetSlot: "impression",
    intendedPath: "atmosphere-first",
    patchHint: "让边界更低、更沉，优先控制压低感与克制感。",
  },
  {
    id: "atmosphere-mist-flow",
    groupId: "atmosphere",
    intendedSplitDimension: "mist-flow-direction",
    curatedDisplayText: "更偏细雾在轻轻流动，不是整片朦，而是有一点水汽自己的走势。",
    semanticDeltaHint: "preserve flow and directional vapor; soften hard edges",
    retrievalText: "细雾流动 水汽走势 渗开 墨迹流动 方向性 轻微扩散",
    targetField: "arrangementTendency",
    targetSlot: "arrangement",
    intendedPath: "atmosphere-first",
    patchHint: "把雾感从静态朦胧推向轻微流动和方向性。",
  },
  {
    id: "atmosphere-clear-quiet",
    groupId: "atmosphere",
    intendedSplitDimension: "clarity-vs-haze",
    curatedDisplayText: "更偏清透安静，像空气被擦得很薄，只留下冷静和轻微的亮。",
    semanticDeltaHint: "raise clarity; reduce haze while keeping quietness",
    retrievalText: "清透 薄 透气 留白 冷静 轻亮 不厚 不浓重 空气被擦薄",
    targetField: "colorMood",
    targetSlot: "color",
    intendedPath: "atmosphere-first",
    patchHint: "把气氛往清透和轻亮推，不让雾感吃掉边界。",
  },
  {
    id: "atmosphere-soft-diffusion",
    groupId: "atmosphere",
    intendedSplitDimension: "diffusion-vs-edge",
    curatedDisplayText: "更偏柔化扩散，颜色和形体彼此让开，不强调轮廓，只保留慢慢散开的气息。",
    semanticDeltaHint: "increase diffusion; reduce edge definition and focality",
    retrievalText: "柔化 扩散 渗化 晕开 墨色散开 轮廓退后 不强调边缘",
    targetField: "overallImpression",
    targetSlot: "impression",
    intendedPath: "atmosphere-first",
    patchHint: "把轮廓继续打散，让柔化和扩散成为主要存在方式。",
  },
];

const MOTIF_TRACE_COMPARISONS: ComparisonSeed[] = [
  {
    id: "motif-trace-only",
    groupId: "motif-trace",
    intendedSplitDimension: "trace-strength",
    curatedDisplayText: "更像只剩痕迹，题材已经退到后面，只留下图案语言里的轻微回声。",
    semanticDeltaHint: "keep motif as residual trace; avoid explicit silhouette",
    retrievalText: "只剩痕迹 motif trace 回声 残留 弱对象 不具象",
    targetField: "patternTendency",
    targetSlot: "motif",
    intendedPath: "motif-trace-first",
    patchHint: "只保留 motif trace，不把对象轮廓真正立出来。",
  },
  {
    id: "motif-outline-hint",
    groupId: "motif-trace",
    intendedSplitDimension: "outline-retention",
    curatedDisplayText: "更像留一点轮廓，能感觉到它原来是什么，但还没有走到具象描写。",
    semanticDeltaHint: "retain faint outline; stay anti-literal",
    retrievalText: "留一点轮廓 弱轮廓 略可感知 不完全具象 outline hint",
    targetField: "patternTendency",
    targetSlot: "motif",
    intendedPath: "motif-trace-first",
    patchHint: "保留轻微轮廓，让 motif 可被感觉到但不过度具象。",
  },
  {
    id: "motif-slightly-readable",
    groupId: "motif-trace",
    intendedSplitDimension: "readability",
    curatedDisplayText: "更像可辨认一点，题材会被看出来，但仍然像地毯上的组织，而不是插画主体。",
    semanticDeltaHint: "raise readability without switching to literal rendering",
    retrievalText: "可辨认一点 题材可读 但非插画主体 anti-literal readable motif",
    targetField: "patternTendency",
    targetSlot: "motif",
    intendedPath: "motif-trace-first",
    patchHint: "让 motif 稍微可辨认，但继续压住具象化倾向。",
  },
  {
    id: "motif-accent-presence",
    groupId: "motif-trace",
    intendedSplitDimension: "accented-presence",
    curatedDisplayText: "更像点缀式存在，题材不是铺满全场，而是在局部轻轻被看到。",
    semanticDeltaHint: "use motif as accent, not field-wide coverage",
    retrievalText: "点缀式存在 局部出现 accent motif 局部被看见 不铺满",
    targetField: "patternTendency",
    targetSlot: "motif",
    intendedPath: "motif-trace-first",
    patchHint: "把 motif 收成局部点缀，而不是大面积主叙事。",
  },
];

const PRESENCE_COMPARISONS: ComparisonSeed[] = [
  {
    id: "presence-blended",
    groupId: "presence",
    intendedSplitDimension: "presence-intensity",
    curatedDisplayText: "更偏融进去，先让整体气氛成立，图案存在感退到空间之后。",
    semanticDeltaHint: "lower focality and surface contrast",
    retrievalText: "融进去 低存在感 不抢 退后 背景化 blended quiet",
    targetField: "overallImpression",
    targetSlot: "impression",
    intendedPath: "guided-disambiguation",
    patchHint: "降低存在感，让整体先待得住而不是先抓人。",
  },
  {
    id: "presence-softly-emerging",
    groupId: "presence",
    intendedSplitDimension: "presence-intensity",
    curatedDisplayText: "更偏轻轻浮出来，整体还是克制的，但会让人第二眼开始意识到它。",
    semanticDeltaHint: "slightly raise visibility while keeping restraint",
    retrievalText: "轻轻浮出来 第二眼看到 克制但可见 softly noticeable",
    targetField: "overallImpression",
    targetSlot: "impression",
    intendedPath: "guided-disambiguation",
    patchHint: "保留克制基线，只把存在感轻轻往上提一点。",
  },
  {
    id: "presence-locally-seen",
    groupId: "presence",
    intendedSplitDimension: "local-focus",
    curatedDisplayText: "更偏局部被看见，整张不抢，但会有一小段节奏或轮廓稍微立住。",
    semanticDeltaHint: "introduce local focus while keeping global calm",
    retrievalText: "局部被看见 局部焦点 轮廓立住 一小段节奏 focus local",
    targetField: "patternTendency",
    targetSlot: "motif",
    intendedPath: "guided-disambiguation",
    patchHint: "把存在感集中到局部，而不是整体一起抬高。",
  },
];

const ALL_COMPARISON_SEEDS = [
  ...ATMOSPHERE_COMPARISONS,
  ...MOTIF_TRACE_COMPARISONS,
  ...PRESENCE_COMPARISONS,
];

function seedById(id: string) {
  return ALL_COMPARISON_SEEDS.find((seed) => seed.id === id);
}

function composeDisplayText(seed: ComparisonSeed, query: string) {
  if (seed.groupId === "atmosphere") {
    return `我会先把“${query}”往这边理解：${seed.curatedDisplayText}`;
  }
  if (seed.groupId === "motif-trace") {
    return `如果把“${query}”收进图案语言里，它更像：${seed.curatedDisplayText}`;
  }
  return `顺着“${query}”继续收窄的话，它更靠近：${seed.curatedDisplayText}`;
}

export function getAtmosphereComparisons() {
  return ATMOSPHERE_COMPARISONS.map(toCandidate);
}

export function getMotifTraceComparisons() {
  return MOTIF_TRACE_COMPARISONS.map(toCandidate);
}

export function getPresenceComparisons() {
  return PRESENCE_COMPARISONS.map(toCandidate);
}

export function buildComparisonRetrievalCandidates(): SemanticRetrievalCandidate[] {
  return ALL_COMPARISON_SEEDS.map((seed) => ({
    id: `comparison:${seed.id}`,
    source: "comparisonLibrary",
    text: [
      seed.groupId,
      seed.intendedSplitDimension,
      seed.curatedDisplayText,
      seed.semanticDeltaHint,
      seed.retrievalText,
      seed.patchHint,
    ].join(" "),
  }));
}

export function fallbackComparisonCandidatesForPath(path: QueryInterpretationPath): ComparisonCandidate[] {
  if (path === "atmosphere-first") return getAtmosphereComparisons().slice(0, 4);
  if (path === "motif-trace-first") return getMotifTraceComparisons().slice(0, 4);
  if (path === "compositional-bridge") {
    return [
      getAtmosphereComparisons()[0],
      getAtmosphereComparisons()[2],
      getMotifTraceComparisons()[1],
      getMotifTraceComparisons()[2],
    ];
  }
  if (path === "constraint-first") {
    return [getPresenceComparisons()[0], getPresenceComparisons()[1], getAtmosphereComparisons()[4]];
  }
  return [getPresenceComparisons()[0], getPresenceComparisons()[1], getPresenceComparisons()[2], getAtmosphereComparisons()[3]];
}

export function composeComparisonCandidatesFromRetrieval(input: {
  query: string;
  matches: SemanticRetrievalMatchResult[];
  preferredPath: QueryInterpretationPath;
}): ComparisonCandidate[] {
  const selected = input.matches
    .filter((match) => match.source === "comparisonLibrary")
    .map((match) => seedById(match.id.replace(/^comparison:/, "")))
    .filter((seed): seed is ComparisonSeed => Boolean(seed))
    .filter((seed) => !seed.intendedPath || seed.intendedPath === input.preferredPath || input.preferredPath === "compositional-bridge")
    .slice(0, 4)
    .map((seed) => ({
      ...toCandidate(seed),
      curatedDisplayText: composeDisplayText(seed, input.query),
    }));

  if (selected.length >= 3) {
    return selected;
  }

  const merged = [...selected];
  for (const candidate of fallbackComparisonCandidatesForPath(input.preferredPath)) {
    if (merged.some((item) => item.id === candidate.id)) continue;
    merged.push(candidate);
    if (merged.length >= 4) break;
  }
  return merged;
}
