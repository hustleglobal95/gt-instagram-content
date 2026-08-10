/**
 * carousel_generate.js, builds ONE Instagram carousel per run.
 * -----------------------------------------------------------------------------
 * The single image bank compresses a verdict into one frame. Growth Terminal's
 * output is natively sequential (twelve ranked constraints, a six phase plan,
 * evidence for then evidence against), which is exactly what a carousel is for.
 * This renders a cover plus four slides that read in order.
 *
 * Output:
 *   creatives/gt_car_<stamp>_1.jpg ... _5.jpg
 *   carousel_meta.json   consumed by carousel_post.py
 *
 * Brand guard: every panel must carry the logo. The run aborts if one does not,
 * because the standing rule is that nothing unbranded gets posted, and a rule
 * that is not checked is not a rule.
 *
 * Usage:
 *   node carousel_generate.js                     build one, write carousel_meta.json
 *   node carousel_generate.js --preview           build one, skip the meta file
 *   node carousel_generate.js --format twelve     pin a specific carousel (QA only)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const P = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo_parts.json'), 'utf8'));
const ORANGE = '#FC5802', INK = '#17130F', WHITE = '#FDFCFC';
const W = 1080, H = 1350;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pick = (a, r) => a[Math.floor(r() * a.length)];
const stripHtml = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const LOGO_MARK = 'gt-logo-mark';
function logo(o, w) {
  return `<svg class="${LOGO_MARK}" viewBox="${P.full}" xmlns="http://www.w3.org/2000/svg">`
    + `<g fill="${o}" ${P.tf}>${P.orange}</g><g fill="${w}" ${P.tf}>${P.white}</g></svg>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.stage{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${INK};color:${WHITE};
  padding:80px 74px;display:flex;flex-direction:column}
.grain{position:absolute;inset:0;opacity:.05;pointer-events:none;
  background-image:radial-gradient(rgba(255,255,255,.6) 1px,transparent 1px);background-size:4px 4px}
.glow{position:absolute;border-radius:50%;filter:blur(130px);opacity:.26}
.lg{height:46px}.lg svg{height:46px;width:auto;display:block}
.eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;color:${ORANGE}}
.pageno{font-family:ui-monospace,Menlo,monospace;font-size:21px;font-weight:700;color:rgba(253,252,252,.42)}
.head{font-weight:800;letter-spacing:-.025em;line-height:1.04}
.body{font-size:32px;font-weight:500;line-height:1.36;color:rgba(253,252,252,.86)}
.swipe{display:flex;align-items:center;gap:12px;font-size:25px;font-weight:700;color:${ORANGE}}
`;

/* ---------------------------------------------------------------- panels */
function shell(inner, n, total, showSwipe) {
  return `<div class="stage">
    <div class="glow" style="width:680px;height:680px;background:${ORANGE};top:-260px;right:-200px"></div>
    <div class="grain"></div>
    <div style="position:relative;display:flex;align-items:center;justify-content:space-between">
      <div class="lg">${logo(ORANGE, WHITE)}</div>
      <div class="pageno">${n} / ${total}</div>
    </div>
    ${inner}
    <div style="position:relative;margin-top:auto;display:flex;align-items:center;justify-content:space-between">
      ${showSwipe ? `<div class="swipe">Swipe <span>&#8594;</span></div>` : `<div class="swipe">growthterminal.io</div>`}
    </div>
  </div>`;
}

const cover = (c, total) => shell(`
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="eyebrow">${c.eyebrow}</div>
    <div class="head" style="font-size:${c.size || 92}px;margin-top:22px">${c.title}</div>
    <div class="body" style="margin-top:26px;max-width:840px">${c.sub}</div>
  </div>`, 1, total, true);

const slide = (s, n, total) => shell(`
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:26px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${ORANGE}">${s.kicker}</div>
    <div class="head" style="font-size:${s.size || 68}px;margin-top:18px">${s.title}</div>
    <div class="body" style="margin-top:24px;max-width:850px">${s.body}</div>
    ${s.rows ? `<div style="margin-top:34px">${s.rows.map(row => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0;
        border-top:1px solid rgba(255,255,255,.09)">
        <span style="font-size:30px;font-weight:800;color:${ORANGE};flex:none;min-width:230px">${row[0]}</span>
        <span style="font-size:27px;font-weight:500;color:rgba(253,252,252,.72);text-align:right">${row[1]}</span>
      </div>`).join('')}</div>` : ''}
  </div>`, n, total, n < total);

