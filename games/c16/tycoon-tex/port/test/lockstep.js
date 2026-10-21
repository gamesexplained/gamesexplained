'use strict';
// The whole game against the port, pass by pass (kit/c16/lockstep.js): the game's own code on the
// kit's C16 from its cold start at $1800, the port beside it from the same memory, the two compared
// at the start of every pass ($2A28, once a turn of the main loop in play). A player is scripted
// from the game's own state, read once a frame as an interrupt begins: at the menu the items
// stepped to and chosen (the sound, the lives, the difficulty, the keyboard or the joystick, a game
// or the demo), a name typed for the high scores; in play the stick, or the keys, at random, with
// pauses, and ESC in one game. In some games, at the start of a pass and in both memories, the
// level is finished (level_done, the cheat Plus/4 World gives), the pressure left low, or the
// score set high enough for the table.
//   node lockstep.js [frames] [seed]
// run({ frames, seed, onPass, onPort, timing, ignore }) is the same for scripts/fit-cost.js;
// player(seed) is the script alone, for scripts/gen-states.js.
const path = require('path');
const lib = require('./lib.js');
const { Machine, KEY } = require(path.join(lib.REPO, 'kit/c16/machine.js'));
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c16/lockstep.js'));
const { IRQ_BYTES } = globalThis.TexPort;

// Every checkpoint the port yields: the main program's calls of delay, refill_pipe and those in
// main_loop, the instruction after a CLI where an interrupt comes in, and the handler's two.
const CHECKPOINTS = [
  0x2BC3, 0x2BCC, 0x2BCF, 0x2BD2,                          // menu
  0x273D, 0x2740,                                          // enter_hiscore
  0x333A, 0x333D, 0x344A, 0x344D,                          // countdown, the_end
  0x2A28, 0x2A35, 0x2A38, 0x2A42, 0x2A45, 0x2A56, 0x2A5E, 0x2A65,   // main_loop
  0x38A6, 0x38A9, 0x393B, 0x393E, 0x394D, 0x3950,          // level_complete
  0x3989, 0x398C, 0x39EE, 0x39F1, 0x3A1D, 0x3A20,          // pressure_out
  0x3A84, 0x3AA1, 0x3AF4, 0x3AF7,                          // next_level
  0x18DD, 0x24BD,                                          // irq's way out, tex_death after refill_pipe
];
const IRQS = { 0x18A9: 'irq' };
const PASS = 0x2A28;
const CHROUT = ram => c => { ram.fill(0x20, 0x0C00, 0x0FE8); c.rts(); };   // JSR $FFD2 with $93 only

// The menu's items: 0 the difficulty, 1 the lives, 2 the sound, 3 play, 4 the demo. Each game's
// script at the menu: ['set', item, address, value], fire on the item until the setting at the
// address has the value; ['key', name], a key held (J the joystick, K the keyboard); ['go', item],
// fire on PLAY THE GAME or WATCH THE DEMO. Then what happens in play: finish, the passes at which
// the level is finished; low, the pass at which the pressure is left at its last cell; score, the
// pass at which the score is set to 9,970 (for the high scores); tough, the pass from which Tex
// cannot be killed (the two operands Plus/4 World's poke sets to 0, cheats.md); lives, the pass
// from which a death takes no life (the two DECs Plus/4 World's poke makes loads); pause, the
// frame SPACE pauses (C= goes on a second later); esc, the frame ESC is pressed, and every 200
// frames after it until it is seen (check_play_keys reads no keys while Tex dies).
const SOUND = 0x1828, LIVES = 0x1827, DIFFICULTY = 0x182B;
const GAMES = [
  { menu: [['set', 2, SOUND, 1], ['go', 3]], finish: [60, 140, 220, 300], pause: 200 },
  { menu: [['key', 'K'], ['set', 1, LIVES, 5], ['set', 0, DIFFICULTY, 1], ['go', 3]], score: 10, low: 20 },
  { menu: [['go', 4]], esc: 1500 },
  { menu: [['key', 'J'], ['set', 0, DIFFICULTY, 2], ['go', 3]], finish: [100, 200, 300, 400, 500, 600, 700, 800, 900], tough: 1, esc: 7000 },
  { menu: [['set', 0, DIFFICULTY, 0], ['set', 1, LIVES, 1], ['set', 2, SOUND, 0], ['go', 3]] },
  { menu: [['set', 2, SOUND, 1], ['go', 3]], lives: 1, esc: 3000 },
];
const STICK = [0x1F, 0x17, 0x17, 0x17, 0x1B, 0x1E, 0x16, 0x1A, 0x1D, 0x1F];  // still, right, left, up, the diagonals, down
const KEYS = { up: ';', down: '/', left: 'Z', right: 'X', fire: 'RETURN' };   // key_columns and key_rows

