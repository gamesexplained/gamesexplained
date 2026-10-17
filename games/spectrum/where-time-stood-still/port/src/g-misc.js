// The leader's control, the conversation queue, the view's colour, the copies between banks and
// the isometric lines a shot is drawn with ($8714-$8C74, $BEE0).
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.misc = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const rd = a => M[P.mem.alias(a & 0xFFFF)];
  const wr = (a, v) => { M[P.mem.alias(a & 0xFFFF)] = v; };
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);

  // leader_input ($8B81): the input routine's direction code ($8D20: up 1, down 2, left 3, right
  // 6, the sums for diagonals, 9 more with fire); SPACE with no menu up opens menu 1, stopping the
  // leader unless he is falling. With a menu up the code moves its pointer (bank 3's $CA49).
  // Otherwise, unless the leader is falling or busy (+1's low nibble from 3), the code becomes his
  // action through the table at $8D3B (a run, 6 and up, is a walk at a half character or when
  // he is wading, state 4 to 7), marked to start (bit 7) when it changes; standing still counts
  // up in $8D1B, and after $40 passes the party may wander ($FF, and bank 3's $F00B reset from
  // $DB05), the leader then standing (action 0 when sitting, state 8 to $0B, else $0A). Then
  // the needs (bank 3's $D6DD).
  P.def(0x8B81, 'leader_input', () => {
    P.page_bank_3();
    M[0x8D20] = P.input_routine().a & 255;
    if (!(P.io.in(0x7FFE) & 1) && !M[0x8D22]) {
      M[0x8D22] = 1;
      P.open_menu_1();
      if (!(M[0x8301] & 0x40)) M[0x830C] = 0;
    }
    if (M[0x8D22] & 0x19) return P.menu_move({ a: M[0x8D22] & 0x19, bc: 0x7FFE });
    if (M[0x8301] & 0x40 || (M[0x8301] & 0x0F) >= 3) return {};
    const dir = M[0x8D20];
    let a, table = false;
    if (dir) { M[0x8D1B] = 0; table = true; }
    else if (M[0x8D1B] !== 0xFF) {
      const n = (M[0x8D1B] + 1) & 255;
      M[0x8D1B] = n;
      if (n < 0x41) table = true;
      else { M[0x8D1B] = 0xFF; setw(0xF00B, w(0xDB05)); }
    }
    if (table) {
      a = M[(0x8D3B + dir) & 0xFFFF];
      if (a >= 6 && M[0x9631]) a -= 5;
    } else {
      if ((M[0x8301] & 0x0F) >= 2) return {};
      a = (M[0x830D] & 0xFC) === 8 ? 0 : 0x0A;
    }
    if ((M[0x830D] & 0xFC) === 4 && a >= 6) a -= 5;
    if (a !== M[0x830C]) M[0x830C] = a | 0x80;
    return P.thirst_starve();
  });

  // queue_message ($8C29): message B for character C put on the conversation queue at $8D39's
  // slot, two bytes an entry, unless the queue is full ($FF there) or its last entry is the same
  P.def(0x8C29, 'queue_message', r => {
    const at = w(0x8D39), b = r.b, c = r.c;
    if (M[at] === 0xFF) return {};
    if (M[(at - 2) & 0xFFFF] === b && M[(at - 1) & 0xFFFF] === c) return {};
    M[at] = b; M[(at + 1) & 0xFFFF] = c;
    setw(0x8D39, (at + 2) & 0xFFFF);
    return {};
  });

  // day_night_colour ($8C47): when the clock marks a change of light in $BF2E (bit 7, then bit
  // 6 on the next pass), the view's colour becomes its low six bits ($AA7D) and the view in the
  // screen not shown is coloured with it
  P.def(0x8C47, 'day_night_colour', () => {
    const v = M[0xBF2E];
    if (!(v & 0x80)) {
      if (!(v & 0x40)) return { zf: true };
      M[0xBF2E] &= 0xBF;
    }
    M[0xBF2E] &= 0x7F;
    M[0xAA7D] = v & 0x3F;
    return P.colour_view();
  });
  // colour_view ($8C5B): the view's 28 by 18 cells from $D822 in the screen not shown coloured
  // $AA7D ($8C61: A, with the screen paged in already)
  const colour = a => {
    let hl = 0xD822;
    for (let c = 0x12; c > 0; c--) {
      for (let b = 0x1C; b > 0; b--) { wr(hl, a); hl = lo(hl, 1); }
      hl = (hl + 4) & 0xFFFF;
    }
    return { a, hl };
  };
  P.def(0x8C5B, 'colour_view', () => { const a = M[0xAA7D]; P.page_hidden_screen(); return colour(a); });
  P.def(0x8C61, 'colour_view_8c61', r => colour(r.a));

  // copy_needs ($8CB6): the leader's eight need bytes from bank 3 ($D5C3, 8 each) to $8CFB, for
  // code that runs with bank 0 paged in, and bank 0 left paged in
  P.def(0x8CB6, 'copy_needs', () => {
    P.page_bank_3();
    P.ldir((0xD5C3 + ((M[0x8D0A] * 8) & 255)) & 0xFFFF, 0x8CFB, 8);
    return P.page_bank_0();
  });
  // copy_from_bank1 ($8CD0): A bytes from bank 1, HL stepping BC, to the buffer at $8521;
  // copy_from_bank6 ($8CE2): C bytes from bank 6 at DE there. Either sets $A6F2 to $FF (the
  // visibility mask to be filled again) and pages bank 3 back in.
  const done = () => { M[0xA6F2] = 0xFF; return P.page_bank_3(); };
  P.def(0x8CD0, 'copy_from_bank1', r => {
    P.page_bank_1();
    let hl = r.hl, de = 0x8521, n = r.a & 255;
    do { M[de] = rd(hl); de = lo(de, 1); hl = (hl + r.bc) & 0xFFFF; n = (n - 1) & 255; } while (n);
    return done();
  });
  P.def(0x8CE2, 'copy_from_bank6', r => {
    P.page_bank_6();
    let hl = r.de, n = r.c || 0x10000;
    for (let de = 0x8521; n > 0; n--, hl = (hl + 1) & 0xFFFF, de = (de + 1) & 0xFFFF) M[de] = rd(hl);
    return done();
  });

  // caps_reset ($BEE0): the machine reset (JP 0) when CAPS SHIFT is held; nothing calls it
  P.RESET = P.RESET || { reset: true, toString: () => 'machine reset' };
  P.def(0xBEE0, 'caps_reset', () => {
    if (P.io.in(0xFEFE) & 1) return { zf: false };
    throw P.RESET;
  });

  // --- the isometric lines: a pattern from the visibility mask at DE, a pixel in C, ORed into
  // the screen not shown at HL a row at a time, the bit in the row past it cleared ---
  // line_start ($8714): the visibility mask built for the sprite set up, and moved at a half
  // character; the screen not shown paged in
  P.def(0x8714, 'line_start', r => {
    P.build_mask(); P.shift_mask_half();
    P.page_hidden_screen();
    const bc = r.bc !== undefined ? r.bc : (r.b << 8 | r.c);
    return { hl: r.hl, de: r.de, bc, b: bc >> 8, c: bc & 255 };
  });
  const up = (hl, de, c) => {
    wr(hl, (rd(de) & c) | rd(hl));
    de = lo(de, -4);
    if (hl & 0x700) hl = (hl - 0x100) & 0xFFFF;
    else hl = (hl + ((hl & 255) < 0x20 ? 0xFFE0 : 0x06E0)) & 0xFFFF;
    wr(hl, ~(rd(de) & c) & rd(hl));
    return { hl, de };
  };
  const down = (hl, de, c) => {
    wr(hl, (rd(de) & c) | rd(hl));
    de = lo(de, 4);
    hl = (hl + 0x100) & 0xFFFF;
    if (!(hl & 0x700)) hl = (hl + ((hl & 255) >= 0xE0 ? 0xFF20 : 0xF820)) & 0xFFFF;
    wr(hl, ~(rd(de) & c) & rd(hl));
    return { hl, de };
  };
  // two pixels right or left, the screen and the mask a byte on when the pixel wraps
  const rrc = c => ((c >> 1) | (c << 7)) & 255, rlc = c => ((c << 1) | (c >> 7)) & 255;
  const right = (hl, de, c) => {
    if (c & 1) { hl = lo(hl, 1); de = lo(de, 1); return { hl, de, c: rrc(rrc(c)) }; }
    c = rrc(rrc(c));
    if (c & 0x80) { hl = lo(hl, 1); de = lo(de, 1); }
    return { hl, de, c };
  };
  const left = (hl, de, c) => {
    if (c & 0x80) { hl = lo(hl, -1); de = lo(de, -1); return { hl, de, c: rlc(rlc(c)) }; }
    c = rlc(rlc(c));
    if (c & 1) { hl = lo(hl, -1); de = lo(de, -1); }
    return { hl, de, c };
  };
  P.def(0x8723, 'line_up', r => up(r.hl, r.de, r.c));
  P.def(0x8746, 'line_down', r => down(r.hl, r.de, r.c));
  P.def(0x8767, 'line_right', r => right(r.hl, r.de, r.c));
  P.def(0x8776, 'line_left', r => left(r.hl, r.de, r.c));
  // line_up_right ($8785) and the others after it: B steps of a line, then bank 3 paged back in
  const line = (vert, horiz) => r => {
    let { hl, de, b, c } = P.line_start(r);
    do {
      ({ hl, de } = vert(hl, de, c));
      if (horiz) ({ hl, de, c } = horiz(hl, de, c));
      else { c >>= 1; wr(hl, ~(rd(de) & c) & rd(hl)); c = (c << 1) & 255; }
      b = (b - 1) & 255;
    } while (b);
    P.page_bank_3();
    return { a: 0, zf: true, hl, de, c };
  };
  P.def(0x8785, 'line_up_right', line(up, right));
  P.def(0x8792, 'line_up_right_8792', line(down, right));
  P.def(0x879F, 'line_up_right_879f', line(down, left));
  P.def(0x87AE, 'line_up_right_87ae', line(up, left));
  P.def(0x87BB, 'line_up_right_87bb', line(down, null));
};
})(typeof window !== 'undefined' ? window : globalThis);
