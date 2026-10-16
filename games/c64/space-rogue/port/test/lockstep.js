'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from the moments of play in
// work/states with random keys and joystick moves at the start of passes. The game runs on
// kit/c64/c64run.js, the drive and KERNAL stand-in included; routines the port has not written are
// the game's own code (standin.js).
//   node lockstep.js [passes] [state name filter] [seed]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const { Machine } = require(path.join(lib.REPO, 'kit/c64/machine.js'));
const standin = require('./standin.js');
const SRC = path.join(lib.GAME, 'port/src');

function loadPort() {
  require(path.join(SRC, 'core.js'));
  for (const f of fs.readdirSync(SRC).sort()) if (f !== 'core.js' && f.endsWith('.js')) require(path.join(SRC, f));
  return globalThis.SRPort;
}

// The interrupt's bytes the main program reads: the frame count, the keyboard buffer and its count
// and room, the keyboard's state, and $0D03, which the keyboard scan clears when a key is down
const IRQ_BYTES = [0x03, 0x04, ...Array.from({ length: 0x11 }, (_, i) => 0x05 + i), 0x16, 0x0D03];

// A copy of the drive, so that a save on one side never reaches the other.
function driveCopy() {
  const d = lib.readDisk();
  return lib.C64Run.drive({ files: Object.assign({}, d.files), sectors: d.sectors });
}
// The disk as the port's io gives it.
function portDisk() {
  const D = driveCopy();
  return {
    load: name => { const f = D.find(name); return f ? D.files.get(f) : null; },
    block: (t, s) => D.sectors.get(t + ',' + s) || null,
    save: (name, bytes) => { D.files.set(D.bare(name), bytes); },
  };
}

// The game: a runner from the moment, whose machine copies itself with its drive and KERNAL (the
// lockstep copies the machine to look ahead).
class RunMachine extends Machine {
  static restore(s) {
    const R = lib.C64Run.create({ drive: driveCopy(), keep: {}, rasterFix: () => {}, state: { machine: s, frame: 0 } });
    Object.setPrototypeOf(R.m, RunMachine.prototype);
    return R.m;
  }
}

function run(o) {
  const SR = loadPort();
  const s = lib.readState(o.state);
  const m = RunMachine.restore(s.machine);
  const P = SR.makePort(new Uint8Array(65536), portDisk(), { only: o.groups });
  standin.install(P, standin.labels(o.parts || ['engine', 'flight']), IRQ_BYTES);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.main_loop(), checkpoints: P.CHECKPOINTS,
    irqs: { 0x0EA0: 'irq_entry', 0xFF48: 'irq_body' }, irqBytes: IRQ_BYTES, chips: ['colour', 'vic', 'sid'],
    ignore: o.ignore || [], maxFrames: o.maxFrames || 500 });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
  const KEYS = o.keys || ['A', 'D', 'W', 'X', 'Z', 'C', 'S', '+', 'T', 'V', 'SPACE', 'R', 'I'];
  const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24];
  let held = null, until = 0;
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false, onPass: (n, mm) => {
    if (held && n >= until) { mm.release(held); held = null; }
    if (!held && rnd(12) === 0) { held = KEYS[rnd(KEYS.length)]; mm.press(held); until = n + 1 + rnd(3); }
    if (rnd(8) === 0) mm.joy = 0x1F & ~DIRS[rnd(DIRS.length)];
  } });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || 'flight', seed = +(process.argv[4] || 1);
  let ok = 0, n = 0;
  for (const f of lib.states(filter)) {
    n++;
    let out;
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n  ')); continue; }
    console.log(f + ' (' + out.P.standIns.size + ' stand-ins): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + n + ' moments in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, loadPort, portDisk, IRQ_BYTES };
