#!/usr/bin/env python3
"""
Growth Terminal, collect engagement for published posts (Instagram + Facebook).

Reads posted_log.json (written by post_now.py, which already stored each post's
Instagram media_id, Facebook post_id, layout, and sig), pulls current engagement
from the Graph APIs, and writes performance_log.json, keyed so the dashboard can
rank which creatives and which formats performed best.

No credentials in this file. Same secrets as the poster:
  GT_IG_ACCESS_TOKEN        long-lived IG token (required for IG numbers)
  GT_API_BASE               default https://graph.instagram.com
  GT_FB_PAGE_ACCESS_TOKEN   Page token (required for FB numbers)
  GT_FB_API_BASE            default https://graph.facebook.com/v21.0
  GT_INSIGHTS_LOOKBACK      how many recent posts to refresh (default 150)

Engagement is public-interaction counts: IG likes+comments (+saves+shares+reach
when the token has insights permission), FB reactions+comments+shares (+reach).
Insights calls are wrapped so a missing permission degrades gracefully to
likes+comments instead of failing the run.
"""
import os, json, time, datetime
import requests


def gv(name, default=""):
    return os.environ.get("GT_" + name, default)


IG_API   = (gv("API_BASE", "https://graph.instagram.com") or "https://graph.instagram.com").rstrip("/")
IG_TOKEN = gv("IG_ACCESS_TOKEN").strip()
FB_API   = (gv("FB_API_BASE", "https://graph.facebook.com/v21.0") or "https://graph.facebook.com/v21.0").rstrip("/")
FB_TOKEN = gv("FB_PAGE_ACCESS_TOKEN").strip()
LOOKBACK = int(gv("INSIGHTS_LOOKBACK", "150") or "150")

IG_ERRORS = []
FB_ERRORS = []

POSTED_FILE = "posted_log.json"
OUT_FILE    = "performance_log.json"


def _get(base, path, params):
    try:
        r = requests.get(f"{base}/{path}", params=params, timeout=45)
        j = r.json()
    except Exception as e:
        return {"error": {"message": str(e)}}
    return j


def ig_metrics(media_id, is_reel):
    """Base counts always; insights (reach/saved/shares) best-effort."""
    out = {"likes": 0, "comments": 0, "saved": 0, "shares": 0, "reach": 0, "permalink": ""}
    base = _get(IG_API, media_id, {"fields": "like_count,comments_count,permalink", "access_token": IG_TOKEN})
    if "error" in base:
        msg = (base.get("error") or {}).get("message", "unknown error")
        # Loud on purpose. A silent None here is indistinguishable from a post
        # that genuinely got zero engagement, and that lie poisons every
        # downstream weighting decision. Record it so it cannot hide.
        IG_ERRORS.append({"media_id": media_id, "message": msg})
        print("  ig FAILED for %s: %s" % (media_id, msg), flush=True)
        return None
    out["likes"] = int(base.get("like_count") or 0)
    out["comments"] = int(base.get("comments_count") or 0)
    out["permalink"] = base.get("permalink", "")
    # Insights: metric set differs for reels vs feed; both optional.
    metric = "reach,saved,shares" if not is_reel else "reach,saved,shares"
    ins = _get(IG_API, f"{media_id}/insights", {"metric": metric, "access_token": IG_TOKEN})
    if isinstance(ins.get("data"), list):
        for m in ins["data"]:
            name = m.get("name")
            vals = m.get("values") or [{}]
            v = int((vals[0] or {}).get("value") or 0)
            if name in out:
                out[name] = v
    out["engagement"] = out["likes"] + out["comments"] + out["saved"] + out["shares"]
    return out


