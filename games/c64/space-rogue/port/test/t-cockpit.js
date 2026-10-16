'use strict';
// The cockpit's instruments and the TAC alone against the game's (check.js): the readouts with the
// speed, hit points, weapon and damage at random, the lamps with the ships' minds shuffled, and
// both of the TAC's pages for every kind of target, in either buffer, text mirrored or not.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const pick = (rnd, a) => a[rnd(a.length)];
const ships = M => { const s = []; for (let i = 1; i < 6; i++) if (M[0x05F9 + i]) s.push(i); return s; };
const inUse = M => { const s = []; for (let i = 0; i < 0x14; i++) if (M[0x05F9 + i]) s.push(i); return s; };
// the computer ships' targets, tactics, damage and hit points shuffled
const minds = (M, rnd) => {
  const s = inUse(M).concat([0xFF]);
  for (const i of ships(M)) {
    if (rnd(2)) M[0x0445 + i] = pick(rnd, s);
    if (rnd(3) === 0) M[0x043F + i] = pick(rnd, [rnd(10), rnd(256)]);
    if (rnd(3) === 0) M[0x0409 + i] = rnd(64);
    if (rnd(3) === 0) { M[0x051D + 2 * i] = rnd(256); M[0x051E + 2 * i] = rnd(3); }
  }
};
// text mirrored or not, reversed seldom, drawn into either buffer
const text = (M, rnd) => {
  if (rnd(2)) { M[0x0D28] = 1; M[0xA137] = M[0xA13F] = 0x81; M[0xA138] = 0x82; M[0xA140] = 0x1B; }
  else { M[0x0D28] = 0; M[0xA137] = M[0xA138] = M[0xA13F] = M[0xA140] = 0xEA; }
  M[0x0D25] = rnd(6) ? 0 : 0xFF;
  M[0x3A] = rnd(2) ? 0x80 : 0;
  M[0x0D26] = 0xFF;
};
// the player's speed, hit points, damage and weapons
const player = (M, rnd) => {
  M[0x0D02] = rnd(2);
  M[0x0415] = pick(rnd, [0, 1, 0x63, 0x64, 0xF6, rnd(256)]);
  if (rnd(2)) for (let k = 0; k < 9; k++) M[0x0545 + k] = rnd(3) ? (rnd(2) ? 0 : 0xFF) : rnd(256);
  M[0x051D] = rnd(256); M[0x051E] = pick(rnd, [0, 0, 1, 2, 0xFF, rnd(256)]);
  M[0x0409] = rnd(2) ? 0 : rnd(64);
  M[0x0CFE] = rnd(4); M[0x0CFF] = rnd(2) ? 0xFF : 0; M[0x0D00] = rnd(12);
  for (let k = 1; k < 4; k++) M[0x0731 + k] = rnd(3) ? rnd(4) : rnd(256);
  M[0x0836] = rnd(2) ? 0 : rnd(9);
};
const target = (M, rnd) => { M[0x0445] = pick(rnd, inUse(M).concat([0xFF, 0xFF])); };
// a TAC line's slot (the target, or the player with none) and its type
const line = (M, rnd, only) => {
  const y = pick(rnd, (only || inUse)(M));
  M[0x8A] = y; M[0x8B] = rnd(4) ? M[0x060D + y] : 0;
  M[0x50] = pick(rnd, [0x2E, 0x24, 0x1B, 0x12]); M[0x4F] = rnd(40);
};

t({ name: 'window_view', outs: ['a', 'x', 'y'] });
t({ name: 'clear_tac', outs: ['a', 'x', 'y'] });
t({ name: 'attack_lamp', setup: (M, c, rnd) => { minds(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'threat_lamps', setup: (M, c, rnd) => { minds(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'threat_colour', setup: (M, c, rnd) => ({ x: rnd(256) }), outs: ['a', 'x'] });
t({ name: 'draw_speed', cases: 800, setup: (M, c, rnd) => { text(M, rnd); player(M, rnd); } });
t({ name: 'draw_armour_bar', cases: 800, setup: (M, c, rnd) => { player(M, rnd); } });
t({ name: 'draw_weapon', cases: 1500, setup: (M, c, rnd) => { text(M, rnd); player(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'print_ship_label', setup: (M, c, rnd) => { text(M, rnd); M[0x4F] = rnd(38); M[0x50] = rnd(200); return { a: rnd(6) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_name', setup: (M, c, rnd) => { text(M, rnd); minds(M, rnd); line(M, rnd); }, outs: ['a', 'x', 'y'] });
// (called for ships only: the labels of other slots run into other data, and may wait)
t({ name: 'tac_label', setup: (M, c, rnd) => { text(M, rnd); line(M, rnd, M => [0].concat(ships(M))); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_range', cases: 1000, setup: (M, c, rnd) => { text(M, rnd); line(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_tactic', setup: (M, c, rnd) => { text(M, rnd); minds(M, rnd); line(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_armour', setup: (M, c, rnd) => { text(M, rnd); minds(M, rnd); line(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_systems', setup: (M, c, rnd) => { text(M, rnd); minds(M, rnd); line(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_data', cases: 1000, setup: (M, c, rnd) => { text(M, rnd); minds(M, rnd); target(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 'tac_picture', cases: 800, setup: (M, c, rnd) => { minds(M, rnd); target(M, rnd); }, maxSteps: 4e7, outs: ['a', 'x', 'y'] });
t({ name: 'update_cockpit', cases: 800, setup: (M, c, rnd) => {
  text(M, rnd); minds(M, rnd); player(M, rnd); target(M, rnd);
  M[0x7C] = rnd(2) ? 0xFF : 0;
}, maxSteps: 4e7, outs: ['a', 'x', 'y'] });

process.exitCode = f ? 1 : 0;
