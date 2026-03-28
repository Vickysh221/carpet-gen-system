"""
Slot-value → prompt rule engine.

Given an ImageSlotValuesResponse (7 slots, each with 2-3 float axes in [0,1]),
produces a structured English generation prompt, its negative counterpart, and
a per-slot trace dict that matches the PromptTrace schema.
"""
from __future__ import annotations

import json

import numpy as np

from app.schemas import ImageSlotValuesResponse


# ---------------------------------------------------------------------------
# Core rule engine
# ---------------------------------------------------------------------------


def compose_prompt_from_slots(
    slots: ImageSlotValuesResponse,
    tags: list[str] | None = None,
) -> tuple[str, str, dict[str, list[str]]]:
    """Return (prompt, negative_prompt, trace_dict).

    trace_dict keys match the PromptTrace schema fields:
    color_palette, motif, style, arrangement, impression, shape, scale.
    """
    trace: dict[str, list[str]] = {
        "color_palette": [],
        "motif": [],
        "style": [],
        "arrangement": [],
        "impression": [],
        "shape": [],
        "scale": [],
    }

    # ---- Color Palette ----
    hue = slots.colorPalette["hueBias"]
    sat = slots.colorPalette["saturation"]
    light = slots.colorPalette["lightness"]

    if sat < 0.35:
        trace["color_palette"].append("muted, desaturated palette")
    elif sat > 0.65:
        trace["color_palette"].append("vibrant, saturated colors")
    else:
        trace["color_palette"].append("balanced color saturation")

    if light < 0.38:
        trace["color_palette"].append("deep, dark tones")
    elif light > 0.65:
        trace["color_palette"].append("light, airy tones")

    if hue < 0.30:
        trace["color_palette"].append("warm hues")
    elif hue > 0.60:
        trace["color_palette"].append("cool hues")

    # ---- Motif ----
    geo = slots.motif["geometryDegree"]
    organic = slots.motif["organicDegree"]
    complexity = slots.motif["complexity"]

    if geo > 0.60 and geo > organic + 0.10:
        trace["motif"].append("geometric, structured motifs")
    elif organic > 0.60 and organic > geo + 0.10:
        trace["motif"].append("organic, flowing motifs")
    elif geo > 0.50 and organic > 0.50:
        trace["motif"].append("mixed geometric-organic motifs")
    else:
        trace["motif"].append("abstract motifs")

    if complexity > 0.65:
        trace["motif"].append("intricate, detailed pattern")
    elif complexity < 0.30:
        trace["motif"].append("minimal, clean pattern")
    else:
        trace["motif"].append("moderate pattern complexity")

    # ---- Style ----
    graphic = slots.style["graphicness"]
    painterly = slots.style["painterlyDegree"]
    heritage = slots.style["heritageSense"]

    if heritage > 0.65:
        trace["style"].append("traditional heritage style")
    elif painterly > 0.60:
        trace["style"].append("painterly, hand-crafted style")
    elif graphic > 0.60:
        trace["style"].append("graphic, flat-design style")
    else:
        trace["style"].append("contemporary style")

    # ---- Arrangement ----
    orderliness = slots.arrangement["orderliness"]
    density = slots.arrangement["density"]
    directionality = slots.arrangement["directionality"]

    if orderliness > 0.62:
        trace["arrangement"].append("symmetrical, orderly arrangement")
    elif orderliness < 0.38:
        trace["arrangement"].append("scattered, irregular composition")
    else:
        trace["arrangement"].append("balanced, semi-regular composition")

    if density > 0.65:
        trace["arrangement"].append("dense fill")
    elif density < 0.30:
        trace["arrangement"].append("open, airy spacing")

    if directionality > 0.60:
        trace["arrangement"].append("strong directional flow")

    # ---- Impression ----
    calmness = slots.impression["calmness"]
    energy = slots.impression["energy"]
    softness = slots.impression["softness"]

    if calmness > 0.60:
        trace["impression"].append("serene, calm atmosphere")
    elif energy > 0.55:
        trace["impression"].append("dynamic, energetic mood")
    else:
        trace["impression"].append("balanced visual mood")

    if softness > 0.62:
        trace["impression"].append("soft, gentle tactile texture")

    # ---- Shape ----
    angularity = slots.shape["angularity"]
    edge_softness = slots.shape["edgeSoftness"]
    irregularity = slots.shape["irregularity"]

    if angularity > 0.62:
        trace["shape"].append("sharp, angular edges")
    elif edge_softness > 0.62:
        trace["shape"].append("soft, rounded forms")
    else:
        trace["shape"].append("mixed edge character")

    if irregularity > 0.60:
        trace["shape"].append("varied, irregular shapes")

    # ---- Scale ----
    motif_scale = slots.scale["motifScale"]
    rhythm = slots.scale["rhythm"]
    contrast = slots.scale["contrast"]

    if motif_scale > 0.62:
        trace["scale"].append("large-scale motifs")
    elif motif_scale < 0.35:
        trace["scale"].append("small-scale fine motifs")
    else:
        trace["scale"].append("medium-scale motifs")

    if rhythm > 0.62:
        trace["scale"].append("rhythmic repeat pattern")

    if contrast > 0.65:
        trace["scale"].append("high contrast tonal range")
    elif contrast < 0.28:
        trace["scale"].append("low contrast, subtle tonal gradation")

    # ---- Assemble prompt ----
    core_parts: list[str] = (
        trace["motif"][:1]
        + trace["arrangement"][:1]
        + trace["scale"][:1]
        + trace["color_palette"][:1]
    )
    detail_parts: list[str] = (
        trace["style"]
        + trace["impression"][:1]
        + trace["shape"][:1]
        + trace["color_palette"][1:]
    )

    tag_suffix = ""
    if tags:
        relevant = [t for t in tags if len(t) > 2][:3]
        if relevant:
            tag_suffix = f", referencing {', '.join(relevant)}"

    prompt = (
        "A carpet textile pattern featuring "
        + ", ".join(core_parts)
        + (", " + ", ".join(detail_parts) if detail_parts else "")
        + tag_suffix
        + ", woven textile surface, top-down flat lay view, seamless repeat tile"
    )
    negative_prompt = (
        "photorealistic, figurative objects, human figure, animal, text, logo, watermark, "
        "perspective distortion, 3D rendering, extreme noise, blurry, low quality, frame, border"
    )

    return prompt, negative_prompt, trace


