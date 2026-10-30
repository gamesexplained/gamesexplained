/* sq-port */
// Squirm, ported routine by routine from the listing (listing.json), for the Play tab and for
// test_play.js, which runs it beside the game's own code in the kit's lockstep (kit/c64/lockstep.js).
// The port runs on the game's 64 KB (M) and keeps every variable where the game keeps it: the
// player's at $57-$58 and $FB-$FE, the worms, the treasure and the counters at $2648-$2693, the
// high-score table and the status templates inside the game's own screens ($0FA0-$1240), the
// animated characters in the character set at $2A00-$2AAF, and the screen itself at $0400, where
// the score, the level and the bonus timer are kept. What it does not keep are the processor's
// registers and the stack: the nine maze cells the bonus run saves on the stack are kept in a list.
//
// SquirmPort.create(M) gives P; P.io is the chips, set by the lockstep or the page: read(a) and
// write(a, v) by address at $D000-$DFFF, and irqByte(a), a byte the interrupt writes as the main
// program reads it (on a page, M[a]). P.program() is the whole program from the BASIC line's
// SYS 15133 ($3B1D) as a generator. It yields { cp: a } where the game's code reaches a: the start
// of each pass of the main loop ($3BF6) and the LDA that begins every wait on the jiffy clock
// (P.CHECKPOINTS). A wait is the game's STA $A2 and a loop on LDA $A2 / BMI; the port stores the
// same value and yields once a turn until the interrupt has counted $A2 past $FF, and so does a
// loop that waits for fire on the joystick. P.I is the processor's interrupt mask as the game sets
// it with SEI and CLI. P.irqs holds the two interrupt handlers by address, irq_handler ($3CB3) and
// bonus_irq ($3D27), and the KERNAL's own handler at $EA31, the vector's value before the game
// changes it. Each returns the cycles the KERNAL's handler takes (SquirmPort.kernal), which the
// page's clock charges.
//
// The KERNAL's handler, which both of the game's end in, is not the game's: SquirmPort.kernal(read,
// write) stands in for it, here and on test_play.js's machine, which has no ROM. It keeps what
// the game reads of it: the jiffy clock at $A0-$A2, counted up with the KERNAL's reset at 24 hours,
// and the key code at $C5, the highest key number its scan of the keyboard finds held, the four
// modifier keys aside, or 64 for none. It writes the STOP key's row to $91 and the scan's key to $CB,
// as the KERNAL's handler does, leaves CIA 1's port A at $7F with keyboard row 7 selected, and
// acknowledges CIA 1's interrupt by reading $DC0D. The rest of what that handler does (the keyboard
// buffer, key repeat, SHIFT and C= switching the character set, the cursor) the game never reads,
// and is not kept.
globalThis.SquirmPort = (function () {
  'use strict';
  // the LDA before each STA $A2 that starts a wait, and the main loop's first instruction
  const CHECKPOINTS = [0x3BF6, 0x3C56, 0x30AA, 0x311C, 0x3296, 0x32B0, 0x379E, 0x37AB, 0x3D4B, 0x37D2,
    0x3835, 0x38BE, 0x38E0, 0x38ED, 0x3D7E, 0x3A9A, 0x3ADE, 0x3AFF, 0x3BC0, 0x3C78];
  // the four modifier keys, which the KERNAL's scan keeps out of $C5: left SHIFT, right SHIFT, CTRL, C=
  const MODIFIER = new Set([0x0F, 0x34, 0x3A, 0x3D]);

  // The KERNAL's interrupt handler at $EA31, as far as the game reads it (above). rd and wr reach
  // memory and the chips: CIA 1, which the scan drives a row at a time on port A and reads on port B. Returns the cycles
  // the handler takes from $EA31 to its exit at $EA81: 162 with no key held, and with keys about
  // 1,530 and 21 for each place of the matrix that reads held, 25 more with STOP, as the kit's
  // simulator ran kernal-901227-03 from VICE (30 October 2026, to within 30 cycles).
  function kernal(rd, wr) {
    // UDTIM ($F69B): the jiffy clock, back to 0 when it reaches $4F1A01, 24 hours
    const lo = (rd(0xA2) + 1) & 255, mid = lo ? rd(0xA1) : (rd(0xA1) + 1) & 255, hi = lo || mid ? rd(0xA0) : (rd(0xA0) + 1) & 255;
    wr(0xA2, lo);
    if (!lo) { wr(0xA1, mid); if (!mid) wr(0xA0, hi); }
    if ((hi << 16 | mid << 8 | lo) >= 0x4F1A01) { wr(0xA0, 0); wr(0xA1, 0); wr(0xA2, 0); }
    // the STOP key's row, row 7 as the KERNAL leaves port A; with STOP held, rows 1 and 6 as well
    const a = rd(0xDC01);
    let cycles = a & 0x80 ? 0 : 25;
    if (a & 0x80) wr(0x91, a);
    else { wr(0xDC00, 0xBD); const x = rd(0xDC01); wr(0xDC00, a); if (x === 0xFF) wr(0x91, a); }
    // SCNKEY ($EA87): every row in turn, the last key found that is not a modifier. The scan reads
    // a ninth time with no row selected before it stops, and takes column 0 there as key 64: so
    // joystick port 1 held up, which pulls column 0 low whatever the row, leaves no key at all.
    let key = 0x40, held = 0;
    wr(0xDC00, 0);
    if (rd(0xDC01) !== 0xFF) {
      for (let row = 0; row < 8; row++) {
        wr(0xDC00, ~(1 << row) & 255);
        const cols = rd(0xDC01);
        for (let col = 0; col < 8; col++) {
          if (cols & (1 << col)) continue;
          held++;
          if (!MODIFIER.has(row * 8 + col)) key = row * 8 + col;
        }
      }
      wr(0xDC00, 0xFF);
      if (!(rd(0xDC01) & 1)) { key = 0x40; held++; }
    }
    wr(0xCB, key); wr(0xC5, key);
    wr(0xDC00, 0x7F);
    rd(0xDC0D);
    return cycles + (held ? 1530 + 21 * held : 162);
  }

  function create(M) {
    const P = { M, io: null, I: 1, irqs: {}, CHECKPOINTS, irqBytes: [0x00A2, 0x00C5, 0x07DE] };
    const rd = (a) => { a &= 0xFFFF; return a >= 0xD000 && a < 0xE000 ? P.io.read(a) & 255 : M[a]; };
    const wr = (a, v) => { a &= 0xFFFF; v &= 255; if (a >= 0xD000 && a < 0xE000) P.io.write(a, v); else M[a] = v; };
    const ib = (a) => P.io.irqByte(a) & 255;
    const word = (a) => M[a] | M[a + 1] << 8;
    const at = (z) => rd(word(z));                                // LDA (z),Y with Y = 0
    const put = (z, v) => wr(word(z), v);                          // STA (z),Y with Y = 0
    const inc = (a) => (M[a] = (M[a] + 1) & 255);
    const dec = (a) => (M[a] = (M[a] - 1) & 255);
    // a read-modify-write of a chip's register (INC, DEC): the old value written, then the new
    const rmw = (a, f) => { const v = rd(a); wr(a, v); wr(a, f(v)); };
    P.sei = () => { P.I = 1; };
    P.cli = () => { P.I = 0; };

    // A wait on the jiffy clock, once STA $A2 has stored v: LDA $A2 / BMI until the interrupt has
    // counted it past $FF. Its first read is the game's, through irqByte, where an interrupt between
    // the store and the read changes what the loop does: from $7F to $80 it waits 128 jiffies, and
    // from $FF to $00 none. From any other value it waits as long either way. The later reads are
    // of the byte as the interrupts leave it, replayed at each turn; a turn that comes before the
    // game's own first read still holds v, and reads as that first read did. Returns the last value
    // read.
    function* jiffies(v, w) {
      if (w === undefined) w = v === 0x7F || v === 0xFF ? ib(0xA2) : v;
      let a = w;
      while (a & 0x80) { yield; a = M[0xA2]; if (a === v) a = w; }
      return a;
    }
    // the LDA at cp, its STA $A2 and the wait
    function* wait(cp, v) {
      yield { cp };
      M[0xA2] = v;
      return yield* jiffies(v);
    }
    // A loop on LDA $DC01 / CMP #$EF / BNE: fire alone on joystick port 1, or SPACE
    function* waitFire() { while (rd(0xDC01) !== 0xEF) yield; }
    // 840 bytes from src to dst, rows 2 to 22 of the screen: three runs of 255 and one of 75
    function copy840(src, dst) {
      for (let x = 0; x < 0xFF; x++) {
        wr(dst + x, M[src + x]); wr(dst + 0xFF + x, M[src + 0xFF + x]); wr(dst + 0x1FE + x, M[src + 0x1FE + x]);
      }
      for (let x = 0; x < 0x4B; x++) wr(dst + 0x2FD + x, M[src + 0x2FD + x]);
    }

    // ---- the screens ($23FA-$2571)
    P.draw_status_lines = function () {                            // $23FA
      for (let x = 0; x < 0x50; x++) { M[0x0400 + x] = M[0x0FA0 + x]; M[0x0798 + x] = M[0x0FF1 + x]; }
    };
    P.colour_status_lines = function (a) {                         // $240E
      for (let x = 0; x < 0x50; x++) { wr(0xD800 + x, a); wr(0xDB98 + x, a); }
    };
    P.show_hiscore_screen = function () { copy840(0x1042, 0x0450); };   // $241C
    P.show_title_screen = function () { copy840(0x138A, 0x0450); };     // $2443
    P.show_maze1 = function () { copy840(0x16D2, 0x0450); };            // $246A
    P.show_maze2 = function () { copy840(0x1A1A, 0x0450); };            // $2491
    P.show_maze3 = function () { copy840(0x1D62, 0x0450); };            // $24B8
    P.show_title_colours = function () { copy840(0x20AB, 0xD850); };    // $24DF
    P.rotate_spinner = function () {                               // $2508
      for (let x = 0; x < 8; x++) {
        const t = M[0x2A70 + x];
        for (let c = 0x2A70; c < 0x2AA8; c += 8) M[c + x] = M[c + 8 + x];
        M[0x2AA8 + x] = t;
      }
    };
    P.hiscore_colour_bands = function () {                         // $2542
      for (let x = 0; x < 0x28; x++) {
        wr(0xD878 + x, 4); wr(0xD8F2 + x, 5); wr(0xD940 + x, 7); wr(0xD990 + x, 6);
        wr(0xD9E0 + x, 2); wr(0xDA30 + x, 1); wr(0xDA80 + x, 3); wr(0xDAD0 + x, 4);
      }
    };

    // ---- the player ($2FF9-$309F)
    P.try_cell = function () {                                     // $2FF9
      const a = at(0xFB);
      if (a >= 0x28 || a === 0x20) return 0;
      M[0xFB] = M[0xFD]; M[0xFC] = M[0xFE];
      return 1;
    };
    P.step_player = function () {                                  // $3014
      const d = M[0x58];
      if (d === 0xFE) { const lo = M[0xFB] - 0x28; M[0xFB] = lo & 255; if (lo < 0) dec(0xFC); return P.try_cell(); }
      if (d === 0xFD) { const lo = M[0xFB] + 0x28; M[0xFB] = lo & 255; if (lo > 255) inc(0xFC); return P.try_cell(); }
      if (d === 0xF7) { if (inc(0xFB) === 0) inc(0xFC); return P.try_cell(); }
      if (d === 0xFB) { if (dec(0xFB) === 0xFF) dec(0xFC); return P.try_cell(); }
      if (d === 0xEF) { M[0x57] = 0xEF; return 0; }
      return 1;
    };
    P.move_player = function () {                                  // $306E
      M[0xFD] = M[0xFB]; M[0xFE] = M[0xFC];
      const s = rd(0xDC01);
      if (s !== M[0x57]) {
        M[0x58] = s;
        if (P.step_player() !== 1) { M[0x57] = M[0x58]; return; }
      }
      M[0x58] = M[0x57];                                            // keep_old_way
      if (P.step_player() === 1) M[0x57] = 0xEF;
      else M[0x57] = M[0x58];
    };

    // ---- the high-score table ($30A2-$32CF)
    P.fade_beep = function* () {                                   // $30A2
      for (let x = 0x0F; x >= 0; x--) {
        wr(0xD418, x); wr(0xD403, x);
        yield* wait(0x30AA, 0xFA);
      }
    };
    P.save_hiscores = function () {                                // $30B8
      for (let x = 0; x < 10; x++) {
        M[0x10F0 + x] = M[0x04FE + x]; M[0x1140 + x] = M[0x054E + x]; M[0x1190 + x] = M[0x059E + x];
        M[0x11E0 + x] = M[0x05EE + x]; M[0x1230 + x] = M[0x063E + x];
      }
    };
    // the first of five digits from a that differ from b's: 1 if a's is higher, -1 if lower, 0
    const beats = (a, b) => { for (let x = 0; x < 5; x++) if (M[a + x] !== M[b + x]) return M[a + x] > M[b + x] ? 1 : -1; return 0; };
    const swap10 = (a, b) => { for (let x = 0; x < 10; x++) { const t = M[a + x]; M[a + x] = M[b + x]; M[b + x] = t; } };
    P.enter_name = function* () {                                  // $30DE
      let higher = false;
      for (let x = 0; x < 5; x++) {                                 // compare_score
        const a = M[0x0414 + x] & 0x7F, b = M[0x1234 + x];
        if (a !== b) { higher = a > b; break; }
      }
      if (!higher) return;
      for (let x = 0; x < 5; x++) M[0x0642 + x] = M[0x0414 + x] & 0x7F;   // enter_new_hi
      M[0x063E] = M[0x063F] = M[0x0640] = 0x20;
      let y = 0, x = 0;
      for (;;) {                                                    // pick_letter
        M[0x06D5 + x] = (M[0x06D5 + x] + 0x80) & 255;
        yield* wait(0x311C, 0xF6);
        const s = rd(0xDC01);
        if (s === 0xF7) {                                           // letter_right
          M[0x06D5 + x] &= 0x7F;
          if (++x === 0x1B) x = 0;
        } else if (s === 0xFB) {                                    // letter_left
          M[0x06D5 + x] &= 0x7F;
          if (--x < 0) x = 0x1A;
        } else if (s === 0xEF) {                                    // take_letter
          const a = M[0x06D5 + x] | 0x80;
          M[0x0690 + y] = a;
          M[0x063E + y] = a & 0x7F;
          y++;
          M[0xFE] = x;
          wr(0xD401, a & 0x7F);
          yield* P.fade_beep();
          x = M[0xFE];
          if (y === 3) break;
        }
      }
      wr(0xD401, 0x0A);                                             // name_taken
      yield* P.fade_beep();
      if (beats(0x0642, 0x05F2) <= 0) return P.save_hiscores();     // climb_to_row4
      swap10(0x05EE, 0x063E); wr(0xD401, 0x14); yield* P.fade_beep();
      if (beats(0x05F2, 0x05A2) <= 0) return P.save_hiscores();     // climb_to_row3
      swap10(0x059E, 0x05EE); wr(0xD401, 0x1E); yield* P.fade_beep();
      if (beats(0x05A2, 0x0552) <= 0) return P.save_hiscores();     // climb_to_row2
      swap10(0x054E, 0x059E); wr(0xD401, 0x28); yield* P.fade_beep();
      if (beats(0x0552, 0x0502) <= 0) return P.save_hiscores();     // climb_to_row1
      swap10(0x04FE, 0x054E);
      for (let x = 0; x < 5; x++) M[0x0FA4 + x] = M[0x0502 + x] | 0x80;
      P.draw_status_lines();
      wr(0xD401, 0x50); yield* P.fade_beep();
      P.save_hiscores();
    };
    P.game_over_screen = function* () {                            // $3266
      P.colour_status_lines(6); wr(0xD020, 6);
      wr(0xD016, 0xC8);
      wr(0xD403, 0x0A); wr(0xD402, 0x0A);
      P.show_hiscore_screen();
      P.hiscore_colour_bands();
      wr(0xD404, 0x41);
      yield* P.enter_name();
      wr(0xD401, 0x0A); wr(0xD403, 0x0A); wr(0xD418, 0x0F);
      yield* wait(0x3296, 0xF6);
      for (let x = 0; x < 0x13; x++) M[0x0689 + x] = M[0x26AC + x];   // show_press_fire
      wr(0xD401, 0x1E);
      yield* wait(0x32B0, 0xF0);
      wr(0xD401, 0);
      P.colour_status_lines(2); wr(0xD020, 2);
      yield* waitFire();                                            // wait_fire
    };

    // ---- the worms and the treasure ($32D2-$3A45)
    P.try_worm_step = function (a) {                               // $32EF
      if (a === 1) { if (inc(0x2686) === 0) inc(0x2687); }
      else if (a === 2) { if (dec(0x2686) === 0xFF) dec(0x2687); }
      else if (a === 3) { const lo = M[0x2686] - 0x28; M[0x2686] = lo & 255; if (lo < 0) dec(0x2687); }
      else { const lo = M[0x2686] + 0x28; M[0x2686] = lo & 255; if (lo > 255) inc(0x2687); }
      return P.cell_is_free();                                      // worm_cell_check
    };
    P.next_worm_direction = function () {                          // $333D
      if (inc(0x2680) === 5) M[0x2680] = 1;
    };
    // One worm's step: its tail cell to tail (an egg or a space), the cells shifted one place back,
    // up to four tries of the next direction and the head back on start if none is free, then the
    // body and the head drawn. head is the address of its cell list, n its cells.
    function worm(head, n, tail, start) {
      M[0x2681] = 0;
      M[0xFD] = M[head + 2 * n - 2]; M[0xFE] = M[head + 2 * n - 1];
      put(0xFD, tail);
      for (let x = 2 * n - 3; x >= 0; x--) M[head + 2 + x] = M[head + x];
      for (;;) {
        if (inc(0x2681) === 5) { M[head] = start & 255; M[head + 1] = start >> 8; break; }
        M[0x2686] = M[head]; M[0x2687] = M[head + 1];
        P.next_worm_direction();
        if (P.try_worm_step(M[0x2680]) !== 1) { M[head] = M[0x2686]; M[head + 1] = M[0x2687]; break; }
      }
      for (let x = 0; x < 2 * n - 2; x += 2) { M[0xFD] = M[head + 2 + x]; M[0xFE] = M[head + 3 + x]; put(0xFD, 0x44); }
      M[0xFD] = M[head]; M[0xFE] = M[head + 1];
      put(0xFD, 0x43);
    }
    P.step_worm_a = function () { worm(0x2648, 8, 0x46, 0x048E); P.step_worm_b(); };   // $334D
    P.step_worm_b = function () { worm(0x2658, 5, 0x20, 0x0755); P.step_worm_c(); };   // $33D2
    P.step_worm_c = function () { worm(0x2662, 5, 0x20, 0x04CB); P.step_worm_d(); };   // $3457
    P.step_worm_d = function () { worm(0x266C, 5, 0x20, 0x0575); P.step_worm_e(); };   // $34DC
    P.step_worm_e = function () { worm(0x2676, 5, 0x46, 0x06FB); };                    // $3561
    P.colour_maze = function () {                                  // $35E8
      let y = 1;
      const cell = (src, dst) => {
        wr(dst, rd(src) === 0x20 ? y : 9);
        if (++y === 8) y = 1;
      };
      for (let x = 0; x < 0xFF; x++) cell(0x0450 + x, 0xD850 + x);
      // the next three loops start with X at $FF, where the one before left it (colour_maze_next)
      for (let i = 0; i < 0x100; i++) { const x = (0xFF + i) & 255; cell(0x054F + x, 0xD94F + x); }
      for (let i = 0; i < 0x100; i++) { const x = (0xFF + i) & 255; cell(0x064E + x, 0xDA4E + x); }
      for (let i = 0; i < 0x4C; i++) { const x = (0xFF + i) & 255; cell(0x074D + x, 0xDB4D + x); }   // colour_maze_last
    };
    P.reset_worms = function () {                                  // $3669
      const coil = (head, n, start) => { for (let x = 0; x < n; x++) { M[head + 2 * x] = start & 255; M[head + 2 * x + 1] = start >> 8; } };
      coil(0x2648, 8, 0x048E); coil(0x2658, 5, 0x0755); coil(0x2662, 5, 0x04CB); coil(0x266C, 5, 0x0575); coil(0x2676, 5, 0x06FB);
    };
    P.add_score = function (x) {                                   // $3724
      for (;;) {
        const y = (M[0x0414 + x] + 1) & 255;
        if (y !== 0xBA) { M[0x0414 + x] = y; return; }
        M[0x0414 + x] = 0xB0;
        x = (x - 1) & 255;
      }
    };
    P.collect_treasure = function () {                             // $373B
      const v = M[0x2684];
      if (v === 1) { wr(0xD401, 0x0A); M[0x268D] = 0xC8; M[0x2691] = 0x4D; return; }
      if (v === 2) { P.add_score(4); wr(0xD401, 0x14); M[0x2691] = 0x4C; M[0x268D] = 0xC8; return; }
      P.add_score(3); wr(0xD401, 0x5A); M[0x2691] = 0x4B; M[0x268D] = 0xC8;   // treasure_100
    };
    P.bonus_run = function* () {                                   // $3780
      wr(0xD020, 7); P.colour_status_lines(7);
      M[0x07DE] = 0xB9;
      const kept = [];
      for (let x = 0; x < 9; x++) {                                 // show_bonus_run
        kept.push(M[0x05C5 + x]);
        M[0x05C5 + x] = M[0x26D4 + x];
        wr(0xD401, 0x0A);
        yield* wait(0x379E, 0xFF);
        wr(0xD401, 0x14);
        yield* wait(0x37AB, 0xFF);
      }
      M[0xA2] = 0x81;
      wr(0xD401, 0);
      yield* P.bonus_tune_reset();
      for (let x = 0; x < 9; x++) M[0x05C5 + x] = M[0x26C0 + x];   // bonus_get_ready
      yield* wait(0x37D2, 0xC8);
      for (let x = 8; x >= 0; x--) M[0x05C5 + x] = kept.pop();
      P.sei(); M[0x0314] = 0x27; M[0x0315] = 0x3D; P.cli();
      for (;;) {                                                    // bonus_loop
        P.move_player();
        const a = at(0xFB);
        if (a === 0x44) { wr(0xD401, 0x32); P.add_score(3); }
        else if (a === 0x43) { wr(0xD401, 0x46); P.add_score(3); P.add_score(3); }   // bonus_ate_head
        else if (a === 0x46) { wr(0xD401, 0x05); P.add_score(4); }                   // bonus_ate_egg
        P.bonus_tune_step();                                        // bonus_next_note
        yield { cp: 0x3835 };
        const v = M[0xA2] = M[0x2689];
        if (M[0x57] !== 0xEF) put(0xFD, 0);
        put(0xFB, 0x51);
        // bonus_wait: the timer's hundreds digit, then the clock, each turn; the first read of each
        // the game's, and the clock read later as jiffies reads it
        if (ib(0x07DE) === 0xAF) break;
        const w = ib(0xA2);
        let j = w, over = false;
        while (j & 0x80) {
          yield;
          if (M[0x07DE] === 0xAF) { over = true; break; }
          j = M[0xA2]; if (j === v) j = w;
        }
        if (over) break;
        wr(0xD401, 0);
      }
      P.install_irq();                                              // end_bonus_run
      wr(0xD401, 0); wr(0xD408, 0);
      M[0x07DE] = M[0x07DF] = M[0x07E0] = 0xB0;
    };
    P.level_complete = function* () {                              // $3879
      wr(0xD401, 0); wr(0xD408, 0);
      yield* P.bonus_run();
      inc(0x2688);
      if (inc(0x0424) === 0xBA) { M[0x0423] = 0xB1; M[0x0424] = 0xB0; }
      M[0x2690] = 0;
      P.reset_worms();
      for (let x = 0; x < 9; x++) M[0x05C5 + x] = M[0x26C0 + x];   // show_get_ready
      let a = 0;
      for (let x = 0; x < 0x1E; x++) {                              // level_jingle
        wr(0xD401, M[0x3E80 + x]); wr(0xD408, M[0x3EE4 + x]);
        a = yield* wait(0x38BE, 0xF6);
      }
      wr(0xD408, a);                                                // A as the last wait left it
      for (let x = 0; x < 9; x++) {                                 // show_level
        M[0x05C5 + x] = M[0x26CA + x];
        wr(0xD401, 0x0A);
        wr(0xD9C5 + x, 1);
        yield* wait(0x38E0, 0xFF);
        wr(0xD401, 0x14);
        yield* wait(0x38ED, 0xFF);
      }
      M[0x05CC] = M[0x0423]; M[0x05CD] = M[0x0424];
      yield* P.level_pause();
      if (inc(0x2682) === 4) M[0x2682] = 1;
      const n = M[0x2682];
      if (n === 1) P.show_maze1(); else if (n === 2) P.show_maze2(); else P.show_maze3();
      P.colour_maze();                                              // start_level
      wr(0xD020, 2); P.colour_status_lines(2);
      wr(0xD401, 0);
      M[0x268F] = 0; M[0x268D] = 0;
      M[0x57] = 0xFE; M[0xFB] = 0xE0; M[0xFC] = 0x05;
      M[0x268A] = 0x55; M[0x268B] = 0x07;
    };
    P.move_treasure = function () {                                // $3961
      M[0x2681] = 0;
      M[0xFD] = M[0x268A]; M[0xFE] = M[0x268B];
      put(0xFD, 0x20);
      for (;;) {
        if (inc(0x2681) === 5) { M[0x268A] = 0x55; M[0x268B] = 0x07; break; }
        M[0x2686] = M[0x268A]; M[0x2687] = M[0x268B];
        P.next_worm_direction();
        if (P.try_worm_step(M[0x2680]) !== 1) { M[0x268A] = M[0x2686]; M[0x268B] = M[0x2687]; break; }
      }
      M[0xFD] = M[0x268A]; M[0xFE] = M[0x268B];
      put(0xFD, M[0x268E]);
      if (inc(0x268F) === 0x1E) M[0x268F] = 1;
      wr(0xD408, M[0x3E80 + M[0x268F]]);
    };
    P.step_treasure = function () {                                // $39DF
      if (inc(0x2684) === 4) M[0x2684] = 1;
      if (M[0x268D] === 0) return P.move_treasure();
      const t = dec(0x268D);
      if (t >= 0xB4) { M[0xFD] = M[0x268A]; M[0xFE] = M[0x268B]; put(0xFD, M[0x2691]); return; }
      if (t !== 0xAA) return;                                       // treasure_timeout
      M[0xFD] = M[0x268A]; M[0xFE] = M[0x268B];
      put(0xFD, 0x20);
      M[0x268A] = 0x55; M[0x268B] = 0x07;
      inc(0x268E); inc(0x268E);
      if (M[0x268E] === 0x4B) M[0x268E] = 0x47;
    };
    P.move_creatures = function () {                               // $3A46
      for (;;) {
        const s = M[0x2688];
        if (s === 1) return P.step_worm_c();
        if (s === 2) { P.step_worm_c(); return P.step_treasure(); }
        if (s === 3) { P.step_worm_b(); return P.step_treasure(); }
        if (s === 4) { P.step_worm_a(); return P.step_treasure(); }
        inc(0x2689); M[0x2688] = 1;                                 // next_cycle
      }
    };

    // ---- a life lost, the start and the main loop ($3A7D-$3CB2)
    P.lose_life = function* () {                                   // $3A7D
      wr(0xD404, 0x81); wr(0xD401, 0x14);
      put(0xFB, 0x20); put(0xFD, 0x20);
      do {                                                          // fall_row
        rmw(0xD401, (v) => v - 1);
        M[0xFD] = at(0xFB);
        put(0xFB, 0x51);
        yield* wait(0x3A9A, 0xFD);
        put(0xFB, M[0xFD]);
        const lo = M[0xFB] + 0x28; M[0xFB] = lo & 255; if (lo > 255) inc(0xFC);
      } while (at(0xFB) !== 0xA0);
      wr(0xD404, 0x41); wr(0xD408, 0); wr(0xD401, 0);
      M[0xFB] = M[0xFD] = 0xE0; M[0xFC] = M[0xFE] = 0x05;
      wr(0xD022, 0); wr(0xD023, 0);
      do {
        rmw(0xD022, (v) => v + 1); rmw(0xD023, (v) => v + 1);
        yield* wait(0x3ADE, 0xFF);
      } while (P.wall_colour() !== 0x0F);
      wr(0xD022, 6); wr(0xD023, 6);
      M[0x07C8 + M[0x2685]] = 0xA0;
      yield* wait(0x3AFF, 0x81);
      M[0x57] = 0xEF;
    };
    P.game_over = function* () {                                   // $3B0C
      yield* P.lose_life();
      wr(0xD401, 0); wr(0xD408, 0);
      yield* P.game_over_screen();
    };
    P.start = function () {                                        // $3B1D
      P.install_irq();
      wr(0xD018, 0x1A);
    };
    P.new_game = function* () {                                    // $3B25
      wr(0xD021, 0); wr(0xD401, 0); wr(0xD408, 0); wr(0xD412, 0);
      wr(0xD405, 0x88); wr(0xD406, 0x88); wr(0xD40C, 0x88); wr(0xD40D, 0x88);
      wr(0xD404, 0x41); wr(0xD40B, 0x41);
      wr(0xD403, 0x0A); wr(0xD402, 0x0A); wr(0xD409, 0x0A); wr(0xD40A, 0x0A);
      wr(0xD418, 0x0F);
      wr(0xD022, 6); wr(0xD023, 6);
      wr(0xD020, 2); P.colour_status_lines(2);
      P.draw_status_lines();
      wr(0xD016, 0xC8);
      P.show_title_screen();                                        // through show_title_via_sbc ($2441)
      P.show_title_colours();
      P.reset_worms();
      M[0xFB] = 0xE0; M[0xFC] = 0x05; M[0x57] = 0xEF;
      M[0x268A] = 0x55; M[0x268B] = 0x07;
      M[0x2684] = 1; M[0x2688] = 1; M[0x2685] = 3;
      M[0x2690] = 0; M[0x268D] = 0;
      M[0x268E] = 0x47; M[0x2689] = 0xFA;
      // the title tune, a note each 10 jiffies, until fire alone
      for (let x = 0; ;) {
        wr(0xD401, M[0x3E80 + x]); wr(0xD408, M[0x3EE4 + x]);
        yield* wait(0x3BC0, 0xF6);
        if (++x === 0x64) x = 0;
        if (rd(0xDC01) === 0xEF) break;
      }
      wr(0xD401, 0); wr(0xD408, 0);
      wr(0xD016, 0xD8);
      P.show_maze1();
      M[0x2682] = 1; M[0x0424] = 0xB1;
      P.colour_maze();
      P.reset_worms();
    };
    // One pass of the main loop, from $3BF6; true when the last life is lost (JMP game_over)
    P.main_loop = function* () {                                   // $3BF6
      yield { cp: 0x3BF6 };
      P.move_creatures();
      P.move_player();
      const a = at(0xFB);
      if (a === 0x46) {
        P.add_score(4);
        wr(0xD401, inc(0x2690));
        if (M[0x2690] === 0xFF) yield* P.level_complete();
      } else if (a === M[0x268E]) {                                 // hit_treasure
        wr(0xD401, 0x14);
        P.collect_treasure();
      } else if (a === 0x44 || a === 0x43) {                        // hit_worm
        if (dec(0x2685) === 0) return true;
        yield* P.lose_life();
      }
      if (M[0x57] !== 0xEF) put(0xFD, 0x20);                        // draw_player
      put(0xFB, 0x51);
      yield { cp: 0x3C56 };
      const v = M[0xA2] = M[0x2689];
      yield* jiffies(v);
      wr(0xD408, 0); wr(0xD401, 0);
      if (ib(0xC5) === 4) yield* P.pause();
      return false;
    };
    P.pause = function* () {                                       // $3C73
      wr(0xD418, 0);
      yield* wait(0x3C78, 0x81);
      yield* waitFire();
      wr(0xD418, 0x0F);
    };
    P.wall_colour = function () { return rd(0xD023) & 0x0F; };    // $3C8D
    P.cell_is_free = function () {                                 // $3C93
      M[0xFD] = M[0x2686]; M[0xFE] = M[0x2687];
      const a = at(0xFD);
      return a === 0x20 || a === 0x51 || a === 0x46 ? 0 : 1;
    };

    // ---- the interrupts ($3CB3-$3D86)
    P.irq_handler = function () {                                  // $3CB3
      if (inc(0x2683) === 7) {
        M[0x2683] = 0;
        for (let x = 0; x < 8; x++) {                               // rotate_arrows
          const t = M[0x2A00 + x];
          M[0x2A00 + x] = M[0x2A08 + x]; M[0x2A08 + x] = M[0x2A10 + x]; M[0x2A10 + x] = t;
          const a = M[0x2A38 + x]; M[0x2A38 + x] = M[0x2A40 + x]; M[0x2A40 + x] = a;
          const b = M[0x2A48 + x]; M[0x2A48 + x] = M[0x2A50 + x]; M[0x2A50 + x] = b;
          const e = M[0x2A30 + x]; M[0x2A30 + x] = ((e << 1) | (e >> 7)) & 255;
        }
        P.rotate_spinner();
      }
      return P.kernal_irq();
    };
    P.install_irq = function () {                                  // $3D0B
      P.sei(); M[0x0314] = 0xB3; M[0x0315] = 0x3C; P.cli();
    };
    P.bonus_irq = function () {                                    // $3D27
      if (dec(0x07E0) === 0xAF) {
        M[0x07E0] = 0xB9;
        if (dec(0x07DF) === 0xAF) { M[0x07DF] = 0xB9; dec(0x07DE); }
      }
      return P.kernal_irq();
    };
    P.bonus_tune_reset = function* () {                            // $3D4B
      yield* wait(0x3D4B, 0x81);
      M[0x2692] = 0; M[0x2693] = 0;
    };
    P.bonus_tune_step = function () {                              // $3D5C
      let x = M[0x2692];
      wr(0xD408, M[0x3DB8 + x]);
      if (++x === 0xFF) x = 0;
      M[0x2692] = x;
    };
    P.level_pause = function* () {                                 // $3D76
      wr(0xD408, 0); wr(0xD401, 0);
      yield* wait(0x3D7E, 0x81);
    };
    P.kernal_irq = function () { return kernal(rd, wr); };          // $EA31
    P.irqs[0x3CB3] = P.irq_handler;
    P.irqs[0x3D27] = P.bonus_irq;
    P.irqs[0xEA31] = P.kernal_irq;

    // The whole program: the start, then a game after another, each from the title
    P.program = function* () {
      P.start();
      for (;;) {
        yield* P.new_game();
        while (!(yield* P.main_loop()));
        yield* P.game_over();                                       // JMP new_game
      }
    };
    return P;
  }
  return { create, kernal, CHECKPOINTS };
})();
if (typeof module !== 'undefined') module.exports = globalThis.SquirmPort;
