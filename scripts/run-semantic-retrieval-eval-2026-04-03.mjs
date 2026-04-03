import { build } from "esbuild";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(path.join(tmpdir(), "semantic-retrieval-eval-"));
const outfile = path.join(tempDir, "semantic-retrieval-eval.mjs");
const outputPath = process.argv.includes("--json-out")
  ? process.argv[process.argv.indexOf("--json-out") + 1]
  : null;

try {
  await build({
    entryPoints: ["src/features/entryAgent/__tests__/semanticRetrievalEvalRunner.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile,
    tsconfig: "tsconfig.app.json",
    alias: {
      "@": path.resolve("src"),
    },
    define: {
      "import.meta.env": "{}",
      "process.env.SEMANTIC_RETRIEVAL_EVAL_OUTPUT_PATH": outputPath ? JSON.stringify(outputPath) : "undefined",
    },
  });

  const evaluationModule = await import(pathToFileURL(outfile).href);
  const payload = evaluationModule.default;
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  }
  console.log(JSON.stringify(payload, null, 2));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
