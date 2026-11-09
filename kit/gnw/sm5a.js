'use strict';
// The kit's Game & Watch: a Sharp SM5A with its divider, buttons, buzzer and LCD latches, in
// JavaScript, for the kit's tests and lockstep and for a page's Play tab. It follows MAME
// 0.289's SM5A (src/devices/cpu/sm510/sm5a.cpp, sm500.cpp, sm500op.cpp, sm510op.cpp,
// sm510base.cpp) instruction for instruction; kit/gnw/check_machine.py holds it to MAME's own
// trace. The machine's facts are in kit/skills/gnw/gnw-reference.
//
//   const { SM5A } = require('kit/gnw/sm5a.js');
//   const m = new SM5A(rom);         // rom: the chip's 1,856 bytes, in the ROM's own order
//   m.rows[2] = 0b0100;              // the buttons on K of the row R4 selects (unit's wiring)
//   m.alpha = 1;                     // the alpha input (TA), m.beta the beta input (TB)
//   m.step();                        // one instruction, or one cycle asleep; returns its cycles
//   m.run(16384);                    // a second of the machine's time, in cycles
//   m.ram[0x23]                      // a data cell, BM * 16 + BL (mirrors resolved by cell())
//   m.save(), SM5A.load(rom, state)  // the whole state as a plain object, and back
//   m.lit()                          // the LCD's lit segments, as MAME's 'o.h.b' ids
//
// Time: an instruction is one machine cycle of two clocks of the 32.768 kHz crystal, LBL and
// the 5E prefix two cycles; m.clocks counts clocks since power on. The divider counts every
// clock and sets the 1 Hz flag (gamma) when it wraps. A hook may watch the program counter:
// m.hooks[pc] = m => {...} runs before the instruction at that physical pc (CB:PM:PL).

const ROM_SIZE = 0x740;
const O_PINS = 9;
// the digit segments DTW and PDTW shift in, two rows of 16 picked by BP bit 3 (sm500op.cpp)
const DIGITS = [0xe, 0x0, 0xc, 0x8, 0x2, 0xa, 0xe, 0x2, 0xe, 0xa, 0x0, 0x0, 0x2, 0xa, 0x2, 0x2,
                0xb, 0x9, 0x7, 0xf, 0xd, 0xe, 0xe, 0xb, 0xf, 0xf, 0x4, 0x0, 0xd, 0xe, 0x4, 0x0];

// a data address -> the cell that holds it: columns 13-15 are 12, rows 5-7 are row 4 (sm5a.cpp)
function cell(a) {
  a &= 0x7f;
  let row = a >> 4, col = a & 0xf;
  if (col > 12) col = 12;
  if (row > 4) row = 4;
  return row << 4 | col;
}

function nextPc(pc) {
  // PL, the low 6 bits, is a shift register: shift right, feed 1 into bit 5 when bits 0 and 1
  // are equal; the page does not change (sm510base.cpp, increment_pc)
  const feed = ((pc >> 1 ^ pc) & 1) ? 0 : 0x20;
  return feed | (pc >> 1 & 0x1f) | (pc & ~0x3f);
}

class SM5A {
  constructor(rom) {
    if (!rom || rom.length < ROM_SIZE) throw new Error('SM5A: the ROM is ' + (rom ? rom.length : 0) + ' bytes, want ' + ROM_SIZE);
    this.rom = Uint8Array.from(rom.slice(0, ROM_SIZE));
    this.ram = new Uint8Array(0x80);
    this.rows = [0, 0, 0];     // K inputs of the rows R2, R3, R4 select
    this.alpha = 0; this.beta = 0;
    this.hooks = {};
    this.onBuzzer = null;      // (level, clocks): R1's output changed
    this.powerOn();
  }

