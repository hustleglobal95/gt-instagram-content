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
// ---------- numbered-rules reply chain ----------
// A high-retention Threads structure. Anatomy of each post:
//   "N. THE X RULE"  ->  2-sentence body  ->  standalone kicker  ->  (n/7) counter
// Five rules are drawn fresh from the pool per run, so the chain never repeats.
const RULES = [
  { n: 'THE DIAGNOSIS RULE',
    b: 'Name the constraint before you touch a tactic. Effort aimed at the wrong stage doesn’t just waste the money, it hides the real leak for another quarter.',
    k: 'Diagnose first. The rest is guessing.' },
  { n: 'THE ONE LEVER RULE',
    b: 'Pick the single lowest number in your funnel, not five things to improve. Ten half-fixes cancel out. One full fix compounds.',
    k: 'One lever, all week.' },
  { n: 'THE LEAK RULE',
    b: 'More traffic into a leaking funnel just leaks faster. If 2% convert, doubling visitors doubles the waste right along with it.',
    k: 'Plug it before you pour.' },
  { n: 'THE SYMPTOM RULE',
    b: '“We need a rebrand” is a positioning problem. “Sales are slow” is usually the offer. The complaint is never the constraint.',
    k: 'Treat the disease, not the noise.' },
  { n: 'THE SCORECARD RULE',
    b: 'Write the forecast down before you start, then go back and check it. A diagnosis you never verify is a horoscope.',
    k: 'Keep score or you’re telling stories.' },
  { n: 'THE PRICE-IT RULE',
    b: 'Put a dollar figure on the gap you found. “Fix the lead step” is a shrug. “The lead step costs us $216k a year” is a decision.',
    k: 'A constraint you can price is one you’ll actually fix.' },
  { n: 'THE DISTRIBUTION RULE',
    b: 'Spend 20% making it and 80% getting it seen. Most people invert that, then wonder why the best thing they wrote died quietly.',
    k: 'Reach is a job, not a hope.' },
  { n: 'THE HOOK RULE',
    b: 'Spend as long on line one as on the other ten. Your best idea with a weak opener is a tree falling in an empty forest.',
    k: 'No stop, no read, no growth.' },
  { n: 'THE RETENTION RULE',
    b: 'Plug the leak before you scale the pour. Acquisition on top of churn is a bucket with holes and a bigger hose.',
    k: 'Growth is retention with a smaller leak.' },
  { n: 'THE ACTIVATION RULE',
    b: 'People don’t churn at the end, they churn at the beginning. Get them to the first real win fast and the rest takes care of itself.',
    k: 'Nobody leaves what they’ve actually used.' },
  { n: 'THE PRICING RULE',
    b: 'A price change needs no new leads, no new hires, no new channel. It’s the fastest lever you own and the one you’ll avoid longest.',
    k: 'Same traffic, different number.' },
  { n: 'THE OFFER RULE',
    b: 'A clear offer to 100 people beats a clever brand to 10,000. Fix what you’re selling before you fix who sees it.',
    k: 'Nail the what before the who.' },
  { n: 'THE KILL-DATE RULE',
    b: 'Set a budget, a success threshold and a kill date before any test. A test without a kill criterion isn’t a test, it’s a slow leak.',
    k: 'Decide how it ends before it begins.' },
  { n: 'THE ONE-METRIC RULE',
    b: 'Move one number a mile instead of ten numbers an inch. If a task doesn’t touch this week’s metric, it waits.',
    k: 'Depth on one beats a thin layer on ten.' },
  { n: 'THE COMPOUND RULE',
    b: 'Fix the biggest leak, then run the diagnosis again, because the constraint moves. Chasing one at a time is what makes gains stack instead of cancel.',
    k: 'The constraint always moves. Follow it.' },
  { n: 'THE EVIDENCE RULE',
    b: '“It feels like it’s working” is not a result. Pick the number before you start so you can’t move the goalposts afterward.',
    k: 'Feelings aren’t findings.' },
];

const RULE_HOOKS = [
  () => `Everyone thinks they have a traffic problem.\n\nAlmost nobody does.\n\n5 rules for finding what’s actually capping your growth 👇`,
  () => `Most growth advice is a pile of tactics with no diagnosis.\n\n5 rules that fix that 👇`,
  () => `You don’t have a growth problem.\n\nYou have a diagnosis problem.\n\n5 rules I’d give any founder who feels stuck 👇`,
  () => `Ten scattered tactics cancel out.\n\nOne named constraint compounds.\n\n5 rules for telling the difference 👇`,
];

const RULE_CLOSES = [
  () => `Five rules, one idea:\n\nFind the one thing capping you. Fix only that. Then prove it moved.\n\nThat’s the whole system. (7/7)`,
  () => `If you keep one line from this:\n\nthe complaint is never the constraint.\n\nDiagnose before you spend. (7/7)`,
  () => `That’s the loop:\n\ndiagnose → fix one thing → check whether it moved.\n\nRun it weekly and it compounds. (7/7)`,
  () => `Run the loop weekly and the gains stack instead of cancel.\n\n${pick(OFFER_CTA)} (7/7)`,
];

const rulesThread = () => {
  const five = pickN(RULES, 5);
  const out = [clamp(pick(RULE_HOOKS)())];
  five.forEach((r, i) => out.push(clamp(`${i + 1}. ${r.n}\n\n${r.b}\n\n${r.k} (${i + 2}/7)`)));
  out.push(clamp(pick(RULE_CLOSES)()));
  return out;
};

