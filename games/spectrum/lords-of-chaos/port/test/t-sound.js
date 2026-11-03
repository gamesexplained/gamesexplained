'use strict';
// The sounds and the key repeat (g-sound.js) checked against the game's own: the writes to the
// speaker and the T-states between them, for every sound and for sound steps set at random.
const { check, prefetch } = require('./check.js');
prefetch(['set_sound', 'play_sound', 'key_repeat'], { per: 4 });
let fails = 0;
const from = 'set_sound';
fails += check({ name: 'set_sound', cases: 100 }).fails;
fails += check({ name: 'play_sound', timed: true, cases: 100 }).fails;
for (let n = 0; n < 16; n++)
  fails += check({ name: 'start_sound', from, timed: true, setup: (c, rnd) => { c.regs.a = n; c.M[0xD066] = rnd(4) ? 0 : 1; }, cases: 4, seed: n + 1 }).fails;
fails += check({ name: 'play_sound', from, timed: true, setup: (c, rnd) => { for (let i = 0; i < 8; i++) c.M[0xC830 + i] = rnd(256); c.M[0xC830] = 1 + rnd(3); c.M[0xC831] = 1 + rnd(3); }, cases: 60, seed: 30 }).fails;
// the key repeat: the controls held, let go after a while, or never
fails += check({ name: 'key_repeat', cases: 100 }).fails;
for (const name of ['key_repeat', 'key_repeat_slow'])
  fails += check({ name, from: 'key_repeat', setup: (c, rnd) => { c.M[0x5B1E] = rnd(2); c.M[0x5B13] = rnd(3) ? 0xFE : 0xFF; c.keys = rnd(2) ? [0x38] : []; }, cases: 60, seed: 40 }).fails;
process.exitCode = fails ? 1 : 0;
