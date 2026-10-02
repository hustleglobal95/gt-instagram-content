#!/usr/bin/env python3
"""Validate owner-approved informative Growth Terminal posts."""
import json
import pathlib
import re
import sys

QUEUE = pathlib.Path("studio_carousels.json")
PRICE = re.compile(r"[$€£¥]\s?\d|\b\d[\d,.]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b", re.I)
ALLOWED_TOPICS = {"interactive-websites", "product-launches", "3d-scroll", "product-storytelling"}
ALLOWED_REFERENCES = {"DIGI MONK", "Alex Hormozi"}

def fail(message):
    print("QUEUE INVALID: " + message)
    raise SystemExit(1)

def main():
    try:
        data = json.loads(QUEUE.read_text())
    except Exception as exc:
        fail(f"cannot read {QUEUE}: {exc}")

    if data.get("loop") is not False:
        fail("loop must be false")
    posts = data.get("carousels")
    if not isinstance(posts, list) or not posts:
        fail("carousels must be a non-empty list")

    seen_ids = set()
    seen_files = set()
    for post in posts:
        pid = str(post.get("id", "")).strip()
        if not pid or pid in seen_ids:
            fail(f"missing or duplicate id: {pid!r}")
        seen_ids.add(pid)
        if post.get("approved") is not True:
            fail(f"{pid} is not explicitly approved")
        if post.get("content_type") != "informative":
            fail(f"{pid} must use content_type=informative")
        if post.get("topic") not in ALLOWED_TOPICS:
            fail(f"{pid} has an unsupported business topic")
        refs = set(post.get("references") or [])
        if not refs or not refs.issubset(ALLOWED_REFERENCES):
            fail(f"{pid} may reference only DIGI MONK and Alex Hormozi")
        if post.get("uses_project_assets") is not False:
            fail(f"{pid} must set uses_project_assets=false")
        if post.get("visual_mode") != "image-led":
            fail(f"{pid} must use visual_mode=image-led")
        if not str(post.get("campaign_goal", "")).strip():
            fail(f"{pid} is missing campaign_goal")
        if not str(post.get("lesson", "")).strip():
            fail(f"{pid} is missing lesson")

        if post.get("media_files"):
            slides = [str(s).lstrip("/") for s in post["media_files"]]
        else:
            slides = [str(pathlib.Path(str(post.get("dir", ""))) / str(s)) for s in post.get("slides", [])]
        if not (1 <= len(slides) <= 10):
            fail(f"{pid} must contain 1 to 10 images")
        for slide in slides:
            path = pathlib.Path(slide)
            if not path.is_file():
                fail(f"{pid} references missing image {path}")
            if slide in seen_files:
                fail(f"image reused across future posts: {slide}")
            seen_files.add(slide)

        caption = str(post.get("caption", "")).strip()
        if not caption:
            fail(f"{pid} has no caption")
        if PRICE.search(caption):
            fail(f"{pid} caption shows a price")
        if re.search("[–—]", caption):
            fail(f"{pid} caption contains a banned dash")

    print(f"queue valid: {len(posts)} informative posts / {len(seen_files)} unique images")
    return 0

if __name__ == "__main__":
    sys.exit(main())
