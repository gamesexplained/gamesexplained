// The C64's sound chip for game pages: a model of the SID, a player that runs a game's own music
// driver once a frame through the model, and a display of what the driver plays. No dependencies.
// Exposes C64Sid (window.C64Sid on a page; globalThis.C64Sid in node, for tests).
//
// A game supplies its music driver, ported from the game's code: a function createDriver(data)
// that refers to nothing outside itself (the player runs its source text in an AudioWorklet) and
// returns an object with
//   init(tune)  start a tune, as the game's own call does
//   stop()      stop the music, as the game's own call does
//   play()      one frame of the driver, as the game's interrupt calls it
//   sid         a Uint8Array(25): $D400-$D418 as the driver last wrote them
//   playing()   true while a tune runs, false once it has ended or been stopped
//   voice(x)    optional: plain data about voice x (0-2) for the display's rows
//   writes      optional: every register write of the last frame in order, as a flat list
//               [register, value, register, value, ...]. When a driver keeps it, the player
//               applies the writes in order instead of the frame's final registers, so a gate
//               turned off and on again within one frame restarts the envelope, as on the chip
// data is anything that survives structured cloning, usually the driver's tables as the game
// loads them. Test the port against the game's own code run in a 6502 simulator, every register
// after every frame, before it goes on a page.
//
// The model: three voices with triangle, sawtooth, pulse and noise (the 23-bit noise register),
// the test bit, sync and ring modulation; envelopes on reSID's rate table, with the exponential
// decay and the ADSR delay bug; the C64's output stage (16 kHz low pass, 16 Hz high pass).
// Not modelled: the filter ($D415-$D417 and the routing bits of $D418 are ignored), combined
// waveforms (approximated by AND), samples played through the volume register (registers change
// once a frame), and NTSC timing (the clock is PAL's: 985,248 Hz, frames of 312 lines of 63 cycles).
//
//   C64Sid.mount(root, options)  the player: tune buttons, a piano roll and a panel per voice
//   C64Sid.host(options)         the sound alone, for a page with its own controls
//   C64Sid.engine()              the model and the frame player without a page, for tests
globalThis.C64Sid = (function () {
  'use strict';

  // Everything that makes sound is inside engine(), which refers to nothing outside itself:
  // host() runs it in an AudioWorklet from its own source text, and node runs it for tests.
  function engine() {
    'use strict';
    const CLOCK = 985248;               // PAL clock, Hz
    const FRAME_CYCLES = 312 * 63;      // one PAL frame: 312 lines of 63 cycles (50.12 Hz)

    // ------------------------------------------------------------------ the SID
    // Rate periods from reSID (VICE src/resid/envelope.cc): the envelope steps every
    // period + 1 cycles; decay and release divide that clock again by 1 to 30 as the level falls.
    const RATE = [8, 31, 62, 94, 148, 219, 266, 312, 391, 976, 1953, 3125, 3906, 11719, 19531, 31250];
    const ATTACK = 0, DECAY = 1, RELEASE = 2;

    function noiseBits(r) {                                  // LFSR bits 20,18,14,11,9,5,2,0 -> output bits 11-4
      return (r >> 9 & 0x800) | (r >> 8 & 0x400) | (r >> 5 & 0x200) | (r >> 3 & 0x100) |
        (r >> 2 & 0x080) | (r << 1 & 0x040) | (r << 3 & 0x020) | (r << 4 & 0x010);
    }

    function createSID(sampleRate, opts) {
      const cps = CLOCK / sampleRate;                        // cycles per output sample
      const sub = Math.max(1, Math.ceil(cps / 6));           // oscillator steps per sample, 6 cycles at most
      const dt = cps / sub;
      const regs = new Uint8Array(25), mute = [false, false, false];
      const V = [0, 1, 2].map(() => ({ acc: 0, freq: 0, pw: 0, ctrl: 0, ad: 0, sr: 0, msbUp: false,
        lfsr: 0x7FFFFF, noise: noiseBits(0x7FFFFF),
        env: 0, state: RELEASE, period: RATE[0], rc: 0, expc: 0, expp: 1, hold: true }));
      const SRC = [2, 0, 1];                                 // sync and ring source: 1 <- 3, 2 <- 1, 3 <- 2
      const kLP = 1 - Math.exp(-2 * Math.PI * 15900 / sampleRate);  // the C64's output stage:
      const kHP = 1 - Math.exp(-2 * Math.PI * 15.9 / sampleRate);   // 16 kHz low pass, 16 Hz high pass
      const gain = opts && opts.gain != null ? opts.gain : 0.6;   // the output level
      let vol = 0, frac = 0, lp = 0, dc = 0;

      function write(r, val) {
        regs[r] = val;
        if (r === 24) { vol = val & 15; return; }            // filter mode bits ignored
        if (r > 20) return;                                  // the filter: not modelled
        const o = V[(r / 7) | 0];
        switch (r % 7) {
          case 0: o.freq = (o.freq & 0xFF00) | val; break;
          case 1: o.freq = (o.freq & 0x00FF) | val << 8; break;
          case 2: o.pw = (o.pw & 0xF00) | val; break;
          case 3: o.pw = (o.pw & 0x0FF) | (val & 15) << 8; break;
          case 4:
            if ((val & 1) && !(o.ctrl & 1)) { o.state = ATTACK; o.period = RATE[o.ad >> 4]; o.hold = false; }
            else if (!(val & 1) && (o.ctrl & 1)) { o.state = RELEASE; o.period = RATE[o.sr & 15]; }
            o.ctrl = val; break;
          case 5:
            o.ad = val;
            if (o.state === ATTACK) o.period = RATE[val >> 4];
            else if (o.state === DECAY) o.period = RATE[val & 15];
            break;
          case 6:
            o.sr = val;
            if (o.state === RELEASE) o.period = RATE[val & 15];
            break;
        }
      }
      function setRegs(src) { for (let r = 0; r < 25; r++) if (src[r] !== regs[r]) write(r, src[r]); }

      function clockEnv(o, n) {                              // n cycles of one envelope
        for (;;) {
          const p = o.period + 1;
          // a counter already past a newly set period runs on to 2^15 first (the ADSR delay bug)
          const t = o.rc < p ? p - o.rc : 0x8000 - o.rc + p;
          if (n < t) { o.rc = (o.rc + n) & 0x7FFF; return; }
          n -= t; o.rc = 0;
          if (o.state !== ATTACK && (o.expc = (o.expc + 1) & 0xFF) !== o.expp) continue;
          o.expc = 0;
          if (o.hold) continue;
          if (o.state === ATTACK) {
            o.env = (o.env + 1) & 0xFF;
            if (o.env === 0xFF) { o.state = DECAY; o.period = RATE[o.ad & 15]; }
          } else if (o.state === DECAY) {
            if (o.env !== (o.sr >> 4) * 0x11) o.env = (o.env - 1) & 0xFF;
          } else o.env = (o.env - 1) & 0xFF;
          switch (o.env) {
            case 0xFF: o.expp = 1; break;
            case 0x5D: o.expp = 2; break;
            case 0x36: o.expp = 4; break;
            case 0x1A: o.expp = 8; break;
            case 0x0E: o.expp = 16; break;
            case 0x06: o.expp = 30; break;
            case 0x00: o.expp = 1; o.hold = true; break;     // frozen at 0 until the next attack
          }
        }
      }

      function wave(o, s) {                                  // 12-bit waveform output
        const w = o.ctrl >> 4;
        if (!w) return 0x800;                                // no waveform: silent here
        const a = o.acc | 0;
        let out = 0xFFF;                                     // combined waveforms: AND (approximation)
        if (w & 1) {                                         // triangle; ring mod: MSB EOR NOT source MSB
          const msb = (o.ctrl & 0x24) === 0x04 ? (a ^ ~(s.acc | 0)) & 0x800000 : a & 0x800000;
          out &= ((msb ? ~a : a) >> 11) & 0xFFE;
        }
        if (w & 2) out &= a >> 12;                           // sawtooth
        if (w & 4) out &= (a >> 12) >= o.pw || (o.ctrl & 8) ? 0xFFF : 0;  // pulse
        if (w & 8) out &= o.noise;                           // noise
        return out;
      }

      function sample() {
        const c0 = frac + cps, c = Math.floor(c0);
        frac = c0 - c;
        for (let i = 0; i < 3; i++) clockEnv(V[i], c);
        let sum = 0;
        for (let k = 0; k < sub; k++) {
          for (let i = 0; i < 3; i++) {
            const o = V[i];
            if (o.ctrl & 8) { o.acc = 0; o.msbUp = false; continue; }   // test bit holds the oscillator
            const a0 = o.acc | 0;
            o.acc += o.freq * dt;
            if (o.acc >= 0x1000000) o.acc -= 0x1000000;
            const up = ~a0 & (o.acc | 0);
            o.msbUp = (up & 0x800000) !== 0;
            if (up & 0x80000) {                              // bit 19 rises: the noise LFSR shifts
              o.lfsr = ((o.lfsr << 1) | ((o.lfsr >> 22 ^ o.lfsr >> 17) & 1)) & 0x7FFFFF;
              o.noise = noiseBits(o.lfsr);
            }
          }
          for (let i = 0; i < 3; i++) if ((V[i].ctrl & 2) && V[SRC[i]].msbUp) V[i].acc = 0;  // sync
          for (let i = 0; i < 3; i++) if (!mute[i]) sum += (wave(V[i], V[SRC[i]]) - 0x800) * V[i].env;
        }
        const x = sum * vol / (sub * 3 * 2048 * 255 * 15);
        lp += (x - lp) * kLP;
        dc += (lp - dc) * kHP;
        const y = (lp - dc) * gain;
        return y > 1 ? 1 : y < -1 ? -1 : y;
      }

      return { V, mute, write, setRegs, sample };
    }

    // ------------------------------------------------------------------ driver + SID + frames
    // createPlayer(driver, sampleRate, opts) takes the commands {cmd: 'start', tune, run},
    // {cmd: 'stop'} and {cmd: 'mute', voice, on}; render() fills a buffer, running the driver
    // once a PAL frame.
    function createPlayer(drv, sampleRate, opts) {
      const sid = createSID(sampleRate, opts), cps = CLOCK / sampleRate;
      let toFrame = 0, frames = 0, on = false, run = 0;
      function command(c) {
        if (c.cmd === 'start') { drv.init(c.tune); frames = 0; on = true; run = c.run || 0; }
        else if (c.cmd === 'stop') drv.stop();
        else if (c.cmd === 'mute') sid.mute[c.voice] = !!c.on;
      }
      function snapshot(t) {                                 // what the display needs, per frame
        const s = drv.sid, v = [];
        for (let x = 0; x < 3; x++) {
          const r = 7 * x;
          v.push(Object.assign({ freq: s[r] | s[r + 1] << 8, pw: (s[r + 2] | s[r + 3] << 8) & 0xFFF,
            ctrl: s[r + 4], ad: s[r + 5], sr: s[r + 6], env: sid.V[x].env }, drv.voice ? drv.voice(x) : null));
        }
        return { t, run, frame: frames, vol: s[24] & 15, playing: drv.playing(), v };
      }
      // fill out[0..n) from time t0; post(snapshot) after each driver frame
      function render(out, n, t0, post) {
        for (let i = 0; i < n; i++) {
          if (toFrame <= 0) {                                // a new frame: the game calls its driver
            toFrame += FRAME_CYCLES;
            if (on) {
              drv.play();
              const w = drv.writes;                          // in order, where the driver keeps them
              if (w) for (let k = 0; k + 1 < w.length; k += 2) sid.write(w[k], w[k + 1]);
              sid.setRegs(drv.sid);
              if (drv.playing()) frames++;
              if (post) post(snapshot(t0 + i / sampleRate));
            }
          }
          out[i] = sid.sample();
          toFrame -= cps;
        }
      }
      return { drv, sid, command, render };
    }

    return { CLOCK, FRAME_CYCLES, createSID, createPlayer };
  }

  // ------------------------------------------------------------------ the sound, on a page
  const WORKLET = `
class C64SidProcessor extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const q = o.processorOptions;
    this.p = E.createPlayer(createDriver(q.data), sampleRate, q.opts);
    this.post = q.frames ? (s) => this.port.postMessage(s) : null;
    this.port.onmessage = (e) => this.p.command(e.data);
  }
  process(inputs, outputs) {
    const ch = outputs[0];
    this.p.render(ch[0], ch[0].length, currentTime, this.post);
    for (let k = 1; k < ch.length; k++) ch[k].set(ch[0]);
    return true;
  }
}
registerProcessor('c64-sid', C64SidProcessor);`;

  // host({driver, data, gain, onFrame}): an AudioContext playing the driver through the model.
  // Call it from a click or a key press, where browsers allow sound to start. It resolves to
  // {ctx, mode, send(command)}. onFrame(snapshot), if given, receives every driver frame when it
  // is computed, ahead of the sound; show it once snapshot.t has reached ctx.currentTime.
  async function host(o) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('This browser has no Web Audio.');
    const ctx = new AC();
    ctx.resume();
    const opts = { gain: o.gain }, post = o.onFrame || null;
    const code = 'const E = (' + engine.toString() + ')();\nconst createDriver = (' + o.driver.toString() + ');\n' + WORKLET;
    const urls = ['data:text/javascript;charset=utf-8,' + encodeURIComponent(code),
      () => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))];
    let node = null, local = null;
    for (const u of ctx.audioWorklet ? urls : []) {
      try {
        await ctx.audioWorklet.addModule(typeof u === 'function' ? u() : u);
        node = new AudioWorkletNode(ctx, 'c64-sid', { numberOfInputs: 0, outputChannelCount: [1],
          processorOptions: { data: o.data, opts, frames: !!post } });
        if (post) node.port.onmessage = (e) => post(e.data);
        break;
      } catch (e) { node = null; }
    }
    if (!node) {                                             // no worklet: the older ScriptProcessorNode
      local = engine().createPlayer(o.driver(o.data), ctx.sampleRate, opts);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        local.render(out, out.length, e.playbackTime, post);
      };
    }
    node.connect(ctx.destination);
    return { ctx, mode: local ? 'script-processor' : 'worklet',
      send: (c) => { if (local) local.command(c); else node.port.postMessage(c); } };
  }

  // ------------------------------------------------------------------ the player
  const CSS = `
.sid-player{font-family:var(--fb,'Lato',system-ui,sans-serif);color:var(--ink,#2f3136);font-size:14px;line-height:1.5}
.sid-player button{font-family:var(--fm,'IBM Plex Mono',ui-monospace,Menlo,monospace);font-size:12.5px;line-height:1.3;
  background:var(--surface-2,#f1efea);color:var(--ink,#2f3136);border:1px solid var(--line,#d5d3cc);border-radius:7px;padding:6px 12px;cursor:pointer}
.sid-player button:hover{border-color:var(--accent,#1f5fa8)}
.sid-player button[aria-pressed="true"]{background:var(--accent,#1f5fa8);border-color:var(--accent,#1f5fa8);color:#fff}
.sid-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}
.sid-stat{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-family:var(--fm,'IBM Plex Mono',ui-monospace,monospace);font-size:12.5px}
.sid-k{font-family:var(--fb,'Lato',system-ui,sans-serif);font-size:12.5px;color:var(--ink-mute,#80838a);margin-right:5px}
.sid-vol{display:inline-flex;gap:2px;vertical-align:-1px;margin-left:6px}
.sid-vol i{display:block;width:4px;height:12px;border-radius:1px;background:var(--line,#d5d3cc)}
.sid-vol i.sid-lit{background:var(--accent,#1f5fa8)}
.sid-roll{display:block;width:100%;height:190px;border:1px solid var(--line,#d5d3cc);border-radius:8px;background:#fff}
.sid-voices{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:10px;margin-top:12px}
.sid-v{border:1px solid var(--line,#d5d3cc);border-radius:8px;padding:9px 12px 10px;background:var(--surface,#fff);min-width:0}
.sid-vh{display:flex;align-items:center;gap:8px;font-weight:700}
.sid-player .sid-vh button{margin-left:auto;padding:3px 9px;font-size:11.5px}
.sid-sw{display:inline-block;width:10px;height:10px;border-radius:2px}
.sid-env{height:4px;border-radius:2px;background:var(--line-soft,#e0ded8);overflow:hidden;margin:7px 0 8px}
.sid-env i{display:block;height:100%;width:0}
.sid-l{font-size:13px;margin:1px 0;overflow-wrap:anywhere}
.sid-l.sid-in{padding-left:14px}
.sid-m{font-family:var(--fm,'IBM Plex Mono',ui-monospace,monospace);font-size:12.5px}
.sid-msg{font-size:13px;color:var(--coral,#d04a3a);margin:8px 0 0}`;

  const VOICE_COLORS = ['#1f5fa8', '#c25a00', '#2a8a4a'];
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const PX = 2;                                              // piano roll: pixels per frame
  const LO = 12, HI = 108;                                   // piano roll: C1 to C9
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
  const bytes = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  const noteName = (n) => NAMES[n % 12] + Math.floor(n / 12);  // note 0 = C0, 57 = A4
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // mount(root, {driver, data, tunes, rows, mark, gain, colors}) builds the player inside root.
  //   tunes   the names of the driver's tunes, in its order: one button each
  //   rows    optional: the lines of each voice's panel above its frequency, each
  //           {k: 'Label', f} or, for an indented line with no label, {in: true, mono, f}.
  //           f(v, x) gets the voice's snapshot for the frame (freq, pw, ctrl, ad, sr, env and
  //           whatever the driver's voice(x) returns) and returns the text; null leaves the line
  //           as it was
  //   mark    optional: (v, prev) => true where a note starts, drawn taller on the piano roll;
  //           by default, where the voice's gate comes on
  //   gain    optional: the output level, 0.6 by default
  //   colors  optional: the three voices' colours
  function mount(root, o) {
    if (!document.querySelector('style.sid-style')) {
      const st = document.createElement('style');
      st.className = 'sid-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const E = engine(), HZ = E.CLOCK / 16777216, FPS = E.CLOCK / E.FRAME_CYCLES;
    const C0 = 440 * Math.pow(2, -57 / 12);
    const COLORS = o.colors || VOICE_COLORS, ROWS = o.rows || [];
    const mark = o.mark || ((v, p) => !!(v.ctrl & 1) && !(p && p.ctrl & 1));
    const line = (r, i) => r.k
      ? `<div class="sid-l"><span class="sid-k">${esc(r.k)}</span><span class="sid-m" data-row="${i}">-</span></div>`
      : `<div class="sid-l${r.in ? ' sid-in' : ''}${r.mono ? ' sid-m' : ''}" data-row="${i}">-</div>`;
    root.classList.add('sid-player');
    root.innerHTML =
      '<div class="sid-bar">' +
      o.tunes.map((n, t) => `<button type="button" data-tune="${t}" aria-pressed="false">${esc(n)}</button>`).join('') +
      '<button type="button" data-stop>Stop</button>' +
      '<span class="sid-stat"><span><span class="sid-k">Time</span><span data-g="time">0:00.0</span></span>' +
      '<span><span class="sid-k">Volume</span><span data-g="vol">-</span><span class="sid-vol">' +
      '<i></i>'.repeat(15) + '</span></span></span></div>' +
      '<canvas class="sid-roll" role="img" aria-label="Piano roll: the pitch of each voice over the last seconds"></canvas>' +
      '<div class="sid-voices">' + [0, 1, 2].map((x) => `<div class="sid-v" data-voice="${x}">
        <div class="sid-vh"><i class="sid-sw" style="background:${COLORS[x]}"></i>Voice ${x + 1}
          <button type="button" data-mute="${x}" aria-pressed="false">Mute</button></div>
        <div class="sid-env"><i style="background:${COLORS[x]}"></i></div>
        ${ROWS.map(line).join('')}
        <div class="sid-l"><span class="sid-k">Frequency</span><span class="sid-m" data-row="freq">-</span></div>
      </div>`).join('') + '</div><p class="sid-msg" hidden></p>';

    const $ = (s) => root.querySelector(s);
    const panels = [0, 1, 2].map((x) => {
      const p = root.querySelector(`.sid-v[data-voice="${x}"]`);
      return { env: p.querySelector('.sid-env i'), freq: p.querySelector('[data-row="freq"]'),
        rows: ROWS.map((r, i) => p.querySelector(`[data-row="${i}"]`)) };
    });
    const volBars = root.querySelectorAll('.sid-vol i');
    const canvas = $('.sid-roll'), msg = $('.sid-msg');
    const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
    const muted = [false, false, false];
    const timeEl = $('[data-g="time"]'), volEl = $('[data-g="vol"]');
    const FONT_M = getComputedStyle(root).getPropertyValue('--fm').trim() || "'IBM Plex Mono', monospace";
    const FONT_B = getComputedStyle(root).getPropertyValue('--fb').trim() || "'Lato', sans-serif";
    let ctx = null, send = () => {}, starting = null, raf = 0, playing = -1, quietSince = 0, runs = 0;
    let queue = [], hist = [];

    async function audio() {                                 // created on the first click only
      const h = await host({ driver: o.driver, data: o.data, gain: o.gain, onFrame: take });
      ctx = h.ctx; send = h.send;
      root.dataset.sidAudio = h.mode;
      muted.forEach((on, voice) => send({ cmd: 'mute', voice, on }));
    }

    function take(s) {
      queue.push(s);
      if (queue.length > 600) queue.splice(0, queue.length - 600);
    }

    async function start(tune) {
      try {
        await (starting = starting || audio());
      } catch (e) {
        msg.textContent = e.message || 'Audio could not start.';
        msg.hidden = false;
        return;
      }
      send({ cmd: 'start', tune, run: ++runs });
      playing = tune; quietSince = 0;
      buttons();
      if (!raf) raf = requestAnimationFrame(loop);
    }

    function buttons() {
      root.querySelectorAll('[data-tune]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.tune === playing)));
    }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (ctx && ctx.state !== 'running') ctx.resume();     // inside the click, for strict browsers
      if (b.dataset.tune !== undefined) start(+b.dataset.tune);
      else if (b.hasAttribute('data-stop')) { send({ cmd: 'stop' }); playing = -1; buttons(); }
      else if (b.dataset.mute !== undefined) {
        const x = +b.dataset.mute;
        muted[x] = !muted[x];
        b.setAttribute('aria-pressed', String(muted[x]));
        send({ cmd: 'mute', voice: x, on: muted[x] });
        draw();
      }
    });

    function loop() {
      raf = requestAnimationFrame(loop);
      const now = ctx.currentTime - (ctx.outputLatency || 0);
      let s = null;
      while (queue.length && queue[0].t <= now) { s = queue.shift(); hist.push(s); }
      if (!s) return;
      const keep = Math.ceil(canvas.clientWidth / PX) + 2;
      if (hist.length > keep) hist.splice(0, hist.length - keep);
      show(s);
      draw();
      if (!s.playing && s.run === runs) {                   // stopped: by Stop or by the tune's own end
        if (playing >= 0) { playing = -1; buttons(); }
        if (!quietSince) quietSince = now;
        else if (now - quietSince > 2) { cancelAnimationFrame(raf); raf = 0; ctx.suspend(); }
      } else quietSince = 0;
    }

    function show(s) {
      const d = Math.floor(s.frame / FPS * 10);             // tenths of a second
      setText(timeEl, Math.floor(d / 600) + ':' + ((d % 600) / 10).toFixed(1).padStart(4, '0'));
      setText(volEl, String(s.vol));
      volBars.forEach((b, i) => b.classList.toggle('sid-lit', i < s.vol));
      s.v.forEach((v, x) => {
        const f = panels[x];
        f.env.style.width = (v.env / 2.55).toFixed(1) + '%';
        ROWS.forEach((r, i) => { const t = r.f(v, x); if (t != null) setText(f.rows[i], t); });
        const hz = v.freq * HZ, n = Math.round(12 * Math.log2(hz / C0));
        setText(f.freq, `${hex(v.freq, 4)}, ${hz.toFixed(1)} Hz` + (v.freq && n >= 0 && n < 120 ? `, ${noteName(n)}` : ''));
      });
    }

    function draw() {                                        // the piano roll, newest frame on the right
      const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      }
      const g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const y = (n) => H - 8 - (n - LO) * (H - 16) / (HI - LO);
      g.font = '10px ' + FONT_M;
      for (let o = 1; o <= 8; o++) {
        const yy = Math.round(y(12 * o)) + 0.5;
        g.fillStyle = '#e0ded8'; g.fillRect(0, yy, W, 1);
        g.fillStyle = '#80838a'; g.fillText('C' + o, 4, yy - 2);
      }
      if (!hist.length) {
        g.fillStyle = '#80838a'; g.font = '13px ' + FONT_B;
        g.fillText('Choose a tune to start.', 40, H / 2);
        return;
      }
      const x0 = W - hist.length * PX;
      for (let i = 0; i < hist.length; i++) {
        const s = hist[i], p = hist[i - 1];
        for (let x = 0; x < 3; x++) {
          const v = s.v[x];
          if (!v.env || !v.freq || !(v.ctrl & 0xF0)) continue;
          const n = 12 * Math.log2(v.freq * HZ / C0);
          if (n < LO - 1 || n > HI + 1) continue;
          const start = mark(v, p && p.v[x]);
          g.globalAlpha = muted[x] ? 0.12 : 0.3 + 0.7 * v.env / 255;
          g.fillStyle = COLORS[x];
          g.fillRect(x0 + i * PX, y(n) - (start ? 3 : 1.5), PX, start ? 6 : 3);
        }
      }
      g.globalAlpha = 1;
    }

    draw();
    window.addEventListener('resize', draw);
  }

  return { engine, host, mount, hex, bytes, noteName };
})();
