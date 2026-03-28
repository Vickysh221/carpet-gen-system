from pathlib import Path
import json
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://fuli-plus.com"
LIST_PAGES = [f"{BASE}/product/page/{i}" for i in range(3, 9)]  # approx items 51-200
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "products-extra-fixed"
META_FILE = ROOT / "src" / "core" / "assets" / "generated" / "productAssetExtraFixedIndex.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def clean_title(text: str, fallback: str) -> str:
    text = " ".join(text.split())
    text = re.sub(r"\s+", " ", text).strip()
    return text or fallback


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\-\u4e00-\u9fff]+", "_", value.strip())
    value = re.sub(r"_+", "_", value).strip("_")
    return value[:80] or "fuli_product"


def fetch_product_entries(session: requests.Session):
    entries = []
    seen = set()
    for page_url in LIST_PAGES:
        html = session.get(page_url, headers=HEADERS, timeout=30).text
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/product/") and href.endswith(".html") and href not in seen:
                seen.add(href)
                title = clean_title(a.get_text(" ", strip=True), href.rsplit("/", 1)[-1].replace(".html", ""))
                entries.append({
                    "productUrl": urljoin(BASE, href),
                    "title": title,
                })
    return entries


def fetch_main_image(session: requests.Session, product_url: str):
    html = session.get(product_url, headers=HEADERS, timeout=30).text
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    selectors = [
        ".buyB-c img",
        ".buyB-d img",
        ".buyB .swiper-slide img",
    ]
    for selector in selectors:
        for img in soup.select(selector):
            src = img.get("src") or img.get("data-src")
            if not src:
                continue
            if src.startswith("/profile/upload/"):
                full = urljoin(BASE, src)
                if full not in candidates:
                    candidates.append(full)
    return candidates[0] if candidates else None


def download_file(session: requests.Session, url: str, target: Path):
    r = session.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    target.write_bytes(r.content)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    entries = fetch_product_entries(session)
    records = []
    for index, entry in enumerate(entries, start=51):
        img_url = fetch_main_image(session, entry["productUrl"])
        if not img_url:
            continue
        ext = Path(img_url).suffix or ".jpg"
        filename = f"{index:03d}_{slugify(entry['title'])}{ext}"
        target = OUT_DIR / filename
        if not target.exists():
            download_file(session, img_url, target)
            time.sleep(0.2)
        records.append({
            "imageId": filename,
            "title": entry["title"],
            "imageUrl": f"/products-extra-fixed/{filename}",
            "filename": filename,
            "sourceUrl": entry["productUrl"],
            "remoteImageUrl": img_url,
        })
        print(f"[{index}] {entry['title']} -> {filename}")
    META_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(records)} records to {META_FILE}")


if __name__ == "__main__":
    main()
