#!/usr/bin/env node
'use strict';
// The Play tab's mods (reference/bf-mods.js) and the saved states they rest on
// (reference/bf-play.js, save and restore). Checks:
// - a state saved at the top of the phase loop, and one in Balloon Trip, restored into a second
//   machine, runs on exactly as the first: the same RAM and the same picture on every frame for
//   3,000 frames, with the same controllers;
// - rewind goes back, and play goes on from there;
// - each cheat does what its switch says over a long random game: the lives held, the players
//   never losing a balloon to a bird or a spark with the shield, no spark thrown when calm, the
//   fish never waking, the gravity table scaled and kept across a reset;
// - Balloon Trip's ghost: a run that ends is kept, and the next run plays it back.
//   node games/nes/balloon-fight/test_mods.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
require(path.join(ROOT, 'site/lib/nes.js'));
require(path.join(ROOT, 'site/lib/apu.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g0 = game(__dirname);
const { BalloonFight } = g0.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');
globalThis.BalloonFight = BalloonFight;
const { BalloonFightPlay } = g0.run('reference/bf-play.js', 'bf-play.js', 'BalloonFightPlay');
const { BalloonFightMods } = g0.run('reference/bf-mods.js', 'bf-mods.js', 'BalloonFightMods');
const D = JSON.parse(/<script type="application\/json" id="bf-play-data">([\s\S]*?)<\/script>/.exec(g0.read('play.html'))[1]);
const V = BalloonFight.V, FRAME = BalloonFightPlay.FRAME;
const make = () => BalloonFightPlay.create({ data: D, costs: D.costs, CPU, NES: globalThis.NES, NESApu: globalThis.NESApu });

let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); };
// the controller as a function of the frame: B held most of the time, steering that changes
// every second or so, and a pause-free stretch of taps
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
const input = (f) => { const h = hash(f >> 6); return ((h & 3) === 0 ? 0 : 2) | [0, 64, 128, 0][(h >> 2) & 3] | ((f & 16) && (h & 16) ? 1 : 0); };
const until = (g, test, most) => { const f0 = g.frames; while (!test() && g.frames - f0 < most) g.run(FRAME); return test(); };

// --- a saved state runs on exactly as the game it came from
function same(where, after) {
  const a = make();
  a.onFrame = () => { if (!a.scripted()) a.pads(input(a.frames)); };
  a.startAt(where);
  let saved = null;
  a.onLoop = () => { if (!saved && a.frames >= after) saved = a.save(); };
  until(a, () => saved, 20000);
  const name = where.mode === 2 ? 'Balloon Trip' : 'phase ' + (where.index + 1);
  if (!saved) return check(false, name + ': no state saved');
  const want = [];
  a.onLoop = null;
  a.onFrame = () => { if (!a.scripted()) a.pads(input(a.frames)); want[a.frames] = [a.M.slice(0, 0x800), a.picture().slice()]; };
  until(a, () => a.frames >= saved.frames + 3000, 4000);
  const b = make();
  b.restore(saved);
  let bad = -1;
  b.onFrame = () => {
    b.pads(input(b.frames));
    const w = want[b.frames];
    if (bad < 0 && w && (!w[0].every((v, i) => v === b.M[i]) || !w[1].every((v, i) => v === b.picture()[i]))) bad = b.frames;
  };
  until(b, () => b.frames >= saved.frames + 3000, 4000);
  check(bad < 0 && b.frames >= saved.frames + 3000 && saved.kind === (where.mode === 2 ? 'trip' : 'phase'), name + ': a ' + saved.kind + ' state saved at frame ' + saved.frames +
    ' and restored runs on as the original for 3,000 frames' + (bad < 0 ? '' : ', but differs at frame ' + bad));
}
same({ mode: 0, index: 0, counter: 0, bonus: 0 }, 900);
same({ mode: 0, index: 9, counter: 7, bonus: 2 }, 600);
same({ mode: 2 }, 300);

// --- rewind, through the mods
{
  const g = make(), mods = BalloonFightMods.create(g);
  g.startAt({ mode: 0, index: 1, counter: 1, bonus: 0 });
  until(g, () => g.frames >= 1500, 2000);
  const at = g.frames;
  let back = 0;
  for (let i = 0; i < 6; i++) if (mods.rewind()) back++;
  const to = g.frames;
  mods.resume();
  until(g, () => g.frames >= to + 600, 700);
  check(back === 6 && to < at - 150 && to > at - 260 && g.frames >= to + 600 && g.loop && g.loop.kind === 'phase',
    'rewind: six steps went back from frame ' + at + ' to ' + to + ', and play went on for 600 frames');
}

