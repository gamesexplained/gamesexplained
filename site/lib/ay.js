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
//
// The sound of a game as it plays (a Play tab), on the same model as render():
//   live(rate)           { push(frames, most), render(out, n), queued }: frames of writes as the
//                        game made them, each a flat list [t, reg, value, ...] with t the T-state
//                        within the 128K's frame of 70,908 (reg 16 the beeper, as above). They play
//                        one a frame of the chip's own time, each write at its T-state; with none
//                        waiting the registers hold. More than most waiting (default MOST, half a
//                        second) and the oldest are applied at once, so that the sound keeps up
//                        with the game.
//   host({ gain, most }) an AudioContext playing live() in an AudioWorklet (or the older
//                        ScriptProcessorNode), resolving to { ctx, mode, push(frames) }. Call it
//                        inside a click or a key press, where a browser lets a page start sound.
globalThis.SpectrumAY = (function () {
// The model's own source text goes into the worklet, so it refers to nothing outside itself.
function spectrumAYModel() {
  const CLOCK = 3546900 / 2, FRAME_T = 70908, STEPS = FRAME_T / 16;
  // the frames live() keeps waiting at most: half a second's. The page's frames come unevenly and
  // the audio device can take 100 ms at a time, and a queue shorter than the two runs dry and
  // overflows by turns, which is heard as the music skipping
  const MOST = 25;
  const UNITS = [0, 0.45, 0.6, 0.8, 1.05, 1.6, 2.2, 3, 4, 6, 8, 10, 14, 16, 20, 24];
  const VOLUME = Float32Array.from(UNITS, u => u / 48);   // a channel's swing at full volume is 0.5
  const BEEPER = 100 / 48 * VOLUME[15];
  const tp = (r, ch) => (r[ch * 2] | (r[ch * 2 + 1] & 15) << 8) || 1;
  // The chip steps at clock / 8: a tone's output turns over every TP steps, so a cycle is 16 TP
  // clocks, and the noise shifts every 2 NP. step() gives the output of one step.
  function chip() {
    const reg = new Uint8Array(16), count = [0, 0, 0], bit = [0, 0, 0];
    let ncount = 0, lfsr = 1;
    const c = {
      reg, beeper: 0,
      write(r, v) { if (r === 16) c.beeper = v & 1; else reg[r & 15] = v; },
      step() {
        for (let ch = 0; ch < 3; ch++) if (++count[ch] >= tp(reg, ch)) { count[ch] = 0; bit[ch] ^= 1; }
        if (++ncount >= 2 * ((reg[6] & 31) || 1)) { ncount = 0; lfsr = (lfsr >> 1) | (((lfsr ^ (lfsr >> 3)) & 1) << 16); }
        let x = c.beeper * BEEPER;
        for (let ch = 0; ch < 3; ch++) {
          const t = bit[ch] | (reg[7] >> ch & 1), n = (lfsr & 1) | (reg[7] >> (ch + 3) & 1);
          x += (t & n) * VOLUME[reg[8 + ch] & 15];
        }
        return x;
      },
    };
    return c;
  }
  // The steps averaged down to the output's rate, through a high pass at 20 Hz: put(x) for each
  // step gives a sample when one is due, else undefined; last() the sample of the steps so far
  function output(rate) {
    const per = CLOCK / 8 / rate, alpha = 1 / (1 + 2 * Math.PI * 20 / rate);
    let i = 0, next = per, acc = 0, accN = 0, prevIn = 0, prevOut = 0;
    const last = () => {
      next += per;
      const y = acc / accN;
      prevOut = alpha * (prevOut + y - prevIn); prevIn = y;
      acc = 0; accN = 0;
      return prevOut;
    };
    return { put(x) { acc += x; accN++; if (++i >= next) return last(); return undefined; }, last };
  }
  function live(rate) {
    const c = chip(), o = output(rate), queue = [];
    let cur = null, wi = 0, pos = STEPS;
    const rest = () => { if (cur) for (; wi + 2 < cur.length; wi += 3) c.write(cur[wi + 1], cur[wi + 2]); };
    return {
      chip: c,
      get queued() { return queue.length; },
      push(frames, most = MOST) {
        for (const f of frames) queue.push(f);
        while (queue.length > most) { const f = queue.shift(); for (let k = 0; k + 2 < f.length; k += 3) c.write(f[k + 1], f[k + 2]); }
      },
      render(out, n) {
        for (let j = 0; j < n;) {
          if (pos >= STEPS) { pos -= STEPS; rest(); cur = queue.length ? queue.shift() : null; wi = 0; }
          while (cur && wi + 2 < cur.length && cur[wi] / 16 <= pos) { c.write(cur[wi + 1], cur[wi + 2]); wi += 3; }
          const y = o.put(c.step());
          pos++;
          if (y !== undefined) out[j++] = y;
        }
      },
    };
  }
  return { CLOCK, FRAME_T, STEPS, MOST, VOLUME, BEEPER, tp, chip, output, live };
}

  const MODEL = spectrumAYModel(), { CLOCK, VOLUME, BEEPER, tp, chip, output, live } = MODEL;
  const HZ = 3546900 / MODEL.FRAME_T;
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

  // The recording on the model, a step at a time, averaged down to the output's rate.
  function render(log, rate) {
    log = unpack(log);
    const STEP = log.clock / 8, total = Math.ceil(log.calls.length / log.hz * STEP);
    const out = new Float32Array(Math.ceil(total * rate / STEP) + 1);
    const c = chip(), o = output(rate);
    let call = 0, n = 0;
    for (let i = 0; i < total; i++) {
      while (call < log.calls.length && call / log.hz * STEP <= i) {
        const w = log.calls[call++];
        for (let k = 0; k < w.length; k += 2) c.write(w[k], w[k + 1]);
      }
      const y = o.put(c.step());
      if (y !== undefined) out[n++] = y;
      else if (i === total - 1) out[n++] = o.last();
    }
    return out.subarray(0, n);
  }

  // ------------------------------------------------------------------ the sound, on a Play tab
  const WORKLET = `
class SpectrumAYProcessor extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const q = o.processorOptions || {};
    this.l = MODEL.live(sampleRate); this.gain = q.gain || 1; this.most = q.most || MODEL.MOST;
    this.port.onmessage = (e) => { if (e.data && e.data.frames) this.l.push(e.data.frames, this.most); };
  }
  process(inputs, outputs) {
    const ch = outputs[0], out = ch[0];
    this.l.render(out, out.length);
    if (this.gain !== 1) for (let i = 0; i < out.length; i++) out[i] *= this.gain;
    for (let k = 1; k < ch.length; k++) ch[k].set(out);
    return true;
  }
}
registerProcessor('spectrum-ay', SpectrumAYProcessor);`;
  const worklet = () => 'const MODEL = (' + spectrumAYModel.toString() + ')();\n' + WORKLET;
  async function host(o = {}) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) throw new Error('This browser has no Web Audio.');
    const ctx = new AC();
    ctx.resume();
    const gain = o.gain || 1, most = o.most || MODEL.MOST, code = worklet();
    const urls = ['data:text/javascript;charset=utf-8,' + encodeURIComponent(code),
      () => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))];
    let node = null, local = null;
    for (const u of ctx.audioWorklet ? urls : []) {
      try {
        await ctx.audioWorklet.addModule(typeof u === 'function' ? u() : u);
        node = new AudioWorkletNode(ctx, 'spectrum-ay', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { gain, most } });
        break;
      } catch (e) { node = null; }
    }
    if (!node) {                                             // no worklet: the older ScriptProcessorNode
      local = live(ctx.sampleRate);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        local.render(out, out.length);
        if (gain !== 1) for (let i = 0; i < out.length; i++) out[i] *= gain;
      };
    }
    node.connect(ctx.destination);
    return { ctx, mode: local ? 'script-processor' : 'worklet',
      push: (frames) => { if (local) local.push(frames, most); else node.port.postMessage({ frames }); } };
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

  return { CLOCK, HZ, FRAME_T: MODEL.FRAME_T, VOLUME, BEEPER, NAMES, pack, unpack, decode, notes, hz, render, mount, live, host, worklet };
})();
