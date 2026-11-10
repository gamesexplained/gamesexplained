#!/usr/bin/env node
// Hold music.html's sound player against the game's own code. The page's al-music block
// (createDriver) runs the engine's sound code on the kit's 6502 over AL_RANGES. Here the game's
// path runs on the kit's simulator over the engine's and level 1's listings: reset_sound ($0903),
// then a JSR start_music ($2437) or start_effect ($2A79) with the tune's or record's address after
// it, as the game's code calls them; then each PAL frame music_tick ($249E) once for every
// $80FF + 1 cycles of CIA 1's timer A that have passed, effects_tick ($27FB) and effects_frame
// ($2B0F), as the IRQ handler and frame_tick call them. Both sides must write the same values to
// the same registers in the same order on every frame, 3,000 frames a tune and until an effect
// ends (at most 1,500). createDriver is made from its source text alone, as the AudioWorklet makes
// it. It exits 1 on any difference.
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const B = g.run('music.html', 'al-music', 'createDriver', 'AL_TUNES', 'AL_EFFECTS', 'AL_RANGES', 'AL_FRAME', 'AL_TIMER');
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const E = g.listing('parts/engine/listing.json'), L1 = g.listing('parts/level1/listing.json');
const image = new Uint8Array(0x10000);
image.set(E.ram.slice(0x0800, 0x3D00), 0x0800); image.set(L1.ram.slice(0x8E94, 0x9011), 0x8E94);
const mem = B.AL_RANGES.map(([a, b]) => [a, image.slice(a, b + 1)]);
let bad = 0, frames = 0, gates = 0, loud = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const cases = B.AL_TUNES.map((t, i) => ({ name: t.name, i, tune: true, addr: t.hdr }))
  .concat(B.AL_EFFECTS.map((e, i) => ({ name: e.name, i: B.AL_TUNES.length + i, tune: false, addr: e.rec })));
for (const c of cases) {
  const m = image.slice(), w = [];
  m[0x022A] = 0x5A; m[0x022B] = 0xC3; m[0x022C] = 0x71;
  let bus = 0;
  const io = {
    read(a) { if (a >= 0xD400 && a < 0xD800) return a === 0xD41B || a === 0xD41C ? 0 : bus; return 0; },
    write(a, v) { if (a >= 0xD400 && a < 0xD800) { const r = (a - 0xD400) & 31; bus = v; if (r < 25) w.push(r, v); } },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const run = a => cpu.call(a, {}, { maxSteps: 400000 });
  const data = { mem, tunes: B.AL_TUNES, effects: B.AL_EFFECTS, frame: B.AL_FRAME, timer: B.AL_TIMER };
  const drv = createDriver(data, kit);
  run(0x0903);
  m.set([0x20, c.tune ? 0x37 : 0x79, c.tune ? 0x24 : 0x2A, c.addr & 255, c.addr >> 8, 0x60], 0x03C0);
  run(0x03C0);
  drv.init(c.i);
  if (w.join() !== drv.writes.join()) fail(c.name, 'start', w.join(), '|', drv.writes.join());
  let acc = 0, done = -1, vol = 0;
  const N = c.tune ? 3000 : 1500;
  for (let f = 0; f < N && done < 0; f++) {
    w.length = 0;
    drv.readback(0, 0, bus);
    acc += B.AL_FRAME;
    while (acc >= B.AL_TIMER) { acc -= B.AL_TIMER; run(0x249E); }
    run(0x27FB); run(0x2B0F);
    drv.play();
    if (w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f, w.join(), '|', drv.writes.join());
    for (let i = 0; i < w.length; i += 2) {
      if ([4, 11, 18].includes(w[i]) && (w[i + 1] & 1)) gates++;
      if (w[i] === 24) vol = w[i + 1] & 15;
    }
    if (vol) loud++;
    if (!c.tune && !m[0x05A1]) done = f;
    if (!c.tune && (done >= 0) === drv.playing()) fail(c.name, 'frame ' + f, 'game', done >= 0 ? 'ended' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  ends.push(c.name + ' ' + (c.tune ? '' : done < 0 ? 'plays on' : (done + 1) + ' frames'));
}
if (gates < 100) fail('only', gates, 'gates opened');
if (!loud) fail('the volume never left 0');
console.log(`${cases.length} buttons, ${frames} frames, ${gates} gates opened: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
