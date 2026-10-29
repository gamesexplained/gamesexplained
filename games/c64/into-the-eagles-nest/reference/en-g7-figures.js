/* en-g7-figures */
// Into the Eagle's Nest, Play port, group "figures" ($6000-$6A4A): the figures' turn and everything
// under it (the reach round the room, the four tiles a step goes into, the turn towards the player,
// the drawing and the walk, the hit on the player), the sound (its set-up, its frame, the nine
// effects and their tails, the footsteps), the random table's builder and its reader, what a shot
// turns furniture into, and the slides that part the room when play stops, with their pause. The
// jump table at $6000 is stubs: the callers name the routines it reaches. One function per listing
// label, on the game's own memory P.M, its chips through P.io (en-core.js). The figures' turn and
// the sound run inside the play interrupt.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ptr } = H;

    // (z),y
    const at = (z, y) => (ptr(z) + (y & 255)) & 0xFFFF;
    // the pointer at zero page z moved on (or back) by d, its carry or borrow taken to the high byte
    const add16 = (z, d) => {
      const s = M[z] + d;
      M[z] = s & 255;
      if (s > 255) M[z + 1] = (M[z + 1] + 1) & 255;
      else if (s < 0) M[z + 1] = (M[z + 1] - 1) & 255;
    };
    const inc = (a) => { M[a] = (M[a] + 1) & 255; };
    const dec = (a) => { M[a] = (M[a] - 1) & 255; };
    // the figures' tables, built by the map builder: one byte a figure in each
    const FX = 0x8100, FY = 0x8200, FLO = 0x8300, FHI = 0x8400, FST = 0x8500;
    // the SID's registers written in turn, each [register, value]
    const sid = (writes) => { for (const [r, v] of writes) wr(0xD400 + r, v); };

    // ---------------------------------------------------------------- the figures' turn
    P.figures_turn = function () {                                   // $6044
      if (M[0x02CC] === 3) { M[0x02CE] = 0; M[0x02CC] = 0; }         // b_6054: the list from its start
      else {
        inc(0x02CC);
        if (!M[0x02CE]) return;
      }
      M[0x02CD] = 0;                                                 // b_605C
      let x = M[0x02CE], a;
      // b_608D: the walk stops at x, the list back at its start once x reaches its end
      const stop = () => {
        M[0x02CE] = x;
        if (x === M[0x02CF]) { M[0x02CE] = 0; M[0x02F7] = 0; }
      };
      // the corner from ten tiles before the room's to ten tiles short of its size ($30 across, $28 down)
      const near = (v, off, size) => { const s = ((v + 0x0A) & 255) - M[off]; return s >= 0 && s < size; };
      for (;;) {                                                     // b_6064
        if (near(M[FX + x], 0xFE, 0x30) && near(M[FY + x], 0xFF, 0x28)) {
          P.move_figure({ x });
          a = M[0x02CD];                                             // j_6085
          if (a === 7) { x = (x + 1) & 255; return stop(); }
        } else {                                                     // b_60B9: out of reach
          a = M[FST + x] & 0x20;
          if (a) {
            a = M[0x02F7];                                           // b_60C3
            if (!a) {
              standUp(x);
              a = M[0x02CD];                                         // b_6127 to j_6085
              if (a === 7) { x = (x + 1) & 255; return stop(); }
            }
          }
        }
        x = (x + 1) & 255;                                           // b_609E
        // the CMP #$C0 tests A, what was last loaded (the moves counted, the knocked-down bit, or $02F7)
        if (x === 0x40 || x === 0x80 || a === 0xC0) return stop();
        if (x === M[0x02CF]) { M[0x02CE] = 0; M[0x02F7] = 0; return; }
      }
    };
    // b_60CB, inside the figures' turn: a knocked-down figure out of reach, one a walk through the
    // list, stood up and drawn again when its sixteen tiles are empty
    const standUp = function (x) {
      inc(0x02F7);
      inc(0x02CD);
      M[0xFC] = M[FLO + x]; M[0xFD] = M[FHI + x];
      for (let y = 3; y >= 0; y--) if (rd(at(0xFC, y))) return;      // b_60DD
      inc(0xFD);
      for (let y = 3; y >= 0; y--) if (rd(at(0xFC, y))) return;      // b_60E8
      M[0xFC] = (M[0xFC] + 0x80) & 255;
      if (!M[0xFC]) inc(0xFD);                                       // BNE on the sum, not the carry
      for (let y = 3; y >= 0; y--) if (rd(at(0xFC, y))) return;      // b_60FC
      dec(0xFD);
      for (let y = 3; y >= 0; y--) if (rd(at(0xFC, y))) return;      // b_6107
      M[FST + x] &= 0x1F;
      M[0xFC] = M[0x08] = M[FLO + x];
      M[0xFD] = M[0x09] = M[FHI + x];
      P.redraw_figure({ x });
    };

    // one figure a tile: turned towards the player, then a step its way if the four tiles are empty;
    // the first tile in the way that holds the player ($55) is a hit, and the figure tries the other
    // axis next
    P.move_figure = function (r) {                                   // $612A
      const x = r.x;
      if (M[FST + x] & 0x20) return;
      inc(0x02CD);                                                   // b_6132
      P.figure_turn_to_player({ x });
      M[0xFC] = M[FLO + x]; M[0xFD] = M[FHI + x];
      const blocked = (t, bit3) => {
        if (t === 0x55) P.hit_the_player();
        M[FST + x] = bit3 ? M[FST + x] | 0x08 : M[FST + x] & 0xF7;
      };
      const step = () => {                                           // the new place, and the drawing
        M[0x08] = M[FLO + x]; M[0x09] = M[FHI + x];
        M[FLO + x] = M[0xFC]; M[FHI + x] = M[0xFD];
        P.redraw_figure({ x });
      };
      const dir = M[FST + x] & 0x07;
      if (dir === 1) {                                               // j_615F: up
        dec(0xFD);
        for (let y = 0x80; y !== 0x84; y++) { const t = rd(at(0xFC, y)); if (t) return blocked(t, 0); }
        inc(0xFD);
        add16(0xFC, -0x80);
        dec(FY + x);                                                 // b_6179
        return step();
      }
      if (dir === 2) {                                               // j_61A3: down
        inc(0xFD); inc(0xFD);
        for (let y = 0; y !== 4; y++) { const t = rd(at(0xFC, y)); if (t) return blocked(t, 0); }
        M[0xFD] = M[FHI + x];
        add16(0xFC, 0x80);
        inc(FY + x);                                                 // b_61C2
        return step();
      }
      if (dir === 3) {                                               // j_61EC: left
        dec(0xFC);
        if (!M[0xFC]) dec(0xFD);                                     // BNE on the result, not the borrow
        let t;                                                       // b_61F2
        if ((t = rd(at(0xFC, 0)))) return blocked(t, 1);
        inc(0xFD);
        if ((t = rd(at(0xFC, 0)))) return blocked(t, 1);
        dec(0xFD);
        if ((t = rd(at(0xFC, 0x80)))) return blocked(t, 1);
        inc(0xFD);
        if ((t = rd(at(0xFC, 0x80)))) return blocked(t, 1);
        dec(0xFD);
        M[0x08] = M[FLO + x]; M[0x09] = M[FHI + x];
        dec(FX + x);
        M[FLO + x] = M[0xFC]; M[FHI + x] = M[0xFD];
        return P.redraw_figure({ x });
      }
      let t;                                                         // j_6238: right
      if ((t = rd(at(0xFC, 4)))) return blocked(t, 1);
      inc(0xFD);
      if ((t = rd(at(0xFC, 4)))) return blocked(t, 1);
      dec(0xFD);
      if ((t = rd(at(0xFC, 0x84)))) return blocked(t, 1);
      inc(0xFD);
      if ((t = rd(at(0xFC, 0x84)))) return blocked(t, 1);
      dec(0xFD);
      inc(FX + x);
      M[0x08] = M[FLO + x]; M[0x09] = M[FHI + x];
      add16(0xFC, 1);                                                // b_6267
      M[FLO + x] = M[0xFC]; M[FHI + x] = M[0xFD];
      return P.redraw_figure({ x });
    };

    // the figure's sixteen tiles at ($08) emptied and its drawing put at ($FC), the walk's other step
    // ($10 on) every other time; the drawing loop's four load operands written at $62E3-$62FB
    P.redraw_figure = function (r) {                                 // $6284
      const x = r.x;
      P.figure_drawing({ x });
      M[FST + x] ^= 0x10;
      if (M[FST + x] & 0x10) M[0x0A] = (M[0x0A] + 0x10) & 255;
      for (let y = 0; y !== 4; y++) {                                // b_629C
        wr(at(0x08, y), 0);
        inc(0x09);
        wr(at(0x08, y), 0);
        wr(at(0x08, y | 0x80), 0);
        dec(0x09);
        wr(at(0x08, y | 0x80), 0);
      }
      M[0x62E4] = M[0x62FB] = M[0x62EB] = M[0x62F4] = M[0x0B];
      let v = M[0x0A], c = 0;                                        // clc, and the carries on
      M[0x62E3] = v;
      v += 4 + c; c = v >> 8; v &= 255; M[0x62FA] = v;
      v += 4 + c; c = v >> 8; v &= 255; M[0x62EA] = v;
      v += 4 + c; v &= 255; M[0x62F3] = v;
      const op = (lo) => M[lo] | M[lo + 1] << 8;
      for (let k = 0; k !== 4; k++) {                                // b_62E2, X and Y together
        const y = k;
        wr(at(0xFC, y), rd((op(0x62E3) + k) & 0xFFFF));
        inc(0xFD);
        wr(at(0xFC, y), rd((op(0x62EA) + k) & 0xFFFF));
        wr(at(0xFC, y | 0x80), rd((op(0x62F3) + k) & 0xFFFF));
        dec(0xFD);
        wr(at(0xFC, y | 0x80), rd((op(0x62FA) + k) & 0xFFFF));
      }
    };

    // the low three bits of the kind byte towards the player: across with bit 3 clear (4 right, 3
    // left), up or down with it set (2 down, 1 up); level on that axis, the other axis
    P.figure_turn_to_player = function (r) {                         // $630B
      const x = r.x, set = (d) => { M[FST + x] = (M[FST + x] & 0xF8) | d; };
      let across = !(M[FST + x] & 0x08), turns = 0;
      for (;;) {
        if (across) {                                                // j_6312
          const d = M[FX + x] - M[0x02CA];
          if (d < 0) return set(4);
          if (d > 0) return set(3);                                  // b_6328
          M[FST + x] &= 0xF7;                                        // b_6354
        }
        const d = M[FY + x] - M[0x02CB];                             // b_6333
        if (d < 0) return set(2);
        if (d > 0) return set(1);                                    // b_6349
        M[FST + x] |= 0x08;                                          // b_635F
        across = true;
        // level on both axes the game goes round these two for good, inside the interrupt
        if (++turns > 2) throw new Error('figure_turn_to_player: figure ' + x + ' level with the player on both axes; the game hangs here');
      }
    };
    P.figure_drawing = function (r) {                                // $636A
      const d = M[FST + r.x] & 0x07;
      M[0x0A] = d === 1 ? 0x40 : d === 2 ? 0x00 : d === 3 ? 0x60 : 0x20;
      M[0x0B] = 0x73;
    };
    // a hit, in decimal, unless the hits read 99 or the cheat is on
    P.hit_the_player = function () {                                 // $639F
      if (M[0x02C6] === 0x99 || M[0x603F]) return;
      M[0x02C6] = H.adcD(M[0x02C6], 1, 0).a;
    };

    // ---------------------------------------------------------------- the sound
    P.sound_init = function () {                                     // $63B7
      M[0x02D5] = 0; M[0x02D6] = 0; M[0x02D7] = 0;
      for (let x = 0; x !== 0x19; x++) { wr(0xD400 + x, 0x08); wr(0xD400 + x, 0x00); }
      wr(0xD418, 0x1F); wr(0xD416, 0x50); wr(0xD417, 0x02);
      P.build_random_table();
    };
    P.sound_tick = function () {                                     // $63E6
      if (M[0x02D8]) { M[0x02D8] = 0; P.footstep(); }
      if (M[0x02D5]) return P.start_sound_effect();                  // b_63F3
      if (M[0x02D6]) return P.continue_sound_effect();               // b_63FB
    };
    // the effect asked for in $02D5 started, its length in frames in $02D7; another value does nothing
    P.start_sound_effect = function () {                             // $6404
      const e = M[0x02D6] = M[0x02D5];
      if (e === 1) return P.sound_found();
      if (e === 2) return P.sound_wasted();
      if (e < 3 || e > 9) return;
      M[0x02D5] = 0;
      if (e === 3) {                                                 // j_64AA
        sid([[0x04, 0], [0x05, 0], [0x00, 0], [0x0E, 0], [0x06, 0xF6], [0x01, 0x56], [0x0F, 0x18], [0x03, 0x08], [0x04, 0x15]]);
        M[0x02D7] = 0x12;
      } else if (e === 4) {                                          // j_64DC
        sid([[0x04, 0], [0x06, 0], [0x01, 0], [0x04, 0x08], [0x04, 0x00], [0x03, 0x01], [0x00, 0x1E], [0x05, 0x98], [0x04, 0x51]]);
        M[0x02D7] = 0x20;
      } else if (e === 5) {                                          // j_6510
        sid([[0x04, 0], [0x12, 0], [0x06, 0], [0x14, 0], [0x00, 0], [0x0E, 0], [0x05, 0x09], [0x13, 0x09], [0x01, 0x0E],
          [0x0F, 0x08], [0x04, 0x81], [0x12, 0x81], [0x04, 0x81]]);
        M[0x02D7] = 0x1B;
      } else if (e === 6) {                                          // j_654C
        sid([[0x04, 0], [0x00, 0], [0x06, 0], [0x0E, 0], [0x05, 0x18], [0x01, 0x19], [0x0F, 0x06], [0x03, 0x01], [0x04, 0x15]]);
        M[0x02D7] = 0x19;
      } else if (e === 7) {                                          // j_657E
        sid([[0x04, 0], [0x12, 0], [0x01, 0], [0x0E, 0], [0x05, 0], [0x06, 0xFB], [0x00, 0x1E], [0x0F, 0xFF], [0x12, 0x80], [0x04, 0x81]]);
        M[0x02D7] = 0xFF;
      } else if (e === 8) {                                          // j_65B3
        sid([[0x04, 0], [0x0E, 0], [0x0F, 0], [0x06, 0], [0x12, 0], [0x05, 0x19], [0x00, 0xC8], [0x01, 0x64], [0x04, 0x15]]);
        M[0x02D7] = 0x40;
      } else {                                                       // j_65E3
        sid([[0x04, 0], [0x06, 0], [0x0E, 0], [0x12, 0], [0x05, 0x0A], [0x00, 0x64], [0x01, 0x02], [0x0F, 0x18], [0x04, 0x83]]);
        M[0x02D7] = 0x38;
      }
    };
    P.sound_found = function () {                                    // $644C
      M[0x02D5] = 0;
      sid([[0x04, 0], [0x06, 0], [0x01, 0], [0x05, 0x5A], [0x03, 0x01], [0x00, 0xC8], [0x04, 0x51]]);
      M[0x02D7] = 0x40;
    };
    P.sound_wasted = function () {                                   // $6476
      M[0x02D5] = 0;
      sid([[0x04, 0], [0x06, 0], [0x00, 0], [0x03, 0x08], [0x05, 0x15], [0x01, 0x64], [0x0E, 0x46], [0x0F, 0xFF], [0x04, 0x15]]);
      M[0x02D7] = 0x20;
    };
    // the effect playing carried on a frame
    P.continue_sound_effect = function () {                          // $6615
      const e = M[0x02D6];
      if (e === 1) return P.sound_tail_1();
      if (e === 2) return P.sound_tail_2();
      if (e === 3) return P.sound_tail_3();
      if (e === 4) {                                                 // j_66A8
        if (!M[0x02D7]) { M[0x02D6] = 0; wr(0xD404, 0); return; }
        dec(0x02D7); return;
      }
      if (e === 5) {                                                 // j_66BE
        const t = M[0x02D7];
        if (!t) { M[0x02D6] = 0; wr(0xD404, 0); wr(0xD412, 0); return; }
        dec(0x02D7);
        const x = t - 0x14;
        if (x < 0) return;
        const a = M[0x66E9 + x];                                     // shot_sound_pitches, backwards
        wr(0xD401, a); wr(0xD40F, (a - 6) & 255);
        return;
      }
      if (e === 6) return P.sound_sweep();
      if (e === 7) return P.sound_tail_7();
      if (e === 8) {                                                 // j_675E
        const t = M[0x02D7];
        if (!t) { M[0x02D6] = 0; wr(0xD404, 0); return; }
        dec(0x02D7);
        wr(0xD40F, (t + 0x41) & 255);
        return;
      }
      if (e === 9) {                                                 // j_677A
        if (!M[0x02D7]) { M[0x02D6] = 0; wr(0xD404, 0); return; }
        dec(0x02D7);
      }
    };
    P.sound_tail_1 = function () {                                   // $665A
      if (!M[0x02D7]) { M[0x02D6] = 0; wr(0xD404, 0); return; }
      dec(0x02D7);
    };
    P.sound_tail_2 = function () {                                   // $6670
      if (!M[0x02D7]) { M[0x02D6] = 0; wr(0xD404, 0); return; }
      dec(0x02D7);
    };
    P.sound_tail_3 = function () {                                   // $6686
      const t = M[0x02D7];
      if (!t) { wr(0xD404, 0); M[0x02D6] = 0; return; }
      dec(0x02D7);
      if (t === 0x10) wr(0xD404, 0x14);
    };
    P.sound_sweep = function () {                                    // $66EF
      const t = M[0x02D7];
      if (!t) { wr(0xD404, 0); M[0x02D6] = 0; return; }
      dec(0x02D7);
      const x = t - 0x0A;
      if (x < 0) return;
      wr(0xD401, M[0x6722 + x]);                                     // sound_sweep_table, backwards
      if (x === 8) { wr(0xD404, 0x14); wr(0xD404, 0x15); }
    };
    P.sound_tail_7 = function () {                                   // $6731
      const t = M[0x02D7];
      if (!t) { M[0x02D6] = 0; wr(0xD404, 0); return; }
      dec(0x02D7);
      if (t === 0x80) { wr(0xD404, 0x80); return; }
      const a = rd(0xD41B);                                          // voice 3's noise
      wr(0xD400, a); wr(0xD401, a & 0x07);
    };
    P.footstep = function () {                                       // $6790
      sid([[0x0B, 0], [0x0D, 0], [0x07, 0], [0x0C, 0x31]]);
      inc(0x02D9);
      sid([[0x0B, 0x80], [0x08, M[0x02D9] & 1 ? 0x0A : 0x05], [0x0B, 0x81]]);
    };

    // ---------------------------------------------------------------- the random table
    // 256 reads of voice 3's oscillator, noise at the top frequency, from $8700 and then down from $87FF
    P.build_random_table = function () {                             // $67CA
      sid([[0x12, 0], [0x14, 0], [0x13, 0], [0x0E, 0xFF], [0x0F, 0xFF], [0x12, 0x81]]);
      let x = 0;
      do { M[0x8700 + x] = rd(0xD41B); x = (x - 1) & 255; } while (x);  // b_67E4
      wr(0xD412, 0);
      return { a: 0, x: 0 };
    };
    P.next_random = function () {                                    // $67F3
      inc(0x02E1);
      const y = M[0x02E1];
      return { a: M[0x8700 + y], y };
    };

    // ---------------------------------------------------------------- what a shot breaks
    // the shot's tile in A, its place in ($02): a piece of furniture found from it ($34 its corner, $30,
    // $31 and $35 one, two and three right of it; tiles $38-$3B a row lower) is rewritten as its
    // broken tiles, or else one from $C0-$C3 a row up ($C8-$CB two rows up); 25 points and effect 8
    P.shot_hit_scenery = function (r) {                              // $67FD (j_6015)
      const a = r.a & 255;
      M[0xFC] = M[0x02]; M[0xFD] = M[0x03];
      if (a >= 0x38 && a < 0x3C) add16(0xFC, 0x80);
      const broken = (top, bottom) => {
        for (let y = 0; y < 4; y++) wr(at(0xFC, y), top[y]);
        for (let y = 0; y < 4; y++) wr(at(0xFC, 0x80 + y), bottom[y]);
        M[0x02C5] = (M[0x02C5] + 0x19) & 255;
        M[0x02D5] = 0x08;
      };
      const t = rd(at(0xFC, 0));                                     // b_6818
      const back = { 0x34: 0, 0x30: 1, 0x31: 2, 0x35: 3 }[t];
      if (back !== undefined) {
        add16(0xFC, -back);
        return broken([0x03, 0xE7, 0xE8, 0x00], [0x4B, 0x4B, 0x4B, 0x4B]);  // b_6856
      }
      if (t >= 0xC8 && t < 0xCC) dec(0xFD);                          // j_6889
      else add16(0xFC, -0x80);                                       // b_6896
      const u = rd(at(0xFC, 0x80));                                  // j_68A1
      const back2 = { 0xC2: 0, 0xC0: 1, 0xC3: 2, 0xC1: 3 }[u];
      if (back2 === undefined) return;
      add16(0xFC, -back2);
      broken([0x4B, 0x4B, 0x4B, 0x4B], [0x06, 0x3C, 0x3D, 0x05]);    // b_68E0
    };

    // ---------------------------------------------------------------- the slides
    // eleven slides of the room apart, row 11's colour cleared after the first, a pause after each
    P.slide_room_apart = function* () {                              // $6913
      P.slide_screen_up();
      P.slide_screen_down();
      for (let x = 0; x !== 0x28; x++) wr(0xD9B8 + x, 0);            // b_691D
      yield* P.slide_pause();
      M[0x02C7] = 0x0A;
      do {                                                           // b_692D
        P.slide_screen_up();
        P.slide_screen_down();
        yield* P.slide_pause();
        dec(0x02C7);
      } while (M[0x02C7]);
    };
    // columns 2-39 of rows 2-11 to columns 1-38 of rows 1-10, screen and colour, a column at a time
    P.slide_screen_up = function () {                                // $693C
      for (let x = 2; x !== 0x28; x++) {                             // b_6940
        const y = x - 1;
        for (let row = 1; row <= 10; row++) {
          wr(0x0400 + row * 40 + y, rd(0x0428 + row * 40 + x));
          wr(0xD800 + row * 40 + y, rd(0xD828 + row * 40 + x));
        }
      }
    };
    // columns 0-37 of rows 11-20 to columns 1-38 of rows 12-21, a column at a time from the right,
    // the bottom row first
    P.slide_screen_down = function () {                              // $69BF
      for (let x = 0x25; x >= 0; x--) {                              // b_69C3
        const y = x + 1;
        for (let row = 21; row >= 12; row--) {
          wr(0x0400 + row * 40 + y, rd(0x03D8 + row * 40 + x));
          wr(0xD800 + row * 40 + y, rd(0xD7D8 + row * 40 + x));
        }
      }
    };
    // 255 turns of 16 turns of DEY: 21,931 cycles from the LDX to the RTS. The head of each outer turn
    // is a checkpoint carrying the cycles since the one before, and the RTS another, as short_delay
    P.slide_pause = function* () {                                   // $6A40
      for (let x = 0xFF; x !== 0; x--) {                             // b_6A42
        yield { cp: 0x6A42, cycles: x === 0xFF ? 2 : 2 + 0x10 * 5 - 1 + 5 };
      }
      yield { cp: 0x6A4A, cycles: 2 + 0x10 * 5 - 1 + 4 };            // the last turn, to the RTS
      return { x: 0, y: 0 };
    };
    P.checkpoints.add(0x6A42); P.checkpoints.add(0x6A4A);
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
