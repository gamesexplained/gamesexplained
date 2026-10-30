#!/usr/bin/env node
// Hold the page's music players against the game's own music drivers. index.html's wg-music block
// (createDriver) runs each part's driver on the kit's 6502 over the part's ranges in WG_MUSIC
// alone; here the same driver runs on the kit's simulator over the part's whole listing, with the
// SID's data bus answering reads as VICE's does (C64Sid.engine().createBus) and voice 3's
// oscillator a different number each frame, and is called as the part calls it: its entry that
// builds the note table and silences the chip, the volume at 15 as the page sets it, the tune in
// A and the entry that starts it, then the play entry once a frame. For every button of every part
// both must write the same values to the same registers in the same order in every frame, for
// 3,000 frames or until the tune ends, and end on the same frame. The wg-anthems block
// (createAnthems) is held the same way to the menu's anthem player: init_sound ($1E34),
// start_tune ($1E71) with the country's place in Y, two calls of anthem_step ($1EA2) a frame, to
// each anthem's end. It exits 1 on any difference.
//   node games/c64/world-games/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, WG_MUSIC } = g.run(page, 'wg-music', 'createDriver', 'WG_MUSIC');
const { createAnthems, WG_ANTHEM_RANGES, WG_ANTHEMS } = g.run(page, 'wg-anthems', 'createAnthems', 'WG_ANTHEM_RANGES', 'WG_ANTHEMS');
g.lib('sid');
const FRAMES = 3000, CYCLES = 19656;
let bad = 0, frames = 0, buttons = 0, notes = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
let seed = 0x2545F491;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed & 0xFF; };
for (const P of WG_MUSIC) {
  const L = g.listing(`parts/${P.id}/listing.json`);
  const mem = P.ranges.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
  P.tunes.forEach(([n, name], t) => {
    const m = L.ram.slice(), w = [];
    const bus = C64Sid.engine().createBus('8580');
    let osc3 = 0;
    const io = {
      read(a, cpu) { if (a >= 0xD400 && a <= 0xD41F) return (a & 31) === 0x1B ? osc3 : bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
      write(a, v, cpu) {                                        // the chip's 32 registers repeat to $D7FF
        if (a >= 0xD400 && a < 0xD800) { if ((a & 31) < 25) w.push(a & 31, v); bus.write(v, cpu.cycles); return; }
        throw new Error('write $' + a.toString(16));
      },
    };
    const cpu = new CPU(m, { port: 0x35, io });
    const call = (ad, a) => cpu.call(ad, { a: a || 0, x: 0, y: 0 }, { maxSteps: 200000 });
    const drv = createDriver({ mem, init: P.init, start: P.start, play: P.play, ptr: P.ptr, tunes: P.tunes.map((x) => x[0]) }, kit);
    call(P.init); io.write(0xD418, 15, cpu); call(P.start, n);
    drv.init(t);
    buttons++;
    const on = () => !!(m[P.ptr + 1] | m[P.ptr + 3] | m[P.ptr + 5]);
    for (let f = 0; f < FRAMES; f++) {
      osc3 = rnd();
      cpu.cycles += CYCLES;
      drv.readback(0, osc3, bus.read(0x19, cpu.cycles, 0));
      call(P.play);
      drv.play();
      frames++;
      for (let k = 0; k < w.length; k += 2) if (w[k] === 4 || w[k] === 11 || w[k] === 18) notes += w[k + 1] & 1;
      if (w.join() !== drv.writes.join()) { fail(P.id, n, name, 'frame ' + f, w.join(), '|', drv.writes.join()); break; }
      w.length = 0;
      if (on() !== drv.playing()) { fail(P.id, n, name, 'frame ' + f, on() ? 'still plays' : 'has ended'); break; }
      if (!on()) break;
    }
  });
}
// the menu's anthems
{
  const L = g.listing('parts/menu/listing.json');
  const mem = WG_ANTHEM_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
  WG_ANTHEMS.forEach((name, t) => {
    const m = L.ram.slice(), w = [];
    const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a, v) { if (a >= 0xD400 && a < 0xD800) { if ((a & 31) < 25) w.push(a & 31, v); return; } throw new Error('write $' + a.toString(16)); } };
    const cpu = new CPU(m, { port: 0x35, io });
    const call = (ad, y) => cpu.call(ad, { a: 0, x: 0, y: y || 0 }, { maxSteps: 100000 });
    const y = Array.from(L.ram.slice(0x1E8A, 0x1EA2)).indexOf(2 * t);
    if (y < 0) { fail('anthem', t, name, 'no country plays it'); return; }
    call(0x1E34); call(0x1E71, y);
    const drv = createAnthems({ mem }, kit);
    drv.init(t);
    buttons++;
    for (let f = 0; f < 20000; f++) {
      call(0x1EA2); call(0x1EA2); drv.play(); frames++;
      if (w.join() !== drv.writes.join()) { fail('anthem', t, name, 'frame ' + f, w.join(), '|', drv.writes.join()); break; }
      w.length = 0;
      if ((m[0x12] !== 0xFF) !== drv.playing()) { fail('anthem', t, name, 'frame ' + f, 'ends apart'); break; }
      if (m[0x12] === 0xFF) break;
    }
  });
}
if (!notes) fail('no tune started a note: the test compared silence');
console.log(`${buttons} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s drivers'));
process.exit(bad ? 1 : 0);
