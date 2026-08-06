// slop-guard.js — AI-slop detector for the Growth Terminal autoposter.
//
// Blocks low-quality / obviously AI-generated imagery ("AI slop") from reaching
// your ads. Uses a vision model as a strict creative-quality gate.
//
// Two jobs:
//   1) AUDIT your image library → writes slop_blocklist.json so generate.js can
//      exclude sloppy photo assets from selection (root-cause fix).
//   2) GUARD a single rendered creative right before it posts (safety net).
//
// Provider: uses OpenAI vision if OPENAI_API_KEY is set, else Anthropic (Claude)
// if ANTHROPIC_API_KEY is set. Pick a cheap vision model (default gpt-4o-mini) —
// checks cost a fraction of a cent each.
//
// CLI:
//   node slop-guard.js path/to/image.jpg        # assess one image, print verdict
//   node slop-guard.js --audit [dir]            # scan a folder, write slop_blocklist.json
//
// Env (all optional):
//   OPENAI_API_KEY / ANTHROPIC_API_KEY   which provider to use
//   VISION_MODEL      default: gpt-4o-mini (OpenAI) or claude model if Anthropic
//   SLOP_MIN_QUALITY  default 55  — block if craft/quality score is below this
//   SLOP_STRICT_AI    default 0   — if 1, also block anything that just looks AI-generated
//   SLOP_AI_MAX       default 70  — (strict mode) block if aiLikelihood exceeds this
//   GUARD_FAIL_CLOSED default 0   — if 1, block when the check can't run (API down/no key)

const fs = require('fs');
const path = require('path');

const MIN_QUALITY = Number(process.env.SLOP_MIN_QUALITY ?? 55);
const STRICT_AI = String(process.env.SLOP_STRICT_AI ?? '0') === '1';
const AI_MAX = Number(process.env.SLOP_AI_MAX ?? 70);
const FAIL_CLOSED = String(process.env.GUARD_FAIL_CLOSED ?? '0') === '1';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

const RUBRIC = `You are a strict creative-quality gate for a premium brand (Growth Terminal) running PAID ads.
Decide whether the image is "AI slop": low-quality or obviously AI-generated imagery unsuitable for professional paid advertising.

Look hard for these slop signals:
- garbled, misspelled, or warped/melted text and letterforms
- distorted or extra fingers/hands/limbs; malformed faces, eyes, or teeth
- fused, asymmetric, or nonsensical objects; impossible geometry or reflections
- plastic/waxy over-smooth "AI skin"; uncanny lighting
- generator artifacts, watermarks, or a generic "AI stock" vibe
- background details that make no sense on close inspection

IMPORTANT: A clean typographic / graphic-design layout with correct, crisp text is NOT slop — do not penalize good design or real photography.

Return STRICT JSON only, no prose:
{"aiLikelihood": <0-100 how clearly AI-generated it looks>, "quality": <0-100 craft/quality for a paid ad>, "slop": <true|false>, "flags": [<short strings>], "reason": "<one sentence>"}`;

function toDataUrl(imgPath) {
  const ext = path.extname(imgPath).toLowerCase();
  const mime = MIME[ext] || 'image/jpeg';
  const b64 = fs.readFileSync(imgPath).toString('base64');
  return { dataUrl: `data:${mime};base64,${b64}`, mime, b64 };
}

