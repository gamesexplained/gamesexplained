#!/usr/bin/env node
// The terrain widget's copy of terrain_at (ex-terrain, index.html) against the game's own routine
// ($32D6), on the listing's bytes in the kit's 6502, with zero page as zp_init copies it from
// zp_image ($0C92). For 72 edge pairs (0, 1, 127, 128, 255, 256, $7FFF, $8000, $FFFF and the like)
// and 200,000 random ones, the probe ($20-$23) is set to east and north, the routine is called
// with the carry either way, and the kind ($26), the height ($24) and the last layer's sum ($29)
// it leaves are compared with the page's answer.
//   node games/c64/explorer/test_terrain.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { makeTerrain } = g.run('index.html', 'ex-terrain', 'makeTerrain');
const L = g.listing();
const m = L.ram;
for (let i = 0; i < 256; i++) m[i] = m[0x0C92 + i];
const T = makeTerrain(L.bytes(0x341B, 40), L.bytes(0x4700, 256));
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
let seed = 1, bad = 0, n = 0;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const cases = [];
for (const x of [0, 1, 2, 127, 128, 255, 256, 0x7FFF, 0x8000, 0xFFFF, 0xFF00, 0x00FF])
  for (const y of [0, 1, 128, 0x8000, 0xFFFF, 12345]) cases.push([x, y]);
for (let i = 0; i < 200000; i++) cases.push([rnd() & 0xFFFF, rnd() & 0xFFFF]);
const kinds = {};
for (const [x, y] of cases) {
  m[0x20] = x & 255; m[0x21] = x >> 8; m[0x22] = y & 255; m[0x23] = y >> 8;
  cpu.call(0x32D6, { a: 0, x: 0, y: 0, c: rnd() & 1 }, { maxSteps: 100000 });
  const got = { kind: m[0x26], height: m[0x24] | m[0x25] << 8, last: m[0x29] | m[0x2A] << 8 }, p = T.terrainAt(x, y);
  kinds[p.kind] = (kinds[p.kind] || 0) + 1; n++;
  if (got.kind !== p.kind || got.height !== p.height || got.last !== p.last)
    fail(`${x} east, ${y} north: the game gives ${JSON.stringify(got)}, the page ${JSON.stringify(p)}`);
}
for (const k of [0, 2, 4, 6, 8, 10]) if (!kinds[k]) fail(`the cases never met kind ${k}`);
if (bad) { console.log(`test_terrain: ${bad} failed`); process.exit(1); }
console.log(`test_terrain: ${n} points, every kind, height and last sum as the game works them out`);
