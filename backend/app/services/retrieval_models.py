from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas import ImageSlotValuesResponse


class SearchMatchResponse(BaseModel):
    id: str
    title: str
    image_url: str
    source_url: str
    filename: str
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    score: float
    clip_score: float
    rerank_score: float
    feature_summary: dict[str, float]
    slot_values: ImageSlotValuesResponse


class SearchResponse(BaseModel):
    total: int
    items: List[SearchMatchResponse]


class IndexBuildResponse(BaseModel):
    indexed: int
    dimension: int
