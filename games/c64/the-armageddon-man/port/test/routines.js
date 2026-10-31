'use strict';
// Each routine the port has written, checked alone against the game's own over the moments in
// work/states (check.js). `node port/test/routines.js` runs them all; names on the command line run
// those only.
const fs = require('fs'), path = require('path');
const { check } = require('./check.js');
const lib = require('./lib.js');
const standin = require('./standin.js');
const R = [];
const add = (name, o = {}) => R.push(Object.assign({ name, cases: 300 }, o));
// The JSRs to a routine in the game's code, for the routines that take inline bytes from after them.
let RAM = null;
function callers(name) {
  if (!RAM) {
    RAM = new Uint8Array(65536);
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
    RAM.codeAt = new Uint8Array(65536);
    for (const r of L.records) { if (r.b) RAM.set(r.b, r.a); if (r.t === 'code') RAM.codeAt[r.a] = 1; }
  }
  const a = standin.labels().get(name), out = [];
  for (let p = 0; p < 0xFFFD; p++) if (RAM.codeAt[p] && RAM[p] === 0x20 && (RAM[p + 1] | RAM[p + 2] << 8) === a) out.push(p);
  return out;
}
const { loadPort } = require('./port.js');
const portOn = (M, name, r) => loadPort().makePort(M, {})[name](r || {});
const setwM = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const at = name => { const list = callers(name); return (M, c, rnd) => ({ at: list[rnd(list.length)] }); };

