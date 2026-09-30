'use strict';
// Moments of play for the port's tests: for each level, the game run from its hand-over on the
// kit's C64, taken to the level as finishing each level before it does, then played with random
// joystick input; a state saved at the start of a main-loop pass every so often. The states hold
// the game's memory, so they stay in the gitignored work/states.
// node gen-states.js [seed] [states per level]
const fs = require('fs'), path = require('path');
const { boot } = require('../machine.js'); const { toLevel } = require('../jump.js');
const OUT = path.join(__dirname, '../../work/states');
fs.mkdirSync(OUT, { recursive: true });
let seed = +(process.argv[2] || 1);
const per = +(process.argv[3] || 40);
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
// up, down, left, right, fire and the diagonals, fire with a direction, and nothing
const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24, 4, 8, 4, 8];
for (let n = 0; n < 10; n++) {
  const m = boot();
  m.runUntilPass(() => true);
  toLevel(m, n);
  let k = 0, next = m.frames + 30;
  while (k < per && m.frames < 20000) {
    m.joy = 0x1F & ~DIRS[Math.floor(rnd() * DIRS.length)];
    const hold = 10 + Math.floor(rnd() * 60), f0 = m.frames;
    m.runUntilPass(mm => mm.frames >= f0 + hold, 2000);
    if (m.frames >= next) {
      fs.writeFileSync(path.join(OUT, `L${n}_${String(k).padStart(2, '0')}.json`), JSON.stringify(m.save()));
      k++; next = m.frames + 40 + Math.floor(rnd() * 200);
    }
  }
  console.log('level', n, 'states', k, 'frames', m.frames, 'passes', m.passes,
    'record', (m.ram[0x11] | m.ram[0x12] << 8).toString(16));
}
