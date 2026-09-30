'use strict';
// A port of a whole game checked against the game's own code, pass by pass (kit/skills/core/
// 70-minisite, "A whole game, checked against its own code"). The game runs on the kit's C64
// (kit/c64/machine.js) while the port runs beside it on its own copy of the game's memory. Wherever
// the port says it has got to, the game is run to the same place; the interrupts the game took on
// the way are run in the port there; and at the start of every pass the two memories are compared.
// Checked by kit/c64/test_lockstep.js, on kit/c64/test_machine.js's program and a port of it.
//
// The port's side. A port is an object P of routines on the game's memory:
// - P.M, the game's 64 KB (a Uint8Array(65536)), read and written at the game's addresses. The
//   lockstep fills it from the machine's RAM when it is made.
// - P.io, the chips, which the lockstep sets (members it does not define, such as a save file's,
//   are kept): vicRead(r), vicWrite(r, v), sidRead(r), sidWrite(r, v), colourRead(i) (four bits),
//   colourWrite(i, v), ciaRead(r), ciaWrite(r, v) (CIA 1), cia2Read(r), cia2Write(r, v), and
//   read(a), write(a, v) by address. They are a second set of the machine's chips, started as the
//   game's: the same code, the game's keyboard and joystick, and the raster line the lockstep sets.
//   The port reads P.io when it runs, not when it is built.
// - The main program, a generator (program below), which yields where the game's code has got to:
//     { cp: a }       the game's program counter has reached a checkpoint a, where the main loop
//                     calls a routine (the JSR, which is also where the call before returns to);
//                     a pass starts at the machine's passAt
//     { wait: line }  a wait for the raster to reach line: the game's loop polls $D012 and leaves
//                     at one of the waits' exits
//     { cycles: n }   n cycles of the game's own work, as a page's clock counts them; with at: a,
//                     the game is at a, and it is a checkpoint when a is listed
//     anything else   a bare yield, one turn of a polling loop: one raster line passes
// - The interrupt handlers, plain functions, one for each address the game's vector at $FFFE
//   points to.
//
// const { Machine } = require('kit/c64/machine.js');
// const { Lockstep, standIn, describe } = require('kit/c64/lockstep.js');
// const m = Machine.restore(JSON.parse(fs.readFileSync('games/c64/<slug>/work/walk.json', 'utf8')));
// const ls = new Lockstep({ machine: m, port: P, program: P => P.main_loop(),
//   checkpoints: [0x1027, 0x102A, 0x102D], waits: [0x1084], irqs: { 0x1100: 'irq_top' } });
// const r = ls.run({ passes: 1000, onPass: (n, m) => { m.joy = input[n]; } });
// console.log(describe(r));
//
// Options:
// - machine: the game, a Machine stopped at a checkpoint (restored from a state saved at passAt,
//   usually) or before one (the hand-over, for a port whose program starts there too). passAt, the
//   main loop's first checkpoint, is the machine's unless given.
// - port: P. program(P) gives the port's main program, made once. A port that throws to restart its
//   main loop gives a generator that catches the throw and starts the loop again, as its page does.
// - checkpoints: every address the port yields as a checkpoint. The game runs until its program
//   counter reaches any of them or a wait's exit, outside its interrupts. Reaching another than the
//   port's is a divergence of path, and the run stops with both named. The same place named twice
//   running with nothing between (a start-up's last { cycles, at } and the main loop's first
//   checkpoint) is one.
// - waits: the raster waits' exits, the instruction after each loop that polls the raster. The
//   game must leave on the port's line or the next. While it waits it passes the checkpoint before,
//   which may head the loop (a port that names its time up to the wait).
// - irqs: { handler address: a function, or the name of one of P's }. The interrupts the game took
//   run in the port in order, at the port's next yield of any kind: a replay can keep the order
//   but not the place inside a stretch. So each runs on the memory the game's handler saw: the
//   bytes it read are set to the values it read (the stack aside), and go back to the port's after
//   unless it wrote them. Its reads of the raster ($D012, and $D011's bit 7) get the values the
//   game's did, in turn (a read past those, the line the game's handler ended on), and the raster's
//   interrupt bit is latched. At the next checkpoint or wait's exit, where the two stand at the same
//   place, a byte an interrupt wrote and the game's main program wrote again afterwards gets back
//   the port's own value: the last writer of each byte is the game's. What no replay can give is
//   the main program reading, in the middle of a stretch, what an interrupt wrote there: those are
//   the game's own races (the skill says how to show one). Colour RAM and the chips' registers are
//   replayed as they are: a handler reads the port's, and its writes stand.
// - The raster: between yields the port reads the line the game was on at the last one. A bare
//   yield runs the game on to its next line, taking any interrupt that falls due, so a polling
//   loop in the port sees the flags and lines the game's loop does, when it does.
// - compare: the RAM ranges compared at the start of every pass, [first, last] with both included
//   (default: all but $00-$01, the processor port, and the stack page, which a port does not keep:
//   a game that keeps tables in the stack page names the part its stack does not reach).
//   ignore: addresses and ranges left out, for a race shown, not guessed (the skill).
// - chips: which chips are compared too: 'colour' (the default, colour RAM), 'vic' (the registers
//   as written, the raster compare and the enable bits), 'sid' (as written) and 'cia' (CIA 1's port
//   A and the two directions).
// - timing(stretch): called for every stretch between two checkpoints, or a checkpoint and a
//   wait's exit, with { pass, from, to, wait, cycles, irqs, irqCycles, calls, polls, estimate }:
//   the game's cycles from one to the other with its interrupts' taken out (irqCycles, irqs); how
//   often the port called each of P's own functions in between, the interrupts not counted (P's
//   functions are wrapped to count them when the lockstep is made); the port's bare yields; and
//   the port's own { cycles } for the stretch. A stretch that ends at a wait's exit (wait) holds
//   the wait. These are the rows of the pacing fit. A port that counts more itself (pixels, rows)
//   reads and clears its counters here, and keeps its interrupts' work out of them.
// - maxFrames: how long the game may run to the port's next checkpoint (default 500).
// - irqBytes: addresses of RAM an interrupt writes and the main program reads (a jiffy clock, a
//   keyboard buffer), for the race replay cannot give (irqs above). The port reads each through
//   P.io.irqByte(a), and gets, in turn, the values the game's main program read of it in the same
//   stretch (a read past those, the port's own byte). The port runs a stretch before the game does,
//   so what the game has not yet read comes from a copy of the machine run on ahead to its next
//   checkpoint or wait's exit: its class's restore(save()), with the input as it stands. A machine
//   class that keeps more than Machine does extends save() and restore(), or the copy is not the
//   game. Input onFrame gives inside the stretch, after the copy is made, is not in it, and a copy
//   made at the head of a raster wait's loop stops at that head the first time round. On the page,
//   outside the lockstep, the port's io gives irqByte: a => M[a].
//
// run({ passes, onPass, onFrame, stopOnDiff }) runs until passes more passes have started (default
// 1) and returns { passes, ok, diffs, diverged, frames }. At the start of each pass, once the
// interrupts have run, memory is compared, and then onPass(n, machine, lockstep) runs: the place
// to set the pass's input on the machine (keys, joy; the port reads the same). onFrame(frame,
// machine, lockstep) runs for every frame the game begins, at the port's next yield, for input a
// game waits for in the middle of a pass (a pause, a prompt): input changes only at a yield, where
// both read the same. A pass whose start differs is in diffs, { pass, frame, cycle, count, bytes:
// [{ address, game, port, chip }] } (the first 64 bytes); the run stops there (the default, with
// the machine, P.M and the lockstep's io as they are), or with stopOnDiff: false copies the game's
// compared memory to the port's and goes on (resync() does the same). A divergence ends the
// lockstep: a checkpoint or a wait's exit other than the port's, a wait left on another line, a
// port that polls while the game waits at a checkpoint ahead, or no checkpoint in maxFrames;
// diverged says where. passes counts pass starts, but not the one the lockstep was made at.
// describe(result) gives a result as lines to print.
//
// standIn(P, address, { irq, port }) is the game's own routine at address, run on P.M through
// P.io by the kit's simulator, for a port whose routine is not written yet: P.draw = standIn(P,
// 0x9000) takes and returns registers ({ a, x, y, c ... }) as the port's routines do; with irq it
// is an interrupt handler for irqs. The stack pointer starts at $FF each call. A routine that
// waits for the raster or for an interrupt cannot stand in: nothing moves while it runs.
//
// While a lockstep runs it owns the machine: it hooks the checkpoints and wraps the machine's irq
// and ioRead, and it puts them back when run returns.
const { Machine, LINES, FRAME } = require('./machine.js');
const { CPU } = require('./cpu6502.js');

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const NONE = new Set();
const LIST = 64;                                   // differing bytes kept per pass

