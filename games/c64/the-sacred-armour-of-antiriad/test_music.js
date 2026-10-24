#!/usr/bin/env node
// Hold the pages' sound players against the game's own sound driver. index.html's ant-music
// block (createDriver) runs the driver on the kit's 6502, handed in as sid.js hands it, from the
// listing's bytes over ANT_DRIVER_RANGES alone, for every button of the music player (ANT_TUNES)
// and of the effects player (ANT_EFFECTS). Here the same driver runs on the kit's simulator over
// the listing's whole memory, with the SID's data bus answering reads as VICE's does
// (C64Sid.engine().createBus), and is scheduled again from the game's timers: silence_sid ($B43F),
// the button's tracks put in music_request ($035E-$0360), then music_tick ($AFC5) every tempo
// latch + 1 cycles and sound_tick ($B47D) every 10,001 cycles of timer A, which stops while
// music_tick runs between its two stores to $DC0E. Both must write the same values to the same
// registers in the same order in every step of ANT_STEP cycles, for 60 seconds of each button or
// until it ends, and end on the same step. Discoveries carries the same block, which sameBlock
// holds to index.html's. It exits 1 on any difference.
//   node games/c64/the-sacred-armour-of-antiriad/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('ant-music');
const { createDriver, ANT_TUNES, ANT_EFFECTS, ANT_DRIVER_RANGES, ANT_STEP } =
  g.run(page, 'ant-music', 'createDriver', 'ANT_TUNES', 'ANT_EFFECTS', 'ANT_DRIVER_RANGES', 'ANT_STEP');
g.lib('sid');
const L = g.listing();
const STEPS = Math.ceil(60 * 985248 / ANT_STEP);
const mem = ANT_DRIVER_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
let bad = 0, steps = 0, buttons = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [list, set] of [[ANT_TUNES, 'music'], [ANT_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const bus = C64Sid.engine().createBus('8580');
  let stopAt = 0, held = 0;
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) {
      if (a >= 0xD400 && a <= 0xD418) { frame.w.push(a - 0xD400, v); bus.write(v, cpu.cycles); return; }
      if (a === 0xDC0E) { if (v & 1) held += cpu.cycles - stopAt; else stopAt = cpu.cycles; return; }
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const call = (a) => cpu.call(a, { a: 0, x: 0, y: 0 });
  call(0xB43F);
  c.tracks.forEach((n, v) => { if (n) m[0x035E + v] = n; });
  const pB = (c.tempo || 0x5161) + 1, on = () => [0, 1, 2].some((v) => (m[0x0355 + v] | m[0x035E + v]) & 0x80);
  let tA = 0, tB = 0;
  const drv = createDriver({ mem, tunes: list, step: ANT_STEP }, kit);
  drv.init(t);
  buttons++;
  for (let s = 0; s < STEPS; s++) {
    frame.w = [];
    const end = (s + 1) * ANT_STEP;
    while (Math.min(tA, tB) < end) {
      if (tB <= tA) { held = 0; call(0xAFC5); tA += held; tB += pB; } else { call(0xB47D); tA += 10001; }
    }
    drv.play();
    steps++;
    if (frame.w.join() !== drv.writes.join()) { fail(set, c.name, 'step ' + s, frame.w.join(), '|', drv.writes.join()); break; }
    if (on() !== drv.playing()) { fail(set, c.name, 'step ' + s, on() ? 'still plays' : 'has ended'); break; }
    if (!on()) break;
  }
});
console.log(`${buttons} buttons, ${steps} steps of ${ANT_STEP} cycles: ` + (bad ? bad + ' differences' : 'every write matches the driver'));
process.exit(bad ? 1 : 0);
