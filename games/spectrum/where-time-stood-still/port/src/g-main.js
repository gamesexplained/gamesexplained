// The start, the control selection and the main loop ($8521-$870F, $9987, $AE10-$B672), the paging
// of the banks ($8C75-$8CB4) and the input routines the control selection copies to $6811. The main loop is one pass of the game for
// each view shown; the view is shown at the frame's interrupt (the HALT in $9987).
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.main = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  // LDIR: n bytes from s to d, a byte at a time as the processor copies them (so an overlapping
  // copy one byte on fills); gives where both end
  const ldir = P.ldir = (s, d, n) => {
    P.N.byte += n || 0x10000;
    do { M[d] = M[s]; s = (s + 1) & 0xFFFF; d = (d + 1) & 0xFFFF; n = (n - 1) & 0xFFFF; } while (n);
    return { hl: s, de: d };
  };

  // --- the banks ---
  // page_bank ($8C95): bank A in at $C000 with $8D1E's screen and ROM bits
  P.def(0x8C95, 'page_bank', r => { P.io.out(0x7FFD, (M[0x8D1E] & 0xF8) | (r.a & 7)); return {}; });
  P.def(0x8CB3, 'page_bank_a', r => P.page_bank(r));
  for (const [a, n] of [[0x8C75, 5], [0x8C7A, 6], [0x8C7F, 0], [0x8C83, 7], [0x8C88, 4], [0x8C8D, 1], [0x8C92, 3]]) {
    P.def(a, 'page_bank_' + n, () => P.page_bank({ a: n }));
  }
  // page_hidden_screen ($8CA5): the screen not shown, bank 5 when $8D1E shows bank 7
  P.def(0x8CA5, 'page_hidden_screen', () => P.page_bank({ a: M[0x8D1E] & 8 ? 5 : 7 }));

  // --- the start ---
  P.def(0x8521, 'start', function* () {
    yield { cp: 0x8521 };
    M[0x7002] = 0x0E;                                // the title music
    yield* P.title();
    yield { cp: 0x8534 };                            // play chosen: the page times what follows as a stretch
    for (let l = 0; l < 256; l++) {                  // $8000: each byte its index, bits reversed
      let c = 0;
      for (let b = 0, a = l; b < 8; b++, a >>= 1) c = (c << 1) | (a & 1);
      M[0x8000 + l] = c;
    }
    P.page_bank_0();
    P.draw_frame();
    return {};
  });
  // draw_frame ($8549): the frame and panel from bank 0's cell numbers and tiles, on both screens;
  // it runs on into new game
  P.def(0x8549, 'draw_frame', () => {
    ldir(0xC000, 0x6505, 0x300);
    let cell = 0x6505, row = 0x4000;
    for (let c = 0x18; c > 0; c--) {
      let scr = row;
      for (let b = 0x20; b > 0; b--) {
        let a = M[cell];
        if (a === 0xFF) a = 0;
        let t = (0xED25 + a * 9) & 0xFFFF, d = scr;
        for (let k = 0; k < 8; k++) { M[d] = M[t]; d = (d + 0x100) & 0xFFFF; t++; }
        d = (d - 0x100) & 0xFFFF;
        const hi = d >> 8;
        M[(0x58 + (hi >= 0x48) + (hi >= 0x50)) << 8 | (d & 255)] = M[t];
        scr++; cell++;
      }
      row = (row + ((row & 255) >= 0xE0 ? 0x720 : 0x20)) & 0xFFFF;
    }
    P.page_bank_7();
    ldir(0x4000, 0xC000, 0x1B00);
    return P.new_game();
  });

  // new_game ($85E2): the starting values from bank 0 into bank 3 and the RAM part, the counters
  // cleared, area 13 set up and drawn; then the main loop afresh (P.RESTART)
  P.def(0x85E2, 'new_game', () => {
    P.page_bank_0();
    ldir(0xFE05, 0x8521, 0x50);
    P.page_bank_3();
    M[0x8D1F] = 0;
    setw(0xC894, 0); setw(0xC896, 0); setw(0xF627, 0); setw(0xF629, 0);
    M[0xEFEE] = 0; M[0xF012] = 1; M[0xD0BD] = 0xFF;
    P.drop_far_actors({ a: 0xFF, bc: 0, de: 0x8571, hl: 0 });
    ldir(0x8521, 0xEB05, 0x40);
    ldir(0x8561, 0xEC5D, 0x10);
    P.page_bank_0();
    ldir(0xFE55, 0x8521, 0x79);
    ldir(0xFECE, 0xBF29, 7);
    ldir(0xFED5, 0x9633, 6);
    P.page_bank_3();
    ldir(0x8521, 0xECD8, 0x79);
    M.fill(0, 0x8D04, 0x8D15); M.fill(0xFF, 0x8D15, 0x8D18);
    M.fill(0x47, 0xF616, 0xF628);
    M.fill(0xFF, 0xF62B, 0xF633);
    M.fill(0xFF, 0xD5C3, 0xD5E3);
    M[0x8D1F] = 0x0D;
    P.place_creatures({ a: 0x0D, bc: 0, de: 0xD5E3, hl: 0xD5E2 });
    P.load_area({});
    return P.new_game_868e({});
  });
  // $868E, where a new leader ($F607) goes on too: the view coloured and drawn, the windows, and
  // the main loop afresh
  P.def(0x868E, 'new_game_868e', () => {
    P.colour_view({});
    M[0xA6F2] = 0xFF;
    P.draw_view({ a: 0xFF });
    P.page_bank_3();
    P.windows_pass({});
    throw P.RESTART;
  });

  // --- the main loop ($86A2) ---
  P.CHECKPOINTS = [0x86A2, 0x86A9, 0x86AC, 0x86AF, 0x86B2, 0x86B5, 0x86B8, 0x86BB, 0x86BE, 0x86C1, 0x86C4, 0x86C7, 0x86CA,
    0x86CD, 0x86D0, 0x86D3, 0x86D6, 0x86D9, 0x86DC, 0x86DF, 0x86E2, 0x86E5, 0x86E8, 0x86EB, 0x86EE, 0x8704, 0x8709, 0x870F];
  P.HALTS = [0x999C, 0xCDF6];
  P.def(0x86A2, 'main_loop', function* () {
    for (;;) {
      yield { cp: 0x86A2 };
      setw(0x8D1C, w(0x8D1C) + 1);
      yield { cp: 0x86A9 }; P.page_bank_3();
      yield { cp: 0x86AC }; P.needs_pass({});
      yield { cp: 0x86AF }; P.drop_far_actors({});
      yield { cp: 0x86B2 }; P.place_creatures({});
      yield { cp: 0x86B5 }; P.move_records({});
      yield { cp: 0x86B8 }; P.move_records({});
      yield { cp: 0x86BB }; P.actors_pass({});
      yield { cp: 0x86BE }; P.leader_input({});
      yield { cp: 0x86C1 }; P.page_bank_3();
      yield { cp: 0x86C4 }; P.zones_pass({});
      yield { cp: 0x86C7 }; P.animate_actors({});
      yield { cp: 0x86CA }; yield* P.follow_leader({});
      yield { cp: 0x86CD }; P.page_bank_0();
      yield { cp: 0x86D0 }; P.shimmer_check({});
      yield { cp: 0x86D3 }; P.day_night_colour({});
      yield { cp: 0x86D6 }; P.page_bank_3();
      yield { cp: 0x86D9 }; P.draw_rope({});
      yield { cp: 0x86DC }; P.move_shots({});
      yield { cp: 0x86DF }; P.draw_actors({});
      yield { cp: 0x86E2 }; P.page_bank_0();
      yield { cp: 0x86E5 }; P.panel_pass({});
      yield { cp: 0x86E8 }; P.page_bank_3();
      yield { cp: 0x86EB }; yield* P.menus_pass({});
      yield { cp: 0x86EE }; P.windows_pass({});
      // the leader dead, the first time: bank 3's $FB7C with 1, and message 32 when it says so
      if ((M[0x8301] & 0x0F) < 8 || M[0x8D09]) continue;
      M[0x8D09] = 0xFF;
      yield { cp: 0x8704 }; P.page_bank_3();
      yield { cp: 0x8709 }; const r = P.within_reach({ a: 1 });
      yield { cp: 0x870F }; if (r.zf) P.queue_message({ b: 0x20, c: 0x01 });
    }
  });
  // P.program: from the hand-over (boot), or from a pass's start, for ever
  P.program = function* (boot) {
    if (boot) { try { yield* P.start(); } catch (e) { if (e !== P.RESTART) throw e; } }
    for (;;) { try { yield* P.main_loop(); } catch (e) { if (e !== P.RESTART) throw e; } }
  };

  // follow_leader ($98FF): the view scrolled after the leader, by one of the 18 steps of $9963, then
  // shown ($9987)
  P.def(0x98FF, 'follow_leader', function* () {
    const step = a => {
      a = (a + a) & 255;
      const t = (0x9963 + a) & 0xFFFF, to = w(t);
      P.jump(to, { a: to & 255, hl: to });
    };
    if (M[0x8300] === M[0x8D0A]) {
      if (M[0x8D16] !== 0xFF) { const a = (M[0x8D16] + 14) & 255; M[0x8D16] = 0xFF; step(a); }
      else if (M[0x8D17] !== 0xFF) { const a = M[0x8D17] ^ 2; M[0x8D17] = 0xFF; step(a); }
      else if (!(M[0x8318] & 0x40)) {
        if (M[0x8ECD] === 0x10) step(9);
        else {
          const hl = (w(0x8309) + 3) & 0xFFFF;
          P.page_bank_1();
          if (!(M[hl] & 0xF0)) step(M[0x830B] & 0x80 ? M[hl] ^ 2 : M[hl]);
        }
      }
    }
    return yield* P.show_frame({});
  });

  // show_frame ($9987): the view's column and row as pixels ($9635, $9637); at the interrupt the
  // screen drawn is shown, the other paged in and the view copied to it
  P.def(0x9987, 'show_frame', function* () {
    setw(0x9635, M[0x9633] * 8); setw(0x9637, M[0x9634] * 8);
    yield { halt: true, at: 0x999C };               // at: the HALT's exit, for the page's pacing
    const a = M[0x8D1E] ^ 8;
    M[0x8D1E] = a;
    P.io.out(0x7FFD, a);
    P.page_hidden_screen();
    P.show_view({});
    M[0x8318] &= ~0x40;
    return {};
  });

  // --- the control selection ---
  // clear_screen ($AE88): the normal screen's pixels 0, its attributes 7
  P.def(0xAE88, 'clear_screen', () => { M.fill(0, 0x4000, 0x5800); M.fill(7, 0x5800, 0x5B00); return { hl: 0x5AFF, de: 0x5B00, bc: 0 }; });
  // print_char ($AEAF): character A at DE in the title's font, DE a column on
  P.def(0xAEAF, 'print_char', r => {
    let t = (r.a * 8 + 0xB131) & 0xFFFF, d = r.de;
    for (let k = 0; k < 8; k++) { M[d] = M[t++]; d = (d + 0x100) & 0xFFFF; }
    return { de: (r.de & 0xFF00) | ((r.de + 1) & 255), b: 0, c: 0x31 };
  });
  // print_counted ($AE9F): the screen address, a count and that many characters at HL
  P.def(0xAE9F, 'print_counted', r => {
    let hl = r.hl, de = w(hl);
    const n = M[(hl + 2) & 0xFFFF];
    hl = (hl + 3) & 0xFFFF;
    for (let i = 0; i < (n || 256); i++) { de = P.print_char({ a: M[hl], de }).de; hl = (hl + 1) & 0xFFFF; }
    return { hl, de, b: 0 };
  });
  // light_option ($B09F): the ten attribute cells of option A's line coloured E
  P.def(0xB09F, 'light_option', r => {
    const hl = (0x596B + 0x40 * r.a) & 0xFFFF;
    for (let i = 0; i < 10; i++) M[(hl & 0xFF00) | ((hl + i) & 255)] = r.e;
    return {};
  });
  // title_key ($B0B6): 1 to 4 for those keys, 0 for the key 0, $FF for none
  P.def(0xB0B6, 'title_key', () => {
    const k = ~P.io.in(0xF7FE) & 0x0F;
    if (k) { let e = 1; while (!(k & (1 << (e - 1)))) e++; return { a: e, e }; }
    return { a: P.io.in(0xEFFE) & 1 ? 0xFF : 0, e: 0 };
  });
  // wait_y_or_n ($AED9): Y (Z set) or N
  P.def(0xAED9, 'wait_y_or_n', function* () {
    for (;;) {
      if (!(P.io.in(0xDFFE) & 0x10)) return { zf: true };
      if (~P.io.in(0x7FFE) & 0x08) return { zf: false };
      yield;
    }
  });
  // confirm ($AEC7): CONFIRM? Y OR N, the answer, the line blanked
  P.def(0xAEC7, 'confirm', function* () {
    P.print_counted({ hl: 0xAEFD });
    const r = yield* P.wait_y_or_n();
    P.print_counted({ hl: 0xAEEB });
    return { zf: r.zf };
  });
  // title ($AE10): the control selection screen, until a choice is confirmed
  P.def(0xAE10, 'title', function* () {
    P.io.out(0x7FFD, 0);
    P.clear_screen();
    let r = ldir(0x5800, 0x5801, 0xE0);
    M[r.hl] = 0x42; r = ldir(r.hl, r.de, 0x20);
    M[r.hl] = 0x05; ldir(r.hl, r.de, 0x180);
    // the logo: five strips, each its width (into the LD BC at $AE46), its rows, then its bytes
    let hl = 0xB259, strip = 0x4007;
    for (let s = 0; s < 5; s++) {
      M[0xAE47] = M[hl];
      const rows = M[hl + 1];
      hl += 2;
      let de = strip;
      for (let k = 0; k < (rows || 256); k++) {
        hl = ldir(hl, de, M[0xAE47] | M[0xAE48] << 8).hl;
        let x = (de + 0x100) & 0xFFFF;
        if (!(x & 0x0700)) x = (x + ((de & 255) >= 0xE0 ? 0xFF20 : 0xF820)) & 0xFFFF;
        de = x;
      }
      strip = (strip & 0xFF00) | ((strip + 4) & 255);
    }
    hl = 0xB0E0;
    for (let i = 0; i < 6; i++) hl = P.print_counted({ hl }).hl;
    P.light_option({ a: 0, e: 0x46 });
    yield* P.title_loop();
    P.clear_screen();
    return {};
  });
  // title_loop ($AE83): $AF0F for ever, until a choice is confirmed
  P.def(0xAE83, 'title_loop', function* () {
    for (;;) {
      if ((yield* P.title_keys()).chosen) return {};
      yield;
    }
  });
  // title_keys ($AF0F): one look at the keys; a confirmed choice copies its input routine to
  // $6811 (and with the keyboard asks for its keys) and leaves the title's loop
  P.def(0xAF0F, 'title_keys', function* () {
    const a = P.title_key().a;
    if (a === 0xFF) return {};
    if (a !== 0) {
      P.light_option({ a: M[0xB0DF], e: 0x05 });
      M[0xB0DF] = a - 1;
      P.light_option({ a: a - 1, e: 0x46 });
      return {};
    }
    P.light_option({ a: M[0xB0DF], e: 0x47 });
    if (!(yield* P.confirm()).zf) { P.light_option({ a: M[0xB0DF], e: 0x46 }); return {}; }
    const c = M[0xB0DF];
    ldir(w((0xB0D7 + 2 * c) & 0xFFFF), 0x6811, 0x47);
    if (c === 0) yield* P.define_keys();
    return { chosen: true };
  });
  // define_keys ($AFEC): the five keys chosen, west, east, north, south and fire, each once every
  // key has been let go, a key already taken refused; the list at $6807
  P.def(0xAFEC, 'define_keys', function* () {
    for (;;) {
      P.clear_screen();
      let hl = 0xAF61;
      for (let i = 0; i < 6; i++) hl = P.print_counted({ hl }).hl;
      M.fill(0, 0x6807, 0x6811);
      let place = 0xAFE2;
      for (let k = 0; k < 5; k++) {
        M[0xB080] = M[place]; M[0xB081] = M[place + 1];
        place += 2;
        let clean = false, port = 0, bit = 0, row = 0;
        // scan the eight half-rows ($AF99) until a key is down after a scan with none
        for (;;) {
          let found = false;
          for (row = 0; M[0xAF99 + row]; row++) {
            port = M[0xAF99 + row];
            const e = ~P.io.in(port << 8 | 0xFE) & 0xFF;
            for (bit = 0x10; bit; bit >>= 1) if (bit & e) break;
            if (bit) { found = true; break; }
          }
          if (!found) { clean = true; yield; continue; }
          if (!clean) { yield; continue; }
          // taken already? the list of port and bit pairs from $6805
          let a = 0x6805, taken = false;
          for (; M[a]; a += 2) if (M[a] === port && M[a + 1] === bit) { taken = true; break; }
          if (taken) { clean = false; yield; continue; }
          M[a] = port; M[(a & 0xFF00) | ((a + 1) & 255)] = bit;
          break;
        }
        let t = (0xAFBA + 5 * row) & 0xFFFF;
        for (let b = bit; !(b & 1); b >>= 1) t++;
        let n = 1, ch = M[t];
        if (ch & 0x80) { t = 0xAFA2 + (ch & 0x7F); n = M[t]; t++; }
        let de = M[0xB080] | M[0xB081] << 8;
        for (let i = 0; i < (n || 256); i++) { de = P.print_char({ a: M[t], de }).de; t++; }
      }
      yield { tstates: 65535 * 24 };                 // the pause before CONFIRM?
      if ((yield* P.confirm()).zf) return {};
    }
  });

  // --- the input routines (copied to $6811 by the control selection) ---
  const inv = port => ~P.io.in(port) & 0xFF;
  // read_keyboard ($B57F): the five keys chosen, from the port and bit pairs at $6807
  P.def(0xB57F, 'read_keyboard', () => {
    const key = i => inv(M[0x6807 + 2 * i] << 8 | 0xFE) & M[0x6808 + 2 * i];
    let e = key(0) ? 3 : key(1) ? 6 : 0;
    if (key(2)) e += 1; else if (key(3)) e += 2;
    return { a: key(4) ? e + 9 : e, e };
  });
  // read_cursor ($B5C6): 5 left, 8 right, 7 up, 6 down, 0 fire
  P.def(0xB5C6, 'read_cursor', () => {
    let e = inv(0xF7FE) & 0x10 ? 3 : inv(0xEFFE) & 0x04 ? 6 : 0;
    const d = inv(0xEFFE);
    e += d & 0x08 ? 1 : d & 0x10 ? 2 : 0;
    return { a: (d & 1 ? 9 : 0) + e, d, e };
  });
  // read_kempston ($B5FD): port $1F, right, left, down, up and fire in bits 0 to 4
  P.def(0xB5FD, 'read_kempston', () => {
    const v = P.io.in(0x001F);
    const b = v & 2 ? 3 : v & 1 ? 6 : 0, c = v & 8 ? 1 : v & 4 ? 2 : 0;
    return { a: (v & 0x10 ? 9 : 0) + b + c, b, c };
  });
  // read_sinclair ($B64C): 6 left, 7 right, 8 down, 9 up, 0 fire
  P.def(0xB64C, 'read_sinclair', () => {
    const v = inv(0xEFFE);
    const c = v & 4 ? 2 : v & 2 ? 1 : 0, b = v & 0x10 ? 3 : v & 8 ? 6 : 0;
    return { a: (v & 1 ? 9 : 0) + b + c, b, c };
  });
  // read_port_7f ($B622): a joystick on port $7F
  P.def(0xB622, 'read_port_7f', () => {
    let v = P.io.in(0x007F);
    if (v & 0x10) v = ~v & 255;
    const c = v & 2 ? 2 : v & 1 ? 1 : 0, b = v & 8 ? 6 : v & 4 ? 3 : 0;
    return { a: (v & 0x80 ? 9 : 0) + b + c, b, c };
  });
  // input_routine ($6811): whichever of them the control selection copied there
  P.def(0x6811, 'input_routine', () => {
    const k = M[0x6812], k2 = M[0x6813];
    if (M[0x6811] === 0x21 && k === 0x07) return P.read_keyboard();
    if (k === 0x1F) return P.read_kempston();
    if (k === 0xFE && k2 === 0xEF) return P.read_sinclair();
    if (k === 0xFE && k2 === 0xF7) return P.read_cursor();
    if (k === 0x7F) return P.read_port_7f();
    throw new Error('input_routine: no input routine at $6811');
  });

};
})(typeof window !== 'undefined' ? window : globalThis);
