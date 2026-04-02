import { OPENING_OPTION_REGISTRY } from "./openingOptionRegistry";
import { POETIC_MAPPINGS } from "./poeticMappings";

export type SemanticCandidateSource = "poeticMappings" | "openingOptions" | "explicitMotifs";

export interface SemanticCandidate {
  id: string;
  text: string;
  source: SemanticCandidateSource;
}

export interface SemanticRetrievalMatch extends SemanticCandidate {
  score: number;
}

export interface ExplicitMotifCandidateDefinition {
  id: string;
  label: string;
  aliases: string[];
  description: string;
}

const OPENING_FAMILY_CONTEXT: Record<string, string> = {
  mood: "情绪 氛围 感受",
  space: "空间 场景 使用场所",
  "pattern-style": "图案 纹样 视觉元素",
  presence: "存在感 视觉权重 与整体关系",
};

export const EXPLICIT_MOTIF_CANDIDATES: ExplicitMotifCandidateDefinition[] = [
  {
    id: "floral",
    label: "floral",
    aliases: ["花卉", "花意", "花朵", "花叶意向"],
    description: "偏花卉主体、花瓣展开、柔性装饰感。",
  },
  {
    id: "lotus",
    label: "lotus",
    aliases: ["荷花", "莲", "莲叶", "荷花在风里摇曳"],
    description: "偏荷花、莲叶、水边植物、轻微摇曳的东方水生意象。",
  },
  {
    id: "botanical",
    label: "botanical",
    aliases: ["植物", "枝叶", "叶片", "花叶", "竹影"],
    description: "偏叶片、枝条、植物纹理和自然生长感。",
  },
  {
    id: "sail",
    label: "sail",
    aliases: ["孤帆", "帆影", "云帆", "舟帆"],
    description: "偏帆、远行、留白中的单体视觉锚点。",
  },
  {
    id: "water-wave",
    label: "water-wave",
    aliases: ["波纹", "水波", "水意流动", "云气"],
    description: "偏波纹、水面流线、柔和起伏和扩散感。",
  },
  {
    id: "light-trace",
    label: "light-trace",
    aliases: ["灯火", "微光", "暮色里的灯火", "光痕"],
    description: "偏微光、灯火、夜色中的发亮痕迹和局部点亮。",
  },
  {
    id: "stone-texture",
    label: "stone-texture",
    aliases: ["石纹", "岩层", "石头肌理", "冷石头"],
    description: "偏石材、矿物层理、粗细变化的表面肌理。",
  },
];

export function buildPoeticMappingCandidates(): SemanticCandidate[] {
  return POETIC_MAPPINGS.map((mapping) => {
    const effectTokens = [
      ...(mapping.perceptualEffects?.color ?? []),
      ...(mapping.perceptualEffects?.impression ?? []),
      ...(mapping.perceptualEffects?.patternIntent ?? []),
      ...(mapping.perceptualEffects?.presence ?? []),
    ];
    return {
      id: `poetic:${mapping.key}`,
      source: "poeticMappings",
      text: [mapping.key, ...mapping.aliases, ...effectTokens].join(" "),
    };
  });
}

export function buildOpeningOptionCandidates(): SemanticCandidate[] {
  return OPENING_OPTION_REGISTRY.map((option) => ({
    id: `opening:${option.id}`,
    source: "openingOptions",
    text: [option.label, ...(option.aliases ?? []), OPENING_FAMILY_CONTEXT[option.family] ?? option.family].join(" "),
  }));
}

export function buildExplicitMotifCandidates(): SemanticCandidate[] {
  return EXPLICIT_MOTIF_CANDIDATES.map((candidate) => ({
    id: `motif:${candidate.id}`,
    source: "explicitMotifs",
    text: [candidate.label, ...candidate.aliases, candidate.description].join(" "),
  }));
}

export function buildSemanticRetrievalCandidates(): SemanticCandidate[] {
  return [...buildPoeticMappingCandidates(), ...buildOpeningOptionCandidates(), ...buildExplicitMotifCandidates()];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
}

export function retrieveTopK(
  queryEmbedding: number[],
  candidates: Array<SemanticCandidate & { embedding: number[] }>,
  k: number,
): SemanticRetrievalMatch[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      text: candidate.text,
      source: candidate.source,
      score: cosineSimilarity(queryEmbedding, candidate.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, k));
}
