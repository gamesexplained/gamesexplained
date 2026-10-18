#!/usr/bin/env node
// Hold the page's sound-effect driver against the game's own code. music.html's gx-sfx block
// (createSfxDriver) runs Gauntlet's effects player on the kit's 6502, as sid.js hands it over; this runs the same
// routines on the kit's 6502 simulator over the committed listing, as the game starts an effect
// (sfx_reset $CD77, then sfx_start $CDDB with the effect in A) and as the raster interrupt plays
// one (sfx_play $CCD3 once a frame), and compares every SID write of every frame, in order, for
// all eighteen effects to their ends. It also checks that the page's SFX bytes are the listing's.
// Everything it needs is committed.
//   node games/c64/gauntlet/test_sfx.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'music.html';
const { createSfxDriver } = g.run(page, 'gx-sfx', 'createSfxDriver');
const mm = g.read(page).match(/const SFX = (\{.*?\});/);
if (!mm) { console.error('no SFX data'); process.exit(1); }
const SFX = JSON.parse(mm[1]);
const L = g.listing();
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [base, hex] of SFX.regions) {
  if (Buffer.from(L.ram.slice(base, base + hex.length / 2)).toString('hex') !== hex) fail('SFX region $' + base.toString(16) + ' is not the listing\'s bytes');
}
for (let t = 0; t < 18; t++) {
  // the game's memory: only what the page carries, so that the page cannot lean on anything else
  const m = new Uint8Array(0x10000);
  for (const [base, hex] of SFX.regions) for (let i = 0; i < hex.length / 2; i++) m[base + i] = L.ram[base + i];
  let game = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) game.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  const drv = createSfxDriver(SFX, kit);
  cpu.call(0xCD77, {}); cpu.call(0xCDDB, { a: t });
  drv.init(t);
  if (game.join() !== drv.writes.join()) fail('effect', t, 'start', 'game', game.join(), 'page', drv.writes.join());
  const busy = () => m[0xCCC9] !== 0xFF || m[0xCCCA] !== 0xFF || m[0xCCCB] !== 0xFF;
  let f = 0;
  for (; f < 500 && busy(); f++) {
    game = [];
    cpu.call(0xCCD3, {});
    drv.play();
    if (game.join() !== drv.writes.join()) fail('effect', t, 'frame', f, 'game', game.join(), 'page', drv.writes.join());
    if (drv.playing() !== busy()) fail('effect', t, 'frame', f, 'playing() disagrees');
  }
  if (busy()) fail('effect', t, 'did not end in 500 frames');
  frames += f;
}
console.log(`18 effects, ${frames} frames, ${bad ? bad + ' differ' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
