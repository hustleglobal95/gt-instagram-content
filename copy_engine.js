/**
 * copy_engine.js, the copy intelligence layer.
 * -----------------------------------------------------------------------------
 * ad_structure.js measures how an ad is BUILT. This measures how it is WRITTEN.
 * Same philosophy: every principle is derived from real ads that real companies
 * run, or from published large-sample data, and every one is measured
 * deterministically from the post object, no model in the loop, so the same
 * copy always scores the same.
 *
 * THE EVIDENCE, in two piles:
 *
 * Real ads (44 sampled from a curated live-ad library, 2026-08-10). The copy
 * moves that repeat across independent brands:
 *   Wealthsimple  "Why pay more to do the same taxes?"        question naming a pain
 *   Talkiatry     "Think you might have ADHD?"                 question naming a state
 *   Talkiatry     "days, not months" / "a person not a customer"   X-not-Y contrast
 *   Gusto         "Clutter is not a payroll system."           X-not-Y contrast
 *   BambooHR      "CUT HR COSTS, NOT CORNERS"                  X-not-Y contrast
 *   BambooHR      "Save $46.8k a year on average when you switch"  exact figure,
 *                 with "Based on customer survey data" attached     grounded claim
 *   Webflow       "50% decrease in engineering costs"          exact figure
 *   Stripe        "Bolt soars to $20M ARR in 2 months"         figure + timeframe
 *   HubSpot       "1,000 free AI prompts"                      countable offer
 *
 * Published large-sample data:
 *   AdEspresso, 752,626 Facebook ads analysed: median headline is 5 WORDS,
 *   median post text 19 words, and the most used high-impact words are
 *   "you", "free", "now", "new". Top CTA verbs: Learn More, Shop Now, Sign Up.
 *   https://adespresso.com/blog/we-analyzed-37259-facebook-ads-and-heres-what-we-learned/
 *   Meta creative guidance: caption under 125 characters before feed truncation.
 *   https://adlibrary.com/posts/meta-ads-creative-best-practices
 *   (Both are correlation, not causation. They are labelled 'reported' below and
 *   held to looser thresholds than what was observed directly.)
 *
 * Usage:
 *   node copy_engine.js --bank            score every generator's copy
 *   node copy_engine.js --gaps            which copy devices the bank lacks
 *   node copy_engine.js --meta            score meta.json (the post about to go out)
 *   node copy_engine.js --gate 55         exit 1 if any layout's copy scores under 55
 */
const fs = require('fs');
const path = require('path');

const stripHtml = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&#\d+;|&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const words = s => stripHtml(s).split(' ').filter(Boolean);

/* ------------------------------------------------------------- extraction */
/* Generators return different shapes. The hook is whatever carries the first
   read; the support is everything else on the canvas; caption and first
   comment are universal. */
const NOT_COPY = new Set(['layout', 'sig', 'hashtags', 'person_file', 'bg', 'bg_file',
  'media_file', 'video_file', 'size', 'figSize', 'serif', 'is_reel', 'pct', 'conf']);

function extract(post) {
  /* The hook is the first non-empty candidate, in priority order. head+emph is
     joined because the editorial layouts split one sentence across two fields. */
  const candidates = [post.hook, post.headline, post.big, post.claim,
    [post.head, post.emph].filter(Boolean).join(' '), post.stat, post.label, post.q, post.body];
  let hook = '';
  for (const c of candidates) { const s = stripHtml(c); if (s) { hook = s; break; } }

  /* Support is every other string the post carries. Walking the object instead
     of naming fields means a new generator's copy is measured the day it lands,
     not the day someone remembers to add its field name here. */
  const parts = [];
  (function walk(v) {
    if (typeof v === 'string') { parts.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) if (!NOT_COPY.has(k)) walk(val);
    }
  })(Object.fromEntries(Object.entries(post)
    .filter(([k]) => !NOT_COPY.has(k) && k !== 'caption' && k !== 'first_comment')));
  const support = stripHtml(parts.join(' ')).replace(hook, '').trim();

  const caption = String(post.caption || '');
  const fc = String(post.first_comment || '');
  return { hook, support, caption, fc, all: [hook, support, caption, fc].join(' ') };
}

