// render_satori.js — Satori/resvg renderer for Growth Terminal ad layouts.
// Drop-in for renderPost(): writes <outBase>.jpg (q92) + <outBase>.png at 1080x1350.
// Covers layouts in SATORI_LAYOUTS; caller falls back to Playwright for the rest.
const fs = require('fs');
const path = require('path');
const satori = require('satori').default;
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const FONT_DIR = process.env.GT_FONT_DIR || path.join(__dirname, 'fonts');
const ADKIT = process.env.GT_ADKIT_DIR || path.join(__dirname, 'assets');

const ORANGE = '#FC5802', INK = '#17130F', CREAM = '#F5F0E7', WHITE = '#FDFCFC', PAPERINK = '#1A1613';
const MUTED = '#6f665c', GOOD = '#37d67a', CARDBG = '#211b15';

const F = (n, w, s = 'normal') => ({ name: n, data: fs.readFileSync(path.join(FONT_DIR, `${n}-${w}${s === 'italic' ? 'i' : ''}.ttf`)), weight: w, style: s });
const FONTS = [F('ITight', 600), F('ITight', 700), F('ITight', 800), F('JBM', 500), F('JBM', 700), F('Fraunces', 400), F('Fraunces', 600), F('Fraunces', 900), F('Fraunces', 400, 'italic'), F('Fraunces', 500, 'italic')];

// logos -> png data uris (recolored variants)
function logoDataUri(recolorInk, w = 600) {
  let svg = fs.readFileSync(path.join(ADKIT, 'logo_light.svg'), 'utf8'); // orange + #1D1815
  if (recolorInk) svg = svg.split('#1D1815').join(recolorInk);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();
  return 'data:image/png;base64,' + png.toString('base64');
}
const LOGO_WHITE = logoDataUri(WHITE);     // for dark bg
const LOGO_INK = logoDataUri(PAPERINK);    // for cream bg
const LOGO_CREAM = logoDataUri(CREAM);     // cream wordmark for dark editorial bg

// ---------- element helpers ----------
const el = (style, children) => ({ type: 'div', props: { style: { display: 'flex', flexDirection: 'column', ...style }, children } });
const txt = (t, style) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: t } });
const span = (t, color) => ({ type: 'span', props: { style: { color }, children: t } });
const logoImg = (src, w) => ({ type: 'img', props: { src, width: w, height: Math.round(w * 0.199), style: {} } });

// ---------- hook HTML -> Satori lines ----------
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#8250;/g, '›').replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
// returns [[{t,accent}...], ...] one array per visual line
function parseHook(html) {
  const linesRaw = String(html == null ? '' : html).split(/<br\s*\/?>/i);
  return linesRaw.map(line => {
    const runs = [];
    const re = /<span[^>]*class="[^"]*accent[^"]*"[^>]*>(.*?)<\/span>|([^<]+)/gi;
    let m;
    while ((m = re.exec(line))) {
      if (m[1] != null) { const t = decodeEntities(m[1].replace(/<[^>]+>/g, '')); if (t) runs.push({ t, accent: true }); }
      else if (m[2] != null) { const t = decodeEntities(m[2].replace(/<[^>]+>/g, '')); if (t) runs.push({ t, accent: false }); }
    }
    return runs.length ? runs : [{ t: ' ', accent: false }];
  });
}
// render parsed hook as a skewed display headline.
// wrap=false: honor <br> lines, each line nowrap (short punchy hooks).
// wrap=true: flow all words and wrap within maxWidth (long sentence hooks, e.g. feature).
// Unified headline: honors <br> as hard line breaks, wraps any line that's too long,
// keeps the skewed .display look, and colors accent() words orange.
function displayHook(html, { size = 118, baseColor, skew = true, maxWidth, weight = 800, lineHeight = 1.0, ls = -0.02 }) {
  const lines = parseHook(html);
  const gap = Math.round(size * 0.22);
  const lineEls = lines.map(runs => {
    const words = [];
    runs.forEach(r => r.t.split(/\s+/).forEach(w => { if (w !== '') words.push({ t: w, accent: r.accent }); }));
    return {
      type: 'div',
      props: {
        style: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', maxWidth: maxWidth || 900, fontFamily: 'ITight', fontWeight: weight, fontSize: size, letterSpacing: size * ls, lineHeight, color: baseColor },
        children: words.map((w, i) => { const nextPunct = words[i + 1] && /^[.,;:!?)]+$/.test(words[i + 1].t); return { type: 'div', props: { style: { display: 'flex', marginRight: nextPunct ? 0 : gap, color: w.accent ? ORANGE : baseColor }, children: w.t } }; }),
      },
    };
  });
  return el(skew ? { transform: 'skewX(-4deg)' } : {}, lineEls);
}

// parse HTML with <span class="fri">emphasis</span> runs -> [{t, em}]
function parseRich(html) {
  const runs = [];
  const re = /<span[^>]*class="[^"]*fri[^"]*"[^>]*>(.*?)<\/span>|([^<]+)|<br\s*\/?>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] != null) { const t = decodeEntities(m[1].replace(/<[^>]+>/g, '')); if (t.trim()) runs.push({ t, em: true }); }
    else if (m[2] != null) { const t = decodeEntities(m[2]); if (t.trim()) runs.push({ t, em: false }); }
  }
  return runs;
}
// render [{t,em}] runs as wrapping text; base vs em styles chosen per word
function richWrap(runs, { size, lineHeight = 1.05, maxWidth = 900, ls = -0.02, base, em }) {
  const words = [];
  runs.forEach(r => r.t.split(/\s+/).forEach(w => { if (w !== '') words.push({ t: w, em: r.em }); }));
  const gap = Math.round(size * 0.24);
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', maxWidth, fontSize: size, lineHeight, letterSpacing: size * ls },
      children: words.map((w, i) => { const s = w.em ? em : base; const nextPunct = words[i + 1] && /^[.,;:!?)]+$/.test(words[i + 1].t); return { type: 'div', props: { style: { display: 'flex', marginRight: nextPunct ? 0 : gap, fontFamily: s.family, fontWeight: s.weight, fontStyle: s.style || 'normal', color: s.color }, children: w.t } }; }),
    },
  };
}

