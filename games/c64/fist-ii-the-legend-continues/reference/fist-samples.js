'use strict';
// The port of Fist II's sample player, the code that plays the sound effects by flipping the SID's
// volume register: play_sample ($3DB8), the timer interrupt ($3D8B) and the once-a-frame envelope
// (update_sound, $3E1A). It keeps its state where the game keeps it, in a copy of the game's memory
// ($3E0C-$3E19, the pointers $68/$69 and $6C/$6D, the level $6A), so it reads the same bytes the
// game reads, past the ends of its tables included. Checked against the game's own routines, run in
// the kit's 6502 simulator on the listing's bytes, by tests/samples.js (test_samples.py).
//
// The timers are modelled, not emulated: CIA 1 timer A runs from the processor clock with the
// sample's rate as its latch, so it underflows every rate + 1 cycles; timer B counts those
// underflows, so the next interrupt comes (latch B + 1) x (rate + 1) cycles after it is loaded.
// The interrupt's own latency is left out.
const FISTSAMPLES = (function () {
  const FRAME = 19656;          // cycles in a PAL frame: 312 lines of 63
  const CLOCK = 985248;         // PAL processor clock, Hz

  function createPlayer(ram) {
    const M = Uint8Array.from(ram);
    // the game copies its period table from $C700/$C800 to $0200/$0300 at start-up ($C412)
    M.copyWithin(0x0200, 0xC700, 0xC900);
    let t = 0;                  // cycles since the player was made
    let irqOn = false, tNext = 0;
    const events = [];          // [cycle, value written to $D418]

    const ptr = () => M[0x68] | M[0x69] << 8;
    function vol(v) { events.push([t, v]); }

    function load() {                                     // load_sample, $3F09
      M[0x3E17] = 0;
      const x = M[0x3E16] * 4 & 0xFF;
      let s = M[0xFFCB + x] + 0xD0; M[0x68] = s & 0xFF; M[0x69] = (M[0xFFCC + x] + 0xC8 + (s >> 8)) & 0xFF;
      s = M[0xFFCD + x] + 0xD0; M[0x6C] = s & 0xFF; M[0x6D] = (M[0xFFCE + x] + 0xC8 + (s >> 8)) & 0xFF;
      M[0x3E0C] = M[0xBEC6 + x]; M[0x3E0E] = M[0xBEC7 + x]; M[0x3E0F] = M[0xBEC8 + x]; M[0x3E10] = M[0xBEC9 + x];
    }
    function next() {                                     // next_sample_phase, $3E96
      M[0x3E11] = (M[0x3E11] + 1) & 0xFF;
      const y = (M[0x3E11] - 1) & 0xFF;
      M[0x3E14] = M[0x3F03 + y]; M[0x3E13] = M[0x3F06 + y]; M[0x3E18] = M[0x3F00 + y];
      M[0x3E12] = M[0x3E15] = M[0x3E0E + y];
    }
    function startTimers() {                              // start_sample_timers, $3DCE
      irqOn = false;
      vol(0);
      M[0x6A] = 0x0F;
      irqOn = true; tNext = t + 2 * (M[0x3E0C] + 1);      // timer B loaded with 1
      M[0x3E17] = 0;
    }
    function stop() {                                     // stop_sample, $3E44
      M[0x3E11] = 4; M[0x3E17] = 1; irqOn = false; M[0x3E19] = 0;
    }
    function stepLevel() {                                // step_level, $3EE8: 0 (the Z flag set) once there
      if (M[0x3E18] === M[0x3E13]) return 0;
      M[0x3E18] = (M[0x3E18] + M[0x3E14]) & 0xFF;
      M[0x6A] |= 0x0F;
      return 1;
    }
    function ramp() {                                     // sample_phase_ramp, $3EC7 (phases 1 and 3)
      if (M[0x3E12] === 0) return next();
      if (M[0x3E17]) load();
      const c = M[0x3E15] - 8; M[0x3E15] = c & 0xFF;     // step_countdown, $3EB9
      if (c > 0) return;
      M[0x3E15] = M[0x3E12];
      if (stepLevel() !== 0) return;
      next();
    }
    function hold() {                                     // sample_phase_hold, $3E80 (phase 2)
      if (!M[0x3E17]) return;
      if (M[0x3E12] !== 0) { load(); M[0x3E12] = (M[0x3E12] - 1) & 0xFF; if (M[0x3E12] !== 0) return; }
      next();
    }
    function update() {                                   // update_sound, $3E1A
      if (!M[0x3E17]) {                                   // check_sample_end, $3F4B
        const end = M[0x6C] | M[0x6D] << 8;
        if (end < ptr()) M[0x3E17]++;
      }
      const ph = M[0x3E11];
      if (ph < 4) {
        if (ph === 0) { load(); next(); startTimers(); }
        else if (ph === 2) hold();
        else if (ph === 1 || ph === 3) ramp();
      }
      if (M[0x3E11] >= 4) stop();
    }
    function irq() {                                      // irq_sample_tick, $3D8B
      M[0x6A] ^= M[0x3E18];
      vol(M[0x6A]);
      const b = M[ptr()];
      const p = M[0x0200 + b] | M[0x0300 + b] << 8;
      const q = (ptr() + 1) & 0xFFFF; M[0x68] = q & 0xFF; M[0x69] = q >> 8;
      tNext = t + (p + 1) * (M[0x3E0C] + 1);
    }
    return {
      M, events, FRAME,
      get t() { return t; },
      get playing() { return M[0x3E11] < 4; },
      play(n) {                                           // play_sample, $3DB8
        if (!n) return stop();
        M[0x3E16] = (n - 1) & 0xFF; M[0x3E19] = 1; M[0x3E11] = 0;
      },
      // run one frame: the interrupts due in it, then update_sound at its end
      frame() {
        const end = t + FRAME;
        while (irqOn && tNext < end) { t = tNext; irq(); }
        t = end; update();
      },
    };
  }

  // Render sample n as audio: the volume register's level, averaged over each output sample, with
  // the steady part taken away as the C64's output capacitor would. Stops when the player goes idle,
  // or after maxFrames.
  function render(ram, n, rate, maxFrames) {
    const p = createPlayer(ram);
    p.play(n);
    let f = 0;
    do { p.frame(); f++; } while (p.playing && f < (maxFrames || 150));
    const cyc = p.t, len = Math.ceil(cyc / CLOCK * rate), out = new Float32Array(len);
    const ev = p.events; let i = 0, level = 0;
    const per = CLOCK / rate;
    for (let k = 0; k < len; k++) {
      const a = k * per, b = a + per; let acc = 0, at = a;
      while (i < ev.length && ev[i][0] < b) { const e = Math.max(ev[i][0], a); acc += level * (e - at); at = e; level = ev[i][1] & 15; i++; }
      acc += level * (b - at);
      out[k] = acc / per / 15;
    }
    let lp = out[0];                                      // a high-pass of about 16 Hz
    const r = Math.exp(-2 * Math.PI * 16 / rate);
    for (let k = 0; k < len; k++) { lp = r * lp + (1 - r) * out[k]; out[k] = (out[k] - lp) * 0.8; }
    return { samples: out, frames: f, ended: !p.playing };
  }

  return { createPlayer, render, FRAME, CLOCK };
})();
if (typeof module === 'object' && module.exports) module.exports = FISTSAMPLES;
