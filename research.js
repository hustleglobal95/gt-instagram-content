/**
 * research.js, Growth Terminal inspiration bot
 * -----------------------------------------------------------------------------
 * Finds ad and post STRUCTURES worth stealing, and queues them as briefs for the
 * creative bank. It runs on a schedule so the bank keeps growing without anyone
 * sitting and scrolling.
 *
 * WHAT IT DOES NOT DO, on purpose:
 *   It never copies anyone's copy, imagery or creative into the bank. It records
 *   the ANATOMY of a layout (what sits where, what carries the emphasis, how the
 *   eye moves) plus a link back to the source. Structure is not protected, the
 *   execution is. Every brief it produces still needs GT copy written into it,
 *   which is exactly what the FORMATS in generate.js already do.
 *
 *   It also never posts. It writes to a queue. A human, or the layout author,
 *   decides what becomes a layout. Nothing reaches Instagram from this file.
 *
 * SOURCES
 *   meta      Meta Ad Library API. Live ads, currently running, by page or by
 *             search term. Uses the Meta app you already have for IG posting.
 *             Needs GT_META_TOKEN. This is the highest signal source by far,
 *             because every ad in it is one somebody is paying to run.
 *   rss       Any RSS or Atom feed. Design and marketing publications. No auth.
 *
 * USAGE
 *   node research.js --pull                 pull every configured source
 *   node research.js --pull --source meta   pull one source
 *   node research.js --review               print the queue, newest first
 *   node research.js --review --status new  filter by status
 *   node research.js --approve <id>         mark a brief as accepted
 *   node research.js --reject <id> "reason" mark a brief as rejected, with why
 *
 * OUTPUT
 *   inspiration_queue.json, an append only ledger of briefs. Nothing is deleted,
 *   so a rejected pattern never gets re-queued and re-reviewed a month later.
 */
const fs = require('fs');
const path = require('path');

const QUEUE = path.join(__dirname, 'inspiration_queue.json');
const CONFIG = path.join(__dirname, 'research.config.json');

/* ------------------------------------------------------------------ config */
const DEFAULT_CONFIG = {
  meta: {
    enabled: true,
    // Terms and pages worth watching. Competitors, adjacent categories, and
    // anyone whose creative you have admired. Add freely, this is the dial.
    searchTerms: [
      'revenue intelligence', 'growth audit', 'business diagnostic',
      'marketing analytics for agencies', 'fractional CMO'
    ],
    pageIds: [],
    countries: ['US'],
    limit: 25
  },
  rss: {
    enabled: true,
    feeds: [
      'https://www.marketingdive.com/feeds/news/',
      'https://feeds.feedburner.com/AdvertisingAge'
    ],
    limit: 15
  },
  // A brief is only worth queueing if it teaches the bank something it does not
  // already know. These are the layout names already in generate.js.
  knownLayouts: [
    'statement', 'contrast', 'stat', 'vs', 'carousel', 'card', 'quote',
    'annotated', 'funnel', 'ranked', 'trajectory', 'tweet', 'editorial',
    'feature', 'prodshot', 'prodclaim', 'prodsoon', 'edserif', 'edterminal',
    'edmanifesto', 'highlight', 'splitpanel'
  ]
};

function loadConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')) }; }
  catch { return DEFAULT_CONFIG; }
}
function loadQueue() {
  try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch { return []; }
}
function saveQueue(q) { fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2)); }

/* Stable id so the same ad never gets queued twice across runs. */
function briefId(source, key) {
  let h = 5381;
  const s = source + '|' + key;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return source.slice(0, 2) + '_' + h.toString(36);
}

/* ------------------------------------------------- structural read of an ad
 * Heuristics, deliberately. The point is not to be right every time, it is to
 * surface candidates fast enough that a human review is the bottleneck rather
 * than the discovery. Every field describes SHAPE, never borrowed wording. */
