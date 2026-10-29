#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/mom-port.js) against the game's own code, in
// the kit's lockstep (kit/c64/lockstep.js), and the Play tab's clock and chips (reference/mom-play.js)
// against the kit's machine. The game runs on the kit's C64 from the memory the page starts from
// (MoMPort.memory: the committed listing's bytes with what the game changes put back as the file
// loads it), started at the game's first instruction, $07F9, with the KERNAL banked in as the game
// keeps it. Its interrupts come in through the KERNAL's entry and the vector at $0314. The few ROM
// routines the game calls are MoMPort.ROM on both sides: the screen clear, BASIC's RAM set-up,
// CHROUT, and the KERNAL's interrupt work at $EA31 with its keyboard scan; random_byte's three ROM
// tables are the values the page carries. The machine finds the sprite collisions with the kit's
// model of them (machine.js's collide option, site/lib/collide.js), the one the Play tab uses, and
// counts CIA 1's timer A as the KERNAL leaves it. Each pass is one round of the world, $08CC. At
// the start of every pass all of RAM is compared but the stack page and random_byte's save of its
// caller's X and Y ($0385-$0386, registers the port does not keep), and so are colour RAM, the
// registers written to the video chip and the SID, and CIA 1's ports.
//
// One run, from the cold start, in four parts:
// 1. the title and the whole story scroller, and the demonstration it starts, to its end: the
//    game's own recording, which the kit's machine plays as VICE did;
// 2. a player: fire on the title, B on the controls page for the five instruction pages, then games
//    in which the player picks verbs from the menus, the ones it has picked least most often, runs in
//    random directions with the stick and the keys (H, B, SHIFT, the Commodore key), stops with fire
//    or SPACE, and turns the music off with M for a while and on again. Now and then, at the start
//    of a pass and on both sides at once, an object (the backpack and the potions most often) or a
//    creature is brought to the player's cell, or the player is put on a door's; the backpack or a
//    potion, when it is brought while the player stands still, the player picks up. After the first
//    half of the play the amulet is put in the player's hand on the pedestal's cell, and the player
//    puts it down, for the win; if no creature has killed the player by the end of the second half
//    and every verb has been chosen, his body strength is set to 0 and a creature brought to his
//    cell. Part 2 ends at the title after the win, a death and every verb. Each game over waits for
//    fire;
// 3. CTRL and R on the title, and a game recorded as the player plays it, ended by F; its game over
//    is left to time out (its count moved near its end, on both sides);
// 4. the story run on to its end (its pointer moved near the end, on both sides), and the recording
//    just made played back as the demonstration, to its end mark.
// Then the Play tab's clock and chips run the port from the cold start with no input, as the page
// does, to the demonstration's end: every pass of the demonstration must leave the game's state as
// the machine's did, and the frame each pass begins in is compared with the machine's.
//   node games/c64/master-of-magic/test_play.js [passes] [--cost]
// passes is the length of each half of part 2's play (default 1,500). With
// --cost it also measures the Play tab's pacing and writes it into reference/mom-play.js (COST): the
// game's own cycles for each stretch between two of the port's checkpoints with no polling in it,
// fitted by non-negative least squares over the work the port says it did there (P.tally) and a
// constant for each stretch, and checked on the stretches it was not fitted on; and each kind of
// interrupt's own cycles (MoMPlay.bandOf). The machine then runs without the video chip's cycles,
// which the page takes as the machine does.
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const fs = require('fs');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
g.run('reference/mom-music.js', 'mom-music', 'MoMMusic');
const { MoMPort } = g.run('reference/mom-port.js', 'mom-port', 'MoMPort');
const { MoMPlay } = g.run('reference/mom-play.js', 'mom-play', 'MoMPlay');
const { C64Collide } = globalThis;                    // site/lib/collide.js, as machine.js loads it
const IMG = JSON.parse(/window\.MOM_PLAY = (\{.*?\});\n/.exec(g.read('play.html'))[1]);
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), costFile = costAt >= 0 ? (args.splice(costAt, 1), path.join(__dirname, 'reference/mom-play.js')) : null;
const HALF = +args[0] || 1500;
const ROM = MoMPort.ROM;
const K = { R: 0x11, F: 0x15, B: 0x1C, H: 0x1D, M: 0x24, CTRL: 0x3A, SPACE: 0x3C, SHIFT: 0x0F, CBM: 0x3D };

