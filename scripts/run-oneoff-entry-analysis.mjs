import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("Usage: node scripts/run-oneoff-entry-analysis.mjs <query>");
  process.exit(1);
}

const tempDir = await mkdtemp(path.join(tmpdir(), "oneoff-entry-analysis-"));
const entry = path.join(tempDir, "entry.ts");
const outfile = path.join(tempDir, "out.mjs");

const source = `
import { analyzeEntryText } from "${path.resolve("src/features/entryAgent/index.ts").replace(/\\/g, "\\\\")}";
import { compileVisualIntent } from "${path.resolve("src/features/entryAgent/compilerLayer.ts").replace(/\\/g, "\\\\")}";

const text = ${JSON.stringify(query)};
const analysis = await analyzeEntryText({ text });
const compiled = compileVisualIntent({
  analysis,
  freeTextInputs: [text],
});

console.log(JSON.stringify({
  text,
  route: analysis.queryRoute,
  retrievalLayer: analysis.retrievalLayer,
  interpretationLayer: analysis.interpretationLayer,
  hitFields: analysis.hitFields,
  evidence: analysis.evidence,
  semanticCanvas: analysis.semanticCanvas,
  displayPlan: analysis.displayPlan,
  compilerSummary: compiled.summary,
  negativePrompt: compiled.negativePrompt,
}, null, 2));
`;

try {
  await writeFile(entry, source);
  await build({
    entryPoints: [entry],
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
    },
  });

  await import(pathToFileURL(outfile).href);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
