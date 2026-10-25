// The panel, from the interrupt's two lower bands: its messages scrolled through the strip, the
// score rolling like an odometer, the radiation meter and the add-on window on sprites 5 to 7, the
// power-up when the suit first comes alive, the add-ons lying in a room flashing; and the panel
// drawn, from the main program.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.messages = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const setw = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);

  // scroll_message ($AA68): the message in zp_msg_scroll two pixels a frame through the strip,
  // once the panel is on; at each letter's start its eight rows from the panel's character set
  // ($7000 + 8 x code: letters from $9C, punctuation by text_punct $C5CB) into the buffer at $0672.
  // In the text, 0 starts it again, 1 n goes on to message n, and "$" ends it.
  P.scroll_message = function () {
    for (;;) {
      if (!(R(0x54) & 0x80) || !(R(0x8A) & 0x80)) return {};
      if (!R(0x56)) {
        let y = (R(0x54) << 1) & 255;
        M[0x20] = M[0xC1AA + y]; M[0x21] = M[0xC1AB + y];
        if (!(R(0x0357) & 0x80)) M[0x0360] = 0x95;
        let g = -1;
        for (;;) {
          y = R(0x55);
          const c = M[at(0x20, y)];
          if (c >= 0x41 && c < 0x5B) { g = c + 0x5B; break; }
          let x = 7;
          for (; x >= 0; x--) if (c === M[0xC5CB + x]) break;
          if (x >= 0) { g = M[0xC5D3 + x]; break; }
          if (c === 0) { M[0x55] = 0; continue; }
          break;
        }
        if (g < 0) {
          const c = M[at(0x20, y)];
          if (c === 1) {
            M[0x54] = M[at(0x20, (y + 1) & 255)];
            M[0x55] = 0;
            continue;
          }
          if (c === 0x24) { M[0x54] = 0; M[0x0357] = 0; M[0x033F] = 0; M[0x38] = 0; M[0x39] = 0; }
          return {};
        }
        setw(0x20, ((g & 255) << 3) + 0x7000);
        for (let k = 7; k >= 0; k--) M[0x0672 + k] = M[at(0x20, k)];
        inc(0x55);
      }
      P.shift_message();
      P.shift_message();
      M[0x56] = R(0x56) & 0x07;
      return {};
    }
  };
  // shift_message ($AB11): the strip ($77A8-$77FF, eleven characters) a pixel left, the next
  // column of the letter in the buffer rolling in at the right.
  P.shift_message = function () {
    for (let x = 7; x >= 0; x--) {
      let c = M[0x0672 + x] >> 7;
      M[0x0672 + x] = (M[0x0672 + x] << 1) & 255;
      for (let a = 0x77F8; a >= 0x77A8; a -= 8) {
        const v = M[a + x];
        M[a + x] = ((v << 1) | c) & 255;
        c = v >> 7;
      }
    }
    inc(0x56);
    return { x: 0xFF };
  };
  // next_message ($ADC4): the panel on and no message scrolling, the highest waiting entry of the
  // queue ($066A, bit 7) freed and started.
  P.next_message = function () {
    if (!(R(0x8A) & 0x80)) return {};
    P.count('queued');
    if (R(0x54) & 0x80) return {};
    for (let x = 7; x >= 0; x--) {
      const v = R(0x066A + x);
      if (!(v & 0x80)) continue;
      M[0x066A + x] = v & 0x7F;
      return P.start_message({ a: v & 0x7F });
    }
    return { x: 0xFF };
  };
  // addon_message ($ADDF): while a message scrolls the window shows static (zpa_47 $80) unless it
  // is an add-on's; when none scrolls, in the suit, an add-on newly fitted ($067A) has its message.
  P.addon_message = function () {
    const a = R(0x54);
    if (a & 0x80) {
      if ((a & 0x7F) < 4) return {};
      M[0x47] = 0x80;
      return {};
    }
    M[0x47] = 0x80;
    if (!(R(0x7B) & 0x80)) return {};
    for (let x = 3; x >= 0; x--) {
      const v = R(0x067A + x);
      if (!(v & 0x80)) continue;
      M[0x067A + x] = v & 0x7F;
      M[0x47] = x;
      return P.start_message({ a: x });
    }
    return { x: 0xFF };
  };
  // clear_message_strip ($8F3B): the strip's characters cleared.
  P.clear_message_strip = function () {
    for (let x = 0; x < 0x58; x++) M[0x77A8 + x] = 0;
    return { a: 0, x: 0x58 };
  };
  // start_message ($8EB0): message A from its start, on a clear strip.
  P.start_message = function (r) {
    P.clear_message_strip();
    M[0x55] = 0; M[0x56] = 0;
    const a = r.a | 0x80;
    M[0x54] = a;
    return { a, x: 0x58 };
  };
  // queue_message ($8EBE): message A into the first free entry of the queue, once the panel is on,
  // unless it is scrolling or waiting already.
  P.queue_message = function (r) {
    M[0x44] = r.a;
    if (!(R(0x8A) & 0x80)) return {};
    if (R(0x44) === R(0x54)) return {};
    for (let x = 7; x >= 0; x--) {
      if (R(0x066A + x) === R(0x44)) return { x };
      if (R(0x066A + x) & 0x80) continue;
      M[0x066A + x] = R(0x44);
      return { x };
    }
    return { x: 0xFF };
  };

  // roll_score ($AB3D): the panel on, the five digits shown ($0687) rolling towards the count
  // ($0682): at a roll's start each that differs steps on, and for four frames its glyph rolls
  // down into its character two rows a frame; at the end the count steps towards the score.
  P.roll_score = function () {
    if (!(R(0x8A) & 0x80)) return {};
    P.count('scores');
    for (let x = 4; x >= 0; x--) {
      if (R(0x41) === 7) {
        if (R(0x0687 + x) === R(0x0682 + x)) continue;
        M[0x068C + x] = 0x80;
        let v = R(0x0687 + x) + 1;
        if (v >= 10) v = 0;
        M[0x0687 + x] = v;
      }
      if (!(R(0x068C + x) & 0x80)) continue;
      M[0x28] = (R(0x0687 + x) + 0xB6) & 255;
      M[0x2A] = (x + 0xE8) & 255;
      M[0x29] = 0; M[0x2B] = 0;
      P.digit_glyph_ptrs();
      P.roll_digit();
    }
    dec(0x41);
    if (!(dec(0x41) & 0x80)) return {};
    M[0x41] = 7;
    P.score_digits();
    for (let x = 4; x >= 0; x--) M[0x068C + x] = 0;
    return { a: 0, x: 0xFF };
  };
  // digit_glyph_ptrs ($AB9F): glyph zpa_28 and character zpa_2A as addresses in the panel's
  // character set, $7000 + 8 x each.
  P.digit_glyph_ptrs = function () {
    setw(0x28, (w(0x28) << 3) + 0x7000);
    setw(0x2A, (w(0x2A) << 3) + 0x7000);
    return { a: M[0x2B], y: 0xFF };
  };
  // roll_digit ($ABC7): the character's rows 0-5 down to 2-7, and the glyph's rows zpa_41 - 1 and
  // zpa_41 into its rows 0 and 1.
  P.roll_digit = function () {
    for (let y = 5; y >= 0; y--) M[at(0x2A, y + 2)] = M[at(0x2A, y)];
    const y = R(0x41);
    const g1 = M[at(0x28, y)], g0 = M[at(0x28, (y - 1) & 255)];
    M[at(0x2A, 0)] = g0;
    M[at(0x2A, 1)] = g1;
    return { a: g1, y: 1 };
  };
  // score_digits ($ABE5): the count's value, each digit times its weight (digit_weights $06A6),
  // into $0694-$0696; when it is not the score, the count goes up by one.
  P.score_digits = function () {
    M[0x0694] = 0; M[0x0695] = 0; M[0x0696] = 0;
    for (let y = 0; y < 5; y++) {
      M[0xA5] = M[0x06A6 + 2 * y]; M[0xA6] = M[0x06A7 + 2 * y];
      const n = R(0x0682 + y);
      if (n) P.add_weight({ x: n });
    }
    for (let y = 2; y >= 0; y--) {
      if (R(0x0697 + y) === R(0x0694 + y)) continue;
      let c = 1;
      for (let x = 0; x < 5; x++) {
        let v = R(0x0682 + x) + c;
        c = v >= 10 ? 1 : 0;
        if (c) v = 0;
        M[0x0682 + x] = v;
      }
      return { x: 5 };
    }
    return { y: 0xFF };
  };
  // add_weight ($AC1C): the weight in zpa_A5/zpa_A6 added X times to the sum at $0694, each time
  // counted for the page's clock (P.N, or P.NI in the interrupt).
  P.add_weight = function (r) {
    let x = r.x;
    const n = P.inIrq ? P.NI : P.N;
    do {
      n.weights = (n.weights || 0) + 1;
      let s = R(0x0694) + R(0xA5);
      M[0x0694] = s & 255;
      s = R(0x0695) + R(0xA6) + (s >> 8);
      M[0x0695] = s & 255;
      s = R(0x0696) + (s >> 8);
      M[0x0696] = s & 255;
      x = (x - 1) & 255;
    } while (x);
    return { x: 0 };
  };

  // panel_sprites ($AC56): the panel on: the radiation meter on sprite 5 and its lamp, the clicks,
  // the add-on window on sprites 6 and 7; Tal's sprites black and behind, single colour, for the
  // panel's band.
  P.panel_sprites = function () {
    if (!(R(0x8A) & 0x80)) return {};
    P.count('panelled');
    const x = R(0x75) ^ 0x03;
    M[0x43FD] = (x + 0x70) & 255;
    io.vicWrite(0x0A, 0xF1);
    io.vicWrite(0x0B, 0xC2);
    io.vicWrite(0x2C, 0x05);
    io.vicWrite(0x15, 0x20);
    M[0x4370 + 0x1B] = M[0xFC50 + x];
    io.colourWrite(0x0370 + 0x1B, 0x02);
    P.radiation_clicks({ x });
    P.addon_icon();
    P.panel_static();
    io.vicWrite(0x27, 0);
    io.vicWrite(0x28, 0);
    io.vicWrite(0x1C, 0);
    io.vicWrite(0x1B, 0xFF);
    io.vicWrite(0x10, io.vicRead(0x10) & 0x03);
    return {};
  };
  // radiation_clicks ($ACA8): the wait zpa_38/zpa_39 counted down; out, voice 3 clicks for the
  // room's radiation (radiation_click_tracks $06B0) when it is free, and the wait is reloaded
  // (radiation_click_waits $06B4) for X, the level when voice 3 was free.
  P.radiation_clicks = function (r) {
    let x = r.x;
    if (!(R(0x38) | R(0x39))) {
      if (!(R(0x0357) & 0x80)) { x = R(0x75); M[0x0360] = M[0x06B0 + x]; }
      const k = (x << 1) & 255;
      M[0x38] = M[0x06B4 + k]; M[0x39] = M[0x06B5 + k];
      x = k;
    }
    const v = (R(0x38) | R(0x39) << 8) - 1;
    M[0x38] = v & 255; M[0x39] = (v >> 8) & 255;
    return { a: M[0x39], x };
  };
  // panel_static ($ACD6): no add-on shown, sprites 6 and 7 show the next of eight pictures of
  // static ($74-$7B).
  P.panel_static = function () {
    if (!(R(0x47) & 0x80)) return {};
    inc(0x76);
    const a = ((R(0x76) & 0x07) + 0x74) & 255;
    M[0x43FE] = a; M[0x43FF] = a;
    io.vicWrite(0x2D, 0x01);
    io.vicWrite(0x2E, 0x01);
    io.vicWrite(0x0C, 0xA8);
    io.vicWrite(0x0E, 0xBC);
    io.vicWrite(0x0D, 0xCA);
    io.vicWrite(0x0F, 0xCA);
    io.vicWrite(0x15, io.vicRead(0x15) | 0xC0);
    return {};
  };
  // addon_icon ($AD0C): an add-on's message scrolling (zpa_47 its number), its picture ($9B + n)
  // on sprite 6.
  P.addon_icon = function () {
    const a = R(0x47);
    if (a & 0x80) return {};
    M[0x43FE] = (a + 0x9B) & 255;
    io.vicWrite(0x2D, 0x0A);
    io.vicWrite(0x0C, 0xB0);
    io.vicWrite(0x0D, 0xCA);
    io.vicWrite(0x15, io.vicRead(0x15) | 0x40);
    return {};
  };
  // panel_power_up ($AD2E): the panel switching on: six stages of flicker between hires and
  // multicolour (flicker_counts $FC9F, flicker_waits $FC98); then the power-up sound and the suit's
  // energy filled a unit a frame to 32, and message $84.
  P.panel_power_up = function () {
    for (;;) {
      if (!(R(0x8A) & 0x80)) return {};
      P.count('powered');
      const x = R(0x48);
      if (x >= 6) {
        M[0x4A] = 0x10; M[0x48] = 0x10;
        if (R(0x0355) === 0x8F) return {};
        if (!R(0x92)) { M[0x035E] = 0x92; M[0x035F] = 0x93; M[0x0360] = 0x94; }
        if (R(0x92) >= 0x20) return {};
        inc(0x4F);
        inc(0x92);
        const n = R(0x92);
        if (n < 0x20) return {};
        M[0xA0] = n;
        return P.queue_message({ a: 0x84 });
      }
      if (R(0x8D)) { dec(0x8D); return { x }; }
      if (R(0x49) >= M[0xFC9F + x]) { M[0x49] = 0; inc(0x48); continue; }
      inc(0x49);
      M[0x8D] = M[0xFC98 + x];
      M[0x4A] = R(0x4A) ^ 0x10;
      dec(0x8D);
      return { x };
    }
  };
  // flash_items ($AD95): the first add-on lying in the room (slots 3-7) given the next colour of
  // the cycle 1-15 every five frames.
  P.flash_items = function () {
    for (let y = 3; y >= 0; y--) {
      for (let x = 3; x < 8; x++) {
        if (R(0x0260 + x) !== M[0xFC54 + y]) continue;
        if (!R(0x8C)) {
          inc(0x8B);
          const v = R(0x8B) & 0x0F;
          M[0x8B] = v;
          if (!v) inc(0x8B);
          M[0x8C] = 5;
        }
        M[0x0227 + x] = R(0x8B);
        return { x, y };
      }
    }
    return { x: 8, y: 0xFF };
  };
  // draw_panel ($8EE2): the panel's eight rows of 32 characters (panel_map $F15A) from screen row
  // 17, column 4, in dark grey; the strip and the energy bars cleared.
  P.draw_panel = function () {
    P.clear_panel();
    for (let x = 0x1F; x >= 0; x--) {
      for (let r = 0; r < 8; r++) {
        M[0x42AC + 40 * r + x] = M[0xF15A + 32 * r + x];
        io.colourWrite(0x02AC + 40 * r + x, 0x0B);
      }
    }
    P.clear_message_strip();
    return P.clear_energy_bars();
  };
  // clear_energy_bars ($8F47): the two energy bars' eight characters cleared.
  P.clear_energy_bars = function () {
    for (let a = 0x7768; a < 0x77A8; a++) M[a] = 0;
    return { a: 0, x: 0xFF };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
