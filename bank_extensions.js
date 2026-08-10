/**
 * bank_extensions.js, layouts injected from the inspiration queue.
 * -----------------------------------------------------------------------------
 * generate.js merges this file into RENDER and GENERATORS at load. Keeping
 * injected work here rather than editing generate.js directly means the
 * inspiration loop can add to the bank without any risk of corrupting a 400KB
 * file that four workflows depend on.
 *
 * THE READY FLAG IS THE SAFETY GATE.
 * An entry with ready:false is rendered on demand for review but never enters
 * the posting rotation. inject.js creates entries as ready:false. A human flips
 * it to true after looking at a render. That is the only step in this loop a
 * machine does not do, and it is deliberately the only one that matters.
 *
 * Each entry carries the briefId it came from, so any layout in the bank can be
 * traced back to the ad that inspired it.
 */
const PALETTE = { ORANGE: '#FC5802', INK: '#17130F', WHITE: '#FDFCFC', CREAM: '#F5F0E7' };

const EXTENSIONS = [
  /* -------------------------------------------------------------------------
     The three entries below came out of ad_structure.js --gaps: structures the
     live-ad sample shows working repeatedly that this bank had nowhere. Each
     one names the brands it was read off, so the reasoning stays auditable.
     Run `node ad_structure.js --file <render>` on any of them to see the score.
     ------------------------------------------------------------------------- */
  {
    name: 'checklist',
    briefId: 'struct_asymmetric_checklist',
    ready: true,
    note: 'Asymmetric before/after checklist, read off Rippling (3 variants). The '
        + 'argument is carried by the asymmetry, four unchecked boxes against one '
        + 'checked box, not by the copy. Nothing here needs a superlative.',

    /* p: { headline, beforeLabel, before[], afterLabel, after, foot } */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      const box = (checked) => checked
        ? `<span style="display:inline-block;width:38px;height:38px;border-radius:10px;background:${ORANGE};
             color:${WHITE};font-size:24px;font-weight:800;text-align:center;line-height:38px;flex:none">&#10003;</span>`
        : `<span style="display:inline-block;width:38px;height:38px;border-radius:10px;
             border:2px solid rgba(253,252,252,.24);flex:none"></span>`;
      const row = (label, checked, dim) => `
        <div style="display:flex;align-items:center;gap:20px;padding:22px 0">
          ${box(checked)}
          <span style="font-size:34px;font-weight:${checked ? 700 : 500};
            color:${checked ? WHITE : 'rgba(253,252,252,' + (dim ? '.5' : '.72') + ')'}">${label}</span>
        </div>`;
      return `<div class="stage" style="background:${INK};color:${WHITE};padding:80px 74px;display:flex;flex-direction:column">
        ${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center">${logo(ORANGE, WHITE)}</div>
        <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:66px;font-weight:800;letter-spacing:-.025em;line-height:1.08">${p.headline}</div>
          <div style="display:flex;gap:46px;margin-top:56px">
            <div style="flex:1">
              <div style="font-size:21px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
                color:rgba(253,252,252,.42)">${p.beforeLabel}</div>
              <div style="margin-top:10px">${p.before.map(l => row(l, false, true)).join('')}</div>
            </div>
            <div style="flex:1">
              <div style="font-size:21px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
                color:${ORANGE}">${p.afterLabel}</div>
              <div style="margin-top:10px">${row(p.after, true, false)}</div>
            </div>
          </div>
        </div>
        <div style="position:relative;text-align:center;font-size:28px;font-weight:600;
          color:rgba(253,252,252,.86)">${p.foot}</div>
      </div>`;
    },

    bank: [
      { headline: 'Your quarter, simplified.',
        beforeLabel: 'Before', after: 'Run 1 diagnostic', afterLabel: 'After',
        before: ['Audit 12 categories', 'Argue about which', 'Guess the upside', 'Hope it was right'],
        foot: 'growthterminal.io',
        cap: 'Your quarter, simplified.\n\nMost teams spend the first three weeks arguing about which of the twelve places growth gets stuck is theirs. Growth Terminal reads the numbers you already have, names the one, prices it, and grades the call once the quarter plays out.',
        fc: 'How many weeks did your last planning cycle spend on step one?' },

      { headline: 'Same decision. Less theatre.',
        beforeLabel: 'The usual', after: 'Read the verdict', afterLabel: 'Instead',
        before: ['Build the dashboard', 'Pull 40 metrics', 'Pick a story', 'Defend it in the room'],
        foot: 'A verdict, not a dashboard.',
        cap: 'Same decision. Less theatre.\n\nA dashboard hands you forty numbers and lets whoever presents it choose the story. Growth Terminal returns one constraint, the evidence for it, the evidence against it, and what would prove it wrong.',
        fc: 'Who picks the story in your reporting meeting?' },

      { headline: 'Four steps you can skip.',
        beforeLabel: 'By hand', after: 'Paste the sheet', afterLabel: 'With GT',
        before: ['Clean the export', 'Model the funnel', 'Rank the leaks', 'Size the fix'],
        foot: 'About 60 seconds, in Google Sheets.',
        cap: 'Four steps you can skip.\n\nThe work of finding a constraint is real, it is just not work that a human needs to do by hand every quarter. Paste the sheet you already keep and the engine does the ranking and the sizing.',
        fc: 'Which of those four eats the most of your week?' },

      { headline: 'Every call answered. Even at 2am.',
        beforeLabel: 'Today', after: 'Agent books the meeting', afterLabel: 'With the agent',
        before: ['Rings out', 'Lead calls a rival', 'Voicemail piles up', 'Follow up Monday'],
        foot: 'AI voice agents. growthterminal.io',
        cap: 'Every call answered. Even at 2am.\n\nYour growth leaks at the first missed call. The Growth Terminal voice agent picks up 24/7 in your brand voice, hears the objection, works it, and books the meeting straight to your calendar.',
        fc: 'How many calls went to voicemail at your business this week?' },

      { headline: 'A week of content, off your plate.',
        beforeLabel: 'By hand', after: 'The engine runs daily', afterLabel: 'Automated',
        before: ['Design the ad', 'Write the caption', 'Post on 4 apps', 'Check what worked'],
        foot: 'Photo ads included. growthterminal.io',
        cap: 'A week of content, off your plate.\n\nThe Growth Terminal content engine builds on-brand photo ads and posts from your creative bank, publishes daily across the main platforms, and sharpens on what performs.',
        fc: 'How many days did your feed go dark last month?' },

      { headline: 'Market research, before your coffee.',
        beforeLabel: 'By hand', after: 'Briefed by 7am', afterLabel: 'With GT',
        before: ['Scan the competitors', 'Chase the trends', 'Compile the notes', 'Brief the team'],
        foot: 'Custom AI assistants. growthterminal.io',
        cap: 'Market research, before your coffee.\n\nA custom Growth Terminal assistant, trained on your business and not everyone, scans your market overnight and hands you the brief. Research is how a small team scales a brand without hiring one.',
        fc: 'Who does this work at your company today, and what does it cost you?' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name,
        headline: b.headline, beforeLabel: b.beforeLabel, before: b.before,
        afterLabel: b.afterLabel, after: b.after, foot: b.foot,
        caption: b.cap, first_comment: b.fc,
        sig: 'chk:' + String(b.headline).slice(0, 30)
      };
    }
  },

  {
    name: 'twozone',
    briefId: 'struct_two_zone_voice',
    ready: true,
    note: 'Hard two zone split, read off Brex (2 variants). Upper field states the '
        + 'claim plainly. Lower field carries voice and a footnote, no information. '
        + 'This is the only entry in the bank with a second register, which is what '
        + 'stops a week of posts reading as one long paragraph.',

    /* p: { claim, voice, footnote, foot } */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      /* padding:0 is deliberate. The shared .stage rule pads every layout, and
         this is the one structure where the colour field has to bleed to the
         edge. An inset block reads as a card on a page, not as a two zone ad. */
      return `<div class="stage" style="background:${WHITE};color:${INK};padding:0;display:flex;flex-direction:column">
        <div style="position:relative;background:${ORANGE};color:${WHITE};flex:0 0 60%;
          padding:74px 70px;display:flex;flex-direction:column">
          ${grain}
          <div class="toplogo" style="position:relative;display:flex;justify-content:flex-start">${logo(WHITE, WHITE)}</div>
          <div style="position:relative;flex:1;display:flex;align-items:center">
            <div style="font-size:82px;font-weight:800;letter-spacing:-.03em;line-height:1.04">${p.claim}</div>
          </div>
        </div>
        <div style="position:relative;flex:1;padding:56px 70px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:46px;font-weight:800;letter-spacing:-.02em;line-height:1.06;
            text-transform:uppercase">${p.voice}<span style="color:${ORANGE}">*</span></div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-top:20px">
            <div style="font-family:ui-monospace,Menlo,monospace;font-size:22px;font-weight:600;
              letter-spacing:.1em;text-transform:uppercase;color:rgba(23,19,15,.62)">*${p.footnote}</div>
            <div style="font-size:26px;font-weight:800;color:${ORANGE};flex:none">growthterminal.io</div>
          </div>
        </div>
      </div>`;
    },

    bank: [
      { claim: 'One constraint, named in 60 seconds.', voice: "That's diagnosed",
        footnote: 'Revenue constraint intelligence',
        cap: 'One constraint, named in 60 seconds.\n\nNot forty metrics and a feeling. One constraint, the dollar range attached to fixing it, and a plan aimed at that number.',
        fc: 'What would you do with the other 3 weeks of planning?' },
      { claim: 'The forecast gets graded.', voice: "That's accountable",
        footnote: 'Revenue constraint intelligence',
        cap: 'The forecast gets graded.\n\nMost tools make a call and move on. Every Growth Terminal prediction is checked against real revenue afterwards, and the misses stay on the record next to the hits.',
        fc: 'When did a tool last show you its own miss?' },
      { claim: 'It tells you why it might be wrong.', voice: "That's honest",
        footnote: 'Revenue constraint intelligence',
        cap: 'It tells you why it might be wrong.\n\nEvery diagnosis ships with the evidence against it and the specific thing that would disprove it. A tool that only shows you what agrees with it is selling confidence, not analysis.',
        fc: 'Would you rather be reassured or be right?' },

      { claim: 'The rejection gets handled, not heard.', voice: "That's closed",
        footnote: 'AI voice agents, on call 24/7',
        cap: 'The rejection gets handled, not heard.\n\nMost businesses lose the deal at the first no. The GT voice agent hears the objection, works it in your brand voice, holds your price, and books the next step. It answers 24/7, so no lead cools in a queue.',
        fc: 'What happens at your business when a caller says the price is too high?' },

      { claim: 'It answers before the lead cools.', voice: "That's booked",
        footnote: 'AI voice agents, answering 24/7',
        cap: 'It answers before the lead cools.\n\nSpeed to lead decides most deals. The GT voice agent picks up every call, qualifies the caller, and puts the meeting on your calendar while your competitor is still checking voicemail.',
        fc: 'How fast does your team get back to a missed call today?' },

      { claim: 'Your feed posts itself. On brand, daily.', voice: "That's consistent",
        footnote: 'Content engine, 4 platforms, photo ads included',
        cap: 'Your feed posts itself. On brand, daily.\n\nThe GT content engine builds photo ads and posts from your creative bank and publishes across Instagram, Facebook, Threads, and TikTok, then learns from what performs. Consistency without the daily grind.',
        fc: 'What would daily posting do for your brand if it cost you zero hours?' },

      { claim: 'Research that never sleeps on your brand.', voice: "That's scaled",
        footnote: 'Custom AI assistants, 1 brief every morning',
        cap: 'Research that never sleeps on your brand.\n\nA custom assistant trained on your business scans your market, your competitors, and your niche overnight, and briefs you in the morning. Scaling a brand is a research job before it is a content job.',
        fc: 'When did you last have time to properly study your own market?' },

      { claim: 'Why plan a quarter on a hunch?', voice: "That's diagnosed",
        footnote: '1 constraint, named in about 60 seconds',
        cap: 'Why plan a quarter on a hunch?\n\nMost quarterly plans start from a feeling about what is broken. Growth Terminal reads the numbers you already keep, names the one constraint capping revenue, and prices what fixing it is worth. Then the plan starts.',
        fc: 'What does your planning actually start from, data or a hunch?' },

      { claim: 'What is the wrong fix costing you?', voice: "That's priced",
        footnote: 'Every gap gets a dollar range, not a guess',
        cap: 'What is the wrong fix costing you?\n\nEvery quarter spent on the wrong constraint has a price, it is just invisible until someone calculates it. Growth Terminal puts a dollar range on the gap between what you are fixing and what is actually binding.',
        fc: 'If you had to put a number on last quarter, what did the wrong fix cost?' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name,
        claim: b.claim, voice: b.voice, footnote: b.footnote,
        caption: b.cap, first_comment: b.fc,
        sig: 'tz:' + String(b.claim).slice(0, 30)
      };
    }
  },

  {
    name: 'demoted',
    briefId: 'struct_demoted_proof',
    ready: true,
    note: 'Demoted proof, read off BambooHR (2 variants) and Gusto. The headline is a '
        + 'plain claim, the CTA sits mid canvas, and the number is set small at the '
        + 'foot. Every other layout in this bank shouts its number, which is exactly '
        + 'why the number stopped reading as evidence.',

    /* p: { headline, cta, proof, sub } */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      return `<div class="stage" style="background:${INK};color:${WHITE};padding:80px 74px;display:flex;flex-direction:column">
        <div class="glow" style="width:620px;height:620px;background:${ORANGE};top:-240px;right:-200px;opacity:.2"></div>
        ${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center">${logo(ORANGE, WHITE)}</div>
        <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:74px;font-weight:800;letter-spacing:-.03em;line-height:1.05;max-width:880px">${p.headline}</div>
          ${p.sub ? `<div style="font-size:30px;font-weight:500;line-height:1.36;margin-top:26px;
            max-width:800px;color:rgba(253,252,252,.7)">${p.sub}</div>` : ''}
          <div style="margin-top:44px;display:inline-flex;align-self:flex-start;align-items:center;gap:14px;
            background:${ORANGE};color:${WHITE};padding:22px 36px;border-radius:12px;
            font-weight:800;font-size:30px">${p.cta}</div>
        </div>
        <div style="position:relative;border-top:1px solid rgba(253,252,252,.14);padding-top:26px;
          font-family:ui-monospace,Menlo,monospace;font-size:23px;font-weight:600;letter-spacing:.06em;
          text-transform:uppercase;color:rgba(253,252,252,.56)">${p.proof}</div>
      </div>`;
    },

    bank: [
      { headline: 'Stop guessing which fix matters.', cta: 'Run the free diagnostic',
        sub: 'The engine ranks twelve constraints and names the one that is yours.',
        proof: '12 constraint categories, 1 verdict, about 60 seconds',
        cap: 'Stop guessing which fix matters.\n\nEffort is rarely the problem. Aim is. Growth Terminal ranks the twelve places growth gets stuck against your own numbers, names the one binding you this quarter, and prices what fixing it is worth.',
        fc: 'What are you fixing this quarter, and how do you know it is the constraint?' },
      { headline: 'A plan you can stop early.', cta: 'See what comes back',
        sub: 'Six phases in order, with the conditions that tell you to continue or change course.',
        proof: '6 phases, 3 decision gates, 5 leading indicators',
        cap: 'A plan you can stop early.\n\nMost 90 day plans have no exit. Every Growth Terminal plan carries decision gates: the condition, what happens if it passes, what happens if it misses. Knowing when to stop is worth more than knowing where to start.',
        fc: 'Does your current plan have a gate that lets you stop early?' },
      { headline: 'It reads the sheet you already have open.', cta: 'Try it free',
        sub: 'No migration, no onboarding call. The numbers you keep are enough.',
        proof: 'Runs inside Google Sheets, no data leaves your workbook',
        cap: 'It reads the sheet you already have open.\n\nThe hardest part of most growth tools is the setup. Growth Terminal starts from the spreadsheet you already keep, which means the first answer arrives before the first meeting would have.',
        fc: 'How long did your last tool take before it told you anything?' },

      { headline: 'Stop losing deals at the first no.', cta: 'Hear it handle a no',
        sub: 'The voice agent hears the objection, works it in your brand voice, and books the next step.',
        proof: 'Answers 24/7, books to your calendar. growthterminal.io',
        cap: 'Stop losing deals at the first no.\n\nA rejection is a question wearing a costume. The Growth Terminal voice agent answers every call, works the objection without dropping your price, and books the meeting. Sales recovery, running around the clock.',
        fc: 'What is the objection your team hears most, and who handles it at 9pm?' },

      { headline: 'Your content, on autopilot.', cta: 'See what it posts',
        sub: 'Daily photo ads and posts across 4 platforms, sharpened by what performs.',
        proof: 'Instagram, Facebook, Threads, TikTok. Photo ads included',
        cap: 'Your content, on autopilot.\n\nThe GT content engine turns your creative bank into daily photo ads and posts across the main platforms, and it learns from the numbers. The same engine that runs this account can run yours.',
        fc: 'This account you are reading is run by that engine. Ask us anything about it.' },

      { headline: 'A researcher on your team, always on.', cta: 'Meet the assistant',
        sub: 'Trained on your business, not everyone. It studies your market and briefs you first thing.',
        proof: 'Custom AI assistants, 1 brief a morning. growthterminal.io',
        cap: 'A researcher on your team, always on.\n\nBrands scale on insight before they scale on content. A custom GT assistant studies your market overnight and hands you the brief each morning, so every post, offer, and pitch starts from knowledge.',
        fc: 'What would you do differently if you truly knew your market cold?' },

      { headline: 'Which of the 12 is yours?', cta: 'Run the free diagnostic',
        sub: 'Twelve places growth gets stuck. One of them is capping your revenue right now.',
        proof: '12 categories, 1 verdict, about 60 seconds',
        cap: 'Which of the 12 is yours?\n\nGrowth gets stuck in twelve places, and only one of them is yours this quarter. Growth Terminal reads the sheet you already keep and names it, with the dollar range attached.',
        fc: 'Which of the twelve would you guess is yours right now?' },

      { headline: 'Still guessing what to fix first?', cta: 'Try it free',
        sub: 'The engine reads your sheet and names the one constraint worth your quarter.',
        proof: 'About 60 seconds, in Google Sheets. growthterminal.io',
        cap: 'Still guessing what to fix first?\n\nEffort is rarely the problem, aim is. Growth Terminal ranks the twelve places growth gets stuck against your own numbers and hands back the one worth your quarter, priced.',
        fc: 'What is first on your fix list right now, and how did it get there?' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name,
        headline: b.headline, cta: b.cta, proof: b.proof, sub: b.sub,
        caption: b.cap, first_comment: b.fc,
        sig: 'dem:' + String(b.headline).slice(0, 30)
      };
    }
  },

  {
    name: 'pipeline',
    briefId: 'ha_pipeline3',
    ready: false,
    note: 'Three stage pipeline, from a dropped reference ad. Reports (illegible on '
        + 'purpose) into analysis (one row ringed) into decision (verdict card with '
        + 'the figure). The persuasion is the compression itself: the reader watches '
        + '40 numbers become one instruction. This is the only layout in the bank '
        + 'that shows the product doing its job rather than describing the result.',

    /* p: { metric, current, benchmark, gap, impact, directive, foot } */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;

      /* Stage one, the mess. Rows of muted junk data, deliberately unreadable. */
      const junkRow = (i) => `
        <div style="display:flex;gap:10px;padding:8px 0;opacity:${0.5 - i * 0.04}">
          ${[46, 34, 28, 30, 26, 34].map(w => `<span style="display:inline-block;height:11px;
            width:${w + ((i * 7 + w) % 18)}px;border-radius:4px;background:rgba(253,252,252,.35)"></span>`).join('')}
        </div>`;

      const stageLabel = (n, name, sub) => `
        <div style="display:flex;align-items:baseline;gap:12px">
          <span style="font-family:ui-monospace,Menlo,monospace;font-size:21px;font-weight:700;
            color:${ORANGE}">${n}</span>
          <span style="font-size:27px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${name}</span>
          <span style="font-size:21px;font-weight:500;color:rgba(253,252,252,.55)">${sub}</span>
        </div>`;

      const arrow = `<div style="text-align:center;font-size:30px;color:${ORANGE};
        font-weight:800;line-height:1;padding:10px 0">&#8595;</div>`;

      const cell = (v, accent, right) => `<span style="flex:1;text-align:${right ? 'right' : 'left'};
        font-size:23px;font-weight:${accent ? 800 : 600};color:${accent ? ORANGE : 'rgba(23,19,15,.8)'}">${v}</span>`;

      return `<div class="stage" style="background:${INK};color:${WHITE};padding:70px 74px;display:flex;flex-direction:column">
        ${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center;margin-bottom:20px">${logo(ORANGE, WHITE)}</div>

        <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-evenly">
        <div style="position:relative">
          ${stageLabel('01', 'Reports', 'too much data')}
          <div style="background:rgba(253,252,252,.06);border:1px solid rgba(253,252,252,.1);
            border-radius:14px;padding:16px 22px;margin-top:12px">
            ${[0, 1, 2, 3, 4, 5].map(junkRow).join('')}
          </div>
        </div>
        ${arrow}
        <div style="position:relative">
          ${stageLabel('02', 'Analysis', 'one constraint isolated')}
          <div style="background:${WHITE};color:${INK};border-radius:14px;padding:8px 20px;margin-top:12px">
            <div style="display:flex;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(23,19,15,.12);
              font-size:21px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(23,19,15,.5)">
              <span style="flex:1.6">Metric</span><span style="flex:1;text-align:right">Now</span>
              <span style="flex:1;text-align:right">Benchmark</span><span style="flex:1;text-align:right">Worth</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;padding:14px 10px;margin:8px 0;
              border:3px solid ${ORANGE};border-radius:10px">
              <span style="flex:1.6;font-size:23px;font-weight:800">${p.metric}</span>
              ${cell(p.current, false, true)}${cell(p.benchmark, false, true)}${cell(p.impact, true, true)}
            </div>
            <div style="display:flex;gap:10px;padding:10px;opacity:.45">
              <span style="flex:1.6;font-size:21px;font-weight:600">${p.alsoRan}</span>
              ${cell(p.alsoNow, false, true)}${cell(p.alsoBench, false, true)}${cell(p.alsoImpact, false, true)}
            </div>
          </div>
        </div>
        ${arrow}
        <div style="position:relative;border:2px solid ${ORANGE};border-radius:16px;padding:34px 34px;
          display:flex;align-items:center;gap:24px">
          <div style="flex:1">
            <div style="font-family:ui-monospace,Menlo,monospace;font-size:21px;font-weight:700;
              letter-spacing:.16em;text-transform:uppercase;color:${ORANGE}">03 &middot; Decision</div>
            <div style="font-size:54px;font-weight:800;letter-spacing:-.02em;line-height:1.04;margin-top:10px">${p.headline}</div>
            <div style="font-size:23px;font-weight:500;margin-top:8px;color:rgba(253,252,252,.75)">${p.directive}</div>
          </div>
          <div style="flex:none;text-align:right">
            <div style="font-size:64px;font-weight:800;letter-spacing:-.02em;color:${ORANGE};line-height:1">${p.gap}</div>
            <div style="font-size:21px;font-weight:600;margin-top:6px;color:rgba(253,252,252,.6)">${p.gapLabel}</div>
          </div>
        </div>

        <div style="position:relative;text-align:center;font-size:27px;font-weight:600;
          margin-top:10px;color:rgba(253,252,252,.86)">${p.foot}</div>
        </div>
      </div>`;
    },

    bank: [
      { metric: 'Paid CAC', current: '$113', benchmark: '$85', impact: '+$1.2M',
        alsoRan: 'Conversion rate', alsoNow: '1.3%', alsoBench: '2.5%', alsoImpact: '+$0.8M',
        directive: 'Lower paid CAC to $85 or less.', gap: '+$1.2M', gapLabel: 'a year, if fixed',
        foot: 'Sample analysis. Yours takes about 60 seconds. growthterminal.io',
        cap: 'From 40 numbers to 1 decision.\n\nThe report has everything and says nothing. Growth Terminal reads it, ranks every gap against benchmarks, and hands back one instruction with the annual value attached. This sample: paid CAC at $113 against an $85 benchmark, worth $1.2M a year.',
        fc: 'What would your one ringed row be?' },

      { metric: 'Retention', current: '61%', benchmark: '78%', impact: '+$640K',
        alsoRan: 'Avg order value', alsoNow: '$286', alsoBench: '$350', alsoImpact: '+$210K',
        directive: 'Close the retention gap before buying more traffic.', gap: '+$640K', gapLabel: 'a year, if fixed',
        foot: 'Sample analysis. Run yours free. growthterminal.io',
        cap: 'The leak outranks the funnel.\n\nMost teams buy traffic to outrun churn. The engine ranks both against benchmarks and prices the difference, and in this sample the retention gap is worth three times the next fix. One decision, backed by a number.',
        fc: 'Are you filling the funnel or fixing the bucket this quarter?' },

      { metric: 'Pricing', current: '$49', benchmark: '$79', impact: '+$900K',
        alsoRan: 'Email capture', alsoNow: '2.1%', alsoBench: '3.5%', alsoImpact: '+$300K',
        directive: 'Test the $79 price point on the next cohort.', gap: '+$900K', gapLabel: 'a year, if fixed',
        foot: 'Sample analysis. Yours takes about 60 seconds. growthterminal.io',
        cap: 'The most expensive fix is the one you never rank.\n\nPricing sat fourth on this list by gut feel and first by the numbers. Growth Terminal ranks every constraint against benchmarks so the biggest number gets fixed first, not the loudest one.',
        fc: 'When did you last test your price against a benchmark instead of a feeling?' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name, headline: b.headline || 'Fix this first.',
        metric: b.metric, current: b.current, benchmark: b.benchmark, impact: b.impact,
        alsoRan: b.alsoRan, alsoNow: b.alsoNow, alsoBench: b.alsoBench, alsoImpact: b.alsoImpact,
        directive: b.directive, gap: b.gap, gapLabel: b.gapLabel, foot: b.foot,
        caption: b.cap, first_comment: b.fc,
        sig: 'pipe:' + b.metric
      };
    }
  },

  {
    name: 'behaviourcall',
    briefId: 'ha_16pggmv',
    ready: false,
    note: 'Behaviour call out. Naming a behaviour the reader recognises in themselves earns the next two seconds. The ask is low friction because it requests something already in hand.',

    /* ANATOMY FROM THE BRIEF, build the layout to match this:
       Small icon or illustration anchors one side. A single line names a specific thing the reader already does. A stat or qualifier sits below it. The CTA asks for something the reader already possesses rather than a commitment.

       GT ANGLE:
       Growth Terminal reads a spreadsheet the reader already has open. The ask is literally a file they already own, which is exactly the low friction shape this format is built for.

       Source: https://www.vibemyad.com/blog/10-b2b-static-ad-examples-worth-stealing-from-2026 */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      return `<div class="stage" style="background:${INK};color:${WHITE};padding:86px 74px;display:flex;flex-direction:column">
        ${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center">${logo(ORANGE, WHITE)}</div>
        <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center">
          <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow || 'Growth Terminal'}</div>
          <div style="font-size:${p.size || 82}px;font-weight:800;letter-spacing:-.025em;line-height:1.06;margin-top:20px">${p.headline}</div>
          ${p.sub ? `<div style="font-size:32px;font-weight:500;line-height:1.34;opacity:.86;margin:26px auto 0;max-width:820px">${p.sub}</div>` : ''}
        </div>
        <div style="position:relative;text-align:center;font-size:29px;font-weight:600;color:rgba(253,252,252,.86)">${p.foot || 'growthterminal.io'}</div>
      </div>`;
    },

    /* Replace these with real copy before flipping ready to true.
       Every entry needs: the render params, a caption, a first comment, a sig. */
    bank: [
      { eyebrow: 'TODO', headline: 'TODO write the hook', sub: 'TODO write the support line',
        foot: 'growthterminal.io',
        cap: 'TODO write the caption',
        fc: 'TODO write the first comment' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name,
        eyebrow: b.eyebrow, headline: b.headline, sub: b.sub, foot: b.foot,
        caption: b.cap, first_comment: b.fc,
        sig: 'beha:' + String(b.headline).slice(0, 30)
      };
    }
  },

  {
    name: 'beforeafter',
    briefId: 'ha_12cyipv',
    ready: true,
    note: 'Before and after metric card. The gap between the two numbers does the '
        + 'persuading, so no qualifier language anywhere. This is the only format in '
        + 'the bank that shows the delta Growth Terminal sells rather than describing it.',

    /* p: { eyebrow, leftLabel, leftValue, rightLabel, rightValue, middle, foot } */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      const col = (label, value, accent) => `
        <div style="flex:1;text-align:center">
          <div style="font-size:23px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
            color:${accent ? ORANGE : 'rgba(253,252,252,.5)'}">${label}</div>
          <div style="font-size:${p.figSize || 104}px;font-weight:800;letter-spacing:-.03em;line-height:1;
            margin-top:16px;color:${accent ? ORANGE : WHITE}">${value}</div>
        </div>`;
      return `<div class="stage" style="background:${INK};color:${WHITE};padding:86px 74px;display:flex;flex-direction:column">
        <div class="glow" style="width:700px;height:700px;background:${ORANGE};bottom:-300px;left:50%;margin-left:-350px;opacity:.22"></div>
        ${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center">${logo(ORANGE, WHITE)}</div>

        <div style="position:relative;text-align:center;margin-top:46px">
          <div class="eyebrow" style="color:${ORANGE}">${p.eyebrow || 'The gap'}</div>
          <div style="font-size:52px;font-weight:800;letter-spacing:-.02em;line-height:1.1;margin-top:16px">${p.headline}</div>
        </div>

        <div style="position:relative;flex:1;display:flex;align-items:center">
          <div style="width:100%;display:flex;align-items:center;gap:20px">
            ${col(p.leftLabel, p.leftValue, false)}
            <div style="flex:none;text-align:center;padding:0 6px">
              <div style="font-size:44px;color:${ORANGE};font-weight:800;line-height:1">&#8594;</div>
              <div style="font-size:21px;font-weight:700;color:rgba(253,252,252,.55);margin-top:10px;max-width:190px">${p.middle}</div>
            </div>
            ${col(p.rightLabel, p.rightValue, true)}
          </div>
        </div>

        <div style="position:relative;text-align:center;font-size:29px;font-weight:600;color:rgba(253,252,252,.86)">${p.foot}</div>
      </div>`;
    },

    /* Copy bank. Same shape as the FORMATS in generate.js: pick one at random,
       return the render params plus caption, first comment and a signature. */
    bank: [
      { eyebrow: 'The gap', headline: 'Same business. One constraint fixed.',
        leftLabel: 'Today', leftValue: '$47k', rightLabel: 'After the fix', rightValue: '$71k',
        middle: 'one constraint, named and priced', foot: 'The engine puts a range on the difference, then grades the call.',
        cap: 'Same business. One constraint fixed.\n\nThe gap between those two numbers is not a growth strategy, it is a single constraint that was never named. Growth Terminal finds it, prices what fixing it is worth, and grades the forecast against what actually happens.',
        fc: 'What would your number be on the right if the real constraint got fixed?' },

      { eyebrow: 'Where the money is', headline: 'You are not missing customers. You are missing one fix.',
        leftLabel: 'Leads now', leftValue: '340', rightLabel: 'Leads needed', rightValue: '580',
        middle: 'the shortfall, calculated', foot: 'A specific number beats a vague ambition every quarter.',
        cap: 'You are not missing customers. You are missing one fix.\n\nMost teams work from a vague sense that growth is short. Growth Terminal calculates the actual shortfall, names the constraint producing it, and hands back a 90 day plan aimed at that one number.',
        fc: 'Do you know the exact number you are short, or just that you are short?' },

      { eyebrow: 'Cost of waiting', headline: 'Every quarter the wrong fix runs, this gap holds.',
        leftLabel: 'Fixing the wrong thing', leftValue: '$0', rightLabel: 'Fixing the constraint', rightValue: '$24k',
        middle: 'per month, adjusted for feasibility', foot: 'Effort is not the variable. Aim is.',
        cap: 'Every quarter the wrong fix runs, this gap holds.\n\nEffort is rarely the problem. Aim is. Growth Terminal ranks the twelve places growth gets stuck, names the one that is yours this quarter, and prices the difference between fixing it and fixing something else.',
        fc: 'What are you fixing this quarter, and how do you know it is the constraint?' },

      { eyebrow: 'Before and after', headline: 'Conversion held. Volume did not.',
        leftLabel: 'Conversion', leftValue: 'stable', rightLabel: 'Lead volume', rightValue: '8 of 10',
        middle: 'severity, not opinion', foot: 'The engine shows the evidence for the call and against it.',
        cap: 'Conversion held. Volume did not.\n\nWhen one part of the funnel is steady and another is not, the constraint is usually obvious in hindsight and invisible in the moment. Growth Terminal separates the two, scores the severity, and publishes the evidence against its own conclusion alongside the evidence for it.',
        fc: 'Which part of your funnel is genuinely stable, and which one only looks stable?' }
    ],

    pick(r, pick) {
      const b = pick(this.bank, r);
      return {
        layout: this.name,
        eyebrow: b.eyebrow, headline: b.headline,
        leftLabel: b.leftLabel, leftValue: b.leftValue,
        rightLabel: b.rightLabel, rightValue: b.rightValue,
        middle: b.middle, foot: b.foot,
        caption: b.cap, first_comment: b.fc,
        sig: 'ba:' + b.leftValue + '>' + b.rightValue
      };
    }
  }
];

module.exports = { EXTENSIONS, PALETTE };
