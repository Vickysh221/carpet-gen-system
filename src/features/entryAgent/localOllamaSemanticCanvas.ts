import type { FuliSemanticCanvas, HighValueField, SemanticUnit } from "./types";

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL ?? "/ollama";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:3b";
const OLLAMA_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS ?? "20000");

type RawOllamaGenerateResponse = {
  response?: string;
};

type RawCanvasResponse = Partial<FuliSemanticCanvas>;

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function buildPrompt(text: string, hitFields: HighValueField[], semanticUnits: SemanticUnit[]) {
  return `
你是 Fuli 的 semantic canvas 解释器。
任务不是直接生成参数，而是把用户输入先翻译成高层语义 canvas。
如果输入具有诗意、隐喻、复合意象、体验性表达，优先保留其概念结构，不要过早压成“暖/冷/安静”这类粗标签。

用户输入：${text}
已命中字段：${hitFields.join(", ")}
已拆出的 semantic units：${semanticUnits.map((unit) => `${unit.cue}(${unit.cueType})`).join(" / ")}

返回严格 JSON，不要附加任何解释。格式：
{
  "rawCues": ["..."],
  "conceptualAxes": ["..."],
  "metaphoricDomains": ["..."],
  "designTranslations": {
    "colorIdentity": ["..."],
    "colorRestraint": ["..."],
    "motifLogic": ["..."],
    "arrangementLogic": ["..."],
    "impressionTone": ["..."],
    "materialSuggestion": ["..."],
    "presenceIntensity": ["..."]
  },
  "slotMappings": {
    "targetFields": ["colorMood", "overallImpression"],
    "targetSlots": ["color", "impression"],
    "targetAxes": ["color.warmth", "color.saturation", "impression.energy"]
  },
  "narrativePolicy": {
    "mustPreserve": ["..."],
    "mustNotOverLiteralize": ["..."],
    "directionalDominant": ["..."]
  },
  "questionImplications": {
    "likelyQuestionKinds": ["clarify"],
    "likelyInformationGains": ["..."]
  },
  "confidence": 0.78
}

要求：
- 只在 targetFields 中使用 spaceContext, overallImpression, colorMood, patternTendency, arrangementTendency。
- 只在 targetSlots 中使用 color, motif, arrangement, impression。
- targetAxes 只允许：
  color.warmth, color.saturation,
  motif.complexity, motif.geometry, motif.organic,
  arrangement.order, arrangement.spacing,
  impression.calm, impression.energy, impression.softness
- 保留诗意输入中的 identity signal，比如绿意、春意、若有若无。
- 对咖啡时光这类 lifestyle cue，不要直接压成“暖棕”。
- 如果信息不足，也返回一个尽量保守但有结构的 canvas，不要返回空字符串。
  `.trim();
}

async function fetchJson(path: string, init?: RequestInit, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `HTTP ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function asStringArray(value: unknown) {
  return unique(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []);
}

const ALLOWED_FIELDS = new Set(["spaceContext", "overallImpression", "colorMood", "patternTendency", "arrangementTendency"]);
const ALLOWED_SLOTS = new Set(["color", "motif", "arrangement", "impression"]);
const ALLOWED_AXES = new Set([
  "color.warmth",
  "color.saturation",
  "motif.complexity",
  "motif.geometry",
  "motif.organic",
  "arrangement.order",
  "arrangement.spacing",
  "impression.calm",
  "impression.energy",
  "impression.softness",
]);

function normalizeCanvas(raw: RawCanvasResponse): FuliSemanticCanvas {
  const designTranslations = raw.designTranslations ?? {};
  const slotMappings = raw.slotMappings ?? { targetFields: [], targetSlots: [], targetAxes: [] };
  const narrativePolicy = raw.narrativePolicy ?? { mustPreserve: [], mustNotOverLiteralize: [], directionalDominant: [] };
  const questionImplications = raw.questionImplications ?? { likelyQuestionKinds: [], likelyInformationGains: [] };

  return {
    source: "llm",
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.78,
    rawCues: asStringArray(raw.rawCues),
    conceptualAxes: asStringArray(raw.conceptualAxes),
    metaphoricDomains: asStringArray(raw.metaphoricDomains),
    designTranslations: {
      colorIdentity: asStringArray(designTranslations.colorIdentity),
      colorRestraint: asStringArray(designTranslations.colorRestraint),
      motifLogic: asStringArray(designTranslations.motifLogic),
      arrangementLogic: asStringArray(designTranslations.arrangementLogic),
      impressionTone: asStringArray(designTranslations.impressionTone),
      materialSuggestion: asStringArray(designTranslations.materialSuggestion),
      presenceIntensity: asStringArray(designTranslations.presenceIntensity),
    },
    slotMappings: {
      targetFields: asStringArray(slotMappings.targetFields).filter((item): item is HighValueField => ALLOWED_FIELDS.has(item)),
      targetSlots: asStringArray(slotMappings.targetSlots).filter((item): item is FuliSemanticCanvas["slotMappings"]["targetSlots"][number] => ALLOWED_SLOTS.has(item)),
      targetAxes: asStringArray(slotMappings.targetAxes).filter((item) => ALLOWED_AXES.has(item)),
    },
    narrativePolicy: {
      mustPreserve: asStringArray(narrativePolicy.mustPreserve),
      mustNotOverLiteralize: asStringArray(narrativePolicy.mustNotOverLiteralize),
      directionalDominant: asStringArray(narrativePolicy.directionalDominant),
    },
    questionImplications: {
      likelyQuestionKinds: asStringArray(questionImplications.likelyQuestionKinds),
      likelyInformationGains: asStringArray(questionImplications.likelyInformationGains),
    },
  };
}

function buildErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `Ollama 请求超时（>${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s）。`;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "无法获取 semantic canvas。";
}

export async function requestDirectOllamaSemanticCanvas(input: {
  text: string;
  hitFields: HighValueField[];
  semanticUnits: SemanticUnit[];
}): Promise<{
  available: boolean;
  degraded: boolean;
  provider: "ollama-direct";
  errorMessage?: string;
  canvas?: FuliSemanticCanvas;
}> {
  try {
    const generatePayload = (await fetchJson("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(input.text, input.hitFields, input.semanticUnits),
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
        },
      }),
    })) as RawOllamaGenerateResponse;

    const rawText = typeof generatePayload.response === "string" ? generatePayload.response : "{}";
    const parsed = JSON.parse(rawText) as RawCanvasResponse;

    return {
      available: true,
      degraded: false,
      provider: "ollama-direct",
      canvas: normalizeCanvas(parsed),
    };
  } catch (error) {
    return {
      available: false,
      degraded: true,
      provider: "ollama-direct",
      errorMessage: buildErrorMessage(error),
    };
  }
}
