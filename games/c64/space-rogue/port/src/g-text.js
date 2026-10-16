// Text, windows and menus: the seven text windows ($9E4C), characters drawn from the font at $F200
// into the bitmap ($A047), a window scrolled up a pixel row at a time ($A178), word wrap ($9AFA),
// numbers ($9EBF), the disk's compressed texts ($9BB7-$9DED), the menus and their bar ($99DE-$9AAF,
// $9F8F) and the delay that paces them ($A317). SR's code from $99DE to $A24C, and $A317.
//
// A window has a left and a right column ($0D20, $0D21), a top and a bottom pixel row ($0D22,
// $0D23: rows count up the screen, so a new line is 9 rows lower) and a number of lines to print
// before it waits for a key ($0D24, counted down in $0D26). The cursor is $4F (column) and $50
// (row). With text mirrored ($0D28), what is drawn goes into both bitmaps ($C000 and $4000) and
// both screens ($E000 and $6000), so it stays when the 3D view flips buffers.
//
// A text's address has its high byte in Y and its low byte in X. $C000-$CFFF are not addresses but
// the numbers of texts on the disk; $FFFF is no text at all, and a routine given it returns at once
// (resolve_text drops its caller's return address: here it returns up: 1, and its callers return).
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.text = function (P) {
  const M = P.M;
  const R = (r, o) => Object.assign({}, r, o);
  const ptr = zp => M[zp] | M[(zp + 1) & 255] << 8;
  const writer = () => ((M[1] & 3) ? P.wr : (a, v) => { M[a] = v; });
  const reader = () => ((M[1] & 3) ? P.rd : a => M[a]);
  // the routine that resolved $FFFF returns too, as the game's does: A the high byte of the return
  // address resolve_text pulled (the JSR's, at `site`), X and Y $FF, carry set
  const dropped = site => ({ a: ((site + 2) >> 8) & 255, x: 0xFF, y: 0xFF, c: 1, n: 1, z: 0 });
  // the three empty hooks wait_ticks calls: nothing patches them, and the port would not know what
  // a patch did
  const hook = a => { if (M[a] !== 0x60) throw new Error('the hook at $' + a.toString(16) + ' is not an RTS'); };

  // ---- windows
  P.select_window = function (r) {
    const y = r.y;
    M[0x9E9B] = y;
    M[0x0D24] = M[0x0D26] = M[0x9E9C + y];
    M[0x0D20] = M[0x4F] = M[0x9EA3 + y];
    M[0x0D21] = M[0x9EAA + y];
    M[0x0D22] = M[0x50] = M[0x9EB1 + y];
    M[0x0D23] = M[0x9EB8 + y];
    return R(r, { a: M[0x0D23] });
  };
  P.restore_cursor = function (r) {
    const y = M[0x9E9B];
    M[0x4F] = M[0x9E91 + y]; M[0x50] = M[0x9E96 + y];
    return R(r, { a: M[0x50], y });
  };
  P.save_cursor = function (r) {
    const y = M[0x9E9B];
    M[0x9E91 + y] = M[0x4F]; M[0x9E96 + y] = M[0x50];
    return R(r, { a: M[0x50], y });
  };
  // Text into both bitmaps or the drawing one: the second stores in print_char ($A137, $A13F) made
  // STA (zp,X) or NOPs
  P.mirror_text_on = function (r) {
    M[0x0D28] = 1;
    M[0xA137] = M[0xA13F] = 0x81; M[0xA138] = 0x82; M[0xA140] = 0x1B;
    return R(r, { a: 0x1B });
  };
  P.mirror_text_off = function (r) {
    M[0x0D28] = 0;
    M[0xA137] = M[0xA138] = M[0xA13F] = M[0xA140] = 0xEA;
    return R(r, { a: 0xEA });
  };

  // ---- a character at the cursor. Controls: $0D a new line (at the window's bottom a scroll, and
  // first a wait for a key when the window's lines are used up), $0E a wait for a key and then a
  // clear, $0F and $10 reverse on and off, $11 a clear, $12 the rest of the line filled with $7B.
  // Anything else is drawn: its 8 bytes from the font at $F200 + 8 (A & $7F), the last at the
  // cursor's row and the first 7 rows above, each eor the reverse mask; a cell given a byte that is
  // not zero gets colour $BC in the screen.
  P.print_char = function* (r) {
    const a = r.a;
    M[0x0D27] = a;
    if (a < 0x20) {
      if (a === 0x0D) {
        M[0x4F] = M[0x0D20];
        M[0x0D26] = (M[0x0D26] - 1) & 255;
        if (M[0x50] !== M[0x0D23]) { M[0x50] = (M[0x50] - 9) & 255; return R(r, { a: M[0x50] }); }
        if (!M[0x0D26]) { M[0x0D26] = M[0x0D24]; yield* P.wait_key(); }
        return yield* P.scroll_window({ a: 1, x: r.x, y: r.y });
      }
      if (a === 0x0F) { M[0x0D25] = 0xFF; return R(r, { a: 0xFF }); }
      if (a === 0x10) { M[0x0D25] = 0; return R(r, { a: 0 }); }
      if (a === 0x0E || a === 0x11) {
        let k = r;
        if (a === 0x0E) k = R(r, yield* P.wait_key());
        const o = yield* P.clear_window(k);
        M[0x0D26] = M[0x0D24]; M[0x4F] = M[0x0D20]; M[0x50] = M[0x0D22];
        return R(o, { a: M[0x50] });
      }
      if (a === 0x12) {
        let o = r;
        do o = yield* P.print_char(R(o, { a: 0x7B })); while (M[0x0D21] >= M[0x4F]);
        return R(o, { a: M[0x0D21] });
      }
    }
    const rd = reader(), wr = writer();
    const t = (a & 0x7F) * 8;
    M[0xA130] = t & 255; M[0xA131] = (t >> 8) + 0xF2;
    M[0xA0FA] = M[0x50];
    M[0xA100] = (M[0x4F] << 3) & 255; M[0xA109] = (M[0x4F] >> 5) & 1;
    M[0xA12E] = 7;
    let v = 0;
    do {
      const row = M[0xA0FA];
      let s = M[0xEB00 + row] + M[0xA100];
      M[0x80] = M[0x82] = s & 255;
      let h = ((M[0xEC00 + row] + M[0xA109] + (s >> 8)) & 255) ^ M[0x3A];
      M[0x81] = h; M[0x83] = h ^ 0x80;
      const line = M[0xECC8 + row];
      s = M[0xEBC8 + line] + M[0x4F];
      M[0x19] = M[0x1B] = s & 255;
      h = ((M[0xEBE1 + line] + (s >> 8)) & 255) ^ M[0x3A];
      M[0x1A] = h; M[0x1C] = h ^ 0x80;
      v = rd(((M[0xA130] | M[0xA131] << 8) + M[0xA12E]) & 0xFFFF) ^ M[0x0D25];
      wr(ptr(0x80), v);
      second(0xA137, v, wr);
      if (v) { v = 0xBC; wr(ptr(0x19), v); second(0xA13F, v, wr); }
      M[0xA0FA] = (M[0xA0FA] + 1) & 255;
      M[0xA12E] = (M[0xA12E] - 1) & 255;
    } while (!(M[0xA12E] & 0x80));
    M[0x4F] = (M[0x4F] + 1) & 255;
    return { a: v, x: 0, y: 0 };
  };
  // the second store at a: STA (zp,X) with X = 0, or two NOPs
  const second = (a, v, wr) => {
    if (M[a] === 0x81) wr(ptr(M[a + 1]), v);
    else if (M[a] !== 0xEA || M[a + 1] !== 0xEA) throw new Error('print_char\'s code at $' + a.toString(16) + ' is neither a store nor NOPs');
  };

  // ---- scrolling and clearing. The window moves up A lines, each a pixel row at a time: every row
  // from the window's top line's seventh down to the row above the bottom line goes up one, the
  // cells from the left column to the right. A window one line high is blanked with spaces instead.
  P.scroll_window = function* (r) {
    M[0x81] = r.a;
    M[0x84] = (M[0x0D21] - M[0x0D20]) & 255;
    if (!((M[0x0D24] - 1) & 255)) {
      M[0x4F] = M[0x0D20]; M[0x50] = M[0x0D23];
      let o = { x: r.x, y: 0 };
      do {
        o = yield* P.print_char(R(o, { a: 0x20 }));
        M[0x84] = (M[0x84] - 1) & 255;
      } while (!(M[0x84] & 0x80));
      return o;
    }
    M[0xA1C9] = M[0xA1D8] = (M[0x0D20] << 3) & 255;
    M[0xA1D0] = M[0xA1E1] = (M[0x0D20] >> 5) & 1;
    M[0xA1E5] = M[0x0D28] ? 0x80 : 0;
    let o;
    do {
      M[0x80] = 9;
      do { o = rowsUp(); M[0x80] = (M[0x80] - 1) & 255; } while (M[0x80]);
      M[0x81] = (M[0x81] - 1) & 255;
    } while (M[0x81]);
    return o;
  };
  // $A1BD: the window's rows up one. Its listing runs on into the blanking of a one-line window,
  // which prints, so it is a generator, though this never waits.
  P.s_A1BD = function* () { return rowsUp(); };
  function rowsUp() {
    const rd = reader(), wr = writer();
    let x = (M[0x0D22] + 6) & 255, y = 0;
    for (;;) {
      let s = M[0xEB00 + x] + M[0xA1C9];
      M[0x38] = s & 255;
      M[0x39] = (M[0xEC00 + x] + M[0xA1D0] + (s >> 8)) & 255;
      s = M[0xEB01 + x] + M[0xA1D8];
      M[0x19] = M[0x1B] = s & 255;
      M[0x1A] = (M[0xEC01 + x] + M[0xA1E1] + (s >> 8)) & 255;
      M[0x1C] = M[0x1A] ^ M[0xA1E5];
      M[0x82] = x;
      let n = M[0x84];
      y = 0;
      do {
        const v = rd((ptr(0x38) + y) & 0xFFFF);
        wr((ptr(0x19) + y) & 0xFFFF, v);
        wr((ptr(0x1B) + y) & 0xFFFF, v);
        y += 8;
        if (y > 255) { y &= 255; M[0x39] = (M[0x39] + 1) & 255; M[0x1A] = (M[0x1A] + 1) & 255; M[0x1C] = (M[0x1C] + 1) & 255; }
        n = (n - 1) & 255;
      } while (!(n & 0x80));
      x = M[0x82];
      if (x < M[0x0D23]) return { a: y, x, y };
      x = (x - 1) & 255;
    }
  }
  // Every line of the window spaces, from the top line down
  P.clear_window = function* (r) {
    M[0x50] = M[0x0D22];
    let o = r;
    for (;;) {
      M[0x4F] = M[0x0D20];
      o = yield* P.s_A240(o);
      const v = M[0x50] - 9;
      M[0x50] = v & 255;
      if (v < 0 || M[0x50] < M[0x0D23]) break;
    }
    return R(o, { a: M[0x50] });
  };
  // Spaces from the cursor to the window's right column
  P.s_A240 = function* (r) {
    let o = r;
    do o = yield* P.print_char(R(o, { a: 0x20 })); while (M[0x0D21] >= M[0x4F]);
    return R(o, { a: M[0x0D21] });
  };

  // ---- texts
  // A text's address, from X (low) and Y (high): as it is, or a disk text decoded into $BF00 (X 0,
  // Y $BF), or up: 1 for $FFFF. A disk text's number is its address less $C000. SPB's table at
  // $BD00 counts the texts in each 512-byte block of the disk's text; the block is read into
  // $F600-$F7FF unless it is held already, at $F600 or at $F800, and when the text is its block's
  // last, the next block goes into $F800 for the text to run on into. Then the texts before it in
  // the block are decoded and thrown away, and it is decoded into $BF00.
  P.resolve_text = function (r) {
    const x = r.x, y = r.y;
    if (y < 0xC0 || y >= 0xD0) {
      if (y === 0xFF && x === 0xFF) return { a: r.a, x, y, c: 1, up: 1 };
      return { a: r.a, x, y };
    }
    const rd = reader();
    M[0x82] = x; M[0x83] = (y - 0xC0) & 255;
    let i = 0;
    M[0x9CB2] = 0;
    for (;;) {
      const s = M[0x82] - M[0xBD00 + i];
      M[0x82] = s & 255;
      M[0x83] = (M[0x83] - M[0xBD01 + i] - (s < 0 ? 1 : 0)) & 255;
      if (M[0x83] & 0x80) break;
      i = (i + 2) & 255;
      if (!i) break;
    }
    if (!((M[0x82] & M[0x83]) ^ 0xFF)) M[0x9CB2]++;
    const s = M[0x82] + M[0xBD00 + i];
    M[0x82] = s & 255;
    M[0x83] = (M[0x83] + M[0xBD01 + i] + (s >> 8)) & 255;
    const lo = M[0x82], hi = M[0x83];
    const copy = (from, to) => { for (let k = 0; k < 0x200; k++) M[to + k] = rd(from + k); };
    let b = i >> 1;
    M[0x9CB3] = b; M[0x9CB4] = b;
    b = (b + 1) & 255;
    if (b === M[0x9CB0]) { M[0x9CB1] = b; copy(0xF600, 0xF800); }
    b = (b - 1) & 255;
    const held = b === M[0x9CB0];
    M[0x9CB0] = b;
    if (!held) {
      if (b === M[0x9CB1]) copy(0xF800, 0xF600);
      else P.read_text_block({ x: 0xF6 });
    }
    if (M[0x9CB2] && M[0x9CB0] !== 0xFF) {
      const n = (M[0x9CB0] + 1) & 255;
      const had = n === M[0x9CB1];
      M[0x9CB1] = n;
      if (!had) { M[0x9CB4] = (M[0x9CB4] + 1) & 255; P.read_text_block({ x: 0xF8 }); }
    }
    M[0x82] = lo; M[0x83] = hi;
    const sb = P.start_bits({ a: M[0x9CB0] === M[0x9CB3] ? 0xF6 : 0xF8 });
    const X = M[0x9CB0];
    // the end of a text run on from the block before, unless the block starts with a fresh one
    if (!sb.n) while (P.decode_char({ x: X }).a) ;
    for (;;) {
      if (!M[0x82]) M[0x83] = (M[0x83] - 1) & 255;
      M[0x82] = (M[0x82] - 1) & 255;
      if (M[0x83] & 0x80) break;
      while (P.decode_char({ x: X }).a) ;
    }
    let k = 0xFF, c;
    do { k = (k + 1) & 255; c = P.decode_char({ x: k }).a; M[0xBF00 + k] = c; } while (c);
    return { a: 0, x: 0, y: 0xBF, z: 1, n: 0 };
  };
  // Text block $9CB4 into the pages from X ($F6 or $F8): disk blocks $01AD + 2 n and the next
  P.read_text_block = function (r) {
    M[0x80] = 0; M[0x81] = r.x;
    let b = P.s_9CCE();
    P.read_block({ x: b.x, y: b.y });
    M[0x81] = (M[0x81] + 1) & 255;
    b = P.s_9CCE();
    const x = (b.x + 1) & 255;
    return P.read_block({ x, y: x ? b.y : (b.y + 1) & 255 });
  };
  P.s_9CCE = function () {
    const n = M[0x9CB4], lo = ((n << 1) & 255) + 0xAD;
    const y = ((n >> 7) + 1 + (lo >> 8)) & 255;
    return { a: y, x: lo & 255, y };
  };
  // The bit reader: the byte at $9D21/$9D22 (patched into an LDA), the bit X of it, low bit first.
  // After the eighth bit the next byte, skipping $F800, the first byte of the second buffer.
  P.read_bit = function (r) {
    let x = r.x, y = 0;
    let a = reader()(M[0x9D21] | M[0x9D22] << 8) & M[0x9D5E + x];
    if (a) y = 1;
    x = (x + 1) & 255;
    if (x === 8) {
      x = 0;
      for (;;) {
        M[0x9D21] = (M[0x9D21] + 1) & 255;
        if (M[0x9D21]) break;
        M[0x9D22] = (M[0x9D22] + 1) & 255;
        a = M[0x9D22];
        if (a !== 0xF8) break;
      }
    }
    return { a, x, y };
  };
  // The reader at the block in page A: its first byte, less its top bit, is the bit the first fresh
  // text starts at, in the byte after it, or with 8 added, in the byte after that. N is its top bit:
  // set when the block starts with a fresh text.
  P.start_bits = function (r) {
    M[0x9D22] = r.a; M[0x9D48] = r.a;
    const v = reader()(M[0x9D47] | r.a << 8);
    let a = v & 0x7F, y = 1;
    if (a >= 8) { a &= 7; y = 2; }
    M[0x9D21] = y; M[0x9D5D] = a;
    return { a, x: r.x, y, n: v >> 7, z: v ? 0 : 1 };
  };
  // One character: from the Huffman tree's root at $9D66 each bit picks an entry of the pair; one
  // below $80 is the distance from itself to the next pair, one above it a character + $80. $9B is
  // the escape: the character is the next 7 bits, high bit first. Z set at the end of a text.
  P.decode_char = function (r) {
    M[0x9D1A] = r.x;
    M[0x80] = 0x66; M[0x81] = 0x9D;
    let x = M[0x9D5D], a, b;
    for (;;) {
      b = P.read_bit({ x }); x = b.x;
      a = M[(ptr(0x80) + b.y) & 0xFFFF];
      if (a & 0x80) break;
      const s = a + M[0x80] + (b.y ? 1 : 0);
      M[0x80] = s & 255; a = s & 255;
      if (s > 255) { M[0x81] = (M[0x81] + 1) & 255; if (!M[0x81]) break; }
    }
    if (a === 0x9B) {
      M[0x80] = 7;
      do {
        b = P.read_bit({ x }); x = b.x;
        M[0x81] = ((M[0x81] << 1) | b.y) & 255;
        M[0x80] = (M[0x80] - 1) & 255;
      } while (M[0x80]);
      a = M[0x81];
    }
    M[0x9D5D] = x;
    a &= 0x7F;
    return { a, x: M[0x9D1A], y: b.y, z: a ? 0 : 1, n: 0 };
  };

  // Zero-ended text at X/Y, character by character
  P.print_text = function* (r) {
    const t = P.resolve_text(r);
    if (t.up) return dropped(0x9B9B);
    M[0x9BAB] = t.x; M[0x9BAC] = t.y;
    const rd = reader();
    M[0x85] = 0;
    let x = t.x, o = null;
    for (;;) {
      const y = M[0x85];
      const a = rd(((M[0x9BAB] | M[0x9BAC] << 8) + y) & 0xFFFF);
      if (!a) return { a: 0, x, y, z: 1, n: 0 };
      o = yield* P.print_char({ a, x, y });
      x = o.x;
      M[0x85] = (M[0x85] + 1) & 255;
      if (!M[0x85]) return { a: o.a, x, y: o.y, z: 1, n: 0 };
    }
  };
  // A message: the window up two lines, and the text at A (high) and X (low) on its bottom line
  P.print_message = function* (r) {
    M[0x0D29] = 10;
    yield* P.scroll_window({ a: 2 });
    M[0x4F] = M[0x0D20]; M[0x50] = M[0x0D23];
    return yield* P.print_text({ a: r.a, x: r.x, y: r.a });
  };
  // The text at A (high) and X (low) word-wrapped to the window, a line at a time through $FF05
  P.print_wrapped = function* (r) {
    const t = P.resolve_text({ a: r.a, x: r.x, y: r.a });
    if (t.up) return dropped(0x9AFB);
    M[0x74] = t.x; M[0x75] = t.y;
    M[0x86] = 0;
    let o, w;
    do {
      w = P.wrap_line({ y: M[0x86] });
      M[0x86] = w.y;
      o = yield* P.print_text({ x: 5, y: 0xFF });
    } while (!w.c);
    return R(o, { c: 1 });
  };
  // The next line of the text at ($74) from offset Y into $FF05, as much as fits from the cursor
  // to the window's right column, leading spaces skipped. A line that fills is broken after its
  // last space, trailing spaces dropped, and ended with $0D (wrap_flag counts it); one that meets a
  // control character ends after it, but a $0D straight after such a break is dropped. Carry set
  // when the text's end was copied; Y the offset of the next line.
  P.wrap_line = function (r) {
    const rd = reader(), src = ptr(0x74), at = i => rd((src + i) & 0xFFFF);
    const B = 0xFF05, buf = i => rd((B + i) & 0xFFFF), put = (i, v) => { M[(B + i) & 0xFFFF] = v; };
    const end = (x, y) => { put(x, 0); return { a: 0, x: (x - 1) & 255, y, c: 0 }; };
    let x = 0, y = r.y;
    const room = M[0x0D21] - M[0x4F];
    if (room >= 0) {
      M[0x87] = room;
      y = (y - 1) & 255;
      do y = (y + 1) & 255; while (at(y) === 0x20);
      for (;;) {
        const a = at(y);
        put(x, a);
        if (!a) return { a: 0, x, y, c: 1 };
        y = (y + 1) & 255; x = (x + 1) & 255;
        if (a < 0x20) {
          if (a === 0x0D) {
            if (x === 1 && M[0x9B84]) x = 0;
            M[0x9B84] = 0;
          }
          return end(x, y);
        }
        M[0x87] = (M[0x87] - 1) & 255;
        if (M[0x87] & 0x80) break;
      }
      // full: back to the last space unless the line ends at one
      x = (x - 1) & 255;
      let trail = true;
      if (buf(x) > 0x20 && at(y) > 0x20) {
        for (;;) {
          y = (y - 1) & 255; x = (x - 1) & 255;
          if (x & 0x80) { trail = false; break; }
          if (buf(x) === 0x20) break;
        }
      }
      if (trail) while (buf(x) === 0x20) { x = (x - 1) & 255; if (x & 0x80) break; }
      x = (x + 1) & 255;
    }
    put(x, 0x0D);
    x = (x + 1) & 255;
    M[0x9B84] = (M[0x9B84] + 1) & 255;
    return end(x, y);
  };
  // The length of the text at ($74) in Y
  P.text_length = function (r) {
    const t = P.resolve_text({ a: r.a, x: M[0x74], y: M[0x75] });
    if (t.up) return dropped(0x9B89);
    M[0x9B96] = t.x; M[0x9B97] = t.y;
    const rd = reader(), a = t.x | t.y << 8;
    let y = 0;
    while (rd((a + y) & 0xFFFF)) y = (y + 1) & 255;
    return { a: 0, x: t.x, y, z: 1, n: 0 };
  };
  // The text at ($74) added to the end of the one at ($78), 255 bytes at most in all
  P.append_text = function (r) {
    const t = P.resolve_text({ a: r.a, x: M[0x74], y: M[0x75] });
    if (t.up) return dropped(0x9DF2);
    M[0x9E07] = t.x; M[0x9E08] = t.y;
    const rd = reader(), wr = writer(), src = t.x | t.y << 8, d = ptr(0x78);
    let y = 0;
    while (rd((d + y) & 0xFFFF)) { y = (y + 1) & 255; if (!y) break; }
    for (let x = 0; ; x = (x + 1) & 255) {
      const a = rd((src + x) & 0xFFFF);
      wr((d + y) & 0xFFFF, a);
      if (!a) return { a: 0, x, y, z: 1, n: 0 };
      y = (y + 1) & 255;
      if (!y) { wr((d + 0xFF) & 0xFFFF, 0); return { a: 0, x: (x + 1) & 255, y: 0xFF, z: 1, n: 0 }; }
    }
  };
  // The text at ($78) looked for in the one at ($74): Z set when found, ($76) where; else Y $FF, N set
  P.find_text = function (r) {
    let t = P.resolve_text({ a: r.a, x: M[0x74], y: M[0x75] });
    if (t.up) return dropped(0x9E1B);
    M[0x76] = t.x; M[0x77] = t.y;
    t = P.resolve_text({ a: r.a, x: M[0x78], y: M[0x79] });
    if (t.up) return dropped(0x9E26);
    M[0x78] = t.x; M[0x79] = t.y;
    const rd = reader();
    for (;;) {
      const m = P.s_9E40({ x: t.x });
      if (m.z) return m;
      M[0x76] = (M[0x76] + 1) & 255;
      if (!M[0x76]) M[0x77] = (M[0x77] + 1) & 255;
      if (!rd(ptr(0x76))) return { a: 0, x: t.x, y: 0xFF, z: 0, n: 1 };
    }
  };
  // Z set when the text at ($78) starts the one at ($76)
  P.s_9E40 = function (r) {
    const rd = reader();
    for (let y = 0; ; y = (y + 1) & 255) {
      const a = rd((ptr(0x78) + y) & 0xFFFF);
      if (!a) return { a, x: r.x, y, z: 1, n: 0 };
      const b = rd((ptr(0x76) + y) & 0xFFFF);
      if (a !== b) return { a, x: r.x, y, z: 0, n: ((a - b) >> 7) & 1, c: a >= b ? 1 : 0 };
    }
  };

  // ---- numbers
  // The word at $60/$61 as five digits, leading zeros as spaces but the last: the ten-thousands,
  // thousands and hundreds counted off by subtraction into $88, $87, $86, the tens into $85 and
  // the units left in $84
  P.print_number = function* (r) {
    M[0x85] = M[0x86] = M[0x87] = M[0x88] = 0xFF;
    const count = (k, lo, hi) => {
      let h;
      do {
        M[k] = (M[k] + 1) & 255;
        const l = M[0x60] - lo;
        M[0x60] = l & 255;
        h = M[0x61] - hi - (l < 0 ? 1 : 0);
        M[0x61] = h & 255;
      } while (h >= 0);
    };
    const back = (lo, hi) => {
      const l = M[0x60] + lo;
      M[0x60] = l & 255;
      M[0x61] = (M[0x61] + hi + (l >> 8)) & 255;
    };
    count(0x88, 0x10, 0x27); back(0x10, 0x27);
    count(0x87, 0xE8, 0x03); back(0xE8, 0x03);
    count(0x86, 0x64, 0x00); back(0x64, 0x00);
    let a = M[0x60], v;
    do { M[0x85] = (M[0x85] + 1) & 255; v = a - 10; a = v & 255; } while (v >= 0);
    M[0x84] = (a + 10) & 255;
    let y = 4, x = r.x, o = null;
    M[0x60] = 4; M[0x89] = 0;
    for (;;) {
      let c = (M[0x84 + y] + 0x30) & 255;
      if (c !== 0x30) M[0x89] = (M[0x89] + 1) & 255;
      else if (y) { x = M[0x89]; if (!x) c = 0x20; }
      o = yield* P.print_char({ a: c, x, y });
      x = o.x;
      M[0x60] = (M[0x60] - 1) & 255;
      y = M[0x60];
      if (y & 0x80) break;
    }
    return { a: o.a, x, y, n: 1, z: 0 };
  };
  // A signed byte: a minus sign when negative, then its tens and units (the hundreds are lost)
  P.print_signed = function* (r) {
    M[0x85] = r.a;
    if (r.a & 0x80) {
      const x = ((r.a ^ 0xFF) + 1) & 255;
      M[0x85] = x;
      yield* P.print_char({ a: 0x2D, x, y: r.y });
    }
    const d = P.split_digits({ a: M[0x85] });
    yield* P.print_char({ a: (d.x + 0x30) & 255, x: d.x, y: d.y });
    return yield* P.print_char({ a: (d.a + 0x30) & 255, x: d.x, y: d.y });
  };
  // A as hundreds (Y), tens (X) and units (A)
  P.split_digits = function (r) {
    let a = r.a, y = 0xFF, x = 0xFF, v;
    do { y = (y + 1) & 255; v = a - 0x64; a = v & 255; } while (v >= 0);
    a = (a + 0x64) & 255;
    do { x = (x + 1) & 255; v = a - 0x0A; a = v & 255; } while (v >= 0);
    const s = a + 0x0A;
    a = s & 255;
    return { a, x, y, c: s >> 8, n: a >> 7, z: a ? 0 : 1 };
  };

  // ---- the menus
  // The bar on the item at the cursor: 9 rows from the cursor's up, Y + 2 cells from the column
  // before the cursor's, inverted but for the first cell's left six pixels and the last cell's
  // right four, the bar's margins
  P.invert_bar = function (r) {
    const rd = reader(), wr = writer();
    M[0x9FCD] = (r.y + 1) & 255;
    M[0x80] = 9; M[0x81] = M[0x50];
    const c = (M[0x4F] - 1) & 255;
    M[0x9FB3] = (c << 3) & 255; M[0x9FBC] = (c >> 5) & 1;
    let x, y = 0;
    do {
      x = M[0x81];
      const s = M[0xEB00 + x] + M[0x9FB3];
      M[0x38] = M[0x82] = s & 255;
      const h = ((M[0xEC00 + x] + M[0x9FBC] + (s >> 8)) & 255) ^ M[0x3A];
      M[0x39] = M[0x83] = h;
      if (M[0x0D28]) M[0x83] = h ^ 0x80;
      x = M[0x9FCD]; y = 0;
      do {
        let a = rd((ptr(0x38) + y) & 0xFFFF) ^ 0xFF;
        if (!y) a ^= 0xFC;
        if (!x) a ^= 0x0F;
        wr((ptr(0x38) + y) & 0xFFFF, a);
        wr((ptr(0x82) + y) & 0xFFFF, a);
        y = (y + 8) & 255;
        x = (x - 1) & 255;
      } while (!(x & 0x80));
      M[0x81] = (M[0x81] + 1) & 255;
      M[0x80] = (M[0x80] - 1) & 255;
    } while (M[0x80]);
    return { a: y, x, y, z: 1, n: 0 };
  };
  // Y cells of the line at the cursor dimmed: every byte shifted right and masked with $55, so
  // every other pixel is left
  P.dim_item = function (r) {
    const rd = reader(), wr = writer();
    M[0xA02C] = (r.y - 1) & 255;
    M[0x80] = 9; M[0x81] = M[0x50];
    M[0xA014] = (M[0x4F] << 3) & 255; M[0xA01D] = (M[0x4F] >> 5) & 1;
    let x, y = 0;
    do {
      x = M[0x81];
      const s = M[0xEB00 + x] + M[0xA014];
      M[0x38] = M[0x82] = s & 255;
      const h = ((M[0xEC00 + x] + M[0xA01D] + (s >> 8)) & 255) ^ M[0x3A];
      M[0x39] = h;
      M[0x83] = M[0x0D28] ? h ^ 0x80 : h;
      x = M[0xA02C]; y = 0;
      do {
        const a = (rd((ptr(0x38) + y) & 0xFFFF) >> 1) & 0x55;
        wr((ptr(0x38) + y) & 0xFFFF, a);
        wr((ptr(0x82) + y) & 0xFFFF, a);
        y = (y + 8) & 255;
        x = (x - 1) & 255;
      } while (!(x & 0x80));
      M[0x81] = (M[0x81] + 1) & 255;
      M[0x80] = (M[0x80] - 1) & 255;
    } while (M[0x80]);
    return { a: y, x, y, z: 1, n: 0 };
  };
  // A menu of A items ($8B) Y characters wide ($8A): ($7A) the items' text addresses, two bytes
  // each, and when $79 is not zero, ($78) a byte for each, 0 for an item that cannot be chosen.
  // Drawn from the cursor down, chosen, then blanked; Y the item chosen.
  P.menu = function* (r) {
    M[0x8B] = r.a; M[0x8A] = r.y;
    yield* P.menu_draw(r);
    yield* P.menu_select(r);
    const o = yield* P.menu_blank(r);
    const y = M[0x8C];
    return R(o, { y, n: y >> 7, z: y ? 0 : 1 });
  };
  P.menu_choose = function* (r) {
    M[0x8B] = r.a; M[0x8A] = r.y;
    return yield* P.menu_select(r);
  };
  // The bar on the first item, moved up and down by the keys or the stick a tick at a time, until
  // fire, RETURN or SPACE chooses an item that can be chosen; then the bar blinks
  P.menu_select = function* (r) {
    yield* P.wait_fire_up();
    M[0x8C] = 0;
    P.invert_bar({ y: M[0x8A] });
    for (;;) {
      let chosen = P.fire_pressed().a !== 0;
      if (!chosen) {
        // menu_key ($9AA3): RETURN or SPACE choose (it drops its return and jumps to $9A40)
        const k = P.key_direction();
        if (k.c) chosen = true;
        else {
          let go = !k.y ? null : (k.y & 0x80) ? 'down' : 'up';
          if (go === 'up') {
            if (!M[0x8C]) go = null;
            else {
              P.invert_bar({ y: M[0x8A] });
              M[0x8C]--;
              M[0x50] = (M[0x50] + 9) & 255;
              go = M[0x50] ? 'bar' : 'down';
            }
          }
          if (go === 'down') {
            if (((M[0x8C] + 1) & 255) >= M[0x8B]) go = null;
            else {
              P.invert_bar({ y: M[0x8A] });
              M[0x8C] = (M[0x8C] + 1) & 255;
              M[0x50] = (M[0x50] - 9) & 255;
              go = 'bar';
            }
          }
          if (go === 'bar') P.invert_bar({ y: M[0x8A] });
          yield* P.wait_ticks({ a: 1 });
          continue;
        }
      }
      yield* P.wait_fire_up();
      if (M[0x79] && !M[(ptr(0x78) + M[0x8C]) & 0xFFFF]) continue;
      let o;
      M[0x8F] = 2;
      do {
        P.invert_bar({ y: M[0x8A] });
        o = yield* P.wait_ticks({ a: 1 });
        M[0x8F] = (M[0x8F] - 1) & 255;
      } while (!(M[0x8F] & 0x80));
      const y = M[0x8C];
      return { a: o.a, x: o.x, y, n: y >> 7, z: y ? 0 : 1 };
    }
  };
  // The A items from the cursor down, a line apart, each at the cursor's column; those that cannot
  // be chosen dimmed
  P.menu_draw = function* (r) {
    M[0x8F] = r.a; M[0x90] = 0; M[0x8E] = M[0x50];
    let o = r;
    for (;;) {
      const i = (M[0x90] << 1) & 255, p = ptr(0x7A);
      const x = M[(p + i) & 0xFFFF], y = M[(p + ((i + 1) & 255)) & 0xFFFF];
      const col = M[0x4F];
      o = yield* P.print_text({ a: col, x, y });
      M[0x4F] = col;
      if (M[0x79]) {
        o = R(o, { y: M[0x90] });
        if (!M[(ptr(0x78) + M[0x90]) & 0xFFFF]) o = P.dim_item({ y: M[0x8A] });
      }
      M[0x8F] = (M[0x8F] - 1) & 255;
      if (!M[0x8F]) break;
      M[0x50] = (M[0x50] - 9) & 255;
      M[0x90] = (M[0x90] + 1) & 255;
      if (!M[0x90]) break;
    }
    M[0x50] = M[0x8E];
    return R(o, { a: M[0x8E] });
  };
  // The menu's $8B lines blanked, $8A spaces each
  P.menu_blank = function* (r) {
    M[0x50] = M[0x8E]; M[0x8D] = M[0x4F]; M[0x90] = 0;
    let o = r;
    do {
      M[0x8F] = M[0x8A]; M[0x4F] = M[0x8D];
      do {
        o = yield* P.print_char(R(o, { a: 0x20 }));
        M[0x8F] = (M[0x8F] - 1) & 255;
      } while (M[0x8F]);
      M[0x50] = (M[0x50] - 9) & 255;
      M[0x90] = (M[0x90] + 1) & 255;
    } while (M[0x90] !== M[0x8B]);
    return R(o, { a: M[0x90], z: 1, c: 1 });
  };

  // ---- A ticks of a delay loop (76 turns of 256, about a tenth of a second each), noting in $80
  // whether fire was pressed meanwhile: A is $C0 if it was. Each tick's delay ends at a checkpoint
  // ($A32B), where the port reads the stick at the same place as the game.
  const TICK = 2 + 76 * 1298 - 1;          // LDX #$4C, then 76 turns of LDY, the DEY loop, the hook, DEX, BNE
  P.CHECKPOINTS.push(0xA32B);
  P.wait_ticks = function* (r) {
    M[0x80] = 0;
    hook(0xA46D);
    let a = r.a;
    do {
      hook(0xA46F);
      yield { cp: 0xA32B, cycles: TICK };
      M[0x80] |= P.fire_pressed().a;
      a = (a - 1) & 255;
    } while (a);
    hook(0xA46E);
    return { a: M[0x80], x: 0, y: 0, n: M[0x80] >> 7, z: M[0x80] ? 0 : 1 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
