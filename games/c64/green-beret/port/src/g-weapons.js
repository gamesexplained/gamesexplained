// The projectiles: six slots of sprites 14-19, the hero's three (0-2) and the enemies' three (3-5).
// The hero's weapon (weapon, 2 the bazooka, 3 the hand grenades, 4 the flame thrower) fires on SPACE
// or the fire button (weapon_trigger, weapon_fire); each frame they move, leave the screen, hit the
// enemies (pshot_hits) or explode, the grenades fly their arcs, and the weapon's own routine runs
// (weapon_special). The enemies' projectiles run the routine of their type (eshots_update).
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.weapons = function (P) {
  const M = P.M, B = P.B, io = P.io, N = root.GBNames;
  const { spawn_tries, lane_sides, spawn_lane, floor_counts, frame_counters, boss_count, missile_fight_types,
    lane_type, x_keep, enemy_facing, enemy_dir, enemy_anim_state, enemy_wait, shots_flash_colours, shot_colour,
    ammo, weapon_shown, shot_active, weapon, flame_free, shot_xlo, shot_xhi, shot_y, shot_speed, shot_dir,
    stage, enemy_active, dog_live, enemy_type, helis_out, para_slots, test_y, test_x, shot_xu, enemy_dying,
    enemy_anim_index, enemy_xu, box_end, box_start, enemy_top_y, dog_hit, enemy_hit, x_save, y_save, y_save3,
    ladder_on, space_last, weapon_handlers, weapon_vector, shot_arc_state, shot_arc_index, shot_arc_base,
    jump_arc, shot_char, char_attrs, ptr, ptr_hi, work, shot_exploding, shot_shape, shot_blast_timer, x_save3,
    para_hit, joy, spr_y, spr_xlo, hero_facing, shot_offset, shot_colours, shot_shapes_right, shot_shapes_left,
    shot_type, eshot_handlers, eshot_vector, jet_slot, hero_xlo } = N;
  const X = (r, x) => (r && r.x !== undefined ? r.x : x);

  // missile_fight_spawn ($165B): the Missile Base fight's 18 soldiers (boss_count), from the right on
  // the bottom floor: one when the floor holds fewer than two, or two and the frame counter has run
  // out, which is then set $0B frames off ($F5).
  P.missile_fight_spawn = function () {
    M[spawn_tries] = 1;
    M[lane_sides] = 4;
    M[spawn_lane] = 0;
    const a = B(floor_counts);
    if (a >= 3) return {};
    if (a >= 2 && B(frame_counters)) return {};
    M[frame_counters] = 0xF5;
    const y = (B(boss_count) - 1) & 255;
    if (y & 0x80) return { y };
    M[boss_count] = y;
    M[lane_type] = M[missile_fight_types + y];
    let x = X(P.enemy_free_slot(), 0);
    x = X(P.spawn_on_floor({ x, y: 0 }), x);
    M[x_keep] = x;
    P.enemy_anim_start({ a: 4, x });
    x = M[x_keep];
    M[enemy_facing + x] = 4; M[enemy_dir + x] = 4; M[enemy_anim_state + x] = 4;
    M[enemy_wait + x] = 0;
    return { a: 0, x };
  };
  // shots_flash ($16C7): every projectile yellow or red by bit 2 of the frame counter.
  P.shots_flash = function () {
    const y = (B(frame_counters) & 4) >> 2;
    for (let x = 5; x >= 0; x--) M[shot_colour + x] = M[shots_flash_colours + y];
    return { x: 0xFF, y };
  };
  // weapon_update ($16DD): the projectiles gone off the screen, the hero's hits, the mines; a shot
  // fired when the trigger has just gone down and a slot is free, one round less (the weapon gone
  // with the last) and the count drawn; the scroll; each projectile moved by its speed; the flame's
  // tip drawn in when it is near the hero; the flashing colours.
  P.weapon_update = function () {
    P.shots_offscreen();
    P.pshot_hits();
    P.shots_vs_mines();
    if (!P.weapon_trigger().z) {
      const f = P.pshot_free_slot();
      if (!f.c) {
        P.weapon_fire({ x: f.x });
        M[ammo] = (M[ammo] - 1) & 255;
        if (!M[ammo]) M[weapon_shown] = 0;
        P.draw_ammo();
      }
    }
    P.shots_scroll();
    for (let x = 5; x >= 0; x--) {
      if (!M[shot_active + x]) continue;
      if (M[shot_dir + x] === 8) {
        const v = M[shot_xlo + x] + M[shot_speed + x];
        M[shot_xlo + x] = v & 255;
        if (v > 255) M[shot_xhi + x] = 1;
      } else {
        const v = M[shot_xlo + x] - M[shot_speed + x];
        M[shot_xlo + x] = v & 255;
        if (v < 0) M[shot_xhi + x] = 0;
      }
    }
    if (M[weapon] === 4 && M[flame_free] && ((M[shot_xlo] - M[shot_xlo + 2]) & 255) < 0x17) {
      M[shot_y + 1] = 0;
      M[shot_speed + 2] = 6;
    }
    return P.shots_flash();
  };
  // pshot_hits ($1760): each of the hero's projectiles that is out (not the grenades, which hit when
  // they explode) against every live enemy, and in the Harbour the dogs in slots 1-3: inside 3 units
  // across and $10 lines up or down (its Y less $13) it marks the enemy or dog hit. A helicopter's
  // middle slots are hit, and the shot explodes and the helicopter is destroyed; a paratrooper only
  // in his own slot (para_slots), and he lets go of his parachute (para_release).
  P.pshot_hits = function () {
    for (let y = 2; y >= 0; y--) {
      if (!M[shot_active + y] || M[weapon] === 3) continue;
      M[y_save] = y;
      for (let x = 5; x >= 0; x--) {
        let yy = M[y_save];
        if (!M[enemy_active + x] && !(M[stage] === 1 && x < 4 && M[dog_live + x])) continue;
        if (M[enemy_type + x] === 9) {
          if (M[helis_out]) { if (x !== 1 && x !== 4) continue; }
          else if (x !== M[para_slots]) continue;
        }
        M[test_y] = (M[shot_y + yy] - 0x13) & 255;
        M[test_x] = M[shot_xu + yy];
        if (M[enemy_dying + x]) continue;
        yy = M[enemy_anim_index + x];
        M[box_end] = (M[enemy_xu + x] + 3) & 255;
        M[box_start] = (M[enemy_xu + x] - 3) & 255;
        if (M[test_x] >= M[box_end] || M[test_x] < M[box_start]) continue;
        M[box_end] = (M[enemy_top_y + x] + 0x10) & 255;
        M[box_start] = (M[enemy_top_y + x] - 0x10) & 255;
        if (M[test_y] >= M[box_end] || M[test_y] < M[box_start]) continue;
        if (M[enemy_active + x]) M[enemy_hit + x] = 0x80; else M[dog_hit + x] = 0x80;
        M[x_save] = x; M[y_save3] = yy;
        if (M[enemy_type + x] === 9 && !M[helis_out]) { P.para_release({ x, y: yy }); P.sfx_hit(); }
        x = M[x_save];
        if (M[helis_out]) {
          M[x_save] = x;
          P.shot_explode({ x: M[y_save] });
          P.heli_destroy({ x: M[x_save] });
          x = M[x_save];
        }
      }
    }
    return { x: 0xFF, y: 0xFF };
  };
  // weapon_trigger ($184E): Z clear (A $10) when SPACE (CIA 1 port B bit 4, also the fire button of
  // port 1) has just gone down, with a weapon and rounds and the hero off the ladders.
  P.weapon_trigger = function () {
    if (!M[weapon]) return { a: 0, z: 1 };
    const x = B(ladder_on);
    if (x) return { a: 0, x, z: 1 };
    if (!M[ammo]) return { a: 0, x, z: 1 };
    const a = (io.ciaRead(0x01) & 0x10) ^ 0x10;
    if (a === M[space_last]) return { a, x, z: 1 };
    M[space_last] = a;
    return { a, x, z: a ? 0 : 1 };
  };
  // weapon_special ($1872): the weapon's own routine (weapon_handlers by weapon less one) through the
  // JMP at $1887, whose operand (weapon_vector) it writes.
  const SPECIAL = { 0x1893: null, 0x198E: null, 0x1894: 'grenades_update', 0x19EA: 'flame_update' };
  P.weapon_special = function () {
    let y = M[weapon];
    if (!y) return { y };
    y = ((y - 1) << 1) & 255;
    M[weapon_vector] = M[weapon_handlers + y];
    M[weapon_vector + 1] = M[weapon_handlers + 1 + y];
    const at = M[weapon_vector] | M[weapon_vector + 1] << 8;
    if (!(at in SPECIAL)) throw new Error('weapon_special: no routine at $' + at.toString(16));
    return SPECIAL[at] ? P[SPECIAL[at]]({ a: M[weapon_vector + 1], y }) : { a: M[weapon_vector + 1], y };
  };
  // grenades_update ($1894): each grenade out flies along jump_arc from shot_arc_base, the index down
  // while it rises, then up (shot_arc_state $80) until it is at the floor ($E2) or the arc's end
  // ($13); then it falls (shot_fall).
  P.grenades_update = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[shot_active + x]) continue;
      if (!M[shot_arc_state + x]) { P.shot_fall({ x }); continue; }
      let y = M[shot_arc_index + x];
      M[shot_y + x] = (M[shot_arc_base + x] + M[jump_arc + y]) & 255;
      if (M[shot_arc_state + x] & 0x80) {
        if (M[shot_y + x] >= 0xE2) { M[shot_arc_state + x] = 0; continue; }
        y = (y + 1) & 255;
        if (y >= 0x13) { M[shot_arc_state + x] = 0; continue; }
      } else {
        y = (y - 1) & 255;
        if (y & 0x80) { M[shot_arc_state + x] = 0x80; y = 0; }
      }
      M[shot_arc_index + x] = y;
    }
    return { x: 0xFF };
  };
  // shot_fall ($18E1): a grenade after its arc falls 4 lines a frame; it explodes on a floor
  // character (from $C8 with a floor bit, $0C, in char_attrs) or at the bottom ($E2).
  P.shot_fall = function (r) {
    const x = r.x;
    P.shot_char_read({ x });
    const a = M[shot_char + x];
    let boom = a >= 0xC8 && (M[char_attrs + a - 0xC8] & 0x0C);
    if (!boom) {
      const v = (M[shot_y + x] + 4) & 255;
      if (v >= 0xE2) boom = true;
      else { M[shot_y + x] = v; return { a: v, x }; }
    }
    P.shot_explode({ x });
    return P.shot_explosion({ x });
  };
  // shot_char_read ($1909): the character under projectile X: the row from its Y less $26 (times
  // 40, on the screen at $4000, through ptr), the column from its X units less 8, a quarter, plus 40.
  P.shot_char_read = function (r) {
    const x = r.x;
    const v = ((M[shot_y + x] - 0x26) & 255) & 0xF8;
    M[work] = v;
    const t = v << 2, lo = (t & 255) + v;
    M[ptr] = lo & 255;
    M[ptr_hi] = ((t >> 8) + 0x40 + (lo > 255 ? 1 : 0)) & 255;
    const y = ((((M[shot_xu + x] - 8) & 255) >> 2) + 0x28) & 255;
    const a = M[P.ind(ptr, y)];
    M[shot_char + x] = a;
    return { a, x, y };
  };
  // shot_explode ($193B): projectile X an explosion, unless it is one: still, white, shape $62 for 5
  // frames, the sound; one of the hero's hits what is in the blast (blast_hits).
  P.shot_explode = function (r) {
    let x = r.x;
    if (M[shot_exploding + x]) return { a: M[shot_exploding + x], x };
    M[shot_speed + x] = 0;
    M[shot_exploding + x] = 1; M[shot_colour + x] = 1;
    M[shot_shape + x] = 0x62;
    M[shot_blast_timer + x] = 5;
    M[x_save3] = x;
    P.sfx_explode();
    x = M[x_save3];
    if (x < 3) return Object.assign({ x }, P.blast_hits({ x }));
    return { x };
  };
  // shot_explosion ($1969): each 5 frames the next, smaller shape, $62 to $64; after $64 the
  // projectile is freed.
  P.shot_explosion = function (r) {
    const x = r.x;
    if (!M[shot_exploding + x]) return { a: 0, x };
    M[shot_blast_timer + x] = (M[shot_blast_timer + x] - 1) & 255;
    if (M[shot_blast_timer + x]) return { x };
    M[shot_blast_timer + x] = 5;
    if (M[shot_shape + x] >= 0x64) {
      M[shot_active + x] = 0; M[shot_y + x] = 0; M[shot_exploding + x] = 0;
      return { a: 0, x };
    }
    M[shot_shape + x] = (M[shot_shape + x] + 1) & 255;
    return { x };
  };
  // blast_hits ($198F): every live enemy in the blast of projectile X (blast_box) marked hit; a
  // paratrooper sets para_hit, and is hit only in his own slot.
  P.blast_hits = function (r) {
    const x = r.x;
    for (let y = 5; y >= 0; y--) {
      if (!M[enemy_active + y]) continue;
      if (!P.blast_box({ x, y }).c) continue;
      if (M[enemy_type + y] === 9 && !M[helis_out]) {
        M[para_hit] = 1;
        if (y !== M[para_slots]) continue;
      }
      M[enemy_hit + y] = 0x80;
    }
    return { y: 0xFF };
  };
  // blast_box ($19BA): carry set when enemy Y is inside projectile X's blast: within $28 units across
  // (the left bound 8 at the screen's edge) and $46 lines down from its top.
  P.blast_box = function (r) {
    const x = r.x, y = r.y;
    let a = (M[enemy_xu + y] + 0x28) & 255;
    if (a < M[shot_xu + x]) return { c: 0 };
    a = a < 0x50 ? 8 : a - 0x50;
    if (a >= M[shot_xu + x]) return { c: 0 };
    a = M[enemy_top_y + y] + 0x46;
    if (a > 255) a = 0xFF;
    if (a < M[shot_y + x]) return { c: 0 };
    if (((a - 0x46) & 255) >= M[shot_y + x]) return { c: 0 };
    return { c: 1 };
  };
  // flame_update ($19EA): while the flame is held its parts follow the hero (his top plus 5 when the
  // stick is down, $0A otherwise); once its tip is $14 units from its end the parts fly on at 8, 7
  // and 6 and the flame is let go (flame_free).
  P.flame_update = function () {
    if (M[flame_free]) return {};
    let x = 2;
    for (;;) {
      if (!M[shot_active + x]) { if (--x < 0) return { x: 0xFF }; continue; }
      M[shot_y + x] = ((B(joy) & 2) ? B(spr_y) + 5 : B(spr_y) + 0x0A) & 255;
      if (--x < 0) break;
    }
    let a = (M[shot_xu] - M[shot_xu + 2]) & 255;
    if (a & 0x80) a = ((a ^ 0xFF) + 1) & 255;
    if (a < 0x14) return { a, x: 0xFF };
    M[shot_speed + 2] = 8; M[shot_speed + 1] = 7;
    M[shot_speed] = 6; M[flame_free] = 6;
    return { a: 6, x: 0xFF };
  };
  // shots_offscreen ($1A3D): each projectile at $AA units or more or under 8 freed; one of the
  // hero's with the flame thrower sets all three parts' speed to 8.
  P.shots_offscreen = function () {
    for (let x = 5; x >= 0; x--) {
      if (!M[shot_active + x]) continue;
      const u = M[shot_xu + x];
      if (u < 0xAA && u >= 8) continue;
      M[shot_active + x] = 0; M[shot_y + x] = 0; M[shot_arc_state + x] = 0;
      if (M[weapon] === 4 && x < 3) { M[shot_speed + 2] = 8; M[shot_speed + 1] = 8; M[shot_speed] = 8; }
    }
    return { x: 0xFF };
  };
  // pshot_free_slot ($1A79) and free_shot_from_x ($1A7B): the first free slot from X down, carry
  // clear; carry set when there is none.
  P.free_shot_from_x = function (r) {
    for (let x = r.x; x >= 0; x--) if (!M[shot_active + x]) return { a: 0, x, c: 0 };
    return { x: 0xFF, c: 1 };
  };
  P.pshot_free_slot = () => P.free_shot_from_x({ x: 2 });
  // weapon_fire ($1A87): slot X takes the hero's facing, the weapon's colour, shape and speed, his
  // top plus $0A and his X plus $10 ($F0 to the left); a grenade starts its arc ($12); the flame
  // thrower, only from slot 2, fills slots 1 and 0 with its further parts.
  P.weapon_fire = function (r) {
    let x = r.x;
    const y = (M[weapon] - 1) & 255;
    if (y === 3 && x !== 2) return { y };
    const c = y === 3 ? 1 : y >= 3 ? 1 : 0;
    const f = B(hero_facing);
    M[shot_offset] = f & 4 ? 0xF0 : (0x10 + c) & 255;
    M[shot_dir + x] = f;
    M[shot_colour + x] = M[shot_colours + y];
    M[shot_y + x] = (B(spr_y) + 0x0A) & 255;
    M[shot_xlo + x] = (B(spr_xlo) + M[shot_offset]) & 255;
    M[flame_free] = 0;
    M[shot_xhi + x] = 0;
    M[shot_shape + x] = M[shot_dir + x] === 4 ? M[shot_shapes_left + y] : M[shot_shapes_right + y];
    M[shot_speed + x] = M[shot_colours + 6 + y];
    M[shot_active + x] = 1;
    if (y === 2) {
      M[shot_arc_index + x] = 0x12;
      M[shot_arc_base + x] = (M[shot_y + x] - M[jump_arc + 0x12]) & 255;
      M[shot_arc_state + x] = 1;
      return { a: 1, x, y: 0x12 };
    }
    if (y !== 3) return { a: 1, x, y };
    for (x--; x >= 0; x--) {
      M[shot_dir + x] = B(hero_facing);
      M[shot_colour + x] = M[shot_colours + y];
      M[shot_y + x] = M[shot_y + 1 + x];
      M[shot_xlo + x] = M[shot_xlo + 1 + x];
      M[shot_xhi + x] = M[shot_dir + x] & 4 ? 0 : M[shot_xhi + 1 + x];
      M[shot_shape + x] = (M[shot_shape + 1 + x] + 1) & 255;
      M[shot_speed + x] = (M[shot_speed + 1 + x] + 2) & 255;
      M[shot_active + x] = 1;
    }
    return P.sfx_flame();
  };
  // eshots_update ($1B58): each of the enemies' projectiles out runs its type's routine
  // (eshot_handlers) through the JSR at $1B76, whose operand (eshot_vector) it writes.
  const ESHOT = { 0x1BBB: null, 0x1BBC: null, 0x1BBD: null, 0x1BBE: 'eshot_arc', 0x1BA6: 'eshot_fall', 0x1B8C: 'eshot_jet_bomb' };
  P.eshots_update = function () {
    for (let x = 5; x !== 2; x = (x - 1) & 255) {
      if (!M[shot_active + x]) continue;
      const y = (M[shot_type + x] << 1) & 255;
      M[eshot_vector] = M[eshot_handlers + y];
      M[eshot_vector + 1] = M[eshot_handlers + 1 + y];
      const at = M[eshot_vector] | M[eshot_vector + 1] << 8;
      if (!(at in ESHOT)) throw new Error('eshots_update: no routine at $' + at.toString(16));
      if (ESHOT[at]) x = X(P[ESHOT[at]]({ x, y }), x);
    }
    return { x: 2 };
  };
  // eshot_jet_bomb ($1B8C): the jet's bomb, once dropped (its Y set), falls 4 lines a frame at the
  // hero's X plus 9; the jet's own slot is left alone.
  P.eshot_jet_bomb = function (r) {
    const x = r.x;
    if (x === M[jet_slot]) return {};
    const a = M[shot_y + x];
    if (!a) return {};
    const v = (a + 4) & 255;
    M[shot_xlo + x] = (B(hero_xlo) + 9) & 255;
    return bombAt(x, v);
  };
  // eshot_fall ($1BA6): a bomb falls 2 lines a frame; past $F3 it is freed (its Y 1).
  P.eshot_fall = function (r) { return bombAt(r.x, (M[shot_y + r.x] + 2) & 255); };
  function bombAt(x, a) {
    if (a < 0xF3) { M[shot_y + x] = a; return { a }; }
    M[shot_y + x] = 1; M[shot_active + x] = 0;
    return { a: 0 };
  }
  // eshot_arc ($1BBE): an enemy's grenade along jump_arc, as the hero's, to the arc's end ($1A); then
  // it falls (shot_fall).
  P.eshot_arc = function (r) {
    const x = r.x;
    if (!M[shot_arc_state + x]) return P.shot_fall({ x });
    let y = M[shot_arc_index + x];
    M[shot_y + x] = (M[shot_arc_base + x] + M[jump_arc + y]) & 255;
    if (M[shot_arc_state + x] & 0x80) {
      y = (y + 1) & 255;
      if (y >= 0x1A) { M[shot_arc_state + x] = 0; return { a: 0, y }; }
    } else {
      y = (y - 1) & 255;
      if (y & 0x80) { M[shot_arc_state + x] = 0x80; y = 0; }
    }
    M[shot_arc_index + x] = y;
    return { a: y, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
