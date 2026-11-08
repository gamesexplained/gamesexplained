#!/usr/bin/env node
'use strict';
// Finds the recorded game the Play tab's Watch button plays (route.json): from power-on, one
// player through phases 1, 2 and 3 and the first bonus round, to the start of phase 4, with no
// life lost. The game runs on the kit's NES (kit/nes/machine.js) from the listing's bytes. Every
// STEP frames the search tries each of a few ways to hold the controller, each followed by a few
// more for LOOK frames on copies of the machine, and keeps the one whose best ending scores most:
// points taken, no life or balloon lost, and the player above and near the closest bird or bonus
// balloon. Nothing in it is random, so it finds the same game every time. It takes about a quarter
// of an hour, and is run by hand; test_route.js replays what it wrote.
//   node games/nes/balloon-fight/route/find_route.js
// It keeps the controller's value at each of the game's reads of it (route.js), not the frames
// it was held for: that is what replays on another machine.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { READ, V, runs, score } = require('./route.js');
const OUT = path.join(__dirname, 'route.json');

const PASS = 0xF46F;                          // the exit of wait_frame, once a frame
const A = 1, B = 2, START = 8, LEFT = 64, RIGHT = 128;
const BIRDS = { x: 0x91, y: 0x9A, balloons: 0x88 };
const BONUS = { state: 0x055D, x: 0x0567, y: 0x057B };
const ACTIONS = [0, B, B | LEFT, B | RIGHT, LEFT, RIGHT, A, A | LEFT, A | RIGHT];
const THEN = [B, 0, B | LEFT, B | RIGHT];
const STEP = 9, LOOK = 36, END_INDEX = 4, MAX_FRAMES = 40000;

// The listing's bytes, with the RAM clear as at power-on: the listing carries the RAM of the snapshot
// it was made from, and the game reads some bytes before it writes them (balloons_popped, $05CD)
const ram = loadListing(path.join(ROOT, 'games/nes/balloon-fight/listing.json'));
ram.fill(0, 0, 0x800);
function attach(m, log) {
  m.hooks[READ] = cpu => { if (log) log[cpu.x & 1].push(m.pads[cpu.x & 1]); };
  return m;
}
const copy = m => attach(Machine.restore(m.save()), null);
const hold = (m, n, pad) => { m.pads[0] = pad; m.pads[1] = 0; m.runFrames(n); };

// How good a moment is, against the one the choice was made at.
function value(m, base) {
  const r = m.ram;
  let v = (score(r) - base.score) * 4;
  if (r[V.lives] !== base.lives) v -= 1e7;
  if (r[V.balloons] < base.balloons) v -= 1e6;
  if (r[V.phase] !== base.phase) v += 1e6;
  const px = r[BIRDS.x], py = r[BIRDS.y];
  if (py >= 0xB0) v -= (py - 0xB0) * 400;    // down by the water, where the fish takes a player
  if (r[V.balloons] === 0 || r[V.balloons] === 0xFF) return v;
  let best = Infinity;
  for (let i = 2; i < 8; i++) {               // a bird with its balloon or on its parachute
    const b = r[BIRDS.balloons + i];
    if (b !== 1 && b !== 2) continue;
    const dx = Math.abs(r[BIRDS.x + i] - px), dy = (r[BIRDS.y + i] - 18) - py;
    best = Math.min(best, dx + Math.abs(dy) * 1.5 + (dy < -4 ? 40 : 0));
  }
  for (let i = 0; i < 10; i++) {              // a bonus round's balloon
    if (!r[BONUS.state + i]) continue;
    best = Math.min(best, Math.abs(r[BONUS.x + i] - px) + Math.abs(r[BONUS.y + i] - py) * 1.2);
  }
  return best === Infinity ? v : v - best * 3;
}

function choose(m) {
  const r = m.ram, base = { score: score(r), lives: r[V.lives], balloons: r[V.balloons], phase: r[V.phase] };
  let best = 0, most = -Infinity;
  for (const a of ACTIONS) {
    let v = -Infinity;
    for (const b of [a, ...THEN]) { const c = copy(m); hold(c, STEP, a); hold(c, LOOK, b); v = Math.max(v, value(c, base)); }
    if (v > most) { most = v; best = a; }
  }
  return best;
}

const log = [[], []];
const m = attach(new Machine({ ram: Uint8Array.from(ram), pc: 0xC000, passAt: PASS }), log);
hold(m, 120, 0);                              // the title, then Start: one player, the first option
hold(m, 8, START);
hold(m, 8, 0);
const t0 = Date.now();
let phase = -1;
while (m.ram[V.phase] < END_INDEX) {
  if (m.ram[V.phase] !== phase) { phase = m.ram[V.phase]; console.log('frame ' + m.frames + ': layout ' + phase + ', score ' + score(m.ram) + ', ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
  if (m.ram[V.lives] === 0xFF || m.frames > MAX_FRAMES) { console.log('FAIL no route: ' + (m.frames > MAX_FRAMES ? 'out of frames' : 'game over') + ' at frame ' + m.frames); process.exit(1); }
  hold(m, STEP, choose(m));
}
const rec = {
  about: 'Balloon Fight played from power-on by find_route.js: one player through phases 1 to 3 and the first bonus round, to the start of phase 4. p1 and p2 are each controller\'s buttons at the game\'s reads of it, as runs of [value, count] (route.js).',
  p1: runs(log[0]), p2: runs(log[1]),
};
fs.writeFileSync(OUT, JSON.stringify(rec) + '\n');
console.log('frame ' + m.frames + ': layout ' + m.ram[V.phase] + ', score ' + score(m.ram) + ', lives ' + m.ram[V.lives] + '; ' + log[0].length + ' reads, ' + rec.p1.length / 2 + ' runs; wrote ' + path.relative(ROOT, OUT));