const closer = (c, total) => shell(`
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;text-align:left">
    <div class="head" style="font-size:74px">${c.title}</div>
    <div class="body" style="margin-top:26px;max-width:830px">${c.sub}</div>
    <div style="margin-top:40px;display:inline-flex;align-self:flex-start;align-items:center;gap:16px;
      background:${ORANGE};color:${WHITE};padding:24px 38px;border-radius:14px;font-weight:800;font-size:32px">
      ${c.cta}</div>
  </div>`, total, total, false);

/* ------------------------------------------------------------- carousels */
const CAROUSELS = [
  (r) => {
    const total = 5;
    return {
      name: 'twelve',
      panels: [
        cover({ eyebrow: 'Constraint model', title: 'Growth gets stuck in twelve places.', size: 84,
          sub: 'Only one of them is yours this quarter. Working on the other eleven is why effort stops turning into revenue.' }, total),
        slide({ kicker: 'Where it starts', title: 'The demand side', size: 62,
          body: 'Four of the twelve sit before anyone becomes a customer.',
          rows: [['Acquisition', 'not enough of the right people find you'], ['Traffic', 'the top of the funnel is thinner than the model needs'],
                 ['Conversion', 'interest is high, the yes never lands'], ['Offer', 'close to worth the price, not quite there']] }, 2, total),
        slide({ kicker: 'Where it leaks', title: 'The keep side', size: 62,
          body: 'Four more decide whether the revenue you win actually stays.',
          rows: [['Activation', 'they sign up, never reach the first win'], ['Retention', 'value once, then a quiet drift away'],
                 ['Churn', 'refilling a leaking bucket every month'], ['Fulfilment', 'the promise is great, delivery lags it']] }, 3, total),
        slide({ kicker: 'Where it binds', title: 'The capacity side', size: 62,
          body: 'The last four are the ones owners rarely suspect.',
          rows: [['Capacity', 'demand exists, you cannot serve it'], ['Utilisation', 'you own the capacity, it sits half used'],
                 ['Pricing', 'margin left on the table every deal'], ['Cash collection', 'booked revenue, late cash']] }, 4, total),
        closer({ title: 'Which one is yours?', cta: 'Run the free diagnostic',
          sub: 'Growth Terminal reads the spreadsheet you already have open, names the one constraint capping revenue, prices the fix, and grades the call against what actually happens.' }, total)
      ],
      caption: 'Growth gets stuck in twelve places. Only one of them is yours this quarter.\n\n'
        + 'Demand side: acquisition, traffic, conversion, offer.\nKeep side: activation, retention, churn, fulfilment.\n'
        + 'Capacity side: capacity, utilisation, pricing, cash collection.\n\n'
        + 'Working the wrong one is why effort stops turning into revenue. Growth Terminal names which is yours, prices it, and grades the call.',
      first_comment: 'Which of the twelve would you guess is yours right now?',
      sig: 'car:twelve'
    };
  },

  (r) => {
    const total = 5;
    return {
      name: 'verdict',
      panels: [
        cover({ eyebrow: 'How a verdict is built', title: 'Most tools show you what agrees with them.', size: 78,
          sub: 'A diagnosis you can trust has to show you the other side too. Here is what comes back from a run.' }, total),
        slide({ kicker: 'Step one', title: 'The constraint gets named', size: 64,
          body: 'Not a dashboard of forty metrics. One constraint, one category, a severity score out of ten, and the confidence behind it.' }, 2, total),
        slide({ kicker: 'Step two', title: 'The evidence for it', size: 64,
          body: 'Every signal that supports the call, listed plainly, so the reasoning can be argued with rather than taken on faith.' }, 3, total),
        slide({ kicker: 'Step three', title: 'The evidence against it', size: 64,
          body: 'The contradicting signals ship in the same report, along with what would prove the diagnosis wrong. If a tool never tells you why it might be mistaken, it is selling confidence, not analysis.' }, 4, total),
        closer({ title: 'Then the plan, and the grade.', cta: 'See what comes back',
          sub: 'A phased 90 day plan with decision gates, then the forecast is graded against real revenue afterward, so the calls that keep landing earn their trust.' }, total)
      ],
      caption: 'Most tools show you what agrees with them.\n\n'
        + 'Growth Terminal names the constraint, lists the evidence for the call, then publishes the evidence against it and what would prove the diagnosis wrong.\n\n'
        + 'Then a 90 day plan with decision gates, and a grade against real revenue once the quarter plays out.',
      first_comment: 'When did a tool last tell you why it might be wrong?',
      sig: 'car:verdict'
    };
  },

  (r) => {
    const total = 5;
    return {
      name: 'plan',
      panels: [
        cover({ eyebrow: 'The 90 day plan', title: 'A diagnosis without sequencing is just an opinion.', size: 76,
          sub: 'Knowing the constraint is half of it. Knowing the order, and when to stop, is the rest.' }, total),
        slide({ kicker: 'Phases', title: 'Six phases, in order', size: 66,
          body: 'Each one carries an objective, the hypothesis behind it, the steps, who owns it, what done looks like, and what to watch out for. Not a task list, a sequence.' }, 2, total),
        slide({ kicker: 'Gates', title: 'Three decision gates', size: 66,
          body: 'At each gate: a condition, what happens if it passes, and what happens if it misses. A plan that cannot tell you when to stop is a plan that wastes a quarter.' }, 3, total),
        slide({ kicker: 'Indicators', title: 'Five leading indicators', size: 66,
          body: 'The numbers that move before revenue does, so you know within weeks whether the call was right, instead of finding out at the end of the quarter.' }, 4, total),
        closer({ title: 'Built from your numbers.', cta: 'Run yours free',
          sub: 'Not a template. The plan is assembled from the constraint the engine found in your data, and it changes when the constraint does.' }, total)
      ],
      caption: 'A diagnosis without sequencing is just an opinion.\n\n'
        + 'Every Growth Terminal run ends in a 90 day plan: six phases in order, three decision gates that tell you when to continue or change course, and five leading indicators that move before revenue does.\n\n'
        + 'Built from your numbers, not a template.',
      first_comment: 'Does your current plan have a gate that lets you stop early?',
      sig: 'car:plan'
    };
  }
];

