'use strict';
// Self-test of the 6502 simulator (cpu6502.js), run by CI. Every expected value is worked by hand
// or measured in VICE, not taken from the simulator:
// - single instructions: ADC and SBC flags in both modes (decimal by the NMOS rules of Bruce Clark's
//   "Decimal Mode", appendix A), compares, BIT, shifts and rotates, INC/DEC wrap, the stack, JSR/RTS,
//   branches across a page, JMP ($xxFF), zero-page wrap, and each undocumented opcode;
// - the opcode table against kit/c64/opcodes.py, and each instruction's length and cycles;
// - the C64's map: the port read back and the banking table as VICE (x64sc, vice-mcp 3.13.1)
//   gave them on 26 September 2026, I/O handed to the caller, ROM stops and hooks;
// - call, run, irq, nmi, the KERNAL's interrupt paths, the address maps, a snapshot's modules;
// - programs: multiply, BCD counting and conversion, copies, sorting, recursion, a jump table,
//   self-modifying code, an LFSR, a frame loop with its interrupt.
// Run: node kit/c64/test_cpu6502.js
// The simulator was also checked against Tom Harte's SingleStepTests and against VICE itself, which
// need downloads and the emulator: kit/c64/check_cpu6502.js.

const fs = require('fs'), os = require('os'), path = require('path');
const { CPU, OPCODES, readSnapshot, loadSnapshot } = require('./cpu6502');
let bad = 0, runs = 0;
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');

function expect(name, got, want) {
  runs++;
  const ok = Object.keys(want).every(k => got[k] === want[k]);
  if (!ok) {
    bad++;
    console.log('FAIL', name, 'got', JSON.stringify(Object.fromEntries(Object.keys(want).map(k => [k, got[k]]))), 'want', JSON.stringify(want));
  }
}
function throws(name, f, re) {
  runs++;
  try { f(); } catch (e) { if (re.test(e.message)) return e; bad++; console.log('FAIL', name, 'threw', e.message); return e; }
  bad++; console.log('FAIL', name, 'did not stop');
  return null;
}

// Assemble bytes at $1000 followed by RTS, run with the given registers, return the CPU.
function run(bytes, regs = {}, setup, opts) {
  const mem = new Uint8Array(65536);
  mem.set(bytes.concat([0x60]), 0x1000);
  if (setup) setup(mem);
  const cpu = new CPU(mem, opts);
  cpu.call(0x1000, regs);
  return cpu;
}
// One instruction at $1000, stepped.
function one(bytes, regs = {}, setup, opts) {
  const mem = new Uint8Array(65536);
  mem.set(bytes, 0x1000);
  if (setup) setup(mem);
  const cpu = new CPU(mem, opts);
  cpu.setRegs(Object.assign({ pc: 0x1000 }, regs));
  cpu.step();
  return cpu;
}

// A small assembler for the programs below: an instruction, a label ("name:") or .byte/.word per
// line; ';' starts a comment. Operands: a, #v, v, v,x, v,y, (v), (v,x), (v),y, where v is $hex,
// %binary, decimal or a label, with + and - terms and a leading < or > for the low or high byte.
const CODE = {};
OPCODES.forEach(([n, m], op) => { if (!((n + ' ' + m) in CODE)) CODE[n + ' ' + m] = op; });
const LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2 };
function asm(org, src) {
  const lines = src.split('\n').map(l => l.replace(/;.*$/, '').trim()).filter(Boolean);
  const labels = {}, modes = [];
  const term = (t, pass) => {
    if (t[0] === '$') return parseInt(t.slice(1), 16);
    if (t[0] === '%') return parseInt(t.slice(1), 2);
    if (/^\d+$/.test(t)) return +t;
    if (t in labels) return labels[t];
    if (pass === 2) throw new Error('unknown label ' + t);
    return 0x1000;                                   // not yet seen: an address above zero page
  };
  const value = (s, pass) => {
    s = s.trim();
    const part = s[0] === '<' || s[0] === '>' ? s[0] : '';
    if (part) s = s.slice(1);
    let v = 0;
    for (const [, sign, t] of s.matchAll(/([+-]?)\s*([$%]?\w+)/g)) v += (sign === '-' ? -1 : 1) * term(t, pass);
    v &= 0xFFFF;
    return part === '<' ? v & 0xFF : part === '>' ? v >> 8 : v;
  };
  const operand = (name, op, pass) => {
    let m;
    if (op === '') return [CODE[name + ' imp'] !== undefined ? 'imp' : 'acc', 0];
    if (/^a$/i.test(op)) return ['acc', 0];
    if (op[0] === '#') return ['imm', value(op.slice(1), pass)];
    if ((m = /^\((.*),\s*x\)$/i.exec(op))) return ['izx', value(m[1], pass)];
    if ((m = /^\((.*)\),\s*y$/i.exec(op))) return ['izy', value(m[1], pass)];
    if ((m = /^\((.*)\)$/.exec(op))) return ['ind', value(m[1], pass)];
    if ((m = /^(.*),\s*([xy])$/i.exec(op))) {
      const v = value(m[1], pass), r = m[2].toLowerCase();
      return [v < 0x100 && CODE[name + ' zp' + r] !== undefined ? 'zp' + r : 'ab' + r, v];
    }
    const v = value(op, pass);
    if (CODE[name + ' rel'] !== undefined) return ['rel', v];
    return [v < 0x100 && CODE[name + ' zp'] !== undefined ? 'zp' : 'abs', v];
  };
  let out;
  for (const pass of [1, 2]) {
    let pc = org;
    out = [];
    lines.forEach((line, i) => {
      let m = /^(\w+):\s*(.*)$/.exec(line);
      if (m) { labels[m[1]] = pc; line = m[2]; if (!line) return; }
      m = /^(\.?\w+)\s*(.*)$/.exec(line);
      const name = m[1].toLowerCase(), op = m[2].trim();
      if (name === '.byte' || name === '.word') {
        for (const e of op.split(',')) {
          const v = value(e, pass);
          if (name === '.byte') out.push(v & 0xFF); else out.push(v & 0xFF, v >> 8);
        }
        pc = org + out.length;
        return;
      }
      let [mode, v] = operand(name, op, pass);
      if (pass === 1) modes[i] = mode; else mode = modes[i];   // pass 2 keeps pass 1's sizes
      const code = CODE[name + ' ' + mode];
      if (code === undefined) throw new Error('no ' + name + ' ' + mode + ': ' + line);
      out.push(code);
      if (mode === 'rel') {
        const d = pass === 2 ? v - (pc + 2) : 0;
        if (d < -128 || d > 127) throw new Error('branch out of range: ' + line);
        out.push(d & 0xFF);
      } else if (LEN[mode] === 2) out.push(v & 0xFF);
      else if (LEN[mode] === 3) out.push(v & 0xFF, v >> 8);
      pc = org + out.length;
    });
  }
  return { bytes: out, labels };
}
// Assemble at org into a fresh memory (or the one given) and return a CPU on it.
function machine(org, src, opts, mem) {
  mem = mem || new Uint8Array(65536);
  const a = asm(org, src);
  mem.set(a.bytes, org);
  const cpu = new CPU(mem, opts);
  cpu.labels = a.labels;
  return cpu;
}

