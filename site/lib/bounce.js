// A bouncing-ball view of a tune: each voice's notes lie on a dark sheet as discs on a staff, a
// glowing ball hops in an arc from each note to the next and lands as the note sounds, and a
// note lights up when the ball hits it. Where a voice's pitch moves while a note sounds (a bend,
// a vibrato, a slide), a line on the sheet shows it, and the ball rides the line until it hops
// to the next note. The camera keeps one angle and moves with the music: time runs away from
// the viewer on a canvas taller than wide (a phone) and to the right on a wider one. Glow, bloom
// and the ball's reflection are drawn with the 2D canvas alone: the bright parts are drawn again
// on a second canvas, shrunk in steps and added back enlarged. No dependencies. Exposes
// NoteBounce (window.NoteBounce on a page; globalThis.NoteBounce in node, for tests).
//
//   const view = NoteBounce.create(canvas, { colors })
//     canvas  the canvas to draw on; its CSS size decides the shape, and the view follows it
//     colors  optional: one CSS hex colour a voice ('#1f5fa8'), as the page's other displays
//             colour them
//   view.score({ rate, voices })   the tune: rate ticks a second, and per voice { notes, line,
//             level }. notes: each { t, n }, the tick it starts on and its pitch in semitones
//             (any origin; 0 = C0 in the SID player). line, optional: the voice's pitch at each
//             tick, NaN where it is silent; a step in it to a new pitch that holds is a note
//             too (an instrument playing an arpeggio of its own on one note of the track).
//             level, optional: its loudness at each tick, 0 to 1, which the line, the ball's
//             glow and each lit note's follow. A voice with no notes gets no lane. null clears
//             the view
//   view.draw(t, { muted })        draws the tune at tick t (fractional), with muted[x] true for
//             a voice to draw dimmed; with no score, draws the empty sheet and the message
//   view.message                   the text drawn on an empty sheet
//   view.ballAt(x, t)              voice x's ball at tick t, { i, lat, y, at, loud }: the note it last
//             landed on (-1 before the first), its place across the lane (-0.5 to 0.5), its
//             height, the tick of the point under it and the loudness its glow shows (0 to 1),
//             for tests
//   view.notesOf(x)                voice x's notes as the view takes them, given and found in
//             the line, [{ t, n }], for tests
// Everything drawn is a function of t alone, so a page can seek, pause or loop without telling
// the view anything but the tick.
// Camera sliders, for choosing new angles for CAMS below, are in site/lib/bounce-tune.js. They are
// off: a page whose address ends in ?camera loads them from beside this file, over every view.
(function (root) {
  'use strict';

  const DEFAULT_COLORS = ['#1f5fa8', '#c25a00', '#2a8a4a'];
  const LANE = 1, GAP = 0.38;                      // world units: a lane's width, the gap between lanes
  const SPAN = 0.84;                               // the part of a lane the notes use
  const NOTE_R = 0.064, BALL_R = 0.056;
  const HOP_MOST = 0.42;                           // seconds: the longest hop; before it, the ball rides the line
  const RISE = 0.35, FLOAT = 0.45;                 // a floating ball: seconds to rise, its height
  const SMOOTH = 0.12, SETTLE = 0.06;              // seconds: the stretch of line a riding ball follows the
                                                   // average of, and the time it takes to settle onto it
  const HEARD = 1 / 255;                           // a level below this is silence: an envelope at 0
  const STEP = 0.5, HELD = 0.25;                   // semitones: a step to a new note, and the most a held
                                                   // note moves in a tick
  const GROOVE = 0.011, LIT = 0.013, LIT_GLOW = 0.045;   // half-widths of the line, world units
  const TRAIL = 0.3;                               // seconds of the ball's path drawn behind it
  const GLOW_FALL = 0.25;                          // seconds: how fast a glow fades after its voice goes quiet
  const GLOW_LEAST = 0.15;                         // the glow of a silent voice, against a voice at full volume
  // the camera for each shape of canvas: yaw turns it (0 looks along time), pitch tilts it down,
  // fov is the lens's height in radians, (ax, ay) is where the ball's point sits on the canvas
  // (-1 to 1 from the middle, ay down) and zoom brings it nearer than the distance that fits
  const CAMS = {
    tall: { yaw: 1.06, pitch: 0.63, fov: 1.06, ax: -0.04, ay: 0.17, zoom: 0.9 },
    wide: { yaw: 1, pitch: 0.86, fov: 0.7, ax: -0.3, ay: 0.08, zoom: 1 },
  };

  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : +a.toFixed(3)})`;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };

  // the camera sliders: wanted when the address asks for them, found beside this file
  const TUNE = typeof location !== 'undefined' && /[?&]camera(=|&|$)/.test(location.search);
  const HERE = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
  let tuneLoading = false;
  function sliders(canvas) {
    if (root.NoteBounceTune) { root.NoteBounceTune.add(canvas); return; }
    if (tuneLoading || !HERE) return;
    tuneLoading = true;                          // when it loads, it finds every view on the page
    const sc = document.createElement('script');
    sc.src = new URL('bounce-tune.js', HERE).href;
    document.head.appendChild(sc);
  }

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
    let lanes = [], rate = 50, speed = 2, cam = null, last = [0, null];   // last: the tick and options drawn
    const view = { message: 'Choose a tune to start.', score, draw, ballAt, notesOf };
    const cams = { tall: Object.assign({}, CAMS.tall), wide: Object.assign({}, CAMS.wide) };

    // ------------------------------------------------------------------ the tune
    // Lanes, one a voice with notes: each note's time in seconds and place across the lane, when
    // its sound ends, the line as places across the lane, and the speed at which the sheet
    // moves, set so that the usual gap between notes is a few discs.
    function score(s) {
      lanes = [];
      if (!s || !s.voices) return;
      rate = s.rate || 50;
      const gaps = [];
      s.voices.forEach((v, x) => {
        if (!v) return;
        const line = v.line || null, level = v.level || null;
        const heard = (k) => k >= 0 && k < line.length && line[k] === line[k] && (!level || level[k] >= HEARD);
        const notes = line ? withSteps(v.notes || [], line, heard) : (v.notes || []).slice();
        if (!notes.length) return;
        let lo = Infinity, hi = -Infinity;
        for (const e of notes) { if (e.n < lo) lo = e.n; if (e.n > hi) hi = e.n; }
        if (hi - lo < 12) { const c = (lo + hi) / 2; lo = c - 6; hi = c + 6; }
        lo -= 1; hi += 1;
        if (line) {                                  // a line that mostly lies outside the notes (a
          const p = [];                              // sweep, a chord a tick a note) widens the lane
          for (let k = 0; k < line.length; k++) if (heard(k)) p.push(line[k]);
          if (p.length > 20 && p.filter((n) => n >= lo && n <= hi).length < 0.75 * p.length) {
            p.sort((a, b) => a - b);
            lo = Math.min(lo, p[Math.floor(p.length * 0.05)] - 1);
            hi = Math.max(hi, p[Math.ceil(p.length * 0.95) - 1] + 1);
          }
        }
        const place = (n) => (n - lo) / (hi - lo) - 0.5;
        const ts = new Float64Array(notes.length), ps = new Float64Array(notes.length);
        notes.forEach((e, i) => {
          ts[i] = e.t / rate; ps[i] = place(e.n);
          if (i) gaps.push(ts[i] - ts[i - 1]);
        });
        // the line, NaN where silent or off the lane (a bend that falls far below the notes, as
        // far as the frequency register wrapping round), and where it joins the next tick:
        // everywhere it sounds but at a step to a pitch that then holds, so that a new note
        // starts a new stretch of line while a bend or a chord played a tick a note at a time
        // stays one
        let lp = null, lv = null, lg = null, join = null;
        if (line) {
          lp = new Float32Array(line.length); lv = new Float32Array(line.length); join = new Uint8Array(line.length);
          for (let k = 0; k < line.length; k++) {
            const p = heard(k) ? place(line[k]) : NaN;
            lp[k] = Math.abs(p) <= 0.6 ? p : NaN;
            lv[k] = level ? clamp(level[k], 0, 1) : 1;
          }
          for (let k = 0; k + 1 < line.length; k++) {
            if (!(lp[k] === lp[k]) || !(lp[k + 1] === lp[k + 1])) continue;
            const d = Math.abs(line[k + 1] - line[k]);
            join[k] = d >= STEP && heard(k + 2) && Math.abs(line[k + 2] - line[k + 1]) < HELD ? 0 : 1;
          }
        }
        // the loudness the glow shows: the level, falling away over a quarter of a second once
        // the voice is quieter, so that it holds through the gaps between notes but not a rest
        if (level) {
          lg = new Float32Array(level.length);
          const fall = Math.exp(-1 / (rate * GLOW_FALL));
          let peak = 0;
          for (let k = 0; k < level.length; k++) lg[k] = peak = Math.max(clamp(level[k] || 0, 0, 1), peak * fall);
        }
        // when each note's sound ends: where the voice falls silent (after an attack that may
        // take half a second to be heard), or at the next note; with no line, at the next note,
        // or a second after the last
        const ends = new Float64Array(notes.length);
        notes.forEach((e, i) => {
          const next = i + 1 < notes.length ? notes[i + 1].t : Infinity;
          if (!lp) { ends[i] = Math.min(next, e.t + rate) / rate; return; }
          let k = Math.floor(e.t) + 1;
          while (k < next && k <= e.t + rate / 2 && !heard(k)) k++;
          while (k < next && heard(k)) k++;
          ends[i] = Math.min(k, next) / rate;
        });
        lanes.push({ x, notes, ts, ps, lp, lv, lg, join, ends, color: COLORS[x % COLORS.length] });
      });
      gaps.sort((a, b) => a - b);
      const typical = gaps.length ? gaps[gaps.length >> 1] : 0.25;
      speed = clamp(0.3 / Math.max(typical, 0.02), 0.8, 2.6);
      lanes.forEach((l, k) => { l.cx = ((lanes.length - 1) / 2 - k) * (LANE + GAP); });
      cam = null;
    }

    // The notes, and a note wherever the line steps from one held pitch to another that holds
    // for three ticks: an instrument that plays a melody of its own on one note of the track (an
    // arpeggio, a pitch program). A chord played a tick or two a note at a time is not one, so
    // as not to crowd the sheet, nor is a slide or a bend.
    function withSteps(notes, line, heard) {
      const out = notes.slice(), near = new Set();
      for (const e of notes) for (let d = -2; d <= 2; d++) near.add(Math.round(e.t) + d);
      for (let k = 2; k + 2 < line.length; k++) {
        if (near.has(k) || !heard(k - 2) || !heard(k - 1) || !heard(k) || !heard(k + 1) || !heard(k + 2)) continue;
        const a = line[k - 2], b = line[k - 1], c = line[k];
        if (Math.abs(c - b) >= STEP && Math.abs(b - a) < HELD && Math.abs(line[k + 1] - c) < HELD &&
          Math.abs(line[k + 2] - c) < HELD) out.push({ t: k, n: c });
      }
      return out.sort((p, q) => p.t - q.t);
    }

    function notesOf(x) {
      const l = lanes.find((q) => q.x === x);
      return l ? l.notes.map((e) => ({ t: e.t, n: e.n })) : null;
    }

    // The note at or before time s (seconds), by halving: -1 before the first.
    function before(ts, s) {
      let a = 0, b = ts.length - 1;
      if (!ts.length || s < ts[0]) return -1;
      while (a < b) { const m = (a + b + 1) >> 1; if (ts[m] <= s) a = m; else b = m - 1; }
      return a;
    }

    // The line's place across the lane at time q (seconds), straight between ticks; NaN where
    // the voice is silent.
    function lineAt(lp, q) {
      const k = q * rate, k0 = Math.floor(k), f = k - k0;
      let v0 = k0 >= 0 && k0 < lp.length ? lp[k0] : NaN, v1 = k0 + 1 < lp.length ? lp[k0 + 1] : NaN;
      if (!(v0 === v0)) v0 = v1;
      if (!(v1 === v1)) v1 = v0;
      return v0 + (v1 - v0) * f;
    }

    // Where a ball that landed on note i rides at time s: along the line while the note sounds,
    // following its average over the last SMOOTH, so that a chord played a tick a note at a time
    // does not shake it, and settling onto it from the note's place; where the line is off the
    // lane, and once the sound has ended, where it last was.
    function ride(l, i, s) {
      const a = l.ts[i], p = l.ps[i];
      if (!l.lp) return p;
      const u = Math.min(s, l.ends[i] - 0.5 / rate);
      if (u <= a) return p;
      let sum = 0, n = 0;
      for (let j = 0; j < 8; j++) {
        const v = lineAt(l.lp, Math.max(a, u - SMOOTH * j / 7));
        if (v === v) { sum += v; n++; }
      }
      let v = n ? sum / n : NaN;
      for (let k = Math.floor(u * rate), stop = Math.max(a * rate, k - 2 * rate); !(v === v) && k >= stop; k--) v = l.lp[k];
      return v === v ? p + (v - p) * Math.min(1, (u - a) / SETTLE) : p;
    }

    const bob = (s, k) => 0.025 * Math.sin(2 * Math.PI * 0.7 * s) * k;

    // The ball over a lane at time s. On its way, it floats before the first note; after a note
    // it rides the line on the sheet until the note's sound ends, then rises and floats, keeping
    // pace with the music. For the last HOP_MOST before the next note, at most, it is in the air
    // on an arc from there that lands on the note as it starts.
    function ball(l, s) {
      const { ts, ps } = l, i = before(ts, s);
      const a = i < 0 ? -Infinity : ts[i], b = i + 1 < ts.length ? ts[i + 1] : Infinity;
      const pa = ps[Math.max(i, 0)], pb = ps[Math.min(i + 1, ts.length - 1)];
      let lat = pb, y = FLOAT + bob(s, 1);
      if (i >= 0) {
        const e = l.ends[i], v = (s - e) / RISE;
        lat = ride(l, i, s);
        y = s <= e ? 0 : FLOAT * (v >= 1 ? 1 : 1 - (1 - v) * (1 - v)) + bob(s, Math.min(1, v));
      }
      const hop = Math.min(b - a, HOP_MOST), leave = b - hop;
      if (!(s > leave)) return { i, lat, y, at: s };
      const u = (s - leave) / hop;
      const dz = hop * speed, dx = (pb - pa) * SPAN;
      const peak = Math.min(0.55, 0.05 + 0.42 * Math.hypot(dz, dx));
      return { i, lat: lat + (pb - lat) * u, y: y * (1 - u) + peak * 4 * u * (1 - u), at: s };
    }

    // how loud the voice is at time s, as its glow shows it: 1 with no levels given
    function loud(l, s) {
      const lg = l.lg;
      if (!lg) return 1;
      const k = s * rate, k0 = Math.floor(k);
      if (k0 < 0) return lg.length ? lg[0] : 0;
      if (k0 + 1 >= lg.length) return lg.length ? lg[lg.length - 1] : 0;
      return lg[k0] + (lg[k0 + 1] - lg[k0]) * (k - k0);
    }
    const glowOf = (v) => GLOW_LEAST + (1 - GLOW_LEAST) * v;

    function ballAt(x, t) {
      const l = lanes.find((q) => q.x === x);
      if (!l) return null;
      const b = ball(l, t / rate);
      return { i: b.i, lat: b.lat, y: b.y, at: b.at * rate, loud: loud(l, t / rate) };
    }

    // ------------------------------------------------------------------ the camera
    // One fixed angle per shape: from behind, above and a little to the side on a tall canvas, so
    // that time runs up and to the right, and from the side on a wide one, looking a little ahead
    // so that most of what shows is to come. The distance is found by halving until the lanes
    // around the ball, and the top of its arc, fit the canvas; on a tall one the lanes may run off
    // its right edge where they come nearest.
    function camera() {
      const n = Math.max(lanes.length, 3);           // one or two lanes keep the size they have among three
      const half = (n * LANE + (n - 1) * GAP) / 2;
      const P = Object.assign({}, cams[portrait ? 'tall' : 'wide'], { keys: portrait
        ? [[-half - 0.02, 0, 0], [half - 0.15, 0, 0.3], [0, 0.7, 0], [-half + 0.3, 0, -0.4]]
        : [[-half - 0.1, 0, -0.4], [half + 0.1, 0, -0.4], [-half - 0.1, 0, 1.2], [half + 0.1, 0, 0.8], [half, 0.7, 0]] });
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
      return at(hi / (P.zoom || 1));
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
    const FAR = () => portrait ? 18 : 12;
    const fog = (z) => clamp(1 - (z - FAR() * 0.55) / (FAR() * 0.45), 0, 1);

    function draw(t, opts) {
      last = [t, opts];
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
      const back = 2.2, ahead = FAR();

      // the lines, on the sheet under everything else
      // higher notes lie toward +x: up and to the left on a tall canvas, as on a page seen from
      // its left edge, and up (farther) on a wide one, as on a page seen from its foot
      const lxOf = (l) => (p) => l.cx + p * SPAN * LANE;
      lanes.forEach((l) => { if (l.lp) line(l, now, back, ahead, muted[l.x] ? 0.3 : 1, lxOf(l)); });

      // everything that stands up, far to near, so that nearer things cover farther ones
      const items = [];
      lanes.forEach((l) => {
        const dim = muted[l.x] ? 0.3 : 1;
        const lx = lxOf(l);
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
      const c0 = proj(cam, 0, 0, portrait ? 2.5 : 0.6) || [W / 2, H / 2];
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
      const z0 = portrait ? -4 : -6, z1 = FAR();
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

    // A voice's line: where its pitch goes while it sounds, through and between the notes.
    // Ahead of the ball it is a groove in the sheet; behind, it is lit, brighter where the voice
    // was louder and where the ball has just passed. Drawn in bands of depth, each a stroke of
    // the width the camera sees there, and behind the ball by brightness too.
    function line(l, now, back, ahead, dim, lx) {
      const { lp, lv, join } = l, C = l.color, kn = now * rate;
      const k0 = Math.max(0, Math.floor((now - back / speed) * rate));
      const k1 = Math.min(lp.length - 1, Math.ceil((now + ahead / speed) * rate));
      const groups = new Map();
      const pt = (k, v) => proj(cam, lx(v), 0, (k / rate - now) * speed);
      const add = (ka, va, kb, vb, k) => {
        const A = pt(ka, va), B = pt(kb, vb);
        if (!A || !B) return;
        const band = Math.floor(((ka + kb) / 2 / rate - now) * speed);
        let key = band;
        if (kb <= kn + 1e-6) {                       // behind the ball: lit
          const age = now - kb / rate;
          const a = (0.3 + 0.7 * lv[k]) * (0.7 + 0.3 * Math.exp(-age / 0.25));
          key = 1000 + (band + 50) * 16 + Math.round(a * 10);
        }
        let g2 = groups.get(key);
        if (!g2) groups.set(key, g2 = []);
        g2.push(A[0], A[1], B[0], B[1]);
      };
      for (let k = k0; k <= k1; k++) {
        const v = lp[k];
        if (!(v === v) || !join[k] && !(k && join[k - 1])) continue;   // a lone tick would be a speck
        const ve = join[k] ? lp[k + 1] : v;          // a tick holds its pitch until the next joins it
        if (k < kn && kn < k + 1) {                  // where the ball is: split into lit and not
          const vm = v + (ve - v) * (kn - k);
          add(k, v, kn, vm, k); add(kn, vm, k + 1, ve, k);
        } else add(k, v, k + 1, ve, k);
      }
      const width = (band) => { const q = proj(cam, l.cx, 0, band + 0.5); return q ? q[3] : 0; };
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.lineCap = gg.lineCap = 'round'; g.lineJoin = gg.lineJoin = 'round';
      gg.setTransform(0.5, 0, 0, 0.5, 0, 0);
      groups.forEach((seg, key) => {
        const lit = key >= 1000, band = lit ? Math.floor((key - 1000) / 16) - 50 : key;
        const s = width(band);
        if (!s) return;
        const stroke = (c) => { c.beginPath(); for (let i = 0; i < seg.length; i += 4) { c.moveTo(seg[i], seg[i + 1]); c.lineTo(seg[i + 2], seg[i + 3]); } c.stroke(); };
        if (!lit) {
          const f = fog(band + 0.5) * dim;
          if (f <= 0.01) return;
          g.strokeStyle = `rgba(8,8,9,${(0.8 * f).toFixed(3)})`;
          g.lineWidth = Math.max(1, 2 * GROOVE * s);
          stroke(g);
          return;
        }
        const a = ((key - 1000) % 16) / 10 * dim;
        g.strokeStyle = css(C.core, a);
        g.lineWidth = Math.max(1, 2 * LIT * s);
        stroke(g);
        gg.strokeStyle = css(C.light, 0.4 * a);
        gg.lineWidth = Math.max(1, 2 * LIT_GLOW * s);
        stroke(gg);
      });
      gg.setTransform(1, 0, 0, 1, 0, 0);
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
      const v = glowOf(loud(l, l.ts[i] + 1 / rate));   // as loud as the note sounds once it starts
      const k = (0.62 + 0.55 * flash) * f * (0.5 + 0.5 * v);
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
      const kg = k * v;
      hg.addColorStop(0, css(C.core, 0.9 * kg)); hg.addColorStop(0.18, css(C.light, 0.5 * kg)); hg.addColorStop(0.5, css(C.base, 0.16 * kg)); hg.addColorStop(1, css(C.base, 0));
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
      const gl = f * glowOf(loud(l, b.at));        // its light: as bright as its voice is loud

      // the pool of light under it, brighter as it comes down
      const m = disc(x, z, 0.32);
      if (m) {
        const k = gl * 0.4 / (1 + 6 * b.y);
        gg.setTransform(m[0] / 2, m[1] / 2, m[2] / 2, m[3] / 2, m[4] / 2, m[5] / 2);
        const pg = gg.createRadialGradient(0, 0, 0, 0, 0, 1);
        pg.addColorStop(0, css(C.light, k)); pg.addColorStop(0.4, css(C.base, k * 0.35)); pg.addColorStop(1, css(C.base, 0));
        gg.fillStyle = pg;
        gg.beginPath(); gg.arc(0, 0, 1, 0, 2 * Math.PI); gg.fill();
      }

      // the reflection: the ball mirrored under the glossy sheet, its highlight mirrored too,
      // a little dimmer the higher the ball
      const q = proj(cam, x, -y, z);
      if (q) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        const rr = BALL_R * q[3], k = f * 0.95 / (1 + 0.8 * b.y);
        const rg = g.createRadialGradient(q[0] - rr * 0.3, q[1] + rr * 0.35, 0, q[0], q[1], rr * 1.05);
        rg.addColorStop(0, css(C.core, 0.8 * k)); rg.addColorStop(0.45, css(C.light, 0.75 * k));
        rg.addColorStop(0.85, css(C.base, 0.6 * k)); rg.addColorStop(1, css(C.base, 0));
        g.fillStyle = rg;
        g.beginPath(); g.arc(q[0], q[1], rr * 1.05, 0, 2 * Math.PI); g.fill();
        gg.setTransform(1, 0, 0, 1, 0, 0);            // and a little of its light
        const qg = gg.createRadialGradient(q[0] / 2, q[1] / 2, 0, q[0] / 2, q[1] / 2, rr * 1.2);
        qg.addColorStop(0, css(C.light, 0.25 * gl * 0.95 / (1 + 0.8 * b.y))); qg.addColorStop(1, css(C.base, 0));
        gg.fillStyle = qg;
        gg.beginPath(); gg.arc(q[0] / 2, q[1] / 2, rr * 1.2, 0, 2 * Math.PI); gg.fill();
      }

      // the path just flown
      gg.setTransform(0.5, 0, 0, 0.5, 0, 0);
      gg.lineCap = 'round';
      let last = null;
      for (let k = 0; k <= 14; k++) {
        const s = now - TRAIL * k / 14, bb = ball(l, s);
        const pp = proj(cam, lx(bb.lat), bb.y + BALL_R, (bb.at - now) * speed);
        if (pp && last) {
          gg.strokeStyle = css(C.core, 0.55 * gl * (1 - k / 14));
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
      const hr = r * 3.6 / 2;                       // its glow, half what the notes give
      const hg = gg.createRadialGradient(p[0] / 2, p[1] / 2, 0, p[0] / 2, p[1] / 2, hr);
      hg.addColorStop(0, css(C.core, 0.48 * gl)); hg.addColorStop(0.25, css(C.light, 0.22 * gl)); hg.addColorStop(1, css(C.base, 0));
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

    // the camera sliders read and set the camera of the canvas's present shape through this
    view.tuning = {
      get: () => Object.assign({ shape: portrait ? 'tall' : 'wide' }, cams[portrait ? 'tall' : 'wide']),
      set: (p) => { Object.assign(cams[portrait ? 'tall' : 'wide'], p); cam = null; baseKey = ''; draw(last[0], last[1]); },
    };
    canvas.noteBounce = view;
    if (TUNE || root.BOUNCE_TUNE) sliders(canvas);

    return view;
  }

  root.NoteBounce = { create };
})(typeof window !== 'undefined' ? window : globalThis);
