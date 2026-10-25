// A game's start (its state cleared, Tal placed on one of two sides) and its end: the victory's
// screen dissolving through the masks, then fire for the title again.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.game = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;

  // victory_sequence ($8AD9): the mine gone off (zp_victory), its countdown over and no message
  // scrolling: the ending's tune; nine times the playfield's character set ANDed with the next
  // dissolve mask ($0800 + 64 x step), the screen shaken a pixel and the border and background
  // flashed, ten frames apart; the last message ($95) and Tal in the suit; fire, a new game.
  P.victory_sequence = function* () {
    if (R(0x69) | R(0x54)) return {};
    if (!(R(0xB1) & 0x80)) return {};
    let polled = false;
    P.victory_tune();
    M[0xB3] = 8;
    M[0x3E] = 0x00; M[0x3F] = 0x08;
    do {
      M[0x3C] = 0x00; M[0x3D] = 0x78;
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 256; y++) {
          M[0xB2] = y;
          M[at(0x3C, y)] = M[at(0x3C, y)] & M[at(0x3E, y & 0x3F)];
          P.count('dissolved');
        }
        M[0x3D] = (M[0x3D] + 1) & 255;
      }
      P.paid();                                            // the step's 2,048 bytes, before the wait
      const p = w(0x3E) + 0x40;
      M[0x3E] = p & 255; M[0x3F] = (p >> 8) & 255;
      io.vicWrite(0x11, io.vicRead(0x11) ^ 0x03);
      const b = io.vicRead(0x20) ^ 0x01;
      io.vicWrite(0x20, b);
      io.vicWrite(0x21, b);
      M[0x68] = 0x0A;
      for (;;) {
        if (!(polled ? M[0x68] : R(0x68))) break;
        polled = true;
        yield;
      }
      M[0xB3] = (M[0xB3] - 1) & 255;
    } while (!(M[0xB3] & 0x80));
    P.queue_message({ a: 0x95 });
    P.reset_tal_end();
    while (!((io.ciaRead(0x00) ^ 0x10) & 0x10)) yield;
    return P.restart_game();
  };
  // victory_tune ($8B59): the three voices' tracks for the ending's tune.
  P.victory_tune = function () {
    P.sei();
    M[0x035E] = 0xA8; M[0x035F] = 0xA9; M[0x0360] = 0xAA;
    P.cli();
    return { a: 0xAA };
  };
  // reset_tal_end ($8B6B): Tal in the suit, facing the player and still; the border and
  // background black, the screen's scroll back.
  P.reset_tal_end = function () {
    P.sei();
    M[0x0260] = 0xB0; M[0x0261] = 0xB1;
    P.start_tal_anim();
    M[0x80] = 0; M[0x81] = 0; M[0x82] = 0; M[0x8E] = 0;
    M[0x02F8] = 0; M[0x02F9] = 0;
    io.vicWrite(0x20, 0);
    io.vicWrite(0x21, 0);
    io.vicWrite(0x11, (io.vicRead(0x11) & 0xF8) | 0x03);
    P.cli();
    return {};
  };
  // clear_game_state ($8D77): everything a new game starts without: the sprites, each slot and
  // animated tile, the message queue, the score, the add-ons and power cells taken, the flags; the
  // panel's digits back to 0; Tal's energy full.
  P.clear_game_state = function () {
    P.clear_sprites();
    for (let x = 7; x >= 0; x--) {
      for (const a of [0x02C8, 0x02D8, 0x0260, 0x0268, 0x0250, 0x0290, 0x02A8, 0x066A]) M[a + x] = 0;
      for (const a of [0x0270, 0x02F0, 0x02F8]) M[a + x] = 2;
      const d = M[0x75B0 + x];
      for (const a of [0x7740, 0x7748, 0x7750, 0x7758, 0x7760]) M[a + x] = d;
    }
    for (let x = 4; x >= 0; x--) { M[0x0682 + x] = 0; M[0x0687 + x] = 0; M[0x068C + x] = 0; }
    for (let x = 3; x >= 0; x--) { M[0x067A + x] = 0; M[0x067E + x] = 0; }
    for (let x = 8; x >= 0; x--) M[0x0661 + x] = 0;
    io.vicWrite(0x20, 0);
    io.vicWrite(0x21, 0);
    for (const a of [0x6B, 0xAC, 0x7E, 0x6D, 0x6E, 0xAB, 0x54, 0x6F, 0x70, 0x75, 0x76, 0xB1, 0x66, 0x7B, 0xA0,
      0x48, 0x49, 0x8D, 0x46, 0x8F, 0x91, 0x92, 0x88, 0x89, 0x8A, 0xA7, 0x0697, 0x0698, 0x0699, 0x4F, 0x50, 0x52]) M[a] = 0;
    M[0x51] = 0x1F;
    M[0x4C] = 0x0E;
    M[0x41] = 0x07;
    return { a: 0x07, x: 0xFF };
  };
  // clear_sprites ($8E2F): the shadow sprite registers and the chip's cleared, every sprite off.
  P.clear_sprites = function () {
    for (let x = 0x10; x >= 0; x--) { M[0x0200 + x] = 0; io.vicWrite(x, 0); }
    M[0x0215] = 0;
    io.vicWrite(0x15, 0);
    return { a: 0, x: 0xFF };
  };
  // start_new_game ($8E43): Tal at one of the two starts (start_room $C5DB, by bit 0 of the
  // main loop's pass count zp_pass_count), materialising; the armour in room $3F; the room built.
  P.start_new_game = function () {
    const x = R(0xB4) & 0x01;
    M[0x5B] = M[0xC5DB + x];
    const x0 = M[0xC5DD + x];
    M[0x0200] = x0; io.vicWrite(0x00, x0);
    M[0x0202] = x0; io.vicWrite(0x02, x0);
    const y0 = M[0xC5DF + x];
    M[0x0201] = y0; io.vicWrite(0x01, y0);
    const y1 = (y0 + 0x15) & 255;
    M[0x0203] = y1; io.vicWrite(0x03, y1);
    M[0x0210] = R(0x0210) & 0xFC;
    M[0x0260] = 0x88; M[0x02A8] = 0x88;
    M[0x0261] = 0x89; M[0x02A9] = 0x89;
    io.vicWrite(0x25, 0x08);
    io.vicWrite(0x26, 0x09);
    M[0x77] = 0x3F;
    M[0x78] = 0x80;
    M[0x79] = 0x40;
    M[0x7A] = 0;
    M[0x02B8] = 0; M[0x02B0] = 0; M[0x02B9] = 0; M[0x02B1] = 0;
    return P.build_room();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
