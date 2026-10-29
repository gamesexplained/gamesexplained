'use strict';
// A port of a whole game checked against the game's own code, pass by pass (kit/skills/core/
// 70-minisite/play.md, "A whole game, checked against its own code"), on the NES. The game runs on
// the kit's NES (kit/nes/machine.js) while the port runs beside it on its own copy of the game's
// memory. Wherever the port says it has got to, the game is run to the same place; the NMIs the
// game took on the way are run in the port there; and at the start of every pass the two memories
// are compared. The C64's lockstep (kit/c64/lockstep.js) is the model: the port's side is the
// same, with the NES's chips and its one interrupt, the NMI at each vertical blank, in place of
// the raster's. Checked by kit/nes/test_lockstep.js, on kit/nes/test_machine.js's program and a
// port of it.
//
// The port's side. A port is an object P of routines on the game's memory:
// - P.M, the game's 64 KB (a Uint8Array(65536)), read and written at the game's addresses. The
//   lockstep fills it from the machine's RAM when it is made.
// - P.io, the chips, which the lockstep sets (members it does not define are kept): read(a) and
//   write(a, v) by address, as the game's loads and stores reach them ($2000-$2007 and their
//   mirrors, $4014, $4016 and $4017, the APU's), and ppu, the port's own NES.ppu (site/lib/nes.js),
//   which a page draws from. They are a second set of the machine's chips, started as the game's:
//   the same state, the game's controllers, and the beam's line the lockstep sets. The port reads
//   P.io when it runs, not when it is built.
// - The main program, a generator (program below), which yields where the game's code has got to:
//     { cp: a }       the game's program counter has reached a checkpoint a, where the main loop
//                     calls a routine (the JSR, which is also where the call before returns to);
//                     a pass starts at the machine's passAt
//     { cycles: n }   n cycles of the game's own work, as a page's clock counts them; with at: a,
//                     the game is at a, and it is a checkpoint when a is listed
//     anything else   a bare yield, one turn of a polling loop: one line of the beam passes
//   A game that waits for its frame in a loop on a flag the NMI sets (nearly every NES game) polls
//   with bare yields: while (M[flag] === 0) yield; the NMI the game takes meanwhile runs in the
//   port at the next yield, and sets the flag there.
// - The NMI handler, a plain function, for the address the game's vector at $FFFA points to.
//
// const { Machine } = require('kit/nes/machine.js');
// const { Lockstep, standIn, standInGen, checkGen, describe } = require('kit/nes/lockstep.js');
// const m = Machine.fromSnapshot('games/nes/<slug>/work/play.json.gz');
// const ls = new Lockstep({ machine: m, port: P, program: P => P.main(), passAt: 0xF46F,
//   checkpoints: [0xF2BC, 0xF2C5, 0xF2C8], nmis: { 0xC094: 'nmi' } });
// const r = ls.run({ passes: 1000, onPass: (n, m) => { m.pads[0] = input[n]; } });
// console.log(describe(r));
//
// Options:
// - machine: the game, a Machine stopped at a checkpoint (restored from a state saved at passAt,
//   usually) or before one (the reset vector, for a port whose program starts there too). passAt,
//   the main loop's first checkpoint, is the machine's unless given.
// - port: P. program(P) gives the port's main program, made once. A port that throws to restart its
//   main loop gives a generator that catches the throw and starts the loop again, as its page does.
// - checkpoints: every address the port yields as a checkpoint. The game runs until its program
//   counter reaches any of them, outside its NMI handler. Reaching another than the port's is a
//   divergence of path, and the run stops with both named. The same place named twice running with
//   nothing between (a start-up's last { cycles, at } and the main loop's first checkpoint) is one.
//   A { cp } yielded twice running is two arrivals: a game whose every pass reaches one address
//   (the exit of its wait for the frame, called from everywhere) yields it once a pass.
// - nmis: { handler address: a function, or the name of one of P's }. The NMIs the game took run
//   in the port in order, at the port's next yield of any kind: a replay can keep the order but
//   not the place inside a stretch. So each runs on the memory the game's handler saw: the RAM it
//   read, its instructions' operands among them, is set to the values it read (the stack aside),
//   and goes back to the port's after unless it wrote them. Its reads of PPUSTATUS ($2002) get the
//   values the game's did, in turn. At the next checkpoint, where the two stand at the same place,
//   a byte the handler wrote and the game's main program wrote again afterwards gets back the
//   port's own value: the last writer of each byte is the game's. What no replay can give is the
//   main program reading, in the middle of a stretch, what the handler wrote there: those are the
//   game's own races (the skill says how to show one; a game that waits for its frame in a loop
//   has none, since the NMI falls inside the wait). The PPU's memory, the sprite table and the
//   registers are replayed as they are: a handler reads the port's, and its writes stand.
// - The beam: between yields the port reads the line the game was on at the last one, and its
//   PPUSTATUS flag is up from the yield after a vertical blank began until the beam clears it. A
//   bare yield runs the game on to its next line, taking the NMI if it falls due, so a polling
//   loop in the port sees the flag the game's loop does, when it does.
// - compare: the RAM ranges compared at the start of every pass, [first, last] with both included
//   (default: all 2 KB but the stack page, which a port does not keep). ignore: addresses and
//   ranges left out, for a race shown, not guessed (the skill).
// - chips: which chips are compared too: 'ppu' (the default: the nametables, the palette, the
//   sprite table, the registers and the scroll as written) and 'apu' (its registers as written).
// - timing(stretch): called for every stretch between two checkpoints, with { pass, from, to,
//   cycles, nmis, nmiCycles, calls, polls, estimate }: the game's cycles from one to the other
//   with its NMIs' taken out (nmiCycles, nmis); how often the port called each of P's own
//   functions in between, the handler not counted (P's functions are wrapped to count them when
//   the lockstep is made); the port's bare yields; and the port's own { cycles } for the stretch.
//   These are the rows of the pacing fit.
// - maxFrames: how long the game may run to the port's next checkpoint (default 500).
// - irqBytes: addresses of RAM the NMI handler writes and the main program reads in the middle of
//   a stretch (a frame counter read for a random seed), for the race replay cannot give. The port
//   reads each through P.io.irqByte(a), and gets, in turn, the values the game's main program read
//   of it in the same stretch (a read past those, the port's own byte). The port runs a stretch
//   before the game does, so what the game has not yet read comes from a copy of the machine run
//   on ahead to its next checkpoint: Machine.restore(save()). Input onFrame gives inside the
//   stretch, after the copy is made, is not in it. On the page, outside the lockstep, the port's
//   io gives irqByte: a => M[a].
// - hooks: the machine's own stand-ins, by address, as Machine's hooks take them: put on the
//   machine for the run and on the copies irqBytes runs on ahead. A hook acts on the cpu it is
//   given (c.m, the registers), never on a machine it keeps.
//
// run({ passes, onPass, onFrame, stopOnDiff }) runs until passes more passes have started (default
// 1) and returns { passes, ok, diffs, diverged, frames }. At the start of each pass, once the NMIs
// have run, memory is compared, and then onPass(n, machine, lockstep) runs: the place to set the
// pass's input on the machine (pads; the port reads the same). onFrame(frame, machine, lockstep)
// runs for every frame the game begins, at the port's next yield, for input a game reads in the
// middle of a pass: input changes only at a yield, where both read the same. A pass whose start
// differs is in diffs, { pass, frame, cycle, count, bytes: [{ address, game, port, chip }] } (the
// first 64 bytes); the run stops there (the default, with the machine, P.M and the lockstep's io as
// they are), or with stopOnDiff: false copies the game's compared memory to the port's and goes on
// (resync() does the same). A divergence ends the lockstep: a checkpoint other than the port's, a
// port that polls while the game waits at a checkpoint ahead, or no checkpoint in maxFrames;
// diverged says where. passes counts pass starts, but not the one the lockstep was made at.
// describe(result) gives a result as lines to print.
//
// standIn(P, address, { nmi, maxSteps }) is the game's own routine at address, run on P.M through
// P.io by the kit's simulator, for a port whose routine is not written yet: P.draw = standIn(P,
// 0xC800) takes and returns registers ({ a, x, y, c ... }) as the port's routines do; with nmi it
// is an interrupt handler for nmis. The stack pointer starts at $FF each call, or below the stack
// of a standInGen that is waiting. A routine that waits for the frame cannot stand in this way,
// since nothing moves while it runs: standInGen can.
//
// standInGen(P, address, { polls, maxSteps }) is the game's routine at address standing in for one
// that waits, as a generator: P.wait_frame = standInGen(P, 0xF465, { polls: [0x02] }), called as
// r = yield* P.wait_frame(regs). It runs the routine an instruction at a time on standIn's
// simulator and yields where the game's code lets time pass, so the lockstep runs the game on to
// the same place:
// - a bare yield at each turn of a polling loop: before an instruction that reads a poll address,
//   when the instruction at that address has read one since the last yield. The routine then
//   reads the flag the game's loop reads, as the NMI the game took has left it.
// - { cycles: n } before a read of a poll address, and before it returns, once it has run a line
//   or more since the last yield (the first time, counted from the JSR that calls it). The game
//   catches up to the start of the line the routine has reached, never past it.
// The poll addresses are PPUSTATUS at every mirror; polls adds the RAM the NMI handler writes and
// the game's loops wait on (a frame flag, a counter). The routine reads such a byte through
// P.io.irqByte(a) where P.io has one (list the byte in irqBytes) until a turn of a loop has read
// it, and from P.M after that. The address an instruction reads is worked out before it runs, in
// every mode that reads data. The routine's registers and stack are kept while it waits. It
// returns registers as standIn does, and stops with an error after maxSteps instructions
// (default 1,000,000).
//
// checkGen(P, routine, address, opts) checks a port's routine that waits, a generator (one of P's,
// or its name), against the game's routine at address, alone: the port on P.M as it stands and
// the game, by standInGen, on a copy, each with chips of its own (P.io becomes the port's, with
// irqByte a => M[a]). Both are called with opts.regs. Each side runs to its next bare yield
// ({ cp } and { cycles } are passed over); the memories are compared there, the clock moves on by
// hand on both sides, and both go on. When both return, the memories and the registers the port's
// routine returns are compared. The port yields where the game's loop is about to read again: a
// loop that only polls is while (M[f] === v) yield, and the work of a turn comes before its yield.
// - frame: a RAM address the NMI counts frames in or sets as a flag, one up on both sides at each
//   yield (the way to stand in for the NMI handler's one line); or 'line' (the default), the
//   beam's line, one line on, with the vertical blank flag set as the beam passes line 241.
// - polls: more addresses the game's routine polls (frame is one); maxSteps as standInGen's.
// - onYield(M, io, frame, line): runs on each side, the game's first, once the clock has moved:
//   the place for whatever else the handler does there.
// - compare, ignore and chips as the lockstep's; maxFrames, how long the routines may wait
//   (default 1000).
// It returns { ok, frames, diff }: frames, the frames passed; diff, the first difference,
// { frame, line, why, count, bytes, regs }, with why a line to print.
//
// While a lockstep runs it owns the machine: it hooks the checkpoints and wraps the machine's nmi
// and ioRead, and it puts them back when run returns.
const { Machine, LINE, LINES, MAP } = require('./machine.js');
const { CPU, OPCODES } = require('../cpu/cpu6502.js');
require('../../site/lib/nes.js');
const NES = globalThis.NES;
const FRAME = 29781;
const LENGTH = Uint8Array.from(OPCODES, ([, mode]) => mode === 'imp' || mode === 'acc' ? 1 : ['abs', 'abx', 'aby', 'ind'].includes(mode) ? 3 : 2);
const DATA = Uint8Array.from(OPCODES, ([name, mode]) => ['imp', 'acc', 'imm', 'rel', 'ind'].includes(mode) ||
  ['sta', 'stx', 'sty', 'sax', 'sha', 'shx', 'shy', 'shs', 'jmp', 'jsr'].includes(name) ? 0 :
  ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec', 'slo', 'rla', 'sre', 'rra', 'dcp', 'isb'].includes(name) ? 2 : 1);

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
const isStatus = a => a >= 0x2000 && a < 0x4000 && (a & 7) === 2;
const isRam = a => a < 0x0800;                     // the 2 KB; the machine folds the mirrors there
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const LIST = 64;
const CHIPS = ['ppu', 'apu'];

function ranges(o) {
  const keep = new Uint8Array(65536), runs = [];
  for (const [a, b] of o.compare || [[0x0000, 0x00FF], [0x0200, 0x07FF]]) keep.fill(1, a, b + 1);
  for (const x of o.ignore || []) if (Array.isArray(x)) keep.fill(0, x[0], x[1] + 1); else keep[x] = 0;
  for (let a = 0; a < 65536; a++) {
    if (!keep[a]) continue;
    let b = a;
    while (b < 65535 && keep[b + 1]) b++;
    runs.push([a, b]);
    a = b;
  }
  return runs;
}
function chipNames(o) {
  const list = o.chips || ['ppu'];
  for (const c of list) if (!CHIPS.includes(c)) throw new Error('no chip ' + c + ' to compare');
  return list;
}
const view = (u, a, b) => Buffer.from(u.buffer, u.byteOffset + a, b - a + 1);
// What differs between the game's side (its RAM R and chips g) and the port's (M and p).
function differ(R, g, M, p, runs, chips) {
  const bytes = [];
  let count = 0;
  const add = (address, game, port, chip) => {
    if (bytes.length < LIST) bytes.push(chip ? { address, game, port, chip } : { address, game, port });
    count++;
  };
  for (const [a, b] of runs) {
    if (Buffer.compare(view(R, a, b), view(M, a, b)) === 0) continue;
    for (let i = a; i <= b; i++) if (M[i] !== R[i]) add(i, R[i], M[i]);
  }
  for (const chip of chips) {
    if (chip === 'ppu') {
      const gp = g.ppu, pp = p.ppu;
      for (let i = 0; i < 0x1000; i++) if (gp.nt[i] !== pp.nt[i]) add(0x2000 + i, gp.nt[i], pp.nt[i], 'nametable');
      for (let i = 0; i < 0x20; i++) if (gp.pal[i] !== pp.pal[i]) add(0x3F00 + i, gp.pal[i], pp.pal[i], 'palette');
      for (let i = 0; i < 0x100; i++) if (gp.oam[i] !== pp.oam[i]) add(i, gp.oam[i], pp.oam[i], 'oam');
      for (const [k, a] of [['ctrl', 0x2000], ['mask', 0x2001], ['oamAddr', 0x2003], ['x', 0x2005], ['t', 0x2006], ['v', 0x2007]]) if (gp[k] !== pp[k]) add(a, gp[k], pp[k], 'ppu ' + k);
    } else {
      for (let r = 0; r < 0x18; r++) if (r !== 0x14 && r !== 0x16 && g.apuw[r] !== p.apuw[r]) add(0x4000 + r, g.apuw[r], p.apuw[r], chip);
    }
  }
  return count ? { count, bytes } : null;
}
function bytesLine(d) {
  const shown = d.bytes.slice(0, 8).map(b => (b.chip ? b.chip + ' ' : '') + hex(b.address) + ' game ' + hex(b.game, 2) + ' port ' + hex(b.port, 2));
  return d.count + (d.count === 1 ? ' byte differs: ' : ' bytes differ: ') + shown.join(', ') + (d.count > shown.length ? ', ...' : '');
}
// P.io's functions on a set of chips (a PortChips), reading through rd.
function chipIO(c, rd = a => c.ioRead(a & 0xFFFF)) {
  return { read: rd, write: (a, v) => c.ioWrite(a & 0xFFFF, v & 0xFF), ppu: c.ppu };
}

// The port's chips: a second machine's, never run, whose line is the lockstep's, whose
// controllers are the game's machine's, and whose RAM (for the sprite DMA) is the port's memory.
class PortChips extends Machine {
  constructor(like) {
    super({ ram: new Uint8Array(65536), mirrorPrg: false, chr: like ? like.ppu.chr : undefined, mirroring: like ? like.ppu.mirroring : undefined });
    this.beam = 0; this.game = null;
  }
  get line() { return this.beam; }
  get now() { return this.game ? this.game.cpu.cycles : 0; }
  get pads() { return this.game ? this.game.pads : this.ownPads; }
  set pads(v) { this.ownPads = v; }
}

class Lockstep {
  constructor(o = {}) {
    const m = o.machine, P = o.port;
    if (!m || !m.cpu) throw new Error('Lockstep: no machine (kit/nes/machine.js)');
    if (!P || !(P.M instanceof Uint8Array) || P.M.length !== 65536) throw new Error('Lockstep: the port has no P.M of 64 KB');
    if (typeof o.program !== 'function') throw new Error('Lockstep: program(P) gives the port\'s main program');
    this.m = m; this.P = P;
    this.passAt = o.passAt !== undefined ? o.passAt & 0xFFFF : m.passAt;
    if (this.passAt === null || this.passAt === undefined) throw new Error('Lockstep: no passAt, on the machine or given');
    this.cps = new Set((o.checkpoints || []).map(a => a & 0xFFFF));
    this.cps.add(this.passAt);
    this.nmis = o.nmis || {};
    this.maxFrames = o.maxFrames || 500;
    this.hooks = o.hooks || {};
    this.runs = ranges(o);
    try { this.chipList = chipNames(o); } catch (e) { throw new Error('Lockstep: ' + e.message); }
    P.M.set(m.ram);
    const c = this.chips = new PortChips(m);
    c.game = m; c.ram = P.M;                        // the sprite DMA and the RAM's mirrors reach the port's memory
    c.beam = m.line;
    c.ppu.load(m.ppu.save()); c.apuw.set(m.apuw); c.strobe = m.strobe; c.shift = m.shift.slice();
    this.irqBytes = new Set((o.irqBytes || []).map(a => a & 0xFFFF));
    this.ib = { live: new Map(), list: null, used: new Map() };
    this.io = this.makeIO();
    P.io = Object.assign({}, P.io, this.io);
    this.timing = o.timing || null;
    this.counting = false;
    this.calls = {};
    if (this.timing) this.countCalls();
    this.it = o.program(P);
    if (!this.it || typeof this.it.next !== 'function') throw new Error('Lockstep: program(P) gave no generator');
    const pc = m.cpu.pc;
    this.at = this.cps.has(pc) ? pc : -1;
    this.matched = false;
    this.resume = -1;
    this.pending = [];
    this.fix = new Map();
    this.nmi = null;
    this.replaying = null;
    this.nmiCycles = 0; this.nmiCount = 0;
    this.cycles0 = m.cpu.cycles;
    this.lastFrames = m.frames;
    this.passes = 0; this.syncs = 0; this.last = -1; this.lastAt = false; this.idle = 0; this.syncFrame = m.frames; this.since = 0;
    this.halted = null; this.stopped = false; this.saved = null; this.res = null;
    this.from = -1; this.c0 = m.cpu.cycles; this.ic0 = 0; this.in0 = 0; this.polls = 0; this.estimate = 0;
  }

  makeIO() {
    return Object.assign(chipIO(this.chips, a => this.portRead(a & 0xFFFF)), { irqByte: a => this.irqByte(a & 0xFFFF) });
  }
  irqByte(a) {
    if (!this.irqBytes.has(a)) throw this.annotate(new Error('Lockstep: the port read ' + hex(a) + ' through irqByte, and it is not in irqBytes'));
    const s = this.ib, i = s.used.get(a) || 0;
    s.used.set(a, i + 1);
    let vs = (s.list || s.live).get(a) || [];
    if (i >= vs.length && !s.list && !(this.at >= 0 && !this.matched)) { s.list = this.lookahead(); vs = s.list.get(a) || []; }
    return i < vs.length ? vs[i] : this.P.M[a];
  }
  lookahead() {
    const m = this.m, g = m.constructor.restore(m.save());
    if (!(g instanceof m.constructor)) throw new Error('Lockstep: irqBytes needs ' + m.constructor.name + '.restore, to copy the machine');
    const out = new Map(), B = this.irqBytes;
    for (const [a, vs] of this.ib.live) out.set(a, vs.slice());
    let depth = 0, stop = false, skip = g.cpu.pc;
    Object.assign(g.hooks, this.hooks);
    for (const a of this.cps) {
      const prev = g.hooks[a];
      g.hooks[a] = c => {
        if (depth) return prev ? prev(c) : false;
        if (a === skip) { skip = -1; return prev ? prev(c) : false; }
        stop = true; g.stopFlag = true; return true;
      };
    }
    const nmi = g.cpu.nmi, run = g.cpu.run;
    g.cpu.nmi = function (h, o) { depth++; try { return nmi.call(this, h, o); } finally { depth--; } };
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
  // A chip read; PPUSTATUS as the game's handler read it while one is being replayed.
  portRead(a) {
    const q = this.replaying;
    if (q !== null && isStatus(a) && q.i2 < q.status.length) { this.chips.ppu.vblank = 0; this.chips.ppu.w = 0; return q.status[q.i2++]; }
    return this.chips.ioRead(a);
  }
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

  attach() {
    const m = this.m, cpu = m.cpu, ls = this;
    if (this.at >= 0 && cpu.pc !== this.at) throw new Error('Lockstep: the machine has run since the lockstep stopped it');
    const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
    const s = this.saved = { hooks: {}, onPass: m.onPass, nmi: own(cpu, 'nmi'), ioRead: own(m, 'ioRead'), run: own(cpu, 'run') };
    m.onPass = null;
    for (const [a, h] of Object.entries(this.hooks)) { s.hooks[a] = m.hooks[a]; m.hooks[a] = h; }
    for (const a of this.cps) {
      const prev = m.hooks[a];
      if (!Object.prototype.hasOwnProperty.call(s.hooks, a)) s.hooks[a] = prev;
      m.hooks[a] = c => {
        if (ls.nmi !== null) return prev ? prev(c) : false;
        if (ls.resume === a) { ls.resume = -1; return prev ? prev(c) : false; }
        ls.at = a; ls.matched = false; m.stopFlag = true;
        return true;
      };
    }
    // An NMI: when it came, what it read of RAM before writing it (seen) and what it wrote
    // (wrote, with the values it left), and its reads of PPUSTATUS.
    const nmi = cpu.nmi;
    cpu.nmi = function (handler, opts) {
      const c = this, q = { at: handler != null ? handler & 0xFFFF : c.vector(0xFFFA, 'NMI'), line: m.line, frame: m.frames,
        cycle: c.cycles, cycles: 0, end: 0, status: [], i2: 0, seen: new Map(), wrote: new Map() };
      const reads = new Proxy({}, { set(t, k) {
        const a = +k;
        if (isRam(a) && !(a >= 0x100 && a < 0x200) && !q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, c.m[a]);
        return true;
      } });
      const writes = new Proxy({}, { set(t, k) {
        const a = +k;
        if (isRam(a) && !(a >= 0x100 && a < 0x200)) q.wrote.set(a, 0);
        return true;
      } });
      const executed = new Proxy({}, { set(t, k) {
        const a = +k;
        if (!isRam(a)) return true;
        for (let i = 1; i < LENGTH[c.m[a]]; i++) {
          const b = (a + i) & 0xFFFF;
          if (isRam(b) && !q.seen.has(b) && !q.wrote.has(b)) q.seen.set(b, c.m[b]);
        }
        return true;
      } });
      ls.nmi = q;
      try { return nmi.call(c, handler, Object.assign({}, opts, { reads, writes, executed })); }
      finally {
        ls.nmi = null;
        for (const a of q.wrote.keys()) q.wrote.set(a, c.m[a]);
        q.cycles = c.cycles - q.cycle; q.end = m.line;
        ls.nmiCycles += q.cycles; ls.nmiCount++;
        ls.pending.push(q);
      }
    };
    if (this.irqBytes.size) {
      const run = cpu.run, B = this.irqBytes, live = () => ls.ib.live;
      const reads = new Proxy({}, { set(t, k) {
        const a = +k;
        if (ls.nmi === null && B.has(a) && !ls.ib.list) { const L = live(); if (!L.has(a)) L.set(a, []); L.get(a).push(cpu.m[a]); }
        return true;
      } });
      cpu.run = function (o) { return run.call(this, Object.assign({}, o, { reads })); };
    }
    const ioRead = m.ioRead;
    m.ioRead = function (a) {
      const v = ioRead.call(this, a), q = ls.nmi;
      if (q !== null && isStatus(a)) q.status.push(v);
      return v;
    };
  }
  detach() {
    const m = this.m, s = this.saved;
    if (!s) return;
    for (const a of Object.keys(s.hooks)) { if (s.hooks[a]) m.hooks[a] = s.hooks[a]; else delete m.hooks[a]; }
    if (s.nmi) m.cpu.nmi = s.nmi; else delete m.cpu.nmi;
    if (s.ioRead) m.ioRead = s.ioRead; else delete m.ioRead;
    if (s.run) m.cpu.run = s.run; else delete m.cpu.run;
    m.onPass = s.onPass;
    this.saved = null;
  }

  // Run the game on to its next checkpoint; or find it waiting at one the port has not reached.
  // -1 when it reaches none in maxFrames.
  toStop() {
    const m = this.m;
    if (this.at >= 0 && !this.matched) return this.at;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    const end = m.frames + this.maxFrames;
    while (this.at < 0 && m.frames < end) m.runCycles(FRAME);
    return this.at;
  }
  // Run the game on for n cycles of its own work (its NMIs not counted), or to its next line when
  // n is 0, unless it reaches a checkpoint first. It does not move while it waits at a checkpoint
  // the port has not reached.
  forCycles(n) {
    const m = this.m, cpu = m.cpu;
    if (this.at >= 0 && !this.matched) return false;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    if (n <= 0) { m.runCycles(1); return true; }
    const c0 = cpu.cycles, i0 = this.nmiCycles, own = () => (cpu.cycles - c0) - (this.nmiCycles - i0);
    while (this.at < 0 && own() < n) m.runCycles(n - own());
    return true;
  }
  // Run in the port the NMIs the game has taken since the last yield, then give the port the
  // game's line.
  settle() {
    const list = this.pending, c = this.chips, P = this.P, M = P.M, fix = this.fix;
    if (list.length) {
      this.pending = [];
      const counting = this.counting;
      this.counting = false;
      try {
        for (const q of list) {
          let f = this.nmis[q.at];
          if (typeof f === 'string') f = P[f];
          if (typeof f !== 'function') throw new Error('Lockstep: no port handler for the NMI at ' + hex(q.at) + ' (nmis)');
          for (const a of q.wrote.keys()) {
            const x = fix.get(a);
            if (!x) fix.set(a, { b: M[a], h: -1, v: -1 });
            else if (M[a] !== x.h) x.b = M[a];
          }
          const put = [];
          for (const [a, v] of q.seen) if (M[a] !== v) { put.push(a, M[a]); M[a] = v; }
          this.replaying = q; c.beam = q.line; c.ppu.vblank = 1;
          const r = f.call(P);
          if (r && typeof r.next === 'function') throw new Error('Lockstep: the handler for ' + hex(q.at) + ' is a generator; an interrupt runs to its end');
          for (let i = 0; i < put.length; i += 2) if (!q.wrote.has(put[i])) M[put[i]] = put[i + 1];
          for (const [a, v] of q.wrote) { const x = fix.get(a); x.v = v; x.h = M[a]; }
          c.ppu.vblank = this.m.ppu.vblank;
        }
      } catch (e) { throw this.annotate(e); }
      finally { this.replaying = null; this.counting = counting; }
    }
    c.beam = this.m.line;
    // the port's vertical blank flag follows the beam: up when a vertical blank has begun since
    // the last yield (a port that polls PPUSTATUS, as a reset does, reads it as the game did),
    // down once the beam has cleared it
    const m = this.m;
    if (m.frames !== this.lastFrames) { this.lastFrames = m.frames; c.ppu.vblank = 1; }
    else if (m.phase !== 1) c.ppu.vblank = 0;
  }
  lastWriters() {
    const M = this.P.M, R = this.m.ram;
    for (const [a, x] of this.fix) if (R[a] !== x.v && M[a] === x.h) M[a] = x.b;
    this.fix.clear();
  }

  step() {
    let r;
    this.since++;
    try { r = this.it.next(); } catch (e) { throw this.annotate(e); }
    if (r.done) return this.diverge('the port\'s program returned');
    const y = r.value;
    if (y && y.cp !== undefined) return this.checkpoint(y.cp & 0xFFFF, y);
    if (y && y.at !== undefined && this.cps.has(y.at & 0xFFFF)) return this.checkpoint(y.at & 0xFFFF, y);
    if (y && y.wait !== undefined) throw this.annotate(new Error('Lockstep: the port yielded { wait }: the NES lockstep has no raster waits; a loop on the frame\'s flag polls with bare yields'));
    if (y && y.cycles !== undefined) {
      this.estimate += y.cycles;
      if (this.forCycles(y.cycles)) this.idle = 0;
      this.settle();
      this.frameInput();
      return this.running();
    }
    return this.poll();
  }
  frameInput() {
    if (!this.onFrame) return;
    while (this.lastFrame < this.m.frames && !this.halted) this.onFrame(++this.lastFrame, this.m, this);
  }
  checkpoint(a, y) {
    if (!this.cps.has(a)) throw this.annotate(new Error('Lockstep: the port yielded checkpoint ' + hex(a) + ', which is not in checkpoints'));
    if (y.cycles !== undefined) this.estimate += y.cycles;
    if (a === this.last && this.at === a && this.matched && this.since === 1 && this.lastAt) return;
    const at = this.toStop();
    if (at !== a) {
      return this.diverge(at < 0 ? this.lost('checkpoint ' + hex(a)) : 'the game went to ' + hex(at) + ', the port to ' + hex(a), { game: at, port: a });
    }
    this.sync(a);
    this.lastAt = y.cp === undefined;
    if (a === this.passAt) this.passStart();
    this.frameInput();
  }
  poll() {
    this.polls++;
    if (this.at >= 0 && !this.matched) {
      this.chips.beam = (this.chips.beam + 1) % LINES;
      if (++this.idle > 2 * LINES) return this.diverge('the port polls on while the game waits at ' + hex(this.at), { game: this.at, port: 'poll' });
      return;
    }
    this.forCycles(0);
    this.settle();
    this.frameInput();
    return this.running();
  }
  running() {
    if (this.m.frames - this.syncFrame > this.maxFrames) {
      this.diverge('the port reached no checkpoint in ' + this.maxFrames + ' frames (the game\'s program counter is at ' + hex(this.m.cpu.pc) + ')', { port: 'poll' });
    }
  }
  sync(a) {
    this.matched = true; this.idle = 0; this.syncFrame = this.m.frames;
    this.settle();
    this.lastWriters();
    const m = this.m, cyc = m.cpu.cycles;
    if (this.timing && this.from >= 0) {
      const nmiCycles = this.nmiCycles - this.ic0;
      this.timing({ pass: this.passes, from: this.from, to: a, cycles: cyc - this.c0 - nmiCycles, nmis: this.nmiCount - this.in0,
        nmiCycles, calls: this.calls, polls: this.polls, estimate: this.estimate });
    }
    this.from = a; this.c0 = cyc; this.ic0 = this.nmiCycles; this.in0 = this.nmiCount;
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

  compare() { return differ(this.m.ram, this.m, this.P.M, this.chips, this.runs, this.chipList); }
  resync() {
    const M = this.P.M, R = this.m.ram, g = this.m, p = this.chips;
    for (const [a, b] of this.runs) M.set(R.subarray(a, b + 1), a);
    for (const chip of this.chipList) {
      if (chip === 'ppu') p.ppu.load(g.ppu.save());
      else p.apuw.set(g.apuw);
    }
  }

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

// --- the game's own code, standing in for the port's ---
const simulators = new WeakMap();
function simulator(P) {
  let s = simulators.get(P);
  if (!s) {
    s = { cpu: new CPU(P.M, { io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) }, ...MAP }), top: 0xFF };
    simulators.set(P, s);
  }
  return s;
}
function regsIn(r) {
  const regs = { d: 0 };
  for (const k of ['a', 'x', 'y', 'n', 'v', 'd', 'i', 'z', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
  return regs;
}
const regsOut = cpu => ({ a: cpu.a, x: cpu.x, y: cpu.y, n: cpu.n, v: cpu.v, z: cpu.z, c: cpu.c });

function standIn(P, address, opts = {}) {
  return function (r) {
    const s = simulator(P), cpu = s.cpu;
    cpu.setRegs(regsIn(r));
    if (opts.nmi) { cpu.sp = s.top; cpu.nmi(address, { maxSteps: opts.maxSteps }); }
    else cpu.call(address, { sp: s.top }, { maxSteps: opts.maxSteps });
    return regsOut(cpu);
  };
}
function target(cpu, mode) {
  const pc = cpu.pc, b = cpu.fb(pc + 1), m = cpu.m;
  if (mode === 'zp') return b;
  if (mode === 'zpx') return (b + cpu.x) & 0xFF;
  if (mode === 'zpy') return (b + cpu.y) & 0xFF;
  if (mode === 'izx') { const z = (b + cpu.x) & 0xFF; return m[z] | (m[(z + 1) & 0xFF] << 8); }
  if (mode === 'izy') return ((m[b] | (m[(b + 1) & 0xFF] << 8)) + cpu.y) & 0xFFFF;
  const w = b | (cpu.fb(pc + 2) << 8);
  return mode === 'abx' ? (w + cpu.x) & 0xFFFF : mode === 'aby' ? (w + cpu.y) & 0xFFFF : w;
}
// What a stand-in polls: 1, PPUSTATUS at every mirror; 2, the addresses in polls.
function pollTable(polls) {
  const t = new Uint8Array(65536);
  for (let a = 0x2002; a < 0x4000; a += 8) t[a] = 1;
  for (const a of polls || []) t[a & 0xFFFF] = 2;
  return t;
}
function standInGen(P, address, opts = {}) {
  const polls = pollTable(opts.polls);
  return function* (r) { return yield* waiting(P, address & 0xFFFF, opts, polls, r); };
}
function* waiting(P, address, opts, polls, r) {
  const s = simulator(P), cpu = s.cpu, M = cpu.m, top = s.top, max = opts.maxSteps || 1e6;
  const turned = new Set(), read = new Set(), direct = new Set();
  let own = 6, steps = 0;
  function* pause(y) {
    const saved = { a: cpu.a, x: cpu.x, y: cpu.y, sp: cpu.sp, p: cpu.p, pc: cpu.pc };
    own = 0; turned.clear(); read.clear();
    s.top = cpu.sp;
    try { yield y; } finally { s.top = top; cpu.setRegs(saved); }
  }
  const catchUp = spare => (own - spare >= LINE ? pause({ cycles: Math.ceil(own - spare - LINE + 1) }) : []);
  cpu.setRegs(regsIn(r));
  cpu.sp = top;
  cpu.push(0xFF); cpu.push(0xFE);
  cpu.pc = address;
  while (cpu.pc !== 0xFFFF) {
    let op = cpu.fb(cpu.pc, true), e = DATA[op] ? target(cpu, OPCODES[op][1]) : -1;
    if (e >= 0 && polls[e]) {
      if (turned.has(cpu.pc)) {
        for (const b of read) direct.add(b);
        yield* catchUp(LINE);
        yield* pause();
      } else yield* catchUp(0);
      op = cpu.fb(cpu.pc, true); e = DATA[op] ? target(cpu, OPCODES[op][1]) : -1;
    }
    let old = -1;
    if (e >= 0 && polls[e]) {
      turned.add(cpu.pc);
      if (polls[e] === 2 && isRam(e)) {
        if (!direct.has(e) && P.io && typeof P.io.irqByte === 'function') { old = M[e]; M[e] = P.io.irqByte(e) & 0xFF; }
        read.add(e);
      }
    }
    own += cpu.step();
    if (old >= 0 && DATA[op] === 1) M[e] = old;
    if (++steps > max) throw new Error('standInGen: the routine at ' + hex(address) + ' ran ' + max + ' instructions without returning');
  }
  yield* catchUp(0);
  return regsOut(cpu);
}

function checkGen(P, routine, address, opts = {}) {
  const f = typeof routine === 'string' ? P[routine] : routine;
  if (typeof f !== 'function') throw new Error('checkGen: the port has no routine ' + routine);
  const byLine = opts.frame === undefined || opts.frame === 'line', frame = byLine ? -1 : opts.frame & 0xFFFF;
  const runs = ranges(opts), max = opts.maxFrames || 1000, regs = opts.regs || {};
  let chips;
  try { chips = chipNames(opts); } catch (e) { throw new Error('checkGen: ' + e.message); }
  const portChips = new PortChips(), gameChips = new PortChips();
  portChips.ram = P.M;
  let line = (opts.line || 0) % LINES, frames = 0;
  portChips.beam = gameChips.beam = line;
  P.io = Object.assign({}, P.io, chipIO(portChips), { irqByte: a => P.M[a & 0xFFFF] });
  const G = { M: Uint8Array.from(P.M), io: chipIO(gameChips) };
  gameChips.ram = G.M;
  const game = standInGen(G, address, { polls: byLine ? opts.polls : [frame, ...(opts.polls || [])], maxSteps: opts.maxSteps })(regs);
  const port = f.call(P, regs);
  if (!port || typeof port.next !== 'function') throw new Error('checkGen: the port\'s routine gave no generator');
  const turn = (it, who) => {
    for (;;) {
      const r = it.next();
      if (r.done) return r;
      const y = r.value;
      if (y && y.wait !== undefined) throw new Error('checkGen: the ' + who + '\'s routine yielded { wait }: a loop on the frame\'s flag polls with bare yields');
      if (!(y && (y.cp !== undefined || y.cycles !== undefined))) return r;
    }
  };
  const fail = (why, more) => ({ ok: false, frames, diff: Object.assign({ frame: frames, line, why: 'frame ' + frames + ', line ' + line + ': ' + why }, more) });
  for (;;) {
    const p = turn(port, 'port'), g = turn(game, 'game'), d = differ(G.M, gameChips, P.M, portChips, runs, chips);
    if (p.done !== g.done) {
      const [done, on] = p.done ? ['port', 'game'] : ['game', 'port'];
      return fail('the ' + done + '\'s routine returned and the ' + on + '\'s polls on' + (d ? '; ' + bytesLine(d) : ''), d || {});
    }
    if (d) return fail(bytesLine(d), d);
    if (p.done) {
      const out = [];
      if (p.value && typeof p.value === 'object') {
        for (const k of Object.keys(p.value)) {
          if (!(k in g.value)) continue;
          const flag = k !== 'a' && k !== 'x' && k !== 'y', pv = flag ? (p.value[k] ? 1 : 0) : p.value[k] & 0xFF, gv = g.value[k];
          if (pv !== gv) out.push({ register: k, game: gv, port: pv });
        }
      }
      const shown = x => 'axy'.includes(x.register) ? ' game ' + hex(x.game, 2) + ' port ' + hex(x.port, 2) : ' game ' + x.game + ' port ' + x.port;
      if (out.length) return fail('on return, ' + out.map(x => x.register + shown(x)).join(', '), { regs: out });
      return { ok: true, frames, diff: null };
    }
    if (byLine) {
      line = (line + 1) % LINES; if (!line) frames++;
      portChips.beam = gameChips.beam = line;
      if (line === 241) { portChips.ppu.vblank = gameChips.ppu.vblank = 1; } else if (line === 261) { portChips.ppu.vblank = gameChips.ppu.vblank = 0; }
    } else { G.M[frame] = (G.M[frame] + 1) & 0xFF; P.M[frame] = (P.M[frame] + 1) & 0xFF; frames++; }
    if (opts.onYield) { opts.onYield(G.M, G.io, frames, line); opts.onYield(P.M, P.io, frames, line); }
    if (frames >= max) return fail('neither routine returned in ' + max + ' frames');
  }
}

function describe(r) {
  const out = [];
  for (const d of r.diffs) out.push('pass ' + d.pass + ' (frame ' + d.frame + '): ' + bytesLine(d));
  if (r.diverged) out.push('pass ' + r.diverged.pass + (r.diverged.after >= 0 ? ', after ' + hex(r.diverged.after) : '') + ' (frame ' + r.diverged.frame + '): ' + r.diverged.why);
  out.push(r.passes + (r.passes === 1 ? ' pass' : ' passes') + ' in ' + r.frames + ' frames: ' +
    (r.ok ? 'identical' : (r.diffs.length ? r.diffs.length + ' with differences' : '') + (r.diffs.length && r.diverged ? ', then ' : '') + (r.diverged ? 'out of step' : '')));
  return out.join('\n');
}

module.exports = { Lockstep, standIn, standInGen, checkGen, describe, PortChips };
