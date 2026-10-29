/* en-core */
// Into the Eagle's Nest, the Play tab's port: the frame its groups of routines install into. The port
// runs on the game's own 64 KB (M) and keeps every variable where the game keeps it; the processor's
// registers travel as { a, x, y, c } objects between routines that pass them, and the stack is not
// kept. P.cpuPort is the processor port's data as the game last wrote $01: with its low three bits
// the chips are at $D000 when bits 0-1 are not both 0 and bit 2 is set, and the game never reads a
// ROM, so a read where one is banked in is an error. Chips are reached through P.io (vicRead and the
// rest, read(a) and write(a, v) by address; irqByte(a), a byte the interrupt writes while the main
// program polls it, M[a] on the page). P.I is the interrupt mask as the game sets it with SEI and CLI.
//
// EagleCore.makePort(M, groups, lib) builds P from the group installers (window.EN_GROUPS, or a list
// in node), each install(P, H, lib). H holds the shared helpers:
//   rd(a), wr(a, v)        memory as the banking shows it; a write to $01 sets P.cpuPort
//   ib(a)                  a byte the interrupt writes, read where the main program polls it
//   ptr(z)                 the little-endian pointer at zero page z
//   adcD(a, b, c), sbcD(a, b, c)  NMOS decimal-mode ADC and SBC: { a, c }
//   call(name, address)    a function(r) that runs P[name], or, until a group has ported it, the
//                          game's own routine through lib.call (in node; on the page an error)
//   gen(name, address, o)  the same for a routine that waits: a generator; o for lib.gen (polls)
// The program is a run of stages joined by JMP (P.program): each P.stages[address] is a generator
// that returns the address its stage jumps to. A stage no group has ported runs as the game's own
// code through lib.stage until it reaches the start of another stage.
(function (root) {
  'use strict';
  const STAGES = [0x0810, 0x4000, 0x404F, 0x484A];
  function makePort(M, groups, lib) {
    const P = { M, io: {}, I: 1, cpuPort: 0x05, stages: {}, irqs: {}, checkpoints: new Set(), irqBytes: new Set() };
    const missing = (what) => { throw new Error('not ported: ' + what); };
    lib = lib || {
      call: (a) => missing('$' + a.toString(16).toUpperCase()),
      gen: function* (a) { missing('$' + a.toString(16).toUpperCase()); },
      stage: function* (a) { missing('the stage at $' + a.toString(16).toUpperCase()); },
    };
    const cfg = () => P.cpuPort & 7;
    const io = (a) => a >= 0xD000 && a < 0xE000 && (cfg() & 3) !== 0 && (cfg() & 4) !== 0;
    const rom = (a) => {
      const c = cfg();
      if (a >= 0xE000 && (c & 2)) return 'the KERNAL ROM';
      if (a >= 0xA000 && a < 0xC000 && (c & 3) === 3) return 'the BASIC ROM';
      if (a >= 0xD000 && a < 0xE000 && (c & 3) !== 0 && !(c & 4)) return 'the character ROM';
      return null;
    };
    const H = {
      rd(a) {
        a &= 0xFFFF;
        if (io(a)) return P.io.read(a) & 255;
        const r = rom(a);
        if (r) throw new Error('the port read $' + a.toString(16).toUpperCase() + ' in ' + r);
        return M[a];
      },
      wr(a, v) {
        a &= 0xFFFF; v &= 255;
        if (a === 1) { P.cpuPort = v; return; }
        if (io(a)) P.io.write(a, v); else M[a] = v;
      },
      ib: (a) => P.io.irqByte(a) & 255,
      ptr: (z) => M[z] | M[(z + 1) & 255] << 8,
      adcD(a, b, c) {
        let al = (a & 15) + (b & 15) + c;
        if (al >= 10) al = ((al + 6) & 15) + 16;
        let s = (a & 0xF0) + (b & 0xF0) + al;
        if (s >= 0xA0) s += 0x60;
        return { a: s & 255, c: s >= 0x100 ? 1 : 0 };
      },
      sbcD(a, b, c) {
        const t = a - b - (1 - c);
        let al = (a & 15) - (b & 15) + c - 1;
        if (al < 0) al = ((al - 6) & 15) - 16;
        let r = (a & 0xF0) - (b & 0xF0) + al;
        if (r < 0) r -= 0x60;
        return { a: r & 255, c: t >= 0 ? 1 : 0 };
      },
      call: (name, address) => (r) => (P[name] ? P[name](r || {}) : lib.call(address, r || {})),
      gen: (name, address, o) => function* (r) {
        if (!P[name]) return yield* lib.gen(address, r || {}, o || {});
        const v = P[name](r || {});
        return v && typeof v.next === 'function' ? yield* v : v;
      },
    };
    P.H = H;
    P.sei = () => { P.I = 1; };
    P.cli = () => { P.I = 0; };
    for (const g of groups) g(P, H, lib);
    P.program = function* () {
      let at = 0x0810;
      for (;;) {
        const s = P.stages[at];
        at = s ? yield* s() : (yield* lib.stage(at, STAGES)).at;
      }
    };
    return P;
  }
  const EagleCore = { makePort, STAGES };
  if (typeof module !== 'undefined') module.exports = EagleCore;
  root.EagleCore = EagleCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
