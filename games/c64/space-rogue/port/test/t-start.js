'use strict';
// SR's start-up, INIT and the death screen alone against the game's (check.js), on the moments of
// flight: a new game with a name at $BF00 and the saved game on the disk, and every cause of
// death. The death screen's wait for a key is the game's RTS on both sides, as no interrupt fills
// the keyboard buffer in a check, and its jump to the title ($EA13) an RTS in the game's code and
// the end of the port's routine. Its last swap of the zero page brings back $90-$C4 from
// $0190-$01C4, where the game's calls have pushed return addresses since the swap before: the
// port keeps no stack, so those bytes are left out.
const { check } = require('./check.js');
let f = 0;
// node t-start.js [names]: those checks only
const ONLY = process.argv.slice(2);
const t = o => {
  if (ONLY.length && !ONLY.includes(o.name)) return;
  f += check(Object.assign({ cases: 40, outs: [], maxSteps: 4e7 }, o)).fails ? 1 : 0;
};
const pick = (rnd, a) => a[rnd(a.length)];
// a name typed at the title, letters and spaces
const name = (M, rnd) => { for (let i = 0; i < 12; i++) M[0xBF00 + i] = rnd(4) ? 0x41 + rnd(26) : 0x20; };

t({ name: 'clear_bitmap_c000', cases: 200, outs: ['a', 'x', 'y'] });
t({ name: 'load_resident' });
t({ name: 'init_game', setup: (M, c, rnd) => { name(M, rnd); return { c: rnd(2) }; } });
t({ name: 'sr_setup', setup: (M, c, rnd) => { name(M, rnd); return { c: rnd(2) }; } });
t({ name: 'game_over', cases: 120, ignore: [[0x90, 0xC4]], setup: (M, c, rnd) => {
  M[0x0835] = pick(rnd, [0x09, 0x0A, 0x0B, 0x0D, 0x0E, 0x0F, 0x15, 0x1A, 0x1C, 0x1D, rnd(0x23), 0x80 | rnd(128)]);
  M[0xA431] = 0x60; M[0xEA13] = 0x60;
}, onPort: P => {
  P.wait_key = function* (r) { return r; };
  const g = P.game_over;
  P.game_over = function* (r) {
    try { return yield* g.call(this, r); } catch (e) { if (e instanceof P.Goto && e.to === 0x2000) return {}; throw e; }
  };
} });
process.exitCode = f ? 1 : 0;
