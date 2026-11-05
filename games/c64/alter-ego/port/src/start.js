'use strict';
// The start object (MAP1, read into the heap at $8466 and run by initialize_alter_ego_runtime):
// the title's menu, a saved game resumed or a new one begun, the player's name, the personality
// questionnaire (answered, left to chance, or both), its scoring into the shared words at $7F40,
// and the phase of life to start in. Its code is never on the page; its data (the menus, the
// questions and their score records) is, and the port reads it where the game does.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const W = 0x7F40;                                   // the 64 words the objects share
    const TRUE_RECORDS = 0x94AE, FALSE_RECORDS = 0x971F;

    // $8D5E, entered from $9348 in call_vm_function_pointer's place: "new or resume"; a resumed
    // game gives 1 (or 2); a new one asks the name, how to fill in the questionnaire and the phase
    // of life to begin in ($82BD, 1-), and gives 0
    P.run_new_or_resume_personality_setup = function* (ptr, arg) {
      const f = P.enter([ptr, arg], 33);
      try {
        const answers = (P.fp - 33) & 0xFFFF;
        if (yield* P.run_modal_selection_dialog(0x9456, 0)) {
          const r = yield* P.resume_saved_game_menu();
          if (r === 1 || r === 2) return r;
        }
        yield* P.EditMenuTextOrSelectEntry(0x8E11, 0x82CB, 16);
        switch (yield* P.run_modal_selection_dialog(0x9492, 0)) {
          case 0:
            yield* P.run_personality_questionnaire_pages(0x9398, answers, 0);
            P.ScorePersonalityQuestionnaire(answers);
            break;
          case 1:
            P.randomize_questionnaire_answers(answers);
            P.ScorePersonalityQuestionnaire(answers);
            break;
          case 2:
            P.randomize_questionnaire_answers(answers);
            yield* P.run_personality_questionnaire_pages(0x9398, answers, 1);
            P.ScorePersonalityQuestionnaire(answers);
            break;
        }
        P.ww(0x82BD, (yield* P.run_modal_selection_dialog(0x942E, 5)) + 1);
        return 0;
      } finally { P.leave(f); }
    };

    // $8E29: twelve of the shared words set to 50 and $7FA2 cleared, then each of the 25 answers'
    // records applied: a count, then (op, word, value) triples: 0 sets the word, 1 takes it value
    // per cent of the way to 100, 2 value per cent of the way to 0, 3 and 4 add value
    P.ScorePersonalityQuestionnaire = function (answers) {
      const f = P.enter([answers], 12);
      try {
        for (const a of [0x7F46, 0x7F50, 0x7F4E, 0x7F56, 0x7F42, 0x7F54, 0x7F40, 0x7F48, 0x7F52, 0x7F44, 0x7F4A, 0x7F4C]) P.ww(a, 50);
        P.ww(0x7FA2, 0);
        for (let q = 0; q < 25; q++) {
          const base = () => (P.rb(answers + q) === 1 ? TRUE_RECORDS : FALSE_RECORDS);
          const n = P.rb(q * 25 + base());
          for (let j = 0; P.s(j) < n; j++) {
            const rec = (q * 25 + j * 3 + base()) & 0xFFFF;
            const op = P.rb(rec + 1), i = P.rb(rec + 2), v = P.rb(rec + 3);
            const at = ((i << 1) + W) & 0xFFFF, w = P.rw(at);
            switch (op) {
              case 0: P.ww(at, v); break;
              case 1: P.ww(at, P.divs(P.mul((100 - w) & 0xFFFF, v), 100) + w); break;
              case 2: P.ww(at, w - P.divs(P.mul(w, v), 100)); break;
              case 3: case 4: P.ww(at, w + v); break;
            }
          }
        }
        return 0;
      } finally { P.leave(f); }
    };

    // $8FBB: the questionnaire's seven pages of four questions (one on the last), answers
    // cleared first unless keep; a page's "back" goes to the one before, and the last page's
    // "begin" goes to the first page with an unanswered question until none is left
    P.run_personality_questionnaire_pages = function* (lines, answers, keep) {
      const f = P.enter([lines, answers, keep], 2);
      try {
        if (!keep) for (let i = 0; i < 25; i++) P.wb(answers + i, 0);
        const page = first => P.present_and_edit_questionnaire_page(first, first === 24 ? 1 : 4, lines, answers);
        let at = 0;
        for (;;) {
          // the page shown, and on to the next, or back when it gives 0 (never from the first)
          if (at === 0) { yield* page(0); at = 1; continue; }
          if (!(yield* page(at * 4))) { at--; continue; }
          if (at < 6) { at++; continue; }
          let i = 0;
          while (P.rb(answers + i) && i < 25) i++;
          if (i >= 25) return 0;
          at = (i / 4) | 0;
        }
      } finally { P.leave(f); }
    };

    // $9078: a page: questions first to first + count - 1, each its one to three lines and
    // "TRUE  FALSE" below with a star at the answer; the arrow at the first unanswered. Up and
    // down move it (on the first page not onto "back", row 1), left and right between TRUE and
    // FALSE; fire answers and goes on to the next. 0 for "back", 1 for the line at the foot
    P.present_and_edit_questionnaire_page = function* (first, count, lines, answers) {
      const f = P.enter([first, count, lines, answers], 36);
      try {
        const rows = (P.fp - 20) & 0xFFFF;                 // the arrow's rows, a word each
        const rowOf = i => P.rw(((i << 1) + rows) & 0xFFFF);
        P.clear_hires_bitmap();
        P.ww(rows, 1);
        P.ww((((count + 1) << 1) + rows) & 0xFFFF, 23);
        let n = 1, row = 3;
        if (first) P.install_dialog_glyph_range(0x92F2, 5, 1);
        for (let q = first; P.s(q) < P.s((first + count) & 0xFFFF); q = (q + 1) & 0xFFFF) {
          row = (row + 1) & 0xFFFF;
          P.install_dialog_glyph_range(P.rw((P.mul(q, 6) + lines) & 0xFFFF), 3, (row - 1) & 0xFFFF);
          for (const k of [1, 2]) {
            const line = P.rw((((P.mul(q, 3) + k) << 1) + lines) & 0xFFFF);
            if (P.rb(line)) {
              row = (row + 1) & 0xFFFF;
              P.install_dialog_glyph_range(line, 3, (row - 1) & 0xFFFF);
            }
          }
          P.install_dialog_glyph_range(0x92F9, 5, row);
          if (P.rb(answers + q) === 1) P.install_dialog_glyph_range(0x930B, 3, row);
          if (P.rb(answers + q) === 2) P.install_dialog_glyph_range(0x930D, 15, row);
          P.ww(((n << 1) + rows) & 0xFFFF, row);
          n = (n + 1) & 0xFFFF;
          row = (row + 2) & 0xFFFF;
        }
        P.install_dialog_glyph_range(((first + count) & 0xFFFF) !== 25 ? 0x930F : 0x9318, 5, 23);
        let q = first, at = 1;
        for (;;) {
          q = (q + 1) & 0xFFFF;
          if (!P.rb(q - 1 + answers)) break;
          at = (at + 1) & 0xFFFF;
          if (!(P.s((at - 1) & 0xFFFF) <= P.s(count))) break;
        }
        if (P.s(at) > P.s(count)) at = 1;
        yield* P.read_pointer_device_position(4, rowOf(at));
        let col = 4, shownAt = at, shownCol = 4;
        yield* P.delay_scaled_iterations(1000);
        for (;;) {
          const k = yield* P.read_normalized_input();
          if (!first) { if (k === 1 && P.s(at) > 1) at = (at - 1) & 0xFFFF; }
          else if (k === 1 && P.s(at) > 0) at = (at - 1) & 0xFFFF;
          if (k === 2 && P.s(at) < P.s(n)) at = (at + 1) & 0xFFFF;
          if (k === 4) col = 4;
          if (k === 8) col = 16;
          if (!at || at === n) col = 4;
          if (shownCol !== col || shownAt !== at) {
            yield* P.read_pointer_device_position(col, rowOf(at));
            shownCol = col; shownAt = at;
            yield* P.delay_scaled_iterations(0x1388);
          }
          if (k & 16) {
            if (!at) return 0;
            if (at === n) return 1;
            P.copy_rom_glyph_to_screen_charset(32, 3, rowOf(at));
            P.copy_rom_glyph_to_screen_charset(32, 15, rowOf(at));
            if (col === 4) {
              P.wb(answers + first + at - 1, 1);
              P.copy_rom_glyph_to_screen_charset(42, 3, rowOf(at));
            }
            if (col === 16) {
              P.wb(answers + first + at - 1, 2);
              P.copy_rom_glyph_to_screen_charset(42, 15, rowOf(at));
            }
            col = 4;
            at = (at + 1) & 0xFFFF;
            yield* P.read_pointer_device_position(4, rowOf(at));
            yield* P.delay_scaled_iterations(0x1388);
          }
        }
      } finally { P.leave(f); }
    };

    // $9323: the 25 answers left to chance, TRUE or FALSE by a bit of the SID's noise
    P.randomize_questionnaire_answers = function (answers) {
      const f = P.enter([answers], 2);
      try {
        for (let i = 0; i < 25; i++) P.wb(answers + i, (P.read_sid_voice3_noise() & 1) + 1);
        return 0;
      } finally { P.leave(f); }
    };

    // $936B: the object's exit, back through the frame its entry kept at $9990 with the value on
    // the stack; nothing in the start object calls it
    P.restore_saved_native_frame_and_return_vm_value = function (v) { throw new P.Exit(v); };
  });
})(typeof window !== 'undefined' ? window : globalThis);
