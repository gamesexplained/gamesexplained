// Lords of Chaos's port: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (LOCGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the 64 KB the Z80 sees, read and written at the game's addresses, self-modified
//   operands included. The engine stays at $4000-$D002 for the whole game; $D003 up holds the part
//   loaded last: the wizard designer (P.part 0) or scenario 1, 2 or 3, whose routines differ and
//   share addresses. P.part says which, and P.jump goes to that part's routine at an address there.
// - P.io is the machine around the processor: in(port) (the keyboard, the Kempston joystick, the
//   tape's EAR bit), out(port, v) (the border and the speaker), irqByte(a), readR() (the
//   refresh register, the one place the game reads it, $A738), readAt(a) (a byte random_below
//   reads as it walks through memory), and tape, the cassette the ROM's tape routines save to and
//   load from.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with, and it
//   returns the registers its callers read. The registers are a, f, b, c, d, e, h, l, ix, iy and
//   af_, bc_, de_, hl_; a pair may also be given and read as bc, de or hl, and a flag as zf, cf,
//   sf or pf, a boolean. That is the tests' stand-in's form (port/test/standin.js), so the game's
//   own code can stand in for any routine not yet written (in the tests only).
// - A routine that waits (a loop reading the controls, the ROM's KEY-SCAN, the HALT), or calls one
//   that does, is a generator: it yields where time passes, as kit/spectrum/lockstep.js describes
//   ({ cp: a } at each read of the controls and of the keyboard, { halt: true } at the HALT,
//   { tstates: n } for a delay loop's time), and is called with yield*. P.GEN lists them.
// - P.jump(a, r) runs the routine at a, for the game's jumps through a table: P.CODE names each
//   engine routine's address, P.UP[part] each of the upper part's.
// - A byte the interrupt writes and the main program reads is read through P.irqByte(a): on the
//   page that is M[a]; in the lockstep it is what the game's code read there.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

function makePort(M, io, opts = {}) {
  const P = { M, GEN: new Set(), CODE: {}, UP: { 0: {}, 1: {}, 2: {}, 3: {} }, part: 0 };
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  // counts of the work inside routines whose length varies, for the page's pacing
  P.N = {};
  // the interrupts on or off (the game's EI and DI), for the page, which runs the interrupt only
  // while they are on
  P.IFF = false;
  // the interrupt mode: 1 at the hand-over and in the file panels (the ROM's handler, which the game
  // never lets run), 2 in play (the vector table at $FE00, to $FFFF)
  P.IM = 1;
  P.NI = {};
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // a byte the interrupt writes, read by the main program through irqByte and by the interrupt's
  // own code (P.inIrq, set while it runs) from memory
  P.inIrq = false;
  P.ib = a => (P.inIrq ? M[a] : P.irqByte(a));
  P.readR = () => (IO.readR ? IO.readR() : 0);
  P.readAt = a => (IO.readAt ? IO.readAt(a) : M[a]);
  P.w = a => M[a] | M[(a + 1) & 0xFFFF] << 8;
  P.setw = (a, v) => { M[a] = v & 255; M[(a + 1) & 0xFFFF] = (v >> 8) & 255; };
  // name a routine: its address, its function; a generator is listed in GEN. An address from $D003
  // up belongs to the parts given (0 the designer, 1 to 3 the scenarios).
  P.def = (a, name, f, parts) => {
    P[name] = f;
    if (a >= 0xD003 && parts) for (const n of parts) P.UP[n][a] = name;
    else P.CODE[a] = name;
    if (f.constructor.name === 'GeneratorFunction') P.GEN.add(name);
    return f;
  };
  P.nameAt = a => (a >= 0xD003 ? P.UP[P.part][a] : P.CODE[a]);
  P.jump = (a, r) => {
    const name = P.nameAt(a);
    if (name && P.GEN.has(name)) throw new Error('P.jump: $' + a.toString(16) + ' waits; jumpGen it');
    if (name && P[name]) return P[name](r || {});
    if (P.at) return P.at(a, r || {});
    throw new Error('the port has no routine at $' + a.toString(16) + (a >= 0xD003 ? ' in part ' + P.part : ''));
  };
  P.jumpGen = function* (a, r) {
    const name = P.nameAt(a);
    if (name && P.GEN.has(name)) return yield* P[name](r || {});
    if (!name && P.atGen) return yield* P.atGen(a, r || {});
    return P.jump(a, r);
  };
  // A routine that moves the stack to start again (the file panel, the turn loop, the designer)
  // throws P.Restart, with the routine to run; P.run runs a routine, and the one each throw names,
  // for ever, as the page's main program does.
  P.Restart = class Restart { constructor(to, r) { this.to = to; this.r = r || {}; } };
  P.restart = (to, r) => { throw new P.Restart(to, r); };
  P.run = function* (to, r) {
    for (;;) {
      try { return yield* P.jumpGen(typeof to === 'number' ? to : P.addressOf(to), r || {}); }
      catch (e) { if (!(e instanceof P.Restart)) throw e; to = e.to; r = e.r; }
    }
  };
  // A routine that drops return addresses from the stack to leave its callers (END MOVE leaving
  // select mode, END TURN leaving the turn's loop) throws P.Unwind: n the addresses dropped, its
  // own first, and the registers it leaves. A routine the game calls, and which such a drop can
  // pass through, is made with P.frame: each drop takes one, and the routine whose address is the
  // last dropped returns to its caller with those registers, or, when the drop ends in a jump
  // (then, an address: RIDE starting select mode again), goes there instead. A routine reached by a
  // jump (P.jump, a table) is part of the frame of the routine that jumped, and is not made with
  // P.frame.
  P.Unwind = class Unwind { constructor(n, r, then) { this.n = n; this.r = r || {}; this.then = then; } };
  P.unwind = (n, r, then) => { throw new P.Unwind(n, r, then); };
  const caught = e => { if (e instanceof P.Unwind && --e.n === 0) return e; throw e; };
  P.frame = f => (f.constructor.name === 'GeneratorFunction'
    ? function* (r) {
      let e;
      try { return yield* f(r); } catch (x) { e = caught(x); }
      return e.then === undefined ? e.r : yield* P.jumpGen(e.then, e.r);
    }
    : function (r) {
      let e;
      try { return f(r); } catch (x) { e = caught(x); }
      return e.then === undefined ? e.r : P.jump(e.then, e.r);
    });
  P.addressOf = name => {
    for (const [a, n] of Object.entries(P.CODE)) if (n === name) return +a;
    for (const [a, n] of Object.entries(P.UP[P.part])) if (n === name) return +a;
    throw new Error('the port has no routine ' + name);
  };
  // call a routine by name, with yield* when it waits
  P.cw = function* (name, r) { return P.GEN.has(name) ? yield* P[name](r || {}) : P[name](r || {}); };
  // run a routine that waits as one that cannot: it must not yield
  P.sync = g => { const y = g.next(); if (!y.done) throw new Error('P.sync: it yielded'); return y.value; };
  // the T-states of the game's own work in a routine that cannot yield (a delay loop, a sound), for
  // the page's clock. A routine that yields time already counted here (a sound played in a wait)
  // yields { tstates, clocked: true }, which the lockstep runs the game for and the page does not
  // count again.
  P.T = 0;
  P.clock = n => { P.T += n; };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.LOCPort = { makePort };
})(typeof window !== 'undefined' ? window : globalThis);
