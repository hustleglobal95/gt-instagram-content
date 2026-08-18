/**
 * threads_kb.js, what Markus Reid knows
 * -----------------------------------------------------------------------------
 * This is the knowledge base the rest of the Threads pipeline reasons from.
 * Nothing here is a vibe. Every mechanic carries a `confidence` and the number
 * of independent sources that agreed, because parts of this contradict each
 * other in the wild and the code needs to know which parts are load bearing.
 *
 * confidence:
 *   'strong'   3+ independent sources agree, or it is measured on this account
 *   'moderate' 2 sources agree, no contradiction found
 *   'contested' sources disagree; the value here is the consensus and the
 *               disagreement is recorded in `dispute` so nobody re-litigates it
 *               from memory later
 *
 * Researched August 2026. Threads changes fast. Re-run the research before
 * trusting anything in here past roughly Q1 2027, and update `asOf`.
 */

const asOf = '2026-08';

/* ===========================================================================
   1. HOW DISTRIBUTION ACTUALLY WORKS
   =========================================================================== */

const MECHANICS = {
  signalHierarchy: {
    confidence: 'strong',
    sources: 3,
    // Ordered strongest to weakest. This is the single most important fact in
    // the file: it is the opposite of platforms that rank on passive signals.
    order: ['reposts', 'replies', 'quotes', 'saves', 'likes'],
    note: 'Replies and reposts drive distribution. Likes are nearly inert. Optimising a post for likes is optimising for the one signal that does not move reach.',
  },

  replyLength: {
    confidence: 'moderate',
    sources: 2,
    minWordsToCount: 8,
    note: 'Replies under roughly 8 words register weakly. "Same!" and "This." are close to worthless as signal, both when received and when given. Every reply Markus writes must clear 8 words to be worth the API call.',
  },

  velocityWindow: {
    confidence: 'strong',
    sources: 3,
    decisiveMinutes: 60,
    criticalMinutes: 30,
    note: 'The first 30 to 60 minutes decide distribution. 20 replies in 30 minutes beats 50 replies over 24 hours. Reach is not a function of total engagement, it is a function of early engagement rate.',
    implication: 'Never post when nobody can respond for the following hour. An unattended post in a good window is worse than a post in a mediocre window with someone present.',
  },

  selfReply: {
    confidence: 'moderate',
    sources: 1,
    windowSeconds: 90,
    note: 'Replying to your own post quickly increases thread depth and early velocity. This is why multi part threads outperform singles: the thread is a self reply chain that manufactures its own early depth.',
    measuredHere: 'Threads pull 5.7x the reach of singles on this account. Median 63 views against 11 across 78 posts.',
  },

  cadence: {
    confidence: 'contested',
    sources: 4,
    consensusPerDay: [2, 3],
    hardCeiling: 5,
    dispute: 'Four sources: one says 3 to 5 a day, one says no more than 2, one says 1 to 3 with harm above 5, one says 2 to 3. Nobody recommends more than 5. The mechanism for the harm is specific and consistent: extra posts split the same audience across more velocity windows, per post engagement rate falls, and per post engagement rate is what distribution is computed from.',
    note: 'Posting more is not neutral. It actively lowers the number that decides reach. This is the opposite of how volume works on most platforms.',
  },

  textOnly: {
    confidence: 'strong',
    sources: 3,
    note: 'Text only posts underperform posts carrying an image. One source measures roughly 60 percent more engagement on image posts, two others describe plain text reach as collapsed or underperforming.',
    gapHere: 'Every post this account publishes is text only. This is the single largest untapped lever in the pipeline and it is not a copy problem.',
  },

  links: {
    confidence: 'strong',
    sources: 3,
    penalised: false,
    note: 'External links are not penalised outright. Bare links are. A link wrapped in a real thought performs normally, a link dropped on its own underperforms.',
    implication: 'The offer posts already wrap links in context. Keep it that way. Never publish a naked URL.',
  },

  tone: {
    confidence: 'strong',
    sources: 3,
    note: 'Positive and constructive engagement outperforms combative engagement. One analysis of 2,000+ accounts in Q1 2026 found positive accounts grew roughly 3x faster than accounts using X style controversy. Threads actively throttles what X rewards.',
    implication: 'No dunking, no ragebait, no "most people get this wrong". The guard blocks these as guru-closer and they are a distribution problem, not just a taste problem.',
  },

  smallAccounts: {
    confidence: 'strong',
    sources: 3,
    note: 'Follower count matters less here than on other platforms. The For You feed pulls from unfollowed accounts weighted by topic match and engagement velocity, so a small account with fast early replies can outreach a large account with slow ones.',
  },

  topicNarrowness: {
    confidence: 'moderate',
    sources: 2,
    note: 'Topic consistency helps the recommendation system classify the account and place it in topic feeds. Drifting across unrelated subjects makes the account harder to surface.',
  },
};

