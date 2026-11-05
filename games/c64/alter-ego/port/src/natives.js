'use strict';
// The resident program's 6502 routines ($4109-$47F2, $6521-$6BD8): the sprite arrow and its
// interrupt, the glyph copiers that draw text into the bitmap or an off-screen panel, the curtain
// that brings a panel onto the screen, and the C library's memory and string routines. Each takes
// the arguments the p-code pushes, first first, and returns what the routine leaves in $0A/$0B.
// The zero-page bytes a routine leaves behind outside the p-code's registers ($16-$1D) are written
// as it writes them, since the game keeps them.
(function (root) {
  const groups = (root.AEPort || (root.AEPort = {})).groups || (root.AEPort.groups = []);
  groups.push(function (P) {
    const M = P.M;
    // the sprite arrow's place and target ($418E-$4193): x as a 9-bit pair, y a byte
    const CUR_XL = 0x418E, CUR_XH = 0x418F, TGT_XL = 0x4190, TGT_XH = 0x4191, CUR_Y = 0x4192, TGT_Y = 0x4193;

    // $41A0: $FF once the arrow stands on its target, 0 while the interrupt is still moving it
    P.sprite0_has_reached_target = function () {
      return (M[CUR_XH] === M[TGT_XH] && M[CUR_XL] === M[TGT_XL] && M[CUR_Y] === M[TGT_Y]) ? 0xFF : 0;
    };
    // the arrow drawn on the chip at its current place, as $41E0-$4213 and the interrupt's tail do
    function placeSprite0() {
      P.wb(0xD015, P.rb(0xD015) & 0xFE);
      P.wb(0xD001, M[CUR_Y]);
      P.wb(0xD000, M[CUR_XL]);
      if (M[CUR_XH]) P.wb(0xD010, P.rb(0xD010) | 1);
      else P.wb(0xD010, P.rb(0xD010) & 0xFE);
      P.wb(0xD015, P.rb(0xD015) | 1);
    }
    // $41C3: the arrow put straight at (x, y), its target there too
    P.sprite0_show_at_position = function (x, y) {
      M[CUR_XL] = M[TGT_XL] = x & 255;
      M[CUR_XH] = M[TGT_XH] = (x >> 8) & 255;
      M[CUR_Y] = M[TGT_Y] = y & 255;
      placeSprite0();
      return null;
    };
    // $4214: where the interrupt is to move the arrow
    P.sprite0_set_target = function (x, y) {
      M[TGT_XL] = x & 255; M[TGT_XH] = (x >> 8) & 255; M[TGT_Y] = y & 255;
      return null;
    };
    // $4229, on the KERNAL's interrupt through $0314: the arrow four pixels nearer its target
    // across and three down or up, then (when it moved) put on the chip once the raster has come to
    // a line whose low byte is 0; then on to the KERNAL's own handler (P.kernal_irq)
    P.sprite0_motion_irq_hook = function () {
      let x = 0xFF, y = 0xFF;
      const cx = M[CUR_XL] | M[CUR_XH] << 8, tx = M[TGT_XL] | M[TGT_XH] << 8;
      if (cx < tx) { const v = cx + 4; M[CUR_XL] = v & 255; M[CUR_XH] = (v >> 8) & 255; }
      else if (cx > tx) { const v = cx - 4; M[CUR_XL] = v & 255; M[CUR_XH] = (v >> 8) & 255; }
      else x = 0;
      if (M[CUR_Y] < M[TGT_Y]) M[CUR_Y] = (M[CUR_Y] + 3) & 255;
      else if (M[CUR_Y] > M[TGT_Y]) M[CUR_Y] = (M[CUR_Y] - 3) & 255;
      else y = 0;
      if (x || y) placeSprite0();
      if (P.kernal_irq) P.kernal_irq();
    };

    // $42D3: value as three digits and a terminator at dst, hundreds first. It takes 400 off
    // across the whole word, then works on the low byte alone (200, 100, then 80 to 10), so it is
    // right below 256 and from 400 to 655
    P.format_word_as_three_decimal_digits = function (value, dst) {
      const v = value & 0xFFFF;
      let lo = v & 255, h = 0, t = 0;
      if (v >= 400) { h = 1; lo = (v - 400) & 255; }
      const step = (n) => { if (lo >= n) { lo -= n; return 1; } return 0; };
      h = h << 1 | step(200);
      h = h << 1 | step(100);
      t = step(80); t = t << 1 | step(40); t = t << 1 | step(20); t = t << 1 | step(10);
      P.zp(0x12, h + 0x30); P.zp(0x13, t + 0x30); P.zp(0x14, lo + 0x30);
      P.wb(dst + 3, 0); P.wb(dst + 2, lo + 0x30); P.wb(dst + 1, t + 0x30); P.wb(dst, h + 0x30);
      return dst;
    };

    // $4355 and $4378: the 24 blocks of 176 bytes the life map scrolls, one block's worth of
    // bitmap rows moved by one entry of the table at $47F3/$480C, last first or first first
    function screenBlock(i) { return M[0x47F3 + i] | M[0x480C + i] << 8; }
    P.copy_screen_blocks_backward = function () {
      for (let x = 0x17; x >= 0; x--) {
        const src = screenBlock(x), dst = screenBlock(x + 1);
        for (let y = 0xB0; y > 0; y--) P.wb(dst + y, P.rb(src + y));
        P.zp(0x18, src); P.zp(0x19, src >> 8); P.zp(0x1C, dst); P.zp(0x1D, dst >> 8);
      }
      return null;
    };
    P.copy_screen_blocks_forward = function () {
      for (let x = 0; x < 0x18; x++) {
        const src = screenBlock(x + 1), dst = screenBlock(x);
        for (let y = 0xB0; y > 0; y--) P.wb(dst + y, P.rb(src + y));
        P.zp(0x18, src); P.zp(0x19, src >> 8); P.zp(0x1C, dst); P.zp(0x1D, dst >> 8);
      }
      return null;
    };

    // $439D and $43A8: a word's high or low byte
    P.return_argument_byte_1 = v => (v >> 8) & 255;
    P.return_argument_byte_0 = v => v & 255;
    // $4196: the table of text spans the codes 128-255 stand for, at $419F
    P.return_highbit_text_span_table_bias = () => 0x419F;

    // $43B3: the arrow's interrupt hooked into $0314 (the KERNAL's vector kept at $4194), the
    // screen's colours all colour, the bitmap cleared, the curtain's seven sprites set up and the
    // arrow's and the curtain's shapes copied to $0340 and $0380
    P.initialize_display_and_sprite_irq = function (colour) {
      M[0x4194] = M[0x0314]; M[0x4195] = M[0x0315];
      M[0x0314] = 0x29; M[0x0315] = 0x42;
      M[CUR_Y] = M[TGT_Y] = M[CUR_XL] = M[CUR_XH] = M[TGT_XL] = M[TGT_XH] = 0;
      P.wb(0xD413, 0); P.wb(0xD414, 0);
      P.wb(0xD412, 0x80); P.wb(0xD40E, 0x80); P.wb(0xD40F, 0x80);
      P.wb(0xD011, 0); P.wb(0xD015, 0);
      const c = colour & 255;
      for (let a = 0x0400; a < 0x0800; a++) P.wb(a, c);
      for (let r = 0xD028; r <= 0xD02E; r++) P.wb(r, c & 15);
      for (let a = 0x2000; a < 0x4000; a++) P.wb(a, 0);
      P.zp(0x12, 0); P.zp(0x13, 0x40);
      P.wb(0xD011, 0x3B); P.wb(0xD018, 0x18);
      P.wb(0xD01D, 0xFE); P.wb(0xD01B, 0xFE); P.wb(0xD010, 0xC0);
      const xs = [0x18, 0x48, 0x78, 0xA8, 0xD8, 0x08, 0x38];
      for (let i = 0; i < 7; i++) P.wb(0xD002 + 2 * i, xs[i]);
      P.wb(0x07F8, 0x0D);
      for (let a = 0x07F9; a <= 0x07FF; a++) P.wb(a, 0x0E);
      for (let i = 0; i < 64; i++) P.wb(0x0340 + i, P.rb(0x4963 + i));
      for (let i = 0; i < 64; i++) P.wb(0x0380 + i, P.rb(0x49AB + i));
      P.zp(0x12, 0xAB); P.zp(0x13, 0x49);
      return null;
    };

    // $4697: a byte of the SID's third voice, running noise: the game's dice
    P.read_sid_voice3_noise = () => P.rb(0xD41B);

    // The glyph copiers. A ROM glyph is the character ROM's, found through the table at $4825
    // (ASCII $20-$7A); a custom glyph is one of the game's own, through $48DB/$48EB. A panel is
    // 31 cells wide, cell (col, row) 8 bytes at base + (row x 31 + col) x 8 (the table at $4A3A);
    // the screen's bitmap is 40 cells wide (the tables at $49EA and $4ABC)
    function romGlyph(ch) { const i = ((ch - 0x20) & 0x7F) * 2; return M[0x4825 + i] | M[0x4826 + i] << 8; }
    function customGlyph(n) { return M[0x48DB + n] | M[0x48EB + n] << 8; }
    function panelCell(col, row, base) {
      let c = (M[0x4A3A + row] | M[0x4A62 + row] << 8) + col;
      c = (c << 3) & 0xFFFF;
      return (c + base) & 0xFFFF;
    }
    function screenCell(col, row) {
      return ((M[0x4ABC + row] | M[0x4AD5 + row] << 8) + (M[0x49EA + col] | M[0x4A12 + col] << 8)) & 0xFFFF;
    }
    // reads with the character ROM in view, and CIA 1's timer stopped meanwhile, as the routines do
    function withCharRom(f) {
      P.wb(0xDC0E, P.rb(0xDC0E) & 0xFE);
      P.cpuPort &= 0xFB;
      f();
      P.cpuPort |= 4;
      P.wb(0xDC0E, P.rb(0xDC0E) | 1);
    }
    function copy8(src, dst) { for (let y = 7; y >= 0; y--) P.wb(dst + y, P.rb(src + y)); }
    // $46A1: ROM glyph ch into the panel at base
    P.copy_rom_glyph_to_buffer = function (ch, col, row, base) {
      const src = romGlyph(ch & 255), dst = panelCell(col & 255, row & 255, base);
      P.zp(0x12, src); P.zp(0x13, src >> 8);
      withCharRom(() => copy8(src, dst));
      return null;
    };
    // $470F: custom glyph n into the panel at base
    P.copy_custom_glyph_to_buffer = function (n, col, row, base) {
      const src = customGlyph(n & 255), dst = panelCell(col & 255, row & 255, base);
      P.zp(0x12, src); P.zp(0x13, src >> 8);
      copy8(src, dst);
      return null;
    };
    // $475D: ROM glyph ch onto the screen's bitmap at (col, row)
    P.copy_rom_glyph_to_screen_charset = function (ch, col, row) {
      const src = romGlyph(ch & 255), dst = screenCell(col & 255, row & 255);
      P.zp(0x12, src); P.zp(0x13, src >> 8);
      withCharRom(() => copy8(src, dst));
      return null;
    };
    // $47B8: custom glyph n onto the screen's bitmap at (col, row)
    P.copy_custom_glyph_to_screen_charset = function (n, col, row) {
      const src = customGlyph(n & 255), dst = screenCell(col & 255, row & 255);
      P.zp(0x12, src); P.zp(0x13, src >> 8);
      copy8(src, dst);
      return null;
    };

    // ---- the 32-bit arithmetic at $6E9F-$6FF3. Each takes the zero-page addresses of its two
    // operands (X and Y in the 6502), copies them to $6E97 and $6E9B, works in $24-$27 and leaves
    // its result over the second operand
    const rd32 = a => (M[a] | M[a + 1] << 8 | M[a + 2] << 16 | M[a + 3] << 24) >>> 0;
    const wr32 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >>> 8) & 255; M[a + 2] = (v >>> 16) & 255; M[a + 3] = (v >>> 24) & 255; };
    P.rd32 = rd32; P.wr32 = wr32;
    function load32(xz, yz) {
      for (let i = 0; i < 4; i++) M[0x6E97 + i] = M[xz + i];
      for (let i = 0; i < 4; i++) M[0x6E9B + i] = M[yz + i];
    }
    // $6E9F: the low 32 bits of the product; $24-$27 keep the high half, less the carries the
    // routine drops
    P.multiply_i32_low32 = function (xz, yz) {
      load32(xz, yz);
      let acc = 0, lo = rd32(0x6E9B);
      const x = rd32(0x6E97);
      for (let i = 0; i < 32; i++) {
        if (lo & 1) acc = (acc + x) >>> 0;
        lo = ((lo >>> 1) | ((acc & 1) << 31)) >>> 0;
        acc >>>= 1;
      }
      wr32(0x24, acc); wr32(0x6E9B, lo); wr32(yz, lo);
      M[0x02] = 0;
    };
    // $6F4C: the magnitudes divided, quotient at $6E9B and remainder at $24; the signs kept over
    // the dividend's first two bytes (their xor, then the dividend's)
    function divide32(xz, yz) {
      load32(xz, yz);
      wr32(0x24, 0);
      M[yz + 1] = M[0x6E9E];
      M[yz] = M[0x6E9E] ^ M[0x6E9A];
      if (M[0x6E9A] & 0x80) wr32(0x6E97, (-rd32(0x6E97)) >>> 0);
      if (M[0x6E9E] & 0x80) wr32(0x6E9B, (-rd32(0x6E9B)) >>> 0);
      let q = rd32(0x6E9B), r = 0, t = 0;
      const d = rd32(0x6E97);
      for (let i = 0; i < 32; i++) {
        r = ((r << 1) | (q >>> 31)) >>> 0;
        q = (q << 1) >>> 0;
        t = (r - d) >>> 0;
        if (r >= d) { r = t; q = (q | 1) >>> 0; }
      }
      wr32(0x6E9B, q); wr32(0x24, r);
      M[0x02] = t & 255; M[0x03] = (t >>> 8) & 255;
    }
    // $6EEE and $6F1D: the signed quotient or remainder over the dividend
    P.divide_i32_quotient_nonzero_contract = function (xz, yz) {
      divide32(xz, yz);
      const q = rd32(0x6E9B);
      wr32(yz, (M[yz] & 0x80) ? (-q) >>> 0 : q);
      M[0x02] = 0;
    };
    P.divide_i32_remainder_nonzero_contract = function (xz, yz) {
      divide32(xz, yz);
      const r = rd32(0x24);
      wr32(yz, (M[yz + 1] & 0x80) ? (-r) >>> 0 : r);
      M[0x02] = 0;
    };

    // ---- the C library
    // $6521: count bytes from start set to value; one at least, since it stores before it compares
    P.fill_memory_range = function (start, count, value) {
      let p = start & 0xFFFF;
      const end = (start + count) & 0xFFFF;
      do { P.wb(p, value); p = (p + 1) & 0xFFFF; } while (p < end);
      return p;
    };
    // $657B: the address of the first ch in the string at s, 0 when the terminator comes first
    P.find_byte_in_zero_terminated_buffer = function (s, ch) {
      for (let a = s & 0xFFFF; ; a = (a + 1) & 0xFFFF) {
        const b = P.rb(a);
        if (b === 0) return 0;
        if (b === (ch & 255)) return a;
      }
    };
    // $6630: n bytes from src to dst, last first when dst is at or above src
    P.memmove_bytes = function (dst, src, n) {
      dst &= 0xFFFF; src &= 0xFFFF; n &= 0xFFFF;
      if (dst >= src) for (let i = n - 1; i >= 0; i--) P.wb(dst + i, P.rb(src + i));
      else for (let i = 0; i < n; i++) P.wb(dst + i, P.rb(src + i));
      return null;
    };
    // $6936: strcpy; it leaves dst moved on by a page for each 256 bytes it crossed
    P.copy_zero_terminated_string = function (dst, src) {
      let i = 0;
      for (;; i++) { const b = P.rb(src + i); P.wb(dst + i, b); if (!b) break; }
      return (dst + (i & 0xFF00)) & 0xFFFF;
    };
    // $6951: strncpy without the padding: up to n bytes, the terminator among them if it comes
    P.copy_bounded_zero_terminated_string = function (dst, src, n) {
      n &= 0xFFFF;
      let k = 0;
      while (k < n) { const b = P.rb(src + k); P.wb(dst + k, b); k++; if (!b) break; }
      return (dst - 256 + (k ? 256 * (1 + ((k - 1) >> 8)) : 0)) & 0xFFFF;
    };
    // $68F8 and $6917: strcat and strncat, returning dst
    P.append_zero_terminated_string = function (dst, src) {
      P.copy_zero_terminated_string((dst + P.measure_zero_terminated_string(dst)) & 0xFFFF, src);
      return dst & 0xFFFF;
    };
    P.append_bounded_zero_terminated_string = function (dst, src, n) {
      P.copy_bounded_zero_terminated_string((dst + P.measure_zero_terminated_string(dst)) & 0xFFFF, src, n);
      return dst & 0xFFFF;
    };
    // $6B86: strcmp's sign: -1, 0 or 1
    P.compare_zero_terminated_strings = function (a, b) {
      for (let i = 0; ; i++) {
        const x = P.rb(a + i), y = P.rb(b + i);
        if (!x) return y ? 0xFFFF : 0;
        if (x !== y) return x < y ? 0xFFFF : 1;
      }
    };
    // $6BBB: strlen
    P.measure_zero_terminated_string = function (s) {
      let n = 0;
      while (P.rb(s + n)) n++;
      return n & 0xFFFF;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
