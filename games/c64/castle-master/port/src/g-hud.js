// The panel's numbers and meters ($6FBD-$72D9): the score's 24-bit add, a number in decimal for
// printing, and the panel's refresh: the keys ring (a key picked up is a bit of $2439/$243A, its
// number appended to $245A on and 125,000 points), the strength meter with its tally marks (and
// the movement modes it allows) and the spirits meter, each drawn into a strip of the view
// buffer a byte a row ($1C74 = 1) and copied into the bitmap's cells.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.hud = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };

  // ADD_SCORE_U24: A/X/Y (high to low) added to the score at $2442-$2444.
  P.ADD_SCORE_U24 = function (r) {
    let s = M[0x2442] + r.y; M[0x2442] = s & 255;
    s = M[0x2443] + r.x + (s >> 8); M[0x2443] = s & 255;
    s = M[0x2444] + r.a + (s >> 8); M[0x2444] = s & 255;
    return { a: s & 255, x: r.x, y: r.y, c: s >> 8 };
  };

  // FORMAT_UNSIGNED_DECIMAL: the A-byte number at $121C (the bytes above A cleared) as $1230
  // digits in base Y, the last at $121F + $1230; a digit of ten or more is a letter.
  P.FORMAT_UNSIGNED_DECIMAL = function (r) {
    M[0xB0] = r.y;
    if (r.a !== 4) { M[0x121F] = 0; if (r.a !== 3) { M[0x121E] = 0; if (r.a !== 2) M[0x121D] = 0; } }
    let x = M[0x1230], a, y = r.y, c = 0;
    for (let i = 0; i < 4; i++) M[0x88 + i] = M[0x121C + i];
    do {
      M[0x8C] = M[0xB0]; M[0x8D] = 0;
      M[0xB1] = x;
      y = P.DIV_S32_BY_S16({ a: 0, x, y, c }).y;
      x = M[0xB1];
      a = M[0x82];
      if (a < 0x0A) c = 0; else { const s = a + 0x11; a = s & 255; c = s >> 8; }
      const s = a + 0x30 + c; a = s & 255; c = s >> 8;
      M[0x121F + x] = a;
      x = (x - 1) & 255;
    } while (x);
    return { a, x, y, c };
  };

  // REFRESH_HUD_STATS: the panel redrawn where it changed. Bit 7 of $105A redraws the keys ring
  // with every key held; a pending key ($2458, 1-10) not held already is added; a change of
  // strength ($2455) redraws its meter and its marks and may change the movement mode (below 3
  // to walking, at 3 or 4 from running to walking fast); a change of the spirits' count ($246A),
  // or bit 4 of $105A, redraws their meter. Strength 0 and a full spirits meter end the game
  // ($109B 2 and 1).
  P.REFRESH_HUD_STATS = function (r) {
    let a = r.a, x = r.x, y = r.y, c = r.c, o;
    const blit = (ba, bx) => { o = P.BLIT_PACKED_2BPP_GRAPHIC({ a: ba, x: bx, y, c }); x = o.x; y = o.y; a = o.a; c = o.c; };
    const copy = (ca, cx, cy) => { o = P.COPY_BITMAP_RECTANGLE_FROM_ROW_POINTERS({ a: ca, x: cx, y: cy, c }); x = o.x; y = o.y; a = o.a; c = o.c; };
    if (M[0x105A] & 0x80) {
      M[0x1C74] = 1; setp(0x7A, 0x1DD9); setp(0x7C, 0x1C75);
      blit(0, 0);
      if (M[0x2457]) {
        M[0x7028] = M[0x2457]; setp(0x7A, 0x1E32);
        let k = 0x15;
        do { blit(0x80, k); k = (k - 2) & 255; M[0x7028] = (M[0x7028] - 1) & 255; } while (M[0x7028]);
        x = k;
      }
      setp(0x7A, 0x1DAD);
      copy(0, 6, 0x0E);
      M[0x1C74] = 8;
    }
    x = M[0x2458];
    if (x) {
      M[0x7028] = x; x = (x - 1) & 255; M[0x2458] = 0;
      if (x < 0x0A) {
        y = 0;
        if (x >= 8) { y = 1; x -= 8; }
        a = 1;
        while (x) { a = (a << 1) & 255; x--; }
        x = a;
        if (!(a & M[0x2439 + y])) {
          M[0x2439 + y] |= x;
          y = M[0x2457]; M[0x2457] = (M[0x2457] + 1) & 255;
          M[0x245A + y] = M[0x7028];
          setp(0x7A, 0x1E32); setp(0x7C, 0x1DAD);
          M[0x7028] = (M[0x2457] << 1) & 255;
          const s = ((-M[0x7028]) & 255) + 0x17;
          c = s >> 8;
          blit(0x80, s & 255);
          o = P.ADD_SCORE_U24({ a: 1, x: 0xE8, y: 0x48, c }); a = o.a; x = o.x; y = o.y; c = o.c;
        }
      } else c = 1;
    }
    // strength ($2455) and the spirits' count ($246A) are the interrupt's to change: each read is
    // the game's, in turn
    const str = () => P.irqByte(0x2455);
    a = str();
    if (a !== M[0x7027]) {
      M[0x7027] = a;
      let mode = -1;
      if (a < 3) {
        if (M[0x2456]) {
          M[0x2412] = (M[0x2412] - 1) & 255;
          M[0x2413] = (M[0x2413] - M[0x2416]) & 255;
          M[0x7029] = M[0x2416] >> 2;
          M[0x7028] = (M[0x2416] & 3) << 6;
          const v = (M[0x2409] | M[0x240A] << 8) - (M[0x7028] | M[0x7029] << 8);
          M[0x2409] = v & 255; M[0x240A] = (v >> 8) & 255;
          a = M[0x9D46]; mode = 0;
        }
      } else if (a < 5 && M[0x2456] === 2) { a = M[0x9D47]; mode = 1; }
      if (mode >= 0) {
        M[0x2456] = mode; M[0x240F] = a;
        o = P.MUL_S16_S8_TO_S24({ a, x: 0, y: M[0x2416], c }); c = o.c === undefined ? c : o.c;
        M[0x240D] = M[0x82]; M[0x240E] = M[0x83];
      }
      M[0x1C74] = 1; setp(0x7A, 0x1E9F); setp(0x7C, 0x1C75);
      blit(0, 0);
      setp(0x7C, ptr(0x7C) + 0x0C);
      if (str() < 4) setp(0x7C, ptr(0x7C) + (((4 - str()) << 1) & 255));
      setp(0x7A, 0x1F49);
      blit(0, 3);
      setp(0x7A, 0x1F6F);
      setp(0x7C, ptr(0x7C) - 0x0C);
      M[0x7028] = 4; M[0x7029] = 0x26;
      const s = str();
      if (!s) M[0x109B] = 2;
      else {
        // the tally: a pair of marks for each four points of strength, the last pair cut short
        M[0x702B] = ((s >> 2) + 1) & 255;
        const frac = str() & 3;
        let go;
        if (frac) { M[0x702A] = frac; a = ((4 - frac) & 255) | 0x80; go = true; } else { a = 0x80; M[0x702B]--; go = M[0x702B] !== 0; }
        while (go) {
          const pa = a;
          blit(pa, M[0x7028]);
          M[0x7029] = (M[0x7029] - 2) & 255;
          M[0x7028] = (M[0x7028] + M[0x7029]) & 255;
          blit(pa, M[0x7028]);
          M[0x7029] = (M[0x7029] - 2) & 255;
          M[0x7028] = (M[0x7028] - M[0x7029]) & 255;
          a = 0x80;
          M[0x702B] = (M[0x702B] - 1) & 255; go = M[0x702B] !== 0;
        }
      }
      setp(0x7A, 0x1D8F); setp(0x7C, 0x1C75);
      copy(0, 0x0B, 0x0F);
      M[0x1C74] = 8;
    }
    a = P.irqByte(0x246A);
    c = a >= M[0x7026] ? 1 : 0;
    const same = a === M[0x7026];
    M[0x7026] = a;
    if (same && !(M[0x105A] & 0x10)) return { a: M[0x105A] & 0x10, x, y, c };
    M[0x1C74] = 1; setp(0x7A, 0x1E45); setp(0x7C, 0x1C75);
    blit(0, 4);
    x = M[0x9D49];
    if (x) {
      y = (M[0x9D49] - M[0x2454]) & 255;
      o = P.MUL_S8_S8_TO_S16({ a: x, x: M[0x7026], y, c });
      M[0x8C] = M[0x9D49];
      y = 0; M[0x8D] = 0;
      P.DIV_S24_BY_S16({ a: M[0x82], x: M[0x83], y: 0, c: o.c === undefined ? c : o.c });
      x = M[0x88];
      if (x >= 0x40) M[0x109B] = 1;
      x = ((x + 1) & 255) >> 1;
    }
    setp(0x7A, 0x1E8A);
    blit(0x80, x);
    setp(0x7A, 0x1D7F);
    copy(1, 8, 8);
    M[0x1C74] = 8;
    return { a, x, y, c };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