// --- single instructions -------------------------------------------------------------------------

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
// JSR reads its high byte after the pushes: here the push of the return address overwrites it.
{
  const mem = new Uint8Array(65536);
  mem.set([0x20, 0x34, 0x12], 0x01FD);                               // JSR $1234 at $01FD, SP = $FF
  const cpu = new CPU(mem);
  cpu.setRegs({ pc: 0x01FD, sp: 0xFF });
  cpu.step();                                                        // pushes $01 at $01FF, $FF at $01FE
  expect('JSR takes its high byte after the pushes', { pc: cpu.pc, s1: mem[0x1FF], s0: mem[0x1FE] }, { pc: 0x0134, s1: 0x01, s0: 0xFF });
}

// --- the undocumented opcodes, as VICE runs them -------------------------------------------------
{
  let c = one([0xA7, 0x10], {}, m => { m[0x10] = 0x80; });
  expect('LAX zp', { a: c.a, x: c.x, n: c.n, z: c.z }, { a: 0x80, x: 0x80, n: 1, z: 0 });
  c = one([0x87, 0x11], { a: 0xF0, x: 0x3C });
  expect('SAX zp', { m: c.m[0x11] }, { m: 0x30 });
  // DCP $FF86,X with X = $FF works on $0085 (kit/skills/c64/c64-reference, "Undocumented opcodes")
  c = one([0xDF, 0x86, 0xFF], { x: 0xFF, a: 0x42 }, m => { m[0x85] = 0x43; });
  expect('DCP abs,X wraps past $FFFF into zero page', { m: c.m[0x85], z: c.z, c: c.c }, { m: 0x42, z: 1, c: 1 });
  // LXA #$FF then DCP $FF97,X: X comes out as $EE only with VICE's constant, and the address wraps to $0085
  c = run([0xAB, 0xFF, 0xDF, 0x97, 0xFF], { a: 0x00 }, m => { m[0x85] = 0x01; });
  expect('LXA #$FF then DCP $FF97,X', { a: c.a, x: c.x, m: c.m[0x85], c: c.c, n: c.n }, { a: 0xEE, x: 0xEE, m: 0x00, c: 1, n: 1 });
  c = one([0x8B, 0xFF], { a: 0x00, x: 0xFF });
  expect('ANE takes $EF', { a: c.a, n: c.n }, { a: 0xEF, n: 1 });
  c = one([0x8B, 0xFF], { a: 0x00, x: 0xFF }, null, { ane: 0xEE });
  expect('ANE with the constant given', { a: c.a }, { a: 0xEE });
  c = one([0x07, 0x12], { a: 0x01 }, m => { m[0x12] = 0x81; });
  expect('SLO zp', { m: c.m[0x12], a: c.a, c: c.c }, { m: 0x02, a: 0x03, c: 1 });
  c = one([0x27, 0x12], { a: 0x0F, c: 1 }, m => { m[0x12] = 0x81; });
  expect('RLA zp', { m: c.m[0x12], a: c.a, c: c.c }, { m: 0x03, a: 0x03, c: 1 });
  c = one([0x47, 0x12], { a: 0xFF }, m => { m[0x12] = 0x81; });
  expect('SRE zp', { m: c.m[0x12], a: c.a, c: c.c, n: c.n }, { m: 0x40, a: 0xBF, c: 1, n: 1 });
  c = one([0x67, 0x12], { a: 0x10, c: 1 }, m => { m[0x12] = 0x02; });
  expect('RRA zp', { m: c.m[0x12], a: c.a, c: c.c, v: c.v }, { m: 0x81, a: 0x91, c: 0, v: 0 });
  c = one([0x67, 0x12], { a: 0x25, c: 0, d: 1 }, m => { m[0x12] = 0x10; });
  expect('RRA zp, decimal', { m: c.m[0x12], a: c.a, c: c.c }, { m: 0x08, a: 0x33, c: 0 });
  c = one([0xE7, 0x12], { a: 0x20, c: 1 }, m => { m[0x12] = 0x0F; });
  expect('ISB zp', { m: c.m[0x12], a: c.a, c: c.c }, { m: 0x10, a: 0x10, c: 1 });
  c = one([0xE7, 0x12], { a: 0x20, c: 1, d: 1 }, m => { m[0x12] = 0x08; });
  expect('ISB zp, decimal', { m: c.m[0x12], a: c.a, c: c.c }, { m: 0x09, a: 0x11, c: 1 });
  c = one([0x6B, 0xC0], { a: 0xFF, c: 1 });
  expect('ARR', { a: c.a, n: c.n, c: c.c, v: c.v }, { a: 0xE0, n: 1, c: 1, v: 0 });
  c = one([0x6B, 0x40], { a: 0xFF, c: 0 });
  expect('ARR, V from bits 6 and 5', { a: c.a, c: c.c, v: c.v }, { a: 0x20, c: 0, v: 1 });
  c = one([0x6B, 0x75], { a: 0xFF, c: 1, d: 1 });                   // $75 ROR C=1 -> $BA, then both nibbles fixed
  expect('ARR, decimal', { a: c.a, n: c.n, z: c.z, v: c.v, c: c.c }, { a: 0x10, n: 1, z: 0, v: 1, c: 1 });
  c = one([0x4B, 0x03], { a: 0xFF });
  expect('ASR', { a: c.a, c: c.c }, { a: 0x01, c: 1 });
  c = one([0x0B, 0x80], { a: 0xFF });
  expect('ANC: C from N', { a: c.a, n: c.n, c: c.c }, { a: 0x80, n: 1, c: 1 });
  c = one([0x2B, 0x7F], { a: 0xFF, c: 1 });
  expect('ANC ($2B)', { a: c.a, c: c.c }, { a: 0x7F, c: 0 });
  c = one([0xCB, 0x10], { a: 0xF0, x: 0x3F });
  expect('SBX', { x: c.x, c: c.c, a: c.a }, { x: 0x20, c: 1, a: 0xF0 });
  c = one([0xCB, 0x31], { a: 0xF0, x: 0x3F });
  expect('SBX borrowing', { x: c.x, c: c.c, n: c.n }, { x: 0xFF, c: 0, n: 1 });
  c = one([0xCB, 0x30], { a: 0xF0, x: 0x3F });
  expect('SBX to zero', { x: c.x, c: c.c, z: c.z }, { x: 0x00, c: 1, z: 1 });
  c = one([0xEB, 0x10], { a: 0x50, c: 1 });
  expect('USBC is SBC', { a: c.a, c: c.c }, { a: 0x40, c: 1 });
  c = one([0xBB, 0x00, 0x30], { sp: 0xF7, y: 0x00 }, m => { m[0x3000] = 0x3C; });
  expect('LAS', { sp: c.sp, a: c.a, x: c.x }, { sp: 0x34, a: 0x34, x: 0x34 });
  c = one([0x9F, 0x00, 0x12], { a: 0xFF, x: 0x0F, y: 0x10 });       // $0F & ($12 + 1)
  expect('SHA abs,Y', { m: c.m[0x1210] }, { m: 0x03 });
  c = one([0x9F, 0xF0, 0x12], { a: 0xFF, x: 0x0F, y: 0x20 });       // crosses: the value becomes the high byte
  expect('SHA abs,Y across a page', { m: c.m[0x0310], other: c.m[0x1310] }, { m: 0x03, other: 0 });
  c = one([0x93, 0x20], { a: 0xFF, x: 0xFF, y: 0x01 }, m => { m[0x20] = 0x34; m[0x21] = 0x12; });
  expect('SHA (zp),Y', { m: c.m[0x1235] }, { m: 0x13 });
  c = one([0x9E, 0x00, 0x11], { x: 0xFF, y: 0x05 });
  expect('SHX', { m: c.m[0x1105] }, { m: 0x12 });
  c = one([0x9C, 0x00, 0x20], { y: 0xFF, x: 0x01 });
  expect('SHY', { m: c.m[0x2001] }, { m: 0x21 });
  c = one([0x9B, 0x00, 0x30], { a: 0xF3, x: 0x3F, y: 0x00 });
  expect('SHS', { sp: c.sp, m: c.m[0x3000] }, { sp: 0x33, m: 0x31 });
  c = one([0x9C, 0x00, 0xFF], { y: 0xFF, x: 0x01 });                 // high byte $FF + 1: stores 0
  expect('SHY with base high byte $FF', { m: c.m[0xFF01] }, { m: 0x00 });
  // the no-ops: length, cycles, nothing changed
  for (const [bytes, len, cyc] of [[[0x1A], 1, 2], [[0x80, 0xFF], 2, 2], [[0x04, 0x10], 2, 3], [[0x14, 0x10], 2, 4],
                                   [[0x0C, 0x00, 0x30], 3, 4], [[0x1C, 0x00, 0x30], 3, 4], [[0x1C, 0xFF, 0x30], 3, 5]]) {
    c = one(bytes, { a: 0x11, x: 0x01, y: 0x33, p: 0xC3 });
    expect(`NOOP ${hex(bytes[0])}`, { pc: c.pc, cycles: c.cycles, a: c.a, x: c.x, y: c.y, p: c.p },
      { pc: 0x1000 + len, cycles: cyc, a: 0x11, x: 0x01, y: 0x33, p: 0xE3 });
  }
  const e = throws('JAM stops', () => one([0x02]), /^JAM \$02 at \$1000/);
  expect('JAM address', { address: e && e.address }, { address: 0x1000 });
  throws('strict stops at an undocumented opcode', () => run([0xA7, 0x10], {}, null, { strict: true }),
    /undocumented opcode \$A7 \(lax zp\) at \$1000/);
}

