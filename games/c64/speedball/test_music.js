#!/usr/bin/env node
// Hold the page's sound players against the game's own sound calls. index.html's sb-music block
// (createDriver) runs the game's driver on the kit's 6502, handed in as sid.js hands it, from the
// listing over SB_DRIVER_RANGES alone, for every button of the music player (SB_TUNES) and of the
// effects player (SB_EFFECTS). Here the same calls run on the listing's whole memory, with the
// SID's data bus answering reads as VICE's does (C64Sid.engine().createBus), in the order the game
// makes them: music_stop ($8B4C) as every kick-off does, then tune_play ($8B2F) with the tune, or
// for an effect the launcher's start and stop (sound_play $FE and $FF, $8B80), which leave the
// volume up as a kick-off does, then sound_play with the effect. Each frame is frame_work's: the
// chips banked in ($01 = $0D) for music_frame ($8B5F), then frame_count ($0F) counted on. The
// launcher's button stops it with $FF after SB_HUM frames, as the ball leaving the launcher does.
// Both must write the same values to the same registers in the same order in every frame, for
// 60 seconds of each button or until it ends, and end on the same frame; after the end the game's
// driver must write nothing for 5 seconds, with every voice's gate shut or its sustain level 0
// (an effect leaves its gates open on a sustain of 0, so it decays to silence). It exits 1 on any difference.
//   node games/c64/speedball/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('sb-music');
const { createDriver, SB_TUNES, SB_EFFECTS, SB_DRIVER_RANGES, SB_HUM } =
  g.run(page, 'sb-music', 'createDriver', 'SB_TUNES', 'SB_EFFECTS', 'SB_DRIVER_RANGES', 'SB_HUM');
g.lib('sid');
const L = g.listing();
const FRAME = 19656, FRAMES = 60 * 50, AFTER = 5 * 50;
const mem = SB_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
let bad = 0, frames = 0, buttons = 0, ended = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [list, set] of [[SB_TUNES, 'music'], [SB_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] }, sid = new Uint8Array(25);
  const bus = C64Sid.engine().createBus('8580');
  let f = 0;
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD7FF) return bus.read(a & 31, f * FRAME + cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) {
      if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); sid[a - 0xD400] = v; bus.write(v, f * FRAME + cpu.cycles); return; }
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: 0x30, io });
  const call = (a, v) => cpu.call(a, { a: v || 0, x: 0, y: 0 }, { maxSteps: 100000 });
  call(0x8B4C);
  if (c.tune !== undefined) call(0x8B2F, c.tune);
  else { if (!c.hum) { call(0x8B80, 0xFE); call(0x8B80, 0xFF); } call(0x8B80, c.hum ? 0xFE : c.effect); }
  const frameWork = () => { cpu.portWrite(1, 0x0D); call(0x8B5F); cpu.portWrite(1, 0x30); m[0x0F] = (m[0x0F] + 1) & 0xFF; };
  const on = () => !!(m[0x093C] | m[0x093D] | m[0x0941]);
  const drv = createDriver({ mem, tunes: list, hum: SB_HUM }, kit);
  drv.init(t);
  buttons++;
  for (; f < FRAMES; f++) {
    frameWork();
    if (c.hum && f + 1 === SB_HUM) call(0x8B80, 0xFF);
    drv.play();
    frames++;
    if (frame.w.join() !== drv.writes.join()) { fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join()); return; }
    frame.w = [];
    if (on() !== drv.playing()) { fail(set, c.name, 'frame ' + f, on() ? 'still plays' : 'has ended'); return; }
    if (!on()) break;
  }
  if (on()) return;
  ended++;
  for (let n = 0; n < AFTER; n++, f++) {
    frameWork();
    if (frame.w.length) { fail(set, c.name, 'the driver writes ' + n + ' frames after the end'); return; }
    if ([0, 7, 14].some((v) => sid[v + 4] & 1 && sid[v + 6] >> 4)) { fail(set, c.name, 'a voice sustains after the end'); return; }
  }
});
console.log(`${buttons} buttons (${ended} end), ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game'));
process.exit(bad ? 1 : 0);
