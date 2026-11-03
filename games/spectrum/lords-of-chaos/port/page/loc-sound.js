/* loc-sound */
// The game's sixteen sound effects as its beeper plays them (set_sound $C83A, play_sound $C856):
// each a number of groups, each group its three notes played over a number of times, each note an
// empty loop of its delay (NOP NOP NOP DJNZ, 25 T-states a turn) and then a click of the speaker
// (bit 4 of port $FE flipped); after each group every delay moves on by its step, in a byte. The
// T-states are the Z80's own, uncontended, as test_sound.js measures the game's code taking them.
//   LOCSound.edges(bytes)  bytes: the sound's eight bytes (sounds $C7B0, eight a sound); gives
//                          { clicks: [T-state of each click, from the start], tstates: the whole }
//   LOCSound.render(edges, rate)   a Float32Array of samples at `rate` per second, the speaker's
//                          level as a square wave, the Spectrum's clock 3.5 MHz
var LOCSound = (function () {
  function edges(bytes) {
    const s = Array.from(bytes);
    let t = 13 + 4;                                  // LD A,(groups); LD B,A
    const clicks = [];
    const groups = s[0] || 256, repeats = s[1] || 256;
    for (let g = 0; g < groups; g++) {
      t += 11 + 13 + 4;                              // PUSH BC; LD A,(repeats); LD B,A
      for (let r = 0; r < repeats; r++) {
        t += 11 + 7 + 10 + 10;                       // PUSH BC; LD B,3; LD HL; LD DE
        for (let n = 0; n < 3; n++) {
          const turns = s[3 + 2 * n] || 256;
          t += 11 + 7 + turns * 25 - 5;              // PUSH BC; LD B,(HL); the delay loop
          t += 13 + 7 + 13;                          // LD A,(speaker); XOR $10; LD (speaker),A
          clicks.push(t + 11);                       // OUT ($FE),A, at its end, as the kit's Z80 writes
          t += 11 + 10 + 11 + (n < 2 ? 13 : 8);      // OUT; POP BC; ADD HL,DE; DJNZ
        }
        t += 10 + (r < repeats - 1 ? 13 : 8);        // POP BC; DJNZ
      }
      t += 10 + 7 + 10;                              // LD HL; LD B,3; LD DE
      for (let n = 0; n < 3; n++) {
        s[3 + 2 * n] = (s[3 + 2 * n] + s[2 + 2 * n]) & 255;
        t += 7 + 6 + 7 + 7 + 6 + (n < 2 ? 13 : 8);
      }
      t += 10 + (g < groups - 1 ? 13 : 8);           // POP BC; DJNZ
    }
    return { clicks, tstates: t + 10 };              // RET
  }
  function render(e, rate) {
    const CLOCK = 3500000, n = Math.ceil(e.tstates / CLOCK * rate) + 1;
    const out = new Float32Array(n);
    let level = 0, k = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate * CLOCK;
      while (k < e.clicks.length && e.clicks[k] <= t) { level ^= 1; k++; }
      out[i] = level ? 0.25 : -0.25;
    }
    return out;
  }
  return { edges, render };
})();
// end of loc-sound
