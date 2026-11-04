// The start-up ($3FFB-$42C6), run once after the loader jumps to $3FFB: the KERNAL's vectors kept
// at $0800, the chips set, the game's sum checked, and its tables moved where it uses them: the
// screen's colours, the sky, the RAM under the chips filled from the bitmaps' areas. Then START.
// The Play page begins after it, at START: its memory has no instructions in it, so the sum
// could not come out the same there.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.startup = P => {
  const M = P.M;
  P.GEN.add('STARTUP'); P.GEN.add('CHECKSUM');
  // STARTUP ($3FFB): the screen blanked; the KERNAL's vectors ($0314-$0333) kept at $0800 (VECTOR,
  // with the KERNAL still in); a pause; then the ROMs out for good ($01 $35), the NMI's vector
  // $9A32, every interrupt off, multicolour, no sprites; the sum checked (CHECKSUM); multicolour
  // bitmap mode; the SID's voices stopped and its filter set; the IRQ's vector $CDAA; the colour RAM
  // from $5800; the road's edges ($5780 to $C280); twelve colours from colour RAM kept at $C6C0;
  // the sky's colours in the screen at $5C54, a column at a time from the heights at $40EF; colours
  // and bytes of the screen and colour RAM; tables moved from the bitmaps' area to $C000-$C25F,
  // $5800-$5BFF, $7F40 and $57C0; the RAM under the chips ($D000-$DDFF) filled from $7C00-$7FFF,
  // $4F00-$56FF, $AE00 and $7B00, and $DE00-$DFFF with the pattern at $410F; the screen kept
  // (command $34); START
  P.STARTUP = function* (r) {
    P.wr(0xD011, P.rd(0xD011) & 0xEF);
    P.kernal.VECTOR({ c: 1, x: 0, y: 8 });
    yield { cycles: 4 + 16 * (256 * 7 - 1 + 5) - 1 };
    P.wr(0xD011, 0x2B);
    M[0x00] = 0x2F; M[0x01] = 0x35;
    M[0xFFFA] = 0x32; M[0xFFFB] = 0x9A;
    P.wr(0xD01A, 0); P.wr(0xD019, 0xFF);
    P.wr(0xDC0D, 0x7F); P.wr(0xDD0D, 0x7F);
    P.wr(0xD016, 0x18);
    for (const a of [0xD015, 0xD01D, 0xD017, 0xD025]) P.wr(a, 0);
    yield* P.CHECKSUM({});
    P.DISPATCH({ a: 2 });
    for (const a of [0xD404, 0xD40B, 0xD412]) P.wr(a, 8);
    P.wr(0xD418, 0x2F); P.wr(0xD415, 0); P.wr(0xD416, 0x3C); P.wr(0xD417, 0xF5);
    M[0xFFFF] = 0xCD; M[0xFFFE] = 0xAA;
    let x = 0;
    do {
      for (let p = 0; p < 4; p++) P.wr(0xD800 + p * 256 + x, M[0x5800 + p * 256 + x]);
      x = (x - 1) & 255;
    } while (x);
    for (x = 0x7F; x >= 0; x--) M[0xC280 + x] = M[0x5780 + x];
    for (x = 0x0B; x >= 0; x--) M[0xC6C0 + x] = P.rd(0xDAB6 + x);
    for (x = 0x1F; x >= 0; x--) {
      M[0x08] = 0x0F; M[0x1F] = 0x5C; M[0x1E] = (x + 0x54) & 255;
      do {
        if (M[0x08] < M[0x40EF + x]) break;
        M[M[0x1E] | M[0x1F] << 8] = 0x1E;
        const t = M[0x1E] + 0x28;
        M[0x1E] = t & 255; M[0x1F] = (M[0x1F] + (t >> 8)) & 255;
        M[0x08] = (M[0x08] - 1) & 255;
      } while (!(M[0x08] & 0x80));
    }
    for (x = 0x0F; x >= 0; x--) P.wr(0xDB54 + x, 8);
    for (const a of [0x5EAC, 0x5ED4, 0x5EFC, 0x5ECB, 0x5EF3, 0x5F1B]) M[a] = 0x21;
    for (const a of [0xDAD4, 0xDAFC, 0xDAF3, 0xDB1B]) P.wr(a, 0x0C);
    x = 0;
    do { M[0xC000 + x] = M[0x72E0 + x]; M[0xC100 + x] = M[0x7420 + x]; x = (x - 1) & 255; } while (x);
    for (x = 0x17; x >= 0; x--) {
      M[0xC200 + x] = M[0x75A0 + x]; M[0xC218 + x] = M[0x7608 + x];
      M[0xC230 + x] = M[0x7560 + x]; M[0xC248 + x] = M[0x7648 + x];
    }
    x = 0;
    do { M[0x5800 + x] = M[0x63E0 + x]; M[0x5900 + x] = M[0x6520 + x]; x = (x - 1) & 255; } while (x);
    for (x = 0x3F; x >= 0; x--) {
      M[0x5A00 + x] = M[0x66E0 + x]; M[0x5A40 + x] = M[0x6920 + x];
      M[0x7F40 + x] = M[0x6B60 + x]; M[0x57C0 + x] = M[0x6BA0 + x];
    }
    for (x = 0x7F; x >= 0; x--) { M[0x5A80 + x] = M[0x6D20 + x]; M[0x5B00 + x] = M[0x6A20 + x]; M[0x5B80 + x] = M[0x6DE0 + x]; }
    for (x = 3; x >= 0; x--) for (const a of [0x5C26, 0x5C4E, 0x5C76, 0x5C9E, 0x5CC6, 0x5CEE, 0x5D16, 0x5D3E]) M[a + x] = 0;
    P.ALL_RAM({});
    const from = [0x7C, 0x7D, 0x7E, 0x7F, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0xAE, 0x7B];
    x = 0;
    do {
      for (let p = 0; p < from.length; p++) M[0xD000 + p * 256 + x] = M[from[p] * 256 + x];
      x = (x - 1) & 255;
    } while (x);
    let y = 0;
    do {
      const v = M[0x410F + y];
      M[0xDE00 + x] = v; M[0xDF00 + x] = v;
      y = (y - 1) & 255;
      if (y & 0x80) y = 0x0F;
      x = (x - 1) & 255;
    } while (x);
    M[0x01] = 0x35;
    P.DISPATCH({ a: 0x34, x: 0 });
    return yield* P.START({});
  };
  // CHECKSUM ($425D): the sixteen-bit sum of the game's bytes in the seven ranges at $42A9 (from
  // $0840 to $42C4, $4F00-$56FF, $5780-$7FFF, $80C0-$A1FF, $A380-$BFFF, $C780-$CFFF and
  // $E000-$FFE1) must be $9DFA ($42C5): otherwise a yellow border, and the game stops for good
  P.CHECKSUM = function* (r) {
    M[0xFB] = 0; M[0xFC] = 0; M[0xFD] = 0;
    let x = 0x18;
    do {
      M[0xFE] = M[0x42AA + x];
      let y = M[0x42A9 + x];
      do {
        const t = M[0xFB] + M[(M[0xFE] << 8) + y];
        M[0xFB] = t & 255;
        if (t > 255) M[0xFC] = (M[0xFC] + 1) & 255;
        y = (y + 1) & 255;
        if (!y) M[0xFE] = (M[0xFE] + 1) & 255;
      } while (y !== M[0x42AB + x] || M[0xFE] !== M[0x42AC + x]);
      x -= 4;
    } while (x >= 0);
    if (M[0xFB] === M[0x42C5] && M[0xFC] === M[0x42C6]) return { a: M[0xFC], x: 0xFC, y: M[0x42AB] };
    yield* P.BORDER_BLANK({ a: 7 });
    for (;;) yield { cycles: 63 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
