'use strict';
// The rows the Play page's pacing is fitted on (scripts/fit-cost.js): the whole port beside the
// game (test/lockstep.js) from the engine's first instruction, through the menus, the shop and the
// placing of the units into the turns, one row for each stretch between two checkpoints. A row
// holds the game's T-states for the stretch less what the port spent on the game's clock in it
// (P.T: the delay loops, the sound effects and the tape, which the page times by themselves); the
// port's calls in the stretch, the scenario's own routines among them (runtime.js, countScenario),
// and its counts of the work inside them (P.N, src/core.js) as '#count'; and the polls, the port's
// bare yields (the wait for SPACE to be let go after the tape), whose rows the fit leaves out.
//   node time-stretches.js out.jsonl [passes] [scenario 1-6] [seed] [players 1-2] [level] [clean]
// The interrupts are off for the whole game, so there is nothing of theirs to take out.
const fs = require('fs'), path = require('path');
// LS_CHARGE=1: Paradise Valley with the placing squares by the river (test/charge.js); LS_CONTROLS:
// the control option the menus are answered with, 1 to 4 (default 4, the keys, which the bot plays)
if (process.env.LS_CHARGE) require('../test/charge.js').moveSquares();
const { run } = require('../test/lockstep.js');
require('../page/runtime.js');
const { LSPage } = globalThis;

const [out, passes, scenario, seed, players, level] = process.argv.slice(2);
if (!out) { console.log('usage: node time-stretches.js out.jsonl [passes] [scenario 1-6] [seed] [players 1-2] [level] [clean]'); process.exit(2); }
const rows = [];
let port = null, scen = {};
const t0 = Date.now();
const r = run({ passes: +(passes || 2000), scenario: +(scenario || 1), seed: +(seed || 1), players: +(players || 2), level: +(level || 1),
  maxFrames: +(players || 2) === 1 ? 40000 : 2000, clean: process.argv[8] === 'clean', controls: +(process.env.LS_CONTROLS || 4),
  onPort: P => {
    port = P;
    // the class the restarts throw is no routine: the lockstep's count of calls leaves it alone
    Object.defineProperty(P, 'Restart', { value: P.Restart, enumerable: false });
    LSPage.countScenario(P, name => { scen[name] = (scen[name] || 0) + 1; });
  },
  timing: s => {
    const calls = {};
    for (const [k, v] of Object.entries(s.calls)) if (!LSPage.HELPERS.has(k)) calls[k] = v;
    for (const [k, v] of Object.entries(scen)) calls[k] = (calls[k] || 0) + v;
    scen = {};
    for (const [k, v] of Object.entries(port.N)) { if (v) calls['#' + k] = v; port.N[k] = 0; }
    const spent = port.take();
    rows.push({ pass: s.pass, from: s.from, to: s.to, cycles: s.tstates - s.estimate - spent, spent, calls, polls: s.polls });
  } });
fs.writeFileSync(out, rows.map(x => JSON.stringify(x)).join('\n') + '\n');
console.log(path.basename(out) + ': ' + r.res.passes + ' passes, ' + rows.length + ' stretches, ' + Math.round((Date.now() - t0) / 1000) + ' s' +
  (r.res.ok ? '' : '; not in step: ' + JSON.stringify(r.res.diverged || r.res.diffs[0]).slice(0, 300)));
process.exitCode = r.res.ok ? 0 : 1;
