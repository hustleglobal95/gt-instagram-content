// Growth Terminal — auto-generating content engine
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
const fs = require('fs');
const path = require('path');

const P = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo_parts.json'), 'utf8'));
const ORANGE = '#FC5802', INK = '#17130F', CREAM = '#F5F0E7', WHITE = '#FDFCFC', PAPERINK = '#1A1613';

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
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between}
.foot .lg{height:52px}
.foot .lg svg{height:52px;width:auto;display:block}
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
const RENDER = { statement: L_statement, contrast: L_contrast, stat: L_stat, vs: L_vs, carousel: L_carousel };

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

// Rotating hashtag pool — each post pulls a fresh subset so blocks vary (IG best practice).
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
const CTA_BIO = ['Free 60-second diagnostic — link in bio.', 'Run the free diagnostic. Link in bio.',
  'Diagnose your #1 constraint free. Link in bio.', 'Try it free in Google Sheets. Link in bio.',
  '→ growthterminal.io'];

// ---------- generators (each returns a fully-formed post object) ----------
// A "sig" is a stable signature used for de-duplication across runs.

function gen_statement(r) {
  const bank = [
    { hook: `You don't get a<br>dashboard.<br>You get a ${accent('verdict')}.`,
      sub: `Every analysis ends in a graded prediction — the #1 constraint, its dollar range, and a 90-day plan.`, size: 116,
      cap: `You don't get a dashboard. You get a verdict.\n\nDashboards show you 40 numbers and let you pick the story. Growth Terminal names the ONE constraint holding your growth back, tells you the dollar range it's worth, then verifies the call against real revenue.\n\nClarity first. No 40-tab spreadsheet.`,
      fc: `What's the one constraint you *think* is holding your growth back right now? 👇` },
    { hook: `We tell you the ${accent('one')} thing holding your growth back — and what it's worth.`,
      sub: `In Google Sheets. In about 60 seconds.`, size: 100,
      cap: `Most "growth advice" gives you ten things to fix. That's the problem.\n\nGrowth Terminal names the single biggest constraint on your revenue right now — and quantifies what fixing it is worth. One move, ranked above everything else, with a number attached.`,
      fc: `Diagnosis before treatment — always. Where are you stuck?` },
    { hook: `Verified.<br>Not ${accent('vibes')}.`,
      sub: `We track every forecast against real revenue — and show you when we were wrong.`, size: 122,
      cap: `Verified. Not vibes.\n\nEveryone in growth makes confident calls. Almost no one checks them. Growth Terminal logs every forecast, tracks it against your actual revenue, and grades itself — verified or missed — so you trust the calls that keep landing and catch the ones that don't.`,
      fc: `When we're wrong, the tool says so. That's the point.` },
    { hook: `Your growth isn't ${accent('slow')}.<br>It's mis-diagnosed.`,
      sub: `You're pulling a real lever. It just isn't the one that's stuck.`, size: 108,
      cap: `Your growth isn't slow. It's mis-diagnosed.\n\nMost teams are executing hard on a lever that was never the bottleneck. The effort is real; the target is wrong. Growth Terminal finds the constraint that's actually capping you — before you spend another quarter on the wrong one.`,
      fc: `Effort on the wrong lever still feels like work. That's the trap.` },
    { hook: `Ten problems.<br>${accent('One')} that matters<br>this quarter.`,
      sub: `We rank them so you stop spreading yourself across all ten.`, size: 112,
      cap: `You can always find ten things to fix. You can only afford to fix one well this quarter.\n\nGrowth Terminal ranks all twelve places growth gets stuck and tells you which one is yours right now — so your team points at a single target instead of ten.`,
      fc: `If everything is a priority, nothing is. Which one is yours?` },
    { hook: `The most expensive number in growth is the one you ${accent("can't see")}.`,
      sub: `A hidden constraint doesn't send an invoice. It just quietly caps you.`, size: 92, bg: 'cream',
      cap: `The most expensive number in growth is the one you can't see.\n\nA hidden constraint never sends an invoice — it just quietly caps every month. Growth Terminal makes that number visible and puts a dollar range on it, so you can act on it instead of absorbing it.`,
      fc: `The scariest line item is the one that never shows up on the P&L.` },
    { hook: `Point it at the sheet you ${accent('already have')} open.`,
      sub: `No new platform. No export. The add-on reads the report you already run.`, size: 104,
      cap: `No new platform. No migration. No export.\n\nGrowth Terminal is a Google Sheets add-on. Point it at the report you already export, and it ranks the twelve places growth gets stuck, tells you which one is yours, and prices it. Your data never leaves the sheet.`,
      fc: `It runs where your data already lives. Nothing to migrate.` },
    { hook: `Stop guessing which lever to ${accent('pull')}.`,
      sub: `You already have the data. You're missing the diagnosis.`, size: 112,
      cap: `Stop guessing which lever to pull.\n\nYou already have the data — you're missing the diagnosis. Growth Terminal reads what you already track, ranks where growth is actually stuck, and names the one move worth making first, with the dollar range attached.`,
      fc: `Which lever are you pulling right now — and how sure are you?` },
    { hook: `A second opinion for your ${accent('growth')}.`,
      sub: `The one you'd get from an operator who's seen the pattern a hundred times.`, size: 116,
      cap: `Think of it as a second opinion for your growth.\n\nThe kind you'd get from an operator who has seen this exact pattern a hundred times — which constraint is really biting, what it's worth, and what to do in the next 90 days. Except it runs in your spreadsheet, in a minute.`,
      fc: `Would a second opinion change what you're working on this month?` },
    { hook: `Fix the ${accent('constraint')}.<br>Not the symptom.`,
      sub: `Low conversion is usually a symptom. The constraint sits one step upstream.`, size: 116,
      cap: `Fix the constraint, not the symptom.\n\n"Conversion is low" is a symptom. The real constraint usually sits one step upstream — the offer, the traffic quality, the activation moment. Growth Terminal traces the symptom back to its source so you fix the thing that actually moves the number.`,
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
      cap: `Most growth mistakes aren't strategy failures. They're diagnosis failures.\n\nThe team executes hard — new channels, new pricing, new funnel — against a constraint that was never the real bottleneck. A whole quarter gone before anyone can prove the call was wrong. Get the diagnosis right first. Then move.`,
      fc: `Ever spent a quarter on the wrong lever? Same. That's why this exists.` },
    { lead: `Stop guessing which lever to pull.`, big: `DIAGNOSE IT<br>IN ${accent('60 SECONDS')}.`, size: 116,
      sub: `Add the Growth Terminal add-on to the sheet you already have open.`,
      cap: `Stop guessing which lever to pull.\n\nGrowth Terminal reads the report you already export, ranks the twelve places growth gets stuck, and tells you which one is yours — with the dollar range attached. No new platform. It runs where your data already lives.`,
      fc: `It's a Google Sheets add-on. Your data never leaves the sheet.` },
    { lead: `More dashboards won't save you.`, big: `YOU DON'T NEED<br>MORE ${accent('DATA')}.<br>YOU NEED A CALL.`, size: 108,
      sub: `A verdict you can act on beats another chart you have to interpret.`,
      cap: `You don't need more data. You need a call.\n\nMost teams are drowning in dashboards and starving for a decision. Growth Terminal reads the data you already have and makes the call: here's your #1 constraint, here's what it's worth, here's the plan. A verdict beats another chart.`,
      fc: `How many dashboards do you check that never change a decision?` },
    { lead: `The bottleneck is rarely where it hurts.`, big: `THE PAIN AND THE<br>${accent('CAUSE')} ARE NOT<br>THE SAME PLACE.`, size: 96,
      sub: `Churn shows up at the end. It usually starts at activation.`,
      cap: `The bottleneck is rarely where it hurts.\n\nChurn shows up at the end of the journey — but it usually starts at a weak activation moment weeks earlier. Growth Terminal traces the pain back to its cause so you fix the source, not the symptom.`,
      fc: `Where does it hurt — and are you sure that's where it starts?` },
    { lead: `Effort is not the problem.`, big: `YOU'RE WORKING<br>HARD ON THE<br>${accent('WRONG THING')}.`, size: 110,
      sub: `The most expensive quarter is the one spent executing perfectly against the wrong constraint.`,
      cap: `Effort is not your problem. Aim is.\n\nThe most expensive quarter a team can have is one spent executing perfectly — against the wrong constraint. Growth Terminal makes sure the thing you pour effort into is the thing actually capping your growth.`,
      fc: `Perfect execution on the wrong target still loses. Aim first.` },
    { lead: `Advice is cheap. Being right is not.`, big: `EVERYONE HAS<br>A ${accent('TAKE')}.<br>WE HAVE A SCORE.`, size: 104,
      sub: `Every call we make gets graded against your real revenue.`,
      cap: `Advice is cheap. Being right is not.\n\nEveryone has a take on your growth. Growth Terminal is the only one that grades its own — every forecast tracked against your real revenue, marked verified or missed. Opinions are free; a track record isn't.`,
      fc: `Whose growth advice has ever been scored against reality? Ours is.` },
  ];
  const b = pick(bank, r);
  return { layout: 'contrast', eyebrow: b.eyebrow || pick(EYEBROWS, r), lead: b.lead, big: b.big, size: b.size,
    sub: b.sub, caption: b.cap, first_comment: b.fc, sig: 'con:' + stripHtml(b.big).slice(0, 40) };
}

