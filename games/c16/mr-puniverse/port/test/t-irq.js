'use strict';
// The interrupt and the tune players, against the game's (lib.js). irq ends where the game's
// pulls the registers the KERNAL's way in pushed ($3179).
const { check } = require('./lib.js');
const { Z, T } = globalThis.PuniPort;

check({ name: 'irq', cases: 3000, stopAt: 0x3179, setup: (M, rnd) => {
  M[T.music_on] = rnd(3) ? 1 : rnd(256); M[T.player] = rnd(2);
  M[Z.tune_frame] = rnd(7); M[Z.tune_step] = rnd(0x80); M[Z.tune_volume] = rnd(9);
}, chip: (a, rnd) => (a === 0xFF0B ? [0xFA, 0x92, rnd(256)][rnd(3)] : a === 0xFF08 ? [0xFF, 0xFF, 0xFE, 0x7F, rnd(256)][rnd(5)] : rnd(256)) });
check({ name: 'flash_time_label', cases: 300, setup: (M, rnd) => { M[T.player] = rnd(2); } });
check({ name: 'music_tick', cases: 4000, setup: (M, rnd) => {
  M[Z.tune_frame] = rnd(4) ? rnd(7) : rnd(256); M[Z.tune_step] = rnd(256); M[Z.tune_volume] = rnd(10); M[Z.tune_voices] = rnd(256);
} });
check({ name: 'old_music_tick', cases: 3000, setup: (M, rnd) => {
  M[T.old_music_flag] = rnd(3) ? 0 : 1; M[Z.tune_frame] = rnd(4) ? 6 : rnd(8); M[Z.tune_step] = rnd(4) ? 0x5F : rnd(0x60);
} });
