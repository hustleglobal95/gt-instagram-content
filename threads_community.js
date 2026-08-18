/**
 * threads_community.js, the Growth Terminal Threads copy bank
 * -----------------------------------------------------------------------------
 * Written for five audiences the account is actually trying to reach:
 *
 *   new start up founders
 *   people building something
 *   business owners in Tampa Bay
 *   new AI companies
 *   people wanting to sell online
 *
 * Everything here is first person, plain, and written to earn a reply rather
 * than a like. Replies are what Threads distributes on. Nothing in here uses a
 * results claim the account cannot evidence, and nothing uses the direct
 * response scaffolding that threads_bank.js was built on.
 *
 * Every string in this file is run through threads_guard.js before it posts.
 *
 * Shape:
 *   FORMATS: [{ pillar, kind, voice, render: () => string }]
 *   THREADS: [{ pillar, kind:'thread', voice, thread: () => string[] }]
 */

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const P = {
  wts:   { name: 'What To Sell',        price: '$29', url: 'growthterminal.io/what-to-sell' },
  attr:  { name: "Attract, Don't Sell", price: '$50', url: 'growthterminal.io/attract' },
};

/* ===========================================================================
   THREADS. These carry the reach: 63 median views against 11 for a single.
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

  // new founders, the advice mismatch
  { pillar: 'early', kind: 'thread', voice: 'markus', thread: () => [
    `Most of the advice you are following was written for a company ten times your size.`,
    `"Build a brand." "Nail your positioning." "Invest in content." All real. All written by people describing what worked once they already had a team and a year of runway.`,
    `At four hours a week and no budget, that advice does not scale down. It inverts. The brand work that pays for a company with reach is the work that starves a company without it.`,
    `What actually applies early is smaller and more boring. Talk to ten people who have the problem. Sell something before you finish it. Watch one number.`,
    `The tell is whether the advice assumes distribution you already have. Most of it quietly does.`,
    `What is the piece of advice you followed longest before realising it was written for someone else?`,
  ] },

  // building, the threshold idea
  { pillar: 'community', kind: 'thread', voice: 'markus', thread: () => [
    `Ten things at ten percent effort leaves you with nothing anyone outside would notice.`,
    `Improvement is not linear. Almost everything worth doing has a threshold, and under it the return is not small, it is zero.`,
    `Half a landing page does not convert half as well. It converts like no landing page. Two replies a week is not a quarter of a community, it is silence with extra steps.`,
    `Which makes the question worth asking each week not "what could I do" but "what can I get over the line".`,
    `I now pick one thing and let the other nine sit visibly undone. It feels worse and works better.`,
    `What is the one thing you are getting over the line this week?`,
  ] },

  // selling online, review mining
  { pillar: 'playbook', kind: 'thread', voice: 'markus', thread: () => [
    `The best product brief you will ever get is free and already written. It is your competitor's three star reviews.`,
    `Five star reviews tell you nothing. They are written by people in a good mood who would have been happy anyway.`,
    `One star reviews tell you almost nothing either. Wrong product, wrong buyer, shipping problem, bad week.`,
    `Three stars is the useful band. Somebody wanted it to work, used it properly, and got let down by something specific enough to name.`,
    `Collect twenty of them and the same three complaints keep appearing in different words. Those three are your feature list, written by buyers, for free.`,
    `That method plus eight others is in ${P.wts.name}, along with how to score what you find instead of just feeling it.\n\n${P.wts.price}. ${P.wts.url}`,
  ] },

  // AI, the moat question
  { pillar: 'systems', kind: 'thread', voice: 'markus', thread: () => [
    `One question separates AI products that will exist in two years from the ones that will not.`,
    `If the model got twice as good tomorrow, and free, what would still be worth paying you for?`,
    `If the honest answer is "nothing", that is not a failure. It means you are selling a trade, not an asset, and trades have to be sold fast while the window is open.`,
    `If the answer is the workflow, the data, or the relationship, you own something. The model underneath can change and the product survives.`,
    `The mistake is not picking the trade. It is picking the trade and then planning like you picked the asset.`,
    `If you are building with AI: what part of your product would break first if your provider swapped the model tonight?`,
  ] },

  // Tampa, the referral sentence
  { pillar: 'community', kind: 'thread', voice: 'markus', thread: () => [
    `Your positioning is not the sentence on your website. It is the sentence somebody says about you in a kitchen when you are not there.`,
    `Most owners have never heard that sentence out loud. It exists, it is doing all the work, and it was written by accident.`,
    `You can find it. Ask three customers how they described you to the person they referred. Not what you do. The exact words they used.`,
    `What comes back is almost never the thing you spent money saying. It is shorter, more specific, and slightly unflattering.`,
    `That sentence is the asset. The job is to make it easier to repeat, not to replace it with something you like better.`,
    `Tampa Bay owners: what do people ask you for by name?`,
  ] },

  // pricing
  { pillar: 'playbook', kind: 'thread', voice: 'markus', thread: () => [
    `Pricing your first digital product low is the most expensive safe decision available.`,
    `The logic feels sound. Nobody knows me, so I should be cheap. Lower the barrier, get the first sales, raise it later.`,
    `What actually happens: in a category where everything sits between nineteen and thirty nine, a nine dollar product does not read as a bargain. It reads as unfinished.`,
    `Price is a quality signal when the buyer has no other information about you. Early on, they have no other information about you.`,
    `And raising later is harder than starting there, because the people who bought at nine are the ones who tell others what it is worth.`,
    `${P.wts.name} covers the bands each product type can carry, and how to set yours from competitor evidence instead of nerves.\n\n${P.wts.price}. ${P.wts.url}`,
  ] },

  // the kill number
  { pillar: 'forecast', kind: 'thread', voice: 'markus', thread: () => [
    `Write the number that would prove you wrong before you start. Not after.`,
    `Once the thing exists you will be unable to do it honestly. Everyone is generous with a product they have already paid for in hours.`,
    `The sentence is boring on purpose. By this date, this many people will do this thing. If fewer do, I was wrong about this, and I will stop or change.`,
    `It takes two minutes and it is the difference between a result you can learn from and one you can read whichever way you feel that morning.`,
    `Most people skip it because a number that can fail is uncomfortable to write down. That discomfort is the entire value of writing it down.`,
    `The full version, including how to tell a demand failure from a traffic failure, is in ${P.wts.name}.\n\n${P.wts.price}. ${P.wts.url}`,
  ] },
];

/* ===========================================================================
   SINGLES, by audience.
   =========================================================================== */

