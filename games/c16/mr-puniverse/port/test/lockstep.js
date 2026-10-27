'use strict';
// The whole game against the port, pass by pass (kit/c16/lockstep.js): the game's own code on the
// kit's C16 from the tape's hand-over at entry ($1AF4), its interrupt's keyboard scan the KERNAL's
// (kernalHooks), the port beside it from the same memory, the two compared at the start of every
// pass of the main loop ($32BC). A player is scripted from the game's own state, read once a frame
// as an interrupt begins: RETURN at the title; F1, F2, F3 and HELP in turn at the menu; in play the
// keys (Z, X, K, M and SHIFT) or the stick in port 2, at random, with P to pause and go on, and any
// key where the game waits for one (the 25th vitamin). Some games take Plus/4 World's pokes
// (cheats.md) at a pass's start, in both memories: no lives lost, no energy lost, nothing kills
// him, fewer vitamins to win, left through walls. In those the player is moved on to each room in
// turn, at a place with room for him: his room and place set for both players (the cheat
// "Stand anywhere"), then D, which loses a life and starts the next turn there.
//   node lockstep.js [frames] [seed]
// run({ frames, seed, onPass, onPort, timing, ignore }) is the same for scripts/fit-cost.js;
// player(seed) is the script alone, for scripts/gen-states.js.
const path = require('path');
const lib = require('./lib.js');
const { Machine, KEY, kernalHooks } = require(path.join(lib.REPO, 'kit/c16/machine.js'));
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c16/lockstep.js'));
const { IRQ_BYTES, T } = globalThis.PuniPort;

// Every checkpoint the port yields: new_game's JSR draw_lives, the title's loop, the main loop's calls, and the calls of delay.
const CHECKPOINTS = [
  0x3209, 0x3225,                                          // new_game: draw_lives, the title
  0x32BC, 0x32BF, 0x32C2, 0x32C5, 0x32C8, 0x32CB,          // main_loop
  0x1C51, 0x1C54,                                          // title_dot_step
  0x2033, 0x2036,                                          // refill_energy
  0x3320, 0x3323, 0x3356, 0x3359,                          // death
  0x339C, 0x339F, 0x33A2, 0x33A5, 0x33A8,                  // death, GAME OVER
];
const IRQS = { 0x312E: 'irq' };
const PASS = 0x32BC, ENTRY = 0x1AF4;

// The pokes (cheats.md): the address, the game's byte and the poke's.
const POKES = { lives: [0x3367, 0xDE, 0xBD], energy: [0x33AB, 0xCE, 0xAD], tough: [0x25C5, 0x68, 0x60],
  walls: [0x2172, 0x38, 0x39], win: [0x281F, 0x19, 0x01] };
// Each game's script: title, the frames on the title before RETURN (60 if not given; the dotted
// name changes colour after about 640); menu, the key chosen there (F1 one player and the stick, F2
// one and the keys, F3 two and sticks, HELP two and keys); pokes, those made at its first pass;
// rooms, every how many passes the player is moved on to the next room (0 never), near its vitamin
// if near; nine, the units of both players' VITAM set to 9 at the first pass, so that the next
// vitamin carries into the tens; pause, the pass P is pressed at; d, the pass D is pressed at (a
// life lost); drain, the pass from which, in the first room that drains the EGY bar, the bar is
// left a step from empty; refill, the pass from which, in the first room that refills it, its last
// six cells are left empty; clock, the pass at which the clock of the player in play is set to 399, a tick
// from the time running out; end, the pass from which, every 40 passes, the player in play is left
// one life, the lives poke taken out, and D pressed, to the game's end.
const GAMES = [
  { menu: 'F2', pokes: ['lives', 'energy'], rooms: 40, near: true, nine: true, pause: 50, end: 1040 },
  { menu: 'F1', pokes: [], title: 800, d: 300, end: 2000 },
  { menu: 'F3', pokes: ['lives', 'tough'], rooms: 70, refill: 100, drain: 200, end: 900 },
  { menu: 'HELP', pokes: ['win', 'walls'], rooms: 60, near: true, pause: 30, end: 1500 },
  { menu: 'F1', pokes: ['lives', 'energy', 'walls'], rooms: 50, clock: 400, end: 1300 },
];
const STICK = [0x1F, 0x17, 0x17, 0x1B, 0x1B, 0x1E, 0x1D, 0x16, 0x1A, 0x07, 0x0B, 0x0F];  // still, right, left, up, down, diagonals, fire
const KEYS = ['Z', 'X', 'K', 'M'];

