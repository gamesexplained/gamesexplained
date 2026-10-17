// The status panel ($F2AB-$F5DC) and the shimmer ($F5DD-$F6FF, $6903): the panel's portrait,
// digits, bars, light and calendar kept in the cell map at $6505 and drawn again from it into the
// screen not shown; and the three rectangles of the view that shimmer, lit cell by cell from a
// pattern turned a row each pass. Both run with bank 0 paged in.
//
// $F2A1-$F2AA is the panel as drawn (the bars' lengths, the five digits, the leader whose portrait
// it shows and the passes since it changed); $8D18 and $8D19 count the passes since the digits and
// the bars changed, to 2, so that each part is drawn on both screens. The clock (in the interrupt)
// sets $BF29 to 4 at midnight and $BF2F to 4 at dawn and dusk.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.panel = function (P) {
  const M = P.M, w = P.w, setw = P.setw, ldir = P.ldir;
  const upTo = (a, n) => { if (M[a] !== n) M[a] = (M[a] + 1) & 255; };
  // the panel's routines and the shimmer's checks are bank 0's, above $C000
  const def0 = (a, name, f) => P.def(a, name, f, false);

  // panel_pass ($F2AB): each part brought up to date, then each part changed lately drawn again
  def0(0xF2AB, 'panel_pass', () => {
    P.panel_portrait({});
    P.panel_digits({});
    P.panel_bars({});
    P.panel_light({});
    if (!P.panel_calendar({}).zf) P.panel_redraw({ de: 0x0404, a: 0x17 });
    if (M[0x8D19] !== 2) P.panel_redraw({ de: 0x0308, a: 0x05 });
    if (M[0x8D18] !== 2) P.panel_redraw({ de: 0x0206, a: 0x10 });
    if (M[0xF2AA] !== 3) return P.panel_redraw({ de: 0x0303, a: 0x01 });
    return {};
  });
  // panel_portrait ($F2EA): a new leader's portrait, 3 by 3 cells from $65 plus nine times his
  // number, into the cell map at $6786
  def0(0xF2EA, 'panel_portrait', () => {
    const a = M[0x8D0A];
    if (a === M[0xF2A9]) { upTo(0xF2AA, 3); return {}; }
    M[0xF2A9] = a; M[0xF2AA] = 0;
    let hl = 0x6786, v = (a * 9 + 0x65) & 255;
    for (let b = 3; b > 0; b--) {
      for (let k = 0; k < 3; k++) M[hl + k] = (v + k) & 255;
      v = (v + 3) & 255; hl += 0x20;
    }
    return {};
  });
  // panel_redraw ($F319): D rows of E cells at column A drawn again from the cell map, from the row
  // whose entry in the row table is $8E8D ($F31C: HL's); bank 0 paged back in
  const redraw = (hl, de, a) => {
    setw(0xAA7B, hl); setw(0xAA75, de); M[0xAA72] = a;
    P.redraw_behind({});
    return P.page_bank_0();
  };
  def0(0xF319, 'panel_redraw', r => redraw(0x8E8D, r.de, r.a));
  def0(0xF31C, 'panel_redraw_f31c', r => redraw(r.hl, r.de, r.a));
  // panel_digits ($F32D): new digits from $8D04 into the cell map at $6795, two cells high, a gap
  // after the third
  def0(0xF32D, 'panel_digits', () => {
    let k = 0;
    while (k < 5 && M[0x8D04 + k] === M[0xF2A4 + k]) k++;
    if (k === 5) { upTo(0x8D18, 2); return {}; }
    M[0x8D18] = 0;
    ldir(0x8D04, 0xF2A4, 5);
    let de = 0x6795;
    for (let b = 5, hl = 0xF2A4; b > 0; b--, hl++) {
      const a = (M[hl] * 2 + 0x42) & 255;
      M[de] = a; M[de + 0x20] = (a + 1) & 255;
      de += b === 3 ? 2 : 1;
    }
    return {};
  });
  // panel_light ($F37C): while $BF2F counts down, the light's pictures (between, then day or
  // night by the view's colour) into the cell map at $67C0, and that part drawn again
  def0(0xF37C, 'panel_light', () => {
    let a = P.irqByte(0xBF2F);
    if (!a) return {};
    a = (a - 1) & 255; M[0xBF2F] = a;
    if (a !== 1) {
      let hl = 0xF5D4, de = 0x67C0;
      if (a !== 3) hl = (P.irqByte(0xBF2E) & 0x3F) === 7 ? 0xF5C2 : 0xF5CB;
      for (let b = 3; b > 0; b--) { ldir(hl, de, 3); hl += 3; de += 0x20; }
    }
    return P.panel_redraw_f31c({ hl: 0x8E9D, de: 0x0303, a: 0x1B });
  });
  // panel_bars ($F3C2): each bar the product of a pair of the leader's needs over 1024, grown or
  // shrunk a pixel towards it
  def0(0xF3C2, 'panel_bars', () => {
    P.copy_needs({});
    let de = 0x8CFB, hl = 0xF2A1, c = 0;
    for (let b = 0; b < 3; b++, de += 2, hl++) {
      const a = (P.multiply({ a: M[de], e: M[de + 1] }).hl >> 10) & 0x3F;
      if (a < M[hl]) c = P.bar_shrink({ hl, b }).c;
      else if (a > M[hl]) c = P.bar_grow({ hl, b }).c;
    }
    if (c === 0xFF) M[0x8D19] = 0;
    else upTo(0x8D19, 2);
    return {};
  });
  // bar_shrink ($F403), bar_grow ($F420): bar B a pixel shorter or longer, its end cell's tile
  // rewritten, the end moved a cell when the tile empties or fills
  def0(0xF403, 'bar_shrink', r => {
    M[r.hl] = (M[r.hl] - 1) & 255;
    const e = P.bar_end({ a: r.b });
    let a = M[e.de];
    if (a) a = (a << 1) & 255;
    else { M[e.hl] = 0; M[(e.hl - 1) & 0xFFFF] = e.c; a = 0xFE; }
    for (let k = 0; k < 7; k++) M[e.de + k] = a;
    return { c: 0xFF };
  });
  def0(0xF420, 'bar_grow', r => {
    M[r.hl] = (M[r.hl] + 1) & 255;
    const e = P.bar_end({ a: r.b });
    let a = M[e.de];
    if (a !== 0xFF) a = (a >> 1) | 0x80;
    else { M[e.hl] = (M[e.hl] - 1) & 255; M[e.hl + 1] = e.c; a = 0x80; }
    for (let k = 0; k < 7; k++) M[e.de + k] = a;
    return { c: 0xFF };
  });
  // bar_end ($F43C): bar A's end in its row of the cell map (the first of the next eight cells
  // holding its end cell C) and that cell's tile
  def0(0xF43C, 'bar_end', r => {
    let [hl, de, c] = r.a === 0 ? [0x6789, 0xEDEB, 0x16] : r.a === 1 ? [0x67A9, 0xEE06, 0x19] : [0x67C9, 0xEE21, 0x1C];
    for (let b = 8; b > 0; b--) { hl++; if (M[hl] === c) return { hl, de, c, b, zf: true }; }
    return { hl, de, c, b: 0, zf: false };
  });
  // panel_calendar ($F465): after midnight, the page turned a picture a pass; on the first the day
  // goes up (and the month after its last day), and later passes put back the cells it covered
  def0(0xF465, 'panel_calendar', () => {
    let a = P.irqByte(0xBF29);
    if (a === 0xFF) return { zf: true };
    P.calendar_picture({ a });
    a = (a - 1) & 255; M[0xBF29] = a;
    const hl = w(0xF463);
    if (a === 1) { setw(0x67FD, hl); ldir(0xED52, 0xED2E, 0x24); }
    else if (a === 2) setw(0x67DD, hl);
    else if (a !== 0 && a !== 0xFF) {
      const cells = w(0x679D);
      setw(0xF463, cells); setw(0x67BD, cells);
      // on the 31st A is the month, $20 when it is month 1 (the game compares it with $20 either way)
      let day = M[0x8D14] = (M[0x8D14] + 1) & 255;
      if (day === 0x1F) day = M[0x8D15] === 1 ? 0x20 : M[0x8D15];
      if (day === 0x20) {
        M[0x8D14] = 1;
        const m = M[0x8D15] = (M[0x8D15] + 1) & 3;
        setw(0x679D, w(0xF57E + 2 * m));
      }
      P.calendar_day({});
    }
    return { zf: false };
  });
  // calendar_day ($F4DC): the day of the month into tiles 5 to 8 ($ED52): two digits side by side,
  // or one split across both columns, a nibble each
  def0(0xF4DC, 'calendar_day', () => {
    let a = M[0x8D14], b = 0;
    while (a >= 10) { a -= 10; b++; }
    b &= 255;
    if (b) {
      P.calendar_digit({ a: b, hl: 0xED52 });
      return P.calendar_digit({ a, hl: 0xED64 });
    }
    let de = (0xEF77 + ((a * 18) & 255)) & 0xFFFF, hl = 0xED52;
    for (let col = 0; col < 2; col++) {
      for (let k = 0; k < 8; k++) {
        const v = M[de];
        M[hl] = v >> 4; M[hl + 0x12] = (v << 4) & 255;
        hl++; de = (de + 1) & 0xFFFF;
      }
      hl++; de = (de + 1) & 0xFFFF;
    }
    return {};
  });
  // calendar_digit ($F53E): digit A's two tiles from $EF77, pixels only, into the tiles at HL
  def0(0xF53E, 'calendar_digit', r => {
    const s = (0xEF77 + ((r.a * 18) & 255)) & 0xFFFF;
    const o = ldir(s, r.hl, 8);
    ldir((o.hl + 1) & 0xFFFF, (o.de + 1) & 0xFFFF, 8);
    return {};
  });
  // calendar_picture ($F559): picture A of the page turning, 4 by 3 cells from $F586, into the cell
  // map at $67BC
  def0(0xF559, 'calendar_picture', r => {
    let hl = (0xF586 + ((r.a * 12) & 255)) & 0xFFFF, de = 0x67BC;
    for (let k = 0; k < 3; k++) { ldir(hl, de, 4); hl += 4; de += 0x20; }
    return {};
  });

  // --- the shimmer ---
  // shimmer_check ($F5DD): in an area with a shimmering rectangle ($F706: area, last and first
  // column, last and first row, pattern) that lies inside the view, its mask unpacked into $8521
  // (a byte under $80 a count of bytes that follow, $80 plus a count a run of the next byte, $FF
  // the end), the view coloured and the rectangle lit ($F659); with an edge on the view's edge the
  // view is only coloured
  def0(0xF5DD, 'shimmer_check', () => {
    let p = 0xF706, k = 0;
    while (k < 3 && M[p] !== M[0x8D1F]) { p += 6; k++; }
    if (k === 3) return {};
    const vx = M[0x9633], vy = M[0x9634];
    if (M[p + 1] < vx) return {};
    if (M[p + 1] === vx) return P.colour_view({});
    const c = M[p + 1] - vx, right = (vx + 0x1C) & 255;
    if (M[p + 2] === right) return P.colour_view({});
    if (M[p + 2] > right) return {};
    if (M[p + 3] < vy) return {};
    if (M[p + 3] === vy) return P.colour_view({});
    const e = M[p + 3] - vy, bottom = (vy + 0x12) & 255;
    if (M[p + 4] === bottom) return P.colour_view({});
    if (M[p + 4] > bottom) return {};
    const n = M[p + 5];
    let hl = n === 0 ? 0xF783 : n === 1 ? 0xF760 : 0xF718, de = 0x8521, a;
    do {
      a = M[hl]; hl = (hl + 1) & 0xFFFF;
      if (a >= 0x80) {
        let b = a & 0x7F;
        do { M[de] = M[hl]; de = (de & 0xFF00) | ((de + 1) & 255); b = (b - 1) & 255; } while (b);
        hl = (hl + 1) & 0xFFFF;
      } else ({ hl, de } = ldir(hl, de, a));
    } while (M[hl] !== 0xFF);
    M[0xA6F2] = 0xFF;
    P.colour_view({});
    P.page_bank_0();
    return P.shimmer_clip({ bc_: c, de_: e });
  });
  // shimmer_clip ($F659): the rectangle (C columns and E rows from the view's corner, at their
  // other side) clipped to the view: where it starts in the attributes of the screen not shown
  // and in the mask, its width and rows ($F702, $F703) and its first bit ($F701); then lit ($6903)
  // with bank 7 paged in
  def0(0xF659, 'shimmer_clip', r => {
    let c = r.bc_ & 255, e = r.de_ & 255, b, d, h, l;
    if (c >= 0x18) {
      l = c - 0x18; c = 0;
      const a = (0x1C - l) & 255;
      b = a <= 0x18 ? a : 0x18;
    } else { b = c + 1; l = 0; c = 0x18 - c; }
    if (e >= 0x1C) {
      h = e - 0x1C; e = 0;
      const a = (0x12 - h) & 255;
      d = a < 0x13 ? a : 0x12;
    } else { d = e < 0x13 ? e : 0x12; e = 0x1C - e; h = 0; }
    M[0xF702] = b; M[0xF703] = d;
    const off = ((h << 5) & 0xFF00) | (((h << 5) + l) & 255);
    const at = (off + (M[0x8D1E] & 8 ? 0x5822 : 0xD822)) & 0xFFFF;
    const colour = M[0xAA7D];
    const row = ((3 * e) + ((c >> 3) & 0x1F)) & 255;
    const bit = 0x80 >> (c & 7);
    M[0xF701] = bit;
    const size = w(0xF702);
    P.page_bank_7();
    return P.shimmer({ a: bit, de: 0x695D + row, hl: 0x8521 + row, hl_: at, de_: size, bc_: (colour | 0x40) << 8 | colour });
  });
  // shimmer ($6903): the rectangle's cells in the attributes at HL' given the view's colour with
  // BRIGHT where the pattern at DE and the mask at HL both have the cell's bit, the view's colour
  // where not; then the pattern turned a row ($695D, 29 rows of three bytes)
  P.def(0x6903, 'shimmer', r => {
    M[0x691B] = r.a; M[0x6919] = r.de_ >> 8; M[0x6923] = r.de_ & 255;
    M[0x7006] = 0x0E;
    const lit = r.bc_ >> 8, plain = r.bc_ & 255;
    let de = r.de, hl = r.hl, at = r.hl_, rows = M[0x6919];
    do {
      let c = M[0x691B], n = M[0x6923], d = de, h = hl, t = at;
      do {
        M[t] = M[d] & M[h] & c ? lit : plain;
        t = (t & 0xFF00) | ((t + 1) & 255);
        const cy = c & 1;
        c = (c >> 1) | (cy << 7);
        if (cy) { d = (d + 1) & 0xFFFF; h = (h + 1) & 0xFFFF; }
        n = (n - 1) & 255;
      } while (n);
      at = (at + 0x20) & 0xFFFF; de = (de + 3) & 0xFFFF; hl = (hl + 3) & 0xFFFF;
      rows = (rows - 1) & 255;
    } while (rows);
    for (let s = 0x69B0, t = 0x69B3; s >= 0x695D; s--, t--) M[t] = M[s];
    ldir(0x69B1, 0x695D, 3);
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
