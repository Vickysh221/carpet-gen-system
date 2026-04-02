import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { OPENING_OPTION_REGISTRY } from "../src/features/entryAgent/openingOptionRegistry.ts";
import { POETIC_MAPPINGS } from "../src/features/entryAgent/poeticMappings.ts";

interface PythonRetrievalMatch {
  id: string;
  text: string;
  score: number;
  source?: string;
}

interface PythonRetrievalResponse {
  model: {
    source: string;
    source_type: string;
    requested_model_path: string;
    fallback_model_name: string;
  };
  results: PythonRetrievalMatch[];
}

interface RetrievalCandidate {
  id: string;
  text: string;
  source: "poeticMappings" | "openingOptions" | "explicitMotifs";
}

const OPENING_FAMILY_CONTEXT: Record<string, string> = {
  mood: "情绪 氛围 感受",
  space: "空间 场景 使用场所",
  "pattern-style": "图案 纹样 视觉元素",
  presence: "存在感 视觉权重 与整体关系",
};

const EXPLICIT_MOTIF_CANDIDATES = [
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pythonExecutable = path.join(repoRoot, "backend", ".venv", "bin", "python");
const pythonEntry = path.join(repoRoot, "backend", "app", "services", "bge_m3_retrieval.py");
const defaultModelPath = process.env.BGE_M3_MODEL_PATH ?? "/Users/vickyshou/.cache/huggingface/hub/models--BAAI--bge-m3";

const queries = ["烟雨三月", "月白风清", "像竹影", "花叶意向", "荷花在风里摇曳", "孤帆"];
const candidates = buildSemanticRetrievalCandidates();

function buildSemanticRetrievalCandidates(): RetrievalCandidate[] {
  const poeticCandidates = POETIC_MAPPINGS.map((mapping) => ({
    id: `poetic:${mapping.key}`,
    source: "poeticMappings" as const,
    text: [
      mapping.key,
      ...mapping.aliases,
      ...(mapping.perceptualEffects?.color ?? []),
      ...(mapping.perceptualEffects?.impression ?? []),
      ...(mapping.perceptualEffects?.patternIntent ?? []),
      ...(mapping.perceptualEffects?.presence ?? []),
    ].join(" "),
  }));

  const openingCandidates = OPENING_OPTION_REGISTRY.map((option) => ({
    id: `opening:${option.id}`,
    source: "openingOptions" as const,
    text: [option.label, ...(option.aliases ?? []), OPENING_FAMILY_CONTEXT[option.family] ?? option.family].join(" "),
  }));

  const motifCandidates = EXPLICIT_MOTIF_CANDIDATES.map((candidate) => ({
    id: `motif:${candidate.id}`,
    source: "explicitMotifs" as const,
    text: [candidate.label, ...candidate.aliases, candidate.description].join(" "),
  }));

  return [...poeticCandidates, ...openingCandidates, ...motifCandidates];
}

function runRetrieval(query: string, k = 5): PythonRetrievalResponse {
  const payload = JSON.stringify({
    query,
    k,
    candidates,
  });

  const result = spawnSync(pythonExecutable, [pythonEntry, "--task", "retrieve", "--model-path", defaultModelPath], {
    cwd: repoRoot,
    encoding: "utf-8",
    input: payload,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Python retrieval exited with status ${String(result.status)}`);
  }

  return JSON.parse(result.stdout) as PythonRetrievalResponse;
}

function main(): void {
  let modelInfo: PythonRetrievalResponse["model"] | null = null;

  console.log(`Model path: ${defaultModelPath}`);
  console.log(`Candidates: ${candidates.length}`);

  for (const query of queries) {
    const response = runRetrieval(query, 5);
    modelInfo = response.model;

    console.log(`\nQuery: ${query}`);
    response.results.forEach((item, index) => {
      console.log(
        `${index + 1}. [${item.source ?? "unknown"}] ${item.id} | score=${item.score.toFixed(4)} | ${item.text}`,
      );
    });
  }

  if (modelInfo) {
    console.log("\nModel info:");
    console.log(JSON.stringify(modelInfo, null, 2));
  }
}

main()
