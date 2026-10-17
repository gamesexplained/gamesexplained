// The renderer's geometry ($36A9-$3EE4): the 3 by 3 fixed-point matrix product, the vertices
// taken into the camera's frame, each vertex classified against one of the five planes of the view
// volume (x + z, y + z, z - x, z - y and z itself), a polygon rejected when all its vertices are
// outside one plane, clipped plane by plane where it crosses (an edge cut at the plane by multiply
// and divide), and projected (x and y over z, times 60, about the centre at 60).
//
// Vertices are six bytes each from $3E: x, y and z, signed 16-bit, low first; $10B0 counts them.
// Their screen positions go to $C0 + 2n (x) and $C1 + 2n (y). The clip writes its output polygon
// to $8A24 and copies it back to $3E.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.geom = function (P) {
  const M = P.M;
  // a word in the zero page, at an address that wraps there as the 6502's zp,x does
  const g16 = a => M[a & 255] | M[(a + 1) & 255] << 8;
  const s16 = (a, v) => { M[a & 255] = v & 255; M[(a + 1) & 255] = (v >> 8) & 255; };
  // the carry out of a 16-bit add's high byte, and of a 16-bit subtract's (set: no borrow)
  const addC = (u, v) => ((u & 0xFFFF) + (v & 0xFFFF)) > 0xFFFF ? 1 : 0;
  const subC = (u, v) => (u & 0xFFFF) >= (v & 0xFFFF) ? 1 : 0;

  // MULTIPLY_3X3_FIXED_MATRICES: $106C (A) times $1075 (B), each entry a signed byte, the products
  // summed as words at $3697-$36A8 and each sum shifted left two and rounded on the third bit
  // into $106C. The low bytes are left shifted three, as the game leaves them.
  P.MULTIPLY_3X3_FIXED_MATRICES = function (r) {
    M[0xB4] = 3;
    for (let x = 0x12; x > 0; x--) M[0x3696 + x] = 0;
    M[0xB2] = 0; M[0xB1] = 0;
    let b0 = 0;
    rows: for (;;) {
      M[0xB0] = b0; M[0xB3] = 3;
      for (;;) {
        P.MUL_S8_S8_TO_S16({ x: M[0x1075 + M[0xB0]], y: M[0x106C + M[0xB1]] });
        const x = M[0xB2];
        let s = M[0x3697 + x] + M[0x82]; M[0x3697 + x] = s & 255;
        s = M[0x3698 + x] + M[0x83] + (s >> 8); M[0x3698 + x] = s & 255;
        M[0xB0] = (M[0xB0] + 1) & 255; M[0xB1] = (M[0xB1] + 3) & 255;
        M[0xB3] = (M[0xB3] - 1) & 255;
        if (M[0xB3]) continue;
        M[0xB2] = (M[0xB2] + 2) & 255;
        M[0xB1] = (M[0xB1] - 8) & 255;
        if (M[0xB1] < 3) { b0 = (M[0xB0] - 3) & 255; continue rows; }
        M[0xB1] = 0; M[0xB3] = 3;
        M[0xB4] = (M[0xB4] - 1) & 255;
        if (!M[0xB4]) break rows;
      }
    }
    let a = 0, c = 0;
    for (let x = 0x12, y = 9; y > 0; y--, x -= 2) {
      let hi = M[0x3696 + x], lo = M[0x3695 + x], k;
      k = lo >> 7; lo = (lo << 1) & 255; hi = ((hi << 1) | k) & 255;
      k = lo >> 7; lo = (lo << 1) & 255; hi = ((hi << 1) | k) & 255;
      k = lo >> 7; lo = (lo << 1) & 255;
      M[0x3695 + x] = lo;
      a = (hi + k) & 255; c = hi + k > 255 ? 1 : 0;
      M[0x106B + y] = a;
    }
    return { a, x: 0, y: 0, c };
  };

  // TRANSFORM_VERTICES_TO_CAMERA_SPACE: each of $10B0 vertices (the words at $02 on, three to a
  // vertex) times the view matrix $106C, the 24-bit products shifted left two and their top two
  // bytes summed into the vertex at $3E + 6n, the slots $3E-$79 cleared first.
  P.TRANSFORM_VERTICES_TO_CAMERA_SPACE = function (r) {
    M[0xB2] = M[0x10B0];
    M[0xB3] = 0; M[0xB0] = 0; M[0xB1] = 0;
    for (let y = 10; y > 0; y--) for (const b of [0x6F, 0x65, 0x5B, 0x51, 0x47, 0x3D]) M[b + y] = 0;
    let x = 0, y = r.y, c = r.c;
    do {
      M[0xB5] = 3;
      for (;;) {
        M[0xB4] = 3;
        do {
          y = M[0x106C + M[0xB3]]; M[0x82] = y;
          const i = M[0xB1];
          P.MUL_S16_S8_TO_S24({ a: M[0x02 + i], x: M[(0x03 + i) & 255], y });
          for (let k = 0; k < 2; k++) {
            const c1 = M[0x82] >> 7, c2 = M[0x83] >> 7;
            M[0x82] = (M[0x82] << 1) & 255; M[0x83] = ((M[0x83] << 1) | c1) & 255; M[0x84] = ((M[0x84] << 1) | c2) & 255;
          }
          x = M[0xB0];
          const v = g16(0x3E + x), d = M[0x83] | M[0x84] << 8;
          c = addC(v, d); s16(0x3E + x, v + d);
          M[0xB3] = (M[0xB3] + 1) & 255; M[0xB1] = (M[0xB1] + 2) & 255;
          M[0xB4] = (M[0xB4] - 1) & 255;
        } while (M[0xB4]);
        M[0xB0] = (M[0xB0] + 2) & 255;
        M[0xB5] = (M[0xB5] - 1) & 255;
        if (!M[0xB5]) break;
        c = M[0xB1] >= 6 ? 1 : 0; M[0xB1] = (M[0xB1] - 6) & 255;
      }
      M[0xB3] = 0;
      M[0xB2] = (M[0xB2] - 1) & 255;
    } while (M[0xB2]);
    return { a: 0, x, y, c };
  };

  // ---- the edge clip. CLIP_EDGE_TO_SELECTED_PLANE patches its JMP at $37C5 with the plane's
  // routine from the table at $37C8 ($104B, 1-5) and goes there with X (the edge's second vertex,
  // at $3E + X; the first at $38 + X) pushed twice, which the routine pulls back. The routine cuts
  // the edge where it crosses the plane and writes the point over the first vertex.
  const ROUTINES = { 0x37D2: 'INTERSECT_X_PLUS_Z_PLANE', 0x3898: 'INTERSECT_Y_PLUS_Z_PLANE',
    0x395E: 'INTERSECT_Z_MINUS_X_PLANE', 0x3A17: 'INTERSECT_Z_MINUS_Y_PLANE', 0x3AD0: 'INTERSECT_Z_ZERO_PLANE' };
  P.CLIP_EDGE_TO_SELECTED_PLANE = function (r) {
    const y = ((M[0x104B] << 1) - 2) & 255;
    M[0x37C6] = M[0x37C8 + y]; M[0x37C7] = M[0x37C9 + y];
    const to = M[0x37C6] | M[0x37C7] << 8, name = ROUTINES[to];
    if (!name) throw new Error('CLIP_EDGE_TO_SELECTED_PLANE: the JMP at $37C5 goes to $' + to.toString(16));
    return P[name](Object.assign({}, r, { y }));
  };
  // the multiply and divide each plane's cut makes twice: $88/$89 times $8C/$8D, over the word at d
  function scale(d, y) {
    y = P.MUL_S16_S16_TO_S32({ y }).y;
    M[0x8C] = M[d]; M[0x8D] = M[d + 1];
    M[0x88] = M[0x82]; M[0x89] = M[0x83]; M[0x8A] = M[0x84]; M[0x8B] = M[0x85];
    return P.DIV_S32_BY_S16({ y }).y;
  }
  const quot = () => M[0x88] | M[0x89] << 8;
  const set8C = v => { M[0x8C] = v & 255; M[0x8D] = (v >> 8) & 255; };
  const set88 = v => { M[0x88] = v & 255; M[0x89] = (v >> 8) & 255; };
  const setBC = v => { M[0xBC] = v & 255; M[0xBD] = (v >> 8) & 255; };
  const setBE = v => { M[0xBE] = v & 255; M[0xBF] = (v >> 8) & 255; };
  const done = (x, y, at, sum, v) => { s16(at, sum + v); return { a: M[(at + 1) & 255], x, y, c: addC(sum, v) }; };
  // the edge's two ends: A at $38 + x (the one rewritten), B at $3E + x; each x, y, z
  const ends = x => ({ ax: 0x38 + x, ay: 0x3A + x, az: 0x3C + x, bx: 0x3E + x, by: 0x40 + x, bz: 0x42 + x });
  // the planes x + z = 0 and y + z = 0 (u the edge's x or y): the cut's z first, u = -z, then the
  // other coordinate w
  function sumPlane(r, u, w) {
    const x = r.x, e = ends(x), au = g16(e['a' + u]), az = g16(e.az);
    const v1 = au + az; setBC(v1); set88(v1);
    setBE(au - g16(e['b' + u]) - g16(e.bz) + az);
    set8C(g16(e.bz) - az);
    let y = scale(0xBE, r.y);
    const z = (g16(e.az) + quot()) & 0xFFFF; s16(e.az, z);
    s16(e['a' + u], -z);
    set8C(g16(e['b' + w]) - g16(e['a' + w]));
    set88(M[0xBC] | M[0xBD] << 8);
    y = scale(0xBE, y);
    return done(x, y, e['a' + w], quot(), g16(e['a' + w]));
  }
  // the planes z - x = 0 and z - y = 0: the cut's z first, u = z, then w
  function diffPlane(r, u, w) {
    const x = r.x, e = ends(x), au = g16(e['a' + u]), az = g16(e.az);
    const v1 = az - au; setBC(v1); set88(v1);
    setBE(g16(e['b' + u]) - au - g16(e.bz) + az);
    set8C(g16(e.bz) - az);
    let y = scale(0xBE, r.y);
    const z = (g16(e.az) + quot()) & 0xFFFF; s16(e.az, z); s16(e['a' + u], z);
    set8C(g16(e['b' + w]) - g16(e['a' + w]));
    set88(M[0xBC] | M[0xBD] << 8);
    y = scale(0xBE, y);
    return done(x, y, e['a' + w], quot(), g16(e['a' + w]));
  }
  P.INTERSECT_X_PLUS_Z_PLANE = r => sumPlane(r, 'x', 'y');
  P.INTERSECT_Y_PLUS_Z_PLANE = r => sumPlane(r, 'y', 'x');
  P.INTERSECT_Z_MINUS_X_PLANE = r => diffPlane(r, 'x', 'y');
  P.INTERSECT_Z_MINUS_Y_PLANE = r => diffPlane(r, 'y', 'x');
  // z = 0: x and y moved along the edge by A's z over the edge's change in z, z set to 0
  P.INTERSECT_Z_ZERO_PLANE = function (r) {
    const x = r.x, e = ends(x), az = g16(e.az);
    set88(az); setBE(az); setBC(az - g16(e.bz));
    set8C(g16(e.bx) - g16(e.ax));
    s16(e.az, 0);
    let y = scale(0xBC, r.y);
    let s = quot(), v = g16(e.ax); s16(e.ax, s + v);
    set88(g16(e.by) - g16(e.ay)); set8C(M[0xBE] | M[0xBF] << 8);
    y = scale(0xBC, y);
    return done(x, y, e.ay, quot(), g16(e.ay));
  };

  // CLASSIFY_VERTEX_AGAINST_CLIP_PLANE: the vertex at $3E + X against plane $104B, in Y: 0 inside,
  // 1 outside, $FF on it. Planes 1-4 test x + z, y + z, z - x and z - y (the low byte left in $AF);
  // any other plane z alone.
  P.CLASSIFY_VERTEX_AGAINST_CLIP_PLANE = function (r) {
    const x = r.x, p = M[0x104B], X = g16(0x3E + x), Y = g16(0x40 + x), Z = g16(0x42 + x);
    let v;
    if (p === 1) v = X + Z; else if (p === 2) v = Y + Z; else if (p === 3) v = Z - X; else if (p === 4) v = Z - Y;
    else {
      const y = (M[(0x43 + x) & 255] & 0x80) ? 1 : (M[(0x42 + x) & 255] | M[(0x43 + x) & 255]) ? 0 : 0xFF;
      return { a: y === 1 ? 0x80 : y === 0 ? (M[(0x42 + x) & 255] | M[(0x43 + x) & 255]) : 0, x, y };
    }
    v &= 0xFFFF; M[0xAF] = v & 255;
    const y = (v & 0x8000) ? 1 : v === 0 ? 0xFF : 0;
    return { a: (v >> 8) || (v & 255), x, y };
  };

  // PROJECT_VERTICES_PERSPECTIVE: each vertex's x and y over its z, times 60, plus 60, to $C0 +
  // 2n and $C1 + 2n; 0 or 119 at once where the vertex is outside the plane x = z or -x = z (and
  // so for y). Vertices with z = 0 before the first that has a z go to (60, 60); after it, they
  // are divided like any other (the divide does not test its divisor).
  P.PROJECT_VERTICES_PERSPECTIVE = function (r) {
    M[0xB2] = M[0x10B0]; M[0xB0] = 0; M[0xB1] = 0;
    let x = 0, y = 0, a = 0, c = r.c;
    for (;;) {
      if (M[(0x42 + x) & 255] || M[(0x43 + x) & 255]) break;
      M[0xC0 + y] = 0x3C; M[0xC1 + y] = 0x3C;
      y = (y + 2) & 255; a = (x + 6) & 255; c = x + 6 > 255 ? 1 : 0; x = a;
      M[0xB2] = (M[0xB2] - 1) & 255;
      if (!M[0xB2]) return { a, x, y, c };
    }
    // one coordinate (at $3E + o or $40 + o) over z
    const coord = o => {
      const u = g16(o), z = g16(0x42 + x);
      if (M[(o + 1) & 255] & 0x80) { if (((z + u) & 0x8000)) return 0; }
      else if (!((u - z) & 0x8000)) return 0x77;
      P.MUL_S16_S8_TO_S24({ a: M[o & 255], x: M[(o + 1) & 255], y: 0x3C });
      M[0x8C] = M[(0x42 + x) & 255]; M[0x8D] = M[(0x43 + x) & 255];
      P.DIV_S24_BY_S16({ a: M[0x82], x: M[0x83], y: M[0x84] });
      return (M[0x88] + 0x3C) & 255;
    };
    for (;;) {
      M[0xB0] = y; M[0xB1] = x;
      M[(0xC0 + M[0xB0]) & 255] = coord(0x3E + x);
      x = M[0xB1];
      a = coord(0x40 + x);
      y = M[0xB0]; M[0xC1 + y] = a;
      y = (y + 2) & 255;
      a = (M[0xB1] + 6) & 255; c = M[0xB1] + 6 > 255 ? 1 : 0; x = a;
      M[0xB2] = (M[0xB2] - 1) & 255;
      if (!M[0xB2]) return { a, x, y, c };
    }
  };

  // REJECT_POLYGON_OUTSIDE_VIEW_VOLUME: the vertices taken into the camera's frame, then (the
  // pretransformed entry) each plane from $107E down to 1 tested: $105B is 0 when every vertex is
  // outside some plane, else 1; $104A is 1 when any vertex was outside one.
  P.REJECT_POLYGON_OUTSIDE_VIEW_VOLUME = function (r) {
    return P.REJECT_PRETRANSFORMED_POLYGON_OUTSIDE_VIEW_VOLUME(P.TRANSFORM_VERTICES_TO_CAMERA_SPACE(r));
  };
  P.REJECT_PRETRANSFORMED_POLYGON_OUTSIDE_VIEW_VOLUME = function (r) {
    M[0x105B] = 0; M[0x104A] = 0;
    let y = M[0x107E], x = 0, a;
    for (;;) {
      M[0x104B] = y; M[0xB0] = M[0x10B0]; x = 0; M[0xB1] = 0;
      do {
        y = P.CLASSIFY_VERTEX_AGAINST_CLIP_PLANE({ x }).y;
        if (y !== 1) M[0xB1] = 1; else M[0x104A] = y;
        x = (x + 6) & 255;
        M[0xB0] = (M[0xB0] - 1) & 255;
      } while (M[0xB0]);
      a = M[0xB1];
      if (!a) break;
      y = (M[0x104B] - 1) & 255;
      if (!y) { a = 1; break; }
    }
    M[0x105B] = a;
    return { a, x, y };
  };

  // CLIP_POLYGON_TO_VIEW_VOLUME: for each plane from $107E down to 1 that a vertex is outside,
  // the polygon cut to the plane (Sutherland-Hodgman, the output at $8A24): each vertex classified
  // into $C0 + n, each edge that crosses cut (its point kept unless it repeats the last kept), each
  // vertex inside or on the plane kept unless it repeats; then the closing edge, its point always
  // kept. Under two vertices left, $10B0 is 0 and the clip stops. A plane no vertex is inside of
  // leaves $10B0 0 and returns. A line (two vertices) has no closing edge.
  P.CLIP_POLYGON_TO_VIEW_VOLUME = function (r) {
    M[0x104B] = M[0x107E];
    let x = 0, y = 0, a = 0;
    const copy6 = (from, to) => { for (let k = 0; k < 6; k++) M[0x8A24 + to + k] = M[(0x3E + from + k) & 255]; };
    for (;;) {
      x = 0; y = 0; M[0xB3] = 0; M[0xB4] = 0; M[0xB6] = M[0x10B0]; M[0xB2] = 0; M[0xB1] = 0;
      do {
        M[0x82] = y;
        y = P.CLASSIFY_VERTEX_AGAINST_CLIP_PLANE({ x }).y;
        a = y;
        if (a === 0) M[0xB1] = (M[0xB1] + 1) & 255; else if (!(a & 0x80)) M[0xB2] = (M[0xB2] + 1) & 255;
        y = M[0x82]; M[0xC0 + y] = a; y = (y + 1) & 255;
        x = (x + 6) & 255;
        M[0xB6] = (M[0xB6] - 1) & 255;
      } while (M[0xB6]);
      next: {
        if (!M[0xB2]) { a = 0; break next; }
        if (!M[0xB1]) { M[0x10B0] = 0; return { a: 0, x, y }; }
        y = 0; M[0xB0] = 0;
        const n = M[0x10B0]; M[0xB7] = n;
        if (n !== 2) {
          M[0x82] = (n << 1) & 255;
          x = (((n << 2) & 255) + M[0x82]) & 255;
          for (let k = 0; k < 6; k++) M[(0x3E + x + k) & 255] = M[0x3E + k];
        }
        x = 0; M[0xB5] = 0;
        let first = true;
        for (;;) {
          if (!first) {
            y = M[0xB4]; a = M[0xC0 + y];
            if (!(a & 0x80) && a !== M[0xBF + y] && !(M[0xBF + y] & 0x80)) {
              x = M[0xB3];
              P.CLIP_EDGE_TO_SELECTED_PLANE({ x });
              x = M[0xB3];
              let repeat = false;
              if (M[0xB0]) {
                let yy = M[0xB5], xx = x; repeat = true;
                for (M[0xB6] = 6; M[0xB6]; M[0xB6]--) { xx = (xx - 1) & 255; yy = (yy - 1) & 255; if (M[0x8A24 + yy] !== M[(0x3E + xx) & 255]) { repeat = false; break; } }
              }
              if (!repeat) {
                y = M[0xB5]; x = (M[0xB3] - 6) & 255;
                do { M[0x8A24 + y] = M[(0x3E + x) & 255]; x = (x + 1) & 255; y = (y + 1) & 255; } while (x < M[0xB3]);
                M[0xB0] = (M[0xB0] + 1) & 255; M[0xB5] = y;
              }
            }
          }
          first = false;
          // the vertex itself, when it is not outside
          y = M[0xB4];
          if (M[0xC0 + y] !== 1) {
            let repeat = false;
            if (M[0xB0]) {
              y = M[0xB5]; x = (M[0xB3] + 5) & 255; y = (y - 1) & 255;
              repeat = true;
              for (;;) {
                if (M[0x8A24 + y] !== M[(0x3E + x) & 255]) { repeat = false; break; }
                y = (y - 1) & 255; x = (x - 1) & 255;
                if (x < M[0xB3]) break;
              }
            }
            if (!repeat) {
              x = M[0xB3]; y = M[0xB5];
              for (let k = 0; k < 6; k++) { M[0x8A24 + y] = M[(0x3E + x) & 255]; x = (x + 1) & 255; y = (y + 1) & 255; }
              M[0xB6] = 0;
              M[0xB0] = (M[0xB0] + 1) & 255; M[0xB5] = y;
            }
          }
          M[0xB3] = (M[0xB3] + 6) & 255;
          M[0xB4] = (M[0xB4] + 1) & 255;
          M[0xB7] = (M[0xB7] - 1) & 255;
          if (!M[0xB7]) break;
        }
        // the closing edge, from the last vertex to the first (copied after it)
        if (M[0x10B0] !== 2 && !(M[0xC0] & 0x80)) {
          y = M[0xB4];
          if (M[0xC0] !== M[0xBF + y] && !(M[0xBF + y] & 0x80)) {
            x = M[0xB3];
            P.CLIP_EDGE_TO_SELECTED_PLANE({ x });
            if (M[0xB0]) {
              // the game compares the point with the last kept, but its branch tests the index's
              // decrement instead, so the point is always kept
              x = (M[0xB3] - 6) & 255; y = M[0xB5];
              for (let k = 0; k < 6; k++) { M[0x8A24 + y] = M[(0x3E + x) & 255]; x = (x + 1) & 255; y = (y + 1) & 255; }
              M[0xB6] = 0;
              M[0xB0] = (M[0xB0] + 1) & 255;
            }
          }
        }
        a = M[0xB0]; M[0x10B0] = a;
        if (a < 2) { M[0x10B0] = 0; return { a: 0, x, y }; }
        M[0x82] = (a << 1) & 255;
        M[0xB6] = ((a << 2) + M[0x82]) & 255;
        for (x = 0; ; ) { a = M[0x8A24 + x]; M[(0x3E + x) & 255] = a; x = (x + 1) & 255; if (x >= M[0xB6]) break; }
      }
      M[0x104B] = (M[0x104B] - 1) & 255;
      if (!M[0x104B]) return { a, x, y };
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
