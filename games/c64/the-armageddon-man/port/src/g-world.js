// The world: numbers in decimal ($8F7B-$90BF), the countries' tables and records ($90C0-$958B,
// $AA0D-$AA78), texts with their country prompts and numbers ($AA79-$AD32), and each tick's events
// between countries, radio intercepts and Big Bird reports ($AD33-$B160).
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`print_text country_events intercept_none radio_intercept bigbird_none bigbird_report`);
G.world = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  const alive = c => { P.country_record({ a: c }); return ((at(w(0x80), 11) + 1) & 255) !== 0; };
  // the distance the game takes between a level and a hostility: the 8-bit difference, made
  // positive when its top bit is set, so that 0 and $FF lie 1 apart
  const near = (l, h) => { const d = (l - h) & 255; return d & 0x80 ? (-d) & 255 : d; };

  // ---- numbers
  // next_digit ($8FC0): the character at ($86),Y as a digit, carry clear; leading spaces skipped
  P.next_digit = function (r) {
    let y = r.y, a;
    for (;;) {
      a = at(w(0x86), y);
      y = (y + 1) & 255;
      if (M[0x19] || a !== 0x20) break;
    }
    const x = M[0x19];
    M[0x19] = (M[0x19] + 1) & 255;
    const d = (a - 0x30) & 255;
    if (a < 0x30) return { a: d, x, y, c: 1 };
    return { a: d, x, y, c: d >= 10 ? 1 : 0 };
  };
  // parse_number ($8F7B): the decimal number at ($86) into $88/$89
  P.parse_number = function () {
    let y = 0, r;
    M[0x19] = 0; M[0x88] = 0; M[0x89] = 0;
    for (;;) {
      r = P.next_digit({ y });
      y = r.y;
      if (r.c) return { a: r.a, x: r.x, y, c: 1 };
      const v = w(0x88);
      setw(0x88, v * 10 + r.a);
    }
  };
  // write_digits ($9046): the number at $88/$89 as decimal digits at ($09), from the power of ten
  // at $8FDB+$1B; leading zeros as spaces. A number whose two bytes add up to a multiple of 256 is
  // written as 0, as the game's test for zero does.
  const writeDigits = function (r, dest, k) {
    const s88 = M[0x88], s89 = M[0x89];
    M[0x09] = dest & 255; M[0x0A] = dest >> 8; M[0x1B] = k;
    M[0x19] = 0;
    let y = 0, x;
    if (((M[0x89] + M[0x88]) & 255) === 0) {
      let a;
      do {
        put(dest, y, 0x20);
        x = M[0x1B];
        a = M[0x8FDB + x];
        y++;
        M[0x1B] += 2;
        a = (a - 1) & 255;
      } while (a);
      y--;
      put(dest, y, 0x30);
    } else {
      do {
        x = M[0x1B];
        M[0x07] = M[0x8FDB + x]; M[0x08] = M[0x8FDC + x];
        const p = M[0x07] | M[0x08] << 8;
        let v = w(0x88);
        x = 0;
        while (v >= p) { v -= p; x++; }
        // the last subtraction, the one that went below zero, leaves its value in $0D/$0E's copy
        M[0x0D] = v & 255; M[0x0E] = v >> 8;
        setw(0x88, v);
        let a;
        const d = x;
        if (!d) x = M[0x19];
        if (!d && !M[0x19]) a = 0x20;
        else { M[0x19] = (M[0x19] + 1) & 255; a = 0x30 + d; }
        put(dest, y, a);
        y++;
        M[0x1B] += 2;
        M[0x07] = (M[0x07] - 1) & 255;
      } while (M[0x07]);
    }
    M[0x88] = s88; M[0x89] = s89;
    return { a: r.a, x, y };
  };
  P.number_to_digits = r => writeDigits(r || {}, 0x740E, 0);
  P.number_to_text = r => writeDigits(r || {}, 0x8FD7, 4);
  // print_number ($8FE5): A in decimal, without leading zeros
  P.print_number = function (r) {
    const s88 = M[0x88], s89 = M[0x89];
    M[0x88] = r.a; M[0x89] = 0;
    P.number_to_text({ a: 0 });
    M[0x88] = 0xD7; M[0x89] = 0x8F;
    P.print_string();
    M[0x88] = s88; M[0x89] = s89;
    return { a: s89 };
  };

  // ---- the countries' tables
  P.event_levels_row = function (r) {
    const p = 0x958C + ((r.a << 5) & 0xFFFF);
    M[0x0B] = p & 255; M[0x0C] = p >> 8;
    setw(0x80, p);
    return { a: r.a };
  };
  P.intercept_row = function (r) { setw(0x80, 0x91A4 + ((r.a << 3) & 255)); return { a: r.a }; };
  P.bigbird_row = function (r) { setw(0x80, 0x9124 + ((r.a << 3) & 255)); return { a: r.a }; };
  P.relations_row = function (r) { setw(0x80, 0x5C5C + ((r.a << 4) & 255)); return { a: r.a }; };
  P.country_record = function (r) {
    M[0x04] = (r.a << 2) & 255;
    setw(0x80, 0x5DA4 + (((r.a << 3) + M[0x04]) & 255));
    return { a: r.a };
  };
  // new_game ($924C)
  P.new_game = function () {
    for (const a of [0x5B51, 0x5B52, 0x5B54, 0x5B55, 0x5B53, 0x5B50, 0x5B45, 0xB401]) M[a] = 0;
    P.relations_init();
    P.countries_init();
    P.satellites_reset();
    P.mail_init();
    P.force_init();
    return P.radio_reset();
  };
  P.force_init = function () {
    M[0x5B57] = 0;
    M[0x5B56] = P.random().a & 15;
    return { a: M[0x5B56] };
  };
  // script commands $4A, $4B: the condition flag set when the country still exists
  const testAlive = c => { P.flag_clear(); if (alive(c)) P.flag_set(); return {}; };
  P.test_b_alive = () => testAlive(M[0x8B]);
  P.test_a_alive = () => testAlive(M[0x8A]);
  // force_test, script command $32: the flag clear when the force is stationed in A or B
  P.force_test = function () {
    P.flag_set();
    if (M[0x5B57]) return {};
    if (M[0x5B56] === M[0x8B] || M[0x5B56] === M[0x8A]) P.flag_clear();
    return {};
  };
  // script_set_relations, script command $35 n
  P.script_set_relations = function () {
    P.script_fetch();
    M[0x85] = 0;
    setw(0x82, w(0x98) + M[0x84]);
    M[0x86] = M[w(0x82)];
    setw(0x82, w(0x96) + M[0x84]);
    M[0x87] = M[w(0x82)];
    M[0x84] = M[0x8B];
    setw(0x80, w(0x9E) + M[0x84]);
    M[w(0x80)] = M[0x87];
    M[0x84] = M[0x8A];
    setw(0x80, w(0xA0) + M[0x84]);
    M[w(0x80)] = M[0x86];
    return { a: M[0x86], y: 0 };
  };
  // script_settle, script command $31
  P.script_settle = function () {
    setw(0x80, w(0xA0)); setw(0x82, w(0x98));
    P.relation_set({ a: M[0x8A] });
    setw(0x80, w(0x9E)); setw(0x82, w(0x96));
    return P.relation_set({ a: M[0x8B] });
  };
  P.relation_set = function (r) {
    M[0x86] = r.a; M[0x87] = 0;
    setw(0x80, w(0x80) + r.a);
    P.event_level_index({ a: M[0xB160] });
    M[0x85] = 0;
    setw(0x82, w(0x82) + M[0x84]);
    const a = M[w(0x82)];
    M[w(0x80)] = a;
    return { a, y: 0 };
  };
  P.event_level_index = function (r) {
    const a = r.a;
    const x = a < 5 ? 5 : a < 0x13 ? 0x13 : a >= 0x1B ? 0x1B : 0x13;
    M[0x84] = x;
    return { a, x };
  };
  // satellites_reset ($93AD): every satellite out of orbit, those on the map taken off it
  P.satellites_reset = function () {
    setw(0x80, 0x5D5C);
    for (let x = 9; x; x--) {
      if (at(w(0x80), 6) & 1) P.satellite_draw({ x });
      put(w(0x80), 6, at(w(0x80), 6) & 0xFE);
      setw(0x80, w(0x80) + 8);
    }
    return { x: 0 };
  };
  const setCountry = (c, rec, row, lev, name) => {
    M[c.zp] = c.n;
    P.country_record({ a: c.n }); setw(rec, w(0x80));
    P.relations_row({ a: c.n }); setw(row, w(0x80));
    P.event_levels_row({ a: c.n }); setw(lev, w(0x80));
    M[0x88] = 0x4C; M[0x89] = 0xC0;
    P.table_entry({ a: c.n });
    setw(name, w(0x88));
    return {};
  };
  P.set_country_c = () => setCountry({ zp: 0x8C, n: P.most_liked({ a: M[0x8A] }).a }, 0x92, 0xA2, 0x9A, 0x5B39);
  P.set_country_d = () => setCountry({ zp: 0x8D, n: P.most_liked({ a: M[0x8B] }).a }, 0x94, 0xA4, 0x9C, 0x5B41);
  // most_hostile ($946B) and most_liked ($94C2): the highest and lowest of the country's row,
  // leaving out itself and the countries gone
  const best = (r, better) => {
    P.relations_row({ a: r.a });
    M[0x4E91] = 0xFF;
    M[0x86] = r.a;
    M[0x84] = better === 'high' ? 0 : 0xFF;
    M[0x85] = 0;
    do {
      if (M[0x86] !== M[0x85]) {
        const s = w(0x80);
        const ok = alive(M[0x85]);
        setw(0x80, s);
        if (ok) {
          const v = M[s];
          if (better === 'high' ? v >= M[0x84] : v < M[0x84]) { M[0x84] = v; M[0x4E91] = M[0x85]; }
        }
      }
      M[0x85]++;
      setw(0x80, w(0x80) + 1);
    } while (M[0x85] !== 16);
    return { a: M[0x4E91] & 15 };
  };
  P.most_hostile = r => best(r, 'high');
  P.most_liked = r => best(r, 'low');
  // relations_init ($951B): each country's hostility to every country its event 20 level, give or
  // take up to 15
  P.relations_init = function () {
    setw(0x82, 0x5C5C);
    for (let c = 0; c < 16; c++) {
      M[0x04] = c;
      const row = w(0x82);
      P.event_levels_row({ a: c });
      setw(0x80, w(0x80) + 0x14);
      for (let x = 16; x; x--) {
        M[0x84] = P.random().a & 15;
        if (P.random().a < 0x80) M[0x84] = (-M[0x84]) & 255;
        M[w(0x82)] = (M[w(0x80)] + M[0x84]) & 255;
        setw(0x82, w(0x82) + 1);
      }
      setw(0x82, row + 16);
    }
    return { a: 16, x: 0, y: 0 };
  };
  // countries_init ($AA0D): each record from countries_table ($A9AD), 6 bytes a country
  P.countries_init = function () {
    setw(0x82, 0xA9AD); setw(0x80, 0x5DA4);
    for (let x = 16; x; x--) {
      const t = w(0x82), p = w(0x80);
      for (let i = 0; i < 5; i++) put(p, 4 + i, at(t, i));
      put(p, 10, at(t, 5));
      put(p, 11, 0);
      put(p, 9, 0x80);
      setw(0x82, t + 6); setw(0x80, p + 12);
    }
    return { x: 0, y: 9 };
  };

  // ---- texts
  // print_text ($AB0E): the text at $88/$89 up to its '$', with '@' parts, '%' numbers and '*'
  // country prompts; $88/$89 is left at the '$'
  P.print_text = function* () {
    for (;;) {
      const p = w(0x88);
      const c = M[p];
      if (c === 0x24) return { a: c, y: 0 };
      if (c === 0x2A) {
        setw(0x88, p + 1);
        const letter = at(p, 1);
        yield* P.choose_country();
        if (letter === 0x41) { M[0x8A] = M[0x8486]; M[0x5B35] = M[0x8488]; M[0x5B36] = M[0x8489]; }
        else { M[0x8B] = M[0x8486]; M[0x5B3D] = M[0x8488]; M[0x5B3E] = M[0x8489]; }
        setw(0x88, p + 2);
      } else if (c === 0x40) {
        M[0x86] = at(p, 1); M[0x87] = at(p, 2);
        setw(0x88, w(0x86));
        yield* P.print_text();
        setw(0x88, p + 3);
      } else if (c === 0x25) {
        M[0x86] = at(p, 1); M[0x87] = at(p, 2);
        setw(0x88, p + 2);
        P.print_number({ a: M[w(0x86)] });
        setw(0x88, p + 3);
      } else {
        P.print_char({ a: c, y: 0 });
        setw(0x88, p + 1);
      }
    }
  };
  // expand_text ($AB7C): the text written out in full into message_buffer ($AC25), '$' after it;
  // $88/$89 at radio_header ($ABFE)
  P.expand_text = function () {
    setw(0x80, 0xAC25);
    P.expand_copy();
    M[w(0x80)] = 0x24;
    M[0x88] = 0xFE; M[0x89] = 0xAB;
    return { a: 0xAB, y: 0 };
  };
  P.expand_copy = function () {
    for (;;) {
      const p = w(0x88);
      const c = M[p];
      if (c === 0x24) return { a: (p >> 8) & 255, y: 0 };
      if (c === 0x40) {
        M[0x86] = at(p, 1); M[0x87] = at(p, 2);
        setw(0x88, w(0x86));
        P.expand_copy();
        setw(0x88, p + 3);
      } else {
        M[w(0x80)] = c;
        setw(0x80, w(0x80) + 1);
        setw(0x88, p + 1);
      }
    }
  };
  // table_entry ($AD15): $88/$89 becomes the word at entry A of the table at $88/$89
  P.table_entry = function (r) {
    setw(0x88, w(0x88) + ((r.a << 1) & 255));
    const p = w(0x88);
    M[0x07] = M[p]; M[0x08] = at(p, 1);
    M[0x88] = M[0x07]; M[0x89] = M[0x08];
    return { a: M[0x08], y: 1 };
  };

  // ---- the countries of an event
  // pick_country_a ($AD33): a random country that still exists as A
  P.pick_country_a = function () {
    do {
      M[0x8A] = P.random().a & 15;
      P.country_record({ a: M[0x8A] });
      setw(0x8E, w(0x80));
    } while (((at(w(0x80), 11) + 1) & 255) === 0);
    P.relations_row({ a: M[0x8A] }); setw(0x9E, w(0x80));
    P.event_levels_row({ a: M[0x8A] }); setw(0x96, w(0x80));
    return { a: M[0x8A] };
  };
  // set_countries ($AD6B): A and B with their records, rows, levels and names, then C and D. A
  // country A of 16 or more halts the game (halt_with_border, from the main program's loop).
  P.set_countries = function () {
    const b = M[0x8B];
    P.country_record({ a: b }); setw(0x90, w(0x80));
    P.event_levels_row({ a: b }); setw(0x98, w(0x80));
    P.relations_row({ a: b }); setw(0xA0, w(0x80));
    M[0x88] = 0x4C; M[0x89] = 0xC0;
    P.table_entry({ a: b });
    M[0x5B3D] = M[0x88]; M[0x5B3E] = M[0x89];
    const a = M[0x8A];
    P.country_record({ a }); setw(0x8E, w(0x80));
    P.event_levels_row({ a }); setw(0x96, w(0x80));
    P.relations_row({ a }); setw(0x9E, w(0x80));
    M[0x88] = 0x4C; M[0x89] = 0xC0;
    if (a >= 16) { const j = new P.Jump('halt'); j.a = a - 16; throw j; }
    P.table_entry({ a });
    M[0x5B35] = M[0x88]; M[0x5B36] = M[0x89];
    P.set_country_c();
    return P.set_country_d();
  };
  // country_events ($AE77): once each tick; an exchange's reply first (country_reply, $AE08)
  P.country_events = function* () {
    if (M[0x5B45]) {
      const s = M[0x5B47];
      M[0xADF8] = s;
      if (alive(s)) {
        M[0x8B] = M[0x5B46];
        M[0x8A] = s;
        P.set_countries();
        if (((at(w(0x90), 11) + 1) & 255) !== 0) {
          const h = at(w(0x9E), M[0x8B]);
          M[0x04] = h;
          setw(0x80, w(0x96));
          for (let x = 0; x < 32; x++) {
            const l = at(w(0x80), x);
            let d;
            if (l === 0) d = h;
            else if (l === 0xFF) d = h & 0x80 ? (h + 2) & 255 : 0xFF;
            else d = near(l, h);
            if (d < 2) return yield* P.run_event({ x });
          }
        }
      }
      M[0x5B45] = 0;
    }
    P.pick_country_a();
    let b = P.random().a & 15;
    for (let x = 16; x; x--) {
      M[0x8B] = b;
      if (alive(b) && b !== M[0x8A]) {
        P.point_a_to_b();
        M[0x87] = M[w(0x80)];
        M[0x85] = 0;
        setw(0x80, w(0x96));
        do {
          const l = M[w(0x80)];
          if (l && near(l, M[0x87]) < 2) {
            M[0x5B45] = 1;
            return yield* P.run_event({ x: M[0x85] });
          }
          M[0x85]++;
          setw(0x80, w(0x80) + 1);
        } while (M[0x85] !== 0x20);
      }
      b = (M[0x8B] + 1) & 15;
    }
    M[0x5B45] = 0;
    return P.relations_row_up();
  };

  // ---- radio intercepts and Big Bird reports
  P.intercept_none = function* () {
    if (!P.country_on_band().z) return {};
    if (!M[0x5E67] && P.random().a !== 0) return {};
    M[0x85] = M[0x8A];
    let x = 20, a;
    for (;;) {
      a = P.random().a;
      if (!--x) return {};
      a &= 15;
      if (a !== M[0x85]) break;
    }
    M[0x8B] = a;
    P.set_countries();
    P.point_a_to_b();
    M[0x88] = 0x1F; M[0x89] = 0x59;
    P.table_entry({ a: M[w(0x80)] >> 5 });
    M[0x598A] = M[0x88]; M[0x598B] = M[0x89];
    M[0x88] = 0x63; M[0x89] = 0x59;
    return yield* P.radio_message();
  };
  P.radio_intercept = function* () {
    if (P.intercept_pick().c) return yield* P.intercept_none();
    M[0xB160] = M[0x85] & 7;
    P.set_countries();
    M[0x88] = 0x0E; M[0x89] = 0x56;
    P.table_entry({ a: M[0xB160] });
    yield* P.radio_message();
    M[0x88] = 0xFE; M[0x89] = 0x55;
    return yield* P.run_script({ a: M[0xB160] });
  };
  P.bigbird_none = function* () {
    P.satellite_census();
    let a = P.random().a & 15, x = 16;
    for (;;) {
      M[0x84] = (M[0xBEFF + a] - 1) & 255;
      if (!M[0x84]) break;
      a = (a + 1) & 15;
      if (!--x) return {};
    }
    M[0x84] = a;
    if (!alive(a)) return {};
    M[0x8A] = a;
    let b;
    do { b = P.random().a & 15; } while (b === M[0x8A] || !alive(b));
    M[0x8B] = b;
    P.set_countries();
    P.open_window({ at: 0xAFE5 });
    P.point_a_to_b();
    M[0x88] = 0x1F; M[0x89] = 0x59;
    P.table_entry({ a: M[w(0x80)] >> 5 });
    M[0x598A] = M[0x88]; M[0x598B] = M[0x89];
    M[0x88] = 0x2F; M[0x89] = 0x59;
    yield* P.print_text();
    yield* P.wait_fire_up({});
    yield* P.wait_press({});
    return P.close_window();
  };
  P.bigbird_report = function* () {
    if (P.bigbird_pick().c) return yield* P.bigbird_none();
    M[0xB160] = M[0x85] & 7;
    P.set_countries();
    P.bigbird_over_a();
    if (!M[0xB0DD]) return {};
    P.open_window({ at: 0xB045 });
    P.print_inline({ at: 0xB050 });
    M[0x88] = 0xB9; M[0x89] = 0x57;
    P.table_entry({ a: M[0xB160] });
    yield* P.print_text();
    yield* P.wait_fire_up({});
    yield* P.wait_press({});
    P.close_window();
    M[0x88] = 0xA9; M[0x89] = 0x57;
    return yield* P.run_script({ a: M[0xB160] });
  };
  // bigbird_over_a ($B08E), also script command $36
  P.bigbird_over_a = function () {
    P.flag_clear();
    M[0xB0DD] = 0;
    setw(0x82, 0x5D8C);
    setw(0x80, w(0x8E));
    for (let x = 3; x; x--) {
      if ((at(w(0x82), 6) & 1) && P.in_cover().c) {
        M[0x04] = x;
        M[0xB0DD] = 3 - x + 1;
        return { a: M[0xB0DD], x };
      }
      setw(0x82, w(0x82) + 8);
    }
    P.flag_set();
    return { x: 0 };
  };
  // bigbird_pick ($B0DE) and intercept_pick ($B0E9): a country A and a B whose hostility from A
  // lies within 9 of one of A's eight levels; carry clear and the level's number in $85
  const levelSearch = function () {
    setw(0x96, w(0x80));
    let b = 0;
    do {
      M[0x8B] = b; M[0x84] = b;
      if (M[0x8A] !== b) {
        P.point_a_to_b();
        M[0x87] = M[w(0x80)];
        M[0x85] = 0;
        setw(0x80, w(0x96));
        do {
          if (near(M[w(0x80)], M[0x87]) < 10) return { c: 0 };
          M[0x85]++;
          setw(0x80, w(0x80) + 1);
        } while (M[0x85] !== 8);
      }
      b = (M[0x8B] + 1) & 255;
    } while (b !== 16);
    return { c: 1 };
  };
  P.bigbird_pick = function () {
    P.pick_country_a();
    P.bigbird_row({ a: M[0x8A] });
    return levelSearch();
  };
  P.intercept_pick = function () {
    M[0x45] = 8;
    for (;;) {
      M[0x45] = (M[0x45] - 1) & 255;
      if (!M[0x45]) return { c: 1 };
      P.pick_country_a();
      if (P.country_on_band().z) break;
    }
    if (!(P.random().a & 4)) return { c: 1 };
    P.intercept_row({ a: M[0x8A] });
    return levelSearch();
  };
  P.do_nothing = () => ({});
};
})(typeof window !== 'undefined' ? window : globalThis);
