#!/usr/bin/env python3
"""
Growth Terminal, publish the freshly-generated carousel to Instagram.

Runs right after carousel_generate.js in the daily carousel workflow. It:
  1. Reads carousel_meta.json (written by carousel_generate.js).
  2. Waits for every just-committed panel to be live on its public raw URL.
  3. Publishes the carousel via the Instagram Graph API. Three steps, not two:
       a. one container per panel with is_carousel_item=true
       b. one CAROUSEL container listing those children plus the caption
       c. media_publish on the carousel container
  4. Posts the first comment (optional, non-fatal).
  5. Mirrors the same panels to the Facebook Page as a multi-photo post.
  6. Appends a record to posted_log.json (committed back for an audit trail).

Deliberate differences from post_now.py:
  - It refuses to publish a partial carousel. If any panel container fails, the
    whole run fails rather than posting three slides of a five slide argument.
  - It reads carousel_meta.json, never meta.json, so it can never race the
    4x/day single-image poster or publish that poster's image by accident.

No credentials live in this file. The access token comes from the environment
(GitHub repository secrets). DRY_RUN is on by default so a misconfig cannot post.

Secrets it reads (all prefixed GT_ so they never collide with other projects):
  GT_IG_USER_ID       - Instagram Business Account ID (required)
  GT_IG_ACCESS_TOKEN  - long-lived token (required)
  GT_GITHUB_REPO      - owner/repo holding the creatives (required)
  GT_GITHUB_BRANCH    - default: main
  GT_API_BASE         - default: https://graph.instagram.com
                        (Facebook-Page route: https://graph.facebook.com/v21.0)
  GT_APPEND_HASHTAGS  - default 1: append hashtags to the caption
  GT_HASHTAGS_AS_COMMENT - default 0: 1 = post hashtags as the first comment
  GT_DRY_RUN          - default 1: keep 1 to test, set 0 to publish for real
"""
import os, sys, json, time, datetime
import requests


def gv(name, default=""):
    return os.environ.get("GT_" + name, default)


API_BASE   = (gv("API_BASE", "https://graph.instagram.com") or "https://graph.instagram.com").rstrip("/")
IG_USER_ID = gv("IG_USER_ID").strip()
TOKEN      = gv("IG_ACCESS_TOKEN").strip()
REPO       = gv("GITHUB_REPO").strip()
BRANCH     = (gv("GITHUB_BRANCH", "main") or "main").strip()
APPEND_TAGS = gv("APPEND_HASHTAGS", "1") != "0"
TAGS_AS_COMMENT = gv("HASHTAGS_AS_COMMENT", "0") == "1"
DRY_RUN    = gv("DRY_RUN", "1") != "0"
WAIT_SECONDS = int(gv("WAIT_SECONDS", "10") or "10")

# Facebook Page publishing (optional, enabled automatically if creds are present).
FB_API_BASE = (gv("FB_API_BASE", "https://graph.facebook.com/v21.0") or "https://graph.facebook.com/v21.0").rstrip("/")
FB_PAGE_ID  = gv("FB_PAGE_ID").strip()
FB_TOKEN    = gv("FB_PAGE_ACCESS_TOKEN").strip()
FB_INCLUDE_HASHTAGS = gv("FB_HASHTAGS", "0") == "1"
FB_ENABLED  = gv("FB_ENABLED", "1") != "0" and bool(FB_PAGE_ID and FB_TOKEN)

RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
STATE_FILE = "posted_log.json"
META_FILE = "carousel_meta.json"

# Instagram allows 2 to 10 items in a carousel. Anything outside that is a bug
# in the generator, and it is cheaper to catch it here than to burn an API call.
MIN_PANELS, MAX_PANELS = 2, 10


def raw_url(path):
    # cache-buster so a fresh commit is not served stale by the CDN
    return f"{RAW}/{str(path).lstrip('/')}?t={int(time.time())}"


def wait_for_url(url, tries=12, delay=5):
    """After a git push, the raw URL can take a few seconds to go live."""
    for i in range(tries):
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200 and int(r.headers.get("content-length", "1") or "1") > 0:
                return True
        except Exception:
            pass
        print(f"    waiting for panel to be live ({i + 1}/{tries})...")
        time.sleep(delay)
    return False


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


def publish_carousel(image_urls, caption):
    """Three-step carousel publish. Every child must succeed before step two,
    because a carousel that drops slides argues a different point than the one
    that was written."""
    children = []
    for i, url in enumerate(image_urls):
        c = _api_post(f"{IG_USER_ID}/media",
                      {"image_url": url, "is_carousel_item": "true"})
        cid = c.get("id")
        if not cid:
            raise RuntimeError(f"panel {i + 1} returned no container id: {c}")
        children.append(cid)
        print(f"    panel {i + 1}/{len(image_urls)} container {cid}")

    if len(children) != len(image_urls):
        raise RuntimeError("container count does not match panel count, refusing to publish a partial carousel")

    time.sleep(WAIT_SECONDS)  # let IG finish processing every child image
    car = _api_post(f"{IG_USER_ID}/media",
                    {"media_type": "CAROUSEL", "children": ",".join(children), "caption": caption})
    car_id = car.get("id")
    if not car_id:
        raise RuntimeError(f"carousel container returned no id: {car}")
    print(f"    carousel container {car_id}")

    time.sleep(WAIT_SECONDS)
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": car_id})
    return pub["id"]


