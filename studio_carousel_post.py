#!/usr/bin/env python3
"""Publish the next owner-approved informative Growth Terminal post to Instagram."""
import datetime
import json
import pathlib
import re
import sys

import carousel_post as cp
import post_now as pn
from price_guard import refuse_if_price

QUEUE = "studio_carousels.json"
USED = "studio_carousels_used.json"
ALLOWED_TOPICS = {"interactive-websites", "product-launches", "3d-scroll", "product-storytelling"}
ALLOWED_REFERENCES = {"DIGI MONK", "Alex Hormozi"}

def refuse(msg):
    print("REFUSING TO POST: " + msg)
    sys.exit(1)

def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default

def main():
    queue = load(QUEUE, None)
    if not queue or not queue.get("carousels"):
        refuse("studio_carousels.json is missing or empty.")
    used = load(USED, [])
    used_ids = {u.get("id") for u in used}
    nxt = next((p for p in queue["carousels"] if p["id"] not in used_ids), None)
    if nxt is None:
        print("Every approved informative post has been published. Nothing runs today.")
        return 0

    pid = nxt.get("id", "<unknown>")
    if nxt.get("approved") is not True:
        refuse(f"{pid} is not explicitly approved.")
    if nxt.get("content_type") != "informative":
        refuse(f"{pid} is not informative.")
    if nxt.get("topic") not in ALLOWED_TOPICS:
        refuse(f"{pid} is outside Growth Terminal's approved business topics.")
    refs = set(nxt.get("references") or [])
    if not refs or not refs.issubset(ALLOWED_REFERENCES):
        refuse(f"{pid} uses an unapproved editorial reference.")
    if nxt.get("uses_project_assets") is not False:
        refuse(f"{pid} uses project assets.")
    if nxt.get("visual_mode") != "image-led":
        refuse(f"{pid} is not image-led.")
    if not str(nxt.get("lesson", "")).strip():
        refuse(f"{pid} has no lesson.")

    if nxt.get("media_files"):
        images = [str(s).lstrip("/") for s in nxt["media_files"]]
    else:
        images = [f"{nxt['dir']}/{s}" for s in nxt["slides"]]
    if not 1 <= len(images) <= 10:
        refuse(f"{pid} has {len(images)} images; expected 1 to 10.")
    missing = [s for s in images if not pathlib.Path(s).exists()]
    if missing:
        refuse(f"{pid} names images that are not in the repo: {missing}")

    caption = nxt["caption"].strip()
    refuse_if_price("caption", caption)
    if re.search("[–—]", caption):
        refuse(f"{pid} caption contains a banned dash.")

    if not cp.IG_USER_ID or not cp.TOKEN or not cp.REPO:
        refuse("GT_IG_USER_ID, GT_IG_ACCESS_TOKEN and GT_GITHUB_REPO must all be set.")

    urls = [cp.raw_url(s) for s in images]
    for url in urls:
        if not cp.wait_for_url(url):
            refuse(f"image is not live at {url}")
    print(f"Next approved informative post: {pid} ({len(images)} image(s))")

    if cp.DRY_RUN:
        print("[DRY RUN] every check passed. Nothing published, nothing recorded.")
        return 0

    if len(urls) == 1:
        media_id = pn.publish_single(urls[0], caption)
    else:
        media_id = cp.publish_carousel(urls, caption)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    used.append({"id": pid, "at": now, "media_id": media_id})
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
        "sig": f"informative:{pid}"
    })
    cp.save_state(log)
    print(f"published {pid} as Instagram media {media_id}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