// --- the opcode table, lengths and cycles --------------------------------------------------------
{
  const names = OPCODES.map(o => o[0]);
  expect('256 opcodes: 105 undocumented, 12 JAM', { n: OPCODES.filter(Boolean).length, jam: names.filter(n => n === 'jam').length,
    undoc: names.filter(n => /^(slo|rla|sre|rra|dcp|isb|sax|lax|anc|asr|arr|ane|lxa|sbx|usbc|las|shs|sha|shx|shy|noop|jam)$/.test(n)).length },
    { n: 256, jam: 12, undoc: 105 });
  let py = null;
  try {
    py = JSON.parse(require('child_process').execFileSync('python3', ['-c',
      'import json, sys; sys.path.insert(0, sys.argv[1]); from opcodes import ALL; print(json.dumps(ALL))', __dirname],
      { encoding: 'utf8' }));
  } catch (e) { console.log('(python3 did not answer: the table was not compared with opcodes.py)'); }
  if (py) {
    const differ = OPCODES.map(([n, m], op) => (py[op] || []).join(' ') === n + ' ' + m ? null : hex(op)).filter(Boolean);
    expect('the table agrees with kit/c64/opcodes.py', { differ: differ.join(' ') }, { differ: '' });
  }
  const control = /^(brk|jmp|jsr|rts|rti|bcc|bcs|beq|bmi|bne|bpl|bvc|bvs|jam)$/;
  const wrong = [];
  OPCODES.forEach(([n, m], op) => {
    if (control.test(n)) return;
    const c = one([op, 0x10, 0x20], { sp: 0x80 });
    if (c.pc !== 0x1000 + LEN[m]) wrong.push(hex(op));
  });
  expect('each instruction is as long as its mode', { wrong: wrong.join(' ') }, { wrong: '' });
  // cycles, by hand: base, page crossed, branch taken and crossing
  const cyc = (bytes, regs, setup) => one(bytes, regs, setup).cycles;
  expect('cycles of indexed reads', { abx: cyc([0xBD, 0x00, 0x30], { x: 0xFF }), abxCross: cyc([0xBD, 0x01, 0x30], { x: 0xFF }),
    izy: cyc([0xB1, 0x20], { y: 1 }, m => { m[0x20] = 0x00; m[0x21] = 0x30; }),
    izyCross: cyc([0xB1, 0x20], { y: 1 }, m => { m[0x20] = 0xFF; m[0x21] = 0x30; }), laxAby: cyc([0xBF, 0xFF, 0x30], { y: 1 }) },
    { abx: 4, abxCross: 5, izy: 5, izyCross: 6, laxAby: 5 });
  expect('cycles of stores and read-modify-writes', { staAbx: cyc([0x9D, 0x00, 0x30], { x: 0 }), staIzy: cyc([0x91, 0x20], {}),
    incAbx: cyc([0xFE, 0x00, 0x30], {}), dcpIzy: cyc([0xD3, 0x20], {}), shaAby: cyc([0x9F, 0xFF, 0x30], { y: 1 }), slo: cyc([0x0F, 0, 0x30], {}) },
    { staAbx: 5, staIzy: 6, incAbx: 7, dcpIzy: 8, shaAby: 5, slo: 6 });
  expect('cycles of branches', { not: cyc([0xD0, 0x10], { z: 1 }), taken: cyc([0xD0, 0x10], { z: 0 }), across: cyc([0xD0, 0xF0], { z: 0 }) },
    { not: 2, taken: 3, across: 4 });
  expect('cycles of jumps and the stack', { jsr: cyc([0x20, 0, 0x20], {}), jmp: cyc([0x4C, 0, 0x20], {}), jmpInd: cyc([0x6C, 0, 0x20], {}),
    brk: cyc([0x00], {}), pha: cyc([0x48], {}), pla: cyc([0x68], {}), php: cyc([0x08], {}), plp: cyc([0x28], {}) },
    { jsr: 6, jmp: 3, jmpInd: 5, brk: 7, pha: 3, pla: 4, php: 3, plp: 4 });
  // a delay loop: LDX #0 (2), then DEX (2) and BNE (3 taken, 2 not) 256 times, RTS (6)
  let c = machine(0x1000, 'ldx #0\nloop: dex\nbne loop\nrts');
  c.call(0x1000);
  expect('a delay loop', { cycles: c.cycles }, { cycles: 2 + 255 * 5 + 4 + 6 });
  // the same with the branch crossing a page back to $10FF: 4 cycles a pass
  c = machine(0x10FD, 'ldx #0\nloop: dex\nbne loop\nrts');
  c.call(0x10FD);
  expect('a delay loop across a page', { cycles: c.cycles }, { cycles: 2 + 255 * 6 + 4 + 6 });
}

