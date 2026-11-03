// Shooting: the unit's record on its own screen; the fire mode, its crosshair and its menu of
// shots; the chance and the price of each; a shot's flight across the view, dot by dot with its
// trail, the view scrolled when it leaves it; what it hits; the sparks; the bursts of auto fire.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.fire = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // $8742: option 1 of cursor mode, the record of the unit under the cursor ($5D2F its square).
  P.def(0x8742, 'unitInfo', function* (r) {
    M[0x5DA9] = M[w(0x5D2F)];
    return yield* P.unitInfoOf(r);
  });
  // $874D: the record of unit $5DA9 on a screen of its own: its tile, facing down, and its name;
  // its armour on each side ($0D front, $0E right, $0F rear, $10 left) round it, and its $11;
  // eight bars from $5B00, two bytes each, the most and the value: weapon skill ($12), close
  // combat ($13), agility ($15), strength ($14), constitution ($07 and $08), action points ($1B
  // and $06), morale ($0B and $0C), stamina ($09 and $0A), each with its value. Fire goes back to
  // the view. IX is kept.
  P.def(0x874D, 'unitInfoOf', function* (r) {
    P.eraseCursor();
    const ix = P.unitPtr({ a: M[0x5DA9] }).ix;
    P.infoText({ a: P.clearScreenA({ a: 0x46 }).a });
    setw(V.PRINT_ROW, 0x1503);
    const table = w(0xB716), keep = M[0x5D26], face = M[ix + 0x21];
    M[ix + 0x21] = 4;
    M[0x5D26] = M[0x5DA9];
    P.setUnitTile({ ix });
    setw(0xB716, 0xE65F);
    P.drawSquare({ a: M[0x5DA9] });
    M[ix + 0x21] = face;
    P.setUnitTile({ ix });
    M[0x5D26] = keep;
    setw(0xB716, table);
    P.scenarioTextAt({ hl: 0x0002, a: M[0x5DA9] });
    const at = (hl, a) => { setw(V.PRINT_ROW, hl); P.printNumber({ a }); };
    at(0x1506, M[ix + 0x0D]);
    at(0x1103, M[ix + 0x0E]);
    at(0x1500, M[ix + 0x0F]);
    at(0x1803, M[ix + 0x10]);
    M[0x5D09] = 0;
    at(0x0E06, M[ix + 0x11]);
    M[0x5D09] = 8;
    M[0x5DB0] = 8;
    setw(0x5D6D, 0x0D08);
    setw(V.ATTR, 0x4646);
    const bar = (most, now) => { M[0x5B00 + 2 * bar.n] = M[ix + most]; M[0x5B01 + 2 * bar.n] = M[ix + now]; bar.n++; P.statLine({ a: M[ix + now] }); };
    bar.n = 0;
    bar(0x12, 0x12); bar(0x13, 0x13); bar(0x15, 0x15); bar(0x14, 0x14);
    bar(0x07, 0x08); bar(0x1B, 0x06); bar(0x0B, 0x0C); bar(0x09, 0x0A);
    M[0x5DAA] = 0x3A;
    M[0x5DAB] = 0x78;
    P.bars();
    yield* P.waitFire();
    P.clearScreen();
    P.drawView();
    P.showSides();
    return { ix: r && r.ix };
  });
  // $8881: number A at ($5D6D), and ($5D6D) two rows down.
  P.def(0x8881, 'statLine', r => {
    setw(V.PRINT_ROW, w(0x5D6D));
    P.printNumber({ a: r.a });
    M[0x5D6D] = M[0x5D6D] + 2 & 255;
    return { hl: 0x5D6D };
  });
  // $8890: the eight bars of the record: for each, from $5B00, its outline as long as its most (half
  // of it, and of its value, from $7F up) plus two, from column $78 of the screen and rows $3A on,
  // $10 apart; then the bars filled a column at a time, $80 steps with a short wait each, each bar
  // as far as its value.
  P.def(0x8890, 'bars', () => {
    M[0x5DA6] = 0;
    setw(0x5DAE, 0x5B00);
    setw(0x5DAC, w(0x5DAA));
    for (let b = M[0x5DB0] || 256; b; b--) {
      const hl = w(0x5DAE);
      let n = M[hl];
      if (n) {
        if (n >= 0x7F) { n >>= 1; M[hl] >>= 1; M[hl + 1] >>= 1; }
        n = n + 2 & 255;
        for (let k = n || 256; k; k--) {
          M[0x5DA4] = M[0x5DAD];
          M[0x5DA3] = M[0x5DAC];
          P.plot();
          M[0x5DA3] = M[0x5DAC] + 0x0B & 255;
          P.plot();
          M[0x5DAD] = M[0x5DAD] + 1 & 255;
        }
        P.barEnd();
      }
      setw(0x5DAE, w(0x5DAE) + 2);
      M[0x5DAC] = M[0x5DAC] + 0x10 & 255;
      M[0x5DAD] = M[0x5DAB];
    }
    M[0x5DB1] = 0;
    setw(0x5DAC, w(0x5DAA));
    for (let b = 0x80; b; b--) {
      setw(0x5DAE, 0x5B01);
      for (let k = M[0x5DB0] || 256; k; k--) {
        if (M[w(0x5DAE)] >= M[0x5DB1]) { M[0x5DA4] = M[0x5DAD]; P.barEnd(); }
        setw(0x5DAE, w(0x5DAE) + 2);
        M[0x5DAC] = M[0x5DAC] + 0x10 & 255;
      }
      P.delay3();
      M[0x5DB1] = M[0x5DB1] + 1 & 255;
      M[0x5DAD] = M[0x5DAD] + 1 & 255;
      M[0x5DAC] = M[0x5DAA];
    }
    return { b: 0 };
  });
  // $894B: a line of twelve dots down from row ($5DAC).
  P.def(0x894B, 'barEnd', () => {
    M[0x5DA3] = M[0x5DAC];
    for (let b = 12; b; b--) { P.plot(); M[0x5DA3] = M[0x5DA3] + 1 & 255; }
    return { b: 0, hl: 0x5DA3 };
  });
  // $895F: C = 8 x A over B, rounded down; 0, with Z, for B = 0.
  P.def(0x895F, 'div8', r => {
    let hl = 8 * r.a;
    const de = r.b;
    if (!de) return { a: 0, zf: true, c: 0, hl, de: 0 };
    let c = 0;
    for (;;) {
      const s = hl - de;
      hl = s & 0xFFFF;
      if (s < 0) return { a: r.b, c, hl, de, cf: true };
      c = c + 1 & 255;
    }
  });
  // $8974: the shot's dot at ($5DA3, $5DA4) added to its trail, a ring of 44 places from $5B00 to
  // the $FE at $5B58 ($5DB2 the next): the dot set ($5DA5 then says whether something was drawn
  // there already, which stops the shot) and the oldest dot of the trail taken off.
  P.def(0x8974, 'trailAdd', () => {
    let hl = w(0x5DB2);
    setw(0x5DB4, hl);
    M[hl] = M[0x5DA4];
    M[hl + 1] = M[0x5DA3];
    hl += 2;
    setw(0x5DB2, hl);
    if (M[hl] === 0xFE) setw(0x5DB2, 0x5B00);
    M[0x5DA6] = 0;
    P.plot();
    hl = w(0x5DB2);
    M[0x5DA4] = M[hl];
    M[0x5DA3] = M[hl + 1];
    if (M[hl + 1] === 0xFF) return { a: 0xFF, zf: true };
    M[0x5DA6] = 1;
    return P.plot();
  });
  // $89B1: the shot's flight along the line from ($7091, $7093) to ($7095, $7097) in the view's
  // pixels, a dot at a time with its sound: the view scrolled when the dot reaches an edge of it,
  // until it meets the map's edge ($5DB7), a dot already drawn ($5DA5) or its range ($70AF, the
  // dots so far in $70B1). Then the trail taken off, a dot at a time.
  P.def(0x89B1, 'shotFlight', () => {
    P.lineSetup();
    M[0x5D7B] = 1;
    for (;;) {
      M[0x5DB6] = 0x0B;
      M[0x5DB7] = 0;
      if (M[0x7099] === 0xB0) P.edgeRight();
      if (M[0x7099] === 0xFF) P.edgeLeft();
      if (M[0x709B] === 0xB0) P.edgeDown();
      if (M[0x709B] === 0xFF) P.edgeUp();
      if (M[0x5DB7]) break;
      M[0x5DA4] = M[0x7099];
      M[0x5DA3] = M[0x709B];
      M[0x5B58] = M[0x5B59] = 0xFE;
      P.trailAdd();
      if (M[0x5DA5]) break;
      P.shotSound();
      P.lineStep();
      if (!P.inRange().cf) break;
    }
    M[0x5DA6] = 1;
    for (let b = 0x2C; b; b--) {
      let hl = w(0x5DB2);
      if (M[hl] === 0xFE) { hl = 0x5B00; setw(0x5DB2, hl); }
      if (M[hl] !== 0xFF) {
        M[0x5DA4] = M[hl];
        M[0x5DA3] = M[hl + 1];
        P.plot();
        P.shotSound();
      }
      setw(0x5DB2, w(0x5DB2) + 2);
    }
    return { b: 0 };
  });
  // $8A15: C while the dots so far ($70B1) are fewer than the range ($70AF).
  P.def(0x8A15, 'inRange', () => {
    const d = w(0x70B1) - w(0x70AF);
    return { hl: d & 0xFFFF, de: w(0x70AF), cf: d < 0, zf: d === 0 };
  });
  // $8A55: the trail emptied, $FF from $5B00 to $5B57.
  P.def(0x8A55, 'trailClear', () => {
    M.fill(0xFF, 0x5B00, 0x5B58);
    return { hl: 0x5B57, de: 0x5B58, bc: 0 };
  });
  // $8A63, $8AA1, $8AD7, $8B1A: the shot at the right, left, bottom or top edge of the view: the view
  // moved that way eleven squares ($5DB6), or as far as the map goes, the dot with it, the trail
  // emptied and the view drawn again; at the map's edge $5DB7 is set and the shot stops.
  const edge = (v, lim, dot, more) => {
    if (more) {
      if (M[v] === lim) { M[0x5DB7] = 1; return { a: 1 }; }
      if (M[v] + 0x0B >= lim) M[0x5DB6] = lim - M[v] & 255;
      M[v] = M[v] + M[0x5DB6] & 255;
      M[dot] = M[dot] - (M[0x5DB6] << 4) & 255;
    } else {
      if (!M[v]) { M[0x5DB7] = 1; return { a: 1 }; }
      if (M[v] < 0x0B) M[0x5DB6] = M[v];
      M[v] = M[v] - M[0x5DB6] & 255;
      M[dot] = M[dot] + (M[0x5DB6] << 4) & 255;
    }
    P.trailClear();
    return P.drawView();
  };
  P.def(0x8A63, 'edgeRight', () => edge(V.VIEW_COL, 0x45, 0x7099, true));
  P.def(0x8AA1, 'edgeLeft', () => edge(V.VIEW_COL, 0, 0x7099, false));
  P.def(0x8AD7, 'edgeDown', () => edge(V.VIEW_ROW, 0x27, 0x709B, true));
  P.def(0x8B1A, 'edgeUp', () => edge(V.VIEW_ROW, 0, 0x709B, false));
  // $8B7A: the crosshair, flipped on or off: 21 dots from the table at $8B50 (row and column from
  // the cursor's pixel, $5D11 and $5D12).
  P.def(0x8B7A, 'drawCrosshair', () => {
    M[0x5DA6] = 2;
    let t = 0x8B50;
    for (let b = 0x15; b; b--, t += 2) {
      M[0x5DA4] = M[0x5D12] + M[t + 1] & 255;
      M[0x5DA3] = M[0x5D11] + M[t] & 255;
      P.plot();
    }
    setw(0x5DB8, t);
    return { b: 0 };
  });
  // $8BA7: the crosshair's place on the map in pixels, sixteen to a square: $5DC9 across, $5DCB down.
  P.def(0x8BA7, 'crossPos', () => {
    setw(0x5DC9, M[V.VIEW_COL] * 16 + M[0x5D12] & 0xFFFF);
    const hl = M[V.VIEW_ROW] * 16 + M[0x5D11] & 0xFFFF;
    setw(0x5DCB, hl);
    return { hl, de: M[0x5D11] };
  });
  // $8BD0: a missed shot's end moved off the coordinate ($5DD2) by up to $5DD0 over eight over a
  // random number (from $14, more for a shot with a better chance, $5DCD), rounded; either way, at
  // least 0.
  P.def(0x8BD0, 'scatter', () => {
    const b = M[0x5DCD];
    M[0x5D9B] = 0x55 + b + (b >> 1) & 255;
    let de = P.random().a + 0x14 & 255;
    let hl = w(0x5DD0) >> 3, c = 0;
    while (hl >= de) { hl -= de; c = c + 1 & 255; }
    de >>= 1;
    if (hl < de) c = c + 1 & 255;
    de = c;
    hl = w(0x5DD2);
    M[0x5D9B] = 100;
    const a = P.random().a;
    if (a >= 50) return { hl: hl + de & 0xFFFF, de, a };
    if (hl >= de) return { hl: hl - de, de, a };
    return { hl: 0, de, a };
  });
  // $8C25: the map's square of the shot's dot ($7099 across, $709B down, in the view): $5D11 and
  // $5D12 its square in the view, $5D3A on the map, $5D3E its address.
  P.def(0x8C25, 'shotSquare', () => {
    M[0x5D11] = M[0x709B] >> 4;
    M[0x5D12] = M[0x7099] >> 4;
    const pos = w(V.VIEW_ROW) + w(0x5D11) & 0xFFFF;
    setw(0x5D3A, pos);
    const hl = P.mapSquare({ d: pos >> 8, e: pos & 255 }).hl;
    setw(0x5D3E, hl);
    return { hl };
  });
  // $8C54: the map's square under the crosshair ($5D49) and what is there; Z if it is the unit
  // firing ($5D26).
  P.def(0x8C54, 'crossSquare', () => {
    const pos = w(V.VIEW_ROW) + ((M[0x5D12] >> 4) << 8 | M[0x5D11] >> 4) & 0xFFFF;
    setw(0x5D49, pos);
    const hl = P.mapSquare({ d: pos >> 8, e: pos & 255 }).hl;
    const b = M[hl], a = M[0x5D26];
    return { hl, a, b, zf: a === b, cf: a < b };
  });
  // $8C7D: into fire mode: the cursor kept off ($B71B), the view and the cursor saved ($5DBC,
  // $5DC0), the cursor in pixels (sixteen to a square, from the middle, $5DBE and $5DBF), the line's
  // start on the map ($7091, $7093, kept in $5DD8 and $5DD6). Then the shots of the weapon ($5DC2 its
  // kind) for the unit: the chance of auto ($5DDF), snap ($5DE1) and aimed ($5DE3), the kind's
  // $0E, $0A and $0C plus a quarter, a half and all of the unit's weapon skill ($12) over the kind's
  // $13 (when its $00 has bit 1 set), at most 100; their prices in action points, eight times the
  // unit's most ($05) over the kind's $0D, $09 and $0B (no auto shot when $0D is 0); a throw's
  // chance, the unit's agility ($15), and its price a fifth of its most points, none when its $25
  // has bit 1 set.
  P.def(0x8C7D, 'aimStart', () => {
    M[0x5DE8] = 0;
    M[0xB71B] = 1;
    setw(0x5DBC, w(V.VIEW_ROW));
    setw(0x5DC0, w(V.CURSOR_ROW));
    let a = M[0x5D12] << 4 & 255;
    a = a + 8 & 255;
    M[0x5DBE] = a; M[0x5D12] = a;
    a = (M[0x5D11] << 4 & 255) + 8 & 255;
    M[0x5DBF] = a; M[0x5D11] = a;
    P.crossPos();
    setw(0x7091, w(0x5DC9)); setw(0x5DD8, w(0x5DC9));
    setw(0x7093, w(0x5DCB)); setw(0x5DD6, w(0x5DCB));
    M[0xB718] = 0xA7;
    M[0xB719] = 8;
    setw(0xB716, 0xE79F);
    const ix = w(0x5DC2), iy = w(0x5D33);
    a = 0;
    if (M[ix] & 2) a = P.divRound({ a: M[iy + 0x12], b: M[ix + 0x13] }).c;
    M[0x5DD5] = a;
    M[0x5DDF] = P.upTo100({ a: M[ix + 0x0E], b: M[0x5DD5] >> 2 }).a;
    M[0x5DE1] = P.upTo100({ a: M[ix + 0x0A], b: M[0x5DD5] >> 1 }).a;
    M[0x5DE3] = P.upTo100({ a: M[ix + 0x0C], b: M[0x5DD5] }).a;
    a = M[ix + 0x0D];
    if (a) a = P.div8({ a: M[iy + 5], b: M[ix + 0x0D] }).c || 1;
    M[0x5DE0] = a;
    M[0x5DE2] = P.div8({ a: M[iy + 5], b: M[ix + 9] }).c;
    M[0x5DE4] = P.div8({ a: M[iy + 5], b: M[ix + 0x0B] }).c;
    M[0x5DE5] = M[iy + 0x15];
    M[0x5DE6] = P.divRound({ a: M[iy + 5], b: 5 }).c;
    if (M[iy + 0x25] & 2) M[0x5DE6] = 0;
    return { ix, iy };
  });
  // $8D78: A + B, at most 100.
  P.def(0x8D78, 'upTo100', r => {
    const a = r.a + r.b & 255;
    return { a: a < 100 ? a : 100, cf: a < 100 };
  });
  // $8D7F: the readout in fire mode: message $4C, the weapon's name ($5DE7), the unit's points and
  // ammunition, and for each of the four shots from $5DDF its chance with a '%' and its price, or
  // message $4D for a shot it has not.
  P.def(0x8D7F, 'fireInfo', () => {
    P.clearInfo();
    P.infoText({ a: 0x4C });
    P.scenarioTextAt({ hl: 0x1800, a: M[0x5DE7] });
    P.fireAP();
    setw(0x5D05, 0x180A);
    setw(0x5D6D, 0x5DDF);
    for (let b = 4; b; b--) {
      const p = w(0x5D6D);
      if (!M[p + 1]) P.infoText({ a: 0x4D });
      else {
        P.printPercent({ a: M[p], hl: w(0x5D05) });
        setw(V.PRINT_ROW, w(0x5D05) + 0x0500);
        P.printNumber({ a: M[w(0x5D6D) + 1] });
      }
      setw(0x5D6D, w(0x5D6D) + 2);
      setw(0x5D05, w(0x5D05) + 4);
    }
    return { b: 0 };
  });
  // $8DE1: the unit's action points ($06) and the ammunition in its weapon ($24) in the readout.
  P.def(0x8DE1, 'fireAP', () => {
    const iy = w(0x5D33);
    M[0x5D09] = 8;
    setw(V.ATTR, 0x4646);
    setw(V.PRINT_ROW, 0x1C04);
    P.printNumber({ a: M[iy + 6] });
    setw(V.PRINT_ROW, 0x1C06);
    P.printNumber({ a: M[iy + 0x24] });
    return { iy };
  });

  // $8E09: option 1 of the unit's menu, fire, with the weapon in its hands ($23 its kind, kept in
  // $5DE7 and its record in $5DC2). The crosshair, until fire: on a square outside the unit's
  // field of view (inView), message $67; on any other but the unit itself, the menu of the shots
  // it has (auto 0, snap 1, aimed 2, throw 3), the record of a unit under it (4, $5DA9), end fire
  // (5) and cancel (6), their routines at $8EE5. Fire mode ends when the unit dies, or by option 5,
  // which returns past the unit's menu too.
  P.def(0x8E09, 'fireMode', function* (r) {
    M[0x5DE7] = M[r.ix + 0x23];
    let ix = P.objectPtr({ a: M[0x5DE7] }).ix;
    setw(0x5DC2, ix);
    ix = ixOf(P.aimStart(), ix);
    P.drawView();
    P.fireInfo();
    M[0x5D1A] = 0;
    M[0x5D17] = 1;
    for (;;) {
      do yield* P.crosshairLoop(); while (M[0x5D2A] & 1);
      if (!P.crossSquare().zf) {
        setw(0x5D47, w(0x5D24));
        ix = w(0x5D33);
        if (P.inView({ ix }).a) {
          P.drawView();
          yield* P.errorText({ a: 0x67 });
          P.fireInfo();
          M[0x5D1A] = 0;
          continue;
        }
      }
      P.menuOpen();
      setw(V.ATTR, 0x4646);
      if (!P.crossSquare().zf) {
        if (M[0x5DE0]) { P.addOption({ a: 0 }); P.text({ a: 0x47 }); }
        if (M[0x5DE2]) { P.addOption({ a: 1 }); P.text({ a: 0x48 }); }
        if (M[0x5DE4]) { P.addOption({ a: 2 }); P.text({ a: 0x49 }); }
        if (M[0x5DE6]) { P.text({ a: 0x4A }); P.addOption({ a: 3 }); }
      }
      const a = M[P.crossSquare().hl];
      if (a >= 0x8C) { M[0x5DA9] = a; P.addOption({ a: 4 }); P.infoText({ a: 8 }); }
      P.infoText({ a: 0x4B });
      P.addOption({ a: 5 });
      P.addOption({ a: 6 });
      yield* P.waitRelease();
      yield* P.menuSelect();
      const d = yield* P.dispatch({ hl: 0x8EE5, ix, iy: w(0x5D33) });
      if (d && d.pops) return Object.assign({}, d, { pops: d.pops - 1 });
      ix = w(0x5D33);
      if (!M[ix + 8]) return P.fireEnd();
      P.fireInfo();
    }
  });
  // $8EF3: option 6 of fire mode, cancel: nothing.
  P.def(0x8EF3, 'fireCancel', () => ({}));
  // $8EF4: option 5, the end of fire mode: the cursor back on ($B71B), the tables of squares as
  // they were ($B718, $B716), the view and the cursor put back and the view drawn. In a player's
  // turn it returns past its caller, with Z.
  P.def(0x8EF4, 'fireEnd', () => {
    M[0xB71B] = 0;
    M[0xB718] = 0x0A;
    M[0xB719] = 0;
    setw(V.VIEW_ROW, w(0x5DBC));
    setw(V.CURSOR_ROW, w(0x5DC0));
    setw(0xB716, 0xE65F);
    P.drawView();
    const ix = w(0x5D33);
    if (M[0x5DF7]) return { ix, a: M[0x5DF7], zf: false };
    return { ix, a: 0, zf: true, pops: 1 };
  });
  // $8F21: option 4, the record of the unit under the crosshair.
  P.def(0x8F21, 'fireUnitInfo', function* (r) {
    yield* P.unitInfoOf(r);
    M[0x5D1A] = 0;
    M[0x5D16] = 0;
    return { a: 0 };
  });
  // $8F2C: the sound of a dot of the shot: clicks of the speaker, closer each time ($5D7B, by 3 up to
  // $D2) until ($5D7C) reaches $D2, with a noise from the refresh register; then a short wait.
  P.def(0x8F2C, 'shotSound', () => {
    let t = 26;
    setw(0x5D7C, 0);
    for (;;) {
      const hl = w(0x5D7C) + M[0x5D7B] & 0xFFFF;
      setw(0x5D7C, hl);
      t += 13 + 7 + 4 + 16 + 11 + 16 + 10 + 4 + 15;
      if (hl >= 0xD2) { t += 12 + 7 + 255 * 13 - 5 + 10; break; }
      t += 7 + 7 + 11; P.io.out(0xFE, 0x10, P.T + t);
      const b = M[0x5D7B] || 256;
      t += 13 + 4 + b * 17 - 5 + 4 + 11; P.io.out(0xFE, 0, P.T + t);
      t += 13 + 4 + b * 17 - 5 + 9 + 7 + 11; P.io.out(0xFE, P.io.r() & 0x10, P.T + t);
      let a = M[0x5D7B] + 3 & 255;
      M[0x5D7B] = a;
      t += 10 + 33 + 7 + 7 + 12;
      if (a >= 0xD2) { M[0x5D7B] = 0xD2; t += 7 + 13 + 12 - 5; }
    }
    P.spend(t);
    return { b: 0 };
  });
  // $8F79, $8F85, $8F91: an auto, aimed or snap shot, by its chance ($5DCD) and its price (B).
  P.def(0x8F79, 'autoOne', function* (r) { M[0x5DCD] = M[0x5DDF]; return yield* P.shoot({ b: M[0x5DE0], ix: r.ix }); });
  P.def(0x8F85, 'aimedShot', function* (r) { M[0x5DCD] = M[0x5DE3]; return yield* P.shoot({ b: M[0x5DE4], ix: r.ix }); });
  P.def(0x8F91, 'snapShot', function* (r) { M[0x5DCD] = M[0x5DE1]; return yield* P.shoot({ b: M[0x5DE2], ix: r.ix }); });
  // $8F9B: a shot: its price paid (payAP), a round of ammunition used; the range, the cursor kept,
  // the line from the crosshair, the chance (a miss moves the line's end), the flight and what it
  // hits, a pause, and the unit's points.
  P.def(0x8F9B, 'shoot', function* (r) {
    let ix = w(0x5D33);
    const p = yield* P.payAP({ b: r.b, ix });
    if (p.cf) return Object.assign({ ix }, p);
    const u = yield* P.ammoUse();
    if (u.zf) return u;
    P.clearFires();
    P.shotRange();
    P.saveCursor();
    P.shotFrom();
    P.shotStart();
    P.shotHit();
    yield* P.shotPath();
    yield* P.pause();
    return P.shotDone();
  });
  // $8FC3: a round from the weapon in the unit's hands (the scenario's object $17: its $04, and the
  // unit's $24). None: message $4E and Z.
  P.def(0x8FC3, 'ammoUse', function* () {
    const ix = w(0x5D33);
    const iy = P.carriedPtr({ a: M[ix + 0x17] }).iy;
    const a = M[iy + 4];
    if (a) {
      M[iy + 4] = a - 1;
      M[ix + 0x24] = M[ix + 0x24] - 1 & 255;
      return { ix, iy, a, zf: false };
    }
    yield* P.errorText({ a: 0x4E });
    return { ix, iy, a: 0, zf: true };
  });
  // $8FE2: the shot's range, sixteen times the weapon's $12, in $70AF.
  P.def(0x8FE2, 'shotRange', () => {
    const ix = w(0x5DC2);
    const hl = M[ix + 0x12] * 16;
    setw(0x70AF, hl);
    return { ix, hl };
  });
  // $8FF4: the cursor ($5DC7) and the view ($5DC5) kept.
  P.def(0x8FF4, 'saveCursor', () => {
    setw(0x5DC7, w(V.CURSOR_ROW));
    setw(0x5DC5, w(V.VIEW_ROW));
    return { hl: w(V.VIEW_ROW) };
  });
  // $9001: the line's end at the crosshair ($7095, $7097).
  P.def(0x9001, 'shotFrom', () => {
    P.crossPos();
    setw(0x7095, w(0x5DC9));
    setw(0x7097, w(0x5DCB));
    return { hl: w(0x5DCB) };
  });
  // $9011: the shot starts from the unit: the view as it was when fire mode began, the dot at the
  // unit's pixel ($5DBE, $5DBF), the view drawn and tile 0 over the unit's square, the trail
  // emptied and no dots yet ($70B1).
  P.def(0x9011, 'shotStart', () => {
    setw(V.VIEW_ROW, w(0x5DBC));
    M[0x7099] = M[0x5DBE];
    M[0x709B] = M[0x5DBF];
    P.drawView();
    const c = w(0x5DC0) << 1;
    setw(V.PRINT_ROW, ((c >> 8) + 1 & 255) << 8 | (c + 1 & 255));
    P.drawTile({ a: 0 });
    P.trailClear();
    setw(0x5DB2, 0x5B00);
    setw(0x70B1, 0);
    return { hl: 0 };
  });
  // $9043: the chance: a random number from 0 to 99 below it ($5DCD) is a hit, with C, and the line
  // stays. A miss by more moves the line's end ($7095, $7097), each way by up to the distance (the
  // longer of the two differences doubled, plus the shorter: $5DCE) times half the miss plus one
  // ($5DD0), over a random number (scatter).
  P.def(0x9043, 'shotHit', () => {
    M[0x5D9B] = 100;
    const a = P.random().a;
    if (a < M[0x5DCD]) return { a, cf: true };
    M[0x5DD4] = a - M[0x5DCD] + 1 & 255;
    const abs = (p, q) => { const d = w(p) - w(q); return d >= 0 ? d : w(q) - w(p); };
    setw(0x709D, abs(0x7091, 0x7095));
    setw(0x709F, abs(0x7093, 0x7097));
    const dx = w(0x709D), dy = w(0x709F);
    setw(0x5DCE, dy >= dx ? 2 * dy + dx : 2 * dx + dy);
    const b = (M[0x5DD4] >> 1) + 1;
    setw(0x5DD0, w(0x5DCE) * b);
    setw(0x5DD2, w(0x7095));
    setw(0x7095, P.scatter().hl);
    setw(0x5DD2, w(0x7097));
    const hl = P.scatter().hl;
    setw(0x7097, hl);
    return { hl, cf: false };
  });
  // $90E4: the shot flies (shotFlight); when it stops at something drawn, what is there is hit. A
  // weapon whose kind has bit 2 of its $00 set explodes ($91A2). Otherwise the sparks at the dot,
  // the damage of the weapon's $0F rolled (attackRoll), and on terrain the terrain broken, its
  // victory points and its fires, the views and the scenario's hook at $B627; on a unit the blow
  // ($9175). Then whether the game is over.
  P.def(0x90E4, 'shotPath', function* () {
    P.shotFlight();
    if (!M[0x5DA5]) return { a: 0, zf: true };
    setw(0xB716, 0xE65F);
    let ix = w(0x5DC2);
    if (M[ix] & 4) return yield* P.shotBlast({ ix });
    P.drawView();
    M[0x5DDA] = 0x10;
    M[0x5DDD] = 1;
    M[0x5DDE] = 0x15;
    M[0x5DDB] = M[0x709B];
    M[0x5DDC] = M[0x7099];
    P.sparks();
    P.shotSquare();
    ix = w(0x5DC2);
    M[0x5D98] = M[ix + 0x0F];
    P.attackRoll();
    setw(0xB716, 0xE65F);
    P.drawView();
    const a = M[w(0x5D3E)];
    if (a >= 0x8C) return yield* P.shotUnit({ a });
    P.breakTerrain({ iy: undefined });
    M[w(0x5D3E)] = M[0x5D27];
    P.scoreDamage();
    yield* P.run('spreadFires', {});
    ix = w(0x5D33);
    ix = ixOf(P.findSeen({ ix }), ix);
    ix = ixOf(P.showSeen({ ix }), ix);
    P.drawView();
    P.showSides();
    ix = ixOf(P.scenarioShot({ hl: w(0x5D3A), ix }), ix);
    setw(0x7093, w(0x5DD6));
    setw(0x7091, w(0x5DD8));
    return yield* P.checkEnd({ ix });
  });
  // $9175: a shot hits unit A: its record in $5D3C, the armour on the side it lands on, the hit
  // shown and the damage taken, the bottom line, the death of a unit left with no health, the view
  // and sound effect 3; then whether the game is over.
  P.def(0x9175, 'shotUnit', function* (r) {
    M[0x5D39] = r.a;
    setw(0x5D3C, P.unitPtr({ a: r.a }).ix);
    let ix = w(0x5D33);
    ix = ixOf(P.armourHit({ ix }), ix);
    P.hitShow();
    ix = ixOf(P.takeDamage({ ix }), ix);
    P.showSides();
    if (!M[ix + 8]) P.deathShow();
    P.drawView();
    P.sound({ a: 3 });
    return yield* P.checkEnd({ ix });
  });
  // $91A2: an explosive shot: the square where it bursts ($9A47 walks the line back from walls),
  // the blast there ($9696, $968E its strength the weapon's $0F), its fires, and whether the game
  // is over.
  P.def(0x91A2, 'shotBlast', function* (r) {
    P.shotSquare();
    const s = P.blastSquare({ ix: r.ix });
    const ix = ixOf(s, r.ix);
    setw(0x9694, w(0x5D3A));
    M[0x968E] = M[ix + 0x0F];
    yield* P.run('explode', { ix });
    yield* P.run('spreadFires', { ix });
    return yield* P.checkEnd({ ix });
  });
  // $91BE: after a shot: the unit's points ($5D35) and half the price ($6D4D, which payAP wrote)
  // added to its $22; the cursor and the view back. In a player's turn the view drawn, the
  // scenario's hook at $B627; a unit dead sets $5DE8. NZ unless it died.
  P.def(0x91BE, 'shotDone', () => {
    let ix = w(0x5D33);
    M[ix + 6] = M[0x5D35];
    M[ix + 0x22] = (M[0x6D4D] >> 1) + M[ix + 0x22] & 255;
    M[0x5D1A] = 0;
    setw(V.CURSOR_ROW, w(0x5DC7));
    setw(V.VIEW_ROW, w(0x5DC5));
    setw(0xB716, 0xE79F);
    if (M[0x5DF7]) return { ix, a: M[0x5DF7], zf: false };
    P.drawView();
    ix = ixOf(P.scenarioShot({ hl: w(0x5D24), ix }), ix);
    if (M[ix + 8]) return { ix, a: M[ix + 8], zf: false };
    M[0x5DE8] = 1;
    return { ix, a: 1, zf: false };
  });

  // $9232: option 0, auto fire: a burst along a line. Too few points for three rounds, message $14.
  // The first point under the crosshair and the second chosen (message $4F; outside the field of
  // view, message $67), each with the chance applied (shotHit); then the rounds (message $50, from
  // 3 to as many as the points pay for) and the burst ($9360).
  P.def(0x9232, 'autoFire', function* (r) {
    let ix = r.ix;
    M[0x5DCD] = M[0x5DDF];
    if (M[ix + 6] < (3 * M[0x5DE0] & 255)) return yield* P.errorText({ a: 0x14 });
    const u = yield* P.ammoUse();
    if (u.zf) return u;
    ix = u.ix;
    M[u.iy + 4] = M[u.iy + 4] + 1 & 255;
    M[ix + 0x24] = M[ix + 0x24] + 1 & 255;
    P.saveCursor();
    P.shotRange();
    P.drawCrosshair();
    P.shotFrom();
    P.shotHit();
    setw(0x5D80, w(0x7095));
    setw(0x5D7E, w(0x7097));
    P.clearInfo();
    P.infoText({ a: 0x4F });
    do {
      do yield* P.crosshairLoop(); while (M[0x5D2A] & 1);
    } while (P.crossSquare().zf);
    setw(0x5D47, w(0x5D24));
    ix = w(0x5D33);
    if (P.inView({ ix }).a) {
      P.drawView();
      yield* P.errorText({ a: 0x67 });
      P.fireInfo();
      M[0x5D1A] = 0;
      return { ix, a: 0 };
    }
    P.drawView();
    P.clearInfo();
    P.shotFrom();
    P.shotHit();
    setw(0x5D84, w(0x7095));
    setw(0x5D82, w(0x7097));
    P.infoText({ a: 0x50 });
    setw(0x5D89, 0x1A05);
    M[0x5D87] = 3;
    const b = M[0x5DE0];
    let a = M[ix + 6], c = 0;
    if (!b) throw new Error('autoFire: a price of 0, and the game would never return');
    while (a - b >= 0) { a -= b; c++; }
    M[0x5D88] = c + 1 & 255;
    yield* P.waitRelease();
    setw(V.ATTR, 0x4646);
    M[0x5D86] = 3;
    yield* P.chooseRounds();
    P.clearFires();
    return yield* P.burst({ ix });
  });
  // $92FB: choose the rounds ($5D86, shown at $5D89): one way (bit 1 of the controls) up, round from
  // the most ($5D88 less one) to 3 ($5D87); the other (bit 2) down, round the other way; fire takes
  // it, with sound effect 2.
  P.def(0x92FB, 'chooseRounds', function* () {
    for (;;) {
      setw(V.PRINT_ROW, w(0x5D89));
      M[0x5D09] = 8;
      P.printNumber({ a: M[0x5D86] });
      if (M[0x5D2A] !== 0xFF) P.sound({ a: 1 });
      let a;
      for (;;) {
        yield* P.repeatDelay();
        yield* P.readControls();
        a = M[0x5D2A];
        if (!(a & 1)) return P.sound({ a: 2 });
        if (!(a & 2) || !(a & 4)) break;
      }
      if (!(a & 2)) {
        const n = M[0x5D86] + 1 & 255;
        M[0x5D86] = n < M[0x5D88] ? n : M[0x5D87];
        continue;
      }
      if (M[0x5D86]) {
        const n = M[0x5D86] - 1;
        M[0x5D86] = n;
        if (n >= M[0x5D87]) continue;
      }
      M[0x5D86] = M[0x5D88] - 1 & 255;
    }
  });
  // $9360: the burst: each round its price paid and its ammunition used, the line's end moved along
  // from the first point ($5D80, $5D7E) to the second ($5D84, $5D82) by the round's share of the way
  // (div32, div32Round), and the shot's flight and what it hits. It stops when the points or the
  // rounds run out or the unit dies.
  P.def(0x9360, 'burst', function* (r) {
    let ix = r.ix;
    setw(0x5D79, 0);
    let d = w(0x5D82) - w(0x5D7E);
    if (d < 0) { d = w(0x5D7E) - w(0x5D82); M[0x5D79] = 1; }
    setw(0x5D73, d);
    d = w(0x5D84) - w(0x5D80);
    if (d < 0) { d = w(0x5D80) - w(0x5D84); M[0x5D7A] = 1; }
    setw(0x5D75, d);
    M[0x5D8B] = 0;
    for (let b = M[0x5D86] || 256; b; b--) {
      const p = yield* P.payAP({ b: M[0x5DE0], ix });
      if (p.cf) return P.shotDone();
      const u = yield* P.ammoUse();
      if (u.zf) return P.shotDone();
      const bc = P.div32({ a: M[0x5D86] - 1 & 255, b: M[0x5D8B] }).bc;
      setw(0x5D77, bc);
      let de = P.div32Round({ hl: w(0x5D73), bc }).de;
      setw(0x7097, (M[0x5D79] ? w(0x5D7E) - de : w(0x5D7E) + de) & 0xFFFF);
      de = P.div32Round({ hl: w(0x5D75), bc: w(0x5D77) }).de;
      setw(0x7095, (M[0x5D7A] ? w(0x5D80) - de : w(0x5D80) + de) & 0xFFFF);
      P.shotStart();
      yield* P.shotPath();
      ix = w(0x5D33);
      M[ix + 6] = M[0x5D35];
      M[0x5D16] = 0;
      setw(0xB716, 0xE79F);
      M[0x5D8B] = M[0x5D8B] + 1 & 255;
      if (!M[ix + 8]) break;
      setw(0x7093, w(0x5DD6));
      setw(0x7091, w(0x5DD8));
    }
    return P.shotDone();
  });

  // $9475: sparks: ($5DDA) of them from ($5DDB, $5DDC), in white on blue, each a cross of five dots
  // flipped off and on as it moves by its step in the table at $954E (four bytes: the steps down and
  // across, the place), and back to the start past $AC; ($5DDE) moves, each dot with a click from
  // the refresh register. Unless $5DDD is set, the view's colours fade every fourth move ($99B9) down
  // to $42.
  P.def(0x9475, 'sparks', () => {
    P.sound({ a: 8 });
    let iy = 0x954E;
    for (let b = M[0x5DDA] || 256; b; b--, iy += 4) { M[iy + 2] = M[0x5DDB]; M[iy + 3] = M[0x5DDC]; }
    setw(V.ATTR, 0x0447);
    M[0x5DA6] = 2;
    for (let b = M[0x5DDE] || 256; b; b--) {
      iy = 0x954E;
      for (let k = M[0x5DDA] || 256; k; k--, iy = iy + 4 & 0xFFFF) {
        M[0x5DA3] = M[iy + 2];
        M[0x5DA4] = M[iy + 3];
        P.sparkDot();
        let a = M[iy] + M[iy + 2] & 255, back = a >= 0xAC;
        if (!back) {
          M[iy + 2] = a; M[0x5DA3] = a;
          a = M[iy + 1] + M[iy + 3] & 255;
          back = a >= 0xAC;
          if (!back) { M[iy + 3] = a; M[0x5DA4] = a; P.sparkDot(); }
        }
        if (back) { M[iy + 2] = M[0x5DDB]; M[iy + 3] = M[0x5DDC]; }
        P.spend(200);
        P.io.out(0xFE, P.io.r() & 0x10, P.T);
      }
      if (M[0x5DDD] || M[V.ATTR] === 0x42) continue;
      M[V.ATTR2] = M[V.ATTR2] - 1 & 255;
      if (M[V.ATTR2]) continue;
      M[V.ATTR2] = 4;
      M[V.ATTR] = M[V.ATTR] - 1 & 255;
      P.fillView({ a: M[V.ATTR] });
    }
    return { b: 0 };
  });
  // $9525: a cross of five dots, flipped, round ($5DA3 + 1, $5DA4 + 1).
  P.def(0x9525, 'sparkDot', () => {
    M[0x5DA4]++; P.plot();
    M[0x5DA3]++; P.plot();
    M[0x5DA3]++; P.plot();
    M[0x5DA3]--; M[0x5DA4]--; P.plot();
    M[0x5DA4] += 2; return P.plot();
  });
  // $99B9: the view's colours, 22 by 22 from $5821, all A. BC is kept.
  P.def(0x99B9, 'fillView', r => {
    for (let y = 0; y < 22; y++) M.fill(r.a, 0x5821 + 32 * y, 0x5821 + 32 * y + 22);
    return { hl: 0x5821 + 32 * 22, de: 10, a: r.a };
  });
  // $9A16: NZ if another unit of the side whose turn it is ($B712) stands on the square $5D24 than
  // unit $5D26: a unit may not end its move on another's square.
  P.def(0x9A16, 'shared', () => {
    let hl = 0x5C50;
    for (let b = 20; b; b--, hl += 4) {
      if (M[hl] !== M[0xB712] || M[hl + 1] !== M[0x5D24] || M[hl + 2] !== M[0x5D25]) continue;
      if ((0xA0 - b & 255) === M[0x5D26]) continue;
      return { hl, a: 1, zf: false };
    }
    return { hl, a: 0, zf: true, b: 0 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
