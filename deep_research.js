/**
 * deep_research.js, the loop that keeps the account learning.
 * -----------------------------------------------------------------------------
 * research.js watches for STRUCTURES. This goes deeper: it reads marketing
 * writing at full text, asks a model to distill what is genuinely reusable
 * about the COPY and the THINKING, and files the result as briefs the same way
 * everything else enters this system: into the queue, behind the ready gate,
 * never near the feed on its own.
 *
 * THE LOOP, end to end:
 *   1. COLLECT   pull the configured feeds, fetch the most recent articles as
 *                full pages, strip them to readable text.
 *   2. DISTILL   send batches to a model with a strict extraction contract:
 *                named pattern, the evidence in the source, a measurable copy
 *                device, and an honest GT angle. JSON only. Refusals and
 *                fluff produce nothing rather than garbage.
 *   3. QUARANTINE every finding lands in inspiration_queue.json as status
 *                "new" and in research_notes.json with its source attached.
 *                Rejected names are remembered, so a pattern you have said no
 *                to never comes back next week wearing a new headline.
 *   4. REVIEW    the same human gate as everything else: research.js --review,
 *                inject.js --brief, a render, then ready:true. The model has
 *                no path to the feed and never will from this file.
 *
 * WHY THE MODEL STEP IS SAFE TO AUTOMATE
 *   Its output is data in a queue, not copy in a post. The blast radius of a
 *   bad run is a mediocre brief somebody rejects at review. The blast radius
 *   of no research at all is a bank that stops learning, which is the thing
 *   this file exists to prevent.
 *
 * FAILURE POLICY
 *   No API key, a dead feed, a model outage: the run degrades and says so,
 *   it does not fail the workflow and it does not fabricate. With no key it
 *   still collects and files raw material into research_notes.json so the
 *   next keyed run has a backlog to distill.
 *
 * USAGE
 *   node deep_research.js --run             collect, distill, file
 *   node deep_research.js --run --dry       everything except writing files
 *   node deep_research.js --digest          print the latest run's findings
 */
const fs = require('fs');
const path = require('path');

const QUEUE = path.join(__dirname, 'inspiration_queue.json');
const NOTES = path.join(__dirname, 'research_notes.json');

/* ------------------------------------------------------------------ config */
/* Feeds chosen for copy and strategy writing rather than industry news.
   Add freely; a dead feed logs and skips. */
const FEEDS = [
  /* Craft and evidence sources. News feeds and content-marketing fluff farms
     were dropped after the first live runs showed what they produce. A dead
     feed logs and skips, so speculative additions cost nothing. */
  'https://copyhackers.com/feed/',
  'https://adespresso.com/feed/',
  'https://sparktoro.com/blog/feed/',
  'https://www.marketingweek.com/feed/',
  'https://www.growthunhinged.com/feed',
  'https://ariyh.com/feed'
];

/* Titles that are almost never craft: tool comparisons, listicles, news
   roundups, definitional SEO bait. Skipped before a byte is fetched. */
const JUNK_TITLE = /\bvs\.?\s|what is\b|features compared|\[\d{4}\]|top \d|updates you|roundup|announces|launches\b/i;
const MAX_ARTICLES_PER_RUN = 6;   // depth over breadth, every run
const MAX_ARTICLE_CHARS = 9000;   // enough for the argument, not the comments
const MAX_NEW_BRIEFS = 4;         // a queue that grows faster than review is noise

const read = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
/* Escapes, not literals, so this file passes the dash scan it serves. */
const noDashes = s => String(s).replace(/\u2014|\u2013/g, ', ').replace(/,\s*,/g, ',');

