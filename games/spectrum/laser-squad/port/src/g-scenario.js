// The scenarios' own code. Each scenario's block on the tape ($B621-$FFFF) begins with eight hooks
// the engine calls, three bytes apart: a RET where the scenario adds nothing, or a JP to its own
// routine. $B621 is the computer's turn, $B624 its reaction to a unit moving in its sight, $B627
// a shot's square, $B62A a step of the computer's unit, $B62D a step about to be made, $B630 the
// end of a half-turn, $B633 the unit's menu just built, $B636 the scenario's own option ($0D) on
// it. The rest of this file is the routines four of the scenarios hook in; the computer's player,
// the same in all five but for a few changes, is g-ai.js.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.scenario = P => {
  const M = P.M, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);

  // Which scenario is in memory: by the routine its first hook jumps to.
  const BY_TURN = { 0xB89F: 'assassins', 0xB894: 'moonbase-assault', 0xB8A6: 'rescue-from-the-mines',
    0xB89B: 'cyber-hordes', 0xB8D3: 'paradise-valley' };
  P.SCENARIOS = Object.values(BY_TURN);
  P.scenarioId = () => (M[0xB621] === 0xC3 && BY_TURN[w(0xB622)]) || null;

  // The hook at `at`: its RET (the registers as they were) or its routine. hookNow is for a
  // routine that does not wait.
  const hook = function* (at, r) {
    if (M[at] === 0xC9) return Object.assign({}, r);
    if (M[at] !== 0xC3) throw new Error('the hook at $' + at.toString(16) + ' is neither a JP nor a RET');
    return yield* P.jumpGen(w(at + 1), r);
  };
  const hookNow = (at, r) => {
    if (M[at] === 0xC9) return Object.assign({}, r);
    if (M[at] !== 0xC3) throw new Error('the hook at $' + at.toString(16) + ' is neither a JP nor a RET');
    return P.jump(w(at + 1), r);
  };
  P.def(0xB621, 'computerTurn', function* (r) { return yield* hook(0xB621, r); });
  P.def(0xB624, 'computerReaction', function* (r) { return yield* hook(0xB624, r); });
  P.def(0xB627, 'scenarioShot', r => hookNow(0xB627, r));
  P.def(0xB62A, 'computerStep', function* (r) { return yield* hook(0xB62A, r); });
  P.def(0xB62D, 'scenarioStep', function* (r) { return yield* hook(0xB62D, r); });
  P.def(0xB630, 'scenarioHalfTurn', function* (r) { return yield* hook(0xB630, r); });
  P.def(0xB633, 'scenarioMenu', function* (r) { return yield* hook(0xB633, r); });
  P.def(0xB636, 'scenarioOption', function* (r) { return yield* hook(0xB636, r); });

  // The units ($28 bytes each) the computer is sent again in Cyber Hordes and Paradise Valley,
  // at the end of each half-turn in a game against it: each one dead ($08 clear) comes back with
  // its life ($07), its morale and stamina ($09, $0B) whole, its armour and weapon from its kind
  // ($00), five bytes a kind at `kit` ($0D-$10 and $23, the weapon, made a new object of the
  // scenario's with 60 rounds and carried, $17 its number), and arrives three turns on ($1C).
  // Cyber Hordes adds the object even when the weapon is 0.
  function reinforce(iy, n, kit, always) {
    if (!M[0xB706]) return { a: 0, zf: true };
    for (let b = n; b; b--, iy = iy + 0x28 & 0xFFFF) {
      if (M[iy + 8]) continue;
      M[iy + 8] = M[iy + 7];
      M[iy + 0x0A] = M[iy + 9];
      M[iy + 0x0C] = M[iy + 0x0B];
      const k = kit + ((M[iy] << 2 & 255) + M[iy] & 255) & 0xFFFF;
      M[iy + 0x0D] = M[k]; M[iy + 0x0E] = M[k + 1]; M[iy + 0x0F] = M[k + 2]; M[iy + 0x10] = M[k + 3];
      M[iy + 0x23] = M[k + 4];
      M[iy + 0x24] = 0x3C;
      if (always || M[iy + 0x23]) {
        const o = P.addObject({ a: M[iy + 0x23], c: 0xA0 - b & 255 });
        M[iy + 0x17] = M[0xB639] + 1 - o.b & 255;
        M[o.hl - 1 & 0xFFFF] = 0x3C;
      }
      M[iy + 0x1C] = M[0xB711] + 3 & 255;
    }
    return { b: 0 };
  }

  // Moonbase Assault. $C208: a step onto square $14, a door, opens it ($4B on the map), in a
  // player's turn with its three frames ($B5-$B7, 40 delays apart) and the view drawn again.
  const MB = 'moonbase-assault';
  P.defIn(MB, 0xC208, 'doorOpen', () => {
    if (M[0x5D27] !== 0x14) return { a: M[0x5D27], zf: false };
    M[0x5D00] = 0x44;
    M[0x5D39] = 0x4B;
    M[w(0x5D3E)] = 0x4B;
    const d = w(0x5D3A) - w(0x5CFC) & 0xFFFF;
    let hl = d << 1 & 0xFFFF;
    hl = (hl + 0x100 & 0xFF00) | (hl + 1 & 255);
    setw(0x5CFE, hl);
    if (M[0x5D36]) return { a: M[0x5D36], zf: false };
    for (let a = 0xB5; a < 0xB8; a++) { P.drawTile({ a }); P.delay40(); }
    P.drawView();
    P.delay40();
    return {};
  });
  // $C249: at the end of each half-turn every open door on the map ($D6BF-$E65E) shuts again.
  P.defIn(MB, 0xC249, 'doorsShut', () => {
    P.showAllUnits();
    for (let hl = 0xD6BF; hl <= 0xE65E; hl++) if (M[hl] === 0x4B) M[hl] = 0x14;
    return { a: M[0xE65E], hl: 0xE65E, zf: true };
  });

  // Rescue from the Mines.
  const RM = 'rescue-from-the-mines';
  // $FF88: a step onto squares $1A-$1D is never made: the step's routine ends there ($6F89 too).
  // A unit whose $27 is $18 (the three prisoners) that tries it leaves the map: its square as it
  // was, 3 in the table of units, and 34 victory points to the first side.
  P.defIn(RM, 0xFF88, 'wayOut', function* (r) {
    const sq = M[w(0x5D3E)];
    if (sq < 0x1A) return { a: sq, cf: true, zf: false };
    if (sq >= 0x1E) return { a: sq, cf: false, zf: false };
    let ix = r.ix;
    const kind = M[ix + 0x27];
    if (kind !== 0x18) return { ix, a: kind, zf: false, cf: kind < 0x18, pops: 1 };
    M[w(0x5D2F)] = M[ix + 0x16];
    M[0x5C50 + 4 * (M[0x5D26] - 0x8C & 255) & 0xFFFF] = 3;
    M[0xB70F] = M[0xB70F] + 0x22 & 255;
    P.drawView();
    P.showSides();
    ix = ixOf(yield* P.checkEnd({ ix }), ix);
    return { ix, a: 0, zf: true, cf: false, pops: 1 };
  });
  // $CC09: the end of a half-turn. Units $91, $92 and $93 all gone from the first side (their byte
  // in the table of units not 0) end the game; so does the second side with no units left, and
  // then each of the three still on the first side scores it 34 more ($CC3C).
  P.defIn(RM, 0xCC09, 'rescueEnd', function* () {
    if (M[0x5C64] && M[0x5C68] && M[0x5C6C]) return yield* P.gameOver();
    if (P.sideLeft({ a: 1 }).zf) return { a: 1, zf: true };
    for (const at of [0x5C64, 0x5C68, 0x5C6C]) if (!M[at]) P.rescueScore();
    return yield* P.gameOver();
  });
  P.defIn(RM, 0xCC3C, 'rescueScore', () => {
    M[0xB70F] = M[0xB70F] + 0x22 & 255;
    return { a: M[0xB70F] };
  });
  // $CBBB: the menu of a unit carrying object $81 standing on square $28 gets option $0D, its words
  // the scenario's message $A2.
  P.defIn(RM, 0xCBBB, 'rescueMenu', () => {
    const ix = w(0x5D33);
    if (M[ix + 0x23] !== 0x81) return { ix, a: M[ix + 0x23], zf: false };
    const sq = M[w(0x5D3E)];
    if (sq !== 0x28) return { ix, a: sq, zf: false };
    P.addOption({ a: 0x0D });
    return Object.assign({ ix }, P.scenarioText({ a: 0xA2 }));
  });
  // $CBD7: option $0D, for a quarter of the unit's most action points: message $A3, a pause, and
  // the unit's count ($B63A + its number) set from $5DF8.
  P.defIn(RM, 0xCBD7, 'rescueOption', function* (r) {
    const ix = r.ix;
    const c = P.divRound({ a: M[ix + 5], b: 4 }).c;
    const p = yield* P.payAP({ ix, b: c });
    if (p.cf) return Object.assign({ ix }, p);
    M[ix + 6] = M[0x5D35];
    P.clearInfo();
    P.scenarioText({ a: 0xA3 });
    yield* P.pause();
    P.showAllUnits();
    M[0xB63A + (M[0x5D26] - 0x8C & 255) & 0xFFFF] = M[0x5DF8];
    return { ix, a: M[0x5DF8] };
  });

  // Cyber Hordes. $FF67: twelve units from $D4DF, their kit at $FFE1.
  P.defIn('cyber-hordes', 0xFF67, 'cyberReinforce', () => reinforce(0xD4DF, 12, 0xFFE1, true));

  // Paradise Valley.
  const PV = 'paradise-valley';
  // $CB24: a step onto the map's last column (79) by a unit carrying object $85 wins the game for
  // the first side (100 victory points). In a player's turn a step onto a square of terrain $3B or
  // more whose byte $08 is $0A or $0B carries the unit on 25 rows down or up (the lifts between the
  // map's two halves), when no unit stands there: the step made, then the next one costed and made
  // for nothing.
  P.defIn(PV, 0xCB24, 'paradiseStep', function* (r) {
    if (M[0x5D3B] === 0x4F) {
      P.listCarried({ ix: r.ix });
      if (P.findCarried({ a: 0x85 }).zf) {
        M[0xB70F] = 0x64;
        return yield* P.checkEnd({ ix: r.ix });
      }
    }
    if (M[0x5DF7]) return { a: M[0x5DF7], zf: false };
    if (M[0x5D27] < 0x3B) return { a: M[0x5D27], cf: true };
    const iy = P.terrainPtr({ a: M[0x5D27] }).iy;
    const t = M[iy + 8];
    let hl = w(0x5D3A);
    if (t === 0x0A) hl = hl + 0x19 & 0xFFFF;
    else if (t === 0x0B) hl = hl - 0x19 & 0xFFFF;
    else return { iy, a: t, zf: false };
    setw(0xCB22, hl);
    const sq = P.mapSquare({ d: hl >> 8, e: hl & 255 }).hl;
    if (M[sq] >= 0x8C) return { iy, a: M[sq], cf: false };
    const s = yield* P.stepOn();
    setw(0x5D3A, w(0xCB22));
    P.stepCost({ ix: ixOf(s, w(0x5D33)) });
    M[0x5D28] = 0;
    return yield* P.stepOn();
  });
  // $FEDF: eight units from $D57F, their kit at $CB7D.
  P.defIn(PV, 0xFEDF, 'paradiseReinforce', () => reinforce(0xD57F, 8, 0xCB7D, false));
};
})(typeof window !== 'undefined' ? window : globalThis);
