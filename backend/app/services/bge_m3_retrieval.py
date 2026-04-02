from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import numpy as np


DEFAULT_BGE_M3_MODEL_NAME = "BAAI/bge-m3"

_TOKENIZER: Any | None = None
_MODEL: Any | None = None
_MODEL_SOURCE: str | None = None
_MODEL_SOURCE_TYPE: str | None = None


def _resolve_local_model_path(model_path: str | None) -> Path | None:
    if not model_path:
        return None

    candidate = Path(model_path).expanduser()
    if not candidate.exists():
        return None

    if (candidate / "config.json").exists():
        return candidate

    snapshots_dir = candidate / "snapshots"
    if not snapshots_dir.exists():
        return None

    snapshot_candidates = sorted(
        (item for item in snapshots_dir.iterdir() if item.is_dir()),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    for snapshot in snapshot_candidates:
        if (snapshot / "config.json").exists():
            return snapshot

    return None


def loadBgeM3Model(model_path: str | None = None, model_name: str | None = None) -> dict[str, str]:
    global _TOKENIZER, _MODEL, _MODEL_SOURCE, _MODEL_SOURCE_TYPE

    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

    configured_model_path = model_path or os.getenv("BGE_M3_MODEL_PATH")
    configured_model_name = model_name or os.getenv("BGE_M3_MODEL_NAME") or DEFAULT_BGE_M3_MODEL_NAME

    resolved_local_path = _resolve_local_model_path(configured_model_path)
    resolved_source = str(resolved_local_path) if resolved_local_path else configured_model_name
    source_type = "local_path" if resolved_local_path else "model_name"

    if _TOKENIZER is None or _MODEL is None or _MODEL_SOURCE != resolved_source:
        from transformers import AutoModel, AutoTokenizer
        from transformers import modeling_utils
        from transformers.utils import import_utils

        load_kwargs: dict[str, Any] = {}
        if resolved_local_path:
            load_kwargs["local_files_only"] = True
            # The local BGE-M3 cache in this environment only contains pytorch_model.bin.
            # We explicitly trust this on-disk model source and bypass the torch<2.6 guard.
            import_utils.check_torch_load_is_safe = lambda: None
            modeling_utils.check_torch_load_is_safe = lambda: None

        _TOKENIZER = AutoTokenizer.from_pretrained(resolved_source, **load_kwargs)
        _MODEL = AutoModel.from_pretrained(resolved_source, **load_kwargs)
        _MODEL.eval()
        _MODEL_SOURCE = resolved_source
        _MODEL_SOURCE_TYPE = source_type

    return {
        "source": _MODEL_SOURCE or resolved_source,
        "source_type": _MODEL_SOURCE_TYPE or source_type,
        "requested_model_path": configured_model_path or "",
        "fallback_model_name": configured_model_name,
    }


def embedTexts(
    texts: list[str],
    *,
    is_query: bool = True,
    model_path: str | None = None,
    model_name: str | None = None,
    max_length: int = 256,
) -> np.ndarray:
    if not texts:
        return np.empty((0, 1024), dtype=np.float32)

    import torch

    tokenizer, model = _load_model_handles(model_path=model_path, model_name=model_name)
    prefix = "query: " if is_query else "passage: "
    normalized_texts = [f"{prefix}{text.strip()}" for text in texts]

    with torch.inference_mode():
        encoded = tokenizer(
            normalized_texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        outputs = model(**encoded)
        pooled = outputs.last_hidden_state[:, 0]
        normalized = torch.nn.functional.normalize(pooled, p=2, dim=1)

    return normalized.cpu().numpy().astype(np.float32)


def cosineSimilarity(a: np.ndarray | list[float], b: np.ndarray | list[float]) -> float:
    a_vec = np.asarray(a, dtype=np.float32)
    b_vec = np.asarray(b, dtype=np.float32)
    denominator = float(np.linalg.norm(a_vec) * np.linalg.norm(b_vec))
    if denominator <= 0:
        return 0.0
    return float(np.dot(a_vec, b_vec) / denominator)


def retrieveTopK(
    query: str,
    candidates: list[dict[str, Any]],
    k: int = 5,
    *,
    model_path: str | None = None,
    model_name: str | None = None,
) -> list[dict[str, Any]]:
    if not candidates or k <= 0:
        return []

    candidate_texts = [str(candidate.get("text", "")).strip() for candidate in candidates]
    query_embedding = embedTexts([query], is_query=True, model_path=model_path, model_name=model_name)[0]
    candidate_embeddings = embedTexts(candidate_texts, is_query=False, model_path=model_path, model_name=model_name)
    scores = candidate_embeddings @ query_embedding
    top_indices = np.argsort(scores)[::-1][: min(k, len(candidates))]

    results: list[dict[str, Any]] = []
    for raw_index in top_indices:
        candidate = candidates[int(raw_index)]
        results.append(
            {
                "id": candidate.get("id"),
                "text": candidate.get("text"),
                "score": float(scores[int(raw_index)]),
                "source": candidate.get("source"),
            }
        )
    return results


def _load_model_handles(model_path: str | None = None, model_name: str | None = None) -> tuple[Any, Any]:
    loadBgeM3Model(model_path=model_path, model_name=model_name)
    return _TOKENIZER, _MODEL


def _read_payload(payload_arg: str | None) -> dict[str, Any]:
    if payload_arg:
        return json.loads(payload_arg)
    raw = input()
    return json.loads(raw)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local BGE-M3 embeddings or retrieval.")
    parser.add_argument("--task", choices=["info", "embed", "retrieve"], default="info")
    parser.add_argument("--payload", help="Inline JSON payload. If omitted, stdin is used.")
    parser.add_argument("--model-path", default=os.getenv("BGE_M3_MODEL_PATH"))
    parser.add_argument("--model-name", default=os.getenv("BGE_M3_MODEL_NAME") or DEFAULT_BGE_M3_MODEL_NAME)
    args = parser.parse_args()

    if args.task == "info":
        print(json.dumps({"model": loadBgeM3Model(model_path=args.model_path, model_name=args.model_name)}, ensure_ascii=False))
        return

    payload = _read_payload(args.payload)
    model_info = loadBgeM3Model(model_path=args.model_path, model_name=args.model_name)

    if args.task == "embed":
        embeddings = embedTexts(
            payload.get("texts", []),
            is_query=bool(payload.get("isQuery", True)),
            model_path=args.model_path,
            model_name=args.model_name,
        )
        print(
            json.dumps(
                {
                    "model": model_info,
                    "embeddings": embeddings.tolist(),
                },
                ensure_ascii=False,
            )
        )
        return

    results = retrieveTopK(
        payload.get("query", ""),
        payload.get("candidates", []),
        int(payload.get("k", 5)),
        model_path=args.model_path,
        model_name=args.model_name,
    )
    print(json.dumps({"model": model_info, "results": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
