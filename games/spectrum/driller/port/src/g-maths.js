// The arithmetic every part of the game shares ($910E-$9403): signed multiplies and divides of
// words and longer numbers, a number written out in decimal, and text printed in the game's
// six-row font.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.maths = function (P) {
  const M = P.M;
  const s8 = v => (v & 0x80 ? (v & 255) - 256 : v & 255);
  const s16 = v => (v & 0x8000 ? (v & 0xFFFF) - 0x10000 : v & 0xFFFF);
  // one step of the restoring divisions: ADC HL,HL (the next bit in), SBC HL,divisor (with the
  // carry out of the ADC), ADD HL,divisor back on a borrow; the quotient bit is no borrow
  const divStep = (rem, cy, d) => {
    const t = rem * 2 + cy, c1 = t > 0xFFFF ? 1 : 0;
    const v = (t & 0xFFFF) - d - c1;
    if (v < 0) return { rem: (v + d) & 0xFFFF, q: 0 };
    return { rem: v & 0xFFFF, q: 1 };
  };

  // mul_16x8: A:H:L = HL x A, both signed, the product as 24 bits; BC and DE kept.
  P.def(0x910E, 'mul_16x8', r => {
    const a = r.a & 255, hl = r.hl !== undefined ? r.hl : (r.h << 8 | r.l);
    if (a === 0) return { a: 0, h: 0, l: 0, hl: 0 };
    if ((hl & 0xFFFF) === 0) return { a: 0, h: 0, l: 0, hl: 0 };
    const p = (s16(hl) * s8(a)) & 0xFFFFFF;
    return { a: p >> 16, h: (p >> 8) & 255, l: p & 255, hl: p & 0xFFFF };
  });

  // mul_16x16: DE:HL = HL x DE, both signed, the product as 32 bits; AF and BC kept.
  P.def(0x9179, 'mul_16x16', r => {
    const hl = r.hl !== undefined ? r.hl : (r.h << 8 | r.l), de = r.de !== undefined ? r.de : (r.d << 8 | r.e);
    if ((hl & 0xFFFF) === 0) return { d: 0, e: 0, de: 0 };
    if ((de & 0xFFFF) === 0) return { h: 0, l: 0, hl: 0 };
    const p = BigInt(s16(hl)) * BigInt(s16(de));
    const u = Number(BigInt.asUintN(32, p));
    const hi = u >>> 16, lo = u & 0xFFFF;
    return { d: hi >> 8, e: hi & 255, de: hi, h: lo >> 8, l: lo & 255, hl: lo };
  });

  // div_24_16: A:H:L = A:H:L / DE, both signed, the quotient truncated, by a restoring division of
  // the bits from the dividend's top set one; DE = the remainder of the magnitudes. $91EF holds the
  // sign, $91F0 the count of bits. A divisor of 0 gives the loop's own answer, all ones.
  P.def(0x91F1, 'div_24_16', r => {
    let b = r.a & 255, hl = (r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) & 0xFFFF, de = (r.de !== undefined ? r.de : (r.d << 8 | r.e)) & 0xFFFF;
    if (hl === 0 && b === 0) return { d: 0, e: 0, de: 0, a: 0 };
    let sign = 1;
    if (de & 0x8000) { de = (-de) & 0xFFFF; sign = 0xFF; }
    if (b & 0x80) {
      let v = ((b << 16 | hl) ^ 0xFFFFFF) + 1;
      b = (v >> 16) & 255; hl = v & 0xFFFF;
      sign = (-sign) & 255;
    }
    M[0x91EF] = sign;
    // find the top bit
    let n = (b << 16 | hl) & 0xFFFFFF, count = 24, cy = 0;
    for (;;) {
      cy = (n >> 23) & 1; n = (n << 1) & 0xFFFFFF;
      if (cy) break;
      if (--count === 0) {
        return { d: 0, e: 0, de: 0, a: n >> 16, h: (n >> 8) & 255, l: n & 255, hl: n & 0xFFFF };
      }
    }
    M[0x91F0] = count;
    let rem = 0;
    for (;;) {
      const s = divStep(rem, cy, de);
      rem = s.rem; const q = s.q;
      count = (count - 1) & 255;
      M[0x91F0] = count;
      cy = (n >> 23) & 1; n = ((n << 1) | q) & 0xFFFFFF;
      if (count === 0) break;
    }
    if (sign & 0x80) n = ((n ^ 0xFFFFFF) + 1) & 0xFFFFFF;
    return { a: n >> 16, h: (n >> 8) & 255, l: n & 255, hl: n & 0xFFFF, d: rem >> 8, e: rem & 255, de: rem };
  });

  // mul_s8: HL = H x L, both signed bytes; AF, BC and DE kept.
  P.def(0x928C, 'mul_s8', r => {
    const h = r.h & 255, l = r.l & 255;
    if (l === 0) return { h: 0, hl: 0 };
    if (h === 0) return { l: 0, hl: 0 };
    const p = (s8(h) * s8(l)) & 0xFFFF;
    return { h: p >> 8, l: p & 255, hl: p };
  });

  // div_32_16: DE:HL = DE:HL / BC, both signed, the quotient rounded half up on the magnitudes by
  // the sign of (remainder - divisor / 2) as a word; BC = the remainder of the magnitudes, which
  // $92D5 keeps. $92D4 holds the sign. AF kept.
  P.def(0x92D7, 'div_32_16', r => {
    let hl = (r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) & 0xFFFF, de = (r.de !== undefined ? r.de : (r.d << 8 | r.e)) & 0xFFFF;
    let bc = (r.bc !== undefined ? r.bc : (r.b << 8 | r.c)) & 0xFFFF;
    if (hl === 0 && de === 0) return { b: 0, c: 0, bc: 0 };
    let sign = 1;
    let n = (de * 0x10000 + hl) >>> 0;
    if (de & 0x8000) { n = ((~n >>> 0) + 1) >>> 0; sign = 0xFF; }
    if (bc & 0x8000) { bc = (-bc) & 0xFFFF; sign = (-sign) & 255; }
    M[0x92D4] = sign;
    M[0x92D5] = 0; M[0x92D6] = 0;
    let count = 32, cy = 0;
    for (;;) {
      cy = n >>> 31; n = (n << 1) >>> 0;
      if (cy) break;
      if (--count === 0) {
        const out = { d: n >>> 24, e: (n >>> 16) & 255, de: n >>> 16, h: (n >>> 8) & 255, l: n & 255, hl: n & 0xFFFF, b: 0, c: 0, bc: 0 };
        return out;
      }
    }
    let rem = 0;
    for (;;) {
      const s = divStep(rem, cy, bc);
      rem = s.rem; const q = s.q;
      count--;
      cy = n >>> 31; n = ((n << 1) | q) >>> 0;
      if (count === 0) break;
    }
    M[0x92D5] = rem & 255; M[0x92D6] = rem >> 8;
    // round: the remainder less half the divisor (an arithmetic shift), its sign as a word
    const half = ((bc >> 1) | (bc & 0x8000)) & 0xFFFF;
    const d = (rem - half) & 0xFFFF;
    if (!(d & 0x8000)) n = (n + 1) >>> 0;
    if (sign & 0x80) n = ((~n >>> 0) + 1) >>> 0;
    return { d: n >>> 24, e: (n >>> 16) & 255, de: n >>> 16, h: (n >>> 8) & 255, l: n & 255, hl: n & 0xFFFF, b: rem >> 8, c: rem & 255, bc: rem };
  });

  // write_number: the A last digits of the number DE:HL, in ASCII, to IX onward (leading zeros
  // kept), each found by div_32_16 by 10 with its rounding undone. Every register kept.
  P.def(0x9390, 'write_number', r => {
    let ix = (r.ix + r.a) & 0xFFFF;
    let hl = (r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) & 0xFFFF, de = (r.de !== undefined ? r.de : (r.d << 8 | r.e)) & 0xFFFF;
    for (let n = r.a & 255 || 256; n > 0; n--) {
      ix = (ix - 1) & 0xFFFF;
      const q = P.div_32_16({ hl, de, bc: 10 });
      hl = q.hl; de = q.de;
      const rem = q.c;
      if (!(((rem - 5) & 0x80))) {
        if (hl === 0) de = (de - 1) & 0xFFFF;
        hl = (hl - 1) & 0xFFFF;
      }
      M[ix] = (rem + 0x30) & 255;
    }
    return {};
  });

  // print_text: the text at IX in the font that $8A81 points to, six bytes a character from
  // character $20, to the screen at the address in the record at HL (a word, then the count of
  // characters), a character a cell, its six rows a pixel row apart. Every register kept.
  P.def(0x93C4, 'print_text', r => {
    const hl = r.hl !== undefined ? r.hl : (r.h << 8 | r.l);
    let scr = P.w(hl), n = M[(hl + 2) & 0xFFFF] || 256, ix = r.ix;
    const font = P.w(0x8A81);
    while (n-- > 0) {
      const ch = M[ix];
      let src = (font + 3 * (((ch - 0x20) * 2) & 255)) & 0xFFFF;
      let a = scr;
      for (let k = 0; k < 6; k++) { M[a] = M[src]; a = (a + 0x100) & 0xFFFF; src = (src + 1) & 0xFFFF; }
      ix = (ix + 1) & 0xFFFF;
      scr = (scr + 1) & 0xFFFF;
    }
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
