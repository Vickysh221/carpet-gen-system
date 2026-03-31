import { fetchLlmFallbackCandidates, type LlmFallbackResponse } from "@/lib/api";
import { requestDirectOllamaFallback } from "./localOllamaFallback";

export interface LlmFallbackProvider {
  generate(input: {
    text: string;
    hitFields: string[];
    prototypeLabels: string[];
    triggerReasons: string[];
    topK?: number;
  }): Promise<LlmFallbackResponse>;
}

const LLM_FALLBACK_PROVIDER = import.meta.env.VITE_LLM_FALLBACK_PROVIDER ?? "ollama-direct";

function describeBackendError(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `Backend LLM fallback failed: ${error.message}`;
  }
  return "Backend LLM fallback failed for an unknown reason.";
}

export const directOllamaFallbackProvider: LlmFallbackProvider = {
  async generate({ text, hitFields, prototypeLabels, triggerReasons, topK = 2 }) {
    return requestDirectOllamaFallback({
      text,
      hitFields,
      prototypeLabels,
      triggerReasons,
      topK,
    });
  },
};

export const backendLlmFallbackProvider: LlmFallbackProvider = {
  async generate({ text, hitFields, prototypeLabels, triggerReasons, topK = 2 }) {
    try {
      return await fetchLlmFallbackCandidates({
        text,
        hitFields,
        prototypeLabels,
        triggerReasons,
        topK,
      });
    } catch (error) {
      console.warn("LLM fallback unavailable, degrading to rules-only analysis.", error);
      return {
        available: false,
        degraded: true,
        provider: "backend",
        triggerReasons,
        errorMessage: describeBackendError(error),
        items: [],
      };
    }
  },
};

export const activeLlmFallbackProvider: LlmFallbackProvider =
  LLM_FALLBACK_PROVIDER === "backend" ? backendLlmFallbackProvider : directOllamaFallbackProvider;
