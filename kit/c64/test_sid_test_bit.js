'use strict';
// The test bit in site/lib/sid.js when a driver sets it and clears it within one frame. A frame's
// writes land at one instant, so the bit is never seen set while samples are made; on the chip it
// resets the oscillator the moment it is written, and a driver that pulses it every frame (Space
// Rogue's engine hum, games/c64/space-rogue, sound_step) restarts its wave every frame. Exits 1 on
// any failure.
// node kit/c64/test_sid_test_bit.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));

const E = globalThis.C64Sid.engine();
let fails = 0;
const fail = m => { fails++; console.log('FAIL ' + m); };
// a voice running for a while has moved its oscillator on
const sid = E.createSID(44100, {});
for (const [r, v] of [[0, 0x30], [1, 0x02], [5, 0], [6, 0xF0], [24, 0x0F], [4, 0x11]]) sid.write(r, v);
for (let i = 0; i < 500; i++) sid.sample();
if (!(sid.V[0].acc > 0)) fail('the oscillator did not run before the test');
// set and cleared in one frame: the oscillator starts again from 0
sid.write(4, 0x08); sid.write(4, 0x00); sid.write(4, 0x11);
if (sid.V[0].acc !== 0) fail(`test bit set and cleared at one instant left the oscillator at ${sid.V[0].acc}`);
// a write without the test bit leaves it running
for (let i = 0; i < 100; i++) sid.sample();
const before = sid.V[0].acc;
sid.write(4, 0x10); sid.write(4, 0x11);
if (sid.V[0].acc !== before) fail('a control write without the test bit moved the oscillator');
console.log(fails ? `${fails} failure(s)` : 'test bit: all cases pass');
process.exit(fails ? 1 : 0);
