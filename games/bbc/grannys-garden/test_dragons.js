#!/usr/bin/env node
// Hold the baby dragons on the How it works tab against the game. The page's dragonsGame is given the
// foods and the sentences as its dataReader reads them from Part 2's committed listing (lines 1270-1290),
// and must then match games played in jsbeeb on 14 October 2026: after the throws below (X is a letter
// that is no food), the game held these counters B, L, O and C, these dragons out, c(0-3), and these
// collars, e(0-3), or had ended in the Witch or with four collars. The 30 games of the trace these are
// taken from (work/scripts/dragons_trace.py) all agreed with the port, throw by throw. The sentences
// must say each dragon "loves" the food that brings it out and "hates" the one that sends it in.
//   node games/bbc/grannys-garden/test_dragons.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { dataReader, dragonsGame } = g.run('index.html', 'ports', 'dataReader', 'dragonsGame');

const LIVE = [
  ['BLOC', 'won'], ['BBBB', 'witch'], ['CXBLO', 'won'], ['OOCXLLLXL', 'witch'], ['XBBBLLXCLL', 'witch'],
  ['LLBOOC', [1, 2, 2, 1], '1001', '0100'], ['COBCBCLX', [2, 1, 1, 3], '0101', '1001'],
  ['BLBO', [2, 1, 1, 0], '1010', '1100'], ['OCXL', [0, 1, 1, 1], '0101', '0011'],
  ['COOLLXLOXBB', [2, 3, 3, 1], '1010', '0001'], ['LCOLCBBCB', [3, 2, 1, 3], '1100', '0100'],
];

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('DRAGONS', ...what); };
const P = g.listing('parts/part-2/listing.json');
const r = dataReader(P.ram, P.sym('food_data')), foods = [];
for (let i = 0; i < 5; i++) { const y = r.read().v; foods.push([y, +r.read().v, +r.read().v, +r.read().v, +r.read().v]); }
const w = dataReader(P.ram, P.sym('dragon_sentences')), words = [];
for (let d = 0; d < 5; d++) { words.push([]); for (let b = 0; b < 4; b++) words[d].push(w.read().v.replace(/[\x80-\x9f]/g, '')); }
if (foods.map(f => f[0]).join('') !== 'BLOCB') fail(`the foods read are ${foods.map(f => f[0]).join('')}`);

for (const [throws, ...was] of LIVE) {
  const [end, counts, out, collars] = typeof was[0] === 'string' ? was : [null, ...was];
  const gm = dragonsGame(foods, words);
  let got = 'neither';
  for (const z of throws) { const res = gm.throw(z); if (res.witch) { got = 'witch'; break; } if (gm.won) { got = 'won'; break; } }
  if (end) { if (got !== end) fail(`${throws}: ${got}, the game ${end}`); continue; }
  const mine = [[gm.n.B, gm.n.L, gm.n.O, gm.n.C].join(','), gm.c.join(''), gm.e.join('')];
  const theirs = [counts.join(','), out, collars];
  if (got !== 'neither' || mine.join(' ') !== theirs.join(' ')) fail(`${throws}: ${got} ${mine.join(' ')}, the game ${theirs.join(' ')}`);
}

// a dragon "loves" the food that brings it out and "hates" the one that sends it in
const liking = [0, 2, 3, 4];
for (let f = 0; f < 4; f++) for (let d = 0; d < 4; d++) {
  const said = words[liking[d]][f], effect = foods[f][1 + d];
  const want = effect > 0 ? 'loves' : effect < 0 ? 'hates' : 'sometimes eats';
  if (said !== want) fail(`the ${['red', 'green', 'blue', 'yellow'][d]} dragon ${said} ${words[1][f]}, and the food's effect is ${effect}`);
}
console.log(`dragons: ${LIVE.length} games played in jsbeeb, the 16 likings`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
