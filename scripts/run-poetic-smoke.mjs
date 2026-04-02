import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(path.join(tmpdir(), "poetic-smoke-"));
const outfile = path.join(tempDir, "poetic-smoke.mjs");

try {
  await build({
    entryPoints: ["src/features/entryAgent/__tests__/poeticSmokeRunner.ts"],
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
