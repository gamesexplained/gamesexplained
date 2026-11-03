// The title and the starts: the reset's entry, the title screen and its loop (the level keys 1-8,
// F5 the skill, F7 or fire to start, the attract countdown to the demonstration), the PAL check, the
// game over screen, and the start of a game or of the demonstration with the skill's settings.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
G.title = function (P) {
  const M = P.M;
  const io = P.io;
  const sid = (r, v) => io.sidWrite(r, v);
  const vic = (r, v) => io.vicWrite(r, v);
  const F7 = (y) => ((M[0xF7] | M[0xF8] << 8) + y) & 0xFFFF;

  // The busy loops' cycles: DEX/BNE inside DEY/BNE, from X and Y (0 is 256)
  const n = v => (v & 255) || 256;
  P.loopXY = (x, y) => (5 * n(x) - 1) + (n(y) - 1) * (5 * 256 - 1 + 5) + 4;
  // delay_x_by_32 ($9D81) from its JSR to its RTS
  P.delay_cycles = x => 6 + 2 + P.loopXY(x, 0x20) + 6;

  // reset_entry ($9C3E): IOINIT, the zero page image ($8B01-$8B9F to $03-$A1), BASIC banked out
  // ($01 $36), the video bank $4000-$7FFF; then the title.
  P.reset_entry = function () {
    for (let x = 0x9F; x > 0; x--) M[0x02 + x] = M[0x8B00 + x];
    M[0x01] = 0x36;
    io.cia2Write(0, (io.cia2Read(0) & 0xFC) | 0x02);
    return 0x9CB1;
  };
  // read_key_column0 ($9E23): the keyboard's column 0 (F7 $F7, F1 $EF, F5 $BF), CIA 1's port B.
  P.read_key_column0 = function () {
    io.ciaWrite(2, 0xFF); io.ciaWrite(0, 0xFE);
    return { a: io.ciaRead(1) };
  };
  // cassette_motor_toggle ($9E31): the datasette's bits of $01, rewritten each pass: the motor on
  // while PLAY is held after it was once up ($BF), off otherwise.
  P.cassette_motor_toggle = function () {
    const v = (M[1] & M[0]) | (~M[0] & 0x17);
    let a;
    if (v & 0x10) { M[0xBF] = 0x10; a = 0x26; } else a = M[0xBF] ? 0x06 : 0x26;
    M[0x01] = a;
    return { a };
  };
  // read_joystick_or_demo ($BC2C): joystick port 2 into $6D (the directions, active low) and $6E
  // (fire, 0 pressed); in the demonstration ($71) its script instead ($72:$73, at $7400): a byte of
  // stick and fire, held for the next byte's count of passes. Z set when fire is pressed.
  P.read_joystick_or_demo = function () {
    io.ciaWrite(2, 0);
    const a = io.ciaRead(0);
    const x = a;
    if (!M[0x71]) {
      M[0x6D] = a & 0x0F;
      M[0x6E] = (a >> 4) & 1;
      return { a: M[0x6E], x, z: M[0x6E] === 0 };
    }
    M[0x6F] = (M[0x6F] - 1) & 255;
    if (M[0x6F]) return { a: M[0x71], x, z: false };
    M[0xF7] = M[0x72]; M[0xF8] = M[0x73];
    const b = M[F7(0)];
    M[0x6D] = b & 0x0F;
    M[0x6E] = (b >> 4) & 1;
    M[0x6F] = M[F7(1)];
    M[0x72] = (M[0x72] + 2) & 255;
    if (M[0x72] < 2) M[0x73] = (M[0x73] + 1) & 255;
    return { a: M[0x6F], x, z: false };
  };
  // the KERNAL's SCNKEY: $C5 the key held (core.js); with a key down it reads every row ('key')
  P.scnkey = function () {
    root.EncPort.scnkey({ M, ciaRead: r => io.ciaRead(r), ciaWrite: (r, v) => io.ciaWrite(r, v) });
    if (M[0xC5] !== 0x40) P.count('key');
  };

  // reset_to_title_screen ($9D8A): the interrupts off, the SID silent, the title's colours row by row
  // ($6918) and its screen ($6800, $D018 $AE), level 1 ($A8 $70), the counters and the
  // demonstration's flag cleared; then the PAL check, and sprite 3 parked at X 503, the last the
  // chip draws, from where its 48 expanded pixels run on into X 0-46 at the left, and whose collision
  // with the graphics there the start samples ($C0).
  P.reset_to_title_screen = function* () {
    P.sei();
    for (let r = 0x17; r >= 0; r--) sid(r, 0);
    vic(0x15, 0); io.vicWrite(0x1A, 0);
    sid(0x18, 0x0F); sid(0x06, 0xF0);
    vic(0x16, 0x08);
    M[0xF8] = 0xD8; M[0xF7] = 0;
    let x = 0;
    for (; x < 0x19; x++) {
      const c = M[0x6918 + x];
      for (let y = 0x27; y >= 0; y--) P.wr(F7(y), c);
      const s = M[0xF7] + 0x28;
      M[0xF7] = s & 255;
      M[0xF8] = (M[0xF8] + (s >> 8)) & 255;
    }
    vic(0x20, 2); vic(0x21, 2); vic(0x18, 0xAE);
    M[0xA8] = 0x70;
    // the colour rows' loop is most of it: from the SEI to here ($9DE4)
    yield { cycles: 12068, at: 0x9DE4 };
    P.store(0x1D, 0); P.store(0x5A, 0);
    M[0x71] = 0;
    yield* P.pal_check_loop();
    // title_sprite3_setup ($9E02)
    vic(0x06, 0xF7); vic(0x07, 0x40);
    vic(0x10, 0x08); vic(0x15, 0x08); vic(0x17, 0x08); vic(0x1D, 0x08);
    vic(0x27 + 3, 0x01);
    io.vicRead(0x1F);
  };
  // pal_check_loop ($9DEC): the raster's low byte read until it is 0, the last other value kept in
  // $FF: 55 at line 0 on a PAL machine, after line 311; read 0 at line 256, the 255 before it, it
  // waits on. On NTSC (6, after line 262) the game jumps through ($F7), and so does a check that
  // starts on line 0 or 256 with $FF below $30: the port goes on as PAL there.
  P.pal_check_loop = function* () {
    for (;;) {
      const v = io.vicRead(0x12);
      if (v) { M[0xFF] = v; yield; continue; }
      if (M[0xFF] >= 0xF0) { yield; continue; }
      return;
    }
  };

  // enter_title_screen ($9CB1), title_reset_demo_timer ($9CB4) and title_loop ($9CBA): once a pass,
  // the keys read (SCNKEY, $C5) with the screen kept at the title's ($D018 $AE): 1-8 pick the level
  // ($A8, a tone on voice 1), F5 the skill ($62, its name shown), F7 or fire starts; each pass
  // counts down $F7-$F9 (from xx/03/03) to the demonstration, and runs the random numbers on.
  P.enter_title_screen = function* () {
    yield* P.reset_to_title_screen();
    return 0x9CB4;
  };
  P.title_reset_demo_timer = function () { M[0xF8] = 3; M[0xF9] = 3; return 0x9CBA; };
  P.title_loop = function* () {
    for (;;) {
      yield { cp: 0x9CBA };
      P.cassette_motor_toggle();
      P.read_key_column0();
      io.ciaWrite(2, 0xFF);
      P.scnkey();
      vic(0x18, 0xAE);
      const k = M[0xC5];
      let x = 7;
      while (x >= 0 && k !== M[0x6931 + x]) x--;
      if (x >= 0) {
        // title_level_key_pressed: any level (the check against the highest reached is NOPped out)
        M[0xA8] = (x << 4) & 255;
        sid(0x00, 0x06); sid(0x01, 0x06); sid(0x04, 0x21);
        return 0x9CB4;
      }
      // title_no_level_key
      sid(0x04, 0x00);
      P.random_next();
      M[0xF7] = (M[0xF7] - 1) & 255;
      if (!M[0xF7]) {
        M[0xF8] = (M[0xF8] - 1) & 255;
        if (!M[0xF8]) { M[0xF9] = (M[0xF9] - 1) & 255; if (!M[0xF9]) return 0x9D7A; }
      }
      let j = P.read_joystick_or_demo();
      if (j.z) {
        // title_fire_start: on once fire has been up through two delays
        // (each delay a stretch of its own, then its checkpoint: the same one twice running with
        // only a { cycles, at } between would be one stop to the lockstep)
        for (;;) {
          yield { cycles: P.delay_cycles(j.x) };
          yield { cp: 0x9D16 };
          j = P.read_joystick_or_demo();
          if (j.z) continue;
          yield { cycles: P.delay_cycles(j.x) };
          yield { cp: 0x9D1E };
          j = P.read_joystick_or_demo();
          if (!j.z) return 0x9D68;
        }
      }
      // title_check_f7_f5
      const c = M[0xC5];
      if (c === 0x03) return 0x9D68;
      if (c !== 0x06) continue;
      let s = (M[0x62] - 1) & 255;
      if (s & 0x80) s = 2;
      // title_show_skill_name: its sixteen wide-font cells at $6B88
      M[0x62] = s;
      let y = ((s + 1) << 4) & 255;
      for (let i = 0x0F; i >= 0; i--) { y = (y - 1) & 255; M[0x6B88 + i] = M[0x6B20 + y]; }
      return 0x9D4B;
    }
  };
  // title_debounce ($9D4B) and wait_no_key ($9D57): a long busy delay, then SCNKEY until no key is
  // held; then the title again.
  P.title_debounce = function* () {
    yield { cycles: 2 + 2 + 255 * (5 * 256 - 1 + 2 + 2 + 3) - 1, at: 0x9D57 };
    for (;;) {
      yield { cp: 0x9D57 };
      io.ciaWrite(2, 0xFF);
      P.scnkey();
      if (M[0xC5] === 0x40) return 0x9CB4;
    }
  };
  // start_game_from_title ($9D68): the skill's game, the chance $68C9 ($30) the enemy turns to the
  // player, and $C0 the sample of sprite 3's collision ($D01F bit 3), the backdrop sprites' offset.
  P.start_game_from_title = function () {
    M[0x68C8] = M[0x68C9];
    M[0xC0] = io.vicRead(0x1F) & 0x08;
    return { to: 0x9E9F, x: M[0x62] };
  };
  // start_demo ($9D7A) and start_demo_game ($9E46): level 1, the objects' places and motions
  // cleared, the zero page image again (the demonstration's flag $71 and script among it), the
  // player at (16, 16) heading $10; skill 3, a chance of $20.
  P.start_demo_game = function () {
    const t = P.T;
    M[0xA8] = 0x70;
    M[t.OCT] = 0;
    for (let x = 0x1F; x >= 0; x--) {
      for (const b of [t.XH, t.XL, t.XF, t.ZH, t.ZL, t.ZF, t.VXH, t.VXM, t.VXL, t.VZH, t.VZM, t.VZL, t.PXH, t.PXL, t.PZH, t.PZL]) M[b + x] = 0;
    }
    for (let x = 0x9F; x > 0; x--) M[0x02 + x] = M[0x8B00 + x];
    M[t.XH] = 0x10; M[t.ZH] = 0x10; M[t.FINE] = 0x10;
    M[0x68C8] = 0x20;
    return { to: 0x9E9F, x: 3 };
  };

  // start_game ($9E9F): skill X's settings ($8F80-$8F9F: the difficulty $3B, the speeds of the
  // player, its shots, the enemy's shots, the hit tolerance, the obelisks' range, the turn rate, the
  // warp's bonus); the view's screen mode, the console's colours, the raster interrupt started at
  // line 16; the sprites, the four fill characters, the score at 0 and drawn, three shields ($6026),
  // the scene ($63 = $A8, the level) and the enemy count.
  P.start_game = function (r) {
    const x = r.x;
    let a = M[0x8F80 + x];
    if (M[0xA8] !== 0x70) a = 0x30;
    M[0x3B] = a;
    M[0x3C] = 0x80;
    M[0x68] = M[0x8F84 + x]; M[0x17A0] = M[0x68];
    a = M[0x8F88 + x]; M[0x17A1] = a; M[0x17A4] = a; M[0x17A5] = a;
    M[0xA6] = M[0x8F8C + x]; M[0x57] = M[0x8F90 + x]; M[0x4F] = M[0x8F94 + x];
    M[0x25] = M[0x8F98 + x]; M[0xA9] = M[0x8F9C + x];
    vic(0x11, 0x1B); vic(0x1B, 0xFD);
    P.begin_frame_swap_buffer();
    for (let i = 0xA0; i > 0; i--) { io.colourWrite(0x2CF + i, 0x0B); io.colourWrite(0x347 + i, 0x0B); }
    for (let i = 0x4F; i >= 0; i--) io.colourWrite(i, 0x01);
    P.sei();
    M[0x0314] = 0xFE; M[0x0315] = 0xB2;
    vic(0x12, 0x10);
    io.ciaWrite(0x0D, 0x1F);
    io.ciaRead(0x0D);
    io.vicWrite(0x19, 0x01);
    io.vicWrite(0x1A, 0x01);
    P.cli();
    vic(0x27, 0x01);
    M[0x63F8] = 0x90;
    vic(0x03, 0x6D); vic(0x02, 0xA0);
    for (let i = 6; i >= 0; i--) vic(0x28 + i, M[0x6939 + i]);
    for (let i = 7; i >= 0; i--) {
      M[0x4000 + i] = 0; M[0x5000 + i] = 0;
      M[0x4100 + i] = 0x55; M[0x5100 + i] = 0x55;
      M[0x4200 + i] = 0xAA; M[0x5200 + i] = 0xAA;
      M[0x4300 + i] = 0xFF; M[0x5300 + i] = 0xFF;
      M[0x17B8 + i] = 0x10;
    }
    M[0x17A3] = 0; M[0x17A7] = 0;
    M[0x69] = 0; M[0xA2] = 0;
    for (let i = 3; i >= 0; i--) M[0x8BA0 + i] = 0;
    P.draw_status_score({ y: 0 });
    M[0x6026] = 0x88; M[0x6027] = 0x89;
    M[0x63] = M[0xA8];
    P.apply_scene();
    P.roll_enemy_count();
    P.stamp_digit_pair({ y: 8, x: 0x1C });
    return 0x9FA4;
  };

  // game_over_screen ($9C5C): the interrupts off, the screen in light grey, the title's screen ($D018
  // $BE: its last score and high score rows); ten long delays, F7 at the end of any starting a game
  // again at level 1; then the title. Y is the death's loop's count, the first delay's length.
  P.game_over_screen = function* (r) {
    P.sei();
    io.vicWrite(0x1A, 0); vic(0x15, 0); sid(0x18, 0);
    vic(0x16, 0x08);
    for (let i = 0; i < 256; i++) for (let p = 0; p < 4; p++) io.colourWrite(p * 256 + i, 0x0F);
    vic(0x20, 0x0F); vic(0x21, 0x0F);
    for (let i = 0x11; i >= 0; i--) io.colourWrite(0x19A + i, 0);
    vic(0x18, 0xBE);
    M[0xA8] = 0x70;
    M[0xFF] = 0x0A;
    let x = 0xFF, y = r.y & 255;
    for (;;) {
      // game_over_wait_loop
      yield { cycles: P.loopXY(x, y) };
      yield { cp: 0x9CA3 };
      x = 0; y = 0;
      if (P.read_key_column0().a === 0xF7) return { to: 0x9D68 };
      M[0xFF] = (M[0xFF] - 1) & 255;
      if (!M[0xFF]) return { to: 0x9CB1 };
    }
  };
  // game_over_scores ($ABED): the last score moves down a row on the title ($6A72 to $6AC2) and the
  // status row's score takes its place; a new high score ($8BA4, compared byte by byte from the
  // last) is copied, and its digits put on the title's high score row in its colour ($6B12). The
  // demonstration's scores are not kept.
  P.game_over_scores = function () {
    if (!M[0x71]) {
      for (let x = 0x0D; x >= 0; x--) { M[0x6AC2 + x] = M[0x6A72 + x]; M[0x6A72 + x] = M[0x6000 + x]; }
      let c = 1;
      for (let x = 3; x >= 0; x--) { const d = M[0x8BA4 + x] - M[0x8BA0 + x] - (1 - c); c = d >= 0 ? 1 : 0; }
      if (!c) {
        for (let x = 3; x >= 0; x--) M[0x8BA4 + x] = M[0x8BA0 + x];
        for (let x = 0x0D; x >= 0; x--) M[0x6B12 + x] = (M[0x6000 + x] & 0x3F) | 0x80;
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
