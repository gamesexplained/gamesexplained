// A View to a Kill (C64, Domark 1985): the game's two music drivers, ported instruction by
// instruction to one createDriver(data) for site/lib/sid.js.
//
// Tune 0 is the intro's driver, $C640-$C7B5 (the same bytes at the same address in City Hall),
// playing the notes the intro copies from $8500-$8EFF to $E000-$E9FF (copy_tune_start, $8000).
// Tune 1 is Paris's driver, $7A40-$7BC7, playing the notes at $E000-$FFFF (the mine holds the
// same notes). The two drivers are the same routine assembled twice with different settings,
// except that Paris's per-frame pitch effect (music_pitch_fx, $7B98) raises voice 1's low
// frequency byte by $0A every frame, for good, where the intro's gives it the same 0, 4, 8, 12
// shimmer as the other voices (tune_vibrato, $C798).
//
// data: { tunes: [intro, paris] }, each { notes: bytes from $E000 on, state: the driver's
// variables as the program holds them (intro $C600-$C63F, Paris $7A18-$7A3F) }.
// Checked against the game's own code run in kit/c64/cpu6502.js (work/t_music.js): every SID
// register write, in order, every frame, for a whole pass of each tune and into the next.
//
// The games call the driver from the raster interrupt, once a frame. When voice 1 reaches the
// end of its list the driver starts the whole tune again (tune_check_end $C786, $7B86); here
// that ends the tune, so the player shows one pass, unless data.loop is set.
function createDriver(data) {
  'use strict';
  const CFG = [
    { // the intro's driver
      ad: [0x2E, 0x18, 0x1F], ctrl: [0x41, 0x41, 0x41], pw: [0x0C, 0x0D, 0x0C],
      filter: [0x0F, 0x5A, 0x01, 0x1F],             // $D415-$D418 (tune_init $C66D)
      start: [0xE000, 0xE1EC, 0xE5F1], end: 0xE1EC, // tune_restart $C681, tune_check_end $C786
      sweep: false, stateBase: 0xC600,
      // addresses of the variables, for reading the program's own starting values
      phase: 0xC609, frames: 0xC60A, freq: 0xC614, vib: 0xC61E,
    },
    { // Paris's driver
      ad: [0x09, 0x19, 0x1A], ctrl: [0x81, 0x21, 0x41], pw: [0x00, 0x0E, 0x06],
      filter: [0x09, 0x73, 0x05, 0x3F],             // init_music $7A6D
      start: [0xE000, 0xEAD1, 0xF755], end: 0xEAD1, // music_rewind $7A81, $7B86
      sweep: true, stateBase: 0x7A18,
      phase: 0x7A21, frames: 0x7A22, freq: 0x7A2C, vib: 0x7A36,
    },
  ];
  const REG = [0, 7, 14];                           // voice_reg_offset $C7B6, $7BC8

  let C = CFG[0], notes = null, done = true, loop = !!data.loop;
  const ptr = [0, 0, 0], count = [0, 0, 0], freq = [0, 0, 0], vib = [0, 0, 0];
  let phase = 0, frames = 0;
  const lastNote = [null, null, null];              // the port's own, for voice(): the note last read

  const sid = new Uint8Array(25);
  let writes = [];
  const w = (r, v) => { v &= 0xFF; sid[r] = v; writes.push(r, v); };
  const rd = (a) => notes[a - 0xE000] | 0;          // tune_read $C773: ($D9),Y with all RAM

  function restart() {                              // tune_restart $C681
    for (let x = 0; x < 3; x++) { ptr[x] = C.start[x]; count[x] = 8; }
  }

  function vibrato() {                              // tune_vibrato $C798 / music_pitch_fx $7B98
    let x = 0;
    if (C.sweep) {                                  // $7BB6: voice 1's low byte climbs by $0A
      freq[0] = (freq[0] + 0x0A) & 0xFF; w(0, freq[0]); x = 1;
    }
    for (; x < 3; x++) {
      vib[x] = (vib[x] + 4) & 0x0F;
      w(REG[x], vib[x] + freq[x]);
    }
  }

  function voiceStep(x) {                           // voice_step $C723
    count[x] = (count[x] - 1) & 0xFF;
    if (count[x] !== 0) return;
    const r = REG[x], p = ptr[x];
    w(r + 4, 0);                                    // gate off
    w(r + 5, C.ad[x]);
    w(r + 1, rd(p));                                // frequency high
    const lo = rd(p + 1);
    w(r + 0, lo);
    w(r + 3, C.pw[x]);
    w(r + 4, C.ctrl[x]);                            // waveform, gate on
    count[x] = rd(p + 2);
    lastNote[x] = { at: p, hi: rd(p), lo, len: count[x] };
    ptr[x] = (p + 3) & 0xFFFF;
    freq[x] = lo;
  }

  function tick() {                                 // tune_tick $C6AB
    vibrato();
    frames = (frames + 1) & 0xFF;
    if (frames >= (phase ? 2 : 3)) {
      frames = 0;
      phase = (phase + 1) & 1;
      for (let x = 0; x < 3; x++) voiceStep(x);    // tune_step $C6E0
    }
    if (ptr[0] === C.end) {                         // tune_check_end $C786
      if (loop) restart(); else done = true;
    }
  }

  return {
    sid,
    get writes() { return writes; },
    init(t) {
      C = CFG[t]; const T = data.tunes[t];
      notes = T.notes;
      const st = (a) => T.state[a - C.stateBase] | 0;
      phase = st(C.phase); frames = st(C.frames);
      for (let x = 0; x < 3; x++) { freq[x] = st(C.freq + x); vib[x] = st(C.vib + x); lastNote[x] = null; }
      sid.fill(0); writes = [];
      w(0x15, C.filter[0]); w(0x16, C.filter[1]); w(0x17, C.filter[2]); w(0x18, C.filter[3]);
      restart();
      done = false;
    },
    stop() { done = true; },
    play() { writes = []; if (!done) tick(); },
    playing() { return !done; },
    voice(x) {
      const n = lastNote[x];
      return { at: n ? n.at : null, len: n ? n.len : null, left: count[x] };
    },
    // for tests
    state() { return { ptr: ptr.slice(), count: count.slice(), freq: freq.slice(), vib: vib.slice(), phase, frames }; },
  };
}
if (typeof module !== 'undefined') module.exports = { createDriver };

