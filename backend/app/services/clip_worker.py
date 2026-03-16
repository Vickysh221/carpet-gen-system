from __future__ import annotations

import json
import sys
from pathlib import Path

import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from app.core.settings import EMBEDDING_MODEL_NAME


def main() -> None:
    image_paths = [Path(arg) for arg in sys.argv[1:]]
    if not image_paths:
        raise SystemExit("Usage: python -m app.services.clip_worker <image_path> [<image_path> ...]")

    processor = CLIPProcessor.from_pretrained(EMBEDDING_MODEL_NAME)
    model = CLIPModel.from_pretrained(EMBEDDING_MODEL_NAME, use_safetensors=True)
    model.eval()

    embeddings: list[list[float]] = []
    with torch.inference_mode():
        for image_path in image_paths:
            image = Image.open(image_path).convert("RGB")
            inputs = processor(images=image, return_tensors="pt")
            features = model.get_image_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
            embeddings.append(features[0].detach().cpu().tolist())

    json.dump({"embeddings": embeddings}, sys.stdout)


if __name__ == "__main__":
    main()
