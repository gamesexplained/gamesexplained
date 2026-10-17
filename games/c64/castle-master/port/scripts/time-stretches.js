'use strict';
// The game's cycles for each stretch of its program, beside the port's work in it: the lockstep's
// timing (kit/c64/lockstep.js), a row of JSON for each stretch, which scripts/fit-cost.js fits the
// page's pacing to. A row's calls are how often the port called each of its routines, and its
// counts (P.N, src/core.js) of the work inside them whose length varies: pixels, rows, steps along
// an edge. Three kinds of run:
//   play   the moments of play in work/states, with test/lockstep.js's random controls;
//   start  from the loader's jump, the title's menus in each language and character (test/t-start.js);
//   menu   the moments again, with the information screen opened over and over: the keys shown,
//          the music switched, a save to disk and tape under a name typed with a mistake, a load
//          of it and of a name with no file, then back to the game.
//   node time-stretches.js out.jsonl play|start|menu passes [moment filter] [seed]
const fs = require('fs');
const lockstep = require('../test/lockstep.js');
const start = require('../test/t-start.js');
const { kernalHooks } = require('../test/kernal.js');
const lib = require('../test/lib.js');
const [out, kind, passes, filter = '', seed = '1'] = process.argv.slice(2);
if (!passes || !['play', 'start', 'menu'].includes(kind)) { console.log('usage: node time-stretches.js out.jsonl play|start|menu passes [moment filter] [seed]'); process.exit(2); }
const fd = fs.openSync(out, 'a');

// a row for each stretch, with P's counts taken and cleared
function timer(st, P, count) {
  return s => {
    count.n++;
    const calls = Object.assign({}, s.calls);
    for (const [k, v] of Object.entries(P.p.N)) { if (v) calls['#' + k] = v; P.p.N[k] = 0; }
    fs.writeSync(fd, JSON.stringify({ st, pass: s.pass, from: s.from, to: s.to, wait: s.wait, cycles: s.cycles, irqs: s.irqs,
      irqCycles: s.irqCycles, polls: s.polls, calls }) + '\n');
  };
}

// The information screen's visits, each a list of keys pressed where the menu waits for one
const VISITS = [
  ['K', 'K', 'K', 'F', 'F', 'K', 'S', 'D', 'T', 'O', 'X', 'DEL', 'W', 'E', 'R', 'RETURN'],
  ['L', 'D', 'T', 'O', 'W', 'E', 'R', 'RETURN'],
  ['S', 'T', 'H', 'A', 'L', 'L', 'RETURN'],
  ['F', 'K', 'SPACE'],
  ['L', 'T', 'H', 'A', 'L', 'L', 'RETURN'],
  ['L', 'D', 'N', 'O', 'N', 'E', 'RETURN'],
  ['F', 'SPACE'],
];
const POLLS = [0x794E, 0x7B39, 0x7BAF];
// The save and the load bank the KERNAL in with interrupts on, and the interrupt then enters through
// the KERNAL's vector and its entry at $FF48. The game keeps a copy of that entry in the RAM beneath
// ($FF48-$FF5A, and the vector at $FFFE), byte for byte the KERNAL's (901227-03, checked), so the
// simulator, which holds no ROM, reads the game's copy there.
function kernalEntry(st) {
  const ram = Buffer.from(lib.readState(st).ram, 'base64'), img = {};
  for (let a = 0xFF48; a <= 0xFF5A; a++) img[a & 0x1FFF] = ram[a];
  for (const a of [0xFFFE, 0xFFFF]) img[a & 0x1FFF] = ram[a];
  return img;
}
function menus(st, P, count) {
  const files = {};
  const hooks = kernalHooks(n => files[n.replace(/^@?\d?:/, '')] || null, (n, b) => { files[n] = b; });
  let visit = -1, k = 0, held = null, at = 0, nextPass = 2;
  return {
    hooks, rom: { kernal: kernalEntry(st) },
    onPort: p => { P.p = p; p.io.load = n => files[n] || null; p.io.save = () => {}; },
    timing: timer(st, P, count),
    onPass: (n, mm) => {
      if (held) { mm.release(held); held = null; }
      if (n >= nextPass && visit < VISITS.length - 1) { visit++; k = 0; held = 'I'; mm.press('I'); at = mm.cpu.cycles; nextPass = n + 3; }
    },
    // a key let go after three frames of the game's time wherever the two stand (a key held
    // through the music's switch would switch it again), and the next pressed where the menu waits
    // for one. The frames are counted on the game's clock: the lockstep calls onFrame for every
    // frame begun since its last stop, all at that stop.
    onFrame: (f, mm, l) => {
      const t = (mm.cpu.cycles - at) / lib.FRAME;
      if (held && t >= (held === 'I' ? 1 : 3)) { mm.release(held); held = null; at = mm.cpu.cycles; return; }
      if (!held && t > 8 && l.matched && POLLS.includes(l.at) && visit >= 0 && k < VISITS[visit].length) {
        held = VISITS[visit][k++]; mm.press(held); at = mm.cpu.cycles;
      }
    },
  };
}

if (kind === 'start') {
  for (const lang of [1, 2, 3]) for (const who of [1, 2]) {
    const P = {}, count = { n: 0 }, st = 'start-' + lang + who;
    const r = start.run(lang, who, +passes, lang * 7 + who + +seed, { onPort: p => { P.p = p; }, timing: timer(st, P, count) });
    console.log(st, count.n, 'stretches', r.ok ? 'ok' : 'differs');
  }
} else {
  for (const f of lib.states(filter)) {
    const P = {}, count = { n: 0 };
    try {
      const o = kind === 'menu' ? menus(f, P, count) : { onPort: p => { P.p = p; }, timing: timer(f, P, count) };
      // a menu's run goes on past a difference: the interrupt's sound, replayed at the port's next
      // stop, can land after the main program's clearing of the SID ($CFE4) where the game's landed
      // before it, and the cycles are the same either way
      const r = lockstep.run(Object.assign({ state: f, passes: +passes, seed: +seed, stopOnDiff: kind !== 'menu' }, o));
      console.log(f, count.n, 'stretches', r.res.ok ? 'ok' : r.res.diverged ? 'diverged' : r.res.diffs.length + ' passes differ');
    } catch (e) { console.log(f, 'threw', e.message.slice(0, 200)); }
  }
}
