// The game's top level and the race ($3B22-$3FFA, with the wait for the view's keys at $CFDE): the
// league's seasons and their races, a race's setting up and its loop, the pause, the bitmaps shown
// in turn, and the waits for the raster and the delays.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.race = P => {
  const M = P.M;
  // where the race's loop calls each routine: its checkpoints, the first where a pass starts
  const CP = [0x3D08, 0x3D0B, 0x3D0E, 0x3D11, 0x3D14, 0x3D17, 0x3D1A, 0x3D1D, 0x3D20, 0x3D23, 0x3D26, 0x3D29, 0x3D2C, 0x3D2F];
  P.CHECKPOINTS.push(...CP);
  P.RACE_PASS_AT = 0x3D08;

  P.GEN.add('START');
  // START ($3B22): the game. The drivers' names and driving copied from the pool under the chips
  // ($DC00) to $AE00, the race screen, the players chosen and the league shown; then for good the
  // main menu ($EF3A), and a practice race or a season of the league
  P.START = function* (r) {
    for (;;) {
      try { return yield* start(); } catch (e) { if (e !== P.RESTART) throw e; }
    }
  };
  // the main menu's quit ($EF74) jumps back to START: here the menu throws P.RESTART
  P.RESTART = P.RESTART || { restart: true };
  function* start() {
    P.ALL_RAM({});
    for (let x = 0; x < 256; x++) M[0xAE00 + x] = M[0xDC00 + x];
    P.IO_BACK({});
    P.NEW_LEAGUE({});
    yield* P.MENU_BACKDROP({});
    yield* P.CHOOSE_PLAYERS({});
    yield* P.LEAGUE_TABLE({});
    P.SAVE_RANDOM({});
    for (;;) {
      M[0xC304] >>= 1;
      yield* P.MAIN_MENU({});
      if (!(M[0xC76C] & 0x80)) {
        yield* P.RACE_SETUP({});
        yield* P.PANEL_SCREEN({});
        yield* P.RACE({});
        yield* P.MENU_BACKDROP({});
        continue;
      }
      P.NEW_DRIVERS({});
      yield* season();
    }
  }
  // $3B6C-$3C34: the seasons of a league: each race of the division's ($C77F of $31A3), the player's
  // raced (NEXT_RACE, RACE_SETUP, RACE, the results) and the others' worked out ($E87F); at a
  // season's end the changes and the league, or for several players their turns ($31A2)
  function* season() {
    let at = 0x3B6C;
    for (;;) {
      if (at === 0x3B6C) {
        for (let x = 0x17; x >= 0; x--) { P.CLEAR_CLOCK({ x }); if (x < 0x10) M[0x8398 + x] = 9; }
        M[0xC76D] = 0; M[0xC76E] = 0;
        at = 0x3B85;
      } else if (at === 0x3B5F) {
        M[0xC304] = 0xC0; M[0xC362] = 0xC0;
        at = 0x3B85;
      } else if (at === 0x3B85) {
        M[0xC360] = M[0xC718];
        P.RACE_PAIR({});
        at = 0x3BA7;
        let y = M[0xC772];
        if (!(M[0xC304] & 0x80)) {
          const a = M[0xC771];
          if (a === M[0x31A4]) at = 0x3BAD;
          else if (y === M[0x31A4]) { y = a; at = 0x3BAD; }
        }
        if (at === 0x3BA7) continue;
        M[0xC773] = y;
        M[0xC305] = 0xC0;
        yield* P.NEXT_RACE({});
        if (P.KEY_PRESSED({ x: 0x20 }).z) { at = 0x3B5F; continue; }
        yield* P.RACE_SETUP({});
        yield* P.PANEL_SCREEN({});
        P.PLAYER_KEYS({ a: 0x80 });
        yield* P.RACE({});
        P.PLAYER_KEYS({ a: 0 });
        P.TRACK_RECORDS({ a: 0 });
        P.RACE_OTHERS({});
        yield* P.MENU_BACKDROP({});
        if (M[0xC305]) { yield* P.NEXT_RACE({}); M[0xC305] = 0; }
        yield* P.RACE_DONE({});
        yield* P.RESULTS_TABLE({});
        if (M[0x31A1]) yield* P.BONUS_RESULTS({});
        at = 0x3BF8;
      } else if (at === 0x3BA7) {
        P.RACE_OTHERS({});
        at = 0x3BF8;
      } else {
        M[0x31A6] = (M[0x31A6] + 1) & 255;
        M[0xC77F] = (M[0xC77F] + 1) & 255;
        if (M[0xC77F] < M[0x31A3]) { at = 0x3B85; continue; }
        M[0xC77F] = 0;
        if (!M[0x31A1]) {
          yield* P.SEASON_END({});
          yield* P.LEAGUE_TABLE({});
          P.RESET_SEASON({});
          return;
        }
        yield* P.ROUND_RESULTS({});
        M[0xC304] >>= 1;
        M[0x31A2] = (M[0x31A2] - 1) & 255;
        if (!(M[0x31A2] & 0x80)) { at = 0x3B6C; continue; }
        if (M[0xC74B] >= 7) P.RESET_SEASON({});
        return;
      }
    }
  }

  P.GEN.add('RACE_SETUP'); P.GEN.add('VIEW_KEYS');
  // VIEW_KEYS's turns are checkpoints, as WAIT_FIRE's are: each draws a random number
  P.CHECKPOINTS.push(0xCFDE);
  // RACE_SETUP ($3C36): before a race, the track seen from above: the race's state cleared, the
  // view's rows all of colour 8, the menus' screen in the track's colours, the frame and the
  // track's name, the track's pieces made ($EA34) and drawn ($F386), turned by left and right
  // ($C34C) until fire is pressed
  P.RACE_SETUP = function* (r) {
    yield* P.BORDER_BLANK({ a: 0x0B });
    P.CLEAR_RACE({});
    M[0x3DF8] = 0x40;
    for (let x = 0x7C; x >= 0; x -= 4) M[0x0201 + x] = 8;
    P.CMD_ROW_COLOURS({ x: 0xFC });
    P.DISPATCH({ a: 3, x: M[0xC76B] });
    P.RACE_SCREEN_COLOURS({});
    P.FRAME({});
    P.TRACK_TITLE({});
    P.CLEAR_BARS({});
    P.BUILD_TRACK({ x: M[0xC77D] });
    P.CMD_DRAWBRIDGE({});
    let q = P.TRACK_PREVIEW({});
    for (;;) {
      for (let x = 0x27; x >= 0; x--) M[0x7FC0 + x] = 0x3B;
      P.PRINT_STRING({ x: 0x2C, y: q.y });
      q = yield* P.VIEW_KEYS({});
      if (!q.c) break;
      q = P.TRACK_PREVIEW({});
    }
    yield* P.BORDER_BLANK({ a: 0 });
    M[0x3DF8] = 0;
    return { a: 0 };
  };
  // VIEW_KEYS ($CFDE): waits for left ($C34C up, C set), right ($C34C down, C set) or fire (C clear)
  P.VIEW_KEYS = function* (r) {
    for (;;) {
      yield { cp: 0xCFDE, cycles: P.COST.fireTurn };
      P.READ_CONTROLS({});
      const x = M[0x66];
      if (x & 4) { M[0xC34C] = (M[0xC34C] + 1) & 255; return { a: 4, x, c: 1 }; }
      if (x & 8) { M[0xC34C] = (M[0xC34C] - 1) & 255; return { a: 8, x, c: 1 }; }
      if (x & 0x10) return { a: 0x10, x, c: 0 };
    }
  };

  P.GEN.add('RACE'); P.GEN.add('PAUSE');
  // RACE ($3C99): a race. The race's screen put back (command $34 with X $80) and cleared, the
  // race's state cleared, multicolour, START_ORDER ($3EB6), the opponent placed (on piece $C765,
  // $C4 4 and $B0 $4C) and dropped; the car placed on piece X ($F488) and two steps drawn and shown
  // before the screen goes on (none after a wreck, $3DF8); then its loop: the controls, a step of
  // the world, the opponent, the view, the dust, the wheels, the crane's chains and the drawbridge,
  // the speed, the damage, the clocks and the distance, the bitmap shown and the pause. It ends
  // when the race is over and fire is pressed, or when the car is wrecked on the road and $C368
  // runs out (the sound effects stopped and the car put back on the road at piece $C309), or on a
  // key ($2F) while it is off the road or the race is lost
  P.RACE = function* (r) {
    P.DISPATCH({ a: 0x34, x: 0x80 });
    P.CLEAR_RACE({});
    P.DISPATCH({ a: 0x10, x: 0x80 });
    P.DISPATCH({ a: 2 });
    P.START_ORDER({});
    M[0xC375] = M[0xC765]; M[0xC4] = 4; M[0xB0] = 0x4C;
    P.OPP_DROP({});
    let x = M[0xC765];
    start: for (;;) {
      P.START_PLACE({ x });
      P.DUST_CLEAR({});
      if (!(M[0x3DF8] & 0x80)) { P.DASH_SPRITES({}); P.DRAW_VIEW({}); P.REQUEST_FLIP({}); P.STEP({}); }
      P.DRAW_VIEW({}); P.SPEED_TO_BAR({}); P.CMD_CRANE_CHAINS({}); yield* P.WHEEL_SPRITES({}); P.REQUEST_FLIP({}); P.STEP({});
      M[0xC307] = 0x80; M[0x3DF8] = 0x80;
      yield* P.DELAY({ y: 3 });
      P.SCREEN_ON({});
      P.START_SOUNDS({});
      P.DASH_COLOURS({});
      for (;;) {
        M[0xC30C] = (M[0xC30C] - 1) & 255;
        yield { cp: 0x3D08 }; P.CONTROLS({});
        yield { cp: 0x3D0B }; P.STEP({});
        yield { cp: 0x3D0E }; P.ENGINE_SOUND({});
        yield { cp: 0x3D11 }; P.DRAW_VIEW({});
        yield { cp: 0x3D14 }; P.DUST({});
        yield { cp: 0x3D17 }; yield* P.WHEEL_SPRITES({});
        yield { cp: 0x3D1A }; P.CMD_CRANE_CHAINS({});
        yield { cp: 0x3D1D }; P.CMD_DRAWBRIDGE({});
        yield { cp: 0x3D20 }; P.SPEED_TO_BAR({});
        yield { cp: 0x3D23 }; P.DAMAGE({});
        yield { cp: 0x3D26 }; P.RACE_CLOCKS({});
        yield { cp: 0x3D29 }; P.SHOW_DISTANCE({});
        yield { cp: 0x3D2C }; P.REQUEST_FLIP({});
        yield { cp: 0x3D2F }; yield* P.PAUSE({});
        if (((M[0xC351] & M[0xC306]) & 0x80) && !M[0x82] && (M[0x2F] || M[0x6A])) {
          // over, with the car on the road or past the line: the message, the engine quiet, and fire
          if (!M[0xC364]) P.LAMP_A({ y: 0x0B });
          P.SHOW_MESSAGE({ y: 0x3C, a: 4 });
          M[0x11] = 0xFF; M[0x10] = 0xF8; M[0x5D] = 0;
          yield* P.WAIT_FIRE({});
          break start;
        }
        if (!M[0x2F] && (M[0x6B] & 0x80) && M[0x6A]) {
          // wrecked on the road
          const a = M[0x64];
          if ((a & 0x80) || a < 2) M[0xC373] = M[0x6B];
          M[0xC368] = (M[0xC368] - 1) & 255;
          if (M[0xC368] & 0x80) {
            M[0xC368] = (M[0xC368] + 1) & 255;
            if (!M[0x6C]) { P.STOP_EFFECTS({}); x = M[0xC309]; continue start; }
          }
        }
        if (M[0x2F] || (!(M[0x6B] & 0x80) && M[0x6A])) {
          if (P.KEY_PRESSED({ x: 0x2F }).z) break start;
        }
      }
    }
    // $3DAB: the end of the race
    if (!M[0xC364]) M[0xC362] = 0xC0;
    yield* P.BORDER_BLANK({ a: 0 });
    M[0x3DF8] = 0;
    P.wr(0xD015, 0);
    P.STOP_EFFECTS({});
    let to3DE7 = true;
    if (M[0xC76C] & 0x80) {
      if (!M[0x31A1]) to3DE7 = false;
      else {
        const x = M[0x31A4];
        M[0x83B0 + x] = M[0xC719];
        if (M[0xC378] !== 4) P.CLEAR_CLOCK({ x: (x + 0x0C) & 255 });
      }
    }
    if (to3DE7) M[0xC719] = M[0xC37E];
    P.SAVE_RANDOM({});
    return P.DISPATCH({ a: 0x34, x: 0 });
  };
  // CLEAR_RACE ($3DF9): a race's state cleared: $C300-$C3FF, $0774-$07FF, $4000-$40FF, the car's
  // $0100-$018F and zero page from $02; the eleven bytes at $BFEA ($BFF5 in the Super League, $C71A 11)
  // to $C382; the view's rows' colours all 7 to $17; the clocks, the roll's tables, the sound
  // effects stopped ($E0F9), the race's random numbers, the dashboard's labels and lamps, $C76A the
  // league's or the Super League's count in decimal, $C37E kept from $C719; CLEAR_BARS
  P.CLEAR_RACE = r => {
    let x = 0;
    do {
      M[0xC300 + x] = 0;
      if (x >= 0x74) M[0x0700 + x] = 0;
      M[0x4000 + x] = 0;
      if (x < 0x90) M[0x0100 + x] = 0;
      if (x >= 2) M[x] = 0;
      x = (x - 1) & 255;
    } while (x);
    x = M[0xC71A];
    for (let y = 0; y < 0x0B; y++) { M[0xC382 + y] = M[0xBFEA + x]; x = (x + 1) & 255; }
    for (x = 0x7C; x >= 0; x -= 4) { M[0x0200 + x] = 7; M[0x0201 + x] = 0x17; }
    P.CMD_ROW_COLOURS({ x: 0xFC });
    M[0xC34F] = 0x3F;
    M[0x1C] = 0xBA; M[0x2806] = 0xBA;
    P.wr(0xD015, 0); P.wr(0xD418, 0);
    for (x = 2; x >= 0; x--) M[0x8398 + x] = 9;
    P.CLEAR_CLOCK({ x: (M[0x31A4] + 0x0C) & 255 });
    P.ROLL_TABLES({});
    M[0x33] = 0xA0; M[0x3C] = 0x78;
    P.STOP_EFFECTS({});
    M[0xC354] = 4;
    P.LOAD_RANDOM({ y: 9 });
    M[0x03] = 0x3B;
    P.DASH_LABELS({});
    const q = P.LAMP_B({ y: 0x0B });
    P.LAMP_A(q);
    x = M[0xC71A] ? M[0xC777] : M[0xC776];
    M[0xC76A] = P.TO_BCD({ a: x, x }).a;
    M[0xC37E] = M[0xC719];
    return P.CLEAR_BARS({});
  };
  // CLEAR_BARS ($3EA8): $80 in the 32 bytes at $A350 and at $8080
  P.CLEAR_BARS = r => {
    for (let x = 0x1F; x >= 0; x--) { M[0xA350 + x] = 0x80; M[0x8080 + x] = 0x80; }
    return { a: 0x80, x: 0xFF, y: r.y };
  };
  // START_ORDER ($3EB6): $C440-$C4C0, $80 in every eighth and 0 between, $C43F $C0; for several
  // players the player's own $C719 ($83B0); then $F6A6
  P.START_ORDER = r => {
    for (let x = 0x80; x >= 0; x--) M[0xC440 + x] = (x & 7) === 7 ? 0x80 : 0;
    M[0xC43F] = 0xC0;
    let x = M[0x31A1];
    if (x) { x = M[0x31A4]; M[0xC719] = M[0x83B0 + x]; }
    return P.DAMAGE_BAR({ x, y: 0x80 });
  };
  // PAUSE ($3EE0): while the bitmap at $6000 is being drawn ($C306 set), P (key $0D) pauses: the
  // sound effects stopped ($E0F9), the message "paused" (4C), then REDEFINE_KEYS over and over
  // until O (key $34), a turn of a loop that polls the keyboard; then the message that was showing
  // back and the sounds started again
  P.PAUSE = function* (r) {
    if (!(M[0xC306] & 0x80)) return { a: M[0xC306] };
    if (!P.KEY_PRESSED({ x: 0x0D }).z) return { a: 0 };
    P.STOP_EFFECTS({});
    M[0x10] = 0; M[0x11] = 0;
    const c355 = M[0xC355], start = M[0x1327], groups = M[0x1328];
    P.SHOW_MESSAGE({ y: 0x4C, a: 2 });
    for (;;) {
      yield* P.REDEFINE_KEYS({});
      if (P.KEY_PRESSED({ x: 0x34 }).z) break;
      yield;
    }
    M[0x1328] = groups; M[0x1327] = start; M[0xC355] = c355;
    if (c355 & 0x80) P.SHOW_MESSAGE({ a: groups, x: groups, y: start });
    return P.START_SOUNDS({});
  };
  // START_SOUNDS ($3F27): sound effects 6 and 5, $E104, voices 1 and 3 started on the pulse wave
  // ($41) and the volume up ($F5)
  P.START_SOUNDS = r => {
    P.EFFECT({ a: 6 });
    P.EFFECT({ a: 5 });
    P.ENGINE_SOUND({});
    P.wr(0xD404, 0x41);
    P.wr(0xD412, 0x41);
    P.wr(0xD418, 0xF5);
    return { a: 0xF5 };
  };
  // REQUEST_FLIP ($3F42): asks the interrupt to show the bitmap just drawn: flips $C306, sets $12 to
  // the bitmap to draw into next ($20 for the one at $6000, or $18 plus $A1F2 for the one at
  // $4000) and $C370 to match, and sets $C37A for the interrupt
  P.REQUEST_FLIP = r => {
    M[0xC306] ^= 0x80;
    if (M[0xC306] & 0x80) { M[0x12] = 0x20; M[0xC370] = 0x80; }
    else { const a = (0x18 + M[0xA1F2]) & 255; M[0x12] = a; M[0xC370] = a; }
    P.store(0xC37A, 0x80);
    return { a: 0x80 };
  };
  // FLIP_IF_READY ($3F6B): FLIP_DONE once the interrupt has shown the new bitmap ($C37B)
  P.FLIP_IF_READY = r => (P.irqByte(0xC37B) ? P.FLIP_DONE(r || {}) : { a: 0, z: 1 });
  // FLIP_DONE ($3F70): the view's colours brought up to date for the bitmap now shown (command
  // $46), two of the dashboard's colours ($0C), and $C37A and $C37B cleared
  P.FLIP_DONE = r => {
    const q = P.CMD_ROW_COLOURS(r || {}) || {};
    P.wr(0xDAAC, 0x0C); P.wr(0xDACB, 0x0C);
    P.store(0xC37A, 0); P.store(0xC37B, 0);
    return Object.assign({}, q, { a: 0, z: 1, n: 0 });
  };
  // MENU_BITMAP ($3F8B): the menus' bitmap and screen shown ($D018 $70, $C35F and $C370 $80)
  P.MENU_BITMAP = r => {
    M[0x14] = 0x70;
    P.wr(0xD018, 0x70);
    P.store(0xC35F, 0x80); M[0xC370] = 0x80;
    return { a: r.a, x: 0x80, y: 0x70 };
  };
  // SCREEN_ON ($3F9E): the screen on, if it is off (and then the raster interrupt at line $32), and
  // the raster interrupt enabled; SCREEN_ON_NOW ($3FA5) the same whether or not it was off
  P.SCREEN_ON = r => ((P.rd(0xD011) & 0x10) ? irqOn(r) : P.SCREEN_ON_NOW(r));
  P.SCREEN_ON_NOW = r => {
    P.wr(0xD011, (P.rd(0xD011) | 0x10) & 0x7F);
    P.wr(0xD012, 0x32);
    return irqOn(r);
  };
  const irqOn = r => { P.wr(0xD01A, 1); return { a: 1, x: r.x, y: r.y }; };
  P.GEN.add('BORDER_BLANK'); P.GEN.add('BLANK_SCREEN'); P.GEN.add('DELAY_20'); P.GEN.add('DELAY');
  // BORDER_BLANK ($3FBB): BLANK_SCREEN with the border of colour A ($3FBA)
  P.BORDER_BLANK = function* (r) { M[0x3FBA] = r.a & 255; return yield* P.BLANK_SCREEN(r); };
  // BLANK_SCREEN ($3FBE): waits, up to about a frame, for the raster's top ten lines, then the border
  // of $3FBA's colour, the screen blanked, and a short delay
  // The wait is 1,029 turns of a loop of 17 cycles, about 278 lines, so begun within 35 lines of
  // the top it ends before the top comes round again. Its entry and exit are checkpoints, so that
  // the port reads the raster where the game does (the work before it, a menu's or a race's setting
  // up, takes the game far down the screen) and goes on from where the game's loop left
  P.CHECKPOINTS.push(0x3FBE, 0x3FD6);
  P.BLANK_SCREEN = function* (r) {
    yield { cp: 0x3FBE };
    const line = () => P.rd(0xD012) | ((P.rd(0xD011) & 0x80) << 1);
    const l = line();
    yield { cycles: l < 0x0A ? 21 : Math.min((312 - l) * 63, 17500), at: 0x3FD6 };
    P.wr(0xD020, M[0x3FBA]);
    P.wr(0xD011, P.rd(0xD011) & 0xEF);
    return yield* P.DELAY({ x: r.x, y: 1 });
  };
  // DELAY_20 ($3FE9): DELAY with 20
  P.DELAY_20 = function* (r) { return yield* P.DELAY({ x: r.x, y: 0x14 }); };
  // DELAY ($3FEB): Y times 20 times 256 turns of a loop, about two frames for each of Y ($14's
  // count to 0 first)
  P.DELAY = function* (r) {
    let y = r.y & 255, cycles = 0;
    do {
      cycles += 5;
      M[0x15] = 0x14;
      do {
        cycles += (M[0x14] || 256) * 8 - 1;
        M[0x14] = 0;
        M[0x15] = (M[0x15] - 1) & 255;
        cycles += M[0x15] ? 8 : 7;
      } while (M[0x15]);
      y = (y - 1) & 255;
      cycles += y ? 5 : 4;
    } while (y);
    yield { cycles: cycles + 6 };
    return { a: 0x14, x: r.x, y: 0, z: 1 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
