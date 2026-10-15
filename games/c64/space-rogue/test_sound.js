'use strict';
// Holds How it works' effect player (sr-sound, createDriver) against the engine's sound_init (067),
// sound_play (091) and sound_step (0D2), run in the kit's 6502 simulator on the committed
// listing: every SID register write, frame by frame, for the 14 effects, the hum at several speeds
// and effects started over the hum. The tunes are the page's.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const { createDriver } = g.run('index.html', 'sr-sound', 'createDriver');
const E = g.listing('parts/engine/listing.json');
const col = (a) => Array.from(E.ram.subarray(a, a + 14));
const t = { voice: col(0x11AD), freq: col(0x11BB), slo: col(0x11C9), shi: col(0x11D7), ad: col(0x11E5), sr: col(0x11F3),
  wave: col(0x1201), len: col(0x120F), goff: col(0x121D), rep: col(0x122B) };
const ramp = [[0, 1], [30, 2]]; for (let s = 3; s <= 70; s++) ramp.push([30 + 6 * (s - 2), s]);
const tunes = [...Array(14).keys()].map(n => ({ fx: n }));
tunes.push({ hum: [[0, 5]], frames: 150 }, { hum: [[0, 70]], frames: 150 }, { hum: ramp, frames: 30 + 6 * 68 + 100 }, { hum: [[0, -40]], frames: 100 });
// effects started while the hum runs: effect 3 on voice 1 between its repeats
tunes.push({ hum: [[0, 40]], frames: 300, at: [[20, 3], [150, 13], [200, 4]] });
const D = { t, tunes };
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
tunes.forEach((T, n) => {
  const m = new Uint8Array(E.ram); let writes = [];
  const io = { read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  cpu.call(0x1067, {});
  if (T.fx !== undefined) cpu.call(0x1091, { a: T.fx }); else m[0x1E] = 0xFF;
  let first = writes;
  const drv = createDriver(D); drv.init(n);
  const busy = () => [0, 1, 2].some(x => m[0x28 + x] || (m[0x2B + x] && !(m[0x2B + x] & 0x80)));
  let f = 0;
  for (; f < 2000; f++) {
    if (T.fx !== undefined && !busy()) break;
    if (T.hum && f >= T.frames) break;
    writes = [];
    if (T.hum) for (const [at, s] of T.hum) if (at === f) m[0x0415] = s & 255;
    if (T.at) for (const [at, k] of T.at) if (at === f) cpu.call(0x1091, { a: k });
    cpu.call(0x10D2, {});
    const gm = first.concat(writes); first = [];
    drv.play();
    if (gm.join() !== drv.writes.join()) fail(n, 'frame', f, 'game', gm.join().slice(0, 150), 'page', drv.writes.join().slice(0, 150));
    if (drv.playing() !== (T.fx !== undefined ? busy() : f + 1 < T.frames)) fail(n, 'frame', f, 'playing() disagrees');
  }
  });
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_sound: every SID write of ' + tunes.length + ' effects and hums matches sound_step, frame by frame');
