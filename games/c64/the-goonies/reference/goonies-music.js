// The Goonies' music driver, John A. Fitzpatrick's "Pearl Music Player" ($BA00-$C028), ported to
// JavaScript for the site's SID player (../../lib/sid.js). The port keeps the driver's variables
// at their own addresses in a copy of $BA00-$CFFF, self-modified operands included (the three
// voices' data pointers at $BB1C, $BB20 and $BB24), so each function reads like the routine it is
// named after. createDriver refers to nothing outside itself: the player runs its source text in
// an AudioWorklet.
// Checked against the game's own code run in kit/cpu/cpu6502.js (tests/music.js): every SID
// register after every frame, for the four tunes.
var GOONMUSIC = {
  createDriver: function (data) {
    // data: the bytes of $BA00-$CFFF as the game loads them
    const M = new Uint8Array(0x10000);
    M.set(data, 0xBA00);
    const START = M.slice(0xBA00, 0xD000);                  // a fresh copy for every init
    const sid = new Uint8Array(25);
    let writes = [];
    const W = (r, v) => { sid[r] = v; writes.push(r, v); };
    const V = () => M[0xBF3E];                              // the voice being read
    const PTR = [0xBB1C, 0xBB20, 0xBB24];                   // each voice's reader's operand

    function nextByte() {                                   // next_byte, $BB27
      const p = PTR[V()];
      let a16 = M[p] | M[p + 1] << 8;
      const a = M[a16];
      a16 = (a16 + 1) & 0xFFFF; M[p] = a16 & 255; M[p + 1] = a16 >> 8;
      M[0xBF40] = M[a16];                                   // the byte after: is a command next?
      return a;
    }
    function tunePointers() {                               // tune_pointers, $BA79
      let a = M[0xBA24];
      if (a >= M[0xC029]) a = M[0xC029];
      const y = (a << 3) & 255;
      for (let i = 0; i < 6; i++) M[0xBB1C + (i >> 1) * 4 + (i & 1)] = M[0xC02E + y + i];
    }
    function silence() {                                    // the tail of tune_reset, $BAE3
      M[0xBA25] = 0; M[0xBF38] = 0; M[0xBA27] = 0;
      W(0x17, 0);
      for (let v = 0; v < 3; v++) if (M[0xBA29 + v]) for (let x = 6; x >= 0; x--) W(7 * v + x, 0);
    }
    function tuneReset() {                                  // tune_reset, $BAC6
      M[0xBF39] = 0; M[0xBF80] = 0;
      for (let x = 0x2D; x > 0; x--) M[0xBF09 + x] = M[0xBF40 + x];
      M[0xBF3F] = M[0xBF37];
      M[0xBA26] = 0;
      silence();
    }
    function tuneStop() { silence(); }                      // tune_stop, $BB17
    function tuneSetup() {                                  // tune_setup, $BAA5
      tunePointers(); tuneReset();
      for (let x = 0; x < 3; x++) {
        M[0xBF3E] = x; M[0xBF40] = 0xFF;
        if (M[0xBA29 + x]) voiceCommands();
      }
    }
    function startTune() {                                  // start_tune, $BA6B
      M[0xBA27] = 0; tuneSetup(); M[0xBA27] = 1;
    }
    function nextTune(y) {                                  // next_tune, $BB75
      let x;
      if (y & 0x80) { M[0xBA24] = y & 0x7F; startTune(); return; }
      if (!(y & 2)) {
        x = M[0xBA24];
        if (x >= M[0xC029]) { x = 0xFF; if (!(y & 1)) { tuneStop(); return; } }
        M[0xBA24] = (x + 1) & 255; startTune(); return;
      }
      x = M[0xC02B];                                        // the play-list
      for (;;) {
        const a = M[0xC02C + x];
        if (a & 0x80) {
          x = M[0xC02A]; M[0xC02B] = x;
          if (!(y & 1)) { tuneStop(); return; }
          continue;
        }
        if (a & 0x40) { M[0xBA2C] = a & 0x3F; x = (x + 1) & 255; continue; }   // a transposition
        x = (x + 1) & 255; M[0xC02B] = x;
        M[0xBA24] = a; startTune(); return;
      }
    }
    function setFilter() {                                  // set_filter, $BBC6
      W(0x18, M[0xBF39] | M[0xBF3B]);
      W(0x17, M[0xBF80]);
      M[0xBF3A] = 0;
    }
    function noteLength(a, y) {                             // note_length, $BE02: [count, release]
      if (M[0xBF7F]) a += 0x10;
      const n = M[0xBE45 + a];
      y = (y - 1) & 255;
      if (y === 0) { const t = n >> 1; M[0xBF3C] = t; return [t, (0 - t) & 255]; }
      if (y & 0x80) {
        let t = n >> 3; if (!t) t = 1; M[0xBF3C] = t;
        return [(n - t) & 255, (0 - t) & 255];
      }
      return [(n - 1) & 255, 0xFF];
    }
    function voiceCommands() {                              // voice_commands, $BD07
      for (;;) {
        if (!(M[0xBF40] & 0x80)) return;                    // a note comes next
        const y = nextByte();
        if (y === 0xFF) { M[0xBA26] = 1; M[0xBF38] = 0xFF; return; }   // the tune's end
        const v = V(), o = M[0xBE65 + v];
        switch ((y >> 4) & 7) {
          case 0: case 7: {                                 // cmd_length, $BD49
            const [n, r] = noteLength(y & 15, M[0xBF22 + v]);
            M[0xBF13 + v] = n; M[0xBF16 + v] = r; break;
          }
          case 1:                                           // cmd_filter, $BD63
            M[0xBF3B] = y & 15; M[0xBF3A] = v + 1; break;
          case 2: {                                         // cmd_misc, $BD7C
            if (y >= 0xAC) { M[0xBF7F] = y & 1; break; }
            if (y === 0xAB) { M[0xBF1F + v] = 0x51; break; }
            const t = y & 15;
            if (t < 4) { M[0xBF1F + v] = M[0xBE68 + t]; break; }
            if (t < 7) {
              const e = t & 3, b = M[0xBDD7 + v] + 2 * e;
              M[0xBF22 + v] = e;
              M[0xBF1C + v] = M[0xBF26 + b]; M[0xBF19 + v] = M[0xBF25 + b];
              break;
            }
            if (t < 9) { M[0xBF0A + v] = t & 1; break; }
            M[0xBF3C] = (t & 1) << 2;
            M[0xBF1F + v] = (M[0xBF1F + v] & 0xFB) | M[0xBF3C];
            break;
          }
          case 3: {                                         // cmd_instrument, $BE6C
            const i = (y & 7) << 3, d = [0xBF25, 0xBF2B, 0xBF31][v];
            for (let x = 0; x < 6; x++) M[d + x] = M[0xC04E + i + x];
            break;
          }
          case 4:                                           // cmd_pulse, $BEAA
            W(o + 2, nextByte()); W(o + 3, nextByte()); break;
          case 5: {                                         // cmd_filter_set, $BEC5
            const i = 0xC04E + ((y & 7) << 2) + 0x40;
            W(0x15, M[i]); W(0x16, M[i + 1]);
            const p = M[i + 2];
            M[0xBF39] = M[i + 3]; M[0xBF3A] = v + 1;
            M[0xBF3C] = nextByte(); M[0xBF80] = p | M[0xBF3C];
            break;
          }
          case 6:                                           // cmd_tempo, $BEFE
            M[0xBF37] = M[0xBF3F] = nextByte(); break;
        }
      }
    }
    function voiceNext(v) {                                 // voice_next, $BCC4
      M[0xBF3E] = v;
      let a = nextByte();
      const o = M[0xBE65 + v];
      if (a === 0) { W(o, 0); W(o + 1, 0); voiceCommands(); return; }   // a rest
      a = (a + M[0xBA2C]) & 255;
      W(o + 1, M[0xBFD5 + a]); W(o, M[0xBF81 + a]);
      if (!M[0xBF0A + v]) { W(o + 5, M[0xBF19 + v]); W(o + 6, M[0xBF1C + v]); W(o + 4, M[0xBF1F + v]); }
      voiceCommands();
    }
    function playTune() {                                   // play_tune, $BBDB
      for (;;) {
        if (M[0xBA25]) { tuneStop(); return; }
        if (!M[0xBA27]) return;
        if (M[0xBF38] !== 0xFF) break;
        const y = M[0xBA28];
        if (!y) { tuneStop(); return; }
        nextTune(y);
      }
      M[0xBF3F] = (M[0xBF3F] - 1) & 255;
      if (M[0xBF3F]) return;
      M[0xBF3F] = M[0xBF37];
      for (let v = 0; v < 3; v++) {
        if (!M[0xBA29 + v]) continue;
        const c = M[0xBF0D + v] = (M[0xBF0D + v] - 1) & 255;
        if (!(c & 0x80)) {                                  // the gate's release point
          if (c === 0 && !M[0xBF0A + v]) W(7 * v + 4, M[0xBF1F + v] & 0xFE);
          continue;
        }
        if (c !== M[0xBF10 + v]) continue;
        M[0xBF0D + v] = M[0xBF13 + v]; M[0xBF10 + v] = M[0xBF16 + v];
        if (M[0xBF3A] === v + 1) setFilter();
        voiceNext(v);
      }
    }
    let tune = -1;
    return {
      sid,
      get writes() { return writes; },
      init(t) {                                             // as start_sound ($92C7) starts a tune
        M.set(START, 0xBA00); sid.fill(0); writes = [];
        tune = t;
        M[0xBA25] = 0; M[0xBA29] = 1; M[0xBA2A] = 1;
        M[0xBA24] = t;
        M[0xBA2B] = t === 0 ? 1 : 0;                        // only tune 0 has voice 3: the others leave it to the effects
        startTune();
      },
      stop() { writes = []; tuneStop(); },
      play() { writes = []; playTune(); },
      playing() { return M[0xBA27] === 1 && M[0xBF38] !== 0xFF; },
      voice(x) {
        const on = M[0xBA29 + x];
        const p = M[PTR[x]] | M[PTR[x] + 1] << 8;
        return { on: !!on, data: '$' + p.toString(16).toUpperCase().padStart(4, '0'),
          length: M[0xBF13 + x], waveform: M[0xBF1F + x] };
      },
    };
  },
};
// The sound effects: start_sound ($92C7) for an effect, and the three effect players
// (effects_play, $C921), ported the same way. data is { sounds: $9384-$93EB, driver: $BA00-$CFFF },
// and optionally list, the sound numbers a page offers. init(n) starts sound n (or list[n]) as the game does with every voice free; play() is one frame of
// effects_play. Checked against the game's own code by test_effects.js.
GOONMUSIC.createEffects = function (data) {
  const M = new Uint8Array(0x10000);
  M.set(data.sounds, 0x9384); M.set(data.driver, 0xBA00);
  const START = M.slice();
  const sid = new Uint8Array(25);
  let writes = [];
  const W = (r, v) => { sid[r] = v; writes.push(r, v); };
  const ptr = [0, 0, 0];                                     // $F9, $FB, $FD: each voice's step pointer
  function effectsInit() {                                   // effects_init, $C8F0
    W(0x18, 0x0F);
    for (let v = 0; v < 3; v++) { M[0xBA0F + v] = 0; M[0xBA0C + v] = 0xFF; }
  }
  function startSound(y) {                                   // start_sound, $92C7, an effect
    if (M[0x93CF + y]) return;                               // a tune: the music driver's
    const eff = M[0x9384 + y];
    if (!M[0x93B6 + y]) for (let x = 2; x >= 0; x--) if (M[0xBA0C + x] === eff) return;
    let x;
    if ((M[0xBA0C] | M[0xBA0D] | M[0xBA0E]) & 0x80) {
      for (x = 2; x > 0; x--) if (M[0xBA0C + x] & 0x80) break;
    } else {
      for (x = 2; x >= 0; x--) if (M[0x939D + y] >= M[0x93E9 + x]) break;
      if (x < 0) return;
    }
    M[0x93E9 + x] = M[0x939D + y];
    M[0xBA0F + x] = eff | 0x80;                              // effect_start, $C90C
  }
  function voice(v) {                                        // effect_voice1, $C92A (and $CA25, $CB20)
    const o = 7 * v, rd = (y) => M[(ptr[v] + y) & 0xFFFF];
    const req = M[0xBA0F + v];
    if (!req) return;
    if (req & 0x80) {
      const e = req & 0x7F;
      M[0xBA0C + v] = e;
      ptr[v] = M[0xCC1B + 2 * e] | M[0xCC1C + 2 * e] << 8;
      M[0xBA15 + v] = 1; M[0xBA0F + v] = 1;
      W(o + 4, 0); M[0xBA12 + v] = 0;
    }
    M[0xBA15 + v] = (M[0xBA15 + v] - 1) & 255;
    if (M[0xBA15 + v]) return;
    let y = M[0xBA12 + v];
    const note = () => { y++; M[0xBA15 + v] = rd(y); y++; const n = rd(y);
      W(o, M[0xBF81 + n]); W(o + 1, M[0xBFD5 + n]); y++; };   // $C97E
    const env = () => { const a = rd(y); y++; W(o + 5, a); W(o + 6, rd(y)); y++; };   // $C996
    const wave = () => { W(o + 4, rd(y)); y++; };            // $C9A3
    const pulse = () => { const a = rd(y); y++; W(o + 2, a); const b = rd(y); y++; W(o + 3, b); };   // $C9BE
    for (;;) {
      const c = rd(y), off = M[0xBF6E + c];
      if (off % 3 || off > 21) throw new Error('effect command ' + c);
      switch (off / 3) {
        case 0: W(o, 0); W(o + 1, 0); M[0xBA0F + v] = 0; M[0xBA12 + v] = 0; M[0xBA0C + v] = 0xFF; return;
        case 1: note(); break;
        case 2: note(); wave(); break;
        case 3: note(); env(); wave(); break;
        case 4: note(); env(); pulse(); wave(); break;
        case 5: { y++; const lo = rd(y); y++; ptr[v] = lo | rd(y) << 8; y = 0; continue; }   // $C9F9: go to
        case 6: note(); pulse(); wave(); break;
        case 7: y++; M[0xBA15 + v] = rd(y); y++; wave(); break;
      }
      M[0xBA12 + v] = y & 255;
      return;
    }
  }
  return {
    sid,
    get writes() { return writes; },
    init(n) { M.set(START); sid.fill(0); writes = []; ptr.fill(0); effectsInit(); startSound(data.list ? data.list[n] : n); },
    stop() { writes = []; effectsInit(); for (let v = 0; v < 3; v++) { W(7 * v, 0); W(7 * v + 1, 0); W(7 * v + 4, 0); } },
    play() { writes = []; for (let v = 0; v < 3; v++) voice(v); },
    playing() { return M[0xBA0C] !== 0xFF || M[0xBA0D] !== 0xFF || M[0xBA0E] !== 0xFF; },
    voice(x) { const e = M[0xBA0C + x]; return { on: e !== 0xFF, effect: e }; },
  };
};
if (typeof module !== 'undefined') module.exports = GOONMUSIC;
