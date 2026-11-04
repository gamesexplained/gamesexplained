// The records and the Hall of Fame ($91B4-$9318, $9846-$9A31), and the players' own keys: each
// track's lap and race records, kept under the chips at $DE00 and $DF00 with their holders' names,
// broken and shown after a race; the Hall of Fame's screen of them; the bonus points of a game for
// several; and the keys redefined from the pause (F1), kept for each player.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.records = P => {
  const M = P.M;
  P.COST = P.COST || {};
  // one scan of the keyboard's 64 keys while keys are being redefined, in cycles
  P.COST.keyScan = P.COST.keyScan || 64 * 120;

  P.GEN.add('PAIR_RESULTS'); P.GEN.add('BONUS_RESULTS');
  // PAIR_RESULTS ($91B4): the table of a game for several at the end of a track's pair of races
  // ($31A5 set meanwhile: BONUS_RESULTS, then RESULTS_TABLE)
  P.PAIR_RESULTS = function* (r) {
    M[0x31A5] = 0x80;
    yield* P.BONUS_RESULTS({});
    const q = yield* P.RESULTS_TABLE({});
    M[0x31A5] = (M[0x31A5] << 1) & 255;
    return q;
  };
  // BONUS_RESULTS ($91C3): RESULTS_TABLE with $C39C set, the race times of the pair
  P.BONUS_RESULTS = function* (r) {
    M[0xC39C] = 0x80;
    const q = yield* P.RESULTS_TABLE({});
    M[0xC39C] = (M[0xC39C] << 1) & 255;
    return q;
  };

  // BONUS_LINES ($91CF): the pair's bonuses, from row $0E: one more of the table's wins ($C728) to
  // the driver of the fastest race ($C76E) and one more of its fastest laps ($C734) to the driver of
  // the fastest lap ($C76D), each named; then the division sorted again
  P.BONUS_LINES = r => {
    M[0x19] = 0x0E;
    M[0x3953] = 0x0A;
    let q = P.LINES_3({});
    M[0x3953] = 0x0F;
    q = P.PRINT_STRING_B({ x: 0x23, y: q.y });
    let x = M[0xC76E];
    if (x) { M[0xC728 + x] = (M[0xC728 + x] + 1) & 255; q = P.DRIVER_NAME({ x, y: q.y }); q = P.PRINT_STRING({ x: 0xE9, y: q.y }); }
    q = P.PRINT_AT({ x: 5, y: (M[0x7A] + 1) & 255 });
    q = P.PRINT_STRING_B({ x: 0x2F, y: q.y });
    x = M[0xC76D];
    if (x) { M[0xC734 + x] = (M[0xC734 + x] + 1) & 255; q = P.DRIVER_NAME({ x, y: q.y }); q = P.PRINT_STRING({ x: 0xEF, y: q.y }); }
    return P.SORT_DIVISION(q);
  };

  // SHOW_RECORDS ($9225): under the results, the records the player has broken ($C305: bit 0 says
  // which message, bit 7 the race's record and bit 6 the lap's), each with the name now held at
  // $31AA ($D6, $C9) and its time (clocks $0F and $0E)
  P.SHOW_RECORDS = r => {
    if (!M[0xC305]) return { a: 0 };
    let q = P.COLOUR_ROW({ x: 6, y: 0x14 });
    q = P.COLOUR_RUNS({ x: 0x14, a: 1, y: q.y });
    let x = 0xB8, y = 5;
    M[0x19] = 3;
    if (M[0xC305] & 1) { x = 0xE3; y = 7; M[0x19] = 0x10; }
    M[0x3953] = y;
    q = P.PRINT_MENU_STRING({ x, y });
    if ((M[0xC305] & 0xC0) === 0xC0) q = P.PRINT_MENU_STRING({ x: 0x6F, y: q.y });
    q = P.LINES_3({});
    M[0x3953] = 0x0F;
    if (M[0xC305] & 0x80) {
      q = P.PRINT_STRING_B({ x: 0x23, y: q.y });
      q = P.PRINT_MENU_STRING({ x: 0xD6, y: q.y });
      q = P.SPACE(q);
      q = P.PRINT_TIME({ x: 0x0F, y: q.y });
    }
    if (!(M[0xC305] & 0x40)) return q;
    q = P.PRINT_AT({ x: 5, y: (M[0x7A] + 1) & 255 });
    q = P.PRINT_STRING_B({ x: 0x2F, y: q.y });
    q = P.PRINT_MENU_STRING({ x: 0xC9, y: q.y });
    q = P.SPACE(q);
    return P.PRINT_TIME({ x: 0x0E, y: q.y });
  };

  // CHECK_RECORDS ($92A2): at the end of the player's lap X: the race's fastest lap so far (clock
  // $0C, its driver into $C76D) and the track's lap record (clock $0E: the player's name into the
  // menus' strings at $C9, $C305 bits 6 and 0); the lap added to the player's race time (clock
  // $31A4 + $0C); and at the race's end (lap 4, $C378) the fastest race (clock $0D, $C76E) and the
  // track's race record (clock $0F: the name at $D6, $C305 bits 7 and 0)
  P.CHECK_RECORDS = r => {
    let x = r.x & 255;
    if (!P.FASTER({ x, y: 0x0C }).c) M[0xC76D] = M[0x31A4];
    if (!P.FASTER({ x, y: 0x0E }).c) {
      P.RECORD_NAME({ y: 0xC9 });
      M[0xC305] |= 0x41;
      x = 0;
    }
    let y = M[0x31A4];
    P.FASTER({ x, y });
    y = (y + 0x0C) & 255;
    P.ADD_TIME({ x, y });
    if (M[0xC378] === 4) {
      x = y;
      if (!P.FASTER({ x, y: 0x0D }).c) M[0xC76E] = M[0x31A4];
      if (!P.FASTER({ x, y: 0x0F }).c) {
        P.RECORD_NAME({ y: 0xD6 });
        M[0xC305] |= 0x81;
      }
    }
    return { x: 0 };
  };
  // RECORD_NAME ($9300): the player's twelve-letter name ($AE01 + 16 $31A4) into the menus' strings
  // at $31AA + Y
  P.RECORD_NAME = r => {
    let x = (M[0x31A4] << 4) & 255, y = r.y & 255, a = 0;
    for (let n = 0x0C; n; n--) { a = M[0xAE01 + x]; M[0x31AA + y] = a; x = (x + 1) & 255; y = (y + 1) & 255; }
    M[0x14] = 0;
    return { a, x, y, z: 1 };
  };

  // TRACK_RECORDS ($9319): the records of the track raced ($C77D in the order at $3728, the Super
  // League's eight on, $C71A), sixteen bytes in each of the pages under the chips: the lap's at
  // $DE00 and the race's at $DF00, each a twelve-letter holder's name and a time. With A bit 7 set
  // they are put where the race keeps them (the names at $3273 and $3280, the times in clocks $0E
  // and $0F) and the chips banked back in; clear, the race's are kept there, with the chips left
  // banked out for the caller
  P.TRACK_RECORDS = r => {
    M[0x14] = r.a & 255;
    P.ALL_RAM({});
    let a = M[0x3728 + M[0xC77D]];
    if (M[0xC71A]) a = (a + 8) & 255;
    let x = (a << 4) & 255, y;
    const out = !(M[0x14] & 0x80);
    for (y = 0; y < 0x0C; y++, x = (x + 1) & 255) {
      if (out) { M[0xDE00 + x] = M[0x3273 + y]; M[0xDF00 + x] = M[0x3280 + y]; }
      else { M[0x3273 + y] = M[0xDE00 + x]; M[0x3280 + y] = M[0xDF00 + x]; }
    }
    const pairs = [[0xDE00, 0x83A6], [0xDE01, 0x82BE], [0xDE02, 0x82A6], [0xDF00, 0x83A7], [0xDF01, 0x82BF], [0xDF02, 0x82A7]];
    for (const [rec, clock] of pairs) { if (out) M[rec + x] = M[clock]; else M[clock] = M[rec + x]; }
    if (out) return { a: M[0x82A7], x, y };
    P.IO_BACK({});
    return { a: 1, x, y };
  };

  // PLAYER_KEYS ($9846): in a game for several, the five keys READ_CONTROLS reads ($F807) kept for
  // the player whose turn it is ($31A4, the drivers from 4), five bytes each at $987A: put in with A
  // bit 7 set, kept with it clear
  P.PLAYER_KEYS = r => {
    M[0x14] = r.a & 255;
    if (!M[0x31A1]) return { a: 0, x: r.x, y: r.y, z: 1 };
    M[0x15] = (M[0x31A4] - 4) & 255;
    let y = ((M[0x15] * 5) + 4) & 255, x = 4, a = 0;
    const put = M[0x14] & 0x80;
    for (; x >= 0; x--, y = (y - 1) & 255) {
      if (put) { a = M[0x987A + y]; M[0xF807 + x] = a; } else { a = M[0xF807 + x]; M[0x987A + y] = a; }
    }
    return { a, x: 0xFF, y };
  };

  P.GEN.add('REDEFINE_KEYS');
  // REDEFINE_KEYS ($97AF): in the pause, with F1 held (key $20), the five keys defined again: a
  // message for each in the order $983C names (messages from $9841), each key taken as it is pressed
  // (a beep, EFFECT 0) and let go; then the five again to confirm, any that differ starting it all
  // over; and the last message. Otherwise nothing
  P.REDEFINE_KEYS = function* (r) {
    if (!P.KEY_PRESSED({ x: 0x20 }).z) return { a: 0 };
    let at = 0x97B7;
    for (;;) {
      if (at === 0x97B7) {
        P.SHOW_MESSAGE({ a: 4, y: 0x64 });
        M[0x983B] = 1;
      }
      // $97C3
      yield* P.DELAY({ y: 0x28 });
      let x = 4, again = false;
      for (;;) {
        M[0x983A] = x;
        P.SHOW_MESSAGE({ a: 4, y: M[0x9841 + x], x });
        // $97D5: the keys scanned from $3F down until one is held
        let k;
        for (;;) {
          for (k = 0x3F; k >= 0; k--) { M[0x17] = k; if (P.KEY_PRESSED({ x: k }).z) break; }
          if (k >= 0) break;
          yield { cycles: P.COST.keyScan };
        }
        const y = M[0x983C + M[0x983A]];
        if (M[0x983B]) M[0xF807 + y] = k;
        else if (k !== M[0xF807 + y]) {
          P.SHOW_MESSAGE({ a: 4, y: 0xD4 });
          yield* P.DELAY({ y: 0x28 });
          again = true;
          break;
        }
        P.EFFECT({ a: 0 });
        while (P.KEY_PRESSED({ x: M[0x17] }).z) yield { cycles: P.COST.keyScan >> 6 };
        yield* P.DELAY({ y: 3 });
        x = (M[0x983A] - 1) & 255;
        if (x & 0x80) break;
      }
      if (again) { at = 0x97B7; continue; }
      M[0x983B] = (M[0x983B] - 1) & 255;
      if (M[0x983B] & 0x80) return P.SHOW_MESSAGE({ a: 2, y: 0x4C });
      P.SHOW_MESSAGE({ a: 4, y: 0xC4 });
      at = 0x97C3;
    }
  };

  P.GEN.add('HALL_OF_FAME');
  // HALL_OF_FAME ($98D2): the Hall of Fame: the records of the league's eight tracks (or the Super
  // League's, $C71A) copied from under the chips to $0400, the bitmap at $4000 cleared and coloured
  // in hi-res, the headings, and for each track (its letters at $99EF) the lap record's holder and
  // time and the race record's; fire, and the league's screen again
  P.HALL_OF_FAME = function* (r) {
    yield* P.BORDER_BLANK({ a: 6 });
    P.ALL_RAM({});
    let y = M[0xC71A] ? 0xFF : 0x7F;
    for (let x = 0x7F; x >= 0; x--, y = (y - 1) & 255) { M[0x0400 + x] = M[0xDE00 + y]; M[0x0480 + x] = M[0xDF00 + y]; }
    M[1] = 0x35;
    P.DISPATCH({ a: 1 });
    P.wr(0xD020, 6);
    M[0x1E] = 0;
    for (M[0x1F] = 0x5F; M[0x1F] >= 0x40; M[0x1F]--) { let i = 0; do { M[(M[0x1F] << 8) + i] = 0; i = (i - 1) & 255; } while (i); }
    let q = P.COLOUR_ROW({ x: 0, y: 0 });
    q = P.COLOUR_RUNS({ x: 0x18, a: 6, y: q.y });
    for (M[0x19] = 8; M[0x19]; M[0x19]--) q = P.COLOUR_RUNS({ x: 0x24, a: 8, y: q.y });
    q = P.COLOUR_RUNS({ x: 0x34, a: 1, y: q.y });
    M[0xC3D9] = 1; M[0xC3D9] = 2;
    q = P.PRINT_STRING_B({ x: 0x3B, y: q.y });
    if (M[0xC71A]) q = P.PRINT_STRING_B({ x: 0x4B, y: q.y });
    q = P.PRINT_STRING_B({ x: 0x5B, y: q.y });
    for (M[0x19] = 7; !(M[0x19] & 0x80); M[0x19] = (M[0x19] - 1) & 255) {
      q = P.PRINT_AT({ x: 0, y: (((7 - M[0x19]) << 1) + 8) & 255 });
      let x = (M[0x19] << 1) & 255;
      M[0xC3D9] = 1;
      P.PRINT_CHAR({ a: M[0x99EF + x], x, y: q.y });
      P.PRINT_CHAR({ a: M[0x99F0 + x], x, y: q.y });
      P.SPACE({ x, y: q.y });
      M[0xC3D9] = 4;
      M[0x08] = 0;
      for (;;) {
        x = ((M[0x19] << 4) | M[0x08]) & 255;
        for (let n = 0x0C; n; n--) { P.PRINT_CHAR({ a: M[0x0400 + x], x, y: n }); x = (x + 1) & 255; }
        P.SPACE({ x, y: 0 });
        M[0xC3D9] = (M[0xC3D9] - 1) & 255;
        M[0x8398] = M[0x0400 + x]; M[0x82B0] = M[(0x0401 + x) & 0xFFFF]; M[0x8298] = M[(0x0402 + x) & 0xFFFF];
        q = P.PRINT_TIME({ x: 0, y: 0 });
        M[0x08] ^= 0x80;
        if (!(M[0x08] & 0x80)) break;
        q = P.SPACES_2(q);
        M[0xC3D9] = 2;
      }
    }
    M[0xC3D9] = 0;
    P.wr(0xD011, P.rd(0xD011) | 0x10);
    q = yield* P.WAIT_FIRE({});
    q = P.SCREEN_ON_NOW(q);
    return yield* P.RACE_VIEW_SCREEN(q);
  };

  // PRINT_TIME ($99FF): clock X as minutes, seconds and hundredths (M:SS.HH), or seven dashes when
  // it is 9 minutes or more, or no time at all
  P.PRINT_TIME = r => {
    const x = r.x & 255;
    const m = M[0x8398 + x];
    if (m >= 9 || !(m | M[0x82B0 + x])) {
      for (let y = 7; y; y--) P.PRINT_CHAR({ a: 0x2D, x, y });
      return { a: 0x2D, x, y: 0, z: 1 };
    }
    P.PRINT_DIGIT({ a: m, x, y: r.y });
    P.PRINT_CHAR({ a: 0x3A, x, y: r.y });
    P.PRINT_BCD({ a: M[0x82B0 + x], x, y: r.y });
    P.PRINT_CHAR({ a: 0x2E, x, y: r.y });
    return P.PRINT_BCD({ a: M[0x8298 + x], x, y: r.y });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
