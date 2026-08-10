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
