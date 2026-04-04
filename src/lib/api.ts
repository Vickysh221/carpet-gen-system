import type {
  CandidateDesign,
  ExplorationSession,
  ImageSlotValues,
  InternalAxis,
  ModelConfig,
  PromptTrace,
  SlotState,
  SlotKey,
} from "@/types/domain";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

type ApiInternalAxis = {
  key: string;
  label: string;
  value: number;
  range: [number, number];
  exploration: "wide" | "narrow" | "late-lock";
  semantic_anchors: string[];
};

type ApiSlotState = {
  key: SlotKey;
  label: string;
  role: string;
  prompt_rule: string;
  recommended_status: "open" | "locked";
  confidence: number;
  status: "open" | "locked";
  axes: ApiInternalAxis[];
};

type ApiCandidate = {
  id: string;
  title: string;
  rationale: string;
  prompt_excerpt: string;
  delta_summary: string;
  palette: [string, string, string];
  pattern: CandidateDesign["pattern"];
};

type ApiPromptTrace = {
  impression: string[];
  motif: string[];
  arrangement: string[];
  scale: string[];
  color_palette: string[];
  style: string[];
  shape: string[];
};

type ApiExplorationSession = {
  session_id: string;
  round: number;
  phase: "initial" | "continue";
  locked_slots: SlotKey[];
  prompt: string;
  negative_prompt: string;
  strategy: string;
  slot_states: ApiSlotState[];
  prompt_trace: ApiPromptTrace;
  candidates: ApiCandidate[];
};

type ApiComposePrompt = {
  session_id: string;
  prompt: string;
  negative_prompt: string;
  trace: ApiPromptTrace;
};

type ApiImageSlotValues = ImageSlotValues;

type ApiReferenceItem = {
  id: string;
  title: string;
  image_url: string;
  source_url: string;
  filename: string;
  category?: string | null;
  tags: string[];
};

type ApiReferenceList = {
  total: number;
  items: ApiReferenceItem[];
};

type ApiSearchItem = ApiReferenceItem & {
  score: number;
  clip_score: number;
  rerank_score: number;
  feature_summary: Record<string, number>;
  slot_values: ApiImageSlotValues;
};

type ApiSearchResponse = {
  total: number;
  items: ApiSearchItem[];
};

type ApiPreferenceProfileItem = {
  id: string;
  title: string;
  image_url: string;
  source_url: string;
  liked_count: number;
  disliked_count: number;
  net_score: number;
  locked: boolean;
};

type ApiPreferenceProfile = {
  client_id: string;
  liked_ids: string[];
  disliked_ids: string[];
  locked_candidate_ids: string[];
  items: ApiPreferenceProfileItem[];
};

export type RetrievedReference = {
  id: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  filename: string;
  category?: string | null;
  tags: string[];
  score?: number;
  clipScore?: number;
  rerankScore?: number;
  featureSummary?: Record<string, number>;
  slotValues?: ImageSlotValues;
};

export type PreferenceProfile = {
  clientId: string;
  likedIds: string[];
  dislikedIds: string[];
  items: Array<{
    id: string;
    title: string;
    imageUrl: string;
    sourceUrl: string;
    likedCount: number;
    dislikedCount: number;
    netScore: number;
    locked: boolean;
  }>;
  lockedCandidateIds: string[];
};

type ApiPrototypeRetrievalItem = {
  entry_id: string;
  prototype_id: string;
  label: string;
  route_type: string;
  field: string;
  reading_ids: string[];
  similarity_score: number;
  explain_text: string;
};

type ApiPrototypeRetrievalResponse = {
  total: number;
  items: ApiPrototypeRetrievalItem[];
};

export type PrototypeRetrievalHit = {
  entryId: string;
  prototypeId: string;
  label: string;
  routeType: string;
  field: string;
  readingIds: string[];
  similarityScore: number;
  explainText: string;
};

type ApiSemanticRetrievalResponse = {
  total: number;
  results: SemanticRetrievalMatchResult[];
};

export type SemanticRetrievalCandidate = { id: string; text: string; source: string };
export type SemanticRetrievalMatchResult = {
  id: string;
  text: string;
  score: number;
  source: "poeticMappings" | "openingOptions" | "explicitMotifs" | "comparisonLibrary";
};

type ApiLlmFallbackCandidate = {
  candidate_prototypes: string[];
  candidate_fields: string[];
  candidate_axis_hints: Record<string, Record<string, number>>;
  ambiguity_notes: string[];
  needs_follow_up: boolean;
};

type ApiLlmFallbackResponse = {
  available: boolean;
  degraded: boolean;
  trigger_reasons: string[];
  items: ApiLlmFallbackCandidate[];
};

export type LlmFallbackCandidate = {
  candidatePrototypes: string[];
  candidateFields: string[];
  candidateAxisHints: Record<string, Record<string, number>>;
  ambiguityNotes: string[];
  needsFollowUp: boolean;
};

export type LlmFallbackResponse = {
  available: boolean;
  degraded: boolean;
  triggerReasons: string[];
  items: LlmFallbackCandidate[];
  provider?: "ollama-direct" | "backend";
  errorMessage?: string;
};

