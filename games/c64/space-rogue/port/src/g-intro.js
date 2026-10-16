// INTRO ($6800-$82FF), which the title loads over SHIP: "Old or New Game?" over the star field. An
// old game asks a question from the Sunracer Owner's Guide and goes to SR with A = 'O' when the
// answer's first four letters are right; a new game asks the player's name (kept at $BF00 for
// INIT) and tells the story over three pictures, I1-I3, then goes to SR with A = 'N'. Every
// piece of text goes through print_inline ($7884), which is where the port yields its
// checkpoint, the passes' start.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
const PROGRAMS = root.SRPrograms = root.SRPrograms || {};
const STORY = `story_beacon story_morse story_vacc_suit story_thruster story_pirates story_manchi
  story_derelict story_relax story_airlock story_cycles story_garnet story_wrong story_alert
  story_cockpit story_attack story_evac story_battle story_explosion story_alone story_alone_word
  story_no_goal story_survival story_end`.split(/\s+/);
PROGRAMS.intro = {
  gen: `intro_start old_or_new old_game access_denied new_game ask_name read_line get_key_cursor
    password_check ask_question`.split(/\s+/).concat(STORY),
  start: 'intro_start', checkpoints: [0x7884], passAt: 0x7884, exits: [0x0400, 0x2000],
};
G.intro = function (P) {
  root.SRScreens(P, 'intro');
  const M = P.M;
  const R = (r, x) => Object.assign({}, r, x);
  const KEY = 0x3C, SHOWN = 0x3A, DRAW = 0x1E, ROW = 0x20, COL = 0x21, LEFT = 0x22, RIGHT = 0x23;
  const LEN = 0x24, LIMIT = 0x29, LINE = 0xBF00;
  P.CHECKPOINTS.push(0x7884, 0x7857, P.addr(0x20CF), P.addr(0x20E5), P.addr(0x253E));
  // the cursor at column c of row w; the window from column l to column 38 when l is given
  const at = (c, w) => { M[COL] = c; M[ROW] = w; P.spend(10); };

  P.intro_start = function* () {
    let r = P.setup_irq();
    r = P.build_line_table(r);
    for (const p of [0x6809, 0x6813]) r = P.load_inline(p);
    r = P.clear_4000(r);
    r = P.bitmap_mode(r);
    r = P.show_4000_colours(r);
    r = P.white_colours(r);
    r = P.unpack_picture(R(r, { a: 0xB7 }));
    r = P.show_drawn(r);
    r = P.copy_c000_to_4000(r);
    r = P.show_4000(r);
    return yield* P.old_or_new(r);
  };
  P.print_inline = (t, r) => P.print_inline_at(0x7895, t, r);
  const text = function* (t, r) { yield { cp: 0x7884, cycles: P.take() }; return P.print_inline(t, r); };

  // "Old or New Game?" on row 4 of the star field shown, and a key until it is N or O
  P.old_or_new = function* (r) {
    M[DRAW] = M[SHOWN]; M[LEFT] = 0; M[RIGHT] = 0x27;
    at(0x0C, 4);
    r = yield* text(0x78F0, r);
    for (;;) {
      r = yield* P.wait_key(r);
      const a = r.a & 0x7F;
      let x = 3;
      while (x >= 0 && M[0x7919 + x] !== a) x--;
      P.spend(40);
      if (x < 0) continue;
      r = R(r, { a, x });
      return x >= 2 ? yield* P.old_game(r) : yield* P.new_game(r);
    }
  };
  P.old_game = function* (r) {
    r = yield* P.password_check(r);
    if (r.c) return yield* P.access_denied(r);
    return P.run_sr(R(r, { a: 0x4F }));
  };
  // A wrong answer: the star field again over the question, STARSHIP JOLLY ROGER, ACCESS DENIED, a
  // key and the title again
  P.access_denied = function* (r) {
    r = P.unpack_picture(R(r, { a: 0xB7 }));
    at(0x0A, 0x0A);
    r = yield* text(0x7937, r);
    at(0x0D, 0x0C);
    r = yield* text(0x7957, r);
    r = yield* P.wait_key(r);
    return P.back_to_title(r);
  };
  P.new_game = function* (r) {
    r = yield* P.ask_name(r);
    for (const p of [0x7971, 0x797D, 0x7989]) r = P.load_inline(p);
    for (const s of STORY) r = yield* P[s](r);
    return P.run_sr(r);
  };
  // SR loaded to $0400 and run, with A and the carry from comparing it with 'O'
  P.run_sr = function (r) {
    const a = r.a;
    r = P.load_inline(0x8255);
    throw new P.Goto(0x0400, R(r, { a, c: a >= 0x4F ? 1 : 0, z: a === 0x4F ? 1 : 0 }));
  };
  P.back_to_title = function () { throw new P.Goto(0x2000, P.load_inline(0x8263)); };

  // ---- the name, and lines typed
  P.ask_name = function* (r) {
    if (!(M[SHOWN] & 0x40)) { r = P.copy_4000_to_c000(r); r = P.show_c000(r); }
    M[LEFT] = 0; M[RIGHT] = 0x27; M[DRAW] = M[SHOWN];
    at(5, 0x15);
    r = yield* text(0x7454, r);
    at(0x18, 0x15); M[LEN] = 0; M[LIMIT] = 0x0B;
    return yield* P.read_line(r);
  };
  // A line into line_buffer ($BF00) at the cursor, up to line_limit, ended by RETURN once it holds
  // something, the cursor rubbed out and a zero after it
  P.read_line = function* (r) {
    for (;;) {
      r = yield* P.get_key_cursor(r);
      if (r.a === 0x0D) {
        if (!M[LEN]) continue;
        const o = P.print_char({ a: 0x20, x: M[LEN], y: r.y });
        M[(LINE + o.x) & 0xFFFF] = 0;
        return { a: 0, x: o.x, y: o.y };
      }
      r = P.line_key(r);
      P.spend(20);
    }
  };
  P.line_key = function (r) {
    const a = r.a;
    if (a === 0x08 || a === 0x7F) {
      const x = M[LEN];
      if (!x) return R(r, { x });
      let o = P.print_char({ a: 0x20, x, y: r.y });
      M[COL] = (M[COL] - 2) & 255;
      o = P.print_char({ a: 0x20, x: o.x, y: o.y });
      M[COL] = (M[COL] - 1) & 255;
      M[LEN] = (M[LEN] - 1) & 255;
      return { a: 0x20, x: o.x, y: o.y };
    }
    const x = M[LEN];
    if (x >= M[LIMIT]) return R(r, { x });
    M[(LINE + x) & 0xFFFF] = a;
    const o = P.print_char({ a, x, y: r.y });
    M[LEN] = (M[LEN] + 1) & 255;
    return o;
  };
  // A key, the cursor a space and an underscore in turn meanwhile: DEL, the left arrow ($08),
  // RETURN or a printable one
  P.get_key_cursor = function* (r) {
    let x = r.x, y = r.y, a;
    for (;;) {
      P.clear_key();
      for (;;) {
        yield { cp: 0x7857, cycles: P.take() };
        let o = P.print_char({ a: 0x20, x, y });
        x = o.x; y = o.y; M[COL] = (M[COL] - 1) & 255;
        if ((a = P.irqByte(KEY)) < 0xFF) break;
        o = P.print_char({ a: 0x5F, x, y });
        x = o.x; y = o.y; M[COL] = (M[COL] - 1) & 255;
        if ((a = P.irqByte(KEY)) < 0xFF) break;
        P.spend(20);
      }
      a &= 0x7F;
      P.spend(30);
      if (a === 0x7F || a === 0x08 || a === 0x0D || a >= 0x20) return { a, x, y };
    }
  };

  // ---- the manual's question
  // Question (frame count AND 31) + 1 asked over the star field; C clear when the answer, folded to
  // capitals, matches the word's first four letters, or all of a shorter one
  P.password_check = function* (r) {
    if (!(M[SHOWN] & 0x40)) { r = P.copy_4000_to_c000(r); r = P.show_c000(r); }
    r = P.unpack_picture(R(r, { a: 0xB7 }));
    r = P.show_drawn(r);
    r = P.find_question(R(r, { a: ((P.irqByte(0x3D) & 0x1F) + 1) & 255 }));
    r = yield* P.ask_question(r);
    const w = M[0x2A] | M[0x2B] << 8;
    for (let y = 0; ; y++) {
      const x = M[(LINE + y) & 0xFFFF] & 0x5F, a = x ^ M[(w + y) & 0xFFFF];
      P.spend(25);
      if (a) return { a, x, y, c: 1 };
      if (y + 1 >= 4 || !x) return { a: 0, x, y: y + 1, c: 0 };
    }
  };
  // Record A of manual_questions (1-32): its page, paragraph, sentence and word to $2C-$2F, and
  // $2A/$2B at its word
  P.find_question = function (r) {
    let q = 0x76C8, x = r.a & 255;
    for (x = (x - 1) & 255; x; x = (x - 1) & 255) {
      let y = 0;
      while (M[(q + y) & 0xFFFF]) y++;
      q = (q + y + 1) & 0xFFFF;
      P.spend(15 + 10 * y);
    }
    for (let y = 0; y < 4; y++) M[0x2C + y] = M[(q + y) & 0xFFFF];
    q = (q + 4) & 0xFFFF;
    M[0x2A] = q & 255; M[0x2B] = q >> 8;
    return { a: q & 255, x: 0, y: 3 };
  };
  P.ask_question = function* (r) {
    M[LEFT] = 6; M[RIGHT] = 0x27; M[DRAW] = M[SHOWN];
    at(0, 8);
    r = yield* text(0x75E0, r);
    r = P.print_ordinal(R(r, { a: M[0x2D] }));
    r = yield* text(0x75F5, r);
    at(0, 9);
    r = yield* text(0x760B, r);
    r = P.print_number(R(r, { a: M[0x2C] }));
    r = yield* text(0x761C, r);
    at(0, 0x0B);
    r = yield* text(0x762B, r);
    r = P.print_ordinal(R(r, { a: M[0x2F] }));
    r = yield* text(0x7640, r);
    at(0, 0x0C);
    r = yield* text(0x7651, r);
    r = P.print_ordinal(R(r, { a: M[0x2E] }));
    r = yield* text(0x7661, r);
    M[LEFT] = 0x0C; M[RIGHT] = 0x27;
    at(0, 0x0E); M[LEN] = 0; M[LIMIT] = 0x10;
    return yield* P.read_line(r);
  };
  // A in decimal, one or two digits, built in number_text ($7585)
  P.print_number = function (r) {
    M[0x27] = 0x85; M[0x28] = 0x75;
    let o = P.divide({ a: r.a, x: 0 });
    if (o.y) P.put_digit({ a: o.y });
    o = P.divide({ a: o.a, x: 1 });
    P.put_digit({ a: o.y });
    M[M[0x27] | M[0x28] << 8] = 0;
    M[0x27] = 0x85; M[0x28] = 0x75;
    P.spend(60);
    return P.print_text(R(r, { x: 1 }));
  };
  P.put_digit = function (r) {
    const a = (r.a | 0x30) & 255;
    M[M[0x27] | M[0x28] << 8] = a;
    M[0x27] = (M[0x27] + 1) & 255; if (!M[0x27]) M[0x28] = (M[0x28] + 1) & 255;
    P.spend(20);
    return R(r, { a, y: 0 });
  };
  // A over the divisor at decimal_divisors + X, by subtraction until the result is negative: the
  // quotient in Y, the remainder in A
  P.divide = function (r) {
    const d = M[0x7596 + r.x];
    let a = r.a & 255, y = 0xFF;
    do { y = (y + 1) & 255; a = (a - d) & 255; P.spend(10); } while (!(a & 0x80));
    return R(r, { a: (a + d) & 255, y });
  };
  // Word A of ordinals, "first" to "tenth"
  P.print_ordinal = function (r) {
    M[0x27] = 0x87; M[0x28] = 0x76;
    for (let x = (r.a - 1) & 255; x; x = (x - 1) & 255) {
      const p = M[0x27] | M[0x28] << 8;
      let y = 0;
      while (M[(p + y) & 0xFFFF]) y++;
      const q = (p + y + 1) & 0xFFFF;
      M[0x27] = q & 255; M[0x28] = q >> 8;
      P.spend(15 + 10 * y);
    }
    return P.print_text(R(r, { x: 0 }));
  };
  // The text at ($27) up to its zero
  P.print_text = function (r) {
    let x = r.x;
    for (;;) {
      const a = P.rd(M[0x27] | M[0x28] << 8);
      if (!a) return { a: 0, x, y: 0 };
      x = P.print_char({ a, x, y: 0 }).x;
      M[0x27] = (M[0x27] + 1) & 255; if (!M[0x27]) M[0x28] = (M[0x28] + 1) & 255;
      P.spend(20);
    }
  };

  // ---- the story: show the page drawn (sdc) and copy it to the other buffer (csc), pauses, keys,
  // sounds, the window's rows wiped or scrolled away, and the next text
  const sdc = r => P.show_drawn_colours(r), csc = r => P.copy_shown_colours(r);
  const pause = function* (a, r) { return yield* P.pause(R(r, { a })); };
  P.story_beacon = function* (r) {
    r = P.unpack_picture(R(r, { a: 0x84 }));
    at(1, 3); M[LEFT] = 1; M[RIGHT] = 0x10;
    return yield* text(0x79AA, r);
  };
  P.story_morse = function* (r) {
    r = csc(sdc(r));
    r = yield* pause(0x0A, r);
    r = yield* P.distress_call(r);
    r = yield* pause(0x0A, r);
    at(1, 0x11); M[RIGHT] = 0x26;
    return yield* text(0x7A6D, r);
  };
  P.story_vacc_suit = function* (r) {
    r = csc(sdc(r));
    r = yield* P.wait_key(r);
    r = yield* P.scroll_up(R(r, { x: 0x11, y: 0x15 }));
    at(1, 0x10);
    return yield* text(0x7B2C, r);
  };
  // after a pause of n, the page shown and copied, and the next text
  const next = (n, t, row) => function* (r) {
    r = yield* pause(n, r);
    r = csc(sdc(r));
    if (row !== undefined) M[ROW] = row;
    return yield* text(t, r);
  };
  P.story_thruster = next(0x0A, 0x7B87);
  P.story_pirates = next(0x1E, 0x7BA8);
  P.story_manchi = next(0x0F, 0x7BC0);
  P.story_derelict = function* (r) {
    r = yield* pause(0x0F, r);
    r = sdc(r);
    r = P.unpack_picture(R(r, { a: 0x92 }));
    at(1, 1);
    return yield* text(0x7C27, r);
  };
  P.story_relax = function* (r) {
    at(1, 0x0C); M[RIGHT] = 0x12;
    return yield* text(0x7D1B, r);
  };
  P.story_airlock = function* (r) {
    r = yield* P.wait_key(r);
    r = yield* P.dissolve_out(r);
    r = csc(sdc(r));
    r = yield* P.wait_key(r);
    M[RIGHT] = 0x26;
    r = yield* P.wipe_right(R(r, { x: 1, y: 6 }));
    M[RIGHT] = 0x12;
    r = yield* P.wipe_left(R(r, { x: 0x0C, y: 0x12 }));
    M[RIGHT] = 0x26;
    at(1, 1);
    return yield* text(0x7DBE, r);
  };
  P.story_cycles = function* (r) {
    r = sdc(r);
    r = yield* P.airlock_sound(r);
    r = csc(r);
    return yield* text(0x7DEB, r);
  };
  P.story_garnet = next(0x14, 0x7E31);
  P.story_wrong = next(0x1E, 0x7E92, 0x0F);
  P.story_alert = function* (r) {
    r = yield* pause(0x1E, r);
    r = sdc(r);
    r = P.unpack_picture(R(r, { a: 0xA1 }));
    M[ROW] = 1; M[LEFT] = 0x16; M[COL] = 0x16;
    return yield* text(0x7EBE, r);
  };
  P.story_cockpit = function* (r) {
    r = yield* P.wait_key(r);
    r = sdc(r);
    r = yield* P.alarm_sound(r);
    r = csc(r);
    return yield* text(0x7F07, r);
  };
  P.story_attack = function* (r) { r = csc(sdc(r)); return yield* text(0x7F4F, r); };
  P.story_evac = next(0x1E, 0x7FA2);
  P.story_battle = function* (r) {
    r = yield* pause(0x1E, r);
    r = csc(sdc(r));
    M[LEFT] = 1;
    return yield* text(0x7FEA, r);
  };
  P.story_explosion = function* (r) {
    r = yield* P.explosion_sound(r);
    r = sdc(r);
    r = yield* P.rumble_sound(r);
    r = P.unpack_picture(R(r, { a: 0xA1 }));
    M[LEFT] = 0x16; M[COL] = 0x16; M[ROW] = 5;
    return yield* text(0x80C7, r);
  };
  P.story_alone = function* (r) {
    r = yield* P.wait_key(r);
    r = csc(sdc(r));
    M[LEFT] = 1; M[COL] = 1; M[ROW] = 0x12;
    return yield* text(0x8155, r);
  };
  P.story_alone_word = next(0x28, 0x81B0);
  P.story_no_goal = next(0x1E, 0x81E5);
  P.story_survival = next(0x14, 0x821A);
  // the last line shown, a key, the page faded to black, and SR for a new game
  P.story_end = function* (r) {
    r = yield* pause(0x23, r);
    r = sdc(r);
    r = yield* P.wait_key(r);
    r = yield* P.dissolve_out(r);
    return R(r, { a: 0x4E });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
