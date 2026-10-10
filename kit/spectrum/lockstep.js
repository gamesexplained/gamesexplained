'use strict';
// A port of a whole game checked against the game's own code, pass by pass (kit/skills/core/
// 70-minisite/play.md, "A whole game, checked against its own code"), on the 48K Spectrum: the
// Spectrum's twin of kit/c64/lockstep.js, whose design it keeps. The game runs on the kit's
// Spectrum (kit/spectrum/machine.js) while the port runs beside it on its own copy of the game's
// memory. Wherever the port says it has got to, the game is run to the same place; the interrupts
// the game took on the way are run in the port there; and at the start of every pass the two
// memories are compared. Checked by kit/spectrum/test_lockstep.js, on a program of its own and a
// port of it.
//
// The port's side. A port is an object P of routines on the game's memory:
// - P.M, the game's 64 KB (a Uint8Array(65536)), read and written at the game's addresses. The
//   lockstep fills it from the machine's memory when it is made (the ROM too, when the machine has
//   one).
// - P.io, the ULA, which the lockstep sets (members it does not define, such as a save file's, are
//   kept): in(port), a read of an I/O port, the game's keyboard (and anything else the game's
//   machine answers in portIn, such as a joystick interface a page adds there) with the port's own
//   EAR bit; out(port, v), a write, which sets the port's own border and EAR output; and sp, the
//   stack pointer a stand-in starts with (standIn below). The port reads P.io when it runs, not
//   when it is built.
// - The main program, a generator (program below), which yields where the game's code has got to:
//     { cp: a }       the game's program counter has reached a checkpoint a, where the main loop
//                     calls a routine (the CALL, which is also where the call before returns to);
//                     a pass starts at the machine's passAt
//     { halt: true }  the game halts for the frame's interrupt and goes on after it, at the
//                     instruction after one of its HALTs
//     { tstates: n }  n T-states of the game's own work, as a page's clock counts them; with at: a,
//                     the game is at a, and it is a checkpoint when a is listed
//     anything else   a bare yield, one turn of a polling loop: the game runs on one line, 224
//                     T-states
// - The interrupt handlers, plain functions, one for each address the game's interrupt goes to:
//   $0038 in IM 1, or in IM 2 the one the vector at I x 256 + $FF names when it is taken.
//
// const { Machine } = require('kit/spectrum/machine.js');
// const { Lockstep, standIn, describe } = require('kit/spectrum/lockstep.js');
// const m = Machine.restore(JSON.parse(fs.readFileSync('games/spectrum/<slug>/work/walk.json', 'utf8')));
// const ls = new Lockstep({ machine: m, port: P, program: P => P.main_loop(),
//   checkpoints: [0x8024, 0x8027, 0x802A], halts: [0x8141], irqs: { 0xA000: 'frame' } });
// const r = ls.run({ passes: 1000, onPass: (n, m) => { m.releaseAll(); for (const k of input[n]) m.press(k); } });
// console.log(describe(r));
//
// Options:
// - machine: the game, a Machine stopped at a checkpoint (restored from a state saved at passAt,
//   usually) or before one (the hand-over, for a port whose program starts there too). passAt, the
//   main loop's first checkpoint, is the machine's unless given.
// - port: P. program(P) gives the port's main program, made once. A port that throws to restart its
//   main loop gives a generator that catches the throw and starts the loop again, as its page does.
// - checkpoints: every address the port yields as a checkpoint. The game runs until its program
//   counter reaches any of them or a HALT's exit, outside its interrupts. Reaching another than the
//   port's is a divergence of path, and the run stops with both named. The same place named twice
//   running with nothing between (a start-up's last { tstates, at } and the main loop's first
//   checkpoint) is one.
// - halts: the address after each HALT the main program waits at, where it goes on once the
//   interrupt's handler has returned. A game that waits for the frame by polling a byte its
//   interrupt writes polls in the port too, with bare yields.
// - irqs: { handler address: a function, or the name of one of P's }. The interrupts the game took
//   run in the port in the order their handlers returned, at the port's next yield of any kind,
//   and the game is never stopped inside one: a yield that would stop it there runs it on until the
//   handler returns. A replay can keep the order but not the place inside a stretch. So each runs on
//   the memory the game's handler saw: the bytes it read are set to the values it read, and go back
//   to the port's after unless it wrote them. At the next checkpoint or HALT's exit, where the two
//   stand at the same place, a byte an interrupt wrote and the game's main program wrote again
//   afterwards gets back the port's own value: the last writer of each byte is the game's. What no
//   replay can give is the main program reading, in the middle of a stretch, what an interrupt
//   wrote there: those are the game's own races (the skill says how to show one). A handler reads
//   the keyboard the game's did: input changes only at a yield. The reads and writes followed are
//   those of RAM, $4000 up; what a hook standing in for a handler reads or writes is not.
// - stack: [first, last], the bytes the game's stack uses, which a port does not keep: never
//   compared. The default is the 256 bytes below the machine's stack pointer when the lockstep is
//   made, which is right for a machine stopped in its main loop. A lockstep made before the game
//   sets its stack, or a game whose stack goes deeper, names it. P.io.sp is last + 1.
// - compare: the RAM ranges compared at the start of every pass, [first, last] with both included
//   (default: $4000-$FFFF, the screen included, the stack left out). ignore: addresses and ranges
//   left out, for a race shown, not guessed (the skill).
// - chips: what of the ULA is compared too: 'border' (the default, the border colour last written)
//   and 'ear' (the EAR output, bit 4 of the last write).
// - timing(stretch): called for every stretch between two checkpoints, or a checkpoint and a HALT's
//   exit, with { pass, from, to, halt, tstates, irqs, irqTstates, calls, polls, estimate }: the
//   game's T-states from one to the other with its interrupts' taken out (irqTstates, irqs); how
//   often the port called each of P's own functions in between, the interrupts not counted (P's
//   functions are wrapped to count them when the lockstep is made); the port's bare yields; and the
//   port's own { tstates } for the stretch. A stretch that ends at a HALT's exit (halt) holds the
//   halted T-states. These are the rows of the pacing fit. A port that counts more itself (pixels,
//   rows) reads and clears its counters here, and keeps its interrupts' work out of them.
// - maxFrames: how long the game may run to the port's next checkpoint (default 500).
// - irqBytes: addresses of RAM an interrupt writes and the main program reads (a frame counter, a
//   key the handler scanned), for the race replay cannot give (irqs above). The port reads each
//   through P.io.irqByte(a), and gets, in turn, the values the game's main program read of it in
//   the same stretch (a read past those, the port's own byte). The port runs a stretch before the
//   game does, so what the game has not yet read comes from a copy of the machine run on ahead to
//   its next checkpoint or HALT's exit: its class's restore(save()), with the ROM, the game's own
//   hooks, the input as it stands and the machine's own portIn. A machine class that keeps more
//   than Machine does extends save() and restore(), or the copy is not the game. Input onFrame
//   gives inside the stretch, after the copy is made, is not in it. On the page, outside the
//   lockstep, the port's io gives irqByte: a => M[a].
//
// run({ passes, onPass, onFrame, stopOnDiff }) runs until passes more passes have started (default
// 1) and returns { passes, ok, diffs, diverged, frames }. At the start of each pass, once the
// interrupts have run, memory is compared, and then onPass(n, machine, lockstep) runs: the place
// to set the pass's input on the machine (press, release; the port reads the same). onFrame(frame,
// machine, lockstep) runs for every frame the game begins, at the port's next yield, for input a
// game waits for in the middle of a pass (a pause, a prompt): input changes only at a yield, where
// both read the same. A pass whose start differs is in diffs, { pass, frame, tstates, count, bytes:
// [{ address, game, port, chip }] } (the first 64 bytes; a chip's address is the ULA's port, $FE);
// the run stops there (the default, with the machine, P.M and the lockstep's ULA as they are), or
// with stopOnDiff: false copies the game's compared memory to the port's and goes on (resync()
// does the same). A divergence ends the lockstep: a checkpoint or a HALT's exit other than the
// port's, a port that polls while the game waits at a checkpoint ahead, or no checkpoint in
// maxFrames; diverged says where. passes counts pass starts, but not the one the lockstep was made
// at. describe(result) gives a result as lines to print.
//
// standIn(P, address, { sp, rom, maxSteps }) is the game's own routine at address, run on P.M
// through P.io by the kit's Z80 (kit/spectrum/z80.js), for a port whose routine is not written yet:
// P.draw = standIn(P, 0x9000) takes and returns registers ({ a, f, b, c, d, e, h, l, ix, iy, af_,
// bc_, de_, hl_ }) as the port's routines do, and an interrupt handler stands in for irqs the same
// way. The stack pointer starts at sp each call (default P.io.sp, inside the lockstep's stack), and
// the call ends when the routine returns there, by RET, RETI or RETN. A routine that halts cannot
// stand in: nothing moves while it runs. One that calls the ROM stands in only with rom: true and
// a machine given the ROM, whose copy P.M then holds; without it the call stops at the ROM.
//
// While a lockstep runs it owns the machine: it hooks the checkpoints and wraps the machine's
// interrupt and the processor's fetch, rd and wr, and it puts them back when run returns.
const { LINE, LINES, FRAME } = require('./machine.js');
const { CPU } = require('./z80.js');

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const LIST = 64;                                   // differing bytes kept per pass
const ULA = 0xFE;                                  // the address a chip's difference is listed at
const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);

