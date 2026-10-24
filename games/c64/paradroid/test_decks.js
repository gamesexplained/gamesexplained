#!/usr/bin/env node
// The decks the pages draw against the game's own code on the listing's bytes in the kit's 6502:
//   deckMap   PD.deckMap (pd-core, on all three pages) against build_deck ($3590) for each of the
//             16 decks: the 64 rows of 256 characters it builds at $8000-$BFFF
//   lifts     pdLifts (pd-lifts, levels.html): each lift's cell, 21 columns and 9 rows in from the
//             view the lift tables give, holds the lift's character $2B, and a deck has no other
//   node games/c64/paradroid/test_decks.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const shared = g.sameBlock('pd-core');
const { PD } = g.run('index.html', 'pd-core', 'PD');
globalThis.PD = PD;
const { pdLifts } = g.run('levels.html', 'pd-lifts', 'pdLifts');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const io = { read(a) { throw new Error('build_deck read $' + a.toString(16)); }, write(a) { throw new Error('build_deck wrote $' + a.toString(16)); } };
let lifts = 0;
for (let d = 0; d < 16; d++) {
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
  m[0x33] = d;
  cpu.call(0x3590, {});
  const map = PD.deckMap(L.ram, d);
  for (let i = 0; i < 0x4000; i++) if (m[0x8000 + i] !== map[i]) {
    fail(`deck ${d}: row ${i >> 8} column ${i & 255}: the game builds ${m[0x8000 + i]}, the page ${map[i]}`);
    break;
  }
  const ls = pdLifts(L.ram, d);
  let n = 0;
  for (let i = 0; i < 0x4000; i++) if (map[i] === 0x2B) n++;
  for (const l of ls) if (map[l.row * 256 + l.col] !== 0x2B) fail(`deck ${d}: lift entry ${l.entry} at row ${l.row} column ${l.col} is on character ${map[l.row * 256 + l.col]}`);
  if (n !== ls.length) fail(`deck ${d}: ${n} lift characters on the map, ${ls.length} lifts in the tables`);
  lifts += ls.length;
}
if (bad) { console.log(`test_decks: ${bad} failed`); process.exit(1); }
console.log(`test_decks: 16 decks built as the game builds them, ${lifts} lifts on their own cells; pd-core the same on ${shared.pages.length} pages`);
