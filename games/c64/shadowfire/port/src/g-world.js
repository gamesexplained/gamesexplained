// The ship ($6934-$6C63): a location's exits made into the movement and scan screens' arrows, the
// view's map drawn round it from the tile map, and the sixteen places round it on the view found
// among the 164 locations.
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.world = function (P) {
  const M = P.M;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  // a location's record, from the two tables of 128 pointers ($B1E4, $B2E4): its place on the map
  // (x, y), its exits (a bit each, from the top), then two bytes for each exit (the door and the
  // location it leads to), then its name
  const record = n => { const y = (n << 1) & 255; return n & 0x80 ? w(0xB2E4 + y) : w(0xB1E4 + y); };

  // build_directions ($6934): location A's eight exits on the movement screen's arrows ($7975) and
  // the scan's ($7B72), eleven bytes an icon: an exit there gets its arrow, its flags (8, a locked
  // door, which can be seen but not taken; $3D, open) and its handler; none, the empty arrow and
  // the handler that does nothing. Then the location's description on the movement screen ($79E8,
  // its eleventh icon's text) and, unless
  // no_map ($6DC6), the view's map.
  P.build_directions = function* (r) {
    const pp = record(r.a & 255);
    setw(0x3F, pp);
    M[0x74] = 0; M[0x6C8F] = 0;
    M[0x6C90] = M[pp]; M[0x6C91] = M[pp + 1]; M[0x6C8D] = M[pp + 2];
    let y = 0;
    const both = (a, b) => { M[0x7975 + y] = a; M[0x7B72 + y] = b; };
    for (let x = 0; x !== 0x10; x += 2) {
      const c = M[0x6C8D] & 0x80;
      M[0x6C8D] = (M[0x6C8D] << 1) & 255;
      if (!c) {
        both(M[0x6CAE + x], M[0x6CCE + x]); y++;
        both(M[0x6CAF + x], M[0x6CCF + x]); y += 3;
        both(0, 0); y += 5;
        M[0x7975 + y] = M[0x7601]; y++;
        M[0x7975 + y] = M[0x7602]; y++;
        continue;
      }
      M[0x6C8F]++;
      both(M[0x6C9E + x], M[0x6CBE + x]); y++;
      both(M[0x6C9F + x], M[0x6CBF + x]); y += 3;
      const k = M[(pp + ((M[0x6C8F] << 1) & 255) + 2) & 0xFFFF] & 0xF8;
      const a = k && M[0xCFC9 + (k >> 3)] ? 0x08 : 0x3D;
      both(a, a & 0x39); y += 5;
      const h = M[0x74];
      both(M[0x6CDE + h], M[0x6CEE + h]); y++;
      both(M[0x6CDF + h], M[0x6CEF + h]); y++;
      M[0x74] = (h + 2) & 255;
    }
    const n = (((M[0x6C8F] << 1) & 255) + 3) & 255, s = n + M[0x3F];
    M[0x79E8] = s & 255; M[0x79E9] = (M[0x40] + (s >> 8)) & 255;
    const x = M[0x6C90], yy = M[0x6C91];
    if (!M[0x6DC6]) return yield* P.draw_view_map({ x, y: yy });
    return { a: M[0x6DC6], x, y: yy };
  };

  // shift_f7 ($6C3A): $F7 made 16 bits ($F7-$F8) and shifted left X times
  P.shift_f7 = function (r) {
    M[0xF8] = 0;
    let v = M[0xF7], x = r.x & 255;
    do { v = (v << 1) & 0xFFFF; x = (x - 1) & 255; } while (x);
    setw(0xF7, v);
    return { a: 0, x: 0 };
  };
  // next_cell_row ($6C21): the bitmap's ($2B) and the screen matrix's ($2D) pointers a row down
  P.next_cell_row = function () {
    setw(0x2B, w(0x2B) + 0x140);
    const m = M[0x2D] + 0x28;
    M[0x2D] = m & 255;
    if (m > 255) M[0x2E]++;
    return { a: m & 255 };
  };

  // draw_view_map ($6A50): the view's map, ten characters by ten from column 15, row 1, at map
  // place X, Y (the location's, less one each way): five rows of five tiles from the tile map
  // ($84C7, 32 by 32), each tile two characters by two of the tile set ($BF94) and one colour byte
  // from the colour map ($84C9); a tile off the map is tile $31, and its colour whatever byte the
  // colour map's pointer finds there. A row off the map clears its characters but the first, and
  // the first colour, and keeps the row before's colours. A place of $FF, $FF (outside the ship)
  // has two pictures instead. Then find_view_locations. The page's clock is handed back every ten
  // characters.
  P.draw_view_map = function* (r) {
    let x = r.x & 255, y = r.y & 255;
    if (x === 0xFF && y === 0xFF) {
      M[0x31] = M[0x6DC7]; M[0x32] = M[0x6DC8];
      yield* P.draw_picture({ x: 0x0F, y: 0x01 });
      M[0x31] = M[0x6DC9]; M[0x32] = M[0x6DCA];
      yield* P.draw_picture({ x: 0x0F, y: 0x06 });
      yield { cycles: 0 };
      return yield* P.find_view_locations({});
    }
    x = (x - 1) & 255; y = (y - 1) & 255;
    M[0x6C90] = M[0x6C92] = x;
    M[0x6C91] = M[0x6C93] = y;
    setw(0x2B, 0x21B8); setw(0x2D, 0x0C36); setw(0x2F, 0xD836);
    for (let row = 10; row; row--) {
      for (let k = 10; k; k--) P.wr((w(0x2F) + k) & 0xFFFF, 0x0E);
      const c = M[0x2F] + 0x28;
      M[0x2F] = c & 255;
      if (c > 255) M[0x30]++;
    }
    do {
      const my = M[0x6C91];
      if (my & 0x80 || my >= 0x20) {
        for (let k = 10; k; k--) { M[0x6C64 + k] = 0; M[0x6C6E + k] = 0; }
      } else {
        M[0xF7] = my; P.shift_f7({ x: 5 });
        let s = M[0xF7] + M[0x84C7];
        M[0x31] = s & 255; M[0x32] = (M[0xF8] + M[0x84C8] + (s >> 8)) & 255;
        s = M[0xF7] + M[0x84C9];
        M[0x2F] = s & 255; M[0x30] = (M[0xF8] + M[0x84CA] + (s >> 8)) & 255;
        let cx = 0, ty = M[0x6C90];
        do {
          M[0xF7] = ty < 0x20 ? M[(w(0x31) + ty) & 0xFFFF] : 0x31;
          const col = M[(w(0x2F) + ty) & 0xFFFF];
          M[0x6C78 + cx] = M[0x6C79 + cx] = M[0x6C82 + cx] = M[0x6C83 + cx] = col;
          P.shift_f7({ x: 2 });
          s = M[0xF7] + M[0xBF94];
          M[0x37] = s & 255; M[0x38] = (M[0xF8] + M[0xBF95] + (s >> 8)) & 255;
          const ip = w(0x37);
          M[0x6C64 + cx] = M[ip]; M[0x6C65 + cx] = M[(ip + 1) & 0xFFFF];
          M[0x6C6E + cx] = M[(ip + 2) & 0xFFFF]; M[0x6C6F + cx] = M[(ip + 3) & 0xFFFF];
          ty = (ty + 1) & 255;
          cx += 2;
        } while (cx !== 0x0A);
      }
      // the two rows of characters, eight bytes each from the character set ($C286) onto the bitmap,
      // and each one's colours into the screen matrix
      M[0x7D] = 0;
      for (let cx = 0; ; ) {
        M[0xF7] = M[0x6C64 + cx]; P.shift_f7({ x: 3 });
        const s = M[0xF7] + M[0xC286];
        M[0x2F] = s & 255; M[0x30] = (M[0xF8] + M[0xC287] + (s >> 8)) & 255;
        for (let k = 0; k < 8; k++) {
          M[(w(0x2B) + M[0x7D]) & 0xFFFF] = M[(w(0x2F) + k) & 0xFFFF];
          M[0x7D]++;
        }
        M[(w(0x2D) + (M[0x7D] >> 3)) & 0xFFFF] = M[0x6C78 + cx];
        cx++;
        if (cx === 0x14) break;
        if (cx === 0x0A) { P.next_cell_row({}); M[0x7D] = 0; yield { cycles: 0 }; }
      }
      yield { cycles: 0 };
      P.next_cell_row({});
      M[0x6C91]++;
    } while (w(0x2B) !== 0x2E38);
    return yield* P.find_view_locations({});
  };

  // find_view_locations ($6BB7): for each of the sixteen places round the location on the view
  // (view_dx and view_dy, $6874 and $6885), the location there, searched for among the 164 by
  // place, into view_locations ($6830), or $FF. The page's clock is handed back after each place.
  P.find_view_locations = function* () {
    const pp = w(0x3F);
    let a = 0, y = 0;
    for (let x = 0x0F; x >= 0; x--) {
      M[0x6C9C] = (M[0x6874 + x] + M[pp]) & 255;
      M[0x6C9D] = (M[0x6885 + x] + M[(pp + 1) & 0xFFFF]) & 255;
      M[0x6C9B] = 0;
      for (;;) {
        P.N.search++;
        const q = record(M[0x6C9B]);
        setw(0x33, q);
        y = 0;
        if (M[q] === M[0x6C9C]) {
          y = 1;
          if (M[(q + 1) & 0xFFFF] === M[0x6C9D]) { a = M[0x6830 + x] = M[0x6C9B]; break; }
        }
        M[0x6830 + x] = 0xFF;
        a = ++M[0x6C9B] & 255;
        if (a === 0xA4) break;
      }
      yield { cycles: 0 };
    }
    return { a, x: 0xFF, y };
  };

  // unused_nibbles ($6C56): A's two nibbles, the low one at $6C9A and the high one in A; nothing
  // calls it
  P.unused_nibbles = function (r) {
    M[0x7B] = r.a & 255;
    M[0x6C9A] = r.a & 0x0F;
    return { a: (r.a & 255) >> 4 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
