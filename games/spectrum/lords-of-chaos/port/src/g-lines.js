// Characters, pixels and lines ($AC53-$B147): a character printed in the small or the big font,
// the information display's bars, a pixel plotted, a missile's shape, its flight across the map
// window with its tail and its hit, and the stepping of a line between two squares of the map.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};
const rlc = a => ((a << 1) | (a >> 7)) & 255, rrc = a => ((a >> 1) | (a << 7)) & 255;

G.lines = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def;

  // print_char: character A at row $5B15, column $5B16, when the column is below 32; the big font
  // when bit 3 of $5B14 is set.
  def(0xAC53, 'print_char', r => {
    if (M[0x5B16] >= 0x20) return {};
    if (M[0x5B14] & 8) P.print_char_big(r); else P.print_char_small(r);
    return {};
  });

  // pixel_line_address: HL = the screen address of pixel line E, character column D.
  const pixelLine = (e, d) => {
    let a = (e & 0xC0) >> 1;
    a = (a >> 1) | 0x80;
    a = rrc(a);
    const h = ((a ^ e) & 0xF8) ^ e;
    const l = rlc(rlc(((rrc(rrc(d)) ^ e) & 0xC7) ^ e));
    return h << 8 | l;
  };
  def(0xAC70, 'pixel_line_address', r => ({ hl: pixelLine(r.e, r.d) }));
  def(0xAC87, 'bar_edge', r => { const hl = pixelLine(r.e, r.d); M[hl] = 0x10; M[hl + 1] = 0x08; return { hl: hl + 1 }; });
  def(0xAC90, 'bar_top', r => { const hl = pixelLine(r.e, r.d); M[hl] = 0x1F; M[hl + 1] = 0xF8; return { hl: hl + 1 }; });
  def(0xAC99, 'bar_fill_line', r => {
    const hl = pixelLine(r.e, r.d);
    M[hl] ^= 0x0F; M[hl + 1] ^= 0xF0;
    return { hl: hl + 1, a: M[hl + 1] };
  });

  // draw_bar_outlines: the five bars' outlines, up from pixel line $97 in columns $16 to $1E, each as
  // tall as its most ($D200 on), no higher than line $39.
  def(0xACA6, 'draw_bar_outlines', r => {
    let d = 0x16;
    for (let i = 0; i < 5; i++, d += 2) {
      let e = 0x97, b = M[0xD200 + i], top = true;
      do {
        P.bar_edge({ d, e });
        if (e === 0x39) { top = false; break; }
        e--;
        b = (b - 1) & 255;
      } while (b);
      if (top) P.bar_top({ d, e });
    }
    return {};
  });

  // plot: the pixel at line $FF33, column $FF34, set, cleared or flipped as $FF32 is 0, 1 or 2; its
  // cell takes attribute $FF61 unless that is $FF.
  def(0xACC9, 'plot', r => {
    const e = M[0xFF33], d = M[0xFF34];
    let a = (e & 0xC0) >> 1;
    a = rrc((a >> 1) | 0x80);
    const h = ((a ^ e) & 0xF8) ^ e;
    const l = rlc(rlc(((rlc(rlc(rlc(d))) ^ e) & 0xC7) ^ e));
    const hl = h << 8 | l;
    if (M[0xFF61] !== 0xFF) M[(((rrc(rrc(rrc(h))) & 3) | 0x58) << 8) | l] = M[0xFF61];
    const bit = 0x80 >> (d & 7);
    const m = M[0xFF32];
    if (m === 1) M[hl] &= bit ^ 0xFF;
    else if (m === 2) M[hl] ^= bit;
    else M[hl] |= bit;
    return { hl, b: bit, de: d << 8 | e };
  });

  // draw_shape: shape $FF5D (the table at $AD4E) plotted at the window's pixel $FF5B, $FF5C, each
  // point inside the window (both below $A8).
  def(0xAD1D, 'draw_shape', r => {
    let hl = w(0xAD4E + 2 * M[0xFF5D]);
    for (;;) {
      const y = (M[0xFF5B] + M[hl]) & 255;
      if (y < 0xA8) {
        M[0xFF33] = y;
        const x = (M[0xFF5C] + M[hl + 1]) & 255;
        if (x < 0xA8) { M[0xFF34] = x; P.plot({}); }
      }
      hl = (hl + 2) & 0xFFFF;
      if (M[hl] === 0x7F) return {};
    }
  });

  // clear_tail: the missile's tail, $FF5F bytes from $FF65, emptied ($FF), ended with $FE.
  def(0xAD7A, 'clear_tail', r => {
    setw(0xAD78, 0xFF65);
    const n = M[0xFF5F];
    M[0xFF65] = 0xFF;
    // LDIR from $FF65 to $FF66, n bytes (0 is 65,536: never asked for)
    let de = 0xFF66;
    for (let i = 0; i < (n || 0x10000); i++) { M[de] = M[(de - 1) & 0xFFFF]; de = (de + 1) & 0xFFFF; }
    M[de] = 0xFE;
    return { de, a: 0xFE, bc: 0 };
  });

  // missile_step: the missile drawn at its place ($FF3B, $FF3C), kept in the tail, and wiped at the
  // tail's oldest place.
  def(0xAD91, 'missile_step', r => {
    let hl = w(0xAD78);
    M[0xFF5B] = M[hl] = M[0xFF3B]; hl = (hl + 1) & 0xFFFF;
    M[0xFF5C] = M[hl] = M[0xFF3C]; hl = (hl + 1) & 0xFFFF;
    setw(0xAD78, hl);
    if (M[hl] === 0xFE) setw(0xAD78, 0xFF65);
    M[0xFF32] = 0;
    P.draw_shape({});
    hl = w(0xAD78);
    if (M[hl] === 0xFF) return {};
    M[0xFF5B] = M[hl]; M[0xFF5C] = M[hl + 1];
    M[0xFF32] = 1;
    P.draw_shape({});
    return {};
  });

  // wipe_tail: the tail wiped place by place, with a step of the sound each.
  def(0xADD1, 'wipe_tail', r => {
    let b = M[0xFF5F];
    do {
      let hl = (w(0xAD78) + 2) & 0xFFFF;
      let a = M[hl];
      if (a === 0xFE) { hl = 0xFF65; a = M[hl]; }
      setw(0xAD78, hl);
      if (a !== 0xFF) {
        M[0xFF5B] = a; M[0xFF5C] = M[(hl + 1) & 0xFFFF];
        M[0xFF32] = 1;
        P.draw_shape({});
        P.play_sound({});
      }
      b = (b - 1) & 255;
    } while (b);
    return {};
  });

  // draw_missile: something flying from the selected creature's square ($5B55) to the cursor's
  // ($D0D3), $FF5E pixels between drawings, from the middle of the map window; leaving the window
  // moves the view seven squares and redraws the map. The interrupts are off from its start.
  def(0xAE02, 'draw_missile', r => {
    P.IFF = false;
    P.clear_tail({});
    setw(0xFF3B, w(0x5B55));
    setw(0xFF3D, w(0xD0D3));
    if (M[0x5B56] === M[0xD0D4] && M[0x5B55] === M[0xD0D3]) return P.draw_hit({ de: w(0xD0D3) });
    P.line_setup({});
    setw(0xFF3B, 0x5353);
    P.centre({});
    M[0xD0D0] = 0;
    P.draw_map({});
    M[0xFFF7] = 0x18;
    for (;;) {
      let b = M[0xFF5E];
      let arrived = false;
      do {
        M[0xFF64] = 0;
        P.line_step_pixels({});
        if (M[0xFF3B] === 0xA8) P.scroll_down({});
        if (M[0xFF3B] === 0xFF) P.scroll_up({});
        if (M[0xFF3C] === 0xA8) P.scroll_right({});
        if (M[0xFF3C] === 0xFF) P.scroll_left({});
        if (M[0xFF64]) { P.draw_map({}); P.clear_tail({}); M[0xFFF7] = 0x0C; }
        M[0xFFF7] = (M[0xFFF7] - 1) & 255;
        if (!M[0xFFF7]) {
          M[0xFFF7] = 0x18;
          let a = (P.divide({ a: M[0xFF3B], b: 0x18 }).a + M[0xD0C8]) & 255;
          if (a >= 0x24) a = (a - 0x24) & 255;
          if (a === M[0xFF3D]) {
            a = (P.divide({ a: M[0xFF3C], b: 0x18 }).a + M[0xD0C9]) & 255;
            if (a >= 0x24) a = (a - 0x24) & 255;
            if (a === M[0xFF3E]) { arrived = true; break; }
          }
        }
        b = (b - 1) & 255;
      } while (b);
      if (arrived) break;
      P.missile_step({});
      P.play_sound({});
    }
    P.wipe_tail({});
    return P.draw_hit({ de: w(0xFF3D) });
  });

  // draw_hit: the burst on square E, D (things $53 to $55, from the characters at $BE3C) at its
  // place in the window, with sound 8.
  def(0xAEC2, 'draw_hit', r => {
    const de = r.de !== undefined ? r.de : (r.d << 8 | r.e);
    let a = ((de & 255) - M[0xD0C8]) & 255;
    if ((de & 255) < M[0xD0C8]) a = (a + 0x24) & 255;
    M[0xD0D5] = (a * 3) & 255;
    a = ((de >> 8) - M[0xD0C9]) & 255;
    if ((de >> 8) < M[0xD0C9]) a = (a + 0x24) & 255;
    M[0xD0D6] = (a * 3) & 255;
    setw(0xD03D, 0xBE3C);
    P.set_sound({ a: 8 });
    for (let g = 0x53; g < 0x56; g++) {
      P.draw_block_at({ a: g, b: 0 });
      P.play_sound({});
    }
    setw(0xD03D, 0xB646);
    M[0xD03C] = 0;
    return { a: 0, hl: 0xB646 };
  });

  // scroll_down, scroll_up, scroll_right, scroll_left: the missile has left the window that way;
  // the window moves seven squares (wrapping at 36), the missile to the other edge, and $FF64 says so.
  const wrapAdd = (a, n) => { a = (a + n) & 255; return a >= 0x24 ? a - 0x24 : a; };
  const wrapSub = (a, n) => (a < n ? (a - n + 0x24) & 255 : a - n);
  def(0xAF07, 'scroll_down', r => { M[0xFF3B] = 0; M[0xD0C8] = wrapAdd(M[0xD0C8], 7); M[0xFF64] = 1; return { a: 1 }; });
  def(0xAF1F, 'scroll_up', r => { M[0xFF64] = M[0xFF3B] = 0xA7; M[0xD0C8] = wrapSub(M[0xD0C8], 7); return { a: M[0xD0C8] }; });
  def(0xAF34, 'scroll_right', r => { M[0xFF3C] = 0; M[0xD0C9] = wrapAdd(M[0xD0C9], 7); M[0xFF64] = 1; return { a: 1 }; });
  def(0xAF4C, 'scroll_left', r => { M[0xFF64] = M[0xFF3C] = 0xA7; M[0xD0C9] = wrapSub(M[0xD0C9], 7); return { a: M[0xD0C9] }; });

  // the attribute address of the cell whose last pixel line is at hl
  const attrOf = hl => ((rrc(rrc(rrc((hl >> 8) & 255))) & 3) | 0x58) << 8 | (hl & 255);

  // print_char_small: character A of the font at ($5B0E) at row $5B15, column $5B16 in attribute
  // $5B17; bold (each line ored with itself a pixel right) unless bit 0 of $5B14 is set.
  def(0xAF91, 'print_char_small', r => {
    let de = (w(0xAF61 + 2 * M[0x5B15]) + M[0x5B16]) & 0xFFFF;
    let hl = (r.a * 8 + w(0x5B0E)) & 0xFFFF;
    const bold = !(M[0x5B14] & 1);
    for (let i = 0; i < 8; i++) {
      M[de] = bold ? rrc(M[hl]) | M[hl] : M[hl];
      de = (de + 0x100) & 0xFFFF; hl = (hl + 1) & 0xFFFF;
    }
    M[attrOf((de - 0x100) & 0xFFFF)] = M[0x5B17];
    return {};
  });

  // print_char_big: character A double height and bold at rows $5B15 and the one below, column $5B16:
  // the top half in attribute $5B17, the bottom in $5B18.
  def(0xAFE2, 'print_char_big', r => {
    M[0x5B19] = r.a;
    const row = M[0x5B15], col = M[0x5B16];
    const bottom = (w(0xAF61 + 2 * row + 2) + col) & 0xFFFF;
    let de = (w(0xAF61 + 2 * row) + col) & 0xFFFF;
    let hl = (r.a * 8 + w(0x5B0E)) & 0xFFFF;
    for (let half = 0; half < 2; half++) {
      for (let i = 0; i < 4; i++) {
        const v = rrc(M[hl]) | M[hl];
        M[de] = v; de = (de + 0x100) & 0xFFFF;
        M[de] = v; de = (de + 0x100) & 0xFFFF;
        hl = (hl + 1) & 0xFFFF;
      }
      if (!half) de = bottom;
    }
    const at = attrOf((de - 0x100) & 0xFFFF);
    M[at] = M[0x5B18];
    M[(at - 0x20) & 0xFFFF] = M[0x5B17];
    return {};
  });

  // line_setup: a line from square $FF3B to square $FF3D the shorter way round each axis of the
  // wrapping map: steps $FF3F (row), $FF40 (column), differences $FF43, $FF44; the longer
  // difference in $FF46 with its step alone in $FF41 or $FF42, the shorter in $FF45; the error
  // $FF47 half the longer, the length $FF48 0.
  def(0xB045, 'line_setup', r => {
    setw(0xFF3F, 0); setw(0xFF41, 0); setw(0xFF43, 0);
    const axis = (from, to, step, diff) => {
      if (M[from] === M[to]) return;
      let a = (M[from] - M[to]) & 255;
      M[step] = 0xFF;
      if (M[from] < M[to]) a = (a + 0x24) & 255;
      if (a >= 0x12) { M[step] = 1; a = (0x24 - a) & 255; }
      M[diff] = a;
    };
    axis(0xFF3C, 0xFF3E, 0xFF40, 0xFF44);
    axis(0xFF3B, 0xFF3D, 0xFF3F, 0xFF43);
    if (M[0xFF44] >= M[0xFF43]) {
      M[0xFF46] = M[0xFF44]; M[0xFF45] = M[0xFF43]; M[0xFF42] = M[0xFF40];
    } else {
      M[0xFF45] = M[0xFF44]; M[0xFF46] = M[0xFF43]; M[0xFF41] = M[0xFF3F];
    }
    M[0xFF47] = M[0xFF46] >> 1;
    M[0xFF48] = 0;
    return { a: 0 };
  });

  // wrap_coordinate: a row or column of $FF becomes 35, one of 36 becomes 0.
  const wrap = a => (a === 0xFF ? 0x23 : a === 0x24 ? 0 : a);
  def(0xB13C, 'wrap_coordinate', r => ({ a: wrap(r.a) }));

  // line_step: the point $FF3B, $FF3C one step along the line: diagonal when the error runs out (the
  // length goes up by 3), along the longer axis otherwise (by 2); wrapping on the map ($FF35 = 0).
  const step = pixels => {
    M[0xFF35] = pixels ? 1 : 0;
    const e = M[0xFF47] - M[0xFF45];
    M[0xFF47] = e & 255;
    const wr = a => (pixels ? a : wrap(a));
    if (e < 0) {
      M[0xFF47] = (M[0xFF47] + M[0xFF46]) & 255;
      M[0xFF3C] = wr((M[0xFF3C] + M[0xFF40]) & 255);
      M[0xFF3B] = wr((M[0xFF3B] + M[0xFF3F]) & 255);
      M[0xFF48] = (M[0xFF48] + 3) & 255;
    } else {
      M[0xFF3C] = wr((M[0xFF3C] + M[0xFF42]) & 255);
      M[0xFF3B] = wr((M[0xFF3B] + M[0xFF41]) & 255);
      M[0xFF48] = (M[0xFF48] + 2) & 255;
    }
    return { hl: 0xFF48 };
  };
  def(0xB0C9, 'line_step_pixels', r => step(true));
  def(0xB0D0, 'line_step', r => step(false));
};
})(typeof window !== 'undefined' ? window : globalThis);
