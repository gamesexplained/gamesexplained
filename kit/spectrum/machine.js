'use strict';
// A 48K Spectrum around the kit's Z80 simulator (z80.js), for checking a port of a whole game against
// the game's own code, pass by pass: the game runs here from its own memory while the port runs
// beside it, and the two are compared (kit/skills/core/70-minisite, "Play"). It is the Spectrum's
// twin of kit/c64/machine.js. What is modelled is what the ULA does to the processor:
// - the frame, 69,888 T-states (224 a line, 312 lines), and its interrupt. cpu.tstates counts on
//   from opts.tstate, the T-state of the frame to start at, so the frame's T-state is
//   cpu.tstates % FRAME, as ZEsarUX's transaction log numbers it. The interrupt is ZEsarUX 13.0's,
//   measured (kit/spectrum/check_machine.js): the instruction, or halted cycle, during which a
//   frame begins raises it, and at that instruction's end it is taken if IFF1 is set, held over to
//   the next instruction's end after an EI, and otherwise lost. Taking it costs 13 T-states in IM 0
//   and IM 1 (to $0038), and 19 in IM 2, through the vector at I x 256 + $FF; HALT runs halted
//   cycles of 4 T-states, each one incrementing R, until then. The real ULA holds its interrupt
//   line for some T-states, for a time the reference does not give, so a game that enables the
//   interrupts just after a frame begins can take one there that this machine, and ZEsarUX, lose;
// - the ULA's port, any even port: a read returns the keyboard's half-rows that are low in the
//   port's high byte, ANDed (KEY below, a 0 for a key held), bits 5 and 7 set, and bit 6 as bit 4
//   of the last value written to the port, as ZEsarUX 13.0 reads it; a write sets the border
//   (bits 0-2) and the MIC and EAR outputs (bits 3 and 4), logged as [T-state, value] when ulaLog is
//   an array. Three keys that make a rectangle do not read the fourth here;
// - with contention (the default), the cycles the ULA takes while it draws the picture: an access to
//   $4000-$7FFF waits 6, 5, 4, 3, 2, 1, 0 or 0 T-states, by the frame's T-state, in the first 128
//   T-states of each of the picture's 192 lines from T-state 14335
//   (kit/skills/spectrum/zx-spectrum-reference, "Timing"). Each memory access and each internal
//   cycle of an instruction is held on the address then on the bus: the address after a read or a
//   write, I x 256 + R after an opcode fetch, the port after an I/O cycle. An I/O cycle to an even
//   port, or with the high byte in $40-$7F, is held as well.
// - with model: 128, the Spectrum 128 (zx-spectrum-reference, "$7FFD" and "The AY-3-8912"): a
//   frame of 70,908 T-states (228 a line, 311 lines) and contention from T-state 14361 in banks 1,
//   3, 5 and 7, the same pattern; eight RAM banks, 5 always at $4000, 2 at $8000 and the one port
//   $7FFD names at $C000 (a write with A1 and A15 low: bits 0-2 the bank, 3 the screen shown, 4
//   the ROM, 5 locking the port until reset); and the AY's two ports, $FFFD (A15 and A14 set, A1
//   low) selecting a register and reading it back, $BFFD (A15 set, A14 and A1 low) writing it,
//   logged as [T-state, register, value] when ayLog is an array. Bank 2 or 5 paged in at $C000
//   shows the same RAM twice: an access to $C000-$FFFF goes to $8000 or $4000 then (Banks128's
//   alias), where the bank lives.
// Not modelled: the floating bus (any odd port reads $FF, the AY's apart), the AY's sound itself
// (site/lib/ay.js plays it), the tape and the beeper's sound. The ROM is not the game's and is never committed: without opts.rom, an
// instruction fetched or a byte read below $4000 stops the run with the address, a hook (below) can
// stand in for a ROM routine, and a write there is lost, as on the machine. A test may pass the ROM
// read from the emulator's own file at run time. Checked by kit/spectrum/test_machine.js, and
// against ZEsarUX by kit/spectrum/check_machine.js.
//
// const { Machine, KEY, loadSna } = require('kit/spectrum/machine.js');
// const { ram, regs } = loadSna('games/spectrum/<slug>/work/<state>.sna');
// const m = new Machine({ ram, regs, passAt: 0x8000 });
// - ram: the 64 KB the game runs in (a Uint8Array(65536), used in place). loadSna reads a 48K .sna
//   into it, with the registers the header holds and the program counter popped from the stack;
//   loadListing rebuilds it from a listing.json's records. A 128K .sna gives banks and paging too.
// - model: 48 (the default) or 128. With 128: banks, the eight banks' 16 KB each (an array of 8
//   Uint8Array(16384); the ones in view, 5, 2 and the paged one, are read from ram instead), and
//   paging, the value last written to $7FFD (default 0). m.bank(n) is bank n's 16 KB as it stands
//   (a view of ram for those in view), m.page(v) writes $7FFD, m.paging is its value, m.screen the
//   bank shown (5 or 7), and m.ay { sel, regs } the AY's selected register and its 16 registers.
// - regs: the registers to start with, as z80.js's setRegs takes them (pc, sp, a, f, bc_, iff1,
//   im and the rest); pc alone is enough for a program of one's own. The interrupts start off.
// - passAt: the address of the main loop's first instruction. Each time the processor reaches it,
//   passes counts one and onPass(machine) runs, the place to set the next pass's input; onPass
//   returning true stops the run with the program counter there, before the pass (runUntilPass).
// - hooks: { address: fn(machine) }, run when the program counter reaches the address, before the
//   instruction there. A hook may change registers and memory, return from a routine it stands in
//   for (m.ret()) or set cpu.pc; returning true stops the run there.
// - rom: the 16 KB ROM, a Uint8Array(16384) (on the 128, both, 32 KB: ROM 0 then ROM 1, paged by
//   bit 4 of $7FFD); romRanges: [[from, to], ...], offsets into rom (to not included), when rom holds
//   only an excerpt, the bytes a game reads (AGENTS.md, "No binaries, ever"): a fetch or a read
//   anywhere else in the ROM stops the run as it does with no rom; contention: false for none;
//   tstate: the frame's T-state to start at (default 0); border: the border to start with. A .sna
//   holds no MIC or EAR output, and ear starts 0.
// - runTStates(n), runFrames(n), runPasses(n), runUntilPass(f): run with the interrupts. frames
//   counts the frames begun since the start.
// - keys (a Set of key numbers), press(k), release(k), releaseAll(): the keyboard, read whenever the
//   game scans. k is a KEY name or its number, half-row x 8 + bit.
// - border, ear: the last values written to the ULA.
// - save() and Machine.restore(state, { rom, romRanges }): the whole machine as JSON, for tests
//   that start from a moment of play. A state holds the game's memory (every bank, on the 128),
//   never the ROM: it stays in the game's gitignored work/. A subclass's restore makes a machine
//   of its own class.
// - LINE, FRAME and delay: the machine's line, frame and contention table, by its model.
// - portIn(port) and portOut(port, value) may be wrapped by a test or a page, to add a joystick
//   interface or watch the ULA: they see every I/O cycle in order, with cpu.tstates as the time.
const fs = require('fs');
const { CPU } = require('./z80.js');

