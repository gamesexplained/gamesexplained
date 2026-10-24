#!/usr/bin/env node
// Hold the spells on the How it works tab against the game. The page's spst and spre are PROCspst and
// PROCspre, which keep Part 2's twenty spells in S% and T% between visits, and must give the values the
// game held in jsbeeb on 24 October 2026: spells held, and used, below, with S% and T% as BASIC had them.
// spre must give back every state spst packs.
//   node games/bbc/flowers-of-crystal/test_spells.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { spst, spre } = g.run('index.html', 'ports', 'spst', 'spre');

const LIVE = [  // held, used, S%, T%
  [[4, 8, 12, 16, 20], [], 559240, 0],     // the five a game begins with
  [[1, 2, 3], [], 7, 0],
  [[1, 2], [3], 3, 4],                     // the river's fee took spell 3
  [[1, 2, 3, 6, 7], [], 103, 0],
  [[1, 2, 3, 6], [7], 39, 64],             // the river: the fee took 7, a vanishing spell 6 used, a second taken
  [[1, 2, 3], [6, 7], 7, 96],
  [[1, 2], [3, 6, 7], 3, 100],
  [[2, 3, 6], [1, 7], 38, 65],             // a moving spell, 1, used at the river
];
let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('SPELLS', ...what); };
const state = (held, used) => { const s = new Array(21).fill(0); for (const p of held) s[p] = 1; for (const p of used) s[p] = 2; return s; };
for (const [held, used, S, T] of LIVE) {
  const got = spst(state(held, used));
  if (got.S !== S || got.T !== T) fail(`held ${held}, used ${used}: S% ${got.S}, T% ${got.T}, the game ${S}, ${T}`);
}
let seed = 1;
for (let i = 0; i < 2000; i++) {
  const s = new Array(21).fill(0);
  for (let p = 1; p <= 20; p++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; s[p] = seed % 3; }
  const { S, T } = spst(s), back = spre(S, T);
  if (back.some((v, p) => p && v !== s[p])) { fail(`spre does not give back ${s.slice(1).join('')}: ${back.slice(1).join('')}`); break; }
}
console.log(`spells: ${LIVE.length} states seen in jsbeeb, 2,000 packed and unpacked`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
