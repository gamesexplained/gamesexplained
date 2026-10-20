// The level's things: the dynamite, the goodies placed when a level is built (place_goodies,
// find_space, random_below, put_square, put_wide, put_tall) and the creatures let out of the shaft
// (release_creature).
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).level = function (P) {
const M = P.M, io = P.io;

// Counts down every stick of dynamite in the list at $0700 (three bytes a stick: the cell, then
// frames left; $9E long), explodes and clears them, and lays a new one when fire is newly pressed
// (dynamite, $2B93).
P.dynamite = function () {
  let x = 0;
  M[0x1B] = 0;
  for (;;) {                                               // b_2B99
    let explode = false;
    if (M[0x0702 + x] !== 0) {
      M[0x0D] = M[0x0700 + x]; M[0x0E] = M[0x0701 + x];
      const p = (M[0x0D] | M[0x0E] << 8) & 0x3FFF;
      M[0x0702 + x] = (M[0x0702 + x] - 1) & 0xFF;
      if (M[0x0702 + x] !== 0) {
        if (M[p] === 0x6F) M[0x1B] = 0x6F;                 // a stick burning: the fuse's hiss
      } else if (M[p] === 0x6F) explode = true;
      else {
        if (M[p] === 0xA2) M[p] = 0xA3;                    // the explosion over: debris
        let y = x;                                         // the stick leaves the list
        do { M[0x0700 + y] = M[0x0703 + y]; y = (y + 1) & 0xFF; } while (y <= M[0x9E]);
        const e = M[0x9E] - 3;
        M[0x9E] = e & 0xFF;
        if (e >= 0) continue;                              // the same x, the next stick
        explode = true;                                    // (never: the list's end is a multiple of 3)
      }
      if (explode) {                                       // b_2BDF
        M[p] = 0xA2;
        M[0x0702 + x] = 0x46;
        M[0xBE] = 0;
        io.write(0xFF11, 0x45);
        M[0xBF] = 0x01;
        io.write(0xFF10, 0x02);
        io.write(0xFF0F, 0x20);
      }
    }
    x = (x + 3) & 0xFF;                                    // b_2BFF
    if (x >= M[0x9E]) break;
  }
  M[0xC3] = M[0x1B];
  if (M[0x9F] === 0) return;
  if (P.irqByte(0x0B) === 0) return;                       // fire
  if (P.irqByte(0x0C) !== 0) return;                       // fire_last: held from before
  M[0x0C] = 0x08;
  const q = (M[0x2E] | M[0x2F] << 8) & 0x3FFF;
  if (M[q] !== 0) return;                                  // only in tunnel
  x = M[0x9E];
  M[0x0702 + x] = M[0xBC]; M[0x0701 + x] = M[0x2F]; M[0x0700 + x] = M[0x2E];
  M[q] = 0x6F; M[0xC3] = 0x6F;
  M[0x9E] = (x + 3) & 0xFF;
  M[0x9F] = P.sbcD(M[0x9F], 1, 1).a;
  P.print_sticks();
};

// Scatters the level's goodies in the earth, each where find_space finds room (place_goodies,
// $2C48). c is the carry it is called with, which find_space's first random number adds.
P.place_goodies = function (r = {}) {
  let c = r.c || 0, s, a;
  do {                                                     // one-cell goodies, $70-$73
    c = P.find_space({ a: 0x00, c }).c;
    a = P.random_below({ a: 0x04, c }).a;
    s = a + 0x70; c = s >> 8;
    M[(M[0x0D] | M[0x0E] << 8) & 0x3FFF] = s & 0xFF;
    M[0xB1] = (M[0xB1] - 1) & 0xFF;
  } while (M[0xB1] !== 0);
  do {                                                     // b_2C5D: two wide, $74, $76, $78
    c = P.find_space({ a: 0x01, c }).c;
    a = P.random_below({ a: 0x03, c }).a;
    s = (a << 1 & 0xFF) + 0x74 + (a >> 7); c = P.put_wide({ a: s & 0xFF }).c;
    M[0xB2] = (M[0xB2] - 1) & 0xFF;
  } while (M[0xB2] !== 0);
  if (M[0xA7] >= 0x07) {                                   // from level 8, the x2
    c = P.find_space({ a: 0x01, c: 1 }).c;
    c = P.put_wide({ a: 0x7A }).c;
    M[0xB5] = (M[0xB5] + 1) & 0xFF;
  } else c = 0;
  do {                                                     // b_2C83: two tall, $7C-$82
    c = P.find_space({ a: 0x02, c }).c;
    a = P.random_below({ a: 0x04, c }).a;
    s = (a << 1 & 0xFF) + 0x7C + (a >> 7); c = P.put_tall({ a: s & 0xFF }).c;
    M[0xB3] = (M[0xB3] - 1) & 0xFF;
  } while (M[0xB3] !== 0);
  const b4 = M[0xB4];
  do {                                                     // b_2C9A: two by two, never the face
    c = P.find_space({ a: 0x03, c }).c;
    do { a = P.random_below({ a: 0x07, c }).a; c = a >= 0x04 ? 1 : 0; } while (a === 0x04);
    s = (a << 2 & 0xFF) + 0x84 + (a >> 6 & 1);
    P.put_square({ a: s & 0xFF });
    const x = ((M[0xB4] - 1) & 0xFF) << 1 & 0xFF;
    c = (M[0xB4] - 1) >> 7 & 1;
    M[0x0316 + x] = M[0xB7] = M[0x0D];
    M[0x0317 + x] = M[0xB8] = M[0x0E];
    M[0xB4] = (M[0xB4] - 1) & 0xFF;
  } while (M[0xB4] !== 0);
  M[0xB4] = b4;
  return { a: b4, c };
};

// A in the map at ($0D) and the three after it as a square, A + 2 and A + 3 a row below
// (put_square, $2CCB); A and A + 1 side by side (put_wide); A and A + 1 one above the other (put_tall).
P.put_square = function (r) {
  const p = M[0x0D] | M[0x0E] << 8;
  let s = r.a; M[p & 0x3FFF] = s;
  s = (s & 0xFF) + 1; M[(p + 1) & 0x3FFF] = s & 0xFF;
  s = (s & 0xFF) + 1 + (s >> 8); M[(p + 0x5A) & 0x3FFF] = s & 0xFF;
  s = (s & 0xFF) + 1 + (s >> 8); M[(p + 0x5B) & 0x3FFF] = s & 0xFF;
  return { a: s & 0xFF, y: 0x5B, c: s >> 8 };
};
P.put_wide = function (r) {
  const p = M[0x0D] | M[0x0E] << 8, s = r.a + 1;
  M[p & 0x3FFF] = r.a; M[(p + 1) & 0x3FFF] = s & 0xFF;
  return { a: s & 0xFF, y: 1, c: s >> 8 };
};
P.put_tall = function (r) {
  const p = M[0x0D] | M[0x0E] << 8, s = r.a + 1;
  M[p & 0x3FFF] = r.a; M[(p + 0x5A) & 0x3FFF] = s & 0xFF;
  return { a: s & 0xFF, y: 0x5A, c: s >> 8 };
};

// A number below A from the beam's place, the timers and the seed at $7A, which it moves on; the
// carry it is called with goes into the first addition (random_below, $2D1C).
P.random_below = function (r) {
  const n = M[0x1C] = r.a;
  let s = io.read(0xFF1E) + io.read(0xFF00) + (r.c || 0), a = s & 0xFF, c;
  c = a & 1; a >>= 1;                                      // LSR
  const b = a & 1; a = a >> 1 | c << 7; c = b;             // ROR
  a ^= io.read(0xFF00);
  s = a + M[0x7A] + c; a = s & 0xFF; c = s >> 8;
  M[0x7A] = a;
  s = a + io.read(0xFF1D) + c; a = s & 0xFF; c = s >> 8;
  c = a >> 7; a = a << 1 & 0xFF;                           // ASL
  const d = a >> 7; a = (a << 1 | c) & 0xFF; c = d;        // ROL
  s = a + io.read(0xFF02) + c; a = s & 0xFF;
  while (a >= n) a -= n;
  return { a, c: 0 };
};

// A random place for a goodie of the size in A (bit 0 two wide, bit 1 two tall), either side of the
// shaft, with no goodie in the four-by-four block around it; the address in $0D/$0E (find_space,
// $2D3F). c is the carry it is called with.
P.find_space = function (r) {
  M[0x19] = r.a;
  let c = r.c || 0, a, s;
  for (;;) {                                               // b_2D41
    M[0x1B] = M[0x19];
    const x = P.random_below({ a: 0x2B, c }).a;
    const t = io.read(0xFF00) ^ io.read(0xFF02);
    a = x;
    if (!(t & 1)) {                                        // left of the shaft
      a = a + 1;
      if (a === 0x2B) a = 0x2A;
      c = M[0x1B] & 1; M[0x1B] >>= 1;
      if (c) { c = a >= 0x2A ? 1 : 0; if (a === 0x2A) a = 0x29; }
    } else {                                               // b_2D69: right of it
      a = a + 0x2E;
      c = M[0x1B] & 1; M[0x1B] >>= 1;
      if (c) { c = a >= 0x58 ? 1 : 0; if (c) a = 0x57; }
    }
    M[0x0F] = a;                                           // b_2D75: the column
    a = P.random_below({ a: 0x12, c }).a;
    c = M[0x1B] & 1; M[0x1B] >>= 1;
    if (c && a === 0x11) a = 0x10;
    const i = a << 1 & 0xFF;                               // b_2D86: the row
    c = a >> 7;
    s = M[0x2CF8 + i] + M[0x0F] + c; M[0x0D] = s & 0xFF;
    s = M[0x2CF9 + i] + (s >> 8); M[0x0E] = s & 0xFF;
    s = M[0x0D] - 0x5B; M[0x11] = s & 0xFF;
    s = M[0x0E] - (s < 0 ? 1 : 0); M[0x12] = s & 0xFF;
    let clear = true;
    for (let row = 3; row >= 0 && clear; row--) {           // b_2DA5
      const p = M[0x11] | M[0x12] << 8;
      for (let y = 3; y >= 0; y--) if (M[(p + y) & 0x3FFF] >= 0x70) { clear = false; break; }
      if (!clear) break;
      s = M[0x11] + 0x5A; M[0x11] = s & 0xFF;
      s = M[0x12] + (s >> 8); M[0x12] = s & 0xFF; c = s >> 8;
    }
    if (clear) return { a: M[0x12], x: 0xFF, y: 0xFF, c };
    c = 1;                                                 // from CMP #$70
  }
};

// Lets out the first free creature from number $9D down, at the bottom of the shaft
// (release_creature, $2DC0).
P.release_creature = function () {
  M[0x1B] = M[0x9D];
  do {                                                     // b_2DC4
    const n = M[0x1B];
    if (M[(0x23 + n) & 0xFF] === 0) {
      const x = n << 2 & 0xFF;
      M[(0x30 + x) & 0xFF] = 0x78; M[(0x31 + x) & 0xFF] = 0x3F;
      M[(0x32 + x) & 0xFF] = 0x1E; M[(0x33 + x) & 0xFF] = 0x3F;
      M[(0x8E + n) & 0xFF] = 0x15; M[(0x8A + n) & 0xFF] = 0x2C;
      M[(0x28 + n) & 0xFF] = 0x03; M[(0x4B + n) & 0xFF] = 0x02; M[(0x23 + n) & 0xFF] = 0x01;
      return;
    }
    M[0x1B] = (M[0x1B] - 1) & 0xFF;
  } while (!(M[0x1B] & 0x80));
};
};
})(typeof window !== 'undefined' ? window : globalThis);
