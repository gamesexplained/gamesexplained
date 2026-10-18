'use strict';
// The menus' icons, pointer and windows alone against the game's, as play calls them with the
// player walking, firing and opening menus; then every pointer and window move, and the actions.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const NAMES = ['click', 'redraw_dragged', 'find_actor', 'within_reach', 'update_icons', 'update_inventory', 'fill_slots',
  'menu_move', 'pointer_left', 'pointer_right', 'pointer_up', 'pointer_down', 'pointer_up_right', 'redraw_area',
  'window_up', 'window_down_left', 'pick_character', 'ask_new_game', 'toggle_music', 'use_item', 'quit_menu',
  'take_object', 'open_menu_2', 'open_menu_1', 'draw_menu', 'portraits_state', 'menu_colour', 'draw_icon',
  'draw_object_icon', 'draw_char_icon', 'icon_colours', 'frame_size', 'draw_menu_frame', 'draw_menu_char', 'menus_pass'];
const ENTRIES = [0xC91B, 0xCA98, 0xCA9D, 0xCAA2, 0xCC1F, 0xCC22, 0xCC2D, 0xCC32, 0xCC35, 0xCC4E, 0xCD69, 0xCE6B, 0xCE91, 0xCF1C];
const OUTS = { find_actor: ['zf', 'hl'], within_reach: ['zf', 'cf', 'a', 'hl'], portraits_state: ['c'] };
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name, outs: OUTS[name] || [] });
for (const entry of ENTRIES) t({ entry });
// every move of the pointer and the window from where the menus were
const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
const moves = at('menu_move');
t({ name: 'menu_move', cases0: moves, cases: 300, setup: (c, rnd) => {
  c.M[0x8D20] = rnd(10); c.M[0x8D23] = rnd(256); c.M[0x8D24] = rnd(80);
} });
const fires = at('menus_pass');
for (const entry of [0xCC49, 0xCC4E, 0xCC22, 0xCC35, 0xCC1A, 0xCC1F, 0xCC2D, 0xCC32]) t({ entry, cases0: fires, cases: 100, setup: (c, rnd) => {
  const rec = rnd(2) ? 0xC899 : 0xC8A6;
  c.regs.h = rec >> 8; c.regs.l = rec & 255;
  const put = (a, v) => { c.M[a] = v; c.banks[3][a - 0xC000] = v; };
  put(rec + 2, rnd(32)); put(rec + 5, 3 + rnd(20));
  const e = 0x8D4D + rnd(0x110); put(rec + 0x0B, e & 255); put(rec + 0x0C, e >> 8);
} });
process.exitCode = f ? 1 : 0;
