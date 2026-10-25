// The Play page's modern view of Castle Master: the 3D view drawn at the screen's own resolution,
// or, for Fast CPU (site/lib/fast-cpu.js), in the C64's own pixels at a fractional angle. The game is not
// changed: the routines below are watched, and its memory is only read.
//
// Each picture the game draws, the page keeps what the drawing works from. As the game's painter's
// sort finishes (PAINTER_SORT_VISIBLE_ENTRIES): where the player stands and which way the view
// looks (yaw and pitch, 72 steps to a turn), the area's two lists of objects as their records
// stand, and which of them the game queued to draw. As the drawing starts
// (DRAW_SORTED_VISIBLE_QUEUE): the sky's and the floor's patterns, the scenery, the sight and the
// lightning. From those the scene is worked out again in double precision, as the game works it
// out: each object's corners from its record (a box, a rectangle, a pyramid in one of six
// orientations, a line or a polygon), each face's colour from the side of it the player is on or
// from which way it winds on the screen, the view matrix from the angles, each face clipped to the
// view and projected, and the objects the game queued in its painter's order, its own bubble sort
// on the same bounds. Drawn sharp, each of the game's dither patterns is the shade the eye mixes
// from it.
//
//   const st = CMModern.attach(rt)        watch the port's routines (again: the same watch; after
//                                          the clock goes back, what was kept is dropped)
//   CMModern.onShow(st, F)                 the picture on show in frame F ({pic, t, n}), or null when
//                                          the view shows anything else (a menu, the viewport
//                                          opening, a message)
//   CMModern.latest(st)                    the last copy to the view's bitmap ({pic, t, n}), its pic
//                                          null when it put anything but the 3D view there
//   CMModern.between(st, P, always)        with Fast CPU, the last copy's 3D view at the angles it was
//                                          built at, {scene, shown}, or null at the game's own angles
//   CMModern.scene(P, pic, pose)           a picture's scene, from its own pose or one given: the
//                                          background's line and the faces in drawing order, in
//                                          the view's coordinates (0-120 across from the left,
//                                          0-120 up from the bottom, before the game's mirroring)
//   CMModern.draw(cv, faithful, view, F, px)  the faithful frame (a canvas) scaled to cv, the view's
//                                          scene over it; F the frame on show, px its pixels
//   CMModern.paint(px, view, F)            the view in the C64's pixels into px, the frame's palette
//                                          indices; false when it leaves them as they are
(function (root) {
'use strict';
const LINE = 63, FRAME = 63 * 312;

// ---- what a picture works from, read when the game draws it
const w16 = (M, a) => M[a] | M[a + 1] << 8;
const s16 = v => (v << 16) >> 16;
// the object records of a list: X records from the pointer, each its length on (byte 8)
function records(M, n, p) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const len = M[(p + 8) & 0xFFFF] || 1;
    out.push(Uint8Array.from({ length: len }, (_, k) => M[(p + k) & 0xFFFF]));
    p = (p + len) & 0xFFFF;
  }
  return out;
}
// the topologies the game's queue routines read ($12CC on): a face count, then each face's colour,
// vertex count and vertex numbers; static but for the colours, which each object writes
const topology = (M, at) => {
  const faces = [];
  let n = M[0x12CC + at], y = at + 1;
  while (n-- > 0) {
    const k = M[0x12CC + y + 1];
    faces.push(Array.from(M.subarray(0x12CC + y + 2, 0x12CC + y + 2 + k)));
    y += 2 + k;
  }
  return faces;
};
const TOPO = { cuboid: 0, pyr5: 0x25, pyr6a: 0x40, pyr6b: 0x5D, pyr8: 0x7A };
// the view's angles, 72 steps to a turn, and the share of a step past each that Fast CPU turns by
// (site/lib/fast-cpu.js, the port's plug-in point frac)
const angles = (M, P) => ({ yaw: M[0x2411] + P.plug.frac(0x2411), pitch: M[0x2410] + P.plug.frac(0x2410) });
// what the scene is built from, read as the game's sort finishes: the place, the objects, the
// objects the game queued and the tables; a draw with no rebuild before it (the game draws the
// view again when only the sky or the sight changed) draws what the last rebuild queued
function world(M, P) {
  const lists = [];
  if (M[0x1060]) lists.push(records(M, M[0x1060], w16(M, 0x1061)));
  if (M[0x242A]) lists.push(records(M, M[0x242A], w16(M, 0x242B)));
  const topo = {};
  for (const [k, at] of Object.entries(TOPO)) topo[k] = topology(M, at);
  // the place as the game's 16-bit sums take it, a step past the world's edge below 0
  const pose = Object.assign({ x: s16(w16(M, 0x2407)), y: s16(w16(M, 0x2409)), z: s16(w16(M, 0x240B)) }, angles(M, P));
  const objects = [].concat(...lists);
  return {
    area: M[0x2429],
    pose,
    objects,
    drawn: drawn(directory(M), objects, pose),
    topo,
    sines: Array.from(M.subarray(0x123C, 0x123C + 144)),
    free: M[0x2417],                               // set: no box (COMPUTE_COARSE_VIEW_BOUNDS)
  };
}
// a picture: the world its rebuild read (or, with none, the world now), and what the draw itself
// reads as it starts: the sky, the floor and the scenery from the angles as they are then, the
// patterns, the sight and the lightning
function capture(M, P, built) {
  return Object.assign({}, built || world(M, P), {
    bg: angles(M, P),
    sky: M[0x2464],                                // sky's pattern high, floor's low; 0: no sky
    patterns: Array.from(M.subarray(0x9D06, 0x9D06 + 64)),
    strip: M[0x2429] === 1 ? Array.from(M.subarray(0x21FA, 0x21FA + 18 * 16)) : null,
    buffer: w16(M, 0x10A0),
    cells: { bg: M[0x2431], hi: M[0x2432], lo: M[0x2433], ram: M[0x2434] },
    reticle: !M[0x2467] && !!M[0x246B],
    // the lightning's streak, when the game draws it (attach), at the column it draws it in
    lightning: false, clock: 0,
    streak: Array.from(M.subarray(0x20F8, 0x20F8 + 0x55 * 3)),
  });
}

