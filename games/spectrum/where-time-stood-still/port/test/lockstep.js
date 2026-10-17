'use strict';
// The whole port beside the game, pass by pass (kit/spectrum/lockstep.js): from the hand-over,
// through the control selection (lib.titleInput) into play, or from the moments of play in
// work/states, with the sessions' input (sessions.js's player) given pass by pass. The game runs
// on the 128K machine (lib.js); routines the port has not written are the game's own code
// (standin.js).
//   node lockstep.js [passes] [state name filter, or "boot"] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const { player } = require('./sessions.js');

// the bytes the interrupt writes and the main program reads in the middle of a stretch: the clock's
// midnight count ($BF29), the light and its count ($BF2E, $BF2F), which the panel reads
const IRQ_BYTES = [0xBF29, 0xBF2E, 0xBF2F];
// the bytes the port does not keep the game's way (kit/skills/core/70-minisite/play.md): the
// stack pointer the sound driver's snd_pitch ($761C) saves at $798B while it reads the pitch table
// through it, which is wherever the interrupt found the stack
const IGNORE = [[0x798B, 0x798C]];
// the game's stack: $BFF0 down, above the clock's bytes at $BF29-$BF30
const STACK = [0xBF31, 0xBFEF];

function run(o) {
  const WT = loadPort();
  const boot = !o.state;
  const m = boot ? lib.boot() : lib.restore(lib.readState(o.state));
  const P = WT.makePort(new Uint8Array(65536), {});
  standin.install(P);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.program(boot), checkpoints: P.CHECKPOINTS.concat(boot ? [0x8521, 0x8534] : []),
    halts: P.HALTS, irqs: { 0xBEBE: 'interrupt' }, irqBytes: IRQ_BYTES, chips: ['border', 'paging', 'ay'], stack: STACK,
    ignore: IGNORE.concat(o.ignore || []), maxFrames: o.maxFrames || 600, timing: o.timing });
  // ROM 0's bytes the game reads, which the port reads at the same addresses (the lockstep's copy
  // of memory has ROM 1 there when it starts from the hand-over)
  P.M.set(lib.ROM0, lib.EXCERPT.from);
  const input = player(lib.makeRnd(o.seed || 1)), title = lib.titleInput(o.choice || 'kempston');
  let lastPass = -1, passFrame = 0;
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false,
    onPass: o.onPass || ((n, mm) => input(n, mm)),
    onFrame: o.onFrame || ((f, mm, l) => {
      if (boot && l.res.passes === 0) { title(f, mm); return; }
      // a wait with no pass (the pause): fire tapped now and then
      if (l.res.passes !== lastPass) { lastPass = l.res.passes; passFrame = f; return; }
      const idle = f - passFrame;
      if (idle > 50) mm.joy = idle % 40 < 4 ? lib.JOY.FIRE : 0;
    }) });
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
    console.log((f || 'boot') + ' (' + (Date.now() - t) + ' ms, ' + used.length + ' routines stood in): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + n + ' runs in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, IRQ_BYTES, IGNORE, STACK };