const LINE = 224, LINES = 312, FRAME = LINE * LINES;
const LINE128 = 228, LINES128 = 311, FRAME128 = LINE128 * LINES128;
const PICTURE_LINES = 192, FETCH = 128;
// The T-states an access to contended memory waits, by the frame's T-state.
function delays(line, frame, picture) {
  const d = new Uint8Array(frame);
  for (let l = 0; l < PICTURE_LINES; l++) {
    for (let x = 0; x < FETCH; x++) d[picture + l * line + x] = [6, 5, 4, 3, 2, 1, 0, 0][x & 7];
  }
  return d;
}
const DELAY = delays(LINE, FRAME, 14335), DELAY128 = delays(LINE128, FRAME128, 14361);

// The 128's memory: ram is the 64 KB the processor sees, banks 5 and 2 always at $4000 and $8000
// and the paged one at $C000; the other banks are kept in store, each 16 KB, and paging copies the
// one leaving $C000 out and the one arriving in. Bank 5 or 2 paged in at $C000 lives at its own
// address still: alias(a) is where an access to a goes ($C000 up moved down to $4000 or $8000),
// and ram's $C000-$FFFF holds only a copy made when it was paged in, which writes do not keep up
// to date. A port of a 128K game keeps its memory the same way (kit/spectrum/lockstep.js), so that
// P.M is what the processor would see, and goes through alias for $C000 up while bank 5 or 2 is in.
class Banks128 {
  constructor(ram, banks, paged = 0) {
    this.ram = ram;
    this.store = [];
    for (let n = 0; n < 8; n++) this.store.push(banks && banks[n] ? Uint8Array.from(banks[n]) : new Uint8Array(0x4000));
    this.paged = paged & 7;
    this.shift = this.paged === 5 ? 0x8000 : this.paged === 2 ? 0x4000 : 0;
  }
  page(n) {
    n &= 7;
    if (n === this.paged) return;
    if (!this.shift) this.store[this.paged].set(this.ram.subarray(0xC000));
    this.paged = n;
    this.shift = n === 5 ? 0x8000 : n === 2 ? 0x4000 : 0;
    if (this.shift) this.ram.copyWithin(0xC000, 0xC000 - this.shift, 0x10000 - this.shift);
    else this.ram.set(this.store[n], 0xC000);
  }
  alias(a) { return a >= 0xC000 ? a - this.shift : a; }
  bank(n) {
    n &= 7;
    if (n === 5) return this.ram.subarray(0x4000, 0x8000);
    if (n === 2) return this.ram.subarray(0x8000, 0xC000);
    if (n === this.paged) return this.ram.subarray(0xC000);
    return this.store[n];
  }
}
// What an AY register keeps of a byte written to it (the AY-3-8912's register widths).
const AY_MASK = [0xFF, 0x0F, 0xFF, 0x0F, 0xFF, 0x0F, 0x1F, 0xFF, 0x1F, 0x1F, 0x1F, 0xFF, 0xFF, 0x0F, 0xFF, 0xFF];

