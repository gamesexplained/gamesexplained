#!/usr/bin/env node
// The starting hostilities on the Discoveries tab (am-libya, discoveries.html) against the game's
// own relations_init ($951B) and relations_all_up ($7E0D), as a new game runs them (new_game, then
// the first week's end), on the listing's bytes in the kit's 6502, with random ($7BAE) answered by
// the test: 500 games' random numbers, every country's row compared.
//   node games/c64/the-armageddon-man/test_libya.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { amStartRow } = g.run('discoveries.html', 'am-libya', 'amStartRow');
const L = g.listing();
const LEVELS = L.ram.slice(0x958C, 0x958C + 512);
let bad = 0, rows = 0, libyaHot = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
let seed = 20261030;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
for (let t = 0; t < 500; t++) {
  const numbers = Array.from({ length: 512 }, () => rnd() & 0xFF);
  const m = L.ram.slice();
  const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 } });
  let k = 0;
  cpu.call(0x951B, {}, { hooks: { 0x7BAE: (c) => { c.a = numbers[k++]; c.rts(); } } });
  if (k !== 512) fail(`game ${t}: relations_init took ${k} random numbers`);
  cpu.call(0x7E0D, {});
  for (let a = 0; a < 16; a++) {
    let j = 32 * a;
    const got = amStartRow(LEVELS, a, () => numbers[j++]), want = Array.from(m.slice(0x5C5C + 16 * a, 0x5C5C + 16 * a + 16));
    rows++;
    if (got.join() !== want.join()) fail(`game ${t}, country ${a}: the game ${want.join()}, the page ${got.join()}`);
    if (a === 4) libyaHot += want.filter((h, b) => b !== 4 && h >= 241).length;
  }
}
if (bad) { console.log(`test_libya: ${bad} failed`); process.exit(1); }
console.log(`test_libya: ${rows} rows of 500 games, every one the game's; Libya started at 241 or more to ${(libyaHot / 500).toFixed(1)} countries a game`);
