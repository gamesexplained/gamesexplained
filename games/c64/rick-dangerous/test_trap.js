#!/usr/bin/env node
// Hold the page's trapRun (the rd-trap block of index.html) against the game's own trap handler
// ($1A72, which runs trap_run, $1ACF) in kit/cpu/cpu6502.js over the committed listing: every trap
// type 24 to 70 put in object slot 2 at six places (one fixed, five random), set off, and stepped
// until its script ends. Position and frame must agree at every step, and the game must end the
// run on the step the page does. Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_trap.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { trapRun } = g.run('index.html', 'rd-trap', 'trapRun');
const ram = g.listing().ram;
let seed = 20261014;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
let bad = 0, runs = 0, steps = 0;
for (let type = 24; type <= 70; type++) for (let r = 0; r < 6; r++) {
  const m = Uint8Array.from(ram), X = 2;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read: () => 0, write: () => {} } });
  const x0 = r === 0 ? 0x70 : 4 + rnd(0xE0), y0 = r === 0 ? 0xA0 : rnd(0x140);
  const sc = m[0xB880 + type] | m[0xB900 + type] << 8, fl = m[0xB780 + type] | m[0xB800 + type] << 8;
  m[0xB5B3 + X] = type; m[0xB607 + X] = sc & 0xFF; m[0xB613 + X] = sc >> 8; m[0xB5EF + X] = fl & 0xFF; m[0xB5FB + X] = fl >> 8;
  m[0xB643 + X] = m[fl + 1] !== 0xFF ? 1 : 0; m[0xB637 + X] = 3; m[0xB62B + X] = 0xFE; m[0xB61F + X] = 0; m[0xB59B + X] = m[fl];
  m[0xB58F + X] = x0; m[0x3994 + X] = y0 & 0xFF; m[0x39A0 + X] = y0 >> 8; m[0x38DF + X] = 0; m[0xB64F + X] = 0;
  m[0x391B + X] = x0; m[0x3927 + X] = 0x40;
  const p = trapRun(m, type, x0, y0);
  runs++;
  for (let k = 0; k <= p.steps.length; k++) {
    cpu.call(0x1A72, { x: X });
    steps++;
    if (k === p.steps.length) {
      if (m[0xB62B + X] !== 0) { if (bad++ < 6) console.log('DIFFERS: the game runs on', type, r, k, p.end); }
      break;
    }
    const gm = [m[0xB58F + X], m[0x3994 + X] + 256 * m[0x39A0 + X], m[0xB59B + X]], pg = [p.steps[k].x, p.steps[k].y, p.steps[k].frame];
    if (gm.join() !== pg.join() || m[0xB62B + X] === 0) { if (bad++ < 6) console.log('DIFFERS', type, r, k, 'game', gm.join(), m[0xB62B + X], 'page', pg.join()); break; }
  }
}
console.log(`${runs} runs of the 47 trap types, ${steps} steps: ${bad ? bad + ' differ' : 'every step matches'}`);
process.exit(bad ? 1 : 0);
