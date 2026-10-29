/* en-g6-state */
// Into the Eagle's Nest, Play port, group "state" ($5600-$5FFF): the message printer and the message
// line's scroll-in, the status panel and its numbers, the idle nags, the score ticker, the floor
// announcement, the player stamped into the castle map for the figures to see, the mission's state
// and the explosion, the six-by-six tile grid round a place and its reader, the jewels taken from an
// open chest, the player's start place, the end-of-mission check, the dynamite charge's place, the
// SPACE scan and the short delay. The messages' text at $5609-$592A is data, read from P.M. One
// function per listing label, on the game's own memory P.M, its chips through P.io (en-core.js).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ptr } = H;
    const map_address = H.call('map_address', 0x51CD);
    const figures_turn = H.call('figures_turn', 0x6044);             // go_figures_turn $6000
    const prisoner_turn = H.call('prisoner_turn', 0x6C3B);           // go_prisoner_turn $601E
    const open_the_chest = H.call('open_the_chest', 0x55BB);

    const GRID = 0x5C22;                                             // the six-by-six tile grid
    // a message for the line at the bottom of the screen, at hi:lo
    const say = (lo, hi) => { M[0xFC] = lo; M[0xFD] = hi; P.print_message(); };
    const idle = () => M[0x592B] === M[0x592C];
    // (z),y
    const at = (z, y) => (ptr(z) + (y & 255)) & 0xFFFF;
    // the pointer at zero page z moved on (or back) by d, its carry or borrow taken to the high byte
    const add16 = (z, d) => {
      const s = M[z] + d;
      M[z] = s & 255;
      if (s > 255) M[z + 1] = (M[z + 1] + 1) & 255;
      else if (s < 0) M[z + 1] = (M[z + 1] - 1) & 255;
    };

    // ---------------------------------------------------------------- the message line
    // the text at ($FC) up to its "@", each character masked to six bits, into the buffer at $8800
    // from the write position $592C, a space after it; the write position left after the space
    P.print_message = function () {                                  // $592E
      let x = M[0x592C];
      for (let y = 0; ; y = (y + 1) & 255) {                         // j_5935
        const ch = M[at(0xFC, y)];
        if (ch === 0x40) break;
        M[0x8800 + x] = ch & 0x3F;
        x = (x + 1) & 255;
      }
      M[0x8800 + x] = 0x20;
      M[0x592C] = (x + 1) & 255;
    };
    // the next half of the next character into the line's right-hand end, two cells high
    P.scroll_message_in = function () {                              // $5951
      if (M[0x592B] === M[0x592C]) { M[0x07BF] = 0x80; M[0x07E7] = 0x80; return; }
      let x = (M[0x8800 + M[0x592B]] << 2) & 255;
      if (M[0x592D]) {                                               // the right half
        x = (x + 2) & 255;
        M[0x07BF] = x; M[0x07E7] = (x + 1) & 255;
        M[0x592D] = 0;
        M[0x592B] = (M[0x592B] + 1) & 255;
        return;
      }
      M[0x07BF] = x; M[0x07E7] = (x + 1) & 255;
      M[0x592D] = 1;
    };

    // ---------------------------------------------------------------- the panel
    P.draw_panel_numbers = function () {                             // $5995
      const two = (v, a) => { P.byte_to_digits({ a: v }); M[a] = M[0x02BB]; M[a + 1] = M[0x02BC]; };
      two(M[0x02AC], 0x04C4);                                        // keys
      M[0x02CA] = ((((M[0x02DF] - 0x20) & 255) >> 3) + M[0xFE]) & 255;
      M[0x02CB] = ((((M[0x02E0] - 0x3A) & 255) >> 3) + M[0xFF]) & 255;
      two(M[0x02BD], 0x0514);                                        // ammunition
      two(M[0x02C2], 0x05D7);                                        // the score
      two(M[0x02C3], 0x05D9);
      two(M[0x02C4], 0x05DB);
      two(M[0x02C6], 0x0564);                                        // hits
    };
    // a decimal byte's two digits as screen codes $F0-$F9: high in $02BB, low in $02BC
    P.byte_to_digits = function (r) {                                // $5A20
      const v = r.a & 255;
      M[0x02BC] = v | 0xF0;
      M[0x02BB] = (v >> 4) | 0xF0;
      return { a: M[0x02BB], y: v };
    };

    // ---------------------------------------------------------------- nags and the score
    P.idle_nags = function () {                                      // $5A33
      M[0x02C1] = (M[0x02C1] + 1) & 255;
      if (M[0x02C1] !== 0x80) return;
      let clear = true;
      if ((rd(0xDC00) & 0x0F) === 0x0F && idle()) {
        M[0x02BF] = (M[0x02BF] + 1) & 255;
        if (M[0x02BF] === 0x0E) say(0x2C, 0x57);                     // COME ON ! GET ON WITH IT.....
        else clear = false;
      }
      if (clear) M[0x02BF] = 0;                                      // b_5A6D
      if ((rd(0xDC00) & 0x10) && idle()) {                           // j_5A72
        M[0x02C0] = (M[0x02C0] + 1) & 255;
        if (M[0x02C0] !== 0x07) return;
        say(0x4A, 0x57);                                             // LETS GET DOWN TO SOME SERIOUS DESTRUCTION !
      }
      M[0x02C0] = 0;                                                 // b_5A9A
    };
    // one waiting point a call into the score's middle pair of digits, carried into the top pair
    P.score_ticker = function () {                                   // $5AA0
      if (!M[0x02C5]) return;
      M[0x02C5] = (M[0x02C5] - 1) & 255;
      const s = H.adcD(M[0x02C3], 1, 0);
      M[0x02C3] = s.a;
      M[0x02C2] = H.adcD(M[0x02C2], 0, s.c).a;
    };
    P.announce_floor = function () {                                 // $5ABD
      say(0x57, 0x58);                                               // YOU ARE
      const f = M[0x02A7];
      if (f === 0) say(0x08, 0x58);                                  // IN THE BASEMENT.
      else if (f === 1) say(0x19, 0x58);                             // ON THE GROUND FLOOR.
      else if (f === 2) say(0x2E, 0x58);                             // ON THE FIRST FLOOR.
      else if (f === 3) say(0x42, 0x58);                             // ON THE SECOND FLOOR.
    };

    // ---------------------------------------------------------------- the player in the map
    // tile $55 over the player's four by four square at ($02), map rows $80 apart, what was there kept
    // a row to each of the buffers $5B0B, $5B0F, $5B13, $5B17; the figures' turn (and the prisoner's
    // first, unless $02F0 is 1); then the square put back
    P.stamp_player_in_map = function () {                            // $5B1B
      M[0x02B6] = M[0x02DF]; M[0x02B7] = M[0x02E0];
      map_address();
      for (let y = 0; y < 4; y++) {                                  // b_5B2C
        M[0x5B0B + y] = rd(at(0x02, y)); wr(at(0x02, y), 0x55);
        M[0x03] = (M[0x03] + 1) & 255;
        M[0x5B13 + y] = rd(at(0x02, y)); wr(at(0x02, y), 0x55);
        const row3 = rd(at(0x02, y | 0x80)); wr(at(0x02, y | 0x80), 0x55);
        M[0x03] = (M[0x03] - 1) & 255;
        const row1 = rd(at(0x02, y | 0x80)); wr(at(0x02, y | 0x80), 0x55);
        M[0x5B0F + y] = row1; M[0x5B17 + y] = row3;
      }
      const lo = M[0x02], hi = M[0x03];
      if (M[0x02F0] !== 1) prisoner_turn();
      figures_turn();
      M[0x03] = hi; M[0x02] = lo;                                    // j_5B7E
      for (let y = 0; y < 4; y++) {                                  // b_5B86
        wr(at(0x02, y), M[0x5B0B + y]);
        M[0x03] = (M[0x03] + 1) & 255;
        wr(at(0x02, y), M[0x5B13 + y]);
        const row1 = M[0x5B0F + y], row3 = M[0x5B17 + y];
        wr(at(0x02, y | 0x80), row3);
        M[0x03] = (M[0x03] - 1) & 255;
        wr(at(0x02, y | 0x80), row1);
      }
      if (M[0x603F]) M[0x02BD] = 0x99;                               // the cheat: ammunition full
    };

    // ---------------------------------------------------------------- the mission's state
    // $02D3: 0 in play (the player dies at fifty hits), 1-$12 a step of the explosion, $FF over
    P.mission_state = function () {                                  // $5BBA
      const p = M[0x02D3];
      if (p === 0xFF) { wr(0xD020, 0); wr(0xD021, 0); return; }      // b_5C08
      if (p === 0) {
        if (M[0x02C6] >= 0x50) { M[0x02D3] = 0xFF; return; }
        if (M[0x603F]) M[0x02AC] = 1;                                // the cheat: a key always
        return;
      }
      const x = (p - 1) & 255;                                       // b_5BDD
      const c = M[0x5C11 + x];
      wr(0xD021, c); wr(0xD020, c);
      if (x !== 0x11) { M[0x02D3] = (p + 1) & 255; return; }
      M[0x02D4] = (M[0x02D4] + 1) & 255;                             // b_5BF2: a round done
      M[0x02D3] = M[0x02D4] === 5 ? 0xFF : 1;
    };

    // ---------------------------------------------------------------- the tile grid
    P.tiles_round_player = function () {                             // $5C46
      M[0x02B6] = M[0x02DF]; M[0x02B7] = M[0x02E0];
      map_address();
      P.read_tile_grid();
    };
    // the six by six map tiles from ($02) less $81 into the grid, $06 and $07 left at that address;
    // each column read in the order of rows 0, 2, 4, 5, 3, 1
    P.read_tile_grid = function () {                                 // $5C55
      M[0x07] = M[0x03];
      const s = M[0x02] - 0x81;
      M[0x06] = s & 255;
      if (s < 0) M[0x07] = (M[0x07] - 1) & 255;
      for (let x = 0; x < 6; x++) {                                  // b_5C6E
        const y = x;
        M[GRID + x] = rd(at(0x06, y));
        M[0x07] = (M[0x07] + 1) & 255;
        M[0x5C2E + x] = rd(at(0x06, y));
        M[0x07] = (M[0x07] + 1) & 255;
        M[0x5C3A + x] = rd(at(0x06, y));
        M[0x5C40 + x] = rd(at(0x06, y | 0x80));
        M[0x07] = (M[0x07] - 1) & 255;
        M[0x5C34 + x] = rd(at(0x06, y | 0x80));
        M[0x07] = (M[0x07] - 1) & 255;
        M[0x5C28 + x] = rd(at(0x06, y | 0x80));
      }
    };

    // ---------------------------------------------------------------- jewels
    // the two tiles ahead in the first direction pushed, up, down, left, right; on jewels the chest's
    // corner is found from the grid's sixteen places round the square, and the chest is emptied
    P.jewels_pickup = function () {                                  // $5CB9
      const is = (a, t1, t2) => M[a] === t1 || M[a] === t2;
      let found;
      if (!(rd(0xDC00) & 0x01)) found = is(0x5C24, 0x66, 0x67) || is(0x5C25, 0x66, 0x67);
      else if (!(rd(0xDC00) & 0x02)) found = is(0x5C42, 0x68, 0x69) || is(0x5C43, 0x68, 0x69);
      else if (!(rd(0xDC00) & 0x04)) found = is(0x5C2E, 0x69, 0x67) || is(0x5C34, 0x69, 0x67);
      else if (!(rd(0xDC00) & 0x08)) found = is(0x5C33, 0x68, 0x66) || is(0x5C39, 0x68, 0x66);
      if (!found) return;
      M[0x02] = M[0x06]; M[0x03] = M[0x07];                          // b_5D31
      M[0x02E2] = 0;
      let x = 0, y;
      for (;;) {                                                     // b_5D3E
        y = M[0x5CA9 + x];
        const t = M[GRID + y];
        if (t === 0x68) break;
        if (t === 0x69) { add16(0x02, -0x01); break; }               // the chest's tile right of its corner
        if (t === 0x66) { add16(0x02, -0x80); break; }               // below it
        if (t === 0x67) { add16(0x02, -0x81); break; }               // below and right
        x++;
        if (x === 0x10) return;
      }
      while (y !== 0 && y >= 6) { y -= 6; add16(0x02, 0x80); }        // b_5D85: a map row a grid row
      add16(0x02, y);                                                // b_5D9C: and the column
      M[0x02C5] = (M[0x02C5] + 0x28) & 255;                          // b_5DA6: forty points
      say(0x09, 0x56);                                               // YOU HAVE FOUND
      say(0xA5, 0x58);                                               // SOME JEWELS.
      open_the_chest();
    };

    // ---------------------------------------------------------------- the panel's frame
    // twenty-one rows of ten cells from $0445, the first $09 in colour $0F and the rest $0B in $07,
    // through the self-modified operands at $5DE6/$5DE7 (screen), $5DE9 (colour) and $5DEB/$5DEC
    // (colour memory); then the corners, the labels, the boxes and their colours
    P.draw_panel = function () {                                     // $5DC8
      M[0x5DE6] = 0x45; M[0x5DEB] = 0x45;
      M[0x5DE7] = 0x04; M[0x5DEC] = 0xD8;
      for (let y = 0; y !== 0x15; y++) {                             // b_5DDC
        M[0x5DE9] = 0x0F;
        let a = 0x09;
        for (let x = 0; x !== 0x0A; x++) {                           // b_5DE5
          wr(((M[0x5DE6] | M[0x5DE7] << 8) + x) & 0xFFFF, a);
          wr(((M[0x5DEB] | M[0x5DEC] << 8) + x) & 0xFFFF, M[0x5DE9]);
          M[0x5DE9] = 0x07;
          a = 0x0B;
        }
        const s = M[0x5DE6] + 0x28;
        M[0x5DE6] = s & 255; M[0x5DEB] = s & 255;
        if (s > 255) { M[0x5DE7] = (M[0x5DE7] + 1) & 255; M[0x5DEC] = (M[0x5DEC] + 1) & 255; }
      }
      wr(0x0445, 0x0C); wr(0x044E, 0x0D); wr(0x0765, 0x0E); wr(0x076E, 0x0F);
      for (let x = 7; x >= 0; x--) wr(0x0766 + x, 0x0A);
      wr(0xD845, 0x07); wr(0xDB65, 0x07);
      for (let x = 7; x >= 0; x--) wr(0xDB66 + x, 0x0F);
      wr(0x04BE, 0x2E); wr(0x04BF, 0x2F); wr(0x04C0, 0x74); wr(0x04C1, 0x2D);      // KEYS
      wr(0x050E, 0x01); wr(0x050F, 0x24); wr(0x0510, 0x24); wr(0x0511, 0x25);      // AMMO
      wr(0x055E, 0x26); wr(0x055F, 0x27); wr(0x0560, 0x2C); wr(0x0561, 0x2D);      // HITS
      for (let x = 5; x >= 0; x--) { wr(0xD9AF + x, 0x0F); wr(0x05AF + x, 0x0A); }
      for (const a of [0x049C, 0x049D, 0x04EC, 0x04ED, 0x053C, 0x053D]) wr(a, 0x0A);
      for (const a of [0xD89C, 0xD89D, 0xD89E, 0xD8EC, 0xD8ED, 0xD8EE, 0xD93C, 0xD93D, 0xD93E,
        0xD98E, 0xD8C6, 0xD916, 0xD966, 0xD9DD]) wr(a, 0x0F);
      for (const a of [0x049E, 0x04EE, 0x053E, 0x05B5]) wr(a, 0x75);
      for (const a of [0x04C6, 0x0516, 0x0566, 0x05DD]) wr(a, 0x09);
    };

    // ---------------------------------------------------------------- the mission's start and end
    P.place_player_at_start = function () {                          // $5EE2
      if (!M[0x4011] && M[0x426E]) {                                 // off the lift
        M[0xFA] = 0x80; M[0xFB] = 0xC5; M[0xFE] = 0x00; M[0xFF] = 0x6B;
        M[0x02DF] = 0xA0; M[0x02E0] = 0x72;
        return;
      }
      M[0xFA] = 0xB8; M[0xFB] = 0xC5; M[0xFE] = 0x38; M[0xFF] = 0x6B;  // b_5F07: the storage room
      M[0x02DF] = 0x80; M[0x02E0] = 0xA2;
      M[0x4011] = 0;
    };
    P.mission_done_check = function () {                             // $5F27
      const t = M[0x5C42];
      if (t !== 0xE4) { M[0x02E7] = t; return; }
      if (M[0x02E7] === 0xE4) return;
      M[0x02E7] = 0xE4;                                              // b_5F3A
      const notYet = () => { if (idle()) say(0xB2, 0x58); };         // b_5F4B: YOUR MISSION IS NOT YET COMPLETE !
      const pf = M[0x4010];
      if (pf === 0xFF) {                                             // b_5F75: the demolition
        if (!M[0x5F9A] || !M[0x5F9B] || !M[0x5F9C] || !M[0x5F9D]) return notYet();
        say(0x0E, 0x59);                                             // THE CASTLE IS NOW DESTROYED.
        M[0x02E9] = 2;
        return;
      }
      if (pf !== M[0x02A7] || M[0x02E8]) return notYet();            // b_5F5F
      say(0xD5, 0x58);                                               // WELL DONE.....YOU HAVE RESCUED A PRISONER.
      M[0x02E9] = 1;
    };
    // the four tiles of this floor's charge cleared, at ($02EA) + $81, $82, $101, $102, unless this is
    // the demolition mission and the floor's charge is not yet armed
    P.place_detonator = function () {                                // $5F9E
      if (M[0x400F] === 4 && !M[0x5F9A + M[0x02A7]]) return;
      M[0xFC] = M[0x02EA]; M[0xFD] = M[0x02EB];                      // b_5FAE
      wr(at(0xFC, 0x81), 0); wr(at(0xFC, 0x82), 0);
      M[0xFD] = (M[0xFD] + 1) & 255;
      wr(at(0xFC, 0x01), 0); wr(at(0xFC, 0x02), 0);
    };

    // ---------------------------------------------------------------- SPACE, and the delay
    P.scan_space = function () {                                     // $5FCB
      wr(0xDC00, 0x7F);
      const a = (rd(0xDC01) & 0x10) ^ 0x10;
      M[0xC5] = a;
      return { a };
    };
    // 255 turns of 255 turns of a two-step count: 1,302,037 cycles. The head of each turn of the outer
    // loop is a checkpoint, carrying the cycles since the one before, and the RTS is another: with
    // the interrupts on, { cycles } yields alone let the lockstep run the game on past the delay's
    // end (by 13,856 cycles at lock0's game over), so the game is held to the turns
    P.short_delay = function* () {                                   // $5FDA
      for (let x = 0xFF; x !== 0; x--) {                             // b_5FDC
        yield { cp: 0x5FDC, cycles: x === 0xFF ? 2 : 2 + 0xFF * 20 - 1 + 5 };
      }
      yield { cp: 0x5FEB, cycles: 2 + 0xFF * 20 - 1 + 4 };          // the last turn, to the RTS
      return { a: 0, x: 0, y: 0 };
    };
    P.checkpoints.add(0x5FDC); P.checkpoints.add(0x5FEB);
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
