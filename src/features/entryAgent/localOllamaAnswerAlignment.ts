import type { AnswerAlignment, EntryAgentResult, QuestionTrace } from "./types";

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL ?? "/ollama";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:3b";
const OLLAMA_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS ?? "20000");

type RawOllamaGenerateResponse = {
  response?: string;
};

type RawAlignmentResponse = Partial<AnswerAlignment>;

function buildPrompt(input: {
  previousQuestion: QuestionTrace;
  hitFields: EntryAgentResult["hitFields"];
  semanticCanvas: EntryAgentResult["semanticCanvas"];
}) {
  return `
你是 Fuli 多轮对话里的 answer alignment 判别器。
你的任务是判断：用户这一轮回复，是否在回答上一轮问题，还是部分回答，还是明显切到了新的语义线程。

上一轮问题：
- prompt: ${input.previousQuestion.prompt}
- targetField: ${input.previousQuestion.targetField ?? "none"}
- targetSlot: ${input.previousQuestion.targetSlot ?? "none"}
- targetAxes: ${input.previousQuestion.targetAxes.join(", ") || "none"}

当前轮命中字段：${input.hitFields.join(", ") || "none"}
当前轮 semantic canvas raw cues：${input.semanticCanvas?.rawCues.join(", ") || "none"}
当前轮 semantic canvas conceptual axes：${input.semanticCanvas?.conceptualAxes.join(", ") || "none"}
当前轮 mustPreserve：${input.semanticCanvas?.narrativePolicy.mustPreserve.join(", ") || "none"}

输出严格 JSON：
{
  "status": "answered" | "partial" | "shifted",
  "introducedFields": ["colorMood"],
  "note": "...",
  "confidence": 0.78
}

判别原则：
- 如果当前轮主要仍围绕上一轮 targetField / targetAxes 展开，输出 answered。
- 如果当前轮既回应了上一轮，又明显带入新线程，输出 partial。
- 如果当前轮没有顺着上一轮问题，而是明显切到新的意象或字段，输出 shifted。
- 不要输出 initial。
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

function normalizeAlignment(raw: RawAlignmentResponse): AnswerAlignment | undefined {
  if (raw.status !== "answered" && raw.status !== "partial" && raw.status !== "shifted") {
    return undefined;
  }

  const introducedFields = Array.isArray(raw.introducedFields)
    ? raw.introducedFields.filter((field): field is NonNullable<AnswerAlignment["introducedFields"]>[number] =>
        field === "spaceContext" ||
        field === "overallImpression" ||
        field === "colorMood" ||
        field === "patternTendency" ||
        field === "arrangementTendency",
      )
    : [];

  return {
    status: raw.status,
    introducedFields,
    note: typeof raw.note === "string" && raw.note.trim().length > 0 ? raw.note : "LLM guard 给出了一次多轮回答对齐判断。",
    source: "llm-guard",
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.72,
  };
}

function buildErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `Ollama 请求超时（>${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s）。`;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "无法获取 answer alignment。";
}

export async function requestDirectOllamaAnswerAlignment(input: {
  previousQuestion: QuestionTrace;
  hitFields: EntryAgentResult["hitFields"];
  semanticCanvas: EntryAgentResult["semanticCanvas"];
}): Promise<{
  available: boolean;
  degraded: boolean;
  provider: "ollama-direct";
  errorMessage?: string;
  alignment?: AnswerAlignment;
}> {
  try {
    const generatePayload = (await fetchJson("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(input),
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
        },
      }),
    })) as RawOllamaGenerateResponse;

    const rawText = typeof generatePayload.response === "string" ? generatePayload.response : "{}";
    const parsed = JSON.parse(rawText) as RawAlignmentResponse;

    return {
      available: true,
      degraded: false,
      provider: "ollama-direct",
      alignment: normalizeAlignment(parsed),
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