// The objects the game is about to draw: its painter's directory ($10A6 + 4, four bytes an object,
// $106A of them: the object's render record, whose first byte is its id, and its bounds record,
// six words), read as the sort leaves it (the draw paints the background over the bounds); each
// matched to its object record by the id and the bounds. The game leaves out some objects the
// scene would draw, most of them a pixel or two across in the distance, and the sort, which is
// not a strict order, can put the others in another order with one more; so the scene keeps to
// the objects the game drew
function directory(M) {
  const keys = [];
  for (let i = 0, d = w16(M, 0x10A6) + 4; i < M[0x106A]; i++, d += 4) {
    const at = w16(M, d + 2), b = [];
    for (let k = 0; k < 12; k += 2) b.push(s16(w16(M, at + k)));
    keys.push(M[w16(M, d)] + ':' + b.join());
  }
  return keys;
}
function drawn(keys, objects, pose) {
  const left = new Map(), out = new Set();
  for (const k of keys) left.set(k, (left.get(k) || 0) + 1);
  for (const rec of objects) {
    const k = rec[7] + ':' + bounds(rec, pose).b.join(), n = left.get(k);
    if (n) { out.add(rec); left.set(k, n - 1); }
  }
  return out;
}

// ---- the scene: the game's queue routines in double precision
// COMPUTE_COARSE_VIEW_BOUNDS: a box of the world, in the records' units of 64, that the view can
// see into, from four samples of the view's direction (8 steps either way of the yaw and of the
// pitch); each sample's octant opens some sides of the box to the world's edge, and a side no
// sample opened is the player's own coordinate. An object outside the box is not queued.
// [x high, x low, y high, y low, z high, z low]; the eight cases, in the order of the game's table
// at $2A17
const CASES = [[0, 0x7F, 2, 0x3F, 4, 0x7F], [0, 0x7F, 3, 0, 4, 0x7F], [0, 0x7F, 2, 0x3F, 5, 0], [0, 0x7F, 3, 0, 5, 0],
  [1, 0, 2, 0x3F, 5, 0], [1, 0, 3, 0, 5, 0], [1, 0, 2, 0x3F, 4, 0x7F], [1, 0, 3, 0, 4, 0x7F]];
