'use strict';
// Holds index.html's port of set_difficulty ($0080), ppDifficulty, to the game's own routine: for
// every score from 000 to 999 the routine runs on the kit's SM5A, on the program rebuilt from
// listing.json, from $0080 to $00B4, and its level ($19) and delay ($49) must equal the port's.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { ppDifficulty } = g.run('index.html', 'difficulty', 'ppDifficulty');
g.lib('sm5a'); const SM5A = globalThis.SM5A;

const L = g.listing(), step = pl => ((pl >> 1 ^ pl) & 1 ? 0 : 0x20) | (pl >> 1 & 0x1f);
const order = []; let pl = 0; for (let i = 0; i < 63; i++) { order.push(pl); pl = step(pl); }
const rom = new Uint8Array(0x740), phys = [];
for (let page = 0; page < 29; page++) for (let i = 0; i < 64; i++) {
  const p = page * 64 + (i < 63 ? order[i] : 0x3f); rom[p] = L.ram[page * 64 + i]; phys[page * 64 + i] = p;
}
const m = new SM5A(rom);
let bad = 0;
for (let s = 0; s < 1000; s++) {
  const h = Math.floor(s / 100), t = Math.floor(s / 10) % 10, u = s % 10;
  m.ram[0x15] = h; m.ram[0x16] = t; m.ram[0x17] = u; m.ram[0x19] = 0xf; m.ram[0x49] = 0xf;
  m.pc = phys[0x080]; m.cb = 0; m.skip = false; m.prevOp = 0; m.halt = false;
  let n = 0; while (m.pc !== phys[0x0B4] && n++ < 400) m.step();
  const want = ppDifficulty(h, t, u);
  if (n >= 400 || m.ram[0x19] !== want.level || m.ram[0x49] !== want.delay) {
    if (bad++ < 5) console.log('score ' + s + ': game level ' + m.ram[0x19] + ' delay ' + m.ram[0x49] + ', port ' + want.level + ' ' + want.delay);
  }
}
console.log('1000 scores, ' + bad + ' differ');
if (bad) process.exit(1);
