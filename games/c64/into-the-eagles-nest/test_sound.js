#!/usr/bin/env node
// Hold the page's sound effects against the game's own. index.html's en-sfx-driver block runs the
// game's code itself, so what this checks is what the block adds: that it hands the simulator the
// right pieces of memory, calls the set-up at $63B7 and the sound's own frame at $63E6, asks for an
// effect the way the game does, and keeps every write to the chip. The same two routines are run
// here straight from the committed listing, with the whole image behind them, and every write of
// every frame must match. It exits 1 on any difference.
//   node games/c64/into-the-eagles-nest/test_sound.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));

const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createSfx } = g.run(page, 'en-sfx-driver', 'createSfx');
const image = g.listing().ram;
const MEM = [[0x0200, Array.from(image.slice(0x0200, 0x0300))],
             [0x6000, Array.from(image.slice(0x6000, 0x6800))]];

const FRAMES = 80;
let bad = 0, cases = 0, heard = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

for (let effect = 1; effect <= 10; effect++) {
  // The game's own code, over the whole image.
  const m = image.slice();
  let writes = [];
  const io = {
    read(a) { return a === 0xD41B ? 0 : m[a]; },        // voice three's noise, which the set-up reads
    write(a, v) {
      if (a >= 0xD400 && a < 0xD800) { const r = a & 0x1F; if (r < 25) writes.push(r, v); return; }
      m[a] = v;
    },
  };
  const cpu = new C64Cpu.CPU(m, { port: 0x36, io });
  const regs = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
  const call = (at) => { writes = []; cpu.call(at, Object.assign({}, regs), { maxSteps: 400000 }); return writes; };

  call(0x63B7);
  if (effect === 10) m[0x02D8] = 1; else m[0x02D5] = effect;

  // The page's block, which must do the same from its own pieces of memory. Its set-up reads the
  // chip's noise as a random number, so only the frames are compared, not the table it builds.
  // The test's own io answers the noise with 0, so the table the game built here is all zeros;
  // the block is given the same one, and the effect that reads it then matches.
  const drv = createSfx({ mem: MEM, random: new Array(256).fill(0), noise: 0 }, C64Cpu);
  drv.init(effect - 1);

  for (let f = 0; f < FRAMES; f++) {
    const theirs = call(0x63E6);
    drv.play();
    if (theirs.join() !== drv.writes.join())
      fail('effect', effect, 'frame', f, theirs.join(), '|', drv.writes.join());
    if (theirs.length) heard++;
    cases++;
  }
}
console.log(`${cases} frames over ten effects, ${heard} of them with writes, `
  + (bad ? bad + ' differences' : 'every write matches'));
process.exit(bad ? 1 : 0);
