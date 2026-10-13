// The game's music driver ($F477-$F921 and the command handlers at $7305-$7429), ported from the
// listing for the Play tab and checked against the game's code for every frame of all twelve
// tunes (play.html, section 01). It runs on a copy of the game's memory (data: the 64 KB the
// listing gives) and writes the SID through sidWrite, as site/lib/sid.js expects of a driver.
function createDriver(data) {
  'use strict';
  const pristine = Uint8Array.from(data), M = new Uint8Array(65536);
  const sid = new Uint8Array(25);
  let writes = [];
  const P = { M, io: { sidWrite: (r, v) => { r &= 0x1F; v &= 0xFF; if (r < 25) sid[r] = v; writes.push(r, v); } } };
  const io = () => P.io;
  const b = v => (v === undefined ? 0 : v & 255);
  const ret = (r, patch, flags) => Object.assign({ a: b(r.a), x: b(r.x), y: b(r.y) }, patch || {}, flags || {});
  const inc = a => { M[a] = (M[a] + 1) & 255; return M[a]; };
  const dec = a => { M[a] = (M[a] - 1) & 255; return M[a]; };
  const nz = v => ({ z: (v & 255) === 0 ? 1 : 0, n: (v >> 7) & 1 });
  // regs(r, patch, flags): the registers r with patch's values written over them, then flags'.
  const regs = (r, patch, flags) => Object.assign({}, r, patch || {}, flags || {});
  // Binary add with carry in: returns { a, c, z, n, v }.
  function adc(a, b, cin) {
    const s = (a & 255) + (b & 255) + (cin ? 1 : 0);
    return { a: s & 255, c: s > 255 ? 1 : 0, v: ((~(a ^ b) & (a ^ s)) & 0x80) ? 1 : 0, ...nz(s) };
  }
  // Binary subtract with borrow (6502 SBC: carry set means no borrow).
  function sbc(a, b, cin) {
    const s = (a & 255) - (b & 255) - (cin ? 0 : 1);
    return { a: s & 255, c: s >= 0 ? 1 : 0, v: (((a ^ b) & (a ^ s)) & 0x80) ? 1 : 0, ...nz(s) };
  }
  // Decimal-mode ADC as the NMOS 6502 does it (the score routines run with SED).
  function adcDec(a, b, cin) {
    const c = cin ? 1 : 0;
    let lo = (a & 15) + (b & 15) + c;
    if (lo > 9) lo += 6;
    let hi = (a >> 4) + (b >> 4) + (lo > 15 ? 1 : 0);
    const bin = (a + b + c) & 255;
    const v = ((~(a ^ b) & (a ^ (hi << 4))) & 0x80) ? 1 : 0;
    const n = ((hi << 4) & 0x80) ? 1 : 0;
    if (hi > 9) hi += 6;
    return { a: ((hi << 4) | (lo & 15)) & 255, c: hi > 15 ? 1 : 0, z: bin === 0 ? 1 : 0, n, v };
  }
  // Compare: the flags of CMP a, b.
  const cmp = (a, b) => ({ c: (a & 255) >= (b & 255) ? 1 : 0, ...nz((a - b) & 255) });
  
  
  const COMMANDS = {
    0x7305: 'mus_loop_start', 0x7317: 'mus_loop_end', 0x7333: 'mus_instrument_short', 0x7336: 'mus_instrument',
    0x735D: 'mus_transpose', 0x7366: 'mus_arpeggio', 0x7378: 'mus_filter_all', 0x737C: 'mus_filter_me',
    0x7388: 'mus_filter_off', 0x738E: 'mus_call_transposed', 0x7396: 'mus_call', 0x73B7: 'mus_jump',
    0x73BD: 'mus_return', 0x73DD: 'mus_filter_settings', 0x73F5: 'mus_hold',
  };
  // =============================================================================================
  // The music driver
  // =============================================================================================
  const sptr = () => M[0x85] | (M[0x86] << 8);
  const sread = y => M[(sptr() + (y & 255)) & 0xFFFF];               // (snd_ptr),y

  // $F477: start the tune whose record lies at tune_table + Y - 4: the three voices' addresses
  // (Y, Y-2, Y-4), their transposition, modulation flags, stack, wait and flags reset, and the
  // table of 32 note lengths as multiples of the tempo (the ADC's operand at $F4B3).
  P.start_tune = function (r) {
    let y = b(r.y), a = 0, x;
    M[0xF4B3] = M[(0xF924 + y) & 0xFFFF];
    for (x = 2; x >= 0; x--) {
      M[0x8A + x] = M[(0xF922 + y) & 0xFFFF];
      M[0x8D + x] = M[(0xF923 + y) & 0xFFFF];
      M[0x9E] = y;
      const i = M[0x742D + x];
      M[0x87 + x] = 0; M[0xF2BB + i] = 0; M[0xF2BF + i] = 0;
      M[0x82 + x] = M[0x7433 + x];
      M[0xA0 + x] = 1; M[0xF308 + x] = 1; M[0xF305 + x] = 1;
      y = (M[0x9E] - 2) & 255;
    }
    for (x = 0; x < 0x20; x++) { a = (a + M[0xF4B3]) & 255; M[0xF39A + x] = a; }
    return ret(r, { a, x: 0x20, y }, { c: 1, z: 1, n: 0 });
  };
  // $F4BD: 8 then 0 to every SID register below the volume; the voices off, their release
  // counts, the filter flag and the data flags clear, no filter voice, volume $1F.
  P.silence = function (r) {
    const c = io();
    for (let x = 0x16; x >= 0; x--) { c.sidWrite(x, 0x08); c.sidWrite(x, 0x00); }
    M[0xF305] = 0xFF; M[0xF306] = 0xFF; M[0xF307] = 0xFF;
    for (const a of [0xF337, 0xF35A, 0xF37D, 0xF391, 0xF308, 0xF309, 0xF30A]) M[a] = 0;
    M[0x91] = 0xFF;
    c.sidWrite(0x18, 0x1F);
    return ret(r, { a: 0, x: 0x1F }, nz(0x1F));
  };
  // $F4F2: copy the filter settings to their working block, four of them on to the counters,
  // and write the cutoff ($F392/$F393, an 11-bit value) to $D415/$D416. X is kept.
  P.filter_restart = function (r) {
    const c = io(), x0 = b(r.x);
    M[0x80] = x0;
    for (let i = 0x0F; i >= 0; i--) M[0xF384 + i] = M[0xF30B + i];
    const x = M[0xF392], y = M[0xF393];
    M[0xF394] = x; M[0xF395] = y;
    M[0xF396] = M[0xF38C]; M[0xF397] = M[0xF38D]; M[0xF398] = M[0xF38E]; M[0xF399] = M[0xF38F];
    c.sidWrite(0x15, x & 0x07);
    M[0xA3] = ((x >> 2) | ((y & 3) << 6)) & 255;    // snd_tmp2 after the two RORs
    const a = ((x >> 3) | ((y & 7) << 5)) & 255;
    c.sidWrite(0x16, a);
    return ret(r, { a, x: x0, y }, { c: (x >> 2) & 1, ...nz(x0) });
  };
  // $F53C: once a frame. For each voice (2 down to 0): step its stream while it has data, counting
  // the voices with data in tune_playing; run its envelope and modulations while its release
  // count is non-zero.
  P.music_frame = function (r) {
    let a = 0, y = b(r.y);
    M[0xA4] = 0;
    for (let x = 2; x >= 0; x--) {
      a = M[0xF308 + x];
      if (a !== 0) { inc(0xA4); r = P.voice_step({ a, x, y }); a = b(r.a); y = b(r.y); }
      y = M[0x7430 + x]; a = M[0xF337 + y];
      if (a !== 0) { r = P.voice_frame({ a, x, y }); a = b(r.a); y = b(r.y); }
    }
    return { a, x: 0xFF, y, n: 1, z: 0 };
  };
  // $F55B: count the wait down; at zero load the position and read the next events.
  P.voice_step = function (r) {
    const x = b(r.x);
    const w = dec(0xA0 + x);
    if (w !== 0) return ret(r, {}, nz(w));
    M[0x85] = M[0x8A + x]; M[0x86] = M[0x8D + x];
    return voice_read(ret(r, { a: M[0x86] }, nz(M[0x86])));
  };
  // $F56F: the next event. A command's handler is found by writing the command EOR $C0 into the
  // JMP's operand at $F57C and reading the vector it then points at.
  function voice_read(r) {
    const a = sread(0);
    if (!(a & 0x80)) return voice_note(ret(r, { a, y: 0 }, nz(a)));
    const cmd = a ^ 0xC0;
    M[0xF57C] = cmd;
    const v = M[0xF57C] | (M[0xF57D] << 8);
    const target = M[v] | (M[(v + 1) & 0xFFFF] << 8);
    const name = COMMANDS[target];
    if (!name) throw new Error('voice_read: command $' + a.toString(16) + ' dispatches to $' + target.toString(16));
    return P[name](ret(r, { a: cmd, y: 1 }, nz(cmd)));
  }
  // $F56A, $F56C: skip 1 or A bytes and read the next event.
  const mus_next_a = r => voice_read(P.mus_advance(r));
  const mus_next_1 = r => mus_next_a(ret(r, { a: 1 }));
  // $F581: a note (A). $5F and up are rests. Otherwise, with the voice enabled: oscillator reset
  // (control 8), the note's frequency (transposed) kept in the working block, the instrument's
  // pulse width, waveform and envelope written to the voice's seven registers, the control
  // without the test bit, the pulse sweep reloaded, the 24 modulation bytes copied to the
  // working block, the arpeggio's base note or the frequency modulation restarted, and the gate
  // and release counts set. Then the length.
  function voice_note(r) {
    const c = io(), x = b(r.x);
    let a = b(r.a), y;
    M[0x90] = a;
    if (a >= 0x5F) return voice_duration(ret(r, { a }, cmp(a, 0x5F)));
    M[0x78] = (a + M[0x87 + x]) & 255;
    a = M[0xF305 + x];
    if (a === 0) return voice_duration(ret(r, { a }, nz(a)));
    M[0x7C] = 0x08;
    y = M[0x7436 + x]; c.sidWrite(4 + y, 0x08);
    if (x === M[0x91]) r = P.filter_restart(ret(r, { a: 8, y }, { c: 1, z: 1, n: 0 }));
    y = M[0x78];
    const fh = M[0xF418 + y]; M[0x79] = fh;
    const fl = M[0xF3B9 + y]; M[0x78] = fl;
    y = M[0x7430 + x]; M[0xF333 + y] = fl; M[0xF334 + y] = fh;
    y = M[0x742D + x];
    M[0x7A] = M[0xF2C4 + y]; M[0x7B] = M[0xF2C5 + y]; M[0x7D] = M[0xF2C7 + y]; M[0x7E] = M[0xF2C8 + y];
    a = M[0xF2C6 + y];
    y = M[0x7430 + x]; M[0xF335 + y] = a;
    const ctrl = a & 0xF7;
    M[0x7F] = x;
    y = (M[0x7437 + x] - 1) & 255;
    for (let i = 6; i >= 0; i--) { c.sidWrite(y, M[0x78 + i]); y = (y - 1) & 255; }
    y = (y + 1) & 255;
    c.sidWrite(4 + y, ctrl);
    y = M[0x7430 + x];
    r = P.pulse_mod_reload(ret(r, { a: ctrl, y }));
    M[0xF608] = M[0x7357 + x]; M[0xF60B] = M[0x735A + x];
    const src = M[0xF608] | (M[0xF609] << 8), dst = M[0xF60B] | (M[0xF60C] << 8);
    for (y = 0x17; y >= 0; y--) M[(dst + y) & 0xFFFF] = M[(src + y) & 0xFFFF];
    y = M[0x7430 + x];
    a = M[0xF328 + y] & 0x08;
    let restart = true;
    if (a !== 0) { a = (M[0x90] + M[0x87 + x]) & 255; M[0xF325 + y] = a; restart = a === 0; }   // BNE: a base note of 0 restarts too
    if (restart) r = P.freq_mod_restart(ret(r, { a, y }));
    // b_F627
    y = M[0x742D + x];
    const gate = M[0xF2C9 + y], rel = M[0xF2CA + y];
    y = M[0x7430 + x];
    M[0xF337 + y] = rel; M[0xF336 + y] = gate;
    return voice_duration(ret(r, { a: gate, y }));
  }
  // $F63B: the length byte: through note_lengths_m1 unless the note is $60 (then as it is); the
  // wait set, the pointer moved past the two bytes and kept as the voice's position.
  function voice_duration(r) {
    const x = b(r.x);
    let a = sread(1), y = M[0x90];
    if (y !== 0x60) { y = a; a = M[0xF399 + y]; }
    M[0xA0 + x] = a;
    r = P.mus_advance(ret(r, { a: 2, y }));
    M[0x8A + x] = M[0x85];
    a = M[0x86]; M[0x8D + x] = a;
    return ret(r, { a, y }, nz(a));
  }

  // --- the commands (entered with X the voice, Y = 1, A the command EOR $C0) ---------------------
  // $7305 ($80): the repeat count that follows onto the voice's stack, push the position after it.
  P.mus_loop_start = function (r) {
    const x = b(r.x);
    const a = sread(b(r.y));
    const y = M[0x82 + x]; M[0xF292 + y] = a;
    r = P.mus_advance(ret(r, { a: 2, y }));
    r = P.mus_push_position(r);
    return voice_read(r);
  };
  // $7317 ($82): count the top repeat down; more to go: back to the pushed position; else drop it
  // and skip the command byte.
  P.mus_loop_end = function (r) {
    const x = b(r.x);
    dec(0x82 + x);
    const y = M[0x82 + x];
    const a = (M[0xF292 + y] - 1) & 255; M[0xF292 + y] = a;
    if (a === 0) return mus_next_a(ret(r, { a: 1, y }));
    r = P.mus_pop_position(ret(r, { a, y }));
    inc(0x82 + x);
    return mus_next_a(ret(r, { a: 0 }));
  };
  // $7333 ($84), $7336 ($86): 14 or 29 bytes from the address that follows into the voice's
  // instrument block (the STA's operand at $734D patched from instrument_block_lo).
  P.mus_instrument_short = function (r) { return copy_instrument(r, 0x0D); };
  P.mus_instrument = function (r) { return copy_instrument(r, 0x1C); };
  function copy_instrument(r, n) {
    const x = b(r.x);
    let y = b(r.y), a = 0;
    M[0x78] = sread(y); y = (y + 1) & 255; M[0x79] = sread(y);
    M[0x734D] = M[0x7357 + x];
    const src = M[0x78] | (M[0x79] << 8), dst = M[0x734D] | (M[0x734E] << 8);
    for (y = n; y >= 0; y--) { a = M[(src + y) & 0xFFFF]; M[(dst + y) & 0xFFFF] = a; }
    return mus_next_a(ret(r, { a: 3, y: 0xFF }));
  }
  // $735D ($88): the transposition.
  P.mus_transpose = function (r) {
    const x = b(r.x);
    M[0x87 + x] = sread(b(r.y));
    return mus_next_a(ret(r, { a: 2 }));
  };
  // $7366 ($8A): the arpeggio table ($F2xx) into the instrument block.
  P.mus_arpeggio = function (r) {
    const x = b(r.x);
    const a = sread(b(r.y)), y = M[0x742D + x];
    M[0xF2B6 + y] = a; M[0xF2B7 + y] = 0xF2;
    return mus_next_a(ret(r, { a: 2, y }));
  };
  // $7378 ($8C), $737C ($8E), $7388 ($90): the filter routing ($D417), and which voice drives it.
  P.mus_filter_all = function (r) { io().sidWrite(0x17, 0xF7); return mus_next_1(ret(r, { y: 0xF7 })); };
  P.mus_filter_me = function (r) {
    const x = b(r.x), y = M[0x742A + x];
    M[0x91] = x; io().sidWrite(0x17, y);
    return mus_next_1(ret(r, { a: x, y }));
  };
  P.mus_filter_off = function (r) {
    M[0x91] = 0x03; io().sidWrite(0x17, 0x78);
    return mus_next_1(ret(r, { a: 3, y: 0x78 }));
  };
  // $738E ($92), $7396 ($94): a pattern call, with the transposition first for $92. The position
  // after the arguments is pushed, then the pointer is reloaded with the address at + Y (the LDY's
  // operand at $73B0, written from Y just before).
  P.mus_call_transposed = function (r) {
    const x = b(r.x);
    M[0x87 + x] = sread(b(r.y));
    return call_pattern(r, 0x04, (b(r.y) + 1) & 255);
  };
  P.mus_call = function (r) { return call_pattern(r, 0x03, b(r.y)); };
  function call_pattern(r, a, y) {
    M[0x73B0] = y;
    const lo = M[0x85], hi = M[0x86];
    r = P.mus_advance(ret(r, { a, y: a }));
    r = P.mus_push_position(r);
    M[0x86] = hi; M[0x85] = lo;
    r = P.mus_read_address(ret(r, { a: lo, y: M[0x73B0] }));
    return voice_read(r);
  }
  // $73B7 ($96): continue at the address that follows.
  P.mus_jump = function (r) { return voice_read(P.mus_read_address(r)); };
  // $73BD ($98): return from a pattern; at the stack's base the voice is finished instead.
  P.mus_return = function (r) {
    const x = b(r.x);
    const a = M[0x82 + x];
    if (a === M[0x7433 + x]) { const d = dec(0xF308 + x); return ret(r, { a }, { c: 1, ...nz(d) }); }
    dec(0x82 + x);
    r = P.mus_pop_position(ret(r, { a }));
    return voice_read(r);
  };
  // $73D0: the pointer from the top of the voice's stack.
  P.mus_pop_position = function (r) {
    const x = b(r.x), y = M[0x82 + x];
    M[0x85] = M[0xF28A + y];
    const a = M[0xF28E + y]; M[0x86] = a;
    return ret(r, { a, y }, nz(a));
  };
  // $73DD ($9A): 16 bytes from the address that follows into the filter settings.
  P.mus_filter_settings = function (r) {
    let y = b(r.y), a = 0;
    M[0x78] = sread(y); y = (y + 1) & 255; M[0x79] = sread(y);
    const src = M[0x78] | (M[0x79] << 8);
    for (y = 0x0F; y >= 0; y--) { a = M[(src + y) & 0xFFFF]; M[0xF30B + y] = a; }
    return mus_next_a(ret(r, { a: 3, y: 0xFF }));
  };
  // $73F5 ($9C): sustain/release $FF and release time $FE in the instrument block.
  P.mus_hold = function (r) {
    const x = b(r.x), y = M[0x742D + x];
    M[0xF2C8 + y] = 0xFF; M[0xF2CA + y] = 0xFE;
    return mus_next_1(ret(r, { a: 0xFE, y }));
  };
  // $7405: push the pointer on the voice's stack.
  P.mus_push_position = function (r) {
    const x = b(r.x), y = M[0x82 + x];
    M[0xF28A + y] = M[0x85]; M[0xF28E + y] = M[0x86];
    const d = inc(0x82 + x);
    return ret(r, { a: M[0x86], y }, nz(d));
  };
  // $7414: the pointer replaced by the address at pointer + Y.
  P.mus_read_address = function (r) {
    let y = b(r.y);
    const lo = sread(y); y = (y + 1) & 255; const hi = sread(y);
    M[0x86] = hi; M[0x85] = lo;
    return ret(r, { a: lo, y }, nz(lo));
  };
  // $7420: A added to the pointer.
  P.mus_advance = function (r) {
    const s = adc(b(r.a), M[0x85], 0);
    M[0x85] = s.a;
    if (s.c) { const h = inc(0x86); return ret(r, { a: s.a }, { c: 1, v: s.v, ...nz(h) }); }
    return ret(r, { a: s.a }, { c: 0, z: s.z, n: s.n, v: s.v });
  };

  // --- the modulations -------------------------------------------------------------------------
  // $F659: the working frequency back to the note's, then the four counters reloaded.
  P.freq_mod_restart = function (r) {
    const x = b(r.x), y = b(r.y);
    M[0x98 + x] = M[0xF333 + y]; M[0x7A] = M[0xF333 + y];
    M[0x9B + x] = M[0xF334 + y]; M[0x7B] = M[0xF334 + y];
    return P.freq_mod_reload(ret(r, { a: M[0x7B] }));
  };
  // $F667: the four step counters from their lengths.
  P.freq_mod_reload = function (r) {
    const y = b(r.y);
    M[0xF33B + y] = M[0xF326 + y]; M[0xF33A + y] = M[0xF325 + y]; M[0xF339 + y] = M[0xF324 + y];
    const a = M[0xF323 + y]; M[0xF338 + y] = a;
    return ret(r, { a }, nz(a));
  };
  // $F680: the pulse width back to its start, then the counters.
  P.pulse_mod_restart = function (r) {
    const x = b(r.x), y = M[0x7430 + x];
    M[0x7A] = M[0xF331 + y]; M[0x7B] = M[0xF332 + y];
    return P.pulse_mod_reload(ret(r, { a: M[0x7B], y }));
  };
  // $F68D: the working pulse width kept per voice, the two sweep counters reloaded.
  P.pulse_mod_reload = function (r) {
    const x = b(r.x), y = M[0x7430 + x];
    M[0x92 + x] = M[0x7A]; M[0x95 + x] = M[0x7B];
    M[0xF33C + y] = M[0xF329 + y];
    const a = M[0xF32A + y]; M[0xF33D + y] = a;
    return ret(r, { a, y }, nz(a));
  };

  // $F6A5: one frame of a sounding voice (X the voice, Y its working block's offset). The gate:
  // with bit 3 of the working control set, when the wait drops below the gate time clear the gate
  // and write the control; otherwise count the gate time down and then the release count, and
  // at the end of the release zero the voice's registers (and the filter flag if it drives the
  // filter). The pulse sweep: after its delay, up then down by the two rates, repeating by its
  // flags. Then an arpeggio (flag bit 3, not on voice 3) or the four-step frequency modulation.
  P.voice_frame = function (r) {
    const c = io(), x = b(r.x);
    let y = b(r.y), a;
    let toPulse = false, gateOff = null;
    a = M[0xF335 + y] & 0x08;
    if (a !== 0) {
      a = M[0xA0 + x];
      if (a >= M[0xF336 + y]) toPulse = true;
      else {
        M[0xF336 + y] = 0;
        a = M[0xF335 + y] & 0xF6; M[0xF335 + y] = a;
        if (a !== 0) gateOff = a;                    // else on into b_F6C2
      }
    }
    if (!toPulse && gateOff === null) {
      // b_F6C2
      a = M[0xF336 + y];
      if (a === 0) {
        a = M[0xF337 + y];
        if (((a + 1) & 255) === 0) toPulse = true;   // $FF: rings on
        else {
          a = (a - 1) & 255; M[0xF337 + y] = a;
          if (a !== 0) toPulse = true;
          else {
            M[0x7F] = x;
            y = (M[0x7437 + x] - 1) & 255;
            for (let i = 6; i >= 0; i--) { c.sidWrite(y, 0); y = (y - 1) & 255; }
            if (x === M[0x91]) M[0xF391] = 0;
            return ret(r, { a: 0, y }, cmp(x, M[0x91]));
          }
        }
      } else {
        // b_F6EF
        if (((a + 1) & 255) === 0) toPulse = true;
        else {
          a = (a - 1) & 255; M[0xF336 + y] = a;
          if (a !== 0) toPulse = true;
          else gateOff = M[0xF335 + y] & 0xF6;
        }
      }
    }
    if (gateOff !== null) {
      // b_F703
      y = M[0x7436 + x]; c.sidWrite(4 + y, gateOff);
      y = M[0x7430 + x]; a = gateOff;
    }
    // b_F70C: the pulse sweep
    a = M[0xF32C + y];
    if (a !== 0) {
      a = M[0xF32B + y];
      if (a !== 0) { a = (a - 1) & 255; M[0xF32B + y] = a; }
      else {
        for (let guard = 0; ; guard++) {             // b_F71F
          if (guard > 1000) throw new Error('voice_frame: the pulse sweep repeats with no length (the game hangs here)');
          M[0x7A] = M[0x92 + x]; M[0x7B] = M[0x95 + x];
          a = M[0xF33C + y];
          if (a !== 0) { M[0xF33C + y] = (a - 1) & 255; add16(M[0xF32D + y], M[0xF32E + y]); break; }
          a = M[0xF33D + y];
          if (a !== 0) { M[0xF33D + y] = (a - 1) & 255; add16(M[0xF32F + y], M[0xF330 + y]); break; }
          a = M[0xF32C + y] & 0x81;
          if (a === 0) break;
          r = (a & 0x80) ? P.pulse_mod_restart(ret(r, { a, y })) : P.pulse_mod_reload(ret(r, { a, y }));
        }
        // j_F776
        y = M[0x7436 + x];
        c.sidWrite(2 + y, M[0x7A]); M[0x92 + x] = M[0x7A];
        a = M[0x7B]; c.sidWrite(3 + y, a); M[0x95 + x] = a;
        y = M[0x7430 + x];
      }
    }
    // b_F78A: the frequency
    a = M[0xF328 + y];
    if (a === 0) return ret(r, { a, y }, nz(a));
    if ((a & 0x08) && x !== 2) {
      // the arpeggio: every rate3 frames the next offset of the table at len1/len2, from the
      // base note in len3, the index counting down in freq_delay from the table's length in len4
      a = (M[0xF31F + y] - 1) & 255; M[0xF31F + y] = a;
      if (a !== 0) return ret(r, { a, y }, { c: 1, ...nz(a) });
      M[0xF31F + y] = M[0xF321 + y];
      M[0x80] = M[0xF323 + y]; M[0x81] = M[0xF324 + y];
      const base = M[0xF325 + y];
      a = M[0xF327 + y];
      if (a & 0x80) a = M[0xF326 + y];
      y = a;
      const note = (base + M[((M[0x80] | (M[0x81] << 8)) + y) & 0xFFFF]) & 255;
      y = (y - 1) & 255;
      M[0xF327 + M[0x7430 + x]] = y;
      y = note;
      const fh = M[0xF418 + y], fl = M[0xF3B9 + y];
      y = M[0x7436 + x];
      c.sidWrite(y, fl); c.sidWrite(1 + y, fh);
      return ret(r, { a: fh, y }, nz(fh));
    }
    // b_F7E0: the four steps
    M[0x7A] = M[0x98 + x]; M[0x7B] = M[0x9B + x];
    a = M[0xF327 + y];
    if (a !== 0) {
      a = (a - 1) & 255; M[0xF327 + y] = a;
      a = M[0xF328 + y] & 0x02;
      if (a === 0) return ret(r, { a, y }, nz(a));
      return freq_step(r, y, 0xF321);                // b_F851
    }
    for (let guard = 0; ; guard++) {                 // b_F7FB
      if (guard > 1000) throw new Error('voice_frame: the frequency modulation repeats with no length (the game hangs here)');
      a = M[0xF338 + y]; if (a !== 0) { M[0xF338 + y] = (a - 1) & 255; return freq_step(r, y, 0xF31B); }
      a = M[0xF339 + y]; if (a !== 0) { M[0xF339 + y] = (a - 1) & 255; return freq_step(r, y, 0xF31D); }
      a = M[0xF33A + y]; if (a !== 0) { M[0xF33A + y] = (a - 1) & 255; return freq_step(r, y, 0xF31F); }
      a = M[0xF33B + y]; if (a !== 0) { M[0xF33B + y] = (a - 1) & 255; return freq_step(r, y, 0xF321); }
      a = M[0xF328 + y] & 0x81;                      // b_F872
      if (a === 0) return freq_out(r);
      r = (a & 0x80) ? P.freq_mod_restart(ret(r, { a, y })) : P.freq_mod_reload(ret(r, { a, y }));
    }
  };
  // $7A/$7B plus a 16-bit rate.
  function add16(lo, hi) {
    const s = adc(M[0x7A], lo, 0); M[0x7A] = s.a;
    M[0x7B] = adc(M[0x7B], hi, s.c).a;
  }
  // $F806 and the like: the working frequency plus the step's rate, then out.
  function freq_step(r, y, rate) {
    add16(M[rate + y], M[rate + 1 + y]);
    return freq_out(r);
  }
  // $F860: the working frequency kept per voice and written to the SID.
  function freq_out(r) {
    const c = io(), x = b(r.x), y = M[0x7436 + x];
    M[0x98 + x] = M[0x7A]; c.sidWrite(y, M[0x7A]);
    const a = M[0x7B]; M[0x9B + x] = a; c.sidWrite(1 + y, a);
    return ret(r, { a, y }, nz(a));
  }
  const TUNES = 12;
  return {
    sid, get writes() { return writes; },
    // as the game does: silence at start-up sets the master volume ($D418, $1F), which no tune
    // routine writes; then start_tune and one step, as play_tune does
    init(t) { M.set(pristine); sid.fill(0); writes = []; P.silence({ a: 0, x: 0xFF, y: 0 }); P.start_tune({ a: 0, x: 0, y: 4 + 7 * (t % TUNES) }); P.music_frame({ a: 0, x: 0, y: 0 }); },
    play() { writes = []; P.music_frame({ a: 0, x: 0, y: 0 }); },
    stop() { P.silence({ a: 0, x: 0, y: 0 }); },
    playing() { return M[0xA4] !== 0; },
    voice(x) { return { data: M[0x8A + x] | (M[0x8D + x] << 8), transpose: M[0x87 + x] }; },
  };
}
window.BBMUSIC = { createDriver };
