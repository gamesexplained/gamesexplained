#!/usr/bin/env node
// The radio widget's scrambling (am-radio, index.html) against the game's own code on the
// listing's bytes in the kit's 6502:
// - random ($7BAE): 100 seeds, random_init's ($7BFF) $AD and $CE with twice a raster line, and 100
//   more of any three bytes, 1,000 numbers each, the number and the state after it;
// - scramble_char ($7B51): every pair of key ($7B9D) and filter setting ($7B9F), 65,536, with a
//   character from the intercepts' range, the random state running on from one case to the next:
//   the character it returns and the random state after it.
//   node games/c64/the-armageddon-man/test_radio.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { amRandom, amScramble } = g.run('index.html', 'am-radio', 'amRandom', 'amScramble');
const L = g.listing();
const m = L.ram.slice();
const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 } });
let bad = 0, numbers = 0, chars = 0, through = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const state = () => [m[0x7BAB], m[0x7BAC], m[0x7BAD]];
let seed = 20261030;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };

for (let k = 0; k < 200; k++) {
  const st = k < 100 ? [0xAD, 0xCE, 2 * (k * 3 % 312) & 0xFF] : [rnd() & 255, rnd() & 255, rnd() & 255];
  m.set(st, 0x7BAB);
  for (let i = 0; i < 1000; i++) {
    cpu.call(0x7BAE, {});
    const r = amRandom(st);
    numbers++;
    if (cpu.a !== r || state().join() !== st.join()) { fail(`seed ${k}, number ${i}: the game gives ${cpu.a} and ${state()}, the page ${r} and ${st}`); break; }
  }
}
const st = [0xAD, 0xCE, 0x40];
m.set(st, 0x7BAB);
for (let key = 0; key < 256; key++) for (let set = 0; set < 256; set++) {
  const ch = 0x20 + rnd() % 0x5F;
  m[0x7B9D] = key; m[0x7B9F] = set;
  cpu.call(0x7B51, { a: ch });
  const got = amScramble(ch, key, set, st);
  chars++; if (got === ch) through++;
  if (cpu.a !== got || state().join() !== st.join()) { fail(`key ${key}, setting ${set}: the game gives ${cpu.a}, the page ${got}`); m.set(st, 0x7BAB); }
}
if (bad) { console.log(`test_radio: ${bad} failed`); process.exit(1); }
console.log(`test_radio: ${numbers} random numbers and ${chars} characters (${through} through), every one the game's`);
