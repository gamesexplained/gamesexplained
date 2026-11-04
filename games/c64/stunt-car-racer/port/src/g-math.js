// The arithmetic ($C782-$C9E9, $CFB7, $FF8E, $FF90): an 8-bit multiply that everything else is
// built on, signed multiplies of 16 bits by 8, the sine and cosine, an interpolated table that
// turns a cosine back into an angle, a square, a shift by any count, and the two-byte helpers the
// physics leans on. Scratch: $14-$19, $56-$59, $5A (the product's sign), $C37F, $C380, $C381, $C780.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.math = P => {
  const M = P.M;
  const nz = v => ({ n: (v >> 7) & 1, z: (v & 255) === 0 ? 1 : 0 });

  // MUL8 ($C782): A times $15, unsigned: the high byte in A, the low in $14. The carry comes
  // back clear, N and Z from the low byte.
  P.MUL8 = r => {
    const p = (r.a & 255) * M[0x15];
    M[0x14] = p & 255;
    return Object.assign({ a: p >> 8, c: 0 }, nz(p & 255));
  };
  // negate A:$14 as a two-byte number when N is set (NEG16_IF_MINUS, $C8BD), always from $C8BF
  // (NEG16): A is the high byte; $15 is left holding the high byte it was given
  const neg16 = a => {
    M[0x15] = a;
    const lo = (0 - M[0x14]) & 255, b = M[0x14] ? 1 : 0;
    M[0x14] = lo;
    const t = 0 - a - b;
    return Object.assign({ a: t & 255, c: t >= 0 ? 1 : 0 }, nz(t & 255));
  };
  P.NEG16_IF_MINUS = r => (r.n ? neg16(r.a & 255) : { a: r.a & 255, n: 0, c: r.c });
  P.NEG16 = r => neg16(r.a & 255);

  // SIN_COS ($C7D7): the angle in A:$14 (a whole turn is $10000), plus $0020 to round it to the
  // table's 512 steps; $56 and $57 the two signed bytes from the quarter-wave table at $A700 (the
  // first as the angle's sine, the second as its cosine, each read by the other's index), $58 the
  // rounded angle's high byte and $59 its quadrant bits for the callers' signs. X is kept.
  P.SIN_COS = r => {
    const x = r.x & 255;
    let t = M[0x14] + 0x20;
    M[0x14] = t & 255;
    let a = ((r.a & 255) + (t >> 8)) & 255;
    M[0x58] = a;
    M[0xC780] = x;
    let c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
    a = ((a << 1) | c) & 255;
    M[0x59] = a ^ M[0x58];
    let cy;
    if (!(a & 0x80)) {
      c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255;
    } else {
      c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255;
      t = (a ^ 0xFF) + 1; a = t & 255; cy = t > 255 ? 1 : 0;
      if (!a) {
        M[0x57] = 0;
        a = M[0xA700];
        if (a) { M[0x56] = a; return Object.assign({ a, x: M[0xC780], c: cy }, nz(M[0xC780])); }
        // a table that began with 0 would run on here
        c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255;
      }
    }
    M[0x57] = M[0xA700 + a];
    t = (a ^ 0xFF) + 1; cy = t > 255 ? 1 : 0; a = t & 255;
    if (a) a = M[0xA700 + a];
    M[0x56] = a;
    return Object.assign({ a, x: M[0xC780], c: cy }, nz(M[0xC780]));
  };

  // MUL_S8_U8 ($C81E): A signed times $15, the sign of the other factor in $5A's bit 7: the
  // product's two bytes in A (high) and $14
  P.MUL_S8_U8 = r => {
    let a = r.a & 255, neg = !!(M[0x5A] & 0x80);
    if (a & 0x80) { a = (-a) & 255; neg = !neg; }
    const p = P.MUL8({ a });
    if (!neg) return p;
    M[0xC37F] = p.a;
    const lo = (0 - M[0x14]) & 255, b = M[0x14] ? 1 : 0;
    M[0x14] = lo;
    const t = 0 - p.a - b;
    return Object.assign({ a: t & 255, c: t >= 0 ? 1 : 0 }, nz(t & 255));
  };
  // The tail the multiplies share ($C894): $16:$14 a magnitude, A its sign byte, $15 the factor;
  // the product's top two bytes in A:$14 with the sign $5A ends up holding
  const mulTail = a => {
    a = (a ^ M[0x5A]) & 255;
    M[0x5A] = a;
    let r = P.MUL8({ a: M[0x14] });
    M[0x17] = r.a;
    let hi, c = 0;
    if (!M[0x16]) { M[0x14] = M[0x17]; hi = 0; }
    else {
      r = P.MUL8({ a: M[0x16] });
      M[0x15] = r.a;
      const t = M[0x17] + M[0x14];
      M[0x14] = t & 255;
      c = M[0x15] + (t >> 8) > 255 ? 1 : 0;
      hi = (M[0x15] + (t >> 8)) & 255;
    }
    if (M[0x5A] & 0x80) return neg16(hi);
    return Object.assign({ a: hi, c }, nz(hi), { n: 0 });
  };
  // MUL_S16_U8 ($C845): A:$14 signed times $15 over 256, positive factor ($5A's sign cleared)
  P.MUL_S16_U8 = r => { M[0x5A] >>= 1; return P.MUL_S16_S8({ a: r.a }); };
  // MUL_S16_S8 ($C847): A:$14 signed times $15 over 256, the factor's sign in $5A's bit 7
  P.MUL_S16_S8 = r => {
    let a = r.a & 255;
    M[0x17] = a;
    if (a & 0x80) {
      const lo = (0 - M[0x14]) & 255, b = M[0x14] ? 1 : 0;
      M[0x14] = lo; a = (0 - M[0x17] - b) & 255;
    }
    M[0x16] = a;
    return mulTail(M[0x17]);
  };
  // MUL_S16_MATRIX ($C85F): A:$14 signed times the matrix entry X (the two bytes at $0774,X and
  // $079C,X, a quarter of it in $15), over 256
  P.MUL_S16_MATRIX = r => {
    let a = r.a & 255;
    const x = r.x & 255;
    M[0x5A] = a;
    if (a & 0x80) {
      const lo = (0 - M[0x14]) & 255, b = M[0x14] ? 1 : 0;
      M[0x14] = lo; a = (0 - M[0x5A] - b) & 255;
    }
    M[0x16] = a;
    M[0x15] = M[0x0774 + x];
    a = M[0x079C + x];
    M[0xC380] = a;
    if (a & 0x80) {
      const lo = (0 - M[0x15]) & 255, b = M[0x15] ? 1 : 0;
      M[0x15] = lo; a = (0 - M[0xC380] - b) & 255;
    }
    for (let i = 0; i < 2; i++) { const c = a & 1; a >>= 1; M[0x15] = (M[0x15] >> 1) | (c << 7); }
    return mulTail(M[0xC380]);
  };

  // SINE16 ($C8CD): the sine of the angle in A:$14 (a whole turn $10000), signed, in A:$14: the
  // quarter-wave table at $A700 (counted from its far end for the first and third quarters, bit 6
  // clear) with a straight line between its steps, $AD00 their extra bits; bit 7 the sign
  P.SINE16 = r => {
    let a = r.a & 255;
    M[0x58] = a;
    if (!(a & 0x40)) {
      const t = 0xFF - M[0x14]; M[0x14] = t & 255;
      a = (0xFF - M[0x58] - (t < 0 ? 1 : 0)) & 255;
    }
    for (let i = 0; i < 2; i++) { const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255; }
    const x = a;
    if (x === 0xFF) { M[0x14] = 0; return { a: 0, x, z: 1, n: 0 }; }
    M[0x15] = (M[0xAD01 + x] << 5) & 255;
    M[0x16] = (M[0xAD00 + x] << 5) & 255;
    let t = M[0x16] - M[0x15];
    M[0x15] = t & 255;
    let cy = t >= 0 ? 1 : 0;
    M[0x17] = M[0xA700 + x];
    t = M[0xA700 + x] - M[0xA701 + x] - (1 - cy);
    a = t & 255;
    M[0x15] = (M[0x15] >> 1) | ((a & 1) << 7); a >>= 1;
    const p = P.MUL8({ a: M[0x14] });
    M[0x15] = p.a;
    M[0x16] = (M[0x16] >> 1) | ((M[0x17] & 1) << 7); M[0x17] >>= 1;
    t = M[0x16] - M[0x15];
    M[0x14] = t & 255;
    a = (M[0x17] - (t < 0 ? 1 : 0)) & 255;
    for (let i = 0; i < 4; i++) { M[0x14] = (M[0x14] >> 1) | ((a & 1) << 7); a >>= 1; }
    const out = P.NEG16_IF_MINUS({ a, n: M[0x58] >> 7 });
    return Object.assign({ x }, out);
  };

  // FIVE_SIXTEENTHS ($C93A): the matrix entry X times 5/16, negated when $5A is negative
  P.FIVE_SIXTEENTHS = r => {
    const x = r.x & 255;
    const hi = M[0x079C + x], neg = hi & 0x80;
    const v = ((hi << 8 | M[0x0774 + x]) << 16) >> 16;
    const v1 = (v >> 1) & 0xFFFF, v2 = (v >> 3) & 0xFFFF;
    M[0x15] = v1 >> 8; M[0x17] = v2 >> 8;
    // the last shift brings in the sign of the entry, not of the sum
    const s = (((v1 + v2) & 0xFFFF) >> 1) | (neg ? 0x8000 : 0);
    M[0x14] = s & 255; M[0x18] = neg ? 0x0F : 0;
    return P.NEG16_IF_MINUS({ a: s >> 8, n: M[0x5A] >> 7 });
  };

  // SQUARE_S16 ($C976): the square of A:Y (signed), four bytes at $16-$19
  P.SQUARE_S16 = r => {
    let a = r.a & 255, y = r.y & 255;
    if (a & 0x80) {
      M[0x15] = a; M[0x14] = y;
      const t = 0 - M[0x14]; y = t & 255;
      a = (0 - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    }
    M[0x15] = a;
    const hi = a;
    let p = P.MUL8({ a });
    M[0x19] = p.a; M[0x18] = M[0x14];
    M[0x15] = y;
    p = P.MUL8({ a: y });
    M[0x17] = p.a; M[0x16] = M[0x14];
    p = P.MUL8({ a: hi });
    let c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
    let a2 = (p.a << 1) | c;
    if (a2 > 255) M[0x19] = (M[0x19] + 1) & 255;
    a2 &= 255;
    M[0x15] = a2;
    let t = M[0x17] + M[0x14];
    M[0x17] = t & 255;
    t = M[0x18] + M[0x15] + (t >> 8);
    M[0x18] = t & 255;
    if (t > 255) M[0x19] = (M[0x19] + 1) & 255;
    return { a: t & 255, y, c: t > 255 ? 1 : 0 };
  };

  // SHIFT16 ($C9BF): A:$14 shifted by Y, right for 1 to $7F (the sign shifted in from $C381, which
  // runs out after eight), left for $80 and up (by 256 - Y, the bits that leave the top in $2D)
  P.SHIFT16 = r => {
    let a = r.a & 255, y = r.y & 255;
    M[0x2D] = 0; M[0xC381] = 0;
    if (a & 0x80) { M[0x2D] = 0xFF; M[0xC381] = 0xFF; }
    if (y >= 0x80) {
      let c = 0;
      do {
        c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
        const c2 = a >> 7; a = ((a << 1) | c) & 255;
        c = M[0x2D] >> 7; M[0x2D] = ((M[0x2D] << 1) | c2) & 255;
        y = (y + 1) & 255;
      } while (y);
      return { a, y: 0, c, z: 1, n: 0 };
    }
    if (!y) return { a, y: 0, c: 1, z: 1, n: 0 };
    let c = 0;
    do {
      c = M[0xC381] & 1; M[0xC381] >>= 1;
      const c2 = a & 1; a = (a >> 1) | (c << 7);
      c = M[0x14] & 1; M[0x14] = (M[0x14] >> 1) | (c2 << 7);
      y--;
    } while (y);
    return { a, y: 0, c, z: 1, n: 0 };
  };

  // ADD16_18 ($CFB7): A:$14 plus $19:$18, the high byte in A; $15 holds A as it came
  P.ADD16_18 = r => {
    M[0x15] = r.a & 255;
    let t = M[0x18] + M[0x14];
    M[0x14] = t & 255;
    t = M[0x19] + M[0x15] + (t >> 8);
    return Object.assign({ a: t & 255, c: t > 255 ? 1 : 0 }, nz(t & 255));
  };
  // A_TO_15 ($FF8E): A to $15, then LOAD_14 ($FF90): $14 to A and the carry clear, ready for a sum
  P.A_TO_15 = r => { M[0x15] = r.a & 255; return P.LOAD_14(r); };
  P.LOAD_14 = r => Object.assign({ a: M[0x14], c: 0 }, nz(M[0x14]));
};
})(typeof window !== 'undefined' ? window : globalThis);
