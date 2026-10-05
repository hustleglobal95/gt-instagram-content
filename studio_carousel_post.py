#!/usr/bin/env python3
"""Publish the next owner-approved Growth Terminal conversion post to Instagram."""
import datetime
import hashlib
import json
import pathlib
import re
import sys

import carousel_post as cp
import post_now as pn
from price_guard import refuse_if_price

QUEUE = "studio_carousels.json"
USED = "studio_carousels_used.json"
APPROVED_MEDIA = "studio_approved_media.json"
SYSTEM = "studio_design_system.json"


def refuse(msg):
    print("REFUSING TO POST: " + msg)
    sys.exit(1)


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def git_blob_sha(path):
    data = pathlib.Path(path).read_bytes()
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("utf-8"))
    h.update(data)
    return h.hexdigest()


def main():
    queue = load(QUEUE, None)
    if queue is None or not isinstance(queue.get("carousels"), list):
        refuse("studio_carousels.json is missing or invalid.")

    if not queue["carousels"]:
        print("Conversion queue is empty. Nothing publishes until a finished visual is owner-approved.")
        return 0

    approved_data = load(APPROVED_MEDIA, None)
    approved_media = (approved_data or {}).get("media")
    if not isinstance(approved_media, dict) or not approved_media:
        refuse("studio_approved_media.json is missing or empty.")

    system = load(SYSTEM, None)
    if not isinstance(system, dict):
        refuse("studio_design_system.json is missing.")

    used = load(USED, [])
    used_ids = {u.get("id") for u in used}
    nxt = next((p for p in queue["carousels"] if p["id"] not in used_ids), None)

    if nxt is None:
        print("Every owner-approved conversion post has been published. Nothing runs today.")
        return 0

    pid = nxt.get("id", "<unknown>")
    required = ["buyer", "service", "archetype", "hook", "cta", "conversion_goal", "visual_concept", "campaign_key"]
    missing = [k for k in required if not str(nxt.get(k, "")).strip()]
    if missing:
        refuse(f"{pid} is missing conversion metadata: {missing}")

    if nxt.get("approved") is not True:
        refuse(f"{pid} is not explicitly approved.")
    if nxt.get("owner_visual_approved") is not True:
        refuse(f"{pid} is missing owner visual approval.")
    if nxt.get("content_type") != "marketing":
        refuse(f"{pid} is not marketing content.")
    if nxt.get("visual_mode") != "image-led":
        refuse(f"{pid} is not image-led.")
    if nxt.get("media_urls"):
        refuse(f"{pid} uses remote media. Remote media is blocked.")

    images = [str(s).lstrip("/") for s in (nxt.get("media_files") or [])]
    if not 1 <= len(images) <= 10:
        refuse(f"{pid} has {len(images)} images; expected 1 to 10.")

    for path in images:
        p = pathlib.Path(path)
        if not p.is_file():
            refuse(f"{pid} names an image that is not in the repo: {path}")
        record = approved_media.get(path)
        if not isinstance(record, dict):
            refuse(f"{pid} references media without owner approval: {path}")
        expected = str(record.get("git_blob_sha", "")).strip()
        if git_blob_sha(path) != expected:
            refuse(f"{pid} media changed after approval: {path}")

    urls = [cp.raw_url(s) for s in images]
    caption = str(nxt.get("caption", "")).strip()
    refuse_if_price("caption", caption)

    if re.search("[–—]", caption):
        refuse(f"{pid} caption contains a banned dash.")

    if not cp.IG_USER_ID or not cp.TOKEN or not cp.REPO:
        refuse("GT_IG_USER_ID, GT_IG_ACCESS_TOKEN and GT_GITHUB_REPO must all be set.")

    for url in urls:
        if not cp.wait_for_url(url):
            refuse(f"image is not live at {url}")

    print(f"Next conversion post: {pid} ({len(urls)} image(s))")

    if cp.DRY_RUN:
        print("[DRY RUN] every check passed. Nothing published, nothing recorded.")
        return 0

    if len(urls) == 1:
        media_id = pn.publish_single(urls[0], caption)
    else:
        media_id = cp.publish_carousel(urls, caption)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    used.append({"id": pid, "at": now, "media_id": media_id, "campaign_key": nxt["campaign_key"]})
    with open(USED, "w") as f:
        json.dump(used, f, indent=2)
        f.write("\n")

    log = load(cp.STATE_FILE, [])
    log.append({
        "media_id": media_id,
        "at": now,
        "file": images[0],
        "is_carousel": len(images) > 1,
        "carousel": pid,
        "slides": images,
        "caption": caption,
        "sig": f"conversion:{pid}",
        "campaign_key": nxt["campaign_key"],
        "archetype": nxt["archetype"],
        "service": nxt["service"],
        "buyer": nxt["buyer"],
        "hook": nxt["hook"],
        "cta": nxt["cta"],
        "conversion_goal": nxt["conversion_goal"]
    })
    cp.save_state(log)

    print(f"published {pid} as Instagram media {media_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
