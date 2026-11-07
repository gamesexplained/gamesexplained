'use strict';
// A self-test of kit/c64/lockstep.js: a byte the main program reads through irqBytes, read by a
// hook standing in for a KERNAL routine straight after an interrupt has left by the KERNAL's exit.
// The machine (kit/c64/machine.js, with nest) takes CIA 1's timer interrupt through the KERNAL's
// entry; the handler counts a key into $C6 and leaves by $EA81, which the machine's own hook
// stands in for. The main program calls GETIN ($FFE4), a hook here that takes the key from $C6,
// and adds what it took to $2001. When the timer comes as the JSR to GETIN ends, the handler runs
// before GETIN's hook, and GETIN's read of $C6 follows the exit's hook with no instruction between:
// the copy of the machine the lockstep runs on ahead for the port's reads has to count that read
// as the main program's, though no instruction has shown the interrupt over. The port, written
// here, reads $C6 through irqByte, and the two must agree on every pass.
// Exits 1 on any failure. node kit/c64/test_lockstep_kernal_exit.js
const { Machine } = require('./machine.js');
const { Lockstep } = require('./lockstep.js');
let fails = 0;
const check = (what, ok) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', what); };

const CODE = {
  0x1000: [0x78,                       // sei
    0xA9, 0x36, 0x85, 0x01,            // lda #$36 : sta $01         the KERNAL and I/O in
    0xA9, 0x00, 0x8D, 0x14, 0x03,      // lda #$00 : sta $0314
    0xA9, 0x11, 0x8D, 0x15, 0x03,      // lda #$11 : sta $0315       the handler at $1100
    0xA9, 0xDC, 0x8D, 0x04, 0xDC,      // lda #$DC : sta $DC04
    0xA9, 0x05, 0x8D, 0x05, 0xDC,      // lda #$05 : sta $DC05       timer A: 1,500 cycles
    0xA9, 0x81, 0x8D, 0x0D, 0xDC,      // lda #$81 : sta $DC0D       its interrupt on
    0xA9, 0x11, 0x8D, 0x0E, 0xDC,      // lda #$11 : sta $DC0E       started, continuous
    0x58,                              // cli
    0x4C, 0x40, 0x10],                 // jmp main
  0x1040: [0x20, 0xE4, 0xFF,           // main: jsr GETIN
    0x18, 0x6D, 0x01, 0x20, 0x8D, 0x01, 0x20,   // clc : adc $2001 : sta $2001
    0x4C, 0x40, 0x10],                 // jmp main
  0x1100: [0xAD, 0x0D, 0xDC,           // lda $DC0D                  acknowledged
    0xE6, 0xC6,                        // inc $C6                    a key
    0x4C, 0x81, 0xEA],                 // jmp $EA81                  the KERNAL's exit
};
// GETIN: the key count in $C6 taken, one a call, in A; and back
const GETIN = c => {
  const v = c.rd(0xC6);
  if (v) c.wr(0xC6, v - 1);
  c.a = v ? 1 : 0;
  const lo = c.pull(), hi = c.pull();
  c.pc = ((hi << 8 | lo) + 1) & 0xFFFF; c.cycles += 30;
  return false;
};

function port() {
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () { P.io.ciaRead(0x0D); M[0xC6] = (M[0xC6] + 1) & 255; };   // $1100
  P.main_loop = function* () {                                                   // $1040
    for (;;) {
      yield { cp: 0x1040 };
      const v = P.io.irqByte(0xC6);
      if (v) P.io.store(0xC6, v - 1);
      M[0x2001] = (M[0x2001] + (v ? 1 : 0)) & 255;
    }
  };
  return P;
}

const ram = new Uint8Array(65536);
for (const [a, b] of Object.entries(CODE)) ram.set(b, +a);
const m = new Machine({ ram, pc: 0x1000, passAt: 0x1040, cia: true });
m.hooks[0xFFE4] = GETIN;
m.runUntilPass(q => q.passes >= 3);
// how often the timer comes as the JSR ends: GETIN's hook reached from the exit's (the machine's
// own), the last instruction run the handler's JMP $EA81 at $1105. A hook given to the lockstep
// runs on its copies too, so it uses the processor it is given and counts only on the machine's
let after = 0;
const P = port();
const ls = new Lockstep({ machine: m, port: P, program: p => p.main_loop(), checkpoints: [0x1040], irqs: { 0x1100: 'irq' },
  irqBytes: [0xC6], hooks: { 0xFFE4: c => { if (c === m.cpu && c.opc === 0x1105) after++; return GETIN(c); } } });
const r = ls.run({ passes: 20000 });
check('20000 passes identical: ' + r.passes + ' passes, ' + (r.ok ? 'identical' : JSON.stringify(r.diffs[0]).slice(0, 200)), r.ok && r.passes >= 20000);
check('the timer came as the JSR to GETIN ended ' + after + ' times', after > 0);
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
