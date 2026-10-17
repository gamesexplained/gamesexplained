// Where Time Stood Still's port: P, the game's routines on the game's memory. Each group of
// routines is a file of its own that adds its functions to P (WTGroups); this makes P and
// installs them.
//
// The conventions every routine keeps:
// - P.M is the 64 KB the Z80 sees, read and written at the game's addresses, self-modified
//   operands included; P.mem keeps the 128's eight banks behind it as kit/spectrum/machine.js's
//   Banks128 does (the lockstep gives its own; makePort makes one otherwise): a write to $7FFD
//   through P.io.out pages a bank in at $C000, copying the one leaving out and the one arriving
//   in. Bank 5 or 2 paged in at $C000 is the same memory as at $4000 or $8000: P.M's $C000 up
//   then holds only a copy made when it came in, so a routine that may run with bank 5 (or 7,
//   the other screen) paged in reaches the screen through P.hidden(), the address the screen
//   paged in at $C000 really lives at.
// - P.io is the machine around the processor: in(port), out(port, v) (the keyboard and joystick,
//   the ULA's border and beeper, $7FFD's paging, the AY's register select and data), and
//   irqByte(a).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with, and it
//   returns the registers its callers read. The registers are a, f, b, c, d, e, h, l, ix, iy and
//   af_, bc_, de_, hl_; a pair may also be given and read as bc, de or hl, and a flag as zf, cf,
//   sf or pf, a boolean. That is the tests' stand-in's form (port/test/standin.js), so the game's
//   own code can stand in for any routine not yet written (in the tests only), and a routine of
//   one group calls another's as P.x. A place entered from elsewhere that is not a label (a
//   table's entry into the middle of a routine) is a function of its own, named by its routine and
//   its address.
// - A routine that waits (a HALT, a loop polling the keys), or calls one that does, is a
//   generator: it yields where time passes, as kit/spectrum/lockstep.js describes ({ halt: true }
//   after a HALT, a bare yield for each turn of a polling loop, { cp: a } at a checkpoint of the
//   main loop), and is called with yield*. P.GEN lists them.
// - P.jump(a, r) runs the routine at a, for the game's jumps through a table: P.CODE names each
//   routine's address (below $C000 and in bank 3, where every table points).
// - A new game, which the game starts by jumping to $85E2 with the stack reset, throws P.RESTART
//   once it has set the game up; P.program catches it and enters the main loop afresh.
// - A byte the interrupt writes and the main program reads is read through P.irqByte(a): on the
//   page that is M[a]; in the lockstep it is what the game's code read there.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
const RESTART = { restart: true, toString: () => 'new game' };

// The 128's banks behind P.M (kit/spectrum/machine.js's Banks128, for the page).
class Banks {
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

function makePort(M, io, opts = {}) {
  const P = { M, GEN: new Set(), CODE: {}, CODE3: {}, RESTART };
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.mem = opts.mem || null;
  // counts of the work inside routines whose length varies, for the page's pacing
  // (scripts/time-stretches.js, page/runtime.js): bytes an LDIR copies, a window's rows and bytes,
  // the characters redrawn behind a window and those of them drawn whole, a sprite's rows and the
  // shifts of each, and the characters of scenery a sprite's visibility mask is cut by
  P.N = { byte: 0, wrow: 0, wbyte: 0, cell: 0, glyph: 0, row24: 0, shift24: 0, row16: 0, shift16: 0, mcell: 0, cut: 0 };
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  P.w = a => M[a] | M[(a + 1) & 0xFFFF] << 8;
  P.setw = (a, v) => { M[a] = v & 255; M[(a + 1) & 0xFFFF] = (v >> 8) & 255; };
  // where the screen paged in at $C000 lives: bank 5 at $4000, or bank 7 at $C000
  P.hidden = () => (P.mem.paged === 5 ? 0x4000 : 0xC000);
  // name a routine: its address, its function; a generator is listed in GEN
  P.def = (a, name, f, bank3) => {
    P[name] = f;
    (a >= 0xC000 && bank3 !== false ? P.CODE3 : P.CODE)[a] = name;
    if (f.constructor.name === 'GeneratorFunction') P.GEN.add(name);
    return f;
  };
  const nameAt = a => (a >= 0xC000 ? P.CODE3[a] : P.CODE[a]);
  P.jump = (a, r) => {
    const name = nameAt(a);
    if (name && P.GEN.has(name)) throw new Error('P.jump: $' + a.toString(16) + ' waits; jumpGen it');
    if (name && P[name]) return P[name](r || {});
    if (P.at) return P.at(a, r || {});
    throw new Error('the port has no routine at $' + a.toString(16));
  };
  P.jumpGen = function* (a, r) {
    const name = nameAt(a);
    if (name && P.GEN.has(name)) return yield* P[name](r || {});
    return P.jump(a, r);
  };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.WTPort = { makePort, Banks, RESTART };
})(typeof window !== 'undefined' ? window : globalThis);
