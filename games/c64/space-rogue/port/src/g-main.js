// The resident engine's frame: the main loop of flight, the interrupt (the frame count, the
// keyboard and the sound effects), the banking, the disk, the keyboard buffer, the joystick and
// the random numbers. SR's code from $0DE7 to $193A and from $A24D to $A499.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.main = function (P) {
  const M = P.M, io = P.io;
  const R = (r, o) => Object.assign({}, r, o);

  // ---- the main loop of flight ($0DED): each pass moves everything, reads a key and checks the
  // collisions; then, unless the frames it took leave the drawing behind (frame_skip3's carry),
  // draws the view and the arrows and shows the buffer just drawn
  P.main_loop = function* () {
    for (;;) {
      yield { cp: 0x0DED }; yield* P.frame_update();
      yield { cp: 0x0DF0 }; P.age_objects();
      yield { cp: 0x0DF3 }; yield* P.ship_ai();
      yield { cp: 0x0DF6 }; P.turn_objects();
      yield { cp: 0x0DF9 }; P.apply_thrust();
      yield { cp: 0x0DFC }; yield* P.gravity();
      yield { cp: 0x0DFF }; P.move_objects();
      yield { cp: 0x0E02 }; yield* P.do_key();
      yield { cp: 0x0E05 }; yield* P.check_collisions();
      yield { cp: 0x0E08 };
      if (P.frame_skip3().c) continue;
      yield { cp: 0x0E0D }; P.update_camera();
      yield { cp: 0x0E10 }; P.place_particles();
      yield { cp: 0x0E13 }; yield* P.draw_frame();
      yield { cp: 0x0E16 }; P.sector_hazard();
      yield { cp: 0x0E19 }; P.draw_target_arrows();
      yield { cp: 0x0E1C }; P.flip_buffers();
    }
  };
  P.MAIN_LOOP = [0x0DED, 0x0DF0, 0x0DF3, 0x0DF6, 0x0DF9, 0x0DFC, 0x0DFF, 0x0E02, 0x0E05, 0x0E08, 0x0E0D, 0x0E10,
    0x0E13, 0x0E16, 0x0E19, 0x0E1C];
  P.CHECKPOINTS.push(...P.MAIN_LOOP);

  // ---- the machine for play ($0E22): the I/O in, $02 = $40, a raster interrupt at line $32 and
  // none from CIA 1, the vectors in RAM and at $0314-$0319 pointed at the game's handlers
  P.setup_irq = function (r) {
    M[1] = (M[1] & 0xFC) | 1;
    M[2] = 0x40;
    io.vicWrite(0x12, 0x32);
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x1A, 1);
    io.ciaWrite(0x0D, 0x7F);
    M[0x0318] = 0x9E; M[0x0319] = 0x0E; M[0xFFFA] = 0x9E; M[0xFFFB] = 0x0E;   // NMI: an RTI
    M[0x0316] = 0x9F; M[0x0317] = 0x0E; M[0xFFFC] = 0x9F; M[0xFFFD] = 0x0E;   // BRK and reset: an RTI
    M[0x0314] = 0xA5; M[0x0315] = 0x0E;                                        // the KERNAL's IRQ: irq_body
    M[0xFFFE] = 0xA0; M[0xFFFF] = 0x0E;                                        // all RAM: irq_entry
    P.clear_keybuf();
    P.sound_init();
    P.bank_all_ram();
    return R(r, { a: 0x0E, x: 0xA0, y: 0x0E });
  };
  P.bank_all_ram = r => { M[1] &= 0xFC; return R(r, { a: M[1] }); };
  P.bank_io_in = r => { M[1] = (M[1] & 0xFC) | 1; return R(r, { a: M[1] }); };
  P.bank_kernal_in = r => { M[1] = (M[1] & 0xFC) | 2; return R(r, { a: M[1] }); };

  // ---- the interrupt: the raster's, once a frame, entered through $FFFE (irq_entry) or, with the
  // KERNAL in for a load, through the KERNAL's entry and $0314 (irq_body). It counts the frame in
  // $16 (held at 255), scans the keyboard into the buffer and steps the sound effects.
  P.irq_body = function () {
    const port = M[1];
    M[1] = (port & 0xFC) | 1;
    const s = io.vicRead(0x19) & 1;
    if (s) {
      io.vicWrite(0x19, s);
      M[0x16] = (M[0x16] + 1) & 255;
      if (M[0x16] === 0) M[0x16] = 0xFF;
      P.keyscan_to_buffer();
      P.sound_step();
    }
    M[1] = port;
  };
  P.irq_entry = P.irq_body;

  // ---- the keyboard buffer: $03 keys waiting at $05 onward, room for $04
  P.clear_keybuf = r => { M[4] = 2; M[3] = 0; return R(r, { a: 0 }); };
  P.keyscan_to_buffer = function (r) {
    const k = P.keyscan();
    if (k.a === 0) return k;
    let x = M[3], a = k.a;
    if (x >= M[4]) {                      // full: the oldest goes
      M[3] = (M[3] - 1) & 255;
      x = 0;
      do { M[5 + x] = M[6 + x]; x++; } while (x < M[3]);
    }
    M[5 + x] = a;
    M[3] = (M[3] + 1) & 255;
    return { a, x: (x + 0) & 255, y: k.y };
  };
  // The keyboard, the C128's extra rows included: the CTRL and SHIFT keys' states in $13-$15,
  // then the first row with a key down gives the key's index (row base + the count of keys above
  // it in the row's byte). A new key starts the repeat delay ($11, 30 frames), a held one repeats
  // every 6 ($12); each gives its character, CTRL making a letter a control code and SHIFT a
  // capital or the key's shifted symbol. A = 0 for no key.
  const KEY_ROW_MASK = 0x0FDC, KEY_ROW_BASE = 0x0FE4, KEY_CHARS = 0x0FEF, SHIFT_FROM = 0x1047, SHIFT_TO = 0x1057;
  P.keyscan = function () {
    io.ciaWrite(2, 0xFF);
    io.ciaWrite(3, 0x00);
    io.ciaWrite(0, 0x7F); M[0x13] = io.ciaRead(1) & 0x04;
    io.ciaWrite(0, 0xBF); M[0x15] = io.ciaRead(1) & 0x10;
    io.ciaWrite(0, 0xFD); M[0x14] = io.ciaRead(1) & 0x80;
    io.write(0xD02F, 0xFF);
    let x = 0, a = 0x7F, y = 0, row = -1;
    // the C64's rows, $7F (row 7) down to $FE (row 0)
    for (;;) {
      io.ciaWrite(0, a);
      y = io.ciaRead(1);
      if (y !== 0xFF) {
        M[0x0F] = a;
        if (((y | M[KEY_ROW_MASK + x]) & 0xFF) !== 0xFF) { row = (y | M[KEY_ROW_MASK + x]) & 0xFF; break; }
        a = M[0x0F];
      }
      x++;
      const c = a & 1; a = (a >> 1) | 0x80;
      if (!c) break;
    }
    if (row < 0) {
      // the C128's three rows, through $D02F
      io.ciaWrite(0, 0xFF);
      a = 0xFB;
      for (;;) {
        io.write(0xD02F, a);
        y = io.ciaRead(1);
        if (y !== 0xFF) { row = y; break; }
        x++;
        const c = a & 1; a = (a >> 1) | 0x80;
        if (!c) break;
      }
      if (row < 0) {
        io.write(0xD02F, 0xFF);
        M[0x10] = 0xFF;
        io.ciaWrite(2, 0);
        return { a: 0, x, y: 0 };
      }
    }
    io.ciaWrite(0, 0xFF);
    io.write(0xD02F, 0xFF);
    io.ciaWrite(2, 0);
    M[0x0D03] = 0;
    // the key's place in its row: the count of 1 bits above the first 0
    let n = 0;
    while (row & 0x80) { n++; row = (row << 1) & 0xFF; }
    x = (n + M[KEY_ROW_BASE + x]) & 0xFF;
    if (x === M[0x10]) {
      if (M[0x11]) { M[0x11]--; return { a: 0, x, y: n }; }
      M[0x12] = (M[0x12] - 1) & 255;
      if (M[0x12]) return { a: 0, x, y: n };
      M[0x12] = 6;
    } else {
      M[0x10] = x; M[0x11] = 0x1E; M[0x12] = 6;
    }
    a = M[KEY_CHARS + x];
    if (x < 0x40) {
      if (M[0x13] === 0) {                               // CTRL: a letter as its control code
        if (a >= 0x61 && a < 0x7B) a &= 0x1F;
        return { a, x, y: n };
      }
      if (M[0x14] === 0 || M[0x15] === 0) {              // SHIFT
        if (a >= 0x61 && a < 0x7B) return { a: a - 0x20, x, y: n };
        for (let i = 0x0F; i >= 0; i--) if (M[SHIFT_FROM + i] === a) return { a: M[SHIFT_TO + i], x: i, y: n };
        return { a, x: 0xFF, y: n };
      }
    }
    return { a, x, y: n };
  };

  // ---- the sound effects: fourteen, each a sweep on one voice from the tables at $11AD-$1238,
  // and the engine's hum on voice 1 while it is free, its pitch from the ship's speed ($0415)
  P.sound_init = function (r) {
    for (let x = 2; x >= 0; x--) { M[0x28 + x] = 0; M[0x2B + x] = 0; }
    M[0x1D] = 0xFF; M[0x1E] = 0;
    for (const reg of [0x00, 0x01, 0x07, 0x08, 0x0E, 0x0F, 0x17]) io.sidWrite(reg, 0);
    io.sidWrite(0x18, 0x0F);
    return R(r, { a: 0x0F, x: 0xFF });
  };
  P.sound_play = function (r) {
    const e = r.a;
    if (e >= 0x0E) return R(r, { c: 1 });
    const x = M[0x11AD + e];
    M[0x1198 + x] = M[0x11BB + e];     // the frequency's high byte at the start
    M[0x119B + x] = M[0x11C9 + e];     // the step, low and high
    M[0x119E + x] = M[0x11D7 + e];
    M[0x11A7 + x] = M[0x11E5 + e];     // attack/decay and sustain/release
    M[0x11AA + x] = M[0x11F3 + e];
    M[0x1F + x] = M[0x1201 + e];       // the waveform and gate
    M[0x22 + x] = M[0x120F + e];       // frames a repeat lasts
    M[0x25 + x] = M[0x121D + e];       // the frame the gate is let go
    M[0x2B + x] = M[0x122B + e];       // repeats
    M[0x28 + x] = 0;
    return { a: 0, x, y: e, c: 0 };
  };
  P.sound_step = function () {
    for (let x = 2; x >= 0; x--) {
      const y = M[0x1195 + x];
      if (M[0x28 + x] === 0) {
        const rep = M[0x2B + x];
        if (rep === 0 || rep & 0x80) continue;
        M[0x11A1 + x] = 0;
        M[0x11A4 + x] = M[0x1198 + x];
        M[0x28 + x] = M[0x22 + x];
        M[0x2B + x] = (rep - 1) & 255;
        io.sidWrite(4 + y, 8); io.sidWrite(4 + y, 0);
        io.sidWrite(5 + y, M[0x11A7 + x]);
        io.sidWrite(6 + y, M[0x11AA + x]);
        io.sidWrite(3 + y, 8);
        io.sidWrite(4 + y, M[0x1F + x]);
      }
      const lo = M[0x11A1 + x] + M[0x119B + x];
      M[0x11A1 + x] = lo & 255;
      io.sidWrite(0 + y, lo & M[0x1D]);
      const hi = (M[0x11A4 + x] + M[0x119E + x] + (lo >> 8)) & 255;
      M[0x11A4 + x] = hi;
      io.sidWrite(1 + y, hi & M[0x1D]);
      if (M[0x28 + x] === M[0x25 + x]) io.sidWrite(4 + y, M[0x1F + x] & 0xFE);
      M[0x28 + x] = (M[0x28 + x] - 1) & 255;
      if (M[0x28 + x] === 0) { io.sidWrite(0 + y, 0); io.sidWrite(1 + y, 0); }
    }
    // the hum, while voice 1 has no effect playing
    if (M[0x28]) return;
    if (M[0x2B] === 0) { M[0x2B] = 0xFF; M[0x1F] = 0; }
    io.sidWrite(4, 8); io.sidWrite(4, 0);
    let a = M[0x0415] & M[0x1D] & M[0x1E];
    if (!a) return;
    if (a & 0x80) a = (-a) & 0xFF;
    // the speed times 8 as an 11-bit frequency: the bits rotated left three places through the carry
    const c1 = a >> 7, a1 = (a << 1) & 0xFF;
    const c2 = a1 >> 7, a2 = ((a1 << 1) | c1) & 0xFF;
    const c3 = a2 >> 7, a3 = ((a2 << 1) | c2) & 0xFF;
    io.sidWrite(0, a3 & 0xF8);
    io.sidWrite(1, ((a3 << 1) | c3) & 0x07);
    io.sidWrite(5, 0);
    io.sidWrite(6, 0xF0);
    M[0x1F] ^= 0x11;
    io.sidWrite(4, M[0x1F]);
  };

  // ---- the disk. A file through the KERNAL's LOAD and SAVE with the KERNAL's zero page swapped in
  // ($90-$C4 with $0190-$01C4) and the hum stopped while it runs. A load the disk cannot give
  // makes the game ask for the other disk and wait for a key, for ever if the file is missing; the
  // page's disk has every file, so in the port that is an error instead.
  P.load_file = function (r) {
    M[0x1831] = M[0x80]; M[0x1832] = M[0x81];
    const o = P.open_for_io(r);
    const k = P.kernal.LOAD({ a: 0, x: M[0x1831], y: M[0x1832] });
    return P.close_after_io(R(o, k));
  };
  P.save_file = function (r) {
    M[0x1831] = M[0x80]; M[0x1832] = M[0x81]; M[0x1833] = M[0x82]; M[0x1834] = M[0x83];
    const o = P.open_for_io(r);
    M[0x80] = M[0x1831]; M[0x81] = M[0x1832];
    const k = P.kernal.SAVE({ a: 0x80, x: M[0x1833], y: M[0x1834] });
    return P.close_after_io(R(o, k));
  };
  P.swap_kernal_zp = function (r) {
    for (let x = 0x34; x >= 0; x--) { const t = M[0x0100 + x + 0x90]; M[0x0100 + x + 0x90] = M[0x90 + x]; M[0x90 + x] = t; }
    return R(r, { x: 0xFF });
  };
  // the name at X/Y, zero-ended: its length and address go into the operands of the SETNAM call
  // at $17EF-$17F4, after SETLFS 1, 8, 0
  P.open_for_io = function (r) {
    M[0x1D] = 0;
    M[0x17F2] = r.x; M[0x17F4] = r.y;
    M[0x80] = r.x; M[0x81] = r.y;
    const a = r.x | r.y << 8;
    let y = 0;
    while (M[(a + y) & 0xFFFF] !== 0) { y = (y + 1) & 255; if (!y) break; }
    M[0x17F0] = y;
    P.swap_kernal_zp();
    P.bank_kernal_in();
    P.kernal.SETLFS({ a: 1, x: 8, y: 0 });
    P.kernal.SETNAM({ a: M[0x17F0], x: M[0x17F2], y: M[0x17F4] });
    return { a: M[0x17F0], x: M[0x17F2], y: M[0x17F4] };
  };
  P.close_after_io = function (r) {
    P.bank_all_ram();
    P.swap_kernal_zp();
    M[0x1D] = 0xFF;
    if (r.c) throw new Error('the disk has no file ' + nameAt(M[0x17F2] | M[0x17F4] << 8));
    return { a: 0xFF, x: M[0x17F2], y: M[0x17F4], c: 0 };
  };
  const nameAt = a => { let s = ''; for (let i = 0; i < 16 && M[a + i]; i++) s += String.fromCharCode(M[a + i]); return s; };
  P.prompt_boot_disk = r => { M[0x1857] = 0x3D; M[0x1858] = 0x18; return R(r, { x: 0x3D, y: 0x18 }); };
  P.prompt_data_disk = r => { M[0x1857] = 0x4A; M[0x1858] = 0x18; return R(r, { x: 0x4A, y: 0x18 }); };
  // A block of the disk by number (X low, Y high) into ($80): the number counted off track by track
  // from the sectors-per-track table at $190A, then "U1 5 0 tt ss" sent on the command channel
  // with a "#" buffer open as file 5, and the 256 bytes read from it.
  P.to_decimal = r => { let a = r.a, x = 0x30; while (a >= 10) { a -= 10; x++; } return { a: a + 0x30, x, y: r.y }; };
  P.read_block = function (r) {
    let n = (r.y << 8 | r.x), x = 1;
    for (;;) {                                   // the track: x, from 1; the sector left in n
      const s = M[0x1909 + x];
      if (n < s) break;
      n -= s; x++;
    }
    let d = P.to_decimal({ a: x });
    M[0x1935] = d.x; M[0x1936] = d.a;
    d = P.to_decimal({ a: n });
    M[0x1938] = d.x; M[0x1939] = d.a;
    P.swap_kernal_zp();
    P.bank_kernal_in();
    const K = P.kernal;
    K.SETNAM({ a: 1, x: 0x2D, y: 0x19 });
    K.SETLFS({ a: 5, x: 8, y: 5 });
    K.OPEN({});
    K.SETNAM({ a: 0x0C, x: 0x2E, y: 0x19 });
    K.SETLFS({ a: 0x0F, x: 8, y: 0x0F });
    K.OPEN({});
    if (K.READST({}).a & 0xC3) throw new Error('the disk has no block ' + (r.y << 8 | r.x));
    K.CHKIN({ x: 5 });
    M[0x193A] = 0;
    const to = M[0x80] | M[0x81] << 8;
    do {
      M[(to + M[0x193A]) & 0xFFFF] = K.CHRIN({}).a;
      M[0x193A] = (M[0x193A] + 1) & 255;
    } while (M[0x193A]);
    K.CLOSE({ a: 0x0F }); K.CLOSE({ a: 5 }); K.CLALL({});
    P.bank_all_ram();
    P.swap_kernal_zp();
    return { a: 0, x: 0xFF, y: 0xFF, c: 0 };
  };

  // ---- the keyboard buffer, read by the main program: a key with carry set, a-z as capitals
  P.s_A25E = function (r) {
    if (P.irqByte(0x03) === 0) return R(r, { a: 0xFF, c: 0 });
    M[0x03] = (P.irqByte(0x03) - 1) & 255;
    const k = P.irqByte(0x05);
    let x = 0;
    do { M[0x05 + x] = P.irqByte(0x06 + x); x++; } while (x < P.irqByte(0x03));
    return R(r, { a: k, c: 1 });
  };
  P.get_key = function (r) {
    const k = P.s_A25E(r);
    if (!k.c) return k;
    if (k.a >= 0x61 && k.a < 0x7B) return R(k, { a: k.a - 0x20, c: 1 });
    return R(k, { c: 1 });
  };

  // ---- random numbers: three bytes at $A2EE-$A2F0, the constant at $A2F1 added in with the carries
  // running through; $A2EE is the number
  P.random = function (r) {
    let s = M[0xA2F1] + M[0xA2F0];
    M[0xA2F0] = s & 255;
    s = (s & 255) + M[0xA2EF] + (s >> 8);
    M[0xA2EF] = s & 255;
    s = (s & 255) + M[0xA2EE] + (s >> 8);
    M[0xA2EE] = s & 255;
    return R(r, { a: s & 255, c: s >> 8 });
  };
  // 0 to A inclusive: random bytes under a mask that covers A's top bit, until one is not above A
  P.random_upto = function (r) {
    M[0x81] = r.a;
    let m = 0xFF, a = r.a;
    for (;;) { const c = a & 0x80; a = (a << 1) & 0xFF; if (c) break; m >>= 1; if (!m) break; }
    M[0x80] = m;
    let v;
    do { v = P.random().a & M[0x80]; } while (v > M[0x81]);
    return R(r, { a: v, y: v, c: v === M[0x81] ? 1 : 0 });
  };
  P.random_word = function (r) {
    let a = M[0x61];
    if (a) a = P.random_upto({ a }).a;
    M[0x63] = a;
    if (a !== M[0x61]) { M[0x62] = P.random().a; return { a: M[0x62] }; }
    M[0x62] = P.random_upto({ a: M[0x60] }).a;
    return { a: M[0x62] };
  };
  P.random_seed = function (r) {
    M[0xA2F2] = r.x; M[0xA2F3] = r.y;
    return P.random_reseed(r);
  };
  // The generator set back to the seed last given ($A2E2, from a base)
  P.random_reseed = function (r) {
    for (let y = 2; y >= 0; y--) M[0xA2EE + y] = M[0xA2F2 + y];
    return R(r, { a: M[0xA2EE], y: 0xFF });
  };
  // $85 pages and then $84 bytes from ($80) to ($82)
  P.copy_memory = function (r) {
    let from = M[0x80] | M[0x81] << 8, to = M[0x82] | M[0x83] << 8;
    for (let p = M[0x85]; p > 0; p--) {
      for (let y = 0; y < 256; y++) M[(to + y) & 0xFFFF] = M[(from + y) & 0xFFFF];
      M[0x81] = (M[0x81] + 1) & 255; M[0x83] = (M[0x83] + 1) & 255;
      from = M[0x80] | M[0x81] << 8; to = M[0x82] | M[0x83] << 8;
    }
    for (let y = 0; y < M[0x84]; y++) M[(to + y) & 0xFFFF] = M[(from + y) & 0xFFFF];
    return R(r, { x: 0, y: M[0x84] });
  };

  // ---- the joystick in port 2 and the keys that stand for it
  P.read_joystick2 = function (r) {
    P.bank_io_in();
    const a = (io.ciaRead(0) ^ 0xFF) & 0x1F;
    if (a) M[0x0D03] = a;
    P.bank_all_ram();
    return R(r, { a, z: a === 0 });
  };
  P.read_joystick1 = function (r) {
    P.bank_io_in();
    const a = (io.ciaRead(1) ^ 0xFF) & 0x1F;
    if (a) M[0x0D03] = a;
    P.bank_all_ram();
    return R(r, { a, z: a === 0 });
  };
  P.fire_pressed = function (r) {
    const a = P.read_joystick2(r).a & 0x10 ? 0xC0 : 0;
    return R(r, { a, z: a === 0 });
  };
  // The stick's position, 0-$7F on each axis with $3F the middle (X across, Y up and down); with
  // A = 1 eased: the kept position ($A404, $A405) moves an eighth of the way towards it each call
  P.s_A3B3 = function (r) {
    M[0xA403] = r.a;
    let x = 0x3F, y = 0x3F;
    const j = P.read_joystick2().a;
    if (j & 1) y = 0x7F;
    if (j & 2) y = 0x00;
    if (j & 4) x = 0x00;
    if (j & 8) x = 0x7F;
    if (!M[0xA403]) return { a: 0, x, y };
    const ease = (to, k) => {
      let s = to + M[k]; s >>= 1;
      s = s + M[k]; s >>= 1;
      s = s + M[k]; const c = s & 1; s >>= 1;
      return (s + c) & 255;
    };
    M[0xA404] = ease(x, 0xA404);
    M[0xA405] = ease(y, 0xA405);
    return { a: M[0xA405], x: M[0xA404], y: M[0xA405] };
  };
  P.joystick_eased = r => P.s_A3B3(R(r, { a: 1 }));
  P.s_A416 = r => R(r, { a: r.a < 0x2B ? 0xFF : r.a < 0x55 ? 0 : 1 });
  P.joystick_direction = function (r) {
    const p = P.s_A3B3({ a: 0 });
    const x = P.s_A416({ a: p.x }).a, y = P.s_A416({ a: p.y }).a;
    return { a: y, x, y };
  };
  // A key or the stick as a direction: X -1, 0 or 1 across, Y 1 up or -1 down; carry set when a
  // key was pressed, with the key in A
  P.key_direction = function (r) {
    const k = P.get_key(r);
    if (!k.c) {
      if (P.irqByte(0x0D03)) { const d = P.joystick_direction(); return { a: k.a, x: d.x, y: d.y, c: 0 }; }
      return { a: k.a, x: 0, y: 0, c: 0 };
    }
    for (let y = 0x13; y >= 0; y--) {
      if (M[0xA375 + y] === k.a) return { a: k.a, x: M[0xA389 + y], y: M[0xA39D + y], c: 0 };
    }
    // RETURN and SPACE: no direction, carry set
    return { a: k.a, x: 0, y: 0, c: k.a === 0x0D || k.a === 0x20 ? 1 : 0 };
  };

  // ---- waits
  // A key (carry set) or fire, which it then waits to see let go; any key waiting is thrown away
  // first. Each turn ends at a checkpoint, the return from the game's own call of get_key ($A434
  // in the first loop, $A439 in the second), so that the port reads the stick at the same place
  // as the game: a turn is 37 cycles in the first loop and 138 in the second, with the stick still.
  P.wait_key = function* (r) {
    for (;;) {
      const k = P.get_key();
      yield { cp: 0xA434, cycles: 37 };
      if (!k.c) break;
    }
    for (;;) {
      const k = P.get_key();
      yield { cp: 0xA439, cycles: 138 };
      if (k.c) return k;
      if (P.fire_pressed().a) return yield* P.wait_fire_up();
    }
  };
  P.CHECKPOINTS.push(0xA434, 0xA439);
  // Fire let go. As in wait_key, each turn reads and then ends at a checkpoint, the return from the
  // game's own read ($A447): a turn is 84 cycles, longer than a raster line, so a turn a line would
  // read the stick before the game does.
  P.wait_fire_up = function* (r) {
    for (;;) {
      const j = P.read_joystick2();
      yield { cp: 0xA447, cycles: 84 };
      if (!(j.a & 0x10)) return R(j, { a: 0 });
    }
  };
  P.CHECKPOINTS.push(0xA447);

  // ---- the pace of the main loop. The interrupt counts frames in $16; frame_skip3 takes three
  // off the lag ($2E) and starts the count again at 1, and the drawing is skipped while the lag
  // stays at or above zero; draw_frame adds the frames the drawing took
  P.frame_skip3 = function (r) {
    const v = M[0x2E] - 3;
    M[0x2E] = v & 255; M[0x16] = 1;
    return { a: 1, x: r && r.x, y: r && r.y, c: v >= 0 ? 1 : 0 };
  };
  P.frame_skip5 = function (r) {
    const v = M[0x2E] - 5;
    M[0x2E] = v & 255; M[0x16] = 1;
    return { a: 1, x: r && r.x, y: r && r.y, c: v >= 0 ? 1 : 0 };
  };
  P.draw_frame = function* (r) {
    P.set_flash_colour();
    const o = yield* P.build_draw_list();
    const s = M[0x2E] + P.irqByte(0x16);
    M[0x2E] = s > 255 ? s & 255 : 0;
    return R(o, { a: M[0x2E] });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
