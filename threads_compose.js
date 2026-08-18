/**
 * threads_compose.js, Markus writes his own posts
 * -----------------------------------------------------------------------------
 * The bank was a fixed asset: 89 posts, and on day 149 it ran dry having learned
 * nothing. This composes instead of drawing.
 *
 * HOW IT WORKS, honestly. There is no language model in a GitHub Action, so this
 * is combinatorial, not generative. Each audience has themes, and each theme
 * carries interchangeable observations, mechanisms, turns and closers that were
 * written to slot together. A post is assembled from one of each.
 *
 * Atoms only combine inside their own theme. That is the whole trick: it buys
 * variety without the incoherence you get from combining across topics.
 *
 * Everything it produces goes through threads_guard.js like anything else, and
 * the guard is now the only thing between this file and a live account.
 *
 * Yield: 5 audiences x 3 themes x 3^4 combinations = 1,215 coherent posts,
 * against 89 hand written ones. Verified by the CLI at the bottom.
 */

const { AUDIENCES, PRODUCTS, VOICE } = require('./threads_kb');

const pick = (a, rnd) => a[Math.floor((rnd ?? Math.random()) * a.length) % a.length];
const P = PRODUCTS;

/* Each theme: obs (the situation, concrete), mech (why it happens), turn (what
 * it means or what to do), close (a real question, or a landing that is not a
 * question at all). Written so any obs pairs with any mech in the same theme. */

