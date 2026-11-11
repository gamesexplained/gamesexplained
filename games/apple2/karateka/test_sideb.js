#!/usr/bin/env node
// The Discoveries tab's side B, reference/sideb.js. Side B is not in the listings, so this file
// holds the page's side B to what the disk's side B gave, by SHA-256 (the bytes are the game's):
//   - the two tables of row addresses the page turns over are side B's 384 bytes at $0800,
//   - the castle picture with its rows turned over is side B's 8,192 bytes at $A000,
//   - the leftover sector is the one side B's track 6 gave, and its date reads as the page says.
// Each hash is of the bytes the game's own loader read from that side of the disk in Apple2TS
// (work/*.reads.json, 10 November 2026; orientation.md, "The image"). Then every place of the four
// stages is run on both sides: with the tables turned over, the game's code must draw the same
// picture with its rows in reverse order, which is what Apple2TS showed of the two sides' titles
// (facts.md, "Live tests").
//   node games/apple2/karateka/test_sideb.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('apple2');
const { KarStages } = g.run('reference/stages.js', 'stages.js', 'KarStages');
globalThis.KarStages = KarStages;
const { KarSideB } = g.run('reference/sideb.js', 'sideb.js', 'KarSideB');
const DISK = {                         // SHA-256 of what each side of the disk gave
  tablesA: '5ddd841d21fc464c', tablesB: 'dc5ffe88a4978e00',
  castleA: '9ddb0489ba62729c', castleB: '3dd95c1faa23a6de',
  leftover: '06a2f00c46047ef3',
};
const hash = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');
const Ls = {};
for (const p of ['engine', 'cliff', 'palace', 'dungeon', 'akuma']) Ls[p] = g.listing(`parts/${p}/listing.json`);
let bad = 0;
const same = (what, got, want) => { if (got !== want) { bad++; console.log(`FAIL ${what}: ${got}, the disk gave ${want}`); } };

const m = KarStages.start(Ls, 'cliff').m;
const tables = () => hash(m.subarray(KarSideB.ROW_LO, KarSideB.ROW_HI + KarSideB.ROWS));
same('side A\'s row tables in the listing', tables(), DISK.tablesA);
KarSideB.turn(m);
same('the row tables turned over', tables(), DISK.tablesB);
same('the castle picture, side A', hash(KarSideB.castle('a')), DISK.castleA);
same('the castle picture, side B', hash(KarSideB.castle('b')), DISK.castleB);
same('the leftover sector', hash(KarSideB.leftover()), DISK.leftover);
same('the leftover sector\'s date', KarSideB.date(KarSideB.leftover()), '07/27/82');

// The sector's map names every kind the page's legend does, and what it leaves out is zeros
const kinds = new Set(KarSideB.MAP.map(r => r[2]));
for (const k of ['date', 'today', 'free', 'fill']) if (!kinds.has(k)) { bad++; console.log(`FAIL the sector's map has no ${k}`); }
const sector = KarSideB.leftover(), mapped = new Uint8Array(256);
for (const [a, b] of KarSideB.MAP) mapped.fill(1, a, b + 1);
sector.forEach((v, i) => {
  if (!mapped[i] && v) { bad++; console.log(`FAIL the sector's byte ${hex(i)} is ${hex(v)} and in no stretch of the map`); }
});

const shown = s => {
  const off = s.page === 2 ? 0x2000 : 0, rows = [];
  for (let y = 0; y < 192; y++) rows.push(Buffer.from(s.m.subarray(Apple2.hiresBase(y) + off, Apple2.hiresBase(y) + off + 40)));
  return rows;
};
let n = 0;
for (const S of KarStages.STAGES) S.places.forEach((P, k) => {
  const a = KarSideB.place(Ls, S.part, k, 'a'), b = KarSideB.place(Ls, S.part, k, 'b'), ra = shown(a), rb = shown(b);
  let eq = 0;
  for (let y = 0; y < 192; y++) if (ra[y].equals(rb[191 - y])) eq++;
  n++;
  if (a.flips !== b.flips || a.page !== b.page || eq !== 192 || !ra.some(r => r.some(v => v & 0x7F))) {
    bad++;
    console.log(`FAIL ${S.part}/${k} (${P.name}): side B at flip ${b.flips}, page ${b.page}, ${eq} of 192 rows are side A's in reverse; side A at flip ${a.flips}, page ${a.page}`);
  }
});
if (bad) process.exit(1);
console.log(`test_sideb: the tables, the castle and the leftover sector are side B's, and all ${n} places draw side A's picture upside down`);
