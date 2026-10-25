'use strict';
// The rooms' routines (src/g-room.js), each checked alone against the game's (check.js), on the
// moments of play, in any of the 69 rooms.
//   node t-room.js [cases] [routine]
const { check } = require('./check.js');

const cases = +(process.argv[2] || 200), only = process.argv[3] || '';
const STACK = [[0x100, 0x1FF]];
const room = (M, c, rnd) => { M[0x5B] = rnd(0x45); return {}; };
const T = [
  { name: 'room_change', setup: (M, c, rnd) => { room(M, c, rnd); M[0x6B] = rnd(3) ? 0x80 | rnd(4) : rnd(0x80); if (rnd(2)) M[0x067F] ^= 0x80; M[0x8A] = rnd(2) << 7; return {}; } },
  { name: 'room_link_ptr', setup: (M, c, rnd) => ({ a: rnd(0x45) }), outs: ['a', 'y'] },
  { name: 'build_room', setup: room },
  { name: 'load_room_chars', setup: (M, c, rnd) => ({ a: rnd(0x45) }) },
  { name: 'colour_room', setup: room },
  { name: 'clear_room_objects', setup: (M, c, rnd) => { for (let x = 0; x < 8; x++) { if (rnd(3) === 0) M[0x0290 + x] |= 0x80; if (rnd(3) === 0) M[0x02A8 + x] |= 0x80; } return {}; }, outs: ['a', 'x'] },
  { name: 'place_room_sprites', setup: room },
  { name: 'reset_sprite_slots' },
  { name: 'skip_taken_item', setup: (M, c, rnd) => { const x = rnd(8); M[0x0260 + x] = [0xC6, M[0xFC54 + rnd(4)], rnd(256)][rnd(3)]; M[0x067E + rnd(4)] ^= 0x80; M[0x0661 + rnd(9)] = rnd(256); room(M, c, rnd); return { x }; }, outs: ['x'] },
  { name: 'set_enemy_stats', setup: (M, c, rnd) => { const x = rnd(8); M[0x0260 + x] = rnd(2) ? M[0xC618 + rnd(25)] : rnd(256); return { x }; }, outs: ['x'] },
  { name: 'hold_back_group', setup: (M, c, rnd) => { for (let x = 0; x < 8; x++) M[0x02A8 + x] = [0xD0, 0xD1, 0xC0, 0xC1, rnd(256)][rnd(5)]; return {}; } },
  { name: 'place_bomber', setup: (M, c, rnd) => { M[0x0267] = rnd(2) ? 0xC9 : rnd(256); M[0x020E] = rnd(256); M[0x020F] = rnd(256); return {}; }, outs: ['x'] },
  { name: 'place_bomb', setup: (M, c, rnd) => { M[0x020E] = rnd(256); M[0x020F] = rnd(256); M[0x0210] = rnd(256); return {}; } },
  { name: 'place_armour', setup: (M, c, rnd) => { room(M, c, rnd); if (rnd(2)) M[0x77] = M[0x5B]; M[0x7B] = rnd(2) << 7; M[0x7A] = rnd(256); return {}; } },
  { name: 'load_room_animations', setup: room },
  { name: 'clear_tile_anims' },
  { name: 'room_map_ptr', setup: (M, c, rnd) => ({ a: rnd(3) ? rnd(0x45) : 0 }), outs: ['a'] },
  { name: 'tile_ptr', outs: ['a', 'x'] },
  { name: 'draw_tile', setup: (M, c, rnd) => { M[0x5C] = rnd(10); M[0x5D] = rnd(4); return {}; }, outs: ['a', 'y'] },
  { name: 'draw_edge_column', setup: (M, c, rnd) => { M[0x5C] = rnd(2) * 9; M[0x5D] = rnd(4); return {}; } },
  { name: 'clear_screen' },
  { name: 'clear_panel', outs: ['a', 'x', 'y'] },
  { name: 'clear_screen_ram', outs: ['a', 'x'] },
];
let fails = 0;
for (const t of T) if (!only || t.name === only) fails += check(Object.assign({ cases, outs: [], ignore: STACK }, t)).fails ? 1 : 0;
process.exitCode = fails ? 1 : 0;
