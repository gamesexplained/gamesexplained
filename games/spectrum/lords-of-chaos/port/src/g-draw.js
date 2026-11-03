// The map's drawing and the interrupt ($A737-$AC52): the random numbers, a square of the map drawn
// from its graphic and colour set, the interrupt's work (the animations, the cursor's blink, the
// flashing colour, the map window and the pictures redrawn), the information display's bars, and
// the text engine's messages.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.draw = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def;
  // the variables of the block being drawn
  const BLOCK_LINES = 0xA7A6, BLOCK_LINE = 0xA7AC, BLOCK_SCREEN = 0xA7AE, BLOCK_ATTR = 0xA7B0, BLOCK_CHARS = 0xA7B2,
    BLOCK_COLOURS = 0xA7B4;

  // random_below: A = R xor three bytes 256 apart at each pointer (each moved on one first) xor the
  // byte at $FFF8, drawn again until it is below $5B22 (a limit of 0 is never met: the game would
  // draw for ever). HL kept. The pointers walk through all of memory, the stacks and the ROM too,
  // so the bytes are read through P.readAt: on the page the port's own memory.
  const rd = a => P.readAt(a);
  def(0xA734, 'random_below_a', r => { M[0x5B22] = r.a; return P.random_below(r); });
  def(0xA737, 'random_below', r => {
    const lim = M[0x5B22];
    let a;
    do {
      a = P.readR() & 255;
      let p = (w(0x606F) + 1) & 0xFFFF;
      setw(0x606F, p);
      a ^= rd(p) ^ rd((p + 0x100) & 0xFFFF) ^ rd((p + 0x200) & 0xFFFF);
      p = (w(0x6071) + 1) & 0xFFFF;
      setw(0x6071, p);
      a ^= rd(p) ^ rd((p + 0x100) & 0xFFFF) ^ rd((p + 0x200) & 0xFFFF);
      a ^= rd(0xFFF8);
      P.N.random = (P.N.random || 0) + 1;
    } while (a >= lim);
    // CP (HL) last: carry set, Z clear
    return { a, cf: true, zf: false };
  });

  // draw_block_at: the three screen lines of the window's character row $D0D5, column $D0D6, into
  // block_lines (from the table at $AF61), the attribute address into block_attr; then draw_block
  // for graphic A in colour set B.
  def(0xA75E, 'draw_block_at', r => {
    const row = M[0xD0D5], col = M[0xD0D6];
    for (let i = 0; i < 3; i++) setw(BLOCK_LINES + 2 * i, (w(0xAF61 + 2 * row + 2 * i) + col) & 0xFFFF);
    setw(BLOCK_LINE, BLOCK_LINES + 6);
    setw(BLOCK_ATTR, 0x5800 + row * 32 + col);
    return P.draw_block(r);
  });

  // draw_block: graphic A (nine character numbers from ($D038), the characters from the set at
  // ($D03D)) in colour set B (nine attributes from ($D036)), three rows of three, at the screen
  // lines in block_lines and the attribute block_attr. Each row's line moves on three characters.
  def(0xA7B6, 'draw_block', r => {
    let chars = (r.a * 9 + w(0xD038)) & 0xFFFF;
    let cols = (r.b * 9 + w(0xD036)) & 0xFFFF;
    const set = w(0xD03D);
    let attr = w(BLOCK_ATTR), a = 0;
    for (let row = 0; row < 3; row++) {
      let scr = w(BLOCK_LINES + 2 * row);
      for (let k = 0; k < 3; k++) {
        const g = (M[chars] * 8 + set) & 0xFFFF;
        chars = (chars + 1) & 0xFFFF;
        for (let y = 0; y < 8; y++) M[(scr + 256 * y) & 0xFFFF] = M[(g + y) & 0xFFFF];
        a = M[cols]; cols = (cols + 1) & 0xFFFF;
        M[attr] = a; attr = (attr + 1) & 0xFFFF;
        scr = (scr + 1) & 0xFFFF;
      }
      setw(BLOCK_LINES + 2 * row, scr);
      attr = (attr + 0x1D) & 0xFFFF;
    }
    setw(BLOCK_CHARS, chars); setw(BLOCK_COLOURS, cols);
    setw(BLOCK_SCREEN, w(BLOCK_LINES + 4));
    setw(BLOCK_LINE, BLOCK_LINES + 6);
    setw(BLOCK_ATTR, attr);
    P.N.blocks = (P.N.blocks || 0) + 1;
    return { a, b: 0, c: r.c, hl: attr, de: 0x1D };
  });

  def(0xA843, 'draw_thing_at', r => P.draw_block_at(P.thing_graphic(r)));

  // thing_graphic: A = graphic and B = colour set of thing A, from its entry in ($D032); the entry's
  // character set made the one in use ($D03C, its address from $D07A in $D03D). HL the entry + 2.
  def(0xA84A, 'thing_graphic', r => {
    const e = (r.a * 5 + w(0xD032)) & 0xFFFF;
    let d = r.d, ee = r.e;
    if (M[0xD03C] !== M[e]) {
      M[0xD03C] = M[e];
      const s = w(0xD07A + 2 * M[e]);
      setw(0xD03D, s);
      d = s >> 8; ee = s & 255;
    } else { d = 0; ee = r.a; }
    return { a: M[e + 1], b: M[e + 2], hl: (e + 2) & 0xFFFF, d, e: ee };
  });

  // interrupt: every second frame the work ($A891); every frame the bars slide when bit 4 of $D0DF.
  def(0xA879, 'interrupt', r => {
    M[0x606E] ^= 1;
    if (M[0x606E] === 0) P.interrupt_work({});
    if (M[0xD0DF] & 0x10) P.slide_bars({});
    P.IFF = true;
    return {};
  });

  // interrupt_work: the animations, the cursor's blink, the flashing colour, then by the bits of
  // $D0DF the map window, the pictures and the menu's bar; the message line in the flashing colour
  // when $5B42 is set. It keeps the main program's drawing state, all but block_colours: the saved
  // value is popped and dropped (an LD HL,(block_colours) stands where its store would be), so
  // block_colours is left as the interrupt's own drawing set it.
  def(0xA891, 'interrupt_work', r => {
    const keep = { c: M[0xD03C], d5: w(0xD0D5), d3d: w(0xD03D), line: w(BLOCK_LINE), attr: w(BLOCK_ATTR), chars: w(BLOCK_CHARS) };
    let e = (w(0xD032) + 3) & 0xFFFF;
    for (let i = 0; i < 0xAA; i++, e = (e + 5) & 0xFFFF) {
      if (M[e] === 0xFF) continue;
      M[e] = (M[e] - 1) & 255;
      if (M[e] === 0) P.next_frame({ hl: e });
    }
    P.blink_cursor({});
    let f = (w(0xB492) + 1) & 0xFFFF;
    setw(0xB492, f);
    if (M[f] === 0xFF) { f = 0xB494; setw(0xB492, f); }
    M[0xFF53] = M[f];
    if (M[0xD0DF] & 1) P.draw_map({});
    if (M[0xD0DF] & 2) P.redraw_pictures({});
    if (M[0xD0DF] & 4) P.redraw_two_pictures({});
    if (M[0xD0DF] & 8) P.flash_menu_bar({});
    if (M[0x5B42]) P.fill_message_line({ a: M[0xFF53] });
    setw(BLOCK_CHARS, keep.chars); setw(BLOCK_ATTR, keep.attr); setw(BLOCK_LINE, keep.line);
    setw(0xD03D, keep.d3d); setw(0xD0D5, keep.d5); M[0xD03C] = keep.c;
    return {};
  });

  // next_frame: the animated thing whose count (at HL) ran out takes its next frame: four bytes
  // (graphic, colour set, count, next) from ($D034) + 4 x the next frame, over the entry from HL - 2.
  def(0xA936, 'next_frame', r => {
    const e = r.hl;
    const src = (M[(e + 1) & 0xFFFF] * 4 + w(0xD034)) & 0xFFFF;
    const dst = (e - 2) & 0xFFFF;
    for (let i = 0; i < 4; i++) M[(dst + i) & 0xFFFF] = M[(src + i) & 0xFFFF];
    return { hl: (src + 4) & 0xFFFF, de: (dst + 4) & 0xFFFF, bc: 0 };
  });

  // draw_map: the map window, seven squares by seven from the top left square ($D0C8, wrapping at
  // 36), each square's thing as thing_graphic gives it, but the cursor's square while the cursor is
  // on ($D0D0), which shows the cursor (graphic $FF86, colour set $FF87, character set 0 at $B646).
  // A sound spread over a drawing gets a step after each row.
  def(0xA94C, 'draw_map', r => {
    let row = M[0xD0C8], col = M[0xD0C9];
    M[0xD0CC] = row; M[0xD0CD] = col;
    let ma = P.map_address({ hl: w(0xD0C8) }).hl;
    let lines = 0xAF61;
    let attr = 0x5800;
    setw(BLOCK_ATTR, attr);
    for (let y = 0; y < 7; y++) {
      for (let i = 0; i < 6; i++) M[BLOCK_LINES + i] = M[lines + i];
      lines += 6;
      setw(0xD0CA, lines);
      for (let x = 0; x < 7; x++) {
        let g, b;
        if (M[0xD0CC] === M[0xD0D3] && M[0xD0CD] === M[0xD0D4] && M[0xD0D0]) {
          M[0xD03C] = 0; setw(0xD03D, 0xB646);
          b = M[0xFF87]; g = M[0xFF86];
          ma = (ma + 1) & 0xFFFF;
        } else {
          const t = M[ma]; ma = (ma + 1) & 0xFFFF;
          const e = (t * 5 + w(0xD032)) & 0xFFFF;
          if (M[0xD03C] !== M[e]) { M[0xD03C] = M[e]; setw(0xD03D, w(0xD07A + 2 * M[e])); }
          g = M[e + 1]; b = M[e + 2];
        }
        setw(0xD0CE, ma);
        P.draw_block({ a: g, b });
        setw(BLOCK_ATTR, (w(BLOCK_ATTR) - 0x5D) & 0xFFFF);
        let c = (M[0xD0CD] + 1) & 255;
        // wrapped: the column back to 0 (the XOR before the SBC clears A as well as the carry)
        if (c === 0x24) { c = 0; ma = (ma - 0x24) & 0xFFFF; setw(0xD0CE, ma); }
        M[0xD0CD] = c;
      }
      // the next row of the map: past the rest of this one (29), or wrapped (65)
      ma = (ma + (M[0xD0C9] < 0x1D ? 0x1D : 0x41)) & 0xFFFF;
      setw(0xD0CE, ma);
      M[0xD0CD] = M[0xD0C9];
      let rr = (M[0xD0CC] + 1) & 255;
      if (rr === 0x24) { rr = 0; ma = (ma - 0x510) & 0xFFFF; setw(0xD0CE, ma); }
      M[0xD0CC] = rr;
      setw(BLOCK_ATTR, (w(BLOCK_ATTR) + 0x4B) & 0xFFFF);
      if (M[0xC839]) P.play_sound({});
    }
    P.N.maps = (P.N.maps || 0) + 1;
    return {};
  });

  // map_address: HL = ($D030) + 36 x row L + column H; BC and DE kept.
  const mapAddress = hl => ((hl & 255) * 36 + (hl >> 8) + w(0xD030)) & 0xFFFF;
  def(0xAA6A, 'map_address', r => ({ hl: mapAddress(r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) }));
  def(0xAA5D, 'map_address_window', r => ({ hl: mapAddress(w(0xD0CC)) }));
  def(0xAA62, 'map_address_cursor', r => ({ hl: mapAddress(w(0xD0D3)) }));
  def(0xAA67, 'map_address_selected', r => ({ hl: mapAddress(w(0x5B55)) }));

  // blink_cursor: on for three calls, off for two ($B45B counts).
  def(0xAA83, 'blink_cursor', r => {
    if (--M[0xB45B] & 255) return {};
    M[0xB45B] = 2;
    M[0xD0D0] ^= 1;
    if (M[0xD0D0]) M[0xB45B] = 3;
    return {};
  });

  // redraw_two_pictures, redraw_pictures: the information display's first two pictures (a first of
  // $FF skipped) or all eight (empty ones after the first skipped), from $B45C; then the icons.
  def(0xAA9F, 'redraw_two_pictures', r => { P.draw_thing_list({ b: 2, c: 0xFF, hl: 0xB45C }); return P.flash_icons({}); });
  def(0xAAA5, 'redraw_pictures', r => { P.draw_thing_list({ b: 8, c: 0, hl: 0xB45C }); return P.flash_icons({}); });

  // flash_icons: each icon that is on ($D1A9-$D1AD) coloured with the flashing colour $FF53.
  def(0xAAAF, 'flash_icons', r => {
    const d = M[0xFF53];
    for (let i = 0; i < 5; i++) {
      if (!M[0xD1A9 + i]) continue;
      const x = 0x5816 + 2 * i;
      M[x] = d; M[x + 1] = d; M[x + 0x20] = d; M[x + 0x21] = d;
    }
    return { b: 0, d, ix: 0x5820, hl: 0xD1AE };
  });

  // flash_menu_bar: the menu's pictures ($5B0A from $B474), the bar on the choice in the flashing
  // colour, then delay_50, inside the interrupt.
  def(0xAAD4, 'flash_menu_bar', r => {
    P.draw_thing_list({ b: M[0x5B0A], c: 0, hl: 0xB474 });
    P.colour_choice_row({ b: M[0xC662], a: M[0xFF53] });
    return P.delay_50({});
  });

  // delay_50: 50 x 255 turns of an empty loop, about 167,600 T-states; called only inside the
  // interrupt (flash_menu_bar), so it is time and nothing else. BC kept.
  def(0x9524, 'delay_50', r => { P.clock(167583); return {}; });

  // draw_thing_list: B things from a list of three bytes at HL (thing, row, column), skipping one
  // equal to C (C is 0 after the first).
  def(0xAAEE, 'draw_thing_list', r => {
    let n = r.b, c = r.c, hl = r.hl;
    do {
      if (M[hl] !== c) {
        M[0xD0D5] = M[hl + 1]; M[0xD0D6] = M[hl + 2];
        P.draw_thing_at({ a: M[hl] });
      }
      hl = (hl + 3) & 0xFFFF;
      c = 0;
      n = (n - 1) & 255;
    } while (n);
    return { b: 0, c: 0, hl, de: 3 };
  });

  // slide_bars: each of the five bars ($D1F6 on, drawn lengths; $D1FB on, values) one pixel toward
  // its value (at most $5F), one pixel line filled or cleared (bar_fill_line, D the column).
  def(0xAB0E, 'slide_bars', r => {
    let d = 0x16;
    for (let i = 0; i < 5; i++, d += 2) {
      const ix = 0xD1F6 + i;
      let a = M[ix];
      if (a === M[ix + 5]) continue;
      if (a < M[ix + 5]) {
        if (a === 0x5F) continue;
        a++; M[ix] = a;
        P.bar_fill_line({ d, e: (0x98 - a) & 255, b: a });
      } else {
        const b = a;
        a = (a - 1) & 255; M[ix] = a;
        if (a >= 0x5F) continue;
        P.bar_fill_line({ d, e: (0x98 - b) & 255, b });
      }
    }
    return {};
  });

  // print_panel_text: message A of the engine's own text ($CE00, $CE57) in its own font ($9531),
  // single height. It turns the interrupts off, as print_scenario_text does.
  def(0xAB57, 'print_panel_text', r => {
    P.IFF = false;
    setw(0xFFFB, 0xCE00); setw(0xFFFD, 0xCE57); setw(0x5B0E, 0x9531);
    M[0x5B14] = 1;
    return P.print_message(r);
  });
  // print_text: message A of the scenario, single height, unless the computer is moving ($D063).
  def(0xAB73, 'print_text', r => {
    if (M[0xD063] & 1) return { hl: 0xD063, zf: false };
    M[0x5B14] = 0;
    return P.print_scenario_text(r);
  });
  def(0xAB80, 'print_text_big', r => { M[0x5B14] = 8; return P.print_scenario_text(r); });
  def(0xAB85, 'print_scenario_text', r => {
    P.IFF = false;
    setw(0xFFFB, w(0xD00B)); setw(0xFFFD, w(0xD00D)); setw(0x5B0E, 0x3C00);
    return P.print_message(r);
  });

  // find_entry: HL = entry B (from 1) of a list of entries that start with their length; B its length.
  const findEntry = (hl, b) => { b &= 255; while (--b & 255 ? true : false) { hl = (hl + M[hl]) & 0xFFFF; b &= 255; } return hl; };
  def(0xABF4, 'find_entry', r => { const hl = findEntry(r.hl, r.b); return { hl, b: M[hl], d: 0, e: 0 }; });

  // print_message: message A of the tables at ($FFFB) and ($FFFD), from the start of the line
  // ($5B1A): word numbers and control codes ($FB-$FF); after each word the gap word_gap asks for.
  def(0xAB9C, 'print_message', r => {
    setw(0x5B15, w(0x5B1A));
    let hl = findEntry(w(0xFFFB), r.a);
    const st = { b: M[hl], hl };
    for (;;) {
      st.b = (st.b - 1) & 255;
      if (!st.b) break;
      st.hl = (st.hl + 1) & 0xFFFF;
      const a = M[st.hl];
      if (a >= 0xFB) { textControl(st, a); continue; }
      // a word
      const wd = { hl: findEntry(w(0xFFFD), a) };
      wd.b = M[wd.hl];
      for (;;) {
        wd.b = (wd.b - 1) & 255;
        wd.hl = (wd.hl + 1) & 0xFFFF;
        if (!wd.b) break;
        const ch = M[wd.hl];
        if (ch === 0xFA) continue;
        if (ch >= 0xFB) { textControl(wd, ch); continue; }
        P.print_char({ a: ch });
        M[0x5B16] = (M[0x5B16] + 1) & 255;
      }
      const gap = M[0xB45A];
      if (gap) {
        if (gap & 2) P.print_char({ a: 0x20 });
        M[0x5B16] = (M[0x5B16] + 1) & 255;
      }
    }
    return { b: 0, zf: true };
  });
  // text_control: control code A at s.hl ($FF a new line, $FE a colour, $FD and $FC the gap on and
  // off, $FB a position); s.b counts the bytes it uses.
  function textControl(s, a) {
    if (a === 0xFF) {
      let e = (M[0x5B1A] + 1) & 255;
      if (M[0x5B14] & 8) e = (e + 1) & 255;
      M[0x5B15] = e; M[0x5B16] = M[0x5B1B];
      M[0x5B1A] = e;
    } else if (a === 0xFE) {
      s.hl = (s.hl + 1) & 0xFFFF; M[0x5B17] = M[s.hl];
      if (M[0x5B14] & 8) { s.hl = (s.hl + 1) & 0xFFFF; M[0x5B18] = M[s.hl]; s.b = (s.b - 1) & 255; }
      s.b = (s.b - 1) & 255;
    } else if (a === 0xFD) M[0xB45A] = 1;
    else if (a === 0xFC) M[0xB45A] = 0;
    else {
      s.hl = (s.hl + 1) & 0xFFFF; M[0x5B15] = M[s.hl]; M[0x5B1A] = M[s.hl];
      s.hl = (s.hl + 1) & 0xFFFF; M[0x5B16] = M[s.hl]; M[0x5B1B] = M[s.hl];
      s.b = (s.b - 2) & 255;
    }
  }
  def(0xABFF, 'text_control', r => { const s = { hl: r.hl, b: r.b }; textControl(s, r.a); return { hl: s.hl, b: s.b }; });
};
})(typeof window !== 'undefined' ? window : globalThis);