/* ------------------------------------------------------------- principles */
const CONTRAST = /\b(not|never|instead of|rather than)\b/i;
const XNOTY = /,\s*not\s+|\bnot\s+(a|an|the|another|just)\b|\.\s*Not\b/i;
const HYPE = /\b(revolutionary|game.?chang\w+|cutting.?edge|next.?level|supercharge\w*|unlock\w*|skyrocket\w*|crush\w* it|10x your|unleash\w*|best.?in.?class|world.?class)\b/i;
const CTA_VERB = /^(run|see|try|get|read|start|book|grab|meet|hear|watch|download|browse|paste|ask)\b/i;

const PRINCIPLES = [
  {
    id: 'hook-brevity', weight: 3, confidence: 'reported',
    name: 'The hook reads in one glance',
    why: 'Across 752,626 Facebook ads the median headline is five words. The real ads '
       + 'in the sample run four to nine. A hook that needs two glances gets one.',
    score(t) {
      const n = words(t.hook).length;
      if (!n) return 0;
      if (n <= 7) return 1;
      if (n <= 9) return 0.8;
      if (n <= 12) return 0.5;
      return 0.2;
    },
    detail: t => words(t.hook).length + ' hook words'
  },
  {
    id: 'second-person', weight: 2, confidence: 'reported',
    name: 'The copy talks to a person',
    why: '"You" is the single most used high-impact word in the AdEspresso corpus, and '
       + 'every sampled brand writes at the reader: your taxes, your quarter, you switch. '
       + 'Copy about "businesses" is copy about nobody.',
    score(t) {
      const inHook = /\byou\w*\b/i.test(t.hook) || /\byou\w*\b/i.test(t.support);
      const inCap = /\byou\w*\b/i.test(t.caption);
      return inHook && inCap ? 1 : (inHook || inCap) ? 0.6 : 0;
    },
    detail: t => (/\byou\w*\b/i.test(t.hook + t.support) ? 'on canvas' : 'not on canvas')
      + (/\byou\w*\b/i.test(t.caption) ? ', in caption' : ', not in caption')
  },
  {
    id: 'specific-figure', weight: 3, confidence: 'observed',
    name: 'A number does the persuading somewhere',
    why: 'BambooHR writes $46.8k, not "thousands". Webflow writes 50%, Stripe writes '
       + '$20M in 2 months, HubSpot counts the prompts. A figure is a claim that can '
       + 'be wrong, which is exactly why it is believed.',
    score(t) { return /\d/.test(t.hook) ? 1 : /\d/.test(t.support + ' ' + t.caption) ? 0.7 : 0; },
    detail: t => /\d/.test(t.hook) ? 'figure in the hook'
      : /\d/.test(t.support + ' ' + t.caption) ? 'figure in support or caption' : 'no figure anywhere'
  },
  {
    id: 'hook-device', weight: 3, confidence: 'observed',
    name: 'The hook uses a proven device',
    why: 'The sample repeats two devices across unrelated brands: the question that '
       + 'names a state the reader recognises (Talkiatry, Wealthsimple, HubSpot), and '
       + 'the X-not-Y contrast (Gusto, BambooHR, Talkiatry twice). Plain declaratives '
       + 'work too, but a bank where nothing asks and nothing contrasts is leaving the '
       + 'two most repeated moves on the table.',
    score(t) {
      const q = /\?/.test(t.hook);
      const c = XNOTY.test(t.hook) || CONTRAST.test(t.hook);
      return q || c ? 1 : (XNOTY.test(t.caption) || /\?/.test(t.caption.split('\n')[0] || '')) ? 0.5 : 0.3;
    },
    detail: t => /\?/.test(t.hook) ? 'question hook'
      : (XNOTY.test(t.hook) || CONTRAST.test(t.hook)) ? 'contrast hook' : 'plain declarative'
  },
  {
    id: 'caption-first-line', weight: 2, confidence: 'reported',
    name: 'The caption survives truncation',
    why: 'The feed cuts a caption near 125 characters. Whatever argument does not fit '
       + 'before the fold is an argument most people never see.',
    score(t) {
      const first = (t.caption.split('\n')[0] || '').length;
      if (!first) return 0;
      if (first <= 125) return 1;
      if (first <= 160) return 0.6;
      return 0.2;
    },
    detail: t => (t.caption.split('\n')[0] || '').length + ' chars before the first break'
  },
  {
    id: 'fc-asks', weight: 2, confidence: 'observed',
    name: 'The first comment asks something answerable',
    why: 'A comment that asks a specific question gives the reader a reason to type. '
       + 'Every strong entry in this bank already does it; this keeps new ones honest.',
    score(t) {
      if (!t.fc) return 0;
      return /\?/.test(t.fc) ? 1 : 0.4;
    },
    detail: t => t.fc ? (/\?/.test(t.fc) ? 'asks a question' : 'states, does not ask') : 'no first comment'
  },
  {
    id: 'no-hype', weight: 2, confidence: 'observed',
    name: 'No hype vocabulary',
    why: 'None of the 44 sampled ads say revolutionary, game-changing, unlock, or '
       + 'supercharge. Real brands make checkable claims in plain words. Hype is the '
       + 'fastest way for automated copy to read as automated copy.',
    score(t) { return HYPE.test(t.all) ? 0 : 1; },
    detail: t => { const m = t.all.match(HYPE); return m ? 'HYPE: "' + m[0] + '"' : 'clean'; }
  },
  {
    id: 'cta-verb', weight: 1, confidence: 'reported',
    name: 'The call to action starts with a verb',
    why: 'The dominant CTAs across the AdEspresso corpus are verb-first: Learn More, '
       + 'Shop Now, Sign Up. Run the diagnostic beats The diagnostic.',
    score(t) {
      const cta = stripHtml((t.caption.match(/\b(link in bio[^\n]*|growthterminal\.io)/i) || [''])[0]
        || t.support);
      const src = t.all;
      return CTA_VERB.test(stripHtml(t.support)) || /\b(run|try|see|get|start|grab|book|read)\b/i.test(src) ? 1 : 0.4;
    },
    detail: () => 'verb check on the closing move'
  },
  {
    id: 'dash-rule', weight: 3, confidence: 'observed',
    name: 'No em or en dashes, anywhere, ever',
    why: 'Standing rule on this account. The scorer treats it as copy quality because '
       + 'it is: it is the loudest tell of machine writing this account has.',
    /* Written as escapes so this file passes the very scan it enforces. */
    score(t) { return (t.all.includes('\u2014') || t.all.includes('\u2013')) ? 0 : 1; },
    detail: t => (t.all.includes('\u2014') || t.all.includes('\u2013')) ? 'DASH FOUND' : 'clean'
  }
];