const NEW_FOUNDERS = [
  `Nobody tells you the first ten customers are the hardest you will ever get.\n\nNot because the product is bad. Because you have no proof yet, so every sale is somebody taking a risk on you personally.\n\nIt gets easier. Not because you get better at asking, but because eventually you stop having to.`,
  `The advice you are following was written for a bigger company than yours.\n\n"Build a brand" and "nail your positioning" are real, and they assume a budget and a year you do not have.\n\nAt your size the answer is usually smaller and more boring than the advice suggests.`,
  `A thing I keep relearning: look at the number before you spend against it.\n\nTwice now I have been certain the problem was traffic, and twice the traffic was fine.`,
  `The first version of your pitch is for you, not for them.\n\nYou need it to explain what you built and why it took so long. They need to know what changes on Tuesday.\n\nThose are different sentences and the second one is much shorter.`,
  `Interest is the metric that fooled me longest.\n\nPeople telling you it is a good idea costs them nothing. It is not a signal, it is politeness with a nice haircut.\n\nThe cheapest real signal is somebody asking when they can have it.`,
  `You will be asked what your differentiator is before you have one.\n\nFair question, wrong stage. Early on you do not have an edge. You have a bet, and the bet is that a specific group of people are underserved in a specific way.\n\nSay that instead of inventing a moat.`,
  `Same idea, two founders, different outcome, and it is usually not the product.\n\nOne of them spoke to buyers in week one. The other built for eleven weeks and then spoke to buyers.\n\nThe second one learned the same things, just after they were expensive.`,
  `Something I got wrong for a long time: treating no reply as a no.\n\nMost no replies are not a decision. The message arrived on a Tuesday, got buried, and nobody involved thought about it again.\n\nA second message a week later is not pestering. It is the whole job.`,
  `The stage nobody photographs: you have built enough that stopping feels expensive, and not enough that continuing feels obvious.\n\nEverybody posts from before it or after it. Almost nobody posts from inside it.\n\nIf you are in it right now, you are not behind.`,
  `Funding advice will reach you before customer advice does. It is louder, better organised and written by people whose job is funding.\n\nAt your size one customer usually teaches you more than one investor meeting.\n\nBoth are useful. The order is the part people get wrong.`,
  `What is the smallest thing you could sell this month if you were not allowed to build anything new?\n\nGenuinely asking. The answer is usually already sitting there and it is usually the thing you think is too simple to charge for.`,
  `Every founder I talk to underestimates the same thing: how long it takes a stranger to notice you exist.\n\nNot to buy. To notice.\n\nPlans built on week one attention are plans built on the one thing you have no control over.`,
];