function mapAxis(axis: ApiInternalAxis): InternalAxis {
  return {
    key: axis.key,
    label: axis.label,
    value: axis.value,
    range: axis.range,
    exploration: axis.exploration,
    semanticAnchors: axis.semantic_anchors,
  };
}

function mapSlotState(slot: ApiSlotState): SlotState {
  return {
    key: slot.key,
    label: slot.label,
    role: slot.role,
    promptRule: slot.prompt_rule,
    recommendedStatus: slot.recommended_status,
    confidence: slot.confidence,
    status: slot.status,
    axes: slot.axes.map(mapAxis),
  };
}

function mapCandidate(candidate: ApiCandidate): CandidateDesign {
  return {
    id: candidate.id,
    title: candidate.title,
    rationale: candidate.rationale,
    promptExcerpt: candidate.prompt_excerpt,
    deltaSummary: candidate.delta_summary,
    palette: candidate.palette,
    pattern: candidate.pattern,
  };
}

function mapPromptTrace(trace: ApiPromptTrace): PromptTrace {
  return {
    impression: trace.impression,
    motif: trace.motif,
    arrangement: trace.arrangement,
    scale: trace.scale,
    colorPalette: trace.color_palette,
    style: trace.style,
    shape: trace.shape,
  };
}

function resolveImageUrl(path: string) {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_ORIGIN}${path}`;
}

function mapReference(item: ApiReferenceItem): RetrievedReference {
  return {
    id: item.id,
    title: item.title,
    imageUrl: resolveImageUrl(item.image_url),
    sourceUrl: item.source_url,
    filename: item.filename,
    category: item.category,
    tags: item.tags,
  };
}

function mapSearchItem(item: ApiSearchItem): RetrievedReference {
  return {
    ...mapReference(item),
    score: item.score,
    clipScore: item.clip_score,
    rerankScore: item.rerank_score,
    featureSummary: item.feature_summary,
    slotValues: item.slot_values,
  };
}

function mapSession(session: ApiExplorationSession): ExplorationSession {
  return {
    sessionId: session.session_id,
    round: session.round,
    phase: session.phase,
    lockedSlots: session.locked_slots,
    prompt: session.prompt,
    negativePrompt: session.negative_prompt,
    strategy: session.strategy,
    slotStates: session.slot_states.map(mapSlotState),
    promptTrace: mapPromptTrace(session.prompt_trace),
    candidates: session.candidates.map(mapCandidate),
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchModelConfig() {
  return apiRequest<ModelConfig>("/model-config");
}

export async function fetchPrototypeRetrieval(text: string, topK = 5): Promise<PrototypeRetrievalHit[]> {
  const response = await apiRequest<ApiPrototypeRetrievalResponse>("/prototype-retrieval/search", {
    method: "POST",
    body: JSON.stringify({
      text,
      top_k: topK,
    }),
  });

  return response.items.map((item) => ({
    entryId: item.entry_id,
    prototypeId: item.prototype_id,
    label: item.label,
    routeType: item.route_type,
    field: item.field,
    readingIds: item.reading_ids,
    similarityScore: item.similarity_score,
    explainText: item.explain_text,
  }));
}

export async function fetchSemanticRetrieval(
  query: string,
  candidates: SemanticRetrievalCandidate[],
  topK = 5,
): Promise<SemanticRetrievalMatchResult[]> {
  const response = await apiRequest<ApiSemanticRetrievalResponse>("/semantic-retrieval/search", {
    method: "POST",
    body: JSON.stringify({ query, candidates, top_k: topK }),
  });
  return response.results;
}

export async function fetchLlmFallbackCandidates(payload: {
  text: string;
  hitFields: string[];
  prototypeLabels: string[];
  triggerReasons: string[];
  topK?: number;
}): Promise<LlmFallbackResponse> {
  const response = await apiRequest<ApiLlmFallbackResponse>("/llm-fallback/candidates", {
    method: "POST",
    body: JSON.stringify({
      text: payload.text,
      hit_fields: payload.hitFields,
      prototype_labels: payload.prototypeLabels,
      trigger_reasons: payload.triggerReasons,
      top_k: payload.topK ?? 2,
    }),
  });

  return {
    available: response.available,
    degraded: response.degraded,
    triggerReasons: response.trigger_reasons,
    provider: "backend",
    items: response.items.map((item) => ({
      candidatePrototypes: item.candidate_prototypes,
      candidateFields: item.candidate_fields,
      candidateAxisHints: item.candidate_axis_hints,
      ambiguityNotes: item.ambiguity_notes,
      needsFollowUp: item.needs_follow_up,
    })),
  };
}

export async function bootstrapSession(referenceImageName: string, clientId?: string) {
  const session = await apiRequest<ApiExplorationSession>("/preference/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      reference_image_name: referenceImageName,
      client_id: clientId,
      style_constraints: [],
    }),
  });

  return mapSession(session);
}

export async function submitFeedback(payload: {
  sessionId: string;
  clientId?: string;
  likedIds: string[];
  dislikedIds: string[];
  continueGenerate?: boolean;
}) {
  const session = await apiRequest<ApiExplorationSession>("/preference/feedback", {
    method: "POST",
    body: JSON.stringify({
      session_id: payload.sessionId,
      client_id: payload.clientId,
      liked_ids: payload.likedIds,
      disliked_ids: payload.dislikedIds,
      continue_generate: payload.continueGenerate ?? true,
    }),
  });

  return mapSession(session);
}

export async function composePrompt(sessionId: string) {
  const response = await apiRequest<ApiComposePrompt>("/prompt/compose", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      slot_overrides: {},
    }),
  });

  return {
    sessionId: response.session_id,
    prompt: response.prompt,
    negativePrompt: response.negative_prompt,
    trace: mapPromptTrace(response.trace),
  };
}

export async function fetchReferenceLibrary(limit = 50) {
  const response = await apiRequest<ApiReferenceList>(`/reference-library/fuli-products?limit=${limit}`);
  return response.items.map(mapReference);
}

export async function buildReferenceIndex() {
  return apiRequest<{ indexed: number; dimension: number }>("/reference-library/fuli-products/index", {
    method: "POST",
  });
}

export async function searchReferenceLibrary(
  file: File,
  topK = 8,
  preference?: { clientId?: string; sessionId?: string; likedIds?: string[]; dislikedIds?: string[] }
) {
  const formData = new FormData();
  formData.append("image", file);
  if (preference?.clientId) formData.append("client_id", preference.clientId);
  if (preference?.sessionId) formData.append("session_id", preference.sessionId);
  for (const likedId of preference?.likedIds ?? []) {
    formData.append("liked_ids", likedId);
  }
  for (const dislikedId of preference?.dislikedIds ?? []) {
    formData.append("disliked_ids", dislikedId);
  }

  const response = await fetch(`${API_BASE}/reference-library/fuli-products/search?top_k=${topK}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ApiSearchResponse;
  return payload.items.map(mapSearchItem);
}

