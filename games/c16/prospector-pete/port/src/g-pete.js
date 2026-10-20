// Pete: his moves (move_pete, can_enter, check_ring, let_water_in), the controls (read_controls,
// read_key_row), what he touches and scores (pete_touches, count_goodie, clear_goodie and its
// helpers, score_item, add_score, kill_bonus) and how he dies (check_death, creature_touch,
// to_quarters, die_where_he_was, death).
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).pete = function (P) {
const M = P.M, io = P.io, POLL = P.POLL;
const ptr = a => (M[a] | M[a + 1] << 8);

// Pete's step, from irq_play (move_pete, $1F89): a move under way goes on (four steps, the cell he
// enters eaten a stage at a time), else the controls start one if can_enter allows.
P.move_pete = function () {
  if (M[0x4A] !== 0) {
    const q = ptr(0x2C) & 0x3FFF;
    if (M[0x27] !== 0x03) {
      M[0x27] = (M[0x27] + 1) & 0xFF;
      let a = M[q];
      if (a === 0 || a >= 0x35) return;
      const d = M[0x4A];
      if (a >= 0x05) a += 4;                               // the next stage, in any direction
      else if (d < 0x03) a += d === 0x02 ? 0x10 : 0x04;    // earth: the first stage down, or up
      else a += d === 0x03 ? 0x1C : 0x28;                  // left, or right
      M[q] = a & 0xFF;
      return;
    }
    if (M[q] < 0x35) M[q] = 0;                             // b_1FCF: the last step, tunnel
    P.let_water_in();
    M[0x4A] = 0; M[0x2E] = M[0x2C]; M[0x2F] = M[0x2D];
  }
  M[0x65] = 0;                                             // b_1FE8
  if ((M[0x09] | M[0x0A]) === 0) return;
  let s;
  if (M[0x09] !== 0) {
    if (M[0x09] & 0x80) {                                  // left
      if (M[0x06] !== 0x01 && !P.can_enter({ a: 0x5C, x: 0x03 }).c) {
        M[0x06] = (M[0x06] - 1) & 0xFF; M[0x4A] = 0x03;
        const x = M[0x2F] = M[0x2D]; M[0x2E] = M[0x2C];
        s = M[0x2C] - 1; M[0x2C] = s & 0xFF; M[0x2D] = (x - (s < 0 ? 1 : 0)) & 0xFF;
        M[0x27] = 0; return;
      }
    } else if (M[0x06] !== 0x58 && !P.can_enter({ a: 0x5A, x: 0x04 }).c) {   // b_2024: right
      M[0x06] = (M[0x06] + 1) & 0xFF; M[0x4A] = 0x04;
      const x = M[0x2F] = M[0x2D]; M[0x2E] = M[0x2C];
      s = M[0x2C] + 1; M[0x2C] = s & 0xFF; M[0x2D] = (x + (s >> 8)) & 0xFF;
      if (M[0x2D] !== 0) { M[0x27] = 0; return; }          // BNE: always, the map is above $3700
    }
  }
  if (M[0x0A] === 0) return;                               // b_204C
  if (M[0x0A] & 0x80) {                                    // up
    if (M[0x07] === 0x04) return;
    if (P.can_enter({ a: 0xB5, x: 0x01 }).c) return;
    M[0x07] = (M[0x07] - 1) & 0xFF; M[0x4A] = 0x01;
    const x = M[0x2F] = M[0x2D]; M[0x2E] = M[0x2C];
    s = M[0x2C] - 0x5A; M[0x2C] = s & 0xFF; M[0x2D] = (x - (s < 0 ? 1 : 0)) & 0xFF;
  } else {                                                 // b_207D: down
    if (M[0x07] === 0x15) return;
    if (P.can_enter({ a: 0x01, x: 0x02 }).c) return;
    M[0x07] = (M[0x07] + 1) & 0xFF; M[0x4A] = 0x02;
    const x = M[0x2F] = M[0x2D]; M[0x2E] = M[0x2C];
    s = M[0x2C] + 0x5A; M[0x2C] = s & 0xFF; M[0x2D] = (x + (s >> 8)) & 0xFF;
  }
  M[0x27] = 0;
};

// The joystick in port 2, or the keys A, S, P, L and SPACE with bit 7 of $A3 set, into $09-$0B
// (read_controls, $20A7).
P.read_controls = function () {
  M[0xA6] = M[0x09];
  M[0x09] = 0; M[0x0A] = 0;
  M[0x0C] = M[0x0B];
  if (!(M[0xA3] & 0x80)) {
    io.write(0xFD30, 0xFF);
    io.write(0xFF08, 0xFD);
    const v = io.read(0xFF08);
    if (!(v & 0x01)) M[0x0A] = (M[0x0A] - 1) & 0xFF;
    if (!(v & 0x02)) M[0x0A] = (M[0x0A] + 1) & 0xFF;
    if (!(v & 0x04)) M[0x09] = (M[0x09] - 1) & 0xFF;
    if (!(v & 0x08)) M[0x09] = (M[0x09] + 1) & 0xFF;
    M[0x0B] = ((v >> 4) ^ 0x08) & 0x08;
    return { a: M[0x0B], x: 0xFF };
  }
  let v = P.read_key_row({ a: 0xDF }).a;                  // b_20E0: P and L
  if (!(v & M[0x2124])) M[0x0A] = (M[0x0A] - 1) & 0xFF;
  if (!(v & M[0x2125])) M[0x0A] = (M[0x0A] + 1) & 0xFF;
  v = P.read_key_row({ a: 0xFD }).a;                       // A and S
  if (!(v & M[0x2125])) M[0x09] = (M[0x09] - 1) & 0xFF;
  if (!(v & M[0x2127])) M[0x09] = (M[0x09] + 1) & 0xFF;
  v = P.read_key_row({ a: 0x7F }).a;                       // SPACE
  M[0x0B] = v & M[0x2126] ? 0x00 : 0x08;
  return { a: M[0x0B], x: 0x00 };
};
// One row of the keyboard, its select byte in A (read_key_row, $211A).
P.read_key_row = function (r) {
  io.write(0xFD30, r.a);
  io.write(0xFF08, r.a);
  return { a: io.read(0xFF08) };
};

// The eight cells round Pete's cell less A, 0 for open and 1 for not into $4F-$56; carry set when
// a corner and its two sides are all open (check_ring, $2128).
P.check_ring = function (r) {
  M[0x60] = r.a;
  let s = M[0x2C] - r.a; M[0x5E] = s & 0xFF;
  s = M[0x2D] - (s < 0 ? 1 : 0); M[0x5F] = s & 0xFF;
  const p = ptr(0x5E);
  for (let x = 7; x >= 0; x--) {
    const v = M[(p + M[0x2184 + x]) & 0x3FFF];
    M[0x4F + x] = v === 0 || v === 0xA2 || v === 0xA3 || v === 0x6F || (v >= 0x5C && v < 0x6D) ? 0 : 1;
  }
  let a = M[0x4F] + M[0x50] + M[0x56];
  if (a !== 0) { a = M[0x50] + M[0x51] + M[0x52]; }
  if (a !== 0) { a = M[0x52] + M[0x53] + M[0x54]; }
  if (a !== 0) { a = M[0x54] + M[0x55] + M[0x56]; }
  return { a, x: 0xFF, y: 0, c: a === 0 ? 1 : 0 };
};

// Whether Pete can step into the cell in the direction X, A centring check_ring's ring on it:
// carry clear to go; set, with what stopped him in $65 and its address in $66/$67 (can_enter, $218C).
P.can_enter = function (r) {
  M[0x69] = r.x;
  M[0x68] = 0;
  const c = P.check_ring({ a: r.a }).c;
  M[0x68] = c;
  const q = (ptr(0x5E) + 0x5B) & 0x3FFF, v = M[q];
  if (v >= 0x05 && v !== 0x6F && v !== 0xA2) {
    if (v !== 0xA3) {                                      // b_21B4: in his way
      M[0x65] = v;
      const s = M[0x5E] + 0x5B; M[0x66] = s & 0xFF;
      M[0x67] = (M[0x5F] + (s >> 8)) & 0xFF;
      return { a: M[0x67], c: 1 };
    }
    M[q] = 0;                                              // debris: cleared
  }
  M[0x68] = 0;                                             // b_219F
  return { c };
};

// Water standing beside the cell Pete has dug out runs on into it (let_water_in, $21C5).
P.let_water_in = function () {
  let s = M[0x2C] - 0x5A; M[0x5E] = s & 0xFF;
  s = M[0x2D] - (s < 0 ? 1 : 0); M[0x5F] = s & 0xFF;
  const p = ptr(0x5E);
  let x = M[0x07], y, a;
  if (M[p & 0x3FFF] === 0x6C) { y = 0x00; a = 0x63; x = (x - 1) & 0xFF; }
  else if (M[(p + 0x59) & 0x3FFF] === 0x6C) { y = 0x59; a = 0x6B; }
  else if (M[(p + 0x5B) & 0x3FFF] === 0x6C) { y = 0x5B; a = 0x67; }
  else if (M[(p + 0xB4) & 0x3FFF] === 0x6C) { y = 0xB4; a = 0x5F; x = (x + 1) & 0xFF; }
  else return;
  M[(p + y) & 0x3FFF] = a;                                 // b_21DF
  s = y + M[0x5E];
  if ((a & M[0x6B]) === 0) {
    M[0x6B] = (M[0x6B] + 1) & 0xFF;
    M[0x5A] = x; M[0x5D] = 0;
    M[0x70] = s & 0xFF; M[0x71] = (M[0x5F] + (s >> 8)) & 0xFF;
    P.add_water();
    M[0x6B] = (M[0x6B] - 1) & 0xFF;
    return;
  }
  M[0x86] = x;                                             // b_21FF: for irq_play to add
  M[0x87] = s & 0xFF;
  M[0x88] = M[0x89] = (M[0x5F] + (s >> 8)) & 0xFF;
};

// What Pete touched, every frame from main_loop (pete_touches, $2DF8).
P.pete_touches = function* () {
  P.kill_bonus();
  const a = M[0x65];
  if (a !== 0) {
    if (a >= 0x5C && a < 0x6D) { yield* P.die_where_he_was(); return; }   // water
    if (a >= 0x70 && a < 0xA0) {                           // a goodie
      P.count_goodie({ a });
      M[0x65] = 0;
      P.score_item({ a });
      if (M[0x83] !== 0) { yield* P.die_where_he_was(); return; }          // the face
      io.write(0xFF11, 0x10); M[0xBE] = 0x80; io.write(0xFF12, 0x09); io.write(0xFF0E, 0x38);
    }
  }
  yield* P.check_death();
};

// The goodie in A counted and cleared, unless it is the face; the ladder when none is left
// (count_goodie, $28D9).
P.count_goodie = function (r) {
  if (r.a < 0x98 && r.a >= 0x94) return;
  P.clear_goodie();
  M[0xB5] = (M[0xB5] - 1) & 0xFF;
  if (M[0xB5] === 0) M[0x3924] = 0x50;
};

// The goodie Pete bumped into ($65, at $66/$67) back to earth, the tiling's character in each of
// its cells (clear_goodie, $28EE).
P.clear_goodie = function () {
  M[0x0D] = M[0x66]; M[0x0E] = M[0x67];
  let x = M[0x06], y = M[0x07];
  const d = M[0x69];
  if (d === 0x01) y = (y - 1) & 0xFF;
  if (d === 0x02) y = (y + 1) & 0xFF;
  if (d === 0x03) x = (x - 1) & 0xFF;
  if (d === 0x04) x = (x + 1) & 0xFF;
  const k = M[0x65];
  if (k >= 0x74) {
    if (k < 0x7C) ({ x, y } = P.goodie_left({ x, y }));
    else if (k < 0x84) ({ x, y } = P.goodie_up({ x, y }));
    else { ({ x, y } = P.goodie_left({ x, y })); ({ x, y } = P.goodie_up_square({ x, y })); }
  }
  P.earth_at({ x, y });                                    // b_2930
  const p = ptr(0x0D), f = M[0x0F];
  M[p & 0x3FFF] = f;
  if (k < 0x74) return;
  if (k < 0x7C) { M[(p + 1) & 0x3FFF] = P.earth_beside_of({ a: f }).a; return; }
  if (k < 0x84) { M[(p + 0x5A) & 0x3FFF] = M[0x2977 + f]; return; }
  let a = P.earth_beside_of({ a: f }).a; M[(p + 1) & 0x3FFF] = a;   // b_295A
  a = P.earth_diagonal_of({ a }).a; M[(p + 0x5A) & 0x3FFF] = a;
  a = P.earth_beside_of({ a }).a; M[(p + 0x5B) & 0x3FFF] = a;
};
P.earth_beside_of = function (r) { return { a: M[0x296F + r.a], x: r.a }; };
P.earth_diagonal_of = function (r) { return { a: M[0x2973 + r.a], x: r.a }; };
// The pointer at $0D one cell left, and the column in X, when it is on a goodie's right half
// (goodie_left, $2986); one row up, and the row in Y, on a tall goodie's lower half (goodie_up)
// or a square goodie's lower row (goodie_up_square).
P.goodie_left = function (r) {
  let x = r.x;
  if (M[ptr(0x0D) & 0x3FFF] & 1) {
    const s = M[0x0D] - 1; M[0x0D] = s & 0xFF;
    M[0x0E] = (M[0x0E] - (s < 0 ? 1 : 0)) & 0xFF;
    x = (x - 1) & 0xFF;
  }
  M[0x11] = r.y;
  return { x, y: r.y };
};
function up() {
  const s = M[0x0D] - 0x5A; M[0x0D] = s & 0xFF;
  M[0x0E] = (M[0x0E] - (s < 0 ? 1 : 0)) & 0xFF;
  M[0x11] = (M[0x11] - 1) & 0xFF;
}
P.goodie_up = function (r) {
  M[0x11] = r.y;
  if (M[ptr(0x0D) & 0x3FFF] & 1) up();
  return { x: r.x, y: M[0x11] };
};
P.goodie_up_square = function (r) {
  M[0x11] = r.y;
  if (M[ptr(0x0D) & 0x3FFF] & 2) up();
  return { x: r.x, y: M[0x11] };
};
// The earth character for column X, row Y, into $0F (earth_at, $29C5).
P.earth_at = function (r) {
  M[0x0F] = 1;
  if (!(r.x & 1)) M[0x0F]++;
  if (!(r.y & 1)) M[0x0F] = (M[0x0F] + 2) & 0xFF;
  return { x: r.x, y: r.y };
};

// Scores the goodie in A (score_item, $2E3B).
P.score_item = function (r) {
  let a = (r.a - 0x70) & 0xFF;
  if (a >= 0x04) {
    a &= 0x3E;
    a = a < 0x0E ? (a >> 1) + 2 : (a >> 2) + 7;
  }
  if (a === 0x07) { M[0xAF] = a; return; }                 // the x2
  if (a === 0x10) { M[0x83] = (M[0x83] + 1) & 0xFF; return; }   // the face
  if (a === 0x11) {                                        // the question mark
    M[0xAE] = io.read(0xFF00) & 0x01;
    let v;
    do v = (io.read(0xFF02) ^ io.read(0xFF1E)) & 0xF0; while (v >= 0xA0);
    M[0xAD] = v;
  } else {
    const x = a << 1 & 0xFF;
    M[0xAD] = M[0x2E8A + x]; M[0xAE] = M[0x2E8B + x];
  }
  P.add_score();
};

// The points at $AD and $AE (binary-coded decimal), doubled after the x2, onto the score; a man
// more for each 10,000 (add_score, $2EB0).
P.add_score = function () {
  let d;
  if (M[0xAF] !== 0) {
    d = P.adcD(M[0xAD], M[0xAD], 0); M[0xAD] = d.a;
    d = P.adcD(M[0xAE], M[0xAE], d.c); M[0xAE] = d.a;
  }
  const top = M[0xAC];
  d = P.adcD(M[0xAD], M[0xAA], 0); M[0xAA] = d.a;
  d = P.adcD(M[0xAE], M[0xAB], d.c); M[0xAB] = d.a;
  d = P.adcD(0, M[0xAC], d.c); M[0xAC] = d.a;
  if (top !== M[0xAC]) {
    M[0xA9] = P.adcD(M[0xA9], 1, 0).a;
    P.print_men();
  }
  P.print_score();
};

// 150 points for the creatures the dynamite killed (kill_bonus, $2EED).
P.kill_bonus = function () {
  if (M[0xB0] === 0) return;
  M[0xB0] = 0; M[0xAE] = 0x01; M[0xAD] = 0x50;
  P.add_score();
};

// Whether Pete dies now: water or an explosion where he is, or water behind him early in a move,
// or a creature beside him (check_death, $29DA).
P.check_death = function* () {
  const q = ptr(0x2C) & 0x3FFF;
  if (M[0x4A] !== 0 && M[0x27] < 0x02) {                   // b_29F4: early in a move
    const b = M[ptr(0x2E) & 0x3FFF];
    if (b >= 0x5C && b < 0x6D) {                           // water behind him
      M[0x83] = (M[0x83] + 1) & 0xFF;
      const a = M[q];
      if (a < 0x35 && a >= 0x05) M[q] = ((a - 1) & 0x03) + 1;   // the earth he was digging put back
      yield* P.die_where_he_was();
      return;
    }
  } else {
    const a = M[q];                                        // b_29E0
    if (a >= 0x5C && (a < 0x6D || a === 0xA2)) { yield* P.death(); return; }
  }
  if (P.creature_touch().c) yield* P.death();              // b_29EE
};
P.die_where_he_was = function* () {
  M[0x2C] = M[0x2E]; M[0x2D] = M[0x2F];
  yield* P.death();
};
// Pete dies and sinks, six frames a row, then 120 frames' wait (death, $2A20).
P.death = function* () {
  M[0x83] = (M[0x83] + 1) & 0xFF;
  M[0x4A] = 0; M[0x27] = 0; M[0xBF] = 0; M[0xBE] = 0;
  io.write(0xFF11, 0x40);
  M[0xC1] = 0x01; M[0xC2] = 0x07;
  io.write(0xFF10, 0x03); io.write(0xFF0F, 0xE0);
  for (;;) {                                               // b_2A43
    let t = (P.irqByte(0x64) + 6) & 0xFF;
    while (P.irqByte(0x64) !== t) yield POLL;
    if (M[0x27] === 0x06) {                                // b_2A70
      t = (P.irqByte(0x64) + 0x78) & 0xFF;
      while (P.irqByte(0x64) !== t) yield POLL;
      return;
    }
    M[0x27] = (M[0x27] + 1) & 0xFF;
    for (let y = 6; y >= 0; y--) { M[0x1369 + y] = M[0x1368 + y]; M[0x1371 + y] = M[0x1370 + y]; }
    M[0x1370] = 0xFF; M[0x1368] = 0x00;
  }
};

// Whether a creature is less than a cell from Pete, in quarter cells; if so he dies there, the
// cell he was digging put back or dug out (creature_touch, $2A7A). Carry set when one is.
P.creature_touch = function () {
  M[0x15] = 0x40; P.to_quarters({ a: M[0x06], x: 0x1B, y: M[0x4A] });
  M[0x15] = 0xC0; P.to_quarters({ a: M[0x07], x: 0x1D, y: M[0x4A] });
  M[0x1A] = 0x03;
  do {                                                     // j_2A98
    const n = M[0x1A];
    if (M[(0x23 + n) & 0xFF] !== 0) {
      M[0x15] = 0x00; P.to_quarters({ a: M[(0x8A + n) & 0xFF], x: 0x0D, y: M[(0x4B + n) & 0xFF] });
      M[0x15] = 0x80; P.to_quarters({ a: M[(0x8E + n) & 0xFF], x: 0x0F, y: M[(0x4B + n) & 0xFF] });
      let s = M[0x0D] - M[0x1B]; M[0x11] = s & 0xFF;
      s = M[0x0E] - M[0x1C] - (s < 0 ? 1 : 0); M[0x12] = s & 0xFF;
      let a = M[0x12];
      if (a & 0x80) {
        s = 0 - M[0x11]; M[0x11] = s & 0xFF;
        s = 0 - M[0x12] - (s < 0 ? 1 : 0); M[0x12] = a = s & 0xFF;
      }
      if (a === 0 && M[0x11] < 0x04) {
        let dy = M[0x1D] - M[0x0F];
        if (dy < 0) dy = ((dy & 0xFF) ^ 0xFF) + 1 & 0xFF;
        if (dy < 0x04) {
          M[0x83] = (M[0x83] + 1) & 0xFF;
          if (M[0x4A] !== 0) {
            const q = ptr(0x2C) & 0x3FFF, v = M[q];
            if (M[0x27] < 0x02) { if (v < 0x35 && v >= 0x05) M[q] = ((v - 1) & 0x03) + 1; }
            else if (v < 0x35) M[q] = 0;                   // b_2B14
            if (M[0x27] < 0x02) { M[0x2C] = M[0x2E]; M[0x2D] = M[0x2F]; }   // b_2B1E
          }
          return { c: 1 };
        }
      }
    }
    M[0x1A] = (M[0x1A] - 1) & 0xFF;                        // j_2B2E
  } while (!(M[0x1A] & 0x80));
  return { c: 0 };
};

// A figure's column or row (A) in quarter cells into $00 + X and $01 + X, moved by the steps still
// to go of its move in direction Y; $15's bit 7 picks rows, bit 6 Pete's step (to_quarters, $2B37).
P.to_quarters = function (r) {
  const x = r.x, y = r.y;
  let v = r.a << 2;
  M[x] = v & 0xFF; M[(x + 1) & 0xFF] = v >> 8 & 0xFF;
  if (y === 0) return;
  M[0x19] = y;
  let a = 0;
  if (M[0x15] & 0x40) a = (4 - M[0x27]) & 0xFF;
  if (a === 0) a = (4 - M[0x28 + M[0x1A]]) & 0xFF;        // b_2B57 (also when Pete's step is 4)
  M[0x17] = a;
  const add = M[0x15] & 0x80 ? y === 0x01 : y === 0x03, sub = M[0x15] & 0x80 ? y === 0x02 : y === 0x04;
  if (add) {
    v = a + M[x]; M[x] = v & 0xFF;
    M[(x + 1) & 0xFF] = (M[(x + 1) & 0xFF] + (v >> 8)) & 0xFF;
  } else if (sub) {
    v = M[x] - M[0x17]; M[x] = v & 0xFF;
    M[(x + 1) & 0xFF] = (M[(x + 1) & 0xFF] - (v < 0 ? 1 : 0)) & 0xFF;
  }
};
};
})(typeof window !== 'undefined' ? window : globalThis);
