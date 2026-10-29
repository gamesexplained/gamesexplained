#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's gb-music block
// (createDriver) runs Martin Galway's driver on the kit's 6502 over GB_DRIVER_RANGES, for every
// button of the music player (GB_TUNES) and of the effects player (GB_EFFECTS). The game's own
// path runs here on the kit's simulator over the whole listing: new_game's instructions that
// silence the chip and set the volume ($370A-$3711), then tune_start ($3E00) with the tune's Y or
// the effect's own routine, and each frame frame_wait's three calls ($3696-$369E) followed by the
// end of irq_player ($0796-$079C), as the main loop and the raster interrupt run them. Both must
// write the same values to the same registers in the same order, frame by frame, for 3,000 frames
// a button, and the page's button must stop on the frame tune_playing ($3E32) first says every
// voice is done, which is when wait_tune ($37AF) lets the game go on. The one button the game never
// plays, the hi-score table's tune from Martin Galway's source (GB_HISCORE), runs here on the game's
// own code the same way: its bytes put where the page keeps them, tune_start with tune 0's Y, and
// the three voices' pattern pointers ($E6-$EB) set to its patterns. createDriver is made here from
// its source text alone, in a context of its own, as the player's AudioWorklet makes it, so a driver
// that leans on anything else of the page fails here as it fails there.
// It exits 1 on any difference.
//   node games/c64/green-beret/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'gb-music', 'createDriver', 'GB_TUNES', 'GB_EFFECTS', 'GB_DRIVER_RANGES', 'GB_HISCORE');
const { GB_TUNES, GB_EFFECTS, GB_DRIVER_RANGES, GB_HISCORE } = B;
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// the data the page's sound() gives the players
const mem = GB_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]).concat([[GB_HISCORE.addr, GB_HISCORE.bytes]]);
for (const [list, set] of [[GB_TUNES, 'music'], [GB_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  if (c.voices) m.set(GB_HISCORE.bytes, GB_HISCORE.addr);
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver({ mem, list }, kit);
  cpu.sp = 0xF0; cpu.pc = 0x370A; cpu.run({ until: 0x3712, maxSteps: 10000 });   // new_game: sound_off, volume
  if (c.y !== undefined) cpu.call(0x3E00, { y: c.y });
  else cpu.call(c.run, {});
  if (c.voices) c.voices.forEach((a, v) => { m[0xE6 + 2 * v] = a & 255; m[0xE7 + 2 * v] = a >> 8; });
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', frame.w.join(), '|', drv.writes.join());
  let done = -1;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cpu.sp = 0xF0; cpu.pc = 0x3696; cpu.run({ until: 0x369F, maxSteps: 100000 });   // frame_wait's calls
    cpu.call(0x0796, {}, { maxSteps: 100000 });                                       // irq_player's end
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    cpu.call(0x3E32, {});                                                              // tune_playing
    if (cpu.z) done = f;
    if ((done >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
});
console.log(`${GB_TUNES.length + GB_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
