'use strict';
// The panel and the shimmer alone against the game's, as play calls them; then every part of the
// panel changed (a new leader, new digits, the needs moved so that the bars grow and shrink across
// a cell, the light and the calendar's page at each pass, the month's last day), and the view
// moved about each shimmering rectangle with each pattern.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const NAMES = ['panel_pass', 'panel_portrait', 'panel_redraw', 'panel_digits', 'panel_light', 'panel_bars', 'bar_shrink',
  'bar_grow', 'bar_end', 'panel_calendar', 'calendar_day', 'calendar_digit', 'calendar_picture', 'shimmer_check',
  'shimmer_clip', 'shimmer'];
prefetch(NAMES, MIX);
for (const name of NAMES) t({ name });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
const pick = (rnd, l) => l[rnd(l.length)];
// every part of the panel due a change
const changes = (c, rnd) => {
  if (rnd(2)) c.M[0x8D0A] = rnd(4);
  if (rnd(3) === 0) c.M[0xF2AA] = rnd(4);
  for (let k = 0; k < 5; k++) if (rnd(4) === 0) c.M[0x8D04 + k] = rnd(10);
  if (rnd(3) === 0) c.M[0x8D18] = rnd(3);
  if (rnd(3) === 0) c.M[0x8D19] = rnd(3);
  for (let k = 0; k < 3; k++) if (rnd(2)) c.M[0xF2A1 + k] = (c.M[0xF2A1 + k] + rnd(5) - 2) & 0x3F;
  const ch = c.M[0x8D0A] & 3;
  for (let k = 0; k < 6; k++) if (rnd(3) === 0) put(c, 0xD5C3 + 8 * ch + k, pick(rnd, [0, 0xFF, 0x80, rnd(256)]));
  c.M[0xBF2F] = rnd(2) ? 0 : rnd(5);
  c.M[0xBF2E] = pick(rnd, [0xC7, 0xC5, 0x07, 0x05, 0xB8, rnd(256)]);
  c.M[0xBF29] = rnd(2) ? 0xFF : rnd(5);
  if (rnd(3) === 0) c.M[0x8D14] = pick(rnd, [0x1E, 0x1F, 0x20, 9, 10, 0x13, 1, rnd(32)]);
  if (rnd(3) === 0) c.M[0x8D15] = rnd(4);
};
const passes = at('panel_pass');
t({ name: 'panel_pass', cases0: passes, cases: 600, setup: changes });
// the bars stepped a pixel at a time across their cells
for (const name of ['bar_shrink', 'bar_grow']) {
  t({ name, cases0: passes, cases: 300, setup: (c, rnd) => {
    const b = rnd(3);
    c.regs.b = b; c.regs.h = 0xF2; c.regs.l = 0xA1 + b;
    const row = [0x6789, 0x67A9, 0x67C9][b], end = [0x16, 0x19, 0x1C][b], tile = [0xEDEB, 0xEE06, 0xEE21][b];
    if (rnd(4)) {
      for (let k = 1; k <= 8; k++) if (c.M[row + k] === end) c.M[row + k] = end - 1;
      c.M[row + 1 + rnd(8)] = end;
    }
    const v = pick(rnd, [0, 0x80, 0xC0, 0xFE, 0xFF, 0xF0, rnd(256)]);
    for (let k = 0; k < 8; k++) c.M[tile + k] = v;
  } });
}
for (const a of [0, 1, 2, 3]) t({ name: 'bar_end', cases0: passes, cases: 25, outs: ['hl', 'de', 'c', 'zf'], setup: c => { c.regs.a = a; } });
t({ name: 'panel_calendar', cases0: passes, cases: 400, outs: ['zf'], setup: (c, rnd) => {
  c.M[0xBF29] = pick(rnd, [0xFF, 0, 1, 2, 3, 4, rnd(256)]);
  c.M[0x8D14] = pick(rnd, [0x1E, 0x1F, 0x20, 9, 10, 0x13, 0x1D, 1, rnd(256)]);
  c.M[0x8D15] = pick(rnd, [0, 1, 2, 3, 0x20, rnd(256)]);
} });
t({ name: 'calendar_day', cases0: passes, cases: 100, setup: (c, rnd) => { c.M[0x8D14] = rnd(256); } });
t({ name: 'panel_light', cases0: passes, cases: 200, setup: (c, rnd) => {
  c.M[0xBF2F] = rnd(6); c.M[0xBF2E] = pick(rnd, [0xC7, 0xC5, 0x07, 0x05, 0x47, rnd(256)]);
} });
// the view about each shimmering rectangle: inside, on an edge, part out
t({ name: 'shimmer_check', cases0: at('shimmer_check'), cases: 900, setup: (c, rnd) => {
  const k = rnd(3), p = 0xF706 + 6 * k;
  c.M[0x8D1F] = c.M[p];
  const x0 = c.M[p + 2], x1 = c.M[p + 1], y0 = c.M[p + 4], y1 = c.M[p + 3];
  c.M[0x9633] = (x0 - 0x1E + rnd(x1 - x0 + 0x20)) & 255;
  c.M[0x9634] = (y0 - 0x14 + rnd(y1 - y0 + 0x16)) & 255;
  if (rnd(3) === 0) put(c, p + 5, rnd(3));
  if (rnd(4) === 0) c.M[0x8D1E] ^= 8;
} });
process.exitCode = f ? 1 : 0;
