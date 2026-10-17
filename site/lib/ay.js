// The ZX Spectrum 128's sound chip for game pages: a model of the AY-3-8912 and the beeper, a
// player for a recording of what a game's sound driver wrote to them, and a piano roll of what
// they played. No dependencies. Exposes SpectrumAY (window.SpectrumAY on a page;
// globalThis.SpectrumAY in node, for tests).
//
// A recording (format kit-ay-calls) is { clock, hz, calls: [[reg, value, reg, value, ...], ...] }:
// one entry for each time the game's driver ran, hz of them a second (the interrupt's 50.02 on a
// 128K, kit/skills/spectrum/zx-spectrum-reference, "Timing"), each listing the driver's writes in
// order. reg 0 to 15 is the AY register as the reference's "The AY-3-8912" numbers it; 16 is the
// beeper, the value being bit 4 of the byte written to port $FE. A call's writes take effect
// together at its start: a driver's run is a few hundred microseconds. pack() keeps only the
// writes that change something, as { clock, hz, n, w: 'r vv r vv,...' }, the form a page embeds,
// and unpack() turns it back into calls.
//
// The model, and what it rests on. Measured in ZEsarUX 13.0 on 17 October 2026 by writing the
// registers from a test loop and reading its --aofile output (312 samples a frame at 8 bits):
//   - A tone is a square wave of clock / (16 TP), TP the 12-bit period of R0-R1, R2-R3 or R4-R5;
//     0 counts as 1. Period 256 came out at 430.7 Hz, the formula's 433.0 with the clock at
//     half the 128K's CPU clock (3.5469 MHz / 2 = 1.77345 MHz): half a per cent apart.
//   - The noise shifts at clock / (16 NP), NP the five bits of R6: at NP = 16 the output changed
//     level 66 times a frame, against 69 for a random bit at every shift.
//   - R7's low six bits turn off the tones of A, B and C (bits 0-2) and their noise (bits 3-5);
//     a channel sounds when what is left on is high. A channel with both off is held high, so it
//     sounds only when its volume changes (not measured).
//   - Each channel's level, for the volumes 15 down to 7 of R8-R10: 24, 20, 16, 14, 10, 8, 6, 4
//     and 3 units. Below that ZEsarUX's eight bits do not resolve the steps (6 and 5 gave 2,
//     4 to 2 gave 1, 1 gave nothing), and VOLUME continues the curve at about 2.5 dB a step,
//     within half a unit of each of those.
//   - The beeper's swing is 100 units against 48 for a channel at full volume.
// Not modelled: the envelope (R11-R13, and bit 4 of a volume, which decode() reports as env and
// render() plays at the volume's low four bits); the taps of the noise's 17-bit shift register,
// bits 0 and 3, which no measurement here checks; and everything after the chip. A high pass at
// 20 Hz stands in for the speaker and amplifier, so that a held level fades and a step clicks.
//
//   decode(log)          [{ t, tone: [TP, TP, TP], noise, mixer, vol: [v, v, v], env: [b, b, b],
//                        beeper }] after each call, t in seconds from the first
//   notes(log)           the tones' notes: [{ ch, t, dur, tp, hz, vol }], a note being a stretch
//                        of one period at one volume, with the tone on and the volume above 0
//   hz(tp, clock)        a period's frequency
//   render(log, rate)    Float32Array: the output at `rate` samples a second
//   mount(el, opts)      a player: a button for each of opts.tunes ({ name, log }), a stop button
//                        and a piano roll of the three tones (rows by pitch; the noise and the
//                        beeper along the foot), its playhead moving as the tune plays.
//                        opts.onTime(t, tune) is called each animation frame while a tune plays,
//                        and with t = null when it stops. Returns { play(i), stop(), draw(i) }.
globalThis.SpectrumAY = (function () {
  const CLOCK = 3546900 / 2, HZ = 3546900 / 70908;
  const UNITS = [0, 0.45, 0.6, 0.8, 1.05, 1.6, 2.2, 3, 4, 6, 8, 10, 14, 16, 20, 24];
  const VOLUME = Float32Array.from(UNITS, u => u / 48);   // a channel's swing at full volume is 0.5
  const BEEPER = 100 / 48 * VOLUME[15];
  const NAMES = ['A', 'B', 'C', 'noise', 'beeper'];
  const COLOURS = ['#4fc3f7', '#ffb74d', '#e57373', '#9e9e9e', '#aed581'];

  const fresh = () => ({ reg: new Uint8Array(16), beeper: 0 });
  const apply = (s, call) => {
    for (let k = 0; k < call.length; k += 2) {
      if (call[k] === 16) s.beeper = call[k + 1] & 1; else s.reg[call[k] & 15] = call[k + 1];
    }
  };

  function pack(log) {
    const s = fresh(), parts = [];
    for (const call of log.calls) {
      const before = Array.from(s.reg), bb = s.beeper;
      apply(s, call);
      let w = '';
      for (let r = 0; r < 16; r++) if (s.reg[r] !== before[r]) w += r.toString(16) + s.reg[r].toString(16).padStart(2, '0');
      if (s.beeper !== bb) w += 'g0' + s.beeper;
      parts.push(w);
    }
    return { clock: log.clock, hz: log.hz, n: log.calls.length, w: parts.join(',') };
  }
  function unpack(p) {
    if (p.calls) return p;
    const calls = p.w.split(',').map(w => {
      const c = [];
      for (let i = 0; i < w.length; i += 3) c.push(w[i] === 'g' ? 16 : parseInt(w[i], 16), parseInt(w.substr(i + 1, 2), 16));
      return c;
    });
    return { format: 'kit-ay-calls', clock: p.clock, hz: p.hz, calls };
  }

  const tp = (r, ch) => (r[ch * 2] | (r[ch * 2 + 1] & 15) << 8) || 1;
  const hz = (period, clock = CLOCK) => clock / (16 * period);

  function decode(log) {
    log = unpack(log);
    const s = fresh(), out = [];
    log.calls.forEach((call, k) => {
      apply(s, call);
      const r = s.reg;
      out.push({ t: k / log.hz, tone: [0, 1, 2].map(ch => tp(r, ch)), noise: (r[6] & 31) || 1, mixer: r[7],
        vol: [r[8] & 15, r[9] & 15, r[10] & 15], env: [r[8] >> 4 & 1, r[9] >> 4 & 1, r[10] >> 4 & 1], beeper: s.beeper });
    });
    return out;
  }

  function notes(log) {
    log = unpack(log);
    const st = decode(log), end = st.length / log.hz, out = [];
    for (let ch = 0; ch < 3; ch++) {
      let cur = null;
      const close = t => { if (cur) { cur.dur = t - cur.t; out.push(cur); cur = null; } };
      for (const e of st) {
        const on = !(e.mixer >> ch & 1) && e.vol[ch] > 0, p = e.tone[ch], v = e.vol[ch];
        if (cur && on && cur.tp === p && cur.vol === v) continue;
        close(e.t);
        if (on) cur = { ch, t: e.t, tp: p, hz: hz(p, log.clock), vol: v };
      }
      close(end);
    }
    return out.sort((a, b) => a.t - b.t || a.ch - b.ch);
  }

  // The chip steps at clock / 8: a tone's output turns over every TP steps, so a cycle is 16 TP
  // clocks, and the noise shifts every 2 NP. The steps are averaged down to the output's rate.
  function render(log, rate) {
    log = unpack(log);
    const STEP = log.clock / 8, total = Math.ceil(log.calls.length / log.hz * STEP);
    const per = STEP / rate, out = new Float32Array(Math.ceil(total / per) + 1);
    const s = fresh(), count = [0, 0, 0], bit = [0, 0, 0];
    let ncount = 0, lfsr = 1, call = 0, acc = 0, accN = 0, o = 0, next = per, prevIn = 0, prevOut = 0;
    const alpha = 1 / (1 + 2 * Math.PI * 20 / rate);
    for (let i = 0; i < total; i++) {
      while (call < log.calls.length && call / log.hz * STEP <= i) apply(s, log.calls[call++]);
      const r = s.reg;
      for (let ch = 0; ch < 3; ch++) if (++count[ch] >= tp(r, ch)) { count[ch] = 0; bit[ch] ^= 1; }
      if (++ncount >= 2 * ((r[6] & 31) || 1)) { ncount = 0; lfsr = (lfsr >> 1) | (((lfsr ^ (lfsr >> 3)) & 1) << 16); }
      let x = s.beeper * BEEPER;
      for (let ch = 0; ch < 3; ch++) {
        const t = bit[ch] | (r[7] >> ch & 1), n = (lfsr & 1) | (r[7] >> (ch + 3) & 1);
        x += (t & n) * VOLUME[r[8 + ch] & 15];
      }
      acc += x; accN++;
      if (i + 1 >= next || i === total - 1) {
        next += per;
        const y = acc / accN;
        prevOut = alpha * (prevOut + y - prevIn); prevIn = y;
        out[o++] = prevOut;
        acc = 0; accN = 0;
      }
    }
    return out.subarray(0, o);
  }

  function mount(el, opts) {
    const tunes = opts.tunes.map(t => ({ name: t.name, log: unpack(t.log) }));
    if (!document.querySelector('style.spay-style')) {
      const st = document.createElement('style');
      st.className = 'spay-style';
      st.textContent = `.spay-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0}
.spay-bar button{font:inherit;padding:.25rem .7rem;border:1px solid #555;background:#1c1c1c;color:#eee;border-radius:3px;cursor:pointer}
.spay-bar button.on{background:#2e7d32;border-color:#4caf50}
.spay-clock{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.8}
.spay-roll{display:block;width:100%;height:220px;border-radius:3px}
.spay-legend{display:flex;flex-wrap:wrap;gap:1rem;font-size:.85em;opacity:.85;margin-top:.3rem}
.spay-legend i{display:inline-block;width:.8em;height:.8em;margin-right:.35em;vertical-align:-.05em;border-radius:2px}`;
      document.head.appendChild(st);
    }
    el.classList.add('spay');
    const bar = document.createElement('div');
    bar.className = 'spay-bar';
    const buttons = tunes.map((t, i) => {
      const b = document.createElement('button');
      b.textContent = '▶ ' + t.name;
      b.onclick = () => play(i);
      bar.appendChild(b);
      return b;
    });
    const stopB = document.createElement('button');
    stopB.textContent = '■ Stop';
    stopB.onclick = () => stop();
    bar.appendChild(stopB);
    const clock = document.createElement('span');
    clock.className = 'spay-clock';
    bar.appendChild(clock);
    const canvas = document.createElement('canvas');
    canvas.className = 'spay-roll';
    const legend = document.createElement('div');
    legend.className = 'spay-legend';
    legend.innerHTML = NAMES.map((n, i) => `<span><i style="background:${COLOURS[i]}"></i>${i < 3 ? 'channel ' + n : n}</span>`).join('');
    el.append(bar, canvas, legend);

    let ctx = null, src = null, started = 0, playing = -1, shown = 0, raf = 0;
    const cache = new Map();
    function draw(i, t) {
      shown = i;
      const tune = tunes[i], ns = notes(tune.log), st = decode(tune.log), len = st.length / tune.log.hz;
      const W = canvas.clientWidth || 640, H = 220, dpr = globalThis.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
      const lo = Math.log2(Math.min(...ns.map(n => n.hz)) / 1.06), hi = Math.log2(Math.max(...ns.map(n => n.hz)) * 1.06);
      const X = s => s / len * W, Y = f => (H - 28) - (Math.log2(f) - lo) / (hi - lo || 1) * (H - 38);
      g.strokeStyle = '#222'; g.lineWidth = 1;
      for (let s = 0; s < len; s += len > 60 ? 10 : 1) { g.beginPath(); g.moveTo(X(s), 0); g.lineTo(X(s), H); g.stroke(); }
      for (const n of ns) {
        g.globalAlpha = 0.35 + 0.65 * n.vol / 15;
        g.fillStyle = COLOURS[n.ch];
        g.fillRect(X(n.t), Y(n.hz) - 2, Math.max(1.5, X(n.dur)), 4);
      }
      // the noise along the foot, at the loudest channel it is on in; the beeper's changes below it
      const dt = 1 / tune.log.hz;
      for (const e of st) {
        let v = 0;
        for (let ch = 0; ch < 3; ch++) if (!(e.mixer >> (ch + 3) & 1)) v = Math.max(v, e.vol[ch]);
        if (v) { g.globalAlpha = v / 15; g.fillStyle = COLOURS[3]; g.fillRect(X(e.t), H - 18, Math.max(1, X(dt)), 8); }
      }
      g.globalAlpha = 1; g.fillStyle = COLOURS[4];
      for (let k = 1; k < st.length; k++) if (st[k].beeper !== st[k - 1].beeper) g.fillRect(X(st[k].t), H - 8, 2, 6);
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
      ctx = ctx || new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (!cache.has(i)) cache.set(i, render(tunes[i].log, ctx.sampleRate));
      const data = cache.get(i), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.getChannelData(0).set(data);
      src = ctx.createBufferSource(); src.buffer = buf;
      const gain = ctx.createGain(); gain.gain.value = 0.9;
      src.connect(gain).connect(ctx.destination);
      started = ctx.currentTime + 0.05; src.start(started);
      playing = i; buttons[i].classList.add('on');
      src.onended = () => { if (playing === i) stop(); };
      const tick = () => {
        if (playing !== i) return;
        const t = Math.max(0, ctx.currentTime - started);
        draw(i, t);
        if (opts.onTime) opts.onTime(t, i);
        raf = requestAnimationFrame(tick);
      };
      tick();
    }
    draw(0, null);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (playing < 0) draw(shown, null); }).observe(canvas);
    return { play, stop, draw: i => draw(i, null) };
  }

  return { CLOCK, HZ, VOLUME, BEEPER, NAMES, pack, unpack, decode, notes, hz, render, mount };
})();