/* ----------------------------------------------------------------- collect */
async function fetchText(url) {
  /* A plain browser UA. Several marketing sites 403 anything that looks like
     a script, and a feed reader that cannot read feeds is a paperweight. */
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    redirect: 'follow'
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

function parseFeed(xml) {
  /* Minimal RSS/Atom item extraction. Titles and links only; the article body
     comes from fetching the page itself. */
  const items = [];
  const chunks = xml.split(/<item[\s>]|<entry[\s>]/).slice(1);
  for (const c of chunks) {
    const title = (c.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
    let link = (c.match(/<link[^>]*href="([^"]+)"/) || [])[1]
      || (c.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || '';
    const clean = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
    if (clean(title) && clean(link).startsWith('http')) {
      items.push({ title: clean(title), url: clean(link) });
    }
  }
  return items;
}

function stripPage(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ARTICLE_CHARS);
}

async function collect(log) {
  const seenUrls = new Set(
    read(NOTES, { runs: [] }).runs.flatMap(r => (r.articles || []).map(a => a.url))
  );
  const articles = [];
  for (const feed of FEEDS) {
    if (articles.length >= MAX_ARTICLES_PER_RUN) break;
    try {
      const items = parseFeed(await fetchText(feed));
      log('feed ok: ' + feed + ' (' + items.length + ' items)');
      for (const item of items.slice(0, 4)) {
        if (articles.length >= MAX_ARTICLES_PER_RUN) break;
        if (seenUrls.has(item.url)) continue;
        if (JUNK_TITLE.test(item.title)) { log('  junk title skipped: ' + item.title.slice(0, 60)); continue; }
        try {
          const text = stripPage(await fetchText(item.url));
          if (text.length > 800) articles.push({ ...item, text });
          else log('  thin page skipped: ' + item.url);
        } catch (e) { log('  article failed: ' + item.url + ' (' + e.message + ')'); }
      }
    } catch (e) { log('feed FAILED: ' + feed + ' (' + e.message + ')'); }
  }
  return articles;
}

/* ----------------------------------------------------------------- distill */
const CONTRACT = `You extract reusable advertising copy and marketing patterns from articles, and you are hard to impress.

Return STRICT JSON: {"findings":[{
  "name": "short pattern name",
  "whyItWorks": "the mechanism, citing what the article actually says or shows",
  "copyDevice": "one testable rule, e.g. 'headline names the reader's exact situation in under 8 words'",
  "evidence": "the strongest concrete detail in the source, quoted or closely paraphrased",
  "gtAngle": "one concrete ad idea for a revenue-constraint diagnostic tool, or 'weak fit'",
  "strength": "strong or weak"
}]}

What earns "strong", ALL required:
- The evidence contains a NUMBER, a NAMED brand or campaign with a stated result, or a real before/after. "The article recommends X" is not evidence, it is opinion.
- The copyDevice is a rule someone could check a draft against and answer yes or no.
- The gtAngle is a specific ad you could describe to a designer in one sentence.
Anything less is "weak". Most articles contain zero strong findings, and returning an empty array is the correct output for them. Generic advice, tool comparisons, and vendor content are weak by default.

Rules:
- Never invent statistics, brands, or results.
- Plain sentences. Never use em dashes or en dashes anywhere.
- At most 2 findings per article.`;

async function distillAnthropic(article) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.RESEARCH_MODEL || 'claude-sonnet-4-latest',
      max_tokens: 900, temperature: 0,
      system: CONTRACT,
      messages: [{ role: 'user', content: 'ARTICLE: ' + article.title + '\n\n' + article.text + '\n\nReturn the JSON only.' }]
    })
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()).slice(0, 160));
  const data = await r.json();
  return (data.content || []).map(c => c.text || '').join('');
}

async function distillOpenAI(article) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: process.env.RESEARCH_MODEL || 'gpt-4o-mini',
      temperature: 0, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CONTRACT },
        { role: 'user', content: 'ARTICLE: ' + article.title + '\n\n' + article.text + '\n\nReturn the JSON only.' }
      ]
    })
  });
  if (!r.ok) throw new Error('OpenAI ' + r.status + ': ' + (await r.text()).slice(0, 160));
  const data = await r.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseFindings(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return [];
  try {
    const j = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(j.findings) ? j.findings.filter(f => f && f.name && f.evidence) : [];
  } catch { return []; }
}

