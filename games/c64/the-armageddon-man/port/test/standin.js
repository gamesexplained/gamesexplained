'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/c64/lockstep.js's standIn, made for this game): the kit's simulator on P's memory and chips,
// with the processor port as P keeps it in M[1], and every routine the port has written, but those
// that wait, run as the port's when the game's code calls it. A routine that waits (GEN) stands in
// as the kit's standInGen, which yields at each turn of its polling loops.
//
// Inline bytes (core.js): a routine in INLINE takes bytes from after the JSR that called it. The
// port's routine takes r.at, that JSR's address. Standing in, the game's routine is entered with
// at + 2 on the stack as that JSR leaves it, and run until it returns past the bytes; called from
// the game's code, the port's routine is given at from the stack, and the game goes on past them.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.REPO, 'kit/cpu/cpu6502.js'));
const { standInGen } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));

let LABELS = null;
function labels() {
  if (!LABELS) {
    LABELS = new Map();
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
    for (const r of L.records) if (r.t === 'code' && r.l && !LABELS.has(r.l)) LABELS.set(r.l, r.a);
  }
  return LABELS;
}
const regsOf = c => ({ a: c.a, x: c.x, y: c.y, n: c.n, v: c.v, z: c.z, c: c.c });
// The count of inline bytes after a call at `at` (M the memory): a number, or the text up to and
// with its '$' for print_inline.
const text = (M, at) => { let n = 0; while (M[(at + 3 + n) & 0xFFFF] !== 0x24) n++; return n + 1; };
const INLINE = { make_sprite: 5, open_window: 8, fill: 5, fill_cells: 5, copy_block: 6, print_inline: text };
const inlineCount = (name, M, at) => (typeof INLINE[name] === 'function' ? INLINE[name](M, at) : INLINE[name]);

function standInCpu(P, irqBytes) {
  const B = new Uint8Array(65536);
  for (const a of irqBytes) B[a] = 1;
  class StandInCPU extends CPU {
    rd(a) { return B[a] && this.rk[a >>> 8] === 0 ? P.irqByte(a) : super.rd(a); }
    rdz(a) { return B[a] ? P.irqByte(a) : super.rdz(a); }
  }
  return new StandInCPU(P.M, { port: { dir: 0x2F, data: P.M[1] }, io: { read: x => P.io.read(x), write: (x, v) => P.io.write(x, v) } });
}

// The places the game JMPs to far from where it was called (core.js): a stand-in that gets there
// throws P.jump with the name, as the port's routines do.
const JUMPS = { 0x7CBB: 'new_game_loop' };

function install(P, irqBytes = [], polls = irqBytes) {
  const names = labels();
  const ported = new Set(Object.keys(P).filter(k => typeof P[k] === 'function' && names.has(k)));
  for (const k of ported) {
    const gen = P[k].constructor.name === 'GeneratorFunction';
    if (gen !== P.GEN.has(k)) throw new Error(k + (gen ? ' is a generator that GEN leaves out' : ' is in GEN but is not a generator'));
  }
  const hooks = {};
  for (const [label, a] of names) {
    if (!ported.has(label) || P.GEN.has(label)) continue;
    const f = P[label];
    hooks[a] = c => {
      P.M[1] = c.pdata;
      const r0 = regsOf(c), sp = c.sp;
      const args = Object.assign({}, r0);
      let n = -1, at = 0;
      if (INLINE[label]) {
        at = ((c.m[0x101 + sp] | c.m[0x102 + sp] << 8) - 2) & 0xFFFF;
        n = inlineCount(label, P.M, at);
        args.at = at;
      }
      const r = f.call(P, args) || {};
      const out = Object.assign({}, r0);
      for (const k of Object.keys(out)) if (r[k] !== undefined) out[k] = typeof r[k] === 'boolean' ? +r[k] : r[k];
      c.setRegs(out);
      c.sp = sp;
      c.portWrite(1, P.M[1]);
      if (n >= 0) { c.sp = (sp + 2) & 255; c.pc = (at + 3 + n) & 0xFFFF; } else c.rts();
      return false;
    };
  }
  for (const a of Object.keys(JUMPS)) hooks[a] = () => { throw P.jump(JUMPS[a]); };
  let cpu = null, depth = 0;
  P.standIns = new Set();
  P.standInsUsed = new Set();
  for (const [label, a] of names) {
    if (ported.has(label)) continue;
    P.standIns.add(label);
    const run = function (r) {
      P.standInsUsed.add(label);
      if (!cpu) cpu = standInCpu(P, irqBytes);
      const regs = { d: 0 };
      r = r || {};
      for (const k of ['a', 'x', 'y', 'n', 'v', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
      cpu.portWrite(0, 0x2F); cpu.portWrite(1, P.M[1]);
      depth++;
      const h = JUMPS[a] ? Object.assign({}, hooks, { [a]: undefined }) : hooks;
      try {
        if (INLINE[label]) {
          if (r.at === undefined) throw new Error(label + ' stands in without r.at');
          const n = inlineCount(label, P.M, r.at);
          cpu.setRegs(regs);
          if (depth === 1) cpu.sp = 0xFF;
          const back = (r.at + 2) & 0xFFFF;
          cpu.push(back >> 8); cpu.push(back & 255);
          cpu.pc = a;
          cpu.run({ until: (r.at + 3 + n) & 0xFFFF, hooks: h, maxSteps: 5e6 });
        } else {
          if (depth > 1) regs.sp = cpu.sp;
          cpu.call(a, regs, { hooks: h, maxSteps: 5e6 });
        }
      } finally { depth--; }
      P.M[1] = cpu.pdata;
      return regsOf(cpu);
    };
    P[label] = P.GEN.has(label) ? standInGen(P, a, { polls, maxSteps: 1e9 }) : run;
    if (P.GEN.has(label)) { const g = P[label]; P[label] = function* (r) { P.standInsUsed.add(label); return yield* g(r); }; }
  }
  return P;
}

module.exports = { labels, install, JUMPS, INLINE, inlineCount };
