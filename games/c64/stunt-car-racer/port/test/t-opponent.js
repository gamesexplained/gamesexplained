'use strict';
// The crack, the controls and the opponent alone against the game's ($1B88-$2457), on moments of
// play with the opponent's state stirred (the moments are practice, where it does not race).
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1000, outs: [] }, o)).fails ? 1 : 0; };
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) t(Object.assign({ name }, o)); };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256), rnd(256)][rnd(12)];
const small = rnd => [0, 1, 0xFF, 0xFE, 2, 3, 0xFD, rnd(256)][rnd(8)];
const stir = (M, rnd, from, to, k = 3) => { for (let a = from; a <= to; a++) if (!rnd(k)) M[a] = rnd(2) ? byte(rnd) : small(rnd); };
const opp = (M, c, rnd) => {
  for (const a of [0xC37C, 0xC9, 0x6A, 0x39, 0x3A, 0xC36A, 0xB0, 0x2B, 0xB7, 0xB8, 0xC357, 0xE0, 0xC369, 0x77, 0x51, 0xC308, 0xB2, 0xC30F, 0x2F, 0x0E])
    if (!rnd(3)) M[a] = byte(rnd);
  if (!rnd(2)) M[0x3A] = 0;
  if (!rnd(2)) M[0x39] = rnd(0x50);
  if (!rnd(2)) M[0xC773] = rnd(12);
  if (!rnd(3)) M[0xAEE0 + M[0xC773]] = rnd(256);
  if (!rnd(2)) M[0xC375] = rnd(M[0xC764]);
  stir(M, rnd, 0x07C4, 0x07F3, 3);
  stir(M, rnd, 0x017F, 0x0184, 3);
  stir(M, rnd, 0xD6, 0xD7, 2);
  stir(M, rnd, 0xC3B6, 0xC3B7, 2);
  stir(M, rnd, 0xC3C3, 0xC3C7, 3);
};
T('CRACK', { setup: (M, c, rnd) => {
  M[0x25] = rnd(0x80); M[0xC3CB] = rnd(3) ? (M[0x25] + rnd(6)) & 255 : byte(rnd); M[0x1C15] = 3 + rnd(3);
  if (!rnd(4)) M[0x6C] = byte(rnd);
} });
T('SET_DAMAGE', { setup: (M, c, rnd) => { M[0xC3CB] = byte(rnd); }, outs: ['y'] });
T('CMD_CRANE_CHAINS', { cases: 200 });
T('CLEAR_PANEL', { cases: 50 });
T('MENU_TITLE', { cases: 50 });
T('CONTROLS', { setup: (M, c, rnd) => {
  c.game.joy = 0x1F ^ rnd(32);
  for (const a of [0x6A, 0x2F, 0x0E, 0xC39B, 0x0159]) if (!rnd(3)) M[a] = byte(rnd);
} });
T('HORIZON', { cases: 300, setup: (M, c, rnd) => { M[0x33] = byte(rnd); M[0x69] = small(rnd); M[0x0124] = byte(rnd); } });
T('CMD_DRAWBRIDGE', { cases: 300, setup: (M, c, rnd) => { if (!rnd(2)) M[0xC77D] = 5; } });
T('OPPONENT_LINE', { setup: opp });
T('LINE_ROUND', { setup: opp }); T('LINE_PASS', { setup: opp }); T('LINE_HOLD', { setup: opp, outs: ['a'] });
T('PIECE_FROM_HERE', { setup: (M, c, rnd) => ({ x: rnd(3) ? M[0x044E + rnd(M[0xC764])] : rnd(256) }), outs: ['a', 'x'] });
T('OPPONENT_MOVE', { setup: opp });
T('OPP_DROP', { setup: opp });
T('OPP_PICK', { setup: (M, c, rnd) => { opp(M, c, rnd); M[0x31A1] = rnd(2); M[0xC77F] = rnd(2); M[0xC71A] = rnd(2); M[0xC77D] = rnd(8); } });
T('OPP_SPEED', { setup: opp, outs: ['a'] });
T('OPP_ENGINE', { setup: opp, outs: ['a', 'y'] });
T('OPP_GRIP', { setup: opp });
T('OPP_BUMP', { setup: opp });
T('OPP_PUSH', { setup: opp });
T('OPP_WHEELS', { setup: opp });
T('OPP_GAP', { setup: (M, c, rnd) => { opp(M, c, rnd); return { x: rnd(3), y: rnd(3) }; }, outs: ['a', 'x', 'y'] });
T('OPP_SPREAD', { setup: (M, c, rnd) => { opp(M, c, rnd); M[0x51] = byte(rnd); return { a: rnd(3) ? 1 : 0, x: rnd(2), y: 1 + rnd(2) }; } });
T('OPP_AVERAGE', { setup: (M, c, rnd) => { opp(M, c, rnd); return { x: rnd(3), y: rnd(3) }; }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
