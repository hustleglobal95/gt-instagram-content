/**
 * threads_reply.js, Markus answers people
 * -----------------------------------------------------------------------------
 * This is the part that was missing. The account had published 86 posts and
 * received zero genuine replies, because it had never once spoken to anybody.
 *
 * The research is unambiguous: replies are the primary distribution signal, the
 * sum of an account's replies is worth roughly the sum of its posts, and ten to
 * fifteen considered replies a day is the growth engine. Posting is the other
 * thirty percent.
 *
 * TWO SOURCES OF CONVERSATION, in priority order.
 *
 *   1. INBOUND. People who replied to Markus. Needs no extra permission, and it
 *      is the highest value reply available: it deepens a thread that is already
 *      live, inside the velocity window that decides that post's reach.
 *
 *   2. OUTBOUND. Other people's posts found by keyword. Requires the
 *      `threads_keyword_search` permission on the token. Most tokens are issued
 *      with only threads_basic and threads_publishing_content, so this will
 *      usually be unavailable. It degrades to inbound only and says so loudly
 *      rather than failing silently.
 *
 * SAFETY. Every reply is written by the composer's reply atoms, gated by
 * threads_guard.js, and additionally checked here for reply specific failures
 * that the post guard does not cover: pitching in someone else's comments,
 * parroting their own point back at them, and replies too short to register.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { MECHANICS, COMMUNITY, OFFER_POLICY, AUDIENCES } = require('./threads_kb');
const { guardThread } = require('./threads_guard');

const HOST = 'graph.threads.net';
const API = '/v1.0';
const STATE = path.join(__dirname, 'threads_reply_log.json');

const MIN_WORDS = MECHANICS.replyLength.minWordsToCount;   // 8
const DAILY_TARGET = COMMUNITY.repliesPerDay.target;        // [10, 15]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(pathname, params) {
  const qs = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({ host: HOST, path: API + pathname + '?' + qs, method: 'GET' }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let j; try { j = JSON.parse(d); } catch { j = { raw: d }; }
        if (res.statusCode >= 200 && res.statusCode < 300 && !j.error) resolve(j);
        else { const e = new Error(j.error ? j.error.message : `HTTP ${res.statusCode}`); e.code = j.error && j.error.code; e.status = res.statusCode; reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/* ---------------------------------------------------------------------------
   State. What Markus has already answered, so he never replies twice.
   --------------------------------------------------------------------------- */
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); }
  catch { return { answered: [], byDay: {} }; }
}
function saveState(s) {
  // keep the answered list bounded; ids older than the window cannot resurface
  s.answered = s.answered.slice(-4000);
  fs.writeFileSync(STATE, JSON.stringify(s, null, 0));
}
const today = (nowIso) => nowIso.slice(0, 10);

/* ---------------------------------------------------------------------------
   Reply composition. Not a bank of canned lines: a shape chosen from what the
   incoming message actually is, filled from the knowledge base.
   --------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
   HARD SAFETY STOP. Runs before anything else and cannot be overridden.

   These are not style rules. Markus replies to strangers with no human in the
   loop, and there are messages an automated account must never answer. The
   test case that forced this: a message reading "my business failed and I lost
   everything, I honestly do not want to be here anymore" received a breezy
   reply about testing ideas cheaply. That is the worst thing this system can
   do and no amount of copy tuning prevents it. Only a refusal does.

   `escalate: true` means a human should look at it. Those are written to
   threads_reply_escalations.json rather than answered, so a person can decide
   whether to respond as themselves.
   --------------------------------------------------------------------------- */
