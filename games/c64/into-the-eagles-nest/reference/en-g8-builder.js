/* en-g8-builder */
// Into the Eagle's Nest, Play port, group "builder": the floor builder ($6A4B) and the prisoner's
// drawing at its tail ($6BD8), the prisoner's turn and its steps ($6C3B-$6E20), the shot that turns
// him ($6E21), his walking frames ($6E5A), the shot that knocks a figure down ($6EAA), the cheat check
// ($6F3B), and the RESTORE key's warm start ($8031). One function per listing label, on the game's
// own memory P.M, its chips through P.io (en-core.js).
//
// Left standing in: the cold start at $8010, which a reset runs. It calls the KERNAL's IOINIT, RAMTAS,
// RESTOR and CINT, code in the ROM the port never runs; on the page a reset is loading the page again.
// The bytes the listing shows as code at $FD15 and on are the RAM under the KERNAL, never run.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr } = H;
    const print_message = H.call('print_message', 0x592E);        // go_print_message $4013
    // the byte at (z),y: a pointer in zero page and an index, as the processor adds them
    const at = (z, y) => (M[z] | M[(z + 1) & 255] << 8) + y & 0xFFFF;
    // the processor port read back ($01, data direction $2F): the outputs as last written, bit 4 (the
    // cassette's sense line, no button down) high, bits 6 and 7 low as the kit's 6502 keeps them
    const portRead = () => (P.cpuPort & 0x2F) | 0x10;

    // ---------------------------------------------------------------- the floor builder
    // 32 rows of 32 description bytes at $D000 + $400 a floor, each a block of 4 by 4 tiles copied from
    // $7000 + 16 times the byte into the map at $9000, 128 tiles across; the figures ($30-$37), the
    // charge ($62) and the prisoner ($63) are noted on the way.
    P.build_floor = function () {                                   // $6A4B
      P.sei();
      P.check_cheat_word();
      wr(0x0001, 0x30);
      M[0xFC] = 0; M[0xFD] = 0;
      M[0xFD] = ((M[0x02A7] & 3) << 2) & 255;
      M[0xFD] = (M[0xFD] + 0xD0) & 255;
      M[0x02] = 0x00; M[0x03] = 0x90;
      M[0x02A8] = 0; M[0x02D1] = 0;
      for (;;) {                                                      // j_6A79
        M[0x02D0] = 0;
        for (let x = 0; x < 0x20; x++) {                              // j_6A7E
          M[0x04] = 0; M[0x05] = 0;
          const lo = M[0x02], hi = M[0x03];                           // pha, pha
          const b = rd(at(0xFC, x));
          let kind = -1;
          if (b === 0x30 || b === 0x31) kind = 2;                      // b_6AD3
          else if (b === 0x32 || b === 0x33) kind = 4;                 // b_6AD8
          else if (b === 0x34 || b === 0x35) kind = 1;                 // b_6ADD
          else if (b === 0x36 || b === 0x37) kind = 3;                 // b_6AE2
          else if (b === 0x62) { M[0x02EA] = M[0x02]; M[0x02EB] = M[0x03]; }   // b_6AB9: the charge
          else if (b === 0x63) { M[0x02ED] = M[0x02]; M[0x02EE] = M[0x03]; }   // b_6AC6: the prisoner
          if (kind >= 0) {                                             // j_6AE4: a figure into the list
            const y = M[0x02CF];
            M[0x8500 + y] = kind;
            M[0x8300 + y] = M[0x02]; M[0x8400 + y] = M[0x03];
            M[0x8100 + y] = M[0x02D0]; M[0x8200 + y] = M[0x02D1];
            M[0x02CF] = (M[0x02CF] + 1) & 255;
          }
          // j_6B03: the block's sixteen tiles at $7000 + 16 * b
          const v = rd(at(0xFC, x)) << 4;
          M[0x04] = v & 255; M[0x05] = ((v >> 8) + 0x70) & 255;
          for (let row = 0; row < 4; row++) {                          // b_6B22, b_6B3F, b_6B5C, b_6B79
            if (row) {
              const s = M[0x02] + 0x80; M[0x02] = s & 255; if (s > 255) M[0x03] = (M[0x03] + 1) & 255;
              M[0x04] = (M[0x04] + 4) & 255;
            }
            for (let y = 0; y < 4; y++) wr(at(0x02, y), rd(at(0x04, y)));
          }
          M[0x03] = hi; M[0x02] = lo;                                  // pla, pla
          const s = M[0x02] + 4; M[0x02] = s & 255; if (s > 255) M[0x03] = (M[0x03] + 1) & 255;
          M[0x02D0] = (M[0x02D0] + 4) & 255;                           // b_6B93
        }
        // b_6BA4: on to the next row of blocks, 512 bytes on, and the next 32 description bytes
        M[0x03] = (M[0x03] + 1) & 255;
        let s = M[0x02] + 0x80; M[0x02] = s & 255; if (s > 255) M[0x03] = (M[0x03] + 1) & 255;
        s = M[0xFC] + 0x20; M[0xFC] = s & 255; if (s > 255) M[0xFD] = (M[0xFD] + 1) & 255;
        M[0x02A8] = (M[0x02A8] + 1) & 255;                             // b_6BBC
        if (M[0x02A8] === 0x20) break;
        M[0x02D1] = (M[0x02D1] + 4) & 255;
      }
      wr(0x0001, 0x36);                                               // b_6BD2
      P.cli();
    };

    // j_6BD8: the prisoner redrawn: his walking frame copied in, his last place cleared and his
    // sixteen tiles ($602F-$603E) put at his place
    P.draw_prisoner = function () {                                  // $6BD8
      P.animate_prisoner();
      M[0xFC] = M[0x602C]; M[0xFD] = M[0x602D];
      for (let y = 3; y >= 0; y--) {                                  // b_6BE7
        wr(at(0xFC, y), 0);
        M[0xFD] = (M[0xFD] + 1) & 255;
        wr(at(0xFC, y), 0);
        wr(at(0xFC, y | 0x80), 0);
        M[0xFD] = (M[0xFD] - 1) & 255;
        wr(at(0xFC, y | 0x80), 0);
      }
      M[0xFC] = M[0x6029]; M[0xFD] = M[0x602A];
      for (let y = 3, x = 3; y >= 0; y--, x--) {                      // b_6C10
        wr(at(0xFC, y), M[0x602F + x]);
        M[0xFD] = (M[0xFD] + 1) & 255;
        wr(at(0xFC, y), M[0x6037 + x]);
        wr(at(0xFC, y | 0x80), M[0x603B + x]);
        M[0xFD] = (M[0xFD] - 1) & 255;
        wr(at(0xFC, y | 0x80), M[0x6033 + x]);
      }
    };

    // ---------------------------------------------------------------- the prisoner
    P.prisoner_turn = function () {                                  // $6C3B
      if (M[0x02E5]) return;
      if (M[0x02E4] !== 1) { M[0x02E4] = (M[0x02E4] + 1) & 255; return; }
      M[0x02E4] = 0;                                                  // b_6C4C
      // within ten tiles of the room on screen, across ($30 wide) and down ($28 high); else b_6C35
      const free = () => { M[0x02E8] = 1; };
      let a = (M[0x6027] + 0x0A) & 255;
      if (a < M[0xFE] || a - M[0xFE] >= 0x30) return free();
      a = (M[0x6028] + 0x0A) & 255;
      if (a < M[0xFF] || a - M[0xFF] >= 0x28) return free();
      M[0x02E8] = 0;
      P.prisoner_is_close();
      P.prisoner_choose_way();
      M[0xFC] = M[0x6029]; M[0xFD] = M[0x602A];
      switch (M[0x602B] & 3) {
        case 0: return P.prisoner_step_up();
        case 1: return P.prisoner_step_down();                       // b_6CCA
        case 2: return P.prisoner_step_left();                       // b_6CCD
        default: return P.prisoner_step_right();                     // b_6CD0
      }
    };
    P.prisoner_is_close = function () {                              // $6CB4
      if (M[0x6043]) return;
      M[0xFC] = 0x98; M[0xFD] = 0x6C;                                 // "THE PRISONER IS VERY CLOSE."
      print_message();
      M[0x6043] = 1;
    };
    // a step taken: his place before it kept at $602C as the one to clear, then drawn
    const stepFrom = () => { M[0x602C] = M[0x6029]; M[0x602D] = M[0x602A]; };
    P.prisoner_step_up = function () {                               // $6CD3
      M[0xFD] = (M[0xFD] - 1) & 255;
      for (let y = 0x80; y < 0x84; y++) if (rd(at(0xFC, y))) { M[0x602B] &= 0xF7; return; }   // b_6D01
      stepFrom();
      M[0x6028] = (M[0x6028] - 1) & 255;
      const s = M[0x6029] - 0x80; M[0x6029] = s & 255; if (s < 0) M[0x602A] = (M[0x602A] - 1) & 255;
      P.draw_prisoner();                                              // b_6CFD
    };
    P.prisoner_step_down = function () {                             // $6D0A
      M[0xFD] = (M[0xFD] + 2) & 255;
      for (let y = 3; y >= 0; y--) if (rd(at(0xFC, y))) { M[0x602B] &= 0xF7; return; }       // b_6D38
      stepFrom();
      M[0x6028] = (M[0x6028] + 1) & 255;
      const s = M[0x6029] + 0x80; M[0x6029] = s & 255; if (s > 255) M[0x602A] = (M[0x602A] + 1) & 255;
      P.draw_prisoner();                                              // b_6D34
    };
    // across: the column beside him, rows 0, 1, then 3 and 2 with $FD one on; the place's low byte
    // moves alone, with no carry into its high byte
    const sideClear = (y) => {
      if (rd(at(0xFC, y))) return false;
      if (rd(at(0xFC, y + 0x80))) return false;
      M[0xFD] = (M[0xFD] + 1) & 255;
      if (rd(at(0xFC, y + 0x80))) return false;
      return !rd(at(0xFC, y));
    };
    P.prisoner_step_left = function () {                             // $6D41
      M[0xFC] = (M[0xFC] - 1) & 255;
      if (!sideClear(0)) { M[0x602B] |= 0x08; return; }               // b_6D71
      stepFrom();
      M[0x6027] = (M[0x6027] - 1) & 255;
      M[0x6029] = (M[0x6029] - 1) & 255;
      P.draw_prisoner();
    };
    P.prisoner_step_right = function () {                            // $6D7A
      if (!sideClear(4)) { M[0x602B] |= 0x08; return; }               // b_6DA8
      stepFrom();
      M[0x6027] = (M[0x6027] + 1) & 255;
      M[0x6029] = (M[0x6029] + 1) & 255;
      P.draw_prisoner();
    };
    // the way he goes: 0 up, 1 down, 2 left, 3 right in bits 0-1 of $602B; bit 3 which axis he
    // compares first. Level on both axes, the game's code turns between the two for ever.
    P.prisoner_choose_way = function () {                            // $6DB1
      const s = M[0x602B];
      if (s & 0xF0) { M[0x602B] = (s - 0x10) & 255; return; }
      let across = !(s & 0x08);                                        // b_6DC2
      for (;;) {
        if (across) {                                                  // j_6DC9
          const px = M[0x6027], gx = M[0x02CA];
          if (px === gx) { M[0x602B] &= 0xF7; across = false; continue; }   // b_6E0B
          M[0x602B] = (M[0x602B] & 0xF8) | (px > gx ? 2 : 3);         // b_6DDF: left; or right
          return;
        }
        const py = M[0x6028], gy = M[0x02CB];                          // b_6DEA
        if (py === gy) { M[0x602B] |= 0x08; across = true; continue; } // b_6E16
        M[0x602B] = (M[0x602B] & 0xF8) | (py > gy ? 0 : 1);           // b_6E00: up; or down
        return;
      }
    };
    // the warning shot: turned the opposite way, bit 3 cleared, and the top four bits set
    P.shot_hit_prisoner = function () {                              // $6E21
      const s = M[0x602B] & 0xF8;
      const back = [1, 0, 3, 2][M[0x602B] & 3];                        // b_6E3A, b_6E44, b_6E4C
      M[0x602B] = s | back | 0xF0;                                     // j_6E53
    };
    // his sixteen tiles at $26A0: 128 bytes from one of the eight frames under the KERNAL
    P.animate_prisoner = function () {                               // $6E5A
      M[0x602E] = (M[0x602E] + 1) & 255;
      M[0x6E59] = M[0x602E] & 2 ? 0 : 1;                               // j_6E6B
      const x = ((M[0x602B] & 3) << 1) + M[0x6E59];
      M[0x6E8E] = M[0x6E9A + x]; M[0x6E8F] = M[0x6EA2 + x];            // the copy's own operand
      const saved = portRead();
      wr(0x0001, 0x00);
      const src = M[0x6E8E] | M[0x6E8F] << 8;
      for (let i = 0x7F; i >= 0; i--) M[0x26A0 + i] = rd(src + i);     // b_6E8D
      wr(0x0001, saved);
    };

    // ---------------------------------------------------------------- a figure shot
    // the bullet's place in $02-$03 as a tile: the first standing figure whose corner is up to four
    // tiles left of and above it takes the shot
    P.shot_hit_figure = function () {                                // $6EAA
      M[0x02B7] = ((M[0x03] - 0x90) << 1) & 255;
      if (M[0x02] & 0x80) M[0x02B7] = (M[0x02B7] + 1) & 255;
      M[0x02B6] = M[0x02] & 0x7F;                                      // b_6EBC
      let x = 0;
      do {                                                             // b_6EC5
        if (!(M[0x8500 + x] & 0x20)
          && ((M[0x02B6] - M[0x8100 + x]) & 255) < 5
          && ((M[0x02B7] - M[0x8200 + x]) & 255) < 5) {
          if (!(M[0x8500 + x] & 0x40)) { M[0x8500 + x] |= 0x40; return; }
          M[0x02D5] = 8;                                               // b_6EF2: the second shot
          M[0x8500 + x] |= 0x20;
          M[0x02] = M[0x8300 + x]; M[0x03] = M[0x8400 + x];
          for (let y = 3; y >= 0; y--) {                               // b_6F0D
            wr(at(0x02, y), 0);
            M[0x03] = (M[0x03] + 1) & 255;
            wr(at(0x02, y), 0);
            wr(at(0x02, y | 0x80), 0);
            M[0x03] = (M[0x03] - 1) & 255;
            wr(at(0x02, y | 0x80), 0);
          }
          M[0x02C5] = (M[0x02C5] + 1) & 255;
          return;
        }
        x = (x + 1) & 255;                                             // b_6F2A
      } while (x !== M[0x02CF]);
    };

    // ---------------------------------------------------------------- the cheat
    P.check_cheat_word = function () {                               // $6F3B
      for (let x = 0; x < 10; x++) if (M[0x6F31 + x] !== M[0x081F + x]) { M[0x603F] = 0; return; }   // b_6F50
      M[0x603F] = 1;
    };

    // ---------------------------------------------------------------- RESTORE
    // The KERNAL's NMI handler sends RESTORE here, through the CBM80 signature at $8004: the raster
    // interrupt, the sprites and the sound off, the score six ASCII zeros, and on to the high score
    // check. The page calls it for its RESTORE key; the lockstep never presses one.
    P.warm_start = function () {                                     // $8031
      P.sei();
      wr(0xD01A, 0);
      wr(0xD015, 0);
      wr(0xD418, 0);
      for (let x = 0; x < 6; x++) M[0x0819 + x] = 0x30;                // j_8022
      return { at: 0x0810 };                                           // go_hiscore_check
    };
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
