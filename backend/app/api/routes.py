from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.core.model_config import RECOMMENDED_MODEL_CONFIG
from app.schemas import (
    BootstrapRequest,
    ComposePromptRequest,
    ComposePromptResponse,
    ExplorationSessionResponse,
    FeedbackRequest,
    PreferenceAnchorLockRequest,
    PreferenceProfileActionRequest,
    PreferenceProfileResponse,
    PreferenceUndoResponse,
    ProductReferenceListResponse,
)
from app.services.retrieval_models import IndexBuildResponse, SearchMatchResponse, SearchResponse
from app.services.preference_store import (
    clear_preference_profile,
    create_session,
    load_preference_profile,
    load_preference_profile_items,
    load_locked_candidate_ids,
    remove_anchor_lock,
    record_feedback,
    resolve_client_id,
    set_anchor_lock,
    undo_latest_feedback,
)
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
    client_id: str | None = Form(default=None),
    session_id: str | None = Form(default=None),
    liked_ids: list[str] = Form(default=[]),
    disliked_ids: list[str] = Form(default=[]),
    top_k: int = Query(default=8, ge=1, le=20),
) -> SearchResponse:
    try:
        image_bytes = await image.read()
        stored_profile = load_preference_profile(client_id=client_id, session_id=session_id)
        merged_liked_ids = list(dict.fromkeys([*stored_profile.liked_ids, *liked_ids]))
        merged_disliked_ids = list(dict.fromkeys([*stored_profile.disliked_ids, *disliked_ids]))
        locked_candidate_ids = stored_profile.locked_candidate_ids
        matches = search_similar_products(
            image_bytes=image_bytes,
            top_k=top_k,
            liked_ids=merged_liked_ids,
            disliked_ids=merged_disliked_ids,
            locked_candidate_ids=locked_candidate_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SearchResponse(
        total=len(matches),
        items=[SearchMatchResponse(**match.__dict__) for match in matches],
    )


@router.get("/preference/profile", response_model=PreferenceProfileResponse)
def get_preference_profile(
    client_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
) -> PreferenceProfileResponse:
    profile = load_preference_profile(client_id=client_id, session_id=session_id)
    resolved_client_id, items = load_preference_profile_items(client_id=client_id, session_id=session_id)
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")

    return PreferenceProfileResponse(
        client_id=resolved_client_id,
        liked_ids=profile.liked_ids,
        disliked_ids=profile.disliked_ids,
        locked_candidate_ids=profile.locked_candidate_ids,
        items=items,
    )


@router.post("/preference/profile/clear")
def clear_profile(payload: PreferenceProfileActionRequest) -> dict[str, str | bool]:
    resolved_client_id = clear_preference_profile(client_id=payload.client_id, session_id=payload.session_id)
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")
    return {"ok": True, "client_id": resolved_client_id}


@router.post("/preference/profile/undo", response_model=PreferenceUndoResponse)
def undo_profile_event(payload: PreferenceProfileActionRequest) -> PreferenceUndoResponse:
    resolved_client_id = resolve_client_id(payload.client_id, payload.session_id)
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")

    event = undo_latest_feedback(client_id=payload.client_id, session_id=payload.session_id)
    if not event:
        return PreferenceUndoResponse(ok=False, client_id=resolved_client_id)

    return PreferenceUndoResponse(
        ok=True,
        client_id=resolved_client_id,
        undone_event_id=event.event_id,
        candidate_id=event.candidate_id,
        feedback_type=event.feedback_type,
    )


@router.post("/preference/profile/lock")
def lock_profile_anchor(payload: PreferenceAnchorLockRequest) -> dict[str, str | bool]:
    resolved_client_id = set_anchor_lock(
        client_id=payload.client_id,
        session_id=payload.session_id,
        candidate_id=payload.candidate_id,
    )
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")
    return {"ok": True, "client_id": resolved_client_id, "candidate_id": payload.candidate_id}


@router.post("/preference/profile/unlock")
def unlock_profile_anchor(payload: PreferenceAnchorLockRequest) -> dict[str, str | bool]:
    resolved_client_id = remove_anchor_lock(
        client_id=payload.client_id,
        session_id=payload.session_id,
        candidate_id=payload.candidate_id,
    )
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")
    return {"ok": True, "client_id": resolved_client_id, "candidate_id": payload.candidate_id}


@router.post("/preference/bootstrap", response_model=ExplorationSessionResponse)
def bootstrap_session(payload: BootstrapRequest) -> ExplorationSessionResponse:
    session = build_session(round_number=1, phase="initial")
    client_id = payload.client_id or f"client_{session.session_id}"
    session.session_id = create_session(client_id=client_id, reference_image_name=payload.reference_image_name)
    session.strategy = (
        f"参考图 {payload.reference_image_name} 已进入 embedding 检索。"
        "本轮使用 base anchor + 4 个单槽位探索图。"
    )
    return session


@router.post("/preference/feedback", response_model=ExplorationSessionResponse)
def update_feedback(payload: FeedbackRequest) -> ExplorationSessionResponse:
    next_round = 2 if payload.continue_generate else 1
    session = build_session(round_number=next_round, phase="continue")
    client_id = resolve_client_id(payload.client_id, payload.session_id)
    if client_id:
        record_feedback(
            session_id=payload.session_id,
            client_id=client_id,
            liked_ids=payload.liked_ids,
            disliked_ids=payload.disliked_ids,
        )
    session.session_id = payload.session_id
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
