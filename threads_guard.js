/**
 * threads_guard.js
 * -----------------------------------------------------------------------------
 * A text gate for @markusreidgt, run immediately before publish.
 *
 * WHY THIS EXISTS
 *
 * slop-guard.js checks images. Nothing checked the words. 86 posts went out
 * unexamined, and the audit found: em dashes in 12 of them against a brand rule
 * that forbids them outright, emoji in 18 including the down arrow, one post
 * that promised a list and delivered nothing, and one that claimed three years
 * of experience the account does not have.
 *
 * None of that is a taste problem. Those are all mechanically detectable, which
 * means they should never have been a human's job to catch.
 *
 * TWO BEHAVIOURS
 *
 * normalise()  quietly fixes what is safe to fix: curly quotes, stray dashes,
 *              arrows, doubled blank lines. The post still goes out.
 *
 * check()      blocks what must not be auto-corrected, because the fix is a
 *              judgement call: engagement bait, self-promotional CTAs, claims
 *              about experience or revenue the account cannot back, and posts
 *              that trail off without the thing they promised.
 *
 * A blocked post is skipped, not repaired. The generator picks another.
 */

// ---------------------------------------------------------------------------
// normalise: safe, silent repairs
// ---------------------------------------------------------------------------

const ARROWS = /[←-⇿➔➜➡⬅-⬇]/g;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu;

function normalise(text) {
  let t = String(text || '');
  const notes = [];

  const before = t;
  // The brand rule is absolute: no em dashes, no en dashes, anywhere.
  // A dash between clauses becomes a comma. A dash used as a range becomes "to".
  t = t.replace(/(\d)\s*[—–]\s*(\d)/g, '$1 to $2');
  t = t.replace(/\s*[—–]\s*/g, ', ');
  t = t.replace(/,\s*,/g, ',');
  if (t !== before) notes.push('removed em or en dash');

  const b2 = t;
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (t !== b2) notes.push('straightened quotes');

  const b3 = t;
  t = t.replace(ARROWS, ' ').replace(EMOJI, '');
  if (t !== b3) notes.push('removed emoji or arrow');

  // tidy whatever the replacements left behind
  t = t.replace(/[ \t]{2,}/g, ' ')
       .replace(/ +\n/g, '\n')
       .replace(/\n{3,}/g, '\n\n')
       .replace(/\s+([.,!?;:])/g, '$1')
       .trim();

  return { text: t, notes };
}

// ---------------------------------------------------------------------------
// check: hard blocks
// ---------------------------------------------------------------------------

