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

export async function bootstrapSession(referenceImageName: string) {
  const session = await apiRequest<ApiExplorationSession>("/preference/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      reference_image_name: referenceImageName,
      style_constraints: [],
    }),
  });

  return mapSession(session);
}

export async function submitFeedback(payload: {
  sessionId: string;
  likedIds: string[];
  dislikedIds: string[];
  continueGenerate?: boolean;
}) {
  const session = await apiRequest<ApiExplorationSession>("/preference/feedback", {
    method: "POST",
    body: JSON.stringify({
      session_id: payload.sessionId,
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

export async function searchReferenceLibrary(file: File, topK = 8) {
  const formData = new FormData();
  formData.append("image", file);

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