function coarse(pose) {
  const box = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  // the game's whole steps: its samples between two steps open the box as at the lower step
  const yaw = ((Math.floor(pose.yaw) % 72) + 72) % 72, pitch = ((Math.floor(pose.pitch) % 72) + 72) % 72;
  for (const [dy, dp] of [[-8, -8], [-8, 8], [8, -8], [8, 8]]) {
    const y = (yaw + dy + 72) % 72, p = (pitch + dp + 72) % 72;
    let x = y < 18 ? 1 : y < 36 ? 3 : y < 54 ? 5 : 7;
    if (p < 18) x++;
    else if (p < 54) { x += p < 36 ? 5 : 4; if (x >= 9) x -= 8; }
    const c = CASES[x - 1];
    for (let k = 0; k < 6; k += 2) box[c[k]] = c[k + 1];
  }
  [pose.x, pose.y, pose.z].forEach((v, k) => {
    const p = Math.floor(v / 64) & 255;
    if (box[2 * k] === 0xFF) box[2 * k] = p + 1;
    else if (box[2 * k + 1] === 0xFF) box[2 * k + 1] = p;
  });
  return box;
}
// TRAVERSE_OBJECT_LIST's test of an object against the box, in the game's byte arithmetic
function inBox(rec, box) {
  for (let k = 0; k < 3; k++) {
    const d = (rec[1 + k] - box[2 * k]) & 255;
    if (d && d < 128) return false;
    if (((rec[1 + k] + rec[4 + k]) - box[2 * k + 1]) & 0x80) return false;
  }
  return true;
}
// the side mask: for each axis, bit 2k when the player is below the object's low side, bit 2k + 1
// when beyond its high side (TRAVERSE_OBJECT_LIST)
function bounds(rec, pose) {
  const p = [pose.x, pose.y, pose.z], b = [];
  let mask = 0;
  for (let k = 0; k < 3; k++) {
    const lo = rec[1 + k] * 64 - p[k], hi = lo + rec[4 + k] * 64;
    b.push(lo, hi);
    if (lo > 0) mask |= 1 << (2 * k);
    if (hi < 0) mask |= 1 << (2 * k + 1);
  }
  return { b, mask };
}
// the corners of each orientation of a pyramid (QUEUE_PYRAMID_OBJECT's table, src/g-scene.js),
// each a corner's coordinate by its byte at $02 + 6n + 2c
function pyramidCorners(P, t, b, apex) {
  const T = P.PYRAMID_CORNERS, word = new Map();
  const zw = a => (a >= 0xA6 && a <= 0xAC ? apex[(a - 0xA6) >> 1] : word.get(a));
  const run = list => {
    for (const op of list) {
      if (typeof op === 'string') { run(T[op]); continue; }
      if (op[0] === 'w') { const v = b[op[1] >> 1]; for (const d of op[2]) word.set(d, v); }
      else if (op[0] === 's') { const v = b[op[1] >> 1]; for (const d of op[3]) word.set(d, v); for (const d of op[4]) word.set(d, v + zw(op[2])); }
      else { const v = zw(op[1]) + zw(op[2]); for (const d of op[3]) word.set(d, v); }
    }
  };
  run(T[t === 4 || t === 6 || t === 7 || t === 8 ? t : 'other']);
  const out = [];
  for (let n = 0; n < 8; n++) out.push([word.get(2 + 6 * n), word.get(4 + 6 * n), word.get(6 + 6 * n)]);
  return out;
}
// an object as the queue routine for its type makes it: its corners relative to the player (in the
// world's axes), its faces (vertex numbers and a colour, 0 hidden) and what its winding does
function shape(P, pic, rec, pose) {
  const type = rec[0] & 0x0F, { b, mask } = bounds(rec, pose), T = pic.topo;
  const nib = (i) => (i & 1 ? rec[9 + (i >> 1)] >> 4 : rec[9 + (i >> 1)] & 0x0F);
  if (type === 1) {
    const p0 = [b[0], b[2], b[4]], s = [rec[4] * 64, rec[5] * 64, rec[6] * 64];
    const c = (i, j, k) => [p0[0] + i * s[0], p0[1] + j * s[1], p0[2] + k * s[2]];
    const corners = [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0), c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)];
    const faces = T.cuboid.map((v, i) => ({ v, col: (mask >> i) & 1 ? nib(i) : 0 }));
    return { corners, faces, mode: 0, b };
  }
  if (type === 3) {
    const [x0, x1, y0, y1, z0, z1] = b;
    let corners, axis = 1;
    if (!rec[4]) corners = [[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]];
    else { corners = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1]]; axis = rec[5] ? 3 : 2; }
    const a = mask >> (2 * (axis - 1)), col = a & 1 ? rec[9] & 0x0F : rec[9] >> 4;
    return { corners, faces: [{ v: [0, 1, 2, 3], col }], mode: 0, b };
  }
  if (type < 10) {
    const apex = [12, 13, 14, 15].map(k => rec[k] * 64);
    let topo, n;
    if (rec[12] === rec[14]) { if (rec[13] === rec[15]) { topo = T.pyr5; n = 5; } else { topo = T.pyr6b; n = 6; } }
    else if (rec[13] === rec[15]) { topo = T.pyr6a; n = 6; } else { topo = T.pyr8; n = 8; }
    const corners = pyramidCorners(P, type, b, apex).slice(0, n);
    return { corners, faces: topo.map((v, i) => ({ v, col: nib(i) })), mode: 1, b };
  }
  const n = type - 8, corners = [], p = [pose.x, pose.y, pose.z];
  for (let i = 0; i < n; i++) corners.push([0, 1, 2].map(k => rec[10 + 3 * i + k] * 64 - p[k]));
  const v = Array.from({ length: n }, (_, i) => i);
  if (n === 2) return { corners, faces: [{ v, col: rec[9] & 0x0F }], mode: 0, b };
  return { corners, faces: [{ v, col: 1 }], mode: 2, wind: rec[9], b };
}
// The view matrix as BUILD_VIEW_PROJECTION_MATRIX makes it, in 64ths: the yaw's turn, then the
// pitch's, then each axis scaled ($2C7C: x by 40, y by 64, z by 32), the sines and cosines from
// the game's table ($123C, two bytes a step: sine, cosine) and each product rounded to a 64th as
// MULTIPLY_3X3_FIXED_MATRICES rounds it. The game's own matrix puts each corner where the game
// puts it; a turn the game rounds a little short stays a little short here.
const sb = v => (v << 24) >> 24;
const r64 = v => Math.floor(v / 64 + 0.5);
function gameMatrix(tab, yaw, pitch) {
  const sc = i => [sb(tab[2 * i]), sb(tab[2 * i + 1])];
  const mul = (B, A) => B.map(r => [0, 1, 2].map(j => r64(r[0] * A[0][j] + r[1] * A[1][j] + r[2] * A[2][j])));
  const [s, c] = sc(yaw);
  let A = [[c, 0, -s], [0, 64, 0], [s, 0, c]];
  if (!yaw) A = [[64, 0, 0], [0, 64, 0], [0, 0, 64]];
  if (pitch) { const [s2, c2] = sc(pitch); A = mul([[64, 0, 0], [0, c2, s2], [0, -s2, c2]], A); }
  return mul([[40, 0, 0], [0, 64, 0], [0, 0, 32]], A);
}
// the view matrix of a pose, as fractions: the game's own at whole steps, and between two steps
// each entry the same part of the way from one step's to the next's
function viewMatrix(pic, pose) {
  const y0 = Math.floor(pose.yaw), p0 = Math.floor(pose.pitch), fy = pose.yaw - y0, fp = pose.pitch - p0;
  const at = (y, p) => gameMatrix(pic.sines, ((y % 72) + 72) % 72, ((p % 72) + 72) % 72);
  const m00 = at(y0, p0), m10 = fy ? at(y0 + 1, p0) : m00, m01 = fp ? at(y0, p0 + 1) : m00, m11 = fy && fp ? at(y0 + 1, p0 + 1) : fy ? m10 : m01;
  return m00.map((r, i) => r.map((v, j) => ((1 - fy) * (1 - fp) * v + fy * (1 - fp) * m10[i][j] + (1 - fy) * fp * m01[i][j] + fy * fp * m11[i][j]) / 64));
}
const xf = (V, p) => [0, 1, 2].map(i => V[i][0] * p[0] + V[i][1] * p[1] + V[i][2] * p[2]);
// the view volume's planes, inside where the value is not negative, in the order the game cuts a
// face to them (CLIP_POLYGON_TO_VIEW_VOLUME, plane 5 down to 1): z, z - y, z - x, y + z, x + z;
// each cut keeps the outline's order from its first corner, so a cut face starts where the game's
// does
const PLANES = [p => p[2], p => p[2] - p[1], p => p[2] - p[0], p => p[1] + p[2], p => p[0] + p[2]];
function clip(poly) {
  for (const f of PLANES) {
    if (poly.length === 0) break;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    }
    poly = out;
  }
  return poly;
}
// x and y over z, times 60, about the centre at 60
const project = p => (p[2] > 0 ? [60 * p[0] / p[2] + 60, 60 * p[1] / p[2] + 60] : [60, 60]);
// CLASSIFY_PROJECTED_WINDING's carry, on the face's first three corners as the game projects them
// (PROJECT_VERTICES_PERSPECTIVE: 60 + the quotient, which drops the fraction toward the centre; 0
// or 119 outside): set when (x2 - x0)(y1 - y0) - (x1 - x0)(y2 - y0) is not negative, which is when
// the face turns its back to the eye, or when its first three corners fall in a line. A face that
// small, or that the clip leaves starting with two corners on one pixel, is left out as the game
// leaves it out
const gamePx = v => (v >= 120 ? 119 : v <= 0 ? 0 : 60 + Math.trunc(v - 60));
function winds(pts) {
  const [a, b, c] = pts.slice(0, 3).map(p => p.map(gamePx));
  return (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]) >= 0;
}
// The game's painter's comparison of two queued objects on their bounds (PAINTER_SORT_VISIBLE_ENTRIES):
// two bits for each axis on which they do not overlap; one of seven patterns keeps the order
const KEEP = [0x20, 0x08, 0x02, 0x28, 0x0A, 0x22, 0x2A];
function keeps(A, B) {
  let bits = 0;
  for (let k = 0; k < 6; k += 2) {
    bits = (bits << 2) & 255;
    const Amin = A[k], Amax = A[k + 1], Bmin = B[k], Bmax = B[k + 1];
    if (Amin - Bmax < 0 && Bmin - Amax < 0) continue;
    const sA = Amin < 0, sB = Bmin < 0, sBmax = Bmax < 0;
    if ((Amax < 0) !== sA) { bits |= 1; continue; }
    if (sB !== sBmax) { bits |= 2; continue; }
    if (sB !== sA) continue;
    const d = Bmin - Amin, neg = d ? d < 0 : Bmax - Amax < 0;
    bits |= neg === sBmax ? 1 : 2;
  }
  return KEEP.includes(bits);
}
// The painter's sort, as the game runs it on the objects in the order they were queued (the two
// lists in turn): every neighbouring pair compared each pass, swapped unless kept, until a pass
// swaps nothing or one fewer passes than objects have run. Its comparison is not a strict order,
// so the result depends on where it starts; started where the game starts, it ends where the
// game's ends
function sort(list) {
  for (let pass = list.length - 1; pass > 0; pass--) {
    let swapped = false;
    for (let i = 0; i + 1 < list.length; i++) {
      if (keeps(list[i].b, list[i + 1].b)) continue;
      const t = list[i]; list[i] = list[i + 1]; list[i + 1] = t;
      swapped = true;
    }
    if (!swapped) break;
  }
  return list;
}
// The scene of a picture from a pose (its own, or another): for each object the game would
// queue (of those it drew, when the picture says), its faces clipped and projected, in the
// painter's order; and the background
function scene(P, pic, pose) {
  const own = !pose;
  pose = pose || pic.pose;
  const V = viewMatrix(pic, pose), queued = [], box = pic.free ? null : coarse(pose);
  for (const rec of pic.objects) {
    const type = rec[0] & 0x0F;
    if (!type || (rec[0] & 0x40) || type === 2) continue;
    if (pic.drawn && !pic.drawn.has(rec)) continue;
    if (box && !inBox(rec, box)) continue;
    const s = shape(P, pic, rec, pose);
    const cam = s.corners.map(c => xf(V, c));
    // dropped when every corner is outside one plane
    if (PLANES.some(f => cam.every(p => f(p) < 0))) continue;
    const faces = [];
    for (const f of s.faces) {
      if (!f.col && s.mode !== 2) continue;
      const poly = clip(f.v.map(i => cam[i]));
      if (poly.length < 2) continue;
      const pts = poly.map(project);
      let col = f.col;
      // the winding: mode 1 leaves out a face that turns away, mode 2 colours it by its side
      if (s.mode === 1 && (pts.length < 3 || winds(pts))) continue;
      if (s.mode === 2 && pts.length > 2) {
        col = winds(pts) ? s.wind >> 4 : s.wind & 0x0F;
        if (!col) continue;
      }
      faces.push({ col, pts, z: poly.map(p => p[2]) });
    }
    // an object the game drew stays in the sort, faces or none, so that the others keep its order
    if (faces.length || (pic.drawn && pic.drawn.has(rec))) queued.push({ id: rec[7], b: s.b, faces });
  }
  // the background from the draw's own angles at the picture's place, or the pose's
  const bg = own ? pic.bg : pose;
  return { pic, pose, objects: sort(queued), s: horizon(bg.pitch), yaw: bg.yaw };
}

