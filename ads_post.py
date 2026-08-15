#!/usr/bin/env python3
"""
ads_post.py: publish the queued video ad to Instagram and Facebook.

Runs right after ads_generate.js, and reuses post_now.py rather than copying
it: the container polling, the raw URL builder, the URL liveness wait and the
comment poster are all already correct there and already in production for the
organic posts. Importing them means an ad publishes through exactly the code
path that has been working, not a second copy of it that can drift.

What is new here is Facebook. post_now.py sends the Page a photo, which is
right for a still creative and wrong for an ad: it would run the video on
Instagram and a frozen frame of it on Facebook. Pages take video at
/{page-id}/videos with a file_url, so that is what this does.

DRY_RUN is on by default, same as post_now.py. Nothing publishes until
GT_DRY_RUN=0 is set deliberately.

Exit codes: 0 published, 78 nothing to do, 1 a real failure.
"""
import os, sys, json, datetime
import requests

import post_now as pn

META = "ads_meta.json"
STATE = "ads_posted_log.json"
NOTHING_TO_DO = 78


def publish_facebook_video(video_url, description):
    """Post the video itself to the Page.

    Pages accept a URL they fetch themselves, the same shape the Reels endpoint
    uses, so nothing has to be uploaded from the runner. A failure here is
    reported and swallowed by the caller: losing Facebook must never cost us a
    good Instagram post that already went out."""
    r = requests.post(
        f"{pn.FB_API_BASE}/{pn.FB_PAGE_ID}/videos",
        data={"file_url": video_url, "description": description, "access_token": pn.FB_TOKEN},
        timeout=180,
    )
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"non-JSON response ({r.status_code}): {r.text[:300]}")
    if "error" in j:
        raise RuntimeError(f"FB API error: {j['error'].get('message')} ({j['error'].get('code')})")
    return j.get("id")


def load_meta():
    if not os.path.exists(META):
        print(f"No {META}. ads_generate.js found nothing to post.")
        sys.exit(NOTHING_TO_DO)
    with open(META, encoding="utf-8") as f:
        return json.load(f)


def append_log(record):
    try:
        with open(STATE, encoding="utf-8") as f:
            log = json.load(f)
    except Exception:
        log = []
    log.append(record)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)
        f.write("\n")


def main():
    meta = load_meta()

    caption = meta.get("caption", "")
    if pn.APPEND_TAGS and meta.get("hashtags") and not pn.TAGS_AS_COMMENT:
        caption = caption + "\n\n" + meta["hashtags"]
    fb_message = (meta.get("caption") or "").rstrip()
    if pn.FB_INCLUDE_HASHTAGS and meta.get("hashtags"):
        fb_message = fb_message + "\n\n" + meta["hashtags"]

    video_url = pn.raw_url(meta["video_file"])
    cover_url = pn.raw_url(meta["media_file"])
    mode = "DRY RUN" if pn.DRY_RUN else "LIVE"
    now = datetime.datetime.utcnow().isoformat() + "Z"
    targets = "Instagram Reel" + (" + Facebook video" if pn.FB_ENABLED else "")

    print(f"[{now}] {mode} · ad {meta['source_file']} "
          f"({meta.get('width')}x{meta.get('height')}, {meta.get('seconds')}s) -> {targets}")
    print(f"  video:   {video_url}")
    print(f"  cover:   {cover_url}")
    print(f"  caption: {meta.get('caption_source')} · {caption[:80].replace(chr(10), ' ')}...")
    print(f"  queue:   {meta.get('queue_remaining')} behind this one")

    if pn.DRY_RUN:
        print(f"  [dry-run] would publish to {targets}. Set GT_DRY_RUN=0 to go live.")
        return

    # The commit has to have landed on the CDN before Meta is asked to fetch it.
    if not pn.wait_for_url(video_url):
        print("✗ Video URL never went live. Is the repo public and the .mp4 committed before this step?")
        sys.exit(1)
    if not pn.wait_for_url(cover_url):
        print("✗ Cover URL never went live.")
        sys.exit(1)

    ig_id = fb_id = None

    try:
        ig_id = pn.publish_reel(video_url, caption, cover_url=cover_url)
        pn.post_comment(ig_id, meta.get("first_comment") or "")
        print(f"  ✓ Instagram Reel published as {ig_id}")
    except Exception as e:
        print(f"  ✗ Instagram failed: {e}")

    if pn.FB_ENABLED:
        try:
            fb_id = publish_facebook_video(video_url, fb_message)
            print(f"  ✓ Facebook video published as {fb_id}")
        except Exception as e:
            print(f"  ✗ Facebook failed (non-fatal): {e}")
    else:
        print("  · Facebook disabled (set GT_FB_PAGE_ID + GT_FB_PAGE_ACCESS_TOKEN to enable)")

    if not (ig_id or fb_id):
        print("✗ Nothing published. Leaving the ad in the queue to try again.")
        sys.exit(1)

    # Deliberately not moved here. ads_generate.js sweeps it into ads/posted
    # at the start of the next run, once Meta has certainly finished fetching
    # it. The log below is what stops it going out twice in the meantime.
    append_log({
        "at": now,
        "file": meta["source_file"],
        "instagram_id": ig_id,
        "facebook_id": fb_id,
        "caption_source": meta.get("caption_source"),
        "seconds": meta.get("seconds"),
        "dimensions": f"{meta.get('width')}x{meta.get('height')}",
    })
    print("  logged. It will be moved to ads/posted on the next run.")


if __name__ == "__main__":
    main()
