'use strict';
// A script of the controls for a routine that waits on them, played the same on both sides of
// check.js: states of the keys held (the machine's codes, kit/c64/machine.js's KEY) and the
// joystick in port 2, each for a number of the game's scans of a key (KEY_SCAN, $85D2: a hook on the
// game's side, P.KEY_SCAN wrapped on the port's), then the states of loop over and over, so that the
// routine always comes to an end.
//   const S = script(); in setup: S.start(c.game, steps, loop); and check's hooks: S.hooks, onPort: S.onPort
const path = require('path');
const lib = require('./lib.js');
const { KEY } = require(path.join(lib.REPO, 'kit/c64/machine.js'));
// a key as the game's tables give it (its $DC00 bit in bits 0-2, its $DC01 bit in bits 3-5)
const fromGame = x => ((x & 7) << 3) | ((x >> 3) & 7);
const JOY = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
function script() {
  const S = { steps: [], loop: [], n: 0, game: null };
  const state = () => {
    let n = S.n;
    for (const s of S.steps) { if (n < s.len) return s; n -= s.len; }
    const all = S.loop.reduce((t, s) => t + s.len, 0);
    n %= all;
    for (const s of S.loop) { if (n < s.len) return s; n -= s.len; }
    return S.loop[0];
  };
  const apply = () => {
    const s = state();
    S.game.keys.clear();
    for (const k of s.keys || []) S.game.keys.add(k);
    S.game.joy = s.joy === undefined ? JOY.none : s.joy;
  };
  S.start = (game, steps, loop) => { S.game = game; S.steps = steps; S.loop = loop; S.n = 0; apply(); };
  S.tick = () => { apply(); S.n++; };
  S.hooks = { 0x85D2: () => { S.tick(); } };
  S.onPort = P => {
    S.n = 0; apply();
    const scan = P.KEY_SCAN;
    P.KEY_SCAN = r => { S.tick(); return scan(r); };
  };
  return S;
}
// a key typed: held long enough for WAIT_KEY's scan of all 64 to find it, then let go
const typed = (rnd, keys) => [{ len: 70 + rnd(40), keys }, { len: 1 + rnd(8), keys: [] }];
// the letters, figures and the rest a name takes, as the machine's keys
const nameKey = ch => KEY[ch === ' ' ? 'SPACE' : ch];
module.exports = { script, fromGame, JOY, KEY, typed, nameKey };
