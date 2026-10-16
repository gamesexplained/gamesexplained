'use strict';
// A base's routines alone against the game's (check.js), on the moments docked at a base
// (moments 'station', at the start of a pass of the visit's loop) with the base's parts in
// memory. What waits is scripted the same on both sides (script.js): wait_key returns at once, a
// menu takes the next choice of a list, and a direction asked for is a key in the buffer.
const { check } = require('./check.js');
let f = 0;
// node t-station.js [names]: those checks only
const ONLY = process.argv.slice(2);
const t = o => {
  if (ONLY.length && !ONLY.includes(o.name)) return;
  f += check(Object.assign({ cases: 300, outs: [], moments: 'station', parts: ['engine', 'station'], maxSteps: 4e7 }, o)).fails ? 1 : 0;
};
const pick = (rnd, a) => a[rnd(a.length)];
const dir = rnd => pick(rnd, [0xFF, 0, 1]);
// an entry on the map (not the player), or any when there is none
const entry = (M, rnd) => {
  const on = [];
  for (let y = 1; y < 32; y++) if (!(M[0x5510 + y] & 0x80)) on.push(y);
  return on.length ? pick(rnd, on) : 1 + rnd(31);
};
// a square within d of the player
const near = (M, rnd, d = 1) => ({ x: (M[0x5510] + rnd(2 * d + 1) - d) & 255, y: (M[0x5530] + rnd(2 * d + 1) - d) & 255 });

const { script, scripted: stubbed, choices, cover, covered, CALLER } = require('./script.js');
const scripted = P => { cover(P, 'g-station.js'); stubbed(P); };
// the credits: none, a few or plenty
const credits = (M, rnd) => { const v = pick(rnd, [0, 3, 40, 200, 1000, 30000]); M[0x0728] = v & 255; M[0x0729] = v >> 8; };
// a check of a routine that waits: the menus' choices and the keys scripted, then setup
const w = o => t(Object.assign({ cases: 60, onPort: scripted }, o, { setup: (M, c, rnd, st) => {
  script(M, choices(rnd, o.fill, o.most), o.keys ? o.keys(rnd) : []);
  credits(M, rnd);
  return o.setup ? o.setup(M, c, rnd, st) : undefined;
} }));

// ---- moving about
// set_still, find_entry and entry_action test Z, which their callers set by loading A last
const z = r => Object.assign(r, { z: r.a ? 0 : 1 });
t({ name: 'set_still', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => z({ a: dir(rnd), x: dir(rnd), y: rnd(32) }) });
t({ name: 'random_step', outs: ['a', 'x', 'y'] });
t({ name: 'step_to_player', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0xBC] = entry(M, rnd); } });
t({ name: 'step_target_kind', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { M[0xBC] = entry(M, rnd); M[0xBD] = dir(rnd); M[0xBE] = dir(rnd); } });
t({ name: 'entry_blocks', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => near(M, rnd, 2) });
t({ name: 'door_cell', outs: ['a', 'y', 'c'], setup: (M, c, rnd) => near(M, rnd, 6) });
t({ name: 'try_step', outs: ['c'], setup: (M, c, rnd) => ({ a: rnd(3) ? 0 : entry(M, rnd), x: dir(rnd), y: dir(rnd) }) });
t({ name: 'slide_step', outs: ['c'], setup: (M, c, rnd) => { M[0xBC] = rnd(3) ? 0 : entry(M, rnd); M[0xBD] = dir(rnd); M[0xBE] = dir(rnd); } });
for (const name of ['move_wander', 'move_wander_rooms', 'move_watch', 'move_chase']) {
  t({ name, setup: (M, c, rnd) => { M[0xBC] = entry(M, rnd); M[0xBD] = 0; M[0xBE] = 0; if (rnd(2)) M[0x5550 + M[0xBC]] ^= 0x40; } });
}
t({ name: 'open_door', cases: 100, setup: (M, c, rnd) => { const s = near(M, rnd, 1); M[0x94] = s.x; M[0x95] = s.y; return { y: pick(rnd, [0x6C, 0x71, 0x70]) }; } });
t({ name: 'close_door', cases: 100, setup: (M, c, rnd) => { const s = near(M, rnd, 1); M[0x9B] = s.x; M[0x9C] = s.y; return { y: pick(rnd, [0x6C, 0x71, 0x70]) }; } });
t({ name: 'door_frame', cases: 100, setup: (M, c, rnd) => { M[0x99] = rnd(99); M[0x9A] = 0x6C + rnd(8); } });
t({ name: 'entry_distance', outs: ['a'], setup: (M, c, rnd) => ({ y: entry(M, rnd) }) });

