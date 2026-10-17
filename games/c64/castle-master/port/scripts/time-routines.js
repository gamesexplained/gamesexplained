'use strict';
// The game's cycles for routines the stretches' fit cannot tell apart: those that run only where
// the program waits for the clock (scripts/fit-cost.js leaves a stretch that waits out), the
// viewport's steps as it closes on an area and opens on the view, two clock ticks a step; and the
// keyboard's scan, which every loop that waits for a key makes once a turn, so that a loop the
// timings never saw (keys held into the opening, $832E) still costs the scan. Each is called alone
// on the kit's simulator from the moments (test/check.js), beside the port's own, and a case where
// the two agree is a row: the game's cycles, the call and the port's counts of its work (P.N),
// marked alone, so that the fit gives it no stretch of its own. A routine timed here calls none of
// the port's others.
//   node time-routines.js out.jsonl [cases]
const fs = require('fs');
const { check } = require('../test/check.js');
const [out, cases = '2000'] = process.argv.slice(2);
if (!out) { console.log('usage: node time-routines.js out.jsonl [cases]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const ROUTINES = [
  // a step closing on an area ($82C2's widths, upward) or opening the view (from $78 down by two):
  // X lines drawn at the edge, and the lines from the last width down to this one cleared
  { name: 'APPLY_VERTICAL_BITMAP_TRANSITION_STEP', setup: (M, c, rnd) => {
    const x = rnd(0x3D) * 2;
    M[0x82BD] = rnd(3) ? Math.min(0x78, x + 2) : rnd(0x79);
    return { x, y: x };
  } },
  // the controls as a waiting loop finds them: mostly none, often one, now and then more
  { name: 'READ_CONTROL_INPUT', setup: (M, c, rnd) => {
    c.game.keys.clear();
    for (let i = [0, 0, 0, 1, 1, 2][rnd(6)]; i; i--) c.game.keys.add(rnd(64));
    c.game.joy = rnd(4) ? 0x1F : rnd(32);
  } },
];
for (const r of ROUTINES) {
  let n = 0;
  const res = check({ name: r.name, cases: +cases, setup: r.setup, timing: t => {
    const calls = { [r.name]: 1 };
    for (const [k, v] of Object.entries(t.N)) if (v) calls['#' + k] = v;
    fs.writeSync(fd, JSON.stringify({ st: t.st, alone: r.name, cycles: t.cycles, calls }) + '\n');
    n++;
  } });
  console.log(r.name + ': ' + n + ' rows' + (res.fails ? ', ' + res.fails + ' cases differ' : ''));
}
