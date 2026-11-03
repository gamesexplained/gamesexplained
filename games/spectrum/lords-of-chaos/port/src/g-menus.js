// The menus and the game's set-up and end ($8CFA-$9341, $C92D): the cursor menu and its options
// (NEXT, INFORM), the menu list built option by option and run with a highlight bar, the waits for
// the controls, a creature made the selected one and its figures worked out, the portal's turn and
// the end of the game.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.menus = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw, H = P.H = P.H || {};
  const djnzT = n => ((n & 255) || 256) * 13 - 5;

  // set_up_game: the portal's turn ($D062, $D040 plus a random number below $D041), each player's
  // wizard made on a starting square from the list at $D072 (its own in a one-player scenario, else
  // one at random not yet taken, marked $FF), its first byte kept at $D0E0 on; with the computer
  // playing ($D064), $CF76-$D001 cleared to $FF and its wizard put on the wizard list.
  def(0x8CFA, 'set_up_game', r => {
    M[0xFF83] = 0xFE;
    M[0xD062] = (P.random_below_a({ a: M[0xD041] }).a + M[0xD040]) & 255;
    M[0x5B22] = M[0xD043];
    M[0x5B11] = 1; M[0x5B25] = 0x8C;
    let b = M[0xD067];
    do {
      const rec = P.wizard_record({ a: M[0x5B11] }).hl;
      setw(0x5B04, rec);
      P.copy_wizard_name({ hl: rec, a: M[0x5B11] });
      let p;
      for (;;) {
        const a = M[0xD048] ? (M[0x5B11] - 1) & 255 : P.random_below({}).a;
        p = (0xD072 + ((2 * a) & 255)) & 0xFFFF;
        if (M[p] !== 0xFF) break;
      }
      const sq = M[p] | M[(p + 1) & 0xFFFF] << 8;
      M[p] = 0xFF;
      setw(0x5B23, sq);
      const t = P.what_is_at({ hl: sq });
      M[0x5B10] = t.a;
      P.create_creature_any(Object.assign({}, t, { hl: sq, de: (p + 1) & 0xFFFF }));
      M[(0xD0DF + M[0x5B11]) & 0xFFFF] = M[w(0x5B04)];
      M[0x5B11] = (M[0x5B11] + 1) & 255;
      M[0x5B25] = (M[0x5B25] + 1) & 255;
      b = (b - 1) & 255;
    } while (b);
    M[0xD065] = 1;
    if (!M[0xD064]) return { a: 0, zf: true };
    for (let a = 0xCF76; a <= 0xD001; a++) M[a] = 0xFF;
    const iy = P.type_record({ a: 0x8D }).iy;
    M[0x5B1F] = 1;
    return P.add_to_wizard_list({ ix: 0x5B60, iy, a: 1 });
  });

  // portal_turn: on the portal's turn the portal ($35) appears on one of the squares at $D06A,
  // chosen at random (kept in $D060); after it the turns left ($D042) count down to the end.
  def(0x8D9D, 'portal_turn', function* (r) {
    const a = M[0xD065];
    if (a < M[0xD062]) return { a, cf: true };
    if (a === M[0xD062]) {
      const k = P.random_below_a({ a: M[0xD044] }).a;
      const p = (0xD06A + ((2 * k) & 255)) & 0xFFFF;
      const de = w(p);
      setw(0xFF88, de); setw(0xD060, de);
      M[0x5B10] = 0x35;
      return P.set_square_terrain({ a: 0x35, de, hl: (p + 1) & 0xFFFF });
    }
    const left = (M[0xD042] - 1) & 255;
    if (!left) return yield* P.game_over({});
    M[0xD042] = left;
    return { a: left };
  });

  // game_over: the scores ($D05C) become the victory points ($D058); the wizard with the most (the
  // last of those equal) named as THE WINNER IS, or NOBODY WINS; the points listed, fire awaited. A
  // designed wizard ($CEEB) that won against the computer with a score keeps it ($CF2F) and counts
  // a win. Then the scenario is unloaded and the file panel starts again ($C92D).
  def(0x8DD3, 'game_over', function* (r) {
    M[0xD063] = 0; M[0xD066] = 0;
    P.clear_screen({});
    P.start_sound({ a: 0x0E });
    for (let i = 0; i < 4; i++) M[0xD058 + i] = M[0xD05C + i];
    setw(0x5B17, 0x0747);
    let c = 0;
    for (let b = 4; b; b--) {
      const a = M[0xD058 + 4 - b];
      if (a >= c) { c = a; M[0xFF05] = (0x91 - b) & 255; }
    }
    if (c) {
      setw(0x5B1A, 0x0606);
      P.print_text_big({ a: M[0xFF05] });
      P.print_text_big({ a: 0xE4 });
    } else P.print_text_big({ a: 0xE3 });
    P.print_victory_points({});
    yield* P.wait_fire_flashing({});
    if (M[0xD064] && M[0xD05C] && M[0xFF05] === 0x8D && M[0xCEEB]) {
      M[0xCF2F] = M[0xD05C];
      M[0xCEEB] = (M[0xCEEB] + 1) & 255;
    }
    // $C92D: no scenario loaded; against the computer its two records ($CF77, $CFBD) are emptied
    M[0xD03F] = 0;
    if (M[0xD064]) { M[0xCF77] = 0; M[0xCFBD] = 0; }
    return P.restart(0xCC39);
  });

  // wait_fire_flashing: until fire is pressed, the frame redrawn in colour $FF53 with PRESS FIRE TO
  // CONTINUE, a short wait between.
  def(0x8E51, 'wait_fire_flashing', function* (r) {
    yield* P.wait_release({});
    M[0xD0DF] = 0;
    setw(0x5B0E, 0x3C00);
    for (;;) {
      yield* P.read_controls({});
      if (!(M[0x5B13] & 1)) { P.IFF = false; return { a: M[0x5B13] >> 1 | (M[0x5B13] & 1) << 7 }; }
      M[0x5B17] = P.ib(0xFF53);
      P.draw_frame({ hl: 0x0101, de: 0x1E16 });
      setw(0x5B0E, 0x3C00);
      P.print_text({ a: 0xE5 });
      P.IFF = true;
      yield { tstates: H.delayT(0x14) };
      P.IFF = false;
    }
  });

  // print_victory_points: each player's wizard, a row of dots to column 23 and its points, every
  // third row from row 10.
  def(0x8E8A, 'print_victory_points', r => {
    setw(0x5B17, 0x4303); setw(0x5B1A, 0x060A);
    let b = M[0xD067];
    M[0x5B12] = 0;
    do {
      P.print_text_big({ a: (M[0x5B12] + 0x8D) & 255 });
      M[0x5B16] = (M[0x5B16] - 1) & 255;
      do {
        P.print_char_big({ a: 0x2E });
        M[0x5B16] = (M[0x5B16] + 1) & 255;
      } while (M[0x5B16] !== 0x17);
      P.print_number({ a: M[(0xD058 + M[0x5B12]) & 0xFFFF] });
      M[0x5B12] = (M[0x5B12] + 1) & 255;
      M[0x5B1A] = (M[0x5B1A] + 3) & 255;
      b = (b - 1) & 255;
    } while (b);
    return { b: 0, hl: 0x5B1A };
  });

  // cursor_menu: fire on the map in a human's turn. SELECT-A and SELECT-G for the player's own
  // creatures on the square (flying and on the ground), NEXT, INFORM when a creature is there, BIG
  // MAP, END TURN and CANCEL; the choice run through cursor_actions ($9334), then the display put
  // back. IX and IY, as the square's description leaves them, go to the option's routine.
  def(0x8ED7, 'cursor_menu', P.frame(function* (r) {
    P.IFF = false;
    M[0xD0DF] = 1;
    const st = { ix: r.ix, iy: r.iy };
    const keep = o => { if (o) for (const k of ['ix', 'iy']) if (o[k] !== undefined) st[k] = o[k]; return o; };
    keep(P.describe_cursor_square({}));
    keep(P.fill_icon_list({}));
    keep(P.print_square_name({}));
    keep(P.clear_bars({}));
    keep(P.start_menu({}));
    const saved = { ix: st.ix, iy: st.iy };
    if (M[0x5B12] >= 0x8C) {
      P.find_creatures_any({ hl: w(0xD0D3) });
      for (const [e, n] of [[0xD1AF, 0xD1B1], [0xD1B3, 0xD1B5]]) {
        if (e === 0xD1B3 && !M[0xD1B2]) break;
        const ix = w(e);
        const iy = P.creature_record_of({ ix }).iy;
        if (!P.owner_is_player({ iy }).zf) continue;
        if (P.is_loose({ ix }).zf) P.offer_select_ground({ a: M[n], ix });
        else P.offer_select_air({ a: M[n], ix });
      }
    }
    P.add_cursor_option({ a: 1 });
    if (M[0x5B12] >= 0x8C) P.add_cursor_option({ a: 2 });
    P.add_cursor_option({ a: 3 });
    P.add_cursor_option({ a: 4 });
    P.add_cursor_option({ a: 5 });
    P.IFF = true;
    yield* P.run_menu({});
    P.IFF = false;
    yield* P.dispatch_menu({ hl: 0x9334, ix: saved.ix, iy: saved.iy });
    P.reset_ff86({});
    P.clear_bars({});
    P.clear_info_panel({});
    P.print_panel_text({ a: 1 });
    P.print_panel_text({ a: 2 });
    P.describe_cursor_square({});
    P.fill_icon_list({});
    P.print_square_name({});
    M[0xD0DF] = 3;
    P.IFF = true;
    return yield* P.wait_release({});
  }));
  // offer_select_ground, offer_select_air: the player's creature kept ($5B38 and $5B3A, $5B35 and
  // $5B37) and its option added.
  def(0x8F90, 'offer_select_ground', r => {
    M[0x5B3A] = r.a; setw(0x5B38, r.ix);
    P.add_menu_option({ a: 6 });
    return P.print_text({ a: 0xBC });
  });
  def(0x8FA2, 'offer_select_air', r => {
    M[0x5B37] = r.a; setw(0x5B35, r.ix);
    return P.add_cursor_option({ a: 0 });
  });
  // inform: the creature's figures and panel until the controls are let go and pressed.
  def(0x8FAE, 'inform', function* (r) {
    P.IFF = false;
    P.load_figures({ ix: r.ix, iy: r.iy });
    P.draw_creature_panel({});
    P.IFF = true;
    yield* P.wait_release({});
    return yield* P.wait_press({});
  });
  // draw_creature_panel: the frame, panel graphics 1 and 3, the bar values cleared, the bars drawn and
  // grown by 96 runs of slide_bars.
  def(0x8FBD, 'draw_creature_panel', r => {
    P.clear_lower_bars({});
    P.draw_menu_frame({});
    P.print_panel_text({ a: 1 });
    P.print_panel_text({ a: 3 });
    setw(0xD1F6, 0); setw(0xD1F8, 0); setw(0xD1F9, 0);
    P.draw_bar_outlines({});
    M[0xD0DF] = 0x15;
    for (let b = 0x60; b; b--) P.slide_bars({});
    return { b: 0 };
  });

  // make_selected: the creature being looked at (IX its record, IY its type) made the selected one,
  // with its height ($5B2F, $FF86), what it left on the map ($FF90) and its view.
  def(0x8FEB, 'make_selected', r => {
    setw(0x5B4D, w(0xFFF9));
    M[0x5B4F] = M[0x5B58];
    setw(0x5B50, r.ix); setw(0x5B52, r.iy);
    M[0x5B54] = M[0x5B12];
    setw(0x5B55, w(0xD0D3));
    M[0xFF91] = M[0x5B10];
    M[0x5B57] = M[0xD0D9];
    P.keep_figures({});
    setw(0xFF86, 0x0302);
    M[0x5B2F] = 0xFF;
    const ix = w(0x5B4D);
    if (P.is_flying({ ix }).zf) { M[0x5B2F] = 0xFE; setw(0xFF86, 0x0204); }
    M[0xFF90] = H.terrain(ix);
    if (M[0x5B2C]) M[0xFF90] = M[0x5B2C];
    M[0x5B29] = M[(w(0x5B50) + 4) & 0xFFFF] & 0x10;
    P.update_view({});
    if (!M[0xD066]) P.show_enemy_spotted({});
    P.find_others_at({ hl: w(0x5B55) });
    if (!M[0xD1AE]) return { a: 0, zf: true };
    const hl = (w(0xD1AF) + 1) & 0xFFFF;
    if (!(M[hl] & 0x80)) return { a: M[hl], zf: true, hl };
    M[0xFF90] = M[0xD1AE];
    return { a: M[0xD1AE], hl };
  });

  // centre, centre_on: the cursor on the selected creature, or on square HL, in the middle of the
  // window (origin three back, wrapping; offset 3, 3).
  const centreOn = hl => {
    setw(0xD0D3, hl); setw(0x5B47, hl);
    const back = v => (v >= 3 ? v - 3 : (v - 3 - 0xDC) & 255);
    const row = back(hl & 255), col = back(hl >> 8);
    M[0xD0C8] = M[0x5B4B] = row;
    M[0xD0C9] = M[0x5B4C] = col;
    setw(0xD0D1, 0x0303); setw(0x5B49, 0x0303);
    return { a: col, hl: 0x0303 };
  };
  def(0x907B, 'centre', r => centreOn(w(0x5B55)));
  def(0x907E, 'centre_on', r => centreOn(r.hl));

  // list_neighbours: the eight squares around HL ($FF88) at $FF0C, row, column (wrapping) and $00
  // or $80 in turn.
  const neighbours = hl => {
    setw(0xFF88, hl);
    let de = 0xFF0C, t = 0xB49D, c = 0;
    const wrap = a => (a === 0xFF ? 0x23 : a === 0x24 ? 0 : a);
    for (let b = 0; b < 8; b++) {
      M[de++] = wrap((M[0xFF88] + M[t++]) & 255);
      M[de++] = wrap((M[0xFF89] + M[t++]) & 255);
      M[de++] = c;
      c ^= 0x80;
    }
    return { a: c, c, b: 0, de, hl: t };
  };
  def(0x90A8, 'list_neighbours_of_selected', r => neighbours(w(0x5B55)));
  def(0x90AB, 'list_neighbours', r => neighbours(r.hl));

  // what_is_at: the terrain at square HL: $5B3B its map address, $5B12 the map byte; below $50 the
  // terrain itself, else the terrain under the first entry on the square. None there turns the
  // border yellow.
  const whatIsAt = hl => {
    const ma = P.map_address({ hl }).hl;
    setw(0x5B3B, ma);
    const a = M[ma];
    M[0x5B12] = a;
    if (a < 0x50) return { a, hl, cf: true };
    const e = hl & 255, d = hl >> 8;
    let p = 0x5B5A;
    for (let b = 0x91; b; b--, p += 6) {
      if (M[p] === e && (M[p + 1] & 0x3F) === d) return { a: M[p + 3] & 0x7F, hl: p, de: hl, b };
    }
    P.io.out(0xFE, 6, P.T);
    return { a: 6, hl: p, de: hl, b: 0 };
  };
  def(0x90EA, 'what_is_under_cursor', r => whatIsAt(w(0xD0D3)));
  def(0x90ED, 'what_is_at', r => whatIsAt(r.hl));
  // terrain_record: IY = the record of terrain A, five bytes each at $D208.
  def(0x9124, 'terrain_record_here', r => ({ iy: (0xD208 + 5 * M[0xFF91]) & 0xFFFF, a: 0 }));
  def(0x9127, 'terrain_record', r => ({ iy: (0xD208 + 5 * (r.a & 255)) & 0xFFFF, a: 0 }));

  // short_wait: while a control is held, up to 255 polls with a short delay before each.
  def(0x913B, 'short_wait', function* (r) {
    for (let b = 0xFF; b; b--) {
      yield { tstates: 11 + 7 + djnzT(0x2D) };
      yield* P.read_controls({});
      if (M[0x5B13] === 0xFF) return { a: 0, zf: true, b };
    }
    return { b: 0 };
  });

  // next_creature: $5B28 stepped round the object table to the player's next creature (145 tries at
  // most), shown on its square (a rider left to its mount), the window centred on it, described and
  // its panel drawn, then a control awaited.
  def(0x9151, 'next_creature', function* (r) {
    P.IFF = false;
    M[0xFFF7] = 0x92;
    for (;;) {
      M[0xFFF7] = (M[0xFFF7] - 1) & 255;
      if (!M[0xFFF7]) return { a: 0, zf: true };
      let a = (M[0x5B28] + 1) & 255;
      if (a >= 0x91) a = 0;
      M[0x5B28] = a;
      const ix = P.entry_address({ a }).hl;
      setw(0xFFF9, ix);
      const t = M[(ix + 2) & 0xFFFF];
      if (t === 0xFF || t < 0x8C) continue;
      const iy = P.creature_record_of({ ix }).iy;
      if (!P.owner_is_player({ iy }).zf) continue;
      const sq = M[ix] | H.column(ix) << 8;
      setw(0xFF88, sq);
      const ma = P.map_address({ hl: sq }).hl;
      M[0x5B12] = t;
      if (!P.is_flying({ ix }).cf) M[ma] = M[0x5B12];
      M[0x5B58] = M[0x5B28];
      P.centre_on({ hl: w(0xFF88) });
      P.draw_map({});
      const d = P.describe_creature({ ix });
      P.fill_icon_list({});
      P.load_figures({ ix: d.ix, iy: d.iy });
      P.draw_creature_panel({});
      P.clear_message_line({});
      P.print_square_name({});
      P.IFF = true;
      return yield* P.wait_press({});
    }
  });
  // do_nothing: CANCEL.
  def(0x91C9, 'do_nothing', r => ({}));
  // wait_release, wait_press, wait_fire: the controls read until none is pressed (a short delay
  // between), any is, or fire is; each poll counts $FFF8 on, which the random numbers use.
  def(0x91CA, 'wait_release', function* (r) {
    for (;;) {
      yield* P.read_controls({});
      M[0xFFF8] = (M[0xFFF8] + 1) & 255;
      if (M[0x5B13] === 0xFF) return { a: 0, zf: true, hl: 0xFFF8 };
      yield { tstates: H.delayT(0x14) };
    }
  });
  def(0x91DB, 'wait_press', function* (r) {
    for (;;) {
      yield* P.read_controls({});
      M[0xFFF8] = (M[0xFFF8] + 1) & 255;
      if (M[0x5B13] !== 0xFF) return { a: (M[0x5B13] + 1) & 255, zf: false, hl: 0xFFF8 };
    }
  });
  def(0x91E9, 'wait_fire', function* (r) {
    for (;;) {
      yield* P.read_controls({});
      M[0xFFF8] = (M[0xFFF8] + 1) & 255;
      if (!(M[0x5B13] & 1)) return { a: M[0x5B13] >> 1, cf: false, hl: 0xFFF8 };
    }
  });

  // add_cursor_option: option A added, its name message $AE + A printed.
  def(0x91F7, 'add_cursor_option', r => {
    P.add_menu_option({ a: r.a });
    return P.print_text({ a: (r.a + 0xAE) & 255 });
  });
  // run_menu: the menu built, in a frame (red on blue) sized to it; up and down move the highlight,
  // wrapping, until fire; the choice in $C662.
  def(0x9202, 'run_menu', function* (r) {
    P.IFF = false;
    M[0x5B17] = 0x41;
    P.draw_frame({ hl: 0x1602, de: 0x1F00 | ((M[0x5B0A] + 3) & 255) });
    P.IFF = true;
    M[0xC662] = 0;
    P.highlight_menu_option({});
    P.IFF = true;
    yield* P.wait_release({});
    for (;;) {
      yield* P.read_controls({});
      const a = M[0x5B13];
      if (!(a & 1)) { P.IFF = false; return P.sound_0({}); }
      if (!(a & 2)) {
        P.highlight_menu_option({});
        P.IFF = true;
        M[0xC662] = M[0xC662] ? M[0xC662] - 1 : (M[0x5B0A] - 1) & 255;
        P.highlight_menu_option({});
      } else if (!(a & 4)) {
        P.highlight_menu_option({});
        P.IFF = true;
        const v = (M[0xC662] + 1) & 255;
        M[0xC662] = v < M[0x5B0A] ? v : 0;
        P.highlight_menu_option({});
      }
      P.IFF = true;
      yield* P.key_repeat({});
    }
  });

  // highlight_bar: ink and paper swapped, bright, in a bar $5B07 cells wide on the choice's line
  // ($C662; two rows apart and two high when $5B06 is set), from $5800 + DE, a row down.
  const bar = (de, r) => {
    let hl = (0x5800 + de) & 0xFFFF;
    let b = M[0xC662];
    if (M[0x5B06]) b = (b << 1) & 255;
    b = ((b + 1) & 255) || 256;
    hl = (hl + 32 * b) & 0xFFFF;
    const width = M[0x5B07] || 256;
    let rows = ((M[0x5B06] + 1) & 255) || 256;
    for (; rows; rows--) {
      for (let i = 0; i < width; i++, hl = (hl + 1) & 0xFFFF) {
        const a = M[hl];
        M[hl] = ((a >> 3) & 7) | ((a & 7) << 3) | 0x40;
      }
      hl = (hl + ((0x20 - M[0x5B07]) & 255)) & 0xFFFF;
    }
    return { hl: r.hl, de: (0x20 - M[0x5B07]) & 255, b: 0, c: M[0x5B07] };
  };
  def(0x9262, 'highlight_file_option', r => {
    P.IFF = false;
    M[0x5B06] = 1;
    const at = P.read_table_word({ hl: 0x9277, de: (2 * M[0x5B0B]) & 255 }).hl;
    return P.jump(at, { hl: r.hl });
  });
  for (const [a, name, de, width] of [[0x927F, 'layout_turn_menu', 0x010A, 0x0C], [0x9289, 'layout_file_panel', 0x00E0, 0x0F],
    [0x9293, 'layout_wizard_list', 0x0151, 0x0E], [0x929D, 'layout_designer', 0x0107, 0x11]])
    def(a, name, r => { M[0x5B07] = width; return bar(de, r); });
  def(0x92A7, 'highlight_menu_option', r => {
    P.IFF = false;
    M[0x5B06] = 0; M[0x5B07] = 8;
    return bar(0x57, r);
  });
  def(0x92B5, 'highlight_bar', r => bar(r.de, r));

  // start_menu: SELECT OPTION printed, the count ($5B0A) cleared, the list ($FF84) at $D1E8, printing
  // from row 3, column 23. add_menu_option: option A on the list, counted.
  def(0x92FF, 'start_menu', r => {
    P.print_text({ a: 0xCB });
    M[0x5B0A] = 0;
    setw(0xFF84, 0xD1E8);
    setw(0x5B1A, 0x1703);
    return { a: 0, hl: 0x1703 };
  });
  def(0x9315, 'add_menu_option', r => {
    const hl = w(0xFF84);
    M[hl] = r.a;
    setw(0xFF84, (hl + 1) & 0xFFFF);
    M[0x5B0A] = (M[0x5B0A] + 1) & 255;
    return { hl: 0x5B0A };
  });
  // dispatch_menu: a jump to the routine, in the table at HL, of the option chosen ($D1E8 entry
  // $C662). The routine returns to dispatch_menu's caller.
  def(0x9322, 'dispatch_menu', function* (r) {
    const e = M[(0xD1E8 + M[0xC662]) & 0xFFFF];
    const t = P.read_table_word({ hl: (r.hl + e) & 0xFFFF, de: e });
    return yield* P.jumpGen(t.hl, Object.assign({}, r, { hl: t.hl, de: t.de }));
  });

  // load_figures: the figures of the creature at IX (record) and IY (type), with what its potion
  // ($ix+3, top three bits: 1 strength, 2 defence, 4 speed, 5 flying, 6 super) and its objects add:
  // action points ($D1FB) and the most for its height ($D200), stamina ($D1FC, $D201), skill
  // ($D1FD, $D202), attack ($D203) and its ratio ($D1FE), defence ($D204) and its ratio ($D1FF);
  // $5B44 the rider of a mount.
  def(0x9342, 'load_figures', r => {
    const ix = r.ix, iy = r.iy;
    M[0xD1FB] = M[ix];
    M[0xFF59] = M[(iy + 1) & 0xFFFF];
    M[0xFF5A] = M[iy];
    const d = M[(ix + 3) & 0xFFFF] >> 5;
    if (d === 5 && !M[0xFF59]) M[0xFF59] = (M[0xFF5A] * 2) & 255;
    if (d === 4 || d === 6) { M[0xFF59] = (M[0xFF59] << 1) & 255; M[0xFF5A] = (M[0xFF5A] << 1) & 255; }
    let b = M[0xFF5A];
    const h1 = (M[(w(0xFFF9) + 4) & 0xFFFF] + 1) & 255;
    if (h1 && h1 >= 0xFE && M[0xFF59]) b = M[0xFF59];
    M[0xD200] = b;
    M[0xD1FC] = M[(ix + 1) & 0xFFFF];
    M[0xD201] = M[(iy + 2) & 0xFFFF];
    M[0xD1FD] = M[(ix + 2) & 0xFFFF];
    M[0xD202] = M[(iy + 3) & 0xFFFF];
    b = M[(iy + 4) & 0xFFFF];
    if (d === 1 || d === 6) b = (b + 0x14) & 255;
    let a = 0;
    if (M[0xD0D9] && (M[(iy + 0x0B) & 0xFFFF] & 4)) {
      const o = P.object_record({ a: M[0xD0D9] }).iy;
      if (M[(o + 5) & 0xFFFF] & 1) a = M[(o + 2) & 0xFFFF];
    }
    M[0xD203] = (a + b) & 255;
    const q = P.divide({ a: M[0xD202], b: M[0xD1FD] }).a;
    a = P.divide({ a: M[0xD203], b: q }).a;
    M[0xD1FE] = a || 1;
    b = M[(iy + 5) & 0xFFFF];
    if (d === 2 || d === 6) b = (b + 0x19) & 255;
    M[0xD204] = b;
    let c = 0;
    if (M[(iy + 0x0B) & 0xFFFF] & 4) {
      P.list_found_carries({ ix });
      let hl = 0xD1C1;
      for (let n = M[0xD0DE]; n; n--, hl += 2) {
        const o = P.object_record({ a: M[hl] }).iy;
        const v = M[(o + 3) & 0xFFFF];
        if ((M[(o + 5) & 0xFFFF] & 1) && v >= c) c = v;
      }
    }
    M[0xD204] = (M[0xD204] + c) & 255;
    const t = M[(w(0xFFF9) + 2) & 0xFFFF];
    if (t < 0x90) {
      const s = M[(0xD054 + ((t - 0x8C) & 255)) & 0xFFFF];
      if (s) M[0xD204] = Math.min(0xFF, ((((s * 4) & 255) + 0x0C) & 255) + M[0xD204]);
    }
    a = P.divide({ a: M[0xD204], b: q }).a;
    M[0xD1FF] = a || 1;
    M[0x5B44] = 0xFD;
    if (M[0xD0D9] >= 0x8C) M[0x5B44] = M[0xD0DA];
    return { a: M[0x5B44] };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
