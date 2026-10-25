// The controls and the areas ($4E05-$4F59, $75C3-$77D3, $7C5A-$7CC6): the joystick and the
// keyboard read into a list of codes; a new session (the game's bytes cleared, strength from the
// database, every area's objects reset); the global lists installed; an area chosen (its header
// read: its sky, its scale and the heights and steps that follow from it, its colours, its
// objects and its name) and the player put at one of its entrances.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.area = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => M[(ptr(zp) + y) & 0xFFFF];
  const put = (zp, y, v) => { M[(ptr(zp) + y) & 0xFFFF] = v & 255; };
  // ($zp) = a pointer at (base) + the database's start ($109C)
  const fromTable = (zp, base, y) => {
    const s = at(base, y) + M[0x109C];
    M[zp] = s & 255;
    M[zp + 1] = (at(base, y + 1) + M[0x109D] + (s >> 8)) & 255;
  };

  // READ_CONTROL_INPUT: the codes held, at $137A on ($1379 of them, five at most): the
  // joystick's ($91-$95, up, down, left, right, fire), then each key down in the keyboard's
  // matrix by the table at $757A (a column's select, then the codes of its eight rows); $1380 is
  // set when code 2 is among them. The carry is set when any is held, and A is the first.
  P.READ_CONTROL_INPUT = function (r) {
    let x = 0, y = r.y, a;
    M[0x1380] = 0;
    a = io.ciaRead(0);
    for (let b = 0; b < 5; b++) {
      const bit = a & 1;
      a >>= 1;
      if (!bit) {
        if (b === 0) y = 0x91;
        else if (b < 4) y = a;
        M[0x137A + x] = 0x91 + b;
        x++;
      }
    }
    M[0x1379] = x;
    if (x !== 5) {
      x = 0;
      scan: for (;;) {
        y = 1;
        a = M[0x757A + x];
        if (a === 0xFF) break;
        io.ciaWrite(0, a);
        do a = io.ciaRead(1); while (a !== io.ciaRead(1));
        for (;;) {
          const bit = a & 1;
          a >>= 1;
          if (!bit) {
            M[0x82] = y;
            const code = M[0x757A + ((x + y) & 255)];
            y = M[0x1379];
            M[0x1379] = (M[0x1379] + 1) & 255;
            M[0x137A + y] = code;
            if (code === 2) M[0x1380] = 1;
            if (y >= 5) break scan;
            y = M[0x82];
          }
          y++;
          if (y === 9) break;
        }
        x = (x + 9) & 255;
      }
    }
    return { a: M[0x137A], x, y, c: M[0x1379] ? 1 : 0 };
  };

  // INSTALL_GLOBAL_DATABASE_POINTERS: the global conditions' list ($1096), the walking speed,
  // flying and the key count cleared, and the shared objects: the first area whose number is $FF
  // holds them ($1060 of them from $1061), none when no area does.
  P.INSTALL_GLOBAL_DATABASE_POINTERS = function (r) {
    let s = M[0x9D44] + M[0x109C];
    M[0x1096] = s & 255;
    M[0x1097] = (M[0x9D45] + M[0x109D] + (s >> 8)) & 255;
    M[0x240F] = M[0x9D48];
    M[0x2418] = 0; M[0x2417] = 0;
    let x = M[0x9D00], y;
    M[0x7A] = M[0x109E]; M[0x7B] = M[0x109F];
    for (;;) {
      fromTable(0x7C, 0x7A, 0);
      y = 2;
      if (at(0x7C, 2) === 0xFF) {
        y = 1;
        M[0x1060] = at(0x7C, 1);
        s = M[0x7C] + 8;
        M[0x1061] = s & 255;
        M[0x1062] = (M[0x7D] + (s >> 8)) & 255;
        return { a: M[0x1062], x, y };
      }
      setp(0x7A, ptr(0x7A) + 2);
      x = (x - 1) & 255;
      if (!x) break;
    }
    M[0x1060] = x;
    return { a: M[0x7B], x, y };
  };

  // RESET_GLOBAL_OBJECT_FLAGS_AND_APPLY_ID_FF_ALLOWLIST: every shared object hidden, its
  // destroyed and moved bits cleared; then the shared object numbered $FF, when there is one,
  // lists those of them this area shows (its bytes after the header, the length's two left out).
  P.RESET_GLOBAL_OBJECT_FLAGS_AND_APPLY_ID_FF_ALLOWLIST = function (r) {
    let a = M[0x1060];
    if (!a) return { a, x: r.x, y: r.y };
    let x = a, y;
    M[0x7C] = M[0x1061]; M[0x7D] = M[0x1062];
    do {
      put(0x7C, 0, (at(0x7C, 0) & 0x8F) | 0x40);
      setp(0x7C, ptr(0x7C) + at(0x7C, 8));
      x = (x - 1) & 255;
    } while (x);
    M[0x105C] = 0xFF;
    let f = P.FIND_OBJECT_BY_ID({ a: 0, x: 0, y: 8 });
    x = f.x; y = f.y;
    if (f.a) return { a: f.a, x, y };
    x = (at(0x7C, 8) - 3) & 255;
    M[0x7A] = M[0x7C]; M[0x7B] = M[0x7D];
    y = 0;
    do {
      y = (y + 1) & 255;
      a = at(0x7A, y);
      if (a) {
        M[0x105C] = a;
        f = P.FIND_OBJECT_BY_ID({ a: 0, x, y });
        x = f.x; y = f.y;
        if (!f.a) { put(0x7C, 0, at(0x7C, 0) & 0xBF); a = y; }
        else a = f.a;
      }
      if (y === 6) y += 2;
      x = (x - 1) & 255;
    } while (x);
    return { a, x, y };
  };

  // SELECT_AREA: area $2429 made the current one (back to $1047 when there is none of that
  // number): the timer's ticks cleared, the view to be redrawn; the sky, the object count and
  // list, the conditions, the scale ($2416) and with it the walking speed and the fall, step and
  // eye heights, the colours, the name (16 bytes from $1500 + 16 times its number) and the shared
  // objects it shows.
  P.SELECT_AREA = function (r) {
    M[0x246C] = 0; M[0x246D] = 0;
    M[0x1064] = 1; M[0x1087] = 1;
    M[0x76CF] = M[0x9D00];
    let x = M[0x2429], y = 0, o;
    M[0x7E] = M[0x109E]; M[0x7F] = M[0x109F];
    for (;;) {
      fromTable(0x7C, 0x7E, y);
      y = (y + 1) & 255;
      const next = (y + 1) & 255;
      if (x === at(0x7C, 2)) break;
      y = next;
      M[0x76CF] = (M[0x76CF] - 1) & 255;
      if (!M[0x76CF]) { M[0x2429] = M[0x1047]; return { a: M[0x1047], x, y }; }
    }
    M[0x2464] = at(0x7C, 0);
    M[0x242A] = at(0x7C, 1);
    const s = at(0x7C, 3) + M[0x7C];
    M[0x242F] = s & 255;
    M[0x2430] = (at(0x7C, 4) + M[0x7D] + (s >> 8)) & 255;
    M[0x2416] = at(0x7C, 5);
    P.MUL_S16_S8_TO_S24({ a: M[0x240F], x: 0, y: M[0x2416] });
    M[0x240D] = M[0x82]; M[0x240E] = M[0x83];
    P.MUL_S8_S8_TO_S16({ a: M[0x83], x: M[0x2416], y: M[0x9D4A] });
    M[0x2414] = M[0x82];
    P.MUL_S8_S8_TO_S16({ a: M[0x82], x: M[0x2416], y: M[0x9D4B] });
    M[0x2415] = M[0x82];
    P.MUL_S8_S8_TO_S16({ a: M[0x82], x: M[0x2416], y: M[0x2412] });
    M[0x2413] = M[0x82];
    M[0x2437] = at(0x7C, 6);
    M[0x82] = 0; M[0x2435] = 0; M[0x2436] = 0x0C; M[0x2438] = 1;
    const v = at(0x7C, 7);
    const t = M[0x7C] + 8;
    M[0x242B] = t & 255;
    M[0x242C] = (M[0x7D] + (t >> 8)) & 255;
    M[0x82] = (v >> 4) & 7;
    M[0x77C8] = (v << 4) & 255;
    M[0x77C9] = (M[0x82] + 0x15) & 255;
    const name = M[0x77C8] | M[0x77C9] << 8;
    for (x = 0x0F; x >= 0; x--) M[0x2419 + x] = M[(name + x) & 0xFFFF];
    o = P.RESET_GLOBAL_OBJECT_FLAGS_AND_APPLY_ID_FF_ALLOWLIST({ a: M[name], x: 0xFF, y: 7 });
    return o;
  };

  // ENTER_DESTINATION_AREA: the area chosen, and the player put at entrance $1066 (an object of
  // the area): at its x, z and y (64 units a byte, centred; the y raised to the eye unless
  // flying), each that is not $FF; with all three, facing its pitch and yaw.
  P.ENTER_DESTINATION_AREA = function (r) {
    let o = P.SELECT_AREA(r);
    M[0x105C] = M[0x1066];
    o = P.FIND_OBJECT_BY_ID({ a: 0, x: o.x, y: o.y });
    let x = o.x, y = o.y, a = o.a;
    if (o.a) return { a, x, y };
    x = 0;
    const place = (v, lo) => {
      const s = ((v & 3) << 6) + 0x20;
      M[0x82] = v >> 2;
      M[lo] = s & 255;
      a = (M[0x82] + (s >> 8)) & 255;
      M[lo + 1] = a;
      x++;
    };
    y = 1; a = at(0x7C, 1);
    if (a !== 0xFF) place(a, 0x2407);
    y = 3; a = at(0x7C, 3);
    if (a !== 0xFF) place(a, 0x240B);
    y = 2; a = at(0x7C, 2);
    if (a !== 0xFF) {
      M[0x82] = a;
      if (!M[0x2418]) M[0x82] = (((M[0x2413] - 1) & 255) + M[0x82]) & 255;
      place(M[0x82], 0x2409);
    }
    if (x === 3) {
      y = 4; M[0x2410] = at(0x7C, 4); P.plug.whole(0x2410);
      y = 5; a = at(0x7C, 5); M[0x2411] = a; P.plug.whole(0x2411);
    }
    return { a, x, y };
  };

  // INITIALIZE_NEW_SESSION: the game's state for a new game: no event, the sight, the spirits'
  // count, the variables and bits $2439-$2458 cleared (the music's bit kept on when it was on),
  // strength from the database, walking, the global lists, every area's objects back as they
  // were (hidden ones hidden, destroyed and moved bits cleared), and the player at the
  // database's start.
  P.INITIALIZE_NEW_SESSION = function (r) {
    M[0x109B] = 1; M[0x105F] = 0x3F; M[0x246B] = 0xFF; M[0x246A] = 0x20;
    M[0x2467] = 0; M[0x105E] = 0; M[0x1086] = 0; M[0x1087] = 0;
    for (let x = 0x20; x; x--) M[0x2438 + x] = 0;
    if (M[0x246E]) M[0x243C] |= 0x80;
    M[0x2455] = M[0x9D05];
    M[0x2412] = 2; M[0x2456] = 2;
    let o = P.INSTALL_GLOBAL_DATABASE_POINTERS({ a: 2, x: 0, y: r.y });
    let y = o.y, x;
    const a = M[0x9D00];
    if (a) {
      M[0x4E04] = a;
      x = 0;
      M[0x4E6A] = M[0x109E]; M[0x4E74] = M[0x109E];
      M[0x4E6B] = M[0x109F]; M[0x4E75] = M[0x109F];
      do {
        const lo = M[((M[0x4E6A] | M[0x4E6B] << 8) + x) & 0xFFFF] + M[0x109C];
        M[0x7C] = lo & 255; x = (x + 1) & 255;
        M[0x7D] = (M[((M[0x4E74] | M[0x4E75] << 8) + x) & 0xFFFF] + M[0x109D] + (lo >> 8)) & 255; x = (x + 1) & 255;
        y = 1;
        const n = at(0x7C, 1);
        if (n) {
          M[0x4E03] = n;
          setp(0x7C, ptr(0x7C) + 8);
          do {
            y = 0;
            let f = at(0x7C, 0) & 0x9F;
            if (f & 0x80) f |= 0x40;
            put(0x7C, 0, f);
            y = 8;
            setp(0x7C, ptr(0x7C) + at(0x7C, 8));
            M[0x4E03] = (M[0x4E03] - 1) & 255;
          } while (M[0x4E03]);
        }
        M[0x4E04] = (M[0x4E04] - 1) & 255;
      } while (M[0x4E04]);
    } else x = o.x;
    M[0x2429] = M[0x9D03];
    M[0x1066] = M[0x9D04];
    return P.ENTER_DESTINATION_AREA({ a: M[0x1066], x, y });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
