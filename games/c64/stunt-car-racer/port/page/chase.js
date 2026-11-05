// The Play page's 3D view of the race from outside the car, for its mods (Chase cam, Heli cam):
// the track, the player's car and the opponent's drawn again from a camera the page places, in the
// game's own colours and in its fat pixels, over the part of the screen above the dashboard. The
// game is not changed: its memory is only read, and the routines below are run on a scratch copy
// of it.
//
// The track. Its pieces are the game's own (BUILD_TRACK left them at $0400-$0773): each piece's
// points worked out by the game's routines (PIECE_LOAD, PIECE_ORIGIN, PIECE_POINTS,
// PIECE_POINT_IN_VIEW) on a scratch machine, with the view put at the map's corner, facing along
// the squares, so that they come out in the map's own units: a square is $800 across and along,
// and a height is the game's (the road on the flat at $500, the ground at $200). The points are in
// pairs, the road's left and right edges. Between two pairs the road is a solid block down to the
// ground, its edges drawn in lines of the colour the game gives them (POINTS_TO_LINES: white and
// black by turns, the far road all black), a line across where the game draws one (the start
// line, each piece's end) and lines down to the ground where its side shows, as the game draws
// them (TO_COPY).
//
// The cars. The opponent's car is drawn by the game from its four corners (OPP_CORNERS,
// DRAW_OPPONENT): a box on four wheels, the wheels boxes a quarter of the car's width across and
// tall, the body a wedge, tall at the back (a quarter of the width above the wheels' tops and an
// eighth below) and low at the front (from the wheels' tops down an eighth), half the width across
// and three eighths at the back's top. The car is 81 across ($C34D, $1B, times 1.5 each way) and
// half as long again. The opponent's corners are read as DRAW_VIEW leaves them, its wheels'
// heights from OPP_WHEELS; the player's car is the same shape, placed by its position, its
// heading and the heights of its three points (CAR_POINT_HEIGHTS, from the pitch and the roll):
// points 0 and 1 the front wheels, left and right, and point 2 the middle of the back. The crane's
// chains hang to all four wheels.
//
// The dust. The game throws specks up over its view while a wheel is over the road's edge (DUST,
// $2C6F) and, while the car is wrecked, a cloud of dust: puffs drawn as a few lines joined end to
// end over the ground's colour (DUST_WRECKED, DEBRIS). Both are drawn on the screen, not in the
// track. These views put a speck where the game's driver sees it, a car length ahead of the eye
// (just past the car's nose, where the higher ones clear its roof from behind), white and a fat
// pixel by two lines as the game draws it. The game's cloud covers the
// view from the horizon down, so here it is put round the car: each puff a car length from the
// car's middle, as far round from its nose as its column is from the view's middle (the view's
// edges a quarter turn, so its width is half the way round), as high over the car's wheels as it is
// over the lowest line a puff is drawn on ($B7) in the game's picture, in the game's shape at the
// same scale (a line half a fat pixel, as the game's screen has them), turned to face the camera.
//
// The picture. The game's lens is a cylinder: a point's place across is its bearing, 256 fat
// pixels to a quarter turn (PROJECT_X), and its place up its height over its distance along the
// ground, 83.4 lines for a unit of height at a distance of one (PROJECT_Y). On the page's square
// pixels a unit of height is then 0.256 of a unit across, and this view draws heights so. Its lens
// is flat, with the game's scale at the middle times CHASE.zoom; or the game's own, for a check.
// Each face is filled with the ground's colour into a depth buffer, then each line drawn where
// nothing nearer covers it, and the crane's chains while the game draws them.
//
//   const v = SCRChase.attach(rt, make)    make() gives a scratch machine (SCRPage.create); v.seen
//                                          is { s, frame }, the race as DRAW_VIEW last drew it
//   const v = SCRChase.create(make)        the same, not attached
//   SCRChase.snap(v, M)                    the race as the game just drew it (after DRAW_VIEW)
//   SCRChase.draw(v, s, cam, px)           snapshot s from camera cam into px (384 by 272, the
//                                          frame's palette indices)
//   SCRChase.chase(v, s, prev, frame)      the camera behind and above the car at the C64's frame
//                                          number, following prev (the last camera's state)
//   SCRChase.heli(v, s, prev, frame)       Heli cam: the helicopter's camera at the C64's frame
//                                          number, following prev; the same arguments as chase
//   SCRChase.hidden(v, s, a, b)            whether the track stands between points a and b
//   SCRChase.roadAt(v, s, x, z)            the road's height there, -Infinity off the track
(function (root) {
'use strict';
// the game's lens: 256 fat pixels across to a quarter turn of bearing (PROJECT_X), and 83.4 lines
// up for a unit of height's ratio to the distance (PROJECT_Y, fitted over the points of 87 views)
const FX = 512 / Math.PI, KY = 83.4;
const FY = 2 * FX;                       // lines up for a unit across: the page's pixels are square, a fat pixel two lines wide
const HS = KY / FY;                      // a unit of height in units across, as the game draws it on the page
const GROUND = 0x200;                    // the ground's height
const CAR_W = 81, CAR_L = 121.5;         // the cars' width and length
const VIEW = { x: 32, y: 35, w: 160, h: 161 };   // the view in the frame's pixels: x and y, its width in fat pixels and its height in lines
const CHAIN_X = 3 * CAR_W / 8, CHAIN_Z = CAR_L / 2;   // the chains: over the wheels
const SKY = 14, FILL = 8, BLACK = 0, WHITE = 1;
const SPECK_D = 128;                     // how far ahead of the eye a speck is put
const PUFF_R = CAR_L, PUFF_K = Math.PI * PUFF_R / VIEW.w;   // a puff of a wreck's dust: how far from the car, and a fat pixel's size
const NEAR = 4;

// ---- vectors
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const s16 = v => (v << 16) >> 16, s24 = v => (v << 8) >> 8;

// ---- the track, by the game's routines on the scratch machine
function track(S, P, M) {
  S.set(M);
  const ind = (z, y) => S[((S[z] | S[z + 1] << 8) + y) & 0xFFFF];
  const pieces = [];
  for (let i = 0; i < S[0xC764]; i++) {
    S[0x5C] = 0; S[0x5E] = 0; S[0xCF] = 0; S[0xD1] = 0; S[0x92] = 0; S[0x94] = 0; S[0x68] = 0;
    S[0x2E] = i;
    P.PIECE_LOAD({ x: i }); P.PIECE_ORIGIN({ x: i });
    S[0x3D] = (S[0x68] - S[0x1D]) & 255;
    S[0xD0] = 0; S[0xD3] = 0; S[0x27] = 0;
    S.fill(0x80, 0x8080, 0x80A0);
    P.PIECE_POINTS({});
    const n = S[0x9E], base = (ind(0x9A, 0) + 7) & 255, fwd = !S[0xA4], d = S[0xD8] >> 1;
    const pt = x => {
      P.PIECE_POINT_IN_VIEW({ x, y: fwd ? (base + 4 * x) & 255 : (base + 4 * (n - 1) - 4 * x) & 255 });
      return [S[0x77] << 8 | S[0x51], s16(S[0xA330 + x] << 8 | S[0x8040 + x]) * HS, S[0x78] << 8 | S[0x52]];
    };
    const pairs = [];
    for (let j = 0; 2 * j + 1 < n; j++) {
      const mark = S[0x8080 + 2 * j];
      pairs.push({ L: pt(2 * j), R: pt(2 * j + 1), cross: mark & 0x80 ? -1 : mark & 3, colour: (j ^ d) & 1 ? WHITE : BLACK });
    }
    pieces.push(pairs);
  }
  return pieces;
}
// the key the track is kept by: the bytes BUILD_TRACK leaves, and the points of the shape the
// Draw Bridge's ends are (shape $5F, which DRAWBRIDGE rewrites as they rise and fall)
function trackKey(M) {
  let h = M[0xC764] * 31 + M[0xC766];
  for (let a = 0x0400; a < 0x0774; a++) h = (h * 31 + M[a]) | 0;
  const b = M[0xB120 + 0xBE] | M[0xB121 + 0xBE] << 8;
  for (let a = 0; a < 0x48; a++) h = (h * 31 + M[(b + a) & 0xFFFF]) | 0;
  return h;
}

function create(make) {
  const sc = make();
  return { sc, key: null, pieces: null, seen: null, puff: puffTables(sc.M), blocks: null };
}

// the page's hook: each time the game's DRAW_VIEW finishes, a snapshot of the race as it drew it,
// with the C64's frame number, in v.seen; the specks and puffs DUST_PLOT draws in the pass (in
// DRAW_VIEW for a wreck's, after it for the specks) added to that snapshot as they are drawn. The
// game's memory is only read.
function attach(rt, make) {
  const v = create(make), drawView = rt.P.DRAW_VIEW, plot = rt.P.DUST_PLOT, M = rt.M;
  let plots = [];
  rt.P.DRAW_VIEW = r => {
    plots = [];
    const q = drawView(r);
    v.seen = { s: snap(v, M), frame: rt.frame };
    v.seen.s.dust = plots;
    return q;
  };
  rt.P.DUST_PLOT = r => {
    const x = r.x & 255, row = M[0xC260 + x], col = M[0x80A0 + x], q = plot(r);
    if (q.z) plots.push(M[0x6B] & 0x80 ? { puff: x, row, col } : { row, col });
    return q;
  };
  return v;
}

// ---- a snapshot of the race as the game just drew it
function snap(v, M) {
  const key = trackKey(M);
  if (key !== v.key) { v.pieces = track(v.sc.M, v.sc.P, M); v.key = key; }
  const S = v.sc.M, P = v.sc.P;
  // the player's car: its place, its heading and its three points' heights (CAR_POINT_HEIGHTS):
  // the front wheels' (points 0 and 1, left and right) and the back's (point 2)
  const pos = [0, 1, 2].map(x => s24(M[0x0106 + x] << 16 | M[0x0103 + x] << 8 | M[0x0100 + x]));
  for (const a of [0x0101, 0x0104, 0x0107, 0x0121, 0x0124, 0x0123, 0x0126]) S[a] = M[a];
  P.CAR_POINT_HEIGHTS({});
  // each point's wheel on the road under it (WHEEL_ROAD_HEIGHT, $C340) when its spring is pressed
  const ht = x => Math.max(s24(S[0xC3D1 + x] << 16 | S[0xC349 + x] << 8 | S[0xC346 + x]) / 8 + 0x28,
    s24(M[0xC3CE + x] << 16 | M[0xC343 + x] << 8 | M[0xC340 + x]) / 8);
  const car = { x: pos[0] / 16, z: pos[2] / 16, heading: s16(M[0x0125] << 8 | M[0x0122]) / 65536 * 2 * Math.PI,
    front: [ht(0), ht(1)], back: ht(2), steer: M[0xC5] === 0xF1 ? -1 : M[0xC5] === 0x0F ? 1 : 0 };
  // the opponent's: its corners from the view's place and quarter, and its points' heights, each
  // pass in a league race (OPP_CORNERS works them out wherever it is; the game draws the car only
  // when it is ahead, OPP_DRAW_HERE, $E195, and these views draw it behind too)
  let opp = null;
  if (M[0xC76C] & 0x80) {
    const q = M[0x68], ex = (pos[0] >> 4), ez = (pos[2] >> 4);
    const corner = k => {
      const lat = s16(M[0xC510 + k] << 8 | M[0xC500 + k]), dep = s16(M[0xC530 + k] << 8 | M[0xC520 + k]);
      const d = q === 0x00 ? [lat, dep] : q === 0x40 ? [dep, -lat] : q === 0x80 ? [-lat, -dep] : [-dep, lat];
      return [ex + d[0], ez + d[1]];
    };
    // a corner's wheel: its point less $50 (OPP_WHEELS), on the road under the wheel ($07EC) when
    // lower; wheels 0 and 1 are at the back, 2 at the front ($238A)
    const h = (k, w) => Math.max(s16(M[0xA330 + k] << 8 | M[0x8040 + k]) - 0x50, s16(M[0x07F0 + w] << 8 | M[0x07EC + w]));
    // ahead: whether it is ahead of the player round the track ($C36A); shown: whether the game
    // draws it, ahead and 10 or more apart
    opp = { corners: [5, 7, 8, 10].map(corner), heights: [h(0x3C, 0), h(0x3E, 1), h(0x3D, 2), h(0x3F, 2)],
      ahead: !(M[0xC36A] & 0x80), shown: !(M[0xC36A] & 0x80) && (M[0x3A] > 0 || M[0x39] >= 0x0A) };
  }
  // the crane's chains, as CRANE_CHAINS will draw them later in this pass: from row $C36B up while
  // the count $2F runs; once it is 0 their ends rise by $C36C a pass, and at row $5F they are gone
  const chain = M[0x2F] ? M[0xC36B] : M[0xC36B] === 0x5F ? null : (M[0xC36B] - M[0xC36C]) & 0xFF;
  // the eye the game drew from, for the dust: its place and height ($37/$38), its heading, and the
  // horizon's line in the view (from $33/$69, which the pitch moves)
  const eye = { x: pos[0] / 16, y: s16(M[0x38] << 8 | M[0x37]) * HS, z: pos[2] / 16, heading: car.heading,
    hz: 208 - s16(M[0x69] << 8 | M[0x33]) };
  return { car, opp, piece: M[0xC374], seg: M[0xC3], chain, pieces: v.pieces, eye, dust: [] };
}

// ---- a car: the model in its own frame (across, up, along), placed by its frame
// the wheels' boxes and the body's wedge, each a list of faces and of edges with their colours
function carModel(steer) {
  const w = CAR_W, l = CAR_L, q = w / 4;
  const box = (cx, cz, sx, sy, sz, turn) => {
    const c = Math.cos(turn), s = Math.sin(turn);
    const p = (u, y, t) => [cx + u * c + t * s, y, cz - u * s + t * c];
    return [p(-sx, 0, -sz), p(sx, 0, -sz), p(sx, 0, sz), p(-sx, 0, sz), p(-sx, sy, -sz), p(sx, sy, -sz), p(sx, sy, sz), p(-sx, sy, sz)];
  };
  const solid = (v, colour) => ({
    faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map(f => f.map(i => v[i])),
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].map(e => [v[e[0]], v[e[1]], colour]),
  });
  const parts = [];
  const turn = steer * 0.3;
  for (const [cx, cz, t] of [[-3 * w / 8, -l / 2, 0], [3 * w / 8, -l / 2, 0], [-3 * w / 8, l / 2, turn], [3 * w / 8, l / 2, turn]])
    parts.push(solid(box(cx, cz, w / 8, q, w / 10, t), BLACK));
  // the body: the back from q/2 to 2q up, w/4 each way at its foot and 3w/16 at its top; the front
  // from q/2 to q up, w/4 each way
  const b = [[-w / 4, q / 2, -l / 2], [w / 4, q / 2, -l / 2], [w / 4, q / 2, l / 2], [-w / 4, q / 2, l / 2],
    [-3 * w / 16, 2 * q, -l / 2], [3 * w / 16, 2 * q, -l / 2], [w / 4, q, l / 2], [-w / 4, q, l / 2]];
  parts.push(solid(b, WHITE));
  return parts;
}
// a frame from four corners on the road (back left, back right, front left, front right)
function frameOf(bl, br, fl, fr) {
  const back = mul(add(bl, br), 0.5), front = mul(add(fl, fr), 0.5);
  const f = norm(sub(front, back));
  let r = norm(sub(add(br, fr), add(bl, fl)));
  const u = norm(cross(f, r));
  r = cross(u, f);
  return { o: mul(add(back, front), 0.5), r, u, f };
}
const place = (fr, p) => add(fr.o, add(mul(fr.r, p[0]), add(mul(fr.u, p[1]), mul(fr.f, p[2]))));

// the player's car's frame: its points ($0130-$013B, WHEEL_OFFSETS) 63.5 ahead and 31.75 to the
// left (point 0) and to the right (point 1), and 63.5 behind in the middle (point 2), their wheels
// $28 under the heights CAR_POINT_HEIGHTS gives them. So the car is tilted as the game tilts its
// own view: the roll that turns the picture is the one that lifts point 0 over point 1.
function playerFrame(c) {
  const f = [Math.sin(c.heading), 0, Math.cos(c.heading)], r = [Math.cos(c.heading), 0, -Math.sin(c.heading)];
  const at = (a, s, h) => [c.x + f[0] * a + r[0] * s, h * HS, c.z + f[2] * a + r[2] * s];
  const fl = at(63.5, -31.75, c.front[0]), fr = at(63.5, 31.75, c.front[1]), bm = at(-63.5, 0, c.back);
  return frameOf(add(bm, mul(r, -31.75)), add(bm, mul(r, 31.75)), fl, fr);
}
// the height of the player's car's middle, between its front wheels and its back
const carHeight = c => ((c.front[0] + c.front[1]) / 2 + c.back) / 2;
function oppFrame(o) {
  const p = k => [o.corners[k][0], o.heights[k] * HS, o.corners[k][1]];
  return frameOf(p(0), p(1), p(2), p(3));
}

// ---- drawing
function draw(v, s, cam, px) {
  const W = VIEW.w, H = VIEW.h, col = new Uint8Array(W * H), zb = new Float32Array(W * H);
  const cx = W / 2 + (cam.dx || 0), cy = cam.cy === undefined ? H / 2 : cam.cy;
  const FX = SCRChase.FX * (cam.zoom || 1), FY = SCRChase.FY * (cam.zoom || 1);
  const toCam = p => { const d = sub(p, cam.pos); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; };
  // the sky and the ground: each pixel's ray, and where it meets the ground
  const yg = GROUND * HS;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = (x + 0.5 - cx) / FX, b = (cy - y - 0.5) / FY;
    const dy = cam.f[1] + cam.r[1] * a + cam.u[1] * b;
    const i = y * W + x;
    if (dy < 0 && cam.pos[1] > yg) { col[i] = FILL; zb[i] = -dy / (cam.pos[1] - yg); } else { col[i] = SKY; zb[i] = 0; }
  }
  // a flat lens; or, with cam.lens 'game', the game's own: across by bearing, up by the height
  // over the distance along the ground (for a level camera, the picture the game draws)
  const project = cam.lens === 'game'
    ? c => { const r = Math.hypot(c[0], c[2]); return [cx + FX * Math.atan2(c[0], c[2]), cy - FY * c[1] / r, 1 / c[2]]; }
    : c => [cx + FX * c[0] / c[2], cy - FY * c[1] / c[2], 1 / c[2]];
  const clip = cs => {
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length];
      if (a[2] >= NEAR) out.push(a);
      if ((a[2] >= NEAR) !== (b[2] >= NEAR)) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    return out;
  };
  function face(vs, colour) {
    const cs = clip(vs.map(toCam));
    if (cs.length < 3) return;
    const ps = cs.map(project);
    let y0 = Infinity, y1 = -Infinity;
    for (const p of ps) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(H - 1, Math.floor(y1 - 0.5));
    for (let y = ya; y <= yb; y++) {
      const yc = y + 0.5;
      let xl = Infinity, xr = -Infinity, wl = 0, wr = 0;
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i], b = ps[(i + 1) % ps.length];
        if ((a[1] <= yc) === (b[1] <= yc)) continue;
        const t = (yc - a[1]) / (b[1] - a[1]), x = a[0] + (b[0] - a[0]) * t, w = a[2] + (b[2] - a[2]) * t;
        if (x < xl) { xl = x; wl = w; }
        if (x > xr) { xr = x; wr = w; }
      }
      if (xl > xr) continue;
      const xa = Math.max(0, Math.ceil(xl - 0.5)), xb = Math.min(W - 1, Math.floor(xr - 0.5));
      for (let x = xa; x <= xb; x++) {
        const w = xr > xl ? wl + (wr - wl) * (x + 0.5 - xl) / (xr - xl) : wl, i = y * W + x;
        if (w > zb[i]) { zb[i] = w; col[i] = colour; }
      }
    }
  }
  const lines = [];
  function line(a, b, colour) {
    let p = toCam(a), q = toCam(b);
    if (p[2] < NEAR && q[2] < NEAR) return;
    if (p[2] < NEAR) p = add(p, mul(sub(q, p), (NEAR - p[2]) / (q[2] - p[2])));
    else if (q[2] < NEAR) q = add(q, mul(sub(p, q), (NEAR - q[2]) / (p[2] - q[2])));
    lines.push([project(p), project(q), colour]);
  }
  // a line's pixels, the part of it on the view only (Liang and Barsky's clip)
  function stroke([p, q, colour]) {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    let t0 = 0, t1 = 1;
    for (const [a, b] of [[-dx, p[0]], [dx, W - p[0]], [-dy, p[1]], [dy, H - p[1]]]) {
      if (a === 0) { if (b < 0) return; continue; }
      const t = b / a;
      if (a < 0) { if (t > t1) return; if (t > t0) t0 = t; } else { if (t < t0) return; if (t < t1) t1 = t; }
    }
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * (t1 - t0)));
    for (let k = 0; k <= n; k++) {
      const t = t0 + (t1 - t0) * k / n, x = Math.floor(p[0] + dx * t), y = Math.floor(p[1] + dy * t);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const w = p[2] + (q[2] - p[2]) * t, i = y * W + x;
      if (w >= zb[i] * 0.97) col[i] = colour;
    }
  }
  // the track: each piece's blocks between its pairs, the near road's edges striped, the far black
  const yG = GROUND * HS, down = p => [p[0], yG, p[2]];
  const pieces = s.pieces || v.pieces, n = pieces.length;
  for (let i = 0; i < n; i++) {
    const pairs = pieces[i], ahead = (i - s.piece + n) % n;
    for (let j = 0; j < pairs.length; j++) {
      const P1 = pairs[j], far = ahead * 8 + j - s.seg > 8 + 1;
      const c = far ? BLACK : P1.colour;
      if (j) {
        const P0 = pairs[j - 1];
        face([P0.L, P1.L, P1.R, P0.R], FILL);
        face([P0.L, P1.L, down(P1.L), down(P0.L)], FILL);
        face([P0.R, P1.R, down(P1.R), down(P0.R)], FILL);
        line(P0.L, P1.L, c); line(P0.R, P1.R, c);
      }
      line(P1.L, down(P1.L), c); line(P1.R, down(P1.R), c);
      if (P1.cross >= 0) line(P1.L, P1.R, P1.cross ? WHITE : BLACK);
    }
  }
  // the cars
  // (from the driver's seat, cam.inside, the player's own car is left out: the eye is inside it;
  // and the opponent's too where the game does not draw it)
  const cars = cam.inside ? [] : [[playerFrame(s.car), s.car.steer]];
  if (s.opp && (s.opp.shown || !cam.inside)) cars.push([oppFrame(s.opp), 0]);
  for (const [fr, steer] of cars) for (const part of carModel(steer)) {
    for (const f of part.faces) face(f.map(p => place(fr, p)), FILL);
    for (const e of part.edges) line(place(fr, e[0]), place(fr, e[1]), e[2]);
  }
  // the crane's chains: straight up from the four wheels; the game's driver sees the front two end
  // where they hook on, risen by the rows the game has lifted them from $AF at their distance from
  // the eye, and the back two are risen as far
  if (s.chain !== null && s.chain !== undefined && !cam.inside) {
    const fr = cars[0][0], rise = (0xAF - s.chain) * Math.hypot(CHAIN_X, CHAIN_Z) / FY;
    for (const z of [-CHAIN_Z, CHAIN_Z]) for (const x of [-CHAIN_X, CHAIN_X]) {
      const p = place(fr, [x, CAR_W / 4, z]);
      line([p[0], p[1] + rise, p[2]], [p[0], p[1] + 3000, p[2]], BLACK);
    }
  }
  // the dust: each speck a fat pixel by two lines where nothing nearer covers it; each puff of a
  // wreck's dust filled with the ground's colour and outlined in the game's line's
  const dots = [];
  if (s.dust && s.eye) for (const d of s.dust) {
    if (d.puff === undefined) {
      const c = toCam(backProject(s.eye, d.col + 16, d.row - 48, SPECK_D));
      if (c[2] >= NEAR) dots.push(project(c));
      continue;
    }
    const pts = puffShape(v.puff, d), a = s.car.heading + (pts.u - VIEW.w / 2) / (VIEW.w / 2) * Math.PI / 2;
    const foot = Math.min(s.car.front[0], s.car.front[1], s.car.back) * HS;
    const ctr = [s.car.x + Math.sin(a) * PUFF_R, foot + (0xB7 - 48 - pts.w) * PUFF_K / 2, s.car.z + Math.cos(a) * PUFF_R];
    const at = q => add(ctr, add(mul(cam.r, (q[0] - pts.u) * PUFF_K), mul(cam.u, (pts.w - q[1]) * PUFF_K / 2)));
    const arc = pts.map(at), bottom = Math.max(pts[0][1], pts[pts.length - 1][1]);
    face([...arc, at([pts[pts.length - 1][0], bottom]), at([pts[0][0], bottom])], FILL);
    for (let i = 1; i < arc.length; i++) line(arc[i - 1], arc[i], d.puff & 2 ? WHITE : BLACK);
  }
  for (const l of lines) stroke(l);
  for (const p of dots) {
    const x = Math.floor(p[0]), y = Math.floor(p[1]);
    for (const yy of [y - 1, y]) if (x >= 0 && yy >= 0 && x < W && yy < H && p[2] >= zb[yy * W + x] * 0.97) col[yy * W + x] = WHITE;
  }
  // into the frame: each fat pixel two of the frame's
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (VIEW.y + y) * 384 + VIEW.x + 2 * x;
    px[o] = px[o + 1] = col[y * W + x];
  }
  return { col, zb };
}

