'use strict';
// The leader's control, the message queue, the view's colour, the copies between banks and the
// lines alone against the game's, as play calls them; then the leader's control with every
// direction, with and without SPACE, and the light changing.
const { check, entries, prefetch } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, o)).fails ? 1 : 0; };
const L = labels();
const at = name => entries(L.byName.get(name).a, -1, {});
for (const name of ['leader_input', 'queue_message', 'day_night_colour', 'colour_view', 'copy_needs', 'copy_from_bank1',
  'copy_from_bank6', 'line_start', 'line_up', 'line_down', 'line_right', 'line_left', 'line_up_right']) t({ name });
for (const a of [0x8792, 0x879F, 0x87AE, 0x87BB]) t({ entry: a });
t({ name: 'leader_input', cases0: at('leader_input'), cases: 300, setup: (c, rnd) => {
  c.joy = [0, 1, 2, 4, 8, 5, 6, 9, 10, 16, 17][rnd(11)];
  c.keys = rnd(3) ? [] : [0x38];
  c.M[0x8D1B] = [0, 0x3F, 0x40, 0x41, 0xFF][rnd(5)];
} });
t({ name: 'day_night_colour', cases0: at('day_night_colour'), cases: 100, setup: (c, rnd) => {
  c.M[0xBF2E] = rnd(256);
} });
// with the player firing, opening menus and standing about: shots drawn as lines, messages queued
const MIX = { play: 'mix', most: 148, passes: 80 };
prefetch(['queue_message', 'copy_from_bank1', 'copy_from_bank6', 'line_start', 'line_up', 'line_down', 'line_right', 'line_left',
  'line_up_right', 'leader_input', 0x8792, 0x879F, 0x87AE, 0x87BB], MIX);
for (const name of ['queue_message', 'copy_from_bank1', 'copy_from_bank6', 'line_start', 'line_up', 'line_down', 'line_right',
  'line_left', 'line_up_right', 'leader_input']) t(Object.assign({ name }, MIX));
for (const a of [0x8792, 0x879F, 0x87AE, 0x87BB]) t(Object.assign({ entry: a }, MIX));
process.exitCode = f ? 1 : 0;
