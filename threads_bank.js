// threads_bank.js — Growth Terminal / Markus Reid (@markusreidgt)
// COPYWRITING ENGINE. Every entry is built on a proven direct-response structure
// (PAS, AIDA, BAB, myth-bust, callout, how-to-without, framework-drop, story→lesson,
// FAB, listicle, sticky one-liner). Teach-first, soft funnel (~80% value / ~20% offer).
//
// Contract (unchanged, drop-in): exports { FORMATS, THREADS, SYMPTOM_DISEASE, CEILINGS, SOFT_CTA }.
//   FORMATS: [{ pillar, kind, render: () => string }]         single posts, <=500 chars
//   THREADS: [{ pillar, kind:'thread', thread: () => string[] }]  reply chains
// The generator combines them: POOL = [...FORMATS, ...THREADS].

// ---------- helpers ----------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
};
const art = (w) => (/^[aeiou]/i.test(String(w).trim()) ? 'an' : 'a'); // a/an grammar
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clamp = (s) => { // safety net so nothing ever exceeds the 500-char Threads cap
  s = String(s).trim();
  return s.length <= 500 ? s : s.slice(0, 497).replace(/\s+\S*$/, '') + '…';
};

// ---------- content pools (the growth-marketing substance) ----------

// symptom → the real constraint → the one-line fix. Powers PAS / callout / reframe / diagnosis.
const CONSTRAINTS = [
  { sym: 'We need more traffic', real: 'conversion problem', fix: "pouring more water into a leaking bucket just wastes more water" },
  { sym: 'Our content isn\u2019t working', real: 'distribution problem', fix: "the post isn\u2019t weak, the spread is" },
  { sym: 'We need a rebrand', real: 'positioning problem', fix: "people don\u2019t buy prettier, they buy clearer" },
  { sym: 'Sales are slow', real: 'offer problem', fix: "a weak offer to the right list still loses \u2014 fix what you sell first" },
  { sym: 'Churn is killing us', real: 'onboarding problem', fix: "people don\u2019t leave what they\u2019ve actually activated" },
  { sym: 'We need to post more', real: 'hook problem', fix: "ten posts nobody stops for is still zero" },
  { sym: 'Ads are too expensive', real: 'message-market-match problem', fix: "you\u2019re not overpaying for clicks, you\u2019re underpaying attention" },
  { sym: 'We\u2019re just not growing', real: 'retention problem', fix: "growth is retention with a smaller leak" },
];

// named mechanisms Markus "owns" — the vocabulary of an authority.
const MECHANISMS = [
  { name: 'the 10-minute constraint diagnosis', line: "Map your funnel. Find the biggest drop. Fix only that. Everything else is a distraction this week." },
  { name: 'funnel math', line: "You don\u2019t have a traffic problem or a sales problem. You have one number that\u2019s lowest. Move that number." },
  { name: 'distribution over creation', line: "Spend 20% making it and 80% getting it seen. Most people invert that and wonder why it died." },
  { name: 'the one-metric week', line: "Pick the single metric your constraint lives in. Move only that for 7 days. Ignore the rest." },
  { name: 'retention-first growth', line: "Plug the leak before you scale the pour. Acquisition on top of churn is a bucket with holes." },
  { name: 'offer before audience', line: "A clear offer to 100 people beats a clever brand to 10,000. Nail what you sell before who sees it." },
];

// sticky one-liners (retained + sharpened). Copywriting: specificity + reframe.
const APHORISMS = [
  "Growth is just retention with a smaller leak.",
  "You don\u2019t have a traffic problem. You have a \u201clowest number in the funnel\u201d problem.",
  "Distribution beats creation. The best post nobody sees loses to the average post everyone does.",
  "A rebrand is what companies do instead of fixing their positioning.",
  "A clever brand with no offer loses to a clear offer with no brand.",
  "You\u2019re not overpaying for clicks. You\u2019re underpaying attention.",
  "More content can\u2019t out-run a weak offer.",
  "The metric you avoid looking at is usually your constraint.",
];

// hook openers (line 1 stops the scroll).
const CALLOUTS = [
  "If you\u2019re posting every day and still flat, read this.",
  "If your traffic is fine but sales aren\u2019t, this is for you.",
  "Founders who \u201cneed more reach\u201d almost never do. Here\u2019s why.",
  "If you\u2019re about to spend on ads, stop for 30 seconds.",
];

