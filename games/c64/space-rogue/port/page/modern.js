// The Play page's modern view of space: the 3D view drawn at the screen's own resolution, and, with
// smooth motion, between the game's passes. The game is not changed: the routines below are
// watched, and its memory is only read.
//
// At each pass of the main loop, once everything has moved (the drawing about to start, or the
// pass about to skip it), the pass is kept as the game's own numbers: the camera's position and
// orientation, every object's slot, type, position and (for a ship) orientation, the projection
// and the window, the colour tables, and the models in memory. From those the scene is drawn again
// in double precision, as the game draws it: the draw list built the same way (each object tested
// against the view with its radius, the small ones drawn at once, at most 14 large ones from the
// farthest to the nearest), each model's points placed from its axis vectors, each face's side
// found, its polygons in the game's three passes for a painter's order, and the 2D objects
// (discs, rings, bursts, sparks) at their projected centres. A colour the C64 makes from two in
// a checkerboard is drawn as their blend, and every polygon in its own colour: the C64's cells
// give a cell's pixels of two colours the last one drawn there.
//
// Smooth motion draws a pose part of the way from one pass to the next: positions slide and
// orientations turn, and the scene is drawn again from the pose. The way is a phase, a pass's
// number and a fraction, which never runs ahead of the last pass the game has computed and moves
// at the game's own rate of passes (smooth, below).
//
//   const st = SRModern.attach(rt)   watch the main program's port; again after a restore is harmless
//   SRModern.onShow(st, F)            the picture on show in frame F, or null when the view shows
//                                     anything else
//   SRModern.smooth(st, V, F)         the pose to draw at cycle V of the machine's clock, or null
//   SRModern.render(scene)            a scene's drawing, in the window's coordinates
//   SRModern.draw(cv, faithful, view) the faithful frame scaled up, the view over it
//   SRModern.paint(px, st, view)      the view in the C64's own pixels, drawn by a second copy of
//                                     the port from the pose, into a frame of palette indices
(function (root) {
'use strict';
const LINE = 63, FRAME = 63 * 312;

// ---- the game's numbers. A number in log form is three bytes: the fraction of a base-2 logarithm
// in 256ths, its whole part (signed), and the sign in bit 7 of the third; a linear one is 24 bits,
// 16.8 fixed point
const logAt = (M, a) => (M[a + 2] & 0x80 ? -1 : 1) * Math.pow(2, ((M[a + 1] << 24) >> 24) + M[a] / 256);
const vecLog = (M, a) => [logAt(M, a), logAt(M, a + 3), logAt(M, a + 6)];
const rowsLog = (M, a) => [vecLog(M, a), vecLog(M, a + 9), vecLog(M, a + 18)];
const linAt = (M, a) => (((M[a] | M[a + 1] << 8 | M[a + 2] << 16) << 8) >> 8) / 256;
const vecLin = (M, a) => [linAt(M, a), linAt(M, a + 3), linAt(M, a + 6)];
const logPair = (M, a) => ((M[a + 1] << 24) >> 24) + M[a] / 256;
const w16 = (M, a) => M[a] | M[a + 1] << 8;
const s16 = v => (v << 16) >> 16;
// and back, for the second copy of the port: zero is $EC.00, as lin_to_log makes it
function putLog(M, a, v) {
  const m = Math.abs(v);
  let w = -20, f = 0;
  if (m > 0) { const l = Math.log2(m); w = Math.floor(l); f = Math.round((l - w) * 256); if (f === 256) { f = 0; w++; } }
  if (w < -20) { w = -20; f = 0; }
  M[a] = f; M[a + 1] = w & 255; M[a + 2] = v < 0 && m > 0 ? 0xFF : 0;
}
function putLin(M, a, v) {
  const n = Math.round(v * 256) & 0xFFFFFF;
  M[a] = n & 255; M[a + 1] = (n >> 8) & 255; M[a + 2] = n >> 16;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.sqrt(dot(a, a));
const lerp = (a, b, f) => a + (b - a) * f;
const lerp3 = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
const times = (R, v) => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];
const transpose = R => [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]];
// rows a and b: the rows of b applied to each row of a, as mat_times_mat makes them
const rowsTimes = (a, b) => a.map(r => times(b, r));

// ---- orientations between passes: three rows to a quaternion and back, and the turn between two
function toQuat(R) {
  const [[a, b, c], [d, e, f], [g, h, i]] = R, t = a + e + i;
  let q;
  if (t > 0) { const s = 2 * Math.sqrt(t + 1); q = [s / 4, (h - f) / s, (c - g) / s, (d - b) / s]; }
  else if (a > e && a > i) { const s = 2 * Math.sqrt(1 + a - e - i); q = [(h - f) / s, s / 4, (b + d) / s, (c + g) / s]; }
  else if (e > i) { const s = 2 * Math.sqrt(1 + e - a - i); q = [(c - g) / s, (b + d) / s, s / 4, (f + h) / s]; }
  else { const s = 2 * Math.sqrt(1 + i - a - e); q = [(d - b) / s, (c + g) / s, (f + h) / s, s / 4]; }
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map(x => x / n);
}
function fromQuat(q) {
  const [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
// the turn from one set of rows to another, a fraction f of the way: the rows' lengths (about 1 in
// the game's numbers) slide, their directions turn as one rotation
function slerpRows(A, B, f) {
  const la = A.map(len), lb = B.map(len);
  const qa = toQuat(A.map((r, i) => r.map(x => x / (la[i] || 1)))), qb = toQuat(B.map((r, i) => r.map(x => x / (lb[i] || 1))));
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  if (d < 0) { for (let i = 0; i < 4; i++) qb[i] = -qb[i]; d = -d; }
  let q;
  if (d > 0.9995) q = qa.map((x, i) => lerp(x, qb[i], f));
  else {
    const th = Math.acos(Math.min(1, d)), s = Math.sin(th);
    const u = Math.sin((1 - f) * th) / s, v = Math.sin(f * th) / s;
    q = qa.map((x, i) => u * x + v * qb[i]);
  }
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return fromQuat(q.map(x => x / n)).map((r, i) => r.map(x => x * lerp(la[i], lb[i], f)));
}
// the cosine of half the turn between two orientations
function turnCos(A, B) {
  const qa = toQuat(A), qb = toQuat(B);
  return Math.abs(qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3]);
}

// ---- the draw routines a type's entry names ($08F8), and the models (src/g-render.js)
const KIND = { 0x8834: 'disc', 0x88E4: 'ring', 0x89CF: 'burst', 0x8A08: 'annulus', 0x8A29: 'ragged', 0x8B1B: 'sparks', 0x8BEF: 'flicker' };
const FIXED_MODEL = { 0x692A: 0x6935, 0x6813: 0x681E };
function modelAt(M, a) {
  if (FIXED_MODEL[a]) return FIXED_MODEL[a];
  if (M[a] === 0xA9 && M[a + 2] === 0x85 && M[a + 3] === 0x7A && M[a + 4] === 0xA9 && M[a + 6] === 0x85 &&
      M[a + 7] === 0x7B && M[a + 8] === 0x4C && M[a + 9] === 0x61 && M[a + 10] === 0x7C) return M[a + 1] | M[a + 5] << 8;
  return null;
}
// A model from its 36-byte header (copied to $9A-$BD by draw_model): its axis vectors, scaled as
// their first use scales them (prepare_model: the type's scale less 6.64 added to the logs of the
// components whose whole part is -10 or more) when that has not happened yet; each point its
// parent (or the model's centre) plus or minus an axis vector; each polygon's vertices, plane,
// normal and colours; and each normal's three vertices (its polygon's first three) and reference
// point
function readModel(M, h, scale) {
  const at = (i, k) => M[(w16(M, h + i) + k) & 0xFFFF];
  const n = { points: M[h + 1], normals: M[h + 3], polys: M[h + 4], axes: M[h + 5] };
  const grow = M[h] ? 0 : scale - (6 + 0xA4 / 256);
  const axes = [];
  for (let k = 0; k < n.axes; k++) {
    const v = [];
    for (let c = 0; c < 3; c++) {
      const a = (w16(M, h + 10) + 9 * k + 3 * c) & 0xFFFF;
      const l = ((M[a + 1] << 24) >> 24) + M[a] / 256 + (((M[a + 1] - 0xF6) & 0x80) ? 0 : grow);
      // vec_times_rows leaves out a component whose whole part is below -7
      v.push(Math.floor(l) < -7 ? 0 : (M[a + 2] & 0x80 ? -1 : 1) * Math.pow(2, l));
    }
    axes.push(v);
  }
  const points = [];
  for (let y = 0; y < n.points; y++) {
    const p = at(12, y), a = at(8, y);
    points.push({ parent: p & 0x80 ? -1 : p, axis: a & 0x80 ? ((a ^ 0xFF) + 1) & 0x7F : a, neg: !!(a & 0x80) });
  }
  const polys = [];
  for (let y = 0, off = 0; y < n.polys; y++) {
    const c = at(30, y), v = [];
    for (let k = 0; k < c; k++) v.push(at(28, (off + k) & 255));
    polys.push({ v, plane: at(20, y), normal: at(22, y), front: at(24, y), back: at(26, y) });
    off += c;
  }
  const normals = [];
  for (let i = 0; i < n.normals; i++) normals.push({ v: polys[i] ? polys[i].v.slice(0, 3) : [], ref: at(6, at(18, i)) });
  return { h, axes, points, polys, normals };
}

// ---- the colours. A colour code gives the patterns of even and odd rows and the screen cells' mask
// and value (set_colour); each pair of bits of a pattern is the background ($D021), the cell's high
// nibble, its low nibble or colour RAM. The view's cells are cleared to $CC.
function colourTables(M) {
  const part = (a, n) => Array.from(M.subarray(a, a + n));
  return { f1e6: part(0xF1E6, 0x13), f1c8: part(0xF1C8, 10), f1d2: part(0xF1D2, 10), p8fca: part(0x8FCA, 0x13),
    p8fdd: part(0x8FDD, 0x20), p8ffd: part(0x8FFD, 0x20),
    spark: [0, 1, 2, 3, 4, 5].map(i => [M[0x8F74 + i], M[0x8F7A + i]]), sparkHigh: !!(M[0xF1DC] & 0x80) };
}
// a colour code: its two patterns and its cell, as set_colour gives them, on a cleared cell
function colourOf(T, x) {
  const p = x < 0x13 ? T.f1e6[x] : (x & 7) + 1;
  const c = x < 0x13 ? T.p8fca[x] : x >> 3;
  return { even: T.f1c8[p], odd: T.f1d2[p], cell: (0xCC & T.p8fdd[c & 31]) | T.p8ffd[c & 31] };
}
// the eight C64 colours of a code's four pixel pairs on even rows and four on odd
function pixelsOf(col, bg, ram) {
  const pair = b => (b === 0 ? bg : b === 1 ? col.cell >> 4 : b === 2 ? col.cell & 15 : ram);
  const four = p => [p >> 6 & 3, p >> 4 & 3, p >> 2 & 3, p & 3].map(pair);
  return four(col.even).concat(four(col.odd));
}

// ---- a pass, as the game's numbers stand once everything has moved
function capture(M, how, chips) {
  const cam = w16(M, 0x58), ori = w16(M, 0x5A);
  const s = {
    how, view: M[0x0D3C], gate: M[0x0838],
    cam: { pos: vecLin(M, cam), rows: rowsLog(M, ori), at: cam, oriAt: ori },
    player: { pos: vecLin(M, 0x065D), rows: rowsLog(M, 0x044B) },
    dcc: rowsLog(M, 0x0DCC),
    S: logPair(M, 0x0D64), S2: logPair(M, 0x0D66), kx: logPair(M, 0x0D68), ky: logPair(M, 0x0D6A),
    hx: logPair(M, 0x0D6C), hy: logPair(M, 0x0D6E),
    cx: M[0x56], cy: M[0x57], W: M[0x41], H: M[0x42],
    target: M[0x0445], buf: M[0x3A], z99: M[0x99], ragged: M[0x8B0A],
    raggedTable: Array.from(M.subarray(0x8B0B, 0x8B0B + 16)), dotColour: M[0x6518],
    colours: colourTables(M), d021: chips ? chips.d021 & 15 : 0, ram: chips ? chips.ram & 15 : 1,
    objs: [], types: {}, models: {},
  };
  for (let y = 0x13; y >= 0; y--) {
    const t = M[0x060D + y];
    const o = { slot: y, used: M[0x0649 + y], type: t, pos: vecLin(M, 0x065D + 9 * y) };
    if (y < 7) o.rows = rowsLog(M, 0x044B + M[0x083C + y]);
    s.objs.push(o);
    if (!o.used || s.types[t]) continue;
    const draw = w16(M, 0x08F8 + 2 * t), data = w16(M, 0x0999 + 2 * t);
    const ty = { flags: M[0x08D5 + t], draw, colour: M[data], scale: logPair(M, 0x0A63 + 2 * t) };
    if (ty.flags & 0x80) {
      const h = modelAt(M, draw);
      if (h !== null) {
        ty.model = h;
        if (!s.models[h]) s.models[h] = readModel(M, h, ty.scale);
        // draw data with a high byte replaces the model's back colours (draw_model)
        if (data >> 8) ty.backs = Array.from(M.subarray(data, data + s.models[h].polys.length));
      }
    } else ty.kind = KIND[draw] || null;
    s.types[t] = ty;
  }
  return s;
}

// ---- the scene of a pass (or of a pose between two): the game's drawing, in double precision.
// The camera's frame: x right, y up, z behind (the view looks along -z). A point's window position
// is the centre plus x and y over twice its distance in front, scaled (project); the window's x
// is the C64's hires pixel from its left edge, y the pixel row from its bottom.
function render(s) {
  if (s.prims) return s.prims;
  const out = [];
  const B = s.cam.rows, P0 = s.cam.pos;
  const SX = Math.pow(2, s.S), SY = Math.pow(2, s.S2);
  const kx = Math.pow(2, s.kx), ky = Math.pow(2, s.ky), hx = Math.pow(2, s.hx), hy = Math.pow(2, s.hy);
  const proj = p => [s.cx + p[0] / (-2 * p[2]) * SX, s.cy + p[1] / (-2 * p[2]) * SY];
  const R0 = s.dcc || transpose(B);
  const st = { z99: s.z99, ragged: s.ragged };
  const list = [];
  // in_view: in front, or behind by less than the radius; inside the window's edges, widened by
  // the radius; its distance from the camera, and its size on screen. The large go in the list
  // (the scan stops at the 14th), the small are drawn at once
  for (const o of s.objs) {
    if (!o.used) continue;
    const ty = s.types[o.type];
    if (!ty) continue;
    const r = Math.pow(2, ty.scale);
    const d = sub(o.pos, P0), c = times(B, d), az = Math.abs(c[2]);
    if (c[2] >= 0 && az >= r) continue;
    if (!(Math.abs(c[1]) < (az + r * hy) / ky)) continue;
    if (!(Math.abs(c[0]) < (az + r * hx) / kx)) continue;
    const dist = len(d);
    if (!(dist >= 1)) continue;
    const e = { o, ty, c, dist, size: Math.min(255, SX * r / dist) };
    if (e.size >= 11) {
      list.push(e);
      if (list.length === 14) break;
    } else drawObject(out, s, st, e, false, proj, R0);
  }
  // the list from the farthest to the nearest; of two at the same distance, the one found later
  const order = list.map((e, i) => ({ e, i })).sort((a, b) => b.e.dist - a.e.dist || b.i - a.i);
  for (const { e } of order) drawObject(out, s, st, e, true, proj, R0);
  if (s.hazard) for (const t of s.hazard) out.push(t);
  if (!(s.target & 0x80)) arrows(out, s);
  s.prims = out;
  return out;
}

// One object: a model in its polygons, or a 2D object at its projected centre; a model too small
// for the list is drawn as a disc in colour $6518
function drawObject(out, s, st, e, inList, proj, R0) {
  const { o, ty, c } = e;
  const flat = !(ty.flags & 0x80);
  if (!inList && !flat) {
    if (c[2] >= 0) return;
    out.push({ k: 'disc', at: proj(c), d: e.size / 2 + 1, c: s.dotColour, slot: o.slot });
    return;
  }
  if (flat) {
    if (c[2] >= 0 || !ty.kind) return;
    const p = { k: ty.kind, at: proj(c), d: e.size, c: ty.kind === 'annulus' ? st.z99 : ty.colour, slot: o.slot };
    if (ty.kind === 'ragged' || ty.kind === 'burst') { p.ragged = st.ragged; st.ragged = (st.ragged + Math.floor(e.size / 2)) & 255; }
    out.push(p);
    return;
  }
  const m = s.models[ty.model];
  if (!m) return;
  st.z99 = 0xFF;                    // draw_model leaves $99 at the high byte of the object's $FF05 entry
  // the model's axes in the camera's frame: a ship's own rows seen by the camera ($0D40), any
  // other's the world's axes seen by it ($0DCC)
  const R = o.rows && o.slot < 7 ? rowsTimes(o.rows, s.cam.rows) : R0;
  const axes = m.axes.map(v => [v[0] * R[0][0] + v[1] * R[1][0] + v[2] * R[2][0],
    v[0] * R[0][1] + v[1] * R[1][1] + v[2] * R[2][1], v[0] * R[0][2] + v[1] * R[1][2] + v[2] * R[2][2]]);
  const pts = [];
  for (let i = 0; i < m.points.length; i++) {
    const q = m.points[i], base = q.parent < 0 ? c : pts[q.parent] || c, a = axes[q.axis] || [0, 0, 0];
    pts.push(q.neg ? sub(base, a) : add(base, a));
  }
  // each normal's side, in the model's own frame (face_signs): the normal (made from the model's
  // points as they stand unturned) against the camera's offset from its reference point; below 0
  // when the face looks toward the camera. A ship's frame is its rows; any other's the world's,
  // whatever orientation it is drawn with
  const local = m.local || (m.local = placeLocal(m));
  const eye = sub(s.cam.pos, o.pos), v = o.rows && o.slot < 7 ? times(o.rows, eye) : eye;
  const sign = m.normals.map(nm => {
    const [p0, p1, p2] = nm.v.map(i => local[i]), pr = local[nm.ref];
    if (!p0 || !p1 || !p2 || !pr) return 1;
    return dot(cross(sub(p0, p1), sub(p2, p1)), sub(v, pr));
  });
  const neg = i => (sign[i] !== undefined ? sign[i] < 0 : false);
  const planeNeg = a => neg(a & 0x80 ? ((a ^ 0xFF) + 1) & 255 : a);
  const passes = [a => a !== 0 && ((a & 0x80) ? !planeNeg(a) : planeNeg(a)), a => a === 0,
    a => a !== 0 && ((a & 0x80) ? planeNeg(a) : !planeNeg(a))];
  for (const test of passes) {
    m.polys.forEach((p, y) => {
      if (!test(p.plane)) return;
      const col = neg(p.normal) ? p.front : ty.backs ? ty.backs[y] : p.back;
      if (col === 0xFF) return;
      const v = p.v.map(i => pts[i]).filter(Boolean);
      if (!v.some(q => q[2] < 0)) return;
      const poly = clipNear(v);
      if (poly.length < 2) return;
      out.push({ k: 'poly', pts: poly.map(proj), c: col, slot: o.slot, n: y });
    });
  }
  out.push({ k: 'model', slot: o.slot, pts: pts.map(q => (q[2] < 0 ? proj(q) : null)) });
}
// a model's points in its own frame, from its centre
function placeLocal(m) {
  const pts = [];
  for (const q of m.points) {
    const base = q.parent < 0 ? [0, 0, 0] : pts[q.parent] || [0, 0, 0], a = m.axes[q.axis] || [0, 0, 0];
    pts.push(q.neg ? sub(base, a) : add(base, a));
  }
  return pts;
}
// a polygon kept in front of the camera: the part with z below -NEAR
const NEAR = 1 / 64;
function clipNear(v) {
  if (v.every(q => q[2] < -NEAR)) return v;
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length], ina = a[2] < -NEAR, inb = b[2] < -NEAR;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (-NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), -NEAR]);
    }
  }
  return out;
}

