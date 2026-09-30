'use strict';
// A C64 around the kit's 6502 simulator (cpu6502.js), for checking a port of a whole game against
// the game's own code, pass by pass: the game runs here from its own memory while the port runs
// beside it, and the two are compared (kit/skills/core/70-minisite, "Play"). What is modelled is
// what a game that has banked the KERNAL out usually touches:
// - a PAL raster, 312 lines of 63 cycles, with the raster-compare interrupt ($D012 and bit 7 of
//   $D011, the latch $D019 and the enable $D01A) taken through the vector at $FFFE when the
//   processor allows it, and $D011/$D012 reading the current line;
// - CIA 1's keyboard matrix and joystick port 2 ($DC00-$DC03): keys are held as the KERNAL numbers
//   them (row x 8 + column, KEY below), the stick as the port's five bits, active low;
// - colour RAM ($D800-$DBFF, four bits, read with the upper four high);
// - a SID that only records: the last value of each register, and a log of [cycle, register,
//   value] when sidLog is an array.
// The processor port starts as a loader leaves it ($37: BASIC, KERNAL and I/O in); the simulator
// holds no ROM, so the game must bank the ROMs out itself (most do, with $01 = $35) or a hook must
// stand in for what it calls. Checked by kit/c64/test_machine.js.
// - joystick port 1 (joy1, the port's five bits, active low), which pulls CIA 1's port B ($DC01)
//   low as it does on the machine, keys or no keys.
// - With cia: true, the CIAs' timers: timers A and B of both CIAs count the processor's cycles
//   (continuous or one-shot, force load, the latches at $DCx4-$DCx7), each underflow sets its bit
//   in the chip's interrupt data ($DC0D/$DD0D, cleared by the read), CIA 1's raise the IRQ and
//   CIA 2's the NMI through the vector at $FFFA when the mask ($DC0D/$DD0D written with bit 7)
//   lets them, and CIA 2's port A ($DD00, the video bank) and its direction ($DD02) read back what
//   was written, the unset inputs high. An underflow is taken on its cycle: the run stops there.
//   Not modelled: counting CNT or timer A's underflows with timer B, the time of day clocks, the
//   serial port, the one-cycle delays of the real chip. Without cia the CIA timers and CIA 2 read 0.
// Not modelled: the VIC-II's timing beyond whole lines (no badlines, no sprite DMA, so a pass runs
// a little faster here than on the machine), the disk and the ROMs (the simulator stops on a ROM
// read; a hook can stand in, or rom: { char } gives the character ROM, read from the emulator's
// own file at run time and never committed). Reads of other VIC registers return what was last
// written.
//
// const { Machine, KEY, loadListing } = require('kit/c64/machine.js');
// const m = new Machine({ ram: loadListing('games/c64/<slug>/listing.json'), pc: 0x1000, passAt: 0x2000 });
// - ram: the 64 KB the game runs in (a Uint8Array(65536), used in place). loadListing rebuilds it
//   from a listing.json's records.
// - pc: where to start (the hand-over address). The interrupt flag starts set, as a loader leaves it.
// - passAt: the address of the main loop's first instruction. Each time the processor reaches it,
//   passes counts one and onPass(machine) runs, the place to set the next pass's input; onPass
//   returning true stops the run with the program counter there, before the pass (runUntilPass).
// - runCycles(n), runFrames(n), runPasses(n), runUntilPass(f): run with the interrupts. frames
//   counts raster line 0.
// - joy, keys (a Set of key numbers), press(k), release(k), releaseAll(): the input, read whenever
//   the game scans.
// - save() and Machine.restore(state): the whole machine as JSON, for tests that start from a
//   moment of play. A state holds the game's memory: it stays in the game's gitignored work/.
// - ioRead and ioWrite may be wrapped by a test to watch the chips (the frame recorder in the
//   minisite skill does, and so does kit/c64/lockstep.js): they see every access in order, with
//   cpu.cycles as the time. The lockstep also calls them on a second Machine that never runs, as
//   a port's chips (its line the lockstep's, its keys and joy the game's), so they use nothing but
//   the chip state and this.line.
const fs = require('fs');
const { CPU } = require('./cpu6502.js');

function loadListing(file) {
  const L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ram = new Uint8Array(65536);
  for (const r of L.records) if (r.b) for (let i = 0; i < r.b.length; i++) ram[r.a + i] = r.b[i];
  return ram;
}

