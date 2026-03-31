from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


SlotKey = Literal[
    "colorPalette",
    "motif",
    "style",
    "arrangement",
    "impression",
    "shape",
    "scale",
]


class ModelChoice(BaseModel):
    label: str
    selected: str
    reason: str
    alternatives: List[str]


class ModelConfigResponse(BaseModel):
    ingestion: ModelChoice
    preference: ModelChoice
    semantic_mapping: ModelChoice
    prompt_assembly: ModelChoice
    generation: ModelChoice
    storage: ModelChoice


class InternalAxis(BaseModel):
    key: str
    label: str
    value: float = Field(ge=0.0, le=1.0)
    range: List[float]
    exploration: Literal["wide", "narrow", "late-lock"]
    semantic_anchors: List[str]


class SlotState(BaseModel):
    key: SlotKey
    label: str
    role: str
    prompt_rule: str
    recommended_status: Literal["open", "locked"]
    confidence: float = Field(ge=0.0, le=1.0)
    status: Literal["open", "locked"]
    axes: List[InternalAxis]


class CandidateCard(BaseModel):
    id: str
    title: str
    rationale: str
    prompt_excerpt: str
    delta_summary: str
    palette: List[str]
    pattern: Literal["radial", "grid", "organic", "stripes", "scatter"]


class PromptTrace(BaseModel):
    impression: List[str]
    motif: List[str]
    arrangement: List[str]
    scale: List[str]
    color_palette: List[str]
    style: List[str]
    shape: List[str]


class ExplorationSessionResponse(BaseModel):
    session_id: str
    round: int
    phase: Literal["initial", "continue"]
    strategy: str
    prompt: str
    negative_prompt: str
    locked_slots: List[SlotKey]
    slot_states: List[SlotState]
    candidates: List[CandidateCard]
    prompt_trace: PromptTrace


class BootstrapRequest(BaseModel):
    reference_image_name: str
    client_id: Optional[str] = None
    room_type: Optional[str] = None
    style_constraints: List[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    session_id: str
    client_id: Optional[str] = None
    liked_ids: List[str] = Field(default_factory=list)
    disliked_ids: List[str] = Field(default_factory=list)
    continue_generate: bool = True


class ComposePromptRequest(BaseModel):
    session_id: str
    slot_overrides: Dict[SlotKey, Dict[str, float]] = Field(default_factory=dict)


class ComposePromptResponse(BaseModel):
    session_id: str
    prompt: str
    negative_prompt: str
    trace: PromptTrace


class ProductReference(BaseModel):
    id: str
    title: str
    image_url: str
    source_url: str
    filename: str
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ImageSlotValuesResponse(BaseModel):
    colorPalette: Dict[str, float]
    motif: Dict[str, float]
    style: Dict[str, float]
    arrangement: Dict[str, float]
    impression: Dict[str, float]
    shape: Dict[str, float]
    scale: Dict[str, float]


class ProductReferenceListResponse(BaseModel):
    total: int
    items: List[ProductReference]


class PreferenceProfileItem(BaseModel):
    id: str
    title: str
    image_url: str
    source_url: str
    liked_count: int
    disliked_count: int
    net_score: int
    locked: bool = False


class PreferenceProfileResponse(BaseModel):
    client_id: str
    liked_ids: List[str]
    disliked_ids: List[str]
    locked_candidate_ids: List[str]
    items: List[PreferenceProfileItem]


class PreferenceProfileActionRequest(BaseModel):
    client_id: Optional[str] = None
    session_id: Optional[str] = None


class PreferenceUndoResponse(BaseModel):
    ok: bool
    client_id: Optional[str] = None
    undone_event_id: Optional[str] = None
    candidate_id: Optional[str] = None
    feedback_type: Optional[str] = None


class PreferenceAnchorLockRequest(BaseModel):
    client_id: Optional[str] = None
    session_id: Optional[str] = None
    candidate_id: str


class ComposeFromReferenceResponse(BaseModel):
    reference_id: str
    title: str
    image_url: str
    slot_values: ImageSlotValuesResponse
    prompt: str
    negative_prompt: str
    trace: PromptTrace


class PrototypeRetrievalRequest(BaseModel):
    text: str
    top_k: int = Field(default=5, ge=1, le=10)


class PrototypeRetrievalEntryResponse(BaseModel):
    entry_id: str
    prototype_id: str
    label: str
    route_type: str
    field: str
    reading_ids: List[str]
    similarity_score: float
    explain_text: str


class PrototypeRetrievalResponse(BaseModel):
    total: int
    items: List[PrototypeRetrievalEntryResponse]


EntryAgentField = Literal[
    "spaceContext",
    "overallImpression",
    "colorMood",
    "patternTendency",
    "arrangementTendency",
]


EntryAgentSlot = Literal["color", "motif", "arrangement", "impression"]


class LlmFallbackCandidatePayload(BaseModel):
    candidate_prototypes: List[str] = Field(default_factory=list)
    candidate_fields: List[EntryAgentField] = Field(default_factory=list)
    candidate_axis_hints: Dict[EntryAgentSlot, Dict[str, float]] = Field(default_factory=dict)
    ambiguity_notes: List[str] = Field(default_factory=list)
    needs_follow_up: bool = False


class LlmFallbackRequest(BaseModel):
    text: str
    hit_fields: List[EntryAgentField] = Field(default_factory=list)
    prototype_labels: List[str] = Field(default_factory=list)
    trigger_reasons: List[str] = Field(default_factory=list)
    top_k: int = Field(default=2, ge=1, le=5)


class LlmFallbackResponse(BaseModel):
    available: bool
    degraded: bool
    trigger_reasons: List[str] = Field(default_factory=list)
    items: List[LlmFallbackCandidatePayload] = Field(default_factory=list)
