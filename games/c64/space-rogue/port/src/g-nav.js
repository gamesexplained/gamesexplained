// Navigation Control (key N): the system chart and its menu, CHART, HELM (the autopilot, with the
// clock, the encounters and the spoiling of cargo on the way), STATUS, QUERY, SCAN and COCKPIT;
// the system map's entries and their motions; the clock. SR's code from $2021 to $20EB, $2543 to
// $3101, and the chart's drawing, $8638 to $87FD.
//
// The chart is a window of 11 by 9 sectors around the cursor ($C6, $C7) on the system's 32 by 32
// grid, which the system's map file ("Q" and its digit) loads to $5100, with its 32 entries (ships,
// planets, bases, storms: the player's ship is entry 0) at $5510 (x), $5530 (y), $5550 (flags:
// motion kind in bits 0-2, heading in bits 3-4), $5570 (tile), $5590 (type) and $55D0 (a message,
// two bytes each). The window's tile numbers are built in $FA00 (99 cells, the top row first) and
// drawn from the tiles NAV.TIL loads to $4000: tile t's pixel row r at $4080 + $100 r + t (left
// byte) and $4000 + $100 r + t (right byte), its attribute at $5000 + t and its colours at
// $5080 + t. Rows count up: Y + 1 is the sector above.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.nav = function (P) {
  const M = P.M;
  const R = (r, o) => Object.assign({}, r, o);
  const ptr = zp => M[zp] | M[(zp + 1) & 255] << 8;
  const op = a => M[a] | M[a + 1] << 8;
  const writer = () => ((M[1] & 3) ? P.wr : (a, v) => { M[a] = v; });
  const reader = () => ((M[1] & 3) ? P.rd : a => M[a]);
  // a step's direction, -1, 0 or 1 as a byte, by the sign of a - b as the 6502's N gives it
  const toward = (a, b) => (a === b ? 0 : ((a - b) & 0x80) ? 0xFF : 1);
  // |a - b| as in_chart_window takes it: SBC, then EOR #$FF and ADC #1 with the SBC's carry
  const apart = (a, b) => {
    const d = (a - b) & 255, c = a >= b ? 1 : 0;
    return { d, m: d & 0x80 ? ((d ^ 0xFF) + 1 + c) & 255 : d };
  };

  // ---- the clock: hours ($0720), day ($0721), month ($0722), year ($0723), days elapsed ($0724)
  P.advance_clock = function (r) {
    let a = r.a, y = r.y, x = a;
    if (!x) return { a: 0, x: 0, y, z: 1 };
    do {
      M[0x0720] = (M[0x0720] + 1) & 255;
      a = M[0x0720];
      if (a >= 0x18) { M[0x0720] = 0; const o = P.next_day({ a: 0, x, y }); a = o.a; y = o.y; }
      x = (x - 1) & 255;
    } while (x);
    return { a, x: 0, y };
  };
  P.next_day = function (r) {
    M[0x0724] = (M[0x0724] + 1) & 255;
    if (!M[0x0724]) M[0x0725] = (M[0x0725] + 1) & 255;
    M[0x0721] = (M[0x0721] + 1) & 255;
    const y = M[0x0722];
    if (M[0x20AF + y] >= M[0x0721]) return { a: M[0x20AF + y], x: r.x, y };
    M[0x0721] = 1;
    M[0x0722] = (M[0x0722] + 1) & 255;
    if (0x0C >= M[0x0722]) return { a: 0x0C, x: r.x, y };
    M[0x0722] = 1;
    M[0x0723] = (M[0x0723] + 1) & 255;
    if (0x63 >= M[0x0723]) return { a: 0x63, x: r.x, y };
    M[0x0723] = 0;
    return { a: 0, x: r.x, y };
  };
  // "12 JAN 52": the month's name at $20B8 + 4 * month
  P.print_date = function* (r) {
    let o = yield* P.print_signed({ a: M[0x0721], x: r.x, y: r.y });
    o = yield* P.print_char({ a: 0x20, x: o.x, y: o.y });
    const s = ((M[0x0722] << 2) & 255) + 0xB8;
    const x = s & 255, y = 0x20 + (s >> 8);
    o = yield* P.print_text({ a: y, x, y });
    o = yield* P.print_char({ a: 0x20, x: o.x, y: o.y });
    return yield* P.print_signed({ a: M[0x0723], x: o.x, y: o.y });
  };
  P.print_time = function* (r) {
    const o = yield* P.print_signed({ a: M[0x0720], x: r.x, y: r.y });
    return yield* P.print_text({ a: o.a, x: 0xA8, y: 0x20 });
  };

  // ---- Navigation Control
  P.navigation = function* (r) {
    let o = yield* P.print_message({ a: 0x26, x: 0xD3 });
    P.show_bank3(o);
    P.mirror_text_off();
    M[0x3A] = 0; M[0xC8] = 0;
    o = P.load_picture({ a: 1, x: o.x, y: o.y });
    P.select_window({ y: 1 });
    M[0x0D30] = 3; M[0x0D31] = 0xB7; M[0x0D32] = 0;
    P.load_nav_tiles();
    P.load_system_map();
    P.window_full();
    M[0xC6] = M[0x5510] = M[0x071E];
    M[0xC7] = M[0x5530] = M[0x071F];
    P.plot_course({ x: 0 });
    // the ships in slots 1-5 whose target is the player
    let x = 0;
    for (let y = 5; y; y--) if (M[0x05F9 + y] && !M[0x0445 + y]) x = (x + 1) & 255;
    M[0x0D07] = x;
    o = P.nav_menu_colour({ x, y: 0 });
    for (;;) {
      M[0x4F] = 0x1C; M[0x50] = 0x2F;
      o = yield* P.print_date(o);
      M[0x4F] = 0x1C; M[0x50] = 0x38;
      o = yield* P.print_time(o);
      P.select_window({ y: 1 });
      yield* P.draw_chart_cursor();
      o = yield* P.nav_menu();
      // COCKPIT dropped this loop's return address: back in the cockpit
      if (o.up) return R(o, { up: undefined });
    }
  };
  // HELM can be chosen with no ship near and a course laid in
  P.nav_menu = function* (r) {
    let x = 0;
    if (!M[0x0D07] && !(M[0xFC00] & 0x80)) x = 1;
    M[0x2723] = x;
    M[0x4F] = 0x1D; M[0x50] = 0xAE;
    M[0x78] = 0x22; M[0x79] = 0x27; M[0x7A] = 0xF1; M[0x7B] = 0x26;
    const o = yield* P.menu({ a: 6, x, y: 7 });
    const y = o.y;
    if (y === 0) return yield* P.nav_chart(o);
    if (y === 1) return yield* P.nav_helm(o);
    if (y === 2) return yield* P.nav_status(o);
    if (y === 3) return yield* P.nav_query(o);
    if (y === 4) return yield* P.nav_scan(o);
    return yield* P.nav_cockpit(o);
  };
  // The cursor moved about the chart, with the cursor's sector named, until Return, Space or fire
  P.nav_scan = function* (r) {
    M[0x0D2F] = 1;
    let k;
    for (;;) {
      yield* P.nav_cursor_info();
      k = P.key_direction();
      if (k.c) break;
      P.move_cursor(R(k, { c: 0 }));
      const o = yield* P.draw_chart_cursor();
      if (!o.z) { k = o; break; }
    }
    M[0x0D2F] = 0;
    return { a: 0, x: k.x, y: k.y, z: 1, n: 0 };
  };
  // The ship's new sector set up if it moved; then the menu's return address (navigation's
  // loop) dropped, and the cockpit put back
  P.nav_cockpit = function* (r) {
    if (M[0xC8]) {
      M[0x071E] = M[0x5510];
      M[0x071F] = M[0x5530];
      P.enter_sector({ a: M[0x071F], x: r.x, y: r.y });
    }
    const o = yield* P.back_to_cockpit();
    return R(o, { up: 1 });
  };
  P.move_cursor = function (r) {
    let a = (r.x + M[0xC6]) & 255;
    if (a >= 0x20) return { a, x: r.x, y: r.y, c: 1 };
    M[0x80] = a;
    a = (r.y + M[0xC7]) & 255;
    if (a >= 0x20) return { a, x: r.x, y: r.y, c: 1 };
    M[0xC7] = a; M[0xC6] = M[0x80];
    return { a: M[0x80], x: r.x, y: r.y, c: 0 };
  };
  // The chart around the cursor drawn, then a tick's wait (fire noted: Z clear); the frame
  // counter $5E, which animates tiles, moves on every other call
  P.draw_chart_cursor = function* (r) {
    P.fill_chart_window({ a: 5, x: M[0xC6], y: M[0xC7] });
    P.draw_map_objects({ x: M[0xC6], y: M[0xC7] });
    P.animate_chart();
    P.draw_course();
    P.draw_chart();
    M[0xBD] = (M[0xBD] + 1) & 255;
    if (M[0xBD] & 1) M[0x5E] = (M[0x5E] + 1) & 255;
    return yield* P.wait_ticks({ a: 1 });
  };
  // STATUS: SEG1, the base's overlay, holds the status pages
  P.nav_status = function* (r) {
    P.reset_models();
    P.load_seg1();
    P.select_window({ y: 3 });
    P.clear_view();
    yield* P.status_pages({ a: 7, x: 0x1D, y: 0xAE });
    P.load_seg0();
    return P.load_slot_models();
  };
  P.load_nav_tiles = function (r) {
    M[0x80] = 0; M[0x81] = 0x40;
    return P.load_file({ a: 0x40, x: 0x1C, y: 0x08 });
  };
  // HELM's line on the menu greyed ($78) when X is not zero
  P.nav_menu_colour = function (r) {
    const a = ((r.x - 1) & 0x80) ? 0x5C : 0x78;
    for (let x = 6; x >= 0; x--) { M[0xE225 + x] = a; M[0xE1FD + x] = a; }
    return { a, x: 0xFF, y: r.y };
  };

  // HELM: a sector of the course at a time, until it ends, ships are near, or a key or fire stops it
  P.nav_helm = function* (r) {
    M[0xC6] = M[0x5510]; M[0xC7] = M[0x5530];
    for (;;) {
      const a = M[0xFC00];
      if (a & 0x80) return yield* P.print_message({ a: 0x28, x: 0x47 });
      M[0xC6] = a;
      const x = (a - M[0x5510]) & 255;
      M[0xC7] = M[0xFC20];
      const y = (M[0xFC20] - M[0x5530]) & 255;
      M[0xB3] = x & y;                       // not zero for a diagonal step
      P.set_ship_heading({ a: 0, x, y });
      M[0xC8] = 1;
      M[0x5510] = M[0xC6]; M[0x5530] = M[0xC7];
      const o = yield* P.helm_step_time({ a: M[0xB3], x: M[0xC6], y: M[0xC7] });
      M[0xB4] = o.a;
      const p = P.plot_course(o);
      if (M[0x0D07]) return P.nav_menu_colour({ x: M[0x0D07], y: p.y });
      if (M[0xB4]) return { a: M[0xB4], x: 0, y: p.y };
    }
  };
  // CHART: the destination ($072C, $FF until the cursor first moves) follows the cursor, and the
  // course is plotted to it; Return, Space or fire leaves
  P.nav_chart = function* (r) {
    M[0x0D2F] = 0xFF; M[0x072C] = 0xFF;
    M[0xC6] = M[0x5510]; M[0xC7] = M[0x5530];
    let o;
    outer: for (;;) {
      yield* P.nav_cursor_info();
      P.plot_course({ x: 0 });
      for (;;) {
        o = yield* P.draw_chart_cursor();
        if (!o.z) break outer;
        const k = P.key_direction();
        if (k.c) { o = k; break outer; }
        if (!k.x && !k.y) continue;
        if (P.move_cursor(R(k, { c: 0 })).c) continue;
        M[0x072C] = M[0xC6]; M[0x072D] = M[0xC7];
        continue outer;
      }
    }
    if (!(M[0xFC00] & 0x80)) o = yield* P.print_message({ a: 0x28, x: 0x2B });
    M[0x0D2F] = 0;
    return { a: 0, x: o.x, y: o.y, z: 1, n: 0 };
  };
  // "SC 12,07" on the info line, and "-message-" below when an entry with a message (other than
  // the ship's own, entry 0) is in the cursor's sector
  P.nav_cursor_info = function* (r) {
    M[0x4F] = 0x1C; M[0x50] = 0x38;
    let o = yield* P.print_text({ a: 0x38, x: 0x67, y: 0x28 });
    o = yield* P.print_signed({ a: M[0xC6], x: o.x, y: o.y });
    o = yield* P.print_char({ a: 0x2C, x: o.x, y: o.y });
    o = yield* P.print_signed({ a: M[0xC7], x: o.x, y: o.y });
    M[0x4F] = 0x1C; M[0x50] = 0x30;
    let a = 0x30;
    for (let y = 0x1F; y; y--) {
      a = M[0xC6];
      if (a !== M[0x5510 + y]) continue;
      a = M[0xC7];
      if (a !== M[0x5530 + y]) continue;
      a = M[0x55D1 + 2 * y];
      if (a !== 0xFF) return yield* P.print_text({ a, x: 0x6C, y: 0x28 });
    }
    return yield* P.print_text({ a, x: 0x76, y: 0x28 });
  };
  // The course from the ship's sector to the destination, a step at a time, diagonally while both
  // coordinates differ; x to $FC00 and y to $FC20, $FF after the last
  P.plot_course = function (r) {
    for (let y = 0x1F; y >= 0; y--) M[0xFC00 + y] = 0xFF;
    M[0x87] = 0x1F;
    if (M[0x072C] & 0x80) return { a: M[0x072C], x: r.x, y: 0xFF };
    M[0x87] = 0;
    M[0x85] = M[0x5510]; M[0x86] = M[0x5530];
    let a, x, y;
    do {
      x = toward(M[0x072C], M[0x85]);
      y = toward(M[0x072D], M[0x86]);
      M[0x88] = x;
      if (!(x | y)) return { a: 0, x, y };
      a = (x + M[0x85]) & 255;
      M[0x85] = a;
      x = M[0x87];
      M[0xFC00 + x] = a;
      a = (y + M[0x86]) & 255;
      M[0x86] = a;
      M[0xFC20 + x] = a;
      M[0x87] = (M[0x87] + 1) & 255;
    } while (!(M[0x87] & 0x80));
    return { a, x, y };
  };
  // The course's sectors on the chart: an empty cell (tile $7D) on it becomes tile 7
  P.draw_course = function (r) {
    M[0x51] = M[0xC6]; M[0x53] = M[0xC7];
    const rd = reader(), wr = writer();
    let y = 0, x, a = M[0xC7];
    M[0x8A] = 0;
    for (;;) {
      x = rd(0xFC00 + y);
      if (x & 0x80) return { a, x, y };
      a = rd(0xFC20 + y);
      const w = P.in_chart_window({ x, y: a });
      x = w.x; a = w.a;
      if (!w.c) {
        const i = P.chart_cell_index({ x: w.x, y: w.y });
        a = rd(0xFA00 + i.y);
        if (a === 0x7D) { a = 7; wr(0xFA00 + i.y, 7); }
      }
      M[0x8A] = (M[0x8A] + 1) & 255;
      y = M[0x8A];
      if (y & 0x80) return { a, x, y };
    }
  };

  // ---- a HELM step's time: 5 hours straight or 7 diagonally, the clock moved on an hour at a
  // time with the chart redrawn, which a key or fire stops ($AB counts from then on); a new day's
  // repairs and lists; then cargo may spoil, the map's entries move, the message line is
  // cleared and an encounter may come
  P.helm_step_time = function* (r) {
    M[0xA9] = M[0x0721];
    let o = P.step_hours(r);
    M[0xAA] = o.a;
    M[0xAB] = 0;
    do {
      o = P.advance_clock({ a: 1, x: o.x, y: o.y });
      M[0x4F] = 0x1C; M[0x50] = 0x38;
      o = yield* P.print_time(o);
      M[0x4F] = 0x1C; M[0x50] = 0x2F;
      o = yield* P.print_date(o);
      if (M[0xAB]) M[0xAB] = (M[0xAB] + 1) & 255;
      else if (!(yield* P.draw_chart_cursor()).z) M[0xAB] = (M[0xAB] + 1) & 255;
      else if (P.get_key().c) M[0xAB] = (M[0xAB] + 1) & 255;
      M[0xAA] = (M[0xAA] - 1) & 255;
    } while (M[0xAA]);
    if (M[0xA9] !== M[0x0721]) {
      P.daily_repair();
      for (let y = 0x0D; y >= 0; y--) M[0x07AE + y] = 0;
      M[0x0783] = 0;
      const x = P.random().a, y = P.random().a;
      P.random_seed({ a: y, x, y });
    }
    P.helm_hazard_check({ a: M[0xA8] });
    P.move_map_objects();
    const w = P.select_window({ y: 1 });
    yield* P.scroll_window(w);
    M[0x0832] = M[0x0833] = M[0x0834] = 0;
    o = yield* P.helm_encounter();
    return R(o, { a: M[0xAB], n: M[0xAB] >> 7, z: M[0xAB] ? 0 : 1 });
  };
  // An encounter rolled for the step's hours ($A8); when one comes, its message, effect 4 and
  // 20 ticks, which fire ends; fire then or a key waiting after stops the autopilot ($AB)
  P.helm_encounter = function* (r) {
    M[0x0D04] = 0xFF;
    const e = P.encounter_roll({ a: M[0xA8] });
    if (e.n) return e;
    const near = M[0x0D07];
    yield* P.print_message(near ? { a: 0x29, x: 0xF3, y: near } : { a: 0x2A, x: 0, y: near });
    P.sound_play({ a: 4 });
    M[0xAA] = 0x14;
    let o;
    do {
      o = yield* P.wait_ticks({ a: 1 });
      if (!o.z) { M[0xAB] = (M[0xAB] + 1) & 255; return o; }
      M[0xAA] = (M[0xAA] - 1) & 255;
    } while (M[0xAA]);
    const k = P.get_key(o);
    if (k.c) M[0xAB] = (M[0xAB] + 1) & 255;
    return k;
  };
  // The hours a step costs: doubled in a slow sector (sector_kind_flags) and with the drive
  // damaged ($0409 bit 2)
  P.step_hours = function (r) {
    M[0xA8] = r.a ? 7 : 5;
    const k = P.sector_kind({ x: r.x, y: r.y });
    const x = k.a >> 4;
    if (M[0x1703 + x] & 0x80) M[0xA8] = (M[0xA8] << 1) & 255;
    if (M[0x0409] & 4) M[0xA8] = (M[0xA8] << 1) & 255;
    return { a: M[0xA8], x, y: 0 };
  };
  // Spoiling: a chance of half the hours in 101, four times that in a sector with an ion storm
  // (an entry of type $64); the highest hold slot whose cargo spoils (cargo_spoils) becomes
  // kind $14
  P.helm_hazard_check = function (r) {
    M[0x94] = r.a >> 1;
    const s = P.sector_entries({ x: M[0x5510], y: M[0x5530] });
    let y = s.y, x = s.x, a;
    const rd = reader();
    for (;;) {
      y = (y - 1) & 255;
      if (y & 0x80) break;
      x = rd((ptr(0x74) + y) & 0xFFFF);
      if (M[0x5590 + x] === 0x64) { M[0x94] = (M[0x94] << 2) & 255; break; }
    }
    a = P.random_upto({ a: 0x64, x }).a;
    if (a >= M[0x94]) return { a, x, y: a };
    for (y = (M[0x0777] - 1) & 255; !(y & 0x80); y = (y - 1) & 255) {
      x = M[0x0767 + y];
      if (x & 0x80) continue;
      a = M[0x0D08 + x];
      if (!(a & 0x80)) continue;
      M[0x0767 + y] = 0x14;
      return { a: 0x14, x, y };
    }
    return { a, x, y: 0xFF };
  };
  // With the repair droid ($0740), a new day clears random bits of the player's damage
  P.daily_repair = function (r) {
    if (!M[0x0740]) return R(r, { a: 0, z: 1 });
    M[0x8A] = P.random().a;
    const a = P.random().a | M[0x8A];
    M[0x0409] &= a;
    return R(r, { a: M[0x0409] });
  };

  // ---- QUERY: the sector under the cursor, written into $FA00 and printed wrapped, then the
  // message of its last entry that has one; a key ends it
  const append = (lo, hi) => { M[0x74] = lo; M[0x75] = hi; return P.append_text({ a: hi }); };
  P.nav_query = function* (r) {
    P.select_window({ y: 3 });
    P.clear_view();
    let o = yield* P.print_text({ a: 0, x: 0x05, y: 0x55 });
    M[0x4F] = (M[0x0D21] - 4) & 255;
    o = yield* P.print_signed({ a: M[0xC6], x: o.x, y: o.y });
    o = yield* P.print_char({ a: 0x2C, x: o.x, y: o.y });
    o = yield* P.print_signed({ a: M[0xC7], x: o.x, y: o.y });
    yield* P.print_text({ a: M[0xC7], x: 0x0D, y: 0x2C });
    M[0xA8] = 0; M[0xFA00] = 0;
    M[0x78] = 0; M[0x79] = 0xFA;
    append(0xF6, 0x2B);                                     // "FEATURES "
    const rd = reader();
    let y = (P.sector_entries({ x: M[0xC6], y: M[0xC7] }).y - 1) & 255;
    if (!(y & 0x80)) {
      M[0xA9] = y; M[0x76] = M[0x74]; M[0x77] = M[0x75];
      do {
        const a = M[0x5590 + rd((ptr(0x76) + y) & 0xFFFF)];
        if (!(a & 0x80) && a) P.query_name({ a });
        M[0xA9] = (M[0xA9] - 1) & 255;
        y = M[0xA9];
      } while (!(y & 0x80));
    }
    y = P.sector_kind({ x: M[0xC6], y: M[0xC7] }).a >> 3;
    M[0x74] = M[0x170D + y]; M[0x75] = M[0x170E + y];
    if (M[0x75] >= 0xC0 && M[0x75] < 0xD0) P.append_text({ a: M[0x75] });
    else P.query_end_list();
    append(0x07, 0x2C);                                     // two returns
    append(0x00, 0x2C);                                     // "SHIPS "
    M[0xA8] = 0;
    if (M[0xC6] === M[0x5510] && M[0xC7] === M[0x5530]) {
      if (M[0xC8]) {
        // what the autopilot met here
        for (M[0xA9] = 2; !(M[0xA9] & 0x80); M[0xA9] = (M[0xA9] - 1) & 255) {
          const a = M[0x0D04 + M[0xA9]];
          if (!(a & 0x80)) P.query_name({ a });
        }
      } else {
        // the ships about that do no damage
        for (M[0xA9] = 5; M[0xA9]; M[0xA9] = (M[0xA9] - 1) & 255) {
          const s = M[0xA9];
          if (!M[0x05F9 + s]) continue;
          const t = M[0x060D + s];
          if (!M[0x0AEF + t]) P.query_name({ a: t });
        }
      }
    }
    P.query_end_list();
    append(0x07, 0x2C);
    yield* P.print_wrapped({ a: M[0x79], x: M[0x78] });
    o = P.sector_entries({ x: M[0xC6], y: M[0xC7] });
    o.y = (o.y - 1) & 255;
    for (; !(o.y & 0x80); o.y = (o.y - 1) & 255) {
      o.x = (rd((ptr(0x74) + o.y) & 0xFFFF) << 1) & 255;
      o.a = M[0x55D1 + o.x];
      if (o.a === 0xFF) continue;
      o = yield* P.print_wrapped({ a: o.a, x: M[0x55D0 + o.x], y: o.y });
      break;
    }
    return yield* P.wait_key(o);
  };
  // A list's end: the last ", " taken off, or "none" when nothing was named
  P.query_end_list = function (r) {
    if (!M[0xA8]) return append(0xF1, 0x2B);
    M[0x74] = M[0x78]; M[0x75] = M[0x79];
    const o = P.text_length({ a: M[0x79] });
    const y = (o.y - 2) & 255;
    writer()((ptr(0x78) + y) & 0xFFFF, 0);
    return { a: 0, x: o.x, y };
  };
  // A map entry's name and ", ": an object type's below $64, a hazard's from $64
  P.query_name = function (r) {
    let y;
    if (r.a >= 0x64) { y = ((r.a - 0x64) << 1) & 255; M[0x74] = M[0x2C12 + y]; M[0x75] = M[0x2C13 + y]; }
    else { y = (r.a << 1) & 255; M[0x74] = M[0x0B12 + y]; M[0x75] = M[0x0B13 + y]; }
    P.append_text({ a: M[0x75] });
    M[0xA8] = (M[0xA8] + 1) & 255;
    return append(0x0A, 0x2C);
  };

  // ---- encounters
  // The chance from the hours and the system's danger level, both in log form and multiplied, over
  // $495 (a division), back to linear; then up to three ship types, with their factions in $97-$99.
  // A first type whose faction is negative ends it there (the N of pick_ship's last load is the
  // faction's), so no second or third type is drawn and none attacks.
  P.encounter_roll = function (r) {
    M[0x60] = r.a; M[0x61] = 0;
    P.uint16_to_log(r);
    M[0x62] = M[0x5F]; M[0x63] = M[0x60];
    M[0x60] = M[0x077C]; M[0x61] = 0;
    const u = P.uint16_to_log(r);
    let s = M[0x62] + M[0x5F];
    M[0x5F] = s & 255;
    M[0x60] = (M[0x63] + M[0x60] + (s >> 8)) & 255;
    s = M[0x5F] - 0x95;
    M[0x5F] = s & 255;
    M[0x60] = (M[0x60] - 4 - (s < 0 ? 1 : 0)) & 255;
    const l = P.log_to_lin(u);
    M[0x96] = M[0x60];
    M[0x0D07] = 0;
    M[0x0D05] = M[0x0D06] = 0xFF;
    let o = P.pick_ship({ x: l.x, y: l.y });
    M[0x97] = o.x; M[0x0D04] = o.a;
    if (!o.n) {
      o = P.pick_ship(o); M[0x98] = o.x; M[0x0D05] = o.a;
      o = P.pick_ship(o); M[0x99] = o.x; M[0x0D06] = o.a;
      o = P.encounter_hostile(o);
    }
    const a = M[0x0D04];
    return { a, x: o.x, y: o.y, n: a >> 7, z: a ? 0 : 1 };
  };
  // Whether the ships met attack ($0D07 counts up): not when one is hostile to the first, nor,
  // with the stealth box, a chance in three; when the first is hostile to the player, or half the
  // time when it is $FF to the player or of faction 0
  P.encounter_hostile = function (r) {
    const fa = (a, x, y) => { const o = P.faction_attitude({ a, x, y }); return { a: o.a, x: o.x, y: o.y }; };
    let o = { a: r.a, x: M[0x0D05], y: r.y };
    if (!(o.x & 0x80)) { o = fa(M[0x97], M[0x98], o.y); if (o.a === 0xFE) return o; }
    o.x = M[0x0D06];
    if (!(o.x & 0x80)) { o = fa(M[0x97], M[0x99], o.y); if (o.a === 0xFE) return o; }
    o.a = M[0x073D];
    if (o.a) { o.a = P.random().a; if (o.a < 0x56) return o; }
    o = fa(M[0x97], 4, M[0x0D04]);
    if (!o.a) { o.a = M[0x97]; if (o.a) return o; }
    else if (o.a === 0xFE) { M[0x0D07] = (M[0x0D07] + 1) & 255; return o; }
    else if (o.a !== 0xFF) return o;
    // half the time
    o.a = P.random().a;
    if (o.a & 0x80) M[0x0D07] = (M[0x0D07] + 1) & 255;
    return o;
  };

  // ---- the map's entries: their motions (kind 1 wanders, 2 stays, 3 and 4 orbit the chart's
  // centre by the date), each kind's routine called through a JSR whose operand is written from
  // map_motion_routines ($2E09, two bytes a kind from 1)
  const MOTIONS = { 0x2D89: 'motion_wander', 0x2DB9: 'motion_none', 0x2DBA: 'motion_small_orbit', 0x2DEB: 'motion_large_orbit' };
  const motion = (lo, hi, r) => {
    const to = M[lo] | M[hi] << 8, name = MOTIONS[to];
    if (!name) throw new Error('a map entry\'s motion routine at $' + to.toString(16));
    return P[name](r);
  };
  P.move_map_objects = function (r) {
    let x = 0x1F, a, y = r && r.y;
    M[0x9E] = x;
    do {
      a = M[0x5510 + x];
      if (!(a & 0x80)) {
        a = M[0x5550 + x] & 7;
        if (a) {
          y = (a << 1) & 255;
          M[0x2D57] = M[0x2E07 + y]; M[0x2D58] = a = M[0x2E08 + y];
          const o = motion(0x2D57, 0x2D58, { a, x, y });
          a = o.a; y = o.y;
        }
      }
      M[0x9E] = (M[0x9E] - 1) & 255;
      x = M[0x9E];
    } while (x);
    return { a, x: 0, y };
  };
  P.place_orbiting_objects = function (r) {
    let x = 0x1F, a = r.a, y = r.y;
    do {
      a = M[0x5510 + x];
      if (!(a & 0x80)) {
        a = M[0x5550 + x] & 7;
        if (a === 3 || a === 4) {
          y = (a << 1) & 255;
          M[0x2D83] = M[0x2E07 + y]; M[0x2D84] = a = M[0x2E08 + y];
          const o = motion(0x2D83, 0x2D84, { a, x, y });
          a = o.a; x = o.x; y = o.y;
        }
      }
      x = (x - 1) & 255;
    } while (x);
    return { a, x: 0, y };
  };
  // A step of -1, 0 or 1 across and up, each kept on the chart; the entry is $9E's
  P.motion_wander = function (r) {
    const x = (P.random_upto({ a: 2 }).a - 1) & 255;
    M[0x9F] = x;
    const y = (P.random_upto({ a: 2 }).a - 1) & 255;
    M[0xA0] = y;
    const e = M[0x9E];
    let a = (x + M[0x5510 + e]) & 255;
    if (a < 0x20) M[0x5510 + e] = a;
    a = (M[0xA0] + M[0x5530 + e]) & 255;
    if (a < 0x20) M[0x5530 + e] = a;
    return { a, x, y: e };
  };
  P.motion_none = r => r;
  P.motion_small_orbit = function (r) {
    const x = r.x;
    const y = ((((M[0x0724] >> 1) + M[0x5610]) & 0x0F) << 1) & 255;
    M[0x5510 + x] = M[0x2E11 + y]; M[0x5530 + x] = M[0x2E12 + y];
    return orbitTile(x, y);
  };
  P.motion_large_orbit = function (r) {
    const x = r.x;
    const y = ((((M[0x0724] >> 2) + M[0x5611]) & 0x1F) << 1) & 255;
    M[0x5510 + x] = M[0x2E31 + y]; M[0x5530 + x] = M[0x2E32 + y];
    return orbitTile(x, y >> 1);
  };
  // A planet's tile ($6C-$6F) for its quarter of the orbit ($2DD2)
  function orbitTile(x, y) {
    let a = M[0x5570 + x];
    if (a < 0x6C || a >= 0x70) return { a, x, y };
    const s = (y >> 3) + 1 + ((y >> 2) & 1);
    a = ((s & 3) + 0x6C + (s >> 8)) & 255;
    M[0x5570 + x] = a;
    return { a, x, y };
  }
  // Entry A's heading in its flags' bits 3-4 from the step X, Y: right 0, up 8, left $10, down $18
  P.set_ship_heading = function (r) {
    M[0x80] = r.a;
    let a;
    if (r.x & 0x80) a = 0x10;
    else if (r.x) a = 0;
    else if (r.y & 0x80) a = 0x18;
    else if (r.y) a = 0x08;
    else return { a: r.y, x: r.x, y: r.y };
    M[0x81] = a;
    const y = M[0x80];
    a = (M[0x5550 + y] & 0xE7) | M[0x81];
    M[0x5550 + y] = a;
    return { a, x: r.x, y };
  };

  // The system's map: the file "Q" and the system's digit to $5100; its danger level and class
  // weights ($5612) to $077C-$0781; the orbiting entries placed for the date
  P.load_system_map = function (r) {
    M[0x2EA1] = (M[0x071D] + 0x30) & 255;
    M[0x80] = 0; M[0x81] = 0x51;
    P.load_file({ a: 0x51, x: 0xA0, y: 0x2E });
    for (let y = 5; y >= 0; y--) M[0x077C + y] = M[0x5612 + y];
    return P.place_orbiting_objects({ a: M[0x5612], y: 0xFF });
  };
  // From SEG1: the first hold slot from the top with cargo kind A emptied; Z set when there was none
  P.cargo_remove = function (r) {
    let y = M[0x0777];
    do {
      if (r.a === M[0x0766 + y]) { M[0x0766 + y] = 0xFF; return { a: 0xFF, x: r.x, y, z: 0, n: 1 }; }
      y = (y - 1) & 255;
    } while (y);
    return { a: r.a, x: r.x, y: 0, z: 1 };
  };

  // ---- the chart's window
  // The view's area (x 24-199, rows 40-183) filled with colour 1
  P.clear_view = function (r) {
    M[0x51] = 0x18; M[0x52] = 0; M[0x86] = 0; M[0x85] = 0xC7; M[0x53] = 0x28; M[0x87] = 0xB7;
    M[0x41] = 0xAF; M[0x42] = 0x8F;
    P.set_window({ a: 0, x: 0x18, y: 0x28 });
    P.set_colour({ x: 1 });
    return P.fill_window();
  };
  // The kind of the sector at X, Y: the grid's tile (row 31 - Y at $5100) and its attribute
  // ($5000); the LDY at $2F95 is pointed at the row
  P.sector_kind = function (r) {
    const a0 = (0x1F - r.y) & 255;
    M[0x80] = (a0 >> 3) & 3; M[0x81] = r.y;
    M[0x2F96] = (a0 << 5) & 255;
    M[0x2F97] = (M[0x80] + 0x51) & 255;
    const y = reader()((op(0x2F96) + r.x) & 0xFFFF);
    return { a: M[0x5000 + y], x: r.x, y };
  };
  // The entries of the map in sector X, Y: their numbers listed at $3061, ($74) pointed at the
  // list, Y the count
  P.sector_entries = function (r) {
    M[0x81] = 0; M[0x80] = r.y;
    let x = r.x;
    for (let y = 0x1F; y >= 0; y--) {
      if (r.x !== M[0x5510 + y]) continue;
      x = M[0x5530 + y];
      if (x !== M[0x80]) continue;
      M[0x3061 + M[0x81]] = y;
      M[0x81] = (M[0x81] + 1) & 255;
    }
    M[0x74] = 0x61; M[0x75] = 0x30;
    return { a: 0x30, x, y: M[0x81] };
  };
  // Carry clear when sector X, Y is under 6 columns and 5 rows from the window's centre ($51,
  // $53); X and Y the offsets
  P.in_chart_window = function (r) {
    const h = apart(r.x, M[0x51]);
    if (h.m >= 6) return { a: h.m, x: h.d, y: r.y, c: 1 };
    const v = apart(r.y, M[0x53]);
    return { a: v.m, x: h.d, y: v.d, c: v.m >= 5 ? 1 : 0 };
  };
  // The window's cell for the offsets X, Y: X + 5 and the row's start from chart_rows ($0D33)
  P.chart_cell_index = function (r) {
    M[0x80] = r.y;
    M[0x80] = M[0x0D33 + ((4 - r.y) & 255)];
    const y = (r.x + 5 + M[0x80]) & 255;
    return { a: y, x: r.x, y };
  };
  // The window's 99 cells, from the bottom row's right end back: the grid's tiles around X, Y,
  // and off the chart tile A ($2C: a checkerboard of $2C and $2D). The CPY operands at $30A7 (the
  // row's end, $20, or 0 for a row off the chart) and $30B2 (the left column, X - 6) are written.
  P.fill_chart_window = function (r) {
    M[0x84] = r.a;
    M[0x82] = (r.x + 5) & 255;
    M[0x30B2] = (M[0x82] - 0x0B) & 255;
    M[0x83] = (r.y - 4) & 255;
    const rd = reader(), wr = writer();
    let x = 0x63, y, a;
    do {
      const a0 = (0x1F - M[0x83]) & 255;
      M[0x30A7] = 0x1F >= M[0x83] ? 0x20 : 0;
      M[0x80] = (a0 << 5) & 255; M[0x81] = ((a0 >> 3) & 3) + 0x51;
      y = M[0x82];
      do {
        if (y >= M[0x30A7]) {
          a = M[0x84];
          if (a === 0x2C) a = (y ^ M[0x83]) & 1 ? 0x2C : 0x2D;
        } else a = rd((ptr(0x80) + y) & 0xFFFF);
        wr(0xF9FF + x, a);
        x = (x - 1) & 255; y = (y - 1) & 255;
      } while (y !== M[0x30B2]);
      M[0x83] = (M[0x83] + 1) & 255;
    } while (x);
    return { a: 0, x: 0, y };
  };
  // The map's entries on the window: an entry's tile ($5570) replaces its cell unless the cell's
  // tile hides things (attribute bit 3). With a heading (flags bits 3-4) the tile moves on by it,
  // as far as the tile's attribute bits 0-1 allow (0, a quarter, a half or all of it); a tile with
  // attribute bit 2 animates by the frame counter unless flags bit 5 is set.
  P.draw_map_objects = function (r) {
    M[0x51] = r.x; M[0x53] = r.y;
    const rd = reader(), wr = writer();
    let a = r.a, x, y = 0x1F;
    M[0x85] = y;
    do {
      x = M[0x5570 + y];
      if (!(x & 0x80)) {
        M[0x87] = x;
        M[0x88] = a = M[0x5000 + x];
        x = M[0x5510 + y];
        if (!(x & 0x80)) {
          const w = P.in_chart_window({ x, y: M[0x5530 + y] });
          a = w.a; x = w.x;
          if (!w.c) {
            y = P.chart_cell_index({ x: w.x, y: w.y }).y;
            x = rd(0xFA00 + y);
            a = M[0x5000 + x] & 8;
            if (!a) {
              x = M[0x85];
              a = M[0x5550 + x] & 0x18;
              let t = -1;
              if (a) {
                M[0x86] = a >> 1;
                if (!(M[0x88] & 1)) M[0x86] >>= 1;
                if (!(M[0x88] & 2)) M[0x86] >>= 1;
                t = (M[0x87] + M[0x86]) & 255;
                if (t & 0x80) t = -1;
              }
              a = t >= 0 ? t : M[0x5570 + x];
              wr(0xFA00 + y, a);
              a = M[0x88] & 4;
              if (a) {
                x = M[0x85];
                a = M[0x5550 + x] & 0x20;
                if (!a) { a = (((M[0x88] & 3) & M[0x5E]) + rd(0xFA00 + y)) & 255; wr(0xFA00 + y, a); }
              }
            }
          }
        }
      }
      M[0x85] = (M[0x85] - 1) & 255;
      y = M[0x85];
    } while (!(y & 0x80));
    return { a, x, y };
  };
  // A cell whose tile's attribute has bit 2 clear and a count in bits 0-1 moves on by the frame
  // counter's low bits
  P.animate_chart = function (r) {
    const rd = reader(), wr = writer();
    let a, x;
    for (let y = 0x62; y >= 0; y--) {
      x = rd(0xFA00 + y);
      a = M[0x5000 + x] & 4;
      if (a) continue;
      a = M[0x5000 + x] & 3;
      if (!a) continue;
      a = ((a & M[0x5E]) + rd(0xFA00 + y)) & 255;
      wr(0xFA00 + y, a);
    }
    return { a, x, y: 0xFF };
  };
  // The window into the bitmap, 9 rows of 11 tiles, a pixel row at a time from bitmap row
  // $0D31 down, at column $0D30; the top and bottom rows of tiles cut short by the scroll
  // $0D32. The code's operands are its counters: $870E the row's cells, $8713 and $871C the tiles'
  // pixel rows, $870C and $8736 the tile, $86DF and $86E6 the column's offset, $8738 the colour
  // pass's row of cells.
  P.draw_chart = function (r) {
    const rd = reader(), wr = writer();
    const add16 = (a, n) => { const s = M[a] + n; M[a] = s & 255; if (s > 255) M[a + 1] = (M[a + 1] + 1) & 255; };
    M[0x87] = (M[0x0D31] + 1) & 255;
    M[0x86DF] = (M[0x0D30] << 3) & 255;
    M[0x86E6] = (M[0x0D30] >> 5) & 1;
    M[0x86] = 8;
    M[0x870E] = 0xF5; M[0x870F] = 0xF9; M[0x8738] = 0xF5; M[0x8739] = 0xF9;
    let a, x, y;
    for (;;) {
      M[0x85] = 0x0F;
      M[0x8713] = 0x3F; M[0x871C] = 0x3F;
      add16(0x870E, 0x0B); add16(0x8738, 0x0B);
      if (M[0x86] === 0 || M[0x86] === 8) {
        M[0x85] = (0x0F - M[0x0D32]) & 255;
        if (M[0x86]) {
          const s = M[0x8713] + M[0x0D32];
          M[0x8713] = s & 255;
          M[0x871C] = (M[0x871C] + M[0x0D32] + (s >> 8)) & 255;
        }
      }
      do {
        M[0x87] = (M[0x87] - 1) & 255;
        y = M[0x87];
        let s = M[0xEB00 + y] + M[0x86DF];
        M[0x38] = s & 255;
        M[0x39] = (M[0xEC00 + y] + M[0x86E6] + (s >> 8)) & 255;
        y = M[0xECC8 + y];
        s = M[0xEBC8 + y] + M[0x0D30];
        M[0x19] = s & 255;
        M[0x1A] = (M[0xEBE1 + y] + (s >> 8)) & 255;
        M[0x8713] = (M[0x8713] + 1) & 255; M[0x871C] = (M[0x871C] + 1) & 255;
        const bm = ptr(0x38), right = op(0x8712), left = op(0x871B);
        y = 0xA8;
        M[0x870C] = 0x0A;
        do {
          x = rd((op(0x870E) + M[0x870C]) & 0xFFFF);
          wr((bm + y) & 0xFFFF, a = rd((right + x) & 0xFFFF));
          y = (y - 8) & 255;
          wr((bm + y) & 0xFFFF, a = rd((left + x) & 0xFFFF));
          y = (y - 8) & 255;
          M[0x870C] = (M[0x870C] - 1) & 255;
        } while (!(M[0x870C] & 0x80));
        if (!(M[0x85] & 7)) {
          const cp = ptr(0x19), colours = op(0x873C);
          y = 0x15;
          M[0x8736] = 0x0A;
          do {
            x = rd((op(0x8738) + M[0x8736]) & 0xFFFF);
            a = rd((colours + x) & 0xFFFF);
            wr((cp + y) & 0xFFFF, a); y = (y - 1) & 255;
            wr((cp + y) & 0xFFFF, a); y = (y - 1) & 255;
            M[0x8736] = (M[0x8736] - 1) & 255;
          } while (!(M[0x8736] & 0x80));
        }
        M[0x85] = (M[0x85] - 1) & 255;
      } while (!(M[0x85] & 0x80));
      a = M[0x0D2F];
      if (a) {
        a = M[0x86];
        if (a === 4) { const o = P.draw_brackets(); a = o.a; x = o.x; y = o.y; }
      }
      M[0x86] = (M[0x86] - 1) & 255;
      if (M[0x86] & 0x80) return { a, x, y };
    }
  };
  // The cursor's brackets on the window's middle cell: 16 pixel rows of its two bytes, each masked
  // with tile $7E's and ORed with tile $7F's; the code's operands step the tiles' rows
  P.draw_brackets = function (r) {
    const rd = reader(), wr = writer();
    M[0x80] = (M[0x0D30] + 0x0A) & 255;
    M[0x81] = (M[0x0D31] - 0x40) & 255;
    M[0x87D9] = 0xFE; M[0x87DA] = 0x40; M[0x87DC] = 0xFF; M[0x87DD] = 0x40;
    M[0x87E5] = 0x7E; M[0x87E6] = 0x40; M[0x87E8] = 0x7F; M[0x87E9] = 0x40;
    M[0x87CA] = (M[0x80] << 3) & 255;
    M[0x87D1] = (M[0x80] >> 5) & 1;
    let a, x = 0x0F;
    do {
      const y = M[0x81];
      const s = M[0xEB00 + y] + M[0x87CA];
      M[0x38] = s & 255;
      M[0x39] = (M[0xEC00 + y] + M[0x87D1] + (s >> 8)) & 255;
      const bm = ptr(0x38);
      a = (rd(bm) & rd(op(0x87D9))) | rd(op(0x87DC));
      wr(bm, a);
      a = (rd((bm + 8) & 0xFFFF) & rd(op(0x87E5))) | rd(op(0x87E8));
      wr((bm + 8) & 0xFFFF, a);
      for (const k of [0x87DA, 0x87DD, 0x87E6, 0x87E9]) M[k] = (M[k] + 1) & 255;
      M[0x81] = (M[0x81] - 1) & 255;
      x = (x - 1) & 255;
    } while (!(x & 0x80));
    return { a, x, y: 8 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