const BUILDING = [
  `Shipping something you were proud of into complete silence is a specific kind of week.\n\nThat is where I am. Not a lesson, just where I am.\n\nIf you are somewhere similar, say so.`,
  `A smaller week beats a busier one.\n\nTen things at ten percent effort leaves you with ten things slightly better and nothing anyone outside would notice.\n\nImprovements are not linear. Most have a threshold, and under it you get nothing at all.`,
  `The sentence I write before starting anything now:\n\n"By [date], [number] people will [action]. If fewer than [number] do, I was wrong about [the thing], and I will [stop or change]."\n\nTwo minutes. It is the difference between a result you can learn from and one you can read however you are feeling that day.`,
  `What did you ship this week that nobody noticed?\n\nAsking properly. I read every reply.`,
  `Half of building is deciding what you are allowed to leave undone.\n\nThe list of things that would be nice is infinite and it will happily consume the entire week, and at the end of it nothing will have crossed a line anyone can see.`,
  `Nobody warns you how much of building is waiting.\n\nYou ship, and then nothing happens for four days. The silence reads as a verdict when it is usually just latency.\n\nMost things that eventually worked looked exactly like this at the start.`,
  `The version in your head is finished. The version on the screen is not.\n\nAlmost all the discouragement lives in that gap, and the gap does not close. You just get better at not measuring against the imaginary one.`,
  `Ask me what I am working on and I can answer in one sentence.\n\nAsk me what I actually did this week and it takes four minutes and sounds like admin.\n\nWhen that gap gets wide, something has gone wrong with the week, not with me.`,
  `A rule I stole and kept: if version one takes more than a week, the scope is wrong, not the deadline.\n\nIt is a scope test disguised as a schedule. That is why it works.`,
  `The folder of unfinished projects is data, not shame.\n\nLook at what shape they were. Mine were all things that needed me to show up daily forever, which told me something true about what I should build next.`,
  `You do not need more motivation. You need a smaller next step.\n\nMotivation is what people call it afterwards, once the step turned out to be small enough to take.`,
  `What are you building right now, in one sentence, no pitch?\n\nI want to see what people are actually working on rather than what they are announcing.`,
];

