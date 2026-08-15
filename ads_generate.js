/**
 * ads_generate.js: take the next video ad out of the queue and prepare it.
 *
 * You drop .mp4 files into ads/queue on your own machine and sync. Once a day
 * this picks the oldest one that has not gone out, checks it is something
 * Instagram will actually accept, cuts a cover frame, chooses a caption, and
 * writes ads_meta.json for ads_post.py to publish.
 *
 * Three decisions worth recording.
 *
 * It validates before Meta does. The Reels endpoint accepts a video and then
 * fails asynchronously minutes later inside a container status poll, which is a
 * miserable way to find out the file was 4:3 or eleven minutes long. ffprobe
 * knows all of it in about forty milliseconds, so the run stops here with a
 * sentence you can act on instead of there with a status code.
 *
 * It takes the cover from one second in, not from frame zero. Ads very often
 * open on black or on a fade, and a black cover in the grid is a wasted
 * impression.
 *
 * It never deletes your file, and it archives on a delay. A published ad is
 * moved to ads/posted at the START of the next run, not at the end of its own.
 * Moving it immediately would be tidier and wrong: Meta fetches the video from
 * its raw URL, and Facebook in particular is still pulling the file after the
 * API call returns. Move it too early and the URL 404s mid download, which
 * fails in a way that looks like a Facebook problem and is not. The posted log
 * is what prevents a repeat, so the file can sit in the queue harmlessly until
 * tomorrow.
 *
 * Exit codes: 0 published something to publish, 78 nothing to do (an empty
 * queue is not a failure), 1 a real problem.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { ADS, TAGS } = require('./ads_bank')

const QUEUE = 'ads/queue'
const POSTED = 'ads/posted'
const COVERS = 'ads/covers'
const META = 'ads_meta.json'
const USED = 'ads_used_log.json'
const POSTED_LOG = 'ads_posted_log.json'

const NOTHING_TO_DO = 78

/* What the Instagram Reels endpoint actually accepts. Checked here so a bad
   file is a one line message now rather than a failed container later.
   Duration and aspect are the two that catch real ads. */
const LIMITS = {
  maxBytes: 95 * 1024 * 1024,   // GitHub refuses over 100MB; leave headroom
  minSeconds: 3,
  maxSeconds: 900,              // Reels accepts up to 15 minutes
  minAspect: 0.01,
  maxAspect: 10
}

const VIDEO = /\.(mp4|mov)$/i

function die(msg) { console.error('✗ ' + msg); process.exit(1) }

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

function probe(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height',
    file
  ], { encoding: 'utf8' })
  const j = JSON.parse(out)
  const v = (j.streams || []).find(s => s.codec_type === 'video')
  const a = (j.streams || []).find(s => s.codec_type === 'audio')
  if (!v) throw new Error('no video stream')
  return {
    seconds: Number((j.format || {}).duration || 0),
    bytes: Number((j.format || {}).size || 0),
    width: Number(v.width || 0),
    height: Number(v.height || 0),
    codec: v.codec_name || '',
    audio: a ? (a.codec_name || '') : ''
  }
}

function check(p) {
  const problems = []
  if (p.bytes > LIMITS.maxBytes) {
    problems.push('it is ' + (p.bytes / 1048576).toFixed(0) + 'MB, and anything near 100MB cannot live in the repo')
  }
  if (p.seconds < LIMITS.minSeconds) problems.push('it is ' + p.seconds.toFixed(1) + 's, under the 3s minimum')
  if (p.seconds > LIMITS.maxSeconds) problems.push('it is ' + Math.round(p.seconds) + 's, over the 15 minute maximum')
  if (!p.width || !p.height) problems.push('its dimensions could not be read')
  const aspect = p.width && p.height ? p.width / p.height : 0
  if (aspect && (aspect < LIMITS.minAspect || aspect > LIMITS.maxAspect)) {
    problems.push('its aspect ratio is ' + aspect.toFixed(2) + ', outside what Reels accepts')
  }
  /* Not fatal, but the single most common reason a Reel looks wrong: a
     landscape ad gets centre cropped to 9:16 and loses both edges. */
  const warnings = []
  if (aspect > 1.05) warnings.push('this is landscape (' + p.width + 'x' + p.height + '), so Instagram will crop the sides')
  if (!p.audio) warnings.push('it has no audio track, which some Reels placements treat as lower quality')
  if (p.codec && !/h264|hevc|h265/i.test(p.codec)) warnings.push('the video codec is ' + p.codec + ', and Meta is happiest with H.264')
  return { problems, warnings, aspect }
}

/* One second in, or the midpoint of anything shorter than two seconds. Ads
   open on black far too often for frame zero to be a safe cover. */
function cutCover(video, dest, seconds) {
  const at = seconds > 2 ? 1 : Math.max(0, seconds / 2)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', video,
    '-frames:v', '1', '-q:v', '3', dest])
  if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) throw new Error('cover frame came out empty')
}