// ---- the sky and the floor (DRAW_SKY_FLOOR_BACKGROUND). In the buffer's rows (0 at the bottom of
// the view, 119 at the top) the floor's colour (the high nibble of $2464) fills the rows below row
// s = 64 + 11 x the pitch (taken either way of level), the next 18 rows are the Wilderness's
// scenery or the sky's colour, and the sky's colour (the low nibble) the rest; the pitch's own
// limits (more than 5 steps up or down fills the view with one) come out of s
function horizon(pitch) {
  let p = pitch;
  if (p >= 36) p -= 72;
  return 64 + 11 * p;
}
// the rows of each part, for a whole s: floor rows (from 0), scenery rows (above them, its first
// `cut` rows off the top of the view) and sky rows; null where the area has no sky
function bands(pic, s) {
  if (!pic.sky) return null;
  const lo = pic.sky & 15, hi = pic.sky >> 4;
  if (!hi || s <= -18) return { floor: 0, strip: 0, cut: 0, sky: 120 };
  if (!lo || s >= 120) return { floor: 120, strip: 0, cut: 0, sky: 0 };
  const floor = Math.max(s, 0), top = Math.min(s + 18, 120);
  return { floor, strip: top - floor, cut: Math.max(s + 18 - 120, 0), sky: 120 - top };
}
// the lightning's streak, for a whole s: its rows (the top one first), the streak's first row and
// the buffer's byte it starts at (APPLY_LIGHTNING_STREAK_MASK); null where none is drawn
function streak(pic, s, b) {
  if (!pic.lightning || !b || !pic.sky || !(pic.sky & 15) || !(pic.sky >> 4) || s >= 120 || s <= -18) return null;
  const lo = s & 255, hi = (s >> 8) & 255, yy = (0x5F + lo) & 255, hi2 = (hi + ((0x5F + lo) >> 8)) & 255;
  if (hi2 & 0x80) return null;
  let n = yy, from = 0;
  if (yy >= 0x56) { n = 0x55; if (yy >= 0x79) { n = Math.max(0, 0x78 - b.floor - 0x0A); from = 0x55 - n; } }
  if (!n) return null;
  const bottom = b.floor + (b.strip >= 8 ? b.strip - 8 : 0);
  return { top: bottom + n - 1, rows: n, from, col: pic.clock % 27 };
}