// ---------- shared chrome ----------
function eyebrow(text, color = ORANGE) {
  const clean = String(text || '').replace(/^[\s◆◇•\-]+/, '').trim();
  return el({ flexDirection: 'row', alignItems: 'center' }, [
    el({ width: 15, height: 15, backgroundColor: color, transform: 'rotate(45deg)', marginRight: 18 }, []),
    txt(clean, { fontFamily: 'JBM', fontWeight: 700, fontSize: 26, letterSpacing: 26 * 0.22, textTransform: 'uppercase', color }),
  ]);
}
function glow(style) { return el({ position: 'absolute', borderRadius: 9999, background: `radial-gradient(circle, rgba(252,88,2,0.5) 0%, rgba(252,88,2,0.12) 45%, rgba(252,88,2,0) 70%)`, ...style }, []); }
function foot(dark, cta) {
  return el({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, [
    logoImg(dark ? LOGO_WHITE : LOGO_INK, 210),
    el({ flexDirection: 'row', alignItems: 'center' }, [
      el({ width: 14, height: 14, borderRadius: 14, backgroundColor: ORANGE, marginRight: 14 }, []),
      txt(decodeEntities(String(cta || 'growthterminal.io')).replace(/[→›]/g, '').replace(/\s+/g, ' ').trim(), { fontFamily: 'JBM', fontWeight: 700, fontSize: 24, color: ORANGE }),
    ]),
  ]);
}
const STAGE = (bg, color) => ({ width: 1080, height: 1350, backgroundColor: bg, color, padding: 84, position: 'relative', justifyContent: 'space-between' });

// ---------- layouts ----------
function L_statement(p) {
  const dark = p.bg !== 'cream';
  const bg = dark ? INK : CREAM, ink = dark ? WHITE : PAPERINK;
  return el(STAGE(bg, ink), [
    glow({ width: 640, height: 640, top: -200, right: -160 }),
    eyebrow(p.eyebrow),
    el({ flex: 1, justifyContent: 'center' }, [displayHook(p.hook, { size: p.size || 118, baseColor: ink })]),
    p.sub ? txt(decodeEntities(String(p.sub).replace(/<[^>]+>/g, '')), { fontFamily: 'ITight', fontWeight: 600, fontSize: 34, lineHeight: 1.4, maxWidth: 840, opacity: 0.82, marginBottom: 8 }) : el({}, []),
    foot(dark, p.cta),
  ]);
}
function L_stat(p) {
  return el(STAGE(INK, WHITE), [
    glow({ width: 720, height: 720, bottom: -260, left: -220 }),
    eyebrow(p.eyebrow),
    el({ flex: 1, justifyContent: 'center' }, [
      txt(decodeEntities(String(p.stat || '')), { fontFamily: 'JBM', fontWeight: 700, fontSize: p.size || 200, letterSpacing: -(p.size || 200) * 0.03, color: ORANGE, lineHeight: 0.9 }),
      txt(decodeEntities(String(p.label || '').replace(/<[^>]+>/g, '')), { fontFamily: 'ITight', fontWeight: 800, fontSize: 46, letterSpacing: -0.5, marginTop: 24, maxWidth: 840, lineHeight: 1.15, color: WHITE }),
      p.sub ? txt(decodeEntities(String(p.sub).replace(/<[^>]+>/g, '')), { fontFamily: 'ITight', fontWeight: 600, fontSize: 32, opacity: 0.8, marginTop: 20, maxWidth: 820, color: WHITE }) : el({}, []),
    ]),
    foot(true, p.cta),
  ]);
}
async function preparePersonPhoto(dataUrl, mode) {
  // returns { dataUri, w, h } sized for the panel/full-bleed
  const b64 = String(dataUrl).split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  if (mode === 'scene') {
    const out = await sharp(buf).resize(1080, 1350, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84 }).toBuffer();
    return { dataUri: 'data:image/jpeg;base64,' + out.toString('base64'), w: 1080, h: 1350, scene: true };
  }
  const PW = 560;
  const out = await sharp(buf).resize(PW, 1350, { fit: 'cover', position: 'top' }).modulate({ brightness: 1.1 }).jpeg({ quality: 86 }).toBuffer();
  return { dataUri: 'data:image/jpeg;base64,' + out.toString('base64'), w: PW, h: 1350, scene: false };
}
async function L_feature(p) {
  const photo = p.personImage ? await preparePersonPhoto(p.personImage, p.personMode) : null;
  const colMax = photo && photo.scene ? 560 : 500;
  const steps = (p.steps || []).map(s => el({ flexDirection: 'row', marginTop: 22 }, [
    txt(String(s.n), { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, color: ORANGE, letterSpacing: 1.8, minWidth: 34, paddingTop: 5 }),
    el({}, [
      txt(String(s.label), { fontFamily: 'JBM', fontWeight: 700, fontSize: 24, letterSpacing: 24 * 0.14, textTransform: 'uppercase', color: ORANGE }),
      txt(decodeEntities(String(s.desc)), { fontFamily: 'ITight', fontWeight: 600, fontSize: 29, color: WHITE, opacity: 0.94, marginTop: 3, lineHeight: 1.2, maxWidth: colMax - 40 }),
    ]),
  ]));
  const bg = [];
  if (!photo) bg.push(el({ position: 'absolute', top: 0, left: 0, width: 1080, height: 1350, background: `radial-gradient(120% 90% at 80% 20%, #2a1e12 0%, ${INK} 62%)` }, []));
  else if (photo.scene) {
    bg.push({ type: 'img', props: { src: photo.dataUri, width: 1080, height: 1350, style: { position: 'absolute', top: 0, left: 0 } } });
    bg.push(el({ position: 'absolute', top: 0, left: 0, width: 1080, height: 1350, background: `linear-gradient(to right, ${INK} 0%, ${INK} 18%, rgba(23,19,15,0.86) 40%, rgba(23,19,15,0.42) 58%, rgba(23,19,15,0) 76%)` }, []));
    bg.push(el({ position: 'absolute', bottom: 0, left: 0, width: 1080, height: 300, background: 'linear-gradient(to top, rgba(10,8,6,0.82), rgba(10,8,6,0))' }, []));
  } else {
    bg.push({ type: 'img', props: { src: photo.dataUri, width: photo.w, height: 1350, style: { position: 'absolute', top: 0, right: 0 } } });
    bg.push(el({ position: 'absolute', top: 0, right: 0, width: photo.w, height: 1350, background: `radial-gradient(72% 56% at 48% 33%, rgba(10,8,6,0) 44%, rgba(10,8,6,0.92) 100%)` }, []));
    bg.push(el({ position: 'absolute', top: 0, left: 1080 - photo.w - 60, width: 280, height: 1350, background: `linear-gradient(to right, ${INK} 0%, rgba(23,19,15,0.55) 48%, rgba(23,19,15,0) 100%)` }, []));
    bg.push(el({ position: 'absolute', top: 0, right: 0, width: photo.w, height: 220, background: 'linear-gradient(to bottom, rgba(10,8,6,0.82), rgba(10,8,6,0))' }, []));
  }
  return el({ width: 1080, height: 1350, backgroundColor: INK, color: WHITE, padding: 84, position: 'relative', justifyContent: 'space-between' }, [
    ...bg,
    el({ position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, [
      logoImg(LOGO_WHITE, 210),
      el({ flexDirection: 'row', alignItems: 'center' }, [el({ width: 10, height: 10, borderRadius: 10, backgroundColor: ORANGE, marginRight: 12 }, []), txt('growthterminal.io', { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, color: ORANGE })]),
    ]),
    el({ position: 'relative', flex: 1, justifyContent: 'center', maxWidth: colMax }, [
      displayHook(p.hook, { size: p.size || 74, baseColor: WHITE, skew: false, wrap: true, maxWidth: colMax }),
      p.sub ? txt(decodeEntities(String(p.sub).replace(/<[^>]+>/g, '')), { fontFamily: 'ITight', fontWeight: 500, fontSize: 31, lineHeight: 1.32, opacity: 0.92, marginTop: 22, maxWidth: colMax - 60, color: WHITE }) : el({}, []),
      el({ marginTop: 8 }, steps),
    ]),
    el({ position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, [
      el({ flexDirection: 'row', alignItems: 'center', backgroundColor: ORANGE, color: WHITE, paddingTop: 22, paddingBottom: 22, paddingLeft: 34, paddingRight: 34, borderRadius: 14, boxShadow: '0 14px 32px -12px rgba(252,88,2,0.6)' }, [
        txt(String(p.button || 'Run your analysis'), { fontFamily: 'ITight', fontWeight: 800, fontSize: 30, color: WHITE }),
      ]),
      txt('Better decisions.', { fontFamily: 'ITight', fontWeight: 700, fontSize: 26, color: WHITE }),
    ]),
  ]);
}

// GT-mark avatar (icon-only crop of the logo) for the tweet layout
let _avatar = null;
function avatarUri() {
  if (_avatar) return _avatar;
  const P = JSON.parse(fs.readFileSync(path.join(ADKIT, 'logo_parts.json'), 'utf8'));
  const svg = `<svg viewBox="${P.icon}" xmlns="http://www.w3.org/2000/svg"><g fill="${ORANGE}" ${P.tf}>${P.orange}</g><g fill="${WHITE}" ${P.tf}>${P.white}</g></svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'height', value: 120 } }).render().asPng();
  _avatar = 'data:image/png;base64,' + png.toString('base64');
  return _avatar;
}
const clean = s => decodeEntities(String(s == null ? '' : s).replace(/<[^>]+>/g, ''));

function L_contrast(p) {
  return el(STAGE(INK, WHITE), [
    glow({ width: 560, height: 560, top: -180, right: -160 }),
    eyebrow(p.eyebrow),
    el({ flex: 1, justifyContent: 'center' }, [
      p.lead ? txt(clean(p.lead), { fontFamily: 'ITight', fontWeight: 600, fontSize: 44, lineHeight: 1.15, maxWidth: 760, opacity: 0.85, marginBottom: 22 }) : el({}, []),
      displayHook(p.big, { size: p.size || 130, baseColor: WHITE }),
    ]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 32, opacity: 0.8, maxWidth: 820, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}
function statRow(label, value, valColor) {
  return el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 }, [
    txt(label, { fontFamily: 'ITight', fontWeight: 600, fontSize: 26, color: '#9a8f82' }),
    txt(clean(value), { fontFamily: 'ITight', fontWeight: 800, fontSize: 26, color: valColor || WHITE }),
  ]);
}
function L_card(p) {
  return el(STAGE(INK, WHITE), [
    eyebrow(p.eyebrow),
    el({ flex: 1, justifyContent: 'center' }, [
      el({ backgroundColor: CARDBG, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, paddingTop: 48, paddingBottom: 48, paddingLeft: 46, paddingRight: 46 }, [
        el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }, [
          txt('#1 CONSTRAINT DETECTED', { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, letterSpacing: 22 * 0.14, color: '#9a8f82' }),
          el({ flexDirection: 'row', alignItems: 'center' }, [el({ width: 12, height: 12, borderRadius: 12, backgroundColor: GOOD, marginRight: 10 }, []), txt('VERIFIED', { fontFamily: 'JBM', fontWeight: 500, fontSize: 20, color: GOOD })]),
        ]),
        txt(clean(p.constraint), { fontFamily: 'ITight', fontWeight: 800, fontSize: 92, letterSpacing: -1.6, color: ORANGE, marginBottom: 30 }),
        el({ height: 16, borderRadius: 10, backgroundColor: '#000', marginBottom: 20 }, [el({ width: (p.pct || 70) + '%', height: 16, borderRadius: 10, backgroundColor: ORANGE }, [])]),
        statRow('Impact', p.impact, WHITE),
        statRow('Confidence', p.confidence, GOOD),
      ]),
    ]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 32, maxWidth: 840, marginTop: 24 }) : el({}, []),
    foot(true, p.cta),
  ]);
}
function L_quote(p) {
  return el(STAGE(CREAM, PAPERINK), [
    txt('“', { fontFamily: 'Fraunces', fontWeight: 900, fontSize: 220, color: ORANGE, height: 150, lineHeight: 1 }),
    el({ flex: 1, justifyContent: 'center' }, [displayHook(p.quote, { size: 82, baseColor: PAPERINK, skew: false, wrap: true, maxWidth: 900, lineHeight: 1.08 })]),
    txt('GROWTH TERMINAL', { fontFamily: 'JBM', fontWeight: 500, fontSize: 26, letterSpacing: 26 * 0.1, color: '#8a7f70', marginBottom: 20 }),
    foot(false, p.cta),
  ]);
}
function L_tweet(p) {
  const check = el({ width: 36, height: 36, borderRadius: 36, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }, [
    { type: 'svg', props: { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', children: [{ type: 'path', props: { d: 'M5 12.5l4 4 10-10', stroke: '#000', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } }] } },
  ]);
  return el({ width: 1080, height: 1350, backgroundColor: '#000', color: WHITE, padding: 84, justifyContent: 'center', position: 'relative' }, [
    el({ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }, [
      el({ width: 100, height: 100, borderRadius: 100, backgroundColor: '#1a1613', alignItems: 'center', justifyContent: 'center', marginRight: 24 }, [{ type: 'img', props: { src: avatarUri(), width: 60, height: 60, style: {} } }]),
      el({}, [
        el({ flexDirection: 'row', alignItems: 'center' }, [
          txt('Markus Reid', { fontFamily: 'ITight', fontWeight: 800, fontSize: 36, letterSpacing: -0.4, color: WHITE }),
          el({ width: 7, height: 7, borderRadius: 7, backgroundColor: '#8a8f98', marginLeft: 14, marginRight: 14 }, []),
          txt('Growth Terminal.io', { fontFamily: 'ITight', fontWeight: 800, fontSize: 36, letterSpacing: -0.4, color: WHITE }),
          check,
        ]),
        txt('@markusreidgt', { fontFamily: 'ITight', fontWeight: 500, fontSize: 33, color: '#8a8f98', marginTop: 3 }),
      ]),
    ]),
    displayHook(p.tweet, { size: p.size || 62, baseColor: WHITE, skew: false, wrap: true, maxWidth: 900, weight: 500, lineHeight: 1.32, ls: -0.01 }),
    txt('growthterminal.io', { position: 'absolute', left: 88, bottom: 76, fontFamily: 'JBM', fontWeight: 500, fontSize: 24, letterSpacing: 24 * 0.08, color: '#5b6068' }),
  ]);
}
function L_ranked(p) {
  const rows = (p.rows || []).map((r, i) => el({ marginBottom: 22 }, [
    el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }, [
      el({ flexDirection: 'row', alignItems: 'baseline' }, [
        txt(String(i + 1), { fontFamily: 'JBM', fontWeight: 700, fontSize: 30, color: ORANGE, marginRight: 14 }),
        txt(clean(r[0]), { fontFamily: 'ITight', fontWeight: r[2] ? 800 : 600, fontSize: 30, color: r[2] ? WHITE : '#b8afa2' }),
      ]),
      txt(String(r[1]), { fontFamily: 'JBM', fontWeight: 700, fontSize: 26, color: r[2] ? ORANGE : MUTED }),
    ]),
    el({ height: 22, borderRadius: 8, backgroundColor: '#221c16' }, [el({ width: r[1] + '%', height: 22, borderRadius: 8, backgroundColor: r[2] ? ORANGE : '#4a4038' }, [])]),
  ]));
  return el(STAGE(INK, WHITE), [
    eyebrow(p.eyebrow),
    el({ marginTop: 18, marginBottom: 6 }, [displayHook(p.hook, { size: 60, baseColor: WHITE, skew: false })]),
    el({ flex: 1, justifyContent: 'center' }, [
      ...rows,
      txt('… 7 more, ranked by impact on your revenue', { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, color: MUTED, marginTop: 6 }),
    ]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 30, opacity: 0.82, maxWidth: 840, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}

function L_edserif(p) {
  const serif = !!p.serif;
  const size = p.size || 100;
  const head = serif
    ? richWrap([{ t: clean(p.head), em: false }, { t: clean(p.emph), em: true }], { size, lineHeight: 0.99, ls: -0.015, maxWidth: 900, base: { family: 'Fraunces', weight: 900, color: INK }, em: { family: 'Fraunces', weight: 500, style: 'italic', color: INK } })
    : richWrap([{ t: clean(p.head), em: false }, { t: clean(p.emph), em: true }], { size: Math.round(size * 0.9), lineHeight: 1.0, ls: -0.03, maxWidth: 900, base: { family: 'ITight', weight: 800, color: INK }, em: { family: 'ITight', weight: 800, color: ORANGE } });
  return el({ width: 1080, height: 1350, backgroundColor: CREAM, paddingTop: 96, paddingBottom: 96, paddingLeft: 90, paddingRight: 90 }, [
    el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, [
      logoImg(LOGO_INK, 210),
      txt(clean(p.tag || 'DIAGNOSTIC'), { fontFamily: 'JBM', fontWeight: 500, fontSize: 19, letterSpacing: 19 * 0.18, color: '#8a8073' }),
    ]),
    el({ height: 2, backgroundColor: INK, opacity: 0.92, marginTop: 24 }, []),
    el({ marginTop: 64 }, [
      txt(clean(p.kicker), { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, letterSpacing: 22 * 0.24, color: ORANGE, marginBottom: 32 }),
      head,
    ]),
    el({ height: 1, backgroundColor: INK, opacity: 0.2, marginTop: 60, marginBottom: 38 }, []),
    txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 33, lineHeight: 1.34, maxWidth: 850, color: '#4a423a' }),
    el({ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, [
      el({}, [
        txt(clean(p.cta_label || 'RUN YOUR ANALYSIS'), { fontFamily: 'JBM', fontWeight: 700, fontSize: 25, letterSpacing: 25 * 0.12, color: ORANGE }),
        el({ height: 2, width: 330, backgroundColor: ORANGE, marginTop: 11 }, []),
      ]),
      txt('growthterminal.io', { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, letterSpacing: 22 * 0.06, color: '#8a8073' }),
    ]),
  ]);
}
function edCol(label, value) {
  return el({}, [txt(label, { fontFamily: 'JBM', fontWeight: 500, fontSize: 17, letterSpacing: 17 * 0.1, color: '#8a8074' }), txt(value, { fontFamily: 'ITight', fontWeight: 700, fontSize: 29, color: WHITE, marginTop: 4 })]);
}
function L_edterminal(p) {
  return el({ width: 1080, height: 1350, background: 'radial-gradient(120% 80% at 50% 0%, #1d1811 0%, #17130F 55%, #100c09 100%)', paddingTop: 90, paddingBottom: 90, paddingLeft: 86, paddingRight: 86 }, [
    el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, [
      logoImg(LOGO_CREAM, 210),
      txt('growthterminal.io', { fontFamily: 'JBM', fontWeight: 500, fontSize: 19, letterSpacing: 19 * 0.14, color: '#8a8074' }),
    ]),
    el({ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 24 }, []),
    txt('CONSTRAINT REPORT', { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, letterSpacing: 22 * 0.24, color: ORANGE, marginTop: 70, marginBottom: 28 }),
    txt(clean(p.head), { fontFamily: 'ITight', fontWeight: 800, fontSize: p.size || 76, lineHeight: 1.03, letterSpacing: -(p.size || 76) * 0.03, maxWidth: 920, color: WHITE }),
    el({ marginTop: 70, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, paddingTop: 36, paddingBottom: 36, paddingLeft: 38, paddingRight: 38, backgroundColor: 'rgba(255,255,255,0.02)' }, [
      el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }, [
        txt('REVENUE CAPPED BY', { fontFamily: 'JBM', fontWeight: 500, fontSize: 20, letterSpacing: 20 * 0.14, color: '#9a9084' }),
        txt(clean(p.capBy), { fontFamily: 'JBM', fontWeight: 700, fontSize: 24, letterSpacing: 24 * 0.05, color: ORANGE }),
      ]),
      el({ height: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' }, [el({ width: (p.pct || 70) + '%', height: 14, borderRadius: 8, background: `linear-gradient(90deg, ${ORANGE}, #ff8a3d)` }, [])]),
      el({ flexDirection: 'row', marginTop: 24 }, [
        el({ marginRight: 38 }, [edCol('FORECAST', 'priced')]),
        el({ marginRight: 38 }, [edCol('PLAN', '90-day')]),
        edCol('VERIFY', 'graded'),
      ]),
    ]),
    el({ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 42 }, [
      txt('Diagnosis, not a dashboard.', { fontFamily: 'Fraunces', fontWeight: 400, fontStyle: 'italic', fontSize: 34, color: CREAM }),
      txt('RUN ANALYSIS', { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, letterSpacing: 22 * 0.08, color: INK, backgroundColor: ORANGE, paddingTop: 15, paddingBottom: 15, paddingLeft: 25, paddingRight: 25, borderRadius: 10 }),
    ]),
  ]);
}
function L_edmanifesto(p) {
  const serif = !!p.serif;
  const size = p.size || 84;
  const body = serif
    ? richWrap(parseRich(p.body), { size, lineHeight: 1.07, ls: -0.01, maxWidth: 900, base: { family: 'Fraunces', weight: 400, color: CREAM }, em: { family: 'Fraunces', weight: 500, style: 'italic', color: WHITE } })
    : richWrap(parseRich(p.body), { size: Math.round(size * 0.94), lineHeight: 1.04, ls: -0.03, maxWidth: 900, base: { family: 'ITight', weight: 800, color: CREAM }, em: { family: 'ITight', weight: 800, color: ORANGE } });
  const punch = txt(clean(p.punch), { fontFamily: serif ? 'Fraunces' : 'ITight', fontWeight: serif ? 900 : 800, fontSize: size + (serif ? 4 : 2), letterSpacing: -(size) * 0.02, lineHeight: 1, color: ORANGE, marginTop: 40 });
  return el({ width: 1080, height: 1350, backgroundColor: INK, paddingTop: 98, paddingBottom: 98, paddingLeft: 90, paddingRight: 90, justifyContent: 'space-between' }, [
    logoImg(LOGO_CREAM, 210),
    el({}, [body, punch]),
    el({}, [
      el({ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 26 }, []),
      el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, [
        txt(clean(p.foot), { fontFamily: 'ITight', fontWeight: 700, fontSize: 29, maxWidth: 720, color: WHITE }),
        txt('growthterminal.io', { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, letterSpacing: 22 * 0.06, color: '#9a9084' }),
      ]),
    ]),
  ]);
}

