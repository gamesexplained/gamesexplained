'use strict';
// An NMOS 6502 simulator for node, with the C64's memory map: runs a game's own routines on a
// snapshot's memory, to test a page's ports against the original code (kit/skills/core/70-minisite)
// and a music driver's port against the driver (site/lib/sid.js). The snapshots it reads, and the
// tests that read them, never leave the game's gitignored work/ folder. Checked by
// kit/c64/test_cpu6502.js in CI, and against Tom Harte's test vectors and VICE itself by
// kit/c64/check_cpu6502.js.
//
// The processor
// - All 256 opcodes of the 6510: the 151 documented and the 105 undocumented, with the names and
//   addressing modes of kit/c64/opcodes.py (VICE's). The unstable ones do what VICE's x64sc does
//   (vice-mcp 3.13.1): ANE is A = (A | $EF) & X & operand and LXA is A = X = (A | $EE) & operand
//   (the options ane and lxa change the constants); SHA, SHX, SHY and SHS store the register ANDed
//   with the base address's high byte + 1, and an index that crosses a page puts that value in the
//   address's high byte too. A JAM stops the run with its address. With strict: true every undocumented opcode stops it,
//   which catches a routine that strays into data.
// - Flags exact, including NMOS decimal mode for ADC and SBC and for ARR, RRA and ISB (Bruce Clark,
//   "Decimal Mode", 6502.org tutorial, appendix A: N and V from the intermediate result, Z from the
//   binary sum).
// - Cycles counted as the processor takes them (cpu.cycles): an indexed read that crosses a page, a
//   branch taken and a branch that crosses a page each take one more. A read-modify-write writes its
//   operand twice, the old value and then the new, which a chip's register sees. Dummy reads are not
//   made: an I/O read has no side effect but the one the instruction means.
// - JMP ($xxFF) takes its high byte from $xx00.
//
// The memory
// - new CPU(mem): all 64 KB are RAM (mem, a Uint8Array(65536), used in place), as on a bare 6502.
// - new CPU(mem, { port, io, rom }): the C64's map. port is the 6510's port as $00 and $01 hold it,
//   { dir, data } (readSnapshot gives it; a number is taken as data with dir $2F). $00 and $01 read
//   and write the port, not RAM, and its bits 0-2 select what the processor sees at $A000-$BFFF,
//   $D000-$DFFF and $E000-$FFFF, as on the machine; writes under a ROM go to the RAM beneath. The
//   input lines read as VICE reads them: bits 0-2 and 4 high, bit 5 low, bits 3, 6 and 7 what was
//   last driven on them (VICE lets 6 and 7 fade to 0 some 350,000 cycles after they stop being
//   driven; the simulator does not).
//   A cartridge's lines are not modelled.
// - io: the chips at $D000-$DFFF while they are banked in, colour RAM included:
//   { read(address, cpu), write(address, value, cpu) }. Mirrors are the caller's to fold. A read or
//   a write with no function for it stops the run and names the chip.
// - rom: none by default. The kit holds no ROM, so a read of BASIC, KERNAL or character ROM, or the
//   program counter reaching one, stops the run with the address. A hook (below) can stand in for a
//   ROM routine. A test may pass { basic, kernal, char } read from the emulator's own files at run
//   time (tools/vice-mcp/share/vice/C64/: Uint8Arrays of 8192, 8192 and 4096 bytes), never committed.
//
// Usage:
//   const { CPU, readSnapshot } = require('<repo>/kit/c64/cpu6502');
//   const cpu = CPU.fromSnapshot('games/c64/<slug>/work/<state>.vsf', { io });  // RAM, port, registers
//   cpu.call(0x82FA, { x: 0x40, y: 0x0C });          // runs the routine until it returns
//   cpu.a, cpu.x, cpu.m[0x08], cpu.cycles ...
//
//   const s = readSnapshot(path);   // { ram, port: { dir, data, out }, exrom, game, regs, clock }
//                                   // regs { a, x, y, sp, pc, p } and clock (the emulator's cycle
//                                   // count) come from x64sc's MAINC64CPU module, null without it
//   loadSnapshot(path)              // the RAM alone, a fresh Uint8Array(65536)
//
// call(entry, regs, opts) sets the registers given (a, x, y, p, sp, and flags n v d i z c), sets sp
// to $FF when regs has none, pushes the return address sentinel - 1 and runs from entry until the
// program counter reaches the sentinel (opts.sentinel, default $FFFF: an RTS from the routine lands
// there). Returns the instructions run.
// run(opts) runs from cpu.pc until it reaches opts.until, or until at least opts.cycles cycles have
// run. A frame of play: cpu.run({ cycles: 19656 }); if (!cpu.i) cpu.irq();
// irq(handler, opts) and nmi(handler, opts) take an interrupt now, whatever I says: push the program
// counter and the flags (B clear), set I, jump to handler (default: the vector at $FFFE or $FFFA as
// the port maps it), and run until the return to the interrupted code. With opts.kernal they stand in
// for the KERNAL's own paths, for a game that hooks them with the KERNAL banked in: irq for the entry
// at $FF48 (A, X and Y pushed, then the handler at $0314) and the exits at $EA31 and $EA81 (Y, X and
// A pulled, then RTI), nmi for $FE43 (the handler at $0318) and the exit at $FEBC. Their cycles are
// counted, but what $EA31 does before it leaves (the clock, the cursor, the keyboard scan, CIA 1's
// acknowledgement) is not done.
// Options of call, run, irq and nmi:
//   maxSteps   stop with an error after this many instructions (default 1e6; none when run has cycles)
//   hooks      { address: fn(cpu) }: fn runs when the program counter reaches the address, before
//              the instruction there. It may change registers and memory, return from a subroutine
//              it stands in for (cpu.rts(), or cpu.rti() for an interrupt's end) or set cpu.pc; if it
//              returns true the run stops there.
//   writes, reads, executed   Uint8Array(65536)s that get a 1 at every address the run writes, reads
//              as data (not the stack, not instruction bytes) and executes an instruction at
// A run stops with an error for a JAM, a ROM or a chip it cannot serve, and the step limit; the
// error has pc (the instruction that ran into it) and address (what it touched) where they apply.

const fs = require('fs');