// --- the C64's map --------------------------------------------------------------------------------
{
  // The port read back, measured in VICE: $00 and then $01 written, $01 and $00 read, in this order.
  const pairs = [[0x2F, 0x37, 0x37], [0x2F, 0x00, 0x10], [0xFF, 0xFF, 0xFF], [0x00, 0xFF, 0xDF], [0xFF, 0x00, 0x00],
                 [0x00, 0x00, 0x17], [0x07, 0x05, 0x15], [0xC0, 0xC0, 0xD7], [0x00, 0x00, 0xD7], [0x08, 0x08, 0xDF],
                 [0x20, 0x20, 0xFF], [0x2F, 0x37, 0xF7]];
  const src = pairs.map(([d, v], i) => `lda #${d}\nsta $00\nlda #${v}\nsta $01\nlda $01\nsta $C200+${i}\nlda $00\nsta $C280+${i}`).join('\n');
  const c = machine(0xC000, src + '\nrts', { port: { dir: 0x2F, data: 0x37 } });
  c.call(0xC000);
  const got = pairs.map((p, i) => hex(c.m[0xC200 + i]) + '/' + hex(c.m[0xC280 + i])).join(' ');
  expect('the port read back as VICE reads it', { got }, { got: pairs.map(([d, , r]) => hex(r) + '/' + hex(d)).join(' ') });
}
{
  // The banking table, measured in VICE: RAM marked $5A under each area; BASIC's first byte $94,
  // the character ROM's $3C, the KERNAL's $85, and $D000 in I/O (the VIC's sprite 0 X) $00.
  const rom = { basic: new Uint8Array(8192).fill(0x94), kernal: new Uint8Array(8192).fill(0x85), char: new Uint8Array(4096).fill(0x3C) };
  const io = { read: () => 0x00, write: () => {} };
  let src = 'lda #$2F\nsta $00\nlda #$34\nsta $01\nlda #$5A\nsta $A000\nsta $D000\nsta $E000\n';
  for (let cfg = 0; cfg < 8; cfg++) {
    src += `lda #${0x30 | cfg}\nsta $01\n` + ['$A000', '$D000', '$E000'].map((a, j) => `lda ${a}\nsta $C300+${cfg * 4 + j}`).join('\n') + '\n';
  }
  src += 'lda #$37\nsta $01\nlda #$77\nsta $A000\nsta $E000\nlda #$33\nsta $01\nlda #$66\nsta $D001\nlda #$34\nsta $01\n' +
         'lda $A000\nsta $C340\nlda $E000\nsta $C341\nlda $D001\nsta $C342\nlda #$37\nsta $01\nrts';
  const c = machine(0xC000, src, { port: 0x37, rom, io });
  c.call(0xC000);
  const table = [];
  for (let cfg = 0; cfg < 8; cfg++) table.push([0, 1, 2].map(j => hex(c.m[0xC300 + cfg * 4 + j])).join(' '));
  expect('the banking table as VICE has it', { t: table.join(' | ') }, { t: [
    '$5A $5A $5A', '$5A $3C $5A', '$5A $3C $85', '$94 $3C $85', '$5A $5A $5A', '$5A $00 $5A', '$5A $00 $85', '$94 $00 $85'].join(' | ') });
  expect('writes under the ROMs go to RAM', { a: c.m[0xC340], e: c.m[0xC341], d: c.m[0xC342] }, { a: 0x77, e: 0x77, d: 0x66 });
}
{
  // I/O goes to the caller, a read-modify-write writes twice, and a chip with no function stops the run.
  const log = [];
  const io = { read: a => (a === 0xD020 ? 0x0E : a === 0xD012 ? 0x33 : 0), write: (a, v) => log.push(hex(a >> 8) + hex(a & 0xFF).slice(1) + '=' + hex(v)) };
  let c = machine(0xC000, 'inc $D020\nlda $D012\nsta $D418\nrts', { port: 0x35, io });
  c.call(0xC000);
  expect('I/O writes in order, INC writing twice', { log: log.join(' '), a: c.a }, { log: '$D020=$0E $D020=$0F $D418=$33', a: 0x33 });
  c = machine(0xC000, 'lda #$0F\nsta $D418\nrts', { port: 0x35 });
  throws('no io: the run stops and names the chip', () => c.call(0xC000), /write of \$0F to \$D418 \(the SID\) at \$C002/);
  c = machine(0xC000, 'lda $DC01\nrts', { port: 0x35, io: { read: () => undefined } });
  throws('io.read that gives nothing', () => c.call(0xC000), /read of \$DC01 \(CIA 1\) .*io.read gave no value/);
  c = machine(0xC000, 'lda #1\nsta $D020\nrts', { port: 0x34 });
  c.call(0xC000);
  expect('with $01 = $34 the chips are out: RAM', { m: c.m[0xD020] }, { m: 1 });
  // ($FF),Y on the C64: the pointer's high byte is the port's direction register at $00
  c = machine(0xC000, 'ldy #0\nlda ($FF),y\nrts', { port: { dir: 0x2F, data: 0x37 } });
  c.m[0xFF] = 0x00; c.m[0x2F00] = 0x99; c.m[0x00] = 0x12;
  c.call(0xC000);
  expect('($FF),Y takes its high byte from the port', { a: c.a }, { a: 0x99 });
}
{
  // ROM: no images, so a call into one stops with the address; a hook stands in; images run.
  let c = machine(0xC000, 'lda #$41\njsr $FFD2\nrts', { port: 0x37 });
  let e = throws('a call into the KERNAL stops', () => c.call(0xC000), /program counter reached \$FFD2 in the KERNAL ROM, after \$C002/);
  expect('the stop names the address', { address: e && e.address }, { address: 0xFFD2 });
  const out = [];
  c = machine(0xC000, 'lda #$41\njsr $FFD2\nlda #$42\njsr $FFD2\nrts', { port: 0x37 });
  c.call(0xC000, {}, { hooks: { 0xFFD2: cpu => { out.push(cpu.a); cpu.rts(); } } });
  expect('a hook stands in for CHROUT', { out: out.join(',') }, { out: '65,66' });
  c = machine(0xC000, 'lda $A000\nrts', { port: 0x37 });
  throws('a read of BASIC stops', () => c.call(0xC000), /read of \$A000 in the BASIC ROM at \$C000/);
  const kernal = new Uint8Array(8192);
  kernal.set([0xA9, 0x42, 0x60], 0);                                  // $E000: LDA #$42 RTS
  c = machine(0xC000, 'jsr $E000\nrts', { port: 0x36, rom: { kernal } });
  c.call(0xC000);
  expect('a ROM image given runs', { a: c.a }, { a: 0x42 });
  c = machine(0xC000, 'brk\nnop\nrts', { port: 0x37 });
  throws('BRK with the KERNAL banked in', () => c.call(0xC000), /BRK: the vector at \$FFFE is in the KERNAL ROM/);
  throws('io needs the map', () => new CPU(new Uint8Array(65536), { io: {} }), /need the C64 map/);
}

