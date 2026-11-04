// The track drawn into the view ($164D-$1B87): a frame's view started, the pieces of track ahead
// taken one by one from the one the car is on, each piece's points put in the tables at $A200-$A35F
// and $8040-$80BF, joined by lines, and the gaps filled.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.track = P => {
  const M = P.M;
  const ind = (z, y) => M[((M[z] | M[z + 1] << 8) + y) & 0xFFFF];

  // NEW_VIEW ($164D): the view's limits for a new frame: the top and bottom limits of each column
  // ($C640/$C680) from those kept at $C280/$C2C0, the edges at $0280/$02C0 cleared, the view
  // cleared to colour 3 with the bonnet put back (command $45), then $F1DC, and the flags $C3A9,
  // $C3DA, $6D and $C303 cleared
  P.NEW_VIEW = r => {
    for (let x = 0x3F; x >= 0; x--) {
      M[0xC640 + x] = M[0xC280 + x]; M[0xC680 + x] = M[0xC2C0 + x];
      M[0x0280 + x] = 0; M[0x02C0 + x] = 0;
    }
    P.CMD_CLEAR_VIEW({});
    P.CAMERA({});
    M[0xC3A9] = 0; M[0xC3DA] = 0; M[0x6D] = 0; M[0xC303] = 0;
    return { a: 0 };
  };

  // DRAW_VIEW ($167A): draws the frame's view of the track: from the piece the car is on ($2E, kept
  // at $C374), piece after piece ahead (DRAW_PIECE, POINTS_TO_LINES, NEXT_PIECE), five more on a
  // track's last stretch or while lowered, fewer near Draw Bridge's gap; the opponent's car is
  // drawn among them in a league race. Off the track ($FF6A, $F117) the car is wrecked ($6B). Then
  // the horizon, the fills and the sky.
  P.DRAW_VIEW = r => {
    P.NEW_VIEW({});
    if (!M[0x2F] && (M[0x6B] & 0x80)) P.DUST_WRECKED({});
    M[0x0B] = 0; M[0x0C] = 0;
    let o = P.SQUARE_PIECE({});
    let piece = -1;
    if (!o.c) {
      if ((o.a & 255) !== 0xFF) piece = o.a & 255;
      else { o = P.PIECE_NEIGHBOUR({ a: M[0xAF], y: M[0xB1] }); if ((o.a & 255) !== 0xFF) piece = o.a & 255; }
    }
    if (piece < 0) {
      M[0x6B] = 0xC0;
      if (M[0xC76C] & 0x80) { P.OPPONENT_MOVE({}); P.OPP_CORNERS({}); }
    } else {
      M[0x2E] = piece;
      P.s_9A38({}); P.SIDEWAYS({});
      M[0xC374] = M[0x2E];
      if (!(M[0x6B] & 0x40)) M[0xC309] = M[0x2E];
      P.s_9C79({});
      M[0xCC] = 0x80; M[0xCD] = 0x80;
      if (M[0xC76C] & 0x80) { P.OPPONENT_MOVE({}); P.CAR_GAP({}); P.OPPONENT_LINE({}); P.OPP_CORNERS({}); }
      M[0x2E] = M[0xC374];
      M[0xD0] = 0;
      if (M[0x8E] & 0x80) { P.PIECE_AHEAD({}); M[0x8E] = 0; }
      if (!M[0x8E]) {
        const k = P.PIECE_BEHIND({});
        if ((k.x & 255) === M[0xA6]) P.OPP_DRAW_HERE({});
        P.PIECE_AHEAD({});
      }
      P.DRAW_PIECE({}); P.CLIP_NEAR({}); P.POINTS_TO_LINES({});
      M[0x27] = 0; M[0xD0] = 2;
      P.NEXT_PIECE({});
      P.PIECE_AHEAD({}); P.DRAW_PIECE({}); P.POINTS_TO_LINES({}); P.NEXT_PIECE({});
      let a = 2;
      if (M[0xC77D] === 5) {
        const d = (0x31 - M[0xC374]) & 255;
        if (d < 3) a = d + 2;
      }
      if (M[0x2F]) a = 5;
      M[0x28] = a;
      do { P.PIECE_AHEAD({}); P.DRAW_PIECE({}); P.POINTS_TO_LINES({}); P.NEXT_PIECE({}); } while (--M[0x28]);
    }
    P.CMD_COLUMN_LIMITS({});
    P.CMD_FILL_SPANS({});
    if (M[0xC303] & 0x80) {
      for (let x = M[0x60]; x <= M[0x61]; x++) {
        if (M[0xC500 + x] < M[0xC600 + x]) M[0xC600 + x] = M[0xC500 + x];
        if (x === 0xFF) break;
      }
    }
    return P.CMD_FILL_ABOVE({});
  };

  // DRAW_PIECE ($177D): piece X = $2E: its place and its points worked out ($F02F, $F0C5,
  // PIECE_POINTS), which way it is seen ($C3A8: bit 7 behind, bit 6 from its far side), and its
  // points projected and drawn into the view ($A026, $2458, $25EA, OVERLAP), near to far or far
  // to near, then its far end's points kept for the next piece
  P.DRAW_PIECE = r => {
    P.PIECE_LOAD({ x: M[0x2E] });
    P.PIECE_ORIGIN({ x: M[0x2E] });
    M[0x3D] = (M[0x68] - M[0x1D]) & 255;
    P.PIECE_POINTS({});
    let x = M[0x27];
    if (x) { M[0xC396] = M[0xA32E + x]; M[0xC397] = M[0xA32F + x]; }
    let a = M[0x3D] ^ M[0xA4];
    let add = false;
    if ((M[0xC361] & 0x80) && ((M[0xB2] & 0x80) || !(M[0xB2] & 0x40))) add = true;
    else if (M[0x9D] & 0x80) add = true;
    if (add) a = (a + 0x40) & 255;
    M[0xC3A8] = a;
    let fwd;
    if (a & 0x80) {
      M[0xC3A9] = a;
      M[0xD0] = 0;
      P.REVERSE_POINTS({});
      M[0xD8] = (M[0xD8] + M[0x62]) & 2;
      fwd = !!M[0xA4];
    } else fwd = !M[0xA4];
    const each = yOf => {
      x = M[0xD0];
      do {
        if (M[0xA330 + x] & 0x80) continue;
        M[0xA350 + x] = 0x80;
        if (x < M[0x27]) { M[0xA330 + x] = 0x80; continue; }
        const y = yOf(x);
        P.s_A026({ x, y }); P.PROJECT_X({ x }); P.PROJECT_Y({ x });
        if (!((x ^ M[0xD8]) & 2)) P.OVERLAP({ x });
        M[0xCC + (x & 1)] = x;
      } while ((x = (x + 1) & 255) !== M[0x9E]);
    };
    if (fwd) {
      M[0x9F] = (ind(0x9A, 0) + 7) & 255;
      each(x => {
        let v = (x << 1) & 255; const c = v >> 7; v = (v << 1) & 255;
        return (v + M[0x9F] + c) & 255;
      });
    } else {
      let v = ((M[0x9E] - 1) << 2) & 255;
      M[0x14] = v;
      v = (((ind(0x9A, 0) + 7) & 255) + M[0x14]) & 255;
      M[0xA0] = v; M[0x9F] = v;
      each(x => { M[0x14] = (x << 2) & 255; return (M[0x9F] - M[0x14]) & 255; });
    }
    M[0xA21E] = M[0xA1FE + x]; M[0xA2B6] = M[0xA296 + x];
    M[0xA21F] = M[0xA1FF + x]; M[0xA2B7] = M[0xA297 + x];
    x = M[0xD0];
    do if (!(M[0xA330 + x] & 0x80)) P.ROLL_POINT_ON({ x }); while ((x = (x + 1) & 255) !== M[0x9E]);
    return { x };
  };

  // OVERLAP ($18AB): point X against the last point drawn on its side ($CC/$CD): when it lies
  // beyond it across the view (further left on the left, right on the right), it is marked
  // ($A350 = 2) and drawn again from its own copy at $A220/$A2B8
  P.OVERLAP = r => {
    let x = r.x & 255;
    const a = M[0xCC + (x & 1)];
    if (a & 0x80) return { x };
    let y = a < 2 ? a + 0x1E : a;
    let d;
    if (!(x & 1)) { const t = M[0xA200 + x] - M[0xA200 + y]; d = M[0xA298 + x] - M[0xA298 + y] - (t < 0 ? 1 : 0); }
    else { const t = M[0xA200 + y] - M[0xA200 + x]; d = M[0xA298 + y] - M[0xA298 + x] - (t < 0 ? 1 : 0); }
    if (!(d & 0x80)) return { x };
    M[0xA350 + x] = 2;
    M[0x8060 + x] = 0;
    M[0xA2B8 + x] = M[0xA298 + x];
    M[0xA220 + x] = M[0xA200 + x];
    x |= 0x20;
    P.PROJECT_Y({ x });
    P.ROLL_POINT({ x });
    return { x: x & 0x1F };
  };

  // NEXT_PIECE ($1909): the last two points of the piece drawn become the first two of the next
  // (unless the piece was behind, $C3A9), and $CC/$CD start again from them
  P.NEXT_PIECE = r => {
    if (M[0xC3A9] & 0x80) { M[0xD0] = 0; return { a: 0, x: r.x, y: r.y }; }
    let x = M[0x9E];
    for (let y = 1; y >= 0; y--) {
      x = (x - 1) & 255;
      for (const t of [0xA200, 0xA298, 0xA24C, 0xA2E4, 0xA330, 0x8040]) M[t + y] = M[t + x];
    }
    M[0xCC] = 0; M[0xCD] = 1;
    return { x, y: 0xFF, a: 1 };
  };

  // PIECE_POINTS ($1948): the piece's points, in pairs (left and right of the road), from its
  // shape's tables ($98 for the left side, $CA for the right): each point's height in its high
  // nibble and its distance in its low, or a byte each when $A2 bit 7 is set, added to the piece's
  // place ($3F/$35 and $40/$36), into $8040 and $A330; a point past the distance $19 (from $2A
  // less $D3) is left out ($A330 = $80); $8080 marks the start line's piece and points whose
  // first byte has bit 7 set
  P.PIECE_POINTS = r => {
    let a = (0x2A - M[0xD3]) & 255;
    if (a & 0x80) a = 0;
    M[0x19] = a;
    M[0xD3] = (M[0xD3] + M[0xBE]) & 255;
    M[0x8080 + M[0x62]] = M[0x2E] === M[0xC766] ? 1 : 0;
    let x = M[0xD0], y = 0;
    // the eight-bit and four-bit forms of a point pair, at Y, into slot X
    const nib = () => {
      let t = ((ind(0x98, y) << 1) & 0xE0) + M[0x3F];
      M[0x8040 + x] = t & 255;
      M[0xA330 + x] = ((ind(0x98, y) & 0x0F) + M[0x35] + (t >> 8)) & 255;
      t = ((ind(0xCA, y) << 1) & 0xE0) + M[0x40];
      M[0x8041 + x] = t & 255;
      M[0xA331 + x] = ((ind(0xCA, y) & 0x0F) + M[0x36] + (t >> 8)) & 255;
    };
    const wide = () => {
      y = (y + 1) & 255;
      let t = ind(0x98, y) + M[0x3F]; M[0x8040 + x] = t & 255;
      y = (y - 1) & 255;
      M[0xA330 + x] = ((ind(0x98, y) & 0x7F) + M[0x35] + (t >> 8)) & 255;
      y = (y + 1) & 255;
      t = ind(0xCA, y) + M[0x40]; M[0x8041 + x] = t & 255;
      y = (y - 1) & 255;
      M[0xA331 + x] = ((ind(0xCA, y) & 0x7F) + M[0x36] + (t >> 8)) & 255;
    };
    const off = () => { M[0xA330 + x] = 0x80; M[0xA331 + x] = 0x80; };
    if (!(M[0xA2] & 0x80)) {
      // four-bit form: Y counts pairs
      let first = true;
      if (!x) {
        M[0x97] = 0;
        if (ind(0x98, 0) & 0x80) M[0x8080 + x] = 0;
      } else { y = 1; M[0x97] = 1; first = false; }
      for (;;) {
        if (first) { nib(); first = false; }
        else if (ind(0x98, y) & 0x80) { M[0x8080 + x] = 0; nib(); }
        else if (y < M[0x19]) nib();
        else off();
        y = (y + 1) & 255; x = (x + 2) & 255;
        if (x < M[0x62]) continue;
        if (x === M[0x62]) { nib(); y = (y + 1) & 255; x = (x + 2) & 255; }
        y = (y - 1) & 255;
        break;
      }
    } else {
      // eight-bit form: $97 counts pairs, two bytes each
      let first = false;
      if (!x) { M[0x97] = 0; if (ind(0x98, 0) & 0x80) M[0x8080 + x] = 0; y = 0; first = true; }
      else { M[0x97] = 1; }
      for (;;) {
        if (first) { wide(); first = false; }
        else {
          y = (M[0x97] << 1) & 255;
          if (ind(0x98, y) & 0x80) { M[0x8080 + x] = 0; wide(); }
          else if (M[0x97] < M[0x19]) wide();
          else off();
        }
        M[0x97] = (M[0x97] + 1) & 255; x = (x + 2) & 255;
        if (x < M[0x62]) continue;
        if (x === M[0x62]) { y = (M[0x97] << 1) & 255; wide(); M[0x97] = (M[0x97] + 1) & 255; x = (x + 2) & 255; }
        break;
      }
    }
    const v = ind(0x98, y);
    if (v & 0x80) M[0x807E + x] = v;
    return { x, y };
  };

  // POINTS_TO_LINES ($1A3B): the piece's points joined by lines into the view ($FE91), pair by
  // pair across the road and along each side, the near or far side first as the car is rolled
  // ($C3DC, $0126); $FC01 picks each side's colour, the start line's piece is striped ($CF73), and
  // $E195/$E1B1 draw the opponent's car where it falls
  P.POINTS_TO_LINES = r => {
    let a = (M[0xC3A8] & 0x40) ? 0 : 1;
    M[0xCD] = a; M[0xCC] = a ^ 1;
    M[0xC6] = a + 2;
    for (;;) {
      M[0xA0] = 1;
      const x = M[0xD2] >= 0x28 ? 0 : ((M[0xC6] ^ M[0xD8]) >> 1) & 1;
      P.LINE_COLOUR({ x });
      if (((M[0xC6] >> 1) - 1 & 255) === M[0xA3] && M[0xA6] === M[0x2E]) P.OPP_DRAW_HERE({});
      do {
        const k = M[0xC6];
        if (!(M[0xA330 + k] & 0x80)) {
          if (M[0xA350 + k] & 0x80) P.ALONG_SIDE({});
          else if (!(M[0xC3DC] & 0x80)) { P.TO_COPY({}); P.ALONG_SIDE({}); }
          else {
            const odd = k & 1, minus = M[0x0126] & 0x80;
            if (odd ? !minus : minus) { P.ALONG_SIDE({}); P.TO_COPY({}); }
            else { P.TO_COPY({}); P.ALONG_SIDE({}); }
          }
          M[0xCC + M[0xA0]] = M[0xC6];
          if (M[0xC366] & 0x80) P.DRAW_OPPONENT({});
        }
        M[0xC6] ^= 1;
      } while (!(--M[0xA0] & 0x80));
      const y = M[0xC6] & 0xFE;
      a = M[0x8080 + y];
      if (!(a & 0x80)) {
        M[0x8080 + y] = 0x80;
        P.LINE_COLOUR({ x: a & 3 });
        P.s_CF73({});
        P.LINE({ x: M[0xC6], y: M[0xC6] ^ 1 });
      }
      M[0xD2] = (M[0xD2] + 1) & 255;
      M[0xC6] = (M[0xC6] + 2) & 255;
      if (M[0xC6] >= M[0x9E]) return {};
    }
  };
  // ALONG_SIDE ($1AF7): the line from point $C6 back to the last point drawn on its side
  P.ALONG_SIDE = r => P.LINE({ x: M[0xC6], y: M[0xCC + M[0xA0]] });
  // TO_COPY ($1B02): the line from point $C6 to its copy (point $C6 + $20)
  P.TO_COPY = r => P.LINE({ x: M[0xC6], y: M[0xC6] | 0x20 });

  // CLIP_NEAR ($1B0B): the piece's first two points, when one lies inside the view's columns but
  // behind the eye ($A2E4/$A24C), are moved along the side towards the next point by the share $8D
  // ($E808, $E631, $E641), so that the line to it can be drawn
  P.CLIP_NEAR = r => {
    let x = M[0x27];
    M[0xA0] = 2;
    do {
      let clip = false;
      if (!M[0xA298 + x] && M[0xA200 + x] >= 0x40 && M[0xA200 + x] < 0xC0) {
        const h = M[0xA2E4 + x];
        if (h & 0x80) clip = true;
        else if (!h && M[0xA24C + x] < 0xC0) clip = true;
      }
      if (clip) {
        M[0xC6] = x; M[0xC7] = x & 1;
        M[0xA32E + x] = M[0xC396 + M[0xC7]];
        P.OPP_SEGMENT_POINTS({ a: M[0x8E], x, y: M[0xC7] });
        P.OPP_ALONG_AT({ x: M[0xC7], y: 4, a: M[0x8D] });
        x = M[0xC6];
        M[0x15] = M[0x8D];
        let t = M[0x8040 + x] - M[0x803E + x]; M[0x14] = t & 255;
        const o = P.MUL_S16_U8({ a: (M[0xA330 + x] - M[0xA32E + x] - (t < 0 ? 1 : 0)) & 255 });
        M[0x15] = o.a;
        t = M[0x803E + x] + M[0x14]; M[0x803E + x] = t & 255;
        M[0xA32E + x] = (M[0xA32E + x] + M[0x15] + (t >> 8)) & 255;
        P.PROJECT_CORNER({ x: (x - 2) & 255, y: 4, a: M[0xA32E + x] });
        x = M[0xC6];
      }
      x = (x + 1) & 255;
    } while (--M[0xA0]);
    return { x };
  };

  // PIECE_AHEAD ($CFC5): $2E, the piece being drawn, on to the next round the track ($C764 pieces)
  P.PIECE_AHEAD = r => {
    let x = (M[0x2E] + 1) & 255;
    if (x >= M[0xC764]) x = 0;
    M[0x2E] = x;
    return { x };
  };
  // PIECE_BEHIND ($CFD2): $2E back to the piece before
  P.PIECE_BEHIND = r => {
    let x = (M[0x2E] - 1) & 255;
    if (x & 0x80) x = (M[0xC764] - 1) & 255;
    M[0x2E] = x;
    return { x };
  };
  // CMD_CLEAR_VIEW ($2C23): command $45, the view cleared, with $3DF8 for its flags
  P.CMD_CLEAR_VIEW = r => P.DISPATCH({ a: 0x45, x: M[0x3DF8], y: r.y });
  // CMD_FILL_ABOVE ($2C2B): command $3E
  P.CMD_FILL_ABOVE = r => P.DISPATCH({ a: 0x3E, x: r.x, y: r.y });
  // CMD_ROW_COLOURS ($2C30): command $46
  P.CMD_ROW_COLOURS = r => P.DISPATCH({ a: 0x46, x: r.x, y: r.y });
  // CMD_MARK_COLUMNS ($2C35): command $41
  P.CMD_MARK_COLUMNS = r => P.DISPATCH({ a: 0x41, x: r.x, y: r.y });
  // CMD_FILL_SPANS ($2C3A): command $42, while $6D bit 7 says there are spans to fill
  P.CMD_FILL_SPANS = r => (M[0x6D] & 0x80) ? P.DISPATCH({ a: 0x42, x: r.x, y: r.y }) : { a: M[0x6D] };
  // CMD_COLUMN_LIMITS ($2C44): command $3D, or $1CCB while $C359 is set
  P.CMD_COLUMN_LIMITS = r => M[0xC359] ? P.HORIZON({ a: M[0xC359], x: r.x, y: r.y }) : P.DISPATCH({ a: 0x3D, x: r.x, y: r.y });
};
})(typeof window !== 'undefined' ? window : globalThis);
