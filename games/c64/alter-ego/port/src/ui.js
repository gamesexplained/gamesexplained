'use strict';
// The resident program's screen and input ($4B57-$5B6B, $44BA-$4627, $4128): the menus and the
// text field, the arrow, the keys and the joystick, the life map's window and its scrolling, the
// text drawn into a panel, the curtain that brings a panel onto the screen, and the SID's click.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const M = P.M;
    const b = a => P.rb(a & 0xFFFF);

    // ---- the menus
    // $4B57: a menu: its descriptor is the row of its first choice, the number of choices, then
    // (text, row) pairs to a 0. The text drawn, the arrow put at column col + 4 beside the first
    // choice and moved two rows a step by up and down; fire (or RETURN) chooses. The choice (0-)
    P.run_modal_selection_dialog = function* (desc, col) {
      const f = P.enter([desc, col], 10);
      try {
        const first = P.rw(desc), count = P.rw(desc + 2);
        desc = (desc + 4) & 0xFFFF;
        P.clear_hires_bitmap();
        while (P.rw(desc)) {
          P.install_dialog_glyph_range(P.rw(desc), 0, P.rw(desc + 2));
          desc = (desc + 4) & 0xFFFF;
        }
        yield* P.place_arrow_at_text_cell((col + 4) & 0xFFFF, first);
        yield* P.delay_scaled_iterations(0x1388);
        let at = 0, shown = 0;
        for (;;) {
          const k = yield* P.read_normalized_input();
          if (k & 16) break;
          if ((k & 1) && P.s(at) > 0) at = (at - 1) & 0xFFFF;
          if ((k & 2) && P.s((at + 1) & 0xFFFF) < P.s(count)) at = (at + 1) & 0xFFFF;
          if (shown !== at) {
            shown = at;
            yield* P.place_arrow_at_text_cell((col + 4) & 0xFFFF, ((at << 1) + first) & 0xFFFF);
            yield* P.delay_scaled_iterations(0x1388);
          }
        }
        P.play_sid_click(1024, 32, 15, 39, 15, 1);
        yield* P.enter_inline_native_5f36_adjust_0();
        yield* P.delay_scaled_iterations(0x1388);
        return at;
      } finally { P.leave(f); }
    };
    // $4CCC: the bitmap cleared
    P.clear_hires_bitmap = function () {
      const f = P.enter([], 0);
      try { return P.fill_memory_range(0x2000, 0x1F40, 0); } finally { P.leave(f); }
    };
    // $4CDE: a line of text in ROM glyphs on the screen from (col, row)
    P.install_dialog_glyph_range = function (text, col, row) {
      const f = P.enter([text, col, row], 4);
      try {
        let i = 0, c = col;
        while (b(text + i)) {
          c = (c + 1) & 0xFFFF; i = (i + 1) & 0xFFFF;
          P.copy_rom_glyph_to_screen_charset(b(i - 1 + text), (c - 1) & 0xFFFF, row);
        }
        return 0;
      } finally { P.leave(f); }
    };
    // $511E: a text field: the prompt at (3, 3), max underscores at (4, 5) on row 5 and the
    // letters typed over them into buf (lower case kept as ASCII, shifted letters as upper case);
    // left on the joystick or DEL rubs one out, fire or RETURN ends it once a letter is in. 1
    P.EditMenuTextOrSelectEntry = function* (prompt, buf, max) {
      const f = P.enter([prompt, buf, max], 4);
      try {
        P.fill_memory_range(0x2000, 0x1F40, 0);
        P.fill_memory_range(buf, max, 0);
        P.install_dialog_glyph_range(prompt, 3, 3);
        while (yield* P.get_debounced_key());
        for (let i = 0; P.s(i) < P.s(max); i = (i + 1) & 0xFFFF) P.copy_custom_glyph_to_screen_charset(14, (i + 4) & 0xFFFF, 5);
        let n = 0;
        for (;;) {
          let k = yield* P.get_debounced_key();
          if (!k) {
            k = ~P.rb(0xDC00) & 31;
            if (!k) continue;
          } else {
            if (k >= 65 && k <= 90) k = (k + 32) & 0xFFFF;
            else if (k >= 192 && k <= 223) k = (k - 128) & 0xFFFF;
            if (k >= 32 && k <= 122) {
              if (P.s(n) < P.s(max)) {
                P.copy_rom_glyph_to_screen_charset(k, (n + 4) & 0xFFFF, 5);
                n = (n + 1) & 0xFFFF;
                P.wb(n - 1 + buf, k);
              }
              continue;
            }
            k = P.normalize_key_or_joystick_code(k);
          }
          if (k === 16) {
            if (P.s(n) > 0 || P.s(max) <= 0) return 1;
          } else if (k === 4) {
            if (P.s(n) > 0) {
              n = (n - 1) & 0xFFFF;
              P.wb(n + buf, 0);
              P.copy_custom_glyph_to_screen_charset(14, (n + 4) & 0xFFFF, 5);
            }
          }
        }
      } finally { P.leave(f); }
    };

    // ---- the life map. Its window is the bitmap's first 24 character rows ($2000-) less the
    // columns $82B1/$82B7 bound; it is drawn a cell at a time from the map's ages of three
    // words ($81F7) and the scene choices ($81C5-)
    // $5220: the window scrolled back by n ages, a pixel row at a time, the ages coming in at
    // the top drawn: the first age shown after
    P.scroll_life_map_backward_and_render_exposed_rows = function (n, top) {
      const f = P.enter([n, top], 8);
      try {
        const dst = (P.ramw(0x82B1) + 0x2000) & 0xFFFF;
        for (let i = 0; P.s(i) < P.s(n); i = (i + 1) & 0xFFFF) {
          top = (top - 1) & 0xFFFF;
          for (let r = 4; P.s(r) >= -1; r = (r - 1) & 0xFFFF) {
            P.copy_screen_blocks_backward();
            P.render_life_map_cell_or_connector(dst, 0x81CB, (P.mul((top - 3) & 0xFFFF, 6) + 0x81F7) & 0xFFFF, r,
              P.sar(P.ramw(0x82B1), 3), P.sar((P.ramw(0x82B7) - P.ramw(0x82B1)) & 0xFFFF, 3));
          }
        }
        return top;
      } finally { P.leave(f); }
    };
    // $527E: forward by n ages, the ages coming in at the bottom drawn
    P.scroll_life_map_forward_and_render_exposed_rows = function (n, top) {
      const f = P.enter([n, top], 6);
      try {
        const dst = (P.ramw(0x82B1) + 0x3E00) & 0xFFFF;
        for (let i = 0; P.s(i) < P.s(n); i = (i + 1) & 0xFFFF) {
          top = (top + 1) & 0xFFFF;
          for (let r = 0; P.s(r) <= 5; r = (r + 1) & 0xFFFF) {
            P.copy_screen_blocks_forward();
            P.render_life_map_cell_or_connector(dst, 0x81C5, (P.mul(top, 6) + 0x81F7) & 0xFFFF, r,
              P.sar(P.ramw(0x82B1), 3), P.sar((P.ramw(0x82B7) - P.ramw(0x82B1)) & 0xFFFF, 3));
          }
        }
        return top;
      } finally { P.leave(f); }
    };
    // $5596: count pixel rows of the map from age (row / 6 + top - 3), row mod 6 into it, drawn to
    // dst a row of 31 cells at a time, the ages before the first empty
    P.render_life_map_window_or_strip = function (x, row, count, top, dst) {
      const f = P.enter([x, row, count, top, dst], 10);
      try {
        let age = (P.divs(row, 6) + top - 3) & 0xFFFF;
        let r = (P.rems(row, 6) - 1) & 0xFFFF;
        for (; P.s(age) <= P.s(top); age = (age + 1) & 0xFFFF) {
          for (; P.s(r) < 6; r = (r + 1) & 0xFFFF) {
            count = (count - 1) & 0xFFFF;
            if (P.s(count) < 0) return 1;
            const cell = P.s(age) >= 0 ? (P.mul(age, 6) + 0x81F7) & 0xFFFF : 0;
            P.render_life_map_cell_or_connector(dst, (((top - age) << 1) + 0x81C5) & 0xFFFF, cell, r, x, 31);
            dst = (dst + 248) & 0xFFFF;
          }
          r = 0;
        }
        return 0;
      } finally { P.leave(f); }
    };
    // $5603: the window's four ages from age - 3 drawn on the screen, six pixel rows each and a
    // connector row first
    P.render_initial_life_map_window = function (age, ...more) {
      const f = P.enter([age, ...more], 10);
      try {
        let choices = 0x81CB, cell = (P.mul((age - 3) & 0xFFFF, 6) + 0x81F7) & 0xFFFF, dst = 0x2000, r = 0xFFFF;
        for (let i = 3; P.s(i) >= 0; i = (i - 1) & 0xFFFF) {
          for (; P.s(r) < 6; r = (r + 1) & 0xFFFF) {
            P.render_life_map_cell_or_connector(dst, choices, P.s(age) >= P.s(i) ? cell : 0, r, 0, 40);
            dst = (dst + 320) & 0xFFFF;
          }
          choices = (choices - 2) & 0xFFFF;
          cell = (cell + 6) & 0xFFFF;
          r = 0;
        }
        return 0;
      } finally { P.leave(f); }
    };
    // $57BA: one pixel row (row -1 the line above the age, 5 the one below) of an age's cell into
    // dst, cut to columns x to x + width: the three choices' boxes ($82B1-$82B7) and the lines
    // between them. The age's words (cell, 0 for none) say which of them are set
    P.render_life_map_cell_or_connector = function (dst, choices, cell, row, x, width) {
      const f = P.enter([dst, choices, cell, row, x, width], 4);
      try {
        const box = i => P.ramw((((i + 1) << 1) + 0x82AF) & 0xFFFF);
        if (row === 0xFFFF || P.s(row) >= 5) {
          const bit = row === 0xFFFF ? 0x1000 : 0x2000;
          x = (x << 3) & 0xFFFF; width = (width << 3) & 0xFFFF;
          P.fill_memory_range(dst, width, 0);
          if (!cell) return cell;
          width = (width + x) & 0xFFFF;
          for (let i = 0; i < 3; i++) {
            if (!(P.rw(((i << 1) + cell) & 0xFFFF) & bit)) continue;
            if (!(P.s(x) <= P.s((box(i) + 24) & 0xFFFF))) continue;
            if (!(P.s(width) > P.s((box(i) + 24) & 0xFFFF))) continue;
            P.fill_memory_range(((dst - x + box(i)) + 24) & 0xFFFF, 8, 192);
          }
          return 0;
        }
        M[0x7E8D] = row & 255; M[0x7E8E] = (row >> 8) & 255;
        x = (x << 3) & 0xFFFF;
        const end = ((width << 3) + x) & 0xFFFF;
        P.setw(0x7E8F, (P.mul(P.ramw(0x7E8D), 48) + P.ramw(0x81F5)) & 0xFFFF);
        P.clip_and_draw_life_map_connector_segment(choices ? P.rw(choices) : 0, dst, x, end, 0);
        P.clip_and_draw_life_map_connector_segment(choices ? P.rw(choices + 8) : 0, dst, x, end, 4);
        P.setw(0x7E8F, P.ramw(0x7E8F) + 2640);
        P.clip_and_draw_life_map_connector_segment(cell ? P.rw(cell) : 0, dst, x, end, 1);
        P.clip_and_draw_life_map_connector_segment(cell ? P.rw(cell + 2) : 0, dst, x, end, 2);
        return P.clip_and_draw_life_map_connector_segment(cell ? P.rw(cell + 4) : 0, dst, x, end, 3);
      } finally { P.leave(f); }
    };
    // $596E: segment seg (0 and 4 the margins, 1-3 the choices' boxes) of a pixel row, from
    // column from to to, drawn: an icon's row from the map's graphics (the word's high byte's low
    // nibble picks it, 240 bytes each) or the box's frame (draw_map_box_frame_row). The
    // graphics are read with the KERNAL banked out
    P.clip_and_draw_life_map_connector_segment = function (word, dst, from, to, seg) {
      const f = P.enter([word, dst, from, to, seg], 2);
      try {
        const edge = i => P.ramw(((i << 1) + 0x82AF) & 0xFFFF);
        if (P.s(from) >= P.s(edge(seg + 1))) return 1;
        from = (from - edge(seg)) & 0xFFFF;
        to = (to - edge(seg)) & 0xFFFF;
        if (P.s(to) <= 0) return 1;
        dst = (dst - from) & 0xFFFF;
        if (P.s(from) < 0) from = 0;
        const span = (edge(seg + 1) - edge(seg)) & 0xFFFF;
        if (P.s(to) > P.s(span)) to = span;
        while (P.s(to) > 48 && P.s(to) > P.s(from)) {
          to = (to - 8) & 0xFFFF;
          P.fill_memory_range((dst + to) & 0xFFFF, 8, 0);
          if (P.ramw(0x7E8D) === 2 && (word & 0x4000)) P.wb(dst + to + 3, 255);
        }
        if (P.s(to) <= P.s(from)) return 1;
        const icon = P.return_argument_byte_1(word) & 15;
        if (!icon) return P.draw_map_box_frame_row(word, dst, from, to);
        let src = ((icon - 1) * 240 + P.ramw(0x7E8F)) & 0xFFFF;
        dst = (dst + from) & 0xFFFF;
        src = (src + from) & 0xFFFF;
        const n = (to - from) & 0xFFFF;
        P.wb(0x01, P.rb(0x01) & 253);
        P.memmove_bytes(dst, src, n);
        const port = P.rb(0x01) | 2;
        P.wb(0x01, port);
        return port;
      } finally { P.leave(f); }
    };
    // $5A5D: a box's frame in a pixel row (columns from to to of dst): blank, with the line down
    // its middle (column 24) where the word's bit says a line runs there; the middle row also
    // has the line across, left ($8000) and right ($4000) of it
    P.draw_map_box_frame_row = function (word, dst, from, to) {
      const f = P.enter([word, dst, from, to], 0);
      try {
        P.fill_memory_range((dst + from) & 0xFFFF, (to - from) & 0xFFFF, 0);
        const row = P.s(P.ramw(0x7E8D));
        const crosses = P.s(from) <= 24 && P.s(to) > 24;
        if (row < 2) return (word & 0x1000) && crosses ? P.fill_memory_range((dst + 24) & 0xFFFF, 8, 192) : 0;
        if (row > 2) return (word & 0x2000) && crosses ? P.fill_memory_range((dst + 24) & 0xFFFF, 8, 192) : 0;
        if (crosses) {
          if (word & 0x1000) P.fill_memory_range((dst + 24) & 0xFFFF, 4, 192);
          if (word & 0x2000) P.fill_memory_range((dst + 27) & 0xFFFF, 5, 192);
          if (word & 0x8000) P.wb(dst + 27, 192);
          if (word & 0x4000) P.wb(dst + 27, 255);
        }
        if (word & 0x8000) {
          for (; P.s(from) < 24; from = (from + 8) & 0xFFFF) P.wb(dst + from + 3, 255);
        }
        if (word & 0x4000) {
          for (to = (to - 8) & 0xFFFF; P.s(to) > 24; to = (to - 8) & 0xFFFF) P.wb(dst + to + 3, 255);
        }
        return 0;
      } finally { P.leave(f); }
    };

    // ---- panels: text drawn off screen, 31 cells wide, then brought on by the curtain
    // $52D9: a panel of rows rows framed: cleared inside, its edges and corners the custom glyphs
    // 0-7
    P.clear_and_frame_text_region = function (rows, buf) {
      const f = P.enter([rows, buf], 4);
      try {
        let p = (buf + 256) & 0xFFFF;
        rows = (rows - 1) & 0xFFFF;
        for (let i = rows; (i = (i - 1) & 0xFFFF), P.s(i) > 0;) { P.fill_memory_range(p, 232, 0); p = (p + 248) & 0xFFFF; }
        for (let i = 30; (i = (i - 1) & 0xFFFF), P.s(i) > 0;) {
          P.copy_custom_glyph_to_buffer(4, i, 0, buf);
          P.copy_custom_glyph_to_buffer(5, i, rows, buf);
        }
        for (let i = rows; (i = (i - 1) & 0xFFFF), P.s(i) > 0;) {
          P.copy_custom_glyph_to_buffer(6, 0, i, buf);
          P.copy_custom_glyph_to_buffer(7, 30, i, buf);
        }
        P.copy_custom_glyph_to_buffer(0, 0, 0, buf);
        P.copy_custom_glyph_to_buffer(1, 30, 0, buf);
        P.copy_custom_glyph_to_buffer(2, 0, rows, buf);
        return P.copy_custom_glyph_to_buffer(3, 30, rows, buf);
      } finally { P.leave(f); }
    };
    // $536A: len bytes of text into the panel at buf from (col, row): 32-127 a ROM glyph, 128-255
    // a span of text from the table at $419F, 1-31 that many columns skipped, 0 a new line at
    // column 1; between 255 and 254 the bytes are custom glyphs. The row it ended on
    P.render_text_into_region = function (text, buf, len, col, row) {
      const f = P.enter([text, buf, len, col, row], 13);
      try {
        const spans = P.return_highbit_text_span_table_bias();
        let custom = 0;
        for (let p = text; p < ((text + len) & 0xFFFF); p = (p + 1) & 0xFFFF) {
          let c = P.rb(p);
          if (c === 255) { custom = 1; continue; }
          if (c === 254) { custom = 0; continue; }
          if (!custom) {
            if (c > 127) {
              const i = (c - 128) & 0xFFFF;
              let s = P.rw((i << 1) + spans);
              const e = P.rw(((i << 1) + spans + 2) & 0xFFFF);
              while (s < e) {
                c = P.rb(s);
                P.copy_rom_glyph_to_buffer(c, col, row, buf);
                s = (s + 1) & 0xFFFF;
                col = (col + 1) & 0xFFFF;
              }
            } else if (c > 31) {
              P.copy_rom_glyph_to_buffer(c, col, row, buf);
              col = (col + 1) & 0xFFFF;
            } else if (c > 0) col = (c + col) & 0xFFFF;
            else { col = 1; row = (row + 1) & 0xFFFF; }
          } else if (custom === 1) {
            P.copy_custom_glyph_to_buffer(c, col, row, buf);
            col = (col + 1) & 0xFFFF;
          }
        }
        return row;
      } finally { P.leave(f); }
    };

    // $44C5: the curtain: the panel at buf (31 cells wide) swapped onto the screen from row row,
    // column x, rows rows deep, a pixel row at a time from the top, behind the seven curtain
    // sprites coming down in colour fill (the row's own colour from the screen's colour bytes,
    // which fill replaces); steps pixel rows a frame, each run of them after the raster's low byte
    // comes to 0. The screen's old pixels go to the panel
    P.animate_screen_region_transition = function* (x0, row, rows, buf, fill, steps) {
      M[0x4181] = x0 & 255; M[0x4182] = row & 255; M[0x4184] = rows & 255;
      M[0x16] = buf & 255; M[0x17] = (buf >> 8) & 255;
      M[0x4185] = fill & 255;
      M[0x4189] = M[0x418B] = steps & 255;
      const setY = v => { for (let r = 0xD003; r <= 0xD00F; r += 2) P.wb(r, v); };
      const w = a => M[a] | M[a + 1] << 8;
      yield* P.pollRasterLow(0);
      let y = M[0x4182];
      setY((M[0x49EA + y] + 0x33) & 255);
      let v = M[0x4A8A + y] + M[0x4181];
      M[0x12] = v & 255;
      M[0x13] = (M[0x4AA3 + y] + (v >> 8)) & 255;
      const colour = P.rb(w(0x12) + 0x1E) & 15;
      for (let r = 0xD028; r <= 0xD02E; r++) P.wb(r, colour);
      for (let i = 0x1E; i >= 0; i--) P.wb(w(0x12) + i, M[0x4185]);
      y = M[0x4182];
      const x = M[0x4181];
      v = M[0x4ABC + y] + M[0x49EA + x];
      M[0x1A] = v & 255;
      M[0x1B] = (M[0x4AD5 + y] + M[0x4A12 + x] + (v >> 8)) & 255;
      M[0x4188] = M[0x49EA + M[0x4184]];
      for (;;) {
        // a pixel row of 31 cells swapped, its bytes 8 apart (the offsets at $49EA)
        for (let k = 0x1F, o = 0; ; ) {
          const s = (w(0x1A) + o) & 0xFFFF, d = (w(0x16) + o) & 0xFFFF;
          const t = P.rb(s);
          P.wb(s, P.rb(d));
          P.wb(d, t);
          o = M[0x49E9 + k];
          k--;
          if (!k) break;
        }
        P.spend(1350);
        M[0x4188] = (M[0x4188] - 1) & 255;
        if (!M[0x4188]) {
          P.wb(0xD015, 0);
          setY(0);
          return null;
        }
        setY((P.rb(0xD003) + 1) & 255);
        let c = 0;
        const add = (a, n) => { const s = M[a] + n + c; M[a] = s & 255; c = s >> 8; };
        if (M[0x4188] & 7) {
          add(0x1A, 1); add(0x1B, 0);
          add(0x16, 1); add(0x17, 0);
        } else {
          add(0x12, 0x28); add(0x13, 0);
          for (let i = 0x1E; i >= 0; i--) P.wb(w(0x12) + i, M[0x4185]);
          add(0x1A, 0x39); add(0x1B, 1);
          let s = M[0x49E9 + 0x1F] + 1 + c; c = s >> 8;
          s = (s & 255) + M[0x16] + c; M[0x16] = s & 255; c = s >> 8;
          add(0x17, 0);
        }
        M[0x418B] = (M[0x418B] - 1) & 255;
        if (!M[0x418B]) {
          M[0x418B] = M[0x4189];
          yield* P.pollRasterLow(0);
        }
      }
    };
    // $44BA: X bytes from ($12) to ($0E)
    P.copy_64_bytes = function (n) {
      const s = M[0x12] | M[0x13] << 8, d = M[0x0E] | M[0x0F] << 8;
      let x = n & 255, y = 0;
      do { P.wb(d + y, P.rb(s + y)); y = (y + 1) & 255; x = (x - 1) & 255; } while (x);
      return null;
    };

    // ---- the arrow
    // $5480 and $549C: the arrow put at, or sent to, column col's x ($7F36) and the y of row
    // rows - (last - first) up the life map's window ($82BF)
    const gridX = col => P.rw(((col << 1) + 0x7F36) & 0xFFFF);
    const gridY = (first, last) => (P.rw((((4 - ((last - first) & 0xFFFF)) << 1) + 0x82BF) & 0xFFFF) + 53) & 0xFFFF;
    P.show_sprite0_at_grid_position = function (col, first, last, ...more) {
      const f = P.enter([col, first, last, ...more], 0);
      try { return P.sprite0_show_at_position(gridX(col), gridY(first, last)); } finally { P.leave(f); }
    };
    P.set_sprite0_target_from_grid_position = function (col, first, last, ...more) {
      const f = P.enter([col, first, last, ...more], 0);
      try { return P.sprite0_set_target(gridX(col), gridY(first, last)); } finally { P.leave(f); }
    };
    // $54BF: the arrow at text column col, row row of the screen (x = col x 8, y = row x 8 + 53),
    // moved at the top of a frame
    P.place_arrow_at_text_cell = function* (col, row) {
      const f = P.enter([col, row], 2);
      try {
        yield* P.enter_inline_native_5f36_adjust_0();
        P.wb(0xD001, ((row << 3) + 53) & 255);
        col = (col << 3) & 0xFFFF;
        P.wb(0xD000, P.return_argument_byte_0(col));
        if (P.return_argument_byte_1(col)) P.wb(0xD010, P.rb(0xD010) | 1);
        else P.wb(0xD010, P.rb(0xD010) & 254);
        return P.enable_sprite0();
      } finally { P.leave(f); }
    };
    // $550C: the sprites but the curtain's off ($D015 = $FE, as the routine writes it)
    P.disable_sprite0 = function () {
      const f = P.enter([], 2);
      try { P.wb(0xD015, 254); return 254; } finally { P.leave(f); }
    };
    // $551C: the arrow on
    P.enable_sprite0 = function () {
      const f = P.enter([], 2);
      try { const v = P.rb(0xD015) | 1; P.wb(0xD015, v); return v; } finally { P.leave(f); }
    };

    // ---- the input: a key or the joystick in port 2, as the bits 1 up, 2 down, 4 left, 8
    // right, 16 fire
    // $552D: 0 while fire is held, 16 while it is not
    P.poll_input_high_nibble = function* () {
      const f = P.enter([], 0);
      try { return ((yield* P.read_normalized_input()) & 16) ? 0 : 16; } finally { P.leave(f); }
    };
    // $5542: the directions alone
    P.poll_input_low_nibble = function* () {
      const f = P.enter([], 0);
      try { return (yield* P.read_normalized_input()) & 15; } finally { P.leave(f); }
    };
    // $56FF: the next key, or the joystick, as those bits
    P.read_normalized_input = function* () {
      const f = P.enter([], 0);
      try { return P.normalize_key_or_joystick_code(yield* P.get_debounced_key()); } finally { P.leave(f); }
    };
    // $570E: a key from the buffer, the rest of the buffer then thrown away (0 for none)
    P.get_debounced_key = function* () {
      const f = P.enter([], 2);
      try {
        P.kernal_clrchn_wrapper();
        const k = yield* P.kernal_getin_wrapper();
        if (k) while (yield* P.kernal_getin_wrapper());
        return k;
      } finally { P.leave(f); }
    };
    // $5729: a key as those bits: RETURN fire, the cursor keys their directions (DEL left too),
    // f1, f3, f5, f7 (133-136) 35 down to 32 and f2-f8 39 down to 36, no key the joystick
    // ($DC00); 3 (RUN/STOP) stays 3, anything else 0
    P.normalize_key_or_joystick_code = function (k) {
      const f = P.enter([k], 0);
      try {
        switch (k) {
          case 0: return ~P.rb(0xDC00) & 31;
          case 3: return 3;
          case 13: return 16;
          case 17: return 2;
          case 20: return 4;
          case 29: return 8;
          case 133: case 134: case 135: case 136: return (168 - k) & 0xFFFF;
          case 137: case 138: case 139: case 140: return (176 - k) & 0xFFFF;
          case 145: return 1;
          case 157: return 4;
          default: return 0;
        }
      } finally { P.leave(f); }
    };

    // $554D: a click on the SID: voice voice at freq with wave, its envelope ad and sr and the
    // volume vol, gated on and at once off
    P.play_sid_click = function (freq, wave, ad, sr, vol, voice) {
      const f = P.enter([freq, wave, ad, sr, vol, voice], 4);
      try {
        const v = (P.mul(voice, 7) + 0xD400) & 0xFFFF;
        P.wb(v, P.return_argument_byte_0(freq));
        P.wb(v + 1, P.return_argument_byte_1(freq));
        P.wb(v + 5, ad);
        P.wb(v + 6, sr);
        P.wb(0xD418, vol);
        P.wb(v + 4, wave | 1);
        P.wb(v + 4, wave & 254);
        return wave & 254;
      } finally { P.leave(f); }
    };

    // $4128: the NMI with the KERNAL banked out (RESTORE): the KERNAL banked in, the KERNAL's NMI
    // routine run ($FE43), and the banking put back. The KERNAL's routine starts BASIC when
    // RUN/STOP is held with RESTORE; the page has no RESTORE key
    P.nmi_dispatch_bridge = function () {
      const port = P.rb(0x01);
      M[0x417F] = port;
      P.wb(0x01, port | 3);
      // $FE47: CIA 2's interrupts off and acknowledged; then $F6BC, the STOP key's row into $91
      P.wb(0xDD0D, 0x7F);
      P.rb(0xDD0D);
      let a;
      do { a = P.rb(0xDC01); } while (a !== P.rb(0xDC01));
      P.wb(0x91, a);
      if (a === 0x7F) return P.enter_basic_warm_start(0);
      P.wb(0x01, M[0x417F]);
      return null;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
