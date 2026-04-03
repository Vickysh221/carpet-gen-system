import { buildIntentSemanticMappingFromAnalysis } from "../agentRuntime";
import { analyzeEntryText } from "../index";

type EvalGroup = "poetic-atmospheric" | "explicit-motif" | "mixed" | "edge-noisy";
type EvalStrength = "strong" | "medium" | "weak" | "miss";

type EvalCase = {
  id: string;
  group: EvalGroup;
  query: string;
  expectedMappings?: string[];
  expectedPatternKeywords?: string[];
};

const TEST_CASES: EvalCase[] = [
  { id: "A1", group: "poetic-atmospheric", query: "天青色等烟雨", expectedMappings: ["天青", "烟雨"] },
  { id: "A2", group: "poetic-atmospheric", query: "月白风清，像有一点清辉", expectedMappings: ["月白", "清辉"] },
  { id: "A3", group: "poetic-atmospheric", query: "山岚一样轻轻浮着", expectedMappings: ["山岚", "云雾"] },
  { id: "A4", group: "poetic-atmospheric", query: "雪落后的寂静感", expectedMappings: ["雪", "霜"] },
  { id: "A5", group: "poetic-atmospheric", query: "凌晨四点街灯下的雪", expectedMappings: ["凌晨四点街灯下的雪", "雪"] },
  { id: "A6", group: "poetic-atmospheric", query: "雨落在旧玻璃上那种朦胧", expectedMappings: ["雨落在旧玻璃上", "烟雨", "云雾"] },
  { id: "A7", group: "poetic-atmospheric", query: "旧木头被太阳晒过的温度", expectedMappings: ["旧木头被太阳晒过", "晨曦", "炉火"] },
  { id: "A8", group: "poetic-atmospheric", query: "冬天太阳照在冷石头上", expectedMappings: ["冬天太阳照在冷石头上"] },

  { id: "B1", group: "explicit-motif", query: "想要竹影", expectedMappings: ["竹影"], expectedPatternKeywords: ["botanical"] },
  { id: "B2", group: "explicit-motif", query: "有荷花在风里摇曳的感觉", expectedPatternKeywords: ["botanical"] },
  { id: "B3", group: "explicit-motif", query: "一点孤帆远影", expectedMappings: ["云帆", "长风"] },
  { id: "B4", group: "explicit-motif", query: "水波纹慢慢散开", expectedMappings: ["水波"], expectedPatternKeywords: ["water-wave"] },
  { id: "B5", group: "explicit-motif", query: "暮色里的灯火", expectedMappings: ["暮色", "灯火"], expectedPatternKeywords: ["light-trace"] },
  { id: "B6", group: "explicit-motif", query: "石头肌理但别太硬", expectedMappings: ["冬天太阳照在冷石头上"] },
  { id: "B7", group: "explicit-motif", query: "花叶意向，不要大朵花", expectedPatternKeywords: ["botanical", "floral"] },
  { id: "B8", group: "explicit-motif", query: "松风掠过的针叶感", expectedMappings: ["松风"], expectedPatternKeywords: ["botanical"] },

  { id: "C1", group: "mixed", query: "烟雨里有一点竹影", expectedMappings: ["烟雨", "竹影"], expectedPatternKeywords: ["cloud-mist", "botanical"] },
  { id: "C2", group: "mixed", query: "月白底上浮一层水波", expectedMappings: ["月白", "水波"], expectedPatternKeywords: ["water-wave"] },
  { id: "C3", group: "mixed", query: "冷石头上落了一点晨曦", expectedMappings: ["晨曦", "冬天太阳照在冷石头上"] },
  { id: "C4", group: "mixed", query: "暮色灯火，但整体要克制", expectedMappings: ["暮色", "灯火"] },
  { id: "C5", group: "mixed", query: "山岚和云帆一起，留白多一点", expectedMappings: ["山岚", "云帆", "月白"] },
  { id: "C6", group: "mixed", query: "竹影里带一点清辉", expectedMappings: ["竹影", "清辉"], expectedPatternKeywords: ["botanical"] },
  { id: "C7", group: "mixed", query: "夜色水波，不要太具象", expectedMappings: ["夜色", "水波"], expectedPatternKeywords: ["water-wave"] },
  { id: "C8", group: "mixed", query: "春水初生，像有一点花叶", expectedMappings: ["春水初生"], expectedPatternKeywords: ["botanical", "floral"] },

  { id: "D1", group: "edge-noisy", query: "不要酒店大堂感，要暮色灯火", expectedMappings: ["暮色", "灯火"], expectedPatternKeywords: ["light-trace"] },
  { id: "D2", group: "edge-noisy", query: "别太花，别太亮，像风从松林里过", expectedMappings: ["松风"], expectedPatternKeywords: ["botanical"] },
  { id: "D3", group: "edge-noisy", query: "不是儿童房那种可爱花花草草", expectedPatternKeywords: ["botanical", "floral"] },
  { id: "D4", group: "edge-noisy", query: "我也说不清，像下雨前五分钟的空气", expectedMappings: ["烟雨", "云雾", "山岚"] },
  { id: "D5", group: "edge-noisy", query: "想要高级，但不是金尊也不是锦", expectedMappings: ["金尊", "锦"] },
  { id: "D6", group: "edge-noisy", query: "类似天青，但别冷到像医院", expectedMappings: ["天青", "月白"] },
  { id: "D7", group: "edge-noisy", query: "有点云雾，但不要做成海洋主题", expectedMappings: ["云雾", "烟雨", "山岚"] },
  { id: "D8", group: "edge-noisy", query: "我想要那种 quiet luxury，但像旧木头晒过", expectedMappings: ["旧木头被太阳晒过", "金尊"] },
];

