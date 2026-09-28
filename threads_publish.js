/**
 * threads_publish.js, publish a text or image post to one Threads account via the Threads API
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

// Owner rule, 28 September 2026: no marketing piece shows a price. Every post
// and reply to Threads goes through publishText or publishImage, so this is the
// one place the rule is enforced for the platform.
const PRICE = /[$\u20ac\u00a3\u00a5]\s?\d|\b\d[\d,.]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b/i;
function assertNoPrice(text) {
  const m = PRICE.exec(String(text || ''));
  if (m) throw new Error(`refusing to publish: the text shows a price (${m[0]}). No marketing piece shows a price.`);
}
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
  assertNoPrice(text);
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

function getJson(pathname, params) {
  const qs = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    https.get({ host: HOST, path: `${API}${pathname}?${qs}` }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = { raw: data }; }
        if (res.statusCode >= 200 && res.statusCode < 300 && !json.error) resolve(json);
        else reject(new Error(`Threads API ${res.statusCode}: ${json.error ? json.error.message : data}`));
      });
    }).on('error', reject);
  });
}

/**
 * Publish an image post. Threads fetches the image from `imageUrl` itself, so it
 * must be public (the raw GitHub URL of a committed creative, as Instagram uses).
 * Image containers take longer than text, so this waits for FINISHED before
 * publishing instead of guessing a delay.
 * @returns {Promise<string>} the published post id
 */
async function publishImage(text, imageUrl, account, opts = {}) {
  const { userId, token } = account;
  if (!userId || !token) throw new Error(`account ${account.name || '?'} missing userId/token`);
  assertNoPrice(text);

  const created = await postForm(`/${userId}/threads`, { media_type: 'IMAGE', image_url: imageUrl, text, access_token: token });
  const creationId = created.id;
  if (!creationId) throw new Error(`no creation_id returned for ${account.name || userId}`);

  const deadline = Date.now() + (opts.timeoutMs ?? 120000);
  for (;;) {
    await sleep(opts.pollMs ?? 5000);
    const st = await getJson(`/${creationId}`, { fields: 'status,error_message', access_token: token });
    if (st.status === 'FINISHED') break;
    if (st.status === 'ERROR' || st.status === 'EXPIRED') throw new Error(`image container ${st.status}: ${st.error_message || 'no detail'}`);
    if (Date.now() > deadline) throw new Error(`image container still ${st.status || 'unknown'} after waiting`);
  }

  const published = await postForm(`/${userId}/threads_publish`, { creation_id: creationId, access_token: token });
  if (!published.id) throw new Error(`publish returned no id for ${account.name || userId}`);
  return published.id;
}

module.exports = { publishText, publishImage };
