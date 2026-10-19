// The Commodore 16's and Plus/4's sound for game pages: a model of TED's two voices, a player for a
// recording of every write a game made to TED's sound registers, a piano roll of what it played,
// and the sound of a game as it plays, for a Play tab. No dependencies. Exposes TEDSound
// (window.TEDSound on a page; globalThis.TEDSound in node, for tests).
//
// A recording is the log the kit's plus4emu server makes (`sound`, kit/skills/c16/tool-plus4emu,
// format kit-c16-sound): { clock, frame, start, end, writes: [[cycle, address, value], ...] }, in
// TED's double-clock cycles (1,773,447 a second on PAL, 35,568 a frame), each write to $FF0E-$FF12
// as the CPU made it. A page that runs a game's own sound code on the kit's 6502 makes the same log
// from the writes it sees. pack() and unpack() turn a log into { clock, frame, start, end,
// w: [cycles since the last write, register, value, ...] } (register $0E-$12) and back, the form a
// page embeds.
//
// The registers, as kit/skills/c16/c16-reference, "Sound", gives them: voice 1's value is $FF0E and
// bits 0-1 of $FF12, voice 2's $FF0F and bits 0-1 of $FF10; $FF11 holds D/A (bit 7), voice 2's noise
// (bit 6), voice 2's square (bit 5), voice 1 (bit 4) and the volume (bits 0-3).
//
// The model is plus4emu 1.2.11's (src/ted_snd.cpp, git 939e652), tick for tick at TED's sound
// clock, every 8th cycle (221,680.9 Hz on PAL):
//   - A voice is a counter that reloads with 1023 - value (1024 for 1023) and turns its output over
//     each time it runs out: f = 110,840 / (1023 - value) Hz. A counter of 1, value 1022, runs out
//     at every tick and never turns over, and a voice that has not turned over for 188,416 ticks
//     (0.85 s) is held high.
//   - The noise is an 8-bit shift register, shifted each time voice 2 turns over, bit 0 taking the
//     parity of bits 7, 5, 4 and 1. It sounds when bit 0 is 0.
//   - The output is the volume, 0, 6, 16, 26, 36, 46, 56, 66 and 75 for 0 to 8 (9 to 15 as 8), times
//     what is switched on and high: voice 1 (bit 4), plus voice 2's square (bit 5) or else its noise
//     (bit 6). With D/A (bit 7) set the counters are held at their reloads, the noise register fills
//     with 1s and the output is the volume times the voices switched on, the square's bits counting
//     and the noise's not. Each tick is averaged with the one before through plus4emu's table of
//     TED's output stage (DIST), 0 to 24,576.
// Then plus4emu's own path to the speaker: averaged down to the page's rate as its low-quality
// converter does (src/snd_conv.cpp), two DC filters at 5 Hz and 15 Hz, and its gain of 1.17 (its
// volume 1.0), so that 1.0 here is plus4emu's 32,768. Not modelled: its high shelf at 15 kHz, and
// where a write lands within a tick (it takes effect at the next).
// kit/c16/test_ted_sound.js holds the model to c16-reference and to plus4emu's own output
// (kit/c16/fixtures/ted-sound.json), and `python3 kit/c16/sound.py test` makes that comparison
// again against the running server.
//
//   decode(log)          [{ t, value: [v1, v2], ctrl, vol, voice1, square, noise, da }] after each
//                        write, t in seconds from the log's start, vol the volume TED plays (0 to 8)
//   notes(log)           what each voice played: [{ ch, t, dur, value, hz, vol }], ch 0 voice 1, 1 voice
//                        2's square, 2 voice 2's noise (hz its square's: the noise shifts twice a
//                        cycle), a note being a stretch of one value at one volume, switched on and
//                        above volume 0
//   hz(value)            a voice's frequency for a value of 0 to 1023
//   render(log, rate)    Float32Array: the output at `rate` samples a second
//   mount(el, opts)      a player: a button for each of opts.tunes ({ name, log }), a stop button and
//                        a piano roll of the two voices (rows by pitch, the noise in grey at its
//                        voice's pitch) with the volume along the foot, its playhead moving as the
//                        tune plays. opts.onTime(t, tune) is called each animation frame while a tune
//                        plays, and with t = null when it stops. opts.buttons false leaves the buttons
//                        out, for a page that starts the tunes itself. Returns { play(i), stop(), draw(i) }.
//
// The sound of a game as it plays (a Play tab), on the same model as render():
//   live(rate)           { push(frames, most), render(out, n), queued }: frames of writes as the game
//                        made them, each a flat list [t, register, value, ...] with t the cycle within
//                        TED's frame of 35,568 and register $FF0E-$FF12 (or $0E-$12). They play one a
//                        frame of TED's own time, each write at its cycle; with none waiting the
//                        registers hold. More than most waiting (default 4) and the oldest are applied
//                        at once, so that the sound keeps up with the game.
//   host({ gain, most }) an AudioContext playing live() in an AudioWorklet (or the older
//                        ScriptProcessorNode), resolving to { ctx, mode, push(frames) }. Call it inside
//                        a click or a key press, where a browser lets a page start sound: a Play tab
//                        calls it from the set(on) it hands Sound.attach (site/lib/sound.js).
globalThis.TEDSound = (function () {
// The model's own source text goes into the worklet, so it refers to nothing outside itself.
function tedSoundModel() {
  const CLOCK = 1773447, FRAME = 35568, TICK = 8, RATE = CLOCK / TICK;   // PAL: 312 lines of 114 cycles
  const VOLUME = [0, 6, 16, 26, 36, 46, 56, 66, 75, 75, 75, 75, 75, 75, 75, 75];
  const DECAY = 0x2E000;                          // ticks without a turn over before a voice is held high
  // plus4emu's soundDistortionTable: the output for the sum of two ticks' levels, 0 to 150 each
  const DIST = [
    0, 66, 135, 205, 276, 347, 419, 491, 563, 635, 708, 781, 854, 927, 1000, 1073, 1146, 1219, 1293, 1366,
    1440, 1513, 1587, 1660, 1734, 1808, 1882, 1955, 2029, 2103, 2177, 2251, 2325, 2399, 2473, 2547, 2621,
    2695, 2770, 2844, 2918, 2992, 3067, 3141, 3215, 3290, 3364, 3438, 3513, 3587, 3662, 3737, 3811, 3886,
    3961, 4035, 4110, 4185, 4260, 4334, 4409, 4484, 4559, 4634, 4709, 4784, 4860, 4935, 5010, 5085, 5160,
    5236, 5311, 5387, 5462, 5537, 5613, 5689, 5764, 5840, 5916, 5991, 6067, 6143, 6219, 6295, 6371, 6447,
    6523, 6599, 6675, 6752, 6828, 6904, 6981, 7057, 7134, 7210, 7287, 7364, 7440, 7517, 7594, 7671, 7748,
    7825, 7902, 7979, 8056, 8134, 8211, 8288, 8366, 8443, 8521, 8599, 8676, 8754, 8832, 8910, 8988, 9066,
    9144, 9222, 9300, 9379, 9457, 9536, 9614, 9693, 9771, 9850, 9929, 10008, 10087, 10166, 10245, 10324,
    10403, 10482, 10562, 10641, 10721, 10801, 10880, 10960, 11040, 11120, 11200, 11280, 11360, 11440,
    11521, 11601, 11682, 11762, 11843, 11924, 12005, 12085, 12166, 12248, 12329, 12410, 12491, 12573,
    12654, 12736, 12818, 12900, 12981, 13063, 13146, 13228, 13310, 13392, 13475, 13557, 13640, 13723,
    13805, 13888, 13971, 14055, 14138, 14221, 14304, 14388, 14472, 14555, 14639, 14723, 14807, 14891,
    14975, 15060, 15144, 15228, 15313, 15398, 15483, 15568, 15653, 15738, 15823, 15908, 15994, 16079,
    16165, 16251, 16337, 16423, 16509, 16595, 16681, 16768, 16854, 16941, 17028, 17115, 17202, 17289,
    17376, 17464, 17551, 17639, 17726, 17814, 17902, 17990, 18078, 18167, 18255, 18344, 18432, 18521,
    18610, 18699, 18788, 18877, 18967, 19056, 19146, 19236, 19326, 19416, 19506, 19596, 19687, 19777,
    19868, 19959, 20049, 20141, 20232, 20323, 20414, 20506, 20598, 20690, 20782, 20874, 20966, 21058,
    21151, 21244, 21336, 21429, 21522, 21615, 21709, 21802, 21896, 21990, 22084, 22178, 22272, 22366,
    22461, 22555, 22650, 22745, 22840, 22935, 23030, 23126, 23222, 23317, 23413, 23509, 23606, 23702,
    23798, 23895, 23992, 24089, 24186, 24283, 24381, 24478, 24576];
  const reload = v => ((((v & 0x3FF) + 1) ^ 0x3FF) & 0x3FF) + 1;      // 1023 - v, and 1024 for 1023
  const hz = v => RATE / 2 / reload(v);

  // TED's sound generators, a tick at a time: write(register, value) as the CPU writes $FF0E-$FF12
  // (the register's low five bits), tick() the next tick's output, 0 to 24,576
  function chip() {
    const reg = new Uint8Array(32);
    let r1 = 1023, r2 = 1023, c1 = 1023, c2 = 1023, o1 = false, o2 = false, d1 = DECAY, d2 = DECAY;
    let s1 = 1, s2 = 1, noise = 0xFF, phase = 3, out = 0, prv = 0;
    const level = () => {
      const f = reg[0x11], vol = VOLUME[f & 15];
      let n;
      if (f & 0x80) n = (f >> 4 & 1) + (f >> 5 & 1);
      else n = (f & 0x10 ? s1 : 0) + (f & 0x20 ? s2 : f & 0x40 ? (noise & 1) ^ 1 : 0);
      out = n * vol;
    };
    const c = {
      reg,
      write(r, v) {
        r &= 0x1F; v &= 255;
        if (r === 0x11) {
          if ((v ^ reg[0x11]) & 0x80 && v & 0x80) { s1 = 1; s2 = 1; phase = 3; }
          reg[0x11] = v; level();
          return;
        }
        reg[r] = v;
        if (r === 0x0E || r === 0x12) r1 = reload(reg[0x0E] | (reg[0x12] & 3) << 8);
        else if (r === 0x0F || r === 0x10) r2 = reload(reg[0x0F] | (reg[0x10] & 3) << 8);
      },
      tick() {
        if (reg[0x11] & 0x80) {                    // D/A: the counters held, the outputs high
          c1 = r1; c2 = r2; s1 = 1; s2 = 1;
          noise = ((noise << (phase + 1)) | (0xFF >> (7 - phase))) & 255;
          phase = 3;
          if (c1 === 1) { if (d1 > 0 && d1 <= DECAY) { d1--; s1 = 0; } o1 = true; } else { d1 = DECAY; o1 = false; }
          if (c2 === 1) { if (d2 > 0 && d2 <= DECAY) { d2--; s2 = 0; } o2 = true; } else { d2 = DECAY; o2 = false; }
        } else {
          let over = --c1 === 0;
          if (over) { c1 = r1; if (!o1) { d1 = DECAY; s1 ^= 1; } }
          o1 = over;
          if (--d1 === 0) s1 = 1;
          over = --c2 === 0;
          if (over) {
            c2 = r2;
            if (!o2) {
              d2 = DECAY; s2 ^= 1;
              let t = noise & 0xB2;
              t ^= t >> 1; t ^= t >> 2; t ^= t >> 4;
              noise = ((noise << 1) | (t & 1)) & 255;
            }
          }
          o2 = over;
          if (--d2 === 0) s2 = 1;
        }
        level();
        const y = DIST[prv + out];
        prv = out;
        return y;
      },
      get state() { return { c1, c2, s1, s2, noise }; },
    };
    return c;
  }

  // The ticks down to the output's rate as plus4emu's low-quality converter does it (each sample
  // the mean of the ticks it spans, the input taken as a straight line between them), then its two
  // DC filters and its gain. put(x) for each tick gives a sample when one is due, else undefined.
  // phase (0 to the ticks in a sample) is how far into its first sample the converter starts.
  function output(rate, phase = 0) {
    const ratio = RATE / rate, dc = f => 1 - Math.min(0.125, Math.max(0.0003, 2 * Math.PI * f / rate));
    const c1 = dc(5), c2 = dc(15), gain = 1.17 / 32768;
    let phs = phase, next = ratio, prvIn = 0, acc = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    return {
      put(x) {
        phs += 1;
        if (phs < next) { acc += prvIn + x; prvIn = x; return undefined; }
        const frac = next - (phs - 1), mid = prvIn + (x - prvIn) * frac;
        acc += (prvIn + mid) * frac;
        const s = acc / (ratio * 2);
        acc = (mid + x) * (1 - frac);
        next = next + ratio - phs; phs = 0; prvIn = x;
        const a = s - x1 + c1 * y1; x1 = s; y1 = a;
        const b = a - x2 + c2 * y2; x2 = a; y2 = b;
        return b * gain;
      },
    };
  }

  function live(rate) {
    const c = chip(), o = output(rate), queue = [], STEPS = FRAME / TICK;
    let cur = null, wi = 0, pos = STEPS;
    const rest = () => { if (cur) for (; wi + 2 < cur.length; wi += 3) c.write(cur[wi + 1], cur[wi + 2]); };
    return {
      chip: c,
      get queued() { return queue.length; },
      push(frames, most = 4) {
        for (const f of frames) queue.push(f);
        while (queue.length > most) { const f = queue.shift(); for (let k = 0; k + 2 < f.length; k += 3) c.write(f[k + 1], f[k + 2]); }
      },
      render(out, n) {
        for (let j = 0; j < n;) {
          if (pos >= STEPS) { pos -= STEPS; rest(); cur = queue.length ? queue.shift() : null; wi = 0; }
          while (cur && wi + 2 < cur.length && cur[wi] / TICK <= pos) { c.write(cur[wi + 1], cur[wi + 2]); wi += 3; }
          const y = o.put(c.tick());
          pos++;
          if (y !== undefined) out[j++] = y;
        }
      },
    };
  }
  return { CLOCK, FRAME, TICK, RATE, VOLUME, DECAY, DIST, reload, hz, chip, output, live };
}

  const MODEL = tedSoundModel(), { CLOCK, FRAME, RATE, VOLUME, reload, hz, chip, output, live } = MODEL;
  const NAMES = ['voice 1', 'voice 2', 'voice 2, noise'];
  const COLOURS = ['#4fc3f7', '#ffb74d', '#bdbdbd'];

  function pack(log) {
    const w = [];
    let last = log.start;
    for (const [c, a, v] of log.writes) { w.push(c - last, a & 0x1F, v); last = c; }
    return { clock: log.clock, frame: log.frame, start: log.start, end: log.end, w };
  }
  function unpack(p) {
    if (p.writes) return p;
    const writes = [];
    let c = p.start;
    for (let i = 0; i + 2 < p.w.length; i += 3) { c += p.w[i]; writes.push([c, 0xFF00 | p.w[i + 1], p.w[i + 2]]); }
    return { format: 'kit-c16-sound', clock: p.clock || CLOCK, frame: p.frame || FRAME, start: p.start, end: p.end, writes };
  }

  function decode(log) {
    log = unpack(log);
    const reg = new Uint8Array(32), out = [];
    for (const [c, a, v] of log.writes) {
      reg[a & 0x1F] = v;
      const f = reg[0x11];
      out.push({ t: (c - log.start) / log.clock, value: [reg[0x0E] | (reg[0x12] & 3) << 8, reg[0x0F] | (reg[0x10] & 3) << 8],
        ctrl: f, vol: Math.min(8, f & 15), voice1: !!(f & 0x10), square: !!(f & 0x20), noise: !!(f & 0x40) && !(f & 0x20), da: !!(f & 0x80) });
    }
    return out;
  }

  function notes(log) {
    log = unpack(log);
    const st = decode(log), end = (log.end - log.start) / log.clock, out = [];
    for (let ch = 0; ch < 3; ch++) {
      let cur = null;
      const close = t => { if (cur) { cur.dur = t - cur.t; if (cur.dur > 0) out.push(cur); cur = null; } };
      for (const e of st) {
        const on = !e.da && e.vol > 0 && (ch === 0 ? e.voice1 : ch === 1 ? e.square : e.noise);
        const v = e.value[ch ? 1 : 0];
        if (cur && on && cur.value === v && cur.vol === e.vol) continue;
        close(e.t);
        if (on) cur = { ch, t: e.t, value: v, hz: hz(v), vol: e.vol };
      }
      close(end);
    }
    return out.sort((a, b) => a.t - b.t || a.ch - b.ch);
  }

  // The recording on the model, a tick at a time, averaged down to the output's rate (phase as
  // output()'s, for a comparison with plus4emu's samples).
  function render(log, rate, phase = 0) {
    log = unpack(log);
    const ticks = Math.ceil((log.end - log.start) / MODEL.TICK);
    const out = new Float32Array(Math.ceil(ticks * rate / RATE) + 1);
    const c = chip(), o = output(rate, phase);
    let w = 0, n = 0;
    for (let i = 0; i < ticks; i++) {
      while (w < log.writes.length && (log.writes[w][0] - log.start) / MODEL.TICK <= i) { c.write(log.writes[w][1], log.writes[w][2]); w++; }
      const y = o.put(c.tick());
      if (y !== undefined) out[n++] = y;
    }
    return out.subarray(0, n);
  }

  // ------------------------------------------------------------------ the sound, on a Play tab
  const WORKLET = `
class TEDSoundProcessor extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const q = o.processorOptions || {};
    this.l = MODEL.live(sampleRate); this.gain = q.gain || 1; this.most = q.most || 4;
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
registerProcessor('ted-sound', TEDSoundProcessor);`;
  const worklet = () => 'const MODEL = (' + tedSoundModel.toString() + ')();\n' + WORKLET;
  async function host(o = {}) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) throw new Error('This browser has no Web Audio.');
    const ctx = new AC();
    ctx.resume();
    const gain = o.gain || 2, most = o.most || 4, code = worklet();
    const urls = ['data:text/javascript;charset=utf-8,' + encodeURIComponent(code),
      () => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))];
    let node = null, local = null;
    for (const u of ctx.audioWorklet ? urls : []) {
      try {
        await ctx.audioWorklet.addModule(typeof u === 'function' ? u() : u);
        node = new AudioWorkletNode(ctx, 'ted-sound', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { gain, most } });
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
    if (!document.querySelector('style.tedsnd-style')) {
      const st = document.createElement('style');
      st.className = 'tedsnd-style';
      st.textContent = `.tedsnd-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0}
.tedsnd-bar button{font:inherit;padding:.25rem .7rem;border:1px solid #555;background:#1c1c1c;color:#eee;border-radius:3px;cursor:pointer}
.tedsnd-bar button.on{background:#2e7d32;border-color:#4caf50}
.tedsnd-clock{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.8}
.tedsnd-roll{display:block;width:100%;height:220px;border-radius:3px}
.tedsnd-legend{display:flex;flex-wrap:wrap;gap:1rem;font-size:.85em;opacity:.85;margin-top:.3rem}
.tedsnd-legend i{display:inline-block;width:.8em;height:.8em;margin-right:.35em;vertical-align:-.05em;border-radius:2px}`;
      document.head.appendChild(st);
    }
    el.classList.add('tedsnd');
    const bar = document.createElement('div');
    bar.className = 'tedsnd-bar';
    const buttons = tunes.map((t, i) => {
      const b = document.createElement('button');
      b.textContent = '▶ ' + t.name;
      b.onclick = () => play(i);
      if (opts.buttons !== false) bar.appendChild(b);
      return b;
    });
    const stopB = document.createElement('button');
    stopB.textContent = '■ Stop';
    stopB.onclick = () => stop();
    bar.appendChild(stopB);
    const clock = document.createElement('span');
    clock.className = 'tedsnd-clock';
    bar.appendChild(clock);
    const canvas = document.createElement('canvas');
    canvas.className = 'tedsnd-roll';
    const legend = document.createElement('div');
    legend.className = 'tedsnd-legend';
    legend.innerHTML = NAMES.map((n, i) => `<span><i style="background:${COLOURS[i]}"></i>${n}</span>`).join('') +
      '<span><i style="background:#666"></i>volume</span>';
    el.append(bar, canvas, legend);

    let ctx = null, src = null, started = 0, playing = -1, shown = 0, raf = 0;
    const cache = new Map();
    function draw(i, t) {
      shown = i;
      const tune = tunes[i], ns = notes(tune.log), st = decode(tune.log);
      const len = (tune.log.end - tune.log.start) / tune.log.clock;
      const W = canvas.clientWidth || 640, H = 220, dpr = globalThis.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
      const FOOT = 34, hs = ns.map(n => n.hz);
      const lo = Math.log2((hs.length ? Math.min(...hs) : 100) / 1.06), hi = Math.log2((hs.length ? Math.max(...hs) : 1000) * 1.06);
      const X = s => s / len * W, Y = f => (H - FOOT - 6) - (Math.log2(f) - lo) / (hi - lo || 1) * (H - FOOT - 16);
      g.strokeStyle = '#222'; g.lineWidth = 1;
      for (let s = 0; s < len; s += len > 30 ? 5 : len > 4 ? 1 : 0.1) { g.beginPath(); g.moveTo(X(s), 0); g.lineTo(X(s), H); g.stroke(); }
      for (const n of ns) {
        g.globalAlpha = 0.3 + 0.7 * n.vol / 8;
        g.fillStyle = COLOURS[n.ch];
        g.fillRect(X(n.t), Y(n.hz) - (n.ch === 2 ? 3 : 2), Math.max(1.5, X(n.dur)), n.ch === 2 ? 6 : 4);
      }
      // the volume TED plays at, along the foot, while anything is switched on
      g.globalAlpha = 1; g.fillStyle = '#666';
      for (let k = 0; k < st.length; k++) {
        const e = st[k], t1 = k + 1 < st.length ? st[k + 1].t : len;
        const v = (e.voice1 || e.square || e.noise || e.da) ? e.vol : 0;
        if (v) g.fillRect(X(e.t), H - 2 - v * 3.5, Math.max(1, X(t1) - X(e.t)), v * 3.5);
      }
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
      const gain = ctx.createGain(); gain.gain.value = 2;
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
    return {
      play, stop, draw: i => draw(i, null),
      // a tune's log replaced, for a page that makes its tunes afresh (a game's random numbers)
      set(i, log) { tunes[i].log = unpack(log); cache.delete(i); if (playing < 0 && shown === i) draw(i, null); },
    };
  }

  return { CLOCK, FRAME, RATE, VOLUME, NAMES, pack, unpack, decode, notes, hz, reload, render, mount, live, host, worklet, model: MODEL };
})();
