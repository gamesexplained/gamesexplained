// The screen: the machine set up ($62CD-$63C1), the cursor's sprites ($5ED9-$5F9E, make_sprite at
// $521B), and the windows: opened over what they cover, which is saved at $28/$29 from $2000 and put
// back when they close ($6022-$624B), with their frames from frame_glyphs.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen('hardware_init vectors_init');
G.screen = function (P) {
  const M = P.M, io = P.io;
  const w = P.w, setw = P.setw;
  const IB = 0x1F;
  P.N.save = 0; P.N.glyph = 0;
  const top = () => w(0x7E);

  // ---- the machine
  // hardware_init ($62CD)
  P.hardware_init = function* () {
    P.sei();
    P.clear_zero_page();
    P.video_init();
    P.window_init();
    P.sprites_init();
    P.fill_screen_colour({ x: 0x1E });
    M[0x55] = 0;
    P.cias_off();
    return yield* P.vectors_init();
  };
  P.clear_zero_page = function () { for (let y = 2; y < 256; y++) M[y] = 0; return { a: 0, y: 0 }; };
  // cias_off ($62ED)
  P.cias_off = function () {
    P.io_in();
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    P.io_out();
    return { a: 4 };
  };
  // vectors_init ($6302): the vectors at $FFFA and $FFFE, then, once the raster is above line 256,
  // the interrupt on line $EB
  P.vectors_init = function* () {
    P.sei();
    P.io_in();
    M[0xFFFA] = 0xCB; M[0xFFFB] = 0x62; M[0xFFFE] = 0x4C; M[0xFFFF] = 0x62;
    io.vicWrite(0x1A, 0); io.vicWrite(0x19, 0);
    while (io.vicRead(0x11) & 0x80) yield;
    io.vicWrite(0x12, 0xEB); M[0x4E8F] = 0xEB;   // irq_line
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x1A, 1);
    P.io_out();
    return { a: 4 };
  };
  // video_init ($6343)
  P.video_init = function () {
    P.io_in();
    io.cia2Write(0x00, io.cia2Read(0x00) & 0xFC);
    io.vicWrite(0x11, (io.vicRead(0x11) & 0xC0) | 0x3B);
    io.vicWrite(0x18, (io.vicRead(0x18) & 0x06) | 0x78);
    io.vicWrite(0x20, 0x0B);
    io.vicWrite(0x16, 0x08);
    P.io_out();
    return { a: 4 };
  };
  // sprites_init ($637C)
  P.sprites_init = function () {
    P.io_in();
    io.vicWrite(0x15, 0);
    for (let x = 0x10; x >= 0; x--) io.vicWrite(x, 0);
    for (const r of [0x17, 0x1D, 0x1C, 0x1B, 0x10]) io.vicWrite(r, 0);
    P.io_out();
    for (let x = 0; x < 8; x++) M[0xDFF8 + x] = 0x68 + x;
    return { a: 0x70, x: 8 };
  };
  // window_init ($63AE)
  P.window_init = function () {
    M[0x6018] = 0; M[0x72] = 0; M[0x6019] = 0;
    M[0x28] = 0; M[0x29] = 0x20;
    return { a: 0x20 };
  };

  // ---- the cursor
  // cursor_place ($5F4A): x $A6/$A7, y $A8, as the inline bytes of unused_cursor_at
  P.cursor_place = function () {
    M[IB] = M[0xA6]; M[0x20] = M[0xA7]; M[0x21] = M[0xA8];
    return place();
  };
  function place() {
    const save = M[1];
    let s = M[IB] + 0x38;
    M[IB] = s & 255;
    M[0x20] = (M[0x20] + (s >> 8)) & 255;
    M[0x21] = (M[0x21] + 0x3A) & 255;
    const x = M[0x20];
    const b = x & 1;
    M[0x22] = (b << 1) | b;
    P.io_in();
    M[0x20] = (io.vicRead(0x10) & 0xFC) | M[0x22];
    io.vicWrite(0x01, M[0x21]); io.vicWrite(0x03, M[0x21]);
    io.vicWrite(0x00, M[IB]); io.vicWrite(0x02, M[IB]);
    io.vicWrite(0x10, M[0x20]);
    M[1] = save;
    return { a: save, x };
  }
  // cursor_show ($5ED9): at the top window's bytes 12 (x) and 13 (y), and on
  P.cursor_show = function () {
    const t = top();
    M[0xA8] = M[(t + 13) & 0xFFFF];
    M[0xA7] = 0;
    M[0xA6] = M[(t + 12) & 0xFFFF];
    P.cursor_place();
    return P.cursor_on();
  };
  P.cursor_on = function () {
    const save = M[1];
    P.io_in();
    io.vicWrite(0x15, io.vicRead(0x15) | 3);
    M[1] = save;
    return { a: save };
  };
  P.cursor_off = function () {
    const save = M[1];
    P.io_in();
    io.vicWrite(0x15, io.vicRead(0x15) & 0xFC);
    M[1] = save;
    return { a: save };
  };
  // cursor_shape1 ($5F14) and cursor_shape2 ($5F10): shapes 0 and 1, or 2 and 3, written into
  // make_sprite's inline bytes at $5F29 and $5F31
  const shape = a => {
    M[0x5F29] = a; M[0x5F31] = (a + 1) & 255;
    P.cursor_off();
    P.make_sprite({ at: 0x5F22 });
    P.make_sprite({ at: 0x5F2A });
    return P.cursor_on();
  };
  P.cursor_shape1 = () => shape(0);
  P.cursor_shape2 = () => shape(2);
  // make_sprite ($521B): sprite, width in bytes, height, colour, shape
  P.make_sprite = function (r) {
    P.inline_args(5, r.at, 0x521D);
    const save = M[1];
    P.io_in();
    io.vicWrite(0x27 + M[IB], M[0x22]);
    let x = (M[IB] << 1) & 255;
    const dest = M[0x5294 + x] | M[0x5295 + x] << 8;
    M[0x07] = M[0x527E] = dest & 255; M[0x08] = M[0x527F] = dest >> 8;
    P.io_out();
    for (let y = 0x3F; y >= 0; y--) M[(dest + y) & 0xFFFF] = 0;
    x = M[0x20];
    M[IB] = M[0x5213 + x];
    M[0x22] = M[0x5217 + x];
    if (x !== 1) {
      let a = (M[0x21] << 1) & 255;
      if (x === 3) a = (a + M[0x21]) & 255;
      M[0x21] = a;
    }
    const s = (M[0x23] << 1) & 255;
    const src = M[0x52A4 + s] | M[0x52A5 + s] << 8;
    M[0x07] = src & 255; M[0x08] = src >> 8;
    let y = 0;
    x = 0;
    do {
      M[(dest + x) & 0xFFFF] = M[(src + y) & 0xFFFF];
      M[IB] ^= M[0x22];
      x = (x + M[IB]) & 255;
      y = (y + 1) & 255;
    } while (y !== M[0x21]);
    M[1] = save;
    return { a: save, x, y };
  };

  // ---- the windows
  // window_get_rect ($60B4): the top window's column, row, width, height and colour to $2C-$31
  P.window_get_rect = function () {
    const t = top();
    M[0x2C] = M[t];
    for (let y = 1; y < 5; y++) M[0x2D + y] = M[(t + y) & 0xFFFF];
    return { a: M[(t + 4) & 0xFFFF], y: 5 };
  };
  P.window_push = function () {
    let x = M[0x6018];
    for (const a of [0x28, 0x29, 0xA6, 0xA7, 0xA8]) { M[0x5FA0 + x] = M[a]; x = (x + 1) & 255; }
    M[0x6018] = x;
    return { a: M[0xA8], x };
  };
  P.window_pop = function () {
    let x = M[0x6018];
    x = (x - 1) & 255; M[0xA8] = M[0x5FA0 + x];
    x = (x - 1) & 255; M[0xA7] = M[0x5FA0 + x];
    x = (x - 1) & 255; M[0xA6] = M[0x5FA0 + x];
    x = (x - 1) & 255; M[0x29] = M[0x08] = M[0x5FA0 + x];
    x = (x - 1) & 255; M[0x28] = M[0x07] = M[0x5FA0 + x];
    M[0x6018] = x;
    return { a: M[0x28], x };
  };
  // window_save ($6115): each cell of the rectangle, row by row, its 8 bitmap bytes and then its
  // colour cell, to the save area at ($28), which moves on; the row's colour cells' address kept in
  // the operand at $6141
  P.window_save = function () {
    P.cell_address();
    M[0x6141] = M[0x2A]; M[0x6142] = M[0x2B];
    P.cell_bitmap_address();
    M[0x17] = M[0x30];
    let y = 0;
    do {
      M[0x19] = 0; y = 0;
      const bm = w(0x2A), cells = M[0x6141] | M[0x6142] << 8;
      do {
        M[0x1B] = 8;
        do {
          M[w(0x28)] = M[(bm + y) & 0xFFFF];
          setw(0x28, w(0x28) + 1);
          y = (y + 1) & 255;
          M[0x1B] = (M[0x1B] - 1) & 255;
        } while (M[0x1B]);
        M[w(0x28)] = M[(cells + M[0x19]) & 0xFFFF];
        setw(0x28, w(0x28) + 1);
        M[0x19] = (M[0x19] + 1) & 255;
        P.N.save++;
      } while (M[0x19] !== M[0x2F]);
      P.next_cell_row();
      const c = cells + 0x28;
      M[0x6141] = c & 255; M[0x6142] = (c >> 8) & 255;
      M[0x17] = (M[0x17] - 1) & 255;
    } while (M[0x17]);
    return { a: M[0x6142], x: 0, y };
  };
  // window_restore ($6186): the reverse, from ($07), the operand at $61B4
  P.window_restore = function () {
    P.cell_address();
    M[0x61B4] = M[0x2A]; M[0x61B5] = M[0x2B];
    P.cell_bitmap_address();
    M[0x17] = M[0x30];
    let y = 0;
    do {
      M[0x19] = 0; y = 0;
      const bm = w(0x2A), cells = M[0x61B4] | M[0x61B5] << 8;
      do {
        M[0x1B] = 8;
        do {
          M[(bm + y) & 0xFFFF] = M[w(0x07)];
          setw(0x07, w(0x07) + 1);
          y = (y + 1) & 255;
          M[0x1B] = (M[0x1B] - 1) & 255;
        } while (M[0x1B]);
        M[(cells + M[0x19]) & 0xFFFF] = M[w(0x07)];
        setw(0x07, w(0x07) + 1);
        M[0x19] = (M[0x19] + 1) & 255;
        P.N.save++;
      } while (M[0x19] !== M[0x2F]);
      P.next_cell_row();
      const c = cells + 0x28;
      M[0x61B4] = c & 255; M[0x61B5] = (c >> 8) & 255;
      M[0x17] = (M[0x17] - 1) & 255;
    } while (M[0x17]);
    return { a: M[0x61B5], x: 0, y };
  };
  // window_frame ($61DF) and its rows
  P.window_frame = function () {
    P.cell_bitmap_address();
    P.frame_top();
    P.frame_sides();
    return P.frame_bottom();
  };
  P.frame_run = function (r) {
    M[0x04] = r.a & 255;
    M[0x1B] = (M[0x2F] - 2) & 255;
    let y = r.y, a = M[0x2F];
    if (M[0x1B]) {
      do {
        const g = P.print_glyph({ a: M[0x04], y });
        y = g.y; a = g.a;
        M[0x1B] = (M[0x1B] - 1) & 255;
      } while (M[0x1B]);
    }
    return { a, y };
  };
  P.frame_top = function () {
    M[0x17] = M[0x30];
    let y = P.print_glyph({ a: 0, y: 0 }).y;
    y = P.frame_run({ a: 3, y }).y;
    P.print_glyph({ a: 6, y });
    return P.next_cell_row();
  };
  P.frame_sides = function () {
    M[0x17] = (M[0x17] - 2) & 255;
    if (!M[0x17]) return { a: 0 };
    let r;
    do {
      let y = P.print_glyph({ a: 1, y: 0 }).y;
      y = P.frame_run({ a: 5, y }).y;
      P.print_glyph({ a: 7, y });
      r = P.next_cell_row();
      M[0x17] = (M[0x17] - 1) & 255;
    } while (M[0x17]);
    return r;
  };
  P.frame_bottom = function () {
    let y = P.print_glyph({ a: 2, y: 0 }).y;
    y = P.frame_run({ a: 4, y }).y;
    return P.print_glyph({ a: 8, y });
  };
  // open_window ($6022): eight inline bytes, column, row, width, height (inside the frame), colour,
  // two bytes kept, flags (bit 0: a menu). The record is the next 16 bytes on from $7E.
  P.open_window = function (r) {
    P.inline_args(8, r.at, 0x6024);
    const t = (top() + 0x10) & 0xFFFF;
    setw(0x7E, t); setw(0x80, t);
    for (let y = 7; y >= 0; y--) { M[(t + y) & 0xFFFF] = M[IB + y]; M[0x601A + y] = M[IB + y]; }
    M[IB] = (M[IB] - 1) & 255; M[0x20] = (M[0x20] - 1) & 255;
    M[0x21] = (M[0x21] + 2) & 255; M[0x22] = (M[0x22] + 2) & 255;
    P.window_push();
    P.rect_args();
    P.window_save();
    P.window_frame();
    P.fill_rect();
    const p = w(0x80);
    M[(p + 9) & 0xFFFF] = 2; M[(p + 10) & 0xFFFF] = 0;
    if (M[0x26] & 1) {
      P.draw_menu({ a: M[0x26] });
      return P.cursor_to_window();
    }
    return { a: M[0x26] & 1, y: 10 };
  };
  // close_window ($607E)
  P.close_window = function () {
    P.window_get_rect();
    M[0x2C] = (M[0x2C] - 1) & 255; M[0x2E] = (M[0x2E] - 1) & 255;
    M[0x30] = (M[0x30] + 2) & 255; M[0x2F] = (M[0x2F] + 2) & 255;
    setw(0x7E, top() - 0x10);
    P.window_pop();
    return P.window_restore();
  };

  // ---- the map
  // next_bitmap_byte ($5326): ($88) a pixel row down
  P.next_bitmap_byte = function () {
    setw(0x88, w(0x88) + 1);
    if (!(M[0x88] & 7)) setw(0x88, w(0x88) + 0x138);
    return { a: M[0x88] & 7 ? M[0x88] & 7 : M[0x89] };
  };
  // satellites_redraw ($54BE): each of the nine satellites in orbit drawn again (the drawing flips
  // pixels)
  P.satellites_redraw = function () {
    setw(0x80, 0x5D5C);
    for (let x = 9; x; x--) {
      if (M[(w(0x80) + 6) & 0xFFFF] & 1) P.satellite_draw({ x });
      setw(0x80, w(0x80) + 8);
    }
    return { a: M[0x81], x: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
