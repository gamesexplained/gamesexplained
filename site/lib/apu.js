// The NES's sound for game pages: a model of the 2A03's APU, a player for a recording of every
// byte a game wrote to it, and a piano roll of what it played. No dependencies.
// Exposes NESApu (window.NESApu on a page; globalThis.NESApu in node, for tests).
//
// A recording is the log the kit's jsnes server makes with its `sound` command
// (kit/skills/nes/tool-jsnes, format kit-nes-apu-writes): { clock, start, end, writes: [[cycle,
// address, value], ...] }, the CPU's cycles (1,789,773 a second) and each write as it reached the
// chip, $4000 to $4017. A page can also make a log from the game's own sound driver run on the
// kit's 6502 (kit/cpu/cpu6502.js) with record(), below, so that the page plays what the listing
// says rather than a recording: the writes come out of the game's code at the moment it makes
// them. pack() and unpack() turn a log into { clock, start, end, w: [cycles since the last write,
// address low byte, value, ...] } and back, the form a page embeds.
//
// The model is the APU as the NESdev wiki describes it (APU, APU Pulse, APU Triangle, APU Noise,
// APU Sweep, APU Envelope, APU Length Counter, APU Frame Counter, APU Mixer, read 19 October
// 2026): two pulse channels with their duty cycles, envelopes, sweep units and length counters;
// the triangle with its 32-step sequence and linear counter; the noise channel's 15-bit shift
// register in its two modes; the frame counter in both modes, restarted by every write to $4017
// and clocking the envelopes and length counters at NTSC's cycle counts; and the mixer's two
// non-linear sums. Not modelled: the DMC (the kit's games so far only zero its level), the IRQ,
// the frame counter's three-cycle delay after a write, and the analogue stages after the mixer.
// Each cycle of the CPU's clock is stepped, and the output averaged down to the page's rate.
//
//   decode(log)          the chip's state 1 ms apart through the log: [{ t, p1: [period, vol],
//                        p2: [period, vol], tri: [period, on], noise: [period, vol] }], t in
//                        seconds from the log's start, a channel's vol 0 when it is silent
//   notes(log)           the three tone channels' notes: [{ ch, t, dur, hz, vol }] (ch 0, 1 the
//                        pulses, 2 the triangle), a note being a stretch of one period at one
//                        volume that lasts 5 ms or more; the noise's bursts with ch 3 and its
//                        period as hz
//   render(log, rate)    Float32Array: the chip's output at `rate` samples a second
//   record(driver, frames, opts)  a log from a driver run once a frame: driver.play(frame)
//                        returns the frame's writes as [[address, value, cycle], ...], the cycle
//                        counted from the frame's start; opts.framesCycles (29780.5) spaces the
//                        frames. Stops early when driver.playing() is false and the writes have
//                        ended, after opts.tail frames (60).
//   live(rate, opts)     the chip fed a frame of writes at a time, for a Play tab (host, below)
//   host(opts)           the live chip in an AudioWorklet, from this file's own text at opts.url
//   mount(el, opts)      a player: a button for each of opts.tunes ({ name, log, or make: a
//                        function that returns the log when first needed }), a stop button and a
//                        piano roll (rows by pitch, the noise along the foot), its playhead moving
//                        as the tune plays. opts.onTime(t, tune) is called each animation frame
//                        while a tune plays, and with t = null when it stops. Returns { play(i),
//                        stop(), draw(i) }.
globalThis.NESApu = (function () {
  'use strict';
  const CLOCK = 1789773;
  const FRAME_CYCLES = 29780.5;
  const LENGTH = [10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30];
  const NOISE_PERIOD = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
  const DUTY = [[0, 1, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 0, 0, 0], [1, 0, 0, 1, 1, 1, 1, 1]];
  const TRI = []; for (let i = 15; i >= 0; i--) TRI.push(i); for (let i = 0; i < 16; i++) TRI.push(i);
  const NAMES = ['pulse 1 ($4000)', 'pulse 2 ($4004)', 'triangle ($4008)', 'noise ($400C)'];
  const COLOURS = ['#4fc3f7', '#ffb74d', '#e57373', '#9e9e9e'];

  function pack(log) {
    const w = [];
    let last = log.start;
    for (const [c, a, v] of log.writes) { w.push(c - last, a & 0xff, v); last = c; }
    return { clock: log.clock, start: log.start, end: log.end, w };
  }
  function unpack(p) {
    if (p.writes) return p;
    const writes = [];
    let c = p.start;
    for (let i = 0; i < p.w.length; i += 3) { c += p.w[i]; writes.push([c, 0x4000 + p.w[i + 1], p.w[i + 2]]); }
    return { format: 'kit-nes-apu-writes', clock: p.clock, start: p.start, end: p.end, writes };
  }

  // ------------------------------------------------------------------ the chip
  function Chip() {
    this.p = [pulse(1), pulse(2)];
    this.tri = { cnt: 0, period: 0, seq: 0, length: 0, linear: 0, reload: 0, reloadFlag: false, control: false, enabled: false };
    this.noise = { cnt: 0, period: 4, mode: 0, sr: 1, length: 0, halt: false, constant: false, vol: 0, env: { start: false, divider: 0, decay: 0 }, enabled: false };
    this.fc = 0; this.mode = 0; this.odd = 0;
  }
  function pulse(n) {
    return { n, cnt: 0, period: 0, duty: 0, seq: 0, length: 0, halt: false, constant: false, vol: 0,
      env: { start: false, divider: 0, decay: 0 },
      sweep: { enabled: false, p: 0, negate: false, shift: 0, divider: 0, reload: false }, enabled: false };
  }
  function envelopeClock(ch) {
    const e = ch.env;
    if (e.start) { e.start = false; e.decay = 15; e.divider = ch.vol; }
    else if (e.divider > 0) e.divider--;
    else { e.divider = ch.vol; if (e.decay > 0) e.decay--; else if (ch.halt) e.decay = 15; }
  }
  function sweepTarget(p) {
    const change = p.period >> p.sweep.shift;
    return p.sweep.negate ? p.period - change - (p.n === 1 ? 1 : 0) : p.period + change;
  }
  function sweepMuted(p) { return p.period < 8 || sweepTarget(p) > 0x7ff; }
  Chip.prototype.quarter = function () {
    envelopeClock(this.p[0]); envelopeClock(this.p[1]); envelopeClock(this.noise);
    const t = this.tri;
    if (t.reloadFlag) t.linear = t.reload; else if (t.linear > 0) t.linear--;
    if (!t.control) t.reloadFlag = false;
  };
  Chip.prototype.half = function () {
    for (const p of this.p) {
      if (!p.halt && p.length > 0) p.length--;
      const s = p.sweep;
      if (s.divider === 0 && s.enabled && s.shift > 0 && !sweepMuted(p)) p.period = sweepTarget(p) & 0x7ff;
      if (s.divider === 0 || s.reload) { s.divider = s.p; s.reload = false; } else s.divider--;
    }
    if (!this.tri.control && this.tri.length > 0) this.tri.length--;
    if (!this.noise.halt && this.noise.length > 0) this.noise.length--;
  };
  // A write to one of the chip's registers, address $4000 to $4017.
  Chip.prototype.write = function (a, v) {
    const r = a & 0x1f;
    if (r < 8) {
      const p = this.p[r >> 2];
      switch (r & 3) {
        case 0: p.duty = v >> 6; p.halt = !!(v & 0x20); p.constant = !!(v & 0x10); p.vol = v & 15; break;
        case 1: p.sweep.enabled = !!(v & 0x80); p.sweep.p = (v >> 4) & 7; p.sweep.negate = !!(v & 8); p.sweep.shift = v & 7; p.sweep.reload = true; break;
        case 2: p.period = (p.period & 0x700) | v; break;
        case 3: p.period = (p.period & 0xff) | ((v & 7) << 8); if (p.enabled) p.length = LENGTH[v >> 3]; p.seq = 0; p.env.start = true; break;
      }
    } else if (r < 12) {
      const t = this.tri;
      switch (r & 3) {
        case 0: t.control = !!(v & 0x80); t.reload = v & 0x7f; break;
        case 2: t.period = (t.period & 0x700) | v; break;
        case 3: t.period = (t.period & 0xff) | ((v & 7) << 8); if (t.enabled) t.length = LENGTH[v >> 3]; t.reloadFlag = true; break;
      }
    } else if (r < 16) {
      const n = this.noise;
      switch (r & 3) {
        case 0: n.halt = !!(v & 0x20); n.constant = !!(v & 0x10); n.vol = v & 15; break;
        case 2: n.mode = v >> 7; n.period = NOISE_PERIOD[v & 15]; break;
        case 3: if (n.enabled) n.length = LENGTH[v >> 3]; n.env.start = true; break;
      }
    } else if (r === 0x15) {
      this.p[0].enabled = !!(v & 1); this.p[1].enabled = !!(v & 2); this.tri.enabled = !!(v & 4); this.noise.enabled = !!(v & 8);
      if (!this.p[0].enabled) this.p[0].length = 0;
      if (!this.p[1].enabled) this.p[1].length = 0;
      if (!this.tri.enabled) this.tri.length = 0;
      if (!this.noise.enabled) this.noise.length = 0;
    } else if (r === 0x17) {
      this.mode = v >> 7; this.fc = 0;
      if (this.mode) { this.quarter(); this.half(); }
    }
  };
  // One CPU cycle: the timers, the frame counter. Returns the mixer's output, 0 to about 1.
  Chip.prototype.step = function () {
    // the frame counter, in CPU cycles (NESdev, APU Frame Counter: the APU-cycle counts doubled)
    const fc = ++this.fc;
    if (fc === 7457) this.quarter();
    else if (fc === 14913) { this.quarter(); this.half(); }
    else if (fc === 22371) this.quarter();
    else if (this.mode === 0 && fc === 29829) { this.quarter(); this.half(); this.fc = 0; }
    else if (this.mode === 1 && fc === 37281) { this.quarter(); this.half(); this.fc = 0; }
    // the pulses and the noise count APU cycles, every other CPU cycle
    this.odd ^= 1;
    let p1 = 0, p2 = 0, nz = 0;
    for (let i = 0; i < 2; i++) {
      const p = this.p[i];
      if (this.odd) { if (--p.cnt < 0) { p.cnt = p.period; p.seq = (p.seq + 1) & 7; } }
      if (p.length > 0 && !sweepMuted(p) && DUTY[p.duty][p.seq]) {
        const v = p.constant ? p.vol : p.env.decay;
        if (i === 0) p1 = v; else p2 = v;
      }
    }
    const t = this.tri;
    if (--t.cnt < 0) { t.cnt = t.period; if (t.length > 0 && t.linear > 0) t.seq = (t.seq + 1) & 31; }
    const tv = t.period < 2 ? 7.5 : TRI[t.seq];
    const n = this.noise;
    if (--n.cnt < 0) {
      n.cnt = n.period - 1;
      const fb = (n.sr & 1) ^ ((n.sr >> (n.mode ? 6 : 1)) & 1);
      n.sr = (n.sr >> 1) | (fb << 14);
    }
    if (n.length > 0 && !(n.sr & 1)) nz = n.constant ? n.vol : n.env.decay;
    // the mixer (NESdev, APU Mixer)
    const ps = p1 + p2;
    const pulseOut = ps ? 95.88 / (8128 / ps + 100) : 0;
    const tnd = tv / 8227 + nz / 12241;
    const tndOut = tnd ? 159.79 / (1 / tnd + 100) : 0;
    return pulseOut + tndOut;
  };
  // What each channel is doing now, for the roll: [period, volume or 0].
  Chip.prototype.state = function () {
    const ch = (p) => [p.period, p.length > 0 && !sweepMuted(p) ? (p.constant ? p.vol : p.env.decay) : 0];
    const t = this.tri, n = this.noise;
    return { p1: ch(this.p[0]), p2: ch(this.p[1]), tri: [t.period, t.length > 0 && t.linear > 0 && t.period >= 2 ? 1 : 0],
      noise: [n.period, n.length > 0 ? (n.constant ? n.vol : n.env.decay) : 0] };
  };

  // ------------------------------------------------------------------ rendering
  // Steps the chip through the log's cycles, applying each write at its cycle; calls onSample
  // with the mean output of each block of cyclesPerSample cycles, and onTick(t, state) every
  // tickCycles.
  function run(log, cyclesPerSample, onSample, tickCycles, onTick) {
    log = unpack(log);
    const chip = new Chip();
    const writes = log.writes.slice().sort((a, b) => a[0] - b[0]);
    const end = Math.max(log.end, writes.length ? writes[writes.length - 1][0] : log.start) + CLOCK / 10;
    let wi = 0, acc = 0, n = 0, pos = 0, tick = 0;
    for (let c = log.start; c < end; c++) {
      while (wi < writes.length && writes[wi][0] <= c) { chip.write(writes[wi][1], writes[wi][2]); wi++; }
      acc += chip.step(); n++; pos++;
      if (pos >= cyclesPerSample) { onSample(acc / n); acc = 0; n = 0; pos -= cyclesPerSample; }
      if (onTick && ++tick >= tickCycles) { tick = 0; onTick((c - log.start) / CLOCK, chip.state()); }
    }
  }
  function render(log, rate) {
    rate = rate || 44100;
    const out = [];
    run(log, CLOCK / rate, (s) => out.push(s), 0, null);
    // the output's mean removed, as the console's coupling does over a longer time
    const f = new Float32Array(out.length);
    let dc = 0;
    for (let i = 0; i < out.length; i++) { dc += (out[i] - dc) * 0.0005; f[i] = (out[i] - dc) * 1.5; }
    return f;
  }
  function decode(log) {
    const trace = [];
    run(log, 1e9, () => {}, CLOCK / 1000, (t, s) => trace.push(Object.assign({ t }, s)));
    return trace;
  }
  const hzOfPulse = (period) => CLOCK / (16 * (period + 1));
  const hzOfTri = (period) => CLOCK / (32 * (period + 1));
  function notes(log) {
    const trace = decode(log), out = [];
    const open = [null, null, null, null];
    const key = (s, ch) => ch === 0 ? s.p1 : ch === 1 ? s.p2 : ch === 2 ? [s.tri[0], s.tri[1] ? 15 : 0] : s.noise;
    for (const s of trace) {
      for (let ch = 0; ch < 4; ch++) {
        const [period, vol] = key(s, ch), o = open[ch];
        if (o && (vol === 0 || o.period !== period)) { o.dur = s.t - o.t; if (o.dur >= 0.005) out.push(o); open[ch] = null; }
        if (vol > 0 && !open[ch]) open[ch] = { ch, t: s.t, dur: 0, period, hz: ch === 2 ? hzOfTri(period) : ch === 3 ? period : hzOfPulse(period), vol };
        else if (vol > 0 && open[ch]) open[ch].vol = Math.max(open[ch].vol, vol);
      }
    }
    const last = trace.length ? trace[trace.length - 1].t : 0;
    for (const o of open) if (o) { o.dur = last - o.t; if (o.dur >= 0.005) out.push(o); }
    return out.sort((a, b) => a.t - b.t);
  }

  // ------------------------------------------------------------------ a driver's log
  function record(driver, frames, opts) {
    opts = opts || {};
    const per = opts.frameCycles || FRAME_CYCLES, tail = opts.tail === undefined ? 60 : opts.tail;
    const writes = [];
    let quiet = 0, f;
    for (f = 0; f < frames; f++) {
      const w = driver.play(f) || [];
      const base = Math.round(f * per);
      for (const [a, v, c] of w) writes.push([base + (c || 0), a, v]);
      const only4017 = w.every(([a]) => (a & 0x1f) === 0x17);
      if (driver.playing && !driver.playing() && only4017) { if (++quiet > tail) { f++; break; } } else quiet = 0;
    }
    return { format: 'kit-nes-apu-writes', clock: CLOCK, start: 0, end: Math.round(f * per), writes };
  }

  // ------------------------------------------------------------------ the player
  function mount(el, opts) {
    const tunes = opts.tunes || [];
    const rate = opts.rate || 44100;
    const root = typeof el === 'string' ? document.querySelector(el) : el;
    root.innerHTML = '';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px';
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(root.clientWidth || 800, 900); canvas.height = 180;
    canvas.style.cssText = 'width:100%;height:auto;background:#1b1d22;border-radius:6px;display:block';
    root.appendChild(bar); root.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const cache = [];
    let audio = null, source = null, playing = -1, startedAt = 0, raf = 0;
    const logOf = (i) => { const t = tunes[i]; if (!t.log) t.log = t.make(); return unpack(t.log); };
    const prepared = (i) => {
      if (!cache[i]) {
        const log = logOf(i);
        cache[i] = { samples: render(log, rate), notes: notes(log), length: Math.max(0.5, (log.end - log.start) / log.clock + 0.1) };
      }
      return cache[i];
    };
    function draw(i, t) {
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#1b1d22'; ctx.fillRect(0, 0, W, H);
      if (i < 0) return;
      const c = prepared(i), span = c.length, top = 16, foot = 26;
      const toX = (s) => 44 + (W - 52) * s / span;
      const rows = c.notes.filter(n => n.ch < 3).map(n => 12 * Math.log2(n.hz / 440) + 69);
      const lo = rows.length ? Math.floor(Math.min(...rows)) - 1 : 40, hi = rows.length ? Math.ceil(Math.max(...rows)) + 1 : 80;
      const toY = (m) => top + (H - top - foot) * (hi - m) / (hi - lo);
      ctx.strokeStyle = '#2c2f36';
      for (let m = lo; m <= hi; m++) { if (m % 12 === 0) { ctx.beginPath(); ctx.moveTo(44, toY(m)); ctx.lineTo(W - 8, toY(m)); ctx.stroke(); } }
      ctx.fillStyle = '#80838a'; ctx.font = '11px ui-monospace, Menlo, monospace';
      for (let m = lo; m <= hi; m++) if (m % 12 === 0) ctx.fillText('C' + (m / 12 - 1), 4, toY(m) + 4);
      ctx.fillText('noise', 4, H - 8);
      for (const n of c.notes) {
        ctx.fillStyle = COLOURS[n.ch];
        ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, n.vol / 15);
        if (n.ch < 3) {
          const m = 12 * Math.log2(n.hz / 440) + 69;
          ctx.fillRect(toX(n.t), toY(m) - 3, Math.max(2, toX(n.t + n.dur) - toX(n.t)), 6);
        } else {
          ctx.fillRect(toX(n.t), H - foot + 6, Math.max(2, toX(n.t + n.dur) - toX(n.t)), 12);
        }
      }
      ctx.globalAlpha = 1;
      if (t != null) { ctx.fillStyle = '#ffffff'; ctx.fillRect(toX(t), top - 4, 2, H - top - 4); }
      ctx.fillStyle = '#c9ccd3'; ctx.font = '12px ui-monospace, Menlo, monospace';
      ctx.fillText(tunes[i].name + '  ' + span.toFixed(1) + ' s', 44, 12);
    }
    function stop() {
      if (source) { try { source.stop(); } catch (e) {} source = null; }
      cancelAnimationFrame(raf);
      if (playing >= 0) { const i = playing; playing = -1; draw(i, null); if (opts.onTime) opts.onTime(null, tunes[i]); }
      for (const b of bar.querySelectorAll('button')) b.classList.remove('nes-apu-playing');
    }
    function play(i) {
      stop();
      const c = prepared(i);
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const buf = audio.createBuffer(1, c.samples.length, rate);
      buf.copyToChannel(c.samples, 0);
      source = audio.createBufferSource(); source.buffer = buf; source.connect(audio.destination);
      source.onended = () => { if (playing === i) stop(); };
      playing = i; startedAt = audio.currentTime; source.start();
      bar.querySelectorAll('button')[i].classList.add('nes-apu-playing');
      const tick = () => {
        if (playing !== i) return;
        const t = audio.currentTime - startedAt;
        draw(i, t);
        if (opts.onTime) opts.onTime(t, tunes[i]);
        raf = requestAnimationFrame(tick);
      };
      tick();
    }
    tunes.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = '▶ ' + t.name;
      b.addEventListener('click', () => (playing === i ? stop() : play(i)));
      bar.appendChild(b);
    });
    const s = document.createElement('button');
    s.type = 'button'; s.textContent = '■ stop'; s.addEventListener('click', stop);
    bar.appendChild(s);
    if (tunes.length) draw(0, null);
    return { play, stop, draw: (i) => draw(i, null) };
  }

  // ------------------------------------------------------------------ a live chip for a Play tab
  // The chip stepped in real time from the writes a page's port makes, a frame at a time: the
  // page sends each frame's writes ([cycle in the frame, address, value]) after its NMI, and
  // the processor plays them 29,780.5 cycles a frame. It keeps up to `lag` frames waiting, half a
  // second unless the page says otherwise, since a page's frames come unevenly and the audio
  // device can ask for 100 ms at once (kit/scripts/test_live_sound.js); when more wait, the oldest
  // frame's writes are made at once, in order, at the start of the next, so no note is lost. When
  // the page falls behind, the chip holds its registers and plays on. The processor's class and the chip's code run in an AudioWorklet from this
  // file's own text, so the page must say where the file is (url, the src it loaded it from);
  // without a worklet, a ScriptProcessorNode runs the same chip on the page.
  //   const h = await NESApu.host({ url: '../../lib/apu.js', gain: 0.6 })
  //   h.send({ cmd: 'frames', frames: [[[cycle, address, value], ...], ...] })
  //   h.send({ cmd: 'reset' })      the chip silent and the queue empty
  //   h.ctx                         the AudioContext, to suspend and resume
  const LIVE_FRAMES = Math.ceil(0.5 * CLOCK / FRAME_CYCLES);   // half a second of frames: 31
  function live(sampleRate, opts) {
    const chip = new Chip(), queue = [], lag = opts.lag || LIVE_FRAMES, per = CLOCK / sampleRate;
    let frame = null, wi = 0, cyc = 0, pos = 0, dc = 0, acc = 0, n = 0;
    const gain = opts.gain === undefined ? 0.6 : opts.gain;
    return {
      command(c) {
        if (c.cmd === 'frames') {
          for (const f of c.frames) queue.push(f);
          while (queue.length > lag) { const f = queue.shift(); queue[0] = f.map((w) => [0, w[1], w[2]]).concat(queue[0]); }
        }
        else if (c.cmd === 'reset') { queue.length = 0; frame = null; Object.assign(chip, new Chip()); }
      },
      render(out, len) {
        for (let i = 0; i < len; i++) {
          pos += per;
          while (pos >= 1) {
            pos -= 1;
            if (!frame && queue.length) { frame = queue.shift(); wi = 0; cyc = 0; }
            if (frame) {
              while (wi < frame.length && frame[wi][0] <= cyc) { chip.write(frame[wi][1], frame[wi][2]); wi++; }
              if (++cyc >= FRAME_CYCLES) frame = null;
            }
            acc += chip.step(); n++;
          }
          const s = n ? acc / n : 0; acc = 0; n = 0;
          dc += (s - dc) * 0.0005;
          out[i] = (s - dc) * 1.5 * gain;
        }
      },
    };
  }
  const PROCESSOR = `
class NesApuProcessor extends AudioWorkletProcessor {
  constructor(o) { super(); this.live = NESApu.live(sampleRate, o.processorOptions || {}); this.port.onmessage = (e) => this.live.command(e.data); }
  process(inputs, outputs) { const out = outputs[0][0]; this.live.render(out, out.length); return true; }
}
registerProcessor('nes-apu', NesApuProcessor);
`;
  async function host(o = {}) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) throw new Error('This browser has no Web Audio.');
    const ctx = new AC();
    ctx.resume();
    const opts = { gain: o.gain, lag: o.lag };
    let node = null, local = null;
    if (ctx.audioWorklet && o.url) {
      try {
        const text = await (await fetch(o.url)).text();
        const code = text + '\n' + PROCESSOR;
        const urls = ['data:text/javascript;charset=utf-8,' + encodeURIComponent(code), () => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))];
        for (const u of urls) {
          try {
            await ctx.audioWorklet.addModule(typeof u === 'function' ? u() : u);
            node = new AudioWorkletNode(ctx, 'nes-apu', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: opts });
            break;
          } catch (e) { node = null; }
        }
      } catch (e) { node = null; }
    }
    if (!node) {
      local = live(ctx.sampleRate, opts);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => { const out = e.outputBuffer.getChannelData(0); local.render(out, out.length); };
    }
    node.connect(ctx.destination);
    return { ctx, mode: local ? 'script-processor' : 'worklet', send: (c) => { if (local) local.command(c); else node.port.postMessage(c); } };
  }

  return { CLOCK, FRAME_CYCLES, LENGTH, NOISE_PERIOD, NAMES, COLOURS, Chip, pack, unpack, decode, notes, render, record, mount, hzOfPulse, hzOfTri, LIVE_FRAMES, live, host };
})();
