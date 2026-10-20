// The moving figures' pictures: the frames built once at the start (build_figures, shift_frames),
// drawn each frame into characters $CE-$D7 at $1670 (draw_figures, draw_standing), and put into the
// map under the view while it is copied (stamp_figures, unstamp_figures). draw_figures writes the
// addresses it reads and writes into its own instructions, $26C8-$26DD, as the game does.
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).figures = function (P) {
const M = P.M;
const word = a => M[a] | M[a + 1] << 8;
const zw = a => M[a & 0xFF] | M[(a + 1) & 0xFF] << 8;      // a pointer in the zero page, (zp,x)

// Eight bytes from the pointer at $s to the pointer at $d.
function copy8(s, d) {
  const p = word(s), q = word(d);
  for (let y = 7; y >= 0; y--) M[(q + y) & 0x3FFF] = M[(p + y) & 0x3FFF];
}

// The frames for Pete's and the creatures' moves, pre-shifted, in pages $04-$06 (build_figures, $2236).
P.build_figures = function () {
  M[0x0D] = M[0x0F] = M[0x11] = 0;
  M[0x0E] = 0x04; M[0x10] = 0x05; M[0x12] = 0x06;
  for (let y = 0; y < 256; y++) M[0x0400 + y] = M[0x0500 + y] = M[0x0600 + y] = y & 0x10 ? 0xFF : 0x00;
  let c = 0, s;
  const add = (v, n) => { s = v + n + c; c = s >> 8; return s & 0xFF; };
  // up and down, page $04: the two frames one above the other, two rows lower each step
  M[0x12] = M[0x14] = 0x04; M[0x11] = 0x00; M[0x13] = 0x10; M[0x0E] = M[0x10] = 0x16;
  M[0x1F] = 0x02;
  do {                                                     // b_2275: Pete's
    M[0x0D] = 0x00; M[0x0F] = 0x08;
    for (let x = 2; x > 0; x--) {
      copy8(0x0D, 0x11); copy8(0x0F, 0x13);
      c = 0;
      M[0x0D] = add(M[0x0D], 0x10); M[0x0F] = add(M[0x0D], 0x08);
      M[0x11] = add(M[0x11], 0x22); M[0x13] = add(M[0x11], 0x10);
    }
    M[0x1F] = (M[0x1F] - 1) & 0xFF;
  } while (M[0x1F] !== 0);
  M[0x11] = 0x80; M[0x13] = 0x90; M[0x1F] = 0x02;
  do {                                                     // b_22B4: a creature's
    M[0x0D] = 0x20; M[0x0F] = 0x28;
    for (let x = 2; x > 0; x--) {
      copy8(0x0D, 0x11); copy8(0x0F, 0x13);
      M[0x0D] = add(M[0x0D], 0x10); M[0x0F] = add(M[0x0D], 0x08);
      M[0x11] = add(M[0x11], 0x22); M[0x13] = add(M[0x11], 0x10);
    }
    M[0x1F] = (M[0x1F] - 1) & 0xFF;
  } while (M[0x1F] !== 0);
  // left and right, pages $05 and $06: the two frames side by side, each in two steps
  M[0x12] = M[0x14] = M[0x16] = M[0x18] = 0x05;
  M[0x20] = 0x02;
  do {                                                     // b_22F4
    M[0x1F] = 0x02;
    M[0x11] = 0x00; M[0x13] = 0x10; M[0x15] = 0x40; M[0x17] = 0x50;
    do {                                                   // b_2308
      for (let x = 2; x > 0; x--) {
        copy8(0x0D, 0x11); copy8(0x0D, 0x15); copy8(0x0F, 0x13); copy8(0x0F, 0x17);
        M[0x0D] = add(M[0x0D], 0x10); M[0x0F] = add(M[0x0D], 0x08);
        M[0x11] = add(M[0x11], 0x20); M[0x13] = add(M[0x11], 0x10);
        M[0x15] = add(M[0x13], 0x30); M[0x17] = add(M[0x15], 0x10);
      }
      M[0x11] = add(M[0x11], 0x40);
      c = 0;
      M[0x13] = add(M[0x11], 0x10); M[0x15] = add(M[0x13], 0x30); M[0x17] = add(M[0x15], 0x10);
      M[0x1F] = (M[0x1F] - 1) & 0xFF;
    } while (M[0x1F] !== 0);
    M[0x12] = M[0x14] = M[0x16] = M[0x18] = 0x06;
    M[0x20] = (M[0x20] - 1) & 0xFF;
  } while (M[0x20] !== 0);
  // then shifted: left's steps 8, 6, 4 and 2 pixels, right's 2, 4 and 6
  for (let x = 0x0F; x >= 0; x -= 2) M[0x0D + x] = 0x05;
  P.shift_frames({ a: 0x00, x: 0x08 }); P.shift_frames({ a: 0x20, x: 0x06 });
  P.shift_frames({ a: 0x40, x: 0x04 }); P.shift_frames({ a: 0x60, x: 0x02 });
  for (let x = 0x0F; x >= 0; x -= 2) M[0x0D + x] = 0x06;
  P.shift_frames({ a: 0x20, x: 0x02 }); P.shift_frames({ a: 0x40, x: 0x04 });
  return P.shift_frames({ a: 0x60, x: 0x06 });
};

// One step's frames in a page shifted right a pixel, X times: Pete's at A and the creature's $80 on,
// the pictures with zeros coming in and the masks with ones (shift_frames, $23A1).
P.shift_frames = function (r) {
  let s = r.a;
  M[0x0D] = s;
  const step = [8, 8, 8, 0x68, 8, 8, 8];
  for (let i = 0; i < 7; i++) { s = (s & 0xFF) + step[i] + (s >> 8); M[0x0F + 2 * i] = s & 0xFF; }
  let c = 0;
  for (let x = r.x; x > 0; x--) {
    for (let y = 7; y >= 0; y--) {
      for (const [z, first] of [[0x0D, 0], [0x15, 0]]) {
        // the picture's two characters, then the mask's: LSR, ROR, SEC ROR, ROR
        let q = (word(z) + y) & 0x3FFF;
        c = M[q] & 1; M[q] = M[q] >> 1 | first;
        q = (word(z + 2) + y) & 0x3FFF;
        let b = M[q] & 1; M[q] = M[q] >> 1 | c << 7; c = b;
        q = (word(z + 4) + y) & 0x3FFF;
        b = M[q] & 1; M[q] = M[q] >> 1 | 0x80; c = b;
        q = (word(z + 6) + y) & 0x3FFF;
        b = M[q] & 1; M[q] = M[q] >> 1 | c << 7; c = b;
      }
    }
  }
  return { a: M[(word(0x1B) + 0) & 0x3FFF], x: 0, y: 0xFF, c };
};

// Pete and the creatures drawn into characters $CE-$D7 ($1670 on), each from the map characters
// under it, its mask and its picture for its direction and step (draw_figures, $262C).
P.draw_figures = function () {
  M[0x21] = 0x04;
  for (;;) {                                               // j_2630
    const x = M[0x21];
    if (M[(0x22 + x) & 0xFF] !== 0) {
      let s = (x << 4 & 0xFF) + 0x70;                       // b_2639
      M[0x26D1] = s & 0xFF;
      M[0x26DD] = (s + 0x08) & 0xFF;
      const d = M[(0x4A + x) & 0xFF];
      const page = 0x04 + (d >= 3 ? 1 : 0) + (d >= 4 ? 1 : 0);
      M[0x26CC] = M[0x26CF] = M[0x26D8] = M[0x26DB] = page;
      const y = d === 0x01 ? M[(0x27 + x) & 0xFF] ^ 0x03 : M[(0x27 + x) & 0xFF];   // up counts back
      s = (x >= 1 ? 0x80 : 0x00) + M[0x26EA + y];
      M[0x26CE] = s & 0xFF;
      s = (s & 0xFF) + 0x10 + (s >> 8); M[0x26CB] = s & 0xFF;
      s = (s & 0xFF) - 0x07 - (1 - (s >> 8)); M[0x26DA] = s & 0xFF;
      s = (s & 0xFF) + 0x0F + (s < 0 ? 0 : 1); M[0x26D7] = s & 0xFF;
      M[0x26C9] = M[0x26D5] = 0x02;
      M[0x26C8] = M[0x40 + 2 * x]; M[0x26D4] = M[0x41 + 2 * x];
      if (!(d & 1)) { const t = M[0x26C8]; M[0x26C8] = M[0x26D4]; M[0x26D4] = t; }
      for (let i = 3; i > 0; i--) {                        // b_26AE: the character's code times 8, at $1000
        let v = M[0x26C8] << 1; M[0x26C8] = v & 0xFF; M[0x26C9] = (M[0x26C9] << 1 | v >> 8) & 0xFF;
        v = M[0x26D4] << 1; M[0x26D4] = v & 0xFF; M[0x26D5] = (M[0x26D5] << 1 | v >> 8) & 0xFF;
      }
      if (d === 0) return P.draw_standing({ y: 7 });
      const bg1 = word(0x26C8), m1 = word(0x26CB), p1 = word(0x26CE), o1 = word(0x26D1);
      const bg2 = word(0x26D4), m2 = word(0x26D7), p2 = word(0x26DA), o2 = word(0x26DD);
      for (let y = 7; y >= 0; y--) {                       // b_26C7
        M[(o1 + y) & 0x3FFF] = M[(bg1 + y) & 0x3FFF] & M[(m1 + y) & 0x3FFF] | M[(p1 + y) & 0x3FFF];
        M[(o2 + y) & 0x3FFF] = M[(bg2 + y) & 0x3FFF] & M[(m2 + y) & 0x3FFF] | M[(p2 + y) & 0x3FFF];
      }
    }
    M[0x21] = (M[0x21] - 1) & 0xFF;                        // j_26E2
    if (M[0x21] & 0x80) return;
  }
};
// Pete standing: character $CE from the background under him, his standing mask and picture at
// $1370 and $1368 (draw_standing, $26EE).
P.draw_standing = function () {
  M[0x26FB] = M[0x26D4]; M[0x26FC] = M[0x26D5];
  const bg = word(0x26FB);
  for (let y = 7; y >= 0; y--) M[0x1670 + y] = M[(bg + y) & 0x3FFF] & M[0x1370 + y] | M[0x1368 + y];
};

// Each figure's characters into the map, the map's own kept at $40 + 2X (stamp_figures, $270A).
P.stamp_figures = function () {
  M[0x21] = 0x04;
  do {                                                     // b_270E
    const n = M[0x21];
    if (M[(0x22 + n) & 0xFF] !== 0) {
      let ch = ((n << 1) + 0xCE) & 0xFF;
      M[0x1F] = ch;
      const y = n << 1 & 0xFF, x = y << 1 & 0xFF;
      const to = zw(0x2C + x) & 0x3FFF, from = zw(0x2E + x) & 0x3FFF;
      M[0x40 + y] = M[to];
      M[0x41 + y] = M[from];
      const d = M[0x4A + n];
      let a = d === 0 ? 0 : (d & 1) ^ 1;
      a ^= M[0x1F];
      M[to] = a;
      M[0x1F] = a ^ 0x01;
      if (M[0x4A + n] !== 0) M[from] = M[0x1F];
    }
    M[0x21] = (M[0x21] - 1) & 0xFF;
  } while (!(M[0x21] & 0x80));
};
// The map characters stamp_figures kept, put back (unstamp_figures, $274C).
P.unstamp_figures = function () {
  M[0x21] = 0;
  do {                                                     // b_2750
    const n = M[0x21];
    if (M[0x22 + n] !== 0) {
      M[0x1F] = M[0x4A + n];
      const y = n << 1 & 0xFF, x = y << 1 & 0xFF;
      M[zw(0x2C + x) & 0x3FFF] = M[0x40 + y];
      if (M[0x1F] !== 0) M[zw(0x2E + x) & 0x3FFF] = M[0x41 + y];
    }
    M[0x21] = (M[0x21] + 1) & 0xFF;
  } while (M[0x21] < 0x05);
};
};
})(typeof window !== 'undefined' ? window : globalThis);
