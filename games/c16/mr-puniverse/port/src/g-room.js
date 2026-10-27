// The rooms: draw_room and draw_room_objects, the objects' makers (bridges, force fields, cannons,
// crushers, scenery, switches) and their moves (update_objects and the updates), the shots, and the
// small routines they share (object_place, object_ptr, fill_cells, draw_column, read_cell,
// write_cell, shot_erase, object_timer).
(function (root) {
'use strict';
(root.PuniGroups = root.PuniGroups || {}).room = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, N = P.N;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const rec = y => M[at(Z.rec_ptr, y)];
const u = T.under_player, C = Z.colour_ptr_lo;
// j_2E01: the player rebuilt when a cell of his changed ($4F), slot $49 kept
function rebuild() {
  if (M[0x4F] === 0) return;
  const s = M[0x49];
  P.copy_under_glyphs();
  P.merge_player();
  M[0x49] = s;
}

// The room the player in play is in (draw_room, $2868): its exits, its vitamin, his block, the
// play area's colours and the room's three, the walls from the bitmap and their tops; the
// objects' tables cleared and the objects made (draw_room_objects).
P.draw_room = function () {
  const r = M[T.room + M[T.player]];
  M[0x43] = M[T.room_ptr_lo + r]; M[0x44] = M[T.room_ptr_hi + r];
  for (let y = 0; y < 4; y++) M[T.exit_up + y] = rec(y);
  M[T.vitamin_id] = rec(4); M[T.vitamin_lo] = rec(5); M[T.vitamin_lo + 1] = rec(6); M[T.vitamin_colour] = rec(7);
  const p = M[T.player];
  M[Z.block_ptr] = M[T.saved_ptr_lo + p]; M[Z.block_ptr + 1] = M[T.saved_ptr_hi + p];
  M[Z.player_x] = M[T.saved_x + p]; M[Z.player_y] = M[T.saved_y + p];
  M[0x49] = rec(8);
  for (let x = 0; x < 0xF0; x++) { const c = rec(9); M[0x0800 + x] = c; M[0x08F0 + x] = c; M[0x09E0 + x] = c; }
  M[T.room_colours] = rec(10); M[T.room_colours + 1] = rec(11); M[T.room_colours + 2] = rec(12);
  M[0x4A] = rec(13);
  P.add_to_ptr43({ a: 0x0E });
  M[0x4E] = 0x0C; M[0x4D] = 0; M[0x4B] = 0; M[0x4C] = 0;
  do {
    M[0x4F] = rec(0);
    do {
      const bit = M[0x4F] >> 7;
      M[0x4F] = (M[0x4F] << 1) & 0xFF;
      if (bit) { M[at(0x4D, 0)] = M[0x49]; M[at(0x4D, 1)] = (M[0x49] + 4) & 0xFF; N.wall++; }
      else { M[at(0x4D, 0)] = 0xD6; M[at(0x4D, 1)] = 0xD6; }
      const t = M[0x4D] + 2;
      M[0x4D] = t & 0xFF; M[0x4E] = (M[0x4E] + (t >> 8)) & 0xFF;
      M[0x4B] = (M[0x4B] + 1) & 0xFF;
    } while (M[0x4B] !== 0x08);
    M[0x4B] = 0;
    M[0x4C] = (M[0x4C] + 1) & 0xFF;
    P.add_to_ptr43({ a: 0x01 });
  } while (M[0x4C] !== 0x2D);
  M[0x4D] = 0; M[0x4E] = 0x0C;
  do {
    if (M[at(0x4D, 0)] === 0xD6 && M[at(0x4D, 0x28)] === M[0x49]) {
      M[at(0x4D, 0)] = 0x7E; M[at(0x4D, 1)] = 0x7F;
      P.colour_ptr({ x: 0x4D });
      M[at(C, 0)] = M[0x4A]; M[at(C, 1)] = M[0x4A];
      N.top++;
    }
    P.ptr_right({ x: 0x4D });
  } while (M[0x4D] !== 0xD0 || M[0x4E] !== 0x0E);
  M[0x49] = 0;
  for (let x = 0; x < 0xA7; x++) M[T.switch_state + x] = 0;
  P.draw_room_objects();
};

// The objects of the record, each by its type, to the $FF; the energy's rate and mode; the edges'
// blanks made exits; the vitamin, unless this player has it (draw_room_objects, $2999).
P.draw_room_objects = function () {
  for (;;) {
    const a = rec(0);
    if (a === 0xFF) break;
    const t = a & 0x0F;
    if (t === 1) P.make_bridge();
    else if (t === 2) P.make_field();
    else if (t === 3 || t === 4) P.make_cannon();
    else if (t === 5) P.make_crusher();
    else if (t === 7) P.make_decor();
    else if (t === 8) P.make_switch();
    else throw new Error('draw_room_objects: an object of type ' + t + ' at $' + at(Z.rec_ptr, 0).toString(16) + ' reaches the BRK at $2A96');
  }
  M[T.energy_rate] = rec(1); M[T.energy_mode] = rec(2);
  M[0x4C] = 0; M[0x4D] = 0x0C;
  for (let x = 0; x !== 0x12; ) {
    if (M[at(0x4C, 0x00)] === 0xD6) { M[at(0x4C, 0x00)] = 0xC3; N.edge++; }
    if (M[at(0x4C, 0x27)] === 0xD6) { M[at(0x4C, 0x27)] = 0xC4; N.edge++; }
    x++;
    P.ptr_down({ x: 0x4C });
  }
  M[0x4C] = 0; M[0x4D] = 0x0C;
  for (let y = 0; y < 0x28; y++) if (M[at(0x4C, y)] === 0xD6) { M[at(0x4C, y)] = 0xC1; N.edge++; }
  M[0x4D] = 0x0E; M[0x4C] = 0xA8;
  for (let y = 0; y < 0x28; y++) if (M[at(0x4C, y)] === 0xD6) { M[at(0x4C, y)] = 0xC2; N.edge++; }
  const bit = M[T.player] === 0 ? 0x01 : 0x02;
  if ((M[T.vitamins_got + M[T.vitamin_id]] & bit) === bit) return;
  M[0x4C] = M[T.vitamin_lo]; M[0x4D] = M[T.vitamin_lo + 1];
  M[at(0x4C, 0)] = 0xD7;
  P.colour_ptr({ x: 0x4C });
  M[at(C, 0)] = M[T.vitamin_colour];
};

// An object record's address and type into the slot $49 and $4C/$4D (object_place, $1F10); the
// slot's address back into $4C/$4D (object_ptr, $1F39).
P.object_place = function (r) {
  const x = M[0x49];
  let y = r.y;
  const a = M[at(Z.rec_ptr, y)];
  M[T.obj_type + x] = a; M[0x4D] = a >> 4;
  y = (y + 1) & 0xFF;
  M[T.obj_lo + x] = M[0x4C] = M[at(Z.rec_ptr, y)];
  return { x, y };
};
P.object_ptr = function (r) {
  const x = M[0x49];
  M[0x4D] = M[T.obj_type + x] >> 4;
  M[0x4C] = M[T.obj_lo + x];
  return { x, y: ((r && r.y) + 1) & 0xFF };
};
// Y+1 cells from $4C/$4D in the character $4F and the colour $4E (fill_cells, $1F26).
P.fill_cells = function (r) {
  P.colour_ptr({ x: 0x4C });
  let y = r.y;
  do { M[at(0x4C, y)] = M[0x4F]; M[at(C, y)] = M[0x4E]; N.cell++; y = (y - 1) & 0xFF; } while (y !== 0xFF);
};
// A column X+1 rows high, upward from $4C/$4D: $4A and its partner, in the colours $4E and $4F
// (draw_column, $1F95).
P.draw_column = function (r) {
  let x = r.x;
  for (;;) {
    let a = M[0x4A];
    M[at(0x4C, 0)] = a;
    if (a < 0x88) a = (a + 4) & 0xFF;
    else if (a !== 0xD6 && a !== 0xBC) a = (a + 1) & 0xFF;
    M[at(0x4C, 1)] = a;
    P.colour_ptr({ x: 0x4C });
    M[at(C, 0)] = M[0x4E]; M[at(C, 1)] = M[0x4F];
    N.cell++;
    P.ptr_up({ x: 0x4C });
    x = (x - 1) & 0xFF;
    if (x === 0xFF) break;
  }
};

// The makers. A bridge (make_bridge, $2AE3): its row blanked in its colour.
P.make_bridge = function () {
  const { x } = P.object_place({ y: 0 });
  M[0x4E] = M[T.obj_colour + x] = rec(2);
  M[T.obj_timer + x] = rec(3);
  M[T.obj_param + x] = rec(4);
  M[0x4F] = 0xD6;
  P.fill_cells({ y: M[T.obj_timer + x] });
  P.add_to_ptr43({ a: 0x05 });
  M[0x49] = (M[0x49] + 1) & 0xFF;
};
// A force field (make_field, $2B0D): its base, and the field above it.
P.make_field = function () {
  const { x } = P.object_place({ y: 0 });
  M[0x4E] = M[T.obj_colour + x] = rec(2);
  M[0x4F] = M[T.obj_param + x] = rec(3);
  M[T.obj_timer + x] = rec(4);
  M[T.obj_reload + x] = rec(5);
  M[at(0x4C, 0)] = 0x90; M[at(0x4C, 1)] = 0x91;
  P.ptr_up({ x: 0x4C });
  const s = M[0x49];
  M[T.obj_lo + s] = M[0x4C];
  M[T.obj_type + s] = ((M[0x4D] << 4) | 0x02) & 0xFF;
  M[0x4A] = 0xC6;
  P.draw_column({ x: M[T.obj_reload + s] });
  M[0x49] = (M[0x49] + 1) & 0xFF;
  P.add_to_ptr43({ a: 0x06 });
};
// A cannon (make_cannon, $2B60), type 3 one way, type 4 either: its base, and its head coloured
// like the base.
P.make_cannon = function () {
  const { x } = P.object_place({ y: 0 });
  M[T.obj_colour + x] = rec(2);
  M[T.obj_param + x] = rec(3) | 0x80;
  M[T.obj_timer + x] = M[T.obj_reload + x] = rec(4);
  M[T.obj_param + x] |= rec(5);
  P.add_to_ptr43({ a: 0x06 });
  M[at(0x4C, 0)] = 0x92; M[at(0x4C, 1)] = 0x93;
  P.ptr_up({ x: 0x4C });
  P.colour_ptr({ x: 0x4C });
  const c = M[at(C, 0x28)];
  M[at(C, 0)] = c; M[at(C, 1)] = c;
  const s = M[0x49];
  if ((M[T.obj_type + s] & 0x0F) === 0x04) {
    M[at(0x4C, 0)] = 0x98; M[at(0x4C, 1)] = 0x9C;
    M[0x49] = (M[0x49] + 1) & 0xFF;
    return;
  }
  if ((M[T.obj_param + s] & 0x40) === 0x40) {
    M[at(0x4C, 0)] = 0x96; M[at(0x4C, 1)] = 0x97;
    P.ptr_right({ x: 0x4C }); P.ptr_right({ x: 0x4C });
  } else {
    P.ptr_left({ x: 0x4C });
    M[at(0x4C, 1)] = 0x94; M[at(0x4C, 2)] = 0x95;
  }
  M[T.obj_lo + s] = M[0x4C];
  M[T.obj_type + s] = ((M[0x4D] << 4) | 0x03) & 0xFF;
  M[0x49] = (M[0x49] + 1) & 0xFF;
};
// A crusher (make_crusher, $2ED5): its shaft down from the address, and its head.
P.make_crusher = function () {
  const { x } = P.object_place({ y: 0 });
  M[T.obj_colour + x] = rec(2);
  M[T.obj_param + x] = rec(3);
  M[T.obj_timer + x] = rec(4);
  M[0x4F] = rec(5);
  M[T.obj_timer + x] |= rec(6);
  M[T.obj_reload + x] = M[T.shot_hi + x] = rec(7);
  const colours = () => {
    P.colour_ptr({ x: 0x4C });
    const s = M[0x49];
    M[at(C, 1)] = M[T.obj_param + s]; M[at(C, 0)] = M[T.obj_colour + s];
  };
  for (;;) {
    M[0x4F] = (M[0x4F] - 1) & 0xFF;
    if (M[0x4F] === 0) break;
    M[at(0x4C, 0)] = 0xCC; M[at(0x4C, 1)] = 0xD1;
    colours();
    P.ptr_down({ x: 0x4C });
  }
  M[at(0x4C, 0)] = 0xCD; M[at(0x4C, 1)] = 0xD2;
  colours();
  const s = M[0x49];
  M[T.obj_lo + s] = M[0x4C];
  M[T.obj_type + s] = ((M[0x4D] << 4) | 0x05) & 0xFF;
  P.add_to_ptr43({ a: 0x08 });
  M[0x49] = (M[0x49] + 1) & 0xFF;
};
// Scenery (make_decor, $2C03): a row of blocks two cells square ($A0-$BB, and from $C8), or a
// column (draw_column).
P.make_decor = function () {
  M[0x4D] = rec(0) >> 4;
  M[0x4C] = rec(1);
  M[0x4E] = rec(2);
  M[0x4F] = rec(3);
  const a = M[0x4A] = rec(4);
  if (a < 0xA0 || (a >= 0xBC && a < 0xC8)) P.draw_column({ x: rec(5) });
  else {
    M[0x4B] = a >= 0xC8 ? 0x01 : a === 0xB8 ? 0x01 : 0x07;
    let x = rec(5);
    do {
      let v = M[0x4A];
      M[at(0x4C, 0x00)] = v;
      v = v + 1; let c = v >> 8; v &= 0xFF;
      M[at(0x4C, 0x01)] = v;
      v = v + M[0x4B] + c; c = v >> 8; v &= 0xFF;
      M[at(0x4C, 0x28)] = v;
      v = (v + 1 + c) & 0xFF;
      M[at(0x4C, 0x29)] = v;
      P.colour_ptr({ x: 0x4C });
      M[at(C, 0x00)] = M[0x4E]; M[at(C, 0x01)] = M[0x4E];
      M[at(C, 0x28)] = M[0x4F]; M[at(C, 0x29)] = M[0x4F];
      N.block++;
      P.ptr_right({ x: 0x4C }); P.ptr_right({ x: 0x4C });
      x = (x - 1) & 0xFF;
    } while (x !== 0);
  }
  P.add_to_ptr43({ a: 0x06 });
};
// A switch (make_switch, $2C95): its state kept, and drawn lit or unlit.
P.make_switch = function () {
  M[0x4D] = rec(0) >> 4;
  M[0x4C] = rec(1);
  M[0x4E] = rec(2);
  const st = rec(3);
  M[T.switch_state + (M[0x4E] & 0x07)] = st;
  const a = st === 0x01 ? 0xBD : 0xBF;
  M[at(0x4C, 0)] = a; M[at(0x4C, 1)] = (a + 1) & 0xFF;
  P.colour_ptr({ x: 0x4C });
  M[at(C, 1)] = M[0x4E]; M[at(C, 0)] = M[0x4E];
  P.add_to_ptr43({ a: 0x04 });
};

// The room's objects moved, slot by slot to an empty one or slot 20 (update_objects, $2A97).
P.update_objects = function () {
  M[0x49] = 0xFF;
  for (;;) {
    M[0x49] = (M[0x49] + 1) & 0xFF;
    const x = M[0x49], t = M[T.obj_type + x] & 0x0F;
    if (t === 0 || x === 0x14) return;
    if (t === 1) P.update_bridge();
    else if (t === 2) P.update_field();
    else if (t === 3) P.update_cannon({ x });
    else if (t === 4) P.update_random_cannon({ x });
    else if (t === 5) P.update_crusher({ x });
    else throw new Error('update_objects: slot ' + x + ' of type ' + t + ' reaches the BRK at $2AE2');
  }
};
// A bridge shown or hidden by its switch (update_bridge, $2CD6).
P.update_bridge = function () {
  const { x } = P.object_ptr({ y: 0 });
  const up = M[at(0x4C, 0x28)] === M[T.screen_chars];
  if (M[T.switch_state + M[T.obj_param + x]] === 0) {
    if (!up) return;
    M[0x4F] = 0xD6; M[0x4E] = M[T.obj_colour + x];
    P.fill_cells({ y: M[T.obj_timer + x] });
    const s = M[0x49];
    P.ptr_down({ x: 0x4C });
    P.fill_cells({ y: M[T.obj_timer + s] });
    return;
  }
  if (up) return;
  M[0x4F] = 0xD6; M[0x4E] = M[T.obj_colour + x];
  P.fill_cells({ y: M[T.obj_timer + x] });
  P.ptr_down({ x: 0x4C });
  let y = M[T.obj_timer + M[0x49]];
  for (;;) {
    M[at(0x4C, y)] = M[0x0C01];
    y = (y - 1) & 0xFF;
    M[at(0x4C, y)] = M[0x0C00];
    P.colour_ptr({ x: 0x4C });
    M[at(C, y)] = M[0x0800];
    M[at(C, (y + 1) & 0xFF)] = M[0x0800];
    N.cell++;
    y = (y - 1) & 0xFF;
    if (y === 0xFF) break;
  }
};
// A force field taken away or put back by its switch (update_field, $2E1E).
P.update_field = function () {
  const { x } = P.object_ptr({ y: 0 });
  M[0x4E] = M[T.obj_colour + x]; M[0x4F] = M[T.obj_param + x];
  if (M[T.switch_state + M[T.obj_timer + x]] === 0) {
    if (M[at(0x4C, 0)] !== 0xC6) return;
    M[0x4A] = 0xD6;
    P.draw_column({ x: M[T.obj_reload + x] });
    return;
  }
  if (M[at(0x4C, 0)] !== 0xD6) return;
  M[0x4A] = 0xC6; M[0x4E] = M[T.obj_colour + x]; M[0x4F] = M[T.obj_param + x];
  P.draw_column({ x: M[T.obj_reload + x] });
};
// A cannon's rate and switch (object_timer, $2D81): go is false where the game takes the
// cannon's return address and goes back to update_objects.
P.object_timer = function (r) {
  const x = r.x;
  M[T.obj_timer + x] = (M[T.obj_timer + x] - 1) & 0xFF;
  if (M[T.obj_timer + x] !== 0) return { go: false };
  M[T.obj_timer + x] = M[T.obj_reload + x];
  const y = M[T.obj_param + x] & 0x0F;
  return { go: M[T.switch_state + y] !== 0, y };
};
// The one-way cannon (update_cannon, $2D50): its shot moved, or a new one at its start.
P.update_cannon = function (r) {
  const x = r.x;
  if (!P.object_timer({ x }).go) return;
  M[0x4F] = 0;
  if ((M[T.obj_param + x] & 0x80) !== 0x80) { M[T.shot_char] = 0xC5; P.move_shot({ x }); return; }
  M[T.shot_hi + x] = M[T.obj_type + x] >> 4;
  M[T.shot_lo + x] = M[T.obj_lo + x];
  M[T.obj_param + x] &= 0x7F;
};
// The random cannon (update_random_cannon, $2E68): a new shot goes left or right by bit 0 of
// $FF1F, the line of the character row TED's beam is on.
P.update_random_cannon = function (r) {
  const x = r.x;
  if (!P.object_timer({ x }).go) return;
  M[0x4F] = 0;
  if ((M[T.obj_param + x] & 0x80) !== 0x80) { M[T.shot_char] = 0xC5; P.move_shot({ x }); return; }
  M[T.shot_hi + x] = M[T.obj_type + x] >> 4;
  M[T.shot_lo + x] = M[T.obj_lo + x];
  M[T.obj_param + x] &= 0x7F;
  let d;
  if ((io.read(0xFF1F) & 0x01) === 0x01) { M[T.obj_param + x] &= 0xBF; d = 0x29; }
  else { M[T.obj_param + x] |= 0x40; d = 0x26; }
  const t = M[T.shot_lo + x] - d;
  M[T.shot_lo + x] = t & 0xFF;
  M[T.shot_hi + x] = (M[T.shot_hi + x] - (t < 0 ? 1 : 0)) & 0xFF;
};
// A shot a cell on (move_shot, $2D9D): anything but a blank ends it; a blank takes it, through
// under_player in one of the player's cells.
P.move_shot = function (r) {
  P.shot_erase({ x: r.x });
  if ((M[T.obj_param + r.x] & 0x40) === 0x40) P.ptr_right({ x: 0x4C });
  else P.ptr_left({ x: 0x4C });
  let a = M[at(0x4C, 0)];
  if (a < 0x7E) a = M[u + P.player_cell({ a }).y];
  if (a !== 0xD6) M[T.obj_param + M[0x49]] |= 0x80;
  else {
    a = M[at(0x4C, 0)];
    if (a < 0x7E) { M[u + P.player_cell({ a }).y] = M[T.shot_char]; M[0x4F] = M[T.shot_char]; }
    else M[at(0x4C, 0)] = M[T.shot_char];
    P.colour_ptr({ x: 0x4C });
    M[at(C, 0)] = M[0x4E];
  }
  const s = M[0x49];
  M[T.shot_lo + s] = M[0x4C]; M[T.shot_hi + s] = M[0x4D];
  rebuild();
};
// The shot of slot X rubbed out (shot_erase, $1F67), its cannon's colour into $4E.
P.shot_erase = function (r) {
  const x = r.x;
  M[0x4D] = M[T.shot_hi + x]; M[0x4C] = M[T.shot_lo + x]; M[0x4E] = M[T.obj_colour + x];
  const a = M[at(0x4C, 0)];
  if (a < 0x7E) { M[u + P.player_cell({ a }).y] = 0xD6; M[0x4F] = 0xD6; }
  else M[at(0x4C, 0)] = 0xD6;
  return { x: 0x4C, y: 0 };
};
// A crusher a stage on (update_crusher, $2F63), when its timer runs out and its switch is on: up a
// stage, or blanked and on into the shaft above, or turned; down a stage, or shaft and on into the
// blank below, or turned.
P.update_crusher = function (r) {
  const x = r.x;
  M[T.obj_reload + x] = (M[T.obj_reload + x] - 1) & 0xFF;
  if (M[T.obj_reload + x] !== 0) return;
  M[T.obj_reload + x] = M[T.shot_hi + x];
  if (M[T.switch_state + (M[T.obj_timer + x] & 0x0F)] === 0) return;
  P.object_ptr({ y: 0 });
  M[0x4F] = 0;
  const turn = y => { M[T.obj_timer + M[0x49]] ^= 0x40; return y; };
  let a;
  if ((M[T.obj_timer + x] & 0x40) === 0) {
    a = (P.read_cell().a + 1) & 0xFF;
    if (a === 0xD1) {
      P.write_cell({ x: 0xD6 });
      P.ptr_right({ x: 0x4C });
      P.write_cell({ x: 0xD6 });
      P.ptr_left({ x: 0x4C });
      P.ptr_up({ x: 0x4C });
      if (P.read_cell().a === 0xCC) a = 0xCD;
      else { P.ptr_down({ x: 0x4C }); a = turn(0xD0); }
    }
  } else {
    a = (P.read_cell().a - 1) & 0xFF;
    if (a === 0xCC) {
      P.write_cell({ x: 0xCC });
      P.ptr_right({ x: 0x4C });
      P.write_cell({ x: 0xD1 });
      P.ptr_down({ x: 0x4C });
      P.ptr_left({ x: 0x4C });
      if (P.read_cell().a === 0xD6) a = 0xD0;
      else { P.ptr_up({ x: 0x4C }); a = turn(0xCD); }
    }
  }
  M[0x4B] = a;                                              // j_3009
  const s = M[0x49];
  M[T.obj_lo + s] = M[0x4C];
  M[T.obj_type + s] = ((M[0x4D] << 4) | 0x05) & 0xFF;
  P.write_cell({ x: M[0x4B] });
  P.ptr_right({ x: 0x4C });
  P.write_cell({ x: (M[0x4B] + 5) & 0xFF });
  P.ptr_left({ x: 0x4C });
  P.colour_ptr({ x: 0x4C });
  const s2 = M[0x49];
  M[at(C, 0)] = M[T.obj_colour + s2]; M[at(C, 1)] = M[T.obj_param + s2];
  rebuild();
};
// The cell at $4C/$4D, or the scenery behind the player in one of his (read_cell, $304B;
// write_cell, $305E, which sets $4F so that he is rebuilt).
P.read_cell = function () {
  const a = M[at(0x4C, 0)];
  if (a < 0x7E) { const y = P.player_cell({ a }).y; return { a: M[u + y], y }; }
  return { a, y: 0 };
};
P.write_cell = function (r) {
  const a = M[at(0x4C, 0)];
  if (a < 0x7E) { const y = P.player_cell({ a }).y; M[u + y] = r.x; M[0x4F] = r.x; return; }
  M[at(0x4C, 0)] = r.x;
};
};
})(typeof window !== 'undefined' ? window : globalThis);
