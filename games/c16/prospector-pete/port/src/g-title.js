// The title screen: the screen drawn (title, draw_box, print_script, show_controls), its interrupt
// (irq_title: the border's shimmer, the scroller and the controls), the high-score table and the
// name typed into it (high_scores, draw_hiscores, print_hiscore), and the keys that change the
// controls and the level (toggle_controls, change_level, next_direction).
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).title = function (P) {
const M = P.M, io = P.io, POLL = P.POLL;
const word = a => M[a] | M[a + 1] << 8;

// The title screen, its message chosen by the last game's score, and the wait for fire: it returns
// with the score cleared and two men (title, $2F00).
P.title = function* () {
  io.sei();
  io.write(0xFF06, 0x0B); io.write(0xFF07, 0x98);
  M[0x0314] = 0x80; M[0x0315] = 0x30;                     // irq_title
  io.write(0xFF0B, 0xD0);
  io.write(0xFF15, 0x00); M[0xA4] = 0; M[0xBD] = 0; io.write(0xFF11, 0x00);
  io.write(0xFF16, 0x4D); io.write(0xFF17, 0x1E);
  M.fill(0x79, 0x0800, 0x0C00); M.fill(0xA4, 0x0C00, 0x1000);
  for (let y = 0x25; y >= 0; y--) { M[0x0C01 + y] = 0xB0; M[0x0FC1 + y] = 0xB1; }
  let p = 0x0C28;
  for (let x = 0x17; x > 0; x--) { M[p] = 0xAE; M[p + 0x27] = 0xAF; p += 0x28; }
  M[0x0D] = p & 0xFF; M[0x0E] = p >> 8;
  M[0x0C00] = 0xB2; M[0x0FC0] = 0xB3; M[0x0FE7] = 0xB4; M[0x0C27] = 0xB5;
  M[0x0D] = 0x55; M[0x0E] = 0x0C; M[0x0F] = 0x1C; M[0x10] = 0x09; P.draw_box();
  M[0x0D] = 0x5A; M[0x0E] = 0x0E; M[0x0F] = 0x22; M[0x10] = 0x06; P.draw_box();
  P.print_script({ a: 0x02, x: 0x32 });
  for (let x = 7; x >= 0; x--) M[0x0ABA + x] = 0x41;
  P.show_controls();
  for (let x = 0x16; x >= 0; x--) { M[0x0D20 + x] = 0xB6; M[0x0920 + x] = 0x71; }
  P.print_level({ a: 0xCA, x: 0x0E });
  M.fill(0x00, 0x1630, 0x16B8);                            // the scroller's characters
  for (let x = 0x0F; x >= 0; x--) { M[0x0B0B + x] = 0x71; M[0x0F0B + x] = x + 0xC7; }
  M[0x1F] = 0x01;
  let msg = 0x3285;                                        // the greeting
  if (M[0xAA] | M[0xAB] | M[0xAC]) {
    if (M[0xAC] !== 0) msg = 0x33F8;
    else if (M[0xAB] < 0x20) msg = 0x3410;
    else if (M[0xAB] < 0x60) msg = 0x343C;
    else if (M[0xAB] < 0x90) msg = 0x345C;
    else msg = 0x3473;
  }
  M[0x1B] = msg & 0xFF; M[0x1C] = msg >> 8;
  io.write(0xFF06, 0x1B);
  M[0x0B] = M[0x0C] = 0x1B;
  M[0xA5] = M[0xA4] = 0;
  M[0x18] = 0x08;
  io.cli();
  yield { cp: 0x305B }; yield* P.high_scores();
  for (;;) {                                               // j_305E
    const f = P.irqByte(0x64);
    while (P.irqByte(0x64) === f) yield POLL;
    if (P.irqByte(0x0B) !== 0 && P.irqByte(0x0C) === 0) {  // fire, newly pressed
      M[0xAA] = M[0xAB] = M[0xAC] = 0;
      M[0xA9] = 0x02;
      return { a: 0x02 };
    }
    yield { cp: 0x3077 }; P.toggle_controls();
    yield { cp: 0x307A }; P.change_level();
  }
};

// The title's interrupt, once a frame: on even frames the border's pattern rolled and the scroller
// moved a pixel, a new character taken every eight; every frame the controls (irq_title, $3080).
P.irq_title = function () {
  io.write(0xFF09, 0x02);
  M[0x64] = (M[0x64] + 1) & 0xFF;
  if (!(M[0x64] & 1)) {
    const top = M[0x1520];                                 // b_308F
    for (let x = 0; x < 7; x++) M[0x1520 + x] = M[0x1521 + x];
    M[0x1527] = top;
    for (let x = 7; x >= 0; x--) {                         // b_30A2: the frame's eight characters
      const v = M[0x1520 + x];
      M[0x1580 + x] = M[0x1588 + x] = v;
      M[0x1570 + x] = M[0x1590 + x] = M[0x1598 + x] = v | 0xC0;
      M[0x1578 + x] = M[0x15A0 + x] = M[0x15A8 + x] = v | 0x03;
    }
    M[0x1580] = M[0x158F] = M[0x1590] = M[0x159F] = M[0x15A7] = M[0x15A8] = 0xFF;
    M[0x1F] = (M[0x1F] - 1) & 0xFF;
    if (M[0x1F] === 0) {                                   // the next character of the message
      const n = (word(0x1B) + 1) & 0xFFFF;
      M[0x1B] = n & 0xFF; M[0x1C] = n >> 8;
      let a = M[n & 0x3FFF];
      if (a === 0x01) { M[0x1B] = 0x76; M[0x1C] = 0x32; a = M[0x3276]; }
      M[0x1A] = (0x10 | a >> 5) & 0xFF; M[0x19] = a << 3 & 0xFF;   // b_30F6: $1000 + 8A
      M[0x1F] = 0x08;
      const q = word(0x19);
      for (let y = 7; y >= 0; y--) M[0x16B8 + y] = M[(q + y) & 0x3FFF];
    }
    for (let x = 0; x < 0x8F; x++) {                       // b_3112: the row a pixel left
      const c = M[0x1638 + x] >> 7;
      M[0x1630 + x] = (M[0x1630 + x] << 1 | c) & 0xFF;
    }
  }
  P.read_controls();                                       // j_3121
  M[0xA4] = M[0xA5];
  M[0xA5] = P.read_key_row({ a: 0xFE }).a;                 // RETURN's row
};

// A box from the line characters, top left at ($0D), $0F + 1 wide and $10 + 1 tall, with its
// shadow (draw_box, $3135).
P.draw_box = function () {
  const w = M[0x0F];
  M[0x11] = M[0x0D]; M[0x12] = M[0x0E];
  let x = M[0x10];
  for (;;) {                                               // b_313F: a row, right to left
    const p = word(0x11);
    let y = (w + 1) & 0xFF;
    M[(p + y) & 0x3FFF] = 0xAD;
    y = (y - 1) & 0xFF;
    let a = 0xAC;
    do { M[(p + y) & 0x3FFF] = a; a = 0x00; y = (y - 1) & 0xFF; } while (y !== 0);
    M[p & 0x3FFF] = 0xA8;
    x = (x - 1) & 0xFF;
    if (x & 0x80) break;
    const s = M[0x11] + 0x28; M[0x11] = s & 0xFF;
    const t = M[0x12] + (s >> 8); M[0x12] = t & 0xFF;
    if (t >> 8) break;
  }
  const p = word(0x11), q = word(0x0D);                    // b_3168: the corners, top and bottom
  M[(p + w) & 0x3FFF] = 0xAB; M[(q + w) & 0x3FFF] = 0xA7;
  M[q & 0x3FFF] = 0xA5; M[p & 0x3FFF] = 0xA9;
  let y = (w - 1) & 0xFF;
  do { M[(q + y) & 0x3FFF] = 0xA6; M[(p + y) & 0x3FFF] = 0xAA; y = (y - 1) & 0xFF; } while (y !== 0);
  const s = w + 0x29;                                      // the shadow under it
  y = s & 0xFF; x = w;
  do { M[(p + y) & 0x3FFF] = 0xAD; y = (y - 1) & 0xFF; x = (x - 1) & 0xFF; } while (!(x & 0x80));
  y = (w + 1) & 0xFF;
  M[(q + y) & 0x3FFF] = 0xA4;
  return { a: 0xA4, x, y, c: s >> 8 };
};

// A script of characters, colours and places, from A (low) and X (high), until $80 (print_script,
// $31A1).
P.print_script = function (r) {
  M[0x0D] = r.a; M[0x0E] = r.x;
  for (;;) {
    const p = word(0x0D), a = M[p & 0x3FFF];
    if (a === 0x80) return { a, x: r.x, y: 0, c: 1 };
    if (a === 0x00 || a > 0x80) {                          // b_31B2: a character
      M[word(0x0F) & 0x3FFF] = a;
      M[word(0x11) & 0x3FFF] = M[0x13];
      M[0x0F] = (M[0x0F] + 1) & 0xFF;
      M[0x11] = (M[0x11] + 1) & 0xFF;
      if (M[0x11] === 0) { M[0x10] = (M[0x10] + 1) & 0xFF; M[0x12] = (M[0x12] + 1) & 0xFF; }
      M[0x0D] = (M[0x0D] + 1) & 0xFF;
      if (M[0x0D] === 0) M[0x0E] = (M[0x0E] + 1) & 0xFF;
      continue;
    }
    let n;
    if (a === 0x01) {                                      // a place on the screen
      M[0x0F] = M[0x11] = M[(p + 1) & 0x3FFF];
      const h = M[(p + 2) & 0x3FFF];
      M[0x10] = h; M[0x12] = (h - 4) & 0xFF;
      n = 3;
    } else {                                               // b_31EE: a colour
      M[0x13] = M[(p + 1) & 0x3FFF];
      n = 2;
    }
    const s = M[0x0D] + n; M[0x0D] = s & 0xFF;
    M[0x0E] = (M[0x0E] + (s >> 8)) & 0xFF;
  }
};

// The last game's score into the high-score table where it goes, and the name typed in a letter at
// a time; then the table drawn (high_scores, $34C9).
P.high_scores = function* () {
  M[0x18] = 0;
  let x = 6;
  for (;;) {                                               // b_34CF
    let goesIn = true;
    for (let i = 0; i < 3; i++) {
      const s = M[0xAC - i], e = M[0x3493 + i + x];
      if (s !== e) { goesIn = s > e; break; }
    }
    if (goesIn) break;
    x += 9;                                                // b_34E8
    M[0x18] = (M[0x18] + 0x28) & 0xFF;
    if (x === 0x33) return P.draw_hiscores();
  }
  M[0x20] = (x - 7) & 0xFF;                                // b_34FB: the entries below down one
  let y = 0x2C;
  do { M[0x349C + y] = M[0x3493 + y]; y = (y - 1) & 0xFF; } while (y !== M[0x20]);
  y = (y + 1) & 0xFF;
  M[0x16] = y;
  for (let i = 6; i > 0; i--) { M[0x3493 + y] = 0xDA; y = (y + 1) & 0xFF; }   // ??????
  M[0x3493 + y] = M[0xAC]; M[0x3494 + y] = M[0xAB]; M[0x3495 + y] = M[0xAA];
  P.draw_hiscores();
  y = M[0x18];
  for (let i = 0x0D; i > 0; i--) { M[0x0A83 + y] = 0x54; y = (y + 1) & 0xFF; }  // the row lit
  M[0x15] = 0x06;
  y = M[0x18];
  for (;;) {                                               // b_3541: a frame
    const f = P.irqByte(0x64);
    while (P.irqByte(0x64) === f) yield POLL;
    if (!(P.irqByte(0x0B) !== 0 && P.irqByte(0x0C) === 0)) {
      const d = P.next_direction().a;                      // b_354F
      if (d === 0) continue;
      const v = M[0x0E83 + y];
      if (d === 0x01) { M[0x0E83 + y] = v >= 0xF5 ? 0xD8 : v + 1; continue; }
      const c = v >= 0xD8 ? 1 : 0;                         // b_356B: the carry CMP #$D8 leaves
      const a = ((v === 0xD8 ? 0xF6 : v) - 2 + c) & 0xFF;
      M[0x0E83 + y] = a;
      if (a !== 0) continue;
    }
    M[0x0A83 + y] = 0x67;                                  // b_357B: the letter taken
    M[0x3493 + M[0x16]] = M[0x0E83 + y];
    M[0x16] = (M[0x16] + 1) & 0xFF;
    y = (y + 1) & 0xFF;
    M[0x15] = (M[0x15] - 1) & 0xFF;
    if (M[0x15] === 0) return P.draw_hiscores();
  }
};

// The five entries in their box, names and scores (draw_hiscores, $358F).
P.draw_hiscores = function () {
  for (let x = 0x0E; x >= 0; x--) M[0x0A83 + x] = M[0x0AAB + x] = M[0x0AD3 + x] = M[0x0AFB + x] = M[0x0B23 + x] = 0x67;
  for (let x = 5; x >= 0; x--) {
    M[0x0E83 + x] = M[0x3493 + x]; M[0x0EAB + x] = M[0x349C + x]; M[0x0ED3 + x] = M[0x34A5 + x];
    M[0x0EFB + x] = M[0x34AE + x]; M[0x0F23 + x] = M[0x34B7 + x];
  }
  M[0x0D] = 0x8A; M[0x0E] = 0x0E; M[0x0F] = 0x99; M[0x10] = 0x34;
  M[0x20] = 0x04;
  let c;
  do {                                                     // b_35DC
    P.print_hiscore();
    let s = M[0x0D] + 0x28; M[0x0D] = s & 0xFF; c = s >> 8;
    s = M[0x0E] + c; M[0x0E] = s & 0xFF; c = s >> 8;
    s = M[0x0F] + 0x09 + c; M[0x0F] = s & 0xFF; c = s >> 8;
    s = M[0x10] + c; M[0x10] = s & 0xFF; c = s >> 8;
    M[0x20] = (M[0x20] - 1) & 0xFF;
  } while (!(M[0x20] & 0x80));
  return { a: M[0x10], x: 0x34, y: 0x05, c };
};

// One entry's score, three decimal bytes at ($0F), as six digits at ($0D) (print_hiscore, $35FD).
P.print_hiscore = function () {
  M[0x11] = 0; M[0x12] = 0;
  do {
    const v = M[(word(0x0F) + M[0x12]) & 0x3FFF];
    const hi = (v >> 4) + 0xF6;
    M[(word(0x0D) + M[0x11]) & 0x3FFF] = hi & 0xFF;
    M[0x11]++;
    const lo = (v & 0x0F) + 0xF6 + (hi >> 8);              // the carry the high digit's ADC left
    M[(word(0x0D) + M[0x11]) & 0x3FFF] = lo & 0xFF;
    M[0x11]++; M[0x12]++;
  } while (M[0x11] !== 0x06);
  return { a: 0x06, y: 0x05, c: 1 };
};

// KEYBOARD or JOYSTICK by bit 7 of $A3 (show_controls, $362B).
P.show_controls = function () {
  let y = M[0xA3] & 0x80 ? 0x07 : 0x0F, a = 0;
  for (let x = 7; x >= 0; x--) { a = M[0x3266 + y]; M[0x0EBA + x] = a; y = (y - 1) & 0xFF; }
  return { a, x: 0xFF, y };
};

// RETURN newly pressed switches the controls (toggle_controls, $3640).
P.toggle_controls = function () {
  if (M[0xA5] & 0x02) return { a: 0x02 };
  if (!(M[0xA4] & 0x02)) return { a: 0x00 };
  M[0xA3] ^= 0x80;
  return P.show_controls();
};

// Left or right changes the starting level, 0 to 15 round (change_level, $3656).
P.change_level = function () {
  const d = P.next_direction().a;
  if (d === 0) return { a: 0, c: 1 };
  if (d === 0x01) {
    M[0xA7] = (M[0xA7] + 1) & 0xFF;
    if (M[0xA7] === 0) M[0xA7] = 0xFF;                     // INC's BNE falls into the DEC
  } else M[0xA7] = (M[0xA7] - 1) & 0xFF;
  M[0xA7] &= 0x0F;
  return P.print_level({ a: 0xCA, x: 0x0E });
};

// The stick across on its first frame and every eight held: $09; else 0 (next_direction, $3675).
P.next_direction = function () {
  const a = M[0x09];
  if (a !== 0 && a === M[0xA6]) {
    M[0x17] = (M[0x17] - 1) & 0xFF;
    if (M[0x17] !== 0) return { a: 0x00 };
  }
  M[0x17] = 0x08;                                          // b_3679
  return { a, x: 0x08 };
};
};
})(typeof window !== 'undefined' ? window : globalThis);
