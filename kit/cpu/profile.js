'use strict';
// What each of a game's routines costs it, measured on the game's own code: every instruction the
// kit's machine runs gives its cycles to the routine whose code it is, by the listing's labels
// (kit/skills/core/70-minisite/play.md, "Pace it by the machine's clock"). A fit of costs to the
// lockstep's stretches cannot tell apart routines that always run together, and shares their
// cycles among them in any proportion; this measures each one's own. Checked by
// kit/cpu/test_profile.js, on kit/c64/test_machine.js's program.
//
//   const { Profiler, routines, perCall } = require('kit/cpu/profile.js');
//   const prof = new Profiler({ machine: m, routines: routines('games/c64/<slug>/listing.json'), port: P });
//   new Lockstep({ ..., timing: s => rows.push(Object.assign(s, prof.take())) }).run(...);
//   prof.detach();
//   const cost = perCall(rows);      // { call: { routine: cycles a call }, uncharged, share }
//
// routines(source, { keep }): the table of routines. source is a listing.json (its path, or the
// file parsed), a list of them for a game of several parts that do not share addresses, or
// [[address, name], ...]. A routine is a labelled instruction, and it owns the addresses from
// there to the next one; the labels listing.py gives a branch's target by itself (b_1234) are
// left out, and keep(record) chooses otherwise.
//
// new Profiler(options):
// - machine: the kit's machine (kit/c64/machine.js and those like it): its cpu, and its depth,
//   the interrupts under way. Or cpu and inInterrupt() for one that has no depth. The processor
//   is one with step(), pc and cycles (kit/cpu/cpu6502.js) or tstates (kit/spectrum/z80.js).
// - routines: the table.
// - port (the port's object P) or owned (a list of names): the routines the port calls. With
//   either, a label the port does not call (a point a routine resumes at after a call, a tail
//   several routines jump into, a routine the port folded into its caller) gives its cycles to
//   the routine the port does call that the processor entered last before it, which on the page
//   is called as often. Without, every label keeps its own.
// - place(cpu): where an instruction's cycles go when the program counter does not say. It
//   returns an address (looked up in the table: for an interpreter, the address of the bytecode
//   it is running), a name (cycles that are nobody's routine but have a cost of their own, such
//   as a gateway every call passes through), null (left out: a wait the page waits for itself)
//   or undefined (the program counter, as without place).
//
// What is counted. The cycles between two instructions (the video chip's holds, a hook's
// stand-in) go with the instruction that follows them. An interrupt's cycles, its entry
// included, are kept apart (irq): a page runs its interrupts on its own clock. An entry is the
// program counter reaching a routine's first instruction outside an interrupt, so a routine
// that begins with the head of a loop is entered once a turn.
//
// take(): what was counted since the last take, then counted from zero: { self: { name: cycles },
// entries: { name: count }, irq, left, total }, where total = the sum of self + irq + left, the
// machine's cycles over that time. detach() puts the processor's step back.
//
// perCall(rows, { calls }): each routine's cycles a call over rows that hold self and the
// lockstep's calls (the port's own count of its calls, which is how often the page will charge
// it; calls(row) gives another count). uncharged lists the cycles of routines no row called,
// and share is the part of all the routines' cycles they are: cycles the page would never pay,
// so a page that runs early has its reason here.
const fs = require('fs');

const BRANCH = /^b_[0-9A-F]{4}$/;

function routines(source, opts = {}) {
  const keep = opts.keep || (r => !BRANCH.test(r.l));
  const pairs = [];
  const add = s => {
    if (typeof s === 'string') s = JSON.parse(fs.readFileSync(s, 'utf8'));
    if (Array.isArray(s) && s.length && Array.isArray(s[0]) && typeof s[0][0] === 'number') { pairs.push(...s); return; }
    if (Array.isArray(s)) { s.forEach(add); return; }
    for (const r of s.records) if (r.t === 'code' && r.l && keep(r)) pairs.push([r.a, r.l]);
  };
  add(source);
  pairs.sort((a, b) => a[0] - b[0]);
  const seen = new Map();
  for (const [a, n] of pairs) {
    if (seen.has(a) && seen.get(a) !== n) throw new Error(`profile: $${a.toString(16)} is both ${seen.get(a)} and ${n}: parts that share addresses need a table each, chosen in place()`);
    seen.set(a, n);
  }
  const at = [...seen.keys()], name = [...seen.values()];
  const size = Math.max(0x10000, at.length ? at[at.length - 1] + 1 : 0);
  const index = new Int32Array(size).fill(-1);
  for (let i = 0; i < at.length; i++) index.fill(i, at[i], i + 1 < at.length ? at[i + 1] : size);
  return { at, name, index, entry: new Map(at.map((a, i) => [a, i])) };
}

