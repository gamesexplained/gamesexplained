'use strict';
// The page's lines of sight (the block loc-sight, index.html) against the game's own trace_line
// ($B416, flag 1: sight on the ground) and distance ($724D) run on the kit's Z80 from the committed
// listings: 20,000 random pairs of squares in each scenario, and every pair from a few viewers,
// compared on whether the line is blocked and on the distance in half squares.
//   node games/spectrum/lords-of-chaos/test_sight.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
const { LOCSight } = g.run('index.html', 'loc-sight', 'LOCSight');

let seed = 0x1234567;
const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
let fails = 0, cases = 0;
for (const n of [1, 2, 3]) {
  const M = memory(n);
  const pairs = [];
  for (let i = 0; i < 20000; i++) pairs.push([rnd(36), rnd(36), rnd(36), rnd(36)]);
  for (const [r, c] of [[9, 9], [17, 17], [0, 35]]) for (let r2 = 0; r2 < 36; r2++) for (let c2 = 0; c2 < 36; c2++) pairs.push([r, c, r2, c2]);
  for (const [r1, c1, r2, c2] of pairs) {
    if (r1 === r2 && c1 === c2) continue;
    const G = M;
    G[0xFF88] = r1; G[0xFF89] = c1; G[0xFF4D] = r2; G[0xFF4E] = c2;
    call(G, 0xB416);
    const gameBlocked = G[0xFF49] === 1;
    const pageBlocked = !!LOCSight.blocked(M, r1, c1, r2, c2, 1);
    const cpu = call(G, 0x724D, { l: r1, h: c1, e: r2, d: c2 });
    const gd = cpu.a, pd = LOCSight.distance(r1, c1, r2, c2);
    cases++;
    if (gameBlocked !== pageBlocked || gd !== pd) {
      if (fails++ < 5) console.log(`FAIL scenario ${n}: (${r1},${c1}) to (${r2},${c2}): game ${gameBlocked ? 'blocked' : 'clear'} ${gd}, page ${pageBlocked ? 'blocked' : 'clear'} ${pd}`);
    }
  }
}
console.log(fails ? `FAIL: ${fails} of ${cases} lines differ` : `ok - ${cases} lines of sight and distances as the game works them out, three scenarios`);
process.exit(fails ? 1 : 0);
