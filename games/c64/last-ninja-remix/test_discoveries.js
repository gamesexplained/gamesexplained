#!/usr/bin/env node
// Hold discoveries.html's widgets against the game's own code, run on the kit's 6502 over the
// listings.
// - lnr-skip: the recogniser of the hidden sequence that ends a level against Central Park's check
//   at $95AB-$95D5, on 20,000 joystick readings: random ones, runs of the sequence held for two
//   scans a step, the sequence broken part way, and headings other than 1. After every reading the
//   count ($BF), the last reading ($AD) and the request to end the level ($02AF) must agree. Every
//   level must carry the same 19 bytes of the table.
// - lnr-oldtitle: the leftover title screen at $6000 of Central Park's first load must reach its
//   wait for fire at $606B with PRESS FIRE TO CONTINUE drawn in cell row 17, its interrupt vector
//   at $60A0, and an RTI ($40) at $4002, the address its interrupt calls.
// - lnr-credits: the hidden credits scroller against the intro's RunCreditsScroller ($112E, with
//   ScrollCreditsRow at $1197), started as an L press starts it and called once a frame, as the
//   interrupt calls it, through the whole text: the twelve cells of the strip ($7BF0-$7C4F) must
//   agree in every frame, and both must stop on the same frame.
// It exits 1 on any difference.
//   node games/c64/last-ninja-remix/test_discoveries.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'discoveries.html';
g.lib('cpu6502');
const { lnrSkip } = g.run(page, 'lnr-skip', 'lnrSkip');
const { lnrOldTitle } = g.run(page, 'lnr-oldtitle', 'lnrOldTitle');
const { lnrCredits } = g.run(page, 'lnr-credits', 'lnrCredits');
const L = (part) => g.listing(`parts/${part}/listing.json`);
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

// --- the sequence
const P = L('central-park'), seq = [...P.bytes(P.sym('input_sequence_initial_value'), 19)];
for (const id of ['street', 'sewers', 'basement', 'office', 'mansion', 'final-battle']) {
  const Q = L(id), t = [...Q.bytes(Q.sym('input_sequence_initial_value'), 19)];
  if (t.join() !== seq.join()) fail('table of', id, t.join());
}
let seed = 20261024;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const readings = [];
while (readings.length < 20000) {
  const kind = rnd(4), heading = rnd(8) ? 1 : rnd(8);
  if (kind === 0) for (let i = 0; i < 20; i++) readings.push([rnd(64), heading]);
  else {
    const upto = kind === 1 ? 18 : 1 + rnd(18);
    for (let i = 1; i <= upto; i++) { const n = (kind === 1 ? 2 : 1) + rnd(3); for (let k = 0; k < n; k++) readings.push([seq[i], heading]); }
    if (kind === 3) readings.push([rnd(64), heading], [rnd(64), heading]);
  }
}
const m = P.ram.slice(), check = 0x95AB;
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 } });
let s = { k: 0, last: 0, done: false }, ends = 0;
m[0xBF] = 0; m[0xAD] = 0; m[0x02AF] = 0; m[0x02B7] = 0;
for (const [v, h] of readings.slice(0, 20000)) {
  m[0x7C] = v; m[0x69] = h;
  cpu.call(check, Z, { maxSteps: 1000 });
  s = lnrSkip(s, v, h, seq);
  if (m[0xBF] !== s.k || m[0xAD] !== s.last || (m[0x02AF] === 0xFF) !== s.done) { fail('reading', v, 'heading', h, 'game', m[0xBF], m[0xAD], m[0x02AF], 'port', JSON.stringify(s)); break; }
  if (s.done) { ends++; s = Object.assign({}, s, { done: false }); m[0x02AF] = 0; }
}
if (ends < 100) fail('the sequence was completed only', ends, 'times: the readings do not exercise it');

// --- the older title screen
const T = L('central-park-title'), F = lnrOldTitle(L('engine'), T);
let text = 0;
for (let c = 4; c < 26; c++) for (let y = 0; y < 8; y++) if (F.mem[0x2000 + (17 * 40 + c) * 8 + y]) text++;
if (F.pc !== 0x606B) fail('old title stopped at', F.pc.toString(16));
if (!text) fail('old title: nothing drawn in row 17');
if ((F.mem[0xFFFE] | F.mem[0xFFFF] << 8) !== 0x60A0) fail('old title: interrupt vector', (F.mem[0xFFFE] | F.mem[0xFFFF] << 8).toString(16));
if (T.ram[0x4002] !== 0x40 || T.ram[0x4000] !== 0x4C) fail('old title: $4002 is not the RTI of a JMP at $4000');

// --- the credits
const I = L('intro'), credits = [];
for (let a = I.sym('credits_text'); I.ram[a] !== 0x24; a++) credits.push(I.ram[a]);
const C = lnrCredits(credits, I.bytes(I.sym('credits_font'), 216)), cm = I.ram.slice();
cm[I.sym('credits_state')] = 0x80; cm[I.sym('credits_offset')] = 0; cm[I.sym('credits_offset') + 1] = 0;
cm[I.sym('scroll_phase')] = 0; cm[I.sym('logo_due')] = 0;      // as $118C-$1194 leave them, and no second start
const ccpu = new CPU(cm, { port: { dir: 0x2F, data: 0x35 } });
let cframes = 0;
for (let f = 0; f < 6000; f++) {
  ccpu.call(I.sym('RunCreditsScroller'), Z, { maxSteps: 2000 });
  const on = C.step(), game = cm[I.sym('credits_state')] >= 0x80;
  if (on !== game) { fail('credits stop', 'frame', f, 'port', on, 'game', game); break; }
  if (!on) break;
  if (cm.subarray(0x7BF0, 0x7C50).join() !== C.strip.join()) { fail('credits strip', 'frame', f); break; }
  cframes++;
}
if (cframes !== credits.length * 4) fail('credits ran', cframes, 'frames for', credits.length, 'letters');

console.log(`20,000 readings (${ends} times the whole sequence), 7 tables, the older title screen, ${cframes} frames of the credits: ` + (bad ? bad + ' differences' : 'all agree with the game'));
process.exit(bad ? 1 : 0);