// The arrowheads that point at the player's target (draw_target_arrows): its position in the
// player's own frame, projected as if in front; when it is in front and inside the window, one at
// each edge of the window on its row and column, pointing in at it; otherwise kept to the window
// and drawn 5 pixels (3 rows) in from each edge, pointing out
function arrows(out, s) {
  const t = s.objs.find(o => o.slot === s.target);
  if (!t) return;
  const c = times(s.player.rows, sub(t.pos, s.player.pos));
  const SX = Math.pow(2, s.S), SY = Math.pow(2, s.S2), az = Math.abs(c[2]) || 1e-9;
  let x = s.cx + c[0] / (2 * az) * SX, y = s.cy + c[1] / (2 * az) * SY, inside = 2;
  const keep = (v, size) => { if (v < 0) return 0; if (v < size + 1) { inside--; return v; } return size; };
  x = keep(x, s.W); y = keep(y, s.H);
  const a = [];
  // sideways: rows y-4 to y+4, out to 4 pixels at y; upright: four rows from r, 8 pixels to 2
  const right = x0 => a.push([[x0, y - 4], [x0, y + 5], [x0 + 5, y + 0.5]]);
  const left = x0 => a.push([[x0 + 1, y - 4], [x0 + 1, y + 5], [x0 - 4, y + 0.5]]);
  const up = r => a.push([[x - 3, r], [x + 5, r], [x + 2, r + 4], [x, r + 4]]);
  const down = r => a.push([[x - 3, r + 1], [x + 5, r + 1], [x + 2, r - 3], [x, r - 3]]);
  if (c[2] < 0 && !inside) { right(0); left(s.W); up(0); down(s.H); }
  else { left(5); right(s.W - 5); down(3); up(s.H - 3); }
  for (const pts of a) out.push({ k: 'shape', pts, c: 0, arrow: true });
}

