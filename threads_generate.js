/**
 * threads_generate.js, pick fresh, non-repeating Growth Terminal Threads posts
 * -----------------------------------------------------------------------------
 * Mirrors your image autoposter: rotate through the bank, never repeat (tracked
 * in threads_used_log.json), enforce Threads rules (<=500 chars).
 *
 * As a library:  const { generate } = require('./threads_generate'); generate(1)
 * As a CLI:      node threads_generate.js 30        (30 posts to stdout)
 *                node threads_generate.js 1 --json  ({text,pillar,kind,chars})
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FORMATS, THREADS } = require('./threads_bank');
const COMMUNITY = require('./threads_community');
const { guardThread } = require('./threads_guard');
const COMPOSE = require('./threads_compose');
const LEARN = require('./threads_learn');
const { AUDIENCES, OFFER_POLICY } = require('./threads_kb');

/* The pool is weighted, not uniform, and the weights come from the account's
 * own log rather than from taste.
 *
 * Two findings drive this.
 *
 * MULTI-PART THREADS PULL 5.7x THE REACH OF SINGLES HERE. Across 78 posts the
 * median for a thread is 63 views and the median for a single post is 11. The
 * old rotation had singles outnumbering threads five to one, which is exactly
 * backwards. Threads are now weighted to roughly a third of every draw, so at
 * three posts a day at least one is a thread most days.
 *
 * THE COMMUNITY BANK OUTRANKS THE DIRECT RESPONSE BANK. threads_bank.js was
 * built on ad structures. They do not start conversations and Threads throttles
 * the combative ones. threads_community.js is built for replies and saves, so
 * it carries the majority of the rotation. The old bank is kept, not deleted:
 * some of it is genuinely useful and nothing here has enough measured evidence
 * yet to justify destroying work.
 *
 * When the reply data can support a ranking, this block is the one to replace
 * with something that reads threads_performance_log.json. */

const BRAND_SINGLES = FORMATS.filter((f) => !f.thread);
const BRAND_THREADS = THREADS || [];
const COMM_SINGLES = COMMUNITY.FORMATS.filter((f) => !f.thread);
const COMM_THREADS = COMMUNITY.THREADS || [];

const rep = (arr, n) => [].concat(...Array.from({ length: n }, () => arr));

/* Weights. The old direct response bank used to be 73 percent of the rotation,
 * which is the material that reads as cringe, and none of it points at a
 * product. It is now a minority and the audience copy leads.
 *
 * Two measured facts drive the shape.
 *
 * THREADS PULL 5.7x THE REACH OF SINGLES HERE. Median 63 views against 11
 * across 78 posts. Threads are about 43 percent of the draw, so at three posts
 * a day roughly one a day is a thread.
 *
 * PRODUCT LINKS LAND AT ABOUT ONE POST IN FOUR. High enough that the account is
 * visibly selling the guides, low enough that the other three are worth
 * following for on their own. The ladder and offer formats plus seven of the
 * twelve threads carry a link.
 *
 * The old bank is kept in the repo, not deleted. Some of it is useful and the
 * markus voice singles still earn their place. When threads_performance_log.json
 * has enough replies to rank on, replace this block with something that reads it. */

const byKind = (k) => COMM_SINGLES.filter((f) => f.kind === k);

/* ---------------------------------------------------------------------------
   THE POOL

   Three sources now, in descending share:

   1. COMPOSED. threads_compose.js assembles posts from knowledge base atoms,
      so it does not run out. 5,265 distinct posts against the 89 hand written
      ones, and it is the only source that scales.
   2. The hand written community bank. Still the best individual copy in the
      repo, kept at real weight.
   3. The old direct response bank, at the back, mostly for its threads.

   Offers are capped by OFFER_POLICY rather than by feel, and the cap is
   asserted in the CLI below so it cannot drift.
   --------------------------------------------------------------------------- */

const AUD_KEYS = Object.keys(AUDIENCES);

/* A composer entry looks like a bank format to the rest of the file: it has a
 * pillar, a kind, and a render() or thread(). The difference is that it makes
 * a new post each call instead of returning a stored one. */
const composedSingle = (aud, offer) => ({
  pillar: AUDIENCES[aud].pillar,
  kind: offer ? 'offer' : aud,
  voice: 'markus',
  composed: true,
  render: () => COMPOSE.composeSingle(aud, { offer }).text,
});

const composedThread = (aud, offer) => ({
  pillar: AUDIENCES[aud].pillar,
  kind: 'thread',
  voice: 'markus',
  composed: true,
  thread: () => COMPOSE.composeThread(aud, { offer }).parts,
});

const COMPOSED = [
  ...rep(AUD_KEYS.map((a) => composedSingle(a, false)), 7),
  ...rep(AUD_KEYS.map((a) => composedThread(a, false)), 3),
  ...rep(AUD_KEYS.map((a) => composedSingle(a, true)), 4),
  ...AUD_KEYS.map((a) => composedThread(a, true)),
];

const BASE_POOL = [
  ...COMPOSED,
  ...rep(byKind('founders'), 3),
  ...rep(byKind('building'), 3),
  ...rep(byKind('tampa'), 3),
  ...rep(byKind('ai'), 3),
  ...rep(byKind('sell_online'), 3),
  ...rep(byKind('ladder'), 2),
  ...rep(byKind('offer'), 2),
  ...COMM_THREADS,
  ...BRAND_THREADS,
  ...FORMATS.filter((f) => f.voice === 'markus' && !f.thread),
];

