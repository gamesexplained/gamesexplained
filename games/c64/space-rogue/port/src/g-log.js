// The arithmetic of numbers in log form, SEG0's $B26B-$B670 and $B771: the engine multiplies and
// divides by adding and subtracting logarithms, and adds two numbers in log form with a table of
// corrections. A number in log form is a 16-bit base-2 logarithm, $60 its whole part (signed) and
// $5F its fraction in 256ths, with the number's sign in bit 7 of $61; the second operand of an
// addition is $62/$63 with its sign in $64. In linear form a number is 24 bits, 16.8 fixed point,
// in $5F-$61. The tables are the game's: the corrections for an addition at $A500-$A9FF (by the
// difference d of the two logs, d's whole part picking the page), for a subtraction at $AA00-$ADFF
// and, for d below 1.0, $AE00/$AF00; log_table ($B16B) and exp_table_lo/hi ($AF6B, $B06B) for the
// conversions. Several of the routines patch their own operands, which are game memory and are
// written here too.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.log = function (P) {
  const M = P.M;

  // ---- addition and subtraction. Each leaves X as the low byte of the difference d of the two
  // logs and the carry as the game's code leaves it; Y is never touched.
  P.log_add = r => ((M[0x61] ^ M[0x64]) & 0x80 ? P.log_sub_mag(r) : P.log_add_mag(r));
  P.log_sub = r => ((M[0x61] ^ M[0x64]) & 0x80 ? P.log_add_mag(r) : P.log_sub_mag(r));

  // log(|a| + |b|): the larger log plus a correction by d, from the table below 5.0, by ranges of
  // d's low byte from 5.0 to 9.53, nothing above
  P.log_add_mag = function (r) {
    let s = M[0x5F] - M[0x62], x = s & 255;
    let hi = (M[0x60] - M[0x63] - (s < 0 ? 1 : 0)) & 255;
    if (hi & 0x80) {                        // b is the larger: d = b - a, and b the result's base
      s = M[0x62] - M[0x5F];
      M[0xB3B9] = s & 255;
      hi = (M[0x63] - M[0x60] - (s < 0 ? 1 : 0)) & 255;
      M[0x5F] = M[0x62]; M[0x60] = M[0x63];
      x = M[0xB3B9];
    }
    if (hi < 5) {
      M[0xB3C8] = hi + 0xA5;
      const t = M[0x5F] + M[(hi + 0xA5) << 8 | x] + 1;
      M[0x5F] = t & 255;
      if (t > 255) { M[0x60] = (M[0x60] + 1) & 255; return R(r, x, 1); }
      return R(r, x, 0);
    }
    let v;
    if (hi === 5) v = x < 0x44 ? 0xF5 + (x >= 0x1E) : x < 0x9C ? 0xF7 + (x >= 0x6D) : 0xF9 + (x >= 0xD1);
    else if (hi === 6) v = x < 0x5A ? 0xFA + (x >= 0x0F) : 0xFC + (x >= 0xB7);
    else if (hi === 7) v = 0xFD + (x >= 0xF1) + (x >= 0x34);
    else if (hi === 8) return inc(r, x, 0);
    else if (hi === 9) return x >= 0x88 ? R(r, x, 1) : inc(r, x, 0);
    else return R(r, x, 1);
    // d of 5.0 to 7.99: 256 less the correction, patched into an SBC #
    M[0xB411] = v;
    const c = M[0x5F] >= v ? 1 : 0;
    M[0x5F] = (M[0x5F] - v) & 255;
    if (c) M[0x60] = (M[0x60] + 1) & 255;
    return R(r, x, c);
  };
  const R = (r, x, c) => ({ a: r && r.a, x, y: r && r.y, c });
  const inc = (r, x, c) => { M[0x5F] = (M[0x5F] + 1) & 255; if (!M[0x5F]) M[0x60] = (M[0x60] + 1) & 255; return R(r, x, c); };
  const dec = (r, x, c) => { if (!M[0x5F]) M[0x60] = (M[0x60] - 1) & 255; M[0x5F] = (M[0x5F] - 1) & 255; return R(r, x, c); };

  // log(|a| - |b|) with a's sign; when |b| is the larger, b - a with the sign flipped
  P.log_sub_mag = function (r) {
    const s = M[0x5F] - M[0x62], x = s & 255;
    const hi = (M[0x60] - M[0x63] - (s < 0 ? 1 : 0)) & 255;
    if (hi & 0x80) { M[0x61] ^= 0xFF; return subSwapped(r); }
    return subFrom(r, x, hi);
  };
  // the same with no sign test: b - a with no flip when |b| is the larger (the unused arcsine's)
  P.s_B2E7 = function (r) {
    const s = M[0x5F] - M[0x62], x = s & 255;
    const hi = (M[0x60] - M[0x63] - (s < 0 ? 1 : 0)) & 255;
    if (hi & 0x80) return subSwapped(r);
    return subFrom(r, x, hi);
  };
  // a - b with a the larger, d = hi:x
  function subFrom(r, x, hi) {
    if (hi === 0) return subNear(r, x, M[0x5F], M[0x60]);
    if (hi < 5) {
      M[0xB353] = hi + 0xA9;
      const t = M[0x5F] - M[(hi + 0xA9) << 8 | x] - 1;
      M[0x5F] = t & 255;
      if (t < 0) { M[0x60] = (M[0x60] - 1) & 255; return R(r, x, 0); }
      return R(r, x, 1);
    }
    return subFar(r, x, hi);
  }
  // d below 1.0: the 16-bit correction from $AE00/$AF00, its high byte 1 from $6B on (the table
  // there is exp_table_lo)
  function subNear(r, x, lo, hi) {
    const t = lo - M[0xAE00 + x];
    M[0x5F] = t & 255;
    M[0x60] = (hi - (x < 0x6B ? M[0xAF00 + x] : 1) - (t < 0 ? 1 : 0)) & 255;
    return R(r, x, (hi - (x < 0x6B ? M[0xAF00 + x] : 1) - (t < 0 ? 1 : 0)) >= 0 ? 1 : 0);
  }
  function subSwapped(r) {
    const s = M[0x62] - M[0x5F], x = s & 255;
    const hi = (M[0x63] - M[0x60] - (s < 0 ? 1 : 0)) & 255;
    if (hi === 0) return subNear(r, x, M[0x62], M[0x63]);
    if (hi < 5) {
      M[0xB33B] = hi + 0xA9;
      const t = M[0x62] - M[(hi + 0xA9) << 8 | x] - 1;
      M[0x5F] = t & 255;
      const u = M[0x63] - (t < 0 ? 1 : 0);
      M[0x60] = u & 255;
      return R(r, x, u >= 0 ? 1 : 0);
    }
    // 5.0 or more: the result is b, then corrected as below
    M[0xB2D5] = hi;
    M[0x5F] = M[0x62]; M[0x60] = M[0x63];
    return subFar(r, x, hi);
  }
  // d of 5.0 or more: a correction of 2 to 12 taken off by ranges of d's low byte up to 9.53
  function subFar(r, x, hi) {
    let v;
    if (hi === 5) v = x >= 0x76 ? 0xF8 + (x >= 0xD8) + (x >= 0xA3) : x >= 0x29 ? 0xF6 + (x >= 0x4D) : 0xF4 + (x >= 0x08);
    else if (hi === 6) v = x >= 0x5F ? 0xFC + (x >= 0xBB) : 0xFA + (x >= 0x15);
    else if (hi === 7) { if (x >= 0xF3) return dec(r, x, 1); v = 0xFD + (x >= 0x37); }
    else if (hi === 8) return dec(r, x, 0);
    else if (hi === 9) return x >= 0x88 ? R(r, x, 1) : dec(r, x, 0);
    else return R(r, x, 1);
    const t = M[0x5F] + v;
    M[0x5F] = t & 255;
    if (t < 256) { M[0x60] = (M[0x60] - 1) & 255; return R(r, x, 0); }
    return R(r, x, 1);
  }

  // ---- linear to log. The top nonzero byte of the 24-bit magnitude gives the whole part (from
  // log_whole_table, on a base of 0, -8 or -16 for the byte it is) and how far to shift it and the
  // byte below (log_shift_table, the offset of a branch into the shift code, patched at $B49F) so
  // that the 8 bits after its top 1 are left; log_table gives the fraction for those 8 bits. Zero
  // comes out as $EC.00.
  P.byte_to_log = r => { M[0x61] = r.a & 0x80 ? 0xFF : 0; M[0x60] = r.a; return P.int16_to_log(r); };
  P.int16_to_log = function (r) {
    M[0x5F] = 0;
    return M[0x61] & 0x80 ? negToLog(r) : toLog(r, M[0x61]);
  };
  P.uint16_to_log = function (r) { M[0x5F] = 0; return toLog(r, M[0x61]); };
  P.lin_to_log = r => (M[0x61] & 0x80 ? negToLog(r) : toLog(r, M[0x61]));
  function negToLog(r) {
    let s = 0 - M[0x5F]; M[0x5F] = s & 255;
    s = 0 - M[0x60] - (s < 0 ? 1 : 0); M[0x60] = s & 255;
    s = 0 - M[0x61] - (s < 0 ? 1 : 0);
    return toLog(r, s & 255);
  }
  const SHIFT = { 0x0A: 0, 0x07: -1, 0x04: -2, 0x01: -3, 0x12: 4, 0x15: 3, 0x18: 2, 0x1B: 1 };
  function toLog(r, x) {
    let a = 0, y = M[0x60];
    if (x === 0) {
      a = 0xF8; y = M[0x5F]; x = M[0x60];
      if (x === 0) { a = 0xF0; y = 0; x = M[0x5F]; }
    }
    M[0x5F] = y;
    if (x & 0x80) { a = (a + 0x0F) & 255; y = 0x1B; } else { a = (a + M[0xB545 + x]) & 255; y = M[0xB4C5 + x]; }
    M[0x60] = a;
    M[0xB49F] = y;
    if (x === 0) return { a: 0, x: 0, y, c: r && r.c };
    const k = SHIFT[y];
    if (k === undefined) throw new Error('lin_to_log: no shift for offset $' + y.toString(16));
    const w = x << 8 | M[0x5F];
    const m = k <= 0 ? (w >> -k) & 255 : ((w << k) >> 8) & 255;
    M[0x5F] = M[0xB16B + m];
    return { a: M[0x5F], x: m, y };
  }

  // ---- log to linear. The whole part picks, from exp_shift_table, the offset of a branch into
  // the shift code (patched at $B5F5): the mantissa from exp_table_lo/hi ($4000-$7FFF, 1.0 to 2.0
  // in 2^14ths) is shifted into place with the last bit out rounding it; whole parts of 15 and up
  // saturate to $7FFFFF, -10 and below give 0, -9 gives 1. Y is never touched.
  P.log_to_lin = function (r) {
    const off = M[0xB671 + M[0x60]];
    M[0xB5F5] = off;
    const f = M[0x5F];
    let L = M[0xAF6B + f], A = M[0xB06B + f];
    M[0x5F] = L; M[0x60] = A;
    const to = 0xB5F6 + off, y = r && r.y;
    const done = (a) => ({ a, x: f, y });
    if (to === 0xB5F6) { M[0x5F] = 0xFF; M[0x60] = 0xFF; M[0x61] = 0x7F; return done(0x7F); }
    if (to === 0xB601 || to === 0xB605) { M[0x5F] = to === 0xB605 ? 1 : 0; M[0x60] = 0; M[0x61] = 0; return done(0); }
    if (to >= 0xB609 && to <= 0xB60E) {          // 6 to 1 shifts of the high byte, then rounded
      const k = 0xB60F - to;
      M[0x5F] = ((A >> k) + ((A >> (k - 1)) & 1)) & 255; M[0x60] = 0; M[0x61] = 0;
      return done(0);
    }
    if (to === 0xB611) { M[0x5F] = A; M[0x60] = 0; M[0x61] = 0; return done(0); }
    if (to >= 0xB61A && to <= 0xB62F && (to - 0xB61A) % 3 === 0) {   // 7 to 1 shifts, 16 bits
      let c = 0;
      for (let k = (0xB62F - to) / 3; k > 0; k--) { const b = A & 1; A >>= 1; c = L & 1; L = (L >> 1) | (b << 7); }
      M[0x5F] = L; M[0x60] = A;
      if (c) { M[0x5F] = (L + 1) & 255; if (!M[0x5F]) M[0x60] = (A + 1) & 255; }
      M[0x61] = 0;
      return done(0);
    }
    if (to === 0xB639) { M[0x61] = 0; return done(0); }
    if (to >= 0xB63E && to <= 0xB650 && (to - 0xB63E) % 3 === 0) {   // 7 to 1 shifts, up a byte
      let c = 0;
      for (let k = (0xB653 - to) / 3; k > 0; k--) { const b = A & 1; A >>= 1; c = L & 1; L = (L >> 1) | (b << 7); }
      M[0x5F] = L; M[0x61] = A;
      const t = L + c;
      M[0x60] = t & 255;
      if (t > 255) M[0x61] = (A + 1) & 255;
      M[0x5F] = 0;
      return done(0);
    }
    if (to === 0xB664) { M[0x61] = M[0x60]; M[0x60] = M[0x5F]; M[0x5F] = 0; return done(0); }
    throw new Error('log_to_lin: no shift code at $' + to.toString(16));
  };
  P.log_to_lin_signed = function (r) {
    if (!(M[0x61] & 0x80)) return P.log_to_lin(r);
    const o = P.log_to_lin(r);
    let s = 0 - M[0x5F]; M[0x5F] = s & 255;
    s = 0 - M[0x60] - (s < 0 ? 1 : 0); M[0x60] = s & 255;
    s = 0 - M[0x61] - (s < 0 ? 1 : 0); M[0x61] = s & 255;
    return { a: M[0x61], x: o.x, y: o.y };
  };

  // The signed 16-bit number in $60/$61 as a signed byte: $7F above 127, $80 below -128
  P.clamp_s8 = function (r) {
    const v = (M[0x61] << 8 | M[0x60]) << 16 >> 16;
    return { a: v > 127 ? 0x7F : v < -128 ? 0x80 : M[0x60], x: r && r.x, y: r && r.y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
