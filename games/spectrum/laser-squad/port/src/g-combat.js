// Close combat: a unit attacking the unit or the terrain in front of it, the chance and the damage,
// a unit's death and what it does to both sides' morale, and the end of the game.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.combat = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // $7F0B: close combat against the terrain in front ($5D29 is 1): the attack's strength and its
  // price (attackStats; too few points, message $2D), the damage rolled, the terrain broken by it
  // ($8030) and the square drawn again, victory points for the damage ($9201), the fires it starts
  // ($99E8), and then the view centred on the unit, the enemies it sees, the reactions to it and
  // whether the game is over. NZ while the unit can go on.
  P.def(0x7F0B, 'attackTerrain', function* (r) {
    let ix = r.ix;
    if (!M[0x5D36]) P.eraseCursor();
    const s = P.attackStats({ ix });
    ix = ixOf(s, ix);
    if (s.cf) return yield* P.noPoints({ ix });
    P.attackRoll();
    P.clearFires();
    P.breakTerrain({ iy: s.iy });
    if (!M[0x5D36]) P.blowShow();
    const pos = w(0x5D3A);
    M[P.mapSquare({ d: pos >> 8, e: pos & 255 }).hl] = M[0x5D27];
    P.scoreDamage();
    if (!M[0x5D36]) P.drawView();
    ix = ixOf(yield* P.run('spreadFires', { ix }), ix);
    setw(V.VIEW_ROW, w(0x5D24));
    setw(V.CURSOR_ROW, 0);
    P.centreOnUnit();
    ix = w(0x5D33);
    M[ix + 6] = M[0x5D35];
    ix = ixOf(P.findSeen({ ix }), ix);
    ix = ixOf(P.showSeen({ ix }), ix);
    ix = ixOf(P.unitPanel(), ix);
    ix = ixOf(yield* P.startReaction({ ix }), ix);
    ix = ixOf(yield* P.checkEnd({ ix }), ix);
    if (!M[ix + 6]) return { ix, a: 0, zf: true };
    if (!M[ix + 8]) return { ix, a: 0, zf: true };
    return { ix, a: 1, zf: false };
  });
  // $7F75: too few action points for the attack: message $2D, the unit's numbers again, and $5D37
  // set. NZ.
  P.def(0x7F75, 'noPoints', function* (r) {
    yield* P.errorText({ a: 0x2D });
    const s = P.unitStats();
    M[0x5D37] = 1;
    return { ix: ixOf(s, r.ix), a: 1, zf: false };
  });
  // $7F84: PRINT_ROW and PRINT_COL = the screen's place of the map's square ($5D3A) in the view.
  P.def(0x7F84, 'targetPos', () => {
    const view = w(V.VIEW_ROW);
    const d = w(0x5D3A) - view & 0xFFFF;
    const h = (d >> 7 & 0x1FE) + 1 & 255, l = (d << 1 & 0xFE) + 1 & 255;
    const hl = h << 8 | l;
    setw(V.PRINT_ROW, hl);
    return { hl, h, l, de: view, zf: false };
  });
  // $7F98: the blow on the screen: sound effect 9, and over the square in front the tiles listed
  // from the scenario's $B64E to $FF, in white on black, each with the sound played; then the
  // square drawn again.
  P.def(0x7F98, 'blowShow', () => {
    P.sound({ a: 9 });
    P.targetPos();
    M[V.ATTR] = 0x47;
    for (let hl = 0xB64E; M[hl] !== 0xFF; hl++) {
      P.drawTile({ a: M[hl] });
      P.playSound();
    }
    return P.drawSquare({ a: M[w(0x5D3E)] });
  });
  // $7FC1: the attack's strength in $5D98 and its skill in $5D97, and its price in action points in
  // $5D9A, the most action points ($05) over a divisor, rounded. With an object in its hands whose
  // kind ($23) has bit 0 of its $00 set, a weapon for close combat: the divisor is the kind's $04,
  // the strength its $06 plus the unit's strength ($14) over its $07, the skill its $05 plus the
  // unit's $15 over its $08. Bare-handed: the divisor 5, the strength the unit's $13, the skill
  // twice its $15. $5D35 = the points left after; C if they would run out.
  P.def(0x7FC1, 'attackStats', r => {
    let ix = r.ix, iy = r.iy;
    let armed = false;
    if (M[ix + 0x17]) {
      const k = P.objectPtr({ a: M[ix + 0x23] }).ix;
      if (M[k] & 1) {
        armed = true;
        M[0x5D9A] = M[k + 4];
        iy = w(0x5D33);
        let q = P.divRound({ a: M[iy + 0x14], b: M[k + 7] });
        M[0x5D98] = M[k + 6] + q.c & 255;
        q = P.divRound({ a: M[iy + 0x15], b: M[k + 8] });
        M[0x5D97] = M[k + 5] + q.c & 255;
      }
    }
    ix = w(0x5D33);
    if (!armed) {
      M[0x5D9A] = 5;
      M[0x5D98] = M[ix + 0x13];
      M[0x5D97] = M[ix + 0x15] << 1 & 255;
    }
    const c = P.divRound({ a: M[ix + 5], b: M[0x5D9A] }).c;
    M[0x5D9A] = c;
    const a = M[ix + 6] - c;
    M[0x5D35] = a & 255;
    const out = { ix, a: a & 255, c, cf: a < 0, zf: (a & 255) === 0 };
    if (iy !== undefined) out.iy = iy;
    return out;
  });
  // $8030: the terrain at ($5D3A) broken by a blow of strength $5D98: while the blow left ($5D99)
  // is at least the terrain's $03, it becomes the terrain's $04, its $07 is added to the damage done
  // ($5D8C), and the blow loses the terrain's $05. Terrain whose $08 is 7 catches fire: its $09
  // and the square go in the next free entry of the list of fires from $5CB3, at ($5DF3), which
  // wraps round at the $FF that ends it. $5D27 is the terrain left.
  P.def(0x8030, 'breakTerrain', r => {
    M[0x5D99] = M[0x5D98];
    M[0x5D8C] = 0;
    M[0x5D27] = P.floorAt().a;
    let iy = r.iy;
    for (;;) {
      const t = M[0x5D27];
      if (!t) return { a: 0, iy, zf: true, cf: false };
      iy = P.terrainPtr({ a: t }).iy;
      if (M[0x5D99] < M[iy + 3]) return { a: M[0x5D99], iy, zf: false, cf: true };
      M[0x5D8C] = M[0x5D8C] + M[iy + 7] & 255;
      M[0x5D27] = M[iy + 4];
      if (M[iy + 8] === 7) {
        let hl = w(0x5DF3);
        if (!M[hl]) {
          M[hl] = M[iy + 9];
          M[hl + 1] = M[0x5D3A];
          M[hl + 2] = M[0x5D3B];
          hl += 3;
          setw(0x5DF3, hl);
          if (M[hl] === 0xFF) setw(0x5DF3, 0x5CB3);
        }
      }
      const a = M[0x5D99] - M[iy + 5];
      if (a < 0) return { a: a & 255, iy, zf: false, cf: true };
      M[0x5D99] = a;
    }
  });
  // $8095: the damage of the blow: a random number below the strength ($5D98) plus one, plus half
  // the strength; at most $FF.
  P.def(0x8095, 'attackRoll', () => {
    M[0x5D9B] = M[0x5D98] + 1 & 255;
    const a = P.random().a + (M[0x5D98] >> 1);
    M[0x5D98] = a > 255 ? 0xFF : a;
    return { hl: 0x5D98, a: a > 255 ? 0xFF : a };
  });
  // $80B1: A = a random number below ($5D9B): the refresh register, plus the byte at ($5D9D),
  // which moves on a byte each try, plus $5D9C, the turns of the waits for a key; tried again until
  // it is below. HL is kept. With ($5D9B) 0 the game returns to the address in HL (a fault the
  // game never meets: the limits it gives are 1 and more).
  // The byte walks all of memory, the stack ($5E00-$5E38) too, whose bytes the port does not
  // keep: it reads those through P.io.irqByte, which the tests give as the game read them, and
  // which on the page is noise like the refresh register. The page carries none of the game's
  // code and no ROM, which the walk reads as well: it reads every byte through P.io.walkByte,
  // which gives noise for those (runtime.js), where the tests have none.
  const STACK_LO = 0x5E00, STACK_HI = 0x5E38;
  P.def(0x80B1, 'random', r => {
    const lim = M[0x5D9B];
    if (!lim) throw new Error('random: limit 0, and the game would return to HL');
    for (;;) {
      let a = P.io.r() & 255;
      const hl = w(0x5D9D) + 1 & 0xFFFF;
      setw(0x5D9D, hl);
      const b = hl >= STACK_LO && hl <= STACK_HI && P.io.irqByte ? P.io.irqByte(hl) : P.io.walkByte ? P.io.walkByte(hl) : M[hl];
      a = a + b + M[0x5D9C] & 255;
      if (a < lim) return { a, cf: true, zf: false, hl: r && r.hl };
    }
  });

  // $80CD: close combat against the enemy in front ($5D29 is 0, $5D3C its record): the attack's
  // strength and price (attackStats; too few points, message $2D) and the damage rolled; the blow
  // drawn; the readout: message $3E, the weapon's name (message $3F bare-handed), the chance
  // (armourHit, then the defender's $15 taken off the skill, halved for a blow from the side and
  // quartered from behind) with a '%', the points it costs, and the side it lands on (message $40
  // + $5D9F). A random number from 0 to 99 below the chance is a hit: the damage after the armour
  // ($8371 shows it, $81FB takes it off), and the views and the bottom line again, the death of a
  // defender left with nothing ($83A6), sound effect 3. Otherwise message $44, a miss. Then a
  // pause, the points paid, and whether the game is over.
  P.def(0x80CD, 'closeCombat', function* (r) {
    let ix = r.ix;
    P.eraseCursor();
    const s = P.attackStats({ ix });
    ix = ixOf(s, ix);
    if (s.cf) return yield* P.noPoints({ ix });
    P.attackRoll();
    P.blowShow();
    P.clearInfo();
    P.text({ a: 0x3E });
    setw(0x5D05, 0x1801);
    const held = M[ix + 0x23];
    if (held && M[P.objectPtr({ a: held }).ix] & 1) {
      ix = w(0x5D33);
      P.scenarioTextAt({ hl: 0x1801, a: M[ix + 0x23] });
    } else {
      P.infoText({ a: 0x3F });
    }
    ix = w(0x5D33);
    ix = ixOf(P.armourHit({ ix }), ix);
    let b = M[ix + 0x15];
    if (M[0x5D9F]) { b >>= 1; if (M[0x5D9F] === 2) b >>= 1; }
    let a = M[0x5D97] - b;
    if (a < 0) a = 0;
    M[0x5D97] = a;
    P.printPercent({ a, hl: 0x1807 });
    setw(V.PRINT_ROW, 0x180B);
    P.printNumber({ a: M[0x5D9A] });
    setw(0x5D05, 0x1814);
    P.infoText({ a: M[0x5D9F] + 0x40 & 255 });
    setw(V.PRINT_ROW, 0x180F);
    setw(0x5D05, 0x180F);
    M[0x5D9B] = 100;
    if (P.random().a >= M[0x5D97]) {
      P.infoText({ a: 0x44 });
    } else {
      P.printNumber({ a: M[0x5D98] });
      P.hitShow();
      ix = ixOf(P.takeDamage({ ix }), ix);
      ix = ixOf(P.findSeen({ ix }), ix);
      P.showSides();
      if (!M[ix + 8]) P.deathShow();
      P.drawView();
      P.sound({ a: 3 });
    }
    yield* P.pause();
    ix = w(0x5D33);
    M[ix + 6] = M[0x5D35];
    P.stillAble({ ix });
    return yield* P.checkEnd({ ix });
  });
  // $81A2: the blow against the defender ($5D3C): the floor it stands on ($5D3A) takes its $06 off
  // the strength (below nothing: no damage); the side of the defender it lands on, $5D9F (inView
  // from the attacker's square, $5D24: 0 the front, 1 the right, 2 behind, 3 the left), and the
  // defender's armour on that side ($0D + $5D9F) takes off its value, and loses half of what is left; the damage is at
  // most the defender's health ($08). IX = the defender, but when the floor stops it all.
  P.def(0x81A2, 'armourHit', r => {
    const t = P.terrainPtr({ a: P.floorAt().a }).iy;
    let a = M[0x5D98] - M[t + 6];
    if (a < 0) { M[0x5D98] = 0; return { ix: r.ix, iy: t, a: 0 }; }
    M[0x5D98] = a;
    setw(0x5D49, w(0x5D24));
    setw(0x5D47, w(0x5D3A));
    const ix = w(0x5D3C);
    const side = P.inView({ ix }).a;
    M[0x5D9F] = side;
    const hl = ix + 0x0D + side & 0xFFFF;
    a = M[0x5D98] - M[hl];
    M[0x5D98] = a & 255;
    if (a < 0) { M[0x5D98] = 0; return { ix, iy: t, a: 0 }; }
    if (!a) return { ix, iy: t, a: 0, zf: true };
    const lose = a >> 1;
    M[hl] = M[hl] < lose ? 0 : M[hl] - lose;
    if (M[ix + 8] >= M[0x5D98]) return { ix, iy: t };
    M[0x5D98] = M[ix + 8];
    return { ix, iy: t, a: M[ix + 8] };
  });
  // $81FB: the damage ($5D98) off the health ($08) of the unit at IX. Left with none it dies
  // ($8229). The code after was to take morale ($0C) from a unit hurt and in play, its morale over
  // its most health ($07) over the damage, but it is never reached.
  P.def(0x81FB, 'takeDamage', r => {
    const ix = r.ix;
    const a = M[ix + 8] - M[0x5D98] & 255;
    M[ix + 8] = a;
    if (!a) return P.unitDies({ ix });
    const d = M[0x5D98];
    if (!d) return { ix, a: 0, zf: true };
    // BIT 4,(IX+$25) then OR A: the OR sets the flags again by the damage, never 0 here, so the
    // RET NZ is always taken and the morale loss after it ($8213) never runs.
    return { ix, a: d, zf: false };
  });
  // $8229: the unit at IX ($5D39 its number) dies: off the table of units, what it carries left on
  // its square ($5D3A, with the floor in $5D23) and destroyed if its $25 has bit 3 set; its square
  // becomes its body ($03), which is added to the scenario's objects; the other side scores its
  // $27 in victory points; morale moves on both sides by its $01 ($829E); and $98AE = $6E.
  P.def(0x8229, 'unitDies', r => {
    const ix = r.ix;
    M[0x5C50 + 4 * (M[0x5D39] - 0x8C & 255) & 0xFFFF] = 3;
    let iy = w(0xB72A);
    for (let b = M[0xB639] || 256; b; b--, iy = iy + 6 & 0xFFFF) {
      if (M[0x5D39] !== M[iy + 5]) continue;
      M[iy + 1] = M[0x5D3A];
      M[iy + 2] = M[0x5D3B];
      M[iy + 3] = M[0x5D23];
      M[iy + 5] = 0;
      if (M[ix + 0x25] & 8) M[iy] = 0;
    }
    M[w(0x5D3E)] = M[ix + 3];
    P.addObject({ a: M[ix + 3], c: 0 });
    const side = (M[ix + 0x25] & 1) ^ 1;
    M[0x5DA0] = side;
    M[0xB70F + side] = M[0xB70F + side] + M[ix + 0x27] & 255;
    P.moraleShock({ a: M[ix + 1], ix });
    M[0x98AE] = 0x6E;
    return { ix, iy, a: 0x6E };
  });
  // $829E: morale after a death: every unit in play ($25 bit 4 clear) of side $5DA0 gains A
  // ($5DA1) of morale ($0C), up to its most ($0B); every one of the other side loses as much.
  // IX is kept.
  P.def(0x829E, 'moraleShock', r => {
    M[0x5DA1] = r.a;
    let u = 0xD39F;
    for (let b = 20; b; b--, u += 40) {
      if (M[u + 0x25] & 0x10) continue;
      if ((M[u + 0x25] & 1) === M[0x5DA0]) P.moraleUp({ hl: u, b: 0x0C, a: M[0x5DA1] });
      else P.moraleDown({ hl: u, b: 0x0C, a: M[0x5DA1] });
    }
    setw(0x5D6D, u);
    return { ix: r.ix, b: 0, hl: u };
  });
  // $82E9: byte B of the record at HL gains A, up to $FF and to the byte before it. HL is kept.
  P.def(0x82E9, 'moraleUp', r => {
    const p = r.hl + r.b & 0xFFFF;
    let a = M[p] + r.a;
    M[p] = a > 255 ? 0xFF : a;
    if (M[p - 1] < M[p]) M[p] = M[p - 1];
    return { hl: r.hl };
  });
  // $82FD: byte B of the record at HL loses A, down to 0. HL is kept.
  P.def(0x82FD, 'moraleDown', r => {
    const p = r.hl + r.b & 0xFFFF;
    M[p] = M[p] < r.a ? 0 : M[p] - r.a;
    return { hl: r.hl };
  });
  // $830B: add an object of kind A at ($5D3A) on floor $5D23, carried by C, in the first free
  // entry of the scenario's objects; none free, A = 0 and Z.
  P.def(0x830B, 'addObject', r => {
    let hl = w(0xB72A), b = M[0xB639] || 256;
    for (; b; b--, hl = hl + 6 & 0xFFFF) {
      if (M[hl]) continue;
      M[hl] = r.a;
      M[hl + 1] = M[0x5D3A];
      M[hl + 2] = M[0x5D3B];
      M[hl + 3] = M[0x5D23];
      M[hl + 4] = 0;
      M[hl + 5] = r.c;
      return { a: M[0x5D23], hl: hl + 5 & 0xFFFF, b, de: 6 };
    }
    return { a: 0, zf: true, b: 0, hl, de: 6 };
  });
  // $8337: A at the place in HL, and a '%' after it, in double height when $5D09 has bit 3 set.
  P.def(0x8337, 'printPercent', r => {
    setw(V.PRINT_ROW, r.hl);
    P.printNumber({ a: r.a });
    const h = (r.hl >> 8) + 1 + (r.a >= 10) + (r.a >= 100) & 255;
    setw(V.PRINT_ROW, h << 8 | r.hl & 255);
    if (M[0x5D09] & 8) P.printCharDouble({ a: 0x25 });
    else P.printChar({ a: 0x25 });
    return {};
  });
  // $8360: after an attack: NZ, and the unit's numbers, when it has action points and health left.
  P.def(0x8360, 'stillAble', r => {
    const ix = r.ix;
    if (!M[ix + 6] || !M[ix + 8]) return { a: 0, zf: true };
    P.unitStats();
    return { a: 1, zf: false };
  });
  // $8371: the hit on the screen: once for every four points of damage, the scenario's tiles $B653
  // and $B654 over the square in front in yellow, with sound effect 9, and the square again.
  P.def(0x8371, 'hitShow', () => {
    P.targetPos();
    const n = M[0x5D98] >> 2;
    if (!n) return { a: 0, zf: true };
    for (let b = n; b; b--) {
      M[V.ATTR] = 0x46;
      P.drawTile({ a: M[0xB653] });
      P.sound({ a: 9 });
      P.drawTile({ a: M[0xB654] });
      P.playSound();
      P.drawSquare({ a: M[w(0x5D3E)] });
      P.playSound();
    }
    return { b: 0 };
  });
  // $83A6: the death on the screen: sound effect 12; the unit in front ($5D3C) spun round twice
  // to face down (setUnitTile on its square, $5D39, as unit $5D26), each turn with sound effect
  // 10 played; then sound effect 10 and the three tiles of the falling body, from the scenario's
  // table at ($B720), four bytes by the unit's kind ($00): the colours and the three tiles.
  P.def(0x83A6, 'deathShow', () => {
    P.sound({ a: 0x0C });
    P.targetPos();
    const ix = w(0x5D3C);
    const keep = M[0x5D26];
    M[0x5D26] = M[0x5D39];
    for (let b = 2; b; b--) {
      let f;
      do {
        P.setUnitTile({ ix });
        P.drawSquare({ a: M[0x5D39] });
        P.playSound();
        f = M[ix + 0x21] + 1;
        if (f === 8) f = 0;
        M[ix + 0x21] = f;
      } while (f !== 4);
    }
    P.sound({ a: 0x0A });
    let hl = w(0xB720) + 4 * M[ix] & 0xFFFF;
    M[V.ATTR] = M[hl];
    for (let b = 3; b; b--) {
      hl = hl + 1 & 0xFFFF;
      P.drawTile({ a: M[hl] });
      P.playSound();
    }
    M[0x5D26] = keep;
    return { ix, a: keep };
  });
  // $840C: the view moved to the next unit of the side whose turn it is after unit $5DA2 (round
  // from 19 to 0); none, NZ.
  P.def(0x840C, 'nextUnit', () => {
    for (let b = 20; b; b--) {
      let a = M[0x5DA2] + 1;
      if (a >= 20) a = 0;
      M[0x5DA2] = a;
      const hl = 0x5C50 + 4 * a;
      if (M[0xB712] !== M[hl]) continue;
      M[0x5D6B] = M[hl + 1];
      M[0x5D6C] = M[hl + 2];
      setw(0x5D69, w(V.VIEW_ROW) + 0x0505);
      return P.panView();
    }
    return { b: 0, zf: false };
  });

  // $9201: victory points for damage done to terrain ($5D8C): to side 0 when the scenario's $B704
  // is set, to side 1 when $B705 is, with the morale shock of it ($829E, by the side in $5DA0;
  // $5D4D is set to the side, which nothing reads after).
  P.def(0x9201, 'scoreDamage', () => {
    if (M[0xB704]) {
      M[0xB70F] = M[0xB70F] + M[0x5D8C] & 255;
      M[0x5D4D] = 0;
      P.moraleShock({ a: M[0x5D8C] });
    }
    if (!M[0xB705]) return { a: 0, zf: true };
    M[0xB710] = M[0xB710] + M[0x5D8C] & 255;
    M[0x5D4D] = 1;
    return P.moraleShock({ a: M[0x5D8C] });
  });
  // $99CF: the list of fires from $5CB3 emptied, $5DF1 and $5DF3 at its start, and $5CEF = $FF.
  P.def(0x99CF, 'clearFires', () => {
    setw(0x5DF1, 0x5CB3);
    setw(0x5DF3, 0x5CB3);
    M.fill(0, 0x5CB3, 0x5CB3 + 0x3C);
    M[0x5CEF] = 0xFF;
    return { a: 0xFF, bc: 0, hl: 0x5CEE, de: 0x5CEF };
  });

  // $A4A4: the end of the game: when a side has no units left the other scores the scenario's
  // $B65C (side 1) or $B65D (side 0). A side with 100 victory points, or the last turn ($B701)
  // played, ends it ($A4D9).
  P.def(0xA4A4, 'checkEnd', function* (r) {
    if (!P.sideLeft({ a: 0 }).zf) M[0xB710] = M[0xB710] + M[0xB65C] & 255;
    if (!P.sideLeft({ a: 1 }).zf) M[0xB70F] = M[0xB70F] + M[0xB65D] & 255;
    if (M[0xB70F] < 100 && M[0xB710] < 100 && M[0xB711] !== M[0xB701]) {
      return { ix: r && r.ix, a: M[0xB711], zf: false, cf: M[0xB711] < M[0xB701] };
    }
    return yield* P.gameOver();
  });
  // $A4D9: the game over: the screen cleared, the winner's message (the scenario's $A0 or $A1 with
  // message $62) or message $64 for none, the points (most 100), message $63 and the scores
  // ($5FFE), and a key; then the game starts again at $B1C3.
  P.def(0xA4D9, 'gameOver', function* () {
    P.clearScreen();
    if (M[0xB70F] >= 100 || M[0xB710] >= 100) {
      M[0x5D02] = M[0xB70F] >= 100 ? 0xA0 : 0xA1;
      P.infoText({ a: 0x62 });
      P.scenarioMessageAt({ a: M[0x5D02], hl: 0x0509 });
    } else {
      P.infoText({ a: 0x64 });
    }
    if (M[0xB70F] >= 100) M[0xB70F] = 100;
    if (M[0xB710] >= 100) M[0xB710] = 100;
    P.text({ a: 0x63 });
    P.scores();
    M[0x5DF7] = 0;
    yield* P.waitRelease();
    yield* P.waitFire();
    return P.restart(0xB1C3);
  });
  // $5FFE: the scores: message $68, and each side's victory points and name (the scenario's
  // messages $A0 and $A1) at rows 16 and 19.
  P.def(0x5FFE, 'scores', () => {
    P.infoText({ a: 0x68 });
    setw(V.PRINT_ROW, 0x0510);
    P.printNumber({ a: M[0xB70F] });
    P.scenarioMessageAt({ a: 0xA0, hl: 0x0A10 });
    setw(V.PRINT_ROW, 0x0513);
    P.printNumber({ a: M[0xB710] });
    return P.scenarioMessageAt({ a: 0xA1, hl: 0x0A13 });
  });
  // $A53A: NZ if no unit of side A is left in the table of units.
  P.def(0xA53A, 'sideLeft', r => {
    for (let hl = 0x5C50, b = 20; b; b--, hl += 4) if (M[hl] === r.a) return { a: r.a, zf: true, hl, b };
    return { a: 1, zf: false, b: 0 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