/* Hashtags. Same shape as generate.js, kept local on purpose: requiring
   generate.js would execute a 400KB module that four workflows depend on. */
const CORE_TAGS = ['#growthterminal'];
const TAG_POOL = ['#b2bsaas', '#saasgrowth', '#saasfounder', '#agencyowner', '#agencylife',
  '#consultingbusiness', '#fractionalcmo', '#revenueoperations', '#b2bmarketing',
  '#marketingops', '#foundertips', '#bootstrappedfounder', '#startupmetrics', '#uniteconomics',
  '#googlesheetstips'];
function tags(r) {
  const pool = TAG_POOL.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return CORE_TAGS.concat(pool.slice(0, 3)).join(' ');
}

/* ------------------------------------------------------------------ main */
(async () => {
  const argv = process.argv.slice(2);
  const preview = argv.includes('--preview');
  const pinIdx = argv.indexOf('--format');
  const pin = pinIdx >= 0 ? argv[pinIdx + 1] : null;
  const r = rng(Date.now() >>> 0);

  let car;
  if (pin) {
    const built = CAROUSELS.map(f => f(r));
    car = built.find(c => c.name === pin);
    if (!car) {
      console.error('no carousel named "' + pin + '". available: ' + built.map(c => c.name).join(', '));
      process.exit(1);
    }
  } else {
    car = pick(CAROUSELS, r)(r);
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..*$/, '');
  const dir = path.join(__dirname, 'creatives');
  fs.mkdirSync(dir, { recursive: true });

  /* Brand guard, checked before a single pixel is written. */
  const unbranded = car.panels.filter(html => !html.includes(LOGO_MARK));
  if (unbranded.length) {
    console.error('ABORT: ' + unbranded.length + ' of ' + car.panels.length
      + ' panels have no logo. Nothing unbranded gets posted.');
    process.exit(1);
  }

  // Honour an explicit chromium path when one is provided (some sandboxes ship
  // a shared browser). CI installs its own, so this stays undefined there.
  const exe = process.env.GT_CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const files = [];
  for (let i = 0; i < car.panels.length; i++) {
    await page.setContent(`<style>${CSS}</style>${car.panels[i]}`, { waitUntil: 'load' });
    const file = `creatives/gt_car_${stamp}_${i + 1}.jpg`;
    await page.screenshot({ path: path.join(__dirname, file), type: 'jpeg', quality: 92,
      clip: { x: 0, y: 0, width: W, height: H } });
    files.push(file);
  }
  await browser.close();

  console.log('carousel [' + car.name + '] ' + files.length + ' panels, all branded');
  files.forEach(f => console.log('  ' + f));

  if (!preview) {
    const meta = {
      generated_at: new Date().toISOString(),
      kind: 'carousel',
      layout: 'carousel:' + car.name,
      media_files: files,
      caption: car.caption,
      hashtags: tags(r),
      first_comment: car.first_comment,
      alt_text: stripHtml(car.caption).slice(0, 120),
      sig: car.sig
    };
    fs.writeFileSync(path.join(__dirname, 'carousel_meta.json'), JSON.stringify(meta, null, 2));
    console.log('wrote carousel_meta.json');
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
