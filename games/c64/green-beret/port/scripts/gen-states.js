'use strict';
// The moments of play the port's tests start from, saved to work/states (never committed), each
// stopped where a pass of the main loop starts (lib.PASS, main_loop): play-NNNNN, the test player
// (lib.bot) from the game's start-up, a moment every 500 frames once play has begun, through the
// four stages and their fights. While it plays here the hero cannot be killed (an RTS at
// player_killed, $0C21, and at the mine's explosion, $3C76, the game's own bytes put back in every
// moment saved) and his lives are kept at 3 or more, so that one run reaches every stage. A moment
// keeps the frame it was saved at (frame), which seeds the player that drives it in the lockstep.
//   node port/scripts/gen-states.js [frames, default 40000] [seed, default 7]
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const FRAMES = +(process.argv[2] || 40000), SEED = +(process.argv[3] || 7);
const GOD = [0x0C21, 0x3C76];
fs.mkdirSync(lib.STATES, { recursive: true });
for (const f of lib.states('play-')) fs.unlinkSync(path.join(lib.STATES, f));
const m = lib.boot(), play = lib.bot(SEED);
const orig = GOD.map(a => m.ram[a]);
for (const a of GOD) m.ram[a] = 0x60;
let n = 0, last = '';
function keep(f) {
  const c = lib.restore(m.save());
  c.onPass = () => true;
  if (!c.runUntilPass(() => true, 600)) return;
  GOD.forEach((a, i) => { c.ram[a] = orig[i]; });
  lib.save(c, 'play-' + String(f).padStart(5, '0'), { frame: f, seed: SEED });
  n++;
}
for (let f = 0; f < FRAMES; f++) {
  if (m.ram[0x03B3] < 3) m.ram[0x03B3] = 3;
  play(m);
  m.runFrames(1);
  const now = 'stage ' + m.ram[0x03B1] + (m.ram[0x024C] ? ', the fight' : '');
  if (now !== last) { console.log('frame ' + f + ': ' + now); last = now; }
  if (f >= 600 && f % 500 === 0 && m.passes) keep(f);
}
console.log(n + ' moments in ' + lib.STATES);
