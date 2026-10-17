#!/usr/bin/env node
// Hold the page's rickStep (the rd-move block of index.html) against the game's own move_rick
// ($0B2A) run in kit/c64/cpu6502.js over the committed listing. The room is laid out the game's
// way: the tile flags built by $4081 from the level's eight thresholds, and the room map at $BA00
// given open ground over a floor, either an ordinary one (code $C1, flags $48) or a springy one
// ($BE, flags $60). 400 runs of 80 steps of random stick (up, left, right, nothing), kept inside
// the room; X, Y, the vertical speed and the grounded flag must agree at every step. Needs no
// snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_move.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const { rickStep } = g.run('index.html', 'rd-move', 'rickStep');
const ram = g.listing().ram;
let seed = 20261014;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const STICKS = [0, 0, 1, 4, 8, 5, 9, 0];
let bad = 0, runs = 0, steps = 0;
for (const springy of [false, true]) for (let r = 0; r < 200; r++) {
  const m = Uint8Array.from(ram);
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read: (a, c) => (a === 0xDC00 ? c.stick : a === 0xDC01 ? 0xFF : 0), write: () => {} } });
  cpu.call(0x4081, {});
  const floor = springy ? 0xBE : 0xC1;
  for (let a = 0xBA00; a < 0xBFB4; a++) m[a] = a < 0xBA00 + 20 * 32 ? 0 : floor;
  const s = { x: m[0xB58C], y: m[0x3991], yf: m[0x3985], vs: m[0x39B5] << 24 >> 24, vf: m[0x39A9], gr: 0 };
  runs++;
  for (let k = 0; k < 80; k++) {
    let st = rnd(4) ? STICKS[rnd(STICKS.length)] : 0;
    if (s.x >= 0xD8) st &= ~8;
    if (s.x <= 0x10) st &= ~4;
    cpu.stick = 0x7F ^ st; m[0x39C1] = 0;
    cpu.call(0x0B2A, {});
    m[0x07] = (m[0x07] + 2) & 0xFF;
    rickStep(s, st, springy, 139);
    steps++;
    const gm = [m[0xB58C], m[0x3991] + 256 * m[0x399D], m[0x3985], m[0x39B5] << 24 >> 24, m[0x39A9], m[0x47] ? 1 : 0];
    const pg = [s.x, s.y, s.yf, s.vs, s.vf, s.gr];
    if (gm.join() !== pg.join()) { if (bad++ < 6) console.log('DIFFERS', springy ? 'springy' : 'floor', r, k, st, 'game', gm.join(), 'page', pg.join()); break; }
  }
}
console.log(`${runs} runs, ${steps} steps on both floors: ${bad ? bad + ' differ' : 'every step matches'}`);
process.exit(bad ? 1 : 0);
