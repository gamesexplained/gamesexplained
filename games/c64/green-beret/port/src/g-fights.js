// The end-of-stage fights, run each frame in place of the main loop's second half while boss_on is
// set (stage_end_dispatch): the Missile Base's lorry and the soldiers it brings, the Harbour's dogs
// and the man who sends them, the Bridge's helicopters and the Prison Camp's waves. Each ends a
// frame with the sprites' sort and goes back to the main loop, or to stage_complete when it is won.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.fights = function (P) {
  const M = P.M, B = P.B, N = root.GBNames;
  const { stage, stage_end_handlers, boss_count, boss_phase, floor_counts, dog_anim, lane_ready, lane_type,
    lane_sides, prison_wave_types, wave_sides, enemy_active, eshot_active, dog_live, handler_side, handler_timer,
    spawn_lane, enemy_jumping, enemy_floor, enemy_xu, enemy_top_y, enemy_bot_y, enemy_dir, player_xu, enemy_wait,
    enemy_timer, handler_shapes, enemy_top_shape, enemy_bot_shape, enemy_dying, dog_hit, enemy_step, dog_jump,
    enemy_top_xlo, enemy_top_xhi, enemy_bot_xlo, enemy_top_colour, enemy_bot_colour, dog_delay, dog_sides,
    dog_colours, dog_delays, spawn_type, spawn_speed, joy, jump_arc, dog_base, dog_arc, x_save, y_save, enemy_hit,
    heli_mode, helis_low, heli_height, heli_bob_index, heli_base, heli_bob, heli_xu, heli_dir, heli_first_slot,
    heli_turn_shapes, heli_turn_pause, enemy_facing, enemy_type, work, helis_out, heli_launch_timer, heli_frame,
    rotor_frame_offsets, rotor_shapes, rotor_limit, heli_start_x, heli_start_y, heli_start_dir } = N;
  const X = (r, x) => (r && r.x !== undefined ? r.x : x);
  const Y = (r, y) => (r && r.y !== undefined ? r.y : y);
  // A call of the routines that find the hero touching an enemy: a death there drops only the
  // return address of this call, and the fight's own (fight_update's) stays on the stack (core.js).
  const contact = r => { P.deep = 1; try { return P.enemy_contact(r); } finally { P.deep = 0; } };
  // Calls in turn, each handed the registers the one before left
  const seq = (reg, ...fs) => { for (const f of fs) { const r = f(Object.assign({}, reg)); if (r) Object.assign(reg, r); } return reg; };
  P.CHECKPOINTS.push(0x0C44, 0x0C47, 0x0C4A, 0x0C4D, 0x0C50, 0x0C58, 0x0C60,
    0x0CAA, 0x0CAD, 0x0CB0, 0x0CB3, 0x0CB6, 0x0CB9, 0x0CD0, 0x0CD8,
    0x1021, 0x1029, 0x102C, 0x102F, 0x1032, 0x1035, 0x1038, 0x103B, 0x1041, 0x1044,
    0x13D5, 0x13DA, 0x13DD, 0x13E5, 0x13E8, 0x13F5, 0x13F8, 0x13FE);

  // stage_end_dispatch ($0C2E): the stage's fight, through stage_end_handlers (each address less one,
  // for an RTS). Returns where the main program goes next: 'main_loop', 'stage_complete', or
  // { go: 'body', r } for the main loop's second half (the Missile Base's fight before it starts).
  const HANDLERS = { 0x13D0: 'missile_fight', 0x0CAA: 'harbour_fight', 0x1021: 'bridge_fight', 0x0C44: 'prison_fight' };
  P.stage_end_dispatch = function* () {
    const y = (M[stage] << 1) & 255;
    const at = ((M[stage_end_handlers + y] | M[stage_end_handlers + y + 1] << 8) + 1) & 0xFFFF;
    const h = HANDLERS[at];
    if (!h) throw new Error('stage_end_dispatch: no fight at $' + at.toString(16) + ' for stage ' + M[stage]);
    return yield* P[h]();
  };

  // any_enemy_left ($0D62): the first live enemy (slots 5-0), then the first live enemy projectile;
  // X on it and N clear, or X $FF and N set when there is none.
  P.any_enemy_left = function () {
    let x = 5, a;
    for (; x >= 0; x--) if ((a = M[enemy_active + x])) return { a, x, n: 0, z: x === 0 ? 1 : 0, c: 1 };
    for (x = 2; x >= 0; x--) if ((a = M[eshot_active + x])) return { a, x, n: 0, z: x === 0 ? 1 : 0, c: 1 };
    return { a, x: 0xFF, n: 1, z: 0, c: 1 };
  };
  // fight_update ($0FE5): what every fight runs of play.
  P.fight_update = function (r) {
    return seq(Object.assign({}, r), P.sprites_to_units, P.hero_chars, P.enemies_offscreen, contact, P.enemy_deaths,
      P.enemy_hold_timers, P.weapon_update, P.weapon_special);
  };
  // fight_enemies ($0FFD): the enemies' animation, the characters under them and their moves.
  P.fight_enemies = function (r) {
    return seq(Object.assign({}, r), P.enemies_anim, P.enemies_chars, P.enemies_move);
  };

  // prison_fight ($0C44): the waves, the spawner, play, the enemies' projectiles and moves; won when
  // the waves are spent and nothing is left.
  P.prison_fight = function* () {
    const reg = {};
    yield* P.cp(0x0C44); seq(reg, P.prison_waves);
    yield* P.cp(0x0C47); seq(reg, P.random_spawn);
    yield* P.cp(0x0C4A); seq(reg, P.fight_update);
    yield* P.cp(0x0C4D); seq(reg, P.eshots_update);
    yield* P.cp(0x0C50); seq(reg, P.fight_enemies);
    if (B(boss_count) & 0x80) {
      yield* P.cp(0x0C58);
      if (P.any_enemy_left().n) return 'stage_complete';
    }
    yield* P.cp(0x0C60); P.sprites_sort();
    return 'main_loop';
  };
  // prison_waves ($0C66): the fight starts once nothing is left (dog_anim its phase); then while
  // waves remain (boss_count) and the bottom floor has room, the lane is readied with the wave's type
  // (prison_wave_types) and side (wave_sides).
  P.prison_waves = function () {
    if (!M[dog_anim]) {
      if (!P.any_enemy_left().n) return {};
      M[floor_counts] = 0;
      M[dog_anim] = (M[dog_anim] + 1) & 255;
    }
    if (B(boss_count) & 0x80) return {};
    if (B(floor_counts) >= 3) return {};
    if (M[lane_ready]) return {};
    M[lane_ready] = (M[lane_ready] + 1) & 255;
    let y = B(boss_count) & 3;
    M[lane_type] = M[prison_wave_types + y];
    y &= 1;
    M[lane_sides] = M[wave_sides + y];
    M[boss_count] = (B(boss_count) - 1) & 255;
    return { y };
  };

  // harbour_fight ($0CAA): the start, the dogs' handler, play, the dogs, the enemies; won when the
  // dogs are spent and no enemy or dog is out, the sprite shapes swapped back (block_swap 7).
  P.harbour_fight = function* () {
    const reg = {};
    yield* P.cp(0x0CAA); seq(reg, P.harbour_fight_start);
    yield* P.cp(0x0CAD); seq(reg, P.dog_handler);
    yield* P.cp(0x0CB0); seq(reg, P.fight_update);
    yield* P.cp(0x0CB3); seq(reg, P.dogs_update);
    yield* P.cp(0x0CB6); seq(reg, P.fight_enemies);
    yield* P.cp(0x0CB9); seq(reg, P.enemy_hold_timers);
    let won = (B(boss_count) & 0x80) && !M[enemy_active];
    if (won) for (let x = 2; x >= 0; x--) if (M[dog_live + 1 + x]) { won = false; break; }
    if (won) {
      yield* P.cp(0x0CD0); P.block_swap({ a: 7 });
      return 'stage_complete';
    }
    yield* P.cp(0x0CD8); P.sprites_sort();
    return 'main_loop';
  };
  // harbour_fight_start ($0D79): once nothing is left, the bottom floor's count cleared, the fight
  // on, the handler at the right and the dogs' shapes swapped in (block_swap 7).
  P.harbour_fight_start = function () {
    if (B(boss_phase)) return {};
    if (!P.any_enemy_left().n) return {};
    M[floor_counts] = 0;
    M[boss_phase] = (B(boss_phase) + 1) & 255;
    M[handler_side] = 4;
    return P.block_swap({ a: 7 });
  };
  // dog_handler ($0CDE): the man in slot 0. Put in at the bottom floor at the side opposite to the
  // last (spawn_set_x) when the slot is empty; each time his timer runs out with the hero on the side
  // he faces, he stops and turns to him (handler_shapes) for $19 frames.
  P.dog_handler = function () {
    const x = 0;
    if (!B(boss_phase)) return { x };
    if (!M[enemy_active]) {
      M[spawn_lane] = 0;
      M[enemy_jumping] = 0;
      M[lane_type] = 5;
      M[handler_side] ^= 0x0C;
      P.spawn_set_x({ a: M[handler_side], x });
      M[enemy_floor] = 0;
      M[floor_counts] = (B(floor_counts) + 1) & 255;
      M[enemy_xu] = 0;
      M[enemy_top_y] = 0xCD;
      M[enemy_bot_y] = 0xE2;
      M[enemy_dir] = M[handler_side];
      M[handler_timer] = 0x1E;
    }
    M[handler_timer] = (M[handler_timer] - 1) & 255;
    if (M[handler_timer]) return { x };
    if (M[handler_side] === 4) { if (M[player_xu] >= M[enemy_xu]) return { x }; }
    else if (M[player_xu] < M[enemy_xu]) return { x };
    M[handler_timer] = 0x3C;
    M[enemy_wait] = 1;
    M[enemy_timer] = 0x19;
    const y = M[player_xu] >= M[enemy_xu] ? 1 : 0;
    M[enemy_top_shape] = M[handler_shapes + y];
    return { x, y };
  };
  // dogs_update ($0D96): a dog let out while fewer than four are (the handler counts), then the
  // dogs' moves, the knife's hits on them and their legs.
  P.dogs_update = function () {
    if (B(floor_counts) < 4) P.dog_release();
    P.dogs_move();
    P.dogs_hit();
    return P.dogs_animate();
  };
  // dogs_hit ($0DAA): a dog the knife marked (dog_hit) and not yet dying starts $1E frames of dying,
  // turned round and thrown up (dog_leap_start, shape $CF or $D0 by the side it ran from).
  P.dogs_hit = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[enemy_dying + 1 + x]) {
        if (!B(dog_hit + 1 + x)) continue;
        M[enemy_step + x] = 0x1E;
        M[enemy_dying + 1 + x] = 0x1E;
        const a = M[enemy_dir + 1 + x];
        M[enemy_dir + 1 + x] = a ^ 0x0C;
        P.dog_leap_start({ a: a & 4 ? 0xD0 : 0xCF, x });
      }
      P.dog_dying({ x });
    }
    return { x: 0xFF };
  };
  // dog_dying ($0DDB): a dying dog's timer down; at 0 its slot cleared and the floor's count less.
  P.dog_dying = function (r) {
    const x = r.x;
    M[enemy_step + x] = (M[enemy_step + x] - 1) & 255;
    if (M[enemy_step + x]) return {};
    M[dog_jump + x] = 0; M[dog_live + 1 + x] = 0; M[dog_hit + 1 + x] = 0; M[enemy_dying + 1 + x] = 0;
    M[enemy_top_xhi + 1 + x] = 0; M[enemy_top_xlo + 1 + x] = 0; M[enemy_xu + 1 + x] = 0;
    M[floor_counts] = (B(floor_counts) - 1) & 255;
    M[enemy_top_y + 1 + x] = 0;
    return { a: 0 };
  };
  // dogs_animate ($0DFD): every fourth frame a running dog's shape steps on ($C9-$CB to the right,
  // $CC-$CE to the left).
  P.dogs_animate = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[dog_live + 1 + x] || M[enemy_dying + 1 + x] || M[dog_jump + x]) continue;
      if (M[dog_anim + x] < 3) { M[dog_anim + x]++; continue; }
      M[dog_anim + x] = 0;
      let s = (M[enemy_top_shape + 1 + x] + 1) & 255;
      if (M[enemy_dir + 1 + x] === 8) { if (s >= 0xCC) s = 0xC9; } else if (s >= 0xCF) s = 0xCC;
      M[enemy_top_shape + 1 + x] = s;
    }
    return { x: 0xFF };
  };
  // dogs_move ($0E4F): each dog 4 pixels a frame, gone at either edge; one running right may leap at
  // the hero (dog_leap_check), one running left finishes a leap it is in.
  P.dogs_move = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[dog_live + 1 + x]) continue;
      let gone = false;
      if (M[enemy_dir + 1 + x] !== 4) {
        const lo = M[enemy_top_xlo + 1 + x] + 4;
        M[enemy_top_xlo + 1 + x] = lo & 255;
        const hi = (M[enemy_top_xhi + 1 + x] + (lo > 255 ? 1 : 0)) & 255;
        M[enemy_top_xhi + 1 + x] = hi;
        if (hi && M[enemy_top_xlo + 1 + x] >= 0x50) gone = true;
        else P.dog_leap_check({ x });
      } else {
        const lo = M[enemy_top_xlo + 1 + x] - 4;
        M[enemy_top_xlo + 1 + x] = lo & 255;
        const hi = (M[enemy_top_xhi + 1 + x] - (lo < 0 ? 1 : 0)) & 255;
        M[enemy_top_xhi + 1 + x] = hi;
        if (!hi && M[enemy_top_xlo + 1 + x] < 0x12) gone = true;
        else if (M[dog_jump + x]) P.dog_leap({ x });
      }
      if (gone) {
        M[dog_live + 1 + x] = 0; M[dog_jump + x] = 0; M[enemy_dying + 1 + x] = 0; M[dog_hit + 1 + x] = 0;
        M[enemy_top_xlo + 1 + x] = 0; M[enemy_top_xhi + 1 + x] = 0;
        M[floor_counts] = (B(floor_counts) - 1) & 255;
        M[enemy_top_y + 1 + x] = 0; M[enemy_xu + 1 + x] = 0;
      }
    }
    return { x: 0xFF };
  };
  // dog_release ($0EC5): the next dog (boss_count counts down from $11) once dog_delay has run out and
  // a slot is free: its side (dog_sides, 8 the left, 4 the right), colour, place at that edge and a
  // bark.
  P.dog_release = function () {
    if (B(boss_count) & 0x80) return {};
    if (M[dog_delay]) { M[dog_delay] = (M[dog_delay] - 1) & 255; return {}; }
    let y = B(boss_count);
    M[spawn_type] = M[dog_sides + y];
    M[spawn_speed] = M[dog_colours + y];
    let x = 2;
    for (; x >= 0; x--) if (!M[dog_live + 1 + x]) break;
    if (x < 0) return { x: 0xFF, y };
    y = (y - 1) & 255;
    M[boss_count] = y;
    M[dog_delay] = M[dog_delays + y];
    M[enemy_dir + 1 + x] = M[spawn_type];
    M[enemy_top_colour + 1 + x] = M[spawn_speed];
    M[enemy_top_y + 1 + x] = 0xE2;
    M[floor_counts] = (B(floor_counts) + 1) & 255;
    M[dog_live + 1 + x] = (M[dog_live + 1 + x] + 1) & 255;
    if (M[spawn_type] === 4) { M[enemy_top_xhi + 1 + x] = 1; M[enemy_top_xlo + 1 + x] = 0x4E; M[enemy_top_shape + 1 + x] = 0xCD; }
    else { M[enemy_top_xhi + 1 + x] = 0; M[enemy_top_xlo + 1 + x] = 0x10; M[enemy_top_shape + 1 + x] = 0xCA; }
    M[enemy_step + x] = 1;
    M[enemy_xu + 1 + x] = 1;
    P.sfx_bark();
    return { x };
  };
  // dog_leap_check ($0F43): a dog running right leaps (shape $CA) when the hero is just ahead of it
  // and not holding the stick down.
  P.dog_leap_check = function (r) {
    const x = r.x;
    if (M[dog_jump + x]) return P.dog_leap({ x });
    if (P.dog_hero_ahead({ x }).c) return {};
    if (B(joy) & 2) return {};
    return P.dog_leap_start({ a: 0xCA, x });
  };
  // dog_leap_start ($0F56): the leap's shape (A), the arc's index at $11 and the dog's base Y; then
  // its first frame.
  P.dog_leap_start = function (r) {
    const x = r.x;
    M[enemy_top_shape + 1 + x] = r.a;
    M[dog_jump + x] = (M[dog_jump + x] + 1) & 255;
    M[dog_base + x] = (M[enemy_top_y + 1 + x] - M[jump_arc + 0x11]) & 255;
    M[dog_arc + x] = 0x11;
    return P.dog_leap({ x });
  };
  // dog_leap ($0F6B): one frame of a leap, Y the base plus jump_arc; the index down to 0 rising,
  // then up to $12 falling, where the leap ends.
  P.dog_leap = function (r) {
    const x = r.x;
    let y = M[dog_arc + x];
    M[enemy_top_y + 1 + x] = (M[dog_base + x] + M[jump_arc + y]) & 255;
    if (M[dog_jump + x] & 0x80) {
      y = (y + 1) & 255;
      M[dog_arc + x] = y;
      if (y === 0x12) M[dog_jump + x] = 0;
      return { y };
    }
    y = (y - 1) & 255;
    M[dog_arc + x] = y;
    if (!(y & 0x80)) return { y };
    M[dog_jump + x] = 0x80;
    M[dog_arc + x] = (M[dog_arc + x] + 1) & 255;
    return { y };
  };
  // dog_hero_ahead ($0F9B): carry clear when the hero is ahead of the dog by less than $14 units.
  P.dog_hero_ahead = function (r) {
    const a = M[enemy_xu + 1 + r.x];
    if (a >= M[player_xu]) return { c: 1 };
    return { c: ((a + 0x14) & 255) < M[player_xu] ? 1 : 0 };
  };

  // bridge_fight ($1021): the helicopters launched; while the fight is on, placed, turned into
  // pixels, their rotors turned and their heights and X units moved, with bridge_fight_update;
  // before it starts, play as in the other fights.
  P.bridge_fight = function* () {
    const reg = {};
    yield* P.cp(0x1021); seq(reg, P.helis_launch);
    if (B(boss_phase)) {
      yield* P.cp(0x1029); seq(reg, P.helis_place);
      yield* P.cp(0x102C); seq(reg, P.helis_x_to_pixels);
      yield* P.cp(0x102F); seq(reg, P.helis_rotor);
      yield* P.cp(0x1032); seq(reg, P.helis_move);
      yield* P.cp(0x1035); seq(reg, P.bridge_fight_update);
    } else {
      yield* P.cp(0x1041); seq(reg, P.fight_update);
      yield* P.cp(0x1044); seq(reg, P.fight_enemies);
    }
    yield* P.cp(0x1038); seq(reg, P.eshots_update);
    yield* P.cp(0x103B); P.sprites_sort();
    return 'main_loop';
  };
  // bridge_fight_update ($1006): fight_update with the helicopters' hits (heli_hits) and the
  // explosions of the hero's projectiles (shots_explode_step) in place of enemy_deaths.
  P.bridge_fight_update = function (r) {
    return seq(Object.assign({}, r), P.sprites_to_units, P.hero_chars, P.enemies_offscreen, contact,
      P.shots_explode_step, P.heli_hits, P.enemy_hold_timers, P.weapon_update, P.weapon_special);
  };
  // heli_hits ($104A): a helicopter any of whose slots is hit is destroyed.
  P.heli_hits = function () {
    for (let x = 5; x >= 0; x--) if (B(enemy_hit + x)) { M[x_save] = x; P.heli_destroy({ x }); x = M[x_save]; }
    return { x: 0xFF };
  };
  // shots_explode_step ($1061): the explosion of each of the hero's projectiles, slots 2-0.
  P.shots_explode_step = function () {
    let x = 2;
    do { x = X(P.shot_explosion({ x }), x); x = (x - 1) & 255; } while (!(x & 0x80));
    return { x };
  };
  // helis_move ($106A): a helicopter coming down drops 2 lines a frame to $90, or to $58 when the
  // other is low; there it bobs (heli_bob from heli_base) about that height; then its X (heli_steer).
  P.helis_move = function () {
    for (let y = 1; y >= 0; y--) {
      if (!M[heli_mode + y]) {
        if (M[helis_low] && M[heli_height + y] >= 0x58) {
          M[heli_mode + y] = 1; M[heli_bob_index + y] = 0x58; M[heli_base + y] = 0;
        } else if (M[heli_height + y] >= 0x90) {
          M[heli_mode + y] = 1; M[helis_low] = 1; M[heli_bob_index + y] = 0x90; M[heli_base + y] = 0;
        } else if (M[heli_height + y]) M[heli_height + y] = (M[heli_height + y] + 2) & 255;
      } else {
        let x = M[heli_base + y];
        const a = M[heli_bob + x];
        let down = false;
        if (a & 0x80) { M[heli_mode + y] = a; down = true; }
        else {
          M[heli_height + y] = (a + M[heli_bob_index + y]) & 255;
          if (M[heli_mode + y] & 0x80) down = true;
          else M[heli_base + y] = (x + 1) & 255;
        }
        if (down) {
          x = (x - 1) & 255;
          if (x & 0x80) M[heli_mode + y] = 1;
          else M[heli_base + y] = x;
        }
      }
      P.heli_steer({ y });
    }
    return { y: 0xFF };
  };
  // heli_steer ($10EE): one hovering at $58 patrols between $14 and $8C units; one at $90 turns to
  // the hero when he is more than $14 units away; then its X moves by its direction.
  P.heli_steer = function (r) {
    const y = r.y;
    const bi = M[heli_bob_index + y];
    const step = () => { M[heli_xu + y] = (M[heli_dir + y] + M[heli_xu + y]) & 255; return { y }; };
    const turn = d => { if ((d < 0x80) !== !(M[heli_dir + y] & 0x80)) { M[heli_dir + y] = d; P.heli_turn({ y }); } return step(); };
    const xu = M[heli_xu + y], px = M[player_xu];
    if (bi === 0x58) {
      if (xu < 0x14) return turn(1);
      if (xu >= 0x8C) return turn(0xFF);
      return step();
    }
    const a = (xu + 0x14 + (bi >= 0x58 ? 1 : 0)) & 255;
    if (a >= px && ((a - 0x28) & 255) < px) return step();
    return turn(xu < px ? 1 : 0xFF);
  };
  // heli_turn ($1185): helicopter Y's turning shapes in its three slots, and its rotor held for 6
  // frames.
  P.heli_turn = function (r) {
    let x = M[heli_first_slot + r.y];
    M[y_save] = r.y;
    for (let y = 0; y < 3; y++, x++) {
      M[enemy_top_shape + x] = M[heli_turn_shapes + y];
      M[enemy_bot_shape + x] = M[heli_turn_shapes + 3 + y];
    }
    const y = M[y_save];
    M[heli_turn_pause + y] = 6;
    return { a: 6, x, y };
  };
  // heli_fire ($11A9): helicopter Y's middle slot (X+1) faced its way and made a type 8 long enough
  // to fire (enemy_fire), then a helicopter (type 9) again.
  P.heli_fire = function (r) {
    let x = (r.x + 1) & 255;
    const y = r.y;
    M[enemy_facing + x] = M[heli_dir + y] & 0x80 ? 0x04 : 0x08;
    M[enemy_type + x] = 8;
    if (!M[heli_height + y]) return { a: 0, x, y };
    M[x_save] = x; M[y_save] = y;
    P.enemy_fire({ x, y });
    x = M[x_save];
    M[enemy_type + x] = 9;
    return { a: 9, x: (x - 1) & 255, y: M[y_save] };
  };
  // heli_destroy ($11DC): the three slots of the helicopter slot X is in cleared, one fewer out, the
  // next launch $20 frames away, and its height and both modes 0.
  P.heli_destroy = function (r) {
    let x = r.x < 3 ? 0 : 3;
    M[work] = x + 3;
    for (; x !== M[work]; x++) {
      M[enemy_active + x] = 0; M[enemy_hit + x] = 0; M[enemy_dying + x] = 0;
      M[enemy_top_y + x] = 0; M[enemy_bot_y + x] = 0;
    }
    M[helis_out] = (M[helis_out] - 1) & 255;
    M[helis_low] = 0;
    M[heli_launch_timer] = 0x20;
    const y = x >> 2;
    M[heli_height + y] = 0;
    M[heli_mode] = 0; M[heli_mode + 1] = 0;
    return { a: 0, x, y };
  };
  // helis_rotor ($121E): each helicopter's rotor frame (heli_frame, 0-3) on and its six shapes
  // copied from rotor_shapes (flying left 24 further on); a helicopter that is turning keeps its own.
  // The copy's end is the operand at $1267 (rotor_limit): 3, then 6.
  P.helis_rotor = function () {
    let y = 0, x = 0;
    M[rotor_limit] = 3;
    for (;;) {
      if (M[heli_turn_pause + y]) {
        M[heli_turn_pause + y] = (M[heli_turn_pause + y] - 1) & 255;
        if (y === 1) return { x, y };
        x = 3;
      } else {
        // the ADC of the offset takes the carry the frame's ADC left when the direction is right
        const c = M[heli_frame + y] === 0xFF ? 1 : 0;
        const f = (M[heli_frame + y] + 1) & 3;
        M[heli_frame + y] = f;
        M[y_save] = f;
        let k = ((M[heli_dir + y] & 0x80 ? 0x18 : c) + M[rotor_frame_offsets + M[y_save]]) & 255;
        do {
          M[enemy_top_shape + x] = M[rotor_shapes + k];
          M[enemy_bot_shape + x] = M[rotor_shapes + 3 + k];
          k = (k + 1) & 255; x = (x + 1) & 255;
        } while (x !== M[rotor_limit]);
        if (x === 6) return { x, y: k };
      }
      M[rotor_limit] = 6;
      y = 1;
    }
  };
  // helis_x_to_pixels ($12B7): the twelve enemy sprites' X, written in units, doubled into pixels.
  P.helis_x_to_pixels = function () {
    for (let x = 0x0B; x >= 0; x--) {
      const v = M[enemy_top_xlo + x];
      M[enemy_top_xlo + x] = (v << 1) & 255;
      M[enemy_top_xhi + x] = v >> 7;
    }
    return { x: 0xFF };
  };
  // helis_place ($12CB): each helicopter that is out fires when its time comes (enemy_fire_check,
  // heli_fire); its three slots at its X less $0C, then $0C apart, at its height, and hidden past
  // $AC units.
  P.helis_place = function () {
    if (!M[helis_out]) return {};
    let y = 1;
    do {
      if (M[heli_height + y]) {
        M[work] = y;
        let x = (y * 2 + M[work]) & 255;
        const end = (x + 3) & 255;
        const f = P.enemy_fire_check({ a: end, x, y });
        x = X(f, x); y = Y(f, y);
        if (f.c) { const h = P.heli_fire({ x, y }); x = X(h, x); y = Y(h, y); }
        M[work] = end;
        let a = (M[heli_xu + y] - 0x0C) & 255;
        do {
          M[enemy_top_xlo + x] = a; M[enemy_bot_xlo + x] = a;
          a = (a + 0x0C) & 255; x = (x + 1) & 255;
        } while (x !== M[work]);
        x = (x - 3) & 255;
        do {
          if (M[enemy_top_xlo + x] >= 0xAC) { M[enemy_top_y + x] = 0; M[enemy_bot_y + x] = 0; }
          else { M[enemy_top_y + x] = M[heli_height + y]; M[enemy_bot_y + x] = (M[heli_height + y] + 0x15) & 255; }
          x = (x + 1) & 255;
        } while (x !== M[work]);
      }
      y = (y - 1) & 255;
    } while (!(y & 0x80));
    return { y };
  };
  // helis_launch ($1330): three helicopters (boss_count 3, 2, 1). The fight starts once nothing is
  // left: the hits and dying flags cleared, its tune ($2F). A helicopter goes up when fewer than two
  // are out and the launch timer has run out, into the first free slot's pair; the fight is won
  // when the last is gone, by a JMP that leaves this call's return address on the stack.
  P.helis_launch = function () {
    if (!B(boss_count)) {
      if (M[helis_out]) return {};
      P.leak += 2;
      throw P.jump('stage_complete');
    }
    if (B(boss_count) === 3) {
      if (!P.any_enemy_left().n) return {};
      for (let x = 5; x >= 0; x--) { M[enemy_dying + x] = 0; M[enemy_hit + x] = 0; }
      M[heli_mode] = 0;
      P.tune_start({ y: 0x2F });
      M[boss_phase] = (B(boss_phase) + 1) & 255;
    }
    const out = M[helis_out];
    if (out) {
      if (out === 2) return {};
      M[heli_launch_timer] = (M[heli_launch_timer] - 1) & 255;
      if (M[heli_launch_timer]) return {};
    }
    let x = 0;
    while (M[enemy_active + x]) if (++x >= 6) return { x };
    return P.heli_launch({ x, y: x >> 1 });
  };
  // heli_launch ($1380): helicopter Y into slots X to X+2, from its side (heli_start_x, _y, _dir), a
  // type 9 with a white top and blue bottom; one more out, one fewer to come.
  P.heli_launch = function (r) {
    let x = r.x;
    const y = r.y;
    M[heli_xu + y] = M[heli_start_x + y];
    M[heli_height + y] = M[heli_start_y + y];
    M[heli_dir + y] = M[heli_start_dir + y];
    M[work] = (x + 3) & 255;
    do {
      M[enemy_active + x] = 9; M[enemy_type + x] = 9; M[enemy_dying + x] = 0;
      M[enemy_top_colour + x] = 1; M[enemy_bot_colour + x] = 6;
      x = (x + 1) & 255;
    } while (x !== M[work]);
    M[helis_out] = (M[helis_out] + 1) & 255;
    M[boss_count] = (B(boss_count) - 1) & 255;
    M[heli_launch_timer] = 0x20;
    M[heli_mode + y] = 0;
    return { a: 0, x, y };
  };

  // missile_fight ($13D0): until nothing is left the main loop's second half runs as in play; then
  // the lorry, play, and the soldiers it brings; won when they are spent and the bottom floor is
  // empty, after the tune has ended.
  P.missile_fight = function* () {
    if (!B(boss_phase)) {
      yield* P.cp(0x13D5);
      const r = P.any_enemy_left();
      if (!r.n) return { go: 'body', r };
    }
    const reg = {};
    yield* P.cp(0x13DA); seq(reg, P.lorry_update);
    yield* P.cp(0x13DD); seq(reg, P.fight_update);
    if (B(boss_phase)) {
      yield* P.cp(0x13E5); seq(reg, P.missile_fight_spawn);
      yield* P.cp(0x13E8); seq(reg, P.fight_enemies);
      if (!B(boss_count) && !B(floor_counts)) {
        yield* P.cp(0x13F5); P.voice1_tune_off();
        yield* P.cp(0x13F8); yield* P.wait_tune();
        return 'stage_complete';
      }
    }
    yield* P.cp(0x13FE); P.sprites_sort();
    return 'main_loop';
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
