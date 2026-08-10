/**
 * inject.js, turns an approved inspiration brief into a bank layout.
 * -----------------------------------------------------------------------------
 * This is the last link in the loop:
 *
 *   research.js  ->  inspiration_queue.json  ->  inject.js  ->  bank_extensions.js  ->  generate.js
 *
 * It scaffolds a new entry in bank_extensions.js from a brief, wired up and
 * renderable, with ready:false so it CANNOT post. Someone renders it, looks at
 * it, writes real copy into the bank array, and flips ready to true. That
 * review is the only manual step, and it is the one that protects the feed.
 *
 * Usage
 *   node inject.js --list                 approved briefs not yet injected
 *   node inject.js --brief <id>           scaffold a layout from a brief
 *   node inject.js --brief <id> --name x  choose the layout name
 *   node inject.js --ready <name>         flip a layout into the rotation
 *   node inject.js --status               what is in the bank and what is waiting
 *
 * After injecting, render it before doing anything else:
 *   node generate.js --preview 1 --layouts <name>
 */
const fs = require('fs');
const path = require('path');

const QUEUE = path.join(__dirname, 'inspiration_queue.json');
const EXTFILE = path.join(__dirname, 'bank_extensions.js');
const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const readQueue = () => { try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch { return []; } };
const loadExt = () => { try { return require(EXTFILE).EXTENSIONS || []; } catch { return []; } };

function slug(s) {
  return String(s || 'layout').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'layout';
}

if (args.includes('--status')) {
  const ext = loadExt();
  const q = readQueue();
  console.log('bank extensions: ' + ext.length);
  for (const e of ext) {
    console.log('  ' + e.name + '  ' + (e.ready ? 'IN ROTATION' : 'draft, not posting')
      + (e.briefId ? '  from ' + e.briefId : ''));
  }
  const injected = new Set(ext.map(e => e.briefId).filter(Boolean));
  const waiting = q.filter(b => b.status === 'approved' && !injected.has(b.id));
  const newOnes = q.filter(b => b.status === 'new');
  console.log('\nqueue: ' + q.length + ' briefs, ' + newOnes.length + ' awaiting a decision, '
    + waiting.length + ' approved and not yet injected');
  process.exit(0);
}

if (args.includes('--list')) {
  const ext = loadExt();
  const injected = new Set(ext.map(e => e.briefId).filter(Boolean));
  const rows = readQueue().filter(b => b.status === 'approved' && !injected.has(b.id));
  if (!rows.length) {
    console.log('nothing approved and uninjected.');
    console.log('approve one first: node research.js --approve <id>');
    process.exit(0);
  }
  for (const b of rows) {
    console.log('\n' + b.id + '  ' + (b.name || '(unnamed)'));
    if (b.structure && b.structure.anatomy) console.log('  anatomy: ' + b.structure.anatomy.slice(0, 150));
    if (b.gtAngle) console.log('  angle:   ' + b.gtAngle.slice(0, 150));
  }
  process.exit(0);
}

const readyName = arg('--ready');
if (readyName) {
  let src = fs.readFileSync(EXTFILE, 'utf8');
  const re = new RegExp("(name:\\s*'" + readyName + "'[\\s\\S]{0,400}?ready:\\s*)false");
  if (!re.test(src)) {
    console.log('could not find a draft entry named ' + readyName);
    process.exit(1);
  }
  fs.writeFileSync(EXTFILE, src.replace(re, '$1true'));
  console.log(readyName + ' is now in rotation.');
  console.log('It will start appearing in posts on the next scheduled run.');
  process.exit(0);
}

const briefId = arg('--brief');
if (!briefId) {
  console.log('usage: node inject.js --list | --brief <id> | --ready <name> | --status');
  process.exit(0);
}

const brief = readQueue().find(b => b.id === briefId);
if (!brief) { console.log('no brief with id ' + briefId); process.exit(1); }
if (brief.status !== 'approved') {
  console.log('brief ' + briefId + ' has status "' + brief.status + '", not approved.');
  console.log('approve it first: node research.js --approve ' + briefId);
  process.exit(1);
}

const ext = loadExt();
if (ext.some(e => e.briefId === briefId)) {
  console.log('brief ' + briefId + ' is already injected as "'
    + ext.find(e => e.briefId === briefId).name + '".');
  process.exit(0);
}

const name = arg('--name') || slug(brief.name);
if (ext.some(e => e.name === name)) { console.log('a layout named ' + name + ' already exists.'); process.exit(1); }

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');

const entry = `
  {
    name: '${name}',
    briefId: '${brief.id}',
    ready: false,
    note: '${esc(brief.name)}. ${esc((brief.whyItWorks || '').slice(0, 200))}',

    /* ANATOMY FROM THE BRIEF, build the layout to match this:
       ${(brief.structure && brief.structure.anatomy) || 'see the brief'}

       GT ANGLE:
       ${brief.gtAngle || 'not written yet'}

       Source: ${brief.url || 'n/a'} */
    render(p, ctx) {
      const { ORANGE, INK, WHITE } = PALETTE;
      const { logo, grain } = ctx;
      return \`<div class="stage" style="background:\${INK};color:\${WHITE};padding:86px 74px;display:flex;flex-direction:column">
        \${grain}
        <div class="toplogo" style="position:relative;display:flex;justify-content:center">\${logo(ORANGE, WHITE)}</div>
        <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center">
          <div class="eyebrow" style="color:\${ORANGE}">\${p.eyebrow || 'Growth Terminal'}</div>
          <div style="font-size:\${p.size || 82}px;font-weight:800;letter-spacing:-.025em;line-height:1.06;margin-top:20px">\${p.headline}</div>
          \${p.sub ? \`<div style="font-size:32px;font-weight:500;line-height:1.34;opacity:.86;margin:26px auto 0;max-width:820px">\${p.sub}</div>\` : ''}
        </div>
        <div style="position:relative;text-align:center;font-size:29px;font-weight:600;color:rgba(253,252,252,.86)">\${p.foot || 'growthterminal.io'}</div>
      </div>\`;
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
        sig: '${name.slice(0, 4)}:' + String(b.headline).slice(0, 30)
      };
    }
  },
`;

let src = fs.readFileSync(EXTFILE, 'utf8');
const marker = 'const EXTENSIONS = [';
if (!src.includes(marker)) { console.log('bank_extensions.js is missing its EXTENSIONS array.'); process.exit(1); }
src = src.replace(marker, marker + entry);
fs.writeFileSync(EXTFILE, src);

const q = readQueue();
const b = q.find(x => x.id === briefId);
if (b) { b.status = 'injected'; b.injectedAs = name; b.injectedAt = new Date().toISOString(); }
fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2));

console.log('injected ' + briefId + ' as layout "' + name + '", ready:false');
console.log('');
console.log('next:');
console.log('  1. open bank_extensions.js and build the render to match the anatomy comment');
console.log('  2. replace the TODO copy with real GT lines, no em dashes');
console.log('  3. node generate.js --preview 1 --layouts ' + name);
console.log('  4. look at it, then: node inject.js --ready ' + name);
console.log('');
console.log('It cannot post until step 4.');
