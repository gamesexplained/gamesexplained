'use strict';
// The view's picture alone against the game's: the sky and floor (with the Wilderness's scenery
// and the lightning's streak), the copy to the bitmap, the view's colours, the reticle and the
// viewport's steps, from each moment as it stands and with the pitch, yaw and colours drawn.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const sky = (M, rnd) => {
  if (rnd(2)) { M[0x2410] = rnd(4) ? rnd(0x48) : rnd(256); M[0x2411] = rnd(0x48); }
  if (rnd(3) === 0) M[0x2464] = rnd(4) ? rnd(256) : [0, 0x10, 0x01][rnd(3)];
  if (rnd(3) === 0) M[0x2459] = 1;
  if (rnd(4) === 0) M[0x2429] = 1;
};
t({ name: 'DRAW_SKY_FLOOR_BACKGROUND', outs: ['a'], setup: (M, c, rnd) => { sky(M, rnd); } });
t({ name: 'BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { M[0x105E] = rnd(3) ? 0 : rnd(16); } });
t({ name: 'UPDATE_VIEWPORT_COLOR_CELLS', setup: (M, c, rnd) => { for (let i = 0; i < 4; i++) M[0x2435 + i] = rnd(256); } });
t({ name: 'XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT' });
t({ name: 'APPLY_VERTICAL_BITMAP_TRANSITION_STEP', setup: (M, c, rnd) => { M[0x82BD] = rnd(0x79); return { x: rnd(4) ? rnd(0x79) : [0, 0x78, 0x10, 0x14, 0x15][rnd(5)] }; } });
process.exitCode = f ? 1 : 0;