// ---- the view in the C64's own pixels, as the game draws it into its buffer: 120 rows of 30
// bytes, row 0 the view's bottom, each byte four pixels from its low bits up, the projection's x
// mirrored (pixel 119 - x). The blit puts row 119 at the top of the screen and each row's bytes in
// the other order, so the screen shows the projection the right way round. A colour is four
// bytes of pattern from $9D06, a row taking byte 3 - (n & 3) of them for its count n
const pat = (pic, col) => pic.patterns.slice(((col - 1) & 15) * 4, ((col - 1) & 15) * 4 + 4);
function fill(buf, p, top, n) {
  for (let i = 0; i < n; i++) { const r = top - i; buf.fill(p[3 - ((n - i) & 3)], r * 30, r * 30 + 30); }
}
// the scenery: 18 rows of 16 bytes, 64 pixels a row repeating across the view, 8 pixels on for
// each step of yaw (FILL_LOWER_BACKGROUND_ROWS starts each row (yaw & 7) x 2 bytes in); between
// two steps a pixel on for each eighth of a step
function stripPixel(pic, row, c, yaw) {
  const t = (((Math.floor(8 * yaw + c) % 64) + 64) % 64);
  return (pic.strip[row * 16 + (t >> 2)] >> (6 - 2 * (t & 3))) & 3;
}
function paintBackground(buf, pic, s, yaw) {
  const b = bands(pic, s);
  if (!b) { buf.fill(0); return null; }
  const lo = pat(pic, pic.sky & 15), hi = pat(pic, pic.sky >> 4);
  fill(buf, lo, 119, b.sky);
  const top = 119 - b.sky;
  if (b.strip) {
    if (!pic.strip) fill(buf, lo, top, b.strip);
    else {
      for (let i = 0; i < b.strip; i++) {
        const r = top - i;
        buf.fill(0, r * 30, r * 30 + 30);
        for (let c = 0; c < 120; c++) { const x = 119 - c; buf[r * 30 + (x >> 2)] |= stripPixel(pic, b.cut + i, c, yaw) << ((x & 3) << 1); }
      }
    }
  }
  const k = streak(pic, s, b);
  if (k) for (let i = 0; i < k.rows; i++) {
    const r = k.top - i, x = (k.from + i) * 3;
    for (let c = 0; c < 3; c++) buf[r * 30 + k.col + 2 - c] |= pic.streak[x + c];
  }
  fill(buf, hi, b.floor - 1, b.floor);
  return b;
}
// one pixel of a face's colour in row r and buffer pixel x
function plot(buf, p, r, x) {
  const a = r * 30 + (x >> 2), sh = (x & 3) << 1;
  buf[a] = (buf[a] & ~(3 << sh)) | (p[3 - (r & 3)] & (3 << sh));
}
// a face: its rows sampled at their middles, each covering every pixel the span between the
// face's edges there touches (the game's spans take both their ends)
function paintFace(buf, p, pts) {
  if (pts.length === 2) return paintLine(buf, p, pts[0], pts[1]);
  let y0 = Infinity, y1 = -Infinity;
  for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  for (let r = Math.max(0, Math.floor(y0)); r <= Math.min(119, Math.floor(y1)); r++) {
    const yc = Math.min(Math.max(r + 0.5, y0), y1);
    let xl = Infinity, xr = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] >= yc) || (b[1] <= yc && a[1] >= yc)) {
        const x = a[1] === b[1] ? [a[0], b[0]] : [a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])];
        for (const v of x) { xl = Math.min(xl, v); xr = Math.max(xr, v); }
      }
    }
    if (xl > xr) continue;
    const c0 = Math.max(0, Math.floor(xl)), c1 = Math.min(119, Math.ceil(xr) - 1);
    for (let c = c0; c <= Math.max(c0, c1); c++) plot(buf, p, r, 119 - c);
  }
}
function paintLine(buf, p, a, b) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let i = 0; i <= n; i++) {
    const x = Math.min(119, Math.max(0, Math.floor(a[0] + (b[0] - a[0]) * i / n)));
    const r = Math.min(119, Math.max(0, Math.floor(a[1] + (b[1] - a[1]) * i / n)));
    plot(buf, p, r, 119 - x);
  }
}
// the centre's small cross, XORed in (XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT)
const RETICLE = [[57, 15, 0x01], [58, 15, 0x01], [59, 15, 0x01], [60, 15, 0x14], [60, 14, 0x50], [61, 15, 0x01], [62, 15, 0x01], [63, 15, 0x01]];
// The whole view, as the buffer's 3,600 bytes
function paintBuffer(sc, buf) {
  buf = buf || new Uint8Array(3600);
  const pic = sc.pic;
  paintBackground(buf, pic, Math.round(sc.s), sc.yaw);
  for (const o of sc.objects) for (const f of o.faces) paintFace(buf, pat(pic, f.col), f.pts);
  if (pic.reticle) for (const [r, b, v] of RETICLE) buf[r * 30 + b] ^= v;
  return buf;
}

