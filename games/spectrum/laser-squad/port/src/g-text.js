// Text: characters in single and double height, the messages and their dictionary of words, and
// numbers.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.text = P => {
  const M = P.M, V = P.V;
  // $5D09, how text is printed: bit 0, a '/' is a space; 1, no space after a word; 2, the message's
  // bytes are characters, not words; 3, double height; 4, downwards. $5D05 and $5D06 hold the row
  // and column the line began at, $5D07 the dictionary, $5D1F the messages.
  const FLAGS = 0x5D09;
  const rowAddr = row => P.w(0x6042 + 2 * row & 0xFFFF);
  const attrOf = a => (((a >> 8) >> 3 & 3) | 0x58) << 8 | (a & 255);

  // $64F7: character A in double height at PRINT_ROW and PRINT_COL, each line of the font twice:
  // the top half in the colours in ATTR, the bottom in ATTR2.
  P.def(0x64F7, 'printCharDouble', r => {
    M[0x5D04] = r.a;
    const row = M[V.PRINT_ROW], col = M[V.PRINT_COL];
    const top = rowAddr(row) + col & 0xFFFF, bot = rowAddr(row + 1) + col & 0xFFFF;
    let f = 0xB139 + 8 * r.a & 0xFFFF;
    for (const cell of [top, bot]) {
      let d = cell;
      for (let i = 0; i < 4; i++) { M[d] = M[f]; d = d + 256 & 0xFFFF; M[d] = M[f]; d = d + 256 & 0xFFFF; f = f + 1 & 0xFFFF; }
    }
    const at = attrOf(bot + 0x700 & 0xFFFF);
    M[at] = M[V.ATTR2];
    M[at - 32 & 0xFFFF] = M[V.ATTR];
    return {};
  });

  // $6557: print message A of the list at ($5D1F), its messages each ending with '|' (message A
  // begins after the A-th), from the row and column in $5D05. A byte of $F1 or more is a code
  // ($663F), '/' a new line ($6617); any other a character (bit 2) or a word of the dictionary
  // at ($5D07), which is a list of words the same way, each followed by a space (unless bit 1).
  const nth = (base, n) => {
    let hl = base - 1 & 0xFFFF;
    n = n || 256;
    do { do hl = hl + 1 & 0xFFFF; while (M[hl] !== 0x7C); } while (--n);
    return hl;
  };
  P.def(0x6557, 'printMessage', r => {
    P.setw(0x5D0A, nth(P.w(0x5D1F), r.a));
    P.setw(V.PRINT_ROW, P.w(0x5D05));
    for (;;) {
      const hl = P.w(0x5D0A) + 1 & 0xFFFF;
      P.setw(0x5D0A, hl);
      const a = M[hl];
      if (a === 0x7C) return { a, zf: true };
      if (a >= 0xF1) { P.textCode({ a, hl }); P.setw(0x5D0A, P.w(0x5D21)); continue; }
      if (a === 0x2F) { P.newLine(); continue; }
      if (M[FLAGS] & 4) { P.putChar({ a }); continue; }
      P.setw(0x5D0C, nth(P.w(0x5D07), a));
      for (;;) {
        const w = P.w(0x5D0C) + 1 & 0xFFFF;
        P.setw(0x5D0C, w);
        const c = M[w];
        if (c === 0x7C) { if (!(M[FLAGS] & 2)) P.advance(); break; }
        if (c >= 0x80) { P.textCode({ a: c, hl: w }); P.setw(0x5D0C, P.w(0x5D21)); continue; }
        if (c === 0x2F) { P.newLine(); continue; }
        P.putChar({ a: c });
      }
      P.count('words');
    }
  });

  // $65E7: print character A (in double height with bit 3) and move on.
  P.def(0x65E7, 'putChar', r => {
    if (M[FLAGS] & 8) P.printCharDouble({ a: r.a }); else P.printChar({ a: r.a });
    return P.advance();
  });
  // $65FC: move on a character: right, or down (two rows in double height) with bit 4.
  P.def(0x65FC, 'advance', () => {
    if (!(M[FLAGS] & 16)) { M[V.PRINT_COL] = M[V.PRINT_COL] + 1 & 255; return { hl: V.PRINT_COL }; }
    M[V.PRINT_ROW] = M[V.PRINT_ROW] + 1 & 255;
    if (M[FLAGS] & 8) M[V.PRINT_ROW] = M[V.PRINT_ROW] + 1 & 255;
    return { a: M[V.PRINT_ROW], hl: FLAGS };
  });
  // $6617: a new line: the next row from where the line began (two in double height), or the next
  // column with bit 4; a space with bit 0.
  P.def(0x6617, 'newLine', () => {
    const f = M[FLAGS];
    if (f & 1) return P.advance();
    let e = M[0x5D05], d = M[0x5D06];
    if (f & 16) d = d + 1 & 255;
    else { e = e + 1 & 255; if (f & 8) e = e + 1 & 255; }
    M[0x5D05] = e; M[0x5D06] = d; M[V.PRINT_ROW] = e; M[V.PRINT_COL] = d;
    return { d, e, de: d << 8 | e };
  });
  // $663F: the codes, at HL: $FF and $FD the engine's dictionary ($AC06), $FE the scenario's (at
  // ($B724)); $FC and $FB bit 2 off and on, $FA and $F9 bit 3 on and off, $F8 and $F7 bit 4 off
  // and on, $F4 and $F3 bit 1 off and on, $F2 and $F1 bit 0 off and on; $F6 the colours (one byte,
  // two in double height) and $F5 the row and column, from the bytes after it. $5D21 is left on
  // the code's last byte.
  P.def(0x663F, 'textCode', r => {
    P.setw(0x5D21, r.hl);
    const set = (bit, on) => { M[FLAGS] = on ? M[FLAGS] | bit : M[FLAGS] & ~bit; };
    switch (r.a) {
      case 0xFF: case 0xFD: P.setw(0x5D07, 0xAC06); break;
      case 0xFE: P.setw(0x5D07, P.w(0xB724)); break;
      case 0xFC: set(4, false); break;
      case 0xFB: set(4, true); break;
      case 0xFA: set(8, true); break;
      case 0xF9: set(8, false); break;
      case 0xF8: set(16, false); break;
      case 0xF7: set(16, true); break;
      case 0xF6: {
        let p = P.w(0x5D21) + 1 & 0xFFFF;
        P.setw(0x5D21, p);
        M[V.ATTR] = M[p];
        if (M[FLAGS] & 8) { p = p + 1 & 0xFFFF; P.setw(0x5D21, p); M[V.ATTR2] = M[p]; }
        break;
      }
      case 0xF5: {
        const p = P.w(0x5D21) + 2 & 0xFFFF;
        const row = M[p - 1 & 0xFFFF], col = M[p];
        P.setw(0x5D21, p);
        M[0x5D05] = row; M[0x5D06] = col; M[V.PRINT_ROW] = row; M[V.PRINT_COL] = col;
        break;
      }
      case 0xF4: set(2, false); break;
      case 0xF3: set(2, true); break;
      case 0xF2: set(1, false); break;
      case 0xF1: set(1, true); break;
    }
    return {};
  });

  // $66F8: print the number A, 0 to 255, in three characters, the digits first and spaces after,
  // leaving PRINT_COL two on.
  P.def(0x66F8, 'printNumber', r => {
    let a = r.a;
    if (a < 10) { P.digitOn({ a }); P.charOn({ a: 0x20 }); P.putDigit({ a: 0x20 }); return {}; }
    if (a >= 100) {
      P.charOn({ a: a >= 200 ? 0x32 : 0x31 });
      P.twoDigits({ a: a >= 200 ? a - 200 : a - 100 });
      return {};
    }
    P.twoDigits({ a });
    M[V.PRINT_COL] = M[V.PRINT_COL] + 1 & 255;
    P.putDigit({ a: 0x20 });
    return {};
  });
  // $672B: A, under 100, in two digits, the second without moving on.
  P.def(0x672B, 'twoDigits', r => {
    const b = r.a / 10 | 0, c = r.a % 10;
    P.digitOn({ a: b });
    P.putDigit({ a: c + 0x30 });
    return { b, c };
  });
  // $6742: the digit A; $6744: the character A, and move on; $674C: the character A in place, in
  // double height with bit 3.
  P.def(0x6742, 'digitOn', r => P.charOn({ a: r.a + 0x30 & 255 }));
  P.def(0x6744, 'charOn', r => { P.putDigit({ a: r.a }); M[V.PRINT_COL] = M[V.PRINT_COL] + 1 & 255; return { hl: V.PRINT_COL }; });
  P.def(0x674C, 'putDigit', r => {
    if (M[FLAGS] & 8) P.printCharDouble({ a: r.a }); else P.printChar({ a: r.a });
    return {};
  });

  // $675E: message A of the engine's list ($A64E, the engine's dictionary) in double height, in
  // the colours $06 and $46; $676C: the same in the usual height and the colours as they are.
  const engineText = a => { P.setw(0x5D07, 0xAC06); P.setw(0x5D1F, 0xA64E); return P.printMessage({ a }); };
  P.def(0x675E, 'infoText', r => { M[FLAGS] = 8; P.setw(V.ATTR, 0x4606); return engineText(r.a); });
  P.def(0x676C, 'text', r => { M[FLAGS] = 0; return engineText(r.a); });
};
})(typeof window !== 'undefined' ? window : globalThis);
