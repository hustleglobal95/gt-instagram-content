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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
};

// ---------------- formats ----------------
// kind: aphorism | systems | authority | diagnostic | progression | formula | bi | mistake | product
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
      return `Most owners think it's a ${s.symptom} problem.\nUsually it's a ${s.constraint} problem.\n\nThe symptom is where it hurts. The constraint is where you fix it.`;
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
      return `After analyzing hundreds of businesses, one pattern keeps showing up:\n\nMost think they have a ${s.symptom} problem.\nMost actually have a ${s.constraint} problem.\n\nThe symptom is loud. The constraint is quiet. Growth lives in the quiet one.`;
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

  // --- Product as consequence (~1 in 10) ---
  { pillar: 'product', kind: 'product', render: () => `We built Growth Terminal for one reason:\n\nEvery business we looked at already had the answer in its own data, and no way to see it.\n\nThe constraint was never information. It was interpretation.` },

  // =====================================================================
  // CALIBRATED formats, the structures actually winning on Threads
  // (foundr / hormozi / audienceassetlab). Weighted heavily on purpose.
  // =====================================================================

  // "Stop X before Y.", imperative reframe (top performer)
  { pillar: 'constraint', kind: 'reframe', render: () => `Stop scaling the channel before you've fixed the funnel.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Stop hiring before you've fixed the process.\n\nMore people in a broken process just buys a more expensive bottleneck.` },
  { pillar: 'bi', kind: 'reframe', render: () => `Stop buying traffic you can't measure.\n\nYou're not growing.\n\nYou're funding a leak you can't see.` },
  { pillar: 'decision', kind: 'reframe', render: () => `Stop optimizing the metric that isn't the constraint.\n\nEverything else is just motion.` },

  // "X without Y is just Z.", the contrast punch
  { pillar: 'constraint', kind: 'reframe', render: () => `Growth without a diagnosis is just expensive guessing.` },
  { pillar: 'decision', kind: 'reframe', render: () => `A dashboard without a decision is just decoration.` },
  { pillar: 'bi', kind: 'reframe', render: () => `Data without interpretation is just noise with confidence.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `More traffic without conversion is just a bigger leak.` },

  // "X is just [reframe]." / "X isn't a problem. It's a [reframe]."
  { pillar: 'constraint', kind: 'reframe', render: () => `A revenue problem is just a constraint you haven't named yet.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Most marketing problems are just operations problems with better lighting.` },
  { pillar: 'mistake', kind: 'reframe', render: () => `Losing a bad-fit customer isn't churn.\n\nIt's a filter.` },
  { pillar: 'constraint', kind: 'reframe', render: () => `The business that scales doesn't need more customers.\n\nIt needs fewer bottlenecks.` },

  // "Fastest way to X: [one surprising answer].", colon hook
  { pillar: 'constraint', kind: 'hook', render: () => `Fastest way to grow:\n\nFix the slowest step.` },
  { pillar: 'decision', kind: 'hook', render: () => `Fastest way to waste a budget:\n\nScale before you diagnose.` },
  { pillar: 'bi', kind: 'hook', render: () => `Fastest way to find the bottleneck:\n\nFollow the money to the stage it stops moving.` },

  // Framework + staccato triad closer (hormozi "Promote. Deliver. Build.")
  { pillar: 'systems', kind: 'framework', render: () => `Every business runs on the same loop:\n\nGet attention.\nConvert it.\nKeep it.\n\nMost break at step 2, and spend all their money on step 1.` },
  { pillar: 'constraint', kind: 'framework', render: () => `Fixing growth is three moves:\n\nName the constraint.\nFix it.\nRe-diagnose.\n\nThe constraint always moves. Most people stop after one.` },

  // Observed-pattern authority (real, un-fakeable angle)
  { pillar: 'mistake', kind: 'authority', render: () => `We keep seeing the same thing across businesses:\n\nThe leak is never where the owner is looking.\n\nIt's one stage upstream.` },
];

module.exports = { FORMATS, SYMPTOM_DISEASE, CEILINGS };
