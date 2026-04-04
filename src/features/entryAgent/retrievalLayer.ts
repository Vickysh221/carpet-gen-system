import { fetchSemanticRetrieval } from "@/lib/api";
import { buildComparisonRetrievalCandidates } from "./comparisonLibrary";
import { buildSemanticRetrievalCandidates } from "./semanticRetrieval";
import type { NormalizedInputEvent, RetrievalLayerResult, RetrievalTraceItem } from "./types";

function toTraceItems(items: Awaited<ReturnType<typeof fetchSemanticRetrieval>>): RetrievalTraceItem[] {
  return items.map((item) => ({
    id: item.id,
    source: item.source,
    score: item.score,
    text: item.text,
  }));
}

export async function retrieveSemanticContext(input: {
  event: NormalizedInputEvent;
  semanticTopK?: number;
  comparisonTopK?: number;
}): Promise<RetrievalLayerResult> {
  const semanticCandidates = buildSemanticRetrievalCandidates();
  const comparisonCandidates = buildComparisonRetrievalCandidates();
  const retrievalQuery = [...new Set([input.event.normalizedText, ...input.event.preservedPhrases].filter(Boolean))]
    .join(" | ");

  const [semanticResults, comparisonResults] = await Promise.allSettled([
    fetchSemanticRetrieval(retrievalQuery, semanticCandidates, input.semanticTopK ?? 5),
    fetchSemanticRetrieval(retrievalQuery, comparisonCandidates, input.comparisonTopK ?? 6),
  ]);

  const semanticTrace = semanticResults.status === "fulfilled" ? toTraceItems(semanticResults.value) : [];
  const comparisonTrace = comparisonResults.status === "fulfilled" ? toTraceItems(comparisonResults.value) : [];

  return {
    query: retrievalQuery,
    preservedPhrases: input.event.preservedPhrases,
    semanticCandidates: semanticTrace,
    comparisonCandidates: comparisonTrace,
    trace: [
      `normalized=${input.event.normalizedText}`,
      `preserved=${input.event.preservedPhrases.join(",") || "none"}`,
      `semantic=${semanticTrace.length > 0 ? semanticTrace.map((item) => item.id).join(",") : "none"}`,
      `comparison=${comparisonTrace.length > 0 ? comparisonTrace.map((item) => item.id).join(",") : "none"}`,
      `semantic-status=${semanticResults.status}`,
      `comparison-status=${comparisonResults.status}`,
    ],
  };
}
