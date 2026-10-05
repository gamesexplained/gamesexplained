'use strict';
// Self-test of the Z80 simulator (z80.js), run by CI. Every expected value is worked by hand from
// the Z80's documented semantics and the Zilog timing table, never taken from the simulator or from
// the downloaded vectors:
// - loads (immediate, register, (HL), (IX+d), (IY+d), (nn), 16-bit, IXH/IXL/IYH/IYL);
// - 8-bit ALU and its flags (ADD/ADC/SUB/SBC/AND/OR/XOR/CP/INC/DEC/NEG/CPL, with the undocumented
//   bits 5 and 3, the half-carry, the carry and the P/V overflow), plus DAA in both directions;
// - rotates and shifts (RLCA/RRCA/RLA/RRA and CB RLC/RRC/RL/RR/SLA/SRA/SRL/SLL), reg and (HL);
// - BIT/RES/SET, reg and (HL) and the DD CB / FD CB indexed forms;
// - 16-bit ADD/ADC/SBC HL and INC/DEC of register pairs;
// - the stack (PUSH/POP, EX (SP),HL), jumps/calls/returns and each conditional, RST, DJNZ;
// - EX AF,AF' and EXX; the block transfers and searches (LDI/LDD/LDIR/LDDR/CPI/CPD/CPIR/CPDR)
//   including wrap past $FFFF;
// - I/O (IN A,(n), IN r,(C), INI, OUT (n),A, OUT (C),r, OUTI) through the caller's hooks;
// - the ED group (NEG, RETN, RETI, IM 0/1/2, LD A,I, LD A,R, RLD, RRD);
// - DI/EI and the EI interrupt-enable latch, HALT, and the R register's once-per-opcode-fetch
//   increment (bit 7 frozen, wrapping at $7F) across DD/FD, CB and ED prefixes;
// - the true machine T-states for a curated set of instructions, and the undefined ED opcodes.
// Run: node kit/spectrum/test_z80.js
// This is the fast, network-free guard. The exhaustive check against SingleStepTests/z80 (which
// needs the vectors downloaded) is kit/spectrum/check_z80.js.

const { CPU } = require('./z80');

let bad = 0, runs = 0;

// f is one byte: S Z 5 H 3 P/V N C (bits 7..0), exactly as z80.js keeps it.
const S = 0x80, Z = 0x40, Y = 0x20, H = 0x10, X = 0x08, PV = 0x04, N = 0x02, C = 0x01;

function expect(name, got, want) {
  runs++;
  const ok = Object.keys(want).every(k => got[k] === want[k]);
  if (!ok) {
    bad++;
    console.log('FAIL', name, 'got', JSON.stringify(Object.fromEntries(Object.keys(want).map(k => [k, got[k]]))), 'want', JSON.stringify(want));
  }
}
function throws(name, bytes, re) {
  runs++;
  try { one(bytes); }
  catch (e) { if (re.test(e.message)) return; bad++; console.log('FAIL', name, 'threw', e.message); return; }
  bad++; console.log('FAIL', name, 'did not stop');
}

// Load instruction bytes at $1000, set the registers, step one instruction, and return the CPU
// with cpu.t = that instruction's T-states and cpu.m = the RAM it ran in.
function one(bytes, regs = {}, setup, opts) {
  const mem = new Uint8Array(0x10000);
  mem.set(bytes, 0x1000);
  if (setup) setup(mem);
  const cpu = new CPU(mem, opts);
  cpu.setRegs(Object.assign({ pc: 0x1000 }, regs));
  const before = cpu.tstates;
  cpu.step();
  cpu.t = cpu.tstates - before;
  cpu.m = mem;
  return cpu;
}

const HL = c => (c.h << 8) | c.l;
const BC = c => (c.b << 8) | c.c;
const DE = c => (c.d << 8) | c.e;
const AF = c => (c.a << 8) | c.f;

