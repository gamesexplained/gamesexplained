#!/usr/bin/env node
// Hold the How it works page's music player against the game's own code. index.html's td-music
// block (createDriver) runs Sam Manthorpe's music player, the game's own code and tables taken from
// the listing over TD_DRIVER_RANGES, on the site's 6502. Here the game's own path runs on the kit's
// simulator over the whole listing: for the title tune, the start-up's call of $9461 (through the
// module's jump table entry $8027, from $20E1), then music_frame ($973E) once a frame, as the title's
// state handler calls it ($2C29, through $802A); for the second tune, $945E (through $8078, from the
// room event at $3987), then $973E once a frame as game state 8 calls it ($C0D8), which ends the tune
// when the first voice has read 15 bytes ($1CE8 at $0F or more, $C0DB). Both must write the same
// values to the same registers of the sound chip in the same order, frame by frame, for 3,000
// frames a tune, and the page's button must stop on the frame the game's state 8 would end it.
// It exits 1 on any difference.
//   node games/c64/the-detective/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, TD_TUNES, TD_DRIVER_RANGES } = g.run('index.html', 'td-music', 'createDriver', 'TD_TUNES', 'TD_DRIVER_RANGES');
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = TD_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
TD_TUNES.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = createDriver({ mem, list: TD_TUNES }, kit);
  cpu.call(c.start, {}, { maxSteps: 100000 });
  const startW = frame.w.slice();
  drv.init(t);
  if (startW.join() !== drv.writes.join()) fail(c.name, 'start', startW.join(), '|', drv.writes.join());
  let done = -1, sounded = false;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cpu.call(0x973E, {}, { maxSteps: 100000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (frame.w.length) sounded = true;
    if (c.ends && m[0x1CE8] >= 0x0F) done = f;
    if ((done >= 0) === drv.playing()) fail(c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  if (!sounded) fail(c.name, 'wrote nothing to the sound chip');
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
});
console.log(`${TD_TUNES.length} tunes, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
