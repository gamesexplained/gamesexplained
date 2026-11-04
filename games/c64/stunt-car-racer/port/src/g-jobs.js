// The jobs the race hands the command dispatcher by number ($894A-$9122, commands $3C-$47): the
// drawbridge, the view's fills and edges, the crane's chains, the front wheels, the speed bar, the
// opponent's table of pieces, the view cleared, the colours of the view's character rows, and the
// disk's commands.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.jobs = P => {
  const M = P.M;
  const w16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const r16 = a => M[a] | M[a + 1] << 8;
  // the address of the byte for pixel column x (from $40) and row y of the view, in the bitmap
  // being drawn ($12 is 0 for $4000, $20 for $6000), as the code makes it: ($A500 + y) is the row's
  // address less the row's own y, so that ($1E),Y finds the byte
  const rowPtr = (x, y) => {
    const a = ((((x - 0x40) & 0x7C) << 1) & 255) + M[0xA500 + y];
    return ((M[0xA600 + y] + M[0x12] + (a >> 8)) & 255) << 8 | (a & 255);
  };
  const at = (p, y) => (p + y) & 0xFFFF;

  // DRAWBRIDGE ($894A), command $3C, on the Draw Bridge: the bridge's two ends rise and fall on a
  // count of 32 passes, unless a car is on the pieces next to it ($33-$37), when it stays down. The
  // ends are object $5F's points, rewritten from the count, and their heights $0740-$0744.
  P.DRAWBRIDGE = r => {
    let a = M[0xC374], down = false;
    if (a < 0x38 && a >= 0x33) down = true;
    else {
      a = M[0xC375];
      if (a < 0x38 && (a >= 0x33 || (M[0xE7] && a >= 0x30))) down = true;
    }
    if (down) { M[0xE7] = 0x0C; return P.BRIDGE_HEIGHTS({ a: (0x0C + M[0xC300]) & 255 }); }
    M[0xC300] = (M[0xC300] + 1) & 255;
    M[0x7D] = 0; M[0x7F] = 0; M[0xE7] = 0;
    a = ((M[0xC300] & 0x1F) - 0x10) & 255;
    if (a & 0x80) a ^= 0xFF;
    M[0x14] = (a + 4) & 255;
    M[0x0743] = M[0x0744] = M[0x8A1F + a];
    const step = M[0x14] << 5;
    M[0x77] = step >> 8; M[0x51] = step & 255;
    let y = 2;
    const p = r16(0xB120 + 0xBE);
    M[0x1E] = p & 255; M[0x1F] = p >> 8;
    for (let x = 0x0F; x; x--) {
      let t = M[0x7D] + M[0x51];
      M[0x7D] = t & 255;
      M[0x7F] = (M[0x7F] + M[0x77] + (t >> 8)) & 255;
      do {
        let v = M[0x7F];
        if (y === 0x20) v |= 0x80;
        M[at(p, y)] = v; M[at(p, y + 1)] = M[0x7D];
        y += 2;
        M[0x14] = y;
        const y2 = (0x48 - y) & 255;
        M[at(p, y2)] = v; M[at(p, y2 + 1)] = M[0x7D];
      } while (y === 0x12);
    }
    if (M[0xC375] !== 0x2F) return { a: M[0xC375], x: 0, y };
    return P.BRIDGE_HEIGHTS({ a: M[0xC300] });
  };
  // BRIDGE_HEIGHTS ($89FA): the count in A, halved, picks a step from $8A0F; $0740-$0742 are $C6
  // plus one, two and three steps
  P.BRIDGE_HEIGHTS = r => {
    const y = (r.a & 0x1F) >> 1;
    let a = 0xC6;
    for (let x = 0; x < 3; x++) { a = (a + M[0x8A0F + y]) & 255; M[0x0740 + x] = a; }
    return { a, x: 3, y };
  };

  // COLUMN_LIMITS ($8A2F), command $3D: for each of the view's 64 columns, the lowest the top limit
  // ($C680) and the bottom limit ($C640) have been this frame, from a height (256 less the 16 bits at
  // $69/$33, 255 when they are 0 or less, 0 past 256) and the slope at $0380, mirrored by the sign of
  // $0126
  P.COLUMN_LIMITS = r => {
    const lo = (0 - M[0x33]) & 255, b = M[0x33] === 0 ? 1 : 0;
    const hi = (0 - M[0x69] - (1 - b)) & 255;
    M[0x14] = lo;
    if (!(hi & 0x80)) M[0x14] = 0xFF;
    else if (hi !== 0xFF) M[0x14] = 0;
    const h = M[0x14], minus = M[0x0126] & 0x80;
    let x = 1;
    for (let y = 0x3F; y >= 0; y--, x++) {
      let up, dn;
      if (!minus) { up = h - M[0x0380 + y]; if (up < 0) up = 0; dn = h + M[0x0380 + x]; if (dn > 255) dn = 255; }
      else { up = h + M[0x0380 + y]; if (up > 255) up = 255; dn = h - M[0x0380 + x]; if (dn < 0) dn = 0; }
      if (up < M[0xC680 + y]) M[0xC680 + y] = up;
      if (dn < M[0xC640 + y]) M[0xC640 + y] = dn;
    }
    return { x: 0x41, y: 0xFF };
  };

  // FILL_ABOVE_EDGES ($8AA5), command $3E: in each character column of the view ($40-$BF, four
  // pixels), from the lowest of its four edges ($C600) upwards, each pixel above its own edge is
  // set to colour 2 ($AA); once a row has all four, the rest of that character row is filled and the
  // character row is kept at $01C1 + x (7 when the column never got there), for SET_ROW_COLOURS
  P.FILL_ABOVE_EDGES = r => {
    for (let x = 0x40; x < 0xC0; x += 4) {
      const e = [M[0xC600 + x], M[0xC601 + x], M[0xC602 + x], M[0xC603 + x]];
      M[0x13] = e[0]; M[0x14] = e[1]; M[0x15] = e[2]; M[0x16] = e[3];
      let y = Math.max(e[0], e[1], e[2], e[3]);
      if (y < 0x40) { M[0x01C1 + x] = 7; continue; }
      if (y >= 0xC0) y = 0xBF;
      let p = rowPtr(x, y);
      let done = false;
      for (;;) {
        let a = 0xFF;
        if (y < M[0x13]) a &= 0xBF;
        if (y < M[0x14]) a &= 0xEF;
        if (y < M[0x15]) a &= 0xFB;
        if (y < M[0x16]) a &= 0xFE;
        if (a === 0xAA) {
          for (;;) {
            M[at(p, y)] = 0xAA;
            const o = y; y = (y - 1) & 255;
            if (!(o & 7)) break;
          }
          M[0x01C1 + x] = y < 0x40 ? 7 : y >> 3;
          done = true; break;
        }
        M[at(p, y)] &= a;
        const o = y; y = (y - 1) & 255;
        if (o & 7) continue;
        if (y < 0x40) break;
        p = (p - 0x138) & 0xFFFF;
      }
      M1E(p);
      if (!done) M[0x01C1 + x] = 7;
    }
    return { x: 0xC0 };
  };
  const M1E = p => { M[0x1E] = p & 255; M[0x1F] = p >> 8; };

  // CRANE_CHAINS ($8B51), command $3F: the two chains the car hangs from before the start, drawn from
  // row $C36B up to the top of the view at pixel columns $54 and $A8; while $2F is 0 their ends rise
  // by a step that grows by 8 each pass ($C36C), until row $5F
  P.CRANE_CHAINS = r => {
    if (!M[0x2F]) {
      if (M[0xC36B] === 0x5F) return { a: 0x5F, z: 1 };
      M[0xC36B] = (M[0xC36B] - M[0xC36C]) & 255;
      M[0xC36C] = (M[0xC36C] + 8) & 255;
    }
    P.CHAIN({ x: 0x54 });
    return P.CHAIN({ x: 0xA8 });
  };
  // CHAIN ($8B77): one chain at pixel column X, its links eight rows each, two bytes wide
  P.CHAIN = r => {
    M[0x4F] = r.x & 255; M[0x50] = 0x0F;
    let y = M[0xC36B], x = 0;
    do {
      const p = rowPtr(M[0x4F], y);
      M1E(p);
      const q = (p + 8) & 0xFFFF;
      M[0x20] = q & 255; M[0x21] = q >> 8;
      x = M[0x50];
      for (let n = 8; n; n--) {
        M[at(p, y)] = (M[at(p, y)] & M[0x8BCD + x]) | M[0x8BED + x];
        M[at(q, y)] = (M[at(q, y)] & M[0x8BDD + x]) | M[0x8BFD + x];
        y = (y - 1) & 255; x = (x - 1) & 255;
      }
      M[0x14] = 0;
      M[0x50] ^= 8;
    } while (y >= 0x40);
    return { x, y, a: M[0x50] };
  };

  // FRONT_WHEEL ($8C0D), command $40: the top of a front wheel, X 0 the left and 1 the right, at
  // the height in $14, drawn into both bitmaps from the columns at $8C70 (left) and $8C94 (right)
  P.FRONT_WHEEL = r => {
    const s = (0xD9 - M[0x14]) & 255;
    const right = (r.x & 255) === 1;
    const t = right ? [0x8C94, 0x8C9C, 0x8CA4] : [0x8C70, 0x8C78, 0x8C80];
    const d = right ? [0x7658, 0x7798, 0x78D8] : [0x7560, 0x76A0, 0x77E0];
    let x = s;
    for (let y = 7; y >= 0; y--) {
      if (y >= 4) { const v = M[(t[0] + x) & 0xFFFF]; M[d[0] + y] = v; M[d[0] - 0x2000 + y] = v; }
      const v = M[(t[1] + x) & 0xFFFF]; M[d[1] + y] = v; M[d[1] - 0x2000 + y] = v;
      let w = M[(t[2] + x) & 0xFFFF];
      if (y < 6) M[d[2] + y] = w;
      else if (y === 6) M[d[2] + y] = w | (right ? 0x40 : 0x01);
      x = (x - 1) & 255;
    }
    return { x: right ? 1 : 0, y: 0xFF };
  };

  // MARK_COLUMNS ($8CD0), command $41: the pixel columns from $60 to $61 (kept inside $40-$BF),
  // whole characters, each counted once more at $0240 (a column counted for the first time has its
  // $C500 set to $C0, and its count starts at $C1); when $60 is past $61 nothing is marked and
  // bit 7 of $6D and of $C303 is cleared. $41 and $55 keep the first and last character
  P.MARK_COLUMNS = r => {
    if (M[0x61] >= 0xC0) M[0x61] = 0xBF;
    if (M[0x60] < 0x40) M[0x60] = 0x40;
    const a = M[0x60];
    if (a > M[0x61]) { M[0x6D] >>= 1; M[0xC303] >>= 1; return {}; }
    M[0x41] = a & 0xFC;
    M[0x55] = (M[0x61] + 4) & 0xFC;
    let x = M[0x41];
    do {
      let v = M[0x0240 + x];
      if (!v) { v = 0xC0; M[0xC500 + x] = 0xC0; }
      M[0x0240 + x] = (v + 1) & 255;
      x = (x + 1) & 255;
    } while (x < M[0x55]);
    return { x };
  };

  // FILL_SPANS ($8D15), command $42: in each character column from $41 to $55, the rows between the
  // edges at $0240 and those at $C600 filled by parity: the edges toggle bits in the row flags at
  // $C400 (TOGGLE_EDGES), and going up the column a pixel is filled with colour 2 while its bit is
  // set. Bit 7 of a row's flags marks the bottom row of each character row, where going up moves to
  // the character row above, and $C0 above the view's top row stops the fill. The flags are toggled
  // back afterwards.
  P.FILL_SPANS = r => {
    M[0x6D] >>= 1;
    let x = M[0x41];
    for (;;) {
      M[0x51] = x;
      const a = Math.max(M[0xC600 + x], M[0xC601 + x], M[0xC602 + x], M[0xC603 + x]);
      M[0x50] = a;
      if (a >= 0x41) {
        P.TOGGLE_EDGES({ x });
        let y = M[0x50];
        let p = rowPtr(x, y);
        M[0x29] = M[0xC400 + y] & 0x0F;
        let f;
        if (M[0x29]) f = M[0x29];
        else if (M[0x0240 + x] >= M[0xC600 + x] && M[0x0241 + x] >= M[0xC601 + x] && M[0x0242 + x] >= M[0xC602 + x] && M[0x0243 + x] >= M[0xC603 + x]) f = -1;
        else f = 0;
        if (f >= 0) {
          M[0x2A] = M[0x8E67 + f];
          let state = 'next';     // the loop's three entries: 'next' (j_8DC5), 'full' (b_8D8D), 'flip' (b_8DAF with A)
          let fx = 0;
          for (;;) {
            if (state === 'next' || state === 'and') {
              if (state === 'and') M[at(p, y)] &= M[0x2A];
              y = (y - 1) & 255;
              fx = M[0xC400 + y];
              if (!fx) { state = 'and'; continue; }
              if (!(fx & 0x80)) { state = 'flip'; continue; }
              p = (p - 0x138) & 0xFFFF;
              fx &= 0x7F;
              if (!fx) { state = 'and'; continue; }
              if (fx >= 0x10) break;
              state = 'flip'; continue;
            }
            if (state === 'flip') {
              M[0x29] ^= fx;
              if (!M[0x29]) break;
              if (M[0x29] === 0x0F) { state = 'full'; continue; }
              M[0x2A] = M[0x8E67 + M[0x29]];
              state = 'and'; continue;
            }
            // state 'full': colour 2 down to the next flagged row
            M[at(p, y)] = 0xAA;
            y = (y - 1) & 255;
            fx = M[0xC400 + y];
            if (!fx) continue;
            if (!(fx & 0x80)) { state = 'flip'; continue; }
            p = (p - 0x138) & 0xFFFF;
            fx &= 0x7F;
            if (!fx) continue;
            if (fx >= 0x10) break;
            state = 'flip';
          }
        }
        M1E(p);
        P.TOGGLE_EDGES({ x: M[0x51] });
      }
      x = (M[0x51] + 4) & 255;
      if (x >= M[0x55]) return { x, a: x };
    }
  };
  // TOGGLE_EDGES ($8DF6): for the four pixel columns from X, a column whose edge at $0240 is above
  // its edge at $C600 toggles its bit (8, 4, 2, 1) in the row flags just above the first and at the
  // second
  P.TOGGLE_EDGES = r => {
    const x = r.x & 255;
    for (let i = 0; i < 4; i++) {
      const bit = 8 >> i, a = M[0x0240 + x + i], b = M[0xC600 + x + i];
      if (a < b) { M[0xC3FF + a] ^= bit; M[0xC400 + b] ^= bit; }
    }
    return { x };
  };

  // SPEED_BAR ($8E77), command $43: the bar above the speedometer's scale (row 21 of the dashboard
  // from column 12, two pixel rows deep), X/2 pixels long (less 64 past 63); only what changed since
  // the last length ($C34F) is drawn
  P.SPEED_BAR = r => {
    let a = (r.x & 255) >> 1;
    if (a >= 0x40) a -= 0x40;
    M[0xC34E] = a;
    let d = (a - M[0xC34F]) & 255;
    const put = (y, v) => { M[0x7AA6 + y] = v; M[0x7AA7 + y] = v; };
    if (d) {
      if (!(d & 0x80)) {
        M[0x51] = (d - 1) & 255;
        const x = (M[0xC34F] + 1) & 255;
        let y = ((x & 0xFC) << 1) & 255;
        a = ((x & 3) + M[0x51]) & 255;
        while (a >= 4) { put(y, M[0x8F0C]); y = (y + 8) & 255; a -= 4; }
        put(y, M[0x8F09 + a]);
      } else {
        M[0x51] = (-d) & 255;
        const x = M[0xC34E] & 3;
        let y = ((M[0xC34E] & 0xFC) << 1) & 255;
        put(y, M[0x8F09 + x]);
        a = (x + M[0x51]) & 255;
        while (a >= 4) { y = (y + 8) & 255; put(y, M[0x8F10]); a -= 4; }
      }
    }
    M[0xC34F] = M[0xC34E];
    return { a: M[0xC34E] };
  };

  // PIECE_TABLE ($8F11), command $44: a value for each of the track's pieces at $0710, from the
  // last back to the first: a piece listed at $075E takes its own from $0769 (and with bit 7 set,
  // the next three pieces back are flagged with bit 7 too); a piece whose kind ($0400, low four bits)
  // has bit 7 set at $B240 takes X; any other takes the value of the piece after it plus 10, up to
  // $7F, the value carried in $14 (from $7C)
  P.PIECE_TABLE = r => {
    M[0x8F80] = r.x & 255;
    M[0x08] = 0; M[0x14] = 0x7C; M[0xA0] = 1;
    let x = (M[0xC764] - 1) & 255;
    do {
      let y = (M[0xC778] - 1) & 255;
      while (!(y & 0x80) && M[0x075E + y] !== x) y = (y - 1) & 255;
      let a;
      if (!(y & 0x80)) {
        a = M[0x0769 + y];
        M[0x0710 + x] = a;
        if (a & 0x80) M[0x08] = 3;
        M[0x14] = a & 0x7F;
      } else {
        if (M[0xB240 + (M[0x0400 + x] & 0x0F)] & 0x80) {
          M[0x14] = (M[0x8F80] - 0x0A) & 255;
          a = M[0x8F80];
        } else {
          const t = (M[0x14] + 0x0A) & 255;
          if (!(t & 0x80)) M[0x14] = t;
          a = M[0x14];
        }
        if (M[0x08]) { M[0x08]--; a |= 0x80; }
        M[0x0710 + x] = a;
      }
      x = (x - 1) & 255;
    } while (!(x & 0x80));
    M[0xA0] = 0;
    return { x: (M[0xC764] - 1) & 255 };
  };

  // CLEAR_VIEW ($8F82), command $45: the view in the bitmap being drawn set to colour 3 (13 rows of 32
  // characters), and the bonnet below it put back from its copy at $C000-$C25F; into the bitmap at
  // $4000 the bonnet only with bit 7 of X
  P.CLEAR_VIEW = r => {
    M[0x8F81] = r.x & 255;
    const b = M[0x12] ? 0x6000 : 0x4000;
    const bonnet = M[0x12] || (M[0x8F81] & 0x80);
    for (let x = 0; x < 256; x++) {
      for (let row = 0; row < 13; row++) M[b + 0x2A0 + row * 0x140 + x] = 0xFF;
      if (bonnet) { M[b + 0x12E0 + x] = M[0xC000 + x]; M[b + 0x1420 + x] = M[0xC100 + x]; }
    }
    if (!bonnet) return { x: 0 };
    for (let x = 0x17; x >= 0; x--) {
      M[b + 0x15A0 + x] = M[0xC200 + x]; M[b + 0x1608 + x] = M[0xC218 + x];
      M[b + 0x1560 + x] = M[0xC230 + x]; M[b + 0x1648 + x] = M[0xC248 + x];
    }
    M[b + 0x1578] = 0xF0; M[b + 0x1640] = 0x0F;
    return { x: 0xFF, a: 0x0F };
  };

  // SET_ROW_COLOURS ($9057), command $46: for each of the view's 32 character columns whose top
  // character row of colour 2 has moved since the last frame ($0200 then, $0201 now, four bytes a
  // column), the colour RAM of the rows between is set: to $C76B for the rows it rose past, to
  // $0E for those it fell back from
  P.SET_ROW_COLOURS = r => {
    M[0x16] = M[0xC76B];
    M[0x14] = 0;
    let x = 0;
    do {
      x = M[0x14];
      const now = M[0x0201 + x], was = M[0x0200 + x];
      if (now !== was) {
        M[0x15] = now;
        M[0x0200 + x] = now;
        M[0x20] = x >> 2;
        if (now < was) {
          for (let k = was; k !== now; k = (k - 1) & 255) {
            M[0x21] = M[0xA418 + k];
            P.wr(((M[0x21] << 8 | M[0x20]) + M[0xA400 + k]) & 0xFFFF, M[0x16]);
          }
        } else {
          let k = (was + 1) & 255;
          do {
            M[0x21] = M[0xA418 + k];
            P.wr(((M[0x21] << 8 | M[0x20]) + M[0xA400 + k]) & 0xFFFF, 0x0E);
            k = (k + 1) & 255;
          } while (k <= M[0x15]);
        }
      }
      M[0x14] = (M[0x14] + 4) & 255;
    } while (!(M[0x14] & 0x80));
    return { a: M[0x14] };
  };

  // DISK_COMMAND ($90BB), command $47, with the KERNAL in: nothing unless $0840 says there is a
  // drive; X 0 sends the drive "I0" (initialise), any other X "S0:" and the name at $AEC1 (scratch:
  // the old file goes before a save), when $C77B says there is one. Carry set is an error; "file
  // not found" (4) is not one.
  P.DISK_COMMAND = r => {
    if (!M[0x0840]) return { c: 0 };
    const k = P.kernal;
    k.SETLFS({ a: 0, x: 8, y: 0 });
    let o;
    if (!(r.x & 255)) o = { a: 2, x: 0x23, y: 0x91 };
    else {
      if (!M[0xC77B]) return { c: 0 };
      for (let x = 0x0B; x >= 0; x--) M[0x910E + x] = M[0xAEC1 + x];
      o = { a: 0x0F, x: 0x0B, y: 0x91 };
    }
    k.SETNAM(o);
    k.SETLFS({ a: 0x0F, x: 8, y: 0x0F });
    const e = k.OPEN({});
    let c = e.c ? ((e.a & 255) === 4 ? 0 : 1) : 0;
    const f = k.CLOSE({ a: 0x0F });
    if (f.c) c = 1;
    return { c };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
