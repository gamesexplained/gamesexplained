'use strict';
// Moments of play for the routine tests (port/test/lib.js): the game on the kit's C16
// (kit/c16/machine.js), booted from listing.json (lib.js, boot) and played by a script, its whole
// state saved at the main loop's poll ($1852) now and then, on every level. The states hold the
// game's memory, so they go in the gitignored work/states/ and nowhere else.
// node games/c16/prospector-pete/port/scripts/gen-states.js [games]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../../../..');
const { Machine, KEY } = require(path.join(REPO, 'kit/c16/machine.js'));
const { boot } = require('../test/lib.js');

const OUT = path.join(ROOT, '../work/states');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT, f));

let seed = 12345;
const rnd = n => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % n; };
const STICK = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x1F];      // still, up, down, left, right, still
const games = +process.argv[2] || 32;
const m = new Machine({ ram: boot(), pc: 0x1800, passAt: 0x1852 });
const vector = () => m.ram[0x0314] | m.ram[0x0315] << 8;
let saved = 0;
m.runFrames(60);
for (let g = 0; g < games; g++) {
  // at the title: the level to play, then fire
  while (vector() !== 0x3080) m.runFrames(1);
  m.runFrames(30);
  m.ram[0xA7] = g % 16;
  m.joy = 0x0F; m.runFrames(4); m.joy = 0x1F;
  let frames = 0, hold = 0, stick = 0x1F, n = 0;
  while (frames < 4000 && vector() !== 0x3080) {
    if (hold-- <= 0) { stick = STICK[rnd(STICK.length)]; hold = 8 + rnd(60); }
    m.joy = stick & (rnd(40) === 0 ? 0x0F : 0x1F);
    m.runFrames(1); frames++;
    if (m.ram[0xA8] && ++n % 150 === 0 && m.runPasses(1, 50)) {
      fs.writeFileSync(path.join(OUT, 's' + String(saved++).padStart(4, '0') + '.json'), JSON.stringify(m.save()));
    }
  }
  if (vector() !== 0x3080) { m.press(KEY.ESC); m.runFrames(6); m.release(KEY.ESC); }
  m.joy = 0x1F;
  console.log('game', g, 'level', g % 16, 'frames', frames, 'states', saved, 'score', [0xAC, 0xAB, 0xAA].map(a => m.ram[a].toString(16).padStart(2, '0')).join(''));
}
