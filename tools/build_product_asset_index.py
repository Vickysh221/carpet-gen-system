from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_DIR = ROOT / "public" / "products"
OUTPUT_DIR = ROOT / "src" / "core" / "assets" / "generated"
OUTPUT_FILE = OUTPUT_DIR / "productAssetIndex.json"


def normalize_title(filename: str) -> str:
    stem = Path(filename).stem
    title = re.sub(r"^thumbnail\.", "", stem)
    title = re.sub(r"_[0-9a-fA-F]{8}$", "", title)
    title = re.sub(r"_[0-9]{8,}A[0-9]+$", "", title)
    title = title.replace("__1__", " ").replace("__", " ")
    title = re.sub(r"_+", " ", title).strip(" _-")
    return title or filename


def main() -> None:
    files = sorted([p for p in PRODUCTS_DIR.iterdir() if p.is_file()])
    records = [
        {
            "imageId": p.name,
            "title": normalize_title(p.name),
            "imageUrl": f"/products/{p.name}",
            "filename": p.name,
        }
        for p in files
    ]
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} records to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
