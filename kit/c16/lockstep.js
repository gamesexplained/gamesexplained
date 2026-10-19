'use strict';
// A port of a whole Commodore 16 game checked against the game's own code, pass by pass
// (kit/skills/core/70-minisite/play.md, "A whole game, checked against its own code"). The game
// runs on the kit's C16 (kit/c16/machine.js) while the port runs beside it on its own copy of the
// game's memory. The game goes first: it runs on to its main program's next checkpoint, with the
// interrupts it takes on the way and the ones those let in, and the lockstep keeps what each part
// of the run did with the chips and with memory. Then the port runs to the same place and is given
// the same: its reads of the chips get the values the game's got, its writes to them are held to
// the game's, and each interrupt the game took runs in the port at the port's next yield, in the
// part of the program it came in. At the start of every pass the two memories are compared.
// Checked by kit/c16/test_lockstep.js.
//
// The port's side. A port is an object P of routines on the game's memory:
// - P.M, the game's memory (a Uint8Array(65536), the C16's 16 KB at $0000-$3FFF), read and written
//   at the game's addresses. The lockstep fills it from the machine's RAM when it is made.
// - P.io, which the lockstep sets (members it does not define are kept):
//     read(a)       a chip's register, $FD00-$FF3F: in turn, the values the game read there
//     write(a, v)   a write to one, held to the game's: address and value, in turn
//     irqByte(a)    a byte of RAM an interrupt writes and the main program reads (irqBytes below)
//     sei(), cli()  the interrupt flag, for the page's runtime; nothing here
//   The port reads P.io when it runs, not when it is built.
// - The main program, a generator (program below), which yields:
//     { cp: a }     the game's program counter has reached the checkpoint a in the main program: a
//                   JSR the main loop makes, the instruction after a loop that polls
//     { cycles: n } n cycles of the game's own work that the port does not do (a delay loop): for
//                   the page's clock; the lockstep only adds them up (declared, under timing)
//     POLL          one turn of a polling loop, a loop that waits for an interrupt to change a byte
//                   (anything else is one): the next interrupt the game took runs here
// - The interrupt handlers, one for each address the game's handler starts at (irqs): functions,
//   or generators that yield { cp: a } where the game's handler passes a checkpoint, so that an
//   interrupt that comes in the middle of a handler (one that clears the I flag) runs there.
//
// const { Machine, loadListing } = require('kit/c16/machine.js');
// const { Lockstep, POLL, describe } = require('kit/c16/lockstep.js');
// const m = new Machine({ ram: loadListing('games/c16/<slug>/listing.json'), pc: 0x1800, passAt: 0x1852 });
// const ls = new Lockstep({ machine: m, port: P, program: P => P.start(), irqs: { 0x1991: 'irq_play' },
//   checkpoints: [0x184C, 0x1852, 0x1858, 0x186F] });
// const r = ls.run({ passes: 1000, onPass: (n, m) => { m.joy = input[n]; } });
// console.log(describe(r));
//
// Options:
// - machine: the game, at the start of its main program's stretch to a checkpoint: stopped at a
//   checkpoint by an earlier run, or anywhere outside an interrupt (a cold start, the hand-over:
//   the port's program starts there too). passAt is the machine's unless given.
// - port: P. program(P) gives the port's main program, made once.
// - checkpoints: every address the port yields as one, in the main program and in the handlers.
//   The game's main program stops at the first it reaches outside an interrupt, and the port must
//   yield the same next; one the game's handler passes, the port's handler must yield in turn.
// - irqs: { handler address: a function, or the name of one of P's }.
// - What the port is given. Each part of the run (the main program's stretch, each interrupt) has
//   its own reads and writes of the chips, in the order the game made them, and a handler is
//   given the game's in its turn, whatever it interrupted. An interrupt runs at the port's next
//   yield in the part it came in, the place the game reached by then, so the port has run its
//   stretch on, and a handler runs on the memory the game's handler saw: each byte it read before
//   writing it is set to the value it read (its instructions' operands among them), and goes back
//   to the port's after, unless the interrupt or one it let in wrote it. A byte an interrupt wrote
//   that the part it came in wrote again afterwards gets back the port's value: the last writer of
//   each byte is the game's. What no replay can give is the code that was interrupted reading, in
//   the middle of its stretch, what the interrupt wrote: those are the game's own races (the skill
//   says how to show one), and irqBytes takes the commonest.
// - irqBytes: addresses of RAM an interrupt writes and the main program reads (a frame counter,
//   the controls an interrupt reads). The port reads each through P.io.irqByte(a) in the main
//   program and gets, in turn, the values the game's main program read of it in the same stretch;
//   at a POLL, once the interrupt has run, the ones the game read before that interrupt are passed
//   over, so a polling loop reads the game's values whether it turns once or a thousand times (a
//   read past them all, the port's own byte). In a handler irqByte reads P.M.
// - compare: the RAM ranges compared at the start of every pass, [first, last] with both included
//   (default $0002-$00FF and $0200-$3FFF: the 7501's port and the stack page are not a port's).
//   ignore: addresses and ranges left out, for a race shown, not guessed (the skill). every: true
//   compares at every checkpoint of the main program, not only at a pass's start.
// - timing(part): called for every part of the run once the port has run it, with { pass, kind,
//   at, from, to, cycles, declared, calls, marks, stretches }: kind 'main' for the main program's
//   stretch from the checkpoint from to to, 'irq' for an interrupt whose handler starts at at;
//   cycles, the game's cycles in the part with the interrupts it let in taken out (an interrupt's
//   own include the processor's seven and the KERNAL's way in); declared, the cycles the port's
//   { cycles } yields gave in it; calls, how often the port called each of P's
//   functions in it (P's functions are wrapped to count them when the lockstep is made); for an
//   interrupt, marks, its own cycles at each checkpoint it passed, and stretches, the calls between
//   them. These are the rows of the pacing fit.
// - maxFrames: how long the game may run to its next checkpoint (default 500).
//
// run({ passes, onPass, stopOnDiff }) runs until passes more passes have started (default 1) and
// returns { passes, ok, diffs, diverged, frames }. At the start of each pass, once the port has
// caught up, memory is compared, and then onPass(n, machine, lockstep) runs: the place to set the
// pass's input on the machine (keys, joy): the port reads it through the game's reads. A pass whose
// start differs is in diffs, { pass, frame, count, bytes: [{ address, game, port }] } (the first
// 64 bytes); the run stops there (the default), or with stopOnDiff: false copies the game's memory
// to the port's and goes on (resync() does the same). A divergence ends the run: diverged says why
// and where, the part of the program and the pass ({ why, pass, frame, line }). passes counts pass
// starts, but not the one the lockstep was made at. describe(result) gives a result as lines.
//
// While a lockstep runs it owns the machine: it hooks the checkpoints, takes onIrq, onRti, ioRead,
// ioWrite and the simulator's maps of what the processor reads, writes and runs, and puts them back
// when run returns.
const POLL = Object.freeze({ poll: true });
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const LIST = 64;                                   // differing bytes kept per pass
const OPLEN = (() => {                             // each opcode's length in bytes
  const { OPCODES } = require('../cpu/cpu6502.js');
  return Uint8Array.from(OPCODES, ([, mode]) => mode === 'imp' || mode === 'acc' ? 1 : ['abs', 'abx', 'aby', 'ind'].includes(mode) ? 3 : 2);
})();
const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
const isChip = a => a >= 0xFD00 && a < 0xFF40;