// --- the instruction set ----------------------------------------------------------------------
// OPCODES[op] = [mnemonic, mode], as kit/c64/opcodes.py and kit/scripts/listing.py name them.
const OPCODES = [];
{
  const set = (op, name, mode) => { OPCODES[op] = [name, mode]; };
  const ALU = [[0x09, 'imm'], [0x05, 'zp'], [0x15, 'zpx'], [0x0D, 'abs'], [0x1D, 'abx'], [0x19, 'aby'],
               [0x01, 'izx'], [0x11, 'izy']];
  for (const [base, name] of [[0x00, 'ora'], [0x20, 'and'], [0x40, 'eor'], [0x60, 'adc'], [0x80, 'sta'],
                              [0xA0, 'lda'], [0xC0, 'cmp'], [0xE0, 'sbc']]) {
    for (const [off, mode] of ALU) if (base + off !== 0x89) set(base + off, name, mode);
  }
  for (const [base, name] of [[0x00, 'asl'], [0x20, 'rol'], [0x40, 'lsr'], [0x60, 'ror']]) {
    for (const [off, mode] of [[0x0A, 'acc'], [0x06, 'zp'], [0x16, 'zpx'], [0x0E, 'abs'], [0x1E, 'abx']]) {
      set(base + off, name, mode);
    }
  }
  for (const [base, name] of [[0xC0, 'dec'], [0xE0, 'inc']]) {
    for (const [off, mode] of [[0x06, 'zp'], [0x16, 'zpx'], [0x0E, 'abs'], [0x1E, 'abx']]) set(base + off, name, mode);
  }
  for (const [op, name] of [[0x90, 'bcc'], [0xB0, 'bcs'], [0xF0, 'beq'], [0x30, 'bmi'], [0xD0, 'bne'],
                            [0x10, 'bpl'], [0x50, 'bvc'], [0x70, 'bvs']]) set(op, name, 'rel');
  for (const [op, name] of [[0x00, 'brk'], [0x18, 'clc'], [0xD8, 'cld'], [0x58, 'cli'], [0xB8, 'clv'],
                            [0xCA, 'dex'], [0x88, 'dey'], [0xE8, 'inx'], [0xC8, 'iny'], [0xEA, 'nop'],
                            [0x48, 'pha'], [0x08, 'php'], [0x68, 'pla'], [0x28, 'plp'], [0x40, 'rti'],
                            [0x60, 'rts'], [0x38, 'sec'], [0xF8, 'sed'], [0x78, 'sei'], [0xAA, 'tax'],
                            [0xA8, 'tay'], [0xBA, 'tsx'], [0x8A, 'txa'], [0x9A, 'txs'], [0x98, 'tya']]) set(op, name, 'imp');
  for (const [op, name, mode] of [
    [0x24, 'bit', 'zp'], [0x2C, 'bit', 'abs'], [0xE0, 'cpx', 'imm'], [0xE4, 'cpx', 'zp'], [0xEC, 'cpx', 'abs'],
    [0xC0, 'cpy', 'imm'], [0xC4, 'cpy', 'zp'], [0xCC, 'cpy', 'abs'], [0x4C, 'jmp', 'abs'], [0x6C, 'jmp', 'ind'],
    [0x20, 'jsr', 'abs'], [0xA2, 'ldx', 'imm'], [0xA6, 'ldx', 'zp'], [0xB6, 'ldx', 'zpy'], [0xAE, 'ldx', 'abs'],
    [0xBE, 'ldx', 'aby'], [0xA0, 'ldy', 'imm'], [0xA4, 'ldy', 'zp'], [0xB4, 'ldy', 'zpx'], [0xAC, 'ldy', 'abs'],
    [0xBC, 'ldy', 'abx'], [0x86, 'stx', 'zp'], [0x96, 'stx', 'zpy'], [0x8E, 'stx', 'abs'], [0x84, 'sty', 'zp'],
    [0x94, 'sty', 'zpx'], [0x8C, 'sty', 'abs']]) set(op, name, mode);
  // the undocumented ones
  for (const [base, name] of [[0x00, 'slo'], [0x20, 'rla'], [0x40, 'sre'], [0x60, 'rra'], [0xC0, 'dcp'], [0xE0, 'isb']]) {
    for (const [off, mode] of [[0x07, 'zp'], [0x17, 'zpx'], [0x0F, 'abs'], [0x1F, 'abx'], [0x1B, 'aby'],
                               [0x03, 'izx'], [0x13, 'izy']]) set(base + off, name, mode);
  }
  for (const [op, name, mode] of [
    [0x87, 'sax', 'zp'], [0x97, 'sax', 'zpy'], [0x8F, 'sax', 'abs'], [0x83, 'sax', 'izx'],
    [0xA7, 'lax', 'zp'], [0xB7, 'lax', 'zpy'], [0xAF, 'lax', 'abs'], [0xBF, 'lax', 'aby'], [0xA3, 'lax', 'izx'],
    [0xB3, 'lax', 'izy'], [0x0B, 'anc', 'imm'], [0x2B, 'anc', 'imm'], [0x4B, 'asr', 'imm'], [0x6B, 'arr', 'imm'],
    [0x8B, 'ane', 'imm'], [0xAB, 'lxa', 'imm'], [0xCB, 'sbx', 'imm'], [0xEB, 'usbc', 'imm'], [0xBB, 'las', 'aby'],
    [0x9B, 'shs', 'aby'], [0x9F, 'sha', 'aby'], [0x93, 'sha', 'izy'], [0x9E, 'shx', 'aby'], [0x9C, 'shy', 'abx']]) {
    set(op, name, mode);
  }
  for (const op of [0x1A, 0x3A, 0x5A, 0x7A, 0xDA, 0xFA]) set(op, 'noop', 'imp');
  for (const [op, mode] of [[0x80, 'imm'], [0x82, 'imm'], [0x89, 'imm'], [0xC2, 'imm'], [0xE2, 'imm'],
                            [0x04, 'zp'], [0x44, 'zp'], [0x64, 'zp'], [0x0C, 'abs']]) set(op, 'noop', mode);
  for (const op of [0x14, 0x34, 0x54, 0x74, 0xD4, 0xF4]) set(op, 'noop', 'zpx');
  for (const op of [0x1C, 0x3C, 0x5C, 0x7C, 0xDC, 0xFC]) set(op, 'noop', 'abx');
  for (const op of [0x02, 0x12, 0x22, 0x32, 0x42, 0x52, 0x62, 0x72, 0x92, 0xB2, 0xD2, 0xF2]) set(op, 'jam', 'imp');
}

// Cycles per opcode, before the extra ones for crossing a page and for a branch taken.
const CYCLES = Uint8Array.from([
  7, 6, 0, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 0, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 0, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 0, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,  2, 6, 0, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5,
  2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,  2, 5, 0, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
  2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,  2, 5, 0, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
]);