function parseJson(text) {
  const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON in model reply');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOpenAI(imgPath) {
  const model = process.env.VISION_MODEL || 'gpt-4o-mini';
  const { dataUrl } = toDataUrl(imgPath);
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RUBRIC },
        { role: 'user', content: [
          { type: 'text', text: 'Assess this image for a paid ad. Return the JSON.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] },
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return parseJson(data.choices?.[0]?.message?.content ?? '');
}

async function callAnthropic(imgPath) {
  const model = process.env.VISION_MODEL || 'claude-sonnet-4-latest';
  const { b64, mime } = toDataUrl(imgPath);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0,
      system: RUBRIC,
      messages: [
        { role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
          { type: 'text', text: 'Assess this image for a paid ad. Return the JSON only.' },
        ] },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  return parseJson(text);
}

function decide(v) {
  const reasons = [];
  if (v.slop === true) reasons.push('flagged as slop');
  if (typeof v.quality === 'number' && v.quality < MIN_QUALITY) reasons.push(`quality ${v.quality} < ${MIN_QUALITY}`);
  if (STRICT_AI && typeof v.aiLikelihood === 'number' && v.aiLikelihood > AI_MAX) reasons.push(`aiLikelihood ${v.aiLikelihood} > ${AI_MAX}`);
  return { block: reasons.length > 0, why: reasons.join('; ') };
}

/** assess(imagePath) -> { ok, block, verdict, why, error? } */
async function assess(imagePath) {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  if (!hasOpenAI && !hasAnthropic) {
    return { ok: false, block: FAIL_CLOSED, verdict: null, why: 'no vision key set', error: 'no-key' };
  }
  try {
    const verdict = hasOpenAI ? await callOpenAI(imagePath) : await callAnthropic(imagePath);
    const d = decide(verdict);
    return { ok: true, block: d.block, verdict, why: d.why || 'clean' };
  } catch (e) {
    // Fail-open by default so a flaky API never stops your posting — unless GUARD_FAIL_CLOSED=1.
    return { ok: false, block: FAIL_CLOSED, verdict: null, why: 'check failed', error: String(e.message || e) };
  }
}

/** guard(imagePath) -> logs rejections and returns { block, verdict } */
async function guard(imagePath, logFile = 'slop_rejected_log.json') {
  const res = await assess(imagePath);
  if (res.block) {
    const rec = { at: new Date().toISOString(), image: imagePath, why: res.why, verdict: res.verdict };
    let log = [];
    try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    log.push(rec);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    console.warn(`🛑 SLOP BLOCKED: ${path.basename(imagePath)} — ${res.why}`);
  } else if (res.error) {
    console.warn(`⚠️  slop-guard could not check ${path.basename(imagePath)} (${res.error}) — ${res.block ? 'blocking (fail-closed)' : 'allowing (fail-open)'}`);
  }
  return res;
}

/** audit(dir) -> scans images, writes slop_blocklist.json */
async function audit(dir) {
  const exts = new Set(Object.keys(MIME));
  const files = fs.readdirSync(dir).filter((f) => exts.has(path.extname(f).toLowerCase()));
  const blocklist = [];
  const report = [];
  console.log(`Auditing ${files.length} image(s) in ${dir} ...\n`);
  for (const f of files) {
    const full = path.join(dir, f);
    const res = await assess(full);
    const tag = res.block ? '🛑 SLOP' : (res.error ? '⚠️  skip' : '✅ ok');
    const q = res.verdict?.quality ?? '?';
    const ai = res.verdict?.aiLikelihood ?? '?';
    console.log(`${tag}  ${f}  (quality ${q}, aiLikelihood ${ai}) ${res.why}`);
    report.push({ file: f, ...res });
    if (res.block) blocklist.push(f);
  }
  fs.writeFileSync('slop_blocklist.json', JSON.stringify(blocklist, null, 2));
  fs.writeFileSync('slop_audit_report.json', JSON.stringify(report, null, 2));
  console.log(`\nWrote slop_blocklist.json (${blocklist.length} blocked) and slop_audit_report.json`);
}

module.exports = { assess, guard, audit };

// ---- CLI ----
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args[0] === '--audit') {
      await audit(args[1] || 'creatives');
    } else if (args[0]) {
      const res = await assess(args[0]);
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.block ? 2 : 0);
    } else {
      console.log('Usage:\n  node slop-guard.js <image>\n  node slop-guard.js --audit [dir]');
    }
  })();
}