const THREADS = [
  // Numbered-rules chain — scannable, high-retention (hook + 5 named rules + close)
  { pillar: 'playbook', kind: 'thread', thread: rulesThread },

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


// =============================================================================
// EXPANSION, August 2026
// -----------------------------------------------------------------------------
// Two jobs in this block.
//
//   1. Promo entries for the three things worth pointing at: the engine itself,
//      the AI solutions, and the new guide, Attract, Don’t Sell.
//   2. Enough teaching entries to keep the promo share where GT_THREADS_VOICE.md
//      puts it. The generator picks uniformly from the pool, so the promo RATE
//      is just promo entries over pool size. Four promo entries added to three
//      existing ones is seven of fifty, which holds the line at the ratio the
//      bank already ran at instead of tipping the feed into an ad.
//
// Variety without cost: each promo entry picks from several finished variants,
// so four pool slots carry a dozen distinct promo posts. Slots set the rate,
// variants set the range. Grow the teaching side before adding a fifth slot.
//
// Price is named in offer posts only. Teaching posts mention the guide and let
// the page do the rest.
// =============================================================================

// ---------- CTAs for the new destinations ----------
const GUIDE_CTA = [
  'Attract, Don’t Sell, the field guide → www.growthterminal.io/products/?p=attract-don-t-sell',
  'I wrote the whole method down → www.growthterminal.io/products/?p=attract-don-t-sell',
  'The 30-day attraction plan is in the guide → www.growthterminal.io/products/?p=attract-don-t-sell',
];

const SOLUTIONS_CTA = [
  'We build these for operators → www.growthterminal.io/ai-solutions',
  'Content, assistants, voice agents → www.growthterminal.io/ai-solutions',
  'The AI solutions that run this for you → www.growthterminal.io/ai-solutions',
];

const PLATFORM_CTA = [
  'Run the free diagnostic → www.growthterminal.io/diagnostic',
  'See how the engine reads a business → www.growthterminal.io/how-it-works',
  'Start with the free diagnostic, no card → www.growthterminal.io/diagnostic',
];

// ---------- pools for the teaching side ----------
const CEILING_SET = [
  { name: 'lead generation', tell: 'nobody new is arriving' },
  { name: 'conversion', tell: 'they arrive and leave' },
  { name: 'delivery', tell: 'you sell more than you can service' },
  { name: 'retention', tell: 'you refill the same bucket every month' },
];

const LEADING = [
  { lag: 'revenue', lead: 'qualified conversations booked' },
  { lag: 'churn', lead: 'accounts that hit first value in week one' },
  { lag: 'pipeline', lead: 'replies per hundred sends' },
  { lag: 'profit', lead: 'hours per delivered job' },
];

// ---------- promo entries (4 pool slots) ----------
const PROMO_FORMATS = [
  // 1. The guide, taught first. Product as the consequence of the insight.
  { pillar: 'product', kind: 'value_cta', render: () => pick([
    clamp(`Selling harder makes people trust you less.\n\nEvery extra push reads as a reason to doubt, because confident businesses do not chase.\n\nThe move is to be findable and obviously right, so the buyer arrives already sold.\n\n${pick(GUIDE_CTA)}`),
    clamp(`Demand does not start when someone is ready to buy.\n\nIt starts months earlier, when they are still describing the problem to themselves in their own words.\n\nWhoever is there for that conversation wins the sale later, without competing on price.\n\n${pick(GUIDE_CTA)}`),
    clamp(`Being the obvious choice is not a branding exercise.\n\nIt is what happens when one business has answered the question everyone else is still pitching around.\n\nYou do not win by being louder. You win by being the one already there.\n\n${pick(GUIDE_CTA)}`),
  ]) },

  // 2. The guide, direct. Price named here, and only here.
  { pillar: 'product', kind: 'offer', render: () => pick([
    clamp(`New: Attract, Don’t Sell.\n\nHow to build trust, create demand, and make your business the obvious choice.\n\nInside:\n• why pushing lowers trust\n• the content framework\n• demand before intent\n• a 30-day plan\n\nPDF guide, $55 one-time, 30-day guarantee → www.growthterminal.io/products/?p=attract-don-t-sell`),
    clamp(`If you are tired of chasing leads, I wrote the alternative down.\n\nAttract, Don’t Sell is a field guide for founders who want to be found instead: the trust framework, how to create demand before anyone is ready, and a 30-day plan you can start this week.\n\n$55 one-time → www.growthterminal.io/products/?p=attract-don-t-sell`),
    clamp(`Most guides tell you to post more.\n\nThis one tells you what to post, in what order, so buyers arrive already convinced.\n\nAttract, Don’t Sell. Positioning, demand creation, and a 30-day attraction plan.\n\n$55, one-time, 30-day guarantee → www.growthterminal.io/products/?p=attract-don-t-sell`),
  ]) },

  // 3. The AI solutions. Named plainly, because vagueness is what kills this pitch.
  { pillar: 'solution', kind: 'offer', render: () => pick([
    clamp(`Most businesses do not need more software.\n\nThey need the three jobs nobody has time for to just happen.\n\nSo that is what we build:\n• automated social content\n• custom AI assistants\n• AI voice agents\n\nSame team, same numbers, more output. ${pick(SOLUTIONS_CTA)}`),
    clamp(`Automate the thing you keep doing badly because you are tired, not the thing you enjoy.\n\nFor most operators that is posting, answering the same questions, and picking up the phone.\n\nWe build all three: content, assistants, voice agents. ${pick(SOLUTIONS_CTA)}`),
    clamp(`AI is not a strategy. It is a way to stop losing revenue to your own bandwidth.\n\nMissed calls, unanswered questions, a feed that went quiet in March. Each one has a number attached.\n\nFind the leak first, then automate exactly that. ${pick(SOLUTIONS_CTA)}`),
  ]) },

  // 4. The engine. What "grow further" actually means once the obvious is done.
  { pillar: 'product', kind: 'offer', render: () => pick([
    clamp(`You have done the obvious things. Growth flattened anyway.\n\nThat is normal. The obvious things move the metrics that were already fine.\n\nGrowth Terminal reads the whole business, names the one constraint holding the rest down, prices it, then checks the fix against real revenue.\n\n${pick(PLATFORM_CTA)}`),
    clamp(`A dashboard shows you numbers. It does not tell you which one to work on.\n\nThat gap is the whole product.\n\nGrowth Terminal finds the single constraint limiting revenue, puts a dollar figure on it, hands you a 90-day plan, and verifies the result.\n\n${pick(PLATFORM_CTA)}`),
    clamp(`More revenue from the business you already have.\n\nNot more traffic, not a rebrand. One constraint named, priced, fixed, and verified against what actually landed in the bank.\n\nThat is what the engine does, and it is why the plan comes with a number attached.\n\n${pick(PLATFORM_CTA)}`),
  ]) },
];

// ---------- teaching entries (22 single-post slots) ----------
const VALUE_FORMATS = [
  // Systems list: the four ceilings
  { pillar: 'systems', kind: 'ceilings', render: () => { const c = pick(CEILING_SET);
    return clamp(`Every business hits one of four ceilings:\n\n• lead generation\n• conversion\n• delivery\n• retention\n\nYou can tell which one you are on by the symptom. Right now ${c.tell}, so yours is ${c.name}.\n\nWork there. The other three are not your problem this quarter.`); } },

  // Authority pattern: the complaint is never the constraint
  { pillar: 'bi', kind: 'authority', render: () => pick([
    clamp(`After enough analyses you stop believing the complaint.\n\nWe keep seeing the same thing: the owner names the loudest number, and the constraint sits two stages upstream, quiet, unmeasured, doing all the damage.\n\nThe complaint is where it hurts. The constraint is where it started.`),
    clamp(`A pattern we keep seeing: the business that says it needs more leads is usually the one that never followed up on the last hundred.\n\nNothing is wrong with the top of the funnel. The follow-up step has no owner.\n\nCheck the boring stage before you buy traffic.`),
    clamp(`The businesses that grow fastest are rarely doing more things.\n\nThey are doing the same number of things, aimed at one stage, for long enough to see it move.\n\nWe keep seeing focus beat effort by a wide margin, and it is never the fun answer.`),
  ]) },

  // Progression
  { pillar: 'systems', kind: 'progression', render: () => pick([
    clamp(`The first million is acquisition.\n\nThe second is friction.\n\nThe third is almost always delivery, because you finally sold more than you can service and the cracks show up as churn.\n\nSame company, three different jobs. Most people keep running the first one.`),
    clamp(`Early on, growth is about being found.\n\nThen it is about being understood.\n\nThen it is about being kept.\n\nEach stage needs a different fix, and using the last stage’s playbook on this one is why growth feels stuck.`),
  ]) },

  // Diagnostic: three questions
  { pillar: 'decision', kind: 'diagnostic', render: () => pick([
    clamp(`Before you spend another dollar on ads, answer three things:\n\n1. What percent of visitors buy today?\n2. What happens to a lead nobody calls back?\n3. Which stage loses the most people?\n\nIf you cannot answer these, ads will not fix it. They will just make the leak more expensive.`),
    clamp(`Before you hire, answer three things:\n\n1. Is this a people problem or a process problem?\n2. What breaks if nobody does this at all?\n3. Who owns the number this role is meant to move?\n\nMost first hires are a process problem given a salary.`),
    clamp(`Before you rebrand, answer three things:\n\n1. Can a stranger say what you sell in one line?\n2. Do buyers hesitate on price or on trust?\n3. What do the people who said no actually say?\n\nA rebrand is what companies do instead of fixing positioning.`),
  ]) },

  // Aphorism / contrast pair
  { pillar: 'bi', kind: 'contrast', render: () => pick([
    'Businesses do not fail for lack of data.\n\nThey fail because nobody can tell signal from noise.',
    'Dashboards do not grow businesses.\n\nDecisions do.',
    'Revenue problems are usually symptoms.\n\nConstraints are the disease.',
    'Every spreadsheet tells a story.\n\nMost owners never learn to read it.',
    'You do not have a traffic problem.\n\nYou have a diagnosis problem.',
  ]) },

  // Forecasting: revenue is not random
  { pillar: 'forecast', kind: 'leading', render: () => { const m = pick(LEADING);
    return clamp(`Revenue is not random. It is a handful of leading indicators with a delay on them.\n\nStop staring at ${m.lag}. It already happened.\n\nWatch ${m.lead} instead. That is the number you can still change this week, and it is the one that shows up in ${m.lag} next month.`); } },

  // Forecasting: write it down first
  { pillar: 'forecast', kind: 'scorecard', render: () => clamp(
    `Write the forecast down before you start.\n\nNot to be right. To find out whether you understand your own business.\n\nA prediction you never check is a horoscope, and a quarter you never scored is a quarter you cannot learn from.\n\nOne line, one number, one date. Then go back and look.`) },

  // BI: averages hide the constraint
  { pillar: 'bi', kind: 'segment', render: () => clamp(
    `An average is a place to hide.\n\nA 3% conversion rate is often 8% from one source and almost nothing from the other three, and the blended number tells you to do more of everything.\n\nSplit it before you act. The constraint lives in a segment, never in the average.`) },

  // BI: the metric you avoid
  { pillar: 'bi', kind: 'avoid', render: () => clamp(
    `The number you have not looked at in a month is your constraint.\n\nNot because avoidance is magic. Because you already know it is bad, and looking would mean owning it.\n\nOpen that one first. The discomfort is the signal.`) },

  // Decision: price the gap
  { pillar: 'decision', kind: 'price_it', render: () => clamp(
    `Put a number on the gap or nothing happens.\n\n"We should improve follow-up" is a shrug in a meeting.\n\n"Follow-up costs us about $18k a month" is a decision with a deadline.\n\nSame fact. Only one of them gets scheduled.`) },

  // Decision: reversible vs not
  { pillar: 'decision', kind: 'reversible', render: () => clamp(
    `Sort every decision into two piles: reversible and not.\n\nReversible ones deserve a day, not a committee. Make them fast and be wrong cheaply.\n\nThe other pile deserves the week you keep spending on the first one.\n\nMost teams have this exactly backwards.`) },

  // Mistakes: marketing vs operations
  { pillar: 'mistakes', kind: 'ops', render: () => clamp(
    `Most startups think they have a marketing problem.\n\nMost have an operations problem wearing a marketing costume.\n\nThe leads arrive. Nobody calls back for two days. The quote takes a week. The buyer moves on and it gets logged as "the ads did not work."\n\nCheck the handoff before the headline.`) },

  // Mistakes: features slow growth
  { pillar: 'mistakes', kind: 'features', render: () => clamp(
    `Adding features usually slows growth.\n\nEvery one adds a decision for the buyer, a page to the site, a thing to support, and a reason to hesitate.\n\nThe fastest-growing version of your product is often the one with fewer options and a clearer promise.`) },

  // Mistakes: discounting
  { pillar: 'mistakes', kind: 'discount', render: () => clamp(
    `A discount is a tax you pay for unclear value.\n\nWhen the buyer cannot see why it is worth the price, the only lever left is the price.\n\nFix the explanation before you cut the number. One is free and permanent, the other is neither.`) },

  // Mistakes: hiring at a process problem
  { pillar: 'mistakes', kind: 'hiring', render: () => clamp(
    `Hiring at a process problem gives the problem a salary.\n\nIf the work is undefined, the new person inherits the confusion and now two people are guessing.\n\nWrite the process down badly, run it yourself for two weeks, then hire against what you learned.`) },

  // Systems: the weekly loop
  { pillar: 'systems', kind: 'loop', render: () => clamp(
    `The whole operating system, three steps:\n\n1. Name the constraint.\n2. Move only that number.\n3. Verify it moved.\n\nStep three is the one everyone skips, which is why the same fix gets "tried" four times a year and nobody can say whether it worked.`) },

  // Systems: capacity before demand
  { pillar: 'systems', kind: 'capacity', render: () => clamp(
    `Do not sell what you cannot deliver on time.\n\nDemand you cannot service turns into refunds, bad reviews, and a team that starts avoiding the inbox.\n\nCapacity first, then the campaign. Growth you have to apologise for is not growth.`) },

  // Systems: one-page review
  { pillar: 'systems', kind: 'review', render: () => clamp(
    `A useful monthly review fits on one page:\n\n• the constraint\n• what we changed\n• what moved\n• next constraint\n\nIf it takes twelve slides, nobody reads it and no one is accountable to it. Length is how teams hide from the second bullet.`) },

  // Constraint: the leak
  { pillar: 'constraint', kind: 'leak', render: () => clamp(
    `Doubling traffic doubles the leak.\n\nIf two in a hundred buy, buying a thousand more visitors buys you nine hundred and eighty more people who do not.\n\nYou did not grow. You paid full price to watch the same thing happen at a bigger scale.`) },

  // Constraint: one lever
  { pillar: 'constraint', kind: 'lever', render: () => clamp(
    `Ten improvements at ten percent effort each cancel out.\n\nOne improvement at full effort compounds.\n\nThe reason last quarter felt busy and flat is not that you did too little. It is that you spread it so thin nothing crossed the threshold where anyone would notice.`) },

  // Constraint: activation
  { pillar: 'constraint', kind: 'activation', render: () => clamp(
    `People do not abandon what they have actually used.\n\nMost churn is not a product failure late. It is a first-week failure that took three months to show up on the invoice.\n\nMeasure how many reach real value in week one. That number predicts the renewal.`) },

  // Authority: what analysis actually looks like
  { pillar: 'authority', kind: 'story', render: () => pick([
    clamp(`A founder wanted help scaling ads.\n\nWe looked at the funnel first. Every quote went out as a PDF attachment, and roughly half were never opened.\n\nWe put the price on a web page instead. Same spend, same traffic, more closes.\n\nThe ad account was never the problem.`),
    clamp(`A business swore its market had gone quiet.\n\nThe calls were still coming. Nobody had checked the voicemail box in five weeks.\n\nThat is not a funny story, it is the most common kind of constraint: cheap, boring, and invisible until somebody looks.`),
  ]) },
];

// ---------- teaching entries (2 thread slots) ----------
const VALUE_THREADS = [
  // The four ceilings, taught properly
  { pillar: 'systems', kind: 'thread', thread: () => [
    clamp(`Every business is stuck on one of four ceilings.\n\nMost owners are working on the wrong one.\n\nHow to tell which is yours`),
    clamp(`Ceiling one, lead generation. Nobody new is arriving. This is the only one where "more marketing" is the honest answer, and it is the one people assume they have by default.`),
    clamp(`Ceiling two, conversion. They arrive and leave. Traffic is fine, the offer or the page is not, and every extra visitor makes the loss bigger rather than smaller.`),
    clamp(`Ceiling three, delivery. You sold more than you can service. Symptoms look like unhappy customers, but the cause is capacity, and hiring is only the answer once the process is written down.`),
    clamp(`Ceiling four, retention. You refill the same bucket every month. Acquisition works and nothing accumulates, which is the most expensive way to run a business.\n\nName yours. Work only there.\n\n${pick(SOFT_CTA)}`),
  ] },

  // Reading your own numbers
  { pillar: 'bi', kind: 'thread', thread: () => [
    clamp(`Your spreadsheet already knows what is wrong.\n\nMost owners never learn to read it.\n\nFour questions that pull the answer out`),
    clamp(`One. Where do people go quiet? Put a percentage between every stage. The lowest one is not a mystery, it is an address.`),
    clamp(`Two. What does the average hide? Split by source, by segment, by month. Blended numbers are where constraints go to be invisible.`),
    clamp(`Three. What is this costing? Multiply the gap by the value of a customer. A percentage is an opinion. A dollar figure is a decision.`),
    clamp(`Four. Did it move? Write the number before you change anything, then check it in thirty days. Without that step you are collecting stories, not evidence.\n\n${pick(SOFT_CTA)}`),
  ] },
];

FORMATS.push(...PROMO_FORMATS, ...VALUE_FORMATS);
THREADS.push(...VALUE_THREADS);


// =============================================================================
// THE HUMAN LAYER, August 2026
// -----------------------------------------------------------------------------
// Everything above this line is written like a consultant's report: no
// contractions, balanced clauses, every post landing a clean conclusion. It
// reads as authoritative and it also reads as generated, because real people
// use contractions, trail off, admit they were wrong and ask things they do not
// know the answer to.
//
// So this block is deliberately looser. Rules it follows that the block above
// does not:
//
//   Contractions everywhere. "isn't", "you're", "I've". This is the single
//   biggest tell, and the cheapest to fix.
//
//   Uneven lengths. Some of these are two lines. A feed where every post is
//   the same shape looks scheduled, because it is.
//
//   Questions that actually want an answer. The bank above has none. You
//   cannot build a community by broadcasting at it, and a reply is worth more
//   to the algorithm and to the person than a like.
//
//   First person, including being wrong. "I used to think" earns more trust
//   than another declarative sentence about what businesses should do.
//
// The encouragement entries are the risky ones. GT_THREADS_VOICE.md bans
// motivational quotes, and it is right to: "believe in yourself" is filler.
// These try to encourage by being specific and honest about how hard the early
// part is, rather than by being warm about it. If one of them ever reads like
// a poster in a dentist's office, cut it.
// =============================================================================

// Openers for reply-seeking posts. Kept short so the question does the work.
const ASK_TAIL = [
  'Curious what other people have found.',
  'Tell me I’m wrong.',
  'What’s your version of this?',
  'Genuinely asking.',
];

const HUMAN_FORMATS = [
  // ---------- early stage, honest rather than motivational ----------
  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`Nobody tells you the first ten customers are the hardest ones you’ll ever get.\n\nNot because the product is bad. Because you’ve got no proof yet, so every single one is a favour someone is doing you.\n\nIt does get easier. Not because you get better at asking, but because you stop having to.`),
    clamp(`You’re comparing your month three to someone else’s year six.\n\nThey had the same months. They just didn’t post about them.`),
    clamp(`The unglamorous work is the work.\n\nFollowing up. Fixing the checkout. Calling the person who went quiet. None of it makes a good post, and it’s most of what actually moves the number.`),
    clamp(`Plateaus aren’t failure, they’re information.\n\nSomething that worked has stopped working, and the flat line is how you find out. Most people panic and change five things at once, which guarantees they never learn which one it was.`),
  ]) },

  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`Charge more than feels comfortable.\n\nNot because you’re worth more than you think, though you probably are. Because the price you’re scared to say out loud is usually the one that filters out the clients who were going to be a nightmare anyway.`),
    clamp(`Quitting something that isn’t working isn’t giving up.\n\nIt’s the same decision as starting, made with better information.`),
    clamp(`Nobody is watching as closely as you think.\n\nThat post you agonised over, the pricing page you rewrote four times, the launch that flopped. People saw it for a second and moved on.\n\nThat’s freeing if you let it be.`),
  ]) },

  // ---------- I used to think ----------
  { pillar: 'authority', kind: 'wrong', render: () => pick([
    clamp(`I used to think the answer was always more.\n\nMore posts, more traffic, more offers. Took me a while to notice that the businesses growing fastest were usually doing less, but doing it at the one place it mattered.`),
    clamp(`I was wrong about audience size for years.\n\nI thought you needed reach first and the offer would follow. It’s the other way round. A clear offer to two hundred people who trust you beats a clever one to twenty thousand who don’t.`),
    clamp(`Changed my mind on this one recently.\n\nI used to tell people to fix retention before touching acquisition. Still mostly true. But if nobody’s arriving at all, retention is a rounding error and you’re just polishing an empty room.`),
  ]) },

  // ---------- questions that want a reply ----------
  { pillar: 'community', kind: 'ask', render: () => pick([
    clamp(`What’s the number in your business you’ve been avoiding looking at?\n\nNot a trick question. Mine was refund rate for most of a year.\n\n${pick(ASK_TAIL)}`),
    clamp(`What’s a piece of business advice that everyone repeats and that turned out to be completely wrong for you?\n\n${pick(ASK_TAIL)}`),
    clamp(`How many customers in did it start to feel real?\n\nFor some people it’s the first. For some it’s the hundredth and it still doesn’t.\n\n${pick(ASK_TAIL)}`),
    clamp(`Honest question for anyone a year or two in:\n\nwhat would you go back and do differently in month one?\n\n${pick(ASK_TAIL)}`),
  ]) },

  { pillar: 'community', kind: 'ask', render: () => pick([
    clamp(`What’s the task you keep pushing to next week?\n\nI’ve noticed the thing I avoid is almost always the thing with the biggest number attached to it. Not sure that’s a coincidence.`),
    clamp(`Which do you actually find harder, getting the customer or keeping them?\n\nI think the answer says more about the business than most diagnostics do.\n\n${pick(ASK_TAIL)}`),
  ]) },

  // ---------- short, plain observations ----------
  { pillar: 'bi', kind: 'note', render: () => pick([
    'Most "we need a new strategy" conversations are really "nobody did the last one".',
    'You can’t out-market a product people don’t come back to.',
    'If you can’t explain what you sell in one sentence, that’s not a copy problem yet. It’s a decision you haven’t made.',
    'Busy and productive feel identical from the inside. That’s the whole problem.',
    'Every business has one number that would change everything. Most owners can name it in about four seconds if you ask them directly.',
  ]) },

  { pillar: 'systems', kind: 'note', render: () => pick([
    clamp(`Small thing that works:\n\npick one number on Monday, write it on something you’ll see all week, and don’t chase anything that doesn’t move it.\n\nSounds too simple to matter. It’s the difference between a week you can point at and a week that just happened.`),
    clamp(`If you do one thing this week, go and look at where people drop off.\n\nNot the whole funnel. Just find the biggest gap between one step and the next. That gap is your quarter.`),
    clamp(`Write down what you think will happen before you try it.\n\nTakes thirty seconds and it’s the only way you ever find out whether you understand your own business or you’ve just been lucky.`),
  ]) },

  // ---------- relatable, the emotional reality ----------
  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`The hardest part of running something isn’t the work.\n\nIt’s making decisions all day with incomplete information and no one to check them against.\n\nIf that’s where you are right now, that’s not a sign you’re bad at this. That’s the job.`),
    clamp(`Everyone’s first version was worse than you think.\n\nThe polished thing you’re comparing yourself to is version nine.`),
    clamp(`Some weeks the only win is that you didn’t quit.\n\nThat’s a real one. Compounding needs you to still be here.`),
  ]) },

  // ---------- gentle authority, conversational register ----------
  { pillar: 'constraint', kind: 'note', render: () => { const c = pick(CONSTRAINTS);
    return clamp(`Someone said "${c.sym.toLowerCase()}" to me again this week.\n\nAlmost never is. Nine times out of ten it’s ${art(c.real)} ${c.real} wearing a costume.\n\nWorth checking before you spend anything.`); } },

  { pillar: 'playbook', kind: 'note', render: () => pick([
    clamp(`If you’re stuck, try this before anything clever:\n\nask five customers why they bought. Actually ask, don’t survey.\n\nHalf the time the answer isn’t what’s on your website, and that gap is free money.`),
    clamp(`Cheapest growth experiment there is:\n\ngo back to everyone who asked about your thing in the last ninety days and never bought, and just ask what stopped them.\n\nCosts nothing. Most people never do it.`),
  ]) },
];

