from __future__ import annotations

import json
import re
from pathlib import Path

from app.core.settings import FULI_IMAGE_DIR, FULI_METADATA_FILE


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def ensure_fuli_metadata() -> list[dict]:
    existing = _load_existing_metadata()
    by_filename = {entry["filename"]: entry for entry in existing if entry.get("filename")}

    updated: list[dict] = []
    for index, image_path in enumerate(sorted(FULI_IMAGE_DIR.iterdir()), start=1):
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        current = by_filename.get(image_path.name)
        if current:
            updated.append(_normalize_entry(current, image_path.name, index))
            continue

        title = infer_title_from_filename(image_path.name)
        updated.append(
            {
                "id": f"fuli-{index:04d}",
                "title": title,
                "filename": image_path.name,
                "source_url": "https://fuli-plus.com/product",
                "category": None,
                "tags": infer_tags_from_title(title),
            }
        )

    FULI_METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    FULI_METADATA_FILE.write_text(json.dumps(updated, ensure_ascii=False, indent=2), encoding="utf-8")
    return updated


def infer_title_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"^thumbnail\.", "", stem)
    stem = re.sub(r"_[0-9A-Fa-f]{8,}$", "", stem)
    stem = re.sub(r"_?20\d{12,}$", "", stem)
    parts = [part for part in re.split(r"__+", stem) if part]
    title = parts[0] if parts else stem
    title = re.sub(r"[_-]+", " ", title).strip()
    return title or filename


def infer_tags_from_title(title: str) -> list[str]:
    lowered = title.lower()
    tags: list[str] = []
    if any(token in lowered for token in ["绿", "green", "forest", "sage"]):
        tags.append("green")
    if any(token in lowered for token in ["红", "red", "crimson"]):
        tags.append("red")
    if any(token in lowered for token in ["白", "ivory", "white"]):
        tags.append("light")
    if any(token in lowered for token in ["海洋", "ocean", "wave"]):
        tags.append("organic")
    if any(token in lowered for token in ["纹", "grid", "geo", "mc", "sc"]):
        tags.append("geometric")
    if any(token in lowered for token in ["浴毯"]):
        tags.append("bath-rug")
    return tags


def _load_existing_metadata() -> list[dict]:
    if not FULI_METADATA_FILE.exists():
        return []
    payload = json.loads(FULI_METADATA_FILE.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def _normalize_entry(entry: dict, filename: str, index: int) -> dict:
    title = entry.get("title") or infer_title_from_filename(filename)
    return {
        "id": entry.get("id") or f"fuli-{index:04d}",
        "title": title,
        "filename": filename,
        "source_url": entry.get("source_url") or entry.get("url") or "https://fuli-plus.com/product",
        "category": entry.get("category"),
        "tags": entry.get("tags") if isinstance(entry.get("tags"), list) else infer_tags_from_title(title),
    }
