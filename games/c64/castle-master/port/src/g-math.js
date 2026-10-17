// The arithmetic every other routine leans on ($2470-$274C): signed multiplies and divides by
// shift and add, on the shared workspace $82-$8D with the sign count in $1056. Each keeps the
// game's quirks: the 16-by-8 multiply masks interrupts around itself and reads the interrupt's
// own flag $1C72 to decide whether to unmask them again, the 24-by-16 divide keeps its two signs
// in its own bytes $259D/$259E, and the 32-by-16 divide gives the remainder's magnitude only.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.math = function (P) {
  const M = P.M;
  const R = (r, o) => Object.assign({}, r, o);
  // two's complement of the bytes at the addresses given, low first
  const negate = (...as) => {
    let borrow = 0;
    for (const a of as) { const v = 0 - M[a] - borrow; M[a] = v & 255; borrow = v < 0 ? 1 : 0; }
  };

  // MUL_S16_S8_TO_S24: A/X (low, high) times Y, signed, into $82-$84 ($85 the multiplicand's
  // third byte as it shifts). A factor of 0 leaves the product 0 at once.
  P.MUL_S16_S8_TO_S24 = function (r) {
    let x = r.x;
    M[0x88] = r.a; M[0x89] = r.x; M[0x8C] = r.y;
    M[0x1056] = 0; M[0x82] = 0; M[0x83] = 0; M[0x84] = 0; M[0x85] = 0;
    run: {
      if (r.y === 0) break run;
      if (r.y & 0x80) { M[0x8C] = (0 - M[0x8C]) & 255; M[0x1056]++; }
      if (r.x === 0) { if (M[0x88] === 0) break run; }
      else if (r.x & 0x80) { negate(0x88, 0x89); M[0x1056]++; }
      for (x = 8; x > 0; x--) {
        const b = M[0x8C] & 1; M[0x8C] >>= 1;
        if (b) {
          let s = M[0x82] + M[0x88]; M[0x82] = s & 255;
          s = M[0x83] + M[0x89] + (s >> 8); M[0x83] = s & 255;
          s = M[0x84] + M[0x85] + (s >> 8); M[0x84] = s & 255;
        }
        const c1 = M[0x88] >> 7; M[0x88] = (M[0x88] << 1) & 255;
        const c2 = M[0x89] >> 7; M[0x89] = ((M[0x89] << 1) | c1) & 255;
        M[0x85] = ((M[0x85] << 1) | c2) & 255;
      }
      if (M[0x1056] === 1) negate(0x82, 0x83, 0x84);
    }
    return R(r, { a: M[0x1C72], x });
  };

  // MUL_S16_S16_TO_S32: $88/$89 times $8C/$8D, signed, into $82-$85. Either factor 0 leaves 0.
  P.MUL_S16_S16_TO_S32 = function (r) {
    M[0x1056] = 0; M[0x82] = 0; M[0x83] = 0; M[0x84] = 0; M[0x85] = 0;
    if ((M[0x88] | M[0x89]) === 0) return R(r, { a: 0 });
    if ((M[0x8C] | M[0x8D]) === 0) return R(r, { a: 0 });
    if (M[0x8D] & 0x80) { negate(0x8C, 0x8D); M[0x1056]++; }
    if (M[0x89] & 0x80) { negate(0x88, 0x89); M[0x1056]++; }
    let c = 0;
    for (let x = 17; x > 0; x--) {
      // ROR $85, $84, $89, $88: a 32-bit shift right through the carry
      let n;
      n = M[0x85] & 1; M[0x85] = (M[0x85] >> 1) | (c << 7); c = n;
      n = M[0x84] & 1; M[0x84] = (M[0x84] >> 1) | (c << 7); c = n;
      n = M[0x89] & 1; M[0x89] = (M[0x89] >> 1) | (c << 7); c = n;
      n = M[0x88] & 1; M[0x88] = (M[0x88] >> 1) | (c << 7); c = n;
      if (c) {
        let s = M[0x8C] + M[0x84]; M[0x84] = s & 255;
        s = M[0x8D] + M[0x85] + (s >> 8); M[0x85] = s & 255; c = s >> 8;
      }
    }
    if (M[0x1056] === 1) {
      M[0x85] ^= 0xFF; M[0x84] ^= 0xFF; M[0x83] = M[0x89] ^ 0xFF;
      const s = (M[0x88] ^ 0xFF) + 1; M[0x82] = s & 255;
      if (s > 255) { M[0x83] = (M[0x83] + 1) & 255; if (!M[0x83]) { M[0x84] = (M[0x84] + 1) & 255; if (!M[0x84]) M[0x85] = (M[0x85] + 1) & 255; } }
      return R(r, { a: M[0x82], x: 0 });
    }
    M[0x83] = M[0x89]; M[0x82] = M[0x88];
    return R(r, { a: M[0x82], x: 0 });
  };

  // DIV_S24_BY_S16: A/X/Y (low to high) by $8C/$8D, signed: the quotient to $88-$8A and the
  // remainder, with the dividend's sign, to $82-$84. No guard against a divisor of 0.
  P.DIV_S24_BY_S16 = function (r) {
    M[0x88] = r.a; M[0x89] = r.x; M[0x8A] = r.y;
    M[0x259E] = M[0x8A]; M[0x259D] = M[0x8A] ^ M[0x8D];
    if (M[0x8D] & 0x80) negate(0x8C, 0x8D);
    if (M[0x8A] & 0x80) negate(0x88, 0x89, 0x8A);
    M[0x82] = 0; M[0x83] = 0; M[0x84] = 0;
    let c = 0, y = r.y, a;
    const rol = (adr) => { const n = M[adr] >> 7; M[adr] = ((M[adr] << 1) | c) & 255; c = n; };
    for (let x = 24; x > 0; x--) {
      rol(0x88); rol(0x89); rol(0x8A); rol(0x82); rol(0x83); rol(0x84);
      let s = M[0x82] - M[0x8C]; y = s & 255; let b = s < 0 ? 1 : 0;
      s = M[0x83] - M[0x8D] - b; const hi = s & 255; b = s < 0 ? 1 : 0;
      s = M[0x84] - b; a = s & 255; b = s < 0 ? 1 : 0;
      if (!b) { M[0x84] = a; M[0x83] = hi; M[0x82] = y; c = 1; } else c = 0;
    }
    rol(0x88); rol(0x89); rol(0x8A);
    if (M[0x259D] & 0x80) negate(0x88, 0x89, 0x8A);
    if (M[0x259E] & 0x80) { negate(0x82, 0x83, 0x84); a = M[0x84]; } else a = M[0x259E];
    return R(r, { a, x: 0, y });
  };

  // MUL_S8_S8_TO_S16: X times Y, signed, into $82/$83. Either factor 0 leaves 0.
  P.MUL_S8_S8_TO_S16 = function (r) {
    M[0x1056] = 0; M[0x83] = 0; M[0x82] = 0;
    let x = r.x, a;
    if (x === 0) return R(r, { a: 0 });
    if (x & 0x80) { M[0x1056]++; M[0x84] = x; x = (0 - x) & 255; }
    a = r.y;
    if (a === 0) return R(r, { a: 0, x });
    if (a & 0x80) { M[0x1056]++; M[0x84] = a; a = (0 - a) & 255; }
    M[0x8C] = x; M[0x88] = a; M[0x84] = 0;
    for (x = 8; x > 0; x--) {
      const b = M[0x88] & 1; M[0x88] >>= 1;
      if (b) { let s = M[0x82] + M[0x8C]; M[0x82] = s & 255; s = M[0x83] + M[0x84] + (s >> 8); M[0x83] = s & 255; }
      const c = M[0x8C] >> 7; M[0x8C] = (M[0x8C] << 1) & 255; M[0x84] = ((M[0x84] << 1) | c) & 255;
    }
    if (M[0x1056] !== 1) return R(r, { a: M[0x1056], x: 0 });
    M[0x82] = 255 - M[0x82]; M[0x83] = 255 - M[0x83]; a = M[0x83];
    M[0x82] = (M[0x82] + 1) & 255; if (!M[0x82]) M[0x83] = (M[0x83] + 1) & 255;
    return R(r, { a, x: 0 });
  };

  // DIV_S32_BY_S16: $88-$8B by $8C/$8D, signed: the quotient to $88-$8B, the remainder's
  // magnitude to $82/$83. A dividend or divisor of 0 returns at once.
  P.DIV_S32_BY_S16 = function (r) {
    M[0x82] = 0; M[0x83] = 0; M[0x1056] = 0;
    if ((M[0x88] | M[0x89] | M[0x8A] | M[0x8B]) === 0) return R(r, { a: 0 });
    if ((M[0x8C] | M[0x8D]) === 0) return R(r, { a: 0 });
    if (M[0x8B] & 0x80) { M[0x1056]++; negate(0x88, 0x89, 0x8A, 0x8B); }
    if (M[0x8D] & 0x80) { M[0x1056]++; negate(0x8C, 0x8D); }
    let c = 0, y = r.y, a;
    const rol = (adr) => { const n = M[adr] >> 7; M[adr] = ((M[adr] << 1) | c) & 255; c = n; };
    for (let x = 32; x > 0; x--) {
      rol(0x88); rol(0x89); rol(0x8A); rol(0x8B); rol(0x82); rol(0x83);
      let s = M[0x82] - M[0x8C]; y = s & 255; const b = s < 0 ? 1 : 0;
      s = M[0x83] - M[0x8D] - b; a = s & 255;
      if (s >= 0) { M[0x83] = a; M[0x82] = y; c = 1; } else c = 0;
    }
    rol(0x88); rol(0x89); rol(0x8A); rol(0x8B);
    a = M[0x1056];
    if (a === 1) { negate(0x88, 0x89, 0x8A, 0x8B); a = M[0x8B]; }
    return R(r, { a, x: 0, y });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
