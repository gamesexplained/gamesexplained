// The game from its first instruction: the main menu and the scenario loaded from tape, the
// choices before a game, and the turns, each side's in turn, with what each turn begins with: the
// units that arrive, the action points and stamina each unit has for it, and the computer's or the
// player's move. Between turns, a menu to save, check or leave the game. P.program() is the whole of
// it, the page's main loop.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.game = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const IN = port => P.io.in(port & 0xFFFF) & 0xFF;

  // $5E28: the start. The engine's variables, $5B00 to $5E25, cleared, the border black, and the
  // main menu. The stack is set at $5E39 here and again at each restart, so a return past the
  // menu never happens.
  P.def(0x5E28, 'start', function* () {
    M.fill(0, 0x5B00, 0x5E26);
    P.io.out(0xFE, 0, P.T);
    return yield* P.mainMenu();
  });
  // $5E40: in a game against the computer ($B706), $5DF7 is the side whose turn it is: set for the
  // computer's (the second), clear for the player's.
  P.def(0x5E40, 'computerSide', () => {
    if (!M[0xB706]) return { a: 0, zf: true };
    M[0x5DF7] = M[0xB712];
    return { a: M[0xB712] };
  });
  // $5E4C: a new game. The controls; one player or two; the first side equips and places its
  // units, and its units come off the map; the second does the same, when a player has it. The
  // second side's squares for placing are cleared, every unit put on the map, the views of both
  // sides set to the same corner, the units of turn 0 arrive, and the turns begin.
  P.def(0x5E4C, 'newGame', function* () {
    yield* P.chooseControls();
    yield* P.chooseGame();
    M[0xB712] = 0;
    yield* P.deploy();
    yield* P.placeUnits();
    P.tableUnits();
    P.hideSide({ a: 0 });
    M[0xB712] = 1;
    if (!M[0xB706]) {
      yield* P.deploy();
      yield* P.placeUnits();
    }
    P.clearDeploy();
    P.showAllUnits();
    setw(0xB707, 0x2213); setw(0xB70B, 0x2213);
    setw(0xB709, 0x0505); setw(0xB70D, 0x0505);
    P.arrivals();
    P.tableUnits();
    return yield* P.turns();
  });
  // $5E92: the turns, for good. The menu between turns; the turn's number ($B711) on by one and
  // its units arrived; then each side's half-turn ($5EA6), and whether the game is over.
  P.def(0x5E92, 'turns', function* () {
    for (;;) {
      yield* P.turnMenu();
      M[0xB712] = 0;
      M[0x5D36] = 0;
      M[0x5D16] = 0;
      M[0xB711] = M[0xB711] + 1 & 255;
      P.arrivals();
      while (M[0xB712] < 2) yield* P.halfTurn();
      yield* P.checkEnd();
    }
  });
  // $5EA6: a side's half-turn. Each unit of the side ($25 bit 0) begins it afresh: its most action
  // points ($05) its own ($1B) less its load ($19), and its points ($06) those less its wounds'
  // share (healthShare) and its $11. Stamina ($0A) comes back by the points it did not spend last
  // time, short of half its most, up to its full ($09), and goes down by those it spent beyond
  // half; under $20 of it halves the points. A unit always has a tenth of its most. In the first
  // side's half-turn, each unit's count at $B63A + number goes down by one, to 0.
  // Then the map as the side sees it, its own view and cursor ($B707 + 4 x side), and its move:
  // the computer's (the scenario's $B621) or the player's (the turn's screen and cursor mode).
  // After it the view is kept, the scenario's $B630 runs, the fuses go off, and the side is the
  // next.
  P.def(0x5EA6, 'halfTurn', function* () {
    for (let b = 20; b; b--) {
      M[0x5D26] = 0xA0 - b;
      const ix = P.unitPtr({ a: M[0x5D26] }).ix;
      if (!M[0xB712]) {
        const hl = 0xB63A + M[0x5D26] - 0x8C;
        if (M[hl]) M[hl]--;
      }
      if ((M[ix + 0x25] & 1) !== M[0xB712]) continue;
      M[ix + 0x25] &= ~0x40;
      P.updateLoad({ ix });
      const most = M[ix + 0x1B] - M[ix + 0x19] & 255;
      M[ix + 5] = most;
      M[ix + 6] = most;
      const hurt = P.healthShare({ ix }).a;
      M[ix + 6] = M[ix + 6] - hurt - M[ix + 0x11] & 255;
      const half = M[ix + 5] >> 1, spent = M[ix + 0x22];
      if (spent < half) {
        let a = M[ix + 0x0A] + (half - spent);
        if (a > 255) a = 255;
        if (a >= M[ix + 9]) a = M[ix + 9];
        M[ix + 0x0A] = a;
      } else if (spent > half) {
        const a = M[ix + 0x0A] - (spent - half);
        M[ix + 0x0A] = a < 0 ? 0 : a;
      }
      M[ix + 0x22] = 0;
      if (M[ix + 0x0A] < 0x20) M[ix + 6] >>= 1;
      const tenth = P.divRound({ a: M[ix + 5], b: 10 }).c;
      if (tenth >= M[ix + 6]) M[ix + 6] = tenth;
    }
    P.sideView();
    let hl = P.viewSlot().hl;
    M[V.VIEW_ROW] = M[hl]; M[V.VIEW_COL] = M[hl + 1];
    M[V.CURSOR_ROW] = M[hl + 2]; M[V.CURSOR_COL] = M[hl + 3];
    P.computerSide();
    if (M[0x5DF7]) yield* P.computerTurn();
    else {
      yield* P.turnScreen();
      yield* P.cursorMode();
    }
    hl = P.viewSlot().hl;
    M[hl] = M[V.VIEW_ROW]; M[hl + 1] = M[V.VIEW_COL];
    M[hl + 2] = M[V.CURSOR_ROW]; M[hl + 3] = M[V.CURSOR_COL];
    yield* P.scenarioHalfTurn();
    yield* P.fuses();
    M[0xB712] = M[0xB712] + 1 & 255;
    return { a: M[0xB712] };
  });
  // $5FA7: HL = the side's view and cursor, four bytes at $B707 + 4 x side.
  P.def(0x5FA7, 'viewSlot', () => {
    const hl = 0xB707 + 4 * M[0xB712] & 0xFFFF;
    return { hl, de: 0xB707 };
  });
  // $5FB4: the screen a player's half-turn begins with: message $54, the side's name, the turn's
  // number and the turns left ($B701 less it), the scores; fire to play.
  P.def(0x5FB4, 'turnScreen', function* () {
    P.clearScreen();
    P.infoText({ a: 0x54 });
    setw(V.ATTR, 0x4707);
    P.scenarioMessageAt({ hl: 0x0C06, a: 0xA0 + M[0xB712] & 255 });
    setw(V.PRINT_ROW, 0x0A09);
    P.printNumber({ a: M[0xB711] });
    setw(V.PRINT_ROW, 0x1909);
    P.printNumber({ a: M[0xB701] - M[0xB711] & 255 });
    P.scores();
    P.text({ a: 0x53 });
    yield* P.waitRelease();
    yield* P.waitFire();
    P.clearScreen();
    return yield* P.waitRelease();
  });

  // $B0AD: the controls, 1 to 4 (message $69): the option in $B0C7, 0 to 3, for readControls.
  P.def(0xB0AD, 'chooseControls', function* () {
    P.clearScreen();
    P.text({ a: 0x53 });
    P.infoText({ a: 0x69 });
    M[0x5DF6] = 4;
    const a = (yield* P.menuChoice()).a - 1 & 255;
    M[0xB0C7] = a;
    return { a };
  });

  // $B15C: the tape, for the scenario (flag B, $49DF bytes at $B621): A 1 loads it, 2 checks it
  // against memory, 0 saves it. $B1C2 keeps A; $B15B is 0 after a load, 1 otherwise. A load or a
  // check that fails gives message $6A, a check that passes $6B, each on a cleared screen until a
  // key. SPACE held as the tape stops (BREAK) ends it there, $B15B still 1.
  // The tape is P.io.tape: save(flag, bytes) records a block, load(flag, length) gives the next
  // block of that flag ({ flag, bytes }), or null when there is none; LD-BYTES's own test (the
  // flag and the length) decides whether it loaded.
  P.def(0xB15C, 'tape', function* (r) {
    yield { cp: 0xB15C };
    const op = r.a, flag = r.b, at = 0xB621, len = 0x49DF;
    M[0xB1C2] = op;
    M[0xB15B] = 1;
    const tape = P.io.tape;
    P.spend(70000);
    if (op !== 1 && op !== 2) {
      if (tape) tape.save(flag, M.slice(at, at + len));
      if (yield* breakKey()) return { a: 0xB1 };
      return {};
    }
    P.io.out(0xFE, 0x0F, P.T);
    const b = tape ? tape.load(flag, len) : null;
    let ok = !!b && b.bytes.length === len;
    if (ok && op === 1) {
      for (let k = 0; k < len; k++) M[at + k] = b.bytes[k];
      P.useScenario();
    }
    if (ok && op === 2) for (let k = 0; k < len; k++) if (M[at + k] !== b.bytes[k]) { ok = false; break; }
    if (yield* breakKey()) return { a: 0xB1 };
    let msg = 0x6A;
    if (ok) {
      M[0xB15B] = M[0xB1C2] - 1 & 255;
      if (!M[0xB15B]) return { a: 0, zf: true };
      msg = 0x6B;
    }
    P.clearScreenA({ a: 0 });
    P.infoText({ a: msg });
    return yield* P.waitKey();
  });
  // $B1AE: after the ROM's tape routine, the border black and SPACE read: held, it is waited for
  // to be let go, and the tape's routine ends at once (true).
  function* breakKey() {
    P.io.out(0x7FFE, 0, P.T);
    if (IN(0x7FFE) & 1) return false;
    while (!(IN(0x7FFE) & 1)) yield;
    return true;
  }

  // $B1C3: the main menu (message $6C): 1 to 6, five scenarios and, at 4, a saved game; the
  // scenario's block (flag $63 + choice) loaded from tape, the menu again if it did not. A
  // scenario starts a new game; a saved game goes on from the menu between turns.
  P.def(0xB1C3, 'mainMenu', function* () {
    for (;;) {
      P.clearScreen();
      P.text({ a: 0x53 });
      P.infoText({ a: 0x6C });
      M[0x5DF6] = 6;
      const a = (yield* P.menuChoice()).a;
      yield* P.tape({ a: 1, b: a + 0x63 & 255 });
      if (M[0xB15B]) continue;
      if (a !== 4) return yield* P.newGame();
      P.tableUnits();
      return yield* P.turns();
    }
  });
  // $B1F7: the menu between turns (message $6D): fire plays on; 1 the controls, 2 saves the game
  // (the units on the map first), 3 leaves for the main menu, 4 checks the saved game.
  P.def(0xB1F7, 'turnMenu', function* () {
    for (;;) {
      P.clearScreen();
      P.text({ a: 0x53 });
      P.infoText({ a: 0x6D });
      M[0x5DF6] = 4;
      const a = (yield* P.menuFireChoice()).a;
      if (!a) return { a, zf: true };
      if (a === 2) {
        P.clearScreen();
        P.showAllUnits();
        yield* P.tape({ a: 0, b: 0x67 });
      } else if (a === 3) P.restart(0xB1C3);
      else if (a === 4) {
        P.clearScreen();
        yield* P.tape({ a: 2, b: 0x67 });
      } else yield* P.chooseControls();
    }
  });

  // The whole game, the page's main loop: from $5E28, and from the menu again at each restart.
  P.CHECKPOINTS = [0xB0C8, 0x028E, 0x6B08, 0xB15C];
  P.program = function* (at = 0x5E28) {
    P.useScenario();
    for (;;) {
      try {
        if (at === 0x5E28) yield* P.start();
        else yield* P.mainMenu();
        throw new Error('the game returned past its menu');
      } catch (e) {
        if (!(e instanceof P.Restart)) throw e;
        at = e.at;
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
