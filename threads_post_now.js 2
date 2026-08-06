/**
 * threads_post_now.js, generate the next post and publish it to every account
 * -----------------------------------------------------------------------------
 * This is the entrypoint the scheduler (GitHub Actions) runs, and the "Post one
 * now" button triggers. Mirrors your Instagram post_now.
 *
 * Accounts + tokens come from the THREADS_ACCOUNTS env var (a JSON array), so
 * secrets never live in the repo:
 *   THREADS_ACCOUNTS='[{"name":"markusreidgt","userId":"178...","token":"THAA..."},
 *                      {"name":"gt_second","userId":"991...","token":"THAA..."}]'
 *
 * Pause the whole thing by setting GT_DRY_RUN=1 (same lever as the image poster),
 * it generates and logs but does not publish.
 *
 * Writes:
 *   threads_posted_log.json, history the dashboard reads
 *   threads_used_log.json, non-repeat memory (written by the generator)
 */

const fs = require('fs');
const path = require('path');
const { generate } = require('./threads_generate');
const { publishText } = require('./threads_publish');

const DRY = process.env.GT_DRY_RUN === '1';
const LOG_PATH = path.join(__dirname, 'threads_posted_log.json');

function loadAccounts() {
  const raw = process.env.THREADS_ACCOUNTS;
  if (!raw) throw new Error('THREADS_ACCOUNTS env var is not set (JSON array of {name,userId,token}).');
  let list;
  try { list = JSON.parse(raw); } catch { throw new Error('THREADS_ACCOUNTS is not valid JSON.'); }
  if (!Array.isArray(list) || !list.length) throw new Error('THREADS_ACCOUNTS must be a non-empty JSON array.');
  return list;
}

function appendLog(record) {
  let log = [];
  try { log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch { log = []; }
  log.push(record);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

async function main() {
  const accounts = loadAccounts();
  const [post] = generate(1);
  if (!post) { console.log('No fresh post available, add formats or clear threads_used_log.json.'); return; }

  const parts = post.parts || [post.text];
  const shape = post.isThread ? `THREAD, ${parts.length} parts` : `${post.chars} chars`;
  console.log(`\nNext post (${post.pillar}/${post.kind}, ${shape}):\n${parts.join('\n\n   ↳ ')}\n`);

  const record = { at: new Date().toISOString(), text: post.text, parts, isThread: !!post.isThread, pillar: post.pillar, kind: post.kind, accounts: [], ids: {}, errors: {} };

  for (const acct of accounts) {
    if (DRY) { console.log(`[DRY_RUN] would publish ${post.isThread ? parts.length + '-part thread' : 'post'} to @${acct.name}`); record.accounts.push(acct.name); continue; }
    try {
      // Publish the hook, then chain each reply onto the previous published post.
      let firstId = null, replyTo = null;
      for (let i = 0; i < parts.length; i++) {
        const id = await publishText(parts[i], acct, replyTo ? { replyToId: replyTo } : {});
        if (i === 0) firstId = id;
        replyTo = id;
      }
      record.ids[acct.name] = firstId;
      record.accounts.push(acct.name);
      console.log(`✓ published ${post.isThread ? parts.length + '-part thread' : 'post'} to @${acct.name} (${firstId})`);
    } catch (e) {
      record.errors[acct.name] = e.message;
      console.error(`✗ @${acct.name}: ${e.message}`);
    }
  }

  appendLog(record);
  console.log(`\nDone. Published to: ${record.accounts.join(', ') || '(none)'}${DRY ? '  [dry run]' : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
