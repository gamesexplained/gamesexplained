'use strict';
// A self-test of C16.io (site/lib/c16.js), the chips a page gives the kit's 6502, against
// kit/c16/machine.js, which test_machine.js holds to plus4emu: one program that selects keyboard
// rows and joystick ports, reads $FF08's latch, reads TED's registers back and writes the sound's
// must store the same bytes on both. Then what only the page's model has: its own reads first, the
// sound log, the writes it hands a Play tab's port, and the RAM above TED's page. Exits 1 on any
// failure.  node kit/c16/test_c16_io.js
const path = require('path');
const { Machine, KEY } = require('./machine.js');
const { CPU } = require('../cpu/cpu6502.js');
const C16 = globalThis.C16;       // machine.js has loaded site/lib/c16.js
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

// At $1000: each case stores A at $2000 plus its number, and a JMP to itself ends the program
const OUT = 0x2000;
const cases = [];
const sta = n => [0x8D, (OUT + n) & 0xFF, (OUT + n) >> 8];
const latch = (rows, w) => [0xA9, rows, 0x8D, 0x30, 0xFD, 0xA9, w, 0x8D, 0x08, 0xFF, 0xAD, 0x08, 0xFF];
const back = (r, v) => [0xA9, v, 0x8D, r, 0xFF, 0xAD, r, 0xFF];
cases.push(latch(0xFF, 0xFD), latch(0xFF, 0xFB), latch(0xFF, 0xF9), latch(0xFD, 0xFF), latch(0xBF, 0xFF));
for (const r of [0x06, 0x07, 0x0A, 0x0C, 0x10, 0x12, 0x14, 0x15, 0x19, 0x1A, 0x1F]) cases.push(back(r, 0x00));
cases.push(back(0x11, 0x37), [0xAD, 0x00, 0xFD], [0xAD, 0x30, 0xFF]);
const code = cases.flatMap((c, n) => [...c, ...sta(n)]);
code.push(0x4C, (0x1000 + code.length) & 0xFF, (0x1000 + code.length) >> 8);
const END = 0x1000 + code.length - 3;

function input(o) {
  o.joy = 0x1F & ~0x05;           // port 2: up and left
  o.joy1 = 0x1F & ~0x18;          // port 1: right and fire
  for (const k of ['A', 'SPACE', '1']) o.keys.add(KEY[k]);
}

const ramM = new Uint8Array(65536);
ramM.set(code, 0x1000);
const m = new Machine({ ram: ramM, pc: 0x1000 });
input(m);
for (let n = 0; m.cpu.pc !== END && n < 1e5; n++) m.step();

const ramP = new Uint8Array(65536);
ramP.set(code, 0x1000);
const io = C16.io(ramP);
input(io);
const cpu = new CPU(ramP, { ramSize: 0x4000, ioPages: [0xFD, 0xFF], io });
cpu.pc = 0x1000;
cpu.run({ until: END, maxSteps: 1e5 });

// $FF1F's bits 0-2 are the beam's line within the character row, which machine.js models and a
// page gives through opts.read (C16.io keeps no beam): they are left out of the comparison
const FF1F = 5 + [0x06, 0x07, 0x0A, 0x0C, 0x10, 0x12, 0x14, 0x15, 0x19, 0x1A, 0x1F].indexOf(0x1F);
const mask = (a, i) => (i === FF1F ? a & 0xF8 : a);
const got = Array.from(ramP.subarray(OUT, OUT + cases.length), mask), want = Array.from(ramM.subarray(OUT, OUT + cases.length), mask);
const hex = a => a.map(v => v.toString(16).padStart(2, '0')).join(' ');
check(`${cases.length} reads of the latch and TED's registers are machine.js's`, hex(got) === hex(want), `\n  C16.io:     ${hex(got)}\n  machine.js: ${hex(want)}`);
check('a joystick reads in its port only', got[0] !== 0xFF && got[1] !== 0xFF && got[0] !== got[1]);
check('a key reads in its row only', got[3] !== 0xFF && got[4] === 0xFF);
check('the registers are kept in m at their addresses', ramP[0xFF11] === 0x37 && io.ted[0x11] === 0x37);

// The page's own reads come first; the rest is the model's
{
  const m2 = new Uint8Array(65536), io2 = C16.io(m2, { read: a => (a === 0xFF1D ? 0x42 : undefined) });
  m2[0xFF15] = 0x03;
  check('opts.read answers first', io2.read(0xFF1D) === 0x42 && io2.read(0xFF15) === 0x83);
}
// The sound's writes, with the time the page gives them
{
  const m3 = new Uint8Array(65536), log = [];
  let t = 100;
  const io3 = C16.io(m3, { log, now: () => t });
  io3.write(0xFF0E, 0x10); t = 200; io3.write(0xFF12, 0xC1); io3.write(0xFF13, 0x00); io3.write(0xFF11, 0x18);
  check('the sound registers\' writes are logged with their time', JSON.stringify(log) === JSON.stringify([[100, 0xFF0E, 0x10], [200, 0xFF12, 0xC1], [200, 0xFF11, 0x18]]), JSON.stringify(log));
}
// A Play tab's port sees each write once it is kept; $FF09 clears flags and is kept nowhere
{
  const m5 = new Uint8Array(65536), seen = [];
  const io5 = C16.io(m5, { write: (a, v) => seen.push([a, v, a >= 0xFF00 && a < 0xFF20 ? io5.ted[a & 0x1F] : -1]) });
  io5.write(0xFF0B, 0x1C2); io5.write(0xFF09, 0x02); io5.write(0xFD30, 0xFE);
  check('opts.write sees every write, kept first and as a byte', JSON.stringify(seen) === JSON.stringify([[0xFF0B, 0xC2, 0xC2], [0xFF09, 0x02, 0x00], [0xFD30, 0xFE, -1]]), JSON.stringify(seen));
}
// $FF40-$FFFF is the RAM beneath, where a page sets the vectors
{
  const m4 = new Uint8Array(65536), io4 = C16.io(m4);
  io4.write(0xFFFE, 0x34);
  check('$FF40-$FFFF is the RAM at $3F40-$3FFF', m4[0x3FFE] === 0x34 && io4.read(0xFFFE) === 0x34 && io4.read(0xFF3E) === 0xFF);
}

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
