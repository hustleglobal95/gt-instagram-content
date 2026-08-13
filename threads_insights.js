/**
 * threads_insights.js, collect engagement for published Threads posts
 * -----------------------------------------------------------------------------
 * The image side of this repo has had collect_insights.py since the start, so
 * the dashboard could rank Instagram and Facebook creatives. Threads never had
 * an equivalent. Posts went out, ids were written to threads_posted_log.json,
 * and nothing ever asked the API how any of them did. This closes that.
 *
 * Reads  threads_posted_log.json  (written by threads_post_now.js: at, text,
 *        parts, isThread, pillar, kind, accounts, ids)
 * Writes threads_performance_log.json  (what the dashboard's Threads panel reads)
 *
 * Same credentials as the poster, so nothing new to configure:
 *   THREADS_ACCOUNTS   JSON array of {name,userId,token}
 *   GT_THREADS_LOOKBACK   how many recent posts to refresh (default 200)
 *
 * Two things worth knowing about the numbers.
 *
 * A thread's id is the id of its hook. Replies are chained onto it, so the
 * metrics here describe the whole chain as readers experienced it, which is
 * what you want when comparing a thread against a single post.
 *
 * Raw engagement flatters old posts, because they have had longer to collect
 * it. So this ranks on engagement per thousand views where views exist, and
 * falls back to raw totals where they do not, and it records which basis it
 * used so the dashboard can say so out loud rather than implying a precision
 * the data does not have.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'graph.threads.net';
const API = '/v1.0';

const POSTED_FILE = path.join(__dirname, 'threads_posted_log.json');
/* Overridable so the collector can be exercised against a stub without ever
   writing invented numbers into the file the dashboard trusts. */
const OUT_FILE = process.env.GT_THREADS_PERF_OUT || path.join(__dirname, 'threads_performance_log.json');
const LOOKBACK = parseInt(process.env.GT_THREADS_LOOKBACK || '200', 10);

/* views and shares are marked "in development" in Meta's own docs, so a token
   can fail the whole call because of one of them. Ask for everything, and on
   failure drop back to the four that have always been stable. */