// the library
const rect = (M, c, rnd) => { M[0x2C] = rnd(32); M[0x2E] = rnd(24); M[0x2F] = 1 + rnd(32 - M[0x2C]); M[0x30] = 1 + rnd(24 - M[0x2E]); M[0x31] = rnd(256); };
add('cell_address', { outs: ['a', 'y'], setup: rect });
add('cell_address_84', { outs: ['a', 'y'], setup: (M, c, rnd) => { M[0x84] = rnd(32); M[0x85] = rnd(24); } });
add('pixel_address', { outs: ['a', 'y'], setup: (M, c, rnd) => { M[0x84] = rnd(256); M[0x85] = rnd(192); } });
add('cell_bitmap_address', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x2C] = rnd(64); M[0x2E] = rnd(24); } });
add('cell_bitmap_84', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x84] = rnd(40); M[0x85] = rnd(24); } });
add('next_cell_row', { outs: ['a'] });
add('add_to_pointer', { outs: ['a'] });
add('next_screen_row', { outs: ['a'] });
add('fill_rect', { outs: ['a', 'x', 'y'], setup: rect });
add('fill_cells', { outs: ['a', 'x', 'y'], setup: at('fill_cells') });
add('fill', { outs: ['y'], setup: at('fill') });
add('copy_block', { outs: ['y'], setup: at('copy_block') });
add('fill_screen_colour', { outs: [] });
add('print_glyph', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { rect(M, c, rnd); M[0x2A] = rnd(256); M[0x2B] = 0xE1 + rnd(30); return { a: rnd(9), y: rnd(32) * 8 }; } });
add('divide16', { outs: [], setup: (M, c, rnd) => { M[0x74] = rnd(256); M[0x75] = rnd(4) ? 0 : rnd(256); M[0x76] = rnd(256); M[0x77] = rnd(256); } });
add('key_bit', { outs: ['a', 'x', 'y'] });
add('key_down', { outs: ['a', 'y', 'c'] });
add('read_joystick', { outs: ['a', 'x'], port: 0x05 });
add('read_keys', { outs: ['a', 'x'] });
add('read_controls', { outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { if (rnd(2)) { M[0x512C] = 0x6F; } c.game.joy = 0x1F & ~rnd(32); } });
add('random', { outs: ['a'] });
add('random_init', { outs: ['a'] });
// the screen
add('window_get_rect', { outs: ['a', 'y'] });
add('window_push', { outs: ['a', 'x'] });
add('window_pop', { outs: ['a', 'x'], setup: M => { if (M[0x6018] < 5) M[0x6018] = 5; } });
add('window_save', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { rect(M, c, rnd); M[0x28] = rnd(256); M[0x29] = 0x20 + rnd(16); } });
add('window_restore', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { rect(M, c, rnd); M[0x07] = rnd(256); M[0x08] = 0x20 + rnd(16); } });
add('window_frame', { outs: ['a', 'y'], setup: (M, c, rnd) => { M[0x2F] = 2 + rnd(20); M[0x30] = 2 + rnd(20); M[0x2C] = rnd(33 - M[0x2F]); M[0x2E] = rnd(25 - M[0x30]); } });
add('cursor_place', { outs: ['a', 'x'], setup: (M, c, rnd) => { M[0xA6] = rnd(256); M[0xA7] = rnd(2); M[0xA8] = rnd(192); } });
add('cursor_show', { outs: ['a'] });
add('cursor_on', { outs: ['a'] });
add('cursor_off', { outs: ['a'] });
add('cursor_shape1', { outs: ['a'] });
add('cursor_shape2', { outs: ['a'] });
add('make_sprite', { outs: ['a', 'x', 'y'], setup: at('make_sprite') });
add('open_window', { outs: [], setup: at('open_window') });
add('close_window', { outs: [], setup: M => { if (M[0x7E] === 0x67 && M[0x7F] === 0x8C) return { skip: true }; } });
add('next_bitmap_byte', { outs: ['a'] });
add('sprites_init', { outs: ['a', 'x'] });
add('video_init', { outs: ['a'] });
add('cias_off', { outs: ['a'] });
add('window_init', { outs: ['a'] });
// the radio
const freq = (M, c, rnd) => {
  M[0x5E65] = rnd(6); const y = M[0x5E65] * 2;
  for (const [a, t] of [[0x5E6F, 0x7666], [0x5E6D, 0x7674]]) { M[a] = M[t + y]; M[a + 1] = M[t + y + 1]; }
  const f = [M[0x5E6F] | M[0x5E70] << 8, M[0x5E6D] | M[0x5E6E] << 8, rnd(65536), 25000 + rnd(3600), rnd(1900)][rnd(5)] + rnd(3) - 1;
  M[0x5E6A] = f & 255; M[0x5E6B] = (f >> 8) & 255;
};
add('radio_reset', { outs: ['a'] });
add('clear_entry', { outs: ['a'] });
add('radio_freq_up', { outs: ['a'], setup: freq });
add('radio_freq_down', { outs: ['a'], setup: freq });
add('radio_show_freq', { outs: ['a'], setup: (M, c, rnd) => { freq(M, c, rnd); M[0x5E69] = rnd(6); } });
add('radio_scan_irq', { outs: ['a'], setup: (M, c, rnd) => { freq(M, c, rnd); M[0x74A4] = rnd(256); } });
add('radio_scan_start', { outs: ['a'] });
add('irq_hook_off', { outs: ['a'] });
add('fill_cells_86', { outs: ['a', 'y'], setup: (M, c, rnd) => { M[0x84] = 1 + rnd(8); M[0x85] = 1 + rnd(8); M[0x88] = rnd(256); M[0x89] = 0xDC + rnd(2); } });
add('radio_band_button', { outs: ['a'], setup: freq });
add('radio_set_band', { outs: ['a', 'y'], setup: freq });
add('radio_tune_typed', { outs: ['a'], setup: freq });
add('radio_find_band', { outs: [], setup: freq });
add('keypad_digit', { outs: [], setup: (M, c, rnd) => { M[0x5E68] = rnd(13); M[0x5E69] = rnd(6); } });
add('radio_clear_entry', { outs: ['a'] });
add('radio_draw_entry', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x5E69] = rnd(6); for (let i = 0; i < 5; i++) M[0x740E + i] = rnd(3) ? 0x30 + rnd(10) : 0x20; } });
add('draw_big_digit', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x88] = rnd(256) & 0xF8; M[0x89] = 0xE2 + rnd(20); return { a: rnd(4) ? 0x30 + rnd(10) : 0x20 }; } });
add('scramble_char', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0x7B9D] = M[0x7C41 + rnd(17)]; M[0x7B9F] = rnd(2) ? M[0x7B9D] ^ (1 << rnd(8)) : rnd(256); return { a: 0x20 + rnd(64) }; } });
add('country_on_band', { outs: ['a', 'y', 'z'], setup: (M, c, rnd) => { M[0x8A] = rnd(16); M[0x5E65] = rnd(6); } });
// text and the cursor, in a window made up at $8C77
const win = (M, c, rnd) => {
  const p = 0x8C77, col = 1 + rnd(26), row = 1 + rnd(20);
  M[p] = col; M[p + 1] = row; M[p + 2] = 1 + rnd(Math.min(28, 31 - col)); M[p + 3] = 1 + rnd(23 - row); M[p + 4] = rnd(256);
  M[p + 7] = rnd(16); M[p + 9] = rnd(M[p + 2] * 8); M[p + 10] = rnd(M[p + 3]); M[p + 11] = rnd(M[p + 3]);
  M[p + 12] = rnd(250); M[p + 13] = rnd(180);
  M[0x7E] = 0x77; M[0x7F] = 0x8C; M[0x80] = 0x77; M[0x81] = 0x8C;
};
add('print_char', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { win(M, c, rnd); return { a: rnd(8) ? 0x20 + rnd(96) : 0x0D }; } });
add('draw_char', { outs: ['a', 'y'], setup: (M, c, rnd) => { win(M, c, rnd); return { a: rnd(8) ? 0x20 + rnd(96) : 0x0D }; } });
add('glyph_address', { outs: ['a'] });
add('new_line', { outs: ['a', 'y'], setup: win });
add('scroll_check', { outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { win(M, c, rnd); if (rnd(2)) M[0x8C77 + 10] = M[0x8C77 + 3]; } });
const tall = (M, c, rnd) => { win(M, c, rnd); const p = 0x8C77; M[p + 1] = rnd(3); M[p + 3] = 16 + rnd(5); M[p + 10] = rnd(4); M[p + 2] = Math.max(M[p + 2], 12); M[p] = Math.min(M[p], 31 - M[p + 2]); if ((M[p + 7] & 0xFE) === 12 || (M[p + 7] & 0xFE) > 20) M[p + 7] = 0; };
add('print_list', { outs: ['a', 'y'], dump: M => Array.from(M.slice(0x8C77, 0x8C85)).join(',') + ' / ' + (M[0x88] | M[0x89] << 8).toString(16), setup: (M, c, rnd) => { tall(M, c, rnd); const y = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10][rnd(10)] * 2; M[0x88] = M[0x855B + y]; M[0x89] = M[0x855C + y]; } });
add('print_string', { outs: ['a', 'y'], dump: M => Array.from(M.slice(0x8C77, 0x8C85)).join(',') + ' / ' + (M[0x88] | M[0x89] << 8).toString(16), setup: (M, c, rnd) => { tall(M, c, rnd); const y = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10][rnd(10)] * 2; M[0x88] = M[0x855B + y]; M[0x89] = M[0x855C + y]; } });
add('print_inline', { outs: ['a', 'y'], setup: (M, c, rnd) => Object.assign(win(M, c, rnd) || {}, at('print_inline')(M, c, rnd)) });
add('set_text_x', { outs: ['a', 'y'], setup: win });
add('draw_menu', { outs: ['a', 'y'], setup: tall, dump: M => Array.from(M.slice(0x8C77, 0x8C85)).join(',') });
add('draw_picture', { outs: ['a', 'y'], setup: (M, c, rnd) => { const a = rnd(11); const p = M[0x8C51 + 2 * a] | M[0x8C52 + 2 * a] << 8; M[0x84] = rnd(33 - M[p]); M[0x85] = rnd(25 - (M[p + 1] >> 3)); return { a }; } });
add('cursor_to_window', { outs: [], setup: win });
add('cursor_home', { outs: ['a', 'y'], setup: win });
add('menu_highlight', { outs: ['a', 'y'], setup: win });
add('swap_nibbles', { outs: ['a', 'y'] });
add('cursor_in_window', { outs: ['a', 'c'], setup: win });
add('cursor_in_rect', { outs: ['a', 'c'], setup: win });
add('hit_test', { outs: ['a', 'c'], setup: (M, c, rnd) => { const t = [[0x7EE8, 6], [0x7F7C, 4], [0x7A70, 8]][rnd(3)]; M[0x80] = t[0] & 255; M[0x81] = t[0] >> 8; const p = M[0x7E] | M[0x7F] << 8; M[p + 12] = rnd(250); M[p + 13] = rnd(180); return { x: t[1] }; } });
add('menu_track', { outs: [], setup: win });
add('move_cursor', { outs: ['c'], setup: (M, c, rnd) => { win(M, c, rnd); M[0xC2E3] = rnd(2); c.game.joy = 0x1F & ~rnd(32); } });

