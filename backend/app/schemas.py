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
    room_type: Optional[str] = None
    style_constraints: List[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    session_id: str
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