// ---- watching the port
// the view's place in the frame renderFrame draws (384 by 272): its 120 pixels across (each two of
// the frame's wide) from x 72, its 120 rows from y 67 (character rows 4-18, columns 5-34)
const VX = 72, VY = 67, MID = VY + 16 + 60;
// the view's bitmap, the 15 character rows of 30 cells the blit writes from ($1237)
function viewBytes(M, at) {
  const out = new Uint8Array(3600);
  for (let r = 0; r < 15; r++) out.set(M.subarray(at + r * 320, at + r * 320 + 240), r * 240);
  return out;
}
function wrap(P, name, before, after) {
  const f = P[name];
  if (typeof f !== 'function') return;
  const gen = f.constructor && f.constructor.name === 'GeneratorFunction';
  P[name] = gen ? function* (r) { if (before) before(r); const v = yield* f.call(this, r); if (after) after(r, v); return v; }
    : function (r) { if (before) before(r); const v = f.call(this, r); if (after) after(r, v); return v; };
}
// Each pass that draws the view is kept as a picture: what the drawing works from, read as it
// starts, and the clock when the pass began (its rebuild of the scene, where the place and the
// angles are read) and when the blit put the picture on the screen, with the bitmap it left. A
// view cleared before its blit (a fall, a crush, a menu) is no picture.
function attach(rt) {
  const P = rt.P;
  if (!P) return null;
  const was = P.__cmModern;
  if (was) {
    // a machine restored to another moment: what was kept belongs to another run
    const last = was.flips[was.flips.length - 1];
    if (last && last.t > rt.t) { was.flips = []; was.pending = null; was.start = null; was.built = null; }
    return was;
  }
  const M = P.M;
  const st = { rt, P, flips: [], pending: null, start: null, built: null, n: 0 };
  P.__cmModern = st;
  wrap(P, 'COMPUTE_COARSE_VIEW_BOUNDS', () => { st.start = rt.t; });
  wrap(P, 'PAINTER_SORT_VISIBLE_ENTRIES', null, () => { st.built = world(M, P); });
  wrap(P, 'DRAW_SORTED_VISIBLE_QUEUE', () => {
    const pic = capture(M, P, st.built);
    pic.t0 = st.start !== null ? st.start : rt.t;
    st.start = null;
    st.pending = pic;
  });
  wrap(P, 'CLEAR_LINEAR_30BYTE_ROWS', () => { st.pending = null; });
  // the streak as the game draws it: at the column it picks ($4B8F)
  wrap(P, 'APPLY_LIGHTNING_STREAK_MASK', null, () => { if (st.pending) { st.pending.lightning = true; st.pending.clock = M[0x4B8F]; } });
  // each copy to the view's bitmap: the buffer's 3D view (the frame's own copy, and the viewport
  // opened on it), or anything else (a menu or a message copied as it stands, a step of the
  // viewport's opening or closing, the viewport closed)
  const flip = pic => {
    const at = w16(M, 0x1237);
    st.flips.push({ pic, t: rt.t, n: ++st.n, snap: viewBytes(M, at), at });
    if (st.flips.length > 24) st.flips.shift();
  };
  wrap(P, 'BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP', null, () => flip(st.pending));
  wrap(P, 'BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP', null, () => flip(null));
  wrap(P, 'APPLY_VERTICAL_BITMAP_TRANSITION_STEP', null, () => flip(null));
  wrap(P, 'RUN_VIEWPORT_TRANSITION', null, r => flip(r.c ? st.pending : null));
  return st;
}
// the last copy to the view's bitmap, for Fast CPU: the game's own state at the copy says what is on
// show, with no look at the screen's bytes
function latest(st) {
  return st && st.flips.length ? st.flips[st.flips.length - 1] : null;
}
// what the page draws over the screen with Fast CPU: the last copy's 3D view, rendered from the draw
// list the game drew it from at the angles the game stood at, {scene, shown}; null when those are
// the game's own angles (the screen is then the game's frame; with always, the view all the same)
// or the copy put anything but the 3D view there
function between(st, P, always) {
  const f = latest(st);
  if (!f || !f.pic) return null;
  const p = f.pic.pose, b = f.pic.bg, whole = v => v === Math.floor(v);
  if (!always && whole(p.yaw) && whole(p.pitch) && whole(b.yaw) && whole(b.pitch)) return null;
  return { scene: f.scene || (f.scene = scene(P, f.pic)), shown: f };
}