/* ===========================================================================
   2. COMMUNITY PRACTICE, THE 70/30 RULE
   =========================================================================== */

const COMMUNITY = {
  ratio: {
    confidence: 'strong',
    sources: 3,
    engagingShare: 0.7,
    postingShare: 0.3,
    note: 'Roughly 70 percent of the work is replying to other people, 30 percent is publishing. One source puts it plainly: the sum of an account\'s replies is worth about as much as the sum of its posts.',
  },

  repliesPerDay: {
    confidence: 'strong',
    sources: 2,
    target: [10, 15],
    note: 'Ten to fifteen considered replies a day on other people\'s posts. This is the growth engine, not the posting schedule.',
  },

  whoToReplyTo: {
    confidence: 'strong',
    sources: 2,
    followerMultiple: [2, 10],
    note: 'Target accounts with 2x to 10x your follower count. Below that there is no audience to borrow, far above it your reply is buried under hundreds of others and never seen.',
  },

  replyQuality: {
    confidence: 'strong',
    sources: 3,
    note: 'Helpful and specific beats witty. Generic cleverness underperforms. A reply that adds a fact, a counterexample or a concrete number is what earns a profile visit. A reply that performs personality earns nothing.',
    rules: [
      'Add something the original post did not say.',
      'Never open by restating their point back to them.',
      'Never pitch. A reply that mentions a product is an ad in someone else\'s comment section.',
      'Clear 8 words or do not send it.',
      'Answer people who reply to you, especially in the first hour. This is both courtesy and the cheapest velocity there is.',
    ],
  },

  inboundFirst: {
    confidence: 'strong',
    sources: 2,
    note: 'Replying to people who replied to you is the highest value reply available. It costs no discovery, it deepens a thread that is already live, and it happens inside the velocity window that decides the post\'s reach.',
  },
};

/* ===========================================================================
   3. THE AUDIENCES. Who this account is for, in their own terms.
   =========================================================================== */

const AUDIENCES = {
  founders: {
    label: 'new start up founders',
    pillar: 'early',
    // What is actually true of their week. Copy grounded in these lands;
    // copy grounded in what a founder is supposed to care about does not.
    reality: [
      'no proof yet, so every sale is a personal risk somebody takes on them',
      'following advice written for companies ten times their size',
      'cannot tell whether silence is rejection or nobody having seen it',
      'asked for a differentiator before they have one',
      'funding advice reaches them before customer advice does',
    ],
    wants: 'to know whether the thing is working yet',
    fears: 'that they are behind, and that everyone else knows something they do not',
    productFit: 'wts',
  },
  building: {
    label: 'people building something',
    pillar: 'community',
    reality: [
      'shipped something and heard nothing back',
      'the version in their head is finished and the real one is not',
      'a week spent on ten things at ten percent, with nothing over the line',
      'a folder of unfinished projects they read as a character flaw',
      'waiting, which nobody warned them was most of it',
    ],
    wants: 'company, and a smaller next step',
    fears: 'that the silence is a verdict',
    productFit: 'wts',
  },
  tampa: {
    label: 'business owners in Tampa Bay',
    pillar: 'community',
    reality: [
      'referred by a sentence they have never heard said out loud',
      'busy through the local network until the network moves',
      'treated as one market across Tampa, St Pete, Clearwater and Sarasota',
      'a slow August that gets misread as a broken business',
      'competing with names they have never thought to check',
    ],
    wants: 'to be the obvious choice for one thing',
    fears: 'being invisible outside the people who already know them',
    productFit: 'attr',
  },
  ai: {
    label: 'new AI companies',
    pillar: 'systems',
    reality: [
      'a product that depends on somebody else\'s model roadmap',
      'an impressive demo and an unclear job',
      'costs that move with usage and buyers who want a flat number',
      'reliability being the actual purchase, not capability',
      'building got cheap and being chosen did not',
    ],
    wants: 'to own something that survives the model underneath changing',
    fears: 'that the whole thing is a wrapper with a shelf life',
    productFit: 'wts',
  },
  sellOnline: {
    label: 'people wanting to sell online',
    pillar: 'playbook',
    reality: [
      'picking a product by copying something already visibly selling',
      'no way to tell a demand failure from a traffic failure',
      'pricing from nerves rather than from the category band',
      'treating competition as a warning instead of as proof',
      'a free alternative that is worse but genuinely free',
    ],
    wants: 'evidence before spending a month building',
    fears: 'building the wrong thing and finding out late',
    productFit: 'wts',
  },
};

