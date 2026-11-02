'use strict';
// The rows the Play page's pacing is fitted on (scripts/fit-cost.js): the whole port beside the
// game (test/lockstep.js), from the hand-over through the security question and the control
// options into play, from the moments of play in work/states, and through the scenarios that force
// each way out of play; one row for each stretch between two checkpoints. A row holds the game's
// T-states for the stretch less its interrupts, less the T-states of the port's { tstates } yields
// (the waits on the interrupt's counters, which the page's clock runs for itself) and less the
// sound effects' (P.N.beep: the interrupts are off while they play, and the page times them by
// themselves); the port's calls in the stretch, and its counts of the work inside them (P.N,
// src/core.js) as '#count'; and the interrupts the game took in it, irq: { n, t, and the port's
// counts of their work (P.NI: the sensors, the beams and the beam's line steps) }, their sound
// effects' T-states taken out as the stretch's are. The last line holds the interrupt's own
// T-states, as their median.
//   node time-stretches.js out.jsonl [passes] [state filter, "boot" or "scenarios"] [seed]
const fs = require('fs');
const { run, SCENARIOS } = require('../test/lockstep.js');
const lib = require('../test/lib.js');

const out = process.argv[2], passes = +(process.argv[3] || 150), filter = process.argv[4] || 'boot', seed = +(process.argv[5] || 1);
if (!out) { console.log('usage: node time-stretches.js out.jsonl [passes] [state filter, "boot" or "scenarios"] [seed]'); process.exit(2); }
const rows = [], irqs = [];
// the port's helpers, which are not routines of the game: the page does not cost them
const HELPERS = new Set(['irqByte', 'until0', 'w', 'setw', 'jump', 'jumpGen', 'def', 'program']);
const runs = filter === 'boot' ? [{}] : filter === 'scenarios' ? Object.keys(SCENARIOS).map(scenario => ({ scenario }))
  : lib.states(filter).filter(f => lib.restore(lib.readState(f)).cpu.pc === lib.PASS_AT).map(state => ({ state }));
for (const o of runs) {
  let port = null;
  const r = run(Object.assign({ passes: filter === 'scenarios' ? undefined : passes, seed, onPort: P => { port = P; }, timing: s => {
    const calls = {};
    for (const [k, v] of Object.entries(s.calls)) if (!HELPERS.has(k)) calls[k] = v;
    const beep = port.N.beep || 0;
    for (const [k, v] of Object.entries(port.N)) { if (v && k !== 'beep') calls['#' + k] = v; port.N[k] = 0; }
    const irq = { n: s.irqs, t: s.irqTstates - (port.NI.beep || 0) };
    for (const [k, v] of Object.entries(port.NI)) { if (v && k !== 'beep') irq['#' + k] = v; port.NI[k] = 0; }
    rows.push({ pass: s.pass, from: s.from, to: s.to, cycles: s.tstates - s.estimate - beep, beep, waited: s.estimate, calls, polls: s.polls, irq });
    if (s.irqs) irqs.push(s.irqTstates / s.irqs);
  } }, o));
  console.log((o.state || o.scenario || 'boot') + ': ' + r.res.passes + ' passes' + (r.res.ok ? '' : ', not in step: ' + JSON.stringify(r.res.diverged || r.res.diffs[0]).slice(0, 200)));
}
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
fs.writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n' + JSON.stringify({ summary: true, irq: Math.round(median(irqs)) }) + '\n');
console.log('wrote ' + out + ': ' + rows.length + ' stretches; the interrupt ' + Math.round(median(irqs)) + ' T-states');
