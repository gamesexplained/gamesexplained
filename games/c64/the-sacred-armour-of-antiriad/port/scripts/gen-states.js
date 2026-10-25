'use strict';
// The moments of play the port's tests start from, saved to work/states (never committed), each
// stopped where a pass of the main loop starts (lib.PASS, main_loop): route-NNNNN, the Maps page's
// route replayed from the game's first instruction, a moment every 300 frames from the game's
// start, each on a copy of the machine so that the replay goes on as recorded. A state keeps the
// route's frame it was saved at, for the route's joystick from there.
//   node port/scripts/gen-states.js
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const out = [];
function keep(m, name, frame) {
  const c = lib.restore(m.save());
  lib.player(c).stopAt(lib.PASS, 600);
  lib.save(c, name, frame);
  out.push(name);
}
fs.mkdirSync(lib.STATES, { recursive: true });
for (const f of lib.states()) fs.unlinkSync(path.join(lib.STATES, f));
const joy = lib.joystick(), m = lib.boot();
for (let f = 0; f < joy.length; f++) {
  m.joy = 0x1F & ~joy[f];
  m.runFrames(1);
  if (f >= 700 && f % 300 === 0) keep(m, 'route-' + String(f).padStart(5, '0'), f + 1);
}
console.log(out.length + ' moments in ' + lib.STATES);
