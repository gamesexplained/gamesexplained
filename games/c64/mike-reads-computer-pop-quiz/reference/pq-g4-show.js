/* pq-g4-show */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 4, the show. The game's main program in the title part:
// the loader's hand-over and start-up, a new game, the show's 32 steps (the Jukebox, Spot the Star, Your Scene,
// Name the Year, the Quickfire Round and the end), asking a question, the answer clock, judging and scoring, the
// question block's choice and its tape loads, and the routines the menu calls (screen_off_sync, screen_on_sync,
// pause_state12, scores_reset, irq_setup). One function per listing label, on the game's memory (pq-core.js).
//
// The main program is a chain of stages, P.stages[address], each a generator that returns the address the game
// jumps to next (pq-core.js's P.program runs them). Each stage yields its own address as a checkpoint at its head,
// and the address of every JSR it makes just before the call; a routine called by JSR that waits (block_choice,
// pause_frames, flash_choice, screen_off_sync, screen_on_sync, pause_state12) is a generator, and its own JSRs are
// checkpoints too. A loop that polls what the interrupt writes (step_done $FF, text_event $23, irq_sync $055C)
// yields bare once a turn, its work before the yield. The answer clock's loop ($2F51-$2F91) has a JSR in every turn
// and reads step_done once a turn after it: it reads step_done through P.io.irqByte, so that the lockstep gives it
// the value the game's loop read there (the interrupt may set it while draw_clock runs), and so the choice ($075F)
// the interrupt wrote with it, read as the loop ends. A lockstep lists both in irqBytes.
//
// The main program's writes of RAM go through P.io.store where the chips have one (st below): many of the bytes it
// writes (step_done, text_event, the text pointer, the cursors, the cell row and column) are written by the
// interrupts too, and a write of the value an interrupt left there must still count as the main program's.
// The busy loops of pause_frames and flash_choice (65,536 turns of dex/bne each) are { cycles } for the page's
// clock (H.work); they read nothing.
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M;
    const st = (a, v) => { v &= 255; if (P.io && P.io.store) P.io.store(a, v); else M[a] = v; };
    const inc = (a) => st(a, M[a] + 1);
    const dec = (a) => st(a, M[a] - 1);
    const text = (lo, hi) => { st(0xF6, lo); st(0xF7, hi); };
    const cell = (col, row) => { st(0x16, col); st(0x15, row); };
    const R0 = () => ({ a: 0, x: 0, y: 0, c: 0, z: 0, n: 0, v: 0 });
    const nz = (r, v) => { r.z = (v & 255) === 0 ? 1 : 0; r.n = (v >> 7) & 1; return r; };
    // the registers as one stage leaves them for the next (P.r): the game's JMPs keep them, and run_show_step's X,
    // the step number, reaches pick_question through quickfire_next, which saves it in its operand at $2CB0
    if (!P.r) P.r = R0();
    const go = (r, at) => { P.r = r; return at; };
    const set = (r, a, x, y) => { r.a = a; r.x = x; r.y = y; return r; };
    // jsr into the sound code ($4FCB the effects, $5095 the effects' start, $4C00 the music's), on the kit's 6502
    const drv = (e, r) => { const o = H.driver(e, { a: r.a, x: r.x, y: r.y }); r.a = o.a; r.x = o.x; r.y = o.y; r.c = o.c; return r; };
    // a byte the interrupt writes, as the main program reads it in the middle of a stretch: step_done in the answer
    // clock's loop, and the choice (team 0's, $075F) the interrupt wrote with it, read when the loop ends
    const irqRead = (a) => (P.io && P.io.irqByte ? P.io.irqByte(a) : M[a]) & 255;
    const doneNow = () => irqRead(0xFF);
    const cp = (a) => H.cp(a);

    H.checkpoint(
      // stage heads
      0x40E2, 0x0400, 0x04F7, 0x2CD8, 0x2CF7, 0x2D33, 0x2D36, 0x2D3C, 0x2DC7, 0x2DCC, 0x2E53, 0x2FA0, 0x3029, 0x309C,
      0x30AE, 0x30E3, 0x311E, 0x3558, 0x3563, 0x357C, 0x3584, 0x38A9, 0x38E6, 0x395A, 0x3965, 0x396D, 0x0E39, 0x0DFC,
      0x0D88, 0x0DDD, 0x27D7,
      // JSRs: start-up and new_game
      0x04FC, 0x2CE3, 0x2CE6, 0x2CE9, 0x2CEC, 0x2CF4,
      // block_choice
      0x292C, 0x2935, 0x293E, 0x2947, 0x2950, 0x2959, 0x297A, 0x2988, 0x2996, 0x29A4, 0x29B2, 0x29C0, 0x29CE, 0x29DC,
      0x29EA, 0x29F8, 0x2A12, 0x2A64, 0x2A70, 0x2A79, 0x2A7E, 0x2A87, 0x2A8C, 0x2ABF, 0x2AC4, 0x2ACD, 0x2AD2,
      // ask_question_body, ask_again
      0x2D4E, 0x2D51, 0x2D54, 0x2D57, 0x2D67, 0x2D6E, 0x2D75, 0x2D78, 0x2D91, 0x2D9E, 0x2DB3, 0x2DC4,
      0x2DCF, 0x2E38, 0x2E3B, 0x2E3E,
      // show_answers
      0x2E5A, 0x2E93, 0x2E9C, 0x2EA5, 0x2EAE, 0x2EC1, 0x2ECF, 0x2EDD, 0x2EEB, 0x2F05, 0x2F13, 0x2F21, 0x2F2F, 0x2F45,
      0x2F57, 0x2F68,
      // time_up, bonus_question, judge_answer, wrong_answer
      0x2FA8, 0x2FAB, 0x2FAE, 0x2FB1, 0x2FB8, 0x2FE8, 0x2FFD, 0x3057, 0x3064, 0x3072, 0x307F,
      0x30B1, 0x30B4, 0x30B7, 0x30BA, 0x30E0, 0x3131, 0x3138, 0x3171, 0x3178, 0x319A,
      // the Jukebox
      0x3587, 0x358A, 0x358D, 0x3590, 0x35A2, 0x35BD, 0x35DC, 0x35E7, 0x360D, 0x3620, 0x3639, 0x3647,
      // Spot the Star
      0x38AC, 0x38AF, 0x38B2, 0x38BD, 0x38DD, 0x38E9, 0x38EC, 0x38EF, 0x38FE, 0x391A,
      // Your Scene
      0x3974, 0x3977, 0x397A, 0x397D, 0x3984, 0x39B7, 0x39CE, 0x39DD, 0x39E6, 0x39EF, 0x39F8, 0x3A0B, 0x3A19, 0x3A32,
      0x3A40, 0x3A51, 0x3A60, 0x3A81, 0x3A9D, 0x3AAE,
      // Name the Year, the Quickfire Round, game_over
      0x0DFF, 0x0E02, 0x0E05, 0x0E10, 0x0E30, 0x0E3C, 0x0E3F, 0x0E42, 0x0E4D, 0x0E6D,
      0x0D8B, 0x0D8E, 0x0D91, 0x0DB3, 0x0DB6, 0x0DE9,
      0x27DA, 0x27DD, 0x27E0, 0x282B);

    // --- the start-up ---
    // loader_handover ($40E2): the screen on ($D011 = $1B), then game_start
    P.stages[0x40E2] = function* () { yield cp(0x40E2); H.wr(0xD011, 0x1B); return 0x0400; };
    // game_start ($0400): jmp game_init
    P.stages[0x0400] = function* () { yield cp(0x0400); return 0x04F7; };
    // game_init ($04F7): the ROMs in ($01 = $27) for IOINIT, out again ($01 = $25), then the menu at $E2C0
    P.stages[0x04F7] = function* () {
      yield cp(0x04F7);
      H.setPort(0x27);
      yield cp(0x04FC); K.ioinit();
      H.setPort(0x25);
      return 0xE2C0;
    };

    // --- routines the menu calls too ---
    // screen_off_sync ($0EB3): screen_on ($FE) = 0, irq_sync ($055C) = $FF, then waits until irq_frame clears it
    P.screen_off_sync = function* (r) {
      st(0xFE, 0); st(0x055C, 0xFF);
      while (M[0x055C] !== 0) yield;
      r.a = 0; return nz(r, 0);
    };
    // screen_on_sync ($0EC2): screen_on = $FF, irq_sync = 0, then waits until irq_frame sets it
    P.screen_on_sync = function* (r) {
      st(0xFE, 0xFF); st(0x055C, 0);
      while (M[0x055C] === 0) yield;
      r.a = M[0x055C]; return nz(r, r.a);
    };
    // scores_reset ($0ED1): both scores and the scores shown to 0, the score roll's counters to 0, and the four
    // digit sources back to $A8C9 (the digit 0)
    P.scores_reset = function (r) {
      for (const a of [0x206F, 0x38A6, 0x38A7, 0x38A4, 0x38A5, 0xFC, 0xFD, 0x2070, 0x2071]) st(a, 0);
      for (const a of [0x2067, 0x2068, 0x2069, 0x206A]) st(a, 0xC9);
      for (const a of [0x206B, 0x206C, 0x206D, 0x206E]) st(a, 0xA8);
      r.a = 0xA8; return nz(r, 0xA8);
    };
    // the busy loop at $31AF: Y and X from 0, 256 x 256 turns of dex/bne
    const DELAY = 329215;
    // pause_frames ($31AB): display state 8, then the delay
    P.pause_frames = function* (r) {
      st(0x22, 8);
      yield* H.work(2 + 3 + 2 + DELAY + 6);
      r.a = 8; r.x = 0; r.y = 0; return nz(r, 0);
    };
    // pause_state12 ($31A4): display state 12, then pause_frames' delay
    P.pause_state12 = function* (r) {
      st(0x22, 0x0C);
      yield* H.work(2 + 3 + 3 + 2 + DELAY + 6);
      r.a = 0x0C; r.x = 0; r.y = 0; return nz(r, 0);
    };
    // flash_choice ($31BA): display state 10 (answer_flash_frame flashes the chosen answer) for two delays,
    // counted in flash_delays ($3CEB), then display state 8
    P.flash_choice = function* (r) {
      st(0x22, 0x0A); st(0x3CEB, 2);
      do {
        yield* H.work(2 + DELAY + 6 + 3);
        dec(0x3CEB);
      } while (M[0x3CEB] !== 0);
      st(0x22, 8);
      r.a = 8; r.x = 0; r.y = 0; return nz(r, 8);
    };
    // irq_setup ($2B24): $01 = $25, CIA 1's interrupts off (and acknowledged), the NMI vector $0BE6 and the IRQ
    // vector $07A4, CIA 2's port A ($DD02 $3F, $DD00 $96: the video bank at $4000), $D018 = $78, the sound started
    // (the effects' $5095 when a block's are loaded, else the music's init $4C00 with A = 0), the raster
    // interrupt at line $FC
    P.irq_setup = function (r) {
      H.setPort(0x25);
      H.wr(0xDC0D, 0x7F); H.rd(0xDC0D);
      st(0xFFFA, 0xE6); st(0xFFFB, 0x0B); st(0xFFFE, 0xA4); st(0xFFFF, 0x07);
      H.wr(0xDD02, 0x3F); H.wr(0xDD00, 0x96); H.wr(0xD018, 0x78);
      if (M[0x33FE]) { r.a = M[0x33FE]; drv(0x5095, r); } else { r.a = 0; drv(0x4C00, r); }
      H.wr(0xD012, 0xFC); H.wr(0xD01A, 1);
      r.a = 1; return nz(r, 1);
    };

    // --- block_choice ($2927): the five blocks offered, a choice, and the block's four files from the tape ---
    const printText = function* (r, at, a, y, x) { set(r, a, x, y); yield cp(at); return P.print_text(r); };
    const fill = function* (r, at, a, x, y) { set(r, a, x, y); yield cp(at); return P.fill_colour_block(r); };
    const bar = function* (r, at, a, x, y) { set(r, a, x, y); yield cp(at); return P.put_pixel_bar(r); };
    P.block_choice = function* (r) {
      st(0x07C4, 0);
      yield cp(0x292C); r = P.clear_choice_area(r);
      r = yield* printText(r, 0x2935, 0x1F, 0x02, 0x1A);
      r = yield* printText(r, 0x293E, 0x20, 0x0C, 0x1A);
      r = yield* printText(r, 0x2947, 0x21, 0x16, 0x1A);
      r = yield* printText(r, 0x2950, 0x22, 0x20, 0x1A);
      r = yield* printText(r, 0x2959, 0x23, 0x2A, 0x1A);
      st(0xF9, 0); st(0x05E2, 1); st(0x18E5, 8); st(0x1863, 0xD8); st(0x188E, 0);
      const rows = [[0x14, 0xD8, 0xFF, 0x297A, 0x2988], [0x1E, 0x5C, 0xAA, 0x2996, 0x29A4], [0x28, 0xD8, 0xFF, 0x29B2, 0x29C0],
        [0x32, 0x5C, 0xAA, 0x29CE, 0x29DC], [0x3C, 0xD8, 0xFF, 0x29EA, 0x29F8]];
      for (let i = 0; i < 5; i++) {
        const [y, target, pattern, f, b] = rows[i];
        if (i) st(0x1863, target);
        r = yield* fill(r, f, 0x11, 0x5C, y);
        st(0x18EE, pattern);
        r = yield* bar(r, b, 0x11, 0x5C, y);
      }
      st(0x07C4, 0xFF); st(0x22, 9); st(0xFF, 0);
      while (!M[0xFF]) yield;
      st(0x18E5, 0x0E);
      yield cp(0x2A12); r = P.clear_choice_area(r);
      // the three files' names: block_file_letters ($2B73) + block_file_offset[choice], into the ldx/ldy operands
      let s = M[0x2B6E + M[0x075F]] + 0x73;
      st(0x2A84, s); st(0x2A86, 0x2B + (s >> 8));
      s = M[0x2A84] + 1; st(0x2ABC, s); st(0x2ABE, M[0x2A86] + (s >> 8));
      s = M[0x2ABC] + 1; st(0x2ACA, s); st(0x2ACC, M[0x2ABE] + (s >> 8));
      H.setPort(0x36);
      H.wr(0xD01A, 0); H.wr(0xD418, 0); H.wr(0xD015, 0);
      st(0x07C4, 0); st(0x1DB0, 0); st(0x1DAF, 0);
      r.a = 0; yield cp(0x2A64); K.setmsg();
      st(0x0346, 0xAD);
      set(r, 1, 1, 1); yield cp(0x2A70); K.setlfs();
      set(r, 2, 0x82, 0x2B); yield cp(0x2A79); K.setnam(2, 0x82, 0x2B);
      r.a = 0; yield cp(0x2A7E); Object.assign(r, K.load());
      set(r, 1, M[0x2A84], M[0x2A86]); yield cp(0x2A87); K.setnam(1, M[0x2A84], M[0x2A86]);
      r.a = 0; yield cp(0x2A8C); Object.assign(r, K.load());
      // file A, loaded at $E000, copied under the I/O area to $D000-$DFFF with all RAM in
      H.setPort(0x34);
      st(0x31, 0xE0); st(0x33, 0xD0); st(0x30, 0); st(0x32, 0);
      do {
        const src = M[0x31] << 8, dst = M[0x33] << 8;
        for (let i = 0; i < 256; i++) M[dst + i] = M[src + i];
        inc(0x31); inc(0x33);
      } while (M[0x33] !== 0xE0);
      H.setPort(0x36);
      set(r, 1, M[0x2ABC], M[0x2ABE]); yield cp(0x2ABF); K.setnam(1, M[0x2ABC], M[0x2ABE]);
      r.a = 0; yield cp(0x2AC4); Object.assign(r, K.load());
      set(r, 1, M[0x2ACA], M[0x2ACC]); yield cp(0x2ACD); K.setnam(1, M[0x2ACA], M[0x2ACC]);
      r.a = 0; yield cp(0x2AD2); Object.assign(r, K.load());
      H.setPort(0x36);
      H.wr(0xD020, 0);
      st(0x2B90, 3);
      // the block's ten question groups: first question ($B804-$B80E into group_first $1D7E), sizes (group_size
      // $1D9D and subject_left $0F09) and the picker's masks (group_mask $1D93)
      for (let x = 10; x >= 0; x--) st(0x1D7E + x, M[0xB804 + x]);
      for (let x = 9; x >= 0; x--) { const v = (M[0x1D7F + x] - M[0x1D7E + x]) & 255; st(0x1D9D + x, v); st(0x0F09 + x, v); }
      for (let x = 9; x >= 0; x--) {
        const y = M[0x1D9D + x];
        st(0x1D93 + x, y < 8 ? 0x07 : y < 0x10 ? 0x0F : y < 0x20 ? 0x1F : 0x3F);
      }
      st(0x33FE, 1);
      r.x = 0xFF;
      return P.irq_setup(r);
    };

    // --- a game ---
    // new_game ($2CD8): show_step, turn_player_count and number_pick to 0, the scores reset and shown, the grid's
    // subjects and the numbers' order shuffled; a block chosen and loaded when its games are used up
    P.stages[0x2CD8] = function* () {
      let r = P.r;
      yield cp(0x2CD8);
      st(0x0751, 0); st(0x33EF, 0); st(0x075E, 0);
      yield cp(0x2CE3); r = P.scores_reset(r);
      yield cp(0x2CE6); r = P.score_digits_frame(r);
      yield cp(0x2CE9); r = P.grid_setup(r);
      yield cp(0x2CEC); r = P.shuffle_number_order(r);
      dec(0x2B90);
      if (M[0x2B90] & 0x80) { yield cp(0x2CF4); r = yield* P.block_choice(r); }
      return go(r, 0x2CF7);
    };
    // run_show_step ($2CF7): display state 8, the state interrupt off, the bubble up, fire_held, sprites off,
    // 2 points, team0_choice $FF; the step's team (step_team $3362) and its routine (step_routine_lo/hi $338E/$33AE)
    // into the operand of the jmp at $2D30, which the stage returns
    P.stages[0x2CF7] = function* () {
      yield cp(0x2CF7);
      st(0x22, 8); st(0x06AC, 0); st(0x05E2, 0); st(0xFB, 0xFF); st(0x07C4, 0); H.wr(0xD015, 0);
      st(0x30F4, 2); st(0x3102, 2); st(0x2B91, 0xFF);
      const r = P.r, x = M[0x0751];
      st(0xF9, M[0x3362 + x]); st(0x2D31, M[0x338E + x]); st(0x2D32, M[0x33AE + x]);
      r.x = x; r.a = M[0x2D32]; nz(r, r.a);
      return go(r, M[0x2D31] | M[0x2D32] << 8);
    };
    // ask_question ($2D33): jmp ask_question_body
    P.stages[0x2D33] = function* () { yield cp(0x2D33); return 0x2D3C; };
    // next_step ($2D36): show_step + 1, then run_show_step
    P.stages[0x2D36] = function* () { yield cp(0x2D36); inc(0x0751); return 0x2CF7; };
    // ask_question_body ($2D3C): four pauses before a Jukebox question; the question screen: sprites 0-3, the play
    // area cleared, the centre drawn, the bubble down, and the asked team's picture (both in the Quickfire Round)
    P.stages[0x2D3C] = function* () {
      let r = P.r;
      yield cp(0x2D3C);
      st(0xFF, 0); st(0x22, 8);
      if (!M[0x0985] && !M[0x1DC0]) for (const a of [0x2D4E, 0x2D51, 0x2D54, 0x2D57]) { yield cp(a); r = yield* P.pause_frames(r); }
      st(0x06AC, 0); st(0x07C4, 0x0F); H.wr(0xD015, 0x0F);
      yield cp(0x2D67); r = P.clear_play_colours(r);
      r.x = 0x62; r.y = 0xA8; yield cp(0x2D6E); r = P.clear_bitmap_strip(r);
      r.x = 0x63; r.y = 0xE8; yield cp(0x2D75); r = P.clear_bitmap_strip(r);
      yield cp(0x2D78); r = P.draw_centre(r);
      st(0x05E2, 1);
      if (M[0x1DC0] === 3) {
        cell(1, 1); r.a = 1; yield cp(0x2D91); r = P.draw_frame_block(r);
        cell(0x21, 1); r.a = 2; yield cp(0x2D9E); r = P.draw_frame_block(r);
      } else if (M[0xF9] === 0) {
        cell(1, 1); r.a = M[0xAF3A]; yield cp(0x2DB3); r = P.draw_frame_block(r);
      } else {
        cell(0x21, 1); r.a = M[0xAF3A]; yield cp(0x2DC4); r = P.draw_frame_block(r);
      }
      return go(r, 0x2DC7);
    };
    // first_clue ($2DC7): clue_number ($2695) = 0
    P.stages[0x2DC7] = function* () { yield cp(0x2DC7); st(0x2695, 0); return 0x2DCC; };
    // ask_again ($2DCC): the bubble cleared, the computer's 8-11 wandering moves, step_done, cpu_wait and
    // cpu_decided cleared; the question's lead-in text by round type; the question and its answers built and the
    // text started (display state 6); then waits for the question's end
    P.stages[0x2DCC] = function* () {
      let r = P.r;
      yield cp(0x2DCC); r = P.clear_bubble(r);
      yield cp(0x2DCF); r = P.random(r);
      st(0x0B17, (r.a & 3) + 8);
      st(0xFF, 0); st(0x0B15, 0); st(0x2B84, 0);
      const t = M[0x1DC0];
      if (t === 1 || t === 2) { const x = M[0x2695]; text(M[0xB24F + x], M[0xB252 + x]); r.x = x; r.a = M[0xF7]; }
      else if (t === 3) { text(0xCE, 0xB1); r.a = 0xB1; }
      else if (M[0x0985]) {
        st(0x0985, 0); text(0x74, 0xB1); r.a = M[0x3ACB];
        if (M[0x3ACB]) { text(0x8B, 0xB1); r.a = 0xB1; }
      } else { text(0x24, 0xB3); r.a = 0xB3; }
      nz(r, r.a);
      yield cp(0x2E38); r = yield* P.build_round_question(r);
      yield cp(0x2E3B); r = yield* P.build_answers(r);
      yield cp(0x2E3E); r = P.text_print(r);
      st(0x22, 6); st(0x07C4, 0xFF); st(0x06AC, 0xFF);
      while (!M[0xFF]) yield;
      return go(r, 0x2E53);
    };
    // show_answers ($2E53): the panel cleared, the answer area's colours (rows 11-15 columns 6-33, row 16 columns
    // 11-29) to 0 in colour RAM and the screen colours, the four answers printed with their colours and bars, the
    // cursors to 0, display state 7; then the clock: a face every clock_rate ($2F72) turns, a tick sound every third
    // turn, until an answer (step_done) or the 32nd face (time_up)
    P.stages[0x2E53] = function* () {
      let r = P.r;
      yield cp(0x2E53);
      st(0xFF, 0); st(0x07C4, 0);
      yield cp(0x2E5A); r = P.clear_panel(r);
      for (let x = 0x1B; x >= 0; x--) {
        for (const [c, s] of [[0xD9BE, 0x5DBE], [0xD9E6, 0x5DE6], [0xDA0E, 0x5E0E], [0xDA36, 0x5E36], [0xDA5E, 0x5E5E]]) {
          H.wr(c + x, 0); st(s + x, 0);
        }
      }
      for (let x = 0x12; x >= 0; x--) { H.wr(0xDA8B + x, 0); st(0x5E8B + x, 0); }
      r = yield* printText(r, 0x2E93, 0x17, 0x03, 0x00);
      r = yield* printText(r, 0x2E9C, 0x18, 0x13, 0x00);
      r = yield* printText(r, 0x2EA5, 0x19, 0x23, 0x00);
      r = yield* printText(r, 0x2EAE, 0x1A, 0x33, 0x00);
      st(0x1863, 0xD8); st(0x188E, 0);
      r = yield* fill(r, 0x2EC1, 0x17, 0x46, 0x13);
      st(0x1863, 0x5C); r = yield* fill(r, 0x2ECF, 0x17, 0x46, 0x23);
      st(0x1863, 0xD8); r = yield* fill(r, 0x2EDD, 0x17, 0x46, 0x33);
      st(0x1863, 0x5C); r = yield* fill(r, 0x2EEB, 0x17, 0x46, 0x43);
      if (M[0x1DC0] !== 3) st(0x2F56, 0);
      st(0x18EE, 0xFF); r = yield* bar(r, 0x2F05, 0x17, 0x46, 0x13);
      st(0x18EE, 0xAA); r = yield* bar(r, 0x2F13, 0x17, 0x46, 0x23);
      st(0x18EE, 0xFF); r = yield* bar(r, 0x2F21, 0x17, 0x46, 0x33);
      st(0x18EE, 0xAA); r = yield* bar(r, 0x2F2F, 0x17, 0x46, 0x43);
      st(0x0CB8, 0); st(0x0CB9, 0); st(0x07C4, 0xFF);
      cell(0x11, 0x11); yield cp(0x2F45); r = P.clear_block_colours(r);
      st(0x22, 7); st(0x1845, 3);
      for (;;) {
        set(r, M[0x2F56], 0x10, 0x0E);
        yield cp(0x2F57); r = P.draw_clock(r);
        dec(0x1845);
        if (!M[0x1845]) { st(0x1845, 3); r.x = 3; r.y = 1; yield cp(0x2F68); r = drv(0x4FCB, r); }
        inc(0x8F27);
        const a = M[0x8F27];
        st(0x8F27, a);                       // $2F73: the count stored again, with the flags of the compare
        if (a === M[0x2F72]) {
          st(0x8F27, 0); inc(0x2F56);
          if (M[0x2F56] === 0x20) { st(0x2F56, 0); return go(r, 0x2FA0); }
        }
        if (doneNow()) break;
      }
      if (!M[0xF9]) st(0x2B91, irqRead(0x075F));
      return go(r, 0x30AE);
    };
    // time_up ($2FA0): the answers cleared, the time-out sound; in Name the Year and Spot the Star the next clue
    // for a point less (to the third), else "Time out" and the bonus offer to the other team, or the end of the
    // step (the Quickfire Round ends: show_step = 24)
    P.stages[0x2FA0] = function* () {
      let r = P.r;
      yield cp(0x2FA0);
      st(0xFF, 0); st(0x22, 8);
      yield cp(0x2FA8); r = P.clear_bubble(r);
      yield cp(0x2FAB); r = P.clear_answer_bars(r);
      yield cp(0x2FAE); r = P.clear_answer_blocks(r);
      yield cp(0x2FB1); r = P.draw_centre(r);
      r.x = 8; r.y = 1; yield cp(0x2FB8); r = drv(0x4FCB, r);
      const t = M[0x1DC0];
      let bonusTry = false;
      if (t === 1 || t === 2) {
        if (M[0x1DBF] === 1) bonusTry = true;
        else {
          inc(0x2695);
          if (M[0x2695] !== 3) { dec(0x30F4); dec(0x3102); return go(r, 0x2DCC); }
        }
      }
      if (!bonusTry) {
        text(0x80, 0x1E); yield cp(0x2FE8); r = P.text_print(r);
        st(0xF9, M[0xF9] ^ 1);
        if (!M[0xF9]) { text(0x8C, 0x1E); yield cp(0x2FFD); r = P.text_print(r); }
        if (M[0x1DC0] === 3) { text(0x9D, 0x1E); st(0x0751, 0x18); return go(r, 0x309C); }
        if (M[0x1DBF] === 2) return go(r, 0x3029);
      }
      text(0x97, 0x1E);
      return go(r, 0x309C);
    };
    // bonus_question ($3029): 1 point; the Quickfire Round and a last try end the step; otherwise the bubble
    // (display state 4) asks the other team, its text events swapping the teams' pictures, and the answers again
    P.stages[0x3029] = function* () {
      let r = P.r;
      yield cp(0x3029);
      st(0x30F4, 1); st(0x3102, 1);
      if (M[0x1DC0] === 3) return go(r, 0x309C);
      dec(0x1DBF);
      if (!M[0x1DBF]) return go(r, 0x309C);
      st(0x22, 4);
      for (;;) {
        if (M[0x23]) {
          if (!M[0x24]) {
            cell(1, 1); yield cp(0x3057); r = P.clear_block_colours(r);
            cell(0x21, 1); r.a = 2; yield cp(0x3064); r = P.draw_frame_block(r);
          } else {
            cell(0x21, 1); yield cp(0x3072); r = P.clear_block_colours(r);
            cell(1, 1); r.a = 1; yield cp(0x307F); r = P.draw_frame_block(r);
          }
          st(0x23, 0);
          continue;
        }
        if (M[0xFF]) break;
        yield;
      }
      text(0x00, 0xB5); st(0xFF, 0);
      return go(r, 0x2E53);
    };
    // end_step_text ($309C): the text in text_ptr in the bubble (display state 4), then the next step
    P.stages[0x309C] = function* () {
      let r = P.r;
      yield cp(0x309C); r = P.text_print(r);
      st(0xFF, 0); st(0x22, 4);
      while (!M[0xFF]) yield;
      return go(r, 0x2D36);
    };
    // judge_answer ($30AE): the choice flashed, the answers cleared; the answering team's choice against the right
    // answer's slot ($3506): wrong_answer, or "Correct, n point(s)" and the right-answer sound, then award_points
    P.stages[0x30AE] = function* () {
      let r = P.r;
      yield cp(0x30AE); r = yield* P.flash_choice(r);
      yield cp(0x30B1); r = P.clear_answer_bars(r);
      yield cp(0x30B4); r = P.clear_answer_blocks(r);
      yield cp(0x30B7); r = P.draw_centre(r);
      yield cp(0x30BA); r = P.clear_bubble(r);
      const y = M[0xF9];
      if (M[0x075F + y] !== M[0x3506]) return go(r, 0x311E);
      const x = (M[0x30F4] - 1) & 255;
      text(M[0x1DE1 + x], M[0x1DE4 + x]);
      set(r, M[0xF7], 4, 1); yield cp(0x30E0); r = drv(0x4FCB, r);
      return go(r, 0x30E3);
    };
    // award_points ($30E3): the result text; the points (the operand at $30F4 or $3102) added to the team's BCD
    // score; the bubble (state 4), then the score roll (state 13), then the next step
    P.stages[0x30E3] = function* () {
      let r = P.r;
      yield cp(0x30E3); r = P.text_print(r);
      st(0xFF, 0);
      const t = M[0xF9] ? 1 : 0;
      st(0x38A6 + t, H.adcD(M[0x38A6 + t], M[t ? 0x3102 : 0x30F4], 0).a);
      st(0x22, 4);
      while (!M[0xFF]) yield;
      st(0xFF, 0); st(0x22, 0x0D);
      while (!M[0xFF]) yield;
      return go(r, 0x2D36);
    };
    // wrong_answer ($311E): the wrong-answer sounds; in the Quickfire Round a point to the other team at once (its
    // name into the text at $1E46), else "Incorrect" and the bonus offer to the other team (bonus_question)
    P.stages[0x311E] = function* () {
      let r = P.r;
      yield cp(0x311E);
      if (M[0x1DC0] === 3) {
        text(0x2A, 0x1E); r.a = 0x1E;
        r.x = 1; r.y = 1; yield cp(0x3131); r = drv(0x4FCB, r);
        r.x = 2; r.y = 2; yield cp(0x3138); r = drv(0x4FCB, r);
        st(0x30F4, 1); st(0x3102, 1);
        st(0xF9, M[0xF9] ^ 1);
        if (M[0xF9]) { st(0x1E46, 0xF1); st(0x1E47, 0xB1); } else { st(0x1E46, 0xE7); st(0x1E47, 0xB1); }
        return go(r, 0x30E3);
      }
      text(0xBA, 0x1E); r.a = 0x1E;
      r.x = 1; r.y = 1; yield cp(0x3171); r = drv(0x4FCB, r);
      r.x = 2; r.y = 2; yield cp(0x3178); r = drv(0x4FCB, r);
      st(0xF9, M[0xF9] ^ 1);
      if (!M[0xF9]) text(0xC5, 0x1E);
      if (M[0x1DBF] !== 2) text(0xD0, 0x1E);
      yield cp(0x319A); r = P.text_print(r);
      st(0xFF, 0);
      return go(r, 0x3029);
    };

    // --- the rounds ---
    // a loop that waits for step_done and, at each text event, calls a routine (a team's picture hidden, the
    // turn's player shown) at the JSR at, then clears text_event
    const waitStep = function* (r, at, routine) {
      for (;;) {
        if (M[0xFF]) return r;
        if (M[0x23]) { yield cp(at); r = P[routine](r); st(0x23, 0); continue; }
        yield;
      }
    };
    // jukebox_opening ($3558, step 0), final_jukebox_opening ($3563, step 25: turn_player_count and team to 0,
    // clock_rate back to 4), jukebox_turn ($357C, steps 1-5 and 26-30): the turn's text, then jukebox_question
    P.stages[0x3558] = function* () { yield cp(0x3558); text(0xF5, 0xAE); return 0x3584; };
    P.stages[0x3563] = function* () { yield cp(0x3563); st(0x33EF, 0); st(0xF9, 0); st(0x2F72, 4); text(0xB6, 0xAE); return 0x3584; };
    P.stages[0x357C] = function* () { yield cp(0x357C); text(0x29, 0xAF); return 0x3584; };
    // jukebox_question ($3584): the turn's screen and text, its player (turn_players $33F0) into the texts' name
    // arguments; then the grid of twelve numbers (used ones as their subject's face, highlighted) in display state 5
    // until a number is chosen (step_done), then ask_question
    P.stages[0x3584] = function* () {
      let r = P.r;
      yield cp(0x3584); r = P.clear_play_colours(r);
      yield cp(0x3587); r = P.draw_show_frame(r);
      yield cp(0x358A); r = P.clear_bubble(r);
      yield cp(0x358D); r = P.draw_right_team(r);
      yield cp(0x3590); r = P.draw_left_team(r);
      r.x = M[0x33EF]; r.a = M[0x33F0 + r.x];
      st(0xAF3A, r.a); st(0xAF3C, r.a); inc(0x33EF);
      yield cp(0x35A2); r = P.text_print(r);
      st(0x22, 6); st(0xFF, 0); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      r = yield* waitStep(r, 0x35BD, 'show_turn_player');
      st(0x1DC0, 0); st(0x07A3, 0); st(0x2F56, 0);
      cell(0x07, 0x03); yield cp(0x35DC); r = P.clear_block_colours(r);
      cell(0x1B, 0x03); yield cp(0x35E7); r = P.clear_block_colours(r);
      st(0x1DBF, 2); st(0x22, 8); st(0x2B84, 0); st(0x0B17, 0);
      r.x = 0x0B;
      do {
        const x = r.x;
        if (!M[0x1D66 + x]) {
          st(0x15, M[0x16BF + x]); st(0x16, M[0x16CB + x]);
          r.a = x; yield cp(0x360D); r = P.draw_grid_number(r);
        } else {
          st(0x15, M[0x16BF + x]); st(0x16, M[0x16CB + x]);
          r.a = M[0x1D72 + x]; yield cp(0x3620); r = P.colour_face_block(r);
          st(0x15, M[0x16BF + r.x]); st(0x16, M[0x16CB + r.x]);
          r.a = 1; r.y = 0xCF; st(0x14A2, 1); st(0x12, r.x); st(0x14DE, 0xCF);
          yield cp(0x3639); r = P.highlight_cell(r);
        }
        r.x = (r.x - 1) & 255;
      } while (!(r.x & 0x80));
      cell(0x11, 0x0F); yield cp(0x3647); r = P.clear_block_colours(r);
      st(0x22, 5); st(0x07C4, 0xFF); st(0x06AC, 0xFF); st(0xFF, 0);
      while (!M[0xFF]) yield;
      return go(r, 0x2D33);
    };
    // spot_the_star_2 ($38A9, step 7, team 1) and spot_the_star_1 ($38E6, step 6, team 0): the round's screen and
    // text, the team's frame ($AF3A), and at each text event the other team's picture hidden; then
    // spot_the_star_pick ($3923, group 3's)
    P.stages[0x38A9] = function* () {
      let r = P.r;
      yield cp(0x38A9); r = P.clear_play_colours(r);
      yield cp(0x38AC); r = P.draw_show_frame(r);
      yield cp(0x38AF); r = P.draw_left_team(r);
      yield cp(0x38B2); r = P.draw_right_team(r);
      text(0xFB, 0xB1); yield cp(0x38BD); r = P.text_print(r);
      st(0xFF, 0); st(0xAF3A, 2); st(0x22, 6); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      r = yield* waitStep(r, 0x38DD, 'hide_left_team');
      return go(r, 0x3923);
    };
    P.stages[0x38E6] = function* () {
      let r = P.r;
      yield cp(0x38E6); r = P.clear_play_colours(r);
      yield cp(0x38E9); r = P.draw_show_frame(r);
      yield cp(0x38EC); r = P.draw_left_team(r);
      yield cp(0x38EF); r = P.draw_right_team(r);
      st(0xFF, 0); text(0x03, 0xB2); yield cp(0x38FE); r = P.text_print(r);
      st(0xAF3A, 1); st(0x22, 6); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      r = yield* waitStep(r, 0x391A, 'hide_right_team');
      return go(r, 0x3923);
    };
    // your_scene_opening ($395A, step 8) and your_scene_turn ($3965, steps 9-13): the turn's text, then
    // your_scene_question
    P.stages[0x395A] = function* () { yield cp(0x395A); text(0x03, 0x3E); return 0x396D; };
    P.stages[0x3965] = function* () { yield cp(0x3965); text(0x3F, 0xB4); return 0x396D; };
    // your_scene_question ($396D): the turn's screen and text, its player and the player's subject
    // (your_scene_subject $3ACB from $0B0A); then the Easy / Hard choice (display state 11) and, once chosen, the
    // question's subject: the player's own for Easy, another at random for Hard; 1 or 2 points; ask_question
    P.stages[0x396D] = function* () {
      let r = P.r;
      yield cp(0x396D); r = P.clear_play_colours(r);
      r.x = 0x64; r.y = 0x28; yield cp(0x3974); r = P.clear_bitmap_cells(r);
      yield cp(0x3977); r = P.draw_show_frame(r);
      yield cp(0x397A); r = P.draw_left_team(r);
      yield cp(0x397D); r = P.draw_right_team(r);
      st(0xFF, 0);
      yield cp(0x3984); r = P.text_print(r);
      r.x = M[0x33EF]; r.a = M[0x33F0 + r.x];
      st(0xAF3A, r.a); st(0xB453, r.a); st(0xB455, r.a);
      r.y = r.a; st(0x3ACB, M[0x0B0A + r.y]);
      inc(0x33EF);
      st(0x22, 6); st(0x06AC, 0xFF); st(0x07C4, 0xFF); st(0x0985, 0xFF);
      r = yield* waitStep(r, 0x39B7, 'show_turn_player');
      st(0x06AC, 0); st(0x07C4, 0); st(0x0B15, 0); st(0x2B84, 0);
      yield cp(0x39CE); r = P.random(r);
      st(0x0B17, (r.a & 3) + 8);
      st(0x22, 8);
      yield cp(0x39DD); r = P.clear_choice_area(r);
      r = yield* printText(r, 0x39E6, 0x24, 0x03, 0x48);
      r = yield* printText(r, 0x39EF, 0x25, 0x13, 0x54);
      r = yield* printText(r, 0x39F8, 0x26, 0x23, 0x48);
      st(0x1863, 0xD8); st(0x188E, 0);
      r = yield* fill(r, 0x3A0B, 0x17, 0x46, 0x13);
      st(0x1863, 0xD8); r = yield* fill(r, 0x3A19, 0x17, 0x46, 0x33);
      st(0x2F56, 0); st(0x0CB8, 0); st(0x0CB9, 0);
      st(0x18EE, 0xFF); r = yield* bar(r, 0x3A32, 0x17, 0x46, 0x13);
      st(0x18EE, 0xFF); r = yield* bar(r, 0x3A40, 0x17, 0x46, 0x33);
      r.x = M[0xF9];
      cell(M[0x33FC + r.x], 3);
      r.a = M[0x3ACB]; yield cp(0x3A51); r = P.colour_face_block(r);
      r.a = 1; r.y = 0xCF; st(0x14A2, 1); st(0x12, r.x); st(0x14DE, 0xCF);
      yield cp(0x3A60); r = P.highlight_cell(r);
      st(0x1DBF, 2); st(0x1DC0, 0); st(0x22, 0x0B); st(0xFF, 0); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      while (!M[0xFF]) yield;
      yield cp(0x3A81); r = yield* P.flash_choice(r);
      r.x = M[0xF9];
      const pts = (M[0x075F + r.x] + 1) & 255;
      st(0x30F4, pts); st(0x3102, pts);
      let a;
      if (!M[0x075F + r.x]) a = M[0x3ACB];
      else {
        for (;;) {
          yield cp(0x3A9D); r = P.random(r);
          a = r.a & 7;
          if (a < 6 && a !== M[0x3ACB]) break;
        }
      }
      st(0xB325, a);
      r.a = a; nz(r, a);
      yield cp(0x3AAE); r = P.pick_question(r);
      r.x = M[0xF9];
      st(0x3ACB, M[0x075F + r.x]);
      return go(r, 0x2D33);
    };
    // name_the_year_2 ($0DFC, step 15, team 1) and name_the_year ($0E39, step 14): the round's screen and text, the
    // team's frame, the other team's picture hidden at a text event; then round_pick_item ($0E76, group 3's)
    P.stages[0x0DFC] = function* () {
      let r = P.r;
      yield cp(0x0DFC); r = P.clear_play_colours(r);
      yield cp(0x0DFF); r = P.draw_show_frame(r);
      yield cp(0x0E02); r = P.draw_left_team(r);
      yield cp(0x0E05); r = P.draw_right_team(r);
      text(0x47, 0xB2); yield cp(0x0E10); r = P.text_print(r);
      st(0xFF, 0); st(0xAF3A, 2); st(0x22, 6); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      r = yield* waitStep(r, 0x0E30, 'hide_left_team');
      return go(r, 0x0E76);
    };
    P.stages[0x0E39] = function* () {
      let r = P.r;
      yield cp(0x0E39); r = P.clear_play_colours(r);
      yield cp(0x0E3C); r = P.draw_show_frame(r);
      yield cp(0x0E3F); r = P.draw_left_team(r);
      yield cp(0x0E42); r = P.draw_right_team(r);
      text(0x86, 0xB2); yield cp(0x0E4D); r = P.text_print(r);
      st(0xFF, 0); st(0x22, 6); st(0xAF3A, 1); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      r = yield* waitStep(r, 0x0E6D, 'hide_right_team');
      return go(r, 0x0E76);
    };
    // quickfire_start ($0D88, step 16): the round's screen, both teams answer, round type 3, the clock at 0 and
    // twice as slow (clock_rate 8), the count of questions ($B1DF) 0, the round's text and its first question; then
    // ask_question
    P.stages[0x0D88] = function* () {
      let r = P.r;
      yield cp(0x0D88); r = P.clear_play_colours(r);
      yield cp(0x0D8B); r = P.draw_left_team(r);
      yield cp(0x0D8E); r = P.draw_right_team(r);
      yield cp(0x0D91); r = P.draw_show_frame(r);
      st(0x07A3, 0xFF); st(0x1DC0, 3); st(0x2F56, 0); st(0xB1DF, 0); st(0x2F72, 8);
      text(0xCE, 0xB2); yield cp(0x0DB3); r = P.text_print(r);
      yield cp(0x0DB6); r = P.pick_quickfire_question(r);
      st(0x22, 6); st(0x1DBF, 1); st(0x30F4, 2); st(0x3102, 2); st(0xFF, 0); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      while (!M[0xFF]) yield;
      return go(r, 0x2D33);
    };
    // quickfire_next ($0DDD, steps 17-24): the bubble down, display state 8, the next question, 1 try, 2 points;
    // then first_clue
    P.stages[0x0DDD] = function* () {
      let r = P.r;
      yield cp(0x0DDD);
      st(0x05E2, 1); st(0x22, 8); inc(0xB1DF);
      yield cp(0x0DE9); r = P.pick_quickfire_question(r);
      st(0x1DBF, 1); st(0x30F4, 2); st(0x3102, 2);
      return go(r, 0x2DC7);
    };
    // game_over ($27D7, step 31): the closing text (a tie, or the winner's and loser's names, $B1E7 / $B1F1, into
    // its arguments at $B3DF and $B3F9); when it has been read, display state 8 and a new game
    P.stages[0x27D7] = function* () {
      let r = P.r;
      yield cp(0x27D7); r = P.clear_play_colours(r);
      yield cp(0x27DA); r = P.draw_left_team(r);
      yield cp(0x27DD); r = P.draw_right_team(r);
      yield cp(0x27E0); r = P.draw_show_frame(r);
      text(0xC8, 0xB3);
      const s0 = M[0x38A6], s1 = M[0x38A7];
      if (s0 === s1) text(0x91, 0xB3);
      else if (s0 > s1) { st(0xB3DF, 0xE7); st(0xB3E0, 0xB1); st(0xB3F9, 0xF1); st(0xB3FA, 0xB1); }
      else { st(0xB3DF, 0xF1); st(0xB3E0, 0xB1); st(0xB3F9, 0xE7); st(0xB3FA, 0xB1); }
      yield cp(0x282B); r = P.text_print(r);
      st(0x22, 6); st(0xFF, 0); st(0x06AC, 0xFF); st(0x07C4, 0xFF);
      while (!M[0xFF]) yield;
      st(0x22, 8);
      return go(r, 0x2CD8);
    };
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
