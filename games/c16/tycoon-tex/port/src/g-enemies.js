// The four enemies and the breaks they make: the arrow and the jet with its bomb (move_arrow_and_jet,
// drop_jet_bomb, move_jet_bomb, end_jet_bomb, draw_arrow, draw_jet, draw_jet_bomb), the bouncy bomb
// and the explosive (move_bombs, move_bouncy_bomb, draw_bouncy_bomb, move_explosive,
// explosive_lands, draw_explosive), a break in the pipe (break_pipe), the explosion a shot makes
// (start_explosion, tick_explosion, draw_explosion), and clear_enemies.
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).enemies = function (P) {
const M = P.M, io = P.io, Z = P.Z, B = P.irqByte;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
const step = (z, d) => {
  const s = M[z] + d;
  M[z] = s & 0xFF;
  M[z + 1] = (M[z + 1] + (s > 0xFF ? 1 : s < 0 ? -1 : 0)) & 0xFF;
};
// the shape's characters at a cell by its table of offsets, in a colour at the cell $400 lower
function shape(cell, colourCell, cells, n, char, colour) {
  P.N.cell += n + 1;
  M[colourCell] = M[cell]; M[colourCell + 1] = (M[cell + 1] - 0x04) & 0xFF;
  for (let x = n; x >= 0; x--) {
    const y = M[cells + x];
    M[at(cell, y)] = char(x);
    M[at(colourCell, y)] = M[colour];
  }
}

// The arrow and the jet, once a frame from irq_field (move_arrow_and_jet, $2D64). Each, when its
// bit of enemy_mask is set, waits for its timer while its random byte is at or above
// spawn_threshold, then crosses the sky a column at a time: the arrow right to left a column a
// frame, the jet left to right every other frame, dropping its bomb at a column timer 1 chose. The
// jet's bomb falls a row every other frame.
P.move_arrow_and_jet = function () {
  if (M[Z.menu_on] !== 0 || M[Z.paused] !== 0) return;
  if (M[Z.enemy_mask] & 0x01) {
    if (M[Z.arrow_active] === 0) {
      if (M[Z.rnd0] >= M[Z.spawn_threshold]) {
        M[Z.arrow_timer] = (M[Z.arrow_timer] - 1) & 0xFF;
        if (M[Z.arrow_timer] === 0) {
          M[Z.arrow_cell] = 0x1C; M[Z.arrow_cell + 1] = 0x0F;
          M[Z.arrow_moved] = 0x01; M[Z.arrow_active] = 0x01; M[Z.arrow_timer] = 0x01;
          M[Z.arrow_gone] = 0;
        }
      }
    } else {
      M[Z.arrow_timer] = (M[Z.arrow_timer] - 1) & 0xFF;
      if (M[Z.arrow_timer] === 0) {
        M[Z.arrow_timer] = 0x01; M[Z.arrow_moved] = 0;
        step(Z.arrow_cell, -1);
        if (M[Z.arrow_cell] === 0xF8) {
          M[Z.arrow_timer] = ((M[Z.rnd2] & 0x3F) + M[Z.arrow_delay_base]) & 0xFF;
          M[Z.arrow_active] = 0; M[Z.arrow_gone] = 0x01;
        } else M[Z.arrow_moved] = 0x01;
      }
    }
  }
  if (M[Z.jet_bomb_falling] !== 0) {
    M[Z.jet_bomb_timer] = (M[Z.jet_bomb_timer] - 1) & 0xFF;
    if (M[Z.jet_bomb_timer] === 0) { M[Z.jet_bomb_timer] = 0x02; P.move_jet_bomb(); }
  }
  if (!(M[Z.enemy_mask] & 0x04)) return;
  if (M[Z.jet_active] === 0) {
    if (M[Z.rnd2] < M[Z.spawn_threshold]) return;
    M[Z.jet_timer] = (M[Z.jet_timer] - 1) & 0xFF;
    if (M[Z.jet_timer] !== 0) return;
    M[Z.jet_cell] = 0x40; M[Z.jet_cell + 1] = 0x0D;
    M[Z.jet_drop_column] = ((io.read(0xFF00) & 0x1F) + 0x42) & 0xFF;
    M[Z.jet_moved] = 0x01; M[Z.jet_active] = 0x01; M[Z.jet_timer] = 0x01;
    M[Z.jet_gone] = 0;
    return;
  }
  M[Z.jet_timer] = (M[Z.jet_timer] - 1) & 0xFF;
  if (M[Z.jet_timer] !== 0) return;
  M[Z.jet_timer] = 0x02; M[Z.jet_moved] = 0;
  step(Z.jet_cell, 1);
  if (M[Z.jet_cell] === 0x64) {
    M[Z.jet_timer] = ((M[Z.rnd3] & 0x3F) + M[Z.jet_delay_base]) & 0xFF;
    M[Z.jet_active] = 0; M[Z.jet_gone] = 0x01;
    return;
  }
  if (M[Z.jet_cell] === M[Z.jet_drop_column]) P.drop_jet_bomb();
  M[Z.jet_moved] = 0x01;
};
// The jet's bomb, under its tail (drop_jet_bomb, $2E4D).
P.drop_jet_bomb = function () {
  const s = M[Z.jet_cell] + 0x2B;
  M[Z.jet_bomb_cell] = s & 0xFF;
  M[Z.jet_bomb_cell + 1] = (M[Z.jet_cell + 1] + (s >> 8)) & 0xFF;
  M[Z.jet_bomb_rows] = 0;
  M[Z.jet_bomb_moved] = 0x01; M[Z.jet_bomb_falling] = 0x01; M[Z.jet_bomb_timer] = 0x01;
};
// The bomb a row down, until its 12th, where it lands (move_jet_bomb, $2E66).
P.move_jet_bomb = function () {
  if (M[Z.jet_bomb_falling] === 0) return;
  M[Z.jet_bomb_moved] = 0;
  M[Z.jet_bomb_rows] = (M[Z.jet_bomb_rows] + 1) & 0xFF;
  if (M[Z.jet_bomb_rows] === 0x0C) return P.end_jet_bomb();
  step(Z.jet_bomb_cell, 0x28);
  M[Z.jet_bomb_moved] = 0x01;
};
// The bomb gone, and the pipe broken under it when it was not shot down and the level's breaks are
// on (enemy_mask bit 4, from level 7) (end_jet_bomb, $2E89).
P.end_jet_bomb = function () {
  M[Z.jet_bomb_moved] = 0; M[Z.jet_bomb_falling] = 0;
  M[at(Z.jet_bomb_cell, 0x28)] = 0x20; M[at(Z.jet_bomb_cell, 0x29)] = 0x20;
  if (M[Z.shot_down] !== 0) return;
  if (!(M[Z.enemy_mask] & 0x10)) return;
  P.break_pipe({ x: (M[Z.jet_bomb_cell] - 1) & 0xFF, y: M[Z.jet_bomb_cell + 1] });
};
// The arrow drawn where it moved, or wiped when it has gone (draw_arrow, $2EAB).
P.draw_arrow = function () {
  if (M[Z.arrow_moved] !== 0) shape(Z.arrow_cell, Z.arrow_colour_cell, 0x2EE8, 7, x => M[0x2EE0 + x], Z.arrow_colour);
  if (M[Z.arrow_gone] === 0) return;
  P.N.wipe += 8;
  for (let x = 7; x >= 0; x--) M[at(Z.arrow_cell, M[0x2EE8 + x])] = 0x20;
  M[Z.arrow_gone] = 0;
};
// The jet's bomb, then the jet, drawn where they moved, or the jet wiped (draw_jet, $2EF0).
P.draw_jet = function () {
  if (M[Z.jet_bomb_moved] !== 0) P.draw_jet_bomb();
  if (M[Z.jet_moved] !== 0) shape(Z.jet_cell, Z.jet_colour_cell, 0x2F38, 0x0B, x => M[0x2F2C + x], Z.jet_colour);
  if (M[Z.jet_gone] === 0) return;
  P.N.wipe += 12;
  for (let x = 0x0B; x >= 0; x--) M[at(Z.jet_cell, M[0x2F38 + x])] = 0x20;
  M[Z.jet_gone] = 0;
};
// The bomb's two characters a row lower, the row above wiped (draw_jet_bomb, $2F44).
P.draw_jet_bomb = function () {
  M[at(Z.jet_bomb_cell, 0)] = 0x20; M[at(Z.jet_bomb_cell, 0x01)] = 0x20;
  M[at(Z.jet_bomb_cell, 0x28)] = 0x73; M[at(Z.jet_bomb_cell, 0x29)] = 0x74;
  const hi = M[Z.jet_bomb_cell + 1];
  M[Z.jet_bomb_cell + 1] = (hi - 0x04) & 0xFF;
  M[at(Z.jet_bomb_cell, 0x29)] = M[Z.jet_bomb_colour]; M[at(Z.jet_bomb_cell, 0x28)] = M[Z.jet_bomb_colour];
  M[Z.jet_bomb_cell + 1] = hi;
};

// The bombs that move in the main loop, by enemy_mask's bits 1 and 3 (move_bombs, $2F6B).
P.move_bombs = function () {
  if (B(Z.enemy_mask) & 0x02) P.move_bouncy_bomb();
  if (B(Z.enemy_mask) & 0x08) P.move_explosive();
};
// Everything an enemy has going stopped (clear_enemies, $2F7E).
P.clear_enemies = function () {
  for (const z of [Z.enemy_mask, Z.bouncy_moved, Z.arrow_moved, Z.jet_moved, Z.jet_bomb_moved, Z.explosive_moved,
    Z.bouncy_active, Z.arrow_active, Z.jet_active, Z.explosive_active, Z.jet_bomb_falling, Z.bouncy_gone]) M[z] = 0;
};
// The bouncy bomb wiped where it was and drawn where it is (draw_bouncy_bomb, $2F99).
P.draw_bouncy_bomb = function () {
  if (M[Z.bouncy_gone] !== 0) {
    P.N.wipe += 6;
    for (let x = 5; x >= 0; x--) M[at(Z.bouncy_old_cell, M[0x2FD4 + x])] = 0x20;
    M[Z.bouncy_gone] = 0;
  }
  if (M[Z.bouncy_moved] === 0) return;
  M[Z.char_counter] = 0x72;
  shape(Z.bouncy_cell, Z.bouncy_colour_cell, 0x2FD4, 5, () => {
    const c = M[Z.char_counter]; M[Z.char_counter] = (c - 1) & 0xFF; return c;
  }, Z.bouncy_colour);
};
// The bouncy bomb, once a pass of the main loop (move_bouncy_bomb, $2FDA): it waits for its timer
// while rnd2 is at or above spawn_threshold, starts at the right on one of seven rows two random
// pairs of bits choose, and bounces left, a row down and a column left each move until its ninth
// row, then up, for 38 moves.
P.move_bouncy_bomb = function () {
  if (M[Z.bouncy_active] === 0) {
    if (B(Z.rnd2) < M[Z.spawn_threshold]) return;
    M[Z.bouncy_timer] = (M[Z.bouncy_timer] - 1) & 0xFF;
    if (M[Z.bouncy_timer] !== 0) return;
    M[Z.bouncy_timer] = B(Z.rnd2) & 0x03;
    const t = (B(Z.rnd1) & 0x03) + M[Z.bouncy_timer];
    M[Z.bouncy_height] = (t + 0x02) & 0xFF;
    const x = (t << 1) & 0xFF;
    M[Z.bouncy_cell] = M[0x3080 + x]; M[Z.bouncy_cell + 1] = M[0x3081 + x];
    M[Z.bouncy_down] = 0x01; M[Z.bouncy_moved] = 0x01; M[Z.bouncy_active] = 0x01;
    M[Z.bouncy_gone] = 0; M[Z.bouncy_steps] = 0;
    return;
  }
  M[Z.bouncy_moved] = 0;
  M[Z.bouncy_old_cell] = M[Z.bouncy_cell]; M[Z.bouncy_old_cell + 1] = M[Z.bouncy_cell + 1];
  M[Z.bouncy_steps] = (M[Z.bouncy_steps] + 1) & 0xFF;
  if (M[Z.bouncy_steps] === 0x26) {
    M[Z.bouncy_timer] = ((B(Z.rnd1) & 0x3F) + M[Z.bouncy_delay_base]) & 0xFF;
    M[Z.bouncy_active] = 0; M[Z.bouncy_gone] = 0x01;
    return;
  }
  if (M[Z.bouncy_down] !== 0) {
    step(Z.bouncy_cell, 0x27);
    M[Z.bouncy_height] = (M[Z.bouncy_height] + 1) & 0xFF;
    if (M[Z.bouncy_height] === 0x09) M[Z.bouncy_down] ^= 0x01;
  } else {
    step(Z.bouncy_cell, -0x29);
    M[Z.bouncy_height] = (M[Z.bouncy_height] - 1) & 0xFF;
    if (M[Z.bouncy_height] === 0) M[Z.bouncy_down] ^= 0x01;
  }
  M[Z.bouncy_moved] = 0x01; M[Z.bouncy_gone] = 0x01;
};
// A break in the pipe at the cell in X, Y (break_pipe, $310B): when the pipe below already has a
// break's character in the ten cells looked at, the pressure falls by two eighths; otherwise the
// twelve characters of break_chars go in at break_cells and it falls by four.
P.break_pipe = function (r) {
  M[Z.break_cell] = r.x; M[Z.break_cell + 1] = r.y;
  for (let x = 9, y = 0x4B; x >= 0; x--, y++) {
    const ch = M[at(Z.break_cell, y)];
    if (ch >= 0xD7 && ch < 0xEA) { P.lose_pressure({ a: 0x02 }); return; }
  }
  for (let x = 0; x !== 0x0C; x++) M[at(Z.break_cell, M[0x314B + x])] = M[0x313F + x];
  P.lose_pressure({ a: 0x04 });
};
// The explosive, once a pass of the main loop (move_explosive, $3157): it waits for its timer
// while rnd1 is at or above spawn_threshold, starts at the right on one of eight rows, flies left
// for 3 to 10 moves, then falls a row down and a column left each move to the pipe, which it
// breaks (explosive_lands).
P.move_explosive = function () {
  if (M[Z.explosive_active] === 0) {
    if (B(Z.rnd1) < M[Z.spawn_threshold]) return;
    M[Z.explosive_timer] = (M[Z.explosive_timer] - 1) & 0xFF;
    if (M[Z.explosive_timer] !== 0) return;
    M[Z.explosive_row] = B(Z.rnd1) & 0x07;
    const x = M[Z.explosive_row] << 1;
    M[Z.explosive_cell] = M[0x31F4 + x]; M[Z.explosive_cell + 1] = M[0x31F5 + x];
    M[Z.explosive_flight] = (((B(Z.rnd0) | io.read(0xFF00)) & 0x07) + 0x03) & 0xFF;
    M[Z.explosive_active] = 0x01; M[Z.explosive_moved] = 0x01; M[Z.explosive_level] = 0x01;
    M[Z.explosive_gone] = 0;
    return;
  }
  M[Z.explosive_moved] = 0;
  M[Z.explosive_old_cell] = M[Z.explosive_cell]; M[Z.explosive_old_cell + 1] = M[Z.explosive_cell + 1];
  if (M[Z.explosive_level] !== 0) {
    M[Z.explosive_flight] = (M[Z.explosive_flight] - 1) & 0xFF;
    if (M[Z.explosive_flight] === 0) M[Z.explosive_level] = 0;
    step(Z.explosive_cell, -1);
    M[Z.explosive_moved] = 0x01; M[Z.explosive_gone] = 0x01;
    return;
  }
  M[Z.explosive_row] = (M[Z.explosive_row] + 1) & 0xFF;
  if (M[Z.explosive_row] === 0x0B) return P.explosive_lands();
  step(Z.explosive_cell, 0x27);
  M[Z.explosive_moved] = 0x01; M[Z.explosive_gone] = 0x01;
};
// The explosive gone, its timer set again, and the pipe broken where it landed unless it was shot
// down (explosive_lands, $31D8).
P.explosive_lands = function () {
  M[Z.explosive_active] = 0; M[Z.explosive_gone] = 0x01;
  M[Z.explosive_timer] = ((B(Z.rnd0) & 0x3F) + M[Z.explosive_delay_base]) & 0xFF;
  if (M[Z.shot_down] !== 0) return;
  P.break_pipe({ x: M[Z.explosive_cell], y: M[Z.explosive_cell + 1] });
};
// The explosive wiped where it was and drawn where it is (draw_explosive, $3204).
P.draw_explosive = function () {
  if (M[Z.explosive_gone] !== 0) {
    P.N.wipe += 6;
    for (let x = 5; x >= 0; x--) M[at(Z.explosive_old_cell, M[0x323F + x])] = 0x20;
    M[Z.explosive_gone] = 0;
  }
  if (M[Z.explosive_moved] === 0) return;
  M[Z.char_counter] = 0x7A;
  shape(Z.explosive_cell, Z.explosive_colour_cell, 0x323F, 5, () => {
    const c = M[Z.char_counter]; M[Z.char_counter] = (c - 1) & 0xFF; return c;
  }, Z.explosive_colour);
};

// An explosion centred two rows above the cell in X, Y (start_explosion, $3278).
P.start_explosion = function (r) {
  const s = r.x - 0x50;
  M[Z.explosion_cell] = s & 0xFF; M[Z.explosion_colour_cell] = s & 0xFF;
  const hi = (r.y - (s < 0 ? 1 : 0)) & 0xFF;
  M[Z.explosion_cell + 1] = hi;
  M[Z.explosion_colour_cell + 1] = (hi - 0x04) & 0xFF;
  M[Z.exploding] = 0x01; M[Z.explosion_shown] = 0x01; M[Z.explosion_timer] = 0x01;
  M[Z.explosion_step] = 0;
};
// The explosion's step every other frame, eight steps (tick_explosion, $3296).
P.tick_explosion = function () {
  if (M[Z.paused] !== 0) return;
  if (M[Z.exploding] === 0) return;
  M[Z.explosion_timer] = (M[Z.explosion_timer] - 1) & 0xFF;
  if (M[Z.explosion_timer] !== 0) return;
  M[Z.explosion_timer] = 0x02;
  M[Z.explosion_step] = (M[Z.explosion_step] + 1) & 0xFF;
  if (M[Z.explosion_step] !== 0x09) return;
  M[Z.explosion_shown] = 0; M[Z.exploding] = 0;
};
// The explosion's ring for its step: the cells of explosion_rings' entry, in its colour, drawn
// with the block character for steps 1 to 4 and wiped with spaces for 5 to 8 (draw_explosion, $32B8).
P.draw_explosion = function () {
  if (M[Z.explosion_shown] === 0) return;
  let x = M[Z.explosion_step];
  M[Z.char_counter] = x < 0x05 ? 0x7B : 0x20;
  const y = (x - 1) & 0xFF, i = (y << 1) & 0xFF;
  M[Z.ring_colour] = M[0x32ED + y];
  M[Z.ring_count] = M[0x330A + i];
  x = M[0x330B + i];
  do {
    P.N.ring++;
    const c = M[(0x32F5 + x) & 0x3FFF];
    M[at(Z.explosion_cell, c)] = M[Z.char_counter];
    M[at(Z.explosion_colour_cell, c)] = M[Z.ring_colour];
    x = (x + 1) & 0xFF;
    M[Z.ring_count] = (M[Z.ring_count] - 1) & 0xFF;
  } while (!(M[Z.ring_count] & 0x80));
};
};
})(typeof window !== 'undefined' ? window : globalThis);
