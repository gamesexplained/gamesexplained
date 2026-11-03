// Throwing, priming and reloading: an object thrown along the crosshair's line, as far as the
// unit's strength sends it, caught by a unit it lands on that faces the thrower with a hand free;
// a timer set on an explosive and the fuses that go off at the start of a side's turn; a weapon
// reloaded from a clip.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.throw = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // $9A9C: option 3 of fire mode, throw what the unit holds ($5DC2 its kind): its chance ($5DE5)
  // and price ($5DE6) paid; the range half the distance to the crosshair, at most the unit's
  // strength ($14) over the object's weight ($01), and the flight along the line. Where it lands:
  // on a unit facing the thrower with its hands free and room for it (fewer than ten objects), it is
  // caught (message $51 and the catcher's name); otherwise it falls there, or on the nearest open
  // square before a wall ($9A47). Then the thrower's hands are empty and fire mode ends.
  P.def(0x9A9C, 'throwIt', function* () {
    M[0x5DCD] = M[0x5DE5];
    let ix = w(0x5D33);
    const p = yield* P.payAP({ b: M[0x5DE6], ix });
    if (p.cf) return Object.assign({ ix }, p);
    P.saveCursor();
    M[0x5DE8] = 1;
    M[ix + 6] = M[0x5D35];
    let iy = w(0x5DC2);
    const most = P.divRound({ a: M[ix + 0x14], b: M[iy + 1] }).c;
    setw(0xA54B, w(0x5D24));
    M[0x709B] = M[0x5D11];
    M[0x7099] = M[0x5D12];
    P.shotSquare();
    setw(0xA54D, w(0x5D3A));
    let a = P.distance().a >> 1;
    if (a >= most) a = most;
    setw(0x70AF, a * 32);
    setw(V.CURSOR_ROW, w(0x5DC7));
    setw(V.VIEW_ROW, w(0x5DC5));
    P.shotFrom();
    P.shotStart();
    P.shotHit();
    P.shotFlight();
    if (M[0x5DB7]) { const hl = w(0x5DB4); M[0x7099] = M[hl]; M[0x709B] = M[hl + 1]; }
    setw(0xB716, 0xE65F);
    P.shotSquare();
    a = M[w(0x5D3E)];
    const falls = function* () {
      P.dropAt();
      ix = w(0x5D33);
      M[ix + 0x17] = 0;
      P.setUnitTile({ ix });
      P.centreAt({ hl: w(0x5D3A) });
      P.blowShow();
      P.unitStats();
      yield* P.pause();
    };
    if (a < 0x8C) {
      if (!M[0x5DB7] && M[0xD2FF + a] & 2) P.blastSquare({ ix });
      yield* falls();
    } else {
      M[0x5D39] = a;
      ix = P.unitPtr({ a }).ix;
      setw(0x5D3C, ix);
      setw(0x5D49, w(0x5D24));
      setw(0x5D47, w(0x5D3A));
      let caught = !P.inView({ ix }).a && !M[ix + 0x17];
      if (caught) {
        const keep = M[0x5D26];
        M[0x5D26] = M[0x5D39];
        P.listCarried({ ix });
        if (M[0x5D8F] >= 10) { M[0x5D26] = keep; caught = false; }
        else {
          iy = w(0x5D33);
          M[ix + 0x23] = M[iy + 0x23];
          M[ix + 0x24] = M[iy + 0x24];
          M[ix + 0x17] = M[iy + 0x17];
          P.setUnitTile({ ix });
          const d = P.dropAt();
          ix = ixOf(d, ix); iy = d.iy;
          M[ix + 0x16] = M[0x5D23];
          M[iy + 5] = M[0x5D39];
          M[0x5D26] = keep;
          ix = w(0x5D33);
          M[ix + 0x17] = 0;
          P.setUnitTile({ ix });
          P.clearInfo();
          P.infoText({ a: 0x51 });
          P.scenarioTextAt({ hl: 0x1804, a: M[0x5D39] });
          P.centreAt({ hl: w(0x5D3A) });
          P.blowShow();
          yield* P.pause();
          P.unitStats();
        }
      }
      if (!caught) yield* falls();
    }
    ix = w(0x5D33);
    M[ix + 0x23] = 0;
    M[ix + 0x17] = 0;
    return P.fireEnd();
  });
  // $9C0B: the object in the unit's hands ($17) left at ($5D3A) on its floor, carried by none; the
  // map shows it ($5DE7), or a unit there stands on it. IY = its entry.
  P.def(0x9C0B, 'dropAt', () => {
    let ix = w(0x5D33);
    const iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
    M[iy + 5] = 0;
    M[iy + 1] = M[0x5D3A];
    M[iy + 2] = M[0x5D3B];
    M[iy + 3] = P.floorAt().a;
    const hl = w(0x5D3E);
    if (M[hl] < 0x8C) { M[hl] = M[0x5DE7]; return { ix, iy, hl, a: M[0x5DE7] }; }
    ix = P.unitPtr({ a: M[hl] }).ix;
    M[ix + 0x16] = M[0x5DE7];
    return { ix, iy, a: M[0x5DE7] };
  });
  // $9C42: option 6 of the unit's menu, prime what it holds, for a fifth of its most action points:
  // the timer chosen (message $55, 0 to $28 half-turns) and the half-turn it goes off, the timer plus
  // twice the turn ($B711) plus the side ($B712), in the object's $04 and the unit's $24.
  P.def(0x9C42, 'prime', function* (r) {
    const ix = r.ix;
    const p = yield* P.payAP({ b: P.divRound({ a: M[ix + 5], b: 5 }).c, ix });
    if (p.cf) return Object.assign({ ix }, p);
    M[ix + 6] = M[0x5D35];
    P.clearInfo();
    P.infoText({ a: 0x55 });
    setw(0x5D89, 0x1B05);
    M[0x5D87] = 0;
    M[0x5D86] = 0;
    M[0x5D88] = 0x29;
    yield* P.chooseRounds();
    const iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
    const a = M[0x5D86] + 2 * M[0xB711] + M[0xB712] & 255;
    M[iy + 4] = a;
    M[ix + 0x24] = a;
    return { ix, iy, a };
  });
  // $9C8B: the fuses: every object of a kind with a timer (its $00 bit 3) whose half-turn ($04) is
  // this one goes off where it lies, or where the unit carrying it stands: a blast of its kind's $0F
  // ($9696), its fires, and a long wait. The object itself is left in the list.
  P.def(0x9C8B, 'fuses', function* () {
    P.clearInfo();
    let iy = w(0xB72A);
    for (let b = M[0xB639] || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (M[iy + 4] >> 1 !== M[0xB711]) continue;
      if ((M[iy + 4] & 1) ^ M[0xB712]) continue;
      if (!M[iy]) continue;
      const ix = P.objectPtr({ a: M[iy] }).ix;
      if (!(M[ix] & 8)) continue;
      if (M[iy + 5]) {
        const hl = 0x5C51 + 4 * (M[iy + 5] - 0x8C & 255) & 0xFFFF;
        M[iy + 1] = M[hl];
        M[iy + 2] = M[hl + 1];
      }
      M[0x9694] = M[iy + 1];
      M[0x9695] = M[iy + 2];
      M[0x968E] = M[ix + 0x0F];
      P.clearFires();
      yield* P.explode({ ix });
      yield* P.spreadFires({ ix });
      P.delay200();
    }
    return { b: 0 };
  });
  // $9D01: option 5, reload, for half the unit's most action points (added to its $22): the clip
  // ($5D6F, its entry in the list of what the unit carries) used up, and the weapon's ammunition
  // (the unit's $24, the object's $04) its kind's $10; message $56.
  P.def(0x9D01, 'reload', function* (r) {
    let ix = r.ix;
    const p = yield* P.payAP({ b: P.divRound({ a: M[ix + 5], b: 2 }).c, ix });
    if (p.cf) return Object.assign({ ix }, p);
    M[ix + 6] = M[0x5D35];
    M[ix + 0x22] = M[ix + 0x22] + M[0x6D4D] & 255;
    let iy = P.carriedPtr({ a: M[w(0x5D6F)] }).iy;
    M[iy] = 0;
    M[iy + 5] = 0;
    const a = M[P.objectPtr({ a: M[w(0x5D6F) + 1] }).ix + 0x10];
    ix = w(0x5D33);
    M[ix + 0x24] = a;
    iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
    M[iy + 4] = a;
    P.clearInfo();
    P.infoText({ a: 0x56 });
    yield* P.pause();
    return { ix, iy };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
