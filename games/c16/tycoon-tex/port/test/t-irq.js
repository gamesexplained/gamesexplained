'use strict';
// The interrupt, its bands and what they call, the controls, the random numbers and the sounds,
// against the game's (lib.js).
const { check } = require('./lib.js');
const ctl = (M, rnd) => { for (let a = 0x07; a <= 0x0B; a++) M[a] = rnd(256); };
check({ name: 'irq', cases: 3000, stopAt: 0x18E5, setup: (M, rnd) => {
  M[0x6B] = rnd(5); M[0x38] = rnd(4) ? 0 : 1; M[0x182C] = rnd(5) ? 0 : 1; M[0x182A] = rnd(2); M[0x1828] = rnd(2);
  M[0x7B] = rnd(5) ? 0 : 1; M[0x7A] = rnd(2); M[0xD9] = rnd(6) ? 0 : 1; M[0x67] = 1 + rnd(4);
} });
for (const name of ['irq_frame', 'irq_skyline', 'irq_pipe', 'irq_scroller']) {
  check({ name, cases: 1500, stopAt: 0x18DD, setup: (M, rnd) => {
    M[0x38] = rnd(3) ? 0 : 1; M[0x182C] = rnd(5) ? 0 : 1; M[0x182A] = rnd(2); M[0x1828] = rnd(2); M[0x67] = 1 + rnd(4);
    M[0xD9] = rnd(6) ? 0 : 1; M[0xDA] = rnd(2); M[0xDB] = rnd(2); M[0xDD] = rnd(22);
  } });
}
check({ name: 'irq_field', cases: 3000, stopAt: 0x18DD, setup: (M, rnd) => {
  M[0x38] = rnd(5) ? 0 : 1; M[0x7B] = rnd(3) ? 0 : 1; M[0x7A] = rnd(2); M[0x7E] = rnd(8) ? 0 : 1;
  M[0x7C] = 1 + rnd(2); M[0x7D] = [1, 2, 0x18][rnd(3)]; M[0x80] = rnd(4);
  M[0x249D] = rnd(4) ? 0xCE : 0xAD; M[0x24A0] = rnd(4) ? 0xC6 : 0xA5;
  return { c: rnd(2) };
} });
check({ name: 'install_irq', setup: (M, rnd) => { M[0x0314] = rnd(2) ? 0xA9 : rnd(256); } });
check({ name: 'read_controls', cases: 2000, setup: (M, rnd) => { M[0x182C] = rnd(4) ? 0 : 1; M[0x182A] = rnd(3) ? 1 : 0; ctl(M, rnd); },
  chip: (a, rnd) => (a === 0xFF08 ? [0xFF, 0x7F, 0xBF, 0xFE, 0xFD, 0xFB, 0xF7, rnd(256)][rnd(8)] : rnd(256)) });
check({ name: 'read_keys', setup: ctl });
check({ name: 'test_key', setup: (M, rnd) => ({ a: 1 << rnd(8), y: rnd(256) }), outs: ['c'] });
check({ name: 'demo_controls', cases: 2000, setup: (M, rnd) => {
  M[0x8C] = rnd(2); M[0x15] = 0xA9 + rnd(0x14); M[0x16] = 0x0E; for (let a = 0x0D; a <= 0x10; a++) M[a] = rnd(256);
  M[(0x0E00 | M[0x15]) + 0xCB] = [0xD5, 0xD6, 0xD9, 0xDC, 0xDD, rnd(256)][rnd(6)];
} });
check({ name: 'check_play_keys', cases: 2000, setup: (M, rnd) => { M[0x38] = rnd(4) ? 0 : 1; M[0x7B] = rnd(4) ? 0 : 1; M[0xD9] = rnd(2); },
  chip: (a, rnd) => (a === 0xFF08 ? [0xFF, 0xEF, 0xDF, rnd(256)][rnd(4)] : rnd(256)) });
check({ name: 'menu_keys', cases: 2000, setup: (M, rnd) => { M[0x182A] = rnd(2); },
  chip: (a, rnd) => (a === 0xFF08 ? [0xFF, 0xFB, 0xDF, rnd(256)][rnd(4)] : rnd(256)) });
check({ name: 'seed_random' });
check({ name: 'random', cases: 3000, setup: (M, rnd) => { for (let a = 0x0D; a <= 0x10; a++) M[a] = rnd(256); return { c: rnd(2) }; },
  outs: ['a', 'x', 'y', 'c'] });
check({ name: 'random_byte', outs: ['a', 'x'] });
const sounds = (M, rnd) => {
  M[0x1828] = rnd(4) ? 1 : 0; M[0xDA] = rnd(2); M[0xDB] = rnd(2); M[0xDD] = rnd(3) ? 1 + rnd(21) : rnd(256); M[0xDC] = rnd(4);
};
for (const name of ['tick_sounds', 'shot_sound', 'tick_shot_sound', 'hit_sound', 'tick_hit_sound']) check({ name, cases: 2000, setup: sounds });
