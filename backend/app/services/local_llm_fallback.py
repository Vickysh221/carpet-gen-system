from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_SECONDS
from app.schemas import LlmFallbackCandidatePayload, LlmFallbackResponse


ALLOWED_FIELDS = {
    "spaceContext",
    "overallImpression",
    "colorMood",
    "patternTendency",
    "arrangementTendency",
}
ALLOWED_SLOTS = {"color", "motif", "arrangement", "impression"}
ALLOWED_AXES = {
    "color": {"warmth", "saturation"},
    "motif": {"complexity", "geometry", "organic"},
    "arrangement": {"order", "spacing"},
    "impression": {"calm", "energy", "softness"},
}


def _build_prompt(text: str, hit_fields: list[str], prototype_labels: list[str], trigger_reasons: list[str], top_k: int) -> str:
    return f"""
你是地毯设计语义映射系统的 fallback 候选生成器。
当主规则/检索流程覆盖率较弱时，你的职责是提出弱候选解释。
不要输出最终合并结果，不要输出最终状态 patch。只返回严格 JSON，不要附加任何说明文字。

允许的 field 值：{sorted(ALLOWED_FIELDS)}
允许的 slot 和 axis：
- color: warmth（暖度）, saturation（饱和度）
- motif: complexity（复杂度）, geometry（几何感）, organic（自然感）
- arrangement: order（秩序感）, spacing（间距感）
- impression: calm（安静感）, energy（活力感）, softness（柔和感）

用户输入：{text}
已命中字段：{hit_fields}
已匹配的 prototype 标签：{prototype_labels}
触发 fallback 的原因：{trigger_reasons}

返回如下 JSON 格式（不要多余文字）：
{{
  "items": [
    {{
      "candidate_prototypes": ["概念或原型标签，用中文"],
      "candidate_fields": ["对应一个或多个允许的 field"],
      "candidate_axis_hints": {{
        "impression": {{"calm": 0.75}}
      }},
      "ambiguity_notes": ["简短的歧义说明，用中文"],
      "needs_follow_up": true
    }}
  ]
}}

要求：
- 最多返回 {top_k} 条候选。
- 宁可返回空 items，也不要瞎猜。
- axis 值必须是 [0, 1] 之间的浮点数。
- 只使用上方允许列表中的 slot/axis。
- candidate_prototypes 和 ambiguity_notes 必须用中文，不允许出现英文。
""".strip()


def _normalize_axis_hints(raw: Any) -> dict[str, dict[str, float]]:
    if not isinstance(raw, dict):
        return {}

    normalized: dict[str, dict[str, float]] = {}
    for slot, axes in raw.items():
        if slot not in ALLOWED_SLOTS or not isinstance(axes, dict):
            continue

        slot_axes: dict[str, float] = {}
        for axis, value in axes.items():
            if axis not in ALLOWED_AXES[slot]:
                continue
            if not isinstance(value, (int, float)):
                continue
            slot_axes[axis] = max(0.0, min(1.0, float(value)))

        if slot_axes:
            normalized[slot] = slot_axes

    return normalized


def _normalize_item(raw: Any) -> LlmFallbackCandidatePayload | None:
    if not isinstance(raw, dict):
        return None

    candidate_prototypes = [str(item) for item in raw.get("candidate_prototypes", []) if isinstance(item, (str, int, float))]
    candidate_fields = [str(item) for item in raw.get("candidate_fields", []) if str(item) in ALLOWED_FIELDS]
    ambiguity_notes = [str(item) for item in raw.get("ambiguity_notes", []) if isinstance(item, (str, int, float))]
    candidate_axis_hints = _normalize_axis_hints(raw.get("candidate_axis_hints"))
    needs_follow_up = bool(raw.get("needs_follow_up", False))

    if not candidate_fields and not candidate_axis_hints and not ambiguity_notes and not candidate_prototypes:
        return None

    return LlmFallbackCandidatePayload(
        candidate_prototypes=candidate_prototypes,
        candidate_fields=candidate_fields,
        candidate_axis_hints=candidate_axis_hints,
        ambiguity_notes=ambiguity_notes,
        needs_follow_up=needs_follow_up,
    )


def request_llm_fallback_candidates(
    *,
    text: str,
    hit_fields: list[str],
    prototype_labels: list[str],
    trigger_reasons: list[str],
    top_k: int = 2,
) -> LlmFallbackResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_prompt(text, hit_fields, prototype_labels, trigger_reasons, top_k),
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2,
        },
    }
    request = Request(
        url=f"{OLLAMA_BASE_URL}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            raw = json.loads(response.read().decode("utf-8"))
            raw_text = raw.get("response", "{}")
            parsed = json.loads(raw_text)
            items = [
                item
                for item in (_normalize_item(candidate) for candidate in parsed.get("items", []))
                if item is not None
            ]
            return LlmFallbackResponse(
                available=True,
                degraded=False,
                trigger_reasons=trigger_reasons,
                items=items,
            )
    except (TimeoutError, HTTPError, URLError, json.JSONDecodeError, ValueError):
        return LlmFallbackResponse(
            available=False,
            degraded=True,
            trigger_reasons=trigger_reasons,
            items=[],
        )