// The port's ULA: its own border and EAR output, and the game's keyboard, read through the game's
// machine (and so through any portIn a page or a test wraps there) with the port's EAR bit.
class PortULA {
  constructor(game) { this.game = game; this.border = game.border; this.ear = game.ear; }
  in(port) {
    const g = this.game, ear = g.ear;
    g.ear = this.ear;
    try { return g.portIn(port & 0xFFFF) & 0xFF; } finally { g.ear = ear; }
  }
  out(port, v) {
    if (port & 1) return;
    this.border = v & 7;
    this.ear = (v >> 4) & 1;
  }
}

// Follow a machine's interrupts: enter(q) when it takes one, leave(q) when its handler has returned
// to where it was taken, with the stack pointer as it was, noticed at the next opcode fetch or
// close(). q is { ret, sp, tstates, at }, at the handler's address. open lists the handlers
// still running, the innermost last.
function follow(m, enter, leave) {
  const cpu = m.cpu, open = [];
  const close = () => {
    while (open.length) {
      const q = open[open.length - 1];
      if (cpu.pc !== q.ret || cpu.sp !== q.sp) return;
      open.pop();
      leave(q);
    }
  };
  const interrupt = m.interrupt, fetch = cpu.fetch;
  m.interrupt = function () {
    close();
    const q = { ret: cpu.pc, sp: cpu.sp, tstates: cpu.tstates, at: -1 };
    interrupt.call(this);
    q.at = cpu.pc;
    open.push(q);
    enter(q);
  };
  cpu.fetch = function () { if (open.length) close(); return fetch.call(this); };
  return { open, close };
}