const SAFETY_STOP = [
  { id: 'distress', escalate: true,
    why: 'Possible crisis or self harm. An automated business reply here is actively harmful. A person decides whether and how to respond.',
    test: /\b(?:kill myself|end it all|don'?t want to (?:be here|live|go on)|not want to be here|suicidal|suicide|self harm|want to die|no reason to live|can'?t go on|hopeless|give up on life)\b/i },
  { id: 'minor', escalate: false,
    why: 'Self identified minor. This account does not give unsupervised business advice to children.',
    test: /\b(?:i'?m|i am|im)\s*(?:only\s*)?(?:1[0-7]|[1-9])\b|\b(?:in (?:middle|high) school|year 9|9th grade|10th grade|11th grade)\b/i },
  { id: 'medical', escalate: false,
    why: 'Health or mental health question. Not this account\'s domain and not safe to answer automatically.',
    test: /\b(?:diagnos|medication|therapist|antidepress|adhd|autis|bipolar|prescription|symptoms|my doctor)\b/i },
  { id: 'financial-advice', escalate: false,
    why: 'Personalised investment advice. Not licensed, not appropriate, not automatable.',
    // "shares" as a verb is common in this niche ("she shares her revenue"),
    // so the stock sense has to be qualified rather than matched bare.
    test: /\b(?:invest(?:ing|ment)?|crypto|bitcoin|stock market|my stocks|buy shares|portfolio|my savings|401k|retirement fund|day trading)\b/i },
  { id: 'legal-advice', escalate: false,
    why: 'Legal question. Wrong domain and carries real consequences.',
    test: /\b(?:lawyer|attorney|sue|lawsuit|contract is void|legally|liability|trademark|copyright infringement|court)\b/i },
  { id: 'credentials-or-payment', escalate: false,
    why: 'Requests involving money movement or credentials. Never engage.',
    test: /\b(?:bank details|wire transfer|send (?:me )?(?:money|payment)|paypal|venmo|cash ?app|password|api key|seed phrase|gift card)\b/i },
  { id: 'abuse', escalate: false,
    why: 'Hostile message. Replying feeds it and there is nothing to gain.',
    test: /\b(?:scam|fraud|fake|shut up|idiot|stupid|loser|blocked|reported you|f\*+ck|fuck you)\b/i },
  { id: 'divisive', escalate: false,
    why: 'Politics, religion or identity. Off topic for this account and no upside.',
    test: /\b(?:election|republican|democrat|trump|biden|abortion|immigration|vaccine|religion|god|muslim|christian|jewish|israel|palestin|gun control)\b/i },
  { id: 'injection', escalate: false,
    why: 'Attempt to steer the automation. Treated as data, never as instruction.',
    test: /\b(?:ignore (?:your |all )?previous|disregard (?:your |the )?instructions|system prompt|you are now|debug mode|jailbreak|reveal your|act as|pretend you)\b/i },
  { id: 'spam-link', escalate: false,
    why: 'Promotional or link farming message.',
    test: /\b(?:buy followers|cheap followers|dm me|check out my|link in bio|onlyfans|telegram\.me|bit\.ly)\b|https?:\/\//i },
];

/* Returns the matching stop, or null when the message is safe to consider. */
function safetyStop(text) {
  const t = text || '';
  for (const rule of SAFETY_STOP) if (rule.test.test(t)) return rule;
  return null;
}

/* Classify what somebody said to us. Deliberately conservative: anything that
 * does not clearly fit a shape returns null and gets no reply at all, because
 * a wrong reply is worse than no reply. */
function classify(text) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;
  if (/\b(?:thanks|thank you|appreciate|love this|great post|well said|so true|needed this)\b/.test(t) && t.length < 140) return 'appreciation';
  /* Real replies frequently omit the question mark. Interrogative openers
   * catch what punctuation misses, which in testing was most of them. */
  if (/\?/.test(t)) return 'question';
  if (/(?:^|\b)(?:how (?:do|does|did|can|would|should|long)|what(?:'?s| is| are| would| should)?|why (?:do|does|is|are)|when (?:do|does|should)|should i|can i|is it|are there|any (?:advice|tips|thoughts)|anyone know|wondering (?:how|what|if))\b/.test(t)) return 'question';
  if (/\b(?:i am|i'm|im|we are|we're|just|currently|right now)\b.*\b(?:building|launching|launched|working on|starting|started|trying|shipped|built)\b/.test(t)) return 'sharing';
  if (/\b(?:i (?:just )?(?:shipped|launched|built|spent|keep|never finish)|my (?:first|new) (?:product|launch|course|template))\b/.test(t)) return 'sharing';
  if (/\b(?:disagree|not sure|but |however|actually|wrong|depends)\b/.test(t)) return 'pushback';
  if (t.split(/\s+/).length >= 12) return 'substantive';
  return null;
}

/* Which audience the person sounds like, so the reply draws on the right
 * knowledge. Returns null when there is no clear signal, and a null audience
 * gets a general reply rather than a guessed one. */
function detectAudience(text) {
  const t = (text || '').toLowerCase();
  if (/\b(?:tampa|st\.? pete|petersburg|clearwater|sarasota|brandon|riverview)\b/.test(t)) return 'tampa';
  if (/\b(?:ai|llm|model|gpt|claude|prompt|agent|inference)\b/.test(t)) return 'ai';
  if (/\b(?:gumroad|etsy|digital product|template|course|ebook|launch|pricing|price)\b/.test(t)) return 'sellOnline';
  if (/\b(?:founder|startup|start-up|raise|seed|cofounder|co-founder)\b/.test(t)) return 'founders';
  if (/\b(?:building|shipped|shipping|side project|mvp|prototype)\b/.test(t)) return 'building';
  return null;
}

/* Reply bodies. Each is written to clear 8 words, add something the original
 * did not say, and never pitch. Grouped by shape so the reply answers what was
 * actually said. */
/* Reply bodies. Each is written to clear 8 words, add something the original
 * did not say, and never pitch.
 *
 * Each carries `on`: the topics it actually answers. Selection scores these
 * against the incoming message rather than picking at random, because a
 * random-but-fluent reply to a specific question is exactly what makes an
 * account read as a bot. If nothing scores, Markus says nothing.
 *
 * `on: null` means the line is safe for any message of that shape. */
const REPLIES = {
  appreciation: [
    { on: null, text: () => `Glad it was useful. The part most people push back on is the bit about waiting, and I think they are half right.` },
    { on: null, text: () => `Appreciated. It took me embarrassingly long to work that one out in practice.` },
    { on: null, text: () => `Thank you. Curious whether it matches what you are seeing on your side.` },
  ],
  question: [
    { on: /\b(?:traffic|visitors|reach|nobody saw|no sales|didn'?t sell|sold nothing|conversion)\b/i,
      text: () => `Two numbers rather than one: visitors and sales. Few visitors and few sales is a reach problem and tells you nothing about the offer. Plenty of visitors and few sales is an offer problem. Under about two hundred visitors I would not draw conclusions either way.` },
    { on: /\b(?:price|pricing|charge|how much|worth|cheap|expensive)\b/i,
      text: () => `I would set it from the category band rather than from nerves. In a category sitting between nineteen and thirty nine, going in at nine reads as unfinished rather than as a bargain, and raising later is harder than starting there.` },
    { on: /\b(?:idea|validate|validation|should i build|worth building|demand|market)\b/i,
      text: () => `The check I trust most is whether anyone has already paid for a worse version, or built the ugly version by hand. If nobody has ever done it manually you are not early, you are alone, and those look identical from the inside.` },
    { on: /\b(?:quit|give up|stop|kill|how long|when do i know)\b/i,
      text: () => `Write the number that would prove you wrong, and the date, before you start. Once the thing exists you will not be able to pick that number honestly, because you have already paid for it in hours.` },
    { on: /\b(?:what should i (?:sell|build|make)|which product|what kind of product|product type)\b/i,
      text: () => `Less about what suits you and more about what you can still be doing in month eight when it is boring. Support load and how fast it goes out of date matter more than how exciting the category sounds.` },
    { on: /\b(?:post|posting|threads|algorithm|reach|followers|engagement)\b/i,
      text: () => `Replies move reach far more than likes do, and the first thirty to sixty minutes decide most of it. Posting more tends to lower the number distribution is actually computed from.` },
    { on: /\b(?:first (?:ten|10|few) customers?|no audience|getting started|first sale|first customer)\b/i,
      text: () => `The first ten are the hardest and it is rarely the product. You have no proof yet, so each one is a personal risk somebody takes on a stranger. The work early on is evidence rather than features: one person who used it and said something true in public.` },
    { on: /\b(?:minimum viable|mvp|scope|how (?:small|big)|version one|v1|what to include|cut)\b/i,
      text: () => `If version one takes more than a week, the scope is wrong rather than the deadline. The short never-cut list is the thing they paid for, and a way to reach you. Everything else can wait for evidence.` },
    { on: /\b(?:churn|retention|cancel|refund|leaving|stopped using)\b/i,
      text: () => `Refunds and churn tell you something the sales number hides. Sales say the page worked. Churn says the product did not match the page, and only one of those is fixed by better copy.` },
  ],
  sharing: [
    { on: /\b(?:first|early|no customers|no sales|nobody|zero|just started)\b/i,
      text: () => `The first ten are the hardest and it is usually not the product. It is that there is nothing to point at yet, so every sale is somebody taking a personal risk on a stranger.` },
    { on: /\b(?:silence|quiet|no response|nothing happened|crickets|no one)\b/i,
      text: () => `That is the stretch nobody photographs. Everyone posts from before it or after it and almost nobody posts from inside it.` },
    { on: null,
      text: () => `Worth writing down now what would count as this working, and by when. Much harder to do honestly once you are attached to the thing.` },
  ],
  pushback: [
    { on: null, text: () => `Fair, and I think you are right in the case where distribution already exists. It falls apart for people starting from nothing, which is who I had in mind.` },
    { on: null, text: () => `That is a reasonable objection. The version I would defend is narrower than what I wrote.` },
    { on: null, text: () => `Possibly. I have been wrong about this in the direction you are describing before.` },
  ],
  substantive: [
    { on: /\b(?:research|customers|interview|feedback|reviews|competitor)\b/i,
      text: () => `Three stars on a competitor tells you more than any survey. Somebody wanted it to work, used it properly, and can name exactly what let them down.` },
    { on: /\b(?:manual|spreadsheet|by hand|workaround|hack|duct tape)\b/i,
      text: () => `Somebody who already built the ugly version by hand is the strongest buying signal there is, and almost nobody goes looking for them.` },
    { on: /\b(?:traffic|sales|numbers|metrics|analytics|data)\b/i,
      text: () => `The thing that changed it for me was watching visitors rather than sales. One of those numbers is close to useless without the other.` },
    { on: null,
      text: () => `The part I would add is that most of this is testable earlier and more cheaply than it looks, usually before anything gets built.` },
  ],
};

/* Audience specific openers, used only when the audience is confidently
 * detected and the body is a general one. Keeps the reply grounded in their
 * world rather than generic. Never stacked on top of an already topical body. */
const AUDIENCE_NOTE = {
  tampa: `Around Tampa the thing that seems to matter most is being the obvious answer to one specific question, so the referral travels without you in the room.`,
  ai: `The question I keep coming back to on AI products: if the model got twice as good tomorrow and free, what would still be worth paying for?`,
  sellOnline: `The cheapest check before building is whether anyone has paid for a worse version of it already.`,
  founders: `Most of the advice aimed at you assumes distribution you have not built yet.`,
  building: `Improvement is not linear. Most things have a threshold and under it the return is zero rather than small.`,
};

/* Score a candidate against the incoming message. A topical hit wins; a
 * general line is a weak fallback; nothing else is eligible. */
function selectReply(shape, incomingText) {
  const pool = REPLIES[shape] || [];
  const hits = pool.filter((r) => r.on && r.on.test(incomingText));
  if (hits.length) return { entry: hits[Math.floor(Math.random() * hits.length)], matched: true };
  const general = pool.filter((r) => !r.on);
  if (general.length) return { entry: general[Math.floor(Math.random() * general.length)], matched: false };
  return null;
}

function composeReply(incomingText, opts = {}) {
  const stop = safetyStop(incomingText);
  if (stop) return { blocked: true, stop };

  const shape = classify(incomingText);
  if (!shape) return null;                       // nothing safe to say
  const aud = detectAudience(incomingText);
  const sel = selectReply(shape, incomingText || '');
  if (!sel) return null;

  /* A question deserves an answer to the question asked. If nothing in the
   * bank actually addresses it, a fluent generic reply is worse than silence:
   * that is precisely the failure that reads as automated. Decline instead. */
  if (shape === 'question' && !sel.matched) return null;

  const body = sel.entry.text(aud);

  // For substantive or sharing messages with a clear audience, lead with the
  // audience note. Never for appreciation: it would read as a lecture.
  let text = body;
  if (aud && !sel.matched && (shape === 'substantive' || shape === 'sharing') && Math.random() < 0.5) {
    text = `${AUDIENCE_NOTE[aud]}\n\n${body}`;
  }
  return { text, shape, audience: aud, matched: sel.matched };
}

/* ---------------------------------------------------------------------------
   Reply specific gate. The post guard does not know about these failures.
   --------------------------------------------------------------------------- */
function checkReply(text, incomingText) {
  const failures = [];
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  if (words < MIN_WORDS) {
    failures.push({ id: 'too-short', why: `Replies under ${MIN_WORDS} words register weakly as a ranking signal and read as filler.` });
  }
  if (/growthterminal\.io|\$29|\$50|What To Sell|Attract, Don't Sell/i.test(text)) {
    failures.push({ id: 'pitch-in-reply', why: 'A product link in somebody else\'s comment section is an ad. This is the fastest way to read as a bot.' });
  }
  // parroting: high word overlap with what they said
  if (incomingText) {
    const norm = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4));
    const a = norm(text), b = norm(incomingText);
    if (b.size >= 4) {
      let hit = 0; for (const w of b) if (a.has(w)) hit++;
      if (hit / b.size > 0.6) failures.push({ id: 'parroting', why: 'Restates their own point back at them, which adds nothing and reads as automated.' });
    }
  }
  if (/^(?:yes|no|agreed|exactly|this|same|facts|true)\b/i.test(text.trim())) {
    failures.push({ id: 'empty-agreement', why: 'Opens with agreement and no content.' });
  }

  const g = guardThread([text], { isReply: true });
  if (!g.ok) failures.push(...(g.failures || []));

  return { ok: failures.length === 0, text: g.ok ? g.parts[0] : text, failures };
}

/* ---------------------------------------------------------------------------
   Inbound: people who replied to Markus.
   --------------------------------------------------------------------------- */
async function fetchInbound(account, opts = {}) {
  const { userId, token } = account;
  const limit = opts.limit || 25;
  const out = [];
  const mine = await getJson(`/${userId}/threads`, {
    fields: 'id,timestamp,text', limit, access_token: token,
  });
  for (const post of (mine.data || [])) {
    let conv;
    try {
      conv = await getJson(`/${post.id}/replies`, {
        fields: 'id,text,username,timestamp,replied_to,is_reply_owned_by_me', access_token: token,
      });
    } catch (e) { continue; }
    for (const r of (conv.data || [])) {
      // skip our own chained thread parts, which is what made the old
      // dashboard report 52 replies on an account that had received none
      if (r.is_reply_owned_by_me) continue;
      if (account.username && r.username === account.username) continue;
      out.push({ id: r.id, text: r.text, username: r.username, ts: r.timestamp, onPost: post.id });
    }
    await sleep(120);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Outbound: other people's posts, by keyword. Needs threads_keyword_search.
   --------------------------------------------------------------------------- */
const KEYWORDS = [
  'digital product', 'first customer', 'launched today', 'building in public',
  'tampa small business', 'ai startup', 'sell online', 'no sales yet',
];

async function fetchOutbound(account, opts = {}) {
  const { userId, token } = account;
  const kws = opts.keywords || KEYWORDS;
  const found = [];
  for (const q of kws.slice(0, opts.maxKeywords || 4)) {
    try {
      const res = await getJson('/keyword_search', {
        q, search_type: 'TOP', fields: 'id,text,username,timestamp,permalink', access_token: token,
      });
      for (const p of (res.data || [])) {
        if (p.username && account.username && p.username === account.username) continue;
        found.push({ id: p.id, text: p.text, username: p.username, ts: p.timestamp, keyword: q, outbound: true });
      }
    } catch (e) {
      const denied = e.status === 400 || e.status === 403 || /permission|scope|unsupported|unknown path/i.test(e.message || '');
      return { available: false, reason: e.message, items: [], denied };
    }
    await sleep(200);
  }
  return { available: true, items: found };
}

/* ---------------------------------------------------------------------------
   The run.
   --------------------------------------------------------------------------- */
async function run(account, opts = {}) {
  const nowIso = opts.now || new Date().toISOString();
  const dry = opts.dryRun ?? (process.env.GT_DRY_RUN === '1');
  const state = loadState();
  const answered = new Set(state.answered);
  const day = today(nowIso);
  state.byDay[day] = state.byDay[day] || 0;

  const cap = opts.max ?? DAILY_TARGET[1];                 // 15
  const remaining = Math.max(0, cap - state.byDay[day]);
  const report = { day, sent: [], skipped: [], escalations: [], remaining, outboundAvailable: null, dry };

  if (remaining === 0) { report.note = 'daily reply cap already reached'; return report; }

  // 1. inbound first, always
  let candidates = [];
  try { candidates = await fetchInbound(account, opts); }
  catch (e) { report.inboundError = e.message; }

  // 2. outbound, if the token can
  if (candidates.length < remaining && opts.outbound !== false) {
    const ob = await fetchOutbound(account, opts);
    report.outboundAvailable = ob.available;
    if (!ob.available) report.outboundReason = ob.reason;
    if (ob.available) candidates = candidates.concat(ob.items);
  }

  for (const c of candidates) {
    if (report.sent.length >= remaining) break;
    if (answered.has(c.id)) continue;

    const drafted = composeReply(c.text, { outbound: c.outbound });

    if (drafted && drafted.blocked) {
      report.skipped.push({ id: c.id, why: 'safety stop: ' + drafted.stop.id });
      if (drafted.stop.escalate) {
        /* A person needs to see this one. Never answered automatically, never
         * silently dropped either. */
        report.escalations.push({ id: c.id, from: c.username, rule: drafted.stop.id, why: drafted.stop.why, text: c.text, ts: c.ts });
      }
      continue;
    }
    if (!drafted) { report.skipped.push({ id: c.id, why: 'nothing safe to say about this message' }); continue; }

    const checked = checkReply(drafted.text, c.text);
    if (!checked.ok) { report.skipped.push({ id: c.id, why: checked.failures.map((f) => f.id).join(', ') }); continue; }

    if (!dry) {
      const { publishText } = require('./threads_publish');
      try { await publishText(checked.text, account, { replyToId: c.id }); }
      catch (e) { report.skipped.push({ id: c.id, why: 'publish failed: ' + e.message }); continue; }
      await sleep(opts.spacingMs || 4000);
    }
    answered.add(c.id);
    state.byDay[day] += 1;
    report.sent.push({ id: c.id, to: c.username, shape: drafted.shape, audience: drafted.audience, outbound: !!c.outbound, text: checked.text });
  }

  state.answered = [...answered];
  if (!dry) {
    saveState(state);
    if (report.escalations.length) {
      const f = path.join(__dirname, 'threads_reply_escalations.json');
      let prev = []; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
      fs.writeFileSync(f, JSON.stringify(prev.concat(report.escalations), null, 2));
    }
  }
  return report;
}

module.exports = { run, composeReply, checkReply, classify, detectAudience, selectReply, safetyStop, fetchInbound, fetchOutbound, REPLIES, SAFETY_STOP, KEYWORDS };

if (require.main === module) {
  // offline self test: no network, exercises composition and the gate
  const samples = [
    'Thanks for this, needed to read it today',
    'How do you know if it is a traffic problem or the offer is just bad?',
    "I'm building a small AI tool for contractors right now and getting nowhere",
    'I disagree, plenty of people succeed by posting way more than that',
    'Been running my shop in St Pete for a while and referrals are basically all of it, never thought about the exact words people use',
    'same',
    '',
  ];
  let ok = 0, skip = 0;
  for (const s of samples) {
    const d = composeReply(s);
    if (!d) { console.log(`SKIP  "${s.slice(0, 46)}" -> nothing safe to say`); skip++; continue; }
    const c = checkReply(d.text, s);
    if (!c.ok) { console.log(`BLOCK "${s.slice(0, 46)}" -> ${c.failures.map((f) => f.id).join(', ')}`); skip++; continue; }
    ok++;
    console.log(`\n[${d.shape}${d.audience ? '/' + d.audience : ''}] to: "${s.slice(0, 46)}"\n  ${c.text.replace(/\n+/g, '\n  ')}`);
  }
  console.log(`\nreplied ${ok}, declined ${skip}`);
}
