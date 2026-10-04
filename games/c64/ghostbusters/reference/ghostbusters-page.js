// The widgets of the Ghostbusters tabs, built by work/page/build_pages.py.

// Ghostbusters' account number, ported from the game's code routine by routine.
// account_lfsr_step $91A6, account_name_sum $91B6, account_encode $90EE, account_decode $9155,
// parse_account_digits $9CFC. Names are PETSCII strings as typed (upper case), up to 20 bytes.
const GBAccount = (function () {
  function step(c) {                     // $91A6: new bit 0 = bit 7 ^ bit 5 ^ bit 4 ^ bit 3
    let a = (c << 1) & 255; a ^= c; a = (a << 1) & 255; a ^= c; a = (a << 2) & 255; a ^= c;
    return ((c << 1) & 255) | (a >> 7);
  }
  function nameSum(name) {               // $91B6: 20 bytes of $EAB3, zero-padded, mod 256
    let s = 0; for (let i = 0; i < 20 && i < name.length; i++) s += name.charCodeAt(i); return s & 255;
  }
  function check(hi, lo, name) {         // the check byte, as $90EE and $9155 compute it
    let c = (hi + lo) & 255 || 1, x = nameSum(name);
    do { c = step(c); x = (x - 1) & 255; } while (x);   // a sum of 0 steps 256 times
    return c;
  }
  // $90EE: hi = $57, lo = $58, the balance in hundreds as BCD. Returns $EAC7-$EACA and the digits.
  function encode(name, hi, lo) {
    const n = (hi << 16) | (check(hi, lo, name) << 8) | lo;
    const b = [0, 0, 0, 0];
    for (let d = 0; d < 8; d++) b[d >> 1] |= ((n >> (3 * d)) & 7) << (4 * (d & 1));
    return { bytes: b, digits: b.map(v => (v >> 4).toString() + (v & 15).toString()).join('') };
  }
  // $9CFC: typed characters' low nibbles into four bytes, right-aligned, up to eight characters
  function parse(typed) {
    let v = 0;
    for (let i = 0; i < 8 && i < typed.length; i++) v = ((v << 4) | (typed.charCodeAt(i) & 15)) >>> 0;
    return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];   // $23-$26, kept at $EAC7 .. $EACA
  }
  // $9155: bytes $EAC7-$EACA to { hi, lo, ok }; ok false when the check fails ($57 = $58 = 0)
  function decode(name, b) {
    let n = 0;
    for (let d = 7; d >= 0; d--) n = (n << 3) | ((b[d >> 1] >> (4 * (d & 1))) & 7);
    const hi = n >>> 16, ck = (n >> 8) & 255, lo = n & 255;
    if (check(hi, lo, name) !== ck) return { hi: 0, lo: 0, ok: false, check: ck, wanted: check(hi, lo, name) };
    return { hi, lo, ok: !(hi === 0 && lo === 0), check: ck };
  }
  return { step, nameSum, check, encode, parse, decode };
})();
if (typeof module !== 'undefined') module.exports = GBAccount;