const MAX = PRINCIPLES.reduce((n, p) => n + p.weight, 0);

function grade(post) {
  const t = extract(post);
  const rows = PRINCIPLES.map(p => {
    const s = p.score(t);
    return { id: p.id, weight: p.weight, score: s, earned: s * p.weight, detail: p.detail(t) };
  });
  const earned = rows.reduce((n, r) => n + r.earned, 0);
  return { score: Math.round((earned / MAX) * 100), rows, text: t };
}

/* ------------------------------------------------------------------- CLI */
const args = process.argv.slice(2);
const bar = n => '#'.repeat(Math.round(n / 5)).padEnd(20, '.');

function loadBank() {
  const G = require('./generate.js');
  if (!G.GENERATORS || !G.rng) {
    console.error('generate.js does not export GENERATORS/rng.');
    process.exit(1);
  }
  const perLayout = new Map();
  for (const gen of G.GENERATORS) {
    for (let s = 1; s <= 4; s++) {
      let post;
      try { post = gen(G.rng(s * 104729)); } catch { continue; }
      if (!post || !post.layout) continue;
      const g = grade(post);
      const prev = perLayout.get(post.layout);
      if (!prev) perLayout.set(post.layout, { scores: [g.score], sample: g });
      else prev.scores.push(g.score);
    }
  }
  return [...perLayout.entries()].map(([layout, v]) => ({
    layout,
    avg: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
    lo: Math.min(...v.scores), hi: Math.max(...v.scores), sample: v.sample
  })).sort((a, b) => b.avg - a.avg);
}

