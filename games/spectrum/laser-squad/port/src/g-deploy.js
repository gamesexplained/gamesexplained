// Before the game: the choice of one player or two and of the computer's level; the screen where
// a side spends its credits on armour and weapons; the placing of its units on its own squares of
// the map; and the units that arrive later, each on a square at random in its own patch.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.deploy = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const credits = () => 0xB6F8 + M[0xB712] & 0xFFFF;

  // $9D55: the side ($B712) equips its units. Its price list ($B685, or $B6A3 for the second side)
  // in $5DEE; its credits and message $58; its units listed; the armour table, and each unit's
  // armour chosen in turn; then the shop: the top line chooses a kind of object (left and right),
  // the units' lines below it buy one (right) or sell one back (left). Fire, then fire again, ends.
  P.def(0x9D55, 'deploy', function* () {
    P.clearScreen();
    setw(0x5DEE, M[0xB712] ? 0xB6A3 : 0xB685);
    P.infoText({ a: 0x58 });
    P.scenarioMessageAt({ hl: 0x0500, a: 0xA0 + M[0xB712] & 255 });
    P.payCredits({ a: 0 });
    P.listUnits();
    P.armourTable();
    yield* P.chooseArmour();
    P.emptyGrid();
    P.infoText({ a: 0x5B });
    M[0x5DED] = 0x6E;
    P.showKind();
    setw(0x5D2D, 0x5800);
    M[0x5D2B] = 0;
    P.lightLine();
    yield* P.waitRelease();
    for (;;) {
      yield* P.repeatDelay();
      yield* P.readControls();
      let a = M[0x5D2A];
      if (a & 1) {
        if (!(a & 2)) {
          P.lightLine();
          a = M[0x5D2B] - 1 & 255;
          if (a === 0xFF) a = M[0x5D2C];
          M[0x5D2B] = a;
          P.lightLine();
        } else if (!(a & 4)) {
          P.lightLine();
          a = M[0x5D2B] + 1 & 255;
          if (M[0x5D2C] < a) a = 0;
          M[0x5D2B] = a;
          P.lightLine();
        } else {
          if (!M[0x5D2B]) P.pickKind();
          if (M[0x5D2B]) P.buyOrSell();
        }
        continue;
      }
      P.lightLine();
      P.infoText({ a: 0x59 });
      yield* P.waitRelease();
      do yield* P.readControls(); while (M[0x5D2A] === 0xFF);
      if (!(M[0x5D2A] & 1)) return { a: M[0x5D2A], zf: true };
      P.infoText({ a: 0x5B });
      P.showKind();
      P.lightLine();
    }
  });
  // $9E27: pay A from the side's credits ($B6F8 + side), when they are enough: the credits left are
  // shown and the carry is set. Not enough: nothing paid, the carry clear.
  P.def(0x9E27, 'payCredits', r => {
    const b = r.a;
    setw(V.ATTR, 0x4747);
    M[0x5D09] = 8;
    const hl = credits();
    if (M[hl] < b) return { a: M[hl], b, cf: false, zf: M[hl] === 0 };
    M[hl] = M[hl] - b & 255;
    setw(V.PRINT_ROW, 0x1D00);
    P.printNumber({ a: M[hl] });
    return { b, cf: true };
  });
  // $9E50: the side's units, those whose flags at $B6E4 + number have the side's bit (1 or 2) and
  // that are in the game ($25 bit 7 clear), listed from $5B00, $5D2C counting them; each shown on a
  // line of its own, its name and its tile; and everything they carried taken from them.
  P.def(0x9E50, 'listUnits', () => {
    M[0x5D2B] = 0;
    M[0x5D2C] = 0;
    setw(0x5D2F, w(0x5D2C));
    let iy = 0x5B00;
    for (let b = 20, hl = 0xB6E4; b; b--, hl++) {
      if (!(M[0xB712] + 1 & M[hl])) continue;
      const a = 0xA0 - b;
      M[0x5D26] = a;
      const ix = P.unitPtr({ a }).ix;
      if (M[ix + 0x25] & 0x80) continue;
      M[iy++] = a;
      M[0x5D2C]++;
    }
    setw(0x5DEB, 0x0004);
    setw(0x5DE9, 0x5B00);
    for (let b = M[0x5D2C] || 256; b; b--) {
      const a = M[w(0x5DE9)];
      M[0x5D26] = a;
      setw(0x5DE9, w(0x5DE9) + 1);
      M[V.ATTR] = 0x46;
      P.panelLine({ a, hl: w(0x5DEB) });
      setw(V.PRINT_ROW, w(0x5DEB) + 0x0800);
      P.drawSquare({ a: M[0x5D26] });
      setw(0x5DEB, w(0x5DEB) + 2);
    }
    let ix;
    for (let b = M[0x5D2C] || 256, hl = 0x5B00; b; b--, hl++) {
      const a = M[hl];
      let iy2 = w(0xB72A);
      for (let k = M[0xB639] || 256; k; k--, iy2 = iy2 + 6 & 0xFFFF) {
        if (a === M[iy2 + 5]) { M[iy2] = 0; M[iy2 + 5] = 0; }
      }
      ix = P.unitPtr({ a }).ix;
      M[ix + 0x17] = 0;
      M[ix + 0x23] = 0;
      M[ix + 0x24] = 0;
    }
    return { ix };
  });
  // $9F0F: the armour table: message $5A, and the prices from $B6C8, seven to a column, four
  // columns, from row 9 and column $14 (the rows $0D and $10 skipped).
  P.def(0x9F0F, 'armourTable', () => {
    P.infoText({ a: 0x5A });
    M[V.ATTR] = 0x46;
    setw(0x5DEB, 0x1409);
    setw(0x5DE9, 0xB6C8);
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 7; k++) {
        const a = M[w(0x5DE9)];
        setw(0x5DE9, w(0x5DE9) + 1);
        setw(V.PRINT_ROW, w(0x5DEB));
        P.printNumber({ a });
        let row = M[0x5DEB] + 1 & 255;
        if (row === 0x0D) row++;
        if (row === 0x10) row++;
        M[0x5DEB] = row;
      }
      setw(0x5DEB, w(0x5DEB) + 0x02F7);
    }
    return {};
  });
  // $9F5E: each unit listed chooses its armour, 0 to 4, on its lit line: the armour's seven bytes
  // at $B6C1 + 7 x type give its front ($0D), left ($10), right ($0E) and rear ($0F) armour, its
  // $11 and its room to carry ($26), and the price, paid when the credits are enough. The armour is
  // the unit's even when they are not.
  P.def(0x9F5E, 'chooseArmour', function* () {
    setw(0x5D2D, 0x5840);
    setw(0x5D89, 0x0A04);
    setw(0x5DE9, 0x5B00);
    M[0x5D87] = 0;
    M[0x5D88] = 5;
    setw(V.ATTR, 0x4747);
    let ix;
    for (let b = M[0x5D2C] || 256; b; b--) {
      const a = M[w(0x5DE9)];
      setw(0x5DE9, w(0x5DE9) + 1);
      ix = P.unitPtr({ a }).ix;
      P.lightLine();
      M[0x5D86] = 0;
      yield* P.waitRelease();
      yield* P.chooseRounds();
      let hl = 0xB6C1 + 7 * M[0x5D86] & 0xFFFF;
      for (const k of [0x0D, 0x10, 0x0E, 0x0F, 0x11, 0x26]) M[ix + k] = M[hl++];
      P.payCredits({ a: M[hl] });
      M[0x5D89] = M[0x5D89] + 2 & 255;
      P.lightLine();
      M[0x5D2B]++;
    }
    return { ix };
  });
  // $9FE0: the objects the unit on line $5D2B carries, drawn along its row from column $0C, and the
  // rest of the row's ten squares blank; $5DF5 counts them.
  P.def(0x9FE0, 'unitObjects', () => {
    const e = M[0x5D2B] - 1 & 255;
    setw(V.PRINT_ROW, 0x0C04 + 2 * e);
    const iy = 0x5B00 + e;
    let ix = w(0xB72A);
    M[0x5DF5] = 0;
    for (let b = M[0xB639] || 256; b; b--, ix = ix + 6 & 0xFFFF) {
      if (M[ix + 5] !== M[iy]) continue;
      P.drawSquare({ a: M[ix] });
      M[V.PRINT_COL] = M[V.PRINT_COL] + 2 & 255;
      M[0x5DF5]++;
    }
    while (M[V.PRINT_COL] !== 0x20) {
      P.drawTile({ a: 0 });
      M[V.PRINT_COL] = M[V.PRINT_COL] + 2 & 255;
    }
    return { ix, iy };
  });
  // $A038: ten rows of ten blank squares from row 4, column $0C, where the units' objects go.
  P.def(0xA038, 'emptyGrid', () => {
    setw(V.PRINT_ROW, 0x0C04);
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        P.drawTile({ a: 0 });
        M[V.PRINT_COL] = M[V.PRINT_COL] + 2 & 255;
      }
      M[V.PRINT_COL] = 0x0C;
      M[V.PRINT_ROW] = M[V.PRINT_ROW] + 2 & 255;
    }
    return { b: 0 };
  });
  // $A064: on the top line, right ($5D2A bit 3) goes on to the next kind of object the side may buy
  // ($6E to $8B, round), left (bit 4) back to the one before; kinds whose price is $FF are passed
  // over. The new kind is shown.
  const nextKind = d => {
    let a;
    do {
      a = M[0x5DED] + d & 255;
      if (a === 0x8C) a = 0x6E;
      if (a === 0x6D) a = 0x8B;
      M[0x5DED] = a;
    } while (P.kindPrice({ a }).zf);
    return P.showKind();
  };
  P.def(0xA064, 'pickKind', () => {
    if (!(M[0x5D2A] & 8)) return nextKind(1);
    if (M[0x5D2A] & 16) return { a: M[0x5D2A], zf: false };
    return nextKind(-1);
  });
  // $A09A: the price of kind A for the side, from its list at ($5DEE), in $5DF0; Z for $FF, a kind
  // it may not buy.
  P.def(0xA09A, 'kindPrice', r => {
    const e = r.a - 0x6E & 255;
    const hl = w(0x5DEE) + e & 0xFFFF;
    const a = M[hl];
    M[0x5DF0] = a;
    return { a, e, d: 0, hl, zf: a === 0xFF, cf: false };
  });
  // $A0AA: the kind on offer ($5DED): its tile, its name and its price.
  P.def(0xA0AA, 'showKind', () => {
    setw(V.PRINT_ROW, 0x0A02);
    P.drawSquare({ a: M[0x5DED] });
    setw(V.ATTR, 0x4646);
    P.panelLine({ a: M[0x5DED], hl: 0x0D02 });
    M[0x5D09] = 8;
    P.kindPrice({ a: M[0x5DED] });
    setw(V.PRINT_ROW, 0x1D02);
    return P.printNumber({ a: M[0x5DF0] });
  });
  // $A0DD: on a unit's line, right buys it one of the kind on offer, left sells one back.
  P.def(0xA0DD, 'buyOrSell', () => {
    let r = {};
    if (!(M[0x5D2A] & 8)) r = P.buy();
    if (!(M[0x5D2A] & 16)) r = P.sellBack();
    return r;
  });
  // $A0EE: buy one of the kind on offer for the unit on the line, if it carries fewer than ten
  // things; if half the weight it would carry, plus ten, is less than its strength ($14) (message
  // $5C if not); and if the size it would carry is less than its armour's room ($26) (message $5D
  // if not). The object takes a free entry of the list, short of its last sixteen, when the credits
  // pay for it: a timed explosive's fuse set to $FF (off), a weapon's ammunition from its kind's
  // $10, or from its clip's kind ($10 another kind) when its $00 has bit 1.
  P.def(0xA0EE, 'buy', () => {
    P.unitObjects();
    if (M[0x5DF5] === 10) return { a: 10, zf: true };
    P.lineUnit();
    let ix = P.unitPtr({ a: M[0x5D26] }).ix;
    setw(0x5D33, ix);
    P.carriedLoad({ ix });
    ix = P.objectPtr({ a: M[0x5DED] }).ix;
    const iy0 = w(0x5D33);
    let msg = 0;
    let a = M[ix + 1] + M[0x5D91];
    if (a > 255 || (a >> 1) + 10 >= M[iy0 + 0x14]) msg = 0x5C;
    else {
      a = M[ix + 2] + M[0x5D92];
      if (a > 255 || a >= M[iy0 + 0x26]) msg = 0x5D;
    }
    if (msg) {
      P.infoText({ a: msg });
      P.sound({ a: 0x0B });
      P.infoText({ a: 0x5B });
      return P.showKind();
    }
    P.lineUnit();
    let iy = w(0xB72A);
    for (let b = M[0xB639] - 0x10 & 255 || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (M[iy]) continue;
      if (P.payCredits({ a: M[0x5DF0] }).cf) {
        M[iy + 5] = M[0x5D26];
        M[iy] = M[0x5DED];
        M[iy + 4] = 0;
        ix = P.objectPtr({ a: M[0x5DED] }).ix;
        if (M[ix] & 8) M[iy + 4] = 0xFF;
        if (M[ix] & 0x20) M[iy + 4] = M[ix + 0x10];
        if (M[ix] & 2) { ix = P.objectPtr({ a: M[ix + 0x10] }).ix; M[iy + 4] = M[ix + 0x10]; }
      }
      P.unitObjects();
      return P.sound({ a: 2 });
    }
    return { b: 0 };
  });
  // $A1B7: $5D26 = the unit on line $5D2B.
  P.def(0xA1B7, 'lineUnit', () => {
    const e = M[0x5D2B] - 1 & 255;
    const a = M[0x5B00 + e];
    M[0x5D26] = a;
    return { a, e, d: 0, hl: 0x5B00 + e };
  });
  // $A1C7: sell back one object of the kind on offer that the unit on the line carries: its entry
  // freed and its price ($5DF0) given back.
  P.def(0xA1C7, 'sellBack', () => {
    P.lineUnit();
    let iy = w(0xB72A);
    for (let b = M[0xB639] || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (M[0x5D26] !== M[iy + 5] || M[0x5DED] !== M[iy]) continue;
      M[iy + 5] = 0;
      M[iy] = 0;
      const hl = credits();
      M[hl] = M[hl] + M[0x5DF0] & 255;
      P.payCredits({ a: 0 });
      P.unitObjects();
      return P.sound({ a: 1 });
    }
    return { b: 0 };
  });
  // $A211: one player or two (message $5E). Two: the units of mode 1 play. One, against the
  // computer: its level, 1 to ($B684) (message $5F), which sets the computer's skill ($5DF8, from
  // $B655) and the first side's credits ($B6F8, from $B6FA); the units of mode level + 1 play, and
  // $B706 says the computer has the second side.
  P.def(0xA211, 'chooseGame', function* () {
    P.clearScreen();
    M[0x5DF7] = 0;
    P.infoText({ a: 0x5E });
    M[0x5DF6] = 2;
    yield* P.waitRelease();
    const a = (yield* P.menuChoice()).a;
    if (a !== 1) return P.gameMode({ a: 1 });
    P.clearScreen();
    M[0x5DF6] = M[0xB684];
    setw(V.PRINT_ROW, 0x130C);
    P.printNumber({ a: M[0xB684] });
    P.infoText({ a: 0x5F });
    yield* P.waitRelease();
    const b = (yield* P.menuChoice()).a;
    const e = b - 1 & 255;
    M[0x5DF8] = M[0xB655 + e];
    M[0xB6F8] = M[0xB6FA + e];
    P.gameMode({ a: b + 1 & 255 });
    M[0xB706] = 1;
    return { a: 1 };
  });
  // $A26F, $A276: a choice from the menu on the screen: a number key, 1 to ($5DF6), gives 1 to
  // ($5DF6), the keys as KEY-SCAN numbers them listed at $A2B3; from $A26F fire gives 0 as well.
  // Sound effect 0; Z for 0.
  function* choice(fire) {
    M[0x5DF9] = fire ? 0 : 1;
    yield* P.waitRelease();
    for (;;) {
      if (!M[0x5DF9]) {
        yield* P.readControls();
        if (!(M[0x5D2A] & 1)) { P.sound({ a: 0 }); return { a: 0, zf: true }; }
      }
      const k = yield* P.keyScan();
      if (k.e === 0xFF) continue;
      let n = 0;
      for (let b = M[0x5DF6] || 256; b && M[0xA2B3 + n & 0xFFFF] !== k.e; b--) n++;
      if (n >= (M[0x5DF6] || 256)) continue;
      P.sound({ a: 0 });
      return { a: n + 1 & 255, zf: !(n + 1 & 255) };
    }
  }
  P.def(0xA26F, 'menuFireChoice', function* () { return yield* choice(true); });
  P.def(0xA276, 'menuChoice', function* () { return yield* choice(false); });
  // $A2BA: the units that do not play in mode A (bit A - 1 of their byte at $B670 clear) are taken
  // out of the game ($25 bit 7).
  P.def(0xA2BA, 'gameMode', r => {
    M[0x5DFA] = 1 << (r.a - 1) & 255;
    M[0x5D26] = 0x8C;
    for (let b = 20, hl = 0xB670; b; b--, hl++) {
      if (!(M[hl] & M[0x5DFA])) {
        const ix = P.unitPtr({ a: M[0x5D26] }).ix;
        M[ix + 0x25] |= 0x80;
      }
      M[0x5D26]++;
    }
    return { b: 0 };
  });
  // $A2EE: the units in the game whose turn to arrive ($1C) is this one ($B711) come on: each on a
  // square at random in its patch, rows $1D plus 0 to $1E less one and columns $1F plus 0 to $20
  // less one, where no unit stands and the terrain lets it walk.
  P.def(0xA2EE, 'arrivals', () => {
    for (M[0x5D26] = 0x8C; M[0x5D26] !== 0xA0; M[0x5D26]++) {
      const ix = P.unitPtr({ a: M[0x5D26] }).ix;
      if (M[ix + 0x25] & 0x80) continue;
      if (M[ix + 0x1C] !== M[0xB711]) continue;
      for (;;) {
        M[0x5D9B] = M[ix + 0x1E];
        M[0x5D24] = P.random({ ix }).a + M[ix + 0x1D] & 255;
        M[0x5D9B] = M[ix + 0x20];
        M[0x5D25] = P.random({ ix }).a + M[ix + 0x1F] & 255;
        const hl = P.mapSquare({ e: M[0x5D24], d: M[0x5D25] }).hl;
        setw(0x5D2F, hl);
        const a = M[hl];
        if (a >= 0x8C) continue;
        M[ix + 0x16] = a;
        setw(0x5D3A, w(0x5D24));
        const iy = P.terrainPtr({ a: P.floorAt().a }).iy;
        if (M[iy + M[ix + 4] & 0xFFFF] === 0xFF) continue;
        M[w(0x5D2F)] = M[0x5D26];
        P.setUnitTile({ ix });
        P.placeUnit({ ix, a: M[0x5D26] });
        break;
      }
    }
    return { a: 0xA0 };
  });
  // $A370: the side places its units, each that it may place (bit 2 of its flags at $B6E4) and
  // that is in the game: message $60, the side's number, the unit's name and what it carries; the
  // cursor until fire on one of the side's own squares, which the table at $B65E lists (the code
  // on the map, the side, and the floor it becomes under the unit). $A36F is set meanwhile. Then
  // the side's squares left are made their floor again ($A474).
  P.def(0xA370, 'placeUnits', function* () {
    P.clearScreen();
    M[0xA36F] = 1;
    setw(V.VIEW_ROW, 0x2314);
    setw(V.CURSOR_ROW, 0x0505);
    for (M[0x5D26] = 0x8C; M[0x5D26] !== 0xA0; M[0x5D26]++) {
      if (!(M[0xB6E4 + (M[0x5D26] - 0x8C)] & 4)) continue;
      let ix = P.unitPtr({ a: M[0x5D26] }).ix;
      if ((M[ix + 0x25] & 1) !== M[0xB712]) continue;
      if (M[ix + 0x25] & 0x80) continue;
      P.clearInfo();
      P.infoText({ a: 0x60 });
      setw(V.ATTR, 0x4747);
      setw(V.PRINT_ROW, 0x1F00);
      P.printCharDouble({ a: 0x31 + M[0xB712] & 255 });
      P.scenarioTextAt({ hl: 0x1804, a: M[0x5D26] });
      setw(V.PRINT_ROW, 0x190B);
      P.listCarried({ ix });
      for (let b = M[0x5D8F], hl = 0x5B7A; b; b--, hl += 3) {
        P.drawSquare({ a: M[hl] });
        M[V.PRINT_COL] = M[V.PRINT_COL] + 3 & 255;
        if (M[V.PRINT_COL] === 0x1F) {
          M[V.PRINT_COL] = 0x19;
          M[V.PRINT_ROW] = M[V.PRINT_ROW] + 2 & 255;
        }
      }
      P.drawView();
      P.showSides();
      for (;;) {
        do yield* P.cursorStep(); while (M[0x5D2A] & 1);
        P.cursorSquare();
        const hl = P.mapSquare({ e: M[0x5D24], d: M[0x5D25] }).hl;
        setw(0x5D2F, hl);
        const c = M[hl];
        let e = -1;
        for (let k = 0; k < 6; k++) if (M[0xB65E + 3 * k] === c && M[0xB65F + 3 * k] === M[0xB712]) { e = k; break; }
        if (e < 0) continue;
        ix = P.unitPtr({ a: M[0x5D26] }).ix;
        M[ix + 0x16] = M[0xB660 + 3 * e];
        M[ix + 0x1C] = 0xFF;
        M[w(0x5D2F)] = M[0x5D26];
        P.drawView();
        P.sound({ a: 6 });
        break;
      }
    }
    M[0xA36F] = 0;
    return P.clearDeploy();
  });
  // $A474: every square of the map that is one of the side's own for placing units becomes its
  // floor.
  P.def(0xA474, 'clearDeploy', () => {
    for (let hl = 0xD6BF; hl !== 0xE65F; hl++) {
      const c = M[hl];
      for (let k = 0; k < 6; k++) {
        const iy = 0xB65E + 3 * k;
        if (M[iy] === c && M[iy + 1] === M[0xB712]) { M[hl] = M[iy + 2]; break; }
      }
    }
    return { hl: 0xE65F, zf: true };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
