// Fist II's music driver ($F400-$FAB4), ported to JavaScript for the site's SID player
// (../../lib/sid.js). The port keeps the driver's variables at their own addresses in a copy of
// $F400-$FFFF, so each function below reads like the routine it is named after. createDriver
// refers to nothing outside itself: the player runs its source text in an AudioWorklet.
// Checked against the game's own code run in kit/c64/cpu6502.js (tests/music.js): every SID
// write of every frame, for the three tunes.
const FISTMUSIC = {
  createDriver: function (data) {
    // data: the bytes of $F400-$FFFF as the game loads them
    const M = new Uint8Array(0x10000);
    M.set(data, 0xF400);
    const START = M.slice(0xF400);                          // a fresh copy for every init
    const TFL = 0xF433, TFH = 0xF436, CTRL = 0xF439, PBL = 0xF43C, PBH = 0xF43F, PWSRC = 0xF442,
      PWSH = 0xF445, RRATE = 0xF448, AD = 0xF44B, SR = 0xF44E, GLON = 0xF451, GLR = 0xF454,
      OCTADD = 0xF457, VIBON = 0xF45A, VIBMODE = 0xF45D, VIBRATE = 0xF460, VIBPER = 0xF463,
      FRES = 0xF466, FMODE = 0xF467, FCH = 0xF468, FSRC = 0xF469, FSHIFT = 0xF46A, FDIR = 0xF46B,
      ACT = 0xF46C, SEQL = 0xF46F, SEQH = 0xF472, PATL = 0xF475, PATH = 0xF478, SEQPOS = 0xF47B,
      NEEDPAT = 0xF47E, PATPOS = 0xF481, TICKS = 0xF484, REL = 0xF487, FCL = 0xF48A, NFLAGS = 0xF48B,
      OCT = 0xF48E, NOTE = 0xF491, TCOUNT = 0xF494, TRELOAD = 0xF497, TMPH = 0xF498, TMPL = 0xF499,
      RAMP = 0xF49D, RDIR = 0xF4A2, PWL = 0xF4A5, PWH = 0xF4A8, FL = 0xF4AB, FH = 0xF4AE,
      TUNE = 0xF4B1, GLRH = 0xF4B2, REPEAT = 0xF4B5, CLRMASK = 0xF4B8, SETMASK = 0xF4C0,
      NOTES = 0xF4C8, LENGTHS = 0xF4D5, INSTR = 0xF709, PBASEL = 0xF9A1, PBASEH = 0xF9A2,
      VDIR = 0xFAB5, VPL = 0xFAB8, VPH = 0xFABB, VAH = 0xFABE, VAL = 0xFAC1, VBH = 0xFAC4,
      VBL = 0xFAC7, VCOUNT = 0xFACA, VLAST = 0xFACD, VSH = 0xFAD0, VSL = 0xFAD3, VRESTART = 0xFAD7,
      INSTOFF = 0xFFA8;
    const sid = new Uint8Array(25);
    const w = (a) => M[a] | M[a + 1] << 8;
    let zp = 0;                                              // $FF: the tune the game asks for
    let ptab = 0, seq = 0, pat = 0;                          // the patched table, ($F9), ($FB)

    function initVoice(x) {                                  // music_init_voice, $F742
      for (const a of [ACT, REPEAT, SEQPOS, OCTADD, NFLAGS, CTRL, RAMP, RRATE, RDIR, PWSH, PBL, PBH,
        PWL, PWH, GLON, GLR, GLRH]) M[a + x] = 0;
      M[NEEDPAT + x] = 1;
      M[TCOUNT + x] = M[TRELOAD];
      M[PWSRC + x] = 0x80; M[FSRC] = 0x80;
    }
    function startTune(t) {                                  // music_start_tune, $F519
      M[TUNE] = t;
      M[TRELOAD] = M[0xF42F + t];
      const y = t * 2;
      sid.fill(0);                                           // music_clear_sid
      for (let x = 2; x >= 0; x--) initVoice(x);
      M[ACT] = M[ACT + 1] = M[ACT + 2] = 0x81;
      sid[24] = M[FMODE];
      M[TCOUNT] = M[TCOUNT + 1] = M[TCOUNT + 2] = M[TRELOAD];
      M[PBASEL] = M[0xF427 + y]; M[PBASEH] = M[0xF428 + y];
      ptab = w(0xF41F + y);
      for (let x = 0; x < 3; x++) { M[SEQL + x] = M[0xF407 + 8 * x + y]; M[SEQH + x] = M[0xF408 + 8 * x + y]; }
    }
    function loadInstrument(x, n) {                          // load_instrument, $F7D1
      const a = (w(INSTOFF + 2 * n) + 0xFE43) & 0xFFFF;
      let y = 0;
      for (; y < 15; y++) M[CTRL + x + 3 * y] = M[a + y];
      M[FRES] &= M[CLRMASK + x];
      if (M[a + y] & 0x0F) {
        M[FRES] = ((M[FRES] | M[SETMASK + x]) & 0x0F) | (M[a + y] & 0xF0);
        do { y++; M[OCTADD + y] = M[a + y]; } while (y !== 0x14);   // bytes 16-20: $F467-$F46B
      }
      if (!(M[PWSRC + x] & 0x80) && M[PWSRC + x]) M[PWSRC + x] = x;
      M[PWL + x] = M[PBL + x]; M[PWH + x] = M[PBH + x];
    }
    function glide(x) {                                      // music_glide, $F8FD
      const f = M[FH + x] << 8 | M[FL + x], t = M[TFH + x] << 8 | M[TFL + x];
      if (f === t) return;
      const step = ((M[GLRH + x] << 8 | M[GLR + x]) << M[OCT + x]) & 0xFFFF;
      M[TMPH] = (step >> 8) & 0xFF;
      if (f < t) {
        const n = (f + (step & 0xFFFF)) & 0xFFFF;
        M[FL + x] = n & 0xFF; M[FH + x] = n >> 8;
        if (n >= t) { M[FL + x] = M[TFL + x]; M[FH + x] = M[TFH + x]; }
      } else {
        M[TMPL] = step & 0xFF;
        const n = (f - (step & 0xFFFF)) & 0xFFFF;
        M[FL + x] = n & 0xFF; M[FH + x] = n >> 8;
        if (n < t) { M[FL + x] = M[TFL + x]; M[FH + x] = M[TFH + x]; }
      }
    }
    function vibrato(x) {                                    // music_vibrato, $F9A3
      M[VPH + x] = M[FH + x]; M[VPL + x] = M[FL + x];
      if (M[VDIR + x]) { M[VBH + x] = M[FH + x]; M[VBL + x] = M[FL + x]; }
      if (M[VIBRATE + x] !== M[VLAST + x]) {
        const r = M[VIBRATE + x];
        M[VLAST + x] = r;
        const s = ((((r & 0x1F) + 0x20) << (r >> 5)) - 0x20) & 0xFFFF;
        M[VSL + x] = s & 0xFF; M[VSH + x] = s >> 8;
      }
      if (M[VRESTART + x]) {
        M[VRESTART + x] = 0;
        M[VDIR + x] = zp;
        M[VCOUNT + x] = M[VIBPER + x] >> 1;
        M[VAH + x] = M[VBH + x] = M[FH + x];
        M[VAL + x] = M[VBL + x] = M[FL + x];
      }
      let p = M[VPH + x] << 8 | M[VPL + x];
      const s = M[VSH + x] << 8 | M[VSL + x];
      if (M[VDIR + x]) {
        p = (p + s) & 0xFFFF; M[VPL + x] = p & 0xFF; M[VPH + x] = p >> 8;
        if (--M[VCOUNT + x] === 0) {
          M[VCOUNT + x] = M[VIBPER + x];
          M[VAH + x] = M[VPH + x]; M[VAL + x] = M[VPL + x];
          M[VDIR + x] = 0;
        }
      } else {
        p = (p - s) & 0xFFFF; M[VPL + x] = p & 0xFF; M[VPH + x] = p >> 8;
        if (--M[VCOUNT + x] === 0) { M[VCOUNT + x] = M[VIBPER + x]; M[VDIR + x] = 0xFF; }
      }
      if (M[VIBMODE + x] & 0x80) {
        if (M[VDIR + x]) { M[FH + x] = M[VBH + x]; M[FL + x] = M[VBL + x]; }
        else { M[FH + x] = M[VAH + x]; M[FL + x] = M[VAL + x]; }
      } else { M[FH + x] = M[VPH + x]; M[FL + x] = M[VPL + x]; }
    }
    function readPattern(x) {                                // pat_read, $F66A; returns false at $FF
      for (;;) {
        const b = M[(pat + M[PATPOS + x]) & 0xFFFF];
        if (b === 0xFF) {
          M[NEEDPAT + x] = 1; M[SEQPOS + x] = (M[SEQPOS + x] + 2) & 0xFF;
          return false;
        }
        if (b & 0x80) {                                      // pat_instrument
          M[INSTR + x] = b & 0x7F; loadInstrument(x, b & 0x7F);
          M[PATPOS + x]++; continue;
        }
        const n = b & 0x0F;                                  // pat_note
        M[NOTE + x] = n;
        if (n) {
          M[TFL + x] = M[NOTES + n]; M[TFH + x] = 1;
          const o = (((b & 0x70) >> 4) + M[OCTADD + x]) & 0xFF;
          M[OCT + x] = o;
          for (let k = o; k; k--) {
            const f = (M[TFH + x] << 8 | M[TFL + x]) << 1;
            M[TFL + x] = f & 0xFF; M[TFH + x] = (f >> 8) & 0xFF;
          }
        }
        M[REL + x] = 0;                                      // pat_length
        M[PATPOS + x]++;
        const len = M[(pat + M[PATPOS + x]) & 0xFFFF], li = len & 0x0F;
        M[TICKS + x] = M[LENGTHS + li];
        if (li === 0x0E) M[REL + x] = M[LENGTHS + li];
        if (!M[NFLAGS + x]) {                                // pat_flags
          M[FL + x] = M[TFL + x]; M[FH + x] = M[TFH + x];
          M[VRESTART] = 0xFF;                                // STA $FAD7: voice 1's flag only
        }
        M[NFLAGS + x] = len & 0xC0;
        if (M[NOTE + x]) M[CTRL + x] |= 1;
        return true;
      }
    }
    // One tick of voice x: the sequence command at its position (mv_read_seq, $F5BD).
    // Returns 'hold' for the glide/hold path or 'vib' to go straight to the vibrato.
    function tick(x) {
      seq = M[SEQH + x] << 8 | M[SEQL + x];
      pat = M[PATH + x] << 8 | M[PATL + x];
      for (;;) {
        let y = M[SEQPOS + x];
        const c = M[(seq + y) & 0xFFFF];
        if (c === 0) { initVoice(x); return 'vib'; }        // seq_cmd_stop
        if (c === 2) { M[SEQPOS + x] = M[(seq + y + 1) & 0xFFFF]; continue; }   // seq_cmd_jump
        if (c === 3) {                                       // seq_cmd_repeat
          if (!M[REPEAT + x]) {
            M[SEQPOS + x] = M[(seq + y + 1) & 0xFFFF]; M[REPEAT + x] = M[(seq + y + 2) & 0xFFFF];
          } else if (--M[REPEAT + x]) M[SEQPOS + x] = M[(seq + y + 1) & 0xFFFF];
          else M[SEQPOS + x] = (y + 3) & 0xFF;
          continue;
        }
        // c === 1, seq_cmd_pattern (the table's other entries are code bytes no tune reaches)
        if (M[NEEDPAT + x]) {
          const k = M[(seq + y + 1) & 0xFFFF] * 2 & 0xFF;
          const lo = M[(ptab + k) & 0xFFFF] + M[PBASEL];
          const hi = M[(ptab + 1 + k) & 0xFFFF] + M[PBASEH] + (lo >> 8);
          M[PATL + x] = lo & 0xFF; M[PATH + x] = hi & 0xFF;
          pat = M[PATH + x] << 8 | M[PATL + x];
          M[PATPOS + x] = 0; M[NEEDPAT + x] = 0;
          if (readPattern(x)) return 'hold';
          continue;
        }
        if (--M[TICKS + x]) return 'hold';                   // note_tick
        if (!M[REL + x]) {                                   // note_time_up: the release tick
          M[REL + x] = 1; M[TICKS + x] = 1;
          if (!(M[NFLAGS + x] & 0x40)) M[CTRL + x] &= 0xFE;
          return 'hold';
        }
        M[PATPOS + x]++;                                     // pat_next_byte
        if (readPattern(x)) return 'hold';
      }
    }
    function sweep(src, shift) {                             // the shift loops of $F888 and $F8B7
      return (M[RAMP + src] << shift) & 0xFFFF;
    }
    let r3 = [0, 0];
    const drv = {
      sid,
      init(t) { M.set(START, 0xF400); sid.fill(0); zp = t + 1; },   // tune t + 1 (the player counts from 0); the next call starts it
      stop() { zp = 0; },
      playing() { return zp !== 0; },
      readback(env3, osc3) { r3 = [env3, osc3]; },
      voice(x) { return { note: M[NOTE + x], octave: M[OCT + x], instrument: M[INSTR + x] }; },
      play() {                                               // music_update, $F4EF
        if (!zp) { sid[24] = 0; return; }
        if (zp !== M[TUNE]) { startTune(zp); return; }
        sid[24] = M[FMODE]; sid[23] = M[FRES]; sid[21] = M[FCL]; sid[22] = M[FCH];
        for (let x = 2; x >= 0; x--) {                       // music_voices
          if (M[ACT + x]) {
            let path = 'hold';
            if (--M[TCOUNT + x] === 0) { M[TCOUNT + x] = M[TRELOAD]; path = tick(x); }
            if (path === 'hold') {
              if (M[GLON + x]) glide(x);
              else { M[FL + x] = M[TFL + x]; M[FH + x] = M[TFH + x]; }
            }
          }
          if (M[VIBON + x]) vibrato(x);
        }
        M[RAMP + 3] = r3[0]; M[RAMP + 4] = r3[1];           // music_ramps
        for (let y = 2; y >= 0; y--) {
          if (!M[RDIR + y]) {
            const v = M[RAMP + y] + M[RRATE + y];
            if (v > 0xFF) { M[RAMP + y] = 0xFF; M[RDIR + y] = 0xFF; } else M[RAMP + y] = v;
          } else {
            const v = M[RAMP + y] - M[RRATE + y];
            if (v < 0) { M[RAMP + y] = 0; M[RDIR + y] = 0; } else M[RAMP + y] = v;
          }
        }
        for (let x = 2; x >= 0; x--) {                       // music_pwm
          const s = M[PWSRC + x];
          if (s & 0x80) continue;
          const p = (sweep(s, M[PWSH + x]) + (M[PBH + x] << 8 | M[PBL + x])) & 0xFFFF;
          M[PWL + x] = p & 0xFF; M[PWH + x] = p >> 8;
        }
        if (!(M[FSRC] & 0x80)) {                             // music_filter_sweep
          const s = sweep(M[FSRC], M[FSHIFT]), base = M[FCH] << 8 | M[FCL];
          const c = (M[FDIR] ? base - s : base + s) & 0xFFFF;
          sid[21] = c & 0xFF; sid[22] = c >> 8;
        }
        for (let x = 2; x >= 0; x--) {                       // music_write_sid
          if (!(M[ACT + x] & 0x80)) continue;
          const r = 7 * x;
          sid[r] = M[FL + x]; sid[r + 1] = M[FH + x]; sid[r + 2] = M[PWL + x]; sid[r + 3] = M[PWH + x];
          sid[r + 5] = M[AD + x]; sid[r + 6] = M[SR + x]; sid[r + 4] = M[CTRL + x];
        }
      },
    };
    return drv;
  },
};
if (typeof module !== 'undefined') module.exports = FISTMUSIC;
