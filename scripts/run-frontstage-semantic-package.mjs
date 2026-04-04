import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const benchmarkQueries = process.argv.slice(2);
const queries = benchmarkQueries.length > 0
  ? benchmarkQueries
  : [
      "薰衣草的芳香",
      "加州沙滩和柠檬叶的香气",
      "烟雨里有一点竹影",
    ];

const tempDir = await mkdtemp(path.join(tmpdir(), "frontstage-semantic-package-"));
const entry = path.join(tempDir, "entry.ts");
const outfile = path.join(tempDir, "out.mjs");

const source = `
import { analyzeEntryText } from "${path.resolve("src/features/entryAgent/index.ts").replace(/\\/g, "\\\\")}";

const queries = ${JSON.stringify(queries)};

const results = [];
for (const text of queries) {
  const analysis = await analyzeEntryText({ text });
  results.push({
    text,
    route: analysis.queryRoute.detectedType,
    frontstageSemanticPackage: analysis.frontstageSemanticPackage,
  });
}

console.log(JSON.stringify(results, null, 2));
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
