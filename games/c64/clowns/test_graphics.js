#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cg-attract block runs the title screen by the game's own code on the kit's
// 6502 over listing.json, a tick at a time. This runs the block as the page does, for 20,000 ticks
// (about three and a half minutes of the game) with Make it miss pressed now and then, and checks
// what the tab says about the pictures:
// - the flying clown changes picture every 11 ticks, 0 to 3 in turn, and shows 4, the landing
//   pose, exactly when it is falling and lower than y 150;
// - a jump starts with running pictures, 7 and 8 or 9 and 10 in turn, 10 ticks each, a pixel apart:
//   12 of them are seen, since the run's 13th drawing is replaced by the leap in the same tick;
// - a clown that misses shows 4 for 16 ticks more, then 5 for 16 and 6 for 16 or more;
// - when the see-saw tips, sprite 0 is at once at the end that went up, and the see-saw's sprites
//   change picture on the next tick;
// - each row of balloons moves one pixel every three ticks, the top and bottom rows right and the
//   middle row left;
// - every one of the eleven pictures and both of the see-saw's are shown, and Make it miss gives
//   a fall each time it is pressed;
// - the sprites and the characters are single-colour and unexpanded, as the page draws them.
//   node games/c64/clowns/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { cgMachine, cgPicture } = g.run('graphics.html', 'cg-attract', 'cgMachine', 'cgPicture');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };

const M = cgMachine(L.ram, { CPU }), m = M.m, vic = M.vic, T = [];
let presses = 0, falls = 0, pressedAt = -1;
for (let t = 0; t < 20000; t++) {
  if (t % 2500 === 1500 && pressedAt < 0 && !m[0x0216]) { M.miss(); presses++; pressedAt = t; }
  M.tick();
  if (pressedAt >= 0 && m[0x0216]) { if (t - pressedAt > 600) fail('Make it miss at tick', pressedAt, 'took', t - pressedAt, 'ticks'); falls++; pressedAt = -1; }
  T.push({
    p: vic[0x15] & 1 ? cgPicture(m) : -2, x: vic[0] + ((vic[0x10] & 1) << 8) - 24, y: vic[1] - 50, down: m[0x0216], falling: m[0x020C],
    cy: m[0x0203], tilt: m[0x020E], saw: m[0x020F], ptr: [m[0x07F9], m[0x07FA]], fine: [m[0x50], m[0x51], m[0x52]],
    mc: vic[0x16] & 0x10 | vic[0x1C] | vic[0x17] | vic[0x1D],
  });
}
if (pressedAt >= 0) fail('Make it miss at tick', pressedAt, 'gave no fall');

// runs of one picture
const runs = [];
for (let i = 0; i < T.length;) { let j = i; while (j < T.length && T[j].p === T[i].p) j++; runs.push({ p: T[i].p, at: i, n: j - i }); i = j; }
const shown = new Set(runs.map((r) => r.p));
for (let p = 0; p < 11; p++) if (!shown.has(p)) fail('picture', p, 'never shown');
if (shown.has(-1)) fail('sprite 0 was on and held something that is none of the eleven pictures');
for (const [a, b] of [[0xEF, 0xF0], [0xF1, 0xF2]]) if (!T.some((s) => s.ptr[0] === a && s.ptr[1] === b)) fail('see-saw shapes', a.toString(16), b.toString(16), 'never shown');
if (T.some((s) => !((s.ptr[0] === 0xEF && s.ptr[1] === 0xF0) || (s.ptr[0] === 0xF1 && s.ptr[1] === 0xF2)))) fail('the see-saw showed other shapes');
if (T.some((s) => s.mc)) fail('multicolour or expanded sprites, or multicolour characters, which the page does not draw');

