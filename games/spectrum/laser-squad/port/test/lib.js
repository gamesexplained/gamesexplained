'use strict';
// The game's side of the port's tests: the 48K Spectrum (kit/spectrum/machine.js) started from the
// listing's memory or a snapshot, with what the game asks of the ROM stood in for: the ROM's
// KEY-SCAN ($028E), which the menus call, and its tape routines, entered at $0562 (LD-BYTES) and
// $04C6 (SA-BYTES) with a tape of the game's own blocks. The ROM itself is never needed: the
// machine's $0000-$3FFF reads as zeros, which is what the random numbers mix in when they read
// the ROM (they read the byte at a pointer that walks on through memory), the same for the game and
// the port. A Kempston joystick answers on port $1F.
//   const lib = require('./lib.js');
//   const m = lib.fromSna('s1-play');            // work/s1-play.sna
//   const m2 = lib.restore(lib.readState(name));
const path = require('path'), fs = require('fs');
const GAME = path.join(__dirname, '..', '..');
const ROOT = path.join(GAME, '..', '..', '..');
const { Machine, KEY, loadSna } = require(path.join(ROOT, 'kit', 'spectrum', 'machine.js'));
const STATES = path.join(GAME, 'work', 'states');
const ZERO_ROM = new Uint8Array(0x4000);

// The ROM's KEY-SCAN on a processor (the machine's, or a stand-in's): E the key held (0 to $27:
// half-row x 8 + bit, counted down from $27), $FF for none, D a shift; the zero flag as the ROM
// leaves it. The rows are read through inp(port).
function keyScanOn(cpu, inp) {
  let l = 0x2F, d = 0xFF, e = 0xFF, b = 0xFE, a = 0, zf = 0, cf = cpu.f & 1;
  const done = () => { cpu.d = d; cpu.e = e; cpu.l = l; cpu.a = a; cpu.b = b; cpu.c = 0xFE; cpu.h = 0; cpu.f = (cpu.f & ~0x41) | zf | cf; };
  for (;;) {
    cpu.tstates += 40;
    a = ~inp(b << 8 | 0xFE) & 0x1F;
    if (a) {
      let h = a; a = l;
      for (;;) {
        d = d + 1 & 255;
        if (d) { zf = 0; return done(); }
        for (;;) { a = a - 8 & 255; const c = h & 1; h >>= 1; if (c) break; }
        d = e; e = a;
        if (!h) break;
      }
    }
    l = l - 1 & 255;
    const c = b >> 7; b = (b << 1 | c) & 255;
    if (!c) break;
  }
  a = d + 1 & 255;
  if (!a || a === 0x28 || a === 0x19) { zf = 0x40; return done(); }
  a = e; e = d; d = a;
  zf = a === 0x18 ? 0x40 : 0;
  cf = a < 0x18 ? 1 : 0;
  return done();
}
const keyScan = m => { keyScanOn(m.cpu, p => m.portIn(p)); m.ret(); };

// A tape: blocks { flag, bytes } in order, as the cassette holds them; load(flag, n) gives the next
// block (turning the tape on past any of another flag, as the ROM does), save(flag, bytes) adds one.
class Tape {
  constructor(blocks = []) { this.blocks = blocks.map(b => ({ flag: b.flag, bytes: Uint8Array.from(b.bytes) })); this.at = 0; this.saved = []; }
  load(flag) {
    while (this.at < this.blocks.length) { const b = this.blocks[this.at++]; if (b.flag === flag) return b; }
    return null;
  }
  save(flag, bytes) { this.saved.push({ flag, bytes: Uint8Array.from(bytes) }); return true; }
}
// The ROM's tape routines, as the game enters them: SA-BYTES at $04C6 saves DE bytes from IX with
// the flag A; LD-BYTES at $0562 loads DE bytes to IX with the flag in A' (its carry set: a load;
// clear: a verify), and both give the carry set when they did. On a processor whose memory is mem.
function romTapeOn(cpu, mem, tape) {
  const ix = cpu.ix, de = cpu.d << 8 | cpu.e;
  let ok = false;
  if (cpu.pc === 0x04C6) ok = !!tape && tape.save(cpu.a, mem.slice(ix, ix + de));
  else if (tape) {
    const flag = cpu.af_ >> 8, load = (cpu.af_ & 1) === 1, b = tape.load(flag);
    ok = !!b && b.bytes.length === de;
    if (ok && load) for (let k = 0; k < de; k++) mem[(ix + k) & 0xFFFF] = b.bytes[k];
    if (ok && !load) for (let k = 0; k < de; k++) if (mem[(ix + k) & 0xFFFF] !== b.bytes[k]) { ok = false; break; }
  }
  cpu.f = ok ? cpu.f | 1 : cpu.f & ~1;
  cpu.tstates += 70000;
}
const romTape = m => { romTapeOn(m.cpu, m.ram, m.tape); m.ret(); };

