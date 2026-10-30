#!/usr/bin/env node
// Hold the How it works page's music and effects players against the game's own code. index.html's
// pd-music block (createDriver) runs the game's sound driver on the site's 6502 over
// PD_DRIVER_RANGES, for each button of the music player (PD_TUNES) and of the effects player
// (PD_EFFECTS). Here the game's own path runs on the kit's simulator over the whole listing: for a
// tune, game_start's start of the race music ($0861-$086D) or name_entry's start of its tune
// ($0A8D-$0A94); for an effect, game_start's sound_reset and music off ($083D-$0844), then the
// game's own store of the effect's number where it has one (update_place's 2 at $1410, kart_spin's
// 3 at $1687) and a store of 1 or 4 where nothing in the game makes one; then sound_play ($B800)
// once a frame, as race_irq_top calls it. The test's chips answer the raster line and CIA 1's port
// B with other values than the page's, 3 and 0, so a sound that depended on them would differ.
// Both must write the same values to the same registers of the sound chip in the same order, frame
// by frame, for 3,000 frames a button, and the page's button must stop on the frame the game's
// state says the effect is done (nothing playing or waiting: $C0BB and $B805 both 0). Every button
// must sound. It exits 1 on any difference.
//   node games/c64/power-drift/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, PD_TUNES, PD_EFFECTS, PD_DRIVER_RANGES } = g.run('index.html', 'pd-music', 'createDriver', 'PD_TUNES', 'PD_EFFECTS', 'PD_DRIVER_RANGES');
const vm = require('vm');
const isolated = vm.runInNewContext('(' + createDriver + ')', {});
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = PD_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
const gameRun = (cpu, from, to) => { cpu.pc = from; cpu.run({ until: to, maxSteps: 100000 }); };
[['tunes', PD_TUNES], ['effects', PD_EFFECTS]].forEach(([set, list]) => list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { if (a === 0xD012) return 3; if (a === 0xDC01) return 0; throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v);
      else if (a < 0xD419 || a > 0xD41B) throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = isolated({ mem, list }, kit);
  if (c.tune === 2) gameRun(cpu, 0x0861, 0x086E);
  else if (c.tune === 1) { m[0xB806] = 0; gameRun(cpu, 0x0A8D, 0x0A95); }
  else {
    gameRun(cpu, 0x083D, 0x0845);
    if (c.sfx === 2) gameRun(cpu, 0x1410, 0x1415);
    else if (c.sfx === 3) gameRun(cpu, 0x1687, 0x168C);
    else m[0xB805] = c.sfx;
  }
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', frame.w.join(), '|', drv.writes.join());
  if (c.tune && m[0xB804] !== c.tune) fail(set, c.name, 'the game stored', m[0xB804], 'as the tune');
  if (c.sfx && m[0xB805] !== c.sfx) fail(set, c.name, 'the game stored', m[0xB805], 'as the effect');
  let done = -1, sounded = false;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cpu.call(0xB800, {}, { maxSteps: 100000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    for (let i = 0; i < frame.w.length; i += 2) if ([4, 11, 18].includes(frame.w[i]) && (frame.w[i + 1] & 1)) sounded = true;
    if (c.sfx && !m[0xC0BB] && !m[0xB805]) done = f;
    if ((done >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  if (!sounded) fail(set, c.name, 'never opened a voice\'s gate');
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
}));
console.log(`${PD_TUNES.length + PD_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
