// The text screens ($2FCE-$3AD8, with the printing helpers at $106B, $108A, $91A5-$9224 and
// $A1C7-$A1E3): the panel the menus, the results and the league tables are printed in, the box with
// the track's name under the view, the strings at $3407, $32AD and $31AA, the numbers and the race
// times, the drivers of a new league, the tables after a race, promotion and relegation at the end
// of a season, and the waits for the fire button between them.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.menus = P => {
  const M = P.M;
  const S = root.SCRPort.S;
  P.COST = P.COST || {};
  // one turn of the loops that wait for the fire button (JOYSTICK and the loop's own few
  // instructions), in cycles: the lockstep runs the game this far each turn
  P.COST.fireTurn = 750;
  // subtract with borrow in decimal mode, as the NMOS 6502 does it: { v, c }
  const sbcD = (a, b, c) => {
    let al = (a & 0x0F) - (b & 0x0F) + c - 1;
    if (al < 0) al = ((al - 6) & 0x0F) - 0x10;
    let t = (a & 0xF0) - (b & 0xF0) + al;
    if (t < 0) t -= 0x60;
    return { v: t & 255, c: a - b - (1 - c) >= 0 ? 1 : 0 };
  };

  // --- printing ---
  // PRINT_AT ($106B): the text cursor to column X, row Y (code $1F and the two)
  P.PRINT_AT = r => {
    const x = r.x & 255, y = r.y & 255;
    P.PRINT_CHAR({ a: 0x1F, x, y }); P.PRINT_CHAR({ a: x, x, y }); P.PRINT_CHAR({ a: y, x, y });
    return { a: y, x, y };
  };
  // PRINT_DIGIT ($108A): the digit A
  P.PRINT_DIGIT = r => { const a = ((r.a & 255) + 0x30) & 255; P.PRINT_CHAR({ a, x: r.x, y: r.y }); return { a, x: r.x, y: r.y }; };
  // SPACES_3 ($91A5), SPACES_2 ($91AA), SPACE ($91AF)
  const spaces = n => r => { for (let i = 0; i < n; i++) P.PRINT_CHAR({ a: 0x20, x: r.x, y: r.y }); return { a: 0x20, x: r.x, y: r.y }; };
  P.SPACES_3 = spaces(3); P.SPACES_2 = spaces(2); P.SPACE = spaces(1);
  // TO_BCD ($9215): A counted out in decimal (1 added A times; none gives 256, which is $56)
  P.TO_BCD = r => {
    let x = r.a & 255, s = { v: 0, c: 0 };
    M[0xCE] = r.x & 255;
    do { s = S.adcD(s.v, 1, 0); x = (x - 1) & 255; } while (x);
    return { a: s.v, x: M[0xCE], y: r.y, c: s.c };
  };
  // PRINT_STRING_E000 ($A1CB): string X of the table at $E000 (characters to $FF), or of the menus'
  // table at $31AA while players are being chosen ($31A0 bit 7)
  P.PRINT_STRING_E000 = r => {
    if (M[0x31A0] & 0x80) return P.PRINT_MENU_STRING(r);
    let x = r.x & 255;
    for (let a; (a = M[0xE000 + x]) !== 0xFF; x = (x + 1) & 255) P.PRINT_CHAR({ a, x, y: r.y });
    return { a: 0xFF, x, y: r.y, z: 1 };
  };
  // PRINT_MENU_STRING ($A1DC): string X of the table at $31AA
  P.PRINT_MENU_STRING = r => {
    let x = r.x & 255;
    for (let a; (a = M[0x31AA + x]) !== 0xFF; x = (x + 1) & 255) P.PRINT_CHAR({ a, x, y: r.y });
    return { a: 0xFF, x, y: r.y, z: 1 };
  };
  // PRINT_STRING ($3027): string X of the table at $3407
  P.PRINT_STRING = r => {
    let x = r.x & 255;
    for (let a; (a = M[0x3407 + x]) !== 0xFF; x = (x + 1) & 255) P.PRINT_CHAR({ a, x, y: r.y });
    return { a: 0xFF, x, y: r.y, z: 1 };
  };
  // PRINT_STRING_B ($32A5): string X of the table at $32AD
  P.PRINT_STRING_B = r => {
    let x = r.x & 255;
    for (let a; (a = M[0x32AD + x]) !== 0xFF; x = (x + 1) & 255) P.PRINT_CHAR({ a, x, y: r.y });
    return { a: 0xFF, x, y: r.y, z: 1 };
  };
  // NUMBER_2SP ($3339): two spaces, then NUMBER_SP
  P.NUMBER_2SP = r => { P.SPACES_2(r); return P.NUMBER_SP(r); };
  // NUMBER ($3341): A in decimal, one digit below 10, else two
  P.NUMBER = r => ((r.a & 255) < 10 ? P.PRINT_DIGIT(r) : P.PRINT_BCD(P.TO_BCD(r)));
  // NUMBER_SP ($3345): A in decimal in two places, a space before a single digit
  P.NUMBER_SP = r => {
    const a = r.a & 255;
    if (a >= 10) return P.PRINT_BCD(P.TO_BCD(r));
    P.SPACE(r);
    return P.PRINT_DIGIT({ a: a & 0x0F, x: r.x, y: r.y });
  };
  // PRINT_BCD ($3353): the two decimal digits of A
  P.PRINT_BCD = r => {
    const a = r.a & 255;
    P.PRINT_DIGIT({ a: a >> 4, x: r.x, y: r.y });
    return P.PRINT_DIGIT({ a: a & 0x0F, x: r.x, y: r.y });
  };
  // ADD_TIME ($3361): race time X added to race time Y, in decimal: hundredths at $8298, seconds
  // at $82B0 (sixty to the minute) and minutes at $8398
  P.ADD_TIME = r => {
    const x = r.x & 255, y = r.y & 255;
    let s = S.adcD(M[0x8298 + x], M[0x8298 + y], 0);
    M[0x8298 + y] = s.v;
    s = S.adcD(M[0x82B0 + x], M[0x82B0 + y], s.c);
    if (s.c || s.v >= 0x60) { s = { v: sbcD(s.v, 0x60, 1).v, c: 1 }; } else s.c = 0;
    M[0x82B0 + y] = s.v;
    s = S.adcD(M[0x8398 + x], M[0x8398 + y], s.c);
    M[0x8398 + y] = s.v;
    return { a: s.v, x, y, c: s.c };
  };
  // DRIVER_NAME ($388B): driver X's name, thirteen characters from $AE00 + 16 X
  P.DRIVER_NAME = r => nameAt(0xAE, 0x0D, r);
  // TRACK_NAME ($3892): track X's name, fifteen characters from $AF00 + 16 X
  P.TRACK_NAME = r => nameAt(0xAF, 0x0F, r);
  function nameAt(page, n, r) {
    const x = r.x & 255;
    M[0x14] = n;
    const lo = (x << 4) & 255;
    M[0x1E] = lo;
    // ASL x 4 leaves the carry of the last one (bit 4 of X), which the ADC #0 adds
    M[0x1F] = (page + ((x >> 4) & 1)) & 255;
    const b = M[0x1E] | M[0x1F] << 8;
    let y = 0;
    do { P.PRINT_CHAR({ a: M[(b + y) & 0xFFFF], x, y }); y = (y + 1) & 255; } while (y !== M[0x14]);
    return { a: M[(b + y - 1) & 0xFFFF], x, y, z: 1 };
  }
  // TEXT_ON_ROWS ($361F) and TEXT_HALF_DOWN ($3884): text printed on the character rows, or half a
  // row (four pixels) lower ($85D0, command $20)
  P.TEXT_ON_ROWS = r => { P.DISPATCH({ a: 0x20, x: 0, y: r.y }); return { a: 0x20, x: 0, y: r.y }; };
  P.TEXT_HALF_DOWN = r => { P.DISPATCH({ a: 0x20, x: 0x80, y: r.y }); return { a: 0x20, x: 0x80, y: r.y }; };

  // --- the colours of the text screen, its screen RAM at $7C00 ---
  // COLOUR_ROW ($38FA): $1E at row Y of the screen at $7C00 (40 bytes a row), Y set to X, the column
  P.COLOUR_ROW = r => {
    const x = r.x & 255, y0 = r.y & 255;
    M[0xC6] = x;
    M[0x1E] = y0;
    let a = (((y0 << 2) & 255) + y0) & 255;     // ASL ASL CLC ADC: five times Y, its carries lost
    a = (a << 1) & 255;
    let c = a >> 7; a = (a << 1) & 255;          // twenty times; the carry starts the high byte
    M[0x1E] = a;
    let hi = c;
    c = M[0x1E] >> 7; M[0x1E] = (M[0x1E] << 1) & 255;
    hi = ((hi << 1) | c) & 255;
    M[0x1F] = (hi + 0x7C) & 255;
    return { a: M[0x1F], x, y: x };
  };
  // COLOUR_RUNS ($3916): A rows of runs from the table at $3944 + X (a count, then the colour, the
  // runs back to back, across pages) from $1E + Y
  P.COLOUR_RUNS = r => {
    let x = r.x & 255, y = r.y & 255, a = 0;
    M[0x15] = r.a & 255;
    do {
      M[0x14] = M[0x3944 + x]; x = (x + 1) & 255;
      a = M[0x3944 + x]; x = (x + 1) & 255;
      do {
        M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF] = a;
        y = (y + 1) & 255;
        if (!y) M[0x1F] = (M[0x1F] + 1) & 255;
        M[0x14] = (M[0x14] - 1) & 255;
      } while (M[0x14]);
      M[0x15] = (M[0x15] - 1) & 255;
    } while (M[0x15]);
    return { a, x, y };
  };
  // COLOUR_COPY ($3932): the bytes from the table at $397A + X (a count, then the bytes) to $1E + Y
  P.COLOUR_COPY = r => {
    let x = r.x & 255, y = r.y & 255, a = 0;
    M[0x14] = M[0x397A + x]; x = (x + 1) & 255;
    do {
      a = M[0x397A + x];
      M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF] = a;
      y = (y + 1) & 255; x = (x + 1) & 255;
      M[0x14] = (M[0x14] - 1) & 255;
    } while (M[0x14]);
    return { a, x, y };
  };
  // PANEL_FRAME ($38C4): the colours of the panel the text is printed in, rows 8 to 25: its frame,
  // and its inside, the top eight rows in one colour and the rest in another
  P.PANEL_FRAME = r => {
    let q = P.COLOUR_ROW({ x: 0, y: 8 });
    M[0xA0] = 0x11;
    do {
      const x = M[0xA0] < 9 ? 0x0E : 0;
      q = P.COLOUR_COPY({ x, y: q.y });
      q = P.COLOUR_RUNS({ x: 8, a: 1, y: q.y });
      q = P.COLOUR_COPY({ x: 5, y: q.y });
      M[0xA0] = (M[0xA0] - 1) & 255;
    } while (M[0xA0]);
    q = P.COLOUR_ROW({ x: 4, y: 8 });
    return P.COLOUR_RUNS({ x: 0x10, a: 1, y: q.y });
  };
  // PANEL_ROW ($3848): row Y of the panel lit (the colours at $3944 + $0E)
  P.PANEL_ROW = r => { const q = P.COLOUR_ROW({ x: 4, y: r.y }); return P.COLOUR_RUNS({ x: 0x0E, a: 1, y: q.y }); };

  // --- lines on the text screen's bitmap at $4000 ---
  // BITMAP_BYTE ($39D1): $1E at the byte of multicolour column X (from $40, 4 a byte) of row Y,
  // less Y, from the row tables at $A500 and $A600; a page less left of $40 and more from $C0
  P.BITMAP_BYTE = r => {
    const x = r.x & 255, y = r.y & 255;
    const t = (((x - 0x40) & 0x7C) << 1) + M[0xA500 + y];
    M[0x1E] = t & 255;
    const a = (M[0xA600 + y] + (t >> 8)) & 255;
    let h = a;
    if (x < 0x40) h = (h - 1) & 255;
    if (x >= 0xC0) h = (h + 1) & 255;
    M[0x1F] = h;
    return { a, x, y, c: x >= 0xC0 ? 1 : 0 };
  };
  const at = y => ((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF;
  // HLINE_SCREEN ($3A3C): A bytes of $AA across row Y from column X; HLINE ($3A4F) the same in
  // $FF; HLINE_TOP ($3A4B) $1C bytes from column $40; HLINE_UNDER ($3A42) under panel row $74
  P.HLINE_SCREEN = r => hline(r.x, r.y, r.a, 0xAA);
  P.HLINE = r => hline(r.x, r.y, r.a, 0xFF);
  P.HLINE_TOP = r => hline(0x40, r.y, 0x1C, 0xFF);
  P.HLINE_UNDER = r => hline(0x40, ((M[0x74] << 3) + 0x2F) & 255, 0x1C, 0xFF);
  function hline(x, y, n, v) {
    x &= 255; y &= 255;
    M[0x14] = n & 255; M[0x16] = v;
    do {
      P.BITMAP_BYTE({ x, y });
      M[at(y)] = M[0x16];
      x = (x + 4) & 255;
      M[0x14] = (M[0x14] - 1) & 255;
    } while (M[0x14]);
    return { a: x, x, y };
  }
  // VLINE ($3A66): $15's bits set in A rows up from row Y, at column X
  P.VLINE = r => {
    const x = r.x & 255;
    let y = r.y & 255, a = 0;
    M[0x14] = r.a & 255;
    do {
      P.BITMAP_BYTE({ x, y });
      a = M[at(y)] | M[0x15];
      M[at(y)] = a;
      y = (y - 1) & 255;
      M[0x14] = (M[0x14] - 1) & 255;
    } while (M[0x14]);
    return { a, x, y };
  };
  // WOOD_GRAIN ($398D): at column X, eight passes, one a bit of $17 (1, 2, 4 ... $80): from row $F7 up
  // to $70, runs of 4 to 11 rows at random, each either $18's bits set or $17's and $18's set and
  // $19's kept
  P.WOOD_GRAIN = r => {
    const x = r.x & 255;
    let y = 0;
    M[0x17] = 1;
    do {
      y = 0xF7;
      run: for (;;) {
        let a = P.RANDOM({ x, y }).a;
        const c = a & 1; a >>= 1;
        M[0x16] = (c << 7) | (M[0x16] >> 1);
        M[0x14] = (a & 7) + 4;
        P.BITMAP_BYTE({ x, y });
        for (;;) {
          if (y < 0x70) break run;
          M[0x14] = (M[0x14] - 1) & 255;
          if (M[0x14] & 0x80) continue run;
          const p = at(y);
          M[p] = (M[0x16] & 0x80) ? (M[p] | M[0x18]) : ((M[p] | M[0x17] | M[0x18]) & M[0x19]);
          const o = y;
          y = (y - 1) & 255;
          if (!(o & 7)) P.BITMAP_BYTE({ x, y });
        }
      }
      M[0x17] = (M[0x17] << 1) & 255;
    } while (M[0x17]);
    return { a: 0, x, y };
  };
  // WOOD_POSTS ($39F1): the ten wooden posts either side of the panel, at the columns at $3A1E,
  // their grain from the same random numbers every time (LOAD_RANDOM 4, the race's own put back
  // after), and the line across their tops at row $70
  P.WOOD_POSTS = r => {
    P.SAVE_RANDOM({});
    P.LOAD_RANDOM({ y: 4 });
    M[0x1A] = 9;
    do {
      const y = M[0x1A];
      M[0x19] = M[0x3A28 + y];
      M[0x18] = M[0x3A32 + y];
      P.WOOD_GRAIN({ x: M[0x3A1E + y], y });
      M[0x1A] = (M[0x1A] - 1) & 255;
    } while (!(M[0x1A] & 0x80));
    P.HLINE_TOP({ y: 0x70 });
    return P.LOAD_RANDOM({ y: 9 });
  };

  // --- the screens ---
  // TRACK_TITLE ($2FCE): the track's name in a box under the view (the column from $301B, so that
  // it is in the middle), the box's four lines across and two up
  P.TRACK_TITLE = r => {
    let q = P.TEXT_HALF_DOWN({ y: r.y });
    M[0x3460] = M[0x301B + M[0xC77D]];
    P.PRINT_STRING({ x: 0x58, y: q.y });
    q = P.TRACK_NAME({ x: M[0xC77D] });
    P.TEXT_ON_ROWS({ y: q.y });
    M[0x17] = 3;
    do {
      P.HLINE({ x: 0x58, y: M[0x3017 + M[0x17]], a: 0x14 });
      M[0x17] = (M[0x17] - 1) & 255;
    } while (!(M[0x17] & 0x80));
    M[0x15] = 3;
    P.VLINE({ x: 0x54, y: 0xE9, a: 0x14 });
    M[0x15] = 0xC0;
    return P.VLINE({ x: 0xA8, y: 0xE9, a: 0x14 });
  };
  // PICK_TRACK ($302F): the track of slot A of the season ($C77D, from $3728) and its colour
  // ($C76B, from $3730, the pair's other in the Super League)
  P.PICK_TRACK = r => {
    let x = r.a & 255;
    M[0xC77D] = M[0x3728 + x];
    if (M[0xC71A]) x ^= 1;
    M[0xC76B] = M[0x3730 + x];
    return { a: M[0xC76B], x, y: r.y };
  };
  // DASH_COLOURS ($3046): twelve colours from $C6C0 into colour RAM at $DAB6
  P.DASH_COLOURS = r => {
    for (let x = 0x0B; x >= 0; x--) P.wr(0xDAB6 + x, M[0xC6C0 + x]);
    return { a: M[0xC6C0], x: 0xFF, y: r.y };
  };
  P.GEN.add('CHOOSE_PLAYERS');
  // CHOOSE_PLAYERS ($3052): the first menu ($31A0 set meanwhile): the single player's league, or
  // the drivers of a game for several, each one's name entered, two to eight ($31A1 one less)
  P.CHOOSE_PLAYERS = function* (r) {
    M[0x31A0] = 0x80; M[0x31A1] = 0;
    let q = yield* P.MENU_CHOICE({ a: 0, x: 0x10, y: 1 });
    let at = (q.a & 255) ? 0x307D : 0x3067;
    for (;;) {
      if (at === 0x3067) { q = yield* P.NAME_ENTRY(q); break; }
      if (at === 0x306D) {
        q = yield* P.MENU_CHOICE({ a: 0, x: 0x14, y: 1 });
        if (q.a & 255) at = 0x3087;
        else { M[0x31A1] = (M[0x31A1] + 1) & 255; at = 0x307D; }
      } else if (at === 0x307D) {
        q = yield* P.NAME_ENTRY(q);
        at = M[0x31A1] < 7 ? 0x306D : 0x3087;
      } else {
        if (M[0x31A1]) break;
        at = 0x306D;
      }
    }
    M[0x31A0] = 0;
    return { a: 0, x: q.x, y: q.y };
  };
  // MULTI_RESULTS ($3092): the table of a game for several: after a race (C39C clear) the race's
  // results; at the end of a track's pair of races ($C39C and $31A5 set) the bonus points
  P.MULTI_RESULTS = r => {
    let q = P.SORT_DIVISION({ x: r.x, y: r.y });
    M[0x3845] = 0x10; M[0x321D] = 0x0E;
    let j3153 = false;
    if ((M[0xC39C] & M[0x31A5]) & 0x80) {
      P.CLEAR_PANEL({});
      P.PANEL_FRAME({});
      q = P.COLOUR_ROW({ x: 4, y: 9 });
      P.COLOUR_RUNS({ x: 0x10, a: 1, y: q.y });
      P.PRINT_AT({ x: 0x0B, y: 9 });
      P.PRINT_STRING_B({ x: 0, y: 9 });
      if (M[0x31A1] >= 5) P.TEXT_HALF_DOWN({ y: 9 });
      const row = M[0x3190 + M[0x31A1]];
      M[0x3845] = (row + 2) & 255;
      q = P.TRACK_HEADER({ y: row });
      q = P.BONUS_LINES({ x: q.x, y: q.y });
      let a = M[0x31A1];
      if (a !== 6 && a !== 5) P.TEXT_ON_ROWS({ y: q.y });
      a = M[0x3198 + M[0x31A1]];
      M[0x321D] = a;
      a = (a + 2) & 255;
      if (M[0x31A1] === 7) a = (a - 1) & 255;
      M[0x3845] = a;
      q = { y: M[0x31A1] };
      j3153 = true;
    } else {
      q = P.DIVISION_PANEL({});
      if (M[0xC39C] & 0x80) { q = P.TRACK_HEADER({ y: 0x0B }); j3153 = true; }
      else {
        P.PRINT_STRING({ x: 0x86, y: q.y });
        if (M[0xC74B] >= 7) {
          q = P.COLOUR_ROW({ x: 4, y: 0x0C });
          P.COLOUR_RUNS({ x: 0x10, a: 1, y: q.y });
          q = P.COLOUR_ROW({ x: 4, y: 0x0D });
          q = P.COLOUR_RUNS({ x: 0x10, a: 1, y: q.y });
          P.TEXT_HALF_DOWN({ y: q.y });
          P.PRINT_STRING_B({ x: 0x13, y: q.y });
          P.TEXT_ON_ROWS({ y: q.y });
        }
      }
    }
    if (j3153) P.PRINT_MENU_STRING({ x: 0x71, y: q.y });
    M[0x19] = 0x0E;
    P.LINES({ a: (M[0x31A1] + 2) & 255 });
    do { P.NEXT_LINE({}); M[0x7A] = (M[0x7A] + 1) & 255; q = P.TABLE_ROW({}); } while (!q.z);
    return q;
  };
  // TRACK_HEADER ($3170): at row Y, column 6, the menus' string $93 and the track's name; in a game
  // for several in the Super League string $63 after
  P.TRACK_HEADER = r => {
    const y = r.y & 255;
    P.PRINT_AT({ x: 6, y });
    P.PRINT_MENU_STRING({ x: 0x93, y });
    const q = P.TRACK_NAME({ x: M[0xC77D] });
    if (!M[0x31A1] || !M[0xC71A]) return { a: 0, x: q.x, y: q.y, z: 1 };
    return P.PRINT_MENU_STRING({ x: 0x63, y: q.y });
  };
  // NEW_DRIVERS ($3389): a new league: for several players two opponents from the pool at $DC00
  // (names) and $DCE0 (their driving), by division, at random in the Super League ($C718 set,
  // RAM under the chips meanwhile), and $31A3 the races in a season (6 for one player)
  P.NEW_DRIVERS = r => {
    let x = 6, y = r.y & 255;
    if (M[0x31A1]) {
      P.ALL_RAM({});
      x = 1; M[0x31A2] = 1;
      do {
        M[0x15] = x;
        let a = x;
        y = M[0xC718];
        if (y) {
          a = ((P.RANDOM({ x, y }).a & 1) + 1 + M[0x31A9]) & 255;
          if (a >= 3) a -= 3;
          M[0x31A9] = a;
        }
        a = (a + M[0xE8E1 + y]) & 255;
        y = a;
        M[0xAEE0 + x] = M[0xDCE0 + y];
        x = (x << 4) & 255; y = (y << 4) & 255;
        M[0x14] = 0x10;
        do { M[0xAE00 + x] = M[0xDC00 + y]; x = (x + 1) & 255; y = (y + 1) & 255; M[0x14] = (M[0x14] - 1) & 255; } while (M[0x14]);
        x = (M[0x15] - 1) & 255;
      } while (!(x & 0x80));
      P.IO_BACK({});
      x = (M[0x31A1] + 1) & 255;
    }
    M[0x31A3] = x; M[0x31A6] = 0;
    return { a: 0, x, y };
  };
  // ALL_RAM ($33F1): the raster interrupt off and RAM under the chips; IO_BACK ($33FC) the reverse
  P.ALL_RAM = r => { P.wr(0xD01A, 0); M[1] = 0x34; return { a: 0x34, x: r.x, y: r.y }; };
  P.IO_BACK = r => { M[1] = 0x35; P.wr(0xD01A, 1); return { a: 1, x: r.x, y: r.y }; };
  P.GEN.add('PANEL_SCREEN'); P.GEN.add('RACE_VIEW_SCREEN');
  // PANEL_SCREEN ($3500): BLANK_SCREEN, in a border of $3FBA's colour
  P.PANEL_SCREEN = function* (r) { return yield* P.BLANK_SCREEN(r); };
  // RACE_VIEW_SCREEN ($3504): the screen of a race with the panel in it: blanked in black, the race
  // screen drawn, high resolution, the wooden posts, the division's panel, and the screen back on
  P.RACE_VIEW_SCREEN = function* (r) {
    yield* P.BORDER_BLANK({ a: 0 });
    P.RACE_SCREEN({});
    P.DISPATCH({ a: 1 });
    M[0x3DF8] = 0x41;
    P.WOOD_POSTS({});
    const q = P.DIVISION_PANEL({});
    return P.SCREEN_ON(q);
  };
  // DIVISION_PANEL ($351F): the panel cleared and coloured, its heading row lit, and unless players
  // are being chosen the division of the league ($C718, into $C360), or the heading of a game for
  // several
  P.DIVISION_PANEL = r => {
    M[0xC360] = M[0xC718];
    P.CLEAR_PANEL({});
    P.PANEL_FRAME({});
    let q = P.COLOUR_ROW({ x: 0x0C, y: 0x0B });
    P.COLOUR_RUNS({ x: 0x12, a: 1, y: q.y });
    q = P.COLOUR_ROW({ x: 4, y: 9 });
    q = P.COLOUR_RUNS({ x: 0x0A, a: 2, y: q.y });
    if (M[0x31A0]) return { a: M[0x31A0], x: q.x, y: q.y };
    if (M[0x31A1]) return P.PRINT_MENU_STRING({ x: 0xA0, y: q.y });
    return P.DIVISION_AT({ y: 9 });
  };
  // DIVISION_AT ($3554): at row Y, "DIVISION " and its number (4 less $C360), or in the Super League
  // the string at $E0BB
  P.DIVISION_AT = r => {
    const y = r.y & 255;
    let q;
    if (M[0xC71A]) { M[0xE0BD] = y; q = P.PRINT_STRING_E000({ x: 0xBB, y }); }
    else { M[0x3409] = y; q = P.PRINT_STRING({ x: 0, y }); }
    return P.PRINT_DIGIT({ a: (4 - M[0xC360]) & 255, x: q.x, y });
  };
  P.GEN.add('NEXT_RACE'); P.GEN.add('RACE_DONE');
  // NEXT_RACE ($357E) and RACE_DONE ($357A, $C372 set): the panel before a race and after it: the
  // division, the race's track ($C77F's slot in the division's pair, or the player's in a game for
  // several), "RACE n of m", and the two drivers; after it the winner and the fastest lap. Then a
  // wait for the fire button
  P.NEXT_RACE = function* (r) { return yield* racePanel(0); };
  P.RACE_DONE = function* (r) { return yield* racePanel(0x80); };
  function* racePanel(a) {
    M[0xC372] = a;
    P.DIVISION_PANEL({});
    M[0x14] = (M[0xC360] << 1) & 255;
    a = M[0xC77F];
    if (M[0x31A1]) a = M[0x31A2] ^ 1;
    P.PICK_TRACK({ a: ((a & 1) + M[0x14]) & 255 });
    let q = P.TRACK_HEADER({ y: 0x0B });
    if (!(M[0xC305] & 1)) {
      const y = q.y;
      M[0x3416] = (M[0xC372] & 0x80) ? 0x0D : 0x0E;
      q = P.PRINT_STRING({ x: 0x0D, y });
      P.NUMBER({ a: (M[0x31A6] + 1) & 255, x: q.x, y });
      P.PRINT_STRING({ x: 0xF4, y });
      a = M[0x31A3];
      if (M[0x31A1]) a = (a << 1) & 255;
      P.NUMBER({ a, x: M[0x31A1], y });
      if (M[0xC372] & 0x80) {
        q = P.PAIRING({ a: 7 });
        P.PRINT_STRING({ x: 0x60, y: q.y });
        q = P.LINE_START({});
        P.PRINT_STRING({ x: 0x6A, y: q.y });
        q = P.DRIVER_NAME({ x: M[0xC76F] });
        P.PRINT_STRING({ x: 0xE9, y: q.y });
        q = P.LINE_START({});
        P.PRINT_STRING({ x: 0x78, y: q.y });
        q = P.DRIVER_NAME({ x: M[0xC770] });
        P.PRINT_STRING({ x: 0xEF, y: q.y });
        return yield* fireThenRows();
      }
      q = P.PAIRING({ a: 6 });
      q = P.TRACK_RECORDS({ a: 0x80, x: q.x, y: q.y });
    }
    P.SHOW_RECORDS({ x: q.x, y: q.y });
    return yield* fireThenRows();
  }
  // $361C: a wait for the fire button, then TEXT_ON_ROWS
  function* fireThenRows() { const q = yield* P.WAIT_FIRE({}); return P.TEXT_ON_ROWS(q); }
  P.GEN.add('RESULTS_TABLE');
  // RESULTS_TABLE ($3626): the division's table after a race (or MULTI_RESULTS for several), its
  // rows from $50 to $8A, then a wait for the fire button
  P.RESULTS_TABLE = function* (r) {
    let q = P.DIVISION_RANGE({ x: r.x, y: r.y });
    M[0xC7] = M[0x50];
    if (M[0x31A1]) { P.MULTI_RESULTS(q); return yield* fireThenRows(); }
    q = P.DIVISION_PANEL({});
    P.PRINT_STRING({ x: 0x86, y: q.y });
    M[0x19] = 1;
    do P.LINE_START({}); while (!P.TABLE_ROW({}).z);
    return yield* fireThenRows();
  };
  // TABLE_ROW ($364F): the row of the table's driver $C7 (by place, $C758): the name, then the
  // races, wins, fastest laps and points, or for a game for several at the end of a pair of races
  // ($C39C set) the two race times; Z set at the table's end ($8A)
  P.TABLE_ROW = r => {
    let x = M[0xC758 + M[0xC7]];
    M[0xC6] = x;
    let q = P.DRIVER_NAME({ x });
    const y = q.y;
    P.SPACE({ x, y });
    x = M[0xC6];
    if (M[0xC39C] & 0x80) {
      q = P.PRINT_TIME({ x, y });
      q = P.SPACES_2(q);
      q = P.PRINT_TIME({ x: (q.x + 0x0C) & 255, y: q.y });
      x = q.x;
    } else {
      P.NUMBER_SP({ a: M[0xC740 + x], x, y });
      P.NUMBER_2SP({ a: M[0xC728 + x], x, y });
      P.NUMBER_2SP({ a: M[0xC734 + x], x, y });
      P.SPACES_3({ x, y });
      q = P.NUMBER_SP({ a: M[0xC74C + x], x, y });
    }
    M[0xC7] = (M[0xC7] + 1) & 255;
    const a = M[0xC7], b = M[0x8A];
    return { a, x, y: q.y, z: a === b ? 1 : 0, c: a >= b ? 1 : 0, n: ((a - b) >> 7) & 1 };
  };
  P.GEN.add('WAIT_FIRE');
  // WAIT_FIRE ($3696): waits for the fire button to be let go, a moment, and then pressed
  P.WAIT_FIRE = function* (r) {
    let q;
    do { yield { cycles: P.COST.fireTurn }; q = P.READ_CONTROLS({}); } while (q.a & 0x10);
    yield* P.DELAY({ y: 5 });
    do { yield { cycles: P.COST.fireTurn }; q = P.READ_CONTROLS({}); } while (!(q.a & 0x10));
    return { a: 0x10, x: q.x, y: q.y, z: 0 };
  };
  P.GEN.add('LEAGUE_TABLE');
  // LEAGUE_TABLE ($36AD): the four divisions of the league, top last ($C360 3 to 0): each one's
  // heading, its two tracks and its three drivers, their names from $C70C; then a wait for the fire
  // button. In a game for several, RESULTS_TABLE
  P.LEAGUE_TABLE = function* (r) {
    if (M[0x31A1]) return yield* P.RESULTS_TABLE(r);
    M[0xC356] = 0x80;
    P.CLEAR_PANEL({});
    P.PANEL_FRAME({});
    M[0xC360] = 3;
    M[0x19] = 0x0A; M[0x1A] = 9; M[0x17] = 0;
    do {
      P.DIVISION_AT({ y: M[0x1A] });
      M[0x1A] = (M[0x1A] + 1) & 255;
      M[0x08] = 0;
      do {
        P.PRINT_AT({ x: M[0x08] === 2 ? 0x15 : 6, y: M[0x1A] });
        if (M[0x08] !== 2) {
          const y = ((M[0xC360] << 1) | M[0x08]) ^ 1;
          P.TEXT_HALF_DOWN({ y });
          const q = P.TRACK_NAME({ x: M[0x3728 + y] });
          P.TEXT_ON_ROWS({ y: q.y });
        }
        P.DRIVER_NAME({ x: M[0xC70C + M[0x17]] });
        M[0x1A] = (M[0x1A] + 1) & 255;
        M[0x17] = (M[0x17] + 1) & 255;
        M[0x08] = (M[0x08] + 1) & 255;
      } while (M[0x08] !== 3);
      const q = P.LINES_3({});
      P.TEXT_ON_ROWS(q);
      M[0xC360] = (M[0xC360] - 1) & 255;
    } while (!(M[0xC360] & 0x80));
    M[0xC356] = (M[0xC356] << 1) & 255;
    return yield* fireThenRows();
  };
  // PAIRING ($3738): at panel line A, the race's two drivers ($C771 and $C772), " V " between
  P.PAIRING = r => {
    M[0x19] = r.a & 255;
    P.RACE_PAIR({ a: r.a, x: r.x, y: r.y });
    P.LINE_START({});
    let q = P.DRIVER_NAME({ x: M[0xC771] });
    P.PRINT_STRING({ x: 0x28, y: q.y });
    q = P.DRIVER_NAME({ x: M[0xC772] });
    return P.TEXT_ON_ROWS({ y: q.y });
  };
  P.GEN.add('SEASON_END');
  // SEASON_END ($3754): the division's panel and its changes (CHANGES), then a wait for fire
  P.SEASON_END = function* (r) {
    P.DIVISION_PANEL({});
    P.CHANGES({});
    return yield* fireThenRows();
  };
  // CHANGES ($375D): the end of a season: the league's order from the tables ($C758 to $C70C), who
  // is promoted (the division's winner; the player out of the top division into the Super League)
  // and relegated (its last, but from the bottom division), each pair swapped; then the player's
  // place: the Super League ($C71A) starts with the league in order, and otherwise $C718 is the
  // division the player is in ($381D by place) and $C719 10 at the top
  P.CHANGES = r => {
    for (let x = 0x0B; x >= 0; x--) M[0xC70C + x] = M[0xC758 + x];
    P.DIVISION_RANGE({});
    P.PRINT_AT({ x: 0x0F, y: 0x0C });
    P.PRINT_STRING({ x: 0xD7, y: 0x0C });
    M[0x19] = 1;
    let at = 0x3797, q;
    if (!M[0x50]) {
      if (M[0xC758] !== M[0x31A4]) at = 0x37B6;
      else if (M[0xC71A]) { q = P.LINE_START({}); P.PRINT_STRING_E000({ x: 0xCE, y: q.y }); at = 0x37CE; }
    }
    if (at === 0x3797) {
      q = P.LINE_START({});
      P.PRINT_STRING({ x: 0xB7, y: q.y });
      P.DRIVER_NAME({ x: M[0xC758 + M[0x50]] });
      if (M[0x50]) at = 0x37B6;
      else { q = P.LINE_START({}); P.PRINT_STRING_E000({ x: 0xA7, y: q.y }); at = 0x37CE; }
    }
    if (at === 0x37B6 && ((M[0x8A] - 1) & 255) !== 0x0B) {
      q = P.LINE_START({});
      P.PRINT_STRING({ x: 0xC7, y: q.y });
      P.DRIVER_NAME({ x: M[0xC758 + ((M[0x8A] - 1) & 255)] });
    }
    M[0xC360] = 2;
    do {
      P.DIVISION_RANGE({});
      const y = M[0x50];
      const t = M[0xC70C + y];
      M[0xC70C + y] = M[0xC70B + y];
      M[0xC70B + y] = t;
      M[0xC360] = (M[0xC360] - 1) & 255;
    } while (!(M[0xC360] & 0x80));
    let a = M[0x31A4], x;
    if (a === M[0xC758]) {
      x = M[0xC71A];
      if (x) { M[0xC719] = 0x0A; return { a: 0x0A, x, y: M[0x50] }; }
      M[0xC71A] = a;
      for (x = 0x0B; x >= 0; x--) M[0xC70C + x] = x;
      x = 0xFF; a = 0;
    } else {
      x = P.FIND_DRIVER({ a }).x;
      a = M[0x381D + x];
    }
    M[0xC718] = a;
    if (a) return { a, x, y: M[0x50] };
    M[0xC719] = 0x0A;
    return { a: 0x0A, x, y: M[0x50] };
  };
  // FIND_DRIVER ($3829): X the place of driver A in the league ($C70C), $FF when none
  P.FIND_DRIVER = r => {
    const a = r.a & 255;
    for (let x = 0x0B; x >= 0; x--) if (M[0xC70C + x] === a) return { a, x, z: 1 };
    return { a, x: 0xFF, z: 0 };
  };
  // LINES ($385A) with A, LINES_3 ($3854) with 3, LINE_START ($3858) with 2: A rows of the panel lit
  // from the row at $3837 + $19, a line drawn above them (and under them while $C356 is clear), and
  // the cursor at their first, column 5 (NEXT_LINE), $19 on and the text half a row down
  P.LINES_3 = r => P.LINES({ a: 3 });
  P.LINE_START = r => P.LINES({ a: 2 });
  P.LINES = r => {
    M[0x73] = r.a & 255;
    const y = M[0x3837 + M[0x19]];
    M[0x74] = y; M[0x7A] = y;
    P.HLINE_UNDER({});
    do {
      P.PANEL_ROW({ y: M[0x74] });
      M[0x74] = (M[0x74] + 1) & 255;
      M[0x73] = (M[0x73] - 1) & 255;
    } while (M[0x73]);
    if (!(M[0xC356] & 0x80)) P.HLINE_UNDER({});
    return P.NEXT_LINE({});
  };
  // NEXT_LINE ($387B): the cursor at column 5 of row $7A, $19 on, and TEXT_HALF_DOWN
  P.NEXT_LINE = r => {
    P.PRINT_AT({ x: 5, y: M[0x7A] });
    M[0x19] = (M[0x19] + 1) & 255;
    return P.TEXT_HALF_DOWN({ y: M[0x7A] });
  };
  // SCREEN_RUN ($3AC3): run X of $3AD9 (the count, then the byte) stored at ($1E) + Y on, across
  // pages; X and Y come back past it
  P.SCREEN_RUN = r => {
    let x = r.x & 255, y = r.y & 255;
    M[0x51] = M[0x3AD9 + x]; x = (x + 1) & 255;
    const a = M[0x3AD9 + x]; x = (x + 1) & 255;
    do {
      M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF] = a;
      y = (y + 1) & 255;
      if (!y) M[0x1F] = (M[0x1F] + 1) & 255;
      M[0x51] = (M[0x51] - 1) & 255;
    } while (M[0x51]);
    return { a, x, y, z: 1 };
  };
  // RACE_SCREEN_COLOURS ($3A77): the screen RAM at $7C00 from the runs at $3AD9 (a count below $C8
  // and the byte; $C8 + n, n times the group of runs that follows, its length first; $FF the end),
  // the track's colour ($C76B) in two of them, then two bytes of $0E
  P.RACE_SCREEN_COLOURS = r => {
    M[0x3AEE] = M[0xC76B]; M[0x3AF2] = M[0xC76B];
    P.COLOUR_ROW({ x: 0, y: 0 });
    let x = 0, y = 0;
    const run = () => { const q = P.SCREEN_RUN({ x, y }); x = q.x; y = q.y; };
    for (;;) {
      const a = M[0x3AD9 + x];
      if (a < 0xC8) { run(); continue; }
      if (a === 0xFF) { M[0x7C53] = 0x0E; M[0x7C74] = 0x0E; return { a: 0x0E, x, y }; }
      M[0xA0] = (a - 0xC8) & 255;
      x = (x + 1) & 255;
      M[0x50] = x;
      do {
        x = M[0x50];
        M[0x52] = M[0x3AD9 + x]; x = (x + 1) & 255;
        do { run(); M[0x52] = (M[0x52] - 1) & 255; } while (M[0x52]);
        M[0xA0] = (M[0xA0] - 1) & 255;
      } while (M[0xA0]);
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
