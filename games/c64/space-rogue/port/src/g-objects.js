// The objects of flight: making and freeing them ($1949-$1BED, $24B3-$2541, $1E73), a sector's
// set ($15A0-$1764), thrust, turning, movement and gravity ($74A3-$798E), the particles and the
// target arrows ($7772-$7C20), contact between objects and the damage it does ($6AB3-$7032),
// docking, the Malir gate and its wormhole ($7062-$74A2), and the loads that go with them: the
// overlays, the pictures and the models ($14E5-$159F, $1BEE-$1D81, $2E71).
//
// An object is a slot, 0 to 19: 0 is the player, 1-5 the other ships, 6 a planet or a base, 7-19
// everything else. A slot's position is three 24-bit linear numbers at $065D + 9 n and its
// velocity three more at $0545 + 9 n; a ship's orientation is three log-form rows at $044B +
// 27 n. The type's tables are indexed by the type ($08D5 its flags) or twice it (its radius at
// $0A1D, its armour at $0AA9, its thrust at $0C04).
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.objects = function (P) {
  const M = P.M, io = P.io;
  const R = (r, o) => Object.assign({}, r, o);
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, i) => M[(ptr(zp) + i) & 0xFFFF];
  const put = (zp, i, v) => { M[(ptr(zp) + i) & 0xFFFF] = v & 255; };
  const nine = i => M[0x0846 + i];                    // 9 i, its low byte
  const pos = i => 0x065D + nine(i);                  // slot i's position
  const vel = i => 0x0545 + nine(i);                  // slot i's velocity
  const orient = i => 0x044B + M[0x083C + i];         // slot i's orientation
  const flags = i => M[0x08D5 + M[0x060D + i]];       // the flags of slot i's type
  // the pair at a/a+1 less b/b+1 (16 bits) has its top bit set: the game's CMP and SBC, then BMI
  const neg = (al, ah, bl, bh) => ((ah - bh - (al < bl ? 1 : 0)) & 0x80) !== 0;
  const dec16 = (a, d) => { const v = ((M[a] | M[a + 1] << 8) - d) & 0xFFFF; M[a] = v & 255; M[a + 1] = v >> 8; };

  // ---- making and freeing objects
  // An object of type X in a free slot, at the position ($74); the slot comes back in Y, $FF when
  // none was free. Ships (types below $0D) take slots 5 to 0, planets and bases ($0D-$10) slot
  // 6, the rest 19 to 7.
  P.create_object = function (r) {
    const t = r.x;
    M[0x94] = t;
    let y, n;
    if (t >= 0x11) { y = 0x13; n = 0x0D; } else if (t >= 0x0D) { y = 6; n = 1; } else { y = 5; n = 6; }
    for (;;) {
      if (!M[0x05F9 + y]) return P.fill_slot({ y });
      y--; n--;
      if (!n) return { a: 1, x: 0, y: 0xFF, n: 1, z: 0 };
    }
  };
  P.create_in_slot = function (r) { M[0x94] = r.x; return P.fill_slot({ y: r.y }); };
  // Slot Y made type $94: in use, drawn, solid when its type has a radius, its type's armour, the
  // position from ($74); a ship (below slot 7) also starts unturned, level (copy_identity), and in
  // slots 0-5 stopped, undamaged, with no target and no attacker; a computer ship gets a random
  // turn, its type's faction and a random name, a missile the mark that it is one. Then the
  // type's model is loaded.
  P.fill_slot = function (r) {
    const y = r.y;
    M[0x95] = y;
    M[0x0649 + y] = 1; M[0x05F9 + y] = 1;
    const t = M[0x94], x = (t << 1) & 255;
    M[0x060D + y] = t;
    M[0x0635 + y] = M[0x0A1D + x] | M[0x0A1E + x];
    const y2 = (y << 1) & 255;
    M[0x051D + y2] = M[0x0AA9 + x]; M[0x051E + y2] = M[0x0AAA + x];
    setp(0x78, pos(y));
    P.copy9();
    const s = M[0x95];
    if (s < 7) {
      M[0x0508 + s] = 0; M[0x0516 + s] = 0; M[0x050F + s] = 0;
      setp(0x78, orient(s));
      P.copy_identity();
      if (s < 6) {
        M[0x0415 + s] = 0; M[0x0409 + s] = 0; M[0x041B + s] = 0; M[0x0403 + s] = 0;
        M[0x0445 + s] = 0xFF; M[0x0439 + s] = 0xFF; M[0x043F + s] = 0xFF; M[0x0433 + s] = 0xFF;
        setp(0x78, vel(s)); setp(0x74, 0x0DC3);
        P.copy9();
        if (s) {
          if (M[0x08D5 + M[0x94]] & 0x20) M[0x0403 + s] = (M[0x0403 + s] + 1) & 255;
          else {
            M[0x0516 + s] = P.random().a;
            M[0x041B + s] = 1; M[0x043F + s] = 0;
            M[0x0433 + s] = M[0x0C1E + M[0x94]];
            P.random_label();
            const k = M[0x95] * 3;
            M[0x0421 + k] = M[0x85]; M[0x0422 + k] = M[0x86]; M[0x0423 + k] = M[0x87];
          }
        }
      }
    }
    const l = P.load_model({ y: M[0x94] });
    if (l.c) return { a: l.a, y: 0xFF, n: 1, z: 0 };
    return { a: l.a, y: M[0x95], n: 0, z: M[0x95] ? 0 : 1 };
  };
  // Takes slot Y out of play; A says how: $FF quietly, 0 destroyed by the player (the reward
  // when a ship that is not a missile), anything else destroyed by another; all but $FF explode
  P.destroy_object = function* (r) {
    M[0x8A] = r.y; M[0x8B] = r.a;
    if (r.y === M[0x0445]) P.clear_tac();
    const f = P.free_slot({ y: M[0x8A] });
    if (M[0x8B] & 0x80) return { a: M[0x8B], x: f.x, y: f.y };
    if (!M[0x8B]) {
      const y = M[0x8A];
      if (y < 6 && !M[0x0403 + y]) yield* P.kill_reward({ y });
    }
    return P.explode({ y: M[0x8A] });
  };
  // Slot Y emptied, and no ship's target or attacker any more ($8C the last ship that had it as
  // its target). Slot 0 is the player: the game is over.
  P.free_slot = function (r) {
    const y = r.y;
    if (!y) return P.player_destroyed();
    M[0x0649 + y] = 0; M[0x0635 + y] = 0; M[0x05F9 + y] = 0;
    M[0x8C] = 0; M[0x8A] = y;
    for (let x = 5; x >= 0; x--) {
      if (M[0x0445 + x] === y) { M[0x8C] = x; M[0x0445 + x] = 0xFF; }
      if (M[0x0439 + x] === y) M[0x0439 + x] = 0xFF;
    }
    return { a: M[0x0439], x: 0xFF, y };
  };
  // END (the death screen) loaded to $E900 and entered at $E972
  P.player_destroyed = function () {
    P.load_end();
    throw new P.Goto(0xE972);
  };
  // The player has destroyed slot Y: a kill counted for the type-6 hunt; a bounty in credits for
  // a pirate (faction 0, with a random part) or faction 3; one time in two a step toward the
  // next rank; one in four the standing with the factions moved; and for factions 1 and 2 the
  // bounty owed by the law.
  P.kill_reward = function* (r) {
    let y = r.y;
    if (M[0x079C] && M[0x060D + y] === 6) { M[0x079A] = (M[0x079A] + 1) & 255; M[0x079C] = 0; }
    M[0x60] = 0; M[0x61] = 0;
    const f = M[0x0433 + y];
    if (f === 0 || f === 3) {
      if (f === 0) M[0x60] = P.random().a;
      const x = M[0x060D + M[0x8A]], rk = M[0x0C79 + x];
      const s = ((rk << 5) & 255) + M[0x60] + ((rk >> 3) & 1);
      M[0x60] = s & 255;
      if (s > 255) M[0x61] = (M[0x61] + 1) & 255;
      P.add_credits({ a: M[0x60], x, y: M[0x8A] });
      yield* P.print_message({ x: 0x96, a: 0x1B });
      yield* P.print_number({});
      yield* P.print_text({ x: 0xAF, y: 0x1B });
    }
    if (!(P.random().a & 0x80)) return {};
    y = M[0x8A];
    const v = M[0x072B] - M[0x0C79 + M[0x060D + y]];
    M[0x072B] = v & 255;
    if (v < 0 && M[0x072A] < 5) {
      let a = 7, k = M[0x072A];
      do { a = (a << 1) & 255; k = (k - 1) & 255; } while (k);
      M[0x072B] = a;
      M[0x072A] = (M[0x072A] + 1) & 255;
      P.copy_ship_stats();
    }
    if (P.random().a < 0x40) {
      const x = M[0x8C];
      if (x && !M[0x0403 + x]) P.change_standing({ a: 1, x, y: M[0x0433 + x] });
      const t = M[0x8A];
      if (M[0x060D + t] === 0x0C) return {};
      P.change_standing({ a: 0xFF, x: t, y: M[0x0433 + t] });
    }
    y = M[0x8A];
    const f2 = M[0x0433 + y];
    if (f2 !== 2 && f2 !== 1) return {};
    const v2 = (M[0x0C79 + M[0x060D + y]] + 2) & 255;
    const s = ((v2 << 4) & 255) + M[0x0726] + ((v2 >> 4) & 1);
    M[0x0726] = s & 255;
    if (s > 255) M[0x0727] = (M[0x0727] + 1) & 255;
    return {};
  };
  // Every slot whose type has flag bit 3 (missiles, explosions, debris) ages: its armour word
  // counts down, and below zero the slot is freed, a missile becoming an explosion (type $22)
  P.age_objects = function () {
    for (let y = 0x13; y >= 0; y--) {
      if (!M[0x05F9 + y] || !(flags(y) & 8)) continue;
      const x = (y << 1) & 255;
      if (!M[0x051D + x]) M[0x051E + x] = (M[0x051E + x] - 1) & 255;
      M[0x051D + x] = (M[0x051D + x] - 1) & 255;
      if (!(M[0x051E + x] & 0x80)) continue;
      P.free_slot({ y });
      if (!M[0x0403 + y]) continue;
      M[0xA8] = y;
      P.slot_pos_ptr({ y });
      P.create_object({ x: 0x22 });
      y = M[0xA8];
    }
    return {};
  };
  // Up to ten pieces of debris (type $18) where slot Y was, each with a random velocity
  P.explode = function (r) {
    P.slot_pos_ptr({ y: r.y });
    M[0x7A] = M[0x74]; M[0x7B] = M[0x75];
    M[0x2542] = 0x0A;
    do {
      M[0x74] = M[0x7A]; M[0x75] = M[0x7B];
      const o = P.create_object({ x: 0x18 });
      if (o.y & 0x80) return o;
      P.random_velocity({ y: o.y });
      M[0x2542] = (M[0x2542] - 1) & 255;
    } while (M[0x2542]);
    return {};
  };
  // Each component of slot Y's velocity a random byte, with a random sign above it
  P.random_velocity = function (r) {
    let x = nine(r.y), y = 0;
    M[0x85] = 2;
    do {
      M[0x0545 + x] = P.random().a;
      y = P.random().a & 0x80 ? 0xFF : 0;
      M[0x0546 + x] = y; M[0x0547 + x] = y;
      x = (x + 3) & 255;
      M[0x85] = (M[0x85] - 1) & 255;
    } while (!(M[0x85] & 0x80));
    return { a: y, x, y };
  };
  // ($78) the position ($74) moved by a random amount on each axis: the whole part's two bytes
  // get a random number from 0 to twice $60/$61, less $60/$61; the fraction is not written
  P.random_offset = function () {
    M[0x85] = M[0x60]; M[0x86] = M[0x61];
    const d = (M[0x60] | M[0x61] << 8) << 1;
    M[0x60] = d & 255; M[0x61] = (d >> 8) & 255;
    M[0x87] = 7;
    let y;
    do {
      P.random_word();
      const lo = M[0x62] - M[0x85];
      M[0x62] = lo & 255; M[0x63] = (M[0x63] - M[0x86] - (lo < 0 ? 1 : 0)) & 255;
      y = M[0x87];
      const s = at(0x74, y) + M[0x62];
      put(0x78, y, s);
      put(0x78, y + 1, at(0x74, y + 1) + M[0x63] + (s >> 8));
      M[0x87] = (M[0x87] - 3) & 255;
    } while (!(M[0x87] & 0x80));
    return { a: M[0x87], y: y + 1 };
  };
  // The sector's hazards, while it has hazard entries: now and then a burst of triangles in the
  // window, and a large one jolts the ship
  P.sector_hazard = function () {
    if (!M[0x0782]) return {};
    if (!(P.random_upto({ a: 0x8B }).a & 0x80)) return {};
    P.set_colour({ x: 5 });
    M[0x52] = 0; M[0x54] = 0;
    M[0x51] = P.random_upto({ a: M[0x41] }).a;
    M[0x53] = P.random_upto({ a: M[0x42] }).a;
    const n = (P.random_upto({ a: 0xBF }).a + 1) & 255;
    P.spray_triangles({ a: n, x: 2, y: 9 });
    if (n < 0xAD) return { a: n };
    P.sound_play({ a: 0x0B });
    return P.jolt_player();
  };

  // ---- thrust, turning and movement
  // Carry set when the positions at ($74) and ($76) are within $60/$61 of each other on every
  // axis, by the whole part's two bytes
  P.within_range = function () {
    const acc = M[0x60] | M[0x61] << 8;
    let y = 7;
    for (;;) {
      const d = ((at(0x74, y) | at(0x74, y + 1) << 8) - (at(0x76, y) | at(0x76, y + 1) << 8)) & 0xFFFF;
      M[0x80] = d & 255; M[0x81] = d >> 8;
      if (d & 0x8000 ? acc + d < 0x10000 : acc < d) return { c: 0, y: y + 1 };
      y -= 3;
      if (y < 0) return { c: 1, y: 0xFE };
    }
  };
  // Ships 5..1 in cruise flight; the player too unless the flight is Newtonian, when the thrust
  // key's direction ($0D01) adds the type's thrust along the ship's nose, kept while the new
  // velocity's log length is $0221 or less
  P.apply_thrust = function () {
    let x = 5;
    M[0x94] = x;
    do {
      if (M[0x05F9 + x]) P.cruise_thrust({ x });
      M[0x94] = (M[0x94] - 1) & 255;
      x = M[0x94];
    } while (x);
    if (!M[0x0D02]) return P.cruise_thrust({ x: 0 });
    if (!M[0x0D01]) return { a: 0, x: 0 };
    M[0x61] = M[0x0D01]; M[0x5F] = M[0x0C04]; M[0x60] = M[0x0C05];
    P.engine_damage();
    P.forward_times();
    setp(0x76, 0x0545);
    P.vec_add_lin();
    setp(0x78, 0x089F);
    P.vec_lin_to_log();
    setp(0x74, 0x089F);
    P.vec_length();
    if (neg(0x21, 0x02, M[0x5F], M[0x60])) return { x: 0 };
    setp(0x74, 0x0896); setp(0x78, 0x0545);
    return P.copy9();
  };
  // Cruise flight for ship X: the wanted velocity is its nose times its set speed; the difference
  // from its velocity, when it is more than the type's thrust ($0C04, a quarter with the engine
  // out), is closed by that much along it, and otherwise the wanted velocity is taken
  P.cruise_thrust = function (r) {
    P.byte_to_log({ a: (0 - M[0x0415 + r.x]) & 255 });
    M[0x60] = (M[0x60] - 4) & 255;
    P.forward_times();
    const x = M[0x94];
    setp(0x76, vel(x)); setp(0x78, 0x089F);
    P.vec_sub_to_log();
    setp(0x74, 0x089F);
    P.vec_length();
    setp(0x76, vel(x));
    const y = (M[0x060D + x] << 1) & 255;
    const lo = M[0x0C04 + y] - M[0x5F];
    M[0x5F] = lo & 255;
    M[0x60] = (M[0x0C05 + y] - M[0x60] - (lo < 0 ? 1 : 0)) & 255;
    P.engine_damage();
    if (M[0x60] & 0x80) {
      P.vec_scale();
      P.vec_log_to_lin();
      M[0x78] = M[0x76]; M[0x79] = M[0x77];
      return P.vec_add_lin();
    }
    M[0x78] = M[0x76]; M[0x79] = M[0x77];
    setp(0x74, 0x0896);
    return P.copy9();
  };
  // Ship $94's nose (its third row) times the log-form number in $5F-$61, linear at $0896
  P.forward_times = function () {
    const x = M[0x94];
    setp(0x74, 0x045D + M[0x083C + x]); setp(0x78, 0x0896);
    P.vec_scale_signed();
    setp(0x74, 0x0896);
    return Object.assign(P.vec_log_to_lin(), { x });
  };
  // A quarter of the thrust in $5F/$60 when ship $94's engine is out
  P.engine_damage = function () {
    const x = M[0x94];
    if (M[0x0409 + x] & 4) M[0x60] = (M[0x60] - 2) & 255;
    return { a: M[0x0409 + x] & 4, x };
  };
  // Every moving object (type flag bit 4) moved by its velocity
  P.move_objects = function () {
    for (let x = 0x13; x >= 0; x--) {
      if (!M[0x05F9 + x] || !(flags(x) & 0x10)) continue;
      setp(0x74, vel(x)); setp(0x76, pos(x)); setp(0x78, pos(x));
      P.vec_add_lin();
    }
    return { x: 0xFF };
  };
  // Slots 6..1 with a rate turned (slot 6, the planet or base, always spinning); then the player
  // by its three rates, and the camera's transposed orientation at $0DCC
  P.turn_objects = function () {
    let x = 6;
    M[0x94] = x;
    do {
      if (M[0x05F9 + x]) {
        if (x >= 6) M[0x0516 + x] = (M[0x0516 + x] + 1) & 255;
        if (M[0x050F + x] | M[0x0516 + x] | M[0x0508 + x]) P.turn_ship({ x });
      }
      M[0x94] = (M[0x94] - 1) & 255;
      x = M[0x94];
    } while (x);
    setp(0x74, 0x0095); setp(0x78, 0x044B);
    P.rate_to_radians({ a: M[0x050F] }); M[0x9B] = M[0x5F]; M[0x9C] = M[0x60]; M[0x9D] = M[0x61];
    P.rate_to_radians({ a: M[0x0516] }); M[0x98] = M[0x5F]; M[0x99] = M[0x60]; M[0x9A] = M[0x61];
    P.rate_to_radians({ a: M[0x0508] }); M[0x95] = M[0x5F]; M[0x96] = M[0x60]; M[0x97] = M[0x61];
    P.turn_by_rates();
    M[0x74] = M[0x5A]; M[0x75] = M[0x5B]; setp(0x78, 0x0DCC);
    return P.mat_transpose();
  };
  // A signed byte of 1024ths of a turn to log-form radians (log(2 pi / 1024) is -$0759)
  P.rate_to_radians = function (r) {
    M[0x60] = r.a; M[0x61] = r.a & 0x80 ? 0xFF : 0;
    const o = P.int16_to_log({ y: M[0x61] });
    const lo = M[0x5F] - 0x59;
    M[0x5F] = lo & 255;
    M[0x60] = (M[0x60] - 7 - (lo < 0 ? 1 : 0)) & 255;
    return { a: M[0x60], y: o.y };
  };
  // Computer ship X turned one step of its type's turning on each axis whose rate is nonzero,
  // each rate moved a step toward zero
  P.turn_ship = function (r) {
    const x = r.x, t = (M[0x060D + x] << 1) & 255;
    const lo = M[0x0BE2 + t] - 0x59;
    M[0x9E] = lo & 255; M[0x9F] = (M[0x0BE3 + t] - 7 - (lo < 0 ? 1 : 0)) & 255;
    setp(0x78, 0x0095);
    P.copy9_from_0DAB();
    const step = (rate, sign, to) => {
      const v = M[rate + x];
      if (!v) return;
      if (v & 0x80) { M[rate + x] = (v + 1) & 255; M[sign] = 0xFF; } else { M[rate + x] = (v - 1) & 255; M[sign] = 0; }
      M[to] = M[0x9E]; M[to + 1] = M[0x9F];
    };
    step(0x0508, 0x97, 0x95);
    step(0x0516, 0x9A, 0x98);
    step(0x050F, 0x9D, 0x9B);
    setp(0x78, orient(x)); setp(0x74, 0x0095);
    return P.turn_by_rates();
  };

  // ---- particles and gravity
  // The space particles (type flag bit 2) in slots 19..6 that are off screen or far away put back
  // near the camera
  P.place_particles = function () {
    M[0x8B] = 0;
    let y = 0x13;
    M[0x8A] = y;
    do {
      if (M[0x05F9 + y]) {
        const x = M[0x060D + y];
        if (M[0x08D5 + x] & 4) {
          const o = M[0x0621 + y];
          if (!o || o >= 7) P.place_particle({ x, y });
        }
      }
      M[0x8A] = (M[0x8A] - 1) & 255;
      y = M[0x8A];
    } while (y >= 6);
    return { y };
  };
  // Particle Y of type X: a moving one stopped; then, the first time in a pass, the point ahead of
  // the camera, moved on from the last one ($7872) by $0463 (log) along the way it went, is
  // worked out at $0094; the particle is put at a random place within 10 of it
  P.place_particle = function (r) {
    if (M[0x08D5 + r.x] & 0x10) {
      setp(0x78, vel(r.y)); setp(0x74, 0x0DC3);
      P.copy9();
    }
    if (!M[0x8B]) {
      M[0x8B] = 1;
      P.ahead_of_camera();
      setp(0x78, 0x0094); setp(0x76, 0x7872);
      P.vec_sub_lin();
      setp(0x74, 0x0094);
      P.vec_lin_to_log();
      P.vec_normalise();
      M[0x5F] = 0x63; M[0x60] = 0x04;
      P.vec_scale();
      P.vec_log_to_lin();
      setp(0x76, 0x011D);
      P.vec_add_lin();
      setp(0x78, 0x7872); setp(0x74, 0x011D);
      P.copy9();
    }
    setp(0x74, 0x0094);
    setp(0x78, pos(M[0x8A]));
    M[0x60] = 0x0A; M[0x61] = 0;
    return P.random_offset();
  };
  // The point 37 units ahead of the camera, at $011D
  P.ahead_of_camera = function () {
    M[0x5F] = 0x33; M[0x60] = 0x05; M[0x61] = 0xFF;
    setp(0x74, ptr(0x5A) + 0x12); setp(0x78, 0x011D);
    P.vec_scale_signed();
    M[0x74] = M[0x78]; M[0x75] = M[0x79];
    P.vec_log_to_lin();
    M[0x76] = M[0x58]; M[0x77] = M[0x59];
    return P.vec_add_lin();
  };
  // Each object in slots 19..6 whose type has flag bit 1 pulls every solid ship 5..0 toward it,
  // by its type's mass (the radius word less 2 in the whole part, doubled)
  P.gravity = function* () {
    let y = 0x13;
    M[0x94] = y;
    do {
      if (M[0x05F9 + y] && (flags(y) & 2)) {
        const x = (M[0x060D + y] << 1) & 255;
        M[0x96] = M[0x0A63 + x]; M[0x97] = (M[0x0A64 + x] - 2) & 255;
        const m = (M[0x96] | M[0x97] << 8) << 1;
        M[0x96] = m & 255; M[0x97] = (m >> 8) & 255;
        let s = 5;
        M[0x95] = s;
        do {
          if (M[0x0635 + s]) {
            setp(0x76, pos(s));
            P.slot_pos_ptr({ y: M[0x94] });
            yield* P.gravity_pull();
            const v = vel(M[0x95]);
            setp(0x78, v); setp(0x76, v);
            P.vec_add_lin();
          }
          M[0x95] = (M[0x95] - 1) & 255;
          s = M[0x95];
        } while (!(s & 0x80));
      }
      M[0x94] = (M[0x94] - 1) & 255;
      y = M[0x94];
    } while (y !== 5);
    return { y };
  };
  // The pull of the object at ($74) on the ship at ($76), linear at $6B: the unit vector toward
  // it times the mass over the distance squared. The first time the player's pull reaches $F700
  // (log) the gravity warning is printed.
  P.gravity_pull = function* () {
    setp(0x78, 0x006B);
    P.vec_sub_to_log();
    setp(0x74, 0x006B);
    P.vec_length();
    P.vec_div();
    const d = (M[0x5F] | M[0x60] << 8) << 1;
    M[0x5F] = d & 255; M[0x60] = (d >> 8) & 255;
    const lo = M[0x96] - M[0x5F];
    M[0x5F] = lo & 255;
    M[0x60] = (M[0x97] - M[0x60] - (lo < 0 ? 1 : 0)) & 255;
    if (!M[0x95] && !M[0x0834] && !((M[0x60] - 0xF7) & 0x80)) {
      const p = ptr(0x74);
      yield* P.print_message({ x: 0x1E, a: 0xCF });
      setp(0x74, p);
      M[0x0834] = 1;
    }
    P.vec_scale();
    return P.vec_log_to_lin();
  };
  // From slot X to slot Y: the vector in log form at $0896, its length at $80/$81, and its dot
  // product with Y's nose (which way Y faces it), in $5F-$61. The LDY operand at $797D keeps Y.
  P.bearing = function (r) {
    M[0x797D] = r.y;
    P.slot_pos_ptr({ y: r.y });
    setp(0x76, pos(r.x)); setp(0x78, 0x0896);
    P.vec_sub_to_log();
    setp(0x74, 0x0896);
    P.vec_length();
    M[0x80] = M[0x5F]; M[0x81] = M[0x60];
    P.vec_div();
    setp(0x76, 0x045D + M[0x083C + M[0x797D]]);
    return P.vec_dot();
  };

  // ---- the target arrows
  // The arrowheads that point at the player's target: around it when it is in front and in the
  // window, otherwise at the window's edges, toward it
  P.draw_target_arrows = function () {
    const t = M[0x0445];
    if (t & 0x80) return {};
    P.slot_pos_ptr({ y: t });
    setp(0x76, 0x065D); setp(0x78, 0x006B);
    P.vec_sub_to_log();
    setp(0x74, 0x006B); setp(0x76, 0x044B); setp(0x78, 0x089F);
    P.mat_times_vec();
    M[0x8A] = M[0x08A7];
    setp(0x74, 0x089F);
    P.project();
    M[0x8B] = 2;
    // a coordinate kept to the window: left of it 0, right of it the size
    const keep = (lo, size, limit) => {
      let x = M[lo], h = M[lo + 1];
      if (h & 0x80) { x = 0; h = 0; } else if (!h && x < M[limit]) M[0x8B]--; else { x = M[size]; h = 0; }
      M[lo] = x; M[lo + 1] = h;
    };
    keep(0x51, 0x41, 0x43);
    keep(0x53, 0x42, 0x44);
    P.set_colour({ x: 0 });
    M[0x48] = 0; M[0x4A] = 0;
    if ((M[0x8A] & 0x80) && !M[0x8B]) {
      M[0x47] = 0; P.arrow_right();
      M[0x47] = M[0x41]; P.arrow_left();
      M[0x4B] = 0; M[0x4C] = 0; P.arrow_up();
      M[0x4B] = M[0x42]; return P.arrow_down();
    }
    M[0x47] = 5; P.arrow_left();
    M[0x47] = (M[0x41] - 5) & 255; P.arrow_right();
    M[0x4B] = 3; M[0x4C] = 0; P.arrow_down();
    M[0x4B] = (M[0x42] - 3) & 255;
    return P.arrow_up();
  };
  const nextRow = () => { M[0x4B] = (M[0x4B] + 1) & 255; if (!M[0x4B]) M[0x4C] = (M[0x4C] + 1) & 255; };
  const prevRow = () => { if (!M[0x4B]) M[0x4C] = (M[0x4C] - 1) & 255; M[0x4B] = (M[0x4B] - 1) & 255; };
  // a sideways arrowhead 9 rows high, its middle on the target's row: x at $47 (and $49), the
  // end that moves (a) stepping by d four times and back
  const sideways = (a, d) => {
    const row = (M[0x53] | M[0x54] << 8) - 4;
    M[0x4B] = row & 255; M[0x4C] = (row >> 8) & 255;
    M[0x49] = M[0x47]; M[0x4A] = M[0x48];
    P.span_clipped();
    for (let k = 0; k < 8; k++) {
      nextRow();
      M[a] = (M[a] + (k < 4 ? d : -d)) & 255;
      P.span_clipped();
    }
    return {};
  };
  P.arrow_right = () => sideways(0x49, 1);
  P.arrow_left = () => sideways(0x47, -1);
  // an upright arrowhead on the target's x, 8 pixels wide narrowing over four rows from $4B
  const upright = row => {
    const x = M[0x51] & 0xFE;
    let v = ((x | M[0x52] << 8) - 3) & 0xFFFF;
    M[0x47] = v & 255; M[0x48] = v >> 8;
    v = ((x | M[0x52] << 8) + 4) & 0xFFFF;
    M[0x49] = v & 255; M[0x4A] = v >> 8;
    P.span_clipped();
    for (let k = 0; k < 3; k++) {
      row();
      M[0x47] = (M[0x47] + 1) & 255; if (!M[0x47]) M[0x48] = (M[0x48] + 1) & 255;
      if (!M[0x49]) M[0x4A] = (M[0x4A] - 1) & 255; M[0x49] = (M[0x49] - 1) & 255;
      P.span_clipped();
    }
    return {};
  };
  P.arrow_up = () => upright(nextRow);
  P.arrow_down = () => upright(prevRow);

  // ---- contact
  // Every solid ship 5..0 against every other solid object 19..0: within the sum of their radii
  // on every axis is a contact. Each ship's contact cooldown ($040F) counts down.
  P.check_collisions = function* () {
    M[0x0837] = 0xFF;
    let x = 5;
    M[0xC6] = x;
    for (;;) {
      if (M[0x0635 + x]) {
        const t = (M[0x060D + x] << 1) & 255;
        M[0xC8] = M[0x0A1D + t]; M[0xC9] = M[0x0A1E + t];
        let b = 0x13;
        M[0xC7] = b;
        do {
          if (M[0x0635 + b] && b !== M[0xC6]) {
            const u = (M[0x060D + b] << 1) & 255;
            const s = M[0xC8] + M[0x0A1D + u];
            M[0x60] = s & 255; M[0x61] = (M[0xC9] + M[0x0A1E + u] + (s >> 8)) & 255;
            P.slot_pos_ptr({ y: M[0xC6] });
            setp(0x76, pos(b));
            if (P.within_range().c) yield* P.on_contact();
          }
          M[0xC7] = (M[0xC7] - 1) & 255;
          b = M[0xC7];
        } while (!(b & 0x80));
      }
      x = M[0xC6];
      if (M[0x040F + x]) M[0x040F + x]--;
      x = (x - 1) & 255;
      M[0xC6] = x;
      if (x & 0x80) return { x };
    }
  };
  // Slot $C6 (a ship) touches slot $C7. From an outside view, touching a base goes back to the
  // cockpit. The player touching a dockable object (flag bit 7, not a missile), or being touched
  // by one, only marks it in $0837 for the docking test after it is drawn; anything else collides.
  P.on_contact = function* () {
    if (M[0x0D3C]) {
      if (flags(M[0xC7]) & 1) { M[0x0D3C] = 0; return yield* P.set_view(); }
    } else {
      const other = !M[0xC6] ? M[0xC7] : !M[0xC7] ? M[0xC6] : -1;
      if (other >= 0) {
        const f = flags(other);
        if ((f & 0x80) && !(f & 0x20)) { M[0x0837] = other; return { a: 0 }; }
      }
    }
    return yield* P.collide({ x: M[0xC6], y: M[0xC7] });
  };
  // Slot X and slot Y collide ($B2/$B3, their types $B8/$B9, $0835 the type that did it): a shard,
  // the gate for the player, a missile, a hazard, or two objects ramming
  P.collide = function* (r) {
    M[0xB2] = r.x; M[0xB8] = M[0x060D + r.x];
    M[0xB3] = r.y; M[0xB9] = M[0x060D + r.y];
    M[0x0835] = M[0xB9];
    if (M[0xB9] === 0x1B) return yield* P.hit_shard();
    if (M[0xB9] === 0x14 && !r.x) return yield* P.gate_contact();
    const fx = M[0x08D5 + M[0xB8]], fy = M[0x08D5 + M[0xB9]];
    if ((fx | fy) & 0x20) return yield* P.missile_hit({ x: M[0xB8], y: M[0xB9] });
    if (fy & 0x40) return yield* P.hazard_hit();
    return yield* P.ram();
  };
  // A shard (type $1B) explodes against the first object, and a new one starts at the origin
  P.hit_shard = function* () {
    yield* P.blow_up({ a: M[0x0AEF + M[0xB9]], x: M[0xB3], y: M[0xB2] });
    setp(0x74, 0x0DC3);
    return P.create_object({ x: 0x1B });
  };
  // Two objects ram: unless either ship touched something in the last two passes, the window
  // flashes for the player, each takes damage from the speed between them (the second only when
  // it is a ship), and they bounce apart
  P.ram = function* () {
    if (P.contact_cooldown({ x: M[0xB2] }).drop) return {};
    if (P.contact_cooldown({ x: M[0xB3] }).drop) return {};
    if (!M[0xB2] || !M[0xB3]) {
      P.set_colour({ x: M[0x8C] });
      P.fill_window();
      P.sound_play({ a: 9 });
    }
    setp(0x74, vel(M[0xB2])); setp(0x76, vel(M[0xB3])); setp(0x78, 0x00BA);
    P.vec_sub_to_log();
    setp(0x74, 0x00BA);
    P.vec_length();
    M[0x60] = (M[0x60] + 3) & 255;
    P.log_to_lin();
    M[0xB7] = M[0x60];
    M[0x80] = M[0xB7];
    yield* P.damage({ a: 0, x: M[0xB3], y: M[0xB2] });
    M[0x80] = M[0xB7];
    if (M[0xB3] < 6) yield* P.damage({ a: 0, x: M[0xB2], y: M[0xB3] });
    setp(0x7A, 0x00BA);
    return P.bounce({ x: M[0xB2], y: M[0xB3] });
  };
  // The player touches a Malir gate: flying into it (its nose against the gate's axis at $0DBA,
  // the dot product's log below $FFAE) at a speed of 20 or more is the jump
  P.gate_contact = function* () {
    setp(0x74, 0x045D); setp(0x76, 0x0DBA);
    P.vec_dot();
    if (!neg(0xAE, 0xFF, M[0x5F], M[0x60])) return {};
    if (P.speed_of({ y: 0 }).a < 0x14) return {};
    return yield* P.gate_jump();
  };
  // A missile is in the collision (types X and Y): it is made the first object. It does not hit
  // the ship that launched it; against anything but a ship, or a ship it is not aimed at, it
  // turns into an explosion (type $22); otherwise it blows up against the ship.
  P.missile_hit = function* (r) {
    if (!(M[0x08D5 + r.x] & 0x20)) {
      M[0xB9] = r.x; M[0xB8] = r.y;
      const t = M[0xB2]; M[0xB2] = M[0xB3]; M[0xB3] = t;
    } else M[0x0835] = r.x;
    const y = M[0xB2], x = M[0xB3];
    if (x < 6) {
      if (x === M[0x0433 + y]) return { a: x, x, y };
      const t = M[0x0445 + y];
      if ((t & 0x80) || t === M[0xB3]) return yield* P.blow_up({ a: M[0x0AEF + M[0xB8]], x: M[0xB2], y: M[0xB3] });
    }
    P.free_slot({ y });
    P.slot_pos_ptr({ y });
    return P.create_object({ x: 0x22 });
  };
  // The second object is a hazard (flag bit 6): the first takes its damage whole; a type $1A one
  // starts again at the origin
  P.hazard_hit = function* () {
    if (!M[0xB2]) P.sound_play({ a: 0x0B });
    M[0x80] = M[0x0AEF + M[0xB9]];
    yield* P.damage({ a: 0xFF, x: 0xFF, y: M[0xB2] });
    if (M[0xB9] !== 0x1A) return {};
    P.free_slot({ y: M[0xB3] });
    setp(0x74, 0x0DC3);
    return P.create_object({ x: 0x1A });
  };
  // Ship X's contact cooldown set to 2; when it was running already, the game's code drops its
  // caller's return (the ram ends there): drop says so
  P.contact_cooldown = function (r) {
    const x = r.x;
    if (x >= 6) return { x, c: 1 };
    const y = M[0x040F + x];
    M[0x040F + x] = 2;
    return y ? { drop: true, a: y, x, y } : { a: 0, x, y };
  };
  // Slots X and Y separated after a ram: each backed off a step and, a computer ship, given a
  // random turn; then against a fixed object the first's velocity is reversed, and between two
  // moving ones the velocities are exchanged by their radii, as masses
  P.bounce = function (r) {
    M[0x94] = r.x; M[0x95] = r.y;
    P.back_off({ y: M[0x95] });
    P.jolt_turn({ y: M[0x95] });
    P.back_off({ y: M[0x94] });
    P.jolt_turn({ y: M[0x94] });
    const x = M[0x060D + M[0x95]];
    if (!(M[0x08D5 + x] & 0x10)) return P.reverse_velocity({ y: M[0x94] });
    let t = (x << 1) & 255;
    M[0x96] = M[0x0A1D + t]; M[0x97] = M[0x0A1E + t];
    t = (M[0x060D + M[0x94]] << 1) & 255;
    M[0x98] = M[0x0A1D + t]; M[0x99] = M[0x0A1E + t];
    const s = M[0x96] + M[0x98];
    M[0x9A] = s & 255; M[0x9B] = (M[0x97] + M[0x99] + (s >> 8)) & 255;
    const d = M[0x98] - M[0x96];
    M[0x9D] = d & 255; M[0x9E] = (M[0x99] - M[0x97] - (d < 0 ? 1 : 0)) & 255;
    M[0x60] = M[0x9A]; M[0x61] = M[0x9B];
    P.int16_to_log({});
    M[0x9A] = M[0x5F]; M[0x9B] = M[0x60]; M[0x9C] = M[0x61];
    setp(0x76, vel(M[0x95]));
    M[0x60] = M[0x9D]; M[0x61] = M[0x9E];
    P.int16_to_log({});
    const l = M[0x5F] - M[0x9A];
    M[0x5F] = l & 255; M[0x60] = (M[0x60] - M[0x9B] - (l < 0 ? 1 : 0)) & 255;
    M[0x61] ^= M[0x9C];
    P.s_6DD1({ y: M[0x94] });
    M[0x60] = M[0x98]; M[0x61] = M[0x99];
    P.uint16_to_log({});
    M[0x60] = (M[0x60] + 1) & 255;
    const l2 = M[0x5F] - M[0x9A];
    M[0x5F] = l2 & 255; M[0x60] = (M[0x60] - M[0x9B] - (l2 < 0 ? 1 : 0)) & 255;
    M[0x61] = 0;
    return P.s_6DD1({ y: M[0x95] });
  };
  // Slot Y's velocity: the velocity at ($76) plus the vector at ($7A) times $5F-$61
  P.s_6DD1 = function (r) {
    M[0x9F] = r.y;
    setp(0x78, 0x006B); M[0x74] = M[0x7A]; M[0x75] = M[0x7B];
    P.vec_scale_signed();
    setp(0x74, 0x006B);
    P.vec_log_to_lin();
    setp(0x78, vel(M[0x9F]));
    return P.vec_add_lin();
  };
  P.reverse_velocity = function (r) {
    setp(0x74, vel(r.y)); setp(0x78, vel(r.y));
    return P.vec_neg_lin();
  };
  // Slot Y moved back a step: its position less its velocity
  P.back_off = function (r) {
    P.slot_pos_ptr({ y: r.y });
    M[0x78] = M[0x74]; M[0x79] = M[0x75];
    setp(0x76, vel(r.y));
    return P.vec_sub_lin();
  };
  P.jolt_turn = function (r) {
    const y = r.y;
    if (y >= 6 || !y) return { y };
    M[0xA0] = y;
    const a = P.random().a;
    M[0x0516 + M[0xA0]] = a;
    return { a, y: M[0xA0] };
  };
  // Slot X (a missile or a shard) blows up against slot Y, which takes damage A: the player's
  // window flashes and the ship is jolted; an explosion (type $17) where X was; X freed
  P.blow_up = function* (r) {
    M[0xAA] = r.a; M[0xA8] = r.x; M[0xA9] = r.y;
    if (!r.y) {
      P.set_colour({ x: 0x12 });
      P.fill_window();
      P.jolt_player();
      P.sound_play({ a: 5 });
    } else P.sound_play({ a: 6 });
    P.slot_pos_ptr({ y: M[0xA8] });
    P.create_object({ x: 0x17 });
    M[0x80] = M[0xAA];
    const x = M[0xA8];
    yield* P.damage({ a: M[0x060D + x] === 0x0B ? 1 : 0, x, y: M[0xA9] });
    return P.free_slot({ y: M[0xA8] });
  };
  P.jolt_player = function () {
    M[0x0545] = P.random().a;
    M[0x0548] = P.random().a;
    M[0x054B] = P.random().a;
    return { a: M[0x054B] };
  };
  // Slot Y takes damage $80 from slot X ($FF none). A: 0, the shields count; 1, one step less;
  // $FF, not at all. Slot 6 and up only notes the player shooting a base. A missile hit is gone.
  // The attacker is remembered; the shields take their part; a hard hit sets a computer ship
  // turning and may knock out a system; then the armour, and below zero the ship is destroyed.
  P.damage = function* (r) {
    M[0x9E] = r.x; M[0x9F] = r.y; M[0xA0] = r.a;
    M[0xA1] = M[0x80];
    if (!M[0xA1]) return {};
    const y = r.y;
    if (y >= 6) {
      if (!r.x && (flags(y) & 1)) M[0x0783] = 1;
      return {};
    }
    M[0xA2] = M[0x060D + y];
    if (M[0x0403 + y]) return P.free_slot({ y });
    const x = M[0x9E];
    if (x < 6 && x !== M[0x0445 + y]) {
      let who = -1;
      if (!x) who = 0;
      else if (M[0x0403 + x] && !(M[0x0433 + x] & 0x80)) who = M[0x0433 + x];
      else if (M[0x0445 + x] === M[0x9F]) who = x;
      if (who >= 0) M[0x0439 + M[0x9F]] = who;
    }
    const s = P.shield_reduce();
    if (!s.a) return {};
    if (M[0x9F] && P.random_upto({ a: s.a }).a >= 6) P.random_rates({ x: M[0x9F] });
    if (M[0xA1] >= 0x0A && !P.random_upto({ a: 4 }).a) {
      P.random_system();
      if (M[0xA4] === 2 || M[0xA4] === 1) P.random_system();
      const v = M[0x9F];
      if (!(M[0x0409 + v] & M[0xA4])) {
        M[0x0409 + v] |= M[0xA4];
        if (v) return { a: v };
        if (!(M[0x0C45] & M[0xA4])) return { a: 0 };
        P.select_window({ y: 0 });
        const k = (M[0xA3] << 1) & 255;
        return yield* P.print_message({ x: M[0x6FD9 + k], a: M[0x6FDA + k] });
      }
    }
    const v = M[0x9F], w = (v << 1) & 255;
    const left = M[0x051D + w] - M[0xA1];
    M[0x051D + w] = left & 255;
    if (left < 0) M[0x051E + w] = (M[0x051E + w] - 1) & 255;
    if (!(M[0x051E + w] & 0x80)) return { a: M[0x051E + w] };
    const k = M[0x9E];
    const a = !(k & 0x80) && (flags(k) & 0x20) ? M[0x0433 + k] : k;
    return yield* P.destroy_object({ a, y: M[0x9F] });
  };
  // The damage $A1 after the shields: the fore shield when the attacker is in front of the
  // victim (the dot product of bearing positive), the aft one behind, unless that shield is out;
  // the type's strength ($0C6C, a nybble each) halves the damage that many times, one less for A = 1
  P.shield_reduce = function () {
    if (!(M[0xA0] & 0x80)) {
      const b = P.bearing({ x: M[0x9E], y: M[0x9F] });
      const behind = M[0x61] & 1;
      M[0x61] = (M[0x61] >> 1) | (b.c ? 0x80 : 0);
      M[0xA5] = M[0x0C6C + M[0xA2]];
      const d = M[0x0409 + M[0x9F]];
      let n = -1;
      if (!behind) { if (!(d & 0x10)) n = M[0xA5] >> 4; } else if (!(d & 0x08)) n = M[0xA5] & 0x0F;
      if (n > 0) for (let k = M[0xA0] ? n - 1 : n; k > 0; k--) M[0xA1] >>= 1;
    }
    return { a: M[0xA1], z: M[0xA1] ? 0 : 1 };
  };
  // A random system, 0-5, in $A3 and its bit in $A4
  P.random_system = function () {
    const a = P.random_upto({ a: 5 }).a;
    M[0xA3] = a; M[0xA4] = 1 << a;
    return { a: M[0xA4], x: 0xFF, c: 0 };
  };

  // ---- docking, the gate and the wormhole
  // The first face group of the model just drawn whose faces all point at the viewer ($FA36 n
  // negative), in Y; $FF when there is none
  P.facing_face = function () {
    M[0x80] = 0; M[0x81] = 0;
    for (;;) {
      const size = at(0xBC, M[0x81]);
      M[0x82] = size;
      if (!size) return { y: 0xFF, n: 1, z: 0 };
      M[0x83] = size;
      let y = M[0x80], all = true;
      do {
        if (!(M[0xFA36 + at(0xBA, y)] & 0x80)) { all = false; break; }
        y = (y + 1) & 255;
        M[0x82] = (M[0x82] - 1) & 255;
      } while (M[0x82]);
      if (all) break;
      M[0x80] = (M[0x80] + M[0x83]) & 255;
      M[0x81] = (M[0x81] + 1) & 255;
      if (M[0x81] & 0x80) break;
    }
    const y = M[0x81];
    return { y, n: y >> 7, z: y ? 0 : 1 };
  };
  // Docks: in the Manchi system (9) the game is won. Otherwise the base's overlay runs the
  // visit, and the ship leaves backed off and turned about, at speed 1 (4 at a base whose map
  // entry is $10), with a cooldown of 8.
  P.dock = function* () {
    if (M[0x071D] === 9) return P.load_won();
    P.reset_models();
    P.set_colour({ x: 1 });
    P.view_clear_c000();
    P.show_bank3();
    M[0x1E] = 0;
    P.load_seg1();
    yield* P.station_run();
    M[0x7132] = 0; M[0x7133] = 0;
    if (M[0x5610] === 0x10) { M[0x7132] = 0; M[0x7133] = 2; }
    P.load_slot_models();
    P.load_seg0();
    M[0x0415] = 0;
    P.back_off({ y: 0 });
    P.back_off({ y: 0 });
    setp(0x74, 0x0545); setp(0x78, 0x006B);
    P.vec_lin_to_log();
    setp(0x74, 0x006B);
    P.vec_normalise();
    M[0x5F] = M[0x7132]; M[0x60] = M[0x7133];
    P.vec_scale();
    setp(0x78, 0x0545);
    P.vec_log_to_lin();
    P.back_off({ y: 0 });
    P.reverse_velocity({ y: 0 });
    M[0x040F] = 8;
    M[0x1E] = 0xFF;
    return yield* P.back_to_cockpit();
  };
  // The Malir gate: 256 passes of the jump at speed 127, then everything but the player cleared,
  // the gate's destination looked up in the system map, and the wormhole flown until the ship
  // strays from the rings; with enough rings passed the ship comes out at the destination
  P.gate_jump = function* () {
    M[0x0837] = 0xFF; M[0x072C] = 0xFF;
    M[0x0415] = 0x7F;
    M[0x0C05] = (M[0x0C05] + 1) & 255;
    M[0x5E] = 0;
    do {
      yield { cp: 0x7148 };
      P.apply_thrust();
      P.move_objects();
      if (!P.frame_skip3().c) {
        P.update_camera();
        P.place_particles();
        yield* P.draw_frame();
        P.show_frame();
      }
      M[0x5E] = (M[0x5E] + 1) & 255;
    } while (M[0x5E]);
    P.show_bank3();
    P.load_system_map();
    let y = 0x1F;
    for (; y >= 0; y--) if (M[0x5590 + y] === 0x14 && M[0x5510 + y] === M[0x071E] && M[0x5530 + y] === M[0x071F]) break;
    const x = M[0x55B0 + (y & 255)];
    M[0x72BD] = M[0x5630 + x]; M[0x72BE] = M[0x5631 + x]; M[0x72BF] = M[0x5632 + x]; M[0x72C0] = M[0x5633 + x];
    P.copy_to_bank1();
    yield* P.print_message({ x: 0x1D, a: 0xCF });
    for (let s = 0x13; s; s--) P.free_slot({ y: s });
    P.reset_models();
    P.clear_tac();
    setp(0x78, 0x044B);
    P.copy_identity();
    M[0x0415] = 5;
    for (let i = 8; i >= 0; i--) { M[0x0545 + i] = 0; M[0x065D + i] = 0; }
    P.make_wormhole();
    M[0x0838] = 1;
    do {
      yield { cp: 0x71DD };
      P.apply_thrust();
      P.turn_objects();
      P.move_objects();
      if (!P.frame_skip5().c) {
        P.update_camera();
        yield* P.draw_frame();
        P.flip_buffers();
      }
      M[0x5E] = (M[0x5E] + 1) & 255;
      yield { cp: 0x71F6 };
      yield* P.do_key();
      yield* P.wormhole_step();
    } while (P.wormhole_rings().c);
    P.show_bank3();
    P.mirror_text_off();
    M[0x3A] = 0;
    if (M[0x74A2] < M[0x72C0]) {
      yield* P.print_message({ x: 0x1C, a: 0xCF });
      P.load_system_map();
    } else {
      M[0x071D] = M[0x72BD]; M[0x071E] = M[0x72BE]; M[0x071F] = M[0x72BF];
      P.load_system_map();
      yield* P.print_message({ x: 0x1B, a: 0xCF });
      yield* P.print_text({ x: 0x05, y: 0x55 });
    }
    M[0x0D04] = 0xFF; M[0x0D05] = 0xFF; M[0x0D06] = 0xFF;
    P.load_nav_tiles();
    P.encounter_roll({ a: 0x10 });
    P.enter_sector();
    M[0x0838] = 0;
    M[0x0C05] = (M[0x0C05] - 1) & 255;
    P.mirror_text_on();
    return P.copy_to_bank1();
  };
  P.CHECKPOINTS.push(0x7148, 0x71DD, 0x71F6);
  // The buffer just drawn shown, and the other drawn on next
  P.show_frame = function () {
    if (M[0x3A]) P.show_bank1(); else P.show_bank3();
    return P.flip_draw_buffer();
  };
  // Each wormhole pass: the ship a quarter unit on along -z; every 8th pass, without the null
  // damper, the hull loses a point (none left: destroyed, type $1A the killer) and the speed and
  // armour are redrawn
  P.wormhole_step = function* () {
    const v = M[0x0663] - 0x40;
    M[0x0663] = v & 255;
    if (v < 0) dec16(0x0664, 1);
    if (M[0x5E] & 7) return {};
    if (!M[0x0741]) {
      dec16(0x051D, 1);
      if (M[0x051E] & 0x80) { M[0x0835] = 0x1A; return P.player_destroyed(); }
    }
    P.window_full();
    yield* P.draw_speed();
    P.draw_armour_bar();
    return P.window_view();
  };
  // Carry set while the trip goes on. When the ship reaches the next ring's place, the ring
  // nearest behind it ($95) must be within reach (or the trip ends); it is freed (counted when it
  // is a type $21), and while more are needed a new ring is made 14 units beyond the farthest
  // ahead ($94), moved by the bend
  P.wormhole_rings = function () {
    if (neg(M[0x749C], M[0x749D], M[0x0664], M[0x0665])) return { c: 1 };
    dec16(0x749C, 0x0E);
    const z = M[0x0664] | M[0x0665] << 8;
    let t = (z - 0xE0) & 0xFFFF;
    M[0x98] = t & 255; M[0x99] = t >> 8;
    t = (z + 0xE0) & 0xFFFF;
    M[0x96] = t & 255; M[0x97] = t >> 8;
    for (let y = 0x13; y >= 6; y--) {
      if (!M[0x05F9 + y]) continue;
      const x = nine(y), zl = M[0x0664 + x], zh = M[0x0665 + x];
      if (neg(M[0x98], M[0x99], zl, zh)) { M[0x95] = y; M[0x98] = zl; M[0x99] = zh; }
      if (neg(zl, zh, M[0x96], M[0x97])) { M[0x94] = y; M[0x96] = zl; M[0x97] = zh; }
    }
    P.slot_pos_ptr({ y: 0 });
    setp(0x76, pos(M[0x95]));
    M[0x60] = M[0x0A5B]; M[0x61] = M[0x0A5C];
    if (!P.within_range().c) return { c: 0 };
    const y = M[0x95];
    if (M[0x060D + y] === 0x21) M[0x74A2] = (M[0x74A2] + 1) & 255;
    P.free_slot({ y });
    if (((M[0x74A2] + 1) & 255) >= M[0x72C0]) return { c: 1 };
    M[0x749B] = (M[0x749B] + 1) & 255;
    M[0x749E] = (M[0x749E] - 1) & 255;
    if (M[0x749E] & 0x80) {
      const a = P.random_upto({ a: 0x13 }).a;
      M[0x749E] = a; M[0x749F] = a >> 1;
      M[0x74A1] = P.random_upto({ a: 7 }).a;
      M[0x74A0] = 0;
    }
    P.slot_pos_ptr({ y: M[0x94] });
    setp(0x78, 0x006B);
    P.copy9();
    dec16(0x72, 0x0E);
    P.ring_drift({ y: 1 });
    P.ring_drift({ y: 4 });
    M[0x749F] = (M[0x749F] - 1) & 255;
    if (M[0x749F] & 0x80) {
      M[0x74A0] = (M[0x74A0] - 2) & 255;
      if (M[0x74A0] & 0x80) M[0x74A0] = (M[0x74A0] + 2) & 255;
    } else M[0x74A0] = (M[0x74A0] + 2) & 255;
    setp(0x74, 0x006B);
    P.create_object({ x: P.ring_type().x });
    return { c: 1 };
  };
  // The bend ($74A0) added to the new ring's x (Y = 1) or y (Y = 4), with the direction's sign
  P.ring_drift = function (r) {
    const y = r.y;
    M[0x9A] = y;
    const x = M[0x74A1];
    const s = y === 1 ? M[0x7493 + x] : M[0x7491 + x];
    let d = s ? M[0x74A0] : 0;
    if (s & 0x80) d = (-d) & 0xFFFF;
    M[0x60] = d & 255; M[0x61] = d >> 8;
    const t = M[0x6B + y] + M[0x60];
    M[0x6B + y] = t & 255;
    M[0x6C + y] = (M[0x6C + y] + M[0x61] + (t >> 8)) & 255;
    return { a: M[0x6C + y], x, y };
  };
  // The first eight rings, 14 units apart along -z from the origin
  P.make_wormhole = function () {
    setp(0x74, 0x0DC3); setp(0x78, 0x006B);
    P.copy9();
    M[0x749B] = 7;
    do {
      dec16(0x72, 0x0E);
      setp(0x74, 0x006B);
      P.create_object({ x: P.ring_type().x });
      M[0x749B] = (M[0x749B] - 1) & 255;
    } while (!(M[0x749B] & 0x80));
    M[0x749B] = (M[0x749B] + 1) & 255;
    const v = M[0x0664] - 0x0E;
    M[0x749C] = v & 255; M[0x749D] = (M[0x0665] - (v < 0 ? 1 : 0)) & 255;
    M[0x74A2] = 0;
    return { a: 0 };
  };
  // Ring $749B's type: $1F odd, $20 two more than a multiple of 4, $21 (they count) a multiple
  P.ring_type = function () {
    const n = M[0x749B];
    return { x: n & 1 ? 0x1F : n & 2 ? 0x20 : 0x21 };
  };

  // ---- a sector's objects. The 21 bytes at $C6 hold a type for each slot to fill, $FF for none:
  // the list for the sector's kind from $DA down, up to three of the map's entries in the sector at
  // $C9-$C7 (a base's file noted for docking), and the encounter's ships at $CA-$CC.
  P.enter_sector = function (r) {
    M[0x040F] = 0x40;
    M[0x0782] = 0; M[0x0832] = 0; M[0x0833] = 0; M[0x0834] = 0;
    for (let y = 0x14; y >= 0; y--) M[0xC6 + y] = 0xFF;
    for (let y = 0x13; y; y--) P.free_slot({ y });
    P.reset_models();
    const k = P.sector_kind({ x: M[0x071E], y: M[0x071F] }).a >> 3;
    M[0x74] = M[0x16C9 + k]; M[0x75] = M[0x16CA + k];
    // (count, type) pairs to a zero count
    let y = 0xFF, x = 0x14;
    for (;;) {
      y = (y + 1) & 255;
      M[0xBC] = at(0x74, y);
      if (!M[0xBC]) break;
      y = (y + 1) & 255;
      const t = at(0x74, y);
      do { M[(0xC6 + x) & 255] = t; x = (x - 1) & 255; M[0xBC] = (M[0xBC] - 1) & 255; } while (M[0xBC]);
    }
    // the map's entries, but the ship's own (0), those off the map and those of type $64 and up,
    // which are counted
    const e = P.sector_entries({ x: M[0x071E], y: M[0x071F] });
    y = (e.y - 1) & 255;
    for (x = 2; !(y & 0x80); y = (y - 1) & 255) {
      const n = at(0x74, y);
      if (!n) continue;
      M[0xBD] = y;
      const t = M[0x5590 + n];
      if (!(t & 0x80)) {
        if (t >= 0x64) P.count_special_entry();
        else {
          M[(0xC7 + x) & 255] = t;
          if (M[0x5550 + n] & 0x80) P.base_file_from_map({ y: n });
          x = (x - 1) & 255;
          if (x & 0x80) break;
        }
      }
      y = M[0xBD];
    }
    M[0xCA] = M[0x0D06]; M[0xCB] = M[0x0D05]; M[0xCC] = M[0x0D04];
    // each a slot, somewhere near the origin; with ships near, those of the encounter's first
    // type have the player as their target
    for (M[0x1722] = 0x14; !(M[0x1722] & 0x80); M[0x1722] = (M[0x1722] - 1) & 255) {
      if (M[0xC6 + M[0x1722]] & 0x80) continue;
      P.place_object({ x: M[0xC6 + M[0x1722]] });
      const o = P.create_object({ x: M[0xC6 + M[0x1722]] });
      if (o.n || !M[0x0D07]) continue;
      if (M[0x060D + o.y] === M[0x0D04]) M[0x0445 + o.y] = 0;
    }
    M[0x0415] = 5;
    for (let i = 8; i >= 0; i--) M[0x0545 + i] = 0;
    return { a: 0, y: 0xFF };
  };
  P.count_special_entry = function (r) { M[0x0782] = (M[0x0782] + 1) & 255; return r; };
  // ($74) a random place for an object of type X, within eight times its radius of the origin
  // in every axis: the position at $065D (slot 0's, but its whole parts are all that count, and
  // the player sits at the origin) offset into $6B
  P.place_object = function (r) {
    const x = (r.x << 1) & 255;
    const w = ((M[0x0A1D + x] | M[0x0A1E + x] << 8) << 3) & 0xFFFF;
    M[0x60] = w & 255; M[0x61] = w >> 8;
    setp(0x74, 0x065D); setp(0x78, 0x006B);
    const o = P.random_offset();
    M[0x74] = M[0x78]; M[0x75] = M[0x79];
    return { a: M[0x79], y: o.y };
  };
  // A base's map file, three letters such as "L00", from the system map's names at $5620
  P.base_file_from_map = function (r) {
    const y = M[0x55B0 + r.y];
    M[0x0778] = M[0x5620 + y]; M[0x0779] = M[0x5621 + y]; M[0x077A] = M[0x5622 + y];
    return { a: M[0x077A], x: r.x, y };
  };
  // A new game's player: type 0 in slot 0 at the origin, faction 4; then the ship's stats
  P.start_game_objects = function () {
    setp(0x74, 0x0DC3);
    P.create_in_slot({ x: 0, y: 0 });
    M[0x0433] = 4;
    return P.copy_ship_stats();
  };
  // The player's ship described as type 0: its armour, ECM, systems, beam and shields from
  // $0735-$073A, and its rank plus 2
  P.copy_ship_stats = function (r) {
    M[0x0AA9] = M[0x0735]; M[0x0AAA] = M[0x0736]; M[0x0C2B] = M[0x0737];
    M[0x0C45] = M[0x0738]; M[0x0C52] = M[0x0739]; M[0x0C6C] = M[0x073A];
    M[0x0C79] = (M[0x072A] + 2) & 255;
    return R(r, { a: M[0x0C79] });
  };

  // ---- the loads of flight
  const load = (x, to) => { M[0x80] = 0; M[0x81] = to; return P.load_file({ x, y: 0x07 }); };
  P.load_end = function () { M[0x1E] = 0; return load(0xF9, 0xE9); };
  P.load_seg0 = () => load(0xE9, 0xA5);
  P.load_seg1 = function () { load(0xEE, 0xA5); return load(0xF3, 0xE4); };
  // The ending: WON from the first side to $6800, entered there
  P.load_won = function () {
    M[0x1E] = 0;
    P.prompt_boot_disk();
    load(0xDC, 0x68);
    P.swap_kernal_zp();
    throw new P.Goto(0x6800);
  };
  // CTRL-S: "Save game? (Y/N)". Y saves $0403-$0801 as SAVED on the BOOT disk, after loading SPB
  // as a check that the disk is in, and puts the cockpit back; any other key scrolls the question
  // away. The wait reads a key and then ends at the return from the game's own read ($1560): a
  // turn is 40 cycles.
  P.key_save = function* () {
    P.select_window({ y: 0 });
    yield* P.print_message({ x: 0x9B, a: 0xCF });
    P.get_key();
    let k;
    for (;;) {
      k = P.get_key();
      yield { cp: 0x1560, cycles: 40 };
      if (k.c) break;
    }
    if (k.a !== 0x59) return yield* P.scroll_window({ a: 1 });
    P.view_clear_c000();
    P.show_bank3();
    P.prompt_boot_disk();
    M[0x80] = 0; M[0x81] = 0x40;
    P.load_file({ x: 0xCC, y: 0x07 });
    M[0x80] = 0x03; M[0x81] = 0x04; M[0x82] = 0x02; M[0x83] = 0x08;
    P.save_file({ x: 0xE0, y: 0x07 });
    P.prompt_data_disk();
    return P.restore_after_disk();
  };
  P.CHECKPOINTS.push(0x1560);
  P.restore_after_disk = function () {
    P.load_picture({ a: 0 });
    P.copy_to_bank1();
    return P.select_window({ y: 0 });
  };
  // Picture A (0 PIT.PAC, the cockpit; 1 NAV.PAC; 2 LAND.PAC; 3 H.PAC) loaded to $4000 and
  // unpacked to the bitmap at $C000
  P.load_picture = function (r) {
    const y = (r.a << 1) & 255;
    M[0x80] = 0; M[0x81] = 0x40;
    P.load_file({ x: M[0x1C15 + y], y: M[0x1C16 + y] });
    setp(0x74, 0x4000); setp(0x78, 0xC000);
    return P.unpack_picture();
  };
  // A picture from ($74) to ($78): the screen matrix after the bitmap ($2000 on) cleared and the
  // border black, then records to a zero: n (1-127) and a byte, n of the byte; $80 + n and n
  // bytes as they are ($80 alone is 256 of them, after which neither pointer moves on). The byte
  // after the zero is the border's colour.
  P.unpack_picture = function () {
    M[0x80] = M[0x74]; M[0x81] = M[0x75]; M[0x82] = M[0x78];
    const hi = M[0x79], scr = M[0x82] | ((hi + 0x20) & 255) << 8;
    for (let i = 0; i < 0x400; i++) M[(scr + i) & 0xFFFF] = 0;
    P.set_border({ a: 0 });
    M[0x83] = hi;
    for (;;) {
      const src = ptr(0x80), dst = ptr(0x82), h = M[src];
      if (!h) return P.set_border({ a: M[(src + 1) & 0xFFFF] });
      if (h & 0x80) {
        const n = h & 0x7F, from = (src + 1) & 0xFFFF;
        for (let i = 0; i < (n || 256); i++) M[(dst + i) & 0xFFFF] = M[(from + i) & 0xFFFF];
        setp(0x80, from + n); setp(0x82, dst + n);
      } else {
        const v = M[(src + 1) & 0xFFFF];
        for (let i = 0; i < h; i++) M[(dst + i) & 0xFFFF] = v;
        setp(0x80, src + 2); setp(0x82, dst + h);
      }
    }
  };
  P.set_border = function (r) {
    P.bank_io_in();
    io.vicWrite(0x20, r.a);
    return P.bank_all_ram();
  };
  // ---- the models. Each object type with a model ($093E, a number below $80) draws through the
  // model's address ($08F8, twice the type), loaded from the disk the first time a slot takes the
  // type: the file named by four bytes at $0961 goes to the next free address on the heap ($1D80,
  // from $E400), its pointers are made absolute, and every type with the same model is given it.
  P.load_model = function (r) {
    const t = r.y;
    M[0x8A] = t;
    const m = M[0x093E + t];
    if (m & 0x80) return R(r, { x: m, c: 0 });
    const t2 = (t << 1) & 255;
    if (M[0x08F9 + t2]) return { a: M[0x08F9 + t2], x: m, y: t2, c: 0 };
    // the name at $0961 + 4 m (the carry of the second shift adds one for a model of 64 or more)
    const a1 = (m << 1) & 255, n = ((a1 << 1) & 255) + 0x61 + (a1 >> 7);
    M[0x80] = M[0x1D80]; M[0x81] = M[0x1D81];
    P.load_file({ x: n & 255, y: 0x09 + (n >> 8) });
    const lo = M[0x1D80], hi = M[0x1D81], b = lo | hi << 8;
    M[0x8B] = lo; M[0x8C] = hi;
    const rd = i => M[(b + i) & 0xFFFF], wr = (i, v) => { M[(b + i) & 0xFFFF] = v & 255; };
    // the model's length (at $2F) gives the next free address
    let s = lo + rd(0x2F);
    M[0x8E] = s & 255; M[0x8F] = (hi + rd(0x30) + (s >> 8)) & 255;
    s = rd(1) + lo; wr(1, s); wr(5, rd(5) + hi + (s >> 8));
    wr(3, 0x7A); wr(7, 0x7B); wr(9, 0x61); wr(10, 0x7C);
    for (let i = 0x11; i < 0x2F; i += 2) { s = rd(i) + lo; wr(i, s); wr(i + 1, rd(i + 1) + hi + (s >> 8)); }
    M[0x8D] = M[0x093E + M[0x8A]];
    let x = 0;
    for (let y = 0x22; y >= 0; y--) {
      if (M[0x093E + y] !== M[0x8D]) continue;
      x = (y << 1) & 255;
      M[0x08F8 + x] = lo; M[0x08F9 + x] = hi;
    }
    M[0x1D80] = M[0x8E]; M[0x1D81] = M[0x8F];
    return { a: M[0x8F], x, y: 0xFF, c: 0 };
  };
  // Every model forgotten, the heap empty
  P.reset_models = function () {
    for (let x = 0x22; x >= 0; x--) if (!(M[0x093E + x] & 0x80)) M[0x08F9 + 2 * x] = 0;
    M[0x1D80] = 0; M[0x1D81] = 0xE4;
    return { a: 0xE4, x: 0xFF, y: 0xFF };
  };
  // The models of the objects in slots 19-1
  P.load_slot_models = function (r) {
    let a = 0, y = r && r.y;
    for (M[0xBD] = 0x13; M[0xBD]; M[0xBD] = (M[0xBD] - 1) & 255) {
      a = M[0x05F9 + M[0xBD]];
      if (a) ({ a, y } = P.load_model({ y: M[0x060D + M[0xBD]] }));
    }
    return { a, x: 0, y };
  };
  P.back_to_cockpit = function* () {
    P.restore_after_disk();
    P.mirror_text_on();
    return yield* P.update_cockpit();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
