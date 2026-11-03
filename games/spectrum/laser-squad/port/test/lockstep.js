'use strict';
// The whole port beside the game, pass by pass (kit/spectrum/lockstep.js): from the engine's first
// instruction (work/entry.sna) through the menus, the scenario loaded from the tape, the shop and
// the placing of the units, into the turns, with the bot's input (bot.js) set at every read of the
// controls and the keyboard, where the game and the port stand at the same place. The game runs on
// the tests' 48K machine (lib.js), its ROM's KEY-SCAN and tape routines stood in for; the port's
// tape is a copy of the same cassette. Routines the port has not written (the scenario's) are the
// game's own code (standin.js).
//
// The game reads the refresh register for its random numbers and its noise, which no port can
// keep: both read the same made-up values instead, in the order they read them, so a port that
// reads R once too often or too seldom is out of step at once.
//   node lockstep.js [passes] [scenario 1-6] [seed] [players 1-2] [level]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const bot = require('./bot.js');

// the game's stack: set at $5E39 and growing down, below it the engine's variables end at $5DFF
const STACK = [0x5E00, 0x5E38];

// The keys the menus are answered with: the scenario, the keyboard's controls (4), one player or
// two, the computer's level; between turns, mostly fire (bot.js), now and then 1 (the controls
// again), 2 (save) or 4 (check the save).
function keys(o) {
  return (under, M, rnd) => {
    if (under(0xB1D8)) return String(o.scenario || 1);
    if (under(0xB0C2)) return String(o.controls || 4);
    if (under(0xA228)) return String(o.players || 2);
    if (under(0xA24F)) return String(o.level || 1);
    if (under(0xB20C)) { const r = rnd(); return r < 0.02 ? '1' : r < 0.04 ? '2' : r < 0.05 ? '4' : null; }
    return undefined;
  };
}

function run(o = {}) {
  const LS = loadPort();
  const m = o.state ? lib.restore(lib.readState(o.state)) : lib.fromSna('entry');
  const blocks = lib.tapeBlocks();
  m.tape = new lib.Tape(blocks);
  // the refresh register, as both read it
  const rA = lib.makeRnd(o.rseed || 11), rB = lib.makeRnd(o.rseed || 11);
  const readreg = m.cpu.readreg.bind(m.cpu);
  m.cpu.readreg = what => (what === 'R' ? rA(128) : readreg(what));
  const P = LS.makePort(new Uint8Array(65536), { tape: new lib.Tape(blocks), r: () => rB(128) });
  standin.install(P);
  if (o.onPort) o.onPort(P, m);
  bot.attach(m, o.seed || 1, { hooks: false, key: keys(o), hunt: o.hunt });
  const ls = new Lockstep({ machine: m, port: P, program: P => P.program(o.state ? 0xB1C3 : 0x5E28), passAt: 0xB0C8,
    checkpoints: P.CHECKPOINTS, chips: ['border'], stack: STACK, ignore: o.ignore || [], maxFrames: o.maxFrames || 2000,
    timing: o.timing });
  const res = ls.run({ passes: o.passes || 2000, stopOnDiff: o.stopOnDiff !== false,
    onPass: (n, mm) => { if (P.__clear) P.__clear(); mm.bot.decide(mm); },
    onFrame: (f, mm) => { if (mm.cpu.pc !== 0xB0C8) mm.bot.decide(mm); } });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 2000), scenario = +(process.argv[3] || 1), seed = +(process.argv[4] || 1);
  const players = +(process.argv[5] || 2), level = +(process.argv[6] || 1);
  const t = Date.now();
  let out;
  try { out = run({ passes, scenario, seed, players, level }); } catch (e) { console.log((e.stack || e.message).split('\n').slice(0, 10).join('\n')); process.exit(1); }
  const used = [...out.P.standInsUsed];
  console.log('scenario ' + scenario + ', seed ' + seed + ' (' + (Date.now() - t) + ' ms, turn ' + out.m.ram[0xB711] + ', ' + used.length +
    ' routines stood in' + (used.length ? ': ' + used.join(' ') : '') + '): ' + describe(out.res).split('\n').join('\n  '));
  process.exitCode = out.res.ok ? 0 : 1;
}

module.exports = { run, STACK };
