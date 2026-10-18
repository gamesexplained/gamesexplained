// Vectors and orientations, MAIN's $9037-$99BD. A vector in log form is three numbers in log form
// (g-log.js), 9 bytes: each the fraction, the whole part and the sign byte; a position is three
// 24-bit linear numbers. An orientation is three rows, each a vector in log form. The routines
// take their operands through the zero-page pointers ($74) and ($76) and write through ($78), as
// the game's do, and leave the pointers as the game's leave them. A product of two numbers in log
// form is the sum of their logs, with the carry from the fraction into the whole part, and the
// exclusive or of their sign bytes; a quotient the difference.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.vec = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const rd = (zp, i) => M[(ptr(zp) + i) & 0xFFFF];
  const wr = (zp, i, v) => { M[(ptr(zp) + i) & 0xFFFF] = v & 255; };
  // the log-form product of the numbers at (s1)+i and (s2)+j into $5F-$61 (to = 0) or $62-$64 (to = 3)
  const mul = (to, s1, i, s2, j) => {
    const lo = rd(s1, i) + rd(s2, j);
    M[0x5F + to] = lo & 255;
    M[0x60 + to] = (rd(s1, i + 1) + rd(s2, j + 1) + (lo >> 8)) & 255;
    M[0x61 + to] = rd(s1, i + 2) ^ rd(s2, j + 2);
  };
  const store = (zp, i) => { wr(zp, i, M[0x5F]); wr(zp, i + 1, M[0x60]); wr(zp, i + 2, M[0x61]); };
  const load = (zp, i) => { M[0x5F] = rd(zp, i); M[0x60] = rd(zp, i + 1); M[0x61] = rd(zp, i + 2); };
  // a 16-bit log halved, the sign of its whole part kept: a square root
  const halve = () => { const c = M[0x60] & 1; M[0x60] = (M[0x60] >> 1) | (M[0x60] & 0x80); M[0x5F] = (M[0x5F] >> 1) | (c << 7); };
  // twice a log into $5F/$60 (to 0) or $62/$63 (to 3), from (zp)+i: a square
  const twice = (to, zp, i) => { const lo = rd(zp, i) << 1; M[0x5F + to] = lo & 255; M[0x60 + to] = ((rd(zp, i + 1) << 1) | (lo >> 8)) & 255; };

  // ---- rotation. Each of the three angles at ($74) that is not tiny (whole part -8 or more)
  // turns one pair of the orientation's rows at ($78): rows 1 and 2, then 2 and 0, then 0 and 1.
  P.turn_by_rates = function (r) {
    M[0x86] = M[0x74]; M[0x87] = M[0x75]; M[0x88] = M[0x78]; M[0x89] = M[0x79];
    M[0x84] = 0; M[0x85] = 0;
    let y;
    do {
      y = M[0x84];
      M[0x5F] = M[(ptr(0x86) + y) & 0xFFFF]; y++;
      M[0x60] = M[(ptr(0x86) + y) & 0xFFFF];
      if (!((M[0x60] - 0xF8) & 0x80)) {
        y++;
        M[0x61] = M[(ptr(0x86) + y) & 0xFFFF];
        const x = M[0x85], o = ptr(0x88);
        setp(0x74, o + M[0x9094 + x]);
        setp(0x78, o + M[0x9095 + x]);
        P.turn_pair();
        y = 9;
      }
      M[0x84] = (M[0x84] + 3) & 255;
      M[0x85]++;
    } while (M[0x85] < 3);
    return { a: 3, x: M[0x85] - 1, y };
  };
  // Rows a at ($74) and b at ($78) turned by the small angle in $5F-$61: b = normalise(b + angle
  // a), then a = normalise(a - angle b), with the products kept at $089F and $08A8
  P.turn_pair = function (r) {
    M[0x80] = M[0x74]; M[0x81] = M[0x75]; M[0x82] = M[0x78]; M[0x83] = M[0x79];
    setp(0x78, 0x089F); P.vec_scale_signed();
    M[0x74] = M[0x82]; M[0x75] = M[0x83];
    setp(0x78, 0x08A8); P.vec_scale_signed();
    setp(0x76, 0x089F);
    M[0x78] = M[0x82]; M[0x79] = M[0x83];
    P.vec_add_log();
    P.vec_normalise();
    setp(0x76, 0x08A8);
    M[0x74] = M[0x78] = M[0x80]; M[0x75] = M[0x79] = M[0x81];
    P.vec_sub_log();
    return P.vec_normalise();
  };
  // The identity orientation at $0DA8 to ($78)
  P.copy_identity = function (r) {
    setp(0x74, 0x0DA8);
    for (let y = 0x1A; y >= 0; y--) wr(0x78, y, rd(0x74, y));
    return { a: rd(0x74, 0), x: r && r.x, y: 0xFF };
  };

  // ---- matrices
  // ($78) = v0 row0 + v1 row1 + v2 row2, the rows at ($76) and v at ($74); a component of v that
  // is tiny (whole part below -7) is left out, and when all are, ($78) is not written
  P.vec_times_rows = function (r) {
    M[0x82] = M[0x74]; M[0x83] = M[0x75];
    M[0x74] = M[0x76]; M[0x75] = M[0x77];
    M[0x76] = M[0x78]; M[0x77] = M[0x79];
    M[0x81] = 0; M[0x80] = 0;
    let y;
    do {
      y = M[0x80];
      M[0x5F] = M[(ptr(0x82) + y) & 0xFFFF]; y++;
      M[0x60] = M[(ptr(0x82) + y) & 0xFFFF];
      if (!((M[0x60] - 0xF9) & 0x80)) {
        y++;
        M[0x61] = M[(ptr(0x82) + y) & 0xFFFF];
        if (M[0x81] === 0) { M[0x81]++; P.vec_scale_signed(); } else P.vec_axpy();
        y = 9;
      }
      setp(0x74, ptr(0x74) + 9);
      M[0x80] += 3;
    } while (M[0x80] < 9);
    return { a: M[0x80], x: r && r.x, y };
  };
  // The vector at ($74) times the three rows at ($76): each a dot product, to ($78)+0, +3, +6;
  // ($76) is left on the third row
  P.mat_times_vec = function (r) {
    P.vec_dot(); store(0x78, 0);
    setp(0x76, ptr(0x76) + 9);
    P.vec_dot(); store(0x78, 3);
    setp(0x76, ptr(0x76) + 9);
    P.vec_dot(); store(0x78, 6);
    return { a: M[0x61], y: 8 };
  };
  // Two orientations multiplied: rows 0 and 1 of ($74) times ($76) into ($78), row 2 their cross
  // product
  P.mat_times_mat = function (r) {
    P.mat_times_vec();
    setp(0x74, ptr(0x74) + 9);
    setp(0x76, ptr(0x76) - 0x12);
    setp(0x78, ptr(0x78) + 9);
    P.mat_times_vec();
    setp(0x74, ptr(0x78) - 9);
    M[0x76] = M[0x78]; M[0x77] = M[0x79];
    setp(0x78, ptr(0x78) + 9);
    return P.vec_cross();
  };
  P.mat_transpose = function (r) {
    M[0x80] = 0; M[0x81] = 0;
    for (;;) {
      load(0x74, M[0x80]);
      store(0x78, M[0x81]);
      M[0x80] += 3;
      M[0x81] += 9;
      if (M[0x81] < 0x1B) continue;
      M[0x81] -= 0x18;
      if (M[0x81] < 9) continue;
      return { a: M[0x81], y: 26 };
    }
  };
  // The orientation at ($78) kept a rotation: row 0 = row 1 x row 2, row 1 = row 2 x row 0, and
  // each row normalised
  P.mat_orthonormal = function (r) {
    M[0x7A] = M[0x78]; M[0x7B] = M[0x79];
    const o = ptr(0x78);
    setp(0x74, o + 9);
    setp(0x76, o + 0x12);
    P.vec_cross();
    M[0x78] = M[0x74]; M[0x79] = M[0x75];
    M[0x74] = M[0x76]; M[0x75] = M[0x77];
    M[0x76] = M[0x7A]; M[0x77] = M[0x7B];
    P.vec_cross();
    M[0x78] = M[0x74] = M[0x7A]; M[0x79] = M[0x75] = M[0x7B];
    P.vec_normalise();
    setp(0x78, ptr(0x78) + 9); setp(0x74, ptr(0x74) + 9);
    P.vec_normalise();
    setp(0x78, ptr(0x78) + 9); setp(0x74, ptr(0x74) + 9);
    P.vec_normalise();
    M[0x78] = M[0x7A]; M[0x79] = M[0x7B];
    return { a: M[0x7B], y: 9 };
  };

  // ---- conversions between linear and log form
  // ($78) = log(($74) - ($76)), component by component
  P.vec_sub_to_log = function (r) {
    for (const i of [0, 3, 6]) {
      let s = rd(0x74, i) - rd(0x76, i); M[0x5F] = s & 255;
      s = rd(0x74, i + 1) - rd(0x76, i + 1) - (s < 0 ? 1 : 0); M[0x60] = s & 255;
      s = rd(0x74, i + 2) - rd(0x76, i + 2) - (s < 0 ? 1 : 0); M[0x61] = s & 255;
      P.lin_to_log();
      store(0x78, i);
    }
    return { a: M[0x61], y: 8 };
  };
  P.vec_log_to_lin = function (r) {
    for (const i of [6, 3, 0]) {
      M[0x61] = rd(0x74, i + 2); M[0x60] = rd(0x74, i + 1); M[0x5F] = rd(0x74, i);
      P.log_to_lin_signed();
      store(0x78, i);
    }
    return { a: M[0x61], y: 0xFF };
  };
  P.vec_lin_to_log = function (r) {
    for (const i of [0, 3, 6]) {
      load(0x74, i);
      P.lin_to_log();
      store(0x78, i);
    }
    return { a: M[0x61], y: 8 };
  };

  // ---- products
  // ($78) = ($74) x ($76); ($76) is copied to $6B-$73 first
  P.vec_cross = function (r) {
    for (let y = 0; y < 9; y++) M[0x6B + y] = rd(0x76, y);
    const B = (to, s1, i, j) => {   // a product with b from the copy at $6B
      const lo = rd(s1, i) + M[0x6B + j];
      M[0x5F + to] = lo & 255;
      M[0x60 + to] = (rd(s1, i + 1) + M[0x6C + j] + (lo >> 8)) & 255;
      M[0x61 + to] = rd(s1, i + 2) ^ M[0x6D + j];
    };
    B(0, 0x74, 3, 6); B(3, 0x74, 6, 3); P.log_sub(); store(0x78, 0);
    B(0, 0x74, 6, 0); B(3, 0x74, 0, 6); P.log_sub(); store(0x78, 3);
    B(0, 0x74, 0, 3); B(3, 0x74, 3, 0); P.log_sub(); store(0x78, 6);
    return { a: M[0x61], y: 8 };
  };
  // The dot product of ($74) and ($76) in $5F-$61
  P.vec_dot = function (r) {
    mul(0, 0x74, 0, 0x76, 0);
    mul(3, 0x74, 3, 0x76, 3);
    P.log_add({ y: 6 });
    mul(3, 0x74, 6, 0x76, 6);
    return Object.assign(P.log_add({ y: 9 }), { y: 9 });
  };
  // The length of ($74) in log form in $5F/$60: the sum of the squares, halved for the root; $61
  // is not written
  P.vec_length = function (r) {
    twice(0, 0x74, 0);
    twice(3, 0x74, 3);
    P.log_add_mag({ y: 6 });
    twice(3, 0x74, 6);
    P.log_add_mag({ y: 9 });
    halve();
    return { a: M[0x60], x: r && r.x, y: 9 };
  };
  P.copy9_from_0DAB = r => { setp(0x74, 0x0DAB); return P.copy9(r); };
  P.copy9 = function (r) {
    for (let y = 0; y < 9; y++) wr(0x78, y, rd(0x74, y));
    return { a: rd(0x74, 8), x: r && r.x, y: 9 };
  };
  // ($78) = ($74) times the number in $5F-$61, the signs combined
  P.vec_scale_signed = function (r) {
    for (const i of [0, 3, 6]) {
      const lo = rd(0x74, i) + M[0x5F];
      wr(0x78, i, lo);
      wr(0x78, i + 1, rd(0x74, i + 1) + M[0x60] + (lo >> 8));
      wr(0x78, i + 2, rd(0x74, i + 2) ^ M[0x61]);
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  // the same by a positive number in $5F/$60, the vector's signs kept
  P.vec_scale = function (r) {
    for (const i of [0, 3, 6]) {
      const lo = rd(0x74, i) + M[0x5F];
      wr(0x78, i, lo);
      wr(0x78, i + 1, rd(0x74, i + 1) + M[0x60] + (lo >> 8));
      wr(0x78, i + 2, rd(0x74, i + 2));
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  P.vec_div_signed = function (r) {
    for (const i of [0, 3, 6]) {
      const lo = rd(0x74, i) - M[0x5F];
      wr(0x78, i, lo);
      wr(0x78, i + 1, rd(0x74, i + 1) - M[0x60] - (lo < 0 ? 1 : 0));
      wr(0x78, i + 2, rd(0x74, i + 2) ^ M[0x61]);
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  P.vec_normalise = function (r) { P.vec_length(); return P.vec_div(r); };
  P.vec_div = function (r) {
    for (const i of [0, 3, 6]) {
      const lo = rd(0x74, i) - M[0x5F];
      wr(0x78, i, lo);
      wr(0x78, i + 1, rd(0x74, i + 1) - M[0x60] - (lo < 0 ? 1 : 0));
      wr(0x78, i + 2, rd(0x74, i + 2));
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  // ($78) = ($74) + ($76) and - ($76), in log form, the last component first
  const addSub = (f) => {
    for (const i of [6, 3, 0]) {
      M[0x61] = rd(0x74, i + 2); M[0x64] = rd(0x76, i + 2);
      M[0x60] = rd(0x74, i + 1); M[0x63] = rd(0x76, i + 1);
      M[0x5F] = rd(0x74, i); M[0x62] = rd(0x76, i);
      f({ y: i });
      store(0x78, i);
    }
    return { a: M[0x61], y: 0xFF };
  };
  P.vec_add_log = r => addSub(P.log_add);
  P.vec_sub_log = r => addSub(P.log_sub);
  // ($78) = s ($74) + ($76), s the number in $5F-$61 (kept at $65-$67)
  P.vec_axpy = function (r) {
    M[0x65] = M[0x5F]; M[0x66] = M[0x60]; M[0x67] = M[0x61];
    for (const i of [0, 3, 6]) {
      const lo = M[0x65] + rd(0x74, i);
      M[0x5F] = lo & 255; M[0x62] = rd(0x76, i);
      M[0x60] = (M[0x66] + rd(0x74, i + 1) + (lo >> 8)) & 255; M[0x63] = rd(0x76, i + 1);
      M[0x61] = M[0x67] ^ rd(0x74, i + 2); M[0x64] = rd(0x76, i + 2);
      P.log_add({ y: i + 2 });
      store(0x78, i);
    }
    return { a: M[0x61], y: 9 };
  };
  // linear: three 24-bit sums, differences and negations
  P.vec_add_lin = function (r) {
    for (const i of [0, 3, 6]) {
      let c = 0;
      for (let k = 0; k < 3; k++) { const s = rd(0x74, i + k) + rd(0x76, i + k) + c; wr(0x78, i + k, s); c = s >> 8; }
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  P.vec_sub_lin = function (r) {
    for (const i of [0, 3, 6]) {
      let b = 0;
      for (let k = 0; k < 3; k++) { const s = rd(0x74, i + k) - rd(0x76, i + k) - b; wr(0x78, i + k, s); b = s < 0 ? 1 : 0; }
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };
  P.vec_neg_lin = function (r) {
    for (const i of [0, 3, 6]) {
      let b = 0;
      for (let k = 0; k < 3; k++) { const s = 0 - rd(0x74, i + k) - b; wr(0x78, i + k, s); b = s < 0 ? 1 : 0; }
    }
    return { a: rd(0x78, 8), x: r && r.x, y: 9 };
  };

  // ---- angles, in units of 1024 to the turn
  // The vector's length to ($78) (positive), then its two angles as vec_angles gives them
  P.vec_length_store = function (r) {
    P.vec_length();
    wr(0x78, 0, M[0x5F]); wr(0x78, 1, M[0x60]); wr(0x78, 2, 0);
    return P.vec_angles(r);
  };
  // The heading, arctan2(x0, x2), to ($78)+3, and the elevation, arctan(x1 / sqrt(x0^2 + x2^2)),
  // to ($78)+6, of the vector at ($74)
  P.vec_angles = function (r) {
    load(0x74, 0);
    let s = M[0x5F] - rd(0x74, 6); M[0x5F] = s & 255;
    M[0x60] = (M[0x60] - rd(0x74, 7) - (s < 0 ? 1 : 0)) & 255;
    M[0x64] = rd(0x74, 8) ^ 0xFF;
    P.arctan2_log();
    store(0x78, 3);
    twice(0, 0x74, 0);
    twice(3, 0x74, 6);
    P.log_add_mag({ y: 7 });
    halve();
    s = rd(0x74, 3) - M[0x5F]; M[0x5F] = s & 255;
    M[0x60] = (rd(0x74, 4) - M[0x60] - (s < 0 ? 1 : 0)) & 255;
    M[0x61] = rd(0x74, 5);
    P.arctan_log({ y: 5 });
    store(0x78, 6);
    return { a: M[0x61], y: 8 };
  };
  // The angle whose tangent is the number in log form in $5F-$61: a tangent of 1 or more is
  // inverted and the angle taken from 256 (a right angle); the tangent's log plus $04F4, as a
  // linear number, indexes the 32 angles of arctan_table
  P.arctan_log = function (r) {
    M[0x80] = M[0x61]; M[0x81] = M[0x60];
    if (!(M[0x60] & 0x80)) { const s = 0 - M[0x5F]; M[0x5F] = s & 255; M[0x60] = (0 - M[0x60] - (s < 0 ? 1 : 0)) & 255; }
    const s = M[0x5F] + 0xF4; M[0x5F] = s & 255;
    M[0x60] = (M[0x60] + 0x04 + (s >> 8)) & 255;
    P.log_to_lin(r);
    M[0x5F] = 0; M[0x61] = 0;
    const x = M[0x60];
    M[0x60] = M[0x99BE + x];
    if (!(M[0x81] & 0x80)) {
      const t = 0 - M[0x60]; M[0x60] = t & 255;
      M[0x61] = (1 - M[0x61] - (t < 0 ? 1 : 0)) & 255;
    }
    if (M[0x80] & 0x80) {
      const t = 0 - M[0x60]; M[0x60] = t & 255;
      M[0x61] = (0 - M[0x61] - (t < 0 ? 1 : 0)) & 255;
    }
    return { a: M[0x61], x, y: r && r.y };
  };
  // arctan_log for an angle from two components: with $64's bit 7 set the angle is taken from
  // half a turn ($0200), or from $FE00 when it is negative
  P.arctan2_log = function (r) {
    const o = P.arctan_log(r);
    if (!(M[0x64] & 0x80)) return o;
    const t = 0 - M[0x60]; M[0x60] = t & 255;
    M[0x61] = ((M[0x61] & 0x80 ? 0xFE : 0x02) - M[0x61] - (t < 0 ? 1 : 0)) & 255;
    return Object.assign(o, { a: M[0x61] });
  };
  // arctan(x / sqrt(|x^2 - 1|)): the arcsine, for |x| below 1
  P.arcsin_units = function (r) {
    M[0x65] = M[0x5F]; M[0x66] = M[0x60];
    const c = M[0x5F] >> 7; M[0x5F] = (M[0x5F] << 1) & 255; M[0x60] = ((M[0x60] << 1) | c) & 255;
    M[0x62] = 0; M[0x63] = 0;
    P.s_B2E7();
    halve();
    const s = M[0x65] - M[0x5F]; M[0x5F] = s & 255;
    M[0x60] = (M[0x66] - M[0x60] - (s < 0 ? 1 : 0)) & 255;
    return P.arctan_log(r);
  };
  // The unused radian forms: below a threshold the number is its own angle
  const below = (lo, hi) => (((M[0x60] - hi - (M[0x5F] < lo ? 1 : 0)) & 0x80) !== 0);
  P.arcsin_rad = r => (below(0x67, 0xFE) ? r : (P.arcsin_units(r), P.units_to_radians(r)));
  P.arctan_rad = r => (below(0xAE, 0xFD) ? r : (P.arctan_log(r), P.units_to_radians(r)));
  P.arccos_units = function (r) {
    P.arcsin_units(r);
    let s = 0 - M[0x5F]; M[0x5F] = s & 255;
    s = 1 - M[0x60] - (s < 0 ? 1 : 0); M[0x60] = s & 255;
    M[0x61] = (0 - M[0x61] - (s < 0 ? 1 : 0)) & 255;
    return { a: M[0x61], y: r && r.y };
  };
  // (the listing's label arccos_rad is on $9977, the operand of the SBC before; this is $997B)
  P.arccos_rad = r => { P.arccos_units(r); return P.units_to_radians(r); };
  // an angle in 1024ths of a turn to radians in log form: less log2(1024 / 2 pi), $0759
  P.units_to_radians = function (r) {
    M[0x99AF] = r && r.y !== undefined ? r.y : M[0x99AF];
    P.lin_to_log();
    const s = M[0x5F] - 0x59; M[0x5F] = s & 255;
    M[0x60] = (M[0x60] - 0x07 - (s < 0 ? 1 : 0)) & 255;
    return { a: M[0x60], y: M[0x99AF] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
