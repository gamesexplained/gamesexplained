// A unit selected: choosing it, turning it, walking it a square at a time, and the cost of each
// step in action points.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.unit = P => {
  const M = P.M, V = P.V;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // $6C2A: select the unit on the square at ($5D2F): $5D26 its number, the list from $5C3C cleared.
  // In a player's turn a unit holding an object ($17) that has not yet ($25 bit 6) may, at random
  // (a number drawn below $34 that is below $20 and at least its $0C), show message $61 and drop it.
  // Then the units it sees, its numbers, the view centred on it, and its square, action points and
  // facing kept ($702F) for an undo.
  P.def(0x6C2A, 'selectUnit', function* () {
    P.setw(0x5D67, 0x5C3C);
    M.fill(0, 0x5C3C, 0x5C4F);
    M[0x74FE] = 0;
    const a = M[P.w(0x5D2F)];
    M[0x5D26] = a;
    let ix = P.unitPtr({ a }).ix;
    if (!M[0x5DF7]) {
      P.cursorSquare();
      if (M[ix + 0x17] && !(M[ix + 0x25] & 0x40)) {
        M[0x5D9B] = 0x34;
        const n = P.random().a;
        if (n < 0x20 && n >= M[ix + 0x0C]) {
          P.clearInfo();
          P.scenarioTextAt({ hl: 0x1800, a: M[0x5D26] });
          P.infoText({ a: 0x61 });
          M[ix + 0x25] |= 0x40;
          ix = ixOf(yield* P.dropForced({ ix }), ix);
          ix = ixOf(yield* P.pause({ ix }), ix);
        }
      }
    }
    ix = ixOf(P.findSeen({ ix }), ix);
    ix = ixOf(P.showSeen({ ix }), ix);
    ix = ixOf(P.unitStats({ ix }), ix);
    P.setw(0x5D69, P.w(V.VIEW_ROW) + 0x0505);
    P.setw(0x5D6B, P.w(0x5D24));
    if (!M[0x5D5D]) P.panView();
    P.centreOnUnit();
    P.keepPlace({ ix });
    yield* P.waitRelease();
    return { ix };
  });

  // $6CB3: option 0, the unit selected: it blinks (shown for 255 turns, then a black square for
  // 130) while the controls move it, turn it, or (fire) open its menu; until it is dead or has used
  // its action points, or a move cannot be paid for.
  P.def(0x6CB3, 'unitMode', function* () {
    let ix = ixOf(yield* P.selectUnit(), 0);
    for (;;) {
      P.eraseCursor();
      for (let b = 255; b; b--) {
        const r = yield* P.unitInput({ ix });
        ix = ixOf(r, ix);
        if (r.zf) return { ix };
        yield* P.repeatDelay();
      }
      M[V.ATTR] = 0;
      P.setw(V.PRINT_ROW, 2 * P.w(V.CURSOR_ROW) + 0x101 & 0xFFFF);
      P.drawTile({ a: 0 });
      for (let b = 0x82; b; b--) {
        const r = yield* P.unitInput({ ix });
        ix = ixOf(r, ix);
        if (r.zf) return { ix };
        yield* P.repeatDelay();
      }
    }
  });
  // $6CE9: one read of the controls for the unit selected: fire its menu ($78CD), up a step
  // forwards, down a step back, right and left a turn. With none, Z if it is dead ($08 is 0).
  P.def(0x6CE9, 'unitInput', function* (r) {
    yield* P.readControls();
    P.count('unitTurn');
    P.spend(117 * 13 + 8 + 7);
    const a = M[0x5D2A];
    if (!(a & 1)) return yield* P.unitMenu({ ix: r.ix });
    if (!(a & 2)) return yield* P.walkForward({ ix: r.ix });
    if (!(a & 4)) return yield* P.walkBack({ ix: r.ix });
    if (!(a & 8)) return yield* P.turnRight({ ix: r.ix });
    if (!(a & 16)) return yield* P.turnLeft({ ix: r.ix });
    const ix = P.w(0x5D33);
    return { ix, a: M[ix + 8], zf: !M[ix + 8] };
  });

  // $6D10: the unit's square in the table of squares ($E660, two bytes a unit: the second its
  // tile): its tile by its kind (the top five bits of $00, through the table at ($B71C)), the kind
  // of object it holds ($23, when $17 is not 0) and its facing ($21), through the table at ($B71E).
  P.def(0x6D10, 'setUnitTile', r => {
    const ix = r.ix;
    const v = M[ix];
    let hl = P.w(0xB71C) + ((v >> 3 | v << 5) & 255) & 0xFFFF;
    let a = M[ix + 0x17];
    if (a) a = M[ix + 0x23] - 0x6D & 255;
    a = M[hl + a & 0xFFFF];
    hl = P.w(0xB71E) + 8 * a + M[ix + 0x21] & 0xFFFF;
    a = M[hl];
    M[0xE660 + 2 * M[0x5D26] & 0xFFFF] = a;
    return { a };
  });
  // $6D4E: pay B action points: $5D35 what would be left, and NC; with too few, the message $14
  // (not enough) and carry, $5D37 set. $6D4D keeps B.
  P.def(0x6D4E, 'payAP', function* (r) {
    M[0x5D37] = 0;
    M[0x6D4D] = r.b;
    const a = M[r.ix + 6] - r.b;
    if (a >= 0) { M[0x5D35] = a; return { a, cf: false }; }
    yield* P.errorText({ a: 0x14 });
    M[0x5D37] = 1;
    return { a: 1, cf: true };
  });
  // $6D6C: message A of the engine's list in the readout, with sound effect $0B, then a wait for
  // the controls ($6D95).
  P.def(0x6D6C, 'errorText', function* (r) {
    P.clearInfo();
    M[0x5D09] = 8;
    P.setw(0x5D05, 0x1800);
    P.setw(V.ATTR, 0x4606);
    P.printMessage({ a: r.a });
    P.sound({ a: 0x0B });
    return yield* P.waitControls();
  });
  // $6D8C: a pause of 600 delays, then the wait. $6D95: in a player's turn, wait up to 65 turns of 40
  // delays, until any control is held.
  P.def(0x6D8C, 'pause', function* () {
    P.delay200(); P.delay200(); P.delay200();
    return yield* P.waitControls();
  });
  P.def(0x6D95, 'waitControls', function* () {
    if (M[0x5DF7]) return {};
    for (let b = 0x41; b; b--) {
      yield* P.readControls();
      P.count('waitControlsTurn');
      P.delay40();
      if (M[0x5D2A] !== 0xFF) return { b };
    }
    return { b: 0 };
  });

  // $6DAF and $6DDE: turn right or left an eighth, for one action point: the unit's tile, the units
  // it sees, and the view drawn again (unless $5D36), then $7811. Too few points: its numbers again,
  // and Z (the unit is let go).
  const turn = (at, name, d) => P.def(at, name, function* (r) {
    let ix = r.ix;
    const p = yield* P.payAP({ ix, b: 1 });
    if (p.cf) { const s = P.unitStats(); return { ix: ixOf(s, P.w(0x5D33)), a: 0, zf: true }; }
    M[ix + 0x21] = M[ix + 0x21] + d & 7;
    M[ix + 6] = M[0x5D35];
    P.setUnitTile({ ix });
    ix = ixOf(P.showSeen({ ix }), ix);
    if (!M[0x5D36]) P.drawView();
    return Object.assign({ ix }, yield* P.afterAction({ ix }));
  });
  turn(0x6DAF, 'turnRight', 1);
  turn(0x6DDE, 'turnLeft', -1);

  // $6E0D: centre the view on the unit at the cursor ($5D24), within the map: the view's corner
  // 5 squares up and left of it, from 0 to 69 across and 0 to 39 down, the cursor on the unit. The
  // view is drawn (unless $5D36). $6E10 takes the square in $5D24 as it is, $6E13 the one in HL.
  const centre = hl => {
    const row = hl & 255, col = hl >> 8;
    const vc = Math.min(Math.max(col, 5), 0x4A) - 5, vr = Math.min(Math.max(row, 5), 0x2C) - 5;
    M[V.VIEW_COL] = vc; M[V.CURSOR_COL] = col - vc & 255;
    M[V.VIEW_ROW] = vr; M[V.CURSOR_ROW] = row - vr & 255;
    M[0xB71A] = 1; M[0x5D16] = 0;
    if (M[0x5D36]) return { a: M[0x5D36] };
    return P.drawView();
  };
  P.def(0x6E0D, 'centreOnUnit', () => { P.cursorSquare(); return centre(P.w(0x5D24)); });
  P.def(0x6E10, 'centreOn', () => centre(P.w(0x5D24)));
  P.def(0x6E13, 'centreAt', r => centre(r.hl));

  // $6E55: a step forwards, the way the unit faces; $6E60: a step back, the opposite way ($5D38
  // set: the cost is doubled).
  P.def(0x6E55, 'walkForward', function* (r) {
    M[0x5D38] = 0;
    return yield* P.moveDir({ ix: r.ix, a: M[r.ix + 0x21] });
  });
  P.def(0x6E60, 'walkBack', function* (r) {
    M[0x5D38] = 1;
    return yield* P.moveDir({ ix: r.ix, a: M[r.ix + 0x21] + 4 & 7 });
  });
  // $6E74: the square a step from $5D24 the way A (0 up, then clockwise): $5D3A and $5D3B, and
  // $5D1E the extra cost (2 for a diagonal), from the table at $6EA7. Z if it is off the map.
  P.def(0x6E74, 'stepTarget', r => {
    const t = 0x6EA7 + 3 * r.a & 0xFFFF;
    let a = M[0x5D24] + M[t] & 255;
    if (a === 0xFF || a === 0x32) return { a: 0, zf: true, hl: t };
    M[0x5D3A] = a;
    a = M[0x5D25] + M[t + 1] & 255;
    if (a === 0xFF || a === 0x50) return { a: 0, zf: true, hl: t + 1 };
    M[0x5D3B] = a;
    M[0x5D1E] = M[t + 2];
    return { a: 1, zf: false, hl: t + 2 };
  });

  // $6EBF: what a step to ($5D3A) costs and whether it can be made, in $5D29: 0 or 3 an enemy is
  // there (3 when the unit steps back or itself stands on a unit), 4 a unit of its own side there
  // and the two together too big ($02, 21 or more), 2 too few action points, 5 it can; or the
  // square's own byte when the unit's kind ($04) cannot cross the terrain at all. $5D28 the cost:
  // the terrain's for the kind ($B726 table, byte $04 of the unit on), plus an object's ($03), plus
  // $5D1E, doubled backwards. $5D39 is what the square holds, $5D27 the floor.
  P.def(0x6EBF, 'stepCost', r => {
    M[0x5D28] = 0;
    const pos = P.w(0x5D3A);
    const hl = P.mapAddr(pos & 255, pos >> 8);
    P.setw(0x5D3E, hl);
    if (M[0x5D38]) P.revealBehind({ ix: r.ix });
    let a = M[P.w(0x5D3E)];
    M[0x5D27] = a; M[0x5D39] = a;
    let ix;
    if (a >= 0x8C) {
      ix = P.unitPtr({ a }).ix;
      if ((M[ix + 0x25] & 1) !== M[0xB712]) {
        M[0x5D29] = 0;
        P.setw(0x5D3C, ix);
        ix = P.w(0x5D33);
        if (!M[0x5D38] && M[ix + 0x16] < 0x8C) return { ix, cf: true };
        M[0x5D29] = 3;
        return { ix };
      }
      M[0x5D27] = M[ix + 0x16];
      const b = M[ix + 2];
      ix = P.w(0x5D33);
      if ((M[ix + 2] + b & 255) >= 0x15) { M[0x5D29] = 4; return { ix }; }
      a = M[0x5D27];
    }
    if (a >= 0x6E) {
      ix = P.objectPtr({ a }).ix;
      M[0x5D28] = M[ix + 3];
      P.floorUnder({ hl: P.w(0x5D3A) });
      M[0x5D27] = M[0x5D23];
    }
    let iy = P.terrainPtr({ a: M[0x5D27] }).iy;
    ix = P.w(0x5D33);
    iy = iy + M[ix + 4] & 0xFFFF;
    a = M[iy];
    if (a === 0xFF) {
      a = M[ix + 0x16];
      if (a >= 0x8C) { M[0x5D29] = 3; return { ix, iy }; }
      M[0x5D29] = a;
      return { ix, iy };
    }
    a = a + M[0x5D28] + M[0x5D1E] & 255;
    M[0x5D28] = a;
    if (M[0x5D38]) M[0x5D28] = a << 1 & 255;
    M[0x5D29] = M[ix + 6] >= M[0x5D28] ? 5 : 2;
    return { ix, iy };
  });

  // $6F89: make the step: the scenario's hook at $B62D, the action points paid ($06, and counted in
  // $22), the unit off its old square (the floor put back) and onto the new one, the units it sees,
  // the view, sound effect 3 in a player's turn. A unit with no points left that ... ($9A16) is put
  // back where it was kept ($7042). Then in the computer's turn ...; NZ if the unit can go on (alive,
  // with points left).
  P.def(0x6F89, 'makeStep', function* (r) {
    const h = yield* P.scenarioStep({ ix: r.ix });
    if (h && h.pops) return Object.assign({}, h, { pops: h.pops - 1 });
    return yield* P.stepOn();
  });
  // $6F8C: the step itself, for the unit at ($5D33), which a scenario's hook may make too.
  P.def(0x6F8C, 'stepOn', function* () {
    let ix = P.w(0x5D33);
    M[ix + 6] = M[ix + 6] - M[0x5D28] & 255;
    M[ix + 0x22] = M[ix + 0x22] + M[0x5D28] & 255;
    M[P.w(0x5D2F)] = M[ix + 0x16];
    M[ix + 0x16] = M[0x5D39];
    M[P.w(0x5D3E)] = M[0x5D26];
    P.setw(0x5D24, P.w(0x5D3A));
    P.setw(0x5D2F, P.w(0x5D3E));
    ix = ixOf(P.placeUnit({ ix, a: M[0x5D26] }), ix);
    ix = ixOf(P.findSeen({ ix }), ix);
    ix = ixOf(P.showSeen({ ix }), ix);
    P.centreOn();
    if (!M[0x5DF7]) P.sound({ a: 3 });
    if (!M[ix + 6]) {
      const s = P.shared({ ix });
      ix = ixOf(s, ix);
      if (!s.zf) return yield* P.undoMove({ ix });
    }
    const s = P.shared({ ix });
    ix = ixOf(s, ix);
    if (s.zf) P.keepPlace({ ix });
    if (!M[0x5D5D]) ix = ixOf(yield* P.startReaction({ ix }), ix);
    if (M[0x5DF7]) {
      if (M[0x5D36]) ix = ixOf(yield* P.computerStep({ ix }), ix);
      else if (M[0xB715]) {
        M[0xB712] = 0;
        ix = ixOf(P.sideView({ ix }), ix);
        M[0xB712] = 1;
        P.drawView();
        ix = ixOf(P.findSeen({ ix }), ix);
        ix = ixOf(P.showSeen({ ix }), ix);
        ix = ixOf(yield* P.pause({ ix }), ix);
      }
    }
    return P.canGoOn({ ix });
  });
  // $7021: NZ if the unit at IX can go on: alive ($08) and with action points ($06).
  P.def(0x7021, 'canGoOn', r => {
    const ix = r.ix;
    if (!M[ix + 8]) return { ix, a: 0, zf: true };
    if (!M[ix + 6]) return { ix, a: 0, zf: true };
    return { ix, a: 1, zf: false };
  });
  // $702F: keep the unit's square ($5D40), action points ($5D42) and facing ($5D43), for $7042.
  P.def(0x702F, 'keepPlace', r => {
    P.setw(0x5D40, P.w(0x5D24));
    M[0x5D42] = M[r.ix + 6];
    M[0x5D43] = M[r.ix + 0x21];
    return { hl: P.w(0x5D24), a: M[0x5D43] };
  });
  // $7042: put the unit back where it was kept: its square, points and facing, the view and its
  // panel; $5D37 set, NZ.
  P.def(0x7042, 'undoMove', function* (r) {
    let ix = r.ix;
    M[P.w(0x5D2F)] = M[ix + 0x16];
    const de = P.w(0x5D40);
    P.setw(V.VIEW_ROW, de);
    P.setw(0x5D24, de);
    const hl = P.mapAddr(de & 255, de >> 8);
    P.setw(0x5D2F, hl);
    M[ix + 0x16] = M[hl];
    M[hl] = M[0x5D26];
    P.setw(V.CURSOR_ROW, 0);
    M[ix + 6] = M[0x5D42];
    M[ix + 0x21] = M[0x5D43];
    P.setUnitTile({ ix });
    P.centreOnUnit();
    ix = ixOf(P.placeUnit({ ix, a: M[0x5D26] }), ix);
    ix = ixOf(P.unitPanel(), P.w(0x5D33));
    yield* P.waitRelease();
    P.keepPlace({ ix });
    M[0x5D37] = 1;
    return { ix, a: 1, zf: false };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
