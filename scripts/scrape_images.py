#!/usr/bin/env python3
"""
Scrape carpet product images from fuli-plus.com/product.
Uses stdlib only: urllib, html.parser, json, pathlib.
"""

import json
import os
import time
import urllib.request
import urllib.error
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

TARGET_URL = "https://fuli-plus.com/product"
OUTPUT_DIR = Path(__file__).parent / "scraped_images"
METADATA_FILE = OUTPUT_DIR / "metadata.json"
UPLOAD_PATH_FRAGMENT = "/profile/upload/"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class ImageParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.images: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple]):
        if tag != "img":
            return
        attr_dict = dict(attrs)
        src = attr_dict.get("src") or attr_dict.get("data-src") or ""
        alt = attr_dict.get("alt", "")

        if UPLOAD_PATH_FRAGMENT not in src:
            return

        # Resolve relative URLs
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = urljoin(self.base_url, src)

        # Strip thumbnail prefix to get full-size URL
        parsed = urlparse(src)
        path_parts = parsed.path.split("/")
        filename_part = path_parts[-1] if path_parts else ""
        if filename_part.startswith("thumbnail."):
            full_filename = filename_part[len("thumbnail."):]
            path_parts[-1] = full_filename
            from urllib.parse import urlunparse
            full_path = "/".join(path_parts)
            src = urlunparse((parsed.scheme, parsed.netloc, full_path, "", "", ""))
            filename = full_filename
        else:
            filename = filename_part

        if not filename:
            return

        self.images.append({"src": src, "alt": alt, "filename": filename})


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        charset = resp.headers.get_content_charset("utf-8")
        return resp.read().decode(charset, errors="replace")


def download_image(url: str, dest: Path) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest.write_bytes(resp.read())
        return True
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {url}")
        return False
    except Exception as e:
        print(f"  Error downloading {url}: {e}")
        return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing metadata to deduplicate
    existing: dict[str, dict] = {}
    if METADATA_FILE.exists():
        with open(METADATA_FILE) as f:
            for entry in json.load(f):
                existing[entry["filename"]] = entry

    print(f"Fetching {TARGET_URL} ...")
    try:
        html = fetch_html(TARGET_URL)
    except Exception as e:
        print(f"Failed to fetch page: {e}")
        return

    parser = ImageParser(TARGET_URL)
    parser.feed(html)

    # Deduplicate by filename
    seen_filenames: set[str] = set()
    unique_images: list[dict] = []
    for img in parser.images:
        if img["filename"] not in seen_filenames:
            seen_filenames.add(img["filename"])
            unique_images.append(img)

    print(f"Found {len(unique_images)} unique images.")

    metadata: list[dict] = list(existing.values())
    new_count = 0

    for idx, img in enumerate(unique_images, 1):
        filename = img["filename"]
        dest = OUTPUT_DIR / filename

        if filename in existing:
            print(f"[{idx}/{len(unique_images)}] Skip (exists): {filename}")
            continue

        print(f"[{idx}/{len(unique_images)}] Downloading: {filename} ...")
        success = download_image(img["src"], dest)
        if success:
            entry = {
                "id": f"scraped-{idx:04d}",
                "filename": filename,
                "url": img["src"],
                "alt": img["alt"],
            }
            metadata.append(entry)
            existing[filename] = entry
            new_count += 1
            print(f"  Saved to {dest}")
        time.sleep(0.5)  # Polite delay

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Downloaded {new_count} new images. Total: {len(metadata)}.")
    print(f"Metadata written to {METADATA_FILE}")


if __name__ == "__main__":
    main()
