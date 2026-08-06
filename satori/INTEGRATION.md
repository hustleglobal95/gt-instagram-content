# Satori renderer — drop-in for the GT autoposter

Renders **all 20 static ad layouts** with Satori + resvg (no headless browser):
statement (+constraint), stat, feature, contrast, card, quote, tweet, ranked,
edserif (+svc_serif), edterminal, edmanifesto (+svc_manifesto), vs, carousel,
funnel, trajectory, annotated, editorial, prodshot, prodclaim, prodsoon.

Reels (1080x1920 MP4) are NOT covered — those stay on your ffmpeg path (Remotion
is the eventual upgrade there).

## Install
    npm install satori @resvg/resvg-js sharp

Copy this folder into the repo (e.g. ./satori/). Contents:
- render_satori.js        the renderer
- fonts/*.ttf             brand fonts (Inter Tight, JetBrains Mono, Fraunces incl. italics)
- assets/logo_light.svg   GT logo (recolored at runtime for light/dark/cream)
- assets/logo_parts.json  logo path data (for the tweet avatar mark)

## Wire it in (generate.js)
Top of file:
    const { renderPostSatori, SATORI_LAYOUTS } = require('./satori/render_satori');

Replace your `renderPost(page, post, base)` call with:
    if (SATORI_LAYOUTS.has(post.layout)) await renderPostSatori(post, base);
    else                                 await renderPost(page, post, base);

Writes <base>.jpg (q92) + <base>.png at 1080x1350, same as before.

## editorial backgrounds
editorial composites a photo + a contrast-sized scrim. It reads background images from
`../backgrounds` relative to this module (i.e. repo-root /backgrounds), or set GT_BG_DIR.
- If your existing pipeline already attaches post.bgImage + post.scrim (via prepareEditorialPhoto),
  renderPostSatori uses those directly.
- If not, it picks a background and runs its own Sharp-based luminance gate (same QA target).
- If no backgrounds are found, it falls back to the warm-gradient (non-photo) editorial.

## Notes
- Fonts are TTF conversions of the woff2 you embed today, so type matches exactly.
- The whole thing is data-driven from your generator output — no copy is duplicated here.
- To tweak a layout, edit its L_* builder in render_satori.js.
