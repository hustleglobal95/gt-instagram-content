#!/usr/bin/env python3
"""Fail closed unless the Instagram queue contains owner-approved, high-quality local media."""
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image, ImageStat

QUEUE = pathlib.Path("studio_carousels.json")
APPROVED_MEDIA = pathlib.Path("studio_approved_media.json")
PRICE = re.compile(r"[$€£¥]\s?\d|\b\d[\d,.]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b", re.I)
MIN_BYTES = 100_000
MIN_SIDE = 1000
MIN_CONTRAST = 12.0
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def fail(message):
    print("QUEUE INVALID: " + message)
    raise SystemExit(1)


def load_json(path):
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        fail(f"cannot read {path}: {exc}")


def git_blob_sha(path):
    data = path.read_bytes()
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("utf-8"))
    h.update(data)
    return h.hexdigest()


def validate_image(path, expected_sha):
    if not path.is_file():
        fail(f"missing image {path}")
    if path.stat().st_size < MIN_BYTES:
        fail(f"{path} is only {path.stat().st_size} bytes; low-quality media is blocked")

    actual_sha = git_blob_sha(path)
    if actual_sha != expected_sha:
        fail(f"{path} does not match its owner-approved blob SHA")

    try:
        with Image.open(path) as im:
            fmt = im.format
            width, height = im.size
            if fmt not in ALLOWED_FORMATS:
                fail(f"{path} has unsupported format {fmt}")
            if width < MIN_SIDE or height < MIN_SIDE:
                fail(f"{path} is {width}x{height}; both sides must be at least {MIN_SIDE}px")
            gray = im.convert("L").resize((128, 128))
            contrast = float(ImageStat.Stat(gray).stddev[0])
            if contrast < MIN_CONTRAST:
                fail(f"{path} is visually too flat/sparse (contrast {contrast:.1f})")
    except SystemExit:
        raise
    except Exception as exc:
        fail(f"cannot decode {path}: {exc}")

    return width, height, path.stat().st_size


def main():
    data = load_json(QUEUE)
    approved_data = load_json(APPROVED_MEDIA)
    approved = approved_data.get("media")
    if not isinstance(approved, dict) or not approved:
        fail("studio_approved_media.json has no approved media")

    if data.get("loop") is not False:
        fail("loop must be false")
    posts = data.get("carousels")
    if not isinstance(posts, list) or not posts:
        fail("carousels must be a non-empty list")

    seen_ids = set()
    seen_media = set()

    for post in posts:
        pid = str(post.get("id", "")).strip()
        if not pid or pid in seen_ids:
            fail(f"missing or duplicate id: {pid!r}")
        seen_ids.add(pid)

        if post.get("approved") is not True:
            fail(f"{pid} is not explicitly approved")
        if post.get("owner_visual_approved") is not True:
            fail(f"{pid} is missing owner_visual_approved=true")
        if post.get("content_type") != "marketing":
            fail(f"{pid} must use content_type=marketing")
        if post.get("visual_mode") != "image-led":
            fail(f"{pid} must use visual_mode=image-led")
        if not str(post.get("campaign_goal", "")).strip():
            fail(f"{pid} is missing campaign_goal")
        if post.get("media_urls"):
            fail(f"{pid} uses remote media; only owner-approved repo files may publish")

        media = post.get("media_files")
        if not isinstance(media, list) or not (1 <= len(media) <= 10):
            fail(f"{pid} media_files must contain 1 to 10 images")

        for raw_path in media:
            key = str(raw_path).lstrip("/").replace("\\", "/")
            if key in seen_media:
                fail(f"image reused across future posts: {key}")
            seen_media.add(key)

            record = approved.get(key)
            if not isinstance(record, dict):
                fail(f"{pid} references media that is not in the owner approval registry: {key}")
            expected_sha = str(record.get("git_blob_sha", "")).strip()
            if not re.fullmatch(r"[0-9a-f]{40}", expected_sha):
                fail(f"{key} has an invalid approved blob SHA")
            width, height, size = validate_image(pathlib.Path(key), expected_sha)
            print(f"verified media: {key} ({width}x{height}, {size} bytes)")

        caption = str(post.get("caption", "")).strip()
        if not caption:
            fail(f"{pid} has no caption")
        if PRICE.search(caption):
            fail(f"{pid} caption shows a price")
        if re.search("[–—]", caption):
            fail(f"{pid} caption contains a banned dash")

    print(f"queue valid: {len(posts)} owner-approved marketing post(s) / {len(seen_media)} unique image(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
