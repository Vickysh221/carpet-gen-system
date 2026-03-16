from __future__ import annotations

import json

from app.core.settings import FULI_IMAGE_DIR, FULI_METADATA_FILE
from app.schemas import ProductReference
from app.services.metadata_builder import ensure_fuli_metadata


def load_fuli_products(limit: int = 100) -> list[ProductReference]:
    if not FULI_METADATA_FILE.exists():
        ensure_fuli_metadata()

    raw_items = json.loads(FULI_METADATA_FILE.read_text(encoding="utf-8"))
    if not isinstance(raw_items, list):
        raise ValueError("metadata.json must contain a top-level JSON array.")
    if not raw_items:
        raw_items = ensure_fuli_metadata()

    items: list[ProductReference] = []
    for raw in raw_items[:limit]:
        filename = raw.get("filename")
        if not filename:
            continue

        title = raw.get("title") or raw.get("alt") or filename
        source_url = raw.get("source_url") or raw.get("url") or ""
        image_path = FULI_IMAGE_DIR / filename
        if not image_path.exists():
            continue

        items.append(
            ProductReference(
                id=raw.get("id") or filename,
                title=title,
                image_url=f"/data/fuli_products/images/{filename}",
                source_url=source_url,
                filename=filename,
                category=raw.get("category"),
                tags=_normalize_tags(raw.get("tags")),
            )
        )

    return items


def _normalize_tags(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str) and value.strip():
        return [value]
    return []
