#!/usr/bin/env node
// The brain calculator's port, reference/brain.js, against the game's own opp_brain (engine $6B00)
// run on the kit's 6502 over the engine's listing with each stage's laid over it, as the stage's
// load lays it, for its tables at $BFE1-$BFFD. Each case sets every cell of zero page the routine
// reads and the X register, runs the routine until it calls command ($6540) or returns, and holds
// the port to the same command, the same stick ($29), height ($2A) and random number ($48) left
// behind. The cases: every one of the 256 random numbers for each stage, distance 0 to 13, the
// hero in the stance or standing, guard or Akuma, at a column inside and outside Akuma's kicking
// range, the legs ready or not; then random zero pages over every cell the routine reads.
//   node games/apple2/karateka/test_brain.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { KarBrain } = g.run('reference/brain.js', 'brain.js', 'KarBrain');
const E = g.listing('parts/engine/listing.json');
const PARTS = ['title', 'cliff', 'palace', 'dungeon', 'akuma'];            // by stage, $D0 0-4
const mem = PARTS.map(p => {
  const L = g.listing(`parts/${p}/listing.json`), m = E.ram.slice();
  for (let a = 0; a < 0x10000; a++) if (L.has[a]) m[a] = L.ram[a];
  return m;
});
// the cells of zero page opp_brain reads
const READS = [0x20, 0x21, 0x22, 0x25, 0x26, 0x2F, 0x30, 0x33, 0x44, 0x48, 0x4B, 0x4C, 0x4D, 0x52, 0x5D,
  0x60, 0x62, 0x65, 0x6F, 0xD0, 0xD7, 0xD8, 0xD9];
let seed = 0x2468ACE1;
const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };

let bad = 0, cases = 0;
function check(z0, x, what) {
  cases++;
  const m = mem[z0[0xD0]].slice();
  m.set(z0, 0);
  const cpu = new C64Cpu.CPU(m);
  let cmd = null;
  cpu.call(0x6B00, { x }, { hooks: { 0x6540: c => { cmd = c.a; return true; } }, maxSteps: 2000 });
  const z = Uint8Array.from(z0);
  const got = KarBrain.think(z, a => m[a], x);
  const want = { cmd, 0x29: m[0x29], 0x2A: m[0x2A], 0x48: m[0x48] };
  const port = { cmd: got ? got.cmd : null, 0x29: z[0x29], 0x2A: z[0x2A], 0x48: z[0x48] };
  if (JSON.stringify(want) !== JSON.stringify(port)) {
    if (++bad <= 10) console.log(`FAIL ${what}: game ${JSON.stringify(want)}, port ${JSON.stringify(port)}; zero page`,
      READS.map(a => a.toString(16) + '=' + z0[a].toString(16)).join(' '), 'x', x);
  }
}

// a guard or Akuma ready in the stance, the hero alive
const base = () => { const z = new Uint8Array(256); z[0x20] = 6; z[0x21] = 6; z[0x25] = 3; z[0x26] = 3; z[0x5D] = 1; z[0x60] = 6; z[0x44] = 1; return z; };
for (let d0 = 0; d0 < 5; d0++) for (let dist = 0; dist < 14; dist++) for (const heroStands of [0, 0xFF])
  for (const [type, col] of [[0, 0x10], [1, 0x10], [1, 0x22], [5, 0x24]]) for (const legs of [[6, 6], [0x16, 2], [6, 4], [3, 3]])
    for (let r = 0; r < 256; r++) {
      const z = base();
      Object.assign(z, { [0xD0]: d0, [0x33]: dist, [0x6F]: heroStands, [0x4D]: type, [0x22]: col, [0x20]: legs[0], [0x21]: legs[1],
        [0x48]: r, [0xD7]: [0xE0, 0x30, 0xFF][r % 3], [0xD8]: [0xFF, 0x20, 0xE8][r % 3], [0xD9]: [0x50, 0xC0, 0xFF][r % 3] });
      check(z, rnd(256), `stage ${d0}, distance ${dist}, random $${r.toString(16)}`);
    }
// random zero pages: every cell the routine reads, its boundary values half the time
const EDGE = { 0x20: [6, 0x16], 0x21: [6], 0x22: [0x1F, 0x20, 0x26, 0x27, 0x28, 0x2C, 0x2D, 0x33], 0x25: [3], 0x26: [0x0D], 0x2F: [0, 0xFF],
  0x30: [0, 1], 0x33: [6, 7, 8, 0x0B, 0x0C, 0x0D], 0x44: [0], 0x4B: [0], 0x4C: [0], 0x4D: [0, 1, 5], 0x52: [0x30, 0x31, 0x80],
  0x5D: [0, 1], 0x60: [0x13], 0x62: [0x11, 0x12], 0x65: [0x1A], 0x6F: [0, 0xFF], 0xD0: [0, 1, 2, 3, 4] };
for (let i = 0; i < 100000; i++) {
  const z = new Uint8Array(256);
  for (const a of READS) z[a] = EDGE[a] && rnd(2) ? EDGE[a][rnd(EDGE[a].length)] : rnd(256);
  z[0xD0] = rnd(5);
  check(z, rnd(256), `random case ${i}`);
}
if (bad) { console.log(`${bad} of ${cases} cases differ`); process.exit(1); }
console.log(`test_brain: the port matches opp_brain ($6B00) in all ${cases.toLocaleString('en')} cases`);
