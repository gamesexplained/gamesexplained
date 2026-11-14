/* pq-g5-menu */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 5, the menu. The code the menu part holds at $B800-$CFFF
// and $E000-$EAFF until a question block overwrites it: the menu's main program from menu_start ($E2C0) to its jump
// to new_game, the copy of the six chosen stars' faces and names into the show's pictures (copy_team), and the
// display states' routines the state interrupt runs while the menu is up: the game options (state 0), the specialist
// subject (state 1, and its flash, state 14) and the picking of the teams (state 2). One function per listing label,
// on the game's memory (pq-core.js says how).
//
// The main program is a chain of stages, P.stages[address], as group 4's (pq-g4-show.js): each a generator that
// returns the address the game jumps to next, sharing the registers in P.r. Every JSR is a checkpoint yielded just
// before the call. The stages whose head is a loop polling step_done ($FF) (pick_captains $E6D3, wait_captain_0
// $E7A2, pick_members $E805, meet_teams $E8A3) yield no checkpoint at their head: the game passes there at every turn
// of the loop. A loop that polls what an interrupt writes yields bare once a turn. The main program's writes of RAM
// go through P.io.store where the chips have one (the interrupts write many of the same bytes: step_done, team,
// display_state, sprite_enable_value). In the credits' loop ($E978) step_done and text_event are read, just after a
// draw_frame_block, through P.io.irqByte: the interrupt may set them while it draws.
//
// The display states' routines are plain functions registered in P.byAddr by their address (group 1's state_jump
// dispatches through it); each ends as the game's does, at sprites_row0 ($0C47) or irq_to_bottom ($0BC5).
// menu_start seeds the random generator from the SID's voice 3 ($D41B), read through P.io (H.rd).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M;
    P.byAddr = P.byAddr || {};
    const st = (a, v) => { v &= 255; if (P.io && P.io.store) P.io.store(a, v); else M[a] = v; };
    const irqRead = (a) => (P.io && P.io.irqByte ? P.io.irqByte(a) : M[a]) & 255;
    const nz = (r, v) => { r.z = (v & 255) === 0 ? 1 : 0; r.n = (v >> 7) & 1; return r; };
    const R0 = () => ({ a: 0, x: 0, y: 0, c: 0, z: 0, n: 0, v: 0 });
    if (!P.r) P.r = R0();
    const go = (r, at) => { P.r = r; return at; };
    const set = (r, a, x, y) => { r.a = a & 255; r.x = x & 255; r.y = y & 255; return r; };
    const cp = (a) => H.cp(a);
    const w16 = (a) => M[a] | M[a + 1] << 8;

    H.checkpoint(
      // stage heads (not the loop heads $E6D3, $E7A2, $E805, $E8A3)
      0xE2C0, 0xE5A9, 0xE916,
      // menu_start
      0xE330, 0xE333, 0xE336, 0xE339, 0xE33C, 0xE33F, 0xE342, 0xE345, 0xE368, 0xE371, 0xE37A, 0xE383, 0xE386, 0xE3DA,
      0xE3E8,
      // menu_flow
      0xE5B0, 0xE5B7, 0xE5D5, 0xE5FC, 0xE60A, 0xE612, 0xE61B, 0xE624, 0xE62D, 0xE634, 0xE646, 0xE64D, 0xE65B, 0xE67A,
      0xE683, 0xE68C, 0xE695, 0xE6B0, 0xE6B9, 0xE6C2, 0xE6CB,
      // pick_captains, wait_captain_0
      0xE6F2, 0xE6F5, 0xE70A, 0xE718, 0xE721, 0xE72A, 0xE737, 0xE742, 0xE74D, 0xE757, 0xE76A, 0xE77D, 0xE790, 0xE79F,
      0xE7B3, 0xE7C4, 0xE7CD, 0xE7D6, 0xE7EB, 0xE7F4, 0xE7FD,
      // pick_members
      0xE819, 0xE826, 0xE82F, 0xE838, 0xE851, 0xE862, 0xE86B, 0xE874, 0xE889, 0xE892, 0xE89B,
      // meet_teams, introduce_teams
      0xE8AC, 0xE8AF, 0xE8B2, 0xE8C0, 0xE8C3, 0xE8D1, 0xE8DE, 0xE8E1, 0xE8EC, 0xE8EF, 0xE8F2, 0xE90F,
      0xE932, 0xE937, 0xE93A, 0xE93D, 0xE945, 0xE948, 0xE955, 0xE962, 0xE975, 0xE98D);

    // print_text with A, Y, X as the game loads them (`lda`, `ldy`, `ldx`), at the JSR's checkpoint
    const print = function* (r, at, a, y, x) { set(r, a, x, y); yield cp(at); return P.print_text(r); };

    // --- the main program ---
    // menu_start ($E2C0): the screen blanked and black, the display flags and the menu's variables reset, the
    // random seed from voice 3's noise ($D41B, read twice), the interrupts set up (irq_setup), the title screen's
    // panels and texts, the cursor's shape, the scores reset, the strip parameters draw_strip never uses, the two
    // option bars; then menu_flow
    P.stages[0xE2C0] = function* () {
      let r = P.r;
      yield cp(0xE2C0);
      H.wr(0xD016, 0x10); H.wr(0xD011, 0x40);
      st(0x07C4, 0xFF); st(0x06AC, 0xFF);
      st(0x06AB, 0x25);
      H.wr(0xD020, 0); H.wr(0xD021, 0); H.wr(0xD015, 0);
      for (const a of [0x21, 0x20, 0x23, 0x24, 0x2070, 0x2071, 0x056F, 0x22, 0x0CB8, 0x0CB9, 0xFC, 0xFD, 0xF9, 0x1B72, 0x33EF]) st(a, 0);
      st(0xFB, 0xFF); st(0x0C1E, 0x0F); st(0x05E1, 1);
      H.wr(0xD40E, 0xFF); H.wr(0xD40F, 0xFF);
      H.wr(0xD412, 0x80); H.wr(0xD418, 0x80);
      st(0x46, H.rd(0xD41B));
      r.a = H.rd(0xD41B); st(0x47, r.a);
      yield cp(0xE330); r = P.irq_setup(r);
      yield cp(0xE333); r = P.make_mirror_table(r);
      yield cp(0xE336); r = P.clear_bubble(r);
      yield cp(0xE339); r = P.clear_shapes_4200(r);
      yield cp(0xE33C); r = P.clear_panel(r);
      yield cp(0xE33F); r = P.text_print(r);
      yield cp(0xE342); r = P.copy_title_colours(r);
      yield cp(0xE345); r = P.make_times8(r);
      for (let x = 0x3F; x >= 0; x--) st(0x4300 + x, M[0x8EE8 + x]);
      st(0x18, 0); st(0x1B, 0); st(0x1C, 0); st(0x1D, 0);
      H.wr(0xD01C, 0);
      r = yield* print(r, 0xE368, 1, 2, 0);
      r = yield* print(r, 0xE371, 0, 0x12, 0);
      r = yield* print(r, 0xE37A, 2, 0x1F, 0);
      r = yield* print(r, 0xE383, 3, 0x2F, 4);
      yield cp(0xE386); r = P.scores_reset(r);
      st(0x1A, 0x49); st(0x19, 0x78);
      st(0x15, 0); st(0x0571, 0); st(0x16, 5);
      st(0xE4BC, 0x28); st(0xE4C1, 0x60);
      st(0x15, 0x10); st(0x16, 5); st(0x0571, 1);
      H.setPort(0x25);
      st(0xE4BC, 0x28); st(0xE4C1, 0x74);
      H.setPort(0x25);
      st(0x055F, 0xFF); st(0x056F, 0);
      st(0x18EE, 0xFF);
      set(r, 0x11, 0x5C, 0x6F); yield cp(0xE3DA); r = P.put_pixel_bar(r);
      st(0x18EE, 0xAA);
      set(r, 0x11, 0x5C, 0x7F); yield cp(0xE3E8); r = P.put_pixel_bar(r);
      st(0xFF, 0); st(0x1B72, 0xFF);
      r.a = 0xFF; nz(r, r.a);
      return go(r, 0xE5A9);
    };

    // menu_flow ($E5A9): the score digits, the options screen (display state 0) until fire; two_players from the
    // cursor; the subject screen (display state 1: the six icons coloured, "Player one, choose specialist subject")
    // until team 0 has chosen; then "Player two" or "Computer" for team 1, and on to pick_captains
    P.stages[0xE5A9] = function* () {
      let r = P.r;
      yield cp(0xE5A9); r = P.score_digits_frame(r);
      st(0xFF, 0);
      yield cp(0xE5B0); r = yield* P.screen_on_sync(r);
      while (!M[0xFF]) yield;
      yield cp(0xE5B7); r = yield* P.screen_off_sync(r);
      st(0xFA, M[0x0CB8]);
      st(0x07C4, 0); st(0x0B17, 0); st(0x0751, 0); H.wr(0xD015, 0); st(0x06AC, 0);
      st(0x2B90, 0);
      yield cp(0xE5D5); r = P.random(r);
      r.a = ((r.a & 7) + 4) & 255; st(0x0B18, r.a);
      st(0x0761, 0); st(0x0B17, 0);
      st(0x22, 1);
      st(0x1863, 0xD8); st(0x188E, 0);
      set(r, 0x11, 0x5C, 0x6F); yield cp(0xE5FC); r = P.fill_colour_block(r);
      st(0x1863, 0x5C);
      set(r, 0x11, 0x5C, 0x7E); yield cp(0xE60A); r = P.fill_colour_block(r);
      st(0x07C4, 0);
      yield cp(0xE612); r = P.clear_panel(r);
      r = yield* print(r, 0xE61B, 6, 2, 0x30);
      r = yield* print(r, 0xE624, 7, 0x16, 0x18);
      r = yield* print(r, 0xE62D, 8, 0x2B, 0x3C);
      r.x = 0x75; r.y = 0x70; yield cp(0xE634); r = P.clear_bitmap_strip(r);
      r.x = 5;
      do {
        st(0x15, M[0x16B3 + r.x]); st(0x16, M[0x16B9 + r.x]);
        r.a = M[0x1D89 + r.x];
        yield cp(0xE646); r = P.colour_face_block(r);
        r.a = 1; r.y = 0xCF;
        yield cp(0xE64D); r = P.highlight_icon(r);
        r.x = (r.x - 1) & 255;
      } while (!(r.x & 0x80));
      st(0x07C4, 0xFF); st(0x06AC, 0xFF);
      yield cp(0xE65B); r = yield* P.screen_on_sync(r);
      st(0xFF, 0);
      while (!M[0xFF]) yield;
      if (!M[0xFA]) {
        st(0xFF, 0); st(0xF9, 1);
        st(0x07C4, 0); H.wr(0xD015, 0);
        yield cp(0xE67A); r = P.clear_panel(r);
        r = yield* print(r, 0xE683, 0x15, 2, 0x34);
        r = yield* print(r, 0xE68C, 7, 0x16, 0x18);
        r = yield* print(r, 0xE695, 8, 0x2B, 0x3C);
      } else {
        st(0xFF, 0);
        st(0x07C4, 0); H.wr(0xD015, 0);
        st(0xF9, 1);
        yield cp(0xE6B0); r = P.clear_panel(r);
        r = yield* print(r, 0xE6B9, 0x16, 2, 0x30);
        r = yield* print(r, 0xE6C2, 7, 0x16, 0x18);
        r = yield* print(r, 0xE6CB, 8, 0x2B, 0x3C);
      }
      st(0x07C4, 0xFF);
      r.a = 0xFF;
      return go(r, 0xE6D3);
    };

    // pick_captains ($E6D3): waits for team 1's subject; star_taken cleared, picking_captains = $FF, the computer's
    // 8-11 moves; "Player one, select team captain", the panels cleared, the twelve stars' frames drawn, the cursor
    // on star 0, display state 2; then wait_captain_0
    P.stages[0xE6D3] = function* () {
      let r = P.r;
      while (!M[0xFF]) yield;
      st(0x06AC, 0); st(0x07C4, 0); H.wr(0xD015, 0);
      st(0x0AF3, 0); st(0xF9, 0); st(0x0B17, 0); st(0x0B15, 0);
      st(0xCD1F, 0xFF);
      r.a = 0xFF;
      yield cp(0xE6F2); r = yield* P.screen_off_sync(r);
      yield cp(0xE6F5); r = P.random(r);
      r.a = ((r.a & 3) + 8) & 255; st(0x0B18, r.a);
      for (let x = 0x0B; x >= 0; x--) st(0x0AF9 + x, 0);
      r.x = 0xFF; r.a = 0;
      yield cp(0xE70A); r = P.clear_panel(r);
      st(0x0C1E, 1);
      r = yield* print(r, 0xE718, 6, 2, 0x32);
      r = yield* print(r, 0xE721, 9, 0x16, 0x2E);
      r = yield* print(r, 0xE72A, 0x0B, 0x2B, 0x3A);
      st(0x16, 5); st(0x15, 0); r.a = 1;
      yield cp(0xE737); r = P.clear_block_colours(r);
      st(0x16, 5); st(0x15, 6); r.a = 6;
      yield cp(0xE742); r = P.clear_block_colours(r);
      st(0x16, 0x1E); st(0x15, 1); r.a = 1;
      yield cp(0xE74D); r = P.clear_block_colours(r);
      r.x = M[0x0761]; r.a = 1; r.y = 0xCF;
      yield cp(0xE757); r = P.highlight_icon(r);
      r.y = 0x0B;
      do {
        st(0x16, M[0x16F3 + r.y]); st(0x15, M[0x16FF + r.y]);
        r.a = (r.y + 3) & 255;
        yield cp(0xE76A); r = P.draw_frame_block(r);
        r.y = (r.y - 1) & 255;
      } while (!(r.y & 0x80));
      st(0x0763, 0); st(0x0764, 0); st(0x0765, 0);
      r.x = 0; r.a = 0;
      yield cp(0xE77D); r = P.stamp_star(r);
      st(0x06AC, 0xFF);
      st(0x22, 2);
      r.x = M[0x0761]; r.a = 1; r.y = 0xCF;
      yield cp(0xE790); r = P.highlight_icon(r);
      st(0xFF, 0); st(0x0761, 0);
      st(0x07C4, 0xFF); r.a = 0xFF;
      yield cp(0xE79F); r = yield* P.screen_on_sync(r);
      return go(r, 0xE7A2);
    };

    // wait_captain_0 ($E7A2): waits for player one's captain; "Player two" or "Computer, select team captain"
    P.stages[0xE7A2] = function* () {
      let r = P.r;
      while (!M[0xFF]) yield;
      st(0x07C4, 0); H.wr(0xD015, 0); st(0xFF, 0);
      r.a = 0;
      yield cp(0xE7B3); r = P.clear_panel(r);
      st(0xF9, 1);
      if (!M[0xFA]) {
        r = yield* print(r, 0xE7C4, 0x15, 2, 0x38);
        r = yield* print(r, 0xE7CD, 9, 0x16, 0x2E);
        r = yield* print(r, 0xE7D6, 0x0B, 0x2B, 0x3A);
      } else {
        r = yield* print(r, 0xE7EB, 0x16, 2, 0x32);
        r = yield* print(r, 0xE7F4, 9, 0x16, 0x2E);
        r = yield* print(r, 0xE7FD, 0x0B, 0x2B, 0x3A);
      }
      st(0x07C4, 0xFF); r.a = 0xFF;
      return go(r, 0xE805);
    };

    // pick_members ($E805): waits for team 1's captain; picking_captains = 0, member_count = 0; "Player one, select
    // team members" until team 0 has two; then "Player two" or "Computer" for team 1's
    P.stages[0xE805] = function* () {
      let r = P.r;
      while (!M[0xFF]) yield;
      st(0x07C4, 0); H.wr(0xD015, 0); st(0xFF, 0); st(0x0AF3, 0); st(0xCD1F, 0);
      r.a = 0;
      yield cp(0xE819); r = P.clear_panel(r);
      st(0xF9, 0);
      r = yield* print(r, 0xE826, 6, 2, 0x32);
      r = yield* print(r, 0xE82F, 9, 0x16, 0x2E);
      r = yield* print(r, 0xE838, 0x0A, 0x2B, 0x3A);
      st(0x07C4, 0xFF);
      while (!M[0xFF]) yield;
      st(0x07C4, 0); H.wr(0xD015, 0); st(0xFF, 0); st(0xCD1F, 0);
      r.a = 0;
      yield cp(0xE851); r = P.clear_panel(r);
      st(0xF9, 1);
      if (!M[0xFA]) {
        r = yield* print(r, 0xE862, 0x15, 2, 0x38);
        r = yield* print(r, 0xE86B, 9, 0x16, 0x2E);
        r = yield* print(r, 0xE874, 0x0A, 0x2B, 0x3A);
      } else {
        r = yield* print(r, 0xE889, 0x16, 2, 0x32);
        r = yield* print(r, 0xE892, 9, 0x16, 0x2E);
        r = yield* print(r, 0xE89B, 0x0A, 0x2B, 0x3A);
      }
      st(0x07C4, 0xFF); r.a = 0xFF;
      return go(r, 0xE8A3);
    };

    // meet_teams ($E8A3): waits for the last member; three pauses (display state 12), the screen off, the faces
    // and names copied (copy_team), the last star's icon back to normal; the credits' text in the bubble with both
    // teams drawn (display state 4) until it has been said
    P.stages[0xE8A3] = function* () {
      let r = P.r;
      while (!M[0xFF]) yield;
      st(0x07C4, 0);
      yield cp(0xE8AC); r = yield* P.pause_state12(r);
      yield cp(0xE8AF); r = yield* P.pause_state12(r);
      yield cp(0xE8B2); r = yield* P.pause_state12(r);
      st(0x06AC, 0); st(0x07C4, 0); H.wr(0xD015, 0);
      r.a = 0;
      yield cp(0xE8C0); r = yield* P.screen_off_sync(r);
      yield cp(0xE8C3); r = P.copy_team(r);
      r.x = M[0x0766 + M[0x0761]]; r.a = 1; r.y = 0xCF;
      yield cp(0xE8D1); r = P.highlight_icon(r);
      st(0x0AF2, 0xFF);
      st(0x07C4, 0); r.a = 0;
      yield cp(0xE8DE); r = P.clear_panel(r);
      yield cp(0xE8E1); r = P.clear_play_colours(r);
      st(0xF6, 0x82); st(0xF7, 0x3E); r.a = 0x3E;
      yield cp(0xE8EC); r = P.text_print(r);
      yield cp(0xE8EF); r = P.draw_left_team(r);
      yield cp(0xE8F2); r = P.draw_right_team(r);
      st(0x0BB5, 5); st(0x0B90, 0xFF);
      st(0x22, 4); st(0xFF, 0);
      st(0x07C4, 0xFF); st(0x06AC, 0xFF); r.a = 0xFF;
      yield cp(0xE90F); r = yield* P.screen_on_sync(r);
      while (!M[0xFF]) yield;
      return go(r, 0xE916);
    };

    // introduce_teams ($E916): the bubble starts on intro_text ($FE00); the show's frame, a new grid and number
    // order, the host's picture; display state 4; each place the text names (text_event) gets its picture
    // (menu_place_column/row $16D7/$16DE) until the text ends (step_done); then new_game ($2CD8)
    P.stages[0xE916] = function* () {
      let r = P.r;
      yield cp(0xE916);
      st(0x06AC, 0); st(0x07C4, 0); H.wr(0xD015, 0);
      st(0x125E, 0); st(0x0B90, 0); st(0x05E2, 0);
      st(0xF6, 0); st(0xF7, 0xFE); r.a = 0xFE;
      yield cp(0xE932); r = P.text_print(r);
      r.a = 0x0A;
      yield cp(0xE937); r = yield* P.screen_off_sync(r);
      yield cp(0xE93A); r = P.clear_play_colours(r);
      yield cp(0xE93D); r = P.draw_show_frame(r);
      st(0x1DBE, 0); r.a = 0;
      yield cp(0xE945); r = P.grid_setup(r);
      yield cp(0xE948); r = P.shuffle_number_order(r);
      st(0x075E, 0);
      st(0x0C1E, 0x0F); r.a = 0x0F;
      yield cp(0xE955); r = P.clear_panel(r);
      st(0x16, 0x11); st(0x15, 0x0A); r.a = 0;
      yield cp(0xE962); r = P.draw_frame_block(r);
      st(0x22, 4); st(0xFF, 0);
      st(0x06AC, 0xFF); st(0x07C4, 0xFF); r.a = 0xFF;
      yield cp(0xE975); r = yield* P.screen_on_sync(r);
      // b_E978: the first reads after a draw are the game's (the interrupt may have set them meanwhile)
      let fresh = false;
      for (;;) {
        const done = fresh ? irqRead(0xFF) : M[0xFF];
        if (done) break;
        const ev = fresh ? irqRead(0x23) : M[0x23];
        fresh = false;
        if (!ev) { yield; continue; }
        const y = M[0x24];
        st(0x16, M[0x16D7 + y]); st(0x15, M[0x16DE + y]);
        r.y = y; r.a = y;
        yield cp(0xE98D); r = P.draw_frame_block(r);
        st(0x23, 0);
        fresh = true;
      }
      r.a = M[0xFF]; nz(r, r.a);
      return go(r, 0x2CD8);
    };

    // --- copy_team ($C8E0) and its parts, falling one into the next: the six chosen stars' faces into pictures
    // 1-6 of the second picture table, through the operands each part writes into its own `lda $FFFF,y`
    // a part: the star number at idx; op, its bitmap copy's operand (the other three at +$0B, +$16, +$21); dst,
    // the picture ($120 bytes of bitmap, then $24 of colour RAM and $24 of screen colours)
    const copyPicture = (r, idx, op, dst) => {
      const x = M[idx];
      const lo = M[0x1773 + x], hi = M[0x1782 + x];
      st(op, lo); st(op + 0x0B, lo);
      st(op + 1, hi); st(op + 0x0C, (hi + 1) & 255);
      st(op + 0x16, M[0x1791 + x]); st(op + 0x17, M[0x17A0 + x]);
      st(op + 0x21, M[0x17AF + x]); st(op + 0x22, M[0x17BE + x]);
      let a = 0, y = 0;
      const src = w16(op);
      do { a = H.rd((src + y) & 0xFFFF); st(dst + y, a); y = (y - 1) & 255; } while (y);
      const srcB = w16(op + 0x0B);
      for (y = 0x1F; y >= 0; y--) { a = H.rd((srcB + y) & 0xFFFF); st(dst + 0x100 + y, a); }
      const srcC = w16(op + 0x16);
      for (y = 0x23; y >= 0; y--) { a = H.rd((srcC + y) & 0xFFFF); st(dst + 0x120 + y, a); }
      const srcS = w16(op + 0x21);
      for (y = 0x23; y >= 0; y--) { a = H.rd((srcS + y) & 0xFFFF); st(dst + 0x144 + y, a); }
      r.a = a; r.x = x; r.y = 0xFF; r.z = 0; r.n = 1;
      return r;
    };
    // copy_team ($C8E0): captain 0 ($0B09) into picture 1 ($8678)
    P.copy_team = function (r) { r = copyPicture(r, 0x0B09, 0xC913, 0x8678); return P.copy_captain_1(r); };
    // copy_captain_1 ($C93C): captain 1 ($0B0A) into picture 2 ($87E0)
    P.copy_captain_1 = function (r) { r = copyPicture(r, 0x0B0A, 0xC96F, 0x87E0); return P.copy_member_0(r); };
    // copy_member_0 ($C998): team 0's first member ($0B05) into picture 3 ($8948)
    P.copy_member_0 = function (r) { r = copyPicture(r, 0x0B05, 0xC9CB, 0x8948); return P.copy_member_1(r); };
    // copy_member_1 ($C9F4): team 0's second member ($0B06) into picture 4 ($8AB0)
    P.copy_member_1 = function (r) { r = copyPicture(r, 0x0B06, 0xCA27, 0x8AB0); return P.copy_member_2(r); };
    // copy_member_2 ($CA50): team 1's first member ($0B07) into picture 5 ($8C18)
    P.copy_member_2 = function (r) { r = copyPicture(r, 0x0B07, 0xCA83, 0x8C18); return P.copy_member_3(r); };
    // copy_member_3 ($CAAC): team 1's second member ($0B08) into picture 6 ($8D80)
    P.copy_member_3 = function (r) { r = copyPicture(r, 0x0B08, 0xCADF, 0x8D80); return P.copy_team_names(r); };
    // copy_team_names ($CB08): each star's name (star_name_lo/hi $AE98/$AEA7) up to its $FE into the show's name
    // slots, through the operand of each copy's `lda $FFFF,y`
    P.copy_team_names = function (r) {
      for (const [idx, op, dst] of [[0x0B05, 0xCB1A, 0x1D4A], [0x0B06, 0xCB38, 0x1D51], [0x0B07, 0xCB56, 0x1D58],
        [0x0B08, 0xCB74, 0x1D5F], [0x0B09, 0xCB92, 0x1D3C], [0x0B0A, 0xCBB0, 0x1D43]]) {
        const x = M[idx];
        st(op, M[0xAE98 + x]); st(op + 1, M[0xAEA7 + x]);
        const src = w16(op);
        let y = 0, a;
        for (;;) {
          a = H.rd((src + y) & 0xFFFF); st(dst + y, a);
          if (a === 0xFE) break;
          y = (y + 1) & 255;
          if (!y) break;
        }
        r.a = a; r.x = x; r.y = y;
      }
      return P.repoint_pictures(r);
    };
    // repoint_pictures ($CBBC): draw_frame_block's six table reads ($1006 ... $1024) to the second picture table
    // ($1749 ... $176C), and text_decode's two name pointers ($37B5/$37B6, $37BA/$37BB) to $1D28 and $1D2F
    P.repoint_pictures = function (r) {
      const t = [[0x1006, 0x49], [0x100C, 0x50], [0x1012, 0x57], [0x1018, 0x5E], [0x101E, 0x65], [0x1024, 0x6C]];
      for (const [a, lo] of t) { st(a, lo); st(a + 1, 0x17); }
      st(0x37B5, 0x28); st(0x37B6, 0x1D); st(0x37BA, 0x2F); st(0x37BB, 0x1D);
      r.a = 0x1D; return nz(r, r.a);
    };

    // --- the display states' routines (interrupt) ---
    // options_frame ($E99A), state 0: down moves the cursor (answer_cursor $0CB8) to Two Player Game, up back; the
    // two bars in the colours for the cursor ($0CBA + 2 x cursor) through the operands $E9D7 and $E9E5; a new fire
    // press sets step_done
    P.options_frame = function (r) {
      M[0xE9D7] = 2;
      r = P.read_input(r);
      if (!(r.a & 2)) {
        if (!M[0x0CB8]) M[0x0CB8] = (M[0x0CB8] + 1) & 255;
      } else if (!(M[0x05D8] & 1) && M[0x0CB8]) M[0x0CB8] = (M[0x0CB8] - 1) & 255;
      r.x = (M[0x0CB8] << 1) & 255;
      M[0xE9D7] = M[0x0CBA + r.x];
      M[0xE9E5] = M[0x0CBB + r.x];
      M[0x1863] = 0xD8;
      M[0x188E] = M[0xE9D7];
      set(r, 0x11, 0x5C, 0x6F); r = P.fill_colour_block(r);
      M[0x188E] = M[0xE9E5];
      M[0x1863] = 0x5C;
      set(r, 0x11, 0x5C, 0x7E); r = P.fill_colour_block(r);
      if (M[0xFF]) return P.sprites_row0(r);
      r = P.read_input(r);
      if (r.a & 0x10) { M[0xFB] = 0; r.a = 0; return P.sprites_row0(r); }
      if (!M[0xFB]) { M[0xFF] = 0xFF; M[0xFB] = 0xFF; r.a = 0xFF; }
      return P.sprites_row0(r);
    };

    // subject_frame ($EA16), state 1: every fifth frame the stick (read_input, or the computer's for team 1 in a
    // one-player game: cpu_subject_frame) acted on by subject_input; every frame the current icon highlighted
    P.subject_frame = function (r) {
      M[0x055E] = (M[0x055E] + 1) & 255;
      if (M[0x055E] !== 5) return P.subject_highlight(r);
      M[0x055E] = 0;
      if (M[0xF9] && !M[0xFA]) r = P.cpu_subject_frame(r);
      else r = P.read_input(r);
      return P.subject_input(r);
    };
    // subject_input ($EA36): the stick byte in A: a new fire press chooses the icon (team_subjects $0B0B + team)
    // and starts its flash (state 14, four rounds); right and left move the cursor round the six icons
    P.subject_input = function (r) {
      if (!(r.a & 0x10)) {
        if (!M[0xFB]) {
          M[0x3CEB] = 4; M[0x22] = 0x0E;
          r.x = M[0xF9]; M[0x0B0B + r.x] = M[0x0761];
          M[0xFB] = 0xFF; r.a = 0xFF;
          return P.sprites_row0(r);
        }
      } else M[0xFB] = 0;
      const plain = () => { r.x = M[0x0761]; r.a = 1; r.y = 0xCF; r = P.highlight_icon(r); };
      if (!(M[0x05D8] & 8)) {
        plain();
        M[0x0761] = (M[0x0761] + 1) & 255;
        if (M[0x0761] === 6) M[0x0761] = 0;
      } else if (!(M[0x05D8] & 4)) {
        plain();
        M[0x0761] = (M[0x0761] - 1) & 255;
        if (M[0x0761] & 0x80) M[0x0761] = 5;
      }
      return P.subject_highlight(r);
    };
    // subject_highlight ($EAA1): the current icon ($0761) in the team's colours (team_icon_colram $EAB7, and
    // team_icon_screen $EAB9 through the operand $EAB0), then sprites_row0
    P.subject_highlight = function (r) {
      r.x = M[0x0761];
      const y = M[0xF9];
      M[0xEAB0] = M[0xEAB9 + y];
      r.a = M[0xEAB7 + y];
      r.y = M[0xEAB0];
      r = P.highlight_icon(r);
      return P.sprites_row0(r);
    };

    // subject_flash_frame ($E54B), state 14: the chosen icon flashes through the team's list (team_flash_colours
    // $3CEE from team_flash_start $3CEC, through the operand $E573/$E574), a colour every third frame; at the
    // list's end ($FF) a round of flash_delays ($3CEB) is used; after the last, display state 1 and step_done
    P.subject_flash_frame = function (r) {
      let y = M[0xF9];
      const s = M[0x3CEC + y] + 0xEE;
      M[0xE573] = s & 255; M[0xE574] = (0x3C + (s >> 8)) & 255;
      M[0x3CE9] = (M[0x3CE9] + 1) & 255;
      if (M[0x3CE9] === 3) { M[0x3CE9] = 0; M[0x3CEA] = (M[0x3CEA] + 1) & 255; }
      for (;;) {
        y = M[0x3CEA];
        const a = M[(w16(0xE573) + y) & 0xFFFF];
        if (a !== 0xFF) {
          r.y = M[0xEAB9 + M[0xF9]]; r.x = M[0x0761]; r.a = a;
          r = P.highlight_icon(r);
          M[0x07C4] = 0; r.a = 0;
          return P.irq_to_bottom(r);
        }
        M[0x3CEA] = 0;
        M[0x3CEB] = (M[0x3CEB] - 1) & 255;
        if (!M[0x3CEB]) break;
      }
      M[0x22] = 1; M[0xFF] = 0xFF; M[0x07C4] = 0; r.a = 0; r.y = 0;
      return P.irq_to_bottom(r);
    };

    // team_pick_frame ($CD20), state 2: counts menu_frame_count ($055E): at 1, when the cursor has moved
    // ($0763), the star's frame stamped under the cursor (stamp_star) and, while the members are picked, the
    // star's subject icon in the team's colours (through the operand $CD55); at 5, team_pick_input
    P.team_pick_frame = function (r) {
      M[0x055E] = (M[0x055E] + 1) & 255;
      const n = M[0x055E];
      if (n === 1) {
        if (!M[0x0763]) return P.team_pick_exit(r);
        r.x = M[0x0761]; r = P.stamp_star(r);
        M[0x0763] = 0;
        if (M[0xCD1F]) return P.sprites_row0(r);
        r.x = M[0x0766 + M[0x0761]];
        const y = M[0xF9];
        M[0xCD55] = M[0xEAB9 + y];
        r.a = M[0xEAB7 + y];
        r.y = M[0xCD55];
        r = P.highlight_icon(r);
        return P.sprites_row0(r);
      }
      if (n === 5) return P.team_pick_input(r);
      return P.team_pick_exit(r);
    };
    // team_pick_input ($CD63): the count back to 0; team 1 in a one-player game is the computer (cpu_team_pick),
    // otherwise read_input
    P.team_pick_input = function (r) {
      M[0x055E] = 0;
      if (M[0xF9] && !M[0xFA]) return P.cpu_team_pick(r);
      r = P.read_input(r);
      return P.team_pick_stick(r);
    };
    // team_pick_stick ($CD76): the stick byte in A into stick ($05D8). A new fire press on a star not taken takes
    // it for the team: as its captain ($0B09 + team), or as a member (team_stars $0B05, its subject at $0B0D),
    // step_done once the captain, or the second or fourth member, is picked; else the cursor moves round the
    // 4 x 3 grid (left, right, down, up, the first pressed), the place left redrawn (restore_star)
    P.team_pick_stick = function (r) {
      M[0x05D8] = r.a;
      if (!(r.a & 0x10)) {
        if (!M[0xFF] && !M[0xFB]) {
          r = P.random(r);
          M[0x0B18] = ((r.a & 3) + 8) & 255;
          M[0x0B17] = 0;
          const x = M[0x0761]; r.x = x;
          if (!M[0x0AF9 + x]) {
            M[0x0AF9 + x] = 0xFF; M[0xFB] = 0xFF;
            M[0x170B + x] = M[0xF9];
            if (M[0xCD1F]) {
              r.y = M[0xF9];
              M[0x0B09 + r.y] = (x + 3) & 255;
              return P.pick_step_done(r);
            }
            r.y = M[0x0AF3];
            M[0x0B05 + r.y] = (x + 3) & 255;
            M[0x0B0D + r.y] = M[0x0766 + x];
            M[0x0AF3] = (M[0x0AF3] + 1) & 255;
            r.a = M[0x0AF3];
            if (r.a === 2) return P.pick_step_done(r);
            if (r.a === 4) M[0xFF] = 0xFF;
            return P.sprites_row0(r);
          }
        }
      } else M[0xFB] = 0;
      const s = M[0x05D8];
      if (!(s & 4)) {
        if (M[0x0764]) { r = P.restore_star(r); M[0x0764] = (M[0x0764] - 1) & 255; M[0x0761] = (M[0x0761] - 1) & 255; }
      } else if (!(s & 8)) {
        if (M[0x0764] !== 3) { r = P.restore_star(r); M[0x0764] = (M[0x0764] + 1) & 255; M[0x0761] = (M[0x0761] + 1) & 255; }
      } else if (!(s & 2)) {
        if (M[0x0765] !== 2) { r = P.restore_star(r); M[0x0765] = (M[0x0765] + 1) & 255; M[0x0761] = (M[0x0761] + 4) & 255; }
      } else if (!(s & 1)) {
        if (M[0x0765]) { r = P.restore_star(r); M[0x0765] = (M[0x0765] - 1) & 255; M[0x0761] = (M[0x0761] - 4) & 255; }
      }
      return P.team_pick_exit(r);
    };
    // pick_step_done ($CDD4): step_done = $FF, then sprites_row0
    P.pick_step_done = function (r) {
      M[0xFF] = 0xFF; r.a = 0xFF;
      return P.sprites_row0(r);
    };
    // team_pick_exit ($CE54): `jmp sprites_row0`
    P.team_pick_exit = function (r) { return P.sprites_row0(r); };
    // cpu_team_pick ($CE57): the computer picking for team 1: while cpu_wait ($0B15) runs, its last direction
    // (cpu_subject_stick $0B16) again; at cpu_moves_limit ($0B18) moves, fire; otherwise a random wait of 0-1 and
    // a random direction (direction_bits $0B11); then team_pick_stick
    P.cpu_team_pick = function (r) {
      if (M[0x0B15]) {
        M[0x0B15] = (M[0x0B15] - 1) & 255;
        r.a = M[0x0B16]; M[0x05D8] = r.a;
        return P.team_pick_stick(r);
      }
      M[0x0B17] = (M[0x0B17] + 1) & 255;
      if (M[0x0B17] === M[0x0B18]) { r.a = 0xEF; M[0x05D8] = 0xEF; return P.team_pick_stick(r); }
      r = P.random(r);
      M[0x0B15] = r.a & 1;
      r = P.random(r);
      r.x = r.a & 3;
      r.a = M[0x0B11 + r.x] ^ 0xFF;
      M[0x0B16] = r.a;
      return P.team_pick_stick(r);
    };
    // restore_star ($CED1): the place being left ($0761) kept in $0762, the moved flag ($0763) set; a star not
    // taken gets its picture again (draw_frame_block, at star_column/row $16F3/$16FF), a taken one its team's
    // frame (frame_taken_star); then its subject icon back to normal (restore_icon)
    P.restore_star = function (r) {
      M[0x0762] = M[0x0761];
      M[0x0763] = 0xFF;
      const x = M[0x0762]; r.x = x;
      if (M[0x0AF9 + x]) return P.frame_taken_star(r);
      M[0x16] = M[0x16F3 + x]; M[0x15] = M[0x16FF + x];
      r.a = (x + 3) & 255;
      r = P.draw_frame_block(r);
      return P.restore_icon(r);
    };
    // frame_taken_star ($CE96): stamp_star's mask (its operand $1529/$152A) at $9506 for a star taken by team 0,
    // $952A for team 1's, $94E2 for $80 and up; stamp_star; the mask back to $94E2; then restore_icon
    P.frame_taken_star = function (r) {
      M[0x1529] = 0xE2; M[0x152A] = 0x94;
      r.x = M[0x0761];
      const f = M[0x170B + r.x];
      if (!(f & 0x80)) {
        if (f) { M[0x1529] = 0x2A; M[0x152A] = 0x95; } else { M[0x1529] = 0x06; M[0x152A] = 0x95; }
      }
      r = P.stamp_star(r);
      M[0x1529] = 0xE2; M[0x152A] = 0x94;
      return P.restore_icon(r);
    };
    // restore_icon ($CEF5): the subject icon of the star left ($0762) in its normal colours (highlight_icon,
    // A = 1, Y = $CF)
    P.restore_icon = function (r) {
      r.x = M[0x0766 + M[0x0762]]; r.y = 0xCF; r.a = 1;
      return P.highlight_icon(r);
    };

    Object.assign(P.byAddr, {
      0xE99A: (r) => P.options_frame(r),
      0xEA16: (r) => P.subject_frame(r),
      0xCD20: (r) => P.team_pick_frame(r),
      0xE54B: (r) => P.subject_flash_frame(r),
    });
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
