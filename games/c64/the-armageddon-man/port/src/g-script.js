// The script engine and its commands ($B161-$BE63): events and their demands, the engine's loop
// over script_commands ($4EB3), the 77 commands, the end of a game and of the year, the four
// weekly mail slots, and the end of each week.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`run_event run_script_table script_loop run_script demand demand_window year_over
  script_game_over game_over script_show_event script_text script_menu script_wait_close week_end
  in_tray_next mail_deliver script_show_mail mail_unread followup_run`);
G.script = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  const top = () => w(0x7E);
  const PC = 0xB5E4;

  // ---- events and the engine
  // run_event ($B161): event X between A and B, a demand first when one is due
  P.run_event = function* (r) {
    M[0xB160] = r.x;
    M[0x5B46] = M[0x8A]; M[0x5B47] = M[0x8B];
    P.set_countries();
    P.demand_check();
    const e = M[0xB160];
    if (e !== 0 && e !== 1 && M[0x5B4C]) return yield* P.demand();
    return yield* P.run_script_table();
  };
  P.run_script_table = function* () {
    M[0x88] = 0x79; M[0x89] = 0x9F;
    P.table_entry({ a: M[0xB160] });
    M[PC] = M[0x88]; M[PC + 1] = M[0x89];
    return yield* P.script_loop();
  };
  // script_loop ($B19E): each command's routine from script_commands ($4EB3), until script_end
  P.script_loop = function* () {
    for (;;) {
      const pc = w(PC);
      setw(0x88, pc);
      const cmd = M[pc];
      setw(PC, pc + 1);
      M[0x88] = 0xB3; M[0x89] = 0x4E;
      P.table_entry({ a: cmd });
      M[0x86] = 0x9D; M[0x87] = 0xB1;
      M[0xB1E9] = M[0x88]; M[0xB1EA] = M[0x89];
      const a = w(0x88);
      if (a === 0xB1EB) return { a: M[0x89], y: 1 };
      yield* P.callAt(a, { a: M[0x89], y: 1 });
    }
  };
  // run_script ($B1EE): entry A of the script table at $88/$89
  P.run_script = function* (r) {
    P.table_entry({ a: r.a });
    M[PC] = M[0x88]; M[PC + 1] = M[0x89];
    return yield* P.script_loop();
  };
  // script_fetch ($B6F3): the next byte of the script into $84
  P.script_fetch = function () {
    const p = w(PC);
    M[0x84] = M[p];
    setw(0x88, p + 1);
    setw(PC, p + 1);
    return { a: M[0x89], y: 0 };
  };

  // ---- demands
  P.demand = function* () {
    setw(0x80, w(0x8E));
    if (at(w(0x80), 4) < 0x0B) {
      setw(0x82, w(0x90));
      if (at(w(0x82), 4)) {
        M[0x88] = 0xBC; M[0x89] = 0xB2;
        const a = (yield* P.demand_window()).a;
        if (a === 0) return yield* demandIgnored();
        if (a === 1) return give(4);
        return yield* P.run_script_table();
      }
    }
    // demand_tech ($B27C)
    if (at(w(0x8E), 5) >= 0x0B || !at(w(0x90), 5)) return yield* P.run_script_table();
    M[0x88] = 0xD9; M[0x89] = 0xB2;
    const a = (yield* P.demand_window()).a;
    if (a === 0) return yield* demandIgnored();
    if (a === 2) return yield* P.run_script_table();
    return give(5);
  };
  // Yes: a unit of the field from B to A, unless A has 15 or B none
  const give = y => {
    setw(0x82, w(0x90));
    if (y === 4) setw(0x80, w(0x8E));
    const a = w(0x8E), b = w(0x90);
    if (at(a, y) === 0x0F || !at(b, y)) return { a: at(a, y) === 0x0F ? 0x0F : 0, y };
    put(b, y, at(b, y) - 1);
    put(a, y, at(a, y) + 1);
    return { a: at(a, y), y };
  };
  // Ignore: the event one harsher, at its levels
  const demandIgnored = function* () {
    const e = M[0xB160];
    if (!e) return { a: 0 };
    put(w(0xA0), M[0x8A], at(w(0x98), (e - 1) & 255));
    put(w(0x9E), M[0x8B], at(w(0x96), (e - 1) & 255));
    M[0xB160] = (e - 1) & 255;
    return yield* P.run_script_table();
  };
  // demand_window ($B331): the text at $88/$89 and Ignore, Yes, No; the row chosen
  P.demand_window = function* () {
    const s = w(0x88);
    P.open_window({ at: 0xB337 });
    P.do_nothing();
    setw(0x88, s);
    yield* P.print_text();
    P.open_window({ at: 0xB34E });
    yield* P.wait_fire_up({});
    yield* P.wait_fire_moving({});
    P.cursor_off();
    const a = at(top(), 11);
    P.close_window();
    P.close_window();
    return { a };
  };
  // demand_check ($B8A4): demand_due set when B has missile power, A has at least as much, and a
  // random byte falls below 255 / (A's power / B's)
  P.demand_check = function () {
    M[0x5B4C] = 0;
    setw(0x80, w(0x8E));
    P.missile_power();
    M[0x5B48] = M[0x88]; M[0x5B49] = M[0x89];
    setw(0x80, w(0x90));
    P.missile_power();
    M[0x5B4A] = M[0x88]; M[0x5B4B] = M[0x89];
    if (((M[0x88] + M[0x89]) & 255) === 0) return {};
    M[0x86] = M[0x88]; M[0x87] = M[0x89];
    M[0x88] = M[0x5B48]; M[0x89] = M[0x5B49];
    P.divide_88_86();
    if (((M[0x88] + M[0x89]) & 255) === 0) return {};
    M[0x86] = M[0x88]; M[0x87] = M[0x89];
    M[0x88] = 0xFF; M[0x89] = 0;
    P.divide_88_86();
    M[0x84] = M[0x88];
    M[0x5B4D] = 1;
    if (!P.roll_flag().c) M[0x5B4C] = 1;
    return {};
  };
  // missile_power ($B91D): 3 x MX1 + 2 x MX2 + MX3 of the record at $80/$81
  P.missile_power = function () {
    const p = w(0x80);
    const m1 = at(p, 6) * 3;
    M[0x86] = at(p, 6); M[0x87] = 0;
    const v = m1 + 2 * at(p, 7) + at(p, 8);
    setw(0x88, v);
    // $86/$87 last held 2 x MX2 + MX3's other half: the 3 x MX1 pulled back for the sum
    M[0x86] = m1 & 255; M[0x87] = m1 >> 8;
    return { a: M[0x89], y: 8 };
  };
  // divide_88_86 ($BA04): $88/$89 / $86/$87 with divide16
  P.divide_88_86 = function () {
    const s86 = M[0x86], s87 = M[0x87];
    M[0x74] = M[0x86]; M[0x75] = M[0x87];
    M[0x76] = M[0x88]; M[0x77] = M[0x89];
    P.divide16();
    M[0x88] = M[0x76]; M[0x89] = M[0x77];
    M[0x86] = s86; M[0x87] = s87;
    return { a: s87 };
  };

  // ---- the end of a game
  // year_over ($B36F): the rating, (16 less the countries destroyed) x 25 / 4, then game over
  P.year_over = function* () {
    const x = (16 - M[0x5B50]) & 255;
    M[0x86] = x; M[0x87] = 0;
    const v = (25 * x) >> 2;
    setw(0x88, v);
    M[0xB401] = v & 255;
    return yield* P.game_over();
  };
  P.script_game_over = function* () {
    P.script_fetch();
    return yield* P.game_over();
  };
  // game_over ($B405): message $84 in the letter window, then a new game
  P.game_over = function* () {
    const n = M[0x84];
    P.letter_window();
    M[0x88] = 0x28; M[0x89] = 0xB4;
    P.table_entry({ a: n });
    yield* P.print_text();
    yield* P.wait_frames({ a: 4 });
    yield* P.wait_press({});
    P.close_window();
    P.jump('new_game_loop');
  };

  // ---- the commands
  // script_enemy_a ($B53C, $30 n) and script_enemy_b ($B522, $4C n): the country and its worst
  // enemy grow more hostile to each other by n
  const enemy = function (self) {
    P.script_fetch();
    const n = M[0x84], n85 = M[0x85];
    const e = P.most_hostile({ a: self }).a;
    M[0xB53B] = e;
    P.relations_row({ a: e });
    M[0xB5A5] = self;
    M[0x86] = self; M[0x87] = 0;
    setw(0x80, w(0x80) + self);
    M[0x84] = n; M[0x85] = n85;
    let v = M[w(0x80)] + n;
    M[w(0x80)] = v > 255 ? 0xFF : v;
    P.relations_row({ a: self });
    M[0x86] = e; M[0x87] = 0;
    setw(0x80, w(0x80) + e);
    v = M[w(0x80)] + n;
    M[w(0x80)] = v > 255 ? 0xFF : v;
    return { y: 0 };
  };
  P.script_enemy_a = () => enemy(M[0x8A]);
  P.script_enemy_b = () => enemy(M[0x8B]);
  // script_switch ($0D): the script address in the table for the last menu's row
  P.script_switch = function () {
    P.script_fetch();
    const lo = M[0x84];
    P.script_fetch();
    M[0x88] = lo; M[0x89] = M[0x84];
    M[0x86] = (M[0xB5E3] << 1) & 255; M[0x87] = 0;
    setw(0x88, w(0x88) + M[0x86]);
    const p = w(0x88);
    M[0x86] = M[p]; M[0x87] = at(p, 1);
    M[PC] = M[0x86]; M[PC + 1] = M[0x87];
    return { y: 1 };
  };
  P.script_wait_close = function* () {
    yield* P.wait_press({});
    return P.close_window();
  };
  P.script_show_event = function* () {
    M[0x88] = 0xB8; M[0x89] = 0x55;
    P.table_entry({ a: M[0xB160] });
    yield* P.print_text();
    return yield* P.wait_fire_or_time({});
  };
  P.script_text = function* () {
    P.script_fetch();
    M[0x88] = 0xB8; M[0x89] = 0x55;
    P.table_entry({ a: M[0x84] });
    return yield* P.print_text();
  };
  // script_window ($12 w h): a memo's window with picture 8
  P.script_window = function () {
    P.script_fetch(); M[0xB62B] = M[0x84];
    P.script_fetch(); M[0xB62C] = M[0x84];
    P.open_window({ at: 0xB626 });
    const t = top();
    setw(0x80, t);
    put(t, 10, 4);
    M[0x84] = at(t, 0);
    M[0x85] = at(t, 1);
    return P.draw_picture({ a: 8 });
  };
  // script_menu ($11 w h n): a menu window with list n; the row chosen in menu_answer
  P.script_menu = function* () {
    P.script_fetch(); M[0xB671] = M[0x84];
    P.script_fetch(); M[0xB672] = M[0x84];
    P.script_fetch(); M[0xB676] = ((M[0x84] << 1) | 1) & 255;
    P.open_window({ at: 0xB66C });
    yield* P.wait_fire_up({});
    yield* P.wait_fire_moving({});
    const t = top();
    setw(0x80, t);
    M[0xB5E3] = at(t, 11);
    P.cursor_off();
    return P.close_window();
  };
  // pointers at one country's hostility to another
  const point = (row, c) => {
    setw(0x80, w(row));
    M[0x86] = c; M[0x87] = 0;
    setw(0x80, w(0x80) + c);
    return { a: (w(0x80) >> 8) & 255 };
  };
  P.point_c_to_d = () => point(0xA2, M[0x8D]);
  P.point_d_to_a = () => point(0xA4, M[0x8A]);
  P.point_b_to_a = () => point(0xA0, M[0x8A]);
  P.point_a_to_b = () => point(0x9E, M[0x8B]);
  P.hostility_add = function () {
    const p = w(0x80), v = M[p] + M[0x84];
    M[p] = v > 255 ? 0xFF : v;
    return { a: M[p], y: 0 };
  };
  P.hostility_sub = function () {
    const p = w(0x80), v = M[p] - M[0x84];
    M[p] = v < 0 ? 0 : v;
    return { a: M[p], y: 0 };
  };
  const up = pt => () => { pt(); P.script_fetch(); return P.hostility_add(); };
  const down = pt => () => { pt(); P.script_fetch(); return P.hostility_sub(); };
  const upRnd = pt => () => { pt(); M[0x84] = (P.random().a & 1) + 1; return P.hostility_add(); };
  const downRnd = pt => () => { pt(); M[0x84] = (P.random().a & 3) + 1; return P.hostility_sub(); };
  P.script_b_to_a_up = up(P.point_b_to_a);
  P.script_c_to_d_up = up(P.point_c_to_d);
  P.script_d_to_a_up = up(P.point_d_to_a);
  P.script_a_to_b_up = up(P.point_a_to_b);
  P.script_b_to_a_down = down(P.point_b_to_a);
  P.script_a_to_b_down = down(P.point_a_to_b);
  P.script_b_to_a_up_rnd = upRnd(P.point_b_to_a);
  P.script_a_to_b_up_rnd = upRnd(P.point_a_to_b);
  P.script_b_to_a_down_rnd = downRnd(P.point_b_to_a);
  P.script_a_to_b_down_rnd = downRnd(P.point_a_to_b);
  // confidence in you, byte 9 of a record
  P.confidence_sub = function () {
    const p = w(0x80), v = at(p, 9) - M[0x84];
    put(p, 9, v < 0 ? 0 : v);
    return { a: at(p, 9), y: 9 };
  };
  P.confidence_add = function () {
    const p = w(0x80), v = at(p, 9) + M[0x84];
    put(p, 9, v > 255 ? 0xFF : v);
    return { a: at(p, 9), y: 9 };
  };
  const conf = (rec, sign, amount) => () => {
    if (amount) M[0x84] = M[0x5B4F];
    setw(0x80, w(rec));
    if (!amount) P.script_fetch();
    return sign > 0 ? P.confidence_add() : P.confidence_sub();
  };
  P.script_b_conf_down_amount = conf(0x90, -1, true);
  P.script_a_conf_down_amount = conf(0x8E, -1, true);
  P.script_c_conf_down = conf(0x92, -1);
  P.script_d_conf_down = conf(0x94, -1);
  P.script_b_conf_down = conf(0x90, -1);
  P.script_a_conf_down = conf(0x8E, -1);
  P.script_b_conf_up_amount = conf(0x90, 1, true);
  P.script_a_conf_up_amount = conf(0x8E, 1, true);
  P.script_c_conf_up = conf(0x92, 1);
  P.script_d_conf_up = conf(0x94, 1);
  P.script_b_conf_up = conf(0x90, 1);
  P.script_a_conf_up = conf(0x8E, 1);
  // the condition flag
  P.roll_flag = function () {
    P.flag_clear();
    const a = P.random().a;
    const c = a >= M[0x84] ? 1 : 0;
    if (c) P.flag_set();
    return { a: c ? 1 : a, c };
  };
  const roll = rec => () => { setw(0x80, w(rec)); M[0x84] = at(w(0x80), 9); return P.roll_flag(); };
  P.script_roll_b = roll(0x90);
  P.script_roll_a = roll(0x8E);
  P.script_chance = function () { P.script_fetch(); return P.roll_flag(); };
  P.flag_clear = () => { M[0xB85F] = 0; return { a: 0 }; };
  P.flag_set = () => { M[0xB85F] = 1; return { a: 1 }; };
  P.script_skip_if = function () {
    if (!M[0xB85F]) return { a: 0 };
    setw(0x88, w(PC) + 3);
    setw(PC, w(0x88));
    return { a: M[0x89] };
  };
  P.script_has_missiles = function () {
    P.flag_clear();
    M[0x88] = M[0x5B48]; M[0x89] = M[0x5B49];
    if (((M[0x88] + M[0x89]) & 255) !== 0) P.flag_set();
    return {};
  };
  // script_call ($17), script_return ($16), script_goto ($0C)
  P.script_call = function () {
    P.script_fetch();
    const lo = M[0x84];
    P.script_fetch();
    M[0x88] = lo; M[0x89] = M[0x84];
    M[0x86] = M[PC]; M[0x87] = M[PC + 1];
    M[0xB9D9] = M[0x86]; M[0xB9DA] = M[0x87];
    M[PC] = M[0x88]; M[PC + 1] = M[0x89];
    return { a: M[0x89] };
  };
  P.script_return = function () {
    M[0x88] = M[0xB9D9]; M[0x89] = M[0xB9DA];
    M[PC] = M[0x88]; M[PC + 1] = M[0x89];
    return { a: M[0x89] };
  };
  P.script_goto = function () {
    const p = w(PC);
    M[0x07] = M[p];
    M[0x88] = M[0x07]; M[0x89] = at(p, 1);
    M[PC] = M[0x88]; M[PC + 1] = M[0x89];
    return { a: M[0x89], y: 0 };
  };

  // ---- mail
  // mail_init ($BA2C): each slot's next entry at its start, and no mail in it
  P.mail_init = function () {
    for (let s = 3; s >= 0; s--) {
      const p = 0x5B58 + 5 * s;
      M[p + 2] = M[p + 4]; M[p + 1] = M[p + 3]; M[p] = 0;
    }
    M[0x87] = M[0x5B5B + 1]; M[0x86] = M[0x5B5B];
    M[0x88] = 0x57; M[0x89] = 0x5B;
    return { a: 0, x: 0, y: 0 };
  };
  // script_post ($13 n w x): mail n from A and B, amount x, into the slot w weeks ahead; a slot
  // holds 20
  P.script_post = function () {
    P.script_fetch();
    M[0x85] = M[0x84];
    P.script_fetch();
    const s = (M[0x5B52] + M[0x84]) & 3;
    P.script_fetch();
    M[0x86] = s;
    const y = (s << 2) + s;
    M[0x88] = 0x58; M[0x89] = 0x5B;
    const c = M[0x5B58 + y];
    if (c === 0x14) return { a: c, y };
    M[0x5B58 + y] = c + 1;
    M[0x86] = M[0x5B59 + y]; M[0x87] = M[0x5B5A + y];
    M[0x06] = y + 2;
    const p = w(0x86);
    put(p, 0, M[0x85]);
    M[0x85] = (M[0x8A] << 4) & 255;
    put(p, 1, M[0x8B] | M[0x85]);
    put(p, 2, M[0x84]);
    setw(0x86, p + 3);
    M[0x5B5A + y] = M[0x87];
    M[0x5B59 + y] = M[0x86];
    return { a: M[0x86], y: y + 1 };
  };
  // in_tray_next ($BC16): the newest entry of this week's slot, delivered; "No Mail" when empty
  P.in_tray_next = function* () {
    const s = M[0x5B52];
    M[0x04] = s;
    let x = (s << 2) + s;
    if (!M[0x5B58 + x]) return yield* P.no_mail();
    M[0x5B58 + x]--;
    x++;
    let p = M[0x5B58 + x] | M[0x5B59 + x] << 8;
    x++;
    p = (p - 1) & 0xFFFF;
    M[0x5B4F] = M[p];
    p = (p - 1) & 0xFFFF;
    M[0x04] = M[p];
    M[0x8B] = M[0x04] & 15;
    M[0x8A] = M[0x04] >> 4;
    p = (p - 1) & 0xFFFF;
    M[0x07] = p & 255; M[0x08] = p >> 8;
    M[0x5B4E] = M[p];
    M[0x5B58 + x] = M[0x08];
    M[0x5B57 + x] = M[0x07];
    return yield* P.mail_deliver({ a: M[0x5B4E] });
  };
  P.mail_deliver = function* () {
    if (M[0x5B4E] === 0xFF) return yield* P.followup_run();
    if (M[0x5B44]) return yield* P.mail_unread();
    P.set_countries();
    M[0x88] = 0x24; M[0x89] = 0x9C;
    return yield* P.run_script({ a: M[0x5B4E] });
  };
  P.script_show_mail = function* () {
    P.open_window({ at: 0xBDED });
    const t = top();
    setw(0x80, t);
    M[0x85] = at(t, 1);
    M[0x84] = (at(t, 0) + 7) & 255;
    put(t, 10, 4);
    P.draw_picture({ a: 9 });
    P.set_countries();
    M[0x88] = 0x46; M[0x89] = 0x9C;
    P.table_entry({ a: M[0x5B4E] });
    yield* P.print_text();
    P.do_nothing();
    yield* P.wait_fire_or_time({});
    return yield* P.wait_fire_up({});
  };
  P.mail_unread = function* () {
    P.set_countries();
    M[0x88] = 0x5F; M[0x89] = 0x9E;
    M[0xB160] = M[0x5B4E];
    return yield* P.run_script({ a: M[0x5B4E] });
  };
  P.followup_run = function* () {
    P.set_countries();
    M[0x88] = 0x5F; M[0x89] = 0x9E;
    M[0xB160] = M[0x5B4F];
    yield* P.run_script({ a: M[0x5B4F] });
    return yield* P.in_tray_next();
  };
  // every country's confidence up or down by n
  const allConf = f => () => {
    const a = M[0x8A];
    P.script_fetch();
    M[0x8A] = 0;
    for (let x = 16; x; x--) {
      P.country_record({ a: M[0x8A] });
      f();
      M[0x8A] = (M[0x8A] + 1) & 255;
    }
    M[0x8A] = a;
    return { a, x: 0 };
  };
  P.script_all_conf_up = allConf(() => P.confidence_add());
  P.script_all_conf_down = allConf(() => P.confidence_sub());
  // missiles: MX3, MX1 and MX2 down by 10 to 0, or up by 10 to 200
  const missiles = (c, f) => {
    P.country_record({ a: c });
    const p = w(0x80);
    for (const y of [8, 6, 7]) put(p, y, f(at(p, y)));
    return { a: at(p, 7), y: 7 };
  };
  P.minus_10 = r => ({ a: r.a >= 10 ? r.a - 10 : 0 });
  P.plus_10 = r => { const a = (r.a + 10) & 255; return { a: a >= 0xC8 ? 0xC8 : a }; };
  P.script_a_missiles_down = () => missiles(M[0x8A], v => P.minus_10({ a: v }).a);
  P.script_b_missiles_up = () => missiles(M[0x8B], v => P.plus_10({ a: v }).a);
  P.script_a_missiles_up = () => missiles(M[0x8A], v => P.plus_10({ a: v }).a);
  // technology (byte 5) and natural resources (byte 4)
  const techUp = c => { P.flag_clear(); P.country_record({ a: c }); const p = w(0x80), v = at(p, 5) + 1; if (v >= 0x0F) return P.flag_set(); put(p, 5, v); return { a: v, y: 5 }; };
  const fieldDown = (c, y) => { P.flag_clear(); P.country_record({ a: c }); const p = w(0x80); if (!at(p, y)) return P.flag_set(); put(p, y, at(p, y) - 1); return { a: at(p, y), y }; };
  const resUp = c => { P.flag_clear(); P.country_record({ a: c }); const p = w(0x80), v = at(p, 4) + 1; if (v >= 0x0F) return { a: v, y: 4 }; put(p, 4, v); return P.flag_set(); };
  P.script_b_tech_up = () => techUp(M[0x8B]);
  P.script_a_tech_up = () => techUp(M[0x8A]);
  P.script_b_tech_down = () => fieldDown(M[0x8B], 5);
  P.script_a_tech_down = () => fieldDown(M[0x8A], 5);
  P.script_b_res_down = () => fieldDown(M[0x8B], 4);
  P.script_a_res_down = () => fieldDown(M[0x8A], 4);
  P.script_b_res_up = () => resUp(M[0x8B]);
  P.script_a_res_up = () => resUp(M[0x8A]);
  // the force: the flag clear when it is stationed in the country
  const forceIn = c => {
    M[0x84] = c;
    P.flag_set();
    if (!M[0x5B57] && M[0x5B56] === c) P.flag_clear();
    return {};
  };
  P.script_force_in_b = () => forceIn(M[0x8B]);
  P.script_force_in_a = () => forceIn(M[0x8A]);

  // ---- the end of each week ($BAA1)
  P.week_end = function* () {
    M[0x5B44] = 1;
    M[0x86] = M[0x5B52];
    let n = M[0x5B58 + ((M[0x5B52] << 2) + M[0x5B52])];
    M[0x88] = 0x58; M[0x89] = 0x5B;
    for (; n; n--) yield* P.in_tray_next();
    M[0x5B52] = (M[0x5B52] + 1) & 3;
    M[0x5B51] = (M[0x5B51] + 1) & 255;
    M[0x5B44] = 0;
    if (M[0x5B57]) M[0x5B57]--;
    P.relations_all_up();
    for (;;) {
      // j_BAE9: the communique, where a RAMLOAD goes on too
      M[0x84] = 1;
      if (M[0x5B53] === 0xFF) return yield* P.game_over();
      M[0x84] = 2;
      if (M[0x5B51] === 0x34) return yield* P.year_over();
      M[0x88] = 0x0F; M[0x89] = 0x59;
      P.table_entry({ a: M[0x5B53] >> 5 });
      M[0x5A96] = M[0x88]; M[0x5A97] = M[0x89];
      if (!M[0x5B53]) { M[0x88] = 0x95; M[0x89] = 0xBB; M[0x5A96] = 0x95; M[0x5A97] = 0xBB; }
      P.letter_window();
      setw(0x80, 0x5DA4);
      let sum = 0;
      for (let x = 16; x; x--) {
        M[0x87] = 0;
        M[0x86] = at(w(0x80), 9);
        sum += M[0x86];
        setw(0x80, w(0x80) + 12);
      }
      setw(0x88, sum);
      M[0x88] = 0x27; M[0x89] = 0x5A;
      P.table_entry({ a: ((sum >> 8) >> 1) & 7 });
      yield* P.print_text();
      const r = yield* P.communique_menu();
      if (r && r.loaded) continue;
      P.close_window();
      return yield* P.force_menu();
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
