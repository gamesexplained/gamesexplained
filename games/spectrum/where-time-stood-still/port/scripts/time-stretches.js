'use strict';
// The rows the Play page's pacing is fitted on (scripts/fit-cost.js): the whole port beside the
// game (test/lockstep.js), from the hand-over through the control selection into play and from
// the moments of play in work/states, one row for each stretch between two checkpoints (or a
// checkpoint and the HALT's exit). A row holds the game's T-states for the stretch less its
// interrupts, less the T-states it spent halted, and less the view's copy ($963B to its EI at
// $9691), which the page times by itself because the interrupts are off while it runs; and the
// port's calls in the stretch, the copy's left out, and its counts of the work inside them (P.N,
// src/core.js) as '#count'. The last line holds what the page needs beside
// the fit: the interrupt's own T-states and the copy's, each as their median.
// With "plan" after the seed, the input is a plan of walks and runs the four ways, set as each pass
// begins (test/t-page.js paces the page on the same plan from other moments), from every sixth
// moment, starting at the fourth: the windows dragged and the views scrolled for long stretches,
// which random input does little of.
//   node time-stretches.js out.jsonl [passes] [state filter, or "boot"] [seed] [plan]
const fs = require('fs');
const { run } = require('../test/lockstep.js');
const lib = require('../test/lib.js');

const out = process.argv[2], passes = +(process.argv[3] || 300), filter = process.argv[4] || 'boot', seed = +(process.argv[5] || 1);
const PLAN = process.argv[6] === 'plan', J = lib.JOY;
const plan = n => [J.UP, J.RIGHT, J.DOWN | J.FIRE, J.LEFT, 0, J.RIGHT | J.FIRE, J.FIRE][Math.floor(n / 8) % 7];
if (!out) { console.log('usage: node time-stretches.js out.jsonl [passes] [state filter, or "boot"] [seed]'); process.exit(2); }
const COPY = 0x963B, COPY_END = 0x9691;
const rows = [], copies = [], irqs = [];
let port = null;
for (const state of filter === 'boot' ? [null] : lib.states(filter).filter((n, i) => !PLAN || i % 6 === 3)) {
  let halted = 0, copy = 0, copyAt = -1;
  const r = run({ state, passes, seed, onPass: PLAN ? (n, mm) => { mm.joy = plan(n); } : undefined, onPort: (P, m) => {
    port = P;
    // the T-states the game spends halted, and in the view's copy (this machine's only: the
    // lockstep's copy of it, run on ahead for the interrupt's bytes, has the same hooks)
    const step = m.step.bind(m);
    m.step = () => { const h = m.cpu.halted, t = m.cpu.tstates, ok = step(); if (h) halted += m.cpu.tstates - t; return ok; };
    const prev = [m.hooks[COPY], m.hooks[COPY_END]];
    m.hooks[COPY] = mm => { if (mm === m) copyAt = m.cpu.tstates; return prev[0] ? prev[0](mm) : undefined; };
    m.hooks[COPY_END] = mm => {
      if (mm === m && copyAt >= 0) { const t = m.cpu.tstates - copyAt; copy += t; copies.push(t); copyAt = -1; }
      return prev[1] ? prev[1](mm) : undefined;
    };
  }, timing: s => {
    const calls = Object.assign({}, s.calls);
    delete calls.show_view;
    for (const [k, v] of Object.entries(port.N)) { if (v) calls['#' + k] = v; port.N[k] = 0; }
    rows.push({ pass: s.pass, from: s.from, to: s.to, halt: s.halt, cycles: s.tstates - halted - copy, halted, copy, calls, polls: s.polls });
    if (s.irqs) irqs.push(s.irqTstates / s.irqs);
    halted = 0; copy = 0;
  } });
  console.log((state || 'boot') + ': ' + r.res.passes + ' passes' + (r.res.ok ? '' : ', not in step: ' + JSON.stringify(r.res.diverged || r.res.diffs[0]).slice(0, 200)));
}
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
fs.writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n' +
  JSON.stringify({ summary: true, irq: Math.round(median(irqs)), copy: Math.round(median(copies)), copies: copies.length }) + '\n');
console.log('wrote ' + out + ': ' + rows.length + ' stretches; the interrupt ' + Math.round(median(irqs)) + ' T-states, the copy ' + Math.round(median(copies)));