// The port's chips: a second machine's, never run, whose raster line is the lockstep's and whose
// keyboard and joystick are the game's machine's.
class PortChips extends Machine {
  constructor() { super({ ram: new Uint8Array(65536) }); this.raster = 0; this.game = null; }
  get line() { return this.raster; }
  get keys() { return this.game ? this.game.keys : NONE; }
  set keys(v) {}
  get joy() { return this.game ? this.game.joy : 0x1F; }
  set joy(v) {}
  get joy1() { return this.game ? this.game.joy1 : 0x1F; }
  set joy1(v) {}
}

class Lockstep {
  constructor(o = {}) {
    const m = o.machine, P = o.port;
    if (!m || !m.cpu) throw new Error('Lockstep: no machine (kit/c64/machine.js)');
    if (!P || !(P.M instanceof Uint8Array) || P.M.length !== 65536) throw new Error('Lockstep: the port has no P.M of 64 KB');
    if (typeof o.program !== 'function') throw new Error('Lockstep: program(P) gives the port\'s main program');
    this.m = m; this.P = P;
    this.passAt = o.passAt !== undefined ? o.passAt & 0xFFFF : m.passAt;
    if (this.passAt === null || this.passAt === undefined) throw new Error('Lockstep: no passAt, on the machine or given');
    this.cps = new Set((o.checkpoints || []).map(a => a & 0xFFFF));
    this.cps.add(this.passAt);
    this.waits = new Set((o.waits || []).map(a => a & 0xFFFF));
    for (const a of this.waits) if (this.cps.has(a)) throw new Error('Lockstep: ' + hex(a) + ' is both a checkpoint and a wait\'s exit');
    this.irqs = o.irqs || {};
    this.maxFrames = o.maxFrames || 500;
    const keep = new Uint8Array(65536);
    for (const [a, b] of o.compare || [[0x0002, 0x00FF], [0x0200, 0xFFFF]]) keep.fill(1, a, b + 1);
    for (const x of o.ignore || []) if (Array.isArray(x)) keep.fill(0, x[0], x[1] + 1); else keep[x] = 0;
    const addrs = [];
    for (let a = 0; a < 65536; a++) if (keep[a]) addrs.push(a);
    this.addrs = Int32Array.from(addrs);
    this.chipList = o.chips || ['colour'];
    for (const c of this.chipList) if (!['colour', 'vic', 'sid', 'cia'].includes(c)) throw new Error('Lockstep: no chip ' + c + ' to compare');
    // the port starts as the game is
    P.M.set(m.ram);
    const c = this.chips = new PortChips();
    c.game = m;
    c.raster = m.line;
    c.vic.set(m.vic); c.colour.set(m.colour); c.sidw.set(m.sidw);
    for (const k of ['cmp', 'latch', 'enable', 'pra', 'ddra', 'ddrb', 'pra2', 'ddra2']) c[k] = m[k];
    if (m.cia) c.cia = JSON.parse(JSON.stringify(m.cia));   // CIA 2's port and the timers' latches; they never count here
    this.irqBytes = new Set((o.irqBytes || []).map(a => a & 0xFFFF));
    this.ib = { live: new Map(), list: null, used: new Map() };   // the stretch's reads of them
    this.io = this.makeIO();
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
    this.at = this.cps.has(pc) || this.waits.has(pc) ? pc : -1;
    this.matched = false;
    this.resume = -1;
    this.through = -1;                             // a checkpoint the game passes while it waits for the raster
    this.pending = [];                             // interrupts the game took, not yet run in the port
    this.fix = new Map();                          // bytes they wrote, until the next checkpoint
    this.irq = null;                               // the one running on the machine
    this.replaying = null;                         // the one running in the port
    this.irqCycles = 0; this.irqCount = 0;
    this.cycles0 = m.cpu.cycles;
    this.passes = 0; this.syncs = 0; this.last = -1; this.idle = 0; this.syncFrame = m.frames; this.since = 0;
    this.halted = null; this.stopped = false; this.saved = null; this.res = null;
    this.from = -1; this.c0 = m.cpu.cycles; this.ic0 = 0; this.in0 = 0; this.polls = 0; this.estimate = 0;
  }

