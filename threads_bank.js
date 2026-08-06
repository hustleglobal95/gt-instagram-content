/**
 * threads_bank.js, Growth Terminal Threads post bank
 * -----------------------------------------------------------------------------
 * The words-first equivalent of your image bank. A set of strong, on-voice post
 * FORMATS (fixed structures) plus small CONTENT POOLS for slot variety. The
 * generator rotates through these without repeating, same muscle as generate.js.
 *
 * Grow it the same way you grow the ad banks: when a post structure lands, add a
 * new format here. Voice rules live in GT_THREADS_VOICE.md.
 *
 * Every format returns finished post text (<=500 chars, short lines, no hashtags).
 *
 * MIX (what @markusreidgt reps): mostly TEACHING — aphorisms, playbooks, systems,
 * operator-voice authority — so Markus Reid becomes a growth-marketing voice.
 * Business-Solutions posts (kind:'solution') sell the done-for-you line, but as a
 * consequence of an insight, with a soft growthterminal.io sign-off. They're ~1 in 6
 * of the bank on purpose; teaching earns the follow, the follow buys the solution.
 * CTAs appear ONLY on solution posts. Everything else leaves the reader smarter.
 */

// ---------------- content pools (slot variety) ----------------
const SYMPTOM_DISEASE = [
  { symptom: 'marketing', constraint: 'operations' },
  { symptom: 'traffic', constraint: 'conversion' },
  { symptom: 'sales', constraint: 'offer' },
  { symptom: 'lead', constraint: 'follow-up' },
  { symptom: 'growth', constraint: 'retention' },
  { symptom: 'pricing', constraint: 'positioning' },
];

const CEILINGS = ['Lead generation', 'Sales conversion', 'Delivery capacity', 'Retention', 'Cash flow', 'Hiring'];

// soft, non-pitchy sign-offs — used ONLY on kind:'solution' posts
const SOFT_CTA = [
  `growthterminal.io`,
  `Diagnose your #1 constraint free → growthterminal.io`,
  `We build and run it for you. growthterminal.io`,
  `One system, every way in → growthterminal.io`,
];

const art = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a'); // a/an by first letter, so "an offer problem" reads right
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
};

