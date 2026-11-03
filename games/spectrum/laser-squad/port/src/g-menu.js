// The panel and the menus of cursor mode: what the square under the cursor holds, the side and
// the turn, the unit's numbers, and choosing from a menu.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.menu = P => {
  const M = P.M, V = P.V;
  const inc = a => { M[a] = M[a] + 1 & 255; };

  // $6785: the side whose turn it is and the turn, along the bottom: messages 1 and 2 in the side's
  // colour (from $B702 + the side, $B712), then the turn ($B711) and the side's victory points
  // (from $B70F) in white on red.
  P.def(0x6785, 'showSides', () => {
    M[V.ATTR] = M[0xB702 + M[0xB712] & 0xFFFF];
    P.text({ a: 1 });
    P.text({ a: 2 });
    M[V.ATTR] = 0x72;
    M[V.PRINT_ROW] = 0x17; M[V.PRINT_COL] = 0x0A;
    P.printNumber({ a: M[0xB711] });
    M[V.PRINT_ROW] = 0x17; M[V.PRINT_COL] = 0x10;
    return P.printNumber({ a: M[0xB70F + M[0xB712] & 0xFFFF] });
  });

  // $67C2: IX = the record of unit A ($8C on), 40 bytes each from $D39F. $67DF: IX = the record of
  // object A ($6E on), 20 bytes each from ($B728). $67F7: IY = the record of terrain A, 12 bytes
  // each from ($B726). $688B: IY = the record of the scenario's object A (1 on), 6 bytes each from ($B72A).
  P.def(0x67C2, 'unitPtr', r => {
    const n = r.a - 0x8C & 255, de = 40 * n;
    return { a: n, ix: 0xD39F + de & 0xFFFF, de, hl: n };
  });
  P.def(0x67DF, 'objectPtr', r => {
    const n = r.a - 0x6E & 255, de = 20 * n;
    return { a: n, ix: P.w(0xB728) + de & 0xFFFF, de, hl: n };
  });
  P.def(0x67F7, 'terrainPtr', r => {
    const de = 12 * r.a;
    return { iy: P.w(0xB726) + de & 0xFFFF, de, hl: r.a };
  });
  P.def(0x688B, 'carriedPtr', r => {
    if (!r.a) return { a: 0, zf: true };
    const n = r.a - 1, de = 6 * n;
    return { a: n, iy: P.w(0xB72A) + de & 0xFFFF, de, hl: n, zf: false };
  });
  // $680C: $5D24 = the map's square under the cursor: the view's corner plus the cursor's square.
  P.def(0x680C, 'cursorSquare', () => {
    const hl = P.w(V.VIEW_ROW) + P.w(V.CURSOR_ROW) & 0xFFFF;
    P.setw(0x5D24, hl);
    return { hl, de: P.w(V.CURSOR_ROW) };
  });

  // $6818: describe the square under the cursor ($5CFA), from the scenario's messages: terrain by
  // its own message; an object by its message, and the floor under it (floorUnder); a unit by its
  // name, what it holds, and what it stands on.
  P.def(0x6818, 'squareInfo', () => {
    const pos = P.w(V.VIEW_ROW) + P.w(V.CURSOR_ROW) & 0xFFFF;
    const a = M[P.mapAddr(pos & 255, pos >> 8)];
    M[0x5CFA] = a;
    if (a < 0x6E) return P.scenarioTextAt({ hl: 0x1804, a });
    if (a < 0x8C) {
      P.cursorSquare();
      P.floorUnder({ hl: P.w(0x5D24) });
      P.scenarioTextAt({ hl: 0x1804, a: M[0x5D23] });
      return P.scenarioTextAt({ hl: 0x1809, a: M[0x5CFA] });
    }
    P.scenarioTextAt({ hl: 0x180E, a });
    const ix = P.unitPtr({ a: M[0x5CFA] }).ix;
    if (M[ix + 0x17]) {
      const iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
      P.scenarioTextAt({ hl: 0x1814, a: M[iy] });
    }
    let f = M[ix + 0x16];
    if (f >= 0x6E) {
      P.scenarioTextAt({ hl: 0x1809, a: f });
      P.cursorSquare();
      P.floorUnder({ hl: P.w(0x5D24) });
      f = M[0x5D23];
    }
    return P.scenarioTextAt({ hl: 0x1804, a: f });
  });

  // $68A0: message A + 1 of the scenario's list (at ($B722), its dictionary at ($B724)) in double
  // height in the colours $06 and $46, at the column H and the row L; $68A3, where $5D05 says.
  P.def(0x68A0, 'scenarioTextAt', r => { P.setw(0x5D05, r.hl); return P.scenarioText({ a: r.a }); });
  P.def(0x68A3, 'scenarioText', r => {
    M[0x5D09] = 8;
    P.setw(0x5D07, P.w(0xB724)); P.setw(0x5D1F, P.w(0xB722));
    P.setw(V.ATTR, 0x4606);
    return P.printMessage({ a: r.a + 1 & 255 });
  });

  // $68C4: choose from the menu on show: $5D2C lines, the one chosen ($5D2B, from 0) lit
  // ($6918). Up and down move the light, round from end to end, with the auto-repeat; fire flashes
  // the line four times with sound effect 5 and returns.
  P.def(0x68C4, 'menuSelect', function* () {
    M[0x5D2B] = 0;
    P.lightLine();
    for (;;) {
      yield* P.readControls();
      const a = M[0x5D2A];
      if (!(a & 1)) {
        for (let i = 0; i < 4; i++) { P.lightLine(); P.sound({ a: 5 }); P.lightLine(); P.playSound(); }
        return { b: 0 };
      }
      if (!(a & 2)) {
        P.lightLine();
        if (M[0x5D2B]) M[0x5D2B]--; else M[0x5D2B] = M[0x5D2C] - 1 & 255;
        P.lightLine();
      } else if (!(a & 4)) {
        P.lightLine();
        inc(0x5D2B);
        if (M[0x5D2B] >= M[0x5D2C]) M[0x5D2B] = 0;
        P.lightLine();
      }
      yield* P.repeatDelay();
    }
  });
  // $6918: light the menu's line $5D2B, or put it out: the attributes of its 8 cells by 2 rows, from
  // ($5D2D) + 64 x (the line + 1), have ink and paper swapped and BRIGHT set.
  P.def(0x6918, 'lightLine', () => {
    let hl = P.w(0x5D2D) + 64 * (M[0x5D2B] + 1) & 0xFFFF;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 8; i++) {
        const v = M[hl];
        M[hl] = (v >> 3 & 7) | (v & 7) << 3 | 0x40;
        hl = hl + 1 & 0xFFFF;
      }
      hl = hl + 24 & 0xFFFF;
    }
    return { b: 0, de: 24 };
  });

  // $694E: cursor mode. The view and the readout, then the cursor until fire is pressed, and the
  // menu for the square under it: for a unit of the side whose turn it is, 0 (select it) and 1; for
  // any unit, 1; then 2 to 5 always. The choice runs its routine through the table at $6A35.
  P.def(0x694E, 'cursorMode', function* () {
    P.showSides();
    P.drawView();
    P.infoText({ a: 3 });
    P.text({ a: 4 });
    P.squareInfo();
    for (;;) {
      do yield* P.cursorStep(); while (M[0x5D2A] & 1);
      P.menuOpen();
      P.cursorSquare();
      const pos = P.w(0x5D24), hl = P.mapAddr(pos & 255, pos >> 8);
      P.setw(0x5D2F, hl);
      if (M[hl] >= 0x8C) {
        if (P.ownUnit({ a: M[hl] }).zf) { P.addOption({ a: 0 }); P.infoText({ a: 7 }); }
        P.addOption({ a: 1 }); P.infoText({ a: 8 });
      }
      P.infoText({ a: 9 });
      for (let a = 2; a <= 5; a++) P.addOption({ a });
      yield* P.waitRelease();
      yield* P.menuSelect();
      const r = yield* P.dispatch({ hl: 0x6A35 });
      if (r && r.pops) return { pops: r.pops - 1 };
      P.clearInfo();
      P.text({ a: 4 });
      P.squareInfo();
      P.eraseCursor();
      yield* P.waitRelease();
    }
  });
  // $69CD: clear the readout (message 5).
  P.def(0x69CD, 'clearInfo', () => P.infoText({ a: 5 }));
  // $69D3: whether unit A can be selected: IX and $5D33 its record; Z if it is on the side whose
  // turn it is and has action points left.
  P.def(0x69D3, 'ownUnit', r => {
    const ix = P.unitPtr({ a: r.a }).ix;
    P.setw(0x5D33, ix);
    const side = M[ix + 0x25] & 1;
    if (side !== M[0xB712]) return { ix, a: side, zf: false };
    if (M[ix + 6]) return { ix, a: 0, zf: true };
    return { ix, a: 1, zf: false };
  });
  // $69EE: open a menu: the cursor off, the readout cleared, message 6, no lines yet ($5D2C, the
  // list of their numbers from $5B00 at $5D31), the lines lit from ($5D2D) = $5858, and the text
  // from row 4, column 24.
  P.def(0x69EE, 'menuOpen', () => {
    P.eraseCursor();
    P.clearInfo();
    P.setw(0x5D2D, 0x5858);
    P.text({ a: 6 });
    M[0x5D2C] = 0;
    P.setw(0x5D31, 0x5B00);
    P.setw(0x5D05, 0x1804);
    return { hl: 0x1804 };
  });
  // $6A10: add option A to the menu's list. A is kept.
  P.def(0x6A10, 'addOption', r => {
    const hl = P.w(0x5D31);
    M[hl] = r.a;
    P.setw(0x5D31, hl + 1);
    inc(0x5D2C);
    return { hl: 0x5D2C };
  });
  // $6A1F: run the routine the line chosen asks for: its option number (from $5B00) picks a word of
  // the table at HL. A routine that ends the turn ($6A6A) returns past its callers: { pops }.
  P.def(0x6A1F, 'dispatch', function* (r) {
    const e = M[0x5B00 + M[0x5D2B] & 0xFFFF];
    const at = P.w(r.hl + 2 * e & 0xFFFF);
    return yield* P.jumpGen(at, { ix: r.ix, iy: r.iy });
  });

  // $6A41: option 4, the end of the turn: a menu of two, no ($6A6C) and yes ($6A6A), which returns
  // past this routine and cursor mode both.
  P.def(0x6A41, 'endTurnMenu', function* () {
    P.clearInfo();
    P.infoText({ a: 3 });
    P.menuOpen();
    P.infoText({ a: 0x52 });
    P.addOption({ a: 0 });
    P.addOption({ a: 1 });
    yield* P.waitRelease();
    yield* P.menuSelect();
    const r = yield* P.dispatch({ hl: 0x6A66 });
    if (r && r.pops) return { pops: r.pops - 1 };
    return r;
  });
  P.def(0x6A6A, 'endTurn', () => ({ pops: 2 }));
  P.def(0x6A6C, 'noOption', () => ({}));

  // $6A8B: the selected unit's numbers ($5D33), unless it is dead ($08 clear): its name, its action
  // points as a share ($6B29) and its stamina ($19), its morale and its rank as words, the turns it
  // has ... and the panel ($6BBC).
  P.def(0x6A8B, 'unitStats', () => {
    const ix = P.w(0x5D33);
    if (!M[ix + 8]) return { ix, a: 0, zf: true };
    P.clearInfo();
    P.scenarioTextAt({ hl: 0x1800, a: M[0x5D26] });
    P.infoText({ a: 0x0A });
    M[V.ATTR] = 0x46;
    M[V.PRINT_ROW] = 0x0D; M[V.PRINT_COL] = 0x1D;
    P.printNumber({ a: P.healthShare({ ix }).a });
    M[V.PRINT_ROW] = 0x0E; M[V.PRINT_COL] = 0x1D;
    P.printNumber({ a: M[ix + 0x19] });
    P.setw(0x5D05, 0x180A);
    P.text({ a: (M[ix + 0x0C] >> 5 & 7) + 0x2E });
    P.setw(0x5D05, 0x180C);
    M[V.ATTR] = 0x46;
    P.text({ a: (M[ix + 0x0A] >> 5 & 7) + 0x36 });
    M[V.PRINT_ROW] = 0x08; M[V.PRINT_COL] = 0x18;
    M[V.ATTR] = 5;
    M[0x5D09] = 0;
    P.printNumber({ a: M[ix + 5] >> 1 });
    P.unitPanel();
    return { ix };
  });

  // $6B08: waitKey (g-input.js). $6B19: C = A / B, rounded to the nearest; A the remainder.
  P.def(0x6B19, 'divRound', r => {
    let a = r.a, c = 0;
    const b = r.b;
    if (!b) throw new Error('divRound: B is 0, and the game would never return');
    while (a >= b) { a -= b; c++; }
    const h = b + 1 >> 1;
    if (a >= h) c++;
    return { a, b: h, c, cf: a < h };
  });
  // $6B29: A = ($07) less ($08), by ($18), rounded.
  P.def(0x6B29, 'healthShare', r => {
    const ix = r.ix;
    const q = P.divRound({ a: M[ix + 7] - M[ix + 8] & 255, b: M[ix + 0x18] });
    return { a: q.c, b: q.b, c: q.c };
  });
  // $6B37: the way the unit faces: message 11, then message ($21) + 12 in characters.
  P.def(0x6B37, 'facingText', r => {
    P.text({ a: 0x0B });
    M[0x5D09] = 4;
    return P.printMessage({ a: M[r.ix + 0x21] + 0x0C & 255 });
  });
  // $6B4A: $5D23 = the floor of the map's square at ($5D3A): the terrain, under a unit the square
  // it stands on, and under an object the floor $7D9F finds.
  P.def(0x6B4A, 'floorAt', r => {
    const pos = P.w(0x5D3A);
    let a = M[P.mapAddr(pos & 255, pos >> 8)];
    if (a >= 0x8C) a = M[P.unitPtr({ a }).ix + 0x16];
    if (a < 0x6E) { M[0x5D23] = a; return { a }; }
    P.floorUnder({ hl: pos });
    return { a: M[0x5D23] };
  });
  // $6B7A: message A + 1 of the scenario's list at HL, in double height, in the colours as they are.
  P.def(0x6B7A, 'scenarioMessageAt', r => {
    P.setw(0x5D05, r.hl);
    P.setw(0x5D07, P.w(0xB724)); P.setw(0x5D1F, P.w(0xB722));
    M[0x5D09] = 8;
    return P.printMessage({ a: r.a + 1 & 255 });
  });
  // $6B93: a line of the panel at HL: message 21 (a blank) and over it the scenario's message A + 1
  // in yellow.
  P.def(0x6B93, 'panelLine', r => {
    M[0x5D09] = 0;
    P.setw(0x5D05, r.hl);
    P.text({ a: 0x15 });
    P.setw(0x5D05, r.hl);
    M[V.ATTR] = 0x46;
    P.setw(0x5D07, P.w(0xB724)); P.setw(0x5D1F, P.w(0xB722));
    return P.printMessage({ a: r.a + 1 & 255 });
  });
  // $6BBC: the selected unit's panel: the way it faces; its action points ($06) in double height;
  // the object in its hands ($23, when it holds one); the terrain it stands on ($16, or the floor under the object
  // or unit there) with that terrain's byte $06; and the enemies in sight (seenCount).
  P.def(0x6BBC, 'unitPanel', () => {
    let ix = P.w(0x5D33);
    P.facingText({ ix });
    M[0x5D09] = 8;
    P.setw(V.ATTR, 0x4646);
    M[V.PRINT_ROW] = 0x06; M[V.PRINT_COL] = 0x18;
    P.printNumber({ a: M[ix + 6] });
    M[0x5D09] = 0;
    if (M[ix + 0x17]) P.panelLine({ hl: 0x1810, a: M[ix + 0x23] });
    let a = M[ix + 0x16];
    if (a >= 0x6E) {
      let under = a >= 0x8C;
      if (under) {
        a = M[P.unitPtr({ a }).ix + 0x16];
        ix = P.w(0x5D33);
        under = a >= 0x6E;
      } else under = true;
      if (under) { P.floorUnder({ hl: P.w(0x5D24) }); a = M[0x5D23]; }
    }
    const iy = P.terrainPtr({ a }).iy;
    P.panelLine({ hl: 0x1813, a });
    M[V.PRINT_ROW] = 0x15; M[V.PRINT_COL] = 0x1D;
    P.printNumber({ a: M[iy + 6] });
    P.seenCount();
    return { ix, iy };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
