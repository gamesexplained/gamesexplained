// The satellites ($BE64-$C5C1): which countries the SDI satellites and the Big Birds cover, the
// cover report, the satellite panel and putting satellites in orbit on the map, and drawing a
// satellite (or a missile) into the bitmap.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`cover_report no_footprints cover_list satellite_grab satellite_carry icon_satellites
  pick_bigbird1 pick_bigbird2 pick_bigbird3 pick_sdi1 pick_sdi2 pick_sdi3 pick_sdi4 pick_sdi5 pick_sdi6
  satellite_pick cover_report_icon`);
G.sat = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  const top = () => w(0x7E);
  const adc = (a, b, c) => { const r = a + b + c; return [r & 255, r > 255 ? 1 : 0]; };
  const sbc = (a, b, c) => { const r = a - b - (1 - c); return [r & 255, r >= 0 ? 1 : 0]; };

  // satellite_census ($BE64): bigbird_cover ($BEFF) and sdi_cover ($BF10) marked, with totals
  P.satellite_census = function () {
    P.fill({ at: 0xBE64 });
    const loop = (list, test) => {
      setw(0x88, list); setw(0x80, 0x5DA4);
      M[0x4E92] = 0;
      for (let x = 16; x; x--) {
        if (test().c) { M[w(0x88)] = (M[w(0x88)] + 1) & 255; M[0x4E92]++; }
        setw(0x88, w(0x88) + 1);
        setw(0x80, w(0x80) + 12);
      }
      M[w(0x88)] = M[0x4E92];
    };
    loop(0xBEFF, P.in_bigbird_cover);
    M[0x4E92] = 0;
    loop(0xBF10, P.in_sdi_cover);
    return { a: M[0x4E92], x: 0, y: 0 };
  };
  // in_sdi_cover ($C06C) and in_bigbird_cover ($C081): the record at $80/$81 under one of them
  const covered = (n) => {
    for (let x = n; x; x--) {
      if ((at(w(0x82), 6) & 1) && P.in_cover().c) return { c: 1, x };
      setw(0x82, w(0x82) + 8);
    }
    return { c: 0, x: 0 };
  };
  P.in_sdi_cover = function () { setw(0x82, 0x5D5C); M[0x86] = 8; M[0x87] = 0; return covered(6); };
  P.in_bigbird_cover = function () { setw(0x82, 0x5D8C); return covered(3); };
  // in_cover ($C0AC): the thing at $80/$81 under the satellite at $82/$83, by the 6502's own
  // carries and signs
  P.in_cover = function () {
    const r = w(0x80), s = w(0x82);
    for (const i of [0, 1]) {
      let [a, c] = sbc(at(r, i), at(s, i), 1);
      [a, c] = sbc(a, at(s, i + 2), c);
      if (!(a & 0x80)) return { a, y: i + 2, c: 0 };
      [a, c] = adc(a, at(s, i + 2), 0);
      [a, c] = adc(a, 5, c);
      [a, c] = adc(a, at(r, i + 2), c);
      if (a & 0x80) return { a, y: i + 2, c: 0 };
    }
    return { y: 3, c: 1 };
  };
  // near_cursor ($C0DC): the cursor within 4 pixels of the satellite at $82/$83
  P.near_cursor = function () {
    const t = top(), s = w(0x82);
    setw(0x80, t);
    for (const i of [0, 1]) {
      let [a, c] = sbc(at(t, 12 + i), at(s, i), 1);
      [a, c] = sbc(a, 4, c);
      if (!(a & 0x80)) return { a, y: i, c: 0 };
      [a, c] = adc(a, 4, 0);
      [a, c] = adc(a, 4, c);
      if (a & 0x80) return { a, y: i, c: 0 };
    }
    return { y: 1, c: 1 };
  };

  // ---- the cover report, from the eye in the panel
  P.cover_report = function* () {
    P.satellite_census();
    if (M[0xBF20]) {
      M[0xBF35] = (M[0xBF20] + 1) & 255;
      P.open_window({ at: 0xBF2F });
      P.print_inline({ at: 0xBF3A });
      M[0x86] = 0x10; M[0x87] = 0xBF;
      yield* P.cover_list();
    }
    P.satellite_census();
    if (!M[0xBF0F]) return yield* P.no_footprints();
    M[0xBF74] = (M[0xBF0F] + 1) & 255;
    P.open_window({ at: 0xBF6E });
    P.print_inline({ at: 0xBF79 });
    M[0x86] = 0xFF; M[0x87] = 0xBE;
    return yield* P.cover_list();
  };
  P.no_footprints = function* () {
    P.open_window({ at: 0xBF9D });
    P.print_inline({ at: 0xBFA8 });
    P.do_nothing();
    yield* P.wait_press({});
    return P.close_window();
  };
  P.cover_list = function* () {
    M[0x84] = 0;
    for (let x = 16; x; x--) {
      const s = [M[0x84], M[0x85], M[0x86], M[0x87]];
      if (M[w(0x86)]) P.cover_name({ a: M[0x84] });
      [M[0x84], M[0x85], M[0x86], M[0x87]] = s;
      M[0x84]++;
      setw(0x86, w(0x86) + 1);
    }
    yield* P.wait_fire_or_time({});
    yield* P.wait_fire_up({});
    yield* P.wait_press({});
    return P.close_window();
  };
  P.cover_name = function (r) {
    const s = [M[0x84], M[0x85], M[0x86], M[0x87], M[0x88], M[0x89]];
    M[0x04] = r.a;
    const y = (r.a << 1) & 255;
    M[0x88] = M[0xC04C + y]; M[0x89] = M[0xC04D + y];
    P.print_char({ a: 0x0D });
    P.print_string();
    [M[0x84], M[0x85], M[0x86], M[0x87], M[0x88], M[0x89]] = s;
    return { a: r.a };
  };

  // ---- satellites on the map
  // satellite_grab ($C10E): fire near a satellite in orbit picks it up and carries it
  P.satellite_grab = function* () {
    setw(0x82, 0x5D5C);
    M[0x86] = 8; M[0x87] = 0;
    for (let x = 9; x; x--) {
      if ((at(w(0x82), 6) & 1) && P.near_cursor().c) return yield* P.satellite_carry();
      setw(0x82, w(0x82) + w(0x86));
    }
    return { x: 0 };
  };
  P.satellite_carry = function* () {
    setw(0x80, w(0x82));
    P.do_nothing();
    yield* P.wait_fire_up({});
    P.cursor_satellite();
    P.satellite_toggle();
    for (;;) {
      const s = w(0x80);
      yield* P.wait_fire_moving({});
      setw(0x80, 0xC39F);
      const c = P.cursor_in_rect().c;
      setw(0x80, s);
      if (c) break;
    }
    P.do_nothing();
    const t = top();
    setw(0x82, t);
    put(w(0x80), 0, at(t, 12));
    put(w(0x80), 1, at(t, 13));
    P.satellite_toggle();
    return P.cursor_arrow();
  };
  P.satellite_toggle = function () {
    const s = w(0x80);
    P.cursor_off();
    P.satellite_draw();
    P.cursor_show();
    setw(0x80, s);
    return {};
  };
  P.satellite_draw = function () {
    M[0x86] = 0xCF; M[0x87] = 0xC2;
    return P.draw_shape();
  };
  // draw_shape ($C26D): the 8 by 8 shape at $86/$87 flipped into the bitmap at the thing's x, y,
  // each row across two cells
  P.draw_shape = function () {
    const s = w(0x80);
    M[0x85] = at(s, 1); M[0x84] = at(s, 0);
    const shift = P.pixel_address().a;
    M[0xC2CE] = shift;
    setw(0x80, w(0x86));
    for (let x = 8; x; x--) {
      const v = M[w(0x80)] << (8 - shift);
      M[0x87] = v >> 8; M[0x84] = v & 255;
      // the pointer read again for each byte, as ($88),Y does: off the bitmap it can point at itself
      M[w(0x88)] ^= M[0x87];
      M[(w(0x88) + 8) & 0xFFFF] ^= M[0x84];
      P.next_bitmap_byte();
      setw(0x80, w(0x80) + 1);
      P.N.shape = (P.N.shape || 0) + 1;
      P.N.rot = (P.N.rot || 0) + shift;      // the row turned shift times, 15 cycles a turn
    }
    setw(0x80, s);
    return { a: M[0x81], x: 0, y: 8 };
  };
  P.copy_cell = function (r) {
    for (let y = 7; y >= 0; y--) put(w(0x88), y, at(w(0x86), y));
    return { a: r.a, y: 0xFF };
  };

  // ---- the satellite panel ($C2E4)
  P.icon_satellites = function* () {
    M[0xC2E3] = 1;
    M[0xC5C2] = 0;
    P.cursor_off();
    P.open_window({ at: 0xC2F1 });
    P.fill_cells({ at: 0xC2FC });
    P.fill_cells({ at: 0xC304 });
    M[0x84] = 2; M[0x85] = 8; P.draw_picture({ a: 6 });
    M[0x84] = 5; M[0x85] = 8; P.draw_picture({ a: 4 });
    P.cursor_to_window();
    P.satellite_icons();
    for (;;) {
      yield* P.wait_fire_up({});
      yield* P.wait_fire_moving({});
      setw(0x80, 0xC35D);
      const h = P.hit_test({ x: 11 });
      if (!h.c) { yield* P.satellite_grab(); continue; }
      M[0x04] = h.a;
      M[0x07] = 0xAB; M[0x08] = 0xC3;
      M[0x88] = 0x2C; M[0x89] = 0xC3;
      const r = yield* P.on_goto();
      if (r && r.dropped) return { a: r.a };
    }
  };
  // satellite_icons ($C3D9): the panel's nine places, a picture or an empty box
  const icons = (n, waiting) => {
    for (let x = n; x; x--) {
      M[0x86] = 0xD1; M[0x87] = 0xC3;
      if (!(at(w(0x80), 6) & 1)) { M[0x86] = waiting; M[0x87] = 0xC3; }
      P.copy_cell({});
      setw(0x88, w(0x88) + 0x10);
      M[0x2A] = M[0x88]; M[0x2B] = M[0x89];
      setw(0x80, w(0x80) + 8);
    }
    return { x: 0 };
  };
  P.sdi_icons = () => icons(3, 0xC1);
  P.bigbird_icons = function () {
    M[0x2E] = 6; M[0x2C] = 2;
    P.cell_bitmap_address();
    setw(0x80, 0x5D8C);
    return icons(3, 0xC9);
  };
  P.satellite_icons = function () {
    P.cursor_off();
    P.bigbird_icons();
    setw(0x80, 0x5D5C);
    M[0x2C] = 2; M[0x2E] = 2;
    P.cell_bitmap_address();
    P.sdi_icons();
    setw(0x80, 0x5D74);
    M[0x2E] = (M[0x2E] + 2) & 255;
    P.cell_bitmap_address();
    P.sdi_icons();
    return P.cursor_show();
  };
  const pick = a => function* () { setw(0x80, a); return yield* P.satellite_pick(); };
  P.pick_bigbird1 = pick(0x5D8C); P.pick_bigbird2 = pick(0x5D94); P.pick_bigbird3 = pick(0x5D9C);
  P.pick_sdi1 = pick(0x5D5C); P.pick_sdi2 = pick(0x5D64); P.pick_sdi3 = pick(0x5D6C);
  P.pick_sdi4 = pick(0x5D74); P.pick_sdi5 = pick(0x5D7C); P.pick_sdi6 = pick(0x5D84);
  // satellite_pick ($C509): one in orbit comes down; one waiting is carried to the map, or back
  P.satellite_pick = function* () {
    M[0xC4A4] = M[0x80]; M[0xC4A5] = M[0x81];
    const chosen = () => w(0xC4A4);
    if (at(w(0x80), 6) & 1) {
      P.satellite_toggle();
      setw(0x80, chosen());
      put(w(0x80), 6, at(w(0x80), 6) & 0xFE);
      return P.satellite_icons();
    }
    P.cursor_satellite();
    P.do_nothing();
    yield* P.wait_fire_up({});
    for (;;) {
      yield* P.wait_fire_moving({});
      setw(0x80, 0xC39F);
      if (P.cursor_in_rect().c) {
        setw(0x80, chosen());
        put(w(0x80), 6, at(w(0x80), 6) | 1);
        P.do_nothing();
        const t = top();
        setw(0x80, t);
        M[0x84] = at(t, 12); M[0x85] = at(t, 13);
        setw(0x80, chosen());
        put(w(0x80), 0, M[0x84]);
        put(w(0x80), 1, M[0x85]);
        P.satellite_toggle();
        break;
      }
      setw(0x80, 0xC3A5);
      if (P.cursor_in_rect().c) {
        setw(0x80, chosen());
        put(w(0x80), 6, at(w(0x80), 6) & 0xFE);
        break;
      }
    }
    P.satellite_icons();
    return P.cursor_arrow();
  };
  P.cover_report_icon = function* () {
    P.cursor_off();
    yield* P.cover_report();
    return P.cursor_on();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
