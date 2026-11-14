/* pq-g3-questions */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 3, the questions. Finding records in a loaded question
// block, building a question's text and its four answers, the clue rounds' items (Name the Year, Spot the Star),
// the shuffles and the question picker, all in the title part. One function per listing label, on the game's
// memory (pq-core.js says how).
//
// The block's data lies at $B800-$FEFF, partly under the I/O area: the routines read it through H.rd, so that a
// read at $D000-$DFFF finds RAM while the game has the processor port at $34 (all RAM), as it does when it builds a
// subject question. The scans keep their pointers where the game keeps them, in the operands of their own
// `lda $FFFF` instructions, and step them there.
//
// Two routines wait for the interrupt to leave the processor port as they need it: build_question ($3404) and
// build_answers ($3AEA). They are generators; their work is split off as plain functions, build_question_body
// (the game's code from $3416) and build_answers_body ($3AF6-$3C01), which the tests check alone. Two routines end
// by jumping to ask_question ($2D33): round_pick_item ($0E76) and spot_the_star_pick ($3923). Each is a plain
// function that does the work up to the jump, and a stage, P.stages[address], that runs it and returns $2D33.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M;
    const w16 = (a) => M[a] | M[a + 1] << 8;
    const put16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    // inc lo; bne; inc hi
    const inc16 = (a) => { M[a] = (M[a] + 1) & 255; if (M[a] === 0) M[a + 1] = (M[a + 1] + 1) & 255; };
    // lda lo; clc; adc #n; sta dlo; lda hi; adc #0; sta dhi: the sum into d, the carry out returned
    const add16 = (d, a, n) => { const s = M[a] + n; const hi = M[a + 1] + (s >> 8); M[d] = s & 255; M[d + 1] = hi & 255; return { a: hi & 255, c: hi >> 8 }; };
    const nz = (r, v) => { r.z = (v & 255) === 0 ? 1 : 0; r.n = (v >> 7) & 1; return r; };
    // the scan these routines share: from the pointer at op, step a byte at a time to the next $FF ($FF at the
    // pointer itself counts)
    const toFF = (op) => { while (H.rd(w16(op)) !== 0xFF) inc16(op); };

    // round_pick_item ($0E76): Name the Year: round type 1, a random item 0-7 not yet used (items_used $1DB0)
    // into question_number, 2 tries, 3 points for each team; then the game jumps to ask_question ($2D33)
    P.round_pick_item = function (r) {
      M[0x1DC0] = 1; M[0x07A3] = 0;
      let x;
      for (;;) { r = P.random(r); x = r.a & 7; if (!(M[0x1DA7 + x] & M[0x1DB0])) break; }
      M[0x1DB0] |= M[0x1DA7 + x];
      M[0x28] = x; M[0x1DBF] = 2; M[0x30F4] = 3; M[0x3102] = 3; M[0x1DC0] = 1; M[0x07A3] = 0;
      r.a = 0; r.x = x; return nz(r, 0);
    };
    P.stages[0x0E76] = function* () { P.round_pick_item({ a: 0, x: 0, y: 0, c: 0, z: 0, n: 0, v: 0 }); return 0x2D33; };

    // find_question ($24DE): record X of the block (question $FF answer $FF and four bytes) from $B80F into zp_2E/2F,
    // and the word list pointer ($34/$35) = $B800 + the offset at $B802 (high) / $B803 (low). For X = 0 it gives
    // $B814, five bytes on, as the game's does
    P.find_question = function (r) {
      const x = r.x;
      M[0x24DC] = x; M[0x24DD] = 0;
      let s = M[0xB803]; M[0x34] = s & 255; M[0x35] = (M[0xB802] + 0xB8 + (s >> 8)) & 255;
      M[0x2508] = 0x0F; M[0x2E] = 0x0F; M[0x2509] = 0xB8; M[0x2F] = 0xB8;
      if (x !== 0) {
        for (;;) {
          if (H.rd(w16(0x2508)) !== 0xFF) { inc16(0x2508); continue; }
          M[0x24DD] = (M[0x24DD] + 1) & 255;
          if (M[0x24DD] & 1) { inc16(0x2508); continue; }
          M[0x24DC] = (M[0x24DC] - 1) & 255;
          if (M[0x24DC] === 0) break;
          add16(0x2508, 0x2508, 5);
        }
      }
      const o = add16(0x2E, 0x2508, 5);
      r.a = o.a; r.c = o.c; return nz(r, o.a);
    };

    // find_spare_answer ($254C): zp_2C/2D = zp_ptr_2A + 1; zp_ptr_2A at string X of the spare answers' list ($B800
    // + the offset at $B800/$B801), its start for X = 0
    P.find_spare_answer = function (r) {
      const x = r.x;
      add16(0x2C, 0x2A, 1);
      M[0x24DC] = x;
      const s = M[0xB801]; M[0x2576] = s & 255; M[0x2A] = s & 255;
      const hi = M[0xB800] + 0xB8 + (s >> 8); M[0x2577] = hi & 255; M[0x2B] = hi & 255;
      if (x === 0) { r.a = hi & 255; r.c = 1; r.z = 1; r.n = 0; return r; }
      for (;;) {
        toFF(0x2576);
        M[0x24DC] = (M[0x24DC] - 1) & 255;
        if (M[0x24DC] === 0) break;
        inc16(0x2576);
      }
      const o = add16(0x2A, 0x2576, 1);
      r.a = o.a; r.c = o.c; return nz(r, o.a);
    };

    // find_word ($259C): zp_2E/2F at word Y of the word list (word_list_lo/hi, $34/$35); X is kept
    P.find_word = function (r) {
      const y = r.y;
      M[0x24DC] = y;
      M[0x25B2] = M[0x34]; M[0x2E] = M[0x34]; M[0x25B3] = M[0x35]; M[0x2F] = M[0x35];
      if (y === 0) { r.a = M[0x35]; r.c = 1; r.z = 1; r.n = 0; return r; }
      for (;;) {
        toFF(0x25B2);
        M[0x24DC] = (M[0x24DC] - 1) & 255;
        if (M[0x24DC] === 0) break;
        inc16(0x25B2);
      }
      const o = add16(0x2E, 0x25B2, 1);
      r.a = o.a; r.c = o.c; return nz(r, o.a);
    };

    // build_round_question ($262E): the builder for round_type ($1DC0) through the `jmp` it writes at $263D:
    // round_builder_lo/hi ($25D8/$25DC), build_question ($3404) or build_clue_question ($2697)
    P.build_round_question = function* (r) {
      const x = M[0x1DC0];
      M[0x263E] = M[0x25D8 + x]; M[0x263F] = M[0x25DC + x];
      r.x = x; r.a = M[0x263F]; nz(r, r.a);
      const to = w16(0x263E);
      if (to === 0x3404) return yield* P.build_question(r);
      if (to === 0x2697) return P.build_clue_question(r);
      throw new Error('build_round_question: a builder at $' + to.toString(16));
    };

    // find_item_answers ($265B): from the pointer at $265E (on or before the $FF that ends an item's third clue),
    // the starts of the next four strings (the right answer, then three wrong) into clue_answer_lo/hi ($25E0/$25E4);
    // the word list ($34/$35) = $F200 + the offset at $F202 (high) / $F203 (low)
    P.find_item_answers = function (r) {
      for (let y = 0; y < 4; y++) {
        if (y) inc16(0x265E);
        toFF(0x265E);
        const s = M[0x265E] + 1; M[0x25E0 + y] = s & 255; M[0x25E4 + y] = (M[0x265F] + (s >> 8)) & 255;
      }
      const s = M[0xF203]; M[0x34] = s & 255;
      const hi = 0xF2 + M[0xF202] + (s >> 8); M[0x35] = hi & 255;
      r.y = 4; r.a = hi & 255; r.c = hi >> 8; return nz(r, r.a);
    };

    // build_clue_question ($2697): round types 1 (Name the Year, items from $F204) and 2 (Spot the Star, items from
    // $F200 + the offset at $F200/$F201): item question_number's clue clue_number ($2695) as the question, ending
    // ".", its right answer into slot answer_slots ($3506) and the three wrong ones into the others
    P.build_clue_question = function (r) {
      M[0x34E4] = 0x2E;
      r = P.shuffle_answers(r);
      if (M[0x1DC0] !== 1) {
        const s = M[0xF201]; M[0x26D1] = s & 255; M[0x26D2] = (M[0xF200] + 0xF2 + (s >> 8)) & 255;
      } else { M[0x26D1] = 4; M[0x26D2] = 0xF2; }
      M[0x2696] = 0; M[0x350A] = 0;
      if (M[0x28] !== 0) {
        // seven strings an item: three clues and four answers
        for (;;) {
          toFF(0x26D1);
          M[0x350A] = (M[0x350A] + 1) & 255;
          if (M[0x350A] === 7) {
            M[0x350A] = 0;
            M[0x2696] = (M[0x2696] + 1) & 255;
            if (M[0x28] === M[0x2696]) { inc16(0x26D1); break; }
          }
          inc16(0x26D1);
        }
      }
      for (const op of [0x265E, 0x272F, 0x343C, 0x2766]) { M[op] = M[0x26D1]; M[op + 1] = M[0x26D2]; }
      M[0x2696] = 0;
      if (M[0x2695] !== 0) {
        M[0x2696] = 1;
        for (;;) {
          toFF(0x272F);
          if (M[0x2696] === M[0x2695]) break;
          M[0x2696] = (M[0x2696] + 1) & 255;
          inc16(0x272F);
        }
        add16(0x2766, 0x272F, 1); M[0x343C] = M[0x2766]; M[0x343D] = M[0x2767];
      }
      // on to the $FF that ends the third clue
      for (;;) {
        toFF(0x2766);
        if (M[0x2696] === 2) break;
        M[0x2696] = (M[0x2696] + 1) & 255;
        inc16(0x2766);
      }
      M[0x265E] = M[0x2766]; M[0x265F] = M[0x2767];
      r = P.find_item_answers(r);
      r = P.build_question_text(r);
      for (let i = 0; i < 4; i++) {
        M[0x2A] = M[0x25E0 + i]; M[0x2B] = M[0x25E4 + i];
        r.x = M[0x3506 + i];
        r = P.write_answer(r);
      }
      return r;
    };

    // shuffle_answers ($2849): answer_slots ($3506-$3509) = 0-3, then 9 swaps of two random entries
    P.shuffle_answers = function (r) {
      for (let i = 0; i < 4; i++) M[0x3506 + i] = i;
      M[0x350A] = 9;
      let x, y, a;
      do {
        r = P.random(r); y = r.a & 3;
        r = P.random(r); x = r.a & 3;
        a = M[0x3506 + y]; M[0x3506 + y] = M[0x3506 + x]; M[0x3506 + x] = a;
        M[0x350A] = (M[0x350A] - 1) & 255;
      } while (M[0x350A] !== 0);
      r.a = a; r.x = x; r.y = y; return nz(r, 0);
    };

    // 15 swaps of two random entries 0-11 of the table at t (grid_setup, shuffle_number_order)
    const swap12 = (r, t) => {
      M[0x350A] = 0x0F;
      let x, y, a;
      do {
        do { r = P.random(r); y = r.a & 15; } while (y >= 12);
        do { r = P.random(r); x = r.a & 15; } while (x >= 12);
        a = M[t + y]; M[t + y] = M[t + x]; M[t + x] = a;
        M[0x350A] = (M[0x350A] - 1) & 255;
      } while (M[0x350A] !== 0);
      r.a = a; r.x = x; r.y = y; r.c = 0; return nz(r, 0);
    };
    // grid_setup ($287F): the Jukebox grid's twelve numbers get subjects 0-5 twice (number_subject $1D72), none
    // used ($1D66), then 15 random swaps of number_subject
    P.grid_setup = function (r) {
      for (let x = 5; x >= 0; x--) { M[0x1D72 + x] = x; M[0x1D78 + x] = x; M[0x1D66 + x] = 0; M[0x1D6C + x] = 0; }
      return swap12(r, 0x1D72);
    };
    // shuffle_number_order ($2C45): 15 random swaps of number_order ($0752)
    P.shuffle_number_order = function (r) { return swap12(r, 0x0752); };

    // pick_question ($2C72): a question of group A into question_number: random & group_mask ($1D93), redrawn
    // while not below group_size ($1D9D), + group_first ($1D7E); while the group's subject_left ($0F09) is not 0 it
    // counts down and the question is redrawn if asked_questions ($1DC1, a bit each) has it, else marked. X kept
    P.pick_question = function (r) {
      M[0x2CB0] = r.x;
      M[0x38A8] = r.a;
      let a, x, y;
      for (;;) {
        x = M[0x38A8];
        r = P.random(r);
        a = r.a & M[0x1D93 + x];
        if (a >= M[0x1D9D + x]) continue;
        a = (a + M[0x1D7E + x]) & 255;
        M[0x28] = a; y = a >> 3;
        if (M[0x0F09 + x] === 0) { a = 0; break; }
        M[0x0F09 + x] = (M[0x0F09 + x] - 1) & 255;
        const b = M[0x1DA7 + (M[0x28] & 7)];
        if (M[0x1DC1 + y] & b) continue;
        a = M[0x1DC1 + y] | b; M[0x1DC1 + y] = a;
        break;
      }
      r.a = a; r.y = y; r.c = (M[0x28] >> 2) & 1; r.x = M[0x2CB0]; return nz(r, r.x);
    };

    // build_question ($3404): stops the state interrupt, asks the frame interrupt to leave the processor port at
    // $24 (all RAM, irq_exit_port $06AB) and waits until it has; then the build (build_question_body)
    P.build_question = function* (r) {
      M[0x06AC] = 0; M[0x06AB] = 0x24;
      while ((H.rd(1) & 7) !== 4) yield;
      return P.build_question_body(r);
    };
    // build_question_body ($3416, inside build_question): question question_number from the block (find_question;
    // question 0 at $B80F) into $B500, ending "?"
    P.build_question_body = function (r) {
      M[0x34E4] = 0x3F;
      const x = M[0x28];
      if (x === 0) { M[0x343C] = 0x0F; M[0x343D] = 0xB8; }
      else { r.x = x; r = P.find_question(r); M[0x343C] = M[0x2E]; M[0x343D] = M[0x2F]; }
      return P.build_question_text(r);
    };

    // build_question_text ($3439): the text at the operand $343C/$343D into question_buffer ($B500): bytes below
    // $80 copied, $80 + n word n of the word list (find_word) with a space before it unless one is there and one
    // after, spaces put inside "(" and ")", the end byte ($FF) then a space unless one is there and the end mark
    // (the operand at $34E4, "?" or "."), the first letter a capital, 18 spaces and $7F
    P.build_question_text = function (r) {
      let x = 0, a;
      const B = 0xB500;
      for (;;) {
        a = H.rd(w16(0x343C));
        if (a >= 0x80 && a !== 0xFF) {
          r.y = a & 0x7F; r = P.find_word(r);
          M[0x3468] = M[0x2E]; M[0x3469] = M[0x2F];
          if (x !== 0 && M[B - 1 + x] !== 0x20) { M[B + x] = 0x20; x = (x + 1) & 255; }
          let y = 0;
          const w = w16(0x3468);
          for (;;) {
            a = H.rd((w + y) & 0xFFFF);
            if (a & 0x80) break;
            y = (y + 1) & 255;
            M[B + x] = a;
            if (M[B - 1 + x] === 0x28 && M[B + x] !== 0x20) { M[B + x] = 0x20; y = (y - 1) & 255; }
            x = (x + 1) & 255;
          }
          a = 0x20;
        }
        M[B + x] = a; x = (x + 1) & 255;
        if (a === 0xFF) break;
        if (a === 0x29 && M[B - 2 + x] !== 0x20) { M[B - 1 + x] = 0x20; M[B + x] = 0x29; x = (x + 1) & 255; }
        if (M[B - 2 + x] === 0x28 && M[B - 1 + x] !== 0x20) { M[B + x] = M[B - 1 + x]; M[B - 1 + x] = 0x20; x = (x + 1) & 255; }
        add16(0x343C, 0x343C, 1);
      }
      if (M[B - 2 + x] !== 0x20) { M[B - 1 + x] = 0x20; x = (x + 1) & 255; }
      M[B - 1 + x] = M[0x34E4];
      r.c = M[B] >= 0x61 ? 1 : 0;
      if (r.c) M[B] = (M[B] - 0x20) & 255;
      for (let y = 0; y < 0x12; y++) { M[B + x] = 0x20; x = (x + 1) & 255; }
      M[B + x] = 0x7F;
      r.a = 0x7F; r.x = x; r.y = 0; r.z = 0; r.n = 0;
      return r;
    };

    // spot_the_star_pick ($3923): Spot the Star: round type 2, a random star 0-7 not yet used (items_used_2
    // $1DAF) into question_number, 2 tries, 3 points each, step_done cleared; then the game jumps to ask_question
    P.spot_the_star_pick = function (r) {
      M[0x07A3] = 0; M[0x1DC0] = 2;
      let x;
      for (;;) { r = P.random(r); x = r.a & 7; if (!(M[0x1DA7 + x] & M[0x1DAF])) break; }
      M[0x1DAF] |= M[0x1DA7 + x];
      M[0x28] = x; M[0x1DBF] = 2; M[0x30F4] = 3; M[0x3102] = 3; M[0xFF] = 0;
      r.a = 0; r.x = x; return nz(r, 0);
    };
    P.stages[0x3923] = function* () { P.spot_the_star_pick({ a: 0, x: 0, y: 0, c: 0, z: 0, n: 0, v: 0 }); return 0x2D33; };

    // pick_quickfire_question ($3ABC): a random subject 0-5 into the text's subject argument ($B325), then
    // pick_question for it
    P.pick_quickfire_question = function (r) {
      let a;
      do { r = P.random(r); a = r.a & 7; } while (a >= 6);
      M[0xB325] = a; r.a = a;
      return P.pick_question(r);
    };

    // build_answers ($3AEA): round types 0 and 3 only: the four answers (build_answers_body), then asks the frame
    // interrupt to leave the processor port at $25 (irq_exit_port), waits until it has, and turns the state
    // interrupt back on
    P.build_answers = function* (r) {
      const t = M[0x1DC0];
      if (t !== 0 && t !== 3) { r.a = t; r.c = t >= 3 ? 1 : 0; return nz(r, (t - 3) & 255); }
      r = P.build_answers_body(r);
      M[0x06AB] = 0x25;
      while ((H.rd(1) & 7) !== 5) yield;
      M[0x06AC] = 0xFF;
      r.a = 0xFF; r.c = 1; return nz(r, 0xFF);     // c from the wait's cmp #$05
    };
    // build_answers_body ($3AF6-$3C01, inside build_answers): shuffles the slots; the right answer (the string after
    // the question's $FF) into slot answer_slots ($3506); after its $FF the flags byte (wrong_answer_flags $350B)
    // and three question numbers: wrong answer i is that question's answer, or with flag bit i string n of the spare
    // list (find_spare_answer), into slots $3507-$3509
    P.build_answers_body = function (r) {
      r = P.shuffle_answers(r);
      add16(0x2A, 0x343C, 1);
      r.x = M[0x3506]; r = P.write_answer(r);
      add16(0x2A, 0x3C77, 1);
      M[0x350B] = H.rd(w16(0x2A));
      add16(0x2A, 0x3C77, 2);
      for (let i = 0; i < 3; i++) {
        if (i) { M[0x2A] = M[0x2C]; M[0x2B] = M[0x2D]; }
        r.y = 0; r.x = H.rd(w16(0x2A));
        if (M[0x350B] & (1 << i)) r = P.find_spare_answer(r);
        else {
          r = P.find_question(r);
          M[0x3C16] = M[0x2E]; M[0x3C17] = M[0x2F];
          if (i < 2) add16(0x2C, 0x2A, 1);
          r = P.skip_to_ff(r);
          add16(0x2A, 0x3C16, 1);
        }
        r.x = M[0x3507 + i]; r = P.write_answer(r);
      }
      return r;
    };

    // skip_to_ff ($3C15): the pointer at $3C16/$3C17 (its own operand) on to the next $FF
    P.skip_to_ff = function (r) {
      toFF(0x3C16);
      r.a = 0xFF; r.c = 1; r.z = 1; r.n = 0; return r;
    };

    // write_answer ($3C3A): the answer string at zp_ptr_2A into answer buffer X (answer_buffer_lo/hi $3C31/$3C35),
    // through seven operands the routine writes: bytes below $80 copied, $80 + n word n of the word list with a
    // space before it unless one is there and one after, $FF copied as the end; the first letter made a capital.
    // The source pointer ($3C77/$3C78) is left on the $FF
    P.write_answer = function (r) {
      const lo = M[0x3C31 + r.x], hi = M[0x3C35 + r.x];
      for (const op of [0x3CB9, 0x3CC1, 0x3CD9, 0x3C8B, 0x3C95, 0x3CDC, 0x3CE6]) { M[op] = lo; M[op + 1] = hi; }
      M[0x3C77] = M[0x2A]; M[0x3C78] = M[0x2B];
      let x = 0, a;
      const at = (op, i) => (w16(op) + i) & 0xFFFF;
      for (;;) {
        a = H.rd(w16(0x3C77));
        if (a === 0xFF) break;
        if (a & 0x80) {
          r.y = a & 0x7F;
          M[0x3C39] = x;
          if (x !== 0 && H.rd(at(0x3C8B, x - 1)) !== 0x20) { H.wr(at(0x3C95, x), 0x20); M[0x3C39] = (M[0x3C39] + 1) & 255; }
          x = M[0x3C39];
          r = P.find_word(r);
          M[0x3CAD] = M[0x2E]; M[0x3CAE] = M[0x2F];
          let y = 0;
          for (;;) {
            a = H.rd((w16(0x3CAD) + y) & 0xFFFF);
            if (a === 0xFF) break;
            H.wr(at(0x3CB9, x), a); y = (y + 1) & 255; x = (x + 1) & 255;
          }
          r.y = y;
          a = 0x20;
        }
        H.wr(at(0x3CC1, x), a); x = (x + 1) & 255;
        add16(0x3C77, 0x3C77, 1);
      }
      H.wr(at(0x3CD9, x), 0xFF);
      a = H.rd(w16(0x3CDC));
      r.c = a >= 0x61 ? 1 : 0;
      if (r.c) { a = (a - 0x20) & 255; H.wr(w16(0x3CE6), a); }
      r.a = a; r.x = x; nz(r, r.c ? a : (a - 0x61) & 255);
      return r;
    };
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
