// The car's rotation matrix and the turns of its vectors ($C9EA-$CD5B): the matrix built from the
// car's three angles, once a step of the world, and the car's velocity turned into its own frame,
// the forces the road and the springs make turned back into the world's, the spin turned into
// the three angles' speeds, and a fixed pull seen in the car's frame. The matrix's entries are
// two bytes, $0774 + X low and $079C + X high, two's complement once built.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.matrix = P => {
  const M = P.M;

  // MATRIX_PRODUCT ($CBD8): Y times $15, times 4 and rounded, into entry X: the high byte with A's
  // sign (N as it was given) in bit 7, sign and size
  P.MATRIX_PRODUCT = r => {
    const neg = r.n !== undefined ? r.n : (r.a >> 7) & 1;
    const x = r.x & 255;
    M[0x16] = 0;
    let a = P.MUL8({ a: r.y & 255 }).a & 255;
    for (let i = 0; i < 2; i++) {
      const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
      const c2 = a >> 7; a = ((a << 1) | c) & 255;
      M[0x16] = ((M[0x16] << 1) | c2) & 255;
    }
    const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
    const t = a + c;
    a = t & 255;
    if (t > 255) M[0x16] = (M[0x16] + 1) & 255;
    M[0x0774 + x] = a;
    a = M[0x16];
    if (neg) a |= 0x80;
    M[0x079C + x] = a;
    return { a, x, y: r.y, n: a >> 7, z: a ? 0 : 1 };
  };
  // MATRIX_TERM ($CC01): A times 4 into entry X, with Y's sign in bit 7 of the high byte
  P.MATRIX_TERM = r => {
    const x = r.x & 255;
    M[0x14] = r.a & 255;
    let a = (r.y & 0x80) >> 2;
    for (let i = 0; i < 2; i++) { const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; a = ((a << 1) | c) & 255; }
    M[0x079C + x] = a;
    M[0x0774 + x] = M[0x14];
    return { a: M[0x14], x, y: r.y };
  };
  // MATRIX_PRODUCT_TC ($CC17): MATRIX_PRODUCT, then MATRIX_TO_TC
  P.MATRIX_PRODUCT_TC = r => P.MATRIX_TO_TC(P.MATRIX_PRODUCT(r));
  // MATRIX_TO_TC ($CC1A): entry X from sign and size to two's complement
  P.MATRIX_TO_TC = r => {
    const x = r.x & 255;
    let a = M[0x079C + x];
    if (!(a & 0x80)) return { a, x, y: r.y, n: 0, z: a ? 0 : 1 };
    const t = 0 - M[0x0774 + x]; M[0x0774 + x] = t & 255;
    a = (0x80 - M[0x079C + x] - (t < 0 ? 1 : 0)) & 255;
    M[0x079C + x] = a;
    return { a, x, y: r.y };
  };

  // ROTATION_MATRIX ($C9EA): the car's matrix from its three angles: the heading ($0122/$0125),
  // the heading less the drift ($0189/$018A) and the pitch ($0121/$0124) through SIN_COS; the
  // products of their sines and cosines (MATRIX_PRODUCT, and MATRIX_PRODUCT_TC for those that
  // take the second's sign) and single terms (MATRIX_TERM), $07AC 4 and $0784 0. Then each entry
  // from $06 to $10 and $1A to $20 is corrected by the tables at $0300/$0380 and $C310-$C334
  // (indexed by its own size and sign), and made two's complement, its sign as the entry's and
  // $0126 say; and seven entries are sums and differences of others ($0786-$078C).
  P.ROTATION_MATRIX = r => {
    let x = r.x & 255;
    M[0x14] = M[0x0122];
    P.SIN_COS({ a: M[0x0125], x });
    M[0x44] = M[0x57]; M[0x43] = M[0x56]; M[0x79] = M[0x59]; M[0x7A] = M[0x58];
    let t = M[0x0122] - M[0x0189]; M[0x14] = t & 255;
    P.SIN_COS({ a: (M[0x0125] - M[0x018A] - (t < 0 ? 1 : 0)) & 255, x });
    M[0x51] = M[0x57]; M[0x52] = M[0x56]; M[0x77] = M[0x59]; M[0x78] = M[0x58];
    M[0x14] = M[0x0121];
    P.SIN_COS({ a: M[0x0124], x });
    M[0x15] = M[0x56];
    P.MATRIX_PRODUCT({ x: 0x06, y: M[0x43], a: M[0x58] ^ M[0x7A] });
    P.MATRIX_PRODUCT({ x: 0x08, y: M[0x44], a: M[0x58] ^ M[0x79] });
    P.MATRIX_PRODUCT({ x: 0x1A, y: M[0x52], a: M[0x58] ^ M[0x78] });
    P.MATRIX_PRODUCT({ x: 0x1C, y: M[0x51], a: M[0x58] ^ M[0x77] });
    M[0x15] = M[0x57];
    P.MATRIX_PRODUCT_TC({ x: 0x02, y: M[0x43], a: M[0x59] ^ M[0x7A] });
    P.MATRIX_PRODUCT_TC({ x: 0x03, y: M[0x44], a: M[0x59] ^ M[0x79] });
    P.MATRIX_PRODUCT_TC({ x: 0x22, y: M[0x52], a: M[0x59] ^ M[0x78] });
    P.MATRIX_PRODUCT_TC({ x: 0x23, y: M[0x51], a: M[0x59] ^ M[0x77] });
    P.MATRIX_TO_TC(P.MATRIX_TERM({ x: 0x04, a: M[0x56], y: M[0x58] }));
    P.MATRIX_TERM({ x: 0x1E, a: M[0x51], y: M[0x77] });
    P.MATRIX_TERM({ x: 0x20, a: M[0x52], y: M[0x78] });
    M[0x07AC] = 4; M[0x0784] = 0;
    P.MATRIX_TERM({ x: 0x0A, a: M[0x43], y: M[0x7A] });
    P.MATRIX_TERM({ x: 0x0C, a: M[0x44], y: M[0x79] });
    P.MATRIX_TERM({ x: 0x0E, a: M[0x57], y: M[0x59] });
    // the corrections, entries $06-$10 and $1A-$20
    let y = 6;
    while (y < 0x22) {
      M[0x0D] = y;
      M[0x14] = M[0x0774 + y];
      let a = M[0x079C + y];
      M[0x5A] = a;
      const c0 = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
      a = ((a << 1) | c0) & 255;
      x = a;
      const k = M[0x14] >> 1;
      t = M[0x0380 + k] + M[0xC310 + x]; M[0x14] = t & 255;
      a = (M[0xC31C + x] + (t >> 8)) & 255;
      M[0x14] = (M[0x14] >> 1) | ((a & 1) << 7); a >>= 1;
      M[0x15] = a;
      t = M[0x0300 + k] + M[0xC328 + x];
      a = (t & 255) ^ 0x80;
      M[0x16] = a;
      const hi0 = (a & 0x80) ? 0xFF : 0;
      a = (hi0 + M[0xC334 + x] + (t >> 8)) & 255;
      if (M[0x5A] & 0x80) {
        M[0x17] = a;
        t = 0 - M[0x16]; M[0x16] = t & 255;
        a = (0 - M[0x17] - (t < 0 ? 1 : 0)) & 255;
      }
      y = M[0x0D];
      M[0x079D + y] = a;
      M[0x0775 + y] = M[0x16];
      if ((M[0x5A] ^ M[0x0126]) & 0x80) {
        t = 0 - M[0x14]; M[0x14] = t & 255;
        M[0x15] = (0 - M[0x15] - (t < 0 ? 1 : 0)) & 255;
      }
      M[0x0774 + y] = M[0x14];
      M[0x079C + y] = M[0x15];
      y += 2;
      if (y === 0x12) y = 0x1A;
    }
    const sub = (lo, hi, alo, ahi, blo, bhi) => {
      const u = M[alo] - M[blo]; M[lo] = u & 255;
      M[hi] = (M[ahi] - M[bhi] - (u < 0 ? 1 : 0)) & 255;
    };
    sub(0x0788, 0x07B0, 0x0780, 0x07A8, 0x077B, 0x07A3);
    t = 0 - M[0x077D]; M[0x14] = t & 255;
    M[0x15] = (0 - M[0x07A5] - (t < 0 ? 1 : 0)) & 255;
    sub(0x0789, 0x07B1, 0x14, 0x15, 0x077E, 0x07A6);
    t = M[0x0781] + M[0x077A]; M[0x078A] = t & 255;
    M[0x07B2] = (M[0x07A9] + M[0x07A2] + (t >> 8)) & 255;
    sub(0x078B, 0x07B3, 0x077C, 0x07A4, 0x077F, 0x07A7);
    t = 0 - M[0x0782]; M[0x078C] = t & 255;
    M[0x07B4] = (0 - M[0x07AA] - (t < 0 ? 1 : 0)) & 255;
    t = 0 - M[0x0784]; M[0x0786] = t & 255;
    const a = (0 - M[0x07AC] - (t < 0 ? 1 : 0)) & 255;
    M[0x07AE] = a;
    return { a, x, y };
  };

  // the sum of two or three two-byte numbers, each times a matrix entry (MUL_S16_MATRIX): their
  // low bytes at src, their high bytes `up` on, the entries in ents; the sum into lo and hi
  const turn = (src, up, ents, lo, hi) => {
    M[0x14] = M[src[0]];
    M[0x77] = P.MUL_S16_MATRIX({ a: M[src[0] + up], x: ents[0] }).a & 255;
    M[0x51] = M[0x14];
    let last = null;
    for (let i = 1; i < src.length; i++) {
      M[0x14] = M[src[i]];
      const q = P.MUL_S16_MATRIX({ a: M[src[i] + up], x: ents[i] });
      const xv = q.a & 255;
      const t = M[0x14] + M[0x51];
      if (i < src.length - 1) {
        M[0x51] = t & 255;
        M[0x77] = (xv + M[0x77] + (t >> 8)) & 255;
      } else {
        M[lo] = t & 255;
        M[hi] = (xv + M[0x77] + (t >> 8)) & 255;
        last = { a: M[hi], x: xv };
      }
    }
    return last;
  };
  // VELOCITY_TO_CAR ($CC31): the velocity ($0109-$010B, high bytes $010F-$0111) turned into the
  // car's frame for its axes 2 and 0, by the matrix entries listed at $AFC0, $AFC3 and $AFC6:
  // the speeds along the road at $0154/$0157 and $0156/$0159
  P.VELOCITY_TO_CAR = r => {
    let q;
    for (let y = 2; y >= 0; y -= 2)
      q = turn([0x0109, 0x010A, 0x010B], 6, [M[0xAFC0 + y], M[0xAFC3 + y], M[0xAFC6 + y]], 0x0154 + y, 0x0157 + y);
    return Object.assign({}, q, { y: 0xFE });
  };
  // FORCES_TO_WORLD ($CCB3): the forces in the car's frame ($015A-$015C, high bytes $015D-$015F)
  // turned into the world's for each axis, by the entries listed at $AFC9, $AFCC and $AFCF: the
  // forces at $0115/$011B
  P.FORCES_TO_WORLD = r => {
    let q;
    for (let y = 2; y >= 0; y--)
      q = turn([0x015A, 0x015B, 0x015C], 3, [M[0xAFC9 + y], M[0xAFCC + y], M[0xAFCF + y]], 0x0115 + y, 0x011B + y);
    return Object.assign({}, q, { y: 0xFF });
  };
  // SPIN_TO_ANGLES ($CD05): the spin ($010C/$010D, high bytes $0112/$0113) turned into the speeds
  // of the pitch and the roll ($016A/$016D, $016B/$016E) by the entries listed at $AFD2 and
  // $AFD4; the heading's speed ($016C/$016F) the spin's third axis ($010E/$0114) plus the roll's
  // speed times entry 4
  P.SPIN_TO_ANGLES = r => {
    for (let y = 1; y >= 0; y--) turn([0x010C, 0x010D], 6, [M[0xAFD2 + y], M[0xAFD4 + y]], 0x016A + y, 0x016D + y);
    M[0x14] = M[0x016B];
    M[0x15] = P.MUL_S16_MATRIX({ a: M[0x016E], x: 4 }).a & 255;
    const t = M[0x010E] + M[0x14]; M[0x016C] = t & 255;
    const a = (M[0x0114] + M[0x15] + (t >> 8)) & 255;
    M[0x016F] = a;
    return { a, x: 4, y: 0xFF };
  };
  // PULL_IN_CAR ($CC84): a fixed pull along one of the world's axes seen in the car's frame: the
  // matrix entries $0F, $04 and $0E times 5/16 (FIVE_SIXTEENTHS, the last negated) into
  // $0140/$013D, $0141/$013E and $013F/$013C
  P.PULL_IN_CAR = r => {
    M[0x5A] = 0x80;
    M[0x0140] = P.FIVE_SIXTEENTHS({ x: 0x0F }).a & 255; M[0x013D] = M[0x14];
    M[0x0141] = P.FIVE_SIXTEENTHS({ x: 0x04 }).a & 255; M[0x013E] = M[0x14];
    const q = P.NEG16(P.FIVE_SIXTEENTHS({ x: 0x0E }));
    M[0x013F] = q.a & 255; M[0x013C] = M[0x14];
    return { a: M[0x14], x: 0x0E, y: r.y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
