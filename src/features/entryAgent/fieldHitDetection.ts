import type { ConfidenceLevel, EntryAgentDetectionResult, HighValueField } from "./types";

interface DetectionRule {
  pattern: string;
  weight: number;
}

const LOW_INFORMATION_PATTERNS = [
  "先给我看看",
  "先看看",
  "看看再说",
  "还没想好",
  "没想好",
  "先随便看看",
  "好看一点",
];

const FIELD_RULES: Record<HighValueField, DetectionRule[]> = {
  spaceContext: [
    { pattern: "卧室", weight: 1.2 },
    { pattern: "客厅", weight: 1.2 },
    { pattern: "书房", weight: 1.1 },
    { pattern: "办公室", weight: 1.1 },
    { pattern: "会议室", weight: 1.1 },
    { pattern: "房间", weight: 0.8 },
    { pattern: "空间", weight: 0.6 },
  ],
  overallImpression: [
    { pattern: "春天", weight: 0.9 },
    { pattern: "安静", weight: 1.2 },
    { pattern: "宁静", weight: 1.2 },
    { pattern: "平静", weight: 1.1 },
    { pattern: "明媚", weight: 1.1 },
    { pattern: "张扬", weight: 1.2 },
    { pattern: "快乐", weight: 1.0 },
    { pattern: "低调", weight: 1.1 },
    { pattern: "别太抢", weight: 1.2 },
    { pattern: "轻陪伴感", weight: 1.2 },
    { pattern: "安静日常感", weight: 1.3 },
    { pattern: "轻存在感", weight: 1.0 },
    { pattern: "温暖", weight: 1.1 },
    { pattern: "温馨", weight: 1.1 },
    { pattern: "柔和", weight: 1.1 },
    { pattern: "柔软", weight: 1.0 },
    { pattern: "活力", weight: 1.1 },
    { pattern: "有存在感", weight: 1.1 },
    { pattern: "存在感", weight: 0.9 },
    { pattern: "舒服", weight: 0.8 },
  ],
  colorMood: [
    { pattern: "春天", weight: 0.9 },
    { pattern: "春意", weight: 1.1 },
    { pattern: "鲜艳", weight: 1.2 },
    { pattern: "明媚", weight: 1.2 },
    { pattern: "绿意", weight: 1.2 },
    { pattern: "绿意盎然", weight: 1.4 },
    { pattern: "咖啡", weight: 1.3 },
    { pattern: "咖啡时光", weight: 1.4 },
    { pattern: "咖啡感", weight: 1.3 },
    { pattern: "咖色", weight: 1.2 },
    { pattern: "草色", weight: 1.1 },
    { pattern: "草色遥看近却无", weight: 1.4 },
    { pattern: "若有若无", weight: 1.1 },
    { pattern: "雾感", weight: 1.0 },
    { pattern: "朦胧", weight: 1.0 },
    { pattern: "雾里有色", weight: 1.2 },
    { pattern: "大地色", weight: 1.3 },
    { pattern: "颜色自然", weight: 1.1 },
    { pattern: "自然一点的颜色", weight: 1.2 },
    { pattern: "淡一点", weight: 1.0 },
    { pattern: "收一点", weight: 0.9 },
    { pattern: "克制", weight: 1.0 },
    { pattern: "不要太跳", weight: 1.2 },
    { pattern: "别太跳", weight: 1.2 },
    { pattern: "柔和一点", weight: 1.0 },
    { pattern: "暖一点", weight: 0.9 },
    { pattern: "深一点", weight: 0.8 },
  ],
  patternTendency: [
    { pattern: "不要太花", weight: 1.3 },
    { pattern: "别太花", weight: 1.3 },
    { pattern: "不要太碎", weight: 1.2 },
    { pattern: "别太碎", weight: 1.2 },
    { pattern: "图案别太碎", weight: 1.4 },
    { pattern: "图案不要太碎", weight: 1.4 },
    { pattern: "不要太几何", weight: 1.2 },
    { pattern: "别太几何", weight: 1.2 },
    { pattern: "纹理感", weight: 0.9 },
    { pattern: "自然一点", weight: 0.8 },
  ],
  arrangementTendency: [
    { pattern: "秩序感", weight: 1.3 },
    { pattern: "有秩序", weight: 1.2 },
    { pattern: "呼吸感", weight: 1.2 },
    { pattern: "不要太满", weight: 1.2 },
    { pattern: "别太满", weight: 1.2 },
    { pattern: "松一点", weight: 1.0 },
    { pattern: "更松一点", weight: 1.1 },
    { pattern: "疏一点", weight: 1.0 },
    { pattern: "别太硬", weight: 0.9 },
    { pattern: "不要太硬", weight: 0.9 },
    { pattern: "整齐一点", weight: 1.0 },
  ],
};

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function hasLowInformationSignal(text: string) {
  return LOW_INFORMATION_PATTERNS.some((pattern) => text.includes(pattern));
}

function getConfidence(score: number, evidenceCount: number): ConfidenceLevel {
  if (score >= 2.2 || evidenceCount >= 3) {
    return "high";
  }
  if (score >= 1.0 || evidenceCount >= 1) {
    return "medium";
  }
  return "low";
}

function detectFieldEvidence(text: string, field: HighValueField) {
  const matches = FIELD_RULES[field].filter((rule) => text.includes(rule.pattern));
  const evidence = [...new Set(matches.map((rule) => rule.pattern))];
  const score = matches.reduce((sum, rule) => sum + rule.weight, 0);

  return {
    evidence,
    score,
  };
}

export function detectHighValueFieldHits(text: string): EntryAgentDetectionResult {
  const normalizedText = normalizeText(text);
  const lowInformation = hasLowInformationSignal(normalizedText);

  const hitFields: HighValueField[] = [];
  const evidence: Partial<Record<HighValueField, string[]>> = {};
  const confidence: Partial<Record<HighValueField, ConfidenceLevel>> = {};

  (Object.keys(FIELD_RULES) as HighValueField[]).forEach((field) => {
    const detection = detectFieldEvidence(normalizedText, field);

    if (detection.evidence.length === 0) {
      return;
    }

    if (lowInformation && detection.score < 1.2) {
      return;
    }

    hitFields.push(field);
    evidence[field] = detection.evidence;
    confidence[field] = getConfidence(detection.score, detection.evidence.length);
  });

  return {
    hitFields,
    evidence,
    confidence,
  };
}