// The game's machine. The ROM routines are the port's stand-ins (MoMPort.ROM), at the cycles given
// here, which the page takes as measured. The interrupt line is held for as long as a source holds
// it: the title's handler returns without reading $DC0D when CIA 1's timer has come, and is taken
// again at once, as on a C64, until the scroller's half reads it.
class MoMMachine extends Machine {
  constructor(o) { super(Object.assign({ collide: true, cia: true }, o)); this.setup(); }
  setup() {
    const self = this;
    const io = { colourWrite: (i, v) => { self.colour[i & 0x3FF] = v & 15; }, ciaWrite: (r, v) => self.ioWrite(0xDC00 + r, v), ciaRead: (r) => self.ioRead(0xDC00 + r) };
    this.hooks[0xE544] = (c) => { ROM.clearScreen(c.m, io); c.cycles += 2000; c.rts(); };
    this.hooks[0xE3BF] = (c) => { ROM.basicInit(c.m); c.cycles += 300; c.rts(); };
    this.hooks[0xFFD2] = (c) => { ROM.chrout(c.m, io, c.a); c.cycles += 60; c.rts(); };
    this.hooks[0xEA31] = (c) => { const held = ROM.irq(c.m, io); c.cycles += held ? 1400 : 400; self.leave(22); };
    // the three ROM reads of random_byte ($2BAA-$2BB3), from the values the page carries
    this.hooks[0x2BAA] = (c) => {
      const i = c.x, j = c.y, k = (j + 3 * i) & 0xFF;
      let v;
      if (k === 0) v = IMG.rngCycle0[(i - 0xF8) & 0xFF]; else if (k === 191) v = IMG.rngCycle191[(i - 0x07) & 0xFF];
      else throw new Error('random state $' + i.toString(16) + ' $' + j.toString(16) + ' is on neither cycle');
      c.a = v; c.n = v >> 7; c.z = v === 0 ? 1 : 0; c.cycles += 14; c.pc = 0x2BB4;
    };
    // CIA 1's timer A as the KERNAL leaves it: $4025, continuous, its interrupt on; the video chip and
    // CIA 2 as the KERNAL leaves them
    const t = this.cia[0]; t.lat[0] = 0x4025; t.cnt[0] = 0x4025; t.cr[0] = 0x01; t.mask = 0x01;
    Object.assign(this.vic, { 0x11: 0x1B, 0x16: 0xC8, 0x18: 0x15, 0x20: 0x0E, 0x21: 0x06 });
    this.pra2 = 0x97; this.ddra2 = 0x3F;
  }
}
const m = new MoMMachine({ ram: MoMPort.memory(g.listing().ram, IMG), pc: 0x07F9, passAt: 0x08CC, dma: !costFile });
const R = m.ram;
const P = MoMPort.create(new Uint8Array(65536), {}, IMG);

// ---- what the game does, seen on its side
const seen = { titles: 0, controls: 0, instructions: 0, games: 0, recorded: 0, replayed: 0, wins: 0, deaths: 0, ends: 0, timeouts: 0,
  footsteps: 0, toggles: 0, endMark: 0, replayEnd: 0, verbs: {} };