const DOCUMENTED = new Set(['adc', 'and', 'asl', 'bcc', 'bcs', 'beq', 'bit', 'bmi', 'bne', 'bpl', 'brk', 'bvc',
  'bvs', 'clc', 'cld', 'cli', 'clv', 'cmp', 'cpx', 'cpy', 'dec', 'dex', 'dey', 'eor', 'inc', 'inx', 'iny', 'jmp',
  'jsr', 'lda', 'ldx', 'ldy', 'lsr', 'nop', 'ora', 'pha', 'php', 'pla', 'plp', 'rol', 'ror', 'rti', 'rts', 'sbc',
  'sec', 'sed', 'sei', 'sta', 'stx', 'sty', 'tax', 'tay', 'tsx', 'txa', 'txs', 'tya']);
const UNDOC = Uint8Array.from(OPCODES, ([name]) => DOCUMENTED.has(name) ? 0 : 1);

// --- the memory map -----------------------------------------------------------------------------
// What the processor sees in each 256-byte page.
const RAM = 0, ZP = 1, IO = 2, BASIC = 3, KERNAL = 4, CHAR = 5;
const ASL = 0, LSR = 1, ROL = 2, ROR = 3, INC = 4, DEC = 5;   // the read-modify-write operations
const ROM_NAME = { [BASIC]: 'BASIC', [KERNAL]: 'KERNAL', [CHAR]: 'character' };

const hex2 = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');
const hex4 = v => '$' + v.toString(16).toUpperCase().padStart(4, '0');
const chip = a => a < 0xD400 ? 'the VIC-II' : a < 0xD800 ? 'the SID' : a < 0xDC00 ? 'colour RAM' :
  a < 0xDD00 ? 'CIA 1' : a < 0xDE00 ? 'CIA 2' : 'the expansion port';

// --- VICE snapshots -----------------------------------------------------------------------------
// A .vsf is a header ("VICE Snapshot File", the machine's name, then VICE's version) and modules,
// each a 22-byte header (name, version, size with the header) and its body. C64MEM's body is the
// port's data and direction bytes, EXROM and GAME, the 64 KB of RAM, then the port's output latch.
// x64sc's MAINC64CPU begins with the 8-byte clock, then A, X, Y, SP, PC and P. From a VICE 3.10
// snapshot (vice-mcp 3.13.1), saved from a known state, 26 September 2026.
function readSnapshot(path) {
  const buf = fs.readFileSync(path);
  if (buf.toString('latin1', 0, 19) !== 'VICE Snapshot File\x1a') throw new Error(path + ': not a VICE snapshot');
  let off = buf.toString('latin1', 37, 50) === 'VICE Version\x1a' ? 58 : 37;
  const mods = {};
  while (off + 22 <= buf.length) {
    const name = buf.toString('latin1', off, off + 16).replace(/\0+$/, ''), size = buf.readUInt32LE(off + 18);
    if (size < 22 || off + size > buf.length) break;
    mods[name] = { at: off + 22, size: size - 22 };
    off += size;
  }
  const mem = mods.C64MEM;
  if (!mem || mem.size < 4 + 65536) throw new Error(path + ': no C64MEM module (not a C64 snapshot?)');
  const b = mem.at, cpu = mods.MAINC64CPU;
  return {
    ram: Uint8Array.from(buf.subarray(b + 4, b + 4 + 65536)),
    port: { data: buf[b], dir: buf[b + 1], out: mem.size > 4 + 65536 ? buf[b + 4 + 65536] : buf[b] & buf[b + 1] },
    exrom: buf[b + 2], game: buf[b + 3],
    regs: cpu && cpu.size >= 15 ? { a: buf[cpu.at + 8], x: buf[cpu.at + 9], y: buf[cpu.at + 10],
      sp: buf[cpu.at + 11], pc: buf.readUInt16LE(cpu.at + 12), p: buf[cpu.at + 14] } : null,
    clock: cpu && cpu.size >= 8 ? Number(buf.readBigUInt64LE(cpu.at)) : null,
  };
}

// The RAM alone, as the kit's first simulator read it.
function loadSnapshot(path) { return readSnapshot(path).ram; }

// --- the processor ------------------------------------------------------------------------------
class CPU {
  constructor(mem, opts = {}) {
    this.m = mem;
    this.a = 0; this.x = 0; this.y = 0; this.sp = 0xFF; this.pc = 0;
    this.n = 0; this.v = 0; this.d = 0; this.i = 1; this.z = 0; this.c = 0;
    this.steps = 0; this.cycles = 0;
    this.opc = 0;                                    // the address of the instruction running
    this.writes = null; this.reads = null; this.executed = null;
    this.ane = opts.ane === undefined ? 0xEF : opts.ane;
    this.lxa = opts.lxa === undefined ? 0xEE : opts.lxa;
    this.strict = !!opts.strict;
    this.io = opts.io || null;
    this.rom = opts.rom || {};
    this.rk = new Uint8Array(256);                   // per page: what a read or a fetch sees
    this.wk = new Uint8Array(256);                   // per page: where a write goes
    this.c64 = opts.port !== undefined;
    if (!this.c64 && (opts.io || opts.rom)) {
      throw new Error('io and rom need the C64 map: give port too ({ dir, data }, as readSnapshot returns it)');
    }
    if (this.c64) {
      const p = typeof opts.port === 'number' ? { dir: 0x2F, data: opts.port } : opts.port;
      this.pdir = p.dir & 0xFF; this.pdata = p.data & 0xFF;
      this.pout = (p.out === undefined ? p.data & p.dir : p.out) & 0xFF;
      this.mapPort();
    }
  }

  // RAM, the snapshot's port and registers: the machine as the snapshot left it.
  static fromSnapshot(path, opts = {}) {
    const s = readSnapshot(path);
    if (s.exrom || s.game) {
      throw new Error(path + ': a cartridge holds the EXROM or GAME line, and the simulator has no cartridge map');
    }
    const cpu = new CPU(s.ram, Object.assign({ port: s.port }, opts));
    if (s.regs) cpu.setRegs(s.regs);
    return cpu;
  }

  get p() {
    return (this.n << 7) | (this.v << 6) | 0x20 | (this.d << 3) | (this.i << 2) | (this.z << 1) | this.c;
  }
  set p(v) {
    this.n = (v >> 7) & 1; this.v = (v >> 6) & 1; this.d = (v >> 3) & 1;
    this.i = (v >> 2) & 1; this.z = (v >> 1) & 1; this.c = v & 1;
  }

  setRegs(r) {
    if (r.a !== undefined) this.a = r.a & 0xFF;
    if (r.x !== undefined) this.x = r.x & 0xFF;
    if (r.y !== undefined) this.y = r.y & 0xFF;
    if (r.sp !== undefined) this.sp = r.sp & 0xFF;
    if (r.p !== undefined) this.p = r.p;
    if (r.n !== undefined) this.n = r.n ? 1 : 0;
    if (r.v !== undefined) this.v = r.v ? 1 : 0;
    if (r.d !== undefined) this.d = r.d ? 1 : 0;
    if (r.i !== undefined) this.i = r.i ? 1 : 0;
    if (r.z !== undefined) this.z = r.z ? 1 : 0;
    if (r.c !== undefined) this.c = r.c ? 1 : 0;
    if (r.pc !== undefined) this.pc = r.pc & 0xFFFF;
  }