// The player: input(m), once a frame; hooks for the machine; onPass(n, m, M2) for a pass's start,
// with the port's memory (or null) to change alongside the game's.
function player(seed) {
  let s = seed || 1;
  const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
  const S = { last: -1, mode: null, game: ((seed || 1) - 1) % GAMES.length - 1, f: 0, passes: 0, title: -99, menu: -99, pass: -99, hold: 0, stick: 0x1F, key: null,
    shift: false, room: 0, d: -1, stuck: 0, rooms: new Set() };
  const G = () => GAMES[S.game % GAMES.length];
  function input(m) {
    if (m.frames === S.last) return;
    S.last = m.frames;
    const mode = m.frames - S.title < 20 ? 'title' : m.frames - S.menu < 20 ? 'menu' : S.mode === 'title' || S.mode === 'menu' ? 'wait' : S.mode || 'wait';
    if (mode !== S.mode) {
      if (mode === 'title') { S.game++; S.passes = 0; S.p = undefined; S.d = -1; }
      S.mode = mode; S.f = 0;
    }
    S.f++;
    m.releaseAll(); m.joy = 0x1F;
    if (mode === 'title') { const t = G().title || 60; if (S.f >= t && S.f < t + 6) m.press(KEY.RETURN); return; }
    if (mode === 'menu') { if (S.f >= 10 && S.f < 16) m.press(KEY[G().menu]); return; }
    if (mode === 'wait') { if (m.frames - S.pass < 5) S.mode = 'play'; return; }
    // play: D and P at their passes, a key where the game has waited long, else the controls
    if (S.d >= 0) { if (S.d-- > 0) m.press(KEY.D); return; }
    if (S.p !== undefined) {
      const f = S.f - S.p;
      if (f < 4 || (f >= 40 && f < 44)) m.press(KEY.P);
      if (f < 60) return;
      S.p = undefined;
    }
    if (m.frames - S.pass > 400) {                         // a wait for a key (the 25th vitamin): one
      if ((m.frames - S.pass) % 60 < 4) m.press(KEY.SPACE);
      return;
    }
    if (S.hold-- <= 0) { S.stick = STICK[rnd(STICK.length)]; S.key = rnd(5) ? KEYS[rnd(4)] : null; S.shift = !rnd(4); S.hold = 4 + rnd(40); }
    if (m.ram[T.keyboard] === 0) { m.joy = S.stick; return; }
    if (S.key) m.press(KEY[S.key]);
    if (S.shift) m.press(KEY.SHIFT);
  }
  // a place in room r with room for his block: the room drawn by the port on a copy of memory, and a
  // block of 2 by 3 blank cells chosen at random, or, if near, the one nearest the room's vitamin
  function place(M, r, near) {
    const P = lib.makePort(M.slice(), { read: () => 0xFF, write() {}, sei() {}, cli() {} });
    P.M[T.room + P.M[T.player]] = r;
    P.clear_play_area(); P.draw_room();
    const ok = [];
    for (let row = 1; row < 15; row++) for (let col = 1; col < 37; col++) {
      const a = 0x0C00 + 40 * row + col;
      // the block blank, and something under it to stand on
      if ([0, 1, 40, 41, 80, 81].every(d => P.M[a + d] === 0xD6) && P.M[a + 120] !== 0xD6 && P.M[a + 121] !== 0xD6) ok.push(a);
    }
    if (!ok.length) return 0x0C52;
    if (!near) return ok[rnd(ok.length)];
    const v = P.M[T.vitamin_lo] | P.M[T.vitamin_lo + 1] << 8, d = a => Math.abs(a % 40 - v % 40) + 3 * Math.abs(Math.floor(a / 40) - Math.floor(v / 40));
    return ok.reduce((b, a) => d(a) < d(b) ? a : b);
  }
  function onPass(n, m, M2) {
    S.pass = m.frames;
    if (S.mode !== 'play' && S.mode !== 'wait') return;
    S.passes++;
    const g = G(), set = (a, v) => { m.ram[a] = v; if (M2) M2[a] = v; };
    if (S.passes === 1) for (const k of Object.keys(POKES)) { const [a, game, poke] = POKES[k]; set(a, g.pokes.includes(k) ? poke : game); }
    S.rooms.add(m.ram[T.room + m.ram[T.player]]);
    if (g.pause === S.passes) S.p = S.f;
    if (g.d === S.passes) S.d = 4;
    if (S.passes === 1) S.drained = S.refilled = false;
    if (g.nine && S.passes === 1) for (const a of [0x0F10, 0x0F60]) set(a, 0x2E);
    if (g.drain && S.passes >= g.drain && !S.drained && m.ram[T.energy_mode] === 1) { set(T.bar_pos, 0); set(T.egy_bar, 0x70); S.drained = true; }
    if (g.refill && S.passes >= g.refill && !S.refilled && m.ram[T.energy_mode] !== 1) {
      set(T.bar_pos, 28); for (let c = 28; c < 34; c++) set(T.egy_bar + c, 0x71);
      S.refilled = true;
    }
    if (g.clock === S.passes) {                            // 3, 9, 9: the hundreds, tens and units
      const b = 0x0EFE + (m.ram[T.player] ? 0x50 : 0);
      set(b, 0x28); set(b + 3, 0x2E); set(b + 5, 0x2E);
    }
    if (g.end && S.passes >= g.end && (S.passes - g.end) % 40 === 0) {
      set(POKES.lives[0], POKES.lives[1]); set(T.lives + m.ram[T.player], 1); S.d = 4;
      return;
    }
    if (g.rooms && S.passes % g.rooms === 0) {
      S.room = (S.room + 1) % 25;
      const a = place(m.ram, S.room, g.near);
      for (const p of [0, 1]) {
        set(T.room + p, S.room); set(T.saved_ptr_lo + p, a & 0xFF); set(T.saved_ptr_hi + p, a >> 8);
        set(T.saved_x + p, 0); set(T.saved_y + p, 0);
      }
      S.d = 4;
    }
  }
  const hooks = m => ({ 0x3225: () => { S.title = m.frames; return false; }, 0x323A: () => { S.menu = m.frames; return false; },
    0x312E: () => { input(m); return false; } });
  return { input, onPass, hooks, S };
}

// The game at entry, as the tape hands over: the stack where the BASIC line's SYS leaves it.
function machine(ram) {
  const m = new Machine({ ram, pc: ENTRY, passAt: PASS });
  m.cpu.sp = 0xF6;
  Object.assign(m.hooks, kernalHooks(m));
  return m;
}

function run(o = {}) {
  const frames = o.frames || 6000;
  const ram = lib.boot();
  const m = machine(ram);
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
      console.log('frame', mm.frames, 'pass', n, 'game', S.game, 'room', mm.ram[T.room + mm.ram[T.player]], 'lives', mm.ram[T.lives], mm.ram[T.lives + 1]);
    }
  } });
  console.log(describe(r.res), '(' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)', 'rooms seen', [...r.S.rooms].sort((a, b) => a - b).join(' '));
  if (!r.res.ok) process.exitCode = 1;
}
module.exports = { run, player, machine, CHECKPOINTS, IRQS, PASS, ENTRY, POKES };
