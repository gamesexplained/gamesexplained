// The Play page's fast CPU: Castle Master as a C64 with a much faster processor would run it, a pass
// of its main loop for each tick of its timer (60 a second), every step at one pace.
//
// The game moves the player a fixed step each pass of its main loop: each pass reads the controls,
// takes a step, turns or looks a step, runs the scripts the step set off and draws the view, and a
// pass takes the C64 from a fifth of a second to two seconds, by what the view holds. Nothing in
// the loop waits, so on a faster processor the passes come as fast as it can run them, and every
// step with them. What runs on the interrupt (the clock, the sensors' drain on strength, the
// lightning's countdown, the scripts' timer, the music) keeps its time, and so does every wait on
// it. So the page's machine runs the main loop's work a thousand times faster and waits at the
// start of each pass for the timer's next tick (page/runtime.js, runSteps), and this mod makes each
// pass do its share of a step, a step taking the same time, K, whatever the view. Every pass is the
// same length, so the same controls make the same game at any rate the page is drawn at, and the
// page draws the view between the last two passes (latest()).
//
// The rule, which depends on no address of this game:
//   K, the pace: the time a step takes, a whole number of ticks of the timer (PACES: a second,
//       about the C64's time over a pass in play, which runs from 0.2 to 3 seconds by the view,
//       half of them under 0.92; half a second; a fifth, the C64's quickest);
//   f = Δ / K, the share of a step a pass is given: Δ the clock from the pass's start to the clock
//       it runs to (a tick on);
//   - a step the game takes each pass a control is held is taken f of, and what is left of a whole
//     unit carried to the next (walking, turning, looking). The game settles a step that meets a
//     wall or leaves an edge at once, cutting it short and dropping the rest, so taken in shares it
//     can end elsewhere than the whole step would: each cut step creeps a little along the wall,
//     and 60 of them a second slide along it where a C64 stops;
//   - an action a control sets off is taken when the control is pressed (a mode, a turn about, a
//     use), and one a player holds the control down for, again each K it is held, as the C64 takes
//     it once a pass (a shot, a quarter turn);
//   - what the game does each pass for as long as something lasts is done once each K (the script
//     of an object the player pushes against);
//   - what the game shows for a pass is shown for K (the lightning's streak);
//   - the pointer, which the C64 moves a pixel in a pass that draws no view, the same in every
//     view, moves fc = Δ / D of a pixel a pass: D the C64's time over such a pass, its work as the
//     page's pacing counts it (rt.pass) over the part of the processor the interrupts leave the
//     main program.
// So a control held for a second moves the player as far, and turns the view as far, wherever the
// player stands and whatever is in view; times with K are counted on the clock each pass runs to,
// a whole number of ticks.
//
// Castle Master's half. Its turns and looks are steps of 72 to a turn; a share of one is kept as
// the fraction of the angle, and the view is drawn at it: the game's own BUILD_VIEW_PROJECTION_
// MATRIX with the sine and cosine of the fine angle in its table for the call (the table's own,
// part of the way from one step's to the next's), the horizon at 11 rows a step of pitch, the
// Wilderness's scenery 8 pixels on for each step of yaw. A message in the panel stays its 50 ticks
// while play goes on: the C64 holds the pass until it is gone, a second it spends drawing the view
// anyway, and here it would stop the view.
//
//   const fx = CMFast.attach(rt)   the mod on the page's machine (again: the same one). It counts
//                                  the passes in either mode, so that D is known when it goes on
//   CMFast.set(fx, on)             the switch: rt.setFast too
//   fx.yaw, fx.pitch               the view's angles, in steps and fractions (pitch -18 to 18)
//   CMFast.pace(fx, ticks)         the pace: the ticks of the timer a step takes (one of PACES)
//   fx.K                           the pace: the cycles a step takes
//   fx.D                           { aim }: the C64's cycles over a pass that moves the pointer
//   CMFast.paint(px, fx, F)        the view as the machine holds it now, in the C64's pixels, into
//                                  px (frame F's palette indices), F's sprites left on top
//   CMFast.latest(fx, st)          the modern view (page/modern.js, st its watch) at the page's
//                                  time, between the last two pictures, when the machine's bitmap
//                                  holds the last: { scene, shown, phi, still }, or null
(function (root) {
'use strict';
const VX = 72, VY = 67;
// the paces, in ticks of the timer a step takes: one step a second (the first), two, five
const PACES = [60, 30, 12];
// the actions (the map at $1382) a press sets off once: the speeds, facing forward, turning about,
// the cross-hair, a shot, a use, the pointer, the information screen
const ONCE = new Set([9, 10, 11, 12, 13, 0x15, 0x16, 0x1B, 0x1E, 0x29]);
// and those it sets off once with the control key ($1380): a quarter turn, the look to its end
const ONCE_CTRL = new Set([5, 6, 7, 8]);
// of them, those a held control sets off again each pace, as a C64 does each pass: a shot, the
// control key's turns and looks. The rest switch something, and a press takes them once
const REPEAT = new Set([0x16, 5, 6, 7, 8]);

const wrap72 = v => ((v % 72) + 72) % 72;
const pitchByte = p => wrap72(Math.round(p));
const signed = b => (b < 36 ? b : b - 72);
const sb = v => (v << 24) >> 24;

function attach(rt) {
  const P = rt.P;
  if (P.__cmFast) return P.__cmFast;
  const M = P.M;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const fx = {
    rt, on: false, pace: PACES[0], yaw: M[0x2411], pitch: signed(M[0x2410]),
    D: { aim: 13000 }, f: 0, fc: 0, n: 0, prev: null,
    acc: { x: 0, z: 0 }, nudge: {}, held: new Map(), armed: false, touched: null, name: false, streak: null,
  };
  P.__cmFast = fx;
  Object.defineProperty(fx, 'K', { get: () => fx.pace * rt.step });
  // the fine angles follow the game's own when it sets them (an entrance, a fall, a load)
  function sync() {
    if (M[0x2411] !== wrap72(Math.round(fx.yaw))) fx.yaw = M[0x2411];
    if (M[0x2410] !== pitchByte(fx.pitch)) fx.pitch = signed(M[0x2410]);
  }
  // the angles for page/modern.js, while the switch is on
  P.angles = () => (fx.on ? (sync(), { yaw: wrap72(fx.yaw), pitch: wrap72(fx.pitch) }) : null);
  // the table's sine (k 0) or cosine (k 1) of angle a, the same part of the way from one step's
  // value to the next's
  function table(a, k) {
    const i = Math.floor(a), t = a - i, v0 = sb(M[0x123C + 2 * wrap72(i) + k]);
    return t ? v0 + (sb(M[0x123C + 2 * wrap72(i + 1) + k]) - v0) * t : v0;
  }

  // ---- the passes, counted in either mode (a pass's start closes the last), for the pointer's D
  const update = P.UPDATE_FRAME_INPUT_EVENTS;
  P.UPDATE_FRAME_INPUT_EVENTS = function* (r) {
    const now = { work: rt.pass.work, irq: rt.spent.irq, t: rt.t, draw: false, aim: 0 };
    const p = fx.prev;
    // a pass that moves the pointer once and draws nothing
    if (p && !p.draw && p.aim === 1 && !p.drew && now.t > p.t) {
      const share = Math.min(0.5, (now.irq - p.irq) / (now.t - p.t));
      const d = (now.work - p.work) / (1 - share);
      if (d > 0) fx.D.aim = d;
    }
    fx.prev = now; fx.n++;
    if (!fx.on) return yield* update.call(this, r);
    sync();
    const delta = Math.max(0, rt.goal - rt.t);
    fx.f = Math.min(1, delta / fx.K);
    fx.fc = Math.min(32, delta / fx.D.aim);
    // the lightning's streak, shown for a pass: held for K with play going on under it (the pass
    // that draws it reads no controls, as on the C64), then the flash
    const st = fx.streak;
    if (st && (rt.goal >= st.until || !M[0x2464])) fx.streak = null;
    // (the routine reads the countdown as its first thing: that read finds it neither run out
    // nor showing)
    const ib = P.irqByte, hold = fx.streak && M[0x2459] === 0;
    const once = a => { P.irqByte = ib; return a === 0x2459 ? 0x80 : ib(a); };
    if (hold) P.irqByte = once;
    fx.armed = true;
    try { return yield* update.call(this, r); }
    finally { fx.armed = false; if (P.irqByte === once) P.irqByte = ib; }
  };

  // ---- the controls: an action a press sets off, once a press, and again each K it is held when
  // it repeats
  const read = P.READ_CONTROL_INPUT;
  P.READ_CONTROL_INPUT = function (r) {
    const v = read.call(this, r);
    if (!fx.armed) return v;
    fx.armed = false;
    const action = code => { for (let i = 0; i < M[0x1381]; i++) if (M[0x1382 + 2 * i] === code) return M[0x1383 + 2 * i]; return 0x7F; };
    const codes = Array.from(M.subarray(0x137A, 0x137A + M[0x1379]));
    const go = new Map();
    for (const c of codes) {
      const a = action(c);
      if (go.has(a) || !(ONCE.has(a) || (M[0x1380] && ONCE_CTRL.has(a)))) continue;
      const h = fx.held.get(a);
      const ok = !h || h.n !== fx.n - 1 || (REPEAT.has(a) && rt.goal - h.at >= fx.K);
      go.set(a, ok);
      if (ok) fx.held.set(a, { n: fx.n, at: rt.goal }); else h.n = fx.n;
    }
    const keep = codes.filter(c => go.get(action(c)) !== false);
    if (keep.length === codes.length) return v;
    keep.forEach((c, i) => { M[0x137A + i] = c; });
    M[0x1379] = keep.length;
    return Object.assign({}, v, { a: M[0x137A], c: keep.length ? 1 : 0 });
  };

  // ---- walking, turning and looking: f of the game's step, along the fine yaw
  const move = P.DISPATCH_PLAYER_MOVEMENT;
  P.DISPATCH_PLAYER_MOVEMENT = function* (r) {
    if (!fx.on) return yield* move.call(this, r);
    sync();
    const act = r.a;
    if (act === 3 || act === 4) return walk(act);
    if (act === 7 || act === 8) return look(act, r);
    if (act === 5 || act === 6) {
      // the game's own turn by none, from the angle f of its step (a quarter with the control
      // key) has turned to
      const step = M[0x1380] ? 0x12 : M[0x9D4C] * fx.f;
      fx.yaw = wrap72(fx.yaw + (act === 5 ? -step : step));
      M[0x2411] = wrap72(Math.round(fx.yaw));
      const s0 = M[0x9D4C], s1 = M[0x1380];
      M[0x9D4C] = 0; M[0x1380] = 0;
      try { return yield* move.call(this, r); } finally { M[0x9D4C] = s0; M[0x1380] = s1; }
    }
    const was = fx.pitch;
    const v = yield* move.call(this, r);
    if (act === 13) fx.yaw = wrap72(fx.yaw + 36);
    if (act === 12 && was) { fx.pitch = 0; M[0x2410] = 0; M[0x1059] |= 0x44; }
    return v;
  };
  // DISPATCH_PLAYER_MOVEMENT's step forward (3) or back (4) (src/g-move.js): the speed (running
  // backwards at the walk's) times the sine and the cosine of the fine yaw, f of it, the feet raised
  // to a step's height for the solver and lowered after
  function walk(act) {
    let x = M[0x240D], y = M[0x240E];
    M[0x5DD3] = 0; M[0x5DD4] = 0; M[0x7E] = 0xF0;
    if (act === 4 && M[0x2456] === 2) {
      P.MUL_S16_S8_TO_S24({ a: M[0x9D47], x: 0, y: M[0x2416] });
      x = M[0x82]; y = M[0x83];
    }
    M[0x5DD6] = x; M[0x5DD7] = y;
    // the game's (speed x table x 4) >> 8
    const speed = ((x | y << 8) << 16 >> 16) * fx.f * (act === 4 ? -1 : 1) / 64;
    fx.acc.x += speed * table(fx.yaw, 0); fx.acc.z += speed * table(fx.yaw, 1);
    const dx = Math.trunc(fx.acc.x), dz = Math.trunc(fx.acc.z);
    fx.acc.x -= dx; fx.acc.z -= dz;
    M[0x5DD1] = (M[0x2411] << 1) & 255;
    setw(0x1050, dz + w(0x240B));
    P.PRESENT_ACTION_FEEDBACK({ y: act === 3 ? 9 : 10 });
    setw(0x104C, dx + w(0x2407));
    M[0x5DD2] = (M[0x2413] - 1) & 255;
    const lift = (M[0x5DD2] << 6) | 0x20;
    M[0x5DD2] = lift >> 8; M[0x5DD1] = lift & 255;
    const feet = w(0x2409) - lift;
    setw(0x2409, feet); setw(0x104E, feet);
    if (P.SOLVE_PLAYER_COLLISION({ y }).x === 1) M[0x5DD3] = 0x34;
    setw(0x2409, w(0x2409) + lift);
    M[0x1084] |= 1;
    M[0x1059] |= M[0x5DD3]; M[0x105A] |= M[0x5DD4];
    return { a: M[0x105A], x, y };
  }
  // its look up (7) or down (8): f of the step, kept to 18 steps either way; with the control key
  // all the way at once, as the game goes
  function look(act, r) {
    M[0x5DD3] = 0; M[0x5DD4] = 0; M[0x7E] = 0xF0;
    P.PRESENT_ACTION_FEEDBACK({ y: act === 7 ? 1 : 2 });
    if (M[0x1380]) fx.pitch = act === 7 ? -18 : 18;
    else fx.pitch = Math.max(-18, Math.min(18, fx.pitch + (act === 7 ? -1 : 1) * M[0x9D4C] * fx.f));
    M[0x2410] = pitchByte(fx.pitch);
    M[0x5DD3] = 0x44;
    M[0x1084] |= 1;
    M[0x1059] |= M[0x5DD3]; M[0x105A] |= M[0x5DD4];
    return { a: M[0x105A], x: r.x, y: r.y };
  }

  // ---- the pointer's moves, a pixel a pass on the C64: fc of them, the rest carried
  const aim = P.DISPATCH_AIM_FIRE_ACTIVATE;
  P.DISPATCH_AIM_FIRE_ACTIVATE = function* (r) {
    if (!M[0x2467] || r.a < 0x17 || r.a > 0x1A) return yield* aim.call(this, r);
    let n = 1, v = {};
    if (fx.on) {
      fx.nudge[r.a] = (fx.nudge[r.a] || 0) + fx.fc;
      n = Math.floor(fx.nudge[r.a]);
      fx.nudge[r.a] -= n;
    }
    if (fx.prev) fx.prev.aim += n;
    while (n-- > 0) v = yield* aim.call(this, r);
    return v;
  };

  // ---- the script of an object the player keeps meeting (pushing against it, standing on it):
  // once each K, as the C64 runs it once a pass. The global scripts and the area's run each pass a
  // step sets them off, as on the C64: what they do on a step is show or hide objects by the flags,
  // the same however often it is done (their score, strength and messages wait on the scripts'
  // timer, which keeps its time)
  const conditions = P.DISPATCH_FRAME_CONDITIONS;
  P.DISPATCH_FRAME_CONDITIONS = function* (r) {
    const obj = M[0x1082];
    if (fx.on && obj && (M[0x1084] | M[0x1085]) === 1) {
      const t = fx.touched;
      if (t && t.obj === obj && rt.goal - t.at < fx.K) {
        M[0x1082] = 0;
        try { return yield* conditions.call(this, r); } finally { M[0x1082] = obj; }
      }
      fx.touched = { obj, at: rt.goal };
    }
    return yield* conditions.call(this, r);
  };

  // ---- a message in the panel: the area's name back once its ticks have run out, at a later pass
  const status = P.REFRESH_ACTION_STATUS;
  P.REFRESH_ACTION_STATUS = function* (r) {
    if (fx.on && (M[0x105A] & 0x20) && M[0x1063]) {
      fx.name = true;
      M[0x105A] &= ~0x20;
      try { return yield* status.call(this, r); } finally { M[0x105A] |= 0x20; }
    }
    if (fx.name && !M[0x1063]) { fx.name = false; M[0x105A] |= 0x20; }
    return yield* status.call(this, r);
  };

  // ---- the view at the fine angles
  const matrix = P.BUILD_VIEW_PROJECTION_MATRIX;
  P.BUILD_VIEW_PROJECTION_MATRIX = function (r) {
    if (fx.prev) fx.prev.draw = true;
    if (!fx.on) return matrix.call(this, r);
    sync();
    // each fine angle's sine and cosine put in the table at a step of its own for the call: the
    // step it rounds to, or another when that is 0 (which the routine leaves out) or the other
    // angle's; put back after
    const want = [[0x2411, fx.yaw], [0x2410, wrap72(fx.pitch)]], used = new Set([0]), put = [];
    for (const [at, a] of want) if (a === M[at]) used.add(a);
    for (const [at, a] of want) {
      if (a === M[at]) continue;
      let i = M[at];
      while (used.has(i)) i = (i % 71) + 1;
      used.add(i);
      const t = 0x123C + 2 * i;
      put.push([at, M[at]], [t, M[t]], [t + 1, M[t + 1]]);
      M[at] = i; M[t] = Math.round(table(a, 0)) & 255; M[t + 1] = Math.round(table(a, 1)) & 255;
    }
    try { return matrix.call(this, r); } finally { for (let k = put.length - 1; k >= 0; k--) M[put[k][0]] = put[k][1]; }
  };
  // the horizon, 11 rows a step of pitch from the view's middle: the fine product
  const background = P.DRAW_SKY_FLOOR_BACKGROUND;
  P.DRAW_SKY_FLOOR_BACKGROUND = function (r) {
    if (!fx.on) return background.call(this, r);
    sync();
    const mul = P.MUL_S8_S8_TO_S16;
    let first = true;
    P.MUL_S8_S8_TO_S16 = function (q) {
      const v = mul.call(this, q);
      if (first && q.y === 0x0B) { first = false; setw(0x82, Math.round(fx.pitch * 11)); }
      return v;
    };
    try { return background.call(this, r); } finally { P.MUL_S8_S8_TO_S16 = mul; }
  };
  // the Wilderness's scenery (FILL_LOWER_BACKGROUND_ROWS, src/g-view.js), its rows drawn again from
  // the fine yaw: 64 pixels a row, 8 on for each step. A row's 30 bytes are on the screen in the
  // other order (the blit turns them round), so screen byte s is the row's byte 29 - s, and
  // screen pixel c shows the strip's pixel c + 8 x yaw
  const scenery = P.FILL_LOWER_BACKGROUND_ROWS;
  P.FILL_LOWER_BACKGROUND_ROWS = function (r) {
    if (!fx.on || M[0x2429] !== 1) return scenery.call(this, r);
    let row = w(0x7A), strip = 0x21FA + 0x10 * M[0x4B8A];
    const n = M[0x4B89], o = Math.floor(8 * wrap72(fx.yaw) + 1e-6) & 63;
    const v = scenery.call(this, r);
    for (let k = 0; k < n; k++, strip += 0x10, row -= 0x1E) {
      for (let s = 0; s < 30; s++) {
        let b = 0;
        for (let j = 0; j < 4; j++) {
          const q = (4 * s + j + o) & 63;
          b |= ((M[strip + (q >> 2)] >> (6 - 2 * (q & 3))) & 3) << (6 - 2 * j);
        }
        M[(row + 29 - s) & 0xFFFF] = b;
      }
    }
    return v;
  };

  // ---- the lightning's streak, held for K: drawn again at its column by each view in that time
  const queue = P.DRAW_SORTED_VISIBLE_QUEUE;
  P.DRAW_SORTED_VISIBLE_QUEUE = function (r) {
    if (fx.prev) fx.prev.drew = true;
    if (!fx.on) return queue.call(this, r);
    if (M[0x2459] === 1 && !fx.streak) fx.streak = { until: rt.goal + fx.K, clock: M[0x1C64] };
    const st = fx.streak;
    if (!st || M[0x2459] !== 0) return queue.call(this, r);
    const clock = M[0x1C64];
    M[0x2459] = 1; M[0x1C64] = st.clock;
    try { return queue.call(this, r); }
    finally { M[0x1C64] = clock; if (M[0x2459] === 1) M[0x2459] = 0; }
  };
  return fx;
}

function pace(fx, ticks) {
  if (fx && PACES.includes(ticks)) fx.pace = ticks;
}

function set(fx, on) {
  if (!fx) return;
  fx.on = !!on;
  fx.rt.setFast(fx.on);
  fx.streak = null; fx.armed = false; fx.touched = null;
  if (fx.on) { fx.yaw = fx.rt.M[0x2411]; fx.pitch = signed(fx.rt.M[0x2410]); }
}

// The view in the C64's pixels as the machine's memory holds it now (the frame on show finished
// up to a frame before): the bitmap's cells and colours, the background's colour from the chip,
// and the pixels frame F's sprites put over the view left as F shows them
function paint(px, fx, F) {
  if (!fx || !F || !F.mem || !px) return false;
  const rt = fx.rt, M = rt.M, col = rt.colour, bg = rt.vic[0x21] & 15;
  const keep = root.CMModern ? new Set(root.CMModern.spritePixels(F, px)) : new Set();
  for (let l = 0; l < 120; l++) {
    const cr = 4 + (l >> 3), o = (VY + l) * 384 + VX;
    for (let c = 0; c < 120; c++) {
      const cc = 5 + (c >> 2), cell = cr * 40 + cc;
      const v = (M[0xE000 + cr * 320 + cc * 8 + (l & 7)] >> (6 - 2 * (c & 3))) & 3;
      const k = v === 0 ? bg : v === 1 ? M[0xC400 + cell] >> 4 : v === 2 ? M[0xC400 + cell] & 15 : col[cell] & 15;
      if (!keep.has(o + 2 * c)) px[o + 2 * c] = k;
      if (!keep.has(o + 2 * c + 1)) px[o + 2 * c + 1] = k;
    }
  }
  return true;
}

// The modern view's last picture, if the bitmap holds it now, or a view between the last two (not
// still, so that CMModern.paint paints it). A pass's picture is the view at the clock the pass ran
// to (its goal), and the clock owes the page part of a pass more (rt.phase): the view is drawn a
// pass behind, that part of the way from the picture before to the last, so that it moves at every
// frame of the screen whatever its rate
function latest(fx, st) {
  if (!fx || !st) return null;
  const MM = root.CMModern, i = st.flips.length - 1, f = st.flips[i];
  if (!f || !f.pic) return null;
  const rt = fx.rt, M = rt.M;
  for (let r = 0; r < 15; r++) {
    const a = f.at + r * 320;
    for (let k = 0; k < 240; k++) if (M[a + k] !== f.snap[r * 240 + k]) return null;
  }
  const last = { scene: f.scene || (f.scene = MM.scene(st.P, f.pic)), shown: f, phi: f.n, still: false };
  const e = st.flips[i - 1];
  if (!rt.fast || rt.fast.grid === null || !e || !e.pic || MM.cut(e.pic, f.pic)) return last;
  const g = 1 - (f.goal - (rt.fast.grid - rt.step * (1 - rt.phase))) / rt.step;
  if (!(g < 1)) return last;
  const h = Math.max(0, g), base = h < 0.5 ? e.pic : f.pic;
  const pic = Object.assign({}, base, MM.objectsBetween(e.pic, f.pic, h));
  return { scene: MM.scene(st.P, pic, MM.between(e.pic.pose, f.pic.pose, h)), shown: f, phi: f.n - 1 + h, still: false };
}

root.CMFast = { attach, set, pace, paint, latest, ONCE, ONCE_CTRL, REPEAT, PACES };
})(typeof window !== 'undefined' ? window : globalThis);
