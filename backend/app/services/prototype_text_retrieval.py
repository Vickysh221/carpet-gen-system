from __future__ import annotations

import json
from dataclasses import dataclass

import faiss
import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer

from app.core.settings import (
    PROTOTYPE_TEXT_EMBEDDINGS_FILE,
    PROTOTYPE_TEXT_ENTRIES_FILE,
    PROTOTYPE_TEXT_INDEX_FILE,
    PROTOTYPE_TEXT_INDEX_MANIFEST_FILE,
    PROTOTYPE_TEXT_MODEL_NAME,
)


@dataclass
class PrototypeRetrievalEntry:
    entry_id: str
    prototype_id: str
    label: str
    route_type: str
    field: str
    reading_ids: list[str]
    aliases: list[str]
    semantic_summary: str
    slot_summary: str
    rationale: str
    embedding_text: str
    explain_text: str


@dataclass
class PrototypeRetrievalMatch:
    entry_id: str
    prototype_id: str
    label: str
    route_type: str
    field: str
    reading_ids: list[str]
    similarity_score: float
    explain_text: str


PROTOTYPE_ENTRY_SOURCE: list[PrototypeRetrievalEntry] = [
    PrototypeRetrievalEntry(
        entry_id="coffee-main",
        prototype_id="coffee",
        label="咖啡",
        route_type="prototype-first",
        field="colorMood",
        reading_ids=["coffee-color-warmth"],
        aliases=["咖啡", "咖啡感", "咖色"],
        semantic_summary="偏暖、低刺激、生活化陪伴感。",
        slot_summary="主指向 color，次指向 impression softness。",
        rationale="偏暖、低刺激、带一点生活化陪伴感的 imagery prototype。",
        embedding_text="咖啡 咖啡感 咖色 偏暖 低刺激 生活感 陪伴感 颜色更暖 更克制 更柔和",
        explain_text="prototype-first；偏暖、克制、带生活化陪伴感。",
    ),
    PrototypeRetrievalEntry(
        entry_id="natural-ease-main",
        prototype_id="natural-ease",
        label="自然一点",
        route_type="dual-route",
        field="patternTendency",
        reading_ids=["natural-organic"],
        aliases=["自然一点", "更自然一点", "自然些"],
        semantic_summary="更自然生长感，少一点硬几何，同时允许颜色和氛围更收。",
        slot_summary="主指向 motif，次指向 color 和 impression。",
        rationale="既可能落在图案更 organic，也可能带出颜色更收、氛围更松。",
        embedding_text="自然一点 更自然一点 自然些 自然生长感 organic 少一点几何 更柔和 更克制 氛围更松",
        explain_text="dual-route；主看图案 organic，次看颜色 restraint 和 softness。",
    ),
    PrototypeRetrievalEntry(
        entry_id="visual-restraint-main",
        prototype_id="visual-restraint",
        label="不要太花",
        route_type="direct-first-with-fallback",
        field="patternTendency",
        reading_ids=["visual-restraint-pattern"],
        aliases=["不要太花", "别太花"],
        semantic_summary="图案复杂度降低，视觉噪音更低，颜色 restraint 只是次解释。",
        slot_summary="主指向 motif complexity，次指向 color saturation。",
        rationale="主指向通常是图案复杂度降低，但存在颜色也别太跳的歧义。",
        embedding_text="不要太花 别太花 图案别太复杂 图案收一点 视觉噪音低一点 颜色别太跳",
        explain_text="direct-first；优先看 motif complexity lower，颜色 restraint 只是次解释。",
    ),
]

_TOKENIZER: AutoTokenizer | None = None
_MODEL: AutoModel | None = None
_ENTRIES: list[PrototypeRetrievalEntry] | None = None
_EMBEDDINGS: np.ndarray | None = None
_INDEX: faiss.Index | None = None


def _load_model() -> tuple[AutoTokenizer, AutoModel]:
    global _TOKENIZER, _MODEL
    if _TOKENIZER is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(PROTOTYPE_TEXT_MODEL_NAME)
    if _MODEL is None:
        _MODEL = AutoModel.from_pretrained(PROTOTYPE_TEXT_MODEL_NAME)
        _MODEL.eval()
    return _TOKENIZER, _MODEL


