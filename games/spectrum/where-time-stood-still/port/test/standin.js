'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/spectrum/lockstep.js's standIn, made for this game): the kit's Z80 on P.M through P.io, so
// that its writes to $7FFD page P's banks, and every routine the port has written, but those that
// wait, run as the port's when the game's code reaches its entry (by a CALL, a JP or running on
// into it), with a RET after. An entry at $C000 up is the one of the bank paged in there: bank 3's
// listing or bank 0's (main's). A routine that waits cannot stand in: nothing moves while it runs.
//
// The registers a routine is given and gives back (core.js): a, f, b, c, d, e, h, l, ix, iy, af_,
// bc_, de_, hl_, the pairs bc, de and hl, and the flags zf, cf, sf and pf as booleans. A stand-in
// takes either form of each pair and gives both; a port's routine returns what its callers read,
// and the flags it gives as zf, cf, sf, pf (or in f) go into F.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.ROOT, 'kit/spectrum/z80.js'));

// The listing's code labels: { main: Map(name -> address), bank3: Map }, and entries by address.
let LABELS = null;
function labels() {
  if (LABELS) return LABELS;
  LABELS = { byName: new Map(), main: new Map(), bank3: new Map() };
  for (const [part, key] of [['main', 'main'], ['bank-03', 'bank3']]) {
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
    for (const r of L.records) {
      if (r.t !== 'code' || !r.l) continue;
      // bank 3 has two use_items: the second is named by its address, use_item_f84b
      const name = LABELS.byName.has(r.l) ? r.l + '_' + r.a.toString(16) : r.l;
      LABELS.byName.set(name, { a: r.a, bank: r.a < 0xC000 ? -1 : key === 'bank3' ? 3 : 0 });
      LABELS[key].set(r.a, name);
    }
  }
  return LABELS;
}

const S = 0x80, Z = 0x40, PV = 0x04, C = 0x01;
const R8 = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l'], R16 = ['ix', 'iy', 'af_', 'bc_', 'de_', 'hl_'];
// A register object from the processor.
function regsOf(cpu) {
  const r = {};
  for (const k of R8) r[k] = cpu[k];
  for (const k of R16) r[k] = cpu[k];
  r.bc = cpu.b << 8 | cpu.c; r.de = cpu.d << 8 | cpu.e; r.hl = cpu.h << 8 | cpu.l;
  r.zf = !!(cpu.f & Z); r.cf = !!(cpu.f & C); r.sf = !!(cpu.f & S); r.pf = !!(cpu.f & PV);
  return r;
}
// Set the processor's registers from what a routine gives: the pairs, then the bytes, then the flags.
function setRegs(cpu, r) {
  for (const [p, hi, lo] of [['bc', 'b', 'c'], ['de', 'd', 'e'], ['hl', 'h', 'l']]) {
    if (r[p] !== undefined) { cpu[hi] = (r[p] >> 8) & 255; cpu[lo] = r[p] & 255; }
  }
  for (const k of R8) if (r[k] !== undefined) cpu[k] = r[k] & 255;
  for (const k of R16) if (r[k] !== undefined) cpu[k] = r[k] & 0xFFFF;
  let f = cpu.f;
  for (const [k, bit] of [['zf', Z], ['cf', C], ['sf', S], ['pf', PV]]) if (r[k] !== undefined) f = r[k] ? f | bit : f & ~bit;
  cpu.f = f;
}

class StandInCPU extends CPU {
  constructor(P) { super(P.M, { io: { in: p => P.io.in(p), out: (p, v) => P.io.out(p, v) } }); }
  fetch() {
    if (this.pc < 0x4000) this.fail('a stand-in reached the ROM at $' + this.pc.toString(16), { address: this.pc });
    return super.fetch();
  }
  // bank 5 or 2 paged in at $C000 is the same memory as at $4000 or $8000 (P.mem.alias)
  rd(a) { const n = this.resolve(a); this.tstates += 3; return this.m[this.P.mem ? this.P.mem.alias(n) : n]; }
  wr(a, v) { const n = this.resolve(a); this.tstates += 3; if (n >= 0x4000) this.m[this.P.mem ? this.P.mem.alias(n) : n] = v & 0xFF; }
}

// Fill P with stand-ins for every label the port has not written. ported: the names P has as
// functions; GEN: those that wait (generators), which a stand-in may not call.
function install(P) {
  const L = labels();
  const ported = new Set([...L.byName.keys()].filter(k => typeof P[k] === 'function'));
  for (const k of ported) {
    const gen = P[k].constructor.name === 'GeneratorFunction';
    if (gen !== P.GEN.has(k)) throw new Error(k + (gen ? ' is a generator that GEN leaves out' : ' is in GEN but is not a generator'));
  }
  // the port's routines a stand-in's code may reach: by address below $C000, and by bank above
  const low = new Map(), b0 = new Map(), b3 = new Map();
  for (const [a, k] of Object.entries(P.CODE)) if (typeof P[k] === 'function') (+a < 0xC000 ? low : b0).set(+a, k);
  for (const [a, k] of Object.entries(P.CODE3)) if (typeof P[k] === 'function') b3.set(+a, k);
  let cpu = null, depth = 0;
  const entryAt = pc => {
    if (pc < 0xC000) return low.get(pc);
    const b = P.mem ? P.mem.paged : 3;
    return b === 3 ? b3.get(pc) : b === 0 ? b0.get(pc) : undefined;
  };
  P.standIns = new Set();
  P.standInsUsed = new Set();
  const call = (label, a) => function (r) {
    P.standInsUsed.add(label);
    if (!cpu) { cpu = new StandInCPU(P); cpu.P = P; }
    const saved = depth ? Object.assign(regsOf(cpu), { sp: cpu.sp, pc: cpu.pc }) : null;
    const sp0 = depth ? (cpu.sp - 2) & 0xFFFF : P.io.sp;
    if (sp0 === undefined) throw new Error('standIn ' + label + ': no stack pointer (P.io.sp)');
    if (r) setRegs(cpu, r);
    cpu.sp = sp0; cpu.halted = 0; cpu.ei = 0;
    cpu.push(0);
    cpu.pc = a;
    depth++;
    try {
      for (let n = 0; cpu.pc !== 0 || cpu.sp !== sp0; n++) {
        if (n > 5e6) throw new Error('standIn ' + label + ': no return in 5,000,000 instructions');
        const k = cpu.pc !== a || n ? entryAt(cpu.pc) : undefined;
        if (k !== undefined) {
          if (P.GEN.has(k)) throw new Error('standIn ' + label + ' reached ' + k + ', which waits');
          const out = P[k](regsOf(cpu)) || {};
          setRegs(cpu, out);
          cpu.pc = cpu.pop();
          continue;
        }
        cpu.step();
        if (cpu.halted) throw new Error('standIn ' + label + ' halted at $' + cpu.pc.toString(16));
      }
    } finally { depth--; }
    const out = regsOf(cpu);
    if (saved) { setRegs(cpu, saved); cpu.sp = saved.sp; cpu.pc = saved.pc; }
    return out;
  };
  for (const [label, e] of L.byName) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    P[label] = call(label, e.a);
  }
  // an entry that is not a label: P.at(address) stands in for it
  P.at = (a, r) => call('$' + a.toString(16), a)(r);
  return P;
}

module.exports = { labels, install, regsOf, setRegs };
