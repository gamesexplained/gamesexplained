#!/usr/bin/env node
// Hold the page's enemyFrames (the rd-mirror block of graphics.html) against the game's own $16D3,
// which builds each level's twenty enemy frames ($90-$A3, at $E400-$E8FF) and their colours
// ($B560-$B573), run in kit/cpu/cpu6502.js over the committed listing for each of the four levels.
// Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_mirror.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { enemyFrames } = g.run('graphics.html', 'rd-mirror', 'enemyFrames');
const ram = g.listing().ram;
let bad = 0, bytes = 0;
for (let l = 0; l < 4; l++) {
  const m = Uint8Array.from(ram);
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read: () => 0, write: () => {} } });
  m[0x30] = l;                                   // $243C: X and the level number $30 agree
  cpu.call(0x16D3, { x: l });
  const p = enemyFrames(ram, l);
  for (let k = 0; k < 20; k++) {
    for (let i = 0; i < 63; i++) { bytes++; if (m[0xE400 + 64 * k + i] !== p.frames[k][i]) { if (bad++ < 6) console.log('DIFFERS level', l + 1, 'frame', (0x90 + k).toString(16), 'byte', i); } }
    if (m[0xB560 + k] !== p.colours[k]) { if (bad++ < 6) console.log('DIFFERS colour level', l + 1, 'frame', (0x90 + k).toString(16), m[0xB560 + k], p.colours[k]); }
  }
}
console.log(`4 levels, 80 frames, ${bytes} bytes and their colours: ${bad ? bad + ' differ' : 'every one matches'}`);
process.exit(bad ? 1 : 0);