/* Rotate through the bank, never repeating until every line has been used.
   Same approach as the organic engine's used_log: remember what went out, and
   when the list is exhausted, start again. */
function pickCaption(usedIds) {
  const fresh = ADS.filter(a => !usedIds.includes(a.id))
  const pool = fresh.length ? fresh : ADS
  return pool[0]
}

/** Names of ads that have already gone out, from the publish log. */
function alreadyPosted() {
  const log = readJson(POSTED_LOG, [])
  return new Set((Array.isArray(log) ? log : []).map(r => r && r.file).filter(Boolean))
}

/** Move anything already published out of the queue. Runs at the start, so by
 *  now Meta has long finished fetching whatever went out last time. */
function sweep(posted) {
  if (!fs.existsSync(QUEUE)) return
  fs.mkdirSync(POSTED, { recursive: true })
  for (const f of fs.readdirSync(QUEUE)) {
    if (!posted.has(f)) continue
    const from = path.join(QUEUE, f)
    let to = path.join(POSTED, f)
    if (fs.existsSync(to)) to = path.join(POSTED, Date.now() + '_' + f)
    fs.renameSync(from, to)
    console.log('archived ' + f + ' from a previous run')
    const side = from.replace(VIDEO, '.txt')
    if (fs.existsSync(side)) fs.renameSync(side, path.join(POSTED, path.basename(side)))
  }
}

function main() {
  const posted = alreadyPosted()
  sweep(posted)

  if (!fs.existsSync(QUEUE)) {
    console.log('No ' + QUEUE + ' directory. Nothing to post.')
    process.exit(NOTHING_TO_DO)
  }

  const files = fs.readdirSync(QUEUE)
    .filter(f => VIDEO.test(f))
    /* Belt and braces: even if the sweep failed, nothing in the log goes
       out twice. */
    .filter(f => !posted.has(f))
    .map(f => ({ f, full: path.join(QUEUE, f), t: fs.statSync(path.join(QUEUE, f)).mtimeMs }))
    /* Oldest first, so the queue behaves like a queue. */
    .sort((a, b) => a.t - b.t)

  if (!files.length) {
    console.log('Queue is empty. Nothing to post today.')
    process.exit(NOTHING_TO_DO)
  }

  const pick = files[0]
  console.log('next in queue: ' + pick.f + '  (' + (files.length - 1) + ' behind it)')

  let p
  try { p = probe(pick.full) } catch (e) { die('Could not read ' + pick.f + ': ' + e.message) }

  const { problems, warnings, aspect } = check(p)
  console.log('  ' + p.width + 'x' + p.height + '  ' + p.seconds.toFixed(1) + 's  ' +
    (p.bytes / 1048576).toFixed(1) + 'MB  ' + p.codec + (p.audio ? ' + ' + p.audio : ' (silent)'))
  warnings.forEach(w => console.log('  ! ' + w))
  if (problems.length) {
    die('Instagram will not accept ' + pick.f + ': ' + problems.join('; ') +
      '.\n  Move it out of ' + QUEUE + ' or re-export it, then run again.')
  }

  /* A .txt beside the video wins over the bank, so an ad that was scripted
     with its own words can carry them. */
  const sidecar = pick.full.replace(VIDEO, '.txt')
  let caption, firstComment, source
  if (fs.existsSync(sidecar)) {
    caption = fs.readFileSync(sidecar, 'utf8').trim()
    firstComment = ''
    source = 'sidecar ' + path.basename(sidecar)
    if (!caption) die(path.basename(sidecar) + ' is empty. Write the caption or delete the file.')
  } else {
    const used = readJson(USED, [])
    const chosen = pickCaption(used)
    caption = chosen.caption
    firstComment = chosen.fc
    source = 'bank ' + chosen.id
    used.push(chosen.id)
    fs.writeFileSync(USED, JSON.stringify(used.slice(-200), null, 2) + '\n')
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const cover = path.join(COVERS, 'cover_' + stamp + '.jpg')
  try { cutCover(pick.full, cover, p.seconds) } catch (e) { die('Could not cut a cover frame: ' + e.message) }

  const meta = {
    generated_at: new Date().toISOString(),
    kind: 'ad',
    source_file: pick.f,
    video_file: pick.full,
    media_file: cover,
    is_reel: true,
    layout: 'ad',
    caption,
    hashtags: TAGS,
    first_comment: firstComment,
    alt_text: 'Growth Terminal video ad',
    width: p.width,
    height: p.height,
    seconds: Number(p.seconds.toFixed(1)),
    aspect: Number(aspect.toFixed(3)),
    caption_source: source,
    queue_remaining: files.length - 1
  }
  fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n')

  console.log('  caption: ' + source)
  console.log('  cover:   ' + cover)
  console.log('  wrote ' + META)
}

main()