export async function fetchPreferenceProfile(params: { clientId?: string; sessionId?: string }) {
  const query = new URLSearchParams();
  if (params.clientId) query.set("client_id", params.clientId);
  if (params.sessionId) query.set("session_id", params.sessionId);

  const payload = await apiRequest<ApiPreferenceProfile>(`/preference/profile?${query.toString()}`);
  return {
    clientId: payload.client_id,
    likedIds: payload.liked_ids,
    dislikedIds: payload.disliked_ids,
    items: payload.items.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: resolveImageUrl(item.image_url),
      sourceUrl: item.source_url,
      likedCount: item.liked_count,
      dislikedCount: item.disliked_count,
      netScore: item.net_score,
      locked: item.locked,
    })),
    lockedCandidateIds: payload.locked_candidate_ids,
  } satisfies PreferenceProfile;
}

export async function clearPreferenceProfile(params: { clientId?: string; sessionId?: string }) {
  return apiRequest<{ ok: boolean; client_id: string }>("/preference/profile/clear", {
    method: "POST",
    body: JSON.stringify({
      client_id: params.clientId,
      session_id: params.sessionId,
    }),
  });
}

export async function undoLatestPreferenceEvent(params: { clientId?: string; sessionId?: string }) {
  return apiRequest<{
    ok: boolean;
    client_id?: string;
    undone_event_id?: string;
    candidate_id?: string;
    feedback_type?: string;
  }>("/preference/profile/undo", {
    method: "POST",
    body: JSON.stringify({
      client_id: params.clientId,
      session_id: params.sessionId,
    }),
  });
}

export async function lockPreferenceAnchor(params: { clientId?: string; sessionId?: string; candidateId: string }) {
  return apiRequest<{ ok: boolean; client_id: string; candidate_id: string }>("/preference/profile/lock", {
    method: "POST",
    body: JSON.stringify({
      client_id: params.clientId,
      session_id: params.sessionId,
      candidate_id: params.candidateId,
    }),
  });
}

export async function composeFromReference(referenceId: string) {
  const response = await apiRequest<{
    reference_id: string;
    title: string;
    image_url: string;
    slot_values: ImageSlotValues;
    prompt: string;
    negative_prompt: string;
    trace: ApiPromptTrace;
  }>(`/prompt/compose-from-reference/${encodeURIComponent(referenceId)}`);

  return {
    referenceId: response.reference_id,
    title: response.title,
    imageUrl: resolveImageUrl(response.image_url),
    slotValues: response.slot_values,
    prompt: response.prompt,
    negativePrompt: response.negative_prompt,
    trace: mapPromptTrace(response.trace),
  };
}

export async function unlockPreferenceAnchor(params: { clientId?: string; sessionId?: string; candidateId: string }) {
  return apiRequest<{ ok: boolean; client_id: string; candidate_id: string }>("/preference/profile/unlock", {
    method: "POST",
    body: JSON.stringify({
      client_id: params.clientId,
      session_id: params.sessionId,
      candidate_id: params.candidateId,
    }),
  });
}
