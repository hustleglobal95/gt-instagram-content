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
 *   GT_THREADS_MAX_MEDIA    media to pull per edge per account (default 400)
 *   GT_THREADS_WINDOW_DAYS  window for the account level cross check (default 30)
 *
 * Three things worth knowing about the numbers.
 *
 * A thread's id is the id of its hook, and for a long time this file measured
 * only that hook. Every chained part after it is its own media with its own
 * views, so a six part thread was being counted as one sixth of itself. The
 * collector now enumerates media from the API rather than trusting the local
 * posted log, and folds each chain part back into the post it belongs to.
 *
 * It also asks the account level endpoint what the platform thinks the account
 * got over the same window, and writes that number next to the summed one. If
 * the two disagree, the file says so. A collector that quietly measures a
 * fraction of an account is worse than no collector, because the learning loop
 * believes it.
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
/* How much media to pull per edge per account. Threads chains mean the reply
   edge is several times larger than the post edge, so this is generous. */
const MAX_MEDIA = parseInt(process.env.GT_THREADS_MAX_MEDIA || '400', 10);
/* Window for the account level cross check. The endpoint defaults to two days
   if you omit since and until, which is not a useful comparison. */
const WINDOW_DAYS = parseInt(process.env.GT_THREADS_WINDOW_DAYS || '30', 10);

/* Engagement per thousand views stops meaning anything when the views are in
   single figures. The first real run proved it: a post with three views and
   four interactions scored 1333 per 1k and topped the chart, which is a
   division artifact, not a finding. Anything under this many views is still
   counted in every total, but it is ranked on raw interactions and flagged, so
   noise cannot outrank reach. */
const MIN_VIEWS_FOR_RATE = parseInt(process.env.GT_THREADS_MIN_VIEWS || '25', 10);

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

/* Walk a paged edge until it runs out or we hit the cap. The old collector
   read threads_posted_log.json instead, which meant anything the log did not
   know about, a post made by hand, a post from the backup workflow, every
   chained part of every thread, was invisible to it. */
async function allPages(pathname, params, max, errors, label) {
  const out = [];
  let after = null;
  for (let page = 0; page < 40 && out.length < max; page++) {
    try {
      const q = { ...params, limit: 100 };
      if (after) q.after = after;
      const r = await getJson(pathname, q);
      const batch = r.data || [];
      out.push(...batch);
      after = r.paging && r.paging.cursors && r.paging.cursors.after;
      if (!after || !batch.length) break;
      await sleep(150);
    } catch (e) {
      errors.push({ mediaId: label || pathname, message: `${label || pathname} page ${page}: ${e.message}` });
      break;
    }
  }
  return out.slice(0, max);
}

const MEDIA_FIELDS = 'id,timestamp,text,media_type,is_quote_post';
const REPLY_FIELDS = 'id,timestamp,text,media_type,root_post,replied_to,is_reply_owned_by_me';

/* Everything this account has published: its own posts, and its own replies,
   which is where the chained parts of every thread actually live. */
async function enumerateMedia(account, max, errors) {
  const { userId, token } = account;
  const posts = await allPages(`/${userId}/threads`,
    { fields: MEDIA_FIELDS, access_token: token }, max, errors, `${account.name} threads`);
  const replies = await allPages(`/${userId}/replies`,
    { fields: REPLY_FIELDS, access_token: token }, max, errors, `${account.name} replies`);
  return { posts, replies };
}

/* What the platform says the account got, so the summed figure has something
   to be checked against instead of being taken on faith. */
