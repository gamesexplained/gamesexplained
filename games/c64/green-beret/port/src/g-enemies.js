// The enemies: six slots (0-5), each two sprites, a top and a bottom (sprites 2-7 and 8-13). Each
// frame their floors are kept (enemy_floors), the scroll moves them, the characters at their legs
// and under their feet are read (enemies_chars), they take ladders after the hero (enemies_ladders),
// animate (enemies_anim) and move: walk, jump, climb or fall, after their type's own behaviour, the
// soldiers who fire, the grenade thrower, the kicker, the crawler and the paratrooper
// (enemies_move, enemy_behaviour).
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.enemies = function (P) {
  const M = P.M, B = P.B, N = root.GBNames;
  const { enemy_climbing, enemy_wait, enemy_jumping, enemy_falling, enemy_top_y, floor_y, enemy_floor, x_keep,
    enemy_falling_from, floor_counts, scroll_step, enemy_active, enemy_top_xlo, enemy_top_xhi, enemy_bot_xlo,
    enemy_bot_xhi, shot_active, shot_xlo, shot_xhi, enemy_type, enemy_floor_char, char_attrs, hero_floor, work,
    stage, ladder_through, enemy_dir, enemy_char, fall_jump_types, enemy_anim_state, enemy_anim_timer,
    enemy_anim_index, enemy_anim_tops, enemy_anim_bottoms, enemy_top_shape, enemy_bot_shape, ladder_on,
    jump_state, falling, enemy_facing, enemy_anim_bases, enemy_anim_starts, enemy_climb_y, ptr, ptr_hi, ptr2,
    scroll_copy, enemy_attr, enemy_floor_attr, boss_phase, enemy_count, enemy_fall_speed, enemy_bot_y,
    type_speeds, enemy_speed, enemy_fall_frac, enemy_frac, enemy_on_ladder, enemy_arc_index, enemy_arc_base,
    jump_arc, behaviour_table, behaviour_vector, para_phase, enemy_dying, x_save, fire_step, enemy_timer,
    player_xu, enemy_xu, wave_sides, fire_pose_offsets, fire_pose_tops, fire_pose_bottoms, eshot_types,
    shot_type, helis_out, officer_shapes, frame_counters, enemy_step, thrower_tops, thrower_throw_tops,
    thrower_bottoms, x_save3, shot_offset, shot_dir, shot_colours, shot_colour, shot_y, shot_xu, shot_shape,
    shot_shapes_left, shot_shapes_right, eshot_speeds, shot_speed, shot_arc_index, shot_arc_base,
    shot_arc_state, crawl_count, lane_ready, para_slots, para_speed, para_speed_limits, para_speeds,
    para_dropping, enemy_hit, enemy_top_colour, enemy_bot_colour, para_top_y, para_bot_y, para_top_x,
    para_bot_x, para_top_shapes, para_bot_shapes, para_top_colours, para_bot_colours } = N;
  const X = (r, x) => (r && r.x !== undefined ? r.x : x);
  // The Y lists are in zero page, where an index past their end wraps round in the page.
  const Z = a => a & 255;
  const dec = a => { M[a] = (B(a) - 1) & 255; };
  const inc = a => { M[a] = (B(a) + 1) & 255; };

  // enemy_floors ($223F): a standing enemy's floor from its top Y (floor_y). One that fell from a
  // higher floor was counted on the floors below while it fell (enemy_fall_counts); those counts
  // come off as it lands.
  P.enemy_floors = function () {
    for (let x = 5; x >= 0; x--) {
      if (M[enemy_climbing + x] | M[enemy_wait + x] | M[enemy_jumping + x] | M[enemy_falling + x]) continue;
      let y = 2;
      const a = M[enemy_top_y + x];
      while (y >= 0 && a !== M[floor_y + y]) y--;
      if (y < 0) continue;
      M[x_keep] = M[enemy_floor + x];
      M[enemy_floor + x] = y;
      if (!M[x_keep]) continue;
      const f = M[enemy_falling_from + x];
      if (!f) continue;
      if (f === 2) {
        if (y === M[x_keep]) { dec(floor_counts); dec(floor_counts + 1); }
        else if (y === 0) { dec(floor_counts + 1); dec(floor_counts + 2); }
        else { dec(floor_counts); dec(floor_counts + 2); }
      } else if (y === M[x_keep]) dec(floor_counts);
      else dec(floor_counts + 1);
      M[enemy_falling_from + x] = 0;
    }
    return { x: 0xFF };
  };
  // enemies_scroll ($22B7): when the screen scrolled, each live enemy's sprites left by the step.
  P.enemies_scroll = function () {
    if (!M[scroll_step]) return { a: 0 };
    for (let x = 5; x >= 0; x--) {
      if (!M[enemy_active + x]) continue;
      let v = M[enemy_top_xlo + x] - M[scroll_step];
      M[enemy_top_xlo + x] = v & 255;
      if (v < 0) M[enemy_top_xhi + x] = 0;
      v = M[enemy_bot_xlo + x] - M[scroll_step];
      M[enemy_bot_xlo + x] = v & 255;
      if (v < 0) M[enemy_bot_xhi + x] = 0;
    }
    return { x: 0xFF };
  };
  // shots_scroll ($22F1): the same for the projectiles out.
  P.shots_scroll = function () {
    if (!M[scroll_step]) return { a: 0 };
    for (let x = 5; x >= 0; x--) {
      if (!M[shot_active + x]) continue;
      const v = M[shot_xlo + x] - M[scroll_step];
      M[shot_xlo + x] = v & 255;
      if (v < 0) M[shot_xhi + x] = 0;
    }
    return { x: 0xFF };
  };
  // enemies_ladders ($2317): an enemy that can climb (not a brown soldier or a kicker), not held,
  // climbing or falling, takes a ladder towards the hero's floor: down when the character under it
  // has the down bit (2) and he is lower, up when the one at its legs has the up bit (1) and he is
  // higher; if the floor it goes to holds fewer than three. On the Bridge (stage 2) one passing the
  // middle floor is counted on the floor beyond too (ladder_through).
  P.enemies_ladders = function () {
    for (let x = 5; x >= 0; x--) {
      if (!M[enemy_active + x] || M[enemy_wait + x]) continue;
      const t = M[enemy_type + x];
      if (t === 0 || t === 5) continue;
      if (M[enemy_climbing + x] || M[enemy_falling_from + x]) continue;
      let a = M[enemy_floor_char + x];
      if (a >= 0xC8 && (M[char_attrs + a - 0xC8] & 2)) {
        if (M[hero_floor] >= M[enemy_floor + x]) continue;
        M[work] = M[char_attrs + a - 0xC8] & 2;
        let y = (M[enemy_floor + x] - 1) & 255;
        if (B(floor_counts + y) >= 3) continue;
        if (y === 1 && M[stage] === 2) {
          if (B(floor_counts) >= 3) continue;
          inc(floor_counts);
          M[ladder_through + x] = 1;
        }
        M[enemy_dir + x] = M[work];
        M[enemy_floor + x] = (M[enemy_floor + x] - 1) & 255;
        y = (y + 1) & 255; dec(floor_counts + y);
        y = (y - 1) & 255; inc(floor_counts + y);
      } else {
        a = M[enemy_char + x];
        if (a < 0xC8 || !(M[char_attrs + a - 0xC8] & 1)) continue;
        if (M[enemy_floor + x] >= M[hero_floor]) continue;
        M[work] = M[char_attrs + a - 0xC8] & 1;
        let y = (M[enemy_floor + x] + 1) & 255;
        if (B(floor_counts + y) >= 3) continue;
        if (M[stage] === 2 && y === 1) {
          if (B(floor_counts + 2) >= 3) continue;
          inc(floor_counts + 2);
          M[ladder_through + x] = 3;
        }
        M[enemy_dir + x] = M[work];
        M[enemy_floor + x] = (M[enemy_floor + x] + 1) & 255;
        y = (y - 1) & 255; dec(floor_counts + y);
        y = (y + 1) & 255; inc(floor_counts + y);
      }
      M[enemy_climbing + x] = 1;
      M[enemy_falling_from + x] = 0;
    }
    return { x: 0xFF };
  };
  // enemy_fall_counts ($2420): an enemy on floor 1 or 2 starts to drop, counted on the floors below
  // until it lands (enemy_falling_from the floor it left); a type that jumps jumps instead.
  P.enemy_fall_counts = function (r) {
    const x = r.x;
    if (M[enemy_floor + x] === 1) M[enemy_falling_from + x] = 1;
    else { inc(floor_counts + 1); M[enemy_falling_from + x] = 2; }
    inc(floor_counts);
    return P.enemy_fall_jump({ x });
  };
  // enemy_fall_jump ($2464): a type that jumps (fall_jump_types) jumps (bit 0 of its direction)
  // and does not fall.
  P.enemy_fall_jump = function (r) {
    const x = r.x, y = M[enemy_type + x];
    if (!M[fall_jump_types + y]) return { a: 0, y };
    M[enemy_dir + x] |= 1;
    M[enemy_falling + x] = 0;
    return { a: 0, y };
  };

  // enemies_anim ($2613) and enemy_anim_start ($2675): each live enemy's frame. One standing (no
  // direction) takes its facing's animation while the hero is on the ground; one moving, every 5
  // frames the next shapes of its animation (enemy_anim_tops and _bottoms from enemy_anim_index,
  // a 0 ending it, where it starts again), and a new animation when its direction changes
  // (enemy_anim_starts at the direction plus its type's base). enemy_anim_start is the loop's own
  // start of an animation: called from elsewhere it goes on through the slots below.
  function animFrom(x, go) {
    for (; !(x & 0x80); x = (x - 1) & 255, go = null) {
      if (!go) {
        if (!M[enemy_active + x]) continue;
        if (!M[enemy_dir + x]) {
          if (B(ladder_on) | M[jump_state] | M[falling]) continue;
          go = { a: M[enemy_facing + x] };
        } else if (M[enemy_falling + x] | M[enemy_wait + x]) continue;
        else if (M[enemy_dir + x] !== M[enemy_anim_state + x]) {
          M[enemy_anim_timer + x] = 1;
          go = { a: M[enemy_dir + x] };
        } else {
          M[enemy_anim_timer + x] = (M[enemy_anim_timer + x] - 1) & 255;
          if (M[enemy_anim_timer + x]) continue;
          M[enemy_anim_timer + x] = 5;
          go = { y: M[enemy_anim_index + x] };
        }
      }
      for (let n = 0; ; n++) {
        if (go.a !== undefined) {
          M[enemy_anim_state + x] = go.a;
          M[work] = M[enemy_anim_bases + M[enemy_type + x]];
          go = { y: M[enemy_anim_starts + (((go.a & 0x1F) + M[work]) & 255)] };
        }
        const t = M[enemy_anim_tops + go.y];
        if (t) {
          M[enemy_top_shape + x] = t;
          M[enemy_bot_shape + x] = M[enemy_anim_bottoms + go.y];
          M[enemy_anim_index + x] = (go.y + 1) & 255;
          break;
        }
        if (n > 2) throw new Error('enemies_anim: slot ' + x + ' has an animation with no frames, where the game loops for ever');
        go = { a: M[enemy_anim_state + x] };
      }
    }
    return { x };
  }
  P.enemies_anim = () => animFrom(5, null);
  P.enemy_anim_start = r => animFrom(r.x, { a: r.a });

  // enemies_chars ($27D1): for each live enemy not held, the character at its legs (its top Y less
  // enemy_climb_y, its X less $0A and the fine scroll, in eights) and the one under it, its floor,
  // with their attributes. Outside the fights, one with nothing under it that is not jumping or
  // falling already drops (enemy_fall_counts) when the floors below have room, or turns round and
  // steps back.
  P.enemies_chars = function () {
    for (let x = 5; !(x & 0x80); x = (x - 1) & 255) {
      if (!M[enemy_active + x] || M[enemy_wait + x]) continue;
      const v = ((M[enemy_top_y + x] - M[enemy_climb_y + x]) & 255) & 0xF8;
      M[ptr2] = v;
      const t = v << 2, lo = (t & 255) + v;
      M[ptr] = lo & 255;
      M[ptr_hi] = ((t >> 8) + 0x40 + (lo > 255 ? 1 : 0)) & 255;
      let a = M[enemy_top_xlo + x] - 0x0A;
      const wrap = a < 0;
      a &= 255;
      const b = a - M[scroll_copy];
      let c;
      if (b < 0) c = 0;
      else c = wrap ? 0 : M[enemy_top_xhi + x] & 1;
      a = (((b & 255) >> 1) | (c << 7)) >> 2;
      let y = a >= 0x28 ? 0x27 : a;
      M[enemy_char + x] = M[P.ind(ptr, y)];
      y += 0x28;
      M[enemy_attr + x] = 0; M[enemy_floor_attr + x] = 0;
      a = M[P.ind(ptr, y)];
      M[enemy_floor_char + x] = a;
      if (a >= 0xC8) M[enemy_floor_attr + x] = M[char_attrs + a - 0xC8];
      a = M[enemy_char + x];
      if (a >= 0xC8) M[enemy_attr + x] = M[char_attrs + a - 0xC8];
      if (B(boss_phase)) continue;
      if (M[enemy_falling_from + x] | M[enemy_jumping + x]) continue;
      if (M[enemy_floor_char + x] >= 0xC8) continue;
      y = (M[enemy_floor + x] - 1) & 255;
      if ((y === 0 || B(enemy_count + y) < 3) && B(floor_counts + y) < 3) { P.enemy_fall_counts({ x }); continue; }
      M[enemy_floor_char + x] = 0xFA;
      const d = M[enemy_dir + x] ^ 0x0C;
      M[enemy_dir + x] = d;
      x = X(P.enemy_walk({ a: d, x, y: d }), x);
    }
    return { x: 0xFF };
  };

  // enemies_move ($2C40): each live enemy. One held runs only its behaviour (not a paratrooper);
  // one falling falls; the rest run their behaviour, then jump on (enemy_jump), start a jump
  // (direction bit 0, enemy_jump_start), walk (enemy_walk) or, with nothing under them, fall.
  // Falling: the speed rises by 8 to $F8 and the enemy drops 4 lines a frame and 1 more when the
  // speed's fraction carries, drifting on its facing, until it lands on a floor character.
  // moveFrom runs the loop from slot X; it ends when the slots run out, or when an enemy's climb
  // returns from the loop itself (left: the JMPs from enemy_jump_start to enemy_climb end in
  // enemy_climb's RTS).
  function moveFrom(x) {
    for (; !(x & 0x80); x = (x - 1) & 255) {
      const r = moveOne(x);
      if (r.left) return r;
      x = r.x;
    }
    return { x };
  }
  function moveOne(x) {
    if (!M[enemy_active + x]) return { x };
    if (M[enemy_wait + x]) {
      if (M[enemy_type + x] === 9) return { x };
      return { x: X(P.enemy_behaviour({ x }), x) };
    }
    if (!M[enemy_falling + x]) {
      x = X(P.enemy_behaviour({ x }), x);
      if (M[enemy_wait + x]) return { x };
      const d = M[enemy_dir + x];
      let a;
      if (!d) {
        if (M[enemy_jumping + x]) return enemyJump(x);
        if (M[enemy_floor_char + x] >= 0xC8) return { x };
        return fall(x);
      }
      if (M[enemy_jumping + x]) return enemyJump(x);
      if (M[enemy_floor_char + x] >= 0xC8) a = d;
      else if (M[enemy_dir + x] & 1) a = 1;
      else return fall(x);
      if (a & 1) return jumpStart(x);
      return { x: X(P.enemy_walk({ a: M[enemy_dir + x], x }), x) };
    }
    return fall(x);
  }
  function fall(x) {
    if (!M[enemy_falling + x]) {
      M[enemy_falling + x] = 1;
      M[enemy_fall_speed + x] = 0x80;
      M[enemy_speed + x] = 0;
    } else {
      const s = M[enemy_fall_speed + x] + 8;
      if (s <= 255) M[enemy_fall_speed + x] = s;
      if (M[enemy_floor_char + x] >= 0xC8) {
        const t = ((((M[enemy_top_y + x] - 4) & 255) & 0xF8) | 5);
        M[enemy_top_y + x] = t;
        M[enemy_bot_y + x] = (t + 0x15) & 255;
        M[enemy_falling + x] = 0;
        M[enemy_speed + x] = M[type_speeds + M[enemy_type + x]];
        return { x };
      }
    }
    const f = M[enemy_fall_speed + x] + M[enemy_fall_frac + x];
    M[enemy_fall_frac + x] = f & 255;
    const t = (M[enemy_top_y + x] + 4 + (f > 255 ? 1 : 0)) & 255;
    M[enemy_top_y + x] = t;
    M[enemy_bot_y + x] = (t + 0x15) & 255;
    const a = M[enemy_facing + x];
    return { x: X(P.enemy_walk({ a, x, y: a }), x) };
  }
  P.enemies_move = function () { return { x: moveFrom(5).x }; };
  // enemy_walk ($2D1A): enemy X in direction A, right (8) or left (4), 1 pixel a frame and 1 more
  // when its speed carries into its fraction; its facing, and off any ladder. With neither, it
  // climbs (enemy_climb) and goes on with the move loop's next slot from inside this call, so the
  // loop's slots below are moved before it returns.
  P.enemy_walk = function (r) {
    const x = r.x, d = r.a;
    if (d & 0x0C) {
      const s = M[enemy_speed + x] + M[enemy_frac + x];
      M[enemy_frac + x] = s & 255;
      const n = s > 255 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        if (d & 8) {
          M[enemy_top_xlo + x] = (M[enemy_top_xlo + x] + 1) & 255;
          M[enemy_bot_xlo + x] = (M[enemy_bot_xlo + x] + 1) & 255;
          if (!M[enemy_bot_xlo + x]) { M[enemy_top_xhi + x] = 1; M[enemy_bot_xhi + x] = 1; }
          M[enemy_facing + x] = 8;
        } else {
          if (!M[enemy_top_xlo + x]) { M[enemy_top_xhi + x] = 0; M[enemy_bot_xhi + x] = 0; }
          M[enemy_top_xlo + x] = (M[enemy_top_xlo + x] - 1) & 255;
          M[enemy_bot_xlo + x] = (M[enemy_bot_xlo + x] - 1) & 255;
          M[enemy_facing + x] = 4;
        }
        M[enemy_on_ladder + x] = 0;
      }
      return { a: 0, x, y: d };
    }
    // the RTS that ends that loop, or an enemy's climb that leaves it, comes back here
    P.enemy_climb({ x });
    return { x: moveFrom((x - 1) & 255).x };
  };
  // enemy_jump_start ($2D81): direction bit 0. On a ladder matching its direction it climbs, a
  // kicker excepted (at its legs) or not (under it, where the climb ends the move loop, see
  // moveFrom); one already on a ladder climbs on. Otherwise it jumps: its facing's jump animation
  // and the arc from its bottom less jump_arc at $12.
  function jumpStart(x) {
    if (M[enemy_jumping + x]) return enemyJump(x);
    let a = M[enemy_attr + x] & 3;
    if (a) {
      if ((a & M[enemy_dir + x]) && M[enemy_type + x] !== 5) { P.enemy_climb({ x }); return { x }; }
    } else {
      a = M[enemy_floor_attr + x] & 3;
      if (a && (a & M[enemy_dir + x])) return Object.assign({ left: true, x }, P.enemy_climb({ x }));
    }
    if (M[enemy_on_ladder + x]) { P.enemy_climb({ x }); return { x }; }
    if (!(M[enemy_dir + x] & 1)) return { x };
    M[enemy_jumping + x] = 1;
    M[x_keep] = x;
    P.enemy_anim_start({ a: M[enemy_facing + x] | 1, x });
    x = M[x_keep];
    M[enemy_arc_index + x] = 0x12;
    M[enemy_arc_base + x] = (M[enemy_bot_y + x] - M[jump_arc + 0x12]) & 255;
    return enemyJump(x);
  }
  // enemy_jump ($2DE2): a frame of the jump: on a ladder matching its direction it climbs instead
  // (not a kicker); its bottom at the base plus jump_arc, the index down then up; past $12 it lands
  // falling, its direction its facing; and it moves on its direction's side.
  function enemyJump(x) {
    const a = M[enemy_attr + x] & 3;
    if (a && M[enemy_type + x] !== 5 && (a & M[enemy_dir + x])) { P.enemy_climb({ x }); return { x }; }
    let y = M[enemy_arc_index + x];
    const b = (M[enemy_arc_base + x] + M[jump_arc + y]) & 255;
    M[enemy_bot_y + x] = b;
    M[enemy_top_y + x] = (b - 0x15) & 255;
    let end = false;
    if (M[enemy_jumping + x] & 0x80) {
      y = (y + 1) & 255;
      if (y >= 0x13) {
        M[enemy_jumping + x] = 0;
        M[enemy_dir + x] = M[enemy_facing + x];
        M[enemy_falling + x] = 1;
        end = true;
      }
    } else {
      y = (y - 1) & 255;
      if (y & 0x80) { M[enemy_jumping + x] = 0x80; y = 0; }
    }
    if (!end) M[enemy_arc_index + x] = y;
    const d = M[enemy_dir + x] & 0x0C;
    if (d) x = X(P.enemy_walk({ a: d, x, y: d }), x);
    return { x };
  }
  P.enemy_jump_start = r => moveRest(jumpStart(r.x));
  P.enemy_jump = r => moveRest(enemyJump(r.x));
  // A part of the move loop entered on its own goes on with the loop (the tests only).
  const moveRest = r => (r.left ? r : moveFrom((r.x - 1) & 255));

  // enemy_behaviour ($2E3E): the type's own routine (behaviour_table) through the JMP at $2E50,
  // whose operand (behaviour_vector) it writes.
  const BEHAVIOURS = { 0x2E67: null, 0x2E68: null, 0x2E69: 'shooter', 0x2E6C: null, 0x2F96: 'thrower', 0x333C: 'kicker',
    0x2E7B: 'shooter', 0x30E7: 'crawler', 0x2E78: 'shooter', 0x2E6D: 'para_behaviour' };
  P.enemy_behaviour = function (r) {
    const x = r.x, y = (M[enemy_type + x] << 1) & 255;
    M[behaviour_vector] = M[behaviour_table + y];
    M[behaviour_vector + 1] = M[behaviour_table + 1 + y];
    const at = M[behaviour_vector] | M[behaviour_vector + 1] << 8;
    if (!(at in BEHAVIOURS)) throw new Error('enemy_behaviour: no routine at $' + at.toString(16) + ' for type ' + M[enemy_type + x]);
    const h = BEHAVIOURS[at];
    return Object.assign({ a: M[behaviour_vector + 1], x, y }, h ? P[h]({ x, y }) : {});
  };
  // para_behaviour ($2E6D): the paratrooper drifts (para_update) and, his parachute open, fires.
  P.para_behaviour = function (r) {
    const u = P.para_update({ x: r.x });
    if (M[para_phase] !== 2) return u;
    return P.shooter({ x: X(u, r.x) });
  };
  // shooter ($2E7B): the enemies who fire. Not while dying. One on the hero's floor, standing on a
  // floor character and not moving otherwise (any paratrooper) fires when its frame counter says
  // (enemy_fire_check): step 1 stops it for $3C frames, turned to the hero in its firing pose
  // (not the paratrooper), steps 2-4 wait, step 5 fires (enemy_fire).
  P.shooter = function (r) {
    const x = r.x;
    if (M[enemy_dying + x]) return {};
    M[x_save] = x;
    let a = M[fire_step + x];
    if (!a) {
      if (M[enemy_type + x] !== 9) {
        if (M[enemy_floor + x] !== M[hero_floor]) return {};
        if (M[enemy_climbing + x] | M[enemy_falling + x] | M[enemy_wait + x] | M[enemy_jumping + x]) return {};
        if (!(M[enemy_floor_attr + x] & 0x0C)) return {};
      }
      if (!P.enemy_fire_check({ x }).c) return {};
      M[fire_step + x] = 1;
      a = 1;
    }
    if (a === 1) {
      if (M[enemy_type + x] !== 9) {
        M[enemy_wait + x] = 1;
        M[enemy_timer + x] = 0x3C;
        let y = M[player_xu] >= M[enemy_xu + x] ? 1 : 0;
        M[enemy_facing + x] = M[wave_sides + y];
        M[enemy_dir + x] = M[wave_sides + y];
        y = (y + M[fire_pose_offsets + M[enemy_type + x]]) & 255;
        M[enemy_top_shape + x] = M[fire_pose_tops + y];
        M[enemy_bot_shape + x] = M[fire_pose_bottoms + y];
      }
    } else if (a >= 5) return P.enemy_fire();
    M[fire_step + x] = (M[fire_step + x] + 1) & 255;
    return fireEnd();
  };
  // The end of a step ($2F0C): the sequence starts again once the hold has run out (not the
  // paratrooper's).
  function fireEnd() {
    const x = M[x_save];
    if (M[enemy_timer + x] || M[enemy_type + x] === 9) return { x };
    M[fire_step + x] = 0;
    return { a: 0, x };
  }
  // enemy_fire_check ($2EBB): carry set when enemy X's frame counter is one of the three operands
  // at $2EBF, $2EC3 and $2EC7 (fire_frame_a, _b, _c).
  P.enemy_fire_check = function (r) {
    const a = B(frame_counters + r.x);
    for (const at of [0x2EBF, 0x2EC3, 0x2EC7]) if (a === M[at]) return { a, c: 1, z: 1 };
    return { a, c: 0 };
  };
  // enemy_fire ($2F2D): for the enemy in x_save, a projectile in a free slot of the enemies' (3-5),
  // of the type its type fires (eshot_types), with the gun's or the bazooka's sound; then the
  // sequence over, a hold of $0F frames (the paratrooper's counter set back instead) and the
  // officer's throwing shape.
  P.enemy_fire = function () {
    const f = P.free_shot_from_x({ x: 5 });
    if (f.c || f.x < 3) return fireEnd();
    const y = M[eshot_types + M[enemy_type + M[x_save]]];
    M[shot_type + f.x] = y;
    P.eshot_launch({ x: f.x, y });
    let x = M[x_save];
    const t = M[enemy_type + x];
    if (t === 2) P.sfx_gun(); else if (t === 6) P.sfx_bazooka();
    x = M[x_save];
    M[fire_step + x] = 0;
    if (M[enemy_type + x] === 9) { M[frame_counters + x] = 0x48; return { a: 0x48, x }; }
    M[enemy_timer + x] = 0x0F;
    if (M[enemy_type + x] === 8 && !M[helis_out]) {
      const k = M[enemy_facing + x] >= 8 ? 1 : 0;
      M[enemy_top_shape + x] = M[officer_shapes + k];
    }
    return { x };
  };
  // thrower ($2F96): the grenade thrower. With the hero within $28 units either side, his frame
  // counter starts a throw (enemy_step); he faces the hero, in the throwing pose while it lasts,
  // and at step $10 throws a grenade (type 2) from a free slot of the enemies'.
  P.thrower = function (r) {
    const x = r.x;
    if (M[enemy_dying + x]) return {};
    M[x_save] = x;
    if (!M[enemy_step + x]) {
      let a = (M[player_xu] + 0x28) & 255;
      if (a < M[enemy_xu + x] || a < 0x50) return {};
      a -= 0x50;
      if (a >= M[enemy_xu + x]) return {};
      if (P.enemy_fire_check({ x }).c) M[enemy_step + x] = 1;
    }
    const y = M[player_xu] >= M[enemy_xu + x] ? 1 : 0;
    M[enemy_top_shape + x] = M[thrower_tops + y];
    if (M[enemy_step + x]) M[enemy_top_shape + x] = M[thrower_throw_tops + y];
    M[enemy_bot_shape + x] = M[thrower_bottoms + y];
    M[enemy_facing + x] = M[wave_sides + y];
    const a = M[enemy_step + x];
    if (!a) return { y };
    if (a < 0x10) { M[enemy_step + x] = (a + 1) & 255; return { x: M[x_save], y }; }
    M[x_save] = x;
    const f = P.free_shot_from_x({ x: 5 });
    if (f.c || f.x < 3) return { x: M[x_save], y };
    return P.eshot_launch({ x: f.x, y: 2 });
  };
  // eshot_launch ($300F): projectile X of type Y from the enemy in x_save: his facing (turned for
  // type 5), $0C units ahead ($FC behind), $10 lines below his top, the type's colour, shape and
  // speed. A grenade (types 2 and 5) flies an arc from jump_arc at $19 as type 2, his throw over,
  // with the bazooka's sound.
  P.eshot_launch = function (r) {
    let x = r.x, y = r.y;
    M[x_save3] = x;
    const xs = M[x_save];
    const facing = M[enemy_facing + xs];
    const a = y === 5 ? facing ^ 0x0C : facing;
    M[shot_offset] = a & 4 ? 0xFC : (0x0C + (y >= 5 ? 1 : 0)) & 255;
    x = M[x_save3];
    M[shot_dir + x] = facing;
    M[shot_colour + x] = M[shot_colours + y];
    M[Z(shot_y + x)] = (M[Z(enemy_top_y + M[x_save])] + 0x10) & 255;
    const u = (M[enemy_xu + M[x_save]] + M[shot_offset]) & 255;
    M[shot_xu + x] = u;
    M[shot_xlo + x] = (u << 1) & 255;
    M[N.shot_xhi + x] = u >> 7;
    M[shot_shape + x] = M[shot_dir + x] === 4 ? M[shot_shapes_left + y] : M[shot_shapes_right + y];
    M[shot_speed + x] = M[eshot_speeds + y];
    M[shot_active + x] = 1;
    if (y !== 2 && y !== 5) return { a: 1, x, y };
    y = 0x19;
    M[shot_arc_index + x] = y;
    M[shot_arc_base + x] = (M[Z(shot_y + x)] - M[jump_arc + y]) & 255;
    M[shot_arc_state + x] = 1;
    M[shot_type + x] = 2;
    x = M[x_save];
    M[enemy_step + x] = 0;
    P.sfx_bazooka();
    return { a: x, x, y };
  };
  // crawler ($30E7): his counter (crawl_count) up each frame; every other frame, for 16 frames in
  // 32, he crawls a pixel left ($5F, $5E); otherwise, and dying, he lies still ($61, $60).
  P.crawler = function (r) {
    const x = r.x;
    if (!M[enemy_dying + x]) {
      M[crawl_count + x] = (M[crawl_count + x] + 1) & 255;
      const a = M[crawl_count + x];
      if (a & 1) return { a: 1 };
      if (!(a & 0x10)) {
        let v = M[enemy_top_xlo + x] - 1;
        M[enemy_top_xlo + x] = v & 255;
        if (v < 0) M[enemy_top_xhi + x] = 0;
        v = M[enemy_bot_xlo + x] - 1;
        M[enemy_bot_xlo + x] = v & 255;
        if (v < 0) M[enemy_bot_xhi + x] = 0;
        M[enemy_top_shape + x] = 0x5F; M[enemy_bot_shape + x] = 0x5E;
        return { a: 0x5E };
      }
    }
    M[enemy_top_shape + x] = 0x61; M[enemy_bot_shape + x] = 0x60;
    return { a: 0x60 };
  };
  // para_update ($3133): the paratrooper. First (para_phase 0) the top two floors' counts up by 2
  // and the enemy count by 3 for him, the lanes cleared and every enemy sent left
  // (enemies_turn_left); then, once fewer than six are out, he is built (para_build) and his counter
  // set; while he waits, his slot is held off the screen ($66). Drifting (phase 2): his speed from
  // his X units (para_speeds) until it is negative; from $5A units with it negative he drops each
  // frame, otherwise every fourth; his four slots move down and across by the speed, the canopy's
  // third part with no bottom; at $CE he lands (para_release).
  P.para_update = function (r) {
    let x = r.x;
    if (!M[para_phase]) {
      M[floor_counts + 2] = (B(floor_counts + 2) + 2) & 255;
      M[floor_counts + 1] = (B(floor_counts + 1) + 2) & 255;
      M[enemy_count] = (M[enemy_count] + 3) & 255;
      M[para_phase] = (M[para_phase] + 1) & 255;
      for (let y = 4; y >= 0; y--) M[lane_ready + y] = 0;
      return P.enemies_turn_left();
    }
    if (M[para_phase] !== 2) {
      if (M[enemy_count] >= 6) { M[enemy_top_xlo + x] = 0x66; M[enemy_bot_xlo + x] = 0x66; return { a: 0x66 }; }
      M[para_phase] = (M[para_phase] + 1) & 255;
      M[frame_counters + x] = 0x46;
      return P.para_build({ x });
    }
    x = M[para_slots];
    if (!(M[para_speed] & 0x80)) {
      const a = M[enemy_xu + x];
      let y = 4;
      while (a < M[para_speed_limits + y] && --y) { /* the first limit below it */ }
      M[para_speed] = M[para_speeds + y];
    }
    if (!(M[para_speed] & 0x80)) M[para_dropping] = 0;
    else if (M[enemy_xu + x] >= 0x5A) { M[para_dropping] = 1; M[para_speed] = 0xFF; }
    for (let y = 3; y >= 0; y--) {
      x = M[para_slots + y];
      if (M[para_dropping] || !(B(frame_counters) & 3)) {
        M[Z(enemy_top_y + x)] = (M[Z(enemy_top_y + x)] + 1) & 255;
        M[Z(enemy_bot_y + x)] = (M[Z(enemy_bot_y + x)] + 1) & 255;
      }
      if (M[Z(enemy_top_y + x)] >= 0xCE) return P.para_release();
      if (y === 2) M[Z(enemy_bot_y + x)] = 0;
      const s = M[para_speed], neg = s & 0x80 ? 0xFF : 0;
      for (const [lo, hi] of [[enemy_top_xlo, enemy_top_xhi], [enemy_bot_xlo, enemy_bot_xhi]]) {
        const v = M[lo + x] - s;
        M[lo + x] = v & 255;
        M[hi + x] = (M[hi + x] - neg - (v < 0 ? 1 : 0)) & 255;
      }
    }
    return { x, y: 0xFF };
  };
  // para_release ($3229): he lands or is hit: the counts raised for him back down, his canopy's
  // three slots cleared, and he is a kicker (type 5), free to move.
  P.para_release = function () {
    M[floor_counts + 1] = (B(floor_counts + 1) - 2) & 255;
    M[floor_counts + 2] = (B(floor_counts + 2) - 2) & 255;
    M[enemy_count] = (M[enemy_count] - 3) & 255;
    for (let y = 3; y >= 1; y--) {
      const x = M[para_slots + y];
      M[enemy_active + x] = 0; M[enemy_wait + x] = 0; M[enemy_type + x] = 0;
      M[Z(enemy_top_y + x)] = 0; M[Z(enemy_bot_y + x)] = 0;
    }
    const x = M[para_slots];
    M[enemy_type + x] = 5;
    M[enemy_wait + x] = 0;
    M[para_phase] = 0;
    return { a: 0, x, y: 0 };
  };
  // para_build ($3270): the man in slot X and the canopy in three free slots, kept in para_slots; his
  // drift speed 4.
  P.para_build = function (r) {
    let x = r.x;
    M[para_slots] = x;
    P.para_part({ x, y: 0 });
    for (let y = 1; y <= 3; y++) {
      x = P.enemy_free_slot().x;
      M[para_slots + y] = x;
      P.para_part({ x, y });
    }
    M[para_speed] = 4;
    return { a: 4, x, y: 3 };
  };
  // para_part ($329F): slot X as part Y of him (0 the man, 1-3 the canopy), held, type 9.
  P.para_part = function (r) {
    const x = r.x, y = r.y;
    M[Z(enemy_top_y + x)] = M[para_top_y + y];
    M[Z(enemy_bot_y + x)] = M[para_bot_y + y];
    M[enemy_top_xlo + x] = M[para_top_x + y];
    M[enemy_bot_xlo + x] = M[para_bot_x + y];
    M[enemy_top_xhi + x] = 1; M[enemy_bot_xhi + x] = 1;
    M[enemy_top_shape + x] = M[para_top_shapes + y];
    M[enemy_bot_shape + x] = M[para_bot_shapes + y];
    M[enemy_top_colour + x] = M[para_top_colours + y];
    M[enemy_bot_colour + x] = M[para_bot_colours + y];
    M[enemy_wait + x] = 1; M[enemy_active + x] = 1;
    M[enemy_timer + x] = 0;
    M[enemy_type + x] = 9;
    return { a: 9, x, y };
  };
  // para_find ($3316): the paratrooper's behaviour, once a frame, from the highest slot of type 9.
  P.para_find = function () {
    for (let x = 5; x >= 0; x--) if (M[enemy_type + x] === 9) return P.enemy_behaviour({ x });
    return { x: 0xFF };
  };
  // enemies_turn_left ($3326): every enemy not falling, climbing or jumping walks left.
  P.enemies_turn_left = function () {
    for (let x = 5; x >= 0; x--) if (!(M[enemy_falling + x] | M[enemy_climbing + x] | M[enemy_jumping + x])) M[enemy_dir + x] = 4;
    return { x: 0xFF };
  };
  // kicker ($333C): the kicker. Not jumping or falling, nor as the Harbour's dog handler. With the
  // hero on his floor less than $1E units to his left, and him walking left: on the bottom floor he
  // jumps; higher up he drops (enemy_fall_counts) when the floors below have room.
  P.kicker = function (r) {
    const x = r.x;
    if (M[enemy_jumping + x] | M[enemy_falling + x]) return {};
    if (M[stage] === 1 && B(boss_phase)) return {};
    const a = M[enemy_xu + x];
    if (a < M[player_xu] || ((a - M[player_xu]) & 255) >= 0x1E) return {};
    if (M[enemy_dir + x] === 8 || (M[enemy_dir + x] & 1)) return {};
    let y = M[enemy_floor + x];
    if (!y) {
      if (y !== M[hero_floor]) return { y };
      M[enemy_dir + x] |= 1;
      M[enemy_falling + x] = 0;
      return { a: 0, y };
    }
    if (y !== M[hero_floor]) return { y };
    y = (y - 1) & 255;
    if (y && B(enemy_count + y) >= 3) return { y };
    if (B(floor_counts + y) >= 3) return { y };
    return P.enemy_fall_counts({ x });
  };
  // enemies_offscreen ($33A3): a live enemy (not a paratrooper) off either edge, X under $12 or
  // $150 and over, is removed; one off the right ends the pass there (enemy_remove's RTS).
  P.enemies_offscreen = function () {
    for (let x = 5; x >= 0; x--) {
      if (!M[enemy_active + x] || M[enemy_type + x] === 9) continue;
      const a = M[enemy_top_xlo + x];
      if (a >= 0x50) { if (M[enemy_top_xhi + x]) return P.enemy_remove({ x }); }
      else if (a < 0x12 && !M[enemy_top_xhi + x]) P.enemy_remove({ x });
    }
    return { x: 0xFF };
  };
  // enemy_remove ($33D4): slot X freed: its places, state and flags cleared; off its floor's count,
  // and the floor beyond it passed (ladder_through) or the floors it was counted on as it fell.
  P.enemy_remove = function (r) {
    const x = r.x;
    for (const a of [Z(enemy_top_y + x), Z(enemy_bot_y + x), enemy_climbing + x, enemy_active + x, enemy_falling + x,
      enemy_wait + x, enemy_jumping + x, enemy_hit + x, enemy_dying + x, enemy_on_ladder + x, enemy_top_xlo + x,
      enemy_top_xhi + x, enemy_xu + x, enemy_step + x]) M[a] = 0;
    let y = M[ladder_through + x];
    if (y) {
      y = (y - 1) & 255;
      M[floor_counts + y] = (B(floor_counts + y) - 1) & 255;
      M[ladder_through + x] = 0;
    }
    M[enemy_climb_y + x] = 0x15;
    y = M[enemy_floor + x];
    M[floor_counts + y] = (B(floor_counts + y) - 1) & 255;
    M[enemy_count] = (M[enemy_count] - 1) & 255;
    const f = M[enemy_falling_from + x];
    if (!f) return { a: 0, x, y };
    if (f === 2) dec(floor_counts + 2);
    dec(floor_counts);
    dec(floor_counts + 1);
    M[floor_counts + y] = (B(floor_counts + y) + 1) & 255;
    M[enemy_falling_from + x] = 0;
    return { a: 0, x, y };
  };
  // enemy_climb ($3447): an enemy on a ladder, direction bit 0 up, bit 1 down. Up 2 lines a frame
  // while the ladder goes on at its legs, past its top with the row it reads raised (enemy_climb_y
  // 6) while there is a floor there; down 2 lines while the ladder goes on under it. At either end
  // it gets off, walking towards the hero; one that passed the middle floor on the Bridge is taken
  // off the count it had there.
  P.enemy_climb = function (r) {
    const x = r.x;
    const y = M[enemy_dir + x];
    const up = () => {
      for (let k = 0; k < 2; k++) {
        M[enemy_top_y + x] = (M[enemy_top_y + x] - 1) & 255;
        M[enemy_bot_y + x] = (M[enemy_bot_y + x] - 1) & 255;
      }
      M[enemy_on_ladder + x] = 1;
      return { a: 1, y };
    };
    const held = () => { M[enemy_climb_y + x] = 0x15; M[enemy_on_ladder + x] = 1; return { a: 1, y }; };
    if (!(y & 3)) return { a: 0, y };
    if (y & M[enemy_attr + x] & 1) return up();
    if (!(M[enemy_attr + x] & 1) && (y & 1)) {
      if (M[enemy_climb_y + x] === 6) return held();
      if (M[enemy_char + x] >= 0xC8) { M[enemy_climb_y + x] = 6; return up(); }
    } else if (y & M[enemy_floor_attr + x] & 2) {
      for (let k = 0; k < 2; k++) {
        M[enemy_top_y + x] = (M[enemy_top_y + x] + 1) & 255;
        M[enemy_bot_y + x] = (M[enemy_bot_y + x] + 1) & 255;
      }
      return held();
    }
    M[enemy_climb_y + x] = 0x15;
    M[enemy_dir + x] = M[enemy_xu + x] < M[player_xu] ? 8 : 4;
    M[enemy_climbing + x] = 0;
    if (!M[ladder_through + x]) return { a: 0, y };
    let k = P.floor_find({ x }).y;
    if (k === 1) {
      k = (M[ladder_through + x] - 1) & 255;
      M[floor_counts + k] = (B(floor_counts + k) - 1) & 255;
    } else {
      dec(floor_counts + 1);
      k = (M[ladder_through + x] - 1) & 255;
      M[enemy_floor + x] = k;
    }
    M[ladder_through + x] = 0;
    return { a: 0, y: k };
  };
  // floor_find ($34EA): the floor whose Y is enemy X's top Y, from 2 down, or $FF.
  P.floor_find = function (r) {
    const a = M[enemy_top_y + r.x];
    let y = 2;
    while (y >= 0 && a !== M[floor_y + y]) y--;
    return { a, y: y & 255 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
