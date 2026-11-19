'use strict';
// Holds index.html's port of set_wait ($00C0), ocDelay, to the game's own routine: for every score
// from 000 to 999, in Game A and Game B, with a take of treasure under way and not, the routine
// runs on the kit's SM5A, on the program rebuilt from listing.json, from $00C0 until it stores the
// wait in delay ($49), and the wait must equal the port's.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { ocDelay } = g.run('index.html', 'speed', 'ocDelay');
g.lib('sm5a'); const SM5A = globalThis.SM5A;
const L = g.listing(), step = pl => ((pl >> 1 ^ pl) & 1 ? 0 : 0x20) | (pl >> 1 & 0x1f);
const order = []; let pl = 0; for (let i = 0; i < 63; i++) { order.push(pl); pl = step(pl); }
const rom = new Uint8Array(0x740), phys = [];
for (let page = 0; page < 29; page++) for (let i = 0; i < 64; i++) {
  const p = page * 64 + (i < 63 ? order[i] : 0x3f); rom[p] = L.ram[page * 64 + i]; phys[page * 64 + i] = p;
}
const m = new SM5A(rom);
let bad = 0, n = 0;
for (const gameB of [false, true]) for (const taking of [false, true]) for (let s = 0; s < 1000; s++) {
  const h = Math.floor(s / 100), t = Math.floor(s / 10) % 10;
  m.ram[0x15] = h; m.ram[0x16] = t; m.ram[0x17] = s % 10; m.ram[0x30] = gameB ? 2 : 4; m.ram[0x08] = taking ? 1 : 0; m.ram[0x49] = 0xf;
  m.pc = phys[0x0C0]; m.cb = 0; m.rsub = false; m.skip = false; m.prevOp = 0; m.halt = false;
  let k = 0; while (m.pc !== phys[0x0E7] && k++ < 400) m.step();
  n++;
  const want = ocDelay(h, t, gameB, taking);
  if (k >= 400 || m.ram[0x49] !== want) { if (bad++ < 5) console.log((gameB ? 'B' : 'A') + (taking ? ' taking' : '') + ' score ' + s + ': game ' + m.ram[0x49] + ', port ' + want); }
}
console.log(n + ' cases, ' + bad + ' differ');
if (bad) process.exit(1);
