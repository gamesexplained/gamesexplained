#!/usr/bin/env node
// Hold the Play tab's port of the whole game against the game's own code, pass by pass, in the
// kit's lockstep (kit/c64/lockstep.js). Both start where the page does, where the loader hands
// over ($4460), with the game's 64 KB from the committed listing: the game on the kit's C64
// (kit/c64/machine.js), the port as the page's blocks build it (BBPort.makePort, its program from
// 'start'), with its three raster interrupts and the bytes they keep that the main program reads.
// At the start of every pass of the main loop ($0A07) all of RAM is compared, and colour RAM and
// the registers written to the video chip and the SID, except $15-$17, where the interrupt saves
// the interrupted code's registers, which the port has not got.
//
// The game's own race (the Play tab, "Where the original depends on its interrupt"): the actors
// run in the raster interrupt at line 50 every other frame, and on the C64 it can cut the bubble
// loop between any two instructions, where the port runs it between two routines. A pass that
// differs after the interrupt with the actors cut the bubble loop (a JSR of draw_objects,
// push_bubbles, move_bubbles or age_objects on the stack) is counted as that race, and the port is
// given the game's memory there; any other difference, or the two falling out of step, fails it.
//
// The input: fire on the title page, 1 on the score table, then a joystick for player 1 that
// changes at random every few passes, with fire pressed now and then, until the game is over; and
// round again.
//   node games/c64/bubble-bobble/test_play.js [passes]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the blocks hand over on window
for (const b of ['core', 'chips', 'actors', 'ai', 'items', 'objects', 'round', 'screen', 'flow'])
  g.run('play.html', `port/src/${b}.js`, 'BBGroups');
const { BBPort } = globalThis;
const PASSES = +process.argv[2] || 2500;

const image = g.listing().ram;
const m = new Machine({ ram: image.slice(), pc: 0x4460, passAt: 0x0A07 });
const P = BBPort.makePort(new Uint8Array(65536), {});
const ls = new Lockstep({
  machine: m, port: P, program: P => P.program('start'), passAt: 0x0A07,
  checkpoints: P.CHECKPOINTS, irqs: P.IRQS, irqBytes: P.IRQ_BYTES,
  ignore: [[0x15, 0x17]], chips: ['colour', 'vic', 'sid'], maxFrames: 3000,
});

// The race: the actors' interrupt ($072E with update_actors in, $077C not a JMP) taken while
// a JSR of the bubble loop is on the stack (its return address, the JSR's address + 2)
const BUBBLE_LOOP = new Set([0x0A48, 0x0A4B, 0x0A4E, 0x0A51].map(a => a + 2));
const races = new Set();
let pass = 0;
m.onInterrupt = (mm, v) => {
  const R = m.ram;
  if (v === 0xFFFE && (R[0xFFFE] | R[0xFFFF] << 8) === 0x072E && R[0x077C] !== 0x4C) {
    for (let s = m.cpu.sp + 1; s < 0xFF; s++) {
      if (BUBBLE_LOOP.has(R[0x100 + s] | R[0x101 + s] << 8)) { races.add(pass); break; }
    }
  }
};

// the input
let seed = 0x9E3779B9, joy = 0x1F, games = 0, lastPass = -1;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const STICK = [0x1F, 0x1B, 0x17, 0x1E, 0x1A, 0x16];              // none, left, right, up (jump), up-left, up-right
function onFrame(f) {
  if (lastPass >= 0 && f - lastPass < 100) return;                // in play: the stick is set at each pass
  // out of play, on the title page or the score table: fire, then 1, each held a few frames in turn
  m.keys.clear();
  m.joy = 0x1F;
  const t = f % 200;
  if (t < 6) m.joy = 0x0F;
  else if (t >= 100 && t < 106) m.keys.add(KEY['1']);
}
function onPass(n) {
  pass = n;
  if (lastPass < 0 || m.frames - lastPass >= 100) games++;          // the first pass of a game
  lastPass = m.frames;
  m.keys.clear();
  if (rnd(6) === 0) joy = STICK[rnd(STICK.length)] & (rnd(3) ? 0x1F : 0x0F);
  m.joy = joy;
}
const r = ls.run({ passes: PASSES, onPass, onFrame, stopOnDiff: false });
// A pass after the race, or the pass after one that differed by it (the bubbles drawn into the other
// buffer), is the race; the lockstep gave the port the game's memory there and went on. The page
// measured it in 879 of 52,309 passes; here more than 3 % would be a sign of something else.
let raced = 0, bad = 0, lastRace = -9;
for (const d of r.diffs) {
  if (races.has(d.pass - 1) || d.pass - lastRace <= 2) { raced++; lastRace = d.pass; }
  else { bad++; console.log(describe({ ...r, diffs: [d], diverged: null })); }
}
if (r.diverged) console.log(describe({ ...r, diffs: [] }));
console.log(`${r.passes} passes from the hand-over, in ${games} game(s); ` +
            `${raced} pass(es) with the game's own race in the bubble loop, ${bad} other difference(s)`);
const ok = !r.diverged && !bad && raced <= r.passes * 0.03 && games > 1 && r.passes >= PASSES;
process.exit(ok ? 0 : 1);
