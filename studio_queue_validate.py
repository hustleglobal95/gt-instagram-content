#!/usr/bin/env python3
"""Validate the curated Growth Terminal studio marketing queue without secrets."""
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
    cars = data.get("carousels")
    if not isinstance(cars, list) or not cars:
        fail("carousels must be a non-empty list")

    seen_ids = set()
    seen_files = set()
    for car in cars:
        cid = str(car.get("id", "")).strip()
        if not cid or cid in seen_ids:
            fail(f"missing or duplicate id: {cid!r}")
        seen_ids.add(cid)

        if car.get("approved") is not True:
            fail(f"{cid} is not explicitly approved")
        if car.get("content_type") != "informative":
            fail(f"{cid} must use content_type=informative")
        if car.get("topic") not in ALLOWED_TOPICS:
            fail(f"{cid} topic must be one of {sorted(ALLOWED_TOPICS)}")
        refs = set(car.get("references") or [])
        if not refs or not refs.issubset(ALLOWED_REFERENCES):
            fail(f"{cid} references must contain only DIGI MONK and/or Alex Hormozi")
        if car.get("uses_project_assets") is not False:
            fail(f"{cid} must set uses_project_assets=false")
        if car.get("visual_mode") != "image-led":
            fail(f"{cid} must use visual_mode=image-led")
        if not str(car.get("campaign_goal", "")).strip():
            fail(f"{cid} is missing campaign_goal")
        if not str(car.get("lesson", "")).strip():
            fail(f"{cid} is missing lesson")

        slides = car.get("slides")
        if not isinstance(slides, list) or not (3 <= len(slides) <= 10):
            fail(f"{cid} must contain 3 to 10 slides")
        base = pathlib.Path(str(car.get("dir", "")))
        for slide in slides:
            path = base / str(slide)
            if not path.is_file():
                fail(f"{cid} references missing slide {path}")
            key = str(path)
            if key in seen_files:
                fail(f"slide reused across future campaigns: {key}")
            seen_files.add(key)

        caption = str(car.get("caption", "")).strip()
        if not caption:
            fail(f"{cid} has no caption")
        if PRICE.search(caption):
            fail(f"{cid} caption shows a price")
        if re.search("[–—]", caption):
            fail(f"{cid} caption contains a banned dash")

    print(f"queue valid: {len(cars)} informative campaigns / {len(seen_files)} unique slides")
    return 0

if __name__ == "__main__":
    sys.exit(main())