// ---- cameras
// looking from p at t, level across
function lookAt(p, t) {
  const f = norm(sub(t, p));
  const r = norm(cross([0, 1, 0], f));
  return { pos: p, f, r, u: cross(f, r) };
}
// behind and above the car, turning after it: its heading followed by 6 % of the way a C64 frame
// (a third of the way over a pass of seven), and at once when the car is put somewhere new
const CHASE = { back: 280, up: 95, ahead: 400, at: 10, zoom: 0.625, follow: 0.06 };
function chase(v, s, prev, frame) {
  const fr = playerFrame(s.car);
  let h = s.car.heading;
  if (prev && Math.abs(prev.x - fr.o[0]) + Math.abs(prev.z - fr.o[2]) < 1500) {
    let d = h - prev.h;
    d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    h = prev.h + d * (1 - Math.pow(1 - CHASE.follow, Math.max(0, frame - prev.frame)));
  }
  const f = [Math.sin(h), 0, Math.cos(h)];
  const cam = lookAt(add(fr.o, add(mul(f, -CHASE.back), [0, CHASE.up, 0])), add(fr.o, add(mul(f, CHASE.ahead), [0, CHASE.at, 0])));
  cam.zoom = CHASE.zoom;
  cam.state = { h, x: fr.o[0], z: fr.o[2], frame };
  return cam;
}

