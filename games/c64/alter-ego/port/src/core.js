'use strict';
// Alter Ego in JavaScript: the port's core. The game is a program compiled to p-code, run by an
// interpreter at $713C on a stack of 16-bit values (port/scripts/vm.py); this port is that program
// written again in JavaScript, procedure by procedure, each a function named after its label in the
// listing, reading and writing the game's memory where the game keeps it. The page and the tests
// make it with AEPort.create(M, io) and run its main program, P.main(), a generator that yields where
// the game's code reaches a checkpoint, waits for the raster or spends time (kit/c64/lockstep.js).
//
// What it keeps as the game does:
// - memory: M, 64 KB at the game's addresses; the chips through io when the processor port shows
//   them, the character ROM's glyphs (P.charRom, the excerpt the page carries) when it shows that.
// - the p-code's stack: sp and fp as the interpreter keeps them in $04-$07. A procedure's frame is
//   eight bytes under its arguments and its locals are under the frame, so a local whose address the
//   game passes on (a text buffer) is at the address the game's is. The port keeps its other locals
//   in JavaScript, so the stack's bytes themselves are not compared.
// Values are 16-bit: kept as 0-65535, with s() for the signed view the p-code's signed compares and
// divisions use.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  AEPort.create = function (M, io, opts = {}) {
    const P = { M, io, sp: 0, fp: 0, cpuPort: opts.cpuPort === undefined ? 0x36 : opts.cpuPort,
      cpuDir: opts.cpuDir === undefined ? 0x2F : opts.cpuDir, charRom: opts.charRom || null, opts };
    P.cpuOut = P.cpuPort & P.cpuDir;

    // ---- memory, as the 6510 sees it through the processor port ($00 its direction, $01 its
    // data: the bits set as outputs read back as written, bit 4 (the cassette switch, open) reads
    // 1, and bits 6 and 7 what was last driven on them). The chips through P.io, which the
    // lockstep may replace, so it is looked up at each access
    P.rb = function (a) {
      a &= 0xFFFF;
      if (a < 2) return a === 0 ? P.cpuDir : ((P.cpuPort & P.cpuDir) | (~P.cpuDir & (0x17 | (P.cpuOut & 0xC8)))) & 0xFF;
      if (a >= 0xD000 && a < 0xE000 && (P.cpuPort | ~P.cpuDir) & 3) {
        if ((P.cpuPort | ~P.cpuDir) & 4) return P.io.read(a);
        if (!P.charRom) throw new Error('the port read the character ROM at $' + a.toString(16));
        return P.charRom[a - 0xD000];
      }
      if (a >= 0xE000 && ((P.cpuPort | ~P.cpuDir) & 2)) throw new Error('the port read the KERNAL ROM at $' + a.toString(16));
      return M[a];
    };
    P.wb = function (a, v) {
      a &= 0xFFFF; v &= 255;
      if (a < 2) {
        if (a === 0) P.cpuDir = v; else P.cpuPort = v;
        P.cpuOut = ((P.cpuOut & ~P.cpuDir) | (P.cpuPort & P.cpuDir)) & 0xFF;
        M[a] = v;
        return;
      }
      const cfg = (P.cpuPort | ~P.cpuDir) & 7;
      if (a >= 0xD000 && a < 0xE000 && (cfg & 3) && (cfg & 4)) { P.io.write(a, v); return; }
      M[a] = v;
    };
    P.rw = a => P.rb(a) | P.rb(a + 1) << 8;
    P.ww = (a, v) => { P.wb(a, v); P.wb(a + 1, v >> 8); };
    // RAM only, for the tables and buffers the game reads with the chips out of the way
    P.ram = a => M[a & 0xFFFF];
    P.ramw = a => M[a & 0xFFFF] | M[(a + 1) & 0xFFFF] << 8;
    P.setw = (a, v) => { M[a & 0xFFFF] = v & 255; M[(a + 1) & 0xFFFF] = (v >> 8) & 255; };
    // a zero-page byte the game's 6502 leaves behind, written as it writes it
    P.zp = (a, v) => { M[a] = v & 255; };

    // ---- the p-code's arithmetic, as its handlers do it ($7612-$786F)
    P.s = v => (v & 0x8000) ? (v & 0xFFFF) - 0x10000 : v & 0xFFFF;
    P.u = v => v & 0xFFFF;
    // the restoring division at $7650: a quotient of $FFFF and the dividend as the remainder when
    // the divisor is 0
    P.divmodu = function (a, b) {
      a &= 0xFFFF; b &= 0xFFFF;
      if (b === 0) return [0xFFFF, a];
      return [Math.floor(a / b), a % b];
    };
    P.divu = (a, b) => P.divmodu(a, b)[0];
    P.remu = (a, b) => P.divmodu(a, b)[1];
    // signed: the magnitudes divided, the quotient negated when the signs differ, the remainder
    // when the dividend is negative ($769C)
    P.divs = function (a, b) {
      const sa = P.s(a), sb = P.s(b);
      const q = P.divmodu(Math.abs(sa), Math.abs(sb))[0];
      return ((sa < 0) !== (sb < 0)) ? (-q) & 0xFFFF : q;
    };
    P.rems = function (a, b) {
      const sa = P.s(a), sb = P.s(b);
      const r = P.divmodu(Math.abs(sa), Math.abs(sb))[1];
      return sa < 0 ? (-r) & 0xFFFF : r;
    };
    P.mul = (a, b) => Math.imul(a & 0xFFFF, b & 0xFFFF) & 0xFFFF;
    // shifts by a count of up to 255 + 256 x high byte, as the loops at $76E3-$7723 run
    P.shl = (a, n) => (n & 0xFFFF) >= 16 ? 0 : (a << n) & 0xFFFF;
    P.shr = (a, n) => (n & 0xFFFF) >= 16 ? 0 : (a & 0xFFFF) >>> n;
    P.sar = (a, n) => ((n & 0xFFFF) >= 16 ? (a & 0x8000 ? 0xFFFF : 0) : (P.s(a) >> n) & 0xFFFF);

    // ---- the stack
    // A call pushes its arguments, the last first, so the first is at fp+8; temps are words the
    // caller's expression had pushed before them (a value it adds the result to)
    P.enter = function (args, locals, temps = 0) {
      let sp = P.sp - 2 * temps;
      for (let i = args.length - 1; i >= 0; i--) { sp -= 2; P.setw(sp, args[i]); }
      const frame = { sp: P.sp, fp: P.fp };
      P.fp = (sp - 8) & 0xFFFF;
      P.sp = (P.fp - locals) & 0xFFFF;
      return frame;
    };
    P.leave = function (frame) { P.sp = frame.sp; P.fp = frame.fp; };
    // a 6502 body with a frame of its own (the gateway at $7059): nine bytes, and below them the
    // workspace at $30 it saves
    P.enterNative = function (args, saved, adjust) {
      let sp = P.sp;
      for (let i = args.length - 1; i >= 0; i--) { sp -= 2; P.setw(sp, args[i]); }
      const frame = { sp: P.sp, fp: P.fp, saved: M.slice(0x30, 0x30 + saved) };
      P.fp = (sp - 9) & 0xFFFF;
      P.sp = (P.fp - saved + adjust) & 0xFFFF;
      return frame;
    };
    P.leaveNative = function (frame) {
      M.set(frame.saved, 0x30);
      P.sp = frame.sp; P.fp = frame.fp;
    };

    // ---- the machine's KERNAL and drive (port/src/kernal.js), on the port's memory. The bytes the
    // KERNAL's interrupt fills and GETIN takes (the keyboard's buffer and its count) are read
    // through P.io.irqByte and written through P.io.store, which the lockstep follows and the page
    // gives as M[a]; the interrupt itself reads and writes them plainly
    P.drive = opts.drive || (root.AEKernal ? root.AEKernal.drive() : null);
    P.irqBytes = [0xC6]; for (let a = 0x0277; a <= 0x0280; a++) P.irqBytes.push(a);
    const IRQ = new Set(P.irqBytes);
    P.k = {
      rd: a => (IRQ.has(a) ? P.io.irqByte(a) & 255 : P.rb(a)),
      wr: (a, v) => { if (IRQ.has(a)) P.io.store(a, v & 255); else P.wb(a, v); },
      get drive() { return P.drive; },
    };
    P.kIrq = { rd: a => P.rb(a), wr: (a, v) => P.wb(a, v), get drive() { return P.drive; } };
    P.kernal = (name, r = {}) => root.AEKernal.K[name](P.k, Object.assign({ a: 0, x: 0, y: 0, c: 0 }, r));

    for (const g of groups) g(P);
    return P;
  };
})(typeof window !== 'undefined' ? window : globalThis);
