#!/usr/bin/env node
// Hold the page's Hall of Fame name box (the rd-names block of discoveries.html, hofCheck) against the
// game's own routines run in kit/c64/cpu6502.js over the committed listing: the rude-word filter
// at $2103 and the code words at $2146, with the name on screen at $C306 and random bytes in the
// 246 screen bytes after it, which the filter can read. The cases: every name the page offers,
// the code words, every rude word alone and spread through other letters, and 3,000 random names
// of the letters the name entry offers. The ten bytes left at $C306 and the flags $37 and $53 must
// agree. Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_names.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const { hofCheck } = g.run('discoveries.html', 'rd-names', 'hofCheck');
const ram = g.listing().ram;
let seed = 20261013;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const ALPHA = [...Array(26)].map((_, i) => 0x41 + i).concat([0x2E, 0x00]);
const codes = (s) => Array.from(s).map((ch) => (ch === ' ' ? 0 : ch.charCodeAt(0)));
const cases = [];
for (const s of ['SHIFT', 'ARSENAL', 'BROTHERS', 'SHIRT', 'BBOOIINNGG', 'FLUFOMATIC', 'RICK', 'DANGERSTU', 'XXXXXXSHIT', 'FXUXCXK'])
  cases.push(codes(s));
const RUDE = 'FUCKCUNTPISSSHITCRAPFARTWANKBASTBOLLARSEBROS';
for (let w = 0; w < RUDE.length; w += 4) {
  cases.push(codes(RUDE.substr(w, 4)));
  cases.push(codes(RUDE[w] + 'A' + RUDE[w + 1] + RUDE[w + 2] + 'E' + RUDE[w + 3]));
}
for (let i = 0; i < 3000; i++) {
  const n = 1 + rnd(10), c = [];
  for (let k = 0; k < n; k++) c.push(ALPHA[rnd(ALPHA.length)]);
  cases.push(c);
}
let bad = 0, rude = 0;
for (const name of cases) {
  const after = Array.from({ length: 246 }, () => (rnd(4) === 0 ? ALPHA[rnd(26)] : rnd(256)));
  const m = Uint8Array.from(ram);
  for (let i = 0; i < 10; i++) m[0xC306 + i] = name[i] === undefined ? 0x3B : name[i];
  for (let i = 0; i < 246; i++) m[0xC310 + i] = after[i];
  m[0x37] = 0; m[0x53] = 0;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 } });
  cpu.call(0x2103, {});
  cpu.call(0x2146, {});
  const r = hofCheck(name, after);
  const game10 = Array.from(m.slice(0xC306, 0xC310));
  if (game10.join() !== r.name.join() || (m[0x37] !== 0) !== r.select || (m[0x53] !== 0) !== r.cheat) {
    if (bad++ < 8) console.log('DIFFERS', name.join(','), 'game', game10.join(','), m[0x37], m[0x53], 'page', r.name.join(','), r.select, r.cheat);
  }
  if (r.rude) rude++;
}
console.log(`${cases.length} names, ${rude} caught as rude: ${bad ? bad + ' differ' : 'the page agrees with the game on every one'}`);
process.exit(bad ? 1 : 0);
