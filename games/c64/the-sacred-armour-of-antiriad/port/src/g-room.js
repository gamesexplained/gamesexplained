// The rooms: the room change the main loop makes when Tal leaves by an edge, and the builder that
// draws a room from its map of tiles, the edge columns of the rooms either side, its characters,
// colours, sprites, armour and animated tiles; the screen clearing they share.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.room = function (P) {
  const M = P.M, io = P.io, R = P.irqByte;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;

  // room_change ($84DB): the room through the edge zp_room_exit names (bits 0-1: right, left, up,
  // down), built; a link with bit 7 set rebuilds the same room. Rooms 0 and 1, the power centre,
  // ask voice 2 for track $9B, and without the Particle Negator empty the suit's energy and queue
  // message $8B. zp_pass_count counts the passes.
  P.room_change = function () {
    const a = R(0x6B);
    if (a & 0x80) {
      const y = a & 3;
      P.room_link_ptr({ a: M[0x5B] });
      const v = M[at(0x0E, y)];
      if (!(v & 0x80)) M[0x5B] = v;
      P.build_room();
      if (M[0x5B] < 2) {
        M[0x035F] = 0x9B;
        if (!(R(0x067F) & 0x80)) { M[0x4F] = 0; P.queue_message({ a: 0x8B }); }
      }
      M[0x6B] = 0;
    }
    M[0xB4] = (M[0xB4] + 1) & 255;
    return {};
  };
  // room_link_ptr ($8510): zp_ptr_0e at room A's four links, room_links ($F25A) + 4 × A.
  P.room_link_ptr = function (r) {
    setw(0x0E, 0xF25A + ((r.a << 2) & 0x3FC));
    return { a: M[0x0F] };
  };

  // build_room ($852C): the sprites and the filter off, the playfield cleared, the room's 8 × 4
  // tiles drawn in tile columns 1-8, the edge tiles of the rooms to the left (column 0, their
  // eighth tile column) and right (column 9, their first), each with its own characters loaded
  // first, then the room's characters, colours and everything in it.
  P.build_room = function () {
    P.sei();
    M[0x0215] = 0; io.vicWrite(0x15, 0); M[0x0246] = 0; io.sidWrite(0x17, 0);
    P.cli();
    P.clear_screen_ram();
    P.room_map_ptr({ a: M[0x5B] });
    M[0x5F] = 0; M[0x5D] = 0;
    do {
      M[0x5C] = 1;
      do {
        P.tile_ptr({ a: M[at(0x0A, M[0x5F])] });
        P.draw_tile();
        M[0x5F] = (M[0x5F] + 1) & 255;
        M[0x5C] = (M[0x5C] + 1) & 255;
      } while (M[0x5C] < 9);
      M[0x5D] = (M[0x5D] + 1) & 255;
    } while (M[0x5D] < 4);
    P.room_link_ptr({ a: M[0x5B] });
    M[0x5C] = 0; M[0x5D] = 0;
    let v = M[at(0x0E, 1)];
    if (!(v & 0x80)) {
      P.load_room_chars({ a: v });
      P.room_map_ptr({ a: v });
      setw(0x0A, w(0x0A) + 7);
      P.draw_edge_column();
    }
    M[0x5C] = 9; M[0x5D] = 0;
    v = M[at(0x0E, 0)];
    if (!(v & 0x80)) {
      P.load_room_chars({ a: v });
      P.room_map_ptr({ a: v });
      P.draw_edge_column();
    }
    P.load_room_chars({ a: M[0x5B] });
    P.colour_room();
    P.clear_room_objects();
    P.place_room_sprites();
    P.place_armour();
    P.load_room_animations();
    P.animate_tiles();
    P.animate_sprites();
    P.run_paths();
    return {};
  };
  // draw_edge_column ($85C8): the tile at zp_ptr_0a and every eighth after it, down tile column
  // zp_tile_col.
  P.draw_edge_column = function () {
    do {
      P.tile_ptr({ a: M[w(0x0A)] });
      P.draw_tile();
      setw(0x0A, w(0x0A) + 8);
      M[0x5D] = (M[0x5D] + 1) & 255;
    } while (M[0x5D] < 4);
    return {};
  };
  // load_room_chars ($85E8): room A's character list (room_charset, char_list_ptrs): a count of
  // runs, each a first and a last character code and an offset into the shape pool ($2400) and
  // the colour pool ($3C00): each run's colours into char_colour ($0561) and its shapes into the
  // playfield's character set at $7800. The runs and the characters are counted for the page's
  // clock (P.N).
  P.load_room_chars = function (r) {
    const x0 = (M[0xF761 + r.a] << 1) & 255;
    M[0x26] = M[0x3F00 + x0]; M[0x27] = M[0x3F01 + x0];
    M[0x62] = 0;
    M[0x53] = M[w(0x26)];
    while (M[0x53]) {
      P.N.runs = (P.N.runs || 0) + 1;
      let y = M[0x62];
      y = (y + 1) & 255; M[0x16] = M[at(0x26, y)];
      y = (y + 1) & 255; M[0x58] = (((M[at(0x26, y)] - M[0x16]) & 255) + 1) & 255;
      y = (y + 1) & 255; let s = M[at(0x26, y)] + M[0x16]; M[0x14] = s & 255;
      y = (y + 1) & 255; M[0x15] = (M[at(0x26, y)] + (s >> 8)) & 255;
      M[0x62] = y;
      M[0x17] = 0;
      M[0x04] = M[0x14]; M[0x05] = (M[0x15] + 0x3C) & 255;
      let x = M[0x16], i = 0;
      do { M[0x0561 + x] = M[at(0x04, i)]; x = (x + 1) & 255; i = (i + 1) & 255; } while (i < M[0x58]);
      setw(0x16, (w(0x16) << 3) & 0xFFFF); setw(0x14, (w(0x14) << 3) & 0xFFFF);
      M[0x17] = (M[0x17] + 0x78) & 255;
      M[0x15] = (M[0x15] + 0x24) & 255;
      do {
        P.N.chars = (P.N.chars || 0) + 1;
        for (let j = 7; j >= 0; j--) M[at(0x16, j)] = M[at(0x14, j)];
        setw(0x14, w(0x14) + 8); setw(0x16, w(0x16) + 8);
        M[0x58] = (M[0x58] - 1) & 255;
      } while (M[0x58]);
      M[0x53] = (M[0x53] - 1) & 255;
    }
    return {};
  };
  // colour_room ($869C): the room's two shared colours (room_mc_colours, $F71C: low nibble $D022,
  // high $D023, none for a room in hires) and colour RAM rows 0-15 from char_colour.
  P.colour_room = function () {
    const a = M[0xF71C + M[0x5B]];
    M[0x4B] = a;
    if (a) { M[0x4D] = a & 0x0F; M[0x4E] = a >> 4; M[0x4B] = 0x10; }
    M[0x60] = 0x0F;
    do {
      const y = M[0x60] << 1, lo = M[0xF128 + y], hi = M[0xF129 + y];
      M[0x02] = M[0x04] = lo; M[0x03] = hi; M[0x05] = (hi + 0x98) & 255;
      for (let i = 0x27; i >= 0; i--) {
        const c = M[at(0x02, i)];
        P.wr(at(0x04, i), c ? M[0x0561 + c] : 0);
      }
      M[0x60] = (M[0x60] - 1) & 255;
    } while (!(M[0x60] & 0x80));
    return {};
  };
  // clear_room_objects ($86E2): each slot's dissolving or materialising enemy's background put
  // back (restore_sprite_shape), and the slots' enemy state at $0290-$02BF cleared.
  P.clear_room_objects = function () {
    for (let x = 7; x >= 0; x--) {
      if ((R(0x0290 + x) & 0x80) && R(0x02A0 + x)) P.restore_sprite_shape({ x });
      if ((R(0x02A8 + x) & 0x80) && R(0x02B8 + x)) P.restore_sprite_shape({ x });
      M[0x0290 + x] = 0; M[0x02A8 + x] = 0; M[0x0298 + x] = 0;
      M[0x02B0 + x] = 0; M[0x02A0 + x] = 0; M[0x02B8 + x] = 0;
    }
    return { a: 0, x: 0xFF };
  };
  // place_room_sprites ($8716): the room's sprite list (room_sprite_ptrs, $CA16): a count, then X,
  // Y, a path (bit 7 also X bit 8) and an animation for each, from slot 7 down.
  P.place_room_sprites = function () {
    P.reset_sprite_slots();
    const x2 = (M[0x5B] << 1) & 255;
    M[0x0A] = M[0xCA16 + x2]; M[0x0B] = M[0xCA17 + x2];
    let y = 0;
    const n = M[w(0x0A)];
    if (!n) return {};
    M[0x71] = n;
    let x = 7;
    do {
      M[0x63] = x;
      const s = (x << 1) & 255;
      y = (y + 1) & 255; let a = M[at(0x0A, y)]; M[0x0200 + s] = a; io.vicWrite(s, a);
      y = (y + 1) & 255; a = M[at(0x0A, y)]; M[0x0201 + s] = a; io.vicWrite(s + 1, a);
      x = M[0x63];
      y = (y + 1) & 255; const path = M[at(0x0A, y)];
      M[0x02D8 + x] = path | 0x80;
      P.sei(); M[0x0210] = R(0x0210) & M[0xF120 + x]; P.cli();
      if (path & 0x80) { P.sei(); M[0x0210] = R(0x0210) | M[0xF118 + x]; P.cli(); }
      y = (y + 1) & 255; a = M[at(0x0A, y)]; M[0x02A8 + x] = a; M[0x0260 + x] = a;
      M[0x62] = y;
      P.skip_taken_item({ x });
      P.set_enemy_stats({ x });
      y = M[0x62];
      x = (x - 1) & 255;
      M[0x71] = (M[0x71] - 1) & 255;
    } while (M[0x71]);
    P.hold_back_group();
    P.place_bomber();
    return {};
  };
  // reset_sprite_slots ($878B): slots 2-7 emptied, and voice 2 asked for track $A0.
  P.reset_sprite_slots = function () {
    for (let x = 2; x < 8; x++) {
      P.reset_slot_path({ x });
      M[0x02D8 + x] = 0; M[0x0260 + x] = 0; M[0x0268 + x] = 0; M[0x0280 + x] = 0; M[0x0288 + x] = 0;
      M[0x0270 + x] = 2;
    }
    M[0x035F] = 0xA0;
    return {};
  };
  // skip_taken_item ($87AF): slot X emptied when it holds an add-on Tal owns (item_anims, $FC54;
  // addon_fitted) or a recharge cell ($C6) this room's bit in cells_taken ($0661) says is taken.
  P.skip_taken_item = function (r) {
    const x = r.x, a = R(0x0260 + x);
    const empty = () => { M[0x02A8 + x] = 0; M[0x0260 + x] = 0; M[0x02D8 + x] = 0; };
    for (let y = 3; y >= 0; y--) {
      if (a === M[0xFC54 + y]) { if (R(0x067E + y) & 0x80) empty(); return {}; }
    }
    if (a !== 0xC6) return {};
    M[0xA8] = M[0x5B] & 7;
    if (R(0x0661 + (M[0x5B] >> 3)) & M[0xF118 + M[0xA8]]) empty();
    return {};
  };
  // set_enemy_stats ($87F3): slot X's hit points (its contact damage, enemy_damage $C64A, over 4)
  // and points (enemy_points, $C631), when its animation is one of enemy_anims ($C618).
  P.set_enemy_stats = function (r) {
    const x = r.x, a = R(0x0260 + x);
    for (let y = 0x18; y >= 0; y--) {
      if (a === M[0xC618 + y]) { M[0x0280 + x] = M[0xC64A + y] >> 2; M[0x0288 + x] = M[0xC631 + y]; return {}; }
    }
    return {};
  };
  // hold_back_group ($8810): the highest slot to materialise into $D0 or $D1 in zpa_7D (0 for
  // none), and every slot below it, down to slot 3 and stopping at the armour, held back 100
  // frames.
  P.hold_back_group = function () {
    for (let x = 7; x >= 3; x--) {
      M[0x7D] = x;
      const a = R(0x02A8 + x);
      if (a === 0xD1 || a === 0xD0) {
        for (;;) {
          x--;
          if (x < 3) return {};
          const b = R(0x02A8 + x);
          if (b === 0xC0 || b === 0xC1) return {};
          M[0x02B0 + x] = 0x64;
        }
      }
    }
    M[0x7D] = 0;
    return {};
  };
  // place_bomber ($8841): with the bomb-thrower ($C9) in slot 7, slot 5 is worth 20 points and gets
  // its bomb (place_bomb).
  P.place_bomber = function () {
    if (R(0x0267) !== 0xC9) return { x: 7 };
    M[0x028D] = 0x14;
    P.place_bomb();
    return { x: 7 };
  };
  // place_bomb ($884F): the bomb (sprite 5, animation $D2, path $A7) 12 pixels right and 18 down
  // of the thrower on sprite 7, X bit 8 carried.
  P.place_bomb = function () {
    let a = R(0x0210) & M[0xF125];
    M[0x0210] = a;
    if (a & M[0xF11F]) M[0x0210] = R(0x0210) | M[0xF11D];
    a = R(0x020E) + 0x0C;
    M[0x020A] = a & 255;
    if (a > 255) M[0x0210] = R(0x0210) | M[0xF11D];
    M[0x020B] = (R(0x020F) + 0x12) & 255;
    M[0x0265] = 0xD2;
    M[0x02DD] = 0xA7; M[0x030D] = 0xA7; M[0x0305] = 0xA7;
    M[0x02E5] = 0; M[0x02ED] = 0; M[0x02D5] = 0; M[0x026D] = 0;
    M[0x0275] = 2;
    return {};
  };
  // place_armour ($88A7): the armour's two sprites (3 and 4) at its place when it lies in this
  // room and Tal is not wearing it; the suit's flight speeds (zpa_38, zpa_39) cleared.
  P.place_armour = function () {
    if (M[0x5B] === R(0x77) && !(R(0x7B) & 0x80)) {
      const x = R(0x78); M[0x0206] = x; M[0x0208] = x;
      const y = R(0x79); M[0x0207] = y; M[0x0209] = (y + 0x15) & 255;
      M[0x0210] = R(0x0210) & 0xE7;
      M[0x0210] = ((R(0x7A) << 3) & 0x18) | R(0x0210);
      M[0x0263] = 0xC0; M[0x0264] = 0xC1;
    }
    M[0x38] = 0; M[0x39] = 0;
    return {};
  };
  // load_room_animations ($88EA): the animated tiles cleared, the room's list (room_anim_ptrs,
  // $FBAB) started, and its radiation level (room_radiation, $F7A6, a nibble a room) in
  // zp_radiation.
  P.load_room_animations = function () {
    P.clear_tile_anims();
    const x2 = (M[0x5B] << 1) & 255;
    M[0x0A] = M[0xFBAB + x2]; M[0x0B] = M[0xFBAC + x2];
    const n = M[w(0x0A)];
    if (n) {
      M[0x72] = n;
      let y = 0, x = 0;
      do { y = (y + 1) & 255; M[0x0250 + x] = M[at(0x0A, y)] | 0x80; x = (x + 1) & 255; } while (y < M[0x72]);
    }
    M[0x74] = M[0xF7A6 + (M[0x5B] >> 1)];
    if (!(M[0x5B] & 1)) M[0x74] >>= 4;
    M[0x75] = M[0x74] & 3;
    return {};
  };
  // clear_tile_anims ($8930)
  P.clear_tile_anims = function () {
    for (let x = 7; x >= 0; x--) { M[0x0250 + x] = 0; M[0x0248 + x] = 0; M[0x0258 + x] = 3; }
    return {};
  };
  // room_map_ptr ($8943): zp_ptr_0a at room A's map, $0B00 + 32 × A.
  P.room_map_ptr = function (r) {
    setw(0x0A, 0x0B00 + r.a * 32);
    return { a: M[0x0B] };
  };
  // tile_ptr ($896C): zp_ptr_0c at tile A's 16 characters, $1400 + 16 × A.
  P.tile_ptr = function (r) {
    setw(0x0C, 0x1400 + r.a * 16);
    return { a: M[0x0D], x: 0xFF };
  };
  // draw_tile ($8989): the tile at zp_ptr_0c, four rows of four, at tile row zp_tile_row and
  // column zp_tile_col.
  P.draw_tile = function () {
    const x = (M[0x5D] << 3) & 255;
    M[0x02] = M[0xF128 + x]; M[0x03] = M[0xF129 + x];
    let y = (M[0x5C] << 2) & 255;
    M[0x5E] = 0;
    for (;;) {
      M[0x62] = y;
      M[at(0x02, y)] = M[at(0x0C, M[0x5E])];
      y = (y + 1) & 255;
      M[0x5E] = (M[0x5E] + 1) & 255;
      if (M[0x5E] >= 0x10) return { a: M[0x5E], y };
      if (!(M[0x5E] & 3)) y = (y + 0x24) & 255;
    }
  };

  // clear_screen ($8D30): the panel's rows and the playfield's, with their colour RAM.
  P.clear_screen = function () { P.clear_panel(); P.clear_screen_ram(); return {}; };
  // clear_panel ($8D37): screen rows 24 down to 16 and their colour RAM.
  P.clear_panel = function () {
    for (let x = 0x18; x >= 0x10; x--) {
      const y = x << 1, lo = M[0xF128 + y], hi = M[0xF129 + y];
      M[0x02] = M[0x04] = lo; M[0x03] = hi; M[0x05] = (hi + 0x98) & 255;
      for (let i = 0x27; i >= 0; i--) { P.wr(at(0x02, i), 0); P.wr(at(0x04, i), 0); }
    }
    return { a: 0, x: 0x0F, y: 0xFF };
  };
  // clear_screen_ram ($8D5E): the screen at $4000-$427F and colour RAM rows 0-15.
  P.clear_screen_ram = function () {
    let x = 0;
    do {
      M[0x4000 + x] = 0; io.colourWrite(x, 0);
      M[0x4100 + x] = 0; io.colourWrite(0x100 + x, 0);
      M[0x4180 + x] = 0; io.colourWrite(0x180 + x, 0);
      x = (x - 1) & 255;
    } while (x);
    return { a: 0, x: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
