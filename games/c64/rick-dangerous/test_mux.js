#!/usr/bin/env node
// Hold the page's multiplex (the rd-mux block of index.html) against the game's own sprite sort
// ($3559) and placing ($36D9), and the two raster handlers that reuse sprites ($3831, $387D) run
// through the game's interrupt entry ($3A0D), in kit/c64/cpu6502.js over the committed listing:
// 3,000 random rooms of ten objects. The order, the six sprites, the reused objects, the start of
// the raster list, the split lines, every sprite X and $D010 at the top, after the first split and
// after the second must agree. Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_mux.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const ram = g.listing().ram;
const { multiplex } = g.run('index.html', 'rd-mux', 'multiplex');
let seed = 20261014;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
let bad = 0, n = 0, reused = [0, 0, 0, 0, 0];
for (let r = 0; r < 3000; r++) {
  const vic = new Uint8Array(0x2F);
  const m = Uint8Array.from(ram);
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 },
    io: { read: (a) => (a >= 0xD000 && a <= 0xD02E ? vic[a - 0xD000] : 0), write: (a, v) => { if (a >= 0xD000 && a <= 0xD02E) vic[a - 0xD000] = v; } } });

  const order = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (let i = 9; i > 0; i--) { const j = rnd(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  const y = [], x = [], shown = [];
  const many = rnd(3);
  for (let k = 0; k < 12; k++) {
    shown[k] = k < 2 ? 1 : (rnd(10) < 4 + 3 * many ? 1 : 0);
    y[k] = shown[k] ? 50 + rnd(160) : (rnd(3) ? 0xF9 : rnd(256));
    x[k] = rnd(5) ? rnd(0xE6) : 0xC0 + rnd(0x26);
  }
  y[1] = y[0]; x[1] = x[0];
  for (let k = 0; k < 10; k++) m[0xB5CA + k] = order[k];
  for (let k = 0; k < 12; k++) { m[0xB580 + k] = y[k]; m[0xB58C + k] = x[k]; m[0xB5BC + k] = shown[k]; }
  const keep = [m[0x397C], m[0x397D]];
  const p = multiplex({ order, y, x, shown }, keep);
  cpu.call(0x3559, {}); cpu.call(0x36D9, {});
  const top = vic[0x10];
  // the game's dispatcher, with a list of two handlers at $0340
  const handler = (h) => { m[0x0340] = h; m[0x0341] = 3; m[0x02] = 0x40; m[0x03] = 0x03; m[0x3A18] = 0; cpu.pc = 0x1000; cpu.irq(0x3A0D); };
  let ab = top, cd = top;
  if (m[0x3A42] >= 2) { handler(0); ab = vic[0x10]; cd = ab; }
  if (m[0x3A42] >= 5) { handler(1); cd = vic[0x10]; }
  const g = { order: Array.from(m.slice(0xB5CA, 0xB5D4)), sprites: Array.from(m.slice(0x3956, 0x395C)), reuse: Array.from(m.slice(0x395C, 0x395C + m[0x3979])),
    listStart: m[0x3A42], split1: m[0x18], split2: m[0x19], msb: top, msbAB: ab, msbCD: cd,
    sx: [...p.sprites, ...p.reuse, 0, 1].map((k) => m[0x3930 + k]) };
  const q = { order: p.order, sprites: p.sprites, reuse: p.reuse, listStart: p.listStart, split1: p.split1, split2: p.split2, msb: p.msb, msbAB: p.msbAB, msbCD: p.msbCD,
    sx: [...p.sprites, ...p.reuse, 0, 1].map((k) => p.sx[k]) };
  n++; reused[p.reuse.length]++;
  if (JSON.stringify(g) !== JSON.stringify(q)) { if (bad++ < 5) console.log('DIFFERS', r, '\n game', JSON.stringify(g), '\n page', JSON.stringify(q)); }
}
console.log(`${n} rooms (reusing 0-4 sprites: ${reused.join(', ')}): ${bad ? bad + ' differ' : 'every one matches'}`);
process.exit(bad ? 1 : 0);