const createDriver = (function () {
const module = { exports: {} };
// Ghostbusters (C64, Activision 1984): the music player at $93E1-$95A4, ported routine by routine
// to a createDriver(data) for site/lib/sid.js. data is data.json: the tune's tables as the game
// holds them at $A1F4-$A836 (made by extract.js), read here through the game's own addresses.
// Checked against the game's code run in kit/c64/cpu6502.js on work/entry.vsf by test.js: every
// SID register write, in order, every frame, for the whole tune.
//
// Tunes: init(0) is the title's sing-along ($20 game_mode = 0): the tune plays once at full
// volume and each voice stops at the $FF that ends its track list. init(1) is the tune as the
// game plays it in play ($20 non-zero): the first voice to reach its $FF restarts all three
// ($942E jsr music_restart), so it loops, and every volume is halved ($947F lsr).
// The frame: on the title the player runs first and the tick $08 advances after it
// (title_frame_work $632F, lyric_timer_tick $63BA); in play the IRQ advances the tick first
// ($8EDE) and plays after ($8FBA). On a PAL machine ($EA73 = $FF) the tick is advanced twice
// whenever it lands on a value with (tick AND 7) = 1 ($6338-$6348, $8EE0-$8EEB): 8 ticks in
// 7 frames. data.ntsc = true would model the NTSC machine, one tick a frame.
function createDriver(data) {
  'use strict';
  const BASE = data.base, MEM = data.mem;
  const rd = a => MEM[(a - BASE) & 0xFFFF];      // the tables, by the game's addresses
  const rw = a => rd(a) | rd(a + 1) << 8;
  const PAL = !data.ntsc;

  // the game's addresses for the tables
  const NOTE_FREQ = 0xA1F4;        // note_freq: 96 words, lo/hi
  const VOICE_SID = 0xA2B4;        // voice_sid_offset: 0, 7, 14
  const TRACK_LO = 0xA2B7, TRACK_HI = 0xA2BA;    // voice_track_lo / voice_track_hi
  const PATTERN_PTRS = 0xA75B;     // pattern_ptrs: 74 words
  const INSTR = 0xA7EF;            // instr_table: 9 x 8 bytes: +0 pulse lo, +1 pulse hi,
                                   // +2 control (waveform + gate), +3 AD, +4 SR, +5 vibrato depth

  // zero page and the other variables the player keeps, by the game's names
  const trackPos = [0, 0, 0];      // $82-$84 mus_track_pos: position in the voice's track list
  const patPos = [0, 0, 0];        // $85-$87 mus_pattern_pos: offset of the next event
  const dur = [0, 0, 0];           // $88-$8A mus_duration: steps left; bit 7 set = stopped
  const note = [0, 0, 0];          // $8B-$8D mus_note: note number of the last note
  const ev = [0, 0, 0];            // $8E-$90 mus_event: the last event byte
  const ctrl = [0, 0, 0];          // $91-$93 mus_control: the instrument's control byte
  const instr = [0, 0, 0];         // $94-$96 mus_instrument: instrument number (low nibble)
  let tick = 0;                    // $08 tick
  let gameMode = 0;                // $20 game_mode: 0 on the title
  let pause = 0;                   // $47 pause_flags: bit 7 = paused (RUN/STOP in play)
  let sfxBusy = 0;                 // $98 sfx_busy: non-zero = voice 3 belongs to the effects
  let voiceIndex = 0;              // $EA75 music_voice_index
  let sidVolume = 0;               // $EA82 sid_volume: last value written to $D418
  let tmpDC = 0, tmpDD = 0, tmpDE = 0, tmpDF = 0, tmpE0 = 0;   // $DC-$E0 scratch
  let sidOff = 0;                  // $E1 mus_sid_offset
  let trackPtr = 0;                // $E3/$E4 mus_track_ptr
  let patPtr = 0;                  // $E5/$E6 mus_pattern_ptr
  let tune = 0;
  const shown = [0, 0, 0];         // (the port's own, for voice()): the pattern of the last event read

  const sid = new Uint8Array(25);
  let writes = [];
  function sidWrite(r, v) { v &= 0xFF; sid[r] = v; writes.push(r, v); }

  // $93E2 music_restart: every voice back to the start of its track list
  function musicRestart() {
    for (let x = 2; x >= 0; x--) { trackPos[x] = 0; patPos[x] = 0; dur[x] = 0; }
  }

  // $9593 music_voice3_busy: true when the voice being played is voice 3 and $98 is set
  function voice3Busy() { return sfxBusy !== 0 && voiceIndex === 2; }

  // $93F0 music_play: one frame of the player, voices X = 2, 1, 0
  function musicPlay() {
    if (pause & 0x80) return;                                  // $93F2 -> $93E1 music_play_off
    for (let x = 2; x >= 0; x--) {
      voiceIndex = x;                                          // $93F6
      sidOff = rd(VOICE_SID + x);                              // $93F9
      if ((tick & 3) === 0) {                                  // $93FF: a step every 4th tick
        trackPtr = rd(TRACK_LO + x) | rd(TRACK_HI + x) << 8;   // $9405
        if (dur[x] & 0x80) continue;                           // $9411 stopped -> $958C
        dur[x] = (dur[x] - 1) & 0xFF;                          // $9413
        if (!(dur[x] & 0x80)) { stepHold(x); vibrato(x); continue; }   // $9417 -> $94FF
        // $9420: the note has run out: read the next event
        let a = rd(trackPtr + trackPos[x]);
        if (a === 0xFF) {                                      // $9424: end of the track list
          dur[x] = 0xFF;                                       // $9428 the voice stops
          if (gameMode !== 0) {                                // $942E in play: from the top;
            musicRestart();                                    // music_restart leaves X = $FF, so
            return;                                            // $958C's DEX ends the frame here
          }
          continue;
        }
        shown[x] = a;
        patPtr = rw(PATTERN_PTRS + a * 2);                     // $9434
        let y = patPos[x];                                     // $9440
        tmpDE = 0xFF;                                          // $9442 gate mask
        a = rd(patPtr + y);                                    // $9446 the event byte
        ev[x] = a; tmpDD = a;
        dur[x] = a & 0x1F;                                     // $944C bits 0-4 duration
        if (tmpDD & 0x40) {                                    // $9450 bit 6: a rest
          tmpDE = (tmpDE - 1) & 0xFF;                          // $94B0 gate bit off
        } else {
          patPos[x] = (patPos[x] + 1) & 0xFF;                  // $9454
          if (tmpDD & 0x80) {                                  // $9458 bit 7: a third byte
            a = rd(patPtr + y + 2);                            // $945C
            instr[x] = a & 0x0F;                               // $945F low nibble: instrument
            tmpDC = a >> 4;                                    // $9464 high nibble: volume
            if (tmpDC === 0x0F) {                              // $946A 15 = the fade
              a = (0x6D - trackPos[0]) & 0xFF;                 // $946E 109 - voice 1's position
              if (a >= 0x0F) a = 0x0F;                         // $9473
              tmpDC = a;
            }
            if (gameMode !== 0) tmpDC >>= 1;                   // $947B in play: half volume
            sidVolume = tmpDC;                                 // $9483
            sidWrite(0x18, tmpDC);                             // $9486 $D418
            patPos[x] = (patPos[x] + 1) & 0xFF;                // $9489
          }
          a = rd(patPtr + y + 1);                              // $948F the note number
          note[x] = a;
          const f = NOTE_FREQ + ((a << 1) & 0xFF);             // $9494 asl: tay
          tmpDC = rd(f);
          if (!voice3Busy()) {                                 // $949B
            sidWrite(sidOff + 1, rd(f + 1));                   // $94A5 frequency hi, then lo
            sidWrite(sidOff + 0, tmpDC);                       // $94AA
          }
        }
        // $94B2: the instrument's registers
        const i = (instr[x] << 3) & 0xFF;
        tmpDF = rd(INSTR + 2 + i);                             // $94BC control byte
        if (!voice3Busy()) {                                   // $94C1
          sidWrite(sidOff + 4, rd(INSTR + 2 + i) & tmpDE);     // $94CB control, gate masked on a rest
          sidWrite(sidOff + 2, rd(INSTR + 0 + i));             // $94D1 pulse width lo
          sidWrite(sidOff + 3, rd(INSTR + 1 + i));             // $94D7 pulse width hi
          sidWrite(sidOff + 5, rd(INSTR + 3 + i));             // $94DD attack/decay
          sidWrite(sidOff + 6, rd(INSTR + 4 + i));             // $94E3 sustain/release
        }
        ctrl[x] = tmpDF;                                       // $94EA
        patPos[x] = (patPos[x] + 1) & 0xFF;                    // $94EC
        if (rd(patPtr + patPos[x]) === 0xFF) {                 // $94F2 end of the pattern
          patPos[x] = 0;
          trackPos[x] = (trackPos[x] + 1) & 0xFF;              // $94FA next track entry
        }
        continue;                                              // $94FC -> $958C
      }
      vibrato(x);                                              // $941D -> $951F
    }
  }

  // $94FF: a step inside a note: gate off unless the event has bit 5 (tie), and at the last
  // step the envelope silenced
  function stepHold(x) {
    if (ev[x] & 0x20) return;                                  // $9503
    if (voice3Busy()) return;                                  // $9507
    sidWrite(sidOff + 4, ctrl[x] & 0xFE);                      // $950C gate off
    if (dur[x] !== 0) return;                                  // $9515
    sidWrite(sidOff + 5, 0);                                   // $9519 AD = 0
    sidWrite(sidOff + 6, 0);                                   // $951C SR = 0
  }

  // $951F: vibrato, every frame on which no event was read: depth from the instrument (+5);
  // the offset is (freq[n+1] - freq[n]) >> (depth + 1) times a triangle 0 1 2 3 3 2 1 0 of
  // (tick AND 7), only for notes of duration 5 or more; the frequency is written every time
  function vibrato(x) {
    const i = (instr[x] << 3) & 0xFF;
    tmpE0 = rd(INSTR + 5 + i);                                 // $9525
    if (tmpE0 === 0) return;                                   // $952A
    let t = tick & 7;                                          // $952C
    if (t >= 4) t ^= 7;
    tmpDE = t;
    const y = (note[x] << 1) & 0xFF;                           // $9538
    let d = (rw(NOTE_FREQ + 2 + y) - rw(NOTE_FREQ + y)) & 0xFFFF;   // $953C
    do { d >>= 1; tmpE0 = (tmpE0 - 1) & 0xFF; } while (!(tmpE0 & 0x80));   // $954B
    tmpDC = d & 0xFF; tmpDD = d >> 8;
    let f = rw(NOTE_FREQ + y);                                 // $9554
    if ((ev[x] & 0x1F) >= 5) {                                 // $955E
      for (let k = tmpDE; k > 0; k--) f = (f + d) & 0xFFFF;    // $9568
    }
    tmpDF = f & 0xFF; tmpE0 = f >> 8;
    if (voice3Busy()) return;                                  // $957D
    sidWrite(sidOff + 0, tmpDF);                               // $9584
    sidWrite(sidOff + 1, tmpE0);                               // $9589
  }

  // the tick $08, as lyric_timer_tick ($63BA) and $6338 on the title, or $8EDE in play, count it
  function advanceTick() {
    tick = (tick + 1) & 0xFF;
    if (PAL && (tick & 7) === 1) tick = (tick + 1) & 0xFF;
  }

  function reset() {
    trackPos.fill(0); patPos.fill(0); dur.fill(0); note.fill(0); ev.fill(0); ctrl.fill(0);
    instr.fill(0); shown.fill(0); pause = 0; sfxBusy = 0; sid.fill(0);
  }

  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return {
    sid,
    writes,
    // init(0): the title ($62F5-$62FB: tick = 0, music_restart); init(1): as in play
    init(t) {
      tune = t ? 1 : 0;
      reset();
      gameMode = tune;
      tick = 0;
      musicRestart();
      writes.length = 0;
    },
    // as end_page_setup does ($8DA6-$8DB1): music_restart, every voice stopped, SID silenced
    stop() {
      musicRestart();
      dur.fill(0xFF);
      writes.length = 0;
      for (let r = 24; r >= 0; r--) sidWrite(r, 0);            // $63AF silence_sid, $D41F down
    },
    play() {
      writes.length = 0;
      if (gameMode === 0) { musicPlay(); advanceTick(); }      // title: $632F then $6335
      else { advanceTick(); musicPlay(); }                     // play: $8EDE then $8FBA
    },
    playing() { return dur.some(d => !(d & 0x80)); },
    // voice 3 lent to the sound effects ($98): the page can set it to hear the gap
    sfx(on) { sfxBusy = on ? 1 : 0; },
    // $47 bit 7, RUN/STOP in play: music_play returns at once (the game also writes $D418 = 0
    // on pausing, $70EB, and restores it from $EA82 on resuming, $70CE: outside the player)
    pause(on) { pause = on ? 0x80 : 0; },
    voice(x) {
      const n = note[x];
      return {
        track: trackPos[x],                                    // position in the track list, 0-108
        pattern: shown[x],                                     // pattern of the event playing
        note: n,
        name: NAMES[n % 12] + Math.floor(n / 12),
        instrument: instr[x],
        rest: !!(ev[x] & 0x40),
        stopped: !!(dur[x] & 0x80),
      };
    },
    // for tests
    state() { return { tick, trackPos: trackPos.slice(), patPos: patPos.slice(), dur: dur.slice() }; },
  };
}
if (typeof module !== 'undefined') module.exports = { createDriver };

return module.exports.createDriver;
})();
const GBSpeech = (function () {
const module = { exports: {} };
'use strict';
// Ghostbusters (C64, Activision 1984): the digitised-speech player, $F080-$F4E9, ported to
// JavaScript routine by routine. No dependencies; works in node and in a browser.
//
//   const S = speech.load(dataJson);          // data.json, as extract.js writes it
//   const r = speech.play(S, 1);              // phrase 0-4
//   r.ticks[i], r.values[i]                   // the i-th write to $D418: NMI tick, value 0-15
//   r.cycles(i)                               // its nominal time in CPU cycles from the first NMI
//   r.frames, r.periods                       // metadata for drawing (see below)
//   speech.toPCM(r, 44100)                    // Float32Array, $D418 as a DC level
//
// Timing. The player runs one NMI per underflow of CIA 2 timer B, latch $0065: one tick every 102
// cycles (9,659.3 a second on PAL, 985,248 Hz clock; 10,026.7 on NTSC). Every write to $D418 is
// made by the NMI of one tick, and each tick makes at most one write, so the port counts in ticks:
// tick 0 is the first NMI after the phrase starts. Every handler that writes does so on the 20th
// cycle after the NMI is taken (7 cycles of NMI entry, then PHA, LDA abs, LSR, STA: $F083, $F0A4;
// PHA, NOP, LDA #, LSR, STA: $F0C3), and the stop handler ($F0E1) on the 22nd, so the nominal
// time of a write is tick * 102 + 19 (+ 2 for the last one), counting the cycle the timer
// underflows as 0. On the machine a write lands later by however long the CPU takes to finish the
// instruction it was running when the timer ran out (0-6 cycles, more when the NMI arrives during
// another NMI's long work): that jitter is not modelled here (test.js measures it).
// Time before tick 0: the phrase starts when the game calls $F080; the first NMI comes when the
// timer first runs out, which depends on the latch CIA 2 held before ($F47E starts the timer
// before it writes the new latch). After an earlier phrase that is 102 cycles.
//
// State. The player keeps its variables inside its own code (self-modified operands) and in zero
// page $F5-$FF. The port keeps a 64 KB array m[] with the same addresses, so that every variable
// has the address the game uses. Only the speech data and three tables are loaded (data.json);
// the waveform buffer $F000-$F07F starts as the caller gives it (zeros by default): the game's
// buffer holds whatever the previous phrase left, and a phrase's output would depend on it only
// if a crossfade read the buffer before the phrase wrote it (test.js shows whether that happens).

const TICK = 102;                 // cycles between NMIs: latch $0065 + 1 ($F483)
const PAL = 985248, NTSC = 1022727;
const WRITE_OFFSET = 19, STOP_OFFSET = 21;   // cycle of the $D418 write after the tick (0-based)

function load(data, opts = {}) {
  const m = new Uint8Array(65536);
  for (const b of data.blocks) {
    const a = parseInt(b.start.slice(1), 16);
    for (let i = 0; i < b.hex.length / 2; i++) m[a + i] = parseInt(b.hex.substr(i * 2, 2), 16);
  }
  if (opts.buffer) m.set(opts.buffer.subarray ? opts.buffer.subarray(0, 128) : opts.buffer.slice(0, 128), 0xF000);
  // speech_data_base $F4E7/$F4E8 = $F4EA, as in the image
  m[0xF4E7] = data.base & 255; m[0xF4E8] = data.base >> 8;
  return { m, base: data.base };
}

// A = phrase, then as speech_command ($F42E) does. Returns the writes and the metadata.
function play(S, phrase, opts = {}) {
  const m = S.m;
  const st = { vec: 0, stopped: false, tick: 0, ticks: [], values: [], frames: [], periods: [],
    frame: -1, strayReads: 0 };
  const W = v => { st.ticks.push(st.tick); st.values.push(v & 255); };
  const rd = a => m[a & 0xFFFF];
  const buf = lo => {                                // LDA $F000,X / $F000 + low byte
    const a = 0xF000 + lo;
    if (a > 0xF07F) st.strayReads++;                 // the port holds no code bytes of $F080-$F0FF
    return m[a];
  };
  const ptr = zp => m[zp] | (m[zp + 1] << 8);

  // --- speech_find_phrase $F496: pointers from the phrase table at the data base
  function findPhrase(a) {
    let c = 0;                                         // C clear after CMP #$FD with A < $FD ($F436)
    for (let i = 0; i < 3; i++) { const n = (a >> 7) & 1; a = ((a << 1) | c) & 255; c = n; }  // ROL x3
    const x = a;                                       // TAX $F499
    { const n = a & 1; a = (a >> 1) | (c << 7); c = n; }                                    // ROR $F49A
    a &= 0xFC; c = 0;                                  // AND #$FC, CLC
    let s = a + m[0xF4E7]; m[0xF9] = s & 255; c = s >> 8;                                    // $F49E
    s = (x & 3) + m[0xF4E8] + c; m[0xFA] = s & 255; c = s >> 8;                              // $F4A6
    const t = ptr(0xF9);
    s = rd(t) + m[0xF4E7] + c; m[0xF7] = s & 255; c = s >> 8;                                // $F4AF pitch list
    s = rd(t + 1) + m[0xF4E8] + c; m[0xF8] = s & 255; c = s >> 8;                            // $F4B7
    m[0xF4E4] = 0xFF;                                  // $F4BE: first voiced period reads a pitch record
    s = rd(t + 2) + m[0xF4E7]; m[0xF5] = s & 255; c = s >> 8;                                // $F4C5 frame list
    s = rd(t + 3) + m[0xF4E8] + c; m[0xF6] = s & 255;                                        // $F4CD
    m[0xF1BD] = 0;                                     // $F4D4 speech_frame_flags
  }

  // --- speech_read_frame $F1BC: the next 4-byte frame record through ($F5)
  function readFrame() {
    if (m[0xF1BD] & 0x20) { m[0xF138] = 0x7E; return; }   // previous frame was the last: $F1C2
    const p = ptr(0xF5);
    const b0 = rd(p), b1 = rd(p + 1);
    m[0xF1BD] = b0;                                    // $F1CC
    m[0xF4DF] = b0 | 0xF0;                             // $F1D1 speech_periods_reload
    m[0xF4DE] = (b1 >> 3) | 0xE0;                      // $F1DC speech_chunks_left
    const f = { tick: st.tick, record: p, bytes: [b0, b1, rd(p + 2), rd(p + 3)],
      chunks: 32 - (b1 >> 3), periodsPerChunk: 16 - (b0 & 15) };
    st.frames.push(f); st.frame = st.frames.length - 1;
    if ((b1 >> 2) & 1) {                               // $F1DF BCS speech_pause_frame ($F251)
      f.type = 'pause'; f.code = -1;
      m[0xF111] = 0x3A; m[0xF138] = 0x84;
      nextFrame(); return;
    }
    let s = rd(p + 2) + m[0xF4E7]; m[0xF9] = s & 255;  // $F1E4 (C clear: BCS not taken)
    s = rd(p + 3) + m[0xF4E8] + (s >> 8); m[0xFA] = s & 255;
    f.samples = ptr(0xF9);
    m[0xF4DA] = 0x83;                                  // $F1F3 period handler nmi_play_forward
    const x = b1 & 3; f.code = x;
    if (x < 2) {                                       // $F1FF: types 0, 1 (unvoiced)
      f.type = 'unvoiced';
      const len = (b0 & 0x40) ? 0x40 : 0x20;           // $F205-$F20B
      m[0xF4E1] = len; m[0xF4E2] = len >> 3;           // chunk length, window step
      m[0xF111] = 0x54;                                // period job speech_unvoiced_period
      m[0xF4DD] = 0;                                   // $F219 STY: no gap
      m[0xF138] = (x & 1) ? 0x8F : 0x92;               // $F21C-$F224
      f.length = len;
    } else {                                           // $F22A: types 2, 3 (voiced)
      f.type = 'voiced';
      m[0xF4DC] = rd(0xF24D + (b0 >> 6));              // $F234 speech_voiced_lengths
      m[0xF111] = 0x3C;                                // period job speech_voiced_period
      m[0xF138] = (x & 1) ? 0x95 : 0x9B;               // $F23F-$F247
      f.length = m[0xF4DC];
    }
    nextFrame();
  }
  function nextFrame() {                               // speech_next_frame $F25B
    const s = m[0xF5] + 4; m[0xF5] = s & 255; if (s > 255) m[0xF6] = (m[0xF6] + 1) & 255;
  }

  // --- speech_start_chunk $F125 / speech_next_chunk $F120
  function nextChunk() {
    m[0xF4DE] = (m[0xF4DE] + 1) & 255;                 // $F120
    if (m[0xF4DE] === 0) readFrame();                  // $F125
    chunkTail();
  }
  function startChunk() { readFrame(); chunkTail(); }
  function chunkTail() {                               // $F128
    m[0xF4E0] = m[0xF4DF];
    const a = (m[0xF4DB] & 0x40) ^ 0x40;               // the half not playing
    decoderJob(m[0xF138], a);                          // $F137 JMP (self-modified), X = A, C = 0
  }
  function decoderJob(lo, a) {
    switch (lo) {
      case 0x7E: m[0xF4DA] = 0xE1; return;             // speech_set_stop $F17E
      case 0x84: m[0xF4DA] = 0xC3; m[0xF4DD] = 0x80; return;   // speech_set_pause $F184
      case 0x8F: decode1bit(a); return;                // $F18F -> $F372
      case 0x92: decode2bitFixed(a); return;           // $F192 -> $F3E2 (no phrase uses it)
      case 0x95: decode2bit(a); switchOrBlend(); return;       // $F195 (no phrase uses it)
      case 0x9B: decode4bit(a); switchOrBlend(); return;       // $F19B
      default: throw new Error('decoder slot $F1' + lo.toString(16));
    }
  }

  // --- speech_decode_4bit $F2E4: voiced chunk, 2 samples per byte, doubled (AND $1E)
  function decode4bit(x) {
    const end = (x + m[0xF4DC]) & 255; m[0xF318] = end;   // $F2E7 (C clear)
    m[0xF4E3] = x;                                     // speech_new_half
    let p = ptr(0xF9), b = rd(p);
    const hi = (b >> 3) & 0x1E;                        // $F2F1-$F2F4: high nibble first ...
    m[0xF000 + x] = hi; x = (x + 1) & 255;
    m[0xF000 + x] = hi; x = (x + 1) & 255;             // ... stored twice ($F2FA JMP $F30D)
    p = incPtr(0xF9);
    while (x !== end) {                                // $F317 CPX / BNE
      b = rd(p);
      m[0xF000 + x] = (b << 1) & 0x1E; x = (x + 1) & 255;   // $F2FD low nibble
      m[0xF000 + x] = (b >> 3) & 0x1E; x = (x + 1) & 255;   // $F306 high nibble
      p = incPtr(0xF9);
    }
  }
  function incPtr(zp) { m[zp] = (m[zp] + 1) & 255; if (m[zp] === 0) m[zp + 1] = (m[zp + 1] + 1) & 255; return ptr(zp); }

  // --- speech_decode_1bit $F372: unvoiced chunk, 8 samples per byte, $0E or $10
  function decode1bit(x) {
    m[0xF4DB] = x;                                     // play_start = the new half, at once
    const end = (x + m[0xF4E1]) & 255; m[0xF3AA] = end;
    m[0xF4DC] = m[0xF4E1];                             // half_length = chunk length
    const lvl = bit => (bit ? 0x10 : 0x0E);
    let p = ptr(0xF9), b = rd(p);
    // first byte ($F383-$F39F): bit 1 twice, then bits 2-7; bit 0 unused
    const seq = [1, 1, 2, 3, 4, 5, 6, 7];
    for (const k of seq) { m[0xF000 + x] = lvl((b >> k) & 1); x = (x + 1) & 255; }
    p = incPtr(0xF9);
    while (x < end) {                                  // $F3A9 CPX / BCC
      b = rd(p);                                       // $F398: bits 0-7, low first
      for (let k = 0; k < 8; k++) { m[0xF000 + x] = lvl((b >> k) & 1); x = (x + 1) & 255; }
      p = incPtr(0xF9);
    }
  }

  // --- speech_decode_2bit $F267 (type 3) and speech_decode_2bit_fixed $F3E2 (type 0). No phrase
  // of the game uses either, so test.js cannot check them against the game.
  function decode2bit(x) {
    const end = (x + m[0xF4DC]) & 255; m[0xF2D4] = end;
    m[0xF4E3] = x;
    decode2bitBody(x, rd(ptr(0xF9)), end);
  }
  function decode2bitFixed(x) {
    m[0xF4DB] = x;
    const end = (x + m[0xF4E1]) & 255; m[0xF2D4] = end;
    m[0xF4DC] = m[0xF4E1];
    decode2bitBody(x, (rd(ptr(0xF9)) & 0xFC) | 1, end);
  }
  function decode2bitBody(x, b, end) {                // $F274
    m[0xF2A2] = b;
    m[0xFB] = 0xD4 + 4 * (b & 3);                      // level table $F2D4 + 4 * scale (scale 0: code bytes)
    const code = [null, 0xD0, 0xBA, 0x60];             // $F2D5-$F2D7: BNE $F291 / RTS
    const lv = y => { const a = (m[0xFC] << 8 | m[0xFB]) + y; return (a >= 0xF2D5 && a <= 0xF2D7) ? code[a - 0xF2D4] : m[a]; };
    const put = v => { m[0xF000 + x] = v; x = (x + 1) & 255; };
    let v = lv((b >> 2) & 3); put(v); put(v);          // $F28A, $F2AA: stored twice
    put(lv((b >> 4) & 3)); put(lv((b >> 6) & 3));
    let p = incPtr(0xF9);
    while (x !== end) {                                // $F2D3 CPX / BNE
      b = rd(p); m[0xF2A2] = b;
      put(lv(b & 3)); put(lv((b >> 2) & 3)); put(lv((b >> 4) & 3)); put(lv((b >> 6) & 3));
      p = incPtr(0xF9);
    }
  }

  // --- speech_switch_or_blend $F19E
  function switchOrBlend() {
    if (m[0xF1BD] & 0x10) {                            // hard switch, first chunk of the frame only
      m[0xF1BD] ^= 0x10;
      m[0xF4DB] = m[0xF4E3];
    } else crossfade();
    pitchStep();
  }

  // --- speech_crossfade $F3FC: (old + new + 1) / 2 into the spare quarter, which becomes the one played
  function crossfade() {
    const old = m[0xF4DB], nw = m[0xF4E3];
    m[0xF41B] = old; m[0xF417] = nw;
    const dest = ((old & 0x40) ^ 0x40) | 0x20; m[0xF41F] = dest;
    let x = 0;
    do {
      const s = buf(nw + x) + buf(old + x) + 1;        // LDA new,X / SEC / ADC old,X
      m[0xF000 + dest + x] = ((s >> 1) & 0x7F) | ((s >> 8) << 7);   // ROR
      x = (x + 1) & 255;
    } while (x !== m[0xF4DC]);
    m[0xF4DB] = dest;
  }

  // --- speech_pitch_step $F31C / speech_read_pitch $F330
  function pitchStep() {
    m[0xF4E4] = (m[0xF4E4] + 1) & 255;
    if (m[0xF4E4] !== 0) {
      m[0xF4E5] = (m[0xF4E5] + m[0xF4E6]) & 255;       // pitch += slope
      m[0xF4DD] = m[0xF4E5] >> 1;                      // gap = pitch / 2
      return;
    }
    const b0 = rd(ptr(0xF7));
    m[0xF4E5] = b0 & 0xFE;
    let c = b0 & 1;                                    // LSR $F33B
    m[0xF7] = (m[0xF7] + 1) & 255;                     // INC $F7 without a carry into $F8 ($F33C)
    const b1 = rd(ptr(0xF7));
    let a = b1;
    for (let i = 0; i < 4; i++) { const n = a & 1; a = (a >> 1) | (c << 7); c = n; }   // ROR x4
    m[0xF4E4] = a | 0xE0;                              // periods: 32 - (b0 bit 0 * 16 + b1 >> 4)
    m[0xF4E6] = rd(0xF362 + (b1 & 15));                // speech_slopes
    incPtr(0xF7);                                      // $F354
    m[0xF4DD] = m[0xF4E5] >> 1;
  }

  // --- the period jobs, JMP $F110 (self-modified low byte $F111)
  function periodJob(lo) {
    switch (lo) {
      case 0x3A: return;                               // speech_period_nothing
      case 0x3C:                                       // speech_voiced_period $F13C
        if (m[0xF4E3] !== m[0xF4DB]) crossfade();
        pitchStep(); return;
      case 0x54:                                       // speech_unvoiced_period $F154
        if (m[0xF4DC] === 0x10) { m[0xF4DB] &= 0x40; m[0xF4DC] = m[0xF4E1]; return; }
        m[0xF4DC] = (m[0xF4DC] - m[0xF4E2]) & 255;
        m[0xF4DB] = (m[0xF4DB] + m[0xF4E2]) & 255;
        return;
      default: throw new Error('period job $F1' + lo.toString(16));
    }
  }

  // --- nmi_period_end $F0F1: the next pitch period's parameters, then this period's job
  function periodEnd() {
    st.vec = m[0xF4DA];
    m[0xF085] = m[0xF4DB];                             // forward index (operand of LDA $F000 at $F084)
    m[0xFD] = m[0xFE] = m[0xF4DC];
    m[0xFF] = m[0xF4DD];
    st.periods.push({ tick: st.tick + 1, handler: st.vec, start: m[0xF4DB], half: m[0xFD], gap: m[0xFF], frame: st.frame });
    m[0xF4E0] = (m[0xF4E0] + 1) & 255;
    if (m[0xF4E0] !== 0) periodJob(m[0xF111]);
    else nextChunk();                                  // $F113: nmi_chunk_end
  }

  // --- one NMI: the handler the vector $FFFA points at
  function nmi() {
    switch (st.vec) {
      case 0x83: {                                     // nmi_play_forward $F083
        W(buf(m[0xF085]) >> 1);
        m[0xFD] = (m[0xFD] - 1) & 255;
        if (m[0xFD] === 0) { st.vec = 0xA4; m[0xF0A6] = m[0xF085]; }
        else m[0xF085] = (m[0xF085] + 1) & 255;
        break;
      }
      case 0xA4: {                                     // nmi_play_backward $F0A4
        W(buf(m[0xF0A6]) >> 1);
        m[0xFE] = (m[0xFE] - 1) & 255;
        if (m[0xFE] === 0) { if (m[0xFF] === 0) periodEnd(); else st.vec = 0xC3; }
        else m[0xF0A6] = (m[0xF0A6] - 1) & 255;
        break;
      }
      case 0xC3:                                       // nmi_silence_start $F0C3: level 7 once
        W(0x0E >> 1);
        m[0xFF] = (m[0xFF] - 1) & 255;
        if (m[0xFF] === 0) periodEnd(); else st.vec = 0xD9;
        break;
      case 0xD9:                                       // nmi_silence $F0D9: no write
        m[0xFF] = (m[0xFF] - 1) & 255;
        if (m[0xFF] === 0) periodEnd();
        break;
      case 0xE1:                                       // nmi_speech_stop $F0E1: timer off, level 7
        W(7); st.stopped = true;
        break;
      default: throw new Error('NMI vector $F0' + st.vec.toString(16));
    }
  }

  // --- speech_command $F42E, for a phrase number
  findPhrase(phrase & 255);
  m[0xF4DB] = 0;                                       // $F444 play_start
  m[0xFC] = 0xF2;                                      // $F449 level tables' page
  st.vec = 0xC3;                                       // $F44B-$F452 NMI vector $F0C3
  m[0xFF] = 1;                                         // $F455 a one-tick gap
  startChunk();                                        // $F459
  const maxTicks = opts.maxTicks || 200000;            // speech_timer_start $F45C: ticks from here
  for (st.tick = 0; !st.stopped; st.tick++) {
    if (st.tick >= maxTicks) throw new Error('phrase ' + phrase + ' did not end in ' + maxTicks + ' ticks');
    nmi();
  }
  return result(st);
}

function result(st) {
  const n = st.ticks.length;
  const ticks = Int32Array.from(st.ticks), values = Uint8Array.from(st.values);
  const totalTicks = st.tick;                          // ticks run, the stop tick included
  // frames: when each becomes audible (the first period that plays it) and how it sounds
  const periods = st.periods.filter(p => p.tick < totalTicks);
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    p.ticks = (i + 1 < periods.length ? periods[i + 1].tick : totalTicks - 1) - p.tick;
    p.kind = p.handler === 0xC3 ? 'pause' : p.handler === 0xE1 ? 'stop' : p.gap === 0 ? 'unvoiced' : 'voiced';
  }
  for (const f of st.frames) { f.periods = []; }
  for (const p of periods) if (p.frame >= 0 && p.handler !== 0xE1) st.frames[p.frame].periods.push(p);
  const frames = st.frames.map((f, i) => {
    const ps = f.periods, voiced = ps.filter(p => p.kind === 'voiced');
    const o = { index: i, type: f.type, record: f.record, bytes: f.bytes, chunks: f.chunks,
      periodsPerChunk: f.periodsPerChunk, length: f.length, samples: f.samples,
      startTick: ps.length ? ps[0].tick : null,
      endTick: ps.length ? ps[ps.length - 1].tick + ps[ps.length - 1].ticks : null };
    if (voiced.length) o.pitchTicks = voiced.map(p => 2 * p.half + p.gap);   // period length in ticks, one per period
    return o;
  });
  return {
    ticks, values, totalTicks, frames,
    periods: periods.map(p => ({ tick: p.tick, ticks: p.ticks, kind: p.kind, half: p.half, gap: p.gap, start: p.start, frame: p.frame })),
    strayReads: st.strayReads,
    cycles: i => ticks[i] * TICK + (i === n - 1 ? STOP_OFFSET : WRITE_OFFSET),
    seconds: (clock = PAL) => totalTicks * TICK / clock,
  };
}

// $D418 as a DC level: the output follows the 4-bit volume, held from one write to the next (the
// SID's volume-register sample playback). Assumptions: the output is linear in the value, v = 0-15
// maps to -1 .. +1 (the constant offset is what the C64's AC-coupled output removes anyway); the
// level before the first write is 7 (the gap level); writes land at their nominal cycle; each output
// sample is the average of the held level over its interval (a box filter, no other filtering).
function toPCM(r, rate = 44100, opts = {}) {
  const clock = opts.clock || PAL;
  const n = r.ticks.length;
  const endCyc = r.cycles(n - 1) + TICK;              // hold the last value one tick
  const total = Math.ceil(endCyc / clock * rate);
  const out = new Float32Array(total);
  const lvl = v => v / 7.5 - 1;
  let i = 0, cur = lvl(opts.initial === undefined ? 7 : opts.initial);
  const cyc = k => r.cycles(k);
  for (let s = 0; s < total; s++) {
    const t0 = s * clock / rate, t1 = (s + 1) * clock / rate;
    let acc = 0, t = t0;
    while (i < n && cyc(i) < t1) { const tw = Math.max(cyc(i), t0); acc += cur * (tw - t); t = tw; cur = lvl(r.values[i]); i++; }
    acc += cur * (t1 - t);
    out[s] = acc / (t1 - t0);
  }
  return out;
}

// A 16-bit mono WAV of a Float32Array, for node (Buffer) or the browser (ArrayBuffer).
function wav(pcm, rate) {
  const ab = new ArrayBuffer(44 + pcm.length * 2), d = new DataView(ab);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) d.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); d.setUint32(4, 36 + pcm.length * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, rate, true);
  d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); s(36, 'data');
  d.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return ab;
}

