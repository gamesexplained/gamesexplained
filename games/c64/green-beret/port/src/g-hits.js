// What touches what: the knife against the enemies and the Harbour's dogs (knife_hit_test, from the
// interrupt), the enemies, their projectiles and the dogs against the hero (enemy_contact, which
// goes on to shot_contact and dog_contact), the hero's death (player_killed), the enemies the
// knife hit dying and scoring (enemy_deaths), the weapon a white soldier drops (pickup_update) and
// the jet that bombs a hero who stands still.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.hits = function (P) {
  const M = P.M, B = P.B, N = root.GBNames;
  const { dog_live, spr_y, hero_bot_y, knife_offsets, knife_x, knife_y, knife_x2, knife_y2, kwork, player_xu, enemy_active,
    boss_phase, stage, enemy_dying, enemy_hit, enemy_type, helis_out, para_slots, enemy_xu, kbox_end, kbox_start,
    enemy_top_y, enemy_bot_y, x_save2, y_save2, para_hit, dog_hit, test_x, test_y, box_end, box_start, x_save,
    y_save, eshot_active, eshot_y, eshot_xu, eshot_type, enemy_points, points_due, enemy_wait, enemy_timer,
    enemy_bot_xlo, enemy_bot_xhi, enemy_top_xlo, enemy_top_xhi, enemy_entry, spawn_pickups, pickup_type, pickup_y,
    pickup_xlo, pickup_xhi, pickup_shapes, pickup_shape, pickup_colours, pickup_colour, pickup_landed, pickup_xu,
    enemy_facing, dying_shapes, enemy_top_shape, enemy_bot_shape, dying_colours, enemy_top_colour, enemy_bot_colour,
    weapon, weapon_shown, pickup_ammo, ammo, scroll_step, ptr, ptr_hi, ptr2, char_attrs, jet_slot, scroll_limit,
    idle_time, shot_xu, shot_shape, shot_speed, shot_y, shot_active, shot_type, shot_xlo, shot_xhi, eshot_shape,
    eshot_colour, eshot_xlo, eshot_xhi } = N;
  const eshot_speed = N.shot_speed + 3, eshot_dir = N.shot_dir + 3;

  // knife_hit_test ($0A65): with the hero's pose in A, the knife's point: his top Y plus 0 standing
  // or -16 crouching (knife_offsets), his X plus his facing's offset. Each live enemy that is not
  // dying or hit, and is not a paratrooper still in the air (but the one para_slots names, or with
  // helicopters out the slots 1 and 4), within 6 units across and $10 lines either way of its top
  // Y, is hit (enemy_hit), with the hit's sound; a paratrooper so hit sets para_hit. In the
  // Harbour's fight the dogs in slots 1-3 are tested instead (dog_hit_test).
  P.knife_hit_test = function (r) {
    const pose = r.a;
    let y = (pose & 0x02) >> 1;
    M[knife_y] = (B(spr_y) + M[knife_offsets + y]) & 255;
    M[kwork] = y;
    y = (((pose >> 1) & 0x06) + M[kwork]) & 255;
    M[knife_x] = (M[player_xu] + M[knife_offsets + y]) & 255;
    for (let x = 5; x >= 0; x--) {
      if (!B(enemy_active + x)) {
        if (B(boss_phase) && M[stage] === 1 && x < 4 && x !== 0) P.dog_hit_test({ x, y });
        continue;
      }
      if (B(enemy_dying + x) | B(enemy_hit + x)) continue;
      if (M[enemy_type + x] === 9) {
        if (!M[helis_out]) { if (x !== M[para_slots]) continue; }
        else if (x !== 1 && x !== 4) continue;
      }
      const xu = M[enemy_xu + x];
      if (xu < 0x0D) continue;
      M[kbox_end] = (xu + 6) & 255;
      M[kbox_start] = (xu - 6) & 255;
      if (M[knife_x] >= M[kbox_end] || M[knife_x] < M[kbox_start]) continue;
      M[kbox_end] = (M[enemy_top_y + x] + 0x10) & 255;
      M[kbox_start] = (M[enemy_top_y + x] - 0x10) & 255;
      if (M[knife_y] >= M[kbox_end] || M[knife_y] < M[kbox_start]) continue;
      M[enemy_hit + x] = 0x80;
      M[x_save2] = x; M[y_save2] = y;
      if (M[enemy_type + x] === 9 && !M[helis_out]) M[para_hit] = 1;
      P.sfx_hit();
    }
    return { x: 0xFF, y };
  };
  // dog_hit_test ($0B46): the knife against the dog in slot X: from 12 units either side of its X
  // and from 13 to 20 lines above its top Y; the knife's second point (knife_x2, knife_y2) is
  // tested where the first misses. A hit is marked in dog_hit, with the hit's sound.
  P.dog_hit_test = function (r) {
    const x = r.x;
    if (B(enemy_dying + x)) return {};
    const xu = M[enemy_xu + x];
    if (xu < 0x22) return {};
    const e = (xu + 0x0C) & 255;
    M[kbox_end] = e;
    M[kbox_start] = (e - 0x18) & 255;
    let k = M[knife_x];
    if (!(k < M[kbox_end] && k >= M[kbox_start])) {
      k = M[knife_x2];
      if (k >= M[kbox_start] || k < M[kbox_end]) return {};
    }
    const t = (M[enemy_top_y + x] - 0x0D) & 255;
    M[kbox_end] = t;
    M[kbox_start] = (t - 0x07) & 255;
    k = M[knife_y];
    if (!(k < M[kbox_end] && k >= M[kbox_start])) {
      k = M[knife_y2];
      if (k < M[kbox_start] || k >= M[kbox_end]) return {};
    }
    M[dog_hit + x] = 0x80;
    M[x_save2] = x; M[y_save2] = r.y;
    P.sfx_hit();
    return { x, y: r.y };
  };

  // enemy_contact ($0BB5): a live enemy, not dying, within 3 units of the hero's X and whose box
  // holds his top Y (from its top Y less $15 to its top Y plus $0B, or plus $1C when its two
  // halves stand apart) kills him, unless helicopters are out; then the enemies' projectiles
  // (shot_contact) and the dogs (dog_contact).
  P.enemy_contact = function (r) {
    M[test_x] = M[player_xu];
    M[test_y] = B(spr_y);
    for (let x = 5; x >= 0; x--) {
      if (!B(enemy_active + x) || B(enemy_dying + x)) continue;
      const xu = M[enemy_xu + x];
      M[box_end] = (xu + 3) & 255;
      M[box_start] = (xu - 3) & 255;
      if (M[test_x] < M[box_start] || M[test_x] >= M[box_end]) continue;
      let t = M[enemy_top_y + x], c;
      if (t === M[enemy_bot_y + x]) c = 1;
      else { const s = t + 0x12; t = s & 255; c = s > 255 ? 1 : 0; }
      M[box_end] = (t + 0x0A + c) & 255;
      M[box_start] = (M[enemy_top_y + x] - 0x15) & 255;
      if (M[test_y] < M[box_start] || M[test_y] >= M[box_end]) continue;
      M[x_save] = x;
      M[y_save] = r && r.y !== undefined ? r.y : 0;
      if (M[helis_out]) continue;
      return P.player_killed();
    }
    const out = P.shot_contact();
    return out;
  };
  // player_killed ($0C21): the death tune ($29), and lose_life, out of the routine that called
  // enemy_contact (or, in an end-of-stage fight, out of the fight's own routine, one call deeper,
  // whose return the game leaves on the stack).
  P.player_killed = function () {
    P.tune_start({ y: 0x29 });
    if (P.deep) P.leak += 2;
    throw P.jump('lose_life');
  };
  // shot_contact ($FD01): an enemy projectile below the hero's top Y and no more than $1C lines
  // below it, and up to 6 units right of his X, kills him; a bullet or a grenade (not types 0 and
  // 5) explodes too.
  P.shot_contact = function () {
    for (let x = 2; x >= 0; x--) {
      if (!M[eshot_active + x]) continue;
      const s = B(spr_y);
      if (s >= M[eshot_y + x]) continue;
      if (((s + 0x1C) & 255) < M[eshot_y + x]) continue;
      const p = M[player_xu];
      if (p >= M[eshot_xu + x]) continue;
      if (((p + 6) & 255) < M[eshot_xu + x]) continue;
      const t = M[eshot_type + x];
      if (t !== 0 && t !== 5) P.shot_explode({ x: x + 3 });
      return P.player_killed();
    }
    return P.dog_contact();
  };
  // dog_contact ($FD40): on the Harbour, a live dog (dog_live) in slots 1-3 within 3 units of the
  // hero's X and 10 lines of his top Y kills him.
  P.dog_contact = function () {
    if (M[stage] !== 1) return {};
    for (let x = 2; x >= 0; x--) {
      if (!M[dog_live + 1 + x]) continue;
      let a = (M[enemy_xu + 1 + x] + 3) & 255;
      if (a < M[player_xu]) continue;
      if (((a - 6) & 255) >= M[player_xu]) continue;
      a = (M[enemy_top_y + 1 + x] + 0x0A) & 255;
      if (a < B(spr_y)) continue;
      if (((a - 0x14) & 255) >= B(spr_y)) continue;
      return P.player_killed();
    }
    return { x: 0xFF };
  };

  // enemy_deaths ($0976): each live enemy hit and not yet dying scores its type's points
  // (enemy_points, into points_due in decimal) and starts to die ($80 in enemy_wait, enemy_timer
  // and enemy_dying). A white soldier or a bazooka man stands up whole first, and the white
  // soldier drops his weapon (spawn_pickups at his entry). The dying flash white and red (bit 2 of
  // the timer) until it is below $60, and go (enemy_remove).
  P.enemy_deaths = function (r) {
    let y = r && r.y;
    for (let x = 5; x >= 0; x--) {
      if (!B(enemy_active + x) || !B(enemy_hit + x)) continue;
      if (!B(enemy_dying + x)) {
        y = (M[enemy_type + x] << 1) & 255;
        let d = P.adcD(M[points_due], M[enemy_points + y], 0);
        M[points_due] = d.v;
        d = P.adcD(M[points_due + 1], M[enemy_points + 1 + y], d.c);
        M[points_due + 1] = d.v;
        d = P.adcD(M[points_due + 2], 0, d.c);
        M[points_due + 2] = d.v;
        M[enemy_wait + x] = 0x80; M[enemy_timer + x] = 0x80; M[enemy_dying + x] = 0x80;
        const t = M[enemy_type + x];
        if (t === 1 || t === 6) {
          M[enemy_top_y + x] = (M[enemy_bot_y + x] - 0x15) & 255;
          M[enemy_top_xlo + x] = M[enemy_bot_xlo + x];
          M[enemy_top_xhi + x] = M[enemy_bot_xhi + x];
          if (t === 1) {
            const k = y = M[spawn_pickups + M[enemy_entry + x]];
            M[pickup_type] = k;
            M[pickup_y] = (M[enemy_top_y + x] - 0x0A) & 255;
            M[pickup_xlo] = M[enemy_top_xlo + x]; M[pickup_xhi] = M[enemy_top_xhi + x];
            M[pickup_shape] = M[pickup_shapes + k]; M[pickup_colour] = M[pickup_colours + k];
            M[pickup_landed] = 0; M[pickup_xu] = 0x0B;
          }
        }
        const f = y = M[enemy_facing + x] >> 3;
        M[enemy_top_shape + x] = M[dying_shapes + 2 + f];
        M[enemy_bot_shape + x] = M[dying_shapes + f];
      }
      const tm = M[enemy_timer + x];
      if (tm >= 0x60) {
        y = (tm & 0x04) >> 2;
        const c = M[dying_colours + y];
        M[enemy_top_colour + x] = c; M[enemy_bot_colour + x] = c;
      } else y = P.enemy_remove({ x }).y;
    }
    return { x: 0xFF, y };
  };

  // pickup_update ($08B3): the dropped weapon. Within 6 units of the hero's X and $14 lines of his
  // feet he takes it: weapon and weapon_shown its type, the ammunition pickup_ammo gives, the
  // pick-up's sound, the status line's ammunition. Otherwise it scrolls with the screen, goes at
  // the left edge, or falls (2 pixels right and a line down a frame) until a floor character is
  // under it.
  P.pickup_update = function () {
    const k = M[pickup_type];
    if (!k) return {};
    let a = (M[pickup_xu] + 6) & 255;
    const p = M[player_xu];
    if (a >= p && ((a - 0x0C) & 255) < p) {
      a = (B(hero_bot_y) + 0x14) & 255;
      if (a >= M[pickup_y] && ((a - 0x28) & 255) < M[pickup_y]) {
        M[weapon] = k; M[weapon_shown] = k;
        M[ammo] = M[pickup_ammo + k];
        P.sfx_pickup();
        M[pickup_type] = 0; M[pickup_y] = 0;
        return P.draw_ammo();
      }
    }
    const step = M[scroll_step];
    if (step) {
      const s = M[pickup_xlo] - step;
      M[pickup_xlo] = s & 255;
      if (s < 0) M[pickup_xhi] = 0;
      if (M[pickup_xu] < 0x0A) { M[pickup_y] = 0; M[pickup_type] = 0; return { a: 0 }; }
    }
    if (M[pickup_landed]) return {};
    const s = M[pickup_xlo] + 2;
    M[pickup_xlo] = s & 255;
    if (s > 255) M[pickup_xhi] = 1;
    M[pickup_y] = (M[pickup_y] + 1) & 255;
    const row = P.rowAt((M[pickup_y] - 0x15) & 255);
    const y = ((M[pickup_xu] - 0x0D) & 255) >> 2;
    const c = M[(row + y) & 0xFFFF];
    if (c < 0xC8) return { a: c };
    if ((M[char_attrs + c - 0xC8] & 0x0C) !== 0x0C) return {};
    M[pickup_landed] = 0x0C;
    return { a: 0x0C };
  };

  // jet_update ($07AD): a jet out is moved (jet_move) and drops its bomb (jet_drop_bomb); otherwise,
  // before the stage's end, a hero who has stood still 7 times 256 frames (idle_time) brings one
  // when two enemy projectile slots are free (jet_launch, in the second free one found).
  P.jet_update = function (r) {
    if (M[jet_slot]) { const m = P.jet_move(); return P.jet_drop_bomb({ x: m.x, y: r ? r.y : 0 }); }
    if (B(scroll_limit) === 0xE0) return {};
    if (B(idle_time) < 7) return {};
    let y = 0;
    for (let x = 2; x >= 0; x--) {
      if (M[eshot_active + x]) continue;
      if (++y >= 2) return P.jet_launch({ x });
    }
    return { x: 0xFF, y };
  };
  P.jet_move_stub = () => P.jet_move();
  // jet_move ($07EC): the jet flies while its X is $18 units or more; then its shape is $C1, and it
  // climbs a line a frame until above Y $42, when it is gone and the hero's stillness counts from
  // 0 again.
  P.jet_move = function () {
    const x = M[jet_slot];
    if (M[shot_xu + x] >= 0x18) return { x };
    if (M[shot_shape + x] !== 0xC1) { M[shot_speed + x] = 0; M[shot_shape + x] = 0xC1; return { x }; }
    const y = (M[shot_y + x] - 1) & 255;
    M[shot_y + x] = y;
    if (y >= 0x42) return { x };
    M[jet_slot] = 0; M[shot_active + x] = 0; M[shot_y + x] = 0;
    M[idle_time] = 0;
    return { x, a: 0 };
  };
  // jet_drop_bomb ($0820): once the hero's X plus 7 reaches the jet's, its bomb (type 7 in a later
  // slot, with Y 0) drops from under it.
  P.jet_drop_bomb = function (r) {
    const x = r.x;
    if (((M[player_xu] + 7) & 255) < M[shot_xu + x]) return {};
    let y = r.y === undefined ? 0 : r.y;
    if (x === M[jet_slot]) y = x + 1;
    for (;;) {
      const t = M[shot_type + y];
      if (y >= 6) return { y };
      if (t === 7) break;
      y++;
    }
    if (M[shot_y + y]) return { y };
    M[shot_xlo + y] = M[shot_xlo + x]; M[shot_xhi + y] = M[shot_xhi + x];
    M[shot_y + y] = (M[shot_y + x] + 0x15) & 255;
    return { y };
  };
  // jet_launch ($0859): the jet in enemy projectile slot X: type 7, Y $50, shape $C2, green, X $140,
  // speed 4 left; its bomb, type 7 with Y 0 and shape $65, in the slot after (or the one after that
  // when it is taken); the jet's sound.
  P.jet_launch = function (r) {
    let x = r.x;
    M[eshot_type + x] = 7;
    M[jet_slot] = x + 3; M[eshot_active + x] = x + 3;
    M[eshot_y + x] = 0x50; M[eshot_shape + x] = 0xC2; M[eshot_colour + x] = 5;
    M[eshot_xlo + x] = 0x40; M[eshot_xhi + x] = 1;
    M[eshot_speed + x] = 4; M[eshot_dir + x] = 4;
    if (M[eshot_active + 1 + x]) x++;
    x++;
    M[eshot_type + x] = 7; M[eshot_active + x] = 7;
    M[eshot_y + x] = 0; M[eshot_speed + x] = 0;
    M[eshot_xhi + x] = 1; M[eshot_xlo + x] = 0x40; M[eshot_shape + x] = 0x65;
    P.sfx_jet();
    return { x };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
