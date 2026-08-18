/**
 * threads_community.js
 * -----------------------------------------------------------------------------
 * The Threads copy bank for @markusreidgt, the Growth Terminal persona.
 *
 * WHO IT IS WRITTEN FOR
 *   new startup founders, people building something, business owners in Tampa
 *   Bay, new AI companies, and people wanting to sell online.
 *
 * WHAT IT SELLS
 *   What To Sell, $29, growthterminal.io/what-to-sell
 *   Attract, Don't Sell, $50, growthterminal.io/attract
 *   Roughly one post in four carries an offer. The rest earn the right to.
 *
 * WHY IT IS SHAPED LIKE THIS
 *   Multi-part threads pull 63 median views on this account. Singles pull 11.
 *   Reply depth outranks likes, saves outrank likes, and Threads throttles
 *   combative content rather than rewarding it. So nothing here dunks on the
 *   reader, and the threads are weighted heavily in threads_generate.js.
 *
 * Contract matches threads_bank.js:
 *   FORMATS: [{ pillar, kind, voice, render: () => string }]
 *   THREADS: [{ pillar, kind:'thread', voice, thread: () => string[] }]
 *
 * Every entry passes threads_guard.js. Keep it that way.
 */

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const P = {
  wts:   { name: 'What To Sell',        price: '$29', url: 'growthterminal.io/what-to-sell' },
  attr:  { name: "Attract, Don't Sell", price: '$50', url: 'growthterminal.io/attract' },
};

/* ===========================================================================
   THREADS. One per audience. These carry the reach.
   =========================================================================== */

const THREADS = [
  // people about to build the wrong thing
  { pillar: 'playbook', kind: 'thread', voice: 'markus', thread: () => [
    `A launch that sells nothing is not proof the product was wrong.\n\nIt is usually not proof of anything, and that is what costs people a month.`,
    `"Nobody bought it" looks identical whether the offer was bad or nobody ever saw the page.\n\nTwo different problems. Opposite fixes.`,
    `Telling them apart needs two numbers, not one. Visitors, and sales.\n\nFew visitors and few sales is a reach problem. Nothing you think you learned about the offer is real.`,
    `Plenty of visitors and few sales is an offer problem. They arrived, read it, and said no. That one is worth listening to.`,
    `My line is about two hundred visitors. Under that I do not let myself draw conclusions about the offer at all.\n\nFifteen people is not a verdict.`,
    `The whole method is in ${P.wts.name}. How to find demand you can point at, and how to run a test that can fail before you build anything.\n\n${P.wts.price}. ${P.wts.url}\n\nWhich of the two did your last quiet launch have?`,
  ] },

  // new AI companies
  { pillar: 'playbook', kind: 'thread', voice: 'markus', thread: () => [
    `Building an AI product right now has a problem nobody mentions in the launch posts.`,
    `Your product depends on somebody else's model. When they update it, half your behaviour changes and you find out from a support ticket.`,
    `That is not a reason to avoid it. It is a reason to price the window honestly. A prompt pack is a trade. A workflow that survives a model swap is an asset.`,
    `Four weeks on an asset is an investment. Four weeks on a trade only pays if you can reach buyers fast, because your inventory spoils.`,
    `The question I would ask before building: what has to stay the same for this to still be worth buying in eighteen months?\n\nIf the answer is a roadmap you do not control, you are renting.`,
    `${P.wts.name} has the full version of this, including which product types decay fastest and which still sell in year three.\n\n${P.wts.price}. ${P.wts.url}`,
  ] },

  // Tampa Bay owners
  { pillar: 'community', kind: 'thread', voice: 'markus', thread: () => [
    `Something I notice about businesses around Tampa that are actually busy.\n\nAlmost none of them are the loudest.`,
    `The ones fighting hardest for attention tend to be the ones people trust least. Every extra push reads as a reason to doubt.`,
    `The busy ones are usually just the obvious choice for one specific thing. Ask around about a specific problem and the same name comes back.`,
    `That is not luck and it is not a bigger ad budget. It is being known for one thing clearly enough that people can repeat it to someone else.`,
    `Selling starts with what you have. Attracting starts with what they are living through. Different starting point, completely different result.`,
    `That is the whole argument of ${P.attr.name}. 54 pages on being the obvious choice instead of the loudest one.\n\n${P.attr.price}. ${P.attr.url}\n\nIf you are in Tampa Bay, what do people ask you for by name?`,
  ] },

  // people wanting to sell online
  { pillar: 'playbook', kind: 'thread', voice: 'markus', thread: () => [
    `Every list of digital product ideas you have read was sorted by how exciting the category sounds.`,
    `None of them tell you what the thing costs you to run after it exists.`,
    `A template: almost no support, slow to date, still selling in year three.\nA guide: no support, needs a refresh eventually.\nA course: heavy to make, dated the moment the software redesigns.\nA community: no maintenance, endless presence.`,
    `Same four weeks of work. Completely different assets.`,
    `So the question is not whether you can build it. Almost anyone can build almost anything once.\n\nIt is whether you will still be doing it in month eight when it is boring and nobody is watching.`,
    `${P.wts.name} scores all seven categories on what they demand from you after launch, plus how to prove demand before you build.\n\n${P.wts.price}. ${P.wts.url}`,
  ] },

  // people building something
  { pillar: 'community', kind: 'thread', voice: 'markus', thread: () => [
    `The first ten customers are the hardest you will ever get and almost nobody explains why.`,
    `It is not the product. At ten customers the product is usually fine and definitely fixable.`,
    `It is that you have no proof. Every one of those ten is somebody taking a personal risk on a stranger with nothing to point at.`,
    `Which means the early work is not more features. It is the smallest piece of evidence: one person who used it and said something true about it in public.`,
    `And it means judging your idea by month one numbers is judging it during the exact period it cannot show any.`,
    `If you are somewhere in the first ten, say where. I want to know how many of us are in that stretch at the same time.`,
  ] },
];