const ALL_METRICS = ['views', 'likes', 'replies', 'reposts', 'quotes', 'shares'];
const CORE_METRICS = ['likes', 'replies', 'reposts', 'quotes'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(pathname, params) {
  const qs = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: HOST, path: API + pathname + '?' + qs, method: 'GET' },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json;
          try { json = JSON.parse(data); } catch { json = { raw: data }; }
          if (res.statusCode >= 200 && res.statusCode < 300 && !json.error) resolve(json);
          else reject(new Error(json.error ? json.error.message : `HTTP ${res.statusCode}`));
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/* The insights payload is a list of named metrics, each carrying a values
   array. Flatten it to a plain object and treat anything missing as absent
   rather than as zero, because "the API did not tell us" and "nobody liked
   it" are different facts and only one of them should be averaged. */
function flatten(payload) {
  const out = {};
  for (const m of (payload && payload.data) || []) {
    const v = m && m.values && m.values[0];
    if (v && typeof v.value === 'number') out[m.name] = v.value;
    else if (typeof m.total_value === 'object' && m.total_value && typeof m.total_value.value === 'number') out[m.name] = m.total_value.value;
  }
  return out;
}

async function metricsFor(mediaId, token, errors) {
  try {
    return { m: flatten(await getJson(`/${mediaId}/insights`, { metric: ALL_METRICS.join(','), access_token: token })), full: true };
  } catch (e) {
    try {
      const m = flatten(await getJson(`/${mediaId}/insights`, { metric: CORE_METRICS.join(','), access_token: token }));
      errors.push({ mediaId, message: 'reduced metric set: ' + e.message });
      return { m, full: false };
    } catch (e2) {
      errors.push({ mediaId, message: e2.message });
      return null;
    }
  }
}

async function permalinkFor(mediaId, token) {
  try {
    const r = await getJson(`/${mediaId}`, { fields: 'permalink', access_token: token });
    return r.permalink || '';
  } catch { return ''; }
}

const INTERACTIONS = ['likes', 'replies', 'reposts', 'quotes', 'shares'];
const sum = (m, keys) => keys.reduce((n, k) => n + (typeof m[k] === 'number' ? m[k] : 0), 0);

/* Group a list of scored posts by a field and rank the groups. A group is only
   comparable on an average, never on a total, or the pillar that simply got
   posted most often always wins. */
function group(posts, field) {
  const by = new Map();
  for (const p of posts) {
    const k = p[field] || 'unknown';
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(p);
  }
  return [...by.entries()].map(([key, list]) => {
    const withViews = list.filter((p) => typeof p.views === 'number' && p.views > 0);
    return {
      key,
      posts: list.length,
      engagement: list.reduce((n, p) => n + p.engagement, 0),
      avg_engagement: +(list.reduce((n, p) => n + p.engagement, 0) / list.length).toFixed(2),
      views: withViews.reduce((n, p) => n + p.views, 0),
      avg_per_1k: withViews.length
        ? +(withViews.reduce((n, p) => n + p.per_1k, 0) / withViews.length).toFixed(2)
        : null,
    };
  }).sort((a, b) => (b.avg_per_1k ?? -1) - (a.avg_per_1k ?? -1) || b.avg_engagement - a.avg_engagement);
}

async function main() {
  const raw = process.env.THREADS_ACCOUNTS;
  if (!raw) throw new Error('THREADS_ACCOUNTS env var is not set (JSON array of {name,userId,token}).');
  let accounts;
  try { accounts = JSON.parse(raw); } catch { throw new Error('THREADS_ACCOUNTS is not valid JSON.'); }
  const tokenOf = new Map(accounts.map((a) => [a.name, a.token]));

  let log = [];
  try { log = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8')); } catch { log = []; }
  const recent = log.slice(-LOOKBACK);

  const errors = [];
  let attempted = 0, succeeded = 0, reduced = 0;
  const posts = [];

  for (const rec of recent) {
    const ids = rec.ids || {};
    const totals = {};
    let any = false, full = true;
    let permalink = '';

    for (const [acct, mediaId] of Object.entries(ids)) {
      const token = tokenOf.get(acct);
      if (!token || !mediaId) continue;
      attempted++;
      const got = await metricsFor(mediaId, token, errors);
      await sleep(120);
      if (!got) continue;
      succeeded++;
      if (!got.full) full = false;
      any = true;
      for (const [k, v] of Object.entries(got.m)) totals[k] = (totals[k] || 0) + v;
      if (!permalink) permalink = await permalinkFor(mediaId, token);
    }

    if (!any) continue;
    if (!full) reduced++;

    const engagement = sum(totals, INTERACTIONS);
    const views = typeof totals.views === 'number' ? totals.views : null;
    posts.push({
      at: rec.at,
      pillar: rec.pillar || 'unknown',
      kind: rec.kind || 'unknown',
      isThread: !!rec.isThread,
      parts: Array.isArray(rec.parts) ? rec.parts.length : 1,
      text: String(rec.text || '').slice(0, 240),
      accounts: Object.keys(ids),
      permalink,
      metrics: totals,
      views,
      engagement,
      /* engagement per thousand views: the only comparison that is fair
         between a post from last week and one from this morning. */
      per_1k: views && views > 0 ? +((engagement / views) * 1000).toFixed(2) : null,
      basis: views && views > 0 ? 'per_1k' : 'total',
    });
  }

  const ranked = [...posts].sort((a, b) =>
    (b.per_1k ?? -1) - (a.per_1k ?? -1) || b.engagement - a.engagement || String(b.at).localeCompare(String(a.at)));

  const out = {
    updated: new Date().toISOString(),
    count: posts.length,
    /* If no post came back with a views number, every ranking in this file is
       a raw total and therefore biased towards whatever has been up longest.
       The dashboard reads this flag and says so instead of pretending. */
    ranking_basis: posts.some((p) => p.basis === 'per_1k') ? 'per_1k' : 'total',
    top: ranked.slice(0, 10),
    posts: ranked,
    by_pillar: group(posts, 'pillar'),
    by_kind: group(posts, 'kind'),
    by_shape: group(posts.map((p) => ({ ...p, shape: p.isThread ? 'thread' : 'single' })), 'shape'),
    collection: { attempted, succeeded, reduced_metric_set: reduced, errors: errors.slice(0, 40) },
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`Threads insights: ${succeeded}/${attempted} media fetched across ${posts.length} posts.`);
  console.log(`Ranking basis: ${out.ranking_basis}${out.ranking_basis === 'total' ? ' (no view counts returned, older posts will look better than they are)' : ''}`);
  if (errors.length) console.log(`${errors.length} error(s), first: ${errors[0].message}`);
  for (const p of out.top.slice(0, 5)) {
    console.log(`  ${p.per_1k !== null ? p.per_1k + '/1k' : p.engagement + ' total'}  ${p.pillar}/${p.kind}  ${p.text.split('\n')[0].slice(0, 60)}`);
  }
}

module.exports = { group, flatten, sum, INTERACTIONS, main };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