// --- call, run, the maps, hooks -------------------------------------------------------------------
{
  let c = machine(0x1000, 'lda #1\nldx #2\nrts');
  const n = c.call(0x1000, { y: 7 });
  expect('call: steps, registers, the stack back', { n, a: c.a, x: c.x, y: c.y, sp: c.sp }, { n: 3, a: 1, x: 2, y: 7, sp: 0xFF });
  c = machine(0x1000, 'loop: jmp loop');
  throws('the step limit', () => c.call(0x1000, {}, { maxSteps: 1000 }), /step limit \(1000\) passed at \$1000/);
  c.pc = 0x1000;
  const c0 = c.cycles;                                               // counts on from the run above
  c.run({ cycles: 100 });
  expect('run for 100 cycles stops at the next instruction', { cycles: c.cycles - c0, pc: c.pc }, { cycles: 102, pc: 0x1000 });
  c = machine(0x1000, 'ldx #0\nloop: inx\ncpx #10\nbne loop\nstx $20\ndone: rts');
  c.pc = 0x1000;
  c.run({ until: c.labels.done });
  expect('run until an address', { x: c.x, m: c.m[0x20] }, { x: 10, m: 10 });
  c = machine(0x1000, 'ldx #0\nloop: inx\njmp loop');
  let passes = 0;
  c.pc = 0x1000;
  c.run({ hooks: { [c.labels.loop]: cpu => ++passes === 5 } });
  expect('a hook that stops the run', { x: c.x, passes }, { x: 4, passes: 5 });
  c = machine(0x1000, 'lda $3000\nsta $3001\njsr sub\nrts\nsub: rts');
  const writes = new Uint8Array(65536), reads = new Uint8Array(65536), executed = new Uint8Array(65536);
  c.call(0x1000, {}, { writes, reads, executed });
  expect('the maps', { r: reads[0x3000], w: writes[0x3001], wr: writes[0x3000], stack: writes[0x1FF], sub: executed[c.labels.sub],
    operand: executed[0x1001], after: c.writes }, { r: 1, w: 1, wr: 0, stack: 1, sub: 1, operand: 0, after: null });
}