  fail(msg, props) { throw Object.assign(new Error(msg), { pc: this.opc }, props); }

  // --- the port and the map ---
  mapPort() {
    const cfg = (this.pdata | ~this.pdir) & 7, r = this.rk, w = this.wk;
    r.fill(RAM); w.fill(RAM); r[0] = w[0] = ZP;
    if ((cfg & 3) === 3) r.fill(BASIC, 0xA0, 0xC0);
    if (cfg & 2) r.fill(KERNAL, 0xE0, 0x100);
    if ((cfg & 3) && (cfg & 4)) { r.fill(IO, 0xD0, 0xE0); w.fill(IO, 0xD0, 0xE0); } else if (cfg & 3) r.fill(CHAR, 0xD0, 0xE0);
  }
  portRead(a) {
    return a === 0 ? this.pdir : ((this.pdata & this.pdir) | (~this.pdir & (0x17 | (this.pout & 0xC8)))) & 0xFF;
  }
  portWrite(a, v) {
    if (a === 0) this.pdir = v; else this.pdata = v;
    this.pout = ((this.pout & ~this.pdir) | (this.pdata & this.pdir)) & 0xFF;
    this.mapPort();
  }
  romByte(a, k) {
    const img = k === BASIC ? this.rom.basic : k === KERNAL ? this.rom.kernal : this.rom.char;
    return img ? img[a & (k === CHAR ? 0x0FFF : 0x1FFF)] : undefined;
  }
  ioRead(a) {
    const v = this.io && this.io.read ? this.io.read(a, this) : undefined;
    if (typeof v !== 'number') {
      this.fail('read of ' + hex4(a) + ' (' + chip(a) + ') at ' + hex4(this.opc) + ': ' +
                (this.io && this.io.read ? 'io.read gave no value' : 'no io.read'), { address: a });
    }
    return v & 0xFF;
  }
  ioWrite(a, v) {
    if (!this.io || !this.io.write) {
      this.fail('write of ' + hex2(v) + ' to ' + hex4(a) + ' (' + chip(a) + ') at ' + hex4(this.opc) + ': no io.write', { address: a });
    }
    this.io.write(a, v, this);
  }

  // --- memory access ---
  // A data read and a data write, as the map directs them. The plain-RAM case is kept small so
  // that it is inlined; the rest is out of line.
  rd(a) { return this.rk[a >>> 8] === RAM && this.reads === null ? this.m[a] : this.rdx(a); }
  wr(a, v) { if (this.wk[a >>> 8] === RAM && this.writes === null) this.m[a] = v; else this.wrx(a, v); }
  // The same for an address in zero page, which is RAM above the port's two bytes.
  rdz(a) { return a > 1 && this.reads === null ? this.m[a] : this.rdx(a); }
  wrz(a, v) { if (a > 1 && this.writes === null) this.m[a] = v; else this.wrx(a, v); }
  rdx(a) {
    if (this.reads !== null) this.reads[a] = 1;
    const k = this.rk[a >>> 8];
    if (k === RAM) return this.m[a];
    if (k === ZP) return a > 1 ? this.m[a] : this.portRead(a);
    if (k === IO) return this.ioRead(a);
    const b = this.romByte(a, k);
    if (b === undefined) {
      this.fail('read of ' + hex4(a) + ' in the ' + ROM_NAME[k] + ' ROM at ' + hex4(this.opc) +
                ': the simulator holds no ROM', { address: a });
    }
    return b;
  }
  wrx(a, v) {
    if (this.writes !== null) this.writes[a] = 1;
    const k = this.wk[a >>> 8];
    if (k === RAM) this.m[a] = v;
    else if (k === ZP) { if (a > 1) this.m[a] = v; else this.portWrite(a, v); }
    else this.ioWrite(a, v);
  }
  // An instruction's bytes: the opcode (first) and its operands.
  fb(a, first) { a &= 0xFFFF; return this.rk[a >>> 8] === RAM ? this.m[a] : this.fbx(a, first); }
  fbx(a, first) {
    const k = this.rk[a >>> 8];
    if (k === ZP) return a > 1 ? this.m[a] : this.portRead(a);
    if (k === IO) return this.ioRead(a);
    const b = this.romByte(a, k);
    if (b === undefined) {
      this.fail((first ? 'the program counter reached ' : 'the operand of the instruction at ' + hex4(this.opc) + ' is at ') +
                hex4(a) + ' in the ' + ROM_NAME[k] + ' ROM' + (first ? ', after ' + hex4(this.opc) : '') +
                ': the simulator holds no ROM; a hook can stand in for the routine', { address: a });
    }
    return b;
  }
  // A read a no-op makes: only a chip can notice it.
  peek(a) {
    if (this.reads !== null) this.reads[a] = 1;
    if (this.rk[a >>> 8] === IO && this.io && this.io.read) this.io.read(a, this);
  }
  // A vector, read as the processor reads it.
  vector(v, why) {
    if (this.rk[v >>> 8] === KERNAL && this.rom.kernal === undefined) {
      this.fail(why + ': the vector at ' + hex4(v) + ' is in the KERNAL ROM, which the simulator does not hold' +
                (why === 'BRK' ? '' : '; pass the handler (a game that hooks the KERNAL keeps it at ' +
                 (v === 0xFFFA ? '$0318' : '$0314') + ')'), { address: v });
    }
    return this.fb(v) | (this.fb(v + 1) << 8);
  }
  word(a) { return this.rd(a & 0xFFFF) | (this.rd((a + 1) & 0xFFFF) << 8); }

  push(v) {
    const a = 0x100 | this.sp;
    this.m[a] = v; if (this.writes !== null) this.writes[a] = 1;
    this.sp = (this.sp - 1) & 0xFF;
  }
  pull() { this.sp = (this.sp + 1) & 0xFF; return this.m[0x100 | this.sp]; }
  rts() { const lo = this.pull(), hi = this.pull(); this.pc = (((hi << 8) | lo) + 1) & 0xFFFF; }
  rti() { this.p = this.pull(); const lo = this.pull(), hi = this.pull(); this.pc = (hi << 8) | lo; }

  // --- the arithmetic ---
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

