// Sight: lines across the map, which units each unit can see, the field of view by facing, and
// the enemies' reaction fire when a unit moves where they can see it.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.sight = P => {
  const M = P.M, V = P.V;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);
  const w = P.w, setw = P.setw;
  // The line's words, at $7091: the start's column and row, the end's column and row, the current
  // column ($7099) and row ($709B), the run across and down ($709D, $709F), the steps down and across
  // ($70A1, $70A3, 1 or -1, together on a diagonal step), the straight step along the major way
  // ($70A5, $70A7, one of them 0), the error ($70A9), the major and minor runs ($70AB, $70AD), the
  // range of a shot or a throw ($70AF), and the distance, 2 a straight step and 3 a diagonal ($70B1).
  const C0 = 0x7091, R0 = 0x7093, C1 = 0x7095, R1 = 0x7097, C = 0x7099, R = 0x709B;

  // $70B3: the error moves on by the minor run; NC (and the major run taken off) when it reaches
  // the major run.
  P.def(0x70B3, 'lineError', () => {
    const hl = w(0x70A9) + w(0x70AD) & 0xFFFF;
    setw(0x70A9, hl);
    const d = hl - w(0x70AB);
    if (d < 0) return { hl, cf: true };
    setw(0x70A9, d);
    return { hl: d, cf: false };
  });
  // $70CA: set the line up from its ends: the runs and the steps, which way is the major, and the
  // error half the major run.
  P.def(0x70CA, 'lineSetup', () => {
    let d = w(C1) - w(C0);
    if (d >= 0) { setw(0x709D, d); setw(0x70A3, 1); } else { setw(0x709D, w(C0) - w(C1)); setw(0x70A3, 0xFFFF); }
    d = w(R1) - w(R0);
    if (d >= 0) { setw(0x709F, d); setw(0x70A1, 1); } else { setw(0x709F, w(R0) - w(R1)); setw(0x70A1, 0xFFFF); }
    if (w(0x709D) >= w(0x709F)) {
      setw(0x70AD, w(0x709F)); setw(0x70AB, w(0x709D));
      setw(0x70A7, w(0x70A3)); setw(0x70A5, 0);
    } else {
      setw(0x70AD, w(0x709D)); setw(0x70AB, w(0x709F));
      setw(0x70A5, w(0x70A1)); setw(0x70A7, 0);
    }
    setw(0x70A9, w(0x70AB) >> 1);
    return {};
  });
  // $7168: a step along the line: along the major way, or a diagonal when the error runs over.
  P.def(0x7168, 'lineStep', () => {
    if (P.lineError().cf) {
      M[R] = M[R] + M[0x70A5] & 255;
      M[C] = M[C] + M[0x70A7] & 255;
      setw(0x70B1, w(0x70B1) + 2);
    } else {
      M[R] = M[R] + M[0x70A1] & 255;
      M[C] = M[C] + M[0x70A3] & 255;
      setw(0x70B1, w(0x70B1) + 3);
    }
    return {};
  });

  // $71A8: take the units of side A off the map (their floors put back), from the table at $5C50:
  // four bytes a unit, its side (3 for none), row, column and floor.
  P.def(0x71A8, 'hideSide', r => {
    M[0x5D44] = r.a;
    let hl = 0x5C50;
    for (let b = 20; b; b--) {
      if (M[hl] === M[0x5D44]) M[P.mapAddr(M[hl + 1], M[hl + 2])] = M[hl + 3];
      hl += 4;
    }
    setw(0x5D45, hl);
    return { b: 0 };
  });
  // $71D7: put every unit of the table on the map.
  P.def(0x71D7, 'showAllUnits', () => {
    let hl = 0x5C50;
    for (let b = 20; b; b--) {
      if (M[hl] !== 3) M[P.mapAddr(M[hl + 1], M[hl + 2])] = 0xA0 - b;
      hl += 4;
    }
    setw(0x5D45, hl);
    return { b: 0 };
  });

  // $7209, $7205, $7201: whether the line from ($5D47) to ($5D49) (row, column) is clear: each square
  // on it, but the last, has its flag ($D2FF + the square) tested against 1 (sight), 2 or 4 ($5D4B).
  // Z when the line reaches the end, NZ (and the square in DE) where it is blocked.
  const line = mask => {
    M[0x5D4B] = mask;
    M[R0] = M[R] = M[0x5D47];
    M[C0] = M[C] = M[0x5D48];
    M[R1] = M[0x5D49];
    M[C1] = M[0x5D4A];
    M[0x7094] = M[0x709C] = M[0x7092] = M[0x709A] = M[0x7098] = M[0x7096] = 0;
    P.lineSetup();
    for (;;) {
      P.lineStep();
      const e = M[R], d = M[C];
      if (M[0x5D49] === e && M[0x5D4A] === d) return { zf: true, d, e };
      const a = M[0xD2FF + M[P.mapAddr(e, d)] & 0xFFFF] & M[0x5D4B];
      if (a) return { zf: false, a, d, e };
      P.count('line');
    }
  };
  P.def(0x7201, 'lineClear4', () => line(4));
  P.def(0x7205, 'lineClear2', () => line(2));
  P.def(0x7209, 'lineClear', () => line(1));

  // $726A: the enemies the unit at ($5D24) can see, listed from $5B97 ($7298): the other side's
  // units. $7283: every unit but itself ($5D26).
  P.def(0x726A, 'findSeen', () => {
    M[0x5D4D] = (1 - M[0xB712] & 255) + 1 & 255;
    M[0x5D4C] = 1;
    setw(0x5D51, w(0x5D24));
    return P.seenFrom();
  });
  P.def(0x7283, 'findSeenAll', () => {
    M[0x5D4D] = 3;
    M[0x5D4C] = M[0x5D26];
    setw(0x5D51, w(0x5D24));
    return P.seenFrom();
  });
  // $7298: list, from $5B97, three bytes each (row, column, unit) and $FF at the end, the units of
  // the sides in $5D4D (bit 0 side 0, bit 1 side 1), but $5D4C, to which the line from ($5D51) is
  // clear both ways.
  P.def(0x7298, 'seenFrom', () => {
    setw(0x5D4F, 0x5B97);
    M.fill(0xFF, 0x5B97, 0x5BD1);
    setw(0x5D45, 0x5C50);
    for (let b = 20; b; b--) {
      const n = 0xA0 - b;
      M[0x5D4E] = n;
      const hl = w(0x5D45);
      if (n !== M[0x5D4C] && M[hl] !== 3) {
        const c = M[hl] + 1 & 255;
        if ((M[0x5D4D] & 1) === c || (M[0x5D4D] & 2) === c) {
          M[0x5D53] = M[hl + 1]; M[0x5D54] = M[hl + 2];
          setw(0x5D47, w(0x5D51)); setw(0x5D49, w(0x5D53));
          if (P.lineClear().zf) {
            setw(0x5D49, w(0x5D51)); setw(0x5D47, w(0x5D53));
            if (P.lineClear().zf) {
              const p = w(0x5D4F);
              M[p] = M[0x5D47]; M[p + 1] = M[0x5D48]; M[p + 2] = M[0x5D4E];
              setw(0x5D4F, p + 3);
            }
          }
        }
      }
      setw(0x5D45, w(0x5D45) + 4);
    }
    return { b: 0 };
  });

  // $7326: where ($5D49) lies from ($5D47) for a unit facing ($21): 0 in front, 1 to the right, 2
  // behind, 3 to the left. Each facing has its routine through the table at $7351; the facings 4
  // to 7 use those of 0 to 3 and turn the answer about.
  const lt = (a, b) => M[a] < M[b];
  const FACING = [
    () => (M[0x5D55] < M[0x5D56] ? (lt(0x5D4A, 0x5D48) ? 3 : 1) : (lt(0x5D49, 0x5D47) ? 0 : 2)),
    () => {
      if (!lt(0x5D47, 0x5D49) && !lt(0x5D4A, 0x5D48)) return 0;
      if (lt(0x5D49, 0x5D47)) return 3;
      return lt(0x5D48, 0x5D4A) ? 1 : 2;
    },
    () => (M[0x5D56] < M[0x5D55] ? (lt(0x5D49, 0x5D47) ? 3 : 1) : (lt(0x5D4A, 0x5D48) ? 2 : 0)),
    () => {
      if (!lt(0x5D49, 0x5D47) && !lt(0x5D4A, 0x5D48)) return 0;
      if (lt(0x5D47, 0x5D49)) return 1;
      return lt(0x5D48, 0x5D4A) ? 3 : 2;
    },
  ];
  P.def(0x7326, 'inView', r => {
    let a = M[0x5D47] - M[0x5D49]; M[0x5D55] = a < 0 ? -a & 255 : a;
    a = M[0x5D48] - M[0x5D4A]; M[0x5D56] = a < 0 ? -a & 255 : a;
    const f = M[r.ix + 0x21];
    if (f > 7) throw new Error('inView: facing ' + f);
    a = FACING[f & 3]();
    if (f >= 4) a ^= 2;
    return { a, zf: a === 0 };
  });

  // $7422: of the enemies listed from $5B97, those in front of the unit (inView) are put on the map
  // and listed from $5CA0; $5D59 counts them. In the computer's turn each is marked in the table at
  // $B636 + its number with ($5DF8).
  P.def(0x7422, 'showSeen', r => {
    M[0x5D59] = 0;
    setw(0x5D57, 0x5CA0);
    setw(0x5D4F, 0x5B97);
    setw(0x5D47, w(0x5D24));
    for (;;) {
      let hl = w(0x5D4F);
      if (M[hl] === 0xFF) return { ix: r.ix, a: 0xFF, zf: true };
      setw(0x5D49, M[hl] | M[hl + 1] << 8);
      setw(0x5D4F, hl + 2);
      if (P.inView({ ix: r.ix }).a === 0) {
        const a = M[w(0x5D4F)];
        M[P.mapAddr(M[0x5D49], M[0x5D4A])] = a;
        hl = w(0x5D57);
        M[hl] = a;
        setw(0x5D57, hl + 1);
        M[0x5D59] = M[0x5D59] + 1 & 255;
        if (M[0x5DF7]) M[0xB63A + (a - 0x8C & 255)] = M[0x5DF8];
      }
      setw(0x5D4F, w(0x5D4F) + 1);
    }
  });

  // $7488: the table at $5C50 made again from the map: every unit found there, with the square it
  // covers.
  P.def(0x7488, 'tableUnits', () => {
    M.fill(3, 0x5C50, 0x5CA0);
    for (let hl = 0xD6BF; hl !== 0xE65F; hl++) {
      setw(0x5D45, hl);
      const a = M[hl];
      if (a >= 0x8C) {
        const ix = P.unitPtr({ a }).ix;
        P.posOf({ hl });
        P.placeUnit({ ix, a });
      }
    }
    setw(0x5D45, 0xE65F);
    return {};
  });
  // $74C1: unit A's entry in the table at $5C50: its side ($25 bit 0), its square ($5D24) and the
  // floor under it ($16).
  P.def(0x74C1, 'placeUnit', r => {
    const hl = 0x5C50 + 4 * (r.a - 0x8C & 255) & 0xFFFF;
    M[hl] = M[r.ix + 0x25] & 1;
    M[hl + 1] = M[0x5D24];
    M[hl + 2] = M[0x5D25];
    M[hl + 3] = M[r.ix + 0x16];
    return { hl: hl + 3, a: M[hl + 3] };
  });
  // $74E2: $5D24 = the row and column of the map's square at HL.
  P.def(0x74E2, 'posOf', r => {
    const n = r.hl - 0xD6BF & 0xFFFF;
    M[0x5D24] = n / 80 & 255;
    M[0x5D25] = n % 80;
    return { a: n % 80, b: n / 80 & 255 };
  });

  // $74FF: in a player's turn, the number of enemies in sight ($5D59) in the panel, with message
  // $17, or the blank (message $16) for none. When more are in sight than before ($74FE), the view is
  // drawn again and the line flashes seven times with sound effect 7.
  P.def(0x74FF, 'seenCount', () => {
    if (M[0x5DF7]) return {};
    if (!M[0x5D59]) { M[0x74FE] = 0; return P.text({ a: 0x16 }); }
    M[0x5D09] = 8;
    setw(V.ATTR, 0x7272);
    M[V.PRINT_ROW] = 0x16; M[V.PRINT_COL] = 0x18;
    P.printNumber({ a: M[0x5D59] });
    P.infoText({ a: 0x17 });
    const before = M[0x74FE];
    M[0x74FE] = M[0x5D59];
    if (before >= M[0x5D59]) return {};
    M[0x5D2B] = 0;
    P.drawView();
    setw(0x5D2D, 0x5A98);
    for (let b = 7; b; b--) { P.lightLine(); P.sound({ a: 7 }); P.lightLine(); P.playSound(); }
    return { b: 0 };
  });

  // $755D: reaction fire. When the unit that moved ($5D33) is seen by enemies ($5B97, copied to
  // $5BD1) and does not stand on a unit, the sides swap and each enemy in turn that faces it, has
  // more than half its $05 less one of action points left and has not reacted this turn (the list
  // from $5C3C) is shown and may fire: the computer's through the scenario's hook at $B624, a
  // player's through $8E09. Then the sides swap back and the unit that moved is shown again.
  P.def(0x755D, 'startReaction', function* () {
    if (M[0x5DF7]) M[0x5D36] = 1;
    if (M[0x5B97] === 0xFF) return { a: 0, zf: true };
    let ix = w(0x5D33);
    if (M[ix + 0x16] >= 0x8C) return { ix };
    M.copyWithin(0x5BD1, 0x5B97, 0x5B97 + 0x3A);
    setw(0x5D5A, 0x5BD1);
    M[0x5D62] = 0;
    M[0x5D5D] = 1;
    M[0xB712] = 1 - M[0xB712] & 255;
    M[0x5D5C] = M[0x5D26];
    setw(0x5D63, w(0x5D2F));
    setw(0x5D65, w(0x5D24));
    setw(0x5D69, w(0x5D24));
    setw(0x5D5E, w(V.VIEW_ROW));
    setw(0x5D60, w(V.CURSOR_ROW));
    for (;;) {
      const hl = w(0x5D5A);
      if (M[hl] === 0xFF) break;
      const de = M[hl] | M[hl + 1] << 8;
      setw(0x5D24, de); setw(0x5D47, de);
      M[0x5D26] = M[hl + 2];
      setw(0x5D49, w(0x5D65));
      ix = P.unitPtr({ a: M[0x5D26] }).ix;
      setw(0x5D33, ix);
      react: {
        if (P.inView({ ix }).a !== 0) break react;
        M[0x5D36] = 0;
        if (((M[ix + 5] >> 1) - 1 & 255) >= M[ix + 6]) break react;
        for (let p = 0x5C3C; p < 0x5C3C + 19; p++) if (M[p] === M[0x5D26]) break react;
        const q = w(0x5D67);
        M[q] = M[0x5D26];
        setw(0x5D67, q + 1);
        P.jump(0x5E40, {});
        P.showSides();
        P.clearInfo();
        P.infoText({ a: 0x19 });
        P.scenarioTextAt({ hl: 0x1804, a: M[0x5D26] });
        P.text({ a: 0x1A });
        setw(0x5D6B, w(0x5D24));
        if (M[0x5DF7]) {
          P.hideUnits();
          M[0xB712] = 0;
          ix = ixOf(P.sideView({ ix }), ix);
          M[0xB712] = 1;
          P.findSeen();
          ix = ixOf(P.showSeen({ ix }), ix);
        } else {
          if (!M[0x5D62]) P.hideUnits();
          P.panView();
          P.findSeenAll();
          ix = ixOf(P.showSeen({ ix }), ix);
        }
        let de2 = w(0x5D24);
        M[P.mapAddr(de2 & 255, de2 >> 8)] = M[0x5D26];
        P.centreOn();
        yield* P.waitRelease();
        yield* P.waitFire();
        P.text({ a: 0x18 });
        de2 = w(0x5D24);
        setw(V.VIEW_ROW, de2);
        setw(V.CURSOR_ROW, 0);
        const sq = P.mapAddr(de2 & 255, de2 >> 8);
        setw(0x5D2F, sq);
        M[sq] = M[0x5D26];
        M[0xB713] = M[0x5D26];
        P.centreOnUnit();
        yield* P.waitRelease();
        if (M[ix + 0x17]) {
          if (M[0x5DF7]) {
            P.findSeen();
            ix = ixOf(P.showSeen({ ix }), ix);
            if (M[0x5D59]) { ix = ixOf(yield* P.computerReaction({ ix }), ix); ix = w(0x5D33); }
          } else {
            // fire mode; a unit that dies in it ends it past this routine too ($8EDC)
            const d = yield* P.fireMode({ ix });
            if (d && d.pops) return Object.assign({}, d, { pops: d.pops - 1 });
            ix = ixOf(d, ix);
          }
        }
        M[0x5D62] = 1;
        setw(0x5D69, w(0x5D24));
      }
      setw(0x5D5A, w(0x5D5A) + 3);
    }
    M[0xB712] = 1 - M[0xB712] & 255;
    M[0x5D5D] = 0;
    P.jump(0x5E40, {});
    setw(0x5D24, w(0x5D65));
    setw(0x5D6B, w(0x5D65));
    setw(0x5D2F, w(0x5D63));
    M[0x5D26] = M[0x5D5C];
    ix = P.unitPtr({ a: M[0x5D26] }).ix;
    setw(0x5D33, ix);
    if (!M[0x5D62]) return { ix, a: 0, zf: true };
    P.showSides();
    P.clearInfo();
    P.infoText({ a: 0x1B });
    P.text({ a: 0x1A });
    P.hideUnits();
    P.panView();
    setw(V.VIEW_ROW, w(0x5D5E));
    setw(V.CURSOR_ROW, w(0x5D60));
    ix = ixOf(P.sideView({ ix }), ix);
    if (M[0x5DF7]) P.hideSide({ a: M[0x5DF7] });
    yield* P.waitRelease();
    yield* P.waitFire();
    P.centreOnUnit();
    P.findSeen();
    if (M[ix + 8]) {
      M[w(0x5D2F)] = M[0x5D26];
      ix = ixOf(P.unitStats(), ix);
    }
    yield* P.waitRelease();
    return { ix };
  });

  // $7747: the map as side ($B712) sees it: every unit put on it, the other side's taken off, and
  // then each enemy that one of the side's units can see in front of it put back. IX is left on
  // ($5D33).
  P.def(0x7747, 'sideView', () => {
    const keep = w(0x5D24);
    P.showAllUnits();
    P.hideSide({ a: 1 - M[0xB712] & 255 });
    let hl = 0x5C50;
    for (let b = 20; b; b--) {
      if (M[0xB712] === M[hl]) {
        setw(0x5D24, M[hl + 1] | M[hl + 2] << 8);
        const ix = P.unitPtr({ a: 0xA0 - b }).ix;
        P.findSeen();
        P.showSeen({ ix });
      }
      hl += 4;
    }
    setw(0x5D24, keep);
    return { ix: w(0x5D33) };
  });
  // $778A: move the view along the line from ($5D69) to ($5D6B), a square at a time, centred on
  // each ($6E13), unless the two are the same.
  P.def(0x778A, 'panView', () => {
    if (M[0x5D69] === M[0x5D6B] && M[0x5D6A] === M[0x5D6C]) return { zf: true };
    M[R0] = M[R] = M[0x5D69];
    M[C0] = M[C] = M[0x5D6A];
    M[R1] = M[0x5D6B];
    M[C1] = M[0x5D6C];
    M[0x7094] = M[0x7092] = M[0x709C] = M[0x709A] = M[0x7098] = M[0x7096] = 0;
    P.lineSetup();
    for (;;) {
      P.lineStep();
      const l = M[R], h = M[C];
      const end = M[0x5D6B] === l && M[0x5D6C] === h;
      P.centreAt({ hl: h << 8 | l });
      if (end) return {};
    }
  });
  // $77ED: every unit off the map.
  P.def(0x77ED, 'hideUnits', () => { P.hideSide({ a: 1 }); return P.hideSide({ a: 0 }); });
};
})(typeof window !== 'undefined' ? window : globalThis);
