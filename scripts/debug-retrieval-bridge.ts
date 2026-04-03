import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeEntryText } from "../src/features/entryAgent/index.js";
import { semanticRetrievalToSlotDelta } from "../src/features/entryAgent/retrievalSemanticBridge.js";
import { buildSemanticRetrievalCandidates, type SemanticRetrievalMatch } from "../src/features/entryAgent/semanticRetrieval.js";
import { buildVisualIntentCompiler } from "../src/features/entryAgent/visualIntentCompiler.js";

interface PythonRetrievalResponse {
  results: SemanticRetrievalMatch[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pythonExecutable = path.join(repoRoot, "backend", ".venv", "bin", "python");
const pythonEntry = path.join(repoRoot, "backend", "app", "services", "bge_m3_retrieval.py");
const modelPath = process.env.BGE_M3_MODEL_PATH ?? "/Users/vickyshou/.cache/huggingface/hub/models--BAAI--bge-m3";

function retrieveTopK(query: string, k = 5): SemanticRetrievalMatch[] {
  const result = spawnSync(pythonExecutable, [pythonEntry, "--task", "retrieve", "--model-path", modelPath], {
    cwd: repoRoot,
    encoding: "utf-8",
    input: JSON.stringify({ query, k, candidates: buildSemanticRetrievalCandidates() }),
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Python retrieval exited with status ${String(result.status)}`);
  }

  return (JSON.parse(result.stdout) as PythonRetrievalResponse).results;
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim() || "清明时节雨纷纷";
  const retrievalResults = retrieveTopK(query, 5);
  const bridgeOutput = semanticRetrievalToSlotDelta(query, retrievalResults);
  const analysis = await analyzeEntryText({ text: query });
  const baseline = buildVisualIntentCompiler({
    analysis,
    freeTextInputs: [query],
  });
  const merged = buildVisualIntentCompiler({
    analysis,
    freeTextInputs: [query],
    retrievalBridgeInputs: [{ query, retrievalResults }],
  });

  console.log(
    JSON.stringify(
      {
        query,
        semanticRetrievalTopKResults: retrievalResults,
        semanticRetrievalToSlotDeltaRawOutput: bridgeOutput,
        mergedSemanticSpec: {
          semanticSpec: merged.semanticSpec,
          negativePrompt: merged.negativePrompt,
          unresolvedQuestions: merged.unresolvedQuestions,
        },
        baselineWithoutRetrieval: {
          semanticSpec: baseline.semanticSpec,
          negativePrompt: baseline.negativePrompt,
          unresolvedQuestions: baseline.unresolvedQuestions,
        },
      },
      null,
      2,
    ),
  );
}

main();
