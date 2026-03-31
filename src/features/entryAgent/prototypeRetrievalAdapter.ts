import { fetchPrototypeRetrieval, type PrototypeRetrievalHit } from "@/lib/api";

export interface PrototypeRetrievalProvider {
  search(input: { text: string; topK?: number }): Promise<PrototypeRetrievalHit[]>;
}

export const backendPrototypeRetrievalProvider: PrototypeRetrievalProvider = {
  async search({ text, topK = 5 }) {
    try {
      return await fetchPrototypeRetrieval(text, topK);
    } catch {
      return [];
    }
  },
};
