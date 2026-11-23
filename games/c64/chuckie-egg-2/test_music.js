#!/usr/bin/env node
// Hold the page's tune player (the ce2-music block in index.html) against the game's own code.
// The kit's 6502 runs play_tune ($1140) from the whole listing to its end, as lose_life calls it
// at $7875, keeping every SID write with the cycle it was made on. The page's driver, given only
// the bytes the page gives it, must make the same writes in the same order, each on the same
// cycle once its frame's start (19,656 cycles a frame) is added, and must end in the frame in
// which the routine returns. The call is checked in the listing: JSR $1140 at $7875. It exits 1
// on any difference.
//   node games/c64/chuckie-egg-2/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, CE2_MUSIC_RANGES } = g.run(page, 'ce2-music', 'createDriver', 'CE2_MUSIC_RANGES');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
if (L.ram[0x7875] !== 0x20 || L.ram[0x7876] !== 0x40 || L.ram[0x7877] !== 0x11) fail('no JSR $1140 at $7875');
const want = [];
const m = L.ram.slice();
const cpu = new CPU(m, { port: 0x35, io: {
  read(a) { throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD400 && a <= 0xD418) want.push([a - 0xD400, v, cpu.cycles]); else throw new Error('write $' + a.toString(16)); },
} });
cpu.cycles = 0; cpu.call(0x1140, {}, { maxSteps: 50000000 });
const end = cpu.cycles;
const mem = CE2_MUSIC_RANGES.map(([a, b]) => [a, Array.from(L.ram.slice(a, b + 1))]);
const drv = createDriver({ mem }, kit);
drv.init(0);
const got = [];
let f = 0;
for (; drv.playing() && f < 100000; f++) {
  drv.play();
  for (let i = 0; i < drv.writes.length; i += 2) got.push([drv.writes[i], drv.writes[i + 1], f * 19656 + drv.times[i / 2]]);
}
// the page's driver starts with the JSR into play_tune (6 cycles) the test's call does not count
const shift = 6;
if (got.length !== want.length) fail('writes: game', want.length, 'page', got.length);
for (let i = 0; i < Math.min(got.length, want.length); i++) {
  const [r, v, t] = want[i], [r2, v2, t2] = got[i];
  if (r !== r2 || v !== v2 || t + shift !== t2) { fail('write', i, 'game', r, v, t + shift, 'page', r2, v2, t2); break; }
}
if (f !== Math.ceil((end + shift) / 19656)) fail('frames: game ends at cycle', end, 'page played', f, 'frames');
console.log(bad ? `FAILED - ${bad} difference(s)` : `OK - the page plays play_tune as the game does: ${want.length} writes over ${f} frames, each on the game's own cycle`);
process.exit(bad ? 1 : 0);
