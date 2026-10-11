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
// Not modelled: the floating bus (any odd port reads $FF), the 128K and its paging, the tape and
// the beeper's sound. The ROM is not the game's and is never committed: without opts.rom, an
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
//   loadListing rebuilds it from a listing.json's records.
// - regs: the registers to start with, as z80.js's setRegs takes them (pc, sp, a, f, bc_, iff1,
//   im and the rest); pc alone is enough for a program of one's own. The interrupts start off.
// - passAt: the address of the main loop's first instruction. Each time the processor reaches it,
//   passes counts one and onPass(machine) runs, the place to set the next pass's input; onPass
//   returning true stops the run with the program counter there, before the pass (runUntilPass).
// - hooks: { address: fn(machine) }, run when the program counter reaches the address, before the
//   instruction there. A hook may change registers and memory, return from a routine it stands in
//   for (m.ret()) or set cpu.pc; returning true stops the run there.
// - rom: the 16 KB ROM, a Uint8Array(16384); contention: false for none; tstate: the frame's
//   T-state to start at (default 0); border: the border to start with. A .sna holds no MIC or EAR
//   output, and ear starts 0.
// - runTStates(n), runFrames(n), runPasses(n), runUntilPass(f): run with the interrupts. frames
//   counts the frames begun since the start.
// - keys (a Set of key numbers), press(k), release(k), releaseAll(): the keyboard, read whenever the
//   game scans. k is a KEY name or its number, half-row x 8 + bit.
// - border, ear: the last values written to the ULA.
// - save() and Machine.restore(state, { rom }): the whole machine as JSON, for tests that start from
//   a moment of play. A state holds the game's memory, never the ROM: it stays in the game's
//   gitignored work/.
// - portIn(port) and portOut(port, value) may be wrapped by a test or a page, to add a joystick
//   interface or watch the ULA: they see every I/O cycle in order, with cpu.tstates as the time.
const fs = require('fs');
const { CPU } = require('./z80.js');

const LINE = 224, LINES = 312, FRAME = LINE * LINES;
const PICTURE = 14335, PICTURE_LINES = 192, FETCH = 128;
// The T-states an access to $4000-$7FFF waits, by the frame's T-state.
const DELAY = new Uint8Array(FRAME);
for (let l = 0; l < PICTURE_LINES; l++) {
  for (let x = 0; x < FETCH; x++) DELAY[PICTURE + l * LINE + x] = [6, 5, 4, 3, 2, 1, 0, 0][x & 7];
}

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
// The program counter is on the stack at the header's SP, popped here as a load does.
function loadSna(file) {
  const b = fs.readFileSync(file);
  if (b.length !== 49179) throw new Error(`${file}: ${b.length} bytes; a 48K .sna is 49179`);
  const ram = new Uint8Array(65536);
  ram.set(b.subarray(27), 0x4000);
  const w = o => b[o] | (b[o + 1] << 8);
  const iff = (b[19] >> 2) & 1, sp = w(23);
  const regs = { i: b[0], hl_: w(1), de_: w(3), bc_: w(5), af_: w(7), h: b[10], l: b[9], d: b[12], e: b[11],
    b: b[14], c: b[13], iy: w(15), ix: w(17), iff1: iff, iff2: iff, r: b[20], a: b[22], f: b[21],
    sp: (sp + 2) & 0xFFFF, pc: ram[sp] | (ram[(sp + 1) & 0xFFFF] << 8), im: b[25] & 3 };
  return { ram, regs, border: b[26] & 7 };
}

// The Z80 on the 48K's buses: the ROM, contention, and the ULA's port.
class Bus extends CPU {
  constructor(machine, mem) {
    super(mem);
    this.machine = machine;
    this.bus = 0;                       // the address left on the bus, which an internal cycle waits on
  }
  contend(a) { if (this.machine.contention && (a & 0xC000) === 0x4000) this.tstates += DELAY[this.tstates % FRAME]; }
  rom(a, what) {
    if (a < 0x4000 && !this.machine.hasRom) {
      this.fail(`${what} the ROM at $${a.toString(16).toUpperCase().padStart(4, '0')}, and the machine has no rom`, { address: a });
    }
  }
  fetch() {
    const a = this.pc;
    this.rom(a, 'the program counter reached');
    this.contend(a);
    const v = super.fetch();
    this.bus = (this.i << 8) | this.r;
    return v;
  }
  rd(a) {
    const n = this.resolve(a);
    this.rom(n, 'a read of');
    this.contend(n);
    this.bus = n;
    return super.rd(n);
  }
  wr(a, v) {
    const n = this.resolve(a);
    this.contend(n);
    this.bus = n;
    if (n < 0x4000) this.tstates += 3; else super.wr(n, v);
  }
  wait(n) {
    if (!this.machine.contention || (this.bus & 0xC000) !== 0x4000) { this.tstates += n; return; }
    for (let i = 0; i < n; i++) this.tstates += DELAY[this.tstates % FRAME] + 1;
  }
  // An I/O cycle's four T-states, held as the port's high byte and its bit 0 say.
  ioCycle(port) {
    this.bus = port;
    if (!this.machine.contention) { this.tstates += 4; return; }
    const high = (port & 0xC000) === 0x4000, ula = !(port & 1);
    const c = n => { this.tstates += DELAY[this.tstates % FRAME] + n; };
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
    this.hasRom = !!opts.rom;
    if (opts.rom) {
      if (opts.rom.length !== 0x4000) throw new Error(`Machine: a 48K ROM is 16384 bytes, not ${opts.rom.length}`);
      this.ram.set(opts.rom, 0);
    }
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
  get frames() { return Math.floor(this.cpu.tstates / FRAME) - Math.floor(this.t0 / FRAME); }
  get tstate() { return this.cpu.tstates % FRAME; }   // the frame's T-state
  portIn(port) {
    if (port & 1) return 0xFF;
    const high = port >> 8;
    let v = 0x1F;
    for (const k of this.keys) if (!(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    return 0xA0 | (this.ear << 6) | v;
  }
  portOut(port, v) {
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
    if (Math.floor(cpu.tstates / FRAME) > Math.floor(before / FRAME)) this.intPending = true;
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
  runFrames(n) { return this.runTStates(n * FRAME); }
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
    return { ram: ram.toString('base64'), cpu, t0: this.t0, passes: this.passes, skipOnce: this.skipOnce, passAt: this.passAt,
      keys: Array.from(this.keys), border: this.border, ear: this.ear, contention: this.contention, intPending: this.intPending };
  }
  static restore(s, opts = {}) {
    const m = new Machine({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), rom: opts.rom, hooks: opts.hooks,
      passAt: opts.passAt !== undefined ? opts.passAt : s.passAt, contention: s.contention });
    const { tstates, bus, ...regs } = s.cpu;
    m.cpu.setRegs(regs);
    m.cpu.tstates = tstates; m.cpu.bus = bus;
    Object.assign(m, { t0: s.t0, passes: s.passes, skipOnce: !!s.skipOnce, keys: new Set(s.keys), border: s.border, ear: s.ear,
      intPending: !!s.intPending });
    return m;
  }
}

module.exports = { Machine, KEY, loadSna, loadListing, LINE, LINES, FRAME, DELAY };
