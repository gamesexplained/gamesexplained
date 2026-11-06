'use strict';
// The life object (MAP1, read into the heap at $8466 once the start object has run): a phase of
// life played on its map, a cell at a time. A stage's file (MAP1 for Infancy, MAP27 for Childhood
// and Old Age, MAP3 to MAP6 for the four between) holds its header (the ages it spans, its
// choices, its map of ages by three cells, where the arrow starts, its table of scene blocks)
// and the blocks, each a run of LZW-packed scenes. A scene is a descriptor: the
// conditions on the 64 shared words ($7F40) that pick one of its alternatives, the changes it
// makes to them, then its pages of text and the questions on them; the answers pick the next
// scene. Its code is never on the page; its data (texts, tables, the scene blocks it reads from
// the disk) is, and the port reads it where the game does.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const W = 0x7F40;                                  // the 64 shared words
    const word = i => P.rw(((i << 1) + W) & 0xFFFF);
    const setWord = (i, v) => P.ww(((i << 1) + W) & 0xFFFF, v);
    const STAGE = 0x82BD;                              // the phase of life, 1-7 (negative: just begun)
    const CHOICES = 0x81C5, GRID = 0x81F7;             // the stage's choices; its map, three words an age
    const TOP = 0xCAD3, AGES = 0xCAD5, LEFT = 0xCAD7;  // the age at the window's foot, the ages, the cells left
    const STREAM = 0xCADB, DESC = 0xCADD;              // the stage's file once open; the scene being played
    const BOUNDS = 0xCAE5, FIRST = 0xCAAF, END = 0xCAD1; // the block's scene boundaries; the scenes unpacked
    const PANEL = 2048;                                // the off-screen panel the text is drawn in
    const L = n => (P.fp - n) & 0xFFFF;                // a local's address, for those kept in memory
    const s = P.s;
    // a loop that waits on what the interrupt changes: the time it has used, then a raster line at
    // a time
    function* waitFor(test) {
      const n = P.due();
      if (n) yield { cycles: n };
      for (let first = true; !test(); first = false) yield first ? P.FIRST : undefined;
    }
    function* waitForFire() { while (yield* P.poll_input_high_nibble()); }

    // $84DC: the phase of life arg (the start object's 0 for a new one, 1 when its header is to
    // be read again over a game resumed or saved): the stage's header read, the map drawn and the
    // arrow put on it. The arrow moves over the map's cells and down the choices beside it; fire
    // plays the cell or the choice under it, f1-f8 the choices themselves, RUN/STOP the menu
    // (back, save, load, quit, the status). A cell or a choice that ends the stage starts all
    // this again for the next
    P.play_life_stage = function* (ptr, arg) {
      const f = P.enter([ptr, arg], 16);
      try {
        let a10 = arg;
        restart: for (;;) {
          yield* P.enter_inline_native_5f36_adjust_0();
          P.fill_memory_range(0x2000, 0x1F40, 0);
          a10 = yield* P.load_stage_header(a10);
          if (a10 === 0xFFFF) P.gameplay_object_longjmp_exit(0xFFFF);
          P.ww(AGES, P.divs(P.rw(0x82BB), 3));
          // the window's foot: the last age with a cell in it, and the cells there are
          let at = (P.mul((P.rw(AGES) - 1) & 0xFFFF, 6) + 0x81FB) & 0xFFFF;
          while (!(P.rw(at) & 0x0F00)) at = (at - 2) & 0xFFFF;
          P.ww(TOP, P.divs(P.shr((at - GRID) & 0xFFFF, 1), 3));
          P.ww(LEFT, 0);
          for (; at >= GRID; at = (at - 2) & 0xFFFF) if (P.rw(at) & 0x0F00) P.ww(LEFT, P.rw(LEFT) + 1);
          P.fill_memory_range(0x2000, 0x1F40, 0);
          P.wb(0xD020, P.rb((P.rw(STAGE) + 0xCAA4 - 1) & 0xFFFF));
          // a new stage's first cell played at once (Infancy's after its picture, until fire)
          if (!a10 && P.rw(0x82DB) !== 0xFFFF) {
            if (P.rw(STAGE) === 1) {
              for (let r = 0; s(r) < 5; r++) P.render_life_map_cell_or_connector((P.mul(r, 320) + 0x2C80) & 0xFFFF, 0, 0xC29C, r, 0, 40);
              while (yield* P.poll_input_high_nibble());
            }
            P.ww(LEFT, P.rw(LEFT) + 1);
            yield* P.play_life_map_cell(P.rems(P.rw(0x82DB), 3), P.divs(P.rw(0x82DB), 3), 0xFFFF, 0);
          }
          yield* P.enter_inline_native_5f36_adjust_0();
          P.render_initial_life_map_window(P.rw(TOP), P.rw(AGES));
          let row = P.rw(TOP), col = 2;
          const showArrow = () => { P.show_sprite0_at_grid_position(col, row, P.rw(TOP), 0); P.enable_sprite0(); };
          const moveArrow = () => P.set_sprite0_target_from_grid_position(col, row, P.rw(TOP), 0);
          showArrow();
          for (;;) {
            yield* waitFor(() => P.sprite0_has_reached_target());
            let k = yield* P.read_normalized_input();
            let choice = -1;
            if (k & 32) choice = k & 7;                  // f1-f8: a choice (f7 0 to f1 3, f8 4 to f2 7)
            else if (k === 1) {                          // up
              if (col & 3) {
                if (s(row) > 0) {
                  row = (row - 1) & 0xFFFF;
                  if (s(row) < s((P.rw(TOP) - 3) & 0xFFFF)) P.ww(TOP, P.scroll_life_map_backward_and_render_exposed_rows(1, P.rw(TOP)));
                  else moveArrow();
                }
              } else if (row !== ((P.rw(TOP) - 3) & 0xFFFF)) { row = (row - 1) & 0xFFFF; moveArrow(); }
            } else if (k === 2) {                        // down
              if (col & 3) {
                if (s(row) < s((P.rw(AGES) - 1) & 0xFFFF)) {
                  row = (row + 1) & 0xFFFF;
                  if (s(row) > s(P.rw(TOP))) P.ww(TOP, P.scroll_life_map_forward_and_render_exposed_rows(1, P.rw(TOP)));
                  else moveArrow();
                }
              } else if (row !== P.rw(TOP)) { row = (row + 1) & 0xFFFF; moveArrow(); }
            } else if (k === 4) {                        // left
              if (col) { col = (col - 1) & 0xFFFF; moveArrow(); }
            } else if (k === 8) {                        // right
              if (s(col) < 4) { col = (col + 1) & 0xFFFF; moveArrow(); }
            } else if (k === 3) {                        // RUN/STOP: the menu
              for (;;) {
                const m = yield* P.run_modal_selection_dialog(0xCAB1, 0);
                if (m === 0) {
                  yield* P.enter_inline_native_5f36_adjust_0();
                  P.render_initial_life_map_window(P.rw(TOP), P.rw(AGES));
                  showArrow();
                } else if (m === 1) {
                  P.close_stage_map_stream(); yield* P.save_current_game_menu(); a10 = 1; continue restart;
                } else if (m === 2) {
                  P.close_stage_map_stream(); yield* P.resume_saved_game_menu(); a10 = 1; continue restart;
                } else if (m === 3) {
                  P.close_stage_map_stream(); P.gameplay_object_longjmp_exit(1);
                } else if (m === 4) {
                  P.clear_hires_bitmap(); yield* P.render_complete_life_status(0, 0xFFFF); continue;
                }
                break;
              }
            } else if (k === 16) {                       // fire: the cell, or the choice beside the map
              if (col & 3) {
                if (P.rw((P.mul(row, 6) + ((col - 1) << 1) + GRID) & 0xFFFF) & 0x0F00) {
                  if (yield* P.play_life_map_cell((col - 1) & 0xFFFF, row, P.rw(TOP), 0)) { a10 = 1; continue restart; }
                  showArrow();
                }
              } else choice = (P.rw(TOP) - row + col) & 0xFFFF;
            }
            if (choice >= 0 && (P.rw(((choice << 1) + CHOICES) & 0xFFFF) & 0x0F00)) {
              if (yield* P.activate_stage_choice(P.rw(TOP), choice)) { a10 = 1; continue restart; }
              showArrow();
            }
          }
        }
      } finally { P.leave(f); }
    };

    // $87C5: choice idx, by its type (the word's bits 8-11): 0 nothing, 1 the age and the year,
    // 5 the whole status, any other its next experience
    P.activate_stage_choice = function* (top, idx) {
      const f = P.enter([top, idx], 4);
      try {
        switch (P.return_argument_byte_1(P.rw(((idx << 1) + CHOICES) & 0xFFFF)) & 15) {
          case 0: return 0;
          case 1: yield* P.enter_inline_native_5f36_adjust_0(); yield* P.show_lifetime_status_screen(); return 0;
          case 5: yield* P.enter_inline_native_5f36_adjust_0(); yield* P.render_complete_life_status(idx, top); return 0;
          default:
            yield* P.enter_inline_native_5f36_adjust_0();
            return yield* P.play_life_map_cell(P.sar(idx, 2), idx & 3, top, 1);
        }
      } finally { P.leave(f); }
    };

    // $881B: the stage's file opened, if it is not: file 2 (MAP27, Childhood's) for the last stage
    // (7), file n (MAP1, MAP3 to MAP6) for the others, asked for again (and the map drawn again, when redraw is set) until it opens. On the
    // first three stages' files, a word of where the first block starts; the second's is not used
    P.open_stage_map_stream = function* (redraw) {
      const f = P.enter([redraw], 37);
      try {
        if (P.rw(STREAM)) return P.rw(STREAM);
        let asked = 0;
        const map = P.rw(STAGE) === 7 ? 2 : P.rw(STAGE);
        for (;;) {
          P.ww(STREAM, yield* P.enter_inline_native_5b72_adjust_0(8, map));
          if (s(P.rw(STREAM)) >= 0) break;
          yield* P.prompt_retry_after_disk_error(map);
          asked = 1;
        }
        P.ww(STREAM, P.rw(STAGE));
        const st = P.rw(STAGE);
        if (st === 7 || st === 2 || st === 1) {
          P.enter_inline_native_5ce6_save4_adjust_minus2(L(35), 4);
          if (P.rw(STAGE) !== 2) P.enter_inline_native_5c3d_adjust_minus4(L(35));
        }
        if (redraw && asked) P.render_initial_life_map_window(P.rw(TOP), P.rw(AGES));
        return 0;
      } finally { P.leave(f); }
    };

    // $88A9: the stage's header from its file: its ages and the two words after them ($803B-$8042),
    // its choices (48 bytes at $81C5), its map ($82BB words, at $81F7), the cell the arrow starts
    // on ($82DB), its blocks' lengths ($82F5 of them at $82FB) and where they start ($82F7). The
    // age is brought up to the stage's first. With keep set (a game resumed) the choices, the map
    // and the starting cell are read past, the saved ones kept. keep, or -1 when the file is short
    P.load_stage_header = function* (keep) {
      const f = P.enter([keep], 514);
      try {
        if (s(P.rw(STAGE)) < 0) { P.ww(STAGE, -P.rw(STAGE)); keep = 0; }
        yield* P.open_stage_map_stream(0);
        const read = (dst, n) => P.enter_inline_native_5ce6_save4_adjust_minus2(dst, n);
        const fail = function* (text) { yield* P.report_packed_runtime_error(text); P.close_stage_map_stream(); return 0xFFFF; };
        if (read(0x803B, 8) < 8) return yield* fail(0x89DC);
        if (s(P.rw(0x7F74)) < s(P.rw(0x803B))) P.ww(0x7F74, P.rw(0x803B));
        if (read(keep ? L(514) : CHOICES, 48) < 48) return yield* fail(0x89EE);
        if (read(0x82BB, 2) < 2) return yield* fail(0x8A02);
        if (read(keep ? L(514) : GRID, (P.rw(0x82BB) << 1) & 0xFFFF) !== ((P.rw(0x82BB) << 1) & 0xFFFF)) return yield* fail(0x8A17);
        if (read(keep ? L(514) : 0x82DB, 2) < 2) return yield* fail(0x8A27);
        if (read(0x82F5, 2) < 2) return yield* fail(0x8A3D);
        if (s(read(0x82FB, (P.rw(0x82F5) << 1) & 0xFFFF)) < s((P.rw(0x82F5) << 1) & 0xFFFF)) return yield* fail(0x8A52);
        if (P.enter_inline_native_5ead_adjust_0(0x82F7) === 0xFFFF) return yield* fail(0x8A65);
        return keep;
      } finally { P.leave(f); }
    };

    // $8A72: the stage's file closed
    P.close_stage_map_stream = function () {
      const f = P.enter([], 0);
      try {
        if (P.rw(STREAM)) P.enter_inline_native_5f27_adjust_0();
        P.ww(STREAM, 0);
        return 0;
      } finally { P.leave(f); }
    };

    // $8A85: the cell at (col, row) of the map (or, with choice set, the choice col x 4 + row):
    // its block found and its scenes played, the shared words kept at $8145 first so that a scene
    // that is not to count can put them back. What the scenes end with says what follows: another
    // of the choice's experiences, the profile panel, the cell crossed off, or the stage over.
    // The block's length (a third of it for a choice) moves the years and the money on; the
    // stage ends when the age passes its last or no cell is left. 1 when the stage ended
    P.play_life_map_cell = function* (col, row, top, choice) {
      const f = P.enter([col, row, top, choice], 5);
      try {
        const len = L(4);                                // the block's length, a word kept in memory
        let again = 0;
        const cellAt = () => (P.mul(row, 6) + (col << 1) + GRID) & 0xFFFF;
        yield* P.enter_inline_native_5f36_adjust_0();
        P.play_sid_click(1024, 32, 15, 39, 15, 1);
        P.memmove_bytes(0x8145, W, 128);
        const v = choice ? P.rw((((((col << 1) << 1) + row) << 1) + CHOICES) & 0xFFFF) : P.rw(cellAt());
        P.ww(len, v & 255);
        P.ww(len, yield* P.locate_scene_block(P.rw(len)));
        if (!P.rw(len)) {
          P.play_sid_click(512, 32, 15, 39, 15, 1);
          return yield* P.delay_scaled_iterations(0x1388);
        }
        P.disable_sprite0();
        let r = yield* P.execute_scene_chunk_chain();
        for (;;) {
          let next = false;
          switch (r) {
            case 0xFFFD:                               // not for this life now: a message
              yield* P.show_three_line_message_panel(1, 0x8CA5, 0x8CC3, 0x8CE1);
              P.ww(len, 0);
              break;
            case 0xFFFE:                               // the scene could not be read
              if (again || (!choice && (P.rw(cellAt()) & 0x0F00) === 0x0800)) {
                again = 1;
                r = yield* P.execute_scene_chunk_chain();
                next = true;
                break;
              }
              P.ww(len, 0);
              P.memmove_bytes(W, 0x8145, 128);
              // falls through: crossed off
            case 0xFFFF: case 254: case 255:           // the cell played: crossed off
              if (!choice) {
                P.ww(cellAt(), P.rw(cellAt()) & 0xF0FF);
                P.ww(LEFT, P.rw(LEFT) - 1);
              }
              break;
            case 251:                                  // not to count: the words put back
              P.memmove_bytes(W, 0x8145, 128);
              P.ww(len, 0);
              break;
            case 252:                                  // the choice's next experience
              if (choice) {
                r = yield* P.run_stage_choice_experience((((col << 1) << 1) + row) & 0xFFFF, len, 0);
                next = true;
              }
              break;
            case 253:                                  // the end of life: the last stage
              P.ww(STAGE, 7);
              // falls through
            case 250:                                  // the stage over
              yield* P.finish_life_stage();
              return 1;
          }
          if (next) continue;
          if (P.rw(len) > 0) P.advance_age_and_finances(choice ? P.divu(P.rw(len), 3) : P.rw(len));
          if (s(P.rw(0x7F74)) > s(P.rw(0x803D)) || s(P.rw(LEFT)) <= 0) {
            // the stage's last choice (type 5)'s block, or straight to its end
            again = 1;
            let i = 0;
            for (; s(i) < 8; i++) if ((P.rw(((i << 1) + CHOICES) & 0xFFFF) & 0x0F00) === 0x0500) break;
            P.ww(len, yield* P.locate_scene_block(P.rw(((i << 1) + CHOICES) & 0xFFFF) & 255));
            if (P.rw(len)) { r = yield* P.execute_scene_chunk_chain(); continue; }
            yield* P.finish_life_stage();
            return 1;
          }
          if (s(top) >= 0) {
            P.render_life_map_window_or_strip(4, 1, 23, top, PANEL);
            yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
            P.render_life_map_window_or_strip(4, 23, 1, top, PANEL);
            yield* P.animate_screen_region_transition(4, 23, 1, PANEL, 22, 8);
          } else {
            P.fill_memory_range(PANEL, 0x1648, 0);
            yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
          }
          return 0;
        }
      } finally { P.leave(f); }
    };

    // $8CFF: the stage over: the screen wiped, its file closed, the menu until it is not the
    // status. On to the next stage: after the last, the first again with the words from $7F58
    // cleared, the acquisitions gone and $7FC0 set; otherwise the debt is paid off, a share of it
    // ($8041 the stages left) from the cash. The stage made negative, so that its header is read
    // as new. Then what the menu asked: save, load or quit
    P.finish_life_stage = function* () {
      const f = P.enter([], 4);
      try {
        P.fill_memory_range(PANEL, 0x1648, 0);
        yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
        P.close_stage_map_stream();
        let m;
        for (;;) {
          m = yield* P.run_modal_selection_dialog(0xCAB1, 0);
          if (m !== 4) break;
          P.clear_hires_bitmap();
          yield* P.render_complete_life_status(0, 0xFFFF);
        }
        P.ww(STAGE, P.rw(STAGE) + 1);
        if (s(P.rw(STAGE)) > 7) {
          P.ww(STAGE, 1);
          P.fill_memory_range(0x7F58, 88, 0);
          P.ww(0x82AB, 0);
          P.wb(0x7FC0, 0); P.wb(0x7FC1, 0); P.wb(0x7FC2, 0x70); P.wb(0x7FC3, 0x2A);
        } else {
          const share = P.divs(P.rw(0x7F84), P.rw(0x8041));
          if (s(share) > s(P.rw(0x7F78))) {
            P.ww(0x7F84, P.rw(0x7F84) - P.rw(0x7F78));
            P.ww(0x7F78, 0);
          } else {
            P.ww(0x7F78, P.rw(0x7F78) - share);
            P.ww(0x7F84, P.rw(0x7F84) - share);
          }
          P.ww(0x7F82, 0);
        }
        P.ww(STAGE, -P.rw(STAGE));
        switch (m) {
          case 0: return m;
          case 1: return yield* P.save_current_game_menu();
          case 2: return yield* P.resume_saved_game_menu();
          case 3: P.gameplay_object_longjmp_exit(1); break;
        }
        return m;
      } finally { P.leave(f); }
    };

    // $9908: the block found by locate_scene_block read in: from its place ($CC65) its lengths
    // ($CADF) and the count of its scenes ($CAE3), their boundaries ($CAE5); where its packed
    // bytes start ($CAAB); none of it unpacked yet. On an error the disk is asked for again,
    // except a missing or broken file, which ends the game
    P.load_scene_block_header = function* () {
      const f = P.enter([], 0);
      try {
        for (;;) {
          yield* P.open_stage_map_stream(1);
          const read = (dst, n) => P.enter_inline_native_5ce6_save4_adjust_minus2(dst, n);
          let err = 0;
          if (s(P.enter_inline_native_5c3d_adjust_minus4(0xCC65)) < 0) err = 0x99BC;
          else if (read(0xCADF, 6) !== 6) err = 0x99CB;
          else if (read(BOUNDS, (P.rw(0xCAE3) << 1) & 0xFFFF) !== ((P.rw(0xCAE3) << 1) & 0xFFFF)) err = 0x99DF;
          else {
            P.ww(FIRST, 0); P.ww(END, 0);
            if (s(P.enter_inline_native_5ead_adjust_0(0xCAAB)) < 0) err = 0x99F1;
          }
          if (!err) {
            P.enter_inline_native_a4e1_adjust_0();
            return 0;
          }
          yield* P.report_packed_runtime_error(err);
          switch (P.rw(0x8043) & 15) {
            case 6: case 7: case 15:
              yield* P.report_packed_runtime_error(0x9A02);
              P.gameplay_object_longjmp_exit(0xFFFF);
          }
          P.close_stage_map_stream();
        }
      } finally { P.leave(f); }
    };

    // $9A14: scene idx of the block, unpacked into $C2A2 with those after it up to 2048 bytes:
    // when it is not among those unpacked, the decoder goes on from them or (for one before them)
    // starts the block again. Its descriptor's address ($CADD), or 0
    P.load_local_map_chunk = function* (idx) {
      const f = P.enter([idx], 8);
      try {
        const bound = i => P.rw(((i << 1) + BOUNDS) & 0xFFFF);
        const held = () => s(P.rw(FIRST)) <= s(idx) && s(idx) < s(P.rw(END));
        if (!held()) {
          const from = bound(idx);
          let skip;
          if (s(idx) < s(P.rw(FIRST))) {
            P.enter_inline_native_a4e1_adjust_0();
            if (P.enter_inline_native_5c3d_adjust_minus4(0xCAAB) === 0xFFFF) {
              yield* P.report_packed_runtime_error(0x9AE4);
              return 0;
            }
            skip = from;
          } else skip = (from - bound(P.rw(END))) & 0xFFFF;
          const endAt = (((idx + 1) << 1) + BOUNDS) & 0xFFFF;
          const n = (P.rw(endAt) - from) & 0xFFFF;
          if (s(n) > 2048) {
            yield* P.format_and_show_error_message(0x9AF1, (P.rw(endAt) - from) & 0xFFFF);
            return 0;
          }
          if (P.enter_inline_native_a4f7_adjust_0(P.rw(STREAM), 0xC2A2, skip, n)) {
            yield* P.report_packed_runtime_error(0x9B08);
            return 0;
          }
          P.ww(FIRST, idx);
          P.ww(END, P.shr((endAt - BOUNDS) & 0xFFFF, 1));
        }
        P.ww(DESC, held() ? (bound(idx) - bound(P.rw(FIRST)) + 0xC2A2) & 0xFFFF : 0);
        return P.rw(DESC);
      } finally { P.leave(f); }
    };

    // $9B18: the block's scenes played from its first, each to the one its answers pick, until
    // one ends the chain: a value of $F0 or more, or -2 when a scene could not be read; -3 when
    // the first scene's conditions held for none of its alternatives. A scene's 255 plays the
    // "that is not a choice" scene and the last one again
    P.execute_scene_chunk_chain = function* () {
      const f = P.enter([], 4);
      try {
        let last = 0;
        if (!(yield* P.load_local_map_chunk(0))) return 0xFFFE;
        P.ww(0xCAD9, 1);
        let r = yield* P.interpret_interaction_descriptor();
        if (r === 0xFFFD) return 0xFFFD;
        for (;;) {
          if (r === 0xFFFD) { r = P.rb((P.rw(DESC) + 1) & 0xFFFF) & 255; continue; }
          if (r === 0xFFFE) return r;
          if (r === 255) {
            yield* P.execute_invalid_choice_descriptor();
            r = last;
          } else {
            r &= 255;
            if ((r & 240) === 240) return r;
          }
          last = r;
          if (!(yield* P.load_local_map_chunk(r))) return 0xFFFE;
          r = yield* P.interpret_interaction_descriptor();
        }
      } finally { P.leave(f); }
    };

    // $9B96: n conditions of five bytes at p, each a shared word's number and the range (two
    // big-endian words) it must be in; a 255 ends them early, passing. The address after them when
    // all hold (after the 255's five bytes), 0 at the first that does not
    P.evaluate_scene_conditions = function (n, p) {
      const f = P.enter([n, p], 4);
      try {
        for (; s(n) > 0; n = (n - 1) & 0xFFFF) {
          if ((P.rb(p) & 255) === 255) return (p + 5) & 0xFFFF;
          p = (p + 1) & 0xFFFF;
          const v = word(P.rb((p - 1) & 0xFFFF));
          let lim = ((P.rb(p) << 8) + P.rb((p + 1) & 0xFFFF)) & 0xFFFF;
          p = (p + 2) & 0xFFFF;
          if (s(v) < s(lim)) return 0;
          lim = ((P.rb(p) << 8) + P.rb((p + 1) & 0xFFFF)) & 0xFFFF;
          p = (p + 2) & 0xFFFF;
          if (s(v) > s(lim)) return 0;
        }
        return p;
      } finally { P.leave(f); }
    };

    // $9BF9: the scene at $CADD played. After its header (a length-prefixed field skipped), the
    // alternatives' conditions: the scene goes on only when one holds. Then its changes to the
    // shared words: a word's number, an operation and a value (bit 6: the value names a word):
    // 0 set, 2 add, 3 a value per cent of the way to 100 (to the twelve traits; beyond them value
    // per cent of the word added), 4 take, 5 take value per cent, 6 a random number below value.
    // Then its pages: each opened (begin_scene_text_output, "back" offered from the second),
    // then ops: 1 a line of text, 2 an answer (its question's number and value, then its text),
    // 4 a question left to chance unless answered, 6 the first question set by the conditions
    // again, 3 the page shown for its answers and on to the next, 5 the same and the last page.
    // Back goes to the page before. When every question has its answer, they make one number,
    // each question's answer a digit in its own base; the scene's table names the next scene for
    // it (the value). -3 when no alternative held, -2 for RUN/STOP
    P.interpret_interaction_descriptor = function* () {
      const f = P.enter([], 94);
      try {
        // the locals are kept in memory where the game keeps them: the answers (fp-11, a byte
        // each), the pages their questions are on (fp-89) and the answers on the page (fp-81, a
        // value and a row each) are passed on and overlap as the game's do
        const vars = L(11), pages = L(89), opts = L(81);
        const D = P.rw(DESC);
        let p = (((P.rb(D) & 255) + 1) + D) & 0xFFFF;
        p = (p + 1) & 0xFFFF;
        let n = P.rb((p - 1) & 0xFFFF);
        const alt = P.evaluate_scene_conditions(n, p);
        if (!alt) return 0xFFFD;
        const altN = (n - P.divs((alt - p) & 0xFFFF, 5)) & 0xFFFF;
        p = (p + P.mul(n, 5)) & 0xFFFF;
        p = (p + 1) & 0xFFFF;
        // the changes to the shared words
        for (n = P.rb((p - 1) & 0xFFFF); s(n) > 0; n = (n - 1) & 0xFFFF) {
          p = (p + 1) & 0xFFFF;
          const i = P.rb((p - 1) & 0xFFFF);
          let v = ((P.rb((p + 1) & 0xFFFF) << 8) + P.rb((p + 2) & 0xFFFF)) & 0xFFFF;
          p = (p + 3) & 0xFFFF;
          const op = P.rb((p - 3) & 0xFFFF);
          if (op & 64) v = word(v);
          switch (op & 0xFFBF) {
            case 0: setWord(i, v); break;
            case 2: setWord(i, word(i) + v); break;
            case 3:
              if (s(i) < 12) setWord(i, word(i) + P.divs(P.mul((100 - word(i)) & 0xFFFF, v), 100));
              else {
                const w = word(i);
                P.ww(L(92), w);
                setWord(i, word(i) + P.mul(P.divs(w, 100), v));
                setWord(i, word(i) + P.divs(P.mul(P.rems(w, 100), v), 100));
              }
              break;
            case 4: setWord(i, word(i) - v); break;
            case 5: setWord(i, word(i) - P.divs(P.mul(word(i), v), 100)); break;
            case 6: setWord(i, P.rems(P.sar(P.read_sid_voice3_noise(), 2), v)); break;
          }
        }
        // the questions: none answered
        const qs = p;
        for (n = (P.rb(qs) - 1) & 0xFFFF; s(n) >= 0; n = (n - 1) & 0xFFFF) P.wb(n + vars, 255);
        p = (((P.rb(p) & 255) + 1) + p) & 0xFFFF;
        let texts = (((P.rb(p) & 255) + 1) + p) & 0xFFFF;
        const strings = ((((P.rw(texts) + 1) << 1) & 0xFFFF) + texts) & 0xFFFF;
        texts = (texts + 2) & 0xFFFF;
        p = (p + 1) & 0xFFFF;
        const pagesAt = p;
        let page = 0;
        const text = i => (P.rw((((i & 255) << 1) + texts) & 0xFFFF) + strings) & 0xFFFF;
        // the pages before page skipped, from the first
        const seek = () => {
          p = pagesAt;
          for (let k = 0; s(k) < s(page); k++) {
            p = (p + 1) & 0xFFFF;
            for (;;) {
              p = (p + 1) & 0xFFFF;
              const o = P.rb((p - 1) & 0xFFFF);
              if (o === 1 || o === 4) p = (p + 1) & 0xFFFF;
              else if (o === 2) p = (p + 2) & 0xFFFF;
              else if (o === 6) continue;
              else break;
            }
          }
        };
        // the pages, until the last is left; then the answers, back to the page of any question
        // without one
        for (;;) {
          paging: for (;;) {
            let answers = 0, lines = 0;
            let row = P.begin_scene_text_output(page) & 255;
            if (page) {
              p = (p + 1) & 0xFFFF;
              row = P.render_scene_text_with_substitutions(text(P.rb((p - 1) & 0xFFFF)), row, 0) & 255;
              lines = (lines + 1) & 255;
            }
            for (;;) {
              p = (p + 1) & 0xFFFF;
              const op = P.rb((p - 1) & 0xFFFF);
              if (op === 1) {
                p = (p + 1) & 0xFFFF;
                row = P.render_scene_text_with_substitutions(text(P.rb((p - 1) & 0xFFFF)), row, 0) & 255;
                lines = (lines + 1) & 255;
              } else if (op === 2) {
                if (!(P.rb(p) & 15)) P.wb(((P.rb(p) >> 4) & 15) + pages, page);
                p = (p + 1) & 0xFFFF;
                P.wb(((answers << 1) + opts) & 0xFFFF, P.rb((p - 1) & 0xFFFF));
                P.wb(((answers << 1) + opts + 1) & 0xFFFF, row);
                p = (p + 1) & 0xFFFF;
                row = P.render_scene_text_with_substitutions(text(P.rb((p - 1) & 0xFFFF)), row, 1) & 255;
                const qv = P.rb((p - 2) & 0xFFFF);
                if (P.rb((((qv >> 4) & 15) + vars) & 0xFFFF) === (qv & 15)) {
                  P.render_scene_text_with_substitutions(0xA058, P.rb(((answers << 1) + opts + 1) & 0xFFFF), 0);
                }
                answers = (answers + 1) & 255;
                lines = (lines + 1) & 255;
              } else if (op === 4) {
                p = (p + 1) & 0xFFFF;
                const q = (P.rb((p - 1) & 0xFFFF) >> 4) & 7;
                if (P.rb((q + vars) & 0xFFFF) === 255) {
                  P.wb((q + vars) & 0xFFFF, P.rems(P.sar(P.read_sid_voice3_noise(), 2), P.rb((p - 1) & 0xFFFF) & 15));
                }
              } else if (op === 6) {
                P.wb(vars, P.evaluate_scene_conditions(altN, alt) ? 0 : 1);
              } else if (op === 3 || op === 5) {
                if (op === 5 && !lines) break paging;
                P.wb(((answers << 1) + opts) & 0xFFFF, 255);
                const r = yield* P.collect_scene_choice(opts, vars);
                if (r === 2) return 0xFFFE;
                if (r === 1) {                           // back
                  if (page) page = (page - 1) & 0xFFFF;
                  seek();
                  continue paging;
                }
                if (r === 0) {                           // on
                  page = (page + 1) & 0xFFFF;
                  if (P.rb((p - 1) & 0xFFFF) === 3) continue paging;
                  if (P.rb((p - 1) & 0xFFFF) === 5) break paging;
                }
              }
            }
          }
          // the answers made one number
          if (!P.rb(qs)) return P.rb((P.rw(DESC) + 1) & 0xFFFF) & 255;
          let value = 0, unanswered = -1;
          for (let k = 0; s(k) < s(P.rb(qs)); k++) {
            if (P.rb((k + vars) & 0xFFFF) === 255) { unanswered = k; break; }
            value = P.mul(value, P.rb((qs + k + 1) & 0xFFFF));
            value = (value + P.rb((k + vars) & 0xFFFF)) & 0xFFFF;
          }
          if (unanswered >= 0) {
            page = P.rb((unanswered + pages) & 0xFFFF);
            seek();
            continue;
          }
          value = (value + 1) & 0xFFFF;
          if (s(value) > s(P.rb(P.rw(DESC)) & 255)) {
            yield* P.format_and_show_error_message(0xA05A, P.rw(0x8043));
            yield* P.terminate_to_basic_with_status(1);
          }
          return P.rb((P.rw(DESC) + value) & 0xFFFF) & 255;
        }
      } finally { P.leave(f); }
    };

    // $A06D: the page's answers (pairs of a value, its question in the high nibble, and a row,
    // ended by 255, the line at the foot) chosen with the arrow at column 7: up and down move it
    // (past the first to "back", row 2, when the page has it), fire on an answer marks it with a
    // star (the others of its question cleared) and moves to the foot. 0 for the foot's line, 1
    // for back, 2 for RUN/STOP. The panel comes onto the screen first, the curtain $CAD9 steps
    // at a time
    P.collect_scene_choice = function* (opts, vars) {
      const f = P.enter([opts, vars], 3);
      try {
        const val = i => P.rb(((i << 1) + opts) & 0xFFFF);
        const rowOf = i => P.rb(((i << 1) + opts + 1) & 0xFFFF);
        yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, P.rw(0xCAD9));
        P.ww(0xCAD9, 8);
        let at = 0;
        for (;;) {
          if (at === 255) yield* P.place_arrow_at_text_cell(7, 2);
          else if (val(at) === 255) yield* P.place_arrow_at_text_cell(7, 22);
          else yield* P.place_arrow_at_text_cell(7, (rowOf(at) + 1) & 0xFFFF);
          yield* P.delay_scaled_iterations(0x1388);
          let k;
          do k = (yield* P.read_normalized_input()) & 255; while (k !== 1 && k !== 2 && k !== 3 && k !== 16);
          if (k === 3) { yield* P.enter_inline_native_5f36_adjust_0(); return 2; }
          if (k === 1) {
            if (at !== 255 && (P.rb(0xB568) || at)) at = (at - 1) & 255;
            else { at = 0; while (val(at) !== 255) at = (at + 1) & 255; }
            continue;
          }
          if (k === 2) {
            if (at === 255 || val(at) !== 255) at = (at + 1) & 255;
            else at = P.rb(0xB568) ? 255 : 0;
            continue;
          }
          // fire
          if (at === 255) { yield* P.enter_inline_native_5f36_adjust_0(); return 1; }
          if (val(at) === 255) {
            yield* P.enter_inline_native_5f36_adjust_0();
            P.play_sid_click(2048, 32, 15, 39, 15, 1);
            return 0;
          }
          let i = 0;
          for (; val(i) !== 255; i = (i + 1) & 255) {
            if ((val(i) & 240) === (val(at) & 240)) P.copy_rom_glyph_to_screen_charset(i === at ? 42 : 32, 5, (rowOf(i) + 1) & 0xFFFF);
            else if (i > at) break;
          }
          P.wb((((val(at) >> 4) & 7) + vars) & 0xFFFF, val(at) & 15);
          at = i;
        }
      } finally { P.leave(f); }
    };

    // $A235: a page begun: the panel cleared and framed, "continue" at its foot (row 21) and,
    // with back set, "back" at its head; back kept at $B568 for the arrow. The first row for text
    P.begin_scene_text_output = function (back) {
      const f = P.enter([back], 0);
      try {
        P.wb(0xB568, back);
        P.clear_and_frame_text_region(23, PANEL);
        P.render_scene_text_with_substitutions(0xA263, 21, 0);
        if (back) P.render_scene_text_with_substitutions(0xA26F, 1, 0);
        return 2;
      } finally { P.leave(f); }
    };

    // $A279: text into the panel from row on, a row for each 10. A byte with bit 7 set stands
    // for something: 12-25 a string chosen by that shared word from the game's string tables
    // ($8463, under the KERNAL), its lower case raised with upper set; any other the shared
    // word's value in digits. The row after the text's last
    P.render_scene_text_with_substitutions = function (text, row, upper) {
      const f = P.enter([text, row, upper], 136);
      try {
        let col = 1;
        const put = ch => { col = (col + 1) & 0xFFFF; P.copy_rom_glyph_to_buffer(ch, (col - 1) & 0xFFFF, row, PANEL); };
        for (;;) {
          text = (text + 1) & 0xFFFF;
          let c = P.rb((text - 1) & 0xFFFF);
          if (!c) return (row + 1) & 0xFFFF;
          if (!(c & 128)) {
            if (c === 10) { col = 1; row = (row + 1) & 0xFFFF; } else put(c);
            continue;
          }
          c &= 127;
          if (s(c) < 12 || s(c) >= 26 || !P.rw(0x8463)) {
            const v = word(c);
            if (s(v) > 99) put((P.divs(v, 100) + 48) & 0xFFFF);
            if (s(v) > 9) put((P.divs(P.rems(v, 100), 10) + 48) & 0xFFFF);
            put((P.rems(v, 10) + 48) & 0xFFFF);
            continue;
          }
          const table = (P.rw(0x8463) + ((c - 12) << 1)) & 0xFFFF;
          const v = word(c);
          P.wb(0x01, P.rb(0x01) & 253);
          P.copy_bounded_zero_terminated_string(L(132), P.rw((P.rw(table) + (v << 1)) & 0xFFFF), 127);
          P.wb(0x01, P.rb(0x01) | 2);
          P.wb(L(5), 0);
          for (let q = L(132); P.rb(q); q = (q + 1) & 0xFFFF) {
            const ch = P.rb(q);
            put(upper && ch >= 97 && ch <= 122 ? ch - 32 : ch);
          }
        }
      } finally { P.leave(f); }
    };

    // $A3D0: the scene that says an answer was not one ($A3DF) played
    P.execute_invalid_choice_descriptor = function* () {
      const f = P.enter([], 0);
      try {
        P.ww(DESC, 0xA3DF);
        return yield* P.interpret_interaction_descriptor();
      } finally { P.leave(f); }
    };

    // a number's leading zeros blanked, the first two digits of three ($AACE)
    const blank = (at, both) => {
      if (P.rb(at) === 48) { P.wb(at, 32); if (both && P.rb(at + 1) === 48) P.wb(at + 1, 32); }
    };

    // $AA90: the age in years and months, until fire
    P.show_lifetime_status_screen = function* () {
      const f = P.enter([], 32);
      try {
        const buf = L(30);
        P.clear_and_frame_text_region(23, PANEL);
        P.render_text_into_region(0xAB7E, PANEL, 9, 11, 2);
        P.render_text_into_region(0xAB88, PANEL, 17, 7, 6);
        P.format_word_as_three_decimal_digits(P.rw(0x7F74), buf);
        blank(buf, true);
        P.render_text_into_region(buf, PANEL, 3, 9, 8);
        const months = P.return_argument_byte_1(P.mul(P.return_argument_byte_1(P.rw(0x7FC4)), 12));
        P.format_word_as_three_decimal_digits(months, buf);
        blank(buf, true);
        P.render_text_into_region(buf, PANEL, 3, 18, 8);
        P.render_text_into_region(0xAB9A, PANEL, 14, 8, 21);
        P.disable_sprite0();
        yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, 1);
        yield* P.place_arrow_at_text_cell(6, 22);
        yield* waitForFire();
        yield* P.enter_inline_native_5f36_adjust_0();
        return yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
      } finally { P.leave(f); }
    };

    // $ABA9: three lines of text (a, b, c) on rows 2-4 and CONTINUE below, until fire; the map
    // brought back over them when back is set
    P.show_three_line_message_panel = function* (back, a, b, c) {
      const f = P.enter([back, a, b, c], 2);
      try {
        P.clear_and_frame_text_region(23, PANEL);
        P.render_text_into_region(a, PANEL, P.measure_zero_terminated_string(a), 1, 2);
        P.render_text_into_region(b, PANEL, P.measure_zero_terminated_string(b), 1, 3);
        P.render_text_into_region(c, PANEL, P.measure_zero_terminated_string(c), 1, 4);
        P.render_text_into_region(0xAC34, PANEL, 8, 8, 21);
        yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, 1);
        yield* P.place_arrow_at_text_cell(12, 22);
        yield* waitForFire();
        yield* P.enter_inline_native_5f36_adjust_0();
        if (back) return yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
        return back;
      } finally { P.leave(f); }
    };

    // $ADAC: the status, a page at a time with "more" or "back": the name, age and one of six
    // descriptions; the twelve traits as bars, six to a page; the cash, the debt and the
    // acquisitions. Then, a time in three, on a choice's status (idx, top 0 or more), that
    // choice's next experience; the map back
    P.render_complete_life_status = function* (idx, top) {
      const f = P.enter([idx, top], 72);
      try {
        const buf = L(72), first = L(8);
        P.ww(first, 1);
        let page = 0;
        for (;;) {
          if (page === 0) {
            P.clear_and_frame_text_region(23, PANEL);
            P.render_text_into_region(0xB0DE, PANEL, 9, 10, 1);
            P.render_text_into_region(0xB0E8, PANEL, 18, 6, 3);
            P.render_text_into_region(0xB0FB, PANEL, 5, 2, 6);
            P.copy_bounded_zero_terminated_string(buf, 0x82CB, 16);
            P.wb(L(56), 0);
            P.render_text_into_region(buf, PANEL, P.measure_zero_terminated_string(buf), 4, 7);
            P.fill_memory_range(buf, 7, 32);
            P.wb(L(63), 0);
            P.render_text_into_region(0xB101, PANEL, 4, 2, 9);
            P.format_word_as_three_decimal_digits(P.rw(0x7F74), buf);
            blank((buf + 1) & 0xFFFF, false);
            P.render_text_into_region((buf + 1) & 0xFFFF, PANEL, 2, 4, 10);
            P.render_text_into_region(0xB106, PANEL, 11, 2, 12);
            P.render_scene_text_with_substitutions(0xB112, 13, 0);
            P.render_text_into_region(0xB117, PANEL, 20, 2, 15);
            if (P.rw(0x7F7A)) P.render_scene_text_with_substitutions(0xB12C, 16, 0);
            else if (P.rw(0x7F7C)) P.render_scene_text_with_substitutions(0xB13C, 16, 0);
            else if (P.rw(0x7F9C)) P.render_scene_text_with_substitutions(0xB14C, 16, 0);
            else if (P.rw(0x7F7E)) P.render_scene_text_with_substitutions(0xB15D, 16, 0);
            else if (P.rw(0x7F80)) P.render_scene_text_with_substitutions(0xB16D, 16, 0);
            else P.render_scene_text_with_substitutions(0xB178, 16, 0);
            P.render_text_into_region(0xB182, PANEL, 8, 7, 21);
            if (P.rw(first)) {
              P.disable_sprite0();
              yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, 1);
              P.ww(first, 0);
            } else yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, 8);
            yield* P.place_arrow_at_text_cell(6, 22);
            P.clear_and_frame_text_region(23, PANEL);
            yield* waitForFire();
            yield* P.enter_inline_native_5f36_adjust_0();
            page = 1;
          }
          if (page === 1) {
            P.render_text_into_region(0xB18B, PANEL, 6, 7, 1);
            for (let i = 0, r = 2; s(i) < 6; i++, r += 3) {
              P.render_scene_text_with_substitutions(P.rw(((i << 1) + 0xC26A) & 0xFFFF), r, 0);
              P.draw_trait_score_bar(i, r + 1, PANEL);
            }
            P.render_text_into_region(0xB192, PANEL, 8, 7, 21);
            if (yield* P.prompt_status_screen_action()) { page = 0; continue; }
            page = 2;
          }
          if (page === 2) {
            P.render_text_into_region(0xB19B, PANEL, 6, 7, 1);
            for (let i = 6, r = 2; s(i) < 12; i++, r += 3) {
              P.render_scene_text_with_substitutions(P.rw(((i << 1) + 0xC26A) & 0xFFFF), r, 0);
              P.draw_trait_score_bar(i, r + 1, PANEL);
            }
            P.render_text_into_region(0xB1A2, PANEL, 8, 7, 21);
            if (yield* P.prompt_status_screen_action()) { page = 1; continue; }
          }
          P.render_text_into_region(0xB1AB, PANEL, 6, 7, 1);
          P.render_status_numeric_field(0xB1B2, 3, P.rw(0x7F78), P.rw(0x7F76));
          P.render_status_numeric_field(0xB1BB, 5, P.rw(0x7F84), P.rw(0x7F82));
          P.render_text_into_region(0xB1C4, PANEL, 12, 2, 7);
          if (!P.rw(0x82AB)) P.render_scene_text_with_substitutions(0xB1D2, 8, 0);
          else {
            let r = 8;
            for (let i = 1; s(i) < 16; i++) {
              if (P.shl(1, i) & P.rw(0x82AB)) r = P.render_scene_text_with_substitutions(P.rw(((i << 1) + 0xC282) & 0xFFFF), r, 0);
            }
          }
          P.render_text_into_region(0xB1DC, PANEL, 14, 7, 21);
          if (yield* P.prompt_status_screen_action()) { page = 2; continue; }
          break;
        }
        if (s(top) >= 0 && !P.rems(P.sar(P.read_sid_voice3_noise(), 2), 3)) {
          yield* P.run_stage_choice_experience(idx, first, 1);
          if (s(P.rw(first)) > 0) P.advance_age_and_finances(P.rw(first));
        }
        if (s(top) >= 0) P.render_life_map_window_or_strip(4, 1, 23, top, PANEL);
        else P.fill_memory_range(PANEL, 0x1648, 0);
        return yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 22, 8);
      } finally { P.leave(f); }
    };

    // $B1EB: trait i's bar on row row: a block for each 5 of its score, from column 3
    P.draw_trait_score_bar = function (i, row, buf) {
      const f = P.enter([i, row, buf], 4);
      try {
        const n = P.divs(word(i), 5);
        for (let c = (n + 2) & 0xFFFF; s(c) > 2; c = (c - 1) & 0xFFFF) P.copy_custom_glyph_to_buffer(14, c, row, buf);
        return 0;
      } finally { P.leave(f); }
    };

    // $B217: the page onto the screen and the arrow on "more" at its foot; up puts it on "back"
    // at the head, down back on "more"; fire chooses. 1 for back, 0 for more
    P.prompt_status_screen_action = function* () {
      const f = P.enter([], 6);
      try {
        let at = 1, shown = 1;
        yield* P.animate_screen_region_transition(4, 1, 23, PANEL, 24, 8);
        yield* P.place_arrow_at_text_cell(6, 22);
        P.enable_sprite0();
        P.clear_and_frame_text_region(23, PANEL);
        for (;;) {
          const k = yield* P.read_normalized_input();
          if (k & 16) break;
          if (k & 1) at = 0;
          else if (k & 2) at = 1;
          if (shown !== at) {
            shown = at;
            if (at) yield* P.place_arrow_at_text_cell(6, 22);
            else yield* P.place_arrow_at_text_cell(6, 2);
            yield* P.delay_scaled_iterations(0x1388);
          }
        }
        yield* P.enter_inline_native_5f36_adjust_0();
        return at ? 0 : 1;
      } finally { P.leave(f); }
    };

    // $B296: v (0-999) in digits at dst, its leading zeros left out unless lead is set (the
    // part after a comma); the address after them
    P.append_unsigned_decimal_0_999 = function (dst, v, lead) {
      const f = P.enter([dst, v, lead], 2);
      try {
        let d = P.divs(v, 100);
        if (d || lead) { dst = (dst + 1) & 0xFFFF; P.wb(dst - 1, d + 48); v = P.rems(v, 100); lead = (lead + 1) & 0xFFFF; }
        d = P.divs(v, 10);
        if (d || lead) { dst = (dst + 1) & 0xFFFF; P.wb(dst - 1, d + 48); v = P.rems(v, 10); }
        dst = (dst + 1) & 0xFFFF; P.wb(dst - 1, v + 48);
        return dst;
      } finally { P.leave(f); }
    };

    // $B2E1: a label and an amount of thousands and units (as "1,234,567") on row row
    P.render_status_numeric_field = function (label, row, high, low) {
      const f = P.enter([label, row, high, low], 36);
      try {
        if (s(low) > 999) { high = (high + P.divs(low, 1000)) & 0xFFFF; low = P.rems(low, 1000); }
        let q = L(32);
        for (;;) {
          q = (q + 1) & 0xFFFF; label = (label + 1) & 0xFFFF;
          P.wb(q - 1, P.rb(label - 1));
          if (!P.rb(label - 1)) break;
        }
        q = (q - 1) & 0xFFFF;
        let lead = 0;
        if (s(high) > 999) {
          q = P.append_unsigned_decimal_0_999(q, P.divs(high, 1000), lead);
          q = (q + 1) & 0xFFFF; P.wb(q - 1, 44); lead++;
        }
        if (high || lead) {
          q = P.append_unsigned_decimal_0_999(q, P.rems(high, 1000), lead);
          q = (q + 1) & 0xFFFF; P.wb(q - 1, 44); lead++;
        }
        q = P.append_unsigned_decimal_0_999(q, low, lead);
        P.wb(q, 0);
        return P.render_scene_text_with_substitutions(L(32), row, 0);
      } finally { P.leave(f); }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
