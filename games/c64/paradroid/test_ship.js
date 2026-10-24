#!/usr/bin/env node
// The ship roll (pd-ship, index.html) against the game's own build_ship ($15E8) on the listing's
// bytes in the kit's 6502: the population table at $0400-$04FF, the count of robots at $68, the
// ship's number at $67 and how many random bytes it read from $D41B, for each ship the game can
// follow (0 to 9 before it) with 60 random streams, and with every read giving the same byte.
//   node games/c64/paradroid/test_ship.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { buildShip } = g.run('index.html', 'pd-ship', 'buildShip');
const L = g.listing();
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };

function check(prev, next) {
  const m = L.ram.slice();
  let k = 0;
  const io = { read(a) { if (a === 0xD41B) { k++; return next(); } throw new Error('build_ship read $' + a.toString(16)); }, write(a) { throw new Error('build_ship wrote $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
  m[0x67] = prev;
  cpu.call(0x15E8, {});
  return { table: Array.from(m.slice(0x400, 0x500)).join(), count: m[0x68], ship: m[0x67], reads: k };
}
for (let prev = 0; prev < 10; prev++) for (let s = 1; s <= 60; s++) {
  const seq = [];
  let seed = s * 7919 + prev;
  for (let i = 0; i < 400; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seq.push((seed >>> 0) & 255); }
  let i = 0, j = 0;
  const got = check(prev, () => seq[i++]);
  const p = buildShip(L.ram, prev, () => seq[j++]);
  cases++;
  if (got.table !== Array.from(p.table).join() || got.count !== p.count || got.ship !== p.ship || got.reads !== j)
    fail(`after ship ${prev}, stream ${s}: the game ${got.count} robots on ship ${got.ship} in ${got.reads} reads, the page ${p.count} on ${p.ship} in ${j}`);
}
for (const v of [0x00, 0xFF, 0x0F, 0x03, 0x0C]) for (let prev = 0; prev < 9; prev++) {
  const got = check(prev, () => v);
  const p = buildShip(L.ram, prev, () => v);
  cases++;
  if (got.table !== Array.from(p.table).join() || got.count !== p.count)
    fail(`after ship ${prev}, every byte $${v.toString(16)}: the game ${got.count} robots, the page ${p.count}`);
}
if (bad) { console.log(`test_ship: ${bad} failed of ${cases}`); process.exit(1); }
console.log(`test_ship: ${cases} ships rolled as the game rolls them`);
