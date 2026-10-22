/* mom-music */
// Master of Magic (Mastertronic, 1985), music by Rob Hubbard: the game's music driver ($C000-$C32E
// and $CBC3-$CBE6) ported to JavaScript from its 6502 code, for the How it works page's player and
// for the Play tab's port (reference/mom-port.js). The site's shared SID model and player
// (../../lib/sid.js) play it and show what it reads.
//
// createDriver(M) is the port. M is the page's MOM_MUSIC: the driver's tables as the game loads them,
// each at its address. No machine code is included. createDriver(null, { mem, sid }) runs it on the
// game's own memory instead (mem, 64 KB, the driver's variables at the game's addresses) and gives
// each write to the SID to sid(register, value): that is how the Play tab's port plays the tunes,
// and test_play.js holds it there, frame by frame, to the driver's own code. The source of
// createDriver refers to nothing outside itself: the shared player runs it in an AudioWorklet.
// mountMusic(root, M) builds the player inside root. Routine and variable names follow the game's
// symbols.json.
(function () {
  'use strict';

  // The port refers to nothing outside itself: the shared player runs its source text in an
  // AudioWorklet.
  function createDriver(M, o) {
    // the driver's memory: the game's own 64 KB when o.mem is given (the Play tab's port), else one
    // that holds only the driver's tables
    const m = o && o.mem ? o.mem : new Uint8Array(0x10000);
    if (!(o && o.mem)) for (const k in M.tables) m.set(M.tables[k].bytes, parseInt(M.tables[k].addr, 16));
    const sid = new Uint8Array(25);            // $D400-$D418 as last written
    const write = o && o.sid;                  // o.sid(register, value): each write as the driver makes it
    const put = (r, v) => { sid[r] = v; if (write) write(r, v); };
    const last = [null, null, null];           // per voice: the pattern entry read last (display)
    let reads = 0;

    const FREQ_LO = 0xC32F, FREQ_HI = 0xC330, FREQ_LO_UP = 0xC331, FREQ_HI_UP = 0xC332,
      VOICE_REG = 0xC3EF, CUR_REG = 0xC3F2, TRACK_POS = 0xC3F3, PAT_POS = 0xC3F6,
      TICKS = 0xC3F9, FLAGS = 0xC3FC, CONTROL = 0xC3FF, NOTE = 0xC402, INSTR = 0xC405,
      GATE_MASK = 0xC408, FLAGS_TMP = 0xC409, FREQ_LO_TMP = 0xC40A, X_SAVE = 0xC40B,
      CONTROL_TMP = 0xC40C, VIB_DEPTH = 0xC40D, PULSE_SPEED = 0xC40E, VIB_STEP = 0xC40F,
      VIB_FREQ = 0xC411, VIB_PHASE = 0xC413, PULSE_TIMER = 0xC414, PULSE_DIR = 0xC417,
      TICK_COUNT = 0xC41A, SPEED = 0xC41B, INSTR_OFS = 0xC41C, STATE = 0xC41D,
      FREQ_HI_NOW = 0xC41E, FREQ_LO_NOW = 0xC421, FX = 0xC424, PULSE_STEP = 0xC425,
      FRAME = 0xC426, INSTRUMENTS = 0xC427, TRACK_LO = 0xC4AF, TRACK_HI = 0xC4B2,
      TUNES = 0xC4B5, PAT_LO = 0xC4C7, PAT_HI = 0xC4F0,
      TRACK_PTR = 0xFB, PAT_PTR = 0xFD;        // zero-page pointers
    const ptr = (z) => m[z] | m[z + 1] << 8;
    const inc = (a) => { m[a] = m[a] + 1; };   // 8-bit, as the Uint8Array wraps
    const dec = (a) => { m[a] = m[a] - 1; };

    // $CBC3 music_start_tune (entry $C000): copy the tune's 6 track address bytes, state $40
    function init(tune) {
      const a2 = (tune << 1) & 0xFF;
      m[X_SAVE] = a2;
      let x = (((a2 << 1) & 0xFF) + a2) & 0xFF;             // 6 x tune
      for (let y = 0; y < 6; y++, x = (x + 1) & 0xFF) m[TRACK_LO + y] = m[TUNES + x];
      m[STATE] = 0x40;
    }

    // $CBE1 music_request_stop (entry $C003): state $C0
    function stop() { m[STATE] = 0xC0; }

    // $C006 music_play: one frame
    function play() {
      inc(FRAME);
      const st = m[STATE];
      if (st & 0x80) {                                     // $C00C
        if (st & 0x40) {                                   // $C02E stop requested: silence
          put(0x04, 0); put(0x0B, 0); put(0x12, 0); put(0x18, 0x0F);
          m[STATE] = 0x80;
        }
        return;                                            // $80 stopped
      }
      if (st & 0x40) {                                     // $C010 a tune has just started
        m[FRAME] = 0;
        for (let x = 2; x >= 0; x--) m[TRACK_POS + x] = m[PAT_POS + x] = m[TICKS + x] = m[NOTE + x] = 0;
        m[STATE] = 0;
      }
      // $C046 music_play_voices: the tempo counter; a tick when it equals music_speed
      dec(TICK_COUNT);
      if (m[TICK_COUNT] & 0x80) m[TICK_COUNT] = m[SPEED];
      for (let x = 2; x >= 0; x--) {                       // $C053, SID voice 3 first
        m[CUR_REG] = m[VOICE_REG + x];
        if (m[TICK_COUNT] === m[SPEED]) {
          m[TRACK_PTR] = m[TRACK_LO + x]; m[TRACK_PTR + 1] = m[TRACK_HI + x];
          dec(TICKS + x);
          if (m[TICKS + x] & 0x80) {                       // note over: the next one
            if (!nextNote(x)) return;                      // $FE: music stopped, leave at once
            continue;                                      // $C328: no effects on this frame
          }
          release(x);                                      // then falls into the effects
        }
        effects(x);
      }
    }

    // $C07A music_next_note: the next pattern number from the voice's track
    function nextNote(x) {
      for (;;) {
        const p = m[(ptr(TRACK_PTR) + m[TRACK_POS + x]) & 0xFFFF];
        if (p === 0xFF) { m[TICKS + x] = m[TRACK_POS + x] = m[PAT_POS + x] = 0; continue; } // $C08D loop
        if (p === 0xFE) { stop(); return false; }          // $C087 JSR music_stop, JMP $C32E
        readNote(x, p);
        return true;
      }
    }

    // $C09E music_read_note: [flags/length] [instrument if bit 7] [note], or a lone rest byte
    function readNote(x, pat) {
      m[PAT_PTR] = m[PAT_LO + pat]; m[PAT_PTR + 1] = m[PAT_HI + pat];
      const base = ptr(PAT_PTR), y0 = m[PAT_POS + x];
      let y = y0;
      m[GATE_MASK] = 0xFF;
      const f = m[(base + y) & 0xFFFF];
      m[FLAGS + x] = f; m[FLAGS_TMP] = f;
      m[TICKS + x] = f & 0x1F;
      let vol = (0x75 - m[TRACK_POS + 2]) & 0xFF;          // $C0BE volume: $75 - voice 3's track position
      if (vol >= 0x0F) vol = 0x0F;
      put(0x18, vol);
      let note = -1;
      if (f & 0x40) {                                      // $C109 a rest: gate mask $FE
        dec(GATE_MASK);
      } else {
        inc(PAT_POS + x);
        if (f & 0x80) {                                    // an instrument number follows
          y = (y + 1) & 0xFF; m[INSTR + x] = m[(base + y) & 0xFFFF];
          inc(PAT_POS + x);
        }
        y = (y + 1) & 0xFF;
        note = m[(base + y) & 0xFFFF];
        m[NOTE + x] = note;
        const i = (note << 1) & 0xFF;
        m[FREQ_LO_TMP] = m[FREQ_LO + i];
        const r = m[CUR_REG];
        put(r + 1, m[FREQ_HI + i]); m[FREQ_HI_NOW + x] = m[FREQ_HI + i];
        put(r, m[FREQ_LO_TMP]); m[FREQ_LO_NOW + x] = m[FREQ_LO_TMP];
      }
      const bytes = [];
      for (let k = y0; k <= y; k++) bytes.push(m[(base + k) & 0xFFFF]);
      last[x] = { n: ++reads, track: ptr(TRACK_PTR), pos: m[TRACK_POS + x], pat, patAddr: base,
        addr: (base + y0) & 0xFFFF, bytes, len: (f & 0x1F) + 1, tie: !!(f & 0x20),
        rest: !!(f & 0x40), ins: f & 0x80 && !(f & 0x40) ? m[INSTR + x] : -1, note };
      setInstrument(x);
    }

    // $C10C music_set_instrument: control (AND gate mask), pulse width, AD, SR to the SID
    function setInstrument(x) {
      const r = m[CUR_REG];
      m[X_SAVE] = x;
      const i = (m[INSTR + x] << 3) & 0xFF;
      m[CONTROL_TMP] = m[INSTRUMENTS + 2 + i];
      put(r + 4, m[INSTRUMENTS + 2 + i] & m[GATE_MASK]);
      put(r + 2, m[INSTRUMENTS + i]);
      put(r + 3, m[INSTRUMENTS + 1 + i]);
      put(r + 5, m[INSTRUMENTS + 3 + i]);
      put(r + 6, m[INSTRUMENTS + 4 + i]);
      m[CONTROL + x] = m[CONTROL_TMP];
      inc(PAT_POS + x);                                    // $C149 past the note; $FF ends the pattern
      if (m[(ptr(PAT_PTR) + m[PAT_POS + x]) & 0xFFFF] === 0xFF) { m[PAT_POS + x] = 0; inc(TRACK_POS + x); }
    }

    // $C160 music_release: in a note's last tick, unless tied: gate off, AD and SR 0
    function release(x) {
      const r = m[CUR_REG];
      if (!(m[FLAGS + x] & 0x20) && m[TICKS + x] === 0) {
        put(r + 4, m[CONTROL + x] & 0xFE);
        put(r + 5, 0); put(r + 6, 0);
      }
    }

    // $C17F music_effects, every frame between note reads
    function effects(x) {
      const ins = m[INSTR + x], io = (ins << 3) & 0xFF;
      let c = (ins >> 5) & 1;                              // carry left by the third ASL
      m[INSTR_OFS] = io;
      m[FX] = m[INSTRUMENTS + 7 + io];
      m[PULSE_SPEED] = m[INSTRUMENTS + 6 + io];
      m[VIB_DEPTH] = m[INSTRUMENTS + 5 + io];
      if (m[VIB_DEPTH] !== 0) c = vibrato(x);
      pulse(x, c);
      drum(x);
      slide(x);
      octave(x);
    }

    // $C19D vibrato: note + phase x (next semitone - note) / 2^(depth+1); returns the carry
    function vibrato(x) {
      let ph = m[FRAME] & 7;
      if (ph >= 4) ph ^= 7;                                // 0 1 2 3 3 2 1 0
      m[VIB_PHASE] = ph;
      const i = (m[NOTE + x] << 1) & 0xFF;
      const d = m[FREQ_LO_UP + i] - m[FREQ_LO + i];
      let lo = d & 0xFF, hi = (m[FREQ_HI_UP + i] - m[FREQ_HI + i] - (d < 0 ? 1 : 0)) & 0xFF;
      do {                                                 // $C1C0 LSR/ROR, depth + 1 times
        lo = (lo >> 1) | (hi & 1) << 7; hi >>= 1;
        dec(VIB_DEPTH);
      } while (!(m[VIB_DEPTH] & 0x80));
      m[VIB_STEP] = lo; m[VIB_STEP + 1] = hi;
      m[VIB_FREQ] = m[FREQ_LO + i]; m[VIB_FREQ + 1] = m[FREQ_HI + i];
      let c = 0;
      if ((m[FLAGS + x] & 0x1F) >= 4) {                    // notes of 4 ticks or fewer: no wobble
        c = 1;                                             // left by CMP #$04
        for (let k = m[VIB_PHASE]; k > 0; k--) {
          const s = m[VIB_FREQ] + m[VIB_STEP];
          m[VIB_FREQ] = s;
          const t = m[VIB_FREQ + 1] + m[VIB_STEP + 1] + (s >> 8);
          m[VIB_FREQ + 1] = t; c = t >> 8;
        }
      }
      const r = m[CUR_REG];
      put(r, m[VIB_FREQ]); put(r + 1, m[VIB_FREQ + 1]);
      return c;
    }

    // $C20C music_pulse
    function pulse(x, c) {
      const io = m[INSTR_OFS], r = m[CUR_REG];
      if (m[FX] & 0x08) {                                  // add to the width's low byte, no CLC
        const a = (m[INSTRUMENTS + io] + m[PULSE_SPEED] + c) & 0xFF;
        m[INSTRUMENTS + io] = a; put(r + 2, a);
        return;
      }
      if (m[PULSE_SPEED] === 0) return;
      const period = m[PULSE_SPEED] & 0x1F;
      dec(PULSE_TIMER + x);
      if (!(m[PULSE_TIMER + x] & 0x80)) return;
      m[PULSE_TIMER + x] = period;
      m[PULSE_STEP] = m[PULSE_SPEED] & 0xE0;
      let lo, hi;
      if (m[PULSE_DIR + x] === 0) {                        // up until the high nibble is $E
        const s = m[PULSE_STEP] + m[INSTRUMENTS + io];
        lo = s & 0xFF; hi = (m[INSTRUMENTS + 1 + io] + (s >> 8)) & 0x0F;
        if (hi === 0x0E) inc(PULSE_DIR + x);
      } else {                                             // $C261 down until it is 8
        const s = m[INSTRUMENTS + io] - m[PULSE_STEP];
        lo = s & 0xFF; hi = (m[INSTRUMENTS + 1 + io] - (s < 0 ? 1 : 0)) & 0x0F;
        if (hi === 0x08) dec(PULSE_DIR + x);
      }
      m[X_SAVE] = x;                                       // $C278 written back into the instrument
      m[INSTRUMENTS + 1 + io] = hi; put(r + 3, hi);
      m[INSTRUMENTS + io] = lo; put(r + 2, lo);
    }

    // $C28F music_drum: first tick noise with the gate off, then a falling high byte
    function drum(x) {
      if (!(m[FX] & 0x01) || m[FREQ_HI_NOW + x] === 0 || m[TICKS + x] === 0) return;
      const a = ((m[FLAGS + x] & 0x1F) - 1) & 0xFF, r = m[CUR_REG];
      if (a >= m[TICKS + x]) {                             // $C2B0
        const f = m[FREQ_HI_NOW + x];
        dec(FREQ_HI_NOW + x);
        put(r + 1, f);
        const ctl = m[CONTROL + x] & 0xFE;
        if (ctl !== 0) { put(r + 4, ctl); return; }
      }
      put(r + 1, m[FREQ_HI_NOW + x]);                      // $C2C0
      put(r + 4, 0x80);
    }

    // $C2CB music_slide: long notes, last 18 ticks, odd frames: the high byte falls
    function slide(x) {
      if (!(m[FX] & 0x02) || (m[FLAGS + x] & 0x1F) < 0x10 || m[TICKS + x] >= 0x12 || !(m[FRAME] & 1)) return;
      const f = m[FREQ_HI_NOW + x];
      if (f === 0) return;
      dec(FREQ_HI_NOW + x);
      put(m[CUR_REG] + 1, f);
    }

    // $C2F7 music_octave: the note an octave up on 7 frames out of 8
    function octave(x) {
      if (!(m[FX] & 0x04)) return;
      let n = m[NOTE + x];
      if (m[FRAME] & 7) n = (n + 12) & 0xFF;
      const i = (n << 1) & 0xFF;                           // note 103 reads $C3FD/$C3FE
      m[FREQ_LO_TMP] = m[FREQ_LO + i];
      const r = m[CUR_REG];
      put(r + 1, m[FREQ_HI + i]); put(r, m[FREQ_LO_TMP]);
    }

    // for the display: the voice's instrument and the pattern entry it read last
    function voice(x) {
      const ins = m[INSTR + x], ia = INSTRUMENTS + 8 * ins;
      return { ins, insAddr: ia, insBytes: Array.from(m.subarray(ia, ia + 8)), read: last[x] };
    }

    return { m, sid, last, init, stop, play, playing: () => !(m[STATE] & 0x80), voice };
  }

  const TUNE_NAMES = ['Main theme', 'Death', 'Win'];

  function mountMusic(root, M) {
    const S = globalThis.C64Sid;
    if (!S) {                                                // opened from disk: the shared script is in the built site
      root.textContent = 'The player needs the site’s shared sound script, ../../lib/sid.js: open this page from the built site.';
      return;
    }
    const { hex, bytes, noteName } = S;
    const dec = (r) => r.rest ? `rest, ${r.len} ticks` : `${r.len} ticks${r.tie ? ', tied' : ''}` +
      (r.ins >= 0 ? `, instrument ${r.ins}` : '') + `, ${noteName(r.note)}`;
    S.mount(root, {
      driver: createDriver, data: M, tunes: TUNE_NAMES,
      gain: 0.6,                                             // the loudest moment of the three tunes: 0.9
      rows: [                                                // what the driver read last, and its instrument
        { k: 'Track', f: (v) => v.read && `${hex(v.read.track, 4)}, position ${v.read.pos}` },
        { k: 'Pattern', f: (v) => v.read && `${v.read.pat} at ${hex(v.read.patAddr, 4)}` },
        { k: 'Read', f: (v) => v.read && `${hex(v.read.addr, 4)}: ${bytes(v.read.bytes)}` },
        { in: true, f: (v) => v.read && dec(v.read) },
        { k: 'Instrument', f: (v) => `${v.ins} at ${hex(v.insAddr, 4)}` },
        { in: true, mono: true, f: (v) => bytes(v.insBytes) },
      ],
      // a note starts where the driver reads a new entry that is not a rest
      mark: (v, p) => !!(v.read && !v.read.rest && (!p || !p.read || p.read.n !== v.read.n)),
    });
  }

  globalThis.MoMMusic = { createDriver, TUNE_NAMES };
  globalThis.mountMusic = mountMusic;
})();