// --- loads --------------------------------------------------------------------------------------
{
  const c = one([0x3E, 0x12]);
  expect('LD A,$12', { a: c.a, f: c.f }, { a: 0x12, f: 0x00 });
  expect('LD B,$34', { b: one([0x06, 0x34]).b }, { b: 0x34 });
  expect('LD H,$AB', { h: one([0x26, 0xAB]).h }, { h: 0xAB });
  expect('LD A,B', { a: one([0x78], { b: 0x56 }).a, f: 0 }, { a: 0x56, f: 0 });
}
{
  const c = one([0x7E], { h: 0x20, l: 0x00 }, m => { m[0x2000] = 0x5A; });
  expect('LD A,(HL)', { a: c.a, f: c.f }, { a: 0x5A, f: 0x00 });
  const c2 = one([0x77], { h: 0x20, l: 0x00, a: 0x5A });
  expect('LD (HL),A', { mem: c2.m[0x2000] }, { mem: 0x5A });
  const c3 = one([0x36, 0x55], { h: 0x20, l: 0x00 });
  expect('LD (HL),$55', { mem: c3.m[0x2000] }, { mem: 0x55 });
}
{
  const c = one([0xDD, 0x7E, 0x05], { ix: 0x2000 }, m => { m[0x2005] = 0x5B; });
  expect('LD A,(IX+5)', { a: c.a, f: c.f }, { a: 0x5B, f: 0x00 });
  const c2 = one([0xDD, 0x36, 0xFE, 0x5C], { ix: 0x2010 });   // IX-2
  expect('LD (IX-2),$5C', { mem: c2.m[0x200E] }, { mem: 0x5C });
  const c3 = one([0xFD, 0x7E, 0xFD], { iy: 0x2010 }, m => { m[0x200D] = 0x5D; });   // IY-3
  expect('LD A,(IY-3)', { a: c3.a }, { a: 0x5D });
  const c4 = one([0xDD, 0x46, 0x05], { ix: 0x2000 }, m => { m[0x2005] = 0x5B; });
  expect('LD B,(IX+5)', { b: c4.b }, { b: 0x5B });
}
{
  const c = one([0xDD, 0x21, 0x34, 0x12]);
  expect('LD IX,$1234', { ix: c.ix }, { ix: 0x1234 });
  const c2 = one([0x22, 0x00, 0x40], { h: 0x12, l: 0x34 });
  expect('LD ($4000),HL', { lo: c2.m[0x4000], hi: c2.m[0x4001] }, { lo: 0x34, hi: 0x12 });
  const c3 = one([0x2A, 0x00, 0x40], {}, m => { m[0x4000] = 0x56; m[0x4001] = 0x78; });
  expect('LD HL,($4000)', { hl: HL(c3) }, { hl: 0x7856 });
  const c4 = one([0x01, 0x34, 0x12]);
  expect('LD BC,$1234', { bc: BC(c4) }, { bc: 0x1234 });
}
{
  const c = one([0xDD, 0x26, 0xAB]);           // LD IXH,$AB
  expect('LD IXH,$AB', { ix: c.ix }, { ix: 0xAB00 });
  const c2 = one([0xDD, 0x2E, 0xCD]);          // LD IXL,$CD
  expect('LD IXL,$CD', { ix: c2.ix }, { ix: 0x00CD });
  const c3 = one([0xDD, 0x7C], { ix: 0xAB00 });   // LD A,IXH
  expect('LD A,IXH', { a: c3.a }, { a: 0xAB });
  const c4 = one([0xFD, 0x26, 0xEF]);          // LD IYH,$EF
  expect('LD IYH,$EF', { iy: c4.iy }, { iy: 0xEF00 });
  const c5 = one([0xFD, 0x2E, 0x12]);          // LD IYL,$12
  expect('LD IYL,$12', { iy: c5.iy }, { iy: 0x0012 });
}

// --- 8-bit ALU and flags ------------------------------------------------------------------------
{
  expect('ADD A,B $10+$20', { a: one([0x80], { a: 0x10, b: 0x20 }).a, f: one([0x80], { a: 0x10, b: 0x20 }).f }, { a: 0x30, f: 0x20 });
  const c = one([0xC6, 0x01], { a: 0x7F });
  expect('ADD A,$01 of $7F', { a: c.a, f: c.f }, { a: 0x80, f: 0x94 });
  const c2 = one([0xCE, 0x20], { a: 0xF0, f: 0x01 });
  expect('ADC A,$20 carry in', { a: c2.a, f: c2.f }, { a: 0x11, f: 0x01 });
  const c3 = one([0x88], { a: 0x7F, b: 0x00, f: 0x01 });
  expect('ADC A,B $7F+0+1', { a: c3.a, f: c3.f }, { a: 0x80, f: 0x94 });
}
{
  const c = one([0x90], { a: 0x40, b: 0x40 });
  expect('SUB B $40-$40', { a: c.a, f: c.f }, { a: 0x00, f: 0x42 });
  expect('SUB A $40', { a: one([0x97], { a: 0x40 }).a, f: one([0x97], { a: 0x40 }).f }, { a: 0x00, f: 0x42 });
  const c2 = one([0xD6, 0x01], { a: 0x00 });
  expect('SUB $01 of $00', { a: c2.a, f: c2.f }, { a: 0xFF, f: 0xBB });
  const c3 = one([0x98], { a: 0x00, b: 0x01, f: 0x01 });
  expect('SBC A,B $00-$01-1', { a: c3.a, f: c3.f }, { a: 0xFE, f: 0xBB });
  expect('SBC A $10', { a: one([0x9F], { a: 0x10, f: 0x00 }).a, f: one([0x9F], { a: 0x10, f: 0x00 }).f }, { a: 0x00, f: 0x42 });
}
{
  const c = one([0xE6, 0x3C], { a: 0xF0 });
  expect('AND $3C of $F0', { a: c.a, f: c.f }, { a: 0x30, f: 0x34 });
  const c2 = one([0xA0], { a: 0x0F, b: 0xF0 });
  expect('AND B $0F&$F0', { a: c2.a, f: c2.f }, { a: 0x00, f: 0x54 });
  const c3 = one([0xF6, 0xF0], { a: 0x0F });
  expect('OR $F0 of $0F', { a: c3.a, f: c3.f }, { a: 0xFF, f: 0xAC });
  const c4 = one([0xEE, 0x0F], { a: 0xFF });
  expect('XOR $0F of $FF', { a: c4.a, f: c4.f }, { a: 0xF0, f: 0xA4 });
  const c5 = one([0xAF], { a: 0x55 });
  expect('XOR A', { a: c5.a, f: c5.f }, { a: 0x00, f: 0x44 });
}
{
  // CP takes its bits 5/3 from the operand, not the result; SUB takes them from the result.
  const c = one([0xFE, 0x40], { a: 0x40 });
  expect('CP $40', { a: c.a, f: c.f }, { a: 0x40, f: 0x42 });
  const c2 = one([0xFE, 0x41], { a: 0x40 });
  expect('CP $41', { a: c2.a, f: c2.f }, { a: 0x40, f: 0x93 });
  const c3 = one([0xFE, 0x88], { a: 0x00 });
  expect('CP $88 of $00 (bits 5/3 from operand)', { a: c3.a, f: c3.f }, { a: 0x00, f: 0x1B });
  const c4 = one([0xBF], { a: 0x40 });
  expect('CP A', { a: c4.a, f: c4.f }, { a: 0x40, f: 0x42 });
}
{
  expect('INC B $7F->$80', { b: one([0x04], { b: 0x7F }).b, f: one([0x04], { b: 0x7F }).f }, { b: 0x80, f: 0x94 });
  expect('INC B $FF->$00', { b: one([0x04], { b: 0xFF }).b, f: one([0x04], { b: 0xFF }).f }, { b: 0x00, f: 0x50 });
  expect('INC B $00->$01', { b: one([0x04], { b: 0x00 }).b, f: one([0x04], { b: 0x00 }).f }, { b: 0x01, f: 0x00 });
  expect('DEC B $80->$7F', { b: one([0x05], { b: 0x80 }).b, f: one([0x05], { b: 0x80 }).f }, { b: 0x7F, f: 0x3E });
  expect('DEC B $01->$00', { b: one([0x05], { b: 0x01 }).b, f: one([0x05], { b: 0x01 }).f }, { b: 0x00, f: 0x42 });
  expect('DEC B $00->$FF', { b: one([0x05], { b: 0x00 }).b, f: one([0x05], { b: 0x00 }).f }, { b: 0xFF, f: 0xBA });
}
{
  const c = one([0xED, 0x44], { a: 0x01 });
  expect('NEG $01', { a: c.a, f: c.f }, { a: 0xFF, f: 0xBB });
  const c2 = one([0xED, 0x44], { a: 0x80 });
  expect('NEG $80 (overflow)', { a: c2.a, f: c2.f }, { a: 0x80, f: 0x87 });
  const c3 = one([0xED, 0x44], { a: 0x00 });
  expect('NEG $00', { a: c3.a, f: c3.f }, { a: 0x00, f: 0x42 });
  const c4 = one([0x2F], { a: 0x55 });
  expect('CPL $55', { a: c4.a, f: c4.f }, { a: 0xAA, f: 0x3A });
  const c5 = one([0x37], { a: 0x00 });
  expect('SCF', { f: c5.f }, { f: 0x01 });
  const c6 = one([0x3F], { a: 0x00, f: 0x00 });
  expect('CCF from C=0', { f: c6.f }, { f: 0x01 });
  const c7 = one([0x3F], { a: 0x00, f: 0x01 });
  expect('CCF from C=1', { f: c7.f }, { f: 0x10 });
}

