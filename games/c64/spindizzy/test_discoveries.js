#!/usr/bin/env node
// The two widgets on discoveries.html that run the game's own code on the listing's bytes in the
// kit's 6502: sp-cheat (check_cheat_password, $6076) and sp-steer (steer_speed, $A818).
//   node games/c64/spindizzy/test_discoveries.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { spCheat } = g.run('discoveries.html', 'sp-cheat', 'spCheat');
const { spSteer } = g.run('discoveries.html', 'sp-steer', 'spSteer');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };

if (spCheat(L.ram, 'I LIED!', C64Cpu) !== 0x60) fail('"I LIED!" left $9533 unchanged');
for (const t of ['I LIED', 'i lied!', 'I LIED?', '']) if (spCheat(L.ram, t, C64Cpu) !== 0x4C) fail(`"${t}" changed $9533`);

const minus = (top) => Math.min(...spSteer(L.ram, top, true, 60, C64Cpu));
const plus = (top) => Math.max(...spSteer(L.ram, top, false, 60, C64Cpu));
const want = { 16: -112, 20: -108, 24: -104, 32: -96, 40: -88, 60: -68, 64: -64 };
for (const [top, low] of Object.entries(want)) {
  if (minus(+top) !== low) fail(`top speed ${top}: the speed ran to ${minus(+top)}, not ${low}`);
  if (plus(+top) !== +top) fail(`top speed ${top}: the speed went up to ${plus(+top)}`);
}
if (bad) { console.log(`test_discoveries: ${bad} failed`); process.exit(1); }
console.log('test_discoveries: the password and the inhabitants\' speeds behave as the page says');
