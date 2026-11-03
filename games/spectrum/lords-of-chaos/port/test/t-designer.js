'use strict';
// The wizard designer (g-designer.js) checked against the game's own on the moments it calls each
// routine, from moments in the designer (work/states/dz-*, sessions.js designer), and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  designer_panel: [], designer_option: [], draw_designer_panel: [], list_designer_wizards: [], design_wizard_option: [],
  load_wizard_option: [], save_wizard_option: [], delete_wizard_option: [], copy_name_to_slot: [], print_number_4: [], print_digit_4: ['b', 'hl'],
  print_designer_message: [], spells_screen: [], show_spells: [], designer_spell_line: [], spell_figures: ['a'], spells_edit: [],
  character_screen: [], print_figures: [], highlight_figure: [], figure_cost: ['a'], name_screen: [], show_name_entry: [],
  design_wizard: [], design_exit: [], run_design_action: [], highlight_design_option: [],
};
const R = Object.keys(outs);
const O = { part: 0, states: 'dz-', per: 4, frames: 3000 };
prefetch(R, O);
let fails = 0;
for (const n of R) fails += check(Object.assign({ name: n, outs: outs[n], cases: 200, limit: 2000000 }, O)).fails;
// the routines nothing calls, and some at random, on moments in the designer
const at = Object.assign({}, O, { from: 'run_file_menu' });
// (the moments in the designer itself: some sessions have gone on into a scenario, whose code is
// at $D003 up in place of the designer's)
const lib = require('./lib.js');
const any = (name, outs, setup, cases, seed) => {
  const own = (c, rnd) => (lib.partOf(c.M) === 0 ? setup(c, rnd) : false);
  fails += check(Object.assign({ name, outs, setup: own, cases, seed }, at)).fails;
};
any('unused_DCDE', ['hl'], (c, rnd) => { c.regs.a = rnd(5); }, 20, 70);
any('unused_highlight', [], (c, rnd) => { c.M[0xC662] = rnd(8); }, 20, 71);
any('unused_things', [], (c, rnd) => { c.M[0x5B04] = rnd(256); c.M[0x5B05] = 0xCE + rnd(2); c.M[0xDC7F] = rnd(256); c.M[0xDC80] = rnd(40); }, 40, 72);
any('print_number_4', [], (c, rnd) => { c.regs.h = rnd(40); c.regs.l = rnd(256); c.M[0x5B15] = rnd(23); c.M[0x5B16] = rnd(28); }, 100, 73);
any('spell_figures', ['a'], (c, rnd) => { c.regs.a = rnd(0x2D); }, 100, 74);
any('designer_spell_line', [], (c, rnd) => { c.regs.a = rnd(0x2D); c.M[0x5B1A] = 3 + 2 * rnd(9); c.M[0x5B1B] = 2; }, 100, 75);
any('figure_cost', ['a'], (c, rnd) => { c.M[0xC662] = rnd(7); c.regs.c = rnd(256); }, 100, 76);
any('design_exit', [], (c, rnd) => { c.M[0x5B11] = 1 + rnd(4); c.M[0x5B04] = (0xCEA4 + 70 * c.M[0x5B11]) & 255; c.M[0x5B05] = (0xCEA4 + 70 * c.M[0x5B11]) >> 8; }, 40, 77);
process.exitCode = fails ? 1 : 0;
