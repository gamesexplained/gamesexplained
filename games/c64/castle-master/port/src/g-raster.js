// The renderer's faces ($3EE5-$473A): which way a projected face winds, the faces of an object
// emitted into the render buffer (clipped first, or not, and culled or coloured by their winding),
// each face's edges walked into the span tables, and the spans painted into the linear buffer.
//
// The span tables are by screen row: $10B1 + row the left end, $112A + row the right end and
// $11A3 + row how many ends the row has (0, 1 or 2). The linear buffer ($10A0/$10A1) is 30 bytes
// a row, four 2-bit pixels to a byte; the screen is 120 by 121, x mirrored ($77 - x) as the
// rasteriser takes it.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.raster = function (P) {
  const M = P.M, N = P.N;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => (ptr(zp) + y) & 0xFFFF;
  const neg = v => (0 - v) & 255;

  // CLASSIFY_PROJECTED_WINDING: for the three points at ($7A) + Y (x, y pairs), the cross product
  // (x2 - x0)(y1 - y0) - (x1 - x0)(y2 - y0) as 32 bits in $82-$85; the carry set when it is not
  // negative. $7A/$7B and Y are kept.
  P.CLASSIFY_PROJECTED_WINDING = function (r) {
    const y = r.y, base = at(0x7A, y), p = k => M[(base + k) & 0xFFFF];
    const word = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
    word(0x88, p(4) - p(0)); word(0x8C, p(3) - p(1));
    let x = P.MUL_S16_S16_TO_S32({ x: r.x }).x;
    const first = (M[0x82] | M[0x83] << 8 | M[0x84] << 16 | M[0x85] << 24) >>> 0;
    word(0x88, p(2) - p(0)); word(0x8C, p(5) - p(1));
    x = P.MUL_S16_S16_TO_S32({ x }).x;
    const second = (M[0x82] | M[0x83] << 8 | M[0x84] << 16 | M[0x85] << 24) >>> 0;
    const d = (first - second) >>> 0;
    M[0x82] = d & 255; M[0x83] = (d >>> 8) & 255; M[0x84] = (d >>> 16) & 255; M[0x85] = d >>> 24;
    return { a: M[0x7A], x, y, c: d & 0x80000000 ? 0 : 1 };
  };

  // PAINT_SCANLINE_SPANS_LINEAR: rows $1054 to $1053 of the span tables painted in the face's
  // colour $1235 (four bytes from $9D06, one for each row mod 4, a dither), each row's end count
  // cleared as it goes. A span inside one byte is masked at both ends; a longer one masks its end
  // bytes and fills between (a STA whose address the routine patches at $40BD).
  const LEFT = [0xFF, 0xFC, 0xF0, 0xC0], RIGHT = [0x03, 0x0F, 0x3F, 0xFF];
  P.PAINT_SCANLINE_SPANS_LINEAR = function (r) {
    M[0xB0] = M[0x1054];
    let y = ((M[0x1235] - 1) << 2) & 255, x = 4;
    for (; x > 0; x--, y = (y + 1) & 255) M[0xB0 + x] = M[0x9D06 + y];
    x = (M[0x1054] * 30) >> 8;
    setp(0x82, M[0x1054] * 30 + (M[0x10A0] | M[0x10A1] << 8));
    const plot = (yy, mask) => { const a = at(0x82, yy); M[a] = (M[a] & (mask ^ 0xFF)) | (M[0xB1 + (M[0xB0] & 3)] & mask); };
    let a;
    for (;;) {
      N.row++;
      y = M[0xB0];
      const ends = M[0x11A3 + y];
      M[0x11A3 + y] = 0;
      if (ends) {
        if (ends !== 2) M[0x112A + y] = M[0x10B1 + y];
        let L = M[0x10B1 + y];
        if (L > M[0x112A + y]) { x = M[0x112A + y]; M[0x112A + y] = L; L = x; M[0x10B1 + y] = L; }
        M[0xB5] = L >> 2;
        M[0xB6] = M[0x112A + y] >> 2;
        x = M[0xB0] & 3;
        if (M[0xB6] === M[0xB5]) {
          const R = RIGHT[M[0x112A + y] & 3];
          M[0x84] = R;
          y = M[0xB5];
          const mask = LEFT[L & 3] & R;
          M[0x84] = M[at(0x82, y)] & (mask ^ 0xFF);
          plot(y, mask);
        } else {
          if (L & 3) {
            y = M[0xB5];
            const mask = M[0x3F6E + (L & 3)];
            M[0x84] = M[at(0x82, y)] & (mask ^ 0xFF);
            plot(y, mask);
            M[0xB5] = (M[0xB5] + 1) & 255;
          }
          y = M[0xB0];
          const re = M[0x112A + y] & 3;
          let fill = true;
          if (re !== 3) {
            const mask = M[0x3F72 + re];
            y = M[0xB6];
            M[0x84] = M[at(0x82, y)] & (mask ^ 0xFF);
            plot(y, mask);
            M[0xB6] = (M[0xB6] - 1) & 255;
            if (M[0xB6] & 0x80) fill = false;
          }
          if (fill && !(((M[0xB6] - M[0xB5]) & 255) & 0x80)) {
            y = (M[0xB6] - M[0xB5]) & 255;
            const to = (ptr(0x82) + M[0xB5]) & 0xFFFF;
            M[0x40BD] = to & 255; M[0x40BE] = to >> 8;
            const v = M[0xB1 + x];
            N.fill += y + 1;
            for (; ; y = (y - 1) & 255) { M[(to + y) & 0xFFFF] = v; if (y === 0) { y = 0xFF; break; } }
          }
        }
      }
      setp(0x82, ptr(0x82) + 0x1E);
      M[0xB0] = (M[0xB0] + 1) & 255;
      a = M[0x1053];
      if ((a - M[0xB0]) & 0x80) return { a, x, y, c: a >= M[0xB0] ? 1 : 0 };
    }
  };
  // ---- the faces of an object, emitted into the render buffer at $10A8/$10A9: the object's id
  // ($105C), a face count, then each face as a byte of colour (high nibble) and vertex count, and
  // its projected points. The faces come from the object's topology at $12CC + Y: a count, then
  // each face's colour (0 hides it), vertex count and vertex numbers. $1069 says what the winding
  // does: 0 nothing, 1 a face that winds the wrong way is dropped, 2 or more the face takes the
  // high or low nibble of $1235 by its winding (a nibble of 0 drops it). An object with a face
  // gets a four-byte entry in the painter's directory ($10AC/$10AD: its buffer and its bounds
  // record $10AA/$10AB, which moves on 12) and $106A counts it.
  const directory = () => {
    setp(0x7C, M[0x10AC] | M[0x10AD] << 8);
    M[at(0x7C, 0)] = M[0x10A8]; M[at(0x7C, 1)] = M[0x10A9];
  };
  const directoryEnd = () => {
    M[at(0x7C, 2)] = M[0x10AA]; M[at(0x7C, 3)] = M[0x10AB];
    setp(0x10AC, ptr(0x7C) + 4);
    const a = (0x0C + M[0x10AA]) & 255; if (0x0C + M[0x10AA] > 255) M[0x10AB] = (M[0x10AB] + 1) & 255;
    M[0x10AA] = a;
    M[0x106A] = (M[0x106A] + 1) & 255;
    return a;
  };
  // the colour by winding (c the winding's carry): the high nibble of $1235 one way, the low the
  // other; -1 when that nibble is 0
  const byWinding = (c, low) => {
    const k = M[0x1235];
    if (c) { const h = k & 0xF0; return h ? (low | h) : -1; }
    const l = k & 0x0F; return l ? (low | (l << 4)) : -1;
  };

  // paint_scanline_spans_linear_local_40da: the faces of an object no plane cuts, projected once.
  P.paint_scanline_spans_linear_local_40da = function (r) {
    let x = r.y, y, a;
    const pr = P.PROJECT_VERTICES_PERSPECTIVE(r);
    M[0x105B] = 0;
    setp(0x7A, M[0x10A8] | M[0x10A9] << 8);
    M[at(0x7A, 0)] = M[0x105C]; M[at(0x7A, 1)] = 0;
    y = 2;
    M[0xA3] = M[0x12CC + x]; x = (x + 1) & 255;
    M[0x41A2] = M[0x7A]; M[0x41A3] = M[0x7B];
    let c = pr.c;
    do {
      a = M[0x12CC + x];
      if (!a) {
        x = (x + 1) & 255;
        a = (x + M[0x12CC + x]) & 255; c = x + M[0x12CC + x] > 255 ? 1 : 0;
        x = (a + 1) & 255;
      } else {
        x = (x + 1) & 255;
        M[0xA5] = ((a << 4) | M[0x12CC + x]) & 255;
        const head = y;
        y = (y + 1) & 255; M[0xA2] = y;
        M[0xA4] = M[0x12CC + x]; x = (x + 1) & 255;
        do {
          let v = (M[0x12CC + x] << 1) & 255; x = (x + 1) & 255;
          M[at(0x7A, M[0xA2])] = M[0xC0 + v]; v = (v + 1) & 255; M[0xA0] = v;
          M[0xA2] = (M[0xA2] + 1) & 255;
          M[at(0x7A, M[0xA2])] = M[0xC0 + v];
          M[0xA2] = (M[0xA2] + 1) & 255;
          M[0xA4] = (M[0xA4] - 1) & 255;
        } while (M[0xA4]);
        M[0xA1] = head;
        y = (head + 1) & 255;
        let keep = true;
        const mode = M[0x1069];
        if (mode === 1) {
          c = P.CLASSIFY_PROJECTED_WINDING({ y }).c;
          y = (y - 1) & 255;
          if (c) keep = false;
        } else if (mode) {
          M[0xA5] &= 0x0F;
          c = P.CLASSIFY_PROJECTED_WINDING({ y }).c;
          y = (y - 1) & 255;
          const v = byWinding(c, M[0xA5]);
          if (v < 0) keep = false; else M[0xA5] = v;
        }
        if (keep) {
          M[0x105B] = 1;
          const f = ((M[0x41A2] | M[0x41A3] << 8) + 1) & 0xFFFF;
          M[f] = (M[f] + 1) & 255;
          y = M[0xA1];
          M[at(0x7A, y)] = M[0xA5];
          const sum = M[0xA2] + M[0x7A]; M[0x7A] = sum & 255;
          M[0x7B] = (M[0x7B] + (sum >> 8)) & 255; c = M[0x7B] === 0 && sum > 255 ? 1 : 0;
          y = 0;
        }
      }
      M[0xA3] = (M[0xA3] - 1) & 255;
    } while (M[0xA3]);
    if (!M[0x105B]) return { a: 0, x, y, c };
    directory();
    setp(0x10A8, ptr(0x7A));
    return { a: directoryEnd(), x, y: 3 };
  };

  // emit_clipped_object_faces: the faces of an object a plane cuts, each copied out of the
  // object's vertices (saved at $02 first), clipped to the view volume and projected; a quad that
  // fills the view (its four points on its corners) marks the object ($80 in its face count),
  // counts in $106B and ends the object there.
  P.emit_clipped_object_faces = function (r) {
    M[0xA0] = r.y;
    M[0x82] = (M[0x10B0] << 1) & 255;
    let x = (((M[0x82] << 1) & 255) + M[0x82]) & 255, y, a, c;
    for (; x; x = (x - 1) & 255) M[(0x01 + x) & 255] = M[(0x3D + x) & 255];
    y = 0; M[0x105B] = 0;
    setp(0x7A, M[0x10A8] | M[0x10A9] << 8); x = M[0x10A9];
    M[at(0x7A, 0)] = M[0x105C]; M[at(0x7A, 1)] = 0;
    M[0xA1] = 2;
    y = M[0xA0]; M[0xA2] = M[0x12CC + y]; y = (y + 1) & 255; M[0xA0] = y;
    let full = false;
    do {
      y = M[0xA0];
      a = M[0x12CC + y];
      if (!a) {
        y = (y + 2) & 255;
        a = (y + M[0x12CB + y]) & 255; c = y + M[0x12CB + y] > 255 ? 1 : 0;
        M[0xA0] = a;
        continue;
      }
      y = (y + 1) & 255;
      M[0xA4] = ((a << 4) | M[0x12CC + y]) & 255; y = (y + 1) & 255;
      M[0xA5] = M[0xA4] & 0x0F; M[0x10B0] = M[0xA5];
      let out = 0;
      do {
        a = M[0x12CC + y]; y = (y + 1) & 255; M[0xA0] = y;
        M[0x83] = (a << 1) & 255;
        x = (((a << 2) & 255) + M[0x83]) & 255;
        y = out;
        for (M[0xA3] = 6; M[0xA3]; M[0xA3]--) { M[0x3E + y] = M[(0x02 + x) & 255]; y = (y + 1) & 255; x = (x + 1) & 255; }
        out = y;
        y = M[0xA0];
        M[0xA5] = (M[0xA5] - 1) & 255;
      } while (M[0xA5]);
      let o = P.CLIP_POLYGON_TO_VIEW_VOLUME({ a: out, x, y });
      x = o.x; y = o.y;
      if (!M[0x10B0]) continue;
      M[0xA4] = (M[0xA4] & 0xF0) | M[0x10B0];
      o = P.PROJECT_VERTICES_PERSPECTIVE({ a: M[0xA4], x, y, c: 0 });
      x = o.x; y = o.y;
      const mode = M[0x1069];
      if (mode) {
        if (mode !== 1) M[0xA4] &= 0x0F;
        setp(0x7A, 0x00C0);
        o = P.CLASSIFY_PROJECTED_WINDING({ x, y: 0 });
        x = o.x; y = o.y; c = o.c;
        setp(0x7A, M[0x10A8] | M[0x10A9] << 8);
        if (mode === 1) { if (c) continue; }
        else { const v = byWinding(c, M[0xA4]); if (v < 0) continue; M[0xA4] = v; }
      }
      M[0x105B] = 1;
      M[at(0x7A, 1)] = (M[at(0x7A, 1)] + 1) & 255;
      y = M[0xA1];
      M[at(0x7A, y)] = M[0xA4]; y = (y + 1) & 255;
      M[0xA5] = (M[0x10B0] << 1) & 255;
      x = 0;
      do { M[at(0x7A, y)] = M[(0xC0 + x) & 255]; x = (x + 1) & 255; y = (y + 1) & 255; } while (x < M[0xA5]);
      M[0xA1] = y;
      if (M[0x10B0] !== 4) continue;
      // the corners test: the game starts it at twice the face's end less 8, not at its first point
      M[0xA5] = y;
      y = ((y << 1) - 8) & 255;
      M[0x82] = 0; M[0x83] = 0; M[0x84] = 0; M[0x85] = 0;
      let corners = true;
      do {
        a = M[at(0x7A, y)];
        if (!a) {
          y = (y + 1) & 255;
          a = M[at(0x7A, y)];
          if (!a) M[0x82]++;
          else if (a === 0x78) M[0x83]++;
          else { corners = false; break; }
        } else {
          if (a !== 0x78) { corners = false; break; }
          y = (y + 1) & 255;
          if (M[at(0x7A, y)] === 0x78) M[0x84]++;
          else { corners = false; break; }
        }
        y = (y + 1) & 255;
      } while (y !== M[0xA5]);
      if (!corners) continue;
      let s = M[0x82] + M[0x83]; let k = s > 255 ? 1 : 0; s &= 255;
      s = s + M[0x84] + k; k = s > 255 ? 1 : 0; s &= 255;
      s = s + M[0x85] + k; s &= 255;
      if (s !== 4) continue;
      M[0x106B] = (M[0x106B] + 1) & 255;
      M[at(0x7A, 1)] |= 0x80;
      full = true;
      break;
    } while ((M[0xA2] = (M[0xA2] - 1) & 255));
    if (!full && !M[0x105B]) return { a: 0, x, y, c };
    directory();
    setp(0x10A8, ptr(0x7A) + M[0xA1]);
    return { a: directoryEnd(), x, y: 3 };
  };

  // ---- RASTERIZE_POLYGON_EDGES: the face's points at ($7C) + 1 copied to $C0, x mirrored, the
  // first repeated after the last; $1053/$1054 the lowest and highest rows; each edge walked
  // (Bresenham, the major axis by 8-bit compares) into the span tables, a row taking its first
  // end and then a second that differs. A level edge counts only on the face's top or bottom row.
  const mark = (row, xv, viaEnds) => {
    const e = M[0x11A3 + row];
    if (!e) { M[0x10B1 + row] = xv; M[0x11A3 + row] = 1; }
    else if (e === 1 && xv !== M[0x10B1 + row]) { M[0x112A + row] = xv; M[0x11A3 + row] = 2; }
  };
  P.RASTERIZE_POLYGON_EDGES = function (r) {
    const n2 = (M[0x10B0] << 1) & 255;
    let y, x = n2, a;
    y = n2;
    do { M[0xBF + y] = M[at(0x7C, y)]; y = (y - 1) & 255; } while (y);
    M[0xB0] = 0x77;
    M[0xC0] = (0x77 - M[0xC0]) & 255; M[(0xC0 + x) & 255] = M[0xC0];
    M[(0xC1 + x) & 255] = M[0xC1];
    x = 1; M[0x1053] = M[0x1054] = M[0xC1];
    x = 3;
    do {
      M[(0xBF + x) & 255] = (M[0xB0] - M[(0xBF + x) & 255]) & 255;
      a = M[(0xC0 + x) & 255];
      if (a >= M[0x1053]) M[0x1053] = a;
      if (a < M[0x1054]) M[0x1054] = a;
      M[0x82] = n2;
      x = (x + 2) & 255;
    } while (x < n2);
    x = 0;
    const z = k => M[(k + x) & 255];
    for (;;) {
      const y0 = z(0xC1), y1 = z(0xC3);
      y = y0;
      if (y0 === y1) {
        if ((y0 === M[0x1053] || y0 === M[0x1054]) && z(0xC0) !== z(0xC2)) {
          M[0x10B1 + y] = z(0xC0); M[0x112A + y] = z(0xC2); M[0x11A3 + y] = 2;
        }
      } else {
        y = y0 < y1 ? y0 : y1;
        if (z(0xC2) === z(0xC0)) {
          let d = (y0 - y1) & 255; if (d & 0x80) d = neg(d);
          M[0x82] = d;
          do { N.step++; mark(y, z(0xC0)); y = (y + 1) & 255; M[0x82] = (M[0x82] - 1) & 255; } while (!(M[0x82] & 0x80));
        } else {
          M[0x1231] = z(0xC0);
          a = (z(0xC2) - M[0x1231]) & 255;
          if (a & 0x80) { M[0xB1] = neg(a); M[0xB5] = M[0xB6] = 0xFF; } else { M[0xB1] = a; M[0xB5] = M[0xB6] = 1; }
          M[0x1232] = z(0xC1);
          a = (z(0xC3) - M[0x1232]) & 255;
          if (a & 0x80) { M[0xB2] = neg(a); M[0xB3] = M[0xB4] = 0xFF; } else { M[0xB2] = a; M[0xB3] = M[0xB4] = 1; }
          if (M[0xB1] < M[0xB2]) {
            M[0xB7] = M[0xB2]; M[0xB8] = M[0xB2] >> 1;
            do {
              N.step++;
              y = M[0x1232];
              mark(y, M[0x1231]);
              M[0x1232] = (M[0x1232] + M[0xB3]) & 255;
              a = (M[0xB8] + M[0xB1]) & 255; M[0xB8] = a;
              if (a >= M[0xB2]) { M[0xB8] = (a - M[0xB2]) & 255; M[0x1231] = (M[0x1231] + M[0xB6]) & 255; }
              M[0xB7] = (M[0xB7] - 1) & 255;
            } while (M[0xB7]);
          } else {
            M[0xB7] = M[0xB2]; M[0xB8] = M[0xB1] >> 1;
            do {
              N.step++;
              y = M[0x1232];
              mark(y, M[0x1231]);
              do {
                N.xstep++;
                M[0x1231] = (M[0x1231] + M[0xB5]) & 255;
                a = (M[0xB8] + M[0xB2]) & 255; M[0xB8] = a;
              } while (a < M[0xB1]);
              M[0xB8] = (a - M[0xB1]) & 255;
              M[0x1232] = (M[0x1232] + M[0xB4]) & 255;
              M[0xB7] = (M[0xB7] - 1) & 255;
            } while (M[0xB7]);
          }
        }
      }
      M[0x82] = n2;
      x = (x + 2) & 255;
      if (x >= n2) return { a: n2, x, y, c: 1 };
    }
  };

  // RASTERIZE_LINE_SPANS: a line's two points at ($7C) + 1, x mirrored, into the span tables: a
  // level line as one row with both ends, an upright one as one end a row, any other by Bresenham
  // (along y one end a row; along x each run of a row given both its ends).
  P.RASTERIZE_LINE_SPANS = function (r) {
    M[0xB0] = 0x77;
    M[0xC0] = (0x77 - M[at(0x7C, 1)]) & 255; M[0xC1] = M[at(0x7C, 2)];
    M[0xC2] = (M[0xB0] - M[at(0x7C, 3)]) & 255; M[0xC3] = M[at(0x7C, 4)];
    let x, y = 4, a;
    if (M[0xC3] === M[0xC1]) {
      x = M[0xC3]; M[0x1054] = x; M[0x1053] = x;
      M[0x11A3 + x] = 2; M[0x10B1 + x] = M[0xC0]; M[0x112A + x] = M[0xC2];
      return { a: M[0xC2], x, y };
    }
    if (M[0xC0] === M[0xC2]) {
      x = M[0xC3]; y = M[0xC1]; a = (M[0xC3] - M[0xC1]) & 255;
      if (a & 0x80) { x = M[0xC1]; y = M[0xC3]; a = (M[0xC1] - M[0xC3]) & 255; }
      M[0x1054] = y; M[0x1053] = x; x = a;
      do { N.line++; M[0x10B1 + y] = M[0xC0]; M[0x11A3 + y] = 1; y = (y + 1) & 255; } while (y <= M[0x1053]);
      return { a: 1, x, y, c: 1 };
    }
    M[0xB2] = 1; M[0xB3] = 1;
    a = (M[0xC2] - M[0xC0]) & 255;
    if (a & 0x80) { a = neg(a); x = 0xFF; M[0xB2] = 0xFF; }
    M[0x83] = a;
    M[0x1053] = M[0xC3];
    y = M[0xC1];
    a = (M[0xC3] - M[0xC1]) & 255;
    if (a & 0x80) {
      x = 0xFF; M[0xB3] = 0xFF;
      M[0xB2] = neg(M[0xB2]);
      a = neg(a);
      y = M[0xC3]; x = M[0xC1]; M[0x1053] = x;
    }
    M[0x1054] = y;
    M[0x82] = a;
    if (!(((a - M[0x83]) & 255) & 0x80)) {
      M[0xB4] = M[0x82]; M[0xB5] = M[0x83]; M[0xB1] = M[0xB4]; M[0xB0] = M[0xB4] >> 1;
      a = (M[0xB3] & 0x80) ? M[0xC2] : M[0xC0];
      M[0x10B1 + y] = a; x = a; M[0x11A3 + y] = 1;
      do {
        N.line++;
        a = (M[0xB5] + M[0xB0]) & 255; M[0xB0] = a;
        a = (a - M[0xB4]) & 255;
        if (!(a & 0x80)) { M[0xB0] = a; x = (x + M[0xB2]) & 255; }
        y = (y + 1) & 255;
        M[0x10B1 + y] = x; M[0x11A3 + y] = 1;
        M[0xB1] = (M[0xB1] - 1) & 255;
      } while (M[0xB1]);
      return { a: 1, x, y };
    }
    M[0xB5] = M[0x82]; M[0xB4] = M[0x83]; M[0xB1] = M[0xB4]; M[0xB0] = M[0xB4] >> 1;
    x = M[0xB3];
    a = (x & 0x80) ? M[0xC2] : M[0xC0];
    M[0x84] = a; M[0x10B1 + y] = a; M[0x11A3 + y] = 1;
    do {
      N.line++;
      M[0x84] = (M[0x84] + M[0xB2]) & 255;
      a = (M[0xB5] + M[0xB0]) & 255; M[0xB0] = a;
      a = (a - M[0xB4]) & 255;
      if (!(a & 0x80)) {
        M[0xB0] = a;
        M[0x112A + y] = (M[0x84] - M[0xB2]) & 255; M[0x11A3 + y] = 2;
        y = (y + 1) & 255;
        M[0x10B1 + y] = M[0x84]; M[0x11A3 + y] = 1;
      }
      M[0xB1] = (M[0xB1] - 1) & 255;
    } while (M[0xB1]);
    M[0x112A + y] = M[0x84]; M[0x11A3 + y] = 2;
    return { a: 2, x, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
