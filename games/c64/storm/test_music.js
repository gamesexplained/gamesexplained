#!/usr/bin/env node
// Hold the page's two sound players against the game's code. index.html's storm-music block
// (createDriver) runs the title tune's driver, and its storm-sfx block (createSfxDriver) the sound
// effects, each on the kit's 6502 (handed in as sid.js hands it) over the bytes the page gives it.
// The same calls on the kit's simulator over the listing's bytes must write the same values to the
// same SID registers, in the same order, frame by frame:
// - the tune: music_init ($9000), 7,000 frames of music_play ($911B), then music_stop ($9227);
// - each of the 15 effects: sfx_reset ($5632) and sfx_start ($5645) with its number, then
//   sfx_update ($5830) once a frame until the effect ends, when the port must stop too.
// It exits 1 on any difference.
//   node games/c64/storm/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/c64/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'storm-music', 'createDriver');
const { createSfxDriver } = g.run(page, 'storm-sfx', 'createSfxDriver');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// Each call starts with A, X and Y 0 (A the effect's number for sfx_start) and every flag clear, as the ports' do
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
function sim(m, frame) {
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  return new CPU(m, { port: { dir: 0x2F, data: 0x37 }, io });
}

// The tune, with the data the page gives the driver (musicWidget: $9000-$99C1)
const FRAMES = 7000;
{
  const m = L.ram.slice(), frame = { w: [] }, cpu = sim(m, frame);
  const drv = createDriver({ mem: [[0x9000, L.ram.slice(0x9000, 0x99C2)]] }, kit);
  const same = (what) => { if (frame.w.join() !== drv.writes.join()) fail('tune', what, frame.w.join(), '|', drv.writes.join()); frame.w = []; };
  cpu.call(0x9000, Z); drv.init(); same('music_init');
  for (let f = 0; f < FRAMES; f++) {
    cpu.call(0x911B, Z); drv.play();
    same('frame ' + f);
  }
  cpu.call(0x9227, Z); drv.stop(); same('music_stop');
  if (drv.playing()) fail('tune', 'plays on after music_stop');
}

// The effects, with the data the page gives the player (sfxWidget: $5632-$5937)
let sfxFrames = 0;
for (let t = 0; t < 15; t++) {
  const m = L.ram.slice(), frame = { w: [] }, cpu = sim(m, frame);
  const drv = createSfxDriver({ mem: [[0x5632, L.ram.slice(0x5632, 0x5938)]] }, kit);
  const same = (what) => { if (frame.w.join() !== drv.writes.join()) fail('effect', t, what, frame.w.join(), '|', drv.writes.join()); frame.w = []; };
  cpu.call(0x5632, Z); cpu.call(0x5645, { ...Z, a: t }); drv.init(t); same('start');
  let f = 0;
  while (m[0x58FF] && f < 2000) { cpu.call(0x5830, Z); drv.play(); same('frame ' + f); f++; }
  if (drv.playing()) fail('effect', t, 'the port plays on after the effect ends');
  sfxFrames += f;
}
console.log(`${FRAMES} frames of the title tune and ${sfxFrames} frames of 15 effects: ` +
  (bad ? bad + ' differences' : 'every write matches'));
process.exit(bad ? 1 : 0);
