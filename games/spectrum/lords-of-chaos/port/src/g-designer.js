// The wizard designer (part 0, $D3DC-$E220): SELECT CONTROLS at the hand-over, the designer's file
// panel and its options (design, load, save and delete a wizard, and the engine's LOAD SCENARIO and
// LOAD SAVED GAME), and the design screens: NAME, CHARACTER (seven figures bought with experience
// points) and SPELLS (45 levels bought the same way). The interrupts stay off throughout.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.designer = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const def = (a, name, f) => P.def(a, name, f, [0]);
  const CHOICE = 0xC662, VALUE1 = 0xC663, VALUE2 = 0xC664, EXP = 0xDC7F, ORIGINAL = 0xDC81, SPELL_BYTE = 0xDC82;
  const START = 0xDCE2, CURRENT = 0xDCE9, MOST = 0xDCF0, COSTS = 0xDCF7, DIVISORS = 0xDCFE, NAME_PTR = 0xDF66, DESIGN = 0xE1EC;
  // the ink and paper of an attribute swapped, bright on, flash off
  const swap = v => ((v >> 3) & 7) | ((v & 7) << 3) | 0x40;
  // rows of attribute cells swapped from row 1 + choice (two rows a choice) down, as the game's
  // three highlights do
  const highlight = (base, choice, width) => {
    let hl = (base + 0x40 * ((choice + 1) & 255 || 256)) & 0xFFFF;
    for (let b = 2; b; b--) {
      for (let k = width; k; k--, hl = (hl + 1) & 0xFFFF) M[hl] = swap(M[hl]);
      hl = (hl + 32 - width) & 0xFFFF;
    }
    return { hl, b: 0 };
  };
  // a slot of designer_names: $D85A plus eleven a player (B a count: 0 is 256)
  const slot = p => (0xD85A + 11 * ((p & 255) || 256)) & 0xFFFF;

  // program_start: SELECT CONTROLS (message $3B) in a frame, a three-option menu, the choice the
  // control type ($622A); then the designer's file panel.
  def(0xE1ED, 'program_start', function* (r) {
    P.IFF = false;
    P.fill_screen({ a: 0x46 });
    P.print_designer_message({ a: 0x3B });
    M[0x5B17] = 0x44;
    P.draw_frame({ hl: 0x0608, de: 0x180F });
    M[CHOICE] = 0;
    M[0x5B0A] = M[0x5B0B] = 3;
    P.highlight_file_option({});
    yield* P.run_file_menu({});
    M[0x622A] = M[CHOICE];
    P.restart(0xD3DC);
  });

  // designer_panel: interrupts off, IM 1, the stack at $606E; the panel drawn, and its six-option
  // menu run for ever, the choice kept in panel_value_1 while its routine runs.
  def(0xD3DC, 'designer_panel', function* (r) {
    P.IFF = false;
    P.IM = 1;
    P.io.sp = 0x606E;
    P.draw_designer_panel({});
    M[CHOICE] = M[VALUE1] = M[VALUE2] = 0;
    M[0x5B0B] = 1;
    P.highlight_file_option({});
    for (;;) {
      M[0x5B0B] = 1;
      M[0x5B0A] = 6;
      yield* P.run_file_menu({});
      M[VALUE1] = M[CHOICE];
      yield* P.designer_option({ a: M[CHOICE] });
      M[CHOICE] = M[VALUE1];
    }
  });

  // designer_option: the routine for option A from designer_actions ($D422).
  def(0xD415, 'designer_option', function* (r) {
    const de = (0xD422 + twice(r.a)) & 0xFFFF;
    return yield* P.jumpGen(w(de), { hl: w(de), de: (de + 1) & 0xFFFF });
  });
  const twice = a => (2 * a) & 255;

  // draw_designer_panel: the screen yellow on black, the panel's text (message $0B), two frames, and
  // the wizards listed.
  def(0xD42E, 'draw_designer_panel', r => {
    P.clear_screen({});
    P.fill_screen({ a: 0x46 });
    P.print_designer_message({ a: 0x0B });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x0700, de: 0x1703 });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x100A, de: 0x1F13 });
    return P.list_designer_wizards({});
  });

  // list_designer_wizards: wizard 4 at row 17 up to wizard 1 at row 11, from column 17: a wizard
  // (level not 0) by name and level, an empty slot as NONE.
  def(0xD45B, 'list_designer_wizards', r => {
    setw(0x5B1A, 0x1111);
    for (let b = 4; b; b--) {
      M[0x5B11] = b;
      const hl = P.wizard_record({ a: b }).hl;
      setw(0x5B04, hl);
      if (M[(hl + 1) & 0xFFFF]) {
        P.copy_name_to_slot({});
        P.clear_name_lines({ a: 0x46 });
        P.print_designer_message({ a: (M[0x5B11] + 6) & 255 });
        setw(0x5B15, (w(0x5B1A) + 0x0B00) & 0xFFFF);
        P.print_number({ a: M[(w(0x5B04) + 1) & 0xFFFF] });
      } else {
        P.clear_name_lines({ a: 0x42 });
        P.print_designer_message({ a: 0x3A });
      }
      M[0x5B1A] = (M[0x5B1A] - 2) & 255;
    }
    return { b: 0 };
  });

  // the four options that pick a wizard slot first (layout 2, four options, from panel_value_2)
  function* pickSlot() {
    M[0x5B0B] = 2;
    M[CHOICE] = M[VALUE2];
    M[0x5B0A] = 4;
    P.highlight_file_option({});
    yield* P.run_file_menu({});
  }
  // design_wizard_option: the chosen slot designed, then the panel again from the start
  def(0xD4AD, 'design_wizard_option', function* (r) {
    yield* pickSlot();
    M[0x5B11] = (M[CHOICE] + 1) & 255;
    yield* P.design_wizard({});
    M[VALUE2] = M[CHOICE];
    P.restart(0xD3DC);
  });
  // load_wizard_option: a file name asked for and the wizard loaded into the slot; a tape error
  // empties the slot.
  def(0xD4D6, 'load_wizard_option', function* (r) {
    yield* pickSlot();
    yield* P.ask_file_name({});
    yield* P.load_wizard({});
    if (M[0xC5E4]) M[(w(0x5B04) + 1) & 0xFFFF] = 0;
    P.list_designer_wizards({});
    P.clear_message_line({});
    M[VALUE2] = M[CHOICE];
    return { a: M[CHOICE] };
  });
  // save_wizard_option: a slot with a wizard saved under its name's first eight characters, blanks
  // as spaces, the level's digit (A-Z past 9) at the first space within seven or else eighth.
  def(0xD50B, 'save_wizard_option', function* (r) {
    yield* pickSlot();
    const rec = P.wizard_record_0({ a: M[CHOICE] }).hl;
    setw(0x5B04, rec);
    if (M[(rec + 1) & 0xFFFF]) {
      const from = slot((M[CHOICE] + 1) & 255);
      for (let i = 0; i < 8; i++) M[0xC637 + i] = M[(from + i) & 0xFFFF];
      for (let i = 0; i < 8; i++) if (M[0xC637 + i] === 0xFA) M[0xC637 + i] = 0x20;
      let hl = 0xC637, b = 7;
      for (; b; b--, hl++) if (M[hl] === 0x20) break;
      if (b) for (let k = 1; k <= b; k++) M[hl + k] = 0x20;
      const lv = M[(w(0x5B04) + 1) & 0xFFFF];
      M[hl] = (lv < 10 ? lv + 0x30 : lv + 0x37) & 255;
      P.save_wizard({});
    }
    P.highlight_file_option({});
    M[VALUE2] = M[CHOICE];
    return { a: M[CHOICE] };
  });
  // delete_wizard_option: the slot's level cleared, which empties it.
  def(0xD588, 'delete_wizard_option', function* (r) {
    yield* pickSlot();
    const rec = P.wizard_record_0({ a: M[CHOICE] }).hl;
    M[(rec + 1) & 0xFFFF] = 0;
    P.list_designer_wizards({});
    P.clear_message_line({});
    M[VALUE2] = M[CHOICE];
    return { a: M[CHOICE] };
  });

  // copy_name_to_slot: the ten characters of the name (byte 59 of the record at $5B04) into player
  // $5B11's slot of designer_names.
  def(0xD5B4, 'copy_name_to_slot', r => {
    const de = slot(M[0x5B11]), hl = (w(0x5B04) + 0x3B) & 0xFFFF;
    for (let i = 0; i < 10; i++) M[(de + i) & 0xFFFF] = M[(hl + i) & 0xFFFF];
    return { hl: (hl + 10) & 0xFFFF, de: (de + 10) & 0xFFFF, bc: 0 };
  });

  // print_number_4, print_digit_4: HL in decimal, up to four digits without leading zeros, then
  // spaces to fill four columns.
  const digit = (st, de) => {
    let a = 0;
    while (st.hl >= de) { st.hl -= de; a = (a + 1) & 255; }
    if (!a && (de & 255) !== 1 && !st.b) return;     // the units are told by DE's low byte alone
    P.print_char({ a: (a + 0x30) & 255 });
    M[0x5B16] = (M[0x5B16] + 1) & 255;
    st.b = (st.b + 1) & 255;
  };
  def(0xD5CF, 'print_number_4', r => {
    const st = { hl: (r.hl !== undefined ? r.hl : r.h << 8 | r.l) & 0xFFFF, b: 0 };
    for (const de of [1000, 100, 10, 1]) digit(st, de);
    let b = (4 - st.b) & 255;
    if (!b) return { a: 0, zf: true, hl: st.hl };
    for (; b; b = (b - 1) & 255) { P.print_char({ a: 0x20 }); M[0x5B16] = (M[0x5B16] + 1) & 255; }
    return { b: 0, hl: 0x5B16 };
  });
  def(0xD5FA, 'print_digit_4', r => {
    const st = { hl: (r.hl !== undefined ? r.hl : r.h << 8 | r.l) & 0xFFFF, b: r.b & 255 };
    const de = r.de !== undefined ? r.de : r.d << 8 | r.e;
    digit(st, de);
    return { hl: st.hl, b: st.b };
  });

  // print_designer_message: message A of the designer's own text, double height, in the ROM's font.
  def(0xD61D, 'print_designer_message', r => {
    M[0x5B14] = 8;
    P.IFF = false;
    setw(0xFFFB, 0xD639); setw(0xFFFD, 0xD6C9); setw(0x5B0E, 0x3C00);
    return P.print_message({ a: r.a });
  });

  // spells_screen: the wizard's name and the headings, arrows marking the line being changed, the
  // experience points left; the spells from the first, changed until fire is pressed.
  def(0xDABA, 'spells_screen', function* (r) {
    P.clear_screen({});
    setw(0x5B1A, 0);
    setw(0x5B17, 0x4606);
    P.print_designer_message({ a: (M[0x5B11] + 6) & 255 });
    P.print_designer_message({ a: 0x39 });
    setw(0x5B17, 0x4747);
    setw(0x5B15, 0x010B);
    P.print_char_big({ a: 0x3E });
    setw(0x5B15, 0x160B);
    P.print_char_big({ a: 0x3C });
    setw(0x5B15, 0x1000);
    P.print_number_4({ hl: w(EXP) });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x0002, de: 0x1F15 });
    M[0xFF3A] = 0;
    P.show_spells({});
    yield* P.wait_release({});
    do yield* P.spells_edit({}); while (M[0x5B13] & 1);
    return P.clear_screen({});
  });

  // show_spells: nine spells from four before the current one ($FF3A), wrapping round the 45, two
  // rows apart from row 3.
  def(0xDB24, 'show_spells', r => {
    let a = (M[0xFF3A] - 4) & 255;
    if (M[0xFF3A] < 4) a = (a + 0x2D) & 255;
    M[0xFF05] = a;
    setw(0x5B1A, 0x0203);
    for (let b = 9; b; b--) {
      P.designer_spell_line({ a: M[0xFF05] });
      M[0x5B1A] = (M[0x5B1A] + 2) & 255;
      a = (M[0xFF05] + 1) & 255;
      M[0xFF05] = a < 0x2D ? a : 0;
    }
    return { b: 0 };
  });

  // designer_spell_line: spell A's name in yellow (red at level 0), spaces to column 21, its cost in
  // green and its level in cyan.
  def(0xDB54, 'designer_spell_line', r => {
    const s = r.a & 255;
    setw(0x5B17, 0x4606);
    P.spell_figures({ a: s });
    if (!M[0xFF0B]) setw(0x5B17, 0x4202);
    P.print_designer_message({ a: (s + 0x0C) & 255 });
    M[0x5B16] = (M[0x5B16] - 1) & 255;
    let b = (0x15 - M[0x5B16]) & 255;
    for (; b; b = (b - 1) & 255) { P.print_char_big({ a: 0x20 }); M[0x5B16] = (M[0x5B16] + 1) & 255; }
    M[0x5B16] = (M[0x5B16] + 3) & 255;
    setw(0x5B17, 0x4404);
    P.print_number({ a: M[0xFF39] });
    M[0x5B16] = (M[0x5B16] + 1) & 255;
    setw(0x5B17, 0x4505);
    return P.print_number({ a: M[0xFF0B] });
  });

  // spell_figures: for spell A, spell_byte its byte in the record, original_level its full level
  // (high four bits), $FF0B its level (low four) and $FF39 what the next level costs (spell_costs:
  // a base and a step a level).
  def(0xDBA7, 'spell_figures', r => {
    const e = r.a & 255;
    const hl = (w(0x5B04) + e + 2) & 0xFFFF;
    setw(SPELL_BYTE, hl);
    M[ORIGINAL] = M[hl] >> 4;
    const lv = M[hl] & 0x0F;
    M[0xFF0B] = lv;
    const t = (0xDC84 + 2 * e) & 0xFFFF;
    let a = M[t];
    const c = M[(t + 1) & 0xFFFF];
    for (let b = lv; b; b--) a = (a + c) & 255;
    M[0xFF39] = a;
    return { a, b: 0, c, hl: (t + 1) & 0xFFFF, de: e };
  });

  // spells_edit: the controls read until fire (sound 0): down and up move through the spells,
  // wrapping; right buys a level (below 8, if the points cover it), left sells one back (not below
  // its full level), the points and the spells shown again.
  def(0xDBD7, 'spells_edit', function* (r) {
    for (;;) {
      yield* P.read_controls({});
      const k = M[0x5B13];
      if (!(k & 1)) return P.sound_0({});
      let redraw = false, bought = false;
      if (!(k & 4)) { const a = (M[0xFF3A] + 1) & 255; M[0xFF3A] = a < 0x2D ? a : 0; redraw = true; }
      else if (!(k & 2)) { const a = (M[0xFF3A] - 1) & 255; M[0xFF3A] = a === 0xFF ? 0x2C : a; redraw = true; }
      else if (!(k & 8)) {
        P.spell_figures({ a: M[0xFF3A] });
        if (M[0xFF0B] !== 8 && w(EXP) >= M[0xFF39]) {
          setw(EXP, w(EXP) - M[0xFF39]);
          const s = w(SPELL_BYTE);
          M[s] = (M[s] + 1) & 255;
          bought = true;
        }
      } else if (!(k & 0x10)) {
        P.spell_figures({ a: M[0xFF3A] });
        if (M[0xFF0B] !== M[ORIGINAL]) {
          const s = w(SPELL_BYTE);
          M[s] = (M[s] - 1) & 255;
          P.spell_figures({ a: M[0xFF3A] });
          setw(EXP, (w(EXP) + M[0xFF39]) & 0xFFFF);
          bought = true;
        }
      }
      if (bought) {
        setw(0x5B17, 0x4707);
        setw(0x5B15, 0x1000);
        P.print_number_4({ hl: w(EXP) });
        P.show_spells({});
        P.sound_0({});
      } else if (redraw) P.show_spells({});
      yield* P.key_repeat({});
    }
  });

  // unused_DCDE: wizard_record, which nothing calls here.
  def(0xDCDE, 'unused_DCDE', r => P.wizard_record(r));

  // character_screen: the seven figures with their costs, the one chosen highlighted; up and down
  // choose, right buys a point (not past the most, if the points cover it), left sells one back (not
  // below the figure as designing began, refunding the lower figure's cost); fire leaves.
  def(0xDD05, 'character_screen', function* (r) {
    P.io.out(0xFE, 0, P.T);
    P.clear_screen({});
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x0100, de: 0x1E17 });
    P.print_designer_message({ a: 2 });
    setw(0x5B17, 0x4606);
    setw(0x5B1A, 0x0A02);
    P.print_designer_message({ a: (M[0x5B11] + 6) & 255 });
    setw(0x5B15, 0x1B02);
    P.print_number({ a: M[(w(0x5B04) + 1) & 0xFFFF] });
    M[CHOICE] = 0;
    for (let k = 0; k < 7; k++) { P.figure_cost({ c: M[CURRENT + k] }); M[CHOICE] = (M[CHOICE] + 1) & 255; }
    setw(0x5B17, 0x4505);
    P.print_figures({});
    M[CHOICE] = 0;
    P.highlight_figure({});
    yield* P.wait_release({});
    for (;;) {
      yield* P.read_controls({});
      const k = M[0x5B13];
      if (!(k & 1)) return { a: k, zf: true };
      const i = M[CHOICE];
      if (!(k & 2)) {
        P.highlight_figure({});
        M[CHOICE] = i ? i - 1 : 6;
        P.highlight_figure({});
      } else if (!(k & 4)) {
        P.highlight_figure({});
        M[CHOICE] = i + 1 === 7 ? 0 : (i + 1) & 255;
        P.highlight_figure({});
      } else if (!(k & 8)) {
        const f = (CURRENT + i) & 0xFFFF, cost = M[(COSTS + i) & 0xFFFF];
        if (M[f] !== M[(MOST + i) & 0xFFFF] && w(EXP) >= cost) {
          setw(EXP, w(EXP) - cost);
          M[f] = (M[f] + 1) & 255;
          P.figure_cost({ c: M[f] });
          P.print_figures({});
          P.sound_0({});
        }
      } else if (!(k & 0x10)) {
        const f = (CURRENT + i) & 0xFFFF;
        if (M[f] !== M[(START + i) & 0xFFFF]) {
          M[f] = (M[f] - 1) & 255;
          P.figure_cost({ c: M[f] });
          setw(EXP, (w(EXP) + M[(COSTS + i) & 0xFFFF]) & 0xFFFF);
          P.print_figures({});
          P.sound_0({});
        }
      }
      yield* P.key_repeat_slow({});
    }
  });

  // print_figures: the experience points at row 5, column 14, the seven figures down column 21 and
  // their costs down column 25, from row 8, two rows apart.
  def(0xDE21, 'print_figures', r => {
    setw(0x5B15, 0x0E05);
    P.print_number_4({ hl: w(EXP) });
    let hl = CURRENT;
    M[0x5B1B] = 0x15;
    for (let b = 2; b; b--) {
      M[0x5B1A] = 8;
      for (let k = 7; k; k--) {
        setw(0x5B15, w(0x5B1A));
        P.print_number({ a: M[hl] });
        M[0x5B1A] = (M[0x5B1A] + 2) & 255;
        hl++;
      }
      hl = COSTS;
      M[0x5B1B] = 0x19;
    }
    return { b: 0, hl };
  });

  // highlight_figure: two rows of 17 cells from column 3 of row 8 + 2 x the choice swapped.
  def(0xDE61, 'highlight_figure', r => highlight(0x58C3, M[CHOICE], 0x11));

  // figure_cost: what raising figure $C662 costs: C, the figure, over its divisor.
  def(0xDE95, 'figure_cost', r => {
    const i = M[CHOICE];
    const b = M[(DIVISORS + i) & 0xFFFF];
    const a = P.divide({ a: r.c & 255, b }).a;
    M[(COSTS + i) & 0xFFFF] = a;
    return { a, b, hl: (COSTS + i) & 0xFFFF, de: i };
  });

  // name_screen: ENTER NAME, the name shown, and the keyboard read through the ROM's KEY-SCAN:
  // ENTER ends; DELETE (CAPS SHIFT and 0's code here) takes the last character off; a letter or
  // SPACE (name_keys, $DF68) is added up to ten; each change waits for the keys to be let go.
  def(0xDEAB, 'name_screen', function* (r) {
    P.clear_screen({});
    P.print_designer_message({ a: 3 });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x090A, de: 0x160F });
    setw(0x5B17, 0x4606);
    P.show_name_entry({});
    yield* P.wait_release({});
    let hl = (w(0x5B04) + 0x3B) & 0xFFFF;
    setw(NAME_PTR, hl);
    let c = 0;
    for (let b = 10; b; b--, hl = (hl + 1) & 0xFFFF, c++) if (M[hl] === 0xFA) break;
    M[CHOICE] = c;
    for (;;) {
      const e = (yield* P.key_scan({})).e & 255;
      if (e === 0x21) return P.sound_0({});
      if (e >= 0x27) continue;
      if (e === 0x23) {
        if (!M[CHOICE]) continue;
        M[CHOICE] = (M[CHOICE] - 1) & 255;
        M[(w(NAME_PTR) + M[CHOICE]) & 0xFFFF] = 0xFA;
      } else {
        if (M[CHOICE] === 0x0A) continue;
        const a = M[(0xDF68 + e) & 0xFFFF];
        if (!a) continue;
        M[(w(NAME_PTR) + M[CHOICE]) & 0xFFFF] = a;
        M[CHOICE] = (M[CHOICE] + 1) & 255;
      }
      P.show_name_entry({});
      P.sound_0({});
      while (((yield* P.key_scan({})).e & 255) !== 0xFF);
    }
  });

  // show_name_entry: the name copied to its slot and printed at row 12, column 11, then spaces to
  // column 22.
  def(0xDF41, 'show_name_entry', r => {
    P.copy_name_to_slot({});
    setw(0x5B1A, 0x0B0C);
    P.print_designer_message({ a: (M[0x5B11] + 6) & 255 });
    M[0x5B16] = (M[0x5B16] - 1) & 255;
    let b = (0x16 - M[0x5B16]) & 255;
    do { P.print_char_big({ a: 0x20 }); M[0x5B16] = (M[0x5B16] + 1) & 255; b = (b - 1) & 255; } while (b);
    return { b: 0, hl: 0x5B16 };
  });

  // unused_highlight: two rows of twelve cells from column 2 of row 3 + 2 x the choice swapped.
  def(0xDF8F, 'unused_highlight', r => highlight(0x5822, M[CHOICE], 0x0C));

  // unused_things: the experience points at row 11, column 17, then a grid of things two columns
  // (24, 28) by five rows from row 2, one for each byte not 0 from byte 69 of the wizard record on,
  // an empty block for each place left over.
  def(0xDFC3, 'unused_things', r => {
    setw(0x5B15, 0x110B);
    setw(0x5B17, 0x4707);
    setw(0x5B0E, 0x3C00);
    M[0x5B14] = 9;
    P.print_number_4({ hl: w(EXP) });
    M[0xFFF7] = 0x44;
    setw(0xD0D5, 0x1802);
    for (let b = 5; b; b--) {
      for (let c = 2; c; c--) {
        for (;;) {
          const a = (M[0xFFF7] + 1) & 255;
          M[0xFFF7] = a;
          if (a >= 0x4F) { P.draw_block_at({ a: 0, b: 0 }); break; }
          const hl = (w(0x5B04) + a) & 0xFFFF;
          if (!M[hl]) continue;
          P.draw_thing_at({ a: M[hl], hl, de: a, b: c });
          break;
        }
        M[0xD0D6] = 0x1C;
      }
      M[0xD0D6] = 0x18;
      M[0xD0D5] = (M[0xD0D5] + 4) & 255;
    }
    return { b: 0 };
  });

  // design_wizard: player $5B11's wizard designed. An empty slot becomes a new wizard first (spells
  // at 0, mana 80, level 1, new_wizard_figures, a name of blanks, a score of 150); each spell's level
  // taken back to its full level, the seven figures copied out (only six into the ones being
  // changed: magic resistance keeps what it had there), the points four times the score. Then the
  // menu: NAME, CHARACTER, SPELLS and EXIT.
  def(0xE037, 'design_wizard', function* (r) {
    const rec = P.wizard_record({ a: M[0x5B11] }).hl;
    setw(0x5B04, rec);
    if (!M[(rec + 1) & 0xFFFF]) {
      for (let i = 0; i < 0x2D; i++) M[(rec + 2 + i) & 0xFFFF] = M[(rec + 1 + i) & 0xFFFF];
      M[rec] = 0x50;
      M[(rec + 1) & 0xFFFF] = 1;
      for (let i = 0; i < 12; i++) M[(rec + 0x2F + i) & 0xFFFF] = M[0xE02B + i];
      for (let i = 0; i < 10; i++) M[(rec + 0x3B + i) & 0xFFFF] = 0xFA;
      M[(rec + 0x45) & 0xFFFF] = 0x96;
    }
    for (let i = 0, p = (w(0x5B04) + 2) & 0xFFFF; i < 0x2D; i++, p = (p + 1) & 0xFFFF) { const c = M[p] & 0xF0; M[p] = c | (c >> 4); }
    const iy = w(0x5B04);
    [0, 0x2F, 0x31, 0x32, 0x33, 0x34, 0x35].forEach((o, k) => { M[START + k] = M[(iy + o) & 0xFFFF]; });
    for (let k = 0; k < 6; k++) M[CURRENT + k] = M[START + k];
    setw(EXP, 4 * M[(iy + 0x45) & 0xFFFF]);
    P.copy_name_to_slot({});
    M[DESIGN] = 0;
    for (;;) {
      P.clear_screen({});
      M[0x5B17] = 0x43;
      P.draw_frame({ hl: 0x0907, de: 0x1612 });
      P.print_designer_message({ a: 6 });
      setw(0x5B17, 0x4707);
      setw(0x5B15, 0x1303);
      P.print_number({ a: M[0x5B11] });
      P.highlight_design_option({});
      yield* P.wait_release({});
      for (;;) {
        yield* P.read_controls({});
        const k = M[0x5B13];
        if (!(k & 2)) {
          P.highlight_design_option({});
          M[DESIGN] = M[DESIGN] ? M[DESIGN] - 1 : 3;
          P.highlight_design_option({});
        } else if (!(k & 4)) {
          P.highlight_design_option({});
          M[DESIGN] = M[DESIGN] + 1 === 4 ? 0 : (M[DESIGN] + 1) & 255;
          P.highlight_design_option({});
        } else if (!(k & 1)) {
          P.sound_0({});
          if (M[DESIGN] === 3) return P.design_exit({});
          yield* P.run_design_action({});
          break;
        }
        yield* P.key_repeat_slow({});
      }
    }
  });

  // design_exit: the figures back into the record, its worth in victory points four times its level
  // plus 15, its score the points left over four, each spell's full level its level now.
  def(0xE14B, 'design_exit', r => {
    const iy = w(0x5B04);
    [0, 0x2F, 0x31, 0x32, 0x33, 0x34, 0x35].forEach((o, k) => { M[(iy + o) & 0xFFFF] = M[CURRENT + k]; });
    M[(iy + 0x39) & 0xFFFF] = (twice(twice(M[(iy + 1) & 0xFFFF])) + 0x0F) & 255;
    M[(iy + 0x45) & 0xFFFF] = (w(EXP) >> 2) & 255;
    for (let i = 0, p = (iy + 2) & 0xFFFF; i < 0x2D; i++, p = (p + 1) & 0xFFFF) { const c = M[p] & 0x0F; M[p] = c | (c << 4); }
    return { b: 0 };
  });

  // run_design_action: the routine for design_choice from design_actions ($E1A2).
  def(0xE1A8, 'run_design_action', function* (r) {
    const de = (0xE1A2 + twice(M[DESIGN])) & 0xFFFF;
    return yield* P.jumpGen(w(de), { hl: w(de), de: (de + 1) & 0xFFFF });
  });

  // highlight_design_option: two rows of ten cells from column 11 of row 9 + 2 x design_choice.
  def(0xE1B8, 'highlight_design_option', r => highlight(0x58EB, M[DESIGN], 0x0A));
};
})(typeof window !== 'undefined' ? window : globalThis);
