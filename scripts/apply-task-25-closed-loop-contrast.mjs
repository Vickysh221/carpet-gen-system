import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const closedLoopPath = path.resolve("datasets/frontstage/closed-loop/gold-v0.1.jsonl");

function parseJsonl(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

async function upsertJsonl(filePath, records) {
  const current = parseJsonl(await readFile(filePath, "utf8"));
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const record of records) byId.set(record.id, record);
  const sorted = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id, "en"));
  await writeFile(filePath, `${sorted.map((item) => JSON.stringify(item)).join("\n")}\n`);
}

const closedLoopRecords = [
  {
    id: "cl-009",
    sampleType: "closed-loop",
    version: "v0.1",
    status: "curated",
    sourceCase: "烟雨里有一点竹影 / corrected-domain exit removes bamboo trace",
    sourceRunner: "manual-curation-task-25",
    difficultyTags: ["corrected-domain", "closed-loop", "trace-removal", "threshold-atmosphere"],
    input: {
      inputText: "烟雨里有一点竹影",
      package: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "medium",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true },
          { id: "bamboo-shadow-trace", label: "竹影只留一点若有若无的线性影痕", kind: "trace", userFacing: true },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true },
        ],
        compositionAxes: [
          { id: "mist-vs-bamboo-shadow", label: "烟雨和竹影的主导关系", leftPole: "先保住烟雨整体", rightPole: "让竹影稍微可见一点", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "bamboo forest scene illustration", reason: "竹影应停在影痕层，而不是导向竹林场景。", severity: "hard" },
        ],
      },
      responsePlan: {
        replySnapshot: "这句我会先保住烟雨那层空气，再让竹影只贴在边上轻轻显一下。",
        compositionProposals: [
          {
            id: "proposal-mixed-atmosphere-first",
            title: "先留烟雨一样的湿润空气做底",
            summary: "先保住烟雨一样的湿润空气做底，再让竹影只留一点若有若无的线性影痕。",
            dominantHandles: ["烟雨一样的湿润空气做底", "竹影只留一点若有若无的线性影痕"],
          },
          {
            id: "proposal-mixed-trace-first",
            title: "让竹影只留一点若有若无的线性影痕",
            summary: "把竹影只留一点若有若无的线性影痕往前提一点，但仍贴着烟雨一样的湿润空气做底。",
            dominantHandles: ["竹影只留一点若有若无的线性影痕", "烟雨一样的湿润空气做底"],
          },
        ],
        refinementPrompt: {
          mode: "nudge",
          text: "你可以说要继续留竹影，还是把竹影整个拿掉，只保住那层空气。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      feedbackText: "竹影这层先整个拿掉，我不是想在这组里调，我要只留下雨前那层空气。",
      feedbackSignal: {
        correctedDomain: "moistThresholdAtmosphere",
        reducedHandles: ["bamboo-shadow-trace"],
        boostedHandles: ["mist-rain-field"],
        sourceText: "竹影这层先整个拿掉，我不是想在这组里调，我要只留下雨前那层空气。",
      },
    },
    output: {
      nextPackage: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true },
        ],
        compositionAxes: [
          { id: "threshold-density-vs-arrival", label: "湿意显形和将落未落的分寸", leftPole: "只留压低的空气", rightPole: "让潮意更接近落下来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "mixed atmosphere with retained trace", reason: "已经纠偏到 pure moist，不应再保留竹影 trace。", severity: "hard" },
          { label: "literal rainy scene rendering", reason: "仍然是将落未落的空气，不是完整雨景。", severity: "hard" },
        ],
      },
      nextResponsePlan: {
        replySnapshot: "那我就把竹影整个拿掉，只留下雨前那层被压低的空气。",
        compositionProposals: [
          {
            id: "proposal-moist-threshold-air",
            title: "只留烟雨一样的湿润空气做底",
            summary: "现在只留烟雨一样的湿润空气做底，让那一点痕迹要轻，不要浮得太出来，不再保留竹影只留一点若有若无的线性影痕。",
            dominantHandles: ["烟雨一样的湿润空气做底", "那一点痕迹要轻，不要浮得太出来"],
            blendNotes: ["竹影已经退出这组 semantic objects"],
          },
          {
            id: "proposal-moist-lower-presence",
            title: "把那一点痕迹要轻，不要浮得太出来",
            summary: "进一步把那一点痕迹要轻，不要浮得太出来，让烟雨一样的湿润空气做底站得更前，但仍不变成雨景。",
            dominantHandles: ["那一点痕迹要轻，不要浮得太出来", "烟雨一样的湿润空气做底"],
            blendNotes: ["后续如需更亮也应在 pure moist 内调，不回到竹影 lane"],
          },
        ],
        refinementPrompt: {
          mode: "nudge",
          text: "你可以继续告诉我，是想让烟雨一样的湿润空气做底更压低一点，还是让那一点痕迹再轻一点。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle"],
        },
      },
    },
    notes: [
      "Task 25 closed-loop contrast: proves corrected-domain exit removes bamboo trace from the next package.",
    ],
  },
  {
    id: "cl-010",
    sampleType: "closed-loop",
    version: "v0.1",
    status: "curated",
    sourceCase: "加州沙滩和柠檬叶的香气 / corrected-domain exit removes leaf trace",
    sourceRunner: "manual-curation-task-25",
    difficultyTags: ["corrected-domain", "closed-loop", "trace-removal", "coastal-air"],
    input: {
      inputText: "加州沙滩和柠檬叶的香气",
      package: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true },
          { id: "lemon-leaf-trace", label: "叶感只留一点清绿苦感的痕迹", kind: "trace", userFacing: true },
        ],
        compositionAxes: [
          { id: "coastal-air-vs-leaf-trace", label: "空气和叶感的主次", leftPole: "海边空气先做底", rightPole: "叶感痕迹稍微浮出来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "coastal postcard rendering", reason: "海边空气应作为底子，而不是写实海景。", severity: "hard" },
        ],
      },
      responsePlan: {
        replySnapshot: "这个画面我会先让海边空气的亮和留白先成立，再让叶感只留一点清绿苦感的痕迹。",
        compositionProposals: [
          {
            id: "proposal-mixed-atmosphere-first",
            title: "先让海边空气的亮和留白先成立",
            summary: "先让海边空气的亮和留白先成立，叶感只留一点清绿苦感的痕迹只在边上轻轻提一下。",
            dominantHandles: ["海边空气的亮和留白先成立", "叶感只留一点清绿苦感的痕迹"],
          },
          {
            id: "proposal-mixed-scent-led",
            title: "让香气轻轻浮在表面，不立成对象",
            summary: "让香气轻轻浮在表面，不立成对象，海边空气的亮和留白先成立，叶感往后退。",
            dominantHandles: ["香气轻轻浮在表面，不立成对象", "海边空气的亮和留白先成立"],
          },
        ],
        refinementPrompt: {
          mode: "blend",
          text: "你可以继续在这组里调，也可以把叶痕整个拿掉，只留海边空气。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      feedbackText: "不是继续调叶感，我要把叶痕整组拿掉，只留靠海那层亮白空气。",
      feedbackSignal: {
        correctedDomain: "coastalAiryBrightness",
        reducedHandles: ["lemon-leaf-trace", "scent-floating"],
        boostedHandles: ["coastal-bright-air"],
        sourceText: "不是继续调叶感，我要把叶痕整组拿掉，只留靠海那层亮白空气。",
      },
    },
    output: {
      nextPackage: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true },
        ],
        compositionAxes: [
          { id: "coastal-brightness-vs-objectness", label: "通透留白和具象海边感的边界", leftPole: "只保住晒白空气", rightPole: "让海边感更具体一点", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "mixed coastal trace composition", reason: "已经纠偏到 pure coastal，不应继续保留叶感只留一点清绿苦感的痕迹。", severity: "hard" },
          { label: "coastal postcard rendering", reason: "仍然是亮白空气本身，不是海景。", severity: "hard" },
        ],
      },
      nextResponsePlan: {
        replySnapshot: "那我就把叶痕整组拿掉，只保住靠海那层亮白空气。",
        compositionProposals: [
          {
            id: "proposal-coastal-open-air",
            title: "只让海边空气的亮和留白先成立",
            summary: "现在只让海边空气的亮和留白先成立，香气轻轻浮在表面，不立成对象也收住，不再保留叶感只留一点清绿苦感的痕迹。",
            dominantHandles: ["海边空气的亮和留白先成立", "香气轻轻浮在表面，不立成对象"],
            blendNotes: ["叶痕已经从下一轮 semantic objects 中退出"],
          },
          {
            id: "proposal-coastal-muted-air",
            title: "把海边空气的亮和留白先成立再收空一点",
            summary: "继续让海边空气的亮和留白先成立，再把香气轻轻浮在表面，不立成对象收轻一点，整张图更空，不回到叶痕 lane。",
            dominantHandles: ["海边空气的亮和留白先成立", "香气轻轻浮在表面，不立成对象"],
            blendNotes: ["后续如要更亮也应在 pure coastal 内调"],
          },
        ],
        refinementPrompt: {
          mode: "nudge",
          text: "你可以继续告诉我，是想让海边空气的亮和留白先成立更打开一点，还是把香气轻轻浮在表面，不立成对象也继续收住。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle"],
        },
      },
    },
    notes: [
      "Task 25 closed-loop contrast: proves corrected-domain exit removes leaf trace from the next package.",
    ],
  },
];

await upsertJsonl(closedLoopPath, closedLoopRecords);

console.log(`Updated ${closedLoopRecords.length} closed-loop records.`);
