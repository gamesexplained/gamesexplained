#!/usr/bin/env node
// Hold the page's score line against the game's own code. index.html's commando-hud block runs
// beside the score add ($134F), the grenade box ($2A8E), the throw ($3903) and the prints ($136F,
// $13D7, $13F1) on the kit's 6502 simulator, over the bytes of the committed listing: every BCD
// score with every points value the game adds, every grenade count from 0 to 255 with a box and
// with a throw, a box run from the enemy loop ($2495) in each of the eleven enemy slots at 300
// scores, one pass of that loop slot by slot with the box among rifle soldiers, and every lives
// count. The score, the lives, the grenades and the digits the game
// puts on the screen must be the port's. Everything it needs is committed. It exits 1 on any
// difference.
//   node games/c64/commando/test_hud.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createHud } = g.run(page, 'commando-hud', 'createHud');
const m = g.listing().ram;
const io = {                                               // the sound effects' writes only
  read(a) { throw new Error('read $' + a.toString(16)); },
  write(a) { if (a < 0xD400 || a > 0xD418) throw new Error('write $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
const TEXT = Array.from(m.slice(0x40C0, 0x40E8));
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const hex = (v) => v.toString(16).padStart(2, '0');
// The game's screen line ($E348) after its prints, against the port's, where the port prints.
function screenMatches(h, at) {
  const want = h.line(TEXT);
  for (const i of at) if (m[0xE348 + i] !== want[i]) return false;
  return true;
}
const SCORE = [6, 7, 8, 9], GREN = [17, 18], LIVES = [25, 26];
function setGame(h) { m[0x04F8] = h.st.lo; m[0x04F9] = h.st.hi; m[0x0500] = h.st.lives; m[0x04FF] = h.st.grenades; }
function same(h, what) {
  cases++;
  const got = [m[0x04F9], m[0x04F8], m[0x0500], m[0x04FF]].map(hex).join(' ');
  const want = [h.st.hi, h.st.lo, h.st.lives, h.st.grenades].map(hex).join(' ');
  if (got !== want) fail(what, 'game', got, 'port', want);
}
const BCD = []; for (let t = 0; t < 10; t++) for (let u = 0; u < 10; u++) BCD.push(t * 16 + u);
let s = 1010;
const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) & 255; };
// Every score, with each value the game adds: 2 (a foxhole), 3, 5, $0A (1,000) and $14 (1,400).
for (const hi of BCD) for (const lo of BCD) for (const pts of [0x02, 0x03, 0x05, 0x0A, 0x14]) {
  const h = createHud(); h.st.hi = hi; h.st.lo = lo; h.st.lives = rnd(); h.st.grenades = rnd();
  setGame(h); m[0x5526] = 0;
  cpu.call(0x134F, { a: pts });
  const life = h.addScore(pts);
  same(h, `score ${hex(hi)}${hex(lo)} + ${hex(pts)}`);
  if (!screenMatches(h, life ? SCORE.concat(LIVES) : SCORE)) fail('score digits', hex(hi) + hex(lo), hex(pts));
}
// Every grenade count, with a box and with a throw.
for (let gr = 0; gr < 256; gr++) {
  const h = createHud(); h.st.hi = BCD[rnd() % 100]; h.st.lo = BCD[rnd() % 100]; h.st.lives = rnd(); h.st.grenades = gr;
  setGame(h); m[0x5526] = 0;
  cpu.call(0x2A8E, { x: 0 });
  h.box();
  same(h, 'box on ' + hex(gr));
  if (!screenMatches(h, GREN.concat(SCORE))) fail('box digits', hex(gr));
  if (!gr) continue;                                       // $38B9: no throw with none left
  const t = createHud(); t.st.grenades = gr; setGame(t); m[0x5526] = 0;
  cpu.call(0x3903, {});
  t.throwOne();
  same(t, 'throw from ' + hex(gr));
  if (!screenMatches(t, GREN)) fail('throw digits', hex(gr));
}
// A box run from the enemy loop ($2495), in each enemy slot, with a rifle soldier in enemy 0 when
// the box is elsewhere: the score, the counts, and whether enemy 0 was freed, against boxInLoop().
for (let n = 0; n < 11; n++) for (const hi of [0x00, 0x09, 0x99]) for (const lo of BCD) {
  const h = createHud(); h.st.hi = hi; h.st.lo = lo; h.st.lives = 5; h.st.grenades = BCD[rnd() % 90];
  setGame(h); m[0x5526] = 0; m[0x0403] = 0x80;
  for (let i = 0; i < 11; i++) m[0x0492 + i] = 0;
  m[0x041D] = 0x97; m[0x040D] = 0; m[0x042D] = 0xB4;
  if (n) { m[0x0492] = 5; m[0x0422] = 0x30; m[0x0412] = 0; m[0x0432] = 0x50; m[0x0472] = m[0x0482] = 0; }
  m[0x0492 + n] = 0x16; m[0x0422 + n] = 0x97; m[0x0412 + n] = 0; m[0x0432 + n] = 0xB8; m[0x0472 + n] = m[0x0482 + n] = 0;
  cpu.call(0x2495, {});
  const paid = h.boxInLoop(n);
  same(h, `box in enemy ${n} at ${hex(hi)}${hex(lo)}`);
  if (n && (m[0x0492] === 0) !== (paid === 2)) fail('enemy 0', n, hex(hi) + hex(lo), 'freed', m[0x0492] === 0, 'paid', paid);
}
// One pass of the enemy loop ($2495) with the box in each enemy slot and rifle soldiers in others,
// with and without the carry: the slots the loop runs, in order (its dispatch, $24C8), the slot the
// box frees (its JSR $3570 at $2AA1) and the counts, against pass().
const CREW = [[0, 1, 3, 6], [0, 2, 5, 8, 9], [1, 4, 10], []];
for (let n = 0; n < 11; n++) for (const crew of CREW) for (const lo of [0x95, 0x55, 0x90, 0x99]) {
  const h = createHud(); h.st.hi = 0x00; h.st.lo = lo; h.st.lives = 5; h.st.grenades = 5;
  setGame(h); m[0x5526] = 0; m[0x0403] = 0x80; m[0x0504] = 0x3F;
  const slots = Array(11).fill(0);
  for (let i = 0; i < 11; i++) m[0x0492 + i] = 0;
  m[0x041D] = 0x97; m[0x040D] = 0; m[0x042D] = 0xB4;
  for (const k of crew) if (k !== n) {
    slots[k] = 5; m[0x0492 + k] = 5; m[0x0422 + k] = 0x30 + 16 * k; m[0x0412 + k] = 0; m[0x0432 + k] = 0x50;
    m[0x0472 + k] = m[0x0482 + k] = 0; m[0x04B7 + k] = 1;   // a timer that does not fire ($33B2)
  }
  slots[n] = 0x16; m[0x0492 + n] = 0x16; m[0x0422 + n] = 0x97; m[0x0412 + n] = 0; m[0x0432 + n] = 0xB8;
  m[0x0472 + n] = m[0x0482 + n] = 0;
  const ran = [], freed = [];
  cpu.call(0x2495, {}, { hooks: {
    0x24C8: (c) => { ran.push(c.x + ':' + m[0x0492 + c.x]); },
    0x2AA1: (c) => { freed.push(c.x); },
  } });
  const run = h.pass(slots);
  same(h, `pass with the box in enemy ${n}, soldiers ${crew}, at 00${hex(lo)}`);
  const want = run.map((r) => r.x + ':' + r.b).join(' '), got = ran.join(' ');
  if (got !== want) fail(`pass with the box in enemy ${n}, soldiers ${crew}: game ran ${got}, port ${want}`);
  const wantFreed = run.filter((r) => r.b === 0x16).map((r) => r.freed).join(' ');
  if (freed.join(' ') !== wantFreed) fail(`pass with the box in enemy ${n}: game freed ${freed}, port ${wantFreed}`);
  // An enemy the port keeps is still there. A slot left free may have been filled again: a free
  // slot now and then starts a rifle soldier of its own ($2D63), which the port does not model.
  slots.forEach((b, k) => { if (b && m[0x0492 + k] !== b) fail(`slot ${k} after the pass, box in ${n}: game ${m[0x0492 + k]}, port ${b}`); });
}
// Every lives count, printed.
for (let n = 0; n < 256; n++) {
  const h = createHud(); h.st.lives = n; setGame(h);
  cpu.call(0x13F1, {});
  cases++;
  if (!screenMatches(h, LIVES)) fail('lives digits', n);
}
console.log(`${cases} cases, ${bad ? bad + ' differ' : 'every score, count and digit matches'}`);
process.exit(bad ? 1 : 0);