// soft, non-salesy follow CTAs (value posts). Funnel = attention.
const SOFT_CTA = [
  "Follow @markusreidgt for the growth stuff nobody spells out.",
  "I post the growth playbook in plain English. Follow along.",
  "More of these on @markusreidgt.",
  "Save this. Follow for the rest of the system.",
];

// soft OFFER CTAs (~20% of posts) — funnel to the System / diagnosis.
const OFFER_CTA = [
  "The full System \u2014 playbook + tracker \u2014 is here \u2192 www.growthterminal.io/system",
  "Want the 10-minute diagnosis as a done-for-you system? \u2192 www.growthterminal.io/system",
  "The Growth Hacking System runs this for you, step by step \u2192 www.growthterminal.io/system",
  "Stop guessing. The System names your #1 constraint and fixes it \u2192 www.growthterminal.io/system",
];

// kept for compatibility / dashboard use
const SYMPTOM_DISEASE = CONSTRAINTS.map((c) => ({ symptom: c.sym, constraint: c.real }));
const CEILINGS = ['traffic', 'conversion', 'retention', 'pricing', 'positioning', 'offer', 'distribution', 'activation'];

// ---------- FORMATS (single posts, each = a copywriting framework) ----------
const FORMATS = [
  // PAS — Problem, Agitate, Solution
  { pillar: 'constraint', kind: 'pas', render: () => { const c = pick(CONSTRAINTS);
    return clamp(`\u201c${c.sym}.\u201d\n\nNo \u2014 that\u2019s the symptom.\n\nThe real problem is ${art(c.real)} ${c.real}. And more effort on the wrong lever just makes the drop steeper.\n\nFix it at the source: ${c.fix}.`); } },

  // Callout — name the reader, name the pain, redirect
  { pillar: 'decision', kind: 'callout', render: () => { const c = pick(CONSTRAINTS);
    return clamp(`${pick(CALLOUTS)}\n\nThe problem usually isn\u2019t effort. It\u2019s aim.\n\n\u201c${c.sym}\u201d feels like the issue. It\u2019s ${art(c.real)} ${c.real}.\n\nPoint the same effort at the real constraint and it finally moves.`); } },

  // Myth-bust
  { pillar: 'bi', kind: 'myth', render: () => pick([
    clamp(`\u201cThe answer is always more content.\u201d\n\nWrong.\n\nMore of a post nobody stops for is just more zero. The lever isn\u2019t volume \u2014 it\u2019s the hook and the spread. Fix what makes people stop, then scale it.`),
    clamp(`\u201cWe need more traffic.\u201d\n\nAlmost never true.\n\nMost businesses leak the traffic they already have. A 2% \u2192 4% conversion bump doubles sales with zero new visitors. Find the leak before you buy the water.`),
    clamp(`\u201cBrand awareness will fix it.\u201d\n\nRarely.\n\nPeople don\u2019t buy because they\u2019ve heard of you. They buy because the offer is clear and the timing is right. Clarity outsells awareness every time.`),
  ]) },

  // Sticky one-liner (aphorism)
  { pillar: 'constraint', kind: 'aphorism', render: () => pick(APHORISMS) },

  // How-to-without
  { pillar: 'playbook', kind: 'howto', render: () => pick([
    clamp(`How to grow without posting more:\n\n1. Find the funnel stage with the biggest drop.\n2. Fix only that.\n3. Watch the same traffic convert harder.\n\nMore reach can\u2019t fix a leak.`),
    clamp(`How to write a hook without guessing:\n\n1. Name the exact person.\n2. Name the exact pain.\n3. Promise the exact outcome.\n\n\u201cFor founders flat after 90 days of posting: your problem isn\u2019t reach.\u201d`),
    clamp(`How to raise prices without losing customers:\n\n1. Add one outcome they actually want.\n2. Name it on the page.\n3. Charge for the outcome, not the hours.\n\nPeople pay for the result, not your time.`),
  ]) },

  // Framework-drop — name the mechanism, make it his
  { pillar: 'systems', kind: 'framework', render: () => { const m = pick(MECHANISMS);
    return clamp(`The move most people skip: ${m.name}.\n\n${m.line}\n\nDo this before you touch anything else.`); } },

  // Numbered playbook
  { pillar: 'systems', kind: 'playbook', render: () => pick([
    clamp(`Find your #1 growth constraint in 10 minutes:\n\n1. List your funnel: reach \u2192 clicks \u2192 leads \u2192 sales.\n2. Put the % next to each stage.\n3. Circle the lowest.\n\nThat\u2019s your constraint. Work only there this week.`),
    clamp(`Turn a flat account around in 3 moves:\n\n1. Cut every first line that doesn\u2019t stop the scroll.\n2. Post one idea three ways; keep the winner.\n3. Send all attention to ONE offer.\n\nFocus beats volume.`),
  ]) },

  // BAB — Before, After, Bridge
  { pillar: 'decision', kind: 'bab', render: () => clamp(
    `Before: you post daily, refresh likes, feel busy, grow nothing.\n\nAfter: you post less, move one number a week, and it compounds.\n\nThe bridge is a diagnosis \u2014 stop guessing which lever, find the constraint, pull only that.`) },

  // Story → lesson (operator voice)
  { pillar: 'authority', kind: 'story', render: () => pick([
    clamp(`A founder swore he needed more traffic.\n\nWe looked. Traffic was fine \u2014 4% of visitors bought, and the buy button sat below the fold on mobile.\n\nMoved the button. Same traffic. Sales up.\n\nLesson: measure before you spend.`),
    clamp(`Saw an account posting twice a day, going nowhere.\n\nThe posts were good. The first lines were wallpaper.\n\nWe rewrote only line one for a week. Same content \u2014 3x the stops.\n\nThe hook is the whole game.`),
  ]) },

  // Reframe (symptom → disease)
  { pillar: 'constraint', kind: 'reframe', render: () => { const c = pick(CONSTRAINTS);
    return clamp(`\u201c${c.sym}\u201d usually isn\u2019t what it looks like.\n\nIt\u2019s ${art(c.real)} ${c.real}.\n\n${cap(c.fix)}.`); } },

  // Listicle
  { pillar: 'bi', kind: 'list', render: () => pick([
    clamp(`3 growth truths nobody posts:\n\n1. More content can\u2019t fix a weak offer.\n2. Retention is cheaper than acquisition. Every time.\n3. The metric you avoid is usually the constraint.\n\nSave it.`),
    clamp(`4 things that look like marketing problems but aren\u2019t:\n\n\u2022 \u201cNeed traffic\u201d \u2192 conversion\n\u2022 \u201cNeed a rebrand\u201d \u2192 positioning\n\u2022 \u201cPost more\u201d \u2192 hooks\n\u2022 \u201cSales slow\u201d \u2192 the offer\n\nDiagnose before you spend.`),
  ]) },

  // AIDA — compact
  { pillar: 'decision', kind: 'aida', render: () => clamp(
    `Your funnel has one weakest number. (Attention)\n\nEverything you\u2019re doing to \u201cgrow\u201d that isn\u2019t moving it is noise. (Interest)\n\nFix that one number and the whole thing lifts \u2014 same traffic, same spend. (Desire)\n\nMap it today. Circle the lowest %. Start there. (Action)`) },

  // Value + soft follow (still teaching; funnel = attention)
  { pillar: 'systems', kind: 'value_cta', render: () => { const m = pick(MECHANISMS);
    return clamp(`${cap(m.name)}:\n\n${m.line}\n\n${pick(SOFT_CTA)}`); } },

  // ---- OFFER (~20%): soft funnel to the System / diagnosis ----
  { pillar: 'solution', kind: 'offer', render: () => clamp(
    `The 10-minute constraint diagnosis, in 3 steps:\n\n1. Map your funnel.\n2. Find the biggest drop.\n3. Fix only that this week.\n\n${pick(OFFER_CTA)}`) },

  { pillar: 'product', kind: 'offer', render: () => clamp(
    `I built a system that finds your #1 growth constraint and hands you the fix.\n\nNot another dashboard of numbers \u2014 a diagnosis that tells you the one thing to work on.\n\nSo you stop guessing and move one metric a week. ${pick(OFFER_CTA)}`) },

  { pillar: 'solution', kind: 'offer', render: () => { const c = pick(CONSTRAINTS);
    return clamp(`Most \u201cgrowth\u201d advice is a pile of tactics with no diagnosis.\n\n\u201c${c.sym}\u201d? The real issue is ${art(c.real)} ${c.real} \u2014 and you can\u2019t fix what you haven\u2019t named.\n\nThe System names it, then fixes it. ${pick(OFFER_CTA)}`); } },
];

