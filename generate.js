// Growth Terminal, auto-generating content engine
// Each run: assembles ONE fresh, on-brand Instagram creative (1080x1350) from a
// large combinatorial content bank, renders it to JPEG, writes meta.json for the
// publisher, and records what it used so posts don't repeat for a long time.
//
// No LLM, no API key, no external image credits. Pure deterministic assembly +
// a big pool of hand-written copy, so output stays on-brand and never runs dry.
//
// Usage:  node generate.js            -> writes creatives/<file>.jpg + meta.json
//         node generate.js --preview N -> renders N samples to creatives/ for QA
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const P = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo_parts.json'), 'utf8'));
const ORANGE = '#FC5802', INK = '#17130F', CREAM = '#F5F0E7', WHITE = '#FDFCFC', PAPERINK = '#1A1613';
const MUTED = '#6f665c', GOOD = '#37d67a';

// ---------- utilities ----------
function rng(seed) { // small deterministic PRNG so a run is reproducible from its seed
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }
function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function accent(s) { return `<span class="accent">${s}</span>`; }

function logo(o, w) {
  return `<svg viewBox="${P.full}" xmlns="http://www.w3.org/2000/svg"><g fill="${o}" ${P.tf}>${P.orange}</g><g fill="${w}" ${P.tf}>${P.white}</g></svg>`;
}