def _mean_pool(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    masked = last_hidden_state * mask
    summed = masked.sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return summed / counts


def compute_text_embeddings(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    tokenizer, model = _load_model()
    with torch.no_grad():
        batch = tokenizer(
            [f"query: {text}" for text in texts],
            padding=True,
            truncation=True,
            max_length=128,
            return_tensors="pt",
        )
        outputs = model(**batch)
        pooled = _mean_pool(outputs.last_hidden_state, batch["attention_mask"])
        normalized = torch.nn.functional.normalize(pooled, p=2, dim=1)
    return normalized.cpu().numpy().astype("float32")


def ensure_prototype_text_index() -> dict[str, int | str]:
    entries = [entry.__dict__ for entry in PROTOTYPE_ENTRY_SOURCE]
    texts = [entry.embedding_text for entry in PROTOTYPE_ENTRY_SOURCE]
    embeddings = compute_text_embeddings(texts)

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)

    PROTOTYPE_TEXT_ENTRIES_FILE.parent.mkdir(parents=True, exist_ok=True)
    PROTOTYPE_TEXT_ENTRIES_FILE.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    np.save(PROTOTYPE_TEXT_EMBEDDINGS_FILE, embeddings)
    faiss.write_index(index, str(PROTOTYPE_TEXT_INDEX_FILE))
    PROTOTYPE_TEXT_INDEX_MANIFEST_FILE.write_text(
        json.dumps(
            {
                "model_name": PROTOTYPE_TEXT_MODEL_NAME,
                "entries": len(entries),
                "dimension": int(embeddings.shape[1]),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    _clear_cache()
    return {
        "entries": len(entries),
        "dimension": int(embeddings.shape[1]),
        "model_name": PROTOTYPE_TEXT_MODEL_NAME,
    }


def _clear_cache() -> None:
    global _ENTRIES, _EMBEDDINGS, _INDEX
    _ENTRIES = None
    _EMBEDDINGS = None
    _INDEX = None


def ensure_prototype_text_artifacts() -> None:
    if not PROTOTYPE_TEXT_ENTRIES_FILE.exists() or not PROTOTYPE_TEXT_EMBEDDINGS_FILE.exists():
        ensure_prototype_text_index()


def _load_artifacts() -> tuple[list[PrototypeRetrievalEntry], np.ndarray, faiss.Index | None]:
    global _ENTRIES, _EMBEDDINGS, _INDEX
    ensure_prototype_text_artifacts()

    if _ENTRIES is None:
        payload = json.loads(PROTOTYPE_TEXT_ENTRIES_FILE.read_text(encoding="utf-8"))
        _ENTRIES = [PrototypeRetrievalEntry(**item) for item in payload]
    if _EMBEDDINGS is None:
        _EMBEDDINGS = np.load(PROTOTYPE_TEXT_EMBEDDINGS_FILE)
    if _INDEX is None and PROTOTYPE_TEXT_INDEX_FILE.exists():
        _INDEX = faiss.read_index(str(PROTOTYPE_TEXT_INDEX_FILE))
    return _ENTRIES, _EMBEDDINGS, _INDEX


def _cosine_search(query_embedding: np.ndarray, embeddings: np.ndarray, top_k: int) -> tuple[np.ndarray, np.ndarray]:
    scores = embeddings @ query_embedding
    sorted_indices = np.argsort(scores)[::-1][:top_k]
    return scores[sorted_indices], sorted_indices


def search_prototype_entries(query_text: str, top_k: int = 5) -> list[PrototypeRetrievalMatch]:
    entries, embeddings, index = _load_artifacts()
    query_embedding = compute_text_embeddings([query_text])[0]

    if len(entries) > 64 and index is not None:
        distances, indices = index.search(query_embedding.reshape(1, -1), min(top_k, len(entries)))
        scores = distances[0]
        raw_indices = indices[0]
    else:
        scores, raw_indices = _cosine_search(query_embedding, embeddings, min(top_k, len(entries)))

    matches: list[PrototypeRetrievalMatch] = []
    for score, raw_index in zip(scores, raw_indices):
        if raw_index < 0:
            continue
        entry = entries[int(raw_index)]
        matches.append(
            PrototypeRetrievalMatch(
                entry_id=entry.entry_id,
                prototype_id=entry.prototype_id,
                label=entry.label,
                route_type=entry.route_type,
                field=entry.field,
                reading_ids=entry.reading_ids,
                similarity_score=float(score),
                explain_text=entry.explain_text,
            )
        )
    return matches