const THEMES = {
  founders: [
    {
      id: 'no-proof',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `The first ten customers are the hardest you will ever get.`,
        `Nobody warns you that early sales feel like asking for a favour.`,
        `The hardest part of the first year is that nothing you say about your product is backed by anything yet.`,
      ],
      mech: [
        `It is not the product. At ten customers the product is usually fine and definitely fixable.`,
        `The problem is not persuasion. It is that you have nothing to point at.`,
        `Every one of those ten is somebody taking a personal risk on a stranger.`,
      ],
      turn: [
        `Which means the early work is not more features. It is one person who used it and said something true about it in public.`,
        `So the job is not to get better at asking. It is to need to ask less.`,
        `The smallest useful thing you can build is evidence, not scope.`,
      ],
      close: [
        `It gets easier, and not for the reason people tell you.`,
        `If you are somewhere in the first ten, say where you are.`,
        `What was the first piece of proof you could actually point at?`,
      ],
    },
    {
      id: 'wrong-size-advice',
      obs: [
        `Most of the advice you are following was written for a company ten times your size.`,
        `"Build a brand" is real advice and it is not advice for you yet.`,
        `The startup playbook you are reading assumes a team you do not have.`,
      ],
      mech: [
        `It quietly assumes distribution you have not built and a year of runway you are not sitting on.`,
        `It was written by people describing what worked after they already had reach.`,
        `At four hours a week that advice does not scale down, it inverts.`,
      ],
      turn: [
        `What applies early is smaller and more boring. Talk to ten people. Sell before you finish. Watch one number.`,
        `The tell is whether the advice needs an audience to work. Most of it does.`,
        `Read it as if you have four hours, not four people, and half of it stops applying.`,
      ],
      close: [
        `What is the advice you followed longest before realising it was written for someone else?`,
        `Worth checking what you are optimising and who wrote the list.`,
        `Most of it is not wrong. It is just not yet.`,
      ],
    },
    {
      id: 'reading-silence',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `Silence after a launch is the least informative thing that can happen to you.`,
        `Nobody bought it and nobody saw it look identical from where you are sitting.`,
        `The first month cannot tell you what you want it to tell you.`,
      ],
      mech: [
        `Two completely different problems produce the same empty dashboard, and they need opposite fixes.`,
        `Few visitors and few sales is reach. Plenty of visitors and few sales is the offer.`,
        `You are trying to read a verdict out of a sample size that cannot hold one.`,
      ],
      turn: [
        `So the number to look at first is visitors, not sales. One of those tells you nothing until the other is real.`,
        `Under about two hundred visitors I do not let myself draw conclusions about the offer at all.`,
        `Get the traffic question settled before you touch the copy.`,
      ],
      close: [
        `Fifteen people is not a verdict.`,
        `Which of the two did your last quiet launch actually have?`,
        `Most people rewrite the page when the page was never the problem.`,
      ],
    },
  ],

  building: [
    {
      id: 'threshold',
      obs: [
        `Ten things at ten percent effort leaves you with nothing anyone outside would notice.`,
        `A busy week and a productive week look identical from inside and nothing like each other from outside.`,
        `The list of things that would be nice will happily consume the entire week.`,
      ],
      mech: [
        `Improvement is not linear. Almost everything worth doing has a threshold, and under it the return is zero, not small.`,
        `Half a landing page does not convert half as well. It converts like no landing page.`,
        `Partial work does not bank partial credit. It usually banks none.`,
      ],
      turn: [
        `So the question each week is not what could I do. It is what can I get over the line.`,
        `Pick one and let the other nine sit visibly undone.`,
        `Deciding what you are allowed to leave unfinished is half the job.`,
      ],
      close: [
        `It feels worse and works better.`,
        `What is the one thing you are getting over the line this week?`,
        `Nobody outside your head is grading the other nine.`,
      ],
    },
    {
      id: 'the-gap',
      obs: [
        `The version in your head is finished. The version on the screen is not.`,
        `You can describe what you are building in one sentence and what you did this week takes four minutes.`,
        `Shipping something you were proud of into complete silence is a specific kind of week.`,
      ],
      mech: [
        `Almost all the discouragement lives in that gap, and the gap does not close.`,
        `You are comparing real work against an imagined finished thing, which is not a fair comparison and never will be.`,
        `Most of building is waiting, and the waiting reads as a verdict when it is just latency.`,
      ],
      turn: [
        `You do not get better at closing it. You get better at not measuring against it.`,
        `The useful move is a smaller next step, not more motivation.`,
        `Motivation is what people call it afterwards, once the step turned out to be small enough to take.`,
      ],
      close: [
        `If you are somewhere similar this week, say so.`,
        `What did you ship this week that nobody noticed?`,
        `Not a lesson. Just where I am.`,
      ],
    },
    {
      id: 'evidence-not-shame',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `The folder of unfinished projects is data, not a character flaw.`,
        `Everyone has a graveyard of half built things and almost nobody looks at it properly.`,
        `You already know what you abandon. You have just never written it down.`,
      ],
      mech: [
        `They have a shape. Mine were all things that needed me to show up daily forever.`,
        `What you quit tells you more about what to build than what you finished does.`,
        `The pattern is about the demands of the work, not about discipline.`,
      ],
      turn: [
        `So the question before you start is not can I build this. It is have I ever sustained this shape of work.`,
        `Pick the thing whose ongoing cost matches a week you actually have.`,
        `Evidence about yourself beats a description of yourself every time.`,
      ],
      close: [
        `Go and look at the folder. It is the cheapest research available to you.`,
        `What shape are the ones you abandoned?`,
        `Month eight is the honest test, not launch week.`,
      ],
    },
  ],

  tampa: [
    {
      id: 'referral-sentence',
      offer: 'attr',   // this theme is genuinely covered by the guide
      obs: [
        `Your positioning is not the sentence on your website.`,
        `When somebody refers you, they use words you have probably never heard.`,
        `There is a sentence about your business doing all the work, and you did not write it.`,
      ],
      mech: [
        `It is the sentence somebody says in a kitchen when you are not in the room.`,
        `It got written by accident, out of whatever was easiest to remember and repeat.`,
        `It is almost never the thing you spent money saying. It is shorter and slightly unflattering.`,
      ],
      turn: [
        `You can find it. Ask three customers the exact words they used when they referred you.`,
        `The job is to make it easier to repeat, not to replace it with something you prefer.`,
        `Whatever comes back is your actual positioning. Work from that.`,
      ],
      close: [
        `Tampa Bay owners: what do people ask you for by name?`,
        `Most owners have never heard it said out loud.`,
        `That sentence is the asset. The website is a transcript at best.`,
      ],
    },
    {
      id: 'quietly-busy',
      offer: 'attr',   // this theme is genuinely covered by the guide
      obs: [
        `The businesses around here that stay busy through a slow quarter are almost never the loudest.`,
        `Something I notice at every Tampa Bay event: the people doing best are asking the most questions.`,
        `The ones fighting hardest for attention tend to be the ones people trust least.`,
      ],
      mech: [
        `Every extra push reads as a reason to doubt, because confident businesses do not chase.`,
        `They are the obvious answer to one specific question, and the answer travels without them present.`,
        `Being findable is cheap here. Being verifiable is not, and that is what people are actually checking.`,
      ],
      turn: [
        `Being the obvious choice for one thing beats being an option for six.`,
        `Growth locally is a trust problem before it is a reach problem.`,
        `Make yourself easy to check rather than hard to miss.`,
      ],
      close: [
        `It also feels worse for about a year, because you turn work away while you are still small.`,
        `What is the one thing people come to you for specifically?`,
        `The quiet ones are not lucky. They are legible.`,
      ],
    },
    {
      id: 'local-advantage',
      obs: [
        `Tampa, St Pete, Clearwater and Sarasota get treated as one market because they share a map.`,
        `A slow August around here is not a broken business. It is August.`,
        `The cheapest research available to a local business is a twenty minute drive.`,
      ],
      mech: [
        `They do not share the same customer, the same rent or the same summer.`,
        `Seasonality here is real and most plans quietly pretend it is not.`,
        `Five conversations tell you more than five months of analytics, and here they are actually possible.`,
      ],
      turn: [
        `Ask three customers what they almost chose instead. The names that come back are your real competitors.`,
        `Plan for the month that does this every year instead of redesigning in response to it.`,
        `Use the thing a remote business cannot: you can meet the people who pay you.`,
      ],
      close: [
        `Where are you actually, and who actually buys from you?`,
        `They are rarely the competitors you have been watching.`,
        `Most local businesses are sitting on research they have never collected.`,
      ],
    },
  ],

  ai: [
    {
      id: 'rented-foundation',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `Your AI product depends on somebody else's model.`,
        `The thing nobody puts in the launch post: half your behaviour is downstream of a roadmap you do not control.`,
        `If your product is a wrapper, that is fine. Most software is a wrapper around something.`,
      ],
      mech: [
        `They update it, half your behaviour changes, and you find out from a support ticket.`,
        `A prompt pack is a trade. A workflow that survives a model swap is an asset.`,
        `The question is whether you own anything that outlives the thing underneath changing.`,
      ],
      turn: [
        `Four weeks on an asset is an investment. Four weeks on a trade only pays if you can reach buyers before it spoils.`,
        `Usually what you own is the workflow, the data, or the relationship. Rarely the model.`,
        `Price the window honestly instead of pretending there is not one.`,
      ],
      close: [
        `What has to stay the same for this to still be worth buying in eighteen months?`,
        `If the answer is a roadmap you do not control, you are renting.`,
        `The mistake is not picking the trade. It is picking the trade and planning like you picked the asset.`,
      ],
    },
    {
      id: 'demo-vs-job',
      obs: [
        `A lot of AI products launch with the same shape: impressive demo, unclear job.`,
        `Demos are the most used and least useful sales tool in this category.`,
        `Nobody is impressed by AI on its own anymore.`,
      ],
      mech: [
        `A demo proves capability. Buyers are shopping for reliability, and those are almost unrelated.`,
        `People can see that it works. They cannot see what it is for.`,
        `The demo sells the technology and the buyer is trying to buy an outcome.`,
      ],
      turn: [
        `The pitch that lands is the job, done, with a number attached. Three hours becomes twenty minutes.`,
        `"It hallucinates sometimes" is a scope question, not a bug report. Build for the tasks that tolerate a wrong answer.`,
        `Lead with what changes on Tuesday, not with the architecture.`,
      ],
      close: [
        `Which is good news, because it is a fairer fight for a small team.`,
        `What is the job your product actually does, in one sentence, no architecture?`,
        `Capability is table stakes now. Reliability is the product.`,
      ],
    },
    {
      id: 'cost-of-being-chosen',
      offer: 'attr',   // this theme is genuinely covered by the guide
      obs: [
        `AI moved the cost of building down and did nothing to the cost of being chosen.`,
        `Building got cheap. Trust did not.`,
        `Pricing AI products is awkward in a way most founders discover late.`,
      ],
      mech: [
        `Which means the hard part is further along than it used to be, and most people are still optimising the easy part.`,
        `Your costs move with usage and your buyer wants a flat number. Somebody absorbs that variance.`,
        `Speed of shipping went to nearly zero and speed of being believed did not move at all.`,
      ],
      turn: [
        `Decide on purpose who eats the variance, because the default is you.`,
        `The work that used to be optional is now the whole job.`,
        `Spend the time you saved building on the part that got harder.`,
      ],
      close: [
        `That gap is the entire strategic situation right now.`,
        `What part of your product breaks first if your provider swaps the model tonight?`,
        `Almost nobody is planning around it.`,
      ],
    },
  ],

  sellOnline: [
    {
      id: 'workaround-signal',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `The strongest buying signal there is, and almost nobody looks for it: somebody who already built the ugly version by hand.`,
        `A spreadsheet held together with copy and paste is a purchase order nobody has read yet.`,
        `Before you build anything, look for people doing it manually.`,
      ],
      mech: [
        `They have already agreed to the premise and already spent the hours.`,
        `You do not have to convince them of anything. You only have to reach them.`,
        `Somebody who built a workaround has priced the problem in their own time already.`,
      ],
      turn: [
        `So the question before building is not is this a good idea. It is has anyone paid for a worse version.`,
        `Go and find the manual version before you design the automatic one.`,
        `Money already moving, questions already asked, workarounds already built. Everything else is noise.`,
      ],
      close: [
        `If nobody has ever done it by hand, you are not early. You are alone, and those look identical from inside.`,
        `Where are the people doing this the hard way right now?`,
        `The ugly spreadsheet is the market research.`,
      ],
    },
    {
      id: 'price-signal',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `Pricing your first product low is the most expensive safe decision available.`,
        `Do not price below the band in your category.`,
        `The instinct is that nobody knows you, so you should be cheap.`,
      ],
      mech: [
        `In a category where everything sits between nineteen and thirty nine, a nine dollar product does not read as a bargain. It reads as unfinished.`,
        `Price is a quality signal when the buyer has no other information about you, and early on they have none.`,
        `The people who buy at the low price are the ones who tell everyone else what it is worth.`,
      ],
      turn: [
        `Record what everyone else charges first. Not to match it, but to know what you are asking a buyer to unlearn.`,
        `Raising later is harder than starting there.`,
        `Set the number from the category, not from your nerves.`,
      ],
      close: [
        `Cheap is a claim about the product, and it is one you are making by accident.`,
        `What is the band in your category, and where did you land against it?`,
        `The discount you are giving is mostly to yourself.`,
      ],
    },
    {
      id: 'read-the-evidence',
      offer: 'wts',   // this theme is genuinely covered by the guide
      obs: [
        `Read the three star reviews on your competitors and ignore the five star ones.`,
        `The best product brief you will ever get is free and already written.`,
        `Competition is not a warning sign.`,
      ],
      mech: [
        `Three stars means somebody wanted it to work, used it properly, and was let down by something specific enough to name.`,
        `Five stars are written by people in a good mood who would have been happy anyway.`,
        `A category with sellers is the only proof you get that buyers exist and will open a wallet.`,
      ],
      turn: [
        `Collect twenty and the same three complaints appear in different words. Those three are your feature list.`,
        `The customers who teach you most are the ones who nearly did not buy.`,
        `A category with no sellers is usually a graveyard you have not toured yet.`,
      ],
      close: [
        `Written by buyers, for free, and almost nobody reads them.`,
        `What is the complaint that keeps coming up about the thing you want to build?`,
        `Free with no support and forty forum posts explaining the workaround is a category, not a competitor.`,
      ],
    },
  ],
};

