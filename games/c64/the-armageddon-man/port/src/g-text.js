// Text and pictures in the windows ($8545-$8DD9): the proportional font flipped into the bitmap at
// a window's text position (print_char to new_line), lists and strings, the window's scroll, the
// eleven pictures (draw_picture); and the cursor in a window: moved by the controls, its menu row
// highlighted, and tested against rectangles ($7E6D-$7EDB, $8DDB-$8F7A).
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
G.text = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const top = () => w(0x7E);
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  P.N.char = 0; P.N.shift = 0; P.N.scroll = 0; P.N.pic = 0;

  // print_char ($86D9): character A at the top window's text position, its pointers kept
  const CHAR_KEEP = [0x89, 0x88, 0x81, 0x80, 0x83, 0x82, 0x85, 0x84, 0x87, 0x86];
  P.print_char = function (r) {
    const ch = r.a & 255;
    const kept = CHAR_KEEP.map(a => M[a]);
    setw(0x80, top());
    const d = P.draw_char({ a: ch });
    CHAR_KEEP.forEach((a, i) => { M[a] = kept[i]; });
    return { a: ch, x: d.x !== undefined ? d.x : ch, y: d.y };
  };
  // glyph_address ($8725): ($82) at the font's glyph for A, $8733 + 8 × A
  P.glyph_address = function (r) {
    const p = (0x8733 + ((r.a & 255) << 3)) & 0xFFFF;
    setw(0x82, p);
    return { a: r.a & 255 };
  };
  // wrap_check ($8747): a new line when the glyph would pass the window's width, then the scroll
  P.wrap_check = function (r) {
    if ((r.a & 255) !== 0x0D) {
      const p = w(0x80);
      M[0x04] = (at(p, 9) + at(w(0x82), 7)) & 255;
      if (((at(p, 2) << 3) & 255) < M[0x04]) P.new_line();
    }
    return P.scroll_check();
  };
  // draw_char ($8767): the glyph's seven rows flipped in at the pixel position, then the text x on
  // by its width; a carriage return is a new line
  P.draw_char = function (r) {
    const ch = r.a & 255;
    P.glyph_address({ a: ch });
    const x0 = P.wrap_check({ a: ch }).x;
    const p = w(0x80);
    M[0x84] = (((at(p, 0) << 3) & 255) + at(p, 9)) & 255;
    M[0x85] = (((at(p, 1) + at(p, 10)) & 255) << 3) & 255;
    if (ch === 0x0D) return Object.assign(P.new_line(), { x: x0 });
    M[0x84] = P.pixel_address().a;
    setw(0x2A, w(0x2A) + 8);
    M[0x1B] = 7;
    const g = w(0x82), b = w(0x88), b2 = w(0x2A);
    let y = 0;
    do {
      M[0x86] = 0;
      M[0x87] = at(g, y);
      if (M[0x84]) {
        const s = M[0x84];
        const v = (M[0x87] << 8) >> s;
        M[0x87] = v >> 8; M[0x86] = v & 255;
        P.N.shift += s;
      }
      put(b, y, at(b, y) ^ M[0x87]);
      put(b2, y, at(b2, y) ^ M[0x86]);
      y++;
      M[0x1B] = (M[0x1B] - 1) & 255;
    } while (M[0x1B]);
    P.N.char++;
    const x = (at(g, 7) + at(p, 9)) & 255;
    put(p, 9, x);
    return { a: x, x: x0, y: 9 };
  };
  // new_line ($87DC): text x 2, the row one down
  P.new_line = function () {
    const p = w(0x80);
    put(p, 9, 2);
    const a = (at(p, 10) + 1) & 255;
    put(p, 10, a);
    return { a, y: 10 };
  };
  // scroll_check ($8B34): at the window's last row, its bitmap moved up a row of cells and the last
  // row cleared
  P.scroll_check = function () {
    const p = w(0x80);
    if (at(p, 10) !== at(p, 3)) return { a: at(p, 10), y: 3 };
    put(p, 10, at(p, 10) - 1);
    M[0x85] = at(p, 1); M[0x84] = at(p, 0);
    P.cell_bitmap_84();
    P.next_cell_row();
    M[0x19] = (((at(p, 2) << 3) & 255) - 1) & 255;
    let x = (at(p, 3) - 1) & 255;
    while (x) {
      const d = w(0x88), s = w(0x2A);
      let y = M[0x19];
      do { M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y - 1) & 255; } while (y !== 0xFF);
      P.N.scroll += M[0x19] + 1;
      M[0x88] = M[0x2A]; M[0x89] = M[0x2B];
      P.next_cell_row();
      x = (x - 1) & 255;
    }
    const d = w(0x88);
    let y = M[0x19];
    do { M[(d + y) & 0xFFFF] = 0; y = (y - 1) & 255; } while (y !== 0xFF);
    P.N.scroll += M[0x19] + 1;
    return { a: 0, x, y };
  };
  // print_list ($87EC): the '$'-ended items at ($88), one to a line, to an empty item
  P.print_list = function () {
    for (;;) {
      const a = M[w(0x88)];
      setw(0x88, w(0x88) + 1);
      if (a !== 0x24) { P.print_char({ a }); continue; }
      if (M[w(0x88)] === 0x24) return { a: 0x24, y: 0 };
      P.print_char({ a: 0x0D });
    }
  };
  // print_string ($8810): the text at ($88) to its '$'
  P.print_string = function () {
    for (;;) {
      const a = M[w(0x88)];
      if (a === 0x24) return { a, y: 0 };
      P.print_char({ a });
      setw(0x88, w(0x88) + 1);
    }
  };
  // print_inline ($8B91): the text after the JSR at r.at, to its '$'
  P.print_inline = function (r) {
    setw(0x88, r.at + 2);
    for (;;) {
      setw(0x88, w(0x88) + 1);
      const a = M[w(0x88)];
      if (a === 0x24) return { a: M[0x88], x: M[(w(0x88) - 1) & 0xFFFF], y: 0 };
      P.print_char({ a });
    }
  };
  P.set_text_x = function (r) { put(top(), 9, r.a); return { a: r.a & 255, y: 9 }; };
  // draw_menu ($8545): the list the window's flags pick from menu_lists
  P.draw_menu = function () {
    const y = at(w(0x80), 7) & 0xFE;
    M[0x88] = M[0x855B + y]; M[0x89] = M[0x855C + y];
    return P.print_list();
  };
  // draw_picture ($8BD0): picture A at column $84, row $85, its bitmap then its colours
  P.draw_picture = function (r) {
    P.cell_bitmap_84();
    const y0 = ((r.a & 255) << 1) & 255;
    M[0x07] = 0x51; M[0x08] = 0x8C;
    M[0x86] = M[0x8C51 + y0]; M[0x87] = M[0x8C52 + y0];
    const pic = w(0x86);
    const wd = M[pic];
    M[0x2F] = (wd - 1) & 255;
    M[0x84] = (((wd << 3) & 255) - 1) & 255;
    M[0x85] = M[0x30] = M[(pic + 1) & 0xFFFF] >> 3;
    setw(0x86, pic + 2);
    const step = n => {
      const t = n + 1, s = (t & 255) + M[0x86] + (t >> 8);
      M[0x86] = s & 255;
      if (s > 255) M[0x87] = (M[0x87] + 1) & 255;
    };
    do {
      const s = w(0x86), d = w(0x2A);
      let y = M[0x84];
      do { M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y - 1) & 255; } while (y !== 0xFF);
      P.N.pic += M[0x84] + 1;
      P.next_cell_row();
      step(M[0x84]);
      M[0x85] = (M[0x85] - 1) & 255;
    } while (M[0x85]);
    P.cell_address();
    let y = 0;
    do {
      const s = w(0x86), d = w(0x2A);
      y = M[0x2F];
      do { M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y - 1) & 255; } while (y < 0x80);
      P.add_to_pointer({ a: 0x28 });
      step(M[0x2F]);
      M[0x30] = (M[0x30] - 1) & 255;
    } while (M[0x30]);
    return { a: M[0x86], y };
  };

  // ---- the cursor in a window
  P.no_hook = () => ({});
  P.cursor_to_window = function () {
    P.cursor_home();
    P.menu_highlight();
    return P.cursor_show();
  };
  // cursor_home ($8ED2): the middle of the top window's first text row, menu row 0
  P.cursor_home = function () {
    const p = top();
    setw(0x80, p);
    M[0x85] = at(p, 0);
    put(p, 12, (((at(p, 2) >> 1) + M[0x85]) & 255) << 3);
    put(p, 13, ((at(p, 1) << 3) & 255) + 4);
    put(p, 11, 0);
    return { a: 0, y: 11 };
  };
  // menu_highlight ($8E7A): the menu row the window keeps, its colours' nibbles swapped
  P.menu_highlight = function () {
    const p = top();
    setw(0x80, p);
    if (!(at(p, 7) & 1)) return { a: 0, y: 7 };
    M[0x85] = (at(p, 1) + at(p, 11)) & 255;
    M[0x84] = at(p, 0);
    P.cell_address_84();
    P.swap_nibbles({});
    const d = w(0x88);
    let y = (at(p, 2) - 1) & 255;
    do { M[(d + y) & 0xFFFF] = M[0x86]; y = (y - 1) & 255; } while (y < 0x80);
    return { a: M[0x86], y };
  };
  // swap_nibbles ($8EB3): $86 the colour at ($88), nibbles swapped; A kept
  P.swap_nibbles = function (r) {
    const v = M[w(0x88)];
    M[0x04] = (v << 4) & 0xF0;
    M[0x86] = M[0x04] | (v >> 4);
    return { a: r.a, y: 0 };
  };
  // cursor_in_window ($8F04): is the cursor inside the window at ($80), frame included?
  P.cursor_in_window = function () {
    const p = w(0x80);
    let a = ((at(p, 12) >> 3) + 1) & 255;
    if (a < at(p, 0)) return { a, c: 0, y: 0 };
    M[0x85] = (a - 2) & 255;
    a = (at(p, 0) + at(p, 2) - 1) & 255;
    if (a < M[0x85]) return { a, c: 0, y: 2 };
    a = ((at(p, 13) >> 3) + 1) & 255;
    if (a < at(p, 1)) return { a, c: 0, y: 1 };
    M[0x85] = (a - 2) & 255;
    a = (at(p, 1) + at(p, 3) - 1) & 255;
    return { a, c: a >= M[0x85] ? 1 : 0, y: 3 };
  };
  // cursor_in_rect ($7E8B): is the cursor inside the rectangle at ($80)? Its position is left in
  // the rectangle's bytes 4 and 5.
  P.cursor_in_rect = function () {
    const t = top(), p = w(0x80);
    M[0x84] = at(t, 12); M[0x85] = at(t, 13);
    put(p, 4, M[0x84]); put(p, 5, M[0x85]);
    let a = M[0x84] >> 3;
    if (a < at(p, 0)) return { a, c: 0, y: 0 };
    M[0x85] = a;
    a = (at(p, 0) + at(p, 2) - 1) & 255;
    if (a < M[0x85]) return { a, c: 0, y: 2 };
    a = at(p, 5) >> 3;
    if (a < at(p, 1)) return { a, c: 0, y: 1 };
    M[0x85] = a;
    a = (at(p, 1) + at(p, 3) - 1) & 255;
    return { a, c: a >= M[0x85] ? 1 : 0, y: 3 };
  };
  // hit_test ($7E6D): which of X rectangles of six bytes at ($80) holds the cursor, counted down
  P.hit_test = function (r) {
    let x = r.x & 255;
    do {
      const h = P.cursor_in_rect();
      if (h.c) return { a: x, x, y: h.y, c: 1 };
      setw(0x80, w(0x80) + 6);
      x = (x - 1) & 255;
    } while (x);
    return { a: M[0x81], x: 0, c: 0 };
  };
  // menu_track ($8F4D): the highlight moved to the cursor's row
  P.menu_track = function () {
    const p = top();
    setw(0x80, p);
    if (!P.cursor_in_rect().c) return { c: 0 };
    const row = ((at(p, 13) >> 3) - at(p, 1)) & 255;
    if (row === at(p, 11)) return { a: row, c: 1 };
    P.menu_highlight();
    put(p, 11, row);
    return P.menu_highlight();
  };
  // move_cursor ($8DDB): the controls move the cursor, two pixels up or down, three left or right
  // (two while satellite_mode, $C2E3, is set), inside x 5 to 249 and y 4 to 179; the carry is fire
  P.move_cursor = function () {
    const p = top();
    setw(0x80, p);
    M[0xA8] = at(p, 13); M[0xA6] = at(p, 12);
    const c = P.read_controls();
    let a = (((c.y << 1) & 255) + M[0xA8]) & 255;
    if (a >= 4 && a < 0xB4) {
      M[0xA8] = a;
      a = (c.x << 1) & 255;
      if (!M[0xC2E3]) { M[0x05] = a; a = (c.x + M[0x05]) & 255; }
      a = (a + M[0xA6]) & 255;
      if (a < 0xFA && a >= 5) M[0xA6] = a;
    }
    put(p, 12, M[0xA6]); put(p, 13, M[0xA8]);
    P.cursor_show();
    P.menu_track();
    return { c: c.c };
  };
  P.cursor_arrow = () => P.cursor_shape1();
  P.cursor_satellite = () => P.cursor_shape2();
};
})(typeof window !== 'undefined' ? window : globalThis);