// Key numbers, half-row x 8 + bit: half-row 0 is read with port $FEFE, 7 with $7FFE.
const KEY = {
  CAPS: 0x00, Z: 0x01, X: 0x02, C: 0x03, V: 0x04,
  A: 0x08, S: 0x09, D: 0x0A, F: 0x0B, G: 0x0C,
  Q: 0x10, W: 0x11, E: 0x12, R: 0x13, T: 0x14,
  '1': 0x18, '2': 0x19, '3': 0x1A, '4': 0x1B, '5': 0x1C,
  '0': 0x20, '9': 0x21, '8': 0x22, '7': 0x23, '6': 0x24,
  P: 0x28, O: 0x29, I: 0x2A, U: 0x2B, Y: 0x2C,
  ENTER: 0x30, L: 0x31, K: 0x32, J: 0x33, H: 0x34,
  SPACE: 0x38, SYMBOL: 0x39, M: 0x3A, N: 0x3B, B: 0x3C,
};

function loadListing(file) {
  const L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ram = new Uint8Array(65536);
  for (const r of L.records) if (r.b) for (let i = 0; i < r.b.length; i++) ram[r.a + i] = r.b[i];
  return ram;
}

// A 48K .sna: the 27-byte header, then $4000-$FFFF (zx-spectrum-reference, "Snapshot formats").
// The program counter is on the stack at the header's SP, popped here as a load does. A 128K .sna
// (131103 or 147487 bytes) keeps that layout for banks 5, 2 and the paged one, then holds the
// program counter, the $7FFD value, a TR-DOS flag and the other banks in ascending order; it gives
// { ram, regs, border, model: 128, banks, paging }, with the program counter as stored.
function loadSna(file) {
  const b = fs.readFileSync(file);
  const ram = new Uint8Array(65536);
  const w = o => b[o] | (b[o + 1] << 8);
  const iff = (b[19] >> 2) & 1, sp = w(23);
  const regs = { i: b[0], hl_: w(1), de_: w(3), bc_: w(5), af_: w(7), h: b[10], l: b[9], d: b[12], e: b[11],
    b: b[14], c: b[13], iy: w(15), ix: w(17), iff1: iff, iff2: iff, r: b[20], a: b[22], f: b[21], im: b[25] & 3 };
  if (b.length === 131103 || b.length === 147487) {
    ram.set(b.subarray(27, 27 + 0xC000), 0x4000);
    const paging = b[27 + 0xC000 + 2], paged = paging & 7, banks = [];
    for (let n = 0; n < 8; n++) banks.push(new Uint8Array(0x4000));
    banks[5].set(ram.subarray(0x4000, 0x8000)); banks[2].set(ram.subarray(0x8000, 0xC000)); banks[paged].set(ram.subarray(0xC000));
    let o = 27 + 0xC000 + 4;
    for (let n = 0; n < 8; n++) {
      if (n === 5 || n === 2 || n === paged) continue;
      banks[n].set(b.subarray(o, o + 0x4000)); o += 0x4000;
    }
    Object.assign(regs, { sp, pc: w(27 + 0xC000) });
    return { ram, regs, border: b[26] & 7, model: 128, banks, paging };
  }
  if (b.length !== 49179) throw new Error(`${file}: ${b.length} bytes; a 48K .sna is 49179, a 128K one 131103 or 147487`);
  ram.set(b.subarray(27), 0x4000);
  Object.assign(regs, { sp: (sp + 2) & 0xFFFF, pc: ram[sp] | (ram[(sp + 1) & 0xFFFF] << 8) });
  return { ram, regs, border: b[26] & 7 };
}

