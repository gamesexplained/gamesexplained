// The view ($9693-$A038, $963B): the view's buffer at $AE10 (28 bytes across, 152 rows, a byte
// for 8 pixels) scrolled after the leader, its new edges drawn from the area's map, and copied to
// the screen not shown.
//
// The view's place is kept in $9631-$9634: $9633 the map's character column at the buffer's left,
// $9634 the character row at its top, $9632 the pixel row within that character row (0 to 7), and
// $9631 set when the view stands half a character to the right of $9633. The map is in bank 0 at
// $C000, a block a byte, 64 blocks to a row; a block is 4 by 4 characters, whose numbers its
// definition at $C8F0 gives (block_chars), and a character's 8 bytes are in bank 4 from $CD40.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.view = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);       // a pointer moved by n in its low byte

  // show_view ($963B): the 144 rows of the buffer ($AE10 plus $9630, 28 bytes a row, one after
  // another) to the screen paged in at $C000, each row to the address the next word of the row
  // table at $8D5D names, with the interrupts off; then a pass of the sound driver. The game reads
  // the table through the stack pointer, which it keeps meanwhile at $962E: $BFEC, where the main
  // loop's stack stands whenever this runs ($86CA calls $98FF, which comes to $9987, which calls
  // this).
  P.def(0x963B, 'show_view', () => {
    let hl = 0xAE00 | ((0x10 + M[0x9630]) & 255);
    M[0x962E] = 0xEC; M[0x962F] = 0xBF;
    const mem = P.mem;
    for (let row = 0, t = 0x8D5D; row < 0x90; row++, t += 2) {
      const de = M[t] | M[t + 1] << 8;
      for (let i = 0; i < 28; i++) M[mem.alias((de + i) & 0xFFFF)] = M[(hl + i) & 0xFFFF];
      hl = (hl + 28) & 0xFFFF;
    }
    P.snd_frame({});
    return {};
  });

  // --- scrolling ---
  // $96C5: the pixel row kept within its character row, and $9630 (where show_view starts in the
  // buffer) 28 times it
  function rowOffset() {
    const a = M[0x9632] & 7;
    M[0x9632] = a;
    M[0x9630] = (a * 28) & 255;
    return { a: M[0x9630] };
  }
  P.def(0x96C5, 'scroll_up_96c5', rowOffset);
  // the leader's row in the buffer less the pixel row: +$16 of his record less $9637, the view's
  // top as pixels
  const leaderRow = () => ((w(0x8316) - w(0x9637)) & 255) - M[0x9632];
  // scroll_up ($9693): the view up B pixel rows, one fewer when the leader stands over 72 rows
  // down the view, one more when he stands under; a character row crossed, the buffer moves down
  // ($9F88), bank 3's area_edges ($DB0B) looks at the new edge and the top row is drawn
  P.def(0x9693, 'scroll_up', r => {
    let b = r.b;
    const a = (leaderRow() - b) & 255;
    if (a !== 0x48) b = a > 0x48 ? b - 1 : b + 1;
    b &= 255;
    const old = M[0x9632];
    M[0x9632] = (old - b) & 255;
    if (old < b) {
      M[0x9634] = (M[0x9634] - 1) & 255;
      P.move_buffer_down();
      P.page_bank_3();
      P.area_edges({});
      P.draw_top_row({});
    }
    return rowOffset();
  });
  // scroll_down ($96D9): the view down B pixel rows, one more when the leader stands over 80
  // rows down, one fewer when under; a character row crossed, area_edges, the buffer up ($9FCD)
  // and the bottom row drawn
  P.def(0x96D9, 'scroll_down', r => {
    let b = r.b;
    const a = (leaderRow() + b) & 255;
    if (a !== 0x50) b = a > 0x50 ? b + 1 : b - 1;
    b &= 255;
    const n = (M[0x9632] + b) & 255;
    M[0x9632] = n;
    if (n >= 8) {
      M[0x9634] = (M[0x9634] + 1) & 255;
      P.page_bank_3();
      P.area_edges({});
      P.move_buffer_up();
      P.draw_bottom_row({});
    }
    return rowOffset();
  });
  // scroll_left_half ($9711): the buffer's pixels 4 to the right and $9631 flipped; back at a
  // whole character the left column is drawn whole, at a half the view's column is one less and
  // the left column gets the right halves of its characters
  P.def(0x9711, 'scroll_left_half', r => {
    P.shift_pixels_right({ a: r.a });
    M[0x9631] ^= 1;
    if (!M[0x9631]) return P.draw_left_column({});
    M[0x9633] = (M[0x9633] - 1) & 255;
    P.page_bank_3();
    P.area_edges({});
    return P.draw_left_half_column({});
  });
  // scroll_right_half ($972C): the pixels 4 to the left and $9631 flipped; at a half the right
  // column gets the left halves of the next characters, back at a whole one the view's column is
  // one more and the right column is drawn whole
  P.def(0x972C, 'scroll_right_half', r => {
    P.shift_pixels_left({ a: r.a });
    M[0x9631] ^= 1;
    if (M[0x9631]) return P.draw_right_half_column({});
    M[0x9633] = (M[0x9633] + 1) & 255;
    P.page_bank_3();
    P.area_edges({});
    return P.draw_right_column({});
  });
  // scroll_left_whole ($984B), scroll_right_whole ($985B): the buffer a byte on or back, the
  // view's column one less or more, area_edges and the new column drawn
  P.def(0x984B, 'scroll_left_whole', () => {
    P.shift_buffer_right();
    M[0x9633] = (M[0x9633] - 1) & 255;
    P.page_bank_3();
    P.area_edges({});
    return P.draw_left_column({});
  });
  P.def(0x985B, 'scroll_right_whole', () => {
    P.shift_buffer_left();
    M[0x9633] = (M[0x9633] + 1) & 255;
    P.page_bank_3();
    P.area_edges({});
    return P.draw_right_column({});
  });

  // The 18 steps of the table at $9963, each entered with A the low byte of its address. Rows
  // up or down by the slope the leader stands on ($8ECD): b(n, x, y) is n, one more on slope x
  // and one less on slope y, as most of the steps choose.
  const slope = () => M[0x8ECD];
  const rows = (n, more, less) => (slope() === more ? n + 1 : slope() === less ? n - 1 : n);
  P.def(0x9747, 'scroll_2', r => { P.scroll_left_half({ a: r.a }); return P.scroll_up({ b: rows(2, 4, 2) }); });
  P.def(0x975C, 'scroll_3', () => { const u = P.scroll_up({ b: rows(2, 3, 1) }); return P.scroll_right_half({ a: u.a }); });
  P.def(0x9771, 'scroll_10', () => P.scroll_right_half({ a: P.scroll_down({ b: 6 }).a }));
  P.def(0x9775, 'scroll_0', () => P.scroll_right_half({ a: P.scroll_down({ b: rows(2, 4, 2) }).a }));
  P.def(0x978B, 'scroll_11', () => P.scroll_left_half({ a: P.scroll_down({ b: 6 }).a }));
  P.def(0x978F, 'scroll_1', () => P.scroll_left_half({ a: P.scroll_down({ b: rows(2, 3, 1) }).a }));
  // steps 6, 7, 4 and 5 move a whole character when the view is at one, and 4 or 6 rows (2 on
  // the gentler slope)
  const rows4 = (steep, gentle) => (slope() === steep ? 6 : slope() === gentle ? 2 : 4);
  P.def(0x97A4, 'scroll_6', r => {
    if (M[0x9631]) return P.scroll_2({ a: M[0x9631] });
    P.scroll_left_whole();
    return P.scroll_up({ b: rows4(4, 2) });
  });
  P.def(0x97C0, 'scroll_7', () => {
    if (M[0x9631]) return P.scroll_3({});
    P.scroll_up({ b: rows4(3, 1) });
    return P.scroll_right_whole();
  });
  P.def(0x97DD, 'scroll_14', () => {
    if (M[0x9631]) return P.scroll_2({ a: M[0x9631] });
    P.scroll_left_whole();
    return P.scroll_up({ b: 8 });
  });
  P.def(0x97EC, 'scroll_15', () => {
    if (M[0x9631]) return P.scroll_3({});
    P.scroll_up({ b: 8 });
    return P.scroll_right_whole();
  });
  P.def(0x97FB, 'scroll_right', () => (M[0x9631] ? P.scroll_right_half({ a: M[0x9631] }) : P.scroll_right_whole()));
  P.def(0x9805, 'scroll_left', () => (M[0x9631] ? P.scroll_left_half({ a: M[0x9631] }) : P.scroll_left_whole()));
  P.def(0x980F, 'scroll_4', () => {
    if (M[0x9631]) return P.scroll_0({});
    P.scroll_down({ b: rows4(4, 2) });
    return P.scroll_right_whole();
  });
  P.def(0x982E, 'scroll_5', () => {
    if (M[0x9631]) return P.scroll_1({});
    P.scroll_down({ b: rows4(3, 1) });
    return P.scroll_left_whole();
  });
  P.def(0x98F5, 'scroll_13', () => P.scroll_down({ b: 6 }));
  P.def(0x98FA, 'scroll_9', () => P.scroll_down({ b: 8 }));

  // --- the buffer moved ---
  // shift_buffer_right ($986B), shift_buffer_left ($98B0): all 152 rows a byte on or back, as
  // one run (the bytes cross from row to row)
  P.def(0x986B, 'shift_buffer_right', () => { M.copyWithin(0xAE10, 0xAE0F, 0xBEAF); return {}; });
  P.def(0x98B0, 'shift_buffer_left', () => { M.copyWithin(0xAE10, 0xAE11, 0xBEB0); return {}; });
  // shift_pixels_right ($99B5): RRD along the whole buffer from $AE10, so each byte's pixels move
  // 4 right and take the 4 before them; the first byte takes A's low 4 bits
  P.def(0x99B5, 'shift_pixels_right', r => {
    let n = r.a & 15;
    for (let a = 0xAE10; a < 0xBEB0; a++) { const v = M[a]; M[a] = (n << 4) | (v >> 4); n = v & 15; }
    return { a: (r.a & 0xF0) | n };
  });
  // shift_pixels_left ($9A11): RLD back from $BEAF, the last byte taking A's low 4 bits
  P.def(0x9A11, 'shift_pixels_left', r => {
    let n = r.a & 15;
    for (let a = 0xBEAF; a >= 0xAE10; a--) { const v = M[a]; M[a] = ((v << 4) | n) & 255; n = v >> 4; }
    return { a: (r.a & 0xF0) | n };
  });
  // move_buffer_down ($9F88), move_buffer_up ($9FCD): 144 rows a character row (224 bytes) down
  // or up
  P.def(0x9F88, 'move_buffer_down', () => { M.copyWithin(0xAEF0, 0xAE10, 0xBDD0); return {}; });
  P.def(0x9FCD, 'move_buffer_up', () => { M.copyWithin(0xAE10, 0xAEF0, 0xBEB0); return {}; });

  // --- drawing from the map ---
  // map_address ($9A6D): the block in the map holding the character at row $9634 + B, column
  // $9633 + C
  const mapAddress = (b, c) => {
    const l = ((M[0x9634] + b) & 0xFC) * 2 & 255;
    const v = ((0x1800 | l) << 3) & 0xFFFF;
    return (v & 0xFF00) | (((v & 255) + ((((M[0x9633] + c) & 255) >> 2) & 0x3F)) & 255);
  };
  P.def(0x9A6D, 'map_address', r => ({ hl: mapAddress(r.b, r.c) }));
  // block_chars ($9C10): for block A, the address of its 16 character numbers. Its definition is
  // the byte at $C800 + A, 256 on for a block over the area's split (the operand at $9C13, which
  // load_area writes); the definition picks the character set's first character ($9639) from the
  // table at $E840 ($E864 over the split), three bytes a range: the first definition past it, and
  // the word
  const blockChars = a => {
    const over = a > M[0x9C13];
    const l = M[0xC800 + a];
    let t = over ? 0xE864 : 0xE840;
    const x = l === 0xFF ? 0xFE : l;
    for (let n = 0; n < 0x10000 && !(x < M[t]); n++) t = (t + 3) & 0xFFFF;
    M[0x9639] = M[(t + 1) & 0xFFFF]; M[0x963A] = M[(t + 2) & 0xFFFF];
    return ((((over ? 0x100 : 0) | l) << 4) + 0xC8F0) & 0xFFFF;
  };
  P.def(0x9C10, 'block_chars', r => ({ hl: blockChars(r.a) }));
  // a character's 8 bytes: in bank 4 at $CD40 plus 8 times ($9639 + A)
  const charAt = a => ((((w(0x9639) + a) & 0xFFFF) << 3) + 0xCD40) & 0xFFFF;
  // draw_char ($9C4D): character A's 8 bytes down the buffer from DE (of the other register set),
  // 28 bytes apart, with bank 4 in, then bank 0 again. The other three drawers of a character
  // below are as only this group calls them: the character's number and the buffer's address.
  const drawChar = (a, de) => {
    const s = charAt(a);
    P.page_bank_4();
    for (let i = 0; i < 8; i++) M[(de + 28 * i) & 0xFFFF] = M[lo(s, i)];
    P.page_bank_0();
  };
  P.def(0x9C4D, 'draw_char', r => { drawChar(r.a, r.de_); return {}; });
  // draw_char_left_half ($9D2A): the left halves of character A's rows into the right halves of
  // the buffer's bytes, with RLD
  const drawLeftHalf = (a, de) => {
    P.page_bank_0();
    const s = charAt(a);
    P.page_bank_4();
    for (let i = 0; i < 8; i++, de = (de + 28) & 0xFFFF) M[de] = (M[de] & 0xF0) | (M[lo(s, i)] >> 4);
    P.page_bank_0();
    return de;
  };
  P.def(0x9D2A, 'draw_char_left_half', r => { drawLeftHalf(r.a, r.de_); return {}; });
  // draw_char_right_half ($9EF3): the right halves of character A's rows into the left halves
  const drawRightHalf = (a, de) => {
    P.page_bank_0();
    const s = charAt(a);
    P.page_bank_4();
    for (let i = 0; i < 8; i++, de = (de + 28) & 0xFFFF) M[de] = ((M[lo(s, i)] << 4) & 0xF0) | (M[de] & 0x0F);
    P.page_bank_0();
    return de;
  };
  P.def(0x9EF3, 'draw_char_right_half', r => { drawRightHalf(r.a, r.de_); return {}; });
  // draw_char_straddle ($9DA5): 8 bytes down the buffer, each the right half of a row of the
  // character at `left` and the left half of the same row of character A; gives A's address, the
  // next byte's left
  const drawStraddle = (a, left, de) => {
    const s = charAt(a);
    P.page_bank_4();
    for (let i = 0; i < 8; i++) M[(de + 28 * i) & 0xFFFF] = ((M[lo(left, i)] << 4) | (M[lo(s, i)] >> 4)) & 255;
    P.page_bank_0();
    return s;
  };
  P.def(0x9DA5, 'draw_char_straddle', r => { drawStraddle(r.a, r.de_, r.de); return {}; });

  // A column of the buffer, 19 characters down from the map row $9634: the rest of the first
  // block from the row within it, then whole blocks, then the start of the last. hl the block,
  // pos the column within the blocks, slot the operand the game keeps it in, put(a, de) the
  // drawer, which gives the buffer's address 8 rows on.
  function column(hl, pos, slot, de, put) {
    const c = pos & 3, r = M[0x9634] & 3;
    M[slot] = c;
    let p = blockChars(M[hl]);
    p = lo(p, r * 4 + c);
    for (let b = 4 - r; b > 0; b--) { de = put(M[p], de); p = lo(p, 4); }
    hl = (hl + 0x40) & 0xFFFF;
    for (let n = r ? 4 : 3; n > 0; n--) {
      p = lo(blockChars(M[hl]), M[slot]);
      for (let k = 0; k < 4; k++) { de = put(M[p], de); p = lo(p, 4); }
      hl = (hl + 0x40) & 0xFFFF;
    }
    p = lo(blockChars(M[hl]), M[slot]);
    for (let n = (M[0x9634] - 1) & 3; n > 0; n--) { de = put(M[p], de); p = lo(p, 4); }
    return {};
  }
  const whole = (a, de) => { drawChar(a, de); return (de + 0xE0) & 0xFFFF; };
  // draw_left_column ($9A9F), draw_right_column ($9A85): column 0 or 27 for the map column
  // $9633, or $9633 + 27, whole characters
  P.def(0x9A9F, 'draw_left_column', () => {
    P.page_bank_0();
    const hl = mapAddress(0, 0);
    P.page_bank_0();
    return column(hl, M[0x9633], 0x9AFD, 0xAE10, whole);
  });
  P.def(0x9A85, 'draw_right_column', () => {
    const hl = mapAddress(0, M[0x9633] & 3 ? 0x1C : 0x18);
    P.page_bank_0();
    return column(hl, (M[0x9633] - 1) & 255, 0x9AFD, 0xAE2B, whole);
  });
  // draw_left_half_column ($9E52), draw_right_half_column ($9C89): at a half character, column 0
  // takes the right halves of the column $9633's characters, column 27 the left halves of the
  // column $9633 + 28's
  P.def(0x9E52, 'draw_left_half_column', () => {
    P.page_bank_0();
    return column(mapAddress(0, 0), M[0x9633], 0x9EA8, 0xAE10, drawRightHalf);
  });
  P.def(0x9C89, 'draw_right_half_column', () => {
    P.page_bank_0();
    return column(mapAddress(0, 0x1C), M[0x9633], 0x9CDF, 0xAE2B, drawLeftHalf);
  });

  // A row of the buffer, 28 characters across from the map column $9633, at the row pos within
  // its blocks: the rest of the first block, six whole blocks and the start of the last.
  function row(hl, pos, de) {
    P.page_bank_0();
    const rp = (pos & 3) * 4, c = M[0x9633] & 3;
    M[0x9BD2] = rp;
    let p = lo(blockChars(M[hl]), (c + rp) & 255);
    for (let b = (4 - c) & 255; b > 0; b--) { drawChar(M[p], de); de = (de + 1) & 0xFFFF; p = lo(p, 1); }
    hl = (hl + 1) & 0xFFFF;
    for (let n = 6; n > 0; n--) {
      p = lo(blockChars(M[hl]), M[0x9BD2]);
      for (let k = 0; k < 4; k++) { drawChar(M[p], de); de = (de + 1) & 0xFFFF; p = lo(p, 1); }
      hl = lo(hl, 1);
    }
    p = lo(blockChars(M[hl]), M[0x9BD2]);
    for (let n = M[0x9633] & 3; n > 0; n--) { drawChar(M[p], de); de = (de + 1) & 0xFFFF; p = lo(p, 1); }
    return {};
  }
  // draw_top_row ($9B86): the buffer's first row for the map row $9634; $9B90, the same into the
  // row at DE, is how draw_view draws every row
  P.def(0x9B86, 'draw_top_row', () => {
    if (M[0x9631]) return P.draw_top_row_half();
    return row(mapAddress(0, 0), M[0x9634], 0xAE10);
  });
  P.def(0x9B90, 'draw_row_at', r => row(mapAddress(0, 0), M[0x9634], r.de), false);
  // draw_bottom_row ($9B61): the last row ($BDD0) for the map row $9634 + 18
  P.def(0x9B61, 'draw_bottom_row', () => {
    if (M[0x9631]) return P.draw_bottom_row_half();
    const r = M[0x9634] & 3;
    return row(mapAddress(r >= 2 ? 0x14 : 0x10, 0), r + 2, 0xBDD0);
  });
  // A row at a half character: each of its 28 bytes straddles two characters across
  function rowHalf(hl, pos, de) {
    const rp = (pos & 3) * 4;
    M[0x9E42] = rp;
    let p = lo(blockChars(M[hl]), ((M[0x9633] & 3) + rp) & 255);
    let left = charAt(M[p]);
    for (let n = 28; n > 0; n--) {
      p = (p + 1) & 0xFFFF;
      if (!(p & 3)) { hl = (hl + 1) & 0xFFFF; p = lo(blockChars(M[hl]), M[0x9E42]); }
      left = drawStraddle(M[p], left, de);
      de = (de + 1) & 0xFFFF;
    }
    return {};
  }
  P.def(0x9DF5, 'draw_top_row_half', () => {
    P.page_bank_0();
    return rowHalf(mapAddress(0, 0), M[0x9634], 0xAE10);
  });
  P.def(0x9DD5, 'draw_bottom_row_half', () => {
    P.page_bank_0();
    const r = M[0x9634] & 3;
    return rowHalf(mapAddress(r >= 2 ? 0x14 : 0x10, 0), r + 2, 0xBDD0);
  });
  // draw_view ($A012): the whole buffer, 19 rows from the map row $9634, at a whole character;
  // bank 1 paged in after
  P.def(0xA012, 'draw_view', () => {
    M[0x9631] = 0;
    const top = M[0x9634];
    P.page_bank_0();
    for (let n = 0, de = 0xAE10; n < 19; n++, de += 0xE0) {
      P.draw_row_at({ de });
      M[0x9634] = (M[0x9634] + 1) & 255;
    }
    M[0x9634] = top;
    return P.page_bank_1();
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