class Lockstep {
  constructor(o = {}) {
    const m = o.machine, P = o.port;
    if (!m || !m.cpu || typeof m.interrupt !== 'function') throw new Error('Lockstep: no machine (kit/spectrum/machine.js)');
    if (!P || !(P.M instanceof Uint8Array) || P.M.length !== 65536) throw new Error('Lockstep: the port has no P.M of 64 KB');
    if (typeof o.program !== 'function') throw new Error('Lockstep: program(P) gives the port\'s main program');
    this.m = m; this.P = P;
    this.passAt = o.passAt !== undefined ? o.passAt & 0xFFFF : m.passAt;
    if (this.passAt === null || this.passAt === undefined) throw new Error('Lockstep: no passAt, on the machine or given');
    this.cps = new Set((o.checkpoints || []).map(a => a & 0xFFFF));
    this.cps.add(this.passAt);
    this.halts = new Set((o.halts || []).map(a => a & 0xFFFF));
    for (const a of this.halts) if (this.cps.has(a)) throw new Error('Lockstep: ' + hex(a) + ' is both a checkpoint and a HALT\'s exit');
    this.irqs = o.irqs || {};
    this.maxFrames = o.maxFrames || 500;
    // the stack, never compared
    const stack = new Uint8Array(65536);
    let top;
    if (o.stack) { stack.fill(1, o.stack[0] & 0xFFFF, (o.stack[1] & 0xFFFF) + 1); top = (o.stack[1] + 1) & 0xFFFF; }
    else { top = m.cpu.sp; for (let i = 1; i <= 256; i++) stack[(top - i) & 0xFFFF] = 1; }
    const keep = new Uint8Array(65536);
    for (const [a, b] of o.compare || [[0x4000, 0xFFFF]]) keep.fill(1, a, b + 1);
    for (const x of o.ignore || []) if (Array.isArray(x)) keep.fill(0, x[0], x[1] + 1); else keep[x] = 0;
    const addrs = [];
    for (let a = 0; a < 65536; a++) if (keep[a] && !stack[a]) addrs.push(a);
    this.addrs = Int32Array.from(addrs);
    this.chipList = o.chips || ['border'];
    for (const c of this.chipList) if (!['border', 'ear'].includes(c)) throw new Error('Lockstep: no chip ' + c + ' to compare');
    // the port starts as the game is
    P.M.set(m.ram);
    this.ula = new PortULA(m);
    this.irqBytes = new Set((o.irqBytes || []).map(a => a & 0xFFFF));
    this.ib = { live: new Map(), list: null, used: new Map() };   // the stretch's reads of them
    this.io = this.makeIO(top);
    P.io = Object.assign({}, P.io, this.io);
    this.timing = o.timing || null;
    this.counting = false;
    this.calls = {};
    if (this.timing) this.countCalls();
    this.it = o.program(P);
    if (!this.it || typeof this.it.next !== 'function') throw new Error('Lockstep: program(P) gave no generator');
    // where the game is: at, a stop the port has not yet matched (the game waits there), or one it
    // has (the game may go on); resume, the stop the game is leaving, whose hook it passes once
    const pc = m.cpu.pc;
    this.at = this.cps.has(pc) || this.halts.has(pc) ? pc : -1;
    this.matched = false;
    this.resume = -1;
    this.pending = [];                             // interrupts the game took, not yet run in the port
    this.fix = new Map();                          // bytes they wrote, until the next checkpoint
    this.irq = null;                               // the innermost one running on the machine
    this.ints = null;                              // the machine's interrupts, followed while it runs
    this.irqTstates = 0; this.irqCount = 0;
    this.tstates0 = m.cpu.tstates;
    this.passes = 0; this.syncs = 0; this.last = -1; this.idle = 0; this.syncFrame = m.frames; this.since = 0;
    this.halted = null; this.stopped = false; this.saved = null; this.res = null;
    this.from = -1; this.t0 = m.cpu.tstates; this.it0 = 0; this.in0 = 0; this.polls = 0; this.estimate = 0;
  }

