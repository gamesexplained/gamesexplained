// The objects: the multiply and the random numbers everything uses; the player's turns and moves;
// each object's heading turned into a velocity and the velocity added to its place; the bearing
// and range of one object from another; the obelisks' collisions, the shots' hits, the enemy's
// fire; the console lamps, the score and the enemy count.
//
// The objects are 32 slots, the fields in tables of 32 at the game's addresses: 0 the player, 1, 4
// and 5 the player's shots, 2 the enemy, 3 the stargate, 6 the radar's probe, 8-23 the enemy's
// shots and the warp's spheres, 24-31 an explosion's fragments.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
G.objects = function (P) {
  const M = P.M, R = P.irqByte;
  const io = P.io;
  // the object tables
  const STATE = 0x83E0, TYPE = 0x8440, OCT = 0x84A0, FINE = 0x84C0, SPEED = 0x17A0;
  const XH = 0x8260, XL = 0x82C0, XF = 0x15C0, ZH = 0x8320, ZL = 0x8380, ZF = 0x15E0;
  const VXH = 0x1600, VXM = 0x1620, VXL = 0x1640, VZH = 0x1660, VZM = 0x1680, VZL = 0x16A0;
  const PXH = 0x16C0, PXL = 0x16E0, PZH = 0x1700, PZL = 0x1720;
  const BEARING = 0x1580, INVALID = 0x15A0;
  P.T = { STATE, TYPE, OCT, FINE, SPEED, XH, XL, XF, ZH, ZL, ZF, VXH, VXM, VXL, VZH, VZM, VZL, PXH, PXL, PZH, PZL, BEARING, INVALID };
  const sid = (r, v) => io.sidWrite(r, v);

  // mul8x8 ($B4C0): A x Y, the high byte in A and the low in Y (and $22). The shifts run the carry
  // it was called with, and $22's old bits, through $21; it leaves the carry $22's old bit 7.
  P.mul8x8 = function (r) { M[0x20] = r.a & 255; return P.mul8x8_y_entry(r); };
  P.mul8x8_y_entry = function (r) {
    const old = M[0x22], p = M[0x20] * (r.y & 255);
    M[0x21] = ((old & 0x7F) << 1 | (r.c & 1)) & 255;
    M[0x22] = p & 255;
    return { a: p >> 8, y: p & 255, c: old >> 7 };
  };

  // random_next ($BC1E): the seed $70 shifted right, bit 0 XOR bit 3 into bit 7; the carry its
  // old bit 0.
  P.random_next = function () {
    const s = M[0x70], v = ((s ^ (s >> 3)) & 1) << 7 | s >> 1;
    M[0x70] = v;
    return { a: v, c: s & 1 };
  };

  // turn_player_right ($B4D8) and turn_player_left ($B4F0): the heading on by $23 (or back by
  // $24), the step then set to the skill's turn rate $25 (the first frame of a turn is 2).
  P.turn_player_right = function () {
    const f = M[FINE] + M[0x23];
    M[FINE] = f & 255;
    M[OCT] = (M[OCT] + (f >> 8)) & 7;
    M[0x23] = M[0x25];
  };
  P.turn_player_left = function () {
    const f = M[FINE] - M[0x24];
    M[FINE] = f & 255;
    M[OCT] = (M[OCT] - (f < 0 ? 1 : 0)) & 7;
    M[0x24] = M[0x25];
  };
  // player_move_forward ($B508), player_move_reverse ($B56C) and player_move_checked ($B50C): a
  // step in direction $2E (0 forward, 4 back, the heading turned round for it), unless the object
  // nearby ($2D, the scan's nearest within a few units) is ahead within range $43: then a bump, the
  // engine's knock on voice 1. One behind, or beside, lets the player creep at speed $20.
  P.player_move_forward = function () { M[0x2E] = 0; return P.player_move_checked(); };
  P.player_move_reverse = function () {
    M[0x2E] = 4;
    M[OCT] ^= 4;
    P.player_move_checked();
    M[OCT] ^= 4;
  };
  P.player_move_checked = function () {
    const y = M[0x2D];
    if (y) {
      const d = M[0x14C0 + y] ^ M[0x2E];
      let fixed = d === 3 || d === 4;
      if (!fixed && (d === 0 || d === 7)) {
        if (M[0x1740 + y] < M[0x43]) {
          // player_blocked_bump
          if (M[0x1C]) return;
          M[0x1C] = 0x2C; P.store(0x1D, 0x2C);
          sid(0x00, 0x14); sid(0x01, 0x14); sid(0x05, 0x0A); sid(0x04, 0x80); sid(0x04, 0x81);
          return;
        }
        fixed = true;
      }
      if (fixed) {
        // player_move_fixed_speed
        M[SPEED] = 0x20;
        M[0x1C] = 0;
        P.compute_object_velocity({ x: 0 });
        P.apply_object_velocity({ x: 0 });
        M[SPEED] = M[0x68];
        return;
      }
    }
    // player_move_free
    M[0x1C] = 0;
    P.compute_object_velocity({ x: 0 });
    P.apply_object_velocity({ x: 0 });
  };

  // advance_all_objects ($B584): objects 31 to 1, each live one moved by its velocity if it has a
  // speed, and its lifetime run down unless it is $FF (for good).
  P.advance_all_objects = function () {
    for (let x = 0x1F; x > 0; x--) {
      if (!M[STATE + x]) continue;
      if (M[SPEED + x]) P.apply_object_velocity({ x });
      if (M[STATE + x] !== 0xFF) M[STATE + x] = (M[STATE + x] - 1) & 255;
    }
    return { x: 0 };
  };

  // compute_object_velocity ($B5A1): object X's heading (octant and fine, an 11-bit angle) and
  // speed as a 24-bit velocity on each axis: the quarter sine table at $8900 for each, swapped in
  // the octants with bit 1 set, times the speed, times 8, and negated by the octant's quadrant.
  P.compute_object_velocity = function (r) {
    const x = r.x, oct = M[OCT + x], fine = M[FINE + x];
    let y = ((oct & 1) << 7) | (fine >> 1);
    M[0x0D] = M[0x8900 + y];
    M[0x0E] = M[0x8900 + (y ^ 0xFF)];
    if (oct & 2) { const t = M[0x0E]; M[0x0E] = M[0x0D]; M[0x0D] = t; }
    let a = 0;
    const axis = (s, c, hi, mid, lo, neg) => {
      const m = P.mul8x8({ a: M[s], y: M[SPEED + x], c });
      const v = ((m.a << 8) | m.y) << 3;
      M[lo + x] = v & 255; M[mid + x] = (v >> 8) & 255; M[hi + x] = v >> 16;
      a = M[hi + x];
      if (!neg) return 0;
      const n = (0x1000000 - v) & 0xFFFFFF;
      M[lo + x] = n & 255; M[mid + x] = (n >> 8) & 255; M[hi + x] = n >> 16;
      a = M[hi + x];
      return v === 0 ? 1 : 0;
    };
    const c = axis(0x0D, fine & 1, VXH, VXM, VXL, oct & 4);
    const negZ = ((oct + 2) & 4) !== 0;
    axis(0x0E, c, VZH, VZM, VZL, negZ);
    if (!negZ) a = 0;
    return { a };
  };
  // apply_object_velocity ($B65D): object X's velocity added to its place (24 bits an axis: hi,
  // lo and a fraction), the place before kept in the prev tables for a collision to put back.
  P.apply_object_velocity = function (r) {
    const x = r.x;
    let s = M[XF + x] + M[VXL + x];
    M[XF + x] = s & 255;
    M[PXL + x] = M[XL + x];
    s = M[XL + x] + M[VXM + x] + (s >> 8);
    M[XL + x] = s & 255;
    M[PXH + x] = M[XH + x];
    M[XH + x] = (M[XH + x] + M[VXH + x] + (s >> 8)) & 255;
    s = M[ZF + x] + M[VZL + x];
    M[ZF + x] = s & 255;
    M[PZL + x] = M[ZL + x];
    s = M[ZL + x] + M[VZM + x] + (s >> 8);
    M[ZL + x] = s & 255;
    M[PZH + x] = M[ZH + x];
    M[ZH + x] = (M[ZH + x] + M[VZH + x] + (s >> 8)) & 255;
  };

  // object_delta_octant ($B6A2): object X's place less object Y's, each axis made positive (its
  // sign in $2C: 4 for x, 2 for z), the larger in $28:$29 and the smaller in $26:$27 (1 in $2C if
  // swapped; equal and zero, $29 is made 1), and the octant they give ($BC76) in $2A.
  P.object_delta_octant = function (r) {
    const x = r.x, y = r.y;
    M[0x2C] = 0;
    let lo = M[XL + x] - M[XL + y];
    let hi = M[XH + x] - M[XH + y] - (lo < 0 ? 1 : 0);
    M[0x27] = lo & 255; M[0x26] = hi & 255;
    if (M[0x26] & 0x80) {
      lo = -M[0x27]; hi = -M[0x26] - (lo < 0 ? 1 : 0);
      M[0x27] = lo & 255; M[0x26] = hi & 255;
      M[0x2C] = 4;
    }
    lo = M[ZL + x] - M[ZL + y];
    hi = M[ZH + x] - M[ZH + y] - (lo < 0 ? 1 : 0);
    M[0x29] = lo & 255; M[0x28] = hi & 255;
    if (M[0x28] & 0x80) {
      M[0x2C] |= 2;
      lo = -M[0x29]; hi = -M[0x28] - (lo < 0 ? 1 : 0);
      M[0x29] = lo & 255; M[0x28] = hi & 255;
    }
    let swap = false;
    if (M[0x28] < M[0x26]) swap = true;
    else if (M[0x28] === M[0x26]) {
      if (M[0x29] < M[0x27]) swap = true;
      else if (M[0x29] === M[0x27] && M[0x29] === 0) M[0x29] = 1;
    }
    if (swap) {
      const h = M[0x28], l = M[0x29];
      M[0x28] = M[0x26]; M[0x29] = M[0x27];
      M[0x27] = l; M[0x26] = h;
      M[0x2C] |= 1;
    }
    M[0x2A] = M[0xBC76 + M[0x2C]];
    return { a: M[0x2A], y: M[0x2C] };
  };
  // bearing_from_viewer ($B729): the two deltas shifted up until the larger's top bit is set
  // ($2B, 15 less the shifts, the range's exponent), the smaller over the larger by the reciprocal
  // table ($8500) and the angle from it by the arctangent table ($8600), turned by the octant: the
  // bearing less the viewer's heading ($1E:$1F), the octant in A and the fine part in Y.
  P.bearing_from_viewer = function () {
    let y = 0x0F, a = M[0x28];
    if (!(a & 0x80)) {
      do {
        y--;
        let t = M[0x27] << 1; M[0x27] = t & 255;
        t = (M[0x26] << 1) | (t >> 8); M[0x26] = t & 255;
        t = M[0x29] << 1; M[0x29] = t & 255;
        a = ((a << 1) | (t >> 8)) & 255;
      } while (!(a & 0x80));
    }
    M[0x2B] = y;
    let t = M[0x29] << 1; M[0x29] = t & 255;
    a = ((a << 1) | (t >> 8)) & 255;          // the top bit, always set, goes out to the carry
    M[0x28] = a;
    let m = P.mul8x8({ a: M[0x8500 + a], y: M[0x26], c: 1 });
    t = M[0x22] << 1; M[0x22] = t & 255;
    a = (m.a << 1) | (t >> 8);
    const c = a >> 8;
    a &= 255;
    if (c) a = 0xFF;
    let v = M[0x8600 + a];
    if (M[0x2A] & 1) v ^= 0xFF;
    const f = v - M[0x1F];
    const o = (M[0x2A] - M[0x1E] - (f < 0 ? 1 : 0)) & 7;
    return { a: o, y: f & 255, z: o === 0 };
  };
  // log_distance_code ($B766): the range as a logarithm: the exponent ($2B) times 16 and the
  // hypotenuse table ($8700) at the two deltas' top nibbles.
  P.log_distance_code = function () {
    M[0xFF] = M[0x26] >> 4;
    const y = (M[0x28] & 0xF0) | M[0xFF];
    const s = ((M[0x2B] << 4) & 255) + M[0x8700 + y] + ((M[0x2B] >> 4) & 1);
    return { a: s & 255, c: s >> 8, y };
  };

  // collide_object_with_obelisk ($AC30): object X against the obelisk in its square of the map
  // ($8A00, 16 x 16 squares). Within range $4F of it, the object goes back to where it was and is
  // turned off it: the carry clear. Otherwise the carry set, and nothing changed.
  P.collide_object_with_obelisk = function (r) {
    const x = r.x;
    if (!M[STATE + x]) return { a: 0, c: 1 };
    M[0xFF] = (M[XH + x] + 8) & 0xF0;
    let y = (((M[ZH + x] + 8) & 255) >> 4) | M[0xFF];
    let a = M[0x8A00 + y];
    if (!a) return { a: 0, c: 1 };
    y = a;
    M[0x15] = y;
    M[0x1E] = M[OCT + x]; M[0x1F] = M[FINE + x];
    P.object_delta_octant({ x, y });
    P.bearing_from_viewer();
    a = P.log_distance_code().a;
    if (a >= M[0x4F]) return { a, c: 1 };
    M[XH + x] = M[PXH + x]; M[XL + x] = M[PXL + x];
    M[ZH + x] = M[PZH + x]; M[ZL + x] = M[PZL + x];
    P.object_delta_octant({ x, y: M[0x15] });
    const b = P.bearing_from_viewer();
    a = b.a ^ 4;
    let t = b.y << 1;
    a = ((a << 1) | (t >> 8)) & 255;
    t = (t & 255) << 1;
    a = ((a << 1) | (t >> 8)) & 255;
    M[0x51] = t & 255;
    M[0x50] = a;
    const f = (M[0x51] | 4) + M[FINE + x];
    M[FINE + x] = f & 255;
    M[OCT + x] = (((M[0x50] + M[OCT + x] + (f >> 8)) & 255) ^ 4) & 7;
    a = P.compute_object_velocity({ x }).a;
    return { a, c: 0 };
  };

  // fire_player_shot ($ACB6): a shot from the player's place and heading into the first free of
  // slots 1, 4 and 5, for 24 passes, once the cool-down $5C is over; the gun's sound on voice 1
  // unless a longer sound plays there.
  P.fire_player_shot = function () {
    if (M[0x5C]) return {};
    let x = 1;
    if (M[STATE + 1]) { x = 4; if (M[STATE + 4]) { x = 5; if (M[STATE + 5]) return {}; } }
    if (R(0x1D) < 0x0F) {
      P.store(0x1D, 0x0C);
      sid(0x00, 0x14); sid(0x01, 0x14); sid(0x05, 0x08); sid(0x04, 0x80); sid(0x04, 0x81);
    }
    M[STATE + x] = 0x18;
    M[OCT + x] = M[OCT]; M[FINE + x] = M[FINE];
    M[XH + x] = M[XH]; M[XL + x] = M[XL];
    M[ZH + x] = M[ZH]; M[ZL + x] = M[ZL];
    M[INVALID + x] = 0;
    M[0x5C] = 8;
    P.compute_object_velocity({ x });
    return {};
  };

  // test_object_hits_player ($AD26): object Y against object X (the player, or the enemy for the
  // player's shots): its bearing from X kept in $1580 (the bearing before in $3A); the carry clear
  // for a hit, which is a range code below $80, or below $C0 with the bearing swept past X since
  // the pass before by more than the tolerance $57. X comes back as Y; A and N as the test left
  // them, which the stargate's check reads; Y the range's table index (the death's flash starts
  // there).
  P.test_object_hits_player = function (r) {
    let x = r.x, y = r.y;
    const miss = () => { M[INVALID + x] = 0xFF; return { c: 1, x, y, a: 0xFF, n: 1 }; };
    if (!M[STATE + y]) return miss();
    M[0x3A] = M[BEARING + y];
    M[0x15] = y; M[0x1E] = 0; M[0x1F] = 0;
    P.object_delta_octant({ x, y });
    const b = P.bearing_from_viewer();
    let ff = b.a, a = b.y;
    x = M[0x15];
    for (let i = 0; i < 3; i++) { const c = ff & 1; ff >>= 1; a = (c << 7) | (a >> 1); }
    M[0xFF] = ff;
    M[BEARING + x] = a;
    const l = P.log_distance_code();
    a = l.a; y = l.y;
    if (a < 0x80) return { c: 0, x, y, a, n: ((a - 0x80) >> 7) & 1 };
    if (a >= 0xC0) return miss();
    if (!(M[INVALID + x] & 0x80)) return miss();
    a = (M[BEARING + x] - M[0x3A] - 1) & 255;
    if (a & 0x80) a ^= 0xFF;
    if (a < M[0x57]) return miss();
    return { c: 0, x, y, a, n: ((a - M[0x57]) >> 7) & 1 };
  };

  // place_object_at_player ($AA29): object X at the player's place, heading the player's turned by
  // A (signed), at speed Y; moved half a step on, and then left still (speed 0).
  P.place_object_at_player = function (r) {
    const x = r.x;
    const f = r.a + M[FINE];
    M[FINE + x] = f & 255;
    M[OCT + x] = ((r.a & 0x80 ? 0xFF : 0) + M[OCT] + (f >> 8)) & 255;
    M[XH + x] = M[XH]; M[ZH + x] = M[ZH];
    M[SPEED + x] = r.y;
    P.compute_object_velocity({ x });
    M[VXH + x] = ((M[VXH + x] & 1) << 7) | (M[VXM + x] >> 1);
    M[VZH + x] = ((M[VZH + x] & 1) << 7) | (M[VZM + x] >> 1);
    P.apply_object_velocity({ x });
    M[SPEED + x] = 0;
    return { a: 0 };
  };

  // spawn_enemy_shot ($A99A): a shot from the enemy into the first free of slots 8-23, its speed
  // the skill's $A6, its shape $8448, aimed at the player (the bearing $39:$2F) and spread by the
  // script's byte at Y when its top bit is set; the shot's sound on voice 2, the lamps lit.
  P.spawn_enemy_shot = function (r) {
    let x = 8;
    while (M[STATE + x]) { x++; if (x === 0x18) return {}; }
    M[0x54] = 0x12; M[0x59] = 0x12;
    M[SPEED + x] = M[0xA6];
    M[TYPE + x] = M[0x8448];
    sid(0x08, 0x14); sid(0x0C, 0x08); sid(0x0D, 0x00); sid(0x0B, 0x80); sid(0x0B, 0x81);
    P.store(0x5A, 7);
    M[STATE + x] = 0x30;
    let a = M[0x8C00 + r.y] << 1;
    const spread = a >> 8;
    a &= 255;
    if (spread) {
      M[0xFF] = a;
      a = P.random_next().a & M[0xFF];
      M[0xFF] >>= 1;
      a = (a - M[0xFF]) & 255;
    }
    const hi = a & 0x80 ? 0xFF : 0;
    const f = a + M[0x39];
    M[FINE + x] = f & 255;
    M[OCT + x] = (hi + M[0x2F] + (f >> 8)) & 255;
    M[XH + x] = M[XH + 2]; M[XL + x] = M[XL + 2];
    M[ZH + x] = M[ZH + 2]; M[ZL + x] = M[ZL + 2];
    M[INVALID + x] = 0;
    P.compute_object_velocity({ x });
    P.set_console_light_colour({ a: 0x0E, x: 0xA0 });
    return {};
  };
  // enemy_fire_script_step ($A97A): the enemy's fire script ($8C00, from $7B): a byte is the
  // passes until the next shot ($5E), fired now; $FF and the next byte go back to an earlier
  // step, with the carry clear. The carry set while the wait runs, or after a shot.
  P.enemy_fire_script_step = function () {
    if (M[0x5E]) return { c: 1 };
    let y = (M[0x7B] + 1) & 255;
    const a = M[0x8C00 + y];
    if (a === 0xFF) { y = (y + 1) & 255; M[0x7B] = M[0x8C00 + y]; return { c: 0 }; }
    M[0x5E] = a;
    y = (y + 1) & 255;
    M[0x7B] = y;
    P.spawn_enemy_shot({ y });
    return { c: 1 };
  };

  // set_console_light_colour ($AA70): colour A on a pair of the console's lamps, the colour RAM row
  // at X (0 the top row's left lamp, $50 its right, $A0 the lower pair).
  P.set_console_light_colour = function (r) {
    const x = r.x;
    for (const o of [0x2FF, 0x300, 0x301, 0x302, 0x303, 0x314, 0x315, 0x316, 0x317, 0x318]) io.colourWrite(o + x, r.a);
    return {};
  };
  // roll_enemy_count ($AA8F): the enemies a level asks for, 10 to 1F in BCD's tens and units.
  P.roll_enemy_count = function () {
    const r = P.random_next().a;
    M[0xFF] = r;
    const s = (r >> 2) + r;
    let v = s & 0x1FF;                         // nine bits, the carry on top, rotated left four times
    for (let i = 0; i < 4; i++) v = ((v << 1) | (v >> 8)) & 0x1FF;
    M[0x8BA8] = (v & 0x0F) | 0x10;
  };

  // The NMOS 6502's decimal ADC and SBC on A and the carry (kit/cpu/cpu6502.js)
  P.adcDec = (a, b, c) => {
    let al = (a & 0x0F) + (b & 0x0F) + c;
    if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;
    let t = (a & 0xF0) + (b & 0xF0) + al;
    if (t >= 0xA0) t += 0x60;
    return { a: t & 255, c: t >= 0x100 ? 1 : 0 };
  };
  P.sbcDec = (a, b, c) => {
    const t = a - b - (1 - c);
    let al = (a & 0x0F) - (b & 0x0F) + c - 1;
    if (al < 0) al = ((al - 0x06) & 0x0F) - 0x10;
    let r = (a & 0xF0) - (b & 0xF0) + al;
    if (r < 0) r -= 0x60;
    return { a: r & 255, c: t >= 0 ? 1 : 0, z: (t & 255) === 0 };
  };
  // add_score_bcd ($B8B8): the points at $8BA0+X (four BCD bytes) added to the score ($8BA0), and
  // the score drawn (draw_status_score).
  P.add_score_bcd = function (r) {
    const x = r.x;
    let c = 0;
    for (let i = 3; i >= 0; i--) { const s = P.adcDec(M[0x8BA0 + i], M[0x8BA0 + i + x], c); M[0x8BA0 + i] = s.a; c = s.c; }
    return P.draw_status_score({ y: 0 });
  };
  // draw_status_score ($B8E1), stamp_digit_pair ($B8F0) and stamp_digit_low ($B904): the score's
  // seven digits on the status row, each a pair of wide characters ($80 + 2 x digit and the one
  // after); a pair of BCD digits from $8BA0,Y at column X.
  P.stamp_digit_low = function (r) {
    let x = r.x;
    const a = ((M[0x8BA0 + r.y] & 0x0F) << 1) | 0x80;
    M[0x6000 + x] = a; M[0x6001 + x] = a | 1;
    x = (x + 2) & 255;
    return { x, y: (r.y + 1) & 255 };
  };
  P.stamp_digit_pair = function (r) {
    let x = r.x;
    const a = ((M[0x8BA0 + r.y] >> 3) & 0x1E) | 0x80;
    M[0x6000 + x] = a; M[0x6001 + x] = a | 1;
    x = (x + 2) & 255;
    return P.stamp_digit_low({ x, y: r.y });
  };
  P.draw_status_score = function (r) {
    let s = P.stamp_digit_low({ x: 0, y: r.y });
    s = P.stamp_digit_pair(s);
    s = P.stamp_digit_pair(s);
    return P.stamp_digit_pair(s);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