// flying: 0-3 in turn, 11 ticks each, when not cut short by the landing pose or a new jump
let flights = 0;
runs.forEach((r, k) => {
  if (r.p < 0 || r.p > 3) return;
  const prev = runs[k - 1], next = runs[k + 1];
  if (prev && next && prev.p >= 0 && prev.p <= 3 && next.p >= 0 && next.p <= 3) {
    flights++;
    if (r.n !== 11) fail('flying picture', r.p, 'at tick', r.at, 'held', r.n, 'ticks');
    if (next.p !== (r.p + 1) % 4) fail('flying picture', r.p, 'followed by', next.p);
  }
});
// the landing pose: in flight (up, after the run), 4 exactly when falling and y > 150
T.forEach((s, t) => {
  if (s.down || s.p < 0 || s.p > 4) return;
  const low = s.falling && s.cy >= 151;
  if ((s.p === 4) !== !!low) fail('tick', t, 'picture', s.p, 'falling', s.falling, 'y', s.cy);
});
// the run: 13 pictures, alternating, 10 ticks each, a pixel apart
let jumps = 0;
runs.forEach((r, k) => {
  if (r.p !== 7 && r.p !== 9) return;
  if (runs[k - 1] && runs[k - 1].p >= 7) return;               // not the start of a run
  jumps++;
  const seq = runs.slice(k, k + 12), right = r.p === 7;
  seq.forEach((q, i) => {
    const want = (right ? 7 : 9) + (i & 1);
    if (q.p !== want) fail('run at tick', r.at, 'step', i, 'picture', q.p, 'not', want);
    if (q.n !== 10) fail('run at tick', r.at, 'step', i, 'held', q.n, 'ticks');
    if (i && T[q.at].x - T[seq[i - 1].at].x !== (right ? 1 : -1)) fail('run at tick', r.at, 'step', i, 'moved', T[q.at].x - T[seq[i - 1].at].x);
  });
  if (runs[k + 12] && runs[k + 12].p >= 4) fail('run at tick', r.at, 'is followed by picture', runs[k + 12].p, 'rather than flying');
});
// a miss: from the tick it is down, 4 for 17 ticks (the tick it is found down draws nothing), 5 for 16, 6 for 16 or more
let misses = 0;
T.forEach((s, t) => {
  if (!s.down || (t && T[t - 1].down)) return;
  misses++;
  const at = runs.findIndex((r) => r.at <= t && r.at + r.n > t), r4 = runs[at], r5 = runs[at + 1], r6 = runs[at + 2];
  if (r4.p !== 4 || r4.at + r4.n - t !== 17) fail('miss at tick', t, 'shows', r4.p, 'for', r4.at + r4.n - t, 'ticks');
  if (!r5 || r5.p !== 5 || r5.n !== 16) fail('miss at tick', t, 'then', r5 && r5.p, 'for', r5 && r5.n);
  if (!r6 || r6.p !== 6 || r6.n < 16) fail('miss at tick', t, 'then', r6 && r6.p, 'for', r6 && r6.n);
});
// the see-saw tips: sprite 0 is over the end that went up, inside its catching window
let tips = 0;
T.forEach((s, t) => {
  if (!t || s.tilt === T[t - 1].tilt) return;
  tips++;
  const want = s.tilt ? 0xF1 : 0xEF, next = T[t + 1];        // the see-saw is drawn first in a tick: the new picture shows in the next
  if (s.ptr[0] === want || (next && next.ptr[0] !== want)) fail('tip at tick', t, 'see-saw shapes', s.ptr[0].toString(16), next && next.ptr[0].toString(16));
  const off = s.x - s.saw;
  if (s.tilt ? off < -6 || off > 17 : off < 21 || off > 44) fail('tip at tick', t, 'clown at', s.x, 'see-saw at', s.saw, 'tilt', s.tilt);
});
// the balloons
for (let r = 0; r < 3; r++) {
  let steps = 0;
  for (let t = 1; t < T.length; t++) {
    const a = T[t - 1].fine[r], b = T[t].fine[r];
    if (a === b) continue;
    steps++;
    if (b !== ((a + (r === 1 ? 7 : 1)) & 7)) fail('row', r, 'tick', t, 'fine', a, '->', b);
  }
  const rate = (T.length - 100) / steps;
  if (Math.abs(rate - 3) > 0.02) fail('row', r, 'moves a pixel every', rate.toFixed(3), 'ticks');
}
if (falls !== presses) fail(presses, 'presses of Make it miss,', falls, 'falls after them');

if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log(`20000 ticks: ${jumps} jumps, ${flights} flying pictures held 11 ticks, ${tips} catches, ${misses} misses (${presses} by Make it miss); all 11 pictures and both see-saws shown`);
