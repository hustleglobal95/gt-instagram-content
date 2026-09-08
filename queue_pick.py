#!/usr/bin/env python3
"""Publish from the approved ad queue instead of generating a fresh creative.

generate.js builds a creative from the bank every run. That is right for the
daily rotation and wrong for a set of ads that were drawn by hand and signed
off. This picks the next unused entry from ads_queue.json, writes the meta the
publisher reads, and records it as used so it does not repeat.

This is the only source of a post. If it cannot hand over an approved ad it
exits non-zero and the run stops, because the alternative is publishing an old
creative and none of those are ever to appear again.

  GT_STATE_SUFFIX=brand  ->  ads_queue_brand.json / meta_brand.json /
                            used_ads_brand.json

Each account has its own queue, not just its own state. @growthterminal.io sells
the studio's services and must never draw a platform creative, so it reads
ads_queue_brand.json and nothing else.
"""
import json, os, sys, datetime, pathlib

SUFFIX = os.environ.get("GT_STATE_SUFFIX", "").strip()
tag    = ("_" + SUFFIX) if SUFFIX else ""
QUEUE  = "ads_queue%s.json" % tag
META   = "meta%s.json" % tag
USED   = "used_ads%s.json" % tag


def stop(msg):
    """Refuse rather than fall back. Nothing unapproved is ever published."""
    print("REFUSING TO POST: " + msg)
    print("The queue is the only approved source. Add an ad to %s." % QUEUE)
    sys.exit(1)


def main():
    if not pathlib.Path(QUEUE).exists():
        stop("no %s in the repo." % QUEUE)

    queue = json.load(open(QUEUE))
    ads = queue.get("ads", [])
    if not ads:
        stop("%s has no ads in it." % QUEUE)

    used = []
    if pathlib.Path(USED).exists():
        try:
            used = json.load(open(USED))
        except Exception:
            used = []
    used_ids = {u.get("id") for u in used}

    nxt = next((a for a in ads if a["id"] not in used_ids), None)
    if nxt is None:
        if queue.get("loop", True):
            print("Every ad has run once. Starting the rotation again.")
            used, nxt = [], ads[0]
        else:
            stop("every ad has run and looping is switched off.")

    media = nxt["media_file"]
    if not pathlib.Path(media).exists():
        stop("%s is named in the queue but not in the repo." % media)

    meta = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc)
                        .isoformat().replace("+00:00", "Z"),
        "media_file": media,
        "is_reel": False,
        "layout": nxt.get("layout", "statement"),
        "editorial_bg": None, "person": None, "qa": None,
        "caption": nxt["caption"],
        "hashtags": nxt.get("hashtags", ""),
        "first_comment": nxt.get("first_comment", ""),
        "alt_text": nxt.get("alt_text", ""),
        "sig": "queue:%s" % nxt["id"],
    }
    json.dump(meta, open(META, "w"), indent=2, ensure_ascii=False)

    used.append({"id": nxt["id"], "at": meta["generated_at"], "file": media})
    json.dump(used, open(USED, "w"), indent=2, ensure_ascii=False)

    print("Picked %s -> %s" % (nxt["id"], media))
    print("%d of %d in this rotation." % (len(used), len(ads)))


if __name__ == "__main__":
    sys.exit(main())
