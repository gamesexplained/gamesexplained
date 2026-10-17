'use strict';
// The sound driver's entries on the port's core against the game's, from the moments as they are
// (a tune or an effect playing or not), with the SID's writes compared in order.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
t({ name: 'SID_PLAYER_TICK' });
t({ name: 'SID_PLAYER_INITIALIZE', setup: (M, c, rnd) => ({ a: rnd(17) }) });
t({ name: 'SID_INITIALIZE_IF_ENABLED', setup: (M, c, rnd) => { M[0x123A] = rnd(2); return { a: rnd(16) }; } });
t({ name: 'SID_CLEAR_REGISTERS' });
process.exitCode = f ? 1 : 0;
