// The pieces and the view's setting up ($F021-$F829): a piece's shapes and place loaded, its square
// turned to the view's quarter, the camera put where the car is, the track seen from above
// before a race, where the race starts, the gap between the cars, the boost's count, the
// damage bar along the dashboard's top, the league's save code, and the controls read.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.view = P => {
  const M = P.M;
  const neg = v => (0 - v) & 255;

  // BAR_PART_AT ($F021): Y times 24, plus 8, in A and Y (with the carry from the doubling): where
  // part Y's two cells start in the damage bar (BAR_HOLE)
  P.BAR_PART_AT = r => {
    const y = r.y & 255;
    M[0x14] = y;
    let a = (((y << 1) & 255) + y + (y >> 7)) & 255;
    const t = ((a << 3) & 255) + 8;
    a = t & 255;
    return { a, y: a, c: t > 255 ? 1 : 0 };
  };

  // PIECE_LOAD ($F02F): piece X's shapes and place: its first shape's points ($049C: $A2, $98/$99)
  // and its second's ($04EA: $CA/$CB, $D8 its top bit doubled), its ends ($3F/$35, $40/$36), its
  // direction ($1D, the top two bits of $0400), whether it is driven backwards ($A4), its kind
  // ($C3CD) and the kind's table ($9A/$9B from $B100): the flags $B2, the points' count $9E
  // (with $62 two less and $BE half less one, the segments), $9D, $BC/$BD, $C8
  P.PIECE_LOAD = r => {
    const x = r.x & 255;
    let a = M[0x049C + x];
    M[0xA2] = a;
    let y = (a << 1) & 255;
    M[0x98] = M[0xB120 + y]; M[0x99] = M[0xB121 + y];
    a = M[0x04EA + x];
    y = (a << 1) & 255;
    M[0xD8] = (a >> 7) << 1;
    M[0xCA] = M[0xB120 + y]; M[0xCB] = M[0xB121 + y];
    M[0x3F] = M[0x0538 + x]; M[0x35] = M[0x0586 + x];
    M[0x40] = M[0x05D4 + x]; M[0x36] = M[0x0622 + x];
    const k = M[0x0400 + x];
    M[0x1D] = k & 0xC0;
    M[0xA4] = (k & 0x10) << 3;
    M[0xC3CD] = k & 0x0F;
    y = (M[0xC3CD] << 1) & 255;
    M[0x9A] = M[0xB100 + y]; M[0x9B] = M[0xB101 + y];
    const p = M[0x9A] | M[0x9B] << 8, rd = i => M[(p + i) & 0xFFFF];
    M[0xB2] = rd(1);
    y = rd(0);
    M[0x9E] = rd(y); y = (y + 1) & 255;
    M[0x62] = (M[0x9E] - 2) & 255;
    M[0xBE] = ((M[0x9E] >> 1) - 1) & 255;
    M[0x9D] = (rd(y) & 1) << 7; y = (y + 1) & 255;
    M[0xBC] = rd(y); y = (y + 1) & 255;
    M[0xBD] = rd(y); y = (y + 3) & 255;
    M[0xC8] = rd(y); y = (y + 1) & 255;
    return { a: M[0xC8], x, y };
  };

  // PIECE_ORIGIN ($F0C5): piece X's square on the map less the view's ($5C across, $5E along),
  // turned to the view's quarter ($68's top bits), times 8 plus $CF/$D1, into $93 and $95
  P.PIECE_ORIGIN = r => {
    const s = M[0x044E + (r.x & 255)];
    let x = ((s & 0x0F) - M[0x5C]) & 255, y = ((s >> 4) - M[0x5E]) & 255;
    const q = M[0x68];
    if (q & 0x80) {
      if (q & 0x40) { M[0x14] = y; y = neg(x); x = M[0x14]; } else { x = neg(x); y = neg(y); }
    } else if (q & 0x40) { M[0x14] = x; x = neg(y); y = M[0x14]; }
    M[0x93] = ((x << 3) + M[0xCF]) & 255;
    M[0x95] = ((y << 3) + M[0xD1]) & 255;
    return { a: M[0x95], x, y };
  };

  // PIECE_NEIGHBOUR ($F117): the square next to square X, across or along by which of A and Y is
  // larger and whether their sum carries, and the piece there (PIECE_FROM_HERE); $FF off the map
  P.PIECE_NEIGHBOUR = r => {
    const a = r.a & 255, y = r.y & 255;
    let x = r.x & 255;
    M[0x14] = a; M[0x15] = y;
    const carry = a + y > 255;
    let k;
    if (y < a) {
      if (carry) { k = x & 0x0F; if (k === 0x0F) return { a: 0xFF, x, y }; x = (x + 1) & 255; }
      else { if (!(x & 0xF0)) return { a: 0xFF, x, y }; x = k = (x - 0x10) & 255; }
    } else if (carry) { if ((x & 0xF0) === 0xF0) return { a: 0xFF, x, y }; x = k = (x + 0x10) & 255; }
    else { k = x & 0x0F; if (!k) return { a: 0xFF, x, y }; x = (x - 1) & 255; }
    return P.PIECE_FROM_HERE({ a: k, x, y });
  };

  // VIEW_SQUARE ($F15D): the car's place (points 0 and 2 of $0100/$0103/$0106) in squares into
  // $AF/$B1 and $5C/$5E (a zero low byte made 1 first), and its place within the square into
  // $45/$63/$24 and $47/$65/$26, swapped and negated as A's top bits (the view's quarter) say
  P.VIEW_SQUARE = r => {
    M[0x16] = r.a & 255;
    for (let x = 2; x >= 0; x -= 2) {
      if (!M[0x0100 + x]) M[0x0100 + x] = 1;
      const c = M[0x0100 + x] >> 7;
      const b = M[0x0103 + x];
      M[0xAF + x] = ((b << 1) | c) & 255;
      M[0x5C + x] = ((M[0x0106 + x] << 1) | (b >> 7)) & 255;
    }
    const q = M[0x16];
    if (q & 0x80) {
      if (q & 0x40) { P.VIEW_NEGATE({ x: 0, y: 2 }); return P.VIEW_COPY({ x: 2, y: 0 }); }
      P.VIEW_NEGATE({ x: 0, y: 0 }); return P.VIEW_NEGATE({ x: 2, y: 2 });
    }
    if (q & 0x40) { P.VIEW_COPY({ x: 0, y: 2 }); return P.VIEW_NEGATE({ x: 2, y: 0 }); }
    P.VIEW_COPY({ x: 0, y: 0 }); return P.VIEW_COPY({ x: 2, y: 2 });
  };
  // VIEW_NEGATE ($F1A6): place X's three bytes negated (from 8 squares) into $45/$63/$24 + Y
  P.VIEW_NEGATE = r => {
    const x = r.x & 255, y = r.y & 255;
    let t = 0 - M[0x0100 + x]; M[0x45 + y] = t & 255;
    t = 0 - M[0x0103 + x] - (t < 0 ? 1 : 0); M[0x63 + y] = t & 255;
    t = 8 - M[0x0106 + x] - (t < 0 ? 1 : 0); M[0x24 + y] = t & 255;
    return { a: t & 255, x, y, c: t >= 0 ? 1 : 0 };
  };
  // VIEW_COPY ($F1C9): place X's three bytes into $45/$63/$24 + Y
  P.VIEW_COPY = r => {
    const x = r.x & 255, y = r.y & 255;
    M[0x45 + y] = M[0x0100 + x]; M[0x63 + y] = M[0x0103 + x]; M[0x24 + y] = M[0x0106 + x];
    return { a: M[0x24 + y], x, y };
  };

  // CAMERA ($F1DC): the view put where the car is: its quarter ($68) from the car's heading
  // ($0125), its square and place in it (VIEW_SQUARE), its height ($46/$64, from $0101/$0104/$0107
  // over 8) and the eye above the road ($37/$38: $0160/$0161 doubled when that is 5 or more, plus
  // $80 and 7 or 2 more, less the car's tilt $0121/$0124 halved when it leans one way, over 16);
  // the place across and along within the square over 16 and negated ($92/$CF, $94/$D1); and the
  // heading's angle less $20, times 4, at $32/$3E, its negative at $A7/$A8
  P.CAMERA = r => {
    M[0x68] = (M[0x0125] + 0x20) & 0xC0;
    P.VIEW_SQUARE({ a: M[0x68] });
    M[0x46] = M[0x0101]; M[0x64] = M[0x0104];
    let a = M[0x0107];
    for (let i = 0; i < 3; i++) {
      const c = a & 1; a >>= 1;
      const c2 = M[0x64] & 1; M[0x64] = (M[0x64] >> 1) | (c << 7);
      M[0x46] = (M[0x46] >> 1) | (c2 << 7);
    }
    let y = 7;
    M[0x16] = M[0x0160];
    a = M[0x0161];
    if (a >= 5) { const c = M[0x16] >> 7; M[0x16] = (M[0x16] << 1) & 255; a = ((a << 1) | c) & 255; y = 2; }
    M[0x17] = a;
    let t = M[0x16] + 0x80; M[0x16] = t & 255;
    M[0x17] = (y + M[0x17] + (t >> 8)) & 255;
    M[0x14] = 0; M[0x15] = 0;
    if (M[0x0124] & 0x80) {
      M[0x14] = M[0x0121];
      M[0x15] = P.SHIFT16({ a: M[0x0124], y: 1 }).a & 255;
    }
    t = M[0x16] - M[0x14]; M[0x14] = t & 255;
    a = (M[0x17] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    const sh = P.SHIFT16({ a, y: 4 });
    M[0x15] = sh.a & 255;
    t = M[0x46] + M[0x14]; M[0x37] = t & 255;
    M[0x38] = (M[0x64] + M[0x15] + (t >> 8)) & 255;
    for (let x = 2; x >= 0; x -= 2) {
      M[0x14] = M[0x45 + x];
      a = M[0x63 + x] & 0x7F;
      for (let i = 0; i < 4; i++) { const c = a & 1; a >>= 1; M[0x14] = (M[0x14] >> 1) | (c << 7); }
      M[0xCF + x] = P.NEG16({ a }).a & 255;
      M[0x92 + x] = M[0x14];
    }
    M[0x16] = 0;
    M[0x14] = M[0x0122];
    a = (M[0x0125] - 0x20) & 255;
    if (a & 0x80) M[0x16] = 0xFF;
    for (let i = 0; i < 2; i++) {
      const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
      const c2 = a >> 7; a = ((a << 1) | c) & 255;
      M[0x16] = ((M[0x16] << 1) | c2) & 255;
    }
    M[0x32] = a;
    M[0x3E] = M[0x16];
    M[0x3E] = 0xFF;
    t = 0 - M[0x32]; M[0xA7] = t & 255;
    a = (0 - M[0x3E] - (t < 0 ? 1 : 0)) & 255;
    M[0xA8] = a;
    return { a, x: 0xFE, y: sh.y };
  };

  // SIDEWAYS ($F2B7): the car's place across the road ($B7/$B8 less $C0, the other way when the
  // piece is driven backwards) into $B5/$B6; off the road (a high byte past 0 either way) the car
  // falls ($6B $80, $C36F its side, $C368 15, the dust cleared), unless it already is; on it, $6B
  // and $C373 cleared unless $6B bit 6 is set
  P.SIDEWAYS = r => {
    const t = M[0xB7] - 0xC0; M[0x14] = t & 255;
    let a = (M[0xB8] - (t < 0 ? 1 : 0)) & 255;
    a = P.NEG16_IF_MINUS({ a, n: M[0xA4] >> 7, c: t >= 0 ? 1 : 0 }).a & 255;
    M[0xB6] = a;
    const x = M[0x14];
    M[0xB5] = x;
    a = P.NEG16_IF_MINUS({ a, n: a >> 7, c: 1 }).a & 255;
    if (a >= 1) {
      if (M[0x6B] & 0x80) return { a, x, y: r.y };
      M[0x6B] = 0x80;
      M[0xC36F] = M[0xB6];
      M[0xC368] = 0x0F;
      return Object.assign({ y: r.y }, P.DUST_CLEAR({ a: 0x0F, x }));
    }
    if (M[0x6B] & 0x40) return { a, x, y: r.y };
    M[0x6B] = a; M[0xC373] = a;
    return { a, x, y: r.y };
  };

  // MAP_SQUARES ($F2F6): the track from above: each of 17 rows ($00-$10) of the map, its
  // squares from 0 left to $F8 and from 1 right to 8 (MAP_SQUARE)
  P.MAP_SQUARES = r => {
    let x = 0, y = 0;
    do {
      M[0xC3D7] = 8; M[0xC3D8] = (0 - M[0xC3D7]) & 255;
      x = 0; M[0xC361] = 0;
      do { const q = P.MAP_SQUARE({ x, y }); x = (q.x - 1) & 255; y = q.y & 255; } while (x >= M[0xC3D8]);
      x = 1; M[0xC361] = 0x80;
      do { const q = P.MAP_SQUARE({ x, y }); x = (q.x + 1) & 255; y = q.y & 255; } while (x <= M[0xC3D7]);
      y = (y + 1) & 255;
    } while (y !== 0x11);
    return { x, y };
  };
  // MAP_SQUARE ($F32E): the piece at square X, Y from the view (turned to its quarter, $68) drawn
  // whole (DRAW_PIECE, POINTS_TO_LINES), when there is one (SQUARE_PIECE)
  P.MAP_SQUARE = r => {
    let x = r.x & 255, y = r.y & 255;
    M[0x30] = x; M[0x31] = y;
    const q = M[0x68];
    if (q & 0x80) {
      if (q & 0x40) { x = neg(M[0x31]); y = M[0x30]; } else { x = neg(M[0x30]); y = neg(M[0x31]); }
    } else if (q & 0x40) { x = M[0x31]; y = neg(M[0x30]); }
    M[0x0B] = x; M[0x0C] = y;
    M[0xD3] = 0; M[0xD2] = 0;
    const s = P.SQUARE_PIECE({ a: 0, x, y });
    if (!s.c && (s.a & 255) !== 0xFF) {
      M[0x2E] = s.a & 255;
      M[0xD0] = 0; M[0xCC] = 0x80; M[0xCD] = 0x80;
      P.POINTS_TO_LINES(P.DRAW_PIECE({ a: 0x80, x: s.x, y: s.y }));
    }
    return { x: M[0x30], y: M[0x31] };
  };

  // TRACK_PREVIEW ($F386): the track seen from above, turned to C34C's quarter (the eye's place
  // and heading from $F3FC, $F400 and $F404), the view set up (NEW_VIEW), the column limits and
  // the bitmap's three bands cleared, and every square drawn (MAP_SQUARES) with PROJECT_X's start
  // rewritten to a jump to PROJECT_X_PAIR and $262B set to $0B, both put back after
  P.TRACK_PREVIEW = r => {
    const x = M[0xC34C] & 3;
    M[0x0106] = M[0xF3FC + x]; M[0x0108] = M[0xF400 + x]; M[0x0125] = M[0xF404 + x];
    M[0x0107] = 3; M[0x0104] = 0xF0;
    M[0x12] = (0x18 + M[0xA1F2]) & 255;
    M[0x33] = 0xB8;
    P.NEW_VIEW({});
    for (let i = 0x7F; i >= 0; i--) M[0xC640 + i] = 0xC0;
    for (let i = 0; i < 256; i++) { M[0x52E0 + i] = 0xFF; M[0x5420 + i] = 0xFF; M[0x5560 + i] = 0xFF; }
    P.SCREEN_ON({});
    M[0x262B] = 0x0B;
    const keep = [M[0x2458], M[0x2459], M[0x245A]];
    for (let i = 2; i >= 0; i--) M[0x2458 + i] = M[0xF408 + i];
    const q = P.MAP_SQUARES({});
    M[0x262B] = 8;
    for (let i = 0; i < 3; i++) M[0x2458 + i] = keep[i];
    return { a: keep[2], x: 3, y: q.y };
  };

  // PROJECT_X_PAIR ($F40B): what PROJECT_X runs while TRACK_PREVIEW has rewritten it: the
  // depth ($77:$51) halved, then the distance across halved and moved $30 on and projected twice
  // (PROJECT_X_HALF), the first's logarithm ($70/$71) kept in $AB/$AC
  P.PROJECT_X_PAIR = r => {
    const x = r.x & 255;
    M[0x16] = x;
    const a = M[0x77];
    M[0x77] = (a >> 1) | (a & 0x80);
    const c = a & 1;
    const lo = M[0x51]; M[0x51] = (lo >> 1) | (c << 7);
    P.PROJECT_X_HALF({ x });
    const k70 = M[0x70], k71 = M[0x71];
    P.PROJECT_X_HALF({ x });
    M[0xAC] = k71; M[0xAB] = k70;
    return { a: k70, x: M[0x16] };
  };
  // PROJECT_X_HALF ($F42D): the distance across ($78:$52) halved and $30 added to its high byte,
  // then projected (PROJECT_X_AT)
  P.PROJECT_X_HALF = r => {
    const a = M[0x78];
    const c = a & 1;
    M[0x52] = (M[0x52] >> 1) | (c << 7);
    M[0x78] = (((a >> 1) | (a & 0x80)) + 0x30) & 255;
    return P.PROJECT_X_AT({ a: M[0x52], x: r.x });
  };

  // REVERSE_POINTS ($F440): a piece's points in the other order, for one driven backwards: $A330
  // and $8040 swapped end for end, and at every second point the $8080 entry with the one before
  // its mirror
  P.REVERSE_POINTS = r => {
    let x = 0, y = (M[0x9E] - 1) & 255, a = 0;
    M[0x18] = M[0x9E] >> 1;
    do {
      M[0x14] = M[0xA330 + x]; M[0x15] = M[0x8040 + x];
      M[0xA330 + x] = M[0xA330 + y]; M[0x8040 + x] = M[0x8040 + y];
      M[0xA330 + y] = M[0x14]; M[0x8040 + y] = M[0x15];
      a = M[0x15];
      y = (y - 1) & 255;
      if (!(x & 1)) {
        a = M[0x8080 + x];
        M[0x8080 + x] = M[0x8080 + y];
        M[0x8080 + y] = a;
      } else a = 1;
      x = (x + 1) & 255;
      M[0x18] = (M[0x18] - 1) & 255;
    } while (M[0x18]);
    return { a, x, y };
  };

  // START_PLACE ($F488): where the race starts: piece X, or the first before it that a car may
  // start on (not a kind marked at $B240, nor one of the pieces listed at $0190); the car's state
  // ($0100-$018F) cleared, $2F $F0, its place in the middle of the piece's square and its heading
  // the piece's ($0125, $20 more for kinds 4 and $0A); the view and the piece set (CAMERA, $9A38,
  // SIDEWAYS, a STEP), then the car's height from $C345/$C3D0, from the crane's when $C37C is set
  // (and the crane's count $E6), its frame turned (TURN_POINTS), the wheels' springs at rest,
  // the view again, $C36B $AF and $C36C 8
  P.START_PLACE = r => {
    let x = r.x & 255;
    for (;;) {
      M[0x2E] = x; M[0xC374] = x;
      if (M[0xB240 + (M[0x0400 + x] & 0x0F)] & 0x80) { x = P.PIECE_BEHIND({ x }).x & 255; continue; }
      let hit = false;
      for (let y = M[0xC779] - 1; y >= 0; y--) if (M[0x0190 + y] === x) { hit = true; break; }
      if (hit) { x = P.PIECE_BEHIND({ x }).x & 255; continue; }
      break;
    }
    for (let y = 0; y < 0x90; y++) M[0x0100 + y] = 0;
    M[0x2F] = 0xF0;
    P.PIECE_LOAD({ x });
    M[0x0B] = M[0x044E + x] & 0x0F;
    M[0x0C] = M[0x044E + x] >> 4;
    M[0x0106] = M[0x0B] >> 1;
    M[0x0100] = 0; M[0x0102] = 0;
    M[0x0103] = (((M[0x0B] & 1) << 7) + 0x40) & 255;
    M[0x0108] = M[0x0C] >> 1;
    M[0x0105] = (((M[0x0C] & 1) << 7) + 0x40) & 255;
    M[0x0107] = 4;
    M[0x14] = (M[0xC3CD] === 4 || M[0xC3CD] === 0x0A) ? 0x20 : 0;
    M[0x0125] = ((M[0x1D] ^ M[0xA4]) + M[0x14]) & 255;
    P.STEP(P.SIDEWAYS(P.s_9A38(P.CAMERA({ x: M[0x14] }))));
    M[0x0107] = 0; M[0x0101] = 0;
    M[0x0104] = 0x10;
    M[0x14] = M[0xC345];
    let a = M[0xC3D0];
    if (M[0xC37C]) {
      M[0x15] = a; M[0x0107] = a;
      const c = M[0x14] >> 7;
      const lo = (M[0x14] << 1) & 255;
      M[0x0107] = ((M[0x0107] << 1) | c) & 255;
      const t = lo + 0x18;
      M[0x0104] = t & 255;
      M[0x0107] = (M[0x0107] + (t >> 8)) & 255;
      M[0x2F] = 0xE6;
      a = M[0x15];
    }
    M[0xC35E] = P.SHIFT16({ a, y: 0xFA }).a & 255;
    M[0xC35D] = M[0x14];
    P.TURN_POINTS({ y: 0 });
    for (let i = 2; i >= 0; i--) { M[0xC343 + i] = 0x10; M[0xC3CE + i] = 0; M[0xC340 + i] = 0; M[0x0145 + i] = 0; }
    P.CAMERA({ x: 0xFF });
    M[0xC36B] = 0xAF; M[0xC36C] = 0x08;
    return { a: 0x08 };
  };

  // CAR_GAP ($F585): the distance between the cars round the track: the opponent's piece's
  // distance less the player's ($0670/$06BE), plus their places in their pieces ($23/$C4 less
  // $22/$C3, over 8); the shorter way round of that and the track's length less it into $39/$3A,
  // and $C36A: its high byte, bit 7 flipped when the gap is shorter the other way
  P.CAR_GAP = r => {
    let t = M[0x23] - M[0x22]; M[0x14] = t & 255;
    let a = (M[0xC4] - M[0xC3] - (t < 0 ? 1 : 0)) & 255;
    M[0x15] = P.SHIFT16({ a, y: 3 }).a & 255;
    const x0 = M[0xC375], y0 = M[0xC374];
    t = M[0x0670 + x0] - M[0x0670 + y0]; M[0x16] = t & 255;
    M[0x17] = (M[0x06BE + x0] - M[0x06BE + y0] - (t < 0 ? 1 : 0)) & 255;
    t = M[0x16] + M[0x14]; M[0x14] = t & 255;
    a = (M[0x17] + M[0x15] + (t >> 8)) & 255;
    M[0x3B] = a;
    a = P.NEG16_IF_MINUS({ a, n: a >> 7, c: 0 }).a & 255;
    M[0x15] = a;
    t = M[0xC768] - M[0x14];
    let x = t & 255;
    let y = (M[0xC769] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    a = M[0x3B];
    if (!(y < M[0x15] || (y === M[0x15] && x < M[0x14]))) { x = M[0x14]; y = M[0x15]; a ^= 0x80; }
    M[0x39] = x; M[0x3A] = y;
    a ^= 0x80;
    M[0xC36A] = a;
    return { a, x, y };
  };

  // SAME_LAP ($F5E9): A 0 when both cars are on the same lap ($C378/$C379) and the same piece
  // counted from the start line ($C77C); else their difference, or the gap's sign $3B when only
  // the pieces match
  P.SAME_LAP = r => {
    let a = (M[0xC379] - M[0xC378]) & 255;
    if (a) return { a, z: 0, n: a >> 7 };
    for (let x = 1; x >= 0; x--) {
      let t = M[0xC374 + x] - M[0xC77C];
      if (t < 0) t += M[0xC764];
      M[0x14 + x] = t & 255;
    }
    a = (M[0x15] - M[0x14]) & 255;
    if (a) return { a, x: 0xFF, z: 0, n: a >> 7 };
    a = M[0x3B];
    return { a, x: 0xFF, z: a ? 0 : 1, n: a >> 7 };
  };

  // BOOST ($F60F): the boost while fire is held with the stick pushed ($66's low bits) or $C39B
  // bit 7 set, on the road ($C398 and $0E clear) and with some left ($C76A, in BCD): every
  // $C388 + 1 passes one is used and the two digits drawn; the flame on ($72 $80, $6E's low
  // bits) and the engine's push doubled ($0150/$0151). Otherwise the flame off.
  P.BOOST = r => {
    const on = !(M[0xC398] | M[0x0E]) && ((M[0xC39B] & 0x80) || (M[0x66] & 3)) && M[0xC76A];
    if (!on) {
      M[0x6E] &= 0xFC; M[0x72] = 0;
      return { a: 0 };
    }
    M[0xC36E] = (M[0xC36E] - 1) & 255;
    if (M[0xC36E] & 0x80) {
      M[0xC36E] = M[0xC388];
      // one less, in decimal (never from 0: that is no boost left)
      let lo = (M[0xC76A] & 0x0F) - 1, hi = M[0xC76A] >> 4;
      if (lo < 0) { lo = 9; hi = (hi - 1) & 0x0F; }
      const v = (hi << 4) | lo;
      M[0xC76A] = v;
      P.DIGIT({ a: v >> 4, x: 0x44 });
      P.DIGIT({ a: M[0xC76A] & 0x0F, x: 0x45 });
    }
    M[0x72] = 0x80;
    M[0x6E] |= 3;
    const c = M[0x0150] >> 7;
    M[0x0150] = (M[0x0150] << 1) & 255;
    M[0x0151] = ((M[0x0151] << 1) | c) & 255;
    return { a: M[0x6E] };
  };

  // The bar along the top of the dashboard: thirty character cells of the bitmap at $6000 from
  // $6028 (row 0, columns 5-34), ten parts of three cells, one for each of the ten that $C719
  // counts down from the start of a season. The patterns are at $80C8: $80C8-$80D7 a whole
  // part's last two cells, $80D8-$80E7 a holed one's, $80E8-$80EF the cell between, and
  // $80F8-$8107 the hole as it flashes when it is made.
  // BAR_BYTES ($F67E): eight bytes of the patterns from $80C8 + X into the bar at $6028 + Y, over
  // what is there ANDed with $16 (0 from here, $3F from BAR_HOLE and BAR_HOLE_LIT's second
  // cell, as it stands from BAR_WHOLE, which does sixteen from the start); X ends as Y's cell
  const bar = (x, y, n) => {
    M[0x14] = n; M[0x15] = y;
    do {
      M[0x6028 + y] = (M[0x6028 + y] & M[0x16]) | M[0x80C8 + x];
      y = (y + 1) & 255; x = (x + 1) & 255;
      M[0x14] = (M[0x14] - 1) & 255;
    } while (M[0x14]);
    return { a: M[0x15] >> 3, x: M[0x15] >> 3, y };
  };
  P.BAR_BYTES = r => { M[0x16] = 0; return bar(r.x & 255, r.y & 255, 8); };
  // BAR_HOLE ($F668) and BAR_HOLE_LIT ($F673): a holed part's two cells at Y, as it stays and
  // as it flashes
  P.BAR_HOLE = r => { const q = P.BAR_BYTES({ x: 0x10, y: r.y }); M[0x16] = 0x3F; return bar(0x18, q.y, 8); };
  P.BAR_HOLE_LIT = r => { const q = P.BAR_BYTES({ x: 0x30, y: r.y }); M[0x16] = 0x3F; return bar(0x38, q.y, 8); };
  // BAR_GAP ($F67C): the cell before a part's two
  P.BAR_GAP = r => P.BAR_BYTES({ x: 0x20, y: r.y });
  // BAR_WHOLE ($F686): a whole part's two cells
  P.BAR_WHOLE = r => bar(0, r.y & 255, 16);

  // DAMAGE_BAR ($F6A6): the bar drawn afresh: its thirty cells' colour 10 in colour RAM
  // ($D805-$D822), $C719 whole parts and holed ones after them
  P.DAMAGE_BAR = r => {
    for (let x = 0x1D; x >= 0; x--) P.wr(0xD805 + x, 0x0A);
    let y = 0, q;
    M[0x08] = M[0xC719];
    do {
      q = P.BAR_GAP({ y }); y = q.y;
      M[0x08] = (M[0x08] - 1) & 255;
      if (M[0x08] & 0x80) {
        q = P.BAR_GAP({ y }); q = P.BAR_GAP({ y: q.y });
        q = P.BAR_HOLE({ y: (q.y - 0x10) & 255 });
      } else q = P.BAR_WHOLE({ y });
      y = q.y;
    } while (y < 0xF0);
    return q;
  };

  // SAVE_CODE ($F6D7): the league's save code, made (A bit 7 clear) or read back (set). Made: the
  // random numbers $02-$06 kept at $801B, the twelve bytes at $AEB1 (among the drivers' names at
  // $AE00), EOR $3B, into $C700; then each of the 27 bytes $C700-$C71A is found in the run of RANDOM from there,
  // and the number of draws it took (two bytes) is what goes in the file ($8000 and $8025),
  // the random numbers at the end at $8020. Read: the random numbers put back from $801B and the
  // same draws made again, each byte the draw at its count; the numbers at the end must match
  // ($8020) and the bytes go back to $C700 (with several players, $31A1, only the last three)
  // and $AEB1. A run that takes 32,768 draws for one byte starts again with $03 set to $3B; reading,
  // that is a failure (carry set). A read with $C77E bit 7 clear does nothing.
  P.SAVE_CODE = r => {
    for (;;) {
      M[0x19] = r.a & 255;
      const read = M[0x19] & 0x80;
      for (let x = 4; x >= 0; x--) {
        if (!read) M[0x801B + x] = M[0x02 + x];
        else {
          if (!(M[0xC77E] & 0x80)) return { a: M[0xC77E], x, c: 0 };
          M[0x02 + x] = M[0x801B + x];
        }
      }
      if (!read) for (let x = 0x0B; x >= 0; x--) M[0xC700 + x] = M[0xAEB1 + x] ^ 0x3B;
      let fail = false;
      for (let x = 0x1A; x >= 0 && !fail; x--) {
        if (read) { M[0x17] = M[0x8000 + x]; M[0x16] = M[0x8025 + x]; }
        let y = 0;
        M[0x15] = 0;
        for (;;) {
          M[0x15] = (M[0x15] + 1) & 255;
          if (!M[0x15]) { y = (y + 1) & 255; if (y & 0x80) { fail = true; break; } }
          const a = P.RANDOM({ x }).a & 255;
          M[0x18] = a;
          if (!read) {
            if (a !== M[0xC700 + x]) continue;
            M[0x8000 + x] = y; M[0x8025 + x] = M[0x15];
            break;
          }
          if (y !== M[0x17] || M[0x15] !== M[0x16]) continue;
          M[0x4000 + x] = M[0x18];
          break;
        }
      }
      if (!fail) {
        for (let x = 4; x >= 0; x--) {
          const a = M[0x02 + x];
          if (!read) M[0x8020 + x] = a;
          else if (a !== M[0x8020 + x]) { fail = true; break; }
        }
      }
      if (!fail) {
        if (read) {
          for (let x = 0x1A; x >= 0; x--) if (!M[0x31A1] || x >= 0x18) M[0xC700 + x] = M[0x4000 + x];
          for (let x = 0x0B; x >= 0; x--) M[0xAEB1 + x] = M[0xC700 + x] ^ 0x3B;
        }
        M[0xC77E] = 0x80;
        return { a: 0x80, c: 0 };
      }
      M[0x03] = 0x3B;
      if (read) return { a: M[0x19], c: 1 };
    }
  };

  // READ_CONTROLS ($F79E): the controls into $66 (bit 0 forward, 1 back, 2 left, 3 right, 4 fire):
  // the five keys at $F807 first, their bits put in the stick's order; with none, the joystick
  // in port 2, and with that idle, outside the race ($3DF8 bit 7 clear) key 8 as fire. RANDOM is
  // drawn every time, and $F810 counts the reads that found no key.
  P.READ_CONTROLS = r => {
    M[0x15] = 0x10; M[0x14] = 0;
    P.RANDOM({});
    for (let y = 4; y >= 0; y--) {
      if (P.KEY_PRESSED({ x: M[0xF807 + y] }).z) M[0x14] |= M[0x15];
      M[0x15] >>= 1;
    }
    const k = M[0x14];
    let y = k;
    if (k & 0x10) y |= 1;
    if (k & 0x02) y |= 0x10;
    if (k & 0x01) y = (y | 2) & 0xFE;
    let a = y;
    if (!a) {
      M[0xF810] = (M[0xF810] + 1) & 255;
      P.wr(0xDC02, 0);
      a = P.rd(0xDC00) ^ 0xFF;
      if (!a) {
        y = M[0x3DF8];
        if (!(y & 0x80)) a = P.KEY_PRESSED({ x: 8 }).z ? 0x10 : 0;
      }
    }
    a &= 0x1F;
    M[0x66] = a;
    return { a, z: a ? 0 : 1 };
  };

  // TIME_PENALTY ($F811): car X off the track short of the line ($C3 + X clear): the part of the
  // piece it missed ($22 + X turned over, times 14 over 256, as decimal) added to its time
  P.TIME_PENALTY = r => {
    const x = r.x & 255;
    if (M[0xC3 + x]) return { a: M[0xC3 + x], x };
    M[0x15] = M[0x22 + x] ^ 0xFF;
    let a = P.MUL8({ a: 0x0E }).a & 255;
    if (a >= 0x0A) a = (a + 6) & 255;
    return P.ADD_TO_CLOCK({ a, x });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
