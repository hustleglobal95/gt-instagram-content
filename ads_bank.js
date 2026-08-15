/**
 * ads_bank.js: captions for the video ads you drop into ads/queue.
 *
 * The organic engine's captions are written per creative layout, because the
 * engine made the creative and knows what is on it. It did not make these. A
 * video ad arrives already scripted, already edited, already carrying its own
 * argument, and the caption's only job is to sit under it without arguing back.
 *
 * So these are deliberately short and deliberately about the product rather
 * than about the video. They say what Growth Terminal does and what to do
 * next. They do not describe the footage, because a caption that describes a
 * video the reader is already watching is the most reliable way to look
 * automated.
 *
 * If a particular ad needs its own words, drop a .txt file next to it with the
 * same name and ads_generate.js will use that instead. This bank is the floor,
 * not the ceiling.
 *
 * House rule, enforced by the build: no em dashes, no en dashes, anywhere.
 */

/* Four hashtags, not eleven, matching the organic engine's decision. */
const TAGS = '#growthterminal #googlesheetstips #startupmetrics #saasgrowth'

/** Each entry: the caption, and the first comment that opens the thread.
 *  Keep them under about 400 characters. Instagram truncates at 125 in the
 *  feed and almost nobody taps more. */
const ADS = [
  {
    id: 'ad-constraint-01',
    caption: 'Most growth advice is a list of things to try.\n\nGrowth Terminal reads the numbers you already keep and names the one constraint capping revenue right now, with the range it is costing you and how confident the engine is. One answer, not forty metrics to interpret.',
    fc: 'What would you fix first if you knew for certain it was the one?'
  },
  {
    id: 'ad-sheet-01',
    caption: 'It runs on the spreadsheet you already have.\n\nOpen the Google Sheets add-on in a workbook with your numbers, press Analyze, and the engine scores twelve places growth gets stuck and ranks them against your data. No new stack, no migration, no onboarding call.',
    fc: 'Which of the twelve do you think is yours right now?'
  },
  {
    id: 'ad-verified-01',
    caption: 'Anyone can make a confident call. Almost nobody checks it afterwards.\n\nEvery forecast the engine makes gets logged and graded against what actually happened. You find out which calls keep landing and which do not. Being wrong out loud is the feature.',
    fc: 'When was the last time a tool told you it got something wrong?'
  },
  {
    id: 'ad-priced-01',
    caption: 'A constraint you cannot price is a conversation. A constraint with a number on it is a decision.\n\nThe engine names what is capping growth, attaches the revenue range it is costing, and gives you a ninety day plan with the gates to check it against.',
    fc: 'What is the one number that would settle your next big decision?'
  },
  {
    id: 'ad-symptom-01',
    caption: 'The thing that is obviously broken is usually not the thing that is actually costing you.\n\nGrowth Terminal separates the symptom from the constraint, so you stop spending a quarter fixing something downstream of the real problem.',
    fc: 'Ever fixed the loud problem and watched nothing change?'
  },
  {
    id: 'ad-plan-01',
    caption: 'The answer is not the deliverable. The plan is.\n\nEvery diagnosis comes with ninety days of work, phased, with decision gates: what has to be true by week four to keep going, and what it means if it is not. You always know whether to continue or re-diagnose.',
    fc: 'How do you currently decide when to stop something that is not working?'
  },
  {
    id: 'ad-team-01',
    caption: 'Built for people who have to defend the call.\n\nEvery analysis shows its reasoning, the evidence for it, the evidence against it, and what would prove it wrong. You can hand it to a client or a board without translating it first.',
    fc: 'Who do you have to convince before anything gets funded?'
  },
  {
    id: 'ad-speed-01',
    caption: 'Faster than the meeting where you argue about what to do.\n\nData in, one constraint out, priced and planned, in about the time it takes to read the last report nobody acted on.',
    fc: 'How long does it usually take you to agree on the problem?'
  }
]

module.exports = { ADS, TAGS }