FORMATS.push(...HUMAN_FORMATS);


// A second pass on the human layer. Ten slots put roughly one human-voiced post
// in every six, which is a change of accent rather than a change of voice.
// These take it to about one in three, which is what "sound like a person wrote
// it" actually requires when the other two thirds are consultancy prose.
const HUMAN_FORMATS_2 = [
  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`Three years in and I still get the Sunday night thing.\n\nI don’t think it goes away. I think you just stop reading it as a warning sign.`),
    clamp(`Your first hundred followers, first ten customers, first real month. All of it takes longer than anyone admits, and then it compounds faster than anyone expects.\n\nMost people quit in the gap between those two sentences.`),
    clamp(`Something I wish someone had said earlier:\n\nyou don’t need a better idea. You need the same idea, in front of people, for longer than feels reasonable.`),
  ]) },

  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`If you’re doing this alone, the loneliness is the part nobody warns you about.\n\nNot the money. Not the hours. Just having no one to check a decision against at 11pm.\n\nFind one person who’s a year ahead of you. It changes everything.`),
    clamp(`The advice that helped me most was boring.\n\n"Talk to more customers." That’s it. Every clever thing I tried instead was a way of avoiding it.`),
  ]) },

  { pillar: 'community', kind: 'ask', render: () => pick([
    clamp(`What’s something that worked for your business that you’d be slightly embarrassed to admit?\n\nMine: I got more replies from a badly formatted email than from anything I designed properly.`),
    clamp(`Anyone else find the admin harder than the actual work?\n\nNot complaining. Just checking it isn’t only me.`),
    clamp(`What did you spend money on early that you’d skip if you started again?\n\n${pick(ASK_TAIL)}`),
  ]) },

  { pillar: 'authority', kind: 'wrong', render: () => pick([
    clamp(`Unpopular one:\n\nmost small businesses don’t have a marketing problem or an ops problem. They have a "nobody owns this" problem. The task isn’t hard, it just isn’t anyone’s.`),
    clamp(`I don’t think most people need a growth strategy.\n\nThey need to do the four things they already know about, in order, without stopping halfway to research a fifth.`),
  ]) },

  { pillar: 'bi', kind: 'note', render: () => pick([
    'The best businesses I’ve looked at are usually boring on the inside. Same few things, done every week, for years.',
    'If a report takes twelve slides, nobody’s accountable to it.',
    'You don’t have to be good at everything. You have to be honest about which one is currently costing you.',
    'Half of what looks like a strategy problem is just something nobody has written down.',
  ]) },

  { pillar: 'systems', kind: 'note', render: () => pick([
    clamp(`Try this if the week’s already away from you:\n\nwrite the three things that would make it a good week. Do them first. Let the rest slide.\n\nIt’s not a productivity system. It’s just a way of choosing before the day chooses for you.`),
    clamp(`The follow-up you haven’t sent is worth more than the campaign you’re planning.\n\nAlmost always. And it takes four minutes.`),
  ]) },

  { pillar: 'early', kind: 'real', render: () => pick([
    clamp(`Reminder that "overnight" businesses usually had two or three years of nothing first.\n\nYou’re probably in the nothing. It counts.`),
    clamp(`Nobody has it figured out. The ones who look like they do are just further into the same confusion, with better lighting.`),
  ]) },

  { pillar: 'community', kind: 'ask', render: () => clamp(
    `If you’re building something right now, what is it?\n\nDrop it below. I’ll actually look.`) },
];