  // ARR: AND, then ROR through the carry, with flags of its own; in decimal mode a BCD fix-up too.
  arr(b) {
    const t = this.a & b, r = (t >> 1) | (this.c << 7);
    if (!this.d) {
      this.a = this.nz(r);
      this.c = (r >> 6) & 1;
      this.v = ((r >> 6) ^ (r >> 5)) & 1;
      return;
    }
    this.n = this.c; this.z = r === 0 ? 1 : 0; this.v = ((r ^ t) >> 6) & 1;
    let a = r;
    if ((t & 0x0F) + (t & 0x01) > 0x05) a = (a & 0xF0) | ((a + 0x06) & 0x0F);
    if ((t & 0xF0) + (t & 0x10) > 0x50) { a = (a & 0x0F) | ((a + 0x60) & 0xF0); this.c = 1; } else this.c = 0;
    this.a = a;
  }

  cmp(r, b) { const t = r - b; this.c = t >= 0 ? 1 : 0; this.nz(t & 0xFF); }
  bit(b) { this.z = (this.a & b) ? 0 : 1; this.n = (b >> 7) & 1; this.v = (b >> 6) & 1; }

  branch(cond) {
    const off = this.fb(this.pc + 1);
    this.pc = (this.pc + 2) & 0xFFFF;
    if (!cond) return;
    const t = (this.pc + (off < 0x80 ? off : off - 0x100)) & 0xFFFF;
    this.cycles += ((t ^ this.pc) & 0xFF00) ? 2 : 1;
    this.pc = t;
  }

  // Effective addresses. Each returns the address and leaves pc at the next instruction. The ones
  // ending in r are for reads, which take a cycle more when the index crosses a page.
  imm() { const v = this.fb(this.pc + 1); this.pc += 2; return v; }
  zp() { const a = this.fb(this.pc + 1); this.pc += 2; return a; }
  zpx() { const a = (this.fb(this.pc + 1) + this.x) & 0xFF; this.pc += 2; return a; }
  zpy() { const a = (this.fb(this.pc + 1) + this.y) & 0xFF; this.pc += 2; return a; }
  ab() { const a = this.fb(this.pc + 1) | (this.fb(this.pc + 2) << 8); this.pc += 3; return a; }
  abx() { return (this.ab() + this.x) & 0xFFFF; }
  aby() { return (this.ab() + this.y) & 0xFFFF; }
  abxr() { const b = this.ab(), a = (b + this.x) & 0xFFFF; if ((a ^ b) & 0xFF00) this.cycles++; return a; }
  abyr() { const b = this.ab(), a = (b + this.y) & 0xFFFF; if ((a ^ b) & 0xFF00) this.cycles++; return a; }
  izx() {
    const z = (this.fb(this.pc + 1) + this.x) & 0xFF; this.pc += 2;
    return this.rdz(z) | (this.rdz((z + 1) & 0xFF) << 8);
  }
  ptr() { const z = this.fb(this.pc + 1); this.pc += 2; return this.rdz(z) | (this.rdz((z + 1) & 0xFF) << 8); }
  izy() { return (this.ptr() + this.y) & 0xFFFF; }
  izyr() { const b = this.ptr(), a = (b + this.y) & 0xFFFF; if ((a ^ b) & 0xFF00) this.cycles++; return a; }

  // Read-modify-write: the old value is written back first, then the new one. Returns the new one.
  asl(v) { this.c = (v >> 7) & 1; return this.nz((v << 1) & 0xFF); }
  lsr(v) { this.c = v & 1; return this.nz(v >> 1); }
  rol(v) { const c = this.c; this.c = (v >> 7) & 1; return this.nz(((v << 1) | c) & 0xFF); }
  ror(v) { const c = this.c; this.c = v & 1; return this.nz((v >> 1) | (c << 7)); }
  rmw(addr, k) {
    const v = addr < 0x100 ? this.rdz(addr) : this.rd(addr);
    if (this.wk[addr >>> 8] === IO) this.ioWrite(addr, v);
    const r = k === ASL ? this.asl(v) : k === LSR ? this.lsr(v) : k === ROL ? this.rol(v) : k === ROR ? this.ror(v) :
      this.nz((k === INC ? v + 1 : v - 1) & 0xFF);
    if (addr < 0x100) this.wrz(addr, r); else this.wr(addr, r);
    return r;
  }
  // SHA, SHX, SHY, SHS: the register ANDed with the base's high byte + 1, which also becomes the
  // address's high byte when the index crosses a page.
  sh(base, index, r) {
    const v = r & ((base >> 8) + 1), t = base + index;
    this.wr((base & 0xFF) + index > 0xFF ? (t & 0xFF) | (v << 8) : t, v);
  }