let screen = 'start', screenAt = 0, menu = null, mainNext = false, inDemo = 0;
const hook = (a, fn) => { const prev = m.hooks[a]; m.hooks[a] = (c) => { fn(c); return prev ? prev(c) : false; }; };
const show = (s) => { screen = s; screenAt = m.frames; press = 0; };
hook(0x5B27, () => { seen.titles++; show('title'); });
hook(0x5C78, () => { seen.controls++; show('controls'); });
hook(0x5C92, () => { seen.instructions++; show('instructions'); });
hook(0x0924, () => {
  seen.games++; show('game'); inDemo = R[0x3D3]; gameP = 0;
  if (inDemo === 1) seen.recorded++;
  if (inDemo === 2 && part === 4) seen.replayed++;
});
hook(0x0851, () => {
  show('over');
  if (inDemo === 2) return;
  if (R[0x3C7] === 0x7B) { seen.wins++; wantWin = false; } else if (R[0x4EC5] & 0x80) seen.deaths++; else seen.ends++;
});
hook(0x08A7, () => { if (inDemo !== 2) seen.timeouts++; });
hook(0x277D, () => { seen.footsteps++; });
hook(0x0CA4, () => { seen.toggles++; });
hook(0x17B3, () => { seen.endMark++; });
hook(0x18BE, () => { if (part === 4) seen.replayEnd++; });
hook(0x11A2, () => { mainNext = true; });
hook(0x1320, () => { menu = { count: R[0x397], main: mainNext, target: -1, t: 0 }; mainNext = false; });
hook(0x1479, () => { menu = null; stopping = 0; runFor = 60 + rnd(400); });
const everyVerb = () => Object.values(VERBS).every((v) => seen.verbs[v]);
const VERBS = { 0x08B9: 'RUN', 0x195C: 'PICK UP', 0x1AED: 'PUT DOWN', 0x1A30: 'INVENTORY', 0x1B9D: 'OPEN', 0x1C31: 'CLOSE', 0x1D00: 'WEAR',
  0x1D8B: 'TAKE OFF', 0x1E21: 'PUT IN', 0x1F15: 'TAKE OUT', 0x1FCB: 'LOOK IN', 0x29FC: 'ATTACK', 0x20A5: 'SWAP', 0x2CD4: 'EXAMINE',
  0x2D5E: 'DRINK', 0x2E23: 'CAST', 0x2F22: 'UNCAST' };
for (const [a, name] of Object.entries(VERBS)) hook(+a, () => { if (inDemo !== 2) seen.verbs[name] = (seen.verbs[name] || 0) + 1; });

