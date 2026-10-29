/* en-g3-setup */
// Into the Eagle's Nest, Play port, group "setup" ($4000-$4849): the game's entry and cold start, the
// mission start and its set-up of the sprites, the prisoner and the screen, the player's part of each
// frame (his moves and the four room scrolls), the shots, and the room drawing. One function per
// listing label, on the game's own memory P.M, its chips through P.io (en-core.js). Two stages are
// here: $4000, the cold start, which goes on through the mission select into the mission start
// ($404F), and $404F, the mission start, which jumps to the start of play at $484A.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ib } = H;
    const between_missions = H.gen('between_missions', 0x4946);
    const build_floor = H.call('build_floor', 0x6A4B);               // go_build_floor $601B
    const place_detonator = H.call('place_detonator', 0x5F9E);
    const install_wipe_irq = H.call('install_wipe_irq', 0x4BF2);
    const place_player_at_start = H.call('place_player_at_start', 0x5EE2);
    const draw_prisoner = H.call('draw_prisoner', 0x6BD8);           // go_draw_prisoner $6024, to j_6BD8
    const draw_panel = H.call('draw_panel', 0x5DC8);
    const draw_panel_numbers = H.call('draw_panel_numbers', 0x5995);
    const sound_init = H.call('sound_init', 0x63B7);                 // go_sound_init $6009
    const print_message = H.call('print_message', 0x592E);
    const tiles_round_player = H.call('tiles_round_player', 0x5C46);
    const announce_floor = H.call('announce_floor', 0x5ABD);
    // the two waits for the wipe interrupt to report where it has got to in $4BF1, and the call that
    // starts it: the floor's build before it takes the game about 29 frames, which a page's clock
    // charges at the next checkpoint, so without one here the wipe would run through the build
    for (const a of [0x4092, 0x4095, 0x4241]) P.checkpoints.add(a);
    P.irqBytes.add(0x4BF1);

    // ---------------------------------------------------------------- the entry and the cold start
    P.game_entry = function* () {                                  // $4000
      return yield* P.game_cold_start();
    };
    P.go_print_message = (r) => print_message(r);                   // $4013
    P.game_cold_start = function* () {                             // $4016
      M[0x02A7] = 1;
      for (let x = 0; x < 0xC0; x++) M[0x2F40 + x] = 0;
      wr(0xD020, 0); wr(0xD021, 0);
      M[0x426E] = 0; M[0x4011] = 0;
      M[0x5F9A] = 0; M[0x5F9B] = 0; M[0x5F9C] = 0; M[0x5F9D] = 0;
      M[0x6043] = 0;
      for (let x = 0; x < 6; x++) M[0x0819 + x] = 0x30;
      return yield* between_missions();                             // jmp $4946
    };
    P.stages[0x4000] = function* () { return yield* P.game_entry(); };

    // ---------------------------------------------------------------- the mission start
    P.mission_start = function* () {                               // $404F
      wr(0xD018, 0x1B);
      for (let x = 0xA8; x < 0x100; x++) M[0x0200 + x] = 0;
      M[0x02BD] = 0x99;
      if (M[0x426E]) {
        M[0x02AC] = M[0x4009]; M[0x02BD] = M[0x400A]; M[0x02C6] = M[0x400B];
        M[0x02C2] = M[0x400C]; M[0x02C3] = M[0x400D]; M[0x02C4] = M[0x400E];
      }
      build_floor();
      place_detonator();
      yield { cp: 0x4092 };
      install_wipe_irq();
      do yield { cp: 0x4095 }; while (ib(0x4BF1) !== 3);           // the window has closed
      M[0x06] = 0; M[0x592B] = 0; M[0x592C] = 0;
      return yield* P.setup_play_sprites();
    };
    P.stages[0x404F] = function* () { return (yield* P.mission_start()).at; };

    P.setup_play_sprites = function* () {                          // $40A6
      wr(0xD01D, 0); wr(0xD017, 0);
      wr(0xD02B, 7);
      M[0x07] = 0x90;
      wr(0xD018, 0x19);
      for (let x = 0x0F; x >= 0; x--) wr(0xD000 + x, 0x0F);         // A is $0F throughout (TXA once)
      wr(0xD01C, 0x0F); wr(0xD016, 0xD8); wr(0xD022, 0x0B); wr(0xD023, 0x0C);
      wr(0xD010, 0xE0);
      wr(0xD00A, 0x1E); wr(0xD00B, 0xA8); wr(0xD00C, 0x12); wr(0xD00D, 0xBD);
      wr(0xD00E, 0x2A); wr(0xD00F, 0xBD);
      wr(0xD02C, 0); wr(0xD02D, 0); wr(0xD02E, 0);
      place_player_at_start();
      const x = (M[0x02DF] - 8) & 255, x2 = (x + 0x18) & 255;
      wr(0xD000, x); wr(0xD004, x); wr(0xD002, x2); wr(0xD006, x2);
      const y = (M[0x02E0] - 4) & 255, y2 = (y + 0x15) & 255;
      wr(0xD001, y); wr(0xD003, y); wr(0xD005, y2); wr(0xD007, y2);
      M[0x6027] = 0x14; M[0x6028] = 0x72;
      M[0x6029] = 0x14; M[0x602C] = 0x14;
      M[0x602A] = 0xC9; M[0x602D] = 0xC9;
      M[0x602B] = 0;
      if (M[0x4012]) return yield* P.clear_prisoner_start();
      M[0x6029] = M[0x602C] = M[0x02ED];
      M[0x602A] = M[0x602D] = M[0x02EE];
      M[0xFD] = (M[0x02EE] - 0x90) & 255;
      M[0xFC] = M[0x02ED];
      M[0x6027] = M[0x02ED] & 0x7F;
      const c = M[0xFC] >> 7;                                       // asl $FC, rol $FD
      M[0xFC] = (M[0xFC] << 1) & 255;
      M[0xFD] = ((M[0xFD] << 1) | c) & 255;
      M[0x6028] = M[0xFD];
      M[0x4012] = 0;
      return yield* P.clear_prisoner_start();
    };

    P.clear_prisoner_start = function* () {                        // $4188
      M[0xFC] = M[0x02ED]; M[0xFD] = M[0x02EE];
      const st = (y) => wr(H.ptr(0xFC) + y, 0);                     // sta ($FC),y
      for (let y = 3; y >= 0; y--) {
        st(y);
        M[0xFD] = (M[0xFD] + 1) & 255;
        st(y);
        st(y | 0x80);
        M[0xFD] = (M[0xFD] - 1) & 255;
        st(y | 0x80);
      }
      const pf = M[0x4010];
      if (pf !== 0xFF && pf === M[0x02A7]) {
        draw_prisoner();
        return yield* P.clear_play_screen();
      }
      M[0x02E5] = 1;
      return yield* P.clear_play_screen();
    };

    P.clear_play_screen = function* () {                           // $41C6
      for (let x = 0; x < 0x100; x++) {
        wr(0xD800 + x, 0); wr(0xD900 + x, 0); wr(0xDA00 + x, 0); wr(0xDB00 + x, 0);
        M[0x0400 + x] = 0xEF; M[0x0500 + x] = 0xEF; M[0x0600 + x] = 0xEF; M[0x0700 + x] = 0xEF;
      }
      M[0x07F8] = 0xC0; M[0x07F9] = 0xC1; M[0x07FA] = 0xC2; M[0x07FB] = 0xC3;
      M[0x07FD] = 0xF0; M[0x07FE] = 0xF1; M[0x07FF] = 0xF2;
      M[0x02B0] = 1;
      for (let x = 0; x < 0x28; x++) { wr(0xDB98 + x, 8); wr(0xDBC0 + x, 7); }
      return yield* P.build_play_screen();
    };

    P.build_play_screen = function* () {                           // $421B
      draw_panel();
      draw_panel_numbers();
      if (!M[0x426E]) {
        sound_init();
        M[0xFC] = 0x94; M[0xFD] = 0x56;                             // "WELCOME TO THE EAGLES NEST."
        print_message();
      }
      P.draw_room();
      M[0x4BF1] = 1;
      wr(0xD015, 0xFF);
      do yield { cp: 0x4241 }; while (ib(0x4BF1) !== 2);           // the window has opened
      tiles_round_player();
      wr(0xD027, 7);
      return P.start_mission_play();
    };

    P.start_mission_play = function () {                           // $4250
      wr(0xD028, 7); wr(0xD029, 7); wr(0xD02A, 7);                  // A = 7, from $424B
      M[0x426E] = 1;
      wr(0xD025, 0); wr(0xD026, 5);
      announce_floor();
      return { at: 0x484A };                                        // jmp start_game_loop
    };

    // ---------------------------------------------------------------- the player's part of a frame
    P.player_and_rooms = function () {                             // $426F
      const a = M[0x02AA] & 7;
      if (a) M[0x02EF] = 0;
      if (a === 1) return P.scroll_room_up();
      if (a === 2) return P.scroll_room_down();
      if (a === 3) return P.scroll_room_left();
      if (a === 4) return P.scroll_room_right();
      return P.player_turn();
    };
    P.player_turn = function () {                                  // $4297
      tiles_round_player();
      if (M[0x02E3]) {
        if (!(rd(0xDC00) & 0x10)) return;                           // fire still held
        M[0x02E3] = 0;
      }
      if (M[0x02BA] !== 3) { M[0x02BA] = (M[0x02BA] + 1) & 255; return; }
      M[0x02BA] = 0;
      if (!(rd(0xDC00) & 1)) return P.player_move_up();
      if (!(rd(0xDC00) & 2)) return P.player_move_down();
      if (!(rd(0xDC00) & 4)) return P.player_move_left();
      if (!(rd(0xDC00) & 8)) return P.player_move_right();
    };
    // the four tiles ahead all below $2D, the way is open
    const open = (tiles) => tiles.every((t) => M[t] < 0x2D);
    // a step taken: the door warnings may be said again, and the walk counted
    const stepped = () => {
      M[0x02BE] = 0;
      M[0x02DA] = (M[0x02DA] + 1) & 255;
      M[0x02D8] = M[0x02DA] & 1;
    };
    // the end of a room change's step: when its count in the top nibble of $02AA has run out
    const crossed = () => {
      const s = (M[0x02AA] - 0x10) & 255;
      M[0x02AA] = s;
      return !(s & 0xF0);
    };

    P.player_move_up = function () {                               // $42E2
      M[0x02B0] = 1;
      if (!open([0x5C23, 0x5C24, 0x5C25, 0x5C26])) return;
      if (M[0x02E0] === 0x62) { M[0x02AA] = (M[0x02AA] & 8) | 0xA1; return P.scroll_room_up(); }
      M[0x02E0] = (M[0x02E0] - 8) & 255;
      stepped();
    };
    P.scroll_room_up = function () {                               // $432E
      if (!M[0xFF]) M[0x02E0] = (M[0x02E0] - 8) & 255;
      else {
        M[0xFF] = (M[0xFF] - 1) & 255;
        const lo = M[0xFA] - 0x80;
        M[0xFA] = lo & 255;
        if (lo < 0) M[0xFB] = (M[0xFB] - 1) & 255;
        M[0x02E0] = (M[0x02E0] + 8) & 255;
        if (M[0x02AF] & 0x01) M[0x02DC] = (M[0x02DC] + 8) & 255;
        if (M[0x02AF] & 0x10) M[0x02DE] = (M[0x02DE] + 8) & 255;
        if (!crossed()) return;
      }
      M[0x02AA] &= 8;                                               // j_4381
    };
    P.player_move_down = function () {                             // $438A
      M[0x02B0] = 2;
      if (!open([0x5C41, 0x5C42, 0x5C43, 0x5C44])) return;
      if (M[0x02E0] === 0xB2) { M[0x02AA] = (M[0x02AA] & 8) | 0xA2; return P.scroll_room_down(); }
      M[0x02E0] = (M[0x02E0] + 8) & 255;
      stepped();
    };
    P.scroll_room_down = function () {                             // $43D6
      if (M[0xFF] === 0x6B) M[0x02E0] = (M[0x02E0] + 8) & 255;
      else {
        M[0xFF] = (M[0xFF] + 1) & 255;
        const lo = M[0xFA] + 0x80;
        M[0xFA] = lo & 255;
        if (lo > 255) M[0xFB] = (M[0xFB] + 1) & 255;
        M[0x02E0] = (M[0x02E0] - 8) & 255;
        if (M[0x02AF] & 0x01) M[0x02DC] = (M[0x02DC] - 8) & 255;
        if (M[0x02AF] & 0x10) M[0x02DE] = (M[0x02DE] - 8) & 255;
        if (!crossed()) return;
      }
      M[0x02AA] &= 8;                                               // j_442B
    };
    P.player_move_left = function () {                             // $4434
      M[0x02B0] = 3;
      if (!open([0x5C28, 0x5C2E, 0x5C34, 0x5C3A])) return;
      if (M[0x02DF] === 0x48) { M[0x02AA] = (M[0x02AA] & 8) | 0xD3; return P.scroll_room_left(); }
      M[0x02DF] = (M[0x02DF] - 8) & 255;
      stepped();
    };
    P.scroll_room_left = function () {                             // $4480
      if (!M[0xFE]) M[0x02DF] = (M[0x02DF] - 8) & 255;
      else {
        M[0xFE] = (M[0xFE] - 1) & 255;
        const lo = M[0xFA] - 1;
        M[0xFA] = lo & 255;
        if (lo < 0) M[0xFB] = (M[0xFB] - 1) & 255;
        M[0x02DF] = (M[0x02DF] + 8) & 255;
        if (M[0x02AF] & 0x01) M[0x02DB] = (M[0x02DB] + 8) & 255;
        if (M[0x02AF] & 0x10) M[0x02DD] = (M[0x02DD] + 8) & 255;
        if (!crossed()) return;
      }
      M[0x02AA] &= 8;                                               // j_44D3
    };
    P.player_move_right = function () {                            // $44DC
      M[0x02B0] = 4;
      if (!open([0x5C2D, 0x5C33, 0x5C39, 0x5C3F])) return;
      if (M[0x02DF] === 0xB0) { M[0x02AA] = (M[0x02AA] & 8) | 0xD4; return P.scroll_room_right(); }
      M[0x02DF] = (M[0x02DF] + 8) & 255;
      stepped();
    };
    P.scroll_room_right = function () {                            // $4528
      if (M[0xFE] === 0x64) M[0x02DF] = (M[0x02DF] + 8) & 255;
      else {
        M[0xFE] = (M[0xFE] + 1) & 255;
        const lo = M[0xFA] + 1;
        M[0xFA] = lo & 255;
        if (lo > 255) M[0xFB] = (M[0xFB] + 1) & 255;
        M[0x02DF] = (M[0x02DF] - 8) & 255;
        if (M[0x02AF] & 0x01) M[0x02DB] = (M[0x02DB] - 8) & 255;
        if (M[0x02AF] & 0x10) M[0x02DD] = (M[0x02DD] - 8) & 255;
        if (!crossed()) return;
      }
      M[0x02AA] &= 8;                                               // j_457D
    };

    // ---------------------------------------------------------------- the shots
    P.clear_spent_shots = function () {                            // $4586
      if (M[0x02AF] & 0x02) {
        M[0x02AF] &= 0xF0;
        M[0x02DB] = 0; M[0x02DC] = 0; M[0x02B2] = 0;
        return P.player_shoot();
      }
      if (M[0x02AF] & 0x20) {
        M[0x02AF] &= 0x0F;
        M[0x02DD] = 0; M[0x02DE] = 0; M[0x02B4] = 0;
      }
      return P.player_shoot();
    };
    // j_45F2: no rounds left; "OUT OF AMMO!" once the message line is free
    const outOfAmmo = () => {
      if (M[0x592B] !== M[0x592C]) return;
      M[0xFC] = 0xDA; M[0xFD] = 0x56;
      print_message();
    };
    // a round spent and a shot started at the player: its direction, x and y at d, x and y
    const fire = (d, sx, sy) => {
      M[0x02BD] = H.sbcD(M[0x02BD], 1, 1).a;
      P.face_player();
      const f = M[0x02B0], i = (f - 1) & 255;
      M[d] = f;
      M[0x02D5] = 5;
      M[sx] = (M[0x02DF] + M[0x4699 + i]) & 255;
      M[sy] = (M[0x02E0] + M[0x469D + i]) & 255;
    };
    P.player_shoot = function () {                                 // $45BD
      P.move_shots();
      if (rd(0xDC00) & 0x10) { M[0x02B5] = 0; return; }
      if (M[0x02B5]) return;
      M[0x02B5] = (M[0x02B5] + 1) & 255;
      if (M[0x02AF] & 0x0F) return P.fire_second_shot();
      if ((M[0x02AF] & 0xF0) && M[0x02B4] < 8) return;
      if (!M[0x02BD]) return outOfAmmo();
      fire(0x02B1, 0x02DB, 0x02DC);
      M[0x02AF] ^= 0x01;
      M[0x02B2] = 0;
    };
    P.fire_second_shot = function () {                             // $463F
      if (M[0x02AF] & 0xF0) return;
      if (M[0x02B2] < 8) return;
      if (!M[0x02BD]) return outOfAmmo();
      fire(0x02B3, 0x02DD, 0x02DE);
      M[0x02AF] ^= 0x10;
      M[0x02B4] = 0;
    };
    P.move_shots = function () {                                   // $4692
      P.move_shot_1();
      P.move_shot_2();
    };
    P.face_player = function () {                                  // $46A5
      const i = (M[0x02B0] - 1) & 255, s = M[0x46A1 + i];
      M[0x07F8] = s; M[0x07F9] = (s + 1) & 255; M[0x07FA] = (s + 2) & 255; M[0x07FB] = (s + 3) & 255;
      M[0x02E3] = 1;
      M[0x07FC] = (i + 0xF3) & 255;
      wr(0xD008, (((M[0x02DF] - 8) & 255) + M[0x46F2 + i]) & 255);
      wr(0xD009, (((M[0x02E0] - 8) & 255) + M[0x46F6 + i]) & 255);
      M[0x46F1] = 4;
      wr(0xD02B, 8);
    };
    // one shot one step on: its flag in $02AF, its direction, x and y, the bit flipped at an edge
    // and its right edge
    const moveShot = (d, sx, sy, edge, right) => {
      const dir = M[d];
      let v, out;
      if (dir === 1) { v = M[sy] = (M[sy] - 8) & 255; out = v < 0x3A; }
      else if (dir === 2) { v = M[sy] = (M[sy] + 8) & 255; out = v >= 0xE2; }
      else if (dir === 3) { v = M[sx] = (M[sx] - 8) & 255; out = v < 0x20; }
      else { v = M[sx] = (M[sx] + 8) & 255; out = v >= right; }
      if (out) M[0x02AF] ^= edge;
    };
    P.move_shot_1 = function () {                                  // $46FA
      if (!(M[0x02AF] & 0x01)) return;
      M[0x02B2] = (M[0x02B2] + 1) & 255;
      moveShot(0x02B1, 0x02DB, 0x02DC, 0x02, 0xF2);
    };
    P.move_shot_2 = function () {                                  // $4775
      M[0x02B4] = (M[0x02B4] + 1) & 255;
      if (!(M[0x02AF] & 0x10)) return;
      moveShot(0x02B3, 0x02DD, 0x02DE, 0x20, 0xF0);
    };

    // ---------------------------------------------------------------- the room
    // Self-modifying: $4815/$4816 is the map row read, $4818/$4819 the screen row written and
    // $481E/$481F the colour row, the operands of the three instructions of the inner loop.
    P.draw_room = function () {                                    // $47F1
      M[0x4818] = 0x29; M[0x481E] = 0x29;
      M[0x4819] = 0x04; M[0x481F] = 0xD8;
      M[0x4815] = M[0xFA]; M[0x4816] = M[0xFB];
      M[0x47F0] = 0x14;
      do {
        const src = M[0x4815] | M[0x4816] << 8, scr = M[0x4818] | M[0x4819] << 8, col = M[0x481E] | M[0x481F] << 8;
        for (let y = 0x1B; y >= 0; y--) {
          const t = rd(src + y);                                    // lax
          wr(scr + y, t);
          wr(col + y, M[0x8600 + t]);
        }
        M[0x4815] ^= 0x80;
        if (!(M[0x4815] & 0x80)) M[0x4816] = (M[0x4816] + 1) & 255;
        const s = M[0x4818] + 0x28;
        M[0x4818] = s & 255; M[0x481E] = s & 255;
        if (s > 255) { M[0x4819] = (M[0x4819] + 1) & 255; M[0x481F] = (M[0x481F] + 1) & 255; }
        M[0x47F0] = (M[0x47F0] - 1) & 255;
      } while (!(M[0x47F0] & 0x80));
    };
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