// Key numbers as the KERNAL forms them (row x 8 + column)
const KEY = {
  DEL: 0x00, RETURN: 0x01, RIGHT: 0x02, F7: 0x03, F1: 0x04, F3: 0x05, F5: 0x06, DOWN: 0x07,
  '3': 0x08, W: 0x09, A: 0x0A, '4': 0x0B, Z: 0x0C, S: 0x0D, E: 0x0E, LSHIFT: 0x0F,
  '5': 0x10, R: 0x11, D: 0x12, '6': 0x13, C: 0x14, F: 0x15, T: 0x16, X: 0x17,
  '7': 0x18, Y: 0x19, G: 0x1A, '8': 0x1B, B: 0x1C, H: 0x1D, U: 0x1E, V: 0x1F,
  '9': 0x20, I: 0x21, J: 0x22, '0': 0x23, M: 0x24, K: 0x25, O: 0x26, N: 0x27,
  '+': 0x28, P: 0x29, L: 0x2A, '-': 0x2B, '.': 0x2C, ':': 0x2D, '@': 0x2E, ',': 0x2F,
  '£': 0x30, '*': 0x31, ';': 0x32, HOME: 0x33, RSHIFT: 0x34, '=': 0x35, UP: 0x36, '/': 0x37,
  '1': 0x38, LEFT: 0x39, CTRL: 0x3A, '2': 0x3B, SPACE: 0x3C, CBM: 0x3D, Q: 0x3E, STOP: 0x3F,
};
const LINE = 63, LINES = 312, FRAME = LINE * LINES;

