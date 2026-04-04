import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const packagePath = path.resolve("datasets/frontstage/package/gold-v0.1.jsonl");
const feedbackPath = path.resolve("datasets/frontstage/feedback-signals/gold-v0.1.jsonl");

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

const packageRecords = [
  {
    id: "pkg-019",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不要竹影不要叶子，只要下雨前五分钟那层空气",
    sourceRunner: "manual-curation-task-24",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-trace", "boundary-rewrite"],
    input: { inputText: "不要竹影不要叶子，只要下雨前五分钟那层空气" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true, sourceSignals: ["下雨前五分钟", "那层空气"], plannerWeight: 0.97 },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true, sourceSignals: ["只要", "不要竹影不要叶子"], plannerWeight: 0.84 },
        ],
        compositionAxes: [
          { id: "threshold-density-vs-arrival", label: "湿意显形和将落未落的分寸", leftPole: "只留压低的空气", rightPole: "让潮意更接近落下来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "mixed atmosphere with retained trace", reason: "用户明确删除竹影和叶子，不能再保留 trace object。", severity: "hard" },
          { label: "literal rainy scene rendering", reason: "重点是下雨前五分钟的空气，不是已经落下来的雨景。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不要竹影不要叶子", role: "explicitly removes mixed-imagery trace lanes", strength: "primary" },
            { cue: "只要下雨前五分钟那层空气", role: "anchors pure threshold atmosphere", strength: "primary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "下雨前五分钟", role: "supports threshold timing", strength: "primary" },
              { cue: "那层空气", role: "keeps the sample purely atmospheric", strength: "primary" },
            ],
            "low-presence": [
              { cue: "只要", role: "keeps the surface narrow and restrained", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "mixed atmosphere with retained trace": [
              { cue: "不要竹影不要叶子", role: "explicitly blocks mixed imagery borrowing", strength: "primary" },
            ],
            "literal rainy scene rendering": [
              { cue: "下雨前五分钟", role: "keeps the weather at pre-arrival threshold", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "只留下雨前五分钟那层将落未落的空气", kind: "threshold-atmosphere", supportedBy: ["下雨前五分钟", "那层空气"] },
          ],
          secondary: [
            { label: "所有 trace object 都要被拿掉", kind: "trace-removal", supportedBy: ["不要竹影不要叶子"] },
          ],
          nearbyButSuppressed: [
            { label: "竹影或叶痕继续存在", kind: "trace-loss-boundary", supportedBy: ["竹影", "叶子"] },
            { label: "已经在下的雨景", kind: "literal-scenic", supportedBy: ["下雨"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只保住下雨前五分钟那层压低空气"],
          traceLayer: ["不要留竹影、叶痕或其他对象"],
          suppressedLiteralization: ["不要回到 mixed imagery", "不要画成正在下雨的场景"],
        },
      },
    },
    notes: [
      "Task 24 rewrite: makes pure moist boundary explicit by naming trace removal directly.",
    ],
  },
  {
    id: "pkg-026",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不要叶痕不要对象，只留靠海那层亮白空气",
    sourceRunner: "manual-curation-task-24",
    difficultyTags: ["atmosphere-led", "coastal-air", "anti-trace", "boundary-rewrite"],
    input: { inputText: "不要叶痕不要对象，只留靠海那层亮白空气" },
    output: {
      package: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true, sourceSignals: ["靠海那层亮白空气"], plannerWeight: 0.97 },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true, sourceSignals: ["只留"], plannerWeight: 0.56 },
        ],
        compositionAxes: [
          { id: "coastal-brightness-vs-objectness", label: "通透留白和具象海边感的边界", leftPole: "只保住晒白空气", rightPole: "让海边感更具体一点", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "mixed coastal trace composition", reason: "用户明确删除叶痕和对象，不能再借 mixed imagery 的 trace 厚度。", severity: "hard" },
          { label: "coastal postcard rendering", reason: "仍然是空气本身，不是海景。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不要叶痕不要对象", role: "explicitly removes mixed / object lanes", strength: "primary" },
            { cue: "只留靠海那层亮白空气", role: "anchors pure coastal air", strength: "primary" },
          ],
          handles: {
            "coastal-bright-air": [
              { cue: "靠海", role: "anchors coastal openness", strength: "primary" },
              { cue: "亮白空气", role: "anchors bright airy base", strength: "primary" },
            ],
            "scent-floating": [
              { cue: "只留", role: "keeps any extra surface layer minimal", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "mixed coastal trace composition": [
              { cue: "不要叶痕不要对象", role: "explicitly blocks mixed coastal-trace reading", strength: "primary" },
            ],
            "coastal postcard rendering": [
              { cue: "亮白空气", role: "keeps the sample atmospheric", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "只留下靠海的亮白空气本身", kind: "coastal-air", supportedBy: ["靠海", "亮白空气"] },
          ],
          secondary: [
            { label: "叶痕和对象都必须被删除", kind: "trace-removal", supportedBy: ["不要叶痕不要对象"] },
          ],
          nearbyButSuppressed: [
            { label: "叶痕仍挂在空气边上", kind: "mixed-trace", supportedBy: ["叶痕"] },
            { label: "海边对象或景观", kind: "literal-object", supportedBy: ["对象"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只铺靠海那层亮白空气和留白"],
          traceLayer: ["不要留叶痕或任何对象"],
          suppressedLiteralization: ["不要回到 coastal-trace mixed imagery", "不要长成海景或对象"],
        },
      },
    },
    notes: [
      "Task 24 rewrite: makes pure coastal boundary explicit by naming trace removal directly.",
    ],
  },
];

const feedbackRecords = [
  {
    id: "fb-019",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "pure coastal / corrected-domain explicit exit -> moist",
    sourceRunner: "manual-curation-task-24",
    difficultyTags: ["feedback-corrected-domain", "coastal-air", "threshold-atmosphere", "boundary-rewrite"],
    input: {
      inputText: "海边那种被晒白的空气感",
      previousPackage: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true },
        ],
      },
      previousResponsePlan: {
        replySnapshot: "这个方向我会先把晒白、通透和留白大的空气拿稳。",
        compositionProposals: [
          { id: "proposal-coastal-open-air", title: "先把亮白空气打开", summary: "先保住晒白、通透、留白大的海边空气。", dominantHandles: ["海边空气的亮和留白先成立"] },
          { id: "proposal-coastal-bright-surface", title: "让表面多留一点轻气", summary: "空气仍是主角，但表面允许一层极轻的气息。", dominantHandles: ["海边空气的亮和留白先成立", "香气轻轻浮在表面，不立成对象"] },
          { id: "proposal-coastal-muted-air", title: "把海边感再收空一点", summary: "继续保住靠海的开阔和亮白，但让画面更空。", dominantHandles: ["海边空气的亮和留白先成立"] },
        ],
        refinementPrompt: {
          mode: "blend",
          text: "你可以告诉我更像哪一种，或者把两种空气揉一下。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      userFeedbackText: "不是在这组里继续调，我要换到下雨前那种压着的空气，海边亮空气先整个拿掉。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "moistThresholdAtmosphere",
        reducedHandles: ["coastal-bright-air", "scent-floating"],
        sourceText: "不是在这组里继续调，我要换到下雨前那种压着的空气，海边亮空气先整个拿掉。",
      },
    },
    notes: [
      "Task 24 rewrite: corrected-domain now uses explicit domain-exit phrasing rather than ambiguous adjustment language.",
    ],
  },
  {
    id: "fb-020",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "pure moist / corrected-domain explicit exit -> coastal",
    sourceRunner: "manual-curation-task-24",
    difficultyTags: ["feedback-corrected-domain", "threshold-atmosphere", "coastal-air", "boundary-rewrite"],
    input: {
      inputText: "下雨前五分钟的空气",
      previousPackage: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true },
        ],
      },
      previousResponsePlan: {
        replySnapshot: "这句我会先保住将落未落的湿空气。",
        compositionProposals: [
          { id: "proposal-moist-threshold-air", title: "先留将落未落的空气", summary: "把阈值空气先铺出来。", dominantHandles: ["烟雨一样的湿润空气做底", "那一点痕迹要轻，不要浮得太出来"] },
          { id: "proposal-moist-pressure-first", title: "让压低感再近一点", summary: "把空气再压低一点。", dominantHandles: ["烟雨一样的湿润空气做底"] },
          { id: "proposal-moist-lower-presence", title: "把天气感继续收住", summary: "湿意保留，但显形再轻一点。", dominantHandles: ["那一点痕迹要轻，不要浮得太出来", "烟雨一样的湿润空气做底"] },
        ],
        refinementPrompt: {
          mode: "blend",
          text: "你可以告诉我更像哪一种，或者把两种揉一下。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      userFeedbackText: "不是把这层空气再调轻，我是要换回靠海的亮白空气，这组湿意先整个退出。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "coastalAiryBrightness",
        reducedHandles: ["mist-rain-field", "low-presence"],
        sourceText: "不是把这层空气再调轻，我是要换回靠海的亮白空气，这组湿意先整个退出。",
      },
    },
    notes: [
      "Task 24 rewrite: corrected-domain now contrasts explicitly against same-domain nudge.",
    ],
  },
  {
    id: "fb-021",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "mixed coastal-trace / corrected-domain explicit exit -> pure coastal",
    sourceRunner: "manual-curation-task-24",
    difficultyTags: ["feedback-corrected-domain", "mixed-imagery", "coastal-air", "boundary-rewrite"],
    input: {
      inputText: "加州沙滩和柠檬叶的香气",
      previousPackage: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true },
          { id: "lemon-leaf-trace", label: "叶感只留一点清绿苦感的痕迹", kind: "trace", userFacing: true },
        ],
      },
      previousResponsePlan: {
        replySnapshot: "这个画面我会先让亮空气出来，叶感只在边上轻轻提一下。",
        compositionProposals: [
          { id: "proposal-mixed-atmosphere-first", title: "把空气留在最前面", summary: "先把海边空气和留白铺开。", dominantHandles: ["海边空气的亮和留白先成立", "叶感只留一点清绿苦感的痕迹"] },
          { id: "proposal-mixed-trace-first", title: "让叶感轻轻亮一下", summary: "把叶感稍微推近一点。", dominantHandles: ["叶感只留一点清绿苦感的痕迹", "海边空气的亮和留白先成立"] },
          { id: "proposal-mixed-scent-led", title: "让气息带着往前走", summary: "香气轻轻带一下。", dominantHandles: ["香气轻轻浮在表面，不立成对象", "海边空气的亮和留白先成立"] },
        ],
        refinementPrompt: {
          mode: "blend",
          text: "你可以告诉我更像哪一种，或者拿两种混一下。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      userFeedbackText: "不是还在这组里减叶感，我是直接不要这组 mixed 了，只留靠海那层亮白空气。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "coastalAiryBrightness",
        reducedHandles: ["lemon-leaf-trace", "scent-floating"],
        boostedHandles: ["coastal-bright-air"],
        sourceText: "不是还在这组里减叶感，我是直接不要这组 mixed 了，只留靠海那层亮白空气。",
      },
    },
    notes: [
      "Task 24 rewrite: separates explicit domain exit from in-domain reduce-handle language.",
    ],
  },
];

await upsertJsonl(packagePath, packageRecords);
await upsertJsonl(feedbackPath, feedbackRecords);

console.log(`Rewrote ${packageRecords.length} package records and ${feedbackRecords.length} feedback records.`);
