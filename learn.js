/**
 * learn.js, closes the loop between what got posted and what gets generated.
 * -----------------------------------------------------------------------------
 * collect_insights.py already pulls engagement and rolls it up by layout into
 * performance_log.json. Nothing read that file. This does, and turns it into
 * layout_weights.json, which generate.js consults when picking a generator.
 *
 * THE IMPORTANT PART: it refuses to learn from data that cannot support a
 * conclusion. Reweighting a rotation on a handful of interactions does not
 * make the account better, it makes it confidently worse, and it does it in a
 * way nobody notices for weeks. So there are gates, and when a gate fails the
 * weights are left exactly as they are and the reason is written down.
 *
 * Gates, all must pass:
 *   1. Collection health. If Instagram lookups are failing, every IG format
 *      reads as zero and the ranking is garbage. Refuse.
 *   2. Total signal. Under MIN_TOTAL_ENGAGEMENT interactions across the whole
 *      dataset, format differences are noise. Refuse.
 *   3. Per format sample. A layout needs MIN_POSTS before its average means
 *      anything. Layouts under that keep their current weight.
 *
 * Usage:
 *   node learn.js            evaluate and write layout_weights.json
 *   node learn.js --explain  print the reasoning without writing
 */
const fs = require('fs');
const path = require('path');

const PERF = path.join(__dirname, 'performance_log.json');
const OUT = path.join(__dirname, 'layout_weights.json');

/* Deliberately conservative. Raise them, never lower them. */
const MIN_TOTAL_ENGAGEMENT = 100;  // across every format combined
const MIN_POSTS_PER_FORMAT = 8;    // before a format's average is trusted
const MAX_WEIGHT = 4;              // no format may dominate the rotation
const MIN_WEIGHT = 1;              // every format keeps a chance to recover

function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function evaluate() {
  const perf = read(PERF, null);
  if (!perf) return { active: false, reason: 'performance_log.json not found or unreadable' };

  const rows = Array.isArray(perf.by_format) ? perf.by_format : [];
  if (!rows.length) return { active: false, reason: 'performance_log.json has no by_format rows' };

  const totalEngagement = rows.reduce((n, r) => n + (r.engagement || 0), 0);
  const totalPosts = rows.reduce((n, r) => n + (r.posts || 0), 0);
  const igEngagement = rows.reduce((n, r) => n + (r.ig_engagement || 0), 0);
  const fbEngagement = rows.reduce((n, r) => n + (r.fb_engagement || 0), 0);

  const health = perf.collection || null;
  const diagnostics = {
    totalPosts, totalEngagement, igEngagement, fbEngagement,
    formats: rows.length,
    formatsWithAnyEngagement: rows.filter(r => (r.engagement || 0) > 0).length,
    collectionHealth: health
  };

  /* Gate 1, collection health. */
  if (health && health.ig_attempted > 0 && health.ig_succeeded === 0) {
    return { active: false, diagnostics,
      reason: 'Instagram collection is failing. ' + health.ig_error_count
        + ' lookups errored and none succeeded, so every Instagram format reads as zero. '
        + 'Fix collection before any weighting decision is made.' };
  }
  if (!health && igEngagement === 0 && totalPosts > 20) {
    return { active: false, diagnostics,
      reason: 'Instagram engagement is zero across ' + totalPosts + ' posts and this file carries '
        + 'no collection health block, so a total collection failure cannot be distinguished from '
        + 'genuine zero engagement. Re-run collect_insights.py after its patch, then look again.' };
  }

  /* Gate 2, is there enough signal to rank anything. */
  if (totalEngagement < MIN_TOTAL_ENGAGEMENT) {
    return { active: false, diagnostics,
      reason: 'Only ' + totalEngagement + ' total interactions across ' + totalPosts
        + ' posts. Under ' + MIN_TOTAL_ENGAGEMENT + ' the gaps between formats are noise, not ranking. '
        + 'The bottleneck here is distribution, not creative format, and reweighting the rotation '
        + 'would optimise against randomness.' };
  }

  /* Gates passed. Score only formats with a real sample. */
  const scored = rows.filter(r => (r.posts || 0) >= MIN_POSTS_PER_FORMAT);
  if (scored.length < 3) {
    return { active: false, diagnostics,
      reason: 'Only ' + scored.length + ' formats have at least ' + MIN_POSTS_PER_FORMAT
        + ' posts. Not enough of the bank has been tested to rank it.' };
  }

  const avgs = scored.map(r => r.avg_engagement || 0);
  const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const weights = {};
  for (const r of scored) {
    /* Weight relative to the mean, clamped. A format twice as good as average
       gets roughly twice the slots, never more than MAX_WEIGHT. */
    const ratio = mean > 0 ? (r.avg_engagement || 0) / mean : 1;
    weights[r.layout] = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, Math.round(ratio * 2)));
  }
  return {
    active: true, diagnostics, weights,
    reason: 'Ranked ' + scored.length + ' formats with at least ' + MIN_POSTS_PER_FORMAT
      + ' posts each, against ' + totalEngagement + ' total interactions.'
  };
}

const result = evaluate();
result.evaluatedAt = new Date().toISOString();
result.gates = { MIN_TOTAL_ENGAGEMENT, MIN_POSTS_PER_FORMAT, MAX_WEIGHT, MIN_WEIGHT };

if (process.argv.includes('--explain')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(result.active
    ? 'weights ACTIVE: ' + JSON.stringify(result.weights)
    : 'weights INACTIVE, rotation unchanged');
  console.log('reason: ' + result.reason);
  if (result.diagnostics) {
    const d = result.diagnostics;
    console.log('  ' + d.totalPosts + ' posts, ' + d.totalEngagement + ' interactions ('
      + d.igEngagement + ' instagram, ' + d.fbEngagement + ' facebook), '
      + d.formatsWithAnyEngagement + ' of ' + d.formats + ' formats with any engagement');
  }
}