  // --- the port's ULA ---
  makeIO(sp) {
    const u = this.ula;
    return {
      in: port => u.in(port & 0xFFFF),
      out: (port, v) => u.out(port & 0xFFFF, v & 0xFF),
      irqByte: a => this.irqByte(a & 0xFFFF),
      sp,
    };
  }
  // A byte an interrupt writes, as the game's main program read it at this point of the stretch.
  irqByte(a) {
    if (!this.irqBytes.has(a)) throw this.annotate(new Error('Lockstep: the port read ' + hex(a) + ' through irqByte, and it is not in irqBytes'));
    const s = this.ib, i = s.used.get(a) || 0;
    s.used.set(a, i + 1);
    let vs = (s.list || s.live).get(a) || [];
    // the game waiting at a stop the port has not reached has read all it will in the stretch
    if (i >= vs.length && !s.list && !(this.at >= 0 && !this.matched)) { s.list = this.lookahead(); vs = s.list.get(a) || []; }
    return i < vs.length ? vs[i] : this.P.M[a];
  }
  // The game's reads of irqBytes to the end of the stretch: those it has made since the last stop,
  // then a copy's, run on from here to the next stop outside its interrupts.
  lookahead() {
    const m = this.m, hooks = Object.assign({}, m.hooks);
    for (const a of [...this.cps, ...this.halts]) { const h = this.saved.hooks[a]; if (h) hooks[a] = h; else delete hooks[a]; }
    const g = m.constructor.restore(m.save(), { rom: m.hasRom ? m.ram.slice(0, 0x4000) : undefined, hooks, passAt: null });
    if (!(g instanceof m.constructor)) throw new Error('Lockstep: irqBytes needs ' + m.constructor.name + '.restore, to copy the machine');
    if (own(m, 'portIn')) g.portIn = m.portIn;
    const out = new Map(), B = this.irqBytes, cpu = g.cpu;
    for (const [a, vs] of this.ib.live) out.set(a, vs.slice());
    const ints = follow(g, () => {}, () => {});
    let stop = false, skip = cpu.pc;
    for (const a of [...this.cps, ...this.halts]) {
      const prev = g.hooks[a];
      g.hooks[a] = q => {
        ints.close();
        if (ints.open.length) return prev ? prev(q) : false;           // an interrupt's code
        if (a === skip) { skip = -1; return prev ? prev(q) : false; }   // the stop it starts at
        stop = true; return true;
      };
    }
    const rd = cpu.rd;
    cpu.rd = function (x) {
      const v = rd.call(this, x), a = this.bus;
      if (!ints.open.length && B.has(a)) { if (!out.has(a)) out.set(a, []); out.get(a).push(v); }
      return v;
    };
    const end = g.frames + this.maxFrames;
    while (!stop && g.frames < end) g.runTStates(FRAME);
    return out;
  }

