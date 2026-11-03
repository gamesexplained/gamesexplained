// The records and the small questions asked of them: the object table's entries (six bytes: row,
// column with the seen marks, type, terrain under, height or carrier, creature number), the
// creatures' records, the creature types' and object types' records, the wizards' records, and
// the division the game does by subtraction.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.records = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def;
  // helpers the other groups call: addresses and answers as numbers
  const H = P.H = P.H || {};
  H.entry = n => (0x5B5A + 6 * (n & 255)) & 0xFFFF;
  H.crec = n => (0x5EC0 + 5 * (n & 255)) & 0xFFFF;
  H.orec = t => (w(0xD005) + 6 * ((t - 0x50) & 255)) & 0xFFFF;
  H.wrec0 = p => w((0x8098 + ((2 * p) & 255)) & 0xFFFF);
  H.wrec = p => H.wrec0((p - 1) & 255);
  H.trec = t => (t >= 0x90 ? (w(0xD003) + 12 * ((t - 0x90) & 255)) & 0xFFFF : (H.wrec0((t - 0x8C) & 255) + 0x2F) & 0xFFFF);
  H.column = ix => M[(ix + 1) & 0xFFFF] & 0x3F;
  H.terrain = ix => M[(ix + 3) & 0xFFFF] & 0x7F;
  H.mine = iy => (M[(iy + 4) & 0xFFFF] & 7) === M[0x5B11];
  H.divide = (a, b) => {
    if (!b) { P.io.out(0xFE, 3); return 0; }
    let c = 0;
    while (a >= b) { a -= b; c = (c + 1) & 255; }
    return c;
  };

  // owner_is_player: Z when the creature record at IY is the current player's ($5B11).
  def(0x61C3, 'owner_is_player', r => {
    const a = M[(r.iy + 4) & 0xFFFF] & 7;
    return { a, hl: 0x5B11, zf: a === M[0x5B11], cf: a < M[0x5B11] };
  });

  // player_has_creature: Z when a creature (type $8D up) of the current player is in the table.
  def(0x61A1, 'player_has_creature', r => {
    let ix = 0x5B5A;
    for (let b = 0x91; b; b--, ix += 6) {
      const t = M[ix + 2];
      if (t === 0xFF || t + 1 < 0x8D) continue;
      const iy = H.crec(M[ix + 5]);
      if (H.mine(iy)) return { ix, iy, b, de: 6, hl: 0x5B11, a: M[iy + 4] & 7, zf: true };
    }
    return { ix, a: 1, b: 0, de: 6, zf: false };
  });

  def(0x7883, 'is_flying', r => { const a = M[(r.ix + 4) & 0xFFFF]; return { a, zf: a === 0xFE, cf: a < 0xFE }; });
  def(0x7889, 'is_loose', r => { const a = (M[(r.ix + 4) & 0xFFFF] + 1) & 255; return { a, zf: a === 0 }; });
  def(0x788E, 'terrain_under', r => ({ a: H.terrain(r.ix) }));
  def(0x7894, 'entry_position', r => ({ e: M[r.ix], d: H.column(r.ix), a: H.column(r.ix) }));
  def(0x789C, 'read_table_word', r => { const a = (r.hl + r.de) & 0xFFFF; const v = w(a); return { hl: v, de: (a + 1) & 0xFFFF }; });
  def(0x78A2, 'entry_column', r => ({ a: H.column(r.ix) }));
  def(0x78A8, 'reset_ff86', r => { setw(0xFF86, 1); return { hl: 1 }; });
  const vab = hl => { const a = M[hl] & 0x7F; return { a, hl: 0xD19D, cf: a < M[0xD19D], zf: a === M[0xD19D] }; };
  def(0x78AF, 'value_against_best_at', r => vab((r.hl + r.de) & 0xFFFF));
  def(0x78B0, 'value_against_best', r => vab(r.hl));
  def(0x78B8, 'cursor_on_selected', r => {
    if (M[0x5B55] !== M[0xD0D3]) return { a: M[0x5B55], hl: 0xD0D3, zf: false };
    return { a: M[0x5B56], hl: 0xD0D4, zf: M[0x5B56] === M[0xD0D4] };
  });
  def(0x78C6, 'carry_limit', r => { const iy = w(0x5B52); return { iy, a: M[(iy + 7) & 0xFFFF] }; });
  def(0x78CE, 'selected_potion', r => { const iy = w(0x5B50); return { iy, a: M[(iy + 3) & 0xFFFF] }; });

  // damage_and_rider: damage_creature, and the rider of a creature that dies in the air takes 255.
  def(0x78D6, 'damage_and_rider', function* (r) {
    yield* P.damage_creature(r);
    if (!M[0xFF30]) return { a: 0, zf: true };
    if (M[0xFF2E] === 0xFF) return { a: 0xFF, zf: true };
    M[0xFF2B] = M[0xFF2E];
    return yield* P.damage_creature({ a: 0xFF });
  });

  def(0x949D, 'object_record_of', r => ({ iy: H.orec(M[(r.ix + 2) & 0xFFFF]), a: (M[(r.ix + 2) & 0xFFFF] - 0x50) & 255 }));
  def(0x94A0, 'object_record', r => ({ iy: H.orec(r.a), a: (r.a - 0x50) & 255 }));
  def(0x94B7, 'divide', r => { const c = H.divide(r.a, r.b); return { a: c, c }; });
  def(0x6FE4, 'entry_address', r => ({ hl: H.entry(r.a), de: 0x5B5A }));
  def(0xB58F, 'creature_record_of', r => ({ iy: H.crec(M[(r.ix + 5) & 0xFFFF]), a: M[(r.ix + 5) & 0xFFFF] }));
  def(0xB592, 'creature_record', r => ({ iy: H.crec(r.a) }));
  const trec = r => {
    const t = r.a;
    if (t >= 0x90) return { iy: H.trec(t), a: (t - 0x90) & 255 };
    const hl = H.wrec((t - 0x8B) & 255);
    return { iy: (hl + 0x2F) & 0xFFFF, de: hl, a: (2 * ((t - 0x8C) & 255)) & 255 };
  };
  def(0xB5A7, 'type_record_of', r => trec({ a: M[(r.ix + 2) & 0xFFFF] }));
  def(0xB5AA, 'type_record', r => trec(r));
  def(0xB5D2, 'keep_figures', r => {
    setw(0x5B30, w(0x5B55));
    M[0x5B34] = H.terrain(w(0x5B4D));
    const c = w(0x5B50);
    M[0x5B32] = M[c]; M[0x5B33] = M[(c + 1) & 0xFFFF];
    return { hl: w(0x5B55), a: M[0x5B33] };
  });

  // free_entry, free_entry_after_wizards: Z with IX on the first free entry (type $FF), its number
  // counted on in $5B1F; Z clear when the table is full.
  const free = (ix, b) => {
    for (; b; b--) {
      if (M[ix + 2] === 0xFF) return { ix, b, a: 0, zf: true, de: 6 };
      ix += 6;
      M[0x5B1F] = (M[0x5B1F] + 1) & 255;
    }
    return { ix, b: 1, zf: false, de: 6, hl: 0x5B1F };
  };
  def(0x8067, 'free_entry', r => free(0x5B5A, 0x91));
  def(0x806F, 'free_entry_after_wizards', r => { M[0x5B1F] = 4; return free(0x5B72, 0x8D); });
  def(0x808C, 'wizard_record', r => ({ hl: H.wrec(r.a) }));
  def(0x808D, 'wizard_record_0', r => ({ hl: H.wrec0(r.a) }));
};
})(typeof window !== 'undefined' ? window : globalThis);