function gen_stat(r) {
  const bank = [
    { stat: `$88K–$140K`, label: `The constraint you couldn't see — priced, per year.`, size: 190,
      sub: `Every diagnosis ends with a dollar range, not a vibe.`,
      cap: `"$88K–$140K / yr."\n\nThat's a real range from a real diagnosis — the annual value of one unfixed constraint. Growth Terminal doesn't just tell you what's wrong; it tells you what fixing it is worth, so you decide with a number instead of a hunch.`,
      fc: `Every constraint we surface comes with a dollar range. Decisions get easier.` },
    { stat: `60 sec`, label: `From spreadsheet to diagnosis.`, size: 220,
      sub: `Add to Sheets → understand → diagnose → forecast → verify.`,
      cap: `60 seconds from spreadsheet to diagnosis.\n\nNo onboarding call. No data migration. Add the add-on to Google Sheets, point it at the report you already have, and get your #1 growth constraint ranked and priced before your coffee's cold.`,
      fc: `Genuinely ~60 seconds. It reads the sheet you already have open.` },
    { stat: `12`, label: `The number of places growth actually gets stuck.`, size: 260,
      sub: `Acquisition, activation, retention, conversion, pricing… we rank all twelve and name yours.`,
      cap: `Growth only gets stuck in twelve places.\n\nAcquisition · Activation · Retention · Conversion · Traffic · Offer · Capacity · Churn · Fulfilment · Cash collection · Utilisation · Pricing. The hard part isn't the list — it's knowing which one is YOUR #1 right now. That's the whole job.`,
      fc: `Which of the 12 is biting you hardest this quarter?` },
    { stat: `1`, label: `One constraint. Ranked above everything else.`, size: 300,
      sub: `Not a to-do list. A single, prioritised move — with a number on it.`,
      cap: `One.\n\nThat's how many constraints you should be working on right now. Growth Terminal ranks all twelve and hands you the single one that's capping you this quarter — with the dollar range attached — so your team executes against one clear target.`,
      fc: `If you could only fix one thing this quarter, do you know which?` },
    { stat: `$0`, label: `The cost to find out what's really stuck.`, size: 260,
      sub: `The 60-second diagnostic is free. The clarity isn't optional.`,
      cap: `$0 to find out what's actually capping your growth.\n\nThe 60-second diagnostic is free — run it on the data you already have. You'll get your #1 constraint, ranked and priced. The clarity is the point; the price is zero.`,
      fc: `Free to run. What's the harm in a second opinion?` },
    { stat: `90 days`, label: `From diagnosis to a plan you can actually run.`, size: 190,
      sub: `Every verdict ships with a 90-day plan — then we grade it.`,
      cap: `A diagnosis without a plan is just a nice chart.\n\nEvery Growth Terminal verdict ships with a concrete 90-day plan for the constraint it found — then tracks the outcome against your real revenue and grades the call. Diagnosis, plan, and a scorecard.`,
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
        { who: 'Agencies', what: 'execute the work — but never tell you which move is worth the most.' },
        { who: 'Consultants', what: 'advise, then move on. Nobody checks whether the call held.' },
        { who: 'Dashboards', what: 'report the past. Not one view answers "what\'s the one move now?"' }],
      us: `Grades its own call. Names the constraint, prices it, verifies it against real revenue.`,
      cap: `Agencies execute. Consultants advise, then leave. Dashboards report the past.\n\nNone of them close the loop. Growth Terminal names the #1 constraint, prices it, hands you a 90-day plan — then grades its own forecast against your actual revenue. When we're wrong, you'll see that too. That's the difference: it's accountable.`,
      fc: `The verify step is the whole point. We show you when the call was wrong.` },
    { hook: `Built to make a<br>${accent('call')} — not<br>more reports.`,
      them: [
        { who: 'BI tools', what: 'show you everything and decide nothing.' },
        { who: 'Gut feel', what: 'is fast and confident — and unaccountable.' },
        { who: 'Spreadsheets', what: 'hold the data but never rank what matters.' }],
      us: `Reads your data and makes the call: the #1 constraint, priced, with a plan.`,
      cap: `BI tools show everything and decide nothing. Gut feel is fast but unaccountable. Spreadsheets hold the data but never rank what matters.\n\nGrowth Terminal reads what you already track and makes the call — your #1 constraint, priced, with a 90-day plan. A decision, not another dashboard.`,
      fc: `A tool that decides, not just displays. That's the whole idea.` },
  ];
  const b = pick(bank, r);
  return { layout: 'vs', eyebrow: b.eyebrow || '◆ Priced against the mistake', hook: b.hook, them: b.them, us: b.us,
    caption: b.cap, first_comment: b.fc, sig: 'vs:' + stripHtml(b.hook).slice(0, 40) };
}

