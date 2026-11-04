// The opponent's car ($E0F9-$E85A): where its corners are on the track each pass, and how it is
// drawn: a frame from two of its projected corners, an end, two sides and a roof, each a few lines
// into the view; and the engine's note, and the effects stopped.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.car = P => {
  const M = P.M;
  const neg = v => (0 - v) & 255;
  const n7 = v => (v >> 7) & 1;

  // STOP_EFFECTS ($E0F9): the three effects stopped (command $15, slots 2, 1, 0)
  P.STOP_EFFECTS = r => {
    let q = {};
    for (let x = 2; x >= 0; x--) q = P.DISPATCH({ a: 0x15, x });
    return Object.assign({}, q, { x: 0xFF });
  };

  // ENGINE_SOUND ($E104): the engine's note. The aim is the speed along the road ($0156/$0159,
  // its size) while $6A is set, otherwise 0, or $C8 while $66 has either of its low bits; plus 5.
  // An eighth of the gap from the note $09/$0A to the aim is the step $10/$11 the interrupt adds,
  // held to $0100 going up and to $FF00 going down ($FFE0 while $6A is clear, unless the step is
  // smaller). Voices 1 and 3's pulse widths at random, and the filter's cut-off from the aim.
  P.ENGINE_SOUND = r => {
    let a;
    if (!M[0x6A]) {
      M[0x14] = 0;
      a = (M[0x66] & 3) ? 0xC8 : 0;
    } else {
      M[0x14] = M[0x0156] & 0xF0;
      const v = M[0x0159];
      a = P.NEG16_IF_MINUS({ a: v, n: n7(v), c: 0 }).a;
    }
    a = (a + 5) & 255;
    M[0x16] = a;
    for (let i = 0; i < 3; i++) { const c = a & 1; a >>= 1; M[0x14] = (M[0x14] >> 1) | (c << 7); }
    M[0x15] = a;
    // the engine's note, which the interrupt moves on each frame
    const t = M[0x14] - P.irqByte(0x09); M[0x14] = t & 255;
    a = (M[0x15] - P.irqByte(0x0A) - (t < 0 ? 1 : 0)) & 255;
    a = P.SHIFT16({ a, y: 3 }).a & 255;
    M[0x11] = a; M[0x10] = M[0x14];
    let y = a, x = M[0x14], set = null;
    if (a & 0x80) {
      y = M[0x6A];
      if (y) { if (a !== 0xFF) set = [0, 0xFF]; }
      else if (a !== 0xFF || M[0x10] < 0xE0) set = [0xE0, 0xFF];
    } else if (a) set = [0, 1];
    if (set) { x = set[0]; M[0x11] = set[1]; M[0x10] = x; }
    a = P.RANDOM({}).a & 0x3F;
    P.wr(0xD402, a); P.wr(0xD410, a);
    a = M[0x16];
    if (a >= 0x64) a = 0x63;
    a = (a << 1) + 0x20;
    if (a < 0x6E) a = 0x6E;
    P.wr(0xD416, a);
    return { a, x, y };
  };

  // OPP_DRAW_HERE ($E195): the opponent drawn where the track's drawing reaches its piece, unless
  // $C36A bit 7 is set or the cars are less than 10 apart ($39/$3A); with $6B bit 7 set and $2F
  // clear it is only marked ($C366) to be drawn later
  P.OPP_DRAW_HERE = r => {
    if (M[0xC36A] & 0x80) return { a: M[0xC36A] };
    if (!M[0x3A] && M[0x39] < 0x0A) return { a: M[0x39] };
    if (!M[0x2F] && (M[0x6B] & 0x80)) { M[0xC366] = M[0x6B]; return { a: M[0x6B] }; }
    return P.DRAW_OPPONENT(r);
  };

  // DRAW_OPPONENT ($E1B1): the opponent's car drawn: its corners projected into points $3C-$3F;
  // $C3DA set when either pair's first point is above its second on the screen; then its frame,
  // end, sides and roof, into the fill's tables first when $C3DA is set or the car's place
  // ($37/$38) is behind any of $07CC-$07CE; the line drawer's colour ($C3AB) put back after
  P.DRAW_OPPONENT = r => {
    M[0xC366] >>= 1;
    M[0x61] = 0; M[0x60] = 0xFF;
    P.PROJECT_CORNER({ y: 5, x: 0x3C });
    P.PROJECT_CORNER({ y: 7, x: 0x3E });
    P.PROJECT_CORNER({ y: 8, x: 0x3D });
    P.PROJECT_CORNER({ y: 0x0A, x: 0x3F });
    for (let x = 2; x >= 0; x -= 2) {
      const t = M[0xA288 + x] - M[0xA289 + x];
      if ((M[0xA320 + x] - M[0xA321 + x] - (t < 0 ? 1 : 0)) & 0x80) M[0xC3DA] = 0x80;
    }
    const keep = M[0xC3AB];
    end: {
      if (P.CAR_FRAME({ x: 0x3C }).c) break end;
      let behind = false;
      for (let x = 2; x >= 0; x--) {
        const t = M[0x37] - M[0x07CC + x];
        if ((M[0x38] - M[0x07D0 + x] - (t < 0 ? 1 : 0)) & 0x80) { behind = true; break; }
      }
      if (!behind && !(M[0xC3DA] & 0x80) && M[0xC9]) {
        P.CAR_SIDES({});
        if (P.CAR_FRAME({ x: 0x3D }).c) break end;
        P.CAR_ROOF({});
        break end;
      }
      if (behind) M[0x6D] = 0x80;
      M[0xC303] = 0x80;
      P.LINE_MODE_CAR({});
      P.CAR_SIDES({});
      let q = P.CAR_FRAME({ x: 0x3D });
      if (!q.c) {
        if (M[0xC3DA] & 0x80) { P.LINE_LIMIT_HIDE({}); P.COPY_LIMITS({}); } else P.LINE_LIMIT({});
        q = P.CAR_ROOF({});
      }
      P.CMD_MARK_COLUMNS({ x: q.x, y: q.y });
      P.LINE_MODE_TRACK({});
    }
    return P.LINE_COLOUR({ x: keep });
  };

  // CAR_FRACTIONS ($E25D): a half, a quarter and an eighth of each of $E8-$EB, signed, into
  // $EC-$EF, $F0-$F3 and $F4-$F7
  P.CAR_FRACTIONS = r => {
    let y = 0;
    for (let x = 3; x >= 0; x--) {
      let a = M[0xE8 + x];
      if (a & 0x80) a = neg(a);
      a >>= 1; M[0xEC + x] = a; a >>= 1; M[0xF0 + x] = a; a >>= 1; M[0xF4 + x] = a;
      y = M[0xE8 + x];
      if (y & 0x80) {
        M[0xEC + x] = neg(M[0xEC + x]); M[0xF0 + x] = neg(M[0xF0 + x]); M[0xF4 + x] = neg(M[0xF4 + x]);
      }
    }
    return { a: M[0xF4], x: 0xFF, y };
  };

  // CAR_SIDES ($E294): the sides and the end, the nearer side last by $EA's sign
  P.CAR_SIDES = r => {
    if (M[0xEA] & 0x80) { P.CAR_SIDE_A({}); P.CAR_END({}); return P.CAR_SIDE_B({}); }
    P.CAR_SIDE_B({}); P.CAR_END({}); return P.CAR_SIDE_A({});
  };

  // CAR_END ($E2AA): the end's corners at points $44-$47 (around the centre by the halves,
  // quarters and eighths), placed, copied to $40-$43 and drawn
  P.CAR_END = r => {
    P.LINE_COLOUR({ x: 1 });
    M[0xA247] = (M[0xEC] - M[0xED]) & 255;
    M[0xA293] = (M[0xEE] - M[0xEF]) & 255;
    M[0xA244] = (0 - M[0xEC] - M[0xED]) & 255;
    M[0xA290] = (0 - M[0xEE] - M[0xEF]) & 255;
    M[0xA246] = (M[0xE9] + M[0xF0] + M[0xF4]) & 255;
    M[0xA292] = (M[0xEB] + M[0xF2] + M[0xF6]) & 255;
    M[0xA245] = (M[0xE9] - M[0xF0] - M[0xF4]) & 255;
    M[0xA291] = (M[0xEB] - M[0xF2] - M[0xF6]) & 255;
    P.PLACE_POINTS({ x: 4 });
    for (let x = 3; x >= 0; x--) { M[0xA240 + x] = M[0xA244 + x]; M[0xA28C + x] = M[0xA290 + x]; }
    return P.CAR_PANEL({});
  };

  // PLACE_POINTS ($E31A): four points from X, each offset (doubled when $FC is set) added to the
  // centre $F8/$F9 and $FA/$FB and held to 0-255
  const place = (o, c) => {
    let a = M[o], h = (a & 0x80) ? 0xFF : 0;
    if (M[0xFC] & 0x80) { h = ((h << 1) | (a >> 7)) & 255; a = (a << 1) & 255; }
    M[0x15] = h;
    const t = a + M[c];
    let y = t & 255;
    const hi = (h + M[c + 1] + (t >> 8)) & 255;
    if (hi) y = (hi & 0x80) ? 0 : 0xFF;
    M[o] = y;
    return y;
  };
  P.PLACE_POINTS = r => {
    let x = r.x & 255, y = 0;
    M[0x08] = 4;
    do {
      place(0xA240 + x, 0xF8);
      y = place(0xA28C + x, 0xFA);
      x = (x + 1) & 255;
      M[0x08] = (M[0x08] - 1) & 255;
    } while (M[0x08]);
    return { a: y, x, y };
  };

  // CAR_SIDE_A ($E372): with the centre at $40 or right of it, the side from -$E8, -$EA
  P.CAR_SIDE_A = r => {
    if (M[0xF8] < 0x40) return { a: M[0xF8], c: 0 };
    M[0xD9] = neg(M[0xE8]);
    return P.CAR_PANEL_AT({ a: neg(M[0xEA]) });
  };
  // CAR_SIDE_B ($E388): with the centre left of $C0, the side from $E8 - $EC, $EA - $EE
  P.CAR_SIDE_B = r => {
    if (M[0xF8] >= 0xC0) return { a: M[0xF8], c: 1 };
    M[0xD9] = (M[0xE8] - M[0xEC]) & 255;
    return P.CAR_PANEL_AT({ a: (M[0xEA] - M[0xEE]) & 255 });
  };
  // CAR_PANEL_AT ($E39A): a side's corners at points $40-$43 from $D9 and A ($DA), placed and drawn
  P.CAR_PANEL_AT = r => {
    M[0xDA] = r.a & 255;
    P.LINE_COLOUR({ x: 0 });
    const d9 = M[0xD9], da = M[0xDA];
    M[0xA241] = d9; M[0xA242] = (d9 + M[0xEC]) & 255;
    M[0xA28D] = da; M[0xA28E] = (da + M[0xEE]) & 255;
    const a0 = (d9 - M[0xE9]) & 255;
    M[0xA240] = a0; M[0xA243] = (a0 + M[0xEC]) & 255;
    const b0 = (da - M[0xEB]) & 255;
    M[0xA28C] = b0; M[0xA28F] = (b0 + M[0xEE]) & 255;
    P.PLACE_POINTS({ x: 0 });
    return P.CAR_PANEL({});
  };
  // CAR_PANEL ($E3D8): edges 40-43 and 41-42 for the fill, lines 43-42 and 40-41
  P.CAR_PANEL = r => {
    P.LINE_SPAN({ x: 0x40, y: 0x43 });
    if (M[0xEA] & 0x80) { P.LINE_ON_SCREEN({ x: 0x40, y: 0x41 }); P.LINE_ON_SCREEN({ x: 0x43, y: 0x42 }); }
    else { P.LINE_ON_SCREEN({ x: 0x43, y: 0x42 }); P.LINE_ON_SCREEN({ x: 0x40, y: 0x41 }); }
    return P.LINE_SPAN({ x: 0x41, y: 0x42 });
  };

  // CAR_FRAME ($E409): the frame from points X and X+2: half their gap each way into $51/$77
  // (across) and $52/$78 (down); the sizes, held to $5A, into $EB and $EA, halved again when
  // either is $40 or more ($FC = $FF), signed: $E8 and $EB across, $E9 (a quarter) and $EA down;
  // the centre into $F8/$F9 and $FA/$FB; carry set when it is off the screen, else CAR_FRACTIONS
  const half = (lo, hi) => {
    const t = M[lo + 2] - M[lo]; let l = t & 255;
    const d = (M[hi + 2] - M[hi] - (t < 0 ? 1 : 0)) & 255;
    const h = ((d >> 1) | (d & 0x80)) & 255;
    l = (l >> 1) | ((d & 1) << 7);
    return [l, h];
  };
  const size = (l, h) => {
    M[0x14] = l;
    const a = P.NEG16_IF_MINUS({ a: h, n: n7(h), c: 0 }).a;
    if (a) return 0x5A;
    return M[0x14] < 0x5B ? M[0x14] : 0x5A;
  };
  P.CAR_FRAME = r => {
    const x = r.x & 255;
    const [l1, h1] = half(0xA200 + x, 0xA298 + x);
    M[0x51] = l1; M[0x77] = h1;
    const [l2, h2] = half(0xA24C + x, 0xA2E4 + x);
    M[0x52] = l2; M[0x78] = h2;
    let y = 0;
    M[0xEB] = size(M[0x51], M[0x77]);
    M[0xEA] = size(M[0x52], M[0x78]);
    const m = M[0xEA] >= M[0xEB] ? M[0xEA] : M[0xEB];
    if (m >= 0x40) { M[0xEB] >>= 1; M[0xEA] >>= 1; y = 0xFF; }
    M[0xFC] = y;
    M[0xE8] = M[0xEB];
    if (M[0x77] & 0x80) M[0xE8] = neg(M[0xE8]); else M[0xEB] = neg(M[0xEB]);
    M[0xE9] = M[0xEA] >> 2;
    if (M[0x78] & 0x80) { M[0xE9] = neg(M[0xE9]); M[0xEA] = neg(M[0xEA]); }
    let t = M[0xA200 + x] + M[0x51];
    M[0xF8] = t & 255;
    M[0xF9] = (M[0xA298 + x] + M[0x77] + (t >> 8)) & 255;
    if (M[0xF9]) return { a: M[0xF9], x, y, c: 1 };
    t = M[0xA24C + x] + M[0x52];
    M[0xFA] = t & 255;
    M[0xFB] = (M[0xA2E4 + x] + M[0x78] + (t >> 8)) & 255;
    if (M[0xFB]) return { a: M[0xFB], x, y, c: 1 };
    return Object.assign(P.CAR_FRACTIONS({}), { c: 0 });
  };

  // OPP_CORNERS ($E4DA): the opponent's corners on the track: its segment 64 back, the heights of
  // its piece's points ($48-$4B, $5B, $DC) and the next piece's ($DD/$DE, $DF), the segment's
  // points ($C500-$C503) and the car's place along it ($C504/$C506), its width from the gap
  // between the cars ($A620), its line's left and right ($C505, $C507), and its body (OPP_BODY).
  // Ends with OPP_SEGMENT from $FF, or from 0 when $6B bit 7 is set.
  P.OPP_CORNERS = r => {
    let q = P.OPP_SEGMENT({ a: 0x40 });
    M[0xD4] = q.x & 255; M[0xD5] = q.a & 255; M[0x9C] = q.y & 255;
    P.PIECE_ORIGIN(P.PIECE_LOAD({ x: q.x }));
    M[0x3D] = (M[0x68] - M[0x1D]) & 255;
    let x = (M[0xD5] << 1) & 255;
    q = P.POINT_HEIGHT({ x }); M[0x48] = q.a & 255; M[0x5B] = M[0x15] >> 5; x = (q.x + 1) & 255;
    q = P.POINT_HEIGHT({ x }); M[0x49] = q.a & 255; x = (q.x + 1) & 255;
    q = P.POINT_HEIGHT({ x }); M[0x4A] = q.a & 255; M[0xDC] = M[0x15] >> 5; x = (q.x + 1) & 255;
    q = P.POINT_HEIGHT({ x }); M[0x4B] = q.a & 255; x = (q.x + 1) & 255;
    if (x < M[0x9E]) P.PIECE_HEIGHTS_AHEAD({ x });
    else {
      P.PIECE_LOAD(P.PIECE_AHEAD({}));
      P.PIECE_HEIGHTS_AHEAD({ x: 2 });
      P.PIECE_LOAD(P.PIECE_BEHIND({}));
    }
    P.OPP_SEGMENT_POINTS({ a: M[0xD5] });
    P.OPP_ALONG({ y: 4, x: 0 });
    P.OPP_ALONG({ y: 6, x: 1 });
    M[0xC30B] >>= 1;
    q = P.OPP_GAP({ x: 0, y: 1 });
    const y = (((q.a & 1) << 7) | (M[0x14] >> 1)) >> 3;
    M[0xC34D] = M[0xA620 + y];
    M[0x4D] = M[0x9C];
    M[0x4C] = (M[0xB0] - M[0xC34D]) & 255;
    P.OPP_ROAD_HEIGHT({ x: 0 });
    P.OPP_ALONG_AT({ y: 5, x: 4, a: M[0x4C] });
    M[0x4C] = (M[0xB0] + M[0xC34D]) & 255;
    P.OPP_ROAD_HEIGHT({ x: 1 });
    P.OPP_ALONG_AT({ y: 7, x: 4, a: M[0x4C] });
    P.OPP_BODY({});
    return P.OPP_SEGMENT({ a: (M[0x6B] & 0x80) ? 0 : 0xFF });
  };

  // OPP_SEGMENT ($E5A1): the piece and segment A behind the opponent's place ($23/$C4): the piece
  // into $2E and $A6, from $C375 or, when that runs back past the piece's start, the one before it
  // (PIECE_BEHIND, F02F); the segment into $A3 ($BE less 1 then) and $18
  P.OPP_SEGMENT = r => {
    M[0x14] = r.a & 255;
    let x = M[0xC375];
    M[0x2E] = x;
    const t = M[0x23] - M[0x14];
    M[0x18] = t & 255;
    let a = (M[0xC4] - (t < 0 ? 1 : 0)) & 255;
    if (a & 0x80) {
      x = P.PIECE_LOAD(P.PIECE_BEHIND({})).x & 255;
      a = (M[0xBE] - 1) & 255;
    }
    M[0xA3] = a; M[0xA6] = x;
    return { a, x, y: M[0x18] };
  };

  // PIECE_HEIGHTS_AHEAD ($E5C7): points X and X+1's heights ($9C14) into $DD and $DE, $DF from the
  // first's top bits
  P.PIECE_HEIGHTS_AHEAD = r => {
    let q = P.POINT_HEIGHT({ x: r.x });
    M[0xDD] = q.a & 255; M[0xDF] = M[0x15] >> 5;
    q = P.POINT_HEIGHT({ x: (q.x + 1) & 255 });
    M[0xDE] = q.a & 255;
    return q;
  };

  // POINT_ALONG ($E5DC): point Y = point X + (point X+2 - point X) * $17 / 128, from X+2 to X+4
  // with $C30B bit 7 set; the gap's low byte only is scaled, halved first, and its sign put back
  P.POINT_ALONG = r => {
    let x = r.x & 255;
    const y = r.y & 255;
    const t = M[0xC502 + x] - M[0xC500 + x]; M[0x14] = t & 255;
    const t2 = M[0xC512 + x] - M[0xC510 + x] - (t < 0 ? 1 : 0), d = t2 & 255;
    const sn = n7(d), sc = t2 >= 0 ? 1 : 0;
    let a = P.NEG16_IF_MINUS({ a: d, n: sn, c: sc }).a & 255;
    M[0x14] = (M[0x14] >> 1) | ((a & 1) << 7);
    M[0x15] = M[0x17];
    a = P.MUL8({ a: M[0x14] }).a & 255;
    const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
    const hi = ((a << 1) | c) & 255, c2 = a >> 7;
    M[0x14] = hi;
    a = P.NEG16_IF_MINUS({ a: c2, n: sn, c: sc }).a & 255;
    M[0x15] = a;
    if (M[0xC30B] & 0x80) {
      P.POINT_PLUS({ x: (x + 2) & 255, y });
      return { a: M[0xC510 + y], x, y };
    }
    return P.POINT_PLUS({ x, y });
  };
  // POINT_PLUS ($E616): point Y = point X + $14/$15
  P.POINT_PLUS = r => {
    const x = r.x & 255, y = r.y & 255;
    const t = M[0xC500 + x] + M[0x14];
    M[0xC500 + y] = t & 255;
    const a = (M[0xC510 + x] + M[0x15] + (t >> 8)) & 255;
    M[0xC510 + y] = a;
    return { a, x, y };
  };
  // OPP_ALONG ($E628): the opponent's place along ($9C) plus wheel X's offset ($C30D), into point
  // Y; $C30B bit 7 from the carry: past the segment's end
  P.OPP_ALONG = r => {
    const x = r.x & 255;
    const t = M[0x9C] + M[0xC30D + x];
    M[0xC30B] = (M[0xC30B] >> 1) | (t > 255 ? 0x80 : 0);
    return P.OPP_ALONG_AT({ a: t & 255, x, y: r.y });
  };
  // OPP_ALONG_AT ($E631): point Y set A parts in 128 of the way from point X to X+2, both ways
  P.OPP_ALONG_AT = r => {
    M[0x17] = r.a & 255;
    const q = P.POINT_ALONG({ x: r.x, y: r.y });
    return P.POINT_ALONG({ x: (q.x | 0x20) & 255, y: (q.y | 0x20) & 255 });
  };
  // PROJECT_CORNER ($E641): point Y of $C500-$C530 projected as point X
  P.PROJECT_CORNER = r => {
    const x = r.x & 255, y = r.y & 255;
    M[0x51] = M[0xC500 + y]; M[0x77] = M[0xC510 + y];
    M[0x52] = M[0xC520 + y]; M[0x78] = M[0xC530 + y];
    P.PROJECT_X({ x });
    P.PROJECT_Y({ x });
    return P.ROLL_POINT({ x });
  };

  // OPP_BODY ($E65E): the car's front and back: the direction $C505 to $C507 times 1.5 (across
  // into $57/$44, along into $56/$43), corners $C508 and $C50A set out from $C505 and $C507 at
  // right angles by it; the place moved on half a segment ($4D), into the next piece's heights
  // when it runs over; FF94 with X = 2 on the line $B0
  P.OPP_BODY = r => {
    let y = 0;
    for (let x = 1; x >= 0; x--) {
      const t = M[0xC507 + y] - M[0xC505 + y];
      const lo = t & 255;
      M[0x56 + x] = lo;
      const hi = (M[0xC517 + y] - M[0xC515 + y] - (t < 0 ? 1 : 0)) & 255;
      M[0x43 + x] = hi;
      const h2 = ((hi >> 1) | (hi & 0x80)) & 255, l2 = (lo >> 1) | ((hi & 1) << 7);
      const s = lo + l2;
      M[0x56 + x] = s & 255;
      M[0x43 + x] = (hi + h2 + (s >> 8)) & 255;
      y = 0x20;
    }
    for (let x = 2; x >= 0; x -= 2) {
      let t = M[0xC505 + x] - M[0x56];
      M[0xC508 + x] = t & 255;
      M[0xC518 + x] = (M[0xC515 + x] - M[0x43] - (t < 0 ? 1 : 0)) & 255;
      t = M[0xC525 + x] + M[0x57];
      M[0xC528 + x] = t & 255;
      M[0xC538 + x] = (M[0xC535 + x] + M[0x44] + (t >> 8)) & 255;
    }
    const t = M[0x9C] + 0x80;
    M[0x4D] = t & 255;
    if (t > 255) {
      M[0x48] = M[0x4A]; M[0x5B] = M[0xDC]; M[0x49] = M[0x4B];
      M[0x4A] = M[0xDD]; M[0xDC] = M[0xDF]; M[0x4B] = M[0xDE];
    }
    M[0x4C] = M[0xB0];
    return P.OPP_ROAD_HEIGHT({ x: 2, y: M[0xE6E5] });
  };

  // CAR_ROOF ($E6E8): the roof's corners at points $48-$4B from the halves $EC-$EF, placed; then
  // the pillars, the roof's edges and the sides in the order that leaves the far ones hidden: by
  // the end against the roof across ($A245/$A246, $A249/$A24A) and down ($A291/$A292,
  // $A295/$A296), and $C3DA, which also puts the roof into the fill's tables (FCB3)
  const line = (x, y) => P.LINE_ON_SCREEN({ x, y });
  const PILLARS_44_45 = () => { line(0x44, 0x48); return line(0x45, 0x49); };
  const PILLARS_47_46 = () => { line(0x47, 0x4B); return line(0x46, 0x4A); };
  P.PILLARS_44_45 = r => PILLARS_44_45();
  P.PILLARS_47_46 = r => PILLARS_47_46();
  P.ROOF_EDGE_49 = r => line(0x49, 0x4A);
  P.PILLAR_44 = r => line(0x44, 0x48);
  P.PILLAR_47 = r => line(0x47, 0x4B);
  P.ROOF_EDGE_48 = r => line(0x48, 0x4B);
  P.PILLAR_45 = r => line(0x45, 0x49);
  P.PILLAR_46 = r => line(0x46, 0x4A);
  P.CAR_ROOF = r => {
    P.LINE_COLOUR({ x: 1 });
    M[0xA24A] = M[0xEC]; M[0xA24B] = (M[0xEC] - M[0xED]) & 255;
    M[0xA296] = M[0xEE]; M[0xA297] = (M[0xEE] - M[0xEF]) & 255;
    M[0xA249] = neg(M[0xEC]); M[0xA248] = (M[0xA249] - M[0xED]) & 255;
    M[0xA295] = neg(M[0xEE]); M[0xA294] = (M[0xA295] - M[0xEF]) & 255;
    P.PLACE_POINTS({ x: 8 });
    const below = M[0xC3DA] & 0x80;
    if (M[0xA246] < M[0xA24A]) {
      if (!below) {
        P.PILLARS_47_46({});
        if (M[0xA295] < M[0xA291]) { P.PILLAR_45({}); P.ROOF_EDGE_49({}); P.PILLAR_44({}); }
        P.CAR_SIDE_B({}); return P.CAR_SIDE_A({});
      }
      P.ROOF_EDGE_48({}); P.PILLAR_44({}); P.PILLAR_47({}); P.COPY_LIMITS({});
      P.CAR_SIDE_A({}); P.CAR_SIDE_B({}); return P.PILLAR_46({});
    }
    if (M[0xA245] < M[0xA249]) {
      if (!below) {
        P.PILLARS_47_46({}); P.PILLARS_44_45({}); P.ROOF_EDGE_49({});
        P.CAR_SIDE_A({}); return P.CAR_SIDE_B({});
      }
      P.ROOF_EDGE_48({}); P.PILLAR_44({}); P.PILLAR_47({}); P.COPY_LIMITS({});
      P.CAR_SIDE_A({}); return P.CAR_SIDE_B({});
    }
    if (!below) {
      P.PILLARS_44_45({});
      if (M[0xA296] < M[0xA292]) { P.PILLAR_46({}); P.ROOF_EDGE_49({}); P.PILLAR_47({}); }
      P.CAR_SIDE_A({}); return P.CAR_SIDE_B({});
    }
    P.ROOF_EDGE_48({}); P.PILLAR_47({}); P.PILLAR_44({}); P.COPY_LIMITS({});
    P.CAR_SIDE_B({}); P.CAR_SIDE_A({}); return P.PILLAR_45({});
  };

  // OPP_SEGMENT_POINTS ($E808): the four points of segment A of the piece at ($9A) into
  // $C500-$C503 (PIECE_POINT from the point table seven bytes in), from the far end when the piece
  // is driven backwards ($A4)
  P.OPP_SEGMENT_POINTS = r => {
    M[0x16] = r.a & 255;
    const p = M[0x9A] | M[0x9B] << 8;
    M[0x9F] = (M[p] + 7) & 255;
    let q;
    if (!M[0xA4]) {
      let y = ((M[0x16] << 3) + M[0x9F]) & 255, x = 0;
      do { q = P.SEGMENT_POINT({ x, y }); x = (q.x + 1) & 255; y = q.y & 255; } while (x !== 4);
      return Object.assign({}, q, { x });
    }
    let y = ((((M[0xBE] - M[0x16] - 1) & 255) << 3) + M[0x9F]) & 255, x = 3;
    do { q = P.SEGMENT_POINT({ x, y }); x = (q.x - 1) & 255; y = q.y & 255; } while (!(x & 0x80));
    return Object.assign({}, q, { x });
  };
  // SEGMENT_POINT ($E843): point Y of the piece (PIECE_POINT) into slot X of $C500-$C530
  P.SEGMENT_POINT = r => {
    const q = P.PIECE_POINT_IN_VIEW({ x: r.x, y: r.y });
    const x = q.x & 255;
    M[0xC500 + x] = M[0x51]; M[0xC510 + x] = M[0x77];
    M[0xC520 + x] = M[0x52]; M[0xC530 + x] = M[0x78];
    return Object.assign({}, q, { a: M[0x78] });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