const JOY = { RIGHT: 1, LEFT: 2, DOWN: 4, UP: 8, FIRE: 16 };
class LSMachine extends Machine {
  constructor(o) {
    super(Object.assign({ rom: ZERO_ROM.slice() }, o, {
      hooks: Object.assign({ 0x028E: keyScan, 0x0562: romTape, 0x04C6: romTape }, o.hooks || {}) }));
    this.joy = 0; this.tape = o.tape || null;
  }
  portIn(port) { return (port & 0x20) === 0 && (port & 1) ? this.joy : super.portIn(port); }
  // the ROM is zeros here: reaching any of it but the routines stood in for is an error
  step() {
    const pc = this.cpu.pc;
    if (pc < 0x4000 && !this.hooks[pc] && !this.cpu.halted) throw new Error('LSMachine: the program counter reached the ROM at ' + hex(pc));
    return super.step();
  }
  // The refresh register read from a made-up sequence (makeSeq), the reads counted in rAt; a
  // copy of the machine (save, restore) reads on from the same place, as the lockstep's copy run on
  // ahead must (kit/spectrum/lockstep.js, irqBytes).
  useR(seq, at = 0) {
    const readreg = this.cpu.readreg.bind(this.cpu);
    this.rsrc = seq; this.rAt = at;
    this.cpu.readreg = what => (what === 'R' ? seq(this.rAt++) : readreg(what));
    return this;
  }
  save() { return Object.assign(super.save(), { joy: this.joy, rAt: this.rAt, rsrc: this.rsrc }); }
  static restore(s, o = {}) {
    const m = super.restore(s, Object.assign({ rom: ZERO_ROM.slice() }, o));
    m.joy = s.joy || 0;
    if (typeof s.rsrc === 'function') m.useR(s.rsrc, s.rAt);
    return m;
  }
}

// A machine from a snapshot in work/ (name without .sna), its ROM area zeros.
function fromSna(name, o = {}) {
  const { ram, regs } = loadSna(path.join(GAME, 'work', name + '.sna'));
  ram.fill(0, 0, 0x4000);
  return new LSMachine(Object.assign({ ram, regs }, o));
}

// The same machine from the committed listings, for a clean checkout (../../test_play.js): the
// engine's bytes from parts/engine/listing.json at $5E28-$B620 and zeros elsewhere, at the
// engine's first instruction. The snapshot holds the loader's leftovers too (the loading screen,
// BASIC's variables), which the game clears or never reads before it writes them.
const PARTS = ['assassins', 'moonbase-assault', 'rescue-from-the-mines', 'cyber-hordes', 'paradise-valley'];
const FLAGS = [0x64, 0x65, 0x66, 0x68, 0x69];
function listingBytes(file, mem = new Uint8Array(0x10000)) {
  for (const r of JSON.parse(fs.readFileSync(file, 'utf8')).records) if (r.b) mem.set(r.b, r.a);
  return mem;
}
function fromListing(o = {}) {
  const ram = listingBytes(path.join(GAME, 'parts', 'engine', 'listing.json'));
  return new LSMachine(Object.assign({ ram, regs: { pc: 0x5E28, sp: 0x5E39, iff1: 0, iff2: 0, im: 1, i: 0x3F } }, o));
}
// The scenarios' blocks as the cassette holds them, from each part's listing ($B621-$FFFF).
function listingTape() {
  return PARTS.map((p, k) => ({ flag: FLAGS[k],
    bytes: listingBytes(path.join(GAME, 'parts', p, 'listing.json')).slice(0xB621, 0x10000) }));
}

// The tape's blocks, from work/sideAB.tzx (both sides of the cassette, one after the other).
function tapeBlocks() {
  const d = fs.readFileSync(path.join(GAME, 'work', 'sideAB.tzx'));
  const out = [];
  let p = 10;
  while (p < d.length) {
    const id = d[p];
    if (id === 0x10) { const n = d.readUInt16LE(p + 3); const b = d.subarray(p + 5, p + 5 + n); out.push({ flag: b[0], bytes: b.subarray(1, n - 1) }); p += 5 + n; }
    else if (id === 0x30) p += 2 + d[p + 1];
    else if (id === 0x32) p += 3 + d.readUInt16LE(p + 1);
    else throw new Error('tapeBlocks: TZX block $' + id.toString(16));
  }
  return out;
}

function states(filter = '') {
  if (!fs.existsSync(STATES)) return [];
  return fs.readdirSync(STATES).filter(f => f.endsWith('.json') && f.includes(filter)).sort();
}
const readState = f => JSON.parse(fs.readFileSync(path.join(STATES, f.endsWith('.json') ? f : f + '.json'), 'utf8'));
function writeState(name, m, extra = {}) {
  fs.mkdirSync(STATES, { recursive: true });
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(Object.assign(m.save(), extra)));
}
const restore = (s, o = {}) => LSMachine.restore(s, o);

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
}
// The same numbers from 0 to 127 by their place in the sequence: seq(i), for any number of readers.
function makeSeq(seed) {
  const rnd = makeRnd(seed), v = [];
  return i => { while (v.length <= i) v.push(rnd(128)); return v[i]; };
}

module.exports = { GAME, ROOT, STATES, PARTS, FLAGS, fromListing, listingTape, listingBytes, KEY, JOY, LSMachine, Machine, Tape, tapeBlocks, keyScan, keyScanOn, romTapeOn, fromSna, states, readState, writeState,
  restore, hex, makeRnd, makeSeq, ZERO_ROM };
