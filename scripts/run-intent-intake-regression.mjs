import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(path.join(tmpdir(), "intent-intake-regression-"));
const outfile = path.join(tempDir, "intent-regression.mjs");

try {
  await build({
    entryPoints: ["src/features/simulator/__tests__/intentRegressionRunner.ts"],
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
