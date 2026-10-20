// The Apple II's speaker for game pages: a model of the speaker, a player for a recording of every
// click a game made, and a drawing of what it played. No dependencies. Exposes Apple2Speaker
// (window.Apple2Speaker on a page; globalThis.Apple2Speaker in node, for tests).
//
// A recording is the log the kit's Apple2TS server makes (`sound`, kit/skills/apple2/tool-apple2ts,
// format kit-apple2-sound): { clock, start, end, speaker: [cycle, ...] }, the cycle of each access
// to the speaker, at the machine's 1,020,484 cycles a second. A page that runs a game's own sound
// code on the kit's 6502 makes the same log from the accesses it sees. pack() and unpack() turn a
// log into { clock, start, end, d: [cycles since the click before, ...] } (the first since start)
// and back, the form a page embeds.
//
// The model is the speaker's rule in kit/skills/apple2/apple2-reference, "The speaker": every access
// moves the cone to its other side, so two make one cycle of a square wave, and a tone of f Hz is an
// access every clock / (2f) cycles. render() holds the cone at one side or the other between clicks
// and averages it over each output sample exactly, so a click between two samples is neither lost
// nor moved. Then a high-pass of one pole at 20 Hz takes out the steady level a cone left at one
// side puts in the output, which nobody hears. Not modelled: the speaker's own response and the
// circuit that drives it.
// kit/apple2/test_speaker.js holds the model to that rule.
//
//   clicks(log)          the clicks' times in seconds from the log's start
//   notes(log)           what the clicks play: [{ t, dur, hz, clicks }], a note being a run of clicks
//                        whose spacing stays within a quarter of the run's first; hz is the square
//                        wave's, clock / (2 x the mean spacing)
//   hz(cycles)           the pitch of clicks that many cycles apart
//   render(log, rate)    Float32Array: the output at `rate` samples a second, to 50 ms after the end
//   mount(el, opts)      a player: a button for each of opts.tunes ({ name, log }), a stop button and
//                        a drawing of the notes (rows by pitch) with each click as a tick along the
//                        foot, its playhead moving as the sound plays. opts.onTime(t, tune) is called
//                        each animation frame while a sound plays, and with t = null when it stops.
//                        opts.buttons false leaves the buttons out, for a page that starts them
//                        itself. Returns { play(i), stop(), draw(i), set(i, log) }.
(function (root) {
  'use strict';
  const CLOCK = 1020484;          // cycles a second (apple2-reference, "The speaker")
  const LEVEL = 0.25;             // the cone's two sides in the output, -LEVEL and +LEVEL
  const HIGHPASS = 20;            // Hz: the steady level's filter
  const TAIL = 0.05;              // seconds rendered after the log's end

  function pack(log) {
    const d = [];
    let at = log.start;
    for (const c of log.speaker) { d.push(c - at); at = c; }
    return { clock: log.clock || CLOCK, start: log.start, end: log.end, d };
  }
  function unpack(p) {
    if (p.speaker) return p;
    const speaker = [];
    let at = p.start;
    for (const d of p.d) { at += d; speaker.push(at); }
    return { format: 'kit-apple2-sound', clock: p.clock || CLOCK, start: p.start, end: p.end, speaker };
  }

  const hz = (cycles, clock = CLOCK) => clock / (2 * cycles);
  function clicks(log) {
    log = unpack(log);
    return log.speaker.map(c => (c - log.start) / log.clock);
  }

  function notes(log) {
    log = unpack(log);
    const s = log.speaker, out = [];
    let i = 0;
    while (i + 1 < s.length) {
      const first = s[i + 1] - s[i];
      if (first <= 0) { i++; continue; }
      let j = i + 1;
      while (j + 1 < s.length) {
        const gap = s[j + 1] - s[j];
        if (Math.abs(gap - first) > first / 4) break;
        j++;
      }
      // a run of one spacing is a lone pair of clicks: a note only if it is short enough to hear
      if (j - i >= 2 || hz(first, log.clock) >= 40) {
        out.push({ t: (s[i] - log.start) / log.clock, dur: (s[j] - s[i]) / log.clock,
          hz: hz((s[j] - s[i]) / (j - i), log.clock), clicks: j - i + 1 });
      }
      i = j;
    }
    return out;
  }

  function render(log, rate) {
    log = unpack(log);
    const len = (log.end - log.start) / log.clock;
    const n = Math.ceil((len + TAIL) * rate), out = new Float32Array(n);
    const per = log.clock / rate;               // cycles a sample
    let level = -LEVEL, k = 0;
    const s = log.speaker;
    for (let i = 0; i < n; i++) {
      const a = log.start + i * per, b = a + per;
      let at = a, sum = 0;
      while (k < s.length && s[k] < b) {
        if (s[k] > at) { sum += level * (s[k] - at); at = s[k]; }
        level = -level; k++;
      }
      sum += level * (b - at);
      out[i] = sum / per;
    }
    // the high-pass: y[i] = r (y[i-1] + x[i] - x[i-1])
    const r = 1 / (1 + 2 * Math.PI * HIGHPASS / rate);
    let px = out[0], py = 0;
    out[0] = 0;
    for (let i = 1; i < n; i++) {
      const x = out[i];
      py = r * (py + x - px); px = x;
      out[i] = py;
    }
    return out;
  }

  function mount(el, opts) {
    const tunes = opts.tunes.map(t => ({ name: t.name, log: unpack(t.log) }));
    if (!document.querySelector('style.a2spk-style')) {
      const st = document.createElement('style');
      st.className = 'a2spk-style';
      st.textContent = `.a2spk-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0}
.a2spk-bar button{font:inherit;padding:.25rem .7rem;border:1px solid #555;background:#1c1c1c;color:#eee;border-radius:3px;cursor:pointer}
.a2spk-bar button.on{background:#2e7d32;border-color:#4caf50}
.a2spk-clock{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.8}
.a2spk-roll{display:block;width:100%;height:200px;border-radius:3px}`;
      document.head.appendChild(st);
    }
    el.classList.add('a2spk');
    const bar = document.createElement('div');
    bar.className = 'a2spk-bar';
    const buttons = tunes.map((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '▶ ' + t.name;
      b.onclick = () => play(i);
      if (opts.buttons !== false) bar.appendChild(b);
      return b;
    });
    const stopB = document.createElement('button');
    stopB.type = 'button';
    stopB.textContent = '■ Stop';
    stopB.onclick = () => stop();
    bar.appendChild(stopB);
    const clock = document.createElement('span');
    clock.className = 'a2spk-clock';
    bar.appendChild(clock);
    const canvas = document.createElement('canvas');
    canvas.className = 'a2spk-roll';
    el.append(bar, canvas);

    let ctx = null, src = null, started = 0, playing = -1, shown = 0, raf = 0;
    const cache = new Map();
    function draw(i, t) {
      shown = i;
      const tune = tunes[i], ns = notes(tune.log), cs = clicks(tune.log);
      const len = (tune.log.end - tune.log.start) / tune.log.clock;
      const W = canvas.clientWidth || 640, H = 200, dpr = root.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
      const FOOT = 18, hs = ns.map(n => n.hz);
      const lo = Math.log2((hs.length ? Math.min(...hs) : 100) / 1.2), hi = Math.log2((hs.length ? Math.max(...hs) : 1000) * 1.2);
      const X = s => s / (len || 1) * W, Y = f => (H - FOOT - 6) - (Math.log2(f) - lo) / (hi - lo || 1) * (H - FOOT - 16);
      g.strokeStyle = '#222'; g.lineWidth = 1;
      const step = len > 4 ? 1 : len > 0.4 ? 0.1 : 0.01;
      for (let s = 0; s < len; s += step) { g.beginPath(); g.moveTo(X(s), 0); g.lineTo(X(s), H); g.stroke(); }
      g.fillStyle = '#e8a33d';
      for (const n of ns) g.fillRect(X(n.t), Y(n.hz) - 2, Math.max(1.5, X(n.dur)), 4);
      // every click, along the foot
      g.fillStyle = '#777';
      for (const c of cs) g.fillRect(X(c), H - FOOT + 4, 1, FOOT - 8);
      if (t != null) { g.fillStyle = '#fff'; g.fillRect(X(t), 0, 2, H); }
      clock.textContent = (t != null ? t.toFixed(2) + ' / ' : '') + len.toFixed(2) + ' s';
    }
    function stop() {
      if (src) { try { src.stop(); } catch (e) { /* already stopped */ } src = null; }
      cancelAnimationFrame(raf);
      if (playing >= 0) { buttons[playing].classList.remove('on'); if (opts.onTime) opts.onTime(null, playing); }
      playing = -1;
      draw(shown, null);
    }
    function play(i) {
      stop();
      ctx = ctx || new (root.AudioContext || root.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (!cache.has(i)) cache.set(i, render(tunes[i].log, ctx.sampleRate));
      const data = cache.get(i), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.getChannelData(0).set(data);
      src = ctx.createBufferSource(); src.buffer = buf;
      src.connect(ctx.destination);
      started = ctx.currentTime + 0.05; src.start(started);
      playing = i; buttons[i].classList.add('on');
      src.onended = () => { if (playing === i) stop(); };
      const tick = () => {
        if (playing !== i) return;
        const t = Math.min(Math.max(0, ctx.currentTime - started), (tunes[i].log.end - tunes[i].log.start) / tunes[i].log.clock);
        draw(i, t);
        if (opts.onTime) opts.onTime(t, i);
        raf = requestAnimationFrame(tick);
      };
      tick();
    }
    draw(0, null);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (playing < 0) draw(shown, null); }).observe(canvas);
    return {
      play, stop, draw: i => draw(i, null),
      set(i, log) { tunes[i].log = unpack(log); cache.delete(i); if (playing < 0 && shown === i) draw(i, null); },
    };
  }

  root.Apple2Speaker = { CLOCK, LEVEL, HIGHPASS, pack, unpack, clicks, notes, hz, render, mount };
}(typeof window !== 'undefined' ? window : globalThis));
