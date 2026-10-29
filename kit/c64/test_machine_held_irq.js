'use strict';
// A self-test of kit/c64/machine.js: an interrupt line still held when its handler returns is taken
// again straight after the RTI, before the main program runs another instruction (#525). CIA 1's
// timer A interrupts every 1,000 cycles; the handler notes the main program's counter ($2000) in a
// ring at $2100 and acknowledges $DC0D only on every fourth entry, so the three returns in between
// leave the line held. In VICE 3.13.2 (x64sc, 27 October 2026) the ring holds each count four times
// over (117 117 117 117 201 201 201 201 30 ...): the main program ran nothing between those entries.
// The same must hold here; the old model (legacyInterrupts) let the main program run between them,
// and fails it. Exits 1 on any failure.
//   node kit/c64/test_machine_held_irq.js
const { Machine } = require('./machine.js');
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

const MAIN = [0x78, 0xA9, 0x35, 0x85, 0x01,                        // SEI; $01 = $35
  0xA9, 0x40, 0x8D, 0xFE, 0xFF, 0xA9, 0x10, 0x8D, 0xFF, 0xFF,       // the IRQ vector: $1040
  0xA9, 0x7F, 0x8D, 0x0D, 0xDC, 0xAD, 0x0D, 0xDC,                   // CIA 1's interrupts off and acknowledged
  0xA9, 0x00, 0x8D, 0x00, 0x20, 0x8D, 0x02, 0x20,                   // the counters cleared
  0xA9, 0xE8, 0x8D, 0x04, 0xDC, 0xA9, 0x03, 0x8D, 0x05, 0xDC,       // timer A's latch: 1,000
  0xA9, 0x81, 0x8D, 0x0D, 0xDC, 0xA9, 0x11, 0x8D, 0x0E, 0xDC, 0x58, // its interrupt on; started; CLI
  0xEE, 0x00, 0x20, 0x4C, 0x34, 0x10];                              // $1034: INC $2000; JMP $1034
const IRQ = [0xAE, 0x02, 0x20, 0xAD, 0x00, 0x20, 0x9D, 0x00, 0x21, // $1040: the count into the ring
  0xE8, 0x8E, 0x02, 0x20, 0x8A, 0x29, 0x03, 0xD0, 0x03,             // the entry counted; every fourth ...
  0xAD, 0x0D, 0xDC, 0x40];                                          // ... reads $DC0D; RTI

for (const legacy of [false, true]) {
  const ram = new Uint8Array(65536);
  ram.set(MAIN, 0x1000); ram.set(IRQ, 0x1040);
  const m = new Machine({ ram, pc: 0x1000, cia: true, legacyInterrupts: legacy });
  m.runCycles(150000);
  const n = ram[0x2002], ring = Array.from(ram.subarray(0x2100, 0x2100 + n));
  let apart = 0;
  for (let k = 1; k < n; k++) if (k % 4 && ring[k] !== ring[k - 1]) apart++;
  if (legacy) {
    check('the old model runs the main program between them, so the probe tells the two apart', n >= 64 && apart > 0, ring.slice(0, 16).join(' '));
    continue;
  }
  check(`no instruction of the main program between ${n} entries while the line is held`,
    n >= 64 && apart === 0, `${apart} differ: ${ring.slice(0, 16).join(' ')}`);
  check('the main program runs after each acknowledgement', ring.slice(4).every((v, k) => k % 4 || v !== ring[k + 3]));
}

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