// ---- what is where
const square = (M, rnd) => { const s = near(M, rnd, 1); M[0xE4] = s.x; M[0xE5] = s.y; if (rnd(4) === 0) M[0x083B] = pick(rnd, [0x80, 0xA0, 1]); };
t({ name: 'find_entry', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { square(M, rnd); return z({ a: rnd(2) }); } });
t({ name: 'entry_action', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => { square(M, rnd); return z({ a: rnd(2) }); } });
t({ name: 'look_square', outs: ['a'], setup: (M, c, rnd) => {
  M[0x8C] = pick(rnd, [0, 1, 0xFF]); M[0x8D] = 0;
  const d = pick(rnd, [[0, 1], [0, 0xFF], [1, 0], [0xFF, 0]]);
  return { x: d[0], y: d[1] };
} });
t({ name: 'free_entry', outs: ['a', 'y'], setup: (M, c, rnd) => { for (let i = rnd(4); i; i--) M[0x5510 + rnd(32)] = 0xFF; } });
t({ name: 'remove_entry', outs: ['a', 'y'], setup: (M, c, rnd) => ({ y: rnd(32) }) });
t({ name: 'find_watcher', outs: ['a', 'y'], setup: (M, c, rnd) => { for (let i = rnd(4); i; i--) M[0x5550 + 1 + rnd(31)] ^= 0x40; } });
t({ name: 'entry_in_view', outs: ['a', 'y', 'c'], setup: (M, c, rnd) => ({ y: entry(M, rnd) }) });
t({ name: 'mark_in_view', outs: ['y'] });

// ---- sight
t({ name: 'sight', outs: ['a', 'x', 'y'] });
t({ name: 'wall_edges', outs: ['a', 'y'] });
t({ name: 'wall_flag', outs: ['a'], setup: (M, c, rnd) => { M[0x8A] = rnd(11); return { a: pick(rnd, [0x10, 0x20, 0x30]), x: pick(rnd, [0x79, rnd(256)]), y: rnd(99) }; } });
const cellAt = (M, c, rnd) => { M[0x84] = rnd(11); M[0x85] = rnd(9); };
t({ name: 'push_seed', outs: ['y'], setup: (M, c, rnd) => { cellAt(M, c, rnd); M[0x80] = rnd(8); } });
t({ name: 'mark_cell', outs: ['x', 'y'], setup: cellAt });
t({ name: 'cell_wall', outs: ['a', 'x', 'y'], setup: cellAt });
t({ name: 'cell_marked', outs: ['a', 'x', 'y'], setup: cellAt });
t({ name: 'flood_fill', outs: ['a'], setup: M => { for (let y = 0; y < 0x63; y++) M[0xFA63 + y] = 0; } });

// ---- the base's state
// random_seed's second half ($A2E2), which the bases call, has no label of its own
t({ name: 'random_reseed', entry: 0xA2E2, outs: ['a', 'y'] });
t({ name: 'cargo_price', outs: ['a', 'x', 'y'], setup: (M, c, rnd) => ({ a: rnd(0x18) }) });
t({ name: 'pick_rumour', outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => {
  for (let i = 0; i < 10; i++) { M[0x98 + i] = rnd(2); M[0x0784 + i] = pick(rnd, [0, 1, 2, 3, 0xFF]); }
} });
t({ name: 'release_rumour', outs: ['a'], setup: (M, c, rnd) => { const x = rnd(10); M[0x0784 + x] = rnd(4); return { x }; } });
t({ name: 'raise_alarm', setup: (M, c, rnd) => { M[0x083B] = rnd(3) ? 0 : pick(rnd, [1, 4, 0xA0]); return { a: pick(rnd, [1, 2, 3, 4, 0xA0, 0xA1]) }; } });
t({ name: 'clear_text_page' });
t({ name: 'base_setup', setup: (M, c, rnd) => {
  for (const a of [0x0790, 0x0791, 0x0793, 0x078E, 0x0786, 0x0785, 0x078B, 0x0743, 0x0740]) M[a] = rnd(3) ? 0 : pick(rnd, [1, 0x80, 0xFF]);
  for (let i = 0; i < 10; i++) M[0x0784 + i] = rnd(4);
  for (let i = 0; i < 0x1A; i++) if (rnd(4) === 0) M[0x0752 + i] = 0;
  if (rnd(2)) { M[0x5611] = (M[0x5510] + 1) & 255; M[0x5612] = M[0x5530]; } else M[0x5611] = 0xFF;
  if (rnd(4) === 0) { M[0x0779] = 0x36; } else if (rnd(4) === 0) { M[0x0779] = 0x35; M[0x077A] = 0x31; }
  M[0x083B] = 0;
} });
t({ name: 'load_land_tiles' });
t({ name: 'load_talk' });

