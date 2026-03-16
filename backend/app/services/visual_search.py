from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import faiss
import numpy as np
from PIL import Image
from skimage.feature import canny, graycomatrix, graycoprops
from skimage.transform import probabilistic_hough_line

from app.core.settings import (
    FULI_EMBEDDINGS_FILE,
    FULI_FEATURES_FILE,
    FULI_IMAGE_DIR,
    FULI_INDEX_FILE,
    FULI_METADATA_FILE,
)
from app.schemas import ImageSlotValuesResponse
from app.services.metadata_builder import ensure_fuli_metadata


COLOR_BINS = 8
ENGINEERED_FEATURE_SIZE = 19


@dataclass
class SearchMatch:
    id: str
    title: str
    filename: str
    source_url: str
    category: str | None
    tags: list[str]
    image_url: str
    score: float
    clip_score: float
    rerank_score: float
    feature_summary: dict[str, float]
    slot_values: ImageSlotValuesResponse


def ensure_search_index() -> dict[str, int]:
    metadata = ensure_fuli_metadata()
    if not metadata:
        raise ValueError("No product images found under data/fuli_products/images.")

    engineered: list[np.ndarray] = []
    valid_metadata: list[dict] = []
    image_paths: list[Path] = []

    for item in metadata:
        image_path = FULI_IMAGE_DIR / item["filename"]
        if not image_path.exists():
            continue
        extra_features = compute_engineered_features(load_rgb_image(image_path))
        engineered.append(extra_features)
        valid_metadata.append(item)
        image_paths.append(image_path)

    if not image_paths:
        raise ValueError("No valid product images were processed for indexing.")

    embedding_matrix = compute_clip_embeddings_batch(image_paths).astype("float32")
    index = faiss.IndexFlatIP(embedding_matrix.shape[1])
    index.add(embedding_matrix)

    np.save(FULI_EMBEDDINGS_FILE, embedding_matrix)
    FULI_INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(FULI_INDEX_FILE))

    feature_payload = [
        {
            **item,
            "engineered_features": engineered_features.tolist(),
        }
        for item, engineered_features in zip(valid_metadata, engineered)
    ]
    FULI_FEATURES_FILE.write_text(json.dumps(feature_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    FULI_METADATA_FILE.write_text(json.dumps(valid_metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"indexed": len(valid_metadata), "dimension": int(embedding_matrix.shape[1])}


def search_similar_products(
    image_bytes: bytes,
    top_k: int = 8,
    liked_ids: list[str] | None = None,
    disliked_ids: list[str] | None = None,
    locked_candidate_ids: list[str] | None = None,
) -> list[SearchMatch]:
    ensure_search_artifacts()

    query_image = load_rgb_image(image_bytes)
    temp_path = write_temp_image(query_image)
    try:
        query_embedding = compute_clip_embeddings_batch([temp_path])[0]
    finally:
        temp_path.unlink(missing_ok=True)
    query_engineered = compute_engineered_features(query_image)
    embeddings = np.load(FULI_EMBEDDINGS_FILE)
    index = faiss.read_index(str(FULI_INDEX_FILE))
    feature_payload = json.loads(FULI_FEATURES_FILE.read_text(encoding="utf-8"))
    liked_ids = liked_ids or []
    disliked_ids = disliked_ids or []
    locked_candidate_ids = locked_candidate_ids or []
    liked_embedding_centroid, liked_feature_centroid = build_preference_centroids(liked_ids, feature_payload, embeddings)
    disliked_embedding_centroid, disliked_feature_centroid = build_preference_centroids(disliked_ids, feature_payload, embeddings)
    locked_embedding_centroid, locked_feature_centroid = build_preference_centroids(
        locked_candidate_ids,
        feature_payload,
        embeddings,
    )

    distances, indices = index.search(query_embedding.reshape(1, -1).astype("float32"), min(top_k * 5, len(feature_payload)))

    results: list[SearchMatch] = []
    for clip_score, raw_index in zip(distances[0], indices[0]):
        if raw_index < 0:
            continue
        item = feature_payload[int(raw_index)]
        candidate_engineered = np.array(item["engineered_features"], dtype=np.float32)
        candidate_embedding = embeddings[int(raw_index)]
        rerank = rerank_score(query_engineered, candidate_engineered)
        preference_delta = compute_preference_delta(
            candidate_embedding=candidate_embedding,
            candidate_features=candidate_engineered,
            liked_embedding_centroid=liked_embedding_centroid,
            liked_feature_centroid=liked_feature_centroid,
            disliked_embedding_centroid=disliked_embedding_centroid,
            disliked_feature_centroid=disliked_feature_centroid,
            locked_embedding_centroid=locked_embedding_centroid,
            locked_feature_centroid=locked_feature_centroid,
        )
        final_score = float(0.65 * float(clip_score) + 0.2 * rerank + 0.15 * preference_delta)
        summary = summarize_engineered_features(candidate_engineered)
        results.append(
            SearchMatch(
                id=item["id"],
                title=item["title"],
                filename=item["filename"],
                source_url=item.get("source_url") or "https://fuli-plus.com/product",
                category=item.get("category"),
                tags=item.get("tags") or [],
                image_url=f"/data/fuli_products/images/{item['filename']}",
                score=final_score,
                clip_score=float(clip_score),
                rerank_score=rerank,
                feature_summary=summary,
                slot_values=engineered_features_to_slots(candidate_engineered, item.get("tags") or []),
            )
        )

    results.sort(key=lambda item: item.score, reverse=True)
    return results[:top_k]


def ensure_search_artifacts() -> None:
    if not FULI_INDEX_FILE.exists() or not FULI_FEATURES_FILE.exists() or not FULI_EMBEDDINGS_FILE.exists():
        ensure_search_index()


def load_rgb_image(image_input: bytes | Path) -> Image.Image:
    if isinstance(image_input, Path):
        image = Image.open(image_input)
    else:
        from io import BytesIO

        image = Image.open(BytesIO(image_input))
    return image.convert("RGB")


def compute_clip_embeddings_batch(image_paths: list[Path]) -> np.ndarray:
    if not image_paths:
        return np.empty((0, 512), dtype=np.float32)

    backend_root = Path(__file__).resolve().parents[2]
    command = [
        sys.executable,
        "-m",
        "app.services.clip_worker",
        *[str(path) for path in image_paths],
    ]
    completed = subprocess.run(
        command,
        cwd=backend_root,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout)
    return np.array(payload["embeddings"], dtype=np.float32)


def write_temp_image(image: Image.Image) -> Path:
    temp_file = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    temp_path = Path(temp_file.name)
    temp_file.close()
    image.save(temp_path)
    return temp_path


def compute_engineered_features(image: Image.Image) -> np.ndarray:
    np_img = np.asarray(image.resize((256, 256)), dtype=np.uint8)
    hsv = _rgb_to_hsv(np_img)
    hist_h = np.histogram(hsv[..., 0], bins=COLOR_BINS, range=(0.0, 1.0), density=True)[0]
    hist_s = np.histogram(hsv[..., 1], bins=COLOR_BINS, range=(0.0, 1.0), density=True)[0]
    hist_v = np.histogram(hsv[..., 2], bins=COLOR_BINS, range=(0.0, 1.0), density=True)[0]

    gray = np.dot(np_img[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)
    quantized = (gray / 32).astype(np.uint8)
    glcm = graycomatrix(quantized, distances=[2, 6], angles=[0, np.pi / 4], levels=8, symmetric=True, normed=True)
    contrast = float(graycoprops(glcm, "contrast").mean())
    homogeneity = float(graycoprops(glcm, "homogeneity").mean())
    energy = float(graycoprops(glcm, "energy").mean())

    gray_f = gray.astype(np.float32) / 255.0
    gx = np.abs(np.diff(gray_f, axis=1, prepend=gray_f[:, :1]))
    gy = np.abs(np.diff(gray_f, axis=0, prepend=gray_f[:1, :]))
    grad_mag = np.sqrt(gx ** 2 + gy ** 2)
    edge_density = float((grad_mag > 0.15).mean())
    repeat_score = float(_repeat_score(gray_f))
    directionality = float(_directionality_score(gray_f))

    straight_ratio = float(_straight_edge_ratio(np_img))
    organic_ratio = float(max(0.0, 1.0 - straight_ratio))

    summary = np.array(
        [
            hist_h.mean(),
            hist_s.mean(),
            hist_v.mean(),
            contrast,
            homogeneity,
            energy,
            edge_density,
            repeat_score,
            directionality,
            straight_ratio,
            organic_ratio,
            float(gray_f.mean()),
            float(gray_f.std()),
            float(hist_s.std()),
            float(hist_v.std()),
            float(hist_h.std()),
            float(np.percentile(gray_f, 90) - np.percentile(gray_f, 10)),
            float(np.mean(np.abs(gray_f[:, 1:] - gray_f[:, :-1]))),
            float(np.mean(np.abs(gray_f[1:, :] - gray_f[:-1, :]))),
        ],
        dtype=np.float32,
    )
    return summary


def rerank_score(query_features: np.ndarray, candidate_features: np.ndarray) -> float:
    deltas = np.abs(query_features - candidate_features)
    weights = np.array(
        [
            0.04,
            0.04,
            0.04,
            0.10,
            0.08,
            0.08,
            0.10,
            0.12,
            0.08,
            0.12,
            0.12,
            0.04,
            0.04,
            0.02,
            0.02,
            0.02,
            0.04,
            0.04,
            0.04,
        ],
        dtype=np.float32,
    )
    weighted_distance = float((deltas * weights).sum())
    return max(0.0, 1.0 - weighted_distance)


def build_preference_centroids(
    target_ids: list[str],
    feature_payload: list[dict],
    embeddings: np.ndarray,
) -> tuple[np.ndarray | None, np.ndarray | None]:
    if not target_ids:
        return None, None

    index_by_id = {item["id"]: idx for idx, item in enumerate(feature_payload)}
    matched_indices = [index_by_id[target_id] for target_id in target_ids if target_id in index_by_id]
    if not matched_indices:
        return None, None

    embedding_centroid = np.mean(embeddings[matched_indices], axis=0)
    feature_centroid = np.mean(
        [np.array(feature_payload[idx]["engineered_features"], dtype=np.float32) for idx in matched_indices],
        axis=0,
    )
    return embedding_centroid.astype(np.float32), feature_centroid.astype(np.float32)


def compute_preference_delta(
    candidate_embedding: np.ndarray,
    candidate_features: np.ndarray,
    liked_embedding_centroid: np.ndarray | None,
    liked_feature_centroid: np.ndarray | None,
    disliked_embedding_centroid: np.ndarray | None,
    disliked_feature_centroid: np.ndarray | None,
    locked_embedding_centroid: np.ndarray | None,
    locked_feature_centroid: np.ndarray | None,
) -> float:
    liked_bonus = 0.0
    disliked_penalty = 0.0
    locked_bonus = 0.0

    if liked_embedding_centroid is not None and liked_feature_centroid is not None:
        liked_bonus = 0.75 * cosine_similarity(candidate_embedding, liked_embedding_centroid) + 0.25 * rerank_score(
            liked_feature_centroid,
            candidate_features,
        )

    if disliked_embedding_centroid is not None and disliked_feature_centroid is not None:
        disliked_penalty = 0.75 * cosine_similarity(candidate_embedding, disliked_embedding_centroid) + 0.25 * rerank_score(
            disliked_feature_centroid,
            candidate_features,
        )

    if locked_embedding_centroid is not None and locked_feature_centroid is not None:
        locked_bonus = 0.75 * cosine_similarity(candidate_embedding, locked_embedding_centroid) + 0.25 * rerank_score(
            locked_feature_centroid,
            candidate_features,
        )

    return float(np.clip((0.6 * liked_bonus) + (1.1 * locked_bonus) - disliked_penalty, -1.0, 1.0))


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def summarize_engineered_features(features: np.ndarray) -> dict[str, float]:
    return {
        "texture_contrast": float(features[3]),
        "texture_homogeneity": float(features[4]),
        "edge_density": float(features[6]),
        "repeat_score": float(features[7]),
        "directionality": float(features[8]),
        "geometry_degree": float(features[9]),
        "organic_degree": float(features[10]),
    }


def engineered_features_to_slots(features: np.ndarray, tags: list[str]) -> ImageSlotValuesResponse:
    hue_bias = float(np.clip(features[0] * 4.0, 0.0, 1.0))
    saturation = float(np.clip(features[1] * 4.0, 0.0, 1.0))
    lightness = float(np.clip(features[11], 0.0, 1.0))
    geometry = float(np.clip(features[9] + (0.15 if "geometric" in tags else 0.0), 0.0, 1.0))
    organic = float(np.clip(features[10] + (0.15 if "organic" in tags else 0.0), 0.0, 1.0))
    complexity = float(np.clip((features[3] / 8.0) + features[6] * 0.5 + features[7] * 0.3, 0.0, 1.0))
    heritage = float(np.clip(0.35 + features[7] * 0.35 + (0.1 if "bath-rug" not in tags else 0.0), 0.0, 1.0))
    painterly = float(np.clip(0.45 + features[10] * 0.25 - features[9] * 0.1, 0.0, 1.0))
    graphic = float(np.clip(0.45 + features[9] * 0.25 + features[8] * 0.1, 0.0, 1.0))
    density = float(np.clip(features[6] * 0.65 + features[7] * 0.2, 0.0, 1.0))
    directionality = float(np.clip(features[8], 0.0, 1.0))
    calmness = float(np.clip(0.7 - features[3] / 10.0 - features[6] * 0.1, 0.0, 1.0))
    energy = float(np.clip(features[6] * 0.5 + features[12] * 0.4, 0.0, 1.0))
    softness = float(np.clip(0.7 - features[9] * 0.35 + features[10] * 0.15, 0.0, 1.0))

    return ImageSlotValuesResponse(
        colorPalette={
            "hueBias": hue_bias,
            "saturation": saturation,
            "lightness": lightness,
        },
        motif={
            "geometryDegree": geometry,
            "organicDegree": organic,
            "complexity": complexity,
        },
        style={
            "graphicness": graphic,
            "painterlyDegree": painterly,
            "heritageSense": heritage,
        },
        arrangement={
            "orderliness": float(np.clip(0.45 + features[8] * 0.25 + features[9] * 0.15, 0.0, 1.0)),
            "density": density,
            "directionality": directionality,
        },
        impression={
            "calmness": calmness,
            "energy": energy,
            "softness": softness,
        },
        shape={
            "angularity": geometry,
            "edgeSoftness": float(np.clip(softness, 0.0, 1.0)),
            "irregularity": float(np.clip(0.4 + organic * 0.35 - directionality * 0.1, 0.0, 1.0)),
        },
        scale={
            "motifScale": float(np.clip(0.45 + features[7] * 0.2 - density * 0.1, 0.0, 1.0)),
            "rhythm": float(np.clip(0.4 + features[7] * 0.4 + directionality * 0.1, 0.0, 1.0)),
            "contrast": float(np.clip(features[16], 0.0, 1.0)),
        },
    )


def _rgb_to_hsv(np_img: np.ndarray) -> np.ndarray:
    rgb = np_img.astype(np.float32) / 255.0
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    deltac = maxc - minc

    hue = np.zeros_like(maxc)
    mask = deltac != 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    safe_delta = np.where(mask, deltac, 1.0)
    hue[(maxc == r) & mask] = ((g - b) / safe_delta)[(maxc == r) & mask] % 6
    hue[(maxc == g) & mask] = ((b - r) / safe_delta + 2)[(maxc == g) & mask]
    hue[(maxc == b) & mask] = ((r - g) / safe_delta + 4)[(maxc == b) & mask]
    hue /= 6.0

    safe_max = np.where(maxc == 0, 1.0, maxc)
    saturation = np.where(maxc == 0, 0, deltac / safe_max)
    value = maxc
    return np.stack([hue, saturation, value], axis=-1)


def _repeat_score(gray_f: np.ndarray) -> float:
    fft = np.fft.fftshift(np.fft.fft2(gray_f))
    power = np.abs(fft)
    h, w = power.shape
    center_h, center_w = h // 2, w // 2
    power[center_h - 8 : center_h + 8, center_w - 8 : center_w + 8] = 0
    peak = float(power.max())
    mean = float(power.mean() + 1e-6)
    return min(1.0, peak / (mean * 25.0))


def _directionality_score(gray_f: np.ndarray) -> float:
    gx = np.gradient(gray_f, axis=1)
    gy = np.gradient(gray_f, axis=0)
    angles = np.arctan2(gy, gx)
    hist, _ = np.histogram(angles, bins=12, range=(-np.pi, np.pi), density=True)
    return float(hist.max())


def _straight_edge_ratio(image: np.ndarray) -> float:
    gray = np.dot(image[..., :3], [0.299, 0.587, 0.114]).astype(np.float32) / 255.0
    edges = canny(gray, sigma=1.6)
    lines = probabilistic_hough_line(edges, threshold=10, line_length=25, line_gap=6)
    edge_pixels = float(edges.sum())
    if edge_pixels == 0:
        return 0.0

    line_pixels = 0.0
    for line in lines:
        (x1, y1), (x2, y2) = line
        line_pixels += float(np.hypot(x2 - x1, y2 - y1))

    return min(1.0, line_pixels / (edge_pixels + 1e-6))
