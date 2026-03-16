from fastapi import APIRouter

from app.core.model_config import RECOMMENDED_MODEL_CONFIG
from app.schemas import (
    BootstrapRequest,
    ComposePromptRequest,
    ComposePromptResponse,
    ExplorationSessionResponse,
    FeedbackRequest,
)
from app.services.mock_data import build_prompt_trace, build_session


router = APIRouter(prefix="/api/v1")


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/model-config")
def get_model_config():
    return RECOMMENDED_MODEL_CONFIG


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
