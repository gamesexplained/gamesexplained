#!/usr/bin/env node
// The map widget's lookup (a2-map, index.html) against the game's own, map_square_check ($14AF),
// on the listing's bytes in the kit's 6502: for every position on the map (the top bytes 0-239
// across and 0-95 down, each with a random middle byte), plane one's record is set there with the
// last ground ($6A) different from both answers, the routine is called, and what it stores in
// $6A and record byte 7 ($0307) is compared with the page's answer: sea (1) and land (3) are
// stored, the other two leave both alone. The view redraw ($46B6) and the message routine ($34F8)
// are stood in for.
//   node games/c64/ace-2/test_map.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { a2Ground } = g.run('index.html', 'a2-map', 'a2Ground');
const L = g.listing();
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
let bad = 0, n = 0, seed = 2468;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) & 255; };
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const seen = [0, 0, 0, 0];
for (let y = 0; y < 96; y++) for (let x = 0; x < 240; x++) {
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  m[0xD1] = 0; m[0x0262] = 0;
  m[0x0296] = rnd(); m[0x029C] = x; m[0x02A8] = rnd(); m[0x02AE] = y;
  m[0x6A] = 0x80; m[0x0307] = 0x77;
  cpu.call(0x14AF, Z, { maxSteps: 10000, hooks: { 0x46B6: () => true, 0x34F8: () => true } });
  const k = a2Ground(m, x, y);
  seen[k]++; n++;
  const want6A = k === 1 ? 0x40 : k === 3 ? 0xC0 : 0x80, want07 = k === 1 ? 0 : k === 3 ? 1 : 0x77;
  if (m[0x6A] !== want6A || m[0x0307] !== want07)
    fail(`across ${x}, down ${y}: the page says ${k}, the game left $6A = ${m[0x6A].toString(16)} and $0307 = ${m[0x0307].toString(16)}`);
}
if (!seen[1] || !seen[3]) fail('the cases never met both sea and land');
if (bad) { console.log(`test_map: ${bad} failed`); process.exit(1); }
console.log(`test_map: ${n} positions (${seen[1]} sea, ${seen[3]} land, ${seen[0] + seen[2]} neither), every one as the game reads it`);
