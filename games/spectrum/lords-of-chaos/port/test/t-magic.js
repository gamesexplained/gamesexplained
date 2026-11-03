'use strict';
// The big map, magic spreading, flood, the squares stepped onto and the spells (g-magic.js) checked
// against the game's own on the moments it calls them, and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  big_map: [], big_map_terrain: [], big_map_creature: [], big_map_frame: [], set_spread_types: [], spread_magic: [], spread_to_neighbours: [],
  flood_area: [], step_effects: [], spell_name: ['a'], spell_list: [], print_spell_line: [], spell_cost: ['a', 'hl'], print_spell_page: [],
  choose_spell: [], cast_air: [], cast_ground: [], pay_for_spell: [], cast_spell: ['cf'], free_record: ['zf', 'c', 'hl'], summon_dragon: ['cf'],
  summon_creature: ['cf'], square_free: ['zf'], create_creature_any: [], create_creature: [], summon_display: [], brew_potion: ['cf'],
  brew_with: ['cf'], add_mana: [],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
const at = (c, rnd) => { c.M[0xD0CC] = rnd(36); c.M[0xD0CD] = rnd(36); };
const any = (name, outs, setup, cases, seed) => { fails += check({ name, from: 'move_cursor', outs, setup, cases, seed }).fails; };
any('spell_name', ['a'], (c, rnd) => { c.regs.a = rnd(0x2E); }, 100, 21);
any('spell_cost', ['a', 'hl'], (c, rnd) => { c.regs.a = rnd(0x2E); }, 200, 22);
any('print_spell_line', [], (c, rnd) => { c.regs.a = rnd(0x2E); c.M[0x5B1A] = 3 + 2 * rnd(9); c.M[0x5B1B] = 2; }, 100, 23);
any('print_spell_page', [], (c, rnd) => { c.M[0xFF3A] = rnd(0x2E); }, 60, 24);
any('square_free', ['zf'], (c, rnd) => { c.M[0x5B23] = rnd(36); c.M[0x5B24] = rnd(36); c.regs.a = 0xFF; }, 300, 25);
any('big_map_terrain', [], (c, rnd) => { at(c, rnd); c.M[0x5B15] = rnd(23); c.M[0x5B16] = rnd(31); c.M[0x5B14] = 1; c.M[0x5B0E] = c.M[0xD009]; c.M[0x5B0F] = c.M[0xD00A]; }, 200, 26);
any('big_map_creature', [], (c, rnd) => { at(c, rnd); c.M[0x5B15] = rnd(23); c.M[0x5B16] = rnd(31); c.M[0x5B14] = 1; c.M[0x5B0E] = c.M[0xD009]; c.M[0x5B0F] = c.M[0xD00A]; c.M[0x7C1B] = 0xFE + rnd(2); }, 200, 27);
// the random numbers' pointers ($606F, $6071) kept out of the stack, which the port does not keep
const away = (c, rnd) => { c.M[0x6070] = 0x60 + rnd(0x80); c.M[0x6072] = 0x60 + rnd(0x80); };
any('spread_to_neighbours', [], (c, rnd) => { at(c, rnd); away(c, rnd); c.regs.a = rnd(8); c.M[0xFF04] = rnd(2); c.M[0xFF05] = 0x38 + rnd(16); }, 200, 28);
any('flood_area', [], (c, rnd) => { c.M[0xFF94] = rnd(36); c.M[0xFF95] = rnd(36); c.M[0xFF0B] = rnd(6); c.M[0x5B21] = rnd(2); }, 200, 29);
// fire and blob of a player set on twenty squares of open terrain first, with some strength
any('spread_magic', [], (c, rnd) => {
  const M = c.M, p = rnd(5), base = M[0xD030] | M[0xD031] << 8;
  away(c, rnd);
  M[0x5B11] = p; M[0xD04B + p] = 1 + rnd(8); M[0xD04F + p] = 1 + rnd(8);
  for (let k = 0; k < 20; k++) {
    const a = (base + 36 * rnd(36) + rnd(36)) & 0xFFFF;
    if (M[a] < 0x35) M[a] = rnd(2) || !p ? 0x38 + 2 * p : 0x40 + 2 * p;
  }
}, 60, 30);
any('summon_creature', ['cf'], (c, rnd) => { c.M[0xFF31] = 0xFF; c.M[0xFF0B] = 1 + rnd(4); c.M[0xFF3A] = 3 + rnd(0x16); }, 200, 31);
any('summon_dragon', ['cf'], (c, rnd) => { c.M[0xFF31] = 0xFE + rnd(2); c.M[0xFF0B] = 1 + rnd(3); c.M[0xFF3A] = rnd(3); }, 100, 32);
any('brew_potion', ['cf'], (c, rnd) => { c.M[0xFF0B] = 1 + rnd(5); c.M[0xFF3A] = 0x19 + rnd(7); }, 100, 33);
any('add_mana', [], (c, rnd) => { c.regs.a = rnd(256); }, 100, 34);
any('pay_for_spell', [], (c, rnd) => { c.M[0xFF3A] = rnd(0x2D); }, 100, 35);
process.exitCode = fails ? 1 : 0;