// Generated per-constraint post ("Is <X> your #1?") — 12 distinct, on-brand posts.
function gen_constraint(r) {
  const [name, symptom] = pick(CONSTRAINTS, r);
  const hook = `Is ${accent(name.toLowerCase())} your<br>#1 constraint?`;
  return { layout: 'statement', bg: 'dark', size: 110, eyebrow: '◆ The one constraint',
    hook, sub: `The tell: ${symptom}.`,
    caption: `Is ${name.toLowerCase()} your #1 constraint right now?\n\nThe tell: ${symptom}. It's one of the twelve places growth gets stuck — but it's only worth fixing first if it's actually your biggest. Growth Terminal ranks all twelve against your data and tells you whether ${name.toLowerCase()} is really the one, or a symptom of something upstream.`,
    first_comment: `Does "${symptom}" sound like your account this quarter? 👇`,
    sig: 'cons:' + name };
}

// Save-this style cover with a big number and a promise.
function gen_carousel(r) {
  const bank = [
    { big: `12`, hook: `The 12 places growth<br>actually gets ${accent('stuck')}.`,
      sub: `Which one is yours? Find out in 60 seconds.`,
      cap: `Growth only gets stuck in twelve places. Save this. 👇\n\nAcquisition · Activation · Retention · Conversion · Traffic · Offer · Capacity · Churn · Fulfilment · Cash collection · Utilisation · Pricing.\n\nThe hard part is knowing which one is YOUR #1 right now — with a dollar range attached. That's the whole job Growth Terminal does.`,
      fc: `Which of the 12 is biting hardest this quarter?` },
    { big: `3`, hook: `3 questions that reveal<br>your real ${accent('bottleneck')}.`,
      sub: `Save this before your next growth meeting.`,
      cap: `Three questions that reveal your real bottleneck. Save this. 👇\n\n1. Where does momentum die — before signup, at first use, or after?\n2. If you doubled traffic tomorrow, what breaks first?\n3. What's the one number that, if it moved 10%, changes everything?\n\nGrowth Terminal answers all three against your data — and prices the fix.`,
      fc: `Answer #2 honestly and you usually find the constraint.` },
  ];
  const b = pick(bank, r);
  return { layout: 'carousel', eyebrow: '◆ Save this', big: b.big, hook: b.hook, sub: b.sub,
    caption: b.cap, first_comment: b.fc, sig: 'car:' + b.big + stripHtml(b.hook).slice(0, 20) };
}

