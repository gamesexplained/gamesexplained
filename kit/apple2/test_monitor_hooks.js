#!/usr/bin/env node
// Apple2.monitor, site/lib/apple2.js's stand-ins for the Monitor ROM's routines, against the timings
// measured in Apple2TS (kit/skills/apple2/apple2-reference, "Timing"): a JSR to WAIT ($FCA8) on the
// kit's 6502, from the JSR to the instruction after it, takes 29, 50, 398 and 26,363 cycles for
// A = 1, 2, 10 and 100, and leaves A 0 with the carry set, as the ROM's loop of SBC #1 does. A = 0
// stops the run. It exits 1 on any difference.
//   node kit/apple2/test_monitor_hooks.js
'use strict';
const path = require('path');
require(path.join(__dirname, '../../site/lib/apple2.js'));
const { CPU } = require(path.join(__dirname, '../cpu/cpu6502.js'));
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const wait = a => {
  const m = new Uint8Array(0x10000);
  m.set([0x20, 0xA8, 0xFC, 0xEA], 0x0300);     // JSR $FCA8, NOP
  const cpu = new CPU(m);
  cpu.pc = 0x0300; cpu.a = a; cpu.c = 0; cpu.sp = 0xFF;
  cpu.run({ until: 0x0303, hooks: { ...Apple2.monitor } });
  return cpu;
};
for (const [a, want] of [[1, 29], [2, 50], [10, 398], [100, 26363]]) {
  const cpu = wait(a);
  if (cpu.cycles !== want) fail(`WAIT with A = ${a} took ${cpu.cycles} cycles, measured ${want}`);
  if (cpu.a !== 0 || !cpu.c || !cpu.z || cpu.n || cpu.sp !== 0xFF) fail(`WAIT with A = ${a} left A ${cpu.a}, C ${cpu.c}, Z ${cpu.z}, N ${cpu.n}, S ${cpu.sp}`);
}
try { wait(0); fail('WAIT with A = 0 ran'); } catch (e) { if (!/A = 0/.test(e.message)) fail('WAIT with A = 0:', e.message); }
if (bad) { console.log(bad + ' failed'); process.exit(1); }
console.log('test_monitor_hooks: WAIT takes the cycles measured in Apple2TS');
