'use strict';
// Self-test of the 6502 simulator (cpu6502.js) on hand-worked cases: ADC and SBC flags in both
// modes (decimal by the NMOS rules of Bruce Clark's "Decimal Mode", appendix A), compares, BIT,
// shifts and rotates, INC/DEC wrap, the stack, JSR/RTS, branches across a page, JMP ($xxFF).
// Run: node kit/c64/test_cpu6502.js

const { CPU } = require('./cpu6502');
let bad = 0, runs = 0;
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');

// Assemble bytes at $1000 followed by RTS, run with the given registers, return the CPU.
function run(bytes, regs = {}, setup) {
  const mem = new Uint8Array(65536);
  mem.set(bytes.concat([0x60]), 0x1000);
  if (setup) setup(mem);
  const cpu = new CPU(mem);
  cpu.call(0x1000, regs);
  return cpu;
}
function expect(name, got, want) {
  runs++;
  const ok = Object.keys(want).every(k => got[k] === want[k]);
  if (!ok) {
    bad++;
    console.log('FAIL', name, 'got', JSON.stringify(Object.fromEntries(Object.keys(want).map(k => [k, got[k]]))), 'want', JSON.stringify(want));
  }
}

// ADC and SBC, binary: the overflow table from the 6502.org tutorial on V.
const adc = [[0x50, 0x10, 0, 0x60, 0, 0, 0], [0x50, 0x50, 0, 0xA0, 0, 1, 1], [0x50, 0x90, 0, 0xE0, 0, 0, 1],
             [0x50, 0xD0, 0, 0x20, 1, 0, 0], [0xD0, 0x10, 0, 0xE0, 0, 0, 1], [0xD0, 0x50, 0, 0x20, 1, 0, 0],
             [0xD0, 0x90, 0, 0x60, 1, 1, 0], [0xD0, 0xD0, 0, 0xA0, 1, 0, 1], [0xFF, 0x01, 0, 0x00, 1, 0, 0],
             [0x7F, 0x00, 1, 0x80, 0, 1, 1]];
for (const [a, b, c, r, cc, v, n] of adc) {
  const cpu = run([0x69, b], { a, c, d: 0 });
  expect(`ADC ${hex(a)}+${hex(b)}+${c}`, { a: cpu.a, c: cpu.c, v: cpu.v, n: cpu.n, z: cpu.z }, { a: r, c: cc, v, n, z: r === 0 ? 1 : 0 });
}
const sbc = [[0x50, 0xF0, 0x60, 0, 0], [0x50, 0xB0, 0xA0, 0, 1], [0x50, 0x70, 0xE0, 0, 0], [0x50, 0x30, 0x20, 1, 0],
             [0xD0, 0xF0, 0xE0, 0, 0], [0xD0, 0xB0, 0x20, 1, 0], [0xD0, 0x70, 0x60, 1, 1], [0xD0, 0x30, 0xA0, 1, 0]];
for (const [a, b, r, cc, v] of sbc) {
  const cpu = run([0xE9, b], { a, c: 1, d: 0 });
  expect(`SBC ${hex(a)}-${hex(b)}`, { a: cpu.a, c: cpu.c, v: cpu.v }, { a: r, c: cc, v });
}
// Decimal mode, NMOS.
const dadc = [[0x58, 0x46, 0, 0x04, 1], [0x12, 0x34, 0, 0x46, 0], [0x15, 0x26, 0, 0x41, 0], [0x81, 0x92, 0, 0x73, 1],
              [0x00, 0x00, 1, 0x01, 0], [0x79, 0x00, 1, 0x80, 0]];
for (const [a, b, c, r, cc] of dadc) {
  const cpu = run([0x69, b], { a, c, d: 1 });
  expect(`ADC decimal ${hex(a)}+${hex(b)}+${c}`, { a: cpu.a, c: cpu.c }, { a: r, c: cc });
}
{ // 99 + 01: A = 00, C = 1, but Z = 0 (binary sum $9A) and N = 1 on the NMOS part
  const cpu = run([0x69, 0x01], { a: 0x99, c: 0, d: 1 });
  expect('ADC decimal 99+01 flags', { a: cpu.a, c: cpu.c, z: cpu.z, n: cpu.n }, { a: 0, c: 1, z: 0, n: 1 });
  const cpu2 = run([0x69, 0x01], { a: 0x79, c: 0, d: 1 });   // 79 + 01 = 80, V set (signed 0x70+0x10 = 0x80)
  expect('ADC decimal 79+01 V', { a: cpu2.a, v: cpu2.v, n: cpu2.n }, { a: 0x80, v: 1, n: 1 });
}
const dsbc = [[0x46, 0x12, 1, 0x34, 1], [0x40, 0x13, 1, 0x27, 1], [0x32, 0x02, 0, 0x29, 1], [0x12, 0x21, 1, 0x91, 0],
              [0x21, 0x34, 1, 0x87, 0]];
