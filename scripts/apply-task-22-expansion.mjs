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
    sourceCase: "下雨前五分钟的空气",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere"],
    input: { inputText: "下雨前五分钟的空气" },
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
            sourceSignals: ["下雨前", "空气"],
            plannerWeight: 0.94,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["五分钟"],
            plannerWeight: 0.76,
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
            label: "generic storm illustration",
            reason: "这里要的是阈值空气，不是雷雨画面。",
            severity: "hard",
          },
          {
            label: "literal rainy scene rendering",
            reason: "不应把这句做成下雨场景插画。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "下雨前",
              role: "supports threshold-weather reading",
              strength: "primary",
            },
            {
              cue: "空气",
              role: "keeps the case atmospheric",
              strength: "primary",
            },
            {
              cue: "五分钟",
              role: "supports imminent, not fully arrived weather",
              strength: "secondary",
            },
          ],
          handles: {
            "mist-rain-field": [
              {
                cue: "下雨前",
                role: "supports threshold rain-field atmosphere",
                strength: "primary",
              },
              {
                cue: "空气",
                role: "keeps it non-object atmospheric",
                strength: "primary",
              },
            ],
            "low-presence": [
              {
                cue: "五分钟",
                role: "suggests subtle, not fully formed presence",
                strength: "secondary",
              },
            ],
          },
          misleadingPaths: {
            "generic storm illustration": [
              {
                cue: "下雨前",
                role: "pre-storm threshold should not become full storm scene",
                strength: "primary",
              },
            ],
            "literal rainy scene rendering": [
              {
                cue: "空气",
                role: "keeps the reading atmospheric rather than scenic",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "将落未落的阈值空气",
              kind: "threshold-atmosphere",
              supportedBy: ["下雨前", "空气"],
            },
          ],
          secondary: [
            {
              label: "湿度和压低感只轻轻出现",
              kind: "low-presence",
              supportedBy: ["五分钟"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "完整雷雨场景",
              kind: "literal-scenic",
              supportedBy: ["下雨"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["以将落未落的阈值空气做底"],
          traceLayer: ["若要留痕，也只允许极轻的表面天气感"],
          suppressedLiteralization: ["不要画成雷雨场景", "不要把空气翻成具象天气图像"],
        },
      },
    },
    notes: [
      "Task 22 refinement: aligned the pure moist sample with a pure-atmosphere axis so the domain no longer borrows mixed-imagery framing.",
    ],
  },
  {
    id: "pkg-020",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "海边那种被晒白的空气感",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "coastal-air"],
    input: { inputText: "海边那种被晒白的空气感" },
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
            sourceSignals: ["海边", "晒白", "空气感"],
            plannerWeight: 0.96,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
            sourceSignals: ["空气感"],
            plannerWeight: 0.65,
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
            label: "coastal postcard rendering",
            reason: "这句要的是晒白空气，不是海滩景观图。",
            severity: "hard",
          },
          {
            label: "literal object rendering",
            reason: "不应擅自补帆船、沙滩椅或海鸥等对象。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "海边",
              role: "anchors coastal reading",
              strength: "primary",
            },
            {
              cue: "晒白",
              role: "supports bleached brightness",
              strength: "primary",
            },
            {
              cue: "空气感",
              role: "keeps the reading atmospheric",
              strength: "primary",
            },
          ],
          handles: {
            "coastal-bright-air": [
              {
                cue: "海边",
                role: "supports coastal openness",
                strength: "primary",
              },
              {
                cue: "晒白",
                role: "supports bleached brightness",
                strength: "primary",
              },
              {
                cue: "空气感",
                role: "keeps it air-led",
                strength: "primary",
              },
            ],
            "scent-floating": [
              {
                cue: "空气感",
                role: "permits only a very light surface sensory layer",
                strength: "secondary",
              },
            ],
          },
          misleadingPaths: {
            "coastal postcard rendering": [
              {
                cue: "空气感",
                role: "supports atmosphere over scenery",
                strength: "primary",
              },
            ],
            "literal object rendering": [
              {
                cue: "海边",
                role: "does not justify object insertion by itself",
                strength: "secondary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "被晒白、被打开的海边空气",
              kind: "coastal-air",
              supportedBy: ["海边", "晒白", "空气感"],
            },
          ],
          secondary: [
            {
              label: "表面只有很轻的一层气息",
              kind: "surface-sensory",
              supportedBy: ["空气感"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "海滩 postcard 场景",
              kind: "literal-scenic",
              supportedBy: ["海边"],
            },
            {
              label: "被补出来的海边对象",
              kind: "literal-object",
              supportedBy: ["海边"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先把被晒白的海边空气和留白做底"],
          traceLayer: ["表面只允许很轻的一层气息，不补对象"],
          suppressedLiteralization: ["不要画成海滩明信片", "不要擅自补海边对象"],
        },
      },
    },
    notes: [
      "Task 22 refinement: moved the pure coastal sample onto a pure-air axis so it no longer references mixed-imagery leaf logic.",
    ],
  },
  {
    id: "pkg-021",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "空气里像压着一点潮意，还没真的下下来",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "constraint-led"],
    input: { inputText: "空气里像压着一点潮意，还没真的下下来" },
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
            sourceSignals: ["潮意", "还没真的下下来"],
            plannerWeight: 0.95,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["一点", "还没真的下下来"],
            plannerWeight: 0.8,
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
            label: "generic storm illustration",
            reason: "这句只有潮意压着，不是暴雨或乌云场景。",
            severity: "hard",
          },
          {
            label: "literal rainy scene rendering",
            reason: "用户明确说还没下下来，不应做成已经在下雨。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "潮意",
              role: "supports moist threshold reading",
              strength: "primary",
            },
            {
              cue: "还没真的下下来",
              role: "keeps the weather at the threshold stage",
              strength: "primary",
            },
            {
              cue: "空气里",
              role: "keeps the case atmospheric rather than scenic",
              strength: "primary",
            },
          ],
          handles: {
            "mist-rain-field": [
              {
                cue: "潮意",
                role: "supports wet suspended air rather than an object layer",
                strength: "primary",
              },
              {
                cue: "空气里",
                role: "keeps it atmospheric",
                strength: "primary",
              },
            ],
            "low-presence": [
              {
                cue: "一点",
                role: "keeps the presence restrained",
                strength: "secondary",
              },
              {
                cue: "还没真的下下来",
                role: "prevents full weather arrival",
                strength: "primary",
              },
            ],
          },
          misleadingPaths: {
            "generic storm illustration": [
              {
                cue: "一点潮意",
                role: "argues against storm-scale expansion",
                strength: "primary",
              },
            ],
            "literal rainy scene rendering": [
              {
                cue: "还没真的下下来",
                role: "explicitly blocks a rain scene",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "潮意压着空气，但还没落下来",
              kind: "threshold-atmosphere",
              supportedBy: ["潮意", "还没真的下下来", "空气里"],
            },
          ],
          secondary: [
            {
              label: "整层空气需要保持轻轻压低",
              kind: "low-presence",
              supportedBy: ["一点", "压着"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "已经在下的雨景",
              kind: "literal-scenic",
              supportedBy: ["下下来"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先让空气保持压低和将落未落的湿意"],
          traceLayer: ["表面只能留极轻的潮气，不长成雨丝或云块"],
          suppressedLiteralization: ["不要画成暴雨或乌云压城", "不要把阈值空气翻成已发生的雨景"],
        },
      },
    },
    notes: [
      "Task 22 expansion: pure moist sample that makes the threshold state explicit and blocks scenic rain literalization.",
    ],
  },
  {
    id: "pkg-022",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "想要那种将下未下的湿空气，不要雨景",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "anti-literalization"],
    input: { inputText: "想要那种将下未下的湿空气，不要雨景" },
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
            sourceSignals: ["将下未下", "湿空气"],
            plannerWeight: 0.95,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["不要雨景"],
            plannerWeight: 0.79,
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
            label: "generic storm illustration",
            reason: "这句只保留湿空气，不是完整天气戏剧。",
            severity: "hard",
          },
          {
            label: "literal rainy scene rendering",
            reason: "用户明确压掉雨景，不应出现雨丝或街景。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "将下未下",
              role: "supports threshold timing",
              strength: "primary",
            },
            {
              cue: "湿空气",
              role: "keeps the input in atmosphere-led reading",
              strength: "primary",
            },
            {
              cue: "不要雨景",
              role: "blocks scenic rain literalization",
              strength: "primary",
            },
          ],
          handles: {
            "mist-rain-field": [
              {
                cue: "将下未下",
                role: "supports pre-arrival atmospheric density",
                strength: "primary",
              },
              {
                cue: "湿空气",
                role: "keeps it air-led",
                strength: "primary",
              },
            ],
            "low-presence": [
              {
                cue: "不要雨景",
                role: "keeps weather presence below scenic threshold",
                strength: "primary",
              },
            ],
          },
          misleadingPaths: {
            "generic storm illustration": [
              {
                cue: "将下未下",
                role: "argues against a fully arrived storm",
                strength: "primary",
              },
            ],
            "literal rainy scene rendering": [
              {
                cue: "不要雨景",
                role: "explicit anti-scenic cue",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "将下未下的湿空气本身",
              kind: "threshold-atmosphere",
              supportedBy: ["将下未下", "湿空气"],
            },
          ],
          secondary: [
            {
              label: "湿度存在，但显形必须收住",
              kind: "low-presence",
              supportedBy: ["不要雨景"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "雨景街道或窗面",
              kind: "literal-scenic",
              supportedBy: ["雨景"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["以将落未落的湿空气做底，不铺具体天气画面"],
          traceLayer: ["若有天气感，也只能停在表面压低感"],
          suppressedLiteralization: ["不要出现雨丝、路面反光或窗景", "不要把湿空气扩成 storm illustration"],
        },
      },
    },
    notes: [
      "Task 22 expansion: pure moist sample that names the anti-rain-scene constraint directly.",
    ],
  },
  {
    id: "pkg-023",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "空气发闷一点，像雨还卡在路上",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "threshold-atmosphere", "vague-weather"],
    input: { inputText: "空气发闷一点，像雨还卡在路上" },
    output: {
      package: {
        interpretationDomain: "moistThresholdAtmosphere",
        domainConfidence: "medium",
        interpretationHandles: [
          {
            id: "mist-rain-field",
            label: "烟雨一样的湿润空气做底",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["空气发闷", "雨还卡在路上"],
            plannerWeight: 0.92,
          },
          {
            id: "low-presence",
            label: "那一点痕迹要轻，不要浮得太出来",
            kind: "presence",
            userFacing: true,
            sourceSignals: ["一点", "卡在路上"],
            plannerWeight: 0.78,
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
            label: "generic storm illustration",
            reason: "发闷是一种压低空气，不是戏剧化风暴。",
            severity: "hard",
          },
          {
            label: "literal rainy scene rendering",
            reason: "雨还卡在路上说明天气尚未真正到场。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "空气发闷一点",
              role: "supports compressed moist air",
              strength: "primary",
            },
            {
              cue: "雨还卡在路上",
              role: "supports not-yet-arrived weather",
              strength: "primary",
            },
          ],
          handles: {
            "mist-rain-field": [
              {
                cue: "空气发闷一点",
                role: "supports dense moist atmosphere",
                strength: "primary",
              },
              {
                cue: "雨还卡在路上",
                role: "keeps the rain-field suspended",
                strength: "secondary",
              },
            ],
            "low-presence": [
              {
                cue: "一点",
                role: "keeps the atmosphere restrained",
                strength: "secondary",
              },
              {
                cue: "卡在路上",
                role: "prevents full weather arrival",
                strength: "primary",
              },
            ],
          },
          misleadingPaths: {
            "generic storm illustration": [
              {
                cue: "发闷一点",
                role: "describes pressure, not spectacle",
                strength: "primary",
              },
            ],
            "literal rainy scene rendering": [
              {
                cue: "还卡在路上",
                role: "explicitly blocks a present rain scene",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "雨意还没到，但空气已经先闷下来",
              kind: "threshold-atmosphere",
              supportedBy: ["空气发闷一点", "雨还卡在路上"],
            },
          ],
          secondary: [
            {
              label: "整层感觉要压低，但不长成天气对象",
              kind: "low-presence",
              supportedBy: ["一点", "卡在路上"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "正在来的大雨叙事",
              kind: "literal-scenic",
              supportedBy: ["雨"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先把空气压低成将到未到的湿闷感"],
          traceLayer: ["只留表层潮意，不让天气显形"],
          suppressedLiteralization: ["不要发展成乌云或雨幕叙事", "不要把发闷理解成 storm scene"],
        },
      },
    },
    notes: [
      "Task 22 expansion: adds a less explicit pure moist phrasing so the domain is not bound to one formula.",
    ],
  },
  {
    id: "pkg-024",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "只想要晒白又通透的海边空气，不要海景",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "coastal-air", "anti-literalization"],
    input: { inputText: "只想要晒白又通透的海边空气，不要海景" },
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
            sourceSignals: ["晒白", "通透", "海边空气"],
            plannerWeight: 0.97,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
            sourceSignals: ["空气"],
            plannerWeight: 0.61,
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
            label: "coastal postcard rendering",
            reason: "用户明确说不要海景，不应生成海滩明信片。",
            severity: "hard",
          },
          {
            label: "literal object rendering",
            reason: "海边空气不等于帆船、椰树或沙滩物件。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "晒白",
              role: "supports bleached brightness",
              strength: "primary",
            },
            {
              cue: "通透",
              role: "supports open airy reading",
              strength: "primary",
            },
            {
              cue: "海边空气",
              role: "anchors coastal atmosphere",
              strength: "primary",
            },
            {
              cue: "不要海景",
              role: "blocks scenic literalization",
              strength: "primary",
            },
          ],
          handles: {
            "coastal-bright-air": [
              {
                cue: "晒白",
                role: "supports the light-washed brightness",
                strength: "primary",
              },
              {
                cue: "通透",
                role: "supports openness and air flow",
                strength: "primary",
              },
              {
                cue: "海边空气",
                role: "keeps the handle coastal and atmospheric",
                strength: "primary",
              },
            ],
            "scent-floating": [
              {
                cue: "空气",
                role: "permits only a faint surface sensory layer",
                strength: "secondary",
              },
            ],
          },
          misleadingPaths: {
            "coastal postcard rendering": [
              {
                cue: "不要海景",
                role: "explicit anti-postcard instruction",
                strength: "primary",
              },
            ],
            "literal object rendering": [
              {
                cue: "海边空气",
                role: "supports atmosphere rather than objects",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "晒白又通透的靠海空气本身",
              kind: "coastal-air",
              supportedBy: ["晒白", "通透", "海边空气"],
            },
          ],
          secondary: [
            {
              label: "表面只许留很淡的一层气息",
              kind: "surface-sensory",
              supportedBy: ["空气"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "具体海景",
              kind: "literal-scenic",
              supportedBy: ["海景"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先做晒白、通透、留白大的海边空气"],
          traceLayer: ["表面只停一层轻气，不补沙滩或海物"],
          suppressedLiteralization: ["不要长成海滩 postcard", "不要补椰树、帆船或海鸥对象"],
        },
      },
    },
    notes: [
      "Task 22 expansion: pure coastal sample with explicit anti-seascape constraint.",
    ],
  },
  {
    id: "pkg-025",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "像盐被太阳晒开后的那口亮空气",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "coastal-air", "sensory-led"],
    input: { inputText: "像盐被太阳晒开后的那口亮空气" },
    output: {
      package: {
        interpretationDomain: "coastalAiryBrightness",
        domainConfidence: "medium",
        interpretationHandles: [
          {
            id: "coastal-bright-air",
            label: "海边空气的亮和留白先成立",
            kind: "atmosphere",
            userFacing: true,
            sourceSignals: ["盐", "太阳晒开", "亮空气"],
            plannerWeight: 0.94,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
            sourceSignals: ["那口"],
            plannerWeight: 0.68,
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
            label: "coastal postcard rendering",
            reason: "这句强调的是亮空气，不是海岸线画面。",
            severity: "hard",
          },
          {
            label: "literal object rendering",
            reason: "盐和太阳都是感官线索，不应变成静物对象。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "盐",
              role: "supports a coastal air association",
              strength: "secondary",
            },
            {
              cue: "太阳晒开",
              role: "supports bleached brightness",
              strength: "primary",
            },
            {
              cue: "亮空气",
              role: "keeps the case air-led",
              strength: "primary",
            },
          ],
          handles: {
            "coastal-bright-air": [
              {
                cue: "太阳晒开",
                role: "supports sun-bleached brightness",
                strength: "primary",
              },
              {
                cue: "亮空气",
                role: "supports airy openness",
                strength: "primary",
              },
              {
                cue: "盐",
                role: "nudges the reading toward coastal openness",
                strength: "secondary",
              },
            ],
            "scent-floating": [
              {
                cue: "那口",
                role: "supports a surface sensory feel rather than an object",
                strength: "secondary",
              },
            ],
          },
          misleadingPaths: {
            "coastal postcard rendering": [
              {
                cue: "亮空气",
                role: "keeps the focus on atmosphere over scenery",
                strength: "primary",
              },
            ],
            "literal object rendering": [
              {
                cue: "盐被太阳晒开",
                role: "describes an air association, not objects to depict",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "被晒开的亮白空气像轻盐气候一样存在",
              kind: "coastal-air",
              supportedBy: ["盐", "太阳晒开", "亮空气"],
            },
          ],
          secondary: [
            {
              label: "整层感觉只停在一口很轻的表面气息",
              kind: "surface-sensory",
              supportedBy: ["那口"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "盐粒、太阳或海面对象",
              kind: "literal-object",
              supportedBy: ["盐", "太阳"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先把被晒开的亮白空气做出来，保持大留白"],
          traceLayer: ["表面只留轻盐般的气息，不长成具体对象"],
          suppressedLiteralization: ["不要画盐粒或太阳", "不要把亮空气翻成海岸线景观"],
        },
      },
    },
    notes: [
      "Task 22 expansion: adds a less explicit coastal cue cluster so the domain is not tied only to the word 海边.",
    ],
  },
  {
    id: "pkg-026",
    sampleType: "package",
    version: "v0.1",
    status: "curated",
    sourceCase: "更像靠海的亮白空气，空一点，别长对象",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["atmosphere-led", "coastal-air", "constraint-led"],
    input: { inputText: "更像靠海的亮白空气，空一点，别长对象" },
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
            sourceSignals: ["靠海", "亮白空气"],
            plannerWeight: 0.96,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
            sourceSignals: ["空一点"],
            plannerWeight: 0.58,
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
            label: "coastal postcard rendering",
            reason: "用户强调的是亮白空气，不是海边画面。",
            severity: "hard",
          },
          {
            label: "literal object rendering",
            reason: "用户明确说别长对象，不能补海边物件或纹样符号。",
            severity: "hard",
          },
        ],
      },
      supervision: {
        evidenceCues: {
          domain: [
            {
              cue: "靠海",
              role: "anchors coastal reading",
              strength: "primary",
            },
            {
              cue: "亮白空气",
              role: "supports bright airy base",
              strength: "primary",
            },
            {
              cue: "空一点",
              role: "supports openness and large blankness",
              strength: "secondary",
            },
            {
              cue: "别长对象",
              role: "blocks object insertion",
              strength: "primary",
            },
          ],
          handles: {
            "coastal-bright-air": [
              {
                cue: "靠海",
                role: "supports coastal openness",
                strength: "primary",
              },
              {
                cue: "亮白空气",
                role: "supports bright washed air",
                strength: "primary",
              },
            ],
            "scent-floating": [
              {
                cue: "空一点",
                role: "keeps any extra sensory layer very light",
                strength: "secondary",
              },
            ],
          },
          misleadingPaths: {
            "coastal postcard rendering": [
              {
                cue: "亮白空气",
                role: "keeps the reading atmospheric instead of scenic",
                strength: "primary",
              },
            ],
            "literal object rendering": [
              {
                cue: "别长对象",
                role: "explicit anti-object cue",
                strength: "primary",
              },
            ],
          },
        },
        associationReadings: {
          primary: [
            {
              label: "靠海但不落景的亮白空气",
              kind: "coastal-air",
              supportedBy: ["靠海", "亮白空气"],
            },
          ],
          secondary: [
            {
              label: "整体必须继续空、继续透",
              kind: "surface-sensory",
              supportedBy: ["空一点"],
            },
          ],
          nearbyButSuppressed: [
            {
              label: "海边对象或符号化纹样",
              kind: "literal-object",
              supportedBy: ["对象"],
            },
          ],
        },
        designTranslationHints: {
          baseLayer: ["先铺靠海的亮白空气和大的留白"],
          traceLayer: ["额外感觉只许轻轻浮着，不能形成对象"],
          suppressedLiteralization: ["不要补海边物件", "不要把靠海感做成景观或图标"],
        },
      },
    },
    notes: [
      "Task 22 expansion: pure coastal sample with explicit anti-object pressure so the domain stays atmosphere-first.",
    ],
  },
];

const coastalPurePackage = {
  interpretationDomain: "coastalAiryBrightness",
  domainConfidence: "high",
  interpretationHandles: [
    {
      id: "coastal-bright-air",
      label: "海边空气的亮和留白先成立",
      kind: "atmosphere",
      userFacing: true,
    },
    {
      id: "scent-floating",
      label: "香气轻轻浮在表面，不立成对象",
      kind: "scent",
      userFacing: true,
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
      label: "coastal postcard rendering",
      reason: "纯海边空气不应退化成海滩景观图。",
      severity: "hard",
    },
    {
      label: "literal object rendering",
      reason: "不能擅自补海边对象。",
      severity: "hard",
    },
  ],
};

const moistPurePackage = {
  interpretationDomain: "moistThresholdAtmosphere",
  domainConfidence: "high",
  interpretationHandles: [
    {
      id: "mist-rain-field",
      label: "烟雨一样的湿润空气做底",
      kind: "atmosphere",
      userFacing: true,
    },
    {
      id: "low-presence",
      label: "那一点痕迹要轻，不要浮得太出来",
      kind: "presence",
      userFacing: true,
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
      label: "generic storm illustration",
      reason: "纯阈值空气不应扩成暴雨或风暴场景。",
      severity: "hard",
    },
    {
      label: "literal rainy scene rendering",
      reason: "不能直接长成正在下雨的画面。",
      severity: "hard",
    },
  ],
};

const coastalPlan = {
  replySnapshot:
    "这个方向我会先把晒白、通透和留白大的空气拿稳，海边只作为开阔感存在，不让它长成具体景。",
  compositionProposals: [
    {
      id: "proposal-coastal-open-air",
      title: "先把亮白空气打开",
      summary: "先保住晒白、通透、留白大的海边空气，整张图以空气成立，不去补景。",
      dominantHandles: ["海边空气的亮和留白先成立"],
    },
    {
      id: "proposal-coastal-bright-surface",
      title: "让表面多留一点轻气",
      summary: "空气仍是主角，但表面允许一层极轻的气息，让亮白感更有贴面存在。",
      dominantHandles: ["海边空气的亮和留白先成立", "香气轻轻浮在表面，不立成对象"],
    },
    {
      id: "proposal-coastal-muted-air",
      title: "把海边感再收空一点",
      summary: "继续保住靠海的开阔和亮白，但让画面更空、更不具体，像空气先站住。",
      dominantHandles: ["海边空气的亮和留白先成立"],
    },
  ],
  refinementPrompt: {
    mode: "blend",
    text: "你可以告诉我更像哪一种，或者把两种空气揉一下，再说亮度、留白和具体感哪一层该再收一点。",
    allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
  },
};

const moistPlan = {
  replySnapshot:
    "这句我会先保住将落未落的湿空气，把压低感放在最前面，不让它长成真的雨景。",
  compositionProposals: [
    {
      id: "proposal-moist-threshold-air",
      title: "先留将落未落的空气",
      summary: "把阈值空气先铺出来，湿意已经在，但仍旧停在将落未落的分寸上。",
      dominantHandles: ["烟雨一样的湿润空气做底", "那一点痕迹要轻，不要浮得太出来"],
    },
    {
      id: "proposal-moist-pressure-first",
      title: "让压低感再近一点",
      summary: "把空气再压低一点，让将到未到的湿闷感更明确，但仍不出现雨景。",
      dominantHandles: ["烟雨一样的湿润空气做底"],
    },
    {
      id: "proposal-moist-lower-presence",
      title: "把天气感继续收住",
      summary: "湿意保留，但显形再轻一点，真正留在前面的仍是空气而不是天气对象。",
      dominantHandles: ["那一点痕迹要轻，不要浮得太出来", "烟雨一样的湿润空气做底"],
    },
  ],
  refinementPrompt: {
    mode: "blend",
    text: "你可以告诉我更像哪一种，或者把两种揉一下，再说压低感、湿意和显形程度哪一层该多一点或少一点。",
    allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
  },
};

const feedbackRecords = [
  {
    id: "fb-017",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "海边那种被晒白的空气感 / blend-open-and-muted-air",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["coastal-air", "blend-proposals", "pure-atmosphere"],
    input: {
      inputText: "海边那种被晒白的空气感",
      previousPackage: coastalPurePackage,
      previousResponsePlan: coastalPlan,
      userFeedbackText: "第一种和第三种揉一下吧，通透要在，但别像海报那么满。",
    },
    output: {
      proposalFeedbackSignal: {
        blendedProposalIds: ["proposal-coastal-open-air", "proposal-coastal-muted-air"],
        boostedHandles: ["coastal-bright-air"],
        sourceText: "第一种和第三种揉一下吧，通透要在，但别像海报那么满。",
      },
    },
    notes: [
      "Task 22 expansion: pure coastal blend sample that keeps the action inside the same proposal set.",
    ],
  },
  {
    id: "fb-018",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "下雨前五分钟的空气 / blend-threshold-and-lower-presence",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["threshold-atmosphere", "blend-proposals", "pure-atmosphere"],
    input: {
      inputText: "下雨前五分钟的空气",
      previousPackage: moistPurePackage,
      previousResponsePlan: moistPlan,
      userFeedbackText: "我想把第一种和第三种混一下，压低感留着，但别太像真的要下了。",
    },
    output: {
      proposalFeedbackSignal: {
        blendedProposalIds: ["proposal-moist-threshold-air", "proposal-moist-lower-presence"],
        boostedHandles: ["mist-rain-field", "low-presence"],
        sourceText: "我想把第一种和第三种混一下，压低感留着，但别太像真的要下了。",
      },
    },
    notes: [
      "Task 22 expansion: pure moist blend sample that still behaves as feedback-over-context rather than a free label.",
    ],
  },
  {
    id: "fb-019",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "海边那种被晒白的空气感 / corrected-domain -> moistThresholdAtmosphere",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["feedback-corrected-domain", "coastal-air", "threshold-atmosphere"],
    input: {
      inputText: "海边那种被晒白的空气感",
      previousPackage: coastalPurePackage,
      previousResponsePlan: coastalPlan,
      userFeedbackText: "海边那边还是亮了点，我更想要下雨前压着的空气。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "moistThresholdAtmosphere",
        reducedHandles: ["coastal-bright-air"],
        sourceText: "海边那边还是亮了点，我更想要下雨前压着的空气。",
      },
    },
    notes: [
      "Task 22 expansion: pure coastal -> pure moist corrected-domain sample.",
    ],
  },
  {
    id: "fb-020",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "下雨前五分钟的空气 / corrected-domain -> coastalAiryBrightness",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["feedback-corrected-domain", "threshold-atmosphere", "coastal-air"],
    input: {
      inputText: "下雨前五分钟的空气",
      previousPackage: moistPurePackage,
      previousResponsePlan: moistPlan,
      userFeedbackText: "潮意先收一点吧，我还是更想回到那种晒白通透的空气。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "coastalAiryBrightness",
        reducedHandles: ["mist-rain-field"],
        sourceText: "潮意先收一点吧，我还是更想回到那种晒白通透的空气。",
      },
    },
    notes: [
      "Task 22 expansion: pure moist -> pure coastal corrected-domain sample.",
    ],
  },
  {
    id: "fb-021",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "加州沙滩和柠檬叶的香气 / corrected-domain -> coastalAiryBrightness",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["feedback-corrected-domain", "mixed-imagery", "coastal-air"],
    input: {
      inputText: "加州沙滩和柠檬叶的香气",
      previousPackage: {
        interpretationDomain: "mixedImageryComposition",
        domainConfidence: "high",
        interpretationHandles: [
          {
            id: "coastal-bright-air",
            label: "海边空气的亮和留白先成立",
            kind: "atmosphere",
            userFacing: true,
          },
          {
            id: "scent-floating",
            label: "香气轻轻浮在表面，不立成对象",
            kind: "scent",
            userFacing: true,
          },
          {
            id: "lemon-leaf-trace",
            label: "叶感只留一点清绿苦感的痕迹",
            kind: "trace",
            userFacing: true,
          },
        ],
        compositionAxes: [
          {
            id: "coastal-air-vs-leaf-trace",
            label: "空气和叶感的主次",
            leftPole: "海边空气先做底",
            rightPole: "叶感痕迹稍微浮出来",
            currentBias: "left",
            blendable: true,
          },
        ],
        misleadingPaths: [
          {
            label: "coastal postcard rendering",
            reason: "海边空气应作为底子，而不是写实海景。",
            severity: "hard",
          },
        ],
      },
      previousResponsePlan: {
        replySnapshot:
          "这个画面我会拿得很轻，先让亮的空气出来，柠檬叶那点清绿苦感只够你隐约闻到一点。",
        compositionProposals: [
          {
            id: "proposal-mixed-atmosphere-first",
            title: "把空气留在最前面",
            summary: "先把海边空气和留白铺开，叶感只在边上轻轻提一下。",
            dominantHandles: ["海边空气的亮和留白先成立", "叶感只留一点清绿苦感的痕迹"],
          },
          {
            id: "proposal-mixed-trace-first",
            title: "让叶感轻轻亮一下",
            summary: "把叶感稍微推近一点，但仍旧贴着空气走，不立成对象。",
            dominantHandles: ["叶感只留一点清绿苦感的痕迹", "海边空气的亮和留白先成立"],
          },
          {
            id: "proposal-mixed-scent-led",
            title: "让气息带着往前走",
            summary: "香气轻轻带一下，空气和叶感都往后退。",
            dominantHandles: ["香气轻轻浮在表面，不立成对象", "海边空气的亮和留白先成立"],
          },
        ],
        refinementPrompt: {
          mode: "blend",
          text: "你可以告诉我更像哪一种，或者拿两种混一下，再说哪一层该更轻、哪一层该往前一点。",
          allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
        },
      },
      userFeedbackText: "叶子先拿掉吧，我其实只想要靠海那层亮白空气。",
    },
    output: {
      proposalFeedbackSignal: {
        correctedDomain: "coastalAiryBrightness",
        boostedHandles: ["coastal-bright-air"],
        reducedHandles: ["lemon-leaf-trace"],
        sourceText: "叶子先拿掉吧，我其实只想要靠海那层亮白空气。",
      },
    },
    notes: [
      "Task 22 expansion: mixed imagery -> pure coastal corrected-domain sample.",
    ],
  },
  {
    id: "fb-022",
    sampleType: "feedback-signal",
    version: "v0.1",
    status: "curated",
    sourceCase: "海边那种被晒白的空气感 / blend-bright-surface-and-muted-air",
    sourceRunner: "manual-curation-task-22",
    difficultyTags: ["coastal-air", "blend-proposals", "pure-atmosphere", "feedback-reduce-boost"],
    input: {
      inputText: "海边那种被晒白的空气感",
      previousPackage: coastalPurePackage,
      previousResponsePlan: coastalPlan,
      userFeedbackText: "第二种和第三种混一下，亮还要在，但更空一点，别长成海景。",
    },
    output: {
      proposalFeedbackSignal: {
        blendedProposalIds: ["proposal-coastal-bright-surface", "proposal-coastal-muted-air"],
        boostedHandles: ["coastal-bright-air"],
        reducedHandles: ["scent-floating"],
        sourceText: "第二种和第三种混一下，亮还要在，但更空一点，别长成海景。",
      },
    },
    notes: [
      "Task 22 expansion: second pure coastal blend sample with emphasis adjustment.",
    ],
  },
];

await upsertJsonl(packagePath, packageRecords);
await upsertJsonl(feedbackPath, feedbackRecords);

console.log(`Updated ${packageRecords.length} package records and ${feedbackRecords.length} feedback records.`);
