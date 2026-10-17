// The panel's drawing ($7CC7-$803C, $858B-$865F): the packed 2-bit pictures (the panel's meters,
// keys, status words, the font's cells), drawn through a table of row pointers at any pixel pair
// of a byte, plain, edge-masked or with colour 0 as transparent; a rectangle of the view buffer
// copied into the bitmap's cells; the linear buffer cleared; and a line of text, its characters
// widened from the 4x8 font at $231A into 2-bit cells and drawn one by one with the same blitter.
//
// The blitter keeps its working state in its own bytes ($7CED-$7CF5) and its destination in its
// instructions' operands, which it writes for each row: the port writes them too, at the game's
// addresses. Its shifts are written as the 6502's (lsr, ror, through the carry), since what one
// pass leaves in $82 and $83 is a later reader's.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.blit = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const op = a => M[a] | M[a + 1] << 8;
  // the row's destination in the operands of the instructions that read or write it
  const operands = (lo, hi, list) => { for (const a of list) { M[a] = lo; M[a + 1] = hi; } };

  // CLEAR_LINEAR_30BYTE_ROWS: X rows of 30 bytes zeroed from ($7A), which is $10A0's pointer and
  // X 120 when the carry is clear; with it set the caller's ($7A) and X stand.
  P.CLEAR_LINEAR_30BYTE_ROWS = function (r) {
    let x = r.x, c = r.c;
    if (!c) { M[0x7A] = M[0x10A0]; M[0x7B] = M[0x10A1]; x = 0x78; }
    do {
      const p = ptr(0x7A);
      for (let y = 0x1D; y >= 0; y--) M[(p + y) & 0xFFFF] = 0;
      const s = M[0x7A] + 0x1E; M[0x7A] = s & 255; c = s >> 8;
      if (c) M[0x7B] = (M[0x7B] + 1) & 255;
      x = (x - 1) & 255;
    } while (x);
    return { a: M[0x7A], x, y: 0xFF, c };
  };

  // BLIT_PACKED_2BPP_GRAPHIC: picture A (bit 7: colour 0 shows what is under it; bits 0-6: its
  // frame) of the family at ($7A), at pixel pair X across, down the rows whose addresses the table
  // at ($7C) gives, a byte every $1C74 (8 in the bitmap's cells, 1 in a buffer). The family's
  // header is the width in bytes, the rows, the last byte's mask and a frame's size. It keeps
  // ($7A) and the caller's flags (PHP ... PLP).
  P.BLIT_PACKED_2BPP_GRAPHIC = function (r) {
    M[0x7CED] = r.a;
    const save7A = M[0x7A], save7B = M[0x7B];
    M[0x7CF0] = r.x;
    M[0x7CEF] = 0;
    const hdr = ptr(0x7A);
    M[0x7CF1] = M[hdr]; M[0x7CF2] = M[(hdr + 1) & 0xFFFF]; M[0x7CF3] = M[(hdr + 2) & 0xFFFF];
    M[0x82] = M[(hdr + 3) & 0xFFFF]; M[0x83] = M[(hdr + 4) & 0xFFFF];
    setp(0x7A, hdr + 5);
    let x = r.x, y = 5, a, c;
    const frame = M[0x7CED] & 0x7F;
    if (frame) { for (x = frame; x; x--) setp(0x7A, ptr(0x7A) + (M[0x82] | M[0x83] << 8)); }
    const src = () => ptr(0x7A);
    const S = i => M[(src() + i) & 0xFFFF];
    // the row's first byte across: X's byte, times 8 in the bitmap's cells
    const across = v => { let b = (v << 1) & 255; if (M[0x1C74] !== 8) b >>= 3; return b; };
    // the row's address from the table, the operands written: returns the next table index
    const row = (base, ty, list) => {
      const t = ptr(0x7C), s = base + M[(t + ty) & 0xFFFF];
      const lo = s & 255, hi = (M[(t + ((ty + 1) & 255)) & 0xFFFF] + (s >> 8)) & 255;
      operands(lo, hi, list);
      return (ty + 2) & 255;
    };
    if ((M[0x7CF0] & 3) === 0 && !(M[0x7CED] & 0x80)) {
      // whole bytes: copied, the row's last one through the mask
      const base = across(M[0x7CF0]);
      let ty = 0;
      do {
        ty = row(base, ty, [0x7D92, 0x7DAD, 0x7DB2]);
        x = 0;
        const width = M[0x7CF1];
        y = M[0x7CEF];
        M[0x7CF1] = (M[0x7CF1] - 1) & 255;
        while (M[0x7CF1]) {
          M[(op(0x7D92) + x) & 0xFFFF] = S(y);
          y = (y + 1) & 255; x = (x + M[0x1C74]) & 255;
          M[0x7CF1] = (M[0x7CF1] - 1) & 255;
        }
        M[0x82] = M[0x7CF3] & S(y);
        M[(op(0x7DB2) + x) & 0xFFFF] = (M[0x7CF3] ^ 0xFF) & M[(op(0x7DAD) + x) & 0xFFFF] | M[0x82];
        y = (y + 1) & 255; M[0x7CEF] = y;
        M[0x7CF1] = width;
        M[0x7CF2] = (M[0x7CF2] - 1) & 255;
      } while (M[0x7CF2]);
      y = ty;
    } else {
      // shifted by 2, 4 or 6 bits (or not at all, transparent): each byte straddles two
      M[0x7CF4] = (M[0x7CF0] & 3) << 1;
      const base = across(M[0x7CF0] & 0xFC);
      const sh = M[0x7CF4];
      let ty = 0;
      // lsr of a byte of memory and ror of A through the carry, as the shift loops are written
      const lsrM = adr => { c = M[adr] & 1; M[adr] >>= 1; };
      const rorM = adr => { const o = M[adr] & 1; M[adr] = M[adr] >> 1 | c << 7; c = o; };
      const rorA = () => { const o = a & 1; a = a >> 1 | c << 7; c = o; };
      const lsrA = () => { c = a & 1; a >>= 1; };
      if (!(M[0x7CED] & 0x80)) {
        do {
          ty = row(base, ty, [0x7E39, 0x7E3E, 0x7E66, 0x7E9A, 0x7E9F, 0x7EBF, 0x7ED9]);
          const width = M[0x7CF1];
          y = M[0x7CEF];
          x = sh;
          M[0x82] = S(y); a = 0xC0;
          do { lsrM(0x82); c = 1; rorA(); x--; } while (x);
          a = (a << 2) & 255;
          M[op(0x7E3E)] = a & M[op(0x7E39)] | M[0x82];
          M[0x7CEE] = M[0x1C74];
          M[0x7CF1] = (M[0x7CF1] - 1) & 255;
          if (M[0x7CF1]) {
            M[0x7CF1] = (M[0x7CF1] - 1) & 255;
            while (M[0x7CF1]) {
              M[0x82] = S(y); y = (y + 1) & 255; a = S(y);
              for (x = sh; x; x--) { lsrM(0x82); rorA(); }
              x = M[0x7CEE];
              M[(op(0x7E66) + x) & 0xFFFF] = a;
              M[0x7CEE] = (x + M[0x1C74]) & 255;
              M[0x7CF1] = (M[0x7CF1] - 1) & 255;
            }
            M[0x82] = S(y); y = (y + 1) & 255;
            a = M[0x7CF3] & S(y);
            for (x = sh; x; x--) { lsrM(0x82); rorA(); }
            M[0x82] = a;
            a = M[0x7CF3] ^ 0xFF;
            for (x = sh; x; x--) lsrA();
            x = M[0x7CEE];
            M[(op(0x7E9F) + x) & 0xFFFF] = a & M[(op(0x7E9A) + x) & 0xFFFF] | M[0x82];
            M[0x7CEE] = (x + M[0x1C74]) & 255;
          }
          // the bits pushed past the row's last byte, into the next
          M[0x82] = M[0x7CF3]; a = 0;
          for (x = sh; x; x--) { lsrM(0x82); rorA(); }
          a ^= 0xFF;
          x = M[0x7CEE];
          M[0x82] = a & M[(op(0x7EBF) + x) & 0xFFFF];
          M[0x83] = S(y); y = (y + 1) & 255; a = 0;
          for (x = sh; x; x--) { lsrM(0x83); rorA(); }
          x = M[0x7CEE];
          M[(op(0x7ED9) + x) & 0xFFFF] = a | M[0x82];
          M[0x7CEF] = y;
          M[0x7CF1] = width;
          M[0x7CF2] = (M[0x7CF2] - 1) & 255;
        } while (M[0x7CF2]);
      } else {
        // colour 0 transparent: each byte's mask of its zero pixel pairs, shifted with it
        do {
          ty = row(base, ty, [0x7F85, 0x7FC5, 0x7FCA, 0x7F7F]);
          const width = M[0x7CF1];
          y = M[0x7CEF];
          M[0x82] = 0xFF;
          M[0x7CEE] = 0; M[0x7CF5] = 0;
          do {
            const b = S(y);
            x = 0;
            if (!(b & 0xC0)) x = 0xC0;
            if (!(b & 0x30)) x |= 0x30;
            if (!(b & 0x0C)) x |= 0x0C;
            if (!(b & 0x03)) x |= 0x03;
            M[0x83] = x;
            a = M[0x82]; M[0x82] = M[0x83];
            for (x = sh; x; x--) { lsrA(); rorM(0x83); }
            x = M[0x7CF5];
            M[0x7CF5] = S(y);
            a = x;
            for (x = sh; x; x--) { lsrA(); rorM(0x7CF5); }
            a = M[0x83];
            x = M[0x7CEE];
            M[(op(0x7F85) + x) & 0xFFFF] = a & M[(op(0x7F7F) + x) & 0xFFFF] | M[0x7CF5];
            M[0x7CF5] = S(y);
            y = (y + 1) & 255;
            M[0x7CEE] = (x + M[0x1C74]) & 255;
            M[0x7CF1] = (M[0x7CF1] - 1) & 255;
          } while (M[0x7CF1]);
          a = 0xFF;
          for (x = sh; x; x--) { lsrM(0x82); rorA(); }
          M[0x82] = a;
          M[0x83] = 0;
          a = S((y - 1) & 255);
          M[0x7CEF] = y;
          for (x = sh; x; x--) { lsrA(); rorM(0x83); }
          x = M[0x7CEE];
          M[(op(0x7FCA) + x) & 0xFFFF] = M[0x82] & M[(op(0x7FC5) + x) & 0xFFFF] | M[0x83];
          M[0x7CF1] = width;
          M[0x7CF2] = (M[0x7CF2] - 1) & 255;
        } while (M[0x7CF2]);
      }
      y = ty;
    }
    M[0x7B] = save7B; M[0x7A] = save7A;
    return { a: save7A, x, y, c: r.c };
  };

  // COPY_BITMAP_RECTANGLE_FROM_ROW_POINTERS: Y rows of X bytes, the rows from the table at ($7C)
  // (A bytes in), into the bitmap's cells from the table at ($7A) (A cells in), a byte to a cell's
  // line, so each row is a cell's line across; the operands at $8021 and $8024 are its pointers.
  P.COPY_BITMAP_RECTANGLE_FROM_ROW_POINTERS = function (r) {
    M[0x7FE3] = r.a; M[0x7FE4] = r.x; M[0x7FE5] = r.y;
    let ty = 0, x, y, c = 0, a;
    const width = r.x;
    do {
      const t = ptr(0x7C), d = ptr(0x7A);
      let s = M[(t + ty) & 0xFFFF] + M[0x7FE3];
      M[0x8021] = s & 255; M[0x8022] = (M[(t + ((ty + 1) & 255)) & 0xFFFF] + (s >> 8)) & 255;
      s = ((M[0x7FE3] << 3) & 255) + M[(d + ty) & 0xFFFF];
      M[0x8024] = s & 255; M[0x8025] = (M[(d + ((ty + 1) & 255)) & 0xFFFF] + (s >> 8)) & 255;
      ty = (ty + 2) & 255;
      x = 0; y = 0;
      do {
        M[(op(0x8024) + y) & 0xFFFF] = M[(op(0x8021) + x) & 0xFFFF];
        x = (x + 1) & 255;
        c = (y + 8) >> 8; y = (y + 8) & 255;
        M[0x7FE4] = (M[0x7FE4] - 1) & 255;
      } while (M[0x7FE4]);
      y = ty;
      a = width; M[0x7FE4] = width;
      M[0x7FE5] = (M[0x7FE5] - 1) & 255;
    } while (M[0x7FE5]);
    return { a, x, y, c };
  };

  // DRAW_TEXT_TO_BITMAP: A characters of the string at ($7E) (its first byte, when not 0, asks for
  // a blank cell at each end), from pixel pair X across, down the rows at ($7C); a character is a
  // cell 5 pixel pairs wide (the 2-bit cell at $857B, its header at $8576), each of the font's
  // four bytes at $231A two lines of 4 pixels, the upper in colour 1 and the lower in colour 1
  // (colour 3 for the character's second line). DRAW_TEXT_HIGH_BIT_MERGE draws with colour 0
  // transparent.
  const text = (a0, x0, mode) => {
    M[0x8572] = a0; M[0x8574] = x0; M[0x8575] = mode;
    M[0x7A] = 0x76; M[0x7B] = 0x85;
    let a, x, y, c;
    if (M[ptr(0x7E)]) {
      M[0x8572] = (M[0x8572] - 1) & 255;
      for (x = 0x10; x; x--) M[0x857A + x] = 0;
      P.BLIT_PACKED_2BPP_GRAPHIC({ a: M[0x8575], x: M[0x8574], y: 1, c: 0 });
      let s = (M[0x8572] << 2) & 255; s += M[0x8572]; s = (s & 255) + M[0x8574] + (s >> 8);
      P.BLIT_PACKED_2BPP_GRAPHIC({ a: M[0x8575], x: s & 255, y: 0x10, c: 0 });
      M[0x8574] = (M[0x8574] + 3) & 255;
    }
    y = 1; M[0x8573] = 1;
    for (;;) {
      x = (((M[(ptr(0x7E) + y) & 0xFFFF] - 0x20) & 255) << 2) & 255;
      y = 0;
      do {
        M[0x82] = M[(0x231A + x) & 0xFFFF];
        const bit = () => { const o = M[0x82] >> 7; M[0x82] = (M[0x82] << 1) & 255; return o; };
        a = 0;
        if (bit()) a = 0x40;
        if (bit()) a |= 0x10;
        if (bit()) a |= 0x04;
        if (bit()) a |= 0x01;
        M[0x857B + y] = a;
        a = 0; y++;
        M[0x857B + y] = 0; M[0x857D + y] = 0;
        y++;
        if (bit()) a = 0xC0;
        if (bit()) a |= 0x30;
        if (bit()) a |= 0x0C;
        if (bit()) a |= 0x03;
        if (y !== 2) a &= 0x55;
        M[0x857B + y] = a;
        y += 2; x = (x + 1) & 255;
      } while (y !== 0x10);
      x = P.BLIT_PACKED_2BPP_GRAPHIC({ a: M[0x8575], x: M[0x8574], y, c: 0 }).x;
      const s = M[0x8574] + 5; a = s & 255; c = s >> 8; M[0x8574] = a;
      M[0x8573] = (M[0x8573] + 1) & 255; y = M[0x8573];
      M[0x8572] = (M[0x8572] - 1) & 255;
      if (!M[0x8572]) return { a, x, y, c };
    }
  };
  P.DRAW_TEXT_TO_BITMAP = r => text(r.a, r.x, 0);
  P.DRAW_TEXT_HIGH_BIT_MERGE = r => text(r.a, r.x, 0x80);
};
})(typeof window !== 'undefined' ? window : globalThis);
