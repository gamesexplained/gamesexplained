'use strict';
// A small NMOS 6502 core for node: runs a game's own routines on a snapshot's memory, to test a
// page's ports against the original code (kit/skills/core/70-minisite). The snapshots it reads never
// leave the game's gitignored work/ folder; tests that read them live there too.
//
// - The 151 documented opcodes. Any other opcode throws, so a routine that strays into data or
//   into an undocumented instruction is reported, not silently mis-run.
// - Flags exact, including NMOS decimal mode for ADC and SBC (Bruce Clark, "Decimal Mode",
//   6502.org tutorial, appendix A: N and V from the intermediate result, Z from the binary sum).
// - JMP ($xxFF) takes its high byte from $xx00, as the NMOS part does.
// - All 64 KB are RAM, with no I/O: a routine that reads the chips needs its values poked in first.
// - Self-modifying code works because every fetch reads the memory array.
//
// Usage:
//   const { CPU, loadSnapshot } = require('<repo>/kit/c64/cpu6502');
//   const mem = loadSnapshot('games/c64/<slug>/work/<state>.vsf');   // a fresh 64 KB copy
//   const cpu = new CPU(mem);
//   cpu.call(0x82FA, { x: 0x40, y: 0x0C });                   // runs until the routine returns
//   cpu.x, cpu.y, mem[0x08] ...
//
// call(entry, regs, opts) pushes the return address sentinel - 1 and runs from entry until the
// program counter reaches the sentinel (default $FFFF: RTS from the routine lands there). It
// throws when a step limit is passed (opts.maxSteps, default 1e6) or on an unknown opcode.
// opts.writes: a Uint8Array(65536) that gets a 1 at every address the run writes.

const fs = require('fs');

// A VICE snapshot (.vsf) of the C64 holds the 64 KB RAM image at byte offset 209
// (the C64MEM module's 22-byte header at 183, then the CPU port's two bytes and EXROM/GAME).
function loadSnapshot(path) {
  const buf = fs.readFileSync(path);
  if (buf.toString('latin1', 183, 189) !== 'C64MEM') throw new Error(path + ': no C64MEM module at 183');
  return Uint8Array.from(buf.subarray(209, 209 + 65536));
}

class CPU {
  constructor(mem) {
    this.m = mem;
    this.a = 0; this.x = 0; this.y = 0; this.sp = 0xFF; this.pc = 0;
    this.n = 0; this.v = 0; this.d = 0; this.i = 1; this.z = 0; this.c = 0;
    this.steps = 0;
    this.writes = null;
  }

  get p() {
    return (this.n << 7) | (this.v << 6) | 0x20 | (this.d << 3) | (this.i << 2) | (this.z << 1) | this.c;
  }
  set p(v) {
    this.n = (v >> 7) & 1; this.v = (v >> 6) & 1; this.d = (v >> 3) & 1;
    this.i = (v >> 2) & 1; this.z = (v >> 1) & 1; this.c = v & 1;
  }

  rd(a) { return this.m[a & 0xFFFF]; }
  wr(a, v) { a &= 0xFFFF; this.m[a] = v & 0xFF; if (this.writes) this.writes[a] = 1; }
  push(v) { this.wr(0x100 | this.sp, v); this.sp = (this.sp - 1) & 0xFF; }
  pull() { this.sp = (this.sp + 1) & 0xFF; return this.m[0x100 | this.sp]; }
  nz(v) { this.n = (v >> 7) & 1; this.z = v === 0 ? 1 : 0; return v; }

  adc(b) {
    const a = this.a, c = this.c;
    if (!this.d) {
      const t = a + b + c;
      this.v = (~(a ^ b) & (a ^ t) & 0x80) ? 1 : 0;
      this.c = t > 0xFF ? 1 : 0;
      this.a = this.nz(t & 0xFF);
      return;
    }
    // NMOS decimal mode. Sequence 1 gives A and C; sequence 2 (signed) gives N and V; Z is binary.
    let al = (a & 0x0F) + (b & 0x0F) + c;
    if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;
    let t = (a & 0xF0) + (b & 0xF0) + al;
    if (t >= 0xA0) t += 0x60;
    const s = ((a & 0xF0) << 24 >> 24) + ((b & 0xF0) << 24 >> 24) + al;   // signed high nibbles
    this.n = (s >> 7) & 1;
    this.v = (s < -128 || s > 127) ? 1 : 0;
    this.z = ((a + b + c) & 0xFF) === 0 ? 1 : 0;
    this.c = t >= 0x100 ? 1 : 0;
    this.a = t & 0xFF;
  }

