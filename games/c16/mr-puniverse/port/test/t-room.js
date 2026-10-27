'use strict';
// The rooms, against the game's (lib.js): each room drawn for either player, its objects made and
// moved, with their switches and timers at random, and the small routines they share. object_timer
// leaves its caller as well when the cannon waits, so it is held through update_cannon and
// update_random_cannon.
const { check } = require('./lib.js');
const { Z, T } = globalThis.PuniPort;
const SLOTS = 0x14;
// the slots of the room's objects of a type, in a state
const slots = (M, t) => { const s = []; for (let x = 0; x < SLOTS && M[T.obj_type + x]; x++) if ((M[T.obj_type + x] & 0x0F) === t) s.push(x); return s; };
// the switches, and the cannons' and crushers' counts, at random, so that each moves now and then
// (a bridge's width and a field's height stay the room's: an even width never ends update_bridge's
// loop, in the game as in the port)
function stir(M, rnd) {
  for (let x = 0; x < 8; x++) if (rnd(3) === 0) M[T.switch_state + x] = rnd(4) ? rnd(2) : rnd(256);
  for (let x = 0; x < SLOTS && M[T.obj_type + x]; x++) {
    const t = M[T.obj_type + x] & 0x0F;
    if (t === 3 || t === 4) {
      if (rnd(2)) M[T.obj_timer + x] = rnd(3) ? 1 : rnd(256);
      if (rnd(4) === 0 && M[T.shot_hi + x] >= 0x0C) M[T.obj_param + x] ^= 0x80;   // a shot only where one has been
    } else if (t === 5) {
      if (rnd(2)) M[T.obj_reload + x] = rnd(3) ? 1 : rnd(256);
      if (rnd(4) === 0) M[T.obj_timer + x] ^= 0x40;
    }
  }
}
// a slot of type t, the slot $49 and X as update_objects leaves them, in a room that has one
function slot(t) {
  return (M, rnd) => {
    stir(M, rnd);
    const s = slots(M, t), x = s[rnd(s.length)];
    M[0x49] = x;
    return { x };
  };
}
const has = t => M => slots(M, t).length > 0;

check({ name: 'draw_room', cases: 1500, setup: (M, rnd) => {
  M[T.player] = rnd(2); M[T.room + M[T.player]] = rnd(25);
  for (let x = 0; x < 25; x++) M[T.vitamins_got + x] = rnd(4);
} });
check({ name: 'update_objects', cases: 4000, setup: (M, rnd) => { stir(M, rnd); } });
check({ name: 'update_bridge', where: has(1), cases: 2000, setup: slot(1) });
check({ name: 'update_field', where: has(2), cases: 2000, setup: slot(2) });
check({ name: 'update_cannon', where: has(3), cases: 3000, setup: slot(3) });
check({ name: 'update_random_cannon', where: has(4), cases: 3000, setup: slot(4) });
check({ name: 'update_crusher', where: has(5), cases: 3000, setup: slot(5) });
check({ name: 'move_shot', where: has(3), cases: 3000, setup: (M, rnd) => {
  const r = slot(3)(M, rnd), x = r.x;
  // a shot in flight: where it is, or at the cannon's starting cell, as update_cannon puts it
  if (M[T.shot_hi + x] < 0x0C) { M[T.shot_hi + x] = M[T.obj_type + x] >> 4; M[T.shot_lo + x] = M[T.obj_lo + x]; }
  M[T.shot_char] = 0xC5; M[0x4F] = 0;
  return r;
} });
check({ name: 'shot_erase', where: has(3), cases: 2000, outs: ['x', 'y'], setup: slot(3) });
check({ name: 'object_ptr', cases: 1000, outs: ['x', 'y'], setup: (M, rnd) => { M[0x49] = rnd(SLOTS); return { y: rnd(256) }; } });
check({ name: 'read_cell', cases: 2000, outs: ['a', 'y'], setup: (M, rnd) => {
  const a = 0x0C00 + rnd(0x2D0); M[0x4C] = a & 0xFF; M[0x4D] = a >> 8;
  if (rnd(3) === 0) M[a] = 0x78 + rnd(6);
} });
check({ name: 'write_cell', cases: 2000, setup: (M, rnd) => {
  const a = 0x0C00 + rnd(0x2D0); M[0x4C] = a & 0xFF; M[0x4D] = a >> 8;
  if (rnd(3) === 0) M[a] = 0x78 + rnd(6);
  return { x: rnd(256) };
} });
check({ name: 'fill_cells', cases: 1000, setup: (M, rnd) => {
  const a = 0x0C00 + rnd(0x2D0); M[0x4C] = a & 0xFF; M[0x4D] = a >> 8; M[0x4E] = rnd(256); M[0x4F] = rnd(256);
  return { y: rnd(0x28) };
} });
check({ name: 'draw_column', cases: 2000, setup: (M, rnd) => {
  const a = 0x0C00 + 0x28 * 8 + rnd(0x200); M[0x4C] = a & 0xFF; M[0x4D] = a >> 8; M[0x4E] = rnd(256); M[0x4F] = rnd(256);
  M[0x4A] = rnd(2) ? [0x84, 0x88, 0x90, 0xBC, 0xC6, 0xD6][rnd(6)] : rnd(256);
  return { x: rnd(8) };
} });
check({ name: 'object_place', cases: 1000, outs: ['x', 'y'], setup: (M, rnd) => {
  M[0x49] = rnd(SLOTS); const a = 0x1090 + rnd(0x700); M[0x43] = a & 0xFF; M[0x44] = a >> 8; return { y: rnd(8) };
} });