def post_comment(media_id, message):
    if not message:
        return
    try:
        _api_post(f"{media_id}/comments", {"message": message})
    except Exception as e:
        print(f"    (first comment skipped, needs manage_comments scope; non-fatal: {e})")


def _fb(path, data):
    r = requests.post(f"{FB_API_BASE}/{path}", data=dict(data, access_token=FB_TOKEN), timeout=90)
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"non-JSON response ({r.status_code}): {r.text[:300]}")
    if "error" in j:
        raise RuntimeError(f"FB API error: {j['error'].get('message')} ({j['error'].get('code')})")
    return j


def publish_facebook_album(image_urls, message):
    """Facebook multi-photo post: upload each photo unpublished, then attach
    them all to a single feed post so the panels stay in order."""
    media_ids = []
    for url in image_urls:
        j = _fb(f"{FB_PAGE_ID}/photos", {"url": url, "published": "false"})
        pid = j.get("id")
        if not pid:
            raise RuntimeError(f"unpublished photo returned no id: {j}")
        media_ids.append(pid)
    data = {"message": message}
    for i, pid in enumerate(media_ids):
        data[f"attached_media[{i}]"] = json.dumps({"media_fbid": pid})
    j = _fb(f"{FB_PAGE_ID}/feed", data)
    return j.get("post_id") or j.get("id")


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state[-500:], f, indent=2)


def build_caption(meta):
    cap = (meta.get("caption") or "").rstrip()
    if APPEND_TAGS and not TAGS_AS_COMMENT and meta.get("hashtags"):
        cap = cap + "\n\n" + meta["hashtags"]
    return cap


def main():
    missing = [k for k, v in {"GT_IG_USER_ID": IG_USER_ID, "GT_IG_ACCESS_TOKEN": TOKEN,
                              "GT_GITHUB_REPO": REPO}.items() if not v]
    if missing:
        print(f"x Missing required secrets: {', '.join(missing)}.")
        sys.exit(1)

    try:
        with open(META_FILE) as f:
            meta = json.load(f)
    except Exception as e:
        print(f"x Could not read {META_FILE} (did carousel_generate.js run?): {e}")
        sys.exit(1)

    files = meta.get("media_files") or []
    if not isinstance(files, list) or not (MIN_PANELS <= len(files) <= MAX_PANELS):
        print(f"x carousel_meta.json lists {len(files)} panels. Instagram accepts "
              f"{MIN_PANELS} to {MAX_PANELS}. Refusing to publish.")
        sys.exit(1)

    caption = build_caption(meta)
    comment = meta.get("first_comment") or (meta.get("hashtags") if TAGS_AS_COMMENT else "")
    fb_message = (meta.get("caption") or "").rstrip()
    if FB_INCLUDE_HASHTAGS and meta.get("hashtags"):
        fb_message = fb_message + "\n\n" + meta["hashtags"]

    urls = [raw_url(f) for f in files]
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    now = datetime.datetime.utcnow().isoformat() + "Z"
    targets = "Instagram carousel" + (" + Facebook album" if FB_ENABLED else "")
    print(f"[{now}] {mode} - publishing {len(files)} panels [{meta.get('layout')}] -> {targets}")
    for u in urls:
        print(f"  panel: {u}")
    print(f"  caption: {caption[:90].replace(chr(10), ' ')}...")

    if DRY_RUN:
        print(f"  [dry-run] would publish to {targets}. Set GT_DRY_RUN=0 to go live.")
        return

    # Every panel must be live before the first API call. Publishing a carousel
    # whose third slide 404s is worse than not publishing at all.
    for u in urls:
        if not wait_for_url(u):
            print(f"x Panel URL never went live: {u}")
            print("  Is the repo public, and were the panels committed before this step?")
            sys.exit(1)

    ig_id = fb_id = None

    try:
        ig_id = publish_carousel(urls, caption)
        post_comment(ig_id, comment)
        print(f"  ok Instagram carousel published as {ig_id}")
    except Exception as e:
        print(f"  x Instagram carousel failed: {e}")

    if FB_ENABLED:
        try:
            fb_id = publish_facebook_album(urls, fb_message)
            print(f"  ok Facebook album published as {fb_id}")
        except Exception as e:
            print(f"  x Facebook failed (non-fatal): {e}")
    else:
        print("  . Facebook disabled (set GT_FB_PAGE_ID + GT_FB_PAGE_ACCESS_TOKEN to enable)")

    if ig_id or fb_id:
        state = load_state()
        state.append({"media_id": ig_id, "fb_post_id": fb_id, "at": now,
                      "file": files[0], "media_files": files,
                      "is_reel": False, "is_carousel": True, "panels": len(files),
                      "layout": meta.get("layout"), "sig": meta.get("sig"),
                      "caption": meta.get("caption", ""), "hashtags": meta.get("hashtags", ""),
                      "first_comment": meta.get("first_comment", "")})
        save_state(state)

    if not ig_id:
        print("  x Instagram did not publish, failing the run.")
        sys.exit(1)

    print("done.")


if __name__ == "__main__":
    main()
