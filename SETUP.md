# Growth Terminal — 4×/day auto-generating Instagram poster

This posts **4 fresh, on-brand creatives a day, every day**, with zero hands-on work.
Each scheduled run: **generates** a new post from a large content bank → **commits** the
image → **publishes** it to Instagram → **records** it. It never runs out of content and
never repeats a post for weeks, because it assembles each one from a big pool of copy +
layouts (no two runs pull the same thing).

Nothing here likes, follows, or DMs. It publishes *your* content on a schedule — the
accountable, ban-safe lane.

---

## What's in this folder

```
generate.js                     the content engine (assembles + renders one fresh post)
post_now.py                     the publisher (posts the freshly generated creative)
logo_parts.json                 the GT logo vectors (used to draw the logo on each creative)
package.json                    declares Playwright (renders the images)
.github/workflows/autopost.yml  the schedule — runs 4x/day and does everything
```

---

## One-time setup (about 5 minutes)

### 1. Put these files in your repo
Upload all of the above to **github.com/hustleglobal95/gt-instagram-content**, keeping the
`.github/workflows/` folder exactly where it is. (Easiest: *Add file → Upload files*, then
drag the whole set in. Make sure `autopost.yml` lands under `.github/workflows/`.)

The repo must stay **public** — Instagram fetches each image from its public GitHub URL.

### 2. Add the secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
|---|---|
| `GT_IG_USER_ID` | `17841422889035917` (your @markusreidgt business account ID) |
| `GT_IG_ACCESS_TOKEN` | your long-lived token (the `EAA…` one that already worked) |
| `GT_GITHUB_REPO` | `hustleglobal95/gt-instagram-content` |
| `GT_API_BASE` | `https://graph.facebook.com/v21.0` |
| `GT_DRY_RUN` | `1`  ← keep 1 for the first test, then change to `0` |

### 3. Test it once (safe — won't post)
Repo → **Actions** tab → **GT Auto-Post (4x/day)** → **Run workflow**. With `GT_DRY_RUN=1`
it generates a real creative, commits it, and prints *"would publish"* without posting.
Open the new file under `creatives/` to see the post it made.

### 4. Go live
Change `GT_DRY_RUN` to `0`. Run it once by hand again — this time it posts for real.
After that, the schedule takes over: **4 posts a day, automatically.**

That's it. You never have to touch it.

---

## The 4 daily times

Set for US Eastern (EDT): **~9am, 1pm, 5pm, 9pm**. To change them, edit the `cron` lines at
the top of `autopost.yml` (they're in UTC — subtract 4 hours to read them as EDT).

> Note: GitHub's scheduler can fire a few minutes late during busy periods — normal, and
> fine for a content schedule. Posts still go out 4×/day.

---

## Living with it

- **Change the look or copy:** edit the content banks in `generate.js` (the `gen_*`
  functions). Add hooks, stats, angles — the engine mixes in anything you add automatically.
- **Pause posting:** set `GT_DRY_RUN` back to `1` (keeps generating, stops posting), or
  disable the workflow in the Actions tab.
- **See what's gone out:** `posted_log.json` in the repo is the running record.
- **Token refresh:** long-lived tokens last ~60 days. When it expires, posts stop and the
  run logs a clear error — just refresh the token and update `GT_IG_ACCESS_TOKEN`.

## One honest heads-up on cadence

4×/day is 28 posts/week. It's well under Instagram's ~50/day publish limit, so there's no
ban risk from volume. But for a brand account this pace usually **lowers per-post reach** —
the algorithm splits attention across your posts, and a smaller number of stronger posts
often outperforms. If engagement dips after a couple of weeks, dropping to 1–2×/day is a
one-line change (delete cron lines in `autopost.yml`). Your call — this is built to run at
whatever cadence you set.