/* Apply what the account has actually measured. Inactive until there is enough
 * data, in which case this is the identity function and the hand set weights
 * above stand. Never silently: the reason is exposed on POOL_INFO. */
function applyLearning(base) {
  const w = LEARN.weights();
  if (!w.active) return { pool: base, learning: w };
  const out = [];
  for (const f of base) {
    const km = w.byKind[f.kind] ?? 1;
    const sm = w.byShape[f.thread ? 'thread' : 'single'] ?? 1;
    const copies = Math.max(1, Math.round(km * sm));
    for (let i = 0; i < copies; i++) out.push(f);
  }
  return { pool: out, learning: w };
}

const { pool: POOL, learning: LEARNING } = applyLearning(BASE_POOL);

const POOL_INFO = {
  size: POOL.length,
  composedShare: +(POOL.filter((f) => f.composed).length / POOL.length).toFixed(3),
  threadShare: +(POOL.filter((f) => f.thread).length / POOL.length).toFixed(3),
  offerShare: +(POOL.filter((f) => f.kind === 'offer').length / POOL.length).toFixed(3),
  learningActive: LEARNING.active,
  learningReason: LEARNING.reason || null,
};

const MAX_CHARS = 500;
const LOG = path.join(__dirname, 'threads_used_log.json'); // namespaced: won't clash with image autoposter's used_log.json

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const hash = (s) => crypto.createHash('sha1').update(norm(s)).digest('hex').slice(0, 12);

function loadUsed() {
  try { return new Set(JSON.parse(fs.readFileSync(LOG, 'utf8'))); } catch { return new Set(); }
}
function saveUsed(set) {
  fs.writeFileSync(LOG, JSON.stringify([...set], null, 0));
}

function nextPost(used, sessionSeen) {
  const order = [...POOL].sort(() => Math.random() - 0.5);
  for (const fmt of order) {
    for (let attempt = 0; attempt < 6; attempt++) {
      // single-post formats expose render(); thread formats expose thread() -> [hook, ...replies]
      const raw = (fmt.thread ? fmt.thread() : [fmt.render()]).map((s) => s.trim());

      /* The text gate. Nothing reached this file before it, which is how em
       * dashes, a down arrow and a "Save this. Follow for the rest" CTA all
       * shipped to a live account. guardThread() silently normalises what is
       * safe to fix and refuses anything that needs a judgement call. A refusal
       * is not an error: the loop simply draws again. */
      const gate = guardThread(raw);
      if (!gate.ok) {
        if (process.env.THREADS_GUARD_VERBOSE === '1') {
          process.stderr.write(`guard skipped ${fmt.pillar}/${fmt.kind || 'thread'}: ` +
            gate.failures.map((f) => `${f.id}("${f.matched}")`).join(', ') + '\n');
        }
        continue;
      }
      const parts = gate.parts;

      if (parts.some((p) => p.length === 0 || p.length > MAX_CHARS)) continue; // every part must fit
      const h = hash(parts.join('\n\n'));
      if (used.has(h) || sessionSeen.has(h)) continue;

      /* Hook level dedupe as well as whole post. Some formats in the old bank
       * reuse an opening line with a different body, which passes the full hash
       * but reads to a follower as the same post again. The hook is the only
       * part most people see, so it gets its own key. */
      const hh = 'k' + hash(parts[0]);
      if (used.has(hh) || sessionSeen.has(hh)) continue;
      const chars = parts.reduce((n, p) => n + p.length, 0);
      return { text: parts[0], parts, isThread: parts.length > 1, pillar: fmt.pillar, kind: fmt.kind, chars, hash: h, hookHash: hh };
    }
  }
  return null; // bank exhausted, add formats or clear threads_used_log.json
}

/**
 * Generate `n` fresh posts and record them as used (so future runs don't repeat).
 * Returns [] if the bank is exhausted for now.
 */
function generate(n = 1) {
  const used = loadUsed();
  const seen = new Set();
  const posts = [];
  for (let i = 0; i < n; i++) {
    const p = nextPost(used, seen);
    if (!p) break;
    seen.add(p.hash);
    used.add(p.hash);
    seen.add(p.hookHash);
    used.add(p.hookHash);
    posts.push(p);
  }
  saveUsed(used);
  return posts;
}

module.exports = { generate, POOL_INFO, LEARNING };

// -------- CLI --------
if (require.main === module) {
  const n = parseInt(process.argv[2] || '1', 10);
  const asJson = process.argv.includes('--json');
  const posts = generate(n);
  if (asJson) {
    process.stdout.write(JSON.stringify(n === 1 ? posts[0] : posts, null, 2) + '\n');
  } else if (!posts.length) {
    process.stdout.write('No fresh posts, add formats to threads_bank.js or clear threads_used_log.json.\n');
  } else {
    posts.forEach((p, i) => {
      const tag = p.isThread ? `THREAD ${p.parts.length} parts` : `${p.chars} chars`;
      process.stdout.write(`\n──── Post ${i + 1}  ·  ${p.pillar}/${p.kind}  ·  ${tag} ────\n`);
      if (p.isThread) p.parts.forEach((part, j) => process.stdout.write(`${j ? '\n   ↳ reply ' + j + ':\n' : ''}${part}\n`));
      else process.stdout.write(`${p.text}\n`);
    });
  }
}
