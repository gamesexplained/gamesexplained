'use strict';
// The area loader alone against the game's: as play calls it, then every area loaded from the
// moments of play, with the other set's BC anything.
const { check, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
t({ name: 'load_area' });
t({ name: 'translate_cell', outs: ['a'] });
t({ name: 'restore_screen_x' });
const base = at('follow_leader');
t({ name: 'load_area', cases0: base, cases: 160, setup: (c, rnd) => {
  c.M[0x8D1F] = rnd(16);
  c.regs.bc_ = rnd(4) ? rnd(0x10000) : rnd(256);
} });
process.exitCode = f ? 1 : 0;
