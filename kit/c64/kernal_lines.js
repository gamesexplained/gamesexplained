'use strict';
// A game that keeps the KERNAL and reads whole lines through it, run on the kit's 6502
// (kit/c64/cpu6502.js) one typed line at a time, for a test that holds a page's port of it against
// the game's code. kit/c64/machine.js is the machine for a game that banks the KERNAL out and
// reads the keyboard itself; a text game that prints with CHROUT and reads with CHRIN needs no
// raster and no keyboard matrix, only the KERNAL's line routines, and the kit holds no ROM. So the
// routines are hooks here, and the test compares the two sides at each line the game reads: the
// bytes each sent to CHROUT since the last one, and the memory kit/scripts/port_check.js's differ()
// finds different. Checked by kit/c64/test_kernal_lines.js.
//
//   const { CPU } = require('<repo>/kit/c64/cpu6502.js');
//   const { KernalLines } = require('<repo>/kit/c64/kernal_lines.js');
//   const cpu = new CPU(Uint8Array.from(L.ram), { port: { dir: 0x2F, data: 0x36 }, io });
//   cpu.pc = 0x12B5; cpu.sp = 0xFF;                     // where the game starts
//   const k = new KernalLines(cpu, { stops: { 0x195A: 'reset' } });
//   k.run();                       // to the first line the game reads: 'line', or a stop's name
//   k.out                          // what it printed on the way
//   k.run([0x4C, 0x4F, 0x4F, 0x4B]);   // types LOOK and RETURN, and runs to the next read
//
// The routines
// - CHROUT ($FFD2) appends A to k.out and returns, the flags as they were. CHRIN ($FFCF) gives
//   the typed line a byte a call, the RETURN ($0D) last, as the screen editor does, with C clear;
//   a call after the RETURN is the game asking for the next line, and the run stops before it.
// - SETLFS ($FFBA) and SETNAM ($FFBD) return. SAVE ($FFD8) keeps the bytes from the address in
//   the zero-page pair A names up to X/Y (not included) in k.tape, { addr, bytes }; LOAD ($FFD5)
//   puts the next file of k.tape back at its own address, with C clear (or nothing, with C clear,
//   when the tape has no more). A port saves and loads its own files; the test compares them.
// - Any other KERNAL routine the game calls stops the run with the address, as the simulator stops
//   at any ROM: a game that needs one more gets a hook of the test's (opts.hooks), which win over
//   these.
// - stops: { address: name }, places the run stops at before the instruction there (a reset, the
//   end of the game), returning the name.
//
// What does not move
// - No interrupt runs, so the jiffy clock ($A0-$A2) and anything else the KERNAL's interrupt keeps
//   stand as the test sets them: set the same values in the game's memory and the port's before
//   each line, and the two read the same clock. A key the game finds waiting in the keyboard
//   buffer ($C6, $0277-$0280, the count at $C6) is the test's to set too.
//
// run(line, opts) types line (an array of bytes, without the RETURN), or nothing when it is
// omitted, and runs from cpu.pc; opts.maxSteps (default 5e7) and opts.executed pass to cpu.run.
// It returns 'line' when the game asks for another line, or the stop's name, and clears k.out
// before it runs.
const KERNAL = { CHROUT: 0xFFD2, CHRIN: 0xFFCF, SETLFS: 0xFFBA, SETNAM: 0xFFBD, SAVE: 0xFFD8, LOAD: 0xFFD5 };

class KernalLines {
  constructor(cpu, opts = {}) {
    this.cpu = cpu;
    this.out = [];
    this.tape = [];
    this.loaded = 0;
    this.queue = null;
    this.stopped = null;
    const stops = {};
    for (const [a, name] of Object.entries(opts.stops || {})) stops[a] = () => { this.stopped = name; return true; };
    this.hooks = Object.assign({
      [KERNAL.CHROUT]: c => { this.out.push(c.a); c.rts(); },
      [KERNAL.CHRIN]: c => {
        if (!this.queue) { this.stopped = 'line'; return true; }
        c.a = this.queue.shift();
        if (c.a === 0x0D) this.queue = null;
        c.c = 0; c.rts();
      },
      [KERNAL.SETLFS]: c => { c.rts(); },
      [KERNAL.SETNAM]: c => { c.rts(); },
      [KERNAL.SAVE]: c => {
        const s = c.m[c.a] | (c.m[c.a + 1] << 8), e = c.x | (c.y << 8);
        this.tape.push({ addr: s, bytes: c.m.slice(s, e) });
        c.c = 0; c.rts();
      },
      [KERNAL.LOAD]: c => {
        const f = this.tape[this.loaded++];
        if (f) c.m.set(f.bytes, f.addr);
        c.c = 0; c.rts();
      },
    }, stops, opts.hooks || {});
  }

  run(line, opts = {}) {
    this.out = [];
    this.stopped = null;
    if (line !== undefined && line !== null) this.queue = [...line, 0x0D];
    this.cpu.run({ hooks: this.hooks, maxSteps: opts.maxSteps || 5e7, executed: opts.executed });
    if (!this.stopped) throw new Error('the game ran past its hooks at $' + this.cpu.pc.toString(16));
    return this.stopped;
  }
}

module.exports = { KernalLines, KERNAL };