// --- DAA ----------------------------------------------------------------------------------------
{
  const c = one([0x27], { a: 0x3C, f: 0x00 });        // 3C is a low-nibble carry from a BCD add
  expect('DAA $3C (add)', { a: c.a, f: c.f }, { a: 0x42, f: 0x14 });
  const c2 = one([0x27], { a: 0x9A, f: 0x00 });       // 99+1 with carry into both nibbles
  expect('DAA $9A (add, both nibbles)', { a: c2.a, f: c2.f }, { a: 0x00, f: 0x55 });
  const c3 = one([0x27], { a: 0x1B, f: 0x12 });       // N=1, H=1: a BCD subtract
  expect('DAA $1B (sub)', { a: c3.a, f: c3.f }, { a: 0x15, f: 0x02 });
  const c4 = one([0x27], { a: 0xFF, f: 0x13 });       // N=1, H=1, C=1: 00-01 = 99
  expect('DAA $FF (sub, borrow)', { a: c4.a, f: c4.f }, { a: 0x99, f: 0x8F });
}

// --- rotates and shifts -------------------------------------------------------------------------
{
  expect('RLCA $80', { a: one([0x07], { a: 0x80 }).a, f: one([0x07], { a: 0x80 }).f }, { a: 0x01, f: 0x01 });
  expect('RRCA $01', { a: one([0x0F], { a: 0x01 }).a, f: one([0x0F], { a: 0x01 }).f }, { a: 0x80, f: 0x01 });
  expect('RLA $80', { a: one([0x17], { a: 0x80, f: 0x00 }).a, f: one([0x17], { a: 0x80, f: 0x00 }).f }, { a: 0x00, f: 0x01 });
  expect('RRA $01', { a: one([0x1F], { a: 0x01, f: 0x00 }).a, f: one([0x1F], { a: 0x01, f: 0x00 }).f }, { a: 0x00, f: 0x01 });
}
{
  expect('RLC B $80', { b: one([0xCB, 0x00], { b: 0x80 }).b, f: one([0xCB, 0x00], { b: 0x80 }).f }, { b: 0x01, f: 0x01 });
  const rrc = one([0xCB, 0x08], { b: 0x01 });
  expect('RRC B $01', { b: rrc.b, f: rrc.f }, { b: 0x80, f: 0x81 });
  expect('RL B $80', { b: one([0xCB, 0x10], { b: 0x80, f: 0x00 }).b, f: one([0xCB, 0x10], { b: 0x80, f: 0x00 }).f }, { b: 0x00, f: 0x45 });
  expect('RR B $01', { b: one([0xCB, 0x18], { b: 0x01, f: 0x00 }).b, f: one([0xCB, 0x18], { b: 0x01, f: 0x00 }).f }, { b: 0x00, f: 0x45 });
  expect('SLA B $80', { b: one([0xCB, 0x20], { b: 0x80, f: 0x00 }).b, f: one([0xCB, 0x20], { b: 0x80, f: 0x00 }).f }, { b: 0x00, f: 0x45 });
  expect('SRA B $81', { b: one([0xCB, 0x28], { b: 0x81 }).b, f: one([0xCB, 0x28], { b: 0x81 }).f }, { b: 0xC0, f: 0x85 });
  expect('SRL B $01', { b: one([0xCB, 0x38], { b: 0x01, f: 0x00 }).b, f: one([0xCB, 0x38], { b: 0x01, f: 0x00 }).f }, { b: 0x00, f: 0x45 });
  expect('SLL B $80', { b: one([0xCB, 0x30], { b: 0x80 }).b, f: one([0xCB, 0x30], { b: 0x80 }).f }, { b: 0x01, f: 0x01 });
  const c = one([0xCB, 0x06], { h: 0x20, l: 0x00 }, m => { m[0x2000] = 0x80; });
  expect('RLC (HL) $80', { mem: c.m[0x2000], f: c.f }, { mem: 0x01, f: 0x01 });
}