// ---- the input, from a fixed seed
let seed = 0x3D9;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
let part = 1, press = 0, gameP = 0, partP = 0, runFor = 200, stopping = 0, held = { joy: 0, key: -1, left: 0 };
let wantWin = false, wantPick = -1, won = false, instructed = false, verb = -1;
const picked = {};
// a whole press of fire: four frames down, eight up
const firePress = () => (press++ % 12 < 4 ? FIRE : 0);
// the menu: let fire go, steer the cursor ($0399) to the slot chosen, press fire, and again every
// 40 frames until the menu has gone
function inMenu() {
  if (menu.target < 0) {
    const vals = Array.from(R.subarray(0x41C8, 0x41C8 + menu.count));
    let want = -1;
    if (wantWin) want = vals.indexOf(menu.main ? 3 : 0x15);                  // PUT DOWN, then the amulet
    else if (wantPick >= 0) want = vals.indexOf(menu.main ? 2 : wantPick);   // PICK UP, then what was brought
    else if (!menu.main && verb === 16 && rnd(2)) want = vals.indexOf(2);    // CAST: the shield, which lasts
    if (want < 0 && menu.main) {
      if (rnd(4) === 0) want = rnd(menu.count);
      else for (let i = 0; i < vals.length; i++) if (want < 0 || (picked[vals[i]] || 0) < (picked[vals[want]] || 0)) want = i;
    }
    menu.target = want >= 0 ? want : rnd(menu.count);
    if (menu.main) { verb = vals[menu.target]; picked[verb] = (picked[verb] || 0) + 1; } else wantPick = -1;
  }
  if (menu.t++ < 8) return 0;
  const c = R[0x399];
  if (c < menu.target) return RIGHT;
  if (c > menu.target) return LEFT;
  return (menu.t - 8) % 40 < 4 ? FIRE : 0;
}
// on the move: a direction or a key held for a while; then fire or SPACE until a menu comes, let
// go now and then. M as well when the music is not as the game wants it: off from its 50th pass
// to its HALFth, for the footsteps
function running(keys) {
  if (stopping) {
    if (stopping++ % 170 > 150) return 0;
    if (held.key === K.SPACE) { keys.push(K.SPACE); return 0; }
    return FIRE;
  }
  if (held.left-- <= 0) {
    const r = rnd(100);
    held = { joy: [UP, DOWN, LEFT, RIGHT, UP | LEFT, UP | RIGHT, DOWN | LEFT, DOWN | RIGHT, 0][rnd(9)], key: -1, left: 10 + rnd(60) };
    if (r < 10) held = { joy: 0, key: [K.H, K.B, K.SHIFT, K.CBM][rnd(4)], left: 10 + rnd(40) };
    else if (r < 14) held = { joy: 0, key: K.M, left: 4 };
  }
  const music = part !== 2 || partP < 50 || partP > HALF ? 1 : 0;
  if (R[0x3D1] !== music && held.key !== K.M && rnd(20) === 0) held = { joy: 0, key: K.M, left: 4 };
  if (held.key >= 0) keys.push(held.key);
  if (--runFor <= 0) { stopping = 1; held = { joy: 0, key: rnd(3) ? -1 : K.SPACE, left: 0 }; }
  return held.joy;
}
function onFrame() {
  m.keys.clear();
  const keys = [], t = m.frames - screenAt;
  let joy = 0;
  if (screen === 'title') {
    if (part === 2 && t > 40) joy = firePress();
    if (part === 3 && t > 40 && t < 52) keys.push(K.CTRL, K.R);
  } else if (screen === 'controls') {
    if (!instructed && t > 20 && t < 30) keys.push(K.B);
    else if (instructed && t > 20) joy = firePress();
  } else if (screen === 'instructions') {
    instructed = true;
    if (t > 20) joy = firePress();
  } else if (screen === 'over') {
    if (part === 2 && t > 150) joy = firePress();
  } else if (screen === 'game' && inDemo !== 2) {
    if (part === 3 && gameP > 260) keys.push(K.F);
    else if (menu) joy = inMenu();
    else joy = running(keys);
  }
  for (const k of keys) m.keys.add(k);
  m.joy = 0x1F & ~joy;
}
// on both sides at once
function poke(a, vs) { vs.forEach((v, i) => { R[a + i] = v; P.M[a + i] = v; }); }
const onMap = (x) => R[0x3FB0 + x] >= 0x90 && R[0x3FB0 + x] <= 0x9F;
function toPlayer(x) { poke(0x3F70 + x, [R[0x3F70]]); poke(0x3FB0 + x, [R[0x3FB0]]); poke(0x40B0 + x, [0xFF]); }
const alive = (x) => !(R[0x4EC5 + x] & 0x80);
// at the start of a pass of a game the player plays
function onPass() {
  if (part === 1 && screen === 'game' && R[0x3D3] === 2) demo.push({ s: state(R), frame: m.frames });
  if (screen !== 'game' || inDemo === 2) return;
  gameP++; partP++;
  if (part !== 2) return;
  if (rnd(100) === 0) {                                                                    // an object to the player's cell:
    const x = rnd(2) ? [7, 11, 12, 13, 14, 15][rnd(6)] : 1 + rnd(32);                     // the backpack and the potions often
    if (onMap(x)) toPlayer(x);
  }
  if (rnd(250) === 0) { const x = 0x21 + rnd(31); if (onMap(x) && alive(x)) toPlayer(x); }  // a creature
  if (R[0x3AF] > 1 && !wantWin && wantPick < 0 && rnd(200) === 0) {                      // the backpack or a potion, to pick up
    const x = rnd(2) ? 7 : 11 + rnd(5);
    if (onMap(x)) { toPlayer(x); wantPick = x; }
  }
  if (R[0x3AF] > 1 && rnd(150) === 0) {                                                   // the player to a door
    const doors = [];
    for (let a = 0x9000; a < 0xA000; a++) if (R[a] >= 0xF0) doors.push(a);
    const a = doors[rnd(doors.length)];
    poke(0x3F70, [a & 0xFF]); poke(0x3FB0, [a >> 8]); poke(0x3FF0, [4]); poke(0x4030, [4]); poke(0x038B, [1]);
  }
  if (!won && partP > HALF && R[0x3AF] > 1) {                                               // the amulet, on the pedestal
    won = wantWin = true;
    poke(0x3F85, [0]); poke(0x3FC5, [0]); poke(0x4C01, [0x15]);
    poke(0x3F70, [0x77]); poke(0x3FB0, [0x96]); poke(0x3FF0, [4]); poke(0x4030, [4]); poke(0x038B, [1]);
  }
  if (seen.wins && !seen.deaths && everyVerb() && partP > 2 * HALF && partP % 100 === 0) {   // a death, if none has come
    poke(0x4EC5, [0]);
    for (let x = 0x21; x < 0x40; x++) if (onMap(x) && alive(x) && R[0x4D89 + x] >= 8) { toPlayer(x); break; }
  }
}

