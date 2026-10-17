// The objects (bank 3, $F633-$FAFE): where each lies and how it is drawn among the actors, the
// objects carried from area to area, put down and dropped, and what using each one does: tins
// opened and eaten, the bottle drunk and filled, first aid, ammunition, the ham, the watch, the
// rope and the dynamite.
//
// An object's record is seven bytes from $ECD8 (object_record, $F83E): +0 its number, +1 its area
// (bit 5 and the character while carried; bits 7 and 6 to be shown and drawn), +2 to +4 its place
// across, down and height in fours of units, +5 and +6 its screen column and row. $F616 holds a
// colour for each object's icon, $F627 on what the tins, the bottle, the first aid and the
// ammunition hold.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.objects = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const who = () => M[0xD0B0] & 0x7F;

  // --- where the objects lie ---
  // objects_pass ($F633): the graphic cycled ($FAFF), then each object lying in the area whose
  // column and row are within the view ($9633, $9634; from 4 before it, $24 columns and $1A rows)
  // is marked to be shown and drawn (bits 7 and 6), and every other is unmarked
  P.def(0xF633, 'objects_pass', () => {
    P.cycle_graphic({});
    const c = M[0x8D1F], e = M[0x9633], d = M[0x9634];
    for (let k = 0, hl = 0xECD9; k < 0x14; k++, hl = (hl + 7) & 0xFFFF) {
      let show = false;
      if ((M[hl] & 0x3F) === c) {
        const col = M[hl + 4], row = M[hl + 5];
        const a = e >= 4 ? e - 4 : 0, b = d >= 4 ? d - 4 : 0;
        show = a <= col && Math.min(a + 0x24, 0xFF) >= col && b <= row && ((b + 0x1A) & 255) >= row;
      }
      M[hl] = show ? M[hl] | 0xC0 : M[hl] & 0x3F;
    }
    return {};
  });
  // next_object ($F689): of the objects marked to be shown and drawn, each whose across times
  // four plus $100 and down times four are no less than BC and the other set's BC is chosen in
  // turn, and they become its: NZ with IY at the last chosen
  P.def(0xF689, 'next_object', r => {
    let found = false, bc = r.bc & 0xFFFF, bc_ = r.bc_ & 0xFFFF, iy = r.iy, hl = 0xECD9;
    for (let e = 0x14; e > 0; e--, hl = (hl + 7) & 0xFFFF) {
      if ((M[hl] & 0xC0) !== 0xC0) continue;
      const p = (hl + 1) & 0xFFFF, x = M[p] * 4 + 0x100, y = M[(p + 1) & 0xFFFF] * 4;
      if (x < bc || y < bc_) continue;
      bc = x; bc_ = y; iy = (p - 2) & 0xFFFF; found = true;
    }
    return { a: found ? 0xFF : 0, zf: !found, bc, bc_, iy, hl };
  });
  // draw_object ($F6D6): the record copy at $8501 made an actor for the object at HL, to be drawn
  // as a sprite: type $20, bank 6, the object's number its frame, its place across, down and
  // height times four, its screen place times eight (the row $10 lower) and the frame list $F1B1;
  // its bit 6 (to be drawn) cleared
  P.def(0xF6D6, 'draw_object', r => {
    let hl = r.hl;
    M[0x8501] = 0x20; M[0x8520] = 6;
    M[0x851C] = M[hl] & 0x3F;
    hl = (hl + 1) & 0xFFFF; M[hl] &= 0xBF;
    hl = (hl + 1) & 0xFFFF;
    let de = 0x850F;
    for (let k = 0; k < 5; k++, hl = (hl + 1) & 0xFFFF) {
      const v = M[hl] * (k < 3 ? 4 : 8);
      M[de] = v & 255; de = lo(de, 1); M[de] = v >> 8; de = lo(de, 1);
    }
    let p = lo(de, -2);
    const s = M[p] + 0x10;
    M[p] = s & 255;
    if (s > 255) { p = lo(p, 1); M[p] = (M[p] + 1) & 255; }
    setw(0x851A, 0xF1B1);
    return { iy: 0x8501, hl: 0xF1B1, de: hl, b: 0 };
  });
  // carry_objects ($F72A): on entering an area every object's marks are cleared, and one lying in
  // an area 1, 3, 4 or 5 away in number, within $1C of the edge across (areas 1 apart) or $14
  // down (the others), is moved one area towards this one ($E36B-$E37A) and placed on the screen
  P.def(0xF72A, 'carry_objects', () => {
    const c = M[0x8D1F];
    for (let k = 0, hl = 0xECD9; k < 0x14; k++, hl = (hl + 7) & 0xFFFF) {
      const a = M[hl] & 0x3F;
      M[hl] = a;
      const e = (a - c) & 255;
      if (!e) continue;
      const n = a >= c ? e : (c - a) & 255, back = e & 0x80;
      if (n === 2 || n >= 6) continue;
      if (n === 1) {
        const col = M[hl + 4];
        if (back ? col <= 0xE3 : col > 0x1C) continue;
        const o = (back ? P.record_edges_e37a : P.record_edges_e375)({ de: hl + 1 });
        objectScreen(o.de);
      } else {
        const row = M[hl + 5];
        if (back ? row <= 0x6C : row > 0x14) continue;
        const o = (back ? P.record_edges_e370 : P.record_edges_e36b)({ de: hl + 3 });
        objectScreen((o.de + 2) & 0xFFFF);
      }
    }
    return {};
  });

  // --- putting down ---
  // drop_object_ground ($F7C0): the object picked ($C891) dropped on the view: in a zone ($FB5D)
  // it is noted in $FB5E; one carried (bit 5) is put down where the character picked stands
  P.def(0xF7C0, 'drop_object_ground', () => {
    const c = M[0xC891];
    if (M[0xFB5D] !== 0xFF) M[0xFB5E] = c;
    const hl = (P.object_record({ a: c }).hl + 1) & 0xFFFF;
    if (!(M[hl] & 0x20)) return { zf: true };
    return P.put_down({ a: who(), hl });
  });
  // put_down ($F7DC): the object at HL (its +1) put down where the actor of type A stands, when
  // in play; with the bag open its slot is emptied ($C894)
  P.def(0xF7DC, 'put_down', r => {
    const f = P.find_actor({ a: r.a & 255 });
    if (!f.zf) return { zf: false };
    if (M[0xC898] & 2) {
      const a = M[(r.hl - 1) & 0xFFFF];
      for (let k = 0; k < 4; k++) if (M[0xC894 + k] === a) M[0xC894 + k] = 0;
    }
    return P.place_object({ de: r.hl, hl: f.hl });
  });
  // place_object ($F801): the object at DE (its +1) gets the area and the place of the actor at
  // HL ($FAEB), and its screen place ($F818)
  P.def(0xF801, 'place_object', r => {
    const de = (r.de + 1) & 0xFFFF;
    M[r.de] = M[0x8D1F];
    P.coarse_place({ hl: lo(r.hl, 0x0E) });
    P.ldir(0xA03A, de, 3);
    return objectScreen((de + 1) & 0xFFFF);
  });
  // object_screen ($F818): the screen place of the object whose down is at DE (across before it,
  // height after): the column $80 plus down less across, and the row half the low byte of $17E
  // less all three, into the two bytes after the height
  const objectScreen = de => {
    const c = (0x80 + M[de] - M[(de - 1) & 0xFFFF]) & 255;
    const h = (de + 1) & 0xFFFF;
    const s = M[(de - 1) & 0xFFFF] + M[de] + M[h];
    const a = (((0x17E - s) & 255) >> 1) & 0x7F;
    M[(h + 1) & 0xFFFF] = c; M[(h + 2) & 0xFFFF] = a;
    return { a, c, de: s, hl: (h + 2) & 0xFFFF };
  };
  P.def(0xF818, 'object_screen', r => objectScreen(r.de));

  // --- using ---
  // use_item ($F84B): USE ITEM on the icon whose field is at HL: its picture, three bytes back,
  // less $0D is the object ($C891), whose handler from $F866 runs after $CD83 has turned USE ITEM
  // off; $F865, the RET here, is the handler of objects that do nothing
  P.def(0xF84B, 'use_item_f84b', r => {
    const obj = (M[(r.hl - 3) & 0xFFFF] - 0x0D) & 255;
    M[0xC891] = obj;
    const fn = w((0xF866 + ((obj * 2) & 255)) & 0xFFFF);
    const o = P.use_item({ a: fn & 255, hl: fn }) || {};
    return P.jump(fn, Object.assign({ a: fn & 255, hl: fn }, o));
  });
  P.def(0xF865, 'use_item_f865', () => ({}));
  // use_dynamite ($F888): I'VE LIT THE FUSE (message $13), the dynamite's colour $D6, the fuse
  // ($8D0B) $7F, and its icon drawn again (wherever icon_slot leaves HL)
  P.def(0xF888, 'use_dynamite', () => {
    P.queue_message({ b: 0x13, c: who() });
    M[0xF626] = 0xD6; M[0x8D0B] = 0x7F;
    return P.draw_icon({ hl: iconSlot(0x1D).hl });
  });
  // use_bag ($F8A5): the bag opened (bit 1 of $C898), so menu 2 shows what is in it
  P.def(0xF8A5, 'use_bag', () => { M[0xC898] |= 2; return {}; });
  // use_knife ($F8AB): each tin shown in menu 2 and still shut gets half ($80, and NOT AS GOOD AS
  // A TIN OPENER, message $1F); with the can opener ($F8AF) all ($FF); opened ($F627 on), its
  // colour shows how full it is. The half or all is kept in the other A, which drawing the icon
  // changes, so a tin after one drawn may get another amount
  const openTins = v => {
    for (let b = 4, hl = 0xF627; b > 0; b--, hl = (hl + 1) & 0xFFFF) {
      if (M[hl]) continue;
      const c = 5 - b, s = iconSlot(c + 0x0D);
      if (!s.zf) continue;
      M[hl] = 0xFF;
      const p = (hl + 4) & 0xFFFF;
      if (v === 0x80) P.queue_message({ b: 0x1F, c: who() });
      const a = Math.min(v + M[p], 0xFF);
      M[p] = a;
      M[0xF616 + c] = ((a >> 5) & 7) | 0x40;
      const o = P.draw_icon({ hl: s.hl }) || {};
      if (o.af_ !== undefined) v = (o.af_ >> 8) & 255;
    }
    return {};
  };
  P.def(0xF8AB, 'use_knife', () => openTins(0x80));
  P.def(0xF8AF, 'use_knife_f8af', () => openTins(0xFF));
  // consume ($F910): object A's store at DE fills the need at HL for all four characters, and
  // loses a quarter of what they lacked; when that is all of it, it is emptied with THATS THE LAST
  // OF THAT (message 2). The icon's colour shows what is left
  const consume = (idx, store, need) => {
    const ch = who();
    if (!M[store]) return { zf: true, a: 0 };
    let c = 0;
    for (let k = 0, hl = need; k < 4; k++, hl = (hl + 8) & 0xFFFF) { c = Math.min(c + 0xFF - M[hl], 0xFF); M[hl] = 0xFF; }
    c = c >> 2;
    let col;
    if (M[store] - 1 < c) { M[store] = 0; P.queue_message({ b: 2, c: ch }); col = 0x41; }
    else { const s = M[store] - c; M[store] = s; col = ((s >> 5) & 7 || 1) | 0x40; }
    M[(0xF616 + idx) & 0xFFFF] = col;
    return P.draw_icon({ hl: iconSlot((idx + 0x0D) & 255).hl });
  };
  P.def(0xF910, 'consume', r => consume(r.a & 255, r.de, r.hl));
  // icon_slot ($F96F): Z with HL when object icon A is in one of menu 2's four object slots
  // ($D0BF, five bytes apart)
  const iconSlot = a => {
    for (let k = 0, hl = 0xD0BF; k < 4; k++, hl += 5) if (M[hl] === a) return { zf: true, a, hl, b: 4 - k, de: 5 };
    return { zf: false, a, hl: 0xD0D3, b: 1, de: 5 };
  };
  P.def(0xF96F, 'icon_slot', r => iconSlot(r.a & 255));
  // use_first_aid ($F97E): the party's strength (+0 of the needs) from the first aid ($F631)
  P.def(0xF97E, 'use_first_aid', () => consume(0x0E, 0xF631, 0xD5C3));
  // use_bottle ($F98D): the party's water (+2) from the bottle ($F62F). Then, when its user
  // stands on ground 0 and water ($7E) lies along the row of cells either way, within eight and
  // before any other ground (bank 1), I'LL FILL UP (message $23): state 7, heading that way (+6)
  P.def(0xF98D, 'use_bottle', () => {
    consume(5, 0xF62F, 0xD5C5);
    const f = P.find_actor({ a: who() });
    if (!f.zf) return {};
    const hl = f.hl;
    P.ldir(lo(hl, 0x0E), 0x8ED1, 4);
    const g = P.ground_cell({});
    if (g.a & 255) return {};
    P.copy_from_bank1({ a: 0x11, hl: lo(g.hl, -8), bc: 1 });
    let dir = 0;
    for (let k = 0, p = 0x8528; k < 8; k++, p = lo(p, -1)) {
      if (!M[p]) continue;
      if (M[p] === 0x7E) dir = 4;
      break;
    }
    if (!dir) {
      for (let k = 0, p = 0x8529; k < 8; k++, p = lo(p, 1)) {
        if (!M[p]) continue;
        if (M[p] !== 0x7E) return {};
        dir = 2;
        break;
      }
      if (!dir) return {};
    }
    P.queue_message({ b: 0x23, c: M[hl] });
    M[lo(hl, 1)] = 7;
    M[lo(hl, 6)] = dir;
    return {};
  });
  // bottle_filled ($FA02): water reached while filling: back to following, action $8A, the bottle
  // full and its colour $47, and on as a turn ends ($950A)
  P.def(0xFA02, 'bottle_filled', r => {
    M[lo(r.hl, 1)] = 1;
    M[r.iy + 0x0C] = 0x8A;
    M[0xF61B] = 0x47; M[0xF62F] = 0xFF;
    const s = iconSlot(0x12);
    if (s.zf) P.draw_icon({ hl: s.hl });
    return P.actor_collide_950a({ iy: r.iy });
  });
  // use_ham ($FA1E): eaten (gone: its area 0), everyone's food full, DELICIOUS (message $1E)
  P.def(0xFA1E, 'use_ham', () => {
    M[0xED18] = 0;
    for (let k = 0; k < 4; k++) M[0xD5C6 + 8 * k] = 0xFF;
    return P.queue_message({ b: 0x1E, c: who() });
  });
  // use_tin ($FA3A, $FA3E, $FA42, $FA46 for tins 1 to 4): the party's food (+3) from the tin
  // ($F62B on)
  [0xFA3A, 0xFA3E, 0xFA42, 0xFA46].forEach((a, k) =>
    P.def(a, k ? 'use_tin_' + a.toString(16) : 'use_tin', () => consume(k + 1, 0xF62B + k, 0xD5C6)));
  // use_ammunition ($FA62): the party's ammunition (+4) from what is left ($F632)
  P.def(0xFA62, 'use_ammunition', () => consume(8, 0xF632, 0xD5C7));
  // use_watch ($FA73): ITS ABOUT __ O'CLOCK (message 13): the hour ($BF2C) made 1 to 12 and
  // written into the text at $7D9E
  P.def(0xFA73, 'use_watch', () => {
    let a = M[0xBF2C] & 0x1F;
    if (!a) a = 0x0C;
    if (a >= 0x0D) a -= 0x0C;
    if (a >= 0x0A) { M[0x7D9E] = 1; M[0x7D9F] = a - 0x0A; } else { M[0x7D9E] = 0x23; M[0x7D9F] = a; }
    return P.queue_message({ b: 0x0D, c: M[0xD0B0] & 3 });
  });
  // use_rope ($FAA1): when Clive is in play, the character using the rope, also in play, starts
  // the rescue (state 4)
  P.def(0xFAA1, 'use_rope', () => {
    if (M[0xFA9C] === 0xFF) return { zf: true };
    let f = P.find_actor({ a: 3 });
    if (!f.zf) return {};
    setw(0xFA9D, f.hl);
    f = P.find_actor({ a: M[0xD0B0] & 3 });
    if (!f.zf) return {};
    setw(0xFA9F, f.hl);
    M[lo(f.hl, 1)] = 4;
    return {};
  });
  // drop_all ($FAC0, event 9): one of the party dying puts down everything he or she carries
  // where they fell ($F801)
  P.def(0xFAC0, 'drop_all', r => {
    const actor = lo(r.hl, -0x0B), a = M[actor];
    if (a >= 4) return {};
    for (let k = 0, hl = 0xECD9; k < 0x11; k++, hl = (hl + 7) & 0xFFFF) if (M[hl] === (a | 0x20)) P.place_object({ de: hl, hl: actor });
    return {};
  });
  // cycle_graphic ($FAFF): $FB1C counts 0 to 2, and the word $F25B, $F279 or $F295 is written
  // into bank 6 ($AA8B)
  P.def(0xFAFF, 'cycle_graphic', () => {
    let a = (M[0xFB1C] + 1) & 255, hl;
    if (a === 3) { a = 0; hl = 0xF25B; } else hl = a === 1 ? 0xF279 : 0xF295;
    M[0xFB1C] = a;
    return P.set_bank6_word({ hl });
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
