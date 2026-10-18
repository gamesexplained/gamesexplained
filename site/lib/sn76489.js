// The BBC Micro's sound chip for game pages: a model of the SN76489, a player for a recording of
// every byte a game wrote to it, and a piano roll of what it played. No dependencies.
// Exposes BBCSound (window.BBCSound on a page; globalThis.BBCSound in node, for tests).
//
// A recording is the log jsbeeb's `sound` capture makes (kit/skills/bbc/tool-jsbeeb, format
// kit-sn76489-writes): { clock, start, end, writes: [[cycle, byte], ...] }, the CPU's cycles
// (2,000,000 a second) and each byte as it reached the chip. A game that leaves its sound to the
// MOS, SOUND and ENVELOPE in BASIC included, has the MOS's interrupt code write the chip, and the
// log holds those writes too, so replaying it plays what the machine played. pack() and unpack()
// turn a log into { clock, start, end, w: [cycles since the last write, byte, ...] } and back,
// the form a page embeds.
//
// The registers are named as kit/skills/bbc/bbc-reference, "Sound", names them: index 0 is the
// tone at &80, the one `SOUND 3` plays; 1 is &A0, `SOUND 2`; 2 is &C0, `SOUND 1`; 3 is the
// noise at &E0, `SOUND 0`. A byte with bit 7 set names a register and gives its low four bits;
// one with bit 7 clear gives a tone's top six bits, or the named volume or noise its four.
//
// The model is jsbeeb 2.4.0's (src/soundchip.js), step for step at the chip's 500 kHz (its
// 4 MHz clock divided by 8): each tone a square wave whose counter reloads with N (0 as 1,024),
// so f = 4,000,000 / (32 N); the noise a 15-bit shift register, white (bits 0 and 1 fed back) or
// periodic, shifted at 1/16, 1/32 or 1/64 of the tone rate or at the &C0 tone's, and restarted
// by every write to its control; each channel's volume 2 dB less a step of attenuation, 15
// silent; and the BBC's DC restoration, a high pass at 3.4 Hz. The 500 kHz output is averaged
// down to the page's sample rate. Not modelled: anything a game does with the chip that the log
// does not show, and the analogue stages after the DC filter.
//
//   decode(log)          [{ t, tone: [N0, N1, N2], vol: [v0, v1, v2, v3], noise }] after each write,
//                        t in seconds from the log's start
//   notes(log)           the tone channels' notes: [{ ch, t, dur, n, hz, vol }], a note being a
//                        stretch of one N at one volume other than 15 that lasts 2 ms or more
//   render(log, rate)    Float32Array: the chip's output at `rate` samples a second
//   mount(el, opts)      a player: a button for each of opts.tunes ({ name, log }), a stop button
//                        and a piano roll of the three tones (rows by pitch, the noise along the
//                        foot), its playhead moving as the tune plays. opts.onTime(t, tune) is
//                        called each animation frame while a tune plays, and with t = null when
//                        it stops, so a page can show what the program was doing at that moment.
//                        Returns { play(i), stop(), draw(i) }.
globalThis.BBCSound = (function () {
  const CHIP = 500000;                  // the chip's step rate: 4 MHz divided by 8
  const VOLUME = new Float32Array(16);  // jsbeeb's volumeTable: 2 dB a step, a quarter at loudest
  for (let i = 0, f = 1; i < 15; i++, f *= Math.pow(10, -0.1)) VOLUME[i] = f / 4;
  VOLUME[15] = 0;
  const NAMES = ['SOUND 3 (&80)', 'SOUND 2 (&A0)', 'SOUND 1 (&C0)', 'noise (&E0)'];
  const COLOURS = ['#4fc3f7', '#ffb74d', '#e57373', '#9e9e9e'];

  function pack(log) {
    const w = [];
    let last = log.start;
    for (const [c, b] of log.writes) { w.push(c - last, b); last = c; }
    return { clock: log.clock, start: log.start, end: log.end, w };
  }
  function unpack(p) {
    if (p.writes) return p;
    const writes = [];
    let c = p.start;
    for (let i = 0; i < p.w.length; i += 2) { c += p.w[i]; writes.push([c, p.w[i + 1]]); }
    return { format: 'kit-sn76489-writes', clock: p.clock, start: p.start, end: p.end, writes };
  }

  // The chip's registers, changed by one byte, as jsbeeb's poke does it.
  function poke(s, b) {
    let cmd;
    if (b & 0x80) { s.latch = b & 0x70; cmd = b & 0xF0; } else cmd = s.latch;
    const ch = (cmd >> 5) & 3;
    if (cmd & 0x10) s.vol[ch] = b & 15;
    else if (ch === 3) { s.reg[3] = b & 15; s.noisePoked = true; }
    else if (cmd & 0x80) s.reg[ch] = (s.reg[ch] & ~15) | (b & 15);
    else s.reg[ch] = (s.reg[ch] & 15) | ((b & 0x3F) << 4);
  }
  const fresh = () => ({ latch: 0, reg: [0, 0, 0, 0], vol: [15, 15, 15, 15], noisePoked: false });

  function decode(log) {
    log = unpack(log);
    const s = fresh(), out = [];
    for (const [c, b] of log.writes) {
      poke(s, b);
      out.push({ t: (c - log.start) / log.clock, tone: s.reg.slice(0, 3), vol: s.vol.slice(), noise: s.reg[3] });
    }
    return out;
  }

  const hz = n => 4000000 / (32 * (n || 1024));

  // A state that lasts less than SETTLE seconds is passed over: the MOS writes a tone's two
  // bytes about 50 microseconds apart, and between them the register holds half of each note.
  const SETTLE = 0.002;
  function notes(log) {
    log = unpack(log);
    const st = decode(log), end = (log.end - log.start) / log.clock, out = [];
    for (let ch = 0; ch < 3; ch++) {
      let cur = null;
      const close = t => { if (cur) { cur.dur = t - cur.t; if (cur.dur >= SETTLE) out.push(cur); cur = null; } };
      for (const e of st) {
        const n = e.tone[ch], v = e.vol[ch];
        if (cur && cur.n === n && cur.vol === v) continue;
        close(e.t);
        if (v < 15) cur = { ch, t: e.t, n, hz: hz(n), vol: v };
      }
      close(end);
    }
    return out.sort((a, b) => a.t - b.t || a.ch - b.ch);
  }

  function render(log, rate) {
    log = unpack(log);
    const total = Math.ceil((log.end - log.start) / log.clock * CHIP);
    const per = CHIP / rate, out = new Float32Array(Math.ceil(total / per));
    const s = fresh(), counter = [0, 0, 0, 0], bit = [0, 0, 0, 0];
    let lfsr = 1 << 14, w = 0, acc = 0, accN = 0, o = 0, prevIn = 0, prevOut = 0, next = per;
    const alpha = 1 - (2 * Math.PI * (1 / (2 * Math.PI * 10e3 * 4.7e-6))) / rate;
    const step = (ch, add) => {
      const v = counter[ch] - 0.5;
      if (v < 0) { counter[ch] = Math.max(0, v + add); bit[ch] ^= 1; return bit[ch]; }
      counter[ch] = v; return 0;
    };
    for (let i = 0; i < total; i++) {
      while (w < log.writes.length && (log.writes[w][0] - log.start) / log.clock * CHIP <= i) {
        poke(s, log.writes[w++][1]);
        if (s.noisePoked) { lfsr = 1 << 14; s.noisePoked = false; }
      }
      let x = 0;
      for (let ch = 0; ch < 3; ch++) {
        step(ch, s.reg[ch] || 1024);
        x += bit[ch] * VOLUME[s.vol[ch]];
      }
      const r = s.reg[3] & 3, add = r === 3 ? s.reg[2] : 0x10 << r;
      if (step(3, add)) {
        if (s.reg[3] & 4) lfsr = (lfsr >>> 1) | (((lfsr & 1) ^ ((lfsr >> 1) & 1)) << 14);
        else { lfsr >>= 1; if (!lfsr) lfsr = 1 << 14; }
      }
      x += (lfsr & 1) * VOLUME[s.vol[3]];
      acc += x; accN++;
      if (i + 1 >= next || i === total - 1) {   // output sample o covers chip steps up to (o + 1) per
        next += per;
        const y = acc / accN;
        prevOut = y - prevIn + alpha * prevOut; prevIn = y;
        out[o++] = prevOut;
        acc = 0; accN = 0;
      }
    }
    return out.subarray(0, o);
  }

  function mount(el, opts) {
    const tunes = opts.tunes.map(t => ({ name: t.name, log: unpack(t.log) }));
    if (!document.querySelector('style.bbcsnd-style')) {
      const st = document.createElement('style');
      st.className = 'bbcsnd-style';
      st.textContent = `.bbcsnd-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0}
.bbcsnd-bar button{font:inherit;padding:.25rem .7rem;border:1px solid #555;background:#1c1c1c;color:#eee;border-radius:3px;cursor:pointer}
.bbcsnd-bar button.on{background:#2e7d32;border-color:#4caf50}
.bbcsnd-clock{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.8}
.bbcsnd-roll{display:block;width:100%;height:220px;border-radius:3px}
.bbcsnd-legend{display:flex;flex-wrap:wrap;gap:1rem;font-size:.85em;opacity:.85;margin-top:.3rem}
.bbcsnd-legend i{display:inline-block;width:.8em;height:.8em;margin-right:.35em;vertical-align:-.05em;border-radius:2px}`;
      document.head.appendChild(st);
    }
    el.classList.add('bbcsnd');
    const bar = document.createElement('div');
    bar.className = 'bbcsnd-bar';
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
    clock.className = 'bbcsnd-clock';
    bar.appendChild(clock);
    const canvas = document.createElement('canvas');
    canvas.className = 'bbcsnd-roll';
    const legend = document.createElement('div');
    legend.className = 'bbcsnd-legend';
    legend.innerHTML = NAMES.map((n, i) => `<span><i style="background:${COLOURS[i]}"></i>${n}</span>`).join('');
    el.append(bar, canvas, legend);

    let ctx = null, src = null, started = 0, playing = -1, shown = 0, raf = 0;
    const cache = new Map();
    function draw(i, t) {
      shown = i;
      const tune = tunes[i], ns = notes(tune.log), len = (tune.log.end - tune.log.start) / tune.log.clock;
      const W = canvas.clientWidth || 640, H = 220, dpr = globalThis.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
      const tones = ns.filter(n => n.n);
      const lo = Math.log2(Math.min(...tones.map(n => n.hz)) / 1.06), hi = Math.log2(Math.max(...tones.map(n => n.hz)) * 1.06);
      const X = s => s / len * W, Y = f => (H - 24) - (Math.log2(f) - lo) / (hi - lo) * (H - 34);
      g.strokeStyle = '#222'; g.lineWidth = 1;
      for (let s = 0; s < len; s++) { g.beginPath(); g.moveTo(X(s), 0); g.lineTo(X(s), H); g.stroke(); }
      for (const n of ns) {
        g.globalAlpha = 0.35 + 0.65 * (15 - n.vol) / 15;
        g.fillStyle = COLOURS[n.ch];
        g.fillRect(X(n.t), Y(n.hz) - 2, Math.max(1.5, X(n.dur)), 4);
      }
      g.globalAlpha = 1;
      // the noise channel along the foot, by its volume
      const st = decode(tune.log);
      for (let k = 0; k < st.length; k++) {
        const v = st[k].vol[3];
        if (v === 15) continue;
        const t1 = k + 1 < st.length ? st[k + 1].t : len;
        g.globalAlpha = (15 - v) / 15; g.fillStyle = COLOURS[3];
        g.fillRect(X(st[k].t), H - 14, Math.max(1, X(t1 - st[k].t)), 10);
      }
      g.globalAlpha = 1;
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
      const gain = ctx.createGain(); gain.gain.value = 1.2;
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

  return { CHIP, VOLUME, NAMES, pack, unpack, decode, notes, hz, render, mount };
})();