// --- BIT / RES / SET ----------------------------------------------------------------------------
{
  const c = one([0xCB, 0x40], { b: 0x01 });
  expect('BIT 0,B set', { b: c.b, f: c.f }, { b: 0x01, f: 0x10 });
  const c2 = one([0xCB, 0x7F], { a: 0x80 });
  expect('BIT 7,A set', { a: c2.a, f: c2.f }, { a: 0x80, f: 0x90 });
  const c3 = one([0xCB, 0x40], { b: 0x00 });
  expect('BIT 0,B clear', { b: c3.b, f: c3.f }, { b: 0x00, f: 0x54 });
  const c4 = one([0xCB, 0x6E], { h: 0x20, l: 0x00, wz: 0x0000 }, m => { m[0x2000] = 0x20; });
  expect('BIT 5,(HL)', { f: c4.f }, { f: 0x10 });
}
{
  const c = one([0xCB, 0x80], { b: 0xFF });
  expect('RES 0,B', { b: c.b, f: c.f }, { b: 0xFE, f: 0x00 });
  const c2 = one([0xCB, 0xC0], { b: 0xFE });
  expect('SET 0,B', { b: c2.b, f: c2.f }, { b: 0xFF, f: 0x00 });
  const c3 = one([0xCB, 0xBE], { h: 0x20, l: 0x00 }, m => { m[0x2000] = 0xFF; });
  expect('RES 7,(HL)', { mem: c3.m[0x2000], f: c3.f }, { mem: 0x7F, f: 0x00 });
  const c4 = one([0xCB, 0xFE], { h: 0x20, l: 0x00 }, m => { m[0x2000] = 0x00; });
  expect('SET 7,(HL)', { mem: c4.m[0x2000], f: c4.f }, { mem: 0x80, f: 0x00 });
}

// --- 16-bit arithmetic --------------------------------------------------------------------------
{
  const c = one([0x09], { h: 0x42, l: 0x42, b: 0x11, c: 0x11 });
  expect('ADD HL,BC $4242+$1111', { hl: HL(c), f: c.f }, { hl: 0x5353, f: 0x00 });
  const c2 = one([0x09], { h: 0xFF, l: 0xFF, b: 0x00, c: 0x01 });
  expect('ADD HL,BC carry', { hl: HL(c2), f: c2.f }, { hl: 0x0000, f: 0x11 });
  const c3 = one([0x29], { h: 0x80, l: 0x00 });
  expect('ADD HL,HL $8000', { hl: HL(c3), f: c3.f }, { hl: 0x0000, f: 0x01 });
  const c4 = one([0xED, 0x4A], { h: 0xFF, l: 0xFF, b: 0x00, c: 0x01, f: 0x01 });
  expect('ADC HL,BC carry in', { hl: HL(c4), f: c4.f }, { hl: 0x0001, f: 0x11 });
  const c5 = one([0xED, 0x42], { h: 0x00, l: 0x00, b: 0x00, c: 0x01, f: 0x00 });
  expect('SBC HL,BC $0000-$0001', { hl: HL(c5), f: c5.f }, { hl: 0xFFFF, f: 0xBB });
  const c6 = one([0x03], { b: 0xFF, c: 0xFF });
  expect('INC BC wrap', { bc: BC(c6), f: c6.f }, { bc: 0x0000, f: 0x00 });
  const c7 = one([0x0B], { b: 0x00, c: 0x00 });
  expect('DEC BC wrap', { bc: BC(c7), f: c7.f }, { bc: 0xFFFF, f: 0x00 });
}