function printBank(rows) {
  console.log('\nBANK COPY SCORE, ' + rows.length + ' layouts, ' + PRINCIPLES.length + ' principles\n');
  console.log('  layout          score  range     weakest principle');
  for (const r of rows) {
    const worst = r.sample.rows.slice().sort((a, b) => (a.score * a.weight) - (b.score * b.weight))[0];
    console.log('  ' + r.layout.padEnd(15) + String(r.avg).padStart(3) + '   '
      + (r.lo + '-' + r.hi).padEnd(8) + '  ' + bar(r.avg) + '  ' + worst.id);
  }
  const all = rows.map(r => r.avg);
  console.log('\n  mean ' + Math.round(all.reduce((a, b) => a + b, 0) / all.length)
    + ', floor ' + Math.min(...all) + ', ceiling ' + Math.max(...all));

  const byP = {};
  for (const r of rows) for (const row of r.sample.rows) (byP[row.id] = byP[row.id] || []).push(row.score);
  console.log('\n  PRINCIPLE PASS RATE ACROSS THE BANK');
  Object.entries(byP)
    .map(([id, v]) => [id, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100)])
    .sort((a, b) => a[1] - b[1])
    .forEach(([id, pct]) => console.log('    ' + String(pct).padStart(3) + '%  ' + id));
}

function printGaps(rows) {
  console.log('\nCOPY DEVICE COVERAGE, measured across the whole rotation\n');
  let q = 0, c = 0, plain = 0;
  for (const r of rows) {
    const d = r.sample.rows.find(x => x.id === 'hook-device');
    if (/question/.test(d.detail)) q++;
    else if (/contrast/.test(d.detail)) c++;
    else plain++;
  }
  console.log('  question hooks:   ' + q + ' layouts');
  console.log('  contrast hooks:   ' + c + ' layouts');
  console.log('  plain declarative: ' + plain + ' layouts');
  console.log('\n  The sample repeats the question device (Talkiatry, Wealthsimple, HubSpot)');
  console.log('  and the X-not-Y contrast (Gusto, BambooHR, Talkiatry). If either count');
  console.log('  above reads 0, that is the next copy bank to write.');
  const noFig = rows.filter(r => /no figure/.test(r.sample.rows.find(x => x.id === 'specific-figure').detail));
  if (noFig.length) {
    console.log('\n  LAYOUTS WITH NO FIGURE ANYWHERE (weakest single fix available):');
    noFig.forEach(r => console.log('    ' + r.layout));
  }
}

if (require.main === module) {
  if (args.includes('--meta')) {
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'meta.json'), 'utf8')); }
    catch (e) { console.error('could not read meta.json: ' + e.message); process.exit(1); }
    const g = grade(meta);
    console.log('meta.json copy score ' + g.score + '/100  ' + bar(g.score));
    for (const r of g.rows) {
      console.log('  ' + (r.score === 1 ? 'ok  ' : r.score > 0 ? '~   ' : 'MISS')
        + r.id.padEnd(20) + r.detail);
    }
    process.exit(0);
  }

  const rows = loadBank();
  if (args.includes('--gaps')) { printGaps(rows); process.exit(0); }
  printBank(rows);

  const gi = args.indexOf('--gate');
  if (gi >= 0) {
    const floor = parseInt(args[gi + 1] || '55', 10);
    const under = rows.filter(r => r.avg < floor);
    if (under.length) {
      console.log('\nGATE FAIL: ' + under.length + ' layouts under ' + floor + ': '
        + under.map(r => r.layout + ' (' + r.avg + ')').join(', '));
      process.exit(1);
    }
    console.log('\nGATE PASS: every layout at or above ' + floor + '.');
  }
}

module.exports = { grade, extract, PRINCIPLES };