const TAMPA = [
  `If you run something in Tampa Bay, a question.\n\nWhen somebody refers you, what exact words do they use?\n\nThat sentence is your positioning, whether you wrote it or not. Most owners have never heard it said out loud.`,
  `The businesses around here that stay busy through a slow quarter usually have one thing in common.\n\nThey are the obvious answer to one specific question, and the answer travels without them in the room.`,
  `Local advantage nobody uses: you can actually meet your customers.\n\nFive conversations will tell you more than five months of analytics, and around here they are a twenty minute drive rather than a video call somebody reschedules twice.`,
  `Tampa, St Pete, Clearwater, Sarasota. Four markets that get treated as one because they share a map.\n\nThey do not share the same customer, the same rent, or the same summer.\n\nWhere are you actually, and who actually buys from you?`,
  `Seasonality here is real and most plans quietly ignore it.\n\nA slow August is not a broken business. It is August. The mistake is redesigning everything in response to a month that does this every year.`,
  `The cheapest research available to a local business: ask three customers what they almost chose instead.\n\nThe names that come back are your real competitors. They are rarely the ones you have been watching.`,
  `The referral you get is never the one you asked for.\n\nIt is the one somebody could remember and repeat while standing in a kitchen holding a drink. Short, specific, slightly unflattering.\n\nThat is the sentence to make easier to say, not the one on your homepage.`,
  `A lot of very good businesses around here are close to invisible online and completely fine, because the local network does the work.\n\nThat holds until the network moves or the quarter goes slow. Then it turns out nobody outside the network knows the name.`,
  `Being the obvious choice for one thing beats being an option for six.\n\nIt also feels worse for about a year, because you turn work away while you are still small enough to want all of it.`,
  `Something I notice at every Tampa Bay event: the people doing the best are the ones asking the most questions.\n\nThe ones performing expertise are usually between things.`,
  `Growth around here is mostly a trust problem, not a reach problem.\n\nEverybody can be found. Fewer can be verified. The businesses that win locally made themselves easy to check.`,
  `If you are a Tampa Bay owner: what is the one question a customer asks that tells you they are ready to buy?\n\nMine took a year to notice and now it decides how the whole conversation goes.`,
];

const AI_COMPANIES = [
  `The AI product problem nobody puts in the launch post: your thing depends on somebody else's model.\n\nThey update it, half your behaviour changes, and you find out from a support ticket.\n\nWorth pricing that window honestly rather than pretending it is not there.`,
  `Watching a lot of AI products launch with the same shape.\n\nImpressive demo, unclear job. People can see it works. They cannot see what it is for.\n\nThe demo sells the technology. The buyer is shopping for an outcome.`,
  `If your product is a wrapper, that is fine. Most software is a wrapper around something.\n\nThe question is whether you own anything that survives the thing underneath changing. Usually that is the workflow, the data, or the relationship.`,
  `AI moved the cost of building down and did nothing to the cost of being chosen.\n\nWhich means the hard part is now further along than it used to be, and most people are still optimising the easy part.`,
  `The AI pitch that lands now is not "powered by AI".\n\nIt is the job, done, with a number attached. What used to take three hours takes twenty minutes. That sentence sells. The architecture does not.`,
  `Every AI company I look at closely has one of two problems.\n\nEither the model is impressive and the workflow around it is missing, or the workflow is genuinely good and they oversold the model part because it demos better.`,
  `Pricing AI products is awkward because your costs move with usage and your buyer wants a flat number.\n\nSomebody absorbs that variance. Decide on purpose which one of you it is, because the default is you.`,
  `Demos are the most used and least useful sales tool for AI products.\n\nA demo proves capability. Buyers are shopping for reliability, and those are almost unrelated.`,
  `"It hallucinates sometimes" is not a bug report. It is a product scope question.\n\nWhich tasks tolerate a wrong answer, and which ones do not? Build for the first list and stay out of the second until you can prove otherwise.`,
  `Speed of building went to nearly zero. Speed of trust did not move at all.\n\nThat gap is the entire strategic situation right now, and almost nobody is planning around it.`,
  `Nobody is impressed by AI anymore and that is good news.\n\nIt means you are back to being judged on whether the thing works and whether anyone needed it, which is a fairer fight for a small team.`,
  `If you are building with AI: what part of your product breaks first if the provider swaps the model tonight?\n\nWorth knowing the answer before it happens rather than during.`,
];

