'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), on the machine with nested
// interrupts: from the game's first instruction (cold), or from the moments of play in work/states
// (port/scripts/gen-states.js), with the Maps page's route on the joystick, frame by frame. Routines
// the port has not written are the game's own code (standin.js).
//   node lockstep.js [passes] [session filter]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, standIn, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

function machine(session) {
  if (session === 'cold') return lib.boot();
  return lib.restore(session);
}

function run(o) {
  const AP = loadPort();
  const m = machine(o.session);
  const P = AP.makePort(new Uint8Array(65536), {});
  standin.install(P, AP.IRQ_BYTES, AP.POLLS);
  if (o.onPort) o.onPort(P, m);
  const program = o.session === 'cold' ? P => P.main() : P => P.resume();
  const ls = new Lockstep({ machine: m, port: P, program, checkpoints: P.CHECKPOINTS,
    irqs: { 0xAE41: P.irq_handler && !P.standIns.has('irq_handler') ? 'irq_handler' : standIn(P, 0xAE41, { irq: true }), 0xAFC4: () => {} },
    irqBytes: AP.IRQ_BYTES, chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [], maxFrames: o.maxFrames || 3000, timing: o.timing });
  if (o.onLockstep) o.onLockstep(ls);
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const joy = lib.joystick();
  const res = ls.run({ passes: o.passes || 300, stopOnDiff: o.stopOnDiff !== false, onPass: o.onPass, onFrame: o.onFrame || ((f, mm) => {
    mm.joy = 0x1F & ~(f < joy.length ? joy[f] : 0);
  }) });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 300), filter = process.argv[3] || '';
  const sessions = ['cold'].filter(s => s.includes(filter)).concat(lib.states(filter).map(f => f.replace(/\.json$/, '')));
  let ok = 0;
  for (const s of sessions) {
    let out;
    const t0 = Date.now();
    try { out = run({ session: s, passes }); } catch (e) { console.log(s + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log(s + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (used.length ? '; the game\'s code stood in for ' + used.length + ' routines' : '') + '): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok && !used.length) ok++;
  }
  console.log(ok + '/' + sessions.length + ' sessions in step');
  process.exitCode = ok === sessions.length ? 0 : 1;
}

module.exports = { run };