// --- the cheats over a long random game
function playWith(set, where, frames, watch, pad) {
  const g = make(), mods = BalloonFightMods.create(g);
  for (const [k, v] of Object.entries(set)) mods.set(k, v);
  const frame = mods.onFrame || g.onFrame;
  g.onFrame = () => { frame(); if (!g.scripted()) g.pads(pad ? pad(g) : input(g.frames * 7 + 3)); watch(g); };
  g.startAt(where);
  until(g, () => false, frames);
  return { g, mods };
}
{
  let lowest = 9, overs = 0;
  playWith({ lives: true }, { mode: 0, index: 2, counter: 2, bonus: 0 }, 12000, (g) => {
    if (g.loop && g.loop.kind === 'phase' && !g.M[V.demo_flag]) lowest = Math.min(lowest, g.M[V.lives] & 0x80 ? -1 : g.M[V.lives]);
    if (g.M[V.lives] === 0xFF) overs++;
  });
  check(lowest >= 1 && overs === 0, 'lives: over 12,000 frames of random play the lives never ran out (fewest ' + lowest + ')');
}
// each cheat beside a control: the same game with the cheat off, which shows the thing happening
const balloonsLost = (shield) => {
  let lost = 0, prev = [0xFF, 0xFF];
  playWith({ shield, noFish: true, lives: true }, { mode: 0, index: 5, counter: 5, bonus: 1 }, 12000, (g) => {
    for (let x = 0; x < 2; x++) {
      const b = g.M[V.actor_balloons + x];
      if (prev[x] === 2 && b < 2) lost++;
      prev[x] = b;
    }
  });
  return lost;
};
{
  const off = balloonsLost(false), on = balloonsLost(true);
  check(off > 0 && on === 0, 'shield: over 12,000 frames among birds, the player lost ' + off + ' balloons without it and none with it');
}
const sparks = (calm) => {
  let thrown = 0, timer = 9;
  playWith({ calm, shield: true, lives: true }, { mode: 0, index: 0, counter: 0, bonus: 0 }, 9000, (g) => {
    if (!g.loop || g.frames - g.loop.frame > 3) return;
    if (!(g.M[V.spark_state] & 0x80) || !(g.M[V.spark_state_1] & 0x80)) thrown++;
    timer = Math.min(timer, g.M[V.lightning_timer]);
  });
  return [thrown, timer];
};
{
  const off = sparks(false), on = sparks(true);
  check(off[0] > 0 && on[0] === 0 && on[1] >= 2, 'calm: over 9,000 frames, sparks were in the air for ' + off[0] + ' frames without it, and none was thrown with it');
}
// the fish's controller skims the water: a flap whenever the player sinks below Y $BC, steering
// one way and then the other every four seconds
const fish = (noFish) => {
  let found = 0, rose = 0;
  playWith({ noFish, shield: true, lives: true }, { mode: 0, index: 0, counter: 0, bonus: 0 }, 9000, (g) => {
    if (!g.loop || g.frames - g.loop.frame > 3) return;   // in play, not on the title or between phases
    if (!(g.M[V.fish_state] & 0x80)) rose++;          // the fish awake: rising, biting or sinking
    if (g.M[V.sfx_request_c] & 0x40) found++;          // the sound fish_update asks for when it finds a target
  }, (g) => ((g.M[V.actor_y] > 0xBC && (g.frames & 4)) ? 1 : 0) | ((g.frames >> 8) & 1 ? 64 : 128));
  return [found, rose];
};
{
  const off = fish(false), on = fish(true);
  check(off[1] > 0 && on[0] === 0 && on[1] === 0, 'noFish: over 9,000 frames, the fish was awake for ' + off[1] + ' frames without it, and never woke with it');
}
{
  const { g, mods } = playWith({ gravity: 0.5 }, { mode: 0, index: 0, counter: 0, bonus: 0 }, 300, () => {});
  const rom = BalloonFightPlay.create({ data: D, costs: D.costs, CPU, NES: globalThis.NES, NESApu: globalThis.NESApu }).M;
  const half = (t) => Math.max(1, Math.round(rom[V.gravity_by_type + t] * 0.5));
  const ok1 = [3, 7, 0].every((t) => g.M[V.gravity_by_type + t] === half(t));
  g.boot(); const ok2 = [3, 7, 0].every((t) => g.M[V.gravity_by_type + t] === half(t));
  mods.set('gravity', 1); const ok3 = [3, 7, 0].every((t) => g.M[V.gravity_by_type + t] === rom[V.gravity_by_type + t]);
  check(ok1 && ok2 && ok3, 'gravity: the table halved, still halved after a reset, and back when set to 1');
}

// --- Balloon Trip's ghost
{
  const { g, mods } = playWith({}, { mode: 2 }, 12000, () => {});
  const first = mods.best;
  check(first && first.frames > 60, 'ghost: a Balloon Trip run was kept (' + (first ? first.frames : 0) + ' frames)');
  let shown = 0;
  g.onFrame = ((f) => () => { f(); if (mods.ghostSprites()) shown++; })(g.onFrame);
  g.startAt({ mode: 2 });
  until(g, () => false, 1200);
  check(shown > 30, 'ghost: the next run played the kept one back (' + shown + ' frames)');
}

console.log(fails ? fails + ' failed' : 'all mod checks pass');
process.exit(fails ? 1 : 0);