  // Count the calls of every one of P's functions (for timing).
  countCalls() {
    const P = this.P, ls = this;
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      P[name] = f instanceof GENERATOR
        ? function* (...a) { if (ls.counting) ls.calls[name] = (ls.calls[name] || 0) + 1; return yield* f.apply(this, a); }
        : function (...a) { if (ls.counting) ls.calls[name] = (ls.calls[name] || 0) + 1; return f.apply(this, a); };
    }
  }

  // --- the machine, hooked for the length of a run ---
  attach() {
    const m = this.m, cpu = m.cpu, ls = this;
    if (this.at >= 0 && cpu.pc !== this.at) throw new Error('Lockstep: the machine has run since the lockstep stopped it');
    const s = this.saved = { hooks: {}, onPass: m.onPass, interrupt: own(m, 'interrupt'), fetch: own(cpu, 'fetch'), rd: own(cpu, 'rd'), wr: own(cpu, 'wr') };
    m.onPass = null;
    // An interrupt: its handler's address, when it came, what it read of RAM before writing it
    // (seen) and what it wrote (wrote, with the values it left).
    const ints = this.ints = follow(m,
      q => { q.seen = new Map(); q.wrote = new Map(); ls.irq = q; },
      q => {
        const open = ints.open;
        ls.irq = open.length ? open[open.length - 1] : null;
        for (const a of q.wrote.keys()) q.wrote.set(a, m.ram[a]);
        q.length = cpu.tstates - q.tstates;
        if (!open.length) ls.irqTstates += q.length;   // a handler's time holds those inside it
        ls.irqCount++;
        ls.pending.push(q);
      });
    for (const a of [...this.cps, ...this.halts]) {
      const prev = m.hooks[a];
      s.hooks[a] = prev;
      m.hooks[a] = q => {
        ints.close();                                                   // a hook may have returned from a handler
        if (ints.open.length) return prev ? prev(q) : false;            // an interrupt's code, not the main program
        if (ls.resume === a) { ls.resume = -1; return prev ? prev(q) : false; }
        ls.at = a; ls.matched = false;
        return true;
      };
    }
    // RAM read and written, by the main program and by the handlers
    const rd = cpu.rd, wr = cpu.wr, B = this.irqBytes;
    cpu.rd = function (x) {
      const v = rd.call(this, x), a = this.bus;
      if (a < 0x4000) return v;
      const q = ls.irq;
      if (q !== null) { if (!q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, v); }
      else if (B.has(a) && !ls.ib.list) { const L = ls.ib.live; if (!L.has(a)) L.set(a, []); L.get(a).push(v); }
      return v;
    };
    cpu.wr = function (x, v) {
      wr.call(this, x, v);
      const a = this.bus, q = ls.irq;
      if (q !== null && a >= 0x4000) q.wrote.set(a, 0);
    };
  }
  detach() {
    const m = this.m, s = this.saved;
    if (!s) return;
    for (const a of Object.keys(s.hooks)) { if (s.hooks[a]) m.hooks[a] = s.hooks[a]; else delete m.hooks[a]; }
    for (const [o, k] of [[m, 'interrupt'], [m.cpu, 'fetch'], [m.cpu, 'rd'], [m.cpu, 'wr']]) { if (s[k]) o[k] = s[k]; else delete o[k]; }
    m.onPass = s.onPass;
    this.saved = null; this.ints = null; this.irq = null;
  }

  // Run the game on to its next stop, a checkpoint or a HALT's exit; or find it waiting at one the
  // port has not reached. -1 when it reaches none in maxFrames.
  toStop() {
    const m = this.m;
    if (this.at >= 0 && !this.matched) return this.at;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    const end = m.frames + this.maxFrames;
    while (this.at < 0 && m.frames < end) m.runTStates(FRAME);
    return this.at;
  }
  // Run the game on for n T-states of its own work (its interrupts not counted), or to its next
  // line when n is 0, unless it reaches a stop first; and on until no interrupt handler is running.
  // It does not move while it waits at a stop the port has not reached.
  forTStates(n) {
    const m = this.m, cpu = m.cpu, open = this.ints.open;
    if (this.at >= 0 && !this.matched) return false;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    const end = m.frames + this.maxFrames;
    if (n <= 0) m.runTStates(LINE - cpu.tstates % LINE);
    else {
      const t0 = cpu.tstates, i0 = this.irqTstates, mine = () => (cpu.tstates - t0) - (this.irqTstates - i0);
      while (this.at < 0 && mine() < n && m.frames < end) m.runTStates(Math.max(1, n - mine()));
    }
    for (this.ints.close(); this.at < 0 && open.length && m.frames < end; this.ints.close()) m.step();
    return true;
  }
  // Run in the port the interrupts the game has taken since the last yield. Each runs on the bytes
  // the game's handler read, as it read them, which go back to the port's values after unless it
  // wrote them. What each wrote is kept in fix for lastWriters: the port's value before (b), the
  // handler's (h) and the game's handler's (v).
  settle() {
    const list = this.pending, P = this.P, M = P.M, fix = this.fix;
    if (!list.length) return;
    this.pending = [];
    const counting = this.counting;
    this.counting = false;
    try {
      for (const q of list) {
        let f = this.irqs[q.at];
        if (typeof f === 'string') f = P[f];
        if (typeof f !== 'function') throw new Error('Lockstep: no port handler for the interrupt at ' + hex(q.at) + ' (irqs)');
        for (const a of q.wrote.keys()) {
          const x = fix.get(a);
          if (!x) fix.set(a, { b: M[a], h: -1, v: -1 });
          else if (M[a] !== x.h) x.b = M[a];                  // the port's program has written it since
        }
        const put = [];
        for (const [a, v] of q.seen) if (M[a] !== v) { put.push(a, M[a]); M[a] = v; }
        const r = f.call(P);
        if (r && typeof r.next === 'function') throw new Error('Lockstep: the handler for ' + hex(q.at) + ' is a generator; an interrupt runs to its end');
        for (let i = 0; i < put.length; i += 2) if (!q.wrote.has(put[i])) M[put[i]] = put[i + 1];
        for (const [a, v] of q.wrote) { const x = fix.get(a); x.v = v; x.h = M[a]; }
      }
    } catch (e) { throw this.annotate(e); }
    finally { this.counting = counting; }
  }
  // At a checkpoint or a HALT's exit, where the game and the port stand at the same place: a byte
  // an interrupt wrote that the game's main program then wrote again, and the port's has not since
  // the replay, gets back the port's own value. The last writer of each byte is the game's.
  lastWriters() {
    const M = this.P.M, R = this.m.ram;
    for (const [a, x] of this.fix) if (R[a] !== x.v && M[a] === x.h) M[a] = x.b;
    this.fix.clear();
  }

  // --- one yield of the port's program ---
  step() {
    let r;
    this.since++;
    try { r = this.it.next(); } catch (e) { throw this.annotate(e); }
    if (r.done) return this.diverge('the port\'s program returned');
    const y = r.value;
    if (y && y.cp !== undefined) return this.checkpoint(y.cp & 0xFFFF, y);
    if (y && y.at !== undefined && this.cps.has(y.at & 0xFFFF)) return this.checkpoint(y.at & 0xFFFF, y);
    if (y && y.halt) return this.halt();
    if (y && y.tstates !== undefined) {
      this.estimate += y.tstates;
      if (this.forTStates(y.tstates)) this.idle = 0;
      this.settle();
      this.frameInput();
      return this.running();
    }
    if (y && (y.cycles !== undefined || y.wait !== undefined)) {
      throw this.annotate(new Error('Lockstep: { cycles } and { wait } are the C64\'s; a Spectrum port yields { tstates } and { halt }'));
    }
    return this.poll();
  }
  // onFrame for every frame the game has begun since the last call: input changes only at a yield,
  // where the game and the port stand at the same place, so both read the same.
  frameInput() {
    if (!this.onFrame) return;
    while (this.lastFrame < this.m.frames && !this.halted) this.onFrame(++this.lastFrame, this.m, this);
  }
  checkpoint(a, y) {
    if (!this.cps.has(a)) throw this.annotate(new Error('Lockstep: the port yielded checkpoint ' + hex(a) + ', which is not in checkpoints'));
    if (y.tstates !== undefined) this.estimate += y.tstates;
    // the place just reached, named again with nothing run between (a start-up's last { tstates, at }
    // and the main loop's first checkpoint, say): one place
    if (a === this.last && this.at === a && this.matched && this.since === 1) return;
    const at = this.toStop();
    if (at !== a) {
      return this.diverge(at < 0 ? this.lost('checkpoint ' + hex(a))
        : 'the game went to ' + hex(at) + (this.halts.has(at) ? ' (a HALT\'s exit)' : '') + ', the port to ' + hex(a), { game: at, port: a });
    }
    this.sync(a, false);
    if (a === this.passAt) this.passStart();
    this.frameInput();
  }
  halt() {
    if (!this.halts.size) throw this.annotate(new Error('Lockstep: the port halts, and no halts are given'));
    const at = this.toStop();
    if (!this.halts.has(at)) {
      return this.diverge(at < 0 ? this.lost('a HALT\'s exit') : 'the game went to ' + hex(at) + ', the port halted', { game: at, port: 'halt' });
    }
    this.sync(at, true);
    this.frameInput();
  }
  poll() {
    this.polls++;
    if (this.at >= 0 && !this.matched) {           // the game waits at a stop ahead: the port polls alone
      if (++this.idle > 2 * LINES) return this.diverge('the port polls on while the game waits at ' + hex(this.at), { game: this.at, port: 'poll' });
      return;
    }
    this.forTStates(0);
    this.settle();
    this.frameInput();
    return this.running();
  }
  // A port that polls or spends for longer than maxFrames of the game's without a checkpoint.
  running() {
    if (this.m.frames - this.syncFrame > this.maxFrames) {
      this.diverge('the port reached no checkpoint in ' + this.maxFrames + ' frames (the game\'s program counter is at ' + hex(this.m.cpu.pc) + ')', { port: 'poll' });
    }
  }
  sync(a, halt) {
    this.matched = true; this.idle = 0; this.syncFrame = this.m.frames;
    this.settle();
    this.lastWriters();
    const t = this.m.cpu.tstates;
    if (this.timing && this.from >= 0) {
      const irqTstates = this.irqTstates - this.it0;
      this.timing({ pass: this.passes, from: this.from, to: a, halt, tstates: t - this.t0 - irqTstates, irqs: this.irqCount - this.in0,
        irqTstates, calls: this.calls, polls: this.polls, estimate: this.estimate });
    }
    this.from = a; this.t0 = t; this.it0 = this.irqTstates; this.in0 = this.irqCount;
    this.calls = {}; this.polls = 0; this.estimate = 0;
    this.syncs++; this.last = a; this.since = 0;
    this.ib = { live: new Map(), list: null, used: new Map() };
  }
  passStart() {
    const m = this.m;
    if (m.cpu.tstates !== this.tstates0) { this.passes++; this.res.passes++; }
    const d = this.compare();
    if (d) {
      this.res.diffs.push(Object.assign({ pass: this.passes, frame: m.frames, tstates: m.cpu.tstates }, d));
      this.res.ok = false;
      if (this.stopOnDiff) this.stopped = true; else this.resync();
    }
    if (this.onPass) this.onPass(this.passes, m, this);
  }

  // --- comparing ---
  compare() {
    const M = this.P.M, R = this.m.ram, A = this.addrs, bytes = [];
    let count = 0;
    const add = (address, game, port, chip) => {
      if (bytes.length < LIST) bytes.push(chip ? { address, game, port, chip } : { address, game, port });
      count++;
    };
    for (let i = 0; i < A.length; i++) { const a = A[i]; if (M[a] !== R[a]) add(a, R[a], M[a]); }
    for (const chip of this.chipList) if (this.m[chip] !== this.ula[chip]) add(ULA, this.m[chip], this.ula[chip], chip);
    return count ? { count, bytes } : null;
  }
  // The port's compared memory and ULA made the game's again.
  resync() {
    const M = this.P.M, R = this.m.ram, A = this.addrs;
    for (let i = 0; i < A.length; i++) M[A[i]] = R[A[i]];
    for (const chip of this.chipList) this.ula[chip] = this.m[chip];
  }

  // --- the run ---
  run(opts = {}) {
    if (this.halted) throw new Error('Lockstep: ' + this.halted.why + '; the game and the port are no longer in step');
    const want = opts.passes === undefined ? 1 : opts.passes, m = this.m, f0 = m.frames;
    this.onPass = opts.onPass || null;
    this.onFrame = opts.onFrame || null;
    if (this.lastFrame === undefined || this.lastFrame > m.frames) this.lastFrame = m.frames;
    this.stopOnDiff = opts.stopOnDiff !== false;
    const res = this.res = { passes: 0, ok: true, diffs: [], diverged: null, frames: 0 };
    this.attach();
    this.counting = !!this.timing;
    try {
      while (res.passes < want && !this.halted && !this.stopped) this.step();
    } finally {
      this.counting = false;
      this.detach();
    }
    this.stopped = false;
    res.frames = m.frames - f0;
    return res;
  }
  diverge(why, extra) {
    const m = this.m;
    this.halted = Object.assign({ pass: this.passes, after: this.last, frame: m.frames, tstates: m.cpu.tstates, pc: m.cpu.pc, why }, extra);
    this.res.diverged = this.halted;
    this.res.ok = false;
  }
  lost(what) {
    return 'the game reached no checkpoint in ' + this.maxFrames + ' frames (the port\'s next is ' + what + '; the game\'s program counter is at ' + hex(this.m.cpu.pc) + ')';
  }
  annotate(e) {
    if (e && typeof e.message === 'string' && !e.lockstep) {
      e.message += ' (lockstep: pass ' + this.passes + (this.last >= 0 ? ', after ' + hex(this.last) : '') + ')';
      e.lockstep = true;
    }
    return e;
  }
}

