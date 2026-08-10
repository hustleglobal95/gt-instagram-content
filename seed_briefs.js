/* Seeds inspiration_queue.json with structural briefs gathered by hand from
   live ad breakdowns. Same shape research.js produces, so the queue is one
   ledger regardless of whether a brief arrived by bot or by reading.
   Structure and reasoning only. No borrowed copy, no borrowed imagery. */
const fs = require('fs');
const path = require('path');
const QUEUE = path.join(__dirname, 'inspiration_queue.json');

function briefId(source, key) {
  let h = 5381; const s = source + '|' + key;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return source.slice(0, 2) + '_' + h.toString(36);
}

const SRC_V = 'https://www.vibemyad.com/blog/10-b2b-static-ad-examples-worth-stealing-from-2026';
const SRC_G = 'https://www.grafit.agency/blog/b2b-saas-ad-design-guide';

/* near: which bank layout already covers this, or null if the shape is new.
   Anything with a near value is parked so review time goes to the new ones. */
const BRIEFS = [
  {
    key: 'before-after-metric', url: SRC_V, near: null,
    name: 'Before and after metric card',
    anatomy: 'Frame splits vertically. Starting number left, desired number right, a divider or arrow between them. Labels sit small under each figure. Product attribution is a single line at the base. No qualifier language anywhere.',
    why: 'The gap between the two numbers does the persuading. Nothing has to be claimed, the reader does the subtraction themselves and arrives at the conclusion unaided.',
    gt: 'Left is the constraint today, right is the same number after the fix, with the engine dollar range as the divider. This is the one format that shows what Growth Terminal is actually selling, the delta, rather than describing it.'
  },
  {
    key: 'report-cover', url: SRC_G, near: null,
    name: 'Report cover, lead magnet',
    anatomy: 'Composition mimics a printed industry report. Oversized title, a single branded object centred, production quality doing the persuading. Download CTA at the base. Deliberately editorial rather than promotional.',
    why: 'Perceived production value transfers to perceived substance before a word is read. A generic template reads as filler, a designed cover reads as research worth an email address.',
    gt: 'The intelligence briefing and the state of growth reviews research already exist on the site and have no ad format pointing at them. This is a distribution layout for assets that are already written.'
  },
  {
    key: 'behavior-callout', url: SRC_V, near: null,
    name: 'Behaviour call out',
    anatomy: 'Small icon or illustration anchors one side. A single line names a specific thing the reader already does. A stat or qualifier sits below it. The CTA asks for something the reader already possesses rather than a commitment.',
    why: 'Naming a behaviour the reader recognises in themselves earns the next two seconds. The ask is low friction because it requests something already in hand.',
    gt: 'Growth Terminal reads a spreadsheet the reader already has open. The ask is literally a file they already own, which is exactly the low friction shape this format is built for.'
  },
  {
    key: 'proprietary-insight-chart', url: SRC_V, near: null,
    name: 'Proprietary data insight',
    anatomy: 'A branded chart carrying an insight only this company could produce. Minimal supporting text. The visualization is both the proof and the product demonstration at once.',
    why: 'The product generates the data and the data becomes the advertisement. It cannot be copied by a competitor because they do not have the dataset.',
    gt: 'The engine has run analyses across twelve constraint categories. Which constraint bites most often, and at what severity, is a number nobody else can publish. This is the strongest long term format on the list because it compounds as more analyses run.'
  },
  {
    key: 'event-webinar', url: SRC_G, near: null,
    name: 'Event or live session',
    anatomy: 'A coloured pill label sets urgency at the top. Faces with titles occupy the centre. A branded object backs the composition. Date and time anchor the base. CTA drives registration rather than purchase.',
    why: 'A real deadline plus a human face create time pressure and social proof in the same frame, without either being claimed in copy.',
    gt: 'Only worth building when there is a real session to run. Filed so the shape exists when it is needed, not before.'
  },
  {
    key: 'case-study-metric', url: SRC_V, near: null,
    name: 'Case study metric with customer logo',
    anatomy: 'An outcome statement, a recognisable customer logo directly beneath, restrained typography, one CTA, no secondary copy at all.',
    why: 'The logo validates the claim before the reader has time to form an objection. Peer credibility outranks any brand assertion.',
    gt: 'BLOCKED, not unbuilt. This format needs a named customer willing to be shown with a real number. Building the layout before that exists would mean inventing one. Revisit when the first customer agrees to be named.'
  },
  {
    key: 'giant-metric-billboard', url: SRC_V, near: 'stat',
    name: 'Giant metric typography',
    anatomy: 'One oversized number occupies more than half the frame. A short context line sits under it. Branding is small. Legible at thumbnail scale, functions as a billboard.',
    why: 'Scale alone stops the scroll. The number is readable before the reader has decided whether to read.',
    gt: 'The bank already has stat. Worth checking whether stat pushes the number far enough, since this variant is specifically about billboard scale rather than a number with supporting copy.'
  },
  {
    key: 'headline-plus-ui', url: SRC_G, near: 'highlight',
    name: 'Bold headline over product UI',
    anatomy: 'Headline owns the upper third, product screenshot fills the lower half, often device framed. Logo small in a corner, one CTA anchoring the base.',
    why: 'The headline does not make a claim, it shows one. Visual and verbal aligned on the same use case turn the ad into evidence.',
    gt: 'Already added as the highlight layout, built from the Owner ad. Parked as confirmation the shape was worth taking.'
  },
  {
    key: 'metric-first-proof', url: SRC_G, near: 'stat',
    name: 'Metric first social proof',
    anatomy: 'Large display metric centred, customer attribution directly beneath, brand and CTA in a footer bar.',
    why: 'A verifiable figure tied to a named source feels testable in a way a generic outcome claim never does.',
    gt: 'Variant of stat. Blocked by the same missing ingredient as the case study format, a named customer.'
  },
  {
    key: 'ui-as-hero', url: SRC_G, near: 'prodshot', name: 'Product UI as hero',
    anatomy: 'Interface occupies nearly the whole frame, text minimal, headline and logo in opposite corners, dark background receding.',
    why: 'When the product design is self explanatory the workflow is recognised instantly by the right operator and ignored by everyone else, which is efficient targeting.',
    gt: 'prodshot covers this. Parked.'
  },
  {
    key: 'pattern-interrupt', url: SRC_G, near: 'contrast', name: 'Pattern interrupt',
    anatomy: 'One striking image that breaks the category visual template. Strikethrough text, unexpected colour, or a visual joke. Minimal copy, plain CTA.',
    why: 'Contrast against the feed does the scroll stopping before any text registers.',
    gt: 'contrast and statement cover the typographic version. The meme version is off brand for a diagnostic tool and would cost more credibility than it buys.'
  },
  {
    key: 'exec-quote', url: SRC_V, near: 'quote', name: 'Executive quote stack',
    anatomy: 'Quote occupies the primary real estate. Name, title and company logo stack below it. Surrounding visual kept deliberately quiet.',
    why: 'A verifiable attributed claim outranks anything the brand says about itself.',
    gt: 'quote layout already exists. Needs real attributed quotes before it should run.'
  },
  {
    key: 'live-demo-ui', url: SRC_V, near: 'prodshot', name: 'Live product demo with odd number',
    anatomy: 'Screenshot of the product mid task, carrying a deliberately non round number. Minimal headline.',
    why: 'Specificity reads as real customer data. A round number reads as an illustration, an odd one reads as a screenshot.',
    gt: 'Worth borrowing as a rule rather than a layout: dollar ranges in creatives should be odd, matching what the engine actually returns.'
  },
  {
    key: 'compressed-dual-claim', url: SRC_V, near: 'statement', name: 'Compressed dual claim headline',
    anatomy: 'Under ten words carrying both a magnitude and a speed claim at equal weight.',
    why: 'It answers how much and how fast in one line, closing the two most common objections simultaneously.',
    gt: 'A copy rule rather than a layout. The size of the constraint plus about sixty seconds is exactly this shape, and it belongs in the hook pools rather than in a new renderer.'
  },
  {
    key: 'localized-variant', url: SRC_V, near: null, name: 'Localized or vertical messaging',
    anatomy: 'One visual treatment held constant while the headline carries a regional or vertical marker.',
    why: 'Signals the ad was made for this specific reader rather than broadcast, at almost no production cost.',
    gt: 'Not a layout, a variant axis. The industry playbook pages already exist for agency, ecommerce, saas, b2b services, coaching and local services, so the copy already exists to feed it.'
  }
];

const queue = (() => { try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch { return []; } })();
const seen = new Set(queue.map(b => b.id));
const now = new Date().toISOString();
let added = 0;

for (const b of BRIEFS) {
  const id = briefId('hand', b.key);
  if (seen.has(id)) continue;
  queue.push({
    id, source: 'hand', url: b.url, capturedAt: now,
    name: b.name,
    structure: { anatomy: b.anatomy },
    whyItWorks: b.why,
    gtAngle: b.gt,
    nearestExistingLayout: b.near,
    novelty: b.near ? 'variant of ' + b.near : 'no close match in the bank',
    status: b.near ? 'parked' : 'new'
  });
  added++;
}
fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2));
const fresh = queue.filter(b => b.status === 'new').length;
const parked = queue.filter(b => b.status === 'parked').length;
console.log('added ' + added + ' briefs, queue now ' + queue.length);
console.log('  new, no close match in the bank: ' + fresh);
console.log('  parked, already covered:         ' + parked);