FORMATS.push(...HUMAN_FORMATS_2);


// =============================================================================
// MORE THREADS, August 2026
// -----------------------------------------------------------------------------
// The first real engagement pull settled an argument. Eight multi-part threads
// produced 46% of all views and 74% of all interactions, out of 52 posts.
// Median reach was 44.5 views against 9.5 for a single post. Nearly five times,
// on the same account, in the same week, with the same ideas.
//
// The bank was 12% threads. That ratio was backwards, so this block takes it to
// roughly a quarter.
//
// What the winning threads have in common, and what these copy: a hook short
// enough to read in one glance and incomplete on its own, then four replies
// that each land one idea, then a last line worth screenshotting. No reply
// exists to set up the next one. If a part could be deleted without loss, it is
// deleted here instead.
// =============================================================================

const MORE_THREADS = [
  // ---------- early stage, human register ----------
  { pillar: 'early', kind: 'thread', thread: () => [
    clamp(`The first ten customers are the hardest you’ll ever get.\n\nNobody warns you why`),
    clamp(`It isn’t the product. At ten customers your product is usually fine and definitely fixable.\n\nIt’s that you have no proof, so every sale is somebody taking a personal risk on you.`),
    clamp(`Which means the early ones don’t come from marketing. They come from people who already trust you, or people you talk to directly, one at a time, in a way that does not scale and is not supposed to.`),
    clamp(`This is the part most people try to skip, because it feels like it doesn’t count. It counts more than anything you’ll do later. Those ten tell you what you actually sell.`),
    clamp(`It gets easier at around thirty. Not because you got better at asking. Because you stopped having to.\n\nIf you’re under ten right now, you’re not behind. You’re in the part that has no shortcut.`),
  ] },

  { pillar: 'early', kind: 'thread', thread: () => [
    clamp(`You’ve been flat for three months and you’re starting to think it’s over.\n\nIt probably isn’t. Here’s what a plateau usually is`),
    clamp(`Something that worked has quietly stopped working. One channel, one message, one referral source. The total looks flat because a rise somewhere is cancelling a fall somewhere else.`),
    clamp(`So the flat line isn’t nothing happening. It’s two things happening that you can’t see separately yet.\n\nSplit the number. By source, by month, by segment. The story is in there.`),
    clamp(`What most people do instead is change five things at once out of panic. Then it moves, and they have no idea which change did it, so they can’t do it again.`),
    clamp(`Change one thing. Give it three weeks. Write down what you expect first.\n\nSlower, and it’s the only version where you learn something you can use twice.`),
  ] },

  { pillar: 'early', kind: 'thread', thread: () => [
    clamp(`If I started again from zero tomorrow, I’d skip almost everything I did in year one.\n\nHere’s what I’d actually do`),
    clamp(`Talk to twenty people with the problem before building anything. Not a survey. Actual conversations where they do most of the talking and I resist explaining my idea.`),
    clamp(`Sell it before it exists. If nobody will pay for the description, they won’t pay for the thing. That’s not a failure, it’s three months saved.`),
    clamp(`Pick one channel. Be boring about it for six months. Every founder I know who spread across five ended up invisible on all of them.`),
    clamp(`And write down what I expected to happen, every time, before it happened.\n\nThat one habit is the difference between four years of experience and one year repeated four times.`),
  ] },

  // ---------- practical, the highest-value cheap moves ----------
  { pillar: 'playbook', kind: 'thread', thread: () => [
    clamp(`The most profitable thing in your business is a message you haven’t sent.\n\nThe follow-up nobody sends`),
    clamp(`Go and find everyone who enquired in the last ninety days and didn’t buy. Most businesses have a list like this and treat it as dead.\n\nIt isn’t dead. It’s the warmest list you own.`),
    clamp(`Send one message. Not a pitch. One line asking what stopped them, and meaning it.\n\nSome will tell you the price. Some will tell you the timing. Some will tell you something about your offer you genuinely did not know.`),
    clamp(`A share of them will buy, right there, because the only thing standing in the way was that nobody followed up and they got busy.`),
    clamp(`It costs nothing, takes an afternoon, and almost nobody does it, because it feels like admitting you need the sale.\n\nEvery business I’ve looked at has money sitting in that list.`),
  ] },

  { pillar: 'playbook', kind: 'thread', thread: () => [
    clamp(`You can learn more in five customer conversations than in five months of analytics.\n\nWhat to actually ask`),
    clamp(`One. What were you doing about this before you found us? Tells you who you’re really competing with, which is usually a spreadsheet or nothing.`),
    clamp(`Two. What nearly stopped you buying? This is the objection your page should be answering and probably isn’t.`),
    clamp(`Three. How would you describe us to someone like you? Their words are better than your positioning. Use them verbatim.`),
    clamp(`Don’t defend anything. Don’t explain. Just write down what they say, in their language, and read it back a week later.\n\nHalf of what you find will be free money.`),
  ] },

  // ---------- pricing ----------
  { pillar: 'decision', kind: 'thread', thread: () => [
    clamp(`Your prices are probably too low, and not for the reason people usually say.\n\nThree ways to tell`),
    clamp(`One. Nobody ever pushes back. If not a single prospect flinches, you are underneath the range the market expected, and you’re being read as the cheap option before anyone has looked at the work.`),
    clamp(`Two. Your worst clients are your cheapest ones. Price is a filter. Lower it and you catch the people who were always going to be difficult, because they’re shopping on the only axis they understand.`),
    clamp(`Three. You’re busy and it isn’t showing up in profit. That’s not a volume problem to solve with more volume.`),
    clamp(`Raising a price takes an afternoon and no new customers.\n\nAlmost everything else you’re considering takes a quarter and a budget.`),
  ] },

  { pillar: 'decision', kind: 'thread', thread: () => [
    clamp(`Before you spend anything on ads, answer four questions.\n\nIf you can’t, the ads will just make the leak more expensive`),
    clamp(`What percentage of visitors buy today? If you don’t know, you cannot tell a traffic problem from a conversion one, and they need opposite fixes.`),
    clamp(`What happens to a lead nobody calls back? In most businesses the honest answer is nothing, and that is where the money is going.`),
    clamp(`Which stage loses the most people? Put a number between every step. The lowest one is not a mystery, it’s an address.`),
    clamp(`What is a customer worth over a year? Without it, no cost per acquisition means anything and you’re guessing whether you can afford to win.\n\nFour answers. Then spend.`),
  ] },

  // ---------- the week / focus ----------
  { pillar: 'systems', kind: 'thread', thread: () => [
    clamp(`You were busy all week and the business didn’t move.\n\nHere’s what usually happened`),
    clamp(`You did ten things at ten percent effort. All ten are now slightly better and none of them crossed the line where anyone outside would notice.`),
    clamp(`Improvements aren’t linear. Most have a threshold, and under it you get nothing at all. Half a rewrite of a sales page performs exactly like no rewrite.`),
    clamp(`So the choice isn’t how hard you work. It’s how few things you’re willing to let be bad this week.`),
    clamp(`Pick one. Take it past the threshold. Let the other nine sit.\n\nNext week they’re still there, and you’ll have one thing that actually landed.`),
  ] },

  { pillar: 'systems', kind: 'thread', thread: () => [
    clamp(`Nobody is accountable to a twelve-slide report.\n\nWhat a useful review looks like`),
    clamp(`One page. What we said was limiting us. What we changed. What moved. What’s limiting us now.\n\nThat’s it. Four lines.`),
    clamp(`The second line is where most reviews quietly fail. "What we changed" has to be specific enough that somebody could disagree with it.`),
    clamp(`The third is the one people skip. If you never check whether it moved, you’re collecting stories, not evidence, and you’ll try the same fix again next year.`),
    clamp(`Length is how teams hide from line three.\n\nIf the review doesn’t fit on a page, it isn’t a review, it’s a performance.`),
  ] },

  // ---------- content / reach, relevant to this very account ----------
  { pillar: 'bi', kind: 'thread', thread: () => [
    clamp(`You’re posting more and reaching fewer people.\n\nIt usually isn’t the algorithm`),
    clamp(`Volume without a reason to stop is just more scroll. The feed doesn’t punish you for posting, it punishes you for posting things nobody stays on.`),
    clamp(`So the first line is the whole job. Not the idea, not the length. Whether somebody’s thumb stops.`),
    clamp(`And the format matters more than people think. The same idea, written as a chain instead of a single post, reliably travels further, because each part earns the next one a fresh impression.`),
    clamp(`Test it on your own account for two weeks before you believe me.\n\nSame ideas, different shape. Watch what happens to reach.`),
  ] },

  { pillar: 'bi', kind: 'thread', thread: () => [
    clamp(`The number you’ve been avoiding is your constraint.\n\nI’m fairly sure this is always true`),
    clamp(`Not because avoidance is magic. Because you already half know it’s bad, and looking would mean owning it.`),
    clamp(`Refund rate. Churn past month one. How many enquiries never got a reply. The gap between what you quoted and what you invoiced.\n\nOne of those just made you uncomfortable. That’s the one.`),
    clamp(`The discomfort is the signal, and it’s the most reliable diagnostic tool you have, because it costs nothing and you already ran it.`),
    clamp(`Open it today. It’s almost never as bad as the version you’ve been carrying around not looking at.`),
  ] },

  // ---------- community, meta, invites a reply ----------
  { pillar: 'community', kind: 'thread', thread: () => [
    clamp(`If you’re building something and nobody’s engaging yet, read this before you quit posting`),
    clamp(`Reach early is brutal. Most posts from a small account are seen by a couple of dozen people, and that has almost nothing to do with whether the post was good.`),
    clamp(`Which means judging your idea by early numbers is judging it on the wrong evidence. The signal at that stage is replies, not likes. One person saying "this is exactly my situation" is worth four hundred impressions.`),
    clamp(`So write for the one person, not the feed. Say the specific thing. The generic version reaches the same nobody and teaches you nothing.`),
    clamp(`And go and be useful in other people’s replies. That’s the actual distribution channel early on, and it works while your own posts are still finding their footing.\n\nWhat are you building? Say it below.`),
  ] },
];

THREADS.push(...MORE_THREADS);

module.exports = { FORMATS, THREADS, SYMPTOM_DISEASE, CEILINGS, SOFT_CTA };