// ---- what is on show
// The picture on show in frame F: the last put on the screen before the middle of the view, still
// there: blitted during the frame, or its bitmap unchanged since (the viewport's opening, a menu
// or a message changes it)
function onShow(st, F) {
  if (!st || !F || !F.mem) return null;
  const start = F.frame * FRAME, mid = start + MID * LINE;
  for (let i = st.flips.length - 1; i >= 0; i--) {
    const f = st.flips[i];
    if (f.t > mid) continue;
    if (!f.pic) return null;
    if (f.t >= start) return f;
    const now = viewBytes(F.mem, f.at), was = f.snap;
    for (let k = 0; k < 3600; k++) if (now[k] !== was[k]) return null;
    return f;
  }
  return null;
}

// ---- colours. A pixel's two bits are the background ($D021), its cell's high nibble or low
// nibble, or its colour RAM; the view's cells all hold the same, read from the frame on show
function colours(F) {
  const cell = 11 * 40 + 20;
  return [F.vic[0x21] & 15, F.mem[0xC400 + cell] >> 4, F.mem[0xC400 + cell] & 15, F.colourMem[cell] & 15];
}
const SRGB = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toS = v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const blendCache = new Map();
// the colour the eye sees of a pattern: its 16 pixels' light averaged
function blend(p, cols) {
  const key = p.join(',') + '/' + cols.join(',');
  let v = blendCache.get(key);
  if (v) return v;
  const pal = (root.C64 && root.C64.PAL) || [];
  const acc = [0, 0, 0];
  for (const b of p) for (let k = 0; k < 4; k++) {
    const rgb = SRGB(pal[cols[(b >> (2 * k)) & 3]] || '#000000');
    for (let j = 0; j < 3; j++) acc[j] += toLin(rgb[j]);
  }
  v = 'rgb(' + acc.map(x => toS(x / 16)).join(',') + ')';
  if (blendCache.size > 500) blendCache.clear();
  blendCache.set(key, v);
  return v;
}
// the sprites over the view: the frame's pixels inside each sprite's box that differ from the
// view's bitmap as the frame began (the game's sight and pointer are sprites)
function spritePixels(F, px) {
  const out = [], on = F.vic[0x15];
  if (!on || !px) return out;
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    if (!(on >> i & 1)) continue;
    const x = F.vic[2 * i] | ((F.vic[0x10] >> i) & 1) << 8, y = F.vic[2 * i + 1];
    const w = 24 << ((F.vic[0x1D] >> i) & 1), h = 21 << ((F.vic[0x17] >> i) & 1);
    const x0 = Math.max(VX, x + 8), x1 = Math.min(VX + 240, x + 8 + w), y0 = Math.max(VY, y - 16), y1 = Math.min(VY + 120, y - 15 + h);
    for (let fy = y0; fy < y1; fy++) for (let fx = x0; fx < x1; fx++) {
      const o = fy * 384 + fx;
      if (seen.has(o)) continue;
      const l = fy - VY, c = (fx - VX) >> 1, cr = 4 + (l >> 3), cc = 5 + (c >> 2), cell = cr * 40 + cc;
      const v = (F.mem[0xE000 + cr * 320 + cc * 8 + (l & 7)] >> (6 - 2 * (c & 3))) & 3;
      const k = v === 0 ? F.vic[0x21] & 15 : v === 1 ? F.mem[0xC400 + cell] >> 4 : v === 2 ? F.mem[0xC400 + cell] & 15 : F.colourMem[cell] & 15;
      if (px[o] !== k) { seen.add(o); out.push(o); }
    }
  }
  return out;
}
// the two bits of the view at (x, y) in the projection's coordinates, as the C64 would paint
// them: the last face over the point, or the sky and the floor
function valueAt(sc, x, y) {
  const pic = sc.pic, r = Math.floor(y), bx = 119 - Math.floor(x), sh = (bx & 3) << 1;
  for (let i = sc.objects.length - 1; i >= 0; i--) {
    const fs = sc.objects[i].faces;
    for (let j = fs.length - 1; j >= 0; j--) if (inside(fs[j].pts, x, y)) return (pat(pic, fs[j].col)[3 - (r & 3)] >> sh) & 3;
  }
  const buf = new Uint8Array(3600);
  paintBackground(buf, pic, Math.round(sc.s), sc.yaw);
  return (buf[r * 30 + (bx >> 2)] >> sh) & 3;
}
function inside(pts, x, y) {
  if (pts.length < 3) return false;
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

// ---- drawing on a canvas, at the screen's own resolution
// the scenery strip as a picture, 64 pixels by 18 rows in the frame's colours
const strips = new WeakMap();
function stripImage(pic, cols) {
  const key = cols.join(','), was = strips.get(pic.strip);
  if (was && was.key === key) return was.cv;
  const cv = root.document.createElement('canvas');
  cv.width = 128; cv.height = 18;
  const g = cv.getContext('2d'), img = g.createImageData(128, 18), pal = root.C64.PAL;
  for (let r = 0; r < 18; r++) for (let t = 0; t < 64; t++) {
    const rgb = SRGB(pal[cols[(pic.strip[r * 16 + (t >> 2)] >> (6 - 2 * (t & 3))) & 3]]);
    for (const dx of [0, 1]) { const o = (r * 128 + 2 * t + dx) * 4; img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  strips.set(pic.strip, { key, cv });
  return cv;
}
// Draws the faithful frame (a canvas of 384 by 272) scaled to cv's pixels, and the view over it
// from view (a scene); the sprites over the view stay on top.
// F is the frame on show, px its pixels
function draw(cv, faithful, view, F, px) {
  const dpr = root.devicePixelRatio || 1, css = cv.getBoundingClientRect();
  const W = Math.max(768, Math.round(css.width * dpr)), H = Math.round(W * 272 / 384);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.classList.add('pl-native'); }
  const g = cv.getContext('2d'), k = W / 384;
  g.imageSmoothingEnabled = false;
  g.drawImage(faithful, 0, 0, W, H);
  if (!view || !F) return;
  const sc = view.scene, pic = sc.pic, cols = colours(F);
  const X = x => (VX + 2 * x) * k, Y = y => (VY + 120 - y) * k;
  g.save();
  g.beginPath(); g.rect(VX * k, VY * k, 240 * k, 120 * k); g.clip();
  const b = bands(pic, sc.s), pal = root.C64.PAL;
  if (!b) { g.fillStyle = pal[cols[0]]; g.fillRect(VX * k, VY * k, 240 * k, 120 * k); }
  else {
    const lo = blend(pat(pic, pic.sky & 15), cols), hi = blend(pat(pic, pic.sky >> 4), cols);
    const top = b.floor + b.strip;
    if (b.sky) { g.fillStyle = lo; g.fillRect(VX * k, VY * k, 240 * k, (120 - top) * k + 1); }
    if (b.floor) { g.fillStyle = hi; g.fillRect(VX * k, Y(b.floor) - 1, 240 * k, b.floor * k + 1); }
    if (b.strip) {
      if (!pic.strip) { g.fillStyle = lo; g.fillRect(VX * k, Y(top), 240 * k, b.strip * k); }
      else {
        g.save();
        g.beginPath(); g.rect(VX * k, Y(top), 240 * k, b.strip * k); g.clip();
        const img = stripImage(pic, cols), shift = ((8 * sc.yaw) % 64 + 64) % 64;
        for (let n = 0; n < 3; n++) g.drawImage(img, X(n * 64 - shift), Y(sc.s + 18), 128 * k, 18 * k);
        g.restore();
      }
    }
    // the lightning's streak, in the C64's pixels, as the game ORs it into the sky
    const sw = Math.round(sc.s), bw = bands(pic, sw), kk = streak(pic, sw, bw);
    if (kk) {
      const buf = new Uint8Array(3600);
      paintBackground(buf, pic, sw, sc.yaw);
      for (let i = 0; i < kk.rows; i++) {
        const r = kk.top - i;
        for (let j = 0; j < 3; j++) {
          const m = pic.streak[(kk.from + i) * 3 + j], byte = kk.col + 2 - j;
          for (let q = 0; q < 4; q++) {
            if (!((m >> (2 * q)) & 3)) continue;
            const x = byte * 4 + q;
            g.fillStyle = pal[cols[(buf[r * 30 + byte] >> (2 * q)) & 3]];
            g.fillRect(X(119 - x), Y(r + 1), 2 * k, k);
          }
        }
      }
    }
  }
  g.lineJoin = 'round';
  for (const o of sc.objects) for (const f of o.faces) {
    const fill = blend(pat(pic, f.col), cols);
    g.beginPath();
    f.pts.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))));
    if (f.pts.length > 2) { g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = Math.max(1, k * 0.35); g.stroke(); }
    else { g.strokeStyle = fill; g.lineWidth = 1.5 * k; g.stroke(); }
  }
  // the centre's cross: each of its pixels the colour the C64's XOR would make there
  if (pic.reticle) for (const [r, by, m] of RETICLE) for (let q = 0; q < 4; q++) {
    if (!((m >> (2 * q)) & 3)) continue;
    const x = 119 - (by * 4 + q);
    g.fillStyle = pal[cols[valueAt(sc, x + 0.5, r + 0.5) ^ ((m >> (2 * q)) & 3)]];
    g.fillRect(X(x), Y(r + 1), 2 * k, k);
  }
  g.restore();
  // the sprites over the view, as the frame shows them
  for (const o of spritePixels(F, px)) { g.fillStyle = pal[px[o]]; g.fillRect((o % 384) * k, Math.floor(o / 384) * k, k, k); }
}