// ---------------- formats ----------------
// kind: aphorism | systems | authority | diagnostic | progression | formula | bi
//     | mistake | product | reframe | hook | framework | playbook | operator | solution
const FORMATS = [
  // --- Aphorism / contrast ---
  { pillar: 'constraint', kind: 'aphorism', render: () => `Revenue problems are usually symptoms.\nConstraints are the disease.` },
  { pillar: 'bi', kind: 'aphorism', render: () => `Businesses don't fail because they lack data.\nThey fail because they can't tell signal from noise.` },
  { pillar: 'decision', kind: 'aphorism', render: () => `Dashboards don't grow businesses.\nDecisions do.` },
  { pillar: 'mistake', kind: 'aphorism', render: () => `You don't have a traffic problem.\nYou have a diagnosis problem.` },
  { pillar: 'constraint', kind: 'aphorism', render: () => `More customers won't fix a leaky business.\nThey'll just leak faster.` },
  { pillar: 'mistake', kind: 'aphorism', render: () => `Adding features usually slows growth.\n\nEvery new feature is one more thing that can break, confuse, or distract.` },
  { pillar: 'mistake', kind: 'aphorism', render: () => {
      const s = pick(SYMPTOM_DISEASE);
      return `Most owners think it's ${art(s.symptom)} ${s.symptom} problem.\nUsually it's ${art(s.constraint)} ${s.constraint} problem.\n\nThe symptom is where it hurts. The constraint is where you fix it.`;
    } },

  // --- Systems lists ---
  { pillar: 'systems', kind: 'systems', render: () => `Every business eventually hits one of four ceilings:\n\n• Lead generation\n• Sales conversion\n• Delivery capacity\n• Retention\n\nFind which one you're hitting before you try to grow. Scaling the wrong one just makes the bottleneck worse.` },
  { pillar: 'forecasting', kind: 'systems', render: () => `Revenue isn't random.\n\nIt's the output of 4–5 leading indicators:\n\n• Qualified leads in\n• Conversion rate\n• Average deal size\n• Churn\n• Cycle time\n\nMove those and revenue moves. Watch revenue alone and you're always a quarter late.` },
  { pillar: 'constraint', kind: 'systems', render: () => `Growth has an order of operations:\n\n1. Find the one constraint limiting everything else\n2. Fix it until it's no longer the limit\n3. Re-diagnose, the constraint has moved\n\nMost businesses skip step 1 and wonder why effort doesn't turn into growth.` },
  { pillar: 'constraint', kind: 'systems', render: () => {
      const [a, b, c, d] = pickN(CEILINGS, 4);
      return `Every company has one constraint that limits everything else.\n\nRight now it's usually one of:\n• ${a}\n• ${b}\n• ${c}\n• ${d}\n\nFind that one first. Everything downstream gets easier.`;
    } },

  // --- Authority (the un-fakeable one) ---
  { pillar: 'mistake', kind: 'authority', render: () => {
      const s = pick(SYMPTOM_DISEASE);
      return `After analyzing hundreds of businesses, one pattern keeps showing up:\n\nMost think they have ${art(s.symptom)} ${s.symptom} problem.\nMost actually have ${art(s.constraint)} ${s.constraint} problem.\n\nThe symptom is loud. The constraint is quiet. Growth lives in the quiet one.`;
    } },
  { pillar: 'constraint', kind: 'authority', render: () => `The most common thing we see across businesses:\n\nThey're spending to grow the part of the funnel that already works, \nand starving the part that's actually broken.` },

  // --- Diagnostic ---
  { pillar: 'decision', kind: 'diagnostic', render: () => `Before you spend another dollar on marketing, answer three questions:\n\n1. Do you know your weakest funnel stage?\n2. Do you know what it's costing you?\n3. Do you know it's the constraint, or just the loudest?\n\nMost "marketing problems" die on question 1.` },
  { pillar: 'decision', kind: 'diagnostic', render: () => `Before hiring to fix an overloaded team, ask one thing:\n\nIs the team the constraint, or the process feeding it?\n\nHiring into a broken process just buys a more expensive version of the same bottleneck.` },

  // --- Progression ---
  { pillar: 'constraint', kind: 'progression', render: () => `The first million is about acquisition.\nThe next million is about removing friction.\n\nMost founders try to acquire their way out of a friction problem. It gets more expensive every month.` },
  { pillar: 'constraint', kind: 'progression', render: () => `Early on, growth is about doing more.\nLater, growth is about removing what's in the way.\n\nThe businesses that stall are usually still adding when they should be subtracting.` },

  // --- Business intelligence ---
  { pillar: 'bi', kind: 'bi', render: () => `Every spreadsheet already contains the answer.\nMost owners just don't know where to look.\n\nThe constraint is usually hiding in the transition between two numbers, not in either number itself.` },
  { pillar: 'bi', kind: 'bi', render: () => `Your data isn't the problem.\nYour ability to tell signal from noise is.\n\nMore dashboards won't fix that. A sharper question will.` },

  // --- Startup mistakes ---
  { pillar: 'mistake', kind: 'mistake', render: () => `Most startups don't have a marketing problem.\nThey have an operations problem wearing a marketing costume.\n\nThe leads are fine. What happens after the click is where the money leaks.` },
  { pillar: 'mistake', kind: 'mistake', render: () => `The most expensive number in a business is the one nobody's measuring.\n\nUsually it's the conversion between two stages everyone assumes are fine.` },

  // --- Forecasting ---
  { pillar: 'forecasting', kind: 'formula', render: () => `Revenue feels random until you find the 4–5 numbers that actually drive it.\n\nAfter that, next quarter stops being a guess and starts being a calculation.` },

  // --- Core formula (surprise -> misread -> framework -> takeaway) ---
  { pillar: 'constraint', kind: 'formula', render: () => `Most businesses don't need more customers.\nThey need fewer hidden bottlenecks.\n\nEvery company has one constraint that limits everything else:\n• Sales\n• Fulfillment\n• Cash flow\n• Hiring\n\nFind that constraint first. Everything else gets easier.` },

  // =====================================================================
  // CALIBRATED reframe formats (foundr / hormozi structures)
  // =====================================================================
  { pillar: 'constraint', kind: 'reframe', render: () => `Stop scaling the channel before you've fixed the funnel.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Stop hiring before you've fixed the process.\n\nMore people in a broken process just buys a more expensive bottleneck.` },
  { pillar: 'bi', kind: 'reframe', render: () => `Stop buying traffic you can't measure.\n\nYou're not growing.\n\nYou're funding a leak you can't see.` },
  { pillar: 'decision', kind: 'reframe', render: () => `Stop optimizing the metric that isn't the constraint.\n\nEverything else is just motion.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `Growth without a diagnosis is just expensive guessing.` },
  { pillar: 'decision', kind: 'reframe', render: () => `A dashboard without a decision is just decoration.` },
  { pillar: 'bi', kind: 'reframe', render: () => `Data without interpretation is just noise with confidence.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `More traffic without conversion is just a bigger leak.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `A revenue problem is just a constraint you haven't named yet.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Most marketing problems are just operations problems with better lighting.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Losing a bad-fit customer isn't churn.\n\nIt's a filter.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `The business that scales doesn't need more customers.\n\nIt needs fewer bottlenecks.` },
  { pillar: 'constraint', kind: 'hook', render: () => `Fastest way to grow:\n\nFix the slowest step.` },
  { pillar: 'decision', kind: 'hook', render: () => `Fastest way to waste a budget:\n\nScale before you diagnose.` },
  { pillar: 'bi', kind: 'hook', render: () => `Fastest way to find the bottleneck:\n\nFollow the money to the stage it stops moving.` },
  { pillar: 'systems', kind: 'framework', render: () => `Every business runs on the same loop:\n\nGet attention.\nConvert it.\nKeep it.\n\nMost break at step 2, and spend all their money on step 1.` },
  { pillar: 'constraint', kind: 'framework', render: () => `Fixing growth is three moves:\n\nName the constraint.\nFix it.\nRe-diagnose.\n\nThe constraint always moves. Most people stop after one.` },
  { pillar: 'mistake', kind: 'authority', render: () => `We keep seeing the same thing across businesses:\n\nThe leak is never where the owner is looking.\n\nIt's one stage upstream.` },

  // =====================================================================
  // GROWTH-MARKETING PLAYBOOKS — well-structured, actually-teach-something tips.
  // This is the "gold mine": every one leaves the reader able to do the thing.
  // =====================================================================
  { pillar: 'systems', kind: 'playbook', render: () => `How to find your growth constraint in 10 minutes:\n\n1. List your funnel stages\n2. Write the conversion rate between each\n3. Find the biggest drop\n\nThat drop is costing you the most. Fix it before you touch anything else.` },
  { pillar: 'forecasting', kind: 'playbook', render: () => `The 5 numbers that actually drive revenue:\n\n• Qualified leads in\n• Conversion rate\n• Average deal size\n• Churn\n• Sales cycle length\n\nMove these and revenue moves. Watch revenue alone and you're always a quarter behind.` },
  { pillar: 'constraint', kind: 'playbook', render: () => `Retention is a math problem before it's a loyalty problem.\n\nKeep 90% of customers a month and you lose a third in a year.\nAt 95%, you lose half that.\n\nA 5-point retention gain beats most ad campaigns. Nobody budgets for it.` },
  { pillar: 'mistake', kind: 'playbook', render: () => `Before you raise your budget, raise your offer.\n\nA stronger offer lifts every number downstream: click, convert, close, retain.\n\nMost "traffic problems" are offer problems in disguise.` },
  { pillar: 'constraint', kind: 'playbook', render: () => `Pricing is the fastest lever you have.\n\nNo new leads. No new headcount.\nA 10% price increase drops almost straight to margin.\n\nMost businesses are underpriced, because they never actually tested it.` },
  { pillar: 'mistake', kind: 'playbook', render: () => `Activation is where quiet churn starts.\n\nIf a new customer doesn't hit their first win fast, they're already gone, they just haven't told you yet.\n\nFix the first week before you spend another dollar on acquisition.` },
  { pillar: 'decision', kind: 'playbook', render: () => `Don't optimize every metric. Pick one per stage:\n\n• Top: qualified leads\n• Middle: conversion rate\n• Bottom: retention\n\nOne number per stage keeps the team on the constraint, not the noise.` },
  { pillar: 'decision', kind: 'playbook', render: () => `A one-line test for any growth idea:\n\nDoes it fix the constraint, or just add motion?\n\nIf it doesn't move the one stage that's stuck, it's activity, not growth.` },

  // =====================================================================
  // OPERATOR VOICE — Markus, first-person, thinking in public. Builds the
  // person as a growth-marketing voice, not just the product.
  // =====================================================================
  { pillar: 'constraint', kind: 'operator', render: () => `I've looked at hundreds of businesses.\n\nThe leak is almost never where the owner is looking.\n\nIt's one stage upstream, in the number nobody watches.` },
  { pillar: 'mistake', kind: 'operator', render: () => `The mistake I see most:\n\nScaling the channel before fixing the funnel.\n\nMore traffic into a leak doesn't grow you. It just makes the leak more expensive.` },
  { pillar: 'decision', kind: 'operator', render: () => `Every founder I talk to wants a growth tactic.\n\nAlmost none can name their #1 constraint.\n\nThe tactic doesn't matter until you know which lever is actually stuck.` },
  { pillar: 'forecasting', kind: 'operator', render: () => `I stopped trusting revenue as a metric years ago.\n\nIt's a lagging output. By the time it moves, the decision that moved it is a quarter old.\n\nI watch the 4–5 inputs instead.` },
  { pillar: 'constraint', kind: 'operator', render: () => `The businesses that scale fastest aren't doing more.\n\nThey found the one bottleneck, removed it, then found the next.\n\nSubtraction, not addition. Almost nobody runs it that way.` },

  // =====================================================================
  // BUSINESS SOLUTIONS — value-first, ends in the done-for-you consequence.
  // The ONLY posts that carry a soft growthterminal.io sign-off. ~1 in 6.
  // =====================================================================
  { pillar: 'solution', kind: 'solution', render: () => `Most owners can find the constraint.\nFewer have the time to fix it.\n\nThat's the whole reason Business Solutions exists: we run the diagnosis, build the 90-day plan, and grade it against your real revenue.\n\nYou stay in your zone. The fix still ships.\n\n${SOFT_CTA[0]}` },
  { pillar: 'solution', kind: 'solution', render: () => `Every missed call is pipeline walking out the door.\n\nWe build AI voice agents that answer 24/7 in your brand voice, qualify the caller, and book the meeting.\n\nNo lead waits. No call lost.\n\n${SOFT_CTA[2]}` },
  { pillar: 'solution', kind: 'solution', render: () => `Your AI shouldn't discount to close.\n\nWe build custom assistants trained on your business: they hold your price, work the objection, and update your pipeline.\n\nA trained teammate, not a toy chatbot.\n\n${SOFT_CTA[0]}` },
  { pillar: 'solution', kind: 'solution', render: () => `Consistency isn't willpower. It's a system.\n\nOur content engine builds on-brand posts from your creative bank and publishes daily across every platform, then sharpens on what performs.\n\nYour feed stops going dark.\n\n${SOFT_CTA[0]}` },
  { pillar: 'solution', kind: 'solution', render: () => `You don't need ten vendors.\n\nYou need one system that diagnoses the constraint, then builds and runs the fix.\n\nDiagnose it yourself, grab a template, or have us run the whole thing.\n\n${SOFT_CTA[3]}` },
  { pillar: 'solution', kind: 'solution', render: () => `Not ready for the full engine?\n\nStart with a template. Ready-made Google Sheets for pricing, retention, and forecasting.\n\nCopy in your numbers, get answers today. From $79.\n\n${SOFT_CTA[0]}` },
  { pillar: 'solution', kind: 'solution', render: () => `A diagnosis is step one.\n\nThen someone has to build the plan and run it. That's where most growth dies, in the execution, not the insight.\n\nWe do both, and grade the outcome against real revenue.\n\n${SOFT_CTA[1]}` },
  { pillar: 'solution', kind: 'solution', render: () => `Sometimes the constraint is you.\n\nNot as a failing, as a math problem: the owner has only so many hours, and the fix needs more.\n\nDone-for-you exists for exactly that. We run the plan so growth doesn't wait on your calendar.\n\n${SOFT_CTA[0]}` },
  { pillar: 'solution', kind: 'solution', render: () => `You can start free and never pay us a cent.\n\nRun the 60-second diagnostic. Grab a $79 template. Or, when you want it handled, we build and run the whole system.\n\nSame diagnosis-first thinking, every rung of the ladder.\n\n${SOFT_CTA[0]}` },

  // --- Product as consequence (the original, kept) ---
  { pillar: 'product', kind: 'product', render: () => `We built Growth Terminal for one reason:\n\nEvery business we looked at already had the answer in its own data, and no way to see it.\n\nThe constraint was never information. It was interpretation.` },
];

// =====================================================================
// THREAD FORMATS — reply-chain deep-dives (the "Threads Challenge" franchise).
// A thread format has thread() -> [hook, reply1, reply2, ...] instead of render().
// The hook stops the scroll; the replies teach a full framework. Each part is a
// separate published post chained via reply_to_id. Every part must be <=500 chars.
// These are what make @markusreidgt read as THE growth-marketing voice, not a tips
// account. Add more here to run deep-dives more often; they rotate like any format.
// =====================================================================
const THREADS = [
  // The four ceilings — the signature systems teardown
  { pillar: 'systems', kind: 'thread', thread: () => [
    `Every business hits one of four growth ceilings.\n\nMost try to scale through the wrong one, then wonder why the effort never moves revenue.\n\nHere's how to tell which one is capping you.`,
    `1. Lead generation\n\nNot enough of the right people are finding you.\n\nTell: pipeline stays thin no matter how hard the team sells. The fix is upstream of sales, not inside it.`,
    `2. Sales conversion\n\nInterest is fine, the yes isn't landing.\n\nTell: a lot of "let me think about it." Usually an offer or positioning problem wearing a lead-gen costume.`,
    `3. Delivery capacity\n\nYou could sell more than you can deliver well.\n\nTell: growth makes quality slip. Selling harder here just books future churn.`,
    `4. Retention\n\nYou refill a leaking bucket every month.\n\nTell: revenue is flat while acquisition is up. The most expensive ceiling, and the one owners look at last.`,
    `Find your ceiling before you scale.\n\nScaling the wrong one doesn't grow you, it makes the bottleneck worse.\n\nName the one that's actually capping you, fix it, then re-diagnose. The ceiling always moves.`,
  ] },

  // Find your constraint in 10 minutes — the playbook teardown
  { pillar: 'constraint', kind: 'thread', thread: () => [
    `You can find the one thing capping your growth in about 10 minutes.\n\nNo tools. No consultant. Just your own numbers.\n\nHere's the exact process.`,
    `Step 1: List your funnel stages, in order.\n\nVisitor, lead, qualified, customer, repeat. Whatever yours are, write them down left to right.`,
    `Step 2: Put the conversion rate between each stage.\n\nRough numbers are fine. You're looking for the shape, not the decimals.`,
    `Step 3: Find the biggest drop.\n\nThe stage where the most people fall out, relative to the ones around it, is your constraint. That's where the money is leaking.`,
    `Step 4: Price it.\n\nIf that stage converted like its neighbors, how much more revenue would you have? That gap is what the constraint is costing you per year.`,
    `Now you have the one move that matters, ranked above everything else.\n\nMost businesses skip this and burn a whole quarter optimizing a stage that was never the problem.`,
  ] },

  // The 5 numbers under revenue — the forecasting teardown
  { pillar: 'forecasting', kind: 'thread', thread: () => [
    `Revenue feels random until you find the 4–5 numbers underneath it.\n\nThen next quarter stops being a guess and starts being a calculation.\n\nHere are the five.`,
    `1. Qualified leads in.\n\nNot all leads, the ones that actually fit. Garbage in, garbage forecast.`,
    `2. Conversion rate.\n\nLead to customer. This is where most "marketing problems" are actually hiding.`,
    `3. Average deal size.\n\nThe quietest lever. A pricing or packaging change moves this without a single new lead.`,
    `4. Churn.\n\nEvery point of churn is a tax on every future month. Small changes compound hard.`,
    `5. Cycle time.\n\nHow long from first touch to cash. Shorten it and everything upstream gets cheaper.`,
    `Move those five and revenue moves.\n\nWatch revenue alone and you're always a quarter late, reacting to a number that's already set.`,
  ] },

  // Business Solutions deep-dive — teaches, then sells the done-for-you line
  { pillar: 'solution', kind: 'thread', thread: () => [
    `Most growth advice stops at the diagnosis.\n\nThe hard part was never knowing what's wrong. It's having the time and the system to actually fix it.\n\nHere's what closes that gap.`,
    `A diagnosis names the constraint.\n\nBut a name doesn't ship. Someone has to build the 90-day plan and run it, while you keep the business running.`,
    `That's the trap most owners are in. They can see the problem clearly. They just can't bolt another full-time job onto their week to fix it.`,
    `Three ways through it:\n\n• Do it yourself with a template\n• Run the diagnostic and execute in-house\n• Have us build and run the whole system`,
    `Whichever rung you're on, the thinking is identical: name the one constraint, price the fix, and grade the call against your real revenue.`,
    `That's Growth Terminal. Diagnosis-first, done at whatever level you need.\n\nStart free, scale to done-for-you when you're ready.\n\ngrowthterminal.io`,
  ] },
];

module.exports = { FORMATS, THREADS, SYMPTOM_DISEASE, CEILINGS, SOFT_CTA };
