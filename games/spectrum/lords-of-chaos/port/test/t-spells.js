'use strict';
// Close combat and the spells cast at a target (g-spells.js) checked against the game's own on the
// moments it calls them, and at random.
const { check, prefetch } = require('./check.js');
const outs = {
  attack: [], strike: [], strike_ranged: [], strike_hit: [], pick_spell_target: ['cf'], draw_spell_bolt: [], area_spell: ['cf'],
  area_spell_at: ['cf'], draw_turn_panel: [], enchant: ['cf'], enchant_list: ['cf'], magic_bolt: ['cf'], magic_bolt_at: ['cf'],
  creature_at_height: ['a', 'ix'], magic_lightning: ['cf'], magic_lightning_at: ['cf'], subversion: ['cf'], take_over: [],
  magic_resistance: ['b', 'iy'], curse: ['cf'], pick_creature_target: ['cf'], magic_attack: ['cf'], magic_eye: ['cf'], teleport: ['cf'],
  jitter_coordinate: ['a'], enchantments_wear_off: [], magic_shield: ['cf'],
};
const R = Object.keys(outs);
prefetch(R, { per: 4 });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: outs[n], cases: 300, limit: 2000 }).fails;
const away = (c, rnd) => { c.M[0x6070] = 0x60 + rnd(0x80); c.M[0x6072] = 0x60 + rnd(0x80); };
const any = (name, outs, setup, cases, seed) => { fails += check({ name, from: 'move_cursor', outs, setup, cases, seed }).fails; };
const sq = (c, rnd) => { c.regs.l = rnd(36); c.regs.h = rnd(36); };
any('creature_at_height', ['a'], (c, rnd) => { sq(c, rnd); c.M[0xFF31] = 0xFE + rnd(2); }, 300, 41);
any('area_spell_at', ['cf'], (c, rnd) => { sq(c, rnd); away(c, rnd); c.M[0xFF3A] = 0x20 + rnd(4); c.M[0xFF0B] = 1 + rnd(5); c.M[0x5B11] = 1 + rnd(4); }, 300, 42);
any('jitter_coordinate', ['a'], (c, rnd) => { c.regs.h = 0xD0; c.regs.l = 0xD3 + rnd(2); c.regs.a = rnd(64); c.regs.b = rnd(32); c.M[0xD0D3] = rnd(36); c.M[0xD0D4] = rnd(36); }, 300, 43);
any('draw_turn_panel', [], (c, rnd) => { c.M[0x5B11] = rnd(5); c.M[0xD065] = rnd(40); c.M[0xD062] = rnd(40); c.M[0xD042] = rnd(20); }, 100, 44);
any('strike_hit', [], (c, rnd) => { away(c, rnd); c.M[0xFF2B] = rnd(0x91); c.M[0xFF62] = rnd(256); c.M[0xFF63] = rnd(2); c.M[0xD066] = 1; }, 300, 45);
any('enchantments_wear_off', [], (c, rnd) => { for (let k = 0; k < 10; k++) { const e = 0x5B5A + 6 * rnd(0x91); c.M[e + 2] = 0x60 + rnd(7); c.M[e + 5] = rnd(3); } }, 100, 46);
any('magic_shield', ['cf'], (c, rnd) => { c.M[0xFF0B] = rnd(6); c.M[0xD063] = rnd(2); }, 50, 47);
process.exitCode = fails ? 1 : 0;