# ---------------------------------------------------------------------------
# Aggregation helper
# ---------------------------------------------------------------------------


def aggregate_slot_values(slot_list: list[ImageSlotValuesResponse]) -> ImageSlotValuesResponse:
    """Average multiple slot value sets into one."""
    if not slot_list:
        return ImageSlotValuesResponse(
            colorPalette={"hueBias": 0.5, "saturation": 0.5, "lightness": 0.5},
            motif={"geometryDegree": 0.5, "organicDegree": 0.5, "complexity": 0.5},
            style={"graphicness": 0.5, "painterlyDegree": 0.5, "heritageSense": 0.5},
            arrangement={"orderliness": 0.5, "density": 0.5, "directionality": 0.5},
            impression={"calmness": 0.5, "energy": 0.5, "softness": 0.5},
            shape={"angularity": 0.5, "edgeSoftness": 0.5, "irregularity": 0.5},
            scale={"motifScale": 0.5, "rhythm": 0.5, "contrast": 0.5},
        )

    def avg_dict(attr: str) -> dict[str, float]:
        all_dicts = [getattr(s, attr) for s in slot_list]
        keys = list(all_dicts[0].keys())
        return {k: float(sum(d[k] for d in all_dicts) / len(all_dicts)) for k in keys}

    return ImageSlotValuesResponse(
        colorPalette=avg_dict("colorPalette"),
        motif=avg_dict("motif"),
        style=avg_dict("style"),
        arrangement=avg_dict("arrangement"),
        impression=avg_dict("impression"),
        shape=avg_dict("shape"),
        scale=avg_dict("scale"),
    )


# ---------------------------------------------------------------------------
# Pipeline helpers (load features → slot values → prompt)
# ---------------------------------------------------------------------------


def _load_features_payload() -> list[dict]:
    from app.core.settings import FULI_FEATURES_FILE, FULI_METADATA_FILE

    source = FULI_FEATURES_FILE if FULI_FEATURES_FILE.exists() else FULI_METADATA_FILE
    if not source.exists():
        return []
    payload = json.loads(source.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def compose_from_reference_id(reference_id: str) -> dict | None:
    """Look up a product by ID, compute its slot values, return composed prompt.

    Returns None if the reference is not found or features are missing.
    """
    from app.services.visual_search import engineered_features_to_slots

    payload = _load_features_payload()
    item = next((x for x in payload if isinstance(x, dict) and x.get("id") == reference_id), None)
    if not item:
        return None
    if "engineered_features" not in item:
        return None

    features = np.array(item["engineered_features"], dtype=np.float32)
    slot_values = engineered_features_to_slots(features, item.get("tags") or [])
    tags = item.get("tags") or []
    prompt, negative_prompt, trace_dict = compose_prompt_from_slots(slot_values, tags)

    return {
        "reference_id": reference_id,
        "title": item.get("title", reference_id),
        "filename": item.get("filename", ""),
        "slot_values": slot_values,
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "trace": trace_dict,
    }


def compose_from_liked_ids(liked_ids: list[str]) -> tuple[str, str, dict[str, list[str]]]:
    """Aggregate slot values from liked references and compose a session prompt."""
    from app.services.visual_search import engineered_features_to_slots

    payload = _load_features_payload()
    by_id = {x["id"]: x for x in payload if isinstance(x, dict) and x.get("id")}

    slot_list: list[ImageSlotValuesResponse] = []
    all_tags: list[str] = []
    for lid in liked_ids[:10]:
        item = by_id.get(lid)
        if item and "engineered_features" in item:
            features = np.array(item["engineered_features"], dtype=np.float32)
            slot_list.append(engineered_features_to_slots(features, item.get("tags") or []))
            all_tags.extend(item.get("tags") or [])

    aggregated = aggregate_slot_values(slot_list)
    # Deduplicate tags, keep most frequent
    from collections import Counter
    top_tags = [t for t, _ in Counter(all_tags).most_common(4)]
    return compose_prompt_from_slots(aggregated, top_tags or None)
