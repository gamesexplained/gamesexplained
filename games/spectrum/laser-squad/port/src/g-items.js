// The unit's menu and the objects: what it carries and what lies on the floor, picking up,
// dropping and changing what it holds, the doors and other terrain it can work, and the load it
// carries.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.items = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);
  // The objects of the scenario are listed from ($B72A), ($B639) of them, six bytes each: the kind
  // (an object of the map, $6E on; 0 for none), its row and column, the floor under it, its
  // ammunition or charge, and the unit carrying it (0 for none). A unit's $17 is the object in its
  // hands (from 1), $23 its kind and $24 its ammunition.

  // $7811: after a turn or a step: sound effect 4 in a player's turn, the panel, and the place kept
  // unless another unit of its side shares its square ($9A16). With no action points left on a shared square, the unit goes back
  // (undoMove). NZ while it has points.
  P.def(0x7811, 'afterAction', function* (r) {
    if (!M[0x5DF7]) P.sound({ a: 4 });
    let ix = ixOf(P.unitPanel(), w(0x5D33));
    let s = P.shared({ ix });
    ix = ixOf(s, ix);
    if (s.zf) P.keepPlace({ ix });
    if (M[ix + 6]) return { ix, a: M[ix + 6], zf: false };
    s = P.shared({ ix });
    ix = ixOf(s, ix);
    if (!s.zf) return yield* P.undoMove({ ix });
    return { ix, a: 0, zf: true };
  });
  // $7830: stepping back onto a square where a unit stands unseen: it is put on the map (and so
  // blocks the step) and the view drawn again.
  P.def(0x7830, 'revealBehind', () => {
    let hl = 0x5C50;
    for (let b = 20; b; b--, hl += 4) {
      if (M[hl] === 3) continue;
      if (M[0x5D3A] !== M[hl + 1] || M[0x5D3B] !== M[hl + 2]) continue;
      M[w(0x5D3E)] = 0xA0 - b;
      return P.drawView();
    }
    return { b: 0 };
  });

  // $785D: list from $5B79 the objects the unit ($5D26) carries, three bytes each: the object's
  // number (from 1), its kind and its ammunition; $5D8F counts them.
  P.def(0x785D, 'listCarried', r => {
    M.fill(0, 0x5B79, 0x5B97);
    M[0x5D8F] = 0;
    setw(0x5D6D, 0x5B79);
    let ix = w(0xB72A);
    const n = M[0xB639];
    for (let b = n || 256; b; b--, ix = ix + 6 & 0xFFFF) {
      if (M[0x5D26] !== M[ix + 5]) continue;
      const hl = w(0x5D6D);
      M[hl] = n + 1 - b & 255; M[hl + 1] = M[ix]; M[hl + 2] = M[ix + 4];
      setw(0x5D6D, hl + 3);
      M[0x5D8F]++;
    }
    return { ix: r.ix };
  });
  // $78AB: Z if an object of kind A is in the list ($5D6F its entry), NZ if not.
  P.def(0x78AB, 'findCarried', r => {
    let hl = 0x5B7A;
    for (let b = 10; b; b--, hl += 3) if (M[hl] === r.a) { setw(0x5D6F, hl - 1); return { zf: true, hl: hl - 1, b }; }
    return { a: 1, zf: false };
  });
  // $78C2: a line of the unit's menu: option A, and its words, message A + $1C.
  P.def(0x78C2, 'addLine', r => {
    P.addOption({ a: r.a });
    return P.printMessage({ a: r.a + 0x1C & 255 });
  });

  // $78CD: the unit's menu (fire held with a unit selected). Its lines: 0 done; and unless it stands
  // on a unit: 1 fire (with an object in its hands); 2 change what it holds (when it carries any),
  // 3 pick up (objects on its square) and 4 drop (holding one), unless its $25 bits 2 and 1 say no;
  // 5 and 6 by what it holds (reload: the ammunition it carries; prime: unprimed); 7 to 10 by the
  // terrain in front of it ($08 of its record: 1 a door, open 7 and lock 8 with its key; 2 close 9;
  // 3 unlock 10); 11; then 12 cancel, and the scenario's own at $B633. NZ while the unit can go on.
  P.def(0x78CD, 'unitMenu', function* (r) {
    let ix = r.ix, iy = r.iy;
    P.floorUnder({ hl: w(0x5D24) });
    M[0x5D71] = M[0x5D8F];
    P.listCarried({ ix });
    P.stepTarget({ a: M[ix + 0x21] });
    P.menuOpen();
    M[0x5D09] = 0x0A;
    P.addLine({ a: 0 });
    if (M[ix + 0x16] < 0x8C) {
      if (M[ix + 0x17]) P.addLine({ a: 1 });
      if (!(M[ix + 0x25] & 4)) {
        if (M[0x5B79]) P.addLine({ a: 2 });
        if (!(M[ix + 0x25] & 2)) {
          if (M[0x5D71]) P.addLine({ a: 3 });
          if (M[ix + 0x17]) P.addLine({ a: 4 });
        }
      }
      const kind = M[ix + 0x23];
      if (kind) {
        const o = P.objectPtr({ a: kind }).ix;
        setw(0x5DC2, o);
        if (M[o] & 2 && P.findCarried({ a: M[o + 0x10] }).zf) P.addLine({ a: 5 });
        if (M[o] & 8) {
          ix = w(0x5D33);
          if (M[ix + 0x24] === 0xFF) P.addLine({ a: 6 });
        }
      }
      ix = w(0x5D33);
      const de = w(0x5D3A);
      const hl = P.mapAddr(de & 255, de >> 8);
      setw(0x5D3E, hl);
      const a = M[hl];
      if (a < 0x6E) {
        iy = P.terrainPtr({ a }).iy;
        if (M[iy + 8] === 1) { P.addLine({ a: 7 }); if (M[ix + 0x23] === M[iy + 0x0A]) P.addLine({ a: 8 }); }
        if (M[iy + 8] === 2) P.addLine({ a: 9 });
        if (M[iy + 8] === 3 && M[ix + 0x23] === M[iy + 9]) P.addLine({ a: 0x0A });
      }
      P.addLine({ a: 0x0B });
    }
    P.addLine({ a: 0x0C });
    ix = ixOf(yield* P.scenarioMenu({ ix, iy }), ix);
    yield* P.waitRelease();
    yield* P.menuSelect();
    const d = yield* P.dispatch({ hl: 0x79D1, ix, iy });
    if (d && d.pops) return { ix: ixOf(d, ix), a: 0, zf: true };
    ix = ixOf(d, ix);
    if (!M[ix + 8]) return { ix, a: 0, zf: true };
    P.findSeen();
    ix = ixOf(P.showSeen({ ix }), ix);
    if (!M[ix + 6]) return { ix, a: 0, zf: true };
    ix = ixOf(P.unitStats(), ix);
    P.drawView();
    return { ix, zf: false };
  });

  // $79ED: option 0, done: the unit is let go (Z, past the menu), unless it shares a square with no points
  // left, when it goes back (undoMove).
  P.def(0x79ED, 'doneOption', function* (r) {
    const s = P.shared({ ix: r.ix });
    if (!s.zf) return yield* P.undoMove({ ix: ixOf(s, r.ix) });
    return { ix: ixOf(s, r.ix), pops: 1, a: 0, zf: true };
  });
  P.def(0x79F6, 'cancelOption', r => ({ ix: r.ix }));
  // $79F7: options 7 and 9, open or close the door in front: a fifth of the unit's most action
  // points ($05), and the square becomes the terrain's $09 (IY its record). $7A19: options 8 and 10,
  // lock or unlock with the key held: a quarter, and the terrain's $0B. Carry when the points do
  // not pay for it (the computer's units stop there).
  const work = (at, name, part, field, always) => P.def(at, name, function* (r) {
    const ix = r.ix, iy = r.iy;
    const p = yield* P.payAP({ ix, b: P.divRound({ a: M[ix + 5], b: part }).c });
    if (p.cf) return { ix, cf: true };
    M[ix + 6] = M[0x5D35];
    M[w(0x5D3E)] = M[iy + field];
    if (always || !M[0x5D36]) P.drawView();
    return { ix, cf: false };
  });
  work(0x79F7, 'openDoor', 5, 9, false);
  work(0x7A19, 'lockDoor', 4, 0x0B, true);

  // $7A37: option 2, change what the unit holds, for a quarter of its most action points: the list of
  // what it carries, the one chosen into its hands (none: its hands emptied, the points spent counted
  // in $22).
  P.def(0x7A37, 'changeItem', function* (r) {
    let ix = r.ix;
    const p = yield* P.payAP({ ix, b: P.divRound({ a: M[ix + 5], b: 4 }).c });
    if (p.cf) return { ix };
    P.clearScreen();
    P.text({ a: 0x29 });
    P.listCarried({ ix });
    P.showCarried({ ix });
    let a = M[ix + 0x17];
    if (a) { let b = 0, hl = 0x5B76; do { b++; hl += 3; } while (M[hl] !== a); a = b; }
    M[0x5D72] = a;
    P.drawMark();
    yield* P.waitRelease();
    yield* P.chooseLoop();
    a = M[0x5D72];
    if (!a) {
      if (M[ix + 0x17]) {
        M[ix + 6] = M[0x5D35];
        M[ix + 0x22] = M[ix + 0x22] + M[0x6D4D] & 255;
        M[ix + 0x17] = M[ix + 0x23] = M[ix + 0x24] = 0;
      }
    } else {
      const e = 0x5B79 + 3 * (a - 1);
      if (M[e] !== M[ix + 0x17]) {
        M[ix + 0x17] = M[e];
        M[ix + 0x23] = M[e + 1];
        M[ix + 0x24] = M[e + 2];
        M[ix + 6] = M[0x5D35];
      }
    }
    P.clearScreen();
    P.showSides();
    P.setUnitTile({ ix });
    P.drawView();
    return { ix };
  });
  // $7AC9: the list from $5B7A on the screen, from row 4: each object's tile, its name, its
  // ammunition (a gun's or a grenade's: $FF unprimed), its weight ($01) and its size ($02).
  P.def(0x7AC9, 'showCarried', r => {
    setw(0x5D05, 0x0304);
    setw(0x5D8D, 0x5B7A);
    for (let b = M[0x5D8F] || 256; b; b--) {
      M[0x5D09] = 9;
      setw(0x5D1F, w(0xB722)); setw(0x5D07, w(0xB724));
      const kind = M[w(0x5D8D)];
      setw(V.PRINT_ROW, w(0x5D05) - 0x200 & 0xFFFF);
      P.drawSquare({ a: kind });
      setw(V.ATTR, 0x4606);
      P.printMessage({ a: M[w(0x5D8D)] + 1 & 255 });
      setw(V.ATTR, 0x4505);
      const at = w(0x5D05) + 0x1200 & 0xFFFF;
      setw(V.PRINT_ROW, at); setw(0x5D05, at);
      const o = P.objectPtr({ a: M[w(0x5D8D)] }).ix;
      if (M[o] & 2 || M[o] & 0x20) P.printNumber({ a: M[w(0x5D8D) + 1 & 0xFFFF] });
      else if (M[o] & 8) {
        setw(V.ATTR, 0x4707);
        const n = M[w(0x5D8D) + 1 & 0xFFFF];
        if (n !== 0xFF) P.printNumber({ a: n }); else P.infoText({ a: 0x66 });
      }
      setw(V.ATTR, 0x4343);
      M[V.PRINT_COL] = 0x19;
      P.printNumber({ a: M[o + 1] });
      setw(V.ATTR, 0x4242);
      M[V.PRINT_COL] = 0x1D;
      P.printNumber({ a: M[o + 2] });
      M[0x5D05] = M[0x5D05] + 2 & 255;
      M[0x5D06] = 3;
      setw(0x5D8D, w(0x5D8D) + 3);
    }
    return { ix: r.ix };
  });
  // $7B95: choose from the list: down and up move the mark ($5D72, 0 for none, round from the end),
  // with sound effect 1; fire takes it, with sound effect 2.
  P.def(0x7B95, 'chooseLoop', function* () {
    for (;;) {
      yield* P.readControls();
      P.count('chooseTurn');
      const a = M[0x5D2A];
      if (!(a & 1)) return P.sound({ a: 2 });
      let moved = false;
      if (!(a & 4)) {
        P.eraseMark();
        M[0x5D72] = M[0x5D72] + 1 & 255;
        if (M[0x5D8F] < M[0x5D72]) M[0x5D72] = 0;
        moved = true;
      } else if (!(a & 2)) {
        P.eraseMark();
        M[0x5D72] = M[0x5D72] - 1 & 255;
        if (M[0x5D72] === 0xFF) M[0x5D72] = M[0x5D8F];
        moved = true;
      }
      if (moved) { P.sound({ a: 1 }); P.drawMark(); }
      yield* P.repeatDelay();
    }
  });
  P.def(0x7BDE, 'eraseMark', () => { P.markPos(); return P.printCharDouble({ a: 0x20 }); });
  P.def(0x7BE7, 'drawMark', () => { P.markPos(); setw(V.ATTR, 0x4747); return P.printCharDouble({ a: 0x3A }); });
  P.def(0x7BF6, 'markPos', () => { M[V.PRINT_ROW] = 2 * M[0x5D72] + 2 & 255; M[V.PRINT_COL] = 0; return { a: 0 }; });

  // $7C05: drop what the unit holds without asking ($5D90 set); $7C0A: option 4, drop it, for a tenth
  // of its most action points. The object is left on the unit's square with the floor under it. On
  // terrain whose $08 is 9 (a hole, $09 the largest that falls in) the player is asked first; then the
  // largest object on the square is what the unit stands on.
  P.def(0x7C05, 'dropForced', function* (r) { M[0x5D90] = 1; return yield* P.dropItem(r); });
  P.def(0x7C0A, 'dropItem', function* (r) {
    let ix = r.ix;
    const p = yield* P.payAP({ ix, b: P.divRound({ a: M[ix + 5], b: 10 }).c });
    if (p.cf) return { ix };
    setw(0x5D3A, w(0x5D24));
    P.floorAt();
    let iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
    M[iy + 3] = M[0x5D23];
    M[0x5DE7] = M[ix + 0x23];
    M[ix + 0x17] = M[ix + 0x23] = M[ix + 0x24] = 0;
    M[iy + 1] = M[0x5D24]; M[iy + 2] = M[0x5D25];
    M[iy + 5] = 0;
    const t = P.terrainPtr({ a: M[0x5D23] }).iy;
    let ask = false;
    if (M[t + 8] === 9 && !M[0x5D90]) {
      const o = P.objectPtr({ a: M[0x5DE7] }).ix;
      if (M[o + 2] < M[t + 9]) ask = true;
    }
    let skip = false;
    if (ask) {
      P.menuOpen();
      P.infoText({ a: 0x57 });
      P.addOption({ a: 0 });
      P.addOption({ a: 1 });
      yield* P.waitRelease();
      yield* P.menuSelect();
      skip = M[0x5D2B] !== 0;
    }
    if (!skip) {
      M[0x5D90] = 0;
      const a = P.objectAt({ hl: w(0x5D24) }).a;
      M[w(0x5D33) + 0x16] = a;
    }
    ix = w(0x5D33);
    M[ix + 6] = M[0x5D35];
    P.updateLoad({ ix });
    P.setUnitTile({ ix });
    P.drawView();
    return { ix };
  });

  // $7CAC: option 3, pick up, for a quarter of the unit's most action points (a half when its hands
  // are full): the objects on its square listed, the one chosen into its hands, if its weight and size
  // ($01, $02) with the rest of its load stay under its strength ($14) and its size ($26); and again,
  // while it has the points for another.
  P.def(0x7CAC, 'pickUp', function* (r) {
    let ix = r.ix;
    const p = yield* P.payAP({ ix, b: P.divRound({ a: M[ix + 5], b: M[ix + 0x17] ? 2 : 4 }).c });
    if (p.cf) return { ix };
    const done = () => { P.clearScreen(); P.showSides(); P.setUnitTile({ ix }); P.drawView(); return { ix }; };
    const fail = function* (msg) { P.clearScreen(); P.showSides(); P.drawView(); yield* P.errorText({ a: msg }); return { ix }; };
    for (;;) {
      P.clearScreen();
      P.text({ a: 0x2A });
      P.floorUnder({ hl: w(0x5D24) });
      P.showCarried({ ix });
      P.carriedLoad({ ix });
      M[0x5D72] = 0;
      P.drawMark();
      yield* P.waitRelease();
      yield* P.chooseLoop();
      let a = M[0x5D72];
      if (!a) return done();
      a = M[0x5B79 + 3 * (a - 1)];
      M[0x5D72] = a;
      const iy = P.carriedPtr({ a }).iy;
      const o = P.objectPtr({ a: M[iy] }).ix;
      let s = M[o + 1] + M[0x5D91];
      if (s > 255) return yield* fail(0x2B);
      ix = w(0x5D33);
      if ((s - 1 & 255) >> 1 >= M[ix + 0x14]) return yield* fail(0x2B);
      s = M[o + 2] + M[0x5D92];
      if (s > 255) return yield* fail(0x2C);
      if ((s - 1 & 255) >= M[ix + 0x26]) return yield* fail(0x2C);
      M[ix + 0x17] = M[0x5D72];
      M[iy + 5] = M[0x5D26];
      M[ix + 0x23] = M[iy];
      M[ix + 0x24] = M[iy + 4];
      M[ix + 6] = M[0x5D35];
      M[ix + 0x22] = M[ix + 0x22] + M[0x6D4D] & 255;
      P.updateLoad({ ix });
      M[ix + 0x16] = M[0x5D23];
      const q = P.objectAt({ hl: w(0x5D24) });
      if (q.zf) return done();
      M[ix + 0x16] = q.a;
      const c = P.divRound({ a: M[ix + 5], b: 4 }).c;
      if (M[ix + 6] < c) return done();
      M[0x5D35] = M[ix + 6] - c;
    }
  });

  // $7D9F: list from $5B79 the objects lying on the square in HL (at most ten), as listCarried does,
  // and $5D23 the floor under them.
  P.def(0x7D9F, 'floorUnder', r => {
    setw(0x5D93, r.hl);
    M[0x5D8F] = 0;
    setw(0x5D6D, 0x5B79);
    M.fill(0, 0x5B79, 0x5B97);
    let ix = w(0xB72A), hl = 0x5B79;
    const n = M[0xB639];
    for (let b = n || 256; b; b--, ix = ix + 6 & 0xFFFF) {
      if (M[ix + 5] || !M[ix]) continue;
      if (M[0x5D93] !== M[ix + 1] || M[0x5D94] !== M[ix + 2]) continue;
      M[hl] = n + 1 - b & 255; M[hl + 1] = M[ix]; M[hl + 2] = M[ix + 4];
      hl += 3;
      M[0x5D23] = M[ix + 3];
      M[0x5D8F]++;
      if (M[0x5D8F] === 10) break;
    }
    return { hl };
  });
  // $7E0B: the weight ($5D91) and size ($5D92) of what the unit ($5D26) carries.
  P.def(0x7E0B, 'carriedLoad', r => {
    M[0x5D91] = 0; M[0x5D92] = 0;
    let iy = w(0xB72A);
    for (let b = M[0xB639] || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (M[0x5D26] !== M[iy + 5]) continue;
      const o = P.objectPtr({ a: M[iy] }).ix;
      M[0x5D91] = M[0x5D91] + M[o + 1] & 255;
      M[0x5D92] = M[0x5D92] + M[o + 2] & 255;
    }
    return { ix: r.ix, iy };
  });
  // $7E48: A = the largest ($02) of the objects lying on the square in HL, which is what shows on the
  // map; 0 and Z for none.
  P.def(0x7E48, 'objectAt', r => {
    P.floorUnder({ hl: r.hl });
    if (!M[0x5D8F]) return { a: 0, zf: true };
    M[0x5D95] = 0;
    setw(0x5D6D, 0x5B7A);
    for (let b = M[0x5D8F]; b; b--) {
      const hl = w(0x5D6D);
      const o = P.objectPtr({ a: M[hl] }).ix;
      if (M[0x5D95] < M[o + 2]) { M[0x5D96] = M[hl]; M[0x5D95] = M[o + 2]; }
      setw(0x5D6D, hl + 3);
    }
    const a = M[0x5D96];
    return { a, zf: a === 0 };
  });
  // $7E92: the unit's load slows it: $19 is half of its own most action points ($1B) times the
  // weight it carries over its strength ($14), each step rounded; its most action points ($05) are
  // $1B less that, and its points cut to them.
  P.def(0x7E92, 'updateLoad', r => {
    const ix = r.ix;
    P.carriedLoad({ ix });
    if (!M[0x5D91]) { M[ix + 0x19] = 0; return { ix, a: 0 }; }
    const m = P.div32({ a: M[ix + 0x14], b: M[0x5D91], hl: 0x5D91, ix });
    const d = P.div32Round(Object.assign({}, m, { hl: M[ix + 0x1B], a: M[ix + 0x1B], ix }));
    M[ix + 0x19] = d.de >> 1 & 255;
    const a = M[ix + 0x1B] - M[ix + 0x19] & 255;
    M[ix + 5] = a;
    if (a < M[ix + 6]) M[ix + 6] = a;
    return { ix, a };
  });

  // $7ECB: a step the way A: off the map, Z; then by what stepCost found: an enemy ahead, close
  // combat ($80CD); 1, $7F0B; able, makeStep and the panel; anything else, message $14 and the
  // unit's numbers. NZ while the unit can go on.
  P.def(0x7ECB, 'moveDir', function* (r) {
    let ix = r.ix;
    const t = P.stepTarget({ a: r.a });
    if (t.zf) return { ix, zf: true, a: 0 };
    ix = ixOf(P.stepCost({ ix }), ix);
    const why = M[0x5D29];
    if (M[0x5D38] && why < 2) return { ix, a: 1, zf: false };
    if (why === 3) return { ix, a: 1, zf: false };
    if (why === 0) return yield* P.closeCombat({ ix });
    if (why === 1) return yield* P.attackTerrain({ ix });
    if (why === 5) {
      const s = yield* P.makeStep({ ix });
      P.unitPanel();
      return Object.assign({}, s, { ix: w(0x5D33) });
    }
    P.drawView();
    yield* P.errorText({ a: 0x14 });
    ix = ixOf(P.unitStats(), ix);
    return { ix, a: 1, zf: false };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