/* Offer wrappers. The value has to be complete before the link, so the post
 * still works for somebody who never clicks. OFFER_POLICY caps these at a
 * quarter of output and forbids them in replies entirely. */
const OFFER_TAILS = {
  wts: [
    (t) => `${t}\n\nThe full method is in ${P.wts.name}. ${P.wts.pages} pages, ${P.wts.worksheets} worksheets, and a test that can fail.\n\n${P.wts.price}. ${P.wts.url}`,
    (t) => `${t}\n\nI wrote the long version of this down so I would stop improvising it. ${P.wts.name}, ${P.wts.price}.\n\n${P.wts.url}`,
    (t) => `${t}\n\n${P.wts.name} covers this properly: ${P.wts.promise}.\n\n${P.wts.price}. ${P.wts.url}`,
  ],
  attr: [
    (t) => `${t}\n\nThat is the whole argument of ${P.attr.name}. ${P.attr.pages} pages on ${P.attr.promise}.\n\n${P.attr.price}. ${P.attr.url}`,
    (t) => `${t}\n\nI wrote ${P.attr.pages} pages on this one idea. ${P.attr.name}, ${P.attr.price}.\n\n${P.attr.url}`,
  ],
};

/* ---------------------------------------------------------------------------
   Assembly
   --------------------------------------------------------------------------- */

