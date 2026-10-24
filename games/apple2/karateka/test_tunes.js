#!/usr/bin/env node
// Hold reference/tunes.js, the Music section's tunes, to the game. Each tune runs the stage's own
// entry from the committed listings on the kit's 6502, through the engine's player at $0D00, as the
// page runs it, and every spacing between two clicks of the speaker must be what the game made in
// Apple2TS when the same entry ran there from the stage's snapshot, until the player returned
// (work/verify/tunes_live.py, 24 October 2026; facts.md, "Live tests"). LIVE below is that recording:
// the number of clicks and the SHA-256 of the spacings in cycles, written out with commas, since the
// longest tune is 16,806 clicks. Each stage that keeps the same tune at the same entry, as the page
// says, must click it the same, within the cycles below. It exits 1 on any difference.
//   node games/apple2/karateka/test_tunes.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { KarTunes } = g.run('reference/tunes.js', 'tunes.js', 'KarTunes');
const LIVE = {                         // name: [clicks, SHA-256 of the spacings], from Apple2TS
  "Akuma's chamber": [638, '4f32447dad56a38b'],
  'A game starts': [2169, 'd057d889245dfdda'],
  'The climb': [4127, '3d14b5410173c4b3'],
  'Akuma raises his arm': [679, '6f7b8e9d69d6fc4e'],
  'A guard beaten': [1457, '17f6185fb2d4d1b3'],
  'The hero dies': [2114, '69f997ba59fd3af3'],
  'Mariko turns in her cell': [607, '7b3b612ef05a6f5c'],
  'The cell scene ends': [4048, 'c0642522dabfb940'],
  'Mariko in her cell, first': [2030, 'e6adf430d32f5f16'],
  'Mariko in her cell, second': [2854, '2ed7a8d07f75caa8'],
  'Akuma raises his arm, in the dungeon': [2206, '051e4a53bafb5633'],
  'Room 5': [766, '95ef810ca92f047b'],
  'Akuma beaten': [3116, '75f8e99ce39af02f'],
  'The embrace, first': [5247, 'edca863643a30a7b'],
  'The embrace, second': [7334, '59ab099632abc45a'],
  'The closing tune': [16806, '0efe181761ed79ab'],
};
const Ls = {};
for (const p of KarTunes.PARTS) Ls[p] = g.listing(`parts/${p}/listing.json`);
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
const spacings = log => log.speaker.slice(1).map((c, i) => c - log.speaker[i]);
const hash = d => crypto.createHash('sha256').update(d.join(',')).digest('hex').slice(0, 16);
if (KarTunes.TUNES.length !== Object.keys(LIVE).length) fail('tunes', KarTunes.TUNES.length, 'recorded', Object.keys(LIVE).length);
const seen = new Set();
KarTunes.TUNES.forEach((t, k) => {
  const want = LIVE[t.name];
  if (!want) { fail(t.name, 'was not recorded live'); return; }
  const log = KarTunes.log(Ls, k), d = spacings(log), h = hash(d);
  if (log.speaker.length !== want[0] || h !== want[1]) fail(t.name, log.speaker.length, 'clicks', h, '; live', want[0], want[1]);
  if (seen.has(h)) fail(t.name, 'clicks the same as a tune before it');
  seen.add(h);
  if (!(log.end > log.speaker[log.speaker.length - 1])) fail(t.name, 'ends before its last click');
  // The same bytes elsewhere in memory click the same, but for a cycle at a change of note for each
  // of its three bytes that the player reads across a page boundary in one stage and not the other
  for (const p of t.also || []) {
    const o = spacings(KarTunes.log(Ls, k, p));
    if (o.length !== d.length || o.some((v, i) => Math.abs(v - d[i]) > 3)) fail(t.name, 'is not the same tune in', p);
  }
});
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_tunes: all ' + KarTunes.TUNES.length + ' tunes click as the game did in Apple2TS');
