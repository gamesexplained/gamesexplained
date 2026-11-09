'use strict';
// A port's loop that never yields, caught by its calls of P.io. Used by the locksteps of the C64,
// the NES and the Spectrum (kit/<platform>/lockstep.js); the C16's hands the port the game's own
// reads and stops at the first one past them, so it needs none.
//
// The port and the lockstep run in one thread. A loop in the port that forgets its yield never
// hands control back, so no check of the lockstep runs again and the session sits with no message,
// as a session that is only slow does; on the page the same loop freezes the tab. The game's own
// loop never does that: its interrupt runs on while it spins, and the key or the line arrives.
// Every loop that waits for a key, the beam or the interrupt reads a chip, or a byte the interrupt
// writes, in each turn, through P.io. So the lockstep counts the port's calls of P.io between two
// of its yields and throws past a limit, naming the address read most in the last calls: the one
// the loop polls. A loop on a byte of RAM alone, read from P.M with no call of P.io, is not caught.
//
//   const guard = new SpinGuard('Lockstep', limit);   // limit: LIMIT unless given
//   guard.wrap(io, ['read', 'write']);               // in place: each named function is counted
//   guard.reset();                                   // at each yield of the port

const LIMIT = 2000000;      // calls with no yield: a pass of a game makes some thousands
const WINDOW = 65536;       // the last calls, whose addresses the error counts

const hex = a => '$' + (a & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');

class SpinGuard {
  constructor(who, limit) {
    this.who = who;
    this.limit = Math.max(limit || LIMIT, 2);
    this.window = Math.min(WINDOW, this.limit - 1);
    this.n = 0;
    this.seen = null;
  }
  reset() { this.n = 0; this.seen = null; }
  touch(name, a) {
    if (++this.n <= this.limit - this.window) return;
    const k = typeof a === 'number' ? name + '(' + hex(a) + ')' : name + '()';
    if (!this.seen) this.seen = new Map();
    this.seen.set(k, (this.seen.get(k) || 0) + 1);
    if (this.n < this.limit) return;
    let top = '', most = 0;
    for (const [key, c] of this.seen) if (c > most) { top = key; most = c; }
    const n = this.n;
    this.reset();
    throw new Error(this.who + ': the port called P.io ' + n.toLocaleString('en-GB') + ' times with no yield; of the last ' +
      this.window.toLocaleString('en-GB') + ', ' + most.toLocaleString('en-GB') + ' were ' + top +
      '. A loop that waits for a key, the beam or the interrupt yields in every turn, as the game\'s own loop lets the interrupt run');
  }
  wrap(io, names) {
    const guard = this;
    for (const name of names) {
      const f = io[name];
      if (typeof f !== 'function') continue;
      io[name] = function (a, ...rest) { guard.touch(name, a); return f.call(this, a, ...rest); };
    }
    return io;
  }
}

module.exports = { SpinGuard, LIMIT };
