/* en-g0-loop */
// Into the Eagle's Nest, Play port, group "loop": the start of play and the main loop ($484A-$4A9F),
// the play interrupt and its two bands ($4AA7-$4BD7), the message line's shift ($4BDC) and the wipe
// interrupt's install ($4BF2), and the stand-in for the KERNAL's own interrupt handler at $EA31 and
// $EA34, which the game points $0314 at between missions. One function per listing label, on the
// game's own memory P.M, its chips through P.io (en-core.js).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ib } = H;
    const slide_room_apart = H.gen('slide_room_apart', 0x6913);   // go_slide_room_apart $6018
    const draw_panel_numbers = H.call('draw_panel_numbers', 0x5995);
    const short_delay = H.gen('short_delay', 0x5FDA);
    const print_message = H.call('print_message', 0x592E);
    const draw_you_are_dead = H.call('draw_you_are_dead', 0x1A21);  // go_you_are_dead $082A
    const mission_result_screen = H.gen('mission_result_screen', 0x1F3C);
    const mission_briefing = H.gen('mission_briefing', 0x1E3F);
    const mission_select_screen = H.gen('mission_select_screen', 0x1D23);
    const floor_select_screen = H.gen('floor_select_screen', 0x1AB2);
    const score_ticker = H.call('score_ticker', 0x5AA0);
    const scan_space = H.call('scan_space', 0x5FCB);
    const draw_room = H.call('draw_room', 0x47F1);
    const shots_hit_anything = H.call('shots_hit_anything', 0x5212);
    const clear_spent_shots = H.call('clear_spent_shots', 0x4586);
    const stamp_player_in_map = H.call('stamp_player_in_map', 0x5B1B);
    const walked_onto_something = H.call('walked_onto_something', 0x4D3A);
    const idle_nags = H.call('idle_nags', 0x5A33);
    const jewels_pickup = H.call('jewels_pickup', 0x5CB9);
    const mission_done_check = H.call('mission_done_check', 0x5F27);
    const scroll_message_in = H.call('scroll_message_in', 0x5951);
    const sound_tick = H.call('sound_tick', 0x63E6);                 // go_sound_tick $600C
    const mission_state = H.call('mission_state', 0x5BBA);
    const player_and_rooms = H.call('player_and_rooms', 0x426F);
    for (const a of [0x4871, 0x489E, 0x48A2, 0x48C8, 0x48DD, 0x48F8, 0x49F5, 0x4A77]) P.checkpoints.add(a);
    // the flags the main loop polls, which the interrupt sets, and the message line's two counters
    for (const a of [0x02C8, 0x02D3, 0x02E9, 0x00C5, 0x592B, 0x592C]) P.irqBytes.add(a);
    // a wait for the message line to empty, at the loop's head
    function* messageIdle(at) {
      for (;;) { yield { cp: at }; if (ib(0x592B) === ib(0x592C)) return; }
    }

    // ---------------------------------------------------------------- the start of play
    P.start_game_loop = function () {                              // $484A
      P.sei();
      M[0x0314] = 0xA7; M[0x0315] = 0x4A;
      wr(0xDC0E, 0);
      M[0x4AA6] = 0;
      wr(0xD012, 0xE9); wr(0xD01A, 1); wr(0xD011, 0x1B);
      wr(0x0001, 0x36);
      P.cli();
    };
    P.stages[0x484A] = function* () { P.start_game_loop(); return yield* P.game_loop(); };

    // the main loop: watches four things, and goes where the game goes. Returns the stage it jumps to.
    P.game_loop = function* () {                                  // $4871
      for (;;) {
        yield { cp: 0x4871 };
        if (ib(0x02D3) === 0xFF) return yield* P.game_over();
        if (ib(0x02C8) === 2) return yield* P.stepped_into_lift();
        const h = ib(0x02E9);
        if (h === 1) return yield* P.prisoner_delivered();
        if (h === 2) return yield* P.castle_destroyed();
        if (ib(0x00C5) === 0x10) yield* P.pause_game();
      }
    };
    P.pause_game = function* () {                                 // $4899
      M[0x02C9] = 1;
      do yield { cp: 0x489E }; while (ib(0x00C5) !== 0);
      for (;;) {                                                   // $48A2
        yield { cp: 0x48A2 };
        if (((rd(0xDC00) & 0x1F) ^ 0x1F) !== 0) break;
        if (ib(0x00C5) !== 0) break;
        if (ib(0x592B) !== ib(0x592C)) continue;
        M[0xFC] = 0x00; M[0xFD] = 0x59;                             // "...PAUSING..."
        print_message();
      }
      do yield { cp: 0x48C8 }; while (ib(0x00C5) !== 0);
      M[0x02C9] = 0;
    };
    P.stepped_into_lift = function* () {                          // $48D4
      wr(0x0001, 0x26);
      M[0x02C9] = 1;
      yield* messageIdle(0x48DD);
      wr(0xD015, 0);
      yield* slide_room_apart();
      return yield* P.between_missions();
    };
    // the six score digits off the panel at $05D7, as ASCII for the high score check
    const scoreDigits = () => { for (let x = 0; x < 6; x++) M[0x0819 + x] = (M[0x05D7 + x] & 0x0F) + 0x30; };
    P.game_over = function* () {                                  // $48F0
      M[0x02C9] = 1;
      draw_panel_numbers();
      yield* messageIdle(0x48F8);
      yield* short_delay();
      wr(0xD404, 0); wr(0xD40B, 0); wr(0xD412, 0); wr(0xD418, 0);
      wr(0xD015, 0);
      scoreDigits();
      yield* slide_room_apart();
      P.sei();
      wr(0xD011, 0x6B);
      draw_you_are_dead();
      yield* short_delay(); yield* short_delay();
      wr(0xD011, 0x6B);
      wr(0x0001, 0x37);
      return 0x0810;                                               // go_hiscore_check
    };
    // the KERNAL's handler for the screens between missions, and its timer
    const kernalIrq = () => {
      P.sei();
      M[0x0314] = 0x34; M[0x0315] = 0xEA;
      wr(0xD01A, 0); wr(0xDC0E, 1);
      P.cli();
    };
    P.between_missions = function* () {                           // $4946
      kernalIrq();
      if (!M[0x426E]) {
        M[0x4012] = 0;
        const r = yield* mission_select_screen();
        M[0x400F] = r.a & 255;
        return P.mission_prisoner_floor(r.a & 255);
      }
      M[0x02E6] = M[0x02A7];
      const r = yield* floor_select_screen();
      M[0x02A7] = r.a & 255;
      const pf = M[0x4010];
      if (pf !== 0xFF && pf === M[0x02E6]) {
        M[0x4012] = 0;
        if (!M[0x02E8]) { M[0x4012] = 1; M[0x4010] = M[0x02A7]; }
      }
      M[0x4009] = M[0x02AC]; M[0x400A] = M[0x02BD]; M[0x400B] = M[0x02C6];
      M[0x400C] = M[0x02C2]; M[0x400D] = M[0x02C3]; M[0x400E] = M[0x02C4];
      return 0x404F;                                               // j_49E9: jmp mission_start
    };
    // j_496C: the floor the mission's prisoner is on, from the mission's number in A
    P.mission_prisoner_floor = function (a) {                      // $496C
      M[0x4010] = a === 1 ? 0x00 : a === 2 ? 0x02 : a === 3 ? 0x03 : 0xFF;
      return 0x404F;
    };
    P.prisoner_delivered = function* () {                         // $49EC
      wr(0x0001, 0x26);
      M[0x02C9] = 1;
      yield* messageIdle(0x49F5);
      M[0x6043] = 0; M[0x4009] = 0; M[0x4012] = 0;
      M[0x400A] = 0x99; M[0x400B] = 0;
      M[0x400C] = M[0x02C2]; M[0x400D] = M[0x02C3]; M[0x400E] = M[0x02C4];
      yield* short_delay();
      wr(0xD015, 0);
      yield* slide_room_apart();
      kernalIrq();
      M[0x400F] = (M[0x400F] + 1) & 255;
      M[0x0836] = M[0x400F];
      yield* mission_briefing();
      M[0x4011] = 1;
      return P.mission_prisoner_floor(M[0x400F]);
    };
    P.castle_destroyed = function* () {                           // $4A5C
      wr(0x0001, 0x26);
      M[0x02C9] = 1;
      scoreDigits();
      yield* messageIdle(0x4A77);
      yield* short_delay();
      wr(0xD015, 0);
      yield* slide_room_apart();
      kernalIrq();
      yield* mission_result_screen();
      return 0x0810;                                               // go_hiscore_check
    };

    // ---------------------------------------------------------------- the play interrupt
    P.game_irq = function () {                                     // $4AA7
      wr(0xD019, 1);
      const band = 1 ^ M[0x4AA6];
      M[0x4AA6] = band;
      if (band) { P.irq_game_work(); wr(0xD012, 0xE3); }
      else { P.irq_sprites_and_message(); wr(0xD012, 0xFC); }
    };
    P.irqs[0x4AA7] = P.game_irq;
    P.irq_game_work = function () {                                // $4ACD
      wr(0xD018, 0x18); wr(0xD016, 0x50);
      score_ticker();
      if (M[0x02EF]) draw_panel_numbers();
      scan_space();
      if (M[0x02C9]) return P.step_message_scroll();
      if (M[0x02AA] & 7) { draw_room(); return P.step_message_scroll(); }
      const phase = M[0x02EF] = (M[0x02EF] + 1) & 255;
      if (phase === 1) { draw_room(); return P.step_message_scroll(); }
      if (phase === 2) {
        walked_onto_something();
        shots_hit_anything();
        clear_spent_shots();
        idle_nags();
        M[0x02F0] = 1;
        stamp_player_in_map();
        jewels_pickup();
        mission_done_check();
        return P.step_message_scroll();
      }
      M[0x02EF] = 0;
      M[0x02F0] = 3;
      shots_hit_anything();
      clear_spent_shots();
      stamp_player_in_map();
      return P.step_message_scroll();
    };
    P.step_message_scroll = function () {                          // $4B35
      const s = M[0x02A9] - 4;
      M[0x02A9] = s & 255;
      if (s >= 0) return;
      M[0x02A9] = 4;
      P.shift_message_line();
      scroll_message_in();
    };
    P.irq_sprites_and_message = function () {                      // $4B4C
      wr(0xD018, 0x1A);
      wr(0xD016, 0x40 | M[0x02A9]);
      sound_tick();
      mission_state();
      if (!M[0x02C9]) {
        const s = M[0x46F1];
        if (s) {
          if (s === 2) wr(0xD02B, 7);
          M[0x46F1] = (s - 1) & 255;
          if (!M[0x46F1]) { wr(0xD008, 0); wr(0xD009, 0); }
        }
        if (!(M[0x02AA] & 8)) player_and_rooms();
      }
      const x = (M[0x02DF] - 8) & 255, x2 = (x + 0x18) & 255;
      wr(0xD000, x); wr(0xD004, x); wr(0xD002, x2); wr(0xD006, x2);
      const y = (M[0x02E0] - 4) & 255, y2 = (y + 0x15) & 255;
      wr(0xD001, y); wr(0xD003, y); wr(0xD005, y2); wr(0xD007, y2);
      if (M[0x02E3]) return;
      const shape = (((M[0x02DA] & 2) << 3) + M[0x4BD8 + ((M[0x02B0] - 1) & 255)]) & 255;
      M[0x07F8] = shape; M[0x07F9] = (shape + 1) & 255; M[0x07FA] = (shape + 2) & 255; M[0x07FB] = (shape + 3) & 255;
    };
    P.shift_message_line = function () {                           // $4BDC
      for (let x = 0xD8; x < 256; x++) { M[0x06C0 + x] = M[0x06C1 + x]; M[0x06E8 + x] = M[0x06E9 + x]; }
    };
    P.install_wipe_irq = function () {                             // $4BF2
      P.sei();
      wr(0xDC0E, 0); wr(0xD011, 0x1B); wr(0xD01A, 1);
      M[0x4BEE] = 0x32; M[0x4BEF] = 0xFA; M[0x4BF0] = 1; M[0x4BF1] = 0;
      M[0x0314] = 0x22; M[0x0315] = 0x4C;
      P.cli();
    };
    // The KERNAL's interrupt, $EA31 and from $EA34: what the game depends on of it is CIA 1's
    // acknowledgement, the read of $DC0D at $EA7E. Its clock and keyboard scan are not kept: the game
    // reads neither while it runs ($C5 is written by the game's own scan at $5FCB).
    P.kernal_irq = function () { rd(0xDC0D); };
    P.irqs[0xEA31] = P.irqs[0xEA34] = P.kernal_irq;
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
