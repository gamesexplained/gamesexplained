// The title: the logo scene and the credits, played by sprites on their paths while the title tune
// plays its three parts, until fire is pressed; then the fade and the game's timers.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.title = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const setw = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };

  // A wait of the title's: each turn the fire button first, when the wait has it (true: the scene
  // ends), then its test, a raster line a turn. A byte the interrupt changes is read as the game's
  // loop first read it (P.irqByte), and from M once a turn has read it, as the interrupts the
  // lockstep runs at each yield leave it there (kit/c64/lockstep.js, standInGen). polled is the
  // stretch's: a new one for each routine the main program enters from a checkpoint.
  let polled = new Set();
  const poll = a => (polled.has(a) ? M[a] : (polled.add(a), R(a)));
  P.titlePolls = () => { polled = new Set(); };
  function* until(fire, done) {
    for (;;) {
      if (fire && P.read_fire().a) return true;
      if (done()) return false;
      yield;
    }
  }
  const pathDone = a => () => !(poll(a) & 0x7F);
  const waitDone = () => !poll(0x68);

  // title_sequence ($8071): the title until fire, the tune's parts in turn with the logo scene and
  // the credits; then the fade, the SID silenced, the screen cleared and the game's timers set.
  P.title_sequence = function* () {
    polled = new Set();
    M[0xB0] = 0x80;
    P.clear_screen();
    P.copy_charset_from_io_ram();
    for (;;) {
      P.title_tune_part1();
      yield* P.title_attract();
      if (M[0x7F]) break;
      if (yield* until(true, () => !(poll(0x0355) & 0x80))) break;
      P.title_tune_part2();
      yield* P.title_credits();
      if (M[0x7F]) break;
      if (yield* until(true, () => !(poll(0x0355) & 0x80))) break;
      P.title_tune_part3();
      yield* P.title_attract();
      if (M[0x7F]) break;
      yield* P.title_credits();
      if (M[0x7F]) break;
      if (yield* until(true, () => !(poll(0x0356) & 0x80))) break;
    }
    // the fade: the volume ($0247) down a step every four frames
    do {
      M[0x67] = 4;
      yield* until(false, () => !poll(0x67));
      M[0x0247] = (R(0x0247) - 1) & 255;
    } while (M[0x0247]);
    P.silence_sid();
    P.clear_screen();
    P.sei();
    io.ciaWrite(0x04, 0x10); io.ciaWrite(0x05, 0x27);
    io.ciaWrite(0x06, 0x61); io.ciaWrite(0x07, 0x51);
    io.ciaWrite(0x0D, 0x83); io.ciaWrite(0x0F, 0x81);
    M[0x4A] = 0; M[0x4B] = 0; M[0xB0] = 0;
    io.vicWrite(0x18, 0x0C);
    io.vicWrite(0x16, io.vicRead(0x16) & 0xEF);
    return {};
  };
  // title_tune_part1-3 ($8109, $8125, $8141): the music's tempo (CIA 1's timer B) and the three
  // voices' tracks for each part of the title tune.
  function tune(lo, hi, t) {
    P.sei();
    io.ciaWrite(0x06, lo); io.ciaWrite(0x07, hi);
    M[0x035E] = t; M[0x035F] = t + 1; M[0x0360] = t + 2;
    P.cli();
    return { a: t + 2 };
  }
  P.title_tune_part1 = () => tune(0x01, 0x5D, 0x80);
  P.title_tune_part2 = () => tune(0x59, 0x43, 0x83);
  P.title_tune_part3 = () => tune(0x1A, 0x41, 0x86);
  // read_fire ($8417): the joystick's fire into zp_fire, $10 pressed.
  P.read_fire = function () {
    const a = (io.ciaRead(0x00) ^ 0x10) & 0x10;
    M[0x7F] = a;
    return { a };
  };
  // the next step of the play on sprites 4 and 5: Tal's two halves take animation a and the next,
  // on path p
  function step(a, p) {
    P.sei();
    M[0x0264] = a; M[0x0265] = a + 1;
    P.start_path_pair({ a: p });
    P.cli();
  }
  // title_attract ($815D): the logo scene. Multicolour, the logo and statues; the armour on
  // sprites 6 and 7 and a guardian on sprite 3 walking in (path $AA); then Tal on 4 and 5 jumping
  // down, walking, turning, climbing into the armour, which flies off and back (paths $A8, $A9,
  // $AC, $AD), each step when the last one's path is over or its wait (zp_wait) has run out. Fire
  // ends it.
  P.title_attract = function* () {
    M[0x4B] = 0x10; M[0x4A] = 0x10;
    io.vicWrite(0x16, 0x10 | io.vicRead(0x16));
    M[0x4D] = 0x0B;
    M[0x4E] = 0x0E; M[0x4C] = 0x0E;
    P.draw_title_screen();
    P.sei();
    M[0x0208] = 0; M[0x0206] = 0; M[0x020A] = 0; M[0x0210] = 0;
    M[0x0207] = 0x8A;
    M[0x020C] = 0xAC; M[0x020E] = 0xAC;
    M[0x0209] = 0xB0; M[0x020D] = 0xB0;
    M[0x020B] = 0xC5; M[0x020F] = 0xC5;
    io.vicWrite(0x25, 0x08);
    io.vicWrite(0x26, 0x09);
    M[0x0266] = 0xC0; M[0x0267] = 0xC1;
    M[0x0263] = 0xC8;
    M[0x02DB] = 0xAA;
    P.reset_slot_path({ x: 3 });
    M[0x02DE] = 0; M[0x02DF] = 0; M[0x026B] = 0; M[0x026E] = 0; M[0x026F] = 0;
    M[0x0273] = 2; M[0x0276] = 2; M[0x0277] = 2;
    P.cli();
    const wait = n => { M[0x68] = n; return until(true, waitDone); };
    if (yield* until(true, pathDone(0x02DB))) return {};
    if (yield* wait(0x64)) return {};
    step(0x9A, 0xA8);
    if (yield* until(true, pathDone(0x02DC))) return {};
    step(0x9C, 0x80);
    if (yield* wait(0x64)) return {};
    step(0x90, 0x80);
    if (yield* wait(0x32)) return {};
    step(0x82, 0xA9);
    yield* until(false, pathDone(0x02DC));
    step(0x86, 0x80);
    if (yield* wait(0x19)) return {};
    step(0x88, 0x80);
    if (yield* wait(0x19)) return {};
    // Tal dissolves into the armour
    P.sei();
    const t = M[0x0264];
    M[0x0294] = t; M[0x0295] = t;
    M[0x029C] = 0; M[0x029D] = 0; M[0x02A4] = 0; M[0x02A5] = 0;
    P.cli();
    yield* until(false, () => ((poll(0x0294) | poll(0x0295)) & 0x80) === 0);
    P.sei();
    io.vicWrite(0x25, 0x0E);
    io.vicWrite(0x26, 0x0B);
    M[0x0266] = 0x0B; M[0x0267] = 0x0B;
    M[0x0264] = 0xB2; M[0x0265] = 0xB3;
    P.start_path_pair({ a: 0x80 });
    P.cli();
    if (yield* wait(0x32)) return {};
    P.sei();
    M[0x0263] = 0xC8;
    M[0x02DB] = 0xAB;
    P.reset_slot_path({ x: 3 });
    M[0x026B] = 0;
    M[0x0273] = 2;
    P.cli();
    if (yield* until(true, pathDone(0x02DB))) return {};
    step(0xB0, 0xAC);
    if (yield* until(true, pathDone(0x02DC))) return {};
    step(0xAE, 0x80);
    if (yield* wait(0x0A)) return {};
    step(0xAC, 0xAD);
    if (yield* until(true, pathDone(0x02DC))) return {};
    M[0x68] = 0x64;
    yield* until(false, waitDone);
    return {};
  };
  // title_credits ($8386): the credits screen, the panel's character set in hires, with Tal walking
  // across (paths $AF, then $B1, the guardian on $AE and $B0).
  P.title_credits = function* () {
    P.clear_screen();
    M[0x4C] = 0x0C;
    M[0x4A] = 0; M[0x4B] = 0;
    io.vicWrite(0x16, io.vicRead(0x16) & 0xEF);
    P.print_text_block({ a: 0 });
    P.sei();
    M[0x0207] = 0xBA; M[0x0209] = 0xBA;
    M[0x020B] = 0xCF;
    M[0x02DB] = 0xAE;
    P.reset_slot_path({ x: 3 });
    M[0x0264] = 0xB6; M[0x0265] = 0xB7;
    P.start_path_pair({ a: 0xAF });
    P.cli();
    if (yield* until(true, pathDone(0x02DC))) return {};
    M[0x68] = 0x32;
    if (yield* until(true, waitDone)) return {};
    P.sei();
    M[0x02DB] = 0xB0;
    P.reset_slot_path({ x: 3 });
    M[0x0264] = 0xAC; M[0x0265] = 0xAD;
    P.start_path_pair({ a: 0xB1 });
    P.cli();
    return {};
  };
  // start_path_pair ($83FD): path A on sprites 4 and 5 together, their animations from the start.
  P.start_path_pair = function (r) {
    M[0x02DC] = r.a; M[0x02DD] = r.a;
    for (let x = 4; x <= 5; x++) {
      P.reset_slot_path({ x });
      M[0x0268 + x] = 0;
      M[0x0270 + x] = 2;
    }
    return { a: 2, x: 6, y: 0xFF };
  };
  // draw_title_screen ($8421): the title picture, 19 rows of 26 characters (title_picture $F52E)
  // from row 3, column 7; dark grey, the statues' characters ($EE and over) red.
  P.draw_title_screen = function () {
    P.clear_screen();
    setw(0x3E, 0x407F);
    setw(0x3C, 0xF52E);
    for (let x = 0x12; x >= 0; x--) {
      for (let y = 0x19; y >= 0; y--) {
        const c = M[at(0x3C, y)];
        M[at(0x3E, y)] = c;
        M[0xAA] = c >= 0xEE ? 0x02 : 0x0B;
        P.wr((at(0x3E, y) + 0x9800) & 0xFFFF, M[0xAA]);
      }
      setw(0x3E, w(0x3E) + 0x28);
      setw(0x3C, w(0x3C) + 0x1A);
    }
    return { x: 0xFF, y: 0xFF };
  };
  // copy_charset_from_io_ram ($847A): the playfield's character set, 2 KB from the RAM under the
  // chips at $D000, to $7800, with the processor port at 0; then the music's and the sound's timers
  // and the raster interrupt at line $FA.
  P.copy_charset_from_io_ram = function () {
    P.sei();
    const port = M[0x01];
    M[0x01] = 0;
    for (let k = 0; k < 0x0800; k++) M[0x7800 + k] = M[0xD000 + k];
    M[0x3C] = 0x00; M[0x3D] = 0xD8; M[0x3E] = 0x00; M[0x3F] = 0x80;
    M[0x01] = port;
    io.ciaWrite(0x04, 0x10); io.ciaWrite(0x05, 0x27);
    io.ciaWrite(0x06, 0x61); io.ciaWrite(0x07, 0x51);
    io.ciaWrite(0x0D, 0x83); io.ciaWrite(0x0F, 0x81);
    io.vicWrite(0x11, 0x1B);
    io.vicWrite(0x12, 0xFA);
    io.vicWrite(0x1A, 0x07);
    io.vicWrite(0x19, 0x07);
    P.cli();
    return { a: 0x07, x: 0x08, y: 0 };
  };
  // print_text_block ($8BB9): text block A (text_blocks $C529): lines of a row, a column and a
  // colour, then the text, letters from $9C and punctuation by text_punct ($C5CB), to a $0D (the
  // next line) or "$" (the end).
  P.print_text_block = function (r) {
    const k = (r.a << 1) & 255;
    M[0x3A] = M[0xC529 + k]; M[0x3B] = M[0xC52A + k];
    let y = 0;
    for (;;) {
      // a line's start
      const x = (M[at(0x3A, y)] << 1) & 255;
      y = (y + 1) & 255;
      let s = M[0xF128 + x] + M[at(0x3A, y)];
      M[0x02] = s & 255; M[0x04] = s & 255;
      s = M[0xF129 + x] + (s >> 8);
      M[0x03] = s & 255;
      M[0x05] = (M[0x03] + 0x98 + (s >> 8)) & 255;
      y = (y + 1) & 255;
      M[0x43] = M[at(0x3A, y)];
      y = (y + 1) & 255;
      for (;;) {
        const c = M[at(0x3A, y)];
        y = (y + 1) & 255;
        let g = -1;
        if (c >= 0x41 && c < 0x5B) g = c + 0x5B;
        else {
          if (c === 0x24) return { a: c, y };
          if (c === 0x0D) break;
          for (let j = 7; j >= 0; j--) if (c === M[0xC5CB + j]) { g = M[0xC5D3 + j]; break; }
          if (g < 0) return { a: c, y };
        }
        M[0x42] = y;
        P.wr(w(0x02), g);
        P.wr(w(0x04), M[0x43]);
        let t = M[0x02] + 1;
        M[0x02] = t & 255; M[0x04] = t & 255;
        t = M[0x03] + (t >> 8);
        M[0x03] = t & 255;
        M[0x05] = (M[0x03] + 0x98 + (t >> 8)) & 255;
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
