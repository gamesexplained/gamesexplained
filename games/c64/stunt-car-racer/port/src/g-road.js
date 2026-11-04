// The car on the road ($9A38-$A1C6): where the car is on the piece under it (across, along, and
// the road's direction there), the road's height under each of the three points the car rests on,
// and those points' own heights from the car's pitch and roll.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.road = P => {
  const M = P.M;
  const nz = v => ({ n: (v >> 7) & 1, z: (v & 255) === 0 ? 1 : 0 });
  // the byte at ($9A)+y: the piece kind's table
  const T = y => M[((M[0x9A] | M[0x9B] << 8) + y) & 0xFFFF];
  // the view's quarter or a piece's direction, its top two bits as a signed number of quarters
  // (ASL, ROL, ROL, then -2 and -1 for 2 and 3), the low bits carried along as the game does
  const quarters = v => {
    const a = ((v << 3) & 0xF8) | ((v >> 6) & 2) | ((v >> 6) & 1);
    return a >= 2 ? (a | 0xFC) & 255 : a;
  };
  // A:$14 shifted right by one through both bytes (LSR, ROR $14)
  const half = a => { M[0x14] = (M[0x14] >> 1) | ((a & 1) << 7); return a >> 1; };

  // PLACE_ON_PIECE ($9A38): where the car (the eye) is on piece $2E: across the road from its
  // middle line into $B7/$B8, along it into $B3/$B4, and the road's direction under it into
  // $0189/$018A. A straight piece's are its place in the piece's frame (EYE_IN_PIECE) less the
  // line's offset (the kind's table, bytes 2 and 3). A diagonal ($B2 bit 6) turns that frame by an
  // eighth (the difference and the sum of the two, times $B5/256), less bytes 2 and 3, and along
  // times byte 7; its direction from bytes 4 and 5. A curve ($B2 bit 7) measures from its centre
  // (bytes 2 to 5, PIECE_POINT_IN_VIEW): the bearing from PROJECT_X's place across for it
  // ($A202/$A29A, with the view's heading $32/$3E and quarters) gives the direction a quarter turn
  // on ($9D the curve's side) and, less the piece's own (bytes 6 and 7), the distance along (byte 8
  // the factor); across is the curve's radius (bytes 9 and 10) less the distance from the centre
  // (CURVE_DISTANCE, CURVE_DISTANCE_FIX). On a piece of kind 1 or 3, a car past its end is taken
  // to the next piece (the one before, driven backwards) and placed again, unless that is of kind 4.
  P.PLACE_ON_PIECE = r => {
    for (;;) {
      const q = P.PIECE_ORIGIN(P.PIECE_LOAD({ x: M[0x2E] }));
      const x = q.x;
      M[0x3D] = (M[0x68] - M[0x1D]) & 255;
      const b2 = M[0xB2];
      if (!(b2 & 0x80)) {
        P.EYE_IN_PIECE({});
        if (!(b2 & 0x40)) {
          const t = M[0x51] - T(2); M[0xB7] = t & 255;
          const u = M[0x77] - T(3) - (t < 0 ? 1 : 0); M[0xB8] = u & 255;
          M[0xB3] = M[0x52]; M[0xB4] = M[0x78];
          M[0x018A] = M[0x1D]; M[0x0189] = 0;
          return { a: 0, x, y: 3, c: u >= 0 ? 1 : 0, n: 0, z: 1 };
        }
        M[0x15] = 0xB5;
        let t = M[0x51] - M[0x52]; M[0x14] = t & 255;
        let a = P.MUL_S16_U8({ a: (M[0x77] - M[0x78] - (t < 0 ? 1 : 0)) & 255 }).a & 255;
        M[0x15] = a;
        t = M[0x14] - T(2); M[0xB7] = t & 255;
        M[0xB8] = (M[0x15] - T(3) - (t < 0 ? 1 : 0)) & 255;
        M[0x15] = T(7);
        t = M[0x51] + M[0x52]; M[0x14] = t & 255;
        a = P.MUL_S16_U8({ a: (M[0x77] + M[0x78] + (t >> 8)) & 255 }).a & 255;
        M[0xB4] = a; M[0xB3] = M[0x14];
        M[0x0189] = T(4);
        t = T(5) + M[0x1D]; M[0x018A] = t & 255;
        return Object.assign({ a: t & 255, x, y: 5, c: t > 255 ? 1 : 0 }, nz(t));
      }
      // a curve
      P.PIECE_POINT_IN_VIEW({ y: 2 });
      P.PROJECT_X({ x: 2 });
      M[0x16] = quarters(M[0x68]);
      let t = M[0xA202] + M[0x32]; M[0xB9] = t & 255;
      let a = (M[0xA29A] + M[0x3E] + (t >> 8)) & 255;
      a = (a + M[0x16]) & 255;
      if (a & 0x80) a = (a + 4) & 255;
      a = (a - 2) & 255;
      M[0xBA] = a;
      M[0x14] = M[0xB9];
      a = P.SHIFT16({ a: M[0xBA], y: 0xFA }).a & 255;
      M[0x018A] = (((a + 0x40) & 255) - M[0x9D]) & 255;
      M[0x0189] = M[0x14];
      M[0x16] = (2 - (M[0xB2] & 3)) & 255;
      M[0x15] = quarters(M[0x1D]);
      t = M[0xB9] - T(6); M[0x14] = t & 255;
      a = (M[0xBA] - T(7) - (t < 0 ? 1 : 0)) & 255;
      a = (a - M[0x15]) & 255;
      a = P.NEG16_IF_MINUS({ a, n: a >> 7 }).a & 255;
      if (a >= 4) a -= 4;
      while (a) { a = half(a); M[0x16] = (M[0x16] - 1) & 255; }
      M[0x15] = T(8);
      a = P.MUL8({ a: M[0x14] }).a;
      a = half(a);
      a = P.SHIFT16({ a, y: M[0x16] }).a & 255;
      M[0xB4] = a;
      a = ((a << 1) + 2) & 255;
      if (a >= M[0x9E] && (M[0xC3CD] === 1 || M[0xC3CD] === 3)) {
        M[0x16] = M[0x2E];
        const n = M[0xA4] ? P.PIECE_BEHIND({}) : P.PIECE_AHEAD({});
        if ((M[0x0400 + n.x] & 0x0F) === 4) continue;
        M[0x2E] = M[0x16];
      }
      M[0xB3] = M[0x14];
      const d = P.CURVE_DISTANCE({});
      P.CURVE_DISTANCE_FIX({});
      t = T(9) - M[0xC1]; M[0x14] = t & 255;
      const u = T(10) - M[0xC2] - (t < 0 ? 1 : 0);
      const e = P.NEG16_IF_MINUS({ a: u & 255, n: M[0x9D] >> 7, c: u >= 0 ? 1 : 0 });
      M[0xB8] = e.a & 255; M[0xB7] = M[0x14];
      return Object.assign({ a: M[0x14], x: d.x, y: 10, c: e.c }, nz(M[0x14]));
    }
  };

  // CURVE_DISTANCE ($9BBE): the distance from the curve's centre, first guess, into $C1/$C2: the
  // logarithm PROJECT_X left in $AB/$AC turned back through the steps at $B000 and $A380, with a
  // straight line to the next step ($B001) by $AB's low three bits, shifted by its whole part
  P.CURVE_DISTANCE = r => {
    let y = 3;
    M[0x15] = M[0xAB] & 7;
    let a = M[0xAC];
    if (a & 0x80) { do { a = (a + 4) & 255; y = (y + 1) & 255; } while (a >= 4); }
    else while (a >= 4) { a -= 4; y = (y - 1) & 255; }
    M[0x14] = a;
    a = M[0xAB];
    let c = M[0x14] & 1; M[0x14] >>= 1; a = (a >> 1) | (c << 7);
    c = M[0x14] & 1; M[0x14] >>= 1; a = (a >> 1) | (c << 7);
    const x = a >> 1;
    a = ((x === 0x7F ? 0 : M[0xB001 + x]) - M[0xB000 + x]) & 255;
    P.MUL8({ a });
    a = (M[0x14] >> 3) + ((M[0x14] >> 2) & 1);
    const t = a + M[0xB000 + x]; M[0x14] = t & 255;
    const q = P.SHIFT16({ a: (M[0xA380 + x] + (t >> 8)) & 255, y });
    M[0xC2] = q.a; M[0xC1] = M[0x14];
    return Object.assign({ a: M[0x14], x, y: q.y, c: q.c }, nz(M[0x14]));
  };

  // POINT_HEIGHT ($9C14): the road's height at point X of the piece, times 8, in A:$14 (the top
  // bits that leave A in $15's top three): an even point from the left edge's list ($98, from
  // $3F/$35), an odd one from the right's ($CA, from $40/$36); two bytes a point (the high seven
  // bits and the low) with $A2 bit 7 set, otherwise one: its low four bits the high byte and its
  // next three the low byte's top three
  P.POINT_HEIGHT = r => {
    const x = r.x & 255, odd = x & 1, k = x >> 1;
    const base = odd ? (M[0xCA] | M[0xCB] << 8) : (M[0x98] | M[0x99] << 8);
    const lo = odd ? M[0x40] : M[0x3F], hi = odd ? M[0x36] : M[0x35];
    let a, y;
    if (M[0xA2] & 0x80) {
      y = k << 1;
      const t = M[(base + y + 1) & 0xFFFF] + lo; M[0x14] = t & 255;
      a = ((M[(base + y) & 0xFFFF] & 0x7F) + hi + (t >> 8)) & 255;
    } else {
      y = k;
      const b = M[(base + y) & 0xFFFF];
      const t = ((b << 1) & 0xE0) + lo; M[0x14] = t & 255;
      a = ((b & 0x0F) + hi + (t >> 8)) & 255;
    }
    M[0x15] = a;
    let c = 0;
    for (let i = 0; i < 3; i++) { c = a >> 7; a = ((a << 1) | (M[0x14] >> 7)) & 255; M[0x14] = (M[0x14] << 1) & 255; }
    return Object.assign({ a, x, y, c }, nz(a));
  };

  // PLACE_ALONG ($9C79): the car's place along its piece ($B3/$B4, counted from the other end on
  // a piece driven backwards) into $22 and $C3; $8D/$8E a quarter of a segment on ($8E $80 when that
  // is past the piece's end, $BE), $27 twice the segment after it, and $D2/$D3 $20 less the
  // segment ($BE more past the end)
  P.PLACE_ALONG = r => {
    let x = M[0xB3], a = M[0xB4];
    if (M[0xA4] & 0x80) {
      const t = 0 - M[0xB3]; x = t & 255;
      a = (M[0xBE] - M[0xB4] - (t < 0 ? 1 : 0)) & 255;
    }
    M[0xC3] = a; M[0x22] = x;
    const t = x + 0x40; M[0x8D] = t & 255;
    a = (M[0xC3] + (t >> 8)) & 255;
    let y = a;
    if (a >= M[0xBE]) { y = 0; a = 0x80; }
    M[0x8E] = a;
    y = (y + 1) & 255;
    M[0x27] = (y << 1) & 255;
    let u = 0x20 - M[0xC3];
    a = u & 255;
    let c = u >= 0 ? 1 : 0;
    if (!(M[0x8E] & 0x80)) { M[0xD2] = a; M[0xD3] = a; return { a, x, y, c, n: 0, z: (a & M[0x8E]) ? 0 : 1 }; }
    u = a + M[0xBE]; a = u & 255; c = u > 255 ? 1 : 0;
    M[0xD2] = a; M[0xD3] = a;
    return Object.assign({ a, x, y, c }, nz(a));
  };

  // WHEELS_ROAD_HEIGHT ($9CBA): the road's height under each of the car's three points (2, 1, 0)
  // into $C340/$C343/$C3CE. Each from the piece the car is on ($C374): its offset from the car
  // ($0130/$0133 across, $0136/$0139 along, over 16) added to the car's place ($B7/$B8, $B3/$B4).
  // Across, as a fraction of the road's width ($BC) into $4C ($2B the player's line, from point 2);
  // a point past either edge ($C3A6 bit 7, $C3A4/$C3A5 how far) takes $FF or 0. Along, in
  // segments ($BD each) into $4D and $C0 (twice $BF); a point past the piece's ends is on the next
  // (WHEEL_PIECE_STEP). The heights of the road's corners round it ($48-$4B, POINT_HEIGHT; the
  // other way round on a piece driven backwards) then give the height (WHEEL_ROAD_HEIGHT).
  P.WHEELS_ROAD_HEIGHT = r => {
    M[0x2E] = M[0xC374];
    P.PIECE_LOAD({ x: M[0xC374] });
    M[0xC359] = 0;
    let x = 2, y = r.y, last;
    for (;;) {
      M[0x52] = x;
      if (M[0xC374] !== M[0x2E]) { M[0x2E] = M[0xC374]; P.PIECE_LOAD({ x: M[0xC374] }); x = M[0x52]; }
      // across
      M[0x15] = M[0xBC]; M[0x16] = 0;
      M[0x14] = M[0x0133 + x];
      if (M[0x14] & 0x80) M[0x16] = 0xFF;
      let a = M[0x0130 + x];
      for (let i = 0; i < 4; i++) a = half_lsr(a);
      let t = a + M[0xB7]; M[0x14] = t & 255;
      M[0x16] = (M[0x16] + M[0xB8] + (t >> 8)) & 255;
      if (M[0x16] >= 1 && (M[0x16] !== 1 || M[0x14] >= 0x80)) {
        M[0xC3A6] = (M[0xC3A6] >> 1) | 0x80;
        M[0xC3A4] = M[0x14]; M[0xC3A5] = M[0x16];
        a = (M[0x16] & 0x80) ? 0 : 0xFF;
      } else {
        if (M[0x16]) M[0x14] = (0x80 - M[0x14]) & 255;
        a = P.MUL8({ a: M[0x14] }).a;
        if (M[0x16]) a = P.NEG16({ a }).a & 255;
        if (M[0x14] & 0x80) { a = a + 1; if (a > 255) a = 0xFF; }
      }
      M[0x4C] = a;
      if (M[0xA4] & 0x80) a ^= 0xFF;
      if (x === 2) M[0x2B] = a;
      // along
      M[0x15] = M[0xBD]; M[0x16] = 0; M[0x5A] = 0;
      M[0x14] = M[0x0139 + x];
      if (M[0x14] & 0x80) M[0x16] = 0xFF;
      a = M[0x0136 + x];
      for (let i = 0; i < 4; i++) a = half_lsr(a);
      a = P.MUL_S8_U8({ a }).a & 255;
      const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255;
      t = a + M[0xB3]; M[0x4D] = t & 255;
      M[0xBF] = (M[0x16] + M[0xB4] + (t >> 8)) & 255;
      M[0xC0] = (M[0xBF] << 1) & 255;
      if ((M[0xC0] & 0x80) || M[0xC0] >= M[0x62]) P.WHEEL_PIECE_STEP({});
      const H = k => { const q = P.POINT_HEIGHT({ x: k & 255 }); y = q.y; return q.a; };
      if (M[0xA4] === 0) {
        const k = M[0xC0];
        M[0x48] = H(k); M[0x5B] = M[0x15] >> 5;
        M[0x49] = H(k + 1);
        M[0x4A] = H(k + 2); M[0xDC] = M[0x15] >> 5;
        M[0x4B] = H(k + 3);
      } else {
        const k = (M[0x9E] - M[0xC0] - 4) & 255;
        M[0x4B] = H(k);
        M[0x4A] = H(k + 1); M[0xDC] = M[0x15] >> 5;
        M[0x49] = H(k + 2);
        M[0x48] = H(k + 3); M[0x5B] = M[0x15] >> 5;
      }
      x = M[0x52];
      last = P.WHEEL_ROAD_HEIGHT({ x, y });
      y = last.y;
      x--;
      if (x < 0) return Object.assign({}, last, { x: 0xFF, n: 1, z: 0 });
    }
  };
  // A:$14 shifted right by one, $14's top bit from A's bottom (LSR $14, ROR A, the other way
  // round): the high byte in $14, the low in A
  const half_lsr = a => { const c = M[0x14] & 1; M[0x14] >>= 1; return (a >> 1) | (c << 7); };

  // EYE_IN_PIECE ($9E08): the eye's place in the piece's own frame, from the piece's corner as the
  // view sees it ($93:$92 across, $95:$94 along): turned by the quarters between the view and the
  // piece ($3D's top bits), with 8 (a square) added where the corner moves, into $77:$51 across and
  // $78:$52 along
  P.EYE_IN_PIECE = r => {
    const s = M[0x3D];
    const neg = (lo, hi) => { const t = 0 - M[lo]; const u = 0 - M[hi] - (t < 0 ? 1 : 0); return [t & 255, u & 255, u >= 0 ? 1 : 0]; };
    let c, v;
    if (!(s & 0x80)) {
      if (!(s & 0x40)) {
        v = neg(0x92, 0x93); M[0x51] = v[0]; M[0x77] = v[1];
        v = neg(0x94, 0x95); M[0x52] = v[0]; M[0x78] = v[1];
        return Object.assign({ a: v[1], x: r.x, y: r.y, c: v[2] }, nz(v[1]));
      }
      v = neg(0x94, 0x95); M[0x51] = v[0]; M[0x77] = v[1];
      M[0x52] = M[0x92];
      c = 8 + M[0x93]; M[0x78] = c & 255;
      return Object.assign({ a: c & 255, x: r.x, y: r.y, c: c > 255 ? 1 : 0 }, nz(c));
    }
    if (!(s & 0x40)) {
      M[0x51] = M[0x92]; M[0x77] = (8 + M[0x93]) & 255;
      M[0x52] = M[0x94];
      c = 8 + M[0x95]; M[0x78] = c & 255;
      return Object.assign({ a: c & 255, x: r.x, y: r.y, c: c > 255 ? 1 : 0 }, nz(c));
    }
    M[0x51] = M[0x94]; M[0x77] = (8 + M[0x95]) & 255;
    v = neg(0x92, 0x93); M[0x52] = v[0]; M[0x78] = v[1];
    return Object.assign({ a: v[1], x: r.x, y: r.y, c: v[2] }, nz(v[1]));
  };

  // WHEEL_PIECE_STEP ($9E74): a point past its piece's end is on the next piece ($BF positive, the
  // one before driven backwards) or the one before: $2E moved, that piece loaded, $C0 its first
  // segment or its last ($9E less 4), and for a piece the other way round ($BF's sign) the
  // fractions across and along ($4C, $4D) turned round (0 less each, $FF for 0)
  P.WHEEL_PIECE_STEP = r => {
    const ahead = !((M[0xBF] ^ M[0xA4]) & 0x80);
    const q = P.PIECE_LOAD(ahead ? P.PIECE_AHEAD({}) : P.PIECE_BEHIND({}));
    const first = ahead ? !(M[0xA4] & 0x80) : !!(M[0xA4] & 0x80);
    if (first) { M[0xC0] = 0; if (!(M[0xBF] & 0x80)) return Object.assign({}, q, { a: M[0xBF] }, nz(M[0xBF])); }
    else { M[0xC0] = (M[0x9E] - 4) & 255; if (M[0xBF] & 0x80) return Object.assign({}, q, { a: M[0xBF] }, nz(M[0xBF])); }
    let a = (0 - M[0x4D]) & 255; if (!a) a = 0xFF; M[0x4D] = a;
    const c = M[0x4C] ? 0 : 1;
    a = (0 - M[0x4C]) & 255; if (!a) a = 0xFF; M[0x4C] = a;
    return Object.assign({}, q, { a, c }, nz(a));
  };

  // ROAD_HEIGHT_AT ($9EBC): the road's height between four corners, $48 and $49 (one end, $5B the
  // top) and $4A and $4B (the other, $DC), across by $4C/256 and then along by $4D/256: three
  // bytes into $16:$15:$14
  P.ROAD_HEIGHT_AT = r => {
    M[0x5A] = 0;
    M[0x15] = M[0x4C];
    let a = P.MUL_S8_U8({ a: (M[0x49] - M[0x48]) & 255 }).a & 255;
    M[0x44] = a;
    let t = a + M[0x48]; M[0x19] = t & 255;
    M[0x1A] = (((M[0x44] & 0x80) ? 0xFF : 0) + M[0x5B] + (t >> 8)) & 255;
    M[0x18] = M[0x14];
    a = P.MUL_S8_U8({ a: (M[0x4B] - M[0x4A]) & 255 }).a & 255;
    M[0x44] = a;
    t = a + M[0x4A]; M[0x17] = t & 255;
    M[0x1B] = (((M[0x44] & 0x80) ? 0xFF : 0) + M[0xDC] + (t >> 8)) & 255;
    M[0x15] = M[0x4D];
    t = M[0x14] - M[0x18]; M[0x14] = t & 255;
    const u = M[0x17] - M[0x19] - (t < 0 ? 1 : 0); M[0x16] = u & 255;
    a = (M[0x1B] - M[0x1A] - (u < 0 ? 1 : 0)) & 255;
    let y = r.y;
    const fits = (a === 0 && !(M[0x16] & 0x80)) || (a === 0xFF && (M[0x16] & 0x80));
    if (!fits) {
      for (let i = 0; i < 3; i++) {
        const c = a & 1; a >>= 1;
        const c2 = M[0x16] & 1; M[0x16] = (M[0x16] >> 1) | (c << 7);
        M[0x14] = (M[0x14] >> 1) | (c2 << 7);
      }
      a = P.MUL_S16_S8({ a: M[0x16] }).a & 255;
      const q = P.SHIFT16({ a, y: 0xFD });
      M[0x15] = q.a; M[0x16] = M[0x2D]; y = q.y;
    } else {
      a = P.MUL_S16_S8({ a: M[0x16] }).a & 255;
      M[0x15] = a; M[0x16] = (a & 0x80) ? 0xFF : 0;
    }
    t = M[0x14] + M[0x18]; M[0x14] = t & 255;
    t = M[0x15] + M[0x19] + (t >> 8); M[0x15] = t & 255;
    t = M[0x16] + M[0x1A] + (t >> 8); M[0x16] = t & 255;
    return Object.assign({ a: t & 255, x: r.x, y, c: t > 255 ? 1 : 0 }, nz(t));
  };

  // WHEEL_ROAD_HEIGHT ($9F6A): point X's road height (ROAD_HEIGHT_AT, or OFF_EDGE_HEIGHT past an
  // edge) into $C340/$C343/$C3CE; while the car is slow ($0188 below 10) and nearly level (the
  // pitch's high byte within 4), the average of it and the height kept there before
  P.WHEEL_ROAD_HEIGHT = r => {
    const x = r.x & 255;
    let q = P.ROAD_HEIGHT_AT(r);
    const c = M[0xC3A6] >> 7; M[0xC3A6] = (M[0xC3A6] << 1) & 255;
    if (c) q = Object.assign({}, q, P.OFF_EDGE_HEIGHT(q));
    const p = M[0x0124] & 0x80 ? M[0x0124] ^ 0xFF : M[0x0124];
    if (M[0x0188] >= 10 || p >= 5) {
      M[0xC340 + x] = M[0x14]; M[0xC343 + x] = M[0x15]; M[0xC3CE + x] = M[0x16];
      return Object.assign({}, q, { a: M[0x16], x, c: 1 }, nz(M[0x16]));
    }
    let t = M[0x14] + M[0xC340 + x]; M[0xC340 + x] = t & 255;
    t = M[0x15] + M[0xC343 + x] + (t >> 8); M[0xC343 + x] = t & 255;
    t = M[0x16] + M[0xC3CE + x] + (t >> 8);
    const a = ((t & 255) >> 1) | ((t > 255 ? 1 : 0) << 7);
    let cy = t & 1;
    M[0xC3CE + x] = a;
    const c2 = M[0xC343 + x] & 1; M[0xC343 + x] = (M[0xC343 + x] >> 1) | (cy << 7);
    cy = M[0xC340 + x] & 1; M[0xC340 + x] = (M[0xC340 + x] >> 1) | (c2 << 7);
    return Object.assign({}, q, { a, x, c: cy }, nz(M[0xC340 + x]));
  };

  // CURVE_DISTANCE_FIX ($9FB8): the guess at the distance from the curve's centre ($C1/$C2) made
  // closer: the difference between the squares of the true distance ($77:$51 and $78:$52) and of
  // the guess, times the kind's factor ($A01B, about 1/2r for its radius), over 16, added to it
  P.CURVE_DISTANCE_FIX = r => {
    P.SQUARE_S16({ a: M[0x77], y: M[0x51] });
    M[0x48] = M[0x16]; M[0x49] = M[0x17]; M[0x4A] = M[0x18];
    P.SQUARE_S16({ a: M[0x78], y: M[0x52] });
    let t = M[0x16] + M[0x48]; M[0x48] = t & 255;
    t = M[0x17] + M[0x49] + (t >> 8); M[0x49] = t & 255;
    t = M[0x18] + M[0x4A] + (t >> 8); M[0x4A] = t & 255;
    P.SQUARE_S16({ a: M[0xC2], y: M[0xC1] });
    M[0x15] = M[0xA01B + M[0xC3CD]];
    t = M[0x48] - M[0x16];
    t = M[0x49] - M[0x17] - (t < 0 ? 1 : 0); M[0x14] = t & 255;
    let a = (M[0x4A] - M[0x18] - (t < 0 ? 1 : 0)) & 255;
    a = P.MUL_S16_U8({ a }).a & 255;
    a = P.SHIFT16({ a, y: 4 }).a & 255;
    M[0x15] = a;
    t = M[0xC1] + M[0x14]; M[0xC1] = t & 255;
    t = M[0xC2] + M[0x15] + (t >> 8); M[0xC2] = t & 255;
    return Object.assign({ a: t & 255, x: r.x, y: 0, c: t > 255 ? 1 : 0 }, nz(t));
  };

  // PIECE_POINT_IN_VIEW ($A026): the point at bytes Y to Y+3 of the kind's table (across, along, in
  // the piece's frame) from the eye: turned by the quarters between the view and the piece ($3D's
  // top bits), a square (8) added where the corner moves, plus the corner's place ($93:$92 across,
  // $95:$94 along), into $77:$51 and $78:$52; Y comes back four on
  P.PIECE_POINT_IN_VIEW = r => {
    let y = r.y & 255;
    const s = M[0x3D];
    const add = (lo, hi, dlo, dhi) => { const t = M[lo] + T(y); y = (y + 1) & 255; M[dlo] = t & 255; const u = M[hi] + T(y) + (t >> 8); y = (y + 1) & 255; M[dhi] = u & 255; return u; };
    const sub8 = (lo, hi, dlo, dhi) => { const t = M[lo] - T(y); y = (y + 1) & 255; M[dlo] = t & 255; const u = ((M[hi] - T(y) - (t < 0 ? 1 : 0)) & 255) + 8; y = (y + 1) & 255; M[dhi] = u & 255; return u; };
    let u;
    if (!(s & 0x80)) {
      if (!(s & 0x40)) { add(0x92, 0x93, 0x51, 0x77); u = add(0x94, 0x95, 0x52, 0x78); }
      else { add(0x94, 0x95, 0x52, 0x78); u = sub8(0x92, 0x93, 0x51, 0x77); }
    } else if (!(s & 0x40)) { sub8(0x92, 0x93, 0x51, 0x77); u = sub8(0x94, 0x95, 0x52, 0x78); }
    else {
      // the last add here is ADC, INY, STA: N and Z from Y
      sub8(0x94, 0x95, 0x52, 0x78); u = add(0x92, 0x93, 0x51, 0x77);
      return Object.assign({ a: u & 255, x: r.x, y, c: u > 255 ? 1 : 0 }, nz(y));
    }
    return Object.assign({ a: u & 255, x: r.x, y, c: u > 255 ? 1 : 0 }, nz(u));
  };

  // OFF_EDGE_HEIGHT ($A0B6): the height under a point past the road's edge ($C3A4/$C3A5, its place
  // across, the road running from 0 to $0180): less than $30 past it, the road's height
  // ($16:$15:$14) less sixteen times the distance past, and $100 less again when that is below
  // $10000, with $C30A set to $80 or $40 by the side; further out, or when that would leave the
  // height under $1000, $C359 is set (the point is off the edge) and the height is $1000
  P.OFF_EDGE_HEIGHT = r => {
    M[0x1A] = M[0x16]; M[0x19] = M[0x15]; M[0x18] = M[0x14];
    let a, n, y = r.y;
    if (M[0xC3A5] & 0x80) { y = M[0xC3A4]; M[0x14] = y; a = M[0xC3A5]; n = y >> 7; }
    else {
      const t = 0x80 - M[0xC3A4]; M[0x14] = t & 255;
      a = (1 - M[0xC3A5] - (t < 0 ? 1 : 0)) & 255; n = a >> 7;
    }
    a = P.NEG16_IF_MINUS({ a, n }).a & 255;
    const off = () => {
      const c = M[0xC359] & 1;
      M[0xC359] = (M[0xC359] >> 1) | 0x80;
      M[0x15] = 0x10; M[0x14] = 0; M[0x16] = 0;
      return { a: 0, x: r.x, y, n: 0, z: 1, c };
    };
    if (a) return off();
    const q = P.SHIFT16({ a: 0, y: 0xFC });
    y = q.y;
    M[0x15] = q.a & 255; M[0x16] = 0;
    if (M[0x15] >= 3) return off();
    let t = M[0x18] - M[0x14]; M[0x14] = t & 255;
    t = M[0x19] - M[0x15] - (t < 0 ? 1 : 0); M[0x15] = t & 255;
    t = M[0x1A] - M[0x16] - (t < 0 ? 1 : 0); M[0x16] = t & 255;
    let c = t >= 0 ? 1 : 0;
    if (!M[0x16]) {
      a = (M[0x15] - 1) & 255;
      if (a < 0x10) return off();
      M[0x15] = a; c = 1;
    }
    a = (M[0xC3A5] ^ M[0xA4]) & 0x80;
    if (!a) a = 0x40;
    M[0xC30A] = a;
    return Object.assign({ a, x: r.x, y, c }, nz(a));
  };

  // CAR_POINT_HEIGHTS ($A132): the heights of the car's three points from its middle's ($0101/$0104/
  // $0107): less the pitch's sine ($0121/$0124, SINE16) for point 2 ($C348/$C34B/$C3D3), plus it
  // for points 0 and 1 ($C346/$C349/$C3D1 and $C347/$C34A/$C3D2), which are also half the roll's
  // sine ($0123/$0126) above and below that
  P.CAR_POINT_HEIGHTS = r => {
    M[0x79] = 0; M[0x7A] = 0;
    M[0x14] = M[0x0121];
    let a = P.SINE16({ a: M[0x0124] }).a & 255;
    M[0x77] = a;
    if (a & 0x80) M[0x79] = 0xFF;
    M[0x51] = M[0x14];
    M[0x14] = M[0x0123];
    const q = P.SINE16({ a: M[0x0126] });
    a = q.a & 255;
    M[0x43] = a;
    if (a & 0x80) M[0x7A] = 0xFF;
    M[0x43] = (M[0x43] >> 1) | (a & 0x80);
    M[0x14] = (M[0x14] >> 1) | ((a & 1) << 7);
    M[0x56] = M[0x14];
    let t = M[0x0101] - M[0x51]; M[0xC348] = t & 255;
    t = M[0x0104] - M[0x77] - (t < 0 ? 1 : 0); M[0xC34B] = t & 255;
    M[0xC3D3] = (M[0x0107] - M[0x79] - (t < 0 ? 1 : 0)) & 255;
    t = M[0x0101] + M[0x51]; M[0x14] = t & 255;
    t = M[0x0104] + M[0x77] + (t >> 8); M[0x15] = t & 255;
    M[0x16] = (M[0x0107] + M[0x79] + (t >> 8)) & 255;
    t = M[0x14] - M[0x56]; M[0xC347] = t & 255;
    t = M[0x15] - M[0x43] - (t < 0 ? 1 : 0); M[0xC34A] = t & 255;
    M[0xC3D2] = (M[0x16] - M[0x7A] - (t < 0 ? 1 : 0)) & 255;
    t = M[0x14] + M[0x56]; M[0xC346] = t & 255;
    t = M[0x15] + M[0x43] + (t >> 8); M[0xC349] = t & 255;
    t = M[0x16] + M[0x7A] + (t >> 8); M[0xC3D1] = t & 255;
    return Object.assign({ a: t & 255, x: q.x, y: r.y, c: t > 255 ? 1 : 0 }, nz(t));
  };

  // OPP_ROAD_HEIGHT ($FF94): the road's height under the opponent's point X (ROAD_HEIGHT_AT), an
  // eighth of it, into $07EC/$07F0
  P.OPP_ROAD_HEIGHT = r => {
    const x = r.x & 255;
    const q = P.ROAD_HEIGHT_AT(r);
    let a = M[0x15], c = 0;
    for (let i = 0; i < 3; i++) {
      const c1 = M[0x16] & 1; M[0x16] >>= 1;
      const c2 = a & 1; a = (a >> 1) | (c1 << 7);
      c = M[0x14] & 1; M[0x14] = (M[0x14] >> 1) | (c2 << 7);
    }
    M[0x07F0 + x] = a; M[0x07EC + x] = M[0x14];
    return Object.assign({ a: M[0x14], x, y: q.y, c }, nz(M[0x14]));
  };

  // ACROSS_LINE_ENDS ($CF73): before a line across the road, each of the pair's two points (point
  // $C6 and its neighbour) more than $50 from the middle of the screen across ($A200/$A298 less
  // $80) has a quarter of the excess added to its height on the screen ($A24C/$A2E4)
  P.ACROSS_LINE_ENDS = r => {
    let x = M[0xC6], a = 0, c = 0;
    for (let y = 2; y; y--) {
      x ^= 1;
      let t = M[0xA200 + x] - 0x80; M[0x14] = t & 255;
      a = (M[0xA298 + x] - (t < 0 ? 1 : 0)) & 255;
      a = P.NEG16_IF_MINUS({ a, n: a >> 7 }).a & 255;
      M[0x15] = a;
      t = M[0x14] - 0x50; M[0x14] = t & 255;
      const u = M[0x15] - (t < 0 ? 1 : 0);
      a = u & 255; c = u >= 0 ? 1 : 0;
      if (u < 0) continue;
      a = half(a); a = half(a);
      M[0x15] = a;
      t = M[0xA24C + x] + M[0x14]; M[0xA24C + x] = t & 255;
      t = M[0xA2E4 + x] + M[0x15] + (t >> 8); M[0xA2E4 + x] = t & 255;
      a = t & 255; c = t > 255 ? 1 : 0;
    }
    return { a, x, y: 0, c, z: 1, n: 0 };
  };

  // KEY_PRESSED ($C7C9): key X (its place in the keyboard's matrix) tested through the command
  // dispatcher (command $81): Z set when it is held; Y kept, and A comes back holding it too
  P.KEY_PRESSED = r => {
    const x = P.DISPATCH({ a: 0x81, x: r.x, y: 0xFF }).x & 255;
    return { a: r.y & 255, x, y: r.y & 255, z: x === 0xFF ? 1 : 0, c: x >= 0xFF ? 1 : 0, n: ((x - 0xFF) >> 7) & 1 };
  };

  // WHEEL_TOP ($156B): a front wheel's top drawn into the bitmap at height A (command $40)
  P.WHEEL_TOP = r => { M[0x14] = r.a & 255; return P.DISPATCH({ a: 0x40, x: r.x, y: r.y }); };
};
})(typeof window !== 'undefined' ? window : globalThis);
