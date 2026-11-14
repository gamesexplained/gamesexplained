/* pq-g2-draw */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 2, the drawing, the text panel, the score digits and
// the speech bubble's text printer, all in the title part. One function per listing label, on the game's memory
// (pq-core.js says how). The routines patch their own operands (`sta $FFFF,y` with the address written first);
// the port keeps those operands in P.M where the game keeps them and reads and steps them there, so every byte
// the game leaves behind, the port leaves too.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M;
    const w16 = (a) => M[a] | M[a + 1] << 8;
    // clc; lda lo; adc #n; sta lo; lda hi; adc #n>>8; sta hi
    const add16 = (a, n) => { const s = M[a] + (n & 255); M[a] = s & 255; M[a + 1] = (M[a + 1] + (n >> 8) + (s >> 8)) & 255; };
    // row_addr (40 x row) + column + base high byte into an operand pair, as `lda $1717,y; clc; adc col; sta;
    // lda $1730,y; adc #base; sta` does
    const cellAddr = (op, row, col, base) => { const s = M[0x1717 + row] + col; M[op] = s & 255; M[op + 1] = (M[0x1730 + row] + base + (s >> 8)) & 255; };
    // bitmap_row (row) + times8 (column) into an operand pair
    const bitmapAddr = (op, row, col) => {
      M[op] = M[0x1659 + row]; M[op + 1] = M[0x1672 + row];
      const s = M[0x4B00 + col] + M[op]; M[op] = s & 255; M[op + 1] = (M[0x4A00 + col] + M[op + 1] + (s >> 8)) & 255;
    };
    // a block of w x (n / w) cells of one value through `sta $FFFF,y` at operand op, +40 a row
    const fillBlock = (op, w, n, value) => {
      let x = 0, y = 0;
      for (;;) {
        H.wr((w16(op) + y) & 0xFFFF, typeof value === 'function' ? value(x) : value);
        x++; y++;
        if (y === w) { if (x === n) break; y = 0; add16(op, 40); }
      }
    };
    const flags = (r, v) => { r.z = v === 0 ? 1 : 0; r.n = v >> 7; return r; };

    // clear_shapes_4200 ($0F13): zeroes $4200-$43FF
    P.clear_shapes_4200 = function (r) {
      for (let x = 0; x < 256; x++) { M[0x4200 + x] = 0; M[0x4300 + x] = 0; }
      r.a = 0; r.x = 0; return flags(r, 0);
    };
    // text_ptr_next ($0F21): text_ptr ($F6/$F7) + 1
    P.text_ptr_next = function (r) {
      M[0xF6] = (M[0xF6] + 1) & 255;
      if (M[0xF6] === 0) { M[0xF7] = (M[0xF7] + 1) & 255; return flags(r, M[0xF7]); }
      return flags(r, M[0xF6]);
    };
    // text_ptr_save ($0F28): text_return ($F4/$F5) = text_ptr + 1
    P.text_ptr_save = function (r) {
      const s = M[0xF6] + 1; M[0xF4] = s & 255;
      const h = M[0xF7] + (s >> 8); M[0xF5] = h & 255;
      r.a = M[0xF5]; r.c = h >> 8; return flags(r, r.a);
    };
    // colour_face_block ($0F36): icon A at cell_row/cell_column ($15/$16): colour RAM 1 in a 4 x 4 block, then
    // the icon's 16 cells of bitmap from icon_addr_lo/hi ($1641/$164D); X and Y kept
    P.colour_face_block = function (r) {
      M[0x12] = r.a; M[0x13] = r.x; M[0x14] = r.y;
      cellAddr(0x0F56, M[0x15], M[0x16], 0xD8);
      fillBlock(0x0F56, 4, 16, 1);
      bitmapAddr(0x0FB1, M[0x15], M[0x16]);
      const i = M[0x12]; M[0x0FAE] = M[0x1641 + i]; M[0x0FAF] = M[0x164D + i];
      let a = 0;
      for (let y = 0; ;) {
        for (let x = 7; x >= 0; x--) { a = H.rd((w16(0x0FAE) + x) & 0xFFFF); H.wr((w16(0x0FB1) + x) & 0xFFFF, a); }
        y++;
        if (y === 16) break;
        add16(0x0FB1, (y & 3) ? 8 : 0x128);
        add16(0x0FAE, 8);
      }
      r.a = a; r.x = M[0x13]; r.y = M[0x14]; return flags(r, r.y);
    };
    // draw_frame_block ($0FFE): picture A (6 x 6 cells) at cell_row/cell_column, from the picture table its own
    // operands name ($1006 ... $1025, which the menu repoints): colour RAM, screen colours, bitmap; X and Y kept
    P.draw_frame_block = function (r) {
      M[0x12] = r.a; M[0x13] = r.x; M[0x14] = r.y;
      const i = r.a;
      M[0x10CB] = H.rd((w16(0x1006) + i) & 0xFFFF);
      M[0x10D0] = H.rd((w16(0x100C) + i) & 0xFFFF);
      M[0x1041] = H.rd((w16(0x1012) + i) & 0xFFFF);
      M[0x1042] = H.rd((w16(0x1018) + i) & 0xFFFF);
      M[0x107E] = H.rd((w16(0x101E) + i) & 0xFFFF);
      M[0x107F] = H.rd((w16(0x1024) + i) & 0xFFFF);
      cellAddr(0x1044, M[0x15], M[0x16], 0xD8);
      fillBlock(0x1044, 6, 36, (x) => H.rd((w16(0x1041) + x) & 0xFFFF));
      cellAddr(0x1081, M[0x15], M[0x16], 0x5C);
      fillBlock(0x1081, 6, 36, (x) => H.rd((w16(0x107E) + x) & 0xFFFF));
      M[0x17] = 6;
      bitmapAddr(0x10DC, M[0x15], M[0x16]);
      M[0x10D9] = M[0x10CB]; M[0x10DA] = M[0x10D0];
      let a = 0;
      for (let y = 0; ;) {
        for (let x = 7; x >= 0; x--) { a = H.rd((w16(0x10D9) + x) & 0xFFFF); H.wr((w16(0x10DC) + x) & 0xFFFF, a); }
        y++;
        if (y === 36) break;
        M[0x17] = (M[0x17] - 1) & 255;
        if (M[0x17]) add16(0x10DC, 8); else { M[0x17] = 6; add16(0x10DC, 0x118); }
        add16(0x10D9, 8);
      }
      r.a = a; r.x = M[0x13]; r.y = M[0x14]; return flags(r, r.y);
    };
    // draw_frame_tiles ($1265): frame_tiles ($11AC) at frame_rows/frame_columns through draw_tile, to the $FF
    P.draw_frame_tiles = function (r) {
      let x = 0;
      for (;;) {
        const t = M[0x11AC + x];
        if (t === 0xFF) { r.a = t; r.c = 1; r.z = 1; r.n = 1; break; }
        M[0x1261] = t; M[0x15] = M[0x1219 + x]; M[0x16] = M[0x11E3 + x];
        r.x = x; r = P.draw_tile(r);
        x = (x + 1) & 255;
        if (x === 0) { r.z = 1; r.n = 0; break; }
      }
      r.x = x; return r;
    };
    // draw_tile_block ($139F): the twelve grid_tiles ($124F) in a block 4 wide from tile_block_row/column
    P.draw_tile_block = function (r) {
      let x = 0, y = 0;
      do {
        const t = M[0x124F + x];
        r.a = t;
        if (t !== 0xFF) {
          M[0x1261] = t;
          M[0x16] = ((y & 3) + M[0x125B]) & 255;
          M[0x15] = ((y >> 2) + M[0x125C]) & 255;
          r.x = x; r.y = y; r = P.draw_tile(r);
        }
        x = (x + 1) & 255; y++;
      } while (y !== 12);
      r.x = x; r.y = y; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // make_times8 ($1457): 8 x N at $4B00 (low) and $4A00 (high), the high byte built in $21A6
    P.make_times8 = function (r) {
      let x = 0;
      do {
        M[0x21A6] = x >> 5;
        M[0x4B00 + x] = (x << 3) & 255;
        M[0x4A00 + x] = M[0x21A6];
        x = (x - 1) & 255;
      } while (x !== 0);
      r.a = M[0x21A6]; r.x = 0; r.z = 1; r.n = 0; return r;
    };
    // highlight_icon ($1478): subject icon X's 4 x 4 block in colour RAM value A, screen colour Y
    P.highlight_icon = function (r) {
      M[0x14A2] = r.a; M[0x12] = r.x; M[0x14DE] = r.y;
      M[0x15] = M[0x16B3 + r.x]; M[0x16] = M[0x16B9 + r.x];
      return P.highlight_cell(r);
    };
    // highlight_cell ($148A): the 4 x 4 block at cell_row/cell_column: colour RAM to the operand at $14A2, screen
    // colours to the one at $14DE; X back from $12
    P.highlight_cell = function (r) {
      cellAddr(0x14A4, M[0x15], M[0x16], 0xD8);
      fillBlock(0x14A4, 4, 16, () => M[0x14A2]);
      cellAddr(0x14E0, M[0x15], M[0x16], 0x5C);
      fillBlock(0x14E0, 4, 16, () => M[0x14DE]);
      r.a = M[0x14DE]; r.y = 4; r.x = M[0x12]; r.c = 1; return flags(r, r.x);
    };
    // stamp_star ($1505): star X: each non-zero byte of the 36-byte mask (operand $1529) into colour RAM, and $FF
    // into the 8 bitmap bytes of each of those cells
    P.stamp_star = function (r) {
      M[0x12] = r.x;
      M[0x16] = M[0x16F3 + r.x]; M[0x15] = M[0x16FF + r.x];
      cellAddr(0x152E, M[0x15], M[0x16], 0xD8);
      let x = 0, y = 0, a;
      for (;;) {
        a = H.rd((w16(0x1529) + x) & 0xFFFF);
        if (a) H.wr((w16(0x152E) + y) & 0xFFFF, a);
        x++; y++;
        if (y === 6) { if (x === 36) break; y = 0; add16(0x152E, 40); }
      }
      M[0x17] = 6;
      bitmapAddr(0x1583, M[0x15], M[0x16]);
      return P.stamp_star_bitmap(Object.assign(r, { y: 0 }));
    };
    // stamp_star_bitmap ($1579): the second pass, from cell Y on
    P.stamp_star_bitmap = function (r) {
      let y = r.y, x, a;
      for (;;) {
        x = 7;
        for (;;) {
          a = H.rd((w16(0x157C) + y) & 0xFFFF);
          if (!a) break;
          a = 0xFF; H.wr((w16(0x1583) + x) & 0xFFFF, a);
          x = (x - 1) & 255;
          if (x & 0x80) break;
        }
        y = (y + 1) & 255;
        if (y === 0x24) break;
        M[0x17] = (M[0x17] - 1) & 255;
        if (M[0x17]) add16(0x1583, 8); else { M[0x17] = 6; add16(0x1583, 0x118); }
      }
      r.a = a; r.x = x; r.y = y; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // clear_block_colours ($15C8): colour RAM and screen colours of the 6 x 6 block at cell_row/cell_column to 0
    P.clear_block_colours = function (r) {
      cellAddr(0x15E2, M[0x15], M[0x16], 0xD8);
      fillBlock(0x15E2, 6, 36, 0);
      cellAddr(0x161E, M[0x15], M[0x16], 0x5C);
      fillBlock(0x161E, 6, 36, 0);
      r.a = 0; r.x = 36; r.y = 6; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // make_mirror_table ($17CD): $B700 + N = N with its bit pairs reversed
    P.make_mirror_table = function (r) {
      let x = 0;
      do {
        r.a = x; r = P.mirror_pairs(r);
        M[0xB700 + x] = r.a;
        x = (x - 1) & 255;
      } while (x !== 0);
      r.x = 0; r.z = 1; r.n = 0; return r;
    };
    // mirror_pairs ($17DA): A's four bit pairs in reverse order, built in mirror_work ($180A)
    P.mirror_pairs = function (r) {
      const a = r.a;
      M[0x180A] = (a >> 6) & 3;
      M[0x180A] |= (a & 0x30) >> 2;
      M[0x180A] |= (a & 0x0C) << 2;
      M[0x180A] = (M[0x180A] | (a & 3) << 6) & 255;
      r.a = M[0x180A]; r.c = 0; return flags(r, r.a);
    };
    // fill_colour_block ($1846): a bar of A cells, three rows, at pixel X, Y, in the colour colour_value
    // ($188E), in the screen colours or colour RAM as colour_target ($1863) says
    P.fill_colour_block = function (r) {
      M[0x15] = r.y; M[0x16] = r.x; M[0x189B] = r.a;
      const row = M[0x15] >> 3;
      let s = (M[0x16] >> 3) + M[0x1717 + row];
      M[0x1890] = s & 255; M[0x1891] = (M[0x1730 + row] + M[0x1863] + (s >> 8)) & 255;
      s = M[0x1890] + 40; M[0x1893] = s & 255; M[0x1894] = (M[0x1891] + (s >> 8)) & 255;
      s = M[0x1893] + 40; M[0x1896] = s & 255; M[0x1897] = (M[0x1894] + (s >> 8)) & 255;
      let y = 0;
      const v = M[0x188E];
      do {
        H.wr((w16(0x1890) + y) & 0xFFFF, v);
        H.wr((w16(0x1893) + y) & 0xFFFF, v);
        H.wr((w16(0x1896) + y) & 0xFFFF, v);
        y = (y + 1) & 255;
      } while (y !== M[0x189B]);
      r.a = v; r.x = y; r.y = y; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // put_pixel_bar ($189F): a bar A cells wide and bar_height ($18E5) lines high from pixel X, Y, of the byte
    // bar_pattern ($18EE), the first cell's bytes ANDed with $0F
    const barLineAddr = () => {
      bitmapAddr(0x18F6, M[0x15] >> 3, M[0x16] >> 3);
      const s = (M[0x15] & 7) + M[0x18F6]; M[0x18F6] = s & 255; M[0x18F7] = (M[0x18F7] + (s >> 8)) & 255;
    };
    P.put_pixel_bar = function (r) {
      M[0x15] = r.y; M[0x16] = r.x; M[0x18FF] = r.a;
      barLineAddr();
      M[0x194B] = M[0x18E5];
      return P.put_pixel_line(r);
    };
    // put_pixel_line ($18E9): the bar's lines from the current one
    P.put_pixel_line = function (r) {
      let x, y;
      for (;;) {
        x = 0; y = 0;
        do {
          let a = M[0x18EE];
          if (x === 0) a &= 0x0F;
          H.wr((w16(0x18F6) + x) & 0xFFFF, a);
          x = (x + 8) & 255; y = (y + 1) & 255;
        } while (y !== M[0x18FF]);
        M[0x194B] = (M[0x194B] - 1) & 255;
        if (!M[0x194B]) break;
        M[0x15] = (M[0x15] + 1) & 255;
        barLineAddr();
      }
      r.a = x; r.x = x; r.y = y; r.z = 1; r.n = 0; return r;
    };
    // print_text ($194C): text A of the table at $3314/$333B into the sprite text panel at pixel column X, line Y
    P.print_text = function (r) {
      M[0x1843] = r.x;
      M[0x1968] = M[0x3314 + r.a]; M[0x1969] = M[0x333B + r.a];
      M[0x1844] = r.y;
      M[0x1B78] = 0;
      return P.print_next_char(r);
    };
    // print_next_char ($1964): the text's characters from print_index ($1B78) to its $FF
    P.print_next_char = function (r) {
      for (;;) {
        r.x = M[0x1B78];
        let a = H.rd((w16(0x1968) + r.x) & 0xFFFF);
        if (a === 0xFF) { r.a = a; r.c = 1; r.z = 1; r.n = 1; return P.print_done(r); }
        const map = { 0x2C: 0x3F, 0x28: 0x40, 0x29: 0x41, 0x27: 0x44, 0x26: 0x42, 0x2D: 0x43, 0x2E: 0x3E, 0x2F: 0x45 };
        if (map[a] !== undefined) a = map[a];
        else if (a !== 0x20 && a < 0x3A) a = (a + 4) & 255;
        else { a = (a - 0x41) & 255; if (a >= 0x1A) a = (a - 6) & 255; }
        M[0x1B77] = a; r.x = a;
        M[0x19E5] = M[0x954E + a];
        if (a === 0xD9) M[0x19E5] = 6;
        else r = P.draw_glyph(r);
        const s = M[0x1843] + M[0x19E5]; M[0x1843] = s & 255;
        M[0x1B78] = (M[0x1B78] + 1) & 255;
        if (M[0x1B78] === 0) { r.a = s & 255; r.c = s >> 8; r.z = 1; r.n = 0; return P.print_done(r); }
      }
    };
    // print_done ($19F1)
    P.print_done = function (r) { return r; };
    // draw_glyph ($19F2): ORs glyph print_char ($1B77) into the panel at print_x, print_line, each line shifted
    // to the pixel through glyph_bits ($1B74-$1B76); the panel's three sprite rows begin at lines $15 and $2A
    P.draw_glyph = function (r) {
      let x = M[0x1B77], y;
      M[0x1A30] = M[0xA7A1 + x]; M[0x1A31] = M[0xA7E7 + x];
      M[0x1B73] = M[0x9594 + x]; M[0x1AED] = M[0x1B73];
      M[0x1A1C] = M[0x1844];
      for (;;) {
        M[0x1B74] = 0; M[0x1B75] = 0; M[0x1B76] = 0;
        y = M[0x1A1C];
        M[0x1B79] = M[0xAD39 + y]; M[0x1B7A] = M[0xAD78 + y];
        x = M[0x1843] & 7;
        M[0x1B74] = H.rd(w16(0x1A30));
        if (M[0x19E5] >= 0x0A) {
          const s = M[0x1A30] + 8; M[0x1A4E] = s & 255; M[0x1A4F] = (M[0x1A31] + (s >> 8)) & 255;
          M[0x1B75] = H.rd(w16(0x1A4E));
        }
        if (x !== 0) {
          let a = M[0x1B74];
          for (; x > 0; x--) {
            let c = a & 1; a >>= 1;
            const b = M[0x1B75]; M[0x1B75] = (c << 7) | (b >> 1); c = b & 1;
            M[0x1B76] = (c << 7) | (M[0x1B76] >> 1);
          }
          M[0x1B74] = a;
        }
        x = M[0x1843] >> 3;
        y = M[0x1A1C];
        const bytes = [0x1B74, 0x1B75, 0x1B76];
        if (y === 0x15 || y === 0x2A) {
          // glyph_or_row_start ($1AF2)
          for (let k = 0; k < 3; k++) {
            if (k) x = (x + 1) & 255;
            let s = M[0x1B79] + M[0xADE7 + x]; M[0x10] = s & 255; M[0x11] = (M[0x1B7A] + M[0xADFF + x] + (s >> 8)) & 255;
            s = M[0x10] - M[0xAE17 + x]; M[0x10] = s & 255; M[0x11] = (M[0x11] - M[0xAE2F + x] - (s < 0 ? 1 : 0)) & 255;
            const p = w16(0x10); H.wr(p, H.rd(p) | M[bytes[k]]);
          }
        } else {
          // glyph_or_bytes ($1A90)
          for (let k = 0; k < 3; k++) {
            if (k) x = (x + 1) & 255;
            const s = M[0x1B79] + M[0xADB7 + x]; M[0x10] = s & 255; M[0x11] = (M[0x1B7A] + M[0xADCF + x] + (s >> 8)) & 255;
            const p = w16(0x10); H.wr(p, H.rd(p) | M[bytes[k]]);
          }
        }
        y = 0;
        // draw_glyph_next ($1ACF)
        M[0x1A30] = (M[0x1A30] + 1) & 255; if (M[0x1A30] === 0) M[0x1A31] = (M[0x1A31] + 1) & 255;
        M[0x1844] = (M[0x1844] + 1) & 255; M[0x1A1C] = M[0x1844];
        M[0x1B73] = (M[0x1B73] - 1) & 255;
        if (M[0x1B73] === 0) break;
      }
      const s = M[0x1844] - M[0x1AED]; M[0x1844] = s & 255;
      r.a = s & 255; r.c = s >= 0 ? 1 : 0; r.x = x; r.y = y; return flags(r, r.a);
    };
    // score_digits_frame ($1ED6): the four score digits into sprite shapes 8-11, then each team's shown score
    // rolls on towards its real one; from the interrupt it ends at irq_to_bottom ($0BC5)
    P.score_digits_frame = function (r) {
      M[0x2066] = 0;
      r.x = 3;
      return P.score_digit_copy(r);
    };
    // score_digit_copy ($1EDD): digits X down to 0, 16 lines of 2 bytes each from the rolling strip
    P.score_digit_copy = function (r) {
      let d = r.x, y = 0;
      do {
        M[0x1F2F] = d;
        M[0x1F07] = M[0x1F0E] = M[0x389C + d];
        M[0x1F08] = M[0x1F0F] = M[0x38A0 + d];
        M[0x0A] = M[0x2067 + d]; M[0x0B] = M[0x206B + d];
        M[0x0D] = 0x10;
        y = 0;
        do {
          H.wr(w16(0x1F07), H.rd((w16(0x0A) + y) & 0xFFFF));
          y = (y + 1) & 255;
          H.wr((w16(0x1F0E) + 1) & 0xFFFF, H.rd((w16(0x0A) + y) & 0xFFFF));
          const s = M[0x1F07] + 3; M[0x1F07] = M[0x1F0E] = s & 255;
          M[0x1F08] = M[0x1F0F] = (M[0x1F08] + (s >> 8)) & 255;
          y = (y + 1) & 255;
          M[0x0D] = (M[0x0D] - 1) & 255;
        } while (M[0x0D]);
        d = (M[0x1F2F] - 1) & 255;
      } while (!(d & 0x80));
      r.x = d; r.y = y;
      if (M[0x38A6] !== M[0x38A4]) return P.score_roll_team0(r);
      M[0x2066] = (M[0x2066] + 1) & 255;
      return P.score_roll_team1(r);
    };
    // one team's roll: the shown score up by 1 every 16th frame, the tens digit rolling while its count runs,
    // the units digit a line a frame, the strip wrapping from $AA09 to $A8C9
    const roll = (anim, shown, tens, tensLo, tensHi, unitsLo, unitsHi) => {
      M[anim] = (M[anim] + 1) & 255;
      if ((M[anim] & 15) === 0) M[shown] = H.adcD(M[shown], 1, 0).a;
      if (M[tens]) {
        M[tens] = (M[tens] - 1) & 255;
        const s = M[tensLo] + 2; M[tensLo] = s & 255; M[tensHi] = (M[tensHi] + (s >> 8)) & 255;
        if (M[tensHi] === 0xAA && M[tensLo] === 0x09) { M[tensLo] = 0xC9; M[tensHi] = 0xA8; }
      }
      const s = M[unitsLo] + 2; M[unitsLo] = s & 255; M[unitsHi] = (M[unitsHi] + (s >> 8)) & 255;
      if (M[unitsHi] === 0xA9 && M[unitsLo] === 0xE9) M[tens] = 0x10;
      if (M[unitsHi] === 0xAA && M[unitsLo] === 0x09) { M[unitsLo] = 0xC9; M[unitsHi] = 0xA8; }
    };
    // score_roll_team0 ($1F41)
    P.score_roll_team0 = function (r) {
      roll(0xFC, 0x38A4, 0x2070, 0x2067, 0x206B, 0x2068, 0x206C);
      return P.score_roll_team1(r);
    };
    // score_roll_team1 ($1FC1), and the end of the frame's roll ($204F)
    P.score_roll_team1 = function (r) {
      if (M[0x38A7] === M[0x38A5]) M[0x2066] = (M[0x2066] + 1) & 255;
      else roll(0xFD, 0x38A5, 0x2071, 0x2069, 0x206D, 0x206A, 0x206E);
      if (M[0x2066] === 2) M[0xFF] = 0xFF;
      if (M[0x206F]) { r.a = M[0x206F]; return P.irq_to_bottom(r); }
      M[0x206F] = 1;
      r.a = 0; r.z = 0; r.n = 0; return r;
    };
    // clear_play_colours ($2072): each text row's run of cells (clear_row_length/column, $20A9/$20C2) to 0 in
    // the screen colours and colour RAM, from the right end
    P.clear_play_colours = function (r) {
      for (let x = 0; x < 25; x++) {
        let y = M[0x20A9 + x];
        r.y = y;
        if (!y) continue;
        const s = M[0x1717 + x] + M[0x20C2 + x], c = s >> 8;
        M[0x209B] = M[0x209E] = s & 255;
        M[0x209C] = (M[0x1730 + x] + 0x5C + c) & 255;
        M[0x209F] = (M[0x1730 + x] + 0xD8 + c) & 255;
        r.a = 0;
        do {
          H.wr((w16(0x209B) + y) & 0xFFFF, 0);
          H.wr((w16(0x209E) + y) & 0xFFFF, 0);
          y = (y - 1) & 255;
        } while (!(y & 0x80));
        r.y = y;
      }
      r.x = 25; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // a quarter of the clock: four rows of four tiles, each mirrored through $B700 into the row buffer $8FE8
    // from its right end, the list at operand lst, the tile source at operand src, the bitmap at operand dst
    const clockMirrored = (lst, src, dst) => {
      M[0x29] = 0x0C; M[0x9009] = 0;
      for (;;) {
        let y = 0x1F;
        do {
          const x = M[0x29];
          M[0x9008] = y;
          const t = H.rd((w16(lst) + x) & 0xFFFF);
          const s = M[0x4B00 + t] + 0x0A; M[src] = s & 255; M[src + 1] = (M[0x4A00 + t] + 0x90 + (s >> 8)) & 255;
          y = M[0x9008];
          for (let k = 0; k < 8; k++) {
            const a = H.rd((w16(src) + k) & 0xFFFF);
            M[0x9008] = y;
            M[0x8FE8 + y] = M[0xB700 + a];
            y = (y - 1) & 255;
          }
          M[0x29] = (M[0x29] + 1) & 255;
        } while (y !== 0xFF);
        y = 0;
        for (;;) {
          for (let x = 0; x < 8; x++) { H.wr((w16(dst) + x) & 0xFFFF, M[0x8FE8 + y]); y++; }
          if (y === 0x20) break;
          add16(dst, 8);
        }
        M[0x9009] = (M[0x9009] + 1) & 255;
        if (M[0x9009] === 4) break;
        M[0x29] = (M[0x29] - 8) & 255;
        add16(dst, 0x128);
      }
    };
    // draw_clock ($20DE): clock face A, 8 x 8 cells, at column X, row Y: colour RAM 1, screen colours $B5, the
    // right half's tiles from its list, the left half mirrored from the upper and lower quarters' lists
    P.draw_clock = function (r) {
      M[0x20DB] = r.a; M[0x20DC] = r.x; M[0x20DD] = r.y;
      M[0x21A5] = M[0x8F28 + r.a]; M[0x21A6] = M[0x8F48 + r.a];
      cellAddr(0x2110, M[0x20DD], M[0x20DC], 0xD8);
      fillBlock(0x2110, 8, 64, 1);
      cellAddr(0x214E, M[0x20DD], M[0x20DC], 0x5C);
      fillBlock(0x214E, 8, 64, 0xB5);
      M[0x20DC] = (M[0x20DC] + 4) & 255;
      bitmapAddr(0x21C0, M[0x20DD], M[0x20DC]);
      M[0x29] = 0;
      for (;;) {
        const t = H.rd((w16(0x21A5) + M[0x29]) & 0xFFFF);
        const s = M[0x4B00 + t] + 0x0A; M[0x21BD] = s & 255; M[0x21BE] = (M[0x4A00 + t] + 0x90 + (s >> 8)) & 255;
        for (let x = 7; x >= 0; x--) H.wr((w16(0x21C0) + x) & 0xFFFF, H.rd((w16(0x21BD) + x) & 0xFFFF));
        M[0x29] = (M[0x29] + 1) & 255;
        if (M[0x29] === 0x20) break;
        add16(0x21C0, (M[0x29] & 3) ? 8 : 0x128);
      }
      const f = M[0x20DB];
      M[0x2247] = M[0x8F68 + f]; M[0x2248] = M[0x8F88 + f];
      M[0x20DC] = (M[0x20DC] - 4) & 255;
      bitmapAddr(0x2286, M[0x20DD], M[0x20DC]);
      clockMirrored(0x2247, 0x2260, 0x2286);
      M[0x2319] = M[0x8FA8 + f]; M[0x231A] = M[0x8FC8 + f];
      M[0x20DD] = (M[0x20DD] + 4) & 255;
      bitmapAddr(0x2358, M[0x20DD], M[0x20DC]);
      clockMirrored(0x2319, 0x2332, 0x2358);
      r.a = 4; r.x = 8; r.y = 0x20; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // draw_grid_number ($23B6): Jukebox number A at cell_row/cell_column: colour RAM from $8080, its four digit
    // pieces into the ball picture at $8000, then the picture's 16 cells into the bitmap; X and Y kept
    P.draw_grid_number = function (r) {
      M[0x12] = r.a; M[0x13] = r.x; M[0x14] = r.y;
      M[0x243E] = M[0x239E + r.a]; M[0x243F] = M[0x23AA + r.a];
      let s = M[0x243E] + 8; M[0x2444] = s & 255; M[0x2445] = (M[0x243F] + (s >> 8)) & 255;
      s = M[0x2444] + 8; M[0x244A] = s & 255; M[0x244B] = (M[0x2445] + (s >> 8)) & 255;
      s = M[0x244A] + 8; M[0x2450] = s & 255; M[0x2451] = (M[0x244B] + (s >> 8)) & 255;
      cellAddr(0x2417, M[0x15], M[0x16], 0xD8);
      fillBlock(0x2417, 4, 16, (x) => H.rd(0x8080 + x));
      for (let x = 0; x < 8; x++) {
        H.wr(0x8028 + x, H.rd((w16(0x243E) + x) & 0xFFFF));
        H.wr(0x8030 + x, H.rd((w16(0x2444) + x) & 0xFFFF));
        H.wr(0x8048 + x, H.rd((w16(0x244A) + x) & 0xFFFF));
        H.wr(0x8050 + x, H.rd((w16(0x2450) + x) & 0xFFFF));
      }
      bitmapAddr(0x248F, M[0x15], M[0x16]);
      M[0x248C] = 0; M[0x248D] = 0x80;
      let a = 0;
      for (let y = 0; ;) {
        for (let x = 7; x >= 0; x--) { a = H.rd((w16(0x248C) + x) & 0xFFFF); H.wr((w16(0x248F) + x) & 0xFFFF, a); }
        y++;
        if (y === 16) break;
        add16(0x248F, (y & 3) ? 8 : 0x128);
        add16(0x248C, 8);
      }
      r.a = a; r.x = M[0x13]; r.y = M[0x14]; return flags(r, r.y);
    };
    // draw_show_frame ($28C0): the studio frame's tiles and the tile block at row 6, column $12
    P.draw_show_frame = function (r) {
      M[0x125E] = 0;
      r = P.draw_frame_tiles(r);
      M[0x125C] = 6; M[0x125B] = 0x12;
      return P.draw_tile_block(r);
    };
    const clearAt = (r, col, row) => { M[0x16] = col; M[0x15] = row; return P.clear_block_colours(r); };
    // clear_choice_area ($28D6): the six subject blocks on row 3, 150 bitmap cells from $62D0, answer_cursor
    // ($0CB8) to 0, then clear_panel
    P.clear_choice_area = function (r) {
      for (const c of [0x07, 0x0B, 0x0F, 0x13, 0x17, 0x1B]) { M[0x15] = 3; M[0x16] = c; r = P.clear_block_colours(r); }
      r.x = 0x62; r.y = 0xD0; r = P.clear_bitmap_cells(r);
      M[0x0CB8] = 0;
      return P.clear_panel(r);
    };
    // hide_left_team ($31D7)
    P.hide_left_team = function (r) {
      r = clearAt(r, 0x03, 0x09); r = clearAt(r, 0x01, 0x01); return clearAt(r, 0x06, 0x11);
    };
    const pictureAt = (r, col, row, n) => { M[0x16] = col; M[0x15] = row; r.a = n; return P.draw_frame_block(r); };
    // draw_left_team ($31F8)
    P.draw_left_team = function (r) {
      r = pictureAt(r, 0x03, 0x09, 1); r = pictureAt(r, 0x01, 0x01, 3); r = pictureAt(r, 0x06, 0x11, 4);
      return pictureAt(r, 0x11, 0x0A, 0);
    };
    // hide_right_team ($322D)
    P.hide_right_team = function (r) {
      r = clearAt(r, 0x1F, 0x09); r = clearAt(r, 0x21, 0x01); return clearAt(r, 0x1C, 0x11);
    };
    // draw_right_team ($324E)
    P.draw_right_team = function (r) {
      r = pictureAt(r, 0x1F, 0x09, 2); r = pictureAt(r, 0x21, 0x01, 5); r = pictureAt(r, 0x1C, 0x11, 6);
      return pictureAt(r, 0x11, 0x0A, 0);
    };
    // clear_answer_blocks ($3283)
    P.clear_answer_blocks = function (r) {
      r = clearAt(r, 0x0F, 0x0F); r = clearAt(r, 0x13, 0x0F); r = clearAt(r, 0x0F, 0x10); return clearAt(r, 0x13, 0x10);
    };
    // draw_centre ($32B0): picture 0 at column 17 row 17, the frame tiles 8 rows lower, the tile block at row 14
    P.draw_centre = function (r) {
      r = pictureAt(r, 0x11, 0x11, 0);
      M[0x125E] = 8;
      r = P.draw_frame_tiles(r);
      M[0x125C] = 0x0E; M[0x125B] = 0x12; M[0x125E] = 0;
      return P.draw_tile_block(r);
    };
    // clear_answer_bars ($32D6): the four answer bars' colours to 0, colour RAM and screen colours in turn
    P.clear_answer_bars = function (r) {
      M[0x188E] = 0;
      for (const [t, y] of [[0xD8, 0x13], [0x5C, 0x23], [0xD8, 0x33], [0x5C, 0x43]]) {
        M[0x1863] = t; r.x = 0x46; r.y = y; r.a = 0x17; r = P.fill_colour_block(r);
      }
      return r;
    };
    // show_turn_player ($33CE): clears the colours of the six players' pictures but the one at $AF3A
    P.show_turn_player = function (r) {
      let y = 6;
      do {
        if (y !== H.rd(0xAF3A)) {
          M[0x16] = M[0x16EC + y]; M[0x15] = M[0x16E5 + y];
          M[0x33EA] = y;
          r.x = M[0x16]; r.y = M[0x15];
          r = P.clear_block_colours(r);
          y = M[0x33EA];
        }
        y = (y - 1) & 255;
      } while (y !== 0);
      r.y = 0; r.z = 1; r.n = 0; return r;
    };
    // clear_bitmap_cells ($350C): 150 cells, 18 a row, from X (high) / Y (low)
    P.clear_bitmap_cells = function (r) {
      M[0x17] = 0x12; M[0x351D] = r.y; M[0x351E] = r.x;
      let y = 0;
      for (;;) {
        for (let x = 7; x >= 0; x--) H.wr((w16(0x351D) + x) & 0xFFFF, 0);
        y++;
        if (y === 0x96) break;
        M[0x17] = (M[0x17] - 1) & 255;
        if (M[0x17]) add16(0x351D, 8); else { M[0x17] = 0x12; add16(0x351D, 0xB8); }
      }
      r.a = 0; r.x = 0xFF; r.y = y; r.c = 1; r.z = 1; r.n = 0; return r;
    };
    // clear_bubble ($3663): zeroes the bubble's shapes $4000-$41FF
    P.clear_bubble = function (r) {
      for (let x = 0; x < 256; x++) { M[0x4000 + x] = 0; M[0x4100 + x] = 0; }
      r.a = 0; r.x = 0; r.z = 1; r.n = 0; return r;
    };
    // bubble_step ($3671): one pixel of the bubble, or the wait for fire while wait_fire_flag ($3680) is set
    P.bubble_step = function (r) {
      if (M[0x3680]) return P.wait_fire_text(r);
      r = P.glyph_pixel_step(r);
      return P.bubble_scroll(r);
    };
    // clear_panel ($3696): zeroes the text panel's shapes $4400-$49FF
    P.clear_panel = function (r) {
      for (let x = 0; x < 256; x++) for (let p = 0x4400; p < 0x4A00; p += 0x100) M[p + x] = 0;
      r.a = 0; r.x = 0; r.z = 1; r.n = 0; return r;
    };
    // text_print ($36B0)
    P.text_print = function (r) { return P.text_decode(r); };
    // the glyph's current 21-byte column into bubble_glyph_column ($1B7B), or zeroes for a space ($36CC)
    const glyphColumn = (r) => {
      M[0x08] = 0;
      r.y = 0;
      const ch = H.rd(w16(0xF6));
      if (ch === 0x20) {
        for (let x = 0x14; x >= 0; x--) M[0x1B7B + x] = 0;
        r.a = 0;
      } else {
        let a = 0;
        for (let x = 0x14; x >= 0; x--) { a = H.rd((w16(0x36DB) + x) & 0xFFFF); M[0x1B7B + x] = a; }
        r.a = a;
      }
      r.x = 0xFF; r.z = 0; r.n = 1; return r;
    };
    // set_glyph ($36B3): bubble glyph X: its columns ($A82D/$A87B), its width ($A753, 11 for the space $DF)
    P.set_glyph = function (r) {
      const x = r.x;
      M[0x36DB] = M[0xA82D + x]; M[0x36DC] = M[0xA87B + x];
      M[0x06] = M[0xA753 + x];
      if (x === 0xDF) M[0x06] = 0x0B;
      return glyphColumn(r);
    };
    // glyph_pixel_step ($36EF): one pixel of the glyph: the next character when its width runs out, the next
    // column every 8 pixels
    P.glyph_pixel_step = function (r) {
      M[0x06] = (M[0x06] - 1) & 255;
      if (M[0x06] === 0) { r = P.text_ptr_next(r); return P.text_decode(r); }
      M[0x08] = (M[0x08] + 1) & 255;
      if (M[0x08] !== 8) { r.a = M[0x08]; r.c = M[0x08] >= 8 ? 1 : 0; return flags(r, (r.a - 8) & 255); }
      r.y = (M[0x07] + 1) & 255; M[0x07] = r.y;
      add16(0x36DB, 0x15);
      return glyphColumn(r);
    };
    const textByte = (r) => H.rd((w16(0xF6) + r.y) & 0xFFFF);
    // text_ctl_f3 ($3715): `$F3 n`, number word n ($B162/$B16B), returning after it
    P.text_ctl_f3 = function (r) {
      r = P.text_ptr_next(r);
      r.x = textByte(r);
      r = P.text_ptr_save(r);
      M[0xF6] = M[0xB162 + r.x]; M[0xF7] = M[0xB16B + r.x];
      return P.text_decode(r);
    };
    // text_ctl_f0 ($372B): `$F0 n`, text_event_arg ($24) = n, text_event ($23) = $FF
    P.text_ctl_f0 = function (r) {
      r = P.text_ptr_next(r);
      M[0x24] = textByte(r); M[0x23] = 0xFF;
      r = P.text_ptr_next(r);
      return P.text_decode(r);
    };
    // text_ctl_f2 ($373C): `$F2 n`, subject name n ($AB8D/$AB93), returning after it
    P.text_ctl_f2 = function (r) {
      r = P.text_ptr_next(r);
      r.x = textByte(r);
      r = P.text_ptr_save(r);
      M[0xF6] = M[0xAB8D + r.x]; M[0xF7] = M[0xAB93 + r.x];
      return P.text_decode(r);
    };
    // text_ctl_ff ($3752): `$FF`, back to text_return ($F4/$F5)
    P.text_ctl_ff = function (r) {
      M[0xF6] = M[0xF4]; M[0xF7] = M[0xF5];
      return P.text_decode(r);
    };
    // text_ctl_fe ($375D): `$FE`, back to name_return ($3402/$3403)
    P.text_ctl_fe = function (r) {
      M[0xF6] = M[0x3402]; M[0xF7] = M[0x3403];
      return P.text_decode(r);
    };
    // text_decode ($376D): the byte at text_ptr: a control byte's handler, or a character's glyph
    P.text_decode = function (r) {
      r.y = 0;
      const a = textByte(r);
      r.a = a;
      switch (a) {
        case 0xF0: return P.text_ctl_f0(r);
        case 0xF1: return P.text_ctl_f1(r);
        case 0xF2: return P.text_ctl_f2(r);
        case 0xF3: return P.text_ctl_f3(r);
        case 0xFF: return P.text_ctl_ff(r);
        case 0xFE: return P.text_ctl_fe(r);
        case 0x7E: return P.text_ctl_7e(r);
        case 0x7D: return P.text_ctl_7d(r);
        case 0x7C: return P.wait_fire_text(r);
        case 0x7F: return P.text_end(r);
        default: return P.char_to_glyph(r);
      }
    };
    // text_ctl_f1 ($379F): `$F1 n`, name n from the name table its operands name ($37B5/$37BA), returning to
    // name_return
    P.text_ctl_f1 = function (r) {
      r = P.text_ptr_next(r);
      r.x = textByte(r);
      const s = M[0xF6] + 1; M[0x3402] = s & 255; M[0x3403] = (M[0xF7] + (s >> 8)) & 255;
      M[0xF6] = H.rd((w16(0x37B5) + r.x) & 0xFFFF);
      M[0xF7] = H.rd((w16(0x37BA) + r.x) & 0xFFFF);
      return P.text_decode(r);
    };
    // wait_fire_text ($37C1): `$7C`: either player's fire goes on with the text; neither sets wait_fire_flag
    P.wait_fire_text = function (r) {
      M[0xF9] = 0; M[0x3680] = 0;
      r.a = 0; r = P.read_input(r);
      if (r.a & 0x10) {
        M[0xF9] = 1;
        r.a = 1; r = P.read_input(r);
        if (r.a & 0x10) { M[0x3680] = 0xFF; r.a = 0xFF; r.z = 0; r.n = 1; return r; }
      }
      r = P.text_ptr_next(r);
      return P.text_decode(r);
    };
    // text_ctl_7e ($37E6): `$7E lo hi`, goes on at the address
    P.text_ctl_7e = function (r) {
      r = P.text_ptr_next(r);
      M[0x0D28] = textByte(r);
      r = P.text_ptr_next(r);
      M[0xF7] = textByte(r);
      M[0xF6] = M[0x0D28];
      return P.text_decode(r);
    };
    // text_ctl_7d ($37FD): `$7D lo hi`, calls the string at the address, its `$FF` returning after the operand
    P.text_ctl_7d = function (r) {
      r = P.text_ptr_next(r);
      M[0x0D28] = textByte(r);
      r = P.text_ptr_next(r);
      M[0x0D29] = textByte(r);
      r = P.text_ptr_save(r);
      M[0xF6] = M[0x0D28]; M[0xF7] = M[0x0D29];
      return P.text_decode(r);
    };
    // text_end ($381D): `$7F`, step_done ($FF) = $FF
    P.text_end = function (r) {
      M[0xFF] = 0xFF; r.a = 0xFF; r.z = 0; r.n = 1; return r;
    };
    // char_to_glyph ($3822): the character's bubble glyph, then set_glyph
    P.char_to_glyph = function (r) {
      M[0x07] = 0;
      const a = textByte(r);
      const map = { 0x3D: 0x4D, 0x2E: 0x3A, 0x26: 0x4B, 0x2F: 0x4C, 0x2D: 0x4A, 0x3A: 0x4A, 0x3F: 0x3B, 0x2C: 0x3C, 0x28: 0x3D, 0x29: 0x3E, 0x27: 0x3F };
      if (map[a] !== undefined) r.x = map[a];
      else if (a < 0x3A && a >= 0x30) r.x = a + 0x10;
      else r.x = (a - 0x41) & 255;
      return P.set_glyph(r);
    };
    // copy_title_colours ($3ACC): $F800-$FBFF into colour RAM
    P.copy_title_colours = function (r) {
      let x = 0, a = 0;
      do {
        for (let p = 0; p < 4; p++) { a = H.rd(0xF800 + p * 256 + x); H.wr(0xD800 + p * 256 + x, a); }
        x = (x - 1) & 255;
      } while (x !== 0);
      r.a = a; r.x = 0; r.z = 1; r.n = 0; return r;
    };
    // clear_bitmap_strip ($AB41): 224 cells, 28 a row, from X (high) / Y (low)
    P.clear_bitmap_strip = function (r) {
      M[0x17] = 0x1C; M[0xAB52] = r.y; M[0xAB53] = r.x;
      let y = 0;
      for (;;) {
        for (let x = 7; x >= 0; x--) H.wr((w16(0xAB52) + x) & 0xFFFF, 0);
        y++;
        if (y === 0xE0) break;
        M[0x17] = (M[0x17] - 1) & 255;
        if (M[0x17]) add16(0xAB52, 8); else { M[0x17] = 0x1C; add16(0xAB52, 0x68); }
      }
      r.a = 0; r.x = 0xFF; r.y = y; r.c = 1; r.z = 1; r.n = 0; return r;
    };
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