  step() {
    const pc = this.pc, op = this.rk[pc >>> 8] === RAM ? this.m[pc] : this.fbx(pc, true);
    this.opc = pc;
    if (this.executed !== null) this.executed[pc] = 1;
    if (this.strict && UNDOC[op] === 1) this.undocumented(op);
    const c0 = this.cycles;
    this.cycles += CYCLES[op];
    let a;
    switch (op) {
      // loads and stores
      case 0xA9: this.a = this.nz(this.imm()); break;
      case 0xA5: this.a = this.nz(this.rdz(this.zp())); break;
      case 0xB5: this.a = this.nz(this.rdz(this.zpx())); break;
      case 0xAD: this.a = this.nz(this.rd(this.ab())); break;
      case 0xBD: this.a = this.nz(this.rd(this.abxr())); break;
      case 0xB9: this.a = this.nz(this.rd(this.abyr())); break;
      case 0xA1: this.a = this.nz(this.rd(this.izx())); break;
      case 0xB1: this.a = this.nz(this.rd(this.izyr())); break;
      case 0xA2: this.x = this.nz(this.imm()); break;
      case 0xA6: this.x = this.nz(this.rdz(this.zp())); break;
      case 0xB6: this.x = this.nz(this.rdz(this.zpy())); break;
      case 0xAE: this.x = this.nz(this.rd(this.ab())); break;
      case 0xBE: this.x = this.nz(this.rd(this.abyr())); break;
      case 0xA0: this.y = this.nz(this.imm()); break;
      case 0xA4: this.y = this.nz(this.rdz(this.zp())); break;
      case 0xB4: this.y = this.nz(this.rdz(this.zpx())); break;
      case 0xAC: this.y = this.nz(this.rd(this.ab())); break;
      case 0xBC: this.y = this.nz(this.rd(this.abxr())); break;
      case 0x85: this.wrz(this.zp(), this.a); break;
      case 0x95: this.wrz(this.zpx(), this.a); break;
      case 0x8D: this.wr(this.ab(), this.a); break;
      case 0x9D: this.wr(this.abx(), this.a); break;
      case 0x99: this.wr(this.aby(), this.a); break;
      case 0x81: this.wr(this.izx(), this.a); break;
      case 0x91: this.wr(this.izy(), this.a); break;
      case 0x86: this.wrz(this.zp(), this.x); break;
      case 0x96: this.wrz(this.zpy(), this.x); break;
      case 0x8E: this.wr(this.ab(), this.x); break;
      case 0x84: this.wrz(this.zp(), this.y); break;
      case 0x94: this.wrz(this.zpx(), this.y); break;
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
      case 0x65: this.adc(this.rdz(this.zp())); break;
      case 0x75: this.adc(this.rdz(this.zpx())); break;
      case 0x6D: this.adc(this.rd(this.ab())); break;
      case 0x7D: this.adc(this.rd(this.abxr())); break;
      case 0x79: this.adc(this.rd(this.abyr())); break;
      case 0x61: this.adc(this.rd(this.izx())); break;
      case 0x71: this.adc(this.rd(this.izyr())); break;
      case 0xE9: case 0xEB: this.sbc(this.imm()); break;
      case 0xE5: this.sbc(this.rdz(this.zp())); break;
      case 0xF5: this.sbc(this.rdz(this.zpx())); break;
      case 0xED: this.sbc(this.rd(this.ab())); break;
      case 0xFD: this.sbc(this.rd(this.abxr())); break;
      case 0xF9: this.sbc(this.rd(this.abyr())); break;
      case 0xE1: this.sbc(this.rd(this.izx())); break;
      case 0xF1: this.sbc(this.rd(this.izyr())); break;
      // compares
      case 0xC9: this.cmp(this.a, this.imm()); break;
      case 0xC5: this.cmp(this.a, this.rdz(this.zp())); break;
      case 0xD5: this.cmp(this.a, this.rdz(this.zpx())); break;
      case 0xCD: this.cmp(this.a, this.rd(this.ab())); break;
      case 0xDD: this.cmp(this.a, this.rd(this.abxr())); break;
      case 0xD9: this.cmp(this.a, this.rd(this.abyr())); break;
      case 0xC1: this.cmp(this.a, this.rd(this.izx())); break;
      case 0xD1: this.cmp(this.a, this.rd(this.izyr())); break;
      case 0xE0: this.cmp(this.x, this.imm()); break;
      case 0xE4: this.cmp(this.x, this.rdz(this.zp())); break;
      case 0xEC: this.cmp(this.x, this.rd(this.ab())); break;
      case 0xC0: this.cmp(this.y, this.imm()); break;
      case 0xC4: this.cmp(this.y, this.rdz(this.zp())); break;
      case 0xCC: this.cmp(this.y, this.rd(this.ab())); break;
      // logic
      case 0x29: this.a = this.nz(this.a & this.imm()); break;
      case 0x25: this.a = this.nz(this.a & this.rdz(this.zp())); break;
      case 0x35: this.a = this.nz(this.a & this.rdz(this.zpx())); break;
      case 0x2D: this.a = this.nz(this.a & this.rd(this.ab())); break;
      case 0x3D: this.a = this.nz(this.a & this.rd(this.abxr())); break;
      case 0x39: this.a = this.nz(this.a & this.rd(this.abyr())); break;
      case 0x21: this.a = this.nz(this.a & this.rd(this.izx())); break;
      case 0x31: this.a = this.nz(this.a & this.rd(this.izyr())); break;
      case 0x09: this.a = this.nz(this.a | this.imm()); break;
      case 0x05: this.a = this.nz(this.a | this.rdz(this.zp())); break;
      case 0x15: this.a = this.nz(this.a | this.rdz(this.zpx())); break;
      case 0x0D: this.a = this.nz(this.a | this.rd(this.ab())); break;
      case 0x1D: this.a = this.nz(this.a | this.rd(this.abxr())); break;
      case 0x19: this.a = this.nz(this.a | this.rd(this.abyr())); break;
      case 0x01: this.a = this.nz(this.a | this.rd(this.izx())); break;
      case 0x11: this.a = this.nz(this.a | this.rd(this.izyr())); break;
      case 0x49: this.a = this.nz(this.a ^ this.imm()); break;
      case 0x45: this.a = this.nz(this.a ^ this.rdz(this.zp())); break;
      case 0x55: this.a = this.nz(this.a ^ this.rdz(this.zpx())); break;
      case 0x4D: this.a = this.nz(this.a ^ this.rd(this.ab())); break;
      case 0x5D: this.a = this.nz(this.a ^ this.rd(this.abxr())); break;
      case 0x59: this.a = this.nz(this.a ^ this.rd(this.abyr())); break;
      case 0x41: this.a = this.nz(this.a ^ this.rd(this.izx())); break;
      case 0x51: this.a = this.nz(this.a ^ this.rd(this.izyr())); break;
      case 0x24: this.bit(this.rdz(this.zp())); break;
      case 0x2C: this.bit(this.rd(this.ab())); break;
      // shifts
      case 0x0A: this.a = this.asl(this.a); this.pc++; break;
      case 0x06: this.rmw(this.zp(), ASL); break;
      case 0x16: this.rmw(this.zpx(), ASL); break;
      case 0x0E: this.rmw(this.ab(), ASL); break;
      case 0x1E: this.rmw(this.abx(), ASL); break;
      case 0x4A: this.a = this.lsr(this.a); this.pc++; break;
      case 0x46: this.rmw(this.zp(), LSR); break;
      case 0x56: this.rmw(this.zpx(), LSR); break;
      case 0x4E: this.rmw(this.ab(), LSR); break;
      case 0x5E: this.rmw(this.abx(), LSR); break;
      case 0x2A: this.a = this.rol(this.a); this.pc++; break;
      case 0x26: this.rmw(this.zp(), ROL); break;
      case 0x36: this.rmw(this.zpx(), ROL); break;
      case 0x2E: this.rmw(this.ab(), ROL); break;
      case 0x3E: this.rmw(this.abx(), ROL); break;
      case 0x6A: this.a = this.ror(this.a); this.pc++; break;
      case 0x66: this.rmw(this.zp(), ROR); break;
      case 0x76: this.rmw(this.zpx(), ROR); break;
      case 0x6E: this.rmw(this.ab(), ROR); break;
      case 0x7E: this.rmw(this.abx(), ROR); break;
      // increments and decrements
      case 0xE6: this.rmw(this.zp(), INC); break;
      case 0xF6: this.rmw(this.zpx(), INC); break;
      case 0xEE: this.rmw(this.ab(), INC); break;
      case 0xFE: this.rmw(this.abx(), INC); break;
      case 0xC6: this.rmw(this.zp(), DEC); break;
      case 0xD6: this.rmw(this.zpx(), DEC); break;
      case 0xCE: this.rmw(this.ab(), DEC); break;
      case 0xDE: this.rmw(this.abx(), DEC); break;
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
      case 0x4C: this.pc = this.fb(this.pc + 1) | (this.fb(this.pc + 2) << 8); break;
      case 0x6C: {
        const p = this.fb(this.pc + 1) | (this.fb(this.pc + 2) << 8);
        this.pc = this.rd(p) | (this.rd((p & 0xFF00) | ((p + 1) & 0xFF)) << 8);
        break;
      }
      case 0x20: {                                   // the high byte is read after the pushes
        const lo = this.fb(this.pc + 1), r = (this.pc + 2) & 0xFFFF;
        this.push(r >> 8); this.push(r & 0xFF);
        this.pc = lo | (this.fb(r) << 8);
        break;
      }
      case 0x60: this.rts(); break;
      case 0x40: this.rti(); break;
      case 0x00: {
        const r = (this.pc + 2) & 0xFFFF;
        this.push(r >> 8); this.push(r & 0xFF); this.push(this.p | 0x10); this.i = 1;
        this.pc = this.vector(0xFFFE, 'BRK');
        break;
      }
      case 0xEA: this.pc++; break;
      // undocumented: a read-modify-write, then an operation on A with the new value
      case 0x07: this.a = this.nz(this.a | this.rmw(this.zp(), ASL)); break;
      case 0x17: this.a = this.nz(this.a | this.rmw(this.zpx(), ASL)); break;
      case 0x0F: this.a = this.nz(this.a | this.rmw(this.ab(), ASL)); break;
      case 0x1F: this.a = this.nz(this.a | this.rmw(this.abx(), ASL)); break;
      case 0x1B: this.a = this.nz(this.a | this.rmw(this.aby(), ASL)); break;
      case 0x03: this.a = this.nz(this.a | this.rmw(this.izx(), ASL)); break;
      case 0x13: this.a = this.nz(this.a | this.rmw(this.izy(), ASL)); break;
      case 0x27: this.a = this.nz(this.a & this.rmw(this.zp(), ROL)); break;
      case 0x37: this.a = this.nz(this.a & this.rmw(this.zpx(), ROL)); break;
      case 0x2F: this.a = this.nz(this.a & this.rmw(this.ab(), ROL)); break;
      case 0x3F: this.a = this.nz(this.a & this.rmw(this.abx(), ROL)); break;
      case 0x3B: this.a = this.nz(this.a & this.rmw(this.aby(), ROL)); break;
      case 0x23: this.a = this.nz(this.a & this.rmw(this.izx(), ROL)); break;
      case 0x33: this.a = this.nz(this.a & this.rmw(this.izy(), ROL)); break;
      case 0x47: this.a = this.nz(this.a ^ this.rmw(this.zp(), LSR)); break;
      case 0x57: this.a = this.nz(this.a ^ this.rmw(this.zpx(), LSR)); break;
      case 0x4F: this.a = this.nz(this.a ^ this.rmw(this.ab(), LSR)); break;
      case 0x5F: this.a = this.nz(this.a ^ this.rmw(this.abx(), LSR)); break;
      case 0x5B: this.a = this.nz(this.a ^ this.rmw(this.aby(), LSR)); break;
      case 0x43: this.a = this.nz(this.a ^ this.rmw(this.izx(), LSR)); break;
      case 0x53: this.a = this.nz(this.a ^ this.rmw(this.izy(), LSR)); break;
      case 0x67: this.adc(this.rmw(this.zp(), ROR)); break;
      case 0x77: this.adc(this.rmw(this.zpx(), ROR)); break;
      case 0x6F: this.adc(this.rmw(this.ab(), ROR)); break;
      case 0x7F: this.adc(this.rmw(this.abx(), ROR)); break;
      case 0x7B: this.adc(this.rmw(this.aby(), ROR)); break;
      case 0x63: this.adc(this.rmw(this.izx(), ROR)); break;
      case 0x73: this.adc(this.rmw(this.izy(), ROR)); break;
      case 0xC7: this.cmp(this.a, this.rmw(this.zp(), DEC)); break;
      case 0xD7: this.cmp(this.a, this.rmw(this.zpx(), DEC)); break;
      case 0xCF: this.cmp(this.a, this.rmw(this.ab(), DEC)); break;
      case 0xDF: this.cmp(this.a, this.rmw(this.abx(), DEC)); break;
      case 0xDB: this.cmp(this.a, this.rmw(this.aby(), DEC)); break;
      case 0xC3: this.cmp(this.a, this.rmw(this.izx(), DEC)); break;
      case 0xD3: this.cmp(this.a, this.rmw(this.izy(), DEC)); break;
      case 0xE7: this.sbc(this.rmw(this.zp(), INC)); break;
      case 0xF7: this.sbc(this.rmw(this.zpx(), INC)); break;
      case 0xEF: this.sbc(this.rmw(this.ab(), INC)); break;
      case 0xFF: this.sbc(this.rmw(this.abx(), INC)); break;
      case 0xFB: this.sbc(this.rmw(this.aby(), INC)); break;
      case 0xE3: this.sbc(this.rmw(this.izx(), INC)); break;
      case 0xF3: this.sbc(this.rmw(this.izy(), INC)); break;
      // undocumented: loads and stores of A and X together
      case 0x87: this.wrz(this.zp(), this.a & this.x); break;
      case 0x97: this.wrz(this.zpy(), this.a & this.x); break;
      case 0x8F: this.wr(this.ab(), this.a & this.x); break;
      case 0x83: this.wr(this.izx(), this.a & this.x); break;
      case 0xA7: this.a = this.x = this.nz(this.rdz(this.zp())); break;
      case 0xB7: this.a = this.x = this.nz(this.rdz(this.zpy())); break;
      case 0xAF: this.a = this.x = this.nz(this.rd(this.ab())); break;
      case 0xBF: this.a = this.x = this.nz(this.rd(this.abyr())); break;
      case 0xA3: this.a = this.x = this.nz(this.rd(this.izx())); break;
      case 0xB3: this.a = this.x = this.nz(this.rd(this.izyr())); break;
      // undocumented: immediate
      case 0x0B: case 0x2B: this.a = this.nz(this.a & this.imm()); this.c = this.n; break;           // ANC
      case 0x4B: a = this.a & this.imm(); this.c = a & 1; this.a = this.nz(a >> 1); break;          // ASR
      case 0x6B: this.arr(this.imm()); break;
      case 0x8B: this.a = this.nz((this.a | this.ane) & this.x & this.imm()); break;               // ANE
      case 0xAB: this.a = this.x = this.nz((this.a | this.lxa) & this.imm()); break;               // LXA
      case 0xCB: a = (this.a & this.x) - this.imm(); this.c = a >= 0 ? 1 : 0; this.x = this.nz(a & 0xFF); break;  // SBX
      // undocumented: the stack pointer, and the stores ANDed with the address
      case 0xBB: this.sp &= this.rd(this.abyr()); this.a = this.x = this.nz(this.sp); break;       // LAS
      case 0x9B: a = this.ab(); this.sp = this.a & this.x; this.sh(a, this.y, this.a & this.x); break;  // SHS
      case 0x9F: this.sh(this.ab(), this.y, this.a & this.x); break;
      case 0x93: this.sh(this.ptr(), this.y, this.a & this.x); break;
      case 0x9E: this.sh(this.ab(), this.y, this.x); break;
      case 0x9C: this.sh(this.ab(), this.x, this.y); break;
      // undocumented no-ops, some of which read
      case 0x1A: case 0x3A: case 0x5A: case 0x7A: case 0xDA: case 0xFA: this.pc++; break;
      case 0x80: case 0x82: case 0x89: case 0xC2: case 0xE2: this.pc += 2; break;
      case 0x04: case 0x44: case 0x64: this.peek(this.zp()); break;
      case 0x0C: this.peek(this.ab()); break;
      case 0x14: case 0x34: case 0x54: case 0x74: case 0xD4: case 0xF4: this.peek(this.zpx()); break;
      case 0x1C: case 0x3C: case 0x5C: case 0x7C: case 0xDC: case 0xFC: this.peek(this.abxr()); break;
      default:                                       // the twelve JAMs
        this.fail('JAM ' + hex2(op) + ' at ' + hex4(pc) + ': the processor stops here', { address: pc });
    }
    this.pc &= 0xFFFF;
    this.steps++;
    return this.cycles - c0;
  }

