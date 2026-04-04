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
    id: "pkg-027",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "空气压低着，边上还是要留一点竹影",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["mixed-imagery", "threshold-atmosphere", "trace-led", "contrast-set"],
    input: { inputText: "空气压低着，边上还是要留一点竹影" },
    output: {
      package: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "mist-rain-field",
            label: "烟雨一样的湿润空气做底",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["空气压低着"],
            plannerWeight: 0.93,
          },
          {
            id: "bamboo-shadow-trace",
            label: "竹影只留一点若有若无的线性影痕",
            kind: "trace",
            userFacing: true,
            sourceSignals: ["竹影"],
            plannerWeight: 0.9,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["一点"],
            plannerWeight: 0.78,
          },
        ],
        compositionAxes: [
          {
            id: "mist-vs-bamboo-shadow",
            label: "压低空气和竹影的主导关系",
            leftPole: "先保住压低空气",
            rightPole: "让竹影轻轻显一下",
            currentBias: "left",
            blendable: true,
          },
          {
            id: "trace-presence",
            label: "影痕保留强度",
            leftPole: "只留一点轻痕",
            rightPole: "让竹影再清楚一点",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "pure threshold atmosphere with no trace",
            reason: "这句明确要求边上保留竹影，不能塌成纯空气。",
            severity: "hard",
          },
          {
            label: "bamboo forest scene illustration",
            reason: "竹影仍然只能停在影痕层，不能长成竹林对象。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "空气压低着", role: "supports atmosphere-first base", strength: "primary" },
            { cue: "还是要留一点竹影", role: "keeps a trace object stream alive", strength: "primary" },
            { cue: "一点", role: "limits trace presence", strength: "secondary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "空气压低着", role: "supports compressed wet-air base", strength: "primary" },
            ],
            "bamboo-shadow-trace": [
              { cue: "竹影", role: "keeps the case mixed rather than pure atmosphere", strength: "primary" },
            ],
            "low-presence": [
              { cue: "一点", role: "keeps visibility restrained", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "pure threshold atmosphere with no trace": [
              { cue: "还是要留一点竹影", role: "explicitly blocks trace removal", strength: "primary" },
            ],
            "bamboo forest scene illustration": [
              { cue: "竹影", role: "permits only trace-level bamboo presence", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "压低着的空气先成立", kind: "atmosphere-first", supportedBy: ["空气压低着"] },
          ],
          secondary: [
            { label: "竹影仍要留在边上", kind: "trace-association", supportedBy: ["竹影"] },
            { label: "影痕必须轻", kind: "presence-association", supportedBy: ["一点"] },
          ],
          nearbyButSuppressed: [
            { label: "纯空气 without trace", kind: "trace-loss", supportedBy: ["竹影"] },
            { label: "完整竹林景", kind: "literal-scenic", supportedBy: ["竹影"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先把压低空气做底，但不删除 trace stream"],
          traceLayer: ["竹影只留边缘轻痕，不允许变成对象"],
          suppressedLiteralization: ["不要塌成 pure moist atmosphere", "不要长成竹林景观"],
        },
      },
    },
    notes: [
      "Task 23 contrast sample: separates pure moist air from mixed atmosphere-first + bamboo trace.",
    ],
  },
  {
    id: "pkg-028",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "靠海的亮空气里还要挂一点叶子痕迹",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["mixed-imagery", "coastal-air", "trace-led", "contrast-set"],
    input: { inputText: "靠海的亮空气里还要挂一点叶子痕迹" },
    output: {
      package: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "coastal-bright-air",
            label: "海边空气的亮和留白先成立",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["靠海的亮空气"],
            plannerWeight: 0.94,
          },
          {
            id: "lemon-leaf-trace",
            label: "叶感只留一点清绿苦感的痕迹",
            kind: "trace",
            userFacing: true,
            sourceSignals: ["叶子痕迹"],
            plannerWeight: 0.88,
          },
        ],
        compositionAxes: [
          {
            id: "coastal-air-vs-leaf-trace",
            label: "亮空气和叶痕的主次",
            leftPole: "先保住靠海亮空气",
            rightPole: "让叶痕浮出来一点",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "pure coastal airy brightness with no trace",
            reason: "这里明确要保留叶子痕迹，不能塌成纯海边空气。",
            severity: "hard",
          },
          {
            label: "literal leaf object rendering",
            reason: "叶子仍然只能作为痕迹，不应长成完整对象。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "靠海的亮空气", role: "supports coastal airy base", strength: "primary" },
            { cue: "还要挂一点叶子痕迹", role: "keeps a trace motif stream present", strength: "primary" },
          ],
          handles: {
            "coastal-bright-air": [
              { cue: "靠海的亮空气", role: "anchors the coastal air handle", strength: "primary" },
            ],
            "lemon-leaf-trace": [
              { cue: "叶子痕迹", role: "keeps this sample mixed instead of pure coastal", strength: "primary" },
            ],
          },
          misleadingPaths: {
            "pure coastal airy brightness with no trace": [
              { cue: "还要挂一点叶子痕迹", role: "explicitly blocks trace removal", strength: "primary" },
            ],
            "literal leaf object rendering": [
              { cue: "痕迹", role: "keeps the leaf at trace level only", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "靠海的亮空气先成立", kind: "coastal-air", supportedBy: ["靠海的亮空气"] },
          ],
          secondary: [
            { label: "叶子只以边缘痕迹出现", kind: "trace-association", supportedBy: ["叶子痕迹"] },
          ],
          nearbyButSuppressed: [
            { label: "纯海边亮空气", kind: "trace-loss", supportedBy: ["叶子痕迹"] },
            { label: "完整叶片对象", kind: "literal-object", supportedBy: ["叶子"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先拿稳靠海的亮空气，但不把 trace 删掉"],
          traceLayer: ["叶子只留挂在边上的轻痕"],
          suppressedLiteralization: ["不要塌成纯 coastalAiryBrightness", "不要把叶痕长成叶片对象"],
        },
      },
    },
    notes: [
      "Task 23 contrast sample: separates pure coastal air from coastal air plus retained trace motif.",
    ],
  },
  {
    id: "pkg-029",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "想先摸一种很轻的分寸，不想立刻变成某种空气感",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["vague-preference", "anti-atmosphere-collapse", "contrast-set"],
    input: { inputText: "想先摸一种很轻的分寸，不想立刻变成某种空气感" },
    output: {
      package: {
        interpretationDomain: "vagueRefinementPreference",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "open-not-locked",
            label: "方向还没锁死，先不要急着补成具体图样",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["想先摸", "不想立刻变成"],
            plannerWeight: 0.92,
          },
          {
            id: "restrained-refinement",
            label: "更像在找一种克制但不单薄的高级感",
            kind: "modifier",
            userFacing: true,
            sourceSignals: ["很轻的分寸"],
            plannerWeight: 0.88,
          },
        ],
        compositionAxes: [
          {
            id: "restraint-vs-presence",
            label: "分寸感和存在感的关系",
            leftPole: "先保住轻和克制",
            rightPole: "让存在感再站出来一点",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "premature atmosphere locking",
            reason: "这句明确不想立刻变成某种空气感，不能提前锁 domain。",
            severity: "hard",
          },
          {
            label: "premature style locking",
            reason: "它仍然在找分寸，不是在指定具体视觉气候。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "想先摸", role: "supports not-yet-locked direction finding", strength: "primary" },
            { cue: "很轻的分寸", role: "supports restrained refinement", strength: "primary" },
            { cue: "不想立刻变成某种空气感", role: "explicitly blocks atmosphere-domain collapse", strength: "primary" },
          ],
          handles: {
            "open-not-locked": [
              { cue: "想先摸", role: "keeps the direction exploratory", strength: "primary" },
              { cue: "不想立刻变成", role: "blocks early locking", strength: "primary" },
            ],
            "restrained-refinement": [
              { cue: "很轻的分寸", role: "supports fine-grained restraint rather than atmosphere naming", strength: "primary" },
            ],
          },
          misleadingPaths: {
            "premature atmosphere locking": [
              { cue: "不想立刻变成某种空气感", role: "explicit anti-atmosphere cue", strength: "primary" },
            ],
            "premature style locking": [
              { cue: "想先摸一种分寸", role: "keeps the sample at preference level", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "先摸一种很轻的分寸感", kind: "refinement-preference", supportedBy: ["很轻的分寸"] },
          ],
          secondary: [
            { label: "方向暂时不要被锁成空气域", kind: "open-direction", supportedBy: ["不想立刻变成某种空气感"] },
          ],
          nearbyButSuppressed: [
            { label: "被提前锁成某种 atmosphere", kind: "premature-domain-locking", supportedBy: ["空气感"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先保住轻和未锁定的分寸感"],
          traceLayer: ["如果补感觉，也只能是很轻的提示，不落成具体 atmosphere"],
          suppressedLiteralization: ["不要提前锁成 moist / coastal 等 atmosphere domain", "不要直接给风格模板"],
        },
      },
    },
    notes: [
      "Task 23 contrast sample: keeps vague refinement from collapsing into pure atmosphere.",
    ],
  },
];

const feedbackRecords = [
  {
    id: "fb-023",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "pure coastal / same-domain nudge",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["coastal-air", "same-domain-nudge", "contrast-set"],
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
      userFeedbackText: "还是这个方向，只是亮空气再收一点，别那么铺。",
    },
    output: {
      proposalFeedbackSignal: {
        boostedHandles: ["coastal-bright-air"],
        reducedHandles: ["scent-floating"],
        sourceText: "还是这个方向，只是亮空气再收一点，别那么铺。",
      },
    },
    notes: [
      "Task 23 contrast sample: same-domain nudge with no blend and no domain correction.",
    ],
  },
  {
    id: "fb-024",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "pure moist / same-domain nudge",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["threshold-atmosphere", "same-domain-nudge", "contrast-set"],
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
      userFeedbackText: "还是这层将下未下的空气，只是再轻一点，别更换方向。",
    },
    output: {
      proposalFeedbackSignal: {
        boostedHandles: ["low-presence"],
        reducedHandles: ["mist-rain-field"],
        sourceText: "还是这层将下未下的空气，只是再轻一点，别更换方向。",
      },
    },
    notes: [
      "Task 23 contrast sample: same-domain moist nudge that explicitly denies domain exit.",
    ],
  },
  {
    id: "fb-025",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "mixed coastal-trace / same-domain nudge",
    sourceRunner: "manual-curation-task-23",
    difficultyTags: ["mixed-imagery", "same-domain-nudge", "contrast-set"],
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
      userFeedbackText: "不用换方向，还是这组里调，空气多一点，叶感再轻一点。",
    },
    output: {
      proposalFeedbackSignal: {
        boostedHandles: ["coastal-bright-air"],
        reducedHandles: ["lemon-leaf-trace"],
        sourceText: "不用换方向，还是这组里调，空气多一点，叶感再轻一点。",
      },
    },
    notes: [
      "Task 23 contrast sample: same-domain mixed nudge that should not be read as corrected-domain.",
    ],
  },
];

await upsertJsonl(packagePath, packageRecords);
await upsertJsonl(feedbackPath, feedbackRecords);

console.log(`Updated ${packageRecords.length} package records and ${feedbackRecords.length} feedback records.`);