// ---- a pose between two passes: positions slid, orientations turned. An object that changed its
// type, came or went, or jumped is not slid, nor is a particle (type flag bit 2), which stays where
// it is until the game puts it back near the camera
function pose(a, b, f) {
  if (!b || f <= 0) return a;
  if (f >= 1) return b;
  const s = Object.assign({}, f < 0.5 ? a : b);
  s.prims = null; s.dcc = null; s.hazard = a.hazard;
  s.cam = { pos: lerp3(a.cam.pos, b.cam.pos, f), rows: slerpRows(a.cam.rows, b.cam.rows, f), at: b.cam.at, oriAt: b.cam.oriAt };
  s.player = { pos: lerp3(a.player.pos, b.player.pos, f), rows: slerpRows(a.player.rows, b.player.rows, f) };
  s.types = Object.assign({}, a.types, b.types); s.models = Object.assign({}, a.models, b.models);
  s.objs = a.objs.map((oa, i) => {
    const ob = b.objs[i], ty = s.types[oa.type];
    if (!oa.used || !ob.used || oa.type !== ob.type || !ty || (ty.flags & 4) || len(sub(ob.pos, oa.pos)) > 32) return f < 0.5 ? oa : ob;
    const o = { slot: oa.slot, used: oa.used, type: oa.type, pos: lerp3(oa.pos, ob.pos, f) };
    if (oa.rows && ob.rows) o.rows = slerpRows(oa.rows, ob.rows, f);
    return o;
  });
  return s;
}
// two passes the motion does not slide across: another view, the gate, a jump of the player or of
// the camera against the player (an outside view's camera put back ahead of the ship), or a turn of
// more than 60 degrees
function cut(a, b) {
  if (a.view !== b.view || a.gate !== b.gate || a.cam.at !== b.cam.at) return true;
  const dp = sub(b.player.pos, a.player.pos);
  if (len(dp) > 256 || len(sub(sub(b.cam.pos, a.cam.pos), dp)) > 24 + 2 * len(dp)) return true;
  return turnCos(a.cam.rows, b.cam.rows) < Math.cos(Math.PI / 6);
}
// An outside view's camera at a pass the game does not draw. The game moves it only when it draws
// (update_camera): the chase view's toward a point behind the ship, the cinematic view's not at
// all, and each aims it at the ship with the world's up ($0DB1, the identity's second row). For a
// pass in between, the chase camera keeps its offset from the ship, the offset sliding from one
// drawn pass's to the next once that is known, the cinematic camera its place; both are aimed at
// the ship as the game aims them.
function aim(s, pos, like) {
  const off = sub(pos, s.player.pos), l = len(off);
  if (!(l > 1e-6)) return { pos, rows: like.rows, at: like.at, oriAt: like.oriAt };
  const z = off.map(v => v / l), x0 = cross([0, 1, 0], z), lx = len(x0) || 1, x = x0.map(v => v / lx);
  return { pos, rows: [x, cross(z, x), z], at: like.at, oriAt: like.oriAt };
}
function follow(H, s) {
  let i = H.length - 1, D = null;
  for (; i >= 0; i--) { if (H[i].how === 'draw') { D = H[i]; break; } if (H[i].cutBefore) return null; }
  if (!D || D.view !== s.view) return null;
  if (s.how === 'skip') s.cam = aim(s, s.view === 1 ? add(s.player.pos, sub(D.cam.pos, D.player.pos)) : D.cam.pos, D.cam);
  return { D, i };
}
function refollow(H, D, i, s) {
  const o0 = sub(D.cam.pos, D.player.pos), o1 = sub(s.cam.pos, s.player.pos);
  for (let j = i + 1; j < H.length; j++) {
    const q = H[j], f = (q.n - D.n) / (s.n - D.n);
    q.cam = aim(q, s.view === 1 ? add(q.player.pos, lerp3(o0, o1, f)) : lerp3(D.cam.pos, s.cam.pos, f), D.cam);
    q.prims = null; q.still = null;
  }
}

