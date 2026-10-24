// The drawing ($42D9-$4A9F): a picture at a cell, its bitmap then its colours; the frame round an
// icon and the boxes of a screen; a pixel on the bitmap and on the iris's sprites; the iris opening
// and closing; text through the dictionary of words; the panels cleared; the portrait rolled onto
// the monitor; a screen drawn; and the arithmetic they share (cell_address, multiply,
// glyph_address).
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.draw = function (P) {
  const M = P.M, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  // ($31), the picture; ($2B), the bitmap; ($2D), the screen matrix; ($2F), colour RAM
  const PIC = 0x31, BMP = 0x2B, MAT = 0x2D, CRAM = 0x2F;
  const inc16 = (zp, n) => setw(zp, w(zp) + n);

  // multiply ($4840): A x Y, the product's low byte in A and high in Y; $7A, $F7-$FA left as the
  // shift and add leave them.
  P.multiply = function (r) {
    const a = r.a & 255, y = r.y & 255, p = a * y;
    M[0x7A] = 0; M[0xF7] = 0; M[0xF8] = y;
    M[0xF9] = p & 255; M[0xFA] = p >> 8;
    return { a: p & 255, y: p >> 8, c: 0, z: p >> 8 ? 0 : 1, n: (p >> 15) & 1 };
  };
  // cell_address ($4803): for column X and row Y, the cell's bitmap byte ($2B), from the rows'
  // table at $1504/$151D, and its screen matrix ($2D, at $0C00) and colour RAM ($2F) bytes.
  P.cell_address = function (r) {
    const x = r.x & 255, y = r.y & 255;
    // x * 8 by three shifts, the carry of the last one taken: a column of 64 or more loses its top bits.
    // Row 255 (an icon with no text, at column and row $FF) reads past the tables onto the music
    // driver's pulse width ($1603) and step count ($161C), which the interrupt moves on.
    setw(BMP, ((P.irqByte(0x1504 + y) << 8 | P.irqByte(0x151D + y)) + ((x << 3) & 0xFF) + ((x << 3) & 0x100)) & 0xFFFF);
    const p = P.multiply({ a: 0x28, y });
    const cell = (p.y + 0x0C) << 8 | p.a, at = cell + x;
    setw(MAT, at); setw(CRAM, at + 0xCC00);
    return { a: at & 255, x, y: p.y, c: (p.a + x) >> 8 };
  };
  // swap_y ($486B): Y and draw_row ($7D) change places; the drawing keeps two indexes this way
  P.swap_y = function (r) {
    const y = M[0x7D];
    M[0x7D] = r.y & 255;
    return { a: r.a, y };
  };

  // draw_picture ($42D9): the picture at ($31), width in cells and height in rows, at column X and
  // row Y: the bitmap, eight bytes a cell row by row, then (b_4324) the colours. The page's clock
  // is handed back every 64 bytes and every 16 cells; the interrupt, which draws pictures too, runs
  // it through (drain).
  P.draw_picture = function* (r) {
    const x0 = r.x & 255, y0 = r.y & 255;
    P.cell_address({ x: x0, y: y0 });
    M[0x7D] = 0;
    let pic = w(PIC);
    M[0x49F1] = (M[pic] << 3) & 255;
    M[0x49F2] = M[pic + 1];
    let rows = M[0x49F2], p = 2, b = 0, n = 0;
    // the bitmap: p indexes the picture (Y while it reads), b the bitmap (Y while it writes)
    for (;;) {
      const v = M[(w(PIC) + p) & 0xFFFF];
      p = (p + 1) & 255;
      if (!p) M[PIC + 1]++;
      M[(w(BMP) + b) & 0xFFFF] = v;
      P.N.byte++;
      if (!(++n & 63)) yield { cycles: 0 };
      b = (b + 1) & 255;
      if (b !== M[0x49F1]) continue;
      rows = (rows - 1) & 255;
      if (!rows) break;
      b = 0;
      inc16(BMP, 0x140);
    }
    M[0x7D] = p;
    return Object.assign(yield* P.b_4324({}), { a: x0, x: x0, y: y0 });
  };
  // b_4324: the picture's colours, cell by cell, row by row, from where its bitmap ended (draw_row
  // indexes the picture): two cells from three bytes, the first cell's matrix byte and the low
  // nibble of the second for its colour RAM, then the high nibble and the third byte's low for the
  // second cell's matrix byte and its high nibble for its colour RAM. With colours_only ($4A1E)
  // clear it ends draw_picture.
  P.b_4324 = function* () {
    let rows = M[0x49F2], n = 0;
    M[0x49F1] >>= 3;
    let c = 0;
    M[0x49F0] = 0;
    let p = M[0x7D];
    const pic = () => M[(w(PIC) + p) & 0xFFFF];
    const next = () => { p = (p + 1) & 255; if (!p) M[PIC + 1]++; };
    for (;;) {
      if (!M[0x49F0]) {
        const v = pic(); next();
        M[(w(MAT) + c) & 0xFFFF] = v;
        P.wr((w(CRAM) + c) & 0xFFFF, pic() & 0x0F);
      } else {
        M[0x7B] = pic() >> 4; next();
        const v = ((pic() << 4) & 255) | M[0x7B];
        M[(w(MAT) + c) & 0xFFFF] = v;
        const u = pic() >> 4; next();
        P.wr((w(CRAM) + c) & 0xFFFF, u);
      }
      M[0x49F0] ^= 1;
      P.N.cell++;
      if (!(++n & 15)) yield { cycles: 0 };
      c = (c + 1) & 255;
      if (c !== M[0x49F1]) continue;
      rows = (rows - 1) & 255;
      if (!rows) break;
      c = 0;
      const m = M[MAT] + 0x28;
      M[MAT] = m & 255; M[CRAM] = m & 255;
      if (m > 255) { M[MAT + 1]++; M[CRAM + 1]++; }
    }
    M[0x7D] = p;
    return { a: M[0x4A1E], x: 0, y: c };
  };

  // frame_icon ($43B4): the frame round an icon at column X and row Y, the size of its picture
  // (pic_width and pic_height, $49F1 and $49F2), in pixels of the multicolour bitmap: a rectangle
  // a pixel outside the icon and one round that, in colour 3 (two pixels further out with
  // frame_mode $543F bit 1, which is set only while draw_screen draws its borders, when no frame is
  // drawn). With frame_mode clear the same two are drawn again in colours 2, 1 and 0, and so wiped;
  // a choice's first step (frame_mode 1) leaves them drawn. It hands the page's clock back
  // every eight pixels of a side ({ cycles: 0 }), so that the controls answer while it draws.
  P.frame_icon = function* (r) {
    M[0x4A18] = (r.y << 3) & 255;
    M[0x4A17] = (r.x << 2) & 255;
    M[0x4A15] = (M[0x49F1] << 2) & 255;
    M[0x4A16] = (M[0x49F2] << 3) & 255;
    M[0x74] = M[0x4A17] + M[0x4A15];
    M[0x7D] = M[0x4A18] + M[0x4A16];
    M[0x4A18]--; M[0x4A17]--;
    M[0x45D4] = 3;
    if (M[0x543F] & 2) {
      M[0x4A17] -= 2; M[0x4A18] -= 2; M[0x74] += 2; M[0x7D] += 2;
    }
    let x = 0, y = 0;
    for (;;) {
      M[0x7C] = 2;
      do {
        x = M[0x4A17];
        do {
          P.plot_pixel({ x, y: M[0x4A18], c: 0 });
          P.plot_pixel({ x, y: M[0x7D], c: 0 });
          x = (x + 1) & 255;
          if (!(x & 7)) yield { cycles: 0 };
        } while (x !== M[0x74]);
        y = M[0x4A18];
        for (;;) {
          x = M[0x4A17];
          P.plot_pixel({ x, y, c: 0 });
          x = M[0x74];
          P.plot_pixel({ x, y, c: 0 });
          if (y === M[0x7D]) break;
          y = (y + 1) & 255;
          if (!(y & 7)) yield { cycles: 0 };
        }
        if (!(M[0x7C] & 1)) { M[0x4A17]--; M[0x74]++; }
        M[0x4A18]--; M[0x7D]++;
      } while (--M[0x7C]);
      if (M[0x543F]) break;
      M[0x45D4]--;
      if (M[0x45D4] & 0x80) break;
      M[0x4A17]++; M[0x74]--;
      M[0x4A18] += 2; M[0x7D] -= 2;
    }
    return { a: M[0x543F], x, y, c: 1 };
  };

  // draw_box ($446C): a box round the cells from column X and row Y, pic_width cells across and
  // pic_height rows down, drawn on the bitmap's cells round them: its four corners from the table
  // at $4A41, the top and bottom edges two lines of $55, the sides a pixel each.
  P.draw_box = function (r) {
    const x = (r.x - 1) & 255, y = (r.y - 1) & 255;
    M[0x74] = x; M[0x7D] = y;
    P.cell_address({ x, y });
    const top = w(BMP);
    corner(8);
    inc16(BMP, 8);
    M[0x7B] = 0; across();
    corner(0x10);
    inc16(BMP, 0x140);
    M[0x7B] = 1; down();
    corner(0x18);
    setw(BMP, top);
    inc16(BMP, 0x140);
    M[0x7B] = 0x40; down();
    corner(0x20);
    inc16(BMP, 8);
    M[0x7B] = 6; across();
    return { a: M[BMP], x: 0, y: (M[0x7B] + 1) & 255 };
  };
  // s_44BD: a corner, eight bytes from $4A40 + X back, ORed in
  function corner(x) {
    for (let y = 7; y >= 0; y--, x--) M[(w(BMP) + y) & 0xFFFF] |= M[0x4A40 + x];
  }
  // s_44CB: an edge across, bytes draw_byte and the next of each cell set to $55
  function across() {
    for (let x = M[0x49F1]; ; ) {
      const a = (w(BMP) + M[0x7B]) & 0xFFFF;
      M[a] = 0x55; M[(a + 1) & 0xFFFF] = 0x55;
      inc16(BMP, 8);
      P.N.edge++;
      x = (x - 1) & 255;
      if (!x) break;
    }
  }
  // s_44DE: an edge down, draw_byte ORed into every byte of a cell, a cell each row
  function down() {
    for (let x = M[0x49F2]; ; ) {
      for (let y = 7; y >= 0; y--) M[(w(BMP) + y) & 0xFFFF] |= M[0x7B];
      inc16(BMP, 0x140);
      P.N.edge++;
      x = (x - 1) & 255;
      if (!x) break;
    }
  }

  // plot_canvas ($450D): a pixel of the iris, on the four expanded sprites over the monitor
  // ($0900-$09FF, sprites 1 to 4, each 24 by 21): X across and Y down, set with the carry set and
  // cleared without.
  P.plot_canvas = function (r) {
    let x = r.x & 255, y = r.y & 255;
    M[0x33] = 0; M[0x34] = 9;
    if (y >= 0x15) { M[0x33] |= 0x80; y -= 0x15; }
    if (x >= 0x18) { M[0x33] |= 0x40; x -= 0x18; }
    M[0x7B] = y;
    M[0x7B] = (y + y + y) & 255;
    M[0x7C] = x & 7;
    const i = ((x >> 3) + M[0x7B]) & 255, a = (w(0x33) + i) & 0xFFFF;
    if (r.c) M[a] |= M[0x49F4 + M[0x7C]];
    else M[a] &= M[0x49FC + M[0x7C]];
    return { a: r.x & 255, x: r.x & 255, y: r.y & 255, c: r.c ? 1 : 0 };
  };
  // plot_pixel ($456A): a pixel of the multicolour bitmap at X (0-159) and line Y. With the carry
  // clear it is set to pixel_colour ($45D4); with it set, its colour is read. A gives the colour
  // read, or the line within the cell.
  P.plot_pixel = function (r) {
    const x = r.x & 255, y = r.y & 255;
    M[0x45D5] = y & 7;
    const row = y >> 3;
    let at = (M[0x1504 + row] << 8 | M[0x151D + row]) + ((x << 1) & 0x1F8);
    setw(BMP, at & 0xFFFF);
    const px = x & 3, a = (w(BMP) + M[0x45D5]) & 0xFFFF;
    let v;
    if (!r.c) {
      M[0x7B] = M[0x45DA + px] & M[a];
      M[a] = (M[0x45DE + px] & M[0x45D6 + M[0x45D4]]) | M[0x7B];
      v = M[0x45D5];
    } else {
      M[0x7B] = M[0x45DE + px] & M[a];
      v = 0;
      while ((M[0x45D6 + v] & M[0x45DE + px]) !== M[0x7B]) v = (v + 1) & 255;
    }
    M[0x7B] = v;
    return { a: v, x, y, c: r.c ? 1 : 0, z: v ? 0 : 1 };
  };

  // The iris over the monitor. iris_circle ($4698): one circle of the iris's sprites, radius X,
  // from the starting fraction Y, by a rotation in iris_steps ($4728) steps of 1 / 2^iris_shift
  // ($4729): x' = x - y/2^s, y' = y + x'/2^s, each a fraction trimmed towards 0, from 8.8 fixed
  // point at ($FB-$FE); each point cleared (opening) or set (closing), as iris_erase ($4A0E) says. The page's
  // clock is handed back every sixteen points.
  P.iris_circle = function* (r) {
    M[0xFC] = r.x; M[0xFB] = r.y;
    M[0xFD] = 0; M[0xFE] = 0;
    M[0x4726] = M[0x4728];
    do {
      P.plot_canvas({ x: (M[0xFC] + 0x18) & 255, y: (M[0xFE] + 0x15) & 255, c: M[0x4A0E] & 1 });
      M[0xF7] = M[0xFD]; M[0xF8] = M[0xFE];
      shift();
      let s = M[0xFB] + M[0xF7];
      M[0xFB] = s & 255; M[0xF7] = s & 255;
      s = M[0xF8] + M[0xFC] + (s >> 8);
      M[0xFC] = s & 255; M[0xF8] = s & 255;
      shift();
      let d = M[0xFD] - M[0xF7];
      M[0xFD] = d & 255;
      d = M[0xFE] - M[0xF8] - (d < 0 ? 1 : 0);
      M[0xFE] = d & 255;
      if (!(M[0x4726] & 15)) yield { cycles: 0 };
    } while (--M[0x4726]);
    return {};
  };
  // s_46ED: $F7-$F8, a signed 16-bit value, shifted right iris_shift times towards 0 and negated
  // (each shift counted for the pacing)
  function shift() {
    P.N.shift += M[0x4729] || 256;
    M[0x4727] = 0;
    if (M[0xF8] & 0x80) { negate(); M[0x4727] = 1; }
    let v = M[0xF7] | M[0xF8] << 8;
    v >>>= M[0x4729] || 256;
    M[0xF7] = v & 255; M[0xF8] = (v >> 8) & 255;
    if (!M[0x4727]) negate();
  }
  // s_4711: $F7-$F8 negated
  function negate() {
    const v = (-(M[0xF7] | M[0xF8] << 8)) & 0xFFFF;
    M[0xF7] = v & 255; M[0xF8] = v >> 8;
  }
  // iris_open ($45E2): circles of radius 0 to $12, two to each radius, finer from 8 and from $11
  P.iris_open = function* () {
    M[0x4724] = 0; M[0x4A0E] = 0; M[0x4725] = 0;
    M[0x4728] = 0x33; M[0x4729] = 3; M[0x4A10] = 0; M[0x45D4] = 1; M[0x4A13] = 0x14;
    do {
      do {
        yield* P.iris_circle({ x: M[0x4724], y: M[0x4725] });
        M[0x4725] ^= 0x80;
      } while (M[0x4725]);
      if (M[0x4724] === 0x11 || M[0x4724] === 8) P.iris_finer({});
      M[0x4724]++;
    } while (M[0x4724] !== 0x13);
    M[0x6C8C] = 1;
    return { a: 1 };
  };
  P.iris_finer = function () { M[0x4729]++; M[0x4728] <<= 1; return {}; };
  // iris_close ($4646): the same circles set again, from radius $13 down to 1
  P.iris_close = function* () {
    M[0x6C8C] = 0; M[0x4724] = 0x13; M[0x4728] = 0xCC; M[0x4729] = 5; M[0x4A0E] = 1; M[0x4725] = 0x80;
    do {
      do {
        yield* P.iris_circle({ x: M[0x4724], y: M[0x4725] });
        M[0x4725] ^= 0x80;
      } while (!M[0x4725]);
      if (M[0x4724] === 0x11 || M[0x4724] === 8) P.iris_coarser({});
    } while (--M[0x4724]);
    return { a: 1 };
  };
  P.iris_coarser = function () { M[0x4729]--; M[0x4728] >>= 1; return {}; };

  // print_text ($472B): the text at ($3D) from column X and row draw_row: a byte with bit 7 set is
  // a word from the dictionary at $81B1, which can hold words too; $38 ends a word or the text; $39
  // starts the next row at column X; the rest are glyphs of the font at ($4A1F), six bytes each,
  // drawn on bitmap lines 2 to 7 of a cell. The page's clock is handed back every 16 glyphs.
  P.print_text = function* (r) {
    const x0 = r.x & 255, y0 = r.y & 255;
    M[0x4A1A] = 0;
    P.cell_address({ x: x0, y: M[0x7D] });
    M[0x73] = 0;
    M[0x7D] = 2;
    const stack = [];
    for (let n = 0; ; ) {
      const i = M[0x73]++;
      const t = M[(w(0x3D) + i) & 0xFFFF];
      P.N.code++;
      if (t & 0x80) {
        M[0x4A1A]++;
        stack.push(M[0x73], M[0x3D], M[0x3E]);
        M[0x73] = 0;
        const k = (t & 0x7F) << 1;
        M[0x3D] = M[0x81B1 + k]; M[0x3E] = M[0x81B2 + k];
        continue;
      }
      if (t === 0x38) {
        if (--M[0x4A1A] & 0x80) break;
        M[0x3E] = stack.pop(); M[0x3D] = stack.pop(); M[0x73] = stack.pop();
        continue;
      }
      if (t === 0x39) {
        inc16(BMP, 0x140);
        M[0x7D] = 2;
        continue;
      }
      M[0x4A0F] = t;
      P.N.glyph++;
      if (!(++n & 15)) yield { cycles: 0 };
      P.glyph_address({});
      for (let g = 2; g !== 8; g++) {
        M[(w(BMP) + M[0x7D]) & 0xFFFF] = M[(w(0x3B) + g) & 0xFFFF];
        M[0x7D]++;
      }
      M[0x7D] += 2;
    }
    return { a: y0, x: x0, y: y0 };
  };
  // glyph_address ($4873): glyph char_code ($4A0F) of the font at ($4A1F), at ($3B)
  P.glyph_address = function () {
    const f = w(0x4A1F), g = (f + 6 * M[0x4A0F]) & 0xFFFF;
    setw(0x3B, g);
    return { a: g & 255, x: 0, c: ((6 * M[0x4A0F] & 255) + (f & 255)) >> 8 };
  };

  // clear_panels ($47BD): the bitmap's rows 13 to 24 cleared, the screen matrix's colours of rows
  // 13 to 24 panel_colour ($4A62) and colour RAM's 5. Each row is counted for the pacing, and the
  // page's clock handed back after it.
  P.clear_panels = function* () {
    for (let x = 0x0D; x !== 0x19; x++) {
      P.N.panel++;
      for (let y = 0; y < 8; y++) {
        let b = M[0x1504 + x] << 8 | M[0x151D + x];
        for (let n = 0; n < 0x28; n++, b += 8) M[(b + y) & 0xFFFF] = 0;
        setw(BMP, b);
      }
      yield { cycles: 0 };
    }
    M[0x7B] = 0;
    for (let n = 0, y = 0; n < 256; n++, y = (y - 1) & 255) {
      M[0x0E08 + y] = M[0x4A62]; M[0x0EE8 + y] = M[0x4A62];
      io.colourWrite(0x208 + y, 5); io.colourWrite(0x2E8 + y, 5);
    }
    return { a: 5, x: 0x19, y: 0 };
  };
  // colour_status_icon ($4897): the status icon of team member A, four cells of the screen matrix
  // and of colour RAM, set to colour Y, through two stores whose low bytes it sets ($48A8, $48AB).
  P.colour_status_icon = function (r) {
    const x = r.a & 255;
    M[0x48A8] = M[0x48AB] = M[0x4A04 + x];
    const c = r.y & 255;
    let y = 0;
    for (let k = 4; k; k--) {
      y = M[0x4A09 + k];
      P.wr((w(0x48A8) + y) & 0xFFFF, c);
      P.wr((w(0x48AB) + y) & 0xFFFF, c);
    }
    return { a: c, x: 0, y };
  };

  // show_portrait ($48B1): the monitor's picture for the character on show ($5436; 6 is none),
  // rolled on: the monitor cleared, rolled off over seven steps, the portrait's colours put in,
  // then its picture drawn a line further down each of seven steps and rolled after each. A step of
  // the roll (roll_monitor, $49A3) moves the lines of every cell of the monitor, ten columns of
  // eight rows, down a line, from line draw_byte up to the one after $4A1C, a line a frame at raster
  // line $64.
  P.show_portrait = function* () {
    let b = 0x2360;
    for (let x = 8; x; x--) {
      for (let y = 0; y !== 0x50; y += 8) M[b + y] = 0;
      b += 0x140;
    }
    setw(BMP, b);
    M[0x4A1C] = 0; M[0x4A1B] = 7;
    do {
      M[0x7B] = M[0x4A1B];
      yield* P.roll_monitor();
      M[0x4A1C]++;
    } while (M[0x4A1C] !== 7);
    const c4 = M[0x5436] << 2;
    M[PIC] = M[0x4A23 + c4]; M[PIC + 1] = M[0x4A24 + c4];
    P.cell_address({ x: 0x1C, y: 2 });
    M[0x49F1] = 0x50; M[0x49F2] = 8;
    M[0x7D] = 0;
    M[0x4A1E] = 1;
    yield* P.b_4324({});
    M[0x4A1E]--;
    M[0x4A1C] = 0; M[0x4A1B] = 1; M[0x4A1D] = 7;
    do {
      M[PIC] = M[0x4A21 + c4]; M[PIC + 1] = M[0x4A22 + c4];
      setw(BMP, 0x2360);
      for (let x = 8; x; x--) {
        M[0x7D] = 0;
        let y = M[0x4A1D];
        do {
          const v = M[(w(PIC) + y) & 0xFFFF];
          M[(w(BMP) + M[0x7D]) & 0xFFFF] = v;
          M[0x7D] += 8;
          y = (y + 8) & 255;
        } while (M[0x7D] !== 0x50);
        inc16(BMP, 0x140);
        inc16(PIC, 0x50);
      }
      M[0x7B] = M[0x4A1B];
      yield* P.roll_monitor();
      M[0x4A1D]--;
      M[0x4A1B]++;
    } while (M[0x4A1B] !== 8);
    return {};
  };
  P.roll_monitor = function* () {
    let x = 0;
    do {
      x = M[0x7B];
      yield { wait: 0x64, at: 0x49AE };
      for (let y = 0x0A; y; y--) {
        for (let k = 0; k < 8; k++) M[0x2360 + 0x140 * k + x] = M[0x235F + 0x140 * k + x];
        x = (x + 8) & 255;
      }
      M[0x7B]--;
    } while (M[0x7B] !== M[0x4A1C]);
    return { a: M[0x7B], x, y: 0 };
  };
  P.WAITS.push(0x49AE);

  // print_clock ($7604): the clock's four digits into its text ($7F7F, MM:SS) and the text printed
  // at column 7, row 7
  P.print_clock = function () {
    M[0x7F7F] = M[0xCA03]; M[0x7F80] = M[0xCA02];
    M[0x7F82] = M[0xCA01]; M[0x7F83] = M[0xCA00];
    M[0x7D] = 7;
    M[0x3D] = M[0x7F7D]; M[0x3E] = M[0x7F7E];
    // five glyphs, drawn through
    return P.drain(P.print_text({ x: 7, y: 7 }));
  };

  // draw_screen ($4A63): screen A: each icon's picture at its cell and its text at its own place,
  // then the boxes listed after the icons (width, height, column, row; two $FF end them). The page's
  // clock is handed back after each picture, text and box.
  P.draw_screen = function* (r) {
    M[0x5435] = r.a & 255;
    P.screen_ptr({});
    for (;;) {
      const ip = w(0x37);
      M[PIC] = M[ip]; M[PIC + 1] = M[ip + 1];
      yield* P.draw_picture({ x: M[ip + 2], y: M[ip + 3] });
      yield { cycles: 0 };
      M[0x3D] = M[ip + 5]; M[0x3E] = M[ip + 6];
      M[0x7D] = M[ip + 8];
      yield* P.print_text({ x: M[ip + 7], y: M[ip + 8] });
      yield { cycles: 0 };
      if (P.next_icon({}).c) break;
    }
    let y = 2;
    M[0x543F] = 3;
    const ip = w(0x37);
    for (;;) {
      if (M[(ip + y) & 0xFFFF] === 0xFF) {
        if (M[(ip + y + 1) & 0xFFFF] === 0xFF) break;
      }
      M[0x49F1] = M[(ip + y) & 0xFFFF]; y++;
      M[0x49F2] = M[(ip + y) & 0xFFFF]; y++;
      const x = M[(ip + y) & 0xFFFF]; y++;
      const row = M[(ip + y) & 0xFFFF];
      M[0x73] = y;
      P.draw_box({ x, y: row });
      yield { cycles: 0 };
      y = (M[0x73] + 1) & 255;
    }
    M[0x543F] = 0;
    return { a: 0, y: (y + 1) & 255 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
