'use strict';
// The map cursor and the information display (g-panel.js) checked against the game's own on the
// moments it calls them, and the cursor moved and squares described at random.
const { check, prefetch } = require('./check.js');
const outs = {
  move_cursor: [], restore_cursor: [], cursor_up: [], cursor_down: [], cursor_left: [], cursor_right: [], clear_screen: [], fill_screen: [],
  clear_info_panel: [], clear_icon_cell: ['h', 'l'], clear_message_line: [], fill_message_line: [], blank_message_line: [],
  describe_cursor_square: [], describe_creature: [], fill_icon_list: [], print_square_name: [], print_owner_name: [],
  find_creature_at: ['ix'], find_creatures_any: [], find_others_at: [], find_creatures_at: [], list_selected_carries: [], list_found_carries: [],
  list_carried: [], list_objects_here: [], list_objects_at: [], clear_bars: [], clear_lower_bars: [], draw_menu_frame: [], attack_terrain: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300 }).fails;
// the cursor anywhere, moved any way, with or without a reach
const cursor = (c, rnd) => {
  const M = c.M;
  M[0x5B13] = 0xE0 | rnd(32); M[0xD0C8] = rnd(36); M[0xD0C9] = rnd(36); M[0xD0D1] = rnd(7); M[0xD0D2] = rnd(7);
  M[0xD0D3] = (M[0xD0C8] + M[0xD0D1]) % 36; M[0xD0D4] = (M[0xD0C9] + M[0xD0D2]) % 36;
  M[0xFF60] = rnd(3) ? 0 : 1 + rnd(8); M[0x5B45] = rnd(36); M[0x5B46] = rnd(36); M[0xD0DF] = rnd(2) ? 3 : 7;
};
fails += check({ name: 'move_cursor', setup: cursor, cases: 300, seed: 2 }).fails;
// every square described and named, wherever the cursor is
const square = (c, rnd) => { c.M[0xD0D3] = rnd(36); c.M[0xD0D4] = rnd(36); };
for (const n of ['describe_cursor_square', 'print_square_name'])
  fails += check({ name: n, from: 'move_cursor', setup: square, cases: 300, seed: 3 }).fails;
const at = (c, rnd) => { c.regs.l = rnd(36); c.regs.h = rnd(36); c.regs.a = rnd(2) ? 0xFF : rnd(0x91); c.M[0x5B12] = 0x8C + rnd(40); };
fails += check({ name: 'find_creature_at', from: 'move_cursor', outs: ['ix'], setup: at, cases: 300, seed: 4 }).fails;
fails += check({ name: 'list_objects_at', from: 'move_cursor', setup: (c, rnd) => { c.regs.e = rnd(36); c.regs.d = rnd(36); }, cases: 300, seed: 5 }).fails;
fails += check({ name: 'list_carried', from: 'move_cursor', setup: (c, rnd) => { c.regs.a = rnd(0x91); }, cases: 300, seed: 6 }).fails;
process.exitCode = fails ? 1 : 0;