const SHAPES = [
  (o, m, t, c) => `${o}\n\n${m}\n\n${t}\n\n${c}`,
  (o, m, t, c) => `${o}\n\n${m}\n\n${t}`,
  (o, m, t, c) => `${o}\n\n${t}\n\n${c}`,
];

function composeSingle(audienceKey, opts = {}) {
  const themes = THEMES[audienceKey];
  if (!themes) throw new Error(`unknown audience ${audienceKey}`);
  const th = opts.theme ? themes.find((x) => x.id === opts.theme) : pick(themes);
  const o = pick(th.obs), m = pick(th.mech), t = pick(th.turn), c = pick(th.close);
  const shape = pick(SHAPES);
  let text = shape(o, m, t, c);

  /* An offer only attaches to a theme the guide actually covers. Pitching
   * What To Sell under a post about discouragement is the kind of loose fit
   * that reads as a bot pattern matching on keywords, so themes without an
   * `offer` field never carry a link and the caller silently gets the plain
   * post instead. */
  const offered = opts.offer && th.offer;
  if (offered) {
    const tail = pick(OFFER_TAILS[th.offer]);
    // drop the closer when an offer follows, so the post does not ask a
    // question and then immediately talk over the answer
    text = tail(`${o}\n\n${m}\n\n${t}`);
  }

  return {
    text,
    pillar: AUDIENCES[audienceKey].pillar,
    kind: offered ? 'offer' : audienceKey,
    audience: audienceKey,
    theme: th.id,
    source: 'composed',
  };
}