// --- interrupts -----------------------------------------------------------------------------------
{
  // the hardware's own: push PC and P with B clear, set I, run the handler to its RTI
  let c = machine(0x1100, 'inc $1000\nrti', { port: 0x35 });
  c.m[0xFFFE] = 0x00; c.m[0xFFFF] = 0x11;
  c.setRegs({ pc: 0x2000, sp: 0xF0, p: 0x21 });
  c.irq();
  expect('irq through the vector', { m: c.m[0x1000], pc: c.pc, sp: c.sp, i: c.i, pushedP: c.m[0x1EE], cycles: c.cycles },
    { m: 1, pc: 0x2000, sp: 0xF0, i: 0, pushedP: 0x21, cycles: 7 + 6 + 6 });
  c = machine(0x1100, 'rti', { port: 0x37 });
  throws('irq with the KERNAL in and no handler', () => c.irq(), /IRQ: the vector at \$FFFE is in the KERNAL ROM.*\$0314/);
  // the KERNAL's path: $FF48 pushes A, X, Y and jumps through $0314; the handler leaves by $EA31
  c = machine(0x1100, 'inc $1000\nlda #$99\nldx #$98\nldy #$97\njmp $EA31', { port: 0x37 });
  c.m[0x0314] = 0x00; c.m[0x0315] = 0x11;
  c.setRegs({ pc: 0x2000, sp: 0xF0, a: 0x11, x: 0x22, y: 0x33, p: 0x23 });
  c.irq(undefined, { kernal: true });
  expect('irq through the KERNAL', { m: c.m[0x1000], pc: c.pc, sp: c.sp, a: c.a, x: c.x, y: c.y, p: c.p, cycles: c.cycles },
    { m: 1, pc: 0x2000, sp: 0xF0, a: 0x11, x: 0x22, y: 0x33, p: 0x23, cycles: 7 + 29 + 6 + 2 + 2 + 2 + 3 + 22 });
  // NMI through its vector in RAM
  c = machine(0x1200, 'inc $1001\nrti', { port: 0x35 });
  c.m[0xFFFA] = 0x00; c.m[0xFFFB] = 0x12;
  c.setRegs({ pc: 0x2000, sp: 0xF0 });
  c.nmi();
  expect('nmi', { m: c.m[0x1001], pc: c.pc, sp: c.sp }, { m: 1, pc: 0x2000, sp: 0xF0 });
  // a frame loop: the main program runs for a frame's cycles, then the interrupt, ten times
  c = machine(0x2000, 'main: inc $1001\njmp main\nirq: inc $1000\nrti', { port: 0x35 });
  c.m[0xFFFE] = c.labels.irq & 0xFF; c.m[0xFFFF] = c.labels.irq >> 8;
  c.setRegs({ pc: 0x2000, sp: 0xFF, i: 0 });
  for (let f = 0; f < 10; f++) { c.run({ cycles: 19656 }); if (!c.i) c.irq(); }
  expect('a frame loop with its interrupt', { irqs: c.m[0x1000], sp: c.sp, i: c.i, main: c.m[0x1001] > 0 }, { irqs: 10, sp: 0xFF, i: 0, main: true });
}

