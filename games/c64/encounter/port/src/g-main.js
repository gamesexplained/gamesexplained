// The main program: the dispatcher of the game's long jumps, the level's start and restart, the
// pass of the main loop (the objects moved, the shots against the obelisks, the view drawn, the keys
// and the stick, the raster wait, the player's moves and the enemy's bearing, then the state's
// handler through ($A3)), the states (between enemies, the saucers' behaviours, the homing
// missile, the stargate, the warp), the pass's tail (the score, the player's hits, the radar, the
// difficulty) and the player's death.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
G.main = function (P) {
  const M = P.M, R = P.irqByte;
  const io = P.io;
  const sid = (r, v) => io.sidWrite(r, v);
  const vic = (r, v) => io.vicWrite(r, v);
  const T = () => P.T;
  const lamp = (a, x) => P.set_console_light_colour({ a, x });

  P.CHECKPOINTS.push(0x9CBA, 0x9D16, 0x9D1E, 0x9D57, 0x9CA3, 0x9DE4,
    0xA04C, 0xA103, 0xA106, 0xA109, 0xA10C, 0xA10F, 0xA13B, 0xA181, 0xA18B, 0xA19B, 0xAAC8);
  P.WAITS.push(0xA188);

  // The game from address at: the parts it jumps between, each returning where it jumps next.
  P.main = function* (o = {}) {
    let at = o.at || 0x9C3E, x = o.x || 0, y = o.y || 0;
    for (;;) {
      let r;
      switch (at) {
        case 0x9C3E: at = P.reset_entry(); break;
        case 0x9CB1: at = yield* P.enter_title_screen(); break;
        case 0x9CB4: at = P.title_reset_demo_timer(); break;
        case 0x9CBA: at = yield* P.title_loop(); break;
        case 0x9D4B: at = yield* P.title_debounce(); break;
        case 0x9D68: r = P.start_game_from_title(); at = r.to; x = r.x; break;
        case 0x9D7A: r = P.start_demo_game(); at = r.to; x = r.x; break;
        case 0x9E9F: at = P.start_game({ x }); break;
        case 0x9FA4: at = P.level_restart_common(); break;
        case 0xA000: at = P.level_start(); break;
        case 0xA04C: r = yield* P.main_loop(); at = r.to; if (r.x !== undefined) x = r.x; break;
        case 0xA124: yield* P.reset_to_title_screen(); at = 0x9D4B; break;
        case 0xAB9A: r = yield* P.player_destroyed(); at = r.to; y = r.y; break;
        case 0xABED: P.game_over_scores(); at = 0x9C5C; break;
        case 0x9C5C: r = yield* P.game_over_screen({ y }); at = r.to; break;
        default: throw new Error('Encounter: no part at $' + at.toString(16));
      }
    }
  };

  // level_restart_common ($9FA4): a level's start, and its restart after a death: the missile's
  // count, the saucer's timers and the warp cleared, the scene put back after a stargate missed
  // ($7C), every object dead, the fragments' frames, the scan's range ($90), the first enemy in $34
  // passes, the state between enemies, the border, the fire light. Then seven bytes of junk run as
  // code: LDA #$4B, SRE ($54),Y (a shift of $0111, in the stack), EOR ($3A,X), ROL A; A is reloaded.
  P.level_restart_common = function () {
    const t = T();
    for (const a of [0x33, 0x44, 0x45, 0x46, 0x47, 0x91]) M[a] = 0;
    if (M[0x69]) M[0x63] = M[0x7C];
    M[0x69] = 0; M[0xA5] = 0; M[0x83] = 0;
    for (let y = 0x1F; y >= 0; y--) { M[t.STATE + y] = 0; M[0x8460 + y] = 3; M[0x8480 + y] = 3; }
    P.store(0x58, 0); M[0x35] = 0;
    M[0x90] = 0x5F; M[0x4C] = 0x1F; M[0xA3] = 0x8A; M[0xA4] = 0xA2; M[0x4D] = 0x34;
    vic(0x20, 0x0B);
    M[0xA7] = 0x07; M[0xAE] = 0x01;
    const p = ((M[0x54] | M[0x55] << 8) + 0xFF) & 0xFFFF;
    if (p < 0xD000 || p >= 0xE000) M[p] >>= 1;
    return 0xA000;
  };
  // level_start ($A000): the console's lamps, the SID's voices and filter set for play, the
  // engine's pitch loop ($48, $93), and $1D at 1.
  P.level_start = function () {
    lamp(0x08, 0x50); lamp(0x06, 0xA0);
    sid(0x00, 0x14); sid(0x01, 0x14);
    sid(0x0D, 0); sid(0x14, 0); sid(0x04, 0);
    sid(0x06, 0x20); M[0x48] = 0x20; M[0x93] = 0x20;
    sid(0x02, 0); sid(0x09, 0); sid(0x10, 0);
    sid(0x03, 0x08); sid(0x0A, 0x08); sid(0x11, 0x08); sid(0x17, 0x08);
    sid(0x18, 0x0F);
    P.store(0x1D, 1);
    return 0xA04C;
  };

  // main_loop ($A04C): one pass, two or three frames. It returns where the pass jumps: $A04C for
  // the next, $A124 for F1, $AB9A for the player's death.
  P.main_loop = function* () {
    const t = T();
    yield { cp: 0xA04C };
    P.advance_all_objects();
    // the stargate's tone ramp $75: up by 8 while $76 is set, down by 8 otherwise
    let a = M[0x75];
    if (!M[0x76]) a = a >= 8 ? a - 8 : 0; else a = a + 8 > 255 ? 0xFF : a + 8;
    M[0x75] = a;
    for (const z of [0x5C, 0x5E, 0x78]) if (M[z]) M[z]--;
    if (!M[0x69]) {
      // check_player_shots: the three shots against the obelisks, the knock on voice 1 if one hit
      let c = P.collide_object_with_obelisk({ x: 1 }).c;
      let v = M[0x5D];
      v = (v << 1) | c; c = v >> 8; M[0x5D] = v & 255;
      c = P.collide_object_with_obelisk({ x: 4 }).c;
      v = (M[0x5D] << 1) | c; M[0x5D] = v & 255;
      c = P.collide_object_with_obelisk({ x: 5 }).c;
      let quiet = false;
      if (c) {
        v = M[0x5D]; c = v & 1; M[0x5D] = (1 << 7) | (v >> 1);
        if (c) { v = M[0x5D]; c = v & 1; M[0x5D] = (1 << 7) | (v >> 1); if (c) quiet = true; }
      }
      if (!quiet && !R(0x1D)) {
        P.store(0x1D, 0x0C);
        sid(0x00, 0x14); sid(0x01, 0x14); sid(0x05, 0x36); sid(0x04, 0x80); sid(0x04, 0x81);
      }
      // saucer_fire_light_timeout: the enemy's fire lamp back to blue
      if (M[0x59]) { M[0x59]--; if (!M[0x59]) lamp(0x06, 0xA0); }
      // check_enemy_shots: the enemy's shots against the obelisks, the knock on voice 2
      if (!M[0xA5]) {
        M[0x5D] = 7;
        let acc = 0;
        for (let x = 8; x < 0x18; x++) {
          const r = P.collide_object_with_obelisk({ x });
          acc = (((r.a << 1) | r.c) & 255) & M[0x5D];
          M[0x5D] = acc;
        }
        if (!(acc & 1) && !R(0x5A)) {
          sid(0x07, 0x14); sid(0x08, 0x14); sid(0x0C, 0x36); sid(0x0B, 0x80); sid(0x0B, 0x81);
        }
      }
    }
    // main_loop_input
    yield { cp: 0xA103 };
    const sv = P.scan_visible_objects();
    yield { cp: 0xA106 };
    const so = P.sort_view_list_by_range({ x: sv.x });
    yield { cp: 0xA109 };
    P.draw_visible_objects({ x: so.x });
    yield { cp: 0xA10C };
    P.finish_frame_mirror_ground();
    yield { cp: 0xA10F };
    P.cassette_motor_toggle();
    P.read_joystick_or_demo();
    a = P.read_key_column0().a;
    if (a === 0xEF) return { to: 0xA124 };
    if (M[0x71]) {
      if (a === 0xF7) return { to: 0xA124 };
    } else {
      // check_pause_key: SPACE pauses until the stick moves; F1 leaves
      io.ciaWrite(2, 0xFF); io.ciaWrite(0, 0x7F);
      if (io.ciaRead(1) === 0xEF) {
        for (;;) {
          yield { cp: 0xA13B };
          if (P.read_key_column0().a === 0xEF) return { to: 0xA124 };
          P.read_joystick_or_demo();
          if (M[0x6D] !== 0x0F) break;
        }
        P.store(0x58, 0);
      }
    }
    // enemy_explosion_update: while the fragments live, the view flashes their colours ($8CF0),
    // voice 3 sweeps, and the fragments' frames cycle
    a = M[0x83F8];
    if (a) {
      M[0xA7] = M[0x8CF0 + ((a >> 1) & 0x0F)];
      sid(0x0F, ((a << 1) & 6) | 0x10);
      M[0x4E] = (M[0x4E] + 1) & 255;
      let y = M[0x4E] & 3;
      for (let x = 3; x >= 0; x--) { M[0x8458 + x] = M[0xBC16 + y]; M[0x845C + x] = M[0xBC16 + y]; y++; }
    }
    // wait_raster_192: the beam below the view (line 192 to 255)
    yield { cp: 0xA181 };
    // the line its LDA $D012 reads, as the instruction ends: at the end of line 255 that is line
    // 256, which reads 0, and the wait goes on to the next frame's line 192
    const ln = io.rasterIn ? io.rasterIn(4) : io.vicRead(0x12);
    yield { wait: ln >= 0xC0 ? ln : 0xC0 };
    P.apply_scene_if_changed();
    yield { cp: 0xA18B };
    P.update_scenery_sprites();
    M[0x1A] = M[0xBC7F + (M[0x08] & 1)];
    yield { cp: 0xA19B };
    const bf = P.begin_frame_swap_buffer();
    if (M[0xA5]) {
      // warp_phase_frame: the warp's speed and its sounds
      let m = P.mul8x8({ a: M[0xA5], y: M[0x9C], c: bf.c });
      M[t.SPEED] = (m.a + 0x30) & 255;
      a = M[0xA5];
      if (a === 0xFF) {
        sid(0x0B, 0x21); sid(0x12, 0x21);
        sid(0x08, 0x08); sid(0x0F, 0x11); sid(0x07, 0x00); sid(0x0E, 0x21);
      } else {
        sid(0x0B, 0x00);
        m = P.mul8x8({ a, y: a, c: 0 });
        m = P.mul8x8({ a: m.a, y: m.a, c: m.c });
        sid(0x0F, (m.a + 1) & 255);
        sid(0x0E, m.y);
        sid(0x12, 0x81);
      }
      P.player_move_forward();
      M[t.SPEED] = M[0x68];
    } else {
      // joystick_move_player
      if (M[0x83]) M[0x2D] = 0;
      if (!(M[0x6D] & 1)) P.player_move_forward();
      if (!(M[0x6D] & 2)) P.player_move_reverse();
    }
    if (!(M[0x6D] & 8)) P.turn_player_right(); else M[0x23] = 2;
    if (!(M[0x6D] & 4)) P.turn_player_left(); else M[0x24] = 2;
    if (!M[0xA5]) {
      // engine_sound_select: the engine's pitch loop by the stick ($80C0)
      let i = (M[0x6D] >> 1) & M[0x6D] & 5;
      if (!M[0x1C]) i |= 2;
      M[0x93] = M[0x80C0 + i];
    }
    // fire_button_check
    if (M[0xAE] && !(M[0x69] | M[0x6E])) P.fire_player_shot();
    // compute_enemy_bearing: the player's bearing from the enemy ($2F:$39, its heading there),
    // the player's from it less the player's heading ($84A6:$84C6, where it shows), and its range
    // ($31)
    M[0x1E] = 0; M[0x1F] = 0;
    P.object_delta_octant({ x: 0, y: 2 });
    const b = P.bearing_from_viewer();
    M[0x84A2] = b.a; M[0x2F] = b.a;
    M[0x84C2] = b.y; M[0x39] = b.y;
    const f = b.y - M[t.FINE];
    M[0x84C6] = f & 255;
    M[0x84A6] = (((M[0x2F] - M[t.OCT] - (f < 0 ? 1 : 0)) & 255) + 4) & 7;
    M[0x31] = P.log_distance_code().a;
    // the state's handler, through ($A3); each goes on to the pass's tail
    let to = P.state(M[0xA3] | M[0xA4] << 8);
    if (to === 0xAB9A) return { to };
    return yield* P.main_loop_tail();
  };

  // The states, by the address ($A3) holds: each returns where it jumps, the pass's tail ($AAC8) or
  // the player's death ($AB9A).
  P.state = function (a) {
    switch (a) {
      case 0xA28A: return P.state_between_enemies();
      case 0xA4EC: return P.state_stargate_open();
      case 0xA552: return P.state_stargate_missed();
      case 0xA713: return P.state_warp_travel();
      case 0xA7F0: return P.state_homing_missile();
      case 0xA5D6: return P.saucer_type_default();
      case 0xA563: return P.saucer_type_burst_fire();
      case 0xA70D: return P.saucer_type_permanent_fire();
      case 0xA5C7: return P.saucer_type_script_fire();
      default: throw new Error('Encounter: no state at $' + a.toString(16));
    }
  };
  const setState = a => { M[0xA3] = a & 255; M[0xA4] = a >> 8; };

  // state_between_enemies ($A28A): while an explosion runs, nothing; with the level's enemies all
  // shot ($69), the stargate opens; else the next enemy's countdown ($4D), then its setup, then
  // (once $78 has run out) its behaviour.
  P.state_between_enemies = function () {
    if (M[0x83F8]) return 0xAAC8;
    if (M[0x69]) return P.open_stargate();
    if (!M[0x4D]) return P.activate_enemy_behaviour();
    M[0x4D]--;
    if (M[0x4D]) return 0xAAC8;
    return P.spawn_next_enemy_setup();
  };
  // open_stargate ($A2A1): the gate (object 3, for good) at the last enemy's place, the tone's ramp
  // up, firing off, the warp's tones.
  P.open_stargate = function () {
    M[0x83E3] = 0xFF; M[0x76] = 0xFF;
    const a = (M[0x8262] | 4) & 0xFC;
    M[0x8262] = a; M[0x8263] = a;
    M[0x8323] = M[0x8322];
    for (const z of [0x82C2, 0x8382, 0x82C3, 0x8383, 0xAE, 0x4C, 0x15A3]) M[z] = 0;
    M[0xA7] = 0; M[0x78] = 0xF0; M[0x8448] = 0x23;
    sid(0x13, 0); sid(0x0C, 0); sid(0x14, 0xF0); sid(0x0D, 0xF0); sid(0x0B, 0x10); sid(0x12, 0x10);
    P.warp_tone_update();
    setState(0xA4EC);
    return 0xAAC8;
  };
  // activate_enemy_behaviour ($A303): the enemy live for good, its type's handler ($AAB5/$AAA5)
  // as the state, run at once.
  P.activate_enemy_behaviour = function () {
    if (M[0x78]) return 0xAAC8;
    M[0x76] = 0;
    M[0x83E7] = 0x20; M[0x83E2] = 0xFF;
    const x = M[0x7A];
    M[0xA3] = M[0xAAB5 + x]; M[0xA4] = M[0xAAA5 + x];
    return P.state(M[0xA3] | M[0xA4] << 8);
  };
  // spawn_next_enemy_setup ($A322): a new enemy count for a level begun again; the enemy's
  // family ($9B, by the level, the stargate's $A2 and the demonstration), the radar's marks, the
  // warp's top speed ($9C); then a homing missile (every few enemies, or once the slow counter $58
  // has passed 24) or a saucer.
  P.spawn_next_enemy_setup = function () {
    M[0x4C] = 0;
    if (!M[0x8BA8]) { P.roll_enemy_count(); P.stamp_digit_pair({ y: 8, x: 0x1C }); }
    let a = M[0x63];
    M[0x7C] = a;
    a = ((a >> 3) & 0x0E) ^ 0x0E;
    if (M[0xA2]) a = 0x0E;
    if (M[0x71]) a = 0x02;
    M[0x9B] = a;
    const x = a >> 1;
    a = ((x + 1) << 1) | 0x80;
    M[0x6014] = a; a |= 1; M[0x6015] = a;
    M[0xA2] = a & 0x10;
    const s = M[0xA7E8 + x] + M[0xA9];
    M[0x9C] = s & 255;
    let c = s >> 8;
    if (M[0x71]) M[0x9C] = 0x48;
    M[0x8448] = 0x22; M[0xAE] = 0x0E;
    if (M[0x9E]) return P.spawn_saucer({ c });
    if (M[0x33]) { M[0x33]--; if (M[0x33]) return P.spawn_homing_missile(); }
    let missile = R(0x58) >= 0x18;
    if (!missile) {
      if (!M[0x35]) return P.spawn_saucer({ c: 0 });
      const r = P.random_next();
      if (r.a & 3) return P.spawn_saucer({ c: r.c });
    }
    M[0x33] = (P.random_next().a & 3) + 1;
    return P.spawn_homing_missile();
  };
  // spawn_homing_missile ($A3A5): the missile (object 2, shape $62) from behind the player on one
  // side, its range and turns by the difficulty ($3E: $8E40, $8E80), its speed the player's and
  // more ($8E00); the alarm's tones on voices 2 and 3.
  P.spawn_homing_missile = function () {
    const x = M[0x3E];
    M[0x40] = M[0x8E40 + x]; M[0x3F] = M[0x8E80 + x];
    M[0x15A2] = 0; M[0x4B] = 0x40; M[0x8442] = 0x62;
    M[0x17A2] = (M[0x8E00 + x] + M[0x68]) & 255;
    M[0xA7] = 0x33; M[0x83E2] = 0xFF; M[0x41] = 0x0A;
    P.store(0x58, 0); M[0x48] = 0;
    sid(0x12, 0); sid(0x0B, 0); sid(0x0C, 0); sid(0x13, 0); sid(0x0D, 0xC0); sid(0x14, 0xC0);
    let a = ((P.random_next().a & 2) + M[T().OCT]) & 255;
    a >>= 1;
    const c1 = a & 1; a >>= 1;
    const c2 = a & 1; a = (c1 << 7) | (a >> 1);
    const ix = a;
    a = c2 ? 0x88 : 0x78;
    if (!(ix & 0x80)) {
      M[0x8322] = (a + M[0x8320] + 1) & 255;
      M[0x8262] = P.random_next().a;
    } else {
      M[0x8262] = (a + M[0x8260] + 1) & 255;
      M[0x8322] = P.random_next().a;
    }
    setState(0xA7F0);
    return 0xAAC8;
  };
  // spawn_saucer ($A42C): the saucer's type ($7A: after a level up the next family's, then by the
  // difficulty $9F), its colour ($8CE0), fire script ($8C00) and lamp; its place near the player
  // one time in four, else anywhere; its motion cleared, and $78 passes before it acts.
  P.spawn_saucer = function (r) {
    let a = M[0x9B];
    if (M[0x9E]) { M[0x9E]--; a = (a + M[0x9E]) & 255; }
    else a = P.mul8x8({ a: M[0x9F], y: (a + 2) & 255, c: r.c }).a;
    M[0x7A] = a;
    const x = a;
    M[0x8442] = 0x42; M[0x35] = 0x42;
    M[0xA7] = M[0x8CE0 + x];
    sid(0x0B, 0); sid(0x12, 0); sid(0x13, 0);
    M[0x7B] = M[0x8C00 + x];
    lamp(0x07, 0x50);
    if (!(P.random_next().a & 3)) {
      const y = ((P.random_next().a & 0x0F) + 1) & 255;
      P.place_object_at_player({ a: P.random_next().a, x: 2, y });
    } else {
      M[0x8262] = P.random_next().a;
      M[0x8322] = (P.random_next().a & 0xE0) | 0x10;
    }
    M[0x8267] = M[0x8262]; M[0x8327] = M[0x8322]; M[0x82C7] = M[0x82C2]; M[0x8387] = M[0x8382];
    for (const z of [0x44, 0x45, 0x46, 0x47, 0x75]) M[z] = 0;
    M[0x17A2] = 0; M[0x76] = 0xFF; M[0x83E7] = 0xFF; M[0x78] = 0x30;
    return 0xAAC8;
  };
  // warp_tone_update ($A4CD): voices 2 and 3 a triangle each, pitched by the ramp $75.
  P.warp_tone_update = function () {
    M[0x48] = 0;
    const x = (((M[0x75] ^ 0xFF) >> 3) + 0x0F) & 255;
    sid(0x08, x); sid(0x0F, (x + 1) & 255);
    sid(0x0B, 0x11); sid(0x12, 0x11);
  };
  // state_stargate_open ($A4EC): once the ramp is up, the player driving into the gate ($AD26 on
  // object 3, near and square to it) goes through: a step on, and the gate's mode ($83) flips;
  // when $78 runs out the gate closes: the warp if the player was in it, the gate missed if not.
  P.state_stargate_open = function () {
    P.warp_tone_update();
    if (M[0x75] === 0xFF) {
      const r = P.test_object_hits_player({ x: 0, y: 3 });
      if (!r.c && (r.n || r.a >= 0x60)) {
        if (M[0x2E]) P.player_move_reverse(); else P.player_move_forward();
        M[0x15A3] = 0;
        M[0x83] ^= 0xFF;
        M[0x78] = 0x30;
      }
    }
    if (M[0x78]) return 0xAAC8;
    // stargate_timeout
    M[0x76] = 0; M[0x83E3] = 0x22; M[0x4D] = 0x18; M[0x4C] = 0x18;
    M[0x69] = M[0x83];
    setState(M[0x69] ? 0xA713 : 0xA552);
    return 0xAAC8;
  };
  // state_stargate_missed ($A552): the tone until the gate's life runs out, then the next enemy.
  P.state_stargate_missed = function () {
    P.warp_tone_update();
    if (M[0x83E3]) return 0xAAC8;
    sid(0x0B, 0); sid(0x12, 0);
    return P.set_state_between_enemies();
  };
  // saucer_type_burst_fire ($A563), types 5 and 11: a burst of shots after a hum on voice 3.
  P.saucer_type_burst_fire = function () {
    let a = M[0x45];
    if (!a) {
      M[0x48] = 0; sid(0x12, 0); M[0x5E] = 0;
      sid(0x0F, 0x30); sid(0x14, 0xF0); sid(0x13, 0);
      a = 0;
    }
    M[0x45] = (M[0x45] - 1) & 255;
    if (M[0x45]) {
      sid(0x12, a & 0x0F ? 0x10 : 0x11);
      return P.saucer_burst_wait();
    }
    P.store(0x1D, 0x1F);
    M[0x45] = 0x10;
    do { P.enemy_fire_script_step(); M[0x45] = (M[0x45] - 1) & 255; } while (M[0x45]);
    M[0x83E2] = 0;
    M[0x4D] = 0x38; M[0x4C] = 0x38;
    return P.set_state_between_enemies();
  };
  P.saucer_burst_wait = function () {
    if (M[0x44]) { M[0x44]--; return P.check_enemy_hit(); }
    const x = M[0x3B];
    M[0x44] = P.random_next().a & 0x3F;
    return P.saucer_set_speed_and_heading({ x });
  };
  // saucer_type_script_fire ($A5C7), types 9, 12, 14 and 15: fire by the script, never hover.
  P.saucer_type_script_fire = function () {
    P.enemy_fire_script_step();
    M[0x45] = 0; M[0x46] = 0;
    return P.saucer_common_update();
  };
  // saucer_type_default ($A5D6): types 0-4, 6, 8 and 10: while approaching ($47), fire by the
  // script, $46 shots before a new behaviour; else the common motion.
  P.saucer_type_default = function () {
    if (!M[0x47]) return P.saucer_common_update();
    if (P.enemy_fire_script_step().c) return P.check_enemy_hit();
    M[0x46] = (M[0x46] - 1) & 255;
    if (!M[0x46]) return P.saucer_reroll_behaviour();
    if (!M[0x71]) { M[0x45] = 1; M[0x47] = 0; }
    return P.check_enemy_hit();
  };
  // saucer_common_update ($A5F2): after 24 x 256 frames ($58) the saucer leaves; else its hum on
  // voice 3, its wait ($44), its hover ($45: still, a rising tone from $91), then a new behaviour.
  P.saucer_common_update = function () {
    if (R(0x58) >= 0x18) {
      M[0x83E2] = 0; sid(0x0B, 0); sid(0x12, 0);
      return P.schedule_next_spawn();
    }
    sid(0x14, 0x80); sid(0x13, 0); sid(0x12, 0x11);
    if (M[0x44]) { M[0x44]--; return P.check_enemy_hit(); }
    if (!M[0x45]) return P.saucer_hover_done();
    M[0x17A2] = 0; M[0x48] = 0x10;
    M[0x45] = (M[0x45] - 1) & 255;
    if (M[0x45] || M[0x7A] >= 2 || M[0x71]) return P.check_enemy_hit();
    if (!M[0x46]) return P.saucer_reroll_behaviour();
    M[0x48] = 0;
    return P.saucer_tone_from_91({ a: 0xFF });
  };
  // saucer_tone_from_91 ($A653): voice 3 a pulse pitched by $91.
  P.saucer_tone_from_91 = function (r) {
    M[0x91] = r.a;
    const a = r.a ^ 0xFF;
    M[0xFF] = (a << 5) & 0xE0;
    sid(0x0F, ((a >> 3) + 8) & 255);
    sid(0x0E, M[0xFF]);
    sid(0x12, 0x41);
    return P.check_enemy_hit();
  };
  P.saucer_hover_done = function () {
    const y = M[0x91];
    if (y >= M[0x92]) return P.saucer_tone_from_91({ a: (y - 4) & 255 });
    M[0x47] = 0xFF; M[0x48] = 0x10;
    if (!M[0x46]) return P.saucer_reroll_behaviour();
    return P.check_enemy_hit();
  };
  // saucer_reroll_behaviour ($A693): new numbers by the difficulty less 0-3 (X): the hover's tone
  // limit ($92, $8FC0), the wait, the hover's length, and the shots ($46) the flags ($8EC0) allow.
  P.saucer_reroll_behaviour = function () {
    const x = (((P.random_next().a | 0xFC) + M[0x3B] + 1) & 255);
    M[0x92] = M[0x8FC0 + x];
    M[0x44] = P.random_next().a & 0x3F;
    const r = P.random_next();
    M[0x45] = ((r.a & 0x1F) + 8 + r.c) & 255;
    M[0x47] = 0; M[0x46] = 0; M[0x48] = 1;
    if (P.random_next().a & M[0x8EC0 + x] & 0x0F) return P.saucer_set_speed_and_heading({ x });
    if (M[0x31] >= 0xF0) return P.saucer_set_speed_and_heading({ x });
    let a = M[0x8EC0 + x];
    if (a & 0x80) a = (a >> 4) & 7;
    else { M[0xFF] = a >> 4; a = P.random_next().a & M[0xFF]; }
    M[0x46] = a;
    return P.saucer_set_speed_and_heading({ x });
  };
  // saucer_set_speed_and_heading ($A6E6): the speed $8F00,X; the heading at the player by the
  // chance $68C8, or anywhere.
  P.saucer_set_speed_and_heading = function (r) {
    M[0x17A2] = M[0x8F00 + r.x];
    if (P.random_next().a < M[0x68C8]) { M[0x84C2] = M[0x39]; M[0x84A2] = M[0x2F]; }
    else { const a = P.random_next().a; M[0x84A2] = a; M[0x84C2] = a; }
    return P.update_enemy_motion_vector();
  };
  // saucer_type_permanent_fire ($A70D), types 7 and 13: fire by the script, and nothing else.
  P.saucer_type_permanent_fire = function () {
    P.enemy_fire_script_step();
    return P.check_enemy_hit();
  };
  // state_warp_travel ($A713): the gate closing ($83E3 counts down), then the warp: the scene $80,
  // its colours, and spheres thrown at the player every third pass once the speed is up; after
  // four slow counts ($58) the speed falls, and at 0 the next level.
  P.state_warp_travel = function () {
    const a = M[0x83E3];
    if (a) {
      if (a !== 1) { P.warp_tone_update(); return 0xAAC8; }
      // warp_travel_start
      M[0x90] = 0x1F;
      P.store(0x58, 0); P.store(0x1B, 0);
      sid(0x0B, 0); sid(0x12, 0); sid(0x0C, 0); sid(0x13, 0); sid(0x0D, 0xF0); sid(0x14, 0xF0);
      M[0x9A] = 8; M[0x9D] = M[0x63]; M[0x63] = 0x80; M[0xA7] = 0x77; M[0x83] = 0;
      return 0xAAC8;
    }
    // warp_travel_frame
    const t = T();
    if (M[0xA5] >= 0x40 && !M[0x5E]) {
      M[0x5E] = 3;
      let x = M[0x9A] + 1;
      if (x === 0x18) x = 8;
      M[0x9A] = x;
      P.place_object_at_player({ a: P.random_next().a, x, y: 0x14 });
      M[t.STATE + x] = 0x50;
      M[t.TYPE + x] = M[0xA7E0 + (P.random_next().a & 7)];
      M[t.INVALID + x] = 0;
    }
    if (R(0x58) >= 4) {
      M[0xA5] = (M[0xA5] - 1) & 255;
      if (M[0xA5]) return 0xAAC8;
      // level_complete
      M[0xA7] = 0; M[0xAE] = 0;
      P.place_object_at_player({ a: 0, x: 2, y: 3 });
      M[0x90] = 0x5F;
      const l = (M[0x9D] - 0x10) & 0x70;
      M[0x63] = l;
      if (l < M[0x68CB]) M[0x68CB] = l;
      M[0x6014] = (M[0x6014] + 2) & 255; M[0x6015] = (M[0x6015] + 2) & 255;
      M[0x83] = 0xFF; M[0x9E] = 2; M[0x9C] = 0xD0;
      return P.schedule_next_spawn();
    }
    if (M[0xA5] !== 0xFF) M[0xA5]++;
    return 0xAAC8;
  };
  // state_homing_missile ($A7F0): the left lamp flashing; the missile hitting the player ends it;
  // its alarm's pitch by its range; beyond range $40 it weaves (a turn of $37 for $36 passes, each
  // way in turn), and its motion follows its heading.
  P.state_homing_missile = function () {
    lamp((io.colourRead(0x300) & 0x0F) === 2 ? 0x0A : 0x02, 0);
    const h = P.test_object_hits_player({ x: 0, y: 2 });
    if (!h.c) { P.deathY = h.y; return 0xAB9A; }
    let a = M[0x31];
    if (a < 0x80) a = 0x80;
    a ^= 0xFF;
    M[0xFF] = a;
    M[0x0C] = a | 0x80;
    let v = 0;
    for (let i = 0; i < 4; i++) { const c = M[0x0C] & 1; M[0x0C] >>= 1; v = (c << 7) | (v >> 1); }
    sid(0x0E, v);
    let d = v - M[0xFF];
    sid(0x07, d & 255);
    sid(0x0F, M[0x0C]);
    sid(0x08, (M[0x0C] - (d < 0 ? 1 : 0)) & 255);
    sid(0x0B, 0x11); sid(0x12, 0x11);
    if (M[0x31] < M[0x40]) return P.update_enemy_motion_vector();
    let c = 1;
    M[0x36] = (M[0x36] - 1) & 255;
    if (!M[0x36]) {
      const r = P.random_next();
      M[0x36] = ((r.a & M[0x3F]) + 1 + r.c) & 255;
      const r2 = P.random_next();
      M[0x37] = r2.a;
      c = r2.c;
      M[0x38] ^= 0xFF;
    }
    if (M[0x38]) {
      d = M[0x84C2] - M[0x37] - (1 - c);
      M[0x84C2] = d & 255;
      M[0x84A2] = (M[0x84A2] - (d < 0 ? 1 : 0)) & 255;
    } else {
      d = M[0x84C2] + M[0x37] + c;
      M[0x84C2] = d & 255;
      M[0x84A2] = (M[0x84A2] + (d >> 8)) & 255;
    }
    return P.update_enemy_motion_vector();
  };
  P.update_enemy_motion_vector = function () {
    P.compute_object_velocity({ x: 2 });
    return P.check_enemy_hit();
  };
  // check_enemy_hit ($A894): the enemy against the three shots.
  P.check_enemy_hit = function () {
    for (const y of [1, 4, 5]) {
      const r = P.test_object_hits_player({ x: 2, y });
      if (!r.c) return P.enemy_destroyed({ x: r.x });
    }
    return 0xAAC8;
  };
  // enemy_destroyed ($A894): the shot and the enemy gone, the sounds off and the explosion's on
  // voice 3, the lamps; the points ($A0: a missile's, or by the saucer's type) paid over $A1 passes
  // and the difficulty's rise ($3D); the enemy count down (the last opens the stargate, and a
  // shield is given back); eight fragments from its place.
  P.enemy_destroyed = function (r) {
    const t = T();
    P.store(0x58, 0);
    M[t.STATE + r.x] = 0;
    sid(0x0B, 0); sid(0x12, 0); sid(0x0E, 0); sid(0x07, 0);
    M[0x48] = 0; M[0x91] = 0; M[0x83E2] = 0;
    lamp(0x08, 0x50); lamp(0x02, 0x00);
    P.store(0x5A, 0x3F);
    sid(0x13, 0x0B); sid(0x14, 0x00); sid(0x12, 0x81);
    let a;
    if (M[0x33]) { M[0x3D] = 0x80; a = 0x0C; } else { M[0x3D] = 0x40; a = ((M[0x7A] << 2) + 0x10) & 255; }
    M[0xA0] = a;
    M[0xA1] = M[0x9B] >> 1;
    const s = P.sbcDec(M[0x8BA8], 1, 1);
    M[0x8BA8] = s.a;
    if (s.z) {
      M[0x69] = 0xFF;
      if (M[0x6026] !== 0x92) { M[0x6026] = (M[0x6026] + 2) & 255; M[0x6027] = M[0x6026] | 1; }
    }
    P.stamp_digit_pair({ y: 8, x: 0x1C });
    for (let x = 0x18; x < 0x20; x++) {
      M[t.STATE + x] = 0x20;
      M[t.XH + x] = M[0x8262]; M[t.ZH + x] = M[0x8322];
      M[t.FINE + x] = M[0x84C1];
      M[t.OCT + x] = x & 7;
      P.compute_object_velocity({ x });
    }
    M[0xA7] = M[0x8CFF];
    return P.schedule_next_spawn();
  };
  // schedule_next_spawn ($A962) and set_state_between_enemies ($A96F)
  P.schedule_next_spawn = function () {
    M[0x4C] = 0xFF;
    const r = P.random_next();
    M[0x4D] = ((r.a & 0x1F) + 8 + r.c) & 255;
    return P.set_state_between_enemies();
  };
  P.set_state_between_enemies = function () { setState(0xA28A); return 0xAAC8; };

  // main_loop_tail ($AAC8): the points paid; the enemy's shots against the player ($AD26, slots
  // 8-23); the radar's dot (sprite 0) from the probe's velocity (object 6, aimed at the enemy at
  // speed by its range) when no new enemy is on its way ($56, $4C); the difficulty's creep ($3C,
  // $3B) and the next numbers by it ($9F, $3E).
  P.main_loop_tail = function* () {
    yield { cp: 0xAAC8 };
    if (!(M[0xA1] & 0x80)) { M[0xA1]--; P.add_score_bcd({ x: M[0xA0] }); }
    M[0x74] = 8;
    let X;
    do {
      const h = P.test_object_hits_player({ x: 0, y: M[0x74] });
      if (!h.c) { P.deathY = h.y; return { to: 0xAB9A }; }
      X = h.x;
      M[0x74]++;
    } while (M[0x74] !== 0x18);
    let shown = false;
    if (!(M[0x56] | M[0x4C])) {
      X = 6;
      let a = M[0x31] ^ 0x80;
      if (a & 0x80) a = 0;
      M[0x17A6] = a >> 2;
      P.compute_object_velocity({ x: 6 });
      M[0x17A6] = 0x20;
      const shr2 = (hi, mid) => {
        let v = M[mid];
        for (let i = 0; i < 2; i++) { const c = M[hi] & 1; M[hi] >>= 1; v = (c << 7) | (v >> 1); }
        return v;
      };
      let s = shr2(0x1606, 0x1626) + 0x80;
      let m = P.mul8x8({ a: s & 255, y: 0x9E, c: s >> 8 });
      let px = (m.a + 0x52) & 255;
      if (px < 0xC2 && px >= 0x80) {
        vic(0x00, px);
        s = shr2(0x1666, 0x1686) + 0x80;
        m = P.mul8x8({ a: (s & 255) ^ 0xFF, y: 0x78, c: s >> 8 });
        const py = (m.a + 0xA1) & 255;
        if (py < 0xF6 && py >= 0xC4) {
          vic(0x01, py);
          M[0x42] = py;
          vic(0x15, io.vicRead(0x15) | 1);
          shown = true;
        }
      }
    }
    if (!shown) { M[0x42] = 0; vic(0x15, io.vicRead(0x15) & 0xFE); }
    M[0x56] = M[0x4C];
    // $6C is never 0 in play (the zero page image sets it): the game would start again from here
    if (!M[0x6C]) { M[0x6C] = 0xFF; return { to: 0x9E9F, x: X }; }
    const d = M[0x3C] + M[0x3D];
    M[0x3C] = d & 255;
    const b = M[0x3B] + (d >> 8);
    if (b < 0x40) M[0x3B] = b;
    M[0x3D] = 0;
    const r = P.random_next();
    let m = P.mul8x8({ a: r.a, y: r.a, c: r.c });
    M[0x9F] = m.a ^ 0xFF;
    m = P.mul8x8({ a: M[0x9F], y: M[0x3B], c: m.c });
    M[0x3E] = m.a;
    return { to: 0xA04C };
  };

  // player_destroyed ($AB9A): the crash on voice 1 for $3F frames, while the view's background
  // flashes with the bytes at $A800 (the game's own code) as colours; then a shield less ($6026),
  // or the game over with none left.
  P.player_destroyed = function* () {
    P.store(0x1D, 0x3F);
    sid(0x05, 0x0B); sid(0x00, 0x14); sid(0x01, 0x14); sid(0x04, 0x80); sid(0x04, 0x81);
    sid(0x0B, 0); sid(0x12, 0);
    let y = P.deathY;
    do {
      y = (y + 1) & 255;
      const a = P.flash(y);
      P.sei();
      if (R(0xAA)) vic(0x21, a);
      P.cli();
      P.count('flash');
      yield { cycles: 0 };
    } while (R(0x1D));
    if (M[0x6026] === 0x80) return { to: 0xABED, y };
    M[0x6026] = (M[0x6026] - 2) & 255;
    M[0x6027] = M[0x6026] | 1;
    return { to: 0x9FA4, y };
  };
  // the death's colours: the bytes of $A800-$A8FF, the game's code, EORed with 1; on the page their
  // low nibbles, all the video chip uses (port/scripts/pack-data.js)
  P.flash = y => M[0xA800 + y] ^ 1;
};
})(typeof window !== 'undefined' ? window : globalThis);