// ---- the lockstep
let tallies = {};
P.tally = (k, n) => { if (!ls.replaying) tallies[k] = (tallies[k] || 0) + n; };
// the pacing's measurements: of the stretches with no polling, every other one to fit on and the
// rest to check, as its kind (the stretch and the port's tallies in it) and the game's cycles; and
// the interrupts' cycles by bandOf
const fit = { train: new Map(), test: new Map(), n: 0 }, bands = {};
function measured(t) {
  if (t.polls === 0) {
    const key = MoMPlay.stretch(t.from, t.to), sig = key + '|' + Object.entries(tallies).sort().map(([k, n]) => k + ':' + n).join(',');
    const into = fit.n++ % 2 ? fit.test : fit.train;
    let gr = into.get(sig);
    if (!gr) into.set(sig, gr = { key, tallies, sum: 0, n: 0, cycles: [] });
    gr.sum += t.cycles - t.estimate; gr.n++;
    if (into === fit.test) gr.cycles.push(t.cycles - t.estimate);
  }
  tallies = {};
}
if (costFile) {
  const band = [];
  m.onInterrupt = () => { band.push(MoMPlay.bandOf(R, m.latch & 1, m.keys.size > 0)); };
  m.onReturn = (mm, v, n) => { const k = band.pop(), b = bands[k] = bands[k] || [0, 0]; b[0] += n; b[1]++; };
}
const ls = new Lockstep({
  machine: m, port: P, program: (p) => p.program(), checkpoints: MoMPort.CHECKPOINTS,
  irqs: { 0x2653: 'play_irq', 0x5D08: 'title_irq', 0xEA31: 'kernal_irq' },
  chips: ['colour', 'vic', 'sid', 'cia'], ignore: [[0x0385, 0x0386]], maxFrames: 2000,
  timing: costFile ? measured : () => { tallies = {}; },
});

// The game's state at a pass's start, for the page's check: what the main program keeps, less what
// the interrupt writes ($03A0-$03A1 its frame count, $03B7 its band, $038D the collisions it copies)
// and random_byte's save ($0385-$0386)
const KEEP = [[0x0380, 0x0384], [0x0387, 0x038C], [0x038E, 0x039F], [0x03A2, 0x03B6], [0x03B8, 0x03DB], [0x0400, 0x07E7], [0x3A00, 0x3A3D],
  [0x3D45, 0x5B26], [0x9000, 0x9FFF], [0xA540, 0xA7FF]];
