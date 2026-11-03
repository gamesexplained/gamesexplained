// The cassette and the file panels ($C5E5-$CDD8): saving and loading through the ROM's tape
// routines, finding a file by its header, the scenario's file panel and its options, the menu at
// the end of a game turn, the file name typed through the ROM's KEY-SCAN, a wizard made at random,
// the frames the panels are drawn in, and the classifying of a creature's step.
//
// The ROM's LD-BYTES and SA-BYTES are the cassette's (P.io.tape): load(flag, length) gives the next
// block ({ flag, bytes }), save(flag, bytes) writes one; a load past the last block waits for SPACE,
// as the ROM's loop does when no signal comes.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.files = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def, H = P.H = P.H || {};
  const TAPE_ERROR = 0xC5E4, LOADING = 0xC636, CHOICE = 0xC662, NAME = 0xC637;

  // tape_transfer: load (A = 1) or save DE bytes at IX with flag B; tape_error 1 until a load works.
  // Where the ROM returns, SPACE held breaks the operation off: it returns to its caller's caller
  // with tape_error still 1.
  function* transfer(load, r) {
    M[LOADING] = load ? 1 : 0;
    M[TAPE_ERROR] = 1;
    const flag = r.b & 255, tape = P.io.tape;
    let ix = r.ix & 0xFFFF, de = (r.de !== undefined ? r.de : (r.d << 8 | r.e)) & 0xFFFF, ok;
    if (!load) {
      const bytes = new Uint8Array(de);
      for (let i = 0; i < de; i++) bytes[i] = M[(ix + i) & 0xFFFF];
      ok = tape.save(flag, bytes);
      ix = (ix + de) & 0xFFFF; de = 0;
    } else {
      P.io.out(0xFE, 0x0F);
      if (tape.pos >= tape.blocks.length) {
        // no signal: the ROM's loop waits for SPACE
        while (P.io.in(0x7FFE) & 1) yield;
        ok = false;
      } else {
        const b = tape.load(flag, de);
        if (b.flag !== flag) ok = false;
        else {
          const k = Math.min(de, b.bytes.length);
          for (let i = 0; i < k; i++) M[(ix + i) & 0xFFFF] = b.bytes[i];
          ok = b.bytes.length === de;
          ix = (ix + k) & 0xFFFF; de -= k;
        }
      }
    }
    // tape_check
    P.io.out(0x7FFE, 0);
    if (!(P.io.in(0x7FFE) & 1)) return { a: 0xC5, f: load ? 0xFF : 0xFB, cf: true, bc: 0x7FFE, ix, de };
    if (!load) return { a: flag, cf: !!ok, bc: 0x7FFE, ix, de };
    if (!ok) return { a: 4, cf: true, bc: 0x7FFE, ix, de };
    M[TAPE_ERROR] = 0;
    return { a: 0, zf: true, cf: false, bc: 0x7FFE, ix, de };
  }
  def(0xC5E5, 'tape_load', function* (r) { return yield* transfer(true, r); });
  def(0xC5E9, 'tape_save', r => P.sync(transfer(false, r)));
  def(0xC5EA, 'tape_transfer', function* (r) { return yield* transfer(!!(r.a & 255), r); });

  // set_extension: the three characters at HL into the file name's extension ($C640).
  def(0xC644, 'set_extension', r => { for (let i = 0; i < 3; i++) M[0xC640 + i] = M[(r.hl + i) & 0xFFFF]; return { hl: (r.hl + 3) & 0xFFFF, de: 0xC643, bc: 0 }; });

  // save_header: the file name as the game's own header (twelve bytes, flag $64), and delay_255.
  def(0xC665, 'save_header', r => { P.tape_save({ ix: NAME, de: 12, b: 0x64 }); P.delay_255({}); return {}; });

  // find_file: headers read until one's first character is the file name's, each shown at row $16,
  // column $0B with SEARCHING: and then LOADING:; Z when SPACE is held.
  def(0xC675, 'find_file', function* (r) {
    for (;;) {
      yield* P.tape_load({ ix: 0xC6B2, de: 12, b: 0x64 });
      const k = yield* P.key_scan({});
      if ((k.e & 255) === 0x20) return { a: 0x20, zf: true };
      setw(0x5B1A, 0x0B16);
      P.show_name({ de: 0xC6B2, b: 12 });
      if (M[0xC6B2] === M[NAME]) { P.print_tape_status({ a: 2 }); return { a: 1, zf: false }; }
      P.print_tape_status({ a: 1 });
    }
  });

  // the record of the wizard chosen on the panel: $CEA4 + 70 x (choice + 1)
  const chosen = () => { const n = ((M[CHOICE] + 1) & 255) || 256; return (0xCEA4 + 70 * n) & 0xFFFF; };
  def(0xC6BE, 'save_wizard', r => {
    P.set_extension({ hl: 0xC64D });
    P.save_header({});
    const hl = chosen();
    return P.tape_save({ ix: hl, de: 70, b: 0xC8 });
  });
  def(0xC6E1, 'load_wizard', function* (r) {
    P.set_extension({ hl: 0xC64D });
    if ((yield* P.find_file({})).zf) return { zf: true };
    const hl = chosen();
    setw(0x5B04, hl);
    return yield* P.tape_load({ ix: hl, de: 70, b: 0xC8 });
  });

  // load_scenario: the file name asked for, the file found (extension GAM) and $2FFD bytes loaded
  // at $D003, the scenario's code and data; the panel starts again when it worked.
  def(0xC708, 'load_scenario', function* (r) {
    yield* P.ask_file_name({});
    P.set_extension({ hl: 0xC653 });
    yield* P.find_file({});
    yield* P.tape_load({ ix: 0xD003, de: 0x2FFD, b: 0xC8 });
    if (M[TAPE_ERROR]) return { a: M[TAPE_ERROR], zf: false };
    P.part = M[0xD03F];
    return P.restart(0xCC39);
  });

  // load_designer: the file DESIGNER. found and $0E45 bytes loaded at $D3DC, where the designer
  // starts.
  def(0xC728, 'load_designer', function* (r) {
    yield* P.wait_release({});
    for (let i = 0; i < 12; i++) M[NAME + i] = M[0xC656 + i];
    yield* P.find_file({});
    yield* P.tape_load({ ix: 0xD3DC, de: 0x0E45, b: 0xC8 });
    if (M[TAPE_ERROR]) return { a: M[TAPE_ERROR], zf: false };
    P.part = 0;
    return P.restart(0xD3DC);
  });

  // save_game: a header (extension SVG), the object table and the creature records ($0514 bytes
  // from $5B5A), and $CEEA to $FFFE.
  def(0xC74D, 'save_game', function* (r) {
    yield* P.ask_file_name({});
    P.set_extension({ hl: 0xC650 });
    P.save_header({});
    P.tape_save({ ix: 0x5B5A, de: 0x0514, b: 0xC8 });
    P.delay_255({});
    return P.tape_save({ ix: 0xCEEA, de: 0x3115, b: 0xC8 });
  });
  // load_game: the two blocks loaded back and the turn loop entered; a failure goes back to the panel.
  def(0xC775, 'load_game', function* (r) {
    P.io.sp = 0xFFF3;
    yield* P.ask_file_name({});
    P.set_extension({ hl: 0xC650 });
    if ((yield* P.find_file({})).zf) return P.restart(0xCC39);
    yield* P.tape_load({ ix: 0x5B5A, de: 0x0514, b: 0xC8 });
    if (M[TAPE_ERROR]) return P.restart(0xCC39);
    yield* P.tape_load({ ix: 0xCEEA, de: 0x3115, b: 0xC8 });
    if (M[TAPE_ERROR]) return P.restart(0xCC39);
    P.part = M[0xD03F];
    return P.restart(0x6134);
  });

  // print_tape_status: SEARCHING:, LOADING: or FILE NAME: (A = 1 to 3) on row $16, double height.
  def(0xC893, 'print_tape_status', r => {
    M[0x5B14] = 8;
    setw(0xFFFB, 0xC8BA); setw(0xFFFD, 0xC8C3); setw(0x5B0E, 0x3C00);
    setw(0x5B1A, 0x0016); setw(0x5B17, 0x4444);
    return P.print_message(r);
  });

  // end_of_turn_menu: CONTINUE, SAVE GAME or ABANDON at the end of a game turn. CONTINUE goes back to
  // the turn loop; ABANDON forgets the scenario and goes to the file panel; SAVE GAME saves, but only
  // five times in a game against the computer, the menu coming back after that.
  def(0xC8E4, 'end_of_turn_menu', function* (r) {
    for (;;) {
      P.fill_screen({ a: 0x46 });
      P.print_text_big({ a: 0xE8 });
      M[0x5B17] = 0x42;
      P.draw_frame({ hl: 0x0908, de: 0x160F });
      M[CHOICE] = 0; M[0x5B0B] = 0;
      P.highlight_file_option({});
      M[0x5B0A] = 3;
      yield* P.run_file_menu({});
      const a = M[CHOICE];
      if (!a) return P.restart(0x6134);
      if (a === 2) {
        M[0xD03F] = 0;
        if (M[0xD064]) { M[0xCF77] = 0; M[0xCFBD] = 0; }
        return P.restart(0xCC39);
      }
      if (M[0xD064]) {
        if (M[0xD068] === 5) continue;
        M[0xD068]++;
      }
      return yield* P.save_game({});
    }
  });

  // random_wizard: a wizard made at random in record $5B04: 80 mana, level 0, each of the 45 spells
  // at a level from 0 to 2 (random_below), the standard figures and the name WIZARD and the player.
  def(0xC941, 'random_wizard', r => {
    let hl = w(0x5B04);
    M[hl] = 0x50; M[(hl + 1) & 0xFFFF] = 0;
    hl = (hl + 2) & 0xFFFF;
    M[0x5B22] = 3;
    for (let i = 0; i < 0x2D; i++) {
      const a = P.random_below({}).a;
      M[hl] = ((a << 4) | (a >> 4)) & 255;
      hl = (hl + 1) & 0xFFFF;
    }
    for (let i = 0; i < 0x17; i++) M[(hl + i) & 0xFFFF] = M[0xC973 + i];
    M[(w(0x5B04) + 0x41) & 0xFFFF] = (M[0x5B11] + 0x30) & 255;
    return {};
  });

  // draw_frame: a frame in the game's own font from row L, column H to row E, column D: the corners,
  // the top and bottom, the sides.
  def(0xC98A, 'draw_frame', r => {
    setw(0x5B00, r.hl); setw(0x5B02, r.de);
    setw(0x5B0E, 0x9531); M[0x5B14] = 1;
    const ch = a => P.print_char_small({ a });
    setw(0x5B15, w(0x5B00)); ch(1);
    setw(0x5B15, w(0x5B02)); ch(8);
    M[0x5B15] = M[0x5B00]; ch(3);
    M[0x5B15] = M[0x5B02]; M[0x5B16] = M[0x5B01]; ch(6);
    let b = (M[0x5B03] - M[0x5B01] - 1) & 255;
    M[0x5B16] = (M[0x5B01] + 1) & 255;
    do {
      M[0x5B15] = M[0x5B00]; ch(2);
      M[0x5B15] = M[0x5B02]; ch(2);
      M[0x5B16] = (M[0x5B16] + 1) & 255;
      b = (b - 1) & 255;
    } while (b);
    b = (M[0x5B02] - M[0x5B00] - 1) & 255;
    M[0x5B15] = (M[0x5B00] + 1) & 255;
    do {
      M[0x5B16] = M[0x5B01]; ch(4);
      M[0x5B16] = M[0x5B03]; ch(4);
      M[0x5B15] = (M[0x5B15] + 1) & 255;
      b = (b - 1) & 255;
    } while (b);
    return {};
  });

  // classify_step: a step of the selected creature to square HL, into $FF8F, keeping the square
  // ($FF8A), its map address ($FF8C) and terrain ($FF91): 4 an enemy there at the creature's height
  // (3 when it has a partner on its square and did not just dismount); otherwise 7 just dismounted
  // in the air; 0 a square it cannot enter; 1 too few action points, 2 too little stamina; 5 a step
  // it can take, 6 when it is engaged.
  def(0xCA2B, 'classify_step', r => {
    setw(0xFF8A, r.hl);
    const t = P.what_is_at({ hl: r.hl }).a;
    setw(0xFF8C, w(0x5B3B));
    M[0xFF91] = t;
    P.find_creatures_any({ hl: w(0xFF8A) });
    const done = v => { M[0xFF8F] = v; return { a: v }; };
    enemy: if (M[0xD1AE]) {
      let ix = w(0xD1AF);
      setw(0xFF28, ix); M[0xFF2A] = M[0xD1B1];
      if (M[ix + 4] !== M[0x5B2F]) {
        if (!M[0xD1B2]) break enemy;
        ix = w(0xD1B3);
        setw(0xFF28, ix); M[0xFF2A] = M[0xD1B5];
      }
      if (H.mine(H.crec(M[ix + 5]))) break enemy;
      done(4);
      if (M[0x5B43]) return { a: 4 };
      if (!P.find_partner({}).zf) return { a: 4 };
      return done(3);
    }
    if (M[0x5B43] === 0xFE) return done(7);
    if (M[0x5B54] === 0xA5) M[0xFF8E] = 4;
    else {
      const iy = P.terrain_record_here({}).iy;
      M[0xFF8E] = M[iy];
      const kinds = (M[(w(0x5B52) + 0x0B) & 0xFFFF] & 0x70) >> 4;
      if (kinds && (M[(iy + 4) & 0xFFFF] & 7 & kinds)) M[0xFF8E] = 4;
      if (M[0x5B2F] !== 0xFF) {
        if (M[(iy + 4) & 0xFFFF] & 8) return done(0);
        M[0xFF8E] = 4;
      }
      if (M[0xFF8E] === 0xFF) return done(0);
    }
    if (M[0xFF92]) M[0xFF8E] = ((M[0xFF8E] >> 1) + M[0xFF8E]) & 255;
    const ix = w(0x5B50);
    if (M[ix] < M[0xFF8E]) return done(1);
    if (M[(ix + 1) & 0xFFFF] < (M[0xFF8E] >> 1)) return done(2);
    done(5);
    if (!(M[(ix + 4) & 0xFFFF] & 0x10)) return { a: 5 };
    return done(6);
  });

  // run_file_menu: up and down move the bar over the $5B0A options (wrapping round), with the key
  // repeat; fire chooses, with sound 0.
  def(0xCB2C, 'run_file_menu', function* (r) {
    yield* P.wait_release({});
    for (;;) {
      yield* P.read_controls({});
      const a = M[0x5B13];
      if (!(a & 1)) { P.sound_0({}); return { hl: CHOICE }; }
      if (!(a & 2)) {
        P.highlight_file_option({});
        const v = M[CHOICE] - 1;
        M[CHOICE] = v < 0 ? (M[0x5B0A] - 1) & 255 : v;
        P.highlight_file_option({});
      } else if (!(a & 4)) {
        P.highlight_file_option({});
        M[CHOICE] = (M[CHOICE] + 1) & 255;
        if (M[CHOICE] >= M[0x5B0A]) M[CHOICE] = 0;
        P.highlight_file_option({});
      }
      yield* P.key_repeat_slow({});
    }
  });

  // draw_file_panel: the title (message $E6) with the scenario's number ($D03F, or message $E7 for
  // none) in one frame, the four wizards in another.
  def(0xCB6B, 'draw_file_panel', r => {
    P.clear_screen({});
    P.fill_screen({ a: 0x46 });
    P.print_text_big({ a: 0xE6 });
    setw(0x5B1A, 0x1601); setw(0x5B15, 0x1601); setw(0x5B17, 0x0747);
    if (!M[0xD03F]) P.print_text_big({ a: 0xE7 }); else P.print_number({ a: M[0xD03F] });
    M[0x5B17] = 0x44;
    P.draw_frame({ hl: 0x0400, de: 0x1B03 });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x100A, de: 0x1F13 });
    return P.list_wizards({});
  });

  // list_wizards: the four wizards from row $11 up, two rows each: a slot whose record has a level
  // shows the name (copied into the scenario's names, message $8C + the player) and the level; an
  // empty one, message $E7.
  def(0xCBB7, 'list_wizards', r => {
    setw(0x5B1A, 0x1111);
    for (let b = 4; b; b--) {
      M[0x5B11] = b;
      const hl = H.wrec(b);
      setw(0x5B04, hl);
      if (M[(hl + 1) & 0xFFFF]) {
        P.copy_wizard_name({ hl: (hl + 1) & 0xFFFF, a: M[(hl + 1) & 0xFFFF], b });
        P.clear_name_lines({ a: 0x46 });
        P.print_text_big({ a: (b + 0x8C) & 255 });
        setw(0x5B15, (w(0x5B1A) + 0x0B00) & 0xFFFF);
        P.print_number({ a: M[(w(0x5B04) + 1) & 0xFFFF] });
      } else {
        P.clear_name_lines({ a: 0x42 });
        P.print_text_big({ a: 0xE7 });
      }
      M[0x5B1A] = (M[0x5B1A] - 2) & 255;
    }
    return {};
  });

  // clear_name_lines: two rows of fourteen spaces from the start of the line, in attribute A.
  def(0xCC09, 'clear_name_lines', r => {
    M[0x5B17] = M[0x5B18] = r.a;
    setw(0x5B15, w(0x5B1A)); setw(0x5B0E, 0x3C00);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 14; i++) { P.print_char_small({ a: 0x20 }); M[0x5B16] = (M[0x5B16] + 1) & 255; }
      M[0x5B16] = M[0x5B1B];
      M[0x5B15] = (M[0x5B15] + 1) & 255;
    }
    return {};
  });

  // file_panel: the scenario's file panel, in IM 1 with the stack at $606E: PLAY GAME, LOAD
  // SCENARIO, LOAD DESIGNER, LOAD WIZARD, LOAD SAVED GAME, SAVE WIZARD; the option chosen kept in
  // panel_value_1 while it runs.
  def(0xCC39, 'file_panel', function* (r) {
    P.io.sp = 0x606E;
    P.IM = 1;
    P.draw_file_panel({});
    M[CHOICE] = M[0xC663] = M[0xC664] = 0;
    M[0x5B0B] = 1;
    P.highlight_file_option({});
    for (;;) {
      M[0x5B0B] = 1; M[0x5B0A] = 6;
      yield* P.run_file_menu({});
      M[0xC663] = M[CHOICE];
      yield* P.file_action({ a: M[CHOICE] });
      M[CHOICE] = M[0xC663];
    }
  });
  def(0xCC71, 'file_action', function* (r) {
    const at = w((0xCC7C + ((2 * r.a) & 255)) & 0xFFFF);
    return yield* P.jumpGen(at, { a: (2 * r.a) & 255, hl: at, de: (0xCC7C + ((2 * r.a) & 255) + 1) & 0xFFFF });
  });

  // load_wizard_menu: a slot chosen (the last used first), the file name asked for and the wizard
  // loaded; a failed load leaves the slot empty. The list is drawn again.
  def(0xCC88, 'load_wizard_menu', function* (r) {
    M[0x5B0B] = 2; M[CHOICE] = M[0xC664]; M[0x5B0A] = 4;
    P.highlight_file_option({});
    yield* P.run_file_menu({});
    yield* P.ask_file_name({});
    yield* P.load_wizard({});
    if (M[TAPE_ERROR]) M[(w(0x5B04) + 1) & 0xFFFF] = 0;
    P.list_wizards({});
    P.clear_message_line({});
    M[0xC664] = M[CHOICE];
    return {};
  });

  // save_wizard_menu: a slot chosen and, when it holds a wizard, saved under the first word of its
  // name, at most seven letters, and its level as a digit (10 and up as A, B ...).
  def(0xCCBD, 'save_wizard_menu', function* (r) {
    M[0x5B0B] = 2; M[CHOICE] = M[0xC664]; M[0x5B0A] = 4;
    P.highlight_file_option({});
    yield* P.run_file_menu({});
    const rec = H.wrec0(M[CHOICE]);
    setw(0x5B04, rec);
    if (M[(rec + 1) & 0xFFFF]) {
      const n = ((M[CHOICE] + 1) & 255) || 256;
      const from = (w(0xD03A) + 11 * n) & 0xFFFF;
      for (let i = 0; i < 8; i++) M[NAME + i] = M[(from + i) & 0xFFFF];
      for (let i = 0; i < 8; i++) if (M[NAME + i] === 0xFA) M[NAME + i] = 0x20;
      let hl = NAME, b = 7;
      for (; b; b--, hl++) if (M[hl] === 0x20) break;
      if (b) for (let i = 1; i <= b; i++) M[hl + i] = 0x20;
      const lv = M[(rec + 1) & 0xFFFF];
      M[hl] = (lv < 10 ? lv + 0x30 : lv + 0x37) & 255;
      P.save_wizard({});
    }
    P.highlight_file_option({});
    M[0xC664] = M[CHOICE];
    return {};
  });

  // ask_file_name: up to eight characters into the file name through KEY-SCAN and the key table
  // ($CDD9): ENTER ends it, the 0 key rubs out the last, a key the table has no character for does
  // nothing; each key gives sound 0 and waits until it is let go.
  def(0xCD3A, 'ask_file_name', function* (r) {
    P.print_tape_status({ a: 3 });
    setw(0x5B1A, 0x0B16);
    yield* P.wait_release({});
    for (let i = 0; i < 8; i++) M[NAME + i] = 0x20;
    setw(0x5B17, 0x4646);
    P.show_file_name({});
    M[0xFF65] = 0;
    for (;;) {
      const e = (yield* P.key_scan({})).e & 255;
      if (e === 0x21) return { a: e, zf: true };
      if (e >= 0x27) continue;
      if (e === 0x23) {
        if (!M[0xFF65]) continue;
        M[0xFF65]--;
        M[NAME + M[0xFF65]] = 0x20;
      } else {
        if (M[0xFF65] === 8) continue;
        const a = M[0xCDD9 + e];
        if (!a) continue;
        M[NAME + M[0xFF65]] = a;
        M[0xFF65]++;
        P.sound_0({});
      }
      P.show_file_name({});
      while (((yield* P.key_scan({})).e & 255) !== 0xFF);
    }
  });

  // show_file_name, show_name: B characters from DE in double height from the start of the line, in
  // attribute $46, $FA as a space.
  const showName = (de, b) => {
    setw(0x5B17, 0x4646);
    setw(0x5B15, w(0x5B1A));
    do {
      let a = M[de];
      if (a === 0xFA) a = 0x20;
      P.print_char_big({ a });
      M[0x5B16] = (M[0x5B16] + 1) & 255;
      de = (de + 1) & 0xFFFF;
      b = (b - 1) & 255;
    } while (b);
    return { de, b: 0, hl: 0x5B16 };
  };
  def(0xCDB6, 'show_file_name', r => showName(NAME, 8));
  def(0xCDBB, 'show_name', r => showName(r.de, r.b));
};
})(typeof window !== 'undefined' ? window : globalThis);
