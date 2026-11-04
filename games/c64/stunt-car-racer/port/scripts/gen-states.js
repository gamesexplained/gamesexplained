'use strict';
// The moments of play the port's tests start from, saved to work/states (never committed), each
// stopped where a pass of the race's main loop starts (lib.PASS):
// - play-00: Little Ramp in practice, the car moving (work/play.vsf);
// - drive-NN: a drive from there, the stick held a random way every few frames (mostly up, with
//   steering, boost and brakes), saved every 300 frames.
//   node port/scripts/gen-states.js
const lib = require('../test/lib.js');

let seed = 7;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
// the stick's bits, active low: 1 up, 2 down, 4 left, 8 right, 16 fire
const MOVES = [1, 1, 1, 1 | 4, 1 | 8, 1 | 16, 2, 2 | 16, 4, 8, 0, 1 | 4 | 16, 1 | 8 | 16];

function drive(m, frames) {
  for (let f = 0; f < frames; f += 10) {
    m.joy = 0x1F & ~MOVES[rnd(MOVES.length)];
    m.runFrames(10);
  }
  m.joy = 0x1F;
}
const atPass = m => lib.player(m).stopAt(lib.PASS);
const out = [];
const keep = (m, name) => { atPass(m); lib.save(m, name); out.push(name); };

const m0 = lib.machine('play');
keep(m0, 'play-00');
{
  const m = lib.Machine.restore(m0.save());
  lib.player(m);
  for (let i = 1; i <= 12; i++) { drive(m, 300); keep(m, 'drive-' + String(i).padStart(2, '0')); }
}
console.log('saved ' + out.length + ' moments: ' + out.join(' '));