  undocumented(op) {
    this.fail('undocumented opcode ' + hex2(op) + ' (' + OPCODES[op].join(' ') + ') at ' + hex4(this.opc), { address: this.opc });
  }

  // Run until the program counter reaches until (with the stack pointer at sp0, when sp0 >= 0), or
  // the cycle count reaches cyclesTo, or a hook returns true.
  loop(until, sp0, hooks, max, cyclesTo) {
    const start = this.steps;
    let n = 0;
    if (hooks === null && sp0 < 0 && cyclesTo === Infinity) {     // the common case, kept tight
      while (this.pc !== until) { this.step(); if (++n > max) this.limit(max); }
      return this.steps - start;
    }
    for (;;) {
      const pc = this.pc;
      if (pc === until && (sp0 < 0 || this.sp === sp0)) break;
      if (this.cycles >= cyclesTo) break;
      if (hooks !== null && hooks[pc] !== undefined) {
        if (hooks[pc](this) === true) break;
        if (this.pc !== pc) { if (++n > max) this.limit(max); continue; }
      }
      this.step();
      if (++n > max) this.limit(max);
    }
    return this.steps - start;
  }
  limit(max) { this.fail('step limit (' + max + ') passed at ' + hex4(this.pc), { address: this.pc }); }

  // The address maps an entry point was given, for the length of its run (the caller restores them).
  maps(opts) { this.writes = opts.writes || null; this.reads = opts.reads || null; this.executed = opts.executed || null; }

