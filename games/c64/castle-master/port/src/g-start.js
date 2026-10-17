// The start ($473B-$47C4, $9A44-$9CEB): the music, the interrupt and the video chip set up, a new
// session made, then the title's menus drawn straight into the bitmap: the language (1, 2 or 3;
// French and German copy their messages over the English at $13EE) and the character (1 or 2,
// the prince or the princess, $246E), each chosen with RETURN; then the main loop.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.start = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const say = (t, rows, a, x) => {
    if (t !== null) setp(0x7E, t);
    if (rows !== null) setp(0x7C, rows);
    return P.DRAW_TEXT_TO_BITMAP({ a, x });
  };
  function* key(cp) {
    for (;;) {
      yield { cp };
      const o = P.READ_CONTROL_INPUT({});
      if (o.c) return o.a;
    }
  }
  const colours = () => {
    M[0x2435] = 0; M[0x2436] = 0; M[0x2437] = 0; M[0x2438] = 0;
    P.UPDATE_VIEWPORT_COLOR_CELLS({});
  };
  const shown = () => { M[0x2436] = 9; M[0x2438] = 0x0F; P.UPDATE_VIEWPORT_COLOR_CELLS({}); };
  // a menu's marker moved from the row ($7C) it is on to the row given
  const mark = rows => {
    say(0x8961, null, 1, 0x19);
    say(0x8963, rows, 1, 0x19);
  };

  // ENGINE_INITIALIZE: where the loader jumps. The music started on its first tune, music rather
  // than effects, the KERNAL's output through the game's own CHROUT; then the restart.
  P.ENGINE_INITIALIZE = function* (r) {
    M[1] = 0x37;
    P.kernal.SETMSG({ a: 0xC0 });
    P.SWAP_GAME_AND_KERNAL_ZERO_PAGE({});
    M[1] = 0x37;
    M[0x1239] = 0;
    P.SID_PLAYER_INITIALIZE({ a: 0 });
    M[0x123B] = 1; M[0x123A] = 1;
    M[0x0326] = 0xCF; M[0x0327] = 0x86;
    M[1] = 0x35;
    return yield* P.RESET_VECTOR_TARGET({});
  };

  // RESET_VECTOR_TARGET: the interrupt installed, a new session, the sprites' colours and modes,
  // the sound cleared, the video chip on bank 3 in bitmap mode with multicolour, black border and
  // background; then the title's menus.
  P.RESET_VECTOR_TARGET = function* (r) {
    M[0x1088] = 1; M[0x109B] = 1;
    P.INSTALL_RUNTIME_VECTORS({});
    P.INITIALIZE_NEW_SESSION({});
    io.vicWrite(0x1B, 0); io.vicWrite(0x1D, 0); io.vicWrite(0x17, 0);
    io.vicWrite(0x1C, 0xF8); io.vicWrite(0x25, 0x0B); io.vicWrite(0x26, 0x0C);
    P.SID_CLEAR_REGISTERS({});
    io.cia2Write(0, io.cia2Read(0) & 0xFC);
    io.vicWrite(0x18, io.vicRead(0x18) | 0x08);
    io.vicWrite(0x16, io.vicRead(0x16) | 0x10);
    io.vicWrite(0x11, io.vicRead(0x11) | 0x30);
    io.vicWrite(0x21, 0); io.vicWrite(0x20, 0);
    return yield* P.BUILD_MAIN_MENU({});
  };

  // BUILD_MAIN_MENU: the title (the castle's name twice) and the languages, the marker at the
  // first; then the menus.
  P.BUILD_MAIN_MENU = function* (r) {
    colours();
    M[0x1C74] = 8;
    say(0x1C4E, 0x997E, 0x15, 7);
    say(null, 0x9A34, 0x15, 7);
    say(0x87CC, 0x999C, 0x10, 0x13);
    say(0x87DD, 0x99B2, 0x10, 0x13);
    say(0x87EE, 0x99DE, 0x10, 0x13);
    say(0x87FF, 0x99F4, 0x10, 0x13);
    say(0x8810, 0x9A0A, 0x10, 0x13);
    say(0x8963, 0x99DE, 1, 0x19);
    shown();
    M[0x8821] = 0;
    return yield* P.RUN_TITLE_AND_CHARACTER_MENUS({});
  };

  // RUN_TITLE_AND_CHARACTER_MENUS: 1-3 choose the language, RETURN takes it (its messages copied
  // in, $851 bytes from $8965 or $9132); then its lines of the character menu, 1-2 choose and
  // RETURN starts the game with a new session.
  P.RUN_TITLE_AND_CHARACTER_MENUS = function* (r) {
    const ROWS = [0x99DE, 0x99F4, 0x9A0A];
    let a;
    for (;;) {
      a = yield* key(0x9B1C);
      if (a === 0x0D) break;
      const i = a - 0x31;
      if (i < 0 || i > 2 || i === M[0x8821]) continue;
      M[0x8821] = i;
      mark(ROWS[i]);
    }
    const lang = M[0x8821];
    const text = lang === 0 ? 0x8822 : lang === 1 ? 0x888B : 0x88F4;
    if (lang) {
      setp(0x7C, lang === 1 ? 0x8965 : 0x9132);
      M[0x7E] = 0xEE; M[0x7F] = 0x13;
      for (let x = 8; x; x--) {
        for (let y = 0; y < 256; y++) M[(ptr(0x7E) + y) & 0xFFFF] = M[(ptr(0x7C) + y) & 0xFFFF];
        M[0x7D] = (M[0x7D] + 1) & 255; M[0x7F] = (M[0x7F] + 1) & 255;
      }
      for (let y = 0x50; y >= 0; y--) M[(ptr(0x7E) + y) & 0xFFFF] = M[(ptr(0x7C) + y) & 0xFFFF];
    }
    colours();
    setp(0x7E, text);
    for (const rows of [0x999C, 0x99B2, 0x99C8, 0x99F4]) {
      say(null, rows, 0x14, 9);
      setp(0x7E, ptr(0x7E) + 0x15);
    }
    say(null, 0x9A0A, 0x14, 9);
    say(0x77D4, 0x99DE, 0x14, 9);
    say(0x8963, 0x99F4, 1, 0x19);
    shown();
    M[0x246E] = 0;
    for (;;) {
      a = yield* key(0x9C97);
      if (a === 0x0D) break;
      const i = a - 0x31;
      if (i < 0 || i > 1 || i === M[0x246E]) continue;
      M[0x246E] = i;
      mark(ROWS[i + 1]);
    }
    return P.INITIALIZE_NEW_SESSION({});
  };
  P.CHECKPOINTS.push(0x9B1C, 0x9C97);

  P.MAIN_LOOP = function* (r) { return yield* P.main_loop({ fresh: true }); };

  // The page's program: from the loader's jump on.
  P.start = function* () {
    yield { cp: 0x473B };
    yield* P.ENGINE_INITIALIZE({});
    return yield* P.MAIN_LOOP({});
  };
  P.CHECKPOINTS.push(0x473B);
};
})(typeof window !== 'undefined' ? window : globalThis);
