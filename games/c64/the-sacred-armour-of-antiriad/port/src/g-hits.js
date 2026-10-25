// What touches what: the stone thrown and its hits on the scenery (the main loop, throw_stone and
// scenery_hits, from the collisions the interrupt latched), the hazards' damage, the sprites'
// collisions with each other (sprite_hits, from the interrupt), the score, and the teleport.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.hits = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);
  const colour = a => P.rd(a) & 0x0F;
  // (zpa_22),y, its pointer as the main program reads it: the interrupt's own cell tests write it
  const at22 = y => ((R(0x22) | R(0x23) << 8) + y) & 0xFFFF;
  const among = (c, table, n) => { for (let k = n - 1; k >= 0; k--) if (c === M[table + k]) return k; return -1; };
  const WALL = 0xCE1C, HAZARD = 0xCE2C;
  const row = r => { const x = (r << 1) & 255; M[0x22] = M[0xF128 + x]; M[0x23] = (M[0xF129 + x] + 0x98) & 255; };
  const hide = x => { const e = R(0x0215) & (x === 2 ? 0xFB : M[0xF120 + x]); M[0x0215] = e; io.vicWrite(0x15, e); };

  // throw_stone ($A3B3): Tal asked to throw (zp_throw bit 7) and sprite 2 free: its X high bit
  // made Tal's; thrown from the hand he faces with ($B8 left, $BA right), 16 pixels out, on path
  // $81, the throw's direction written into each of its five steps.
  P.throw_stone = function () {
    const x = 2;
    if (R(0x0260 + x) & 0x80) return { x };
    if (!(R(0x7C) & 0x80)) return { x };
    const h = R(0x0210) & 0xFB;
    M[0x0210] = h;
    M[0x0210] = (((h << 2) & 0x04) | R(0x0210)) & 255;
    const a = R(0x0260);
    if (a !== 0xB8 && a !== 0xBA) return { x };
    if (a === 0xB8) {
      const s = R(0x0200) - 0x10;
      M[0x0204] = s & 255;
      M[0x73] = 0x04;
      if (s < 0) M[0x0210] = R(0x0210) & M[0xF120 + x];
    } else {
      const s = R(0x0200) + 0x10;
      M[0x0204] = s & 255;
      M[0x73] = 0x08;
      if (s > 255) M[0x0210] = R(0x0210) | M[0xF118 + x];
    }
    M[0x0205] = R(0x0201);
    M[0x02D8 + x] = 0x81;
    M[0x0260 + x] = 0xBC;
    P.reset_slot_path({ x });
    M[0x0268 + x] = 0;
    M[0x0270 + x] = 2;
    M[0x24] = M[0xC683 + 0x02]; M[0x25] = M[0xC684 + 0x02];
    for (let y = 0; y <= 16; y += 4) M[at(0x24, y)] = (M[at(0x24, y)] & 0x03) | R(0x73);
    return { x: 0xFF, y: 0x14 };
  };
  // scenery_hits ($A44C): sprite 2 against solid scenery is spent ($BD), with its sound; Tal against
  // a hazard (hazard_colours $CE2C), outside room 0 and once the last hurt has worn off (zpa_40),
  // takes its damage (hazard_damage $CE28), the suit a half, a quarter with the Implosion
  // Compressor ($067F).
  P.scenery_hits = function () {
    if (R(0x6F) & 0x04) {
      if (R(0x0262) === 0xBD) { M[0x6F] = 0; return {}; }
      P.stone_cells();
      if (R(0x45) & 0x80) { M[0x6F] = 0; return {}; }
      if (R(0x0262) === 0xBC) M[0x035F] = 0x89; else P.play_effect({ a: 0xAD });
      M[0x0262] = 0xBD;
      M[0x0272] = 2;
      const a = R(0x026A);
      M[0x02DA] = a; M[0x6F] = a; M[0x7C] = a;
      return { a };
    }
    let x;
    if ((R(0x6F) & 0x03) && R(0x5B) && !R(0x40)) {
      x = P.hazard_left().x;
      if (R(0x45) & 0x80) {
        x = P.hazard_right().x;
        if (R(0x45) & 0x80) x = -1;
      }
    }
    if (x !== undefined && x >= 0) {
      M[0x40] = 0x19;
      M[0x65] = M[0xCE28 + x];
      if (R(0x7B) & 0x80) {
        M[0x65] = R(0x65) >> 1;
        if (R(0x067F) & 0x80) M[0x65] = R(0x65) >> 1;
        P.suit_damage();
      } else P.tal_damage();
    }
    M[0x6F] = 0;
    return {};
  };
  // stone_cells ($A4D3): the three cells from sprite 2's along the row below; zpa_45 ends negative
  // when all are open.
  P.stone_cells = function () {
    let { x, y } = P.stone_cell();
    row((x + 1) & 255);
    M[0x45] = 2;
    for (;;) {
      if (among(colour(at22(y)), WALL, 12) < 0) return { y };
      y = (y + 1) & 255;
      if (dec(0x45) & 0x80) return { y };
    }
  };
  // stone_cell ($A500): sprite 2's cell from the chip: row (Y - $32) / 8, column (9-bit X) / 8 - 3.
  P.stone_cell = function () {
    const x = ((io.vicRead(0x05) - 0x32) & 255) >> 3;
    const v = ((io.vicRead(0x10) & 0x04 ? 1 : 0) << 8) | io.vicRead(0x04);
    return { a: ((v >> 3) - 3) & 255, x, y: ((v >> 3) - 3) & 255 };
  };
  // hazard_left ($A51E) and hazard_right ($A56E): a hazard's colour in five cells down the column
  // at Tal's side (fewer above the playfield): zpa_45 left positive and X which.
  function hazard(side) {
    M[0x85] = 0x32;
    let { x, y } = P.tal_cell();
    y = (y + side) & 255;
    M[0x85] = x;
    M[0x86] = 0;
    const t = R(0x0201);
    if (t <= 0x32) M[0x86] = ((0x32 - t) & 255) >> 3;
    M[0x45] = (4 - R(0x86)) & 255;
    for (;;) {
      let r = R(0x85);
      if (r >= 0x0F) r = 0x0F;
      row(r);
      const k = among(colour(at22(y)), HAZARD, 4);
      if (k >= 0) return { x: k, y };
      inc(0x85);
      if (dec(0x45) & 0x80) return { x: 0xFF, y };
    }
  }
  P.hazard_left = () => hazard(0);
  P.hazard_right = () => hazard(2);

  // sprite_hits ($A5C0): unless on the title, the collisions latched: Tal's (tal_touches), or
  // sprite 2's with a creature (slots 3-7), which loses one hit to the stone and two to a shot,
  // and dies (dissolves, scored) with none left.
  P.sprite_hits = function () {
    if (R(0xB0) & 0x80) return {};
    const s = R(0x70);
    if (!s) return {};
    if (s & 0x03) return P.tal_touches();
    if (R(0x70) & 0x04) stone();
    M[0x70] = 0;
    return {};
  };
  function stone() {
    const f = P.find_hit_slot();
    const x = f.x;
    if (f.c && !((R(0x0290 + x) | R(0x02A8 + x)) & 0x80)) {
      const a = R(0x0260 + x);
      if (!(a & 0x80)) return;
      if (among(a, 0xC608, 16) >= 0) { hide(2); return; }
      dec(0x0280 + x);
      if (R(0x0262) === 0xBC) M[0x035F] = 0x89;
      else { P.play_effect({ a: 0xAD }); dec(0x0280 + x); }
      let h = R(0x0280 + x);
      if (!h || (h & 0x80)) {
        P.score_kill({ x });
        M[0x0290 + x] = R(0x0260 + x);
        P.play_effect({ a: 0xA2 });
        M[0x02A0 + x] = 0; M[0x0298 + x] = 0; M[0x02D8 + x] = 0;
        h = 0;
      }
      M[0x7C] = h; M[0x02DA] = h; M[0x0262] = h;
    }
    hide(2);
  }
  // tal_touches ($A643): Tal touching creature X: an add-on (item_anims $FC54), once the panel is
  // on and Tal in the suit or crouching, is his, with its lamp lit on the panel; a power cell ($C6)
  // the same, one at a time (message $89 while he has one); the teleport ($D3), facing the player
  // on foot, dissolves him for the armour's room; the empty suit ($C0, $C1), facing it and the
  // wait over, takes him in. Anything else killable dies on him, and hurts him (enemy_damage $C64A)
  // or the suit, a half, a quarter with the Implosion Compressor.
  P.tal_touches = function () {
    const f = P.find_hit_slot();
    if (f.c) touch(f.x);
    M[0x70] = 0;
    return {};
  };
  const onFoot = () => !(R(0x7B) & 0x80);
  const crouched = () => { const t = R(0x0260); return t === 0x8A || t === 0x8C; };
  function touch(x) {
    const a = R(0x0260 + x);
    const y = among(a, 0xFC54, 4);
    if (y >= 0) {
      if (!(R(0x8A) & 0x80)) return;
      if ((R(0x02A8 + x) | R(0x067E + y)) & 0x80) return;
      if (onFoot() && !crouched()) return;
      M[0x067E + y] = 0x80; M[0x067A + y] = 0x80;
      M[0x0260 + x] = 0; M[0x02D8 + x] = 0;
      P.add_score({ a: R(0x0288 + x) });
      const k = R(0x46), col = M[0xFC58 + k], r = (M[0xFC5C + k] << 1) & 255;
      M[0x06] = M[0xF128 + r]; M[0x08] = M[0xF128 + r];
      M[0x07] = M[0xF129 + r]; M[0x09] = (M[0xF129 + r] + 0x98) & 255;
      P.wr(at(0x06, col), 0xC1);
      P.wr(at(0x08, col), 0x07);
      inc(0x46);
      M[0x0360] = 0x99;
      return;
    }
    if (a === 0xC6) {
      if (!(R(0x8A) & 0x80)) return;
      if (onFoot() && !crouched()) return;
      if (R(0xA7) & 0x80) { P.queue_message({ a: 0x89 }); return; }
      if (R(0x02A8 + x) & 0x80) return;
      M[0xA8] = R(0x5B) & 0x07;
      M[0xA9] = R(0x5B) >> 3;
      const v = R(0x0661 + R(0xA9)) | M[0xF118 + R(0xA8)];
      M[0x0661 + R(0xA9)] = v;
      M[0xA7] = 0x80;
      M[0x0360] = 0x99;
      M[0x0260 + x] = 0; M[0x02D8 + x] = 0;
      hide(x);
      P.add_score({ a: R(0x0288 + x) });
      return;
    }
    if (a === 0xD3) {
      if (!(R(0x8A) & 0x80)) return;
      if ((R(0x0290) | R(0x02A8)) & 0x80) return;
      if (R(0x0260) !== 0x88) return;
      M[0x0290] = 0x88; M[0x0291] = 0x88; M[0x6E] = 0x88;
      M[0x02A0] = 0; M[0x02A1] = 0; M[0x0298] = 0; M[0x0299] = 0;
      M[0x035E] = 0x96; M[0x035F] = 0x97;
      P.queue_message({ a: 0x91 });
      return;
    }
    if (a === 0xC0 || a === 0xC1) {
      if (R(0x0260) !== 0x88 || R(0x0261) !== 0x89) return;
      if ((R(0x0290) | R(0x02A8)) & 0x80) return;
      if (R(0x93)) return;
      const t = R(0x0260);
      M[0x0290] = t; M[0x0291] = t;
      M[0x02A0] = 0; M[0x02A1] = 0; M[0x0298] = 0; M[0x0299] = 0;
      M[0x035E] = 0x96; M[0x035F] = 0x97;
      return;
    }
    if ((R(0x0290 + x) | R(0x02A8 + x)) & 0x80) return;
    M[0xAD] = 0x0F;
    const e = R(0x0260 + x);
    if (!(e & 0x80)) return;
    if (among(e, 0xC608, 16) < 0) M[0xAD] = 0xFF;
    const k = among(e, 0xC618, 25);
    if (k >= 0) {
      M[0x65] = M[0xC64A + k];
      if (R(0x7B) & 0x80) {
        M[0x65] = R(0x65) >> 1;
        if (R(0x067F) & 0x80) M[0x65] = R(0x65) >> 1;
        P.suit_damage();
      } else P.tal_damage();
    }
    if (!(R(0xAD) & 0x80)) return;
    const b = R(0x0260 + x);
    if (b === 0xDB) { M[0x0260 + x] = 0; M[0x02D8 + x] = 0; hide(x); return; }
    M[0x0290 + x] = b;
    P.play_effect({ a: 0xA2 });
    P.add_score({ a: R(0x0288 + x) });
    M[0x02A0 + x] = 0; M[0x0298 + x] = 0; M[0x02D8 + x] = 0;
  }
  // find_hit_slot ($A869): the highest creature slot (7 down to 3) in the collisions; carry set
  // when there is one.
  P.find_hit_slot = function () {
    let a = R(0x70);
    for (let x = 7; x >= 3; x--) { const c = a >> 7; a = (a << 1) & 255; if (c) return { a, x, c: 1 }; }
    return { a, x: 2, c: 0 };
  };
  // score_kill ($A83D): creature X's points, twice for the stone.
  P.score_kill = function (r) {
    const x = r.x;
    P.add_score({ a: R(0x0288 + x) });
    if (R(0x0262) !== 0xBC) return {};
    return P.add_score({ a: R(0x0288 + x) });
  };
  // add_score ($A851): A added to the score, three bytes from $0697.
  P.add_score = function (r) {
    let s = r.a + R(0x0697);
    M[0x0697] = s & 255;
    s = R(0x0698) + (s >> 8);
    M[0x0698] = s & 255;
    s = R(0x0699) + (s >> 8);
    M[0x0699] = s & 255;
    return { a: s & 255, c: s >> 8 };
  };
  // tal_damage ($A876): zpa_65 off Tal's energy, never below 0 (a result with bit 7 set), unless
  // he is dying, lying or rising.
  P.tal_damage = function () {
    const a = R(0x0260);
    if (a === 0xA6 || a === 0xA8 || a === 0xAA) return {};
    let e = (R(0x51) - R(0x65)) & 255;
    if (e & 0x80) e = 0;
    M[0x51] = e;
    return { a: e };
  };
  // suit_damage ($A891): zpa_65 off the suit's energy, never below 0.
  P.suit_damage = function () {
    let e = (R(0x4F) - R(0x65)) & 255;
    if (e & 0x80) e = 0;
    M[0x4F] = e;
    return { a: e };
  };
  // teleport_to_armour ($A352): a teleport asked for and Tal dissolved: the armour's room built,
  // Tal at the armour, materialising ($88, $89) with the sound.
  P.teleport_to_armour = function () {
    if (!(R(0x6E) & 0x80) || (R(0x0290) & 0x80)) return {};
    M[0x6B] = 0x80;
    M[0x5B] = R(0x77);
    P.build_room();
    const x0 = R(0x78); M[0x0200] = x0; M[0x0202] = x0;
    const y0 = R(0x79); M[0x0201] = y0; M[0x0203] = (y0 + 0x15) & 255;
    const h = R(0x0210) & 0xFC;
    M[0x0210] = h;
    M[0x0210] = ((h >> 3) & 0x03) | R(0x0210);
    M[0x02A8] = 0x88; M[0x02A9] = 0x89;
    M[0x035E] = 0x96; M[0x035F] = 0x97;
    M[0x02B0] = 0; M[0x02B1] = 0; M[0x02B8] = 0; M[0x02B9] = 0;
    M[0x6E] = 0; M[0x6B] = 0;
    return { a: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