// The Z80 on the 48K's buses: the ROM, contention, and the ULA's port.
class Bus extends CPU {
  constructor(machine, mem) {
    super(mem);
    this.machine = machine;
    this.bus = 0;                       // the address left on the bus, which an internal cycle waits on
  }
  contend(a) { const m = this.machine; if (m.contention && m.contended(a)) this.tstates += m.delay[this.tstates % m.FRAME]; }
  rom(a, what) {
    if (a < 0x4000 && !this.machine.romHas(a)) {
      this.fail(`${what} the ROM at $${a.toString(16).toUpperCase().padStart(4, '0')}, and the machine has no rom`, { address: a });
    }
  }
  fetch() {
    const a = this.pc, mem = this.machine.mem;
    this.rom(a, 'the program counter reached');
    this.contend(a);
    let v = super.fetch();
    if (mem && mem.shift && a >= 0xC000) v = this.m[a - mem.shift];
    this.bus = (this.i << 8) | this.r;
    return v;
  }
  rd(a) {
    const mem = this.machine.mem;
    let n = this.resolve(a);
    if (mem && mem.shift && n >= 0xC000) n -= mem.shift;
    this.rom(n, 'a read of');
    this.contend(n);
    this.bus = n;
    return super.rd(n);
  }
  wr(a, v) {
    const mem = this.machine.mem;
    let n = this.resolve(a);
    if (mem && mem.shift && n >= 0xC000) n -= mem.shift;
    this.contend(n);
    this.bus = n;
    if (n < 0x4000) this.tstates += 3; else super.wr(n, v);
  }
  wait(n) {
    const m = this.machine;
    if (!m.contention || !m.contended(this.bus)) { this.tstates += n; return; }
    for (let i = 0; i < n; i++) this.tstates += m.delay[this.tstates % m.FRAME] + 1;
  }
  // An I/O cycle's four T-states, held as the port's high byte and its bit 0 say.
  ioCycle(port) {
    const m = this.machine;
    this.bus = port;
    if (!m.contention) { this.tstates += 4; return; }
    const high = m.contended(port), ula = !(port & 1);
    const c = n => { this.tstates += m.delay[this.tstates % m.FRAME] + n; };
    if (high) { if (ula) { c(1); c(3); } else { c(1); c(1); c(1); c(1); } }
    else if (ula) { this.tstates += 1; c(3); }
    else this.tstates += 4;
  }
  in(port) { this.ioCycle(port & 0xFFFF); return this.machine.portIn(port & 0xFFFF) & 0xFF; }
  out(port, v) { this.ioCycle(port & 0xFFFF); this.machine.portOut(port & 0xFFFF, v & 0xFF); }
}

