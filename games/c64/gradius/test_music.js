#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's gr-music block
// (createDriver) runs the game's tune player and effects player on the kit's 6502 over
// GR_DRIVER_RANGES, for every button of the music player (GR_TUNES) and the effects player
// (GR_EFFECTS). The game's own path runs here on the kit's simulator over the whole listing: for a
// tune, set_tune ($1C5B) with the tune's A, as the events start_tune1 and start_tune2 call it, then
// each frame music_tick ($6AA9) with music_on ($6AB7) set, which is how the game would step the
// tune if anything called it (it also runs fade_step); for an effect, play_effect ($9B71) with the
// effect's number, then each frame effects_tick ($9BE1), as the play frame calls it at $08F0. Both
// must write the same values to the same registers in the same order, frame by frame, for 3,000
// frames a tune and until an effect ends, and an effect's button must stop on the frame its last
// voice's time runs out. A read of a SID register answers the data bus, the last value written to
// the chip, on both sides. createDriver is made here from its source text alone, as the player's
// AudioWorklet makes it. It exits 1 on any difference.
//   node games/c64/gradius/test_music.js [page.html]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'gr-music', 'createDriver', 'GR_TUNES', 'GR_EFFECTS', 'GR_DRIVER_RANGES');
const { GR_TUNES, GR_EFFECTS, GR_DRIVER_RANGES } = B;
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing();
let bad = 0, frames = 0, notes = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = GR_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
for (const [list, set] of [[GR_TUNES, 'music'], [GR_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  let bus = 0;
  const io = {
    read(a) { if (a >= 0xD400 && a <= 0xD418) return bus; throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a < 0xD400 || a >= 0xD800) throw new Error('write $' + a.toString(16));
      const r = (a - 0xD400) & 31; bus = v; if (r < 25) frame.w.push(r, v);
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver({ mem, list }, kit);
  if (c.a !== undefined) cpu.call(0x1C5B, { a: c.a }, { maxSteps: 200000 });
  else cpu.call(0x9B71, { a: c.e }, { maxSteps: 200000 });
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', frame.w.join(), '|', drv.writes.join());
  m[0x6AB7] = 1;                                                  // music_on, for music_tick
  let done = -1;
  const FRAMES = c.a !== undefined ? 3000 : 400;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    if (c.a !== undefined) cpu.call(0x6AA9, {}, { maxSteps: 200000 });   // music_tick
    else cpu.call(0x9BE1, {}, { maxSteps: 200000 });                    // effects_tick
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    for (let i = 0; i < frame.w.length; i += 2) if ([4, 11].includes(frame.w[i]) && (frame.w[i + 1] & 1)) notes++;
    if (c.e !== undefined && !m[0x9C2F] && !m[0x9C30] && !m[0x9C31]) done = f;
    if (c.e !== undefined && (done >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
});
if (notes < 50) fail('only', notes, 'gates opened: the tunes may be silent');
console.log(`${GR_TUNES.length + GR_EFFECTS.length} buttons, ${frames} frames, ${notes} gates opened: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
