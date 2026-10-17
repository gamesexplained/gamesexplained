'use strict';
// The interrupt, the clock and the sound driver alone against the game's: as play calls them, then
// with every tune section and the sound effects forced, the step and frame counters anywhere in
// their ranges, effect numbers on the channels, and the clock at each change of hour.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 300, outs: [] }, o)).fails ? 1 : 0; };
t({ name: 'interrupt' });
t({ name: 'clock' });
t({ name: 'clock', cases: 600, setup: (c, rnd) => {
  const h = [0x00, 0x0B, 0x0C, 0x27, 0x28, 0x2F][rnd(6)];
  c.M[0xBF2A] = rnd(2) ? 0xFF : rnd(256); c.M[0xBF2B] = h;
  c.M[0xBF2C] = rnd(2) ? h >> 1 : rnd(24);
} });
t({ name: 'snd_frame' });
t({ name: 'snd_frame', cases: 1500, setup: (c, rnd) => {
  const M = c.M;
  const tune = [2, 3, 4, 4, 4, 5, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26][rnd(19)];
  M[0x7115] = tune;
  if (rnd(4) === 0) M[0x704E] = [0, 2, 4, 14, 23][rnd(5)];
  if (rnd(8) === 0) M[0x7002] = [4, 14][rnd(2)];
  M[0x798F] = rnd(10); M[0x7990] = rnd(2) ? rnd(0x20) : rnd(0xC0); M[0x7991] = 0;
  M[0x7992] = rnd(3) ? M[0x7992] : rnd(8);
  for (const ch of [0x7003, 0x701C, 0x7035]) {
    if (rnd(2)) M[ch + 3] = rnd(20);
    if (rnd(4) === 0) { M[ch] = 0xFF; M[ch + 1] = 0xFF; M[ch + 2] = rnd(20); }
    if (rnd(3) === 0) { M[ch + 0x0E] = rnd(40); M[ch + 0x0F] = 0; }
    if (rnd(3) === 0) { M[ch + 0x16] = 1; M[ch + 0x15] = rnd(16); }
  }
} });
process.exitCode = f ? 1 : 0;
