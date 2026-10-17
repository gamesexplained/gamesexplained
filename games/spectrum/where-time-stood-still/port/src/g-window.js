// The windows ($AA8B-$AE0F): the menus' two windows (bank 3's records at $C8A6 and $C899) and
// the conversation window ($AA7E), opening and closing a step a pass, drawn over the view into
// the screen not shown, and the menu pointer drawn over them as a sprite.
//
// A window's record is 13 bytes, copied to $AA70 to be drawn: the columns and rows shown, the
// column of the screen it starts at, the first column and row of its contents shown, the full
// size it opens to, where its contents' bytes and attributes are, and the screen's row table.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.window = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const rd = a => M[P.mem.alias(a)];
  const wr = (a, v) => { M[P.mem.alias(a)] = v; };
  const W = k => M[0xAA70 + k];
  // the attribute address of a screen address at $C000
  const attr = a => ((0xD8 + ((a >> 8) >= 0xC8) + ((a >> 8) >= 0xD0)) << 8) | (a & 255);

  // set_bank6_word ($AA8B): HL into bank 6's $F1EF, and bank 3 paged back in
  P.def(0xAA8B, 'set_bank6_word', r => { P.page_bank_6(); setw(0xF1EF, r.hl); return P.page_bank_3(); });
  // copy_window ($CAEB, bank 3): the record at HL to $AA70
  P.def(0xCAEB, 'copy_window', r => Object.assign(P.ldir(r.hl, 0xAA70, 13), { bc: 0 }));

  // windows_pass ($AA94): the conversation queue (bank 3's $D7B9), then a step of the
  // conversation window ($8D25: bit 6 opening, bit 7 closing, both counting down a wait) and of
  // the menus' windows ($8D22: 1 the first opening, 2 closing; 8 the second opening, $10
  // closing), and all of them drawn
  P.def(0xAA94, 'windows_pass', () => {
    P.next_message();
    let a = M[0x8D25] & 0xC0;
    if (a === 0xC0) {
      M[0x8D25] = (M[0x8D25] - 1) & 255;
      a = M[0x8D25] & 0x40 ? 0 : M[0x8D25];
    }
    if (a & 0x80) P.close_message_step();
    if (a & 0x40) P.open_message_step();
    const one = M[0x8D22] & 7;
    if (one) {
      if (one === 2) P.close_window_1_step();
      if (one === 1) P.open_window_1_step();
    } else {
      const two = M[0x8D22] & 0x38;
      if (two === 0x08) P.open_window_2_step();
      if (two === 0x10) P.close_window_2_step();
    }
    return P.draw_windows();
  });

  // $AB23: one step of the window at `at` opening: its width grows by up to B and its first
  // column moves left by half of that (not past 0), its height by up to 2 and its row up by one
  const grow = (at, b) => {
    let a = (M[at + 5] - M[at]) & 255;
    if (a >= b) a = b;
    const c = a, half = c >> 1;
    a = M[at + 3] - half;
    M[at + 3] = a < 0 ? 0 : a;
    M[at] = (M[at] + c) & 255;
    a = (M[at + 6] - M[at + 1]) & 255;
    if (a >= 3) a = 2;
    M[at + 1] = (a + M[at + 1]) & 255;
    a = M[at + 4] - 1;
    M[at + 4] = a < 0 ? 0 : a;
    return { b: half, c, de: at + 4, hl: at + 1 };
  };
  P.def(0xAB23, 'open_window_1_step_ab23', r => grow(r.de, r.b));
  const full = at => M[at] === M[at + 5] && M[at + 1] === M[at + 6];
  // open_message_step ($AAD9): bit 7 of $8D25 set once the conversation window is full size,
  // else a step of it opening
  P.def(0xAAD9, 'open_message_step', () => {
    if (full(0xAA7E)) { M[0x8D25] |= 0x80; return {}; }
    return grow(0xAA7E, 2);
  });
  // open_window_1_step ($AB05), open_window_2_step ($AAFA): bit 1 (or 4) of $8D22 set when it is
  // full size, and a step of it opening whatever
  const open = (at, bit) => { if (full(at)) M[0x8D22] |= bit; return grow(at, 4); };
  P.def(0xAB05, 'open_window_1_step', () => open(0xC8A6, 0x02));
  P.def(0xAAFA, 'open_window_2_step', () => open(0xC899, 0x10));

  // close_step ($AB8E): a step of the window at HL closing: what it covers drawn again
  // (redraw_behind, from its record copied to $AA70), then it narrows by B (4) and its first
  // column moves right by C (2), and its height drops by one (two above 3, its row moving down);
  // zf when it was closed already
  const close = (hl, b, c) => {
    P.copy_window({ hl });
    P.redraw_behind();
    if (!M[hl]) return { zf: true };
    const a = M[hl] - b;
    M[hl] = a < 0 ? 0 : a;
    M[hl + 3] = (M[hl + 3] + c) & 255;
    let h = (M[hl + 1] - 1) & 255;
    if (h) {
      if (h >= 3) { h--; M[hl + 4] = (M[hl + 4] + 1) & 255; }
      M[hl + 1] = h;
    }
    return { zf: false, a: 0xFF };
  };
  P.def(0xAB8E, 'close_step', r => close(r.hl, 4, 2));
  P.def(0xAB91, 'close_step_ab91', r => close(r.hl, r.b, r.c));
  // close_message_step ($AB53): $8D25 cleared once the conversation window has closed
  P.def(0xAB53, 'close_message_step', () => {
    if (close(0xAA7E, 2, 1).zf) M[0x8D25] = 0;
    return {};
  });
  // close_window_1_step ($AB65): once it has closed, $8D22's low three bits cleared, and menu 2
  // opens (bank 3's $CE57) if it was waiting to
  P.def(0xAB65, 'close_window_1_step', () => {
    if (close(0xC8A6, 4, 2).zf) {
      M[0x8D22] &= 0xF8;
      if (M[0x8D22]) P.open_menu_2();
    }
    return {};
  });
  // close_window_2_step ($AB7B): once it has closed, $8D22 is 1 and menu 1 opens ($CE77)
  P.def(0xAB7B, 'close_window_2_step', () => {
    if (close(0xC899, 4, 2).zf) { M[0x8D22] = 1; P.open_menu_1(); }
    return {};
  });

  // draw_windows ($ABBB): the menu window open or opening (the first, else the second), the
  // pointer, and the conversation window when it is up
  P.def(0xABBB, 'draw_windows', () => {
    if (M[0x8D22] & 7) P.draw_window({ hl: 0xC8A6 });
    else if (M[0x8D22] & 0x38) P.draw_window({ hl: 0xC899 });
    P.draw_pointer();
    if (!(M[0x8D25] & 0xC0)) return {};
    return P.draw_window({ hl: 0xAA7E });
  });

  // draw_window ($ABE0): the window whose record is at HL into the screen not shown: of its
  // contents (full width by 8 pixel rows a character row, from $AA77) the part its size and
  // first column and row show, row by row through the row table (21 LDIs, the JR before them
  // patched at $AC52 to leave the ones not needed; the step to the next row patched at $AC7E,
  // the screen column at $AC4F), then its attributes from $AA79 (the count patched at $ACD2)
  P.def(0xABE0, 'draw_window', r => {
    P.copy_window({ hl: r.hl });
    if (!W(0)) return { zf: true };
    setw(0xAA6C, (w(0xAA7B) + ((W(4) * 16) & 255)) & 0xFFFF);
    let src = P.multiply({ a: W(5), e: (W(4) * 8) & 255 }).hl;
    setw(0xAA6E, (src + W(3) + w(0xAA77)) & 0xFFFF);
    P.page_hidden_screen();
    M[0xAC7E] = (W(5) - W(0)) & 255;
    M[0xAC52] = ((0x15 - W(0)) * 2) & 255;
    M[0xAC4F] = (W(2) + W(3)) & 255;
    if (M[0xAC52] > 42) throw new Error('draw_window: a window ' + W(0) + ' wide');
    const n = 21 - (M[0xAC52] >> 1);
    let ix = w(0xAA6C), hl = w(0xAA6E), b = (W(1) * 8) & 255;
    do {
      let de = w(ix); ix = (ix + 2) & 0xFFFF;
      de = (de & 0xFF00) | (((de & 0xE0) | M[0xAC4F]) & 255);
      for (let i = 0; i < n; i++) { wr(de, rd(hl)); hl = (hl + 1) & 0xFFFF; de = (de + 1) & 0xFFFF; }
      P.N.wrow++; P.N.wbyte += n;
      hl = (hl + M[0xAC7E]) & 0xFFFF;
      b = (b - 1) & 255;
    } while (b);
    src = (P.multiply({ a: W(5), e: W(4) }).hl + W(3) + w(0xAA79)) & 0xFFFF;
    const tp = w(0xAA6C);
    let dst = attr((M[(tp + 1) & 0xFFFF] << 8) | (((M[tp] & 0xE0) | ((W(2) + W(3)) & 255)) & 255));
    M[0xACD2] = W(0);
    b = W(1);
    do {
      for (let i = 0, s = src, d = dst; i < M[0xACD2]; i++) { wr(d, rd(s)); s = (s + 1) & 0xFFFF; d = (d + 1) & 0xFFFF; }
      P.N.wrow++; P.N.wbyte += M[0xACD2] || 256;
      dst = (dst + 0x20) & 0xFFFF;
      src = (src + W(5)) & 0xFFFF;
      b = (b - 1) & 255;
    } while (b);
    return P.page_bank_3();
  });

  // redraw_behind ($ACEC): what the window in $AA70 covers at full size drawn again from the
  // character map at $6505 (32 by 24): each character's 8 bytes and attribute from bank 0's
  // $ED25, 9 bytes a character; $FF is the view, its attribute only, the view's colour ($AA7D).
  // Bank 0 and the screen not shown are paged in and out for every byte.
  P.def(0xACEC, 'redraw_behind', () => {
    const tp = w(0xAA7B);
    setw(0xAA6C, tp);
    const e = ((M[tp] & 0xE0) | M[0xAA72]) & 255, d = M[(tp + 1) & 0xFFFF];
    let map = ((((d >= 0xC8) + (d >= 0xD0)) << 8 | e) + 0x6505) & 0xFFFF;
    let scr = d << 8 | e;
    const bank0 = M[0x8D1E] & 0xF8;
    let screen = bank0 | 5;
    if (!(screen & 8)) screen |= 7;
    let rows = M[0xAA76];
    do {
      let mp = map, sp = scr, n = M[0xAA75];
      do {
        P.io.out(0x7FFD, bank0);
        const ch = M[mp];
        let gl;
        P.N.cell++;
        if (ch === 0xFF) { gl = 0xAA7D; P.io.out(0x7FFD, screen); }
        else {
          P.N.glyph++;
          gl = (ch * 9 + 0xED25) & 0xFFFF;
          for (let k = 0, s = sp; k < 8; k++) {
            P.io.out(0x7FFD, bank0);
            const v = rd(gl);
            P.io.out(0x7FFD, screen);
            wr(s, v);
            s = (s + 0x100) & 0xFFFF; gl = (gl + 1) & 0xFFFF;
          }
        }
        P.io.out(0x7FFD, bank0);
        const v = rd(gl);
        P.io.out(0x7FFD, screen);
        wr(attr(sp), v);
        sp = (sp + 1) & 0xFFFF; mp = (mp + 1) & 0xFFFF;
        n = (n - 1) & 255;
      } while (n);
      map = (map + 0x20) & 0xFFFF;
      scr = (scr + ((scr & 255) >= 0xE0 ? 0x720 : 0x20)) & 0xFFFF;
      rows = (rows - 1) & 255;
    } while (rows);
    return P.page_bank_3();
  });

  // draw_pointer ($AD9F): the menu pointer, when a menu is open ($8D22 with $1B at 3 or $18):
  // drawn into the screen not shown as a sprite from bank 6, set up from bank 3's $C8B3 (graphics,
  // mask, visibility mask, frame, width and rows) at $8D23 across and $8D24 down, nothing in front
  P.def(0xAD9F, 'draw_pointer', () => {
    const s = M[0x8D22];
    if (!s || ((s & 0x1B) !== 3 && (s & 0x1B) !== 0x18)) return {};
    const t = (w(0xAA7B) + ((M[0x8D24] * 2) & 255)) & 0xFFFF;
    const c = (((M[0x8D23] >> 3) & 0x1F) + M[0xAA72]) & 255;
    setw(0xA054, M[(t + 1) & 0xFFFF] << 8 | (((M[t] & 0xE0) + c) & 255));
    for (let i = 0; i < 7; i++) M[0xA056 + i] = M[0xC8B3 + i];
    const width = M[0xC8BA];
    P.patch_drawers_a5f2({ a: width, b: 0, c: width, d: 0, e: M[0xC8BB] });
    M.fill(0xFF, 0x8521, 0x8562);
    if (width === 4) P.draw_sprite_24_a07f({ a: M[0x8D23], c: 6 });
    else P.draw_sprite_16_a27d({ a: M[0x8D23], c: 6 });
    return P.page_bank_3();
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