const state = (M) => Buffer.concat(KEEP.map(([a, b]) => Buffer.from(M.subarray(a, b + 1))));
function where(i) { for (const [a, b] of KEEP) { if (i <= b - a) return a + i; i -= b - a + 1; } return -1; }
const demo = [];
let t0 = Date.now(), ok = true;
function runPart(n, label, until, each) {
  part = n; screenAt = m.frames;
  const stop = () => { if (until()) ls.stopped = true; };
  const r = ls.run({
    passes: 1e9,
    onPass: () => { onPass(); stop(); },
    onFrame: (f, mm, l) => { onFrame(); if (each) each(l); stop(); },
  });
  console.log(label + ': ' + describe(r).split('\n').join('; ') + ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  t0 = Date.now();
  ok = ok && r.ok;
}
// 1. the story and the demonstration, to the title after it
runPart(1, 'the story and the demonstration', () => seen.titles >= 2);
// 2. a player, a win and a death, and back to the title
if (ok) runPart(2, 'the instructions and a player', () => (seen.wins && seen.deaths && everyVerb() && screen === 'title') || partP > 20 * HALF);
// 3. a recorded game, ended by F, and its game over left to time out
let counted = false;
if (ok) runPart(3, 'a recorded game, timed out', () => seen.timeouts && screen === 'title', (l) => {
  if (screen === 'over' && !counted && l.matched && l.at === 0x088B) { counted = true; poke(0x038E, [0xFF]); poke(0x038F, [0x09]); }
});
// 4. the story to its end, and the recording played back
let moved = false;
if (ok) runPart(4, 'the recording played back', () => seen.replayed && screen === 'title', (l) => {
  if (screen === 'title' && !moved && l.matched && l.at === 0x5BBA) { moved = true; poke(0x5E4C, [0x50, 0x83]); }
});
const verbs = Object.values(VERBS);
console.log('seen: ' + Object.entries(seen).filter(([k]) => k !== 'verbs').map(([k, v]) => k + ' ' + v).join(', ') +
  '; verbs: ' + verbs.map((v) => v + ' ' + (seen.verbs[v] || 0)).join(', '));
if (ok) {
  const never = verbs.filter((v) => !seen.verbs[v]);
  if (never.length) { console.log('FAIL the player never chose ' + never.join(', ')); ok = false; }
  for (const [k, what] of [['instructions', 'the instruction pages'], ['wins', 'the win'], ['deaths', 'a death'], ['footsteps', 'a footstep'],
    ['toggles', 'the M key'], ['recorded', 'a recording'], ['endMark', 'F, the recording\'s end'], ['timeouts', 'the game over\'s time-out'],
    ['replayed', 'the recording played back'], ['replayEnd', 'the recording\'s end mark played back']]) {
    if (!seen[k]) { console.log('FAIL the run never reached ' + what); ok = false; }
  }
}

// ---- the Play tab's clock and chips, from the cold start, against the machine's demonstration
if (ok && !costFile) {
  const t1 = Date.now(), page = [];
  let bad = null;
  const S = MoMPlay.create({ M: MoMPort.memory(g.listing().ram, IMG), Port: MoMPort, Collide: C64Collide, IMG, onCheckpoint: (a, clock) => {
    if (a !== 0x08CC || bad || S.M[0x3D3] !== 2 || page.length >= demo.length) return;
    const s = state(S.M), d = demo[page.length];
    page.push(Math.floor(clock / MoMPlay.FRAME));
    if (!s.equals(d.s)) { let i = 0; while (s[i] === d.s[i]) i++; bad = { pass: page.length - 1, at: where(i), page: s[i], game: d.s[i] }; }
  } });
  for (let f = 1; page.length < demo.length && f < 60000 && !bad; f++) S.run(f * MoMPlay.FRAME);
  const d0 = demo[0].frame, p0 = page[0], n = page.length - 1, span = demo[demo.length - 1].frame - d0;
  let worst = 0;
  for (let i = 0; i <= n; i++) { const d = (page[i] - p0) - (demo[i].frame - d0); if (Math.abs(d) > Math.abs(worst)) worst = d; }
  const late = n >= 0 ? (page[n] - p0) - (demo[n].frame - d0) : 0;
  console.log(`the Play tab's machine: ${page.length} of the demonstration's ${demo.length} passes` +
    (bad ? `; pass ${bad.pass} differs at $${bad.at.toString(16).toUpperCase()} (the page $${bad.page.toString(16)}, the game $${bad.game.toString(16)})` : ', every one as the machine left it') +
    `; the first began in frame ${p0} (the machine's ${d0}), and the last ${late >= 0 ? late + ' frames later' : -late + ' frames sooner'} than the machine's after it ` +
    `(${(100 * late / span).toFixed(2)} % of ${span} frames; ${worst} at most on the way) (${((Date.now() - t1) / 1000).toFixed(0)} s)`);
  if (bad || page.length < demo.length) ok = false;
  else if (Math.abs(p0 - d0) > 0.005 * d0) { console.log('FAIL the Play tab\'s story runs more than 0.5 % off the machine\'s'); ok = false; }
  else if (Math.abs(late) > 0.005 * span) { console.log('FAIL the Play tab runs the demonstration more than 0.5 % off the machine\'s pace'); ok = false; }
}

// ---- the pacing (--cost): non-negative least squares, by coordinate descent, over the fitting
// stretches, each kind once with its count; checked on the rest
function fitCost() {
  const vars = new Map(), vi = (k) => { if (!vars.has(k)) vars.set(k, vars.size); return vars.get(k); };
  const feats = (gr) => [[vi('@' + gr.key), 1], ...Object.entries(gr.tallies).map(([k, n]) => [vi(k), n])];
  const rows = [...fit.train.values()].map((gr) => ({ f: feats(gr), sum: gr.sum, n: gr.n }));
  const N = vars.size, A = new Float64Array(N * N), b = new Float64Array(N), x = new Float64Array(N);
  for (const r of rows) for (const [i, a] of r.f) { b[i] += a * r.sum; for (const [j, c] of r.f) A[i * N + j] += a * c * r.n; }
  for (let it = 0; it < 50000; it++) {
    let change = 0;
    for (let j = 0; j < N; j++) {
      const d = A[j * N + j];
      if (!d) continue;
      let gj = -b[j];
      for (let k = 0; k < N; k++) gj += A[j * N + k] * x[k];
      const nx = Math.max(0, x[j] - gj / d);
      change = Math.max(change, Math.abs(nx - x[j]));
      x[j] = nx;
    }
    if (change < 1e-4) break;
  }
  const cost = {}, y = {}, irq = {};
  for (const [k, i] of vars) {
    const v = Math.round(x[i] * 10) / 10;
    if (v) { if (k[0] === '@') y[k.slice(1)] = v; else cost[k] = v; }
  }
  for (const [k, [t, n]] of Object.entries(bands).sort()) irq[k] = Math.round(t / n);
  cost['@yield'] = y; cost['@irq'] = irq;
  const est = (gr) => (y[gr.key] || 0) + Object.entries(gr.tallies).reduce((t, [k, n]) => t + (cost[k] || 0) * n, 0);
  const fitted = new Set([...fit.train.values()].map((gr) => gr.key));
  let game = 0, model = 0, unseen = 0;
  const err = [];
  for (const gr of fit.test.values()) {
    const e = est(gr);
    if (!fitted.has(gr.key)) unseen += gr.n;
    for (const c of gr.cycles) { game += c; model += e; err.push(e - c); }
  }
  err.sort((a, c) => a - c);
  console.log(`fitted on ${fit.n - err.length} stretches, checked on ${err.length}: the game's work ${game} cycles, the cost charged ${Math.round(model)} ` +
    `(${(100 * (model - game) / game).toFixed(2)} %); a stretch's error ${Math.round(err[Math.floor(err.length * 0.01)])} to ${Math.round(err[Math.floor(err.length * 0.99)])} cycles for 98 % of them` +
    (unseen ? `; ${unseen} of them of stretches never fitted` : ''));
  return cost;
}
if (costFile && ok) {
  const cost = fitCost(), src = fs.readFileSync(costFile, 'utf8'), line = /^  const COST = .*;$/m;
  if (!line.test(src)) throw new Error('reference/mom-play.js has no line const COST = ...;');
  fs.writeFileSync(costFile, src.replace(line, () => '  const COST = ' + JSON.stringify(cost) + ';'));
  console.log('the costs written to reference/mom-play.js');
}
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
