// The pause menu ($77FE-$7C59): the view's buffer cleared and filled with the menu (the player's
// name, the keys held, the spirits destroyed, the score, strength in words and the choices), then
// a key: S and L save and load (the device and a name of five letters asked first), F turns the
// music on and off, K shows the keys held one at a time, Q gives up, and any other goes back to
// the game.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.menu = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  // a line of text: ($7E) the text, ($7C) the rows' table, A letters at pixel pair X
  const say = (t, rows, a, x, o) => {
    if (t !== null) setp(0x7E, t);
    setp(0x7C, rows);
    return P.DRAW_TEXT_TO_BITMAP({ a, x, y: o ? o.y : undefined });
  };
  // a key: the controls read until one is held
  function* key(cp, o) {
    for (;;) {
      yield { cp };
      o = P.READ_CONTROL_INPUT({ x: o.x, y: o.y });
      if (o.c) return o;
    }
  }

  // FORMAT_MENU_STATISTICS: the count of keys held, in two digits at $1856.
  P.FORMAT_MENU_STATISTICS = function (r) {
    M[0x1856] = 0x20;
    let a = M[0x2457], x = r.x;
    if (a >= 0x0A) { x = 0x31; M[0x1856] = 0x31; a -= 0x0A; }
    a = (a + 0x30) & 255;
    M[0x1857] = a;
    M[0x77F9] = 0x2D;
    return { a, x, y: 0x2D };
  };
  // FORMAT_SPIRITS_DESTROYED_FOR_MENU: the spirits destroyed ($2454), in two digits at $1866, and
  // the line's place across ($77FA) further right with two.
  P.FORMAT_SPIRITS_DESTROYED_FOR_MENU = function (r) {
    M[0x1866] = 0x20;
    let y = 0x2D, x = 0x30, a = M[0x2454];
    while (a >= 0x0A) { y = 0x32; a -= 0x0A; x++; }
    a = (a + 0x30) & 255;
    M[0x1867] = a;
    M[0x77FA] = y;
    if (x !== 0x30) M[0x1866] = x;
    return { a, x, y };
  };
  // FORMAT_SCORE_FOR_MENU: the score in seven digits at $187C.
  P.FORMAT_SCORE_FOR_MENU = function (r) {
    M[0x121C] = M[0x2442]; M[0x121D] = M[0x2443]; M[0x121E] = M[0x2444];
    M[0x1230] = 7;
    const o = P.FORMAT_UNSIGNED_DECIMAL({ a: 3, x: r.x, y: 0x0A });
    for (let x = 6; x >= 0; x--) M[0x187C + x] = M[0x1220 + x];
    return { a: M[0x1220], x: 0xFF, y: o.y };
  };

  // PROMPT_SAVE_DEVICE_AND_NAME: T (tape, device 1) or D (disk, 8), then a name of up to five
  // letters typed at $7AF5 (DEL takes one back, RETURN ends; ? only when loading), copied to $1C68
  // with the file name's last three after it.
  P.PROMPT_SAVE_DEVICE_AND_NAME = function* (r) {
    M[0x189B] = 0x23;
    let o = say(0x1884, 0x1CD9, 0x0D, 0x20, r);
    o = say(0x1892, 0x1CEF, 0x0D, 0x20, o);
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    let x;
    for (;;) {
      o = yield* key(0x7B39, o);
      if (o.a === 0x54) { x = 1; break; }
      if (o.a === 0x44) { x = 8; break; }
    }
    M[0x1052] = x;
    M[0x189B] = o.a;
    o = say(0x1892, 0x1CEF, 0x0D, 0x20, o);
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    M[0x7AF5] = 0x23;
    for (x = 0x0C; x; x--) M[0x7AF5 + x] = 0x20;
    o = say(0x18A0, 0x1D05, 0x0D, 0x20, o);
    o = say(0x7AF4, 0x1D1B, 0x0D, 0x20, o);
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    M[0x1230] = 0;
    for (;;) {
      o = yield* key(0x7BAF, o);
      const a = o.a;
      if (a === 0x0D) break;
      if (a === 0x14) {
        x = M[0x1230];
        if (!x) continue;
        M[0x1230] = (M[0x1230] - 1) & 255;
        M[0x7AF5 + x] = 0x20;
        M[0x7AF5 + x - 1] = 0x23;
      } else {
        if (a < 0x20 || a >= 0x5B || a === 0x2A) continue;
        if (!M[0x1C71] && a === 0x3F) continue;
        x = M[0x1230];
        if (x >= 5) continue;
        M[0x7AF5 + x] = a;
        M[0x7AF5 + x + 1] = 0x23;
        M[0x1230] = x + 1;
      }
      o = say(0x7AF4, 0x1D1B, 0x0D, 0x20, o);
      o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    }
    M[0x7AF5 + M[0x1230]] = 0x20;
    o = say(0x7AF4, 0x1D1B, 0x0D, 0x20, o);
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    for (x = 5; x; x--) M[0x1C67 + x] = M[0x7AF4 + x];
    M[0x1C6D] = 0x60;
    for (x = 0x0E; x; x--) M[0x121F + x] = 0x20;
    M[0x122E] = 0; M[0x122F] = 0;
    return { a: 0x20, x: 0, y: o.y };
  };
  P.CHECKPOINTS.push(0x7B39, 0x7BAF);

  // RUN_INFORMATION_MENU: with fewer than two controls held, the menu, until a key leaves it.
  P.RUN_INFORMATION_MENU = function* (r) {
    if (M[0x1379] >= 2) return { a: M[0x1379], x: r.x, y: r.y, c: 1 };
    M[0x109B] = 6;
    M[0x246F] = io.vicRead(0x15);
    io.vicWrite(0x15, 0xFC & io.vicRead(0x15));
    let o = P.CLEAR_LINEAR_30BYTE_ROWS({ x: r.x, y: r.y, c: 0 });
    o = P.FORMAT_MENU_STATISTICS(o);
    o = P.FORMAT_SPIRITS_DESTROYED_FOR_MENU(o);
    o = P.FORMAT_SCORE_FOR_MENU(o);
    M[0x1C74] = 1;
    o = say(0x1C4E, 0x1C91, 0x15, 7, o);
    o = say(null, 0x1D3F, 0x15, 7, o);
    o = say(0x1822, 0x1CAF, 0x16, 5, o);
    o = say(0x1839, 0x1CD9, 0x08, 5, o);
    o = say(0x1854, 0x1CD9, 0x0F, M[0x77F9], o);
    o = say(0x1842, 0x1CEF, 0x08, 5, o);
    o = say(0x1864, 0x1CEF, 0x0D, M[0x77FA], o);
    o = say(0x184B, 0x1D05, 0x08, 5, o);
    // strength in words: the eleven-letter word for each four points
    setp(0x7E, 0x17E0);
    let x = (P.irqByte(0x2455) - 1) & 255;
    while (x >= 4) { x -= 4; setp(0x7E, ptr(0x7E) + 0x0B); }
    o = say(null, 0x1D05, 0x09, 0x37, o);
    o = say(0x1874, 0x1D1B, 0x0F, 0x11, o);
    const s34 = M[0x2434], s32 = M[0x2432];
    M[0x2436] = 9; M[0x2438] = 0x0F;
    o = P.UPDATE_VIEWPORT_COLOR_CELLS({ x: o.x, y: o.y });
    M[0x2436] = s32; M[0x2438] = s34;
    M[0x1064] = 1;
    M[0x77EE] = 0;
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    let a;
    for (;;) {
      o = yield* key(0x794E, o);
      a = o.a;
      if (a === 0x53 || a === 0x4C) {
        // save or load: the choice marked and the other lines cleared, then the file
        setp(0x7E, 0x77EC); setp(0x7C, 0x1CBB);
        o = P.DRAW_TEXT_HIGH_BIT_MERGE({ a: 1, x: a === 0x4C ? 0x2D : 5 });
        setp(0x7E, 0x77D4);
        M[0x77FB] = 0xD9; M[0x77FC] = 0x1C;
        M[0x77FD] = 4;
        do {
          M[0x7C] = M[0x77FB]; M[0x7D] = M[0x77FC];
          o = P.DRAW_TEXT_TO_BITMAP({ a: 0x17, x: 5 });
          const s = M[0x77FB] + 0x16;
          M[0x77FB] = s & 255;
          if (s > 255) M[0x77FC] = (M[0x77FC] + 1) & 255;
          M[0x77FD] = (M[0x77FD] - 1) & 255;
        } while (M[0x77FD]);
        o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
        o = yield* P.LOAD_SAVE_DISPATCH({ a, x: o.x, y: o.y });
        M[0x1063] = 0;
        break;
      }
      if (a === 0x46) {
        // the music on or off
        M[0x123B] ^= 1;
        M[0x123A] = M[0x123B];
        if (M[0x123B]) { M[0x1239] = 0; P.SID_PLAYER_INITIALIZE({ a: 0, x: o.x, y: o.y }); }
        else P.SID_INITIALIZE_IF_ENABLED({ a: 3, x: o.x, y: o.y });
        M[0x1063] = 0x1E;
        while (M[0x1063]) yield;
        continue;
      }
      if (a === 0x4B) {
        // the keys held, one a press (their names in the panel's messages, $77EF by key), then
        // the count again
        x = M[0x2457];
        if (!x) continue;
        let y = M[0x77EE];
        x = (x - 1) & 255;
        if (x < M[0x77EE]) {
          M[0x77EE] = 0;
          setp(0x7E, 0x1854);
          x = M[0x77F9];
        } else {
          M[0x77EE] = (M[0x77EE] + 1) & 255;
          x = M[0x245A + y];
          y = M[0x77EE + x];
          setp(0x7E, 0x1400);
          do { setp(0x7E, ptr(0x7E) + 0x10); y = (y - 1) & 255; } while (y);
          x = 0x2D;
        }
        setp(0x7C, 0x1CD9);
        o = P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x });
        M[0x1063] = 0x19;
        o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
        while (M[0x1063]) yield;
        continue;
      }
      // back to the game: the view drawn again; Q leaves the session's end ($109B 6) standing
      M[0x1063] = 0x0B;
      P.DRAW_SORTED_VISIBLE_QUEUE({});
      P.UPDATE_VIEWPORT_COLOR_CELLS({});
      o = P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP({});
      if (a === 0x51) { M[0x1C74] = 8; return { a: 8, x: o.x, y: o.y }; }
      break;
    }
    io.vicWrite(0x15, M[0x246F]);
    if (M[0x2467]) o = P.POSITION_ENABLE_AIM_SPRITES({ a: M[0x2467], x: o.x, y: o.y });
    while (M[0x1063]) yield;
    M[0x109B] = 0;
    M[0x1C74] = 8;
    return { a: 8, x: o.x, y: o.y };
  };
  P.CHECKPOINTS.push(0x794E);
};
})(typeof window !== 'undefined' ? window : globalThis);