class Machine {
  constructor(opts = {}) {
    if (!opts.ram) throw new Error('Machine: no ram (loadListing gives it from a listing.json)');
    this.ram = opts.ram;
    this.passAt = opts.passAt === undefined ? null : opts.passAt;
    this.vic = new Uint8Array(0x40);
    this.sidw = new Uint8Array(0x20);
    this.sidLog = null;
    this.colour = new Uint8Array(0x400);
    this.pra = 0xFF; this.ddra = 0; this.ddrb = 0;
    this.keys = new Set();
    this.joy = 0x1F;                    // port 2, active low: 1 up, 2 down, 4 left, 8 right, 16 fire
    this.joy1 = 0x1F;                   // port 1, the same bits, on $DC01
    this.cia = opts.cia ? [0, 1].map(() => ({ lat: [0xFFFF, 0xFFFF], cnt: [0xFFFF, 0xFFFF], cr: [0, 0], mask: 0, icr: 0 })) : null;
    this.pra2 = 0x3F; this.ddra2 = 0x3F; this.nmis = 0;
    this.cmp = 0; this.latch = 0; this.enable = 0;
    this.lastLine = 0;
    this.passes = 0;
    this.onPass = null;
    this.frames = 0;
    const self = this;
    this.cpu = new CPU(this.ram, {
      port: opts.port || { dir: 0x2F, data: 0x37 },
      io: { read: a => self.ioRead(a), write: (a, v) => self.ioWrite(a, v) },
      rom: opts.rom,
    });
    this.lastCycles = 0;
    this.cpu.pc = opts.pc === undefined ? 0 : opts.pc;
    this.cpu.i = 1;
    this.skipOnce = false;              // resuming at passAt after a stop there: not counted twice
    this.hooks = {};
    if (this.passAt !== null) this.hooks[this.passAt] = () => {
      if (self.skipOnce) { self.skipOnce = false; return false; }
      self.passes++;
      if (self.onPass && self.onPass(self) === true) { self.skipOnce = true; self.stopFlag = true; return true; }
      return false;
    };
  }
  get line() { return Math.floor(this.cpu.cycles / LINE) % LINES; }
  ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = this.line;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (this.vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) return this.latch | 0x70 | ((this.latch & this.enable) ? 0x80 : 0);
      if (r === 0x1A) return this.enable | 0xF0;
      return this.vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return 0;
    if (a >= 0xD800 && a < 0xDC00) return this.colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) return (this.ddra ? (this.pra | ~this.ddra) & 0xFF : 0xE0 | this.joy) & (0xE0 | this.joy);
      if (r === 1) {
        let v = 0xFF;
        const rows = this.ddra ? this.pra & this.ddra : 0xFF;
        for (const k of this.keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        return v & (0xE0 | this.joy1) & 0xFF;
      }
      if (r === 2) return this.ddra;
      if (r === 3) return this.ddrb;
      return this.cia ? this.ciaTimerRead(0, r) : 0;
    }
    if (a >= 0xDD00 && a < 0xDE00 && this.cia) {
      const r = a & 15;
      if (r === 0) return (this.pra2 | ~this.ddra2) & 0xFF;
      if (r === 2) return this.ddra2;
      return this.ciaTimerRead(1, r);
    }
    return 0;
  }
  ciaTimerRead(n, r) {
    this.ciaCatchUp();
    const c = this.cia[n];
    if (r >= 4 && r <= 7) { const t = (r - 4) >> 1; return r & 1 ? c.cnt[t] >> 8 : c.cnt[t] & 255; }
    if (r === 13) { const v = c.icr | ((c.icr & c.mask) ? 0x80 : 0); c.icr = 0; return v; }
    if (r === 14 || r === 15) return c.cr[r - 14];
    return 0;
  }
  ciaTimerWrite(n, r, v) {
    this.ciaCatchUp();
    const c = this.cia[n];
    if (r >= 4 && r <= 7) {
      const t = (r - 4) >> 1;
      c.lat[t] = r & 1 ? (c.lat[t] & 255) | (v << 8) : (c.lat[t] & 0xFF00) | v;
      if ((r & 1) && !(c.cr[t] & 1)) c.cnt[t] = c.lat[t];       // a stopped timer loads on the high byte
    } else if (r === 13) { if (v & 0x80) c.mask |= v & 0x1F; else c.mask &= ~v & 0x1F; }
    else if (r === 14 || r === 15) { const t = r - 14; if (v & 0x10) c.cnt[t] = c.lat[t]; c.cr[t] = v & 0xEF; }
  }
  // Moves the timers on to the processor's cycle count, raising what their underflows raise.
  ciaCatchUp() {
    const now = this.cpu.cycles; let dt = now - this.lastCycles; this.lastCycles = now;
    if (!this.cia || dt <= 0) return;
    for (let n = 0; n < 2; n++) {
      const c = this.cia[n];
      for (let t = 0; t < 2; t++) {
        if (!(c.cr[t] & 1)) continue;
        let left = dt;
        while (left > 0) {
          if (c.cnt[t] >= left) { c.cnt[t] -= left; break; }
          left -= c.cnt[t] + 1; c.cnt[t] = c.lat[t]; c.icr |= 1 << t;
          if (n === 1 && (c.mask & (1 << t))) this.nmiDue = true;
          if (c.cr[t] & 8) { c.cr[t] &= ~1; break; }
        }
      }
    }
  }
  // Cycles until the next timer underflow, or Infinity.
  ciaNext() {
    let best = Infinity;
    if (this.cia) for (const c of this.cia) for (let t = 0; t < 2; t++) if (c.cr[t] & 1) best = Math.min(best, c.cnt[t] + 1);
    return best;
  }
  ioWrite(a, v) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12) this.cmp = (this.cmp & 0x100) | v;
      else if (r === 0x11) { this.cmp = (this.cmp & 0xFF) | ((v & 0x80) << 1); this.vic[r] = v; }
      else if (r === 0x19) this.latch &= ~v & 0x0F;
      else if (r === 0x1A) this.enable = v & 0x0F;
      else this.vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) { this.sidw[a & 0x1F] = v; if (this.sidLog) this.sidLog.push([this.cpu.cycles, a & 0x1F, v]); return; }
    if (a >= 0xD800 && a < 0xDC00) { this.colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) this.pra = v; else if (r === 2) this.ddra = v; else if (r === 3) this.ddrb = v;
      else if (this.cia) this.ciaTimerWrite(0, r, v);
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00 && this.cia) {
      const r = a & 15;
      if (r === 0) this.pra2 = v; else if (r === 2) this.ddra2 = v; else this.ciaTimerWrite(1, r, v);
    }
  }
  // Run for n cycles, the raster interrupts included. False when onPass stopped the run.
  runCycles(n) {
    const cpu = this.cpu, end = cpu.cycles + n;
    while (cpu.cycles < end) {
      let step = LINE - (cpu.cycles % LINE);
      if (this.cia) { this.ciaCatchUp(); step = Math.max(1, Math.min(step, this.ciaNext())); }
      cpu.run({ cycles: step, hooks: this.hooks });
      if (this.stopFlag) { this.stopFlag = false; return false; }
      this.tick();
    }
    return true;
  }
  tick() {
    const ln = Math.floor(this.cpu.cycles / LINE);
    while (this.lastLine < ln) {
      this.lastLine++;
      const l = this.lastLine % LINES;
      if (l === 0) this.frames++;
      if (l === this.cmp) this.latch |= 1;
    }
    if (this.cia) {
      this.ciaCatchUp();
      if (this.nmiDue) { this.nmiDue = false; this.nmis++; this.cpu.nmi(null, { hooks: this.hooks }); }
      const c = this.cia[0];
      if ((c.icr & c.mask) && !this.cpu.i) { this.cpu.irq(null, { hooks: this.hooks }); return; }
    }
    if ((this.latch & this.enable & 1) && !this.cpu.i) this.cpu.irq(null, { hooks: this.hooks });
  }
  runFrames(n) { return this.runCycles(n * FRAME); }
  // Run until f(machine) is true at a main-loop pass: stops with the program counter at passAt,
  // before the pass (its input already set by any onPass). False at the frame limit.
  runUntilPass(f, maxFrames = 100000) {
    if (this.passAt === null) throw new Error('Machine: runUntilPass needs passAt');
    let hit = false;
    const prev = this.onPass;
    this.onPass = m => { if (prev) prev(m); if (f(m)) { hit = true; return true; } return false; };
    const end = this.frames + maxFrames;
    while (!hit && this.frames < end) this.runCycles(FRAME);
    this.onPass = prev;
    return hit;
  }
  runPasses(n, maxFrames = 100000) { const target = this.passes + n; return this.runUntilPass(m => m.passes >= target, maxFrames); }
  press(k) { this.keys.add(typeof k === 'string' ? KEY[k] : k); }
  release(k) { this.keys.delete(typeof k === 'string' ? KEY[k] : k); }
  releaseAll() { this.keys.clear(); }
  save() {
    const c = this.cpu;
    return { ram: Buffer.from(this.ram).toString('base64'), vic: Array.from(this.vic), sidw: Array.from(this.sidw), colour: Buffer.from(this.colour).toString('base64'),
      cpu: { a: c.a, x: c.x, y: c.y, sp: c.sp, pc: c.pc, p: c.p, cycles: c.cycles, pdir: c.pdir, pdata: c.pdata, pout: c.pout },
      cmp: this.cmp, latch: this.latch, enable: this.enable, lastLine: this.lastLine, frames: this.frames, passes: this.passes,
      pra: this.pra, ddra: this.ddra, ddrb: this.ddrb, skipOnce: this.skipOnce, joy: this.joy, keys: Array.from(this.keys), passAt: this.passAt,
      joy1: this.joy1, cia: this.cia ? JSON.parse(JSON.stringify(this.cia)) : null, pra2: this.pra2, ddra2: this.ddra2, lastCycles: this.lastCycles, nmiDue: !!this.nmiDue };
  }
  static restore(s, opts = {}) {
    const m = new Machine({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), passAt: opts.passAt !== undefined ? opts.passAt : s.passAt,
      cia: !!s.cia, rom: opts.rom });
    const c = m.cpu;
    Object.assign(c, { a: s.cpu.a, x: s.cpu.x, y: s.cpu.y, sp: s.cpu.sp, pc: s.cpu.pc, cycles: s.cpu.cycles });
    c.p = s.cpu.p; c.pdir = s.cpu.pdir; c.pdata = s.cpu.pdata; c.pout = s.cpu.pout; c.mapPort();
    m.vic.set(s.vic); if (s.sidw) m.sidw.set(s.sidw); m.colour.set(Buffer.from(s.colour, 'base64'));
    Object.assign(m, { cmp: s.cmp, latch: s.latch, enable: s.enable, lastLine: s.lastLine, frames: s.frames, passes: s.passes, pra: s.pra, ddra: s.ddra, ddrb: s.ddrb,
      skipOnce: !!s.skipOnce, joy: s.joy === undefined ? 0x1F : s.joy, keys: new Set(s.keys || []) });
    if (s.joy1 !== undefined) m.joy1 = s.joy1;
    if (s.cia) Object.assign(m, { cia: s.cia, pra2: s.pra2, ddra2: s.ddra2, lastCycles: s.lastCycles, nmiDue: s.nmiDue });
    else m.lastCycles = c.cycles;
    return m;
  }
}

module.exports = { Machine, KEY, loadListing, LINE, LINES, FRAME };