// the way from heading a to heading b, t of it, the short way round
const turnBy = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };

// ---- the track as solid blocks, for Heli cam: each stretch of road between two pairs of its edges,
// down to the ground, as two triangles across the map with their heights; and whether the track
// stands between two points (a point of the line between them under the road, tested every 20
// units), or under one
function blocks(v, s) {
  const pieces = s.pieces || v.pieces;
  if (v.blocks && v.blocks.pieces === pieces) return v.blocks;
  const tris = [];
  for (const pairs of pieces) for (let j = 1; j < pairs.length; j++) {
    const A = pairs[j - 1].L, B = pairs[j].L, C = pairs[j].R, D = pairs[j - 1].R;
    for (const t of [[A, B, C], [A, C, D]]) {
      const xs = t.map(p => p[0]), zs = t.map(p => p[2]);
      tris.push({ t, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) });
    }
  }
  return (v.blocks = { pieces, tris });
}
// the road's height at (x, z), the highest where stretches cross; -Infinity off the track
function roadAt(v, s, x, z) {
  let best = -Infinity;
  for (const b of blocks(v, s).tris) {
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const [p, q, r] = b.t, d = (q[2] - r[2]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[2] - r[2]);
    if (!d) continue;
    const l1 = ((q[2] - r[2]) * (x - r[0]) + (r[0] - q[0]) * (z - r[2])) / d, l2 = ((r[2] - p[2]) * (x - r[0]) + (p[0] - r[0]) * (z - r[2])) / d, l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    best = Math.max(best, l1 * p[1] + l2 * q[1] + l3 * r[1]);
  }
  return best;
}
function hidden(v, s, a, b) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 20));
  for (let i = 1; i < n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    if (p[1] < roadAt(v, s, p[0], p[2])) return true;
  }
  return false;
}