// ---- watching the port
// the view's bytes in one buffer: character rows 3-15, columns 4-35, the bitmap and the cells
function viewBytes(M, buf) {
  const bm = buf ? 0x4000 : 0xC000, sc = buf ? 0x6000 : 0xE000, out = new Uint8Array(13 * 32 * 9);
  let k = 0;
  for (let r = 3; r < 16; r++) for (let c = 4; c < 36; c++) {
    const a = bm + r * 320 + c * 8;
    for (let b = 0; b < 8; b++) out[k++] = M[a + b];
    out[k++] = M[sc + r * 40 + c];
  }
  return out;
}
function wrap(P, name, before, after) {
  const f = P[name];
  if (typeof f !== 'function') return;
  const gen = f.constructor && f.constructor.name === 'GeneratorFunction';
  P[name] = gen ? function* (r) { if (before) before(r); const v = yield* f.call(this, r); if (after) after(r, v); return v; }
    : function (r) { if (before) before(r); const v = f.call(this, r); if (after) after(r, v); return v; };
}
function attach(rt) {
  const P = rt.P;
  if (!P || rt.program !== 'main') return null;
  const was = P.__srModern;
  if (was) {
    // a machine restored to another moment: what was kept belongs to another run
    const last = was.hist[was.hist.length - 1];
    if (last && last.t > rt.t) { was.hist = []; was.flips = []; was.bufs = { 0: null, 128: null }; was.drawing = null; was.clock.V = null; was.wait = 0; }
    return was;
  }
  const M = P.M;
  const st = { rt, P, hist: [], n: 0, clock: { V: null, phi: 0, v: 0 }, bufs: { 0: null, 128: null },
    drawing: null, hazard: null, flips: [], wait: 0, port2: null };
  P.__srModern = st;
  const chips = () => ({ d021: rt.vic ? rt.vic[0x21] : 0, ram: rt.colour ? rt.colour[9 * 40 + 20] : 1 });
  function push(s) {
    const H = st.hist, last = H[H.length - 1];
    s.n = ++st.n; s.t = rt.t;
    const f = s.view && last ? follow(H, s) : null;
    s.cutBefore = !last || cut(last, s);
    if (f && s.how === 'draw' && !s.cutBefore) refollow(H, f.D, f.i, s);
    H.push(s);
    if (H.length > 80) H.shift();
  }
  // a pass that skips its drawing is kept as frame_skip leaves it; one that draws, as
  // build_draw_list starts (the camera of an outside view, the particles and the flash colour set)
  const skipped = (r, out) => { if (out && out.c) push(capture(M, 'skip', chips())); };
  wrap(P, 'frame_skip3', null, skipped);
  wrap(P, 'frame_skip5', null, skipped);
  wrap(P, 'build_draw_list', () => {
    const s = capture(M, 'draw', chips());
    push(s);
    st.drawing = s;
    const b = st.bufs[s.buf];
    s.layers = b ? b.concat([s]) : null;      // what the buffer holds once this is drawn; null: not known
    st.bufs[s.buf] = s.layers;
  });
  // the sector's hazard triangles, as the game placed them
  wrap(P, 'sector_hazard', () => { st.hazard = []; }, () => {
    if (st.drawing && st.hazard.length) st.drawing.hazard = st.hazard;
    st.hazard = null;
  });
  wrap(P, 'spray_triangle', null, () => {
    if (!st.hazard) return;
    const p = i => s16(w16(M, 0xFD00 + i));
    st.hazard.push({ k: 'shape', pts: [[p(0), p(2)], [p(4), p(6)], [p(8), p(10)]], pat: [M[0x3D], M[0x3E]], c: 5 });
  });
  wrap(P, 'view_clear_c000', () => { st.bufs[0] = []; });
  wrap(P, 'view_clear_4000', () => { st.bufs[128] = []; });
  // the buffer just drawn goes on show
  const flip = () => {
    const s = st.drawing;
    if (!s || s.buf !== M[0x3A]) return;
    s.flipT = rt.t;
    s.snap = viewBytes(M, s.buf);
    st.flips.push(s);
    if (st.flips.length > 24) st.flips.shift();
    st.drawing = null;
  };
  wrap(P, 'flip_buffers', flip);
  wrap(P, 'show_frame', flip);
  return st;
}

