'use strict';
// The game's cycles for each stretch of its main program, beside the port's work in it: the
// lockstep's timing (kit/c64/lockstep.js), a row of JSON for each stretch, which
// scripts/fit-cost.js fits the page's pacing to. A row's calls are how often the port called each
// of its routines, and its counts (P.N, src/core.js) of the work inside them whose length varies.
// A row's icalls are the same for the interrupts the game took in the stretch, as the port ran
// them, with '#irq' for each interrupt and '#sound' the sound driver's cycles on its 6502 core.
// A row's dma is the cycles the video chip took in the stretch, its interrupts' included, which
// its cycles count. The sessions are test/lockstep.js's: the cold start, the forced war, year's
// end and fallout, and the moments of play in work/states, each with the test player's choices.
//   node time-stretches.js out.jsonl passes [session filter] [seed]
const fs = require('fs');
const lockstep = require('../test/lockstep.js');
const lib = require('../test/lib.js');
const [out, passes, filter = '', seed = '1'] = process.argv.slice(2);
if (!passes) { console.log('usage: node time-stretches.js out.jsonl passes [session filter] [seed]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const states = lib.states(filter).map(f => f.replace(/\.json$/, ''));
const sessions = ['cold'].filter(s => s.includes(filter)).concat(states,
  Object.keys(lockstep.FORCE).filter(k => (k + '@').includes(filter) || !filter).map(k => k + '@' + lib.states('s1-')[0].replace(/\.json$/, '')));
for (const st of sessions) {
  let P = null, m = null, n = 0, inIrq = false, icalls = {};
  // the machine's cycles, its interrupts' and the video chip's, as the stretch began and now
  let depth = 0, irqOwn = 0, taken = 0, at0 = null;
  const now = () => ({ c: m.cpu.cycles, irq: irqOwn, dma: taken });
  const timing = s => {
    n++;
    const calls = Object.assign({}, s.calls);
    for (const [k, v] of Object.entries(P.N)) { if (v) calls['#' + k] = v; P.N[k] = 0; }
    fs.writeSync(fd, JSON.stringify({ st, pass: s.pass, from: s.from, to: s.to, cycles: s.cycles, irqs: s.irqs,
      irqCycles: s.irqCycles, polls: s.polls, dma: s.dma, calls, icalls }) + '\n');
    icalls = {};
  };
  // the port's routines called while it runs the game's interrupts
  const watch = (p, machine) => {
    P = p; m = machine; at0 = now();
    const catchUp = m.dmaCatchUp;
    m.dmaCatchUp = function () { const c = this.cpu.cycles; catchUp.call(this); taken += this.cpu.cycles - c; };
    const oi = m.onInterrupt, or = m.onReturn;
    m.onInterrupt = (mm, v) => { depth++; if (oi) oi(mm, v); };
    m.onReturn = (mm, v, c) => { if (--depth === 0) irqOwn += c; if (or) or(mm, v, c); };
    const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
    for (const name of Object.keys(p)) {
      const f = p[name];
      if (typeof f !== 'function' || f instanceof GENERATOR) continue;
      if (name === 'irq') p.irq = function (...a) {
        inIrq = true; icalls['#irq'] = (icalls['#irq'] || 0) + 1;
        try { return f.apply(this, a); } finally {
          inIrq = false;
          for (const [k, v] of Object.entries(p.NI)) if (v) icalls['#' + k] = (icalls['#' + k] || 0) + v;
        }
      };
      else p[name] = function (...a) { if (inIrq) icalls[name] = (icalls[name] || 0) + 1; return f.apply(this, a); };
    }
  };
  // each stretch's video-chip cycles, and the stretch from the hand-over ($4E96) to the cold
  // start's first checkpoint, which the lockstep does not time
  const onLockstep = ls => {
    const sync = ls.sync, from = m.cpu.pc;
    ls.sync = function (a, wait) {
      const e = now();
      const dma = e.dma - at0.dma;
      if (this.from < 0 && this.timing) {
        this.timing({ pass: this.passes, from, to: a, wait, cycles: e.c - at0.c - (e.irq - at0.irq), irqs: this.irqCount,
          irqCycles: e.irq - at0.irq, calls: this.calls, polls: this.polls, dma });
      }
      const timing = this.timing;
      this.timing = timing && (s => timing(Object.assign(s, { dma })));
      try { return sync.call(this, a, wait); } finally { this.timing = timing; at0 = e; }
    };
  };
  try {
    const r = lockstep.run({ state: st, passes: +passes, seed: +seed, onPort: watch, onLockstep, timing });
    console.log(st, n, 'stretches', r.res.ok ? 'ok' : r.race ? 'to the game\'s race' : 'out of step');
  } catch (e) { console.log(st, 'threw', e.message.slice(0, 200)); }
}
