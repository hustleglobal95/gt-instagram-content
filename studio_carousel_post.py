#!/usr/bin/env python3
"""
Growth Terminal, publish the next approved studio carousel to Instagram (@markusreidgt).

The only source is studio_carousels.json: carousels the owner approved on
29 September 2026, in posting order. Each run publishes the next one that is not
in studio_carousels_used.json, then records it there so it can never post twice.
There is no loop. When every carousel has run, the job says so and posts nothing.

Before anything is sent it checks that the carousel has 2 to 10 slides, that every
slide is committed, that the caption shows no price and no banned dash, and that
every slide is live on its public raw URL. Publishing reuses carousel_post.py, which
refuses to publish a partial carousel.

Environment (same GitHub secrets as the other Instagram workflows):
  GT_IG_USER_ID, GT_IG_ACCESS_TOKEN, GT_GITHUB_REPO, GT_API_BASE
  GT_DRY_RUN  1 = run every check, publish nothing, record nothing
"""
import datetime
import json
import pathlib
import re
import sys

import carousel_post as cp
from price_guard import refuse_if_price

QUEUE = "studio_carousels.json"
USED = "studio_carousels_used.json"


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
    nxt = next((c for c in queue["carousels"] if c["id"] not in used_ids), None)
    if nxt is None:
        print("Every approved carousel has been posted. There is no loop, so nothing runs today.")
        return 0

    # Marketing quality gate. Future queue entries fail closed unless the owner
    # has explicitly approved them and they are image-led. This prevents the
    # autoposter from drifting back to generic text-card campaigns.
    if nxt.get("approved") is not True:
        refuse(f"{nxt.get('id', '<unknown>')} is not explicitly approved.")
    if nxt.get("visual_mode") != "image-led":
        refuse(f"{nxt['id']} is not image-led.")
    if not str(nxt.get("source_project", "")).strip():
        refuse(f"{nxt['id']} has no source_project.")
    if not str(nxt.get("campaign_goal", "")).strip():
        refuse(f"{nxt['id']} has no campaign_goal.")

    slides = [f"{nxt['dir']}/{s}" for s in nxt["slides"]]
    if len(slides) < 3:
        refuse(f"{nxt['id']} has fewer than 3 slides; curated marketing campaigns require at least 3.")
    if not cp.MIN_PANELS <= len(slides) <= cp.MAX_PANELS:
        refuse(f"{nxt['id']} has {len(slides)} slides; Instagram accepts {cp.MIN_PANELS} to {cp.MAX_PANELS}.")
    missing = [s for s in slides if not pathlib.Path(s).exists()]
    if missing:
        refuse(f"{nxt['id']} names slides that are not in the repo: {missing}")
    caption = nxt["caption"].strip()
    refuse_if_price("caption", caption)
    if re.search("[–—]", caption):
        refuse(f"{nxt['id']} caption contains a dash that is banned on every Growth Terminal surface.")

    print(f"Next approved carousel: {nxt['id']} ({len(slides)} slides)")
    print("  caption: " + caption.splitlines()[0])
    if not cp.IG_USER_ID or not cp.TOKEN or not cp.REPO:
        refuse("GT_IG_USER_ID, GT_IG_ACCESS_TOKEN and GT_GITHUB_REPO must all be set.")

    urls = [cp.raw_url(s) for s in slides]
    for u in urls:
        if not cp.wait_for_url(u):
            refuse(f"slide is not live at {u}")
    print(f"  all {len(urls)} slides are live on {cp.RAW}")

    if cp.DRY_RUN:
        print("[DRY RUN] every check passed. Nothing published, nothing recorded.")
        return 0

    media_id = cp.publish_carousel(urls, caption)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    print(f"  published {nxt['id']} as Instagram media {media_id}")

    used.append({"id": nxt["id"], "at": now, "media_id": media_id})
    with open(USED, "w") as f:
        json.dump(used, f, indent=2)
        f.write("\n")
    log = load(cp.STATE_FILE, [])
    log.append({"media_id": media_id, "at": now, "file": slides[0], "is_carousel": True,
                "carousel": nxt["id"], "slides": slides, "caption": caption, "sig": f"studio:{nxt['id']}"})
    cp.save_state(log)
    return 0


if __name__ == "__main__":
    sys.exit(main())