class Diverged extends Error {}

// The RAM compared, compare's ranges less ignore's, as runs [first, last].
function ranges(o) {
  const keep = new Uint8Array(0x4000), runs = [];
  for (const [a, b] of o.compare || [[0x0002, 0x00FF], [0x0200, 0x3FFF]]) keep.fill(1, a, Math.min(b, 0x3FFF) + 1);
  for (const x of o.ignore || []) if (Array.isArray(x)) keep.fill(0, x[0], x[1] + 1); else keep[x] = 0;
  for (let a = 0; a < 0x4000; a++) {
    if (!keep[a]) continue;
    let b = a;
    while (b < 0x3FFF && keep[b + 1]) b++;
    runs.push([a, b]);
    a = b;
  }
  return runs;
}
const view = (u, a, b) => Buffer.from(u.buffer, u.byteOffset + a, b - a + 1);
function differ(R, M, runs) {
  const bytes = [];
  let count = 0;
  for (const [a, b] of runs) {
    if (Buffer.compare(view(R, a, b), view(M, a, b)) === 0) continue;
    for (let i = a; i <= b; i++) if (M[i] !== R[i]) { if (bytes.length < LIST) bytes.push({ address: i, game: R[i], port: M[i] }); count++; }
  }
  return count ? { count, bytes } : null;
}
function bytesLine(d) {
  const shown = d.bytes.slice(0, 8).map(b => hex(b.address) + ' game ' + hex(b.game, 2) + ' port ' + hex(b.port, 2));
  return d.count + (d.count === 1 ? ' byte differs: ' : ' bytes differ: ') + shown.join(', ') + (d.count > shown.length ? ', ...' : '');
}