// --- the stack ----------------------------------------------------------------------------------
{
  const c = one([0xC5], { sp: 0x2000, b: 0x12, c: 0x34 });
  expect('PUSH BC', { sp: c.sp, lo: c.m[0x1FFE], hi: c.m[0x1FFF] }, { sp: 0x1FFE, lo: 0x34, hi: 0x12 });
  const c2 = one([0xF5], { sp: 0x2000, a: 0x12, f: 0x34 });
  expect('PUSH AF', { sp: c2.sp, lo: c2.m[0x1FFE], hi: c2.m[0x1FFF] }, { sp: 0x1FFE, lo: 0x34, hi: 0x12 });
  const c3 = one([0xC1], { sp: 0x2000 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('POP BC', { bc: BC(c3), sp: c3.sp }, { bc: 0x7856, sp: 0x2002 });
  const c4 = one([0xDD, 0xE1], { sp: 0x2000 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('POP IX', { ix: c4.ix, sp: c4.sp }, { ix: 0x7856, sp: 0x2002 });
  const c5 = one([0xE3], { sp: 0x2000, h: 0x12, l: 0x34 }, m => { m[0x2000] = 0xAA; m[0x2001] = 0xBB; });
  expect('EX (SP),HL', { hl: HL(c5), sp: c5.sp, lo: c5.m[0x2000], hi: c5.m[0x2001] }, { hl: 0xBBAA, sp: 0x2000, lo: 0x34, hi: 0x12 });
  const c6 = one([0xEB], { d: 0x11, e: 0x11, h: 0x22, l: 0x22 });
  expect('EX DE,HL', { de: DE(c6), hl: HL(c6) }, { de: 0x2222, hl: 0x1111 });
}

// --- jumps, calls, returns ----------------------------------------------------------------------
{
  expect('JP $3456', { pc: one([0xC3, 0x56, 0x34]).pc }, { pc: 0x3456 });
  expect('JP (HL)', { pc: one([0xE9], { h: 0x40, l: 0x00 }).pc }, { pc: 0x4000 });
  expect('JP NZ taken', { pc: one([0xC2, 0x56, 0x34], { f: 0x00 }).pc }, { pc: 0x3456 });
  expect('JP NZ not taken', { pc: one([0xC2, 0x56, 0x34], { f: 0x40 }).pc }, { pc: 0x1003 });
  expect('JP C taken', { pc: one([0xDA, 0x56, 0x34], { f: 0x01 }).pc }, { pc: 0x3456 });
}
{
  expect('JR +4', { pc: one([0x18, 0x04]).pc }, { pc: 0x1006 });
  expect('JR -4', { pc: one([0x18, 0xFC]).pc }, { pc: 0x0FFE });
  expect('JR NZ taken', { pc: one([0x20, 0x04], { f: 0x00 }).pc }, { pc: 0x1006 });
  expect('JR Z not taken', { pc: one([0x28, 0x04], { f: 0x00 }).pc }, { pc: 0x1002 });
  expect('JR Z taken', { pc: one([0x28, 0x04], { f: 0x40 }).pc }, { pc: 0x1006 });
  expect('DJNZ taken', { b: one([0x10, 0x04], { b: 0x02 }).b, pc: one([0x10, 0x04], { b: 0x02 }).pc }, { b: 0x01, pc: 0x1006 });
  expect('DJNZ not taken', { b: one([0x10, 0x04], { b: 0x01 }).b, pc: one([0x10, 0x04], { b: 0x01 }).pc }, { b: 0x00, pc: 0x1002 });
}
{
  const c = one([0xCD, 0x56, 0x34], { sp: 0x2000 });
  expect('CALL $3456', { pc: c.pc, sp: c.sp, lo: c.m[0x1FFE], hi: c.m[0x1FFF] }, { pc: 0x3456, sp: 0x1FFE, lo: 0x03, hi: 0x10 });
  const c2 = one([0xC9], { sp: 0x2000 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('RET', { pc: c2.pc, sp: c2.sp }, { pc: 0x7856, sp: 0x2002 });
  const c3 = one([0xC0], { sp: 0x2000, f: 0x00 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('RET NZ taken', { pc: c3.pc, sp: c3.sp }, { pc: 0x7856, sp: 0x2002 });
  const c4 = one([0xC0], { sp: 0x2000, f: 0x40 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('RET NZ not taken', { pc: c4.pc, sp: c4.sp }, { pc: 0x1001, sp: 0x2000 });
  const c5 = one([0xFF], { sp: 0x2000 });
  expect('RST $38', { pc: c5.pc, sp: c5.sp, lo: c5.m[0x1FFE], hi: c5.m[0x1FFF] }, { pc: 0x0038, sp: 0x1FFE, lo: 0x01, hi: 0x10 });
}

// --- EX AF,AF' and EXX --------------------------------------------------------------------------
{
  const c = one([0x08], { a: 0x12, f: 0x34, af_: 0x5678 });
  expect('EX AF,AF\'', { a: c.a, f: c.f, af_: c.af_ }, { a: 0x56, f: 0x78, af_: 0x1234 });
  const c2 = one([0xD9], { b: 0x11, c: 0x11, d: 0x22, e: 0x22, h: 0x33, l: 0x33, bc_: 0x4444, de_: 0x5555, hl_: 0x6666 });
  expect('EXX', { bc: BC(c2), de: DE(c2), hl: HL(c2) }, { bc: 0x4444, de: 0x5555, hl: 0x6666 });
}

// --- block transfers and searches --------------------------------------------------------------
{
  const c = one([0xED, 0xA0], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('LDI', { mem: c.m[0x4000], hl: HL(c), de: DE(c), bc: BC(c), f: c.f }, { mem: 0x55, hl: 0x3001, de: 0x4001, bc: 0x0001, f: 0x2C });
  const c2 = one([0xED, 0xA8], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('LDD', { mem: c2.m[0x4000], hl: HL(c2), de: DE(c2), bc: BC(c2), f: c2.f }, { mem: 0x55, hl: 0x2FFF, de: 0x3FFF, bc: 0x0001, f: 0x2C });
  const c3 = one([0xED, 0xB0], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02, a: 0x00 }, m => { m[0x3000] = 0x55; m[0x3001] = 0x66; });
  expect('LDIR repeats', { bc: BC(c3), hl: HL(c3), de: DE(c3), pc: c3.pc }, { bc: 0x0001, hl: 0x3001, de: 0x4001, pc: 0x1000 });
  const c4 = one([0xED, 0xB8], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02, a: 0x00 }, m => { m[0x3000] = 0x55; m[0x3001] = 0x66; });
  expect('LDDR repeats', { bc: BC(c4), hl: HL(c4), de: DE(c4), pc: c4.pc }, { bc: 0x0001, hl: 0x2FFF, de: 0x3FFF, pc: 0x1000 });
}
{
  const c = one([0xED, 0xA1], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('CPI match', { hl: HL(c), bc: BC(c), f: c.f }, { hl: 0x3001, bc: 0x0001, f: 0x46 });
  const c2 = one([0xED, 0xA1], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x00 }, m => { m[0x3000] = 0x55; });
  expect('CPI no match', { hl: HL(c2), bc: BC(c2), f: c2.f }, { hl: 0x3001, bc: 0x0001, f: 0xBE });
  const c3 = one([0xED, 0xA9], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('CPD match', { hl: HL(c3), bc: BC(c3), f: c3.f }, { hl: 0x2FFF, bc: 0x0001, f: 0x46 });
  const c4 = one([0xED, 0xB1], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('CPIR stops on match', { bc: BC(c4), pc: c4.pc }, { bc: 0x0001, pc: 0x1002 });
  const c5 = one([0xED, 0xB9], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x55 }, m => { m[0x3000] = 0x55; });
  expect('CPDR stops on match', { bc: BC(c5), pc: c5.pc }, { bc: 0x0001, pc: 0x1002 });
}
{
  const c = one([0xED, 0xA0], { h: 0xFF, l: 0xFF, d: 0x40, e: 0x00, b: 0x00, c: 0x01, a: 0x00 }, m => { m[0xFFFF] = 0x11; });
  expect('LDI wraps HL past $FFFF', { mem: c.m[0x4000], hl: HL(c), f: c.f }, { mem: 0x11, hl: 0x0000, f: 0x00 });
  const c2 = one([0xED, 0xA8], { h: 0x00, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x01, a: 0x00 }, m => { m[0x0000] = 0x22; });
  expect('LDD wraps HL past $0000', { mem: c2.m[0x4000], hl: HL(c2), f: c2.f }, { mem: 0x22, hl: 0xFFFF, f: 0x20 });
}

// --- I/O ----------------------------------------------------------------------------------------
{
  const seen = [];
  const io = { in: p => { seen.push(['r', p]); return 0x5A; }, out: (p, v) => { seen.push(['w', p, v]); } };
  const c = one([0xDB, 0xFE], { a: 0x00 }, null, { io });
  expect('IN A,($FE)', { a: c.a, f: c.f, port: seen[0][1] }, { a: 0x5A, f: 0x00, port: 0xFE });
  const seen2 = [];
  const io2 = { in: p => { seen2.push(['r', p]); return 0x5A; }, out: () => {} };
  const c2 = one([0xED, 0x40], { b: 0x01, c: 0xFE }, null, { io: io2 });
  expect('IN B,(C)', { b: c2.b, f: c2.f, port: seen2[0][1] }, { b: 0x5A, f: 0x0C, port: 0x01FE });
  const seen3 = [];
  const io3 = { in: p => { seen3.push(['r', p]); return 0x55; }, out: () => {} };
  const c3 = one([0xED, 0xA2], { h: 0x30, l: 0x00, b: 0x01, c: 0xFE }, null, { io: io3 });
  expect('INI', { b: c3.b, hl: HL(c3), mem: c3.m[0x3000], f: c3.f, port: seen3[0][1] }, { b: 0x00, hl: 0x3001, mem: 0x55, f: 0x51, port: 0x01FE });
}
{
  const seen = [];
  const io = { in: () => 0, out: (p, v) => { seen.push([p, v]); } };
  const c = one([0xD3, 0xFE], { a: 0x55 }, null, { io });
  expect('OUT ($FE),A', { port: seen[0][0], v: seen[0][1], f: c.f }, { port: 0x55FE, v: 0x55, f: 0x00 });
  const seen2 = [];
  const io2 = { in: () => 0, out: (p, v) => { seen2.push([p, v]); } };
  const c2 = one([0xED, 0x79], { a: 0x55, b: 0x01, c: 0xFE }, null, { io: io2 });
  expect('OUT (C),A', { port: seen2[0][0], v: seen2[0][1], f: c2.f }, { port: 0x01FE, v: 0x55, f: 0x00 });
  const seen3 = [];
  const io3 = { in: () => 0, out: (p, v) => { seen3.push([p, v]); } };
  const c3 = one([0xED, 0xA3], { h: 0x30, l: 0x00, b: 0x01, c: 0xFE }, m => { m[0x3000] = 0x55; }, { io: io3 });
  expect('OUTI', { b: c3.b, hl: HL(c3), f: c3.f, port: seen3[0][0], v: seen3[0][1] }, { b: 0x00, hl: 0x3001, f: 0x44, port: 0x00FE, v: 0x55 });
}

// --- the ED group -------------------------------------------------------------------------------
{
  const c = one([0xED, 0x45], { sp: 0x2000, iff1: 0, iff2: 1 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('RETN copies iff2 to iff1', { pc: c.pc, iff1: c.iff1 }, { pc: 0x7856, iff1: 1 });
  const c2 = one([0xED, 0x4D], { sp: 0x2000, iff1: 1, iff2: 0 }, m => { m[0x2000] = 0x56; m[0x2001] = 0x78; });
  expect('RETI copies iff2 to iff1', { pc: c2.pc, iff1: c2.iff1 }, { pc: 0x7856, iff1: 0 });
  expect('IM 0', { im: one([0xED, 0x46]).im }, { im: 0 });
  expect('IM 1', { im: one([0xED, 0x56]).im }, { im: 1 });
  expect('IM 2', { im: one([0xED, 0x5E]).im }, { im: 2 });
  const c3 = one([0xED, 0x57], { i: 0x12, iff2: 1 });
  expect('LD A,I', { a: c3.a, f: c3.f, p: c3.p }, { a: 0x12, f: 0x04, p: 1 });
  const c4 = one([0xED, 0x57], { i: 0x12, iff2: 0 });
  expect('LD A,I with IFF2 clear', { a: c4.a, f: c4.f }, { a: 0x12, f: 0x00 });
  const c5 = one([0xED, 0x5F], { r: 0x12, iff2: 1 });
  expect('LD A,R (R has advanced)', { a: c5.a, f: c5.f }, { a: 0x14, f: 0x04 });
  const c6 = one([0xED, 0x6F], { h: 0x20, l: 0x00, a: 0x12 }, m => { m[0x2000] = 0x34; });
  expect('RLD', { a: c6.a, mem: c6.m[0x2000], f: c6.f }, { a: 0x13, mem: 0x42, f: 0x00 });
  const c7 = one([0xED, 0x67], { h: 0x20, l: 0x00, a: 0x12 }, m => { m[0x2000] = 0x34; });
  expect('RRD', { a: c7.a, mem: c7.m[0x2000], f: c7.f }, { a: 0x14, mem: 0x23, f: 0x04 });
}

// --- DD/FD prefixes and the DD CB / FD CB forms -------------------------------------------------
{
  const c = one([0xDD, 0x3C], { a: 0x01 });        // DD is ignored before INC A
  expect('DD INC A (prefix ignored)', { a: c.a, f: c.f }, { a: 0x02, f: 0x00 });
  const c2 = one([0xDD, 0x24], { ix: 0x7F00 });
  expect('INC IXH $7F->$80', { ix: c2.ix, f: c2.f }, { ix: 0x8000, f: 0x94 });
  const c3 = one([0xDD, 0x2C], { ix: 0x007F });
  expect('INC IXL $7F->$80', { ix: c3.ix, f: c3.f }, { ix: 0x0080, f: 0x94 });
  const c4 = one([0xDD, 0x23], { ix: 0xFFFF });
  expect('INC IX wrap', { ix: c4.ix }, { ix: 0x0000 });
  const c5 = one([0xFD, 0x23], { iy: 0x0000 });
  expect('INC IY', { iy: c5.iy }, { iy: 0x0001 });
}
{
  const c = one([0xDD, 0xCB, 0x05, 0x06], { ix: 0x2000 }, m => { m[0x2005] = 0x80; });
  expect('DD CB RLC (IX+5)', { mem: c.m[0x2005], f: c.f }, { mem: 0x01, f: 0x01 });
  const c2 = one([0xFD, 0xCB, 0x05, 0x0E], { iy: 0x2000 }, m => { m[0x2005] = 0x01; });
  expect('FD CB RRC (IY+5)', { mem: c2.m[0x2005], f: c2.f }, { mem: 0x80, f: 0x81 });
  const c3 = one([0xDD, 0xCB, 0x05, 0x46], { ix: 0x2000 }, m => { m[0x2005] = 0x01; });
  expect('DD CB BIT 0,(IX+5)', { f: c3.f }, { f: 0x30 });
  const c4 = one([0xDD, 0xCB, 0x05, 0x86], { ix: 0x2000 }, m => { m[0x2005] = 0xFF; });
  expect('DD CB RES 0,(IX+5)', { mem: c4.m[0x2005], f: c4.f }, { mem: 0xFE, f: 0x00 });
  const c5 = one([0xDD, 0xCB, 0x05, 0xC6], { ix: 0x2000 }, m => { m[0x2005] = 0x00; });
  expect('DD CB SET 0,(IX+5)', { mem: c5.m[0x2005], f: c5.f }, { mem: 0x01, f: 0x00 });
}

// --- DI / EI, HALT, and the R register ----------------------------------------------------------
{
  const c = one([0xFB]);
  expect('EI sets IFF1/IFF2 and the latch', { iff1: c.iff1, iff2: c.iff2, ei: c.ei }, { iff1: 1, iff2: 1, ei: 1 });
  const c2 = one([0xF3], { iff1: 1, iff2: 1 });
  expect('DI clears IFF1/IFF2', { iff1: c2.iff1, iff2: c2.iff2 }, { iff1: 0, iff2: 0 });
  const c3 = one([0x76]);
  expect('HALT', { halted: c3.halted, pc: c3.pc }, { halted: 1, pc: 0x1001 });
}
{
  expect('R increments by 1 on NOP', { r: one([0x00], { r: 0x00 }).r }, { r: 0x01 });
  expect('R wraps at $7F', { r: one([0x00], { r: 0x7F }).r }, { r: 0x00 });
  expect('R keeps bit 7', { r: one([0x00], { r: 0x80 }).r }, { r: 0x81 });
  expect('R keeps bit 7 at $FF', { r: one([0x00], { r: 0xFF }).r }, { r: 0x80 });
  expect('R increments twice across DD', { r: one([0xDD, 0x21, 0x00, 0x00], { r: 0x00 }).r }, { r: 0x02 });
  expect('R increments twice across CB', { r: one([0xCB, 0x00], { r: 0x00, b: 0x00 }).r }, { r: 0x02 });
  expect('R increments twice across ED', { r: one([0xED, 0x44], { r: 0x00, a: 0x01 }).r }, { r: 0x02 });
}

// --- T-states, from the Zilog table -------------------------------------------------------------
{
  const io = { in: () => 0x55, out: () => {} };
  const table = [
    ['NOP', [0x00], {}, 4],
    ['LD A,$12', [0x3E, 0x12], {}, 7],
    ['LD (HL),$55', [0x36, 0x55], { h: 0x20, l: 0x00 }, 10],
    ['LD (IX+5),$55', [0xDD, 0x36, 0x05, 0x55], { ix: 0x2000 }, 19],
    ['LD BC,$1234', [0x01, 0x34, 0x12], {}, 10],
    ['LD ($4000),HL', [0x22, 0x00, 0x40], { h: 0x12, l: 0x34 }, 16],
    ['LD HL,($4000)', [0x2A, 0x00, 0x40], { h: 0x00, l: 0x00 }, 16],
    ['LD A,(IX+5)', [0xDD, 0x7E, 0x05], { ix: 0x2000 }, 19],
    ['ADD A,B', [0x80], { a: 0x10, b: 0x20 }, 4],
    ['ADD A,$01', [0xC6, 0x01], { a: 0x7F }, 7],
    ['INC B', [0x04], { b: 0x7F }, 4],
    ['DAA', [0x27], { a: 0x3C }, 4],
    ['RLCA', [0x07], { a: 0x80 }, 4],
    ['RLC B', [0xCB, 0x00], { b: 0x80 }, 8],
    ['RLC (HL)', [0xCB, 0x06], { h: 0x20, l: 0x00 }, 15],
    ['BIT 0,(HL)', [0xCB, 0x46], { h: 0x20, l: 0x00 }, 12],
    ['SET 0,(HL)', [0xCB, 0xC6], { h: 0x20, l: 0x00 }, 15],
    ['JP $3456', [0xC3, 0x56, 0x34], {}, 10],
    ['JR +4', [0x18, 0x04], {}, 12],
    ['JR NZ not taken', [0x20, 0x04], { f: 0x40 }, 7],
    ['DJNZ taken', [0x10, 0x04], { b: 0x02 }, 13],
    ['CALL $3456', [0xCD, 0x56, 0x34], { sp: 0x2000 }, 17],
    ['RET', [0xC9], { sp: 0x2000 }, 10],
    ['RET NZ taken', [0xC0], { sp: 0x2000, f: 0x00 }, 11],
    ['RET NZ not taken', [0xC0], { sp: 0x2000, f: 0x40 }, 5],
    ['PUSH BC', [0xC5], { sp: 0x2000, b: 0x12, c: 0x34 }, 11],
    ['POP BC', [0xC1], { sp: 0x2000 }, 10],
    ['EX (SP),HL', [0xE3], { sp: 0x2000, h: 0x12, l: 0x34 }, 19],
    ['RST $38', [0xFF], { sp: 0x2000 }, 11],
    ['ADD HL,BC', [0x09], { h: 0x42, l: 0x42, b: 0x11, c: 0x11 }, 11],
    ['ADC HL,BC', [0xED, 0x4A], { h: 0xFF, l: 0xFF, b: 0x00, c: 0x01, f: 0x01 }, 15],
    ['SBC HL,BC', [0xED, 0x42], { h: 0x00, l: 0x00, b: 0x00, c: 0x01 }, 15],
    ['LDI', [0xED, 0xA0], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02 }, 16],
    ['LDIR repeat', [0xED, 0xB0], { h: 0x30, l: 0x00, d: 0x40, e: 0x00, b: 0x00, c: 0x02 }, 21],
    ['CPI', [0xED, 0xA1], { h: 0x30, l: 0x00, b: 0x00, c: 0x02, a: 0x55 }, 16],
    ['IN A,($FE)', [0xDB, 0xFE], { a: 0x00 }, 11],
    ['IN B,(C)', [0xED, 0x40], { b: 0x01, c: 0xFE }, 12],
    ['OUT ($FE),A', [0xD3, 0xFE], { a: 0x55 }, 11],
    ['OUT (C),B', [0xED, 0x41], { b: 0x55, c: 0xFE }, 12],
    ['INI', [0xED, 0xA2], { h: 0x30, l: 0x00, b: 0x01, c: 0xFE }, 16],
    ['OUTI', [0xED, 0xA3], { h: 0x30, l: 0x00, b: 0x01, c: 0xFE }, 16],
    ['NEG', [0xED, 0x44], { a: 0x01 }, 8],
    ['RETN', [0xED, 0x45], { sp: 0x2000 }, 14],
    ['IM 1', [0xED, 0x56], {}, 8],
    ['LD A,I', [0xED, 0x57], { i: 0x00 }, 9],
    ['LD A,R', [0xED, 0x5F], { r: 0x00 }, 9],
    ['RLD', [0xED, 0x6F], { h: 0x20, l: 0x00, a: 0x12 }, 18],
    ['RRD', [0xED, 0x67], { h: 0x20, l: 0x00, a: 0x12 }, 18],
    ['DD CB BIT 0,(IX+5)', [0xDD, 0xCB, 0x05, 0x46], { ix: 0x2000 }, 20],
    ['DD CB RLC (IX+5)', [0xDD, 0xCB, 0x05, 0x06], { ix: 0x2000 }, 23],
    ['INC IX', [0xDD, 0x23], { ix: 0x0000 }, 10],
    ['POP IX', [0xDD, 0xE1], { sp: 0x2000 }, 14],
    ['HALT', [0x76], {}, 4],
    ['EX AF,AF\'', [0x08], { a: 0x12, f: 0x34 }, 4],
    ['EXX', [0xD9], { b: 0x00, c: 0x00, d: 0x00, e: 0x00, h: 0x00, l: 0x00 }, 4],
  ];
  for (const [name, bytes, regs, want] of table) {
    const c = one(bytes, regs, undefined, /^IN|^OUT|^INI|^OUTI/.test(name) ? { io } : undefined);
    expect('T-states: ' + name, { t: c.t }, { t: want });
  }
}

// --- undefined ED opcodes stop the run ----------------------------------------------------------
throws('ED $00 is undefined', [0xED, 0x00], /undefined ED opcode/);

console.log(bad ? `FAILED ${bad} of ${runs}` : `all ${runs} Z80 simulator checks pass`);
process.exit(bad ? 1 : 0);
