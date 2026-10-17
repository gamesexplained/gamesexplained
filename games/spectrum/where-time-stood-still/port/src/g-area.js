// The area loader ($87CF-$8B80): one of the plateau's sixteen areas set up in the banks when the
// party walks into it. The packed graphics into bank 1, the block numbers into bank 0's list, the
// boxes and records, the map, and then each object's boxes, records and piece of map.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.area = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const inc = a => (a + 1) & 0xFFFF;
  const neg = a => (-a) & 255;
  // LDIR's copy, n bytes from s to d; gives where both end
  const copy = (s, d, n) => { for (; n > 0; n--, s = inc(s), d = inc(d)) M[d] = M[s]; return { s, d }; };

  // load_area ($87CF): the area in $8D1F. Bank 1's table at $D000 (four bytes an area) points to
  // its packed data, unpacked into bank 1 $C000-$CFFF (a byte with bit 7 set counts the next,
  // 0 for 256; any other is itself), and gives two bytes for the operands at $90E2/$9237 and
  // $90F0/$9244. Bank 0's table at $E8A3 points to the split for $9C13 and then pairs (first
  // number, count, up to a count of $FF) whose numbers fill bank 0's list from $C801 (within its
  // page), after a 4 at $C800. Bank 7's table at $DB00 gives the boxes, records and map
  // (load_boxes), bank 6's at $C76A the objects (place_objects). An area of no objects returns
  // with bank 6 in. bc_ is the other set's BC as it enters, which load_boxes can copy by.
  P.def(0x87CF, 'load_area', r => {
    P.page_bank_1();
    let l = (M[0x8D1F] * 4) & 255;
    const at = 0xD000;
    const e = M[at | l]; l = (l + 1) & 255;
    const d = M[at | l]; l = (l + 1) & 255;
    const c = M[at | l]; l = (l + 1) & 255;
    const b = M[at | l];
    setw(0x90E2, c); M[0x9237] = c;
    setw(0x90F0, b); M[0x9244] = b;
    let src = d << 8 | e, dst = 0xC000, n = 1;
    unpack: for (;;) {
      let v = M[src];
      if (v & 0x80) { n = v & 0x7F; src = inc(src); v = M[src]; }
      do {
        M[dst] = v; dst = inc(dst);
        if ((dst >> 8) === 0xD0) break unpack;
        n = (n - 1) & 255;
      } while (n);
      n = 1; src = inc(src);
    }
    P.page_bank_0();
    let hl = w((0xE8A3 + ((M[0x8D1F] * 4) & 255)) & 0xFFFF);
    M[0x9C13] = M[hl]; hl = inc(hl);
    let de = 0xC800;
    for (;;) {
      let v = M[hl]; hl = inc(hl);
      let k = M[hl]; hl = inc(hl);
      if (k === 0xFF) break;
      do { M[de] = v; de = (de & 0xFF00) | ((de + 1) & 255); v = (v + 1) & 255; k = (k - 1) & 255; } while (k);
    }
    M[0xC800] = 4;
    M[0x962D] = 0; M[0xA6F3] = 0;
    P.page_bank_7();
    const t = 0xDB00 | ((M[0x8D1F] * 2) & 255);
    P.load_boxes({ hl: M[t] | M[(t & 0xFF00) | ((t + 1) & 255)] << 8, bc_: r.bc_ });
    P.page_bank_6();
    hl = w((0xC76A + ((M[0x8D1F] * 2) & 255)) & 0xFFFF);
    const count = M[hl];
    if (!count) return {};
    return P.place_objects({ b: count, hl: inc(hl) });
  });

  // load_boxes ($8A9B): from HL in bank 7, a count of 8-byte boxes copied to bank 4 from $C000
  // ($A6F3 the count), a count of 4-byte records copied to bank 3 from $C000 ($962D), then the
  // area's map, 2 KB into bank 0 $C000-$C7FF ($FF, a count and a byte make a run). Each box and
  // record goes through $8CFB, with a bank switch either side; the box's way back to bank 7 is an
  // OUT of the value it writes into $8AC9 first, and the map's runs switch banks with OUTs too. A
  // record's copy counts by the other set's BC, which only the boxes' copy has emptied: an area of
  // records and no boxes copies by the BC it entered with (bc_), 4 bytes when its B is 0.
  P.def(0x8A9B, 'load_boxes', r => {
    let hl = r.hl;
    M[0x8AC9] = (M[0x8D1E] & 0xF8) | 7;
    let n = M[hl]; hl = inc(hl);
    let bAlt = ((r.bc_ || 0) >> 8) & 255, de2 = 0xC000;
    if (n) {
      M[0xA6F3] = n;
      do {
        hl = copy(hl, 0x8CFB, 8).s;
        P.page_bank_4();
        de2 = copy(0x8CFB, de2, 8).d; bAlt = 0;
        P.io.out(0x7FFD, M[0x8AC9]);
        n = (n - 1) & 255;
      } while (n);
    }
    n = M[hl]; hl = inc(hl);
    if (n) {
      M[0x962D] = n;
      de2 = 0xC000;
      do {
        hl = copy(hl, 0x8CFB, 4).s;
        P.page_bank_3();
        de2 = copy(0x8CFB, de2, (bAlt << 8 | 4) || 0x10000).d; bAlt = 0;
        P.page_bank_7();
        n = (n - 1) & 255;
      } while (n);
    }
    const bank0 = M[0x8D1E] & 0xF8, bank7 = bank0 | 7;
    let de = 0xC000, b = 1;
    for (;;) {
      P.io.out(0x7FFD, bank7);
      let v = M[hl];
      if (v === 0xFF) { hl = inc(hl); b = M[hl]; hl = inc(hl); v = M[hl]; }
      P.io.out(0x7FFD, bank0);
      do {
        M[de] = v; de = inc(de);
        if ((de >> 8) === 0xC8) return {};
        b = (b - 1) & 255;
      } while (b);
      b = 1; hl = inc(hl);
    }
  });

  // place_objects ($8879): the objects from HL in bank 6, B of them. Each is its column and row
  // in blocks, a height when the next byte has bit 7 set, and its type. Its place is kept in
  // $8CF6-$8CFA: the column and row, then where it stands on the screen's two diagonals (the
  // column twice and the row four times, less the height) and its height. Its type's shape list
  // (bank 6's table at $D482) gives a count of shapes, each a box at bank 6 $DDD4 that is moved
  // to the object's place and added to bank 4's list; then a count of records at $DF24, added to
  // bank 3's list the same way; then its piece of map (stamp_piece), which goes on to the next
  // object.
  P.def(0x8879, 'place_objects', r => {
    let objects = r.b, hl = r.hl;
    for (;;) {
      const col = M[hl]; M[0x8CF6] = col; const c2 = (col * 2) & 255; hl = inc(hl);
      const row = M[hl]; M[0x8CF7] = row; const r4 = (row * 4) & 255; hl = inc(hl);
      const h = M[hl], tall = h & 0x80;
      let a = (r4 + c2) & 255;
      if (tall) a = (a + (h & 0x7F)) & 255;
      M[0x8CF8] = neg(a);
      a = tall ? ((h & 0x7F) + r4) & 255 : r4;
      M[0x8CF9] = (neg(a) + c2 + 0x80) & 255;
      M[0x8CFA] = tall ? h & 0x7F : 0;
      if (tall) hl = inc(hl);
      const typeAt = hl;
      let s = w((0xD482 + 2 * M[hl]) & 0xFFFF);
      let n = M[s]; s = inc(s);
      for (; n; n = (n - 1) & 255, s = inc(s)) {
        let b = ((M[s] * 8) + 0xDDD4) & 0xFFFF;
        const dest = (((M[0xA6F3] * 2) & 255) * 4 + 0xC000) & 0xFFFF;
        M[0x8CFB] = M[b]; b = inc(b);
        let c = (M[0x8CF6] * 4) & 255;
        M[0x8CFC] = (c + M[b]) & 255; b = inc(b);
        const sum = c + M[b]; M[0x8CFD] = sum > 255 ? 0xFF : sum; b = inc(b);
        c = (M[0x8CF7] * 4) & 255;
        M[0x8CFE] = (c + M[b]) & 255; b = inc(b);
        M[0x8CFF] = (M[b] + c) & 255; b = inc(b);
        M[0x8D00] = (M[0x8CF8] + M[b]) & 255; b = inc(b);
        M[0x8D01] = (M[0x8CF9] + M[b]) & 255; b = inc(b);
        M[0x8D02] = (((M[0x8CFA] * 2) & 255) + M[b]) & 255;
        M[0xA6F3] = (M[0xA6F3] + 1) & 255;
        P.page_bank_4();
        copy(0x8CFB, dest, 8);
        P.page_bank_6();
      }
      n = M[s]; s = inc(s);
      for (; n; n = (n - 1) & 255, s = inc(s)) {
        let b = (0xDF24 + ((M[s] * 4) & 255)) & 0xFFFF;
        let c = M[0x8CF8];
        M[0x8CFB] = (c + M[b]) & 255; b = inc(b);
        M[0x8CFC] = (c + M[b]) & 255; b = inc(b);
        c = M[0x8CF9];
        M[0x8CFD] = (c + M[b]) & 255; b = inc(b);
        M[0x8CFE] = (c + M[b]) & 255;
        const dest = ((((M[0x962D] * 2) & 255) * 2) + 0xC000) & 0xFFFF;
        P.page_bank_3();
        copy(0x8CFB, dest, 4);
        P.page_bank_6();
        M[0x962D] = (M[0x962D] + 1) & 255;
      }
      stampPiece(s, col, row);
      hl = inc(typeAt);
      objects = (objects - 1) & 255;
      if (!objects) return P.page_bank_0();
    }
  });

  // stamp_piece ($899B): the object's piece of map from hl in bank 6: the area whose numbers it
  // is drawn in, its width and its height in blocks, then its blocks row by row. Stamped into bank
  // 0's map at the object's column and row, clipped to 64 columns and 32 rows; blocks of 0 are
  // left out. A piece of another area's numbers has each block turned into this area's
  // (translate_cell), for which the CALL at $8A63 is made a CALL ($CD) and that area's lists are
  // written into its operands; for this area's own it is a CALL Z ($CC), which never runs. The
  // clipped width, height and the source's skip at a row's end are kept in operands too: $8A58,
  // $8A54 and $8A86.
  function stampPiece(hl, col, row) {
    const area = M[hl]; hl = inc(hl);
    let e = M[hl]; hl = inc(hl);
    let d = M[hl];
    let op = 0xCC;
    if (M[0x8D1F] !== area) {
      P.page_bank_0();
      let t = (0xE8A3 + ((area * 4) & 255)) & 0xFFFF;
      const list = w(t); t = inc(t);
      M[0x8B38] = (M[list] + 1) & 255;
      setw(0x8B33, inc(list));
      t = inc(t);
      M[0x8B3E] = M[t]; t = inc(t); M[0x8B3F] = M[t];
      op = 0xCD;
      P.page_bank_6();
    }
    M[0x8A63] = op;
    let c = col, b = row;
    if (c >= 0x80) { c = neg(c); e = (e - c) & 255; }
    else if (((c + e) & 255) >= 0x40) { e = (0x40 - c) & 255; c = 0; }
    else c = 0;
    if (b >= 0x80) { b = neg(b); d = (d - b) & 255; }
    else if (((b + d) & 255) >= 0x20) { d = (0x20 - b) & 255; b = 0; }
    else b = 0;
    M[0x8A54] = d; M[0x8A58] = e;
    hl = (hl - 1) & 0xFFFF;
    M[0x8A86] = (M[hl] - e) & 255;
    let a = 0;
    if (b) { const wd = M[hl]; for (let k = b; k > 0; k--) a = (a + wd) & 255; }
    else a = b;
    a = (a + c) & 255;
    let src = (hl + 2 + a) & 0xFFFF;
    const y = row >= 0x80 ? 0 : row, x = col >= 0x80 ? 0 : col;
    let dst = ((((y << 6) & 0xFF00) | (((y << 6) & 255) + x) & 255) + 0xC000) & 0xFFFF;
    let rows = M[0x8A54];
    do {
      let s = src, dd = dst;
      let cols = M[0x8A58];
      do {
        let v = M[s];
        if (v) {
          P.page_bank_0();
          if (M[0x8A63] === 0xCD) v = translate(v);
          M[dd] = v;
          P.page_bank_6();
        }
        dd = inc(dd); s = inc(s);
        cols = (cols - 1) & 255;
      } while (cols);
      src = s;
      if (((dst + 0x40) & 0xFFFF) >= 0xC800) return;
      dst = (dst + 0x40) & 0xFFFF;
      src = (src + M[0x8A86]) & 0xFFFF;
      rows = (rows - 1) & 255;
    } while (rows);
  }
  P.def(0x899B, 'stamp_piece', () => { throw new Error('stamp_piece is entered only from place_objects'); });

  // translate_cell ($8B31): block A of another area turned into this area's. Its place in that
  // area's numbers (the pairs at the operand $8B33, or at $8B3E for a block over its split, the
  // operand $8B38 less one) gives a number; this area's list at bank 0 $C800 is searched for it,
  // from the start or from this area's split ($9C13), and its place there is the block. A number
  // not found is 0.
  const translate = a => {
    let hl = w(0x8B33), half = 0;
    if (a >= M[0x8B38]) { a = (a - M[0x8B38]) & 255; hl = w(0x8B3E); half = 1; }
    const want = a;
    let sum = 0;
    hl = (hl - 1) & 0xFFFF;
    do { hl = (hl + 2) & 0xFFFF; sum = (sum + M[hl]) & 255; } while (sum < want);
    let e;
    sum = (sum - want) & 255;
    if (!sum) e = M[inc(hl)];
    else e = (neg(sum) + M[hl] + M[(hl - 1) & 0xFFFF]) & 255;
    let l = half ? M[0x9C13] : 0;
    while (M[0xC800 | l] !== e) { l = (l + 1) & 255; if (!l) break; }
    return l;
  };
  P.def(0x8B31, 'translate_cell', r => ({ a: translate(r.a) }));

  // restore_screen_x ($8B6F): 4 added back to +$14/+$15 of the record at IY when the view is at
  // a half character
  P.def(0x8B6F, 'restore_screen_x', r => {
    if (!M[0x9631]) return {};
    const a = (r.iy + 0x14) & 0xFFFF, v = M[a] + 4;
    M[a] = v & 255;
    if (v > 255) M[inc(a)] = (M[inc(a)] + 1) & 255;
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
