// Tex: his moves and speed (move_tex, move_divider, set_speed), his drawing and the hole under him
// (draw_tex, erase_tex, check_hole), the jump (start_jump, step_jump), the bullet (fire_bullet,
// move_bullet, bullet_stop), his death (tex_death, turn_tex, sink_tex) and the play area cleared.
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).tex = function (P) {
const M = P.M, Z = P.Z, T = P.T;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;
// a pointer in zero page moved on by d, -255 to 255, as the game's 16-bit ADC or SBC does
const step = (z, d) => {
  const s = M[z] + d;
  M[z] = s & 0xFF;
  M[z + 1] = (M[z + 1] + (s > 0xFF ? 1 : s < 0 ? -1 : 0)) & 0xFF;
};

// Tex in play, once a frame from irq_field (move_tex, $1DC3): right or left a column every third
// frame either is held (move_divider), within columns 1 to 27 and not into a blocked side, his
// speed from the column; a jump when up is held and he did not move; a shot when fire is held and
// none is flying; then drawn, and his jump stepped on.
P.move_tex = function () {
  if (M[Z.paused] !== 0) return;
  if (M[Z.controls_off] === 0) {
    M[Z.tex_moved] = 0;
    if (M[Z.jumping] === 0) {
      if ((M[Z.ctl_right] & 0x80) && P.move_divider().c && M[Z.right_blocked] === 0 && M[Z.tex_cell] !== 0xC3) {
        M[Z.tex_moved] = 0x01;
        P.erase_tex();
        step(Z.tex_cell, 1);
        M[Z.left_blocked] = 0;
        P.set_speed();
      }
      if ((M[Z.ctl_left] & 0x80) && P.move_divider().c && M[Z.left_blocked] === 0 && M[Z.tex_cell] !== 0xA9) {
        M[Z.tex_moved] = 0x01;
        P.erase_tex();
        step(Z.tex_cell, -1);
        M[Z.right_blocked] = 0;
        P.set_speed();
      }
    }
    if (M[Z.tex_moved] === 0 && (M[Z.ctl_up] & 0x80)) P.start_jump();
    if ((M[Z.ctl_fire] & 0x80) && M[Z.bullet_flying] === 0) P.fire_bullet();
    P.draw_tex();
  }
  P.step_jump();
};
// The carry set every third call (move_divider, $1E49).
P.move_divider = function () {
  M[Z.move_timer] = (M[Z.move_timer] - 1) & 0xFF;
  if (M[Z.move_timer] !== 0) return { c: 0 };
  M[Z.move_timer] = 0x03;
  return { c: 1 };
};
// Tex's column sets the speed, the pipe's and the skyline's and his legs' pace, from the eight
// columns in speed_columns (set_speed, $1E55).
P.set_speed = function () {
  const cell = M[Z.tex_cell];
  for (let x = 7; x >= 0; x--) {
    if (cell !== M[0x1E79 + x]) continue;
    M[Z.speed] = x;
    M[Z.pipe_speed] = M[0x1E81 + x]; M[Z.skyline_speed] = M[0x1E89 + x]; M[Z.leg_delay] = M[0x1E91 + x];
    M[Z.leg_timer] = 0x01;
    return;
  }
};
// Tex's 15 characters, $40 on, at tex_cell by the layout table the LDY at $1EAD reads (tex_layout,
// or tex_lying_layout while he dies), in tex_colour; tex_hit set to the operand at $1EB7 (1) when
// one of them lands on a character from $5C, an enemy's (draw_tex, $1E99).
P.draw_tex = function () {
  M[Z.tex_colour_cell] = M[Z.tex_cell];
  M[Z.tex_colour_cell + 1] = (M[Z.tex_cell + 1] - 0x04) & 0xFF;
  P.check_hole();
  M[Z.char_counter] = 0x40;
  const layout = M[T.tex_layout_operand] | M[T.tex_layout_operand + 1] << 8;
  for (let x = 0; x !== 0x0F; x++) {
    const y = M[(layout + x) & 0x3FFF], a = at(Z.tex_cell, y);
    if (M[a] >= 0x5C) M[Z.tex_hit] = M[T.tex_hit_value];
    M[a] = M[Z.char_counter];
    M[at(Z.tex_colour_cell, y)] = M[Z.tex_colour];
    M[Z.char_counter] = (M[Z.char_counter] + 1) & 0xFF;
  }
};
// Tex's 15 characters set to spaces, by the layout table the LDY at $1ECE reads (erase_tex, $1ECA).
P.erase_tex = function () {
  const layout = M[T.erase_layout_operand] | M[T.erase_layout_operand + 1] << 8;
  for (let x = 0x0E; x >= 0; x--) M[at(Z.tex_cell, M[(layout + x) & 0x3FFF])] = 0x20;
};
// The pipe five rows under tex_cell: a break's characters ($D9-$E9, but $DB and $DD) set tex_hit
// and tex_falling to the operand at $1EEC (1) (check_hole, $1ED7).
P.check_hole = function () {
  const ch = M[at(Z.tex_cell, 0xC8)];
  if (ch < 0xD9 || ch === 0xDB || ch === 0xDD || ch >= 0xEA) return;
  const v = M[T.hole_hit_value];
  M[Z.tex_hit] = v; M[Z.tex_falling] = v;
};
// A jump begins, unless he is falling or in one (start_jump, $212B).
P.start_jump = function () {
  if (M[Z.tex_falling] !== 0 || M[Z.jumping] !== 0) return;
  M[Z.jumping] = 0x01; M[Z.jump_timer] = 0x01; M[Z.jump_steps] = 0x0A;
};
// The jump a row every other frame: five up, five down, then over (step_jump, $213E).
P.step_jump = function () {
  if (M[Z.jumping] === 0) return;
  M[Z.jump_timer] = (M[Z.jump_timer] - 1) & 0xFF;
  if (M[Z.jump_timer] !== 0) return;
  M[Z.jump_timer] = 0x02;
  M[Z.jump_steps] = (M[Z.jump_steps] - 1) & 0xFF;
  if (M[Z.jump_steps] & 0x80) { M[Z.jumping] = 0; return; }
  P.erase_tex();
  let down = M[Z.jump_steps] < 0x05;
  if (down) { step(Z.tex_cell, 0x28); down = !(M[Z.tex_cell + 1] & 0x80); }   // BPL to b_2173
  if (!down) step(Z.tex_cell, -0x28);
  P.draw_tex();
};

// A shot from Tex's hand, two rows down and two columns on, unless an explosion is going
// (fire_bullet, $1FEC).
P.fire_bullet = function () {
  if (M[Z.exploding] !== 0) return;
  M[Z.bullet_flying] = 0x01; M[Z.bullet_timer] = 0x01;
  const s = M[Z.tex_cell] + 0x52;
  M[Z.bullet_cell] = s & 0xFF;
  M[Z.bullet_cell + 1] = (M[Z.tex_cell + 1] + (s >> 8)) & 0xFF;
  P.shot_sound();
};
// The bullet a column right each frame, from irq_frame (move_bullet, $2008). It stops on the
// screen's zero bytes beyond the right edge (bullet_stop), passes over anything below $5C, and
// hits what it meets from $5C: the arrow ($5C-$62), the bouncy bomb ($63-$72), the jet's bomb
// ($73-$74) or the explosive ($75-$7A), each with its points and an explosion; a hit that scores
// sounds and fills three eighths of % COMPLETED.
P.move_bullet = function () {
  if (M[Z.paused] !== 0) return;
  if (M[Z.bullet_flying] === 0) return;
  M[Z.bullet_timer] = (M[Z.bullet_timer] - 1) & 0xFF;
  if (M[Z.bullet_timer] === 0) M[Z.bullet_timer] = 0x01;
  P.bullet_stop();
  M[at(Z.bullet_cell, 0)] = 0x20;
  step(Z.bullet_cell, 1);
  const ch = M[at(Z.bullet_cell, 0)];
  if (ch === 0) return done();
  if (ch < 0x5C) {
    M[at(Z.bullet_cell, 0)] = 0x52;
    const hi = M[Z.bullet_cell + 1];
    M[Z.bullet_cell + 1] = (hi - 0x04) & 0xFF;
    M[at(Z.bullet_cell, 0)] = M[Z.tex_colour];
    M[Z.bullet_cell + 1] = hi;
    return;
  }
  M[Z.hit_char] = ch;
  if (ch < 0x63) {                                         // the arrow: 25 points
    M[Z.arrow_active] = 0; M[Z.arrow_moved] = 0;
    M[Z.arrow_gone] = 0x01; M[Z.scored] = 0x01;
    M[Z.arrow_timer] = ((M[Z.rnd1] & 0x3F) + M[Z.arrow_delay_base]) & 0xFF;
    P.add_score({ a: 0x02, y: 0x04 });
    P.add_score_units({ a: 0x05 });
    P.start_explosion({ x: M[Z.arrow_cell], y: M[Z.arrow_cell + 1] });
  } else if (ch < 0x73) {                                  // the bouncy bomb: 50 points
    M[Z.bouncy_active] = 0; M[Z.bouncy_moved] = 0;
    M[Z.bouncy_old_cell] = M[Z.bouncy_cell]; M[Z.bouncy_old_cell + 1] = M[Z.bouncy_cell + 1];
    M[Z.bouncy_gone] = 0x01; M[Z.scored] = 0x01;
    M[Z.bouncy_timer] = ((M[Z.rnd2] & 0x3F) + M[Z.bouncy_delay_base]) & 0xFF;
    P.add_score({ a: 0x05, y: 0x04 });
    P.start_explosion({ x: M[Z.bouncy_cell], y: M[Z.bouncy_cell + 1] });
  } else if (ch < 0x75) {                                  // the jet's bomb: 250 points
    M[Z.shot_down] = 0x01;
    P.end_jet_bomb();
    M[Z.shot_down] = (M[Z.shot_down] - 1) & 0xFF;
    P.add_score({ a: 0x02, y: 0x03 });
    P.add_score({ a: 0x05, y: 0x04 });
    M[Z.scored] = 0x01;
    P.start_explosion({ x: M[Z.jet_bomb_cell], y: M[Z.jet_bomb_cell + 1] });
  } else if (ch < 0x7B) {                                  // the explosive: 200 points
    M[Z.shot_down] = 0x01;
    M[Z.explosive_old_cell] = M[Z.explosive_cell]; M[Z.explosive_old_cell + 1] = M[Z.explosive_cell + 1];
    P.explosive_lands();
    M[Z.shot_down] = 0; M[Z.explosive_moved] = 0;
    M[Z.scored] = 0x01;
    P.add_score({ a: 0x02, y: 0x03 });
    P.start_explosion({ x: M[Z.explosive_cell], y: M[Z.explosive_cell + 1] });
  } else M[Z.scored] = 0;
  done();
  function done() {                                        // b_2045
    M[Z.bullet_flying] = 0;
    if (M[Z.scored] !== 0) { P.hit_sound(); P.add_completed({ a: 0x03 }); }
    M[Z.scored] = 0;
  }
};
// Zeros at the seven places in stop_rows beyond the right edge of the play field's rows, where a
// bullet stops (bullet_stop, $2116).
P.bullet_stop = function () {
  for (let x = 6; x >= 0; x--) M[(0x0E57 + M[0x2124 + x]) & 0x3FFF] = 0;
};

// Tex's death, once a frame from irq_field while tex_hit is set (tex_death, $2406). At its start
// the enemies are stopped and cleared, his characters saved at $0400 and turned on their side
// (turn_tex), and the lying layout put into draw_tex's and erase_tex's LDY; then every other frame
// he sinks a pixel (sink_tex), 23 times; then he is put back, a life taken (the two DECs at $249D
// and $24A0, which Plus/4 World's poke makes loads), and the pipe laid again, which lets the next
// interrupt in. With no life left the game is over.
P.tex_death = function* () {
  if (M[Z.menu_on] !== 0) return;
  if (M[Z.tex_hit] === 0) return;
  if (M[Z.game_ended] !== 0) return over();
  if (M[Z.dying] === 0) {
    M[Z.saved_mask] = M[Z.enemy_mask]; M[Z.enemy_mask] = 0;
    M[Z.dying] = 0x01; M[Z.legs_still] = 0x01; M[Z.sink_timer] = 0x01;
    M[Z.sink_steps] = 0x18;
    P.erase_tex();
    for (let x = 0; x !== 0xA8; x++) M[0x0400 + x] = M[0x3E00 + x];
    M[T.tex_layout_operand] = 0x97; M[T.erase_layout_operand] = 0x97;
    M[T.tex_layout_operand + 1] = 0x19; M[T.erase_layout_operand + 1] = 0x19;
    M[Z.controls_off] = 0x01;
    P.turn_tex(); P.clear_enemies(); P.clear_play_area(); P.draw_tex();
  }
  P.draw_tex();
  M[Z.sink_timer] = (M[Z.sink_timer] - 1) & 0xFF;
  if (M[Z.sink_timer] !== 0) return;
  M[Z.sink_timer] = 0x02;
  M[Z.sink_steps] = (M[Z.sink_steps] - 1) & 0xFF;
  if (M[Z.sink_steps] !== 0) { P.sink_tex(); return; }
  P.erase_tex();
  for (let x = 0; x !== 0xA8; x++) M[0x3E00 + x] = M[0x0400 + x];
  M[T.tex_layout_operand] = 0x88; M[T.erase_layout_operand] = 0x88;
  M[T.tex_layout_operand + 1] = 0x19; M[T.erase_layout_operand + 1] = 0x19;
  M[Z.legs_still] = 0; M[Z.tex_hit] = 0; M[Z.dying] = 0; M[Z.tex_falling] = 0;
  if (M[T.digit_dec] === 0xCE) M[0x0C65] = (M[0x0C65] - 1) & 0xFF;
  if (M[T.lives_dec] === 0xC6) M[Z.lives] = (M[Z.lives] - 1) & 0xFF;
  if (M[Z.lives] === 0) return over();
  M[Z.tex_cell] = 0xA9; M[Z.tex_cell + 1] = 0x0E;
  M[Z.speed] = 0; M[Z.right_blocked] = 0; M[Z.game_ended] = 0; M[Z.controls_off] = 0;
  M[Z.left_blocked] = 0x01;
  P.refill_pipe();
  yield { cp: 0x24BD };
  M[Z.demo_ran] = 0;
  M[Z.enemy_mask] = M[Z.saved_mask];
  function over() { M[Z.game_ended] = 0x01; M[Z.controls_off] = 0x01; }   // j_24C6
};
// Tex's 15 characters at $3E00-$3E77 turned a quarter, each 8 by 8 through turn_buffer (turn_tex, $23CE).
P.turn_tex = function () {
  M[Z.work_ptr] = 0; M[Z.work_ptr + 1] = 0x3E;
  do {
    for (let x = 7; x >= 0; x--) {
      for (let y = 7; y >= 0; y--) {
        const a = at(Z.work_ptr, y), v = M[a];
        M[a] = v >> 1;
        M[0x23FE + x] = (M[0x23FE + x] << 1 | (v & 1)) & 0xFF;
      }
    }
    for (let y = 7; y >= 0; y--) M[at(Z.work_ptr, y)] = M[0x23FE + y];
    M[Z.work_ptr] = (M[Z.work_ptr] + 0x08) & 0xFF;
  } while (M[Z.work_ptr] !== 0x78);
};
// Tex's lying characters a pixel lower each, and the pipe and skyline slowed every other step
// (sink_tex, $24CD).
P.sink_tex = function () {
  if ((M[Z.sink_steps] & 0x01) === 0 && M[Z.pipe_speed] !== 0) {
    M[Z.pipe_speed] = (M[Z.pipe_speed] - 1) & 0xFF;
    M[Z.skyline_speed] = M[Z.pipe_speed] >> 1;
  }
  M[0x3E00] = 0; M[0x3E18] = 0; M[0x3E30] = 0; M[0x3E48] = 0; M[0x3E60] = 0;
  for (let x = 0x16; x >= 0; x--) {
    M[0x3E01 + x] = M[0x3E00 + x]; M[0x3E19 + x] = M[0x3E18 + x]; M[0x3E31 + x] = M[0x3E30 + x];
    M[0x3E49 + x] = M[0x3E48 + x]; M[0x3E61 + x] = M[0x3E60 + x];
  }
};
// The play field's 14 rows from $0D40, 39 columns, to spaces in tex_colour (clear_play_area, $192E).
P.clear_play_area = function () {
  M[Z.row_ptr] = 0x40; M[Z.colour_ptr] = 0x40;
  M[Z.row_ptr + 1] = 0x0D; M[Z.colour_ptr + 1] = 0x09;
  for (let x = 0x0D; x >= 0; x--) {
    for (let y = 0x26; y >= 0; y--) { M[at(Z.row_ptr, y)] = 0x20; M[at(Z.colour_ptr, y)] = M[Z.tex_colour]; }
    const s = M[Z.row_ptr] + 0x28;
    M[Z.row_ptr] = s & 0xFF; M[Z.colour_ptr] = s & 0xFF;
    M[Z.row_ptr + 1] = (M[Z.row_ptr + 1] + (s >> 8)) & 0xFF;
    M[Z.colour_ptr + 1] = (M[Z.row_ptr + 1] - 0x04) & 0xFF;
  }
};
};
})(typeof window !== 'undefined' ? window : globalThis);
