/**
 * threads_voice.js, the person behind @markusreidgt.
 * -----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 *
 * The account is a person's handle and the bank was written in a company's
 * voice. Every post said "Wrong." and "Fix it at the source" and "most
 * businesses leak the traffic they already have": true, useful, and with
 * nobody in it. Threads is a room where people talk to people, so a named
 * account publishing institutional copy reads as a brand wearing a name badge.
 *
 * The thin data already points the same way. The best rated pillar in
 * threads_performance_log.json is authority, and its best post opens "I turned
 * a dead account around by changing one thing." The second best opens "If
 * you're building something and nobody's engaging yet, read this before you
 * quit posting." Both are a person. Everything below them is a lecture. That
 * is 3 posts and 46 views, so it is a hint and not a finding, but it points
 * where this file goes anyway.
 *
 * WHO HE IS
 *
 * Markus builds Growth Terminal. He is an operator, not a guru. He is early,
 * his numbers are small, and he says so. His authority does not come from
 * having won; it comes from measuring honestly while everyone around him
 * guesses, and from being willing to publish the misses.
 *
 * That last part is the whole personality, and it is the same argument the
 * product makes. A growth account that admits its own account is small is
 * doing on Threads exactly what the engine does with a forecast: writing the
 * number down before knowing whether it flatters him.
 *
 * WHAT HE NEVER DOES
 *
 * No invented clients. No revenue screenshots. No "I helped a client 10x".
 * No accuracy percentages for the engine, ever, for the same reason the voice
 * agent is forbidden from quoting one. No hustle-guru cadence, no "let that
 * sink in", no threads that are twelve parts of throat clearing.
 *
 * If a line could have been written by someone who had done none of the work,
 * it does not go in the bank.
 */

/* First person openers that carry a stake. Each one commits to something
   before it teaches anything, which is the difference between a person and a
   brand account. */
const I_OPENERS = [
  'I have been wrong about this for months.',
  'I checked my own numbers before writing this.',
  'I built a tool to answer this and it still surprised me.',
  'I used to believe the opposite.',
  'Nobody asked, but I keep seeing this and it costs people money.',
  'This one cost me time before it cost me anything else.',
  'Two weeks of data later and I owe someone an apology.',
  'I want to write this down before it stops being uncomfortable.',
  'I got told this a year ago and ignored it.',
];

/* Admissions. The account's credibility comes from these, not from wins.
   They are all true of an early product with a small audience. */
const ADMISSIONS = [
  'My account is small. I am telling you what I measure, not what I have conquered.',
  'I am early. What I have is the discipline, not the trophy.',
  'I do not have a big number to wave at you. I have a method and a log.',
  'Take this as a working note, not a victory lap.',
];

/* How he closes. Quiet, specific, and never a demand.
   Split in two, because "if you try it" after a post that offered nothing to
   try is the tell that a machine assembled the sentence. TRY closes follow a
   method. NOTE closes follow a reflection. */
const CLOSES_TRY = [
  'If you try it, tell me what happened. I keep a log of when I am wrong.',
  'Steal it. Tell me if it fails for you, that is the useful half.',
  'Run it on your own numbers before you believe me.',
];
const CLOSES_NOTE = [
  'I will report back when I have enough data to say it properly.',
  'That is the whole idea. No course attached.',
  'Filing it here so I cannot quietly forget I said it.',
];

