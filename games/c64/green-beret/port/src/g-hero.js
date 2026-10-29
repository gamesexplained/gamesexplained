// The hero: the stick (read_joystick), his move along the floors, his jumps, falls and ladders, the
// knife's stab and his pose, all run by the interrupt (irq_player); the screen characters at his
// legs and feet and his floor, from the main program; the scroll he pushes (scroll_right) and the
// stage's end it reaches.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.hero = function (P) {
  const M = P.M, B = P.B, io = P.io, N = root.GBNames;
  const { spr_y, hero_bot_y, spr_xlo, hero_xlo, spr_shape, sprite_order, mux_next, stab_hold, jump_state, falling,
    hero_facing, joy, hero_floor_attr, player_pose, pose_timer, pose_index, player_anim_tops, player_anim_bottoms,
    weapon_shown, weapon_pose_offsets, ladder_on, player_pose_starts, pose_anim_starts, pose_dy, pose_dx, pose_x_keep,
    head_row_offset, ptr, ptr_hi, ptr2, fine_scroll, hero_char, hero_floor_char, enemy_top_xhi, enemy_top_xlo,
    enemy_xu, player_xu, joy_raw, fire_last, joy_up_last, jump_used, hero_attr, char_attrs, fall_speed, walk_speed,
    fall_frac, walk_frac, scroll_limit, climbing, jump_joy, jump_index, jump_base, jump_arc, floor_y, hero_floor,
    stage, map_col, map_col_hi, stage_end_hi, stage_end_lo, scroll_pending, idle_time, coarse_due, boss_on,
    floor_counts, stage_boss_counts, boss_count, boss_phase } = N;

  // find_top_sprite ($243E): the last place in the order whose sprite has a Y, into mux_next,
  // where the multiplexer starts its next frame (0 when none has).
  P.find_top_sprite = function () {
    let x = 0x14;
    while (x >= 0 && !B(spr_y + M[sprite_order + x])) x--;
    if (x < 0) x = 0;
    M[mux_next] = x;
    return { x };
  };

  // j_24C2: the frame at Y of the hero's animation (player_anim_tops, the weapon's own frames when
  // he holds one, player_anim_bottoms), the index past it; null at the sequence's end.
  const frame = y => {
    let a = M[player_anim_tops + y];
    if (!a) return null;
    const w = M[weapon_shown];
    if (w) {
      const b = M[player_anim_tops + ((y + M[weapon_pose_offsets + w]) & 255)];
      if (!b) a = M[player_anim_tops + y];
      else a = b;
    }
    M[spr_shape] = a;
    M[spr_shape + 1] = M[player_anim_bottoms + y];
    M[pose_index] = (y + 1) & 255;
    return { y: (y + 1) & 255 };
  };
  // player_pose_start ($252D): pose A, its animation from the start player_pose_starts gives; the
  // top sprite placed against the bottom for the starts that have their own offsets; at an end
  // marker the pose starts again (b_2520).
  const poseStart = a => {
    for (let n = 0; n < 16; n++) {
      M[player_pose] = a;
      const y = M[player_pose_starts + (a & 0x1F)];
      let x = 6;
      while (x > 0 && y !== M[pose_anim_starts + x]) x--;
      M[spr_y] = (B(hero_bot_y) - M[pose_dy + x]) & 255;
      M[spr_xlo] = (B(hero_xlo) + M[pose_dx + x]) & 255;
      M[pose_x_keep] = x;
      const f = frame(y);
      if (f) return f;
      a = B(player_pose);
    }
    throw new Error('player_pose_start: pose ' + a + ' has no frame');
  };
  P.player_pose_start = r => poseStart(r.a);
  // player_pose_set ($2526): pose A at once (pose_timer 1).
  const poseSet = a => { M[pose_timer] = 1; return poseStart(a); };
  P.player_pose_set = r => poseSet(r.a);
  // player_anim_step ($24AF): pose Y stepped every 6 frames, or started when it is new.
  P.player_anim_step = function (r) {
    const y = r.y;
    if (y !== B(player_pose)) return poseSet(y);
    const t = (B(pose_timer) - 1) & 255;
    M[pose_timer] = t;
    if (t) return {};
    M[pose_timer] = 6;
    return frame(B(pose_index)) || poseStart(B(player_pose));
  };
  // b_24F1: the stick at rest, the hero stands facing as before, unless on a ladder or in the air.
  const stand = () => {
    if (B(ladder_on) | B(jump_state) | B(falling)) return {};
    return poseStart(B(hero_facing));
  };
  // b_2502: down on a floor crouches him facing the stick's way, off a ladder; up stands him.
  const crouch = () => {
    if (!(B(joy) & 0x02)) {
      if (!(B(joy) & 0x01)) return {};
      return stand();
    }
    if (B(ladder_on)) return {};
    const d = B(joy) & 0x0C;
    if (d) M[hero_facing] = d;
    return poseSet(B(hero_facing) | 0x02);
  };
  // player_animate ($2485): the stab held counts down, and ends in the jump's pose in the air; the
  // stick at rest stands him; held on a floor whose attributes match it, the walk's or the ladder's
  // pose steps (player_anim_step); otherwise crouch or stand.
  P.player_animate = function () {
    if (B(stab_hold)) {
      const h = (B(stab_hold) - 1) & 255;
      M[stab_hold] = h;
      if (h) return {};
      if (!(B(jump_state) | B(falling))) return {};
      return poseStart(B(hero_facing) | 0x01);
    }
    if (!B(joy)) return stand();
    if (B(jump_state) | B(falling)) return {};
    let a = B(hero_floor_attr) & B(joy);
    if (!a) return crouch();
    let y = a;
    if (B(joy) & 0x02) {
      a = B(hero_floor_attr) & 0x02;
      if (!a) return crouch();
      y = a;
    }
    return P.player_anim_step({ y });
  };

  // The screen row of a Y: ptr2 its Y in eights, ptr and ptr_hi its address in the screen at
  // $4000 (Y / 8 x 40, worked out as the game does).
  const rowAt = v => {
    const r8 = v & 0xF8;
    M[ptr2] = r8;
    const a = 0x4000 + r8 * 5;
    M[ptr] = a & 255; M[ptr_hi] = a >> 8;
    return a;
  };
  P.rowAt = rowAt;
  // hero_chars ($2795): the character level with the hero's legs (the row of his bottom Y less
  // head_row_offset, the column of his X less 10 and the fine scroll) into hero_char, and the one
  // a row below, his floor, into hero_floor_char.
  P.hero_chars = function () {
    const a = rowAt((B(hero_bot_y) - M[head_row_offset]) & 255);
    const y = (((B(hero_xlo) - 0x0A - B(fine_scroll)) & 255) >> 3);
    M[hero_char] = M[a + y];
    M[hero_floor_char] = M[(a + y + 0x28) & 0xFFFF];
    return { a: M[hero_floor_char], y: y + 0x28 };
  };
  // sprites_to_units ($28B1): X in units (halved) for the twenty sprites from the first enemy's
  // top, and the hero's from his bottom sprite.
  P.sprites_to_units = function () {
    for (let x = 0x13; x >= 0; x--) M[enemy_xu + x] = ((M[enemy_top_xhi + x] & 1) << 7) | (M[enemy_top_xlo + x] >> 1);
    const a = B(hero_xlo) >> 1;
    M[player_xu] = a;
    return { a, x: 0xFF };
  };

  // read_joystick ($28C9): the stick's five lines into joy_raw, and into joy with fire only on the
  // frame it changes; then hero_attrs.
  P.read_joystick = function () {
    const raw = (io.ciaRead(0x00) ^ 0xFF) & 0x1F;
    M[joy_raw] = raw;
    if ((raw & 0x10) !== M[fire_last]) {
      M[joy] = raw;
      M[fire_last] = raw & 0x10;
    } else M[joy] = raw & 0x0F;
    return P.hero_attrs();
  };
  // hero_attrs ($28F0): up let go or pressed again allows a jump (jump_used); the attributes of
  // hero_floor_char and hero_char (char_attrs, 0 below $C8).
  P.hero_attrs = function () {
    const u = M[joy] & 0x01;
    if (u !== M[joy_up_last]) { M[joy_up_last] = u; M[jump_used] = 0; }
    M[hero_floor_attr] = 0; M[hero_attr] = 0;
    let c = M[hero_floor_char];
    if (c >= 0xC8) M[hero_floor_attr] = M[char_attrs + c - 0xC8];
    c = M[hero_char];
    if (c >= 0xC8) { M[hero_attr] = M[char_attrs + c - 0xC8]; return { a: M[hero_attr], x: c - 0xC8 }; }
    return { a: c };
  };

  // player_fall ($2965): the fall's first frame starts it; each frame 4 lines down (and the carry
  // of fall_speed into fall_frac), on in his facing; on a floor character he lands, his feet on
  // the row.
  P.player_fall = function () {
    const f = M[falling];
    if (f) {
      M[fall_speed] = f;
      if (M[hero_floor_char] >= 0xC8) {
        const y = (((M[spr_y] - 4) & 0xF8) | 0x05) & 255;
        M[spr_y] = y; M[hero_bot_y] = (y + 0x15) & 255;
        M[falling] = 0;
        M[walk_speed] = 0x80; M[jump_used] = 0x80;
        return { a: 0x80 };
      }
    } else {
      M[falling] = 1; M[fall_speed] = 0x80; M[walk_speed] = 0;
    }
    const s = M[fall_speed] + M[fall_frac];
    M[fall_frac] = s & 255;
    const y = (M[spr_y] + 4 + (s > 255 ? 1 : 0)) & 255;
    M[spr_y] = y; M[hero_bot_y] = (y + 0x15) & 255;
    const a = M[hero_facing];
    return walkOn(a, a);
  };
  // player_move ($29BE): falling, the fall; the stick at rest, a jump goes on, or he falls with
  // nothing under his feet; held, a jump goes on, he falls off a floor's edge, walks (left or right
  // alone) or acts (player_action).
  P.player_move = function () {
    if (M[falling]) return P.player_fall();
    const j = M[joy];
    if (!j) {
      if (M[jump_state]) return jumpOn();
      if (M[hero_floor_char] < 0xC8) return P.player_fall();
      return jumpOn();
    }
    if (M[jump_state]) return jumpOn();
    if (M[hero_floor_char] < 0xC8) return P.player_fall();
    if (!(j & 0x13)) return P.player_walk();
    return P.player_action();
  };
  // j_2ACC: a jump goes on.
  const jumpOn = () => (M[jump_state] ? P.player_jump() : { a: 0 });
  // player_walk ($29F2): not while a stab is held; the stick's left or right as the floor allows.
  P.player_walk = function () {
    if (M[stab_hold]) return {};
    const a = M[joy] & M[hero_floor_attr];
    return walkOn(a, a);
  };
  // j_29FE: right (bit 3 of A) by a pixel, and another when walk_speed carries into walk_frac,
  // until the scroll's limit, where he pushes the screen (scroll_right) instead; left (bit 2 of Y)
  // the same down to X $20; otherwise a jump goes on.
  const walkOn = (a, y) => {
    if (a & 0x08) {
      if (M[spr_xlo] >= M[scroll_limit]) { P.scroll_right(); return right(); }
      const s = M[walk_speed] + M[walk_frac];
      M[walk_frac] = s & 255;
      if (s > 255) { stepRight(); right(); }
      stepRight();
      return right();
    }
    if (!(y & 0x04)) return jumpOn();
    if (M[spr_xlo] < 0x20) return {};
    const s = M[walk_speed] + M[walk_frac];
    M[walk_frac] = s & 255;
    if (s > 255) stepLeft();
    return stepLeft();
  };
  const stepRight = () => { M[spr_xlo] = (M[spr_xlo] + 1) & 255; M[hero_xlo] = (M[hero_xlo] + 1) & 255; };
  // j_2A53: off any ladder, facing right.
  const right = () => { M[climbing] = 0; M[ladder_on] = 0; M[hero_facing] = 0x08; return { a: 0x08 }; };
  // b_2A3C: a pixel left, off any ladder, facing left.
  const stepLeft = () => {
    M[spr_xlo] = (M[spr_xlo] - 1) & 255; M[hero_xlo] = (M[hero_xlo] - 1) & 255;
    M[climbing] = 0; M[ladder_on] = 0; M[hero_facing] = 0x04;
    return { a: 0x04 };
  };
  // player_stab ($2A61): off a ladder, the stab held for 5 frames; down on a floor a crouching stab
  // in his facing (+$12) or the stick's way; otherwise a standing stab (+$10), or one the stick's
  // way on the ground. The knife's hit test runs with the pose before it is set.
  P.player_stab = function () {
    if (M[ladder_on]) return action2();
    M[stab_hold] = 5;
    let a;
    if ((M[joy] & 0x02) && !(M[jump_state] | M[falling])) {
      if (!(M[joy] & 0x0C)) a = M[hero_facing] | 0x12;
      else { M[hero_facing] = M[joy] & 0x0C; a = M[joy] & 0x1E; }
    } else if (!(M[jump_state] | M[falling]) && (M[joy] & 0x0C)) a = M[joy] & 0x1C;
    else a = M[hero_facing] | 0x10;
    P.knife_hit_test({ a });
    return poseStart(a);
  };
  // player_action ($2AD2): fire stabs; otherwise b_2AD9.
  P.player_action = function () {
    if (M[joy] & 0x10) return P.player_stab();
    return action2();
  };
  // b_2AD9: a jump goes on; a ladder's attribute level with his legs or under his feet that
  // matches the stick, or a climb under way, climbs; up, pressed again since the last jump, jumps
  // (from his bottom Y less the arc's top, jump_base), and up held walks.
  const action2 = () => {
    if (M[jump_state]) return P.player_jump();
    let a = M[hero_attr] & 0x03;
    if (a) { if (a & M[joy]) return P.player_ladder(); }
    else {
      a = M[hero_floor_attr] & 0x03;
      if (a && (a & M[joy])) return P.player_ladder();
    }
    if (M[climbing]) return P.player_ladder();
    if (!(M[joy] & 0x01)) return { a: 0 };
    if (M[jump_used]) return P.player_walk();
    M[jump_state] = 1; M[jump_used] = 1;
    M[jump_joy] = M[joy];
    if (M[joy] & 0x0C) M[hero_facing] = M[joy] & 0x0C;
    poseSet(M[hero_facing] | 0x01);
    M[jump_index] = 0x14;
    M[jump_base] = (M[hero_bot_y] - M[jump_arc + 0x14]) & 255;
    return P.player_jump();
  };
  // player_jump ($2B3F): a ladder level with his legs that matches the stick catches him; otherwise
  // his bottom Y follows jump_arc from jump_base, the index down to 0 rising and back up to $14
  // falling, after which he falls; fire stabs in the air; the stick's left or right at the jump's
  // start carries him on.
  P.player_jump = function () {
    const a = M[hero_attr] & 0x03;
    if (a && (a & M[joy])) {
      const y = (((M[spr_y] - 4) & 0xF8) | 0x05) & 255;
      M[spr_y] = y; M[hero_bot_y] = (y + 0x15) & 255;
      return P.player_ladder();
    }
    let y = M[jump_index];
    const b = (M[jump_base] + M[jump_arc + y]) & 255;
    M[hero_bot_y] = b; M[spr_y] = (b - 0x15) & 255;
    if (M[jump_state] & 0x80) {
      y++;
      if (y >= 0x15) { M[jump_state] = 0; M[jump_used] = 1; M[falling] = 1; }
      else M[jump_index] = y;
    } else {
      y--;
      if (y < 0) { M[jump_state] = 0x80; y = 0; }
      M[jump_index] = y;
    }
    if (M[joy] & 0x10) return P.player_stab();
    const d = M[jump_joy] & 0x0C;
    if (!d) return { a: 0 };
    return walkOn(d, d);
  };
  // player_ladder ($2BA8): up with a ladder up level with his legs, 2 lines up; up without one, a
  // row higher for the ladder's top (head_row_offset $1B) before giving up, when up counts as used
  // and he walks; down with a ladder down under his feet, 2 lines down.
  P.player_ladder = function () {
    const y = M[joy] & 0x03;
    if (y & M[hero_attr] & 0x01) return climbUp();
    if (!(M[hero_attr] & 0x01) && (y & 0x01)) {
      if (M[head_row_offset] === 0x1B) return rowBack();
      if (M[hero_char] < 0xC8) {
        M[head_row_offset] = 0x2A;
        M[joy_up_last] = 1; M[jump_used] = 1;
        return P.player_walk();
      }
      M[head_row_offset] = 0x1B;
      return climbUp();
    }
    if (!(y & M[hero_floor_attr] & 0x02)) return rowBack();
    M[spr_y] = (M[spr_y] + 2) & 255; M[hero_bot_y] = (M[hero_bot_y] + 2) & 255;
    M[jump_state] = 0; M[ladder_on] = 1; M[climbing] = 1;
    return rowBack();
  };
  // j_2BB5: 2 lines up, on the ladder.
  const climbUp = () => {
    M[spr_y] = (M[spr_y] - 2) & 255; M[hero_bot_y] = (M[hero_bot_y] - 2) & 255;
    M[jump_state] = 0; M[climbing] = 1; M[ladder_on] = 1;
    return { a: 1 };
  };
  // b_2C0A: the row level with his legs back to $2A below his bottom.
  const rowBack = () => { M[head_row_offset] = 0x2A; return { a: 0x2A }; };
  // hero_init ($391C): standing (pose and pose timer 3) facing right at X $40 on the bottom floor
  // (top Y $CD), the scroll's limit $88, walk speed $80.
  P.hero_init = function () {
    M[player_pose] = 3; M[pose_timer] = 3;
    M[hero_facing] = 0x08;
    M[scroll_limit] = 0x88;
    M[spr_xlo] = 0x40; M[hero_xlo] = 0x40;
    M[spr_y] = 0xCD; M[hero_bot_y] = 0xCD + 0x15;
    M[walk_speed] = 0x80;
    return rowBack();
  };
  // hero_floor_find ($222E): the floor (floor_y) whose Y his top Y is, into hero_floor.
  P.hero_floor_find = function () {
    const a = B(spr_y);
    for (let x = 2; x >= 0; x--) if (a === M[floor_y + x]) { M[hero_floor] = x; return { x }; }
    return { x: 0xFF };
  };

  // scroll_right ($34F7): at the stage's end column the fight is set up (stage_end_reached);
  // otherwise the scroll moves by the hero's walk (a pixel, and another when walk_speed carries):
  // scroll_pending counts the pixels for the main loop, the fine scroll counts down, and at each
  // character a shift is due (coarse_due) and idle_time comes down by one.
  P.scroll_right = function () {
    const s = M[stage];
    if (M[map_col_hi] === M[stage_end_hi + s] && M[map_col] === M[stage_end_lo + s]) return P.stage_end_reached();
    const t = M[walk_speed] + M[walk_frac];
    M[walk_frac] = t & 255;
    if (t > 255) scrollPixel();
    return scrollPixel();
  };
  const scrollPixel = () => {
    M[scroll_pending] = (M[scroll_pending] + 1) & 255;
    let y = M[fine_scroll] - 1;
    if (y < 0) {
      if (M[idle_time] >= 1) M[idle_time] = M[idle_time] - 1;
      M[coarse_due] = (M[coarse_due] + 1) & 255;
      y = 7;
    }
    M[fine_scroll] = y;
    return { y };
  };
  // stage_end_reached ($3540): once, the floors' counts filled so that no more enemies come, the
  // scroll's limit $E0 so that the hero walks on to the fight, the fight's count (stage_boss_counts)
  // and the alarm (tune $47).
  P.stage_end_reached = function () {
    if (M[boss_on]) return {};
    M[floor_counts] = 6;
    if (M[scroll_limit] === 0xE0) return {};
    M[scroll_limit] = 0xE0; M[floor_counts + 1] = 0xE0; M[floor_counts + 2] = 0xE0;
    M[boss_count] = M[stage_boss_counts + M[stage]];
    P.tune_start({ y: 0x47 });
    M[boss_phase] = 0;
    return { a: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