// ---- talk's plain parts
const node = (M, rnd) => { M[0xB6] = rnd(256); M[0xB7] = 0x57 + rnd(8); M[0xBA] = rnd(256); M[0xBB] = 0xC0 + rnd(8); };
t({ name: 'talk_target', outs: ['a', 'y'], setup: (M, c, rnd) => { node(M, rnd); M[0xC4] = rnd(8); return { a: rnd(8) }; } });
t({ name: 'talk_random', outs: ['a', 'y'], setup: (M, c, rnd) => { node(M, rnd); M[0xC3] = 2 + rnd(6); M[0xC4] = rnd(8); } });
// menu_entry tests N, which its caller sets by loading A
t({ name: 'menu_entry', outs: ['a', 'c'], setup: (M, c, rnd) => { node(M, rnd); const a = rnd(256); return { a, n: a >> 7, x: rnd(16) }; } });
t({ name: 'talk_var', outs: ['a'], setup: (M, c, rnd) => ({ a: rnd(256) }) });
// a variable in the talk flags, the items or the plot
const variable = (M, c, rnd) => { const a = pick(rnd, [0x08B1, 0x073D, 0x078E]) + rnd(4); M[0x7A] = a & 255; M[0x7B] = a >> 8; M[0xC6] = rnd(256); };
for (const name of ['talk_set1', 'talk_set0', 'talk_inc', 'talk_dec']) t({ name, outs: ['a'], setup: variable });
t({ name: 'talk_alarm', setup: (M, c, rnd) => { M[0x083B] = 0; M[0xC6] = pick(rnd, [1, 2, 3, 4, 0xA0]); } });
t({ name: 'talk_doom', outs: ['a'], setup: (M, c, rnd) => { M[0xC6] = rnd(256); } });
t({ name: 'talk_end', outs: ['a', 'y'], setup: (M, c, rnd) => {
  M[0x0835] = rnd(0x80); M[0x0796] = rnd(4) ? 0 : 1;
  const y = entry(M, rnd);
  if (rnd(2)) M[0x5550 + y] = (M[0x5550 + y] & 0xF8) | 4;
  return { y };
} });