/* Threads are the same atoms, unrolled one beat per part. The self reply chain
 * is what manufactures early depth, which is the mechanic that makes threads
 * outperform singles 5.7x on this account. */
function composeThread(audienceKey, opts = {}) {
  const themes = THEMES[audienceKey];
  const th = opts.theme ? themes.find((x) => x.id === opts.theme) : pick(themes);
  const parts = [pick(th.obs), pick(th.mech), pick(th.turn)];
  // a second mechanism beat, chosen to differ from the first
  const m2 = th.mech.filter((x) => x !== parts[1]);
  if (m2.length) parts.splice(2, 0, pick(m2));
  const t2 = th.turn.filter((x) => x !== parts[parts.length - 1]);
  if (t2.length) parts.push(pick(t2));

  if (opts.offer && th.offer) {
    parts.push(pick(OFFER_TAILS[th.offer])('').trim());
  } else {
    parts.push(pick(th.close));
  }

  return {
    parts,
    pillar: AUDIENCES[audienceKey].pillar,
    kind: 'thread',
    audience: audienceKey,
    theme: th.id,
    source: 'composed',
  };
}

/* How many distinct posts this file can produce, counted rather than estimated. */
function capacity() {
  let singles = 0, threads = 0;
  for (const key of Object.keys(THEMES)) {
    for (const th of THEMES[key]) {
      const base = th.obs.length * th.mech.length * th.turn.length;
      singles += base * th.close.length * SHAPES.length;
      threads += base * Math.max(1, th.mech.length - 1) * Math.max(1, th.turn.length - 1);
    }
  }
  return { singles, threads, total: singles + threads };
}

const offerableThemes = () => Object.entries(THEMES)
  .flatMap(([a, ts]) => ts.filter((t) => t.offer).map((t) => ({ audience: a, theme: t.id, product: t.offer })));

module.exports = { composeSingle, composeThread, capacity, offerableThemes, THEMES, OFFER_TAILS };

if (require.main === module) {
  const n = parseInt(process.argv[2] || '5', 10);
  const keys = Object.keys(THEMES);
  console.log('capacity:', JSON.stringify(capacity()));
  for (let i = 0; i < n; i++) {
    const k = keys[i % keys.length];
    const p = (i % 3 === 2) ? composeThread(k) : composeSingle(k, { offer: i % 4 === 1 });
    console.log(`\n──── ${p.audience}/${p.theme} ${p.parts ? '(THREAD)' : ''} ────`);
    console.log(p.parts ? p.parts.join('\n   ↳ ') : p.text);
  }
}
