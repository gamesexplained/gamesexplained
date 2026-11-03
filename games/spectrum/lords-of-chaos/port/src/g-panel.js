// The map cursor and the information display ($629B-$6903): the cursor moved over the window and
// the window scrolled, the screen and the display cleared, the cursor's square described (its
// terrain, the creature on it and what it carries, the objects lying there), the square's name on
// the message line, the creatures and objects found on a square, and an attack on the terrain.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.panel = function (P) {
  const M = P.M, w = P.w, setw = P.setw, def = P.def, H = P.H = P.H || {};

  // move_cursor: the cursor moved by the controls ($5B13), nothing when no direction is held. The
  // new square ($5B47) is worked out from the window and the offset; while $FF60 sets a reach, a
  // square farther from $5B45 than it is refused. A move redraws the map with the cursor on.
  def(0x629B, 'move_cursor', r => {
    P.restore_cursor({});
    M[0xD0D8] = 0;
    if (M[0x5B13] >= 0xFE) return { a: M[0x5B13], cf: false };
    if (!(M[0x5B13] & 2)) P.cursor_up({});
    if (!(M[0x5B13] & 4)) P.cursor_down({});
    if (!(M[0x5B13] & 8)) P.cursor_right({});
    if (!(M[0x5B13] & 0x10)) P.cursor_left({});
    if (!M[0xD0D8]) return { a: 0, zf: true };
    const wrap = a => (a >= 0x24 ? a - 0x24 : a);
    M[0x5B47] = wrap((M[0x5B4B] + M[0x5B49]) & 255);
    M[0x5B48] = wrap((M[0x5B4C] + M[0x5B4A]) & 255);
    if (M[0xFF60]) {
      const d = P.distance({ hl: w(0x5B45), de: w(0x5B47) }).a;
      if (d >= M[0xFF60]) { P.restore_cursor({}); M[0xD0D8] = 0; return { a: 0 }; }
    }
    setw(0xD0C8, w(0x5B4B)); setw(0xD0D1, w(0x5B49)); setw(0xD0D3, w(0x5B47));
    P.IFF = false;
    M[0xB45B] = 6;
    M[0xD0D0] = 1;
    P.draw_map({});
    if (!(M[0xD0DF] & 4)) return {};
    P.slide_bars({});
    P.flash_icons({});
    return {};
  });
  def(0x6335, 'restore_cursor', r => { setw(0x5B4B, w(0xD0C8)); setw(0x5B49, w(0xD0D1)); setw(0x5B47, w(0xD0D3)); return { hl: w(0xD0D3) }; });
  // cursor_up, cursor_down, cursor_left, cursor_right: a row or column within the window, or the
  // window scrolled at its edge (wrapping at 36); $D0D8 says it moved.
  const moved = () => { M[0xD0D8] = 1; return { a: 1 }; };
  def(0x6348, 'cursor_up', r => { if (M[0xD0D1]) M[0x5B49] = M[0xD0D1] - 1; else M[0x5B4B] = M[0xD0C8] ? M[0xD0C8] - 1 : 0x23; return moved(); });
  def(0x636B, 'cursor_down', r => { if (M[0xD0D1] !== 6) M[0x5B49] = (M[0xD0D1] + 1) & 255; else M[0x5B4B] = M[0xD0C8] === 0x23 ? 0 : (M[0xD0C8] + 1) & 255; return moved(); });
  def(0x638E, 'cursor_left', r => { if (M[0xD0D2]) M[0x5B4A] = M[0xD0D2] - 1; else M[0x5B4C] = M[0xD0C9] ? M[0xD0C9] - 1 : 0x23; return moved(); });
  def(0x63B1, 'cursor_right', r => { if (M[0xD0D2] !== 6) M[0x5B4A] = (M[0xD0D2] + 1) & 255; else M[0x5B4C] = M[0xD0C9] === 0x23 ? 0 : (M[0xD0C9] + 1) & 255; return moved(); });

  // clear_screen, fill_screen: every attribute A (0 for clear_screen), every pixel byte 0.
  def(0x63D5, 'fill_screen', r => { M.fill(r.a & 255, 0x5800, 0x5B00); M.fill(0, 0x4000, 0x5800); return { hl: 0x3FFF, de: 0x3FFE, bc: 0 }; });
  def(0x63D4, 'clear_screen', r => P.fill_screen({ a: 0 }));

  // clear_icon_cell: a block of 3 by 3 attribute cells at HL to 0; HL on to the next column's block.
  const clearCell = hl => { for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) M[(hl + 32 * y + x) & 0xFFFF] = 0; return (hl + 5) & 0xFFFF; };
  def(0x644D, 'clear_icon_cell', r => ({ hl: clearCell(r.hl), de: 0x5B, b: 0 }));

  // clear_info_panel: the display's pictures hidden (the first two blocks, and the six below unless
  // bit 2 of $D0DF), the message line cleared, the pictures' list and the icons emptied, the icons'
  // attributes set.
  def(0x63EA, 'clear_info_panel', r => {
    let hl = clearCell(0x5877); clearCell(hl);
    if (!(M[0xD0DF] & 4)) for (const a of [0x5937, 0x59B7, 0x5A37]) clearCell(clearCell(a));
    P.clear_message_line({});
    for (let i = 0; i < 8; i++) M[0xB45C + 3 * i] = 0;
    M.fill(0x42, 0x5816, 0x5820);
    M.fill(0x42, 0x5836, 0x5840);
    M.fill(0, 0xD1A4, 0xD1AE);
    return {};
  });

  // clear_message_line, fill_message_line: the bottom two rows' attributes to 0 ($5B42 cleared) or A.
  def(0x6468, 'fill_message_line', r => { M.fill(r.a & 255, 0x5AC0, 0x5B00); return { hl: 0x5AFF, de: 0x5B00, bc: 0 }; });
  def(0x6464, 'clear_message_line', r => { M[0x5B42] = 0; return P.fill_message_line({ a: 0 }); });
  // blank_message_line: 32 spaces on rows 22 and 23 in the ROM's font.
  def(0x6475, 'blank_message_line', r => {
    setw(0x5B15, 0x0016); setw(0x5B0E, 0x3C00);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 32; i++) { P.print_char_small({ a: 0x20 }); M[0x5B16] = (M[0x5B16] + 1) & 255; }
      setw(0x5B15, 0x0017);
    }
    return {};
  });

  // describe_cursor_square: what the cursor's square holds: below $50 terrain ($5B10, $5B12);
  // otherwise the objects lying there and, for a creature, the creature found, the terrain under it,
  // what it carries and the five icon flags ($D1A4-$D1A8: flying, magic, undead, invisible, potion
  // of strength).
  def(0x649D, 'describe_cursor_square', r => {
    const hl = w(0xD0D3);
    M[0xD0DD] = M[0xD0D9] = 0;
    setw(0xFF88, hl);
    const a = M[P.map_address({ hl }).hl];
    M[0x5B12] = a;
    if (a < 0x50) { M[0x5B10] = a; return { a }; }
    P.list_objects_at({ de: w(0xFF88) });
    if (M[0x5B12] < 0x8C) return {};
    const ix = P.find_creature_at({ hl: w(0xFF88), a: 0xFF }).ix;
    M[0x5B10] = H.terrain(ix);
    P.list_found_carries({ ix });
    return icons(ix);
  });
  function icons(ix) {
    setw(0xD1A4, 0); setw(0xD1A6, 0); setw(0xD1A7, 0);
    let iy = H.trec(M[ix + 2]);
    if (M[iy + 1]) M[0xD1A5] = M[iy + 1];
    const c = H.crec(M[ix + 5]);
    M[0xD1A7] = M[c + 4] & 0xE0;
    if (M[c + 4] & 8) M[0xD1A8] = 1;
    if ((M[c + 3] & 0xE0) === 0xA0) M[0xD1A5] = 0xA0;
    iy = H.trec(M[ix + 2]);
    M[0xD1A4] = M[iy + 0x0B] & 2;
    M[0xD1A6] = M[iy + 0x0B] & 1;
    return { ix: c, iy };
  }
  // describe_creature: the same for a creature already found (IX).
  def(0x652C, 'describe_creature', r => {
    P.list_objects_at({ de: w(0xFF88), ix: r.ix });
    M[0x5B10] = H.terrain(r.ix);
    P.list_found_carries({ ix: r.ix });
    return icons(r.ix);
  });

  // fill_icon_list: the display's pictures from the description: the terrain, the object in use
  // (hidden when an invisible enemy carries it), the five icons ($D1A9), up to six objects there.
  def(0x653E, 'fill_icon_list', r => {
    M[0xB45C] = M[0x5B10];
    let a = M[0xD0D9];
    if (a >= 0x8C) {
      const c = H.crec(M[(H.entry(M[0xD0DA]) + 5) & 0xFFFF]);
      if ((M[c + 4] & 8) && !H.mine(c)) a = 0;
    }
    M[0xB45F] = a;
    for (let i = 0; i < 5; i++) M[0xD1A9 + i] = M[0xD1A4 + i];
    let n = M[0xD0DD];
    if (!n) return { a: 0, zf: true };
    if (n >= 7) n = 6;
    for (let i = 0; i < n; i++) M[0xB462 + 3 * i] = M[0xD1D5 + 2 * i];
    return {};
  });

  // print_square_name: the name of what is on the cursor's square on the message line (message map
  // byte + 1, row 22, white); a tree or bush also names the creature living in it; a creature, its
  // owner, and the one it carries or rides when seen (its owner's number and its name).
  def(0x6599, 'print_square_name', r => {
    const s = M[P.map_address_cursor({}).hl];
    M[0x5B12] = s;
    setw(0x5B1A, 0x0016); setw(0x5B17, 0x4606);
    P.print_text_big({ a: (s + 1) & 255 });
    if (s < 0x8C) {
      if (s < 0x3A || s >= 0x4A) return {};
      return P.print_owner_name({ a: (((s < 0x42 ? s - 0x3A : s - 0x42) >> 1) + 0x8D) & 255 });
    }
    let ix = P.find_creature_at({ hl: w(0xD0D3), a: 0xFF, e: s }).ix;
    if (!(M[ix + 1] & 0x80)) ix = P.find_creature_at({ hl: w(0xD0D3), a: M[0x5B58], e: s }).ix;
    if (M[ix + 4] === 0xFE) {
      setw(0x5B1A, (w(0x5B15) - 0x100) & 0xFFFF);
      P.print_panel_text({ a: 5 });
      M[0x5B16] = (M[0x5B16] - 1) & 255; M[0x5B15] = (M[0x5B15] - 1) & 255;
    }
    let c = H.crec(M[ix + 5]);
    M[0xD19F] = M[c + 4] & 7;
    if (M[0xD19F] && M[0x5B12] >= 0x90) P.print_owner_name({ a: (M[0xD19F] + 0x8C) & 255 });
    if (M[0xD1B1] === 0xFF) return {};
    ix = w(0xD1AF);
    if (M[0xD1B1] === M[0x5B58]) {
      if (M[0xD1B5] === 0xFF) return {};
      ix = w(0xD1B3);
    }
    if (!(M[ix + 1] & 0x80)) return {};
    c = H.crec(M[ix + 5]);
    if (M[c + 4] & 8) return {};
    setw(0x5B17, 0x4747); setw(0x5B0E, 0x3C00);
    P.print_char_big({ a: ((M[c + 4] & 7) + 0x30) & 255 });
    setw(0x5B1A, (w(0x5B15) + 0x100) & 0xFFFF);
    setw(0x5B17, 0x4342);
    P.print_text_big({ a: (M[ix + 2] + 1) & 255 });
    return {};
  });

  // print_owner_name: "=" and message A after the print position, green on black, the ROM's font.
  def(0x6684, 'print_owner_name', r => {
    setw(0x5B1A, (w(0x5B15) + 0x100) & 0xFFFF);
    setw(0x5B0E, 0x3C00); setw(0x5B17, 0x4404);
    P.print_char_big({ a: 0x3D });
    return P.print_text_big({ a: r.a });
  });

  // find_creatures_at: up to two creatures (type $8C up, not carried) at row L, column H, skipping
  // entry A: the first to $D1AF (entry), $D1AE (type), $D1B1 (number), the second to $D1B3, $D1B2,
  // $D1B5.
  const findAt = (hl, skip) => {
    M[0xD1A0] = skip;
    M[0xD1AE] = M[0xD1B2] = 0;
    M[0xD1B1] = M[0xD1B5] = 0xFF;
    M[0xFFF7] = 2;
    let ix = 0x5B5A, d = 0;
    for (let b = 0x91; b; b--, ix += 6, d++) {
      if (M[0xD1A0] === d) continue;
      const t = M[ix + 2];
      if (t === 0xFF || t < 0x8C || M[ix + 4] < 0xFE) continue;
      if ((hl & 255) !== M[ix] || (hl >> 8) !== H.column(ix)) continue;
      M[0xFFF7]--;
      if (M[0xFFF7]) { setw(0xD1AF, ix); M[0xD1AE] = t; M[0xD1B1] = d; }
      else { setw(0xD1B3, ix); M[0xD1B2] = t; M[0xD1B5] = d; return { ix, d, b }; }
    }
    return { ix, d, b: 0 };
  };
  const hlOf = r => (r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) & 0xFFFF;
  def(0x66CD, 'find_creatures_at', r => findAt(hlOf(r), r.a & 255));
  def(0x66C6, 'find_creatures_any', r => findAt(hlOf(r), 0xFF));
  def(0x66CA, 'find_others_at', r => findAt(hlOf(r), M[0x5B4F]));
  // find_creature_at: of those, the one whose type is $5B12, else the second, in IX and $FFF9, its
  // number in $5B58.
  def(0x66A2, 'find_creature_at', r => {
    findAt(hlOf(r), r.a & 255);
    let ix, a;
    if (M[0xD1AE] === M[0x5B12]) { ix = w(0xD1AF); a = M[0xD1B1]; } else { ix = w(0xD1B3); a = M[0xD1B5]; }
    setw(0xFFF9, ix); M[0x5B58] = a;
    return { ix, a, hl: 0x5B12 };
  });

  // list_carried: the objects creature A carries as pairs of number and type at $D1C0, the count in
  // $D0DE; the one in use (bit 7 of byte 3) also in $D0DA (number), $D0DB (entry), $D0D9 (type) and
  // $5B59 (its place in the list, from 1).
  const carried = d => {
    M[0xD0D9] = M[0x5B59] = 0;
    M[0xD0DA] = 0xFF;
    let ix = 0x5B5A, hl = 0xD1C0, e = 0;
    for (let n = 0; n < 0x91; n++, ix += 6) {
      if (M[ix + 2] === 0xFF || M[ix + 4] !== d) continue;
      M[hl] = n;
      if (M[ix + 3] & 0x80) { M[0xD0DA] = n; setw(0xD0DB, ix); }
      M[hl + 1] = M[ix + 2];
      if (M[ix + 3] & 0x80) { M[0xD0D9] = M[ix + 2]; M[0x5B59] = (e + 1) & 255; }
      hl += 2; e = (e + 1) & 255;
    }
    M[0xD0DE] = e;
    return { e, d, hl: 0xD0DE };
  };
  def(0x6749, 'list_carried', r => carried(r.a & 255));
  def(0x6741, 'list_selected_carries', r => carried(M[0x5B4F]));
  def(0x6746, 'list_found_carries', r => carried(M[0x5B58]));

  // list_objects_at: the objects ($50-$8B) lying on the ground and seen at row E, column D, as pairs
  // at $D1D4, the count in $D0DD (ten at most); the terrain under them in $5B10; the heaviest in
  // $5B2C (type), $5B2D (number) and $5B2E (weight).
  const objectsAt = de => {
    M[0xD0DD] = M[0x5B2E] = M[0x5B2C] = 0;
    let ix = 0x5B5A, hl = 0xD1D4;
    for (let n = 0; n < 0x91; n++, ix += 6) {
      const t = M[ix + 2];
      if (t === 0xFF || t < 0x50 || t >= 0x8C || M[ix + 4] !== 0xFF || !(M[ix + 1] & 0x80)) continue;
      if (M[ix] !== (de & 255) || H.column(ix) !== (de >> 8)) continue;
      M[hl] = n; M[hl + 1] = t; hl += 2;
      M[0x5B10] = H.terrain(ix);
      M[0xD0DD]++;
      const wt = M[H.orec(t) + 1];
      if (wt >= M[0x5B2E]) { M[0x5B2E] = wt; M[0x5B2C] = t; M[0x5B2D] = n; }
      if (M[0xD0DD] === 0x0A) break;
    }
    return {};
  };
  def(0x67A7, 'list_objects_at', r => objectsAt(r.de !== undefined ? r.de : (r.d << 8 | r.e)));
  def(0x67A3, 'list_objects_here', r => objectsAt(w(0x5B55)));

  // clear_bars, clear_lower_bars: the attributes of the display's right-hand area, ten cells wide,
  // 21 rows from $5816 or 14 from $58F6.
  const clearArea = (hl, b) => { for (let y = 0; y < b; y++) M.fill(0, hl + 32 * y, hl + 32 * y + 10); return { hl: (hl + 32 * b) & 0xFFFF, de: 0x16, b: 0 }; };
  def(0x6830, 'clear_bars', r => clearArea(0x5816, 0x15));
  def(0x6837, 'clear_lower_bars', r => clearArea(0x58F6, 0x0E));
  // draw_menu_frame: twelve rows of the engine's message 4 from row 7, column 22 down.
  def(0x684C, 'draw_menu_frame', r => {
    setw(0x5B1A, 0x1607);
    for (let i = 0; i < 12; i++) { P.print_panel_text({ a: 4 }); M[0x5B1A] = (M[0x5B1A] + 1) & 255; }
    return {};
  });

  // attack_terrain: a creature walking into a square it cannot enter attacks the terrain: not on the
  // ground carrying nothing that allows it (ATTACK NOT ALLOWED); it needs six action points and six
  // stamina (NOT ENOUGH ...), which it pays; then the hit, and the terrain destroyed when a random
  // number below twice the creature's combat ($D1FE) reaches its strength, leaving what its record
  // says. The computer's creature has $D181 set instead of a message.
  def(0x6862, 'attack_terrain', function* (r) {
    if (!M[0x5B43] && P.find_partner({}).zf) return yield* P.show_message({ a: 0xB6 });
    let msg = 0;
    if (M[0xD1FB] < 6) msg = 0xB4;
    else if (M[0xD1FC] < 6) msg = 0xB5;
    if (msg) {
      if (M[0xD063] & 1) { M[0xD181] = 1; return {}; }
      yield* P.show_message({ a: msg });
      P.IFF = true;
      return {};
    }
    const c = w(0x5B50);
    M[c] = M[0xD1FB] = (M[c] - 6) & 255;
    M[(c + 1) & 0xFFFF] = M[0xD1FC] = (M[(c + 1) & 0xFFFF] - 6) & 255;
    P.IFF = false;
    P.keep_figures({});
    if (!M[0xD066]) P.draw_hit({ de: w(0xFF8A) });
    const iy = P.terrain_record_here({}).iy;
    const a = P.random_below_a({ a: (2 * M[0xD1FE]) & 255 }).a;
    if (a >= M[(iy + 1) & 0xFFFF]) {
      M[0x5B10] = (M[(iy + 4) & 0xFFFF] & 0xC0) >> 6;
      P.set_terrain_under({ de: w(0xFF8A), a: M[0x5B10] });
      const hl = P.map_address({ hl: w(0xFF8A) }).hl;
      if (M[hl] < 0x50) M[hl] = M[0x5B10];
    }
    if (M[0xD066]) return {};
    P.draw_map({});
    M[0xD0D0] = M[0xD0D8] = 0;
    M[0xB45B] = 3; M[0xD0D7] = 3;
    P.IFF = true;
    return {};
  });
  def(0x68FC, 'terrain_remains', r => ({ a: (M[(r.iy + 4) & 0xFFFF] & 0xC0) >> 6 }));
};
})(typeof window !== 'undefined' ? window : globalThis);
