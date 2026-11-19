'use strict';
// Holds index.html's recorded sounds to the game's own sound routines: each runs again on the kit's
// SM5A, on the program rebuilt from listing.json (the tone at $02AE, $02AF and $02B0 with each
// code, the click at $02A7), and the cycles at which the buzzer's pin R1 changes must be the page's.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('sm5a'); const SM5A = globalThis.SM5A;
const L = g.listing(), step = pl => ((pl >> 1 ^ pl) & 1 ? 0 : 0x20) | (pl >> 1 & 0x1f);
const order = []; let pl = 0; for (let i = 0; i < 63; i++) { order.push(pl); pl = step(pl); }
const rom = new Uint8Array(0x740), phys = [];
for (let page = 0; page < 29; page++) for (let i = 0; i < 64; i++) {
  const p = page * 64 + (i < 63 ? order[i] : 0x3f); rom[p] = L.ram[page * 64 + i]; phys[page * 64 + i] = p;
}
function sound(entry, a) {
  const m = new SM5A(rom), edges = []; let t0 = null;
  m.ram[0x30] = 4;
  m.onBuzzer = (level, clocks) => { if (t0 === null) t0 = clocks; edges.push((clocks - t0) / 2); };
  m.pc = phys[entry]; m.acc = a; m.cb = 0; m.rsub = true; m.stack = phys[0x0038]; m.skip = false; m.prevOp = 0;
  let n = 0; while (m.pc !== phys[0x0038] && n++ < 400000) m.step();
  return edges;
}
const rec = JSON.parse(g.read('index.html').match(/const REC = (\{.*\});\n/)[1]).sounds;
const runs = { point: [0x02AF, 0], click: [0x02A7, 0], caught: [0x02B0, 0], buzz: [0x02B0, 0xc], bonus: [0x02AE, 0] };
let bad = 0;
for (const k in runs) {
  const got = sound(...runs[k]), want = rec[k];
  const same = got.length === want.length && got.every((v, i) => v === want[i]);
  console.log(k + ': ' + got.length + ' edges, ' + (got.length ? (got[got.length - 1] / 16384).toFixed(3) + ' s' : '') + (same ? '' : '  DIFFERS from the page (' + want.length + ' edges)'));
  if (!same || got.length < 10) bad++;
}
if (bad) process.exit(1);
