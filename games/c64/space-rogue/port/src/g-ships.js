// The ships in flight: the frame's upkeep ($1239), the keys ($135F-$145B) and the joystick
// ($2419-$24B2), targets and weapons ($1D82-$2017), the beam ($20EC-$2418), the computer ships'
// minds ($3689-$3E2C), and what they use of the encounter tables and the hold ($2C8A, $2EA3-$2F3F).
//
// A computer ship (slots 1-5) has an AI state ($041B: 0 none, 1 cruising, 2 not to be argued
// with, 3 a missile homing, $FE fighting, $FF fleeing), a target ($0445) and a tactic ($043F),
// which picks its speed ($0C9A, $0CA4), how it steers ($0C86, $0C90) and so whether it closes,
// follows, circles or runs. ship_ai keeps in $D0-$D4 the distance to the target and the dot
// product of its nose with the way to it, as bearing gives them.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.ships = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const nine = i => M[0x0846 + i];                    // 9 i, its low byte
  const pos = i => 0x065D + nine(i);                  // slot i's position
  const vel = i => 0x0545 + nine(i);                  // slot i's velocity
  const orient = i => 0x044B + M[0x083C + i];         // slot i's orientation, three rows of 9
  // the pair at a/a+1 less b/b+1 (16 bits) has its top bit set: the game's CMP and SBC, then BMI
  const neg = (al, ah, bl, bh) => ((ah - bh - (al < bl ? 1 : 0)) & 0x80) !== 0;
  // the pair a/a+1 below b/b+1, unsigned: CMP and SBC, then BCC
  const below = (al, ah, bl, bh) => (ah - bh - (al < bl ? 1 : 0)) < 0;
  // A type's armour (the word at $0AA9 + 2 t) halved n times, keeping its sign, into $A1/$A0 or
  // wherever hi/lo say: the game's ASL, ROR pairs
  const shrink = (t, n, hi, lo) => {
    let h = M[0x0AAA + t], l = M[0x0AA9 + t];
    for (let k = 0; k < n; k++) { const c = h & 1; h = (h >> 1) | (h & 0x80); l = (l >> 1) | (c << 7); }
    M[hi] = h; M[lo] = l;
  };
  const flagsOf = (a, extra) => Object.assign({ a, n: a >> 7, z: a ? 0 : 1 }, extra);

  // ---- the frame's upkeep, each pass of the main loop: the missile's reload counted down, the
  // beam fired on its own when that is on and the target is a ship, the cockpit redrawn every
  // seventh pass; every 256th the clock, the target's greeting, the player's orientation kept
  // square, a new ship now and then when fewer than three are about, and ships far off ($0B49 in
  // log) dropped; every 16th the message line cleared, the beam cooled and the engine's thrust
  // set from the cargo carried.
  P.frame_update = function* () {
    if (M[0x0836]) M[0x0836]--;
    const t = M[0x0445];
    if (M[0x0CFF] && !(t & 0x80) && t < 6 && !M[0x0D00]) yield* P.fire_beam({ y: 0 });
    if (!M[0x3A]) {
      M[0x135D] = (M[0x135D] - 1) & 255;
      if (!M[0x135D]) { yield* P.update_cockpit(); M[0x135D] = 7; }
    }
    M[0x5E] = (M[0x5E] + 1) & 255;
    if (!M[0x5E]) {
      M[0x135E] = (M[0x135E] + 1) & 255;
      yield* P.target_status();
      setp(0x78, 0x044B);
      P.mat_orthonormal();
      // Y runs through what follows as the game leaves it: the drop test below reads $0403 with
      // it, not with the slot it is looking at
      let x = 3, y = 5, spawn = true;
      do {
        if (M[0x05F9 + y] && !M[0x0403 + y]) { x--; if (!x) { spawn = false; break; } }
        y--;
      } while (y);
      if (spawn) {
        const p = P.pick_ship_with_chance({ a: M[0x077C] >> 3, x, y });
        y = p.y;
        if (!p.n) {
          M[0xBC] = p.a;
          let go = true;
          if (p.x === 1 && (P.random().a & 0x80)) go = false;
          if (go) {
            const k = (M[0xBC] << 1) & 255;
            y = k;
            if (!M[0x08F9 + k]) { P.reset_models(); y = P.load_slot_models().y; }
            setp(0x74, 0x065D); setp(0x78, 0x006B);
            M[0x60] = 0xE2; M[0x61] = 0x04;
            y = P.random_offset().y;
            setp(0x74, 0x006B);
            y = P.create_object({ x: M[0xBC] }).y;
          }
        }
      }
      M[0xBC] = 5;
      do {
        const s = M[0xBC];
        if (M[0x05F9 + s] && !M[0x0403 + y]) {
          y = P.bearing({ x: s, y: 0 }).y;
          if (!(M[0x81] & 0x80) && !below(M[0x80], M[0x81], 0x49, 0x0B)) y = (yield* P.destroy_object({ a: 0xFF, y: M[0xBC] })).y;
        }
        M[0xBC] = (M[0xBC] - 1) & 255;
      } while (M[0xBC]);
    }
    if (M[0x5E] & 0x0F) return {};
    if (!(M[0x0D29] & 0x80)) {
      M[0x0D29] = (M[0x0D29] - 1) & 255;
      if (M[0x0D29] & 0x80) yield* P.scroll_window({ a: 1 });
    }
    if (M[0x0D00]) M[0x0D00]--;
    M[0x60] = (P.cargo_count().x + 8) & 255; M[0x61] = 0;
    P.uint16_to_log();
    let s = 0 - M[0x5F]; M[0x5F] = s & 255;
    M[0x60] = (3 - M[0x60] - (s < 0 ? 1 : 0)) & 255;
    s = M[0x073B] + M[0x5F]; M[0x0C04] = s & 255;
    M[0x0C05] = (M[0x073C] + M[0x60] + (s >> 8)) & 255;
    return {};
  };

  // ---- keys. The key is looked up among the 37 of key_cmds ($145C, the first 25 only in the
  // wormhole) and its handler, an address less one in key_handlers, reached as the game does with
  // an RTS: the port finds the routine by that address.
  const HANDLERS = {
    0x1386: 'key_turn_left', 0x1391: 'key_turn_right', 0x139C: 'key_pitch_up', 0x13A7: 'key_pitch_down',
    0x13B2: 'key_stop_turn', 0x13BE: 'key_roll_left', 0x13C9: 'key_roll_right', 0x13D4: 'key_jettison',
    0x13DE: 'key_slower', 0x13F3: 'key_faster', 0x1408: 'key_flight_mode', 0x1411: 'key_tac_mode',
    0x141D: 'key_auto_fire', 0x142B: 'key_view', 0x1438: 'key_escape', 0x1442: 'key_navigation',
    0x154E: 'key_save', 0x1D82: 'key_next_target', 0x1DBE: 'key_fire', 0x1E5C: 'key_next_weapon',
    0x392A: 'key_surrender'
  };
  P.do_key = function* () {
    yield* P.joystick_flight();
    const k = P.get_key();
    if (!k.c) return k;
    let y = M[0x0838] ? 0x18 : 0x24;
    while (k.a !== M[0x145C + y]) { y = (y - 1) & 255; if (y & 0x80) return { a: k.a, y }; }
    const i = (y << 1) & 255;
    const to = ((M[0x1481 + i] | M[0x1482 + i] << 8) + 1) & 0xFFFF;
    const name = HANDLERS[to];
    if (!name) throw new Error('do_key: no handler at $' + to.toString(16));
    const r = { a: M[0x1481 + i], x: M[0x0838], y: i };
    if (P.GEN.has(name)) return yield* P[name](r);
    return P[name](r);
  };
  // one step more of a rate: the player's turn ($0516), pitch ($0508) or roll ($050F)
  const step = (a, d) => { const x = P.clamp_rate({ x: (M[a] + d) & 255 }).x; M[a] = x; return { x }; };
  P.key_turn_left = () => step(0x0516, -1);
  P.key_turn_right = () => step(0x0516, 1);
  P.key_pitch_up = () => step(0x0508, 1);
  P.key_pitch_down = () => step(0x0508, -1);
  P.key_roll_left = () => step(0x050F, -1);
  P.key_roll_right = () => step(0x050F, 1);
  P.key_stop_turn = function () { M[0x0508] = 0; M[0x0516] = 0; M[0x050F] = 0; return { a: 0 }; };
  // the hold emptied, and the message at $CECF
  P.key_jettison = function* () { P.cargo_jettison(); return yield* P.print_message({ x: 0xCF, a: 0xCE }); };
  // the speed a step down or up unless flying Newtonian ($0D02), and the way the thrust went
  P.key_slower = function () {
    if (!M[0x0D02]) step(0x0415, -1);
    M[0x0D01] = 1;
    return { a: 1 };
  };
  P.key_faster = function () {
    if (!M[0x0D02]) step(0x0415, 1);
    M[0x0D01] = 0xFF;
    return { a: 0xFF };
  };
  P.key_flight_mode = function () { M[0x0D02] ^= 1; return { a: M[0x0D02] }; };
  P.key_tac_mode = function* () { M[0x7C] ^= 0xFF; P.clear_tac(); return yield* P.draw_tac(); };
  P.key_auto_fire = function () {
    if (!M[0x073E]) return { a: 0 };
    M[0x0CFF] ^= 0xFF;
    return { a: M[0x0CFF] };
  };
  P.key_view = function* () {
    M[0x0D3C] = (M[0x0D3C] - 1) & 255;
    if (M[0x0D3C] & 0x80) M[0x0D3C] = 2;
    return yield* P.set_view();
  };
  P.key_escape = function* () {
    M[0x1E] = 0;
    const k = yield* P.wait_key();
    M[0x1E] = (M[0x1E] - 1) & 255;
    return k;
  };
  P.key_navigation = function* () {
    M[0x1E] = 0;
    const k = yield* P.navigation();
    M[0x1E] = (M[0x1E] - 1) & 255;
    return k;
  };
  // X, a signed rate or speed, kept within -$46..$46
  P.clamp_rate = function (r) {
    let x = r.x;
    if (x & 0x80) { if (x < 0xBA) x = 0xBA; } else if (x >= 0x47) x = 0x46;
    return { a: r.a, x, y: r.y };
  };

  // ---- the joystick. Fire on port 2 fires; up and down on port 1 change the speed (or, flying
  // Newtonian, only say which way the thrust goes, in $0D01); the stick in port 2 steers.
  P.joystick_flight = function* () {
    if (M[0x0D02]) M[0x0D01] = 0;
    M[0x0D01] = (yield* P.joystick_speed()).x;
    return P.joystick_steer();
  };
  P.joystick_speed = function* () {
    if (P.read_joystick2().a & 0x10) { yield* P.key_fire(); return { x: 0 }; }
    if (P.read_joystick1().a & 1) {
      if (!M[0x0D02]) {
        const s = M[0x0415];
        if (!(s & 0x80) && s >= 0x46) return { x: 0 };
        if (s || !M[0x0D01]) M[0x0415] = (s + 1) & 255;
      }
      return { x: 0xFF };
    }
    if (!(P.read_joystick1().a & 2)) return { x: 0 };
    if (!M[0x0D02]) {
      const s = M[0x0415];
      if ((s & 0x80) && s < 0xBB) return { x: 0 };
      if (s || !M[0x0D01]) M[0x0415] = (s - 1) & 255;
    }
    return { x: 1 };
  };
  // pitch and turn from the stick's smoothed position, a sixteenth of its travel at a time
  // (joy_rates), once the stick has been used
  P.joystick_steer = function () {
    const j = P.joystick_eased();
    if (!P.irqByte(0x0D03)) return j;
    M[0x0508] = M[0x24A3 + (j.y >> 3)];
    M[0x0516] = M[0x24A3 + (j.x >> 3)];
    return { a: M[0x0516], x: j.x, y: j.x >> 3 };
  };

  // ---- targets and weapons
  // The player's next target: the next slot in use after the present one that is a ship (not a
  // missile), a base (flag bit 0) or the gate (type $14); none after slot 19. Auto fire goes off.
  P.key_next_target = function* () {
    M[0x0CFF] = 0;
    let x = M[0x0445];
    if (x & 0x80) x = 0;
    for (;;) {
      x = (x + 1) & 255;
      if (x >= 0x14) { x = 0xFF; break; }
      if (!M[0x05F9 + x]) continue;
      if (x < 6) { if (M[0x0403 + x]) continue; break; }
      const t = M[0x060D + x];
      if (t === 0x14 || (M[0x08D5 + t] & 1)) break;
    }
    M[0x0445] = x;
    P.clear_tac();
    return yield* P.draw_tac();
  };
  // The weapon chosen ($0CFE): 0 the beam, 1-3 a missile of type 9, 10 or 11
  P.key_fire = function* () {
    const w = M[0x0CFE];
    if (!w) return yield* P.fire_beam({ y: 0 });
    return P.launch_missile({ x: w === 1 ? 9 : w === 2 ? 0x0A : 0x0B, y: 0 });
  };
  // The player's target, a ship of a faction other than 3, speaks when it has no target of its
  // own: a greeting from a friend, once; from an enemy, or from a ship that has the player as its
  // target, a threat, once and then one time in four. "label: " and one of the texts at $CE9E,
  // two for each of factions 0-2 and the police (type $0C), and a second set of greetings 8 on.
  P.target_status = function* () {
    const y = M[0x0445];
    if (y >= 6 || M[0x0433 + y] === 3) return {};
    const x = M[0x0445 + y];
    let k;
    if (x && (x & 0x80) && !(P.faction_attitude({ a: M[0x0433 + y], x: 4, y }).n)) {
      if (M[0x0833]) return {};
      k = 8;
    } else {
      if (x) { if (!(x & 0x80)) return {}; }
      if (M[0x0833] && P.random_upto({ a: 3 }).a) return {};
      k = 0;
    }
    M[0x95] = k;
    M[0x0833] = 1;
    yield* P.print_message({ x: 0x5B, a: 0x1E });
    yield* P.print_ship_label({ a: M[0x0445] });
    yield* P.print_char({ a: 0x3A });
    M[0x4F] = (M[0x4F] + 1) & 255;
    M[0x94] = P.random_upto({ a: 1 }).a;
    const s = M[0x0445];
    let a;
    if (M[0x060D + s] === 0x0C) a = 3;
    else { a = M[0x0433 + s]; if (a & 0x80) a = 1; }
    let c = a >> 7;
    a = (a << 1) & 255;
    let v = a + M[0x94] + c; c = v >> 8;
    v = (v & 255) + M[0x95] + c; c = v >> 8;
    v = (v & 255) + 0x9E + c; c = v >> 8;
    return yield* P.print_text({ x: v & 255, y: (0xCE + c) & 255 });
  };
  // The next weapon down (3, 2, 1, 0 and round) that the ship has missiles for, the beam always
  P.key_next_weapon = function* () {
    for (;;) {
      M[0x0CFE] = (M[0x0CFE] - 1) & 255;
      if (!M[0x0CFE]) break;
      if (M[0x0CFE] & 0x80) M[0x0CFE] = 3;
      if (M[0x0731 + M[0x0CFE]]) break;
    }
    return yield* P.update_cockpit();
  };
  // Ship slot Y launches a missile of type X, unless its launcher is damaged ($0409 bit 0). The
  // player needs the reload ($0836) done and one of that kind left; a computer ship needs no
  // computer ship's missile in flight. The missile is the launcher's (its faction holds the
  // launcher's slot), at speed $4B, with the launcher's velocity and orientation, put ahead of it
  // by missile_launch_offset; types 9 and 10 home on the launcher's target (AI state 3), with
  // tactic 4 instead of 2 when the target's ECM ($0C2B, unless damaged, $0409 bit 5) fools it; a
  // computer ship's type 11 starts pointed at its target.
  P.launch_missile = function (r) {
    let y = r.y;
    if (M[0x0409 + y] & 1) return {};
    M[0x9E] = y; M[0x9F] = r.x;
    if (y) {
      for (y = 5; y; y--) if (M[0x05F9 + y] && M[0x0403 + y] && M[0x0433 + y]) return {};
    } else {
      if (M[0x0836]) return {};
      if (!M[0x0732 + ((r.x - 9) & 255)]) return {};
    }
    P.slot_pos_ptr({ y: M[0x9E] });
    const c = P.create_object({ x: M[0x9F] });
    M[0xA0] = c.y;
    if (c.n) return {};
    if (!M[0x9E]) {
      P.sound_play({ a: 7 });
      const i = (M[0x9F] - 9) & 255;
      M[0x0732 + i] = (M[0x0732 + i] - 1) & 255;
      M[0x0836] = 0x7E;
    }
    const l = M[0x9E], m = M[0xA0];
    M[0x0433 + m] = l;
    M[0x0415 + m] = 0x4B;
    if (M[0x9F] !== 0x0B && !(M[0x0445 + l] & 0x80)) {
      const t = M[0x0445 + l];
      M[0x0445 + m] = t;
      M[0x041B + m] = 3;
      let a = 2;
      if (t < 6 && !(M[0x0409 + t] & 0x20)) {
        M[0xA1] = M[0x0C2B + M[0x060D + t]];
        if (M[0xA1] && P.random_upto({ a: 0x64 }).a < M[0xA1]) a = 4;
      }
      M[0x043F + M[0xA0]] = a;
    }
    setp(0x78, vel(M[0xA0])); setp(0x74, vel(M[0x9E]));
    P.copy9();
    setp(0x74, orient(M[0x9E])); setp(0x78, orient(M[0xA0]));
    for (let i = 0x1A; i >= 0; i--) M[(ptr(0x78) + i) & 0xFFFF] = M[(ptr(0x74) + i) & 0xFFFF];
    if (M[0x9F] === 0x0B && M[0x9E]) {
      P.slot_pos_ptr({ y: M[0x9E] });
      setp(0x78, ptr(0x78) + 0x12);
      setp(0x76, pos(M[0x0445 + M[0x9E]]));
      P.vec_sub_to_log();
      setp(0x78, ptr(0x78) - 0x12);
      P.mat_orthonormal();
    }
    setp(0x76, ptr(0x78)); setp(0x74, 0x2018); setp(0x78, pos(M[0xA0]));
    P.vec_times_rows();
    setp(0x74, ptr(0x78));
    P.vec_log_to_lin();
    setp(0x76, pos(M[0x9E]));
    return P.vec_add_lin();
  };

  // ---- the beam
  // Ship slot Y fires its beam (power $A9, its type's $0C52), unless its beam is damaged ($0409
  // bit 1): the player's along its nose, a computer ship's at its target. trace_beam finds what
  // it meets. A hit on the target, or on a ship of another faction than 0 that the player was not
  // aiming at, is a hit; the player's beam with no target is drawn even when it meets nothing.
  // Each of the player's shots heats the beam ($0D00, up to 8).
  P.fire_beam = function* (r) {
    const s = r.y;
    M[0xA8] = s;
    if (M[0x0409 + s] & 2) return {};
    M[0xA9] = M[0x0C52 + M[0x060D + s]];
    if (!M[0xA9]) return {};
    if (!s) setp(0x74, 0x045D);
    else {
      const t = M[0x0445 + s];
      if (t & 0x80) return {};
      P.slot_pos_ptr({ y: s });
      setp(0x76, pos(t)); setp(0x78, 0x0896);
      P.vec_sub_to_log();
      setp(0x74, 0x0896);
      P.vec_normalise();
    }
    const hit = P.trace_beam({ y: s }).a;
    if (!s && (M[0x0445] & 0x80)) {
      if (hit & 0x80) {
        P.draw_beam({ a: M[0xA9], x: hit, y: 0 });
        P.sound_play({ a: 0x0C });
        return heat();
      }
    } else {
      if (hit & 0x80) return {};
      if (hit !== M[0x0445 + s]) {
        if (hit >= 6 || !M[0x0AEF + M[0x060D + hit]] || s || !M[0x0433 + hit]) return {};
      }
    }
    yield* P.beam_hit({ a: M[0xA9], x: hit, y: s });
    return M[0xA8] ? {} : heat();
  };
  const heat = () => { if (M[0x0D00] !== 8) M[0x0D00]++; return {}; };
  // From slot $A8 along the direction at ($74), three units a step ($0896) for 50 steps: the first
  // solid slot (19 down to 0, not the firer) within its radius and two of a point is the one hit,
  // in A; $FF when none is
  P.trace_beam = function (r) {
    M[0x5F] = 0; M[0x60] = 3; M[0x61] = 0xFF;
    setp(0x78, 0x0896);
    P.vec_scale_signed();
    setp(0x74, 0x0896);
    P.vec_log_to_lin();
    setp(0x76, 0x0896);
    P.slot_pos_ptr({ y: M[0xA8] });
    setp(0x78, 0x006B);
    P.copy9();
    setp(0x74, 0x006B);
    M[0xAC] = 0x32;
    do {
      P.vec_add_lin();
      M[0xAA] = 0x13;
      do {
        const x = M[0xAA];
        if (M[0x0635 + x] && x !== M[0xA8]) {
          const t = (M[0x060D + x] << 1) & 255;
          const v = M[0x0A1D + t] + 2;
          M[0x60] = v & 255; M[0x61] = (M[0x0A1E + t] + (v >> 8)) & 255;
          const keep = ptr(0x76);
          setp(0x76, pos(x));
          const w = P.within_range();
          setp(0x76, keep);
          if (w.c) return { a: M[0xAA] };
        }
        M[0xAA] = (M[0xAA] - 1) & 255;
      } while (!(M[0xAA] & 0x80));
      M[0xAC] = (M[0xAC] - 1) & 255;
    } while (M[0xAC]);
    return { a: 0xFF };
  };
  // The beam from slot Y hits slot X with power A: drawn, a sound for the player's shot and
  // another for a hit on the player or by a computer ship; the damage for the power ($2414),
  // the player's halved for each doubling of the beam's heat; a power of 4 damages differently
  P.beam_hit = function* (r) {
    M[0xB2] = r.y; M[0xB3] = r.x; M[0xB4] = r.a;
    P.draw_beam(r);
    if (!M[0xB2]) P.sound_play({ a: 0x0C });
    if (!M[0xB3]) { P.sound_play({ a: 1 }); M[0x0835] = 0xFF; } else if (M[0xB2]) P.sound_play({ a: 0 });
    M[0x80] = M[0x2414 + (M[0xB4] & 7)];
    if (!M[0xB2] && M[0x0D00]) { let a = M[0x0D00]; do { M[0x80] >>= 1; a >>= 1; } while (a); }
    return yield* P.damage({ a: (M[0xB4] & 7) === 4 ? 0xFF : 1, x: M[0xB2], y: M[0xB3] });
  };
  // The beam from slot Y at slot X (power A, its fill $2410): from the player in the cockpit,
  // two triangles from the guns; a computer ship's beam at the player flashes the window;
  // otherwise a thin triangle between the two points on screen, the player's miss reaching six
  // units ahead
  P.draw_beam = function (r) {
    M[0xB2] = r.y; M[0xB3] = r.x; M[0xB4] = r.a;
    P.set_colour({ x: M[0x2410 + (r.a & 7)] });
    if (!M[0xB2]) {
      if (!M[0x0D3C]) {
        P.flip_draw_buffer();
        for (let i = 11; i >= 0; i--) M[0xFD00 + i] = M[0x23F9 + i];
        M[0x55] = 3; P.fill_polygon();
        for (let i = 11; i >= 0; i--) M[0xFD00 + i] = M[0x2405 + i];
        M[0x55] = 3; P.fill_polygon();
        return P.flip_draw_buffer();
      }
    } else if (!M[0xB3]) return P.fill_window();
    P.slot_pos_ptr({ y: M[0xB2] });
    if (!P.project_point().n) return {};
    for (let i = 0; i < 4; i++) M[0xFD00 + i] = M[0x51 + i];
    if (M[0xB3] & 0x80) {
      setp(0x74, 0x045D); setp(0x78, 0x0896);
      M[0x5F] = 0; M[0x60] = 6; M[0x61] = 0xFF;
      P.vec_scale_signed();
      setp(0x74, 0x0896);
      P.vec_log_to_lin();
      setp(0x76, 0x065D);
      P.vec_add_lin();
    } else P.slot_pos_ptr({ y: M[0xB3] });
    if (!P.project_point().n) return {};
    for (let i = 0; i < 4; i++) M[0xFD04 + i] = M[0x51 + i];
    const absDiff = (lo, a, b) => {
      let s = M[a] - M[b]; M[lo] = s & 255;
      M[lo + 1] = (M[a + 1] - M[b + 1] - (s < 0 ? 1 : 0)) & 255;
      if (M[lo + 1] & 0x80) {
        s = 0 - M[lo]; M[lo] = s & 255;
        M[lo + 1] = (0 - M[lo + 1] - (s < 0 ? 1 : 0)) & 255;
      }
    };
    absDiff(0xB5, 0x51, 0xFD00);
    absDiff(0xB7, 0x53, 0xFD02);
    const across = !below(M[0xB5], M[0xB6], M[0xB7], M[0xB8]);
    const add4 = (to, from) => { const s = M[from] + 4; M[to] = s & 255; M[to + 1] = (M[from + 1] + (s >> 8)) & 255; };
    if (across) { M[0xFD08] = M[0x51]; M[0xFD09] = M[0x52]; add4(0xFD0A, 0x53); } else { add4(0xFD08, 0x51); M[0xFD0A] = M[0x53]; M[0xFD0B] = M[0x54]; }
    M[0x55] = 3;
    return P.fill_polygon();
  };
  // The point at ($74) on screen ($51-$54), as seen from the camera ($58, $5A); A and N its depth's
  // sign, negative in front
  P.project_point = function (r) {
    setp(0x76, ptr(0x58)); setp(0x78, 0x006B);
    P.vec_sub_to_log();
    setp(0x74, 0x006B); setp(0x76, ptr(0x5A)); setp(0x78, 0x0896);
    P.mat_times_vec();
    const s = M[0x089E];
    setp(0x74, 0x0896);
    const o = P.project();
    return { a: s, x: o.x, y: o.y, n: s >> 7, z: s ? 0 : 1 };
  };

  // ---- the computer ships' minds, every 17th pass: for each ship in slots 5-1 with an AI state,
  // the bearing to its target; every third time the ships that are not missiles find a target,
  // decide whether to fight it and choose a tactic; then speed, steering and fire. Then a merchant
  // may offer its cargo.
  P.ship_ai = function* () {
    M[0x3808] = (M[0x3808] - 1) & 255;
    if (!(M[0x3808] & 0x80)) return {};
    M[0x3808] = 0x10;
    M[0x3809] = (M[0x3809] - 1) & 255;
    if (M[0x3809] & 0x80) M[0x3809] = 2;
    M[0xD5] = 5;
    do {
      const x = M[0xD5];
      if (M[0x05F9 + x] && M[0x041B + x]) {
        for (;;) {
          const y = M[0xD5], t = M[0x0445 + y];
          if (!(t & 0x80)) {
            P.bearing({ x: t, y });
            M[0xD0] = M[0x80]; M[0xD1] = M[0x81];
            M[0xD2] = M[0x5F]; M[0xD3] = M[0x60]; M[0xD4] = M[0x61];
          }
          let act = true;
          if (!M[0x3809] && !M[0x0403 + M[0xD5]]) {
            if (M[0x0445 + M[0xD5]] & 0x80) {
              if (P.ai_find_target({ x: M[0xD5] }).c) continue;
              act = false;
            } else { P.ai_attitude(); P.ai_tactic(); }
          }
          if (act && !(M[0x0445 + M[0xD5]] & 0x80)) {
            P.ai_speed({ x: M[0xD5] });
            P.ai_steer();
            yield* P.ai_fire();
          }
          break;
        }
      }
      M[0xD5] = (M[0xD5] - 1) & 255;
    } while (M[0xD5]);
    return yield* P.merchant_surrender();
  };
  // A ship without a target takes the one that attacked it ($0439), or an enemy; finding none it
  // cruises (state 1, tactic 0 at its speed) and one time in eight turns at random. Carry: found.
  P.ai_find_target = function (r) {
    let y = M[0x0439 + r.x];
    if (y & 0x80) {
      const e = P.ai_find_enemy({ x: r.x });
      y = e.y;
      if (e.n) {
        const x = M[0xD5];
        M[0x041B + x] = 1; M[0x043F + x] = 0;
        M[0x0415 + x] = M[0x0C9A];
        if (P.random().a < 0x20) P.random_rates({ x });
        return { x, c: 0 };
      }
    }
    const x = M[0xD5];
    M[0x0445 + x] = y; M[0xC6] = y; M[0x0439 + x] = 0xFF;
    return { a: 0xFF, x, y, c: 1 };
  };
  // Among ship slots 5-0 (not itself, in use, not missiles) the one its faction most dislikes
  // (an attitude of $FE before $FF); with none, the target of an ally (attitude 2). Y the slot,
  // N set when there is none.
  P.ai_find_enemy = function (r) {
    M[0x88] = r.x;
    M[0x86] = 0xFF; M[0x87] = 0xFF;
    for (let y = 5; y >= 0; y--) {
      if (y === M[0x88] || !M[0x05F9 + y] || M[0x0403 + y]) continue;
      M[0x85] = y;
      const a = P.faction_attitude({ a: M[0x0433 + M[0x88]], x: M[0x0433 + y], y: M[0x88] }).a;
      if ((a & 0x80) && a <= M[0x87]) { M[0x87] = a; M[0x86] = y; }
    }
    if (!(M[0x86] & 0x80)) return { y: M[0x86], n: 0 };
    for (let y = 5; y >= 0; y--) {
      if (y === M[0x88] || !M[0x05F9 + y] || (M[0x0445 + y] & 0x80) || M[0x0403 + y]) continue;
      M[0x85] = y;
      const a = P.faction_attitude({ a: M[0x0433 + M[0x88]], x: M[0x0433 + y], y: M[0x88] }).a;
      if (a === 2) { const t = M[0x0445 + y]; return { a: t, y: t, n: t >> 7 }; }
    }
    return { y: 0xFF, n: 1 };
  };
  // How faction A stands to faction X: to the player (X = 4) the player's standing with it
  // ($072E), except that the police (type $0C, slot Y) are hostile while a bounty is owed; between
  // factions the table at $38B1; a negative faction on either side is neutral (0)
  P.faction_attitude = function (r) {
    M[0x80] = r.x;
    if (r.x === 4) {
      const x = r.a;
      if (x & 0x80) return flagsOf(0, { x, y: r.y });
      if (M[0x060D + r.y] === 0x0C && (M[0x0727] | M[0x0726])) return flagsOf(0xFF, { x, y: r.y });
      return flagsOf(M[0x072E + x], { x, y: r.y });
    }
    if ((r.x & 0x80) || (r.a & 0x80)) return flagsOf(0, { x: r.x, y: r.y });
    const a1 = (r.a << 1) & 255;
    const x = (((a1 << 1) & 255) + M[0x80] + (a1 >> 7)) & 255;
    return flagsOf(M[0x38B1 + x], { x, y: r.y });
  };
  // Unless its AI state is 2, the ship weighs fighting its target (ai_fight_score): state $FE to
  // fight, or $FF and tactic 7 to flee
  P.ai_attitude = function () {
    const x = M[0xD5];
    if (M[0x041B + x] === 2) return {};
    const s = P.ai_fight_score({ a: 0, x, y: M[0x0445 + x] });
    if (s.n) { M[0x043F + M[0xD5]] = 7; M[0x041B + M[0xD5]] = 0xFF; } else M[0x041B + M[0xD5]] = 0xFE;
    return {};
  };
  // A fighting ship further than $0861 (a log) from its target pursues it (tactic 2); nearer, a
  // ship pursuing or cruising takes its type's tactic ($0C38), and one in another tactic changes
  // to one of seven at random one time in ten
  P.ai_tactic = function () {
    let y = M[0xD5];
    const s = M[0x041B + y];
    if (!(s & 0x80) || s === 0xFF) return {};
    if (neg(0x61, 0x08, M[0xD0], M[0xD1])) { M[0x043F + M[0xD5]] = 2; return {}; }
    const t = M[0x043F + y];
    let a;
    if (t === 2 || t === 0) a = M[0x0C38 + M[0x060D + y]];
    else {
      if (P.random().a < 0xE6) return {};
      a = M[0x380A + P.random_upto({ a: 6 }).a];
      y = M[0xD5];
    }
    M[0x043F + y] = a;
    return {};
  };
  // The speed ($0415) of ship X from its tactic ($0C9A); against a ship, by the tactic's rule
  // ($0CA4): negative the target's speed, 1 the average of the two, 2 ai_closing_speed
  P.ai_speed = function (r) {
    const x = r.x, y = M[0x043F + x];
    M[0xC7] = M[0x0C9A + y];
    const t = M[0x0445 + x];
    if (t < 6) {
      M[0xC6] = t;
      const rule = M[0x0CA4 + y];
      if (rule) {
        const sp = P.speed_of({ y: M[0xC6] }).a;
        M[0xC8] = sp;
        if (rule & 0x80) M[0xC7] = sp;
        else if (rule === 1) M[0xC7] = ((sp + M[0xC7] + 1) & 255) >> 1;
        else P.ai_closing_speed();
      }
    }
    M[0x0415 + M[0xD5]] = M[0xC7];
    return {};
  };
  // Speed rule 2: 5 while the target is more than about 45 degrees off the nose, $4B beyond
  // $0861 (a log) from it, otherwise the tactic's speed
  P.ai_closing_speed = function () {
    if ((M[0xD4] & 0x80) || neg(M[0xD2], M[0xD3], 0x7D, 0xFF)) M[0xC7] = 5;
    else if (!neg(M[0xD0], M[0xD1], 0x61, 0x08)) M[0xC7] = 0x4B;
    return {};
  };
  // A fighting or fleeing ship within $08A4 (a log) of its target fires three times in ten: a
  // missile of its type's kind ($0C5F + 8) three times in ten of those (type 11 only when the
  // target is nearly dead ahead), otherwise the beam, when the target is nearly dead ahead or the
  // type's beam fires off the nose ($0C52 negative)
  P.ai_fire = function* () {
    let y = M[0xD5];
    if (!(M[0x041B + y] & 0x80) || M[0x0403 + y]) return {};
    if (!neg(M[0xD0], M[0xD1], 0xA4, 0x08)) return {};
    if (P.random().a >= 0x4D) return {};
    M[0xBD] = !(M[0xD4] & 0x80) && !neg(M[0xD2], M[0xD3], 0xCB, 0xFF) ? 1 : 0;
    if (P.random().a < 0x4D) {
      y = M[0xD5];
      if (!(M[0x0409 + y] & 1)) {
        const k = M[0x0C5F + M[0x060D + y]];
        if (k) {
          const x = (k + 8) & 255;
          if (x !== 0x0B || M[0xBD]) return P.launch_missile({ x, y });
        }
      }
    }
    y = M[0xD5];
    if (!M[0xBD] && !(M[0x0C52 + M[0x060D + y]] & 0x80)) return {};
    return yield* P.fire_beam({ y });
  };
  // Whether ship X fights ship Y: 4 less than A, plus its armour in eighths of its type's, plus
  // half the difference in rank ($0C79), one more when its faction loathes the target's ($FE),
  // two more when the target is under attack, two fewer when it is, one fewer for a merchant
  // (faction 1), two more for faction 2, and 2 whatever for faction 3. Negative: it flees. Not a
  // ship: 1.
  P.ai_fight_score = function (r) {
    M[0x8E] = r.x; M[0x90] = r.y;
    if (r.y >= 6) return flagsOf(1, { x: r.x, y: r.y });
    M[0x91] = (r.a - 4) & 255;
    M[0x8F] = M[0x060D + r.x];
    shrink((M[0x8F] << 1) & 255, 3, 0x8D, 0x8C);
    const s = (r.x << 1) & 255;
    M[0x8A] = M[0x051D + s]; M[0x8B] = M[0x051E + s];
    do {
      M[0x91] = (M[0x91] + 1) & 255;
      const lo = M[0x8A] - M[0x8C]; M[0x8A] = lo & 255;
      M[0x8B] = (M[0x8B] - M[0x8D] - (lo < 0 ? 1 : 0)) & 255;
    } while (!(M[0x8B] & 0x80));
    const d = (M[0x0C79 + M[0x8F]] - M[0x0C79 + M[0x060D + M[0x90]]]) & 255;
    M[0x8A] = (d << 1) & 255;
    M[0x91] = (((d >> 1) | (d & 0x80)) + M[0x91]) & 255;
    const f = P.faction_attitude({ a: M[0x0433 + M[0x8E]], x: M[0x0433 + M[0x90]], y: M[0x8E] });
    if (f.a === 0xFE) M[0x91] = (M[0x91] + 1) & 255;
    if (!(M[0x0439 + M[0x90]] & 0x80)) M[0x91] = (M[0x91] + 2) & 255;
    if (!(M[0x0439 + M[0x8E]] & 0x80)) M[0x91] = (M[0x91] - 2) & 255;
    const a = M[0x0433 + M[0x8E]];
    if (a === 1) M[0x91] = (M[0x91] - 1) & 255;
    if (a === 2) M[0x91] = (M[0x91] + 2) & 255;
    if (a === 3) M[0x91] = 2;
    return flagsOf(M[0x91], { x: f.x, y: M[0x8E] });
  };
  // The player's standing with faction Y moved by A, kept within -2..2; a negative faction or
  // faction 3 is left alone
  P.change_standing = function (r) {
    M[0x80] = r.a;
    if ((r.y & 0x80) || r.y === 3) return { a: r.y, x: r.x, y: r.y };
    const a = (M[0x072E + r.y] + M[0x80]) & 255;
    if (a < 3 || a >= 0xFE) M[0x072E + r.y] = a;
    return { a, x: r.x, y: r.y };
  };
  // A computer ship steers once it has stopped rotating, by its tactic's mode ($0C86): 0 toward
  // its target, 1 away from it, 2 along the target's heading, 3 and above at random;
  // the tactic's angle ($0C90) is the offset it keeps
  P.ai_steer = function () {
    const x = M[0xD5];
    if (M[0x0508 + x] | M[0x0516 + x] | M[0x050F + x]) return {};
    const y = M[0x043F + x];
    if (y & 0x80) return {};
    M[0x9E] = M[0x0445 + x];
    const m = M[0x0C86 + y];
    if (m & 0x80) return {};
    if (m === 3) return P.random_rates({ x });
    if (M[0x0445 + x] & 0x80) return {};
    if (m === 0 || m === 1) {
      const [a, b] = m ? [M[0xD5], M[0x9E]] : [M[0x9E], M[0xD5]];
      P.slot_pos_ptr({ y: a });
      setp(0x76, pos(b)); setp(0x78, 0x0896);
      P.vec_sub_to_log();
    } else if (m === 2) {
      setp(0x78, 0x0896);
      setp(0x74, M[0x9E] < 6 ? 0x045D + M[0x083C + M[0x9E]] : 0x0DBA);
      M[0x5F] = 0; M[0x60] = 0; M[0x61] = 0xFF;
      P.vec_scale_signed();
    } else return P.random_rates({ x });
    setp(0x74, 0x0896);
    const s = M[0xD5];
    return P.steer_toward({ a: M[0x0C90 + M[0x043F + s]], x: s });
  };
  // Ship X given random turn, pitch and roll rates, each -32 to 32
  P.random_rates = function (r) {
    const x = r.x;
    M[0x0516 + x] = P.random_rate().a;
    M[0x0508 + x] = P.random_rate().a;
    M[0x050F + x] = P.random_rate().a;
    return { a: M[0x050F + x], x };
  };
  P.random_rate = function (r) {
    const o = P.random();
    const v = (o.a & 0x3F) - 0x1F - (o.c ? 0 : 1);
    return { a: v & 255, x: r && r.x, y: r && r.y, c: v >= 0 ? 1 : 0 };
  };
  // Ship X turned toward the direction at ($74), offset by angle A: the direction in the ship's
  // frame ($089F), its two angles ($6F/$70 across, $72/$73 up), each less the offset taken away
  // from the angle's magnitude, divided by the type's turning ($0BE2, a log) and kept to a signed
  // byte, are its turn ($0516) and pitch ($0508) rates
  P.steer_toward = function (r) {
    M[0x96] = r.a; M[0x95] = r.x;
    M[0x94] = (M[0x060D + r.x] << 1) & 255;
    setp(0x76, orient(r.x)); setp(0x78, 0x089F);
    P.mat_times_vec();
    setp(0x74, 0x089F); setp(0x78, 0x006B);
    P.vec_angles();
    let s;
    if (M[0x70] & 0x80) { s = M[0x6F] + M[0x96]; M[0x60] = s & 255; M[0x61] = (M[0x70] + (s >> 8)) & 255; }
    else { s = M[0x6F] - M[0x96]; M[0x60] = s & 255; M[0x61] = (M[0x70] - (s < 0 ? 1 : 0)) & 255; }
    const rate = (flip) => {
      P.int16_to_log();
      const y = M[0x94];
      const l = M[0x5F] - M[0x0BE2 + y]; M[0x5F] = l & 255;
      M[0x60] = (M[0x60] - M[0x0BE3 + y] - (l < 0 ? 1 : 0)) & 255;
      if (flip) M[0x61] ^= 0xFF;
      P.log_to_lin_signed();
      return P.clamp_s8().a;
    };
    M[0x0516 + M[0x95]] = rate(false);
    M[0x60] = M[0x72]; M[0x61] = M[0x73];
    M[0x0508 + M[0x95]] = rate(true);
    return { a: M[0x0508 + M[0x95]], y: M[0x95] };
  };
  // A ship's name: three random digits or capitals in $85-$87
  P.random_label = function () {
    M[0x85] = P.random_label_char().a;
    M[0x86] = P.random_label_char().a;
    const o = P.random_label_char();
    M[0x87] = o.a;
    return o;
  };
  P.random_label_char = function (r) {
    const o = P.random_upto({ a: 0x23 });
    return { a: o.a < 0x0A ? o.a + 0x30 : o.a + 0x37, x: r && r.x, y: o.y, c: 0 };
  };

  // ---- surrender. The player gives up (key G) to the one ship fighting the player, once an
  // encounter: rank points for the attempt; a ship that loathes the player ($FE) refuses, as one
  // in five do; the police (faction 2) take the bounty owed and 50 credits; anyone else the cargo.
  // Accepted, every computer ship's missile is gone and so is the ship.
  P.key_surrender = function* () {
    P.set_colour({ x: 1 });
    P.view_clear_c000(); P.view_clear_4000();
    P.select_window({ y: 5 });
    yield* P.print_wrapped({ x: 0x88, a: 0xCF });
    yield* P.wait_ticks({ a: 0x14 });
    let x = 0;
    for (let y = 5; y; y--) if (M[0x05F9 + y] && !M[0x0445 + y] && (M[0x041B + y] & 0x80)) { M[0x9E] = y; x++; }
    let text = 0xCF7F, r = null;
    if (x === 1 && !M[0x0832]) {
      M[0x0832]++;
      const s = M[0x072B] + M[0x072A];
      M[0x072B] = s > 255 ? 0xFF : s;
      const y = M[0x9E];
      if (P.faction_attitude({ a: M[0x0433 + y], x: 4, y }).a === 0xFE) text = 0xCF81;
      else if (P.random_upto({ a: 4 }).a) {
        const f = M[0x0433 + M[0x9E]];
        if (f & 0x80) text = 0xCF80;
        else if (f === 2) {
          yield* P.print_wrapped({ x: 0x87, a: 0xCF });
          if (!(yield* P.ask_agree()).z) text = 0xCF80;
          else {
            const v = M[0x0726] + 0x32;
            M[0x60] = v & 255; M[0x61] = (M[0x0727] + (v >> 8)) & 255;
            if (P.pay_credits().c) { M[0x0726] = 0; M[0x0727] = 0; r = yield* release(0xCF86); } else text = 0xCF85;
          }
        } else {
          yield* P.print_wrapped({ x: 0x84, a: 0xCF });
          if (!(yield* P.ask_agree()).z) text = 0xCF80;
          else if (P.cargo_count().z) text = 0xCF83;
          else { P.cargo_jettison(); r = yield* release(0xCF82); }
        }
      }
    }
    if (!r) r = { x: text & 255, a: text >> 8 };
    yield* P.print_wrapped(r);
    P.select_window({ y: 0 });
    return yield* P.wait_key();
  };
  // The surrender accepted: its text, then the computer ships' missiles and the ship itself gone;
  // the text printed after is what clear_tac leaves in A and X
  function* release(text) {
    yield* P.print_wrapped({ x: text & 255, a: text >> 8 });
    for (let y = 5; y; y--) if (M[0x05F9 + y] && M[0x0403 + y]) P.free_slot({ y });
    P.free_slot({ y: M[0x9E] });
    const o = P.clear_tac();
    return { a: o.a, x: o.x, y: o.y };
  }
  // After the minds: the player's target, a merchant (faction 1) aiming at the player with a
  // quarter of its armour left, and no other ship (nor missile) after either, may offer its cargo
  // to be let go: 67 in 100, halved when the player has less than a quarter of its own armour and
  // when the merchants loathe the player. Taken, one or two loads of one kind of cargo come aboard
  // if the hold has room, and the merchants think less of the player one time in four.
  P.merchant_surrender = function* () {
    if (M[0x0832]) return {};
    let y = M[0x0445];
    M[0x9E] = y;
    if (y >= 6 || M[0x0445 + y] || M[0x0433 + y] !== 1) return {};
    M[0x9F] = M[0x060D + y];
    shrink((M[0x9F] << 1) & 255, 2, 0xA1, 0xA0);
    y = (M[0x9E] << 1) & 255;
    if (!below(M[0x051D + y], M[0x051E + y], M[0xA0], M[0xA1])) return {};
    let a = M[0x9E];
    for (y = 5; y; y--) {
      if (!M[0x05F9 + y] || a !== M[0x0445 + y]) continue;
      a = M[0x0403 + y];
      if (!a) return {};
    }
    for (y = 5; y; y--) {
      if (!M[0x05F9 + y] || M[0x0445 + y] || y === M[0x9E]) continue;
      if (!M[0x0403 + y]) return {};
    }
    M[0xA2] = 0x43;
    shrink(0, 2, 0xA1, 0xA0);
    if (below(M[0x051D], M[0x051E], M[0xA0], M[0xA1])) M[0xA2] >>= 1;
    y = M[0x9E];
    if (!M[0x0433 + y]) M[0xA2] >>= 1;
    if (P.faction_attitude({ a: M[0x0433 + y], x: 4, y }).a === 0xFE) M[0xA2] >>= 1;
    if (P.random_upto({ a: 0x64 }).a >= M[0xA2]) return {};
    M[0x0832]++;
    P.set_colour({ x: 1 });
    P.view_clear_c000(); P.view_clear_4000();
    P.select_window({ y: 5 });
    yield* P.print_wrapped({ x: 0x8D, a: 0xCF });
    const k = P.random_upto({ a: 0x13 });
    M[0xA3] = k.a;
    yield* P.print_disk_text_cf9c(k);
    yield* P.print_wrapped({ x: 0xCB, a: 0x3B });
    if (!(yield* P.ask_agree()).z) yield* P.print_wrapped({ x: 0x8C, a: 0xCF });
    else {
      yield* P.print_wrapped({ x: 0x8B, a: 0xCF });
      yield* P.wait_ticks({ a: 0x1E });
      if (P.cargo_count().n) yield* P.print_wrapped({ x: 0x89, a: 0xCF });
      else {
        yield* P.print_wrapped({ x: 0x8A, a: 0xCF });
        M[0xA0] = P.random_upto({ a: 1 }).a;
        do { P.cargo_add({ x: 0, a: M[0xA3] }); M[0xA0] = (M[0xA0] - 1) & 255; } while (!(M[0xA0] & 0x80));
        for (y = 5; y; y--) if (M[0x05F9 + y] && M[0x0403 + y]) P.free_slot({ y });
        if (P.random().a < 0x40) { const x = M[0x9E]; P.change_standing({ a: 0xFF, x, y: M[0x0433 + x] }); }
        y = M[0x9E];
        if (M[0x0433 + y] === 1 && M[0x079B]) { M[0x079A] = (M[0x079A] + 1) & 255; M[0x079B] = 0; }
        P.free_slot({ y: M[0x9E] });
        P.clear_tac();
      }
    }
    P.select_window({ y: 0 });
    return yield* P.wait_key();
  };
  // AGREE or REFUSE, the menu ($99DE, the list at $3BCF) centred under the offer; Z set for AGREE
  P.ask_agree = function* () {
    M[0x4F] = ((((M[0x0D21] + M[0x0D20]) & 255) >> 1) - 2) & 255;
    M[0x79] = 0; M[0x7A] = 0xCF; M[0x7B] = 0x3B;
    const m = yield* P.menu({ a: 2, y: 7 });
    const o = yield* P.print_char({ a: 0x11 });
    return Object.assign({}, o, { n: m.n, z: m.z, c: m.c, v: m.v });
  };

  // ---- what flight uses of the encounter tables and the hold
  // A ship type to meet, with chance $96 in 100 ($FF and N set for none): its class by the
  // weights at $077D, then one of the four types of that class ($2D24), the better ones only for
  // a player of high rank. X the type's faction, and N its sign.
  P.pick_ship_with_chance = function (r) { M[0x96] = r.a; return P.pick_ship(r); };
  P.pick_ship = function (r) {
    let a = P.random_upto({ a: 0x63 }).a;
    if (a >= M[0x96]) return { a: 0xFF, x: r.x, y: a, n: 1, z: 0 };
    a = P.random_upto({ a: 0x63 }).a;
    let y = 4;
    for (;;) {
      const s = a - M[0x077D + y]; a = s & 255;
      y = (y - 1) & 255;
      if (s < 0) break;
      if (y & 0x80) return { a: 0xFF, x: r.x, y, n: 1, z: 0 };
    }
    M[0x94] = y;
    M[0x95] = ((y + 1) << 2) & 255;
    a = P.random_upto({ a: 0x0F }).a;
    if (a >= 4) { a = P.random_upto({ a: M[0x0C79] }).a >> 1; if (a >= 4) a = 3; }
    const t = M[0x2D24 + ((a + M[0x95]) & 255)], x = M[0x0C1E + t];
    return { a: t, x, y: t, n: x >> 7, z: x ? 0 : 1 };
  };
  // Cargo of kind A into the highest empty hold slot (of $0777), X the price paid; carry set when
  // the hold is full
  P.cargo_add = function (r) {
    M[0x80] = r.x;
    let y = (M[0x0777] - 1) & 255;
    for (;;) {
      const x = M[0x0767 + y];
      if (x & 0x80) { M[0x0767 + y] = r.a; M[0x076F + y] = M[0x80]; return { a: M[0x80], x, y, c: 0 }; }
      y = (y - 1) & 255;
      if (y & 0x80) return { a: r.a, x, y, c: 1 };
    }
  };
  P.cargo_jettison = function () {
    let y = M[0x0777];
    do { M[0x0766 + y] = 0xFF; y = (y - 1) & 255; } while (y);
    return { a: 0xFF, y: 0 };
  };
  // The hold slots in use: 0 for none, $FF for a full hold, else the count; X the count
  P.cargo_count = function () {
    let x = 0, y = (M[0x0777] - 1) & 255;
    do { if (!(M[0x0767 + y] & 0x80)) x++; y = (y - 1) & 255; } while (!(y & 0x80));
    const a = !x ? 0 : x === M[0x0777] ? 0xFF : x;
    return flagsOf(a, { x, y: 0xFF });
  };
  P.print_disk_text_cf9c = function* (r) {
    const s = r.a + 0x9C;
    return yield* P.print_text({ x: s & 255, y: (0xCF + (s >> 8)) & 255 });
  };
  // The word in $60/$61 taken from the credits ($0728) if there are enough: carry set when paid
  P.pay_credits = function () {
    if (below(M[0x0728], M[0x0729], M[0x60], M[0x61])) return { a: M[0x0729], c: 0 };
    const s = M[0x0728] - M[0x60]; M[0x0728] = s & 255;
    M[0x0729] = (M[0x0729] - M[0x61] - (s < 0 ? 1 : 0)) & 255;
    return { a: M[0x0729], c: 1 };
  };
  // The word in $60/$61 added to the credits, stopping at $FFFF
  P.add_credits = function () {
    const s = M[0x0728] + M[0x60]; M[0x0728] = s & 255;
    const h = M[0x0729] + M[0x61] + (s >> 8); M[0x0729] = h & 255;
    if (h > 255) { M[0x0728] = 0xFF; M[0x0729] = 0xFF; }
    return { a: M[0x0729] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
