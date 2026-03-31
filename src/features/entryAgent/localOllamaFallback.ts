import type { LlmFallbackResponse } from "@/lib/api";

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL ?? "/ollama";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:3b";
const OLLAMA_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS ?? "20000");

const ALLOWED_FIELDS = new Set([
  "spaceContext",
  "overallImpression",
  "colorMood",
  "patternTendency",
  "arrangementTendency",
]);

const ALLOWED_AXES: Record<string, Set<string>> = {
  color: new Set(["warmth", "saturation"]),
  motif: new Set(["complexity", "geometry", "organic"]),
  arrangement: new Set(["order", "spacing"]),
  impression: new Set(["calm", "energy", "softness"]),
};

type RawOllamaGenerateResponse = {
  response?: string;
};

function buildPrompt(text: string, hitFields: string[], prototypeLabels: string[], triggerReasons: string[], topK: number) {
  return `
你是地毯设计语义映射系统的 fallback 候选生成器。
当主规则/检索流程覆盖率较弱时，你的职责是提出弱候选解释。
不要输出最终合并结果，不要输出最终状态 patch。只返回严格 JSON，不要附加任何说明文字。

允许的 field 值：${JSON.stringify([...ALLOWED_FIELDS])}
允许的 slot 和 axis：
- color: warmth（暖度）, saturation（饱和度）
- motif: complexity（复杂度）, geometry（几何感）, organic（自然感）
- arrangement: order（秩序感）, spacing（间距感）
- impression: calm（安静感）, energy（活力感）, softness（柔和感）

用户输入：${text}
已命中字段：${hitFields.join(", ")}
已匹配的 prototype 标签：${prototypeLabels.join(", ")}
触发 fallback 的原因：${triggerReasons.join(" / ")}

返回如下 JSON 格式（不要多余文字），例如：
{
  "items": [
    {
      "candidate_prototypes": ["安静日常感"],
      "candidate_fields": ["overallImpression"],
      "candidate_axis_hints": {
        "impression": {"calm": 0.76, "softness": 0.65}
      },
      "ambiguity_notes": ["偏安静方向，但色彩层面仍待确认"],
      "needs_follow_up": true
    }
  ]
}

要求：
- 最多返回 ${topK} 条候选。
- 宁可返回空 items，也不要瞎猜。
- axis 值必须是 [0, 1] 之间的浮点数。
- 只使用上方允许列表中的 slot/axis。
- candidate_prototypes 和 ambiguity_notes 必须用中文，不允许出现英文。
  `.trim();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeAxisHints(raw: unknown): Record<string, Record<string, number>> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const normalized: Record<string, Record<string, number>> = {};
  for (const [slot, axes] of Object.entries(raw as Record<string, unknown>)) {
    const allowedAxes = ALLOWED_AXES[slot];
    if (!allowedAxes || !axes || typeof axes !== "object") {
      continue;
    }

    const slotHints: Record<string, number> = {};
    for (const [axis, value] of Object.entries(axes as Record<string, unknown>)) {
      if (!allowedAxes.has(axis) || typeof value !== "number") {
        continue;
      }
      slotHints[axis] = clamp01(value);
    }

    if (Object.keys(slotHints).length > 0) {
      normalized[slot] = slotHints;
    }
  }

  return normalized;
}

function normalizeResponse(raw: unknown, triggerReasons: string[]): LlmFallbackResponse {
  const items = Array.isArray((raw as { items?: unknown[] })?.items) ? (raw as { items: unknown[] }).items : [];

  return {
    available: true,
    degraded: false,
    provider: "ollama-direct",
    triggerReasons,
    items: items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const candidateFields = Array.isArray(record.candidate_fields)
          ? record.candidate_fields.filter((field): field is string => typeof field === "string" && ALLOWED_FIELDS.has(field))
          : [];
        const candidatePrototypes = Array.isArray(record.candidate_prototypes)
          ? record.candidate_prototypes.filter((value): value is string => typeof value === "string")
          : [];
        const ambiguityNotes = Array.isArray(record.ambiguity_notes)
          ? record.ambiguity_notes.filter((value): value is string => typeof value === "string")
          : [];
        const candidateAxisHints = normalizeAxisHints(record.candidate_axis_hints);
        const needsFollowUp = Boolean(record.needs_follow_up);

        if (
          candidateFields.length === 0 &&
          candidatePrototypes.length === 0 &&
          ambiguityNotes.length === 0 &&
          Object.keys(candidateAxisHints).length === 0
        ) {
          return null;
        }

        return {
          candidatePrototypes,
          candidateFields,
          candidateAxisHints,
          ambiguityNotes,
          needsFollowUp,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
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

function buildErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `Ollama 请求超时（>${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s）。`;
  }

  if (error instanceof Error) {
    if (error.message.startsWith("HTTP ")) {
      return `Ollama 返回错误：${error.message}。`;
    }

    if (error.message.trim().length > 0) {
      return `无法连接到 Ollama（${OLLAMA_BASE_URL}）：${error.message}`;
    }
  }

  return `无法连接到 Ollama（${OLLAMA_BASE_URL}）。请确认服务已启动，并允许当前页面访问本地 11434 端口。`;
}

async function fetchInstalledModels() {
  const payload = await fetchJson("/api/tags", { method: "GET" });
  const models = Array.isArray((payload as { models?: unknown[] })?.models) ? (payload as { models: unknown[] }).models : [];

  return models
    .map((model) => {
      if (!model || typeof model !== "object") {
        return null;
      }
      const name = (model as { name?: unknown }).name;
      return typeof name === "string" ? name : null;
    })
    .filter((model): model is string => model !== null);
}

function resolveRequestModel(installedModels: string[]) {
  if (installedModels.length === 0) {
    return null;
  }
  if (installedModels.includes(OLLAMA_MODEL)) {
    return OLLAMA_MODEL;
  }
  return installedModels[0];
}

export async function requestDirectOllamaFallback(input: {
  text: string;
  hitFields: string[];
  prototypeLabels: string[];
  triggerReasons: string[];
  topK?: number;
}): Promise<LlmFallbackResponse> {
  const topK = input.topK ?? 2;

  try {
    const installedModels = await fetchInstalledModels();
    const requestModel = resolveRequestModel(installedModels);

    if (!requestModel) {
      return {
        available: false,
        degraded: true,
        provider: "ollama-direct",
        triggerReasons: input.triggerReasons,
        errorMessage: `Ollama 已连接，但没有可用模型。请先安装 ${OLLAMA_MODEL} 或任意本地模型。`,
        items: [],
      };
    }

    const generatePayload = (await fetchJson("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: requestModel,
        prompt: buildPrompt(input.text, input.hitFields, input.prototypeLabels, input.triggerReasons, topK),
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
        },
      }),
    })) as RawOllamaGenerateResponse;

    const rawText = typeof generatePayload.response === "string" ? generatePayload.response : "{}";
    const parsed = JSON.parse(rawText) as unknown;
    return normalizeResponse(parsed, input.triggerReasons);
  } catch (error) {
    return {
      available: false,
      degraded: true,
      provider: "ollama-direct",
      triggerReasons: input.triggerReasons,
      errorMessage: buildErrorMessage(error),
      items: [],
    };
  }
}
