#!/usr/bin/env python3
"""
Growth Terminal — publish the freshly-generated post to Instagram.

Runs right after generate.js in the GitHub Actions workflow. It:
  1. Reads meta.json (written by generate.js).
  2. Waits for the just-committed image to be live on its public raw GitHub URL.
  3. Publishes it via the Instagram Graph API (two-step: create container -> publish).
  4. Posts the first comment (optional).
  5. Appends a record to posted_log.json (committed back for an audit trail).

No credentials live in this file. The access token comes from the environment
(GitHub repository secrets). DRY_RUN is on by default so a misconfig can't post.

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
import os, re, sys, json, time, datetime
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

# Facebook Page publishing (optional — enabled automatically if creds are present).
FB_API_BASE = (gv("FB_API_BASE", "https://graph.facebook.com/v21.0") or "https://graph.facebook.com/v21.0").rstrip("/")
AUDIO_NAME = gv("GT_REEL_AUDIO_NAME", "Growth Terminal")
FB_PAGE_ID  = gv("FB_PAGE_ID").strip()
FB_TOKEN    = gv("FB_PAGE_ACCESS_TOKEN").strip()
FB_INCLUDE_HASHTAGS = gv("FB_HASHTAGS", "0") == "1"   # default: no hashtag wall on Facebook
FB_ENABLED  = gv("FB_ENABLED", "1") != "0" and bool(FB_PAGE_ID and FB_TOKEN)

RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
# Per account state. A second Instagram account running this same pipeline would
# otherwise share meta.json and posted_log.json with the first: meta.json is the
# handoff from generate.js, so two concurrent runs race on it, and posted_log.json
# is committed by the workflow, so they conflict on push. GT_STATE_SUFFIX gives
# each account its own files. Unset keeps the original names, so the existing
# account is unaffected.
_SUFFIX = re.sub(r"[^A-Za-z0-9_-]", "", os.environ.get("GT_STATE_SUFFIX", ""))
def _state(base, ext):
    return f"{base}_{_SUFFIX}.{ext}" if _SUFFIX else f"{base}.{ext}"

STATE_FILE = _state("posted_log", "json")
META_FILE = _state("meta", "json")


def raw_url(path):
    # cache-buster so a fresh commit isn't served stale by the CDN
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
        print(f"    waiting for image to be live ({i + 1}/{tries})…")
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


def _api_get(path, params=None):
    params = dict(params or {}, access_token=TOKEN)
    r = requests.get(f"{API_BASE}/{path}", params=params, timeout=60)
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"non-JSON response ({r.status_code}): {r.text[:300]}")
    if "error" in j:
        raise RuntimeError(f"IG API error: {j['error'].get('message')} ({j['error'].get('code')})")
    return j


def publish_single(image_url, caption):
    c = _api_post(f"{IG_USER_ID}/media", {"image_url": image_url, "caption": caption})
    time.sleep(WAIT_SECONDS)  # let IG finish processing the image before publishing
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": c["id"]})
    return pub["id"]


def publish_reel(video_url, caption, cover_url=None):
    """Publish an Instagram Reel. Video is processed asynchronously, so we must
    poll the container until status_code == FINISHED before publishing.

    audio_name names the original audio. Instagram gives no way to attach a
    library track through the publishing API, so the bed is muxed into the mp4
    at render time and this is what it gets called on the post. Naming it means
    the audio is attributable to the account instead of showing as untitled."""
    data = {"media_type": "REELS", "video_url": video_url, "caption": caption, "share_to_feed": "true"}
    if AUDIO_NAME:
        data["audio_name"] = AUDIO_NAME
    if cover_url:
        data["cover_url"] = cover_url
    c = _api_post(f"{IG_USER_ID}/media", data)
    cid = c["id"]
    for i in range(30):  # up to ~30 * WAIT_SECONDS (default 5 min)
        st = _api_get(cid, {"fields": "status_code,status"})
        code = st.get("status_code")
        if code == "FINISHED":
            break
        if code == "ERROR":
            raise RuntimeError(f"Reel processing failed: {st.get('status')}")
        print(f"    reel processing… ({i + 1}/30, {code})")
        time.sleep(WAIT_SECONDS)
    else:
        raise RuntimeError("Reel did not finish processing in time")
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": cid})
    return pub["id"]


def post_comment(media_id, message):
    if not message:
        return
    try:
        _api_post(f"{media_id}/comments", {"message": message})
    except Exception as e:
        print(f"    (first comment skipped — needs manage_comments scope; non-fatal: {e})")


def publish_facebook_photo(image_url, message):
    """Publish a photo post to the Facebook Page. Uses the Page access token."""
    r = requests.post(f"{FB_API_BASE}/{FB_PAGE_ID}/photos",
                      data={"url": image_url, "caption": message, "access_token": FB_TOKEN},
                      timeout=90)
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"non-JSON response ({r.status_code}): {r.text[:300]}")
    if "error" in j:
        raise RuntimeError(f"FB API error: {j['error'].get('message')} ({j['error'].get('code')})")
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
        print(f"✗ Missing required secrets: {', '.join(missing)}.")
        sys.exit(1)

    try:
        with open(META_FILE) as f:
            meta = json.load(f)
    except Exception as e:
        print(f"✗ Could not read {META_FILE} (did generate.js run?): {e}")
        sys.exit(1)

    caption = build_caption(meta)                       # Instagram: caption + hashtags
    comment = meta.get("first_comment") or (meta.get("hashtags") if TAGS_AS_COMMENT else "")
    fb_message = (meta.get("caption") or "").rstrip()    # Facebook: caption; hashtags optional
    if FB_INCLUDE_HASHTAGS and meta.get("hashtags"):
        fb_message = fb_message + "\n\n" + meta["hashtags"]
    url = raw_url(meta["media_file"])                    # still image (FB post + Reel cover)
    is_reel = bool(meta.get("is_reel") and meta.get("video_file"))
    video_url = raw_url(meta["video_file"]) if is_reel else None
    ig_label = "Instagram Reel" if is_reel else "Instagram"
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    now = datetime.datetime.utcnow().isoformat() + "Z"
    targets = ig_label + (" + Facebook" if FB_ENABLED else "")
    print(f"[{now}] {mode} · publishing {meta.get('video_file') or meta['media_file']} [{meta.get('layout')}] → {targets}")
    print(f"  media: {video_url or url}")
    print(f"  caption: {caption[:90].replace(chr(10), ' ')}…")

    if DRY_RUN:
        print(f"  [dry-run] would publish to {targets}. Set GT_DRY_RUN=0 to go live.")
        return

    if not wait_for_url(url):
        print("✗ Image URL never went live — is the repo public and the image committed before this step?")
        sys.exit(1)
    if is_reel and not wait_for_url(video_url):
        print("✗ Reel video URL never went live — is the repo public and the .mp4 committed before this step?")
        sys.exit(1)

    ig_id = fb_id = None

    # --- Instagram (Reel or photo) ---
    try:
        if is_reel:
            ig_id = publish_reel(video_url, caption, cover_url=url)
        else:
            ig_id = publish_single(url, caption)
        post_comment(ig_id, comment)
        print(f"  ✓ {ig_label} published as {ig_id}")
    except Exception as e:
        print(f"  ✗ {ig_label} failed: {e}")

    # --- Facebook Page (non-fatal: a FB failure must not lose a good IG post) ---
    if FB_ENABLED:
        try:
            fb_id = publish_facebook_photo(url, fb_message)
            print(f"  ✓ Facebook published as {fb_id}")
        except Exception as e:
            print(f"  ✗ Facebook failed (non-fatal): {e}")
    else:
        print("  · Facebook disabled (set GT_FB_PAGE_ID + GT_FB_PAGE_ACCESS_TOKEN to enable)")

    if ig_id or fb_id:
        state = load_state()
        state.append({"media_id": ig_id, "fb_post_id": fb_id, "at": now, "file": meta["media_file"],
                      "is_reel": is_reel, "video_file": meta.get("video_file"),
                      "layout": meta.get("layout"), "sig": meta.get("sig"),
                      "caption": meta.get("caption", ""), "hashtags": meta.get("hashtags", ""),
                      "first_comment": meta.get("first_comment", "")})
        save_state(state)

    # Fail the run only if the primary channel (Instagram) didn't post.
    if not ig_id:
        print("  ✗ Instagram did not publish — failing the run.")
        sys.exit(1)

    print("done.")


if __name__ == "__main__":
    main()