// ---- what is on show
// the video bank at the middle of the view in frame F, from the bank the frame began with and the
// writes to the port of CIA 2 before that line
const MID = 126;
function bankAt(F) {
  let pra = F.cia2[0], ddra = F.cia2[1];
  const ws = F.writes.filter(w => (w[2] === 0xDD00 || w[2] === 0xDD02) && w[0] < MID).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const w of ws) { if (w[2] === 0xDD00) pra = w[3]; else ddra = w[3]; }
  return 3 - ((pra | ~ddra) & 3);
}
// The picture on show in frame F: the last buffer to go on show before the middle of the view
// (where a flip lands inside the view, the C64 shows the old picture above it and the new below),
// still holding what the game drew: put on show during the frame, or its bytes unchanged since
function onShow(st, F) {
  if (!st || !F || !F.mem || st.rt.program !== 'main') return null;
  const bank = bankAt(F);
  if (bank !== 3 && bank !== 1) return null;
  const buf = bank === 3 ? 0 : 128, start = F.frame * FRAME, mid = start + MID * LINE;
  for (let i = st.flips.length - 1; i >= 0; i--) {
    const s = st.flips[i];
    if (s.flipT > mid) continue;
    if (s.buf !== buf) return null;
    if (s.flipT >= start) return s;
    const now = viewBytes(F.mem, buf), was = s.snap;
    for (let k = 0; k < was.length; k++) if (now[k] !== was[k]) return null;
    return s;
  }
  return null;
}

