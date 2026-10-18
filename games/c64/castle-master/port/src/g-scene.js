// The scene ($27B7-$35E7): the view's coarse bounds and its matrix, each object of a list tested
// against the bounds and turned into a bounds record relative to the player (12 bytes: each axis's
// near and far side, as words, at $10AA/$10AB) with a side mask in $1055 (bit 0 of a pair: the
// player beyond the near side; bit 1: beyond the far one), then queued by its type: a cuboid (1),
// a rectangle (3), a pyramid in one of six orientations (4-9) or an explicit line or polygon of
// type - 8 points (10 on); and the painter's sort of the queued objects by their bounds.
//
// An object record: byte 0 its type (low nibble) and flags ($40 hidden), 1-3 its position and 4-6
// its size (each times 64 in the world), 7 its id, 8 the record's length, 9 on its colours (two
// faces a byte), and for a pyramid 12-15 the apex's offsets, for a line or polygon its points.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.scene = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => (ptr(zp) + y) & 0xFFFF;
  const rec = (zp, y) => M[at(zp, y)];
  const word = (zp, y) => rec(zp, y) | rec(zp, y + 1) << 8;
  const zw = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };

  // ---- TRAVERSE_OBJECT_LIST: X records from ($80). A record of type 0 or hidden is passed by,
  // type 2 (a sensor) counted in $1099; with $2417 clear, one wholly outside the coarse bounds
  // ($1089-$108E, in units of 64) is too. The rest get their bounds record and are queued.
  P.TRAVERSE_OBJECT_LIST = function (r) {
    M[0x2753] = r.x;
    let x = r.x, y, a;
    do {
      M[0x108F] = M[0x80]; M[0x1090] = M[0x81];
      next: {
        const t = rec(0x80, 0) & 0x0F;
        if (!t) break next;
        x = t;
        if (rec(0x80, 0) & 0x40) break next;
        if (t === 2) { M[0x1099]++; break next; }
        if (!M[0x2417]) {
          x = 0; M[0x2752] = 3; y = 1;
          do {
            a = rec(0x80, y);
            if (a !== M[0x1089 + x] && !((a - M[0x1089 + x]) & 0x80)) break next;
            y += 3;
            a = (a + rec(0x80, y)) & 255;
            x++;
            if ((a - M[0x1089 + x]) & 0x80) break next;
            y -= 2; x++;
            M[0x2752] = (M[0x2752] - 1) & 255;
          } while (M[0x2752]);
        }
        setp(0x7A, M[0x10AA] | M[0x10AB] << 8);
        M[0x1055] = 0; M[0x2751] = 3; x = 0;
        do {
          M[0x274D] = M[0x2407 + x]; x++; M[0x274F] = M[0x2407 + x]; x++;
          let b = rec(0x80, 1);
          let rel = (((b << 6) & 0xFFFF) - (M[0x274D] | M[0x274F] << 8)) & 0xFFFF;
          M[0x274E] = rel & 255; M[0x2750] = rel >> 8;
          if (!(rel & 0x8000) && rel) M[0x1055] |= 0x40;
          M[0x1055] >>= 1;
          M[at(0x7A, 0)] = M[0x274E]; M[at(0x7A, 1)] = M[0x2750];
          setp(0x7A, ptr(0x7A) + 2);
          b = rec(0x80, 4);
          M[0x274D] = (b << 6) & 255; M[0x274F] = b >> 2;
          rel = (rel + ((b << 6) & 0xFFFF)) & 0xFFFF;
          M[0x274E] = rel & 255; M[0x2750] = rel >> 8;
          if (rel & 0x8000) M[0x1055] |= 0x40;
          M[0x1055] >>= 1;
          M[at(0x7A, 0)] = M[0x274E]; M[at(0x7A, 1)] = M[0x2750];
          setp(0x7A, ptr(0x7A) + 2);
          setp(0x80, ptr(0x80) + 1);
          M[0x2751] = (M[0x2751] - 1) & 255;
        } while (M[0x2751]);
        M[0x80] = M[0x108F]; M[0x81] = M[0x1090];
        M[0x105C] = rec(0x80, 7);
        const type = rec(0x80, 0) & 0x0F;
        M[0x1068] = type;
        const q = type === 1 ? P.QUEUE_CUBOID_OBJECT({}) : type === 3 ? P.QUEUE_RECTANGLE_OBJECT({})
          : type < 10 ? P.QUEUE_PYRAMID_OBJECT({}) : P.QUEUE_EXPLICIT_LINE_OR_POLYGON_OBJECT({});
        x = q.x;
      }
      M[0x80] = M[0x108F]; M[0x81] = M[0x1090];
      setp(0x80, ptr(0x80) + rec(0x80, 8));
      a = M[0x81];
      M[0x2753] = (M[0x2753] - 1) & 255;
    } while (M[0x2753]);
    return { a, x, y: 8 };
  };

  // ---- COMPUTE_COARSE_VIEW_BOUNDS: unless $2417 is set, the bounds $1089-$108E (each axis's low
  // and high, in units of 64) from four samples of the view's direction (yaw $2411 and pitch $2410,
  // each 8 steps of 72 either way): each sample's octant picks a case that opens some bounds to
  // the world's edge ($00, $3F or $7F); a bound no sample set ($FF) is the player's own coordinate
  // (the low one plus 1), and only one of each pair is.
  const wrapUp = v => { v = (v + 8) & 255; return (v - 0x48) & 0x80 ? v : (v - 0x48) & 255; };
  const wrapDown = v => { v = (v - 8) & 255; return v & 0x80 ? (v + 0x48) & 255 : v; };
  const CASES = { 0x2A27: 'SET_VIEW_BOUNDS_CASE_0', 0x2A39: 'SET_VIEW_BOUNDS_CASE_1', 0x2A4B: 'SET_VIEW_BOUNDS_CASE_2',
    0x2A5D: 'SET_VIEW_BOUNDS_CASE_3', 0x2A6F: 'SET_VIEW_BOUNDS_CASE_4', 0x2A81: 'SET_VIEW_BOUNDS_CASE_5',
    0x2A93: 'SET_VIEW_BOUNDS_CASE_6', 0x2AA5: 'SET_VIEW_BOUNDS_CASE_7' };
  P.COMPUTE_COARSE_VIEW_BOUNDS = function (r) {
    if (M[0x2417]) return { a: M[0x2417], x: r.x, y: r.y };
    for (let i = 0; i < 6; i++) M[0x1089 + i] = 0xFF;
    M[0x2940] = 4;
    let x = 6, y = r.y, a;
    do {
      a = M[0x2940];
      if (a === 1 || a === 2) x = wrapUp(M[0x2411]);
      if (a === 1 || a === 3) y = wrapUp(M[0x2410]);
      if (a === 3 || a === 4) x = wrapDown(M[0x2411]);
      if (a === 2 || a === 4) y = wrapDown(M[0x2410]);
      a = x;
      x = (a - 0x12) & 0x80 ? 1 : (a - 0x24) & 0x80 ? 3 : (a - 0x36) & 0x80 ? 5 : 7;
      a = y;
      if ((a - 0x12) & 0x80) x++;
      else if (((a - 0x24) & 0x80) || ((a - 0x36) & 0x80)) {
        a = (a - 0x24) & 0x80 ? 5 : 4;
        M[0x82] = x;
        a = (a + x) & 255;
        if (!((a - 9) & 0x80)) a = (a - 8) & 255;
        x = a;
      }
      x = ((x - 1) << 1) & 255;
      M[0x2A15] = M[0x2A17 + x]; M[0x2A16] = M[0x2A18 + x];
      const to = M[0x2A15] | M[0x2A16] << 8, name = CASES[to];
      if (!name) throw new Error('COMPUTE_COARSE_VIEW_BOUNDS: the JMP at $2A14 goes to $' + to.toString(16));
      P[name]({});
      M[0x2940] = (M[0x2940] - 1) & 255;
    } while (M[0x2940]);
    return P.FINISH_VIEW_BOUNDS_SAMPLES({ x, y });
  };
  // the eight cases, each entered by the JMP at $2A14 and going on to the next sample
  const bounds = o => () => { for (const k of Object.keys(o)) M[+k] = o[k]; return {}; };
  P.SET_VIEW_BOUNDS_CASE_0 = bounds({ 0x1089: 0x7F, 0x108B: 0x3F, 0x108D: 0x7F });
  P.SET_VIEW_BOUNDS_CASE_1 = bounds({ 0x1089: 0x7F, 0x108C: 0x00, 0x108D: 0x7F });
  P.SET_VIEW_BOUNDS_CASE_2 = bounds({ 0x1089: 0x7F, 0x108B: 0x3F, 0x108E: 0x00 });
  P.SET_VIEW_BOUNDS_CASE_3 = bounds({ 0x1089: 0x7F, 0x108C: 0x00, 0x108E: 0x00 });
  P.SET_VIEW_BOUNDS_CASE_4 = bounds({ 0x108A: 0x00, 0x108B: 0x3F, 0x108E: 0x00 });
  P.SET_VIEW_BOUNDS_CASE_5 = bounds({ 0x108A: 0x00, 0x108C: 0x00, 0x108E: 0x00 });
  P.SET_VIEW_BOUNDS_CASE_6 = bounds({ 0x108A: 0x00, 0x108B: 0x3F, 0x108D: 0x7F });
  P.SET_VIEW_BOUNDS_CASE_7 = bounds({ 0x108A: 0x00, 0x108C: 0x00, 0x108D: 0x7F });
  // FINISH_VIEW_BOUNDS_SAMPLES, once the samples are done: the bounds no sample set
  P.FINISH_VIEW_BOUNDS_SAMPLES = function (r) {
    let x = r.x, a;
    for (const [lo, b] of [[0x2407, 0x1089], [0x2409, 0x108B], [0x240B, 0x108D]]) {
      M[0x2941] = ((zw(lo) << 2) >> 8) & 255;
      a = M[b];
      if (a === 0xFF) { x = (M[0x2941] + 1) & 255; M[b] = x; continue; }
      a = M[b + 1];
      if (a === 0xFF) {
        if (b === 0x108D) x = M[0x2941]; else a = M[0x2941];
        M[b + 1] = M[0x2941];
      }
    }
    return { a, x, y: r.y };
  };

  // ---- BUILD_VIEW_PROJECTION_MATRIX: the view matrix $106C: identity, turned by the yaw and then
  // the pitch (their sines and cosines from the table at $123C, 72 steps, scale 64), times the
  // aspect and depth diagonal ($2C7C: 40, 64, 32). The render buffer's pointers are reset from
  // $10A2-$10A7 and the counts $106A/$106B cleared.
  P.build_cuboid_camera_basis_return = r => r;
  P.viewport_effect_return = r => r;
  P.BUILD_VIEW_PROJECTION_MATRIX = function (r) {
    for (let x = 9; x > 0; x--) M[0x106B + x] = M[0x2C72 + x];
    if (M[0x2411]) {
      const x = (M[0x2411] << 1) & 255;
      M[0x1072] = M[0x123C + x]; M[0x106E] = (0 - M[0x1072]) & 255;
      M[0x106C] = M[0x1074] = M[0x123D + x];
    }
    if (M[0x2410]) {
      for (let x = 9; x > 0; x--) M[0x1074 + x] = M[0x2C72 + x];
      const x = (M[0x2410] << 1) & 255;
      M[0x107A] = M[0x123C + x]; M[0x107C] = (0 - M[0x107A]) & 255;
      M[0x1079] = M[0x107D] = M[0x123D + x];
      P.MULTIPLY_3X3_FIXED_MATRICES({});
    }
    for (let x = 9; x > 0; x--) M[0x1074 + x] = M[0x2C7B + x];
    P.MULTIPLY_3X3_FIXED_MATRICES({});
    M[0x10AA] = M[0x10A4]; M[0x10AB] = M[0x10A5];
    M[0x10A8] = M[0x10A2]; M[0x10A9] = M[0x10A3];
    setw(0x10AC, zw(0x10A6) + 4);
    M[0x106A] = 0; M[0x106B] = 0;
    return { a: 0, x: 0, y: 0 };
  };

  // BUILD_CUBOID_CAMERA_BASIS: the object's near corner (the bounds record's three near sides,
  // relative to the player) times the view matrix's rows, to $3E-$43; and its three edges (the
  // record's size bytes 4-6) times the matrix's columns, to $02-$13 (edge by edge, x y z).
  P.BUILD_CUBOID_CAMERA_BASIS = function (r) {
    M[0x80] = M[0x10AA]; M[0x81] = M[0x10AB];
    M[0xB1] = 0; M[0xB0] = 0; M[0xB2] = 3;
    let x, y = r.y, a;
    do {
      M[0xB3] = 0; M[0xB4] = 0; M[0xB5] = 0;
      for (const off of [0, 4, 8]) {
        x = M[0xB1]; M[0xB1]++;
        const m = M[0x106C + x];
        y = m;
        if (!m) continue;
        M[0x82] = m;
        P.MUL_S16_S8_TO_S24({ a: rec(0x80, off), x: rec(0x80, off + 1), y: m });
        y = m;
        let s = M[0xB3] + M[0x82]; M[0xB3] = s & 255;
        s = M[0xB4] + M[0x83] + (s >> 8); M[0xB4] = s & 255;
        s = M[0xB5] + M[0x84] + (s >> 8); M[0xB5] = s & 255;
      }
      for (let k = 0; k < 2; k++) {
        const c1 = M[0xB3] >> 7, c2 = M[0xB4] >> 7;
        M[0xB3] = (M[0xB3] << 1) & 255; M[0xB4] = ((M[0xB4] << 1) | c1) & 255; M[0xB5] = ((M[0xB5] << 1) | c2) & 255;
      }
      x = M[0xB0];
      M[0x3E + x] = M[0xB4]; M[0x3F + x] = M[0xB5];
      M[0xB0] += 2;
      M[0xB2]--;
    } while (M[0xB2]);
    M[0x80] = M[0x108F]; M[0x81] = M[0x1090];
    M[0xB1] = 0; M[0xB0] = 0; M[0xB2] = 3; M[0xB5] = 4;
    do {
      for (const col of [0x106C, 0x106F, 0x1072]) {
        const o = P.MUL_S8_S8_TO_S16({ x: rec(0x80, M[0xB5]), y: M[col + M[0xB1]] });
        x = M[0xB0];
        M[0x02 + x] = M[0x82]; M[0x03 + x] = M[0x83];
        a = M[0x83]; y = M[col + M[0xB1]];
        M[0xB0] += 2;
      }
      M[0xB5]++; M[0xB1]++;
      M[0xB2]--;
    } while (M[0xB2]);
    return { a, x, y };
  };

  // the end of each queue: the faces emitted from the topology at $12CC + y, clipped when a
  // vertex was outside a plane ($104A)
  const emit = y => (M[0x104A] ? P.emit_clipped_object_faces({ y }) : P.paint_scanline_spans_linear_local_40da({ y }));

  // ---- QUEUE_CUBOID_OBJECT: the eight corners from the near corner and the three edges, the
  // cuboid rejected or kept, and each of its six faces given the colour its side mask shows (two
  // faces a byte from the record's byte 9; a face whose side the player is not beyond is hidden).
  P.QUEUE_CUBOID_OBJECT = function (r) {
    P.BUILD_CUBOID_CAMERA_BASIS(r);
    const e = k => zw(0x02 + 2 * k);   // the edges: x y z of e1, e2, e3
    for (let c = 0; c < 3; c++) {
      const v0 = zw(0x3E + 2 * c), e1 = e(c), e2 = e(3 + c), e3 = e(6 + c);
      const put = (n, v) => setw(0x3E + 6 * n + 2 * c, v);
      put(1, v0 + e1); put(2, v0 + e1 + e2); put(3, v0 + e2); put(4, v0 + e3);
      put(5, v0 + e1 + e3); put(6, v0 + e1 + e2 + e3); put(7, v0 + e2 + e3);
    }
    M[0x10B0] = 8;
    let o = P.REJECT_PRETRANSFORMED_POLYGON_OUTSIDE_VIEW_VOLUME({});
    if (!M[0x105B]) return { a: 0, x: o.x, y: o.y };
    M[0x80] = M[0x108F]; M[0x81] = M[0x1090];
    M[0x105B] = 0;
    M[0x2D1F] = 3;
    let y = 9, x = 0;
    do {
      let c = M[0x1055] & 1; M[0x1055] >>= 1;
      if (!c) M[0x12CD + x] = 0;
      else { const v = rec(0x80, y) & 0x0F; M[0x12CD + x] = v; if (v) M[0x105B] = v; }
      c = M[0x1055] & 1; M[0x1055] >>= 1;
      if (!c) M[0x12D3 + x] = 0;
      else { const v = rec(0x80, y) >> 4; M[0x12D3 + x] = v; if (v) M[0x105B] = v; }
      x = (x + 0x0C) & 255; y++;
      M[0x2D1F]--;
    } while (M[0x2D1F]);
    if (!M[0x105B]) return { a: 0, x, y };
    M[0x1069] = 0;
    return emit(0);
  };

  // ---- QUEUE_PYRAMID_OBJECT: a box whose top (or one side, by the orientation 4-9) narrows to
  // the rectangle the record's bytes 12-15 give (each times 64): eight corners, or six or five
  // when the rectangle is a line or a point (each with its own topology at $12CC + $7A, $40 or
  // $5D, $25). Its faces' colours come from the record, and their winding hides the far ones.
  // Each orientation's corners, as words at $02-$31: [the bounds record's word, its corners]
  // ('w'), the same plus one of the apex's offsets to more corners ('s'), or a corner already
  // set plus an offset ('z').
  const W = (o, d) => ['w', o, d], S = (o, add, d, s) => ['s', o, add, d, s], Z = (src, add, s) => ['z', src, add, s];
  const PYRAMID = {
    4: [W(0, [0x02, 0x08, 0x0E, 0x14]), W(2, [0x1A, 0x20, 0x26, 0x2C]), S(8, 0xA8, [0x0C, 0x12], [0x24, 0x2A]), W(10, [0x06, 0x18]),
      Z(0x0C, 0xAC, [0x1E, 0x30]), S(4, 0xA6, [0x04, 0x0A], [0x1C, 0x28]), W(6, [0x10, 0x16]), Z(0x04, 0xAA, [0x22, 0x2E])],
    6: [S(0, 0xA6, [0x02, 0x08], [0x1A, 0x26]), W(2, [0x0E, 0x14]), Z(0x02, 0xAA, [0x20, 0x2C]), W(4, [0x04, 0x0A, 0x10, 0x16]),
      W(6, [0x1C, 0x22, 0x28, 0x2E]), 'z-side'],
    7: [S(0, 0xA6, [0x0E, 0x14], [0x20, 0x2C]), Z(0x0E, 0xAA, [0x1A, 0x26]), W(2, [0x02, 0x08]), W(4, [0x1C, 0x22, 0x28, 0x2E]),
      W(6, [0x04, 0x0A, 0x10, 0x16]), 'z-side'],
    8: [S(4, 0xA8, [0x0A, 0x10], [0x22, 0x28]), Z(0x0A, 0xAC, [0x1C, 0x2E]), W(6, [0x04, 0x16]), W(8, [0x06, 0x0C, 0x12, 0x18]),
      W(10, [0x1E, 0x24, 0x2A, 0x30]), 'x-side'],
    other: [S(4, 0xA8, [0x16, 0x04], [0x1C, 0x2E]), W(6, [0x0A, 0x10]), Z(0x04, 0xAC, [0x22, 0x28]), W(8, [0x1E, 0x24, 0x2A, 0x30]),
      W(10, [0x06, 0x0C, 0x12, 0x18]), 'x-side'],
    'z-side': [S(8, 0xA8, [0x06, 0x18], [0x1E, 0x30]), W(10, [0x0C, 0x12]), Z(0x06, 0xAC, [0x24, 0x2A])],
    'x-side': [S(0, 0xA6, [0x02, 0x08], [0x1A, 0x26]), W(2, [0x0E, 0x14]), Z(0x02, 0xAA, [0x20, 0x2C])],
  };
  // the page's modern view (page/modern.js) works each orientation's corners out from this table
  P.PYRAMID_CORNERS = PYRAMID;
  const corners = list => {
    for (const op of list) {
      if (typeof op === 'string') { corners(PYRAMID[op]); continue; }
      if (op[0] === 'w') { const v = word(0x7A, op[1]); for (const d of op[2]) setw(d, v); }
      else if (op[0] === 's') { const v = word(0x7A, op[1]); for (const d of op[3]) setw(d, v); for (const d of op[4]) setw(d, v + zw(op[2])); }
      else { const v = zw(op[1]) + zw(op[2]); for (const d of op[3]) setw(d, v); }
    }
  };
  P.QUEUE_PYRAMID_OBJECT = function (r) {
    M[0x7A] = M[0x108F]; M[0x7B] = M[0x1090];
    let y, a;
    if (rec(0x7A, 0x0C) === rec(0x7A, 0x0E)) { if (rec(0x7A, 0x0D) === rec(0x7A, 0x0F)) { y = 0x25; a = 5; } else { y = 0x5D; a = 6; } }
    else if (rec(0x7A, 0x0D) === rec(0x7A, 0x0F)) { y = 0x40; a = 6; } else { y = 0x7A; a = 8; }
    M[0x10B0] = a; M[0xA4] = y;
    M[0xA0] = 4;
    for (let x = 0, k = 0x0C; k < 0x10; k++, x += 2) {
      const b = rec(0x7A, k);
      M[0xA6 + x] = (b << 6) & 255; M[0xA7 + x] = b >> 2; M[0x82] = b >> 2;
    }
    M[0xA0] = 0;
    M[0x7A] = M[0x10AA]; M[0x7B] = M[0x10AB];
    const t = M[0x1068];
    corners(PYRAMID[t === 4 || t === 6 || t === 7 || t === 8 ? t : 'other']);
    const o = P.REJECT_POLYGON_OUTSIDE_VIEW_VOLUME({});
    if (!M[0x105B]) return { a: 0, x: o.x, y: o.y };
    M[0x7A] = M[0x108F]; M[0x7B] = M[0x1090];
    let x = M[0xA4];
    M[0xA0] = M[0x12CC + x]; x = (x + 1) & 255;
    y = 9;
    for (;;) {
      M[0x12CC + x] = rec(0x7A, y) & 0x0F;
      M[0x82] = (M[0x12CD + x] + 2) & 255; x = (x + M[0x82]) & 255;
      if (!--M[0xA0]) break;
      M[0x12CC + x] = rec(0x7A, y) >> 4;
      M[0x82] = (M[0x12CD + x] + 2) & 255; x = (x + M[0x82]) & 255;
      y++;
      if (!--M[0xA0]) break;
    }
    M[0x1069] = 1;
    return emit(M[0xA4]);
  };

  // ---- QUEUE_EXPLICIT_LINE_OR_POLYGON_OBJECT: type - 8 points from the record's byte 10 on (each
  // times 64, relative to the player), one face (the topology at $12CC + $9F): a line in the low
  // nibble of byte 9's colour, a polygon in either nibble by its winding.
  P.QUEUE_EXPLICIT_LINE_OR_POLYGON_OBJECT = function (r) {
    M[0x7A] = M[0x108F]; M[0x7B] = M[0x1090];
    const n = (M[0x1068] - 8) & 255;
    M[0x10B0] = n; M[0x32DF] = n;
    M[0x32E0] = rec(0x7A, 9);
    let y = 10, x = 0;
    do {
      for (const p of [0x2407, 0x2409, 0x240B]) {
        const b = rec(0x7A, y);
        M[0x82] = (b << 6) & 255; M[0x83] = b >> 2;
        const v = (((b << 6) & 0xFFFF) - zw(p)) & 0xFFFF;
        M[(0x02 + x) & 255] = v & 255; M[(0x03 + x) & 255] = v >> 8;
        x = (x + 2) & 255; y = (y + 1) & 255;
      }
      M[0x32DF]--;
    } while (M[0x32DF]);
    const o = P.REJECT_POLYGON_OUTSIDE_VIEW_VOLUME({});
    if (!M[0x105B]) return { a: 0, x: o.x, y: o.y };
    M[0x136D] = M[0x10B0];
    if (M[0x10B0] === 2) { M[0x136C] = M[0x32E0] & 0x0F; M[0x1069] = 0; }
    else { M[0x1235] = M[0x32E0]; M[0x136C] = 1; M[0x1069] = 2; }
    return emit(0x9F);
  };

  // ---- QUEUE_RECTANGLE_OBJECT: a flat rectangle (the record's size 0 on one axis, which picks
  // the side mask's pair), four corners from the bounds record, one face coloured by the side the
  // player is beyond.
  P.QUEUE_RECTANGLE_OBJECT = function (r) {
    M[0x7A] = M[0x10AA]; M[0x7B] = M[0x10AB];
    const w = k => word(0x7A, k);
    setw(0x02, w(0)); setw(0x14, w(0));
    setw(0x08, w(2)); setw(0x0E, w(2));
    setw(0x04, w(4)); setw(0x0A, w(4));
    setw(0x10, w(6)); setw(0x16, w(6));
    M[0x7C] = M[0x108F]; M[0x7D] = M[0x1090];
    setw(0x06, w(8)); setw(0x18, w(8));
    setw(0x12, w(10)); setw(0x0C, w(10));
    let x = 1;
    if (rec(0x7C, 4)) {
      setw(0x18, zw(0x12)); setw(0x0C, zw(0x06));
      x = rec(0x7C, 5) ? 3 : 2;
    }
    M[0x33A2] = x;
    M[0x10B0] = 4;
    const o = P.REJECT_POLYGON_OUTSIDE_VIEW_VOLUME({});
    if (!M[0x105B]) return { a: 0, x: o.x, y: o.y };
    M[0x136D] = 4;
    let a = M[0x1055];
    x = M[0x33A2];
    if (x === 2) a >>= 2; else if (x !== 1) a >>= 4;
    const k = rec(0x7C, 9);
    let colour = (a & 1) ? (k & 0x0F) : (k >> 4);
    if (!colour) return { a: 0, x, y: k };
    M[0x136C] = colour;
    M[0x1069] = 0;
    return emit(0x9F);
  };

  // ---- PAINTER_SORT_VISIBLE_ENTRIES: a bubble sort of the directory ($10A6 + 4, four bytes an
  // object), far first. Two neighbours are compared axis by axis on their bounds records: where
  // they overlap on an axis it says nothing; where they do not, two bits say which is beyond the
  // other as the player sees it. Seven patterns keep the order and mark the pair settled ($42 + n);
  // any other swaps them and unsettles the pairs about them. Passes go on, one shorter each, while
  // one swaps.
  const KEEP = [0x20, 0x08, 0x02, 0x28, 0x0A, 0x22, 0x2A];
  P.PAINTER_SORT_VISIBLE_ENTRIES = function (r) {
    let x = M[0x106A], a = r.a, y = r.y;
    for (;;) {
      x = (x - 1) & 255;
      if (!x || (x & 0x80)) return { a, x, y };
      const pass = x;
      M[0x40] = 1;
      for (let i = 0x27; i >= 0; i--) M[0x42 + i] = 0;
      setp(0x7A, zw(0x10A6) + 4);
      M[0xB0] = 0;
      M[0xB3] = (M[0x106A] - 1) & 255;
      do {
        if (!M[(0x42 + M[0x40]) & 255]) {
          M[0x7C] = rec(0x7A, 2); M[0x7D] = rec(0x7A, 3);
          M[0x7E] = rec(0x7A, 6); M[0x7F] = rec(0x7A, 7);
          M[0xB1] = 0;
          for (let y0 = 0; y0 !== 0x0C; y0 += 4) {
            M[0xB1] = (M[0xB1] << 2) & 255;
            const Amin = word(0x7C, y0), Amax = word(0x7C, y0 + 2), Bmin = word(0x7E, y0), Bmax = word(0x7E, y0 + 2);
            if (((Amin - Bmax) & 0x8000) && ((Bmin - Amax) & 0x8000)) continue;
            M[0x3E] = rec(0x7C, y0 + 1) & 0x80;
            if ((rec(0x7C, y0 + 3) & 0x80) !== M[0x3E]) { M[0xB1] |= 1; continue; }
            M[0x3F] = rec(0x7E, y0 + 3) & 0x80;
            const sB = rec(0x7E, y0 + 1) & 0x80;
            if (sB !== M[0x3F]) { M[0xB1] |= 2; continue; }
            if (sB !== M[0x3E]) continue;
            const d = (Bmin - Amin) & 0xFFFF;
            M[0x83] = d & 255; M[0x84] = d >> 8;
            let sign;
            if (d) sign = (d >> 8) & 0x80;
            else sign = ((Bmax - Amax) >> 8) & 0x80;
            M[0xB1] |= sign === M[0x3F] ? 1 : 2;
          }
          y = 0x0C;
          if (KEEP.includes(M[0xB1])) M[(0x42 + M[0x40]) & 255] = 1;
          else {
            M[0xB0] = 1;
            for (y = 0; y < 4; y++) { const t = rec(0x7A, y); M[at(0x7A, y)] = rec(0x7A, y + 4); M[at(0x7A, y + 4)] = t; }
            x = M[0x40];
            M[(0x41 + x) & 255] = 0; M[(0x42 + x) & 255] = 0; M[(0x43 + x) & 255] = 0;
          }
        }
        M[0x40]++;
        setp(0x7A, ptr(0x7A) + 4);
        M[0xB3]--;
      } while (M[0xB3]);
      a = pass;
      if (!M[0xB0]) return { a, x, y };
      x = pass;
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
