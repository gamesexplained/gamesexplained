// The league ($E85B-$EC10): a new league, the races the player does not drive worked out from the
// drivers' ratings, the divisions' tables sorted by points, and the track built from its
// description before each race: its pieces' kinds, directions, heights and places on the map.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.league = P => {
  const M = P.M;

  // NEW_LEAGUE ($E85B): the race's state cleared, the league's 128 bytes at $C700 cleared (128
  // random numbers drawn meanwhile), its order 0-11 at $C70C, the season reset, $C719 = 10
  P.NEW_LEAGUE = r => {
    P.CLEAR_RACE({});
    let a = 0;
    for (let x = 0x7F; x >= 0; x--) {
      M[0xC700 + x] = 0; M[0x3DF8] = 0;
      a = P.RANDOM({ x }).a & 255;
      if (x < 0x0C) { a = x; M[0xC70C + x] = x; }
    }
    P.RESET_SEASON({});
    M[0xC719] = 0x0A;
    return { a: 0x0A };
  };

  // RACE_OTHERS ($E87F): each driver's rating for the race, $E8B6 (120 for the first down to 10
  // for the twelfth) plus 0-63 at random, into $C71C; then in each division (only the players' when
  // there are several) the race worked out: who meets whom (RACE_PAIR), the result (RACE_RESULT) and
  // the table sorted (SORT_DIVISION)
  P.RACE_OTHERS = r => {
    for (let x = 0x0B; x >= 0; x--) M[0xC71C + x] = ((P.RANDOM({ x }).a & 0x3F) + M[0xE8B6 + x]) & 255;
    let a = 0;
    do {
      M[0xC360] = a;
      if (!M[0x31A1] || a === M[0xC718]) { P.RACE_PAIR({}); P.RACE_RESULT({}); P.SORT_DIVISION({}); }
      a = (M[0xC360] + 1) & 255;
    } while (a < 4);
    return { a, c: 1 };
  };

  // DIVISION_RANGE ($E8C2): the division $C360's places in the league's order, $50 up to $8A: three
  // from $E8E1 (9, 6, 3 or 0), or with several players all from 11 less their number to 12
  P.DIVISION_RANGE = r => {
    if (M[0x31A1]) {
      M[0x50] = ((M[0x31A1] ^ 0xFF) + 0x0C) & 255;
      M[0x8A] = 0x0C;
      return { a: 0x0C, x: r.x, y: r.y };
    }
    const x = M[0xC360];
    M[0x50] = M[0xE8E1 + x];
    M[0x8A] = (M[0x50] + 3) & 255;
    return { a: M[0x8A], x, y: r.y };
  };

  // RACE_PAIR ($E8E5): the two drivers of race $C77F of the division: from the order at $C70C by the
  // pairs at $E920/$E926 (first and second, second and first, first and third...), the player's
  // driver 11; with several players, the race's driver (11 less $C77F) against the player whose
  // turn it is ($31A2)
  P.RACE_PAIR = r => {
    let x = P.DIVISION_RANGE(r).x;
    let a, y;
    if (M[0x31A1]) {
      y = (0x0B - M[0xC77F]) & 255;
      M[0xC771] = y;
      a = M[0x31A2];
    } else {
      x = M[0xC77F];
      M[0xC771] = M[0xC70C + ((M[0xE920 + x] + M[0x50]) & 255)];
      a = M[0xC70C + ((M[0xE926 + x] + M[0x50]) & 255)];
      y = 0x0B;
    }
    M[0xC772] = a; M[0x31A4] = y;
    return { a, x, y };
  };

  // RACE_RESULT ($E92C): a race worked out: both drivers' races counted ($C740); the winner (bit 7
  // of $51: the first, $C771, else the second) and the best lap (bit 6) from the player's own race
  // ($C362) when either is the player's driver, otherwise from the ratings: the higher rated wins
  // (a tie at random) and takes the best lap unless the draw at the start (bit 6, 96 times in 256)
  // gave it to the other. A win counts at $C728, a best lap at $C734; in the player's division
  // they are kept at $C76F and $C770.
  P.RACE_RESULT = r => {
    M[0x51] = (P.RANDOM({ x: 0 }).a & 255) >= 0xA0 ? 0x40 : 0;
    const y = M[0xC771], x = M[0xC772];
    M[0xC740 + x] = (M[0xC740 + x] + 1) & 255;
    M[0xC740 + y] = (M[0xC740 + y] + 1) & 255;
    const a = M[0xC362];
    if (x === M[0x31A4]) M[0x51] = a;
    else if (y === M[0x31A4]) M[0x51] = a ^ 0xC0;
    else {
      const hy = M[0xC71C + y], hx = M[0xC71C + x];
      if (hy > hx || (hy === hx && !(P.RANDOM({ x }).a & 1))) M[0x51] ^= 0xC0;
    }
    M[0x16] = (M[0x51] & 0x80) ? y : x;
    M[0x17] = (M[0x51] & 0x40) ? y : x;
    M[0xC728 + M[0x16]] = (M[0xC728 + M[0x16]] + 1) & 255;
    const k = M[0x17];
    M[0xC734 + k] = (M[0xC734 + k] + 1) & 255;
    if (M[0xC360] !== M[0xC718]) return { a: M[0xC360], x: k, y };
    M[0xC770] = k;
    M[0xC76F] = M[0x16];
    return { a: M[0x16], x: k, y };
  };

  // SORT_DIVISION ($E9A3): the division's points ($C74C: two for a win, one for a best lap), and
  // its table at $C758 sorted by them, a bubble sort down from the top: wins break a tie, then with
  // several players the lower driver, otherwise a coin
  P.SORT_DIVISION = r => {
    P.DIVISION_RANGE({});
    let y = M[0x50], x = 0;
    do {
      x = M[0xC70C + y];
      M[0xC758 + y] = x;
      M[0xC74C + x] = ((M[0xC728 + x] << 1) + M[0xC734 + x]) & 255;
      y = (y + 1) & 255;
    } while (y < M[0x8A]);
    do {
      M[0x16] = 0;
      y = M[0x50];
      do {
        M[0x17] = y;
        x = M[0xC758 + y];
        const z = M[0xC759 + y];
        let swap;
        if (M[0xC74C + x] !== M[0xC74C + z]) swap = M[0xC74C + x] < M[0xC74C + z];
        else if (M[0xC728 + x] !== M[0xC728 + z]) swap = M[0xC728 + x] < M[0xC728 + z];
        else if (M[0x31A1]) { M[0x14] = z; swap = x < z; }
        else swap = !!(P.RANDOM({ x }).a & 1);
        if (swap) {
          M[0x15] = z;
          M[0xC759 + M[0x17]] = x;
          M[0xC758 + M[0x17]] = M[0x15];
          M[0x16] = (M[0x16] + 1) & 255;
        }
        y = (M[0x17] + 1) & 255;
      } while (((M[0x17] + 2) & 255) < M[0x8A]);
    } while (M[0x16]);
    return { a: 0, x, y };
  };

  // READ_TRACK ($EA12): the next byte of the track's description at ($1E) + Y
  P.READ_TRACK = r => {
    let y = r.y & 255;
    const a = M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF];
    y = (y + 1) & 255;
    if (!y) M[0x1F] = (M[0x1F] + 1) & 255;
    return { a, y, n: a >> 7, z: a ? 0 : 1 };
  };
  // TRACK_STEP ($EA1C): A moved one square on the map by $15's top bits: up a row ($10) with neither,
  // right with bit 6, down with bit 7, left with both
  P.TRACK_STEP = r => {
    const a = r.a & 255, b = M[0x15];
    let t;
    if (b & 0x80) {
      t = a - ((b & 0x40) ? 1 : 0x10);
      return { a: t & 255, c: t >= 0 ? 1 : 0 };
    }
    t = a + ((b & 0x40) ? 1 : 0x10);
    return { a: t & 255, c: t > 255 ? 1 : 0 };
  };

  // BUILD_TRACK ($EA34): track X built from its description (from $B220): its piece count and
  // three more bytes at $C764-$C767, its start ($51/$77, $52/$78); then piece by piece: its kind
  // and flags at $0400 (a kind of $F repeats the last piece's kind, stepping on the map, the
  // count in its top four bits), its square on the map at $044E, its two shapes at $049C and
  // $04EA (fixed ones for kinds $C-$F, from $EBDB/$EBDD), the distance round the track to it
  // ($0670/$06BE, in units of 32), its ends' places across and along at $0538/$0586 and
  // $05D4/$0622 from the shape's offsets; then the piece after the start line ($C77C), the
  // track's length ($C768/$C769), six bytes at $C774, the pairs at $075E/$0769 ($C778 of them)
  // and the bytes at $0190 ($C779), the opponent picked (OPP_PICK) and its table (command $44)
  P.BUILD_TRACK = r => {
    let x = r.x & 255;
    let y = (x << 1) & 255;
    M[0x1E] = M[0xB220 + y]; M[0x1F] = M[0xB221 + y];
    const read = () => { const q = P.READ_TRACK({ y }); y = q.y; return q.a; };
    y = 0;
    do { const a = read(); M[0xC763 + y] = a; } while (y !== 4);
    M[0x51] = M[0x52] = read();
    M[0x77] = M[0x78] = read();
    x = 0;
    M[0xD8] = 0; M[0x7D] = 0; M[0x7F] = 0; M[0x08] = 0;
    for (;;) {
      let a;
      if (M[0x08]) {
        M[0x08] = (M[0x08] - 1) & 255;
        a = M[0x4F];
        M[0x15] = a; M[0x0400 + x] = a;
        if (a & 0x10) M[0x15] ^= 0xC0;
        a = P.TRACK_STEP({ a: M[0x30] }).a & 255;
      } else {
        a = read();
        M[0x15] = a; M[0x0400 + x] = a;
        if ((a & 0x0F) === 0x0F) { M[0x08] = M[0x15] >> 4; continue; }
        M[0x4F] = M[0x0400 + x];
        a = read();
      }
      M[0x044E + x] = a; M[0x30] = a;
      M[0x14] = (((M[0xD8] >> 1) & 1) << 7) | (M[0xD8] >> 3);
      const k = M[0x15] & 0x0F;
      if (k >= 0x0C) {
        M[0x16] = y;
        M[0x0400 + x] &= 0xF0;
        M[0x049C + x] = M[0xEBDB + k];
        a = M[0xEBDD + k];
      } else {
        a = read();
        M[0x049C + x] = a;
        if (!(M[0x15] & 0x20)) a = read();
      }
      M[0x04EA + x] = (a & 0x7F) | M[0x14];
      const keep = y;
      M[0x14] = M[0x7D];
      M[0x06BE + x] = P.SHIFT16({ a: M[0x7F], y: 0xFB }).a & 255;
      M[0x0670 + x] = M[0x14];
      P.PIECE_LOAD({ x });
      M[0xD8] = (M[0xD8] + M[0x62]) & 2;
      let t = M[0x7D] + M[0xBE];
      M[0x7D] = t & 255; M[0x7F] = (M[0x7F] + (t >> 8)) & 255;
      const ends = (lo, hi, l0, h0, f) => {
        M[0x15] = f({ y: 0 }).a & 255;
        t = M[l0] - M[0x14];
        M[lo + x] = t & 255;
        M[hi + x] = (M[h0] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
        M[0x15] = f({ y: M[0xBE] }).a & 255;
        t = M[lo + x] + M[0x14];
        M[l0] = t & 255;
        M[h0] = (M[hi + x] + M[0x15] + (t >> 8)) & 255;
      };
      ends(0x0538, 0x0586, 0x51, 0x77, P.SHAPE_OFFSET);
      ends(0x05D4, 0x0622, 0x52, 0x78, P.SHAPE_OFFSET_B);
      y = keep;
      x = (x + 1) & 255;
      if (x === M[0xC764]) break;
    }
    x = (M[0xC766] + 1) & 255;
    if (x >= M[0xC764]) x = 0;
    M[0xC77C] = x;
    M[0x17] = y;
    M[0x14] = M[0x7D];
    M[0xC769] = P.SHIFT16({ a: M[0x7F], y: 0xFB }).a & 255;
    M[0xC768] = M[0x14];
    y = M[0x17];
    for (x = 0; x !== 6; x++) M[0xC774 + x] = read();
    if (M[0xC778]) for (x = 0; x !== M[0xC778]; x = (x + 1) & 255) { M[0x075E + x] = read(); M[0x0769 + x] = read(); }
    if (M[0xC779]) for (x = 0; x !== M[0xC779]; x = (x + 1) & 255) M[0x0190 + x] = read();
    P.OPP_PICK({});
    return P.DISPATCH({ a: 0x44, x: M[0x209A] });
  };

  // SHAPE_OFFSET_B ($EBEB): SHAPE_OFFSET from the piece's second shape ($CA)
  P.SHAPE_OFFSET_B = r => { M[0x98] = M[0xCA]; M[0x99] = M[0xCB]; return P.SHAPE_OFFSET(r); };
  // SHAPE_OFFSET ($EBF3): the offset of the shape at ($98) for point Y, in A:$14 (eighths of a
  // unit, $14 the fraction): two bytes a point with $A2 bit 7 set, one packed byte otherwise
  P.SHAPE_OFFSET = r => {
    let y = r.y & 255;
    const p = M[0x98] | M[0x99] << 8;
    if (M[0xA2] & 0x80) {
      y = (y << 1) & 255;
      M[0x14] = M[(p + y + 1) & 0xFFFF];
      return { a: M[(p + y) & 0xFFFF] & 0x7F, y };
    }
    const b = M[(p + y) & 0xFFFF];
    M[0x14] = (b << 1) & 0xE0;
    return { a: b & 0x0F, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
