# Video ads

Drop an `.mp4` into `queue/`, sync, and one goes out a day.

## How to use it

1. Clone this repo somewhere on your machine, once. The folder you drop ads
   into is `ads/queue` inside that clone.
2. Put a video in `ads/queue`.
3. Open GitHub Desktop and press Commit, then Push.

That is the whole thing. The daily job takes the oldest file that has not been
posted, publishes it as an Instagram Reel and a Facebook Page video, and writes
what it did to `ads_posted_log.json`.

Upload as many as you like at once. It posts one a day and works through them
oldest first, so a batch on Sunday covers the week.

## What it will accept

Checked before Instagram ever sees it, so a bad file is a clear message in the
run log rather than a container that fails silently four minutes later.

| | |
| --- | --- |
| Format | `.mp4` or `.mov` |
| Length | 3 seconds to 15 minutes |
| Size | under 95MB (GitHub refuses anything near 100MB) |
| Best shape | 9:16 portrait, 1080x1920 |

Landscape is allowed but you will be warned: Instagram crops the sides to fit a
Reel, so anything important near the edges is lost. Silent video is allowed and
also warned about.

## Captions

By default the caption comes from the bank in `ads_bank.js`, rotating so the
same line does not go out twice until every line has been used.

To give one ad its own words, put a `.txt` file beside it with the same name:

```
ads/queue/spring-launch.mp4
ads/queue/spring-launch.txt
```

The text file wins. Write the caption exactly as you want it to appear; hashtags
are appended automatically.

## Where files end up

Nothing is deleted. Once an ad has been published it gets moved to `ads/posted`
at the start of the *next* run, not the end of its own. That delay is
deliberate: Meta fetches the video from its public URL and Facebook is often
still downloading after the API call returns, so moving it immediately would
pull the file out from under an upload in progress. `ads_posted_log.json` is
what prevents a repeat in the meantime.

## Two things worth knowing

**This repo is public.** That is what lets Meta fetch the videos, and it means
anyone who knows the URL can download them. They are ads headed for a public
Instagram account, so this is usually fine, but it should not be a surprise.

**Video lives in git history forever.** Deleting a file from `ads/posted` frees
nothing; the bytes stay in the history. If this grows past a few gigabytes, move
the videos to object storage and point the job at that instead.

## Running it by hand

Actions tab, "GT Ads (1x/day)", Run workflow. It defaults to a rehearsal that
publishes nothing and prints exactly what it would have done. Set `dry_run` to
`0` to go live.