  sbc(b) {
    const a = this.a, c = this.c;
    const t = a - b - (1 - c);
    // N, V, Z and C are the binary ones in both modes on the NMOS part.
    this.v = ((a ^ b) & (a ^ t) & 0x80) ? 1 : 0;
    this.c = t >= 0 ? 1 : 0;
    this.nz(t & 0xFF);
    if (!this.d) { this.a = t & 0xFF; return; }
    let al = (a & 0x0F) - (b & 0x0F) + c - 1;
    if (al < 0) al = ((al - 0x06) & 0x0F) - 0x10;
    let r = (a & 0xF0) - (b & 0xF0) + al;
    if (r < 0) r -= 0x60;
    this.a = r & 0xFF;
  }

  cmp(r, b) { const t = r - b; this.c = t >= 0 ? 1 : 0; this.nz(t & 0xFF); }

  branch(cond) {
    const off = this.rd(this.pc + 1);
    this.pc = (this.pc + 2) & 0xFFFF;
    if (cond) this.pc = (this.pc + (off < 0x80 ? off : off - 0x100)) & 0xFFFF;
  }

  // Effective addresses. Each returns the address and leaves pc at the next instruction.
  zp() { const a = this.rd(this.pc + 1); this.pc += 2; return a; }
  zpx() { const a = (this.rd(this.pc + 1) + this.x) & 0xFF; this.pc += 2; return a; }
  zpy() { const a = (this.rd(this.pc + 1) + this.y) & 0xFF; this.pc += 2; return a; }
  ab() { const a = this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8); this.pc += 3; return a; }
  abx() { const a = ((this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8)) + this.x) & 0xFFFF; this.pc += 3; return a; }
  aby() { const a = ((this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8)) + this.y) & 0xFFFF; this.pc += 3; return a; }
  izx() {
    const z = (this.rd(this.pc + 1) + this.x) & 0xFF; this.pc += 2;
    return this.m[z] | (this.m[(z + 1) & 0xFF] << 8);
  }
  izy() {
    const z = this.rd(this.pc + 1); this.pc += 2;
    return ((this.m[z] | (this.m[(z + 1) & 0xFF] << 8)) + this.y) & 0xFFFF;
  }
  imm() { const v = this.rd(this.pc + 1); this.pc += 2; return v; }

  // Read-modify-write helpers for the shifts, on memory.
  asl(v) { this.c = (v >> 7) & 1; return this.nz((v << 1) & 0xFF); }
  lsr(v) { this.c = v & 1; return this.nz(v >> 1); }
  rol(v) { const c = this.c; this.c = (v >> 7) & 1; return this.nz(((v << 1) | c) & 0xFF); }
  ror(v) { const c = this.c; this.c = v & 1; return this.nz((v >> 1) | (c << 7)); }
  rmw(addr, f) { this.wr(addr, f.call(this, this.rd(addr))); }

  step() {
    const op = this.m[this.pc];
    let a;
    switch (op) {
      // loads and stores
      case 0xA9: this.a = this.nz(this.imm()); break;
      case 0xA5: this.a = this.nz(this.rd(this.zp())); break;
      case 0xB5: this.a = this.nz(this.rd(this.zpx())); break;
      case 0xAD: this.a = this.nz(this.rd(this.ab())); break;
      case 0xBD: this.a = this.nz(this.rd(this.abx())); break;
      case 0xB9: this.a = this.nz(this.rd(this.aby())); break;
      case 0xA1: this.a = this.nz(this.rd(this.izx())); break;
      case 0xB1: this.a = this.nz(this.rd(this.izy())); break;
      case 0xA2: this.x = this.nz(this.imm()); break;
      case 0xA6: this.x = this.nz(this.rd(this.zp())); break;
      case 0xB6: this.x = this.nz(this.rd(this.zpy())); break;
      case 0xAE: this.x = this.nz(this.rd(this.ab())); break;
      case 0xBE: this.x = this.nz(this.rd(this.aby())); break;
      case 0xA0: this.y = this.nz(this.imm()); break;
      case 0xA4: this.y = this.nz(this.rd(this.zp())); break;
      case 0xB4: this.y = this.nz(this.rd(this.zpx())); break;
      case 0xAC: this.y = this.nz(this.rd(this.ab())); break;
      case 0xBC: this.y = this.nz(this.rd(this.abx())); break;
      case 0x85: this.wr(this.zp(), this.a); break;
      case 0x95: this.wr(this.zpx(), this.a); break;
      case 0x8D: this.wr(this.ab(), this.a); break;
      case 0x9D: this.wr(this.abx(), this.a); break;
      case 0x99: this.wr(this.aby(), this.a); break;
      case 0x81: this.wr(this.izx(), this.a); break;
      case 0x91: this.wr(this.izy(), this.a); break;
      case 0x86: this.wr(this.zp(), this.x); break;
      case 0x96: this.wr(this.zpy(), this.x); break;
      case 0x8E: this.wr(this.ab(), this.x); break;
      case 0x84: this.wr(this.zp(), this.y); break;
      case 0x94: this.wr(this.zpx(), this.y); break;
      case 0x8C: this.wr(this.ab(), this.y); break;
      // transfers
      case 0xAA: this.x = this.nz(this.a); this.pc++; break;
      case 0xA8: this.y = this.nz(this.a); this.pc++; break;
      case 0x8A: this.a = this.nz(this.x); this.pc++; break;
      case 0x98: this.a = this.nz(this.y); this.pc++; break;
      case 0xBA: this.x = this.nz(this.sp); this.pc++; break;
      case 0x9A: this.sp = this.x; this.pc++; break;
      // stack
      case 0x48: this.push(this.a); this.pc++; break;
      case 0x68: this.a = this.nz(this.pull()); this.pc++; break;
      case 0x08: this.push(this.p | 0x10); this.pc++; break;
      case 0x28: this.p = this.pull(); this.pc++; break;
      // arithmetic
      case 0x69: this.adc(this.imm()); break;
      case 0x65: this.adc(this.rd(this.zp())); break;
      case 0x75: this.adc(this.rd(this.zpx())); break;
      case 0x6D: this.adc(this.rd(this.ab())); break;
      case 0x7D: this.adc(this.rd(this.abx())); break;
      case 0x79: this.adc(this.rd(this.aby())); break;
      case 0x61: this.adc(this.rd(this.izx())); break;
      case 0x71: this.adc(this.rd(this.izy())); break;
      case 0xE9: this.sbc(this.imm()); break;
      case 0xE5: this.sbc(this.rd(this.zp())); break;
      case 0xF5: this.sbc(this.rd(this.zpx())); break;
      case 0xED: this.sbc(this.rd(this.ab())); break;
      case 0xFD: this.sbc(this.rd(this.abx())); break;
      case 0xF9: this.sbc(this.rd(this.aby())); break;
      case 0xE1: this.sbc(this.rd(this.izx())); break;
      case 0xF1: this.sbc(this.rd(this.izy())); break;
      // compares
      case 0xC9: this.cmp(this.a, this.imm()); break;
      case 0xC5: this.cmp(this.a, this.rd(this.zp())); break;
      case 0xD5: this.cmp(this.a, this.rd(this.zpx())); break;
      case 0xCD: this.cmp(this.a, this.rd(this.ab())); break;
      case 0xDD: this.cmp(this.a, this.rd(this.abx())); break;
      case 0xD9: this.cmp(this.a, this.rd(this.aby())); break;
      case 0xC1: this.cmp(this.a, this.rd(this.izx())); break;
      case 0xD1: this.cmp(this.a, this.rd(this.izy())); break;
      case 0xE0: this.cmp(this.x, this.imm()); break;
      case 0xE4: this.cmp(this.x, this.rd(this.zp())); break;
      case 0xEC: this.cmp(this.x, this.rd(this.ab())); break;
      case 0xC0: this.cmp(this.y, this.imm()); break;
      case 0xC4: this.cmp(this.y, this.rd(this.zp())); break;
      case 0xCC: this.cmp(this.y, this.rd(this.ab())); break;
      // logic
      case 0x29: this.a = this.nz(this.a & this.imm()); break;
      case 0x25: this.a = this.nz(this.a & this.rd(this.zp())); break;
      case 0x35: this.a = this.nz(this.a & this.rd(this.zpx())); break;
      case 0x2D: this.a = this.nz(this.a & this.rd(this.ab())); break;
      case 0x3D: this.a = this.nz(this.a & this.rd(this.abx())); break;
      case 0x39: this.a = this.nz(this.a & this.rd(this.aby())); break;
      case 0x21: this.a = this.nz(this.a & this.rd(this.izx())); break;
      case 0x31: this.a = this.nz(this.a & this.rd(this.izy())); break;
      case 0x09: this.a = this.nz(this.a | this.imm()); break;
      case 0x05: this.a = this.nz(this.a | this.rd(this.zp())); break;
      case 0x15: this.a = this.nz(this.a | this.rd(this.zpx())); break;
      case 0x0D: this.a = this.nz(this.a | this.rd(this.ab())); break;
      case 0x1D: this.a = this.nz(this.a | this.rd(this.abx())); break;
      case 0x19: this.a = this.nz(this.a | this.rd(this.aby())); break;
      case 0x01: this.a = this.nz(this.a | this.rd(this.izx())); break;
      case 0x11: this.a = this.nz(this.a | this.rd(this.izy())); break;
      case 0x49: this.a = this.nz(this.a ^ this.imm()); break;
      case 0x45: this.a = this.nz(this.a ^ this.rd(this.zp())); break;
      case 0x55: this.a = this.nz(this.a ^ this.rd(this.zpx())); break;
      case 0x4D: this.a = this.nz(this.a ^ this.rd(this.ab())); break;
      case 0x5D: this.a = this.nz(this.a ^ this.rd(this.abx())); break;
      case 0x59: this.a = this.nz(this.a ^ this.rd(this.aby())); break;
      case 0x41: this.a = this.nz(this.a ^ this.rd(this.izx())); break;
      case 0x51: this.a = this.nz(this.a ^ this.rd(this.izy())); break;
      case 0x24: a = this.rd(this.zp()); this.z = (this.a & a) ? 0 : 1; this.n = (a >> 7) & 1; this.v = (a >> 6) & 1; break;
      case 0x2C: a = this.rd(this.ab()); this.z = (this.a & a) ? 0 : 1; this.n = (a >> 7) & 1; this.v = (a >> 6) & 1; break;
      // shifts
      case 0x0A: this.a = this.asl(this.a); this.pc++; break;
      case 0x06: this.rmw(this.zp(), this.asl); break;
      case 0x16: this.rmw(this.zpx(), this.asl); break;
      case 0x0E: this.rmw(this.ab(), this.asl); break;
      case 0x1E: this.rmw(this.abx(), this.asl); break;
      case 0x4A: this.a = this.lsr(this.a); this.pc++; break;
      case 0x46: this.rmw(this.zp(), this.lsr); break;
      case 0x56: this.rmw(this.zpx(), this.lsr); break;
      case 0x4E: this.rmw(this.ab(), this.lsr); break;
      case 0x5E: this.rmw(this.abx(), this.lsr); break;
      case 0x2A: this.a = this.rol(this.a); this.pc++; break;
      case 0x26: this.rmw(this.zp(), this.rol); break;
      case 0x36: this.rmw(this.zpx(), this.rol); break;
      case 0x2E: this.rmw(this.ab(), this.rol); break;
      case 0x3E: this.rmw(this.abx(), this.rol); break;
      case 0x6A: this.a = this.ror(this.a); this.pc++; break;
      case 0x66: this.rmw(this.zp(), this.ror); break;
      case 0x76: this.rmw(this.zpx(), this.ror); break;
      case 0x6E: this.rmw(this.ab(), this.ror); break;
      case 0x7E: this.rmw(this.abx(), this.ror); break;
      // increments and decrements
      case 0xE6: a = this.zp(); this.wr(a, this.nz((this.rd(a) + 1) & 0xFF)); break;
      case 0xF6: a = this.zpx(); this.wr(a, this.nz((this.rd(a) + 1) & 0xFF)); break;
      case 0xEE: a = this.ab(); this.wr(a, this.nz((this.rd(a) + 1) & 0xFF)); break;
      case 0xFE: a = this.abx(); this.wr(a, this.nz((this.rd(a) + 1) & 0xFF)); break;
      case 0xC6: a = this.zp(); this.wr(a, this.nz((this.rd(a) - 1) & 0xFF)); break;
      case 0xD6: a = this.zpx(); this.wr(a, this.nz((this.rd(a) - 1) & 0xFF)); break;
      case 0xCE: a = this.ab(); this.wr(a, this.nz((this.rd(a) - 1) & 0xFF)); break;
      case 0xDE: a = this.abx(); this.wr(a, this.nz((this.rd(a) - 1) & 0xFF)); break;
      case 0xE8: this.x = this.nz((this.x + 1) & 0xFF); this.pc++; break;
      case 0xC8: this.y = this.nz((this.y + 1) & 0xFF); this.pc++; break;
      case 0xCA: this.x = this.nz((this.x - 1) & 0xFF); this.pc++; break;
      case 0x88: this.y = this.nz((this.y - 1) & 0xFF); this.pc++; break;
      // flags
      case 0x18: this.c = 0; this.pc++; break;
      case 0x38: this.c = 1; this.pc++; break;
      case 0x58: this.i = 0; this.pc++; break;
      case 0x78: this.i = 1; this.pc++; break;
      case 0xB8: this.v = 0; this.pc++; break;
      case 0xD8: this.d = 0; this.pc++; break;
      case 0xF8: this.d = 1; this.pc++; break;
      // branches
      case 0x10: this.branch(!this.n); break;
      case 0x30: this.branch(this.n); break;
      case 0x50: this.branch(!this.v); break;
      case 0x70: this.branch(this.v); break;
      case 0x90: this.branch(!this.c); break;
      case 0xB0: this.branch(this.c); break;
      case 0xD0: this.branch(!this.z); break;
      case 0xF0: this.branch(this.z); break;
      // jumps
      case 0x4C: this.pc = this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8); break;
      case 0x6C: {
        const p = this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8);
        this.pc = this.rd(p) | (this.rd((p & 0xFF00) | ((p + 1) & 0xFF)) << 8);
        break;
      }
      case 0x20: {
        const t = this.rd(this.pc + 1) | (this.rd(this.pc + 2) << 8), r = (this.pc + 2) & 0xFFFF;
        this.push(r >> 8); this.push(r & 0xFF); this.pc = t; break;
      }
      case 0x60: { const lo = this.pull(), hi = this.pull(); this.pc = (((hi << 8) | lo) + 1) & 0xFFFF; break; }
      case 0x40: { this.p = this.pull(); const lo = this.pull(), hi = this.pull(); this.pc = (hi << 8) | lo; break; }
      case 0x00: {
        const r = (this.pc + 2) & 0xFFFF;
        this.push(r >> 8); this.push(r & 0xFF); this.push(this.p | 0x10); this.i = 1;
        this.pc = this.rd(0xFFFE) | (this.rd(0xFFFF) << 8); break;
      }
      case 0xEA: this.pc++; break;
      default:
        throw new Error('undocumented opcode $' + op.toString(16).toUpperCase().padStart(2, '0') +
                        ' at $' + this.pc.toString(16).toUpperCase().padStart(4, '0'));
    }
    this.pc &= 0xFFFF;
    this.steps++;
  }

  // Run the routine at entry until it returns to the sentinel.
  call(entry, regs = {}, opts = {}) {
    const sentinel = opts.sentinel === undefined ? 0xFFFF : opts.sentinel;
    const max = opts.maxSteps || 1e6;
    if ('a' in regs) this.a = regs.a & 0xFF;
    if ('x' in regs) this.x = regs.x & 0xFF;
    if ('y' in regs) this.y = regs.y & 0xFF;
    if ('p' in regs) this.p = regs.p;
    if ('c' in regs) this.c = regs.c ? 1 : 0;
    if ('d' in regs) this.d = regs.d ? 1 : 0;
    this.sp = 'sp' in regs ? regs.sp : 0xFF;
    this.writes = opts.writes || null;
    const r = (sentinel - 1) & 0xFFFF;
    this.push(r >> 8); this.push(r & 0xFF);
    this.pc = entry & 0xFFFF;
    const start = this.steps;
    while (this.pc !== sentinel) {
      this.step();
      if (this.steps - start > max) throw new Error('step limit passed, pc $' + this.pc.toString(16));
    }
    return this.steps - start;
  }
}

module.exports = { CPU, loadSnapshot };