const SELL_ONLINE = [
  `The strongest buying signal there is, and almost nobody looks for it: somebody who has already built the ugly version by hand.\n\nA spreadsheet held together with copy and paste. A folder system with a naming convention they invented.\n\nThey have already agreed to the premise and spent the hours. You do not have to convince them, only reach them.`,
  `Read the three star reviews on your competitors. Ignore the five star ones entirely.\n\nThree stars means somebody wanted it to work, used it properly, and was let down by something specific.\n\nThat specific thing is your product brief, written by a buyer, for free.`,
  `Do not price below the band on your first product.\n\nIn a category where everything sits between nineteen and thirty nine, a nine dollar product does not read as a bargain. It reads as unfinished.\n\nPrice is a quality signal when the buyer has no other information about you.`,
  `Competition is not a warning sign. It is the only proof you will ever get that buyers exist and will open a wallet.\n\nA category with no sellers is usually a graveyard you have not toured yet.`,
  `Free is not your competition. Free with no support, no updates and forty forum posts explaining the workaround is a category, and it is usually the one you are actually selling against.\n\nName what the free option costs people in time. That is your whole pitch.`,
  `The question that saves the most money before building: has anyone paid for a worse version of this?\n\nIf nobody ever has, you are not early. You are alone, and those look identical from the inside.`,
  `Sales pages fail at the same spot almost every time.\n\nThey describe what the thing is and never say what changes. The buyer is trying to picture their Tuesday afterwards and the page will not help them do it.`,
  `Search volume is a bad target when you sell one thing.\n\nA hundred people with the exact problem beat ten thousand people who are curious about the topic. You do not need a market. You need the part of it that is already looking.`,
  `Refund rate tells you what the sales number hides.\n\nSales say the page worked. Refunds say the product did not match the page. Those are two different jobs and only one of them is fixed by better copy.`,
  `Record what everyone else in your category charges before you set a price.\n\nNot to match it. So you know exactly what you are asking a buyer to unlearn when your number is different.`,
  `The customers who teach you the most are the ones who nearly did not buy.\n\nThey can name the exact sentence that almost stopped them, which is something no happy customer can do for you.`,
  `Marketplace, audience, or search.\n\nThree completely different machines, and the product type you pick quietly commits you to one of them before you have thought about it.\n\nWorth choosing that on purpose.`,
];

