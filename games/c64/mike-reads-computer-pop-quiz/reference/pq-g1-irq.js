/* pq-g1-irq */
// Mike Read's Computer Pop Quiz, the Play tab's port: group 1, the raster interrupt chain, the display states'
// per-frame routines, the input and the computer player's moves, all in the title part. One function per listing
// label, on the game's memory (pq-core.js says how).
//
// The chain: sprites_row0 ($0C47) -> irq_sprite_row1 ($0403) -> irq_sprite_row2 ($047D) -> irq_bottom ($0BE7,
// line $D4) -> irq_frame ($0646, line $FA) -> irq_state ($07A4, when second_irq_on $06AC is set) -> the display
// state's routine, which ends at sprites_row0 or irq_to_bottom ($0BC5). Each handler writes the next one's address
// into $FFFE/$FFFF and its line into $D012. The handlers' busy waits for a raster line (row1_wait_line,
// row2_wait_line) read the chip and write nothing, so the port leaves them out; the stack pushes and pulls are not
// kept either (pq-core.js). irq_state jumps through its self-modified `jmp` at $0805 (state_jump); the port
// dispatches by that address through P.byAddr, where each group registers its state routines (the menu's, states 0,
// 1, 2 and 14 at $E99A, $EA16, $CD20 and $E54B, are group 5's).
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M;
    P.byAddr = P.byAddr || {};
    const nz = (r, v) => { r.z = (v & 255) === 0 ? 1 : 0; r.n = (v >> 7) & 1; return r; };
    const vic = (reg, v) => H.wr(0xD000 + reg, v);
    const vicRd = (reg) => H.rd(0xD000 + reg);
    const vector = (lo, hi, line) => { M[0xFFFE] = lo; M[0xFFFF] = hi; vic(0x12, line); };
    // the eight sprites of a panel row at line y: 0-2 at y, 3-6 at y + 1, 7 at y + 2 (as `stx $D001` ... `inx`)
    const rowY = (y, ptr0) => {
      for (let i = 0; i < 8; i++) {
        vic(1 + 2 * i, (y + (i >= 3 ? 1 : 0) + (i >= 7 ? 1 : 0)) & 255);
        M[0x5FF8 + i] = ptr0 + i;
      }
    };
    // the screen on (bitmap, multicolour) or blanked, as screen_on ($FE) says
    const screen = () => {
      if (M[0xFE]) { vic(0x11, 0x3B); vic(0x16, 0xD8); } else { vic(0x11, 0x40); vic(0x16, 0x10); }
    };

    // irq_save_a/x/y ($02-$04): where three handlers keep the interrupted program's A, X (and Y) while they run.
    // The port has those registers only when its caller gives them (r, as the routine tests do); called with none
    // (the lockstep's f.call(P), the page), it leaves the three bytes as they are.
    const save = (r, n) => {
      if (!r) return;
      M[0x02] = r.a & 255; M[0x03] = r.x & 255;
      if (n > 2) M[0x04] = r.y & 255;
    };

    // --- the raster chain -------------------------------------------------------------------------------------
    // irq_sprite_row1 ($0403): the panel's second row at row1_y ($041C), shapes $18-$1F; next irq_sprite_row2 at
    // irq_row2_line ($0474)
    P.irqs[0x0403] = P.irq_sprite_row1 = function (r) {
      save(r, 2);
      const y = M[0x041C];
      for (let i = 0; i < 8; i++) {
        vic(1 + 2 * i, (y + (i >= 3 ? 1 : 0) + (i >= 7 ? 1 : 0)) & 255);
        M[0x5FF8 + i] = 0x18 + i;
      }
      vic(0x19, 1);
      vector(0x7D, 0x04, M[0x0474]);
      return r;
    };
    // irq_sprite_row2 ($047D): the third row at row2_y ($0499), shapes $20-$27; next irq_bottom at line $D4
    P.irqs[0x047D] = P.irq_sprite_row2 = function (r) {
      save(r, 2);
      rowY(M[0x0499], 0x20);
      vic(0x19, 1);
      vector(0xE7, 0x0B, 0xD4);
      return r;
    };
    // irq_bottom ($0BE7): no doubling, all sprites on, the score sprites when state_bottom_sprites ($06BC) says,
    // every sprite in sprite_colour ($0C1E); next irq_frame at line $FA
    P.irqs[0x0BE7] = P.irq_bottom = function (r) {
      vic(0x1D, 0); vic(0x17, 0); vic(0x15, 0xFF);
      if (M[0x06BC + M[0x22]]) {
        vic(0x10, 0x0C);
        for (let x = 15; x >= 0; x--) vic(x, M[0x0CE0 + x]);
        for (let x = 7; x >= 0; x--) M[0x5FF8 + x] = M[0x0D08 + x];
      }
      for (let x = 7; x >= 0; x--) vic(0x27 + x, M[0x0C1E]);
      M[0xFFFE] = 0x46; M[0xFFFF] = 0x06; vic(0x12, 0xFA);
      vic(0x11, vicRd(0x11) & 0x7F);
      vic(0x19, 1);
      return r;
    };
    // sprites_row0 ($0C47): the panel's first row at row0_y ($0C4D), X from panel_x ($0CF0, or $0CF8 but in
    // display state 0) through the operand it writes at $0C85/$0C86, shapes from panel_shapes ($0D10); next
    // irq_sprite_row1 at irq_row1_line ($0CAE). The display states' routines end here (and leave the interrupt).
    P.irqs[0x0C47] = P.sprites_row0 = function (r) {
      vic(0x10, 0x80);
      const y = M[0x0C4D];
      for (let i = 0; i < 8; i++) vic(1 + 2 * i, (y + (i >= 3 ? 1 : 0) + (i >= 7 ? 1 : 0)) & 255);
      M[0x0C85] = 0xF8; M[0x0C86] = 0x0C;
      if (M[0x22] === 0) { M[0x0C85] = 0xF0; M[0x0C86] = 0x0C; }
      const px = M[0x0C85] | M[0x0C86] << 8;
      for (let x = 0; x < 8; x++) vic(2 * x, M[px + x]);
      for (let x = 0; x < 8; x++) M[0x5FF8 + x] = M[0x0D10 + x];
      vic(0x19, 1);
      vector(0x03, 0x04, M[0x0CAE]);
      return r;
    };
    // irq_to_bottom ($0BC5): a display state's routine ends without the panel: next irq_bottom at line $D4
    P.irqs[0x0BC5] = P.irq_to_bottom = function (r) {
      vic(0x19, 1);
      vector(0xE7, 0x0B, 0xD4);
      vic(0x11, vicRd(0x11) & 0x7F);
      return r;
    };
    // irq_frame ($0646): I/O in ($01 = $25), the screen as screen_on ($FE) says (copied to irq_sync $055C), the
    // state interrupt next when second_irq_on ($06AC), the music ($4C03) or the sound effects ($4F00) once a block
    // is loaded (effects_loaded $33FE), and $01 left at irq_exit_port ($06AB)
    P.irqs[0x0646] = P.irq_frame = function (r) {
      save(r, 3);
      H.setPort(0x25);
      vic(0x19, 1);
      M[0x055C] = M[0xFE];
      screen();
      if (M[0x06AC]) {
        vic(0x11, vicRd(0x11) | 0x80);
        M[0xFFFE] = 0xA4; M[0xFFFF] = 0x07;
        vic(0x12, M[0x06AD + M[0x22]]);
      }
      if (M[0x33FE]) H.driver(0x4F00); else H.driver(0x4C03);
      H.setPort(M[0x06AB]);
      return r;
    };
    // irq_state ($07A4): the screen again, the sprites on as sprite_enable_value ($07C4), the panel's lines for
    // the display state from state_row_records ($0772 + state_row_record[state]) into the chain's operands, then
    // the state's routine through state_jump ($0805)
    P.irqs[0x07A4] = P.irq_state = function (r) {
      r = r || { a: 0, x: 0, y: 0, c: 0, z: 0, n: 0, v: 0 };
      screen();
      vic(0x15, M[0x07C4]);
      const y = M[0x078D + M[0x22]];
      M[0x0C4D] = M[0x0772 + y];
      M[0x0CAE] = M[0x0775 + y];
      M[0x0408] = M[0x0776 + y];
      M[0x041C] = M[0x0777 + y];
      M[0x0474] = M[0x0778 + y];
      M[0x0482] = M[0x0779 + y];
      M[0x0499] = M[0x077A + y];
      const ds = M[0x22];
      M[0x0806] = M[0x06CB + ds];
      M[0x0807] = M[0x06DA + ds];
      r.x = ds; r.y = y;
      return P.state_jump(r);
    };
    // state_jump ($0805): `jmp` to the address irq_state wrote into its operand ($0806/$0807)
    P.state_jump = function (r) {
      const at = M[0x0806] | M[0x0807] << 8;
      const f = P.byAddr[at];
      if (!f) throw new Error('state_jump: no routine at $' + at.toString(16).toUpperCase());
      return f(r);
    };

    // --- the display states' routines -------------------------------------------------------------------------
    // state3_flash ($06E9), display state 3: every fifth frame, unless flash_hold ($0AF1) is counting, the next
    // colour of flash_colours ($0AD5) into sprite_colour ($0C1E), with its mark and hold
    P.state3_flash = function (r) {
      M[0x0AD4] = (M[0x0AD4] + 1) & 255;
      if (M[0x0AD4] === 5) {
        M[0x0AD4] = 0;
        if (M[0x0AF1]) M[0x0AF1] = (M[0x0AF1] - 1) & 255;
        else {
          let x = (M[0x0AD3] + 1) & 255, a = M[0x0AD5 + x];
          if (a & 0x80) { a = M[0x0AD5]; x = 0; }
          M[0x0AD3] = x; M[0x0C1E] = a;
          M[0x0AF2] = M[0x0AE8 + x];
          M[0x0AF1] = M[0x0ADF + x];
        }
      }
      return P.sprites_row0(r);
    };
    const fill = (r, target, value, x, y, a) => {
      M[0x1863] = target; M[0x188E] = value;
      r.x = x; r.y = y; r.a = a;
      return P.fill_colour_block(r);
    };
    // two_choice_highlight ($0726): the two choices of Easy or Hard in choice_colour ($0AF4, $0AF5)
    P.two_choice_highlight = function (r) {
      r = fill(r, 0xD8, M[0x0AF4], 0x5C, 0x13, 0x11);
      r = fill(r, 0xD8, M[0x0AF5], 0x5C, 0x33, 0x11);
      return P.exit_to_sprites(r);
    };
    // exit_to_sprites ($0AD0): `jmp sprites_row0`
    P.exit_to_sprites = function (r) { return P.sprites_row0(r); };
    // the four answer bars in choice_colour ($0AF4-$0AF7), alternately in colour RAM and the screen colours
    const fourBars = (r) => {
      r = fill(r, 0xD8, M[0x0AF4], 0x46, 0x13, 0x17);
      r = fill(r, 0x5C, M[0x0AF5], 0x46, 0x23, 0x17);
      r = fill(r, 0xD8, M[0x0AF6], 0x46, 0x33, 0x17);
      r = fill(r, 0x5C, M[0x0AF7], 0x46, 0x43, 0x17);
      return r;
    };
    // block_choice_frame ($0808), display state 9: the question-block menu. A new fire press sets step_done and
    // the choice; every fourth frame up or down moves answer_cursor ($0CB8, 0-4); the five bars drawn
    P.block_choice_frame = function (r) {
      r = P.read_input(r);
      if (!(r.a & 0x10)) {
        if (!M[0xFB]) { M[0xFF] = 0xFF; M[0x075F] = M[0x0CB8]; }
      } else M[0xFB] = 0;
      M[0x0E] = (M[0x0E] + 1) & 255;
      if (!(M[0x0E] & 3) && !M[0xFF]) {
        r = P.read_input(r);
        M[0x05D8] = r.a;
        if (!(r.a & 2)) { if (M[0x0CB8] !== 4) M[0x0CB8] = (M[0x0CB8] + 1) & 255; }
        else if (!(M[0x05D8] & 1)) { if (M[0x0CB8]) M[0x0CB8] = (M[0x0CB8] - 1) & 255; }
      }
      for (let i = 0; i < 5; i++) M[0x0AF4 + i] = 0;
      M[0x0AF4 + M[0x0CB8]] = 0x0E;
      r = fill(r, 0xD8, M[0x0AF4], 0x5C, 0x14, 0x11);
      r = fill(r, 0x5C, M[0x0AF5], 0x5C, 0x1E, 0x11);
      r = fill(r, 0xD8, M[0x0AF6], 0x5C, 0x28, 0x11);
      r = fill(r, 0x5C, M[0x0AF7], 0x5C, 0x32, 0x11);
      r = fill(r, 0xD8, M[0x0AF8], 0x5C, 0x3C, 0x11);
      return P.sprites_row0(r);
    };

    // answer_cursor_frame ($0986), display states 7 and 11: every fourth frame the team whose turn it is moves its
    // cursor (the computer through cpu_answer_frame); then fire, the colours and the bars
    P.answer_cursor_frame = function (r) {
      M[0x09CC] = 3;
      if (M[0x22] === 0x0B) M[0x09CC] = 1;
      M[0x0E] = (M[0x0E] + 1) & 255;
      if (M[0x0E] & 3) return P.answer_check_fire(r);
      if (M[0x07A3]) M[0xF9] = 1;
      return answerTurn(r);
    };
    // $09A7: the computer's turn (team 1, one player) or the stick's
    const answerTurn = (r) => (M[0xF9] && !M[0xFA]) ? P.cpu_answer_frame(r) : P.answer_read_stick(r);
    // answer_read_stick ($09BC)
    P.answer_read_stick = function (r) { return P.answer_move(P.read_input(r)); };
    // answer_move ($09BF): the stick in A into stick ($05D8); down unless at answer_last ($09CC), up unless at 0
    P.answer_move = function (r) {
      M[0x05D8] = r.a;
      const x = M[0xF9];
      r.x = x;
      if (!(r.a & 2)) {
        if (M[0x0CB8 + x] !== M[0x09CC]) M[0x0CB8 + x] = (M[0x0CB8 + x] + 1) & 255;
      } else if (!(M[0x05D8] & 1)) {
        if (M[0x0CB8 + x]) M[0x0CB8 + x] = (M[0x0CB8 + x] - 1) & 255;
      }
      return P.answer_check_fire(r);
    };
    // answer_check_fire ($09E4): no fire test once step_done is set
    P.answer_check_fire = function (r) { return M[0xFF] ? P.exit_to_sprites(r) : P.answer_fire(r); };
    // answer_fire ($09EB): a new fire press chooses: effect 6 once the effects are loaded, choice ($075F + team),
    // step_done and fire_held set, the chosen bar's colour 0
    P.answer_fire = function (r) {
      if (M[0x05D8] & 0x10) return P.answer_fire_released(r);
      if (M[0xFB]) return P.answer_recolour(r);
      if (M[0x33FE]) H.driver(0x4FCB, { x: 6, y: 0 });
      const y = M[0xF9], a = M[0x0CB8 + y];
      M[0x075F + y] = a;
      M[0xFF] = 0xFF; M[0xFB] = 0xFF;
      M[0x0AF4 + a] = 0;
      r.a = 0; r.x = a; r.y = y;
      return P.answer_next_team(r);
    };
    // answer_fire_released ($0A18)
    P.answer_fire_released = function (r) { M[0xFB] = 0; return P.answer_recolour(r); };
    // answer_recolour ($0A1C): the four colours 0, then the cursors': in the Quickfire Round (round_type $1DC0 = 3)
    // both teams' (4 where they meet, else 2 and 6), else the team's own
    P.answer_recolour = function (r) {
      M[0x0AF4] = 0; M[0x0AF5] = 0; M[0x0AF6] = 0; M[0x0AF7] = 0;
      if (M[0x1DC0] !== 3) return P.answer_recolour_one(r);
      if (M[0x0CB8] === M[0x0CB9]) M[0x0AF4 + M[0x0CB8]] = 4;
      else { M[0x0AF4 + M[0x0CB8]] = 2; M[0x0AF4 + M[0x0CB9]] = 6; }
      return P.answer_next_team(r);
    };
    // answer_recolour_one ($0A5A): the team's cursor in team_colour ($0CBE)
    P.answer_recolour_one = function (r) {
      const y = M[0xF9];
      M[0x0AF4 + M[0x0CB8 + y]] = M[0x0CBE + y];
      return P.answer_next_team(r);
    };
    // answer_next_team ($0A65): with both teams answering, team 0 after team 1 in the same frame
    P.answer_next_team = function (r) {
      if (!M[0xFF] && M[0x07A3] && M[0xF9]) { M[0xF9] = (M[0xF9] - 1) & 255; return answerTurn(r); }
      return P.answer_bars_draw(r);
    };
    // answer_bars_draw ($0A77): Easy or Hard (state 11) to two_choice_highlight, else the four bars
    P.answer_bars_draw = function (r) {
      if (M[0x22] === 0x0B) return P.two_choice_highlight(r);
      return P.exit_to_sprites(fourBars(r));
    };

    // the computer's answer: cpu_answer_frame ($08E6), every fourth frame on its turn
    P.cpu_answer_frame = function (r) { return M[0x2B84] ? P.cpu_answer_steer(r) : P.cpu_answer_wander(r); };
    // cpu_answer_steer ($08EB): fire on cpu_target ($0983), else up or down toward it
    P.cpu_answer_steer = function (r) {
      if (M[0x0CB9] === M[0x0983]) return P.cpu_answer_fire(r);
      M[0x2B8C] = 0;
      if (M[0x0CB9] < M[0x0983]) M[0x2B8C] = 1;
      M[0x0984] = M[0x2B87 + M[0x2B8C]];
      return P.cpu_answer_send(r);
    };
    // cpu_answer_fire ($08D6)
    P.cpu_answer_fire = function (r) { M[0x0984] = 0x10; return P.cpu_answer_send(r); };
    // cpu_answer_send ($08DB): cpu_stick ($0984) inverted, as a stick, into answer_move
    P.cpu_answer_send = function (r) { r.a = M[0x0984] ^ 0xFF; return P.answer_move(r); };
    // cpu_answer_wander ($0912): cpu_wait ($0B15) down; when it runs out, the next of cpu_moves ($0B17) random
    // moves (a wait of 1-2, up or down), or the decision when none is left
    P.cpu_answer_wander = function (r) {
      M[0x0B15] = (M[0x0B15] - 1) & 255;
      if (!(M[0x0B15] & 0x80)) return P.cpu_answer_send(r);
      M[0x0B17] = (M[0x0B17] - 1) & 255;
      if (M[0x0B17] & 0x80) return P.cpu_answer_decide(r);
      r = P.random(r);
      M[0x0B15] = (r.a & 1) + 1;
      r = P.random(r);
      M[0x0984] = M[0x0B11 + (r.a & 1)];
      return P.cpu_answer_send(r);
    };
    // cpu_answer_decide ($0936): Easy or Hard (state 11): Hard when team 0's score ($38A6) is ahead of the
    // computer's ($38A7), else at random; an answer: the right one (answer_slots $3506) with 192 in 256 when team 0
    // is ahead, else (and otherwise) a random one other than team0_choice ($2B91)
    P.cpu_answer_decide = function (r) {
      const s0 = M[0x38A6], s1 = M[0x38A7];
      if (M[0x22] === 0x0B) {
        if (s0 > s1) { M[0x0983] = 1; M[0x2B84] = (M[0x2B84] + 1) & 255; return P.cpu_answer_steer(r); }
        r = P.random(r);
        r.a &= 1;
        return P.cpu_answer_set(r);
      }
      if (s0 > s1) {
        r = P.random(r);
        if (r.a < 0xC0) { r.a = M[0x3506]; return P.cpu_answer_set(r); }
      }
      do { r = P.random(r); r.a &= 3; } while (r.a === M[0x2B91]);
      return P.cpu_answer_set(r);
    };
    // cpu_answer_set ($095D)
    P.cpu_answer_set = function (r) {
      M[0x0983] = r.a; M[0x2B84] = (M[0x2B84] + 1) & 255;
      return P.cpu_answer_steer(r);
    };

    // answer_flash_frame ($3CFC), display state 10: the team's chosen answer flashes through its colour list
    // (team_flash_colours $3CEE + team_flash_start $3CEC), a step every third frame
    P.answer_flash_frame = function (r) {
      let y = M[0xF9];
      const s = M[0x3CEC + y] + 0xEE;
      M[0x3D32] = s & 255; M[0x3D33] = (0x3C + (s >> 8)) & 255;
      M[0x0AF4] = 0; M[0x0AF5] = 0; M[0x0AF6] = 0; M[0x0AF7] = 0;
      M[0x3CE9] = (M[0x3CE9] + 1) & 255;
      if (M[0x3CE9] === 3) { M[0x3CE9] = 0; M[0x3CEA] = (M[0x3CEA] + 1) & 255; }
      let a;
      for (;;) {
        y = M[0x3CEA];
        a = M[((M[0x3D32] | M[0x3D33] << 8) + y) & 0xFFFF];
        if (a !== 0xFF) break;
        M[0x3CEA] = 0;
      }
      y = M[0xF9];
      M[0x0AF4 + M[0x0CB8 + y]] = a;
      if (M[0x0985]) return P.two_choice_highlight(r);
      return P.sprites_row0(fourBars(r));
    };

    // state4_bubble_frame ($0B87), display states 4 and 6: the speech bubble's eight sprites at bubble_xy ($0CC0,
    // the upper or lower row as bubble_position $05E2), shapes 0-7, in bubble_colour ($0BB5); three pixels of text
    P.state4_bubble_frame = function (r) {
      vic(0x10, 0); vic(0x1D, 0);
      vic(0x17, M[0x0B90]);
      let y = M[0x0B19 + M[0x05E2]];
      for (let x = 15; x >= 0; x--) { vic(x, M[0x0CC0 + y]); y = (y - 1) & 255; }
      for (let x = 7; x >= 0; x--) M[0x5FF8 + x] = M[0x0D00 + x];
      for (let x = 7; x >= 0; x--) vic(0x27 + x, M[0x0BB5]);
      r.a = M[0x0BB5]; r.x = 0xFF; r.y = y; r.n = 1; r.z = 0;
      r = P.bubble_step(r);
      r = P.bubble_step(r);
      r = P.bubble_step(r);
      return P.irq_to_bottom(r);
    };
    // bubble_scroll ($0506): the bubble's 21 pixel lines one pixel left: for each line the next bit of its glyph
    // byte (glyph_or_bytes $1B7B ...) rolled in at the right of shape 7 and through the eight shapes
    const ROLS = [0x41C2, 0x41C1, 0x41C0, 0x4182, 0x4181, 0x4180, 0x4142, 0x4141, 0x4140, 0x4102, 0x4101, 0x4100,
      0x40C2, 0x40C1, 0x40C0, 0x4082, 0x4081, 0x4080, 0x4042, 0x4041, 0x4040, 0x4002];
    P.bubble_scroll = function (r) {
      let a = 0, x = 0, c = 0;
      for (let y = 0xEB; y < 0x100; y++) {
        x = M[0x3596 + y];
        a = M[0x1A90 + y];
        c = a >> 7; a = (a << 1) & 255; M[0x1A90 + y] = a;
        for (const b of ROLS) {
          const at = (b + x) & 0xFFFF, v = M[at];
          M[at] = ((v << 1) | c) & 255; c = v >> 7;
        }
      }
      r.a = a; r.x = x; r.y = 0; r.c = c; r.z = 1; r.n = 0;
      return r;
    };

    // --- the number grid --------------------------------------------------------------------------------------
    // state5_grid_frame ($0B5F), display state 5: the cursor, as sprite 0 doubled, in shape $0C at grid_cursor_x/y
    // ($19/$1A), its colour cycled; fire
    P.state5_grid_frame = function (r) {
      r = P.grid_cursor_frame(r);
      vic(0x1D, 1); vic(0x17, 1);
      vic(0x01, M[0x1A]); vic(0x00, M[0x19]);
      M[0x5FF8] = 0x0C;
      r = P.grid_cursor_animate(r);
      r = P.grid_check_fire(r);
      vic(0x27, M[0x0B80]);
      r.a = M[0x0B80];
      return P.irq_to_bottom(r);
    };
    // grid_cursor_frame ($05EC): a glide under way goes on; else the computer's move or the stick
    P.grid_cursor_frame = function (r) {
      if (M[0x1D]) return P.grid_cursor_glide(r);
      if (M[0xF9] && M[0xFA] !== 1) return P.cpu_grid_move(r);
      r = P.read_input(r);
      return P.grid_stick_dir(r);
    };
    // grid_cursor_glide ($057A): grid_glide_jump's operand from grid_glide_lo/hi ($05D9/$05DD) by grid_direction
    P.grid_cursor_glide = function (r) {
      const x = M[0x1E];
      M[0x0589] = M[0x05D9 + x]; M[0x058A] = M[0x05DD + x];
      r.x = x;
      return P.grid_glide_jump(r);
    };
    // grid_glide_jump ($0588): `jmp` to one of the four glide steps
    P.grid_glide_jump = function (r) {
      const at = M[0x0589] | M[0x058A] << 8;
      const f = P.byAddr[at];
      if (!f) throw new Error('grid_glide_jump: no routine at $' + at.toString(16).toUpperCase());
      return f(r);
    };
    // the glide steps: 2 pixels a frame while grid_glide_steps ($1F) last, then the cell
    const glide = (pos, d, cell) => function (r) {
      if (!M[0x1F]) { M[cell] = (M[cell] + d) & 255; return P.grid_glide_end(r); }
      M[pos] = (M[pos] + 2 * d) & 255;
      M[0x1F] = (M[0x1F] - 1) & 255;
      r.a = M[0x1F] + 1;
      return r;
    };
    P.grid_glide_up = glide(0x1A, -1, 0x1C);
    P.grid_glide_down = glide(0x1A, 1, 0x1C);
    P.grid_glide_left = glide(0x19, -1, 0x1B);
    P.grid_glide_right = glide(0x19, 1, 0x1B);
    // grid_glide_end ($05D3)
    P.grid_glide_end = function (r) { M[0x1D] = 0; r.a = 0; r.z = 1; r.n = 0; return r; };
    // grid_glide_start ($05E3): 16 steps in grid_direction
    P.grid_glide_start = function (r) { M[0x1F] = 0x10; M[0x1D] = 0xFF; r.a = 0xFF; r.z = 0; r.n = 1; return r; };
    // grid_stick_dir ($0600): up (bit 0 of A), down, left, right (bits 1-3 of stick) starts a glide unless at the
    // grid's edge (rows 0-2, columns 0-3)
    P.grid_stick_dir = function (r) {
      // A as the routine leaves it: the row or column it tested, or the stick's bit 3
      const s = M[0x05D8];
      let d;
      if (!(r.a & 1)) { r.a = M[0x1C]; if (!r.a) return nz(r, 0); d = 0; }
      else if (!(s & 2)) { r.a = M[0x1C]; if (r.a === 2) return nz(r, 0); d = 1; }
      else if (!(s & 4)) { r.a = M[0x1B]; if (!r.a) return nz(r, 0); d = 2; }
      else if (!(s & 8)) { r.a = M[0x1B]; if (r.a === 3) return nz(r, 0); d = 3; }
      else { r.a = 8; return nz(r, 8); }
      M[0x1E] = d;
      return P.grid_glide_start(r);
    };
    // grid_cursor_animate ($180B): every fourth frame (cursor_anim_timer $21) the next colour of the team's list
    // into grid_cursor_colour ($0B80), through the operands it writes at $182F/$1830 and $1836/$1837
    P.grid_cursor_animate = function (r) {
      const s = M[0x3CEC + M[0xF9]] + 0xEE;
      M[0x182F] = M[0x1836] = s & 255;
      M[0x1830] = M[0x1837] = (0x3C + (s >> 8)) & 255;
      M[0x21] = (M[0x21] + 1) & 255;
      if (M[0x21] & 3) return r;
      let x = (M[0x20] + 1) & 255, a = M[((M[0x182F] | M[0x1830] << 8) + x) & 0xFFFF];
      if (a & 0x80) { x = 0xFF; a = M[M[0x1836] | M[0x1837] << 8]; }
      M[0x0B80] = a; M[0x20] = x;
      return r;
    };
    // grid_check_fire ($0D2A): a new fire press (grid_fire_latch $18) on a number not yet played (number_used
    // $1D66) plays it: a question of its subject (pick_question), its face coloured and highlighted, step_done,
    // display state 5 again, effect 5
    P.grid_check_fire = function (r) {
      if (M[0x05D8] & 0x10) { M[0x18] = 0; r.a = 0; return r; }
      if (M[0x18]) return r;
      M[0x18] = 0xFF;
      const x = (((M[0x1C] << 2) & 255) + M[0x1B]) & 255;
      if (M[0x1D66 + x]) return r;
      M[0x1D66 + x] = 0xFF;
      M[0xB325] = M[0x1D72 + x];
      r.a = M[0x1D72 + x]; r.x = x;
      r = P.pick_question(r);
      M[0x15] = M[0x16BF + r.x];
      M[0x16] = M[0x16CB + r.x];
      r.a = M[0x1D72 + r.x];
      r = P.colour_face_block(r);
      M[0x14A2] = 1; M[0x12] = r.x; M[0x14DE] = 0xCF;
      r.a = 1; r.y = 0xCF;
      r = P.highlight_cell(r);
      M[0xFF] = 0xFF;
      M[0x22] = 5;
      H.driver(0x4FCB, { x: 5, y: 0 });
      return r;
    };
    // cpu_grid_move ($2B9A): the computer on the grid: three random moves, then it takes the first unplayed number
    // of number_order ($0752 from number_pick $075E) and steers to it, along the longer way first, and fires there
    P.cpu_grid_move = function (r) {
      if (!M[0x2B84]) {
        M[0x0B17] = (M[0x0B17] + 1) & 255;
        if (M[0x0B17] !== 4) {
          r = P.random(r);
          r.x = r.a & 3;
          r.a = M[0x0B11 + r.x] ^ 0xFF;
          M[0x05D8] = r.a;
          return P.grid_stick_dir(r);
        }
        let y;
        for (;;) {
          y = M[0x0752 + M[0x075E]];
          if (!M[0x1D66 + y]) break;
          M[0x075E] = (M[0x075E] + 1) & 255;
        }
        M[0x2B8F] = y; M[0x2B89] = y & 3; M[0x2B8A] = y >> 2;
        M[0x2B84] = (M[0x2B84] + 1) & 255;
        r.x = M[0x075E]; r.y = y;
      }
      if (((((M[0x1C] << 2) & 255) + M[0x1B]) & 255) === M[0x2B8F]) {
        r.a = 0xEF; M[0x05D8] = 0xEF; return r;
      }
      M[0x2B8C] = 0;
      let d = M[0x1C] - M[0x2B8A];
      if (d < 0) { d = -d; M[0x2B8C] = 1; }
      M[0x2B8E] = d & 255;
      M[0x2B8B] = 0;
      let e = M[0x1B] - M[0x2B89];
      if (e < 0) { e = -e; M[0x2B8B] = 1; }
      M[0x2B8D] = e & 255;
      if ((e & 255) >= (d & 255)) { r.x = M[0x2B8B]; M[0x05D8] = M[0x2B85 + r.x]; }
      else { r.x = M[0x2B8C]; M[0x05D8] = M[0x2B87 + r.x]; }
      r.a = M[0x05D8] ^ 0xFF; M[0x05D8] = r.a;
      return P.grid_stick_dir(r);
    };

    // cpu_subject_frame ($0B1B): the computer choosing its specialist subject, from the menu's subject_frame
    // ($EA30), back to its subject_input ($EA36) with the stick in A: a held random left or right for 0-7 turns,
    // fire after cpu_moves_limit ($0B18) moves
    P.cpu_subject_frame = function (r) {
      if (M[0x0B15]) {
        M[0x0B15] = (M[0x0B15] - 1) & 255;
        r.a = M[0x0B16]; M[0x05D8] = r.a;
        return nz(r, r.a);
      }
      M[0x0B17] = (M[0x0B17] + 1) & 255;
      if (M[0x0B17] === M[0x0B18]) { r.a = 0xEF; M[0x05D8] = 0xEF; r.c = 1; return nz(r, r.a); }
      r = P.random(r);
      M[0x0B15] = r.a & 7;
      r = P.random(r);
      r.x = r.a & 1;
      r.a = M[0x0B13 + r.x] ^ 0xFF;
      M[0x0B16] = r.a;
      return nz(r, r.a);
    };

    // --- input ------------------------------------------------------------------------------------------------
    // read_input ($1C9C): the stick of the team whose turn it is (team $F9: 0 reads $DC01, joystick port 1; 1 reads
    // $DC00, port 2, through the operand it writes at $1CA9), keyboard row 7 selected; when the stick reads nothing,
    // the team's keys (W X A D S or @ / : = ;). A and stick ($05D8) active low.
    P.read_input = function (r) {
      M[0x1CA9] = M[0xF9] ^ 1;
      H.wr(0xDC00, 0x7F);
      const a = H.rd(M[0x1CA9] | M[0x1CAA] << 8);
      M[0x05D8] = a;
      if ((a & 0x1F) !== 0x1F) { r.a = a; r.c = 0; return nz(r, a); }
      r.c = 1;
      // each row: the column byte read, and the keys it is compared with (the first that matches wins)
      const rows = M[0xF9] ? [[0xDF, [[0xBF, 1], [0xDF, 4]]], [0xBF, [[0xFB, 0x10], [0x7F, 2], [0xDF, 8]]]]
        : [[0xFD, [[0xFD, 1], [0xFB, 4], [0xDF, 0x10]]], [0xFB, [[0x7F, 2], [0xFB, 8]]]];
      for (const [sel, keys] of rows) {
        H.wr(0xDC00, sel);
        const b = H.rd(0xDC01);
        for (const [k, bit] of keys) {
          r.c = b >= k ? 1 : 0;
          if (b === k) { r.a = bit; return P.read_input_key(r); }
        }
      }
      return P.read_input_none(r);
    };
    // read_input_none ($1CE0): no key
    P.read_input_none = function (r) { r.a = 0; return P.read_input_key(r); };
    // read_input_key ($1CE2): the key's bit, inverted, into A and stick
    P.read_input_key = function (r) {
      r.a ^= 0xFF; M[0x05D8] = r.a;
      return nz(r, r.a);
    };

    // the display states' routines by address, for state_jump (the table at $06CB/$06DA), and the glide steps for
    // grid_glide_jump; group 2's score_digits_frame (state 13) is looked up when it runs
    Object.assign(P.byAddr, {
      0x06E9: (r) => P.state3_flash(r),
      0x0B87: (r) => P.state4_bubble_frame(r),
      0x0B5F: (r) => P.state5_grid_frame(r),
      0x0986: (r) => P.answer_cursor_frame(r),
      0x0BC5: (r) => P.irq_to_bottom(r),
      0x0808: (r) => P.block_choice_frame(r),
      0x3CFC: (r) => P.answer_flash_frame(r),
      0x1ED6: (r) => P.score_digits_frame(r),
      0x058B: (r) => P.grid_glide_up(r),
      0x059D: (r) => P.grid_glide_down(r),
      0x05AF: (r) => P.grid_glide_left(r),
      0x05C1: (r) => P.grid_glide_right(r),
    });
  }
  const group = { install };
  if (typeof module !== 'undefined') module.exports = group;
  (root.PQ_GROUPS = root.PQ_GROUPS || []).push(install);
})(typeof globalThis !== 'undefined' ? globalThis : this);
