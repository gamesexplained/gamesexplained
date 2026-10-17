// The menus (bank 3, $C8D4-$CE13): fire in an open window and the actions of its icons; pause;
// an object dragged and dropped.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.menu = function (P) {
  const M = P.M, w = P.w;
  // menus_pass ($C8D4): with a menu up, what is behind a dragged window redrawn; once a window is
  // fully open its icons brought up to date and the pointer's fire handled
  P.def(0xC8D4, 'menus_pass', function* () {
    const a = M[0x8D22];
    if (!a) return { a };
    P.redraw_dragged({ a });
    const t = a & 0x1B;
    if (t !== 3 && t !== 0x18) return { a: t };
    const r = P.update_icons({ a: t, c: a });
    return yield* P.menu_fire(r);
  });
  // menu_fire ($CAF4): fire on an icon of the open window does its action ($CD0F); off them, it
  // drags the window ($CA81)
  P.def(0xCAF4, 'menu_fire', function* () {
    const code = M[0x8D20];
    if (code < 9) { M[0xC893] = 0; return {}; }
    P.copy_window({ hl: 0xC8A6 });
    let hl = 0xD089, b = 8;
    if (M[0x8D22] & 0x18) { P.copy_window({ hl: 0xC899 }); hl = 0xD0B1; b = 0x0A; }
    const c = M[0xC890], e = M[0x8D23], d = M[0x8D24];
    for (; b > 0; b--, hl += 5) {
      let a = (M[hl] * 8 - 1) & 255;
      if (a >= e) continue;
      if (((a + 0x1A) & 255) < e) continue;
      if (((M[hl + 1] - 1) & 255) >= d) continue;
      a = (((M[hl - 1] & 0x7F) >= 5 ? 0x11 : 0x19) + M[hl + 1]) & 255;
      if (a < d) continue;
      // fire on this icon: once a press
      if (M[0xC893]) return {};
      M[0xC893] = 0xFF;
      let pic = hl - 1, cc = c;
      if (M[pic] === 0x0D) {
        const r = P.drop_on_icon({ a: 0x0D, hl: pic, b, c, de: d << 8 | e });
        if (r.abort) return {};
        pic = r.hl; cc = r.c;
      }
      if (M[0xC890] & 0xC0) return P.drop_object({ a: M[0xC890] & 0xC0, hl: pic, b, c: cc, de: d << 8 | e });
      const mask = M[pic + 3];
      if (mask !== 0xFF) {
        const m = mask & cc;
        if (!m) return {};
        if (m === 8) return P.use_item_f84b({ a: 8, hl: pic + 3, b, c: cc, de: d << 8 | e });
      }
      P.click({});
      const act = M[pic + 4], to = w(0xCD0F + 2 * act);
      return yield* P.jumpGen(to, { a: act, de: pic + 4, bc: 2 * act, hl: to });
    }
    if (M[0xC890] & 0xC0) return P.drop_object({ a: M[0xC890] & 0xC0, hl, b: 0, c, de: d << 8 | e });
    if (code === 9) return {};
    M[0xC892] = 2;
    const win = M[0x8D22] & 0x18 ? 0xC899 : 0xC8A6;
    P.redraw_dragged({ a: M[0x8D22] & 0x18, hl: win });
    const a = (2 * (M[0x8D20] - 9)) & 255, to = w(0xCA81 + a);
    return P.jump(to, { a, hl: win, de: to, bc: a });
  });
  // pause ($CDEE): fire and the stick let go, then the clock stopped and the border magenta until
  // fire
  P.def(0xCDEE, 'pause', function* () {
    while (P.input_routine().a >= 9) yield;
    yield { halt: true, at: 0xCDF6 };               // at: the HALT's exit, for the page's pacing
    while (P.input_routine().a >= 9) yield;
    for (;;) {
      M[0xBF30] = 3; P.io.out(0x03FE, 3);
      if (P.input_routine().a >= 9) break;
      yield;
    }
    M[0xBF30] = 0; P.io.out(0x00FE, 0);
    return { a: 0 };
  });
  // drop_on_icon ($CC78): an object dropped on the bag's icon while the bag is carried goes into
  // the bag when it has room; otherwise the character goes for it. Either way the menu's pass ends
  // there (the routine drops menu_fire's return): abort.
  P.def(0xCC78, 'drop_on_icon', r => {
    if (!(M[0xC890] & 0xC0) || !(M[0xECD9] & 0x20) || !M[0xC891]) return { a: 0, hl: r.hl, c: r.c };
    const rec = P.object_record({ a: M[0xC891] }).hl;
    if (M[(rec + 1) & 0xFFFF] & 0x20) {
      const f = P.four_clear({});
      if (f.zf) { M[f.hl] = M[rec]; M[(rec + 1) & 0xFFFF] = 0x24; }
      P.drop_object_ccfe({});
      return { abort: true };
    }
    if (!P.four_clear({}).zf) return { abort: true };
    M[0xC898] |= 1;
    P.fetch_object({});
    P.drop_object_ccfe({});
    return { abort: true };
  });
  // four_clear ($CCB7): Z and HL the slot when one of the four slots at $C894 is empty; otherwise
  // THE BAG IS FULL ($21) for the character picked, NZ
  P.def(0xCCB7, 'four_clear', () => {
    for (let a = 0xC894; a < 0xC898; a++) if (!M[a]) return { zf: true, a: 0, hl: a, b: 0xC898 - a };
    P.queue_message({ b: 0x21, c: M[0xD0B0] & 0x7F, hl: 0xC898 });
    return { zf: false, hl: 0xC898 };
  });
  // drop_object ($CCD0): the dragged object let go: in the bottom half of the menu dropped, in the
  // top half taken (THE CHARACTER CANNOT CARRY IT, $22, when too heavy); the pointer the arrow again
  P.def(0xCCD0, 'drop_object', () => {
    if (M[0x8D24] >= 0x28) { P.drop_object_ground({}); return P.drop_object_ccfe({}); }
    if (M[0xD0CE] === 5) return P.drop_object_ccfb({});
    const rec = P.object_record({ a: M[0xC891] }).hl;
    if (M[(rec + 1) & 0xFFFF] & 0x20) return P.drop_object_ccfe({});
    return P.queue_message({ b: 0x22, c: M[0xD0B0] & 0x7F, hl: (rec + 1) & 0xFFFF });
  });
  P.def(0xCCFB, 'drop_object_ccfb', () => { P.fetch_object({}); return P.drop_object_ccfe({}); });
  P.def(0xCCFE, 'drop_object_ccfe', () => { P.ldir(0xC8BC, 0xC8B3, 9); M[0xC890] = 7; return { a: 7, hl: 0xC8C5, de: 0xC8BC, bc: 0 }; });
  // fetch_object ($F7AA): the character menu 2 shows goes for the object $C891 (state 3)
  P.def(0xF7AA, 'fetch_object', () => P.fetch_object_f7af({ c: M[0xD0B0] & 0x7F }));
  P.def(0xF7AF, 'fetch_object_f7af', r => {
    const f = P.find_actor({ a: r.c, c: r.c });
    if (!f.zf) return f;
    let hl = f.hl;
    hl = (hl & 0xFF00) | ((hl + 1) & 255);
    M[hl] = 3;
    hl = (hl & 0xFF00) | ((hl + 5) & 255);
    M[hl] = M[0xC891];
    return { a: M[0xC891], hl };
  });
  // object_record ($F83E): HL the record of object A, $ECD8 plus seven times A
  P.def(0xF83E, 'object_record', r => {
    const a = (0xD8 + ((7 * r.a) & 255));
    return { hl: (0xEC00 + a) & 0xFFFF, a: a & 255 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