/* ===========================================================================
   SINGLES, by audience.
   =========================================================================== */

const NEW_FOUNDERS = [
  `Nobody tells you the first ten customers are the hardest you will ever get.\n\nNot because the product is bad. Because you have no proof yet, so every sale is somebody taking a risk on you personally.\n\nIt gets easier. Not because you get better at asking, but because eventually you stop having to.`,
  `The advice you are following was written for a bigger company than yours.\n\n"Build a brand" and "nail your positioning" are real, and they assume a budget and a year you do not have.\n\nAt your size the answer is usually smaller and more boring than the advice suggests.`,
  `A thing I keep relearning: look at the number before you spend against it.\n\nTwice now I have been certain the problem was traffic, and twice the traffic was fine.`,
];

const BUILDING = [
  `Shipping something you were proud of into complete silence is a specific kind of week.\n\nThat is where I am. Not a lesson, just where I am.\n\nIf you are somewhere similar, say so.`,
  `A smaller week beats a busier one.\n\nTen things at ten percent effort leaves you with ten things slightly better and nothing anyone outside would notice.\n\nImprovements are not linear. Most have a threshold, and under it you get nothing at all.`,
  `The sentence I write before starting anything now:\n\n"By [date], [number] people will [action]. If fewer than [number] do, I was wrong about [the thing], and I will [stop or change]."\n\nTwo minutes. It is the difference between a result you can learn from and one you can read however you are feeling that day.`,
  `What did you ship this week that nobody noticed?\n\nAsking properly. I read every reply.`,
];

const TAMPA = [
  `If you run something in Tampa Bay, a question.\n\nWhen somebody refers you, what exact words do they use?\n\nThat sentence is your positioning, whether you wrote it or not. Most owners have never heard it said out loud.`,
  `The businesses around here that stay busy through a slow quarter usually have one thing in common.\n\nThey are the obvious answer to one specific question, and the answer travels without them in the room.`,
  `Local advantage nobody uses: you can actually meet your customers.\n\nFive conversations will tell you more than five months of analytics, and around here they are a twenty minute drive rather than a video call somebody reschedules twice.`,
];

