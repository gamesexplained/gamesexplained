#!/usr/bin/env node
// The Play tab's pace against the game's. The kit's C64 runs the game from the crackers' start-up
// ($080D) with the video chip taking its cycles (machine.js, dma), and the page's own machine
// (reference/jsw-play.js) runs the port from the same start on its clock. Both get the same input:
// on the title Return, a while after it shows; in play, at the start of each pass of the main loop
// ($30FF), a walk, a jump or a stand from one fixed list of the passes, and every 1,500 passes a drop
// into the same room on both sides, picked from the list as well. The frame each pass begins in is
// kept, on both sides.
//
// The game does not wait for the frame: a pass takes what its work takes, and the interrupt reads the
// keys once a frame. So the two play the same game for as long as their passes begin in the same
// frames; once one side's pass ends a raster line or so on the other side of a frame's start from the
// other's, the interrupt hands the main loop its keys a pass apart, the two part and play alike but
// not the same. What is held is the pace over the whole run: the frames a pass takes on average in
// plain play, within 1 %. Plain play leaves out the passes that span a room's build, a death, a game
// over or the title, which the two sides reach at different times, and each counts many plain passes'
// worth.
//   node games/c64/jet-set-willy/test_pace.js [frames]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const { JSWPort } = g.run('reference/jsw-port.js', 'jsw-port', 'JSWPort');
const { JSWPlay } = g.run('reference/jsw-play.js', 'jsw-play', 'JSWPlay');
const FRAMES = +process.argv[2] || 20000;

// the game's interrupts through the KERNAL and its sprite collisions, as test_play.js's machine
class JSWMachine extends Machine {
  constructor(o) {
    super(Object.assign({ collide: true }, o));
    this.hooks[0xFFD2] = (c) => { c.cycles += 40; c.rts(); };
  }
}

// The input, the same list on both sides: pass n of play takes act(n).
const UP = 1, LEFT = 4, RIGHT = 8, FIRE = 16;
const acts = [];
let seed = 0x1A55;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };
function act(n) {
  while (acts.length <= n) {
    const r = rnd(100), joy = r < 15 ? 0 : r < 40 ? LEFT : r < 65 ? RIGHT : r < 75 ? LEFT | FIRE : r < 85 ? RIGHT | FIRE : r < 95 ? FIRE : UP;
    for (let k = 6 + rnd(60); k > 0; k--) acts.push(joy & ~UP);
  }
  return acts[n];
}
const drops = [];
const drop = (k) => { while (drops.length <= k) drops.push(rnd(60)); return drops[k]; };

// one side: its memory, its joystick and keys, its frame count; on each pass at $30FF, `pass`
function side(M, set, frame) {
  const s = { passes: [], plain: 0, frames: 0, n: 0, wait: 0, odd: false, dropAt: 1500, drops: 0 };
  s.inGame = () => M[0x0315] === 0x33;
  s.onFrame = () => {
    if (s.inGame()) return;
    s.odd = true;                                                  // the title: Return 120 frames on
    if (++s.wait >= 120) set(0x1F, s.wait < 124 ? [KEY.RETURN] : []);
    else set(0x1F, []);
  };
  s.pass = () => {
    const f = frame();
    if (!s.inGame()) { s.odd = true; return; }
    s.wait = 0;
    if (s.n >= s.dropAt && M[0x33] === 0) {                        // a drop through the floor into a room
      M[0x1E] = drop(s.drops++); M[0x1C] = 0x70; M[0x33] = 2; M[0x51] = 0;
      s.dropAt += 1500;
    }
    set(0x1F & ~act(s.n++), []);
    if (s.last !== undefined && !s.odd) { s.frames += f - s.last; s.plain++; }
    s.passes.push(f);
    s.last = f; s.odd = false;
  };
  s.mark = () => { s.odd = true; };                                // a room's build, a death, a game over
  return s;
}

const m = new JSWMachine({ ram: g.listing().ram, pc: 0x080D, passAt: 0x30FF, dma: true });
const game1 = side(m.ram, (joy, keys) => { m.joy = joy; m.keys.clear(); for (const k of keys) m.keys.add(k); }, () => m.frames);
m.onPass = () => game1.pass();
for (const a of [0x2E07, 0x38EF, 0x383B]) { const prev = m.hooks[a]; m.hooks[a] = (c) => { game1.mark(); return prev ? prev(c) : false; }; }

let page = null;
const play = JSWPlay.create({ M: g.listing().ram, Port: JSWPort, Collide: globalThis.C64Collide, onCheckpoint: (a) => {
  if (a === 0x30FF) page.pass();
  else if (a === 0x2E07 || a === 0x38EF || a === 0x383B) page.mark();
} });
page = side(play.M, (joy, keys) => { play.joy = joy; play.keys.clear(); for (const k of keys) play.keys.add(k); }, () => play.frames);

for (let f = 0; f < FRAMES; f++) {
  game1.onFrame();
  m.runFrames(1);
  page.onFrame();
  play.run((f + 1) * JSWPlay.FRAME);
}
let same = Math.min(game1.passes.length, page.passes.length) - 1;
for (let k = 1; k <= same; k++) if (game1.passes[k] - game1.passes[k - 1] !== page.passes[k] - page.passes[k - 1]) { same = k - 1; break; }
const a = game1.frames / game1.plain, b = page.frames / page.plain, off = 100 * (b - a) / a;
console.log(`${FRAMES} frames: the game played ${game1.plain} plain passes of ${game1.n} in play, the page ${page.plain} of ${page.n}; ` +
  `a pass took ${a.toFixed(4)} frames on the game and ${b.toFixed(4)} on the page (${off >= 0 ? '+' : ''}${off.toFixed(2)} %); ` +
  `the first ${same} passes began in the same frames`);
const ok = Math.min(game1.plain, page.plain) > 1000 && Math.abs(off) <= 1;
console.log(ok ? 'the page keeps the game\'s pace' : 'the page does not keep the game\'s pace (1 %)');
process.exit(ok ? 0 : 1);
