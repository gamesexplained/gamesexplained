'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js): from the moments of play in
// work/states, or from the start-up through the title, each driven by the test player (lib.bot)
// seeded from the moment's frame. The game runs on kit/c64/machine.js with its timers and serial
// port; routines the port has not written are the game's own code (standin.js).
//   node port/test/lockstep.js [passes, default 600] [state name filter, or "cold"] [seed]
//
// One race of the game's own is let through (kit/skills/core/70-minisite/play.md, "What lockstep
// cannot match"): the sound driver's note readers run in the main program (frame_wait) and its
// effect players in the interrupt, on the same SID registers. An interrupt the game takes while
// its main program is in the driver writes those registers in the middle of the reader's writes;
// the lockstep runs it in the port at the port's next checkpoint, after them. A pass that starts
// with the SID's registers alone differing, after such an interrupt in the pass before it, has the
// game's registers put back in the port and is counted (races); any other difference stops the run.
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

// Memory compared at the start of each pass: all but the processor port and the part of the stack
// page the stack uses ($01D4-$01FF); the virtual sprites' tables sit below it.
const COMPARE = [[0x02, 0xFF], [0x100, 0x1D3], [0x200, 0xFFFF]];
// The sound driver's code (src/g-sound.js)
const DRIVER = [[0xE000, 0xEC07], [0xF1FB, 0xF27C], [0x3F58, 0x3FA2]];
const inDriver = pc => DRIVER.some(([f, l]) => pc >= f && pc <= l);

function run(o) {
  const GB = loadPort();
  const cold = o.state === 'cold';
  const s = cold ? null : lib.readState(o.state);
  const m = cold ? lib.boot() : lib.restore(s);
  const P = GB.makePort(new Uint8Array(65536), {});
  standin.install(P, GB.IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  // the cycles at which the game took its interrupt inside the driver's code
  const raced = [];
  const take = m.take.bind(m);
  m.take = v => { if (v === 0xFFFE && inDriver(m.cpu.pc)) raced.push(m.cpu.cycles); return take(v); };
  // The player moves the stick at the start of each pass. Where no pass starts (the title, a death,
  // an intermission) it moves once a frame at the next checkpoint both reach (timing is called
  // there): input changed between checkpoints would miss the copy of the game the lockstep runs on
  // for the interrupt's bytes the port reads (kit/c64/lockstep.js, irqBytes).
  const play = lib.bot((o.seed || 1) * 7919 + (cold ? 0 : s.frame || 0));
  let passFrame = m.frames, due = false;
  const timing = st => { if (o.timing) o.timing(st); if (due) { due = false; play(m); } };
  const ls = new Lockstep({ machine: m, port: P, program: P => (cold ? P.main() : P.resume()),
    checkpoints: P.CHECKPOINTS, irqs: { 0xCEA9: 'irq' }, irqBytes: GB.IRQ_BYTES, compare: COMPARE,
    chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [], maxFrames: o.maxFrames || 1500, timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const starts = [m.cpu.cycles];
  const res = ls.run({ passes: o.passes || 600, stopOnDiff: false,
    onPass: (n, mm, l) => {
      const d = l.res.diffs[l.res.diffs.length - 1];
      if (d && d.pass === n && d.race === undefined) {
        const from = starts[n - 1] !== undefined ? starts[n - 1] : -1;
        d.race = d.bytes.every(b => b.chip === 'sid') && raced.some(c => c > from && c <= d.cycle);
        if (!d.race) l.stopped = true;
      }
      starts[n] = mm.cpu.cycles;
      if (o.onPass) o.onPass(n, mm, l); else { passFrame = mm.frames; due = false; play(mm); }
    },
    onFrame: o.onFrame || ((f, mm) => { if (f - passFrame > 2) due = true; }) });
  res.races = res.diffs.filter(d => d.race).length;
  res.diffs = res.diffs.filter(d => !d.race);
  res.ok = !res.diverged && !res.diffs.length;
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 600), filter = process.argv[3] || '', seed = +(process.argv[4] || 1);
  const list = filter === 'cold' ? ['cold'] : lib.states(filter);
  let ok = 0, n = 0, races = 0;
  for (const f of list) {
    n++;
    let out;
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 6).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    races += out.res.races;
    console.log(f + (used.length ? ' (the game\'s code stood in for ' + used.join(', ') + ')' : '') + ': ' + describe(out.res).split('\n').join('\n  ') +
      (out.res.races ? ' (' + out.res.races + ' after the sound driver\'s race)' : ''));
    if (out.res.ok && !used.length) ok++;
  }
  console.log(ok + '/' + n + ' moments in step' + (races ? '; ' + races + ' passes began after the sound driver\'s race, its SID registers put back' : ''));
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, COMPARE, DRIVER };
