// Where the enemies come from: five random lanes, each ready after its own count of frames
// (spawn_timers) with the type and side the difficulty gives (lane_types, lane_sides), brought in on
// the hero's floor or the next with room (random_spawn); the map's own 60, each at its column
// (scripted_spawn); and the Missile Base's lorry, which crosses before its fight (lorry_update).
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.spawn = function (P) {
  const M = P.M, B = P.B, N = root.GBNames;
  const { boss_phase, lorry_started, lorry_speed, wheel_timer, boss_count, lorry_colours, lorry_shapes,
    enemy_top_colour, enemy_top_shape, enemy_bot_shape, enemy_bot_colour, floor_y, enemy_top_y, enemy_bot_y,
    enemy_top_xlo, enemy_top_xhi, enemy_bot_xlo, enemy_bot_xhi, enemy_xu, floor_counts, enemy_wait, enemy_timer,
    enemy_floor, enemy_anim_state, lane_ready, lane_timer, difficulty, lane_types, lane_type, lane_reload,
    spawn_lane, enemy_count, spawn_pending, spawn_floor, spawn_type, spawn_offsets, spawn_speed, enemy_speed,
    enemy_type, type_top_colours, type_bot_colours, type_top_shapes, type_bot_shapes, type_hold_times,
    enemy_active, enemy_facing, spawn_wait, enemy_hit, enemy_dying, spawn_entry, enemy_entry, enemy_dir, stage,
    stage_spawn_first, stage_spawn_end, spawn_done, map_col_hi, map_col, spawn_col_hi, spawn_col_lo, spawn_types,
    spawn_floors, spawn_dy_top, spawn_dy_bot, spawn_dx_top, spawn_dx_bot, type_speeds, hero_floor, spawn_tries,
    lane_sides, edge_x_hi, edge_x_lo, x_save, fine_scroll, work, edge_row_lo, edge_row_hi, ptr, ptr_hi,
    char_attrs } = N;
  // The Y lists are in zero page, where an index past their end wraps round in the page.
  const Z = a => a & 255;

  // lorry_update ($1C0C): before the Missile Base's fight. The first time: speed 6, 18 soldiers to
  // come (boss_count $11), the tune ($4D), and the lorry's nine sprites (three columns of three,
  // lorry_shapes and lorry_colours) at the left edge, $19 lines above the bottom floor. Then each
  // frame its wheels and its columns move right, each once the one ahead is $0A units in, slowing
  // to 4, 3 and 2 as the last column passes $32, $5A and $78 units; past $AA the fight starts
  // (boss_phase) and the lorry's sprites go.
  P.lorry_update = function () {
    if (B(boss_phase)) return {};
    if (!M[lorry_started]) {
      M[lorry_started] = (M[lorry_started] + 1) & 255;
      M[lorry_speed] = 6;
      M[wheel_timer] = 1;
      M[boss_count] = 0x11;
      P.tune_start({ y: 0x4D });
      let y = 8;
      for (let x = 2; x >= 0; x--) {
        M[enemy_top_colour + x] = M[lorry_colours + y];
        M[enemy_top_shape + x] = M[lorry_shapes + y];
        y--;
        M[enemy_top_shape + 3 + x] = M[lorry_shapes + y];
        M[enemy_top_colour + 3 + x] = M[lorry_colours + y];
        y--;
        M[enemy_bot_shape + x] = M[lorry_shapes + y];
        M[enemy_bot_colour + x] = M[lorry_colours + y];
        y--;
      }
      for (let x = 2; x >= 0; x--) {
        let a = (M[floor_y] - 0x19) & 255;
        M[enemy_top_y + x] = a;
        a = (a + 0x15) & 255; M[enemy_top_y + 3 + x] = a;
        a = (a + 0x15) & 255; M[enemy_bot_y + x] = a;
        M[enemy_top_xlo + x] = 0; M[enemy_top_xhi + x] = 0;
        M[enemy_top_xlo + 3 + x] = 0; M[enemy_top_xhi + 3 + x] = 0;
        M[enemy_bot_xlo + x] = 0; M[enemy_bot_xhi + x] = 0;
      }
    }
    if (B(boss_phase)) return {};
    P.lorry_wheels();
    const column = c => {
      const v = M[enemy_top_xlo + c] + M[lorry_speed];
      for (let k = 0; k < 9; k += 3) M[enemy_top_xlo + c + k] = v & 255;
      if (v > 255) for (let k = 0; k < 9; k += 3) M[enemy_top_xhi + c + k] = 1;
    };
    column(0);
    if (M[enemy_xu] < 0x0A) return {};
    column(1);
    if (M[enemy_xu + 1] < 0x0A) return {};
    column(2);
    const a = M[enemy_xu + 2];
    if (a < 0x32) return { a };
    if (a < 0x5A) { M[lorry_speed] = 4; return { a: 4 }; }
    if (a < 0x78) { M[lorry_speed] = 3; return { a: 3 }; }
    if (a < 0xAA) { M[lorry_speed] = 2; return { a: 2 }; }
    M[boss_phase] = 1;
    M[floor_counts] = 0;
    for (let y = 8; y >= 0; y--) M[enemy_top_y + y] = 0;
    return { a: 0, y: 0xFF };
  };
  // lorry_wheels ($1D79): every 7 less the speed frames the front wheel's shape steps $6F-$71 and the
  // rear's $72-$74.
  P.lorry_wheels = function () {
    M[wheel_timer] = (M[wheel_timer] - 1) & 255;
    if (M[wheel_timer]) return {};
    M[wheel_timer] = (7 - M[lorry_speed]) & 255;
    const a = (M[enemy_bot_shape] + 1) & 255;
    if (a >= 0x72) { M[enemy_bot_shape] = 0x6F; M[enemy_bot_shape + 2] = 0x72; return { a: 0x72 }; }
    M[enemy_bot_shape] = a;
    M[enemy_bot_shape + 2] = (M[enemy_bot_shape + 2] + 1) & 255;
    return {};
  };
  // enemy_hold_timers ($1D41): an enemy held still with a timer counts it down; at 0 it is put back
  // on its floor, its bottom under its top, walking (anim state 3).
  P.enemy_hold_timers = function () {
    let y;
    for (let x = 5; x >= 0; x--) {
      if (!M[enemy_wait + x] || !M[enemy_timer + x]) continue;
      M[enemy_timer + x] = (M[enemy_timer + x] - 1) & 255;
      if (M[enemy_timer + x]) continue;
      M[enemy_wait + x] = 0;
      y = M[enemy_floor + x];
      M[enemy_top_y + x] = M[floor_y + y];
      M[enemy_bot_y + x] = (M[floor_y + y] + 0x15) & 255;
      M[enemy_bot_xlo + x] = M[enemy_top_xlo + x];
      M[enemy_bot_xhi + x] = M[enemy_top_xhi + x];
      M[enemy_anim_state + x] = 3;
    }
    return y === undefined ? { x: 0xFF } : { x: 0xFF, y };
  };
  // spawn_timers ($1DA9): lanes 4-0; the first that is not ready counts its timer down, and at 0
  // takes its type and next count from the lane plus the difficulty, and is ready.
  P.spawn_timers = function () {
    for (let x = 4; x >= 0; x--) {
      if (M[lane_ready + x]) continue;
      M[lane_timer + x] = (M[lane_timer + x] - 1) & 255;
      if (M[lane_timer + x]) continue;
      const y = (x + B(difficulty)) & 255;
      M[lane_type + x] = M[lane_types + y];
      M[lane_timer + x] = M[lane_reload + y];
      M[lane_ready + x] = 1;
      return { a: 1, x, y };
    }
    return { x: 0xFF };
  };
  // lane_find_ready ($1DD1): the first ready lane from 5 down, in spawn_lane, carry set; carry clear
  // when none is.
  P.lane_find_ready = function () {
    for (let x = 5; x >= 0; x--) if (M[lane_ready + x]) { M[spawn_lane] = x; return { x, c: 1 }; }
    return { x: 0xFF, c: 0 };
  };
  // scripted_spawn ($1E1E): the map's enemy at this column (scripted_check) placed, with fewer than
  // six out, in the slot enemy_free_slot finds.
  P.scripted_spawn = function () {
    P.scripted_check();
    if (M[enemy_count] >= 6 || !M[spawn_pending]) return {};
    const f = P.enemy_free_slot();
    return P.scripted_place({ x: f.x, c: f.c });
  };
  // scripted_place ($1E35): the pending enemy in slot X when its floor holds fewer than three and
  // (but for a paratrooper) has ground at the right edge (spawn_floor_check); without it the entry
  // is dropped. It comes in at the right ($14F plus its X offsets), at its floor's Y plus its
  // offsets, with its type's colours, shapes and hold time, facing left.
  P.scripted_place = function (r) {
    const x = r.x;
    let y = M[spawn_floor];
    if (B(floor_counts + y) >= 3) return {};
    const lane = M[spawn_lane];
    M[spawn_lane] = 0;
    const f = P.spawn_floor_check({ y });
    if (f.y !== undefined) y = f.y;
    M[spawn_lane] = lane;
    if (M[spawn_type] !== 9 && !f.c) {
      M[spawn_pending] = (M[spawn_pending] - 1) & 255;
      return { y };
    }
    M[floor_counts + y] = (B(floor_counts + y) + 1) & 255;
    M[enemy_floor + x] = y;
    M[Z(enemy_top_y + x)] = (M[floor_y + y] + M[spawn_offsets]) & 255;
    M[Z(enemy_bot_y + x)] = (M[floor_y + y] + M[spawn_offsets + 1]) & 255;
    M[enemy_top_xhi + x] = 1; M[enemy_bot_xhi + x] = 1;
    M[enemy_top_xlo + x] = (0x4F + M[spawn_offsets + 2]) & 255;
    M[enemy_bot_xlo + x] = (0x4F + M[spawn_offsets + 3]) & 255;
    M[enemy_speed + x] = M[spawn_speed];
    M[enemy_type + x] = M[spawn_type];
    y = M[spawn_type];
    M[enemy_top_colour + x] = M[type_top_colours + y];
    M[enemy_bot_colour + x] = M[type_top_colours + y];
    M[enemy_top_shape + x] = M[type_top_shapes + y];
    M[enemy_bot_shape + x] = M[type_bot_shapes + y];
    M[enemy_timer + x] = M[type_hold_times + y];
    M[enemy_active + x] = 1;
    M[enemy_facing + x] = 4;
    M[enemy_wait + x] = M[spawn_wait];
    M[enemy_hit + x] = 0; M[enemy_dying + x] = 0;
    M[enemy_entry + x] = M[spawn_entry];
    M[enemy_count] = (M[enemy_count] + 1) & 255;
    M[spawn_pending] = (M[spawn_pending] - 1) & 255;
    M[enemy_dir + x] = 4;
    return { a: 4, y };
  };
  // scripted_check ($1EF3): the stage's entries (stage_spawn_first to stage_spawn_end); the first not
  // yet used whose column is the map's is made pending: its type, floor, offsets and speed.
  P.scripted_check = function () {
    const ys = M[stage];
    let x = M[stage_spawn_first + ys];
    do {
      if (!M[spawn_done + x] && M[map_col_hi] === M[spawn_col_hi + x] && M[map_col] === M[spawn_col_lo + x]) {
        M[spawn_entry] = x;
        M[spawn_pending] = 1;
        M[spawn_done + x] = (M[spawn_done + x] + 1) & 255;
        M[spawn_type] = M[spawn_types + x];
        M[spawn_wait] = 1;
        M[spawn_floor] = M[spawn_floors + x];
        const y = M[spawn_type];
        M[spawn_offsets] = M[spawn_dy_top + y];
        M[spawn_offsets + 1] = M[spawn_dy_bot + y];
        M[spawn_offsets + 2] = M[spawn_dx_top + y];
        M[spawn_offsets + 3] = M[spawn_dx_bot + y];
        M[spawn_speed] = M[type_speeds + y];
        return { a: M[spawn_speed], x, y };
      }
      x = (x + 1) & 255;
    } while (x < M[stage_spawn_end + ys]);
    return { a: x, x, y: ys };
  };
  // random_spawn ($20B7): a ready lane's enemy brought in when fewer than five are out and a slot
  // is free.
  P.random_spawn = function () {
    if (!P.lane_find_ready().c) return {};
    if (P.enemy_count_check().c) return {};
    const f = P.enemy_free_slot();
    if (f.c) return f;
    return P.spawn_lane_enemy({ x: f.x });
  };
  // spawn_lane_enemy ($20CA): from the hero's floor, three floors tried.
  P.spawn_lane_enemy = function (r) {
    M[spawn_tries] = 3;
    return P.spawn_on_floor({ x: r.x, y: M[hero_floor] });
  };
  // spawn_on_floor ($20D2): the lane's enemy in slot X on floor Y, if it holds fewer than three and
  // (outside a fight's later phase) has ground at the lane's edge; at the floor's Y, or $A9 in the
  // fight; then its X (spawn_set_x). Otherwise the floor below, wrapping round from the bottom to
  // the top, until three are tried (spawn_next_floor).
  P.spawn_on_floor = function (r) {
    const x = r.x;
    let y = r.y;
    for (;;) {
      let ok = B(floor_counts + y) < 3;
      if (ok && !B(boss_phase)) {
        const f = P.spawn_floor_check({ y });
        if (f.y !== undefined) y = f.y;
        ok = !!f.c;
      }
      if (ok) {
        M[floor_counts + y] = (B(floor_counts + y) + 1) & 255;
        M[enemy_floor + x] = y;
        return P.j_2100({ a: B(boss_phase) ? 0xA9 : M[floor_y + y], x });
      }
      // spawn_next_floor ($217F)
      y = y ? y - 1 : 2;
      M[spawn_tries] = (M[spawn_tries] - 1) & 255;
      if (!M[spawn_tries]) return { a: y, y };
    }
  };
  P.spawn_next_floor = function (r) {
    const y = r.y ? r.y - 1 : 2;
    M[spawn_tries] = (M[spawn_tries] - 1) & 255;
    if (!M[spawn_tries]) return { a: y, y };
    return P.spawn_on_floor({ x: r.x, y });
  };
  // j_2100 ($2100): spawn_on_floor's later part, which guards_send enters with the enemy's top Y in
  // A: its bottom $15 below, and its X from the lane's side (spawn_set_x).
  P.j_2100 = function (r) {
    const x = r.x, a = r.a;
    M[Z(enemy_top_y + x)] = a;
    M[Z(enemy_bot_y + x)] = (a + 0x15) & 255;
    return P.spawn_set_x({ a: M[lane_sides + M[spawn_lane]], x });
  };
  // spawn_set_x ($210D): a new enemy's X from side A: from the right (4) $144, 8 less when the edge
  // character spawn_floor_check read (x_save) is $C8 or more; from the left $12; plus the fine
  // scroll. Then the lane's type, colours and speed, live, its side, and the lane no longer ready.
  P.spawn_set_x = function (r) {
    const x = r.x;
    let y = r.a === 4 ? 0 : 1;
    M[enemy_top_xhi + x] = M[edge_x_hi + y];
    M[enemy_bot_xhi + x] = M[edge_x_hi + y];
    let a = M[edge_x_lo + y];
    if (y === 0 && M[x_save] >= 0xC8) a = (a - 8) & 255;
    a = (a + B(fine_scroll)) & 255;
    M[enemy_top_xlo + x] = a; M[enemy_bot_xlo + x] = a;
    y = M[spawn_lane];
    const t = M[lane_type + y];
    M[enemy_type + x] = t;
    M[lane_ready + y] = 0;
    M[enemy_top_colour + x] = M[type_top_colours + t];
    M[enemy_bot_colour + x] = M[type_bot_colours + t];
    M[enemy_speed + x] = M[type_speeds + t];
    M[enemy_active + x] = 1;
    M[enemy_count] = (M[enemy_count] + 1) & 255;
    M[enemy_dir + x] = M[lane_sides + M[spawn_lane]];
    M[enemy_anim_state + x] = 0; M[enemy_hit + x] = 0; M[enemy_dying + x] = 0;
    M[spawn_lane] = 0;
    return { a: 0, x, y };
  };
  // spawn_floor_check ($2191): carry set when floor Y has ground at the lane's edge: the bottom floor
  // always; floors 1 and 2 by the two characters at edge_row (the first kept in x_save), the second
  // a floor character ($C8 or more, both floor bits, $0C, in char_attrs).
  P.spawn_floor_check = function (r) {
    let y = r.y;
    if (!y) return { y: 0, c: 1 };
    M[work] = y;
    const side = M[lane_sides + M[spawn_lane]];
    y = (M[work] - 1 + (side === 4 ? 0 : 2)) & 255;
    M[ptr] = M[edge_row_lo + y];
    M[ptr_hi] = M[edge_row_hi + y];
    M[x_save] = M[P.ind(ptr, 0)];
    let a = M[P.ind(ptr, 1)];
    y = M[work];
    if (a < 0xC8) return { a, y, c: 0 };
    a = M[char_attrs + a - 0xC8] & 0x0C;
    return { a, y, c: a >= 0x0C ? 1 : 0 };
  };
  // enemy_count_check ($221B): carry set when five or more enemies are out.
  P.enemy_count_check = function () {
    const a = M[enemy_count];
    return { a, c: a >= 5 ? 1 : 0 };
  };
  // enemy_free_slot ($2221): the first slot from 5 down whose top Y is 0, carry clear; carry set when
  // all six are used.
  P.enemy_free_slot = function () {
    for (let x = 5; x >= 0; x--) if (!M[enemy_top_y + x]) return { a: 0, x, c: 0 };
    return { x: 0xFF, c: 1 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