class Profiler {
  constructor(o) {
    const m = this.machine = o.machine || null;
    this.cpu = o.cpu || (m && m.cpu);
    if (!this.cpu || typeof this.cpu.step !== 'function') throw new Error('profile: needs a machine, or a cpu with step()');
    this.inInterrupt = o.inInterrupt || (m && typeof m.depth === 'number' ? () => m.depth > 0 : null);
    if (!this.inInterrupt) throw new Error('profile: this machine has no depth: give inInterrupt(), true while an interrupt runs');
    this.table = o.routines;
    if (!this.table || !this.table.index) throw new Error('profile: routines is the table routines() makes');
    this.place = o.place || null;
    const owned = o.owned || (o.port ? Object.keys(o.port).filter(k => typeof o.port[k] === 'function') : null);
    this.owned = owned ? new Set(owned) : null;
    this.clock = 'cycles' in this.cpu ? c => c.cycles : c => c.tstates;
    this.owner = null;
    this.reset();
    this.attach();
  }

  reset() {
    this.self = Object.create(null); this.entries = Object.create(null);
    this.irq = 0; this.left = 0;
  }

  // the routine an instruction at the program counter belongs to: a name, or null for none
  where() {
    const cpu = this.cpu, t = this.table;
    let a = cpu.pc;
    if (this.place) {
      const p = this.place(cpu);
      if (p === null) return null;
      if (typeof p === 'string') return p;
      if (p !== undefined) a = p;
    }
    const i = a >= 0 && a < t.index.length ? t.index[a] : -1;
    if (i < 0) return null;
    const n = t.name[i];
    if (this.owned === null || this.owned.has(n)) return n;
    return this.owner === null ? n : this.owner;
  }

  attach() {
    const self = this, cpu = this.cpu, m = this.machine, step = cpu.step, clock = this.clock, t = this.table;
    this.last = clock(cpu);
    this.wasIrq = false;
    this.unwrapped = Object.prototype.hasOwnProperty.call(cpu, 'step') ? step : null;
    cpu.step = function () {
      const before = clock(cpu), gap = before - self.last, irq = self.inInterrupt();
      let k = null;
      if (!irq) {
        const i = t.entry.get(cpu.pc);
        if (i !== undefined) {
          const n = t.name[i];
          self.entries[n] = (self.entries[n] || 0) + 1;
          if (self.owned === null || self.owned.has(n)) self.owner = n;
        }
        k = self.where();
      }
      const r = step.apply(this, arguments);
      const own = clock(cpu) - before;
      self.last = before + own;
      // what came between the last instruction and this one is an interrupt's when either is one
      // (its entry, the KERNAL's way out of it), and otherwise goes with this instruction
      if (irq) self.irq += gap + own;
      else {
        const mine = self.wasIrq ? own : gap + own;
        if (self.wasIrq) self.irq += gap;
        if (k === null) self.left += mine; else self.self[k] = (self.self[k] || 0) + mine;
      }
      self.wasIrq = irq;
      return r;
    };
    this.wrapper = cpu.step;
    // an interrupt that runs no instruction of its own (the KERNAL's, a hook standing in for all
    // of it) is seen only where the machine takes it
    if (m && typeof m.take === 'function') {
      const take = m.take;
      this.untake = Object.prototype.hasOwnProperty.call(m, 'take') ? take : null;
      m.take = function () { self.wasIrq = true; return take.apply(this, arguments); };
      this.taker = m.take;
    }
  }

  detach() {
    if (this.cpu.step !== this.wrapper) throw new Error('profile: another wrapper is on the processor\'s step; take that one off first');
    if (this.unwrapped) this.cpu.step = this.unwrapped; else delete this.cpu.step;
    if (this.taker && this.machine.take === this.taker) { if (this.untake) this.machine.take = this.untake; else delete this.machine.take; }
  }

  take() {
    // cycles since the last instruction (an interrupt just taken, a hold) are counted at the next
    const self = Object.assign({}, this.self), entries = Object.assign({}, this.entries);
    const total = Object.values(self).reduce((s, v) => s + v, 0) + this.irq + this.left;
    const out = { self, entries, irq: this.irq, left: this.left, total };
    this.reset();
    return out;
  }
}

function perCall(rows, opts = {}) {
  const calls = opts.calls || (r => r.calls || {});
  const cycles = Object.create(null), count = Object.create(null);
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.self || {})) cycles[k] = (cycles[k] || 0) + v;
    for (const [k, v] of Object.entries(calls(r))) count[k] = (count[k] || 0) + v;
  }
  const call = {}, uncharged = {};
  let all = 0, lost = 0;
  for (const k of Object.keys(cycles).sort()) {
    all += cycles[k];
    if (count[k]) call[k] = Math.round(cycles[k] / count[k] * 10) / 10;
    else { uncharged[k] = cycles[k]; lost += cycles[k]; }
  }
  return { call, uncharged, share: all ? lost / all : 0 };
}

module.exports = { Profiler, routines, perCall };
