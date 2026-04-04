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
    feedbackText: "我更偏第二种，不过空气想再多留一点，叶子先别那么重。",
  },
  {
    baseText: "烟雨里有一点竹影",
    feedbackText: "第一种和第三种我想揉一下，别太满，气还是松一点。",
  },
  {
    baseText: "薰衣草的芳香",
    feedbackText: "植物那层再退一点吧，我其实更想把花香多留一点。",
  },
  {
    baseText: "加州沙滩和柠檬叶的香气",
    feedbackText: "海边那个感觉有点偏了，我更想往草本花香这边靠。",
  },
  {
    baseText: "烟雨里有一点竹影",
    feedbackText: "烟雨那层我还想多留一点，竹影再轻一点就对了。",
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
    nextPackageDomain: next.frontstageSemanticPackage?.interpretationDomain,
    nextPackageHandles: next.frontstageSemanticPackage?.interpretationHandles.map((item) => item.label),
    nextPackageAxes: next.frontstageSemanticPackage?.compositionAxes.map((item) => item.label),
    nextPackageMisleadingPaths: next.frontstageSemanticPackage?.misleadingPaths.map((item) => item.label),
    nextReplySnapshot: next.frontstageResponsePlan?.replySnapshot,
    nextProposalOrder: next.frontstageResponsePlan?.compositionProposals.map((item) => item.id),
    nextTopProposal: next.frontstageResponsePlan?.compositionProposals[0],
    consistencyChecks: (() => {
      const topProposal = next.frontstageResponsePlan?.compositionProposals[0];
      const lead = topProposal?.dominantHandles?.[0] ?? "";
      const suppressed = topProposal?.suppressedHandles?.[0] ?? "";
      return {
        titleMentionsLead: Boolean(lead) && Boolean(topProposal?.title?.includes(lead.slice(0, Math.min(6, lead.length)))),
        summaryMentionsLead: Boolean(lead) && Boolean(topProposal?.summary?.includes(lead.slice(0, Math.min(6, lead.length)))),
        summaryMentionsSuppressed: suppressed
          ? Boolean(topProposal?.summary?.includes(suppressed.slice(0, Math.min(6, suppressed.length))))
          : true,
      };
    })(),
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
