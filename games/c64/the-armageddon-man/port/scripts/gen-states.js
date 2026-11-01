'use strict';
// Moments of play for the port's tests, saved in work/states (never committed): the game from the
// hand-over, F3 for the joystick on the options panel, then the test player (lib.bot) for each seed,
// a moment saved at the start of a pass every `every` frames.
//   node port/scripts/gen-states.js [frames, default 40000] [every, default 1500] [seeds, default 1,2,3]
const lib = require('../test/lib.js');
const frames = +(process.argv[2] || 40000), every = +(process.argv[3] || 1500);
const seeds = (process.argv[4] || '1,2,3').split(',').map(Number);
for (const seed of seeds) {
  const m = lib.boot();
  lib.stopAt(m, 0x7DAB);
  m.press(lib.KEY.F3); m.runFrames(3); m.release(lib.KEY.F3);
  const play = lib.bot(seed);
  let want = false, last = m.frames, saved = 0;
  m.onPass = () => want;
  const f0 = m.frames;
  while (m.frames - f0 < frames) {
    play(m);
    if (m.runCycles(lib.FRAME) === false) {
      lib.save(m, `s${seed}-f${String(m.frames).padStart(6, '0')}`, { seed, joy: m.joy });
      saved++; want = false; last = m.frames;
    }
    if (!want && m.frames - last >= every) want = true;
  }
  console.log('seed', seed, 'saved', saved, 'week', m.ram[0x5B51], 'passes', m.passes);
}