// The speech players: the intro's speech_play ($A000) and Paris's play_speech ($1000), the same
// routine twice. A sample opens with a 16-bit length counted from its own address; the bytes
// after the length are played from bit 7 down, a 1 setting the SID's volume register $D418 to
// $0F and a 0 setting it to 0, with the interrupts off. The player stops once its pointer has
// reached the sample's address plus the length, which it checks after every bit.
// play(mem, base) takes the memory as a function of address and returns every write to $D418 with
// its time in cycles, counted from the first write, instruction by instruction as the routine
// takes them (the reads of ($FB),Y that cross a page take one cycle more). Checked against the
// game's routines run in kit/c64/cpu6502.js (work/t_music.js): every write, and the cycles
// between writes, for each of the four samples.
const AVSpeech = (function () {
  'use strict';
  function play(mem, base, endValue) {
    const out = { cycles: [], values: [] };
    let c = 0;                                      // cycles since the start of the routine
    const W = (v) => { out.cycles.push(c); out.values.push(v); };
    // sei, lda #, sta $FB, lda #, sta $FC, lda #0, sta $D418
    c += 2 + 2 + 3 + 2 + 3 + 2 + 4; W(0);
    const len = mem(base) | mem(base + 1) << 8, end = (base + len) & 0xFFFF;
    // ldy #0, lda (),y, sta, iny, lda (),y, sta, iny, clc, cld, lda, adc, sta, lda, adc, sta
    c += 2 + 5 + 3 + 2 + 5 + 3 + 2 + 2 + 2 + 3 + 3 + 3 + 3 + 3 + 3;
    let fb = base;
    for (;;) {
      c += 2;                                       // ldx #8
      let a = mem((fb + 2) & 0xFFFF);
      c += 5 + ((fb & 0xFF) >= 0xFE ? 1 : 0);       // lda ($FB),y with y = 2
      for (let x = 8; ; ) {
        const bit = a >> 7 & 1; a = a << 1 & 0xFF;  // rol a (the carry in comes back out 9 bits on)
        c += 2 + 3;                                 // rol, pha
        if (bit) {
          c += 3 + 6 + 2 + 4; W(0x0F);              // bcs taken, jsr speech_bit1, lda #$0F, sta
          c += 15 * 2 + 6 + 3 * 2;                  // 15 nops, rts, 3 nops
        } else {
          c += 2 + 6 + 2 + 4; W(0);                 // bcs not taken, jsr speech_bit0, lda #0, sta
          c += 6 + 3 * 2 + 6 + 6 + 3;               // jsr speech_pad (3 nops, rts), rts, jmp
        }
        c += 2 + 2 + 3 + 3 + 3 + 3;                 // cld, sec, lda, sbc, lda, sbc
        if (fb >= end) {                            // bcs taken: done
          c += 3 + 2 + 4; W(endValue);              // lda #, sta $D418
          return out;
        }
        c += 2 + 6 + 3 * 2 + 6 + 4 + 2 + 2;         // bcs, jsr speech_pad, pla, dex, cpx #0
        if (--x !== 0) { c += 3 + 2 + 2 + 3; continue; }   // bne taken, nop, nop, jmp
        c += 2 + 2 + 3;                             // bne, lda #$FF, cmp $FB
        if ((fb & 0xFF) === 0xFF) c += 2 + 5; else c += 3;  // bne; inc $FC
        c += 5 + 3;                                 // inc $FB, jmp
        fb = (fb + 1) & 0xFFFF;
        break;
      }
    }
  }
  // the four samples: [name, the part's listing, address, the value the routine leaves in $D418]
  const SAMPLES = [
    ['The intro', 'intro', 0xA090, 0x18],
    ['Paris: won', 'paris', 0x1225, 0],
    ['Paris: lost, damage full (first)', 'paris', 0x1090, 0],
    ['Paris: lost', 'paris', 0x190A, 0],
  ];
  return { play, SAMPLES };
})();
if (typeof module !== 'undefined') module.exports.AVSpeech = AVSpeech;