const AI_COMPANIES = [
  `The AI product problem nobody puts in the launch post: your thing depends on somebody else's model.\n\nThey update it, half your behaviour changes, and you find out from a support ticket.\n\nWorth pricing that window honestly rather than pretending it is not there.`,
  `Watching a lot of AI products launch with the same shape.\n\nImpressive demo, unclear job. People can see it works. They cannot see what it is for.\n\nThe demo sells the technology. The buyer is shopping for an outcome.`,
  `If your product is a wrapper, that is fine. Most software is a wrapper around something.\n\nThe question is whether you own anything that survives the thing underneath changing. Usually that is the workflow, the data, or the relationship.`,
  `AI moved the cost of building down and did nothing to the cost of being chosen.\n\nWhich means the hard part is now further along than it used to be, and most people are still optimising the easy part.`,
];

const SELL_ONLINE = [
  `The strongest buying signal there is, and almost nobody looks for it: somebody who has already built the ugly version by hand.\n\nA spreadsheet held together with copy and paste. A folder system with a naming convention they invented.\n\nThey have already agreed to the premise and spent the hours. You do not have to convince them, only reach them.`,
  `Read the three star reviews on your competitors. Ignore the five star ones entirely.\n\nThree stars means somebody wanted it to work, used it properly, and was let down by something specific.\n\nThat specific thing is your product brief, written by a buyer, for free.`,
  `Do not price below the band on your first product.\n\nIn a category where everything sits between nineteen and thirty nine, a nine dollar product does not read as a bargain. It reads as unfinished.\n\nPrice is a quality signal when the buyer has no other information about you.`,
  `Competition is not a warning sign. It is the only proof you will ever get that buyers exist and will open a wallet.\n\nA category with no sellers is usually a graveyard you have not toured yet.`,
];

/* Value posts that ladder straight into a product. */
const LADDERS = [
  `Before you build anything, four questions. If you cannot answer them from something outside your own head, you are guessing.\n\n1. Who has already paid for something like this?\n2. Where are they asking about it in public?\n3. Has anyone built the ugly version by hand?\n4. What number would prove me wrong, and by when?\n\nThe fourth is the one everybody skips. All four, worked properly, are in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `Five questions worth asking any customer you can get in a room:\n\nWhat were you doing about this before you found us?\nWhat nearly stopped you buying?\nHow would you describe us to someone like you?\nWhat did you expect that did not happen?\nWhat would make you leave?\n\nWrite down their words, not your summary. That is most of the argument in ${P.attr.name}. ${P.attr.price}, ${P.attr.url}`,
];

/* ===========================================================================
   OFFERS. Roughly one in four.
   =========================================================================== */

const OFFERS = [
  `Wrote down the method I use to pick what to build, mostly so I would stop improvising it.\n\n${P.wts.name}. How to find a digital product people will actually pay for, before you build it. 74 pages, nine worksheets, and a test that can fail.\n\n${P.wts.price}. ${P.wts.url}\n\nThe posts stay free either way. This is just the long version.`,
  `If you are about to spend a month building something, the cheapest thing you can do first is spend an evening proving anyone wants it.\n\nThat is what ${P.wts.name} is. Demand you can point at, capacity you can sustain, and a fourteen day test with a number you wrote down in advance.\n\n${P.wts.price}. ${P.wts.url}`,
  `Selling harder makes people trust you less.\n\nEvery extra push reads as a reason to doubt, because confident businesses do not chase. The move is to be findable and obviously right, so the buyer arrives already sold.\n\n${P.attr.name}. 54 pages. ${P.attr.price}. ${P.attr.url}`,
  `Two guides, one argument between them.\n\n${P.wts.name} is how to choose the thing. ${P.wts.price}.\n${P.attr.name} is how to make people come to you for it. ${P.attr.price}.\n\n${P.wts.url}\n${P.attr.url}`,
];

const single = (pillar, kind, pool) =>
  ({ pillar, kind, voice: 'markus', render: () => pick(pool) });

const FORMATS = [
  single('early',     'founders',    NEW_FOUNDERS),
  single('community', 'building',    BUILDING),
  single('community', 'tampa',       TAMPA),
  single('systems',   'ai',          AI_COMPANIES),
  single('playbook',  'sell_online', SELL_ONLINE),
  single('playbook',  'ladder',      LADDERS),
  single('product',   'offer',       OFFERS),
];

module.exports = { FORMATS, THREADS };