// The player: input(m), once a frame; hooks for the machine; onPass(n, m, M2) for a pass's start,
// with the port's memory (or null) to change alongside the game's.
function player(seed) {
  let s = seed || 1;
  const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
  const S = { last: -1, mode: null, game: -1, f: 0, passes: 0, step: 0, left: 0, stick: 0x1F, hold: 0, naming: -99, menu: -99, done: {} };
  const keyboard = m => m.ram[0x182A] === 0;
  const press = (m, what) => {
    if (keyboard(m)) { m.press(KEY[KEYS[what]]); return; }
    m.joy &= { up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F }[what];
  };
  function input(m) {
    if (m.frames === S.last) return;
    S.last = m.frames;
    const mode = m.frames - S.naming < 40 ? 'name' : m.frames - S.menu < 40 ? 'menu' : m.ram[0x38] === 0 ? 'play' : 'wait';
    if (mode !== S.mode) {
      if (mode === 'name' || (mode === 'menu' && S.mode !== 'name')) S.game++;   // a new visit to the menu
      S.mode = mode; S.f = 0; S.step = 0; S.left = 0;
      if (mode === 'play') S.passes = 0;
    }
    m.releaseAll(); m.joy = 0x1F;
    S.f++;
    const G = GAMES[S.game % GAMES.length] || GAMES[0];
    if (mode === 'name') {                                 // a letter up, the next, ..., then fire, again each second
      const T = ['up', 'up', 'right', 'down', 'right', 'up', 'left', 'right', 'right', 'fire'];
      if (S.left <= 0) { S.step++; S.left = S.step < T.length ? 17 : 60; }
      if (S.left-- > (S.step < T.length ? 12 : 55)) press(m, T[Math.min(S.step - 1, T.length - 1)]);
      return;
    }
    if (mode === 'menu') {                                 // 5 frames held, 12 let go: one turn of the menu sees it
      if (S.left > 0) { if (S.left-- > 12 && S.what) { if (S.what.length === 1) m.press(KEY[S.what]); else press(m, S.what); } return; }
      S.what = null;
      const [what, arg, a, v] = G.menu[Math.min(S.step, G.menu.length - 1)];
      S.left = 17;
      if (what === 'key') { S.what = arg; S.step++; return; }
      if (m.ram[0x1829] !== arg) { S.what = (m.ram[0x1829] - arg + 5) % 5 <= 2 ? 'down' : 'up'; return; }
      if (what === 'set' && m.ram[a] === v) { S.step++; S.left = 0; return; }
      S.what = 'fire';
      return;
    }
    if (mode !== 'play') return;
    if (G.esc && S.f >= G.esc && (S.f - G.esc) % 200 < 4) { m.press(KEY.ESC); return; }   // again while Tex dies
    if (m.ram[0x182C]) return;                             // the demo plays itself
    if (G.pause && S.f >= G.pause && S.f < G.pause + 3) { m.press(KEY.SPACE); return; }
    if (G.pause && S.f >= G.pause + 60 && S.f < G.pause + 63) { m.press(KEY['C=']); return; }
    if (S.hold-- <= 0) { S.stick = STICK[rnd(STICK.length)]; S.hold = 6 + rnd(40); }
    let v = S.stick;
    if (rnd(12) === 0) v &= 0x0F;
    if (!keyboard(m)) { m.joy = v; return; }
    for (const [bit, what] of [[1, 'up'], [2, 'down'], [4, 'left'], [8, 'right'], [16, 'fire']]) if (!(v & bit)) press(m, what);
  }
  function onPass(n, m, M2) {
    if (S.mode !== 'play') return;
    S.passes++;
    const G = GAMES[S.game % GAMES.length] || GAMES[0], set = (a, v) => { m.ram[a] = v; if (M2) M2[a] = v; };
    if (G.finish && G.finish.includes(S.passes)) set(0x9D, 0x01);
    if (G.low === S.passes) { set(0x29, 0x00); set(0x28, 0x01); }
    if (G.score === S.passes) [0x30, 0x30, 0x39, 0x39, 0x37, 0x30].forEach((v, i) => set(0x0C56 + i, v));
    if (G.tough === S.passes) { set(0x1EB7, 0x00); set(0x1EEC, 0x00); }
    else if (S.passes === 1 && m.ram[0x1EB7] === 0) { set(0x1EB7, 0x01); set(0x1EEC, 0x01); }   // the next game as loaded
    if (G.lives === S.passes) { set(0x249D, 0xAD); set(0x24A0, 0xA5); }
    else if (S.passes === 1 && m.ram[0x249D] === 0xAD) { set(0x249D, 0xCE); set(0x24A0, 0xC6); }
  }
  const hooks = m => ({ 0x26CC: () => { S.naming = m.frames; return false; }, 0x2BD2: () => { S.menu = m.frames; return false; },
    0x18A9: () => { input(m); return false; } });
  return { input, onPass, hooks, S };
}