// the world
const num = (M, c, rnd) => { const v = [rnd(65536), rnd(256), rnd(10), 0, 256 * rnd(256), rnd(1000)][rnd(6)]; M[0x88] = v & 255; M[0x89] = v >> 8; return { a: rnd(256) }; };
add('number_to_digits', { outs: ['a', 'x', 'y'], setup: num });
add('number_to_text', { outs: ['a', 'x', 'y'], setup: num });
add('print_number', { outs: ['a'], setup: (M, c, rnd) => { win(M, c, rnd); return { a: rnd(256) }; } });
add('parse_number', { outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { const p = 0x0340; M[0x86] = p & 255; M[0x87] = p >> 8; for (let i = 0; i < 12; i++) M[p + i] = rnd(3) ? 0x30 + rnd(10) : [0x20, 0x24, 0x41][rnd(3)]; } });
const ctry = (M, c, rnd) => ({ a: rnd(16) });
for (const n of ['event_levels_row', 'intercept_row', 'bigbird_row', 'relations_row', 'country_record']) add(n, { outs: ['a'], setup: ctry });
add('relations_init', { outs: ['a', 'x', 'y'] });
add('countries_init', { outs: ['x', 'y'] });
add('force_init', { outs: ['a'] });
const pair = (M, c, rnd) => { M[0x8A] = rnd(16); M[0x8B] = rnd(16); M[0xB160] = rnd(32); for (let i = 0; i < 16; i++) if (!rnd(6)) M[0x5DA4 + 12 * i + 11] = 0xFF; };
const paired = (M, c, rnd) => { pair(M, c, rnd); M[0x8A] = rnd(16); M[0x8B] = (M[0x8A] + 1 + rnd(15)) & 15; portOn(M, 'set_countries'); };
add('test_a_alive', { outs: [], setup: pair });
add('test_b_alive', { outs: [], setup: pair });
add('force_test', { outs: [], setup: (M, c, rnd) => { pair(M, c, rnd); M[0x5B56] = rnd(2) ? M[0x8A] : rnd(16); M[0x5B57] = rnd(3) ? 0 : rnd(4); } });
add('script_settle', { outs: ['a', 'y'], setup: paired });
add('event_level_index', { outs: ['a', 'x'], setup: (M, c, rnd) => ({ a: rnd(40) }) });
add('satellites_reset', { outs: ['x'] });
add('set_country_c', { outs: [], setup: paired });
add('set_country_d', { outs: [], setup: paired });
add('most_hostile', { outs: ['a'], setup: (M, c, rnd) => { pair(M, c, rnd); return { a: rnd(16) }; } });
add('most_liked', { outs: ['a'], setup: (M, c, rnd) => { pair(M, c, rnd); return { a: rnd(16) }; } });
add('table_entry', { outs: ['a', 'y'], setup: (M, c, rnd) => { M[0x88] = 0x4C; M[0x89] = 0xC0; return { a: rnd(16) }; } });
add('expand_text', { outs: ['a', 'y'], setup: (M, c, rnd) => { paired(M, c, rnd); M[0x88] = M[0x560E + 2 * rnd(8)]; M[0x89] = M[0x560F + 2 * (0)]; const y = rnd(8) * 2; M[0x88] = M[0x560E + y]; M[0x89] = M[0x560F + y]; } });
add('pick_country_a', { outs: ['a'], setup: pair });
add('set_countries', { outs: [], setup: (M, c, rnd) => { pair(M, c, rnd); M[0x8A] = rnd(16); M[0x8B] = rnd(16); } });
add('bigbird_over_a', { outs: ['x'], setup: paired });
add('bigbird_pick', { outs: ['c'], setup: pair });
add('intercept_pick', { outs: ['c'], setup: (M, c, rnd) => { pair(M, c, rnd); M[0x5E65] = rnd(6); } });
// the script engine's plain routines and commands
const script = (M, c, rnd) => { paired(M, c, rnd); const p = 0x0340; M[0xB5E4] = p & 255; M[0xB5E5] = p >> 8; for (let i = 0; i < 8; i++) M[p + i] = rnd(256); M[0x5B4F] = rnd(256); M[0xB5E3] = rnd(4); };
for (const n of ['script_a_conf_up', 'script_b_conf_up', 'script_a_conf_down', 'script_b_conf_down', 'script_a_to_b_up', 'script_b_to_a_up',
  'script_a_to_b_down', 'script_b_to_a_down', 'script_a_to_b_up_rnd', 'script_b_to_a_up_rnd', 'script_a_to_b_down_rnd', 'script_b_to_a_down_rnd',
  'script_goto', 'script_roll_a', 'script_roll_b', 'script_skip_if', 'script_post', 'script_return', 'script_call',
  'script_a_missiles_up', 'script_b_missiles_up', 'script_a_missiles_down', 'script_all_conf_up', 'script_all_conf_down', 'script_force_in_a',
  'script_force_in_b', 'script_a_res_down', 'script_a_tech_down', 'script_b_res_up', 'script_b_tech_up', 'script_c_conf_down', 'script_d_conf_down',
  'script_c_conf_up', 'script_d_conf_up', 'script_d_to_a_up', 'script_c_to_d_up', 'script_chance', 'script_enemy_a', 'script_enemy_b', 'script_set_relations',
  'script_b_conf_down_amount', 'script_a_conf_down_amount', 'script_b_conf_up_amount', 'script_a_conf_up_amount', 'script_a_tech_up',
  'script_b_tech_down', 'script_a_res_up', 'script_b_res_down', 'script_has_missiles', 'script_switch', 'script_fetch', 'flag_set', 'flag_clear'])
  add(n, { outs: [], setup: (M, c, rnd) => { script(M, c, rnd); M[0xB85F] = rnd(2); } });
