#!/usr/bin/env python3
"""Validate Growth Terminal Instagram posts against the conversion design system."""
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image, ImageStat

QUEUE = pathlib.Path("studio_carousels.json")
SYSTEM = pathlib.Path("studio_design_system.json")
APPROVED_MEDIA = pathlib.Path("studio_approved_media.json")
PRICE = re.compile(r"[$€£¥]\s?\d|\b\d[\d,.]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b", re.I)
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


def count_words(value):
    return len(re.findall(r"[A-Za-z0-9']+", str(value or "")))


def validate_image(path, expected_sha, system):
    quality = system["quality_gates"]
    canvas = system["canvas"]
    min_bytes = int(quality["minimum_file_bytes"])
    min_side = int(quality["minimum_side_px"])
    min_contrast = float(quality["minimum_contrast"])

    if not path.is_file():
        fail(f"missing image {path}")
    if path.stat().st_size < min_bytes:
        fail(f"{path} is only {path.stat().st_size} bytes; low-information media is blocked")

    actual_sha = git_blob_sha(path)
    if actual_sha != expected_sha:
        fail(f"{path} does not match its owner-approved blob SHA")

    try:
        with Image.open(path) as im:
            fmt = im.format
            width, height = im.size
            if fmt not in ALLOWED_FORMATS:
                fail(f"{path} has unsupported format {fmt}")
            if width < min_side or height < min_side:
                fail(f"{path} is {width}x{height}; both sides must be at least {min_side}px")
            target_ratio = float(canvas["feed_width"]) / float(canvas["feed_height"])
            actual_ratio = float(width) / float(height)
            if abs(actual_ratio - target_ratio) > 0.015:
                fail(f"{path} is {width}x{height}; feed artwork must stay at 4:5")
            gray = im.convert("L").resize((128, 128))
            contrast = float(ImageStat.Stat(gray).stddev[0])
            if contrast < min_contrast:
                fail(f"{path} is visually too flat/sparse (contrast {contrast:.1f})")
    except SystemExit:
        raise
    except Exception as exc:
        fail(f"cannot decode {path}: {exc}")

    return width, height, path.stat().st_size


def main():
    queue = load_json(QUEUE)
    system = load_json(SYSTEM)
    approved_data = load_json(APPROVED_MEDIA)
    approved = approved_data.get("media") or {}

    if queue.get("loop") is not False:
        fail("loop must be false")
    posts = queue.get("carousels")
    if not isinstance(posts, list):
        fail("carousels must be a list")

    # Empty is a valid safe state. A green idle workflow is better than publishing filler.
    if not posts:
        print("queue valid: 0 posts. Conversion publisher is safely idle until new artwork is approved.")
        return 0

    services = set(system.get("services") or [])
    archetypes = set((system.get("archetypes") or {}).keys())
    allowed_goals = set(system["conversion"]["allowed_goals"])
    allowed_ctas = set(system["conversion"]["allowed_ctas"])
    max_hook_words = int(system["type"]["display"]["max_words"])
    max_hook_lines = int(system["type"]["display"]["max_lines"])
    max_support_words = int(system["type"]["support"]["max_words"])

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
            fail(f"{pid} must use content_type=marketing; generic informative posts are retired")
        if post.get("visual_mode") != "image-led":
            fail(f"{pid} must use visual_mode=image-led")

        archetype = str(post.get("archetype", "")).strip()
        buyer = str(post.get("buyer", "")).strip()
        service = str(post.get("service", "")).strip()
        hook = str(post.get("hook", "")).strip()
        support = str(post.get("support", "")).strip()
        cta = str(post.get("cta", "")).strip()
        goal = str(post.get("conversion_goal", "")).strip()
        concept = str(post.get("visual_concept", "")).strip()
        campaign_key = str(post.get("campaign_key", "")).strip()

        if archetype not in archetypes:
            fail(f"{pid} has unsupported archetype {archetype!r}")
        if not buyer:
            fail(f"{pid} has no buyer")
        if service not in services:
            fail(f"{pid} has unsupported service {service!r}")
        if not hook or count_words(hook) > max_hook_words:
            fail(f"{pid} hook must be present and at most {max_hook_words} words")
        if hook.count("\n") + 1 > max_hook_lines:
            fail(f"{pid} hook exceeds {max_hook_lines} lines")
        if support and count_words(support) > max_support_words:
            fail(f"{pid} support exceeds {max_support_words} words")
        if cta not in allowed_ctas:
            fail(f"{pid} CTA {cta!r} is not in the conversion system")
        if goal not in allowed_goals:
            fail(f"{pid} conversion_goal {goal!r} is not allowed")
        if not concept:
            fail(f"{pid} has no visual_concept")
        if not campaign_key:
            fail(f"{pid} has no campaign_key")
        if post.get("media_urls"):
            fail(f"{pid} uses remote media; only owner-approved repo files may publish")

        caption = str(post.get("caption", "")).strip()
        if not caption:
            fail(f"{pid} has no caption")
        if PRICE.search(caption):
            fail(f"{pid} caption shows a price")
        if re.search("[–—]", caption):
            fail(f"{pid} caption contains a banned dash")
        if cta.lower() not in caption.lower():
            fail(f"{pid} caption must repeat the artwork CTA")

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
            width, height, size = validate_image(pathlib.Path(key), expected_sha, system)
            print(f"verified media: {key} ({width}x{height}, {size} bytes)")

        print(f"verified conversion brief: {pid} / {archetype} / {service} / {goal}")

    print(f"queue valid: {len(posts)} conversion-ready post(s) / {len(seen_media)} unique image(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