  powerOn() {
    // device_start's zero fill, then the reset (sm510base.cpp, sm500.cpp)
    this.ram.fill(0);
    this.stack = 0; this.pc = 0; this.prevPc = 0; this.op = 0; this.prevOp = 0; this.param = 0;
    this.acc = 0; this.bl = 0; this.bm = 0; this.c = 0; this.skip = false;
    this.r = 0; this.rOut = 0; this.div = 0; this.gamma = 0; this.halt = false;
    this.ox = new Uint8Array(O_PINS); this.o = new Uint8Array(O_PINS);
    this.mx = 0; this.cb = 0; this.s = 0; this.rsub = false; this.bp = 0;
    this.clocks = 0; this.cycles = 0;
    this.reset();
  }

  // ACL: what the reset button does (sm510base.cpp device_reset, then sm500.cpp's)
  reset() {
    this.skip = false; this.halt = false; this.op = 0; this.prevOp = 0;
    this.pc = 0x0f << 6;                      // reset_vector: CB 0, page $F, step 0
    this.prevPc = this.pc;
    this.bp = 1;
    this.r = 0; this.setR(0);
    this.stack = this.pc;                     // push_stack
    this.div &= 0x3f;                         // op_idiv
    this.gamma = 1; this.cb = 0; this.rsub = false;
    this.r = 0xf; this.melody();
  }

  // ---- the pins
  setR(out) { this.rOut = out; }
  melody() {
    // R1 straight from the program on the SM5A (RMASK_DIRECT): every R output is R's complement
    const out = (~this.r & 1) | (~this.r & 0xe);
    if (out !== this.rOut) {
      const was = this.rOut & 1;
      this.rOut = out;
      if (this.onBuzzer && (out & 1) !== was) this.onBuzzer(out & 1, this.clocks);
    }
  }
  k() {
    // the rows R2-R4 select, ORed (hh_sm510.cpp, read_inputs with the mux = R >> 1)
    const mux = this.rOut >> 1;
    let v = 0;
    for (let i = 0; i < 3; i++) if (mux >> i & 1) v |= this.rows[i];
    return v & 0xf;
  }

  // ---- memory
  read() { return this.ram[cell(this.bm << 4 | this.bl)] & 0xf; }
  write(v) { this.ram[cell(this.bm << 4 | this.bl)] = v & 0xf; }

  // ---- the divider: one clock of the crystal
  tick() {
    this.div = (this.div + 1) & 0x7fff;
    if (this.div === 0) this.gamma = 1;
    this.clocks++;
  }

  setSu(su) { this.stack = (this.stack & ~0x3c0) | (su << 6 & 0x3c0); }
  getSu() { return this.stack >> 6 & 0xf; }
  branch(pu, pm, pl) { this.pc = ((pu << 10) | (pm << 6 & 0x3c0) | (pl & 0x3f)) & 0x7ff; }
  fetch(pc) { return this.rom[pc < ROM_SIZE ? pc : (0x700 | (pc & 0x3f))]; }

  digit() {
    const sel = this.bp >> 3 & 1;
    return DIGITS[sel << 4 | this.acc] | (sel ? 0 : this.mx);
  }
  shiftW() { for (let i = 0; i < O_PINS - 1; i++) this.ox[i] = this.ox[i + 1]; }

  // One instruction, or one cycle asleep. Returns the cycles it took.
  step() {
    if (this.halt) {
      if (this.k() !== 0 || this.gamma) {
        // do_interrupt: wake at page 0, step 0, CB 0; a cycle, and no instruction
        this.halt = false; this.cb = 0; this.branch(0, 0, 0);
        this.tick(); this.tick(); this.cycles++;
        return 1;
      }
      this.tick(); this.tick(); this.cycles++;
      return 1;
    }
    const hook = this.hooks[this.pc];
    if (hook && !this.skip) hook(this);
    let n = 1;
    this.prevOp = this.op; this.prevPc = this.pc;
    this.op = this.fetch(this.pc);
    this.pc = nextPc(this.pc);
    if (this.op === 0x5e || this.op === 0x5f) {
      n = 2;
      this.param = this.fetch(this.pc);
      this.pc = nextPc(this.pc);
    }
    if (this.skip) { this.skip = false; this.op = 0; }
    else this.execute();
    for (let i = 0; i < n; i++) { this.tick(); this.tick(); }
    this.cycles += n;
    return n;
  }

