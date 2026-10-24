// A bouncing-ball view of a tune: each voice's notes lie on a dark sheet as discs on a staff, a
// glowing ball hops in an arc from each note to the next and lands as the note sounds, and a
// note lights up when the ball hits it. The camera keeps one angle and moves with the music:
// time runs away from the viewer on a canvas taller than wide (a phone) and to the right on a
// wider one. Glow, bloom and the ball's reflection are drawn with the 2D canvas alone: the
// bright parts are drawn again on a second canvas, shrunk in steps and added back enlarged.
// No dependencies. Exposes NoteBounce (window.NoteBounce on a page; globalThis.NoteBounce in
// node, for tests).
//
//   const view = NoteBounce.create(canvas, { colors })
//     canvas  the canvas to draw on; its CSS size decides the shape, and the view follows it
//     colors  optional: one CSS hex colour a voice ('#1f5fa8'), as the page's other displays
//             colour them
//   view.score({ rate, voices })   the tune: rate ticks a second, and per voice { notes }, each
//             note { t, n }: the tick it starts on and its pitch in semitones (any origin; 0 =
//             C0 in the SID player). A voice with no notes gets no lane. null clears the view
//   view.draw(t, { muted })        draws the tune at tick t (fractional), with muted[x] true for
//             a voice to draw dimmed; with no score, draws the empty sheet and the message
//   view.message                   the text drawn on an empty sheet
//   view.ballAt(x, t)              voice x's ball at tick t, { i, lat, y, at }: the note it last
//             landed on (-1 before the first), its place across the lane (-0.5 to 0.5), its
//             height and the tick of the point under it, for tests
// Everything drawn is a function of t alone, so a page can seek, pause or loop without telling
// the view anything but the tick.
(function (root) {
  'use strict';

  const DEFAULT_COLORS = ['#1f5fa8', '#c25a00', '#2a8a4a'];
  const LANE = 1, GAP = 0.38;                      // world units: a lane's width, the gap between lanes
  const SPAN = 0.84;                               // the part of a lane the notes use
  const NOTE_R = 0.064, BALL_R = 0.056;
  const HOP_MOST = 0.42;                           // seconds: a longer wait is spent resting on the note
  const REST_MOST = 0.6;                           // world units a resting ball may fall behind before it floats
  const RISE = 0.35, FLOAT = 0.45;                 // a floating ball: seconds to rise or come down, its height
  const TRAIL = 0.3;                               // seconds of the ball's path drawn behind it

  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : +a.toFixed(3)})`;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };

  function create(canvas, o) {
    o = o || {};
    const COLORS = (o.colors || DEFAULT_COLORS).map((h) => {
      const c = rgb(h);
      return { base: c, light: mix(c, [255, 255, 255], 0.45), core: mix(c, [255, 255, 255], 0.82) };
    });
    // g is the context being drawn on: the canvas's, or base's while the parts that do not move
    // (the sheet, its light, the staves, the grain) are drawn there once for every frame to copy
    const main = canvas.getContext('2d');
    const base = document.createElement('canvas'), bctx = base.getContext('2d');
    let g = main, baseKey = '';
    const glow = document.createElement('canvas'), gg = glow.getContext('2d');
    // the bloom: the glow halved four times (each halving averages four pixels), the four added
    // together enlarged at a quarter of the canvas's size, and that added to the picture
    const pyr = [0, 1, 2, 3].map(() => document.createElement('canvas'));
    const bloom = document.createElement('canvas'), bg2 = bloom.getContext('2d');
    let grain = null;
    let W = 0, H = 0, dpr = 1, portrait = false;
    let lanes = [], rate = 50, speed = 2, cam = null;
    const view = { message: 'Choose a tune to start.', score, draw, ballAt };

    // ------------------------------------------------------------------ the tune
    // Lanes, one a voice with notes: each note's time in seconds and place across the lane, and
    // the speed at which the sheet moves, set so that the usual gap between notes is a few discs.
    function score(s) {
      lanes = [];
      if (!s || !s.voices) return;
      rate = s.rate || 50;
      const gaps = [];
      s.voices.forEach((v, x) => {
        const notes = (v && v.notes) || [];
        if (!notes.length) return;
        let lo = Infinity, hi = -Infinity;
        for (const e of notes) { if (e.n < lo) lo = e.n; if (e.n > hi) hi = e.n; }
        if (hi - lo < 12) { const c = (lo + hi) / 2; lo = c - 6; hi = c + 6; }
        lo -= 1; hi += 1;
        const ts = new Float64Array(notes.length), ps = new Float64Array(notes.length);
        notes.forEach((e, i) => {
          ts[i] = e.t / rate; ps[i] = (e.n - lo) / (hi - lo) - 0.5;
          if (i) gaps.push(ts[i] - ts[i - 1]);
        });
        lanes.push({ x, ts, ps, color: COLORS[x % COLORS.length] });
      });
      gaps.sort((a, b) => a - b);
      const typical = gaps.length ? gaps[gaps.length >> 1] : 0.25;
      speed = clamp(0.3 / Math.max(typical, 0.02), 0.8, 2.6);
      lanes.forEach((l, k) => { l.cx = ((lanes.length - 1) / 2 - k) * (LANE + GAP); });
      cam = null;
    }

    // The note at or before time s (seconds), by halving: -1 before the first.
    function before(ts, s) {
      let a = 0, b = ts.length - 1;
      if (!ts.length || s < ts[0]) return -1;
      while (a < b) { const m = (a + b + 1) >> 1; if (ts[m] <= s) a = m; else b = m - 1; }
      return a;
    }

    // The ball over a lane at time s: resting on the last note it hit, or in the air on its way
    // to the next, leaving at the latest HOP_MOST before it. A wait long enough to carry the
    // resting ball out of the picture is spent floating instead: it rises off the note, keeps
    // pace with the music over the lane and comes down onto the next note (and before the first
    // note, and after the last, it floats).
    function ball(l, s) {
      const { ts, ps } = l, i = before(ts, s);
      const a = i < 0 ? -Infinity : ts[i], b = i + 1 < ts.length ? ts[i + 1] : Infinity;
      const pa = ps[Math.max(i, 0)], pb = ps[Math.min(i + 1, ts.length - 1)];
      const hop = Math.min(b - a, HOP_MOST), leave = b - hop;
      if ((leave - a) * speed > REST_MOST) {
        const up = (v) => v >= 1 ? 1 : 1 - (1 - v) * (1 - v);
        const k = Math.min(up((s - a) / RISE), up((b - s) / RISE));
        const across = isFinite(a) && isFinite(b) ? smooth((s - a) / (b - a)) : (isFinite(b) ? 1 : 0);
        const bob = 0.025 * Math.sin(2 * Math.PI * 0.7 * s) * Math.min(1, (s - a) / RISE, (b - s) / RISE);
        return { i, lat: pa + (pb - pa) * across, y: FLOAT * k + bob, at: s };
      }
      if (s <= leave) return { i, lat: pa, y: 0, at: a };
      const u = (s - leave) / hop;
      const dz = hop * speed, dx = (pb - pa) * SPAN;
      const peak = Math.min(0.55, 0.05 + 0.42 * Math.hypot(dz, dx));
      return { i, lat: pa + (pb - pa) * u, y: peak * 4 * u * (1 - u), at: leave + hop * u };
    }

    function ballAt(x, t) {
      const l = lanes.find((q) => q.x === x);
      if (!l) return null;
      const b = ball(l, t / rate);
      return { i: b.i, lat: b.lat, y: b.y, at: b.at * rate };
    }

    // ------------------------------------------------------------------ the camera
    // One fixed angle per shape: from behind and above on a tall canvas, from the side on a wide
    // one, looking a little ahead so that most of what shows is to come. The distance is found
    // by halving until the lanes around the ball, and the top of its arc, fit the canvas.
    function camera() {
      const n = Math.max(lanes.length, 3);           // one or two lanes keep the size they have among three
      const half = (n * LANE + (n - 1) * GAP) / 2;
      const P = portrait
        ? { yaw: 0, pitch: 0.78, fov: 0.75, ax: 0, ay: 0.5, keys: [[-half - 0.06, 0, -0.2], [half + 0.06, 0, -0.2], [0, 0.7, 0]] }
        : { yaw: 1.0, pitch: 0.6, fov: 0.7, ax: -0.3, ay: 0.08, keys: [[-half - 0.1, 0, -0.4], [half + 0.1, 0, -0.4], [-half - 0.1, 0, 1.2], [half + 0.1, 0, 0.8], [half, 0.7, 0]] };
      const cp = Math.cos(P.pitch);
      const F = [Math.sin(P.yaw) * cp, -Math.sin(P.pitch), Math.cos(P.yaw) * cp];
      const R = [-F[2], 0, F[0]], rl = Math.hypot(R[0], R[2]);
      R[0] /= rl; R[2] /= rl;
      const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
      const focal = (H / 2) / Math.tan(P.fov / 2);
      const ox = P.ax * W / 2, oy = P.ay * H / 2;
      const at = (d) => {                              // the camera d away, with the ball's point at (ox, oy)
        const cx = d * ox / focal, cy = -d * oy / focal;
        return { pos: [-d * F[0] - cx * R[0] - cy * U[0], -d * F[1] - cx * R[1] - cy * U[1], -d * F[2] - cx * R[2] - cy * U[2]], F, R, U, focal };
      };
      const fits = (c) => P.keys.every(([x, y, z]) => {
        const p = proj(c, x, y, z);
        const m = 0.04 * Math.min(W, H);
        return p && p[0] >= m && p[0] <= W - m && p[1] >= m && p[1] <= H - m;
      });
      let lo = 0.5, hi = 60;
      for (let k = 0; k < 40; k++) { const d = (lo + hi) / 2; if (fits(at(d))) hi = d; else lo = d; }
      return at(hi);
    }

    // A point (x across, y up, z along time, all relative to the ball's point) on the canvas:
    // [x, y, depth, pixels a unit there], or null behind the camera.
    function proj(c, x, y, z) {
      const dx = x - c.pos[0], dy = y - c.pos[1], dz = z - c.pos[2];
      const cz = dx * c.F[0] + dy * c.F[1] + dz * c.F[2];
      if (cz < 0.05) return null;
      const cx = dx * c.R[0] + dz * c.R[2];
      const cy = dx * c.U[0] + dy * c.U[1] + dz * c.U[2];
      const s = c.focal / cz;
      return [W / 2 + cx * s, H / 2 - cy * s, cz, s];
    }

    // A disc of radius r lying on the sheet at (x, z), as the ellipse the camera sees, for
    // drawing in the unit circle's coordinates: ctx.setTransform(...m) then arc(0, 0, 1).
    function disc(x, z, r) {
      const c = proj(cam, x, 0, z), a = proj(cam, x + r, 0, z), b = proj(cam, x, 0, z + r);
      if (!c || !a || !b) return null;
      return [a[0] - c[0], a[1] - c[1], b[0] - c[0], b[1] - c[1], c[0], c[1], c[2]];
    }

    // ------------------------------------------------------------------ drawing
    function resize() {
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
      if (w !== W || h !== H) {
        W = canvas.width = base.width = w; H = canvas.height = base.height = h;
        glow.width = Math.ceil(W / 2); glow.height = Math.ceil(H / 2);
        pyr.forEach((p, k) => { p.width = Math.max(1, Math.ceil(W / (4 << k))); p.height = Math.max(1, Math.ceil(H / (4 << k))); });
        bloom.width = pyr[0].width; bloom.height = pyr[0].height;
        cam = null;
      }
      portrait = H > W * 1.05;
      return true;
    }

    function grainPattern() {
      if (grain) return grain;
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d'), img = x.createImageData(128, 128);
      let r = 12345;
      for (let i = 0; i < img.data.length; i += 4) {
        r = (r * 1103515245 + 12345) & 0x7FFFFFFF;
        const v = 110 + (r >> 16) % 40;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      return (grain = bctx.createPattern(c, 'repeat'));
    }

    // fog: 1 up to a little way ahead of the ball, falling to 0 at the far end of what is drawn
    const FAR = () => portrait ? 11 : 12;
    const fog = (z) => clamp(1 - (z - FAR() * 0.55) / (FAR() * 0.45), 0, 1);

    function draw(t, opts) {
      if (!resize()) return;
      const muted = (opts && opts.muted) || [];
      if (!cam) cam = camera();
      const now = (t || 0) / rate;
      const key = [W, H, lanes.length, ...lanes.map((l) => muted[l.x] ? 1 : 0)].join();
      if (key !== baseKey) { baseKey = key; g = bctx; sheet(muted); g = main; }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'copy';
      g.drawImage(base, 0, 0);
      g.globalCompositeOperation = 'source-over';
      gg.setTransform(1, 0, 0, 1, 0, 0);
      gg.clearRect(0, 0, glow.width, glow.height);

      if (!lanes.length) {
        g.fillStyle = 'rgba(235,232,225,0.85)';
        g.font = `${Math.round(15 * dpr)}px ${o.font || 'Lato, system-ui, sans-serif'}`;
        g.textAlign = 'center';
        g.fillText(view.message, W / 2, H * 0.5);
        g.textAlign = 'start';
        return;
      }

      // past notes stay a little while behind the ball, then leave the picture
      const back = portrait ? 1.1 : 2.2, ahead = FAR();

      // everything that stands up, far to near, so that nearer things cover farther ones
      const items = [];
      lanes.forEach((l) => {
        const dim = muted[l.x] ? 0.3 : 1;
        const sx = portrait ? -1 : 1;                // higher notes: right on a tall canvas, farther on a wide one
        const lx = (p) => l.cx + sx * p * SPAN * LANE;
        const i0 = Math.max(0, before(l.ts, now - back / speed));
        for (let i = i0; i < l.ts.length; i++) {
          const z = (l.ts[i] - now) * speed;
          if (z > ahead) break;
          items.push({ z, kind: 0, l, i, x: lx(l.ps[i]), dim });
        }
        const b = ball(l, now);
        items.push({ z: (b.at - now) * speed, kind: 1, l, b, x: lx(b.lat), dim, lx });
      });
      items.sort((a, b) => b.z - a.z || a.kind - b.kind);
      for (const it of items) {
        if (it.kind === 0) note(it, now); else drawBall(it, now);
      }

      // the glow: added as drawn, and again as the bloom
      let src = glow;
      bg2.setTransform(1, 0, 0, 1, 0, 0);
      bg2.globalCompositeOperation = 'source-over';
      bg2.globalAlpha = 1;
      bg2.clearRect(0, 0, bloom.width, bloom.height);
      bg2.globalCompositeOperation = 'lighter';
      pyr.forEach((p, k) => {
        const pc = p.getContext('2d');
        pc.setTransform(1, 0, 0, 1, 0, 0);
        pc.globalCompositeOperation = 'copy';
        pc.drawImage(src, 0, 0, p.width, p.height);
        src = p;
        bg2.globalAlpha = [0.5, 0.45, 0.4, 0.35][k];
        bg2.drawImage(p, 0, 0, bloom.width, bloom.height);
      });
      gg.setTransform(1, 0, 0, 1, 0, 0);
      gg.globalCompositeOperation = 'lighter';
      gg.drawImage(bloom, 0, 0, glow.width, glow.height);
      gg.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(glow, 0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }

    // The sheet, lit around the ball and fading into the dark ahead, with the staves on it.
    function sheet(muted) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      const c0 = proj(cam, 0, 0, 0.6) || [W / 2, H / 2];
      g.fillStyle = '#060607';
      g.fillRect(0, 0, W, H);
      const lit = g.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], Math.max(W, H) * 0.85);
      lit.addColorStop(0, '#5a5650'); lit.addColorStop(0.35, '#3a3734'); lit.addColorStop(0.7, '#1a1918'); lit.addColorStop(1, '#070708');
      g.fillStyle = lit;
      g.fillRect(0, 0, W, H);
      const far = proj(cam, 0, 0, FAR()), nearP = proj(cam, 0, 0, -1);
      if (far && nearP) {                            // darkness toward the horizon
        const fg = g.createLinearGradient(nearP[0], nearP[1], far[0], far[1]);
        fg.addColorStop(0, 'rgba(6,6,7,0)'); fg.addColorStop(0.55, 'rgba(6,6,7,0.25)'); fg.addColorStop(1, 'rgba(6,6,7,0.97)');
        g.fillStyle = fg;
        g.fillRect(0, 0, W, H);
      }

      if (!lanes.length) for (let k = -1; k <= 1; k++) staff(k * (LANE + GAP), 0.6, null);
      lanes.forEach((l) => staff(l.cx, muted[l.x] ? 0.35 : 1, l));
      grainAndVignette();
    }

    // A lane's staff: five engraved lines along time, fading into the dark.
    function staff(cx, alpha, l) {
      const z0 = portrait ? -3 : -6, z1 = FAR();
      for (let k = 0; k < 5; k++) {
        const x = cx + (k - 2) * 0.2 * SPAN * LANE, w = 0.006;
        const a = proj(cam, x - w, 0, z0), b = proj(cam, x + w, 0, z0), c = proj(cam, x + w, 0, z1), d = proj(cam, x - w, 0, z1);
        if (!a || !b || !c || !d) continue;
        const gr = g.createLinearGradient(a[0], a[1], d[0], d[1]);
        gr.addColorStop(0, `rgba(8,8,9,${0.85 * alpha})`); gr.addColorStop(0.55, `rgba(8,8,9,${0.6 * alpha})`); gr.addColorStop(1, 'rgba(8,8,9,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
        // a faint highlight on the line's near edge, as on a groove's lip
        const hb = proj(cam, x + w * 2.5, 0, z0), hc = proj(cam, x + w * 2.5, 0, z1);
        if (hb && hc) {
          const hg = g.createLinearGradient(hb[0], hb[1], hc[0], hc[1]);
          hg.addColorStop(0, `rgba(200,195,185,${0.12 * alpha})`); hg.addColorStop(0.6, 'rgba(200,195,185,0)');
          g.strokeStyle = hg; g.lineWidth = Math.max(1, dpr * 0.6);
          g.beginPath(); g.moveTo(hb[0], hb[1]); g.lineTo(hc[0], hc[1]); g.stroke();
        }
      }
      if (l && !portrait) {                          // a short bar at the lane's start, like a staff's opening line
        const a = proj(cam, cx - 0.42, 0, z0 + 0.02), b = proj(cam, cx + 0.42, 0, z0 + 0.02);
        if (a && b) { g.strokeStyle = `rgba(8,8,9,${0.7 * alpha})`; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      }
    }

    // A note: a dark disc set into the sheet until the ball lands on it, then lit for good,
    // flaring as it is hit.
    function note(it, now) {
      const { l, i, x, z, dim } = it;
      const m = disc(x, z, NOTE_R);
      if (!m) return;
      const f = fog(z) * dim;
      if (f <= 0.01) return;
      const age = now - l.ts[i], hit = age >= 0;
      const C = l.color;
      g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      if (!hit) {
        const gr = g.createRadialGradient(-0.25, -0.25, 0, 0, 0, 1);
        gr.addColorStop(0, `rgba(40,40,42,${0.95 * f})`); gr.addColorStop(0.75, `rgba(4,4,5,${0.95 * f})`); gr.addColorStop(1, `rgba(0,0,0,${0.6 * f})`);
        g.fillStyle = gr;
        g.beginPath(); g.arc(0, 0, 1, 0, 2 * Math.PI); g.fill();
        g.fillStyle = `rgba(230,225,215,${0.35 * f})`;
        g.beginPath(); g.arc(-0.35, -0.35, 0.18, 0, 2 * Math.PI); g.fill();
        g.setTransform(1, 0, 0, 1, 0, 0);
        return;
      }
      const flash = Math.exp(-age / 0.2);
      const k = (0.62 + 0.55 * flash) * f;
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, css([255, 255, 255], Math.min(1, k))); gr.addColorStop(0.45, css(C.core, Math.min(1, k)));
      gr.addColorStop(0.85, css(C.light, Math.min(1, k * 0.9))); gr.addColorStop(1, css(C.base, 0.5 * f));
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, 1 + 0.2 * flash, 0, 2 * Math.PI); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
      // its glow on the sheet around it
      gg.setTransform(m[0] / 2, m[1] / 2, m[2] / 2, m[3] / 2, m[4] / 2, m[5] / 2);
      const s = 2.8 + 1.8 * flash;
      const hg = gg.createRadialGradient(0, 0, 0, 0, 0, s);
      hg.addColorStop(0, css(C.core, 0.9 * k)); hg.addColorStop(0.18, css(C.light, 0.5 * k)); hg.addColorStop(0.5, css(C.base, 0.16 * k)); hg.addColorStop(1, css(C.base, 0));
      gg.fillStyle = hg;
      gg.beginPath(); gg.arc(0, 0, s, 0, 2 * Math.PI); gg.fill();
    }

    // The ball: its light on the sheet, its reflection in it, the path it has just flown and the
    // ball itself, a glowing sphere.
    function drawBall(it, now) {
      const { l, b, x, z, dim, lx } = it, C = l.color;
      const y = b.y + BALL_R;
      const p = proj(cam, x, y, z);
      if (!p) return;
      const f = fog(z) * dim, r = BALL_R * p[3];

      // the pool of light under it, brighter as it comes down
      const m = disc(x, z, 0.32);
      if (m) {
        const k = f * 0.55 / (1 + 6 * b.y);
        gg.setTransform(m[0] / 2, m[1] / 2, m[2] / 2, m[3] / 2, m[4] / 2, m[5] / 2);
        const pg = gg.createRadialGradient(0, 0, 0, 0, 0, 1);
        pg.addColorStop(0, css(C.light, k)); pg.addColorStop(0.4, css(C.base, k * 0.35)); pg.addColorStop(1, css(C.base, 0));
        gg.fillStyle = pg;
        gg.beginPath(); gg.arc(0, 0, 1, 0, 2 * Math.PI); gg.fill();
      }

      // the reflection: the ball mirrored under the sheet, dim and soft
      const q = proj(cam, x, -y, z);
      if (q) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        const rr = BALL_R * q[3] * 1.15;
        const rg = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
        rg.addColorStop(0, css(C.core, 0.38 * f)); rg.addColorStop(0.6, css(C.light, 0.16 * f)); rg.addColorStop(1, css(C.base, 0));
        g.fillStyle = rg;
        g.beginPath(); g.arc(q[0], q[1], rr, 0, 2 * Math.PI); g.fill();
      }

      // the path just flown
      gg.setTransform(0.5, 0, 0, 0.5, 0, 0);
      gg.lineCap = 'round';
      let last = null;
      for (let k = 0; k <= 14; k++) {
        const s = now - TRAIL * k / 14, bb = ball(l, s);
        const pp = proj(cam, lx(bb.lat), bb.y + BALL_R, (bb.at - now) * speed);
        if (pp && last) {
          gg.strokeStyle = css(C.core, 0.55 * f * (1 - k / 14));
          gg.lineWidth = Math.max(1, BALL_R * pp[3] * 0.5 * (1 - k / 16));
          gg.beginPath(); gg.moveTo(last[0], last[1]); gg.lineTo(pp[0], pp[1]); gg.stroke();
        }
        last = pp;
      }

      // the ball
      g.setTransform(1, 0, 0, 1, 0, 0);
      const bg = g.createRadialGradient(p[0] - r * 0.3, p[1] - r * 0.35, 0, p[0], p[1], r);
      bg.addColorStop(0, css([255, 255, 255], f)); bg.addColorStop(0.5, css(C.core, f)); bg.addColorStop(1, css(C.light, f));
      g.fillStyle = bg;
      g.beginPath(); g.arc(p[0], p[1], r, 0, 2 * Math.PI); g.fill();
      gg.setTransform(1, 0, 0, 1, 0, 0);
      const hr = r * 3.6 / 2;
      const hg = gg.createRadialGradient(p[0] / 2, p[1] / 2, 0, p[0] / 2, p[1] / 2, hr);
      hg.addColorStop(0, css(C.core, 0.95 * f)); hg.addColorStop(0.25, css(C.light, 0.45 * f)); hg.addColorStop(1, css(C.base, 0));
      gg.fillStyle = hg;
      gg.beginPath(); gg.arc(p[0] / 2, p[1] / 2, hr, 0, 2 * Math.PI); gg.fill();
    }

    function grainAndVignette() {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = 0.18;
      g.fillStyle = grainPattern();
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    }

    return view;
  }

  root.NoteBounce = { create };
})(typeof window !== 'undefined' ? window : globalThis);