for (const [a, b, c, r, cc] of dsbc) {
  const cpu = run([0xE9, b], { a, c, d: 1 });
  expect(`SBC decimal ${hex(a)}-${hex(b)}-${1 - c}`, { a: cpu.a, c: cpu.c }, { a: r, c: cc });
}
// Compares, BIT.
for (const [m, z, c, n] of [[0x40, 1, 1, 0], [0x41, 0, 0, 1], [0x3F, 0, 1, 0], [0xC0, 0, 0, 1]]) {
  const cpu = run([0xC9, m], { a: 0x40 });
  expect(`CMP $40,${hex(m)}`, { z: cpu.z, c: cpu.c, n: cpu.n }, { z, c, n });
}
{
  const cpu = run([0x24, 0x10], { a: 0x01 }, mem => { mem[0x10] = 0xC0; });
  expect('BIT', { z: cpu.z, n: cpu.n, v: cpu.v, a: cpu.a }, { z: 1, n: 1, v: 1, a: 1 });
  const cpu2 = run([0xE0, 0x80, 0xC0, 0x7F], { x: 0x7F, y: 0x80 });   // CPX #$80 then CPY #$7F
  expect('CPY after CPX', { c: cpu2.c, z: cpu2.z }, { c: 1, z: 0 });
}
// Shifts and rotates.
{
  expect('ASL A $80', (c => ({ a: c.a, c: c.c, z: c.z }))(run([0x0A], { a: 0x80 })), { a: 0, c: 1, z: 1 });
  expect('LSR A $01', (c => ({ a: c.a, c: c.c, z: c.z }))(run([0x4A], { a: 0x01 })), { a: 0, c: 1, z: 1 });
  expect('ROR A $01, C=1', (c => ({ a: c.a, c: c.c, n: c.n }))(run([0x6A], { a: 0x01, c: 1 })), { a: 0x80, c: 1, n: 1 });
  expect('ROL A $80, C=0', (c => ({ a: c.a, c: c.c, z: c.z }))(run([0x2A], { a: 0x80, c: 0 })), { a: 0, c: 1, z: 1 });
  const c = run([0x66, 0x20, 0x26, 0x21], { c: 1 }, mem => { mem[0x20] = 0x02; mem[0x21] = 0x40; });   // ROR $20, ROL $21
  expect('ROR/ROL memory', { m20: c.m[0x20], m21: c.m[0x21], c: c.c }, { m20: 0x81, m21: 0x80, c: 0 });
}
// INC/DEC wrap, transfers, stack.
{
  const c = run([0xE6, 0x30, 0xC6, 0x31, 0xCA, 0x88], { x: 0, y: 1 }, mem => { mem[0x30] = 0xFF; mem[0x31] = 0x00; });
  expect('INC/DEC/DEX/DEY', { m30: c.m[0x30], m31: c.m[0x31], x: c.x, y: c.y, z: c.z }, { m30: 0, m31: 0xFF, x: 0xFF, y: 0, z: 1 });
  // LDA #$42 PHA LDA #0 PHP PLA TAX PLA: PHP pushes B and bit 5 set, with I (set at reset) and Z
  const s = run([0xA9, 0x42, 0x48, 0xA9, 0x00, 0x08, 0x68, 0xAA, 0x68], {});
  expect('stack', { a: s.a, x: s.x, sp: s.sp }, { a: 0x42, x: 0x36, sp: 0xFF });
}
// JSR/RTS, a branch backward across a page boundary, JMP indirect at a page end.
{
  const c = run([0x20, 0x00, 0x20, 0xE8], { x: 0 }, mem => { mem[0x2000] = 0xE8; mem[0x2001] = 0x60; });   // JSR $2000 (INX RTS), INX
  expect('JSR/RTS', { x: c.x }, { x: 2 });
  const b = run([0x4C, 0xFE, 0x10], { x: 3 }, mem => {             // JMP $10FE: DEX, BNE back to $10FE across $1100
    mem[0x10FE] = 0xCA; mem[0x10FF] = 0xD0; mem[0x1100] = 0xFD; mem[0x1101] = 0x60;
  });
  expect('branch across a page', { x: b.x }, { x: 0 });
  const j = run([0x6C, 0xFF, 0x30], {}, mem => {                    // JMP ($30FF): high byte from $3000
    mem[0x30FF] = 0x00; mem[0x3000] = 0x40; mem[0x3100] = 0x50;
    mem[0x4000] = 0xA9; mem[0x4001] = 0x11; mem[0x4002] = 0x60;
    mem[0x5000] = 0xA9; mem[0x5001] = 0x22; mem[0x5002] = 0x60;
  });
  expect('JMP ($30FF) takes the high byte from $3000', { a: j.a }, { a: 0x11 });
}
// Indexed indirect and indirect indexed, zero-page wrap.
{
  const c = run([0xA1, 0xFE, 0xB1, 0xFF], { x: 0x01, y: 0x02 }, mem => {
    mem[0xFF] = 0x00; mem[0x00] = 0x60;                              // ($FE,X) = ($FF) -> $6000; ($FF),Y -> $6002
    mem[0x6000] = 0x33; mem[0x6002] = 0x44;
  });
  expect('($zp,X) and ($zp),Y wrap in zero page', { a: c.a }, { a: 0x44 });
}
// An unknown opcode is reported.
{
  runs++;
  try { run([0x02]); bad++; console.log('FAIL: opcode $02 ran'); } catch (e) { if (!/undocumented opcode \$02/.test(e.message)) { bad++; console.log('FAIL', e.message); } }
}
console.log(bad ? `FAILED ${bad} of ${runs}` : `all ${runs} simulator checks pass`);
process.exit(bad ? 1 : 0);
