'use strict';
// A C64 around the kit's 6502 simulator (cpu6502.js), for checking a port of a whole game against
// the game's own code, pass by pass: the game runs here from its own memory while the port runs
// beside it, and the two are compared (kit/skills/core/70-minisite, "Play"). What is modelled is
// what a game that has banked the KERNAL out usually touches:
// - a PAL raster, 312 lines of 63 cycles, with the raster-compare interrupt ($D012 and bit 7 of
//   $D011, the latch $D019 and the enable $D01A) taken through the vector at $FFFE when the
//   processor allows it, and $D011/$D012 reading the current line. The IRQ line is a level, held
//   while a source has not been acknowledged (the interrupts, below);
// - CIA 1's keyboard matrix and joystick port 2 ($DC00-$DC03): keys are held as the KERNAL numbers
//   them (row x 8 + column, KEY below), the stick as the port's five bits, active low. Port A starts
//   as the KERNAL leaves it, not as at power-on: $DC02 $FF (all outputs) and $DC00 $7F (row 7 low),
//   read in VICE at the READY prompt (17 October 2026), so a game that writes a row to $DC00 and
//   never sets $DC02 reads its keys here as it does on the machine;
// - colour RAM ($D800-$DBFF, four bits, read with the upper four high);
// - a SID that records: the last value of each register, and a log of [cycle, register, value]
//   when sidLog is an array. A read of a register the chip does not answer returns the data bus,
//   the last value written to any register, fading as VICE's does (site/lib/sid.js, createBus;
//   the option sid below), not the register's last value; $D419 and $D41A read $FF, no
//   paddles, and $D41B and $D41C read 0: the voices are not modelled.
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
//   The serial port as output (control register A's bit 6): a write to the data register
//   ($DC0C/$DD0C) shifts a byte out over 16 of timer A's underflows (8 bits, two underflows a
//   bit), a second write while one shifts follows it, and the end of each byte sets bit 3 of the
//   interrupt data, which interrupts as the timers' bits do (a copy-protection check reads it: the
//   LAX at $0100 in games/c64/green-beret).
//   Not modelled: counting CNT or timer A's underflows with timer B, the time of day clocks, the
//   serial port as input, the one-cycle delays of the real chip. Without cia the CIA timers and
//   CIA 2 read 0. Underflows that raise no interrupt are worked out when the chip is next read.
// - With dma: true, the cycles the video chip takes from the processor (kit/skills/c64/c64-reference,
//   "The video chip, cycle by cycle"): on a bad line, a line from 48 to 247 whose low three bits
//   are $D011's vertical scroll in a frame whose line 48 saw $D011's display bit set, cycles 12-54;
//   on each of the 21 lines a sprite is fetched (42 Y-expanded), from the line its Y matches while
//   $D015 enables it, cycles 55 + 2n to 59 + 2n for sprite n, past 63 into the next line. The
//   processor stands still from where it is when one of those starts to the end of it: every
//   cycle is taken as a read, so a store whose write falls on a bad line's cycle 12, which the
//   machine lets go ahead, is held a cycle more here than there. The chip's registers are read
//   at cycle 12 and cycle 55 of each line. They are taken as the program runs, an interrupt's
//   handler with the rest; with legacyInterrupts (below), where a handler runs whole, those taken
//   while it ran are added when it returns, from the registers as it left them.
//   Checked against the emulator by kit/c64/test_machine_dma.js (kit/c64/fixtures/vic-dma.json).
//   Without dma the processor has every cycle, and a pass runs faster here than on the machine.
// - With collide: true, the sprite collisions: $D01E and $D01F as the video chip sets them while
//   the beam draws (site/lib/collide.js, checked against VICE by kit/c64/test_machine_collide.js),
//   each read clearing its register. The beam is worked out to the processor's cycle at each read
//   of them and each write to the chip or to $DD00 and $DD02 (which pick the video bank, kept with
//   collide whether or not cia is on), and at each line, from memory as it stands then. The
//   character ROM the chip sees at $1000-$1FFF of banks 0 and 2 is rom.char when given; without it
//   those bytes read 0, collide nothing, and are counted in collideRomReads. A collision that sets
//   a bit in a register that was 0 sets the latch's bit for it ($D019 bit 2 for $D01E, bit 1 for
//   $D01F), which interrupts when $D01A enables it; one while the register holds a bit raises
//   nothing, so a program that never reads the register is interrupted once (collide.js's
//   C.irq). The latch is looked at every eight cycles, and a handler is interrupted as often as in
//   VICE with its read within four cycles of where it falls (kit/c64/fixtures/vic-collide-irq.json).
//   Without collide the two registers read what was last written to them and raise no interrupt.
// - Interrupts are taken as the processor takes them: between two instructions, while I is clear
//   and a source holds the line, with its seven cycles, the program counter and flags pushed, I set
//   and the vector followed. The handler runs on with the rest of the program, so one that clears I
//   (CLI) is interrupted in turn by the next interrupt due, and one that returns with the line still
//   held is interrupted again straight after its RTI. A CLI, or a PLP that clears I, lets a waiting
//   interrupt in after the next instruction; a read of $D01E or $D01F and a write to $D01A or to a
//   CIA's timer end the run there, so that what they raise comes on its cycle. Checked against VICE
//   by kit/c64/test_machine_nest.js (kit/c64/fixtures/vic-nest.json) and test_machine_held_irq.js.
//   While the KERNAL is banked in (and no rom.kernal given) an interrupt comes through the KERNAL's
//   entry, as cpu6502.js's kernal option has it: $FF48 pushes A, X and Y and jumps through $0314,
//   $FE43 through $0318; and its exits at $EA31, $EA81 and $FEBC pull them back and return
//   (leave(cycles), 22 by default), unless the game's own hooks stand there. onInterrupt(machine,
//   vector) runs as each is taken, onReturn(machine, vector, cycles) as each returns, and depth
//   counts those under way.
// - With legacyInterrupts: true, the kit's model before #525 and #556, kept for a recording made
//   on its timing: a handler runs whole (cpu6502.js's irq and nmi), and an interrupt that falls due
//   while one runs is taken after its RTI; a collision it raises meanwhile may be cleared by the
//   handler's own read of $D01E or $D01F first, and so never be latched.
// Not modelled: the VIC-II's timing beyond that and whole lines, the disk and the ROMs (the
// simulator stops on a ROM read; a hook can stand in, or rom: { char } gives the character ROM,
// read from the emulator's own file at run time and never committed). Reads of other VIC
// registers return what was last written.
//
// const { Machine, KEY, loadListing } = require('kit/c64/machine.js');
// const m = new Machine({ ram: loadListing('games/c64/<slug>/listing.json'), pc: 0x1000, passAt: 0x2000 });
// - ram: the 64 KB the game runs in (a Uint8Array(65536), used in place). loadListing rebuilds it
//   from a listing.json's records.
// - pc: where to start (the hand-over address). The interrupt flag starts set, as a loader leaves it.
// - port: the processor port, { dir, data } (default $2F and $37).
// - vic: the video chip's state, { regs, irq }, as readSnapshot (cpu6502.js) gives it: the 64
//   registers as last written, from which the raster compare line ($D011's bit 7 and $D012) and
//   the interrupt enable ($D01A) are taken, and the interrupts latched ($D019). Without it the
//   compare line is 0 and the raster interrupt is off until the game sets them.
// - Machine.fromSnapshot(vsf, opts): the machine as an x64sc snapshot left it, for a start in the
//   middle of play: the RAM, the port, the processor's registers and the video chip, its raster
//   interrupt included, and the colour RAM when the file's VIC-IISC module is format 1.4
//   (readSnapshot's colour). The raster starts at line 0, wherever the snapshot's was, and the
//   CIAs start as new Machine starts them: the snapshot's are not read.
//   opts as for new Machine, but ram, port, pc and vic come from the file.
// - passAt: the address of the main loop's first instruction. Each time the processor reaches it,
//   passes counts one and onPass(machine) runs, the place to set the next pass's input; onPass
//   returning true stops the run with the program counter there, before the pass (runUntilPass).
// - collide: true, the sprite collisions in $D01E and $D01F (above).
// - legacyInterrupts: true, the interrupts as the kit took them before (above).
// - sid: '6581' or '8580', the chip whose bus fade the SID's reads follow. The default is the
//   8580, the chip the kit's emulator starts with (v3.13.2; its SidModel resource).
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
//   the chip state, this.line and this.now (the SID's clock: there, the game's cycles).
const fs = require('fs');
const path = require('path');
const { CPU, readSnapshot } = require('../cpu/cpu6502.js');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
require(path.join(__dirname, '..', '..', 'site', 'lib', 'collide.js'));
const { createBus } = globalThis.C64Sid.engine();

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
    this.sidChip = opts.sid || '8580';
    this.sidBus = createBus(this.sidChip);
    this.colour = new Uint8Array(0x400);
    this.pra = 0x7F; this.ddra = 0xFF; this.ddrb = 0;   // CIA 1's ports as the KERNAL leaves them
    this.keys = new Set();
    this.joy = 0x1F;                    // port 2, active low: 1 up, 2 down, 4 left, 8 right, 16 fire
    this.joy1 = 0x1F;                   // port 1, the same bits, on $DC01
    this.cia = opts.cia ? [0, 1].map(() => ({ lat: [0xFFFF, 0xFFFF], cnt: [0xFFFF, 0xFFFF], cr: [0, 0], mask: 0, icr: 0 })) : null;
    this.pra2 = 0x3F; this.ddra2 = 0x3F; this.nmis = 0;
    this.nest = !opts.legacyInterrupts;
    // the video chip's fetches (dma): the cycle of the next look at its registers (-1 until the
    // first), the stretches it holds the processor that have not yet come, as [first, last]
    // cycles, whether this frame's line 48 saw the display on, and each sprite's lines to fetch
    this.dma = opts.dma ? { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] } : null;
    this.cmp = 0; this.latch = 0; this.enable = 0;
    this.charRom = opts.rom && opts.rom.char ? opts.rom.char : null;
    this.collideRomReads = 0;
    this.collide = opts.collide ? globalThis.C64Collide.create(this.vic, a => this.vmem(a), i => this.colour[i]) : null;
    if (opts.vic) {
      const r = opts.vic.regs;
      this.vic.set(r);
      this.cmp = r[0x12] | ((r[0x11] & 0x80) << 1);
      this.enable = r[0x1A] & 0x0F;
      this.latch = opts.vic.irq & 0x0F;
    }
    this.lastLine = 0;
    this.passes = 0;
    this.onPass = null;
    this.frames = 0;
    this.depth = 0;                     // the interrupts under way (onInterrupt and onReturn, above)
    this.under = [];                    // each one's start, and its stack once its take has pushed
    this.onInterrupt = null; this.onReturn = null;
    const self = this;
    this.cpu = new CPU(this.ram, {
      port: opts.port || { dir: 0x2F, data: 0x37 },
      io: { read: a => self.ioRead(a), write: (a, v) => self.ioWrite(a, v) },
      rom: opts.rom,
    });
    this.lastCycles = 0;
    if (this.nest) {
      this.cpu.onRti = () => { self.returned(); self.tick(); };   // a source still held interrupts the RTI's next instruction
      this.cpu.onCli = c => { if (c.cut !== 1) c.cut = 2; };   // one waiting comes in after the next one
    }
    this.cpu.pc = opts.pc === undefined ? 0 : opts.pc;
    this.cpu.i = 1;
    if (this.collide) this.collide.at(this.cpu.cycles);
    this.skipOnce = false;              // resuming at passAt after a stop there: not counted twice
    this.hooks = {};
    if (this.passAt !== null) this.hooks[this.passAt] = () => {
      if (self.skipOnce) { self.skipOnce = false; return false; }
      self.passes++;
      if (self.onPass && self.onPass(self) === true) { self.skipOnce = true; self.stopFlag = true; return true; }
      return false;
    };
  }
  static fromSnapshot(file, opts = {}) {
    const s = readSnapshot(file);
    if (s.exrom || s.game) {
      throw new Error(file + ': a cartridge holds the EXROM or GAME line, and the simulator has no cartridge map');
    }
    if (!s.regs || !s.vic) {
      throw new Error(file + ': no ' + (s.regs ? 'VIC-IISC' : 'MAINC64CPU') + ' module: save the snapshot from x64sc');
    }
    const m = new Machine(Object.assign({}, opts, { ram: s.ram, port: s.port, pc: s.regs.pc, vic: s.vic }));
    m.cpu.setRegs(s.regs);
    if (s.colour) m.colour.set(s.colour);
    return m;
  }
  get line() { return Math.floor(this.cpu.cycles / LINE) % LINES; }
  get now() { return this.cpu.cycles; }      // the chips' clock
  // The byte the video chip reads at a (14 bits) in the bank CIA 2's port A picks.
  vmem(a) {
    const bank = 3 - ((this.pra2 | ~this.ddra2) & 3);
    if (!(bank & 1) && a >= 0x1000 && a < 0x2000) {
      if (this.charRom) return this.charRom[a & 0xFFF];
      this.collideRomReads++;
      return 0;
    }
    return this.ram[bank << 14 | a];
  }
  ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = this.line;
      // a read is made in the instruction's last cycle, the one before the count it leaves
      if (this.collide && (r === 0x1E || r === 0x1F)) { this.soon(); return this.collide.read(r, this.cpu.cycles - 1); }
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (this.vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) return this.latch | 0x70 | ((this.latch & this.enable) ? 0x80 : 0);
      if (r === 0x1A) return this.enable | 0xF0;
      return this.vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return this.sidBus.read(a & 0x1F, this.now, 0);
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
    this.soon();
    const c = this.cia[n];
    if (r >= 4 && r <= 7) {
      const t = (r - 4) >> 1;
      c.lat[t] = r & 1 ? (c.lat[t] & 255) | (v << 8) : (c.lat[t] & 0xFF00) | v;
      if ((r & 1) && !(c.cr[t] & 1)) c.cnt[t] = c.lat[t];       // a stopped timer loads on the high byte
    } else if (r === 12) { if (c.cr[0] & 0x40) { if (c.sp) c.spNext = true; else c.sp = 16; } }
    else if (r === 13) { if (v & 0x80) c.mask |= v & 0x1F; else c.mask &= ~v & 0x1F; }
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
          if (t === 0 && c.sp && (c.cr[0] & 0x40) && --c.sp === 0) {   // a byte shifted out
            c.icr |= 8;
            if (n === 1 && (c.mask & 8)) this.nmiDue = true;
            if (c.spNext) { c.spNext = false; c.sp = 16; }
          }
          if (c.cr[t] & 8) { c.cr[t] &= ~1; break; }
        }
      }
    }
  }
  // Cycles until the next timer underflow that raises an interrupt, or Infinity: the others are
  // worked out when the chip is read (ciaCatchUp), so a fast timer nobody listens to (a serial
  // port's clock) does not cut the run into steps of a few cycles.
  ciaNext() {
    let best = Infinity;
    if (this.cia) for (const c of this.cia) {
      for (let t = 0; t < 2; t++) if ((c.cr[t] & 1) && (c.mask & (1 << t))) best = Math.min(best, c.cnt[t] + 1);
      if ((c.cr[0] & 0x41) === 0x41 && c.sp && (c.mask & 8)) best = Math.min(best, c.cnt[0] + 1 + (c.sp - 1) * (c.lat[0] + 1));
    }
    return best;
  }
  ioWrite(a, v) {
    if (this.collide && ((a >= 0xD000 && a < 0xD400) || a === 0xDD00 || a === 0xDD02)) this.collide.to(this.cpu.cycles);
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12) this.cmp = (this.cmp & 0x100) | v;
      else if (r === 0x11) {
        this.cmp = (this.cmp & 0xFF) | ((v & 0x80) << 1); this.vic[r] = v;
        if (this.dma && (v & 0x10) && this.line === 48) this.dma.bad = true;   // any cycle of line 48
      }
      else if (r === 0x19) this.latch &= ~v & 0x0F;
      else if (r === 0x1A) { this.enable = v & 0x0F; this.soon(); }
      else this.vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) { this.sidw[a & 0x1F] = v; this.sidBus.write(v, this.now); if (this.sidLog) this.sidLog.push([this.cpu.cycles, a & 0x1F, v]); return; }
    if (a >= 0xD800 && a < 0xDC00) { this.colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) this.pra = v; else if (r === 2) this.ddra = v; else if (r === 3) this.ddrb = v;
      else if (this.cia) this.ciaTimerWrite(0, r, v);
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00 && (this.cia || this.collide)) {
      const r = a & 15;
      if (r === 0) this.pra2 = v; else if (r === 2) this.ddra2 = v; else if (this.cia) this.ciaTimerWrite(1, r, v);
    }
  }
  // The video chip's next look at its registers or next hold on the processor, as a cycle.
  dmaNext() {
    const d = this.dma;
    if (d.at < 0) {                                 // the first look: the display taken as on since line 48 if on now
      const c = this.cpu.cycles, o = c % LINE;
      d.at = c - o + (o <= 11 ? 11 : o <= 54 ? 54 : LINE + 11);
      d.bad = (this.vic[0x11] & 0x10) !== 0;
    }
    return d.holds.length ? Math.min(d.at, d.holds[0][0]) : d.at;
  }
  // Moves the processor's clock on past every hold that has begun by now, and looks at the
  // registers wherever the clock has passed a line's cycle 12 or 55, in the order they came.
  dmaCatchUp() {
    const d = this.dma, cpu = this.cpu;
    for (;;) {
      const next = this.dmaNext();
      if (next > cpu.cycles) return;
      if (d.holds.length && d.holds[0][0] === next) {
        const [first, last] = d.holds.shift();
        cpu.cycles += last - first + 1;             // held from where it was, as if reading
        continue;
      }
      const ls = d.at - d.at % LINE, ln = (ls / LINE) % LINES;
      if (d.at % LINE === 11) {                     // cycle 12: a bad line
        if (ln === 0) d.bad = false;
        if (ln === 48 && (this.vic[0x11] & 0x10)) d.bad = true;
        if (d.bad && ln >= 48 && ln <= 247 && (ln & 7) === (this.vic[0x11] & 7)) d.holds.push([ls + 11, ls + 53]);
        d.at = ls + 54;
      } else {                                      // cycle 55: the sprites, 3 cycles before each fetch
        let hold = null;
        for (let n = 0; n < 8; n++) {
          if (!d.rows[n] && (this.vic[0x15] >> n & 1) && this.vic[1 + 2 * n] === (ln & 255)) d.rows[n] = this.vic[0x17] >> n & 1 ? 42 : 21;
          if (!d.rows[n]) continue;
          d.rows[n]--;
          const first = ls + 54 + 2 * n, last = first + 4;
          if (hold && first <= hold[1]) hold[1] = last;
          else { if (hold) d.holds.push(hold); hold = [first, last]; }
        }
        if (hold) d.holds.push(hold);
        d.at = ls + LINE + 11;
      }
    }
  }
  // Run for n cycles, the raster interrupts included. False when onPass stopped the run.
  runCycles(n) {
    const cpu = this.cpu, end = cpu.cycles + n;
    if (this.nest) this.tick();         // one held as the run begins (a restored machine, I cleared from outside) comes first
    while (cpu.cycles < end) {
      if (this.dma && this.dmaNext() <= cpu.cycles) { this.tick(); continue; }   // an interrupt ran past a hold
      let step = LINE - (cpu.cycles % LINE);
      if (this.cia) { this.ciaCatchUp(); step = Math.max(1, Math.min(step, this.ciaNext())); }
      if (this.dma) step = Math.max(1, Math.min(step, this.dmaNext() - cpu.cycles));
      // a collision's interrupt is looked for every eight cycles while one could be raised
      if (this.collide && this.enable & this.collide.armed()) step = Math.min(step, 8);
      cpu.run({ cycles: step, hooks: this.hooks });
      if (this.stopFlag) { this.stopFlag = false; return false; }
      this.tick();
    }
    return true;
  }
  // The chips brought up to the processor's cycle, and an interrupt they hold taken. The IRQ line is
  // a level: a handler that returns while CIA 1 or the video chip still holds it (a source it has
  // not acknowledged) is interrupted again at once, as the processor does straight after the RTI,
  // so the main program runs no instruction in between (the CPU's onRti comes back here).
  tick() {
    if (this.dma) this.dmaCatchUp();
    if (this.collide) this.latch |= this.collide.irq(this.cpu.cycles - 1);
    const ln = Math.floor(this.cpu.cycles / LINE);
    while (this.lastLine < ln) {
      this.lastLine++;
      const l = this.lastLine % LINES;
      if (l === 0) this.frames++;
      if (l === this.cmp) this.latch |= 1;
    }
    if (this.cia) {
      this.ciaCatchUp();
      if (this.nmiDue) { this.nmiDue = false; this.nmis++; this.take(0xFFFA); }
      const c = this.cia[0];
      if ((c.icr & c.mask) && !this.cpu.i) { this.take(0xFFFE); return; }
    }
    if ((this.latch & this.enable & 0x0F) && !this.cpu.i) this.take(0xFFFE);
  }
  // A chip changed so that an interrupt may come before the run's end: the run stops after this
  // instruction and the chips are looked at again (the CPU's cut).
  soon() { if (this.nest) this.cpu.cut = 1; }
  // An interrupt through the vector at v: begun, its handler run on with the program (with
  // legacyInterrupts, run whole)
  take(v) {
    const c = this.cpu, c0 = c.cycles;
    this.returned();
    if (this.onInterrupt) this.onInterrupt(this, v);
    this.depth++;
    if (!this.nest) {
      try { return v === 0xFFFA ? c.nmi(null, { hooks: this.hooks }) : c.irq(null, { hooks: this.hooks }); }
      finally { this.depth--; if (this.onReturn) this.onReturn(this, v, c.cycles - c0); }
    }
    c.push(c.pc >> 8); c.push(c.pc & 0xFF); c.push(c.p & ~0x10);
    c.i = 1; c.cycles += 7;
    const sp = c.sp;
    if (this.throughKernal()) {
      // the KERNAL's entry, as cpu6502's irq and nmi with kernal stand in for it: $FF48 (PHA TXA
      // PHA TYA PHA TSX LDA $0104,X AND #$10 BEQ; JMP ($0314)) or $FE43 (SEI; JMP ($0318)); and its
      // exits as hooks, where a game has none of its own (which stands in for what the ROM does
      // there first, then calls leave)
      for (const a of [0xEA31, 0xEA81, 0xFEBC]) if (!(a in this.hooks)) this.hooks[a] = () => { if (this.throughKernal()) this.leave(); return false; };
      if (v === 0xFFFE) {
        c.push(c.a); c.push(c.x); c.push(c.y);
        c.x = c.sp; c.a = 0; c.n = 0; c.z = 1; c.cycles += c.sp >= 0xFC ? 30 : 29;
        c.pc = c.word(0x0314);
      } else { c.cycles += 7; c.pc = c.word(0x0318); }
    } else c.pc = c.vector(v, v === 0xFFFA ? 'NMI' : 'IRQ');
    this.under.push({ v, sp, at: c0 });
  }
  // The KERNAL banked in at $E000-$FFFF, its ROM not given: an interrupt comes in through the
  // KERNAL's entry, and leaves by its exit (leave)
  throughKernal() { const c = this.cpu; return c.rk[0xFF] !== c.rk[0x02] && c.rom.kernal === undefined; }
  // The KERNAL's exit from an interrupt, $EA81 and $FEBC (PLA TAY PLA TAX PLA RTI), for a hook at it
  // or at $EA31, whose keyboard scan and clock a game's hook stands in for first: its cycles, the
  // RTI's among them, and what any RTI starts (onRti)
  leave(cycles = 22) {
    const c = this.cpu;
    c.y = c.pull(); c.x = c.pull(); c.a = c.pull(); c.rti(); c.cycles += cycles;
    if (this.nest) { this.returned(); this.tick(); }
  }
  // The interrupts the stack has left: returned from (the RTI that pulled their frame), or left by
  // a handler that reset the stack above its frame and went on elsewhere
  returned() {
    const c = this.cpu, u = this.under;
    while (u.length && u[u.length - 1].sp < c.sp) {
      const q = u.pop();
      this.depth--;
      if (this.onReturn) this.onReturn(this, q.v, c.cycles - q.at);
    }
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
    return { ram: Buffer.from(this.ram).toString('base64'), vic: Array.from(this.vic), sidw: Array.from(this.sidw),
      sid: this.sidChip, sidBus: this.sidBus.save(), colour: Buffer.from(this.colour).toString('base64'),
      cpu: { a: c.a, x: c.x, y: c.y, sp: c.sp, pc: c.pc, p: c.p, cycles: c.cycles, pdir: c.pdir, pdata: c.pdata, pout: c.pout },
      cmp: this.cmp, latch: this.latch, enable: this.enable, lastLine: this.lastLine, frames: this.frames, passes: this.passes,
      pra: this.pra, ddra: this.ddra, ddrb: this.ddrb, skipOnce: this.skipOnce, joy: this.joy, keys: Array.from(this.keys), passAt: this.passAt,
      joy1: this.joy1, cia: this.cia ? JSON.parse(JSON.stringify(this.cia)) : null, pra2: this.pra2, ddra2: this.ddra2, lastCycles: this.lastCycles, nmiDue: !!this.nmiDue,
      dma: this.dma ? JSON.parse(JSON.stringify(this.dma)) : null, collide: this.collide ? this.collide.save() : null, legacyInterrupts: !this.nest,
      under: this.under.map(q => Object.assign({}, q)) };
  }
  // opts.dma turns the video chip's fetches on or off for the restored machine (default: as saved).
  static restore(s, opts = {}) {
    const dma = opts.dma !== undefined ? !!opts.dma : !!s.dma;
    const m = new Machine({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), passAt: opts.passAt !== undefined ? opts.passAt : s.passAt,
      cia: !!s.cia, rom: opts.rom, sid: s.sid, dma, collide: !!s.collide, legacyInterrupts: !!s.legacyInterrupts });
    if (dma && s.dma) m.dma = JSON.parse(JSON.stringify(s.dma));
    const c = m.cpu;
    Object.assign(c, { a: s.cpu.a, x: s.cpu.x, y: s.cpu.y, sp: s.cpu.sp, pc: s.cpu.pc, cycles: s.cpu.cycles });
    c.p = s.cpu.p; c.pdir = s.cpu.pdir; c.pdata = s.cpu.pdata; c.pout = s.cpu.pout; c.mapPort();
    m.vic.set(s.vic); if (s.sidw) m.sidw.set(s.sidw); if (s.sidBus) m.sidBus.load(s.sidBus); m.colour.set(Buffer.from(s.colour, 'base64'));
    Object.assign(m, { cmp: s.cmp, latch: s.latch, enable: s.enable, lastLine: s.lastLine, frames: s.frames, passes: s.passes, pra: s.pra, ddra: s.ddra, ddrb: s.ddrb,
      skipOnce: !!s.skipOnce, joy: s.joy === undefined ? 0x1F : s.joy, keys: new Set(s.keys || []) });
    if (s.joy1 !== undefined) m.joy1 = s.joy1;
    if (s.cia) Object.assign(m, { cia: JSON.parse(JSON.stringify(s.cia)), pra2: s.pra2, ddra2: s.ddra2, lastCycles: s.lastCycles, nmiDue: s.nmiDue });
    else m.lastCycles = c.cycles;
    if (s.collide) { m.pra2 = s.pra2; m.ddra2 = s.ddra2; m.collide.load(s.collide); }
    if (s.under && m.nest) { m.under = s.under.map(q => Object.assign({}, q)); m.depth = m.under.length; }
    return m;
  }
}

module.exports = { Machine, KEY, loadListing, LINE, LINES, FRAME };
