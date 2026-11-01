// The main program: the hand-over and cold start ($4E96, $7C52), the options panel ($7D0B), the
// main loop with its clock and the six icons ($7CBB-$7EDB), the Information window and its reports
// ($7F0C-$81FB), the OUT and IN trays and the force ($81FC-$83BB), the country list and the letter
// window ($8442-$8544), and the communique's menu with its RAMSAVE and RAMLOAD ($53F6-$54BD).
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`game_start cold_start options_panel new_game_loop main_loop game_clock on_goto icon_radio
  icon_information show_report report_tech report_resources report_missiles script_tech_report
  script_resources_report script_missiles_report script_missiles_both report_done
  script_tech_report_b script_tech_report_ab script_resources_report_b script_resources_report_ab
  script_missiles_report_b
  icon_out_tray menu_choice icon_in_tray no_mail icon_force force_menu force_report force_refused
  choose_country write_letter send_or_exit communique_menu ramload`);
G.main = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const top = () => w(0x7E);
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  // The main loop's calls, where the port yields to the lockstep: a pass starts at the first.
  const CP = { clock: 0x7CD3, fireUp: 0x7CD6, frames: 0x7CDB, cursor: 0x7CDE, newGame: 0x7CC7, options: 0x7DBD };
  P.CHECKPOINTS.push(...Object.values(CP));

  // ---- the program
  // P.main: the hand-over, then the game for ever. A P.jump to new_game_loop (QUIT GAME, the end
  // of a game) unwinds whatever was under way and starts again there.
  P.main = function* () {
    let place = 'game_start', a = 0;
    for (;;) {
      try {
        if (place === 'game_start') yield* P.game_start();
        else if (place === 'halt') yield* P.halt_with_border({ a });
        else yield* P.new_game_loop();
      } catch (e) {
        if (!(e instanceof P.Jump)) throw e;
        place = e.to; a = e.a;
      }
    }
  };
  // P.resume: the main loop, from a moment saved where a pass starts.
  P.resume = function* () {
    let e0 = null;
    try { yield* P.main_loop(); } catch (e) { if (!(e instanceof P.Jump)) throw e; e0 = e; }
    if (e0 && e0.to === 'halt') yield* P.halt_with_border({ a: e0.a });
    yield* P.main_from(true);
  };
  P.main_from = function* () {
    for (;;) {
      try { yield* P.new_game_loop(); } catch (e) {
        if (!(e instanceof P.Jump)) throw e;
        if (e.to === 'halt') yield* P.halt_with_border({ a: e.a });
      }
    }
  };
  // game_start ($4E96): the generator seeded, a new game set up and copied to the RAM save
  P.game_start = function* () {
    P.sei();
    P.random_init();
    P.new_game();
    M[0x5B52] = (M[0x5B52] + 1) & 255;
    M[0x5B51] = (M[0x5B51] + 1) & 255;
    P.copy_block({ at: 0x4EA3 });
    return yield* P.cold_start();
  };
  // cold_start ($7C52): the machine, the map's colours, the window records, the options panel
  P.cold_start = function* () {
    P.sei();
    yield* P.hardware_init();
    P.fill_cells({ at: 0x7C59 });
    P.cold_start_windows();
    yield* P.options_panel();
    return yield* P.new_game_loop();
  };
  P.cold_start_windows = function () {
    setw(0x80, 0x8C67);
    for (let x = 8; x; x--) { put(w(0x80), 8, 0); setw(0x80, w(0x80) + 0x10); }
    setw(0x80, 0x8C67);
    const p = 0x8C67;
    put(p, 8, 1);
    setw(0x7E, p);
    put(p, 0, 0); put(p, 1, 0); put(p, 3, 0x18); put(p, 2, 0x28); put(p, 7, 0); put(p, 5, 0);
    return { a: 0, x: 0, y: 5 };
  };
  // options_panel ($7D0B): the keyboard, tune 0, and the panel until F1 or F3
  P.options_panel = function* () {
    M[0x512C] = 0x6F; M[0x512D] = 0x51;
    P.sei();
    P.mus_start_tune({ a: 0 });
    P.cli();
    P.open_window({ at: 0x7D1C });
    const t = top();
    setw(0x80, t);
    M[0x84] = (at(t, 0) + 1) & 255;
    M[0x85] = at(t, 1);
    P.draw_picture({ a: 10 });
    setw(0x80, t);
    put(t, 10, 2);
    put(t, 9, at(t, 9) + 2);
    P.print_inline({ at: 0x7D5A });
    let a;
    for (;;) {
      if (P.key_down({ x: 0x04 }).c) { a = 0; break; }
      if (P.key_down({ x: 0x05 }).c) { a = 1; break; }
      yield;
    }
    yield { cp: 0x7DBD };
    P.close_window();
    if (a) { M[0x512C] = 0x5E; M[0x512D] = 0x51; }
    return { a: a ? 0x51 : 0 };
  };
  // new_game_loop ($7CBB) and main_loop ($7CD3)
  P.new_game_loop = function* () {
    P.sei();
    M[0x6286] = 0xDA; M[0x6287] = 0x8D;
    P.cli();
    yield { cp: CP.newGame };
    P.cursor_shape1();
    P.new_game();
    yield* P.week_end();
    P.cursor_to_window();
    return yield* P.main_loop();
  };
  P.main_loop = function* () {
    for (;;) {
      yield { cp: CP.clock };
      yield* P.game_clock();
      yield { cp: CP.fireUp };
      yield* P.wait_fire_up({});
      yield { cp: CP.frames };
      yield* P.wait_frames({ a: 1 });
      yield { cp: CP.cursor };
      P.move_cursor();
      if (!M[0x8E30]) continue;
      setw(0x80, 0x7EE8);
      const h = P.hit_test({ x: 6 });
      if (!h.c) continue;
      M[0x04] = h.a;
      M[0x07] = 0xDC; M[0x08] = 0x7E;
      M[0x88] = 0xD3; M[0x89] = 0x7C;
      yield* P.on_goto();
    }
  };
  // on_goto ($7E2F): the routine the table at ($07) names for the number in $04 (1 the first), with
  // the address at $88 as its return; its routine's result is on_goto's
  P.on_goto = function* () {
    setw(0x88, w(0x88) - 1);
    const off = ((((M[0x04] - 1) & 255) << 1) & 255);
    setw(0x07, w(0x07) + off);
    const p = w(0x07);
    M[0x7E61] = M[p]; M[0x7E62] = M[(p + 1) & 0xFFFF];
    return yield* P.callAt(M[0x7E61] | M[0x7E62] << 8, {});
  };
  // game_clock ($7DD1): each 192 passes an hour; each hour the countries' moves, then in each four
  // the radio intercept and the Big Bird report, and each eight the week's end
  P.game_clock = function* () {
    M[0x5B54] = (M[0x5B54] + 1) & 255;
    if (M[0x5B54] < 0xC0) return { a: M[0x5B54] };
    M[0x5B54] = 0;
    M[0x5B55] = (M[0x5B55] + 1) & 255;
    P.cursor_off();
    yield* P.country_events();
    if (!(M[0x5B55] & 3)) yield* P.radio_intercept();
    if ((M[0x5B55] & 3) === 1) yield* P.bigbird_report();
    if (!(M[0x5B55] & 7)) yield* P.week_end();
    return P.cursor_show();
  };
  // relations_all_up ($7E0D) and relations_row_up ($7E23): hostilities one up, to $FF
  const relUp = (x, y) => {
    do {
      if (((M[0x5C5C + x] + 1) & 255) !== 0) M[0x5C5C + x] = (M[0x5C5C + x] + 1) & 255;
      x = (x + 1) & 255;
      y = (y - 1) & 255;
    } while (y !== 0xFF);
    return { x, y };
  };
  P.relations_all_up = () => relUp(0, 0xFF);
  P.relations_row_up = () => relUp((M[0x8A] << 4) & 255, 0x0F);
  // icon_radio ($7E63)
  P.icon_radio = function* () {
    P.cursor_off();
    yield* P.radio_panel();
    return P.cursor_show();
  };

  // ---- Information
  // icon_information ($7F0C): four pictures; fire on one goes to its routine through info_routines,
  // back here after a report, out with info_close (which drops on_goto's return)
  P.icon_information = function* () {
    P.cursor_off();
    P.open_window({ at: 0x7F0F });
    for (const [x, y, a] of [[1, 7, 1], [5, 7, 2], [1, 11, 3], [5, 11, 4]]) { M[0x84] = x; M[0x85] = y; P.draw_picture({ a }); }
    P.cursor_to_window();
    for (;;) {
      yield* P.wait_fire_up({});
      yield* P.wait_fire_moving({});
      setw(0x80, 0x7F7C);
      const h = P.hit_test({ x: 4 });
      if (!h.c) continue;
      M[0x04] = h.a;
      M[0x07] = 0x94; M[0x08] = 0x7F;
      M[0x88] = 0x51; M[0x89] = 0x7F;
      const r = yield* P.on_goto();
      if (r && r.dropped) return { a: r.a };
    }
  };
  P.info_close = function () {
    P.cursor_off();
    P.close_window();
    P.cursor_show();
    M[0xC2E3] = 0;
    return { a: 0, dropped: true };
  };
  // the script's reports ($7FAE-$7FEF): the report with country A, B or both marked
  const marked = function* (marks, report) {
    M[0x7FAD] = marks;
    yield* report();
    M[0x7FAD] = 0;
    return { a: 0 };
  };
  P.script_tech_report = function* () { return yield* marked(1, P.report_tech); };
  P.script_tech_report_b = function* () { return yield* marked(2, P.report_tech); };
  P.script_tech_report_ab = function* () { return yield* marked(3, P.report_tech); };
  P.script_resources_report = function* () { return yield* marked(1, P.report_resources); };
  P.script_resources_report_b = function* () { return yield* marked(2, P.report_resources); };
  P.script_resources_report_ab = function* () { return yield* marked(3, P.report_resources); };
  P.script_missiles_report = function* () { return yield* marked(1, P.report_missiles); };
  P.script_missiles_report_b = function* () { return yield* marked(2, P.report_missiles); };
  P.script_missiles_both = function* () { return yield* marked(3, P.report_missiles); };
  P.alias(0x7FBC, 'script_tech_report_b'); P.alias(0x7FC0, 'script_tech_report_ab');
  P.alias(0x7FD2, 'script_resources_report_b'); P.alias(0x7FD6, 'script_resources_report_ab');
  P.alias(0x7FE8, 'script_missiles_report_b');
  P.report_tech = function* () { M[0x88] = 0xD5; M[0x89] = 0x81; return yield* P.show_report({ a: 0 }); };
  P.report_resources = function* () { M[0x88] = 0xAF; M[0x89] = 0x81; return yield* P.show_report({ a: 1 }); };
  P.report_missiles = function* () { M[0x88] = 0x81; M[0x89] = 0x81; return yield* P.show_report({ a: 2 }); };
  // show_report ($8012): the heading, the country list and each country's figures in a window,
  // the countries asked for marked, until fire
  P.show_report = function* (r) {
    const kind = r.a & 255, head = w(0x88);
    P.cursor_off();
    P.open_window({ at: 0x801C });
    setw(0x88, head);
    P.print_string();
    M[0x88] = 0x40; M[0x89] = 0x53;
    P.print_list();
    if (kind === 0) P.report_tech_rows();
    else if (kind === 1) P.report_resources_rows();
    else P.report_missiles_rows();
    return yield* P.report_done();
  };
  // a report's rows: for each country, at its row of the window ($0A one on each time), the
  // numbers print_number prints from its record (at $5DA4 on, 12 bytes a country)
  const rows = each => {
    const t0 = top();
    setw(0x80, t0);
    put(t0, 10, 1);
    M[0x82] = 0xA4; M[0x83] = 0x5D;
    for (let x = 0x10; x; x--) {
      const keep = w(0x82);
      each(keep);
      const t = top();
      setw(0x80, t);
      put(t, 10, at(t, 10) + 1);
      setw(0x82, keep + 0x0C);
    }
    return { x: 0 };
  };
  P.report_missiles_rows = () => rows(p => {
    P.set_text_x({ a: 0x90 }); P.print_number({ a: at(p, 6) });
    P.set_text_x({ a: 0xB0 }); P.print_number({ a: at(p, 7) });
    P.set_text_x({ a: 0xC8 }); P.print_number({ a: at(p, 8) });
  });
  const percent = field => {
    M[0x8142] = field;
    return rows(p => {
      P.set_text_x({ a: 0x90 });
      P.print_number({ a: at(p, M[0x8142]) });
      P.print_char({ a: 0x30 });
    });
  };
  P.report_tech_rows = () => percent(5);
  P.report_resources_rows = () => percent(4);
  // report_done ($80B7)
  P.report_done = function* () {
    const a = M[0x7FAD];
    if (a) P.report_mark({ a });
    yield* P.wait_press({});
    P.close_window();
    return P.cursor_on();
  };
  P.report_mark = function (r) {
    if (r.a === 1) return P.mark_country_a();
    if (r.a === 2) return P.mark_country_b();
    P.mark_country_a();
    return P.mark_country_b();
  };
  const markRow = (country, colour) => {
    const c = P.report_row_cells({ a: country });
    const d = w(0x88);
    let y = c.y;
    do { M[(d + y) & 0xFFFF] = colour; y = (y - 1) & 255; } while (y < 0x80);
    return { a: colour, y };
  };
  P.mark_country_a = function () {
    const a = P.country_record({ a: M[0x8A] }).a;
    return markRow(a, 0x57);
  };
  P.mark_country_b = () => markRow(M[0x8B], 0x67);
  // report_row_cells ($80F3): the colour cells of country A's row (A the country), Y its width less one
  P.report_row_cells = function (r) {
    const a = (r.a + 1) & 255;
    const t = top();
    setw(0x80, t);
    M[0x85] = (a + at(t, 1)) & 255;
    M[0x84] = at(t, 0);
    P.cell_address_84();
    return { a: at(t, 2), y: (at(t, 2) - 1) & 255 };
  };

  // ---- the OUT tray
  // icon_out_tray ($81FC): the eight letters; the one chosen is written (letter_routines, every one
  // write_letter)
  P.icon_out_tray = function* () {
    P.cursor_off();
    P.open_window({ at: 0x81FF });
    const c = yield* P.menu_choice({});
    M[0x04] = c.a;
    M[0x07] = 0x23; M[0x08] = 0x82;
    M[0x88] = 0x22; M[0x89] = 0x82;
    return yield* P.on_goto();
  };
  // menu_choice ($8233): fire on a menu row; its number in letter_choice, the window closed, the
  // number plus one returned
  P.menu_choice = function* () {
    yield* P.wait_fire_up({});
    yield* P.wait_fire_moving({});
    const a = at(w(0x80), 11);
    M[0x824C] = a;
    P.cursor_off();
    P.close_window();
    return { a: (a + 1) & 255, y: 11 };
  };
  // ---- the IN tray
  P.icon_in_tray = function* () {
    P.cursor_off();
    yield* P.in_tray_next();
    return P.cursor_show();
  };
  P.no_mail = function* () {
    P.open_window({ at: 0x8257 });
    P.print_inline({ at: 0x8262 });
    yield* P.wait_fire_up({});
    yield* P.wait_fire_or_time({});
    return P.close_window();
  };
  // ---- the U.N.N. Force
  P.icon_force = function* () {
    P.cursor_off();
    yield* P.force_menu();
    return P.cursor_show();
  };
  // force_menu ($82A7): the force's report when it is stationed; Re-direct asks for a country
  P.force_menu = function* () {
    let ask;
    if (!M[0x5B57]) {
      yield* P.force_report();
      if (!M[0xB5E3]) return { a: 0 };
      ask = true;
    } else ask = false;
    for (;;) {
      if (ask) {
        yield* P.choose_country();
        P.country_record({ a: M[0x8486] });
        if (((at(w(0x80), 11) + 1) & 255) === 0) return yield* P.force_refused();
        if (M[0x8486] === M[0x5B56]) return yield* P.force_refused();
        M[0x5B56] = M[0x8486];
        let a = M[0x5B57] + 1;
        if (a >= 3) a = 3;
        M[0x5B57] = a;
      }
      M[0x88] = 0x4C; M[0x89] = 0xC0;
      P.table_entry({ a: M[0x5B56] });
      M[0x5B35] = M[0x88]; M[0x5B36] = M[0x89];
      M[0x88] = 0x79; M[0x89] = 0x9F;
      M[0xB160] = 0x20;
      yield* P.run_script({ a: 0x20 });
      if (!M[0xB5E3]) return { a: 0 };
      ask = true;
    }
  };
  P.force_report = function* () {
    M[0x88] = 0x4C; M[0x89] = 0xC0;
    P.table_entry({ a: M[0x5B56] });
    M[0x5B35] = M[0x88]; M[0x5B36] = M[0x89];
    M[0x88] = 0x79; M[0x89] = 0x9F;
    M[0xB160] = 0x21;
    return yield* P.run_script({ a: 0x21 });
  };
  // force_refused ($833D): "Cannot go there.", "Forces are going there." or "... allready there."
  P.force_refused = function* () {
    P.open_window({ at: 0x833D });
    P.country_record({ a: M[0x8486] });
    if (((at(w(0x80), 11) + 1) & 255) === 0) P.print_inline({ at: 0x8385 });
    else if (M[0x5B57]) P.print_inline({ at: 0x839D });
    else P.print_inline({ at: 0x835C });
    yield* P.wait_fire_or_time({});
    return P.close_window();
  };
  // choose_country ($8442): the country list; the country chosen in A and country_chosen, its
  // name's address in country_chosen_name
  P.choose_country = function* () {
    P.open_window({ at: 0x8442 });
    yield* P.wait_fire_up({});
    yield* P.wait_fire_up({});
    yield* P.wait_fire_moving({});
    const t = top();
    setw(0x80, t);
    const a = at(t, 11);
    M[0x8486] = a;
    M[0x88] = 0x4C; M[0x89] = 0xC0;
    P.table_entry({ a });
    M[0x8488] = M[0x88]; M[0x8489] = M[0x89];
    P.cursor_off();
    P.close_window();
    return { a: M[0x8486] };
  };
  // letter_window ($848B): the window of the letters and the communique, the emblem at its top
  P.letter_window = function () {
    P.open_window({ at: 0x848B });
    P.letter_window_picture();
    return {};
  };
  P.letter_window_picture = function () {
    const t = top();
    setw(0x80, t);
    put(t, 10, 4);
    M[0x84] = (at(t, 0) + 7) & 255;
    M[0x85] = at(t, 1);
    return P.draw_picture({ a: 7 });
  };
  // write_letter ($84B9): the letter's text, then Send letter or Exit; a letter sent runs its
  // script from letter_scripts ($9ECD)
  P.write_letter = function* () {
    P.letter_window();
    M[0x88] = 0x66; M[0x89] = 0x9C;
    P.table_entry({ a: M[0x824C] });
    yield* P.print_text();
    const c = yield* P.send_or_exit();
    if (c.a === 1) {
      P.close_window();
      return P.cursor_show();
    }
    P.close_window();
    P.open_window({ at: 0x84D7 });
    P.print_inline({ at: 0x84E2 });
    yield* P.wait_fire_or_time({});
    P.close_window();
    P.set_countries();
    M[0xB160] = M[0x824C];
    M[0x88] = 0xCD; M[0x89] = 0x9E;
    yield* P.run_script({ a: M[0x824C] });
    return P.cursor_show();
  };
  // send_or_exit ($851C): the row chosen, 0 Send letter, 1 Exit
  P.send_or_exit = function* () {
    P.open_window({ at: 0x851F });
    yield* P.wait_fire_up({});
    yield* P.wait_fire_moving({});
    P.cursor_off();
    const t = top();
    setw(0x80, t);
    const a = at(t, 11);
    P.close_window();
    return { a };
  };

  // ---- the communique's menu
  // communique_menu ($53F6): CARRY ON, RAMSAVE GAME, RAMLOAD GAME, QUIT GAME. A RAMLOAD goes on
  // in the middle of week_end (j_BAE9), dropping week_end's own call of this menu: its result says
  // so (loaded).
  P.communique_menu = function* () {
    for (;;) {
      P.open_window({ at: 0x53F6 });
      yield* P.wait_fire_moving({});
      const t = top();
      setw(0x80, t);
      const a = at(t, 11);
      P.cursor_off();
      P.close_window();
      if (a === 0) return { a: 0 };
      if (a === 3) { P.close_window(); P.jump('new_game_loop'); }
      if (a === 2) return yield* P.ramload();
      // RAMSAVE
      P.open_window({ at: 0x542A });
      yield* P.wait_fire_up({});
      P.print_inline({ at: 0x5438 });
      yield* P.wait_press({});
      P.copy_block({ at: 0x5458 });
      P.print_inline({ at: 0x5461 });
      yield* P.wait_fire_or_time({});
      P.close_window();
    }
  };
  P.ramload = function* () {
    P.open_window({ at: 0x5479 });
    P.print_inline({ at: 0x5484 });
    yield* P.wait_press({});
    P.close_window();
    P.close_window();
    P.satellites_redraw();
    P.copy_block({ at: 0x54AD });
    P.satellites_redraw();
    return { loaded: true };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
