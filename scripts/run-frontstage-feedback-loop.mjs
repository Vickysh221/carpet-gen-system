import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(path.join(tmpdir(), "frontstage-feedback-loop-"));
const entry = path.join(tempDir, "entry.ts");
const outfile = path.join(tempDir, "out.mjs");

const scenarios = [
  {
    baseText: "加州沙滩和柠檬叶的香气",
    feedbackText: "更像 2，但空气再多一点",
  },
  {
    baseText: "烟雨里有一点竹影",
    feedbackText: "我要 1 和 3 混一下",
  },
  {
    baseText: "薰衣草的芳香",
    feedbackText: "不要那么植物，保留香气就行",
  },
  {
    baseText: "薰衣草的芳香",
    feedbackText: "不是湿雾，更像草本花香",
  },
];

const source = `
import { analyzeEntryText } from "${path.resolve("src/features/entryAgent/index.ts").replace(/\\/g, "\\\\")}";
import { deriveProposalFeedbackSignal } from "${path.resolve("src/features/entryAgent/proposalFeedbackSignals.ts").replace(/\\/g, "\\\\")}";

const scenarios = ${JSON.stringify(scenarios)};
const results = [];

for (const scenario of scenarios) {
  const base = await analyzeEntryText({ text: scenario.baseText });
  const signal = deriveProposalFeedbackSignal({
    text: scenario.feedbackText,
    currentPlan: base.frontstageResponsePlan,
    currentPackage: base.frontstageSemanticPackage,
  });
  const next = await analyzeEntryText({
    text: scenario.baseText + "\\n" + scenario.feedbackText,
    latestReplyText: scenario.feedbackText,
    proposalFeedbackSignals: signal ? [signal] : [],
  });
  results.push({
    baseText: scenario.baseText,
    feedbackText: scenario.feedbackText,
    parsedSignal: signal,
    nextReplySnapshot: next.frontstageResponsePlan?.replySnapshot,
    nextProposalOrder: next.frontstageResponsePlan?.compositionProposals.map((item) => item.id),
    nextTopProposal: next.frontstageResponsePlan?.compositionProposals[0],
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