async function accountInsights(account, sinceUnix, errors) {
  const metrics = ['views', 'likes', 'replies', 'reposts', 'quotes', 'followers_count'];
  const params = { metric: metrics.join(','), access_token: account.token };
  if (sinceUnix) { params.since = sinceUnix; params.until = Math.floor(Date.now() / 1000); }
  try {
    return flatten(await getJson(`/${account.userId}/threads_insights`, params));
  } catch (e) {
    errors.push({ mediaId: `${account.name} account insights`, message: e.message });
    return null;
  }
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
    const withViews = list.filter((p) => p.rateReliable);
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

  /* Metadata the API does not carry: which pillar a post belongs to, which
     shape it was written as. That lives in the local posted log, so the log is
     still read, but only to decorate media the API reported. It is no longer
     the list of what exists. */
  let log = [];
  try { log = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8')); } catch { log = []; }
  const metaById = new Map();
  for (const rec of log) {
    for (const id of Object.values(rec.ids || {})) {
      if (id) metaById.set(String(id), rec);
    }
  }

  const errors = [];
  let attempted = 0, succeeded = 0, reduced = 0;

  const units = [];          // one entry per piece of content: a single post, or a whole thread
  const outboundReplies = [];  // replies to other people, which are outreach, not content
  const platform = {};
  let apiPosts = 0, apiReplies = 0;

  const sinceUnix = WINDOW_DAYS > 0
    ? Math.max(1712991600, Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400)
    : null;

  for (const account of accounts) {
    if (!account || !account.userId || !account.token) continue;

    const acct = await accountInsights(account, sinceUnix, errors);
    if (acct) platform[account.name || account.userId] = acct;

    const { posts, replies } = await enumerateMedia(account, MAX_MEDIA, errors);
    apiPosts += posts.length;
    apiReplies += replies.length;

    const ownPostIds = new Set(posts.map((p) => String(p.id)));

    /* A chained thread part is published as a reply to our own hook, so it
       lands in the replies edge, not the posts edge. That is exactly why it
       was never being counted. */
    const chainsByRoot = new Map();
    for (const r of replies) {
      const rootId = r.root_post && r.root_post.id ? String(r.root_post.id) : null;
      if (rootId && ownPostIds.has(rootId)) {
        if (!chainsByRoot.has(rootId)) chainsByRoot.set(rootId, []);
        chainsByRoot.get(rootId).push(r);
      } else {
        outboundReplies.push({ account: account.name, id: String(r.id), at: r.timestamp, rootId });
      }
    }

    for (const post of posts) {
      const id = String(post.id);
      const chain = chainsByRoot.get(id) || [];
      const members = [post, ...chain];

      const totals = {};
      let any = false, full = true, measured = 0;

      for (const media of members) {
        attempted++;
        const got = await metricsFor(media.id, account.token, errors);
        await sleep(120);
        if (!got) continue;
        succeeded++;
        measured++;
        if (!got.full) full = false;
        any = true;
        for (const [k, v] of Object.entries(got.m)) totals[k] = (totals[k] || 0) + v;
      }

      if (!any) continue;
      if (!full) reduced++;

      const rec = metaById.get(id) || {};
      const engagement = sum(totals, INTERACTIONS);
      const views = typeof totals.views === 'number' ? totals.views : null;

      units.push({
        at: post.timestamp || rec.at || null,
        pillar: rec.pillar || 'unknown',
        kind: rec.kind || 'unknown',
        isThread: chain.length > 0 || !!rec.isThread,
        parts: members.length,
        parts_measured: measured,
        /* Whether the local log knew this post existed at all. Anything false
           here was going out without ever being learned from. */
        in_posted_log: metaById.has(id),
        text: String(post.text || rec.text || '').slice(0, 240),
        accounts: [account.name],
        permalink: await permalinkFor(post.id, account.token),
        metrics: totals,
        views,
        engagement,
        per_1k: views && views > 0 ? +((engagement / views) * 1000).toFixed(2) : null,
        rateReliable: typeof views === 'number' && views >= MIN_VIEWS_FOR_RATE,
        basis: views && views >= MIN_VIEWS_FOR_RATE ? 'per_1k' : 'total',
      });
      await sleep(60);
    }
  }

  const posts = units;

  const ranked = [...posts].sort((a, b) => {
    if (a.rateReliable !== b.rateReliable) return a.rateReliable ? -1 : 1;
    if (a.rateReliable) return (b.per_1k ?? -1) - (a.per_1k ?? -1) || b.engagement - a.engagement;
    return b.engagement - a.engagement || (b.views ?? 0) - (a.views ?? 0);
  });

  const summedViews = posts.reduce((n, p) => n + (p.views || 0), 0);
  const platformViews = Object.values(platform)
    .reduce((n, m) => n + (typeof m.views === 'number' ? m.views : 0), 0);

  const out = {
    updated: new Date().toISOString(),
    count: posts.length,
    ranking_basis: posts.some((p) => p.basis === 'per_1k') ? 'per_1k' : 'total',
    min_views_for_rate: MIN_VIEWS_FOR_RATE,
    rate_eligible: posts.filter((p) => p.rateReliable).length,
    reach: {
      views: summedViews,
      interactions: posts.reduce((n, p) => n + p.engagement, 0),
      median_views: (() => {
        const v = posts.map((p) => p.views || 0).sort((a, b) => a - b);
        if (!v.length) return 0;
        return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
      })(),
      zero_interaction_posts: posts.filter((p) => p.engagement === 0).length,
    },
    /* The honesty block. summed is what this file measured, platform is what
       the account level endpoint reports for the same window. A ratio far from
       1 means the collector is still blind to something, and every ranking
       below is drawn from a sample rather than the account. */
    coverage: {
      window_days: WINDOW_DAYS,
      media_from_api: { posts: apiPosts, replies: apiReplies },
      content_units: posts.length,
      media_measured: succeeded,
      chain_parts_folded_in: posts.reduce((n, p) => n + Math.max(0, p.parts - 1), 0),
      posts_missing_from_local_log: posts.filter((p) => !p.in_posted_log).length,
      outbound_replies: outboundReplies.length,
      summed_views: summedViews,
      platform_views: platformViews || null,
      ratio: platformViews ? +(summedViews / platformViews).toFixed(3) : null,
    },
    platform,
    top: ranked.slice(0, 10),
    posts: ranked,
    by_pillar: group(posts, 'pillar'),
    by_kind: group(posts, 'kind'),
    by_shape: group(posts.map((p) => ({ ...p, shape: p.isThread ? 'thread' : 'single' })), 'shape'),
    collection: { attempted, succeeded, reduced_metric_set: reduced, errors: errors.slice(0, 40) },
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`Threads insights: ${succeeded}/${attempted} media fetched across ${posts.length} pieces of content.`);
  console.log(`From the API: ${apiPosts} posts, ${apiReplies} replies. ${out.coverage.chain_parts_folded_in} chain parts folded into their posts, ${outboundReplies.length} replies to other people set aside.`);
  console.log(`${out.coverage.posts_missing_from_local_log} post(s) the local posted log did not know about.`);
  if (platformViews) {
    console.log(`Coverage: measured ${summedViews} views against ${platformViews} reported by the platform, ratio ${out.coverage.ratio}.`);
  } else {
    console.log(`Coverage: measured ${summedViews} views. The account level endpoint returned nothing, so there is no cross check this run.`);
  }
  console.log(`Ranking basis: ${out.ranking_basis}. ${out.rate_eligible} of ${posts.length} cleared ${MIN_VIEWS_FOR_RATE} views and are ranked on rate.`);
  if (errors.length) console.log(`${errors.length} error(s), first: ${errors[0].message}`);
  for (const p of out.top.slice(0, 5)) {
    console.log(`  ${p.per_1k !== null ? p.per_1k + '/1k' : p.engagement + ' total'}  ${p.pillar}/${p.kind}  ${p.text.split('\n')[0].slice(0, 60)}`);
  }
}

module.exports = { group, flatten, sum, INTERACTIONS, main };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
