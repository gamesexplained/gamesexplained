#!/usr/bin/env node
// Hold the page's sound players against the game's own sound driver. index.html's bb-music block
// (createDriver) runs the driver on the kit's 6502, handed in as sid.js hands it, from side 1's
// listing over BB_DRIVER_RANGES alone, for every button of the music player (BB_TUNES) and of the
// effects player (BB_EFFECTS). Here the same driver runs on the kit's simulator over the listing's
// whole memory, with the SID's data bus answering reads as VICE's does (C64Sid.engine().createBus),
// and is scheduled again from the game's two timers: silence ($9D47), the button's sequences put
// in sound_requests ($DD-$DF) with sound_mode ($B8) and the fade or the volume set as the game sets
// them for the title tune (F3, read_keys) and for a fight, then sound_tick ($97F4) every timer B
// latch + 1 cycles (restart's $5161, then each latch the tempo command writes to $DC06-$DC07) and
// effects_tick ($9D73) every 10,001 cycles of timer A. Both must write the same values to the same
// registers in the same order in every step of BB_STEP cycles, for 60 seconds of each button or
// until it ends, and end on the same step. It exits 1 on any difference.
//   node games/c64/barbarian/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('bb-music');
const { createDriver, BB_TUNES, BB_EFFECTS, BB_DRIVER_RANGES, BB_STEP } =
  g.run(page, 'bb-music', 'createDriver', 'BB_TUNES', 'BB_EFFECTS', 'BB_DRIVER_RANGES', 'BB_STEP');
g.lib('sid');
const L = g.listing('parts/practice/listing.json');
const STEPS = Math.ceil(60 * 985248 / BB_STEP);
const mem = BB_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
let bad = 0, steps = 0, buttons = 0, tempos = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [list, set] of [[BB_TUNES, 'music'], [BB_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const bus = C64Sid.engine().createBus('8580');
  let latch = 0x5161;
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) {
      if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); bus.write(v, cpu.cycles); return; }
      if (a === 0xDC06) { latch = (latch & 0xFF00) | v; tempos++; return; }
      if (a === 0xDC07) { latch = (latch & 0xFF) | v << 8; return; }
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
  const call = (a) => cpu.call(a, { a: 0, x: 0, y: 0 });
  call(0x9D47);
  if (c.title) { m[0xB8] = 0x80; m[0xE1] = 0x81; } else { m[0xB8] = 0; m[0xE0] = 15; }
  c.tracks.forEach((n, v) => { if (n) m[0xDD + v] = n; });
  const on = () => [0, 1, 2].some((v) => (m[0x0251 + v] | m[0xDD + v]) & 0x80);
  let tA = 0, tB = 0;
  const drv = createDriver({ mem, tunes: list, step: BB_STEP }, kit);
  drv.init(t);
  buttons++;
  for (let s = 0; s < STEPS; s++) {
    frame.w = [];
    const end = (s + 1) * BB_STEP;
    while (Math.min(tA, tB) < end) {
      if (tB <= tA) { const p = latch + 1; call(0x97F4); tB += p; } else { call(0x9D73); tA += 10001; }
    }
    drv.play();
    steps++;
    if (frame.w.join() !== drv.writes.join()) { fail(set, c.name, 'step ' + s, frame.w.join(), '|', drv.writes.join()); break; }
    if (on() !== drv.playing()) { fail(set, c.name, 'step ' + s, on() ? 'still plays' : 'has ended'); break; }
    if (!on()) break;
  }
});
if (!tempos) fail('no button wrote a tempo: the timer B latch went untested');
console.log(`${buttons} buttons, ${steps} steps of ${BB_STEP} cycles: ` + (bad ? bad + ' differences' : 'every write matches the driver'));
process.exit(bad ? 1 : 0);