class Machine {
  constructor(opts = {}) {
    if (!opts.ram) throw new Error('Machine: no ram (loadSna or loadListing gives it)');
    this.ram = opts.ram;
    this.model = opts.model === 128 ? 128 : 48;
    if (opts.model !== undefined && opts.model !== 48 && opts.model !== 128) throw new Error(`Machine: no model ${opts.model} (48 or 128)`);
    const m128 = this.model === 128;
    this.LINE = m128 ? LINE128 : LINE; this.LINES = m128 ? LINES128 : LINES; this.FRAME = m128 ? FRAME128 : FRAME;
    this.delay = m128 ? DELAY128 : DELAY;
    this.hasRom = !!opts.rom;
    this.rom = null;
    this.romRanges = null;
    if (opts.rom) {
      const size = m128 ? 0x8000 : 0x4000;
      if (opts.rom.length !== size) throw new Error(`Machine: a ${this.model}K ROM is ${size} bytes, not ${opts.rom.length}`);
      this.rom = opts.rom;
      if (opts.romRanges) this.romRanges = opts.romRanges.map(([f, t]) => [f, t]);
    }
    if (m128) {
      this.paging = (opts.paging || 0) & 0xFF;
      this.mem = new Banks128(this.ram, opts.banks, this.paging & 7);
      this.ay = { sel: 0, regs: new Uint8Array(16) };
      this.ayLog = null;
      if (this.rom) this.ram.set(this.rom.subarray((this.paging & 0x10) << 10, ((this.paging & 0x10) << 10) + 0x4000), 0);
    } else if (this.rom) this.ram.set(this.rom, 0);
    this.contention = opts.contention !== false;
    this.intPending = false;            // a frame began during an EI, so the next instruction may take it
    this.passAt = opts.passAt === undefined ? null : opts.passAt;
    this.keys = new Set();
    this.border = opts.border === undefined ? 7 : opts.border & 7;
    this.ear = 0;
    this.ulaLog = null;
    this.passes = 0;
    this.onPass = null;
    this.skipOnce = false;              // resuming at passAt after a stop there: not counted twice
    this.stopFlag = false;
    this.cpu = new Bus(this, this.ram);
    this.cpu.setRegs(Object.assign({ iff1: 0, iff2: 0 }, opts.regs || {}, opts.pc === undefined ? {} : { pc: opts.pc }));
    this.cpu.tstates = opts.tstate === undefined ? 0 : opts.tstate;
    this.t0 = this.cpu.tstates;
    this.hooks = Object.assign({}, opts.hooks || {});
    if (this.passAt !== null) {
      const own = this.hooks[this.passAt];
      this.hooks[this.passAt] = m => {
        if (m.skipOnce) { m.skipOnce = false; return own ? own(m) : false; }
        m.passes++;
        if (m.onPass && m.onPass(m) === true) { m.skipOnce = true; return true; }
        return own ? own(m) : false;
      };
    }
  }
  get frames() { return Math.floor(this.cpu.tstates / this.FRAME) - Math.floor(this.t0 / this.FRAME); }
  get tstate() { return this.cpu.tstates % this.FRAME; }   // the frame's T-state
  // Whether an access to address a is contended: $4000-$7FFF, and on the 128 $C000 up when an odd
  // bank is paged in.
  contended(a) {
    const top = a & 0xC000;
    return top === 0x4000 || (top === 0xC000 && this.model === 128 && (this.mem.paged & 1) === 1);
  }
  bank(n) { if (this.model !== 128) throw new Error('Machine: bank() is the 128\'s'); return this.mem.bank(n); }
  // Whether the ROM's byte at a (below $4000, in the ROM paged in) is one the machine holds.
  romHas(a) {
    if (!this.hasRom) return false;
    if (!this.romRanges) return true;
    const o = this.model === 128 ? a + ((this.paging & 0x10) << 10) : a;
    return this.romRanges.some(([f, t]) => o >= f && o < t);
  }
  get screen() { return this.model === 128 && (this.paging & 8) ? 7 : 5; }
  // A write to $7FFD: the bank at $C000, the screen shown, the ROM; ignored once bit 5 has locked it.
  page(v) {
    if (this.model !== 128) throw new Error('Machine: page() is the 128\'s');
    if (this.paging & 0x20) return;
    const old = this.paging;
    this.paging = v & 0xFF;
    this.mem.page(v & 7);
    if (this.rom && ((old ^ v) & 0x10)) this.ram.set(this.rom.subarray((v & 0x10) << 10, ((v & 0x10) << 10) + 0x4000), 0);
  }
  portIn(port) {
    if (this.model === 128 && (port & 0xC002) === 0xC000) {
      const r = this.ay.sel;
      return r < 14 ? this.ay.regs[r] : 0xFF;
    }
    if (port & 1) return 0xFF;
    const high = port >> 8;
    let v = 0x1F;
    for (const k of this.keys) if (!(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    return 0xA0 | (this.ear << 6) | v;
  }
  portOut(port, v) {
    if (this.model === 128) {
      if (!(port & 0x8002)) this.page(v);
      if ((port & 0xC002) === 0xC000) this.ay.sel = v & 15;
      else if ((port & 0xC002) === 0x8000) {
        const r = this.ay.sel;
        this.ay.regs[r] = v & AY_MASK[r];
        if (this.ayLog) this.ayLog.push([this.cpu.tstates, r, v & AY_MASK[r]]);
      }
    }
    if (port & 1) return;
    this.border = v & 7;
    this.ear = (v >> 4) & 1;
    if (this.ulaLog) this.ulaLog.push([this.cpu.tstates, v]);
  }
  // One instruction, or one halted cycle, then the interrupt if it is due. False when a hook stopped
  // the run there.
  step() {
    const cpu = this.cpu, before = cpu.tstates;
    if (cpu.halted) {
      cpu.contend(cpu.pc);
      cpu.tstates += 4;
      cpu.incR();
    } else {
      for (let n = 0; ; n++) {
        const pc = cpu.pc, h = this.hooks[pc];
        if (h === undefined) break;
        if (h(this) === true) return false;
        if (cpu.pc === pc || cpu.halted) break;
        if (n > 1000) throw new Error(`Machine: the hooks keep moving the program counter (at $${pc.toString(16)})`);
      }
      if (cpu.halted) return true;
      cpu.step();
    }
    if (Math.floor(cpu.tstates / this.FRAME) > Math.floor(before / this.FRAME)) this.intPending = true;
    if (this.intPending && !cpu.ei) {
      this.intPending = false;
      if (cpu.iff1) this.interrupt();
    }
    cpu.ei = 0;
    return true;
  }
  // The ULA's interrupt, taken: the acknowledge (7 T-states), the program counter pushed, and the
  // handler at $0038, or in IM 2 the one the vector at I x 256 + $FF names.
  interrupt() {
    const cpu = this.cpu;
    cpu.halted = 0;
    cpu.iff1 = cpu.iff2 = 0;
    cpu.incR();
    cpu.tstates += 7;
    cpu.push(cpu.pc);
    if (cpu.im === 2) {
      const v = (cpu.i << 8) | 0xFF;
      cpu.pc = cpu.rd(v) | (cpu.rd((v + 1) & 0xFFFF) << 8);
    } else cpu.pc = 0x38;
    cpu.wz = cpu.pc;
    cpu.q = 0;
  }
  // Return from the routine a hook stands in for.
  ret() { const cpu = this.cpu; cpu.pc = cpu.pop(); }
  // Run for n T-states, the interrupts included. False when a hook or onPass stopped the run.
  runTStates(n) {
    const end = this.cpu.tstates + n;
    while (this.cpu.tstates < end) if (!this.step()) return false;
    return true;
  }
  runFrames(n) { return this.runTStates(n * this.FRAME); }
  // Run until f(machine) is true at a main-loop pass: stops with the program counter at passAt,
  // before the pass (its input already set by any onPass). False at the frame limit.
  runUntilPass(f, maxFrames = 100000) {
    if (this.passAt === null) throw new Error('Machine: runUntilPass needs passAt');
    let hit = false;
    const prev = this.onPass;
    this.onPass = m => { if (prev) prev(m); if (f(m)) { hit = true; return true; } return false; };
    const end = this.frames + maxFrames;
    try { while (!hit && this.frames < end) this.runFrames(1); } finally { this.onPass = prev; }
    return hit;
  }
  runPasses(n, maxFrames = 100000) { const target = this.passes + n; return this.runUntilPass(m => m.passes >= target, maxFrames); }
  press(k) { this.keys.add(typeof k === 'string' ? KEY[k] : k); }
  release(k) { this.keys.delete(typeof k === 'string' ? KEY[k] : k); }
  releaseAll() { this.keys.clear(); }
  save() {
    const c = this.cpu, ram = Buffer.from(this.ram);
    ram.fill(0, 0, 0x4000);                     // never the ROM
    const cpu = {};
    for (const k of ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'af_', 'bc_', 'de_', 'hl_', 'ix', 'iy', 'sp', 'pc', 'i', 'r', 'wz',
      'im', 'iff1', 'iff2', 'ei', 'p', 'q', 'halted', 'tstates', 'bus']) cpu[k] = c[k];
    const out = { ram: ram.toString('base64'), cpu, t0: this.t0, passes: this.passes, skipOnce: this.skipOnce, passAt: this.passAt,
      keys: Array.from(this.keys), border: this.border, ear: this.ear, contention: this.contention, intPending: this.intPending };
    if (this.model === 128) {
      Object.assign(out, { model: 128, paging: this.paging, ay: { sel: this.ay.sel, regs: Array.from(this.ay.regs) },
        banks: [0, 1, 2, 3, 4, 5, 6, 7].map(n => Buffer.from(this.mem.bank(n)).toString('base64')) });
    }
    return out;
  }
  static restore(s, opts = {}) {
    const banks = s.banks ? s.banks.map(b => new Uint8Array(Buffer.from(b, 'base64'))) : undefined;
    const m = new this({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), rom: opts.rom, romRanges: opts.romRanges, hooks: opts.hooks,
      passAt: opts.passAt !== undefined ? opts.passAt : s.passAt, contention: s.contention,
      model: s.model || 48, banks, paging: s.paging });
    if (s.ay) { m.ay.sel = s.ay.sel; m.ay.regs.set(s.ay.regs); }
    const { tstates, bus, ...regs } = s.cpu;
    m.cpu.setRegs(regs);
    m.cpu.tstates = tstates; m.cpu.bus = bus;
    Object.assign(m, { t0: s.t0, passes: s.passes, skipOnce: !!s.skipOnce, keys: new Set(s.keys), border: s.border, ear: s.ear,
      intPending: !!s.intPending });
    return m;
  }
}

module.exports = { Machine, Banks128, AY_MASK, KEY, loadSna, loadListing, LINE, LINES, FRAME, DELAY, LINE128, LINES128, FRAME128, DELAY128 };
