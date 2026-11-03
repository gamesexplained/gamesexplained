'use strict';
// The map's drawing, the interrupt and the text engine (g-draw.js) checked against the game's own
// on the moments it calls them.
const { check, prefetch } = require('./check.js');
const R = ['random_below', 'draw_block_at', 'draw_block', 'draw_thing_at', 'thing_graphic', 'interrupt', 'interrupt_work',
  'next_frame', 'draw_map', 'map_address', 'blink_cursor', 'redraw_two_pictures', 'redraw_pictures', 'flash_icons',
  'flash_menu_bar', 'draw_thing_list', 'slide_bars', 'print_panel_text', 'print_text', 'print_text_big',
  'print_scenario_text', 'find_entry', 'print_message', 'text_control'];
prefetch(R, { per: 4 });
let fails = 0;
const outs = { random_below: ['a', 'h', 'l'], thing_graphic: ['a', 'b'], map_address: ['h', 'l', 'b', 'c', 'd', 'e'], find_entry: ['h', 'l', 'b'],
  text_control: ['h', 'l', 'b'] };
for (const n of R) fails += check({ name: n, outs: outs[n] || [], cases: 300 }).fails;
process.exitCode = fails ? 1 : 0;
