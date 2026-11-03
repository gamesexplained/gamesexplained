// A player's turn starting, a creature loaded and a creature damaged ($7560-$7882): the upkeep of
// each of the player's creatures (potions wearing off, damage from the terrain and fatal wounds,
// action points and stamina for the turn), the wizard's mana, and what happens when a creature dies.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.turn = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;

  // start_of_turn: for each of the player's creatures ($5B11; 0 the independents): shown, its
  // potion a turn nearer its end (byte 3), invisible with potion 3 or as a pixie ($93); on the
  // ground damage from lava ($37, 8), from another wizard's tree or poison terrain ($38-$41, by
  // $D04B) and from another player's fire ($42-$49, by $D050), plus its fatal wound; then its
  // action points for the turn (halved when weak, scaled by skill), stamina recovered and the
  // scenario's hook ($D027). Then the wizard's mana, a shield's turn, and PRESS FIRE.
  def(0x7560, 'start_of_turn', function* (r) {
    P.io.out(0xFE, 0, P.T);
    M[0x5B25] = 0;
    P.draw_turn_panel({ a: 0 });
    M[0xD1BB] = 1;
    M[0x5B26] = 0xFF;
    setw(0xFF57, 0x5B5A);
    for (let b = 0x91; b; b--) {
      M[0xFF2B] = (0x91 - b) & 255;
      let ix = w(0xFF57);
      const t = M[(ix + 2) & 0xFFFF];
      if (t !== 0xFF && t >= 0x8C) yield* upkeep(ix);
      setw(0xFF57, (w(0xFF57) + 6) & 0xFFFF);
    }
    M[0xD1BB] = 0;
    if (!M[0x5B11]) return { a: 0, zf: true };
    const rec = P.wizard_record({ a: M[0x5B11] }).hl;
    setw(0x5B04, rec);
    P.add_mana({ a: P.divide({ a: M[rec], b: 0x19 }).a });
    M[0x5B28] = 0x91;
    M[0xFF3A] = 0x2D;
    const s = (0xD054 + ((M[0x5B11] - 1) & 255)) & 0xFFFF;
    if (M[s]) M[s]--;
    if (M[0xD064] && M[0x5B11] === 2) return { a: 2, zf: true };
    M[0x5B17] = 0x46;
    P.print_text({ a: 0xE5 });
    yield* P.wait_fire({});
    P.clear_screen({});
    return yield* P.wait_release({});
  });
  function* upkeep(ix) {
    M[0x5B2F] = M[(ix + 4) & 0xFFFF];
    const iy = P.creature_record_of({ ix }).iy;
    setw(0x5B50, iy);
    if (!P.owner_is_player({ iy }).zf) return;
    M[(ix + 1) & 0xFFFF] |= 0x80;
    M[(iy + 4) & 0xFFFF] &= ~8;
    let p = M[(iy + 3) & 0xFFFF];
    if (p) {
      p = (p - 1) & 255;
      M[(iy + 3) & 0xFFFF] = p;
      if (!(p & 0x1F)) M[(iy + 3) & 0xFFFF] = 0;
    }
    if ((M[(iy + 3) & 0xFFFF] & 0xE0) === 0x60 || M[(ix + 2) & 0xFFFF] === 0x93) M[(iy + 4) & 0xFFFF] |= 8;
    let b = 0;
    if (P.is_loose({ ix }).zf) {
      const t = P.terrain_under({ ix }).a;
      if (t === 0x37) b = 8;
      else if (t >= 0x38 && t < 0x4A) {
        if (t < 0x42) {
          const k = (t - 0x38) >> 1;
          if (!k || k !== M[0x5B11]) b = ((M[(0xD04B + k) & 0xFFFF] * 2) + 0x19) & 255;
        } else {
          const k = ((t - 0x42) >> 1) + 1;
          if (k !== M[0x5B11]) b = ((M[(0xD050 + k) & 0xFFFF] * 2) + 0x10) & 255;
        }
      }
    }
    yield* P.damage_and_rider({ a: (((M[(iy + 4) & 0xFFFF] & 0xE0) >> 4) + b) & 255, ix, iy, b });
    if (M[0xFF30]) return;
    const rec = w(0x5B50);
    if (M[0x5B2F] === 0xFE) {
      const h = M[0xD1FB] >> 1;
      M[0xD1FC] = M[0xD1FC] >= h ? M[0xD1FC] - h : 0;
    }
    M[rec] = M[0xD200];
    if (M[0xD1FC] < P.divide({ a: M[0xD201], b: 6 }).a) M[rec] >>= 1;
    const q = P.divide({ a: M[0xD202], b: M[0xD1FD] }).a;
    M[rec] = P.divide({ a: M[rec], b: q }).a;
    const pt = M[(rec + 3) & 0xFFFF] & 0xE0;
    let a = (P.divide({ a: M[0xD201], b: pt === 0xC0 || pt === 0x80 ? 2 : 6 }).a + M[0xD1FC]) & 255;
    if (a >= M[0xD201]) a = M[0xD201];
    M[(rec + 1) & 0xFFFF] = a;
    const e = w(0xFFF9);
    setw(0x5B4D, e);
    M[0x5B55] = M[e];
    M[0x5B56] = M[(e + 1) & 0xFFFF] & 0x3F;
    M[0x5B54] = M[(e + 2) & 0xFFFF];
    if (M[0x5B2F] >= 0xFE) {
      M[P.map_address_selected({}).hl] = M[0x5B54];
      P.update_view({});
    }
    M[(w(0x5B50) + 4) & 0xFFFF] &= ~0x10;
    yield* P.jumpGen(0xD027, { ix: w(0x5B50) });
  }

  // load_creature: creature A the one being looked at ($5B58): IX its record and IY its type, its
  // entry in $FFF9, what it carries listed and its figures worked out.
  def(0x7737, 'load_creature', r => {
    M[0x5B58] = r.a;
    const e = P.entry_address({ a: r.a }).hl;
    setw(0xFFF9, e);
    const ix = P.creature_record_of({ ix: e }).iy;
    const iy = P.type_record_of({ ix: e }).iy;
    P.list_found_carries({ ix });
    P.load_figures({ ix, iy });
    return { ix, iy, a: M[0x5B44] };
  });

  // damage_creature: A ($FF2D) off the skill of creature $FF2B; a blow of more than a quarter of its
  // own adds to its fatal wound (top three bits of byte 4, at most 7). At none left it dies: its
  // plan cleared, its record emptied and its entry gone, the terrain back on its square, its
  // killer's player scoring byte 10 of its type ($5B26; halved unless $5B27), what it carried let
  // go, a rider left on the square, a wizard gone ($FF05 below $90). $FF30 says it died, $FF2E the
  // rider let go ($FF none, or $FF again when it died on the ground).
  def(0x7755, 'damage_creature', function* (r) {
    M[0xFF2D] = r.a;
    M[0xFF2E] = 0xFF;
    M[0xFF2F] = 0; M[0xFF30] = 0;
    const lc = P.load_creature({ a: M[0xFF2B] });
    let ix = lc.ix;
    const iy = lc.iy;
    if (P.divide({ a: M[0xD202], b: 4 }).a < M[0xFF2D]) {
      const k = M[(ix + 4) & 0xFFFF] >> 5;
      if (k !== 7) M[(ix + 4) & 0xFFFF] = (M[(ix + 4) & 0xFFFF] & 0x1F) | ((k + 1) << 5);
    }
    const had = M[(ix + 2) & 0xFFFF];
    const left = had - M[0xFF2D];
    M[(ix + 2) & 0xFFFF] = left & 255;
    M[0xD1FD] = left & 255;
    if (left > 0) return { a: left, zf: false, cf: false };
    if (left < 0) M[0xFF2D] = had;
    P.clear_plan({ ix, iy });
    M[0xD1FD] = 0;
    M[(ix + 2) & 0xFFFF] = 0;
    M[ix] = 0xFF;
    const d = M[(ix + 4) & 0xFFFF] & 7;
    if (d === 2 && M[0xD064]) {
      const f = P.find_in_wizard_list({ a: M[0xFF2B] });
      if (f.zf) M[f.hl] = 0xFF;
    }
    ix = w(0xFFF9);
    M[0xFF05] = M[(ix + 2) & 0xFFFF];
    M[(ix + 2) & 0xFFFF] = 0xFF;
    const sq = P.entry_square({ ix }).hl;
    const ma = P.map_address({ hl: sq }).hl;
    M[ma] = P.terrain_under({ ix }).a;
    M[0xFF30] = 1;
    const killer = (M[0x5B26] + 1) & 255;
    if (killer && killer !== d) {
      let b = M[(iy + 0x0A) & 0xFFFF];
      if (!M[0x5B27]) b >>= 1;
      const p = (0xD058 + M[0x5B26]) & 0xFFFF;
      M[p] = Math.min(0xFF, M[p] + b);
    }
    for (let b = 0x91, e = 0x5B5A; b; b--, e += 6) {
      if (M[e + 2] === 0xFF || M[0x5B58] !== M[e + 4]) continue;
      M[e + 4] = 0xFF;
      M[e + 3] &= 0x7F;
      if (M[e + 2] >= 0x8C) { M[0xFF2F] = M[e + 2]; M[0xFF2E] = (0x91 - b) & 255; }
    }
    if (M[0xFF2F]) {
      const e = P.entry_address({ a: M[0xFF2E] }).hl;
      if (M[(e + 1) & 0xFFFF] & 0x80) M[ma] = M[0xFF2F];
    }
    ix = w(0xFFF9);
    if (M[0xD064] && M[0xFF05] === 0x8D) M[0xD059] = 0;
    if (M[0xFF05] < 0x90) yield* P.cw('wizard_gone', { a: M[0xFF05], ix });
    if (P.is_flying({ ix }).zf) return { a: 0xFE, zf: true };
    M[0xFF2E] = 0xFF;
    return { a: 0xFF };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
