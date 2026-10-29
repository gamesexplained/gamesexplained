// The C64's sound chip for game pages: a model of the SID, a player that runs a game's own music
// driver through the model as the game calls it, once a frame or once a timer period, and a
// display of what the driver plays. No dependencies.
// Exposes C64Sid (window.C64Sid on a page; globalThis.C64Sid in node, for tests).
//
// A game supplies its music driver, ported from the game's code: a function createDriver(data,
// C64Cpu) that refers to nothing outside itself (the player runs its source text in an
// AudioWorklet) and returns an object with
//   init(tune)  start a tune, as the game's own call does
//   stop()      stop the music, as the game's own call does
//   play()      one call of the driver, as the game's interrupt makes it: once a frame, or once
//               a period where the page passes one (below)
//   sid         a Uint8Array(25): $D400-$D418 as the driver last wrote them
//   playing()   true while a tune runs, false once it has ended or been stopped
//   voice(x)    optional: plain data about voice x (0-2) for the display's rows; a field named
//               as one the player reads from the chip (freq, pw, ctrl, ad, sr, env) is ignored
//   readback(env3, osc3, bus)  optional: called before each play() with what $D41C and $D41B
//               read, voice 3's envelope level and the top eight bits of its waveform, and what a
//               register the chip does not answer reads (bus, below), as the model has them at
//               the frame's start (the chip's values move within the frame; these do not)
//   writes      optional: every register write of the last frame in order, as a flat list
//               [register, value, register, value, ...]. When a driver keeps it, the player
//               applies the writes in order instead of the frame's final registers, so a gate
//               turned off and on again within one frame restarts the envelope, as on the chip
// A driver that reads a register it writes ($D400-$D418) does not get back what it wrote there:
// the chip answers only $D419-$D41C, and a read of any other register returns the data bus, the
// last value written to any register (or read from $D41B or $D41C), until it fades (createBus,
// below). Before the driver's first write of a frame that is readback's bus; after it, the
// driver's own last write. The player leaves the frame's last write on the bus when the driver
// keeps writes, and otherwise the last register to change, in register order. Test such a
// driver's port against its original with the bus, never with a copy of each register:
// kit/c64/machine.js reads the SID through createBus, and a test on kit/cpu/cpu6502.js alone
// passes it as io (createBus's comment).
// data is anything that survives structured cloning, usually the driver's tables as the game
// loads them. Test the port against the game's own code run in a 6502 simulator, every register
// after every frame, before it goes on a page: kit/cpu/cpu6502.js hands the driver's writes to the
// test in order, so writes too can be compared.
// C64Cpu is that simulator, kit/cpu/cpu6502.js, which the site serves as ../../lib/cpu6502.js: a
// page that loads it before the player starts has it passed to createDriver, in the worklet (the
// player puts its source text there beside the driver's) and on the page alike, and undefined
// otherwise. A driver that runs the game's own code, its bytes from the listing, runs it on
// new C64Cpu.CPU(memory, { port: 0x35, io }), never on a 6502 of its own, and keeps the SID's
// writes as io.write receives them; its test passes require('<repo>/kit/cpu/cpu6502.js') as the
// second argument, so the page runs on the simulator the test held it to.
//
// The model: three voices with triangle, sawtooth, pulse and noise (the 23-bit noise register),
// the test bit, sync and ring modulation; envelopes on reSID's rate table, with the exponential
// decay and the ADSR delay bug; the C64's output stage (16 kHz low pass, 16 Hz high pass).
// The filter is off unless a page asks for it (opts.filter '6581' or '8580'; 'none', the default,
// sends every voice straight out and ignores the cutoff, resonance and filter modes, but voice 3
// off, $D418 bit 7, still cuts voice 3 when $D417 does not route it to the filter, as on the
// chip: a game that reads voice 3 as a random source keeps it silent that way). When on, it is
// reSID 0.16's idealised two-integrator state-variable filter (filter.cc, filter.h), checked
// against its source: cutoff
// from $D415/$D416 through the chip's measured curve (F0_6581 or F0_8580, below), Q = 0.707 +
// resonance / 15, low-, band- and high-pass summed unweighted as $D418 selects, and voice 3 off
// ($D418 bit 7) where voice 3 is not filtered. Two departures: the integrators step in seconds of
// the PAL clock, where reSID counts a cycle as 1 microsecond (its cutoffs sit 1.5 % lower on PAL),
// and they take smaller steps where reSID caps the cutoff for stability (at 16 kHz or 4 kHz). Each
// curve is one chip's: real 6581s differ from each other in cutoff by large factors, and distort,
// which this does not. Not modelled either way: combined
// waveforms (approximated by AND), the mixer's DC level unless a page asks for it (opts.digi,
// below), the time between writes inside a frame (a frame's writes land at one instant, so
// a gate opened and closed inside one frame is silent here, where the chip runs the attack for the
// cycles between; the test bit set and cleared inside one frame still resets the oscillator). The clock is PAL's (985,248 Hz, frames of 312 lines of 63 cycles) unless a page
// passes ntsc: true to mount or host (1,022,727 Hz, frames of 263 lines of 65 cycles).
// The player calls the driver once a frame of that clock unless a page passes period, a number of
// cycles (1 or more), to mount or host: then once a period, for a game that calls its driver from
// a CIA timer. A timer whose latch holds n runs out every n + 1 cycles. Each call comes a period
// after the one before, at the first sample at or after its cycle, so the error never adds up.
// Where this script says frame, it means one call of the driver, however it is timed.
// Samples played through the volume register ($D418's low four bits, written from a timer's
// interrupt) need two things: the writes at the timer's pace, which period gives when the driver
// runs the game's interrupt itself (a period of a few dozen cycles, with the game's timer counted
// down inside the driver), and the level the volume scales when no voice sounds. On a 6581 every
// voice adds a DC level to the mixer, so a change of volume moves the output: opts.digi sets that
// level, in units of one voice's full swing, on mount, host and createSID. reSID 0.16 gives each
// 6581 voice a DC of $800 * $FF against a swing of ($FFF - $380) * $FF, about 0.64, so about 2 for
// the three voices of a 6581; the 8580's is close to 0, and 0, the default, leaves it out.
//
//   C64Sid.mount(root, options)  the player: tune buttons, a seek bar, a bouncing ball a voice
//                                (../../lib/bounce.js) or a piano roll, and a panel per voice
//   C64Sid.host(options)         the sound alone, for a page with its own controls; with live:
//                                true, the writes a Play tab's game makes as it runs
//   C64Sid.engine()              the model, the bus and the frame player without a page, for
//                                tests
//   C64Sid.worklet(driver)       the source text host() runs in the AudioWorklet, for tests
//   C64Sid.live                  the driver host() runs for live: true, for C64Sid.worklet in tests
//   C64Sid.waveLevel(ctrl, pw)   how loud a voice's waveform is against its envelope, 0 to 1
globalThis.C64Sid = (function () {
  'use strict';
  // How loud a voice's waveform is, 0 to 1, against the level its envelope sets: none with no
  // waveform or with the test bit holding the oscillator, and for a pulse its RMS against a
  // square's, 2 sqrt(d (1 - d)) for a width d of the cycle, as the model's output measures it (a
  // pulse 100 of 4096 wide is a third as loud as a square). A sweep of a pulse's width from 0 is
  // how a driver fades a voice in (Wizball's title, voice 3).
  function waveLevel(ctrl, pw) {
    if (!(ctrl & 0xF0) || ctrl & 8) return 0;
    if (!(ctrl & 0x40)) return 1;
    const d = (pw & 0xFFF) / 4096;
    return 2 * Math.sqrt(d * (1 - d));
  }

  // where this script was loaded from, to load the bouncing ball (bounce.js) from beside it
  const HERE = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
  let bounceLoad = null;
  function noteBounce() {
    if (globalThis.NoteBounce) return Promise.resolve(globalThis.NoteBounce);
    if (!bounceLoad) bounceLoad = new Promise((ok, fail) => {
      if (!HERE) { fail(new Error('no bounce.js')); return; }
      const sc = document.createElement('script');
      sc.src = new URL('bounce.js', HERE).href;
      sc.onload = () => globalThis.NoteBounce ? ok(globalThis.NoteBounce) : fail(new Error('no NoteBounce'));
      sc.onerror = fail;
      document.head.appendChild(sc);
    });
    return bounceLoad;
  }

  // Everything that makes sound is inside engine(), which refers to nothing outside itself:
  // host() runs it in an AudioWorklet from its own source text, and node runs it for tests.
  function engine() {
    'use strict';
    const CLOCK = 985248;               // PAL clock, Hz
    const FRAME_CYCLES = 312 * 63;      // one PAL frame: 312 lines of 63 cycles (50.12 Hz)
    // an NTSC machine (opts.ntsc): its clock, 1,022,727 Hz, and its frames of 263 lines of 65
    // cycles (59.83 Hz), for a game that runs its driver once an NTSC frame
    const NTSC_CLOCK = 1022727, NTSC_FRAME_CYCLES = 263 * 65;
    const clockOf = (opts) => opts && opts.ntsc ? NTSC_CLOCK : CLOCK;
    const frameOf = (opts) => opts && opts.ntsc ? NTSC_FRAME_CYCLES : FRAME_CYCLES;
    // cycles between the driver's calls: opts.period, for a driver a CIA timer calls, or a frame
    const periodOf = (opts) => opts && +opts.period >= 1 ? +opts.period : frameOf(opts);

    // ------------------------------------------------------------------ the SID
    // Rate periods from reSID (VICE src/resid/envelope.cc): the envelope steps every
    // period + 1 cycles; decay and release divide that clock again by 1 to 30 as the level falls.
    const RATE = [8, 31, 62, 94, 148, 219, 266, 312, 391, 976, 1953, 3125, 3906, 11719, 19531, 31250];
    const ATTACK = 0, DECAY = 1, RELEASE = 2;

    // Filter cutoff in Hz against the 11-bit register ($D416 << 3 | $D415 & 7): reSID 0.16's
    // measured points (filter.cc, f0_points_6581 and f0_points_8580, repeated end points and the
    // 6581's step at $80 included) joined by its cubic splines (spline.h), one entry per value,
    // truncated to whole Hz as reSID stores them: all 2048 as reSID's tables but the last, 1 Hz
    // higher here (reSID steps along the curve by forward differences). Each curve is one C64's.
    const F0_6581 = [[0, 220], [0, 220], [128, 230], [256, 250], [384, 300], [512, 420], [640, 780],
      [768, 1600], [832, 2300], [896, 3200], [960, 4300], [992, 5000], [1008, 5400], [1016, 5700],
      [1023, 6000], [1023, 6000], [1024, 4600], [1024, 4600], [1032, 4800], [1056, 5300], [1088, 6000],
      [1120, 6600], [1152, 7200], [1280, 9500], [1408, 12000], [1536, 14500], [1664, 16000],
      [1792, 17100], [1920, 17700], [2047, 18000], [2047, 18000]];
    const F0_8580 = [[0, 0], [0, 0], [128, 800], [256, 1600], [384, 2500], [512, 3300], [640, 4100],
      [768, 4800], [896, 5600], [1024, 6500], [1152, 7500], [1280, 8400], [1408, 9200], [1536, 9800],
      [1664, 10500], [1792, 11000], [1920, 11700], [2047, 12500], [2047, 12500]];
    function splineTable(pts) {                              // spline.h's interpolate(), res 1
      const f = new Float64Array(2048);
      for (let i = 0; i + 3 < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], [x2, y2] = pts[i + 2], [x3, y3] = pts[i + 3];
        if (x1 === x2) continue;
        let k1, k2;
        if (x0 === x1 && x2 === x3) k1 = k2 = (y2 - y1) / (x2 - x1);
        else if (x0 === x1) { k2 = (y3 - y1) / (x3 - x1); k1 = (3 * (y2 - y1) / (x2 - x1) - k2) / 2; }
        else if (x2 === x3) { k1 = (y2 - y0) / (x2 - x0); k2 = (3 * (y2 - y1) / (x2 - x1) - k1) / 2; }
        else { k1 = (y2 - y0) / (x2 - x0); k2 = (y3 - y1) / (x3 - x1); }
        const dx = x2 - x1, dy = y2 - y1;
        const a = ((k1 + k2) - 2 * dy / dx) / (dx * dx);
        const b = ((k2 - k1) / dx - 3 * (x1 + x2) * a) / 2;
        const c = k1 - (3 * x1 * a + 2 * b) * x1;
        const d = y1 - ((x1 * a + b) * x1 + c) * x1;
        for (let x = x1; x <= x2; x++) f[x] = Math.max(0, Math.trunc(((a * x + b) * x + c) * x + d));
      }
      return f;
    }
    const F0 = { '6581': splineTable(F0_6581), '8580': splineTable(F0_8580) };

    // ------------------------------------------------------------------ the data bus
    // A read of a register the SID does not answer ($D400-$D418, $D41D-$D41F and their mirrors)
    // returns the data bus: the last value written to any register, or read from $D41B or $D41C,
    // which put theirs on it. It holds for 0x1D00 cycles on the 6581 and 0xA2000 (about 34
    // frames) on the 8580, then reads 0, and each read of a register the chip does not answer
    // halves the time left. That is VICE's reSIDfp (libresidfp's SID.cpp, read() and write(), and
    // ageBusValue() in SID.h), checked to the cycle against the kit's VICE build (v3.13.2) by
    // kit/c64/test_sid_bus.js, on readings kit/c64/sid_bus.py recorded there
    // (kit/c64/fixtures/sid-bus.json). The emulator's rule, not a chip's: a real SID's bits fade
    // one by one, at rates that differ from chip to chip. $D419 and $D41A, the paddles, are
    // VICE's own: $FF with none plugged in, and the bus untouched. createSID's bus fades as its
    // filter's chip's, the 8580's with the filter off (the chip the kit's VICE starts with).
    // createBus(chip) keeps the bus on the caller's clock t, in cycles:
    //   write(value, t)  read(register, t, own)  peek(t)  chip(model)  save()  load(state)
    // own is what $D41B or $D41C holds at t (read ignores it for the other registers). A test
    // on kit/cpu/cpu6502.js passes it as the SID's part of io:
    //   const bus = C64Sid.engine().createBus('8580');
    //   io = { read: (a, cpu) => bus.read(a & 31, cpu.cycles, 0), write: (a, v, cpu) => bus.write(v, cpu.cycles) }
    const HOLD = { '6581': 0x1D00, '8580': 0xA2000 };
    function createBus(chip) {
      let value = 0, ttl = 0, at = 0, hold = HOLD[chip] || HOLD['8580'];
      function age(t) {
        const n = t - at;
        at = t;
        if (ttl !== 0) { ttl -= n; if (ttl <= 0) { value = 0; ttl = 0; } }
      }
      return {
        write(v, t) { age(t); value = v & 0xFF; ttl = hold; },
        read(r, t, own) {
          r &= 31;
          if (r === 0x19 || r === 0x1A) return 0xFF;
          age(t);
          if (r === 0x1B || r === 0x1C) { value = own & 0xFF; ttl = hold; return value; }
          ttl = Math.trunc(ttl / 2);
          return value;
        },
        peek(t) { age(t); return value; },
        chip(c) { hold = HOLD[c] || HOLD['8580']; },
        save() { return [value, ttl, at]; },               // the state, for a machine's save
        load(s) { [value, ttl, at] = s; },
      };
    }

    function noiseBits(r) {                                  // LFSR bits 20,18,14,11,9,5,2,0 -> output bits 11-4
      return (r >> 9 & 0x800) | (r >> 8 & 0x400) | (r >> 5 & 0x200) | (r >> 3 & 0x100) |
        (r >> 2 & 0x080) | (r << 1 & 0x040) | (r << 3 & 0x020) | (r << 4 & 0x010);
    }

    function createSID(sampleRate, opts) {
      const CK = clockOf(opts);
      const cps = CK / sampleRate;                           // cycles per output sample
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
      const digi = opts && +opts.digi > 0 ? +opts.digi * 2048 * 255 : 0;   // the mixer's DC level (opts.digi)
      let vol = 0, frac = 0, lp = 0, dc = 0, now = 0;        // now: cycles run, the bus's clock
      const bus = createBus('8580');
      // the filter: chip 'none', '6581' or '8580'; state in the units of one voice's output
      const F = { chip: 'none', w: 0, n: 1, q1: 1 / 0.707, hp: 0, bp: 0, lp: 0 };

      function filterSet() {                                 // cutoff and Q from the registers
        const fc = (regs[21] & 7) | regs[22] << 3;
        const w = 2 * Math.PI * (F0[F.chip] ? F0[F.chip][fc] : 0) * dt / CK;   // per oscillator step
        F.n = Math.max(1, Math.ceil(w / 0.2));               // small steps keep the integrators stable
        F.w = w / F.n;
        F.q1 = 1 / (0.707 + (regs[23] >> 4) / 15);
      }
      function setFilter(chip) {
        F.chip = chip === '6581' || chip === '8580' ? chip : 'none';
        bus.chip(F.chip === 'none' ? '8580' : F.chip);     // the bus fades as the filter's chip's
        F.hp = F.bp = F.lp = 0;
        filterSet();
      }

      function write(r, val) {
        bus.write(val, now);
        if (r > 24) return;                                  // $D419-$D41F: nothing to set
        regs[r] = val;
        if (r === 24) { vol = val & 15; return; }            // routing and mode: read in sample()
        if (r > 20) { filterSet(); return; }
        const o = V[(r / 7) | 0];
        switch (r % 7) {
          case 0: o.freq = (o.freq & 0xFF00) | val; break;
          case 1: o.freq = (o.freq & 0x00FF) | val << 8; break;
          case 2: o.pw = (o.pw & 0xF00) | val; break;
          case 3: o.pw = (o.pw & 0x0FF) | (val & 15) << 8; break;
          case 4:
            // the test bit resets the oscillator at once, so a driver that sets it and clears it
            // again within one frame (a frame's writes land at one instant) still restarts the wave
            if (val & 8) { o.acc = 0; o.msbUp = false; }
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
          if (o.hold || (o.state === DECAY && o.env === (o.sr >> 4) * 0x11)) {
            // the level cannot move: count the remaining periods at once (expc < expp, always)
            const m = 1 + Math.floor(n / p);
            o.rc = n % p;
            if (o.state !== ATTACK) o.expc = (o.expc + m) % o.expp;
            return;
          }
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
        now += c;
        for (let i = 0; i < 3; i++) clockEnv(V[i], c);
        let sum = 0;
        for (let k = 0; k < sub; k++) {
          sum += digi;                                       // the DC the volume scales (opts.digi)
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
          if (F.chip === 'none') {                         // voice 3 off still cuts an unrouted voice 3
            const off3 = (regs[24] & 0x80) && !(regs[23] & 4);
            for (let i = 0; i < 3; i++) if (!mute[i] && !(i === 2 && off3)) sum += (wave(V[i], V[SRC[i]]) - 0x800) * V[i].env;
            continue;
          }
          const route = regs[23], mode = regs[24];
          let fi = 0;                                        // into the filter
          for (let i = 0; i < 3; i++) {
            if (mute[i]) continue;
            const v = (wave(V[i], V[SRC[i]]) - 0x800) * V[i].env;
            if (route >> i & 1) fi += v;
            else if (i !== 2 || !(mode & 0x80)) sum += v;    // voice 3 off applies unfiltered only
          }
          for (let k2 = 0; k2 < F.n; k2++) {                 // reSID's integrators, in its order
            F.bp -= F.w * F.hp;
            F.lp -= F.w * F.bp;
            F.hp = F.bp * F.q1 - F.lp - fi;
          }
          if (mode & 0x10) sum += F.lp;
          if (mode & 0x20) sum += F.bp;
          if (mode & 0x40) sum += F.hp;
        }
        const x = sum * vol / (sub * 3 * 2048 * 255 * 15);
        lp += (x - lp) * kLP;
        dc += (lp - dc) * kHP;
        const y = (lp - dc) * gain;
        return y > 1 ? 1 : y < -1 ? -1 : y;
      }

      function skip(c) {                                     // c cycles with no output: envelopes and phases
        now += c;
        for (let i = 0; i < 3; i++) {
          const o = V[i];
          clockEnv(o, c);
          o.msbUp = false;
          if (o.ctrl & 8) o.acc = 0;
          else o.acc = (o.acc + o.freq * c) % 0x1000000;
        }
      }

      setFilter(opts && opts.filter);
      const read3 = () => [V[2].env, wave(V[2], V[SRC[2]]) >> 4];   // $D41C, $D41B
      // a read of register r ($D400 + r) as the processor makes it, the bus's included
      const read = r => bus.read(r, now, (r & 31) === 0x1C ? V[2].env : wave(V[2], V[SRC[2]]) >> 4);
      const peek = () => bus.peek(now);                      // the bus, with no read's effect on it
      return { V, mute, write, setRegs, sample, skip, setFilter, read3, read, peek, filter: () => F.chip };
    }

    // ------------------------------------------------------------------ driver + SID + frames
    // createPlayer(driver, sampleRate, opts) takes the commands {cmd: 'start', tune, run, at},
    // {cmd: 'stop'}, {cmd: 'mute', voice, on} and {cmd: 'filter', chip}; render() fills a buffer, running the driver
    // once a frame (periodOf). A start with at > 0 begins that many frames into the tune: the driver
    // runs from the tune's start through the model without sound, since a driver's state is
    // everything it has played so far and nothing short of playing it recreates it.
    function createPlayer(drv, sampleRate, opts) {
      const sid = createSID(sampleRate, opts), cps = clockOf(opts) / sampleRate, FRAME = periodOf(opts);
      let toFrame = 0, frames = 0, on = false, run = 0;
      function command(c) {
        if (c.cmd === 'start') {
          drv.init(c.tune); frames = 0; on = true; run = c.run || 0;
          if (c.at > 0) {
            frame();                                         // init's writes, and the first frame
            while (frames < c.at && drv.playing()) { sid.skip(FRAME); frame(); }
            toFrame = FRAME;                                 // the last frame is heard
          }
        }
        else if (c.cmd === 'stop') drv.stop();
        else if (c.cmd === 'mute') sid.mute[c.voice] = !!c.on;
        else if (c.cmd === 'filter') sid.setFilter(c.chip);
      }
      function snapshot(t) {                                 // what the display needs, per frame
        const s = drv.sid, v = [];
        for (let x = 0; x < 3; x++) {
          const r = 7 * x;
          v.push(Object.assign({}, drv.voice ? drv.voice(x) : null, { freq: s[r] | s[r + 1] << 8,
            pw: (s[r + 2] | s[r + 3] << 8) & 0xFFF, ctrl: s[r + 4], ad: s[r + 5], sr: s[r + 6], env: sid.V[x].env }));
        }
        return { t, run, frame: frames, vol: s[24] & 15, playing: drv.playing(), v };
      }
      function frame() {                                     // the game calls its driver
        if (drv.readback) drv.readback(...sid.read3(), sid.peek());
        drv.play();
        const w = drv.writes;                                // in order, where the driver keeps them
        if (w) for (let k = 0; k + 1 < w.length; k += 2) sid.write(w[k], w[k + 1]);
        sid.setRegs(drv.sid);
        if (drv.playing()) frames++;
      }
      // fill out[0..n) from time t0; post(snapshot) after each driver frame
      function render(out, n, t0, post) {
        for (let i = 0; i < n; i++) {
          while (toFrame <= 0) {                             // a new frame (a period under a sample: several)
            toFrame += FRAME;
            if (on) {
              frame();
              if (post) post(snapshot(t0 + i / sampleRate));
            }
          }
          out[i] = sid.sample();
          toFrame -= cps;
        }
      }
      return { drv, sid, command, render };
    }

    // ------------------------------------------------------------------ a game's writes, live
    // createLive({ most }) is the driver for a Play tab, whose game makes its SID writes as it runs
    // (host's live option, below). init(tune) queues tune.frames, each the writes [register, value,
    // ...] of one call; each call plays the next. With none waiting the registers hold, and the
    // queue is a call longer from then on, so it grows to what the page's uneven frames and the
    // audio device's buffer need. With more than most waiting the oldest are written at once and
    // the sound catches up. liveMost(opts) is half a second of calls: the device alone can take
    // 100 ms at a time, and a queue shorter than the two together runs dry and overflows by turns,
    // which is heard as music skipping (kit/lessons/2026-10-24-master-of-magic-sound.md).
    function createLive(o) {
      const most = Math.max(1, (o && o.most) | 0), sid = new Uint8Array(25), queue = [];
      const d = { sid, writes: [], playing: () => true, stop() {},
        queued: () => queue.length,
        init(t) {
          if (t && t.frames) for (const f of t.frames) queue.push(f);
          while (queue.length > most) { const f = queue.shift(); queue[0] = f.concat(queue[0]); }
        },
        play() {
          const f = queue.shift();
          d.writes = f || [];
          if (f) for (let i = 0; i + 1 < f.length; i += 2) if (f[i] < 25) sid[f[i]] = f[i + 1];
        } };
      return d;
    }
    const liveMost = (opts) => Math.ceil(0.5 * clockOf(opts) / periodOf(opts));

    return { CLOCK, FRAME_CYCLES, NTSC_CLOCK, NTSC_FRAME_CYCLES, periodOf, createBus, createSID, createPlayer,
      createLive, liveMost };
  }

  // ------------------------------------------------------------------ the sound, on a page
  const WORKLET = `
class C64SidProcessor extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const q = o.processorOptions;
    this.post = q.frames ? (s) => this.port.postMessage(s) : null;
    this.port.onmessage = (e) => { if (this.p) try { this.p.command(e.data); } catch (err) { this.fail(err); } };
    try { this.p = E.createPlayer(createDriver(q.data, C64Cpu), sampleRate, q.opts); } catch (err) { this.fail(err); }
  }
  // a driver that throws here goes silent and says why to the page, which logs it
  fail(err) { this.p = null; this.port.postMessage({ driverError: String(err) }); }
  process(inputs, outputs) {
    if (!this.p) return true;
    const ch = outputs[0];
    try { this.p.render(ch[0], ch[0].length, currentTime, this.post); } catch (err) { this.fail(err); return true; }
    for (let k = 1; k < ch.length; k++) ch[k].set(ch[0]);
    return true;
  }
}
registerProcessor('c64-sid', C64SidProcessor);`;

  // The worklet's module: the model, the 6502 when the page has loaded ../../lib/cpu6502.js, the
  // page's driver and the processor, each from its source text.
  function worklet(driver) {
    const cpu = globalThis.C64Cpu;
    return 'const E = (' + engine.toString() + ')();\n' +
      'const C64Cpu = ' + (cpu && cpu.core ? '(' + cpu.core.toString() + ')()' : 'undefined') + ';\n' +
      'const createDriver = (' + driver.toString() + ');\n' + WORKLET;
  }

  // host({driver, data, gain, filter, ntsc, period, digi, onFrame, onError}): an AudioContext playing the driver through the model.
  // Call it from a click or a key press, where browsers allow sound to start. It resolves to
  // {ctx, mode, send(command), push(frames)}. onFrame(snapshot), if given, receives every driver
  // frame when it is computed, ahead of the sound; show it once snapshot.t has reached
  // ctx.currentTime. A driver that throws in the worklet (most often one that uses a name of the
  // page's, which the worklet's copy of its source text cannot see) goes silent there: the error
  // is logged on the page's console and passed to onError(text), if given.
  // A Play tab, whose game makes its SID writes as it runs, passes live: true instead of a driver:
  // the driver is then createLive's, and push(frames) queues the writes of each call to come,
  // [[register, value, ...], ...], one call a frame or a period. The first push is usually all 25
  // registers as they stand.
  const LIVE = function (data) { return E.createLive(data); };   // in the worklet, where E is the model
  async function host(o) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('This browser has no Web Audio.');
    const ctx = new AC();
    ctx.resume();
    const opts = { gain: o.gain, filter: o.filter, ntsc: !!o.ntsc, period: o.period, digi: o.digi }, post = o.onFrame || null;
    const E = engine(), data = o.live ? { most: E.liveMost(opts) } : o.data;
    const code = worklet(o.live ? LIVE : o.driver);
    const urls = ['data:text/javascript;charset=utf-8,' + encodeURIComponent(code),
      () => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))];
    let node = null, local = null;
    for (const u of ctx.audioWorklet ? urls : []) {
      try {
        await ctx.audioWorklet.addModule(typeof u === 'function' ? u() : u);
        node = new AudioWorkletNode(ctx, 'c64-sid', { numberOfInputs: 0, outputChannelCount: [1],
          processorOptions: { data, opts, frames: !!post } });
        node.port.onmessage = (e) => {
          if (e.data && e.data.driverError) {
            console.error('C64Sid: the sound driver stopped in the AudioWorklet, which runs createDriver from its source text alone: ' + e.data.driverError);
            if (o.onError) o.onError(e.data.driverError);
          } else if (post) post(e.data);
        };
        break;
      } catch (e) { node = null; }
    }
    if (!node) {                                             // no worklet: the older ScriptProcessorNode
      local = E.createPlayer(o.live ? E.createLive(data) : o.driver(data, globalThis.C64Cpu), ctx.sampleRate, opts);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        local.render(out, out.length, e.playbackTime, post);
      };
    }
    node.connect(ctx.destination);
    const send = (c) => { if (local) local.command(c); else node.port.postMessage(c); };
    return { ctx, mode: local ? 'script-processor' : 'worklet', send,
      push: (frames) => send({ cmd: 'start', tune: { frames } }) };
  }

  // ------------------------------------------------------------------ the player
  const CSS = `
.sid-player{font-family:var(--fb,'Lato',system-ui,sans-serif);color:var(--ink,#2f3136);font-size:14px;line-height:1.5}
.sid-player button{font-family:var(--fm,'IBM Plex Mono',ui-monospace,Menlo,monospace);font-size:12.5px;line-height:1.3;
  background:var(--surface-2,#f1efea);color:var(--ink,#2f3136);border:1px solid var(--line,#d5d3cc);border-radius:7px;padding:6px 12px;cursor:pointer}
.sid-player button:hover{border-color:var(--accent,#1f5fa8)}
.sid-player button[aria-pressed="true"]{background:var(--accent,#1f5fa8);border-color:var(--accent,#1f5fa8);color:#fff}
.sid-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}
.sid-filt{display:inline-flex;align-items:center;gap:4px;margin-left:8px}
.sid-fsw{display:inline-flex;align-items:center;gap:4px}
.sid-fsw[hidden]{display:none}
.sid-filt .sid-k{margin-right:2px}
.sid-fnote{font-size:12.5px;color:var(--ink-mute,#80838a)}
.sid-stat{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-family:var(--fm,'IBM Plex Mono',ui-monospace,monospace);font-size:12.5px}
.sid-k{font-family:var(--fb,'Lato',system-ui,sans-serif);font-size:12.5px;color:var(--ink-mute,#80838a);margin-right:5px}
.sid-vol{display:inline-flex;gap:2px;vertical-align:-1px;margin-left:6px}
.sid-vol i{display:block;width:4px;height:12px;border-radius:1px;background:var(--line,#d5d3cc)}
.sid-vol i.sid-lit{background:var(--accent,#1f5fa8)}
.sid-seek{display:flex;align-items:center;gap:12px;margin:0 0 10px;font-family:var(--fm,'IBM Plex Mono',ui-monospace,monospace);font-size:12.5px}
.sid-seek input{flex:1;min-width:0;margin:0;accent-color:var(--accent,#1f5fa8)}
.sid-seek input:disabled{opacity:.45}
.sid-seek span{white-space:nowrap;font-variant-numeric:tabular-nums}
.sid-roll{display:block;width:100%;height:190px;border:1px solid var(--line,#d5d3cc);border-radius:8px;background:#fff}
.sid-roll[hidden],.sid-stagebox[hidden],.sid-filt[hidden]{display:none}
.sid-stagebox{position:relative}
.sid-stage{display:block;width:100%;height:min(480px,56vw,80vh);border-radius:8px;background:#060607}
@media (orientation:portrait){.sid-stage{height:auto;aspect-ratio:10/13;max-height:72vh}}
.sid-stagebox:fullscreen{background:#060607}
.sid-stagebox:fullscreen .sid-stage{height:100vh;max-height:none;border-radius:0}
.sid-player .sid-full{position:absolute;right:10px;top:10px;padding:3px 9px;font-size:11.5px;background:rgba(30,30,32,.7);color:#e9e7e1;border-color:rgba(255,255,255,.18)}
.sid-player .sid-full[hidden]{display:none}
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
  const PX = 2;                                              // piano roll: pixels for a PAL or NTSC frame's time
  const LO = 12, HI = 108;                                   // piano roll: C1 to C9
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
  const bytes = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  const noteName = (n) => NAMES[n % 12] + Math.floor(n / 12);  // note 0 = C0, 57 = A4
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // mount(root, {driver, data, tunes, rows, mark, gain, filter, ntsc, period, digi, colors}) builds the player inside root.
  //   ntsc    optional: true for a game whose driver runs once an NTSC frame, heard at the NTSC clock
  //   period  optional: the cycles between the driver's calls, for a game that calls it from a CIA
  //           timer (a latch of n: n + 1 cycles). The seek bar and onFrame then count calls, and
  //           the piano roll gives each call the width of its time, so a second is as wide as in a
  //           player that calls its driver once a frame
  //   tunes   the names of the driver's tunes, in its order: one button each
  //   rows    optional: the lines of each voice's panel above its frequency, each
  //           {k: 'Label', f} or, for an indented line with no label, {in: true, mono, f}.
  //           f(v, x) gets the voice's snapshot for the frame (freq, pw, ctrl, ad, sr, env and
  //           whatever the driver's voice(x) returns) and returns the text; null leaves the line
  //           as it was
  //   mark    optional: (v, prev) => true where a note starts, drawn taller on the piano roll;
  //           by default, where the voice's gate comes on
  //   gain    optional: the output level, 0.6 by default
  //   filter  optional: '6581', '8580' or 'none', the filter the player starts with. Given, the
  //           player shows a switch between the three, heard at once, to compare them, and
  //           shows in its place that the chosen tune never routes a voice through the filter;
  //           left out, the filter is off and there is no switch
  //   digi    optional: the mixer's DC level that volume-register samples move (engine, above);
  //           about 2 for a 6581, 0 by default
  //   colors  optional: the three voices' colours
  //   onFrame optional: (frame, tune) => ..., called with each frame the reader hears, as the
  //           display shows it, for a page that draws something in step with the music (lyrics,
  //           a screen); frame counts from the tune's start, as the seek bar does
  //   bounce  optional: false for the piano roll alone. Otherwise the player shows a bouncing
  //           ball in its place, with a switch between the two and a full-screen button: a ball
  //           a voice hops from note to note as the reader hears them, and rides the voice's
  //           pitch as it bends or wavers between (NoteBounce, ../../lib/bounce.js, loaded from
  //           beside this script unless the page has loaded it; where it cannot load, the piano
  //           roll). The player runs the driver ahead when a tune starts, as for its length, and
  //           takes a note where mark says one starts, and where the pitch steps to a new note
  //           and holds
  function mount(root, o) {
    if (!document.querySelector('style.sid-style')) {
      const st = document.createElement('style');
      st.className = 'sid-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const FILTERS = [['none', 'Off'], ['6581', '6581'], ['8580', '8580']];
    let filter = o.filter && FILTERS.some(([c]) => c === o.filter) ? o.filter : 'none';
    const E = engine(), CK = o.ntsc ? E.NTSC_CLOCK : E.CLOCK, PERIOD = E.periodOf(o);
    const HZ = CK / 16777216, FPS = CK / PERIOD;
    const px = PX * PERIOD / (o.ntsc ? E.NTSC_FRAME_CYCLES : E.FRAME_CYCLES);   // piano roll: pixels a call
    const C0 = 440 * Math.pow(2, -57 / 12);
    const COLORS = o.colors || VOICE_COLORS, ROWS = o.rows || [];
    const mark = o.mark || ((v, p) => !!(v.ctrl & 1) && !(p && p.ctrl & 1));
    const BOUNCE = o.bounce !== false;
    const line = (r, i) => r.k
      ? `<div class="sid-l"><span class="sid-k">${esc(r.k)}</span><span class="sid-m" data-row="${i}">-</span></div>`
      : `<div class="sid-l${r.in ? ' sid-in' : ''}${r.mono ? ' sid-m' : ''}" data-row="${i}">-</div>`;
    root.classList.add('sid-player');
    root.innerHTML =
      '<div class="sid-bar">' +
      o.tunes.map((n, t) => `<button type="button" data-tune="${t}" aria-pressed="false">${esc(n)}</button>`).join('') +
      '<button type="button" data-stop>Stop</button>' +
      (o.filter ? '<span class="sid-filt" role="group" aria-label="The SID filter">' +
        '<span class="sid-fsw"><span class="sid-k">Filter</span>' +
        FILTERS.map(([c, n]) => `<button type="button" data-filter="${c}" aria-pressed="${c === filter}">${n}</button>`).join('') +
        '</span><span class="sid-fnote" hidden>this tune doesn\u2019t use the filter</span></span>' : '') +
      (BOUNCE ? '<span class="sid-filt" data-views role="group" aria-label="What the player shows"><span class="sid-k">View</span>' +
        '<button type="button" data-view="ball" aria-pressed="true">Ball</button>' +
        '<button type="button" data-view="roll" aria-pressed="false">Piano roll</button></span>' : '') +
      '<span class="sid-stat">' +
      '<span><span class="sid-k">Volume</span><span data-g="vol">-</span><span class="sid-vol">' +
      '<i></i>'.repeat(15) + '</span></span></span></div>' +
      '<div class="sid-seek"><input type="range" min="0" max="1" step="1" value="0" disabled ' +
      'aria-label="Position in the tune"><span data-g="time">0:00.0</span></div>' +
      (BOUNCE ? '<div class="sid-stagebox"><canvas class="sid-stage" role="img" aria-label="A ball for each voice ' +
        'hopping from note to note as they play"></canvas><button type="button" class="sid-full" data-full hidden>' +
        'Full screen</button></div>' : '') +
      '<canvas class="sid-roll" role="img" aria-label="Piano roll: the pitch of each voice over the last seconds"' +
      (BOUNCE ? ' hidden' : '') + '></canvas>' +
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
    const timeEl = $('[data-g="time"]'), volEl = $('[data-g="vol"]'), seek = $('.sid-seek input');
    const FONT_M = getComputedStyle(root).getPropertyValue('--fm').trim() || "'IBM Plex Mono', monospace";
    const FONT_B = getComputedStyle(root).getPropertyValue('--fb').trim() || "'Lato', sans-serif";
    let ctx = null, send = () => {}, starting = null, raf = 0, playing = -1, quietSince = 0, runs = 0;
    let queue = [], hist = [], tune = -1, dragging = false;
    // The bouncing ball: drawn every animation frame from the last frame heard, moved on by the
    // time since, so that it flies smoothly between the player's frames.
    const box = BOUNCE ? $('.sid-stagebox') : null, full = BOUNCE ? $('[data-full]') : null;
    let ball = null, view = BOUNCE ? 'ball' : 'roll', heard = null, heardAt = 0;
    // Each tune's length in frames, or null where it runs on past LONG: measured once, by running
    // the driver as the player does (a few milliseconds for minutes of music). A tune that runs on
    // gets a bar LONG long, which grows if the tune is played past it. The same run notes whether
    // the tune ever routes a voice through the filter ($D417 bits 0-2), for the filter switch,
    // and, for the bouncing ball, the frame and pitch of every note each voice starts, and each
    // voice's pitch and loudness at every frame. The loudness is the envelope's, from the chip's
    // model run alongside without sound (about 0.1 s for five minutes of music), so that a note
    // still sounds while it is released, times what the waveform lets out (waveLevel), so that a
    // pulse swept wider from nothing fades in.
    const LONG = Math.ceil(300 * FPS), lengths = [], filtered = [], scores = [];
    function length(t) {
      if (lengths[t] === undefined) {
        let n = 0, f = false;
        const notes = [[], [], []], prev = [null, null, null];
        const line = BOUNCE ? [0, 1, 2].map(() => new Float32Array(LONG + 1).fill(NaN)) : null;
        const level = BOUNCE ? [0, 1, 2].map(() => new Float32Array(LONG + 1)) : null;
        const chip = BOUNCE ? E.createSID(8000, { ntsc: o.ntsc }) : null;
        const semis = (freq) => 12 * Math.log2(freq * HZ / C0);
        const collect = BOUNCE ? (d, k) => {
          const w = d.writes, s = d.sid;                     // as the player sets the chip
          if (w) for (let i = 0; i + 1 < w.length; i += 2) chip.write(w[i], w[i + 1]);
          chip.setRegs(s);
          const env = chip.V.map((c) => c.env);
          chip.skip(PERIOD);
          for (let x = 0; x < 3; x++) {
            const r = 7 * x;
            const v = Object.assign({}, d.voice ? d.voice(x) : null, { freq: s[r] | s[r + 1] << 8,
              pw: (s[r + 2] | s[r + 3] << 8) & 0xFFF, ctrl: s[r + 4], ad: s[r + 5], sr: s[r + 6], env: env[x] });
            const lv = Math.max(env[x], chip.V[x].env) / 255, wave = v.ctrl & 0xF0;
            level[x][k] = lv * waveLevel(v.ctrl, v.pw);
            if (lv && v.freq && wave && wave !== 0x80) line[x][k] = semis(v.freq);   // noise has no pitch to show
            if (mark(v, prev[x]) && v.freq) notes[x].push({ t: k, n: semis(v.freq) });
            prev[x] = v;
          }
        } : null;
        const routes = (d) => {
          if (d.sid[23] & 7) return true;
          const w = d.writes;
          if (w) for (let k = 0; k + 1 < w.length; k += 2) if (w[k] === 23 && w[k + 1] & 7) return true;
          return false;
        };
        try {
          const d = o.driver(o.data, globalThis.C64Cpu);
          d.init(t); f = routes(d);
          for (; n < LONG; n++) {
            if (chip && d.readback) d.readback(...chip.read3(), chip.peek());
            d.play(); f = f || routes(d);
            if (!d.playing()) break;
            if (collect) collect(d, n + 1);                  // the frame the display numbers it
          }
        } catch (e) { n = LONG; f = true; }
        lengths[t] = n < LONG ? n : null;
        filtered[t] = f;
        if (BOUNCE) scores[t] = { rate: FPS, voices: notes.map((x, i) =>
          ({ notes: x, line: line[i].slice(0, n + 2), level: level[i].slice(0, n + 2) })) };
      }
      return lengths[t];
    }
    const clock = (f) => {
      const d = Math.floor(f / FPS * 10);                    // tenths of a second
      return Math.floor(d / 600) + ':' + ((d % 600) / 10).toFixed(1).padStart(4, '0');
    };
    function time(f) {
      const n = lengths[tune];
      setText(timeEl, clock(f) + (tune < 0 ? '' : ' / ' + (n != null ? clock(n) : clock(+seek.max) + '+')));
    }

    async function audio() {                                 // created on the first click only
      const h = await host({ driver: o.driver, data: o.data, gain: o.gain, filter, ntsc: o.ntsc, period: o.period, digi: o.digi, onFrame: take,
        onError: (e) => { msg.textContent = 'The sound stopped: ' + e; msg.hidden = false; } });
      ctx = h.ctx; send = h.send;
      root.dataset.sidAudio = h.mode;
      muted.forEach((on, voice) => send({ cmd: 'mute', voice, on }));
    }

    function take(s) {
      queue.push(s);
      if (queue.length > 600) queue.splice(0, queue.length - 600);
    }

    async function start(t, at) {
      try {
        await (starting = starting || audio());
      } catch (e) {
        msg.textContent = e.message || 'Audio could not start.';
        msg.hidden = false;
        return;
      }
      if (t !== tune) {
        tune = t;
        const n = length(t);
        if (ball) ball.score(scores[t]);
        seek.max = String(n != null ? Math.max(1, n) : LONG);
        seek.disabled = false;
        const sw = root.querySelector('.sid-fsw'), note = root.querySelector('.sid-fnote');
        if (sw) { sw.hidden = !filtered[t]; note.hidden = filtered[t]; }   // the switch or the note
      }
      at = Math.max(0, Math.min(at || 0, +seek.max));
      send({ cmd: 'start', tune: t, run: ++runs, at });
      queue = []; hist = []; heard = null; heardAt = at;
      if (!dragging) seek.value = String(at);
      time(at);
      playing = t; quietSince = 0;
      buttons();
      draw(); drawBall();
      if (!raf) raf = requestAnimationFrame(loop);
    }

    function buttons() {
      root.querySelectorAll('[data-tune]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.tune === playing)));
    }

    // The bar: dragging shows the time under the thumb; letting go starts the tune there.
    seek.addEventListener('input', () => { dragging = true; time(+seek.value); });
    seek.addEventListener('change', () => {
      dragging = false;
      if (ctx && ctx.state !== 'running') ctx.resume();
      if (tune >= 0) start(tune, +seek.value);
    });

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (ctx && ctx.state !== 'running') ctx.resume();     // inside the click, for strict browsers
      if (b.dataset.tune !== undefined) start(+b.dataset.tune);
      else if (b.hasAttribute('data-stop')) { send({ cmd: 'stop' }); playing = -1; buttons(); }
      else if (b.dataset.filter !== undefined) {
        filter = b.dataset.filter;
        root.querySelectorAll('[data-filter]').forEach((f) => f.setAttribute('aria-pressed', String(f === b)));
        send({ cmd: 'filter', chip: filter });
      }
      else if (b.dataset.mute !== undefined) {
        const x = +b.dataset.mute;
        muted[x] = !muted[x];
        b.setAttribute('aria-pressed', String(muted[x]));
        send({ cmd: 'mute', voice: x, on: muted[x] });
        draw(); drawBall();
      }
      else if (b.dataset.view !== undefined) {
        view = b.dataset.view;
        root.querySelectorAll('[data-view]').forEach((v) => v.setAttribute('aria-pressed', String(v === b)));
        box.hidden = view !== 'ball'; canvas.hidden = view !== 'roll';
        draw(); drawBall();
      }
      else if (b.hasAttribute('data-full')) {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
      }
    });
    if (full) {
      full.hidden = !document.fullscreenEnabled;
      document.addEventListener('fullscreenchange', () => {
        full.textContent = document.fullscreenElement === box ? 'Exit full screen' : 'Full screen';
      });
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      const now = ctx.currentTime - (ctx.outputLatency || 0);
      let s = null;
      while (queue.length && queue[0].t <= now) {
        const q = queue.shift();
        if (q.run === runs) { s = q; hist.push(q); }         // frames of an earlier start are dropped
      }
      if (s) heard = s;
      drawBall();
      if (!s) return;
      const keep = Math.ceil((canvas.clientWidth || root.clientWidth) / px) + 2;   // the roll's width, hidden or not
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
      if (s.frame > +seek.max) seek.max = String(Math.ceil(s.frame * 1.25));
      if (!dragging) { seek.value = String(s.frame); time(s.frame); }
      if (o.onFrame) try { o.onFrame(s.frame, tune); } catch (e) { console.error(e); }
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
      const x0 = W - hist.length * px;
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
          const xa = Math.round(x0 + i * px), xb = Math.round(x0 + (i + 1) * px);
          g.fillRect(xa, y(n) - (start ? 3 : 1.5), xb - xa, start ? 6 : 3);
        }
      }
      g.globalAlpha = 1;
    }

    // the ball at the frame last heard, and between frames as far on as the time since says
    function drawBall() {
      if (!ball || view !== 'ball') return;
      let f = heardAt;
      if (heard) {
        f = heard.frame;
        if (heard.playing && ctx) f += Math.min(1, Math.max(0, (ctx.currentTime - (ctx.outputLatency || 0) - heard.t) * FPS));
      }
      ball.draw(f, { muted });
    }

    draw();
    window.addEventListener('resize', draw);
    if (BOUNCE) noteBounce().then((NB) => {
      ball = NB.create($('.sid-stage'), { colors: COLORS, font: FONT_B });
      if (tune >= 0) ball.score(scores[tune]);
      if (globalThis.ResizeObserver) new ResizeObserver(drawBall).observe(box);   // drawn again whenever
      else window.addEventListener('resize', drawBall);                          // the stage changes size
      drawBall();
    }, () => {                                               // no ball: the piano roll alone
      view = 'roll';
      box.hidden = true; canvas.hidden = false;
      $('[data-views]').hidden = true;
      draw();
    });
  }

  return { engine, host, mount, worklet, live: LIVE, hex, bytes, noteName, waveLevel };
})();
