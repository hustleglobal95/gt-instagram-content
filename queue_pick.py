#!/usr/bin/env python3
"""Publish from the approved ad queue instead of generating a fresh creative.

generate.js builds a creative from the bank every run. That is right for the
daily rotation and wrong for a set of ads that were drawn by hand and signed
off. This picks the next unused entry from ads_queue.json, writes the meta the
publisher reads, and records it as used so it does not repeat.

When the queue is empty it says so and exits 0 without writing anything, and
the workflow falls through to generate.js exactly as before. Nothing about the
old path changes.

  GT_STATE_SUFFIX=brand  ->  meta_brand.json / used_ads_brand.json
"""
import json, os, sys, datetime, pathlib

SUFFIX = os.environ.get("GT_STATE_SUFFIX", "").strip()
tag    = ("_" + SUFFIX) if SUFFIX else ""
QUEUE  = "ads_queue.json"
META   = "meta%s.json" % tag
USED   = "used_ads%s.json" % tag


def out(key, value):
    p = os.environ.get("GITHUB_OUTPUT")
    if p:
        with open(p, "a") as f:
            f.write("%s=%s\n" % (key, value))
    print("%s=%s" % (key, value))


def main():
    if not pathlib.Path(QUEUE).exists():
        print("No %s. Falling through to the generator." % QUEUE)
        return out("picked", "false")

    queue = json.load(open(QUEUE))
    ads = queue.get("ads", [])
    if not ads:
        print("Queue is empty. Falling through to the generator.")
        return out("picked", "false")

    used = []
    if pathlib.Path(USED).exists():
        try:
            used = json.load(open(USED))
        except Exception:
            used = []
    used_ids = {u.get("id") for u in used}

    nxt = next((a for a in ads if a["id"] not in used_ids), None)
    if nxt is None:
        if queue.get("loop"):
            print("Every ad used once. Looping, oldest first.")
            used, nxt = [], ads[0]
        else:
            print("Every ad in the queue has run. Falling through to the generator.")
            return out("picked", "false")

    media = nxt["media_file"]
    if not pathlib.Path(media).exists():
        print("MISSING FILE: %s. Falling through rather than posting a broken URL." % media)
        return out("picked", "false")

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
    print("%d of %d used." % (len(used), len(ads)))
    out("picked", "true")


if __name__ == "__main__":
    sys.exit(main())
