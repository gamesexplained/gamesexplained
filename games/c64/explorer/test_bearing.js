#!/usr/bin/env node
// The bearing widget's copy of bearing_of (ex-bearing, discoveries.html) against the game's own
// routine ($383F), on the listing's bytes in the kit's 6502, with zero page as zp_init copies it
// from zp_image ($0C92). For 196 pairs of edge distances (0, 1, 15, 16, 255, 256, $7FFF, $8000,
// $FFFF and the like) and 100,000 random ones of four sizes and both signs, the distances east
// ($64) and north ($66) are set, the routine is called, and the bearing it leaves at $68 is
// compared with the page's answer. The page's copy keeps the game's south-west quarter, so the
// test also holds one known reading: 304 west and 800 south gives 249, as the sonar said in the
// emulator.
//   node games/c64/explorer/test_bearing.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { makeBearing } = g.run('discoveries.html', 'ex-bearing', 'makeBearing');
const L = g.listing();
const m = L.ram;
for (let i = 0; i < 256; i++) m[i] = m[0x0C92 + i];
const B = makeBearing(L.bytes(0x39B3, 128), L.bytes(0x3A37, 6));
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
let seed = 7, bad = 0, n = 0;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const cases = [], edge = [0, 1, 2, 15, 16, 255, 256, 1000, 0x7FFF, 0x8000, 0x8001, 0xFFFF, 0xFFF0, 0xFF00];
for (const x of edge) for (const y of edge) cases.push([x, y]);
for (let i = 0; i < 100000; i++) {
  const k = rnd() % 4, mask = [0xFFFF, 0x0FFF, 0x00FF, 0x3FFF][k];
  let x = rnd() & mask, y = rnd() & mask;
  if (rnd() & 1) x = -x & 0xFFFF;
  if (rnd() & 1) y = -y & 0xFFFF;
  cases.push([x, y]);
}
for (const [x, y] of cases) {
  m[0x64] = x & 255; m[0x65] = x >> 8; m[0x66] = y & 255; m[0x67] = y >> 8;
  cpu.call(0x383F, { a: 0, x: 0, y: 0, c: 0 }, { maxSteps: 100000 });
  const got = m[0x68] | m[0x69] << 8, p = B(x, y);
  n++;
  if (got !== p) fail(`${x} east, ${y} north (16 bits): the game gives ${got}, the page ${p}`);
}
if (B(-304, -800) !== 249) fail(`304 west and 800 south gives ${B(-304, -800)}; the sonar said 249`);
if (bad) { console.log(`test_bearing: ${bad} failed`); process.exit(1); }
console.log(`test_bearing: ${n} pairs, every bearing as the game works it out`);
