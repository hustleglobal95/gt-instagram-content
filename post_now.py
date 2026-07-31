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

RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
STATE_FILE = "posted_log.json"


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


def publish_single(image_url, caption):
    c = _api_post(f"{IG_USER_ID}/media", {"image_url": image_url, "caption": caption})
    time.sleep(WAIT_SECONDS)  # let IG finish processing the image before publishing
    pub = _api_post(f"{IG_USER_ID}/media_publish", {"creation_id": c["id"]})
    return pub["id"]


def post_comment(media_id, message):
    if not message:
        return
    try:
        _api_post(f"{media_id}/comments", {"message": message})
    except Exception as e:
        print(f"    (first comment skipped — needs manage_comments scope; non-fatal: {e})")


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
        with open("meta.json") as f:
            meta = json.load(f)
    except Exception as e:
        print(f"✗ Could not read meta.json (did generate.js run?): {e}")
        sys.exit(1)

    caption = build_caption(meta)
    comment = meta.get("first_comment") or (meta.get("hashtags") if TAGS_AS_COMMENT else "")
    url = raw_url(meta["media_file"])
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    now = datetime.datetime.utcnow().isoformat() + "Z"
    print(f"[{now}] {mode} · publishing {meta['media_file']} [{meta.get('layout')}]")
    print(f"  image: {url}")
    print(f"  caption: {caption[:90].replace(chr(10), ' ')}…")

    if DRY_RUN:
        print("  [dry-run] not publishing. Set GT_DRY_RUN=0 to go live.")
        return

    if not wait_for_url(url):
        print("✗ Image URL never went live — is the repo public and the image committed before this step?")
        sys.exit(1)

    try:
        mid = publish_single(url, caption)
        post_comment(mid, comment)
        print(f"  ✓ published as {mid}")
        state = load_state()
        state.append({"media_id": mid, "at": now, "file": meta["media_file"],
                      "layout": meta.get("layout"), "sig": meta.get("sig")})
        save_state(state)
    except Exception as e:
        print(f"  ✗ failed: {e}")
        sys.exit(1)

    print("done.")


if __name__ == "__main__":
    main()
