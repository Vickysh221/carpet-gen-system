from typing import Optional, Union
import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.core.model_config import RECOMMENDED_MODEL_CONFIG
from app.schemas import (
    BootstrapRequest,
    ComposeFromReferenceResponse,
    ComposePromptRequest,
    ComposePromptResponse,
    ExplorationSessionResponse,
    FeedbackRequest,
    PreferenceAnchorLockRequest,
    PreferenceProfileActionRequest,
    PreferenceProfileResponse,
    PreferenceUndoResponse,
    ProductReferenceListResponse,
    LlmFallbackRequest,
    LlmFallbackResponse,
    PrototypeRetrievalRequest,
    PrototypeRetrievalResponse,
    PrototypeRetrievalEntryResponse,
    SemanticRetrievalRequest,
    SemanticRetrievalResponse,
    SemanticRetrievalMatchItem,
    PromptTrace,
)
from app.services.local_llm_fallback import request_llm_fallback_candidates
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
from app.services.prototype_text_retrieval import ensure_prototype_text_index, search_prototype_entries
from app.services.visual_search import ensure_search_index, search_similar_products
from app.services.mock_data import build_prompt_trace, build_session
from app.services.prompt_composer import compose_from_liked_ids, compose_from_reference_id


router = APIRouter(prefix="/api/v1")


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _resolve_semantic_retrieval_python() -> str:
    configured = os.getenv("BGE_M3_PYTHON_PATH")
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
        raise RuntimeError(f"Configured BGE_M3_PYTHON_PATH is not executable: {candidate}")

    project_python = _project_root() / "backend" / ".venv" / "bin" / "python"
    if project_python.exists() and os.access(project_python, os.X_OK):
        return str(project_python)

    raise RuntimeError(
        "Semantic retrieval Python runtime not found. Expected project venv at "
        f"{project_python}. Refusing to fall back to system python."
    )


def _run_semantic_retrieval_subprocess(query: str, candidates: list[dict[str, str]], top_k: int):
    python_executable = _resolve_semantic_retrieval_python()
    service_script = _project_root() / "backend" / "app" / "services" / "bge_m3_retrieval.py"
    if not service_script.exists():
        raise RuntimeError(f"Semantic retrieval script not found: {service_script}")

    payload = json.dumps({"query": query, "candidates": candidates, "k": top_k}, ensure_ascii=False)
    env = os.environ.copy()
    env.setdefault("PYTHONNOUSERSITE", "1")

    completed = subprocess.run(
        [python_executable, str(service_script), "--task", "retrieve", "--payload", payload],
        capture_output=True,
        text=True,
        env=env,
        cwd=str(_project_root()),
        check=False,
    )

    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()
        stdout = (completed.stdout or "").strip()
        detail = stderr or stdout or f"subprocess exited with code {completed.returncode}"
        raise RuntimeError(
            "Semantic retrieval subprocess failed. "
            f"python={python_executable} script={service_script} detail={detail}"
        )

    raw_output = (completed.stdout or "").strip()
    if not raw_output:
        raise RuntimeError(
            "Semantic retrieval subprocess returned empty output. "
            f"python={python_executable} script={service_script}"
        )

    try:
        parsed = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Semantic retrieval subprocess returned invalid JSON. "
            f"python={python_executable} script={service_script} output={raw_output[:500]}"
        ) from exc

    return parsed


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
    client_id: Optional[str] = Form(default=None),
    session_id: Optional[str] = Form(default=None),
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


@router.post("/prototype-retrieval/index")
def build_prototype_retrieval_index() -> dict[str, Union[int, str]]:
    return ensure_prototype_text_index()


@router.post("/prototype-retrieval/search", response_model=PrototypeRetrievalResponse)
def search_prototype_retrieval(payload: PrototypeRetrievalRequest) -> PrototypeRetrievalResponse:
    try:
        matches = search_prototype_entries(query_text=payload.text, top_k=payload.top_k)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Prototype retrieval failed: {exc}") from exc
    return PrototypeRetrievalResponse(
        total=len(matches),
        items=[PrototypeRetrievalEntryResponse(**match.__dict__) for match in matches],
    )


@router.post("/semantic-retrieval/search", response_model=SemanticRetrievalResponse)
def search_semantic_retrieval(payload: SemanticRetrievalRequest) -> SemanticRetrievalResponse:
    try:
        candidates = [{"id": c.id, "text": c.text, "source": c.source} for c in payload.candidates]
        response = _run_semantic_retrieval_subprocess(payload.query, candidates, payload.top_k)
        results = response.get("results", [])
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Semantic retrieval failed: {exc}") from exc
    return SemanticRetrievalResponse(
        total=len(results),
        results=[SemanticRetrievalMatchItem(**r) for r in results],
    )


@router.post("/llm-fallback/candidates", response_model=LlmFallbackResponse)
def generate_llm_fallback_candidates(payload: LlmFallbackRequest) -> LlmFallbackResponse:
    try:
        return request_llm_fallback_candidates(
            text=payload.text,
            hit_fields=payload.hit_fields,
            prototype_labels=payload.prototype_labels,
            trigger_reasons=payload.trigger_reasons,
            top_k=payload.top_k,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"LLM fallback failed: {exc}") from exc


@router.get("/preference/profile", response_model=PreferenceProfileResponse)
def get_preference_profile(
    client_id: Optional[str] = Query(default=None),
    session_id: Optional[str] = Query(default=None),
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
def clear_profile(payload: PreferenceProfileActionRequest) -> dict[str, Union[str, bool]]:
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
def lock_profile_anchor(payload: PreferenceAnchorLockRequest) -> dict[str, Union[str, bool]]:
    resolved_client_id = set_anchor_lock(
        client_id=payload.client_id,
        session_id=payload.session_id,
        candidate_id=payload.candidate_id,
    )
    if not resolved_client_id:
        raise HTTPException(status_code=404, detail="Preference profile not found.")
    return {"ok": True, "client_id": resolved_client_id, "candidate_id": payload.candidate_id}


@router.post("/preference/profile/unlock")
def unlock_profile_anchor(payload: PreferenceAnchorLockRequest) -> dict[str, Union[str, bool]]:
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
    profile = load_preference_profile(client_id=None, session_id=payload.session_id)
    liked_ids = list(profile.liked_ids)

    prompt, negative_prompt, trace_dict = compose_from_liked_ids(liked_ids)
    return ComposePromptResponse(
        session_id=payload.session_id,
        prompt=prompt,
        negative_prompt=negative_prompt,
        trace=PromptTrace(**trace_dict),
    )


@router.get("/prompt/compose-from-reference/{reference_id}", response_model=ComposeFromReferenceResponse)
def compose_prompt_from_reference(reference_id: str) -> ComposeFromReferenceResponse:
    result = compose_from_reference_id(reference_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Reference '{reference_id}' not found or missing engineered features. "
                   "Run POST /reference-library/fuli-products/index first.",
        )
    return ComposeFromReferenceResponse(
        reference_id=result["reference_id"],
        title=result["title"],
        image_url=f"/data/fuli_products/images/{result['filename']}",
        slot_values=result["slot_values"],
        prompt=result["prompt"],
        negative_prompt=result["negative_prompt"],
        trace=PromptTrace(**result["trace"]),
    )
