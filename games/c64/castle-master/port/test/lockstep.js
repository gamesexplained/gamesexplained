'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from the moments of play in
// work/states with random controls held over passes and pressed while a pass waits. The game runs
// on kit/c64/machine.js with both of its interrupt sources; routines the port has not written are
// the game's own code (standin.js).
//   node lockstep.js [passes] [state name filter] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// The interrupt's bytes the main program reads in the middle of a stretch: the lightning's
// countdown, the clock that reseeds it, the scripts' timer tick, the script delay, strength (a
// sensor drains it) and the spirit meter's clock.
const IRQ_BYTES = [0x2459, 0x1C64, 0x246D, 0x1063, 0x2455, 0x246A];

// The bytes the port does not keep the game's way (kit/skills/core/70-minisite/play.md): the
// lookup FIND_OBJECT_BY_ID saves its caller's X and Y at $621A/$621B and reads them back only to
// leave; the port's callers keep their registers where they use them, not on every path into it.
const IGNORE = [[0x621A, 0x621B]];

const KEYS = ['UP', 'UP', 'UP', '=', 'Z', 'X', 'Z', 'X', 'P', 'L', 'C', 'W', 'R', 'U', 'SPACE', 'A', 'F', 'LSHIFT'];

function run(o) {
  const CM = loadPort();
  const s = lib.readState(o.state);
  const m = lib.restore(s, { rom: o.rom });
  const P = CM.makePort(new Uint8Array(65536), {});
  standin.install(P, IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.main_loop({ c: s.cpu.p & 1 }), checkpoints: P.CHECKPOINTS,
    irqs: { 0xFF48: 'IRQ_DISPATCH' }, irqBytes: IRQ_BYTES, chips: ['colour', 'vic', 'sid'],
    ignore: IGNORE.concat(o.ignore || []), maxFrames: o.maxFrames || 1500, timing: o.timing, hooks: o.hooks });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
  const keys = o.keys || KEYS;
  let held = null, until = 0, lastPass = -1, passFrame = 0, tap = null;
  // o.onPass and o.onFrame, when given, press the keys instead (time-stretches.js's menus)
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false, onPass: o.onPass || ((n, mm) => {
    if (held && n >= until) { mm.release(held); held = null; }
    if (!held && rnd(6) === 0) { held = keys[rnd(keys.length)]; mm.press(held); until = n + 1 + rnd(6); }
  }), onFrame: o.onFrame || ((f, mm, l) => {
    // a wait with no pass (a message, a menu): a key tapped now and then where both stand at a stop
    if (l.res.passes !== lastPass) { lastPass = l.res.passes; passFrame = f; return; }
    const still = l.matched && l.at >= 0;
    // a key held into a wait that wants every key let go (the view's transition) is let go
    if (held && f - passFrame > 30 && still) { mm.release(held); held = null; return; }
    if (tap && f - tap.at > 6 && still) { mm.release(tap.k); tap = null; return; }
    if (!tap && f - passFrame > 60 && still && rnd(20) === 0) { tap = { k: 'SPACE', at: f }; mm.press('SPACE'); }
  }) });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || '', seed = +(process.argv[4] || 1);
  let ok = 0, n = 0;
  for (const f of lib.states(filter)) {
    n++;
    let out;
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 6).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log(f + (used.length ? ' (the game\'s code stood in for ' + used.join(', ') + ')' : '') + ': ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok && !used.length) ok++;
  }
  console.log(ok + '/' + n + ' moments in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, IRQ_BYTES, IGNORE };