// --- snapshots --------------------------------------------------------------------------------------
{
  // A snapshot laid out as VICE 3.10's x64sc writes one: header, MAINC64CPU (8-byte clock, then A, X,
  // Y, SP, PC, P), C64MEM (port data, direction, EXROM, GAME, RAM, the port's output latch), CIA1.
  const mod = (name, major, minor, body) => {
    const h = Buffer.alloc(22);
    h.write(name, 0, 'latin1'); h[16] = major; h[17] = minor; h.writeUInt32LE(22 + body.length, 18);
    return Buffer.concat([h, body]);
  };
  const vsf = ({ exrom = 0 } = {}) => {
    const head = Buffer.alloc(58);
    head.write('VICE Snapshot File\x1a', 0, 'latin1'); head[19] = 2; head.write('C64SC', 21, 'latin1');
    head.write('VICE Version\x1a', 37, 'latin1'); head[50] = 3; head[51] = 10;
    const cpu = Buffer.alloc(103);
    cpu.writeBigUInt64LE(2255035n, 0); cpu[8] = 0x11; cpu[9] = 0x22; cpu[10] = 0x33; cpu[11] = 0x5A; cpu.writeUInt16LE(0xC014, 12); cpu[14] = 0x2D;
    const mem = Buffer.alloc(4 + 65536 + 15);
    mem[0] = 0x35; mem[1] = 0x2F; mem[2] = exrom; mem[4 + 0xC014] = 0x4C; mem[4 + 0xC015] = 0x14; mem[4 + 0xC016] = 0xC0; mem[4 + 65536] = 0x25;
    return Buffer.concat([head, mod('MAINC64CPU', 1, 5, cpu), mod('C64MEM', 0, 1, mem), mod('CIA1', 2, 5, Buffer.alloc(77))]);
  };
  const file = path.join(os.tmpdir(), 'test_cpu6502_' + process.pid + '.vsf');
  try {
    fs.writeFileSync(file, vsf());
    expect('the made-up snapshot has C64MEM where the kit reads RAM from', { at: fs.readFileSync(file).indexOf('C64MEM') }, { at: 183 });
    const s = readSnapshot(file);
    expect('readSnapshot', { data: s.port.data, dir: s.port.dir, out: s.port.out, exrom: s.exrom, a: s.regs.a, x: s.regs.x, y: s.regs.y,
      sp: s.regs.sp, pc: s.regs.pc, p: s.regs.p, clock: s.clock, ram: s.ram[0xC014], len: s.ram.length },
      { data: 0x35, dir: 0x2F, out: 0x25, exrom: 0, a: 0x11, x: 0x22, y: 0x33, sp: 0x5A, pc: 0xC014, p: 0x2D, clock: 2255035, ram: 0x4C, len: 65536 });
    expect('loadSnapshot is the RAM', { ram: loadSnapshot(file)[0xC015] }, { ram: 0x14 });
    const c = CPU.fromSnapshot(file);
    expect('fromSnapshot', { pc: c.pc, sp: c.sp, a: c.a, d: c.d, port: c.rd(1), ddr: c.rd(0) }, { pc: 0xC014, sp: 0x5A, a: 0x11, d: 1, port: 0x35, ddr: 0x2F });
    c.run({ cycles: 30 });
    expect('and it runs', { pc: c.pc, cycles: c.cycles }, { pc: 0xC014, cycles: 30 });
    fs.writeFileSync(file, vsf({ exrom: 1 }));
    throws('a cartridge line is refused', () => CPU.fromSnapshot(file), /cartridge/);
    fs.writeFileSync(file, 'not a snapshot');
    throws('a file that is not a snapshot', () => readSnapshot(file), /not a VICE snapshot/);
  } finally { try { fs.unlinkSync(file); } catch (e) {} }
}

