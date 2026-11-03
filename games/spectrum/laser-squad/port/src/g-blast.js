// Explosions: the blast's strength spread from its centre along lines to the edges of a box of up
// to eleven squares a side, lessened by distance and by the terrain it passes; then every square
// of the box broken, its units hurt and its objects destroyed by the strength that reached it. A
// fire is a blast waiting in a list, set off after the blow that lit it.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.blast = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // $9696: a blast of strength ($968E) at ($9694, $9695). In the computer's turn its units are taken
  // off the map first. The view centred on it; the box five squares round it ($9690 to $9693,
  // inside the map) and the strength reaching each of its squares in a table of 11 x 11 from $5B00,
  // along a line from the centre to every square of the box's edge ($980E), the centre at full
  // strength. Then each square of the box takes its blow ($98AF); the view flashes and the sparks
  // fly ($9475), and whether the game is over.
  P.def(0x9696, 'explode', function* (r) {
    if (M[0x5DF7]) P.hideSide({ a: 1 });
    M[0xB714] = 1;
    const k24 = w(0x5D24), k91 = w(0x7091), k93 = w(0x7093);
    setw(0x5D24, w(0x9694));
    P.centreOn();
    M[0x5DDB] = ((M[0x9694] - M[V.VIEW_ROW]) << 4) + 8 & 255;
    M[0x5DDC] = ((M[0x9695] - M[V.VIEW_COL]) << 4) + 8 & 255;
    M[0x7092] = M[0x7094] = M[0x709A] = M[0x709C] = M[0x7096] = M[0x7098] = 0;
    M.fill(0, 0x5B00, 0x5B79);
    M[0x7093] = M[0x9694];
    M[0x9690] = M[0x9694] < 5 ? 0 : M[0x9694] - 5;
    M[0x9691] = M[0x9694] + 5 >= 0x32 ? 0x31 : M[0x9694] + 5;
    M[0x7091] = M[0x9695];
    M[0x9692] = M[0x9695] < 5 ? 0 : M[0x9695] - 5;
    M[0x9693] = M[0x9695] + 5 >= 0x50 ? 0x4F : M[0x9695] + 5;
    M[0x7097] = M[0x9690];
    do {
      M[0x7095] = M[0x9692]; P.blastRay();
      M[0x7095] = M[0x9693]; P.blastRay();
      M[0x7097] = M[0x7097] + 1 & 255;
    } while (M[0x9691] >= M[0x7097]);
    M[0x7095] = M[0x9692] + 1 & 255;
    do {
      M[0x7097] = M[0x9690]; P.blastRay();
      M[0x7097] = M[0x9691]; P.blastRay();
      M[0x7095] = M[0x7095] + 1 & 255;
    } while (M[0x7095] !== M[0x9693]);
    setw(0x5D3A, w(0x9694));
    M[P.cellAddr().hl] = M[0x968E];
    M[0x5D3A] = M[0x9690];
    M[0x5D3B] = M[0x9692];
    do {
      do {
        P.cellDamage();
        M[0x5D3B] = M[0x5D3B] + 1 & 255;
      } while (M[0x9693] >= M[0x5D3B]);
      M[0x5D3B] = M[0x9692];
      M[0x5D3A] = M[0x5D3A] + 1 & 255;
    } while (M[0x9691] >= M[0x5D3A]);
    P.sound({ a: 9 });
    for (let b = 3; b; b--) {
      P.fillView({ a: 0x47 }); P.playSound();
      P.fillView({ a: 0x78 }); P.playSound();
    }
    P.fillView({ a: 0x47 });
    M[0x5DDA] = (M[0x968E] >> 3) + 0x31 & 255;
    M[0x5DDD] = 0;
    M[0x5DDE] = 0x1A;
    P.sparks();
    P.sideView({ ix: r && r.ix });
    P.drawView();
    P.showSides();
    setw(0x7093, k93);
    setw(0x7091, k91);
    setw(0x5D24, k24);
    return yield* P.checkEnd(r);
  });
  // $980E: the blast along the line from its centre ($7091 across, $7093 down) to ($7095, $7097): at
  // each square ($5D3A) the strength left ($968F) is kept in the table where it is the most so far
  // ($9868), and the terrain there takes its toll; each step costs two sixteenths of the blast's
  // strength when straight and three when diagonal (the distance lineStep adds, $70B1), and the
  // line ends when nothing is left.
  P.def(0x980E, 'blastRay', () => {
    M[0x968F] = M[0x968E];
    M[0x7099] = M[0x7091];
    M[0x709B] = M[0x7093];
    P.lineSetup();
    for (;;) {
      if (M[0x7099] === M[0x7095] && M[0x709B] === M[0x7097]) return { zf: true };
      setw(0x70B1, 0);
      P.lineStep();
      M[0x5D3A] = M[0x709B];
      M[0x5D3B] = M[0x7099];
      P.blastCell();
      const c = M[0x968E] >> 4;
      let a = M[0x968F];
      for (let b = M[0x70B1] || 256; b; b--) {
        a -= c;
        if (a < 0) return { a: a & 255, cf: true };
      }
      M[0x968F] = a;
    }
  });
  // $9868: the strength left ($968F) kept at the square $5D3A of the table when it is the most so
  // far; then the square's terrain, and what it becomes when broken, each take off their $05.
  P.def(0x9868, 'blastCell', () => {
    const hl = P.cellAddr().hl;
    if (M[0x968F] >= M[hl]) M[hl] = M[0x968F];
    let a = P.floorAt().a, iy;
    for (;;) {
      iy = P.terrainPtr({ a }).iy;
      const s = M[0x968F] - M[iy + 5];
      if (s < 0) { M[0x968F] = 0; return { a: 0, iy }; }
      M[0x968F] = s;
      a = M[iy + 4];
      if (!a) return { a: 0, iy, zf: true };
    }
  });
  // $988F: HL = the place in the table from $5B00 of the square $5D3A: 11 to a row from the box's
  // corner ($9690, $9692).
  P.def(0x988F, 'cellAddr', () => {
    const e = 11 * (M[0x5D3A] - M[0x9690] & 255) + (M[0x5D3B] - M[0x9692] & 255) & 255;
    return { hl: 0x5B00 + e, de: e, a: e };
  });
  // $98AF: the blow of the strength in the table on the square $5D3A: the terrain broken
  // (breakTerrain) with its victory points, the map changed ($98AE what was there, $5D23 the floor);
  // the first unit standing there takes the blow (armourHit, takeDamage); every object lying there
  // is destroyed when the strength is at least its kind's $11. When an object stood on the map
  // there, the largest left (objectAt, $5D96) is put back on it.
  P.def(0x98AF, 'cellDamage', () => {
    const a = M[P.cellAddr().hl];
    M[0x5D98] = a;
    M[0x968F] = a;
    P.breakTerrain({});
    P.scoreDamage();
    const pos = w(0x5D3A);
    let hl = P.mapSquare({ d: pos >> 8, e: pos & 255 }).hl;
    setw(0x5D3E, hl);
    M[0x98AE] = M[hl];
    M[0x5D23] = M[0x5D27];
    M[hl] = M[0x5D27];
    let t = 0x5C50;
    for (let b = 20; b; b--, t += 4) {
      if (M[t] === 3 || M[t + 1] !== M[0x5D3A] || M[t + 2] !== M[0x5D3B]) continue;
      M[t + 3] = M[0x5D27];
      const n = 0xA0 - b & 255;
      M[0x5D39] = n;
      M[w(0x5D3E)] = n;
      const ix = P.unitPtr({ a: n }).ix;
      setw(0x5D3C, ix);
      M[ix + 0x16] = M[0x5D27];
      M[0x5D98] = M[0x968F];
      setw(0x5D24, w(0x5D3A));
      const s = P.armourHit({ ix });
      P.takeDamage({ ix: ixOf(s, ix) });
      break;
    }
    M[0x5D0E] = 0;
    let iy = w(0xB72A);
    for (let b = M[0xB639] || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (!M[iy] || M[iy + 5] || M[iy + 1] !== M[0x5D3A] || M[iy + 2] !== M[0x5D3B]) continue;
      M[0x5D0E] = 1;
      M[iy + 3] = M[0x5D27];
      const k = P.objectPtr({ a: M[iy] }).ix;
      if (M[0x968F] < M[k + 0x11]) continue;
      M[iy] = 0;
      hl = w(0x5D3E);
      if (M[hl] < 0x8C) M[hl] = M[0x5D27];
      else M[P.unitPtr({ a: M[hl] }).ix + 0x16] = M[0x5D27];
    }
    if (!M[0x5D0E]) return { a: 0, zf: true };
    if (M[0x98AE] < 0x6E) return { a: M[0x98AE], cf: true };
    P.objectAt({ hl: w(0x5D3A) });
    if (!M[0x5D8F]) return { a: 0, zf: true };
    hl = w(0x5D3E);
    if (M[hl] < 0x8C) { M[hl] = M[0x5D96]; return { a: M[0x5D96] }; }
    const ix = P.unitPtr({ a: M[hl] }).ix;
    M[ix + 0x16] = M[0x5D96];
    return { ix, a: M[0x5D96] };
  });
  // $99E8: the fires in the list at ($5DF1) set off one after another, each a blast of its strength
  // at its square, until an empty entry; the list's start wraps round at its $FF. $5CEF = $FF.
  P.def(0x99E8, 'spreadFires', function* (r) {
    for (;;) {
      M[0x5CEF] = 0xFF;
      let hl = w(0x5DF1);
      const a = M[hl];
      if (!a) return { a: 0, zf: true, ix: r && r.ix };
      M[0x968E] = a;
      M[hl] = 0;
      M[0x9694] = M[hl + 1];
      M[0x9695] = M[hl + 2];
      hl += 3;
      setw(0x5DF1, hl);
      if (M[hl] === 0xFF) setw(0x5DF1, 0x5CB3);
      yield* P.explode(r);
    }
  });
  // $9A47: where an explosive shot bursts: of the eight squares round the one it hit ($5D3A), the
  // nearest to the unit firing ($5D24) whose square's byte in the table at $D2FF has bit 1 clear,
  // which a blast is not stopped by; $5D3A and $5D3E then that square. None: the square hit.
  P.def(0x9A47, 'blastSquare', r => {
    setw(0xA5DA, w(0x5D24));
    setw(0xA5DC, w(0x5D3A));
    P.nearSquares();
    let hl = 0x5B00;
    for (let b = 8; b; b--) {
      if (M[hl] === 0xFF) { setw(0x5DFB, hl); return { a: 0xFF, zf: true, ix: r && r.ix }; }
      M[0xA5DC] = M[hl];
      M[0xA5DD] = M[hl + 1];
      hl += 3;
      setw(0x5DFB, hl);
      const de = w(0xA5DC);
      const sq = M[P.mapSquare({ d: de >> 8, e: de & 255 }).hl];
      if (!(M[0xD2FF + sq] & 2)) {
        setw(0x5D3A, de);
        setw(0x5D3E, P.mapSquare({ d: de >> 8, e: de & 255 }).hl);
        return { ix: r && r.ix };
      }
    }
    return { b: 0, ix: r && r.ix };
  });
  // $A550: A = the distance from ($A54B, $A54C) to ($A54D, $A54E): twice the larger difference plus
  // the smaller.
  P.def(0xA550, 'distance', () => {
    const abs = v => (v & 0x80 ? -v & 255 : v & 255);
    const dr = abs(M[0xA54B] - M[0xA54D]);
    M[0xA54F] = dr;
    const dc = abs(M[0xA54C] - M[0xA54E]);
    if (dc < dr) return { a: dc + 2 * dr & 255, hl: 0xA54F };
    return { a: 2 * dc + dr & 255, hl: 0xA54F };
  });
  // $A57A: the list from ($A578), three bytes an entry (row, column, distance), sorted by distance,
  // ($5DFD) + 1 entries, a bubble at a time from the end.
  P.def(0xA57A, 'sortNear', () => {
    const n = M[0x5DFD] || 256;
    for (let o = n; o; o--) {
      let hl = w(0xA578) + 3 * n + 2 & 0xFFFF;
      for (let k = n; k; k--, hl -= 3) {
        if (M[hl] >= M[hl - 3]) continue;
        for (let i = 0; i < 3; i++) { const c = M[hl - 3 - i]; M[hl - 3 - i] = M[hl - i]; M[hl - i] = c; }
      }
      setw(0x5DFB, hl);
    }
    return { b: 0 };
  });
  // $A5E0: the eight squares round ($A5DC), by the steps at $A5CA, listed from $5B00 with their
  // distance from ($A5DA) and sorted nearest first. A square off the map is three $FFs; the steps
  // are not moved on past it, so every square after it is off the map too.
  P.def(0xA5E0, 'nearSquares', () => {
    setw(0xA54B, w(0xA5DA));
    let out = 0x5B00, step = 0xA5CA;
    for (let b = 8; b; b--) {
      const r = M[0xA5DC] + M[step] & 255;
      let ok = r < 0x32;
      if (ok) {
        M[0xA54D] = r;
        const c = M[0xA5DD] + M[step + 1] & 255;
        ok = c < 0x50;
        if (ok) { M[0xA54E] = c; step += 2; }
      }
      if (ok) {
        M[out] = M[0xA54D]; M[out + 1] = M[0xA54E];
        M[out + 2] = P.distance().a;
      } else {
        M[out] = M[out + 1] = M[out + 2] = 0xFF;
      }
      out += 3;
    }
    setw(0xA5DE, step);
    setw(0x5DFB, out);
    M[0x5DFD] = 7;
    setw(0xA578, 0x5B00);
    return P.sortNear();
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
