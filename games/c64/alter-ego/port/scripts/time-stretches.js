'use strict';
// The game's cycles for each stretch of its program, beside the port's calls in it: the
// lockstep's timing (kit/c64/lockstep.js) over the sessions of test/lockstep.js, from the loader's
// hand-over, for scripts/fit-cost.js to fit the page's pacing to. Each row is a stretch, with the
// turns of the game's delay loop (delay_scaled_iterations) the port made in it; stretches alike in
// every count and in their cycles are one row with n, the number of them (most are turns of the
// wait for a key, every one the same).
//   node time-stretches.js out.jsonl session...
const fs = require('fs');
const { run } = require('../test/lockstep.js');
const [out, ...sessions] = process.argv.slice(2);
if (!sessions.length) { console.log('usage: node time-stretches.js out.jsonl session...'); process.exit(2); }
const fd = fs.openSync(out, 'a');
for (const session of sessions) {
  const rows = new Map();
  let turns = 0, n = 0;
  const t0 = Date.now();
  const r = run({ session, port: P => {
    const f = P.delay_scaled_iterations;
    P.delay_scaled_iterations = function* (k) { const v = P.s(P.divs(k, 16)); if (v > 0) turns += v; return yield* f.call(this, k); };
  }, timing: s => {
    n++;
    const row = { from: s.from, to: s.to, cycles: s.cycles, irqs: s.irqs, irqCycles: s.irqCycles, polls: s.polls, turns, calls: s.calls };
    turns = 0;
    const k = JSON.stringify(row);
    rows.set(k, (rows.get(k) || 0) + 1);
  } });
  for (const [k, c] of rows) fs.writeSync(fd, JSON.stringify(Object.assign({ session, n: c }, JSON.parse(k))) + '\n');
  console.log(session + ': ' + n + ' stretches, ' + rows.size + ' rows, ' + (r.res.ok && !r.drives ? 'identical' : 'DIFFERS') + ', ' + Math.round((Date.now() - t0) / 1000) + ' s');
}