// ---- the view in the C64's own pixels, painted as the game would paint the pose (Fast CPU's
// fractional angles), into px, the frame of palette indices on show, the sprites over the view
// left as they are; a still view is the frame's own, and is left as it is (false)
function paint(px, view, F) {
  if (!view || !F || view.still) return false;
  const buf = paintBuffer(view.scene), cols = colours(F), keep = new Set(spritePixels(F, px));
  for (let l = 0; l < 120; l++) {
    const r = 119 - l, o = (VY + l) * 384 + VX;
    for (let c = 0; c < 120; c++) {
      const x = 119 - c, v = cols[(buf[r * 30 + (x >> 2)] >> ((x & 3) << 1)) & 3];
      if (!keep.has(o + 2 * c)) px[o + 2 * c] = v;
      if (!keep.has(o + 2 * c + 1)) px[o + 2 * c + 1] = v;
    }
  }
  return true;
}

root.CMModern = { attach, onShow, latest, between, scene, draw, paint, paintBuffer, capture, spritePixels, bands, streak, sort, viewMatrix,
  gameMatrix, coarse, clip, project, winds, keeps, FRAME, LINE, VIEW_RECT: { x: VX, y: VY, w: 240, h: 120 } };
})(typeof window !== 'undefined' ? window : globalThis);