// ---------- THREADS (reply-chain deep-dives; framework-driven) ----------
const THREADS = [
  // PAS deep-dive: the traffic myth
  { pillar: 'constraint', kind: 'thread', thread: () => [
    clamp(`Everyone thinks they have a traffic problem.\n\nAlmost nobody does.\n\nA short thread on finding the real constraint \u2014 and growing without spending a cent more \ud83d\udc47`),
    clamp(`Symptom: \u201cwe need more people.\u201d\n\nReality: you\u2019re leaking the people you already have. More water into a bucket with holes just wastes more water.`),
    clamp(`Do this: list your funnel \u2014 reach \u2192 clicks \u2192 leads \u2192 sales. Put the % conversion next to each stage.`),
    clamp(`The lowest % is your constraint. Not your opinion \u2014 the number. That\u2019s where every hour should go this week.`),
    clamp(`Fix that one stage and the same traffic converts harder. That\u2019s growth with zero new spend.\n\n${pick(OFFER_CTA)}`),
  ] },

  // Framework-drop deep-dive: distribution > creation
  { pillar: 'systems', kind: 'thread', thread: () => [
    clamp(`Your content isn\u2019t the problem.\n\nYour distribution is.\n\nWhy great posts die and average posts win \ud83d\udc47`),
    clamp(`Most people spend 80% making the thing and 20% getting it seen.\n\nWinners invert it: make it good enough, then spend the real effort on reach.`),
    clamp(`Reach levers nobody uses: strong first line, posting when your people are awake, replying to bigger accounts, and repurposing the same idea across platforms.`),
    clamp(`Same idea, 5 formats, 5 days. Keep the one that pops. Kill the rest. That\u2019s a distribution system, not luck.`),
    clamp(`Creation gets you a post. Distribution gets you a business. Build the second one.\n\n${pick(SOFT_CTA)}`),
  ] },

  // Story → lesson: the hook rewrite
  { pillar: 'authority', kind: 'thread', thread: () => [
    clamp(`I turned a dead account around by changing one thing.\n\nNot the topic. Not the frequency.\n\nThe first line \ud83d\udc47`),
    clamp(`The posts were genuinely good. But every one opened with wallpaper \u2014 \u201cToday I want to talk about\u2026\u201d\n\nNobody stops for a warm-up.`),
    clamp(`We rewrote only line one for a week:\n\n\u2022 name the person\n\u2022 name the pain\n\u2022 promise the outcome\n\nSame body copy underneath.`),
    clamp(`Stops tripled. Same content. The hook was the entire bottleneck.\n\nYour best idea with a weak first line is a tree falling in an empty forest.`),
    clamp(`Rule: spend as long on line one as you spend on the other ten.\n\n${pick(SOFT_CTA)}`),
  ] },

  // Retention-first
  { pillar: 'constraint', kind: 'thread', thread: () => [
    clamp(`Stop trying to grow.\n\nStart trying to leak less.\n\nThe retention-first playbook \ud83d\udc47`),
    clamp(`Acquisition on top of churn is a bucket with holes. You pour faster, it drains faster, you burn cash feeling busy.`),
    clamp(`Find your leak: where do people go quiet? Signup \u2192 first use? First use \u2192 habit? Habit \u2192 renewal? One of those is bleeding.`),
    clamp(`Fix onboarding first. People don\u2019t abandon what they\u2019ve actually activated. Get them to the \u201caha\u201d fast and churn drops on its own.`),
    clamp(`Then \u2014 and only then \u2014 scale acquisition. Growth is retention with a smaller leak.\n\n${pick(OFFER_CTA)}`),
  ] },

  // The one-metric week
  { pillar: 'systems', kind: 'thread', thread: () => [
    clamp(`The reason you feel busy and flat:\n\nyou\u2019re moving ten metrics an inch instead of one metric a mile.\n\nThe one-metric week \ud83d\udc47`),
    clamp(`Pick the single number your constraint lives in. Just one. Conversion, or reply rate, or activation \u2014 whatever\u2019s lowest.`),
    clamp(`For 7 days, every action has to move THAT number. If a task doesn\u2019t touch it, it waits.`),
    clamp(`This kills the real enemy: shallow effort spread across everything. Depth on one lever beats a thin layer on ten.`),
    clamp(`Next week, new constraint, new metric. That\u2019s a system, not a scramble.\n\n${pick(SOFT_CTA)}`),
  ] },
];

module.exports = { FORMATS, THREADS, SYMPTOM_DISEASE, CEILINGS, SOFT_CTA };