const BLOCKS = [
  {
    id: 'engagement-bait',
    why: 'Reads as farming. The research in threads_voice.js says replies come from a real question, not a prompt to reply.',
    // Deliberately narrow. "What advice did you follow for months" is a real
    // question and must pass; "follow for the rest" is a call to action and must not.
    test: /(?:^|\W)(?:save this|follow (?:me |us |@\w+ )?for (?:the rest|more|part|daily|weekly)|follow @\w+ for|drop a comment|comment below|(?:say|tell me|let me know|drop|share) (?:it |that |them |yours )?below|link in bio|share if you|who'?s with me|am i wrong\?|thoughts\?|hot take|unpopular opinion|honest question)/i,
  },
  {
    id: 'guru-closer',
    why: 'The smug sign-off. Tells the reader everyone else is stupid, which is the single most mocked tone on this platform.',
    test: /(?:most (?:teams|people|founders|businesses|companies) (?:have|get|are doing) this (?:exactly )?(?:backwards|wrong))|let that sink in|read that again|nobody (?:talks about|tells you) this|here'?s the (?:thing|secret)|the truth is nobody/i,
  },
  {
    id: 'unearned-tenure',
    why: 'The account cannot evidence it. One published post claimed three years in. Fabricated experience is the fastest way to lose a room this size.',
    test: /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:years?|months?)\s+(?:in|ago|of (?:doing|running|building))\b|\bi'?ve (?:been|spent)\s+(?:\d+|a few|several|many)\s+(?:years?|months?)/i,
  },
  {
    id: 'unearned-results',
    why: 'No client work and no revenue to point at. A number the account cannot source is the one thing that ends its credibility permanently.',
    // Covers the numeric claim and the qualitative one. "Stops tripled" shipped
    // in a thread and is exactly as unevidenced as "3x".
    test: /\b(?:my|our|a) client\b|\bi helped\b|\bwe helped\b|\b\$\d[\d,.]*\s*(?:k|m)?\s*(?:mrr|arr|in revenue|a month|per month|month)\b|\b\d+x'?d?\b|\b(?:tripled|quadrupled|doubled)\b|\bwent from \S+ to \S+\b|\bturned (?:it|a \w+) around\b/i,
  },
  {
    id: 'truncated-payload',
    // Only meaningful on a standalone post. A thread opener is SUPPOSED to end on
    // a promise, because the payload is in the replies. Checked in check() via opts.
    threadOpenerExempt: true,
    why: 'A standalone post that promises a list and then stops.',
    test: /(?:here'?s (?:what|how|why)[^.\n]*|the fix|three things|two things|five rules|what i (?:found|learned))\s*[:.]?\s*$/i,
  },
  {
    id: 'stray-glyph',
    why: 'normalise() should have removed these. If one survives, something upstream is inserting them after the gate.',
    test: new RegExp('[\\u2014\\u2013]|' + EMOJI.source, 'u'),
  },
];

const MAX_CHARS = 500;

function check(text, opts = {}) {
  const t = String(text || '');
  const failures = [];
  // A thread's first part is allowed to end on a promise. Every other part, and
  // every standalone post, is not.
  const isThreadOpener = Boolean(opts.isThread) && (opts.partIndex || 0) === 0;

  for (const rule of BLOCKS) {
    if (rule.threadOpenerExempt && isThreadOpener) continue;
    const m = t.match(rule.test);
    if (m) failures.push({ id: rule.id, why: rule.why, matched: (m[0] || '').trim().slice(0, 60) });
  }

  if (!t.trim()) failures.push({ id: 'empty', why: 'Nothing to post.', matched: '' });
  if (t.length > MAX_CHARS) {
    failures.push({ id: 'too-long', why: `Threads truncates. ${t.length} characters against a ${MAX_CHARS} limit.`, matched: '' });
  }

  // Threads truncates after the first few lines, so the opening line carries the
  // whole post. This only applies to what a scroller sees first: a standalone
  // post, or part one of a thread. Replies are already past the hook.
  /* A reply is either a later part of our own chain, or an explicit reply to
   * somebody else's post. Both are read in context rather than in the feed, so
   * the opening-hook rule does not apply to them. */
  const isReply = Boolean(opts.isReply) || (Boolean(opts.isThread) && (opts.partIndex || 0) > 0);
  const firstLine = t.split('\n')[0] || '';
  if (!isReply && firstLine.length > 200) {
    failures.push({ id: 'no-hook', why: 'A 200 character opening line has no hook in it, and Threads truncates before the reader reaches the point.', matched: firstLine.slice(0, 50) });
  }

  return { ok: failures.length === 0, failures };
}

/**
 * The one call the pipeline should make.
 * Returns { ok, text, notes, failures }.
 */
function guard(input, opts = {}) {
  const { text, notes } = normalise(input);
  const { ok, failures } = check(text, opts);
  return { ok, text, notes, failures };
}

/**
 * Guard a whole thread. Every part is checked; if any part fails the whole
 * thread is dropped, because a half-published chain reads worse than nothing.
 */
function guardThread(parts, opts = {}) {
  const out = [];
  const failures = [];
  parts.forEach((p, i) => {
    const r = guard(p, { isThread: true, partIndex: i, ...opts });
    out.push(r.text);
    r.failures.forEach((f) => failures.push({ ...f, part: i + 1 }));
  });
  return { ok: failures.length === 0, parts: out, failures };
}

module.exports = { guard, guardThread, normalise, check, BLOCKS, MAX_CHARS };

// CLI: node threads_guard.js "some post text"
//      node threads_guard.js --log threads_posted_log.json   (audit what already shipped)
if (require.main === module) {
  const fs = require('fs');
  const arg = process.argv[2];
  if (arg === '--log') {
    const file = process.argv[3] || 'threads_posted_log.json';
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    let blocked = 0, normalised = 0;
    for (const row of rows) {
      const r = row.isThread && Array.isArray(row.parts)
        ? (() => { const g = guardThread(row.parts); return { ok: g.ok, notes: [], failures: g.failures }; })()
        : guard(row.text || '');
      if (r.notes.length) normalised++;
      if (!r.ok) {
        blocked++;
        console.log(`\nBLOCK  ${(row.ts || '').slice(0, 10)}  [${row.format || ''}]`);
        for (const f of r.failures) console.log(`   ${f.id}: "${f.matched}"`);
        console.log('   ' + (row.text || '').replace(/\n+/g, ' / ').slice(0, 150));
      }
    }
    console.log(`\n${rows.length} posts audited. ${blocked} would have been blocked. ${normalised} would have been silently cleaned.`);
  } else if (arg) {
    console.log(JSON.stringify(guard(arg), null, 2));
  } else {
    console.log('usage: node threads_guard.js "text"  |  node threads_guard.js --log [file]');
  }
}
