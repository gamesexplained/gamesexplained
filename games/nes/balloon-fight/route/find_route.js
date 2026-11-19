#!/usr/bin/env node
'use strict';
// Finds the recorded games the Play tab's Watch button plays (route.json): from power-on, one
// player through phases 1, 2 and 3 and the first bonus round, to the start of phase 4, with no
// life lost. Each game comes from a seed, and the page picks one of them at random, so Watch
// plays a different game each time.
//
// The game runs on the kit's NES (kit/nes/machine.js) from the listing's bytes. Every few frames
// the search tries each of nine ways to hold the controller, each followed by a few more for a
// lookahead on copies of the machine, and keeps the one whose best ending scores most. In a phase
// that is points taken, no life or balloon lost, and the player above and near the closest bird.
// In the bonus round the score stays put until the results, so there it is the balloons popped
// (balloons_popped, $05CD) and the player near the closest balloon, or waiting in the middle of
// the screen when none is up.
//
// The seed changes how long the title waits before Start, the order the ways are tried in, and a
// small random amount added to each ending's score, which breaks near ties another way. Each phase
// is played twice from its start and the better play kept (no life lost, then the higher score);
// one that loses a life is played again. The bonus round is played up to six ways and stops at
// the first that pops all 20, the perfect bonus. A seed takes five to twenty minutes; the seeds
// run side by side, one process each. It is run by hand; test_route.js replays what it wrote.
//   node games/nes/balloon-fight/route/find_route.js [--seeds 1-8] [--jobs 8]
// It keeps the controller's value at each of the game's reads of it (route.js), not the frames
// it was held for: that is what replays on another machine.
const fs = require('fs'), path = require('path'), { fork } = require('child_process');
const ROOT = path.resolve(__dirname, '../../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { READ, V, runs, score } = require('./route.js');
const OUT = path.join(__dirname, 'route.json');

const PASS = 0xF46F;                          // the exit of wait_frame, once a frame
const A = 1, B = 2, START = 8, LEFT = 64, RIGHT = 128;
const BIRDS = { x: 0x91, y: 0x9A, balloons: 0x88 };
const BONUS = { state: 0x055D, x: 0x0567, y: 0x057B }, ALL = 20;
const ACTIONS = [0, B, B | LEFT, B | RIGHT, LEFT, RIGHT, A, A | LEFT, A | RIGHT];
const THEN = [B, 0, B | LEFT, B | RIGHT];
const BONUS_THEN = [B, 0, B | LEFT, B | RIGHT, A, A | LEFT, A | RIGHT];
const PHASE = { step: 9, look: 36 };
const BONUS_WAYS = [{ step: 6, look: 36 }, { step: 6, look: 48 }, { step: 9, look: 36 }, { step: 6, look: 30 }, { step: 6, look: 42 }, { step: 9, look: 48 }];
const PHASE_PLAYS = 2, PHASE_TRIES = 6, END_INDEX = 4, MAX_FRAMES = 40000, NOISE = 6;

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

// A small generator of the seed's numbers (mulberry32).
function random(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(list, rnd) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const isBonus = r => (r[V.phase] & 3) === 3;

// How good a moment of a phase is, against the one the choice was made at.
function phaseValue(m, base) {
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
  return best === Infinity ? v : v - best * 3;
}

// How good a moment of the bonus round is: each balloon popped outweighs everything else, then
// the closest balloon, a little more for one high up (it leaves the screen sooner), and with none
// up, the middle of the screen, where the next is never far.
function bonusValue(m, base) {
  const r = m.ram, px = r[BIRDS.x], py = r[BIRDS.y];
  let v = (r[V.popped] - base.popped) * 1e5;
  if (r[V.phase] !== base.phase) v += 1e6;
  let best = Infinity;
  for (let i = 0; i < 10; i++) {
    if (!r[BONUS.state + i]) continue;
    best = Math.min(best, Math.abs(r[BONUS.x + i] - px) + Math.abs(r[BONUS.y + i] - py) * 1.2 + r[BONUS.y + i] * 0.3);
  }
  return best === Infinity ? v - Math.abs(px - 128) - Math.abs(py - 110) : v - best * 3;
}

function choose(m, way, rnd) {
  const r = m.ram, bonus = isBonus(r);
  const base = { score: score(r), lives: r[V.lives], balloons: r[V.balloons], phase: r[V.phase], popped: r[V.popped] };
  const value = bonus ? bonusValue : phaseValue, then = bonus ? BONUS_THEN : THEN;
  let best = 0, most = -Infinity;
  for (const a of shuffled(ACTIONS, rnd)) {
    let v = -Infinity;
    for (const b of [a, ...then]) { const c = copy(m); hold(c, way.step, a); hold(c, way.look, b); v = Math.max(v, value(c, base)); }
    v += rnd() * NOISE;
    if (v > most) { most = v; best = a; }
  }
  return best;
}

// One play of the stretch from the machine's state to the next phase index: a new machine and log.
function play(start, startLog, way, rnd) {
  const log = [startLog[0].slice(), startLog[1].slice()];
  const m = attach(Machine.restore(start), log), from = m.ram[V.phase], lives = m.ram[V.lives];
  while (m.ram[V.phase] === from && m.frames <= MAX_FRAMES && m.ram[V.lives] === lives) hold(m, way.step, choose(m, way, rnd));
  return { m, log, ok: m.ram[V.phase] !== from && m.ram[V.lives] === lives, score: score(m.ram), popped: m.ram[V.popped] };
}

function search(seed, say) {
  const rnd = random(seed), wait = 100 + Math.floor(rnd() * 120);
  let log = [[], []];
  let m = attach(new Machine({ ram: Uint8Array.from(ram), pc: 0xC000, passAt: PASS }), log);
  hold(m, wait, 0);                           // the title, then Start: one player, the first option
  hold(m, 8, START);
  hold(m, 8, 0);
  while (m.ram[V.phase] === 0 && m.ram[V.counter] === 0 && m.frames < 2000) hold(m, 1, 0);
  const t0 = Date.now();
  while (m.ram[V.phase] < END_INDEX) {
    const start = m.save(), index = m.ram[V.phase];
    let keep = null;
    if (isBonus(m.ram)) {
      for (const way of BONUS_WAYS) {
        const p = play(start, log, way, rnd);
        say('seed ' + seed + ': bonus round, ' + way.step + ' and ' + way.look + ' frames: ' + p.popped + ' popped');
        if (p.ok && (!keep || p.popped > keep.popped)) keep = p;
        if (keep && keep.popped >= ALL) break;
      }
    } else {
      for (let n = 0, good = 0; n < PHASE_TRIES && good < PHASE_PLAYS; n++) {
        const p = play(start, log, PHASE, rnd);
        say('seed ' + seed + ': layout ' + index + ', play ' + (n + 1) + ': ' + (p.ok ? 'score ' + p.score + ' at frame ' + p.m.frames : 'a life lost'));
        if (!p.ok) continue;
        good++;
        if (!keep || p.score > keep.score || (p.score === keep.score && p.m.frames < keep.m.frames)) keep = p;
      }
    }
    if (!keep) return { seed, fail: 'no play of layout ' + index + ' kept every life' };
    m = keep.m; log = keep.log;
    say('seed ' + seed + ': layout ' + m.ram[V.phase] + ' at frame ' + m.frames + ', score ' + score(m.ram) + ', ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  }
  // the bonus round's results count into the score with no read: run on to see the total
  const end = attach(Machine.restore(m.save()), null);
  for (let f = 0; f < 1200 && end.ram[V.counter] === m.ram[V.counter]; f++) hold(end, 1, 0);
  return { seed, wait, frames: m.frames, score: score(end.ram), popped: m.ram[V.popped], p1: runs(log[0]), p2: runs(log[1]) };
}

if (process.argv[2] === '--child') {
  const r = search(+process.argv[3], s => process.send({ say: s }));
  process.send(r, () => process.exit(0));
}

const arg = (name, d) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const [lo, hi] = arg('--seeds', '1-8').split('-').map(Number), jobs = +arg('--jobs', 8);
const seeds = []; for (let s = lo; s <= (hi || lo); s++) seeds.push(s);
const found = [];
let next = 0, running = 0;
function start() {
  while (running < jobs && next < seeds.length) {
    const seed = seeds[next++], child = fork(__filename, ['--child', String(seed)]);
    running++;
    child.on('message', msg => { if (msg.say) console.log(msg.say); else found.push(msg); });
    child.on('exit', () => { running--; if (next < seeds.length) start(); else if (!running) finish(); });
  }
}
function finish() {
  const ok = found.filter(r => !r.fail).sort((a, b) => a.seed - b.seed);
  for (const r of found.filter(r => r.fail)) console.log('FAIL seed ' + r.seed + ': ' + r.fail);
  for (const r of ok) console.log('seed ' + r.seed + ': phase 4 at frame ' + r.frames + ', ' + r.popped + ' bonus balloons, score ' + r.score);
  const rec = {
    about: 'Balloon Fight played from power-on by find_route.js, one game for each seed: one player through phases 1 to 3 and the first bonus round, to the start of phase 4. p1 and p2 are each controller\'s buttons at the game\'s reads of it, as runs of [value, count] (route.js).',
    routes: ok.map(r => ({ seed: r.seed, p1: r.p1, p2: r.p2 })),
  };
  fs.writeFileSync(OUT, JSON.stringify(rec) + '\n');
  console.log('wrote ' + ok.length + ' games to ' + path.relative(ROOT, OUT) + '; now run test_route.js --write');
}
start();