/* ---------------------------------------------------------------------------
   THE PEER DIMENSION.

   Threads is full of people building alone and trying to find each other. That
   is the room this account is actually standing in, and it changes what
   authority means here: not "I know more than you" but "I am a few steps into
   the same thing and I will tell you what it actually costs".

   The log agrees, for what little it is worth. The two best posts in
   threads_performance_log.json are both peer to peer, and the single best
   opens "If you're building something and nobody's engaging yet, read this
   before you quit posting". Nothing instructional beat them.

   A note on questions. The image engine learned that question captions
   underperform statements three to one, and that learning must not be carried
   over here. On Instagram a caption is a label under a picture. On Threads a
   reply is the entire distribution mechanic, and for an account this size a
   genuine question is the only lever that reliably starts one. Different room,
   different rule.
   --------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
   WHAT ACTUALLY DISTRIBUTES ON THREADS.

   Researched rather than assumed, and the sources agree with each other more
   than marketing posts usually do. Written down here because half of it is
   implementable in this bank and half of it is not, and the half that is not
   is the more important half.

   MECHANICAL, and now built into the formats below:

   1. Replies outrank likes. Reply driven engagement is reported as the
      strongest single ranking signal, so every post should end somewhere a
      person can answer from. Not a call to action, an opening.
   2. Velocity beats volume. 20 replies in 30 minutes outranks 50 replies over
      24 hours, and a post 30 minutes old is recommended far more than one
      three hours old. Fewer posts, each given a chance to catch, beats five a
      day landing on nobody.
   3. The first two or three lines are the whole post. Threads truncates
      before the more link, so the hook has to stand alone and the shape that
      works is hook, then context, then position, then invitation.
   4. Multi part posts win here, which the account's own log already said:
      11 threads carried 46 of 57 interactions and not one of them landed
      silent, against 47 of 55 single posts that did.
   5. Topic consistency is rewarded. A narrow account is classified and
      matched more reliably than a broad one.
   6. Selling early suppresses reach. The offer CTAs in this bank should stay
      rare, and never in a post whose job is to start a conversation.

   HUMAN, and impossible from this repo:

   7. The largest lever in every source is replying to other people, 10 to 15
      thoughtful replies a day, because a reply puts the profile in front of
      an audience that has never seen it. An autoposter cannot do this and
      should not fake it: automated replies are named in the research as
      actively credibility destroying. This is a person's job, and it is worth
      more than anything in this file.
   8. Replying to the replies on your own post, quickly, counts toward the
      same signal. Also a person's job.

   So the honest position: this bank can make the posts worth replying to. It
   cannot do the replying, and the replying is where the growth is.
   --------------------------------------------------------------------------- */

/* The parts of building alone that people feel and do not post about. Every
   one of these has to be something actually endured, not observed. */
const SHARED_STRUGGLES = [
  'the week where you do everything right and the number does not move',
  'posting into what feels like an empty room',
  'shipping something you were proud of to complete silence',
  'the hour you lose deciding what to work on instead of working',
  'explaining what you are building to someone whose eyes go flat',
  'the quiet maths of how long the runway actually is',
  'watching someone with a worse product get all the attention',
  'the second week of a habit, when the novelty is gone and nothing has changed yet',
  'having a good day and being unable to tell anyone who would care',
  'rewriting the same paragraph because the real problem is you do not know the answer',
];

/* Real questions, asked because he wants the answer. Not engagement bait
   dressed as curiosity. The test: would he read every reply. */
const PEER_QUESTIONS = [
  'What is the thing you keep re-deciding instead of just deciding?',
  'What did you ship this week that nobody noticed?',
  'Who is the one person whose reply would make your week?',
  'What are you measuring that you suspect does not matter?',
  'What would you stop doing if you were sure it was not working?',
  'How long did it take before your first stranger showed up?',
  'What is the smallest thing that would make this week feel worth it?',
  'What advice did you follow for months before realising it did not apply to you?',
  'What are you avoiding because it would give you a real answer?',
  'Who else is building alone right now? I would like to know who is out there.',
  'What is the one number you check first in the morning?',
];

/* Small, unglamorous wins. The point is that they are small. An account that
   only posts breakthroughs teaches people that their own week is a failure. */
const SMALL_WINS = [
  'One person replied who I did not know. That is new.',
  'I cut four things off the list and the week got easier, not worse.',
  'A number I have watched for a month finally moved, slightly.',
  'I found the bug that had been quietly wasting the whole exercise.',
  'I said no to something that would have eaten the week.',
  'Someone I respect asked a question about it. Just a question. It mattered.',
  'I finished the boring piece I had been walking past for a fortnight.',
];

/* Things he believes, stated flatly. These are the spine of the persona and
   every one of them is a position Growth Terminal actually holds. */
const BELIEFS = [
  'Most growth advice is a guess wearing a confident tone.',
  'One constraint moves the number. The other nine are expensive company.',
  'A plan that cannot tell you it failed is not a plan, it is a wish.',
  'If you never write the forecast down, you will always remember being right.',
  'Volume is what people reach for when they do not know what to fix.',
];

module.exports = {
  I_OPENERS, ADMISSIONS, CLOSES_TRY, CLOSES_NOTE, BELIEFS,
  SHARED_STRUGGLES, PEER_QUESTIONS, SMALL_WINS,
};