add('demand_check', { outs: [], setup: paired });
add('missile_power', { outs: [], setup: (M, c, rnd) => { setwM(M, 0x80, 0x5DA4 + 12 * rnd(16)); } });
add('divide_88_86', { outs: [], setup: (M, c, rnd) => { M[0x86] = 1 + rnd(255); M[0x87] = rnd(3) ? 0 : rnd(4); M[0x88] = rnd(256); M[0x89] = rnd(256); } });
add('mail_init', { outs: [] });
// the satellites and the war
const sat = (M, c, rnd) => { for (let i = 0; i < 9; i++) { const p = 0x5D5C + 8 * i; M[p] = 40 + rnd(160); M[p + 1] = 8 + rnd(100); if (rnd(2)) M[p + 6] |= 1; else M[p + 6] &= 0xFE; } };
add('satellite_census', { outs: [], setup: sat });
add('in_cover', { outs: ['c'], setup: (M, c, rnd) => { sat(M, c, rnd); setwM(M, 0x80, 0x5DA4 + 12 * rnd(16)); setwM(M, 0x82, 0x5D5C + 8 * rnd(9)); } });
add('near_cursor', { outs: ['c'], setup: (M, c, rnd) => { sat(M, c, rnd); win(M, c, rnd); const s = 0x5D5C + 8 * rnd(9); setwM(M, 0x82, s); if (rnd(2)) { M[0x8C77 + 12] = (M[s] + rnd(9) - 4) & 255; M[0x8C77 + 13] = (M[s + 1] + rnd(9) - 4) & 255; } } });
add('satellite_draw', { outs: [], setup: (M, c, rnd) => { sat(M, c, rnd); setwM(M, 0x80, 0x5D5C + 8 * rnd(9)); } });
add('satellite_icons', { outs: [], setup: sat });
add('cover_name', { outs: ['a'], setup: (M, c, rnd) => { tall(M, c, rnd); return { a: rnd(16) }; } });
const missile = (M, c, rnd) => { paired(M, c, rnd); const r = 0xC5CD + 19 * rnd(6); setwM(M, 0x80, r); M[r] = 8 + rnd(240); M[r + 1] = 8 + rnd(150); M[r + 17] = 8 + rnd(240); M[r + 18] = 8 + rnd(150); M[r + 14] = rnd(3); M[r + 6] = (rnd(2) ? M[0x8A] : M[0x8B]) << 1 | rnd(2); return r; };
add('take_missiles', { outs: ['a', 'y'], setup: (M, c, rnd) => { paired(M, c, rnd); setwM(M, 0x80, 0x5DA4 + 12 * rnd(16)); setwM(M, 0x82, 0xC5C7 + 3 * rnd(2)); return { a: rnd(30) }; } });
add('line_setup', { outs: [], setup: (M, c, rnd) => { missile(M, c, rnd); for (const a of [0x84, 0x85, 0x86, 0x87]) M[a] = rnd(4) ? rnd(256) : M[0x84]; } });
add('line_step', { outs: ['a', 'y'], setup: (M, c, rnd) => { const r = missile(M, c, rnd); M[0x86] = M[r]; M[0x87] = M[r + 1]; M[0x84] = M[r + 17]; M[0x85] = M[r + 18]; portOn(M, 'line_setup'); for (let i = rnd(20); i; i--) { portOn(M, 'line_step'); M[r] = M[0x84]; M[r + 1] = M[0x85]; } } });
add('war_missiles_init', { outs: ['a', 'x', 'y'], setup: paired });
add('war_damage', { outs: [], setup: missile });
add('missile_done', { outs: [], setup: (M, c, rnd) => { missile(M, c, rnd); M[0xC7E1] = rnd(2); for (let i = 0; i < 6; i++) M[0xC5C7 + i] = rnd(3); } });
add('missile_launch', { outs: [], setup: (M, c, rnd) => { missile(M, c, rnd); setwM(M, 0x82, M[0x90] | M[0x91] << 8); M[0xC8F5] = M[0x8E]; M[0xC8F6] = M[0x8F]; } });
add('missile_fly', { outs: [], setup: (M, c, rnd) => { const r = missile(M, c, rnd); sat(M, c, rnd); M[0x86] = M[r]; M[0x87] = M[r + 1]; M[0x84] = M[r + 17]; M[0x85] = M[r + 18]; portOn(M, 'line_setup'); } });
add('missile_explode', { outs: [], setup: missile });
add('laser_line', { outs: [], setup: (M, c, rnd) => { const r = missile(M, c, rnd); sat(M, c, rnd); const s = 0x5D5C + 8 * rnd(6); M[r + 7] = s & 255; M[r + 13] = s >> 8; } });

const only = process.argv.slice(2);
let bad = 0;
for (const o of R) if (!only.length || only.includes(o.name)) bad += check(o).fails ? 1 : 0;
process.exit(bad ? 1 : 0);
