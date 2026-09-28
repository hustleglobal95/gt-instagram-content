/**
 * threads_post_now.js, publish the next approved post to @markusreidgt on Threads
 * -----------------------------------------------------------------------------
 * This is the entrypoint the scheduler (GitHub Actions) runs, and the "Post one
 * now" button triggers.
 *
 * Since 28 September 2026 the account posts about Growth Terminal as a design
 * studio and nothing else. The old generator (threads_generate.js reading
 * threads_bank.js) wrote platform posts and is no longer called from here.
 *
 * The only source of a post is threads_queue.json. An item goes in only after
 * the owner approves that exact text and image. Each item posts once, there is
 * no loop, and an empty queue refuses to post, the same way queue_pick.py does
 * for Instagram.
 *
 * The queue names one account. Only that account is published to, even when
 * THREADS_ACCOUNTS holds others, so a post approved for @markusreidgt cannot
 * reach a second account.
 *
 * Accounts + tokens come from the THREADS_ACCOUNTS env var (a JSON array), so
 * secrets never live in the repo:
 *   THREADS_ACCOUNTS='[{"name":"markusreidgt","userId":"178...","token":"THAA..."}]'
 *
 * GT_DRY_RUN=1 prints what would publish without publishing or marking it used.
 *
 * Writes:
 *   threads_queue_used.json, which items have run (the workflow commits it,
 *                            otherwise the same item would post again)
 *   threads_posted_log.json, history the dashboard reads
 */

const fs = require('fs');
const path = require('path');
const { publishText, publishImage } = require('./threads_publish');

const DRY = process.env.GT_DRY_RUN === '1';
const QUEUE_PATH = path.join(__dirname, 'threads_queue.json');
const USED_PATH = path.join(__dirname, 'threads_queue_used.json');
const LOG_PATH = path.join(__dirname, 'threads_posted_log.json');
const MAX_CHARS = 500;

function refuse(msg) {
  console.log(`REFUSING TO POST: ${msg}`);
  console.log('threads_queue.json is the only approved source. Add an approved post to it.');
  process.exit(1);
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function loadAccounts() {
  const raw = process.env.THREADS_ACCOUNTS;
  if (!raw) throw new Error('THREADS_ACCOUNTS env var is not set (JSON array of {name,userId,token}).');
  let list;
  try { list = JSON.parse(raw); } catch { throw new Error('THREADS_ACCOUNTS is not valid JSON.'); }
  if (!Array.isArray(list) || !list.length) throw new Error('THREADS_ACCOUNTS must be a non-empty JSON array.');
  return list;
}

function nextApproved() {
  if (!fs.existsSync(QUEUE_PATH)) refuse('threads_queue.json is not in the repo.');
  const queue = readJson(QUEUE_PATH, null);
  if (!queue) refuse('threads_queue.json is not valid JSON.');
  if (!queue.account) refuse('threads_queue.json does not name an account.');
  const posts = Array.isArray(queue.posts) ? queue.posts : [];
  if (!posts.length) refuse('threads_queue.json has no posts in it.');

  const used = new Set(readJson(USED_PATH, []).map((u) => u.id));
  const post = posts.find((p) => !used.has(p.id));
  if (!post) refuse('every approved post has run. There is no loop.');

  if (!post.text || post.text.length > MAX_CHARS) refuse(`${post.id} is empty or over ${MAX_CHARS} characters.`);
  if (/[\u2013\u2014]/.test(post.text)) refuse(`${post.id} contains a dash that is banned on every Growth Terminal surface.`);
  if (post.media_file && !fs.existsSync(path.join(__dirname, post.media_file))) {
    refuse(`${post.media_file} is named in the queue but not in the repo.`);
  }
  return { account: queue.account, post };
}

function imageUrl(mediaFile) {
  const repo = process.env.GT_GITHUB_REPO || process.env.GITHUB_REPOSITORY;
  const branch = process.env.GT_GITHUB_BRANCH || process.env.GITHUB_REF_NAME || 'main';
  if (!repo) throw new Error('no repo to build the image URL from (GT_GITHUB_REPO or GITHUB_REPOSITORY).');
  return `https://raw.githubusercontent.com/${repo}/${branch}/${mediaFile.replace(/^\/+/, '')}`;
}

async function main() {
  const { account, post } = nextApproved();
  const acct = loadAccounts().find((a) => a.name === account);
  if (!acct) refuse(`@${account} is not in THREADS_ACCOUNTS.`);

  console.log(`\nNext approved post ${post.id} for @${account} (${post.text.length} chars${post.media_file ? ', with image' : ''}):\n${post.text}\n`);
  if (DRY) { console.log('[DRY_RUN] nothing published, nothing marked used.'); return; }

  const record = {
    at: new Date().toISOString(), text: post.text, parts: [post.text], isThread: false,
    pillar: 'studio', kind: `queue:${post.id}`, media_file: post.media_file || null,
    accounts: [], ids: {}, errors: {},
  };
  try {
    const id = post.media_file
      ? await publishImage(post.text, imageUrl(post.media_file), acct)
      : await publishText(post.text, acct);
    record.ids[account] = id;
    record.accounts.push(account);
    console.log(`published ${post.id} to @${account} (${id})`);
  } catch (e) {
    record.errors[account] = e.message;
    const log = readJson(LOG_PATH, []); log.push(record);
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
    throw e; // not marked used, so the same approved post is tried again next run
  }

  const used = readJson(USED_PATH, []);
  used.push({ id: post.id, at: record.at });
  fs.writeFileSync(USED_PATH, JSON.stringify(used, null, 2) + '\n');
  const log = readJson(LOG_PATH, []); log.push(record);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
