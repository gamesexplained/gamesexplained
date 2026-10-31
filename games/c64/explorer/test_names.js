#!/usr/bin/env node
// The doorway widgets' sums against the game's own, name_destination's $0E48-$0F31, on the
// listing's bytes in the kit's 6502, with zero page as zp_init copies it from zp_image ($0C92):
// the place a name goes to (ex-names, on both pages) and the energy change the game works out and
// never stores (ex-refill, discoveries.html). For six names chosen by hand, a name of 31 letters
// and 20,000 random names of 1 to 31 letters, digits and stops, each from a random grid cell, the
// name goes into name_buf ($7B, a zero after it) and its length into name_len ($7A), the cell
// into cell_x ($33) and cell_y ($35), and the routine runs from $0E48 to $0F32. The position it
// leaves in pos_x ($19) and pos_y ($1B) and the change it leaves in we ($0E) are compared with
// the pages' answers.
//   node games/c64/explorer/test_names.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
g.sameBlock('ex-names');
const { namePlace } = g.run('index.html', 'ex-names', 'namePlace');
const { doorwayEnergy } = g.run('discoveries.html', 'ex-refill', 'doorwayEnergy');
const L = g.listing();
const m = L.ram;
for (let i = 0; i < 256; i++) m[i] = m[0x0C92 + i];
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
let seed = 99, bad = 0, n = 0;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-';
const names = ['HOME', 'A', 'Z', 'EXPLORER', 'ELECTRIC DREAMS', 'GRAHAM RELF', 'X'.repeat(31)];
for (let i = 0; i < 20000; i++) {
  let t = '';
  for (let j = 1 + rnd() % 31; j > 0; j--) t += alpha[rnd() % alpha.length];
  names.push(t);
}
for (const nm of names) {
  for (let i = 0; i < 32; i++) m[0x7B + i] = i < nm.length ? nm.charCodeAt(i) : 0;
  m[0x7A] = nm.length;
  const cx = rnd() & 0xFFF0, cy = rnd() & 0xFFF0;
  m[0x33] = cx & 255; m[0x34] = cx >> 8; m[0x35] = cy & 255; m[0x36] = cy >> 8;
  cpu.call(0x0E48, { a: 0, x: 0, y: 0, c: rnd() & 1 }, { maxSteps: 100000, hooks: { 0x0F32: () => true } });
  const got = { x: m[0x19] | m[0x1A] << 8, y: m[0x1B] | m[0x1C] << 8 }, p = namePlace(nm);
  const change = m[0x0E] | m[0x0F] << 8, e = doorwayEnergy(nm.length, cx, cy, p.x, p.y);
  n++;
  if (got.x !== p.x || got.y !== p.y) fail(`${JSON.stringify(nm)}: the game goes to ${got.x}, ${got.y}, the page to ${p.x}, ${p.y}`);
  if (change !== e) fail(`${JSON.stringify(nm)} from ${cx}, ${cy}: the game works out ${change}, the page ${e}`);
}
const home = namePlace('HOME');
if (home.x !== 48356 || home.y !== 48609) fail(`HOME is ${home.x}, ${home.y}; the emulator arrived at 48356, 48609`);
if (bad) { console.log(`test_names: ${bad} failed`); process.exit(1); }
console.log(`test_names: ${n} names, every one to the place the game sends it, with the energy change it works out`);
