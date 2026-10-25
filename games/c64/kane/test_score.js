#!/usr/bin/env node
// Hold the Discoveries page's score counting and ride bonus against the game's own code. The
// kane-score block of discoveries.html (KANE_SCORE) is count_score ($3B9A) and ride 1's time bonus
// written again in JavaScript. The test runs the game's routines on the kit's 6502 over the
// listing's bytes and checks:
// - count_score, once a frame, for every number of points from 1 to 2500 waiting on a score of 0
//   and for 400 more pairs of a score and points: pending ($8FA4-$8FA7), the score ($8FA8-$8FAB)
//   and the eight characters written to score_text ($8E41) after every frame, against the port's
//   step and text;
// - the bonus the ride gives at 4.00 miles ($2345 to $236D, with zpa_10 at 0 as the ride leaves
//   it) for each level and every clock reading from 0.00 to 1.59, against rideBonus;
// - the shoot-out's bonus ($37E3 to $37F2) for each level against the 99, 198 and 297 the page
//   gives, and the extra points the page names (594 waiting gives 706).
// It exits 1 on any difference.
//   node games/c64/kane/test_score.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'discoveries.html';
const { KANE_SCORE } = g.run(page, 'kane-score', 'KANE_SCORE');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { if (a < 0xD800 || a > 0xDBFF) throw new Error('write $' + a.toString(16)); } };
const machine = () => { const m = L.ram.slice(); return { m, cpu: new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x36 }, io }) }; };
const hex = (b) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');

// count_score against step, frame by frame
function countBoth(score, points) {
  const { m, cpu } = machine(), s = KANE_SCORE.start(score, points);
  m[0x1C] = 0x82; m[0x1D] = 0x07;                      // score_at, as start_ducks sets it ($1203)
  s.score.forEach((x, i) => { m[0x8FA8 + i] = x; });
  s.pending.forEach((x, i) => { m[0x8FA4 + i] = x; });
  for (let f = 0; f < 2000; f++) {
    const more = KANE_SCORE.step(s);
    cpu.call(0x3B9A, { a: 0, x: 0, y: 0 }, { maxSteps: 100000 });
    const p = [0, 1, 2, 3].map((i) => m[0x8FA4 + i]), q = [0, 1, 2, 3].map((i) => m[0x8FA8 + i]);
    const t = String.fromCharCode(...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => m[0x8E41 + i]));
    if (hex(p) !== hex(s.pending) || hex(q) !== hex(s.score)) { fail(score, points, 'frame', f, 'game', hex(p), hex(q), 'page', hex(s.pending), hex(s.score)); return; }
    if (more && t !== KANE_SCORE.text(s)) { fail(score, points, 'frame', f, 'text', JSON.stringify(t), JSON.stringify(KANE_SCORE.text(s))); return; }
    if (!more) return f;
  }
  fail(score, points, 'never ends');
}
let frames = 0, pairs = 0;
for (let p = 1; p <= 2500; p++) { frames += countBoth(0, p) || 0; pairs++; }
let seed = 20261025;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return seed % n; };
for (let i = 0; i < 400; i++) { frames += countBoth(rnd(100000), 1 + rnd(5000)) || 0; pairs++; }
const r594 = KANE_SCORE.count(0, 594).score;
if (r594 !== 706) fail('594 waiting gives', r594, 'not 706');

// ride 1's time bonus
for (let level = 0; level < 3; level++) for (let mins = 0; mins < 2; mins++) for (let t = 0; t < 60; t++) {
  const secs = (Math.floor(t / 10) << 4) | t % 10;
  const { m, cpu } = machine();
  m[0x8FA2] = level; m[0x48] = mins; m[0x47] = secs; m[0x10] = 0;
  for (let i = 0; i < 4; i++) m[0x8FA4 + i] = 0;
  cpu.pc = 0x2345; cpu.run({ until: 0x236D, maxSteps: 1e6 });
  const got = KANE_SCORE.value([0, 1, 2, 3].map((i) => m[0x8FA4 + i])), want = KANE_SCORE.rideBonus(level, mins, secs);
  if (got !== want.points) fail('ride bonus level', level, 'clock', mins + '.' + secs.toString(16).padStart(2, '0'), 'game', got, 'page', want.points);
}

// the shoot-out's bonus
for (let level = 0; level < 3; level++) {
  const { m, cpu } = machine();
  m[0x8FA2] = level;
  for (let i = 0; i < 4; i++) m[0x8FA4 + i] = 0;
  cpu.pc = 0x37E3; cpu.run({ until: 0x37F2, maxSteps: 1e6 });
  const got = KANE_SCORE.value([0, 1, 2, 3].map((i) => m[0x8FA4 + i]));
  if (got !== (level + 1) * 99) fail('shoot-out bonus level', level, 'game', got, 'page', (level + 1) * 99);
}

if (bad) { console.log(bad, 'differences'); process.exit(1); }
console.log(`ok: count_score for ${pairs} amounts (${frames} frames), the ride's bonus for 360 clocks, the shoot-out's bonus for 3 levels`);