// The game's routine at address, standing in for the port's (see the header): the Z80 on P.M and
// P.io, a write to the ROM lost.
class StandIn extends CPU {
  constructor(P) { super(P.M, { io: { in: p => P.io.in(p), out: (p, v) => P.io.out(p, v) } }); this.romOk = false; }
  fetch() {
    if (this.pc < 0x4000 && !this.romOk) this.fail('the routine reached the ROM at ' + hex(this.pc) + '; with rom: true, and a machine given the ROM, it runs there', { address: this.pc });
    return super.fetch();
  }
  wr(a, v) { const n = this.resolve(a); if (n < 0x4000) this.tstates += 3; else super.wr(n, v); }
}
const REGS = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l', 'ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];
const standInCpus = new WeakMap();
function standIn(P, address, opts = {}) {
  address &= 0xFFFF;
  return function (r) {
    let cpu = standInCpus.get(P);
    if (!cpu) { cpu = new StandIn(P); standInCpus.set(P, cpu); }
    r = r || {};
    const regs = {};
    for (const k of REGS) if (r[k] !== undefined) regs[k] = r[k];
    cpu.setRegs(regs);
    const sp = opts.sp !== undefined ? opts.sp : P.io && P.io.sp;
    if (sp === undefined) throw new Error('standIn: no stack pointer for ' + hex(address) + ' (opts.sp, or a lockstep\'s P.io.sp)');
    cpu.romOk = !!opts.rom;
    cpu.sp = sp & 0xFFFF; cpu.halted = 0; cpu.ei = 0;
    cpu.push(0);                                   // the return address, where the call ends
    cpu.pc = address;
    const max = opts.maxSteps || 1e6;
    for (let n = 0; cpu.pc !== 0 || cpu.sp !== (sp & 0xFFFF); n++) {
      if (n >= max) throw new Error('standIn: the routine at ' + hex(address) + ' ran ' + max + ' instructions without returning');
      cpu.step();
      if (cpu.halted) throw new Error('standIn: the routine at ' + hex(address) + ' halted; one that waits for the interrupt cannot stand in');
    }
    const out = {};
    for (const k of REGS) out[k] = cpu[k];
    return out;
  };
}

// A run's result as lines to print.
function describe(r) {
  const out = [];
  for (const d of r.diffs) {
    const shown = d.bytes.slice(0, 8).map(b => (b.chip ? b.chip + ' ' : '') + hex(b.address) + ' game ' + hex(b.game, 2) + ' port ' + hex(b.port, 2));
    out.push('pass ' + d.pass + ' (frame ' + d.frame + '): ' + d.count + (d.count === 1 ? ' byte differs: ' : ' bytes differ: ') +
      shown.join(', ') + (d.count > shown.length ? ', ...' : ''));
  }
  if (r.diverged) out.push('pass ' + r.diverged.pass + (r.diverged.after >= 0 ? ', after ' + hex(r.diverged.after) : '') + ' (frame ' + r.diverged.frame + '): ' + r.diverged.why);
  out.push(r.passes + (r.passes === 1 ? ' pass' : ' passes') + ' in ' + r.frames + ' frames: ' +
    (r.ok ? 'identical' : (r.diffs.length ? r.diffs.length + ' with differences' : '') + (r.diffs.length && r.diverged ? ', then ' : '') + (r.diverged ? 'out of step' : '')));
  return out.join('\n');
}

module.exports = { Lockstep, standIn, describe, PortULA };