// a pass as smooth motion draws it, the world's axes from its camera
const still = s => s.still || (s.still = Object.assign({}, s, { dcc: null, prims: null, still: null }));

// ---- smooth motion. The game's passes each move everything a fixed step, but they come unevenly:
// one that draws takes several frames, the ones that skip their drawing to catch up come close
// behind it. Smooth motion draws the game as it stood a short while ago, D cycles before the moment
// V on the clock: where the game was then is found from when each pass was computed, as a pass
// number and a fraction, and drawn as a pose that far between the two passes. D is the longest
// wait between two passes of late, so the pass after is always known when the phase gets there,
// and the phase follows that point through a smoothing that takes out the unevenness: it moves at
// the game's own rate of passes, eased toward the point over a few frames. On average the view is
// no later than the C64's own picture, which shows a pass from when its drawing ends until the
// next one's does.
function smooth(st, V, F) {
  const s = onShow(st, F), c = st.clock;
  if (!s) { c.V = null; return null; }
  if (!(V >= 0)) V = (F.frame + 1) * FRAME;
  if (s.layers && s.layers.length > 1) { c.V = null; return { scene: s, layers: s.layers, shown: s }; }
  const H = st.hist, last = H[H.length - 1], K = Math.min(12, H.length - 1);
  if (K < 2) { c.V = V; c.phi = s.n; c.v = 0; return { scene: still(s), shown: s, phi: s.n }; }   // the smooth view starts from here
  const first = H[H.length - 1 - K], rate = (last.n - first.n) / Math.max(FRAME, last.t - first.t);
  let wait = 0;
  for (let j = H.length - K; j < H.length; j++) wait = Math.max(wait, H[j].t - H[j - 1].t);
  st.wait = st.wait ? (wait > st.wait ? wait : st.wait + (wait - st.wait) * 0.02) : wait;
  // where the game was D cycles ago: between the two passes computed either side of then
  const at = V - st.wait - FRAME / 2;
  let g;
  if (at >= last.t) g = last.n;
  else if (at <= H[0].t) g = H[0].n;
  else {
    let j = H.length - 1;
    while (j > 0 && H[j - 1].t > at) j--;
    const a = H[j - 1], b = H[j];
    g = a.n + (b.n - a.n) * (b.t > a.t ? (at - a.t) / (b.t - a.t) : 1);
  }
  let phi;
  if (c.V === null || V < c.V || V - c.V > 8 * FRAME) { phi = g; c.v = rate; }
  else {
    const dV = V - c.V, want = rate + (g - c.phi) / (3 * FRAME);
    c.v += (want - c.v) * (1 - Math.exp(-dV / FRAME));
    phi = c.phi + Math.max(0, c.v) * dV;
  }
  phi = Math.max(H[0].n, Math.min(phi, last.n));
  c.V = V; c.phi = phi;
  // the passes either side of the phase. Every scene is drawn with the camera's own orientation
  // for the world's axes: the game's $0DCC is the camera's of the pass before in an outside view
  const n0 = Math.floor(phi), a = H.find(h => h.n === n0), b = H.find(h => h.n === n0 + 1);
  if (!a) return { scene: still(s), shown: s, phi };
  if (!b || b.cutBefore || phi === n0) return { scene: still(a), shown: s, phi };
  const sc = pose(a, b, phi - n0);
  sc.hazard = s.hazard;
  return { scene: sc, shown: s, phi };
}

