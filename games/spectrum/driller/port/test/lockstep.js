'use strict';
// The whole port beside the game, pass by pass (kit/spectrum/lockstep.js): from the hand-over,
// through the security question and the control options into play, or from the moments of play in
// work/states, with the sessions' input (sessions.js's player) given pass by pass. The game runs
// on the 48K machine (lib.js); routines the port has not written are the game's own code
// (standin.js).
//   node lockstep.js [passes] [state name filter, or "boot"] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const { player } = require('./sessions.js');

// The interrupt goes through the jump at $FDFD (install_interrupt) to $BAE6.
// the bytes the interrupt writes and the main program reads in the middle of a stretch: the wait
// counter ($8FC2), the beam state ($8A21), the clock's frame count ($88A3, which drill reads for
// the gas), the frame counter the security question is picked by ($8A1D), the minutes ($889D),
// and the game's end ($8BF2)
const IRQ_BYTES = [0x8FC2, 0x8A21, 0x88A3, 0x8A1D, 0x889D, 0x8BF2];
// the game's stack: $FFF8 down, above the interrupt's table at $FE00-$FF00
const STACK = [0xFF01, 0xFFF7];

// The keys for the start, frame by frame: once the security question is on the screen (its cursor
// at $CB6F), its word typed, each letter held 3 frames and let go for 3, then ENTER; at the
// control options (their title printed), ENTER.
function startInput() {
  let plan = null, i = 0, options = false;
  return (f, m) => {
    if (!plan && m.ram[0xCB6F] === 0x23 && m.cpu.pc >= 0xCC7E && m.cpu.pc < 0xCD00) {
      plan = [];
      for (const ch of lib.answer(m.ram)) plan.push([ch], [ch], [ch], [], [], []);
      plan.push(['ENTER'], ['ENTER'], ['ENTER'], [], [], []);
    }
    m.releaseAll();
    if (plan && i < plan.length) { for (const k of plan[i++]) m.press(k); return; }
    if (plan && !options && m.cpu.pc >= 0xCA47 && m.cpu.pc < 0xCA75) { options = true; plan.push([], ['ENTER'], ['ENTER'], ['ENTER'], [], []); }
  };
}

function run(o) {
  const DR = loadPort();
  const boot = !o.state;
  const m = boot ? lib.boot() : lib.restore(lib.readState(o.state));
  const P = DR.makePort(new Uint8Array(65536), {});
  standin.install(P);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.program(boot), checkpoints: P.CHECKPOINTS,
    irqs: { 0xFDFD: 'interrupt' }, irqBytes: IRQ_BYTES, chips: ['border', 'ear'], stack: STACK,
    ignore: o.ignore || [], maxFrames: o.maxFrames || 3200, timing: o.timing });
  // the ROM's bytes the game reads, which the port reads at the same addresses
  P.M.set(lib.ROM, lib.EXCERPT.from);
  const input = player(lib.makeRnd(o.seed || 1)), start = startInput();
  let started = !boot;
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false,
    onPass: o.onPass || ((n, mm) => { started = true; input(n, mm); }),
    onFrame: o.onFrame || ((f, mm) => { if (!started) start(f, mm); }) });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || 'boot', seed = +(process.argv[4] || 1);
  const list = filter === 'boot' ? [null] : lib.states(filter);
  let ok = 0, n = 0;
  for (const f of list) {
    n++;
    let out;
    const t = Date.now();
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log((f || 'boot') + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log((f || 'boot') + ' (' + (Date.now() - t) + ' ms, ' + used.length + ' routines stood in' + (used.length ? ': ' + used.join(' ') : '') + '): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + n + ' runs in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, IRQ_BYTES, STACK, startInput };
