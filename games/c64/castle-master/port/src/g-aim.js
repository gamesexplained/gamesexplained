// Aiming, firing and using things ($621C-$664B, $6661-$68E3, $8214-$8279): the sight's mode (two
// sprites moved over the view, $2465/$2466 across and down), the centre cross-hair drawn into the
// view, the shot (a sprite shrinking towards the sight in three frames), and the picking of what
// is under the sight: the drawn faces are tried last drawn first, each by a ray across its
// projected outline (an edge's crossing of the sight's row found by a divide and a multiply), and
// the first hit names the object in $1082. Using an object ($1B) needs it near enough (the sum of
// the distances to its centre on each axis, over the step size) and a script on it that answers
// to being used; otherwise the panel says why not. FIND_OBJECT_BY_ID looks an object up by its
// number in the shared list and the area, or in another area.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.aim = function (P) {
  const M = P.M, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const at = zp => i => M[(w(zp) + i) & 0xFFFF];
  const R7A = at(0x7A), R7C = at(0x7C), R7E = at(0x7E);
  // a signed byte times 128 into three bytes (the game's ROR through a sign-filled A)
  const times128 = (v, lo) => {
    const s = (v & 0x80 ? v - 256 : v) * 128;
    M[lo] = s & 255; M[lo + 1] = (s >> 8) & 255; M[lo + 2] = (s >> 16) & 255;
  };

  // POSITION_ENABLE_VIC_SPRITE: sprite A at X (bit 8 from $1233), Y, in colour $1235, switched on.
  P.POSITION_ENABLE_VIC_SPRITE = function (r) {
    M[0x82] = r.x; M[0x83] = r.a;
    let x = r.a & 0x0F;
    io.vicWrite(0x27 + x, M[0x1235]);
    x <<= 1;
    io.vicWrite(0x01 + x, r.y);
    io.vicWrite(0x00 + x, M[0x82]);
    let a = 1;
    for (let n = M[0x83]; n; n--) a = (a << 1) & 255;
    io.vicWrite(0x15, a | io.vicRead(0x15));
    if (M[0x1233]) io.vicWrite(0x10, a | io.vicRead(0x10));
    else io.vicWrite(0x10, (a ^ 0xFF) & io.vicRead(0x10));
    return { a: M[0x1C72], x: 0, y: M[0x1233] };
  };
  // DISABLE_VIC_SPRITE: sprite A (0-7) switched off.
  P.DISABLE_VIC_SPRITE = function (r) {
    const a = 1 << (r.a & 7);
    io.vicWrite(0x15, (a ^ 0xFF) & io.vicRead(0x15));
    return { a: M[0x1C72], x: 0, y: r.y };
  };

  // FIND_OBJECT_BY_ID: object $105C; A 0 looks in the shared list then the area's, any other A in
  // area A's own list. A 0 and ($7C) at it when found, 1 when not; X and Y kept.
  P.FIND_OBJECT_BY_ID = function (r) {
    M[0x621A] = r.x; M[0x621B] = r.y;
    const out = a => ({ a, x: M[0x621A], y: M[0x621B], z: a ? 0 : 1 });
    const scan = n => {
      M[0x6217] = n;
      do {
        if (M[0x105C] === R7C(7)) return true;
        setw(0x7C, w(0x7C) + R7C(8));
        M[0x6217] = (M[0x6217] - 1) & 255;
      } while (M[0x6217]);
      return false;
    };
    let x;
    if (r.a === 0) {
      if (M[0x1060]) { M[0x7C] = M[0x1061]; M[0x7D] = M[0x1062]; if (scan(M[0x1060])) return out(0); }
      M[0x7C] = M[0x242B]; M[0x7D] = M[0x242C]; x = M[0x242A];
    } else {
      M[0x6217] = M[0x9D00]; M[0x7E] = M[0x109E]; M[0x7F] = M[0x109F];
      let y = 0, hit = false;
      do {
        const lo = R7E(y) + M[0x109C]; M[0x7C] = lo & 255; y = (y + 1) & 255;
        M[0x7D] = (R7E(y) + M[0x109D] + (lo >> 8)) & 255; y = (y + 1) & 255;
        M[0x6218] = y;
        if (R7C(2) === r.a) { hit = true; break; }
        M[0x6217] = (M[0x6217] - 1) & 255;
      } while (M[0x6217]);
      if (!hit) return out(1);
      x = R7C(1);
      setw(0x7C, w(0x7C) + 8);
    }
    if (!x) return out(1);
    return out(scan(x) ? 0 : 1);
  };

  // REDRAW_CENTER_SIGHT_STATE: the cross-hair turned on or off in the view, redrawn.
  P.REDRAW_CENTER_SIGHT_STATE = function (r) {
    let o = P.XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT(r);
    o = P.DRAW_SORTED_VISIBLE_QUEUE(Object.assign({}, r, o));
    return P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP(Object.assign({}, r, o));
  };

  // POSITION_ENABLE_AIM_SPRITES: the sight's two sprites (its colour, then its outline in black)
  // at the sight's place, and a pause of half a frame.
  P.POSITION_ENABLE_AIM_SPRITES = function (r) {
    M[0x1233] = 0;
    const y = (0xC2 - M[0x2466]) & 255;
    const s = ((0x34 + M[0x2465]) & 255) + M[0x2465];
    const x = s & 255;
    if (s > 255) M[0x1233] = 1;
    M[0x1235] = 1;
    P.POSITION_ENABLE_VIC_SPRITE({ a: 0, x, y });
    M[0x1235] = 0;
    const o = P.POSITION_ENABLE_VIC_SPRITE({ a: 1, x, y });
    return { a: o.a, x: 0, y: 0 };
  };

  // BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP: the linear buffer at $87CC copied into the view's
  // cells as it stands (not turned about, as the frame's own copy is).
  P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP = function (r) {
    if (M[0x105E]) P.SID_INITIALIZE_IF_ENABLED({ a: M[0x105E], x: r.x, y: r.y });
    M[0xB1] = 0x0F;
    M[0x6612] = 0xCC; M[0x6613] = 0x87;
    M[0x6615] = M[0x1237]; M[0x6616] = M[0x1238];
    let c = 0;
    do {
      const src = w(0x6612), dst = w(0x6615);
      let x = 0;
      for (let y0 = 0; y0 < 8; y0++) for (let y = y0; y < 0xF0; y += 8) { M[(dst + y) & 0xFFFF] = M[(src + x) & 0xFFFF]; x = (x + 1) & 255; }
      setw(0x6615, dst + 0x140);
      c = M[0x6612] + 0xF0 > 255 ? 1 : 0;
      setw(0x6612, src + 0xF0);
      M[0xB1]--;
    } while (M[0xB1]);
    return { a: M[0x6612], x: 0xF0, y: 8, c };
  };

  // PICK_RENDERED_OBJECT: what is under the sight, of the faces drawn this frame. X and Y are
  // followed as the game leaves them, since FIND_OBJECT_BY_ID keeps what it is given.
  let X, Y;
  const outline = () => {
    // the face's points copied to $C0 on (a polygon closed by its first point again), and each
    // edge across the sight's row: its crossing kept (up to five), or a hit at once when the
    // edge lies along the row
    M[0x7A] = M[0x664C]; M[0x7B] = M[0x664D];
    const n = R7A(0) & 0x0F;
    Y = (n << 1) & 255;
    do { M[0xBF + Y] = R7A(Y); Y = (Y - 1) & 255; } while (Y);
    X = n;
    if (X === 2) X = 1;
    else { M[(0xC0 + 2 * n) & 255] = R7A(1); M[(0xC1 + 2 * n) & 255] = R7A(2); Y = 2; }
    Y = 0; M[0x664E] = 0; M[0x6659] = X;
    do {
      const y = Y;
      M[0x6660] = 0;
      let cross, d = (M[0xC1 + y] - M[0x2466]) & 255;
      if (!d) cross = true;
      else {
        M[0x6660] |= d & 0x80 ? 1 : 2;
        d = (M[0xC3 + y] - M[0x2466]) & 255;
        cross = !d || (M[0x6660] | (d & 0x80 ? 1 : 2)) === 3;
      }
      if (cross) {
        if (M[0xC1 + y] === M[0xC3 + y]) return true;
        let a;
        if (M[0xC0 + y] === M[0xC2 + y]) a = M[0xC0 + y];
        else {
          // the slope times 128, then where the edge meets the row
          M[0x6657] = (M[0xC2 + y] - M[0xC0 + y]) & 255;
          times128((M[0xC3 + y] - M[0xC1 + y]) & 255, 0x88);
          M[0x8C] = M[0x6657]; M[0x8D] = M[0x6657] & 0x80 ? 0xFF : 0;
          P.DIV_S24_BY_S16({ a: M[0x88], x: M[0x89], y: M[0x8A] });
          const q0 = M[0x88], q1 = M[0x89];
          P.MUL_S16_S8_TO_S24({ a: q0, x: q1, y: M[0xC0 + y] });
          M[0x665A] = M[0x82]; M[0x665B] = M[0x83]; M[0x665C] = M[0x84];
          times128((M[0x2466] - M[0xC1 + y]) & 255, 0x82);
          M[0x8D] = q1; M[0x8C] = q0;
          const s = (M[0x665A] | M[0x665B] << 8 | M[0x665C] << 16) + (M[0x82] | M[0x83] << 8 | M[0x84] << 16);
          P.DIV_S24_BY_S16({ a: s & 255, x: (s >> 8) & 255, y: (s >> 16) & 255 });
          a = M[0x88];
        }
        X = (M[0x664E] + 1) & 255;
        if (X !== 6) { M[0x664E] = X; M[0x664E + X] = a; }
      }
      Y = (Y + 2) & 255;
      M[0x6659] = (M[0x6659] - 1) & 255;
    } while (M[0x6659]);
    // a hit when a crossing is on the sight, or there are crossings on both sides of it
    if (!M[0x664E]) return false;
    M[0x6659] = M[0x664E];
    X = 1; Y = 0;
    do {
      const e = (M[0x664E + X] - M[0x2465]) & 255;
      if (!e) return true;
      Y |= e & 0x80 ? 1 : 2;
      X++;
      M[0x6659] = (M[0x6659] - 1) & 255;
    } while (M[0x6659]);
    return Y === 3;
  };
  P.PICK_RENDERED_OBJECT = function (r) {
    X = r.x; Y = r.y;
    M[0x7C] = M[0x10A6]; M[0x7D] = M[0x10A7];
    if (!M[0x106A]) return { a: 0, x: X, y: Y };
    M[0x6658] = M[0x106A];
    const off = M[0x106A] << 2;
    M[0x82] = off & 255; M[0x83] = off >> 8;
    setw(0x7C, w(0x7C) + off);
    const hit = () => { M[0x1082] = M[0x6655]; return { a: M[0x1082], x: X, y: Y }; };
    do {
      M[0x7E] = R7C(0); M[0x7F] = R7C(1);
      M[0x6655] = R7E(0);
      const n = R7E(1);
      Y = 1;
      if (n) {
        M[0x6654] = n;
        if (n & 0x80) return hit();
        setw(0x7E, w(0x7E) + 2);
        do {
          // the face's points about the sight: each side of it, or on it, across and down
          M[0x664C] = M[0x7E]; M[0x664D] = M[0x7F];
          M[0x665D] = R7E(0) & 0x0F; M[0x665F] = 0;
          Y = 1;
          do {
            let d = (R7E(Y) - M[0x2465]) & 255;
            M[0x665F] |= !d ? 4 : d & 0x80 ? 1 : 2;
            Y = (Y + 1) & 255;
            d = (R7E(Y) - M[0x2466]) & 255;
            M[0x665F] |= !d ? 0x20 : d & 0x80 ? 8 : 0x10;
            Y = (Y + 1) & 255;
            M[0x665D] = (M[0x665D] - 1) & 255;
          } while (M[0x665D]);
          setw(0x7E, w(0x7E) + Y);
          const f = X = M[0x665F];
          if (((f & 0x20) || ((f & 0x10) && (f & 8))) && ((f & 4) || ((f & 2) && (f & 1))) && outline()) return hit();
          M[0x6654] = (M[0x6654] - 1) & 255;
        } while (M[0x6654]);
      }
      setw(0x7C, w(0x7C) - 4);
      M[0x6658] = (M[0x6658] - 1) & 255;
    } while (M[0x6658]);
    return { a: 0, x: X, y: Y };
  };

  P.DISPATCH_AIM_FIRE_ACTIVATE = function* (r) {
    const act = r.a;
    const sound = function* () { P.SID_INITIALIZE_IF_ENABLED({ a: 3 }); while (M[0x1063]) yield; };
    const sight = () => { M[0x2465] = 0x3B; M[0x2466] = 0x3D; };
    if (act === 0x1E) {
      // the sight's mode on or off; the cross-hair is taken away while it is on
      M[0x1063] = 0x0F;
      M[0x2467] ^= 0xFF;
      if (!M[0x2467]) {
        P.DISABLE_VIC_SPRITE({ a: 0 }); P.DISABLE_VIC_SPRITE({ a: 1 });
        if (M[0x246B]) P.REDRAW_CENTER_SIGHT_STATE({});
        sight();
      } else {
        if (M[0x246B]) P.REDRAW_CENTER_SIGHT_STATE({});
        sight();
        P.POSITION_ENABLE_AIM_SPRITES({});
      }
      yield* sound();
      return {};
    }
    if (act === 0x15) {
      // the cross-hair on or off
      if (M[0x2467]) return {};
      M[0x246B] ^= 0xFF;
      P.REDRAW_CENTER_SIGHT_STATE({});
      yield* sound();
      return {};
    }
    if (M[0x2467]) {
      const nudge = (a, d, stop) => { if (M[a] !== stop) { M[a] = (M[a] + d) & 255; P.POSITION_ENABLE_AIM_SPRITES({}); } return {}; };
      if (act === 0x18) return nudge(0x2465, -1, 0);
      if (act === 0x17) return nudge(0x2465, 1, 0x77);
      if (act === 0x19) return nudge(0x2466, -1, 1);
      if (act === 0x1A) return nudge(0x2466, 1, 0x78);
      if (act === 0x16) {
        // the shot: from the bottom of the view towards the sight, three frames, then what it hit
        P.SID_INITIALIZE_IF_ENABLED({ a: 5 });
        M[0x62E4] = ((M[0x2465] - 0x3C) << 1) & 255;
        M[0x62E5] = M[0x2466];
        M[0x62E1] = 0xAC; let x = 0xAC;
        M[0x62E2] = 0; M[0x1233] = 0; M[0x1235] = 0;
        M[0x62E3] = 0xC0; let y = 0xC0;
        M[0x62E7] = 3;
        P.POSITION_ENABLE_VIC_SPRITE({ a: 3, x, y });
        M[0x62E6] = 3;
        do {
          M[0x1063] = 3;
          while (M[0x1063]) yield;
          P.DISABLE_VIC_SPRITE({ a: M[0x62E7] });
          M[0x62E4] = (M[0x62E4] >> 1) | (M[0x62E4] & 0x80);
          M[0x62E5] >>= 1;
          const s = M[0x62E1] + M[0x62E4];
          M[0x62E1] = s & 255; x = s & 255;
          M[0x62E2] = (M[0x62E2] + (s >> 8)) & 255; M[0x1233] = M[0x62E2];
          if (M[0x62E4] & 0x80) { M[0x62E2] = 0; M[0x1233] = 0; }
          M[0x62E3] = (M[0x62E3] - M[0x62E5]) & 255; y = M[0x62E3];
          M[0x62E7]++;
          P.POSITION_ENABLE_VIC_SPRITE({ a: M[0x62E7], x, y });
          M[0x62E6]--;
        } while (M[0x62E6]);
        M[0x1063] = 3;
        while (M[0x1063]) yield;
        P.DISABLE_VIC_SPRITE({ a: M[0x62E7] });
        P.PICK_RENDERED_OBJECT({});
        M[0x1084] = (M[0x243C] & 0x20) && M[0x2429] !== 0x15 && M[0x2429] !== 0x10 ? 5 : 4;
        return {};
      }
    }
    if (act !== 0x1B) return {};
    // using what is under the sight
    const o = P.PICK_RENDERED_OBJECT({ x: M[0x2467], y: r.y });
    if (!M[0x1082]) return {};
    M[0x105C] = M[0x1082];
    if (P.FIND_OBJECT_BY_ID({ a: 0, x: o.x, y: o.y }).a) return {};
    M[0x88] = 0; M[0x89] = 0;
    for (let i = 0; i < 3; i++) {
      const size = R7C(4 + i);
      if ((((M[0x2416] << 2) & 255) + M[0x2416] & 255) < size) return {};
      const half = size << 5, pos = R7C(1 + i);
      M[0x83] = half >> 8; M[0x84] = pos >> 2;
      const s = ((half & 255) + ((pos & 3) << 6));
      M[0x82] = s & 255; M[0x83] = (M[0x84] + M[0x83] + (s >> 8)) & 255;
      let d = (w(0x82) - w(0x2407 + 2 * i)) & 0xFFFF;
      if (d & 0x8000) d = (-d) & 0xFFFF;
      setw(0x82, d);
      setw(0x88, w(0x88) + d);
    }
    if (M[0x2416] >= 2) { M[0x8C] = M[0x2416]; M[0x8D] = 0; P.DIV_S24_BY_S16({ a: M[0x88], x: M[0x89], y: 0 }); }
    M[0x7E] = 0x70; M[0x7F] = 0x14;
    if (M[0x89] === 0 || (M[0x89] === 1 && M[0x88] < 0x2C)) {
      // near enough: a script on it that answers to being used ($C0 in a command's top bits)
      M[0x82] = M[0x13DF + (R7C(0) & 0x0F)];
      const a = (R7C(8) - M[0x82]) & 255;
      if (a) {
        M[0x83] = (a - 1) & 255;
        let y = M[0x82];
        for (;;) {
          if ((R7C(y) & 0xC0) === 0xC0) { M[0x1084] |= 2; return {}; }
          M[0x82] = M[0x13AE + (R7C(y) & 0x3F)];
          y = (y + M[0x82]) & 255;
          const s = M[0x83] - M[0x82];
          M[0x83] = s & 255;
          if (s < 0) break;
        }
      }
      M[0x7E] = 0x80; M[0x7F] = 0x14;
    }
    M[0x1063] = 0x32; M[0x7C] = 0x6F; M[0x7D] = 0x1D;
    P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2 });
    M[0x105A] |= 0x20;
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