// ---- what waits
// the direction keys ($A375, with their steps at $A389 and $A39D), or the stick; never fire, which
// nothing lets go in a check (the lockstep presses it)
const KEYS = M => Array.from({ length: 20 }, (_, i) => M[0xA375 + i]);
const step = (M, c, rnd) => {
  const r = rnd(4);
  if (r === 0) c.game.joy = 0x1F & ~pick(rnd, [1, 2, 4, 8, 5, 6, 9, 10]);
  else if (r === 1) { M[0x03] = 1; M[0x05] = pick(rnd, KEYS(M).concat([0x20, 0x0D, 0x30])); }
};
w({ name: 'show_credits' });
w({ name: 'base_screen', cases: 20 });
w({ name: 'station_view', cases: 40, setup: (M, c, rnd) => { M[0x0D29] = pick(rnd, [0, 1, 5, 0xFF]); } });
w({ name: 'guards_check', setup: (M, c, rnd) => {
  M[0x083B] = pick(rnd, [0, 1, 2, 4, 0xA0, 0xA1]);
  const y = entry(M, rnd), s = near(M, rnd, 2);
  M[0x5550 + y] = (M[0x5550 + y] & 0xF8) | 3; M[0x5510 + y] = s.x; M[0x5530 + y] = s.y;
  M[0x0726] = rnd(256); M[0x0727] = rnd(2);
} });
// the docking message ($A584), which may drop the visit's return: called from a JSR at $0360
w({ name: 'arrival_message', entry: CALLER, cases: 80, setup: (M, c, rnd) => {
  M[CALLER] = 0x20; M[CALLER + 1] = 0x84; M[CALLER + 2] = 0xA5; M[CALLER + 3] = 0x60;
  M[0x0783] = pick(rnd, [0, 0, 0, 1, 2]);
  M[0x5610] = pick(rnd, [0, 0x10, 0x12, 0x11]);
  if (rnd(3) === 0) { M[0x0779] = pick(rnd, [0x35, 0x36]); M[0x077A] = 0x31; }
  const b = rnd(2) ? 0 : pick(rnd, [5, 50, 300]); M[0x0726] = b & 255; M[0x0727] = b >> 8;
  M[0x074E] = rnd(2);
  for (let i = 0; i < 8; i++) M[0x0767 + i] = pick(rnd, [0xFF, rnd(0x18)]);
} });
w({ name: 'base_step', cases: 120, setup: (M, c, rnd) => { step(M, c, rnd); M[0x083A] = rnd(4) ? 0 : 1; } });
w({ name: 'base_menu', cases: 120, setup: (M, c, rnd) => { M[0x083B] = rnd(3) ? 0 : 0x80; } });
w({ name: 'status_pages', setup: (M, c, rnd) => ({ x: 0x1B, y: 0xAF, a: 0x0A }) });
// a person by the player, of a type: a shop, the bar, a guard or a talk script
const person = (M, rnd, type) => {
  const y = entry(M, rnd), s = near(M, rnd, 1);
  M[0x5510 + y] = s.x; M[0x5530 + y] = s.y; M[0x5590 + y] = type;
  return y;
};
const cargo = (M, rnd) => { M[0x0777] = 1 + rnd(8); for (let i = 0; i < 8; i++) M[0x0767 + i] = rnd(3) ? 0xFF : rnd(0x18); };
w({ name: 'talk_to', cases: 120, setup: (M, c, rnd) => {
  cargo(M, rnd);
  M[0x074D] = rnd(2); M[0x083A] = rnd(4) ? 0 : 1;
  return { y: person(M, rnd, pick(rnd, [0x20, 0x21, 0x22, 0x23, 0x24])) };
} });
w({ name: 'cargo_merchant', cases: 80, most: 4, setup: (M, c, rnd) => { cargo(M, rnd); } });
w({ name: 'outfitter', cases: 150, most: 5, setup: (M, c, rnd) => {
  M[0x074D] = rnd(3) ? 1 : 0; M[0x0739] = rnd(5); M[0x073A] = rnd(4) << 4 | rnd(4); M[0x0737] = rnd(4); M[0x0777] = rnd(9);
  M[0x073F] = rnd(2); const a = pick(rnd, [100, 450, 500]); M[0x0735] = a & 255; M[0x0736] = a >> 8;
} });
w({ name: 'repair_shop', cases: 80, most: 4, setup: (M, c, rnd) => {
  for (const a of [0x0732, 0x0733, 0x0734]) M[a] = rnd(8);
  M[0x0409] = rnd(64); M[0x0738] = rnd(64);
  const hp = rnd(500); M[0x051D] = hp & 255; M[0x051E] = hp >> 8;
} });
w({ name: 'bartender', cases: 80, setup: (M, c, rnd) => {
  M[0x083A] = rnd(4) ? 0 : 1;
  for (let i = 0; i < 10; i++) M[0x0784 + i] = rnd(4);
} });
// a talk with one of the base's people, its type a script; OTHER's line typed from the keys
const typed = rnd => { const k = []; for (let i = rnd(5); i; i--) k.push(pick(rnd, [0x41 + rnd(26), 0x20, 0x14])); k.push(0x0D); return k; };
w({ name: 'talk_script', cases: 120, loops: true, keys: typed, setup: (M, c, rnd) => ({ y: person(M, rnd, rnd(0x20)) }) });
w({ name: 'talk_give_credits', setup: (M, c, rnd) => { M[0xC6] = rnd(256); } });
w({ name: 'talk_take_credits', setup: (M, c, rnd) => { M[0xC6] = rnd(256); } });
w({ name: 'type_line', keys: typed, setup: (M, c, rnd) => { M[0x4F] = 2; M[0x50] = 0x26; } });
// an action on an entry: the lock, the safe, an item, the coil, a sign, the ship, the alarm
// plate, the notices (HIVE!, action 3, is not written)
w({ name: 'do_action', cases: 300, loops: true, maxSteps: 1.5e8, setup: (M, c, rnd) => {
  const x = pick(rnd, [0, 1, 2, 4, 5, 6, 6, 7, 7, 8]);
  const y = entry(M, rnd);
  if (x === 5) M[0x5590 + y] = rnd(0x25);
  if (x === 6) M[0x5590 + y] = pick(rnd, [0xA0, 0xA1]);
  if (x === 7) { M[0x5590 + y] = 0x80 | pick(rnd, [rnd(0x1A), 8, 0x1A + rnd(4)]); M[0x074F] = rnd(2); }
  M[0x0742] = rnd(2); M[0x55B0 + y] = rnd(2) ? 0 : 1;
  M[0x083B] = rnd(3) ? 0 : pick(rnd, [1, 0xA0]);
  return { x: x | pick(rnd, [0, 0x40, 0x80, 0xC0]), y };
} });
w({ name: 'find_adjacent', cases: 120, keys: rnd => [pick(rnd, [0x57, 0x58, 0x41, 0x44, 0x0D, 0x51])].concat([0x0D]), setup: (M, c, rnd) => {
  for (let i = rnd(3); i; i--) person(M, rnd, rnd(2) ? rnd(0x20) : 0x80 | rnd(0x20));
  return { a: pick(rnd, [0, 1, 0xFF]) };
} });

covered();
process.exitCode = f ? 1 : 0;