/* Value posts that ladder straight into a product. */
const LADDERS = [
  `Before you build anything, four questions. If you cannot answer them from something outside your own head, you are guessing.\n\n1. Who has already paid for something like this?\n2. Where are they asking about it in public?\n3. Has anyone built the ugly version by hand?\n4. What number would prove me wrong, and by when?\n\nThe fourth is the one everybody skips. All four, worked properly, are in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `Five questions worth asking any customer you can get in a room:\n\nWhat were you doing about this before you found us?\nWhat nearly stopped you buying?\nHow would you describe us to someone like you?\nWhat did you expect that did not happen?\nWhat would make you leave?\n\nWrite down their words, not your summary. That is most of the argument in ${P.attr.name}. ${P.attr.price}, ${P.attr.url}`,
  `Three places demand actually shows up, in order of how much they are worth:\n\nMoney already moving. Somebody is paying for a worse version right now.\nQuestions already asked. The same question, three times in thirty days, from three different people.\nWorkarounds already built. Someone made the ugly spreadsheet themselves.\n\nEverything else is noise. How to record and score all three is in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `Four questions to ask about yourself before you pick a product type, and none of them are about personality:\n\nHave you ever answered the same question forty times without resenting it?\nHave you updated anything twice?\nWhat is in your unfinished folder, and what shape is it?\nHow visible are you willing to be in month eight?\n\nEvidence, not self description. The full sheet is in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `The minimum sellable version, per type, roughly:\n\nTemplate: one file that works, one page telling them how to use it.\nGuide: the method, complete, no filler chapters.\nCourse: one module people finish.\nCommunity: twenty people and a reason to open it on a Monday.\n\nIf version one takes more than a week, the scope is wrong. Every spec is in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `Being chosen is a different job from being seen, and most of the budget goes to the wrong one.\n\nSeen is reach. Chosen is what happens in the eleven seconds after they arrive, when they are deciding whether you are the obvious answer or one more option.\n\n${P.attr.name} is 54 pages on the second job. ${P.attr.price}, ${P.attr.url}`,
  `The three numbers worth watching in your first ninety days:\n\nHow many people arrived.\nHow many bought.\nHow many asked for their money back.\n\nEverything else is decoration at this size. What to do when each one moves is in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
  `How to tell a demand failure from a traffic failure, since they look identical in a dashboard:\n\nFew visitors, few sales. Reach problem. You learned nothing about the offer.\nMany visitors, few sales. Offer problem. They read it and said no.\n\nUnder about two hundred visitors, do not draw conclusions at all. The whole method is in ${P.wts.name}. ${P.wts.price}, ${P.wts.url}`,
];

/* ===========================================================================
   OFFERS.
   =========================================================================== */

const OFFERS = [
  `Wrote down the method I use to pick what to build, mostly so I would stop improvising it.\n\n${P.wts.name}. How to find a digital product people will actually pay for, before you build it. 74 pages, nine worksheets, and a test that can fail.\n\n${P.wts.price}. ${P.wts.url}\n\nThe posts stay free either way. This is just the long version.`,
  `If you are about to spend a month building something, the cheapest thing you can do first is spend an evening proving anyone wants it.\n\nThat is what ${P.wts.name} is. Demand you can point at, capacity you can sustain, and a fourteen day test with a number you wrote down in advance.\n\n${P.wts.price}. ${P.wts.url}`,
  `Selling harder makes people trust you less.\n\nEvery extra push reads as a reason to doubt, because confident businesses do not chase. The move is to be findable and obviously right, so the buyer arrives already sold.\n\n${P.attr.name}. 54 pages. ${P.attr.price}. ${P.attr.url}`,
  `Two guides, one argument between them.\n\n${P.wts.name} is how to choose the thing. ${P.wts.price}.\n${P.attr.name} is how to make people come to you for it. ${P.attr.price}.\n\n${P.wts.url}\n${P.attr.url}`,
  `${P.wts.name} exists because I got tired of watching people spend a month building something nobody had asked for.\n\nIt is the order I now work in. Demand first, capacity second, a test that can fail third. Nine worksheets so it is something you do, not something you read.\n\n${P.wts.price}. ${P.wts.url}`,
  `The chapter people quote back to me from ${P.wts.name} is the one on killing it.\n\nWhat threshold you set in advance, how to respect it when you no longer want to, and what carries into the next attempt. Nobody writes that part.\n\n${P.wts.price}. ${P.wts.url}`,
  `If people are already finding you and still not buying, more reach is the expensive fix for the wrong problem.\n\n${P.attr.name} is about the other one. Being the obvious choice by the time they arrive, so the sale is already over.\n\n54 pages. ${P.attr.price}. ${P.attr.url}`,
  `Seven product types, scored on what each one demands from you after launch. Support load, maintenance, how visible you have to stay, and how fast it goes out of date.\n\nThat table is the middle of ${P.wts.name} and it is the part I would have paid for on its own.\n\n${P.wts.price}. ${P.wts.url}`,
  `A guide about picking what to sell, written for people who have not sold anything yet and do not have an audience to launch into.\n\n${P.wts.name}. 74 pages, nine worksheets, and a fourteen day test with a number you write down before you can talk yourself out of it.\n\n${P.wts.price}. ${P.wts.url}`,
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
