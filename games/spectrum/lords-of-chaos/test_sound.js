'use strict';
// The page's sound effects (the block loc-sound, index.html) against the game's own play_sound
// ($C856), run on the kit's Z80 from the committed listing for each of the sixteen sounds: the
// T-state of every write to port $FE, counted from the routine's first instruction, and the
// routine's whole length, compared with the page's clicks.
//   node games/spectrum/lords-of-chaos/test_sound.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
const { LOCSound } = g.run('index.html', 'loc-sound', 'LOCSound');

let fails = 0, clicks = 0;
const base = memory(1);
for (let n = 0; n < 16; n++) {
  const M = base.slice();
  const bytes = M.slice(0xC7B0 + 8 * n, 0xC7B8 + 8 * n);
  M.set(bytes, 0xC830);
  const outs = [];
  let t0 = null;
  const cpu = call(M, 0xC856, {}, {
    io: { in: () => 0xFF, out: (port, v, c) => { if ((port & 1) === 0) outs.push(c.tstates - t0); } },
    hooks: { 0xC856: c => { if (t0 === null) t0 = c.tstates; return false; } },
  });
  const e = LOCSound.edges(bytes);
  clicks += outs.length;
  const bad = outs.findIndex((t, i) => t !== e.clicks[i]);
  if (outs.length !== e.clicks.length || bad >= 0 || cpu.tstates - t0 !== e.tstates) {
    fails++;
    console.log(`FAIL sound ${n}: game ${outs.length} clicks over ${cpu.tstates - t0} T-states, page ${e.clicks.length} over ${e.tstates}` +
                (bad >= 0 ? `; click ${bad} at ${outs[bad]} in the game, ${e.clicks[bad]} on the page` : ''));
  }
}
console.log(fails ? `FAIL: ${fails} of 16 sounds differ` : `ok - 16 sounds, ${clicks} clicks, each at the T-state the game's loop makes it`);
process.exit(fails ? 1 : 0);
