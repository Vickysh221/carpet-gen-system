import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { semanticRetrievalToSlotDelta } from "../src/features/entryAgent/retrievalSemanticBridge.ts";
import { buildSemanticRetrievalCandidates, type SemanticRetrievalMatch } from "../src/features/entryAgent/semanticRetrieval.ts";

interface PythonRetrievalResponse {
  results: SemanticRetrievalMatch[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pythonExecutable = path.join(repoRoot, "backend", ".venv", "bin", "python");
const pythonEntry = path.join(repoRoot, "backend", "app", "services", "bge_m3_retrieval.py");
const modelPath = process.env.BGE_M3_MODEL_PATH ?? "/Users/vickyshou/.cache/huggingface/hub/models--BAAI--bge-m3";

const queries = ["雪地与天空没有分界线", "薄纱后面的光", "水面刚被触碰的一圈涟漪"];
const candidates = buildSemanticRetrievalCandidates();

function retrieveTopK(query: string, k = 5): SemanticRetrievalMatch[] {
  const result = spawnSync(pythonExecutable, [pythonEntry, "--task", "retrieve", "--model-path", modelPath], {
    cwd: repoRoot,
    encoding: "utf-8",
    input: JSON.stringify({ query, k, candidates }),
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Python retrieval exited with status ${String(result.status)}`);
  }

  return (JSON.parse(result.stdout) as PythonRetrievalResponse).results;
}

function main() {
  for (const query of queries) {
    const retrievalResults = retrieveTopK(query, 5);
    const bridged = semanticRetrievalToSlotDelta(query, retrievalResults);

    console.log(`\n=== ${query} ===`);
    console.log("weightedSlotDeltaBundle");
    console.log(JSON.stringify(bridged.weightedSlotDeltaBundle, null, 2));
    console.log("semanticSpec");
    console.log(JSON.stringify(bridged.semanticSpec, null, 2));
    console.log("generationPrompt");
    console.log(bridged.generationPrompt);
    console.log("negativePrompt");
    console.log(bridged.negativePrompt);
    console.log("unresolvedQuestions");
    console.log(JSON.stringify(bridged.unresolvedQuestions, null, 2));
  }
}

main();