  run(cycles) { const end = this.cycles + cycles; while (this.cycles < end) this.step(); }

  execute() {
    const op = this.op;
    switch (op & 0xf0) {
      case 0x20: if ((op & 0xf0) !== (this.prevOp & 0xf0)) this.acc = op & 0xf; return;   // LAX
      case 0x30: {                                                                          // ADX
        const x = op & 0xf;
        this.acc += x;
        this.skip = x !== 10 && (this.acc & 0x10) !== 0;
        this.acc &= 0xf;
        return;
      }
      case 0x40: this.bm = op & 3; this.bl = (op >> 2 & 3) | ((op & 0xc) ? 8 : 0); return;  // LB
      case 0x70: this.setSu(op & 0xf); return;                                              // SSR
      case 0x80: case 0x90: case 0xa0: case 0xb0:                                           // TR
        this.pc = (this.pc & ~0x3f) | (op & 0x3f);
        if (!this.rsub) this.branch(this.cb, this.getSu(), this.pc & 0x3f);
        return;
      case 0xc0: case 0xd0: case 0xe0: case 0xf0:                                           // TRS
        if (!this.rsub) {
          this.rsub = true;
          const su = this.getSu();
          this.stack = this.pc;               // push_stack
          this.branch(1, 0, op & 0x3f);        // get_trs_field() is 1 on the SM5A
          if ((this.prevOp & 0xf0) === 0x70) this.branch(this.cb, su, this.pc & 0x3f);
        } else {
          this.pc = (this.pc & ~0xff) | (op << 2 & 0xc0) | (op & 0xf);
        }
        return;
    }
    switch (op & 0xfc) {
      case 0x04: this.write(this.read() & ~(1 << (op & 3))); return;                       // RM
      case 0x0c: this.write(this.read() | (1 << (op & 3))); return;                        // SM
      case 0x10: this.exc(); return;                                                        // EXC
      case 0x14: this.exc(); this.incb(); return;                                           // EXCI
      case 0x18: this.acc = this.read(); this.bm ^= op & 3; return;                         // LDA
      case 0x1c: this.exc(); this.decb(); return;                                           // EXCD
      case 0x54: this.skip = (this.read() & (1 << (op & 3))) !== 0; return;                 // TM
    }
    switch (op) {
      case 0x00: return;                                                                    // SKIP
      case 0x01: this.r = this.acc; this.melody(); return;                                  // ATR
      case 0x02: this.bm |= 4; return;                                                      // SBM
      case 0x03: this.bp = this.acc; return;                                                // ATBP
      case 0x08: this.acc = (this.acc + this.read()) & 0xf; return;                         // ADD
      case 0x09:                                                                            // ADDC
        this.acc += this.read() + this.c;
        this.c = this.acc >> 4 & 1; this.skip = this.c === 1; this.acc &= 0xf;
        return;
      case 0x0a: this.acc ^= 0xf; return;                                                   // COMA
      case 0x0b: { const a = this.acc; this.acc = this.bl; this.bl = a; return; }           // EXBLA
      case 0x50: this.skip = this.alpha !== 0; return;                                      // TA
      case 0x51: this.skip = this.beta !== 0; return;                                       // TB
      case 0x52: this.skip = !this.c; return;                                               // TC
      case 0x53: this.skip = this.acc === this.read(); return;                              // TAM
      case 0x58: this.skip = !this.gamma; this.gamma = 0; return;                           // TG
      case 0x59: this.o[O_PINS - 1] = this.ox[O_PINS - 1]; this.o[O_PINS - 2] = this.ox[O_PINS - 2]; return; // PTW
      case 0x5a: this.skip = !this.acc; return;                                             // TA0
      case 0x5b: this.skip = this.acc === this.bl; return;                                  // TABL
      case 0x5c: for (let i = 0; i < O_PINS; i++) this.o[i] = this.ox[i]; return;           // TW
      case 0x5d: this.shiftW(); this.ox[O_PINS - 1] = this.digit(); return;                 // DTW
      case 0x5e:                                                                            // CEND, DTA
        if (this.param === 0x00) this.halt = true;
        else if (this.param === 0x04) this.acc = this.div >> 11 & 0xf;
        return;
      case 0x5f: this.bl = this.param & 0xf; this.bm = (this.param & 0x7f) >> 4; return;    // LBL
      case 0x60: this.bp ^= 8; return;                                                      // COMCN
      case 0x61: this.ox[O_PINS - 2] = this.ox[O_PINS - 1]; this.ox[O_PINS - 1] = this.digit(); return; // PDTW
      case 0x62: this.shiftW(); this.ox[O_PINS - 1] = this.acc & 7; return;                 // WR
      case 0x63: this.shiftW(); this.ox[O_PINS - 1] = this.acc | 8; return;                 // WS
      case 0x64: this.incb(); return;                                                       // INCB
      case 0x65: this.div &= 0x3f; return;                                                  // IDIV
      case 0x66: this.c = 0; return;                                                        // RC
      case 0x67: this.c = 1; return;                                                        // SC
      case 0x68: this.mx = 0; this.acc = 0; return;                                         // RMF
      case 0x69: this.mx = 1; return;                                                       // SMF
      case 0x6a: this.acc = this.k(); return;                                               // KTA
      case 0x6b: this.bm &= ~4; return;                                                     // RBM
      case 0x6c: this.decb(); return;                                                       // DECB
      case 0x6d: this.cb ^= 1; return;                                                      // COMCB
      case 0x6e: this.rtn(); return;                                                        // RTN
      case 0x6f: this.rtn(); this.skip = true; return;                                      // RTNS
    }
  }
  exc() { const a = this.acc; this.acc = this.read(); this.write(a); this.bm ^= this.op & 3; }
  incb() { this.bl = (this.bl + 1) & 0xf; this.skip = this.bl === 8; }
  decb() { this.bl = (this.bl - 1) & 0xf; this.skip = this.bl === 0xf; }
  rtn() { this.pc = this.stack & 0x7ff; this.rsub = false; }

