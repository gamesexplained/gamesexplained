// The lines ($F82B-$FF93): a line between two of the view's points drawn into the bitmap from the
// bottom up, one pixel a row or a column, behind what is already drawn: each of the view's 128
// columns ($40-$BF) keeps the highest row drawn in it so far ($C600 + X), and a pixel at or
// below that is hidden. A line is clipped where it leaves the view (the rows $40-$BF and the
// columns $40-$BF), and the columns under a line that goes off the top are marked as covered.
// The game changes the drawing by rewriting the code: the test each pixel makes (17 bytes after
// each loop's CMP, from the table at $FC67), the instruction that puts it in the bitmap (AND, or
// BIT to draw nothing), its mask table ($A400 or $A480), and the page the columns' tops are
// cleared on. The port reads those bytes where the game keeps them.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.lines = P => {
  const M = P.M;
  const hex = v => '$' + v.toString(16).toUpperCase();
  // the work the page's pacing counts (src/core.js, P.N): each pixel a line tests, each one it
  // draws, and each step of a line that is off the view
  Object.assign(P.N, { tests: 0, pixels: 0, skip: 0 });

  // The pixel at X, Y of the line whose test starts at `site` (the TYA before it): $F8C9, $F9D0,
  // $FAD8 or $FBBF. Two tests, as the table at $FC67 writes them:
  // - for the track ($FC23): hidden at or below the column's top ($C600 + X), which it then
  //   becomes; drawn when it is at or below the limit at $0240 + X (or $C540 + X, as $FCA2 writes
  //   it), else only when it is above $C500 + X. With the branch rewritten by $FC99, a pixel at or
  //   below the limit goes to the test sixteen bytes before the site instead, which hides it.
  // - for the opponent's car ($FC31): the lowest row drawn in the column kept at $0240 + X; hidden
  //   at or below the column's top ($C600 + X, or $C500 + X as $FCA2 writes it), and otherwise
  //   drawn, its row kept at $C500 + X; with $FC99's branch, one at or below the top goes to the
  //   test sixteen bytes back, drawn when it is below $C580 + X and above $C600 + X.
  // Drawn: the bitmap's byte at ($1E) + Y ANDed with the mask for the column ($A400 + X, or the
  // table LINE_COLOUR chose), or left as it is when the AND has been rewritten to a BIT.
  const want = (site, at, bytes) => {
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b !== null && (Array.isArray(b) ? !b.includes(M[site + at + i]) : M[site + at + i] !== b))
        throw new Error('the line at ' + hex(site) + ' has unknown code at ' + hex(site + at + i) + ': ' + hex(M[site + at + i]));
    }
  };
  const alt = (site, x, y) => {
    want(site, -16, [0xDD, 0x80, 0xC5, 0x90, 0x25, 0xF0, 0x23, 0xDD, 0x00, 0xC6, 0x90, 0x17, 0xB0, 0x1C]);
    return y > M[0xC580 + x] && y < M[0xC600 + x];
  };
  const plot = (site, x, y) => {
    P.N.tests++;
    let draw;
    // the page of the second CMP (LINE_LIMIT writes $C5 there) and the branch after it (LINE_LIMIT_HIDE
    // writes $E2 there, to the test sixteen bytes before the site)
    const page = M[site + 11], toAlt = M[site + 13] === 0xE2;
    if (M[site + 2] === 0x00) {
      want(site, 1, [0xDD, 0x00, 0xC6, 0xB0, 0x14, 0x9D, 0x00, 0xC6, 0xDD, 0x40, null, 0xB0, [0x05, 0xE2], 0xDD, 0x00, 0xC5, 0xB0, 0x07]);
      if (y >= M[0xC600 + x]) return y;
      M[0xC600 + x] = y;
      if (y >= M[(page << 8 | 0x40) + x]) draw = toAlt ? alt(site, x, y) : true;
      else draw = y < M[0xC500 + x];
    } else {
      want(site, 1, [0xDD, 0x40, 0x02, 0x90, 0x03, 0x9D, 0x40, 0x02, 0xDD, 0x00, null, 0xB0, [0x0C, 0xE2], 0x9D, 0x00, 0xC5, 0xB0, 0x07]);
      if (y >= M[0x0240 + x]) M[0x0240 + x] = y;
      if (y >= M[(page << 8) + x]) {
        if (!toAlt) return y;
        draw = alt(site, x, y);
      } else { M[0xC500 + x] = y; draw = true; }
    }
    if (!draw) return y;
    want(site, 19, [0xB1, 0x1E, [0x3D, 0x2C], null, 0xA4, 0x91, 0x1E]);
    const p = ((M[0x1F] << 8 | M[0x1E]) + y) & 0xFFFF;
    let v = M[p];
    if (M[site + 21] === 0x3D) v &= M[(0xA400 | M[site + 22]) + x];
    M[p] = v;
    P.N.pixels++;
    return v;
  };
  // the bitmap's byte for column X, row Y, less Y (the loops index it with Y): $1E/$1F
  const cell = (x, y) => {
    const t = (((x - 0x40) & 0x7C) << 1) + M[0xA500 + y];
    M[0x1E] = t & 255;
    M[0x1F] = (M[0xA600 + y] + M[0x12] + (t >> 8)) & 255;
  };
  const up = () => { const t = M[0x1E] - 0x38; M[0x1E] = t & 255; M[0x1F] = (M[0x1F] - 1 - (t < 0 ? 1 : 0)) & 255; };

  // COVER_LEFT ($F913): the columns from X down to A (no further left than $40, no further right
  // than $BF) marked as covered to the top: their tops ($C600, or the page $FC31 writes at $F92B)
  // set to $40. COVER_LEFT_FROM ($F925) with $89 already the last column.
  P.COVER_LEFT = r => {
    let a = r.a & 255, x = r.x & 255;
    if (a < 0x40) a = 0x40;
    M[0x89] = a;
    if (x >= 0xC0) x = 0xBF;
    if (x < M[0x89]) return { a, x, c: 0 };
    return P.COVER_LEFT_FROM({ x });
  };
  P.COVER_LEFT_FROM = r => {
    let x = r.x & 255;
    M[0x89] = (M[0x89] - 1) & 255;
    const page = M[0xF92B] << 8;
    do { P.N.skip++; M[page + x] = 0x40; x = (x - 1) & 255; } while (x !== M[0x89]);
    return { a: 0x40, x, z: 1, c: 1 };
  };
  // COVER_RIGHT_FROM ($FA2E): the columns from X up to $89 less 1 marked the same way (the page
  // at $FA32)
  P.COVER_RIGHT_FROM = r => {
    let x = r.x & 255;
    const page = M[0xFA32] << 8;
    do { P.N.skip++; M[page + x] = 0x40; x = (x + 1) & 255; } while (x !== M[0x89]);
    return { a: 0x40, x, z: 1, c: 1 };
  };

  // The four loops, from the line's lower end (X, Y) up towards its other: A is where it stops (its
  // row for the steep ones, its column for the others), $51 and $52 the distances across and up,
  // $0F the running error, $07 where the bitmap's byte next changes, $89 the end, clipped. Each
  // first steps off the bottom ($C0) or the side of the view, without drawing.
  // LINE_UP_LEFT ($F82B): steeper than 45 degrees, to the left
  P.LINE_UP_LEFT = r => {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255, t;
    if (a >= 0xC0) return { a, x, y, c: 1 };
    if (a < 0x40) a = 0x40;
    M[0x89] = a;
    a = (M[0x52] >> 1) ^ 0xFF;
    let pc = y < M[0x89] ? 0xF907 : 0xF843;
    for (;;) {
      switch (pc) {
        case 0xF843:
          while (y >= 0xC0) {
            P.N.skip++;
            y = (y - 1) & 255;
            t = a + M[0x51]; a = t & 255;
            if (t > 255) { a = (a - M[0x52]) & 255; x = (x - 1) & 255; }
          }
          if (x < 0x40) return { a, x, y, c: 0 };
          if (x < 0xC0) { pc = 0xF874; break; }
          for (;;) {
            P.N.skip++;
            y = (y - 1) & 255;
            if (y < M[0x89]) { pc = 0xF907; break; }
            t = a + M[0x51]; a = t & 255;
            if (t > 255) { a = (a - M[0x52]) & 255; x = (x - 1) & 255; if (x < 0xC0) { pc = 0xF874; break; } }
          }
          break;
        case 0xF874:
          M[0x0F] = a;
          a = y & 0xF8; if (a < M[0x89]) a = M[0x89];
          M[0x07] = a;
          cell(x, y);
          for (;;) {
            a = plot(0xF8C9, x, y);
            y = (y - 1) & 255;
            if (y < M[0x07]) {
              a = (y - 7) & 255;
              if (a < M[0x89]) {
                if (y < M[0x89]) { pc = 0xF907; break; }
                a = M[0x89];
              }
              M[0x07] = a;
              up();
            }
            t = M[0x0F] + M[0x51]; a = t & 255;
            if (t > 255) {
              a = (a - M[0x52]) & 255;
              const old = x;
              x = (x - 1) & 255;
              M[0x0F] = a;
              if (!(old & 3)) {
                if (x < 0x40) return { a: 0, x, y, c: 0 };
                t = M[0x1E] - 8; M[0x1E] = t & 255;
                if (t < 0) M[0x1F] = (M[0x1F] - 1) & 255;
              }
            } else M[0x0F] = a;
          }
          break;
        case 0xF907:
          if (y >= 0x40) return { a, x, y, c: 1 };
          a = M[0x4F] < M[0x4E] ? M[0x4F] : M[0x4E];
          return Object.assign({ y }, P.COVER_LEFT({ a, x }));
      }
    }
  };
  // LINE_UP_RIGHT ($F932): steeper than 45 degrees, to the right
  P.LINE_UP_RIGHT = r => {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255, t;
    if (a >= 0xC0) return { a, x, y, c: 1 };
    if (a < 0x40) a = 0x40;
    M[0x89] = a;
    a = (M[0x52] >> 1) ^ 0xFF;
    let pc = y < M[0x89] ? 0xFA0E : 0xF94A;
    for (;;) {
      switch (pc) {
        case 0xF94A:
          while (y >= 0xC0) {
            P.N.skip++;
            y = (y - 1) & 255;
            t = a + M[0x51]; a = t & 255;
            if (t > 255) { a = (a - M[0x52]) & 255; x = (x + 1) & 255; }
          }
          if (x >= 0xC0) return { a, x, y, c: 1 };
          if (x >= 0x40) { pc = 0xF97B; break; }
          for (;;) {
            P.N.skip++;
            y = (y - 1) & 255;
            if (y < M[0x89]) { pc = 0xFA0E; break; }
            t = a + M[0x51]; a = t & 255;
            if (t > 255) { a = (a - M[0x52]) & 255; x = (x + 1) & 255; if (x >= 0x40) { pc = 0xF97B; break; } }
          }
          break;
        case 0xF97B:
          M[0x0F] = a;
          a = y & 0xF8; if (a < M[0x89]) a = M[0x89];
          M[0x07] = a;
          cell(x, y);
          for (;;) {
            a = plot(0xF9D0, x, y);
            y = (y - 1) & 255;
            if (y < M[0x07]) {
              a = (y - 7) & 255;
              if (a < M[0x89]) {
                if (y < M[0x89]) { pc = 0xFA0E; break; }
                a = M[0x89];
              }
              M[0x07] = a;
              up();
            }
            t = M[0x0F] + M[0x51]; a = t & 255;
            if (t > 255) {
              a = (a - M[0x52]) & 255;
              M[0x0F] = a;
              x = (x + 1) & 255;
              if (!(x & 3)) {
                if (x >= 0xC0) return { a: 0, x, y, c: 1 };
                t = M[0x1E] + 8; M[0x1E] = t & 255;
                if (t > 255) M[0x1F] = (M[0x1F] + 1) & 255;
              }
            } else M[0x0F] = a;
          }
          break;
        case 0xFA0E: {
          if (y >= 0x40) return { a, x, y, c: 1 };
          a = M[0x4F] >= M[0x4E] ? M[0x4F] : M[0x4E];
          if (a >= 0xC0) a = 0xBF;
          M[0x89] = a;
          if (x < 0x40) x = 0x40;
          M[0x89] = (M[0x89] + 1) & 255;
          if (x >= M[0x89]) return { a, x, y, c: 1 };
          return Object.assign({ y }, P.COVER_RIGHT_FROM({ x }));
        }
      }
    }
  };
  // LINE_LEFT ($FA39): 45 degrees or flatter, to the left
  P.LINE_LEFT = r => {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255, t;
    if (a >= 0xC0) return { a, x, y, c: 1 };
    if (a < 0x40) a = 0x40;
    M[0x89] = a;
    a = (M[0x51] >> 1) ^ 0xFF;
    if (x < M[0x89]) return { a, x, y, c: 0 };
    while (x >= 0xC0) {
      P.N.skip++;
      x = (x - 1) & 255;
      t = a + M[0x52]; a = t & 255;
      if (t > 255) { a = (a - M[0x51]) & 255; y = (y - 1) & 255; }
    }
    if (y < 0x40) return Object.assign({ y }, P.COVER_LEFT_FROM({ x }));
    if (y >= 0xC0) {
      for (;;) {
        P.N.skip++;
        x = (x - 1) & 255;
        if (x < M[0x89]) return { a, x, y, c: 0 };
        t = a + M[0x52]; a = t & 255;
        if (t > 255) { a = (a - M[0x51]) & 255; y = (y - 1) & 255; if (y < 0xC0) break; }
      }
    }
    M[0x0F] = a;
    a = x & 0xFC; if (a < M[0x89]) a = M[0x89];
    M[0x07] = a;
    cell(x, y);
    for (;;) {
      a = plot(0xFAD8, x, y);
      x = (x - 1) & 255;
      if (x < M[0x07]) {
        a = (x - 3) & 255;
        if (a < M[0x89]) {
          if (x < M[0x89]) return { a, x, y, c: 0 };
          a = M[0x89];
        }
        M[0x07] = a;
        t = M[0x1E] - 8; M[0x1E] = t & 255;
        if (t < 0) M[0x1F] = (M[0x1F] - 1) & 255;
      }
      t = M[0x0F] + M[0x52]; a = t & 255;
      if (t > 255) {
        a = (a - M[0x51]) & 255;
        M[0x0F] = a;
        const old = y;
        y = (y - 1) & 255;
        if (!(old & 7)) {
          if (y < 0x40) return Object.assign({ y }, P.COVER_LEFT_FROM({ x }));
          up();
        }
      } else M[0x0F] = a;
    }
  };
  // LINE_RIGHT ($FB19): 45 degrees or flatter, to the right
  P.LINE_RIGHT = r => {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255, t;
    if (a < 0x40) return { a, x, y, c: 0 };
    if (a >= 0xC0) a = 0xBF;
    M[0x89] = a;
    a = (M[0x51] >> 1) ^ 0xFF;
    if (x > M[0x89]) return { a, x, y, c: 1 };
    while (x < 0x40) {
      P.N.skip++;
      x = (x + 1) & 255;
      t = a + M[0x52]; a = t & 255;
      if (t > 255) { a = (a - M[0x51]) & 255; y = (y - 1) & 255; }
    }
    const fill = () => { M[0x89] = (M[0x89] + 1) & 255; return Object.assign({ y }, P.COVER_RIGHT_FROM({ x })); };
    if (y < 0x40) return fill();
    if (y >= 0xC0) {
      for (;;) {
        P.N.skip++;
        x = (x + 1) & 255;
        if (x > M[0x89]) return { a, x, y, c: 1 };
        t = a + M[0x52]; a = t & 255;
        if (t > 255) { a = (a - M[0x51]) & 255; y = (y - 1) & 255; if (y < 0xC0) break; }
      }
    }
    M[0x0F] = a;
    a = (x & 0xFC) | 3; if (a >= M[0x89]) a = M[0x89];
    M[0x07] = a;
    cell(x, y);
    for (;;) {
      a = plot(0xFBBF, x, y);
      if (x >= M[0x07]) {
        a = (x + 4) & 255;
        if (a >= M[0x89]) {
          if (x >= M[0x89]) return { a, x, y, c: 1 };
          a = M[0x89];
        }
        M[0x07] = a;
        t = M[0x1E] + 8; M[0x1E] = t & 255;
        if (t > 255) M[0x1F] = (M[0x1F] + 1) & 255;
      }
      x = (x + 1) & 255;
      t = M[0x0F] + M[0x52]; a = t & 255;
      if (t > 255) {
        a = (a - M[0x51]) & 255;
        M[0x0F] = a;
        const old = y;
        y = (y - 1) & 255;
        if (!(old & 7)) {
          if (y < 0x40) return fill();
          up();
        }
      } else M[0x0F] = a;
    }
  };

  // LINE_COLOUR ($FC01): which of the two mask tables the lines draw with, $A400 (X 0) or $A480
  // (X 1), written into the four loops' ANDs; X kept at $C3AB
  P.LINE_COLOUR = r => {
    const x = r.x & 255;
    M[0xC3AB] = x;
    const a = M[0xFC14 + x];
    M[0xF8DF] = a; M[0xF9E6] = a; M[0xFAEE] = a; M[0xFBD5] = a;
    return { a, x };
  };
  // LINE_OPCODE ($FC16): A written over the four loops' AND ($3D): $2C, BIT, draws nothing
  P.LINE_OPCODE = r => {
    const a = r.a & 255;
    M[0xF8DE] = a; M[0xF9E5] = a; M[0xFAED] = a; M[0xFBD4] = a;
    return { a };
  };
  // the seventeen bytes of the pixel's test from $FC67 + Y - 16 on into each loop, and $C3AD
  const writeTest = (a, y) => {
    M[0xC3AD] = a;
    for (let x = 0x10; x >= 0; x--) {
      a = M[0xFC67 + y];
      M[0xF8CB + x] = a; M[0xF9D2 + x] = a; M[0xFADA + x] = a; M[0xFBC1 + x] = a;
      y = (y - 1) & 255;
    }
    return { a, x: 0xFF, y };
  };
  // LINE_MODE_TRACK ($FC23): the lines drawn as the track's (the test from $FC68), the columns
  // covered on page $C6
  P.LINE_MODE_TRACK = r => {
    M[0xF92B] = 0xC6; M[0xFA32] = 0xC6;
    return writeTest(0, 0x11);
  };
  // LINE_MODE_CAR ($FC31): the lines drawn as the opponent's car's (the test from $FC81), the
  // columns covered on page $C5, and the view's limits ($C640/$C680) kept at $C540/$C580
  P.LINE_MODE_CAR = r => {
    M[0xF92B] = 0xC5; M[0xFA32] = 0xC5;
    for (let x = 0x3F; x >= 0; x--) { M[0xC540 + x] = M[0xC640 + x]; M[0xC580 + x] = M[0xC680 + x]; }
    return writeTest(0x80, 0x2A);
  };
  // LINE_LIMIT_HIDE ($FC99): LINE_LIMIT, and the pixels at or below the limit sent to the test
  // that hides them; LINE_LIMIT ($FCA2): the track's test's limit read from $C540 for $0240
  P.LINE_LIMIT_HIDE = r => {
    P.LINE_LIMIT({});
    M[0xF8CB + 0x0B] = 0xE2; M[0xF9D2 + 0x0B] = 0xE2; M[0xFADA + 0x0B] = 0xE2; M[0xFBC1 + 0x0B] = 0xE2;
    return { a: 0xE2, x: 0x0B, y: r.y };
  };
  P.LINE_LIMIT = r => {
    M[0xF8CB + 9] = 0xC5; M[0xF9D2 + 9] = 0xC5; M[0xFADA + 9] = 0xC5; M[0xFBC1 + 9] = 0xC5;
    return { a: 0xC5, x: 9, y: r.y };
  };
  // COPY_LIMITS ($FCB3): $0280-$02BF to $C5C0 and $02C0-$02FF to $C600
  P.COPY_LIMITS = r => {
    for (let x = 0x3F; x >= 0; x--) { M[0xC5C0 + x] = M[0x0280 + x]; M[0xC600 + x] = M[0x02C0 + x]; }
    return { a: M[0x02C0], x: 0xFF, y: r.y };
  };

  // LINE_CLIP ($FCC5): the line from point Y to point X when either is off the screen (a high byte
  // set: $A298/$A2E4). A point above the view's top has its column, clamped to $3F-$C0, at $8B
  // (point Y) or $8C (point X); with both above, the columns between are covered and that is all.
  // Otherwise the distances across and up ($51/$77, $52/$78, their signs at $79/$7A) are halved
  // until the larger is below $40, doubling a count from 1 ($81); then each end off the screen is
  // walked along the line, by those steps with their fractions ($7B/$7C), until it is on, while the
  // count lasts. A line whose ends never come on is no line, but with $C365 bit 7 the columns
  // under its clamped ends are covered. Then the columns under the ends above the top are covered
  // (COVER_ABOVE), and the line drawn from its lower end (LINE_FROM_ENDS).
  P.LINE_CLIP = r => {
    let x = r.x & 255, a, t;
    const y = r.y & 255;
    M[0x8B] = 0; M[0x8C] = 0;
    M[0x4F] = M[0xA200 + y]; M[0x50] = M[0xA24C + y]; M[0x73] = M[0xA298 + y]; M[0x74] = M[0xA2E4 + y];
    const clamp = (hi, lo) => (hi & 0x80) ? 0x3F : hi ? 0xC0 : lo < 0x40 ? 0x3F : lo < 0xC0 ? lo : 0xC0;
    const above = (hi, lo) => (hi & 0x80) || (!hi && lo < 0x40);
    if (above(M[0x74], M[0x50])) M[0x8B] = clamp(M[0x73], M[0x4F]);
    M[0x4E] = M[0xA200 + x]; M[0x8A] = M[0xA24C + x]; M[0x75] = M[0xA298 + x]; M[0x76] = M[0xA2E4 + x];
    if (above(M[0x76], M[0x8A])) {
      a = M[0x8C] = clamp(M[0x75], M[0x4E]);
      x = M[0x8B];
      if (x) {
        if (a >= M[0x8B]) { a = M[0x8B]; x = M[0x8C]; }
        return Object.assign({ y }, P.COVER_LEFT({ a, x }));
      }
    }
    M[0x79] = 0; M[0x7A] = 0;
    t = M[0x4E] - M[0x4F]; M[0x51] = t & 255; M[0x7D] = t & 255;
    a = (M[0x75] - M[0x73] - (t < 0 ? 1 : 0)) & 255;
    M[0x77] = a;
    if (a & 0x80) {
      M[0x79] = 0xFF;
      t = 0 - M[0x51]; M[0x7D] = t & 255;
      a = (0 - M[0x77] - (t < 0 ? 1 : 0)) & 255;
    }
    M[0x7F] = a;
    t = M[0x8A] - M[0x50]; M[0x52] = t & 255; M[0x7E] = t & 255;
    a = (M[0x76] - M[0x74] - (t < 0 ? 1 : 0)) & 255;
    M[0x78] = a;
    if (a & 0x80) {
      M[0x7A] = 0xFF;
      t = 0 - M[0x52]; M[0x7E] = t & 255;
      a = (0 - M[0x78] - (t < 0 ? 1 : 0)) & 255;
    }
    if (a > M[0x7F] || (a === M[0x7F] && (x = M[0x7E]) >= M[0x7D])) { M[0x7F] = a; M[0x7D] = x; }
    M[0x7B] = 0; M[0x7C] = 0; M[0x81] = 1;
    a = M[0x7D];
    if (!M[0x7F] && a < 0x40) return { a, x: 0, y, c: 0 };
    // halve both distances, the bits shifted out into the fractions, until the larger is below $40
    let c = 0;
    for (;;) {
      c = M[0x77] & 1; M[0x77] >>= 1;
      let c2 = M[0x51] & 1; M[0x51] = (M[0x51] >> 1) | (c << 7);
      M[0x7B] = (M[0x7B] >> 1) | (c2 << 7);
      c = M[0x78] & 1; M[0x78] >>= 1;
      c2 = M[0x52] & 1; M[0x52] = (M[0x52] >> 1) | (c << 7);
      M[0x7C] = (M[0x7C] >> 1) | (c2 << 7);
      M[0x81] = (M[0x81] << 1) & 255;
      c = M[0x7F] & 1; M[0x7F] >>= 1;
      if (M[0x7F]) { a = (a >> 1) | (c << 7); continue; }
      a = (a >> 1) | (c << 7);
      if (a < 0x40) break;
    }
    x = M[0x81];
    M[0x7D] = 0; M[0x7E] = 0;
    // the steps run out: no line, or with $C365 bit 7 the columns under its ends covered
    const none = () => {
      if (!(M[0xC365] & 0x80)) return { a: M[0xC365], x: 0, y, c: 0 };
      if (!(M[0x79] & 0x80)) { M[0x4F] = 0xC0; M[0x4E] = 0x3F; }
      else { M[0x4E] = 0xC0; M[0x4F] = 0x3F; }
      return P.COVER_ABOVE({ a: 0x3F, x: 0xC0, y });
    };
    while (M[0x74] | M[0x73]) {
      t = M[0x7D] + M[0x7B]; M[0x7D] = t & 255;
      t = M[0x4F] + M[0x51] + (t >> 8); M[0x4F] = t & 255;
      M[0x73] = (M[0x73] + M[0x79] + (t >> 8)) & 255;
      t = M[0x7E] + M[0x7C]; M[0x7E] = t & 255;
      t = M[0x50] + M[0x52] + (t >> 8); M[0x50] = t & 255;
      M[0x74] = (M[0x74] + M[0x7A] + (t >> 8)) & 255;
      x = (x - 1) & 255;
      if (!x) return none();
    }
    M[0x7D] = 0; M[0x7E] = 0;
    while (M[0x76] | M[0x75]) {
      t = M[0x7D] - M[0x7B]; M[0x7D] = t & 255;
      t = M[0x4E] - M[0x51] - (t < 0 ? 1 : 0); M[0x4E] = t & 255;
      M[0x75] = (M[0x75] - M[0x79] - (t < 0 ? 1 : 0)) & 255;
      t = M[0x7E] - M[0x7C]; M[0x7E] = t & 255;
      t = M[0x8A] - M[0x52] - (t < 0 ? 1 : 0); M[0x8A] = t & 255;
      M[0x76] = (M[0x76] - M[0x7A] - (t < 0 ? 1 : 0)) & 255;
      x = (x - 1) & 255;
      if (!x) return none();
    }
    P.COVER_ABOVE({ x, y });
    if (M[0x50] < M[0x8A]) {
      t = M[0x8A]; M[0x8A] = M[0x50]; M[0x50] = t;
      t = M[0x4E]; M[0x4E] = M[0x4F]; M[0x4F] = t;
    }
    return P.LINE_FROM_ENDS({});
  };
  // COVER_ABOVE ($FE6E): for each end above the view's top ($8B for the one at $4F, $8C for the
  // one at $4E), the columns between its clamped column and where the line comes on covered
  P.COVER_ABOVE = r => {
    let q = { a: M[0x8B], x: r.x, y: r.y };
    if (M[0x8B]) {
      let x = M[0x4F], a = M[0x8B];
      if (!(a < M[0x4F])) { x = M[0x8B]; a = M[0x4F]; }
      q = Object.assign({ y: r.y }, P.COVER_LEFT({ a, x }));
    }
    if (!M[0x8C]) return Object.assign({}, q, { a: 0, z: 1 });
    let x = M[0x4E], a = M[0x8C];
    if (!(a < M[0x4E])) { x = M[0x8C]; a = M[0x4E]; }
    return Object.assign({ y: r.y }, P.COVER_LEFT({ a, x }));
  };

  // LINE ($FE91): the line between points X and Y, unless either is behind the eye ($A330 bit 7):
  // LINE_ON_SCREEN when both are on the screen, LINE_CLIP otherwise
  P.LINE = r => {
    const x = r.x & 255, y = r.y & 255;
    const a = M[0xA330 + x] | M[0xA330 + y];
    if (a & 0x80) return { a, x, y, n: 1 };
    if (!(M[0xA298 + x] | M[0xA298 + y] | M[0xA2E4 + x] | M[0xA2E4 + y])) return P.LINE_ON_SCREEN({ x, y });
    return P.LINE_CLIP({ x, y });
  };
  // LINE_SPAN ($FEAB): the columns of points X and Y widen the span $60-$61, then LINE_ON_SCREEN
  P.LINE_SPAN = r => {
    const x = r.x & 255, y = r.y & 255;
    for (const a of [M[0xA200 + x], M[0xA200 + y]]) {
      if (a < M[0x60]) M[0x60] = a;
      if (a >= M[0x61]) M[0x61] = a;
    }
    return P.LINE_ON_SCREEN({ x, y });
  };
  // LINE_ON_SCREEN ($FEC9): the line between points X and Y, both on the screen: the lower end at
  // $4F/$50, the upper at $4E/$8A, then LINE_FROM_ENDS
  P.LINE_ON_SCREEN = r => {
    const x = r.x & 255, y = r.y & 255;
    if (M[0xA24C + x] >= M[0xA24C + y]) {
      M[0x50] = M[0xA24C + x]; M[0x8A] = M[0xA24C + y]; M[0x4F] = M[0xA200 + x]; M[0x4E] = M[0xA200 + y];
    } else {
      M[0x8A] = M[0xA24C + x]; M[0x50] = M[0xA24C + y]; M[0x4E] = M[0xA200 + x]; M[0x4F] = M[0xA200 + y];
    }
    return P.LINE_FROM_ENDS({ x, y });
  };
  // LINE_FROM_ENDS ($FEF6): the line from its lower end ($4F, $50) to its upper ($4E, $8A). For
  // the opponent's car ($C3AD bit 7), when either end is at or below the view's bottom ($C0), the
  // lowest rows of the columns between ($0240) are set to $C0 first. Then the loop for its
  // direction: LINE_RIGHT, LINE_UP_RIGHT, LINE_LEFT or LINE_UP_LEFT.
  P.LINE_FROM_ENDS = r => {
    if ((M[0xC3AD] & 0x80) && (M[0x50] >= 0xC0 || M[0x8A] >= 0xC0)) {
      let x = M[0x4F], a;
      if (x < M[0x4E]) a = M[0x4E]; else { a = x; x = M[0x4E]; }
      if (a >= 0xC0) a = 0xBF;
      a = (a + 1) & 255;
      if (x < 0x40) x = 0x40;
      M[0x89] = a;
      for (; x < M[0x89]; x = (x + 1) & 255) M[0x0240 + x] = 0xC0;
    }
    M[0x52] = (M[0x50] - M[0x8A]) & 255;
    const x = M[0x4F], y = M[0x50];
    const t = M[0x4E] - M[0x4F];
    if (t >= 0) {
      M[0x51] = t;
      return t >= M[0x52] ? P.LINE_RIGHT({ a: M[0x4E], x, y }) : P.LINE_UP_RIGHT({ a: M[0x8A], x, y });
    }
    M[0x51] = (0 - t) & 255;
    return M[0x51] >= M[0x52] ? P.LINE_LEFT({ a: M[0x4E], x, y }) : P.LINE_UP_LEFT({ a: M[0x8A], x, y });
  };

  // SQUARE_PIECE ($FF6A): the piece on the square $0B across and $0C along from the view's ($5C,
  // $5E), carry set when that is off the map (PIECE_FROM_HERE)
  P.SQUARE_PIECE = r => {
    let a = (M[0x5E] + M[0x0C]) & 255;
    if (a >= 0x10) return { a, x: r.x, y: r.y, c: 1 };
    M[0x14] = (a << 4) & 255;
    a = (M[0x5C] + M[0x0B]) & 255;
    if (a >= 0x10) return { a, x: r.x, y: r.y, c: 1 };
    const x = (a & 0x0F) | M[0x14];
    return Object.assign({}, P.PIECE_FROM_HERE({ a: x, x, y: r.y }), { c: 0 });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
