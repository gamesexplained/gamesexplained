#!/usr/bin/env node
// Hold the Play tab's port of the whole game against the game's own code, pass by pass, in the
// kit's lockstep (kit/c64/lockstep.js). Both start where the page does: the game's 64 KB from the
// committed listing, the original disk's first message put back at $7009 as the page puts it, and
// the start-up at $7200, the hand-over from the loader. The game runs on the kit's C64
// (kit/c64/machine.js); the port is the page's block "the port", run as the page runs it (its
// start-up, then the main loop for ever), with its four raster interrupts. At the start of every
// pass all of RAM is compared, and colour RAM and the registers written to the video chip and the
// SID, except $B985-$B986, where sound_voice1 parks the X and Y it was given (the issue #79 run).
// A pass that differs only by the game's own race in the sky and ground fill is counted, and
// passes (below); any other difference, or the two falling out of step, fails it.
//
// The input, set at the start of each pass as a player's would be: nothing through the opening
// (the starfield, the planet and the descent, about 73 seconds), then on foot from the crash site
// a stick that changes at random every eighth pass or so, with fire let go.
//   node games/c64/mercenary/test_play.js [passes]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the port's script hands over as window.MERC_INSTALL
const { MERC_INSTALL } = g.run('play.html',
  "the port: Mercenary's routines, each a function on the game's memory M, named by the listing's label", 'MERC_INSTALL');
const ui = g.block('play.html', 'ui').text;
const ORIGINAL_7009 = /const ORIGINAL_7009 = \[([^\]]*)\]/.exec(ui)[1].split(',').map(Number);
const PASSES = +process.argv[2] || 3000;

const image = g.listing().ram;
ORIGINAL_7009.forEach((v, i) => { image[0x7009 + i] = v; });
const m = new Machine({ ram: image.slice(), pc: 0x7200, passAt: 0x855C });
const P = { M: new Uint8Array(65536), byAddress: {} };
for (const f of MERC_INSTALL) f(P);
P.RESTART = { restart: true };
P.work = { cyc: 0, px: 0, rows: 0, dots: 0, vf: 0, vb: 0, e: 0, ea: 0, v: 0, objs: 0 };   // the page's pace counters, which the port keeps
P.wait_raster = function* (line) { yield { wait: line }; };
function* program() {
  yield* P.startup();
  for (;;) {
    try { yield* P.main_loop(); }
    catch (e) { if (e && e.restart) continue; throw e; }
  }
}
// main_loop's checkpoints: every JSR it yields as one
const CHECKPOINTS = [...g.block('play.html', "the port: Mercenary's routines, each a function on the game's memory M, named by the listing's label")
  .text.matchAll(/yield CP\(0x([0-9A-F]{4})\)/g)].map(x => parseInt(x[1], 16));
const ls = new Lockstep({
  machine: m, port: P, program: () => program(), passAt: 0x855C,
  checkpoints: [...new Set(CHECKPOINTS)], waits: [0x7323, 0x74EF, 0xAAA5, 0xAF7D],
  irqs: { 0xB9BB: 'irq_view', 0xB9E6: 'irq_split_delayed', 0xB9F8: 'irq_split', 0xBA1E: 'irq_panel' },
  ignore: [[0xB985, 0xB986]], chips: ['colour', 'vic', 'sid'], maxFrames: 5000,
});

// The game's own race (the Play tab, "Where the original depends on its interrupts"): the panel's
// interrupt prints Benson's figures with $06, the byte the sky and ground fill keeps its fill byte
// in, and does not save it. When it falls inside the fill and changes $06, the game fills the rest
// of the view with 0; the port runs its interrupts between steps and fills on. Such a pass is let
// through when every byte that differs is in the bitmaps, 0 in the game; anything else fails.
const inFill = pc => (pc >= 0xAFD5 && pc < 0xB1C0) || (pc >= 0xBD00 && pc < 0xBEA0);
const races = new Set();
let pass = 0;
const taken = [];                                  // where each interrupt came in, and $06 then
m.onInterrupt = () => { taken.push([m.cpu.pc, m.ram[0x06]]); };
m.onReturn = () => { const [pc, fill] = taken.pop(); if (inFill(pc) && m.ram[0x06] !== fill) races.add(pass); };

let seed = 0x2545F491, joy = 0x1F, handed = 0;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const STICK = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x1A, 0x16, 0x19, 0x15];   // none, the four ways, the diagonals
function onPass(n) {
  pass = n;
  if (!handed && m.ram[0xA9] === 0x80) handed = n;
  if (handed && rnd(8) === 0) joy = STICK[rnd(STICK.length)];
  m.joy = joy;
}
const r = ls.run({ passes: PASSES, onPass, stopOnDiff: false });
console.log(describe(r));
let raced = 0, bad = 0;
for (const d of r.diffs) {
  const bitmap = d.bytes.every(b => !b.chip && b.address >= 0x4000 && b.address < 0x8000 && b.game === 0);
  if ((races.has(d.pass - 1) || races.has(d.pass)) && bitmap) raced++;
  else bad++;
}
console.log(`${r.passes} passes from the start-up, the opening handing over at pass ${handed || 'none'}; ` +
            `${raced} pass(es) with the game's own race in the sky and ground fill, ${bad} other difference(s)`);
process.exit(!r.diverged && !bad && handed && r.passes >= PASSES ? 0 : 1);