// ---------- shared CSS ----------
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;position:relative}
.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
.stage{width:1080px;height:1350px;padding:96px 88px;display:flex;flex-direction:column;position:relative}
.eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:26px;letter-spacing:.22em;text-transform:uppercase;font-weight:700}
.display{font-weight:800;letter-spacing:-.02em;line-height:.98;transform:skewX(-4deg);transform-origin:left}
.display .accent{color:${ORANGE}}
.h{font-weight:800;letter-spacing:-.02em;line-height:1.02}
.h .accent{color:${ORANGE}}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between}
.foot .lg{height:52px}
.foot .lg svg{height:52px;width:auto;display:block}
.toplogo svg{height:60px;width:auto;display:block}
.cta{font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:.02em;display:flex;align-items:center;gap:12px}
.cta .dot{width:12px;height:12px;border-radius:50%;background:${ORANGE}}
.grain{position:absolute;inset:0;opacity:.04;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.5) 1px,transparent 1px);background-size:4px 4px}
.glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.5}
`;

// ---------- layout renderers ----------
function L_statement(p) {
  const dark = p.bg !== 'cream';
  const bg = dark ? INK : CREAM, ink = dark ? WHITE : PAPERINK;
  const lg = dark ? logo(ORANGE, WHITE) : logo(ORANGE, INK);
  return `<div class="stage" style="background:${bg};color:${ink}">
    <div class="glow" style="width:640px;height:640px;background:${ORANGE};top:-160px;right:-160px"></div>
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div style="flex:1;display:flex;align-items:center">
      <div class="display" style="font-size:${p.size || 118}px">${p.hook}</div>
    </div>
    ${p.sub ? `<div style="font-size:34px;line-height:1.4;max-width:840px;opacity:.82;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${lg}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}
function L_contrast(p) {
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px">
      <div style="font-size:44px;line-height:1.15;font-weight:600;max-width:760px;opacity:.85">${p.lead}</div>
      <div class="display" style="font-size:${p.size || 130}px;color:#fff">${p.big}</div>
    </div>
    ${p.sub ? `<div style="font-size:32px;opacity:.8;max-width:820px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}
function L_stat(p) {
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="glow" style="width:720px;height:720px;background:${ORANGE};bottom:-220px;left:-200px"></div>
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div class="mono" style="font-size:${p.size || 200}px;font-weight:700;letter-spacing:-.03em;color:${ORANGE};line-height:.9">${p.stat}</div>
      <div style="font-size:46px;font-weight:800;letter-spacing:-.01em;margin-top:24px;max-width:840px;line-height:1.15">${p.label}</div>
      ${p.sub ? `<div style="font-size:32px;opacity:.8;margin-top:20px;max-width:820px">${p.sub}</div>` : ''}
    </div>
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}
function L_vs(p) {
  const rows = p.them.map(t => `<div style="display:flex;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.12)">
    <span class="mono" style="color:#8a8178;font-size:26px;min-width:150px">${t.who}</span>
    <span style="font-size:30px;opacity:.8">${t.what}</span></div>`).join('');
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div class="display" style="font-size:78px;margin:26px 0 40px">${p.hook}</div>
    <div>${rows}</div>
    <div style="margin-top:36px;background:${ORANGE};color:${INK};border-radius:20px;padding:30px 34px">
      <div class="mono" style="font-size:24px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;opacity:.75">Growth Terminal</div>
      <div style="font-size:44px;font-weight:800;letter-spacing:-.01em;margin-top:8px">${p.us}</div>
    </div>
    <div class="foot" style="margin-top:44px"><div class="lg">${logo(INK, INK)}</div>
      <div class="cta" style="color:${WHITE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}
function L_carousel(p) { // rendered as a single strong cover
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="glow" style="width:600px;height:600px;background:${ORANGE};top:-140px;left:-140px"></div>
    <div class="grain"></div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
      <div class="mono" style="font-size:24px;color:#8a8178">save this ★</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px">
      <div class="mono" style="font-size:300px;font-weight:700;color:${ORANGE};line-height:.8;letter-spacing:-.04em">${p.big}</div>
      <div class="display" style="font-size:82px;max-width:900px">${p.hook}</div>
    </div>
    ${p.sub ? `<div style="font-size:32px;opacity:.8;max-width:840px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}
// B) Live product diagnosis card
function L_card(p) {
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div style="flex:1;display:flex;align-items:center">
      <div style="width:100%;background:#211b15;border:1px solid rgba(255,255,255,.1);border-radius:28px;padding:48px 46px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px">
          <span class="mono" style="font-size:22px;letter-spacing:.14em;color:#9a8f82;text-transform:uppercase">#1 constraint detected</span>
          <span class="mono" style="font-size:20px;color:${GOOD};display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:${GOOD};display:inline-block"></span>VERIFIED</span></div>
        <div class="h" style="font-size:92px;color:${ORANGE};margin-bottom:30px">${p.constraint}</div>
        <div style="height:16px;border-radius:10px;background:#000;overflow:hidden;margin-bottom:14px"><div style="width:${p.pct}%;height:100%;background:${ORANGE}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:26px"><span style="color:#9a8f82">Impact</span><span style="font-weight:800">${p.impact}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:26px;margin-top:12px"><span style="color:#9a8f82">Confidence</span><span style="font-weight:800;color:${GOOD}">${p.confidence}</span></div>
      </div></div>
    ${p.sub ? `<div style="font-size:32px;font-weight:600;max-width:840px;margin:24px 0 8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// C) Quote card (cream)
function L_quote(p) {
  return `<div class="stage" style="background:${CREAM};color:${PAPERINK}">
    <div class="grain" style="background-image:radial-gradient(rgba(0,0,0,.4) 1px,transparent 1px)"></div>
    <div style="font-size:220px;line-height:.6;color:${ORANGE};font-weight:800;height:120px">&ldquo;</div>
    <div style="flex:1;display:flex;align-items:center">
      <div class="h" style="font-size:82px">${p.quote}</div></div>
    <div class="mono" style="font-size:26px;letter-spacing:.1em;color:#8a7f70;margin-bottom:20px">&mdash; GROWTH TERMINAL</div>
    <div class="foot"><div class="lg">${logo(ORANGE, INK)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// D) Annotated highlight (hand-drawn circle)
function L_annotated(p) {
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div style="flex:1;display:flex;align-items:center"><div>
      <div style="font-size:74px;font-weight:800;line-height:1.15;max-width:880px">${p.pre}<span style="position:relative;white-space:nowrap;color:${ORANGE}">${p.circled}<svg style="position:absolute;left:-18px;top:-14px;width:${p.ring || 640}px;height:150px" viewBox="0 0 ${p.ring || 640} 150"><ellipse cx="${(p.ring || 640) / 2}" cy="78" rx="${(p.ring || 640) / 2 - 12}" ry="60" fill="none" stroke="${ORANGE}" stroke-width="5" transform="rotate(-3 ${(p.ring || 640) / 2} 78)"/></svg></span>${p.post}</div>
      </div></div>
    ${p.sub ? `<div style="font-size:30px;opacity:.8;max-width:820px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// E) Funnel with the leak stage highlighted
function L_funnel(p) {
  const bars = p.stages.map(s => `
    <div style="display:flex;align-items:center;gap:26px;margin:0 0 18px">
      <div class="mono" style="width:210px;text-align:right;font-size:28px;color:#b8afa2">${s[0]}</div>
      <div style="flex:1;display:flex;justify-content:center">
        <div style="width:${s[2] * 100}%;height:74px;border-radius:12px;background:${s[3] ? ORANGE : '#2c251e'};display:flex;align-items:center;justify-content:flex-end;padding-right:22px;font-weight:800;font-size:30px;color:${s[3] ? INK : WHITE}">${s[1]}</div>
      </div>
      <div style="width:150px;font-size:24px;color:${ORANGE};font-weight:700">${s[3] ? '&larr; leak' : ''}</div>
    </div>`).join('');
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div class="h" style="font-size:60px;margin:18px 0 6px">${p.hook}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">${bars}</div>
    ${p.sub ? `<div style="font-size:30px;opacity:.82;max-width:840px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// F) Ranked constraints (horizontal bars, #1 highlighted)
function L_ranked(p) {
  const bars = p.rows.map((r, i) => `
    <div style="margin:0 0 22px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
        <span style="font-size:30px;font-weight:${r[2] ? 800 : 600};color:${r[2] ? WHITE : '#b8afa2'}"><span class="mono" style="color:${ORANGE};margin-right:14px">${i + 1}</span>${r[0]}</span>
        <span class="mono" style="font-size:26px;color:${r[2] ? ORANGE : MUTED};font-weight:700">${r[1]}</span></div>
      <div style="height:22px;border-radius:8px;background:#221c16;overflow:hidden"><div style="width:${r[1]}%;height:100%;border-radius:8px;background:${r[2] ? ORANGE : '#4a4038'}"></div></div>
    </div>`).join('');
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div class="h" style="font-size:60px;margin:18px 0 6px">${p.hook}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">${bars}
      <div class="mono" style="font-size:22px;color:${MUTED};margin-top:6px">&hellip;7 more, ranked by impact on your revenue</div></div>
    ${p.sub ? `<div style="font-size:30px;opacity:.82;max-width:840px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// G) Forecast-vs-actual trajectory
function L_trajectory(p) {
  const W = 880, H = 440, pad = 20;
  const fc = p.fc, ac = p.ac;
  const lo = 40, hi = Math.max(...fc.map(x => x[1]), ...ac.map(x => x[1])) + 4;
  const mx = v => pad + (v / 5) * (W - 2 * pad);
  const my = v => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const line = pts => pts.map((pt, i) => (i ? 'L' : 'M') + mx(pt[0]).toFixed(1) + ' ' + my(pt[1]).toFixed(1)).join(' ');
  const dots = pts => pts.map(pt => `<circle cx="${mx(pt[0]).toFixed(1)}" cy="${my(pt[1]).toFixed(1)}" r="7" fill="${ORANGE}" stroke="${INK}" stroke-width="3"/>`).join('');
  return `<div class="stage" style="background:${INK};color:${WHITE}">
    <div class="grain"></div>
    <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow}</div>
    <div class="h" style="font-size:60px;margin:18px 0 6px">${p.hook}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;gap:34px;margin-bottom:16px" class="mono">
        <span style="font-size:24px;color:#b8afa2"><span style="display:inline-block;width:26px;height:0;border-top:3px dashed #b8afa2;vertical-align:middle;margin-right:10px"></span>Forecast</span>
        <span style="font-size:24px;color:${ORANGE}"><span style="display:inline-block;width:26px;height:0;border-top:3px solid ${ORANGE};vertical-align:middle;margin-right:10px"></span>Actual</span>
        <span style="font-size:24px;color:${GOOD};margin-left:auto">&#10003; VERIFIED</span>
      </div>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        ${[0.35, 0.55, 0.75].map(f => `<line x1="${pad}" y1="${(H * f).toFixed(0)}" x2="${W - pad}" y2="${(H * f).toFixed(0)}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`).join('')}
        <path d="${line(fc)}" fill="none" stroke="#b8afa2" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>
        <path d="${line(ac)}" fill="none" stroke="${ORANGE}" stroke-width="4" stroke-linecap="round"/>
        ${dots(ac)}
      </svg>
    </div>
    ${p.sub ? `<div style="font-size:30px;opacity:.82;max-width:860px;margin-bottom:8px">${p.sub}</div>` : ''}
    <div class="foot"><div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="cta" style="color:${ORANGE}"><span class="dot"></span>${p.cta || 'growthterminal.io'}</div></div>
  </div>`;
}

// H) Tweet card, "authority reminder" format (avatar + verified name + one line)
function L_tweet(p) {
  const check = `<span style="display:inline-flex;width:36px;height:36px;border-radius:50%;background:${ORANGE};align-items:center;justify-content:center;color:#000;font-size:23px;font-weight:900;line-height:1">✓</span>`;
  const avatar = `<div style="width:100px;height:100px;border-radius:50%;background:#1a1613;display:flex;align-items:center;justify-content:center;flex:none">
    <svg viewBox="${P.icon}" xmlns="http://www.w3.org/2000/svg" style="height:52px;width:auto"><g fill="${ORANGE}" ${P.tf}>${P.orange}</g><g fill="${WHITE}" ${P.tf}>${P.white}</g></svg></div>`;
  return `<div class="stage" style="background:#000;color:${WHITE};justify-content:center">
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:40px">
      ${avatar}
      <div>
        <div style="display:flex;align-items:center;gap:12px;font-size:40px;font-weight:800;letter-spacing:-.01em">Growth Terminal ${check}</div>
        <div style="font-size:33px;color:#8a8f98;margin-top:3px">@growthterminal</div>
      </div>
    </div>
    <div style="font-size:${p.size || 62}px;font-weight:500;line-height:1.32;letter-spacing:-.01em;max-width:900px">${p.tweet}</div>
    <div style="position:absolute;left:88px;bottom:76px;font-family:ui-monospace,Menlo,monospace;font-size:24px;letter-spacing:.08em;color:#5b6068">growthterminal.io</div>
  </div>`;
}

// Editorial hero, the big-tech ad format: logo top-left, one large upright headline,
// a single subhead line, generous negative space, a tiny caption bottom-left. Warm,
// photographic dark ground. Deliberately un-skewed and quiet (contrast to .display layouts).
function L_editorial(p) {
  return `<div class="stage" style="background:radial-gradient(120% 90% at 78% 12%, #3a2a18 0%, #241a10 42%, ${INK} 100%);color:${WHITE};padding:104px 96px">
    <div class="glow" style="width:820px;height:820px;background:${ORANGE};opacity:.28;top:-260px;right:-240px"></div>
    <div class="grain"></div>
    <div class="toplogo">${logo(ORANGE, WHITE)}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:20px">
      <div class="h" style="font-size:${p.size || 92}px;max-width:900px">${p.hook}</div>
      ${p.sub ? `<div style="font-size:38px;line-height:1.32;font-weight:500;max-width:760px;opacity:.72;margin-top:32px">${p.sub}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div class="mono" style="font-size:22px;letter-spacing:.06em;color:rgba(253,252,252,.42)">${p.caps || 'Growth diagnosis · Google Sheets'}</div>
      <div class="cta" style="color:${ORANGE};font-size:22px"><span class="dot" style="width:10px;height:10px"></span>growthterminal.io</div>
    </div>
  </div>`;
}

const RENDER = { statement: L_statement, contrast: L_contrast, stat: L_stat, vs: L_vs, carousel: L_carousel,
  card: L_card, quote: L_quote, annotated: L_annotated, funnel: L_funnel, ranked: L_ranked, trajectory: L_trajectory,
  tweet: L_tweet, editorial: L_editorial };

// ---------- content atoms ----------
// The 12 places growth actually gets stuck (GT's core model) + a symptom line each.
const CONSTRAINTS = [
  ['Acquisition', 'not enough of the right people are finding you'],
  ['Activation', 'people sign up, then never reach the first win'],
  ['Retention', 'they get value once, then quietly drift away'],
  ['Conversion', 'interest is high but the yes never lands'],
  ['Traffic', 'the top of the funnel is thinner than the model needs'],
  ['Offer', 'what you sell is close, but not quite worth the price'],
  ['Capacity', 'demand is there and you physically cannot serve it'],
  ['Churn', 'you refill a leaking bucket every single month'],
  ['Fulfilment', 'the promise is great and the delivery lags it'],
  ['Cash collection', 'the revenue is booked but the cash arrives late'],
  ['Utilisation', 'you own the capacity and it sits half-used'],
  ['Pricing', 'you are leaving margin on the table on every deal'],
];

// Rotating hashtag pool, each post pulls a fresh subset so blocks vary (IG best practice).
const CORE_TAGS = ['#growthterminal', '#b2bsaas', '#growthmarketing'];
const TAG_POOL = ['#saas', '#startups', '#founders', '#foundertips', '#startuptips', '#revenueops',
  '#revenuegrowth', '#growthstrategy', '#marketingstrategy', '#growthhacking', '#businessgrowth',
  '#scaleup', '#startupgrowth', '#datadriven', '#analytics', '#kpis', '#cro', '#retention',
  '#productmarketing', '#saasmarketing', '#googlesheets', '#startuptools', '#marketinganalytics',
  '#unitmetrics', '#leadership', '#forecasting', '#accountability', '#opportunitycost', '#bootstrapping'];
function tags(r) {
  return CORE_TAGS.concat(shuffle(TAG_POOL, r).slice(0, 8)).join(' ');
}
const EYEBROWS = ['◆ Growth Terminal', '◆ Diagnosis, not dashboard', '◆ The one constraint',
  '◆ Priced, not guessed', '◆ Verify the call', '◆ Run the diagnostic'];
const CTA_BIO = ['Free 60-second diagnostic, link in bio.', 'Run the free diagnostic. Link in bio.',
  'Diagnose your #1 constraint free. Link in bio.', 'Try it free in Google Sheets. Link in bio.',
  '→ growthterminal.io'];

// ---------- generators (each returns a fully-formed post object) ----------
// A "sig" is a stable signature used for de-duplication across runs.

function gen_statement(r) {
  const bank = [
    { hook: `You don't get a<br>dashboard.<br>You get a ${accent('verdict')}.`,
      sub: `Every analysis ends in a graded prediction: the #1 constraint, its dollar range, and a 90-day plan.`, size: 116,
      cap: `You don't get a dashboard. You get a verdict.\n\nDashboards show you 40 numbers and let you pick the story. Growth Terminal names the ONE constraint holding your growth back, tells you the dollar range it's worth, then verifies the call against real revenue.\n\nClarity first. No 40-tab spreadsheet.`,
      fc: `What's the one constraint you *think* is holding your growth back right now? 👇` },
    { hook: `We tell you the ${accent('one')} thing holding your growth back, and what it's worth.`,
      sub: `In Google Sheets. In about 60 seconds.`, size: 100,
      cap: `Most "growth advice" gives you ten things to fix. That's the problem.\n\nGrowth Terminal names the single biggest constraint on your revenue right now, and quantifies what fixing it is worth. One move, ranked above everything else, with a number attached.`,
      fc: `Diagnosis before treatment, always. Where are you stuck?` },
    { hook: `Verified.<br>Not ${accent('vibes')}.`,
      sub: `We track every forecast against real revenue, and show you when we were wrong.`, size: 122,
      cap: `Verified. Not vibes.\n\nEveryone in growth makes confident calls. Almost no one checks them. Growth Terminal logs every forecast, tracks it against your actual revenue, and grades itself, verified or missed, so you trust the calls that keep landing and catch the ones that don't.`,
      fc: `When we're wrong, the tool says so. That's the point.` },
    { hook: `Your growth isn't ${accent('slow')}.<br>It's mis-diagnosed.`,
      sub: `You're pulling a real lever. It just isn't the one that's stuck.`, size: 108,
      cap: `Your growth isn't slow. It's mis-diagnosed.\n\nMost teams are executing hard on a lever that was never the bottleneck. The effort is real; the target is wrong. Growth Terminal finds the constraint that's actually capping you, before you spend another quarter on the wrong one.`,
      fc: `Effort on the wrong lever still feels like work. That's the trap.` },
    { hook: `Ten problems.<br>${accent('One')} that matters<br>this quarter.`,
      sub: `We rank them so you stop spreading yourself across all ten.`, size: 112,
      cap: `You can always find ten things to fix. You can only afford to fix one well this quarter.\n\nGrowth Terminal ranks all twelve places growth gets stuck and tells you which one is yours right now, so your team points at a single target instead of ten.`,
      fc: `If everything is a priority, nothing is. Which one is yours?` },
    { hook: `The most expensive number in growth is the one you ${accent("can't see")}.`,
      sub: `A hidden constraint doesn't send an invoice. It just quietly caps you.`, size: 92, bg: 'cream',
      cap: `The most expensive number in growth is the one you can't see.\n\nA hidden constraint never sends an invoice, it just quietly caps every month. Growth Terminal makes that number visible and puts a dollar range on it, so you can act on it instead of absorbing it.`,
      fc: `The scariest line item is the one that never shows up on the P&L.` },
    { hook: `Point it at the sheet you ${accent('already have')} open.`,
      sub: `No new platform. No export. The add-on reads the report you already run.`, size: 104,
      cap: `No new platform. No migration. No export.\n\nGrowth Terminal is a Google Sheets add-on. Point it at the report you already export, and it ranks the twelve places growth gets stuck, tells you which one is yours, and prices it. Your data never leaves the sheet.`,
      fc: `It runs where your data already lives. Nothing to migrate.` },
    { hook: `Stop guessing which lever to ${accent('pull')}.`,
      sub: `You already have the data. You're missing the diagnosis.`, size: 112,
      cap: `Stop guessing which lever to pull.\n\nYou already have the data, you're missing the diagnosis. Growth Terminal reads what you already track, ranks where growth is actually stuck, and names the one move worth making first, with the dollar range attached.`,
      fc: `Which lever are you pulling right now, and how sure are you?` },
    { hook: `A second opinion for your ${accent('growth')}.`,
      sub: `The one you'd get from an operator who's seen the pattern a hundred times.`, size: 116,
      cap: `Think of it as a second opinion for your growth.\n\nThe kind you'd get from an operator who has seen this exact pattern a hundred times, which constraint is really biting, what it's worth, and what to do in the next 90 days. Except it runs in your spreadsheet, in a minute.`,
      fc: `Would a second opinion change what you're working on this month?` },
    { hook: `Fix the ${accent('constraint')}.<br>Not the symptom.`,
      sub: `Low conversion is usually a symptom. The constraint sits one step upstream.`, size: 116,
      cap: `Fix the constraint, not the symptom.\n\n"Conversion is low" is a symptom. The real constraint usually sits one step upstream, the offer, the traffic quality, the activation moment. Growth Terminal traces the symptom back to its source so you fix the thing that actually moves the number.`,
      fc: `What symptom have you been treating that keeps coming back?` },
  ];
  const b = pick(bank, r);
  return { layout: 'statement', bg: b.bg || 'dark', eyebrow: b.eyebrow || pick(EYEBROWS, r),
    hook: b.hook, sub: b.sub, size: b.size, caption: b.cap, first_comment: b.fc,
    sig: 'stmt:' + stripHtml(b.hook).slice(0, 40) };
}

function gen_contrast(r) {
  const bank = [
    { lead: `Most growth mistakes are not strategy failures.`, big: `THEY'RE<br>${accent('DIAGNOSIS')}<br>FAILURES.`, size: 128,
      sub: `Executing hard against the wrong constraint burns a full quarter before anyone can prove it was the wrong call.`,
      cap: `Most growth mistakes aren't strategy failures. They're diagnosis failures.\n\nThe team executes hard, new channels, new pricing, new funnel, against a constraint that was never the real bottleneck. A whole quarter gone before anyone can prove the call was wrong. Get the diagnosis right first. Then move.`,
      fc: `Ever spent a quarter on the wrong lever? Same. That's why this exists.` },
    { lead: `Stop guessing which lever to pull.`, big: `DIAGNOSE IT<br>IN ${accent('60 SECONDS')}.`, size: 116,
      sub: `Add the Growth Terminal add-on to the sheet you already have open.`,
      cap: `Stop guessing which lever to pull.\n\nGrowth Terminal reads the report you already export, ranks the twelve places growth gets stuck, and tells you which one is yours, with the dollar range attached. No new platform. It runs where your data already lives.`,
      fc: `It's a Google Sheets add-on. Your data never leaves the sheet.` },
    { lead: `More dashboards won't save you.`, big: `YOU DON'T NEED<br>MORE ${accent('DATA')}.<br>YOU NEED A CALL.`, size: 108,
      sub: `A verdict you can act on beats another chart you have to interpret.`,
      cap: `You don't need more data. You need a call.\n\nMost teams are drowning in dashboards and starving for a decision. Growth Terminal reads the data you already have and makes the call: here's your #1 constraint, here's what it's worth, here's the plan. A verdict beats another chart.`,
      fc: `How many dashboards do you check that never change a decision?` },
    { lead: `The bottleneck is rarely where it hurts.`, big: `THE PAIN AND THE<br>${accent('CAUSE')} ARE NOT<br>THE SAME PLACE.`, size: 96,
      sub: `Churn shows up at the end. It usually starts at activation.`,
      cap: `The bottleneck is rarely where it hurts.\n\nChurn shows up at the end of the journey, but it usually starts at a weak activation moment weeks earlier. Growth Terminal traces the pain back to its cause so you fix the source, not the symptom.`,
      fc: `Where does it hurt, and are you sure that's where it starts?` },
    { lead: `Effort is not the problem.`, big: `YOU'RE WORKING<br>HARD ON THE<br>${accent('WRONG THING')}.`, size: 110,
      sub: `The most expensive quarter is the one spent executing perfectly against the wrong constraint.`,
      cap: `Effort is not your problem. Aim is.\n\nThe most expensive quarter a team can have is one spent executing perfectly, against the wrong constraint. Growth Terminal makes sure the thing you pour effort into is the thing actually capping your growth.`,
      fc: `Perfect execution on the wrong target still loses. Aim first.` },
    { lead: `Advice is cheap. Being right is not.`, big: `EVERYONE HAS<br>A ${accent('TAKE')}.<br>WE HAVE A SCORE.`, size: 104,
      sub: `Every call we make gets graded against your real revenue.`,
      cap: `Advice is cheap. Being right is not.\n\nEveryone has a take on your growth. Growth Terminal is the only one that grades its own, every forecast tracked against your real revenue, marked verified or missed. Opinions are free; a track record isn't.`,
      fc: `Whose growth advice has ever been scored against reality? Ours is.` },
  ];
  const b = pick(bank, r);
  return { layout: 'contrast', eyebrow: b.eyebrow || pick(EYEBROWS, r), lead: b.lead, big: b.big, size: b.size,
    sub: b.sub, caption: b.cap, first_comment: b.fc, sig: 'con:' + stripHtml(b.big).slice(0, 40) };
}

function gen_stat(r) {
  const bank = [
    { stat: `$88K–$140K`, label: `The constraint you couldn't see. Priced, per year.`, size: 190,
      sub: `Every diagnosis ends with a dollar range, not a vibe.`,
      cap: `"$88K–$140K / yr."\n\nThat's a real range from a real diagnosis: the annual value of one unfixed constraint. Growth Terminal doesn't just tell you what's wrong; it tells you what fixing it is worth, so you decide with a number instead of a hunch.`,
      fc: `Every constraint we surface comes with a dollar range. Decisions get easier.` },
    { stat: `60 sec`, label: `From spreadsheet to diagnosis.`, size: 220,
      sub: `Add to Sheets → understand → diagnose → forecast → verify.`,
      cap: `60 seconds from spreadsheet to diagnosis.\n\nNo onboarding call. No data migration. Add the add-on to Google Sheets, point it at the report you already have, and get your #1 growth constraint ranked and priced before your coffee's cold.`,
      fc: `Genuinely ~60 seconds. It reads the sheet you already have open.` },
    { stat: `12`, label: `The number of places growth actually gets stuck.`, size: 260,
      sub: `Acquisition, activation, retention, conversion, pricing… we rank all twelve and name yours.`,
      cap: `Growth only gets stuck in twelve places.\n\nAcquisition · Activation · Retention · Conversion · Traffic · Offer · Capacity · Churn · Fulfilment · Cash collection · Utilisation · Pricing. The hard part isn't the list, it's knowing which one is YOUR #1 right now. That's the whole job.`,
      fc: `Which of the 12 is biting you hardest this quarter?` },
    { stat: `1`, label: `One constraint. Ranked above everything else.`, size: 300,
      sub: `Not a to-do list. A single, prioritised move, with a number on it.`,
      cap: `One.\n\nThat's how many constraints you should be working on right now. Growth Terminal ranks all twelve and hands you the single one that's capping you this quarter, with the dollar range attached, so your team executes against one clear target.`,
      fc: `If you could only fix one thing this quarter, do you know which?` },
    { stat: `$0`, label: `The cost to find out what's really stuck.`, size: 260,
      sub: `The 60-second diagnostic is free. The clarity isn't optional.`,
      cap: `$0 to find out what's actually capping your growth.\n\nThe 60-second diagnostic is free, run it on the data you already have. You'll get your #1 constraint, ranked and priced. The clarity is the point; the price is zero.`,
      fc: `Free to run. What's the harm in a second opinion?` },
    { stat: `90 days`, label: `From diagnosis to a plan you can actually run.`, size: 190,
      sub: `Every verdict ships with a 90-day plan, then we grade it.`,
      cap: `A diagnosis without a plan is just a nice chart.\n\nEvery Growth Terminal verdict ships with a concrete 90-day plan for the constraint it found, then tracks the outcome against your real revenue and grades the call. Diagnosis, plan, and a scorecard.`,
      fc: `A verdict is step one. The 90-day plan is where it pays off.` },
  ];
  const b = pick(bank, r);
  return { layout: 'stat', eyebrow: b.eyebrow || pick(EYEBROWS, r), stat: b.stat, label: b.label, size: b.size,
    sub: b.sub, caption: b.cap, first_comment: b.fc, sig: 'stat:' + stripHtml(b.stat + b.label).slice(0, 40) };
}

function gen_vs(r) {
  const bank = [
    { hook: `Priced against the<br>mistake, not the<br>${accent('dashboard')}.`,
      them: [
        { who: 'Agencies', what: 'execute the work, but never tell you which move is worth the most.' },
        { who: 'Consultants', what: 'advise, then move on. Nobody checks whether the call held.' },
        { who: 'Dashboards', what: 'report the past. Not one view answers "what\'s the one move now?"' }],
      us: `Grades its own call. Names the constraint, prices it, verifies it against real revenue.`,
      cap: `Agencies execute. Consultants advise, then leave. Dashboards report the past.\n\nNone of them close the loop. Growth Terminal names the #1 constraint, prices it, hands you a 90-day plan, then grades its own forecast against your actual revenue. When we're wrong, you'll see that too. That's the difference: it's accountable.`,
      fc: `The verify step is the whole point. We show you when the call was wrong.` },
    { hook: `Built to make a<br>${accent('call')}, not<br>more reports.`,
      them: [
        { who: 'BI tools', what: 'show you everything and decide nothing.' },
        { who: 'Gut feel', what: 'is fast and confident, and unaccountable.' },
        { who: 'Spreadsheets', what: 'hold the data but never rank what matters.' }],
      us: `Reads your data and makes the call: the #1 constraint, priced, with a plan.`,
      cap: `BI tools show everything and decide nothing. Gut feel is fast but unaccountable. Spreadsheets hold the data but never rank what matters.\n\nGrowth Terminal reads what you already track and makes the call, your #1 constraint, priced, with a 90-day plan. A decision, not another dashboard.`,
      fc: `A tool that decides, not just displays. That's the whole idea.` },
  ];
  const b = pick(bank, r);
  return { layout: 'vs', eyebrow: b.eyebrow || '◆ Priced against the mistake', hook: b.hook, them: b.them, us: b.us,
    caption: b.cap, first_comment: b.fc, sig: 'vs:' + stripHtml(b.hook).slice(0, 40) };
}

// Generated per-constraint post ("Is <X> your #1?"), 12 distinct, on-brand posts.
function gen_constraint(r) {
  const [name, symptom] = pick(CONSTRAINTS, r);
  const hook = `Is ${accent(name.toLowerCase())} your<br>#1 constraint?`;
  return { layout: 'statement', bg: 'dark', size: 110, eyebrow: '◆ The one constraint',
    hook, sub: `The tell: ${symptom}.`,
    caption: `Is ${name.toLowerCase()} your #1 constraint right now?\n\nThe tell: ${symptom}. It's one of the twelve places growth gets stuck, but it's only worth fixing first if it's actually your biggest. Growth Terminal ranks all twelve against your data and tells you whether ${name.toLowerCase()} is really the one, or a symptom of something upstream.`,
    first_comment: `Does "${symptom}" sound like your account this quarter? 👇`,
    sig: 'cons:' + name };
}

// Save-this style cover with a big number and a promise.
function gen_carousel(r) {
  const bank = [
    { big: `12`, hook: `The 12 places growth<br>actually gets ${accent('stuck')}.`,
      sub: `Which one is yours? Find out in 60 seconds.`,
      cap: `Growth only gets stuck in twelve places. Save this. 👇\n\nAcquisition · Activation · Retention · Conversion · Traffic · Offer · Capacity · Churn · Fulfilment · Cash collection · Utilisation · Pricing.\n\nThe hard part is knowing which one is YOUR #1 right now, with a dollar range attached. That's the whole job Growth Terminal does.`,
      fc: `Which of the 12 is biting hardest this quarter?` },
    { big: `3`, hook: `3 questions that reveal<br>your real ${accent('bottleneck')}.`,
      sub: `Save this before your next growth meeting.`,
      cap: `Three questions that reveal your real bottleneck. Save this. 👇\n\n1. Where does momentum die, before signup, at first use, or after?\n2. If you doubled traffic tomorrow, what breaks first?\n3. What's the one number that, if it moved 10%, changes everything?\n\nGrowth Terminal answers all three against your data, and prices the fix.`,
      fc: `Answer #2 honestly and you usually find the constraint.` },
  ];
  const b = pick(bank, r);
  return { layout: 'carousel', eyebrow: '◆ Save this', big: b.big, hook: b.hook, sub: b.sub,
    caption: b.cap, first_comment: b.fc, sig: 'car:' + b.big + stripHtml(b.hook).slice(0, 20) };
}

// B) Live diagnosis card, shows the product output
function gen_card(r) {
  const bank = [
    { c: 'Retention', impact: '$88K–$140K / yr', conf: '92%', pct: 78 },
    { c: 'Activation', impact: '$60K–$110K / yr', conf: '88%', pct: 71 },
    { c: 'Pricing', impact: '$120K–$300K / yr', conf: '84%', pct: 64 },
    { c: 'Conversion', impact: '$45K–$95K / yr', conf: '90%', pct: 69 },
  ];
  const b = pick(bank, r);
  return { layout: 'card', eyebrow: '◆ Live diagnosis', constraint: b.c, impact: b.impact, confidence: b.conf, pct: b.pct,
    sub: `This is what you get back. Not a dashboard. A verdict.`, hook: `#1 constraint: ${b.c}`,
    caption: `This is what a Growth Terminal diagnosis looks like.\n\nNot 40 metrics to interpret, one constraint, named, with the dollar range it's costing you and how sure we are. Here, ${b.c.toLowerCase()} was capping the business by ${b.impact.replace(' / yr', ' a year')}.\n\nYours is one run away.`,
    first_comment: `What would you do differently if your #1 constraint came pre-priced?`,
    sig: 'card:' + b.c };
}

// C) Quote card (cream, share-bait)
function gen_quote(r) {
  const bank = [
    { q: `The most expensive number in growth is the one you ${accent('can’t see')}.`,
      cap: `The most expensive number in growth is the one you can't see.\n\nA hidden constraint never sends an invoice, it just quietly caps every month. Growth Terminal makes it visible and puts a dollar range on it.`,
      fc: `The scariest line item is the one that never shows up on the P&L.` },
    { q: `You don’t get a dashboard. You get a ${accent('verdict')}.`,
      cap: `You don't get a dashboard. You get a verdict.\n\nDashboards show 40 numbers and let you pick the story. We name the one constraint holding you back, price it, and verify the call against real revenue.`,
      fc: `Clarity beats another chart. Every time.` },
    { q: `Fix the ${accent('constraint')}. Not the symptom.`,
      cap: `Fix the constraint, not the symptom.\n\n"Conversion is low" is a symptom. The real constraint usually sits one step upstream. We trace it back to the source so you fix the thing that actually moves the number.`,
      fc: `What symptom have you been treating that keeps coming back?` },
    { q: `${accent('Diagnosis')} before treatment. Always.`,
      cap: `Diagnosis before treatment. Always.\n\nMost growth mistakes aren't strategy failures, they're diagnosis failures. Get the constraint right first, then move.`,
      fc: `Would you take the medicine before the diagnosis? Same in growth.` },
  ];
  const b = pick(bank, r);
  return { layout: 'quote', quote: b.q, hook: stripHtml(b.q), caption: b.cap, first_comment: b.fc,
    sig: 'quote:' + stripHtml(b.q).slice(0, 36) };
}

// D) Annotated highlight (hand-drawn circle)
function gen_annotated(r) {
  const bank = [
    { pre: `You don’t have a traffic problem. You have a `, circled: `diagnosis problem`, post: `.`, ring: 640,
      sub: `Everyone treats the symptom. We find the cause.`,
      cap: `You don't have a traffic problem. You have a diagnosis problem.\n\nMore traffic into a funnel that leaks somewhere else just costs more. We find where growth is actually stuck first, then you spend.`,
      fc: `Where do you *think* you're stuck, and how sure are you?` },
    { pre: `You’re not behind. You’re working on the `, circled: `wrong constraint`, post: `.`, ring: 620,
      sub: `Effort on the wrong lever still feels like work.`,
      cap: `You're not behind. You're working on the wrong constraint.\n\nThe effort is real; the target is off. Growth Terminal points you at the one lever that's actually capping you this quarter.`,
      fc: `Perfect execution on the wrong target still loses.` },
    { pre: `It’s not that growth is `, circled: `hard`, post: `. It’s mis-measured.`, ring: 300,
      sub: `The right number, ranked above the noise.`,
      cap: `It's not that growth is hard. It's mis-measured.\n\nToo many metrics, no ranking. We score the twelve places growth gets stuck and hand you the one that matters most right now.`,
      fc: `How many metrics do you track that never change a decision?` },
  ];
  const b = pick(bank, r);
  return { layout: 'annotated', eyebrow: '◆ Read this twice', pre: b.pre, circled: b.circled, post: b.post, ring: b.ring,
    sub: b.sub, hook: b.pre + b.circled + b.post, caption: b.cap, first_comment: b.fc,
    sig: 'ann:' + b.circled };
}

// E) Funnel with the leak highlighted
function gen_funnel(r) {
  const bank = [
    { hook: `Your funnel isn’t<br>slow. It’s ${accent('leaking.')}`,
      stages: [['Visitors', '100%', 1.0, false], ['Signups', '32%', 0.62, false], ['Activated', '15%', 0.40, true], ['Retained', '9%', 0.30, false]],
      sub: `Activation is where most of your growth quietly disappears. We find the exact stage, and price it.`,
      cap: `Most growth doesn't die at the top of the funnel. It leaks in the middle.\n\nHere, activation is the drop that's costing the most, people sign up and never reach the first win. Growth Terminal pinpoints the leaking stage and tells you what sealing it is worth.`,
      fc: `Where does your funnel leak hardest, top, middle, or bottom?` },
    { hook: `You don’t need more<br>leads. You need to ${accent('keep them.')}`,
      stages: [['Leads', '100%', 1.0, false], ['Booked', '41%', 0.66, false], ['Closed', '19%', 0.44, false], ['Retained', '11%', 0.32, true]],
      sub: `Pouring leads into a leaky retention stage just costs more. Fix the leak first.`,
      cap: `More leads into a leaky funnel just costs more.\n\nWhen retention is the constraint, every new lead is a bucket with a hole in it. Growth Terminal shows you the stage doing the damage before you spend another dollar on top-of-funnel.`,
      fc: `Are you filling the bucket or fixing the hole?` },
  ];
  const b = pick(bank, r);
  return { layout: 'funnel', eyebrow: '◆ Where growth leaks', hook: b.hook, stages: b.stages, sub: b.sub,
    caption: b.cap, first_comment: b.fc, sig: 'funnel:' + stripHtml(b.hook).slice(0, 24) };
}

// F) Ranked constraints
function gen_ranked(r) {
  const bank = [
    { hook: `The 12 places growth<br>gets stuck: ${accent('scored.')}`,
      rows: [['Retention', 94, true], ['Activation', 81, false], ['Pricing', 63, false], ['Acquisition', 48, false], ['Conversion', 35, false]] },
    { hook: `We rank all twelve.<br>You fix the ${accent('#1.')}`,
      rows: [['Pricing', 91, true], ['Conversion', 77, false], ['Retention', 66, false], ['Offer', 52, false], ['Traffic', 40, false]] },
  ];
  const b = pick(bank, r);
  return { layout: 'ranked', eyebrow: '◆ Ranked for you', hook: b.hook, rows: b.rows,
    sub: `We don’t hand you a checklist. We tell you which one to fix first.`,
    caption: `Twelve places growth gets stuck. We score all of them against your data and rank them.\n\nThe point isn't the list, it's knowing which one is your #1 right now, with the dollar range attached. That's the move that changes the quarter.`,
    first_comment: `If you could only fix one this quarter, do you know which?`,
    sig: 'ranked:' + b.rows[0][0] };
}

// G) Forecast-vs-actual trajectory
function gen_trajectory(r) {
  const bank = [
    { fc: [[0, 60], [1, 88], [2, 120], [3, 150], [4, 182], [5, 210]], ac: [[0, 58], [1, 84], [2, 128], [3, 150], [4, 196], [5, 224]] },
    { fc: [[0, 50], [1, 70], [2, 96], [3, 128], [4, 160], [5, 190]], ac: [[0, 52], [1, 74], [2, 92], [3, 134], [4, 168], [5, 205]] },
  ];
  const b = pick(bank, r);
  return { layout: 'trajectory', eyebrow: '◆ We grade our own calls', hook: `The forecast, checked<br>against ${accent('real revenue.')}`,
    fc: b.fc, ac: b.ac,
    sub: `Every prediction we make gets tracked against what actually happened. When we’re wrong, you see it too.`,
    caption: `Everyone in growth makes confident calls. Almost no one checks them.\n\nGrowth Terminal logs every forecast and tracks it against your real revenue, verified or missed. You build trust in the calls that keep landing and catch the ones that don't. Accountability is the feature.`,
    first_comment: `When we're wrong, the tool says so. That's the point.`,
    sig: 'traj:' + b.ac[5][1] };
}

// H) Tweet card, authority "reminder" one-liners
function gen_tweet(r) {
  const bank = [
    { tweet: `Reminder: your growth isn’t slow.<br>It’s mis-diagnosed.`, size: 66,
      cap: `Your growth isn't slow, it's mis-diagnosed.\n\nMost teams pour real effort into a lever that was never the bottleneck. The work is hard; the target is wrong. Growth Terminal finds the constraint actually capping you before you spend another quarter on the wrong one.`,
      fc: `What are you working on right now, and how sure are you it's the real constraint?` },
    { tweet: `The most expensive number in growth is the one you can’t see.`, size: 58,
      cap: `A hidden constraint never sends an invoice. It just quietly caps every month. Growth Terminal makes that number visible and puts a dollar range on it, so you can act on it instead of absorbing it.`,
      fc: `The scariest line item is the one that never shows up on the P&L.` },
    { tweet: `Reminder: diagnosis before treatment. Always.`, size: 66,
      cap: `Most growth mistakes aren't strategy failures, they're diagnosis failures. Executing hard against the wrong constraint burns a whole quarter before anyone can prove it was the wrong call. Get the diagnosis right first.`,
      fc: `Would you take the medicine before the diagnosis? Same in growth.` },
    { tweet: `You don’t need more dashboards.<br>You need one verdict.`, size: 66,
      cap: `Most teams are drowning in dashboards and starving for a decision. Growth Terminal reads the data you already have and makes the call: your #1 constraint, what it's worth, and the plan. A verdict beats another chart.`,
      fc: `How many dashboards do you check that never change a decision?` },
    { tweet: `Reminder: stop optimizing the lever that was never stuck.`, size: 60,
      cap: `Perfect execution on the wrong lever still loses. Before you optimize, make sure it's the thing actually capping growth. We rank the twelve places growth gets stuck and hand you the one that matters most right now.`,
      fc: `Which lever are you optimizing, and is it even the bottleneck?` },
    { tweet: `You can’t fix the constraint you can’t see.`, size: 64,
      cap: `You can't fix the constraint you can't see. Most growth stays stuck because the real bottleneck is invisible on a dashboard. Growth Terminal names it, prices it, and verifies the call against your real revenue.`,
      fc: `What if the thing capping you isn't the thing you're looking at?` },
  ];
  const b = pick(bank, r);
  return { layout: 'tweet', tweet: b.tweet, size: b.size, hook: stripHtml(b.tweet),
    caption: b.cap, first_comment: b.fc, sig: 'tweet:' + stripHtml(b.tweet).slice(0, 36) };
}

// Editorial hero, the "big-tech ad" format. A confident single line + a quiet subhead,
// logo top-left, lots of air. The headline stays plain (no <br> gymnastics) so it reads
// like a campaign, not an infographic.
function gen_editorial(r) {
  const bank = [
    { hook: `See where your growth is <span class="accent">actually</span> stuck.`,
      sub: `One constraint, named and priced, from the report you already run.`, size: 96,
      caps: `Growth diagnosis · Google Sheets`,
      cap: `See where your growth is actually stuck.\n\nNot ten things to fix. The one constraint capping your revenue right now, with a dollar range on it. Growth Terminal reads the report you already run and makes the call.`,
      fc: `If you had to name your #1 constraint in one word, what would it be? 👇` },
    { hook: `Know what's working <span class="accent">before</span> you scale it.`,
      sub: `Every call gets tracked against real revenue, verified or missed.`, size: 92,
      caps: `Verified against real revenue`,
      cap: `Know what's working before you pour budget into it.\n\nMost growth calls are never checked. Growth Terminal logs every forecast, grades it against your actual revenue, and shows you when it was wrong, so you scale the plays that keep landing.`,
      fc: `How many of last quarter's "wins" did you actually verify?` },
    { hook: `Track where growth is driving <span class="accent">real</span> results.`,
      sub: `The twelve places growth gets stuck, ranked for your business.`, size: 92,
      caps: `12 constraints · ranked for you`,
      cap: `Track where growth is actually driving results, and where it isn't.\n\nGrowth Terminal ranks the twelve places growth gets stuck, names the one that's yours this quarter, and prices what fixing it is worth. A verdict, not another dashboard.`,
      fc: `Which of the 12 do you think is biting hardest right now?` },
    { hook: `Your #1 constraint, <span class="accent">priced</span>, in about a minute.`,
      sub: `No new platform. It reads the spreadsheet you already have open.`, size: 90,
      caps: `~60 seconds · no migration`,
      cap: `Your #1 constraint, named and priced, in about a minute.\n\nPoint the add-on at the report you already export. It ranks where growth is stuck, tells you which one is yours, and attaches a dollar range. Your data never leaves the sheet.`,
      fc: `It runs where your data already lives. Nothing to migrate.` },
    { hook: `Stop optimizing the lever that was <span class="accent">never</span> stuck.`,
      sub: `Perfect execution on the wrong constraint still loses the quarter.`, size: 88,
      caps: `Diagnosis before treatment`,
      cap: `Stop optimizing the lever that was never the bottleneck.\n\nEffort on the wrong constraint still feels like work, and still loses. Growth Terminal finds the one that's actually capping you before you spend another quarter aimed at the wrong target.`,
      fc: `What lever are you pulling right now, and are you sure it's the stuck one?` },
  ];
  const b = pick(bank, r);
  return { layout: 'editorial', hook: b.hook, sub: b.sub, size: b.size, caps: b.caps,
    caption: b.cap, first_comment: b.fc, sig: 'edit:' + stripHtml(b.hook).slice(0, 40) };
}

// Weighted mix of generators. Statement/constraint are the workhorses; the rest add variety.
const GENERATORS = [
  gen_statement, gen_statement, gen_constraint, gen_constraint,
  gen_stat, gen_contrast, gen_vs, gen_carousel,
  gen_card, gen_card, gen_quote, gen_annotated,
  gen_funnel, gen_ranked, gen_trajectory,
  gen_tweet, gen_tweet, gen_editorial, gen_editorial,
];

// ---------- pick a fresh post (avoid recent repeats) ----------
const USED_LOG = path.join(__dirname, 'used_log.json');
const RECENT_WINDOW = 24; // don't repeat a signature within the last N posts

function loadUsed() { try { return JSON.parse(fs.readFileSync(USED_LOG, 'utf8')); } catch { return []; } }
function saveUsed(list) { fs.writeFileSync(USED_LOG, JSON.stringify(list.slice(-200), null, 2)); }

function buildPost(seed, recent) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = pick(GENERATORS, r);
    const post = gen(r);
    if (recent.includes(post.sig) && attempt < 30) continue; // try for something fresh
    post.hashtags = tags(r);
    post.cta = pick(CTA_BIO, r);
    post.append_cta = pick(['\n\n→ growthterminal.io', '\n\nRun the free 60-second diagnostic, link in bio.',
      '\n\nDiagnose your #1 constraint free. Link in bio.'], r);
    return post;
  }
}

// ---------- render one post to a JPEG ----------
async function renderPost(page, post, outBase) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf8"><style>${CSS}</style></head><body>${RENDER[post.layout](post)}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  const clip = { x: 0, y: 0, width: 1080, height: 1350 };
  await page.screenshot({ path: outBase + '.jpg', type: 'jpeg', quality: 92, clip }); // IG requires JPEG
  await page.screenshot({ path: outBase + '.png', clip }); // for local QA
}

function stamp(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ==================== REELS (animated 1080x1920 MP4) ====================
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 2);
const easeIO  = x => { x = clamp01(x); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
function rlogo(h) { return logo(ORANGE, WHITE).replace('<svg', `<svg style="height:${h}px;width:auto;display:block"`); }
const RGRAIN = `<div style="position:absolute;inset:0;opacity:.04;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.5) 1px,transparent 1px);background-size:4px 4px"></div>`;
function rstage(inner, glowT) {
  const g = 150 + Math.sin(glowT * Math.PI * 2) * 30;
  return `<div style="width:1080px;height:1920px;background:${INK};color:${WHITE};position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:150px 96px;display:flex;flex-direction:column">
    <div style="position:absolute;width:760px;height:760px;border-radius:50%;filter:blur(${g}px);opacity:.5;background:${ORANGE};top:-160px;right:-200px"></div>${RGRAIN}${inner}</div>`;
}
function rfoot(op) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;opacity:${op};transform:translateY(${(1 - op) * 16}px)">
    <div>${rlogo(58)}</div>
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:30px;font-weight:700;color:${ORANGE};display:flex;align-items:center;gap:14px"><span style="width:14px;height:14px;border-radius:50%;background:${ORANGE}"></span>growthterminal.io</div></div>`;
}
function cardFrame(t, p) {
  const appear = easeOut((t - 0.03) / 0.25), wordIn = easeOut((t - 0.12) / 0.28);
  const meter = easeIO((t - 0.22) / 0.5) * p.pct, conf = Math.round(easeIO((t - 0.30) / 0.5) * p.confidence);
  const verIn = easeOut((t - 0.72) / 0.12), ctaIn = easeOut((t - 0.80) / 0.18);
  const inner = `<div style="font-family:ui-monospace,Menlo,monospace;font-size:30px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:${ORANGE};opacity:${appear};transform:translateY(${(1 - appear) * 20}px)">◆ Live diagnosis</div>
    <div style="font-size:66px;font-weight:800;letter-spacing:-.02em;line-height:1.04;margin-top:26px;opacity:${appear};transform:translateY(${(1 - appear) * 24}px)">${p.headline}</div>
    <div style="flex:1;display:flex;align-items:center">
      <div style="width:100%;background:#211b15;border:1px solid rgba(255,255,255,.1);border-radius:34px;padding:60px 56px;opacity:${appear};transform:translateY(${(1 - appear) * 30}px)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:36px">
          <span style="font-family:ui-monospace,Menlo,monospace;font-size:26px;letter-spacing:.14em;color:#9a8f82;text-transform:uppercase">#1 constraint detected</span>
          <span style="font-family:ui-monospace,Menlo,monospace;font-size:24px;color:${GOOD};display:flex;align-items:center;gap:10px;opacity:${verIn};transform:scale(${0.8 + verIn * 0.2})"><span style="width:12px;height:12px;border-radius:50%;background:${GOOD};display:inline-block"></span>VERIFIED</span></div>
        <div style="height:${wordIn * 120}px;overflow:hidden"><div style="font-size:120px;font-weight:800;letter-spacing:-.02em;color:${ORANGE};line-height:1;transform:translateY(${(1 - wordIn) * 40}px);opacity:${wordIn}">${p.constraint}</div></div>
        <div style="height:20px;border-radius:12px;background:#000;overflow:hidden;margin:40px 0 20px"><div style="width:${meter}%;height:100%;background:${ORANGE}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:34px"><span style="color:#9a8f82">Impact</span><span style="font-weight:800">${p.impact}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:34px;margin-top:16px"><span style="color:#9a8f82">Confidence</span><span style="font-weight:800;color:${GOOD}">${conf}%</span></div>
      </div></div>${rfoot(ctaIn)}`;
  return rstage(inner, t);
}
function countupFrame(t, p) {
  const appear = easeOut((t - 0.03) / 0.22), prog = easeIO((t - 0.15) / 0.55);
  const val = Math.round(prog * p.big), labelIn = easeOut((t - 0.45) / 0.3), ctaIn = easeOut((t - 0.80) / 0.18);
  const inner = `<div style="font-family:ui-monospace,Menlo,monospace;font-size:30px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:${ORANGE};opacity:${appear}">◆ ${p.eyebrow}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:340px;font-weight:700;color:${ORANGE};line-height:.9;letter-spacing:-.04em;opacity:${appear}">${p.prefix}${val}${p.suffix}</div>
      <div style="font-size:52px;font-weight:800;max-width:880px;line-height:1.15;margin-top:24px;opacity:${labelIn};transform:translateY(${(1 - labelIn) * 20}px)">${p.label}</div>
    </div>${rfoot(ctaIn)}`;
  return rstage(inner, t);
}
const REEL_FRAME = { card: cardFrame, countup: countupFrame };

function reel_card(r) {
  const bank = [
    { c: 'Retention', impact: '$88K–$140K / yr', conf: 92, pct: 78, head: 'We name your #1<br>growth constraint.' },
    { c: 'Activation', impact: '$60K–$110K / yr', conf: 88, pct: 71, head: 'Your growth has<br>one real bottleneck.' },
    { c: 'Pricing', impact: '$120K–$300K / yr', conf: 84, pct: 64, head: 'The costly constraint<br>is the hidden one.' },
  ];
  const b = pick(bank, r);
  return { rlayout: 'card', constraint: b.c, impact: b.impact, confidence: b.conf, pct: b.pct, headline: b.head,
    hook: `#1 constraint: ${b.c}`,
    caption: `This is what a Growth Terminal diagnosis looks like, one constraint, named, priced, and verified against real revenue. Here, ${b.c.toLowerCase()} was capping the business by ${b.impact.replace(' / yr', ' a year')}.\n\nYours is one run away.`,
    first_comment: `What would you do differently if your #1 constraint came pre-priced?`,
    sig: 'reelcard:' + b.c };
}
function reel_countup(r) {
  const bank = [
    { big: 12, prefix: '', suffix: '', eyebrow: 'Save this', label: 'the number of places growth actually gets stuck. We rank all twelve and name yours.',
      caption: `Growth only gets stuck in twelve places. The hard part is knowing which one is YOUR #1 right now, with a dollar range attached. That's the whole job Growth Terminal does.`,
      fc: `Which of the 12 is biting hardest this quarter?`, sig: 'reelnum:12' },
    { big: 60, prefix: '', suffix: ' sec', eyebrow: 'Install to insight', label: 'from spreadsheet to diagnosis. No onboarding, no migration.',
      caption: `60 seconds from spreadsheet to diagnosis. Add the add-on to Google Sheets, point it at the report you already have, and get your #1 constraint ranked and priced before your coffee's cold.`,
      fc: `Genuinely ~60 seconds. It reads the sheet you already have open.`, sig: 'reelnum:60' },
    { big: 140, prefix: '$', suffix: 'K', eyebrow: 'What it’s worth', label: '/yr, the value of one constraint you couldn’t see, finally priced.',
      caption: `Every diagnosis ends with a dollar range, not a vibe. A real number on a real constraint, so you decide with a figure instead of a hunch.`,
      fc: `What would change if every problem came pre-priced?`, sig: 'reelnum:140' },
  ];
  const b = pick(bank, r);
  return { rlayout: 'countup', big: b.big, prefix: b.prefix, suffix: b.suffix, eyebrow: b.eyebrow, label: b.label,
    hook: `${b.prefix}${b.big}${b.suffix}`, caption: b.caption, first_comment: b.fc, sig: b.sig };
}
const REEL_GENERATORS = [reel_card, reel_card, reel_countup];

function buildReel(seed, recent) {
  const r = rng((seed ^ 0x5bd1e995) >>> 0);
  for (let a = 0; a < 40; a++) {
    const post = pick(REEL_GENERATORS, r)(r);
    if (recent.includes(post.sig) && a < 30) continue;
    post.hashtags = tags(r);
    post.append_cta = pick(['\n\n→ growthterminal.io', '\n\nRun the free 60-second diagnostic, link in bio.',
      '\n\nDiagnose your #1 constraint free. Link in bio.'], r);
    return post;
  }
}
async function renderReel(page, post, base) {
  await page.setViewportSize({ width: 1080, height: 1920 });
  const framesDir = path.join(__dirname, 'reel_frames');
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir);
  const FPS = 24, SECS = 5, N = FPS * SECS, fn = REEL_FRAME[post.rlayout];
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf8"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body>${fn(t, post)}</body></html>`, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(3, '0')}.png`), clip });
  }
  await page.screenshot({ path: base + '.jpg', type: 'jpeg', quality: 92, clip }); // last frame = cover
  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%03d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.mp4', '-loglevel', 'error']);
  fs.rmSync(framesDir, { recursive: true, force: true });
}
function ffmpegAvailable() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}
function pruneCreatives(prefix, exts, keep) {
  try {
    const dir = path.join(__dirname, 'creatives'), primaryExt = exts[0];
    const primaries = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith(primaryExt)).sort();
    if (primaries.length > keep) {
      for (const f of primaries.slice(0, primaries.length - keep)) {
        const stem = f.slice(0, -primaryExt.length);
        for (const e of exts) { try { fs.unlinkSync(path.join(dir, stem + e)); } catch {} }
      }
    }
  } catch {}
}

// ---------- main ----------
(async () => {
  const args = process.argv.slice(2);
  const previewIdx = args.indexOf('--preview');
  const previewN = previewIdx >= 0 ? parseInt(args[previewIdx + 1] || '6', 10) : 0;

  if (!fs.existsSync(path.join(__dirname, 'creatives'))) fs.mkdirSync(path.join(__dirname, 'creatives'));
  // Local sandbox has chromium at a fixed path; on GitHub Actions let Playwright use its own install.
  const launchOpts = {};
  if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) launchOpts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(launchOpts);
  const page = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

  if (previewN > 0) {
    // QA mode: render N varied samples, no state changes
    const recent = [];
    for (let i = 0; i < previewN; i++) {
      const post = buildPost((Date.now() >>> 0) + i * 7919, recent);
      recent.push(post.sig);
      const base = path.join(__dirname, 'creatives', `preview_${String(i + 1).padStart(2, '0')}_${post.layout}`);
      await renderPost(page, post, base);
      console.log(`preview ${i + 1}: [${post.layout}] ${stripHtml(post.hook || post.big || post.stat || post.label).slice(0, 60)}`);
    }
    await b.close();
    return;
  }

  // LIVE mode: build one fresh post (sometimes a Reel), render, record, write meta.json
  const recent = loadUsed();
  const now = new Date();
  const stampStr = stamp(now);
  const REEL_RATE = parseFloat(process.env.GT_REEL_RATE || '0.4'); // ~40% of runs are Reels
  // Only attempt a Reel if ffmpeg is available, otherwise fall back to a static post (never crash the run).
  const hasFfmpeg = ffmpegAvailable();
  if (!hasFfmpeg) console.log('note: ffmpeg not found, posting a static image this run');
  const wantReel = hasFfmpeg && rng(((now.getTime() >>> 0) ^ 0xA5A5A5A5) >>> 0)() < REEL_RATE;
  let meta;

  if (wantReel) {
    const post = buildReel((now.getTime() >>> 0), recent);
    const rbase = path.join(__dirname, 'creatives', `gt_reel_${stampStr}`);
    await renderReel(page, post, rbase);
    await b.close();
    pruneCreatives('gt_reel_', ['.mp4', '.jpg'], 30);
    const caption = (post.caption || '').trim() + (post.append_cta || '');
    meta = {
      generated_at: now.toISOString(),
      media_file: `creatives/gt_reel_${stampStr}.jpg`, // still cover (Facebook image + IG Reel cover + dashboard)
      video_file: `creatives/gt_reel_${stampStr}.mp4`, // the Reel itself (Instagram)
      is_reel: true,
      layout: 'reel:' + post.rlayout,
      caption, hashtags: post.hashtags, first_comment: post.first_comment || '',
      alt_text: stripHtml(post.hook || ''), sig: post.sig,
    };
    recent.push(post.sig);
    console.log(`generated REEL [${post.rlayout}] -> ${meta.video_file}`);
  } else {
    const post = buildPost((now.getTime() >>> 0), recent);
    const fname = `gt_auto_${stampStr}.jpg`;
    const base = path.join(__dirname, 'creatives', fname.replace('.jpg', ''));
    await renderPost(page, post, base);
    await b.close();
    pruneCreatives('gt_auto_', ['.jpg', '.png'], 60);
    const caption = (post.caption || '').trim() + (post.append_cta || '');
    meta = {
      generated_at: now.toISOString(),
      media_file: 'creatives/' + fname,
      is_reel: false,
      layout: post.layout,
      caption, hashtags: post.hashtags, first_comment: post.first_comment || '',
      alt_text: stripHtml(post.hook || post.big || post.stat || post.label), sig: post.sig,
    };
    recent.push(post.sig);
    console.log(`generated [${post.layout}] -> ${meta.media_file}`);
  }
  fs.writeFileSync(path.join(__dirname, 'meta.json'), JSON.stringify(meta, null, 2));
  saveUsed(recent);
  console.log(`caption: ${(meta.caption || '').slice(0, 90).replace(/\n/g, ' ')}…`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
