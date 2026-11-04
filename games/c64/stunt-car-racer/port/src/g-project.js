// The projection ($2458-$2808): a point of the track or of the opponent's car put on the screen by
// logarithms. Each coordinate, made eight bits with a count of the shifts it took, is looked up in
// the logarithm tables ($AA00 low, $AB00 high, $A610 for the shifts); the depth's logarithm taken
// from the coordinate's; the difference turned back by the antilogarithm (EXP, $A800-$A900 and
// $AC00-$AD00). The roll's tables ($0300-$03FF, $C310-$C33F) are rebuilt when the roll changes.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.project = P => {
  const M = P.M;
  // a signed sixteen-bit number (hi:$14) made eight bits in $14 by shifting it right: Y the number
  // of shifts, plus 8 when it was negative (and negated first, its low byte taken from lo, which
  // is $14 but in PROJECT_X_AT, where it is $52 whatever A was); one too large when negated gives
  // Y = $0F, and $14 = $FF only where ff says so
  const norm = (hi, ff, lo = 0x14) => {
    let y = 0, a = hi & 255;
    if (a & 0x80) {
      y = 8;
      const t = 0 - M[lo]; M[0x14] = t & 255;
      a = (0 - a - (t < 0 ? 1 : 0)) & 255;
      if (a & 0x80) { if (ff) M[0x14] = 0xFF; return 0x0F; }
    }
    while (a) { y++; const c = a & 1; a >>= 1; M[0x14] = (c << 7) | (M[0x14] >> 1); }
    return y;
  };
  // the two's complement of the sixteen bits in A:$14, $15 holding A
  const neg = a => {
    M[0x15] = a & 255;
    const t = 0 - M[0x14]; M[0x14] = t & 255;
    return (0 - M[0x15] - (t < 0 ? 1 : 0)) & 255;
  };

  // PROJECT_X ($2458): point X's place across the screen ($A200/$A298) from its distance across
  // ($78:$52) and its depth ($77:$51), through PROJECT_LOG; a point on the left (a negative
  // distance) is moved two pixels further out. PROJECT_X_AT ($245C) takes the distance's low
  // byte in A.
  // The game rewrites PROJECT_X's first three bytes to a JMP to PROJECT_X_PAIR ($F40B) while it
  // draws the track's picture for the menus ($F3C1), and puts them back after.
  P.PROJECT_X = r => {
    const b0 = M[0x2458], b1 = M[0x2459], b2 = M[0x245A];
    if (b0 === 0x4C && b1 === 0x0B && b2 === 0xF4) return P.PROJECT_X_PAIR(r);
    if (b0 !== 0x86 || b1 !== 0x16 || b2 !== 0xA5) throw new Error('PROJECT_X: its first bytes are ' + [b0, b1, b2].map(v => v.toString(16)).join(' '));
    M[0x16] = r.x & 255;
    return P.PROJECT_X_AT({ a: M[0x52], x: r.x });
  };
  P.PROJECT_X_AT = r => {
    M[0x14] = r.a & 255;
    const y = norm(M[0x78], true, 0x52);
    const x = M[0x14];
    if (y < 8) return P.PROJECT_LOG({ x, y });
    M[0x24F8] = 0xB0;
    P.PROJECT_LOG({ x, y });
    M[0x24F8] = 0x90;
    const k = M[0x16];
    if (M[0xA298 + k] & 0x80) M[0xA298 + k] = (M[0xA298 + k] + 2) & 255;
    else M[0xA298 + k] = (M[0xA298 + k] - 2) & 255;
    return { x: k };
  };
  // PROJECT_LOG ($24AD): with the across distance's eight bits in X and its shifts in Y: its
  // logarithm into $70/$71, the depth's ($77:$51) into $A9/$AA, and from their difference the
  // point's place across the screen, A200/A298 for point $16, measured from the middle ($A7/$A8,
  // or $32/$3E for the other side); $AB/$AC keep the depth's logarithm less the result's, plus
  // $20, for PROJECT_Y. Its branch at $24F8 is rewritten by PROJECT_X ($90 or $B0) to swap the
  // sides when the distance was negative.
  P.PROJECT_LOG = r => {
    let x = r.x & 255, y = r.y & 255;
    M[0x71] = (M[0xAB00 + x] + M[0xA610 + y]) & 255;
    M[0x70] = M[0xAA00 + x];
    M[0x14] = M[0x51];
    y = norm(M[0x77], false);
    x = M[0x14];
    M[0xAA] = (M[0xAB00 + x] + M[0xA610 + y]) & 255;
    M[0xA9] = M[0xAA00 + x];
    const c = y >= 8;
    const op = M[0x24F8];
    let br;
    if (op === 0x90) br = !c;
    else if (op === 0xB0) br = c;
    else throw new Error('PROJECT_LOG: the branch at $24F8 is $' + op.toString(16));
    let t = M[0xA9] - M[0x70]; M[0x14] = t & 255;
    let a = (M[0xAA] - M[0x71] - (t < 0 ? 1 : 0)) & 255;
    const k = M[0x16];
    // the depth's logarithm less the result's, plus $20, into $AB/$AC
    const keep = (lo, hi, i) => {
      x = M[0xA700 + i];
      const u = M[lo] - M[0xAA00 + x]; M[0xAB] = u & 255;
      M[0xAC] = ((M[hi] - M[0xAB00 + x] - (u < 0 ? 1 : 0)) + 0x20) & 255;
    };
    if (!br) {
      if (a & 0x80) {
        a = P.EXP({ a }).a;
        const cc = a & 1; a = (a >> 1) + cc;
        M[0x14] = a & 255;
        keep(0x70, 0x71, M[0x14]);
        t = M[0xA7] - M[0x14]; M[0xA200 + k] = t & 255;
        M[0xA298 + k] = (M[0xA8] - (t < 0 ? 1 : 0)) & 255;
      } else {
        a = neg(a);
        a = P.EXP({ a }).a >> 1;
        M[0x14] = a;
        keep(0xA9, 0xAA, a);
        t = M[0x14] - M[0x32]; M[0xA200 + k] = t & 255;
        M[0xA298 + k] = (0xFF - M[0x3E] - (t < 0 ? 1 : 0)) & 255;
      }
    } else if (a & 0x80) {
      a = P.EXP({ a }).a >> 1;
      M[0x14] = a;
      keep(0x70, 0x71, a);
      t = M[0x14] - M[0x32]; M[0xA200 + k] = t & 255;
      M[0xA298 + k] = (0 - M[0x3E] - (t < 0 ? 1 : 0)) & 255;
    } else {
      a = neg(a);
      a = P.EXP({ a }).a;
      const cc = a & 1; a = (a >> 1) + cc;
      M[0x14] = a & 255;
      keep(0xA9, 0xAA, M[0x14]);
      t = M[0xA7] - M[0x14]; M[0xA200 + k] = t & 255;
      M[0xA298 + k] = (M[0xA8] - 0xFF - (t < 0 ? 1 : 0)) & 255;
    }
    return { x: k };
  };
  // PROJECT_Y ($25EA): point X's height on the screen ($A24C/$A2E4) from its height ($8040/$A330)
  // less the eye's ($37/$38), by its logarithm less $AB/$AC, turned back (EXP), measured from the
  // horizon's height ($33/$69). The 8 taken from the logarithm is the operand at $262B, which the
  // track's picture for the menus sets to $0B, a smaller scale.
  P.PROJECT_Y = r => {
    let x = r.x & 255;
    M[0x16] = x;
    let t = M[0x8040 + x] - M[0x37]; M[0x14] = t & 255;
    const hi = (M[0xA330 + x] - M[0x38] - (t < 0 ? 1 : 0)) & 255;
    if (hi & 0x80) M[0x15] = hi;
    const y = norm(hi, false);
    x = M[0x14];
    M[0xAD] = (((M[0xAB00 + x] + M[0xA610 + y]) & 255) - M[0x262B]) & 255;
    t = M[0xAA00 + x] - M[0xAB]; M[0x14] = t & 255;
    let a = (M[0xAD] - M[0xAC] - (t < 0 ? 1 : 0)) & 255;
    const k = M[0x16];
    const put = (lo, hi) => {
      t = lo - M[0x33]; M[0xA24C + k] = t & 255;
      M[0xA2E4 + k] = (hi - M[0x69] - (t < 0 ? 1 : 0)) & 255;
    };
    if (y < 8) {
      if (a & 0x80) {
        a = P.EXP({ a }).a;
        M[0x14] = a; M[0x15] = a ? 0 : 1;
        put((0 - a) & 255, M[0x15]);
      } else {
        a = neg(a);
        a = P.EXP({ a }).a;
        put(a, 0xFF);
      }
    } else if (a & 0x80) {
      a = P.EXP({ a }).a;
      put(a, 1);
    } else {
      a = neg(a);
      a = P.EXP({ a }).a;
      M[0x14] = a; M[0x15] = a ? 2 : 3;
      put((0 - a) & 255, M[0x15]);
    }
    return { x: k };
  };
  // EXP ($26D2): the antilogarithm of the logarithm in A:$14 (A from $E0 up; below it, $FF for 0
  // and 0 otherwise), from the tables at $A800-$A9FF, with the fractions at $AC00-$ADFF deciding
  // the rounding
  P.EXP = r => {
    let a = r.a & 255;
    if (a < 0xE0) return { a: a ? 0 : 0xFF };
    const sh = () => { const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; const c2 = a >> 7; a = ((a << 1) | c) & 255; return c2; };
    sh(); sh(); sh();
    if (!(a & 0x80)) {
      const x = a;
      const c = (M[0x14] & 0xFE) >= M[0xAC00 + x];
      a = M[0xA800 + x];
      return { a: c ? (a + 1) & 255 : a, x };
    }
    sh();
    if (!(a & 0x80)) {
      const x = a;
      const c = M[0x14] >= M[0xAC80 + x];
      a = M[0xA880 + x];
      return { a: c ? (a + 1) & 255 : a, x };
    }
    sh();
    const x = a;
    const c = (M[0xAD00 + x] & 0xF8) >= M[0x14];
    a = M[0xA900 + x];
    if (c) return { a, x };
    return { a: a === 0xFF ? 0xFF : a + 1, x };
  };
  // ROLL_TABLES ($2726): when the roll ($0126, and the top two bits of $0123) has changed: its sine
  // and cosine from the table at $A700; $0300-$037F the running sums of the sine (each the high
  // byte of $80 plus n times it), $0380-$03FF those of twice the cosine; $C328/$C334 half of $0100
  // plus n times the sine and $C310/$C31C n times the cosine, for n from 1 to 8. The loops
  // rewrite their own operands ($277B, $2781, $27A6, $27AD, $27B8, $27BE) as the game's do.
  P.ROLL_TABLES = r => {
    if (M[0x0126] === M[0x2806] && (M[0x0123] & 0xC0) === M[0x2807]) return {};
    let a = M[0x0123] & 0xC0;
    M[0x2807] = a; M[0x14] = a;
    a = M[0x0126]; M[0x2806] = a;
    let c = 0;
    for (let i = 0; i < 2; i++) {
      const c0 = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
      c = a >> 7; a = ((a << 1) | c0) & 255;
    }
    if (c) a = ((a ^ 0xFF) + 1) & 255;
    let y = a;
    a = M[0xA700 + y];
    M[0x277B] = a; M[0x14] = a;
    a = ((y ^ 0xFF) + 1) & 255;
    if (a) { y = a; a = M[0xA700 + y]; }
    M[0x27B8] = a; M[0x15] = a;
    // $0300-$037F
    M[0x2781] = 0;
    c = 0; y = 0; a = 0x80;
    for (;;) {
      M[M[0x2781] | (M[0x2782] << 8)] = y;
      M[0x2781] = (M[0x2781] + 1) & 255;
      if (M[0x2781] & 0x80) break;
      const t = a + M[0x277B] + c; a = t & 255; c = 0;
      if (t > 255) y = (y + 1) & 255;
    }
    // $0380-$03FF
    M[0x27BE] = 0x80;
    y = 0; a = 0x80;
    c = M[0x27B8] >> 7; M[0x27B8] = (M[0x27B8] << 1) & 255;
    if (c) {
      c = 0;
      M[0x27A6] = M[0x27B8];
      M[0x27AD] = 0x80;
      for (;;) {
        M[M[0x27AD] | (M[0x27AE] << 8)] = y;
        M[0x27AD] = (M[0x27AD] + 1) & 255;
        if (!(M[0x27AD] & 0x80)) break;
        const t = a + M[0x27A6] + c; a = t & 255; c = 0;
        y = (y + 1) & 255;
        if (t > 255) y = (y + 1) & 255;
      }
    } else {
      for (;;) {
        M[M[0x27BE] | (M[0x27BF] << 8)] = y;
        M[0x27BE] = (M[0x27BE] + 1) & 255;
        if (!(M[0x27BE] & 0x80)) break;
        const t = a + M[0x27B8] + c; a = t & 255; c = 0;
        if (t > 255) y = (y + 1) & 255;
      }
    }
    // $C328/$C334: half of $0100 plus n times the sine
    M[0xC328] = 0x80;
    y = 1; a = 0;
    for (let x = 1; x < 9; x++) {
      const t = a + M[0x14];
      a = t & 255;
      if (t > 255) y = (y + 1) & 255;
      M[0xC328 + x] = a; M[0xC334 + x] = y;
      const c0 = M[0xC334 + x] & 1;
      M[0xC334 + x] >>= 1;
      M[0xC328 + x] = (M[0xC328 + x] >> 1) | (c0 << 7);
    }
    // $C310/$C31C: n times the cosine
    y = 0; a = 0;
    for (let x = 1; x < 9; x++) {
      const t = a + M[0x15];
      a = t & 255;
      if (t > 255) y = (y + 1) & 255;
      M[0xC310 + x] = a; M[0xC31C + x] = y;
    }
    return { x: 9, y, a };
  };

  // the 6502's add and subtract, with the overflow flag
  const adcV = (a, b, c) => { const t = a + b + c, v = t & 255; return { v, c: t > 255 ? 1 : 0, o: ((a ^ v) & (b ^ v) & 0x80) ? 1 : 0 }; };
  const sbcV = (a, b, c) => { const t = a - b - (1 - c), v = t & 255; return { v, c: t >= 0 ? 1 : 0, o: ((a ^ b) & (a ^ v) & 0x80) ? 1 : 0 }; };
  // the index into the roll's tables for a coordinate below $80: $80 less it, $7F at most
  const mirror = y => { y = ((y ^ 0x7F) + 1) & 255; return (y & 0x80) ? y - 1 : y; };

  // ROLL_POINT ($2809): point X turned on the screen by the roll, about the middle ($80, $80),
  // unless it is out of sight ($A330 bit 7). ROLL_POINT_ON ($280E) takes any point. A point near
  // the middle (both high bytes 0) is turned by the tables of running sums at $0280-$03FF alone,
  // when that does not overflow; any other by ROLL_FAR.
  P.ROLL_POINT = r => (M[0xA330 + (r.x & 255)] & 0x80) ? { a: M[0xA330 + (r.x & 255)] } : P.ROLL_POINT_ON(r);
  P.ROLL_POINT_ON = r => {
    const x = r.x & 255;
    if (M[0xA298 + x] | M[0xA2E4 + x]) return P.ROLL_FAR({ x });
    let y = M[0xA200 + x], a;
    if (y & 0x80) {
      a = M[0x0300 + y];
      if (a & 0x80) return P.ROLL_FAR({ x });
      M[0x14] = a; M[0x15] = M[0x0280 + y];
    } else {
      y = mirror(y);
      a = (0 - M[0x0380 + y]) & 255;
      if (!(a & 0x80) && a) return P.ROLL_FAR({ x });
      M[0x14] = a;
      M[0x15] = (0 - M[0x0300 + y]) & 255;
    }
    y = M[0xA24C + x];
    M[0x18] = y;
    if (y & 0x80) {
      a = M[0x0300 + y];
      a = ((a >> 1) + (a & 1)) >> 1;
      M[0x16] = a;
      a = M[0x0280 + y];
    } else {
      y = mirror(y);
      a = M[0x0380 + y];
      a = ((a >> 1) + (a & 1)) >> 1;
      M[0x16] = (0 - a) & 255;
      a = (0 - M[0x0300 + y]) & 255;
    }
    let o;
    if (!(M[0x0126] & 0x80)) {
      o = sbcV(a, M[0x14], 1);
      if (o.o) return P.ROLL_FAR({ x });
      M[0xA24C + x] = o.v ^ 0x80;
      o = adcV(M[0x15], M[0x16], 0);
    } else {
      o = adcV(a, M[0x14], 0);
      if (o.o) return P.ROLL_FAR({ x });
      M[0xA24C + x] = o.v ^ 0x80;
      o = sbcV(M[0x15], M[0x16], 1);
    }
    if (!o.o) { M[0xA200 + x] = o.v ^ 0x80; return { x, a: o.v ^ 0x80 }; }
    M[0xA24C + x] = M[0x18];
    return P.ROLL_FAR({ x });
  };
  // ROLL_FAR ($28B0): point X turned by the roll with the products of its distances from the middle
  // and the roll's sine and cosine, the large part from $C310-$C33F and the small from $0300-$03FF
  P.ROLL_FAR = r => {
    let x = r.x & 255;
    M[0x0D] = x;
    // the distance across, its size split into the eighth's index (X) and the rest (Y)
    const split = (lo, hi, sign) => {
      let t = M[lo + x] - 0x80; M[0x14] = t & 255;
      let a = (M[hi + x] - (t < 0 ? 1 : 0)) & 255;
      M[sign] = a;
      if (a & 0x80) {
        t = 0 - M[0x14]; M[0x14] = t & 255;
        a = (0 - M[sign] - (t < 0 ? 1 : 0)) & 255;
      }
      const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
      a = ((a << 1) | c) & 255;
      return { i: a, j: M[0x14] >> 1 };
    };
    let s = split(0xA200, 0xA298, 0x79);
    let t = M[0x0380 + s.j] + M[0xC310 + s.i]; M[0x7E] = t & 255;
    M[0x80] = (M[0xC31C + s.i] + (t >> 8)) & 255;
    t = M[0x0300 + s.j] + M[0xC328 + s.i]; M[0x51] = t & 255;
    M[0x77] = (M[0xC334 + s.i] + (t >> 8)) & 255;
    x = M[0x0D];
    s = split(0xA24C, 0xA2E4, 0x7A);
    M[0x7F] = M[0xC31C + s.i];
    t = M[0x0380 + s.j] + M[0xC310 + s.i];
    let a = t & 255;
    if (t > 255) M[0x7F] = (M[0x7F] + 1) & 255;
    let c = M[0x7F] & 1; M[0x7F] >>= 1;
    let c2 = a & 1; a = (a >> 1) | (c << 7);
    t = a + c2; a = t & 255;
    if (t > 255) M[0x7F] = (M[0x7F] + 1) & 255;
    c = M[0x7F] & 1; M[0x7F] >>= 1;
    a = (a >> 1) | (c << 7);
    M[0x7D] = a;
    t = M[0x0300 + s.j] + M[0xC328 + s.i]; M[0x52] = t & 255;
    M[0x78] = (M[0xC334 + s.i] + (t >> 8)) & 255;
    x = M[0x0D];
    if (M[0x79] & 0x80) {
      t = 0 - M[0x51]; M[0x51] = t & 255;
      M[0x77] = (1 - M[0x77] - (t < 0 ? 1 : 0)) & 255;
    }
    if (M[0x7A] & 0x80) {
      t = 0 - M[0x52]; M[0x52] = t & 255;
      M[0x78] = (1 - M[0x78] - (t < 0 ? 1 : 0)) & 255;
    }
    if ((M[0x7A] ^ M[0x0126]) & 0x80) {
      t = M[0x51] - M[0x7D]; M[0xA200 + x] = t & 255;
      a = (M[0x77] - M[0x7F] - (t < 0 ? 1 : 0)) & 255;
    } else {
      t = M[0x51] + M[0x7D]; M[0xA200 + x] = t & 255;
      a = (M[0x77] + M[0x7F] + (t >> 8)) & 255;
    }
    M[0xA298 + x] = a;
    if ((M[0x79] ^ M[0x0126]) & 0x80) {
      t = M[0x52] + M[0x7E]; M[0xA24C + x] = t & 255;
      a = (M[0x78] + M[0x80] + (t >> 8)) & 255;
    } else {
      t = M[0x52] - M[0x7E]; M[0xA24C + x] = t & 255;
      a = (M[0x78] - M[0x80] - (t < 0 ? 1 : 0)) & 255;
    }
    M[0xA2E4 + x] = a;
    return { x, a };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