/* ===========================================================================
   4. THE OFFER LADDER
   =========================================================================== */

const PRODUCTS = {
  wts:  { name: 'What To Sell',        price: '$29', url: 'growthterminal.io/what-to-sell',
          pages: 74, worksheets: 9,
          promise: 'how to find a digital product people will pay for, before you build it',
          proves: ['demand you can point at', 'capacity you can sustain', 'a fourteen day test that can fail'] },
  attr: { name: "Attract, Don't Sell", price: '$50', url: 'growthterminal.io/attract',
          pages: 54,
          promise: 'how to be the obvious choice instead of the loudest one',
          proves: ['being chosen is a different job from being seen', 'selling harder reads as a reason to doubt'] },
};

const OFFER_POLICY = {
  maxShareOfPosts: 0.25,
  note: 'Roughly one post in four may carry a product link, and it must be wrapped in a real thought. Sources warn that promotional content underperforms; the protection is that the value is complete before the link, so the post works whether or not anyone clicks.',
  neverInReplies: true,
  replyNote: 'Never put a product link in a reply to somebody else\'s post. That is the fastest way to read as a bot and it is what gets accounts muted.',
};

/* ===========================================================================
   5. VOICE. The constraints that make it sound like a person.
   =========================================================================== */

const VOICE = {
  person: 'first',
  forbidden: [
    'em dashes and en dashes, anywhere, ever',
    'emoji',
    'the word hub',
    'engagement bait CTAs, including any variant of say it below',
    'tenure or results claims the account cannot evidence',
    'guru closers that tell the reader everyone else is stupid',
    'restating the reader\'s situation back at them as if it were insight',
  ],
  habits: [
    'concrete over abstract, always. A number, a place, a specific week.',
    'admit the limit of what is known rather than rounding up to certainty.',
    'end on a real question or on nothing. Never on a demand for engagement.',
    'spell out numbers inside prose, use digits for prices and page counts.',
    'short paragraphs with blank lines between them. Threads renders them as beats.',
  ],
  note: 'The test for any sentence: could this have been written by someone who had not done the thing? If yes, cut it.',
};

/* ===========================================================================
   6. WHAT THE ACCOUNT HAS ACTUALLY MEASURED
   =========================================================================== */

const OBSERVED = {
  asOf: '2026-08',
  threadVsSingle: { threadMedianViews: 63, singleMedianViews: 11, multiple: 5.7, sampleSize: 78 },
  medianReachAt12PerDay: 14,
  actualRepliesReceived: 0,
  note: 'The account has received zero genuine replies. Every reply recorded against its threads is the thread replying to itself. That is the number the whole strategy has to move, and it is why the reply engine matters more than the posting schedule.',
};

module.exports = { asOf, MECHANICS, COMMUNITY, AUDIENCES, PRODUCTS, OFFER_POLICY, VOICE, OBSERVED };
