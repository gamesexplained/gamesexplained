// The radio ($73D7-$7C51): its frequency and bands, the scan the interrupt runs (radio_scan_irq),
// the panel's buttons and keypad with their flashing cells, the big digits of its display, and an
// intercepted message shown a character at a time by the interrupt (unscramble_irq), garbled by how
// far the eight filters are from the sender's key (scramble_char).
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`radio_panel radio_button flash_cells flash_cells_84 radio_execute radio_up radio_down radio_keypad
  keypad_flash radio_wait_fire radio_message radio_execute_jump`);
G.radio = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  // the radio's bytes
  const BAND = 0x5E65, SCANNING = 0x5E67, KEY = 0x5E68, TYPED = 0x5E69, FREQ = 0x5E6A, COUNT = 0x5E6C,
    TOP = 0x5E6D, BOTTOM = 0x5E6F, ENTRY = 0x740E, FRAMES = 0x74A4;
  const MSG_WINDOW = 0x7B97, MSG_TEXT = 0x7B99, MSG_POS = 0x7B9B, KEY_NOW = 0x7B9D, CLICKED = 0x7B9E,
    SETTING = 0x7B9F, DONE = 0x7BA0;
  const top = () => w(0x7E);

  P.radio_reset = function () {
    M[0x5E64] = M[BAND] = M[0x5E66] = M[SCANNING] = M[TYPED] = 0;
    M[FREQ] = 8; M[FREQ + 1] = 7;
    return { a: 7 };
  };
  // clear_entry ($73F3): five spaces, through fill's inline bytes
  P.clear_entry = function () {
    P.fill({ at: 0x73F3 });
    M[TYPED] = 0;
    return { a: 0 };
  };
  // radio_freq_up ($7415) and radio_freq_down ($744D): one kHz, round the band
  P.radio_freq_up = function () {
    if (w(FREQ) === w(TOP)) setw(0x88, w(BOTTOM)); else setw(0x88, w(FREQ) + 1);
    setw(FREQ, w(0x88));
    return { a: M[0x89] };
  };
  P.radio_freq_down = function () {
    if (w(FREQ) === w(BOTTOM)) setw(0x88, w(TOP)); else setw(0x88, w(FREQ) - 1);
    setw(FREQ, w(0x88));
    return { a: M[0x89] };
  };
  // radio_show_freq ($7486): the frequency as five digits in the entry, drawn
  P.radio_show_freq = function () {
    const typed = M[TYPED];
    M[TYPED] = 5;
    setw(0x88, w(FREQ));
    P.number_to_digits();
    P.radio_draw_entry();
    M[TYPED] = typed;
    return { a: typed };
  };
  // radio_scan_irq ($74A5), the interrupt's hook while the radio scans: every fourth frame the
  // frequency one up, the pointers the drawing uses kept
  const SCAN_SAVE = [0x2B, 0x2A, 0x0A, 0x09, 0x08, 0x07, 0x0E, 0x0D, 0x1B, 0x19];
  P.radio_scan_irq = function () {
    M[FRAMES] = (M[FRAMES] + 1) & 255;
    if (M[FRAMES] & 3) return { a: M[FRAMES] & 3 };
    const kept = SCAN_SAVE.map(a => M[a]);
    P.radio_freq_up();
    P.radio_show_freq();
    SCAN_SAVE.forEach((a, i) => { M[a] = kept[i]; });
    return { a: M[0x2B] };
  };
  const hook = a => { P.sei(); M[0x6286] = a & 255; M[0x6287] = a >> 8; P.cli(); return { a: a >> 8 }; };
  P.radio_scan_start = () => hook(0x74A5);
  P.irq_hook_off = () => hook(0x8DDA);

  // radio_panel ($750C): the radio, until fire is pressed off the panel
  P.radio_panel = function* () {
    P.clear_entry();
    P.open_window({ at: 0x750F });
    M[0x84] = 1; M[0x85] = 1;
    P.draw_picture({ a: 0 });
    P.radio_show_freq();
    P.cursor_to_window();
    if (M[SCANNING]) P.radio_scan_start();
    for (;;) {
      yield* P.radio_wait_fire({});
      if (!P.cursor_in_window().c) break;
      yield* P.radio_button({});
    }
    P.irq_hook_off();
    P.cursor_off();
    return P.close_window();
  };
  // radio_button ($754D): only a cell coloured $61 is a button
  P.radio_button = function* () {
    const t = top();
    setw(0x80, t);
    M[0x84] = M[(t + 12) & 0xFFFF] >> 3;
    M[0x85] = M[(t + 13) & 0xFFFF] >> 3;
    P.cell_address_84();
    if (M[w(0x88)] !== 0x61) return { a: M[w(0x88)], y: 0 };
    const col = ((M[(t + 12) & 0xFFFF] >> 3) - M[t]) & 255;
    if (col >= 6) return yield* P.radio_keypad({});
    const row = M[(t + 11) & 0xFFFF];
    if (row === 10) return P.radio_band_button();
    if (row > 10) return yield* P.radio_down({});
    if (row >= 8) return yield* P.radio_up({});
    M[SCANNING] ^= 1;
    P.irq_hook_off();
    M[0x84] = (M[t] + 1) & 255;
    M[0x85] = (M[(t + 1) & 0xFFFF] + 5) & 255;
    P.cell_address_84();
    M[0x84] = 4; M[0x85] = 2;
    return yield* P.flash_cells({});
  };
  // flash_cells ($75B8): the rectangle flashed, then the scan started again if it is on
  P.flash_cells = function* () {
    yield* P.flash_cells_84({});
    return M[SCANNING] ? P.radio_scan_start() : P.irq_hook_off();
  };
  // fill_cells_86 ($75D7): a rectangle of colour cells ($84 by $85 from ($88)) given the first
  // cell's colour with its nibbles swapped; $84, $85 and $88/$89 kept
  P.fill_cells_86 = function () {
    P.swap_nibbles({});
    const kept = [M[0x85], M[0x84], M[0x89], M[0x88]];
    do {
      const p = w(0x88);
      let y = (M[0x84] - 1) & 255;
      do { M[(p + y) & 0xFFFF] = M[0x86]; y = (y - 1) & 255; } while (y < 0x80);
      setw(0x88, p + 0x28);
      M[0x85] = (M[0x85] - 1) & 255;
    } while (M[0x85]);
    M[0x88] = kept[3]; M[0x89] = kept[2]; M[0x84] = kept[1]; M[0x85] = kept[0];
    return { a: kept[0], y: 0xFF };
  };
  // radio_band_button ($760E): the next of the six bands, at its bottom
  P.radio_band_button = function () {
    P.irq_hook_off();
    M[SCANNING] = 0;
    let a = M[BAND] + 1;
    if (a >= 6) a = 0;
    M[BAND] = a;
    P.radio_set_band();
    setw(FREQ, w(BOTTOM));
    return P.radio_show_freq();
  };
  P.radio_set_band = function () {
    P.irq_hook_off();
    M[SCANNING] = 0;
    const y = (M[BAND] << 1) & 255;
    M[BOTTOM] = M[0x7666 + y]; M[BOTTOM + 1] = M[0x7667 + y];
    M[TOP] = M[0x7674 + y]; M[TOP + 1] = M[0x7675 + y];
    return { a: M[TOP + 1], y: (y + 1) & 255 };
  };
  // radio_tune_typed ($7680)
  P.radio_tune_typed = function () {
    P.radio_find_band();
    M[COUNT] = (M[COUNT] - 1) & 255;
    if (M[COUNT] & 0x80) { M[FREQ] = 8; M[FREQ + 1] = 7; M[COUNT] = (M[COUNT] + 1) & 255; }
    let a = M[COUNT];
    if (a === 5) {
      const hi = M[FREQ + 1];
      if (hi < 0x6F || (hi === 0x6F && M[FREQ] < 0x53)) { M[FREQ] = 0x54; M[FREQ + 1] = 0x6F; }
      a = 5;
    }
    M[BAND] = a;
    P.radio_set_band();
    return P.radio_show_freq();
  };
  // radio_find_band ($76C5): how many of 1799 and the six band tops the frequency reaches
  P.radio_find_band = function () {
    M[COUNT] = 0;
    let y = 0;
    for (let x = 7; x; x--) {
      const hi = M[FREQ + 1], th = M[0x7673 + y];
      if (hi === th) { if (M[FREQ] < M[0x7672 + y]) return { a: M[FREQ], x, y }; }
      else if (hi < th) return { a: hi, x, y };
      y += 2;
      M[COUNT] = (M[COUNT] + 1) & 255;
    }
    M[COUNT] = (M[COUNT] - 1) & 255;
    M[FREQ] = 0x4F; M[FREQ + 1] = 0xC3;
    return { a: 0xC3, x: 0, y };
  };
  // radio_execute ($76F8): the typed digits become the frequency
  P.radio_execute = function* () {
    P.irq_hook_off();
    M[SCANNING] = 0;
    const p = w(0x80);
    M[0x84] = (M[p] + 9) & 255;
    M[0x85] = (M[(p + 1) & 0xFFFF] + 12) & 255;
    P.cell_address_84();
    M[0x84] = 5; M[0x85] = 1;
    yield* P.flash_cells({});
    M[0x86] = 0x0E; M[0x87] = 0x74;
    P.parse_number();
    setw(FREQ, w(0x88));
    P.radio_tune_typed();
    M[TYPED] = 5;
    return { a: 5 };
  };
  P.radio_execute_jump = function* (r) { return yield* P.radio_execute(r); };
  // radio_up ($773E) and radio_down ($776D)
  const arrow = function* (move, row) {
    P.irq_hook_off();
    M[SCANNING] = 0;
    move();
    P.radio_show_freq();
    const p = w(0x80);
    M[0x84] = (M[p] + 1) & 255;
    M[0x85] = (M[(p + 1) & 0xFFFF] + row) & 255;
    P.cell_address_84();
    M[0x84] = 2; M[0x85] = 2;
    return yield* P.flash_cells({});
  };
  P.radio_up = function* () { return yield* arrow(P.radio_freq_up, 8); };
  P.radio_down = function* () { return yield* arrow(P.radio_freq_down, 11); };
  // radio_keypad ($7796): row 12 is EXECUTE; otherwise the key from the cursor's row and column
  P.radio_keypad = function* () {
    const p = w(0x80);
    if (M[(p + 11) & 0xFFFF] === 12) return yield* P.radio_execute_jump({});
    let a = (M[(p + 12) & 0xFFFF] >> 3) - M[p];
    let c = a >= 0 ? 1 : 0;
    a &= 255;
    a = a - 6 - (1 - c); a &= 255;
    a = ((a >> 1) + 1) & 255;
    M[0x84] = a >> 1;
    let r = (M[(p + 11) & 0xFFFF] - 4) & 255;
    M[0x85] = r >> 1;
    a = (M[0x85] << 1) & 255;
    let s = a + M[0x85];
    s = (s & 255) + M[0x84] + (s >> 8);
    s = (s & 255) + 1 + (s >> 8);
    a = s & 255;
    if (a === 10) a = 0;
    M[KEY] = a;
    yield* P.keypad_flash({});
    P.irq_hook_off();
    return P.keypad_digit();
  };
  P.keypad_flash = function* () {
    const y = (M[KEY] << 1) & 255;
    M[0x88] = 0x4A; M[0x89] = 0x78;
    const p = w(0x80);
    M[0x84] = (M[0x784A + y] + M[p]) & 255;
    M[0x85] = (M[0x784B + y] + M[(p + 1) & 0xFFFF]) & 255;
    P.cell_address_84();
    M[0x84] = 2; M[0x85] = 1;
    return yield* P.flash_cells_84({});
  };
  // flash_cells_84 ($7812): eight flips of the two low bits, two frames each
  P.flash_cells_84 = function* () {
    M[0x19] = 8;
    do {
      const p0 = w(0x88);
      let x = M[0x85];
      do {
        const p = w(0x88);
        let y = (M[0x84] - 1) & 255;
        do { M[(p + y) & 0xFFFF] ^= 3; y = (y - 1) & 255; } while (y < 0x80);
        setw(0x88, p + 0x28);
        x = (x - 1) & 255;
      } while (x);
      yield* P.wait_frames({ a: 2 });
      setw(0x88, p0);
      M[0x19] = (M[0x19] - 1) & 255;
    } while (M[0x19]);
    return { a: M[0x89] };
  };
  // radio_wait_fire ($7864)
  P.radio_wait_fire = function* () {
    P.cli();
    yield* P.wait_fire_off({});
    do {
      yield* P.wait_frames({ a: 1 });
      P.move_cursor();
    } while (!M[0x8E30]);
    return { a: M[0x8E30] };
  };
  // keypad_digit ($7878)
  P.keypad_digit = function () {
    const k = M[KEY];
    if (k === 11 || k === 12) return { a: k };
    if (M[TYPED] === 0) P.radio_clear_entry();
    else if (M[TYPED] === 5) { M[TYPED] = 0; P.radio_clear_entry(); }
    M[ENTRY + M[TYPED]] = (M[KEY] + 0x30) & 255;
    M[TYPED] = (M[TYPED] + 1) & 255;
    return P.radio_draw_entry();
  };
  P.radio_clear_entry = function () {
    P.clear_entry();
    M[TYPED] = 5;
    P.radio_draw_entry();
    M[TYPED] = 0;
    return { a: 0 };
  };
  // radio_draw_entry ($78B8): the typed characters, a big digit a cell, from the panel's corner
  P.radio_draw_entry = function () {
    const t = top();
    M[0x84] = (M[t] + 1) & 255;
    M[0x85] = (M[(t + 1) & 0xFFFF] + 1) & 255;
    const c = P.cell_bitmap_84();
    if (!M[TYPED]) return { a: 0, x: c.x, y: c.y };
    let x = M[TYPED], y = 0;
    do {
      P.draw_big_digit({ a: M[ENTRY + y] });
      y = (y + 1) & 255;
      P.add_to_pointer({ a: 8 });
      M[0x88] = M[0x2A]; M[0x89] = M[0x2B];
      x = (x - 1) & 255;
    } while (x);
    return { a: M[0x89], x, y };
  };
  // draw_big_digit ($78F5): a space, or a digit of big_digits ($4DEE), two cells tall
  P.draw_big_digit = function (r) {
    let src;
    if ((r.a & 255) === 0x20) src = 0x794B;
    else src = ((((r.a - 0x30) & 255) << 4) & 255) + 0x4DEE;
    M[0x792F] = src & 255; M[0x7930] = src >> 8;
    let x = 0;
    M[0x19] = 2;
    do {
      const p = w(0x88);
      for (let y = 0; y < 8; y++) { M[(p + y) & 0xFFFF] = M[(src + x) & 0xFFFF]; x++; }
      setw(0x88, p + 0x140);
      M[0x19] = (M[0x19] - 1) & 255;
    } while (M[0x19]);
    return { a: M[0x89], x, y: 8 };
  };

  // radio_message ($795B): an intercepted message, the text at ($88), until fire off the windows
  P.radio_message = function* () {
    P.expand_text();
    M[MSG_TEXT] = M[MSG_POS] = M[0x88]; M[MSG_TEXT + 1] = M[MSG_POS + 1] = M[0x89];
    P.open_window({ at: 0x7972 });
    M[0x84] = 2; M[0x85] = 0x11;
    P.draw_picture({ a: 5 });
    const panel = top();
    P.open_window({ at: 0x7990 });
    M[MSG_WINDOW] = M[0x7E]; M[MSG_WINDOW + 1] = M[0x7F];
    setw(0x88, panel);
    setw(0x7E, panel);
    const y = M[SCANNING] ? M[0x8A] : 0x10;
    M[KEY_NOW] = M[0x7C41 + y];
    M[SETTING] = 0; M[DONE] = 0;
    P.cursor_to_window();
    P.sei(); M[0x6286] = 0xA6; M[0x6287] = 0x7A; P.cli();
    for (;;) {
      yield* P.wait_fire_up({});
      yield* P.wait_fire_moving({});
      if (!P.cursor_in_window().c) return P.radio_message_close();
      setw(0x80, 0x7A70);
      const h = P.hit_test({ x: 8 });
      if (!h.c) continue;
      M[0x85] = h.a;
      M[CLICKED] = (8 - M[0x85]) & 255;
      M[0x84] = (M[CLICKED] + 1) & 255;
      const k = (((M[0x84] << 1) & 255) + M[0x84]) & 255;
      const t = top();
      setw(0x80, t);
      M[0x84] = (k + M[t] + 1) & 255;
      M[0x85] = (M[(t + 1) & 0xFFFF] + 1) & 255;
      P.cell_address_84();
      M[0x84] = 2; M[0x85] = 2;
      P.fill_cells_86();
      M[0x88] = 0xA1; M[0x89] = 0x7B;
      M[0x04] = M[0x7BA1 + M[CLICKED]];
      M[SETTING] ^= M[0x04];
      yield* P.wait_fire_up({});
    }
  };
  P.radio_message_close = function () {
    P.cursor_off();
    M[0x7E] = M[MSG_WINDOW]; M[0x7F] = M[MSG_WINDOW + 1];
    M[DONE] = 0x19;
    P.close_window();
    return P.close_window();
  };
  // unscramble_irq ($7AA6), the interrupt's hook while a message is shown: every second frame the
  // next character, garbled, in the message window; at the text's end, back to its start, 25 times
  const CHAR_SAVE = [0x2B, 0x2A, 0x19, 0x1B, 0x04, 0x2C, 0x2E];
  P.unscramble_irq = function () {
    M[FRAMES] = (M[FRAMES] + 1) & 255;
    if (M[FRAMES] & 1) return { a: 1 };
    if (M[DONE] === 0x19) return { a: 0x19 };
    const was = top();
    setw(0x80, w(MSG_WINDOW));
    setw(0x7E, w(MSG_WINDOW));
    setw(MSG_POS, w(MSG_POS) + 1);
    setw(0x88, w(MSG_POS));
    const ch = M[w(0x88)];
    if (ch === 0x24) {
      M[DONE] = (M[DONE] + 1) & 255;
      setw(0x88, w(MSG_TEXT) - 1);
      setw(MSG_POS, w(0x88));
    } else {
      const x = P.scramble_char({ a: ch }).a;
      const kept = CHAR_SAVE.map(a => M[a]);
      P.print_char({ a: x });
      CHAR_SAVE.forEach((a, i) => { M[a] = kept[i]; });
    }
    setw(0x7E, was);
    return { a: was >> 8 };
  };
  // scramble_char ($7B51): the character kept when all eight filters match the key, or by chance
  // the more of them match; otherwise a random character from $20 to $3F
  P.scramble_char = function (r) {
    const ch = r.a & 255, key = M[KEY_NOW];
    M[0x84] = key ^ 0xFF;
    M[0x86] = M[SETTING] & key;
    const a = ((M[SETTING] ^ 0xFF) & M[0x84]) | M[0x86];
    let y = 0;
    for (let b = a; b; b >>= 1) if (b & 1) y++;
    if (y === 8) return { a: ch, x: 0, y };
    M[0x84] = (y << 5) & 255;
    if (P.random().a < M[0x84]) return { a: ch, x: 0, y };
    return { a: ((P.random().a & 0x1F) + 0x20) & 255, x: 0, y };
  };
  // country_on_band ($7C20): Z set when country $8A transmits on the radio's band
  P.country_on_band = function () {
    M[0x88] = 0x31; M[0x89] = 0x7C;
    const y = M[0x8A];
    const a = M[(0x7C31 + y) & 0xFFFF];
    return { a, y, z: a === M[BAND] ? 1 : 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