def fb_metrics(post_id):
    out = {"reactions": 0, "comments": 0, "shares": 0, "reach": 0}
    base = _get(FB_API, post_id, {
        "fields": "reactions.summary(true),comments.summary(true),shares",
        "access_token": FB_TOKEN})
    if "error" in base:
        return None
    out["reactions"] = int((base.get("reactions") or {}).get("summary", {}).get("total_count") or 0)
    out["comments"] = int((base.get("comments") or {}).get("summary", {}).get("total_count") or 0)
    out["shares"] = int((base.get("shares") or {}).get("count") or 0)
    ins = _get(FB_API, f"{post_id}/insights", {"metric": "post_impressions_unique", "access_token": FB_TOKEN})
    if isinstance(ins.get("data"), list) and ins["data"]:
        vals = ins["data"][0].get("values") or [{}]
        out["reach"] = int((vals[0] or {}).get("value") or 0)
    out["engagement"] = out["reactions"] + out["comments"] + out["shares"]
    return out


def main():
    try:
        with open(POSTED_FILE) as f:
            posted = json.load(f)
    except Exception as e:
        print(f"No {POSTED_FILE} to read ({e}); nothing to collect.")
        return

    recent = [p for p in posted if p.get("media_id") or p.get("fb_post_id")][-LOOKBACK:]
    if not recent:
        print("No published posts with ids yet; nothing to collect.")
        # still write an empty file so the dashboard has a valid target
        with open(OUT_FILE, "w") as f:
            json.dump({"updated": datetime.datetime.utcnow().isoformat() + "Z", "posts": []}, f, indent=2)
        return

    rows = []
    for p in recent:
        row = {
            "sig": p.get("sig"), "layout": p.get("layout"), "file": p.get("file"),
            "is_reel": bool(p.get("is_reel")), "at": p.get("at"),
            "caption": (p.get("caption") or "")[:120], "permalink": "",
            "ig": None, "fb": None, "engagement": 0,
        }
        if IG_TOKEN and p.get("media_id"):
            row["_ig_attempted"] = True
            ig = ig_metrics(p["media_id"], row["is_reel"])
            if ig:
                row["ig"] = ig
                row["permalink"] = ig.get("permalink", "")
                row["engagement"] += ig.get("engagement", 0)
            time.sleep(0.4)  # be gentle with rate limits
        if FB_TOKEN and p.get("fb_post_id"):
            fb = fb_metrics(p["fb_post_id"])
            if fb:
                row["fb"] = fb
                row["engagement"] += fb.get("engagement", 0)
            time.sleep(0.4)
        rows.append(row)
        print(f"  [{row['layout']}] eng={row['engagement']}  {row['sig']}")

    # Per-format rollup: average engagement by layout, so the dashboard can rank formats.
    fmt = {}
    for r in rows:
        lay = r["layout"] or "unknown"
        d = fmt.setdefault(lay, {"layout": lay, "posts": 0, "engagement": 0,
                                 "ig_engagement": 0, "fb_engagement": 0})
        d["posts"] += 1
        d["engagement"] += r["engagement"]
        d["ig_engagement"] += (r["ig"] or {}).get("engagement", 0)
        d["fb_engagement"] += (r["fb"] or {}).get("engagement", 0)
    for d in fmt.values():
        d["avg_engagement"] = round(d["engagement"] / d["posts"], 1) if d["posts"] else 0

    out = {
        "updated": datetime.datetime.utcnow().isoformat() + "Z",
        "count": len(rows),
        "posts": sorted(rows, key=lambda r: r["engagement"], reverse=True),
        "by_format": sorted(fmt.values(), key=lambda d: d["avg_engagement"], reverse=True),
        # Collection health. Without this, a total API failure and a genuine
        # zero engagement week look identical in the file, and anything that
        # reads this file downstream cannot tell which it is looking at.
        "collection": {
            "ig_attempted": sum(1 for r in rows if r.get("_ig_attempted")),
            "ig_succeeded": sum(1 for r in rows if r.get("ig")),
            "ig_errors": IG_ERRORS[:20],
            "ig_error_count": len(IG_ERRORS),
            "fb_succeeded": sum(1 for r in rows if r.get("fb")),
        },
    }
    with open(OUT_FILE, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {OUT_FILE}: {len(rows)} posts, {len(fmt)} formats.")
    if IG_ERRORS:
        print(f"WARNING: {len(IG_ERRORS)} Instagram lookups failed. "
              f"First: {IG_ERRORS[0]['message']}")
        print("Instagram engagement in this file is NOT reliable until that is fixed.")


if __name__ == "__main__":
    main()
