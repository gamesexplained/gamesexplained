'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/spectrum/lockstep.js's standIn, made for this game): the kit's Z80 on P.M through P.io, and
// every routine the port has written, but those that wait, run as the port's when the game's code
// reaches its entry (by a CALL, a JP or running on into it), with a RET after. A routine that waits
// cannot stand in: nothing moves while it runs.
//
// The registers a routine is given and gives back (core.js): a, f, b, c, d, e, h, l, ix, iy, af_,
// bc_, de_, hl_, the pairs bc, de and hl, and the flags zf, cf, sf and pf as booleans. A stand-in
// takes either form of each pair and gives both; a port's routine returns what its callers read,
// and the flags it gives as zf, cf, sf, pf (or in f) go into F.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.ROOT, 'kit/spectrum/z80.js'));

// The listing's code labels: byName (name -> address) and byAddress. Before there is a listing,
// the labels of the control file in work/.
let LABELS = null;
function labels() {
  if (LABELS) return LABELS;
  LABELS = { byName: new Map(), byAddress: new Map() };
  const add = (name, a) => { LABELS.byName.set(name, a); LABELS.byAddress.set(a, name); };
  const file = path.join(lib.GAME, 'listing.json');
  if (fs.existsSync(file)) {
    for (const r of JSON.parse(fs.readFileSync(file, 'utf8')).records) if (r.t === 'code' && r.l) add(r.l, r.a);
  } else {
    const ctl = fs.readFileSync(path.join(lib.GAME, 'work', 'driller.ctl'), 'utf8');
    const code = [];
    for (const l of ctl.split('\n')) { const m = /^([bcwtsi]) \$([0-9A-F]{4})/.exec(l); if (m) code.push([parseInt(m[2], 16), m[1] === 'c']); }
    const isCode = a => { let c = false; for (const [s, k] of code) { if (s > a) break; c = k; } return c; };
    for (const l of ctl.split('\n')) { const m = /^@ \$([0-9A-F]{4}) label=(\S+)/.exec(l); if (m && isCode(parseInt(m[1], 16))) add(m[2], parseInt(m[1], 16)); }
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
  wr(a, v) { const n = this.resolve(a); this.tstates += 3; if (n >= 0x4000) this.m[n] = v & 0xFF; }
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
  const low = new Map();
  for (const [a, k] of Object.entries(P.CODE)) if (typeof P[k] === 'function') low.set(+a, k);
  let cpu = null, depth = 0;
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
        const k = cpu.pc !== a || n ? low.get(cpu.pc) : undefined;
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
  for (const [label, a] of L.byName) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    P[label] = call(label, a);
  }
  // an entry that is not a label: P.at(address) stands in for it
  P.at = (a, r) => call('$' + a.toString(16), a)(r);
  return P;
}

module.exports = { labels, install, regsOf, setRegs };
