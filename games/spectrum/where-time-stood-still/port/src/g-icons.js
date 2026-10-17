// The menus' icons, pointer and windows (bank 3, $C8C5-$D087, $D9A5-$DA0C, $EA3D, $FB60-$FB9A):
// the menus opened and drawn into the menu buffer, their icons kept up to date, the pointer and
// the windows moved, and the actions of the icons.
//
// A menu's icon is five bytes: its picture (bit 7 one made of characters; $0D on an object's),
// its column in characters and its row in pixels in the window, the mask of what may pick it
// ($C890: 7 normally, 8 after USE ITEM; $FF always) and its action ($CD0F). The window being drawn
// is copied to $AA70 (copy_window), its width at $AA75; the menu buffer is at $5B00, its
// attributes at $60E8.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.icons = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);

  // click ($C8C5): 75 toggles of the beeper
  P.def(0xC8C5, 'click', () => {
    let a = 0;
    for (let c = 0x4B; c > 0; c--) { a ^= 0x10; P.io.out((a << 8) | 0xFE, a); }
    return { a, b: 0, c: 0, zf: true };
  });

  // redraw_dragged ($C8EE): while $C892 counts down, the view behind the open window redrawn over
  // its place and a margin round it
  P.def(0xC8EE, 'redraw_dragged', () => {
    const n = M[0xC892];
    if (!n) return { zf: true, a: 0 };
    M[0xC892] = n - 1;
    let rec = 0xC899;
    if (!(M[0x8D22] & 0x18)) {
      rec = 0xC8A6;
      if (!(M[0x8D22] & 3)) return { zf: true, a: 0 };
    }
    P.redraw_area({ hl: rec });
    P.redraw_behind({});
    return { zf: false };
  });

  // --- who is where ---
  // find_actor ($FB60): Z with HL at the actor of type A when it is in play (+1 not $FF)
  P.def(0xFB60, 'find_actor', r => {
    const t = r.a & 255;
    for (let hl = 0x8300; hl < 0x8400; hl += 0x20) {
      if (M[hl] !== t || M[hl + 1] === 0xFF) continue;
      return { zf: true, a: 0, hl, de: (t << 8) | 0x20 };
    }
    return { zf: false, a: t, b: 1, hl: 0x8400, de: 0x20 };
  });
  // within_reach ($FB7C): Z (A 0) when character A is in play in a state under 7; in play in
  // another, NZ with A its state; away from the area, its record's state (low six bits), with
  // carry when that is under 7
  P.def(0xFB7C, 'within_reach', r => {
    const f = P.find_actor({ a: r.a });
    if (f.zf) {
      const s = M[lo(f.hl, 1)];
      if (s >= 7 && s !== 7) return { zf: false, cf: false, a: s, hl: lo(f.hl, 1) };
      return { zf: true, cf: false, a: 0, hl: f.hl };
    }
    const rec = P.record_of({ a: f.a, hl: f.hl, de: f.de, b: f.b }).hl;
    const s = M[(rec + 1) & 0xFFFF] & 0x3F;
    if (s < 7) return { zf: false, cf: true, a: s, hl: rec };
    return { zf: false, cf: false, a: s | 1, hl: rec };
  });

  // --- keeping the icons up to date ---
  // update_icons ($C913): menu 2 or the end has update_inventory. Menu 1 ($C91B): its colour
  // (cyan in play, magenta once the leader has died), redrawn when that changes; then each
  // portrait is lit (its mask $FF, its list's colour 7) for a character within reach, or one away
  // from the area in a state under 7 once the leader has died, or dimmed (0, colour 6)
  const icons1 = () => {
    P.copy_window({ hl: 0xC8A6 });
    const c = P.portraits_state({}).c;
    if (M[0x60E8] !== c) { P.menu_colour({ a: c }); P.open_menu_1_ce91({}); }
    let de = 0xD08B;
    for (let k = 0; k < 4; k++, de = (de + 5) & 0xFFFF) {
      const r = P.within_reach({ a: k, de });
      const a = r.zf || (r.cf && M[0x8D09]) ? 0xFF : 0;
      const same = M[de] === a;
      M[de] = a;
      if (same) continue;
      M[(0xD1DC + k * 10) & 0xFFFF] = a ? 7 : 6;
      P.icon_colours({ hl: (de - 3) & 0xFFFF });
    }
    return {};
  };
  P.def(0xC913, 'update_icons', () => (M[0x8D22] & 0x38 ? P.update_inventory({}) : icons1()));
  P.def(0xC91B, 'update_icons_c91b', icons1);
  // update_inventory ($C983): menu 2, for the character picked ($D0B0), unless the game is over:
  // closed if the character is out of reach; USE ITEM drawn for one standing still (state 3) or
  // STOP otherwise; its colour (green, or yellow while the bag is open, $C898 bit 1); the four
  // slots filled with the character's objects (or the bag's) and the three with those on the
  // ground here ($8D1F)
  P.def(0xC983, 'update_inventory', () => {
    if (M[0x8D10]) return { zf: false };
    P.copy_window({ hl: 0xC899 });
    const ch = M[0xD0B0] & 0x7F;
    const r = P.within_reach({ a: ch });
    if (!r.zf) return P.quit_menu({});
    const a = M[lo(r.hl, 1)] === 3 ? 0x0C : 0x8A;
    const same = M[0xD0BA] === a;
    M[0xD0BA] = a;
    if (!same) P.draw_icon({ hl: 0xD0BA });
    let c = ch | 0x20, col = 0x42;
    if (M[0xC898] & 2) { col = 0x44; c = 0x24; }
    if (M[0x60E8] !== col) { P.menu_colour({ a: col }); P.open_menu_2_ce6b({}); }
    fill(0xD0BF, 4, c, 0x0A);
    return fill(0xD0D3, 3, M[0x8D1F] | 0x80, 4);
  });
  // fill_slots ($C9E8): B slots from HL filled with the objects (17 records of 7 bytes, owner at
  // $ECD9) whose owner is C, picture $0D plus the object, mask A (written into $CA09); the rest
  // empty (picture 5, mask 0). A slot is drawn again only when it changes (the dynamite, $17,
  // always).
  const fill = (hl, b, c, mask) => {
    M[0xCA09] = mask;
    let de = 0xECD9;
    for (let n = 0x11; n > 0; n--, de = (de + 7) & 0xFFFF) {
      if (M[de] !== c) continue;
      const a = ((M[(de - 1) & 0xFFFF] & 0x1F) + 0x0D) & 255;
      if (a === 0x17 || a !== M[hl]) {
        M[hl] = a; M[(hl + 3) & 0xFFFF] = M[0xCA09];
        P.draw_icon({ hl });
      }
      hl = (hl + 5) & 0xFFFF;
      if (!--b) return { zf: true, b: 0, hl };
    }
    for (; b > 0; b--, hl = (hl + 5) & 0xFFFF) {
      if (M[hl] === 5) continue;
      M[hl] = 5; M[(hl + 3) & 0xFFFF] = 0;
      P.draw_icon({ hl });
    }
    return { b: 0, hl };
  };
  P.def(0xC9E8, 'fill_slots', r => fill(r.hl, r.b & 255, r.c & 255, r.a & 255));

  // --- the pointer and the windows ---
  // menu_move ($CA49): with a menu fully open, an input code 0 to 8 moves the pointer by the
  // table at $CA6F
  P.def(0xCA49, 'menu_move', () => {
    const code = M[0x8D20];
    if (code >= 9) return { cf: false };
    const m = M[0x8D22];
    let hl;
    if (m === 3) hl = 0xC8A6; else if (m === 0x18) hl = 0xC899; else return { zf: false };
    P.copy_window({ hl });
    const to = w((0xCA6F + 2 * code) & 0xFFFF);
    return P.jump(to, { a: (2 * code) & 255, bc: (2 * code) & 255, hl: to, de: (0xCA70 + 2 * code) & 0xFFFF });
  });
  // pointer_left ($CAA7) and the others: 6 pixels left (to 0), right (no further than the
  // window's width less the pointer's, $C8BA), up (to 0), down (to 72 less its height, $C8BB)
  const left = () => { const a = M[0x8D23] - 6; M[0x8D23] = a < 0 ? 0 : a; };
  const right = () => {
    const c = ((M[0xAA75] - M[0xC8BA]) * 8) & 255;
    const a = (M[0x8D23] + 6) & 255;
    M[0x8D23] = a < c ? a : c;
  };
  const up = () => { const a = M[0x8D24] - 6; M[0x8D24] = a < 0 ? 0 : a; };
  const down = () => {
    const c = (0x48 - M[0xC8BB]) & 255;
    const a = (M[0x8D24] + 6) & 255;
    M[0x8D24] = a < c ? a : c;
  };
  const moves = (...f) => () => { for (const g of f) g(); return {}; };
  P.def(0xCAA7, 'pointer_left', moves(left));
  P.def(0xCAB3, 'pointer_right', moves(right));
  P.def(0xCACB, 'pointer_up', moves(up));
  P.def(0xCAD7, 'pointer_down', moves(down));
  P.def(0xCA93, 'pointer_up_right', moves(up, right));
  P.def(0xCA98, 'pointer_up_right_ca98', moves(down, right));
  P.def(0xCA9D, 'pointer_up_right_ca9d', moves(up, left));
  P.def(0xCAA2, 'pointer_up_right_caa2', moves(down, left));
  P.def(0xCA48, 'menu_none', () => ({}), true);

  // redraw_area ($CBC5): the window's record at HL copied to $AA70 and widened by a column left
  // and two right within the screen, and by a character row above and below within the view, for
  // the redraw behind it
  P.def(0xCBC5, 'redraw_area', r => {
    P.copy_window({ hl: r.hl });
    if (M[0xAA72]) M[0xAA72]--;
    const c = (M[0xAA75] + 2) & 255, sum = (M[0xAA72] + c) & 255;
    if (sum === 0x21) M[0xAA75] = c - 1; else if (sum < 0x21) M[0xAA75] = c;
    const v = w(0xAA7B) - 0x10;
    if ((v & 0xFFFF) - 0x8D4D - (v < 0 ? 1 : 0) >= 0) { setw(0xAA7B, v & 0xFFFF); M[0xAA76] = (M[0xAA76] + 1) & 255; }
    if (w(0xAA7B) < 0x8E2D) M[0xAA76] = (M[0xAA76] + 1) & 255;
    return {};
  });
  // the window's moves when fire is held off the icons (HL its record): window_up ($CC49) a
  // character row up, within the view's top ($8D4D); $CC4E down, within its bottom ($8E3E); a
  // column left ($CC22), to 0; right ($CC35), to 32 less its width; and the diagonals
  const vmove = (rec, by) => {
    const p = (rec + 0x0B) & 0xFFFF, v = (w(p) + by) & 0xFFFF;
    if (by & 0x8000 ? v < 0x8D4D : v >= 0x8E3E) return { cf: true, hl: rec };
    setw(p, v);
    return { cf: false, hl: rec };
  };
  const hleft = rec => { const p = (rec + 2) & 0xFFFF; if (M[p]) M[p]--; return { hl: rec }; };
  const hright = rec => {
    const p = (rec + 2) & 0xFFFF, c = (M[p] + 1) & 255;
    if (((0x20 - M[(rec + 5) & 0xFFFF]) & 255) >= c) M[p] = c;
    return { hl: rec };
  };
  P.def(0xCC49, 'window_up', r => vmove(r.hl, 0xFFF0));
  P.def(0xCC4E, 'window_up_cc4e', r => vmove(r.hl, 0x10));
  P.def(0xCC22, 'window_down_left_cc22', r => hleft(r.hl));
  P.def(0xCC35, 'window_down_left_cc35', r => hright(r.hl));
  P.def(0xCC1A, 'window_down_left', r => hleft(vmove(r.hl, 0x10).hl));
  P.def(0xCC1F, 'window_down_left_cc1f', r => hleft(vmove(r.hl, 0xFFF0).hl));
  P.def(0xCC2D, 'window_down_left_cc2d', r => hright(vmove(r.hl, 0x10).hl));
  P.def(0xCC32, 'window_down_left_cc32', r => hright(vmove(r.hl, 0xFFF0).hl));

  // --- the icons' actions (A the action) ---
  // pick_character ($CD33): a portrait in menu 1: that character's menu 2 opens as menu 1 closes
  P.def(0xCD33, 'pick_character', r => {
    M[0xD0B0] = ((r.a - 1) & 255) | 0x80;
    return P.pick_character_cd39({});
  });
  // $CD39: menu 2 opens as menu 1 closes, with the icons already at $D0B0 (the end screen's)
  P.def(0xCD39, 'pick_character_cd39', () => {
    M[0x8D22] = 0x0A;
    setw(0xC89C, 0x0409); setw(0xC899, 0x0103);
    return {};
  });
  // ask_new_game ($CD4B): pause and sound become yes ($0B, action 16) and no ($0C, 17); $CD69
  // puts them back; $CD71, yes, starts a new game
  const swap = (de, bc) => {
    M[0xD0A1] = de & 255; M[0xD0A5] = de >> 8;
    M[0xD0A6] = bc & 255; M[0xD0AA] = bc >> 8;
    P.draw_icon({ hl: 0xD0A6 });
    return P.draw_icon({ hl: 0xD0A1 });
  };
  P.def(0xCD4B, 'ask_new_game', () => swap(0x100B, 0x110C));
  P.def(0xCD69, 'ask_new_game_cd69', () => swap(0x0687, 0x0788));
  P.def(0xCD71, 'ask_new_game_cd71', () => { swap(0x0687, 0x0788); return P.new_game({}); });
  // toggle_music ($CD77): the sound driver asked for tune 4 (effects only) and 14 (music) in turn,
  // the next choice kept in the operand at $CD7B
  P.def(0xCD77, 'toggle_music', () => {
    const a = M[0xCD7B] ^ 0x0A;
    M[0x7002] = a; M[0xCD7B] = a;
    return { a, hl: 0x7002 };
  });
  // use_item ($CD83): USE ITEM: the next object picked is used ($C890 8, the icon lit), or that
  // undone; a character not standing still (STOP, $8A) is told to stop instead (state 1, action
  // $80)
  P.def(0xCD83, 'use_item', () => {
    if (M[0xD0BA] === 0x8A) {
      M[0xC890] = M[0xC890] === 8 ? 6 : 8;
      M[0xD142] ^= 0x76;
      return P.draw_icon({ hl: 0xD0BA });
    }
    const f = P.find_actor({ a: M[0xD0B0] & 0x7F });
    if (!f.zf) return f;
    const p = lo(f.hl, 1);
    if (M[p] !== 3) return { zf: false };
    M[p] = 1;
    M[lo(p, 0x0B)] = 0x80;
    return {};
  });
  // quit_menu ($CDBB): the arrow put back as the pointer; when the game is over a new game; with
  // the bag open, back to the character's own objects; otherwise the menu closes ($8D22 2 for
  // menu 1, $10 for menu 2)
  P.def(0xCDBB, 'quit_menu', () => {
    P.ldir(0xC8BC, 0xC8B3, 9);
    if (M[0x8D10]) { M[0x8D22] = 0x10; return P.new_game({}); }
    if (M[0xC898] & 2) { M[0xC898] ^= 2; return {}; }
    const was = M[0x8D22] & 0x18;
    M[0x8D22] = was ? 0x10 : 2;
    return { zf: !was };
  });
  // take_object ($CE13): fire on an object's icon (DE at its action): the object becomes the
  // pointer, its picture's record from bank 6 ($F1B1, six bytes) and its size, the pointer kept
  // inside the window, and is dragged ($C890 bit 7)
  P.def(0xCE13, 'take_object', r => {
    const n = (M[(r.de - 4) & 0xFFFF] - 0x0D) & 255;
    M[0xC891] = n;
    P.copy_from_bank6({ de: (0xF1B1 + ((n * 6) & 255)) & 0xFFFF, c: 6, bc: 6 });
    M[0xC8BA] = M[0x8521]; M[0xC8BB] = M[0x8522];
    const a = (0x48 - M[0x8522]) & 255;
    if (a < M[0x8D24]) M[0x8D24] = a;
    P.ldir(0x8523, 0xC8B3, 4);
    M[0xC890] |= 0x80;
    return {};
  });

  // --- opening and drawing the menus ---
  // open_menu_2 ($CE57): a click on channel B; the end screen when the game is over; otherwise
  // menu 2's colour, inventory and frame and icons ($CE6B)
  const menu2 = () => P.draw_menu({ b: 0x0A, de: 0xD0B0, hl: 0xC899, a: 0x93 });
  P.def(0xCE57, 'open_menu_2', () => {
    M[0x701F] = 7;
    if (M[0x8D10]) return P.end_screen({});
    P.menu_colour({ a: 0x42 });
    P.update_inventory({});
    return menu2();
  });
  P.def(0xCE6B, 'open_menu_2_ce6b', menu2);
  // open_menu_1 ($CE77): SPACE: a click; menu 1 opens from its middle, the pointer at 16 across
  // and 50 down; its icons brought up to date and its frame and eight icons drawn ($CE91)
  const menu1 = () => P.draw_menu({ b: 8, de: 0xD088, hl: 0xC8A6, a: 0x8F });
  P.def(0xCE77, 'open_menu_1', () => {
    M[0x701F] = 7;
    setw(0x8D23, 0x3210); setw(0xC8A9, 0x0407); setw(0xC8A6, 0x0103);
    P.update_icons_c91b({});
    return menu1();
  });
  P.def(0xCE91, 'open_menu_1_ce91', menu1);
  // draw_menu ($CE9B): the window HL's frame (its list at $D0E2 sized by $EA3D, A across by 2) and
  // its B icons from DE
  P.def(0xCE9B, 'draw_menu', r => {
    P.copy_window({ hl: r.hl });
    P.frame_size({ b: r.a & 255, c: 2 });
    P.draw_menu_frame({ b: M[0xAA75], c: M[0xAA76] });
    let hl = r.de;
    for (let b = r.b & 255 || 256; b > 0; b--, hl = (hl + 5) & 0xFFFF) P.draw_icon({ hl });
    return { b: 0, hl };
  });
  // portraits_state ($CEC1): the four portraits' pictures ($D08C on, five apart) 1 to 4 in play,
  // $0C to $0F once the leader has died ($8D09); C the menu's colour, $45 or $43
  P.def(0xCEC1, 'portraits_state', () => {
    let c = 0x45, a = M[0x8D09];
    if (a) { c = 0x43; a = 0x0B; }
    let hl = 0xD08C;
    for (let b = 4; b > 0; b--, hl += 5) { a = (a + 1) & 255; M[hl] = a; }
    return { a, b: 0, c, hl, de: 5 };
  });
  // menu_colour ($CEDC): the menu's 189 attributes from $60E8 set to A
  P.def(0xCEDC, 'menu_colour', r => {
    M.fill(r.a & 255, 0x60E8, 0x60E8 + 0xBD);
    return { hl: 0x60E8 + 0xBC, de: 0x60E8 + 0xBD, bc: 0 };
  });

  // draw_icon ($CEE9): the icon at HL into the menu buffer: its colours, then its picture: one of
  // characters ($CFE3), an object's ($CF42), or a bitmap three bytes across from the list $D106
  // points to ($CF1C: 24 rows for pictures 0 to 3, 16 for the rest, written into $CF2C)
  P.def(0xCEE9, 'draw_icon', r => {
    const hl = r.hl;
    P.icon_colours({ hl });
    const pic = M[hl], col = M[(hl + 1) & 0xFFFF], row = M[(hl + 2) & 0xFFFF];
    const at = (((M[0xAA75] * row) & 0xFFFF) + col + 0x5B00) & 0xFFFF;
    if (pic & 0x80) return P.draw_char_icon({ a: pic, hl: at });
    M[0xCF2C] = pic < 4 ? 0x18 : 0x10;
    if (pic >= 0x0D) return P.draw_object_icon({ a: pic, hl: at });
    return bitmap(pic, at);
  });
  const bitmap = (pic, de) => {
    let hl = (w((0xD106 + ((pic * 2) & 255)) & 0xFFFF) + 1) & 0xFFFF;
    for (let b = M[0xCF2C] || 256; b > 0; b--) {
      for (let k = 0; k < 3; k++) { M[de] = M[hl]; de = (de + 1) & 0xFFFF; hl = (hl + 1) & 0xFFFF; }
      de = (de + ((M[0xAA75] - 3) & 255)) & 0xFFFF;
    }
    return { b: 0, de, hl };
  };
  P.def(0xCF1C, 'draw_icon_cf1c', r => bitmap(r.a & 255, r.hl));
  // draw_object_icon ($CF42): the empty slot, then the object's picture from bank 6 (its record
  // at $F1B1: width, height and the address of its rows) ORed over it, centred down the slot; a
  // picture two bytes across is moved half a byte right, one of width 4 three across as it is.
  // The other A comes back changed (af_, which use_knife reads at $F8D6): $FF, left by
  // copy_from_bank6, for a picture of width 4; otherwise the middle byte of the last row drawn
  P.def(0xCF42, 'draw_object_icon', r => {
    let hl = r.hl, af_ = 0xFF00;
    bitmap(5, hl);
    const n = (r.a - 0x0D) & 255;
    P.copy_from_bank6({ de: (0xF1B1 + ((n * 6) & 255)) & 0xFFFF, c: 6, bc: 6 });
    const rows = M[0x8522];
    const gap = 0x10 - rows;
    if (gap >= 0) for (let k = (gap & 255) >> 1; k > 0; k--) hl = (hl + M[0xAA75]) & 0xFFFF;
    const width = M[0x8521];
    P.copy_from_bank6({ de: M[0x8523] | M[0x8524] << 8, c: 0x30, bc: 0x30 });
    let src = 0x8521, de = hl;
    for (let b = rows || 256; b > 0; b--) {
      if (width === 4) {
        for (let k = 0; k < 3; k++) { M[de] |= M[src]; de = (de + 1) & 0xFFFF; src = (src + 1) & 0xFFFF; }
        de = (de + ((M[0xAA75] - 3) & 255)) & 0xFFFF;
        continue;
      }
      const v = (M[src] << 16 | M[(src + 1) & 0xFFFF] << 8) >>> 4;
      src = (src + 2) & 0xFFFF;
      M[de] |= (v >> 16) & 255; M[(de + 1) & 0xFFFF] |= (v >> 8) & 255; M[(de + 2) & 0xFFFF] |= v & 255;
      af_ = M[(de + 1) & 0xFFFF] << 8;
      de = (de + 2 + ((M[0xAA75] - 2) & 255)) & 0xFFFF;
    }
    return { b: 0, af_ };
  });
  // draw_char_icon ($CFE3): an icon of characters, three across by three rows (two for pictures 5
  // on), from the list $D106 points to; the width written into $D9FF and eight times it into $D01A
  P.def(0xCFE3, 'draw_char_icon', r => {
    const pic = r.a & 0x7F;
    let de = r.hl;
    let hl = (w((0xD106 + ((pic * 2) & 255)) & 0xFFFF) + 1) & 0xFFFF;
    M[0xD9FF] = M[0xAA75];
    M[0xD01A] = (M[0xAA75] * 8) & 255;
    for (let c = pic < 5 ? 3 : 2; c > 0; c--) {
      for (let k = 0; k < 3; k++, hl = (hl + 1) & 0xFFFF) P.draw_menu_char({ a: M[hl], de: (de + k) & 0xFFFF });
      de = (de + M[0xD01A]) & 0xFFFF;
    }
    return { c: 0 };
  });
  // icon_colours ($D025): the icon at HL's attributes in the menu, three across by three rows (two
  // for pictures 5 on): an object's colour from $F616, any other's the first byte of its list
  P.def(0xD025, 'icon_colours', r => {
    const hl = r.hl, pic = M[hl] & 0x7F, col = M[(hl + 1) & 0xFFFF], row = (M[(hl + 2) & 0xFFFF] >> 3) & 0x1F;
    let de = (((M[0xAA75] * row) & 0xFFFF) + col + 0x60E8) & 0xFFFF;
    const c = pic >= 0x0D ? M[(0xF616 + pic - 0x0D) & 0xFFFF] : M[w((0xD106 + pic * 2) & 0xFFFF)];
    for (let b = pic < 5 ? 3 : 2; b > 0; b--) {
      M[de] = c; M[(de + 1) & 0xFFFF] = c; M[(de + 2) & 0xFFFF] = c;
      de = (de + 2 + ((M[0xAA75] - 2) & 255)) & 0xFFFF;
    }
    return { hl, a: c, c, b: 0 };
  });

  // --- the menu frame ---
  // frame_size ($EA3D): the frame list at $D0E2 sized: 8 at +3, B at +1 and +$21, and B and C as
  // the first two bytes of each of seven entries four apart from $D0E7
  P.def(0xEA3D, 'frame_size', r => {
    M[0xD0E5] = 8;
    M[0xD0E3] = r.b; M[0xD103] = r.b;
    let hl = 0xD0E7;
    for (let b = 7; b > 0; b--, hl += 4) { M[hl] = r.b; M[hl + 1] = r.c; }
    return { a: r.b, b: 0, hl, de: 3 };
  });
  // draw_menu_frame ($D9A5): the frame list at $D0E2 drawn into the menu buffer at $5B00 ($D9AB:
  // list HL, buffer DE), B characters across by C rows; a byte with bit 7 repeats the next its
  // low bits times. The width goes into $D9FF and seven times it into $D9E5.
  const frame = (hl, de, b0, c) => {
    M[0xD9A4] = 0;
    M[0xD9FF] = b0;
    M[0xD9E5] = ((b0 * 8) - b0) & 255;
    do {
      for (let b = b0 || 256; b > 0; b--) {
        let a = M[hl];
        if (a & 0x80) { M[0xD9A4] = ((a & 0x7F) - 1) & 255; hl = (hl + 1) & 0xFFFF; a = M[hl]; }
        P.draw_menu_char({ a, de });
        if (M[0xD9A4]) M[0xD9A4]--; else hl = (hl + 1) & 0xFFFF;
        de = (de + 1) & 0xFFFF;
      }
      de = (de + M[0xD9E5]) & 0xFFFF;
      c = (c - 1) & 255;
    } while (c);
    return { hl, de };
  };
  P.def(0xD9A5, 'draw_menu_frame', r => frame(0xD0E2, 0x5B00, r.b & 255, r.c & 255));
  P.def(0xD9AB, 'draw_menu_frame_d9ab', r => frame(r.hl, r.de, r.b & 255, r.c & 255));
  // draw_menu_char ($D9F1): character A of $D218 at DE, its eight rows the width at $D9FF apart
  P.def(0xD9F1, 'draw_menu_char', r => {
    let de = (((r.a & 255) * 8) + 0xD218) & 0xFFFF, hl = r.de;
    const bc = M[0xD9FF];
    for (let k = 0; k < 8; k++) { M[hl] = M[de]; hl = (hl + bc) & 0xFFFF; de = (de + 1) & 0xFFFF; }
    return { hl, de, b: 0, c: bc, a: 0 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
