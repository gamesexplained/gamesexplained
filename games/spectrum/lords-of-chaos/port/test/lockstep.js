'use strict';
// The whole port beside the game, pass by pass (kit/spectrum/lockstep.js): from the hand-over,
// through SELECT CONTROLS, the designer and a scenario's load into play, or from the moments of play
// in work/states, each saved where a human turn's loop reads the controls ($61E6), with the
// sessions' input (sessions.js's player) given pass by pass. The game runs on the 48K machine
// (lib.js); routines the port has not written are the game's own code (standin.js).
//   node lockstep.js [passes] [state name filter, or "boot"] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// Every read of the controls ($622B) and of the keyboard through the ROM ($028E) is a checkpoint,
// and the one HALT goes on at $829B.
const CHECKPOINTS = [0x622B, 0x028E];
const HALTS = [0x829B];
// The stacks: the game's own from $FFF3 in play, the loader's from $5DA8 before (in the object
// table, unused until a scenario starts).
const STACK_PLAY = [0xFF96, 0xFFF2], STACK_BOOT = [0x5D40, 0x5DA7], PANEL_STACK = [0x5FC0, 0x606D];
// the bytes an interrupt writes and the main program reads in the middle of a stretch
const IRQ_BYTES = [];
// the one LD A,R, in random_below, and its seven reads of memory, which walk through the stacks too
const READS_R = [0xA738], READS_AT = [0xA741, 0xA743, 0xA745, 0xA74D, 0xA74F, 0xA751, 0xA755];

// The port's main program: from the hand-over the port's program_start; from a moment of play the
// human turn's loop at $61E6, then the turn loop from its return ($617F).
function program(boot) {
  return P => (function* () {
    if (boot) { P.part = 0; return yield* (P.program ? P.program() : P.run(0xE1ED)); }
    if (P.resume) return yield* P.resume();
    yield* P.run(0x61E6);
    return yield* P.run(0x617F);
  })();
}

function run(o) {
  const LOC = loadPort();
  const boot = !o.state;
  const m = boot ? lib.boot() : lib.restore(lib.readState(o.state));
  const P = LOC.makePort(new Uint8Array(65536), {});
  standin.install(P);
  P.IRQ = new Set(IRQ_BYTES);
  if (!boot) P.part = lib.partOf(m.ram);
  P.io.tape = lib.Tape.from(m.tape.save_());     // a copy of the cassette as it stands: the port plays its own
  if (o.onPort) o.onPort(P, m);
  // input given only where the game stands at a checkpoint (sessions.js's check)
  const ls = new Lockstep({ machine: m, port: P, program: program(boot), checkpoints: CHECKPOINTS, halts: HALTS,
    irqs: { 0xFFFF: function () { return this.interrupt({}); } }, irqBytes: IRQ_BYTES, readsR: READS_R, readsAt: READS_AT, chips: ['border', 'ear'],
    stack: boot ? STACK_BOOT : STACK_PLAY, ignore: (boot ? [STACK_PLAY] : []).concat(o.ignore || []),
    maxFrames: o.maxFrames || 20000, timing: o.timing });
  // The file panel's stack runs down from $606E over the top creature records, which are filled
  // again before a game starts or loads: while the game's stack is there, those bytes are its stack.
  const A0 = ls.addrs, A1 = A0.filter(a => a < PANEL_STACK[0] || a > PANEL_STACK[1]);
  const compare = ls.compare.bind(ls);
  ls.compare = (...x) => { const sp = m.cpu.sp; ls.addrs = sp >= PANEL_STACK[0] && sp <= PANEL_STACK[1] + 1 ? A1 : A0; return compare(...x); };
  if (o.onCheckpoint) {
    const cp = ls.checkpoint.bind(ls);
    ls.checkpoint = (a, y) => { const r = cp(a, y); if (!ls.halted) o.onCheckpoint(a, m, ls); return r; };
  }
  return { ls, m, P };
}

module.exports = { run, CHECKPOINTS, HALTS, IRQ_BYTES, READS_R, READS_AT, STACK_PLAY, STACK_BOOT, describe };

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || 'boot', seed = +(process.argv[4] || 1);
  const { player } = require('./sessions.js');
  const list = filter === 'boot' ? [null] : lib.states(filter);
  let ok = 0, n = 0;
  for (const f of list) {
    n++;
    const t = Date.now();
    let out, res;
    try {
      let input = null;
      out = run({ state: f, onCheckpoint: (a, mm) => input.check(mm) });
      input = player(lib.makeRnd(seed), out.m);
      res = out.ls.run({ passes, stopOnDiff: true, onPass: (k, mm) => input.pass(k, mm), onFrame: (fr, mm) => input.frame(fr, mm) });
    } catch (e) { console.log((f || 'boot') + ': ' + (e.stack || e.message).split('\n').slice(0, 10).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log((f || 'boot') + ' (' + (Date.now() - t) + ' ms, ' + out.m.frames + ' frames, ' + used.length + ' routines stood in): ' +
      describe(res).split('\n').join('\n  '));
    if (res.ok) ok++;
  }
  console.log(ok + '/' + n + ' runs in step');
  process.exitCode = ok === n ? 0 : 1;
}
