/* en-g2-screens */
// Into the Eagle's Nest, Play port, group "screens" ($1000-$1FFF): the attract loop (the title
// screen's build and its wait, the credits, valuables and supplies screens with their icons and
// their holds of about three seconds), the hand-over to the game at $1566, the music's start and its
// tick, the YOU ARE DEAD screen, the floor select with its loop and its pause, the mission select and
// its loop, the mission briefing with its hold and the end-of-mission screen with its hold of about
// fifteen seconds. The strings, the tune and the note tables are data, read from P.M. One function
// per listing label, on the game's own memory P.M, its chips through P.io (en-core.js).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ib } = H;
    const plot_char_2x2 = H.call('plot_char_2x2', 0x0A84);
    const install_title_irq = H.call('install_title_irq', 0x0E40);
    const install_plaque_irq = H.call('install_plaque_irq', 0x0F4D);
    // the loop heads and the places a hold or a pause is held at: the attract loop's start (an
    // interrupt the game took before the SEI of the title's install is run there, before the main
    // program's writes to the chips), the title's wait and its way out to the credits, the three
    // holds' inner loops, the hand-over and its wait for fire to be let go, the floor select's loop
    // and its pause, the mission select's loop, the digit's pause, the briefing's hold and the end
    // screen's hold, with their RTS
    for (const a of [0x1017, 0x10AF, 0x10BD, 0x1262, 0x13E5, 0x154F, 0x1566, 0x15D7, 0x1C6C, 0x1C8A, 0x1D99, 0x1DA7,
      0x1DD9, 0x1F05, 0x1F14, 0x1FEB, 0x1FFA]) P.checkpoints.add(a);
    P.irqBytes.add(0x1012);                                          // fade_phase, which the title's interrupt moves on
    const joy = () => rd(0xDC00);
    const fire = () => !(joy() & 0x10);
    // a string from a through the plotter at $0A84, ending at the byte end; mask: each character ANDed
    // with $3F first (the VASE, PENDANT and GEMSTONES loops store it as it is)
    const plotString = (a, end, mask) => {
      for (let x = 0; ; x = (x + 1) & 255) {
        const v = M[(a + x) & 0xFFFF];
        if (v === end) return;
        M[0x0A7F] = mask ? v & 0x3F : v;
        plot_char_2x2();
      }
    };
    const plotAt = (col, row) => { M[0x0A80] = col; M[0x0A81] = row; };
    const colours = (top, bottom) => { M[0x0A82] = top; M[0x0A83] = bottom; };
    // the four pages of the screen at $0400 filled with the big alphabet's space, from X down
    const fillScreen = (x) => {
      do { M[0x0400 + x] = 0x80; M[0x0500 + x] = 0x80; M[0x0600 + x] = 0x80; M[0x0700 + x] = 0x80; x = (x - 1) & 255; } while (x !== 0);
    };
    // the four pages of colour memory cleared, x = 0 first, then $FF down to 1
    const clearColour = () => {
      let x = 0;
      do { wr(0xD800 + x, 0); wr(0xD900 + x, 0); wr(0xDA00 + x, 0); wr(0xDB00 + x, 0); x = (x - 1) & 255; } while (x !== 0);
    };
    // CIA 2's port A: video bank 0 (both bits high)
    const videoBank0 = () => {
      wr(0xDD02, rd(0xDD02) | 0x03);
      wr(0xDD00, (rd(0xDD00) & 0xFC) | 0x03);
    };
    // a hold of 255 times 255 turns, each a count of four and a look at fire on control port 2: one
    // checkpoint a turn at the inner loop's head, with the cycles of the turn before (42, or 48 when it
    // took the outer loop's step too). True when fire was pressed.
    function* hold(head) {
      let first = true;
      for (let x = 0xFF; x !== 0; x--) {
        for (let y = 0xFF; y !== 0; y--) {
          yield first ? { cp: head } : { cp: head, cycles: y === 0xFF ? 48 : 42 };
          first = false;
          if (fire()) return true;
        }
      }
      return false;
    }

    // ---------------------------------------------------------------- the title screen
    // the attract loop: the music started once, then the title, the credits, the valuables and the
    // supplies, round to $1017 (the supplies' hold returns { at: 0x1017 }) until fire is pressed.
    // Returns { at: 0x4000 }, the game's entry, where the hand-over at $1566 jumps.
    P.build_title_screen = function* () {                            // $1014
      P.music_init();
      for (;;) {
        yield { cp: 0x1017 };                                        // j_1017
        M[0x1012] = 1;
        M[0x1011] = 0; M[0x1013] = 0;
        install_title_irq();
        videoBank0();
        wr(0xD018, 0x1A); wr(0xD016, 0xC8);
        fillScreen(0);
        plotAt(0, 0); colours(0, 0);
        plotString(0x0E2C, 0xFF, true);                              // TODAY'S REAL HEROES
        plotAt(0, 3); colours(0, 0);
        for (let x = 0; x !== 0xC8; x++) {                           // b_1095: the table, 200 characters
          M[0x0A7F] = M[0x0D50 + x] & 0x3F;
          plot_char_2x2();
        }
        wr(0xD011, 0x1B);
        M[0x1012] = 0;
        const r = yield* P.wait_on_title();
        if (r.at !== 0x1017) return r;
      }
    };
    P.wait_on_title = function* () {                                 // $10AF
      let first = true;
      for (;;) {
        yield first ? { cp: 0x10AF } : { cp: 0x10AF, cycles: 17 };
        first = false;
        if (fire()) return yield* P.mission_select_setup();         // b_10C5
        if (ib(0x1012) === 4) {
          // held here too: an interrupt the game took between the loop's head and its read of $1012 (the
          // one that set it to 4, after its last step of the fade) runs before the credits are drawn
          yield { cp: 0x10BD, cycles: 16 };
          wr(0xD011, 0x7B);
          return yield* P.build_credits_screen();
        }
      }
    };

    // ---------------------------------------------------------------- the icons' frame
    // thirteen rows of four cells of $E8 from $05E7 and its colour from $8600 at $D9E7, through the
    // operands of the two stores, which it rewrites a row at a time
    P.draw_icon_frames = function () {                               // $113A
      M[0x1153] = 0xE7; M[0x1159] = 0xE7;
      M[0x1154] = 0x05;
      M[0x115A] = 0xD9;
      for (let x = 0; x !== 0x0D; x++) {                             // b_114E
        for (let y = 3; y >= 0; y--) {                               // b_1150
          M[(M[0x1153] | M[0x1154] << 8) + y & 0xFFFF] = 0xE8;
          wr((M[0x1159] | M[0x115A] << 8) + y, M[0x8600]);
        }
        const s = M[0x1153] + 0x28;
        M[0x1153] = s & 255; M[0x1159] = s & 255;
        if (s > 255) { M[0x1154] = (M[0x1154] + 1) & 255; M[0x115A] = (M[0x115A] + 1) & 255; }
      }
    };

    // ---------------------------------------------------------------- the credits
    P.build_credits_screen = function* () {                          // $11AB
      fillScreen(0);
      wr(0xD022, 0x0B); wr(0xD023, 0x0C);
      install_plaque_irq();
      plotAt(0x01, 0x0B); colours(0x06, 0x03);
      plotString(0x10C8, 0xFF, true);                                // PROGRAMMING BY
      plotAt(0x01, 0x0E);
      plotString(0x10D9, 0xFF, true);                                // ANDREW CHALLIS
      plotAt(0x00, 0x12); colours(0x05, 0x07);
      plotString(0x10EA, 0xFF, true);                                // GRAPHICS BY
      plotAt(0x00, 0x15);
      plotString(0x10FA, 0xFF, true);                                // ROBIN CHAPMAN
      return yield* P.wait_on_credits();
    };
    P.wait_on_credits = function* () {                               // $125E
      if (yield* hold(0x1262)) return yield* P.mission_select_setup();   // b_125B
      return yield* P.copy_valuable_icons();
    };

    // ---------------------------------------------------------------- the valuables
    P.copy_valuable_icons = function* () {                           // $1276
      for (let x = 0x3F; x >= 0; x--) M[0x2F40 + x] = M[0x2000 + x];
      for (let x = 0x1F; x >= 0; x--) {                              // b_1283
        M[0x2F80 + x] = M[0x20A0 + x]; M[0x2FA0 + x] = M[0x20C0 + x];
        M[0x2FC0 + x] = M[0x2140 + x]; M[0x2FE0 + x] = M[0x2330 + x];
      }
      return yield* P.build_valuables_screen({ x: 0 });
    };
    P.build_valuables_screen = function* (r) {                       // $12A0
      fillScreen(r.x & 255);
      P.draw_icon_frames();
      return yield* P.place_valuable_icons();
    };
    P.place_valuable_icons = function* () {                          // $12B4
      M[0x0610] = 0xF0; M[0x0611] = 0xF1; M[0x0638] = 0xF2; M[0x0639] = 0xF3;
      let c = M[0x8614];
      wr(0xDA10, c); wr(0xDA11, c); wr(0xDA38, c); wr(0xDA39, c);
      M[0x0688] = 0xF4; M[0x0689] = 0xF7; M[0x06B0] = 0xF5; M[0x06B1] = 0xF6;
      wr(0xDA88, M[0x8618]); wr(0xDA89, M[0x861B]); wr(0xDAB0, M[0x8619]); wr(0xDAB1, M[0x861A]);
      M[0x0700] = 0xF8; M[0x0701] = 0xF9; M[0x0728] = 0xFA; M[0x0729] = 0xFB;
      c = M[0x8628];
      wr(0xDB00, c); wr(0xDB01, c); wr(0xDB28, c); wr(0xDB29, c);
      M[0x0778] = 0xFE; M[0x0779] = 0xFF; M[0x07A0] = 0xFC; M[0x07A1] = 0xFD;
      c = M[0x8666];
      wr(0xDB78, c); wr(0xDB79, c); wr(0xDBA0, c); wr(0xDBA1, c);
      plotAt(0x00, 0x09); colours(0x04, 0x03);
      return yield* P.draw_valuables_text({ x: 0 });
    };
    P.draw_valuables_text = function* (r) {                          // $135F
      for (let x = r.x & 255; ; x = (x + 1) & 255) {                 // the heading, from X
        const v = M[0x110B + x];
        if (!v) break;
        M[0x0A7F] = v & 0x3F;
        plot_char_2x2();
      }
      plotAt(0x0E, 0x0D);
      plotString(0x111A, 0, true);                                   // PAINTING
      plotAt(0x0E, 0x10);
      plotString(0x1123, 0, false);                                  // VASE
      plotAt(0x0E, 0x13);
      plotString(0x1128, 0, false);                                  // PENDANT
      plotAt(0x0E, 0x16);
      plotString(0x1130, 0, false);                                  // GEMSTONES
      return yield* P.wait_on_valuables();
    };
    P.wait_on_valuables = function* () {                             // $13E1
      if (yield* hold(0x13E5)) return yield* P.mission_select_setup();   // b_13DE
      return yield* P.copy_supply_icons();
    };

    // ---------------------------------------------------------------- the supplies
    P.copy_supply_icons = function* () {                             // $13F9
      for (let x = 0x1F; x >= 0; x--) { M[0x2F80 + x] = M[0x20E0 + x]; M[0x2FE0 + x] = M[0x2100 + x]; }
      for (let x = 0x0F; x >= 0; x--) { M[0x2FA0 + x] = M[0x2080 + x]; M[0x2FC0 + x] = M[0x2090 + x]; }   // b_140C
      for (let x = 0x07; x >= 0; x--) {                              // b_141D
        const v = M[0x2000 + x];
        M[0x2FB0 + x] = v; M[0x2FB8 + x] = v; M[0x2FD0 + x] = v; M[0x2FD8 + x] = v;
      }
      return yield* P.build_supplies_screen();
    };
    P.build_supplies_screen = function* () {                         // $142F
      P.draw_icon_frames();
      M[0x0610] = 0xF0; M[0x0611] = 0xF1; M[0x0638] = 0xF2; M[0x0639] = 0xF3;
      let c = M[0x861C];
      wr(0xDA10, c); wr(0xDA11, c); wr(0xDA38, c); wr(0xDA39, c);
      M[0x0688] = 0xF4; M[0x0689] = 0xF5;
      c = M[0x8610];
      wr(0xDA88, c); wr(0xDA89, c);
      M[0x0700] = 0xF8; M[0x0701] = 0xF9;
      c = M[0x8612];
      wr(0xDB00, c); wr(0xDB01, c);
      M[0x0778] = 0xFC; M[0x0779] = 0xFD; M[0x07A0] = 0xFF; M[0x07A1] = 0xFE;
      c = M[0x8620];
      wr(0xDB78, c); wr(0xDB79, c); wr(0xDBA0, c); wr(0xDBA1, c);
      M[0x0777] = 0xEB; M[0x079F] = 0xEC; M[0x07C7] = 0xEF; M[0x07C8] = 0xED; M[0x07C9] = 0xEA;
      return yield* P.draw_supplies_text();
    };
    P.draw_supplies_text = function* () {                            // $14B7
      plotAt(0x0A, 0x09);
      plotString(0x1178, 0, true);                                   // SUPPLIES
      plotAt(0x0E, 0x0D);
      plotString(0x1183, 0, true);                                   // COLD FOOD
      plotAt(0x0E, 0x10);
      plotString(0x118D, 0, true);                                   // DOOR KEY
      plotAt(0x0E, 0x13);
      plotString(0x1196, 0, true);                                   // AMMUNITION
      plotAt(0x0E, 0x16);
      plotString(0x11A1, 0, true);                                   // FIRST AID
      return yield* P.wait_on_supplies();
    };
    P.wait_on_supplies = function* () {                              // $154B
      if (yield* hold(0x154F)) return yield* P.mission_select_setup();   // b_1548
      return { at: 0x1017 };                                         // jmp j_1017, in build_title_screen
    };

    // ---------------------------------------------------------------- the hand-over to the game
    P.mission_select_setup = function* () {                          // $1566
      yield { cp: 0x1566 };
      P.sei();
      wr(0xD020, 0); wr(0xD021, 0);
      wr(0xD011, 0x0B);
      clearColour();
      videoBank0();
      wr(0xD016, 0xC8); wr(0xD018, 0x15);
      wr(0xD01A, rd(0xD01A) & 0xFE);
      wr(0xDC0E, 0x01);
      rd(0xDC0D);
      M[0x0314] = 0x31; M[0x0315] = 0xEA;
      wr(0x0001, 0x37);
      for (let x = 0; x !== 0x19; x++) { wr(0xD400 + x, 0x08); wr(0xD400 + x, 0x00); }   // b_15C3
      wr(0xD011, 0x1B);
      let first = true;
      do {                                                           // b_15D7: fire let go
        yield first ? { cp: 0x15D7 } : { cp: 0x15D7, cycles: 9 };
        first = false;
      } while (fire());
      P.cli();
      return { at: 0x4000 };                                         // jmp game_entry
    };

    // ---------------------------------------------------------------- the music
    P.music_init = function () {                                     // $18D6
      for (let x = 0; x !== 0x19; x++) { wr(0xD400 + x, 0x08); wr(0xD400 + x, 0x00); }   // b_18D8
      wr(0xD405, 0x70); wr(0xD40C, 0x75); wr(0xD413, 0x00);
      wr(0xD406, 0x90); wr(0xD40D, 0x00); wr(0xD414, 0x60);
      wr(0xD403, 0x08); wr(0xD40A, 0x05); wr(0xD411, 0x0B);
      M[0x1933] = 1; M[0x1934] = 1; M[0x1935] = 1;
      M[0x1936] = 0; M[0x1937] = 0; M[0x1938] = 0;
      wr(0xD418, 0x0F);
    };
    // one tick in three: each voice's count down, and at zero its next note from its own stream; a
    // note $FF taken by voice 1 starts all three streams again, from voice 1, in the same tick
    P.music_driver = function () {                                   // $1947
      if (M[0x1945] !== 2) { M[0x1945] = (M[0x1945] + 1) & 255; return; }
      for (;;) {                                                     // b_1952
        M[0x1945] = 0;
        let ended = false;
        for (let v = 0; v !== 3 && !ended; v = M[0x193F]) {          // j_1959
          M[0x193F] = v; M[0x1940] = v;
          if (v === 1) M[0x1940] = 0x07;
          if (v === 2) M[0x1940] = 0x0E;
          const x = M[0x193F];
          const n = M[0x1933 + x] = (M[0x1933 + x] - 1) & 255;
          if (n === 0) {                                             // b_197C
            const y = M[0x1936 + x];
            if (x === 0) M[0x1941] = M[0x15E2 + y];
            if (x === 1) M[0x1942] = M[0x1680 + y];
            if (x === 2) M[0x1943] = M[0x1768 + y];
            if (M[0x1941] === 0xFF) {                                // b_19FB: the tune's end
              M[0x1933] = 1; M[0x1934] = 1; M[0x1935] = 1;
              M[0x1936] = 0; M[0x1937] = 0; M[0x1938] = 0;
              ended = true;
              break;
            }
            const note = M[0x1941 + x];
            M[0x1939 + x] = M[0x17F8 + note];
            M[0x193C + x] = M[0x1842 + note];
            M[0x1933 + x] = M[0x188C + note];
            const o = M[0x1940];
            wr(0xD404 + o, M[0x1930 + x] & 0xFE);
            if (M[0x1939 + x] === 0xFF) {                            // a rest
              wr(0xD400 + o, 0); wr(0xD401 + o, 0);
            } else {                                                 // b_19D8
              wr(0xD400 + o, M[0x193C + x]);
              wr(0xD401 + o, M[0x1939 + x]);
              wr(0xD404 + o, M[0x1930 + x]);
            }
            M[0x1936 + x] = (M[0x1936 + x] + 1) & 255;               // j_19EA
          }
          M[0x193F] = (M[0x193F] + 1) & 255;                         // j_19ED
        }
        if (!ended) return;                                          // r_19FA
      }
    };

    // ---------------------------------------------------------------- YOU ARE DEAD
    P.draw_you_are_dead = function () {                              // $1A21
      P.sei();
      clearColour();
      wr(0xD018, 0x1B); wr(0xD016, 0xC8); wr(0xD011, 0x1B);
      colours(0x06, 0x0E);
      plotAt(0x07, 0x08);
      plotString(0x1A14, 0, true);                                   // YOU ARE DEAD
    };

    // ---------------------------------------------------------------- the floor select
    P.floor_select_screen = function* () {                           // $1AB2
      wr(0xD011, 0x6B);
      wr(0xD020, 0); wr(0xD021, 0);
      clearColour();
      wr(0xD018, 0x1B); wr(0xD016, 0xD8);
      wr(0xD022, 0x06); wr(0xD023, 0x0E);
      plotAt(0x08, 0x04); colours(0x06, 0x03);
      plotString(0x1A6B, 0, true);                                   // SELECT FLOOR
      plotAt(0x06, 0x08); colours(0x07, 0x01);
      plotString(0x1A78, 0, true);                                   // BASEMENT
      plotAt(0x06, 0x0A);
      plotString(0x1A86, 0, true);                                   // GROUND FLOOR
      plotAt(0x06, 0x0C);
      plotString(0x1A94, 0, true);                                   // FIRST FLOOR
      plotAt(0x06, 0x0E);
      plotString(0x1AA2, 0, true);                                   // SECOND FLOOR
      colours(0x09, 0x09);
      for (const row of [0x08, 0x0A, 0x0C, 0x0E]) {                  // b_1B88: the four blank markers
        plotAt(0x20, row);
        M[0x0A7F] = 0x1B;
        plot_char_2x2();
      }
      for (let x = 0; x !== 0x1C; x++) {                             // b_1BDA: the frame's top and bottom
        M[0x051E + x] = 0xAC;
        M[0x0686 + x] = 0xAE;
        wr(0xD91E + x, M[0x1AB0]);
        wr(0xDA86 + x, M[0x1AB0]);
      }
      M[0xFC] = 0x45; M[0xFD] = 0x05; M[0xFE] = 0x45; M[0xFF] = 0xD9;
      for (let x = 0; x !== 0x08; x++) {                             // b_1C04: its two sides
        M[(H.ptr(0xFC) + 0x00) & 0xFFFF] = 0xAF;
        M[(H.ptr(0xFC) + 0x1D) & 0xFFFF] = 0xAD;
        const c = M[0x1AB0];
        wr(H.ptr(0xFE) + 0x1D, c);
        wr(H.ptr(0xFE) + 0x00, c);
        const s = M[0xFC] + 0x28;
        M[0xFC] = s & 255; M[0xFE] = s & 255;
        if (s > 255) { M[0xFD] = (M[0xFD] + 1) & 255; M[0xFF] = (M[0xFF] + 1) & 255; }
      }
      M[0x051D] = 0xA8; M[0x0685] = 0xA9; M[0x053A] = 0xAA; M[0x06A2] = 0xAB;   // its corners
      const c = M[0x1AB0];
      wr(0xD91D, c); wr(0xDA85, c); wr(0xD93A, c); wr(0xDAA2, c);
      wr(0xD011, 0x1B);
      return yield* P.floor_select_input();
    };
    // the marker ($1C) or its blank ($1B) at column 32 of the chosen floor's row, 8 plus twice the floor
    const floorMarker = (ch) => {
      M[0x0A81] = (((M[0x1AB1] << 1) & 255) + 0x08) & 255;
      M[0x0A80] = 0x20;
      M[0x0A7F] = ch;
      plot_char_2x2();
    };
    // the floor the lift is on marked, then up and down move the marker and fire returns the floor in A
    P.floor_select_input = function* () {                            // $1C52
      M[0x1AB1] = M[0x02A7];
      floorMarker(0x1C);
      let cycles;
      for (;;) {
        yield cycles === undefined ? { cp: 0x1C6C } : { cp: 0x1C6C, cycles };   // j_1C6C
        cycles = 28;
        if (fire()) return { a: M[0x1AB1] };
        if (!(joy() & 0x01)) {                                       // b_1C9C: up, a floor down the list's numbers
          floorMarker(0x1B);
          let v = M[0x1AB1] = (M[0x1AB1] - 1) & 255;
          if (v & 0x80) v = 0x03;
          M[0x1AB1] = v;                                             // b_1CBD
          floorMarker(0x1C);
          yield* P.floor_select_delay();
          cycles = 7;
        } else if (!(joy() & 0x02)) {                                // b_1CD7: down
          floorMarker(0x1B);
          let v = M[0x1AB1] = (M[0x1AB1] + 1) & 255;
          if (v === 0x04) v = 0x00;
          M[0x1AB1] = v;                                             // b_1CFA
          floorMarker(0x1C);
          yield* P.floor_select_delay();
          cycles = 7;
        }
      }
    };
    // 255 turns of a count of 128 (about eight frames), a checkpoint a turn, then the wait for raster
    // line $F0, a bare yield a line; the caller's loop goes on at $1C6C
    P.floor_select_delay = function* () {                            // $1C88
      for (let x = 0xFF; x !== 0; x--) {                             // b_1C8A
        yield { cp: 0x1C8A, cycles: x === 0xFF ? 2 : 2 + 0x80 * 5 - 1 + 5 };
      }
      yield { cycles: 2 + 0x80 * 5 - 1 + 4 };                         // the last turn, to the raster's first read
      while (rd(0xD012) !== 0xF0) yield;                             // b_1C92
    };

    // ---------------------------------------------------------------- the mission select
    P.mission_select_screen = function* () {                         // $1D23
      wr(0xD020, 0); wr(0xD021, 0);
      wr(0xD011, 0x6B);
      M[0x0836] = 0x01;
      clearColour();
      wr(0xD018, 0x1B); wr(0xD016, 0xC8);
      plotAt(0x06, 0x06); colours(0x0C, 0x0F);
      plotString(0x1D14, 0, true);                                   // SELECT MISSION
      plotAt(0x12, 0x0A); colours(0x0C, 0x0B);
      M[0x0A7F] = 0x34;
      plot_char_2x2();
      wr(0xD011, 0x1B);
      return yield* P.mission_select_input();
    };
    // fire shows the briefing and returns the mission in A; up and down step it, and the digit's pause
    // goes back to the stick's test at $1DA7, past fire's
    P.mission_select_input = function* () {                          // $1D99
      let cycles;
      for (;;) {
        yield cycles === undefined ? { cp: 0x1D99 } : { cp: 0x1D99, cycles };
        if (fire()) {
          yield* P.mission_briefing();
          return { a: M[0x0836] };
        }
        yield { cp: 0x1DA7, cycles: 9 };                             // b_1DA7
        for (;;) {
          if (!(joy() & 0x01)) yield* P.mission_number_up();         // each ends at $1DA7
          else if (!(joy() & 0x02)) yield* P.mission_number_down();  // b_1DB1
          else break;                                                // b_1DBB: jmp mission_select_input
        }
        cycles = 21;
      }
    };
    // the digit, five less the mission number, at row 10, column 18; then 255 turns of a count of 224
    // (about fifteen frames), a checkpoint a turn, and the jump back to $1DA7, the last yield
    P.draw_mission_digit = function* () {                            // $1DBE
      plotAt(0x12, 0x0A);
      M[0x0A7F] = (((5 - M[0x0836]) & 255) + 0x30) & 255;
      plot_char_2x2();
      for (let x = 0xFF; x !== 0; x--) {                             // b_1DD9
        yield { cp: 0x1DD9, cycles: x === 0xFF ? 2 : 2 + 0xE0 * 5 - 1 + 5 };
      }
      yield { cp: 0x1DA7, cycles: 2 + 0xE0 * 5 - 1 + 4 + 3 };        // the last turn and the JMP
    };
    P.mission_number_up = function* () {                             // $1DE4
      let v = M[0x0836] = (M[0x0836] + 1) & 255;
      if (v === 0x05) v = 0x01;
      M[0x0836] = v;                                                 // b_1DF0
      yield* P.draw_mission_digit();
    };
    P.mission_number_down = function* () {                           // $1DF6
      let v = M[0x0836] = (M[0x0836] - 1) & 255;
      if (v === 0) v = 0x04;
      M[0x0836] = v;                                                 // b_1E00
      yield* P.draw_mission_digit();
    };

    // ---------------------------------------------------------------- the briefing
    P.mission_briefing = function* () {                              // $1E3F
      wr(0xD011, 0x6B);
      clearColour();
      wr(0xD018, 0x1B); wr(0xD016, 0xC8);
      plotAt(0x0B, 0x06); colours(0x0C, 0x0F);
      plotString(0x1E06, 0, true);                                   // MISSION
      plotAt(0x0B, 0x08);
      plotString(0x1E0E, 0, true);                                   // the dashes
      plotAt(0x1B, 0x06);
      M[0x0A7F] = (((5 - M[0x0836]) & 255) + 0x30) & 255;
      plot_char_2x2();
      if (M[0x0836] !== 0x04) {
        plotAt(0x01, 0x0C);
        plotString(0x1E18, 0, true);                                 // RESCUE THE PRISONER
      } else {
        plotAt(0x02, 0x0C);                                          // b_1EE1
        plotString(0x1E2C, 0, true);                                 // BLOW UP THE CASTLE
      }
      wr(0xD011, 0x1B);                                              // b_1EFE
      yield* P.briefing_delay();
    };
    // 255 times 255 turns of a count of four, no test of the stick: a checkpoint each turn of the
    // outer loop with the cycles of the turn before, and the last at the RTS
    P.briefing_delay = function* () {                                // $1F03
      const turn = 2 + 0xFF * 34 - 1;                                // ldy, 255 turns of lda, the count, dey, bne
      for (let x = 0xFF; x !== 0; x--) {                             // b_1F05
        yield { cp: 0x1F05, cycles: x === 0xFF ? 2 : turn + 5 };
      }
      yield { cp: 0x1F14, cycles: turn + 4 };
      return { a: 0, x: 0, y: 0 };
    };

    // ---------------------------------------------------------------- the end of the mission
    P.mission_result_screen = function* () {                         // $1F3C
      wr(0xD011, 0x6B);
      videoBank0();
      wr(0xD016, 0xC8); wr(0xD018, 0x1B);
      clearColour();
      wr(0xD011, 0x1B);
      plotAt(0x09, 0x05); colours(0x0C, 0x0F);
      plotString(0x1F15, 0, true);                                   // WELL DONE !
      plotAt(0x02, 0x0A); colours(0x0C, 0x0F);
      plotString(0x1F21, 0, true);                                   // YOUR MISSION WAS A
      plotAt(0x0C, 0x0D); colours(0x0C, 0x0F);
      plotString(0x1F34, 0, true);                                   // SUCCESS
      // b_1FE9: 255 times 255 turns of a count of 32, about fifteen seconds
      const turn = 2 + 0xFF * (2 + 0x20 * 7 - 1 + 5) - 1;
      for (let x = 0xFF; x !== 0; x--) {                             // b_1FEB
        yield { cp: 0x1FEB, cycles: x === 0xFF ? 2 : turn + 5 };
      }
      yield { cp: 0x1FFA, cycles: turn + 4 };
      return { a: 0, x: 0, y: 0 };
    };
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
