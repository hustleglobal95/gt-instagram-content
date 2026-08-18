/**
 * threads_learn.js, weights follow results instead of my assumptions
 * -----------------------------------------------------------------------------
 * threads_insights.js has been writing threads_performance_log.json every day.
 * Nothing has ever read it. Every weight in the rotation was set by hand from
 * research and from one 78 post sample, and then frozen.
 *
 * This reads it and returns multipliers per kind and per shape.
 *
 * THE HONEST LIMITS, because a learning loop that overclaims is worse than none.
 *
 *   1. It refuses to act on thin data. Under MIN_POSTS_PER_KIND observations a
 *      kind keeps its hand set weight. Reweighting on four posts is noise
 *      laundering, not learning.
 *   2. Multipliers are clamped to [MIN_MULT, MAX_MULT]. One viral post cannot
 *      capture the entire rotation, and one dud cannot delete a format.
 *   3. It prefers engagement per thousand views. Raw totals flatter whatever
 *      has been up longest, and the log flags which basis it used.
 *   4. It moves gradually. Each run steps a fraction of the way toward the
 *      target rather than jumping, so a single odd week does not whipsaw the
 *      account.
 *
 * If the file is missing, unreadable, or too thin, `active` comes back false
 * and the caller keeps its existing weights. Failing closed is the point.
 */

const fs = require('fs');
const path = require('path');

const PERF = process.env.GT_THREADS_PERF_IN || path.join(__dirname, 'threads_performance_log.json');

const MIN_POSTS_PER_KIND = 8;   // below this, do not touch the weight
const MIN_KINDS = 3;            // need a few groups to compare against each other
const MIN_MULT = 0.5;           // never delete a format outright
const MAX_MULT = 2.0;           // never let one winner take the whole rotation
const STEP = 0.34;              // fraction of the way to target, per run

function readPerf(file = PERF) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/* Score a group. Prefer rate, fall back to average engagement, and say which. */
function scoreOf(row, basis) {
  if (basis === 'per_1k' && typeof row.avg_per_1k === 'number') return row.avg_per_1k;
  return row.avg_engagement;
}

/**
 * @returns {{active:boolean, reason?:string, basis?:string, byKind:Object, byShape:Object, detail?:Array}}
 */
function weights(opts = {}) {
  const perf = opts.perf || readPerf(opts.file);
  if (!perf) return { active: false, reason: 'threads_performance_log.json not found or unreadable', byKind: {}, byShape: {} };

  const basis = perf.ranking_basis === 'per_1k' ? 'per_1k' : 'total';
  const kinds = (perf.by_kind || []).filter((r) => r.posts >= MIN_POSTS_PER_KIND);
  if (kinds.length < MIN_KINDS) {
    return {
      active: false,
      reason: `only ${kinds.length} kind(s) have ${MIN_POSTS_PER_KIND}+ posts, need ${MIN_KINDS}. Keeping hand set weights.`,
      basis, byKind: {}, byShape: {},
    };
  }

  const scores = kinds.map((r) => ({ key: r.key, posts: r.posts, score: scoreOf(r, basis) }))
                      .filter((r) => typeof r.score === 'number' && isFinite(r.score));
  if (scores.length < MIN_KINDS) {
    return { active: false, reason: 'not enough scoreable kinds', basis, byKind: {}, byShape: {} };
  }

  const mean = scores.reduce((n, r) => n + r.score, 0) / scores.length;
  if (!(mean > 0)) return { active: false, reason: 'mean engagement is zero, nothing to learn from', basis, byKind: {}, byShape: {} };

  const clamp = (x) => Math.max(MIN_MULT, Math.min(MAX_MULT, x));
  const byKind = {}, detail = [];
  for (const r of scores) {
    const target = clamp(r.score / mean);
    // step from 1.0 toward target rather than jumping to it
    const mult = +(1 + (target - 1) * STEP).toFixed(3);
    byKind[r.key] = mult;
    detail.push({ key: r.key, posts: r.posts, score: +r.score.toFixed(2), vsMean: +(r.score / mean).toFixed(2), multiplier: mult });
  }

  const byShape = {};
  for (const r of (perf.by_shape || [])) {
    if (r.posts < MIN_POSTS_PER_KIND) continue;
    const s = scoreOf(r, basis);
    if (typeof s !== 'number' || !isFinite(s)) continue;
    byShape[r.key] = s;
  }
  // convert shape scores to multipliers against their own mean
  const shapeVals = Object.values(byShape);
  if (shapeVals.length >= 2) {
    const sm = shapeVals.reduce((a, b) => a + b, 0) / shapeVals.length;
    for (const k of Object.keys(byShape)) {
      byShape[k] = sm > 0 ? +(1 + (clamp(byShape[k] / sm) - 1) * STEP).toFixed(3) : 1;
    }
  } else {
    for (const k of Object.keys(byShape)) byShape[k] = 1;
  }

  detail.sort((a, b) => b.multiplier - a.multiplier);
  return { active: true, basis, byKind, byShape, detail, sampleKinds: scores.length };
}

module.exports = { weights, readPerf, MIN_POSTS_PER_KIND, MIN_MULT, MAX_MULT, STEP };

if (require.main === module) {
  const w = weights();
  if (!w.active) {
    console.log('learning inactive: ' + w.reason);
    console.log('The rotation keeps its hand set weights. This is the expected state until the account has real reply data.');
  } else {
    console.log(`learning active, ranked on ${w.basis}, ${w.sampleKinds} kinds\n`);
    for (const d of w.detail) {
      console.log(`  ${String(d.key).padEnd(14)} ${String(d.posts).padStart(4)} posts  score ${String(d.score).padStart(7)}  ${d.vsMean}x mean  ->  weight x${d.multiplier}`);
    }
    console.log('\nshape:', JSON.stringify(w.byShape));
  }
}
