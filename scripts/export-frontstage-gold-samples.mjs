import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);

function readFlag(name, fallback) {
  const direct = args.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1] ?? fallback;
  return fallback;
}

const requestedType = readFlag("type", "all");
const status = readFlag("status", "seed");
const out = readFlag("out");
const pretty = args.includes("--pretty");

const tempDir = await mkdtemp(path.join(tmpdir(), "frontstage-gold-export-"));
const entry = path.join(tempDir, "entry.ts");
const outfile = path.join(tempDir, "out.mjs");

const source = `
import { analyzeEntryText } from "${path.resolve("src/features/entryAgent/index.ts").replace(/\\/g, "\\\\")}";
import { deriveProposalFeedbackSignal } from "${path.resolve("src/features/entryAgent/proposalFeedbackSignals.ts").replace(/\\/g, "\\\\")}";

const requestedType = ${JSON.stringify(requestedType)};
const status = ${JSON.stringify(status)};

const packageCases = [
  {
    id: "pkg-001",
    sourceCase: "薰衣草的芳香",
    inputText: "薰衣草的芳香",
    difficultyTags: ["floral-herbal", "scent-led"]
  },
  {
    id: "pkg-002",
    sourceCase: "加州沙滩和柠檬叶的香气",
    inputText: "加州沙滩和柠檬叶的香气",
    difficultyTags: ["mixed-imagery", "coastal-scent"]
  },
  {
    id: "pkg-003",
    sourceCase: "烟雨里有一点竹影",
    inputText: "烟雨里有一点竹影",
    difficultyTags: ["mixed-imagery", "threshold-atmosphere"]
  },
  {
    id: "pkg-004",
    sourceCase: "花叶意向，但不要太满",
    inputText: "花叶意向，但不要太满",
    difficultyTags: ["mixed-imagery", "constraint-led"]
  },
  {
    id: "pkg-005",
    sourceCase: "还不确定，想高级一点",
    inputText: "还不确定，想高级一点",
    difficultyTags: ["vague-preference"]
  }
];

const feedbackCases = [
  {
    id: "fb-001",
    sourceCase: "加州沙滩和柠檬叶的香气 / select+reduce+boost",
    inputText: "加州沙滩和柠檬叶的香气",
    userFeedbackText: "我更偏第二种，不过空气想再多留一点，叶子先别那么重。",
    difficultyTags: ["feedback-reduce-boost", "mixed-imagery"]
  },
  {
    id: "fb-002",
    sourceCase: "薰衣草的芳香 / reduce-trace boost-scent",
    inputText: "薰衣草的芳香",
    userFeedbackText: "植物那层再退一点吧，我其实更想把花香多留一点。",
    difficultyTags: ["feedback-reduce-boost", "floral-herbal"]
  },
  {
    id: "fb-003",
    sourceCase: "加州沙滩和柠檬叶的香气 / corrected-domain",
    inputText: "加州沙滩和柠檬叶的香气",
    userFeedbackText: "海边那个感觉有点偏了，我更想往草本花香这边靠。",
    difficultyTags: ["feedback-corrected-domain", "corrected-domain"]
  },
  {
    id: "fb-004",
    sourceCase: "烟雨里有一点竹影 / boost-mist reduce-trace",
    inputText: "烟雨里有一点竹影",
    userFeedbackText: "烟雨那层我还想多留一点，竹影再轻一点就对了。",
    difficultyTags: ["feedback-reduce-boost", "mixed-imagery"]
  },
  {
    id: "fb-005",
    sourceCase: "烟雨里有一点竹影 / blend-proposals",
    inputText: "烟雨里有一点竹影",
    userFeedbackText: "第一种和第三种我想揉在一起，别太满，气还是松一点。",
    difficultyTags: ["blend-proposals", "mixed-imagery"]
  },
  {
    id: "fb-006",
    sourceCase: "还不确定，想高级一点 / vague-continuation",
    inputText: "还不确定，想高级一点",
    userFeedbackText: "我更偏第一种，不过别太空，还是想留一点分量。",
    difficultyTags: ["vague-preference", "feedback-reduce-boost"]
  }
];

const closedLoopCases = [
  {
    id: "cl-001",
    sourceCase: "加州沙滩和柠檬叶的香气 / corrected-domain",
    inputText: "加州沙滩和柠檬叶的香气",
    userFeedbackText: "海边那个感觉有点偏了，我更想往草本花香这边靠。",
    difficultyTags: ["corrected-domain", "feedback-corrected-domain"]
  },
  {
    id: "cl-002",
    sourceCase: "薰衣草的芳香 / reduce-trace boost-scent",
    inputText: "薰衣草的芳香",
    userFeedbackText: "植物那层再退一点吧，我其实更想把花香多留一点。",
    difficultyTags: ["feedback-reduce-boost", "closed-loop"]
  },
  {
    id: "cl-003",
    sourceCase: "加州沙滩和柠檬叶的香气 / select+reduce+boost",
    inputText: "加州沙滩和柠檬叶的香气",
    userFeedbackText: "我更偏第二种，不过空气想再多留一点，叶子先别那么重。",
    difficultyTags: ["feedback-reduce-boost", "mixed-imagery", "closed-loop"]
  },
  {
    id: "cl-004",
    sourceCase: "烟雨里有一点竹影 / blend-proposals",
    inputText: "烟雨里有一点竹影",
    userFeedbackText: "第一种和第三种我想揉在一起，别太满，气还是松一点。",
    difficultyTags: ["blend-proposals", "mixed-imagery", "closed-loop"]
  },
  {
    id: "cl-005",
    sourceCase: "烟雨里有一点竹影 / boost-mist reduce-trace",
    inputText: "烟雨里有一点竹影",
    userFeedbackText: "烟雨那层我还想多留一点，竹影再轻一点就对了。",
    difficultyTags: ["feedback-reduce-boost", "mixed-imagery", "closed-loop"]
  },
  {
    id: "cl-006",
    sourceCase: "还不确定，想高级一点 / vague-continuation",
    inputText: "还不确定，想高级一点",
    userFeedbackText: "我更偏第一种，不过别太空，还是想留一点分量。",
    difficultyTags: ["vague-preference", "closed-loop"]
  }
];

function makeMeta(sampleType, item, sourceRunner) {
  return {
    id: item.id,
    sampleType,
    version: "v0.1",
    status,
    sourceCase: item.sourceCase,
    sourceRunner,
    difficultyTags: item.difficultyTags,
    notes: []
  };
}

async function buildPackageSamples() {
  const records = [];
  for (const item of packageCases) {
    const analysis = await analyzeEntryText({ text: item.inputText });
    records.push({
      ...makeMeta("package", item, "analyzeEntryText"),
      input: {
        inputText: item.inputText
      },
      output: {
        package: analysis.frontstageSemanticPackage
      }
    });
  }
  return records;
}

async function buildResponsePlanSamples() {
  const records = [];
  for (const item of packageCases.slice(0, 4)) {
    const analysis = await analyzeEntryText({ text: item.inputText });
    records.push({
      ...makeMeta("response-plan", item, "analyzeEntryText"),
      input: {
        inputText: item.inputText,
        package: analysis.frontstageSemanticPackage
      },
      output: {
        responsePlan: analysis.frontstageResponsePlan
      }
    });
  }
  return records;
}

async function buildFeedbackSamples() {
  const records = [];
  for (const item of feedbackCases) {
    const analysis = await analyzeEntryText({ text: item.inputText });
    const signal = deriveProposalFeedbackSignal({
      text: item.userFeedbackText,
      currentPlan: analysis.frontstageResponsePlan,
      currentPackage: analysis.frontstageSemanticPackage
    });
    records.push({
      ...makeMeta("feedback-signal", item, "deriveProposalFeedbackSignal"),
      input: {
        inputText: item.inputText,
        previousPackage: analysis.frontstageSemanticPackage,
        previousResponsePlan: analysis.frontstageResponsePlan,
        userFeedbackText: item.userFeedbackText
      },
      output: {
        proposalFeedbackSignal: signal
      }
    });
  }
  return records;
}

async function buildClosedLoopSamples() {
  const records = [];
  for (const item of closedLoopCases) {
    const analysis = await analyzeEntryText({ text: item.inputText });
    const signal = deriveProposalFeedbackSignal({
      text: item.userFeedbackText,
      currentPlan: analysis.frontstageResponsePlan,
      currentPackage: analysis.frontstageSemanticPackage
    });
    const next = await analyzeEntryText({
      text: item.inputText + "\\n" + item.userFeedbackText,
      latestReplyText: item.userFeedbackText,
      proposalFeedbackSignals: signal ? [signal] : []
    });
    records.push({
      ...makeMeta("closed-loop", item, "analyzeEntryText+deriveProposalFeedbackSignal"),
      input: {
        inputText: item.inputText,
        package: analysis.frontstageSemanticPackage,
        responsePlan: analysis.frontstageResponsePlan,
        feedbackText: item.userFeedbackText,
        feedbackSignal: signal
      },
      output: {
        nextPackage: next.frontstageSemanticPackage,
        nextResponsePlan: next.frontstageResponsePlan
      }
    });
  }
  return records;
}

const builders = {
  package: buildPackageSamples,
  "response-plan": buildResponsePlanSamples,
  "feedback-signals": buildFeedbackSamples,
  "closed-loop": buildClosedLoopSamples
};

const typeMap = {
  package: "package",
  "response-plan": "response-plan",
  "feedback-signal": "feedback-signals",
  "feedback-signals": "feedback-signals",
  "closed-loop": "closed-loop"
};

async function main() {
  const normalized = typeMap[requestedType] ?? requestedType;
  if (normalized === "all") {
    const all = [
      ...(await buildPackageSamples()),
      ...(await buildResponsePlanSamples()),
      ...(await buildFeedbackSamples()),
      ...(await buildClosedLoopSamples())
    ];
    return all;
  }
  const builder = builders[normalized];
  if (!builder) {
    throw new Error("Unsupported --type value: " + requestedType);
  }
  return builder();
}

const records = await main();
export default records;
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
      "@": path.resolve("src")
    },
    define: {
      "import.meta.env": "{}"
    }
  });

  const mod = await import(pathToFileURL(outfile).href);
  const json = JSON.stringify(mod.default, null, 2);
  const text = pretty ? json : JSON.stringify(JSON.parse(json));

  if (out) {
    const parsed = JSON.parse(json);
    const jsonl = parsed.map((item) => JSON.stringify(item)).join("\n") + "\n";
    const outputPath = path.resolve(out);
    await writeFile(outputPath, jsonl);
    console.log(`wrote ${outputPath}`);
  } else {
    console.log(text);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