// ---- Heli cam: the race filmed from a helicopter flying with it. It hangs behind the car and to
// one side, high up, and looks ahead of the car, so that the road it is driving into is in the
// picture. While the opponent's car is ahead (the game's $C36A) and nearer than HELI.near, it aims
// between the two and stands further off, so that both are in the picture; an opponent behind is
// never followed. When the track has hidden the car from it for HELI.patience frames, and would not
// from the other side, it flies round to that side, over the back of the car, and stays there at
// least HELI.stay frames. It eases into everything it does, as a helicopter would, and rises and
// falls with the car faster than it follows it across, so that a car falling off the track stays
// in the picture.
const HELI = { dist: 560, up: 210, side: 2.2, ahead: 250, aim: 30, zoom: 0.9, follow: 0.12, rise: 0.3, swing: 0.035, near: 1600, spread: 0.8, over: 260, patience: 6, stay: 75 };
const oppMiddle = o => [(o.corners[0][0] + o.corners[1][0] + o.corners[2][0] + o.corners[3][0]) / 4,
  (o.heights[0] + o.heights[1] + o.heights[2] + o.heights[3]) / 4 * HS, (o.corners[0][1] + o.corners[1][1] + o.corners[2][1] + o.corners[3][1]) / 4];
function heli(v, s, prev, frame) {
  const c = s.car, car = [c.x, carHeight(c) * HS, c.z];
  // what it films: the car, or the car and the opponent ahead of it, and how far apart they are
  let mid = car, gap = 0;
  if (s.opp && s.opp.ahead) {
    const o = oppMiddle(s.opp), d = Math.hypot(o[0] - car[0], o[2] - car[2]);
    if (d < HELI.near) { mid = mul(add(car, o), 0.5); gap = d; }
  }
  // the frames since the last picture, and whether the car has been put somewhere new
  const dt = prev && frame >= prev.frame ? Math.min(50, frame - prev.frame) : 0;
  const fresh = !prev || Math.hypot(car[0] - prev.cx, car[2] - prev.cz) > 1500;
  const rate = r => fresh ? 1 : 1 - Math.pow(1 - r, dt), k = rate(HELI.follow), ky = rate(HELI.rise), ks = rate(HELI.swing);
  const ease = (p, q, t) => p + (q - p) * t, sideAngle = side => side > 0 ? HELI.side : 2 * Math.PI - HELI.side;
  const st = fresh ? { x: mid[0], y: mid[1], z: mid[2], h: c.heading, gap, side: 1, a: HELI.side, hid: 0, since: HELI.stay }
    : { x: ease(prev.x, mid[0], k), y: ease(prev.y, mid[1], ky), z: ease(prev.z, mid[2], k), h: turnBy(prev.h, c.heading, k),
      gap: ease(prev.gap, gap, k), side: prev.side, a: prev.a, hid: prev.hid, since: prev.since + dt };
  st.cx = car[0]; st.cz = car[2]; st.frame = frame;
  // where it hangs at angle a, measured from the car's nose round to its right (the right side is
  // HELI.side, the left a turn less it): further off the further apart the cars are, high over
  // the road under it, and higher the nearer it is to straight behind
  const at = a => {
    const d = HELI.dist + st.gap * HELI.spread, back = Math.max(0, 1 - Math.abs(a - Math.PI) / (Math.PI - HELI.side));
    const p = [st.x + Math.sin(st.h + a) * d, 0, st.z + Math.cos(st.h + a) * d];
    p[1] = Math.max(st.y, GROUND * HS, roadAt(v, s, p[0], p[2]) + 60) + HELI.up + HELI.over * back;
    return p;
  };
  // the side it is on: the other once the track has hidden the car's roof long enough from here
  // and would not from there
  const roof = add(car, [0, 25, 0]);
  if (dt) {
    st.hid = hidden(v, s, at(st.a), roof) ? st.hid + dt : 0;
    if (st.hid >= HELI.patience && st.since >= HELI.stay && !hidden(v, s, at(sideAngle(-st.side)), roof)) { st.side = -st.side; st.hid = 0; st.since = 0; }
  }
  st.a = ease(st.a, sideAngle(st.side), ks);
  const lead = HELI.ahead * Math.max(0, 1 - st.gap / HELI.near);
  const cam = lookAt(at(st.a), [st.x + Math.sin(st.h) * lead, st.y + HELI.aim, st.z + Math.cos(st.h) * lead]);
  cam.zoom = HELI.zoom; cam.state = st;
  return cam;
}