  // --- the port's chips ---
  makeIO() {
    const c = this.chips, rd = a => this.portRead(a & 0xFFFF), wr = (a, v) => c.ioWrite(a & 0xFFFF, v & 0xFF);
    return {
      read: rd, write: wr,
      vicRead: r => rd(0xD000 | (r & 0x3F)), vicWrite: (r, v) => wr(0xD000 | (r & 0x3F), v),
      sidRead: r => rd(0xD400 | (r & 0x1F)), sidWrite: (r, v) => wr(0xD400 | (r & 0x1F), v),
      colourRead: i => c.colour[i & 0x3FF], colourWrite: (i, v) => wr(0xD800 | (i & 0x3FF), v),
      ciaRead: r => rd(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => wr(0xDC00 | (r & 0x0F), v),
      cia2Read: r => rd(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => wr(0xDD00 | (r & 0x0F), v),
      irqByte: a => this.irqByte(a & 0xFFFF),
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
    const m = this.m, g = m.constructor.restore(m.save());
    if (!(g instanceof m.constructor)) throw new Error('Lockstep: irqBytes needs ' + m.constructor.name + '.restore, to copy the machine');
    g.sidw.set(m.sidw);
    const out = new Map(), B = this.irqBytes;
    for (const [a, vs] of this.ib.live) out.set(a, vs.slice());
    let depth = 0, stop = false, skip = g.cpu.pc;
    for (const a of [...this.cps, ...this.waits]) {
      const prev = g.hooks[a];
      g.hooks[a] = c => {
        if (depth) return prev ? prev(c) : false;                     // an interrupt's code
        if (a === skip) { skip = -1; return prev ? prev(c) : false; }   // the stop it starts at
        stop = true; g.stopFlag = true; return true;
      };
    }
    const irq = g.cpu.irq, run = g.cpu.run;
    g.cpu.irq = function (h, o) { depth++; try { return irq.call(this, h, o); } finally { depth--; } };
    const reads = new Proxy({}, { set(t, k) {
      const a = +k;
      if (!depth && B.has(a)) { if (!out.has(a)) out.set(a, []); out.get(a).push(g.ram[a]); }
      return true;
    } });
    g.cpu.run = function (o) { return run.call(this, Object.assign({}, o, { reads })); };
    const end = g.frames + this.maxFrames;
    while (!stop && g.frames < end) g.runCycles(FRAME);
    return out;
  }
  // A chip read, the raster as the game's interrupt handler read it while one is being replayed.
  portRead(a) {
    const v = this.chips.ioRead(a), q = this.replaying;
    if (q !== null && a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12 && q.i12 < q.d012.length) return q.d012[q.i12++];
      if (r === 0x11 && q.i11 < q.d011.length) return (v & 0x7F) | (q.d011[q.i11++] & 0x80);
    }
    return v;
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
    const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
    const s = this.saved = { hooks: {}, onPass: m.onPass, irq: own(cpu, 'irq'), ioRead: own(m, 'ioRead'), run: own(cpu, 'run') };
    m.onPass = null;
    for (const a of [...this.cps, ...this.waits]) {
      const prev = m.hooks[a];
      s.hooks[a] = prev;
      m.hooks[a] = c => {
        if (ls.irq !== null) return prev ? prev(c) : false;            // an interrupt's code, not the main program
        if (ls.resume === a) { ls.resume = -1; return prev ? prev(c) : false; }
        if (ls.through === a) return prev ? prev(c) : false;          // the head of the loop a raster wait turns in
        ls.at = a; ls.matched = false; m.stopFlag = true;
        return true;
      };
    }
    // An interrupt: its handler's address, when it came, what it read of RAM before writing it
    // (seen) and what it wrote (wrote, with the values it left), through the simulator's maps of
    // the addresses a run reads and writes as data; the stack's traffic is not in them.
    const irq = cpu.irq, RAM_R = cpu.rk[2], RAM_W = cpu.wk[2];          // page 2 is RAM on any map
    cpu.irq = function (handler, opts) {
      const c = this, q = { at: handler != null ? handler & 0xFFFF : c.vector(0xFFFE, 'IRQ'), line: m.line, frame: m.frames,
        cycle: c.cycles, cycles: 0, end: 0, d011: [], d012: [], i11: 0, i12: 0, seen: new Map(), wrote: new Map() };
      const reads = new Proxy({}, { set(t, k) {
        const a = +k;
        if ((a < 0x100 ? a > 1 : c.rk[a >>> 8] === RAM_R) && !q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, c.m[a]);
        return true;
      } });
      const writes = new Proxy({}, { set(t, k) {
        const a = +k;
        if (a < 0x100 ? a > 1 : c.wk[a >>> 8] === RAM_W) q.wrote.set(a, 0);
        return true;
      } });
      ls.irq = q;
      try { return irq.call(c, handler, Object.assign({}, opts, { reads, writes })); }
      finally {
        ls.irq = null;
        for (const a of q.wrote.keys()) q.wrote.set(a, c.m[a]);
        q.cycles = c.cycles - q.cycle; q.end = m.line;
        ls.irqCycles += q.cycles; ls.irqCount++;
        ls.pending.push(q);
      }
    };
    // the main program's reads of irqBytes, as it makes them
    if (this.irqBytes.size) {
      const run = cpu.run, B = this.irqBytes, live = () => ls.ib.live;
      const reads = new Proxy({}, { set(t, k) {
        const a = +k;
        if (ls.irq === null && B.has(a) && !ls.ib.list) { const L = live(); if (!L.has(a)) L.set(a, []); L.get(a).push(cpu.m[a]); }
        return true;
      } });
      cpu.run = function (o) { return run.call(this, Object.assign({}, o, { reads })); };
    }
    const ioRead = m.ioRead;
    m.ioRead = function (a) {
      const v = ioRead.call(this, a), q = ls.irq;
      if (q !== null && a >= 0xD000 && a < 0xD400) {
        const r = a & 0x3F;
        if (r === 0x12) q.d012.push(v); else if (r === 0x11) q.d011.push(v);
      }
      return v;
    };
  }
  detach() {
    const m = this.m, s = this.saved;
    if (!s) return;
    for (const a of Object.keys(s.hooks)) { if (s.hooks[a]) m.hooks[a] = s.hooks[a]; else delete m.hooks[a]; }
    if (s.irq) m.cpu.irq = s.irq; else delete m.cpu.irq;
    if (s.ioRead) m.ioRead = s.ioRead; else delete m.ioRead;
    if (s.run) m.cpu.run = s.run; else delete m.cpu.run;
    m.onPass = s.onPass;
    this.saved = null;
  }

  // Run the game on to its next stop, a checkpoint or a wait's exit; or find it waiting at one the
  // port has not reached. -1 when it reaches none in maxFrames.
  toStop() {
    const m = this.m;
    if (this.at >= 0 && !this.matched) return this.at;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    const end = m.frames + this.maxFrames;
    while (this.at < 0 && m.frames < end) m.runCycles(FRAME);
    return this.at;
  }
  // Run the game on for n cycles of its own work (its interrupts not counted), or to its next
  // raster line when n is 0, unless it reaches a stop first. It does not move while it waits at a
  // stop the port has not reached.
  forCycles(n) {
    const m = this.m, cpu = m.cpu;
    if (this.at >= 0 && !this.matched) return false;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    if (n <= 0) { m.runCycles(1); return true; }
    const c0 = cpu.cycles, i0 = this.irqCycles, own = () => (cpu.cycles - c0) - (this.irqCycles - i0);
    while (this.at < 0 && own() < n) m.runCycles(n - own());
    return true;
  }
  // Run in the port the interrupts the game has taken since the last yield, then give the port the
  // game's raster line. Each runs on the bytes the game's handler read, as it read them, which go
  // back to the port's values after unless it wrote them. What each wrote is kept in fix for
  // lastWriters: the port's value before (b), the handler's (h) and the game's handler's (v).
  settle() {
    const list = this.pending, c = this.chips, P = this.P, M = P.M, fix = this.fix;
    if (list.length) {
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
          this.replaying = q; c.raster = q.end; c.latch |= 1;
          const r = f.call(P);
          if (r && typeof r.next === 'function') throw new Error('Lockstep: the handler for ' + hex(q.at) + ' is a generator; an interrupt runs to its end');
          for (let i = 0; i < put.length; i += 2) if (!q.wrote.has(put[i])) M[put[i]] = put[i + 1];
          for (const [a, v] of q.wrote) { const x = fix.get(a); x.v = v; x.h = M[a]; }
        }
      } catch (e) { throw this.annotate(e); }
      finally { this.replaying = null; this.counting = counting; }
    }
    c.raster = this.m.line;
  }
  // At a checkpoint or a wait's exit, where the game and the port stand at the same place: a byte
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
    if (y && y.wait !== undefined) return this.rasterWait(y.wait, y);
    if (y && y.cycles !== undefined) {
      this.estimate += y.cycles;
      if (this.forCycles(y.cycles)) this.idle = 0;
      this.settle();
      this.frameInput();
      return this.running();
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
    if (y.cycles !== undefined) this.estimate += y.cycles;
    // the place just reached, named again with nothing run between (a start-up's last { cycles, at }
    // and the main loop's first checkpoint, say): one place
    if (a === this.last && this.at === a && this.matched && this.since === 1) return;
    const at = this.toStop();
    if (at !== a) {
      return this.diverge(at < 0 ? this.lost('checkpoint ' + hex(a))
        : 'the game went to ' + hex(at) + (this.waits.has(at) ? ' (a raster wait\'s exit)' : '') + ', the port to ' + hex(a), { game: at, port: a });
    }
    this.sync(a, false);
    if (a === this.passAt) this.passStart();
    this.frameInput();
  }
  rasterWait(line, y) {
    if (!this.waits.size) throw this.annotate(new Error('Lockstep: the port waits for the raster, and no waits are given'));
    this.through = this.last;
    let at;
    try { at = this.toStop(); } finally { this.through = -1; }
    const ln = this.m.line;
    if (!this.waits.has(at)) {
      return this.diverge(at < 0 ? this.lost('a raster wait') : 'the game went to ' + hex(at) + ', the port waited for line ' + line,
        { game: at, port: 'wait' });
    }
    if ((ln - line + LINES) % LINES > 1) {
      return this.diverge('the game left its raster wait at ' + hex(at) + ' on line ' + ln + ', the port waited for line ' + line,
        { game: at, port: 'wait', line: ln });
    }
    this.sync(at, true);
    this.frameInput();
  }
  poll() {
    this.polls++;
    if (this.at >= 0 && !this.matched) {           // the game waits at a stop ahead: the port's raster runs alone
      this.chips.raster = (this.chips.raster + 1) % LINES;
      if (++this.idle > 2 * LINES) return this.diverge('the port polls on while the game waits at ' + hex(this.at), { game: this.at, port: 'poll' });
      return;
    }
    this.forCycles(0);
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
  sync(a, wait) {
    this.matched = true; this.idle = 0; this.syncFrame = this.m.frames;
    this.settle();
    this.lastWriters();
    const m = this.m, cyc = m.cpu.cycles;
    if (this.timing && this.from >= 0) {
      const irqCycles = this.irqCycles - this.ic0;
      this.timing({ pass: this.passes, from: this.from, to: a, wait, cycles: cyc - this.c0 - irqCycles, irqs: this.irqCount - this.in0,
        irqCycles, calls: this.calls, polls: this.polls, estimate: this.estimate });
    }
    this.from = a; this.c0 = cyc; this.ic0 = this.irqCycles; this.in0 = this.irqCount;
    this.calls = {}; this.polls = 0; this.estimate = 0;
    this.syncs++; this.last = a; this.since = 0;
    this.ib = { live: new Map(), list: null, used: new Map() };
  }
  passStart() {
    const m = this.m;
    if (m.cpu.cycles !== this.cycles0) { this.passes++; this.res.passes++; }
    const d = this.compare();
    if (d) {
      this.res.diffs.push(Object.assign({ pass: this.passes, frame: m.frames, cycle: m.cpu.cycles }, d));
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
    const g = this.m, p = this.chips;
    for (const chip of this.chipList) {
      if (chip === 'colour') {
        for (let i = 0; i < 0x400; i++) if ((g.colour[i] & 15) !== (p.colour[i] & 15)) add(0xD800 + i, g.colour[i] & 15, p.colour[i] & 15, chip);
      } else if (chip === 'vic') {
        for (let r = 0; r < 0x40; r++) if (r !== 0x12 && r !== 0x19 && r !== 0x1A && g.vic[r] !== p.vic[r]) add(0xD000 + r, g.vic[r], p.vic[r], chip);
        if (g.cmp !== p.cmp) add(0xD012, g.cmp, p.cmp, chip);
        if (g.enable !== p.enable) add(0xD01A, g.enable, p.enable, chip);
      } else if (chip === 'sid') {
        for (let r = 0; r < 0x20; r++) if (g.sidw[r] !== p.sidw[r]) add(0xD400 + r, g.sidw[r], p.sidw[r], chip);
      } else {
        for (const [k, a] of [['pra', 0xDC00], ['ddra', 0xDC02], ['ddrb', 0xDC03]]) if (g[k] !== p[k]) add(a, g[k], p[k], chip);
      }
    }
    return count ? { count, bytes } : null;
  }
  // The port's compared memory and chips made the game's again.
  resync() {
    const M = this.P.M, R = this.m.ram, A = this.addrs, g = this.m, p = this.chips;
    for (let i = 0; i < A.length; i++) M[A[i]] = R[A[i]];
    for (const chip of this.chipList) {
      if (chip === 'colour') p.colour.set(g.colour);
      else if (chip === 'vic') { p.vic.set(g.vic); p.cmp = g.cmp; p.enable = g.enable; }
      else if (chip === 'sid') p.sidw.set(g.sidw);
      else { p.pra = g.pra; p.ddra = g.ddra; p.ddrb = g.ddrb; }
    }
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
    this.halted = Object.assign({ pass: this.passes, after: this.last, frame: m.frames, cycle: m.cpu.cycles, pc: m.cpu.pc, why }, extra);
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

// The game's routine at address, standing in for the port's (see the header).
const standInCpus = new WeakMap();
function standIn(P, address, opts = {}) {
  return function (r) {
    let cpu = standInCpus.get(P);
    if (!cpu) {
      cpu = new CPU(P.M, { port: opts.port || { dir: 0x2F, data: 0x35 }, io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
      standInCpus.set(P, cpu);
    }
    r = r || {};
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'n', 'v', 'd', 'i', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
    cpu.setRegs(regs);
    cpu.sp = 0xFF;
    if (opts.irq) cpu.irq(address, { maxSteps: opts.maxSteps });
    else cpu.call(address, {}, { maxSteps: opts.maxSteps });
    return { a: cpu.a, x: cpu.x, y: cpu.y, n: cpu.n, v: cpu.v, z: cpu.z, c: cpu.c };
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

module.exports = { Lockstep, standIn, describe, PortChips };