  // Run the routine at entry until it returns to the sentinel.
  call(entry, regs = {}, opts = {}) {
    const sentinel = opts.sentinel === undefined ? 0xFFFF : opts.sentinel & 0xFFFF;
    this.setRegs(regs);
    if (regs.sp === undefined) this.sp = 0xFF;
    const w = this.writes, r = this.reads, e = this.executed;
    this.maps(opts);
    try {
      const ret = (sentinel - 1) & 0xFFFF;
      this.push(ret >> 8); this.push(ret & 0xFF);
      this.pc = entry & 0xFFFF;
      return this.loop(sentinel, -1, opts.hooks || null, opts.maxSteps || 1e6, Infinity);
    } finally { this.writes = w; this.reads = r; this.executed = e; }
  }

  // Run from cpu.pc until opts.until, or for at least opts.cycles cycles.
  run(opts = {}) {
    const until = opts.until === undefined ? -1 : opts.until & 0xFFFF;
    const cycles = opts.cycles === undefined ? Infinity : this.cycles + opts.cycles;
    const max = opts.maxSteps || (opts.cycles === undefined ? 1e6 : Infinity);
    const w = this.writes, r = this.reads, e = this.executed;
    this.maps(opts);
    try { return this.loop(until, -1, opts.hooks || null, max, cycles); } finally { this.writes = w; this.reads = r; this.executed = e; }
  }

  irq(handler, opts = {}) { return this.interrupt(0xFFFE, handler, opts); }
  nmi(handler, opts = {}) { return this.interrupt(0xFFFA, handler, opts); }

  interrupt(vector, handler, opts) {
    const pc0 = this.pc, sp0 = this.sp;
    const w = this.writes, r = this.reads, e = this.executed;
    this.maps(opts);
    try {
      this.push(pc0 >> 8); this.push(pc0 & 0xFF); this.push(this.p);
      this.i = 1; this.cycles += 7;
      let hooks = opts.hooks || null;
      if (opts.kernal) {
        // PLA TAY PLA TAX PLA RTI, at $EA81 and $FEBC
        const out = c => { c.y = c.pull(); c.x = c.pull(); c.a = c.pull(); c.rti(); c.cycles += 22; };
        if (vector === 0xFFFE) {                     // $FF48: PHA TXA PHA TYA PHA TSX LDA $0104,X AND #$10 BEQ; JMP ($0314)
          this.push(this.a); this.push(this.x); this.push(this.y);
          this.x = this.sp; this.a = 0; this.n = 0; this.z = 1; this.cycles += this.sp >= 0xFC ? 30 : 29;
          hooks = Object.assign({ 0xEA31: out, 0xEA81: out }, hooks);
          if (handler == null) handler = this.word(0x0314);
        } else {                                     // $FE43: SEI; JMP ($0318)
          this.cycles += 7;
          hooks = Object.assign({ 0xFEBC: out }, hooks);
          if (handler == null) handler = this.word(0x0318);
        }
      } else if (handler == null) handler = this.vector(vector, vector === 0xFFFA ? 'NMI' : 'IRQ');
      this.pc = handler & 0xFFFF;
      return this.loop(pc0, sp0, hooks, opts.maxSteps || 1e6, Infinity);
    } finally { this.writes = w; this.reads = r; this.executed = e; }
  }
}

module.exports = { CPU, readSnapshot, loadSnapshot, OPCODES, CYCLES };