// --- programs -------------------------------------------------------------------------------------
{
  // 8 x 8 -> 16 by shift and add: $02 x $03 -> $04 (high), $05 (low)
  const c = machine(0x1000, `
        lda #0
        sta $05
        ldx #8
loop:   lsr $02
        bcc skip
        clc
        adc $03
skip:   ror a
        ror $05
        dex
        bne loop
        sta $04
        rts`);
  const wrong = [];
  for (const [a, b] of [[0, 0], [1, 255], [255, 255], [13, 17], [200, 3], [128, 2], [99, 101]]) {
    c.m[2] = a; c.m[3] = b; c.call(0x1000);
    if ((c.m[4] << 8 | c.m[5]) !== a * b) wrong.push(a + 'x' + b);
  }
  expect('multiply', { wrong: wrong.join(' ') }, { wrong: '' });
}
{
  // count to 150 in decimal, carrying into a hundreds byte
  const c = machine(0x1000, `
        sed
        lda #0
        sta $20
        sta $21
        ldx #150
loop:   clc
        lda $20
        adc #1
        sta $20
        lda $21
        adc #0
        sta $21
        dex
        bne loop
        cld
        rts`);
  c.call(0x1000);
  expect('decimal counting', { lo: c.m[0x20], hi: c.m[0x21], d: c.d }, { lo: 0x50, hi: 0x01, d: 0 });
}
{
  // a byte to decimal digits by doubling in decimal mode
  const c = machine(0x1000, `
        sed
        lda #0
        sta $31
        sta $32
        ldx #8
loop:   asl $30
        lda $32
        adc $32
        sta $32
        lda $31
        adc $31
        sta $31
        dex
        bne loop
        cld
        rts`);
  const wrong = [];
  for (let v = 0; v < 256; v++) {
    c.m[0x30] = v; c.call(0x1000);
    const want = Math.floor(v / 100) * 256 + Math.floor(v / 10 % 10) * 16 + v % 10;
    if ((c.m[0x31] << 8 | c.m[0x32]) !== want) wrong.push(v);
  }
  expect('binary to decimal, all 256', { wrong: wrong.slice(0, 5).join(' ') }, { wrong: '' });
}
{
  // four-digit decimal subtraction: 1234 - 0567
  const c = machine(0x1000, 'sed\nsec\nlda $A0\nsbc $A2\nsta $A4\nlda $A1\nsbc $A3\nsta $A5\ncld\nrts');
  c.m.set([0x34, 0x12, 0x67, 0x05], 0xA0);
  c.call(0x1000);
  expect('decimal subtraction with a borrow', { lo: c.m[0xA4], hi: c.m[0xA5], c: c.c }, { lo: 0x67, hi: 0x06, c: 1 });
}
{
  // copy two pages through (zp),Y to a destination that starts mid-page, and an EOR checksum
  const c = machine(0x1000, `
        ldy #0
        ldx #2
loop:   lda ($FB),y
        sta ($FD),y
        iny
        bne loop
        inc $FC
        inc $FE
        dex
        bne loop
        lda #0
        tax
sum:    eor $3000,x
        eor $3100,x
        inx
        bne sum
        sta $02
        rts`);
  let want = 0;
  for (let i = 0; i < 512; i++) { c.m[0x3000 + i] = (i * 37 + 11) & 0xFF; want ^= c.m[0x3000 + i]; }
  c.m.set([0x00, 0x30, 0xF0, 0x40], 0xFB);
  c.call(0x1000);
  let same = true;
  for (let i = 0; i < 512; i++) if (c.m[0x40F0 + i] !== c.m[0x3000 + i]) same = false;
  expect('copy and checksum', { same, sum: c.m[2] }, { same: true, sum: want });
}
{
  // bubble sort of 16 bytes
  const c = machine(0x1000, `
pass:   lda #0
        sta $90
        ldx #0
inner:  lda $3100,x
        cmp $3101,x
        bcc next
        beq next
        pha
        lda $3101,x
        sta $3100,x
        pla
        sta $3101,x
        lda #1
        sta $90
next:   inx
        cpx #15
        bne inner
        lda $90
        bne pass
        rts`);
  const data = [200, 3, 77, 77, 0, 255, 128, 1, 64, 9, 250, 33, 2, 190, 5, 100];
  c.m.set(data, 0x3100);
  c.call(0x1000);
  expect('bubble sort', { got: Array.from(c.m.slice(0x3100, 0x3110)).join(',') }, { got: data.slice().sort((a, b) => a - b).join(',') });
}
{
  // 5! by recursion, the stack holding each n
  const c = machine(0x1000, `
fact:   cmp #2
        bcc base
        pha
        sec
        sbc #1
        jsr fact
        pla
        tax
        lda #0
mul:    clc
        adc $70
        dex
        bne mul
        sta $70
        rts
base:   lda #1
        sta $70
        rts`);
  c.call(0x1000, { a: 5 });
  expect('factorial by recursion', { f: c.m[0x70], sp: c.sp }, { f: 120, sp: 0xFF });
}
{
  // a jump table through the stack (push the address - 1, RTS), and self-modifying code
  const c = machine(0x1000, `
        ldx $50
        lda hi,x
        pha
        lda lo,x
        pha
        rts
lo:     .byte <r0-1, <r1-1, <r2-1
hi:     .byte >r0-1, >r1-1, >r2-1
r0:     lda #$10
        jmp put
r1:     lda #$20
        jmp put
r2:     lda #$30
put:    sta patch+1
patch:  lda #$00
        sta $51
        rts`);
  const got = [0, 1, 2].map(i => { c.m[0x50] = i; c.call(0x1000); return c.m[0x51]; });
  expect('a jump table and code that rewrites itself', { got: got.join(',') }, { got: '16,32,48' });
}
{
  // a 16-bit Galois LFSR (taps $B400) against the same in JavaScript
  const c = machine(0x1000, 'lsr $81\nror $80\nbcc done\nlda $81\neor #$B4\nsta $81\ndone: rts');
  c.m[0x80] = 0x01; c.m[0x81] = 0x00;
  let s = 1, same = true;
  for (let i = 0; i < 1000; i++) {
    c.call(0x1000);
    s = (s >> 1) ^ (s & 1 ? 0xB400 : 0);
    if ((c.m[0x81] << 8 | c.m[0x80]) !== s) same = false;
  }
  expect('an LFSR, 1000 steps', { same }, { same: true });
}
{
  // signed comparison by N EOR V, over pairs
  const c = machine(0x1000, 'lda $A6\nsec\nsbc $A7\nbvc nov\neor #$80\nnov: bmi less\nlda #0\nsta $A8\nrts\nless: lda #1\nsta $A8\nrts');
  const wrong = [];
  for (const [a, b] of [[0x80, 0x7F], [0x7F, 0x80], [0x00, 0xFF], [0xFF, 0x00], [0x10, 0x10], [0xC0, 0xB0], [0x50, 0xB0]]) {
    c.m[0xA6] = a; c.m[0xA7] = b; c.call(0x1000);
    if (c.m[0xA8] !== ((a << 24 >> 24) < (b << 24 >> 24) ? 1 : 0)) wrong.push(hex(a) + '<' + hex(b));
  }
  expect('signed compare', { wrong: wrong.join(' ') }, { wrong: '' });
}

console.log(bad ? `FAILED ${bad} of ${runs}` : `all ${runs} simulator checks pass`);
process.exit(bad ? 1 : 0);