/* -------------------------------------------------------------------- run */
async function run({ dry }) {
  const lines = [];
  const log = m => { lines.push(m); console.log(m); };
  const stamp = new Date().toISOString();

  log('DEEP RESEARCH RUN ' + stamp + (dry ? ' (dry)' : ''));
  const articles = await collect(log);
  log(articles.length + ' fresh articles collected');

  const provider = process.env.ANTHROPIC_API_KEY ? 'anthropic'
    : process.env.OPENAI_API_KEY ? 'openai' : null;

  const queue = read(QUEUE, []);
  /* The memory that stops repeat suggestions: every name ever queued or
     rejected, from either research loop. */
  const knownNames = new Set(queue.map(b => String(b.name || '').toLowerCase()));

  const findings = [];
  if (!provider) {
    log('no ANTHROPIC_API_KEY or OPENAI_API_KEY: collecting only, distilling nothing.');
    log('raw material is filed in research_notes.json for the next keyed run.');
  } else {
    log('distilling with ' + provider);
    for (const a of articles) {
      try {
        const raw = provider === 'anthropic' ? await distillAnthropic(a) : await distillOpenAI(a);
        for (const f of parseFindings(raw)) {
          if (findings.length >= MAX_NEW_BRIEFS) break;
          if (knownNames.has(String(f.name).toLowerCase())) { log('  duplicate skipped: ' + f.name); continue; }
          if (/weak fit/i.test(f.gtAngle || '')) { log('  weak fit skipped: ' + f.name); continue; }
          if (String(f.strength).toLowerCase() !== 'strong') { log('  weak finding skipped: ' + f.name); continue; }
          findings.push({ ...f, sourceTitle: a.title, sourceUrl: a.url });
          log('  STRONG finding: ' + f.name);
        }
      } catch (e) { log('  distill failed for "' + a.title.slice(0, 50) + '": ' + e.message); }
    }
  }

  /* File the findings. Every string is dash-scrubbed on the way in, because a
     model promise is not a guarantee and the standing rule does not bend. */
  const briefs = findings.map((f, i) => ({
    id: 'dr_' + stamp.slice(0, 10).replace(/-/g, '') + '_' + (i + 1),
    source: 'deep_research',
    name: noDashes(f.name),
    status: 'new',
    addedAt: stamp,
    structure: { anatomy: noDashes(f.copyDevice) },
    whyItWorks: noDashes(f.whyItWorks) + ' Evidence: ' + noDashes(f.evidence),
    gtAngle: noDashes(f.gtAngle),
    url: f.sourceUrl
  }));

  const notes = read(NOTES, { about: 'Deep research knowledge base. Newest run first.', runs: [] });
  notes.runs.unshift({
    at: stamp, provider: provider || 'none',
    articles: articles.map(a => ({ title: a.title, url: a.url })),
    findings: briefs.map((b, i) => ({ id: b.id, name: b.name, device: b.structure.anatomy,
      evidence: noDashes(findings[i].evidence), angle: b.gtAngle, url: b.url })),
    log: lines
  });
  notes.runs = notes.runs.slice(0, 40);

  if (dry) { log('dry run: nothing written.'); return; }
  fs.writeFileSync(QUEUE, JSON.stringify(queue.concat(briefs), null, 2));
  fs.writeFileSync(NOTES, JSON.stringify(notes, null, 2));
  log('filed ' + briefs.length + ' new briefs into the queue ('
    + queue.concat(briefs).filter(b => b.status === 'new').length + ' now awaiting review).');
  log('next: node research.js --review --status new');
}

/* The Slack drop. Blocks, not a text blob: a header, one card per finding
   with the move, the evidence, and the ad idea, and a footer that says exactly
   what to do about it. Prints the webhook payload as JSON on stdout. */
function slackPayload() {
  const notes = read(NOTES, null);
  const queue = read(QUEUE, []);
  const awaiting = queue.filter(b => b.status === 'new').length;
  if (!notes || !notes.runs.length) {
    return { text: 'GT research ran but has no runs recorded.' };
  }
  const r = notes.runs[0];
  const day = r.at.slice(0, 10);
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: 'GT ad research, weekly drop', emoji: false } },
    { type: 'context', elements: [{ type: 'mrkdwn',
      text: day + '  |  ' + r.articles.length + ' articles read  |  '
        + r.findings.length + ' findings passed the strength gate  |  '
        + awaiting + ' briefs awaiting review' }] },
    { type: 'divider' }
  ];
  if (!r.findings.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn',
      text: 'Nothing this week met the bar: a finding needs a number, a named result, or a real before/after. '
          + 'An empty week costs nothing. The reading list refreshes next Monday.' } });
  }
  for (const f of r.findings) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn',
      text: '*' + f.name.toUpperCase() + '*  `' + f.id + '`\n'
          + '*The move:* ' + f.device + '\n'
          + '*Evidence:* ' + (f.evidence || 'in the source') + '\n'
          + '*Ad idea:* ' + (f.angle || 'see brief')
          + (f.url ? '\n<' + f.url + '|Source>' : '') } });
    blocks.push({ type: 'divider' });
  }
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn',
    text: 'To build one: tell Claude the id, like "build ' + (r.findings[0] ? r.findings[0].id : 'dr_...')
        + '". To dismiss: "junk this batch". Rejected patterns never come back.' }] });
  return {
    text: 'GT ad research: ' + r.findings.length + ' findings, ' + awaiting + ' briefs awaiting review',
    blocks
  };
}

function digest() {
  const notes = read(NOTES, null);
  if (!notes || !notes.runs.length) { console.log('no runs yet.'); return; }
  const r = notes.runs[0];
  console.log('LAST RUN ' + r.at + ' via ' + r.provider);
  console.log(r.articles.length + ' articles read:');
  r.articles.forEach(a => console.log('  ' + a.title.slice(0, 90)));
  console.log(r.findings.length + ' findings filed:');
  r.findings.forEach(f => console.log('  ' + f.id + '  ' + f.name + '\n    device: ' + f.device));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--digest')) { digest(); process.exit(0); }
  if (args.includes('--slack')) { console.log(JSON.stringify(slackPayload())); process.exit(0); }
  if (args.includes('--run')) {
    run({ dry: args.includes('--dry') })
      .catch(e => { console.error('run failed: ' + e.message); process.exit(0); /* degrade, never break CI */ });
  } else {
    console.log('usage: node deep_research.js --run [--dry] | --digest');
  }
}

module.exports = { parseFeed, stripPage, parseFindings, slackPayload };