  // ---- the LCD: segment 'o.h.b' is lit when BP bit 0 is set and bit b of latch o is (h 0: W, h 1: W')
  lit() {
    const out = [];
    if (!(this.bp & 1)) return out;
    for (let h = 0; h < 2; h++) for (let o = 0; o < O_PINS; o++) {
      const seg = h ? this.ox[o] : this.o[o];
      for (let b = 0; b < 4; b++) if (seg >> b & 1) out.push((o << 1 | h) + '.' + b);
    }
    return out;
  }

  // ---- the whole state, as a plain object
  save() {
    const s = {};
    for (const k of SM5A.FIELDS) s[k] = this[k];
    s.ram = Array.from(this.ram); s.o = Array.from(this.o); s.ox = Array.from(this.ox); s.rows = this.rows.slice();
    return s;
  }
  static load(rom, s) {
    const m = new SM5A(rom);
    for (const k of SM5A.FIELDS) m[k] = s[k];
    m.ram = Uint8Array.from(s.ram); m.o = Uint8Array.from(s.o); m.ox = Uint8Array.from(s.ox); m.rows = s.rows.slice();
    return m;
  }
}
SM5A.FIELDS = ['stack', 'pc', 'prevPc', 'op', 'prevOp', 'param', 'acc', 'bl', 'bm', 'c', 'skip', 'r', 'rOut',
  'div', 'gamma', 'halt', 'mx', 'cb', 'rsub', 'bp', 'clocks', 'cycles', 'alpha', 'beta'];
SM5A.ROM_SIZE = ROM_SIZE;
SM5A.cell = cell;
SM5A.nextPc = nextPc;

if (typeof module !== 'undefined') module.exports = { SM5A, cell, nextPc, ROM_SIZE };
