#!/usr/bin/env node
// Hold the page's tune player against the game's code. index.html's nes-music block (createDriver)
// runs the title tune's driver on the kit's 6502, handed in as sid.js hands it, over the bytes the
// page gives it: the driver's zero page $10-$21, its code $9680-$9FEE and its data $F000-$F768.
// The same calls on the simulator itself, over the whole of the engine's listing with I/O in
// ($01 = $35, which maps memory as the opening's $05 does), must write the same values to the same
// SID registers in the same order, frame by frame: the opening's MUSIC_STOP ($96A1) and MUSIC_INIT
// ($96DA) with VOLUME ($F082) at 12, as the game loads it, then MUSIC_PLAY ($9695) once a frame
// for 25,000 frames, two passes of the tune and the start of a third; then MUSIC_STOP, as a key
// press makes it ($15CC). The driver must read nothing outside the ranges the page gives it, and
// no SID register. (On the snapshot taken at $0400, before the opening has run, the same calls
// make the same writes for 30,000 frames: the listing differs from the game as it loads only in
// bytes MUSIC_INIT sets again, and the volume.)
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/c64/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createDriver } = g.run(page, 'nes-music', 'createDriver');
const L = g.listing('parts/engine/listing.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

const RANGES = [[0x0010, 0x0021], [0x9680, 0x9FEE], [0xF000, 0xF768]];
// the game's side: the listing's memory, the SID's writes kept in order
const m = L.ram.slice(), w = [];
m[0xF082] = 12;
const io = {
  read(a) { throw new Error('the driver read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD400 && a <= 0xD41F) w.push(a & 31, v); else throw new Error('write $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
const reads = new Uint8Array(0x10000), opts = { reads, maxSteps: 200000 };
// the page's side: the data the page gives the driver
const drv = createDriver({ mem: RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]) }, kit);
const same = (what) => { if (w.join() !== drv.writes.join()) fail(what, w.join(), '|', drv.writes.join()); w.length = 0; };

cpu.call(0x96A1, {}, opts); cpu.call(0x96DA, {}, opts); drv.init();
// init's writes stay in the driver's list until its first play(), so they are compared with frame 0's
const FRAMES = 25000;
let notes = 0;
for (let f = 0; f < FRAMES; f++) {
  cpu.call(0x9695, {}, opts); drv.play();
  for (let k = 0; k < w.length; k += 2) if (w[k] === 4 && w[k + 1] & 1) notes++;
  same('frame ' + f);
  if (!drv.playing()) fail('the port stopped at frame', f);
}
cpu.call(0x96A1, {}, opts); drv.stop(); same('the stop');
if (drv.playing()) fail('the port plays on after the stop');
for (let a = 0; a < 0x10000; a++) {
  if (!reads[a] || (a >= 0x100 && a < 0x200)) continue;
  if (!RANGES.some(([lo, hi]) => a >= lo && a <= hi)) fail('the driver read $' + a.toString(16) + ', which the page does not give it');
}
if (notes < 1000) fail('only', notes, 'gate writes on voice 1: the tune did not play');
console.log(`${FRAMES} frames of the title tune and its stop: ` + (bad ? bad + ' differences' : 'every write matches') + `; ${notes} gate-on writes to voice 1`);
process.exit(bad ? 1 : 0);
