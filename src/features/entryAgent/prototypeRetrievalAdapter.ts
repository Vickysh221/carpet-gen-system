import { fetchPrototypeRetrieval, type PrototypeRetrievalHit } from "@/lib/api";

export interface PrototypeRetrievalProvider {
  search(input: { text: string; topK?: number }): Promise<PrototypeRetrievalHit[]>;
}

const PROTOTYPE_RETRIEVAL_ENABLED = import.meta.env.VITE_ENABLE_PROTOTYPE_RETRIEVAL === "true";

export const backendPrototypeRetrievalProvider: PrototypeRetrievalProvider = {
  async search({ text, topK = 5 }) {
    // Default to alias/direct + Ollama-only intent analysis. The Python retrieval
    // stack is heavier and can stall or crash while loading local embedding models.
    if (!PROTOTYPE_RETRIEVAL_ENABLED) {
      return [];
    }

    try {
      return await fetchPrototypeRetrieval(text, topK);
    } catch (error) {
      console.warn("Prototype retrieval unavailable, falling back to alias-only matching.", error);
      return [];
    }
  },
};
