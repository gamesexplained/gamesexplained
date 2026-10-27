'use strict';
// A Commodore 16 around the kit's 6502 simulator (kit/cpu/cpu6502.js), for checking a port of a
// whole game against the game's own code, pass by pass (kit/skills/core/70-minisite, "Play"): the
// game runs here from its own memory while the port runs beside it. What is modelled is what a
// game on the C16 usually touches:
// - 16 KB of RAM, repeated through the 64 KB as the machine repeats it ($4000 is $0000), with the
//   ROMs paged in from $8000 as the KERNAL leaves them; a write there goes to the RAM beneath, and
//   $FF3E and $FF3F page the ROMs in and out. The kit holds no ROM: a read of one returns 0 and is
//   counted in romReads (a game's BIT over two bytes it skips reads the ROM for nothing), unless
//   opts.rom gives the 32 KB the processor sees at $8000-$FFFF with the ROMs in (the emulator's own
//   files, read at run time and never committed). The program counter reaching a ROM or TED stops
//   the run with an error, except for the interrupt's way in (below).
// - TED's beam: 312 lines of 114 ticks of the double clock, and the processor's cycles on each
//   line as TED gives them, the single clock and the screen's fetches included (site/lib/c16.js,
//   C16.timing, measured on plus4emu). The machine's clock is TED's tick: this.tick is the tick of
//   the processor's next cycle, and each instruction's cycles are placed on TED's ticks one by
//   one, so a write goes on into a bad line's hold and a read waits for its end. cpu.cycles counts
//   the processor's own cycles.
// - The raster interrupt ($FF0B with $FF0A's bit 0 as bit 8, the flag $FF09 bit 1, the enable
//   $FF0A bit 1, raised as a line begins or as a write makes the compare line the line the beam is
//   on) and the three timers ($FF00-$FF05, counting at the single clock; timer 1 shows 0 for a
//   count and then the value last written to it less 1, timers 2 and 3 run on through 0; their
//   flags $FF09 bits 3, 4 and 6, interrupting when $FF0A enables them). $FF1D and $FF1C read the
//   line, $FF1E the place on it, and $FF1F's bits 0-2 the line within the character row
//   (C16.timing's charLine), as plus4emu's do. The processor sees TED's interrupt line two
//   cycles late and takes the interrupt in place of the next instruction it starts after that,
//   as the 6502 does: one raised before an instruction's last two cycles is taken after it, one a
//   CLI lets through an instruction later, and one raised just before a SEI still once. An
//   interrupt goes through the KERNAL's way in when the ROMs are paged in ($FFFE is $FCB3: A, X
//   and Y pushed, then JMP ($0314), the KERNAL's 35 cycles placed on the beam and X, A and the
//   flags left as it leaves them), through the vector at $FFFE when they are not.
// - The keyboard and the joysticks ($FD30 and $FF08): keys are held as the KERNAL numbers them
//   (row x 8 + column, KEY below), the sticks as the C64's machine.js keeps them, five bits active
//   low (1 up, 2 down, 4 left, 8 right, 16 fire): joy for port 2, joy1 for port 1. A write to
//   $FF08 latches every line selected at once: the keyboard rows $FD30 selects and the ports the
//   value written selects; reads of $FF08 give the latch (kit/skills/c16/c16-reference, "Keyboard
//   and joysticks").
// - TED's other registers read back what was written, with the bits that read 1 set (the
//   reference's table), and a write to the sound's, $FF0E-$FF12, goes into soundLog when it is an
//   array, as [tick, register, value]: the plus4emu server's sound log has the same rows.
// Not modelled: the drawing (C16.render draws memory), the cursor and flash counters ($FF1F's bits
// 3-6 read as written), $FF1F's line with the display off, the light pen, the serial bus, the
// tape, the ACIA and the 6529 (they read $FF), the 7501's own port at $00
// and $01 (RAM here), writes to TED's line and position counters, a screen fetch started or ended
// by a write to $FF06 in the middle of a line, the single clock forced by $FF13's bit 1, and the
// sound itself. Checked against plus4emu by kit/c16/test_machine.js
// (kit/c16/fixtures/ted-timing.json).
//
// const { Machine, KEY, loadListing } = require('kit/c16/machine.js');
// const m = new Machine({ ram: loadListing('games/c16/<slug>/listing.json'), pc: 0x1800, passAt: 0x1852 });
// - ram: the 64 KB the game is addressed in (a Uint8Array(65536), used in place; the machine reads
//   and writes only its first 16 KB). loadListing rebuilds it from a listing.json's records.
// - pc: where to start. The interrupt flag starts set, as a loader leaves it.
// - ted: TED's 32 registers as last written (default: as the KERNAL leaves them, the reference's
//   IOINIT values). tick: where the beam starts (default 0, line 0's first tick).
// - passAt: the main loop's first instruction. Each time the processor reaches it, outside an
//   interrupt or in one, passes counts one and onPass(machine) runs, the place to set the next
//   pass's input; onPass returning true stops the run there, before the pass (runUntilPass).
// - runTicks(n), runFrames(n), runPasses(n), runUntilPass(f): run with the interrupts. frames
//   counts line 0. line and frame give the beam's place, now the tick.
// - press(k), release(k), releaseAll(), keys (a Set of key numbers), joy and joy1.
// - hooks: { address: fn(cpu) }, run before the instruction there (a stand-in for a KERNAL routine
//   the game calls): returning true stops the run, and moving cpu.pc skips the instruction.
//   spend(n) puts a stand-in's n cycles on the beam. kernalHooks(m) gives the kit's stand-ins:
//   SCNKEY ($FF9F), the keyboard scan a game's interrupt calls, as C16.scnkey (site/lib/c16.js),
//   held to the ROM by kit/c16/test_scnkey.js. Its reads and writes of the chips go through
//   ioRead and ioWrite, all at its first cycle's tick, and of the RAM through the processor, so a
//   lockstep sees them; its cycles are the ROM's, and it leaves A, X and Y as the ROM does, the
//   flags not.
// - onIrq(machine, entry) and onRti(machine) are called as an interrupt is taken (entry is the
//   handler's address; irqStart, cpu.cycles as it began) and as the RTI that ends one runs; depth
//   counts the interrupts in progress. kit/c16/lockstep.js uses them.
// - ioRead and ioWrite may be wrapped by a test to watch the chips: they see every access in
//   order, with this.now the tick of the access.
// - save() and Machine.restore(state): the whole machine as JSON, for tests that start from a
//   moment of play. A state holds the game's memory: it stays in the game's gitignored work/.
const fs = require('fs');
const path = require('path');
const { CPU, OPCODES, CYCLES } = require('../cpu/cpu6502.js');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'c16.js'));
const { LINE, LINES, FRAME, Beam } = globalThis.C16.timing;
const { READ_ONES, latch } = globalThis.C16;      // the registers' read-back and $FF08's latch, shared with C16.io

