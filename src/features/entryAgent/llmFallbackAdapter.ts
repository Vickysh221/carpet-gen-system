import { fetchLlmFallbackCandidates, type LlmFallbackResponse } from "@/lib/api";

export interface LlmFallbackProvider {
  generate(input: {
    text: string;
    hitFields: string[];
    prototypeLabels: string[];
    triggerReasons: string[];
    topK?: number;
  }): Promise<LlmFallbackResponse>;
}

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
    } catch {
      return {
        available: false,
        degraded: true,
        triggerReasons,
        items: [],
      };
    }
  },
};
