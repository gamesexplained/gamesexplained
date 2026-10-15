#!/usr/bin/env node
// Moments of play for the port's lockstep, saved at the start of a pass of the main loop that runs
// them, from scripted play on the runner (port/test/lib.js). They hold the game's memory, so they go
// to work/states/ and are never committed.
//   node games/c64/space-rogue/port/scripts/gen-states.js
const lib = require('../test/lib.js');

let seed = 7;
const rnd = (n) => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };

// A new game, at the cockpit; then flying with keys held and the stick moved at random, a moment
// every ten seconds or so.
const S = lib.runner();
lib.newGame(S);
S.stopAt(lib.FLIGHT_PASS);
S.save('flight-00-start', lib.FLIGHT_PASS);
const KEYS = ['A', 'D', 'W', 'X', 'Z', 'C', 'S', '+', '+', 'T', 'V', 'V', 'V', 'SPACE', 'SPACE', 'R', 'I'];
for (let n = 1; n <= 8; n++) {
  for (let i = 0; i < 20; i++) {
    const r = rnd(4);
    if (r === 0) S.key(KEYS[rnd(KEYS.length)], 0.1 + rnd(5) / 10);
    else if (r === 1) { S.m.joy = 0x1F & ~[1, 2, 4, 8, 16, 5, 9][rnd(7)]; S.run(0.2 + rnd(5) / 10); S.m.joy = 0x1F; }
    else S.run(0.3);
  }
  S.stopAt(lib.FLIGHT_PASS);
  const s = S.save('flight-' + String(n).padStart(2, '0'), lib.FLIGHT_PASS);
  const ram = Buffer.from(s.machine.ram, 'base64');
  const types = [];
  for (let k = 0; k < 20; k++) types.push(ram[0x0403 + k]);
  console.log('flight-' + n, 'frame', S.R.frame, 'fixes', S.fixes.length, 'slot types', types.join(' '));
}
console.log(lib.states().join('\n'));
