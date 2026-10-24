#!/usr/bin/env node
// Hold the journeys and the hazards on the How it works tab against the game. The page's way, given
// the places as its places() reads them from Part 1's committed listing (line 20000), must say what
// each of the 56 journeys between two places of Part 1 did in jsbeeb on 24 October 2026: a path, the
// river, the Hills or the Factory first, or no path. Its hazards, given each forecast and both kinds of
// journey, must pick from the hazards the game picked and no others, never the same one twice on a
// journey, and about as often as the game's own PROChaz did when work/scripts/hazardroll.py ran it
// 2,000 times for each setting in jsbeeb on the same day (counts of hazards 1-9 below).
//   node games/bbc/flowers-of-crystal/test_journeys.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const P = g.run('index.html', 'ports', 'places', 'way', 'forecast', 'hazards');

// From place p (row, Centre 0 to Mountains 7) to n (column)
const LIVE = {
  0: '.ppfnnnn', 1: 'p.phppnn', 2: 'pp.pnnnn', 3: 'fhp.pprr', 4: 'npnp.npn', 5: 'npnpn.nn', 6: 'nnnrpn.n', 7: 'nnnrnnn.' };
const WAY = { p: 'path', f: 'factory', h: 'hills', r: 'river', n: 'none' };
const GAME = {  // forecast, then counts of hazards 1-9 on 2,000 journeys with a path and 2,000 with none
  sun: [[269, 0, 0, 275, 278, 315, 288, 273, 302], [537, 0, 0, 585, 565, 565, 600, 579, 569]],
  snow: [[291, 0, 290, 0, 294, 306, 250, 302, 267], [586, 0, 555, 0, 588, 543, 561, 572, 595]],
  rain: [[286, 298, 0, 0, 277, 281, 283, 303, 272], [588, 579, 0, 0, 576, 576, 577, 581, 523]] };

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('JOURNEYS', ...what); };
const A1 = g.listing('parts/adventure-1/listing.json');
const pl = P.places(A1.ram, A1.sym('places_data'));
let n = 0;
for (const [p, row] of Object.entries(LIVE)) for (let q = 0; q < 8; q++) {
  if (row[q] === '.') continue;
  n++;
  const w = P.way(pl, +p, q);
  if (w !== WAY[row[q]]) fail(`${pl[p].name} to ${pl[q].name}: ${w}, the game ${WAY[row[q]]}`);
}

let seed = 20261024;
const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return 1 + Math.floor(seed / 4294967296 * k); };
const RUNS = 20000;
for (const [k, fc] of [[1, 'sun'], [2, 'snow'], [3, 'rain']]) for (const nopath of [false, true]) {
  const c = new Array(10).fill(0), want = GAME[fc][+nopath], gameTotal = want.reduce((a, b) => a + b);
  for (let i = 0; i < RUNS; i++) {
    const h = P.hazards(rnd, P.forecast(k), nopath);
    if (h.length !== (nopath ? 2 : 1)) { fail(`${fc}: ${h.length} hazards on a journey ${nopath ? 'with no path' : 'with a path'}`); break; }
    if (h.length === 2 && h[0] === h[1]) fail(`${fc}: hazard ${h[0]} twice`);
    h.forEach(x => c[x]++);
  }
  const total = c.reduce((a, b) => a + b);
  for (let x = 1; x <= 9; x++) {
    const mine = c[x] / total, theirs = want[x - 1] / gameTotal;
    if (!theirs !== !mine || Math.abs(mine - theirs) > 0.035) fail(`${fc}, ${nopath ? 'no path' : 'a path'}: hazard ${x} ${(mine * 100).toFixed(1)} %, the game ${(theirs * 100).toFixed(1)} %`);
  }
}
console.log(`journeys: ${n} made in jsbeeb; hazards: 6 settings, ${RUNS} journeys each`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
