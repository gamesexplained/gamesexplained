'use strict';
// Writes port/solution.json: the Maps page's route as the Play tab plays it (page/solution.js). The
// game runs on the kit's C64 from its first instruction with the route's stick, as test_route.js
// plays it, and every read of the stick ($DC00) is kept, by the instruction that made it:
// - Tal's controls read it from the interrupt, every seventh frame of play: foot_control ($909C)
//   and suit_control ($9383). `controls` is the stick at each of their reads, in order, as a value
//   and the number of reads in a row that had it.
// - The main program's waits poll it for fire as often as they can: read_fire ($8417) and the
//   ending's wait for fire ($8B4C). `fire` is the stick by the clock: the cycle each new value was
//   first read, as the cycles since the one before, and the value.
// test_play.js makes it again beside the page and fails when the page's copy is not this.
//   node solution.js
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');
const OUT = path.resolve(__dirname, '../solution.json');

// The processor's pc as a read is made is the instruction after it: each control's LDA $DC00 is
// three bytes.
const CONTROLS = new Set([0x909C + 3, 0x9383 + 3]);

// Keeps the stick at every read the game makes of it on the kit's machine m, from now on. The
// machine's save() reads it too, and that is no read of the game's.
function hook(m) {
  let cur = m.joy, saving = false, last = null, at = 0;
  const controls = [], fire = [];
  Object.defineProperty(m, 'joy', {
    get() {
      if (saving) return cur;
      if (CONTROLS.has(m.cpu.pc)) {
        const n = controls.length;
        if (n && controls[n - 2] === cur) controls[n - 1]++; else controls.push(cur, 1);
      } else if (cur !== last) { fire.push(m.cpu.cycles - at, cur); at = m.cpu.cycles; last = cur; }
      return cur;
    },
    set(v) { cur = v; },
    configurable: true,
  });
  const save = m.save.bind(m);
  m.save = (...a) => { saving = true; try { return save(...a); } finally { saving = false; } };
  return { packed: () => ({ controls: controls.slice(), fire: fire.slice() }) };
}

// The route from power-on, the stick set before each frame as test_route.js sets it.
function record() {
  const joy = lib.joystick(), m = lib.boot(), rec = hook(m);
  for (let f = 0; f < joy.length; f++) { m.joy = 0x1F & ~joy[f]; m.runFrames(1); }
  return rec.packed();
}

module.exports = { hook, record, CONTROLS };
if (require.main === module) {
  const s = record();
  fs.writeFileSync(OUT, JSON.stringify(s) + '\n');
  let reads = 0;
  for (let i = 1; i < s.controls.length; i += 2) reads += s.controls[i];
  console.log('wrote solution.json: ' + reads + ' reads of the controls, ' + s.fire.length / 2 + ' changes of the stick by the clock');
}
