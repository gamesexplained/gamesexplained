#!/usr/bin/env node
// Holds the page's music player against the game's own driver. index.html's lw-music block
// (createDriver) runs the bytes of MUSI from the page's own copy; here the same driver runs on the
// kit's simulator over the title part's listing ($E000-$F5D5 as the title loads them), called as
// the title calls it: $E000 with A = the tune, then $E003 once a frame. Both must write the same
// values to the same SID registers in the same order every frame for 3000 frames (a minute of
// PAL) of each tune. Exits 1 on any difference.
//   node games/c64/lethal-weapon/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
g.sameBlock('lw-music');
const { createDriver, LW_TUNES, LW_MUSIC } = g.run('index.html', 'lw-music', 'createDriver', 'LW_TUNES', 'LW_MUSIC');
const L = g.listing('parts/title/listing.json');
let bad = 0, frames = 0, notes = 0, reads = 0;
for (let t = 0; t < LW_TUNES.length; t++) {
  const m = L.ram.slice(); let w = [], bus = 0;
  const io = { read(a) { if (a >= 0xD400 && a < 0xD800) { reads++; return bus; } throw new Error('read $' + a.toString(16)); },
               write(a, v) { if (a >= 0xD400 && a <= 0xD418) { w.push(a - 0xD400, v); bus = v; if (a % 7 === 4 && (v & 1)) notes++; return; } throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: 0x35, io });
  cpu.call(0xE000, { a: t, x: 0, y: 0 }, { maxSteps: 200000 });
  const d = createDriver({ music: LW_MUSIC }, kit); d.init(t);
  for (let f = 0; f < 3000; f++) {
    w = []; cpu.call(0xE003, { a: 0, x: 0, y: 0 }, { maxSteps: 200000 }); d.play(); frames++;
    if (w.join() !== d.writes.join()) { if (bad++ < 5) console.log('DIFFERS tune', t, 'frame', f, w.slice(0,24).join(), '/', d.writes.slice(0,24).join()); break; }
  }
}
console.log(`${frames} frames of ${LW_TUNES.length} tunes, ${notes} gates set, ${reads} reads of the SID, ${bad} differences`);
if (bad || notes === 0) process.exit(1);
