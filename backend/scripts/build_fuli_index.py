#!/usr/bin/env python3

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.visual_search import ensure_search_index


if __name__ == "__main__":
    result = ensure_search_index()
    print(f"Indexed {result['indexed']} images with dimension {result['dimension']}.")
