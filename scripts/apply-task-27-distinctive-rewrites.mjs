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
    id: "pkg-018",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "想要像矿物切面那样温一点的石纹，边缘别硬，也不要雾气",
    sourceRunner: "manual-curation-task-27",
    difficultyTags: ["soft-mineral", "anti-atmosphere-collapse", "stabilization"],
    input: { inputText: "想要像矿物切面那样温一点的石纹，边缘别硬，也不要雾气" },
    output: {
      package: {
        interpretationDomain: "softMineralTexture",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "mineral-surface-soft",
            label: "矿物表面感要在，但边缘是软的",
            kind: "structure",
            userFacing: true,
            sourceSignals: ["矿物切面", "石纹", "边缘别硬"],
            plannerWeight: 0.95,
          },
          {
            id: "mineral-density-softened",
            label: "硬度要往回收，留下温一点的密度",
            kind: "modifier",
            userFacing: true,
            sourceSignals: ["温一点", "别硬"],
            plannerWeight: 0.9,
          },
        ],
        compositionAxes: [
          {
            id: "mineral-density-vs-softness",
            label: "矿物密度和软化程度",
            leftPole: "保留材质感，但边缘更柔",
            rightPole: "强调表面硬度和棱角",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "over-hard stone rendering",
            reason: "这里要的是温一点的矿物切面，不是硬边硬石块。",
            severity: "hard",
          },
          {
            label: "generic mist atmosphere",
            reason: "用户明确说不要雾气，不应塌成 atmosphere lane。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "矿物切面", role: "anchors mineral-material reading", strength: "primary" },
            { cue: "石纹", role: "supports texture over atmosphere", strength: "primary" },
            { cue: "边缘别硬", role: "supports softened mineral treatment", strength: "primary" },
            { cue: "不要雾气", role: "blocks atmosphere collapse", strength: "primary" },
          ],
          handles: {
            "mineral-surface-soft": [
              { cue: "矿物切面", role: "supports mineral surface structure", strength: "primary" },
              { cue: "石纹", role: "supports texture layer", strength: "primary" },
            ],
            "mineral-density-softened": [
              { cue: "温一点", role: "supports softened density", strength: "primary" },
              { cue: "边缘别硬", role: "supports anti-hardness adjustment", strength: "primary" },
            ],
          },
          misleadingPaths: {
            "over-hard stone rendering": [
              { cue: "边缘别硬", role: "explicit anti-hard-edge cue", strength: "primary" },
            ],
            "generic mist atmosphere": [
              { cue: "不要雾气", role: "explicit anti-atmosphere cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "像矿物切面那样温一点的石纹", kind: "material-association", supportedBy: ["矿物切面", "石纹"] },
          ],
          secondary: [
            { label: "边缘必须继续被放软", kind: "softened-edge", supportedBy: ["边缘别硬", "温一点"] },
          ],
          nearbyButSuppressed: [
            { label: "硬边石块", kind: "over-hard-literalization", supportedBy: ["硬"] },
            { label: "泛雾气 atmosphere", kind: "generic-atmosphere", supportedBy: ["雾气"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先保住温一点的矿物切面和石纹密度"],
          traceLayer: ["纹理只留在表面，不长成硬边块体"],
          suppressedLiteralization: ["不要做成硬石块", "不要翻成雾气 atmosphere"],
        },
      },
    },
    notes: [
      "Task 27 rewrite: adds explicit mineral anchors and anti-atmosphere cue to stop the sample collapsing into mixed imagery.",
    ],
  },
  {
    id: "pkg-019",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "只要将要落雨前那股发闷的空气，不要海边的亮，也不要任何叶痕",
    sourceRunner: "manual-curation-task-27",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-neighbor", "stabilization"],
    input: { inputText: "只要将要落雨前那股发闷的空气，不要海边的亮，也不要任何叶痕" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "mist-rain-field",
            label: "烟雨一样的湿润空气做底",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["将要落雨前", "发闷的空气"],
            plannerWeight: 0.97,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["只要", "不要海边的亮", "不要任何叶痕"],
            plannerWeight: 0.82,
          },
        ],
        compositionAxes: [
          {
            id: "threshold-density-vs-arrival",
            label: "湿意显形和将落未落的分寸",
            leftPole: "只留压低的空气",
            rightPole: "让潮意更接近落下来",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "coastal airy brightness",
            reason: "这里明确不要海边的亮，不应往 coastal bright air 走。",
            severity: "hard",
          },
          {
            label: "mixed coastal trace composition",
            reason: "这里明确不要叶痕，不应借 mixed coastal-trace 成立。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "将要落雨前", role: "anchors pre-rain threshold timing", strength: "primary" },
            { cue: "发闷的空气", role: "anchors moist compressed air", strength: "primary" },
            { cue: "不要海边的亮", role: "blocks coastal neighbor", strength: "primary" },
            { cue: "不要任何叶痕", role: "blocks mixed trace neighbor", strength: "primary" },
          ],
          handles: {
            "mist-rain-field": [
              { cue: "将要落雨前", role: "supports threshold rain timing", strength: "primary" },
              { cue: "发闷的空气", role: "supports compressed moist air", strength: "primary" },
            ],
            "low-presence": [
              { cue: "只要", role: "keeps the surface narrow", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "coastal airy brightness": [
              { cue: "不要海边的亮", role: "explicit anti-coastal cue", strength: "primary" },
            ],
            "mixed coastal trace composition": [
              { cue: "不要任何叶痕", role: "explicit anti-trace cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "将要落雨前那股发闷的空气", kind: "threshold-atmosphere", supportedBy: ["将要落雨前", "发闷的空气"] },
          ],
          secondary: [
            { label: "海边亮感和叶痕都被明确排除", kind: "boundary-suppression", supportedBy: ["不要海边的亮", "不要任何叶痕"] },
          ],
          nearbyButSuppressed: [
            { label: "海边亮白空气", kind: "coastal-neighbor", supportedBy: ["海边的亮"] },
            { label: "叶痕 mixed lane", kind: "mixed-trace", supportedBy: ["叶痕"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["只做将要落雨前那股发闷空气"],
          traceLayer: ["不要保留叶痕或对象"],
          suppressedLiteralization: ["不要滑到 coastal air", "不要回到 mixed coastal-trace"],
        },
      },
    },
    notes: [
      "Task 27 rewrite: breaks the mirrored syntax with coastal samples and adds stronger pre-rain moist anchors.",
    ],
  },
  {
    id: "pkg-026",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "像盐和太阳把空气晒白了，只留开阔，不要潮闷也不要叶痕",
    sourceRunner: "manual-curation-task-27",
    difficultyTags: ["atmosphere-led", "coastal-air", "anti-neighbor", "stabilization"],
    input: { inputText: "像盐和太阳把空气晒白了，只留开阔，不要潮闷也不要叶痕" },
    output: {
      package: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "coastal-bright-air",
            label: "海边空气的亮和留白先成立",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["盐", "太阳", "晒白", "开阔"],
            plannerWeight: 0.97,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
            sourceSignals: ["只留开阔"],
            plannerWeight: 0.54,
          },
        ],
        compositionAxes: [
          {
            id: "coastal-brightness-vs-objectness",
            label: "通透留白和具象海边感的边界",
            leftPole: "只保住晒白空气",
            rightPole: "让海边感更具体一点",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "moist threshold atmosphere",
            reason: "这里明确不要潮闷，不应往 moist threshold 走。",
            severity: "hard",
          },
          {
            label: "mixed coastal trace composition",
            reason: "这里明确不要叶痕，不应借 mixed coastal-trace 成立。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            { cue: "盐和太阳", role: "anchors sun-bleached coastal association", strength: "primary" },
            { cue: "晒白了", role: "anchors bright washed air", strength: "primary" },
            { cue: "只留开阔", role: "supports open airy base", strength: "primary" },
            { cue: "不要潮闷也不要叶痕", role: "blocks moist and mixed neighbors", strength: "primary" },
          ],
          handles: {
            "coastal-bright-air": [
              { cue: "盐和太阳", role: "supports coastal light association", strength: "primary" },
              { cue: "晒白了", role: "supports bright bleached air", strength: "primary" },
              { cue: "开阔", role: "supports openness", strength: "primary" },
            ],
            "scent-floating": [
              { cue: "只留开阔", role: "keeps extra surface layer minimal", strength: "secondary" },
            ],
          },
          misleadingPaths: {
            "moist threshold atmosphere": [
              { cue: "不要潮闷", role: "explicit anti-moist cue", strength: "primary" },
            ],
            "mixed coastal trace composition": [
              { cue: "不要叶痕", role: "explicit anti-trace cue", strength: "primary" },
            ],
          },
        },
        associationReadings: {
          primary: [
            { label: "像盐和太阳把空气晒白后的开阔感", kind: "coastal-air", supportedBy: ["盐和太阳", "晒白了", "开阔"] },
          ],
          secondary: [
            { label: "潮闷和叶痕都被明确排除", kind: "boundary-suppression", supportedBy: ["不要潮闷也不要叶痕"] },
          ],
          nearbyButSuppressed: [
            { label: "雨前潮闷空气", kind: "moist-neighbor", supportedBy: ["潮闷"] },
            { label: "叶痕 mixed lane", kind: "mixed-trace", supportedBy: ["叶痕"] },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先做被盐和太阳晒白的开阔空气"],
          traceLayer: ["不要叶痕，不要对象，只留大留白"],
          suppressedLiteralization: ["不要滑到 moist threshold", "不要回到 coastal-trace mixed imagery"],
        },
      },
    },
    notes: [
      "Task 27 rewrite: breaks the mirrored syntax with moist samples and adds unique coastal light anchors.",
    ],
  },
];

await upsertJsonl(packagePath, packageRecords);

console.log(`Rewrote ${packageRecords.length} package records.`);
