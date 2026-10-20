'use strict';
// The whole game against the port, pass by pass (kit/c16/lockstep.js): the game's own code on the
// kit's C16 from its cold start at $1800, the port beside it from the same memory, the two compared
// at the start of every pass ($1852, once a frame in play). A player is scripted from the game's
// own state, read once a frame as an interrupt begins: on the title the level changed, the
// controls switched and a name typed for the high scores; in play the stick, or the keys, at
// random, with sticks of dynamite now and then. One game is left with ESC; in another the level
// is finished: at the start of a pass with Pete at the shaft, his goodies are counted out in both
// memories and the stick pushed up; in a third the score is set to 4,500 the same way, for a name
// in the high scores.
//   node lockstep.js [frames] [seed]
// run({ frames, seed, onPass, onPort, timing, ignore }) is the same for scripts/fit-cost.js.
const path = require('path');
const lib = require('./lib.js');
const { Machine, KEY } = require(path.join(lib.REPO, 'kit/c16/machine.js'));
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c16/lockstep.js'));
const { IRQ_BYTES } = globalThis.PetePort;

// Every checkpoint the port yields: main_loop's calls, level_done's, title's, irq_play's.
const CHECKPOINTS = [0x184C, 0x184F, 0x1852, 0x186C, 0x186F, 0x1872, 0x1875, 0x187C, 0x18DF, 0x18EB,
  0x305B, 0x3077, 0x307A,
  0x19EA, 0x1A2C, 0x1A35, 0x1A38, 0x1A3D, 0x1A57, 0x1A5A, 0x1A5D, 0x1A60, 0x1A75, 0x1A93, 0x1ACE, 0x1AE0];
const IRQS = { 0x1991: 'irq_play', 0x3080: 'irq_title' };

// The title's keys, a game at a time: [what, frames held, frames after]. Left and right change
// the level, or the letter of a name; RETURN switches the controls; fire takes a letter or starts.
const TITLE = [
  [['right', 4, 6], ['right', 30, 6], ['left', 4, 6], ['fire', 3, 8]],
  [['return', 3, 8], ['left', 4, 6], ['fire', 3, 8], ['right', 3, 6], ['fire', 3, 6], ['left', 20, 4], ['fire', 3, 6]],
  [['return', 3, 8], ['right', 4, 6], ['fire', 3, 8], ['fire', 3, 8]],
];
const STICK = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x1F, 0x1A, 0x16];   // still, up, down, left, right, still, diagonals
const ESC_GAME = 3, FINISH_GAME = 2, SCORE_GAME = 4;

function run(o = {}) {
  const frames = o.frames || 3000;
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
  const m = new Machine({ ram: lib.boot(), pc: 0x1800, passAt: 0x1852 });
  const P = lib.makePort(new Uint8Array(65536), { sei() {}, cli() {} });
  const S = { last: -1, title: null, game: -1, f: 0, stick: 0x1F, hold: 0, step: 0, left: 0, finish: 0 };
  const press = (m, what) => {
    const keys = m.ram[0xA3] & 0x80;
    if (what === 'return') m.press(KEY.RETURN);
    else if (what === 'esc') m.press(KEY.ESC);
    else if (what === 'fire') { if (keys) m.press(KEY.SPACE); else m.joy &= 0x0F; }
    else if (what === 'right') { if (keys) m.press(KEY.S); else m.joy &= 0x17; }
    else if (what === 'left') { if (keys) m.press(KEY.A); else m.joy &= 0x1B; }
  };
  function input(m) {
    if (m.frames === S.last) return;                       // once a frame, at its first interrupt
    S.last = m.frames;
    const title = (m.ram[0x0314] | m.ram[0x0315] << 8) === 0x3080;
    if (title !== S.title) { S.title = title; S.f = 0; S.step = 0; S.left = 0; if (title) S.game++; }
    m.releaseAll(); m.joy = 0x1F;
    if (title) {                                           // the script, then fire every 12 frames
      const T = TITLE[S.game % TITLE.length];
      if (S.f++ < 40) return;
      if (S.left <= 0) { S.step++; S.left = 0; }
      const k = S.step - 1, [what, held, after] = k < T.length ? T[k] : ['fire', 3, 9];
      if (S.left === 0) S.left = held + after;
      if (S.left > after) press(m, what);
      S.left--;
      return;
    }
    S.f++;
    if (S.game === ESC_GAME && S.f >= 900 && S.f < 906) { m.press(KEY.ESC); return; }
    if (S.finish) { S.finish--; if (S.finish < 12) m.joy = 0x1E; return; }
    if (S.hold-- <= 0) { S.stick = STICK[rnd(STICK.length)]; S.hold = 8 + rnd(50); }
    const keys = m.ram[0xA3] & 0x80, fire = rnd(45) === 0;
    if (!keys) { m.joy = S.stick & (fire ? 0x0F : 0x1F); return; }
    if (!(S.stick & 1)) m.press(KEY.P);
    if (!(S.stick & 2)) m.press(KEY.L);
    if (!(S.stick & 4)) m.press(KEY.A);
    if (!(S.stick & 8)) m.press(KEY.S);
    if (fire) m.press(KEY.SPACE);
  }
  for (const a of Object.keys(IRQS)) m.hooks[a] = () => { input(m); return false; };
  // o.onPort(P, hold) may wrap the port's routines before the lockstep is made; hold.ls is the
  // lockstep once it is (scripts/fit-cost.js)
  const hold = {};
  if (o.onPort) o.onPort(P, hold);
  const ls = hold.ls = new Lockstep({ machine: m, port: P, program: P => P.program(), checkpoints: CHECKPOINTS, irqs: IRQS,
    irqBytes: IRQ_BYTES, ignore: o.ignore, timing: o.timing, maxFrames: 2000 });
  const onPass = (n, mm, l) => {
    // the level finished in one game: Pete at the shaft and still, his goodies counted out
    if (S.game === FINISH_GAME && !S.done && S.f > 30 && mm.ram[0xA8] && mm.ram[0x06] === 0x2C && mm.ram[0x07] === 0x04 &&
      mm.ram[0x4A] === 0 && !S.finish) {
      mm.ram[0xB5] = l.P.M[0xB5] = 0; S.finish = 30; S.done = true;
    }
    // a score for the high-score table in another: 4,500, set at a pass's start in both memories
    if (S.game === SCORE_GAME && !S.scored && S.f > 10) { mm.ram[0xAB] = l.P.M[0xAB] = 0x45; S.scored = true; }
    if (o.onPass) o.onPass(n, mm, l, S);
  };
  // a pass at a time, to stop at a frame: the title has none, so a run there lasts to the next game
  const res = { passes: 0, ok: true, diffs: [], diverged: null, frames: 0 };
  while (m.frames < frames && res.ok) {
    const r = ls.run({ passes: 1, onPass });
    res.passes += r.passes; res.frames += r.frames; res.ok = r.ok; res.diffs.push(...r.diffs); res.diverged = r.diverged;
  }
  return { res, m, ls, P, S };
}

if (require.main === module) {
  const frames = +(process.argv[2] || 3000), seed = +(process.argv[3] || 1);
  const t0 = Date.now();
  let last = 0;
  const r = run({ frames, seed, onPass: (n, mm, l, S) => {
    if (mm.frames - last >= 1000) { last = mm.frames; console.log('frame', mm.frames, 'pass', n, 'game', S.game, 'level', mm.ram[0xA7], 'men', mm.ram[0xA9].toString(16)); }
  } });
  console.log(describe(r.res), '(' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  if (!r.res.ok) process.exitCode = 1;
}
module.exports = { run, CHECKPOINTS, IRQS };
