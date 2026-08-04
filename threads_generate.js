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
const { FORMATS } = require('./threads_bank');

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
  const order = [...FORMATS].sort(() => Math.random() - 0.5);
  for (const fmt of order) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const text = fmt.render().trim();
      if (text.length > MAX_CHARS) continue;
      const h = hash(text);
      if (used.has(h) || sessionSeen.has(h)) continue;
      return { text, pillar: fmt.pillar, kind: fmt.kind, chars: text.length, hash: h };
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
    posts.push(p);
  }
  saveUsed(used);
  return posts;
}

module.exports = { generate };

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
      process.stdout.write(`\n──── Post ${i + 1}  ·  ${p.pillar}/${p.kind}  ·  ${p.chars} chars ────\n${p.text}\n`);
    });
  }
}
