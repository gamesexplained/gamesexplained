'use strict';
// The windows alone against the game's: as play calls them, then each menu's window and the
// conversation window at every stage of opening and closing.
const { check, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
for (const name of ['windows_pass', 'draw_windows', 'draw_window', 'draw_pointer', 'redraw_behind', 'open_message_step',
  'open_window_1_step', 'open_window_2_step', 'close_message_step', 'close_window_1_step', 'close_window_2_step', 'close_step',
  'set_bank6_word']) t({ name });
t({ name: 'copy_window', bank: 3 });
// every stage: a menu window or the conversation window from shut to full size, opening or
// closing as the game steps them (from where the menu or message starts it, or from full size),
// the pointer anywhere in the menu
const grow = (W, b) => {
  let a = (W[5] - W[0]) & 255; if (a >= b) a = b;
  W[3] = Math.max(0, W[3] - (a >> 1)); W[0] = (W[0] + a) & 255;
  a = (W[6] - W[1]) & 255; if (a >= 3) a = 2; W[1] = (W[1] + a) & 255;
  W[4] = Math.max(0, W[4] - 1);
};
const shrink = (W, b, c) => {
  if (!W[0]) return;
  W[0] = Math.max(0, W[0] - b); W[3] = (W[3] + c) & 255;
  let h = (W[1] - 1) & 255;
  if (h) { if (h >= 3) { h--; W[4]++; } W[1] = h; }
};
const passes = at('windows_pass');
t({ name: 'windows_pass', cases0: passes, cases: 400, setup: (c, rnd) => {
  const M = c.M, b3 = c.banks[3], three = (c.paging & 7) === 3;
  const get = k => (k < 0xC000 || three ? M[k] : b3[k - 0xC000]);
  const put = (k, v) => { if (k >= 0xC000) b3[k - 0xC000] = v; if (k < 0xC000 || three) M[k] = v; };
  const which = rnd(3), opening = rnd(2), steps = rnd(10);
  const rec = [0xC8A6, 0xC899, 0xAA7E][which];
  const W = [0, 1, 2, 3, 4, 5, 6].map(k => get(rec + k));
  const [b, cc] = which === 2 ? [2, 1] : [4, 2];
  if (opening && which === 0) { W[0] = 3; W[1] = 1; W[3] = 7; W[4] = 4; }
  else if (opening && which === 2) { W[0] = 1; W[1] = 1; W[3] = 5; W[4] = 4; }
  else { W[0] = W[5]; W[1] = W[6]; W[3] = 0; W[4] = 0; }
  if (opening && which === 1) while (W[0]) shrink(W, b, cc);
  for (let k = 0; k < steps; k++) if (opening) grow(W, which === 2 ? 2 : 4); else shrink(W, b, cc);
  for (let k = 0; k < 5; k++) put(rec + k, W[k]);
  if (which === 2) M[0x8D25] = opening ? 0x40 : [0x80, 0xC0, 0xC1][rnd(3)];
  else {
    M[0x8D22] = which ? (opening ? 0x08 : 0x10) : (opening ? 0x01 : 0x02);
    if (rnd(4) === 0) M[0x8D22] = which ? 0x18 : 0x03;
    M[0x8D23] = rnd(Math.max(1, W[5] * 8 - 16)); M[0x8D24] = rnd(Math.max(1, W[6] * 8 - 13));
  }
} });
process.exitCode = f ? 1 : 0;