// Weighted mix of generators. Statement/constraint are the workhorses; the rest add variety.
const GENERATORS = [
  gen_statement, gen_statement, gen_constraint, gen_constraint,
  gen_stat, gen_stat, gen_contrast, gen_contrast, gen_vs, gen_carousel,
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
    post.append_cta = pick(['\n\n→ growthterminal.io', '\n\nRun the free 60-second diagnostic — link in bio.',
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

  // LIVE mode: build one fresh post, render it, record it, write meta.json
  const recent = loadUsed();
  const now = new Date();
  const post = buildPost((now.getTime() >>> 0), recent);
  const fname = `gt_auto_${stamp(now)}.jpg`;
  const base = path.join(__dirname, 'creatives', fname.replace('.jpg', ''));
  await renderPost(page, post, base);
  await b.close();

  // prune old auto creatives so the repo stays lean (keep newest ~60)
  try {
    const dir = path.join(__dirname, 'creatives');
    const autos = fs.readdirSync(dir).filter(f => f.startsWith('gt_auto_') && (f.endsWith('.jpg') || f.endsWith('.png'))).sort();
    const jpgs = autos.filter(f => f.endsWith('.jpg'));
    if (jpgs.length > 60) {
      for (const f of jpgs.slice(0, jpgs.length - 60)) {
        try { fs.unlinkSync(path.join(dir, f)); } catch {}
        try { fs.unlinkSync(path.join(dir, f.replace('.jpg', '.png'))); } catch {}
      }
    }
  } catch {}

  const caption = (post.caption || '').trim() + (post.append_cta || '');
  const meta = {
    generated_at: now.toISOString(),
    media_file: 'creatives/' + fname,
    layout: post.layout,
    caption,
    hashtags: post.hashtags,
    first_comment: post.first_comment || '',
    alt_text: stripHtml(post.hook || post.big || post.stat || post.label),
    sig: post.sig,
  };
  fs.writeFileSync(path.join(__dirname, 'meta.json'), JSON.stringify(meta, null, 2));
  recent.push(post.sig);
  saveUsed(recent);
  console.log(`generated [${post.layout}] -> ${meta.media_file}`);
  console.log(`caption: ${caption.slice(0, 90).replace(/\n/g, ' ')}…`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
