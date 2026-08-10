/**
 * ad_structure.js, the structural intelligence layer.
 * -----------------------------------------------------------------------------
 * WHAT THIS IS
 * A measurable model of how high performing ads are BUILT, derived from real ads
 * that real companies are running right now, plus published findings on how the
 * feed is actually read. It turns "this looks good" into a number that can be
 * argued with.
 *
 * WHY IT EXISTS
 * The bank had twenty layouts and no way to say which ones were structurally
 * sound. Taste is not a quality gate. Every principle below is measured from the
 * rendered HTML, deterministically, with no model in the loop, so the same
 * creative always scores the same and a regression is visible the day it lands.
 *
 * HONESTY ABOUT THE EVIDENCE
 * Each principle carries its source and a confidence label:
 *   observed   seen repeatedly across independent real ads in the sample below
 *   reported   a published benchmark, credible but not independently verified here
 *   inferred   a reasonable structural reading, held to a loose threshold
 * "observed" is the strongest thing here. Nothing in this file claims to be a
 * causal result, because none of it is. It is a structural consensus, and it is
 * labelled as one.
 *
 * THE SAMPLE (real ads, pulled from a curated live-ad library)
 *   Stripe      3 ads  named customer + magnitude + timeframe, one line, minimal CTA
 *   Slack       8 ads  attributed quote + face + customer logo + brand lockup
 *   Rippling    3 ads  asymmetric before/after checklist, 4 unchecked vs 1 checked
 *   BambooHR    4 ads  headline + pill CTA, quantified claim demoted to the footer
 *   Brex        2 ads  hard two zone split, claim above, brand voice below
 *   Gusto       2 ads  highlight marker on the one number inside running prose
 *   Asana       1 ad   product UI card as the evidence object
 *   HubSpot     3 ads  offer object rendered as a thing you receive
 *   monday.com  1 ad   photo framed inside a colour block, headline on the frame
 *   Canva       1 ad   social proof screenshot stacked over a product screenshot
 *
 * Usage
 *   node ad_structure.js --bank            score every layout, print the table
 *   node ad_structure.js --gaps            which proven structures are missing
 *   node ad_structure.js --file x.html     score one rendered file
 *   node ad_structure.js --principles      print the model and its sources
 *   node ad_structure.js --gate 55         exit 1 if any layout scores under 55
 */
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ sources */
const SOURCES = {
  library: 'Curated live-ad library, 28 ads across 10 B2B brands, sampled 2026-08-10',
  carousel: 'https://www.adpicto.com/en/blog/instagram-carousel-best-practices-2026',
  meta: 'https://adlibrary.com/posts/meta-ads-creative-best-practices'
};

/* ------------------------------------------------------------- measurement */
/* An accent is a colour with real chroma. Blacks, whites and the warm grey ramp
   that GT builds out of its own ink are not accents, they are the neutral
   scaffolding every one of these layouts stands on. Deciding that by saturation
   rather than by a hardcoded list means a new grey does not become a false
   positive the day someone adds one. */
function hexToHsl(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { h: hue, s, l };
}

/* Saturation over 0.35 and not collapsed into black or white. The GT warm greys
   sit under 0.2, the brand orange sits at 1.0, a stray green sits near 0.65. */
function isAccent(hex) {
  const c = hexToHsl(hex);
  if (!c) return false;
  return c.s > 0.35 && c.l > 0.12 && c.l < 0.94;
}

/* Hue buckets, so two shades of the same brand orange count as one accent and
   an orange plus a green counts as two. 30 degrees is about the point where a
   viewer stops reading two colours as the same colour. */
function hueBucket(hex) {
  const c = hexToHsl(hex);
  return c ? Math.round(c.h / 30) : -1;
}

