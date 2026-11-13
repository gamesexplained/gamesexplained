#!/usr/bin/env node
// Hold the pages' helicopter routes against the game's own code. The block rp-path (rpPath), the
// same on every page that carries it, reads a route from the game's tables. Here the game's own
// start_heli_a_path ($8DD5, the route in Y) and move_heli_a ($8E2B, once a frame) run on the kit's
// simulator over the listing, for the eight routes and the explosion, until the game marks the
// route over (heli_a_steps, $7A, = $FF). Every frame's X ($74), Y ($75) and kind of move ($25)
// must be the page's, and the route must be as long.
// It exits 1 on any difference.
//   node games/c64/rampage/test_paths.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), same = g.sameBlock('rp-path');
const { rpPath } = g.run(same.pages[0], 'rp-path', 'rpPath');
const L = g.listing();
let bad = 0, frames = 0;
const lengths = [];
for (let n = 0; n < 9; n++) {
  const m = L.ram.slice(), cpu = new kit.CPU(m, { port: 0x35, io: { read() { return 0; }, write() {} } });
  cpu.call(0x8DD5, { y: n }, { maxSteps: 1000 });
  const P = rpPath(L.ram, n);
  let f = 0;
  for (; f < 5000; f++) {
    cpu.call(0x8E2B, {}, { maxSteps: 1000 });
    if (m[0x7A] === 0xFF) break;
    const q = P[f];
    if (!q || q.x !== m[0x74] || q.y !== m[0x75] || q.move !== m[0x25]) { if (bad++ < 5) console.log('DIFFERS route', n, 'frame', f, JSON.stringify(q), m[0x74], m[0x75], m[0x25]); }
    frames++;
  }
  if (f !== P.length) { bad++; console.log('DIFFERS route', n, 'length', P.length, 'game', f); }
  lengths.push(P.length);
}
console.log(`rampage routes (${same.pages.join(', ')}): ` + (bad ? bad + ' differences' : `${frames} frames of nine routes match the game's code; lengths ${lengths.join(', ')}`));
process.exit(bad ? 1 : 0);