// ---- drawing on a canvas, at the screen's own resolution
const SRGB = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toS = v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const blendCache = new Map();
// the colour the eye sees of a pattern pair's eight pixel pairs: their light averaged
function blend(cols) {
  const key = cols.join(',');
  let v = blendCache.get(key);
  if (v) return v;
  const pal = (root.C64 && root.C64.PAL) || [];
  const acc = [0, 0, 0];
  for (const c of cols) { const rgb = SRGB(pal[c] || '#000000'); for (let k = 0; k < 3; k++) acc[k] += toLin(rgb[k]); }
  v = 'rgb(' + acc.map(x => toS(x / cols.length)).join(',') + ')';
  blendCache.set(key, v);
  return v;
}
function fillOf(s, p) {
  const col = colourOf(s.colours, p.c);
  if (p.pat) { col.even = p.pat[0]; col.odd = p.pat[1]; }
  return blend(pixelsOf(col, s.d021, s.ram));
}
// The view's place in the frame renderFrame draws (384 by 272): the window's pixel x at frame x
// 66 + x, its row y (from the bottom) at frame y 161 - y
const VX = 66, VY = 162, VW = 252, VH = 103;
// Draws the faithful frame (a canvas of 384 by 272) scaled to cv's pixels, and the view over it
// from view (smooth's, or a picture's scene or its layers): cv is sized to its place on the page
function draw(cv, faithful, view) {
  const dpr = root.devicePixelRatio || 1, css = cv.getBoundingClientRect();
  const W = Math.max(768, Math.round(css.width * dpr)), H = Math.round(W * 272 / 384);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.classList.add('pl-native'); }
  const g = cv.getContext('2d'), k = W / 384;
  g.imageSmoothingEnabled = false;
  g.drawImage(faithful, 0, 0, W, H);
  if (!view) return;
  const s0 = view.scene;
  g.save();
  g.beginPath(); g.rect(VX * k, (VY - VH) * k, VW * k, VH * k); g.clip();
  g.fillStyle = blend([s0.d021]);
  g.fillRect(VX * k, (VY - VH) * k, VW * k, VH * k);
  const X = x => (VX + x) * k, Y = y => (VY - y) * k;
  for (const sc of view.layers || [s0]) paintPrims(g, sc, render(sc), X, Y, k);
  g.restore();
}
function paintPrims(g, s, prims, X, Y, k) {
  g.lineJoin = 'round';
  const path = pts => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); };
  // a polygon filled, and its edge drawn thinly in the same colour, so that two that meet leave no
  // seam between them
  const poly = (pts, fill) => { path(pts); g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = Math.max(1, k * 0.35); g.fill(); g.stroke(); };
  const disc = (x, y, r, fill) => { g.beginPath(); g.arc(X(x), Y(y), Math.max(0.9, r) * k, 0, 2 * Math.PI); g.fillStyle = fill; g.fill(); };
  for (const p of prims) {
    if (p.k === 'model') continue;
    const fill = fillOf(s, p);
    const [x, y] = p.at || [0, 0], d = p.d;
    switch (p.k) {
      case 'poly': case 'shape': poly(p.pts, fill); break;
      case 'disc': disc(x, y, d / 2, fill); break;
      case 'ring':
        if (d >= 0xFA) break;
        g.beginPath(); g.arc(X(x), Y(y), Math.max(0.6, d / 2) * k, 0, 2 * Math.PI);
        g.strokeStyle = fill; g.lineWidth = 1.6 * k; g.stroke();
        break;
      case 'ragged': ragged(g, s, p, X, Y, k, fill); break;
      case 'burst': {
        ragged(g, s, p, X, Y, k, fill);
        const inner = fillOf(s, { c: p.c === 0xD9 ? 0xDE : 0xD6 }), white = fillOf(s, { c: 2 });
        if (d >= 4) { const q = d / 8 + 1; disc(x, y, (d - q) / 2, inner); disc(x, y, (d - 2 * q) / 2, white); }
        else disc(x, y, d / 2, white);
        break;
      }
      case 'annulus': disc(x, y, d / 2, fill); if (d >= 4) disc(x, y, (d - d / 4) / 2, fillOf(s, { c: 0 })); break;
      case 'sparks': sparks(g, s, p, X, Y, k); break;
      case 'flicker': {
        const rnd = rng(p.slot * 7919 + (s.n || 0) * 104729);
        poly([0, 1, 2].map(() => [x + rnd() * d, y + rnd() * d]), fill);
        break;
      }
    }
  }
}
// a disc whose rows are each widened by 0 to 2 pixels from the game's table, a row on each time
function ragged(g, s, p, X, Y, k, fill) {
  const [x, y] = p.at, r = p.d / 2;
  g.fillStyle = fill;
  if (p.d < 12) { g.beginPath(); g.arc(X(x), Y(y), r * k, 0, 2 * Math.PI); g.fill(); return; }
  const n = Math.max(4, Math.round(p.d)), L = [], Rt = [];
  let ctr = p.ragged || 0;
  for (let i = 0; i <= n; i++) {
    const dy = -r + (2 * r * i) / n, w = Math.sqrt(Math.max(0, r * r - dy * dy));
    ctr = (ctr + 1) & 255;
    const dd = s.raggedTable[ctr & 15] || 0;
    L.push([x - w - dd, y + dy]); Rt.push([x + w + dd, y + dy]);
  }
  g.beginPath();
  L.concat(Rt.reverse()).forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))));
  g.closePath(); g.fill();
}
// seven small triangles about the point, each with a corner at a random offset up to half the size
// and the other two either side of the point (spray_triangles), in the sparks' patterns
function sparks(g, s, p, X, Y, k) {
  const [x, y] = p.at, d = p.d, dd = Math.max(0.5, d / 16), rnd = rng(p.slot * 7919 + (s.n || 0) * 104729);
  const base = s.colours.sparkHigh ? 3 : 0;
  for (let i = 0; i < 7; i++) {
    const ox = (rnd() - 0.5) * d, oy = (rnd() - 0.5) * d, pat = s.colours.spark[base + Math.floor(rnd() * 3)];
    const pts = oy - ox < 0 ? [[x + ox, y + oy], [x, y + dd], [x, y - dd]] : [[x + ox, y + oy], [x + dd, y], [x - dd, y]];
    const fill = fillOf(s, { c: p.c, pat });
    g.beginPath(); pts.forEach((q, j) => (j ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))));
    g.closePath(); g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = Math.max(1, k * 0.5); g.fill(); g.stroke();
  }
}
// a small random generator for what the game draws at random, the same for a pass and a slot
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
}

