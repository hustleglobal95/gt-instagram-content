#!/usr/bin/env python3
"""
Growth Terminal — Instagram auto-poster connector
(Instagram API with Instagram Login — graph.instagram.com, no Facebook Page)
Reads GT_-prefixed secrets so it won't collide with anything else in this Repl.
Safe by default: GT_DRY_RUN is on until you set it to 0.
"""
import os, sys, json, time, datetime, textwrap
import requests
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None
import state

def gv(name, default=""):
    return os.environ.get("GT_" + name, default)

API_BASE     = (gv("API_BASE", "https://graph.instagram.com") or "https://graph.instagram.com").rstrip("/")
WAIT_SECONDS = int(gv("WAIT_SECONDS", "10") or "10")

IG_USER_ID   = gv("IG_USER_ID").strip()
TOKEN        = gv("IG_ACCESS_TOKEN").strip()
REPO         = gv("GITHUB_REPO").strip()
BRANCH       = (gv("GITHUB_BRANCH", "main") or "main").strip()
QUEUE_PATH   = (gv("QUEUE_PATH", "queue.json") or "queue.json").strip()
TZ_NAME      = (gv("TIMEZONE", "America/New_York") or "America/New_York").strip()
MAX_PER_RUN  = int(gv("MAX_PER_RUN", "3") or "3")
APPEND_TAGS  = gv("APPEND_HASHTAGS", "1") != "0"
TAGS_AS_COMMENT = gv("HASHTAGS_AS_COMMENT", "0") == "1"
DRY_RUN      = gv("DRY_RUN", "1") != "0"

RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"

def tz():
    return ZoneInfo(TZ_NAME) if ZoneInfo else datetime.timezone.utc

def raw_url(path):
    return f"{RAW}/{str(path).lstrip('/')}"

def fetch_queue():
    r = requests.get(f"{RAW}/{QUEUE_PATH}", timeout=30)
    r.raise_for_status()
    return r.json()

def is_due(post, now):
    d = post.get("scheduled_date")
    t = post.get("scheduled_time") or "09:00"
    if not d:
        return False
    try:
        dt = datetime.datetime.fromisoformat(f"{d}T{t}:00").replace(tzinfo=tz())
    except ValueError:
        return False
    return now >= dt

def build_caption(post):
    cap = (post.get("caption") or "").rstrip()
    if APPEND_TAGS and not TAGS_AS_COMMENT and post.get("hashtags"):
        cap = cap + "\n\n" + post["hashtags"]
    return cap

def _api_post(path, data):
    data = dict(data, access_token=TOKEN)
    r = requests.post(f"{API_BASE}/{path}", data=data, timeout=90)
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"non-JSON response ({r.status_code}): {r.text[:300]}")
    if "error" in j:
        raise RuntimeError(f"IG API error: {j['error'].get('message')} ({j['error'].get('code')})")
    return j

def publish_single(image_url, caption):
    c = _api_post(f"{IG_USER_ID}/media", {"image_url": image_url, "caption": caption})
    time.sleep(WAIT_SECONDS)
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": c["id"]})
    return pub["id"]

def publish_carousel(image_urls, caption):
    children = []
    for u in image_urls:
        c = _api_post(f"{IG_USER_ID}/media", {"image_url": u, "is_carousel_item": "true"})
        children.append(c["id"])
    time.sleep(WAIT_SECONDS)
    cont = _api_post(f"{IG_USER_ID}/media",
                     {"media_type": "CAROUSEL", "children": ",".join(children), "caption": caption})
    time.sleep(WAIT_SECONDS)
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": cont["id"]})
    return pub["id"]

def post_comment(media_id, message):
    if not message:
        return
    try:
        _api_post(f"{media_id}/comments", {"message": message})
    except Exception as e:
        print(f"    (first comment failed — needs instagram_business_manage_comments scope; non-fatal: {e})")

def media_urls(post):
    if post.get("media_files"):
        return [raw_url(x.strip()) for x in str(post["media_files"]).split(",") if x.strip()]
    return [raw_url(post["media_file"])]

def run():
    missing = [k for k, v in {"GT_IG_USER_ID": IG_USER_ID, "GT_IG_ACCESS_TOKEN": TOKEN, "GT_GITHUB_REPO": REPO}.items() if not v]
    if missing:
        print(f"✗ Missing required secrets: {', '.join(missing)}.")
        sys.exit(1)
    now = datetime.datetime.now(tz())
    queue = fetch_queue()
    posted = state.load()
    due = [p for p in queue
           if p.get("status") == "ready" and p.get("id") not in posted and is_due(p, now)]
    due.sort(key=lambda p: (p.get("scheduled_date", ""), p.get("scheduled_time", "")))
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    print(f"[{now:%Y-%m-%d %H:%M %Z}] {mode} · {len(due)} due of {len(queue)} in queue")
    published = 0
    for p in due:
        if published >= MAX_PER_RUN:
            print(f"  reached MAX_PER_RUN={MAX_PER_RUN}, stopping this run")
            break
        urls = media_urls(p)
        caption = build_caption(p)
        kind = "carousel" if (p.get("post_type") == "carousel" and len(urls) > 1) else "single"
        print(f"  → {p['id']} [{kind}] {urls[0]}")
        if DRY_RUN:
            print(f"     [dry-run] would publish. caption: {textwrap.shorten(caption, 80)}")
            continue
        try:
            mid = publish_carousel(urls, caption) if kind == "carousel" else publish_single(urls[0], caption)
            comment = p.get("first_comment") or (p.get("hashtags") if TAGS_AS_COMMENT else "")
            post_comment(mid, comment)
            posted[p["id"]] = {"media_id": mid, "at": datetime.datetime.utcnow().isoformat() + "Z"}
            state.save(posted)
            print(f"     ✓ published as {mid}")
            published += 1
            time.sleep(5)
        except Exception as e:
            print(f"     ✗ failed: {e}")
    if DRY_RUN and due:
        print("\nSet GT_DRY_RUN=0 in Secrets to publish for real.")
    print("done.")

if __name__ == "__main__":
    run()
