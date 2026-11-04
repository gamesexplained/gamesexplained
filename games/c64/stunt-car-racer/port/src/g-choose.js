// The main menu and its choosers ($ED7F-$F020, $98A2): the chooser of a numbered list, the entry of
// a name, the main menu with its practice, league, hall of fame and file choices, and the choice of
// a track to practise on.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.choose = P => {
  const M = P.M;
  // what the main menu throws to start the game again from START (EF74's JMP $3B22, after which
  // START sets the stack afresh): START catches it
  P.RESTART = P.RESTART || { restart: true };
  // one turn of the chooser's loops (READ_CONTROLS and the keys of its items), in cycles
  P.COST = P.COST || {};
  P.COST.chooseTurn = P.COST.chooseTurn || 1500;

  P.GEN.add('MENU_CHOICE');
  // MENU_CHOICE ($EE36): a numbered list in the panel, items 0 to Y (Y + 1 items), each string
  // $F001 + X + its number of the table at $E000, A the item lit at the start. The list is drawn
  // again at each change; the item chosen is lit in colour 7, and in colour $0A once fire picks it.
  // The controls let go first, then fire takes the item lit, a number key ($F80C on) the item of its
  // number, and forward or back move the light up or down. After the list of string $18 (the
  // divisions) each item's number; after the list of string $1C (a division's tracks) the track's
  // name. The item chosen comes back in A.
  P.MENU_CHOICE = function* (r) {
    M[0x31] = (r.y - 1) & 255; M[0x30] = r.x & 255; M[0x0C] = r.a & 255;
    let q = P.DIVISION_PANEL({});
    M[0x0F] = 0;
    q = P.PRINT_STRING_E000({ x: 0, y: q.y });
    for (;;) {
      // EE47: the list drawn
      M[0x19] = 0;
      for (;;) {
        let y = M[0x19];
        M[0x17] = y;
        if (y === M[0x0C]) { y = M[0x0F]; M[0x3953] = y ? 0x0A : 0x07; }
        q = P.LINE_START({ x: q.x, y });
        M[0x3953] = 0x0F;
        q = P.PRINT_DIGIT({ a: (M[0x17] + 1) & 255, x: q.x, y: q.y });
        q = P.PRINT_CHAR({ a: 0x2E, x: q.x, y: q.y });
        q = P.SPACE(q);
        y = (M[0x17] + M[0x30]) & 255;
        q = P.PRINT_STRING_E000({ x: M[0xF001 + y], y });
        if (M[0x30] === 0x18) q = P.PRINT_DIGIT({ a: (M[0x17] + 1) & 255, x: q.x, y: q.y });
        if (M[0x31] < M[0x17]) break;
        if (M[0x30] !== 0x1C) continue;
        q = P.PRINT_STRING({ x: 0x23, y: q.y });
        y = ((M[0x31A7] << 1) + M[0x17]) & 255;
        q = P.TRACK_NAME({ x: M[0x3728 + y], y });
      }
      if (M[0x0F]) {
        // EEB2: chosen
        q = P.TEXT_ON_ROWS({ y: q.y });
        yield* P.DELAY({ x: q.x, y: 7 });
        const a = M[0x0C];
        return { a, x: q.x, y: 0, z: a ? 0 : 1, n: a >> 7 };
      }
      // EEC1: the controls let go, a pause, and then a change looked for
      do { yield { cycles: P.COST.chooseTurn }; q = P.READ_CONTROLS({}); } while (!q.z);
      q = yield* P.DELAY({ x: q.x, y: 2 });
      for (;;) {
        yield { cycles: P.COST.chooseTurn };
        q = P.READ_CONTROLS({});
        M[0x0F] = q.a & 0x10;
        if (M[0x0F]) break;
        let y = (M[0x31] + 1) & 255, hit = false;
        do {
          if (P.KEY_PRESSED({ x: M[0xF80C + y], y }).z) { M[0x0C] = y; hit = true; break; }
          y = (y - 1) & 255;
        } while (!(y & 0x80));
        if (hit) break;
        let x = M[0x0C];
        const j = M[0x66] & 3;
        if (!j) continue;
        if (j & 1) { x = (x - 1) & 255; if (x & 0x80) x = 0; }
        else if (x <= M[0x31]) x = (x + 1) & 255;
        M[0x0C] = x;
        break;
      }
      q = { x: q.x, y: q.y };
    }
  };

  P.GEN.add('NAME_ENTRY'); P.GEN.add('NAME_ENTRY_AT');
  // NAME_ENTRY ($ED7F): a driver's name typed in the panel, for the player being added ($31A1): the
  // panel cleared and framed, string $E0, the prompt ">" at column $0E of row $10, and the name
  // into driver 11 - $31A1's place at $AE00 (NAME_ENTRY_AT, the line under it from X $64, Y $BD)
  P.NAME_ENTRY = function* (r) {
    P.CLEAR_PANEL({});
    let q = P.PANEL_FRAME({});
    q = P.PRINT_STRING({ x: 0xE0, y: q.y });
    M[0x19] = 1;
    P.LINE_START({});
    q = P.PRINT_AT({ x: 0x0E, y: 0x10 });
    P.PRINT_CHAR({ a: 0x3E, x: q.x, y: q.y });
    return yield* P.NAME_ENTRY_AT({ a: ((0x0B - M[0x31A1]) << 4) & 255, x: 0x64, y: 0xBD });
  };
  // NAME_ENTRY_AT ($EDAB): up to twelve characters typed into $AE01 + A, the start of a sixteen-byte
  // name, with a line drawn under where they go (HLINE at X, Y, $0B long). Return ends it, the rest
  // of the twelve filled with spaces. Letters, figures and . / : take their place (with A's bits 7
  // and 6 both set, a lower-case letter in its capital), a space only after the first character,
  // and DEL rubs one out; nothing else counts. The C= key (code 1) cancels the file menus' name
  // (A $C0), setting $EE35 bit 7, which is otherwise cleared
  P.NAME_ENTRY_AT = function* (r) {
    M[0x0B] = r.a & 255;
    P.HLINE({ a: 0x0B, x: r.x, y: r.y });
    M[0xEE35] >>= 1;
    let x = 0, y;
    for (;;) {
      // EDB7
      yield* P.DELAY({ x, y: 2 });
      y = (x + M[0x0B]) & 255;
      const q = yield* P.WAIT_KEY({ x, y });
      let a = q.a & 255;
      x = q.x & 255; y = q.y & 255;
      if (a === 0x01) {
        if (M[0x0B] !== 0xC0) continue;
        M[0xEE35] = 0x80;
        return P.TEXT_ON_ROWS({ y });
      }
      if (a === 0x0D) {
        while (x !== 0x0C) { y = (x + M[0x0B]) & 255; M[0xAE01 + y] = 0x20; x = (x + 1) & 255; }
        return P.TEXT_ON_ROWS({ y });
      }
      let put;
      if (a === 0x20) put = x !== 0;
      else put = (a >= 0x2E && a < 0x3B) || (a >= 0x41 && a < 0x5B) || (a >= 0x61 && a < 0x7B);
      if (!put) {
        if (a !== 0x7F) continue;
        x = (x - 1) & 255;
        if (x & 0x80) { x = 0; continue; }
        P.PRINT_CHAR({ a, x, y });
        continue;
      }
      if (a >= 0x60 && (M[0x0B] & 0xC0) === 0xC0) a = (a - 0x20) & 255;
      if (x >= 0x0C) continue;
      P.PRINT_CHAR({ a, x, y });
      M[0xAE01 + y] = a;
      x = (x + 1) & 255;
    }
  };

  P.GEN.add('MAIN_MENU');
  // MAIN_MENU ($EF3A): the main menu, and after a practice race straight back to the choice of
  // track ($31A8). Its items: 0 the Hall of Fame (HALL_OF_FAME); 1 Practise (a division and a track,
  // PRACTICE_TRACK, then a return with the track picked); 2 the Racing Season (lit once one has
  // begun, $C76C bit 7: the save code made and $C76C set); 3 a second list of Load, Save, Replay
  // and Cancel. Replay: the season's points cleared (RESET_SEASON); with F1 held (key $20) the game
  // starts again at START, the players chosen afresh; otherwise for one player the season again
  // from the random numbers its save code kept (SAVE_CODE), and when that code does not read back,
  // or with several players, a new league (NEW_LEAGUE). Load and Save: the league's 256 bytes at
  // $8000 kept at $7B00 and $C77E at $F000, tape or disc asked for (into $0840), the code made, and
  // SAVE_OR_LOAD. The league kept is put back after a save, after a failure, and after a load whose
  // save code does not read back (then $C39A $81, the incorrect data), but not for the Hall of
  // Fame, a directory or a game for several ($C367). Then the result (FILE_RESULT) and the league's
  // screen again; a name cancelled goes straight back to the menu.
  P.MAIN_MENU = function* (r) {
    let at = 0xEF3A, q, a;
    for (;;) {
      if (at === 0xEF3A) {
        if (M[0x31A8]) { at = 0xEF0F; continue; }
        q = yield* P.MENU_CHOICE({ a: (M[0xC76C] & 0x80) ? 2 : 1, x: 0, y: 3 });
        a = q.a & 255;
        if (a === 2) {
          q = P.SAVE_CODE({ a: 0 });
          M[0xC76C] = 0x80;
          return { a: 0x80, x: q.x, y: q.y };
        }
        if (a < 2) {
          if (a) { at = 0xEF0F; continue; }
          yield* P.HALL_OF_FAME({});
          continue;
        }
        yield* P.DELAY_20({ x: q.x });
        q = yield* P.MENU_CHOICE({ a: 3, x: 4, y: 3 });
        a = q.a & 255;
        if (a < 2) { at = 0xEF8C; continue; }
        if (a !== 2) { at = 0xEF37; continue; }
        P.RESET_SEASON({});
        if (P.KEY_PRESSED({ x: 0x20 }).z) { yield* P.PANEL_SCREEN({}); throw P.RESTART; }
        if (!M[0x31A1]) {
          yield* P.BLANK_SCREEN({});
          if (!P.SAVE_CODE({ a: 0x80 }).c) { at = 0xEFF4; continue; }
        }
        P.NEW_LEAGUE({});
        at = 0xEFF4;
      } else if (at === 0xEF0F) {
        q = yield* P.PRACTICE_TRACK({});
        a = q.a & 255;
        if (a >= 2) { at = 0xEF3A; continue; }
        M[0xC76C] = a; M[0x31A8] = 1;
        q = P.PICK_TRACK({ a: ((M[0x31A7] << 1) + M[0xC76C]) & 255, y: q.y });
        return yield* P.DELAY_20(q);
      } else if (at === 0xEF37) {
        yield* P.DELAY_20({});
        at = 0xEF3A;
      } else if (at === 0xEF8C) {
        M[0xC77B] = a;
        const x = ((a << 2) + 8) & 255;
        let y = 0;
        do { M[0x7B00 + y] = M[0x8000 + y]; y = (y - 1) & 255; } while (y);
        M[0xF000] = M[0xC77E];
        yield* P.DELAY_20({ x });
        q = yield* P.MENU_CHOICE({ a: M[0x0840], x, y: 2 });
        a = q.a & 255;
        if (a >= 2) { at = 0xEF37; continue; }
        M[0x0840] = a;
        P.SAVE_CODE({ a: 0 });
        yield* P.SAVE_OR_LOAD({});
        if (M[0xEE35] & 0x80) { at = 0xEF3A; continue; }
        if (M[0xC367]) at = 0xEFF1;
        else if ((M[0xC39A] & 0x80) || M[0xC77B]) at = 0xEFE0;
        else if (!P.SAVE_CODE({ a: 0x80 }).c) at = 0xEFF1;
        else { M[0xC39A] = 0x81; at = 0xEFE0; }
        if (at === 0xEFE0) {
          M[0xC77E] = M[0xF000];
          y = 0;
          do { M[0x8000 + y] = M[0x7B00 + y]; y = (y - 1) & 255; } while (y);
        }
        yield* P.FILE_RESULT({});
        at = 0xEFF4;
      } else {
        // EFF4
        yield* P.PANEL_SCREEN({});
        yield* P.MENU_BACKDROP({});
        yield* P.LEAGUE_TABLE({});
        at = 0xEF3A;
      }
    }
  };

  P.GEN.add('PRACTICE_TRACK');
  // PRACTICE_TRACK ($98A2): the practice's choices: a division, from the menus' strings ($31A0 set),
  // into $31A7 (0 the top; skipped once after a practice race, $31A8), then one of its two tracks or
  // Cancel (2), the one before lit ($C76C bit 0). The choice comes back in A
  P.PRACTICE_TRACK = function* (r) {
    M[0x31A0] = 0x80;
    const was = M[0x31A8] & 1;
    M[0x31A8] >>= 1;
    if (!was) {
      const q = yield* P.MENU_CHOICE({ a: M[0xC718] ^ 3, x: 0x18, y: 3 });
      M[0x31A7] = (q.a ^ 3) & 255;
    }
    M[0x31A0] >>= 1;
    const q = yield* P.MENU_CHOICE({ a: M[0xC76C] & 1, x: 0x1C, y: 2 });
    M[0x31A0] = 0;
    return { a: q.a, x: q.x, y: 0, z: q.z, n: q.n };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
