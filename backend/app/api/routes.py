from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.core.model_config import RECOMMENDED_MODEL_CONFIG
from app.schemas import (
    BootstrapRequest,
    ComposePromptRequest,
    ComposePromptResponse,
    ExplorationSessionResponse,
    FeedbackRequest,
    ProductReferenceListResponse,
)
from app.services.retrieval_models import IndexBuildResponse, SearchMatchResponse, SearchResponse
from app.services.reference_library import load_fuli_products
from app.services.visual_search import ensure_search_index, search_similar_products
from app.services.mock_data import build_prompt_trace, build_session


router = APIRouter(prefix="/api/v1")


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/model-config")
def get_model_config():
    return RECOMMENDED_MODEL_CONFIG


@router.get("/reference-library/fuli-products", response_model=ProductReferenceListResponse)
def get_fuli_products(limit: int = Query(default=100, ge=1, le=1000)) -> ProductReferenceListResponse:
    try:
        items = load_fuli_products(limit=limit)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return ProductReferenceListResponse(total=len(items), items=items)


@router.post("/reference-library/fuli-products/index", response_model=IndexBuildResponse)
def build_fuli_product_index() -> IndexBuildResponse:
    try:
        result = ensure_search_index()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return IndexBuildResponse(**result)


@router.post("/reference-library/fuli-products/search", response_model=SearchResponse)
async def search_fuli_products(
    image: UploadFile = File(...),
    top_k: int = Query(default=8, ge=1, le=20),
) -> SearchResponse:
    try:
        image_bytes = await image.read()
        matches = search_similar_products(image_bytes=image_bytes, top_k=top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SearchResponse(
        total=len(matches),
        items=[SearchMatchResponse(**match.__dict__) for match in matches],
    )


@router.post("/preference/bootstrap", response_model=ExplorationSessionResponse)
def bootstrap_session(payload: BootstrapRequest) -> ExplorationSessionResponse:
    session = build_session(round_number=1, phase="initial")
    session.strategy = (
        f"参考图 {payload.reference_image_name} 已进入 embedding 检索。"
        "本轮使用 base anchor + 4 个单槽位探索图。"
    )
    return session


@router.post("/preference/feedback", response_model=ExplorationSessionResponse)
def update_feedback(payload: FeedbackRequest) -> ExplorationSessionResponse:
    next_round = 2 if payload.continue_generate else 1
    session = build_session(round_number=next_round, phase="continue")
    if payload.liked_ids:
        session.strategy = (
            f"已记录 liked anchors: {', '.join(payload.liked_ids)}。"
            "下一轮围绕这些 anchors 做局部微调，并保留 1 个探索样本。"
        )
    if payload.disliked_ids:
        session.strategy += f" 已避开 disliked zones: {', '.join(payload.disliked_ids)}。"
    return session


@router.post("/prompt/compose", response_model=ComposePromptResponse)
def compose_prompt(payload: ComposePromptRequest) -> ComposePromptResponse:
    prompt = (
        "A cozy and serene abstract textile pattern featuring organic, flowing forms, "
        "arranged in a balanced scattered composition with medium-scale motifs, using "
        "a warm, muted color palette, in a hand-crafted minimalist style with rounded, soft-edged shapes."
    )
    if payload.slot_overrides:
        prompt += " Slot overrides detected and ready for constrained regeneration."
    return ComposePromptResponse(
        session_id=payload.session_id,
        prompt=prompt,
        negative_prompt="photorealistic, figurative objects, text, logo, extreme contrast, perspective scene",
        trace=build_prompt_trace(),
    )
