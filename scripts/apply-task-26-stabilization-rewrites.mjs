import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const packagePath = path.resolve("datasets/frontstage/package/gold-v0.1.jsonl");

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
    id: "pkg-021",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不是竹影不是海边，是空气里压着一点潮意，还没真的下下来",
    sourceRunner: "manual-curation-task-26",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-neighbor", "stabilization"],
    input: { inputText: "不是竹影不是海边，是空气里压着一点潮意，还没真的下下来" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true, sourceSignals: ["潮意", "还没真的下下来"], plannerWeight: 0.96 },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true, sourceSignals: ["一点", "空气里"], plannerWeight: 0.8 },
        ],
        compositionAxes: [
          { id: "threshold-density-vs-arrival", label: "湿意显形和将落未落的分寸", leftPole: "只留压低的空气", rightPole: "让潮意更接近落下来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "mixed atmosphere with retained trace", reason: "这句明确否定竹影，不能借 mixed imagery 成立。", severity: "hard" },
          { label: "coastal airy brightness", reason: "这句明确否定海边，不应塌成 coastal air。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不是竹影不是海边", role: "explicitly blocks mixed and coastal neighbors", strength: "primary" },
            { cue: "空气里压着一点潮意", role: "anchors moist threshold atmosphere", strength: "primary" },
            { cue: "还没真的下下来", role: "keeps the weather at pre-arrival threshold", strength: "primary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "潮意", role: "supports wet suspended air", strength: "primary" },
              { cue: "还没真的下下来", role: "keeps the rain-field suspended", strength: "primary" },
            ],
            "low-presence": [
              { cue: "一点", role: "keeps presence restrained", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "mixed atmosphere with retained trace": [
              { cue: "不是竹影", role: "explicit anti-trace cue", strength: "primary" },
            ],
            "coastal airy brightness": [
              { cue: "不是海边", role: "explicit anti-coastal cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "空气里压着一点将落未落的潮意", kind: "threshold-atmosphere", supportedBy: ["潮意", "还没真的下下来"] },
          ],
          secondary: [
            { label: "邻近的竹影和海边语义都被压掉", kind: "boundary-suppression", supportedBy: ["不是竹影不是海边"] },
          ],
          nearbyButSuppressed: [
            { label: "竹影 trace", kind: "mixed-trace", supportedBy: ["竹影"] },
            { label: "海边亮空气", kind: "coastal-neighbor", supportedBy: ["海边"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只做压低的潮意空气，不借竹影或海边"],
          traceLayer: ["不保留任何 trace object"],
          suppressedLiteralization: ["不要回到 mixed imagery", "不要滑到 coastal air"],
        },
      },
    },
    notes: [
      "Task 26 stabilization: explicit anti-neighbor moist phrasing to reduce mixed/coastal collisions.",
    ],
  },
  {
    id: "pkg-022",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不是海边亮空气，是将下未下的湿空气，不要雨景不要叶痕",
    sourceRunner: "manual-curation-task-26",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-neighbor", "stabilization"],
    input: { inputText: "不是海边亮空气，是将下未下的湿空气，不要雨景不要叶痕" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true, sourceSignals: ["将下未下", "湿空气"], plannerWeight: 0.96 },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true, sourceSignals: ["不要雨景不要叶痕"], plannerWeight: 0.8 },
        ],
        compositionAxes: [
          { id: "threshold-density-vs-arrival", label: "湿意显形和将落未落的分寸", leftPole: "只留压低的空气", rightPole: "让潮意更接近落下来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "coastal airy brightness", reason: "这句明确不是海边亮空气。", severity: "hard" },
          { label: "mixed coastal trace composition", reason: "这句明确不要叶痕，不应回到 coastal-trace mixed lane。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不是海边亮空气", role: "blocks coastal neighbor", strength: "primary" },
            { cue: "将下未下的湿空气", role: "anchors moist threshold domain", strength: "primary" },
            { cue: "不要雨景不要叶痕", role: "blocks both scenic and trace expansion", strength: "primary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "将下未下", role: "supports threshold timing", strength: "primary" },
              { cue: "湿空气", role: "keeps it pure atmosphere", strength: "primary" },
            ],
            "low-presence": [
              { cue: "不要雨景不要叶痕", role: "keeps the surface narrow and non-scenic", strength: "primary" },
            ],
          },
          misleadingPaths: {
            "coastal airy brightness": [
              { cue: "不是海边亮空气", role: "explicit anti-coastal cue", strength: "primary" },
            ],
            "mixed coastal trace composition": [
              { cue: "不要叶痕", role: "explicit anti-trace cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "将下未下的湿空气本身", kind: "threshold-atmosphere", supportedBy: ["将下未下", "湿空气"] },
          ],
          secondary: [
            { label: "海边亮空气和叶痕都被排除", kind: "boundary-suppression", supportedBy: ["不是海边亮空气", "不要叶痕"] },
          ],
          nearbyButSuppressed: [
            { label: "海边亮空气", kind: "coastal-neighbor", supportedBy: ["海边亮空气"] },
            { label: "叶痕 mixed lane", kind: "mixed-trace", supportedBy: ["叶痕"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只保住将下未下的湿空气，不借海边亮空气"],
          traceLayer: ["不要任何叶痕或对象"],
          suppressedLiteralization: ["不要滑到 coastal air", "不要回到 mixed coastal-trace"],
        },
      },
    },
    notes: [
      "Task 26 stabilization: anti-coastal, anti-trace moist phrasing to reduce nearest-neighbor confusion.",
    ],
  },
  {
    id: "pkg-023",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不是海边的亮，是空气发闷一点，像雨还卡在路上",
    sourceRunner: "manual-curation-task-26",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-neighbor", "stabilization"],
    input: { inputText: "不是海边的亮，是空气发闷一点，像雨还卡在路上" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "medium",
        interpretationHandles: [
          { id: "mist-rain-field", label: "烟雨一样的湿润空气做底", kind: "atmosphere", userFacing: true, sourceSignals: ["空气发闷一点", "雨还卡在路上"], plannerWeight: 0.93 },
          { id: "low-presence", label: "那一点痕迹要轻，不要浮得太出来", kind: "presence", userFacing: true, sourceSignals: ["不是海边的亮"], plannerWeight: 0.77 },
        ],
        compositionAxes: [
          { id: "threshold-density-vs-arrival", label: "湿意显形和将落未落的分寸", leftPole: "只留压低的空气", rightPole: "让潮意更接近落下来", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "coastal airy brightness", reason: "这句明确不是海边的亮。", severity: "hard" },
          { label: "mixed atmosphere with retained trace", reason: "这里没有 trace object，不应借 mixed imagery。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不是海边的亮", role: "blocks coastal brightness neighbor", strength: "primary" },
            { cue: "空气发闷一点", role: "supports compressed moist air", strength: "primary" },
            { cue: "像雨还卡在路上", role: "supports not-yet-arrived weather", strength: "primary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "空气发闷一点", role: "supports dense moist atmosphere", strength: "primary" },
              { cue: "雨还卡在路上", role: "keeps weather suspended", strength: "primary" },
            ],
            "low-presence": [
              { cue: "不是海边的亮", role: "prevents bright airy reading from taking over", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "coastal airy brightness": [
              { cue: "不是海边的亮", role: "explicit anti-coastal cue", strength: "primary" },
            ],
            "mixed atmosphere with retained trace": [
              { cue: "空气发闷一点", role: "keeps it pure atmosphere, not atmosphere-plus-trace", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "雨意还没到，但空气已经先闷下来", kind: "threshold-atmosphere", supportedBy: ["空气发闷一点", "雨还卡在路上"] },
          ],
          secondary: [
            { label: "海边的亮被明确排除", kind: "boundary-suppression", supportedBy: ["不是海边的亮"] },
          ],
          nearbyButSuppressed: [
            { label: "海边亮白空气", kind: "coastal-neighbor", supportedBy: ["海边的亮"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先把发闷、将到未到的湿空气做出来"],
          traceLayer: ["不要补 coastal brightness 或 trace object"],
          suppressedLiteralization: ["不要滑成海边亮空气", "不要借 mixed imagery 成立"],
        },
      },
    },
    notes: [
      "Task 26 stabilization: anti-coastal moist phrasing for the softer threshold sample.",
    ],
  },
  {
    id: "pkg-026",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "不是雨前潮意，只留靠海那层亮白空气，不要叶痕不要对象",
    sourceRunner: "manual-curation-task-26",
    difficultyTags: ["atmosphere-led", "coastal-air", "anti-neighbor", "stabilization"],
    input: { inputText: "不是雨前潮意，只留靠海那层亮白空气，不要叶痕不要对象" },
    output: {
      package: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "high",
        interpretationHandles: [
          { id: "coastal-bright-air", label: "海边空气的亮和留白先成立", kind: "atmosphere", userFacing: true, sourceSignals: ["靠海那层亮白空气"], plannerWeight: 0.97 },
          { id: "scent-floating", label: "香气轻轻浮在表面，不立成对象", kind: "scent", userFacing: true, sourceSignals: ["只留"], plannerWeight: 0.55 },
        ],
        compositionAxes: [
          { id: "coastal-brightness-vs-objectness", label: "通透留白和具象海边感的边界", leftPole: "只保住晒白空气", rightPole: "让海边感更具体一点", currentBias: "left", blendable: true },
        ],
        misleadingPaths: [
          { label: "moist threshold atmosphere", reason: "这句明确不是雨前潮意，不能塌成 moist lane。", severity: "hard" },
          { label: "mixed coastal trace composition", reason: "这句明确不要叶痕不要对象。", severity: "hard" },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "不是雨前潮意", role: "blocks moist neighbor", strength: "primary" },
            { cue: "只留靠海那层亮白空气", role: "anchors pure coastal air", strength: "primary" },
            { cue: "不要叶痕不要对象", role: "blocks mixed and object lanes", strength: "primary" },
          ],
          handles: {
            "coastal-bright-air": [
              { cue: "靠海", role: "anchors coastal openness", strength: "primary" },
              { cue: "亮白空气", role: "anchors bright airy base", strength: "primary" },
            ],
            "scent-floating": [
              { cue: "只留", role: "keeps extra surface layer minimal", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "moist threshold atmosphere": [
              { cue: "不是雨前潮意", role: "explicit anti-moist cue", strength: "primary" },
            ],
            "mixed coastal trace composition": [
              { cue: "不要叶痕不要对象", role: "explicit anti-trace cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "只留下靠海那层亮白空气", kind: "coastal-air", supportedBy: ["靠海", "亮白空气"] },
          ],
          secondary: [
            { label: "雨前潮意和叶痕都被排除", kind: "boundary-suppression", supportedBy: ["不是雨前潮意", "不要叶痕不要对象"] },
          ],
          nearbyButSuppressed: [
            { label: "雨前潮意", kind: "moist-neighbor", supportedBy: ["雨前潮意"] },
            { label: "叶痕 mixed lane", kind: "mixed-trace", supportedBy: ["叶痕"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只保住靠海亮白空气，不借雨前潮意成立"],
          traceLayer: ["不要叶痕，不要对象"],
          suppressedLiteralization: ["不要滑到 moistThresholdAtmosphere", "不要回到 coastal-trace mixed imagery"],
        },
      },
    },
    notes: [
      "Task 26 stabilization: explicit anti-moist, anti-trace coastal phrasing for the residual confusion sample.",
    ],
  },
];

await upsertJsonl(packagePath, packageRecords);

console.log(`Rewrote ${packageRecords.length} package records.`);