function L_vs(p) {
  const rows = (p.them || []).map(t => el({ flexDirection: 'row', alignItems: 'baseline', paddingTop: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.12)' }, [
    txt(clean(t.who), { fontFamily: 'JBM', fontWeight: 500, fontSize: 26, color: '#8a8178', minWidth: 150, marginRight: 16 }),
    txt(clean(t.what), { fontFamily: 'ITight', fontWeight: 600, fontSize: 30, opacity: 0.8, color: WHITE, maxWidth: 690 }),
  ]));
  return el({ ...STAGE(INK, WHITE), justifyContent: 'space-between' }, [
    glow({ width: 640, height: 640, top: -180, right: -160 }),
    el({}, [
      eyebrow(p.eyebrow),
      el({ marginTop: 26, marginBottom: 40 }, [displayHook(p.hook, { size: 78, baseColor: WHITE })]),
      el({}, rows),
    ]),
    el({}, [
      el({ backgroundColor: '#211b15', border: '1px solid rgba(255,255,255,0.1)', borderLeft: `6px solid ${ORANGE}`, borderRadius: 20, paddingTop: 34, paddingBottom: 34, paddingLeft: 38, paddingRight: 38 }, [
        txt('GROWTH TERMINAL', { fontFamily: 'JBM', fontWeight: 700, fontSize: 24, letterSpacing: 24 * 0.1, color: ORANGE }),
        txt(clean(p.us), { fontFamily: 'ITight', fontWeight: 800, fontSize: 44, letterSpacing: -0.4, marginTop: 10, color: WHITE, lineHeight: 1.1 }),
      ]),
      el({ marginTop: 36 }, [foot(true, p.cta)]),
    ]),
  ]);
}
function L_carousel(p) {
  const star = { type: 'svg', props: { width: 22, height: 22, viewBox: '0 0 24 24', children: [{ type: 'path', props: { d: 'M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17l-6.2 3.6 1.6-6.7L2.2 9.5l6.9-.6z', fill: ORANGE } }] } };
  return el(STAGE(INK, WHITE), [
    glow({ width: 560, height: 560, top: -150, left: -150 }),
    el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, [
      eyebrow(p.eyebrow),
      el({ flexDirection: 'row', alignItems: 'center' }, [txt('save this', { fontFamily: 'JBM', fontWeight: 500, fontSize: 24, color: '#8a8178', marginRight: 10 }), star]),
    ]),
    el({ flex: 1, justifyContent: 'center' }, [
      txt(clean(p.big), { fontFamily: 'JBM', fontWeight: 700, fontSize: 300, color: ORANGE, lineHeight: 0.8, letterSpacing: -12 }),
      el({ marginTop: 10 }, [displayHook(p.hook, { size: 82, baseColor: WHITE })]),
    ]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 32, opacity: 0.8, maxWidth: 840, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}
function L_funnel(p) {
  const bars = (p.stages || []).map(s => el({ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }, [
    txt(clean(s[0]), { fontFamily: 'JBM', fontWeight: 500, fontSize: 28, color: '#b8afa2', width: 210, marginRight: 26, textAlign: 'right', justifyContent: 'flex-end' }),
    el({ flex: 1, flexDirection: 'row', justifyContent: 'center' }, [
      el({ width: Math.round(s[2] * 100) + '%', height: 74, borderRadius: 12, backgroundColor: s[3] ? ORANGE : '#2c251e', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 22 }, [
        txt(clean(s[1]), { fontFamily: 'ITight', fontWeight: 800, fontSize: 30, color: s[3] ? INK : WHITE }),
      ]),
    ]),
    el({ width: 150, marginLeft: 26, flexDirection: 'row', alignItems: 'center' }, s[3] ? [
      { type: 'svg', props: { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', children: [{ type: 'path', props: { d: 'M20 12H7M12 6l-6 6 6 6', stroke: ORANGE, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } }] } },
      txt('leak', { fontFamily: 'ITight', fontWeight: 700, fontSize: 24, color: ORANGE, marginLeft: 8 }),
    ] : []),
  ]));
  return el(STAGE(INK, WHITE), [
    eyebrow(p.eyebrow),
    el({ marginTop: 18, marginBottom: 6 }, [displayHook(p.hook, { size: 60, baseColor: WHITE, skew: false })]),
    el({ flex: 1, justifyContent: 'center' }, bars),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 30, opacity: 0.82, maxWidth: 840, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}

function L_trajectory(p) {
  const W = 880, H = 440, pad = 20;
  const fc = p.fc || [], ac = p.ac || [];
  const lo = 40, hi = Math.max(...fc.map(x => x[1]), ...ac.map(x => x[1]), lo + 1) + 4;
  const mx = v => pad + (v / 5) * (W - 2 * pad);
  const my = v => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const line = pts => pts.map((pt, i) => (i ? 'L' : 'M') + mx(pt[0]).toFixed(1) + ' ' + my(pt[1]).toFixed(1)).join(' ');
  const grid = [0.35, 0.55, 0.75].map(f => ({ type: 'line', props: { x1: pad, y1: Math.round(H * f), x2: W - pad, y2: Math.round(H * f), stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 } }));
  const dots = ac.map(pt => ({ type: 'circle', props: { cx: mx(pt[0]).toFixed(1), cy: my(pt[1]).toFixed(1), r: 7, fill: ORANGE, stroke: INK, strokeWidth: 3 } }));
  const chart = { type: 'svg', props: { width: W, height: H, viewBox: `0 0 ${W} ${H}`, children: [...grid,
    { type: 'path', props: { d: line(fc), fill: 'none', stroke: '#b8afa2', strokeWidth: 3, strokeDasharray: '8 8', strokeLinecap: 'round' } },
    { type: 'path', props: { d: line(ac), fill: 'none', stroke: ORANGE, strokeWidth: 4, strokeLinecap: 'round' } },
    ...dots] } };
  const legLine = (color, dash) => ({ type: 'svg', props: { width: 28, height: 6, viewBox: '0 0 28 6', children: [{ type: 'line', props: { x1: 0, y1: 3, x2: 28, y2: 3, stroke: color, strokeWidth: 3, strokeDasharray: dash || undefined, strokeLinecap: 'round' } }] } });
  const legItem = (indic, label, color) => el({ flexDirection: 'row', alignItems: 'center', marginRight: 34 }, [el({ marginRight: 10 }, [indic]), txt(label, { fontFamily: 'JBM', fontWeight: 500, fontSize: 24, color })]);
  const check = el({ width: 26, height: 26, borderRadius: 26, backgroundColor: GOOD, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, [
    { type: 'svg', props: { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', children: [{ type: 'path', props: { d: 'M5 12.5l4 4 10-10', stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } }] } },
  ]);
  return el(STAGE(INK, WHITE), [
    eyebrow(p.eyebrow),
    el({ marginTop: 18, marginBottom: 6 }, [displayHook(p.hook, { size: 60, baseColor: WHITE, skew: false })]),
    el({ flex: 1, justifyContent: 'center' }, [
      el({ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, [
        legItem(legLine('#b8afa2', '6 6'), 'Forecast', '#b8afa2'),
        legItem(legLine(ORANGE), 'Actual', ORANGE),
        el({ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }, [check, txt('VERIFIED', { fontFamily: 'JBM', fontWeight: 500, fontSize: 24, color: GOOD })]),
      ]),
      chart,
    ]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 30, opacity: 0.82, maxWidth: 860, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}

// D) Annotated highlight — hand-drawn ellipse around the circled word (uses p.ring width)
function L_annotated(p) {
  const size = 74, ring = p.ring || 640, gap = Math.round(size * 0.24);
  const word = (t, color) => ({ type: 'div', props: { style: { display: 'flex', marginRight: gap, color }, children: t } });
  const preW = clean(p.pre).split(/\s+/).filter(Boolean).map(w => word(w, WHITE));
  const postW = clean(p.post).split(/\s+/).filter(Boolean);
  const circledPunct = postW[0] && /^[.,;:!?]/.test(postW[0]);
  const circled = el({ position: 'relative', marginRight: circledPunct ? 0 : gap, flexDirection: 'row' }, [
    txt(clean(p.circled), { color: ORANGE }),
    { type: 'svg', props: { width: ring, height: 150, viewBox: `0 0 ${ring} 150`, style: { position: 'absolute', left: -18, top: -18 }, children: [{ type: 'ellipse', props: { cx: ring / 2, cy: 78, rx: ring / 2 - 12, ry: 60, fill: 'none', stroke: ORANGE, strokeWidth: 5, transform: `rotate(-3 ${ring / 2} 78)` } }] } },
  ]);
  const headline = { type: 'div', props: { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', maxWidth: 880, fontFamily: 'ITight', fontWeight: 800, fontSize: size, lineHeight: 1.2, color: WHITE }, children: [...preW, circled, ...postW.map(w => word(w, WHITE))] } };
  return el(STAGE(INK, WHITE), [
    eyebrow(p.eyebrow),
    el({ flex: 1, justifyContent: 'center' }, [headline]),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 30, opacity: 0.8, maxWidth: 820, marginBottom: 8 }) : el({}, []),
    foot(true, p.cta),
  ]);
}

// editorial photo gate: pick a background whose text-box luminance passes, size its scrim
const BG_DIR = process.env.GT_BG_DIR || path.join(__dirname, '..', 'backgrounds');
async function pickEditorialBg() {
  let bgs = [];
  try { bgs = fs.readdirSync(BG_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).map(f => path.join(BG_DIR, f)); } catch { }
  for (const f of bgs) {
    try {
      const buf = fs.readFileSync(f);
      const st = await sharp(buf).resize(1080, 1350, { fit: 'cover' }).extract({ left: 80, top: 640, width: 920, height: 560 }).greyscale().stats();
      const L = st.channels[0].mean / 255;
      let op = Math.min(1, Math.max(0.2, 1 - 0.16 / Math.max(L, 0.001)));
      if (op > 0.78) continue; // too dark once scrimmed → reject
      const out = await sharp(buf).resize(1080, 1350, { fit: 'cover' }).jpeg({ quality: 84 }).toBuffer();
      return { dataUri: 'data:image/jpeg;base64,' + out.toString('base64'), scrim: op };
    } catch { }
  }
  return null;
}
async function L_editorial(p) {
  const photo = p.bgImage ? { dataUri: p.bgImage, scrim: (p.scrim != null ? p.scrim : 0.4) } : await pickEditorialBg();
  const op = photo ? photo.scrim : 0, opR = op * 0.7;
  const bgStyle = photo ? {} : { background: `radial-gradient(120% 90% at 78% 12%, #3a2a18 0%, #241a10 42%, ${INK} 100%)` };
  const kids = [];
  if (photo) {
    kids.push({ type: 'img', props: { src: photo.dataUri, width: 1080, height: 1350, style: { position: 'absolute', top: 0, left: 0 } } });
    kids.push(el({ position: 'absolute', top: 0, left: 0, width: 1080, height: 1350, background: `linear-gradient(to top, rgba(9,7,5,${op}) 0%, rgba(9,7,5,${op}) 58%, rgba(9,7,5,0) 82%)` }, []));
    kids.push(el({ position: 'absolute', top: 0, left: 0, width: 1080, height: 1350, background: `linear-gradient(to right, rgba(9,7,5,${opR}) 0%, rgba(9,7,5,0) 55%)` }, []));
  } else {
    kids.push(el({ position: 'absolute', width: 820, height: 820, borderRadius: 820, top: -260, right: -240, background: 'radial-gradient(circle, rgba(252,88,2,0.28) 0%, rgba(252,88,2,0.06) 50%, rgba(252,88,2,0) 70%)' }, []));
  }
  kids.push(el({ position: 'relative' }, [logoImg(LOGO_WHITE, 210)]));
  kids.push(el({ position: 'relative', flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }, [
    displayHook(p.hook, { size: p.size || 92, baseColor: WHITE, skew: false, wrap: true, maxWidth: 900, lineHeight: 1.04 }),
    p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 500, fontSize: 38, lineHeight: 1.32, maxWidth: 760, opacity: photo ? 0.9 : 0.72, marginTop: 32, color: WHITE }) : el({}, []),
  ]));
  kids.push(el({ position: 'relative', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, [
    txt(clean(p.caps || 'Growth diagnosis · Google Sheets™'), { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, letterSpacing: 22 * 0.06, color: `rgba(253,252,252,${photo ? 0.62 : 0.42})` }),
    el({ flexDirection: 'row', alignItems: 'center' }, [el({ width: 10, height: 10, borderRadius: 10, backgroundColor: ORANGE, marginRight: 12 }, []), txt('growthterminal.io', { fontFamily: 'JBM', fontWeight: 700, fontSize: 22, color: ORANGE })]),
  ]));
  return el({ width: 1080, height: 1350, backgroundColor: INK, ...bgStyle, color: WHITE, paddingTop: 104, paddingBottom: 104, paddingLeft: 96, paddingRight: 96, position: 'relative' }, kids);
}

// product mock (browser-chrome funnel table)
function productMock() {
  const rows = [['Visitors', '12,000', '', false], ['Leads', '420', '3.5%', false], ['Qualified', '76', '18.1%', true], ['Opportunities', '41', '53.9%', false], ['Customers', '14', '34.1%', false]];
  const dot = () => el({ width: 12, height: 12, borderRadius: 12, backgroundColor: '#5b524a', marginRight: 8 }, []);
  const warn = { type: 'svg', props: { width: 26, height: 26, viewBox: '0 0 24 24', children: [{ type: 'path', props: { d: 'M12 2L22 20H2z', fill: '#fff' } }, { type: 'rect', props: { x: 11, y: 9, width: 2, height: 6, fill: ORANGE } }, { type: 'rect', props: { x: 11, y: 16, width: 2, height: 2, fill: ORANGE } }] } };
  return el({ width: '100%', borderRadius: 18, border: '1px solid #ece3d6', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }, [
    el({ backgroundColor: INK, paddingTop: 15, paddingBottom: 15, paddingLeft: 22, paddingRight: 22, flexDirection: 'row', alignItems: 'center' }, [dot(), dot(), dot(), txt('Funnel & Conversion Tracker.xlsx', { fontFamily: 'ITight', fontWeight: 600, fontSize: 20, color: '#cfc7bb', marginLeft: 4 })]),
    el({}, rows.map(([s, v, c, weak]) => el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, paddingBottom: 15, paddingLeft: 26, paddingRight: 26, backgroundColor: weak ? '#FBEBE4' : '#fff', borderBottom: '1px solid #ece3d6' }, [
      txt(s, { fontFamily: 'ITight', fontWeight: 700, fontSize: 27, color: INK }),
      txt(v, { fontFamily: 'ITight', fontWeight: 500, fontSize: 25, color: '#8A8178', flex: 1, textAlign: 'right', justifyContent: 'flex-end', paddingRight: 40 }),
      txt(c, { fontFamily: 'ITight', fontWeight: weak ? 800 : 500, fontSize: 27, color: weak ? '#C7513A' : INK, width: 110, textAlign: 'right', justifyContent: 'flex-end' }),
    ]))),
    el({ backgroundColor: ORANGE, paddingTop: 20, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, flexDirection: 'row', alignItems: 'center' }, [
      el({ marginRight: 12 }, [warn]),
      txt('Weakest step: Qualified is 18.1% vs your 25% target. Fixing it is worth ~$15,385/yr.', { fontFamily: 'ITight', fontWeight: 800, fontSize: 25, color: '#fff', lineHeight: 1.3, maxWidth: 820 }),
    ]),
  ]);
}
const priceTag = (price) => txt(clean(price), { fontFamily: 'ITight', fontWeight: 800, fontSize: 34, color: INK, backgroundColor: ORANGE, paddingTop: 8, paddingBottom: 8, paddingLeft: 22, paddingRight: 22, borderRadius: 12 });
function L_prodshot(p) {
  return el(STAGE(INK, WHITE), [
    glow({ width: 560, height: 560, top: -180, right: -160 }),
    eyebrow(p.eyebrow || '◆ New in the store'),
    el({ marginTop: 16 }, [displayHook(p.hook, { size: p.size || 66, baseColor: WHITE, skew: false, wrap: true, maxWidth: 920, lineHeight: 1.08 })]),
    el({ flex: 1, justifyContent: 'center', paddingTop: 30, paddingBottom: 30 }, [productMock()]),
    el({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, [
      el({ flexDirection: 'row', alignItems: 'center' }, [priceTag(p.price), el({ marginLeft: 18 }, [txt(clean(p.name), { fontFamily: 'ITight', fontWeight: 800, fontSize: 26, color: WHITE }), txt(clean(p.caps), { fontFamily: 'JBM', fontWeight: 500, fontSize: 17, color: '#9a8f82', marginTop: 2 })])]),
      el({ flexDirection: 'row', alignItems: 'center' }, [el({ width: 12, height: 12, borderRadius: 12, backgroundColor: ORANGE, marginRight: 12 }, []), txt('Link in bio.', { fontFamily: 'JBM', fontWeight: 700, fontSize: 26, color: ORANGE })]),
    ]),
    foot(true, 'growthterminal.io'),
  ]);
}
const tick = () => el({ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginRight: 16 }, [{ type: 'svg', props: { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', children: [{ type: 'path', props: { d: 'M4 12.5l5 5 11-12', stroke: GOOD, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } }] } }]);
function L_prodclaim(p) {
  return el(STAGE(INK, WHITE), [
    glow({ width: 700, height: 700, top: -200, right: -200 }),
    eyebrow(p.eyebrow || '◆ In the store'),
    el({ flex: 1, justifyContent: 'center' }, [
      displayHook(p.hook, { size: p.size || 100, baseColor: WHITE }),
      p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 34, lineHeight: 1.35, opacity: 0.84, maxWidth: 860, marginTop: 28 }) : el({}, []),
      p.features ? el({ marginTop: 34 }, p.features.map(f => el({ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, [tick(), txt(clean(f), { fontFamily: 'ITight', fontWeight: 600, fontSize: 28, color: WHITE })]))) : el({}, []),
    ]),
    el({ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }, [priceTag(p.price), el({ marginLeft: 18, flexDirection: 'row', alignItems: 'baseline' }, [txt(clean(p.name), { fontFamily: 'ITight', fontWeight: 800, fontSize: 30, color: WHITE, marginRight: 16 }), txt(clean(p.caps), { fontFamily: 'JBM', fontWeight: 500, fontSize: 17, color: '#9a8f82' })])]),
    foot(true, 'Link in bio.'),
  ]);
}
function L_prodsoon(p) {
  const tri = { type: 'svg', props: { width: 18, height: 18, viewBox: '0 0 24 24', children: [{ type: 'path', props: { d: 'M6 4l14 8-14 8z', fill: GOOD } }] } };
  return el(STAGE(INK, WHITE), [
    glow({ width: 560, height: 560, bottom: -200, left: -160 }),
    eyebrow('◆ Coming soon'),
    el({ flex: 1, justifyContent: 'center' }, [
      displayHook(p.hook, { size: p.size || 96, baseColor: WHITE }),
      p.sub ? txt(clean(p.sub), { fontFamily: 'ITight', fontWeight: 600, fontSize: 34, opacity: 0.84, maxWidth: 860, marginTop: 28 }) : el({}, []),
      el({ flexDirection: 'row', alignItems: 'center', marginTop: 34 }, [el({ marginRight: 10 }, [tri]), txt('NEXT IN THE GROWTH TERMINAL STORE', { fontFamily: 'JBM', fontWeight: 500, fontSize: 22, letterSpacing: 22 * 0.14, color: GOOD })]),
    ]),
    foot(true, 'Get it first. Link in bio.'),
  ]);
}

const SATORI_LAYOUTS = new Set(['statement', 'stat', 'feature', 'contrast', 'card', 'quote', 'tweet', 'ranked', 'edserif', 'edterminal', 'edmanifesto', 'vs', 'carousel', 'funnel', 'trajectory', 'annotated', 'editorial', 'prodshot', 'prodclaim', 'prodsoon']);
const BUILDERS = { statement: L_statement, stat: L_stat, feature: L_feature, contrast: L_contrast, card: L_card, quote: L_quote, tweet: L_tweet, ranked: L_ranked, edserif: L_edserif, edterminal: L_edterminal, edmanifesto: L_edmanifesto, vs: L_vs, carousel: L_carousel, funnel: L_funnel, trajectory: L_trajectory, annotated: L_annotated, editorial: L_editorial, prodshot: L_prodshot, prodclaim: L_prodclaim, prodsoon: L_prodsoon };

async function renderPostSatori(post, outBase) {
  const node = await BUILDERS[post.layout](post);
  const svg = await satori(node, { width: 1080, height: 1350, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
  fs.writeFileSync(outBase + '.png', png);
  await sharp(png).jpeg({ quality: 92 }).toFile(outBase + '.jpg');
}

module.exports = { renderPostSatori, SATORI_LAYOUTS };