// ---- the dust
// a point the game draws over its view, at view column u (fat pixels) and line w, put back into the
// track d from the eye e along the ground, by the game's lens: across by its bearing, up by its
// height over the horizon's line
function backProject(e, u, w, d) {
  const th = (u - VIEW.w / 2) / FX;
  return [e.x + Math.sin(e.heading + th) * d, e.y + (e.hz - w) * d / FY, e.z + Math.cos(e.heading + th) * d];
}
// the game's tables for a puff of a wreck's dust (DEBRIS, $29E3), read from its memory: where the
// steps start ($2A36) and how many there are less one ($2A38), for an odd piece and an even, how
// far right of its column it starts ($2A3C), and the steps across ($2A3E) and down ($2A4D)
function puffTables(S) {
  const sb = a => (S[a] << 24) >> 24, run = (a, n) => Array.from({ length: n }, (_, i) => sb(a + i));
  return { start: [S[0x2A36], S[0x2A37]], count: [S[0x2A38], S[0x2A39]], shift: [S[0x2A3C], S[0x2A3D]], across: run(0x2A3E, 15), down: run(0x2A4D, 15) };
}
// a puff as DEBRIS draws it: from its column ($80A0) plus the shift and its row ($C260), ten lines
// for an odd piece and five for an even, the steps taken from the start back; in view columns and
// lines, with its middle (u, w)
function puffShape(T, d) {
  const y = d.puff & 1 ? 0 : 1;
  let i = T.start[y], c = d.col + T.shift[y], r = d.row;
  const pts = [[c - 48, r - 48]];
  for (let n = T.count[y]; n >= 0; n--, i--) { c += T.across[i]; r += T.down[i]; pts.push([c - 48, r - 48]); }
  pts.u = pts.reduce((t, p) => t + p[0], 0) / pts.length; pts.w = pts.reduce((t, p) => t + p[1], 0) / pts.length;
  return pts;
}

const SCRChase = root.SCRChase = { create, attach, snap, draw, chase, heli, hidden, roadAt, lookAt, track, playerFrame, oppFrame, carHeight, backProject, puffShape, HS, VIEW, FX, FY, CHASE, HELI };
})(typeof window !== 'undefined' ? window : globalThis);