function readStructure(text, extras) {
  const t = String(text || '');
  const words = t.split(/\s+/).filter(Boolean);
  const lines = t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const firstLine = lines[0] || '';

  const signals = [];
  if (/^\s*[A-Z][A-Z\s,'"-]{8,}$/.test(firstLine)) signals.push('opens on an all caps line, shouted hook');
  if (/\d+\s*(%|x\b|k\b|days?|weeks?|hours?|minutes?)/i.test(t)) signals.push('leads with a number, concrete claim');
  if (/\?\s*$/.test(firstLine)) signals.push('opens on a question, pulls the reader in');
  if (/\b(stop|never|don't|do not|quit)\b/i.test(firstLine)) signals.push('negative command opener, pattern interrupt');
  if (lines.length >= 3 && words.length / lines.length < 9) signals.push('short stacked lines, vertical rhythm');
  if (/•|•|^\s*[-*]\s/m.test(t)) signals.push('bulleted body, scannable list');
  if (/\bvs\.?\b|\binstead of\b|\bnot\b.*\bbut\b/i.test(t)) signals.push('contrast construction, this not that');
  if (/(free|book|get|try|start|claim)\b.{0,24}(demo|trial|audit|call|today)/i.test(t)) signals.push('explicit CTA in the creative itself');

  return {
    wordCount: words.length,
    lineCount: lines.length,
    avgWordsPerLine: lines.length ? +(words.length / lines.length).toFixed(1) : 0,
    hookLength: firstLine.split(/\s+/).filter(Boolean).length,
    signals,
    hasImage: !!(extras && extras.image),
    hasVideo: !!(extras && extras.video),
    platforms: (extras && extras.platforms) || []
  };
}

/* Which existing layout does this most resemble? If none, it is genuinely new
 * and worth a brief. If it maps cleanly onto something we already have, we say
 * so, and the reviewer can skip it in two seconds. */
function nearestLayout(structure, known) {
  const s = structure.signals.join(' ');
  if (/contrast construction/.test(s)) return 'contrast';
  if (/leads with a number/.test(s) && structure.wordCount < 30) return 'stat';
  if (/bulleted body/.test(s)) return 'ranked';
  if (/short stacked lines/.test(s) && structure.wordCount < 45) return 'statement';
  if (/opens on a question/.test(s)) return 'annotated';
  if (structure.hasVideo) return null;
  return null;
}

function makeBrief(source, key, url, structure, config, note) {
  const near = nearestLayout(structure, config.knownLayouts);
  return {
    id: briefId(source, key),
    source, url,
    capturedAt: new Date().toISOString(),
    structure,
    nearestExistingLayout: near,
    novelty: near ? 'variant of ' + near : 'no close match in the bank',
    note: note || '',
    // Filled in by whoever converts the brief into a layout.
    gtAngle: '',
    status: 'new'
  };
}

/* --------------------------------------------------------------- source: meta
 * Meta Ad Library API. Every ad returned is live and being paid for, which is
 * the strongest possible signal that a structure is working for somebody. */
async function pullMeta(config) {
  const token = process.env.GT_META_TOKEN;
  if (!token) {
    console.log('meta: skipped, GT_META_TOKEN is not set');
    console.log('      the Ad Library API runs on the same Meta app as IG posting.');
    return [];
  }
  const out = [];
  const terms = config.meta.searchTerms || [];
  for (const term of terms) {
    const url = 'https://graph.facebook.com/v21.0/ads_archive'
      + '?search_terms=' + encodeURIComponent(term)
      + '&ad_reached_countries=' + JSON.stringify(config.meta.countries || ['US'])
      + '&ad_active_status=ACTIVE'
      + '&fields=' + encodeURIComponent('id,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_snapshot_url,publisher_platforms,page_name')
      + '&limit=' + (config.meta.limit || 25)
      + '&access_token=' + encodeURIComponent(token);
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (body.error) { console.log('meta: ' + term + ' -> ' + body.error.message); continue; }
      for (const ad of (body.data || [])) {
        const text = []
          .concat(ad.ad_creative_bodies || [], ad.ad_creative_link_titles || [], ad.ad_creative_link_descriptions || [])
          .join('\n');
        if (!text.trim()) continue;
        const structure = readStructure(text, { platforms: ad.publisher_platforms });
        out.push(makeBrief('meta', ad.id, ad.ad_snapshot_url || '', structure, config,
          'live ad from ' + (ad.page_name || 'unknown page') + ', found on: ' + term));
      }
      console.log('meta: ' + term + ' -> ' + (body.data || []).length + ' ads');
    } catch (e) {
      console.log('meta: ' + term + ' failed, ' + e.message);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- source: rss
 * Lower signal than live ads, but free and it catches campaign write ups where
 * somebody has already done the analysis of why a thing worked. */
async function pullRss(config) {
  const out = [];
  for (const feed of (config.rss.feeds || [])) {
    try {
      const res = await fetch(feed, { headers: { 'user-agent': 'GT-research-bot' } });
      if (!res.ok) { console.log('rss: ' + feed + ' -> HTTP ' + res.status + ', skipped'); continue; }
      const xml = await res.text();
      if (!/<(rss|feed|channel)[\s>]/i.test(xml)) {
        console.log('rss: ' + feed + ' -> response was not a feed, skipped'); continue;
      }
      const items = xml.split(/<item[\s>]|<entry[\s>]/).slice(1, (config.rss.limit || 15) + 1);
      for (const item of items) {
        const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
        const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1]
          || (item.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
        const clean = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (!clean) continue;
        const structure = readStructure(clean, {});
        out.push(makeBrief('rss', link || clean, link, structure, config, 'headline pattern from ' + feed));
      }
      console.log('rss: ' + feed + ' -> ' + items.length + ' items');
    } catch (e) {
      console.log('rss: ' + feed + ' failed, ' + e.message);
    }
  }
  return out;
}

/* --------------------------------------------------------------------- main */
(async () => {
  const args = process.argv.slice(2);
  const config = loadConfig();
  const queue = loadQueue();

  if (args.includes('--review')) {
    const sIdx = args.indexOf('--status');
    const want = sIdx >= 0 ? args[sIdx + 1] : null;
    const rows = queue.filter(b => !want || b.status === want).slice().reverse();
    console.log(rows.length + ' briefs' + (want ? ' with status ' + want : ''));
    for (const b of rows.slice(0, 40)) {
      console.log('\n' + b.id + '  [' + b.status + ']  ' + b.source);
      console.log('  novelty: ' + b.novelty);
      console.log('  shape:   ' + b.structure.lineCount + ' lines, ' + b.structure.wordCount
        + ' words, hook ' + b.structure.hookLength + ' words');
      if (b.structure.signals.length) console.log('  signals: ' + b.structure.signals.join('; '));
      if (b.note) console.log('  note:    ' + b.note);
      if (b.url) console.log('  source:  ' + b.url);
    }
    return;
  }

  const mark = (flag, status) => {
    const i = args.indexOf(flag);
    if (i < 0) return false;
    const id = args[i + 1];
    const b = queue.find(x => x.id === id);
    if (!b) { console.log('no brief with id ' + id); return true; }
    b.status = status;
    b.decidedAt = new Date().toISOString();
    if (args[i + 2]) b.decision = args[i + 2];
    saveQueue(queue);
    console.log(b.id + ' -> ' + status);
    return true;
  };
  if (mark('--approve', 'approved')) return;
  if (mark('--reject', 'rejected')) return;

  if (args.includes('--pull')) {
    const sIdx = args.indexOf('--source');
    const only = sIdx >= 0 ? args[sIdx + 1] : null;
    let found = [];
    if ((!only || only === 'meta') && config.meta.enabled) found = found.concat(await pullMeta(config));
    if ((!only || only === 'rss') && config.rss.enabled) found = found.concat(await pullRss(config));

    const seen = new Set(queue.map(b => b.id));
    const fresh = found.filter(b => !seen.has(b.id));
    // Briefs that map cleanly onto a layout we already have are recorded but
    // parked, so review time goes to the genuinely new shapes.
    fresh.forEach(b => { if (b.nearestExistingLayout) b.status = 'parked'; });
    queue.push(...fresh);
    saveQueue(queue);

    const newOnes = fresh.filter(b => b.status === 'new').length;
    console.log('\npulled ' + found.length + ', ' + fresh.length + ' new to the queue, '
      + newOnes + ' with no close match in the bank');
    console.log('review with: node research.js --review --status new');
    return;
  }

  console.log('usage: node research.js --pull | --review | --approve <id> | --reject <id> "reason"');
})();
