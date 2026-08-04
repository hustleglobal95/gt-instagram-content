/**
 * threads_publish.js, publish a text post to one Threads account via the Threads API
 * -----------------------------------------------------------------------------
 * Two-step flow (same shape as your Instagram Graph publish):
 *   1. POST graph.threads.net/v1.0/{userId}/threads          media_type=TEXT, text=…  -> creation_id
 *   2. wait, then
 *   3. POST graph.threads.net/v1.0/{userId}/threads_publish  creation_id=…            -> published post id
 *
 * No dependencies (built-in https). Rate limit: 250 posts / 24h per account.
 */

const https = require('https');

const HOST = 'graph.threads.net';
const API = '/v1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function postForm(pathname, params) {
  const body = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: HOST, path: API + pathname, method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json;
          try { json = JSON.parse(data); } catch { json = { raw: data }; }
          if (res.statusCode >= 200 && res.statusCode < 300 && !json.error) resolve(json);
          else reject(new Error(`Threads API ${res.statusCode}: ${json.error ? json.error.message : data}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Publish `text` to a Threads account.
 * @param {string} text
 * @param {{userId:string, token:string, name?:string}} account
 * @param {{delayMs?:number, replyToId?:string}} opts
 * @returns {Promise<string>} the published post id
 */
async function publishText(text, account, opts = {}) {
  const { userId, token } = account;
  if (!userId || !token) throw new Error(`account ${account.name || '?'} missing userId/token`);
  const delayMs = opts.delayMs ?? 5000; // text publishes fast; a short wait is safe (docs advise up to 30s for video)

  const createParams = { media_type: 'TEXT', text, access_token: token };
  if (opts.replyToId) createParams.reply_to_id = opts.replyToId;
  const created = await postForm(`/${userId}/threads`, createParams);
  const creationId = created.id;
  if (!creationId) throw new Error(`no creation_id returned for ${account.name || userId}`);

  await sleep(delayMs);
  const published = await postForm(`/${userId}/threads_publish`, { creation_id: creationId, access_token: token });
  if (!published.id) throw new Error(`publish returned no id for ${account.name || userId}`);
  return published.id;
}

module.exports = { publishText };
