#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's gs-music block
// (createDriver) runs the title's tune player and the flight's effect player on the kit's 6502,
// handed in as sid.js hands it, from the listings over GS_TUNE_RANGES and GS_SFX_RANGES alone.
// Here the same routines run on the kit's simulator over each listing's whole memory: for the tune,
// the streams put back at $9117, $91C7 and $95D1 with each count at 1 and the PAL tempo, then
// tune_start ($8E78) and tune_play ($8E89) once a frame until tune_done ($8F52) is set; for each
// effect, the volume set to 15 as sound ($59C7) sets it, sound_start ($9AAC) with the list at
// $EC00 and the effect's number, then sound_step ($9A39) once a frame until $819B is 0. Both must
// write the same values to the same registers in the same order every frame and end on the same
// frame, and every button must make a sound. It exits 1 on any difference.
//   node games/c64/gunship/test_sound.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, GS_TUNES, GS_EFFECTS, GS_TUNE_RANGES, GS_SFX_RANGES } =
  g.run(page, 'gs-music', 'createDriver', 'GS_TUNES', 'GS_EFFECTS', 'GS_TUNE_RANGES', 'GS_SFX_RANGES');
const T = g.listing('parts/title/listing.json'), F = g.listing('parts/flight/listing.json');
let bad = 0, frames = 0, buttons = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
function check(L, ranges, list, start, step, on) {
  const mem = ranges.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
  list.forEach((c, t) => {
    const m = L.ram.slice(), w = [];
    const io = {
      read(a) { throw new Error('read $' + a.toString(16)); },
      write(a, v) { if (a >= 0xD400 && a < 0xD800) { if ((a & 31) < 25) w.push(a & 31, v); return; } throw new Error('write $' + a.toString(16)); },
    };
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
    const drv = createDriver({ mem, list }, kit);
    drv.init(t); start(m, cpu, c, w);
    buttons++;
    if (w.join() !== drv.writes.join()) { fail(c.name, 'start', w.join(), '|', drv.writes.join()); return; }
    let sounded = w.length > 0;
    for (let f = 0; f < 3000; f++) {
      w.length = 0;
      if (on(m)) cpu.call(step, { a: 0, x: 0, y: 0 });
      drv.play(); frames++;
      if (w.length) sounded = true;
      if (w.join() !== drv.writes.join()) { fail(c.name, 'frame ' + f, w.join(), '|', drv.writes.join()); return; }
      if (on(m) !== drv.playing()) { fail(c.name, 'frame ' + f, on(m) ? 'still plays' : 'has ended'); return; }
      if (!on(m)) break;
    }
    if (on(m)) fail(c.name, 'still plays after 3000 frames');
    if (!sounded) fail(c.name, 'wrote nothing');
  });
}
check(T, GS_TUNE_RANGES, GS_TUNES, (m, cpu) => {
  m.set([0x17, 0xC7, 0xD1, 0x91, 0x91, 0x95], 0x8F53); m.set([1, 1, 1], 0x8F5F); m.set([2, 2, 2], 0x9000);
  cpu.call(0x8E78, { a: 0, x: 0, y: 0 });
}, 0x8E89, (m) => m[0x8F52] === 0);
check(F, GS_SFX_RANGES, GS_EFFECTS, (m, cpu, c, w) => {
  w.push(24, 15); m[0xA5] = 0; m[0xA6] = 0xEC; m[0xA7] = c.n;
  cpu.call(0x9AAC, { a: 0, x: 0, y: 0 });
}, 0x9A39, (m) => m[0x819B] !== 0);
console.log(`${buttons} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s own players'));
process.exit(bad ? 1 : 0);
