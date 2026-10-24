'use strict';
// The game's cycles for the main program's routines, each called alone on the kit's simulator from
// the moments (test/check.js), beside the port's own: the drawing (test/t-draw.js), the lists
// (test/t-lists.js) and the ship (test/t-world.js), on the states their checks make; and the
// interrupt's (test/t-irq.js), whose rows are marked irq, for its fit. The play the
// stretches were timed on (scripts/time-stretches.js) shows few of the screens, so a fit on them
// alone can put one routine's cost on another that comes with it; these rows give each routine
// its own. A case where the two agree is a row: the game's cycles, every routine of the port's
// called in it (the one timed among them) and the port's counts of its work (P.N), marked alone, so
// that the fit gives it no stretch of its own. A case in which time passes that is not the
// routine's work (a raster wait, a poll: any yield but the { cycles: 0 } a long drawing hands the
// page's clock back with) is left out.
//   node time-routines.js out.jsonl [cases]
const fs = require('fs');
const { check } = require('../test/check.js');
const [out, cases = '600'] = process.argv.slice(2);
if (!out) { console.log('usage: node time-routines.js out.jsonl [cases]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const STACK = [[0x100, 0x1FF]];
const CHECKS = ['t-draw', 't-lists', 't-world'].flatMap(f => require('../test/' + f + '.js').CHECKS)
  .concat(require('../test/t-irq.js').CHECKS.map(o => Object.assign({ irq: true }, o)));
for (const o of CHECKS) {
  let calls = {}, n = 0, waits = false;
  const onPort = P => {
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      P[name] = f instanceof GENERATOR
        ? function* (...a) {
          calls[name] = (calls[name] || 0) + 1;
          const it = f.apply(this, a);
          for (let r = it.next(); ; r = it.next()) {
            if (r.done) return r.value;
            if (!(r.value && r.value.cycles === 0 && r.value.cp === undefined)) waits = true;
            yield r.value;
          }
        }
        : function (...a) { calls[name] = (calls[name] || 0) + 1; return f.apply(this, a); };
    }
    calls = {}; waits = false;
  };
  if (o.hooks) { console.log(o.name + ': left out, it waits'); continue; }
  const res = check(Object.assign({ ignore: STACK }, o, { cases: Math.min(+cases, o.cases || +cases), onPort, timing: t => {
    if (waits) return;
    const row = Object.assign({}, calls);
    for (const [k, v] of Object.entries(t.N)) if (v) row['#' + k] = v;
    fs.writeSync(fd, JSON.stringify({ st: t.st, alone: o.name, irq: o.irq, cycles: t.cycles, calls: row }) + '\n');
    n++;
  } }));
  console.log(o.name + ': ' + n + ' rows' + (res.fails ? ', ' + res.fails + ' cases differ' : ''));
}