function loadListing(file) {
  const L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ram = new Uint8Array(65536);
  for (const r of L.records) if (r.b) for (let i = 0; i < r.b.length; i++) ram[(r.a + i) & 0xFFFF] = r.b[i];
  return ram;
}

// Key numbers as the KERNAL forms them (row x 8 + column; kit/c16/p4emu_server.py's MATRIX)
const KEY = {};
['DEL', 'RETURN', '£', 'HELP', 'F1', 'F2', 'F3', '@',
  '3', 'W', 'A', '4', 'Z', 'S', 'E', 'SHIFT',
  '5', 'R', 'D', '6', 'C', 'F', 'T', 'X',
  '7', 'Y', 'G', '8', 'B', 'H', 'U', 'V',
  '9', 'I', 'J', '0', 'M', 'K', 'O', 'N',
  'DOWN', 'P', 'L', 'UP', '.', ':', '-', ',',
  'LEFT', '*', ';', 'RIGHT', 'ESC', '=', '+', '/',
  '1', 'HOME', 'CTRL', '2', 'SPACE', 'C=', 'Q', 'STOP'].forEach((k, i) => { KEY[k] = i; });

// TED's registers as the KERNAL leaves them (kit/skills/c16/c16-reference, "TED": IOINIT, and the
// live values after power-on for the rest).
const KERNAL_TED = [0xE1, 0x01, 0x71, 0x7E, 0x80, 0x7E, 0x1B, 0x08, 0xFF, 0x7D, 0x02, 0xCC, 0xFC, 0xA0, 0x00, 0x00,
  0x7C, 0x00, 0x04, 0xD0, 0x08, 0x71, 0x5B, 0x75, 0x77, 0x6E, 0xFC, 0x00, 0xFE, 0x00, 0xC6, 0xA8];
