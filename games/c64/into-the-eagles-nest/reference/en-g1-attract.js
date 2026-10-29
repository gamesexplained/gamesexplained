/* en-g1-attract */
// Into the Eagle's Nest, Play port, group "attract" ($0810-$0FFF): the high score check the game
// goes to when it ends (the program's first stage, at $0810), the name entry screen with its
// interrupt in four bands, its scrolling alphabet strip, the joystick and the cursor, the big
// alphabet's plotter, the table's shift and the hold after it; the title screen's fade interrupt
// and its band painter; and the plaque interrupt the credits, supplies and valuables screens run
// on. The jump stubs at $0810-$0839 are reached only through their JMPs: callers name the targets.
// The strings, the alphabet and the high score table are data, read from P.M. One function per
// listing label, on the game's own memory P.M, its chips through P.io (en-core.js).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ib } = H;
    const build_title_screen = H.gen('build_title_screen', 0x1014, { until: [0x4000] });
    const music_driver = H.call('music_driver', 0x1947);
    // the processor port read back ($01, data direction $2F): the outputs as last written, bit 4 (the
    // cassette's sense line, no button down) high, bits 6 and 7 low as the kit's 6502 keeps them
    const portRead = () => (P.cpuPort & 0x2F) | 0x10;
    // the waits for the name and the hold after it; the hold's head, and its SEI, which an interrupt
    // must not follow in the replay (it writes $D011 after the bands have)
    for (const a of [0x0CDC, 0x0D36, 0x0D3E, 0x0D4D]) P.checkpoints.add(a);
    P.irqBytes.add(0x0CD3);                                          // name_length, which fire steps
    // the column of the cursor, 10 plus twice the characters typed: ASL, then ADC with its carry
    const cursorCol = () => { const n = M[0x0CD3]; return ((n << 1) + 0x0A + (n >> 7)) & 255; };
    // the big alphabet's character on a strip cell, the cell's code plus 1, shifted right twice
    const stripChar = () => ((M[0x070B] + 1) & 255) >> 2;
    // CIA 2's port A: video bank 3 (bits 0-1 low) or bank 0 (both high)
    const videoBank = (bits) => {
      wr(0xDD02, rd(0xDD02) | 0x03);
      wr(0xDD00, (rd(0xDD00) & 0xFC) | bits);
    };
    // the plaque's colour memory from $EE00 and $EF00 with the KERNAL banked out
    const plaqueColours = (writeBack) => {
      wr(0x0001, portRead() & 0xFD);
      for (let i = 0; i < 256; i++) {                                // x = 0, then $FF down to 1
        const x = (256 - i) & 255;
        wr(0xD800 + x, rd(0xEE00 + x));
        const v = rd(0xEF00 + x);
        wr(0xD900 + x, v);
        if (writeBack) wr(0xEF00 + x, v);
      }
      wr(0x0001, portRead() | 0x02);
    };

    // ---------------------------------------------------------------- the high score check
    P.stages[0x0810] = function* () { return (yield* P.hiscore_check()).at; };   // go_hiscore_check

    // the score at $0819 against each of the ten entries' scores, digit by digit as ASCII: the first
    // it beats goes to the name entry, and none to the attract loop. Returns { at } where it stops.
    P.hiscore_check = function* () {                                 // $0B89
      P.sei();
      wr(0xD011, 0x6B);
      wr(0x0001, 0x37);
      M[0x0829] = 0x0D;
      do {
        for (let y = 0; y < 6; y++) {                                // b_0B9A
          const x = (y + M[0x0829]) & 255;
          const t = M[0x0D50 + x], s = M[0x0819 + y];
          if (t === s) continue;
          if ((t - s) & 0x80) return yield* P.name_entry_screen();   // bmi
          break;                                                     // bpl
        }
        M[0x0829] = (M[0x0829] + 0x14) & 255;                         // b_0BB1
      } while (M[0x0829] < 0xC8);
      return yield* build_title_screen();
    };

    // ---------------------------------------------------------------- the name entry
    P.name_entry_screen = function* () {                             // $0BC1
      M[0x0829] = (M[0x0829] - 0x0D) & 255;
      plaqueColours(true);
      M[0x0928] = 0;
      wr(0xD020, 0); wr(0xD021, 0);
      M[0x09A9] = 0x4F;
      for (let k = 0; k < 256; k++) { M[0x0568 + k] = 0x80; M[0x0668 + k] = 0x80; }
      for (let x = 0x68; x < 0xE8; x++) M[0x0700 + x] = 0x80;
      for (let x = 0x27; x >= 0; x--) { wr(0xD940 + x, 0x00); wr(0xDAF8 + x, 0x02); wr(0xDB20 + x, 0x0A); }
      P.draw_alphabet_strip();
      return yield* P.draw_name_entry_text();
    };
    // a string of ASCII ending $FF at a, through the plotter, each character masked to six bits;
    // at the 20th character (only "WELL DONE"'s is that long) a row and a column on
    const plotString = (a, split) => {
      for (let x = 0; ; x = (x + 1) & 255) {
        if (split && x === 0x14) { M[0x0A81] = (M[0x0A81] + 1) & 255; M[0x0A80] = (M[0x0A80] + 1) & 255; }
        const v = M[a + x];
        if (v === 0xFF) return;
        M[0x0A7F] = v & 0x3F;
        P.plot_char_2x2();
      }
    };
    const plotAt = (col, row, top, bottom) => { M[0x0A80] = col; M[0x0A81] = row; M[0x0A82] = top; M[0x0A83] = bottom; };
    P.draw_name_entry_text = function* () {                          // $0C2A
      plotAt(0x00, 0x09, 0x06, 0x0E);
      plotString(0x0B0D, true);                                      // WELL DONE YOU ARE A REAL HERO
      plotAt(0x01, 0x10, 0x05, 0x0D);
      plotString(0x0B36, false);                                     // ENTER YOUR NAME
      plotAt(0x13, 0x15, 0x0F, 0x01);
      M[0x0A7F] = 0x1E;                                              // the pointer
      P.plot_char_2x2();
      M[0x0784] = 0x80; M[0x0783] = 0x80;
      plotAt(0x00, 0x17, 0x04, 0x03);
      plotString(0x0B78, false);                                     // the name field
      return yield* P.name_entry_wait();
    };
    P.name_entry_wait = function* () {                               // $0CD4
      M[0x0CD3] = 0;
      P.install_attract_irq();
      return yield* P.wait_for_name();
    };
    P.wait_for_name = function* () {                                 // $0CDC
      do yield { cp: 0x0CDC }; while (ib(0x0CD3) !== 0x0A);
      return yield* P.read_typed_name();
    };
    // the ten characters back off row 23, every other cell, each code shifted right twice
    P.read_typed_name = function* () {                               // $0CE7
      for (let y = 0; y < 10; y++) M[0x081F + y] = M[0x07A3 + 2 * y] >> 2;
      return yield* P.hiscore_insert();
    };
    P.hiscore_insert = function* () {                                // $0CF8
      let x = 0xC7;
      do { M[0x0D50 + x] = M[0x0D3C + x]; x = (x - 1) & 255; } while (x !== M[0x0829]);
      x = M[0x0829];
      for (let y = 0; y < 0x14; y++, x = (x + 1) & 255) M[0x0D50 + x] = 0x20;      // b_0D09
      x = M[0x0829];
      for (let y = 0; y < 0x0A; y++, x = (x + 1) & 255) M[0x0D51 + x] = M[0x081F + y];   // b_0D19
      x = M[0x0829];
      for (let y = 0; y < 0x06; y++, x = (x + 1) & 255) M[0x0D5D + x] = M[0x0819 + y];   // b_0D2A
      yield { cp: 0x0D36 };
      P.sei();
      wr(0xD011, 0x7B);
      return yield* P.hiscore_delay();
    };
    // 255 turns of 255 of a count from 1, on a blank screen with the interrupts off (about 0.86
    // seconds): a yield each turn of the outer loop with the cycles of the turn before, then the attract
    // loop at $1014
    P.hiscore_delay = function* () {                                 // $0D3C
      const turn = 2 + 0xFF * 13 - 1;                                // ldy, 255 turns of lda, sec, sbc, bne, dey, bne
      for (let x = 0xFF; x !== 0; x--) {                             // b_0D3E
        yield { cp: 0x0D3E, cycles: x === 0xFF ? 2 : turn + 5 };
      }
      yield { cp: 0x0D4D, cycles: turn + 4 };                        // the last turn, to the JMP
      return yield* build_title_screen();
    };

    // ---------------------------------------------------------------- the name entry's interrupt
    P.install_attract_irq = function () {                            // $083A
      P.sei();
      wr(0xDC0E, 0);
      wr(0xD01A, 1);
      M[0x0314] = 0x5A; M[0x0315] = 0x08;
      wr(0xD012, 0);
      M[0x0859] = 0;
      P.cli();
    };
    // four bands counted by $0859: the picture, the text, the strip's fine scroll, and back
    P.attract_irq = function () {                                    // $085A
      wr(0xD019, 1);
      const band = M[0x0859] = (M[0x0859] + 1) & 255;
      if (band === 1) { P.band_text(); wr(0xD012, 0xC6); }
      else if (band === 2) { P.band_strip_scroll(); wr(0xD012, 0xDA); }
      else if (band === 3) { P.band_strip_scroll_off(); wr(0xD012, 0x00); }
      else {
        P.band_picture();
        wr(0xD012, 0x78);
        M[0x0859] = 0;
        P.kernal_irq();                                              // jmp $EA31
      }
    };
    P.irqs[0x085A] = P.attract_irq;
    P.band_picture = function () {                                   // $08A5
      wr(0xD011, 0x3B); wr(0xD021, 0x01); wr(0xD016, 0xD8); wr(0xD018, 0xB8);
      videoBank(0x00);
      P.name_entry_input();
      P.draw_name_cursor();
    };
    P.set_text_screen = function () {                                // $08D0
      wr(0xD011, 0x7B); wr(0xD021, 0x00); wr(0xD016, 0xD8); wr(0xD018, 0x1A);
      videoBank(0x03);
      wr(0xD011, 0x1B);
    };
    P.band_text = function () {                                      // $08FC
      wr(0xD011, 0x7B); wr(0xD021, 0x00); wr(0xD016, 0xC8); wr(0xD018, 0x1A);
      videoBank(0x03);
      wr(0xD011, 0x1B);
    };
    P.band_strip_scroll = function () {                              // $0929
      wr(0xD016, (rd(0xD016) & 0xF0) | M[0x0928]);
    };
    P.band_strip_scroll_off = function () {                          // $0935
      wr(0xD016, (rd(0xD016) & 0xF0) | 0x08);
    };
    // the character under the strip's pointer drawn at the cursor, row 23
    P.draw_name_cursor = function () {                               // $0940
      M[0x0A80] = cursorCol();
      M[0x0A81] = 0x17;
      M[0x0A7F] = stripChar();
      P.plot_char_2x2();
    };
    // fire: the character under the pointer taken, the cursor stepped on (to ten at most); "_" ($1F)
    // rubs out with a full stop at the cursor and steps it back, not below 0
    P.name_entry_fire = function () {                                // $0964
      if (stripChar() === 0x1F) {
        M[0x0A80] = cursorCol();                                     // b_0981
        M[0x0A81] = 0x17;
        M[0x0A7F] = 0x2E;
        P.plot_char_2x2();
        const n = M[0x0CD3];
        if (n >= 1) M[0x0CD3] = n - 1;
        M[0x095D] = 1;                                               // b_09A2
        return;
      }
      const x = M[0x0CD3];
      if (x === 0x0A) return;                                        // r_09A8
      M[0x0CD3] = (x + 1) & 255;
      M[0x095D] = 1;
    };
    // the strip in rows 19 and 20, twenty characters of the alphabet at $0B48 from the character
    // $09A9 names in half-characters: four cells each on an even half-step, and on an odd one each
    // character's right half beside the next one's left half
    P.draw_alphabet_strip = function () {                            // $09AB
      const p = M[0x09A9];
      let x = M[0x09AA] = p >> 1;
      const next = () => { x = (x + 1) & 255; if (x === 0x30) x = 0; };
      const code = () => (M[0x0B48 + x] & 0x3F) << 2;
      if (!(p & 1)) {
        for (let y = 0; y !== 0x28; y += 2) {                        // b_09B9
          const a = code();
          M[0x06F8 + y] = a; M[0x0720 + y] = a + 1; M[0x06F9 + y] = a + 2; M[0x0721 + y] = a + 3;
          next();
        }
        return;
      }
      for (let y = 0; y !== 0x28; y += 2) {                          // b_09E5
        const a = code() + 2;
        M[0x06F8 + y] = a; M[0x0720 + y] = a + 1;
        next();
        const b = code();                                            // b_09FD
        M[0x06F9 + y] = b; M[0x0721 + y] = b + 1;
      }
    };
    // the joystick in port 2, once a frame from the picture band
    P.name_entry_input = function () {                               // $0A13
      if (!(rd(0xDC00) & 0x04)) return P.strip_scroll_right();
      if (!(rd(0xDC00) & 0x08)) return P.strip_scroll_left();
      if (!(rd(0xDC00) & 0x10)) {
        if (M[0x095D]) return;                                       // j_095E: one press, one character
        return P.name_entry_fire();
      }
      M[0x095D] = 0;                                                 // b_0A31
    };
    P.strip_scroll_right = function () {                             // $0A37
      const s = M[0x0928] = (M[0x0928] + 4) & 255;
      if (s !== 8) return;
      M[0x0928] = 0;
      let x = (M[0x09A9] - 1) & 255;
      if (x === 0xFF) x = 0x5F;
      M[0x09A9] = x;
      P.draw_alphabet_strip();
    };
    P.strip_scroll_left = function () {                              // $0A5A
      const s = M[0x0928] - 4;
      M[0x0928] = s & 255;
      if (s >= 0) return;
      M[0x0928] = 4;
      let x = (M[0x09A9] + 1) & 255;
      if (x === 0x60) x = 0;
      M[0x09A9] = x;
      P.draw_alphabet_strip();
    };
    // one character of the big alphabet, two cells by two, at column $0A80 and row $0A81: the codes
    // 4n, 4n+2 above and 4n+1, 4n+3 below, the colours $0A82 above and $0A83 below; the column on by
    // two, and the row by two past column 39. The pointer at $FC is left at the colour cell.
    P.plot_char_2x2 = function () {                                  // $0A84
      const n = (M[0x0A7F] << 2) & 255;
      M[0x0A7B] = n; M[0x0A7D] = (n + 1) & 255; M[0x0A7C] = (n + 2) & 255; M[0x0A7E] = (n + 3) & 255;
      M[0xFC] = M[0x0A80]; M[0xFD] = 0x04;
      for (let y = M[0x0A81]; y !== 0; y--) {                         // j_0AA9
        const s = M[0xFC] + 0x28;
        M[0xFC] = s & 255;
        if (s > 255) M[0xFD] = (M[0xFD] + 1) & 255;
      }
      const at = (y) => ((M[0xFC] | M[0xFD] << 8) + y) & 0xFFFF;
      wr(at(0x00), M[0x0A7B]); wr(at(0x01), M[0x0A7C]);
      wr(at(0x28), M[0x0A7D]); wr(at(0x29), M[0x0A7E]);
      M[0xFD] = (M[0xFD] + 0xD4) & 255;
      wr(at(0x00), M[0x0A82]); wr(at(0x01), M[0x0A82]);
      wr(at(0x28), M[0x0A83]); wr(at(0x29), M[0x0A83]);
      M[0x0A80] = (M[0x0A80] + 2) & 255;
      if (M[0x0A80] >= 0x28) {
        M[0x0A81] = (M[0x0A81] + 2) & 255;
        M[0x0A80] = 0;
      }
    };

    // ---------------------------------------------------------------- the title screen's fade
    P.install_title_irq = function () {                              // $0E40
      P.sei();
      wr(0xD011, 0x6B);
      wr(0xD020, 0); wr(0xD021, 0);
      wr(0xDC0E, 0);
      M[0x0314] = 0x6A; M[0x0315] = 0x0E;
      wr(0xD012, 0);
      wr(0xD01A, rd(0xD01A) | 0x01);
      P.cli();
    };
    // the step $1011's four colours from the tables at $0FE5, $0FEF, $0FF9 and $1003, painted
    const fadeStep = () => {
      const y = M[0x1011];
      M[0x100D] = M[0x0FE5 + y]; M[0x100E] = M[0x0FEF + y]; M[0x100F] = M[0x0FF9 + y]; M[0x1010] = M[0x1003 + y];
      P.paint_four_bands();
    };
    P.title_irq = function () {                                      // $0E6A
      wr(0xD019, 1);
      const phase = M[0x1012];
      if (phase === 2) {                                             // b_0EB5: the fade out
        fadeStep();
        let x = (M[0x1011] - 1) & 255;
        if (x & 0x80) { x = 0; M[0x1012] = 4; }
        M[0x1011] = x;
      } else if (phase === 3) {                                      // b_0EE6: the hold
        M[0x1013] = (M[0x1013] + 1) & 255;
        if (!M[0x1013]) M[0x1012] = 2;
      } else if (phase !== 1 && phase !== 4) {                       // the fade in
        fadeStep();
        let x = (M[0x1011] + 1) & 255;
        if (x === 0x0A) { M[0x1012] = 3; x = 9; }
        M[0x1011] = x;
      }
      music_driver();                                                // j_0EF3
      P.kernal_irq();                                                // jmp $EA31
    };
    P.irqs[0x0E6A] = P.title_irq;
    P.paint_four_bands = function () {                               // $0EF9
      for (let x = 0x27; x >= 0; x--) {
        wr(0xD800 + x, M[0x100D]);
        wr(0xD828 + x, M[0x100E]);
        const c3 = M[0x100F];
        for (const a of [0xD878, 0xD8C8, 0xD918, 0xD968, 0xD9B8, 0xDA08, 0xDA58, 0xDAA8, 0xDAF8, 0xDB48]) wr(a + x, c3);
        const c4 = M[0x1010];
        for (const a of [0xD8A0, 0xD8F0, 0xD940, 0xD990, 0xD9E0, 0xDA30, 0xDA80, 0xDAD0, 0xDB20, 0xDB70]) wr(a + x, c4);
      }
    };

    // ---------------------------------------------------------------- the plaque screens
    P.install_plaque_irq = function () {                             // $0F4D
      P.sei();
      wr(0x0001, 0x37);
      wr(0xD011, 0x6B);
      plaqueColours(false);
      wr(0xDC0E, 0);
      wr(0xD01A, 1);
      M[0x0314] = 0x95; M[0x0315] = 0x0F;
      M[0x0F94] = 0;
      wr(0xD012, 0);
      P.cli();
    };
    // two bands flipped by $0F94: the plaque's bitmap and the music, then the text below it
    P.plaque_irq = function () {                                     // $0F95
      wr(0xD019, 1);
      const band = M[0x0F94] = M[0x0F94] ^ 1;
      if (band) { P.set_text_screen(); wr(0xD012, 0x00); return; }   // b_0FB2
      P.set_plaque_bitmap();
      wr(0xD012, 0x78);
      music_driver();
      P.kernal_irq();                                                // jmp $EA31
    };
    P.irqs[0x0F95] = P.plaque_irq;
    P.set_plaque_bitmap = function () {                              // $0FC0
      wr(0xD011, 0x3B); wr(0xD021, 0x01); wr(0xD016, 0xD8); wr(0xD018, 0xB8);
      videoBank(0x00);
    };
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
