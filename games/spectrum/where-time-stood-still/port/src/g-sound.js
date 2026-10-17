// The interrupt ($BEBE) with the clock ($BEEF), and the sound driver ($7000-$7B67): a frame of the
// current tune or of the sound effects, written to the AY.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.sound = function (P) {
  const M = P.M, w = P.w, setw = P.setw;

  // interrupt ($BEBE): the clock unless $BF30 stops it, then a frame of sound
  P.def(0xBEBE, 'interrupt', () => {
    if (!M[0xBF30]) P.clock();
    P.snd_frame();
    return {};
  });
  // clock ($BEEF): $BF2A counts frames to $3000, a day; its high byte halved is the hour ($BF2C).
  // At hour 0 the day count ($BF2D) goes up and $BF29 is set; at 6 the light ($BF2E) becomes day,
  // at 20 night, with $BF2F set
  P.def(0xBEEF, 'clock', () => {
    let hl = (w(0xBF2A) + 1) & 0xFFFF, a;
    if (hl >> 8 === 0x30) { hl &= 0xFF; a = 0; } else a = hl >> 9;
    setw(0xBF2A, hl);
    if (a === M[0xBF2C]) return {};
    M[0xBF2C] = a;
    if (a === 0) { M[0xBF29] = 4; M[0xBF2D] = (M[0xBF2D] + 1) & 255; return {}; }
    if (a === 6) { M[0xBF2E] = 0xC7; M[0xBF2F] = 4; return {}; }
    if (a === 0x14) { M[0xBF2E] = 0xC5; M[0xBF2F] = 4; }
    return {};
  });

  // --- the sound driver ---
  // A channel's state is 25 bytes from $7003 at the offset in $7993 (0, $19 or $32): +0/+1 a frame
  // counter, +2 and +3 an effect number, +4/+5 the pitch it slides to, +6/+7 the pitch now (four to
  // a semitone), +8/+9 the slide step, +$0A/+$0B the vibrato offset, +$0C/+$0D the AY period, +$0E/
  // +$0F the note's frames, +$10 the vibrato's delay, +$12 its row, +$13 the volume, +$14 the
  // envelope's row, +$15 its step, +$16 and +$17 its frame count and length, +$18 the mixer
  // (effects).
  const ch = () => 0x7003 + M[0x7993];
  P.def(0x7000, 'snd_frame', () => P.snd_step());
  P.def(0x7064, 'snd_frame_jp', () => P.snd_step());
  // snd_step ($704F): the sequencer, the three channels, the AY
  P.def(0x704F, 'snd_step', () => {
    P.snd_sequencer();
    P.snd_channel({ a: 0 }); P.snd_channel({ a: 0x19 }); P.snd_channel({ a: 0x32 });
    P.snd_write();
    return {};
  });
  P.def(0x7067, 'snd_channel', r => {
    M[0x7993] = r.a;
    P.snd_effects(); P.snd_envelope(); P.snd_vibrato(); P.snd_pitch();
    return {};
  });
  P.def(0x7077, 'snd_silence', () => { P.snd_quiet(); P.snd_write(); return {}; });
  // snd_sequencer ($707E): a request starts a tune at the next frame (the channels silenced now); a
  // pending tune becomes the current one; then the current tune's handler ($70BF)
  P.def(0x707E, 'snd_sequencer', () => {
    let a = M[0x7002];
    if (a) {
      M[0x704E] = a; M[0x7002] = 0; M[0x7992] = 0; M[0x7B4D] = 0x38;
      P.snd_quiet();
      return {};
    }
    a = M[0x704E];
    if (a) { M[0x7115] = a; M[0x7990] = 0; M[0x7991] = 0; M[0x798F] = 0; M[0x704E] = 0; }
    a = (M[0x7115] * 2) & 255;
    if (!a) return {};
    const to = w(0x70BF + a);
    return P.jump(to, { a, hl: to, de: 0x70C0 + a });
  });

  // A section's handler: the step every ten frames ($794C), then its channels' notes from their
  // patterns, notes [pattern, added, channel ('a' takes the vibrato row from the high nibble)],
  // with the step masked to 0-7 before each one listed in eight, the drum on steps 2 and 6 when
  // drum, and the next step ($7978).
  const section = (notes, drum, pre) => () => {
    const d = P.snd_divider({ e: 0x0A });
    if (!d.go) return {};
    let bc = d.bc;
    if (pre) bc = pre(bc);
    for (const [pat, add, chan, eight] of notes) {
      if (eight) bc &= 0xFF07;
      if (chan === 'a') P.snd_note_a({ e: add, hl: pat, bc });
      else P.snd_note({ a: chan, e: add, hl: pat, bc });
    }
    if (drum) P.snd_drum({ de: 0x0022, bc });
    return P.snd_advance();
  };
  P.def(0x7120, 'snd_tune2', section([[0x733F, 0x18, 'a'], [0x7405, 0x18, 0x19], [0x74CB, 0, 0x32]]));
  P.def(0x715E, 'snd_tune15', section([[0x71F2, 0x18, 'a'], [0x71B2, 0x13, 0x19], [0x71B2, 0, 0x32, true]], true));
  P.def(0x7188, 'snd_tune17', section([[0x7212, 0x18, 'a'], [0x71D2, 0x13, 0x19], [0x71B2, 0, 0x32, true]], true));
  P.def(0x7212, 'snd_tune18', section([[0x723C, 0x18, 'a'], [0x725C, 0x13, 0x19], [0x71B2, 0, 0x32, true]], true));
  P.def(0x72AC, 'snd_tune20', section([[0x727C, 0x13, 0x19], [0x723C, 0x18, 'a'], [0x71B2, 0, 0x32, true]], true));
  P.def(0x7315, 'snd_tune24', section([[0x71F2, 0x18, 'a'], [0x71B2, 0x13, 0x19], [0x71B2, 0, 0x32, true]]));
  // tune 23: the step's top three bits become the transposition, its low nibble picks channel A's
  // note
  P.def(0x72DF, 'snd_tune23', section([[0x729C, 0x18, 'a'], [0x71B2, 0x13, 0x19, true], [0x71B2, 0, 0x32]], false, bc => {
    const c = bc & 255;
    M[0x7992] = c >> 5;
    return (bc & 0xFF00) | (c & 0x0F);
  }));
  P.def(0x7143, 'snd_tune3', () => { M[0x7992] ^= 1; M[0x704E] = 2; return {}; });
  P.def(0x7151, 'snd_ret', () => ({}));
  P.def(0x7339, 'snd_tune26', () => { M[0x704E] = 0x0E; return {}; });
  P.def(0x7117, 'snd_tune1', () => P.snd_instruments({ a: 0, b: 8, c: 0x10 }));
  P.def(0x7155, 'snd_tune5', () => P.snd_instruments({ a: 0, b: 8, c: 0x10 }));
  P.def(0x72D6, 'snd_tune22', () => P.snd_instruments({ a: 8, b: 8, c: 0x10 }));
  P.def(0x7152, 'snd_jp_instr', r => P.snd_instruments(r));

  // snd_drum ($7591): on the steps whose bit ($75B5) is set in E, noise on channel A (period 0,
  // mixer $30) and the speaker bit set; otherwise tones only
  P.def(0x7591, 'snd_drum', r => {
    const bit = M[0x75B5 + (r.bc & 7)], e = r.de & 255;
    M[0x7B4D] = 0x38;
    if (e & bit) { M[0x7B4E] = 0; M[0x7B4D] = 0x30; P.io.out(0x10FE, 0x10); }
    return {};
  });
  // snd_note_a ($75BD): channel A's note from the pattern at HL plus the step: the high nibble its
  // vibrato row, the low nibble the note
  P.def(0x75BD, 'snd_note_a', r => {
    M[0x7993] = 0;
    const a = M[(r.hl + r.bc) & 0xFFFF];
    if (!a) return {};
    M[0x7015] = a & 0xF0;
    return note(a & 0x0F, r.e);
  });
  P.def(0x75D0, 'snd_note_a_plain', r => P.snd_note({ a: 0, e: r.e, hl: r.hl, bc: r.bc }));
  P.def(0x75D3, 'snd_note_b', r => P.snd_note({ a: 0x19, e: r.e, hl: r.hl, bc: r.bc }));
  P.def(0x75D7, 'snd_note_c', r => P.snd_note({ a: 0x32, e: r.e, hl: r.hl, bc: r.bc }));
  // snd_note ($75D9): a note on the channel at offset A from the pattern byte at HL plus the step:
  // its low 7 bits plus the transposition plus E, times four, the target pitch; bit 7 clear, the
  // pitch jumps there, set, it slides. The note's frames cleared, its envelope started
  P.def(0x75D9, 'snd_note', r => { M[0x7993] = r.a; return note(M[(r.hl + r.bc) & 0xFFFF], r.e); });
  function note(a, e) {
    M[0x798B] = a;
    a &= 0x7F;
    if (!a) return {};
    const p = (((a + M[0x7992] + e) & 255) * 4) & 255, c = ch();
    M[c + 4] = p; M[c + 5] = 0;
    if (!(M[0x798B] & 0x80)) { M[c + 6] = p; M[c + 7] = 0; }
    return start();
  }
  // $7604: the note's frames cleared, its envelope's frame count 1 and step $FF
  function start() {
    const c = ch();
    M[c + 0x0E] = 0; M[c + 0x0F] = 0; M[c + 0x16] = 1; M[c + 0x15] = 0xFF;
    return {};
  }
  // snd_pitch ($761C): the pitch moves by the slide step towards the target (not clamped), the
  // vibrato is added, and the result becomes an AY period: the octave is the pitch over 48, the
  // remainder picks a period from $7AA5, halved once for each octave and once more. The game reads
  // the channel through the stack pointer with the interrupts off.
  P.def(0x761C, 'snd_pitch', () => {
    const c = ch();
    const target = w(c + 4), now = w(c + 6), step = w(c + 8);
    let p = now;
    if (target !== now) p = target < now ? (now - step) & 0xFFFF : (now + step) & 0xFFFF;
    let hl = (p + w(c + 0x0A)) & 0xFFFF, b = 0;
    for (;;) { b = (b + 1) & 255; const carry = hl < 0x30; hl = (hl - 0x30) & 0xFFFF; if (carry) break; }
    hl = (hl + 0x30) & 0xFFFF;
    let de = w((hl * 2 + 0x7AA5) & 0xFFFF);
    for (let n = b || 256; n > 0; n--) de >>= 1;
    setw(c + 0x0C, de);
    setw(0x798D, p);
    setw(c + 6, p);
    return {};
  });
  // snd_envelope ($766D): every +$17 frames the step moves on, up to 15; the volume is the envelope
  // table's ($7A45) at the channel's row plus the step
  P.def(0x766D, 'snd_envelope', () => {
    const c = ch();
    M[c + 0x16] = (M[c + 0x16] - 1) & 255;
    if (M[c + 0x16]) return {};
    M[c + 0x16] = M[c + 0x17];
    if (M[c + 0x15] === 0x0F) return {};
    M[c + 0x15] = (M[c + 0x15] + 1) & 255;
    M[c + 0x13] = M[(0x7A45 + M[c + 0x14] + M[c + 0x15]) & 0xFFFF];
    return {};
  });
  // snd_vibrato ($7693): the note's frames counted; once more than the delay (+$10) have passed the
  // offset is the row's (+$12) at the frame count modulo 16, from $7995, sign extended; else 0
  P.def(0x7693, 'snd_vibrato', () => {
    const c = ch();
    const n = (w(c + 0x0E) + 1) & 0xFFFF;
    setw(c + 0x0E, n);
    let v = 0;
    if (M[c + 0x10] < n) {
      const o = M[(0x7995 + ((n & 0x0F) | M[c + 0x12])) & 0xFFFF];
      v = o & 0x80 ? 0xFF00 | o : o;
    }
    setw(c + 0x0A, v);
    return {};
  });
  // snd_effects ($76D3): with tune 4 (sound effects only) an effect number written to the
  // channel's +3 is taken and cleared each frame (the frame the +0/+1 counter rolls over, +2
  // instead, kept); it names a 16-byte instrument at $7795, copied into the channel and started
  P.def(0x76D3, 'snd_effects', () => {
    if (M[0x7115] !== 4) return {};
    const c = ch();
    let a;
    M[c] = (M[c] + 1) & 255;
    if (!M[c] && !(M[c + 1] = (M[c + 1] + 1) & 255)) a = M[c + 2];
    else { a = M[c + 3]; M[c + 3] = M[0x7994]; }
    if (!a) return {};
    const s = (0x7795 + ((a & 0x1F) << 4)) & 0xFFFF;
    const put = (to, from, n) => { for (let i = 0; i < n; i++) M[c + to + i] = M[s + from + i]; };
    put(0, 0, 3); put(4, 3, 6); put(0x10, 9, 3); put(0x14, 12, 1); put(0x17, 13, 2);
    P.snd_effect_mix();
    return start();
  });
  // snd_instrument ($7734): instrument A ($777D + A) into the channel at offset E
  P.def(0x7734, 'snd_instrument', r => {
    const c = 0x7003 + (r.e & 255), s = (0x777D + r.a) & 0xFFFF;
    const put = (to, from, n) => { for (let i = 0; i < n; i++) M[c + to + i] = M[s + from + i]; };
    put(8, 0, 2); put(0x10, 2, 3); put(0x14, 5, 1); put(0x17, 6, 2);
    return {};
  });
  // snd_instruments ($775C): the instruments of channels A, B and C from A, B and C, and the next
  // tune number chained
  P.def(0x775C, 'snd_instruments', r => {
    M[0x798B] = r.c; M[0x798C] = r.b;
    P.snd_instrument({ a: r.a, e: 0 });
    P.snd_instrument({ a: M[0x798C], e: 0x19 });
    P.snd_instrument({ a: M[0x798B], e: 0x32 });
    M[0x704E] = (M[0x7115] + 1) & 255;
    return {};
  });
  // snd_effect_mix ($7915): the mixer from channel A's +$18, the noise period from its +6
  P.def(0x7915, 'snd_effect_mix', () => { M[0x7B4D] = M[0x701B] ^ 0x39; M[0x7B4E] = M[0x7009]; return {}; });
  // snd_quiet ($7924): every channel's volume 0 and its envelope at its end
  P.def(0x7924, 'snd_quiet', () => {
    for (const c of [0x7003, 0x701C, 0x7035]) { M[c + 0x13] = 0; M[c + 2] = 0; M[c + 3] = 0; M[c + 0x15] = 0x0F; }
    return { a: 0x0F };
  });
  // snd_divider ($794C): the handler goes on (go) only on every E-th frame, the speaker bit cleared
  // then; BC the step counter
  P.def(0x794C, 'snd_divider', r => {
    const bc = w(0x7990), a = (M[0x798F] + 1) & 255;
    const go = a === r.e;
    if (go) { M[0x798F] = 0; P.io.out(0x00FE, 0); } else M[0x798F] = a;
    return { go, bc };
  });
  // snd_next_step ($7962): the step counter on; true at the section's length ($70FB)
  P.def(0x7962, 'snd_next_step', () => {
    const len = M[(0x70FB + w(0x7115)) & 0xFFFF] | M[0x7116] << 8, n = (w(0x7990) + 1) & 0xFFFF;
    setw(0x7990, n);
    return { end: n === len };
  });
  P.def(0x7978, 'snd_advance', () => { if (P.snd_next_step().end) M[0x704E] = (M[0x7115] + 1) & 255; return {}; });
  P.def(0x7983, 'snd_advance_to', r => { if (P.snd_next_step().end) M[0x704E] = r.e; return {}; });
  // snd_write ($7B05): the three periods to registers 0-5, the noise period to 6, the volumes to
  // 8-10 and the mixer to 7
  P.def(0x7B05, 'snd_write', () => {
    P.ay_write_word({ a: 0, hl: w(0x700F) });
    P.ay_write_word({ a: 2, hl: w(0x7028) });
    P.ay_write_word({ a: 4, hl: w(0x7041) });
    P.ay_write({ a: 6, c: M[0x7B4E] });
    P.ay_write({ a: 8, c: M[0x7016] });
    P.ay_write({ a: 9, c: M[0x702F] });
    P.ay_write({ a: 10, c: M[0x7048] });
    P.ay_write({ a: 7, c: M[0x7B4D] & 0x3F });
    return {};
  });
  P.def(0x7B4F, 'ay_write_word', r => { P.ay_write({ a: r.a, c: r.hl & 255 }); P.ay_write({ a: r.a + 1, c: r.hl >> 8 }); return {}; });
  P.def(0x7B5B, 'ay_write', r => { P.io.out(0xFFFD, r.a); P.io.out(0xBFFD, r.c); return {}; });
};
})(typeof window !== 'undefined' ? window : globalThis);
