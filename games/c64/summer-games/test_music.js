#!/usr/bin/env node
// Hold the Gameplay page's two music players against the game's own code. gameplay.html's sg-music
// block (createDriver) runs the game's player over the bytes in SG_ENGINE.ranges (the engine) or
// SG_CEREMONY.ranges (the opening ceremony) only. Here the same calls run on the kit's simulator
// over the whole listing of the part: the set-up (the engine's sound_init $1E02, the ceremony's
// $7A3B), the start with the tune's number in Y ($1E3F, $7A78), then the step ($1E70, $7A8D) twice
// for each of 3,000 frames. Both must write the same SID registers with the same values in the same
// order, stop() must turn every gate off and write nothing after, and every button must make sound
// (a voice gated with a pitch other than 0, volume above 0). The page steps twice a frame because the
// game does: the test reads the calls from the listings, the engine's at raster lines $4D and $8D
// in flash_band ($13B2, $13C4), its pairs over the standings and the records ($0E55, $0E5B, $0EC9,
// $0ECC), and the ceremony's from its two interrupts ($7625, $77E6).
// It exits 1 on any difference.
//   node games/c64/summer-games/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const W = g.run('gameplay.html', 'sg-music', 'createDriver', 'SG_TUNES', 'SG_ENGINE', 'SG_CER_TUNES', 'SG_CEREMONY');
// the driver made from its source text alone, as the player's AudioWorklet makes it
const isolated = require('vm').runInNewContext('(' + W.createDriver + ')', {});
const N = 3000;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function jsrAt(L, at, to) {
  if (L.ram[at] !== 0x20 || (L.ram[at + 1] | L.ram[at + 2] << 8) !== to) fail('no JSR $' + to.toString(16) + ' at $' + at.toString(16));
}
const R = g.listing('parts/resident/listing.json'), F = g.listing('parts/front/listing.json');
for (const a of [0x13B2, 0x13C4, 0x0E55, 0x0E5B, 0x0EC9, 0x0ECC]) jsrAt(R, a, 0x1E70);
for (const a of [0x7625, 0x77E6]) jsrAt(F, a, 0x7A8D);
// flash_band waits for line $4D before the first step and $8D before the second ($176B wait_line)
if (R.ram[0x13A4] !== 0x4D || R.ram[0x13B6] !== 0x8D) fail('flash_band lines');

const report = [];
for (const [L, D, tunes] of [[R, W.SG_ENGINE, W.SG_TUNES], [F, W.SG_CEREMONY, W.SG_CER_TUNES]]) {
  if (D.steps !== 2) fail('steps', D.steps);
  const mem = D.ranges.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
  tunes.forEach((tune, t) => {
    const m = L.ram.slice(), sid = new Uint8Array(25);
    let w = [];
    const io = {
      read(a) { throw new Error('read $' + a.toString(16)); },
      write(a, v) {
        if (a >= 0xD400 && a < 0xD800) { const r = (a - 0xD400) & 0x1F; if (r < 25) { sid[r] = v; w.push(r, v); } return; }
        throw new Error('write $' + a.toString(16));
      },
    };
    const cpu = new CPU(m, { port: D.port, io });
    cpu.call(D.init, {}, { maxSteps: 1000 });
    cpu.call(D.start, { y: tune[1] }, { maxSteps: 1000 });
    const drv = isolated(Object.assign({}, D, { mem, list: tunes }), kit);
    drv.init(t);
    if (w.join() !== drv.writes.join()) fail(tune[0], 'start', w.join(), '|', drv.writes.join());
    let sounded = false, steps = 0, ended = -1;
    for (let f = 0; f < N; f++) {
      w = [];
      for (let i = 0; i < 2; i++) cpu.call(D.step, {}, { maxSteps: 2000 });
      drv.play();
      if (w.join() !== drv.writes.join()) fail(tune[0], 'frame ' + f, w.join(), '|', drv.writes.join());
      if (w.length) steps++;
      if (ended < 0 && (m[D.flag] & 0x80)) ended = f;
      if (ended < 0 && !drv.playing()) fail(tune[0], 'the page ends the tune early, frame ' + f);
      for (const v of [0, 1, 2]) if ((sid[4 + 7 * v] & 1) && (sid[7 * v] | sid[1 + 7 * v] << 8) && (sid[24] & 15)) sounded = true;
      frames++;
    }
    if (!sounded) fail(tune[0], 'makes no sound');
    drv.stop();
    if ([4, 11, 18].some((r) => drv.sid[r] & 1)) fail(tune[0], 'a gate is still on after stop');
    if (drv.playing()) fail(tune[0], 'still playing after stop');
    drv.play();
    if (drv.writes.length) fail(tune[0], 'writes after stop');
    if (!steps) fail(tune[0], 'never steps its tune');
    report.push(tune[0] + ' ' + (ended < 0 ? 'still playing' : 'ends at frame ' + ended));
  });
}
console.log(`${W.SG_TUNES.length + W.SG_CER_TUNES.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + report.join('; ')));
process.exit(bad ? 1 : 0);
