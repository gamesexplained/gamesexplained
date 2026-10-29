'use strict';
// The game's cycles for each stretch of its main program, beside the port's work in it: the
// lockstep's timing (kit/c64/lockstep.js), a row of JSON for each stretch, which
// scripts/fit-cost.js fits the page's pacing to. A row's calls are how often the port called each
// of its routines, and its counts (P.N, src/core.js) of the work inside them whose length varies.
// A row's icalls are the same for the interrupts the game took in the stretch, as the port ran
// them (each interrupt's own cycles, irqCycles, are fitted on them too, with '#irq' for each).
// A row's dma is the cycles the video chip took in the stretch, its interrupts' included, which
// its cycles count; its toPoll, the same two up to the main program's first read of $D011, $D012
// or $D019 in the stretch (a raster wait's loop, or the port's polling), or null. The stretch
// before a wait's exit is its work and then the wait: the page charges the work, then waits.
// The sessions are test/lockstep.js's: the cold start with the joystick chosen, the demonstration,
// and the moments of play in work/states, each with the explorer's random choices.
//   node time-stretches.js out.jsonl passes [session filter] [seed]
const fs = require('fs');
const lockstep = require('../test/lockstep.js');
const lib = require('../test/lib.js');
const [out, passes, filter = '', seed = '1'] = process.argv.slice(2);
if (!passes) { console.log('usage: node time-stretches.js out.jsonl passes [session filter] [seed]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const sessions = ['cold', 'demo'].filter(s => s.includes(filter)).concat(lib.states(filter).map(f => f.replace(/\.json$/, '')));
for (const st of sessions) {
  let P = null, m = null, n = 0, inIrq = false, icalls = {};
  // the machine's cycles, its interrupts' and the video chip's: as the stretch began, as it first
  // polled, and as they are now
  let depth = 0, irqOwn = 0, taken = 0, at0 = null, poll = null, toPoll = null;
  const now = () => ({ c: m.cpu.cycles, irq: irqOwn, dma: taken });
  const timing = s => {
    n++;
    const calls = Object.assign({}, s.calls);
    for (const [k, v] of Object.entries(P.N)) { if (v) calls['#' + k] = v; P.N[k] = 0; }
    fs.writeSync(fd, JSON.stringify({ st, pass: s.pass, from: s.from, to: s.to, wait: s.wait, cycles: s.cycles, irqs: s.irqs,
      irqCycles: s.irqCycles, polls: s.polls, dma: s.dma, toPoll, calls, icalls }) + '\n');
    icalls = {};
  };
  // the port's routines called while it runs the game's interrupts
  const watch = (p, machine) => {
    P = p; m = machine; at0 = now();
    // the cycles the video chip takes from the processor (kit/c64/machine.js, dma), which the page's
    // clock gives the video chip for itself, as the beam passes the lines it takes them on
    const catchUp = m.dmaCatchUp;
    m.dmaCatchUp = function () { const c = this.cpu.cycles; catchUp.call(this); taken += this.cpu.cycles - c; };
    // the interrupts' own cycles, and the main program's first read of the raster's registers
    m.onInterrupt = () => { depth++; };
    m.onReturn = (mm, v, n) => { if (--depth === 0) irqOwn += n; };
    const ioRead = m.ioRead;
    m.ioRead = function (a) {
      if (!depth && !poll && a >= 0xD000 && a < 0xD400) { const r = a & 0x3F; if (r === 0x11 || r === 0x12 || r === 0x19) poll = now(); }
      return ioRead.call(this, a);
    };
    const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
    for (const name of Object.keys(p)) {
      const f = p[name];
      if (typeof f !== 'function') continue;
      // a drawing routine the interrupt runs through (P.drain) is a generator
      if (f instanceof GENERATOR) { p[name] = function* (...a) { if (inIrq) icalls[name] = (icalls[name] || 0) + 1; return yield* f.apply(this, a); }; continue; }
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
  // Each stretch's cycles to its first poll (toPoll), and the stretch from where the session
  // starts to its first checkpoint, which the lockstep does not time: the stretch from the game's
  // first instruction ($4000) on the cold start and the demonstration
  const onLockstep = ls => {
    const sync = ls.sync, from = m.cpu.pc;
    ls.sync = function (a, wait) {
      const e = now(), cut = x => ({ cycles: x.c - at0.c - (x.irq - at0.irq), dma: x.dma - at0.dma });
      toPoll = poll ? cut(poll) : null;
      const dma = e.dma - at0.dma;
      if (this.from < 0 && this.timing) {
        const s = cut(e);
        this.timing({ pass: this.passes, from, to: a, wait, cycles: s.cycles, irqs: this.irqCount, irqCycles: e.irq - at0.irq,
          calls: this.calls, polls: this.polls, dma });
      }
      const timing = this.timing;
      this.timing = timing && (s => timing(Object.assign(s, { dma })));
      try { return sync.call(this, a, wait); } finally { this.timing = timing; at0 = e; poll = null; }
    };
  };
  try {
    const r = lockstep.run({ session: st, passes: +passes, seed: +seed, onPort: watch, onLockstep, timing });
    console.log(st, n, 'stretches', r.res.ok ? 'ok' : r.res.diverged ? 'diverged' : r.res.diffs.length + ' passes differ');
  } catch (e) { console.log(st, 'threw', e.message.slice(0, 200)); }
}
