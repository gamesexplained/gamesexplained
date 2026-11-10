/* az-g0-engine */
// Group 0: the engine. The start-up and Cosmi's logo ($1000), the menu and its previews ($1AF8,
// $1B09), a new game ($115B), the scorecard ($1195) and the dispatch to a level ($122E), the end of a
// level and its score ($1300, $1400, $1456), the screens' text ($1480, $1500, $1530), the music's
// reset ($1CA0) and the interrupt that plays it ($1C00). Each function is the routine at the address
// in its name's comment; a stage returns the address of the stage it JMPs to.
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const sid = (r, v) => io().sidWrite(r, v);
    const vicW = (r, v) => io().vicWrite(r, v), vicR = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    // a DEY loop of 256 turns inside a DEX loop of n (n = 0 is 256): the cycles it takes
    const dyx = (n) => (n || 256) * (256 * 5 - 1 + 2 + 2 + 3) - 1;

    // $1000 cold_start
    P.stages[0x1000] = function* () {
      for (let x = 0x28; x >= 0; x--) sid(x & 0x1F, 0);
      for (let x = 0x18; x >= 0; x--) sid(x, M[0x41C0 + x]);
      vicW(0x1A, 0);
      M[0x0314] = 0x00; M[0x0315] = 0x1C;
      vicW(0x1A, 0x10);
      M[0x30] = M[0x33] = M[0x34] = 0; M[0x31] = M[0x35] = 0x57; M[0x32] = M[0x36] = 9;
      vicW(0x20, 0); vicW(0x21, 0);
      K.chrout(0x93);
      vicW(0x16, vicR(0x16) | 0x10);
      vicW(0x18, (vicR(0x18) & 0xF0) | 0x0C);
      for (let x = 0; x < 256; x++) { M[0x0528 + x] = M[0x4000 + x]; col(0x128 + x, 0x0E); }
      for (let x = 0; x < 0xA0; x++) { M[0x0628 + x] = M[0x4100 + x]; col(0x228 + x, 0x0E); }
      M[0x10] = 0;                                          // sty $10 with Y = 0
      do { yield* H.wait(dyx(0)); M[0x10] = (M[0x10] + 1) & 255; } while (M[0x10] !== 0x10);
      vicW(0x16, vicR(0x16) & 0xEF);
      do {                                                  // $1099: the sun stone, a character at a time
        let x = yield* H.live(0x109C, 'cia1', 'x');
        M[0x0528 + x] = M[0x4200 + x]; col(0x128 + x, 8);
        x = yield* H.live(0x10AA, 'cia1', 'x');
        M[0x0628 + x] = M[0x4300 + x]; col(0x228 + x, 8);
        yield* H.wait(dyx(4));
        M[0x10] = (M[0x10] + 1) & 255;
      } while (M[0x10] !== 0);
      for (let x = 0; x < 256; x++) { M[0x0528 + x] = M[0x4200 + x]; M[0x0628 + x] = M[0x4300 + x]; col(0x128 + x, 8); col(0x228 + x, 8); }
      yield* H.wait(dyx(0)); yield* H.wait(dyx(0));
      for (let x = 0; x < 0xC8; x++) { M[0x0428 + x] = M[0x4600 + x]; M[0x06F8 + x] = M[0x4700 + x]; col(0x28 + x, 2); col(0x2F8 + x, 2); }
      M[0x25] = M[0x26] = M[0x27] = 0;                      // $1109: 8 x 65,536 increments
      for (let k = 0; k < 8; k++) {
        yield* H.wait(526092);                              // 65,536 INC and BNE, 8 cycles each, and the INC of $27
        M[0x27] = (M[0x27] + 1) & 255;
      }
      K.chrout(0x93);
      M[0x30] = M[0x33] = M[0x34] = 0; M[0x31] = M[0x35] = 0x5F; M[0x32] = M[0x36] = 4;
      sid(0x04, 0x11); sid(0x0B, 0x11); sid(0x12, 0x11); sid(0x16, 0x80);
      M[0x45] = 0;
      sid(0x18, 0x0F);
      return 0x1AF8;
    };

    // $1AF8 menu
    P.stages[0x1AF8] = function* () {
      M[0x07] = 0;
      vicW(0x18, (vicR(0x18) & 0xF0) | 4);
      return 0x1B09;
    };
    // $1B09: the menu again, between previews
    P.stages[0x1B09] = function* () {
      for (let x = 0x0F; x >= 0; x--) M[0x50 + x] = M[0x5C50 + x];
      M[0x02] = 4;
      P.show_menu();
      for (;;) {                                            // $1B1A: the keys, or the next preview
        const a = yield* H.live(0x1B1D, 'getin', 'a');   // the key GETIN gave the game
        if (a === 0x85) { M[0x08] = 1; return 0x115B; }
        if (a === 0x86) { M[0x08] = 2; return 0x115B; }
        M[0x10] = (M[0x10] + 1) & 255;
        if (M[0x10]) continue;
        M[0x11] = (M[0x11] + 1) & 255;
        if (M[0x11]) continue;
        break;
      }
      M[0x07] = (M[0x07] + 1) & 255;
      M[0x02] = 4;
      return [0, 0x6000, 0x6CF5, 0x7600, 0x6595, 0x7200, 0x7E98, 0x7B00][M[0x07]] || 0x1AF8;
    };

    // $115B new_game
    P.stages[0x115B] = function* () {
      vicW(0x18, (vicR(0x18) & 0xF0) | 4);
      vicW(0x16, vicR(0x16) & 0xEF);
      for (let x = 8; x >= 0; x--) M[0x60 + x] = 0;
      M[0x02] = 0;
      M[0x03] = M[0x04] = M[0x05] = M[0x06] = M[0x09] = 0x31;
      return 0x1195;
    };

    // $1195 scorecard, and $122E start_level
    P.stages[0x1195] = function* () {
      M[0x02] = 0; M[0x07] = 0;
      K.chrout(0x93);
      P.draw_scorecard();
      M[0x04D1] = M[0x03]; M[0x04EB] = M[0x04]; M[0x0521] = M[0x05]; M[0x053B] = M[0x06];
      for (let x = 3, y = 0; x >= 0; x--, y += 2) {
        M[0x05E2 + y] = (M[0x60 + x] >> 4) + 0x30; M[0x05FC + y] = (M[0x64 + x] >> 4) + 0x30;
        M[0x05E3 + y] = (M[0x60 + x] & 15) + 0x30; M[0x05FD + y] = (M[0x64 + x] & 15) + 0x30;
      }
      P.show_instructions();
      for (;;) {                                            // $11F6
        M[0x0529] = M[0x09]; M[0x052A] = 0x20; M[0x052B] = 0x15; M[0x052C] = 0x10;
        yield* P.delay_long();
        for (let x = 3; x >= 0; x--) M[0x0529 + x] = 0x20;
        yield* P.delay_long();
        if (((yield* H.live(0x121D, 'joy', 'a')) & 0x1F) !== 0x1F) break;
        K.udtim();
        if (K.stop()) return 0x1000;
      }
      // $122E start_level
      for (const r of [0x17, 0x1D, 0x1B, 0x10, 0x1C]) vicW(r, 0);
      M[0x45] = 0;
      for (let x = 0x1F; x >= 0; x--) M[0x10 + x] = 0;
      const px = M[0x09] === 0x31 ? 0 : 1;
      const ph = M[0x05 + px], tab = ph === 0x31 ? 0x5C50 : ph === 0x32 ? 0x5C60 : ph === 0x33 ? 0x5C70 : 0x5C80;
      for (let x = 0x0F; x >= 0; x--) M[0x50 + x] = M[tab + x];
      const lv = M[0x03 + px];
      return { 0x31: 0x6000, 0x32: 0x6CF5, 0x33: 0x7600, 0x34: 0x6595, 0x35: 0x7200, 0x36: 0x7E98 }[lv] || 0x7B00;
    };
    // $12D5 delay_long
    P.delay_long = function* () { yield* H.wait(dyx(0)); };

    // $1300 level_over
    P.stages[0x1300] = function* () {
      vicW(0x18, (vicR(0x18) & 0xF0) | 4);
      K.chrout(0x93);
      for (const r of [0x15, 0x10, 0x17, 0x1D]) vicW(r, 0);
      vicR(0x16);
      vicW(0x16, 0xC8); vicW(0x11, 0x1B); vicW(0x20, 0); vicW(0x21, 0);
      yield* H.live(0x1335, 'collide', 'a');
      vicW(0x1B, 0);
      M[0x30] = M[0x33] = M[0x34] = 0; M[0x31] = M[0x35] = 0x5F; M[0x32] = M[0x36] = 4;
      sid(0x04, 0x11); sid(0x0B, 0x11); sid(0x12, 0x11);
      if (M[0x07]) return 0x1B09;
      const turn = (x) => {                                  // the player at X: 0 player 1, 4 player 2
        if (M[0x02] === 5) { P.add_achievements(x); return 0x1195; }
        if (x === 0) M[0x45] = 0;
        P.add_win_bonus(x);
        const lv = x ? 0x04 : 0x03, ph = x ? 0x06 : 0x05;
        M[lv] = (M[lv] + 1) & 255;
        if (M[lv] >= 0x38) { M[lv] = 0x31; M[ph] = (M[ph] + 1) & 255; if (M[ph] >= 0x35) return 0x1000; }
        return 0x1195;
      };
      if (M[0x08] !== 2) return turn(0);
      if (M[0x09] === 0x31) { M[0x09] = 0x32; return turn(0); }
      M[0x09] = 0x31;
      return turn(4);
    };
    // $1400 add_win_bonus, falling into $1456
    P.add_win_bonus = function (x) {
      const add = { 4: 2, 3: 4, 2: 6, 1: 8 }[M[0x02]] || 0x10;
      let c = 0, r = H.adcD(M[0x61 + x], add, 0); M[0x61 + x] = r.a; c = r.c;
      if (c) { r = H.adcD(M[0x62 + x], 0, 1); M[0x62 + x] = r.a; if (r.c) { r = H.adcD(M[0x63 + x], 0, 1); M[0x63 + x] = r.a; } }
      M[0x02] = 0;
      P.add_achievements(x);
    };
    // $1456 add_achievements: 10 points, $68 + 1 times
    P.add_achievements = function (x) {
      do {
        let r = H.adcD(M[0x60 + x], 0x10, 0); M[0x60 + x] = r.a;
        for (let k = 1; k < 4; k++) { r = H.adcD(M[0x60 + x + k], 0, r.c); M[0x60 + x + k] = r.a; }
        M[0x68] = (M[0x68] - 1) & 255;
      } while (M[0x68] < 0x80);
      M[0x68] = 0; M[0x02] = 0;
    };
    // $1480 show_instructions
    P.show_instructions = function () {
      const lv = M[M[0x09] === 0x31 ? 0x03 : 0x04];
      const n = lv >= 0x31 && lv <= 0x36 ? lv - 0x31 : 6;
      for (let x = 0xA0; x >= 1; x--) M[0x06A7 + x] = M[0x15FF + 0xA0 * n + x];
    };
    // $1500 show_menu
    P.show_menu = function () {
      for (let x = 7; x >= 0; x--) { M[0x047B + x] = M[0x5D40 + x]; col(0x7B + x, 0x0A); }
      for (let x = 0x18; x >= 0; x--) { M[0x04CD + x] = M[0x5D48 + x]; col(0xCD + x, 5); M[0x051D + x] = M[0x5D61 + x]; col(0x11D + x, 3); }
    };
    // $1530 draw_scorecard
    P.draw_scorecard = function () {
      for (let x = 0; x < 0x3E8; x++) col(x, 1);
      for (let x = 7; x >= 0; x--) { M[0x047A + x] = M[0x5DA4 + x]; M[0x0494 + x] = M[0x5DAC + x]; col(0x7A + x, 7); col(0x94 + x, 0x0E); }
      for (let x = 4; x >= 0; x--) {
        M[0x04CA + x] = M[0x04E4 + x] = M[0x5D7B + x];
        M[0x051A + x] = M[0x0534 + x] = M[0x5D80 + x];
        M[0x0592 + x] = M[0x05AC + x] = M[0x5D85 + x];
        col(0xCA + x, 8); col(0x11A + x, 8); col(0x192 + x, 8);
        col(0xE4 + x, 3); col(0x134 + x, 3); col(0x1AC + x, 3);
      }
      for (let x = 0x19; x >= 0; x--) { M[0x07C6 + x] = M[0x5D8A + x]; col(0x3C6 + x, 0x0A); }
    };
    // $1CA0 music_reset
    P.music_reset = function () {
      M[0x30] = M[0x33] = 0; M[0x36] = 4; M[0x31] = M[0x35] = 0x5F;
      sid(0x12, 0x11); sid(0x0B, 0x11); sid(0x04, 0x11);
      M[0x45] = 0;
    };

    // $1C00 music_irq: every $36 interrupts one step of the tune, six bytes into the three voices'
    // frequencies, $FF ending the tune and starting it again from $30/$31 ($1C87)
    const REG = [0x01, 0x00, 0x08, 0x07, 0x0F, 0x0E];
    P.irqs[0x1C00] = function () {
      M[0x32] = (M[0x32] - 1) & 255;
      if (M[0x32] === 0) {
        M[0x32] = M[0x36];
        for (const r of REG) {
          const p = (M[0x34] | M[0x35] << 8), v = M[(p + M[0x33]) & 0xFFFF];
          if (v === 0xFF) { M[0x33] = 0; M[0x34] = M[0x30]; M[0x35] = M[0x31]; break; }
          sid(r, v);
          M[0x33] = (M[0x33] + 1) & 255;
          if (M[0x33] === 0) M[0x35] = (M[0x35] + 1) & 255;
        }
      }
      vicW(0x1A, 0x10);
    };
    // the KERNAL's own handler, while $0314 still points at it: nothing the game sees
    P.irqs[0xEA31] = function () {};
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