// A part of the game's run: the main program's stretch to a checkpoint (at -1), or an interrupt
// whose handler starts at at. events: { cp } and { child } in order; reads and writes of the chips
// as address, value, address, value ...; seen, the bytes it read before writing them, with the
// values; wrote, the bytes it wrote, each with the number of the write; all, those and its
// interrupts' (at its end); irqb, the main program's reads of irqBytes.
function part(at, cycles, seq) {
  return { at, events: [], reads: [], writes: [], seen: new Map(), wrote: new Map(), all: null, irqb: new Map(),
    cycles0: cycles, child: 0, cycles: 0, own: 0, start: seq, end: seq, marks: [], ri: 0, wi: 0, ib: null,
    calls: {}, stretches: [], declared: 0 };
}

class Lockstep {
  constructor(o = {}) {
    const m = o.machine, P = o.port;
    if (!m || !m.cpu || !m.beam) throw new Error('Lockstep: no machine (kit/c16/machine.js)');
    if (!P || !(P.M instanceof Uint8Array) || P.M.length !== 65536) throw new Error('Lockstep: the port has no P.M of 64 KB');
    if (typeof o.program !== 'function') throw new Error('Lockstep: program(P) gives the port\'s main program');
    if (m.depth) throw new Error('Lockstep: the machine is in an interrupt; start it in the main program');
    this.m = m; this.P = P;
    this.passAt = o.passAt !== undefined ? o.passAt & 0xFFFF : m.passAt;
    if (this.passAt === null || this.passAt === undefined) throw new Error('Lockstep: no passAt, on the machine or given');
    this.cps = new Set((o.checkpoints || []).map(a => a & 0xFFFF));
    this.cps.add(this.passAt);
    this.irqs = o.irqs || {};
    this.irqBytes = new Set((o.irqBytes || []).map(a => a & 0xFFFF));
    this.maxFrames = o.maxFrames || 500;
    this.every = !!o.every;
    this.runs = ranges(o);
    this.timing = o.timing || null;
    P.M.set(m.ram);
    P.io = Object.assign({}, P.io, this.makeIO());
    this.counter = null;                           // the calls being counted, or null
    if (this.timing) this.countCalls();
    this.it = o.program(P);
    if (!this.it || typeof this.it.next !== 'function') throw new Error('Lockstep: program(P) gave no generator');
    this.at = this.cps.has(m.cpu.pc) ? m.cpu.pc : -1;   // the checkpoint the game stands at
    this.resume = -1; this.stopAt = -1;
    this.seq = 0;                                  // writes to RAM, numbered
    this.stack = null; this.cur = null; this.saved = null;
    this.passes = 0; this.from = this.at;
  }

  // --- the port's io ---
  makeIO() {
    const ls = this;
    return {
      read(a) {
        const q = ls.cur, i = q.ri;
        a &= 0xFFFF;
        if (i >= q.reads.length) throw new Diverged(ls.where(q) + ': the port read ' + hex(a) + ', and the game read no more');
        if (q.reads[i] !== a) throw new Diverged(ls.where(q) + ': the port read ' + hex(a) + ' where the game read ' + hex(q.reads[i]));
        q.ri += 2;
        return q.reads[i + 1];
      },
      write(a, v) {
        const q = ls.cur, i = q.wi;
        a &= 0xFFFF; v &= 0xFF;
        if (i >= q.writes.length) throw new Diverged(ls.where(q) + ': the port wrote ' + hex(v, 2) + ' to ' + hex(a) + ', and the game wrote no more');
        if (q.writes[i] !== a || q.writes[i + 1] !== v) {
          throw new Diverged(ls.where(q) + ': the port wrote ' + hex(v, 2) + ' to ' + hex(a) + ' where the game wrote ' +
            hex(q.writes[i + 1], 2) + ' to ' + hex(q.writes[i]));
        }
        q.wi += 2;
      },
      irqByte(a) {
        const q = ls.cur;
        a &= 0xFFFF;
        if (q.at >= 0) return ls.P.M[a];
        if (!ls.irqBytes.has(a)) throw new Diverged('the port read ' + hex(a) + ' through irqByte, and it is not in irqBytes');
        const r = q.irqb.get(a), i = q.ib.get(a) || 0;
        if (!r || i >= r.v.length) return ls.P.M[a];
        q.ib.set(a, i + 1);
        return r.v[i];
      },
      sei() {}, cli() {},
    };
  }
  where(q) { return q.at < 0 ? 'the main program on its way to ' + hex(q.stop) : 'the interrupt at ' + hex(q.at); }