function run(o = {}) {
  const frames = o.frames || 6000;
  const ram = lib.boot();
  const m = new Machine({ ram, pc: 0x1800, passAt: PASS, hooks: { 0xFFD2: CHROUT(ram) } });
  const pl = player(o.seed || 1);
  Object.assign(m.hooks, pl.hooks(m));
  const P = lib.makePort(new Uint8Array(65536), { sei() {}, cli() {} });
  const hold = {};
  if (o.onPort) o.onPort(P, hold);
  if (hold.watch) hold.watch(m);
  const ls = hold.ls = new Lockstep({ machine: m, port: P, program: P => P.program(), checkpoints: CHECKPOINTS, irqs: IRQS,
    irqBytes: IRQ_BYTES, ignore: o.ignore, timing: o.timing, maxFrames: 4000 });
  const onPass = (n, mm, l) => { pl.onPass(n, mm, l.P.M); if (o.onPass) o.onPass(n, mm, l, pl.S); };
  const res = { passes: 0, ok: true, diffs: [], diverged: null, frames: 0 };
  while (m.frames < frames && res.ok) {
    const r = ls.run({ passes: 1, onPass });
    res.passes += r.passes; res.frames += r.frames; res.ok = r.ok; res.diffs.push(...r.diffs); res.diverged = r.diverged;
  }
  return { res, m, ls, P, S: pl.S };
}

if (require.main === module) {
  const frames = +(process.argv[2] || 6000), seed = +(process.argv[3] || 1);
  const t0 = Date.now();
  let last = 0;
  const r = run({ frames, seed, onPass: (n, mm, l, S) => {
    if (mm.frames - last >= 2000) {
      last = mm.frames;
      console.log('frame', mm.frames, 'pass', n, 'game', S.game, 'level', mm.ram[0x62].toString(16), 'lives', mm.ram[0x80]);
    }
  } });
  console.log(describe(r.res), '(' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  if (!r.res.ok) process.exitCode = 1;
}
module.exports = { run, player, CHECKPOINTS, IRQS, PASS, CHROUT };
