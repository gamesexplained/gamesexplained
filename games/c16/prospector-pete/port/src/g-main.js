// The main program: start, main_loop and the end of a level in it, start_level, the status line
// (print_level, print_men, print_bcd, print_sticks, print_score), swap_face, check_big_charge.
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).main = function (P) {
const M = P.M, io = P.io, POLL = P.POLL;

// The game's start ($1800, where the loader jumps), then main_loop for good. c is the carry the
// loader left (0 on the kit's machine, which starts with it clear).
P.start = function* (r = {}) {
  io.sei();
  io.write(0xFF00, 0xFF); io.write(0xFF01, 0xFF);
  for (let x = 0xFE; x > 0; x--) M[(0x02 + x) & 0xFF] = 0;  // zero page $03-$FF and $00
  io.write(0xFF03, io.read(0xFF1E));
  io.write(0xFF05, io.read(0xFF1D));
  io.write(0xFF19, 0);
  M[0xA7] = 0; M[0xA3] = 0; M[0xAA] = 0; M[0xAB] = 0; M[0xAC] = 0;
  io.write(0xFF0A, 0x02);
  io.write(0xFF12, 0x08);
  io.write(0xFF13, 0x11);
  const v = io.read(0xFF1D) ^ io.read(0xFF1E);
  M[0x7A] = (v + io.read(0xFF00) + (r.c || 0)) & 0xFF;
  P.build_figures();
  yield* P.main_loop();
};
P.program = function* () { yield* P.start(); };

// The game's loop ($184C): the title, a level built, then once a frame the main program's share
// of the game, until ESC, the last man, or the level's end.
P.main_loop = function* () {
  for (;;) {
    yield { cp: 0x184C }; yield* P.title();
    let title = false;
    while (!title) {                                       // b_184F
      yield { cp: 0x184F }; yield* P.start_level();
      for (;;) {                                           // b_1852
        yield { cp: 0x1852 };
        const f = P.irqByte(0x64);
        while (P.irqByte(0x64) === f) yield POLL;
        if (P.irqByte(0xBA) === 0) { title = true; break; } // esc_up: ESC held
        if (P.irqByte(0x7B) === 0) {                       // release_count ran out
          M[0x7B] = M[0x7C]; M[0x7E] = M[0x7D];
          if (M[0x6A] !== 0) { yield { cp: 0x186C }; P.release_creature(); }
        }
        yield { cp: 0x186F }; P.dynamite();
        yield { cp: 0x1872 }; yield* P.pete_touches();
        yield { cp: 0x1875 }; P.check_big_charge();
        M[0xB9] = (M[0xB9] - 1) & 0xFF;
        if (M[0xB9] === 0) { yield { cp: 0x187C }; P.swap_face(); }
        if (M[0x83] !== 0) {                               // pete_dead: a man less
          const d = P.sbcD(M[0xA9], 1, 1);
          M[0xA9] = d.a;
          if (d.a === 0x99) title = true;                  // below 00: back to the title
          break;
        }
        if (M[0xB5] !== 0) continue;                       // goodies left
        if (!(P.irqByte(0x0A) & 0x80)) continue;           // the stick not pushed up
        if (M[0x06] !== 0x2C || M[0x07] !== 0x04 || M[0x4A] !== 0) continue;
        yield* P.level_done();
        break;
      }
    }
  }
};

// main_loop from $18AA: the level is done. The jingle, 50 points and a tone for each stick left,
// the next level (up to 15) and 130 frames' wait.
P.level_done = function* () {
  M[0xA8] = 0;
  io.write(0xFF11, 0x3C); M[0xC5] = 0x3C; io.write(0xFF0E, 0x3C); io.write(0xFF0F, 0x3C);
  io.read(0xFF10);                                         // LDA $FF10, for nothing
  io.write(0xFF12, 0x0B);
  while (P.irqByte(0xC5) !== 0) yield POLL;                // the jingle ends (sound)
  let t = (P.irqByte(0x64) + 0x2D + 1) & 0xFF;             // the carry from CMP #$04 above
  while (P.irqByte(0x64) !== t) yield POLL;
  if (M[0x9F] !== 0) {
    M[0xAF] = 0; M[0xAE] = 0; M[0xAD] = 0x50;
    do {
      yield { cp: 0x18DF }; P.add_score();
      M[0x9F] = P.sbcD(M[0x9F], 1, 1).a;
      yield { cp: 0x18EB }; P.print_sticks();
      io.write(0xFF11, 0x48); M[0xBD] = 0x08; io.write(0xFF10, 0x03); io.write(0xFF0F, 0xE5);
      while (P.irqByte(0xBD) !== 0) yield POLL;
      t = (P.irqByte(0x64) + 2) & 0xFF;
      while (P.irqByte(0x64) !== t) yield POLL;
    } while (M[0x9F] !== 0);
  }
  let c = 1;
  if (M[0xA7] !== 0x0F) { M[0xA7]++; c = 0; }
  t = (P.irqByte(0x64) + 0x82 + c) & 0xFF;
  while (P.irqByte(0x64) !== t) yield POLL;
};

// From level 6, now and then: the face in place of a large goodie, or the goodie back and another
// chosen (swap_face, $1925).
P.swap_face = function () {
  if (M[0xA7] < 0x05) return;
  M[0x0E] = M[0xB8]; M[0x0D] = M[0xB7];
  M[0xB9] = (((io.read(0xFF00) + io.read(0xFF1D) + 1) & 0x0F) | 0x20);
  M[0x1B] = 0;
  const p = M[0x0D] | M[0x0E] << 8;
  const ch = M[p];
  let c = 0;
  if (ch >= 0x70) {
    if (ch === 0x94) P.put_square({ a: M[0xB6] });       // the face there: the goodie back
    else { M[0x1B]++; M[0xB6] = ch; P.put_square({ a: 0x94 }); }
    if (M[0x1B] !== 0) return;
  }
  let a;
  for (;;) {                                               // b_195E
    a = ((io.read(0xFF00) + io.read(0xFF1E) + c) & 0x0F);
    if (a < M[0xB4]) break;
    c = 1;
  }
  const x = a << 1;
  M[0xB7] = M[0x0316 + x]; M[0xB8] = M[0x0317 + x];
};

// The flood starts once the big charge has gone off (check_big_charge, $1977).
P.check_big_charge = function () {
  const v = M[0x3F78];
  if (v !== 0xA3 && v !== 0x00) return;
  M[0x3FD2] = 0x39; M[0x3F78] = 0x5C; M[0x6A] = 0x01;
};

// Builds the level in $A7 and starts it (start_level, $1C54).
P.start_level = function* () {
  io.sei();
  io.write(0xFF06, 0x0B);
  M[0x0314] = 0x91; M[0x0315] = 0x19;
  M[0x03] = 0x97; M[0x02] = 0x40;
  for (const a of [0x08, 0x5B, 0x64, 0x65, 0x6A, 0x6B, 0x6D, 0x6C, 0x83, 0xA0, 0x04, 0xA8, 0xAF, 0xB0, 0xBD, 0xBE, 0xBF,
    0xC0, 0xC1, 0xC3, 0xC5]) M[a] = 0;
  io.write(0xFF11, 0); io.write(0xFF0B, 0);
  M[0x9E] = 0x03;
  for (let x = 4; x >= 0; x--) { M[0x22 + x] = 0; M[0x27 + x] = 0; M[0x4A + x] = 0; }
  M[0xC4] = 0x40;
  const L = M[0xA7];
  M[0x9F] = M[0x1EC9 + L];
  M[0x7D] = 0x32; M[0x7E] = 0x32;
  M[0x7C] = M[0x1ED9 + L];
  M[0x7F] = M[0x80] = M[0x1EE9 + L];
  M[0x81] = M[0x82] = M[0xA1] = M[0x1EF9 + L];
  M[0xA2] = M[0x1F09 + L];
  M[0x9D] = M[0x1F19 + L];
  M[0xB1] = M[0x1F29 + L]; M[0xB2] = M[0x1F39 + L]; M[0xB3] = M[0x1F49 + L]; M[0xB4] = M[0x1F59 + L];
  let s = M[0xB4] + M[0xB3], c = s >> 8;
  s = (s & 0xFF) + M[0xB2] + c; c = s >> 8;
  s = (s & 0xFF) + M[0xB1] + c;
  M[0xB5] = s & 0xFF;
  M[0xBC] = M[0x1F69 + L];
  M[0xBB] = L >= 0x09 ? 1 : 2;
  M[0x59] = 0x03;
  M[0x07] = 0x04; M[0x06] = 0x2C;
  M[0x2C] = M[0x2E] = 0x7E; M[0x2D] = M[0x2F] = 0x39;
  M[0x22] = 0x01;
  for (let x = 0; x < 256; x++) {
    M[0x0800 + x] = M[0x0900 + x] = M[0x0A00 + x] = M[0x0B00 + x] = 0x7E;
    M[0x0200 + x] = 0; M[0x0700 + x] = 0;
  }
  M[0x0200] = M[0x0700] = 0x78; M[0x0201] = M[0x0701] = 0x3F;
  M[0x0202] = 0x15; M[0x57] = 0x15;
  M[0x0702] = M[0x1F79 + L];
  for (let x = 0x27; x >= 0; x--) {
    M[0x0F98 + x] = 0; M[0x0BC0 + x] = 0x77; M[0x0FC0 + x] = M[0x1E41 + x];
    M[0x0800 + x] = M[0x0828 + x] = M[0x0850 + x] = 0x79;
  }
  P.print_level({ a: 0xE6, x: 0x0F });
  P.print_men(); P.print_sticks(); P.print_score();
  for (let x = 0x0F; x >= 0; x--) M[0x1368 + x] = M[0x1500 + x];
  // rows 3 to 22 of the map, earth two by two
  M[0x0D] = 0xF9; M[0x0E] = 0x38; M[0x0F] = 0x0A;
  do {
    for (let x = 0x2C; x > 0; x--) {
      c = P.put_square({ a: 0x01 }).c;
      s = M[0x0D] + 0x02 + c; M[0x0D] = s & 0xFF; c = s >> 8;
      s = M[0x0E] + c; M[0x0E] = s & 0xFF; c = s >> 8;
    }
    s = M[0x0D] + 0x5C; M[0x0D] = s & 0xFF; c = s >> 8;
    M[0x0E] = (M[0x0E] + c) & 0xFF;
    M[0x0F] = (M[0x0F] - 1) & 0xFF;
  } while (M[0x0F] !== 0);
  P.place_goodies({ c: 0 });
  // the shaft at column 44, the walls down both sides and the floor
  M[0x0D] = 0xF8; M[0x0E] = 0x38;
  for (let x = 0x14; x > 0; x--) {
    const p = M[0x0D] | M[0x0E] << 8, w = (x & 3) + 0x35;
    M[(p + 0x2C) & 0xFFFF] = 0;
    M[p] = w; M[(p + 0x59) & 0xFFFF] = w;
    s = M[0x0D] + 0x5A; M[0x0D] = s & 0xFF;
    M[0x0E] = (M[0x0E] + (s >> 8)) & 0xFF;
  }
  for (let x = 0x59; x >= 0; x--) M[0x3FA6 + x] = (x & 3) + 0x35;
  io.write(0xFF09, io.read(0xFF09));
  io.cli();
  yield { cycles: 986129 };                                // three times 65,536 turns of DEY, DEX
  io.write(0xFF06, 0x1B);
  M[0x7B] = 0x02; M[0x7E] = 0x32;
  while (P.irqByte(0x7B) !== 0) yield POLL;                // two of the interrupt's seconds
  M[0x7B] = M[0xA8] = M[0x7C];
  M[0x3F78] = 0x6F; M[0xC3] = 0x6F;
};

// The level, $A7 + 1, as two digits at the screen address A (low), X (high) (print_level, $1E69).
P.print_level = function (r) {
  M[0x0D] = r.a; M[0x0E] = r.x;
  const p = r.a | r.x << 8;
  let x = M[0xA7] + 1, a = 0xF6;
  if (x >= 10) { x -= 10; a = 0xF7; }
  M[p & 0x3FFF] = a; M[(p + 1) & 0x3FFF] = (x + 0xF6) & 0xFF;
  return { a: (x + 0xF6) & 0xFF, x, y: 1, c: (x + 0xF6) >> 8 };
};
// Men left on the status line (print_men, $1E88); b_1E8E takes the address in X, Y.
P.print_men = function () { return P.b_1E8E({ a: M[0xA9], x: 0xD2, y: 0x0F }); };
P.b_1E8E = function (r) { M[0x0D] = r.x; M[0x0E] = r.y; return Object.assign(P.print_bcd(r), { x: r.x }); };
// The byte in A as two decimal digits at ($0D) (print_bcd, $1E92).
P.print_bcd = function (r) {
  const p = M[0x0D] | M[0x0E] << 8, hi = (r.a >> 4) + 0xF6, lo = (r.a & 0x0F) + 0xF6 + (hi >> 8);
  M[p & 0x3FFF] = hi & 0xFF;
  M[(p + 1) & 0x3FFF] = lo & 0xFF;
  return { a: lo & 0xFF, y: 1, c: lo >> 8 };
};
P.print_sticks = function () { return P.b_1E8E({ a: M[0x9F], x: 0xDD, y: 0x0F }); };
P.print_score = function () {
  P.b_1E8E({ a: M[0xAC], x: 0xC6, y: 0x0F });
  M[0x0D] = (M[0x0D] + 2) & 0xFF; P.print_bcd({ a: M[0xAB] });
  M[0x0D] = (M[0x0D] + 2) & 0xFF; return P.print_bcd({ a: M[0xAA] });
};
};
})(typeof window !== 'undefined' ? window : globalThis);
