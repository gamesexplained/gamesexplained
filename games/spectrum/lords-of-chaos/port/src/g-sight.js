// What a creature sees ($B148-$B5F6): after it moves or acts, every entry of the object table in
// its reach is traced to, line by line over the map's terrain, and what is seen is marked and
// shown on the map; the move itself, and the missile styles.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.sight = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def, H = P.H;
  const flags = t => M[(0xD38E + t) & 0xFFFF];
  const carried = ix => M[ix + 4] < 0xFE;

  // update_view: what the selected creature sees, from under cover (bit 2 of its terrain's flags)
  // less unless it flies; the creature put back on the map; the computer's creature loaded again if
  // it noted new enemies ($D187); and bit 4 of the creature's flags, engaged, set when an enemy
  // stands next to it ($5B3F), for a creature that may be engaged ($5B29) and is not invisible.
  def(0xB148, 'update_view', r => {
    M[0x5B3F] = M[0xD187] = M[0xD189] = 0;
    M[0xFF4B] = flags(H.terrain(w(0x5B4D))) & 4;
    if (M[0x5B2F] === 0xFE) M[0xFF4B] = 0;
    P.work_out_sight({ hl: w(0x5B55) });
    M[P.map_address_selected({}).hl] = M[0x5B54];
    if (M[0xD187]) P.load_creature({ a: M[0xD186] });
    if (!M[0x5B29]) return {};
    const ix = w(0x5B50);
    if (M[ix + 4] & 8) return {};
    if (M[0x5B3F]) M[ix + 4] |= 0x10; else M[ix + 4] &= ~0x10;
    return {};
  });

  // work_out_sight: what can be seen from square HL: a reach of $13 half squares on the ground, $17
  // in the air; every entry's seen mark cleared but the viewer's; each entry in reach, on the
  // ground or in the air, traced to (trace_line_ground) and its square looked at (see_square).
  def(0xB1A6, 'work_out_sight', r => {
    setw(0xFF88, r.hl);
    M[0xFF50] = M[0x5B2F] === 0xFE ? 0x17 : 0x13;
    for (let i = 0, a = 0x5B5B; i < 0x91; i++, a += 6) M[a] &= 0xBF;
    M[(w(0x5B4D) + 1) & 0xFFFF] |= 0x40;
    M[0x5B41] = M[0x5B40] = M[0x5B1F] = 0;
    const apart = (a, b) => { let d = Math.abs(a - b); if (d >= 0x12) d = (0x24 - d) & 255; return d; };
    let ix = 0x5B5A;
    for (let b = 0x91; b; b--, ix += 6, M[0x5B1F] = (M[0x5B1F] + 1) & 255) {
      if (M[ix + 2] === 0xFF || carried(ix) || (M[ix + 1] & 0x40)) continue;
      const dr = apart(M[ix], M[0xFF88]);
      M[0xFF44] = dr;
      if (((2 * dr) & 255) >= M[0xFF50]) continue;
      const dc = apart(H.column(ix), M[0xFF89]);
      M[0xFF43] = dc;
      if (((2 * dc) & 255) >= M[0xFF50]) continue;
      const far = Math.max(dr, dc), near = Math.min(dr, dc);
      M[0xFF4F] = (2 * far + near) & 255;
      if (M[0xFF4F] >= M[0xFF50]) continue;
      M[0xFF4D] = M[ix]; M[0xFF4E] = H.column(ix);
      const f = flags(H.terrain(ix));
      M[0xFF4A] = f & 2; M[0xFF4C] = f & 4;
      P.trace_line_ground({});
      P.see_square({ ix, b });
    }
    return {};
  });

  // see_square: every entry from $5B1F on, on square $FF4D and not yet marked, looked at
  // (see_entry); the map shows the creature seen at the viewer's height, else one at the other
  // height, else the heaviest object seen.
  def(0xB280, 'see_square', r => {
    M[0x5B2E] = M[0x5B2C] = M[0x5B3E] = M[0x5B3D] = 0;
    M[0x5B20] = M[0x5B1F];
    let ix = r.ix;
    for (let b = r.b; b; b = (b - 1) & 255, ix += 6, M[0x5B20] = (M[0x5B20] + 1) & 255) {
      if (M[ix + 2] === 0xFF || carried(ix) || (M[ix + 1] & 0x40)) continue;
      if (M[ix] !== M[0xFF4D] || H.column(ix) !== M[0xFF4E]) continue;
      P.see_entry({ ix });
      const hl = P.map_address({ hl: w(0xFF4D) }).hl;
      if (M[0x5B2C]) M[hl] = M[0x5B2C];
      if (M[0x5B3D]) M[hl] = M[0x5B3D];
      if (M[0x5B3E]) M[hl] = M[0x5B3E];
    }
    return { ix: r.ix };
  });

  // see_entry: whether the entry at IX is seen (bit 7 of byte 1), its look marked (bit 6) either
  // way. An invisible creature not the player's is not, unless the magic eye is open; at the other
  // height, not from under cover ($FF4B) or when a creature on the ground is under cover ($FF4C).
  // From the ground, a creature in the air is seen, a thing on the ground when it is near (under
  // four half squares) or the line is clear ($FF49). From the air, a creature in the air is seen;
  // an object not when its square hides it ($FF4A), a creature on the ground when near or not
  // hidden. A seen object goes in the list at $D148 (24 at most) and is the square's picture if
  // the heaviest; a seen creature is the picture at its height, and an enemy's invisibility ends
  // and it is counted (count_enemy), with the creature it carries, if one, shown and counted too.
  def(0xB2E8, 'see_entry', r => {
    const ix = r.ix;
    M[ix + 1] |= 0x40;
    const t = M[ix + 2];
    if (t >= 0x8C && !M[0x8A89]) {
      const iy = H.crec(M[ix + 5]);
      if ((M[iy + 4] & 8) && !H.mine(iy)) return {};
    }
    const flying = M[ix + 4] === 0xFE;
    if (M[0x5B2F] !== M[ix + 4]) {
      if (M[0xFF4B]) return {};
      if (!flying && M[0xFF4C]) return {};
    }
    if (M[0x5B2F] !== 0xFE) {
      if (!flying && M[0xFF4F] >= 4 && M[0xFF49]) return {};
    } else if (!flying) {
      if (t < 0x8C && M[0xFF4A]) return {};
      if (M[0xFF4F] >= 4 && M[0xFF4A]) return {};
    }
    M[ix + 1] |= 0x80;
    if (t < 0x8C) {
      if (M[0xD189] !== 0x18) { setw(0xD148 + 2 * M[0xD189], ix); M[0xD189]++; }
      const iy = H.orec(t);
      if (M[iy + 1] < M[0x5B2E]) return {};
      M[0x5B2E] = M[iy + 1];
      M[0x5B2C] = t;
      return {};
    }
    if (M[0x5B2F] === M[ix + 4]) M[0x5B3E] = t; else M[0x5B3D] = t;
    let iy = H.crec(M[ix + 5]);
    if (H.mine(iy)) return {};
    M[iy + 4] &= ~8;
    M[0xD18F] = M[ix + 4];
    P.count_enemy({ ix, iy });
    P.list_carried({ a: M[0x5B20], ix, iy });
    if (M[0xD0D9] < 0x8C) return {};
    const ix2 = H.entry(M[0xD0DA]);
    iy = H.crec(M[ix2 + 5]);
    if (M[iy + 4] & 8) return {};
    M[ix2 + 1] |= 0x80;
    return P.count_enemy({ ix: ix2, iy });
  });

  // count_enemy: an enemy in view at height $D18F counted ($5B40 on the ground, $5B41 in the air),
  // noted by the computer while it moves ($9C8C); $5B3F set when it is next to the viewer at its
  // height.
  def(0xB3D9, 'count_enemy', r => {
    const at = M[0xD18F] === 0xFF ? 0x5B40 : 0x5B41;
    M[at] = (M[at] + 1) & 255;
    if (M[0xD063]) P.note_enemy({ ix: r.ix, iy: r.iy, hl: at });
    if (M[0x5B2F] !== M[0xD18F]) return {};
    if (M[0xFF4F] >= 4) return {};
    M[0x5B3F] = 1;
    return {};
  });

  // trace_line: the line from square $FF88 to square $FF4D followed over the map: Z (and $FF49 0)
  // when no square on the way has a terrain flag of $5B2B; Z clear and $FF49 1 when one does.
  const trace = flag => {
    M[0x5B2B] = flag;
    setw(0xFF3B, w(0xFF88)); setw(0xFF3D, w(0xFF4D));
    M[0xFF49] = 0;
    P.line_setup({});
    for (;;) {
      P.line_step({});
      if (M[0xFF3B] === M[0xFF3D] && M[0xFF3C] === M[0xFF3E]) return { zf: true, a: M[0xFF3C] };
      const a = P.what_is_at({ hl: w(0xFF3B) }).a;
      if (M[0x5B2B] & flags(a)) { M[0xFF49] = 1; return { a: 1, zf: false }; }
    }
  };
  def(0xB401, 'unused_trace_20', r => trace(0x20));
  def(0xB408, 'unused_trace_40', r => trace(0x40));
  def(0xB40F, 'trace_line_air', r => trace(0x10));
  def(0xB416, 'trace_line_ground', r => trace(0x01));
  def(0xB41B, 'trace_line', r => trace(M[0x5B2B]));

  // move_selected: the selected creature to square $FF8A: the old square shows again what lay under
  // it ($FF90), the new square's map byte kept there and replaced by the creature; its terrain
  // becomes $FF91; the step's cost ($FF8E) comes off its action points and half of it off its
  // stamina; what it carries goes with it, and what it sees is worked out again.
  def(0xB4EB, 'move_selected', r => {
    M[P.map_address_selected({}).hl] = M[0xFF90];
    setw(0x5B55, w(0xFF8A));
    const hl = w(0xFF8C);
    M[0xFF90] = M[hl];
    M[hl] = M[0xD0D8] = M[0x5B54];
    let ix = w(0x5B4D);
    M[ix + 3] = (M[ix + 3] & 0x80) | M[0xFF91];
    ix = w(0x5B50);
    M[ix] = M[0xD1FB] = (M[ix] - M[0xFF8E]) & 255;
    M[ix + 1] = M[0xD1FC] = (M[ix + 1] - (M[0xFF8E] >> 1)) & 255;
    if (!P.find_partner({}).zf) P.keep_figures({});
    P.set_entry_square({ ix: w(0x5B4D), hl: w(0x5B55) });
    M[0x5B43] = 0;
    P.move_carried({ hl: w(0x5B55) });
    M[0x5B29] = 1;
    P.update_view({});
    return {};
  });

  // set_entry_square: the entry at IX on square L (row), H (column), the top two bits of byte 1 kept.
  const setSquare = (ix, hl) => { M[ix] = hl & 255; M[ix + 1] = (M[ix + 1] & 0xC0) | (hl >> 8); };
  def(0xB554, 'set_entry_square', r => { setSquare(r.ix, r.hl); return { a: M[r.ix + 1] }; });

  // move_carried: every entry the selected creature ($5B4F) or its rider ($5B44) carries to square
  // HL, with terrain $FF91.
  def(0xB561, 'move_carried', r => {
    let ix = 0x5B5A;
    for (let b = 0x91; b; b--, ix += 6) {
      if (M[0x5B4F] !== M[ix + 4] && M[0x5B44] !== M[ix + 4]) continue;
      setSquare(ix, r.hl);
      M[ix + 3] = (M[ix + 3] & 0x80) | M[0xFF91];
    }
    return {};
  });

  // set_missile: missile style A (eight bytes each at $B60E) into $FF5D on, and its sound, the eighth.
  def(0xB5F7, 'set_missile', r => {
    const s = (0xB60E + 8 * r.a) & 0xFFFF;
    for (let i = 0; i < 7; i++) M[0xFF5D + i] = M[(s + i) & 0xFFFF];
    return P.set_sound({ a: M[(s + 7) & 0xFFFF] });
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