const TIMER_FLAG = [0x08, 0x10, 0x40];
// Each opcode's write cycles, a bit for each (0 the first): stores write in their last cycle,
// read-modify-writes in their last two (the old value, then the new), PHA and PHP in their third,
// JSR in its fourth and fifth, BRK in its third to fifth. RMW marks the read-modify-writes, which
// read in their third cycle from the end.
const RMW_NAMES = ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec', 'slo', 'rla', 'sre', 'rra', 'dcp', 'isb'];
const RMW = Uint8Array.from(OPCODES, ([name, mode]) => RMW_NAMES.includes(name) && mode !== 'acc' ? 1 : 0);
const WRITES = Uint8Array.from(OPCODES, ([name], op) => {
  const n = CYCLES[op];
  if (['sta', 'stx', 'sty', 'sax', 'sha', 'shx', 'shy', 'shs'].includes(name)) return 1 << (n - 1);
  if (RMW[op]) return 3 << (n - 2);
  if (name === 'pha' || name === 'php') return 1 << 2;
  if (name === 'jsr') return 3 << 3;
  if (name === 'brk') return 7 << 2;
  return 0;
});
// The interrupt's seven cycles (two reads, three pushes, the vector), then the KERNAL's way in from
// $FCB3 to the handler: PHA, TXA, PHA, TYA, PHA, STA $FDD0, JMP $CE00, TSX, LDA $0104,X (a cycle
// more when X is $FC or above), AND #$10, BNE (not taken), JMP ($0314). 1 marks a write.
const IRQ_CYCLES = [0, 0, 1, 1, 1, 0, 0];
const KERNAL_CYCLES = [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const KERNAL_PAGE = 26;     // where in KERNAL_CYCLES the LDA $0104,X's crossing cycle goes

// Measured on plus4emu (kit/c16/fixtures/ted-timing.json; the header of site/lib/c16.js):
const RASTER_AT = 1;        // the tick of a line on which $FF1D reads it and its interrupt is raised
const HPOS_AT = 97;         // $FF1E reads (tick + HPOS_AT) mod 114, times 2
const TIMER_ODD = [1, 0, 0];   // timer 1's count shows on odd ticks, timers 2 and 3's on even ones

class Machine {
  constructor(opts = {}) {
    if (!opts.ram) throw new Error('Machine: no ram (loadListing gives it from a listing.json)');
    this.ram = opts.ram;
    this.passAt = opts.passAt === undefined ? null : opts.passAt;
    this.ted = Uint8Array.from(opts.ted || KERNAL_TED);
    this.beam = new Beam({ ff06: this.ted[0x06] });
    this.tick = opts.tick || 0;               // the tick of the processor's next cycle
    this.now = this.tick;                     // the tick of the access in progress, else this.tick
    const L = Math.floor(this.tick / LINE);
    this.lineSeen = L;                        // the last line whose start the machine has passed
    this.rasterSeen = L - (this.tick % LINE < RASTER_AT ? 1 : 0);   // ... and whose compare it made
    this.rasterMatch = (this.rasterSeen % LINES + LINES) % LINES === this.compare;
    this.frames = Math.floor(L / LINES);
    this.flags = this.ted[0x09] & 0x5E;
    // the timers: count at tick t0, running or not, flags raised up to tick done
    this.timers = [0, 1, 2].map(i => ({ count: this.ted[2 * i] | this.ted[2 * i + 1] << 8, t0: this.tick, run: true,
      latch: this.ted[0] | this.ted[1] << 8, done: this.tick }));
    this.nextEv = 0;                          // no event before this tick
    this.romIn = true;
    this.rom = opts.rom || null;
    this.romReads = 0;
    this.keyLatch = 0xFF;                     // $FD30: no rows selected
    this.ff08 = 0xFF;                         // $FF08's latch
    this.keys = new Set();
    this.joy = 0x1F; this.joy1 = 0x1F;
    this.soundLog = null;
    this.passes = 0;
    this.onPass = null; this.onIrq = null; this.onRti = null;
    this.depth = 0;
    this.irqs = 0;
    this.skipOnce = false;
    // the processor's view of the interrupt line: two cycles of delay (b1, b0), then irqFlag; the
    // interrupt flag its next instruction's first cycle sees; whether that cycle has been seen
    this.b1 = 0; this.b0 = 0; this.irqFlag = false;
    this.iFetch = 1; this.fetched = false;
    // the instruction in progress: its opcode, the cycles before it, the cycle reached and its
    // tick, the interrupt flag before it, and its writes to the chips so far
    this.op = 0; this.c0 = 0; this.k = 0; this.kT = 0; this.iB = 1; this.ioWrites = 0;
    const self = this;
    const pages = [];
    for (let p = 0x80; p < 0x100; p++) pages.push(p);
    this.cpu = new CPU(this.ram, { ramSize: 0x4000, ioPages: pages,
      io: { read: a => { self.access(false); return self.ioRead(a); },
        write: (a, v) => { self.access(true); return self.ioWrite(a, v); } } });
    this.cpu.pc = opts.pc === undefined ? 0 : opts.pc;
    this.cpu.i = 1;
    this.cpu.onRti = () => { if (self.depth > 0) { self.depth--; if (self.onRti) self.onRti(self); } };
    this.hooks = Object.assign({}, opts.hooks);
    if (this.passAt !== null) {
      const prev = this.hooks[this.passAt];
      this.hooks[this.passAt] = c => {
        if (self.skipOnce) { self.skipOnce = false; return prev ? prev(c) : false; }
        self.passes++;
        if (self.onPass && self.onPass(self) === true) { self.skipOnce = true; return true; }
        return prev ? prev(c) : false;
      };
    }
  }

  get line() { return Math.floor(this.now / LINE) % LINES; }
  get frame() { return Math.floor(this.now / FRAME); }

  // --- the timers ---
  // Timer i's counts in ticks a+1 .. b.
  static counts(i, a, b) { const f = t => Math.floor((t + 2 - TIMER_ODD[i]) / 2); return b > a ? f(b) - f(a) : 0; }
  // The tick of timer i's n-th count after tick t0 (n from 1).
  static countTick(i, t0, n) { return t0 + 1 + (((t0 + 1 - TIMER_ODD[i]) % 2 + 2) % 2) + 2 * (n - 1); }
  timerAt(i, t) {
    const T = this.timers[i];
    if (!T.run) return T.count;
    const n = Machine.counts(i, T.t0, t), c = T.count;
    if (i > 0) return ((c - n) % 0x10000 + 0x10000) % 0x10000;
    if (n <= c) return c - n;
    const P = T.latch || 0x10000;
    return P - 1 - ((n - c - 1) % P);
  }
  // The first tick after tick a on which timer i raises its flag: timer 1 as it counts on from 0,
  // timers 2 and 3 the tick after they show 0 on an even tick.
  timerFlag(i, a) {
    const T = this.timers[i];
    if (!T.run) return Infinity;
    const c = T.count, m = Machine.counts(i, T.t0, a);
    if (i === 0) {
      const P = T.latch || 0x10000, n = c + 1 > m ? c + 1 : c + 1 + P * Math.ceil((m - c) / P);
      return Machine.countTick(0, T.t0, n);
    }
    if (c === 0 && T.t0 % 2 === 0 && T.t0 + 1 > a) return T.t0 + 1;
    const first = c === 0 ? 0x10000 : c, n = first > m ? first : first + 0x10000 * Math.ceil((m + 1 - first) / 0x10000);
    return Machine.countTick(i, T.t0, n) + 1;
  }
  // Moves timer i's count on to tick t, its flag raised if it passed a flag's tick.
  timerTo(i, t) {
    const T = this.timers[i];
    if (t <= T.t0) return;
    if (this.timerFlag(i, T.done) <= t) this.flags |= TIMER_FLAG[i];
    T.count = this.timerAt(i, t); T.t0 = t; T.done = t;
  }

  // --- TED's events ---
  // The raster compare line, nine bits.
  get compare() { return this.ted[0x0B] | (this.ted[0x0A] & 1) << 8; }
  // Everything TED does up to tick t: lines begun (a frame at line 0, the display looked at), the
  // raster flag as the line count reaches the compare line, the timers' flags.
  events(t) {
    if (t < this.nextEv) return;
    for (;;) {
      const L = this.lineSeen + 1;
      if (L * LINE > t) break;
      this.lineSeen = L;
      if (L % LINES === 0) { this.frames++; this.beam.frame(); }
    }
    for (;;) {
      const L = this.rasterSeen + 1;
      if (L * LINE + RASTER_AT > t) break;
      this.rasterSeen = L;
      this.rasterCheck(L % LINES);
    }
    let next = Math.min((this.lineSeen + 1) * LINE, (this.rasterSeen + 1) * LINE + RASTER_AT);
    for (let i = 0; i < 3; i++) {
      const T = this.timers[i];
      if (!T.run) continue;
      let f = this.timerFlag(i, T.done);
      if (f <= t) { this.flags |= TIMER_FLAG[i]; T.done = t; f = this.timerFlag(i, t); }
      next = Math.min(next, f);
    }
    this.nextEv = next;
  }
  // The raster flag rises as the line count and the compare line come to match.
  rasterCheck(line) {
    const m = line === this.compare;
    if (m && !this.rasterMatch) this.flags |= 0x02;
    this.rasterMatch = m;
  }
  // The interrupt line at tick t.
  irqAt(t) { this.events(t); return (this.flags & this.ted[0x0A] & 0x5E) !== 0 ? 1 : 0; }

  // --- the chips ---
  ioRead(a) {
    if (a >= 0xFF00 && a < 0xFF40) return this.tedRead(a & 0x3F);
    if (a >= 0xFD00 && a < 0xFF00) return 0xFF;
    return this.romOrRam(a);
  }
  romOrRam(a) {
    if (!this.romIn) return this.ram[a & 0x3FFF];
    if (this.rom) return this.rom[a - 0x8000];
    this.romReads++;
    return 0;
  }
  tedRead(r) {
    if (r >= 0x20) return r >= 0x3E ? this.romOrRam(0xFF00 | r) : 0xFF;
    const t = this.now;
    this.events(t);
    if (r <= 5) { const v = this.timerAt(r >> 1, t); return r & 1 ? v >> 8 : v & 0xFF; }
    if (r === 0x08) return this.ff08;
    if (r === 0x09) {
      const f = this.flags | 0x25;
      return f | ((f & this.ted[0x0A] & 0x5E) ? 0x80 : 0);
    }
    if (r === 0x13) return (this.ted[0x13] & 0xFE) | (this.romIn ? 1 : 0);
    if (r === 0x1C || r === 0x1D) {
      const L = (this.rasterSeen % LINES + LINES) % LINES;
      return r === 0x1D ? L & 0xFF : 0xFE | (L >> 8);
    }
    if (r === 0x1E) return (((t + HPOS_AT) % LINE) * 2) & 0xFF;
    if (r === 0x1F) return (this.ted[0x1F] & 0x78) | 0x80 | this.beam.charLine(t);
    return this.ted[r] | READ_ONES[r];
  }
  // The keyboard and joystick lines that $FD30 and a write of w to $FF08 select.
  keyboard(w) { return latch(w, this.keyLatch, this.keys, this.joy, this.joy1); }
  ioWrite(a, v) {
    if (a >= 0xFF00 && a < 0xFF40) return this.tedWrite(a & 0x3F, v);
    if (a >= 0xFD30 && a < 0xFD40) { this.keyLatch = v; return; }
    if (a >= 0xFD00 && a < 0xFF00) return;                   // the ACIA, the 6529, the ROM banks
    this.ram[a & 0x3FFF] = v;                                 // under the ROMs, or the RAM
  }
  tedWrite(r, v) {
    if (r >= 0x20) { if (r === 0x3E) this.romIn = true; else if (r === 0x3F) this.romIn = false; return; }
    const t = this.now;
    this.events(t);
    if (r <= 5) {
      const i = r >> 1, T = this.timers[i];
      this.timerTo(i, t);
      if (r & 1) {                                             // the high byte: starts it
        T.count = (T.count & 0xFF) | v << 8; if (i === 0) T.latch = (T.latch & 0xFF) | v << 8;
        // timer 2 started on an odd tick starts on the next
        if (!T.run) { T.run = true; T.t0 = i === 1 && t % 2 ? t + 1 : t; }
      } else {                                                 // the low byte: stops it
        T.count = (T.count & 0xFF00) | v; if (i === 0) T.latch = (T.latch & 0xFF00) | v;
        T.run = false;
      }
      T.done = t;
      this.ted[r] = v;
      this.nextEv = 0;
      return;
    }
    if (r === 0x08) { this.ff08 = this.keyboard(v); this.ted[8] = v; return; }
    if (r === 0x09) { this.flags &= ~(v & 0x5E); return; }
    if (r === 0x06) { this.ted[6] = v; this.beam.ff06 = v; return; }
    if (r >= 0x0E && r <= 0x12 && this.soundLog) this.soundLog.push([t, r, v]);
    this.ted[r] = v;
    if (r === 0x0A || r === 0x0B) this.rasterCheck(Math.floor(t / LINE) % LINES);
  }

  // --- the processor's cycles ---
  // A cycle of the processor at tick t, with the interrupt flag at i: the interrupt line comes
  // through two latches, the first held clear while i is set.
  pipe(t, i) {
    if (this.b0) this.irqFlag = true;
    this.b0 = i ? 0 : this.b1;
    this.b1 = this.irqAt(t);
  }
  // The instruction in progress reaches its cycle k: each cycle on from the last one reached, on
  // the tick TED gives it.
  walkTo(k) {
    const w = WRITES[this.op], rti = this.op === 0x40;
    while (this.k < k) {
      const j = ++this.k, t = this.kT, wr = (w >> j) & 1, i = rti && j === 5 ? this.cpu.i : this.iB;
      this.kT = this.beam.step(t, wr);
      if (!wr) this.stall(t, i);
      this.pipe(this.kT, i);
    }
  }
  // A read after the cycle at tick t, held by TED on a bad line: until TED holds the processor
  // whole, at tick 12, it tries the read at each of its cycles, and its interrupt line moves on.
  stall(t, i) {
    const p = t % LINE;
    if ((p === 4 || p === 6 || p === 8) && this.beam.kind(Math.floor(t / LINE)) === 2) {
      for (let s = t + 2; s <= t - p + 10; s += 2) this.pipe(s, i);
    }
  }
  // An access to the chips: the cycle it is made in (the last, or a read-modify-write's third from
  // the end and the two after it), and this.now its tick.
  access(write) {
    const n = this.cpu.cycles - this.c0;
    const k = !RMW[this.op] ? n - 1 : write ? n - 3 + (++this.ioWrites) : n - 3;
    this.walkTo(k);
    this.now = this.kT;
  }
  // Cycles after the one at this.kT, a write where kinds has 1, with the interrupt flag at i: the
  // last one's tick.
  seq(kinds, i) {
    let t = this.kT;
    for (let j = 0; j < kinds.length; j++) {
      const u = this.beam.step(t, kinds[j]);
      if (!kinds[j]) this.stall(t, i);
      t = u; this.pipe(t, i);
    }
    return t;
  }
  // Take an interrupt in place of the instruction whose first cycle is at this.tick: the
  // processor's seven cycles, then the KERNAL's way in or the RAM's vector.
  interrupt() {
    const c = this.cpu;
    this.irqStart = c.cycles;                 // the processor's cycles as the interrupt begins
    let t = this.tick;
    for (let j = 1; j < 7; j++) {
      const u = this.beam.step(t, IRQ_CYCLES[j]), i = j <= 4 ? c.i : 1;
      if (!IRQ_CYCLES[j]) this.stall(t, i);
      t = u; this.pipe(t, i);
      if (j === 4) { this.irqFlag = false; this.b1 = 0; this.b0 = 0; }
    }
    c.push(c.pc >> 8); c.push(c.pc & 0xFF); c.push(c.p & ~0x10);
    c.i = 1; c.cycles += 7;
    let entry;
    if (this.romIn && !this.rom) {
      c.push(c.a); c.push(c.x); c.push(c.y);
      c.x = c.sp; c.a = 0; c.n = 0; c.z = 1;
      let kinds = KERNAL_CYCLES;
      if (c.x >= 0xFC) kinds = kinds.slice(0, KERNAL_PAGE).concat([0], kinds.slice(KERNAL_PAGE));
      this.kT = t;
      t = this.seq(kinds, 1);
      c.cycles += kinds.length;
      entry = c.m[0x0314] | c.m[0x0315] << 8;
    } else entry = this.romOrRam(0xFFFE) | this.romOrRam(0xFFFF) << 8;
    c.pc = entry;
    this.tick = this.now = this.beam.step(t, 0);
    this.iFetch = 1; this.fetched = false;
    this.stall(t, 1);
    this.depth++; this.irqs++;
    if (this.onIrq) this.onIrq(this, entry);
  }
  // One instruction, or the interrupt in its place. False when a hook stopped the run.
  step() {
    const cpu = this.cpu;
    if (!this.fetched) { this.pipe(this.tick, this.iFetch); this.fetched = true; }
    if (this.irqFlag) { this.interrupt(); return true; }
    const pc = cpu.pc, hook = this.hooks[pc];
    if (hook !== undefined) {
      if (hook(cpu) === true) return false;
      if (cpu.pc !== pc) return true;
    }
    const chips = pc >= 0xFD00 && pc < 0xFF40, rom = pc >= 0x8000 && this.romIn && !chips;
    if (chips || (rom && !this.rom)) {
      throw new Error('Machine: the processor reached ' + (chips ? 'the chips' : 'the ROM') +
        ' at $' + pc.toString(16).toUpperCase().padStart(4, '0'));
    }
    this.op = rom ? this.rom[pc - 0x8000] : cpu.m[pc & 0x3FFF]; this.c0 = cpu.cycles; this.k = 0; this.kT = this.tick;
    this.iB = cpu.i; this.ioWrites = 0;
    cpu.step();
    this.walkTo(cpu.cycles - this.c0 - 1);
    this.tick = this.now = this.beam.step(this.kT, 0);
    this.iFetch = this.op === 0x28 ? this.iB : cpu.i;       // PLP's flags reach the line a cycle late
    this.fetched = false;
    this.stall(this.kT, this.iFetch);
    return true;
  }

  // n cycles of a hook's stand-in, as reads, from the next instruction's first cycle on.
  spend(n) {
    if (n <= 0) return;
    const cpu = this.cpu;
    this.kT = this.tick;
    const t = this.seq(new Uint8Array(n - 1), cpu.i);
    cpu.cycles += n;
    this.tick = this.now = this.beam.step(t, 0);
    this.iFetch = cpu.i; this.fetched = false;
    this.stall(t, this.iFetch);
  }

  // --- running ---
  // Run for n ticks of TED, the interrupts included. False when onPass stopped the run.
  runTicks(n) {
    const end = this.tick + n;
    while (this.tick < end) if (!this.step()) return false;
    return true;
  }
  runFrames(n) { return this.runTicks(n * FRAME); }
  runUntilPass(f, maxFrames = 100000) {
    if (this.passAt === null) throw new Error('Machine: runUntilPass needs passAt');
    let hit = false;
    const prev = this.onPass;
    this.onPass = m => { if (prev) prev(m); if (f(m)) { hit = true; return true; } return false; };
    const end = this.frames + maxFrames;
    try { while (!hit && this.frames < end) this.runTicks(FRAME); } finally { this.onPass = prev; }
    return hit;
  }
  runPasses(n, maxFrames = 100000) { const target = this.passes + n; return this.runUntilPass(m => m.passes >= target, maxFrames); }
  press(k) { this.keys.add(typeof k === 'string' ? KEY[k] : k); }
  release(k) { this.keys.delete(typeof k === 'string' ? KEY[k] : k); }
  releaseAll() { this.keys.clear(); }

  static get SAVED() {
    return ['tick', 'lineSeen', 'rasterSeen', 'rasterMatch', 'frames', 'flags', 'romIn', 'keyLatch', 'ff08', 'joy', 'joy1',
      'passes', 'passAt', 'skipOnce', 'depth', 'irqs', 'b1', 'b0', 'irqFlag', 'iFetch', 'fetched'];
  }
  save() {
    const c = this.cpu, s = { ram: Buffer.from(this.ram).toString('base64'), ted: Array.from(this.ted), shown: this.beam.shown,
      cpu: { a: c.a, x: c.x, y: c.y, sp: c.sp, pc: c.pc, p: c.p, cycles: c.cycles },
      timers: JSON.parse(JSON.stringify(this.timers)), keys: Array.from(this.keys) };
    for (const k of Machine.SAVED) s[k] = this[k];
    return s;
  }
  static restore(s, opts = {}) {
    const m = new Machine({ ram: new Uint8Array(Buffer.from(s.ram, 'base64')), ted: s.ted, tick: s.tick,
      passAt: opts.passAt !== undefined ? opts.passAt : s.passAt, rom: opts.rom, hooks: opts.hooks });
    const c = m.cpu;
    Object.assign(c, { a: s.cpu.a, x: s.cpu.x, y: s.cpu.y, sp: s.cpu.sp, pc: s.cpu.pc, cycles: s.cpu.cycles });
    c.p = s.cpu.p;
    m.beam.shown = s.shown;
    for (const k of Machine.SAVED) if (k !== 'passAt') m[k] = s[k];
    m.now = m.tick;
    m.timers = s.timers; m.keys = new Set(s.keys); m.nextEv = 0;
    return m;
  }
}

// The kit's stand-ins for KERNAL routines, as hooks for machine m (above).
function kernalHooks(m) {
  return {
    0xFF9F: cpu => {                                         // SCNKEY
      const r = globalThis.C16.scnkey(a => cpu.rd(a), (a, v) => cpu.wr(a, v),
        { read: a => m.ioRead(a), write: (a, v) => m.ioWrite(a, v) });
      cpu.a = r.a; cpu.x = r.x; cpu.y = r.y;
      cpu.rts();
      m.spend(r.cycles);
      return false;
    },
  };
}

module.exports = { Machine, KEY, KERNAL_TED, loadListing, kernalHooks, LINE, LINES, FRAME };