// ---- smooth motion in the C64's own pixels: a second copy of the port, on a copy of the game's
// memory with the pose written in, draws the view as the game would draw that pose, into the
// $C000 buffer; its view then goes into px, a frame of palette indices (384 by 272)
function port2(st) {
  if (st.port2) return st.port2;
  const M2 = new Uint8Array(0x10000);
  const io = { read: () => 0, write: () => {}, vicRead: () => 0, vicWrite: () => {}, sidRead: () => 0, sidWrite: () => {},
    colourRead: () => 0, colourWrite: () => {}, ciaRead: () => 0, ciaWrite: () => {}, cia2Read: () => 0, cia2Write: () => {},
    irqByte: a => M2[a], load: () => null, block: () => null, save: () => {} };
  st.port2 = { M: M2, P: root.SRPort.makePort(M2, io, {}) };
  return st.port2;
}
function paint(px, st, view) {
  if (!view || view.layers) return false;     // the gate's jump: what each buffer holds stays the game's
  const sc = view.scene, { M: M2, P: P2 } = port2(st);
  M2.set(st.rt.M);
  M2[1] &= 0xFC;
  // the pose in the game's numbers: every slot, the camera, the world's axes seen from it
  const lin3 = (a, v) => v.forEach((x, j) => putLin(M2, a + 3 * j, x));
  const log9 = (a, R) => R.forEach((r, i) => r.forEach((x, j) => putLog(M2, a + 9 * i + 3 * j, x)));
  for (const o of sc.objs) {
    const y = o.slot;
    M2[0x0649 + y] = o.used; M2[0x060D + y] = o.type;
    lin3(0x065D + 9 * y, o.pos);
    if (o.rows && y < 7) log9(0x044B + M2[0x083C + y], o.rows);
  }
  lin3(0x065D, sc.player.pos); log9(0x044B, sc.player.rows);
  const cam = sc.cam;
  M2[0x58] = cam.at & 255; M2[0x59] = cam.at >> 8; M2[0x5A] = cam.oriAt & 255; M2[0x5B] = cam.oriAt >> 8;
  if (cam.at !== 0x065D) lin3(cam.at, cam.pos);
  if (cam.oriAt !== 0x044B) log9(cam.oriAt, cam.rows);
  log9(0x0DCC, transpose(cam.rows));
  M2[0x0445] = sc.target; M2[0x0837] = 0xFF; M2[0x99] = sc.z99; M2[0x8B0A] = sc.ragged;
  M2[0x3A] = 0;
  P2.window_view();
  P2.set_colour({ x: 1 });
  P2.view_clear_c000();
  M2[0x9002] = view.shown.buf ? 0x70 : 0x80;
  const it = P2.build_draw_list();
  for (let r = it.next(), g = 0; !r.done; r = it.next()) if (++g > 1e5) throw new Error('paint: the draw list did not end');
  if (sc.hazard) for (const h of sc.hazard) {
    P2.set_colour({ x: 5 });
    h.pts.forEach((q, i) => { const a = 0xFD00 + 4 * i; M2[a] = q[0] & 255; M2[a + 1] = (q[0] >> 8) & 255; M2[a + 2] = q[1] & 255; M2[a + 3] = (q[1] >> 8) & 255; });
    M2[0x3D] = h.pat[0]; M2[0x3E] = h.pat[1]; M2[0x55] = 3;
    P2.fill_polygon();
  }
  P2.draw_target_arrows();
  const colour = st.rt.colour, bg = sc.d021;
  for (let R = 24; R <= 126; R++) {
    const o = (35 + R) * 384;
    for (let X = 34; X <= 285; X++) {
      const cell = (R >> 3) * 40 + (X >> 3), b = M2[0xC000 + (R >> 3) * 320 + (X >> 3) * 8 + (R & 7)];
      const v = (b >> (6 - 2 * ((X & 7) >> 1))) & 3, c = M2[0xE000 + cell];
      px[o + 32 + X] = v === 0 ? bg : v === 1 ? c >> 4 : v === 2 ? c & 15 : colour[cell] & 15;
    }
  }
  return true;
}

root.SRModern = { attach, onShow, smooth, render, draw, paint, pose, capture, readModel, colourOf, pixelsOf, blend,
  logAt, vecLog, rowsLog, vecLin, putLog, putLin, FRAME, LINE, VIEW_RECT: { x: VX, y: VY - VH, w: VW, h: VH } };
})(typeof window !== 'undefined' ? window : globalThis);
