'use strict';
// The game's cycles for each stretch of its main program, beside the port's calls in it: the
// lockstep's timing (kit/c64/lockstep.js) on the moments of flight and of docking, a row of JSON
// for each stretch, which scripts/fit-cost.js fits the page's pacing to.
//   node time-stretches.js out.jsonl passes filter [dock]
// e.g. 150 passes of each flight-0* moment, and 60 of each flight-base moment docking at once:
//   node time-stretches.js work/tm-flight.jsonl 150 flight-0
//   node time-stretches.js work/tm-base.jsonl 60 flight-base dock
const fs = require('fs');
const { run } = require('../test/lockstep.js');
const lib = require('../test/lib.js');
const [out, passes, filter, dock] = process.argv.slice(2);
if (!filter) { console.log('usage: node time-stretches.js out.jsonl passes filter [dock]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
for (const f of lib.states(filter)) {
  let n = 0;
  try {
    const r = run({ state: f, passes: +passes, dock: !!dock, timing: s => {
      n++;
      fs.writeSync(fd, JSON.stringify({ st: f, from: s.from, to: s.to, wait: s.wait, cycles: s.cycles, irqs: s.irqs,
        irqCycles: s.irqCycles, polls: s.polls, calls: s.calls }) + '\n');
    } });
    console.log(f, n, 'stretches', r.res.ok ? 'ok' : 'differs');
  } catch (e) { console.log(f, 'threw', e.message.slice(0, 200)); }
}