  // Count the calls of every one of P's functions (for timing), into the part the port is running.
  countCalls() {
    const P = this.P, ls = this;
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      const count = () => { const c = ls.counter; if (c) c[name] = (c[name] || 0) + 1; };
      P[name] = f instanceof GENERATOR ? function* (...a) { count(); return yield* f.apply(this, a); }
        : function (...a) { count(); return f.apply(this, a); };
    }
  }

  // --- the game, hooked for the length of a run ---
  attach() {
    const m = this.m, cpu = m.cpu, ls = this;
    const s = this.saved = { hooks: {}, onPass: m.onPass, onIrq: m.onIrq, onRti: m.onRti,
      ioRead: Object.prototype.hasOwnProperty.call(m, 'ioRead') ? m.ioRead : undefined,
      ioWrite: Object.prototype.hasOwnProperty.call(m, 'ioWrite') ? m.ioWrite : undefined,
      reads: cpu.reads, writes: cpu.writes, executed: cpu.executed };
    m.onPass = null;
    const top = () => ls.stack[ls.stack.length - 1];
    m.onIrq = (mm, entry) => {
      const q = part(entry, mm.irqStart, ls.seq);
      top().events.push({ child: q });
      ls.stack.push(q);
    };
    m.onRti = () => {
      if (ls.stack.length < 2) return;             // an RTI with no interrupt of the run's to end
      const q = ls.stack.pop(), p = top();
      q.cycles = cpu.cycles - q.cycles0; q.own = q.cycles - q.child; p.child += q.cycles;
      q.end = ls.seq;
      q.all = new Set(q.wrote.keys());
      for (const e of q.events) if (e.child) for (const a of e.child.all) q.all.add(a);
    };
    for (const a of this.cps) {
      const prev = m.hooks[a];
      s.hooks[a] = prev;
      m.hooks[a] = c => {
        if (ls.stack.length > 1) {                 // in an interrupt
          const q = top();
          q.events.push({ cp: a });
          q.marks.push(cpu.cycles - q.cycles0 - q.child);
          return prev ? prev(c) : false;
        }
        if (ls.resume === a) { ls.resume = -1; return prev ? prev(c) : false; }
        ls.stopAt = a;
        return true;
      };
    }
    const ioRead = m.ioRead, ioWrite = m.ioWrite;
    m.ioRead = function (a) { const v = ioRead.call(this, a); if (isChip(a)) top().reads.push(a, v); return v; };
    m.ioWrite = function (a, v) { if (isChip(a)) top().writes.push(a, v); return ioWrite.call(this, a, v); };
    // RAM as the processor reads, writes and runs it, the stack page left out
    const ram = m.ram, B = this.irqBytes;
    const fold = k => { const a = +k; return a < 0x8000 ? a & 0x3FFF : -1; };
    cpu.reads = new Proxy({}, { set(t, k) {
      const a = fold(k);
      if (a < 0 || (a >> 8) === 1) return true;
      const q = top();
      if (q.at < 0) {
        if (B.has(a)) {
          let r = q.irqb.get(a);
          if (!r) q.irqb.set(a, r = { k: [], v: [] });
          r.k.push(q.events.length); r.v.push(ram[a]);
        }
      }
      else if (!q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, ram[a]);
      return true;
    } });
    cpu.writes = new Proxy({}, { set(t, k) {
      const a = fold(k);
      if (a >= 0 && (a >> 8) !== 1) top().wrote.set(a, ++ls.seq);
      return true;
    } });
    cpu.executed = new Proxy({}, { set(t, k) {
      const q = top(), pc = +k;
      if (q.at < 0 || pc >= 0x8000) return true;
      for (let i = 1, n = OPLEN[ram[pc & 0x3FFF]]; i < n; i++) {
        const b = (pc + i) & 0x3FFF;
        if (!q.seen.has(b) && !q.wrote.has(b)) q.seen.set(b, ram[b]);
      }
      return true;
    } });
  }
  detach() {
    const m = this.m, s = this.saved;
    if (!s) return;
    for (const a of Object.keys(s.hooks)) { if (s.hooks[a]) m.hooks[a] = s.hooks[a]; else delete m.hooks[a]; }
    m.onPass = s.onPass; m.onIrq = s.onIrq; m.onRti = s.onRti;
    if (s.ioRead) m.ioRead = s.ioRead; else delete m.ioRead;
    if (s.ioWrite) m.ioWrite = s.ioWrite; else delete m.ioWrite;
    m.cpu.reads = s.reads; m.cpu.writes = s.writes; m.cpu.executed = s.executed;
    this.saved = null;
  }

  // Run the game on to its main program's next checkpoint: the stretch, as a part.
  record() {
    const m = this.m, rec = part(-1, m.cpu.cycles, this.seq);
    this.stack = [rec];
    this.stopAt = -1;
    if (this.at >= 0) this.resume = this.at;
    const end = m.frames + this.maxFrames;
    while (this.stopAt < 0) {
      if (m.frames >= end) {
        const inside = this.stack.length > 1 ? ', inside the interrupt at ' + hex(this.stack[1].at) : '';
        throw new Diverged('the game reached no checkpoint in ' + this.maxFrames + ' frames after ' +
          (this.at >= 0 ? hex(this.at) : 'the start') + inside + ' (it is at ' + hex(m.cpu.pc) + ')');
      }
      m.runTicks(8 * 114);
    }
    rec.stop = this.stopAt;
    rec.cycles = m.cpu.cycles - rec.cycles0; rec.own = rec.cycles - rec.child;
    rec.end = this.seq;
    rec.ib = new Map();
    this.at = this.stopAt;
    return rec;
  }

  // --- the port, run through what the game did ---
  next(it) {
    try { return it.next(); } catch (e) { if (e instanceof Diverged) throw e; throw this.annotate(e); }
  }
  annotate(e) {
    e.message = 'Lockstep: the port threw in ' + (this.cur ? this.where(this.cur) : 'its program') + ', pass ' + this.passes + ': ' + e.message;
    return e;
  }
  // The port's main program, through the game's stretch rec to its checkpoint.
  replayMain(rec) {
    this.cur = rec;
    this.counter = this.timing ? rec.calls : null;
    let k = 0;
    for (;;) {
      const y = this.next(this.it);
      if (y.done) throw new Diverged('the port\'s main program returned; the game went on to ' + hex(rec.stop));
      const v = y.value;
      if (v && v.cycles !== undefined) { rec.declared += v.cycles; continue; }
      if (v && v.cp !== undefined) {
        while (k < rec.events.length) this.replay(rec.events[k++].child, rec);
        if (v.cp !== rec.stop) throw new Diverged('the port reached ' + hex(v.cp) + ' where the game reached ' + hex(rec.stop));
        this.finished(rec);
        return;
      }
      if (k < rec.events.length) {
        this.replay(rec.events[k++].child, rec);
        // a turn of a polling loop: its next reads of irqBytes are the game's after this interrupt
        for (const [a, r] of rec.irqb) {
          let i = rec.ib.get(a) || 0;
          while (i < r.k.length && r.k[i] < k) i++;
          rec.ib.set(a, i);
        }
        continue;
      }
      throw new Diverged('the port polls on its way to a checkpoint; the game went on to ' + hex(rec.stop) + ' with no interrupt more');
    }
  }
  // The interrupt q in the port: its handler, on the bytes the game's read, then put back.
  replay(q, parent) {
    let f = this.irqs[q.at];
    if (typeof f === 'string') f = this.P[f];
    if (typeof f !== 'function') throw new Diverged('no port handler for the interrupt at ' + hex(q.at) + ' (irqs)');
    const M = this.P.M, keep = [], put = [];
    for (const a of q.all) { const w = parent.wrote.get(a); if (w !== undefined && w > q.end) keep.push(a, M[a]); }
    for (const [a, v] of q.seen) if (M[a] !== v) { put.push(a, M[a]); M[a] = v; }
    const cur = this.cur, counter = this.counter;
    this.cur = q;
    this.counter = this.timing ? q.calls : null;
    try {
      let r;
      try { r = f.call(this.P); } catch (e) { if (e instanceof Diverged) throw e; throw this.annotate(e); }
      const ev = q.events;
      let k = 0;
      if (r && typeof r.next === 'function') {
        for (;;) {
          const y = this.next(r);
          if (y.done) break;
          const v = y.value;
          if (v && v.cycles !== undefined) { q.declared += v.cycles; continue; }
          if (!v || v.cp === undefined) {
            if (k < ev.length && ev[k].child) { this.replay(ev[k++].child, q); continue; }
            throw new Diverged(this.where(q) + ': the port\'s handler polls, and the game\'s took no interrupt more');
          }
          while (k < ev.length && ev[k].child) this.replay(ev[k++].child, q);
          if (k >= ev.length) throw new Diverged(this.where(q) + ': the port\'s handler reached ' + hex(v.cp) + ', and the game\'s returned');
          if (ev[k].cp !== v.cp) throw new Diverged(this.where(q) + ': the port\'s handler reached ' + hex(v.cp) + ' where the game\'s reached ' + hex(ev[k].cp));
          k++;
          if (this.timing) { q.stretches.push(q.calls); q.calls = {}; this.counter = q.calls; }
        }
      }
      while (k < ev.length && ev[k].child) this.replay(ev[k++].child, q);
      if (k < ev.length) throw new Diverged(this.where(q) + ': the game\'s handler passed ' + hex(ev[k].cp) + ', and the port\'s returned');
      this.finished(q);
    } finally { this.cur = cur; this.counter = counter; }
    for (let i = 0; i < put.length; i += 2) if (!q.all.has(put[i])) M[put[i]] = put[i + 1];
    for (let i = 0; i < keep.length; i += 2) M[keep[i]] = keep[i + 1];
    if (this.timing) {
      if (q.stretches.length) { q.stretches.push(q.calls); q.calls = {}; for (const s of q.stretches) for (const n in s) q.calls[n] = (q.calls[n] || 0) + s[n]; }
      this.timing({ pass: this.passes, kind: 'irq', at: q.at, cycles: q.own, declared: q.declared, calls: q.calls, marks: q.marks,
        stretches: q.stretches });
    }
  }
  // A part the port has run to its end: every read and write of the chips the game made is made.
  finished(q) {
    if (q.ri < q.reads.length) throw new Diverged(this.where(q) + ': the game read ' + hex(q.reads[q.ri]) + ', and the port read no more');
    if (q.wi < q.writes.length) {
      throw new Diverged(this.where(q) + ': the game wrote ' + hex(q.writes[q.wi + 1], 2) + ' to ' + hex(q.writes[q.wi]) + ', and the port wrote no more');
    }
  }

  // Copy the game's memory to the port's (after a difference, to go on).
  resync() { this.P.M.set(this.m.ram.subarray(0, 0x4000)); }

  run(o = {}) {
    const passes = o.passes === undefined ? 1 : o.passes, m = this.m;
    const res = { passes: 0, ok: true, diffs: [], diverged: null, frames: 0 };
    const f0 = m.frames;
    this.attach();
    try {
      if (this.at === this.passAt && this.passes === 0 && o.onPass) o.onPass(0, m, this);
      while (res.passes < passes) {
        const from = this.at, rec = this.record();
        this.replayMain(rec);
        this.cur = null; this.counter = null;
        if (this.timing) {
          this.timing({ pass: this.passes, kind: 'main', at: -1, from, to: rec.stop, cycles: rec.own, declared: rec.declared, calls: rec.calls });
        }
        const atPass = rec.stop === this.passAt;
        if (atPass || this.every) {
          const d = differ(m.ram, this.P.M, this.runs);
          if (d) {
            res.ok = false;
            res.diffs.push({ pass: this.passes, frame: m.frames, at: rec.stop, count: d.count, bytes: d.bytes });
            if (o.stopOnDiff !== false) break;
            this.resync();
          }
        }
        if (atPass) {
          res.passes++; this.passes++;
          if (o.onPass) o.onPass(this.passes, m, this);
        }
      }
    } catch (e) {
      if (!(e instanceof Diverged)) throw e;
      res.ok = false;
      res.diverged = { why: e.message, pass: this.passes, frame: m.frames, line: m.line };
    } finally { this.detach(); this.cur = null; this.counter = null; }
    res.frames = m.frames - f0;
    return res;
  }
}

function describe(r) {
  const out = [(r.ok ? 'ok: ' : 'FAILED: ') + r.passes + ' passes in ' + r.frames + ' frames'];
  for (const d of r.diffs) out.push('pass ' + d.pass + ' (frame ' + d.frame + ', at ' + hex(d.at) + '): ' + bytesLine(d));
  if (r.diverged) out.push('diverged in pass ' + r.diverged.pass + ' (frame ' + r.diverged.frame + ', line ' + r.diverged.line + '): ' + r.diverged.why);
  return out.join('\n');
}

module.exports = { Lockstep, POLL, describe };
