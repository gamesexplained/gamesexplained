'use strict';
// The game's cycles for each stretch of its main program, beside the port's work in it: the
// lockstep's timing (kit/c64/lockstep.js), a row of JSON for each stretch, which
// scripts/fit-cost.js fits the page's pacing to. A row's calls are how often the port called each
// of its routines, and its counts (P.N, src/g-lines.js) of the line drawer's work ('#tests',
// '#pixels', '#skip'). A row's dma is the cycles the video chip took from the processor in the
// stretch, the interrupts' included, which its cycles count.
// The interrupts are timed on their own, one record for each the game took: its band (the key,
// $3DF8 and the raster compare line it was taken on), its own cycles with the video chip's left
// out, and how far into it, in the same cycles, each of its writes to the chips came. The page
// lands the port's writes there, so that the screen splits where the game's does.
// The sessions are test/lockstep.js's, each with its random choices.
//   node time-stretches.js out.jsonl passes [session filter] [seed]
const fs = require('fs');
const lockstep = require('../test/lockstep.js');
// the loader's hand-over, where the start-up begins (page/runtime.js)
const ENTRY = 0x3FFB;
const [out, passes, filter = '', seed = '1'] = process.argv.slice(2);
if (!passes) { console.log('usage: node time-stretches.js out.jsonl passes [session filter] [seed]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const sessions = Object.keys(lockstep.SESSIONS).filter(s => s.includes(filter));
for (const st of sessions) {
  let P = null, m = null, n = 0, irqs = {};
  // the machine's cycles, its interrupts' and the video chip's, as the stretch began
  let irqOwn = 0, taken = 0, at0 = null, irq = null;
  const now = () => ({ c: m.cpu.cycles, irq: irqOwn, dma: taken });
  const timing = s => {
    n++;
    const calls = Object.assign({}, s.calls);
    for (const [k, v] of Object.entries(P.N)) { if (v) calls['#' + k] = v; P.N[k] = 0; }
    fs.writeSync(fd, JSON.stringify({ st, pass: s.pass, from: s.from, to: s.to, cycles: s.cycles, irqs: s.irqs,
      irqCycles: s.irqCycles, polls: s.polls, estimate: s.estimate, dma: s.dma, calls, irq: irqs }) + '\n');
    irqs = {};
  };
  const watch = (p, machine) => {
    P = p; m = machine; at0 = now();
    // the cycles the video chip takes from the processor (kit/c64/machine.js, dma), which the page's
    // clock gives the video chip for itself, as the beam passes the lines it takes them on
    const catchUp = m.dmaCatchUp;
    m.dmaCatchUp = function () { const c = this.cpu.cycles; catchUp.call(this); taken += this.cpu.cycles - c; };
    m.onInterrupt = (mm, v) => {
      if (mm.depth || v !== 0xFFFE) return;
      irq = { key: mm.ram[0x3DF8].toString(16) + ':' + mm.cmp, c0: mm.cpu.cycles, dma0: taken, writes: [] };
    };
    m.onReturn = (mm, v, c) => {
      if (mm.depth || v !== 0xFFFE || !irq) return;
      irqOwn += c;
      const own = c - (taken - irq.dma0);
      const r = irqs[irq.key] || (irqs[irq.key] = { n: 0, c: 0, w: [] });
      r.n++; r.c += own;
      irq.writes.forEach((w, i) => { const q = r.w[i] || (r.w[i] = [0, 0]); q[0]++; q[1] += w; });
      irq = null;
    };
    const ioWrite = m.ioWrite;
    m.ioWrite = function (a, v) {
      if (irq && this.depth === 1) irq.writes.push(this.cpu.cycles - irq.c0 - (taken - irq.dma0));
      return ioWrite.call(this, a, v);
    };
  };
  // each stretch's video chip cycles; and the start-up's stretch, from the hand-over (ENTRY) to the
  // first checkpoint, which the lockstep does not time: the page pays for it as cost(ENTRY, cp)
  const onLockstep = ls => {
    const sync = ls.sync;
    ls.sync = function (a, wait) {
      const e = now(), dma = e.dma - at0.dma;
      if (this.timing && this.from < 0) {
        const calls = Object.assign({}, this.calls);
        for (const [k, v] of Object.entries(P.N)) { if (v) calls['#' + k] = v; P.N[k] = 0; }
        fs.writeSync(fd, JSON.stringify({ st, pass: 0, from: ENTRY, to: a, cycles: e.c - at0.c - this.irqCycles, irqs: this.irqCount,
          irqCycles: this.irqCycles, polls: this.polls, estimate: this.estimate, dma, calls, irq: irqs }) + '\n');
        irqs = {};
      }
      const timing = this.timing;
      this.timing = timing && (s => timing(Object.assign(s, { dma })));
      try { return sync.call(this, a, wait); } finally { this.timing = timing; at0 = e; }
    };
  };
  try {
    const r = lockstep.run({ session: st, passes: +passes, seed: +seed, onPort: watch, onLockstep, timing });
    console.log(st, n, 'stretches', r.res.ok ? 'ok' : r.res.diverged ? 'diverged' : r.res.diffs.length + ' passes differ');
  } catch (e) { console.log(st, 'threw', e.message.slice(0, 200)); }
}