function scoreCoverage(value: number | undefined) {
  return typeof value === "number" ? value : 0;
}

function classifyCase(input: {
  matchedMappings: string[];
  matchedExpectedMappings: string[];
  matchedPatternKeywords: string[];
  macroSlotCoverage: Record<string, number>;
}): EvalStrength {
  const strongCoverageCount = Object.values(input.macroSlotCoverage).filter((value) => scoreCoverage(value) >= 0.55).length;

  if (input.matchedExpectedMappings.length >= 2) {
    return "strong";
  }
  if (input.matchedExpectedMappings.length >= 1 && strongCoverageCount >= 3) {
    return "strong";
  }
  if (input.matchedExpectedMappings.length >= 1 || input.matchedPatternKeywords.length >= 1) {
    return "medium";
  }
  if (input.matchedMappings.length >= 1 || strongCoverageCount >= 2) {
    return "weak";
  }
  return "miss";
}

function groupBy<T extends { group: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

const evaluatedCases = [];

for (const testCase of TEST_CASES) {
  const analysis = await analyzeEntryText({ text: testCase.query });
  const semanticMapping = buildIntentSemanticMappingFromAnalysis(analysis);
  const matchedMappings = (analysis.semanticCanvas?.poeticSignal?.hits ?? []).map((item) => item.key);
  const macroSlotCoverage = semanticMapping.confidenceSummary?.macroSlotCoverage ?? {};
  const patternIntent = analysis.semanticCanvas?.poeticSignal?.patternIntent;
  const matchedExpectedMappings = (testCase.expectedMappings ?? []).filter((item) => matchedMappings.includes(item));
  const matchedPatternKeywords = (testCase.expectedPatternKeywords ?? []).filter((item) => {
    return (
      patternIntent?.keyElement === item ||
      patternIntent?.motionFeeling === item ||
      patternIntent?.renderingMode === item ||
      patternIntent?.abstractionPreference === item
    );
  });
  const classification = classifyCase({
    matchedMappings,
    matchedExpectedMappings,
    matchedPatternKeywords,
    macroSlotCoverage,
  });

  evaluatedCases.push({
    ...testCase,
    classification,
    matchedMappings,
    matchedExpectedMappings,
    matchedPatternKeywords,
    macroSlotCoverage,
    patternIntent: patternIntent ?? null,
    presence: analysis.semanticCanvas?.poeticSignal?.presence ?? null,
    followupHints: analysis.semanticCanvas?.poeticSignal?.followupHints ?? [],
    questionPrompt: analysis.questionPlan?.selectedQuestion?.prompt ?? null,
  });
}

const classificationCounts = evaluatedCases.reduce<Record<EvalStrength, number>>(
  (acc, item) => {
    acc[item.classification] += 1;
    return acc;
  },
  { strong: 0, medium: 0, weak: 0, miss: 0 },
);

const groupedCases = groupBy(evaluatedCases);
const groupedCounts = Object.fromEntries(
  Object.entries(groupedCases).map(([group, items]) => [
    group,
    items.reduce<Record<EvalStrength, number>>(
      (acc, item) => {
        acc[item.classification] += 1;
        return acc;
      },
      { strong: 0, medium: 0, weak: 0, miss: 0 },
    ),
  ]),
);

const payload = {
  date: "2026-04-03",
  methodology: {
    runner: "src/features/entryAgent/__tests__/semanticRetrievalEvalRunner.ts",
    entrypoint: "scripts/run-semantic-retrieval-eval-2026-04-03.mjs",
    stack: ["analyzeEntryText", "buildIntentSemanticMappingFromAnalysis"],
    note:
      "This evaluates the shipping TS semantic intake path. The local BGE-M3 Python retrieval helper is not runnable in this environment because it aborts with OMP Error #179 (Can't open SHM2).",
  },
  classificationCounts,
  groupedCounts,
  cases: evaluatedCases,
};

export default payload;