const api = { load, play, toPCM, wav, TICK, PAL, NTSC, WRITE_OFFSET, STOP_OFFSET };
if (typeof module !== 'undefined') module.exports = api;
else if (typeof window !== 'undefined') window.GhostbustersSpeech = api;

return module.exports;
})();
(function () {
  'use strict';
  const FRAMES = {"map":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[143,186,143,186,29,66,29,186,29,32,53,64,29,212,53,180,160,27,0,209,0,255,215,0,87,126,241,0,2,0,63,255,240,252,247,240,240,240,240,241,242,247,240,247,247,247,247],"cia2":[194,255],"cpu":[47,53],"writes":[[223,48,53285,246],[223,52,53292,246],[223,56,53293,246],[223,60,53287,246],[224,1,53281,246],[224,10,53288,246],[224,14,53290,246],[224,18,53291,246],[224,22,53270,208],[224,31,53262,0],[224,43,53260,0],[224,55,53258,0],[225,4,53256,0],[225,20,53254,0],[225,32,53252,0],[225,44,53250,0],[225,56,53248,0],[226,3,53264,0],[236,59,53281,240],[236,63,53287,240],[237,4,53288,240],[237,37,53262,72],[238,13,53269,128],[238,19,53263,242],[238,25,53294,242],[238,31,22527,59],[242,7,53270,192],[242,37,53275,128],[244,16,53294,248],[246,14,53294,247],[248,12,53294,245],[250,17,53294,246],[251,16,53294,240],[251,37,53275,0],[251,49,53269,255],[251,59,53270,215],[252,27,53262,53],[252,36,53263,180],[252,45,22527,9],[252,56,53294,247],[253,27,53260,29],[253,56,53293,247],[254,27,53258,53],[254,56,53292,247],[255,27,53256,29],[255,56,53291,247],[256,27,53254,29],[256,56,53290,240],[257,27,53252,29],[258,27,53250,143],[258,56,53288,242],[259,27,53248,143],[259,56,53287,241],[260,4,53264,160],[260,16,53281,252],[260,23,53285,240]],"colour":"DQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQoKCgoKDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0KCgoKCg0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NCgoKCgoNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQoKCgoKDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQEBAQENDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0ADQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQEBAQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16640,"b":"AAQAADgAAHAAAPgAAawAAfwAA94AA94AAfgAB/AAj8CA/wPwYA+8AH/eAH/AAH/AAf+AAf8AAAAAAAAAAAAA"},{"a":16704,"b":"AAAAAAAAAKoAAqqACqqgKlWoKVVopVWqpVaqpVqapWpapalapqVaqpVaqlVaqVVqKVVoKlWoCqqgAqqAAKoA"},{"a":16768,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAf/AA//gA//gB+PwB8HwB+PwB+PwB8HwB//wB//wAAAAAAAAAAAAAAAAAAAA"},{"a":16832,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AABmAABD/wBmCgA8EQAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":16896,"b":"AQAAAOAAAHAAAPgAAdQAAfwAA94AA8YAAewAA/8AB//gD//wDH4cGH8GYH+AAH+AAf+AAf8AD/4AH/gA/gAA"},{"a":16960,"b":"AACAAAcAAA4AAB8AACuAAD+AAHvAAGPAADeAAP/AB//gD//wOH4wYP4YAf4GAf4AAf+AAP+AAH/wAB/4AAB/"},{"a":20160,"b":"///////////+///+///8///8///4///4AAAAAAAA"},{"a":21504,"b":"qalZWltcXV6pWV9gYWJeqVljZGVmXqlZZ2hpal6pWWtsaWpeqampRLu8vb4AAKS3uLm6AACpu7y9vgAArr/AwcIAAMPExcbHAACuv8DBwqnNzs/QAADIycrLzAAAqc3Oz9AAANHS09TVAADWzdfY2QAA0dLT1NUAbm9wcXJzdHV2bXcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmpucnZ4AANrb3N3eAADf4OHi4wAAkJGSk5QAAJWWl5iZAACfoKGio66vsLGyAADk5ebn6AAA6err7O0AAKSlpqeoAACpqqusrQAAqbO0tbauv8DBwgAA7o+prO8AAPDx8fLCAACkt7i5ugAAqbu8vb4AAMPExcbH0dLT1NUAAPP09fb3AAD4+fn6+wAAyMnKy8wAAKnNzs/QAADWzdfY2QBueHl6e3h8bX1+dwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACfoKGiowAAmpucnZ4AAJ+goaKjAADa29zd3gAA3+Dh4uMAANrb3N3eqbO0tbYAAK6vsLGyAACps7S1tgAA5OXm5+gAAOnq6+ztAADk5ebn6MPExcbHAACuv8DBwgAAw8TFxscAABoVFQzvAADw8fHywgAA7o+prO/WzdfY2QAA0dLT1NUAANbN19jZAADz9PX29wAA+Pn5+vsAAPP09fb3AG5/gIGCg4SFhod3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANrb3N3eAACQkZKTlAAAlZaXmJkAAJqbnJ2eAACfoKGiowAA3+Dh4uPk5ebn6AAApKWmp6gAAKmqq6ytAACur7CxsgAAqbO0tbYAAOnq6+zt7o+prO8AAKS3uLm6AACpu7y9vgAArr/AwcIAAMPExcbHAADw8fHywvP09fb3AADIycrLzAAAqc3Oz9AAANHS09TVAADWzdfY2QAA+Pn5+vsAboh7gomKi4yNjncAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3+Dh4uMAANrb3N3eAADf4OHi4wAAkJGSk5QAAJWWl5iZAACQkZKTlOnq6+ztAADk5ebn6AAA6QcIEe0AAKSlpqeoAACpqqusrQAApKWmp6gAqampqampqampqampqampqampqampqampqampqampqampqampqampqQADCRQZJxMAEAsABQ4FEgcZOgAAMDE0AAAAAAAAAAAAJDI1MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"BAUHBggJCAkAAAAAAAAAAA=="},{"a":22552,"b":"PGZgYGBmPAA="},{"a":22568,"b":"fmBgeGBgfgA="},{"a":22584,"b":"PGZgbmZmPABmZmZ+ZmZmADwYGBgYGDwA"},{"a":22616,"b":"Zmx4cHhsZgBgYGBgYGB+AA=="},{"a":22640,"b":"ZnZ+fm5mZgA="},{"a":22656,"b":"fGZmfGBgYAA8ZmZmZjwOAHxmZnx4bGYAPGZgPAZmPAB+GBgYGBgYAGZmZmZmZjwA"},{"a":22728,"b":"ZmZmPBgYGAB+BgwYMGB+AAEDBw0ZP2HBn4CPnJycnI//MDMzMzMzM/AwMTM2PDgwf8CYGRkYGBn/APODw3Mz44AAHDY2NjYcAABjc3tvZ2M="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22840,"b":"DAwYAAAAAAA="},{"a":22912,"b":"PGZmZmZmPAAYGDgYGBh+ADxmBgwwYH4A"},{"a":22944,"b":"Bg4eZn8GBgB+YHwGBmY8AA=="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23040,"b":"AAAAAwMAAAA="},{"a":23072,"b":"qqqrrq6vr6o="},{"a":23240,"b":"qquvr6+vq6r/+v7+/v76/////v7//77///+6/r6+vv///7///////6rq+vr6+uqq//r//v77+v///7r6+/u7////7u6uru7///+v7+/vr///+v/6/+/6////vv6+vv7///+/76/7+////6u7u7ur///u7u7q/v7////6/r7+/v///7v7+vv7////v7+/v7////r7+v//+v//v/q+vr6+////////////qquvr6+vq6r//v7+/v7+//+u7u6u/v7//67u7q7u7v//ru7uvu7u///v77+v7+////r7+/r7+///u7u7u7q+//+6u7q7u/r/qur6+vr66qr/+u7v7+76///u7uru7u7//+7u7u7u6v//6u7u6+7u///u7urq7u7//6u/q/v7q///q+/v7+/v///7+/v7+/r//7u7urq7u///7u7urq7u///67+/v7/r///u7urq7+///7+/vr6/v///6+/r///r//7r+/r6+vv//v//////////q7uru7ur///q7u7q7+///uru7u7u6///7u7u7u/7///v7u7u7r///q7u7q7u7//+7u+/v7+//AAAAAAAAAAD//v7+/v6qleqq//r7+6pvqqr/v7+/v/+qv7q6v7+6uqr+6ur+/urqqq+vrq6vr6qq//+6uv//qqr//+vr//+qqv7+rq7+/qr/////////qv/++uqqvqqqqq+//6pWW1qq/vvvv///qv+q//////6q/6r++uquvv6qv76qr6uqqqqWVaqq/6pVqv+/r/v+qlWq//////+/v6r+/v7+/v7+la+vlZWvr5Vu7upqaurqaqpVVb+/VVW/v7q5ubqqqan+qlZW/v5WVqqqqqqqqqqq//7+/v///+v/urq6////qv/r6+v///+q/q6urv7+/v6+vqqqvr6qqlhYWFhYWFhYAAAACiiggKoCAgKqAAACqv7+/q4urq6uVVVmZlVVZmZVVWVlqpuWlb+/v7+q//+q/v7+/r7u+qpq6upqaurqar9VVb+/VVW/qqqpqaqqqan+/lZW/v5WVuvr////6+vrqoCqqoCqqqqqAKqqAKqqqv7+/v7+/v7+WFhYWFhYWKiAgIODgIODgAICMjICMjICrq6urq6urq6qqqqqqqq6vlVVZmZVVVWqlZWVlZWVlZWAgICAj4+AgAoKCgrKygoKlZWVlZWqqqpqampqaqqqqr9VVVVVqqqqqqqpqamqqqr+/lZWVqqqqv//////qqqqgKqCgoKqqqoqKioqKqqqqv7+/v7+qqqqvr6qqqqqqqqoWFhYWKqqqoODgICAqqqqMjICAgKqqqqurq6uqqqqqr+/v7+/qqqqlZWVpamqqqqPj4CAgKqqqsrKCgoKqqqq+vr66umvr6qqampqWv7+q6r/6+vr/6r+qv/r6+v//+uq6urq6urq6lVVtb2+vr6+1XV9fb6+vr5XX354uru7u+qAAACq/7u7qgIKKqqqqqqvr76+vLyovO+//6oAAAAA+uqqqqqqqqrr6///6+vr/+rq6urq6urqvr6+vr66ooC+vr6+voKCALu7u7u7gIAA/7u7/7sAAAKqqqqqqiqurry8vLy8vKio6urq6urq7r6qv76+v7++vqr/vr7//76+qv6+vv7+vr6oqLy8vKqqqgAAAAAAqqqqqqqrr7+qqqr/93///6qqqv7+fv7+qqqqv7++vr+qqqr//76+/6qqqv7+vr7+qqqqrq6urq6qqqo="},{"a":32767,"b":"qQ=="}],"capture":{"phase_cycles_uncertain":0,"frame_cycles":19653,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":6,"colour_cells_changed_during_frame":0}},"title":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[96,171,96,171,0,0,0,0,0,0,0,0,0,0,198,242,128,27,0,0,0,0,198,0,87,114,241,0,2,0,0,128,240,240,241,242,240,240,240,241,242,240,240,240,240,240,240],"cia2":[194,255],"cpu":[47,53],"writes":[[40,15,53265,24],[40,21,53270,219],[45,28,53269,1],[46,38,53249,170],[46,42,53251,170],[239,11,53265,27],[239,44,53262,197],[240,21,53269,0],[240,33,53294,242],[242,8,53270,197],[242,38,53275,128],[244,7,53294,248],[246,9,53294,247],[248,11,53294,245],[250,13,53294,246],[251,7,53294,240],[251,28,53275,0]],"colour":"CQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":17216,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAfgAAfgAAfgAAPAAA"},{"a":21504,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQEBAQEFCQEBAQEBdXV1dXV1dXV1dXV1dXV1dXQAAAAAAAAAAAABDREVGR0hJSktMTU5PXl9gYWJjZGVmZ2hpamtsbW4AAAAAAAAAAAAAUFFSU1RVVldYWVpbXF5vcHFyc3R1dnd2eHl6e3x9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+fn5+fn5+f4CBfn5+fn5+fn4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAfn5+fn6Cg4SFhoeIiX5+fn5+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAH5+fn6Ki4yNjo+QkZKTlH5+fgAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+foKVkpaXmJmXmpucnZKefn4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAfn6fkqChopejpKWmp5Koqap+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAKusra6Xl5evsLGSsrO0tba3uAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5uru8vb6/ksDBwpeXw8SSxX4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAfn7Gp5KSx8jJl5eXl5fKkst+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAH5+zM2Szs/Q0dKXl9PUktXWfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+fn7X2JLZ2tvc3d6/kt/Wfn4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAfn5+fuDh4uOSkpLk5eZ+fn5+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAH5+fn5+fn5+5+jpfn5+fn5+fgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgPExQCFRMUBRITKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABASBRMTAAYxAA8SAAYzABQPAA=="},{"a":22520,"b":"DQ=="},{"a":22528,"b":"AAAAAAAAAAA="},{"a":22544,"b":"fGZmfGZmfAA="},{"a":22568,"b":"fmBgeGBgfgB+YGB4YGBgADxmYG5mZjwAZmZmfmZmZgA="},{"a":22648,"b":"PGZmZmZmPAB8ZmZ8YGBgAA=="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPAA="},{"a":22848,"b":"GBgYGAAAGBg="},{"a":22920,"b":"GBg4GBgYfgA="},{"a":22936,"b":"PGYGHAZmPAA="},{"a":23040,"b":"AAAAAAAAAAAAAAAAAAUVFQAAAAAAQABABRVVVFRUVFRUVRUFAAAAAAUBAQEBAQEBVFBQUFBQUFVVFRUVFRUVVEMPDz8/PHVVVURVURVVV198f39Pf//99AABBcXB1FFQVVVQQEBQVVVBUVERAAAAQFVVRQUFBQUFVVVFQUBAQEBUVFRUVBUVBRUFBQUFBVVUQUFBQUFBQQVVUFBQUFBQVFUUFRUVFRVVVH8/Pw8PA0B///3Fw////9dXX3/////8wMDAwMQFBQEFAQEBAQVVVVBQUFBQUEAABQUFBQUFBRVAQEBAQEBAUAAAAAAAAAAAFRUVFRUVFRVUVQUBAQEFVQUBQUFBQUEBVFBQUFBQUFBVFBQUFBQUFAEFFRUVBQUBVVVBAABAVFUFRUVEAAAAAFVVFRUVFRUVVFQUBAAAAABVFRUVFRUVFVVVBQEAAABUFQUFBQUFBQVVVUFAQEBBVQBAUFBQUFBABRVVVFQVFQVUVQUBAABQVFUFAQEBBVVVAUFBQUFBQQBQUFBQUFRVVRQUFBQUVFRQAAAAABAUFQUVBQUFBRVVVEBAQEBAQAAAFRUVFRUVFVUAAAAAAAAAQFQAAAABBVVVBQUFBQUFBRVVRUFBQEBAUABAQFBQVBQVAAAAAEBQVRVVFRUVFVVUUAAAAAAAAAAAAAAAAAAAAAEAAAAAABVVVQAAAAAARVVVAAAAAAAAAAIAAAEBBSWlpBVVVVVVVRVVVVVRVFVFUVVUUFpqqmpqWgAAoKqqqqqqAAAAAKiqqqoAAAAAAKCoqgAAAgIKKqqqCiqqqqqqqqmVlZWVVVVVVVVVRRUFBRVVVVVUUVBQUVVaWlZVVVVVVaqqqqqqakBAqqqqqqqqKgKqqqqqqqqqqoCgqqqqqqqqAAAAAICgqKgCCgoqKiqqqqmppaWFhYGhVVVVVVVVVVVVVVRVVVVVVVVVRRVVVVUVUFBQVUVFRRUAAAAAUFVVVSoKAgAAQFZWqqqqqioqqqoAgICgoKioqgIKCgoKCgoqqqqqqamlpZWhlFRVVVVVVVVVVRVVVVVVFRVVVVUVVVVVVFVVVVVVVhVVVVVWWmqqVVVaaqqqqqpqqqqqqqqqqqqqqqqqqIVVqqqqqqmlFVUAgJRUUFBgIAAABQEAAAUFAABAUFUVVVUqKioqKlpVVaqqqaWVlVVVVVVVVVVWaqpVVVYqqqqqqlqqqqqqqqqqqqqqqqqqqaWqqqqppVVVVamlVVVQVVRUVVVVVRUVVVRUVVVVVVUVVlVVWKhoVFSoQEAAAAAAAAAAAAABAQAAAFUVBVVVAQAAVVVVVVVVKSlVVVVVVlpqalVQQICAgoqqFVUVCiqqqqpaaqqqqqqqqqqqqqqqqqqpqqqqqqmlVVWqqaVVVVVVVVRVVVVVVVVVUQVVVVVWVlaoqKioqKioqCkqCgoKCgoKqqqqqqqpoYCqqqmlVVVVVaVVVVVVVVVVVlZaWlpqaqqooKCgoKCAgAICAgAAAAAAqqqqqqqqKiqqqKCAoKCoqgAAAAEBBRUVFUVRVFVVVVVVVVVVBVBVVVVVVVVVVQBVVVVVVVVVVVZVVVZaaqqqqqqqqqqoqKCggIAAAAAAAAAKCgIAAAAAAKqqqqqqKgoClaWpqqqqqqpVVVWVqaqqqlVVVVVVpaqqVVVVVVVVqqpVVVVVVWqqqlVVVVqqqqqqqqqqqKiggAACAAAAAAAAAKoqCgIAAAAAqqqqqqoqAACqqqqqqqqqCqqqqqqqqqiAqqqqqqiAAACooIAAAAAAACoAAAAAAAAAqgAAAAAAAACgAAAAAAAAAA=="},{"a":32767,"b":"qQ=="}],"capture":{"phase_cycles_uncertain":0,"frame_cycles":19657,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":5,"colour_cells_changed_during_frame":0}},"vehicle":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,27,0,53,0,255,215,0,87,122,241,0,3,0,0,128,240,248,241,242,240,240,240,240,240,240,240,240,240,240,240],"cia2":[194,255],"cpu":[47,53],"writes":[[210,31,53262,0],[210,43,53260,0],[210,55,53258,0],[211,4,53256,0],[211,59,53254,0],[212,8,53252,0],[212,20,53250,0],[212,32,53248,0],[236,59,53281,240],[237,37,53262,72],[238,13,53269,128],[238,19,53263,242],[238,25,53294,242],[238,31,22527,59],[242,7,53270,192],[242,37,53275,128],[244,16,53294,248],[246,14,53294,247],[248,12,53294,245],[250,17,53294,246],[251,16,53294,240],[251,37,53275,0],[251,49,53269,255],[251,59,53270,215],[252,27,53262,1],[252,36,53263,0],[252,45,22527,0],[253,27,53260,1],[254,27,53258,1],[255,27,53256,1],[256,27,53254,1],[257,41,53252,1],[258,55,53250,1],[260,24,53248,1],[261,27,53281,248]],"colour":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16384,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":20160,"b":"///////////+///+///8///8///4///4AAAAAAAA"},{"a":21504,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCA8TFAIVExQJDgcAFgUICQMMBQATBQwFAxQJDw46AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADEuAAMPDRABAxQ6AAAAAAAAAAAAAAAAAAAAACQyMDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMi4AMTk2MwAIBQESEwU6AAAAAAAAAAAAAAAAJDQ4MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzLgATFAEUCQ8OABcBBw8OOgAAAAAAAAAAAAAkNjAwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQuAAgJBwgtEAUSBg8SDQEOAwU6AAAAAAAAJDE1MDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZDxUACAEWBQAkMTAwMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABASBRMTABMQAQMFAAIBEgAUDwAWCQUXAAMBEgAPEBQJDw4TLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBIFExMAMSwyLDMADxIANAAUDwAQFRIDCAETBQADARIuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEgUTEwASBRQVEg4AAQYUBRIAGQ8VAAMIDw8TBS4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHDwABCAUBBDoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"AAAAAAAAAAAAAAAAAAAAABg8Zn5mZmYAfGZmfGZmfAA8ZmBgYGY8AHhsZmZmbHgAfmBgeGBgfgB+YGB4YGBgADxmYG5mZjwAZmZmfmZmZgA8GBgYGBg8AA=="},{"a":22624,"b":"YGBgYGBgfgBjd39rY2NjAGZ2fn5uZmYAPGZmZmZmPAB8ZmZ8YGBgAA=="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPABmZmZmZjwYAGNjY2t/d2MA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22880,"b":"AAAAAAAYGDAAAAB+AAAAAAAAAAAAGBgA"},{"a":22912,"b":"PGZmZmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAA="},{"a":22976,"b":"PGZmPGZmPAA8ZmY+BmY8AAAAGAAAGAAA"},{"a":32767,"b":"qQ=="}],"capture":{"phase_cycles_uncertain":0,"frame_cycles":19655,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":3,"colour_cells_changed_during_frame":0}},"shop":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[81,146,33,146,33,146,41,82,41,114,41,146,41,171,41,194,0,27,0,209,0,255,215,0,87,126,241,0,255,6,63,191,240,248,241,246,240,241,240,247,247,247,240,242,240,240,240],"cia2":[194,255],"cpu":[47,53],"writes":[[213,20,53262,0],[213,32,53260,0],[213,44,53258,0],[213,56,53256,0],[214,5,53254,0],[214,22,53252,0],[214,34,53250,0],[214,46,53248,0],[236,57,53281,240],[236,61,53287,240],[237,2,53288,240],[237,35,53262,72],[238,11,53269,128],[238,17,53263,242],[238,23,53294,242],[238,29,22527,59],[242,12,53270,192],[242,29,53276,127],[242,42,53275,128],[244,14,53294,248],[246,12,53294,247],[248,17,53294,245],[250,15,53294,246],[251,14,53294,240],[251,27,53276,255],[251,35,53275,0],[251,47,53269,255],[251,57,53270,215],[252,25,53262,41],[252,34,53263,194],[252,43,22527,0],[253,25,53260,41],[254,25,53258,41],[255,25,53256,41],[256,25,53254,41],[257,25,53252,33],[258,25,53250,33],[258,54,53288,247],[259,25,53248,81],[259,54,53287,247],[260,14,53281,248]],"colour":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAgICAgICAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAgICAgICAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAgICAgICAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICAgICAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16384,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":16448,"b":"AAAAAAAAAAAAAAAAAABQAwBQAwPwAwDwAwDwAwAwMwDwMw/8MzrrPzvrM+urM6qrP6qrM66sM/f3MDc38AwM"},{"a":16576,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////"},{"a":19968,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AD//wD9fwPVV8N//8Pd3cP//8AAAA"},{"a":20160,"b":"///////////+///+///8///8///4///4AAAAAAAA"},{"a":21504,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtLQMSBQQJFC0tAAAAAAADARAUFRIFAAURFQkQDQUOFDoAAAAAAAAAAAAAACQyNTAwAAAAAAAALS0tLS0tLS0tLS0tLS0tLS0tLS0tAAAAAC0tLS0tLS0tLS0AAAAAAAcIDxMUAAIBCRQAAAAAAAAAAAAAAAAAAAAAAAAAACQ0MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQYHCAkKCwwNDg8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBUWFxgZGhscHR4fEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQlJicoKSorLC0uLyAAAAAAAAAAAAAAAUEgEQEwAtEgURFQkSBQQtAABTY3ODk6Ozw9PjAAAkNjAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEVGR0hJSktMTU5PQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARVVldYWVpbXF1eX1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEZWZnaGlqa2xtbm9gAAAAAAAAAAAAAABwgPExQAFgEDFRUNAAAAAAAAV2d3h5ent8fX5wAAJDUwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASFhoeIiYqLjI2Oj4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAElZaXmJmam5ydnp+QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABKWmp6ipqqusra6voAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFtre4ubq7vL2+sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAExcbHyMnKy8zNzs/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABNXW19jZ2tvc3d7f0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF5ufo6err7O3u4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE9fb3+Pn6+/z9/v/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUTBQAKDxkTFAkDCwAUDwADDw4UEg8MAAYPEgsMCQYULgAAAAAAAAAUGRAFOgAxLTMABg8SAA0PEgUAAwgPCQMFEywABQAUDwAFDgQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"AQMDADgAAAAAAAAAAAAAABg8Zn5mZmYAfGZmfGZmfAA8ZmBgYGY8AHhsZmZmbHgAfmBgeGBgfgB+YGB4YGBgADxmYG5mZjwAZmZmfmZmZgA8GBgYGBg8AB4MDAwMbDgAZmx4cHhsZgBgYGBgYGB+AGN3f2tjY2MAZnZ+fm5mZgA8ZmZmZmY8AHxmZnxgYGAAPGZmZmY8DgB8ZmZ8eGxmADxmYDwGZjwAfhgYGBgYGABmZmZmZmY8AGZmZmZmPBgA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22880,"b":"AAAAAAAYGDAAAAB+AAAAAAAAAAAAGBgA"},{"a":22912,"b":"PGZmZmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAA="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23048,"b":"AAAAAAAAAAAAAAAAAAAAAA=="},{"a":23072,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":23104,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":23136,"b":"AAAAAAAAAAAAAAAAAAAAAA=="},{"a":23160,"b":"AAAAAAAAAAAAAAAADz019dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dX19TU9DQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NPTX11dXV1dXV1dXV1dXV1dXV1dXX193d3d3d3dfX9fX1NTU1NTU1NTU1NTU1DQ0PAwAAAAD8V1VVVVVVVVVVVVVVVVVVVVVXV1dXV1dXXV1dXV1dXV1dXV1dXV1dXV1dVVVVVVVdX19fX19fX19fX11VV19fX19fX19fX1dVXV9fX19fX19fX19fV1VdX19fX19fX19f39/d1dXVX3fd99/V19fXdV/X19fX19ff3PzwAAAAAADA/31fV1ddXV1ddXV11dXV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXf////39fV1VVV93d3d3d3d1dXdXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV1dV1XVVf/33ff91fX19dd9VVVVdX/3/U/AwAAADw819dXdf9VVVVVVVVVX19VVVVXV1dVVVVVVVVVVVVVVVVVVVVVVVVVVf//////////Vf9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dXV1dVVf9V//////////9VVVVVVVVVVVX//1X/AAAAAAA//1V//1VVVVVVVVVVVdXV9XXd/ff//X9/X1VVVVVVVVVVVVVVVVVV//////////9V/1VWWmpqampqampaVlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX//91X/d/3/d/3/d/1pV/1X//////////1VVVVVVVV1XVf//f/8/AAAAAPz/Vf3/VVVVVVVVVVVVVVVVVVVVVVXV1XV/f39/XVVVVVVVVVVVVVX//////////1X/VZWlqampqampqaWVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1/39X/93//93//93/pVX/Vf//////////VVVVVVVVddVV///9//wAADw819fVXf9VVVVVVVVVVVVVVVVVVVVVVVVVVVXV9fXVVVVVVVVVVVVVVf//////////Vf9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dXV1dVVVf9V//////////9VVVVVVVVVVVX//1X/AAAAAAAAA/999dXVdXV1dV1dXVdXV1dVVVVVVVVVVVVVVVVVVVVVVVVVVVVV1f3////99dVVVdV3d3d3d3d3dXVXV1dXV1dXV1dXV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXV111VXV9f39/f391VVdV1dVVVVX//df/MAAAAAAAD/VVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVXX19fX19fX19fX1dVXV9fX19fX19fX11VV19fX19fX19fX19fXVVXX19fX19fX19fX19XVVVVVVVVVVVVVVVVVVVdfX19fX1/c3Pw8AAAAA8HxcX1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dfX1x8cHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwfFxfV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXX19fXFxcXFxcXFxcXFxccHDwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="},{"a":24480,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":24512,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":24544,"b":"AAAAAAAAAAAAAAAAAAAAAA=="},{"a":24568,"b":"AAAAAAAAAAA="},{"a":32767,"b":"qQ=="}],"capture":{"phase_cycles_uncertain":1,"frame_cycles":19657,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":3,"colour_cells_changed_during_frame":0}},"drive":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"the kit machine (work/port/game/simframe.js), from s-drive.json","vic":[1,0,1,0,5,135,5,135,109,250,219,123,219,250,109,123,12,27,184,0,0,255,16,240,86,0,1,240,248,0,0,0,0,12,1,6,0,0,0,0,0,3,2,1,1,1,1],"cia2":[2,63],"cpu":[47,53],"writes":[[223,47,53285,6],[223,51,53292,6],[223,55,53293,6],[223,59,53287,6],[223,63,53281,6],[224,4,53288,6],[224,8,53290,6],[224,12,53291,6],[224,16,53270,16],[224,25,53262,0],[224,37,53260,0],[224,49,53258,0],[224,61,53256,0],[225,10,53254,0],[225,22,53252,0],[225,34,53250,0],[225,46,53248,0],[225,56,53264,0],[236,56,53281,0],[236,60,53287,0],[237,1,53288,0],[237,34,53262,72],[237,59,53264,0],[238,10,53269,128],[238,16,53263,242],[238,22,53294,2],[242,11,53270,0],[242,15,53265,27],[242,28,53276,120],[242,41,53275,240],[244,9,53294,8],[245,10,53294,8],[246,11,53294,7],[247,12,53294,7],[248,13,53294,5],[249,7,53294,5],[250,8,53294,6],[251,9,53294,0],[251,22,53276,248],[251,30,53275,240],[251,42,53269,255],[251,52,53270,23],[252,15,53262,109],[252,24,53263,3],[252,44,53294,1],[253,10,53260,219],[253,19,53261,130],[253,39,53293,1],[254,5,53258,219],[254,14,53259,3],[254,34,53292,1],[254,63,53256,109],[255,9,53257,130],[255,29,53291,1],[255,58,53254,5],[256,4,53255,135],[256,24,53290,2],[256,53,53252,5],[256,62,53253,135],[257,19,53289,1],[257,48,53250,1],[257,57,53251,0],[258,14,53288,0],[258,43,53248,1],[258,52,53249,0],[259,9,53287,0],[259,20,53264,12],[259,27,53281,12],[259,34,53285,0],[259,41,53286,0],[262,60,53273,129],[263,3,53266,184],[263,13,53265,27],[264,3,53265,27],[264,7,53280,0],[264,49,53270,16],[265,37,53289,14],[298,1,53276,248]],"colour":"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16384,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":16640,"b":"AAQAADgAAHAAAPgAAawAAfwAA94AA94AAfgAB/AAj8CA/wPwYA+8AH/eAH/AAH/AAf+AAf8AAAAAAAAAAAAA"},{"a":16704,"b":"AAAAAAAAAKoAAqqACqqgKlWoKVVopVWqpVaqpVqapWpapalapqVaqpVaqlVaqVVqKVVoKlWoCqqgAqqAAKoA"},{"a":17152,"b":"AKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoAAKoA"},{"a":21504,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAUGBwgJCgsMDQ4PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQVFhcYGRobHB0eHxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEJSYnKCkqKywtLi8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDU2Nzg5Ojs8PT4/MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARFRkdISUpLTE1OT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEVVZXWFlaW1xdXl9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGVmZ2hpamtsbW5vYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAR1dnd4eXp7fH1+f3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEhYaHiImKi4yNjo+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJWWl5iZmpucnZ6fkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASlpqeoqaqrrK2ur6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEtba3uLm6u7y9vr+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMXGx8jJysvMzc7PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATV1tfY2drb3N3e39AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE5ebn6Onq6+zt7u/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPX29/j5+vv8/f7/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCRQZJxMAEAsABQ4FEgcZOgAAMDEyAAAAAAAAAAAAJDI1MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"AAAEBQ=="},{"a":22525,"b":"DA=="},{"a":22527,"b":"DAAAAAAAAAAA"},{"a":22552,"b":"PGZgYGBmPAA="},{"a":22568,"b":"fmBgeGBgfgA="},{"a":22584,"b":"PGZgbmZmPAA="},{"a":22600,"b":"PBgYGBgYPAA="},{"a":22616,"b":"Zmx4cHhsZgA="},{"a":22640,"b":"ZnZ+fm5mZgA="},{"a":22656,"b":"fGZmfGBgYAA="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22840,"b":"DAwYAAAAAAA="},{"a":22912,"b":"PGZmZmZmPAAYGDgYGBh+ADxmBgwwYH4A"},{"a":22952,"b":"fmB8BgZmPAA="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23040,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADz019dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dX19TU9DQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NPTX11dXV1dXV1dXV1dXV1dXV1dXX193d3d3d3dfX9fX1NTU1NTU1NTU1NTU1DQ0PAwAAAAD8V1VVVVVVVVVVVVVVVVVVVVVXV1dXV1dXXV1dXV1dXV1dXV1dXV1dXV1dVVVVVVVdX19fX19fX19fX11VV19fX19fX19fX1dVXV9fX19fX19fX19fV1VdX19fX19fX19f39/d1dXVX3fd99/V19fXdV/X19fX19ff3PzwAAAAAADA/31fV1ddXV1ddXV11dXV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXf////39fV1VVV93d3d3d3d1dXdXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV1dV1XVVf/33ff91fX19dd9VVVVdX/3/U/AwAAADw819dXdf9VVVVVVVVVX19VVVVXV1dVVVVVVVVVVVVVVVVVVVVVVVVVVf//////////Vf9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dXV1dVVf9V//////////9VVVVVVVVVVVX//1X/AAAAAAA//1V//1VVVVVVVVVVVdXV9XXd/ff//X9/X1VVVVVVVVVVVVVVVVVV//////////9V/1VWWmpqampqampaVlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX//91X/d/3/d/3/d/1pV/1X//////////1VVVVVVVV1XVf//f/8/AAAAAPz/Vf3/VVVVVVVVVVVVVVVVVVVVVVXV1XV/f39/XVVVVVVVVVVVVVX//////////1X/VZWlqampqampqaWVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1/39X/93//93//93/pVX/Vf//////////VVVVVVVVddVV///9//wAADw819fVXf9VVVVVVVVVVVVVVVVVVVVVVVVVVVXV9fXVVVVVVVVVVVVVVf//////////Vf9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dXV1dVVVf9V//////////9VVVVVVVVVVVX//1X/AAAAAAAAA/999dXVdXV1dV1dXVdXV1dVVVVVVVVVVVVVVVVVVVVVVVVVVVVV1f3////99dVVVdV3d3d3d3d3dXVXV1dXV1dXV1dXV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXV111VXV9f39/f391VVdV1dVVVVX//df/MAAAAAAAD/VVVVVVVVVVVVVVVVVVVVVVdXV1dXV1dV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVXX19fX19fX19fX1dVXV9fX19fX19fX11VV19fX19fX19fX19fXVVXX19fX19fX19fX19XVVVVVVVVVVVVVVVVVVVdfX19fX1/c3Pw8AAAAA8HxcX1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dfX1x8cHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwfFxfV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXX19fXFxcXFxcXFxcXFxccHDwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":32767,"b":"qQ=="}],"capture":{"source":"simulator"}},"beams":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"the kit machine (work/port/game/simframe.js), from agent5-beams.json","vic":[145,158,205,158,127,118,187,118,187,60,161,199,221,199,13,200,128,27,184,0,0,255,23,15,86,0,1,16,239,0,0,0,0,12,0,11,0,0,1,2,2,2,2,19,7,7,2],"cia2":[2,63],"cpu":[47,53],"writes":[[223,45,53285,6],[223,49,53292,6],[223,53,53293,6],[223,57,53287,6],[223,61,53281,6],[224,2,53288,6],[224,6,53290,6],[224,10,53291,6],[224,14,53270,16],[224,23,53262,0],[224,35,53260,0],[224,47,53258,0],[224,59,53256,0],[225,8,53254,0],[225,20,53252,0],[225,32,53250,0],[225,44,53248,0],[225,54,53264,0],[236,61,53281,0],[237,2,53287,0],[237,6,53288,0],[237,39,53262,72],[238,1,53264,0],[238,15,53269,128],[238,21,53263,242],[238,27,53294,2],[242,9,53270,0],[242,13,53265,27],[242,26,53276,111],[242,39,53275,144],[244,7,53294,8],[245,8,53294,8],[246,9,53294,7],[247,10,53294,7],[248,11,53294,5],[249,12,53294,5],[250,13,53294,6],[251,7,53294,0],[251,20,53276,239],[251,28,53275,16],[251,40,53269,255],[251,50,53270,23],[252,13,53262,13],[252,22,53263,200],[252,42,53294,2],[253,8,53260,221],[253,17,53261,199],[253,37,53293,7],[254,3,53258,161],[254,12,53259,199],[254,32,53292,7],[254,61,53256,185],[255,7,53257,59],[255,27,53291,19],[255,56,53254,187],[256,2,53255,118],[256,22,53290,40],[256,51,53252,127],[256,60,53253,118],[257,17,53289,40],[257,46,53250,205],[257,55,53251,158],[258,12,53288,40],[258,41,53248,145],[258,50,53249,158],[259,7,53287,40],[259,18,53264,128],[259,25,53281,12],[259,32,53285,0],[259,39,53286,1],[262,58,53273,129],[263,1,53266,184],[263,11,53265,27],[264,1,53265,27],[264,5,53280,0],[297,20,53275,16],[309,41,53271,15]],"colour":"Dg4ODggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDg4ODg4ODg4ICAgICQkJCQgICQkJCQgICQkJCQgICQkJCQgICAgICA4ODg4ODg4OCAgICAkJCQkICAkJCQkICAkJCQkICAkJCQkICAgICAgODg4ODg4ODggICAgICQkICAgICQkICAgICQkICAgICQkICAgICAgIDg4ICA4ODg4ICAgICAkJCAgICAkJCAgICAkJCAgICAkJCAgICAgICAgICAgNDQ4OCAgICAgJCQgICAgJCQgICAgJCQgICAgJCQgICAgICAgICAgIDQ0ICAgICAgICQkICAgICQkICAgICQkICAgICQkICAgICAgICAgICA0NCAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgNDQgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICAgICAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICAgICAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICA0NCAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkJCQkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQkJCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQkJCQgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":17088,"b":"ADwAAH4AAL0AAJkAAf+AASSAAwDAB8PwD+f4Hf/cMf/GY//GM/+GGP+GD38GBX4KAPwGAHgAAAAAAAAAAAAA"},{"a":17856,"b":"AAAABAUABA0ABA0QBANUAQIVAQkVARpVAXkVAVkVAHVVAAoUAAoAAAgAAAgAAAgAAAgAAAgAAAgAAAwAABQA"},{"a":19904,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAFUAAFFAAUFAAUBQBQBVVQF//UHVVUF3d0FVVUAAAA"},{"a":20352,"b":"AAAAPAAALwAACwAAC8AAAsAAAvAAALAAALwAACwAAC8AAAsAAAvAAALAAALwAACwAACwAAA8AAAsAAAMAAAM"},{"a":21504,"b":"TExMTE1OTU5NTk1OTU5NTk1OTU5NTk1OTU5NTk1OTU5NTk1OTExMTExMTExNTk1OZmZnZ01OZmZnZ01OZmZnZ01OZmZnZ01OTU5NTkxMTExMTExMTU5NTmhpamtNTmhpamtNTmhpamtNTmhpamtNTk1OTU5MTExMTExMTE1OTU5sbW5vTU5sbW5vTU5sbW5vTU5sbW5vTU5NTk1OUFFNTkxMTExNTk1OcHFyc01OcHFyc01OcHFyc01OcHFyc01OTU5NTlJSTU5TVFVWTU5NTnR1dndNTnR1dndNTnR1dndNTnR1dndNTk1OTU5SUk1OU1dSUk1OTU5PT09PTU5PT09PTU5PT09PTU5PT09PTU5NTk1OUlJNTlNUUlJNTk1Oe3x9fH5+fn5+fn5+fn5+fn5+fH18fE1OTU5NTlJSTU5TVFJSTU5NTn+AgYGCenp6enp6enp6enp6goCBgIFNTk1OTU5SUk1OT09SUk1OTU6DgYCBgoGEhYaHiImHiouMgYKBgIGBTU5NTk1OUlJNTk9PUlJNTk1Of4CBgYJ8jXp6eo6Cenp6j3yCgIGAgU1OTU5NTlJSTU5PT1JSTU5NToOBgIGCfJB6enqOgnp6eo58goGAgYFNTk1OTU5SUk1OT09SUk1OTU5/gIGBgnyQenp6joJ6enqOfIKAgYCBTU5NTk1OUlJNTk9PUlJNTk1Og4GAgYJ8kHp6eo6Cenp6jnyCgYCBgU1OTU5NTlJSTU5PT1JSTU5NTn+AgYGCfJB6enqOgnp6eo58goCBgIFNTk1OTU5SUlhOT09SUk1OTU6DgYCBgnyQenp6joJ6enqOfIKBgIGBTU5NTk1OUlJYTlNUWVpNTk1Of4CBgYJ8kZKSkpOUlZaXmHyCgIGAgU1OTU5NTltcWE5PT09PT09dXk9PT09PT09PXV5PT09PT09PT11eT09PT09PXV5PT09PT09PT11eT09PT09PT09dXk9PT09PT09PXV5PT09PT09dXkBBQkNPT19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19ERUZHX19PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSElKS09PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCRQZJxMAEAsABQ4FEgcZOgAAMDM2AAAAAAAAAAAAJDI1MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"Pj4+PgsXFzcAAAAAAAAAAA=="},{"a":22552,"b":"PGZgYGBmPAA="},{"a":22568,"b":"fmBgeGBgfgA="},{"a":22584,"b":"PGZgbmZmPAA="},{"a":22600,"b":"PBgYGBgYPAA="},{"a":22616,"b":"Zmx4cHhsZgA="},{"a":22640,"b":"ZnZ+fm5mZgA="},{"a":22656,"b":"fGZmfGBgYAA="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22840,"b":"DAwYAAAAAAA="},{"a":22912,"b":"PGZmZmZmPAA="},{"a":22928,"b":"PGYGDDBgfgA8ZgYcBmY8AA=="},{"a":22952,"b":"fmB8BgZmPAA8ZmB8ZmY8AA=="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23040,"b":"AAAAAAC//zUAAAAAAP//VQMFFRVVVdX//39/fXX11dUFv/+/PyoKP1X/////qqr/V/X///+qqv/V/1X//6qq/39/fxcBAAAA99/d1VEBAAD/VVV9fVVVFN/3d3dAQAAA//////////////8A8/PzAM/PzwD///8AAAAAAAAAAAD////1VVVVVf/1VVVVVVVVVVVVVVVVVVX+8/so+PsvDLz8+OD8Pi8P/19VVVVVVVX///9fVVVVVbz8+OA8Pi8P////APz8/ABVVVVVVVqqAFVVVVqqqqoAVVVVpaqqqgBVVVVVVaWqAAAAAAABBBBAAQQQQAAAAACqqqoAAAAAAA=="},{"a":23344,"b":"//9V/93dVf///1X/d3dV/1VVX19fX19dVVX9/f3dZa1VVX9/f3dZelVV9fX19fV1VVRQUFJSVVWtvb29vf1VVXp+fn5+f1VVVRUFBYWFVVVSUlJSUlJSUv39/f39/f39f39/f39/f3+FhYWFhYWFhVJSUlJSUlVV/f39/f39VVV/f39/f39VVYWFhYWFhVVV"},{"a":23504,"b":"AAAAAAAAAACpqampqampqaqqqqqqqqqqqampqampqamqqqqqqqqqVZWqqqqqqqqqVampqampqalVqqqqqqqqqlVVVVVVVVVVlampqampqalVqqqqqqqqqVWqqqqqqqVUVaqqqqqlUABVqqqqqlUAAFWqqqpVAQEBVaqqqlVVVVVVqqqqqloFAFWqqqqqqloVVaqqqqqqqmqlkEBAQEBAQAEBAQEBAQEBWgYBAQEBAQFAQEBAQEBAQEBAQEBAQGpqAAAAAAAAqqoBAQICAgKqqlVVqqqqqqqqAACAqqqqqqoAAAAAqKqqqgAAAAAAoKqqAQEBAQEBgak="},{"a":32767,"b":"qQ=="}],"capture":{"source":"simulator"}},"bust":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"the kit machine (work/port/game/simframe.js), from s-bust.json","vic":[1,0,1,0,1,0,1,0,171,59,25,199,81,199,13,192,224,27,184,0,0,255,23,0,86,0,1,16,239,0,0,0,0,12,0,11,0,0,1,2,2,2,2,19,7,7,2],"cia2":[2,63],"cpu":[47,53],"writes":[[2,25,53275,16],[223,45,53285,6],[223,49,53292,6],[223,53,53293,6],[223,57,53287,6],[223,61,53281,6],[224,2,53288,6],[224,6,53290,6],[224,10,53291,6],[224,14,53270,16],[224,23,53262,0],[224,35,53260,0],[224,47,53258,0],[224,59,53256,0],[225,8,53254,0],[225,20,53252,0],[225,32,53250,0],[225,44,53248,0],[225,54,53264,0],[236,61,53281,0],[237,2,53287,0],[237,6,53288,0],[237,39,53262,72],[238,1,53264,0],[238,15,53269,128],[238,21,53263,242],[238,27,53294,2],[242,9,53270,0],[242,13,53265,27],[242,26,53276,111],[242,39,53275,144],[244,7,53294,8],[245,8,53294,8],[246,9,53294,7],[247,10,53294,7],[248,11,53294,5],[249,12,53294,5],[250,13,53294,6],[251,7,53294,0],[251,20,53276,239],[251,28,53275,16],[251,40,53269,255],[251,50,53270,23],[252,13,53262,13],[252,22,53263,192],[252,42,53294,2],[253,8,53260,81],[253,17,53261,199],[253,37,53293,7],[254,3,53258,25],[254,12,53259,199],[254,32,53292,7],[254,61,53256,173],[255,7,53257,58],[255,27,53291,19],[255,56,53254,1],[256,2,53255,0],[256,22,53290,2],[256,51,53252,1],[256,60,53253,0],[257,17,53289,2],[257,46,53250,1],[257,55,53251,0],[258,12,53288,2],[258,41,53248,1],[258,50,53249,0],[259,7,53287,2],[259,18,53264,224],[259,25,53281,12],[259,32,53285,0],[259,39,53286,1],[262,58,53273,129],[263,1,53266,184],[263,11,53265,27],[264,1,53265,27],[264,5,53280,0],[309,17,53275,16]],"colour":"Dg4ODggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDg4ODg4ODg4ICAgICQkJCQgICQkJCQgICQkJCQgICQkJCQgICAgICA4ODg4ODg4OCAgICAkJCQkICAkJCQkICAkJCQkICAkJCQkICAgICAgODg4ODg4ODggICAgICQkICAgICQkICAgICQkICAgICQkICAgICAgIDg4ICA4ODg4ICAgICAkJCAgICAkJCAgICAkJCAgICAkJCAgICAgICAgICAgNDQ4OCAgICAgJCQgICAgJCQgICAgJCQgICAgJCQgICAgICAgICAgIDQ0ICAgICAgICQkICAgICQkICAgICQkICAgICQkICAgICAgICAgICA0NCAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgNDQgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICAgICAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICAgICAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAgICAgICAgICA0NCAgICAgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkJCQkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQkJCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQkJCQgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":17024,"b":"ADwAAH4AAL0AAJkAAf+AASSAAwDAD8PgH+fwO/+4Y/+MY//GYf/MYf8YYP7wUH6gYD8AAB4AAAAAAAAAAAAA"},{"a":17280,"b":"AAAAAFAAAHAABHAAFcAAVIAAVGMAVaIAVGoAVGgAVVAAFKAAAKAAACAAACAAACAAACAAACAAACAAADAAABQA"},{"a":17344,"b":"AAAAAAUAAA0AAA0QAANUAAIVAMkVAIpVAKkVACkVAAVVAAoUAAoAAAgAAAgAAAgAAAgAAAgAAAgAAAwAABQA"},{"a":17984,"b":"AAAAAAA8AAD4AAPgAAMgAA+AAAyAAA4AAA8AAAsAAAsAAC8AACwAALwAA/AADwAADgAAPAAAOAAAMAAAMAAA"},{"a":19904,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAFUAAFFAAUFAAUBQBQBVVQF//UHVVUF3d0FVVUAAAA"},{"a":21504,"b":"TExMTE1OTU5NTk1OTU5NTk1OTU5NTk1OTU5NTk1OTU5NTk1OTExMTExMTExNTk1OZmZnZ01OZmZnZ01OZmZnZ01OZmZnZ01OTU5NTkxMTExMTExMTU5NTmhpamtNTmhpamtNTmhpamtNTmhpamtNTk1OTU5MTExMTExMTE1OTU5sbW5vTU5sbW5vTU5sbW5vTU5sbW5vTU5NTk1OUFFNTkxMTExNTk1OcHFyc01OcHFyc01OcHFyc01OcHFyc01OTU5NTlJSTU5TVFVWTU5NTnR1dndNTnR1dndNTnR1dndNTnR1dndNTk1OTU5SUk1OU1dSUk1OTU5PT09PTU5PT09PTU5PT09PTU5PT09PTU5NTk1OUlJNTlNUUlJNTk1Oe3x9fH5+fn5+fn5+fn5+fn5+fH18fE1OTU5NTlJSTU5TVFJSTU5NTn+AgYGCenp6enp6enp6enp6goCBgIFNTk1OTU5SUk1OT09SUk1OTU6DgYCBgoGEhYaHiImHiouMgYKBgIGBTU5NTk1OUlJNTk9PUlJNTk1Of4CBgYJ8jXp6eo6Cenp6j3yCgIGAgU1OTU5NTlJSTU5PT1JSTU5NToOBgIGCfJB6enqOgnp6eo58goGAgYFNTk1OTU5SUk1OT09SUk1OTU5/gIGBgnyQenp6joJ6enqOfIKAgYCBTU5NTk1OUlJNTk9PUlJNTk1Og4GAgYJ8kHp6eo6Cenp6jnyCgYCBgU1OTU5NTlJSTU5PT1JSTU5NTn+AgYGCfJB6enqOgnp6eo58goCBgIFNTk1OTU5SUlhOT09SUk1OTU6DgYCBgnyQenp6joJ6enqOfIKBgIGBTU5NTk1OUlJYTlNUWVpNTk1Of4CBgYJ8kZKSkpOUlZaXmHyCgIGAgU1OTU5NTltcWE5PT09PT09dXk9PT09PT09PXV5PT09PT09PT11eT09PT09PXV5PT09PT09PT11eT09PT09PT09dXk9PT09PT09PXV5PT09PT09dXkBBQkNPT19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19ERUZHX19PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSElKS09PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCRQZJxMAEAsABQ4FEgcZOgAAMDMwAAAAAAAAAAAAJDI1MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"GRkZGQoPDjcAAAAAAAAAAA=="},{"a":22552,"b":"PGZgYGBmPAA="},{"a":22568,"b":"fmBgeGBgfgA="},{"a":22584,"b":"PGZgbmZmPAA="},{"a":22600,"b":"PBgYGBgYPAA="},{"a":22616,"b":"Zmx4cHhsZgA="},{"a":22640,"b":"ZnZ+fm5mZgA="},{"a":22656,"b":"fGZmfGBgYAA="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22840,"b":"DAwYAAAAAAA="},{"a":22912,"b":"PGZmZmZmPAA="},{"a":22928,"b":"PGYGDDBgfgA8ZgYcBmY8AA=="},{"a":22952,"b":"fmB8BgZmPAA="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23040,"b":"AAAAAAC//zUAAAAAAP//VQMFFRVVVdX//39/fXX11dUFv/+/PyoKP1X/////qqr/V/X///+qqv/V/1X//6qq/39/fxcBAAAA99/d1VEBAAD/VVV9fVVVFN/3d3dAQAAA//////////////8A8/PzAM/PzwD///8AAAAAAAAAAAD////1VVVVVf/1VVVVVVVVVVVVVVVVVVX+8/so+PsvDLz8+OD8Pi8P/19VVVVVVVX///9fVVVVVbz8+OA8Pi8P////APz8/ABVVVVVVVqqAFVVVVqqqqoAVVVVpaqqqgBVVVVVVaWqAAAAAAABBBBAAQQQQAAAAACqqqoAAAAAAA=="},{"a":23344,"b":"//9V/93dVf///1X/d3dV/1VVX19fX19dVVX9/f3dZa1VVX9/f3dZelVV9fX19fV1VVRQUFJSVVWtvb29vf1VVXp+fn5+f1VVVRUFBYWFVVVSUlJSUlJSUv39/f39/f39f39/f39/f3+FhYWFhYWFhVJSUlJSUlVV/f39/f39VVV/f39/f39VVYWFhYWFhVVV"},{"a":23504,"b":"AAAAAAAAAACpqampqampqaqqqqqqqqqqqampqampqamqqqqqqqqqVZWqqqqqqqqqVampqampqalVqqqqqqqqqlVVVVVVVVVVlampqampqalVqqqqqqqqqVWqqqqqqqVUVaqqqqqlUABVqqqqqlUAAFWqqqpVAQEBVaqqqlVVVVVVqqqqqloFAFWqqqqqqloVVaqqqqqqqmqlkEBAQEBAQAEBAQEBAQEBWgYBAQEBAQFAQEBAQEBAQEBAQEBAQGpqAAAAAAAAqqoBAQICAgKqqlVVqqqqqqqqAACAqqqqqqoAAAAAqKqqqgAAAAAAoKqqAQEBAQEBgak="},{"a":32767,"b":"qQ=="}],"capture":{"source":"simulator"}},"zuul":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"the kit machine (work/port/game/simframe.js), from agent5-zuul.json","vic":[129,108,129,150,177,108,177,150,1,0,193,192,1,0,1,0,0,27,184,0,0,255,23,15,86,0,1,0,240,15,0,0,0,12,0,11,0,0,1,1,1,1,1,0,7,0,0],"cia2":[2,63],"cpu":[47,53],"writes":[[223,47,53285,6],[223,51,53292,6],[223,55,53293,6],[223,59,53287,6],[223,63,53281,6],[224,4,53288,6],[224,8,53290,6],[224,12,53291,6],[224,16,53270,16],[224,25,53262,0],[224,37,53260,0],[224,49,53258,0],[224,61,53256,0],[225,10,53254,0],[225,22,53252,0],[225,34,53250,0],[225,46,53248,0],[225,56,53264,0],[236,56,53281,0],[236,60,53287,0],[237,1,53288,0],[237,34,53262,72],[237,59,53264,0],[238,10,53269,128],[238,16,53263,242],[238,22,53294,2],[242,11,53270,0],[242,15,53265,27],[242,28,53276,112],[242,41,53275,128],[244,9,53294,8],[245,10,53294,8],[246,11,53294,7],[247,12,53294,7],[248,13,53294,5],[249,7,53294,5],[250,8,53294,6],[251,9,53294,0],[251,22,53276,240],[251,30,53275,0],[251,42,53269,255],[251,52,53270,23],[252,15,53262,1],[252,24,53263,0],[252,44,53294,0],[253,10,53260,1],[253,19,53261,0],[253,39,53293,0],[254,5,53258,193],[254,14,53259,192],[254,34,53292,7],[254,63,53256,1],[255,9,53257,0],[255,29,53291,0],[255,58,53254,177],[256,4,53255,150],[256,24,53290,1],[256,53,53252,177],[256,62,53253,108],[257,19,53289,1],[257,48,53250,129],[257,57,53251,150],[258,14,53288,1],[258,43,53248,129],[258,52,53249,108],[259,9,53287,1],[259,20,53264,0],[259,27,53281,12],[259,34,53285,0],[259,41,53286,1],[266,42,53273,129],[266,48,53266,184],[266,58,53265,27],[267,48,53265,27],[267,52,53280,0]],"colour":"Dg4ODg4ODg4ODggICAgOCAgIDggICA4ICAgOCAgIDggICA4ICAgODg4ODg4ICAkJCQkICAgICAgICAgICAgICAgICAgICAgICAgICAgIDg4ODggICQkJCQkJCQkICA4ICAgOCAgIDggICA4ICAgOCAgIDggICA4OCAgICAkJCQkJCQkJCAgOCAgIDggICA4ICAgOCAgIDggICA4ICAgODggICAgJCQkJCQkJCQgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQkJCQkJCQkJCQkICAkIDggJCA4ICQgOCAkIDggJCA4ICQgOCAkICQgICQkJCQkICQkJCAgIDg4ICAgOCAgIDggICA4ICAgOCAgIDggICAkJCQkJCQ8PDwgJCQgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQkJCQkPDw8ICAkICAgIDggICA4ICAgOCAgIDggICA4ICAgOCAgICQkJCQkJCAgICAgJCAgICA4ICAgOCAgIDggICA4ICAgOCAgIDggICAkJCQkJCQgICAgICQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQkICQkKCgoICAkICAgIDggICA4ICAgOCAgIDggICA4ICAgOCAgICAkJCAkJCgoKCAgJCAgICA4ICAgOCAgIDggICA4ICA4OCAgIDggICAgJCQgJCQoKCggICQgICAgICAkJCQkJCQ4ICAgOCAgICAgICAgICAgICQkICQkKCgoICAkICAgIDggJCAgICAkOCAgIDggICA4ICAgOCAgICAkJCAkJCQkJCQkJCAgICA4ICQgICAgJDggICA4ICAgOCAgIDggICAgJCQgJCQkJCQkJCQgICAgICAkICAgICQ4ICAgOCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkJCQkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQkJCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQkJCQgICQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16384,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":17344,"b":"AAAAAAUAAA0AAA0QAANUAAIVAMkVAIpVAKkVACkVAAVVAAoUAAoAAAgAAAgAAAgAAAgAAAgAAAgAAAwAABQA"},{"a":19136,"b":"AABwAAHwAAPIAAc/AADxAABxAAB/AABzAAB4AAB8AAA/AAAPAAb/AD7/AP5/A/9/B/8AD//8D//5H9/zP4/3"},{"a":19264,"b":"AAAAAAAAAAAA/AAAjAAAjgAA/gAAzgAAHgAAPgAA/AAA8AAA/2AA/3wA/n8A/v/AAP/gP//wn//wz/v47/H8"},{"a":19520,"b":"P8/vPM//Mw//AA//AA//AA//AA//AAf/AA//AD//AH//AH//AH/+AH/8AD/wAB/gAA/AAB/gAB/gAAAAAAAA"},{"a":19584,"b":"9/P8//M8//DM//AA//AA//AA//AA//AA//AA//gA//wA//4Af/4AP/4AD/4AB/wAA/AAB/gAB/gAAAAAAAAA"},{"a":21504,"b":"TExMTExMTU5PUFFRUVJTVFJSU1RSUlNUUlJTVFJSU1RSUlNUUlJMTExMTU5RUVVWV1hRUVFSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSTExNTllaVVZMTExMV1hRUltUUlJbVFJSW1RSUltUUlJbVFJSW1RSUkxMUlJRUUxMTExMTExMUVJTVFJSU1RSUlNUUlJTVFJSU1RSUlNUUlJMTFFRUVFMTFxdXV5MTFFfYGFiYmBhYmJgYWJiYGFiYmBhYmJgYWJiYGFMY2NkTExlZmZnTExRUWhpW1RoaVtUamlbVGhpW1RoaVtUaGlbVGhpTGtrZExMbG1ub3BMUVFxclNUcXJTVHFyU1RxclNUcXJTVHFyU1RxckxMTGRMTHN0dVFvTFFRUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJMdndkTEx4eXpRUUxRUVJSW1RSUltUUlJbVFJSW1RSUltUUlJbVFJSe3x9fkxMf4CBUVFMUVFSUlNUUlJTVFJSU1RSUlNUUlJTVFJSU1RSUoKDg4JMTIRUVFFRTFFRUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSTIVSTEyGh4hRUUxRUVJSW1RSUltUUlJbVFJSW1RSUltUUlJbVFJSUkyFUkxMiUxMUVFMUVFSUlNUUlJTVFJSU1RSUlNUUlJTVFJSU1RSUlJMTFJMTIlMilFRTFFRUlJSUkyLi4uLTFJSUlJSUlJSUlJSUlJSUlJSTExSTEyJTExRUUxRUVJSW1SMUVRRVIxbVFJSW1RSUltUUlJbVFJSUkxMUkxMjY6Ojo9MUVFSUlNUkFFUUVSQU1RSUlNUUlJTVFJSU1RSUlJMTFJMTJGSkpKTlFFRUlJSUpVRVFFUlVJSUlJSUlJSUlJSUlJSUlKWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlkBBQkOWlpeXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5dERUZHl5eWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWSElKS5aWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCRQZJxMAEAsABQ4FEgcZOgAAMDMzAAAAAAAAAAAAJDI1MDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbHB0eHyAhIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA=="},{"a":22520,"b":"KzEtMgAPAAAAAAAAAAAAAA=="},{"a":22552,"b":"PGZgYGBmPAA="},{"a":22568,"b":"fmBgeGBgfgA="},{"a":22584,"b":"PGZgbmZmPAA="},{"a":22600,"b":"PBgYGBgYPAA="},{"a":22616,"b":"Zmx4cHhsZgA="},{"a":22640,"b":"ZnZ+fm5mZgA="},{"a":22656,"b":"fGZmfGBgYAA="},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgA"},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22840,"b":"DAwYAAAAAAA="},{"a":22912,"b":"PGZmZmZmPAA="},{"a":22928,"b":"PGYGDDBgfgA8ZgYcBmY8AA=="},{"a":22952,"b":"fmB8BgZmPAA="},{"a":22992,"b":"AAAYAAAYAAA="},{"a":23040,"b":"AAAAAAC//zUAAAAAAP//VQMFFRVVVdX//39/fXX11dUFv/+/PyoKP1X/////qqr/V/X///+qqv/V/1X//6qq/39/fxcBAAAA99/d1VEBAAD/VVV9fVVVFN/3d3dAQAAA/////////////////fXVVf311VVVVVVVf19XVVVVVVX/////f19XVVVVVVVVVVVVqqqqqqqqqqqvr6+vr6+vpVpaWlpaWlpaVVVVVVVXX39VV19//////9X1/f//////VVVVVdX1/f+qqqqqqqmllaqppZVVVVVVpa+vr6+vr6/99fX19fX19fX19fX19fX19/X19fX19fWppZVVVVVVVVVUVJSQkJBQVVVWWhoaFhZVVWaqqqqqqv///9dVQUFB/f39/f39/f319fX19fX19/X19fX19f//9fX19fX1/f9QUFBTU1NTUxYWFhYWFhYWUFBTU1NTU1NBQUFBQUFBVf///fX11dba9VVVVVWqqqpVVVVVVZWlqVdVVVVVVVVV//9/f19fV1eUpKSkpKmqqlpqampqqqqqWmlpZWVlV1dVVV/V391d1WlaVvZ2Vf3d/f31/fr666t/f19/r6/r6ldVZ2dnaWpaVfd133X9d1d1fd3d1fXWWv766qqqqqqqr6+vv7/////6+vr+/v///72tqaqqqqqqWlZlaWpqamqVqlVVqqqqqmqpVlqqqqqqqlX/VaqqqqpV/1V3/////2pqampqampqVwcHBwcHB1dqampqamtvf6qqqqr/////qqqqqur6+v5/f39/f39/f////19f////qqr/////qqqq/v7+qv7+/lVVVVVV/1V/VVVVVVX/Vf9VVVVVVf9V/f7+/v7+/v7+f1VfX1VXV1X/Vf//Vf//Vf1V//9V//9V/1/f31X9/VWq/v7+qv7+VQAAAAAAAAAAqqqqAAAAAAA="},{"a":32767,"b":"qQ=="}],"capture":{"source":"simulator"}},"end":{"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"the kit machine (work/port/game/simframe.js), from agent5-end.json","vic":[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,27,184,0,0,255,23,15,86,0,1,0,240,0,0,0,0,8,0,11,0,0,1,2,40,2,40,0,7,7,0],"cia2":[2,63],"cpu":[47,53],"writes":[[223,46,53285,6],[223,50,53292,6],[223,54,53293,6],[223,58,53287,6],[223,62,53281,6],[224,3,53288,6],[224,7,53290,6],[224,11,53291,6],[224,15,53270,16],[224,24,53262,0],[224,36,53260,0],[224,48,53258,0],[224,60,53256,0],[225,9,53254,0],[225,21,53252,0],[225,33,53250,0],[225,45,53248,0],[225,55,53264,0],[236,62,53281,0],[237,3,53287,0],[237,7,53288,0],[237,40,53262,65],[238,2,53264,0],[238,16,53269,128],[238,22,53263,242],[238,28,53294,2],[242,10,53270,1],[242,14,53265,27],[242,27,53276,112],[242,40,53275,128],[244,8,53294,8],[245,9,53294,8],[246,10,53294,7],[247,11,53294,7],[248,12,53294,5],[249,13,53294,5],[250,7,53294,6],[251,8,53294,0],[251,21,53276,240],[251,29,53275,0],[251,41,53269,255],[251,51,53270,23],[252,14,53262,1],[252,23,53263,0],[252,43,53294,0],[253,9,53260,1],[253,18,53261,0],[253,38,53293,7],[254,4,53258,1],[254,13,53259,0],[254,33,53292,7],[254,62,53256,1],[255,8,53257,0],[255,28,53291,0],[255,57,53254,1],[256,3,53255,0],[256,23,53290,40],[256,52,53252,1],[256,61,53253,0],[257,18,53289,2],[257,47,53250,1],[257,56,53251,0],[258,13,53288,40],[258,42,53248,1],[258,51,53249,0],[259,8,53287,2],[259,19,53264,0],[259,26,53281,8],[259,33,53285,0],[259,40,53286,1],[262,51,53273,129],[262,57,53266,184],[263,4,53265,27],[263,60,53265,27],[264,1,53280,0]],"colour":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ==","ram":[{"a":16384,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":17792,"b":"AAAAAFAQAHAQBHAQFcAQVIBAVGBAVaRAVG1AVGVAVV0AFKAAAKAAACAAACAAACAAACAAACAAACAAADAAABQA"},{"a":17856,"b":"AAAABAUABA0ABA0QBANUAQIVAQkVARpVAXkVAVkVAHVVAAoUAAoAAAgAAAgAAAgAAAgAAAgAAAgAAAwAABQA"},{"a":18176,"b":"AAAAAAAMAAAMAAAwAADwAADAAAPAAA8AAD4AAPgAA8gAAyAADyAADIAADIAADgAADgAAPAAAOAAAMAAAMAAA"},{"a":20416,"b":"AAAAMAAAMAAADAAADwAAAwAAA8AAAPAAALwAAC8AACPAAAjAAAjwAAIwAAIwAACwAACwAAA8AAAsAAAMAAAM"},{"a":21504,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw8OBxIBFBUMARQJDw4TKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQIAQ4LEwAUDwAZDxUsAAATEAUOBwwFEgAAAAAAAAAAAAAAAAAAAAAUCAUAEA8SFAEMABQPABQIBQATEAkSCRQAFw8SDAQAAAAAAAAAAAAACAETAAIFBQ4AAwwPEwUELgAZDxUABQESDgABACQ1MDAwAAAAAAAAABIFFwESBAAGEg8NABQIBQADCRQZLgABDBMPLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQ8VAA0BBAUADQ8SBQANDw4FGQAUCAEOABkPFQATFAESFAUEAAAAABcJFAgsABMPABQIBQACAQ4LABcJDAwAEgEJEwUAGQ8VEgAAAAAAAAADEgUECRQADAkNCRQAFA8AJDc1MDAuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkPFRIADgUXAAEDAw8VDhQADhUNAgUSAAkTADY1MTEwNzAwLgAAAAAXEgkUBQAUCAkTAA4VDQIFEgAEDxcOAAYPEgAGFRQVEgUAAAAAAAAAEAwBGS4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABscHR4fICEiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEg=="},{"a":22520,"b":"HD8cPwAWFwAAAAAAAAAAABg8Zn5mZmYAfGZmfGZmfAA8ZmBgYGY8AHhsZmZmbHgAfmBgeGBgfgB+YGB4YGBgADxmYG5mZjwAZmZmfmZmZgA8GBgYGBg8AA=="},{"a":22616,"b":"Zmx4cHhsZgBgYGBgYGB+AGN3f2tjY2MAZnZ+fm5mZgA8ZmZmZmY8AHxmZnxgYGAA"},{"a":22672,"b":"fGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPAA="},{"a":22712,"b":"Y2Nja393YwA="},{"a":22728,"b":"ZmZmPBgYGAA="},{"a":22744,"b":"AQMHDRk/YcGfgI+cnJycj/8wMzMzMzMz8DAxMzY8ODB/wJgZGRgYGf8A84PDczPjgAAcNjY2NhwAAGNze29nYw=="},{"a":22816,"b":"GD5gPAZ8GAA="},{"a":22848,"b":"GBgYGAAAGBg="},{"a":22880,"b":"AAAAAAAYGDA="},{"a":22896,"b":"AAAAAAAYGAA="},{"a":22912,"b":"PGZmZmZmPAAYGDgYGBh+AA=="},{"a":22952,"b":"fmB8BgZmPAA8ZmB8ZmY8AH5mDBgYGBgA"},{"a":32767,"b":"qQ=="}],"capture":{"source":"simulator"}}};
  const LYRICS = {"lines":[["GHOSTBUSTERS(",14,31,1310,[[15,[1314,1328]],[19,[1342]],[23,[1356,1370,1384,1398,1412,1426]]]],["IF THERE'S SOMETHING STRANGE",7,1317,1437,[[7,[1440]],[17,[1454]],[23,[1468]],[29,[1482,1496,1510,1524,1538]]]],["IN YOUR NEIGHBORHOOD,",7,1444,1553,[[16,[1566]],[22,[1580]],[24,[1594,1608,1622,1636,1650]]]],["WHO YOU GONNA CALL?",7,1560,1664,[[7,[1678]],[15,[1692]],[21,[1706,1720,1734]]]],["GHOSTBUSTERS(",14,1671,1747,[[13,[1762,1776]],[19,[1790]],[23,[1804,1818,1832,1846,1860,1874]]]],["IF THERE'S SOMETHING WEIRD,",7,1754,1887,[[7,[1888]],[17,[1902]],[23,[1916]],[29,[1930,1944,1958,1972,1986]]]],["AND IT DON'T LOOK GOOD,",7,1894,1998,[[8,[2000]],[16,[2014]],[20,[2028]],[26,[2042,2056,2070,2084,2098]]]],["WHO YOU GONNA CALL?",7,2005,2111,[[8,[2126]],[16,[2140]],[22,[2154,2168,2182]]]],["GHOSTBUSTERS(",14,2118,2197,[[15,[2210,2224]],[19,[2238]],[23,[2252,2266,2280,2294,2308,2322,2336,2350,2364,2378,2392,2406,2420,2434,2448,2462,2476,2490,2504,2518,2532,2546,2560,2574,2588,2602,2616,2630,2644,2658]]]],["I AIN'T 'FRAID OF NO GHOST(",7,2204,2671,[[8,[2686,2700]],[16,[2714]],[24,[2728]],[30,[2742,2756,2770,2784,2798,2812,2826,2840,2854,2868,2882,2896,2910,2924,2938,2952,2966,2980,2994,3008,3022,3036,3050,3064,3078,3092,3106]]]],["I AIN'T 'FRAID OF NO GHOST(",7,2678,3120,[[8,[3134,3148]],[16,[3162]],[24,[3176]],[30,[3190,3204,3218,3232,3246,3260,3274,3288,3302,3316,3330,3344,3358,3372,3386,3400,3414,3428,3442,3456,3470,3484,3498,3512,3526,3540,3554,3568,3582,3596,3610,3624,3638,3652,3666]]]],["IF YOU'RE SEEING THINGS",7,3127,3678,[[8,[3680]],[16,[3694]],[20,[3708]],[26,[3722,3736,3750,3764,3778]]]],["RUNNING THROUGH YOUR HEAD,",7,3685,3792,[[8,[3792]],[16,[3806]],[24,[3820]],[28,[3834,3848,3862,3876,3890]]]],["WHO CAN YOU CALL?",7,3799,3903,[[9,[3918]],[15,[3932]],[21,[3946,3960,3974,3988]]]],["GHOSTBUSTERS(",14,3910,3999,[[13,[4002,4016]],[19,[4030]],[23,[4044,4058,4072,4086,4100,4114]]]],["AN INVISIBLE MAN",7,4006,4127,[[7,[4128]],[11,[4142]],[15,[4156]],[19,[4170,4184,4198,4212,4226]]]],["SLEEPING IN YOUR BED,",7,4134,4239,[[6,[4240]],[16,[4254]],[20,[4268]],[24,[4282,4296,4310,4324,4338]]]],["WHO YOU GONNA CALL?",7,4246,4351,[[7,[4366]],[15,[4380]],[23,[4394,4408,4422]]]],["GHOSTBUSTERS(",14,4358,4435,[[15,[4450,4464]],[19,[4478]],[23,[4492,4506,4520,4534,4548,4562,4576,4590,4604,4618,4632,4646,4660,4674,4688,4702,4716,4730,4744,4758,4772,4786,4800,4814,4828,4842,4856,4870,4884,4898]]]],["I AIN'T 'FRAID OF NO GHOST(",7,4442,4911,[[8,[4926,4940]],[16,[4954]],[24,[4968]],[30,[4982,4996,5010,5024,5038,5052,5066,5080,5094,5108,5122,5136,5150,5164,5178,5192,5206,5220,5234,5248,5262,5276,5290,5304,5318,5332,5346]]]],["I AIN'T 'FRAID OF NO GHOST(",7,4918,5360,[[8,[5374,5388]],[16,[5402]],[24,[5416]],[30,[5430,5444,5458,5472,5486,5500,5514,5528,5542,5556,5570,5584,5598,5612,5626,5640,5654,5668,5682,5696]]]],["WHO YOU GONNA CALL?",7,5367,5707,[[8,[5710]],[16,[5724]],[22,[5738,5752,5766,5780]]]],["GHOSTBUSTERS(",14,5714,5791,[[15,[5794,5808]],[19,[5822]],[23,[5836,5850,5864,5878,5892,5906]]]],["IF YOU'RE ALL ALONE,",7,5798,5917,[[7,[5920]],[17,[5934]],[21,[5948]],[23,[5962,5976,5990,6004,6018]]]],["PICK UP THE PHONE,",7,5924,6030,[[7,[6032]],[11,[6046]],[15,[6060]],[21,[6074,6088,6102,6116,6130]]]],["AND CALL...",7,6037,6142,[[6,[6144]],[12,[6158,6172,6186,6200,6214]]]],["GHOSTBUSTERS(",14,6149,6228,[[15,[6242,6256]],[19,[6270]],[23,[6284,6298,6312,6326,6340,6354,6368,6382,6396,6410,6424,6438,6452,6466]]]],["I AIN'T 'FRAID OF NO GHOST(",7,6235,6480,[[8,[6494,6508]],[16,[6522]],[24,[6536]],[30,[6550,6564,6578,6592,6606,6620,6634,6648,6662,6676,6690]]]],["I HEAR IT LIKES THE GIRLS.",7,6487,6703,[[8,[6718,6732]],[18,[6746]],[22,[6760]],[28,[6774,6788,6802,6816,6830,6844,6858,6872,6886,6900,6914]]]],["I AIN'T 'FRAID OF NO GHOST(",7,6710,6923,[[9,[6942,6956]],[17,[6970]],[25,[6984]],[29,[6998,7012,7026,7040,7054,7068,7082,7096,7110,7124,7138]]]],["YEAH(  YEAH(  YEAH(  YEAH(",7,6930,7149,[[8,[7166,7180]],[16,[7194,7208]],[22,[7222,7236]],[30,[7250,7264,7278,7292,7306,7320,7334,7348,7362,7376,7390,7404,7418,7432,7446,7460,7474]]]],["WHO YOU GONNA CALL?",7,7156,7486,[[7,[7502]],[15,[7516]],[23,[7530,7544,7558]]]],["GHOSTBUSTERS(",14,7493,7570,[[15,[7586,7600]],[19,[7614]],[23,[7628,7642,7656,7670,7684,7698]]]],["IF YOU HAVE A DOSE OF A",7,7577,7710,[[7,[7712,7726]],[11,[7740,7754]],[15,[7768]],[21,[7782,7796]],[25,[7810]],[27,[7824,7838]]]],["FREAKY GHOST, BABY,",7,7717,7850,[[7,[7852,7866]],[9,[7880]],[15,[7894,7908]],[21,[7922,7936,7950]]]],["YOU'D BETTER CALL...",7,7857,7963,[[12,[7964]],[22,[7978,7992,8006,8020]]]],["GHOSTBUSTERS(",14,7970,8031,[[13,[8034,8048]],[19,[8062]],[23,[8076,8090,8104,8118,8132,8146,8160,8174,8188,8202,8216,8230,8244,8258,8272,8286,8300,8314,8328,8342,8356,8370,8384,8398,8412,8426,8440,8454,8468,8482,8496,8510,8524,8538,8552,8566,8580,8594,8608,8622,8636,8650,8664,8678,8692,8706,8720,8734,8748,8762,8776,8790,8804,8818,8832,8846,8860,8874,8888,8902,8916,8930]]]],["BUSTIN' MAKES ME FEEL GOOD(",7,8038,8944,[[7,[8958]],[11,[8972]],[15,[8986]],[19,[9000]],[23,[9014,9028]],[29,[9042,9056,9070,9084,9098,9112,9126,9140,9154,9168,9182,9196,9210,9224,9238,9252,9266,9280,9294,9308,9322,9336,9350,9364,9378]]]],["I AIN'T 'FRAID OF NO GHOST(",7,8951,9391,[[8,[9406,9420]],[16,[9434]],[24,[9448]],[30,[9462,9476,9490,9504,9518,9532,9546,9560,9574,9588,9602,9616,9630,9644,9658,9672,9686,9700,9714,9728,9742,9756,9770,9784,9798,9812,9826,9840]]]],["I AIN'T 'FRAID OF NO GHOST(",7,9398,9854,[[8,[9854,9868]],[16,[9882]],[24,[9896]],[30,[9910,9924,9938,9952,9966,9980,9994,10008,10022,10036,10050,10064,10078,10092,10106,10120,10134,10148,10162,10176,10190,10204,10218,10232,10246,10260,10274,10288,10302,10316,10330,10344,10358,10372,10386]]]],["WHEN IT COMES THROUGH YOUR DOOR,",7,9861,10397,[[8,[10400]],[16,[10414,10428]],[24,[10442]],[30,[10456]],[36,[10470,10484,10498]]]],["UNLESS YOU JUST WANT SOME MORE,",7,10404,10511,[[9,[10526]],[19,[10540]],[25,[10554]],[29,[10568]],[35,[10582,10596,10610]]]],["YOU'D BETTER CALL...",7,10518,10622,[[12,[10652]],[20,[10666,10680,10694,10708]]]],["GHOSTBUSTERS(",14,10629,10720,[[13,[10722,10736]],[19,[10750]],[23,[10764,10778,10792,10806,10820,10834,10848]]]],["WHO YOU GONNA CALL?",7,10727,10859,[[8,[10862]],[16,[10876]],[22,[10890,10904,10918,10932]]]],["GHOSTBUSTERS(",14,10866,10945,[[15,[10946,10960]],[19,[10974]],[23,[10988,11002,11016,11030,11044,11058,11072]]]],["WHO YOU GONNA CALL?",7,10952,11086,[[7,[11086]],[15,[11100]],[23,[11114,11128,11142,11156]]]],["GHOSTBUSTERS(",14,11093,11168,[[15,[11170,11184]],[19,[11198]],[23,[11212,11226,11240,11254,11268,11282,11296]]]],["WHO YOU GONNA CALL?",7,11175,11310,[[7,[11310]],[15,[11324]],[23,[11338,11352,11366,11380]]]],["GHOSTBUSTERS(",14,11317,11393,[[15,[11394,11408]],[19,[11422]],[23,[11436,11450,11464,11478,11492,11506,11520]]]],["WHO YOU GONNA CALL?",7,11400,11533,[[7,[11534]],[15,[11548]],[23,[11562,11576,11590,11604]]]],["GHOSTBUSTERS(",14,11540,11616,[[15,[11618,11632]],[19,[11646]],[23,[11660,11674,11688,11702,11716,11730,11744]],[25,[11758,11772,11786,11800,11814,11828,11842,11856]]]]],"off":[[-3,[12,26,40,54,68,82,96,110,124,138,152,166,180,194,208,222,236,250,264,278,292,306,320,334,348,362,376,390,404,418,432,446,460,474,488,502,516,530,544,558]],[-1,[572,586,600,614,628,642,656,670]],[1,[684,698,712,726,740,754,768,782]],[3,[796,810,824,838,852,866,880,894]],[5,[908,922,936,950,964,978,992,1006]],[7,[1020,1034,1048,1062,1076,1090,1104,1118]],[9,[1132,1146,1160,1174,1188,1202,1216,1230]],[11,[1244,1258,1272,1286,1300]],[8,[1552]],[24,[1664]],[21,[1748]],[26,[2112]],[22,[2196]],[23,[2672]],[30,[3120]],[28,[3904]],[24,[4352]],[22,[4436]],[23,[4912]],[30,[5360]],[11,[6228]],[23,[6480]],[30,[6704]],[28,[6928]],[29,[7152]],[30,[7488]],[23,[7572]],[22,[8944]],[29,[9392]],[36,[10512]],[35,[10624,10638]],[29,[11870,11884,11898,11912,11926,11940,11954,11968]],[33,[11982,11996,12010,12024,12038,12052,12066,12080]],[37,[12094,12108,12122,12136,12150,12164,12178,12192]],[-3,[12206,12220,12234,12248,12262,12276,12290,12304,12318,12332,12346,12360,12374,12388,12402,12416,12430,12444,12458,12472,12486,12500,12514,12528,12542,12556,12570,12584,12598,12612,12626,12640,12654,12668,12682,12696,12710,12724,12738,12752,12766,12780,12794,12808,12822,12836,12850,12864,12878,12892,12906,12920,12934,12948,12962,12976,12990,13004,13018,13032,13046,13060,13074,13088,13102,13116,13130,13144,13158,13172,13186,13200,13214,13228,13242,13256,13270,13284,13298,13312,13326,13340,13354,13368,13382,13396,13410,13424,13438,13452,13466,13480,13494,13508,13522,13536,13550,13564,13578,13592,13606,13620,13634]]]};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const hex = (n, w) => '$' + n.toString(16).toUpperCase().padStart(w || 4, '0');
  const C64COL = ['#000000','#ffffff','#813338','#75cec8','#8e3c97','#56ac4d','#2e2c9b','#edf171','#8e5029','#553800','#c46c71','#4a4a4a','#7b7b7b','#a9ff9f','#706deb','#b2b2b2'];
  function need(el) {
    if (globalThis.C64) return true;
    el.insertAdjacentHTML('afterend', '<p class="note">This picture needs the site’s shared script, ../../lib/c64.js: open the page from the built site.</p>');
    return false;
  }
  function press(group, btn) { $$(group).forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); }

  // ---- the screens: frames recorded from the running game, drawn by the site's renderer ----
  function screens() {
    for (const [id, f] of Object.entries(FRAMES)) {
      const cv = $('#scr-' + id); if (!cv || !need(cv)) continue;
      try { C64.drawFrame(cv, f, 1); } catch (e) { console.error(id, e); }
    }
  }

  // ---- 01 the sing-along ----
  function singalong(G) {
    const box = $('#lyr');
    const COLS = 40;
    const pad = s => s + ' '.repeat(Math.max(0, COLS - s.length));
    const lineAt = (l) => pad(' '.repeat(l[1]) + l[0].replace(/\(/g, '!'));
    box.innerHTML = '<div class="ball"><i>●</i></div><div class="ln cur"></div><div class="ln"></div><div class="ln next"></div>';
    const ball = $('.ball i', box), cur = $('.ln.cur', box), nxt = $('.ln.next', box);
    // every landing, in frame order: [frame, column]
    const lands = [];
    for (const l of LYRICS.lines) for (const [c, fs] of l[4]) for (const f of fs) lands.push([f, c]);
    for (const [c, fs] of LYRICS.off) for (const f of fs) lands.push([f, c]);
    lands.sort((a, b) => a[0] - b[0]);
    function show(f) {
      let i = -1, j = -1;
      for (let k = 0; k < LYRICS.lines.length; k++) { if (LYRICS.lines[k][3] <= f) i = k; if (LYRICS.lines[k][2] <= f) j = k; }
      cur.textContent = i >= 0 ? lineAt(LYRICS.lines[i]) : pad('');
      nxt.textContent = j > i ? lineAt(LYRICS.lines[j]) : pad('');
      let lo = 0, hi = lands.length - 1, p = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (lands[m][0] <= f) { p = m; lo = m + 1; } else hi = m - 1; }
      if (p < 0) { ball.style.visibility = 'hidden'; return; }
      ball.style.visibility = 'visible';
      const [f0, c0] = lands[p], [f1, c1] = p + 1 < lands.length ? lands[p + 1] : [f0 + 14, c0];
      const t = Math.min(1, (f - f0) / Math.max(1, f1 - f0));
      const col = c0 + (c1 - c0) * t;
      ball.style.left = (col / COLS * 100) + '%';
      ball.style.top = (-Math.sin(Math.PI * t) * 0.9 + 0.5) + 'em';
    }
    show(0);
    const root = $('#sid');
    if (!globalThis.C64Sid) { root.textContent = 'The player needs the site’s shared sound script, ../../lib/sid.js: open this page from the built site.'; return; }
    const data = { base: 0xA1F4, mem: Array.from(G.ram.subarray(0xA1F4, 0xA837)) };
    const S = C64Sid;
    S.mount(root, {
      driver: createDriver, data, tunes: ['Title (sing-along)', 'In play (loop)'],
      rows: [
        { k: 'Pattern', f: v => v.pattern == null ? null : String(v.pattern) },
        { k: 'Note', f: v => v.rest || v.stopped ? '-' : v.name },
        { k: 'Instrument', f: v => v.instrument == null ? null : String(v.instrument) },
      ],
      onFrame: (f, tune) => { if (tune === 0) show(f); },
    });
  }

  // ---- 02 speech ----
  function speech(G) {
    const hexOf = (a, b) => Array.from(G.ram.subarray(a, b + 1), x => x.toString(16).padStart(2, '0')).join('');
    const data = { base: 0xF4EA, blocks: [[0xF24D, 0xF250], [0xF2D8, 0xF2E3], [0xF362, 0xF371], [0xF4EA, 0xFF9B]]
      .map(([a, b]) => ({ start: hex(a), hex: hexOf(a, b) })) };
    const S = GBSpeech.load(data);
    const res = [0, 1, 2, 3, 4].map(p => GBSpeech.play(GBSpeech.load(data), p));
    const cv = $('#ph'), ctx = cv.getContext('2d'), kv = $('#ph-kv');
    const btns = $('#ph-buttons');
    btns.innerHTML = [0, 1, 2, 3, 4].map(p => `<button class="b" data-ph="${p}" aria-pressed="${p === 1}">Phrase ${p}</button>`).join('') +
      '<button class="b" data-play>Play</button>';
    let cur = 1, actx = null;
    function draw() {
      const r = res[cur], W = cv.width, H = cv.height, n = r.totalTicks;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x = t => t / n * W;
      // level
      ctx.strokeStyle = '#2f3136'; ctx.lineWidth = 1; ctx.beginPath();
      let v = 7;
      for (let i = 0; i < r.ticks.length; i++) {
        const y0 = 10 + (15 - v) * 8;
        ctx.lineTo(x(r.ticks[i]), y0); v = r.values[i]; ctx.lineTo(x(r.ticks[i]), 10 + (15 - v) * 8);
      }
      ctx.stroke();
      // frames
      for (const f of r.frames) {
        if (f.startTick == null) continue;
        ctx.fillStyle = f.pitchTicks ? '#1f5fa8' : '#c25a00';
        ctx.fillRect(x(f.startTick), 150, Math.max(1, x(f.endTick) - x(f.startTick) - 1), 22);
      }
      // pitch
      ctx.fillStyle = '#2a8a4a';
      for (const p of r.periods) if (p.kind === 'voiced') {
        const hz = 9659.3 / (2 * p.half + p.gap);
        const y = 255 - Math.min(75, Math.max(0, (hz - 60) / 240 * 75));
        ctx.fillRect(x(p.tick), y - 1, Math.max(2, x(p.ticks)), 3);
      }
      ctx.fillStyle = '#80838a'; ctx.font = '13px IBM Plex Mono, monospace';
      ctx.fillText('level $D418', 4, 12); ctx.fillText('frames', 4, 146); ctx.fillText('pitch', 4, 190);
      const voiced = r.frames.filter(f => f.pitchTicks).length;
      kv.innerHTML = `<b>Phrase ${cur}</b>: ${(r.totalTicks * 102 / 985248).toFixed(2)} s, ${r.frames.length} frames (${voiced} voiced, ${r.frames.length - voiced} noise), ${r.ticks.length.toLocaleString('en')} writes to <code>$D418</code>`;
    }
    function play() {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const rate = actx.sampleRate, pcm = GBSpeech.toPCM(res[cur], rate);
        // the C64's output stage takes out the DC: a 16 Hz high pass
        const a = Math.exp(-2 * Math.PI * 16 / rate); let px = 0, py = 0;
        for (let i = 0; i < pcm.length; i++) { const y = a * (py + pcm[i] - px); px = pcm[i]; py = y; pcm[i] = y * 0.7; }
        const buf = actx.createBuffer(1, pcm.length, rate); buf.copyToChannel(pcm, 0);
        const src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination); src.start();
      } catch (e) { kv.textContent = 'Audio could not start: ' + e.message; }
    }
    btns.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.play !== undefined) { play(); return; }
      cur = +b.dataset.ph; press('#ph-buttons button[data-ph]', b); draw(); play();
    });
    draw();
  }

  // ---- 03 the account number ----
  function account() {
    const A = GBAccount;
    const name = $('#ac-name'), bal = $('#ac-bal'), tryN = $('#ac-try');
    const bcd = n => ((Math.floor(n / 10) % 10) << 4) | (n % 10);
    function enc() {
      const nm = name.value.toUpperCase().slice(0, 20), h = +bal.value;
      const hi = bcd(Math.floor(h / 100)), lo = bcd(h % 100);
      $('#ac-bal-out').textContent = '$' + (h * 100).toLocaleString('en') + '  (stored ' + hex(hi, 2) + ' ' + hex(lo, 2) + ')';
      const r = A.encode(nm, hi, lo), s = A.nameSum(nm), c = A.check(hi, lo, nm);
      $('#ac-num').textContent = r.digits;
      const N = (hi << 16) | (c << 8) | lo;
      $('#ac-steps').innerHTML =
        `name bytes added: <b>${hex(s, 2)}</b> (${s} steps)<br>` +
        `check: ${hex(hi, 2)} + ${hex(lo, 2)} = ${hex((hi + lo) & 255 || 1, 2)}, stepped ${s || 256} times → <b>${hex(c, 2)}</b><br>` +
        `24 bits ${hex(hi, 2)} ${hex(c, 2)} ${hex(lo, 2)} in octal: <b>${N.toString(8).padStart(8, '0')}</b><br>` +
        `printed in pairs, each pair reversed: <b>${r.digits}</b>`;
    }
    function dec() {
      const nm = name.value.toUpperCase().slice(0, 20), t = tryN.value.toUpperCase();
      const d = A.decode(nm, A.parse(t));
      const out = $('#ac-res'), why = $('#ac-why');
      if (!d.ok) {
        out.innerHTML = '<span class="bad">INVALID ACCOUNT NUMBER.</span>';
        why.innerHTML = d.check === undefined ? '' : `the number carries check byte <b>${hex(d.check, 2)}</b>; this name and balance need <b>${hex(d.wanted, 2)}</b>`;
        return;
      }
      const digit = v => v < 10 ? String(v) : String.fromCharCode(48 + v);   // the game prints $A as ':'
      const s = digit(d.hi >> 4) + digit(d.hi & 15) + digit(d.lo >> 4) + digit(d.lo & 15);
      out.innerHTML = `<span class="ok">YOU HAVE $${s.replace(/^0+(?=.)/, '')}00</span>`;
      why.innerHTML = `balance bytes <b>${hex(d.hi, 2)} ${hex(d.lo, 2)}</b>, check byte <b>${hex(d.check, 2)}</b> matches` +
        ((d.hi & 15) > 9 || d.hi >> 4 > 9 || (d.lo & 15) > 9 || d.lo >> 4 > 9 ? '<br>not a decimal number: the game accepts it anyway' : '');
    }
    name.addEventListener('input', () => { enc(); dec(); });
    bal.addEventListener('input', enc);
    tryN.addEventListener('input', dec);
    enc(); dec();
  }

  // ---- 04 a building's life ----
  function building(G) {
    const R = G ? Array.from(G.ram.subarray(0xA1E4, 0xA1F4)) : [0x10, 0x10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3];
    const colours = { 0: 5, 1: 4, 2: 1, 3: 2 };            // $3EE2: $0D $0C $09 $0A, multicolour, low three bits
    let own = 0, near = true;
    const t = $('#bl-t'), kv = $('#bl-kv'), cv = $('#bl-bar'), ctx = cv.getContext('2d');
    // the state after f frames from the pick ($10), as $73BD ages it: +$10 every 256 frames, a wrap moves the stage on
    function stateAt(f) {
      let s = 0x10, ticks = Math.floor((f + 1) / 256);
      for (let k = 0; k < ticks; k++) {
        if (s === 0x1F + 0xE0) return { gone: true };
        const n = (s + 0x10) & 0xFF;
        if (n < 0x10) {                                     // the timer wrapped
          if ((s & 0x0F) === 0x0F) return { gone: true };   // $xF: the Slimer escapes, +300 PK
          s = [0x14, 0x1C, 0xF8, 0x1F][(s >> 2) & 3];
        } else s = n;
      }
      return { s };
    }
    function show() {
      const f = +t.value, st = stateAt(f);
      if (st.gone) { kv.innerHTML = `<b>${f.toLocaleString('en')} frames</b> (${(f / 50.125).toFixed(0)} s): the Slimer has escaped; +300 PK energy, the building is free again`; draw(f); return; }
      let s = st.s; const stage = (s >> 2) & 3, timer = s >> 4;
      // what the map shows: haunted ($xF) keeps red; near the logo the stage colour if owned
      let col = (s & 3) === 3 ? 3 : 0, note = '';
      if (near && (s & 3) !== 3) {
        const needs = [0, 1, 4, 1][stage];
        if (needs && (own & needs)) {
          if (stage === 3) { s = 0x1F; col = 3; note = ' The detector turns it red now, timer restarted.'; }
          else col = stage;
        }
      }
      const slimer = ((s >> 2) & 3) === 3;
      const fee = slimer ? R[s >> 4] : 3;
      const names = ['0: nothing shows', '1: a Slimer on its way', '2: (the Marshmallow Man’s)', '3: a Slimer inside'];
      kv.innerHTML = `<b>${f.toLocaleString('en')} frames</b> (${(f / 50.125).toFixed(0)} s) · state <b>${hex(s, 2)}</b> · stage ${names[(s >> 2) & 3]}${(s & 3) === 3 ? ', red and flashing' : ''} · shown as ` +
        `<span class="sw" style="background:${C64COL[colours[col]]}"></span>${['green', 'purple', 'white', 'red'][col]} · a catch now pays <b>$${(((fee >> 4) * 10 + (fee & 15)) * 100).toLocaleString('en')}</b>${slimer ? '' : ' (no Slimer: the men leave; a trap sprung elsewhere pays this)'}.${note}`;
      draw(f);
    }
    function draw(f) {
      const W = cv.width, H = cv.height, max = +t.max;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const seg = [[0, 3839, '#56ac4d', 'stage 0'], [3839, 7679, '#8e3c97', 'stage 1'], [7679, 11519, '#7b7b7b', 'stage 3 (hidden)'], [11519, 15359, '#813338', 'red'], [15359, max, '#e0ded8', 'escaped']];
      for (const [a, b, c, l] of seg) { ctx.fillStyle = c; ctx.fillRect(a / max * W, 18, (b - a) / max * W - 2, 26); ctx.fillStyle = '#2f3136'; ctx.font = '13px IBM Plex Mono, monospace'; ctx.fillText(l, a / max * W + 4, 62); }
      ctx.fillStyle = '#d04a3a'; ctx.fillRect(f / max * W - 1, 8, 3, 44);
    }
    $('#bl-own').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
      if (b.dataset.own) own = on ? own | +b.dataset.own : own & ~+b.dataset.own; else near = on;
      show();
    });
    t.addEventListener('input', show);
    show();
  }

  // ---- 08 the crossing test ----
  function streams() {
    const dx = $('#st-dx'), dy = $('#st-dy'), cv = $('#st'), ctx = cv.getContext('2d'), kv = $('#st-kv');
    function show() {
      const d = +dx.value, h = +dy.value, lim = 0x2A - (h >> 2), crossed = d < lim;
      const W = cv.width, H = cv.height, cx = W / 2, sc = 5;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x1 = cx - d * sc / 2, x2 = cx + d * sc / 2, y1 = 150, y2 = 150 - h * 1.5;
      ctx.strokeStyle = crossed ? '#d04a3a' : '#c25a00'; ctx.lineWidth = 3;
      const top = 30;
      ctx.beginPath(); ctx.moveTo(x1, y1 - 20); ctx.lineTo(cx + (crossed ? 30 : -10), top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2 - 20); ctx.lineTo(cx - (crossed ? 30 : -10), top); ctx.stroke();
      ctx.fillStyle = '#2f3136';
      ctx.fillRect(x1 - 6, y1 - 20, 12, 30); ctx.fillRect(x2 - 6, y2 - 20, 12, 30);
      ctx.fillStyle = '#80838a'; ctx.font = '13px IBM Plex Mono, monospace';
      ctx.fillText('limit ' + lim + ' = $2A - ' + h + '/4', 8, 190);
      kv.innerHTML = `gap <b>${d}</b>, limit <b>${lim}</b>: ` + (crossed ? '<span class="bad">the streams cross</span>' : '<span class="ok">safe</span>');
    }
    dx.addEventListener('input', show); dy.addEventListener('input', show); show();
  }

  // one script for every tab: each part runs only where its elements are

  // ---- the sprites: unpacked from the game's own stream, as the cold start does ----
  function spriteBank(G) {                       // rle_unpack $610B: $11 n = n zero bytes (0 = 256)
    const out = new Uint8Array(0x1000), m = G.ram;
    let src = 0xB408, d = 0;
    while (!((src & 0xFF) >= 0xF8 && (src >> 8) >= 0xBF)) {
      const v = m[src];
      if (v !== 0x11) { out[d++] = v; src++; }
      else { for (let n = m[src + 1] || 256; n > 0; n--) out[d++] = 0; src += 2; }
    }
    return out;
  }
  function drawShape(ctx, bank, n, o) {          // o: x, y, s(cale), mc, col, m1, m2, xe, ye
    const sx = o.s * (o.xe ? 2 : 1), sy = o.s * (o.ye ? 2 : 1);
    for (let y = 0; y < 21; y++) for (let x = 0; x < 24; x++) {
      const byte = bank[n * 64 + y * 3 + (x >> 3)];
      let c = null;
      if (o.mc) { const v = (byte >> (6 - (x & 6))) & 3; c = [null, o.m1, o.col, o.m2][v]; }
      else if ((byte >> (7 - (x & 7))) & 1) c = o.col;
      if (c == null) continue;
      ctx.fillStyle = C64COL[c]; ctx.fillRect(o.x + x * sx, o.y + y * sy, sx, sy);
    }
  }
  const SHAPE_COLOUR = G => n => G.ram[0xA949 + n] & 15;   // the colour the IRQ gives each shape ($8F99)
  const MAP = { bg: 12, mc: false, m1: 0, m2: 0 }, SHOP = { bg: 8, mc: true, m1: 1, m2: 0 }, BUST = { bg: 12, mc: true, m1: 0, m2: 1 };
  const GALLERY = [
    { name: 'The Ghostbusters logo on the city map, two sprites in one place', ...MAP, layers: [[5, true], [4, false]] },
    { name: 'The Keymaster', ...MAP, side: [7] },
    { name: 'The Gatekeeper', ...MAP, side: [6] },
    { name: 'The Roamers’ two shapes', ...MAP, side: [8, 9] },
    { name: 'The Slimer\u2019s two shapes', ...MAP, anim: [10, 11] },
    { name: 'A Ghostbuster walking right', ...BUST, anim: [14, 16, 18, 20] },
    { name: 'A Ghostbuster walking left', ...BUST, anim: [15, 17, 19, 21] },
    { name: 'The two men at the top of the tower', ...BUST, side: [22, 23] },
    { name: 'A man slimed, or caught at Zuul', ...BUST, side: [24] },
    { name: 'A proton stream, in six steps', ...BUST, anim: [25, 26, 27, 28, 29, 30] },
    { name: 'The light that rises from the trap, in two six-step animations', ...BUST, anim2: [[37, 38, 39, 40, 41, 42], [31, 32, 33, 34, 35, 36]] },
    { name: 'The Marshmallow Man stomping a building: four sprites, two of them changing legs', ...MAP, mm: true },
    { name: 'A lane dash on the road', bg: 12, mc: true, m1: 0, m2: 0, side: [12] },
    { name: 'The sing-along ball', bg: 0, mc: false, side: [13] },
    { name: 'The forklift’s two shapes, and its fork', ...SHOP, side: [1, 2, 3] },
    { name: 'PK energy detector', ...SHOP, side: [51] },
    { name: 'Image intensifier', ...SHOP, side: [52] },
    { name: 'Marshmallow sensor', ...SHOP, side: [53] },
    { name: 'Ghost bait', ...SHOP, side: [54] },
    { name: 'Item 4, which no shelf holds', ...SHOP, side: [55] },
    { name: 'Ghost trap', ...SHOP, side: [56] },
    { name: 'Ghost vacuum', ...SHOP, side: [57] },
    { name: 'Portable laser confinement system', ...SHOP, side: [58] },
    { name: 'The Activision logo that rides the bottom scroller, eight rows of a shape', bg: 0, mc: false, side: [59] },
  ];
  const ticks = [];
  function animate() {
    if (!ticks.length || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    let t = 0;
    setInterval(() => { t++; for (const f of ticks) f(t); }, 160);
  }
  function gallery(G) {
    const root = $('#gal'), bank = spriteBank(G), colour = SHAPE_COLOUR(G), S = 3;
    for (const g of GALLERY) {
      const fig = document.createElement('figure'); fig.className = 'gal-cell';
      const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      const n = g.side ? g.side.length : g.anim2 ? 2 : 1, big = g.mm ? 2 : 1;
      cv.width = (24 * S * big + 6) * n - 6; cv.height = 21 * S * big;
      cv.style.width = cv.width / 1.5 + 'px';
      cv.style.background = C64COL[g.bg];
      fig.appendChild(cv);
      const cap = document.createElement('figcaption'); cap.textContent = g.name; fig.appendChild(cap);
      root.appendChild(fig);
      const o = (k, mc) => ({ s: S, mc: mc == null ? g.mc : mc, col: colour(k), m1: g.m1, m2: g.m2 });
      const draw = t => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (g.layers) for (const [k, mc] of g.layers) drawShape(ctx, bank, k, { ...o(k, mc), x: 0, y: 0 });
        else if (g.side) g.side.forEach((k, i) => drawShape(ctx, bank, k, { ...o(k), x: i * (24 * S + 6), y: 0 }));
        else if (g.anim) { const k = g.anim[t % g.anim.length]; drawShape(ctx, bank, k, { ...o(k), x: 0, y: 0 }); }
        else if (g.anim2) g.anim2.forEach((a, i) => { const k = a[t % a.length]; drawShape(ctx, bank, k, { ...o(k), x: i * (24 * S + 6), y: 0 }); });
        else if (g.mm) {                          // st25_mm_stomps $8970: legs from $A909 and $A90D by step
          const step = t & 3;
          const parts = [[0x2B, 0, 0], [[0x2C, 0x2C, 0x31, 0x31][step], 0, 1], [0x2D, 1, 0], [[0x2E, 0x32, 0x32, 0x2E][step], 1, 1]];
          for (const [k, cx, cy] of parts) drawShape(ctx, bank, k, { ...o(k), x: cx * 24 * S, y: cy * 21 * S });
        }
      };
      draw(0);
      if (g.anim || g.anim2 || g.mm) ticks.push(draw);
    }
    animate();
  }
  // ---- Discoveries: item 4 beside the trap, the other $600 item ----
  function item4(G) {
    const cv = $('#item4'), ctx = cv.getContext('2d'), bank = spriteBank(G), colour = SHAPE_COLOUR(G), S = 4;
    ctx.fillStyle = C64COL[8]; ctx.fillRect(0, 0, cv.width, cv.height);
    [[56, 'Ghost trap'], [55, 'Item 4']].forEach(([k], i) =>
      drawShape(ctx, bank, k, { s: S, mc: true, col: colour(k), m1: 1, m2: 0, x: 16 + i * (24 * S + 32), y: 8 }));
  }
  const has = id => !!document.getElementById(id);
  const parts = G => [screens, has('lyr') && (() => singalong(G)), has('ph') && (() => speech(G)),
    has('ac-name') && account, has('bl-t') && (() => building(G)), has('st') && streams,
    has('gal') && (() => gallery(G)), has('item4') && (() => item4(G))].filter(Boolean);
  function run(G) {
    for (const f of parts(G)) { try { f(); } catch (e) { console.error(e); } }
  }
  const plain = () => { for (const f of [has('ac-name') && account, has('bl-t') && (() => building(null)), has('st') && streams].filter(Boolean)) { try { f(); } catch (e) { console.error(e); } } };
  if (!globalThis.C64) {
    ['#scr-map', '#scr-title'].forEach(id => { if ($(id)) need($(id)); });
    plain();
    if ($('#sid')) $('#sid').textContent = 'The player needs the site’s shared scripts: open this page from the built site.';
    return;
  }
  const needsMemory = has('lyr') || has('ph') || has('bl-t') || has('gal') || has('item4') || $$('canvas[id^="scr-"]').length;
  if (!needsMemory) { plain(); return; }
  C64.load('listing.json').then(run).catch(e => { console.error(e); plain(); });
})();