function decode(s) {
  return String(s)
    .replace(/&#8594;|&rarr;/g, '>')
    .replace(/&#8212;|&#8211;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

function measure(html) {
  const src = String(html || '');

  /* Visible text: drop tags (which carry all the inline styling), then entities. */
  const text = decode(src.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').filter(Boolean) : [];

  /* Typographic tiers. Only sizes that actually carry text matter, but reading
     that needs a browser, so this counts declared sizes and is honest about it. */
  const sizes = [...src.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => parseFloat(m[1]));
  const uniqueSizes = [...new Set(sizes)].sort((a, b) => b - a);

  /* Colour palette. The negative lookbehind keeps HTML entities like &#10003;
     out of the hex list, which they otherwise pass for. rgba() shades of the
     same ink are not new colours and are ignored on purpose. */
  const hexes = [...src.matchAll(/(?<![&\w])#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})(?![0-9a-f])/gi)]
    .map(m => ('#' + m[1]).toLowerCase());
  const accentHexes = [...new Set(hexes)].filter(isAccent);
  const accents = [...new Set(accentHexes.map(hueBucket))]
    .map(b => accentHexes.find(h => hueBucket(h) === b));

  return {
    text, words: words.length,
    sizes: uniqueSizes,
    top: uniqueSizes[0] || 0,
    second: uniqueSizes[1] || 0,
    accents,
    hasLogo: /gt-logo-mark|<svg/i.test(src),
    hasDigit: /\d/.test(text),
    length: src.length
  };
}

/* ------------------------------------------------------------- principles */
/* score(m) returns 0..1. Partial credit everywhere, because a hard pass/fail
   turns a scorer into a style police and gets switched off within a week. */
const PRINCIPLES = [
  {
    id: 'focal-dominance', weight: 3, confidence: 'observed',
    name: 'One element is unmistakably the largest',
    why: 'Every ad in the sample has a single type element that wins by a wide margin. '
       + 'Stripe runs one line at roughly triple the CTA size, Brex the same, Slack sets '
       + 'the quote far above the attribution. Two elements competing for first read means '
       + 'neither is read at feed speed.',
    source: SOURCES.library,
    score(m) {
      if (!m.second) return m.top ? 1 : 0;
      const ratio = m.top / m.second;
      if (ratio >= 1.6) return 1;
      if (ratio >= 1.3) return 0.6;
      if (ratio >= 1.15) return 0.3;
      return 0;
    },
    detail: m => 'largest ' + m.top + 'px vs next ' + m.second + 'px, ratio '
      + (m.second ? (m.top / m.second).toFixed(2) : 'n/a')
  },
  {
    id: 'hierarchy-depth', weight: 2, confidence: 'observed',
    name: 'At least three tiers, so the eye has a route',
    why: 'Every sampled ad gives the eye somewhere to go after the headline: a kicker '
       + 'above, a support line below, an anchor at the foot. Two tiers reads as a poster, '
       + 'not an ad, and gives the reader nothing to do with their second second.',
    source: SOURCES.library,
    score(m) { return m.sizes.length >= 3 ? 1 : m.sizes.length === 2 ? 0.5 : 0; },
    detail: m => m.sizes.length + ' declared type sizes'
  },
  {
    id: 'tier-restraint', weight: 2, confidence: 'reported',
    name: 'No more than five type sizes',
    why: 'Published carousel guidance puts the ceiling at two typeface sizes per slide. '
       + 'The real single-image ads in the sample run three to four tiers. Five is the '
       + 'point where hierarchy stops being hierarchy and becomes noise.',
    source: SOURCES.carousel + ' and ' + SOURCES.library,
    score(m) {
      if (m.sizes.length <= 4) return 1;
      if (m.sizes.length === 5) return 0.7;
      if (m.sizes.length === 6) return 0.35;
      return 0;
    },
    detail: m => m.sizes.length + ' tiers'
  },
  {
    id: 'word-budget', weight: 3, confidence: 'reported',
    name: 'Under thirty visible words',
    why: 'Carousel guidance caps a value slide near twenty five words. The real ads are '
       + 'far under it: Stripe nine, Brex ten across both zones, BambooHR fifteen '
       + 'including the footer claim. Word count is the cheapest proxy for whether a '
       + 'creative can be read before the thumb moves.',
    source: SOURCES.carousel + ' and ' + SOURCES.library,
    score(m) {
      if (m.words <= 25) return 1;
      if (m.words <= 30) return 0.85;
      if (m.words <= 40) return 0.6;
      if (m.words <= 55) return 0.3;
      return 0;
    },
    detail: m => m.words + ' words'
  },
  {
    id: 'single-accent', weight: 2, confidence: 'reported',
    name: 'One accent colour carries every emphasis',
    why: 'Carousel guidance is explicit about one accent colour throughout, and the real '
       + 'ads hold to it: Stripe purple, Slack purple, BambooHR lime, Brex orange. A '
       + 'second accent halves the meaning of the first, because emphasis only exists '
       + 'relative to what is not emphasised.',
    source: SOURCES.carousel + ' and ' + SOURCES.library,
    score(m) {
      if (m.accents.length === 1) return 1;
      if (m.accents.length === 2) return 0.6;
      if (m.accents.length === 0) return 0.4;
      return 0.15;
    },
    detail: m => m.accents.length + ' accent colours: ' + (m.accents.join(' ') || 'none')
  },
  {
    id: 'specific-magnitude', weight: 2, confidence: 'observed',
    name: 'A specific number is on the creative',
    why: 'Stripe puts the number in the headline, BambooHR demotes it to the footer, '
       + 'Gusto highlights it mid sentence. Placement varies, presence does not. '
       + 'Published Meta guidance says the same thing: a specific figure anchors '
       + 'credibility in a way an adjective cannot.',
    source: SOURCES.meta + ' and ' + SOURCES.library,
    score(m) { return m.hasDigit ? 1 : 0; },
    detail: m => m.hasDigit ? 'has a figure' : 'no figure anywhere'
  },
  {
    id: 'brand-anchor', weight: 3, confidence: 'observed',
    name: 'The brand mark is on the creative',
    why: 'Twenty eight of twenty eight sampled ads carry the brand mark. This is also a '
       + 'standing rule on this account: nothing unbranded is posted, and a rule that is '
       + 'not measured is not a rule.',
    source: SOURCES.library,
    score(m) { return m.hasLogo ? 1 : 0; },
    detail: m => m.hasLogo ? 'mark present' : 'NO MARK'
  },
  {
    id: 'exit-instruction', weight: 2, confidence: 'observed',
    name: 'The creative says where to go next',
    why: 'Start now, DOWNLOAD CHECKLIST, that is bambooable, the bare domain. Every '
       + 'sampled ad ends the eye somewhere deliberate. A creative that argues well and '
       + 'then stops has spent the attention it earned and banked nothing.',
    source: SOURCES.library,
    score(m) {
      const t = m.text.toLowerCase();
      if (/growthterminal\.io|link in bio|run the|start |try it|see what|download|get the/.test(t)) return 1;
      if (/free|diagnostic/.test(t)) return 0.5;
      return 0;
    },
    detail: m => /growthterminal\.io/.test(m.text) ? 'domain anchor' : 'check the closing line'
  }
];

const MAX = PRINCIPLES.reduce((n, p) => n + p.weight, 0);

function grade(html) {
  const m = measure(html);
  const rows = PRINCIPLES.map(p => {
    const s = p.score(m);
    return { id: p.id, weight: p.weight, score: s, earned: s * p.weight, detail: p.detail(m) };
  });
  const earned = rows.reduce((n, r) => n + r.earned, 0);
  return { score: Math.round((earned / MAX) * 100), rows, measured: m };
}

/* --------------------------------------------------------- proven structures */
/* Structures the sample shows working, each with whether the bank can fill it
   HONESTLY. A structure GT cannot fill with a true statement is not a gap to
   close, it is a thing to go earn. That distinction is the whole point. */
const STRUCTURES = [
  { id: 'named-magnitude-headline', seenIn: 'Stripe x3',
    anatomy: 'Named subject, a specific magnitude, an elapsed time, all in one line. '
           + 'Minimal CTA with an arrow underneath. Nothing else on the canvas.',
    gtFill: 'blocked',
    note: 'Needs a named customer and a real number. GT has neither yet. Filling this '
        + 'with an invented customer would be the single fastest way to lose the account.' },

  { id: 'attributed-testimonial', seenIn: 'Slack x8, Gusto x2',
    anatomy: 'Quote mark, quote set large, circular headshot low right, customer logo '
           + 'badge overlapping it, brand lockup low left. Whitespace does the rest.',
    gtFill: 'blocked',
    note: 'The mechanism is attribution: a real name, a real company, a real outcome. '
        + 'Slack runs eight variants of this one structure, which says what it is worth. '
        + 'This is the highest value thing on the list and it cannot be built, only earned.' },

  { id: 'asymmetric-checklist', seenIn: 'Rippling x3',
    anatomy: 'Two columns under one headline. Left: four unchecked boxes of manual work. '
           + 'Right: one checked box. The asymmetry is the entire argument, not the copy.',
    gtFill: 'ready',
    note: 'GT fills this honestly: twelve places to check by hand against one diagnostic.' },

  { id: 'two-zone-voice-split', seenIn: 'Brex x2',
    anatomy: 'Hard horizontal split. Upper zone is a colour field carrying the claim in '
           + 'plain language. Lower zone is a different field carrying brand voice and a '
           + 'footnote. The second zone carries no information, it carries character.',
    gtFill: 'ready',
    note: 'A voice register the bank does not have anywhere. Currently every layout is '
        + 'in the same register, which is why the feed reads flat across a week.' },

  { id: 'demoted-proof', seenIn: 'BambooHR x2, Gusto x1',
    anatomy: 'Headline is a plain claim. CTA sits mid canvas. The quantified proof is '
           + 'set small at the foot, deliberately not the hero.',
    gtFill: 'ready',
    note: 'Understatement as credibility. The bank always puts the number in the hero, so '
        + 'the number stops reading as evidence and starts reading as decoration.' },

  { id: 'ui-as-evidence', seenIn: 'Asana x1, Canva x1',
    anatomy: 'A floating product UI card with a soft shadow, showing a real interface '
           + 'state rather than a description of one.',
    gtFill: 'covered',
    note: 'The prodshot and prodclaim layouts already do this.' },

  { id: 'offer-as-object', seenIn: 'HubSpot x3, BambooHR x2',
    anatomy: 'The downloadable is rendered as a physical thing: a 3D book, a fanned stack '
           + 'of pages, a laptop showing the template.',
    gtFill: 'blocked',
    note: 'GT has no lead magnet. Worth noting as a marketing gap, not a layout gap.' },

  { id: 'highlight-in-prose', seenIn: 'Gusto x1',
    anatomy: 'Running prose at one size, with a marker highlight behind the single number '
           + 'that matters. The eye finds the figure without the layout shouting.',
    gtFill: 'device',
    note: 'Not a layout, a device. Usable inside any existing text layout.' }
];

/* -------------------------------------------------------------------- CLI */
const args = process.argv.slice(2);
const argv = (f, d) => { const i = args.indexOf(f); return i >= 0 ? (args[i + 1] || d) : d; };
const bar = (n) => '#'.repeat(Math.round(n / 5)).padEnd(20, '.');

function printPrinciples() {
  console.log('\nSTRUCTURAL MODEL, ' + PRINCIPLES.length + ' principles, ' + MAX + ' points total\n');
  for (const p of PRINCIPLES) {
    console.log('[' + p.confidence.toUpperCase() + '] ' + p.name + '  (weight ' + p.weight + ')');
    console.log('  ' + p.why.replace(/\s+/g, ' '));
    console.log('  source: ' + p.source + '\n');
  }
}

function scoreBank() {
  let G;
  try { G = require('./generate.js'); }
  catch (e) { console.error('could not load generate.js: ' + e.message); process.exit(1); }
  const { RENDER, GENERATORS, rng } = G;
  if (!RENDER || !GENERATORS) {
    console.error('generate.js does not export RENDER/GENERATORS. Add them to module.exports.');
    process.exit(1);
  }

  const seen = new Map();
  const skipped = [];
  /* Several seeds per generator: banks are random, one draw is not the layout. */
  for (const gen of GENERATORS) {
    for (let s = 1; s <= 4; s++) {
      let post, html;
      try { post = gen(rng(s * 7919)); html = RENDER[post.layout](post); }
      catch (e) {
        const name = (gen.name || 'anon').replace(/^gen_/, '');
        if (!skipped.some(x => x.name === name)) skipped.push({ name, why: e.message.slice(0, 70) });
        continue;
      }
      if (!html) continue;
      const g = grade(html);
      const prev = seen.get(post.layout);
      if (!prev) seen.set(post.layout, { scores: [g.score], sample: g });
      else prev.scores.push(g.score);
    }
  }

  const rows = [...seen.entries()].map(([layout, v]) => ({
    layout,
    avg: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
    lo: Math.min(...v.scores), hi: Math.max(...v.scores), sample: v.sample
  })).sort((a, b) => b.avg - a.avg);

  console.log('\nBANK STRUCTURE SCORE, ' + rows.length + ' layouts, ' + PRINCIPLES.length + ' principles\n');
  console.log('  layout          score  range     ' + 'weakest principle');
  for (const r of rows) {
    const worst = r.sample.rows.slice().sort((a, b) =>
      (a.score * a.weight) - (b.score * b.weight))[0];
    console.log('  ' + r.layout.padEnd(15) + String(r.avg).padStart(3) + '   '
      + (r.lo + '-' + r.hi).padEnd(8) + '  ' + bar(r.avg) + '  ' + worst.id);
  }

  const all = rows.map(r => r.avg);
  console.log('\n  mean ' + Math.round(all.reduce((a, b) => a + b, 0) / all.length)
    + ', floor ' + Math.min(...all) + ', ceiling ' + Math.max(...all));

  /* Which principle the bank as a whole is worst at. That is the real finding. */
  const byP = {};
  for (const r of rows) for (const row of r.sample.rows) {
    (byP[row.id] = byP[row.id] || []).push(row.score);
  }
  console.log('\n  PRINCIPLE PASS RATE ACROSS THE BANK');
  Object.entries(byP)
    .map(([id, v]) => [id, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100)])
    .sort((a, b) => a[1] - b[1])
    .forEach(([id, pct]) => console.log('    ' + String(pct).padStart(3) + '%  ' + id));

  if (skipped.length) {
    console.log('\n  NOT SCORED (need a browser or an image at render time, so a static '
      + 'read cannot see them):');
    skipped.forEach(s => console.log('    ' + s.name + ': ' + s.why));
  }
  return rows;
}

function printGaps() {
  const state = { ready: [], blocked: [], covered: [], device: [] };
  STRUCTURES.forEach(s => state[s.gtFill].push(s));
  console.log('\nPROVEN STRUCTURES, ' + STRUCTURES.length + ' found in the live-ad sample\n');
  const block = (title, list, note) => {
    if (!list.length) return;
    console.log(title + '  (' + list.length + ')');
    if (note) console.log('  ' + note);
    for (const s of list) {
      console.log('\n  ' + s.id + '   seen in ' + s.seenIn);
      console.log('    anatomy: ' + s.anatomy.replace(/\s+/g, ' '));
      console.log('    ' + s.note.replace(/\s+/g, ' '));
    }
    console.log('');
  };
  block('BUILDABLE NOW', state.ready, 'GT can fill these with true statements today.');
  block('ALREADY IN THE BANK', state.covered);
  block('USABLE AS A DEVICE', state.device);
  block('BLOCKED, AND HONESTLY SO', state.blocked,
    'These work because of something GT does not have yet. Building them anyway '
    + 'would mean inventing the thing that makes them work.');
}

module.exports = { grade, measure, PRINCIPLES, STRUCTURES, SOURCES, isAccent, hexToHsl };

/* Everything below is the command line. Requiring this file must not run it. */
if (require.main !== module) return;

if (args.includes('--principles')) { printPrinciples(); process.exit(0); }
if (args.includes('--gaps')) { printGaps(); process.exit(0); }

const file = argv('--file', null);
if (file) {
  const g = grade(fs.readFileSync(path.resolve(file), 'utf8'));
  console.log('\n' + file + '   score ' + g.score + '/100  ' + bar(g.score) + '\n');
  for (const r of g.rows) {
    console.log('  ' + (r.score === 1 ? 'ok  ' : r.score > 0 ? '~   ' : 'MISS')
      + r.id.padEnd(22) + r.detail);
  }
  process.exit(0);
}

if (args.includes('--bank') || args.includes('--gate')) {
  const rows = scoreBank();
  const gateIdx = args.indexOf('--gate');
  if (gateIdx >= 0) {
    const floor = parseInt(args[gateIdx + 1] || '55', 10);
    const under = rows.filter(r => r.avg < floor);
    if (under.length) {
      console.log('\nGATE FAIL: ' + under.length + ' layouts under ' + floor
        + ': ' + under.map(r => r.layout + ' (' + r.avg + ')').join(', '));
      process.exit(1);
    }
    console.log('\nGATE PASS: every layout at or above ' + floor + '.');
  }
  process.exit(0);
}

console.log('usage: node ad_structure.js --bank | --gaps | --principles | --file <html> | --gate <n>');
