// The icon lists: the cursor's cell ($53F5) and the walk through a screen's icons ($53D7), and the
// lists the screens fill in before they are drawn ($4CFA-$549A): the objects here and carried, the
// people in a location, the team at each transporter beacon, the ballistic control's destinations.
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.lists = function (P) {
  const M = P.M, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };

  // cursor_cell ($53F5): the cell under the cursor from sprite 0's place, its row ($76) from Y
  // less $20 and its column ($77) from the nine bits of X less 4, both in eighths. The interrupt's
  // input routine moves the sprite in the middle of the main program's work, so the port stops
  // before each read of the video chip, where the game reads it.
  P.cursor_cell = function* () {
    yield { cp: 0x53F5 };
    M[0x76] = ((io.vicRead(0x01) - 0x20) & 255) >> 3;
    yield { cp: 0x5400 };
    const hi = io.vicRead(0x10) & 1;
    yield { cp: 0x540B };
    const x = io.vicRead(0x00);
    const a = ((((x >> 1) | (hi << 7)) - 2) & 255) >> 2;
    M[0x77] = a;
    return { a, c: (((((x >> 1) | (hi << 7)) - 2) & 255) >> 1) & 1, z: a ? 0 : 1, n: 0 };
  };
  P.CHECKPOINTS.push(0x53F5, 0x5400, 0x540B);
  // next_icon ($53D7): the next icon record, 11 bytes on; the carry set at the end of the list,
  // two bytes of $FF.
  P.next_icon = function () {
    const p = (w(0x37) + 0x0B) & 0xFFFF;
    setw(0x37, p);
    if (M[p] === 0xFF && M[p + 1] === 0xFF) return { a: 0xFF, y: 1, c: 1 };
    return { a: M[p] === 0xFF ? M[p + 1] : M[p], y: M[p] === 0xFF ? 1 : 0, c: 0 };
  };
  // next_object ($539D): the next object record, 7 bytes on, at ($2D), and chosen_slot ($5438) one
  // on; the carry set at the end of the list, two bytes of $FF.
  P.next_object = function () {
    const p = (w(0x2D) + 7) & 0xFFFF;
    setw(0x2D, p);
    M[0x5438]++;
    if (M[p] === 0xFF && M[p + 1] === 0xFF) return { a: 0xFF, y: 1, c: 1 };
    return { a: M[p] === 0xFF ? M[p + 1] : M[p], y: M[p] === 0xFF ? 1 : 0, c: 0 };
  };
  // next_entity ($53BE): the next of the fifty people's records, 18 bytes on, at ($2D), and
  // entity_no ($5447) one on; the carry set past the last.
  P.next_entity = function () {
    setw(0x2D, w(0x2D) + 0x12);
    const n = ++M[0x5447] & 255;
    return { a: n, c: n === 0x32 ? 1 : 0 };
  };

  // An icon of the list at ($37): its picture, and its flags (byte 4), which say whether it can be
  // chosen and in which of the screen's groups.
  const pic = (lo, hi) => { const ip = w(0x37); M[ip] = lo; M[(ip + 1) & 0xFFFF] = hi; };
  const blank = () => pic(M[0x8D32], M[0x8D33]);
  const arrow = () => pic(M[0x5480], M[0x5481]);
  const flags = v => { M[(w(0x37) + 4) & 0xFFFF] = v; return v; };
  const flagsOf = () => M[(w(0x37) + 4) & 0xFFFF];
  // the last icon of a list: the arrow to the next page while there is one, or after a page that
  // was not the first, so that it goes round to the first; otherwise nothing
  const lastIcon = (more, x) => {
    if (more) { arrow(); return { a: flags(0xFD), x, y: 4 }; }
    blank(); return { a: flags(0), x, y: 4 };
  };

  // list_objects_here ($4CFA): the objects lying in the location ($5437), eight to a page from the
  // skip ($5440) on, into the objects screen's left-hand panel: here_slots ($544F) the object of each.
  // An object can be picked up (flags 9, and $20 to use it) unless it is fixed (bit 3) or heavier
  // than the character can take, 255 less the weight carried; and pressed (flags $40) if it does
  // something (bit 2). Only Manto (2) can do either with the first three, the two beacons and
  // the ballistic control.
  P.list_objects_here = function () {
    let x;
    const here = o => !(M[o] & 1) && M[(o + 1) & 0xFFFF] === M[0x5437];
    for (;;) {
      M[0x5448] = 0; M[0x5438] = 0;
      setw(0x37, w(0x5482)); setw(0x2D, w(0xCD96));
      M[0x5486] = (0xFF - M[(w(0x41) + 7) & 0xFFFF]) & 255;
      x = 0;
      let over = false;
      while (x !== M[0x5440]) {
        if (here(w(0x2D))) x = (x + 1) & 255;
        if (P.next_object({}).c) { over = true; break; }
      }
      if (!over) break;
      M[0x5440] = 0;
    }
    for (;;) {
      const o = w(0x2D);
      if (here(o)) {
        x = M[0x5448];
        M[0x544F + x] = M[0x5438];
        pic(M[o + 3], M[o + 4]); flags(0);
        if (M[0x5436] === 2 || M[0x5438] > 2) {
          if (!(M[o] & 8) && M[o + 2] < M[0x5486]) {
            flags(flagsOf() | 9);
            flags(M[o] & 2 ? flagsOf() | 0x21 : flagsOf() & 0xDF);
          }
          flags(M[o] & 4 ? flagsOf() | 0x41 : flagsOf() & 0xBF);
        }
        P.next_icon({});
        if (++M[0x5448] === 8) return lastIcon(!P.next_object({}).c || M[0x5440] >= 8, x);
      }
      M[0x5443]++;
      if (P.next_object({}).c) break;
    }
    do { blank(); flags(0); P.next_icon({}); } while ((++M[0x5448] & 255) !== 8);
    return lastIcon(M[0x5440] >= 8, x);
  };

  // list_objects_carried ($4E77): the readied object's picture on its icon ($7A44), then the
  // objects the character (5436) carries, five to a page from the skip ($5441) on: carried_slots
  // ($5449) the object of each, flags $11 (dropped, readied), $20 to use it, $40 to press it but
  // for the two beacons. The page's arrow looks at the skip of the objects here ($5440), not this
  // one; the game's own slip.
  P.list_objects_carried = function () {
    let x;
    const mine = o => (M[o] & 1) && M[(o + 1) & 0xFFFF] === M[0x5436];
    for (;;) {
      M[0x5438] = 0; M[0x5448] = 0;
      const k = M[(w(0x41) + 8) & 0xFFFF];
      if (k) {
        const p = P.multiply({ a: k, y: 7 }), s = p.a + M[0xCD96];
        M[0x2D] = s & 255; M[0x2E] = (p.y + M[0xCD97] + (s >> 8)) & 255;
        const o = w(0x2D);
        M[0x7A44] = M[(o + 3) & 0xFFFF]; M[0x7A45] = M[(o + 4) & 0xFFFF];
      } else { M[0x7A44] = M[0x8D32]; M[0x7A45] = M[0x8D33]; }
      setw(0x37, w(0x5484)); setw(0x2D, w(0xCD96));
      x = 0;
      let over = false;
      while (x !== M[0x5441]) {
        if (mine(w(0x2D))) x = (x + 1) & 255;
        if (P.next_object({}).c) { over = true; break; }
      }
      if (!over) break;
      M[0x5441] = 0;
    }
    for (;;) {
      const o = w(0x2D);
      if (mine(o)) {
        x = M[0x5448];
        M[0x5449 + x] = M[0x5438];
        pic(M[o + 3], M[o + 4]);
        flags(flagsOf() | 0x11);
        flags(M[o] & 2 ? flagsOf() | 0x20 : flagsOf() & 0xDF);
        flags(M[o] & 4 && M[0x5438] > 1 ? flagsOf() | 0x40 : flagsOf() & 0xBF);
        P.next_icon({});
        if (++M[0x5448] === 5) {
          if (!P.next_object({}).c || M[0x5440] >= 5) { arrow(); return { a: flags(flagsOf() | 0xFD), x, y: 4 }; }
          blank(); return { a: flags(0), x, y: 4 };
        }
      }
      M[0x5443]++;
      if (P.next_object({}).c) break;
    }
    do { blank(); flags(0); P.next_icon({}); } while ((++M[0x5448] & 255) !== 5);
    if (M[0x5441] >= 5) { arrow(); return { a: flags(0xFD), x, y: 4 }; }
    blank(); return { a: flags(flagsOf() & 0xFC), x, y: 4 };
  };

  // The people's records are read through P.irqByte where the interrupt writes them: byte 0, the
  // status (bit 1, dead), and byte 2, the location.
  const status = e => P.irqByte(e), whereIs = e => P.irqByte((e + 2) & 0xFFFF);

  // list_people_here ($4FFC): the people in the location the scan looks at ($5446), eight to a
  // page from the skip ($5442) on, into the battle screen's left-hand panel: people_slots ($5457) each
  // one's number, $FF for none. A skip past the fiftieth person starts the objects here instead, a
  // JMP to the wrong list; the game's own slip.
  P.list_people_here = function () {
    M[0x5448] = 0; M[0x5447] = 0;
    setw(0x37, w(0x7E22)); setw(0x2D, w(0xCA08));
    let x = 0;
    while (x !== M[0x5442]) {
      x = (x + 1) & 255;
      if (P.next_entity({}).c) { M[0x5442] = 0; return P.list_objects_here({}); }
    }
    for (;;) {
      const e = w(0x2D);
      if (!(status(e) & 2) && whereIs(e) === M[0x5446]) {
        x = M[0x5448];
        M[0x5457 + x] = M[0x5447];
        const k = x = (((M[0x5447] << 2) & 255) + 2) & 255;
        pic(M[0x6CFE + k], M[0x6CFF + k]);
        P.next_icon({});
        if (++M[0x5448] === 8) { arrow(); return { a: flags(0xFD), x, y: 4 }; }
      }
      M[0x5443]++;
      if (P.next_entity({}).c) break;
    }
    do { blank(); x = M[0x5448]; M[0x5457 + x] = 0xFF; P.next_icon({}); } while ((++M[0x5448] & 255) !== 8);
    return lastIcon(M[0x5442] >= 8, x);
  };

  // list_team_beacon1 ($50E0) and list_team_beacon2 ($51E6): the people at a transporter beacon
  // (objects 0 and 1), on the objects screen: eight to a page into the left-hand panel
  // (here_slots, skip $5444), five into the middle one (carried_slots, skip $5445), with flags $81. A
  // beacon someone carries lists nobody and sets beacon_carried ($5488).
  function beaconList(o) {
    let x;
    for (;;) {
      M[0x5448] = 0; M[0x5447] = 0;
      setw(0x37, w(o.icons)); setw(0x2D, w(0xCA08));
      x = 0;
      if (M[o.beacon] & 1) { M[0x5488] = 1; break; }
      let over = false;
      while (x !== M[o.skip]) {
        if (whereIs(w(0x2D)) === M[o.beacon + 1]) x = (x + 1) & 255;
        if (P.next_entity({}).c) { over = true; break; }
      }
      if (over) { M[o.skip] = 0; continue; }
      for (;;) {
        const e = w(0x2D);
        if (!(status(e) & 2) && whereIs(e) === M[o.beacon + 1]) {
          x = M[0x5448];
          M[o.slots + x] = M[0x5447];
          const k = x = (M[0x5447] << 2) & 255;
          pic(M[0x6D00 + k], M[0x6D01 + k]); flags(0x81);
          P.next_icon({});
          if (++M[0x5448] === o.n) { arrow(); return { a: flags(0xFD), x, y: 4 }; }
        }
        M[0x5443]++;
        if (P.next_entity({}).c) break;
      }
      break;
    }
    do { blank(); flags(0); x = M[0x5448]; M[o.slots + x] = 0xFF; P.next_icon({}); } while ((++M[0x5448] & 255) !== o.n);
    return lastIcon(M[o.skip] >= o.n, x);
  }
  P.list_team_beacon1 = () => beaconList({ icons: 0x5482, beacon: 0xCD98, skip: 0x5444, slots: 0x544F, n: 8 });
  P.list_team_beacon2 = () => beaconList({ icons: 0x5484, beacon: 0xCD9F, skip: 0x5445, slots: 0x5449, n: 5 });

  // clear_object_icons ($52EC): the flags of the objects screen's two panels cleared, eight and five.
  P.clear_object_icons = function () {
    let r;
    for (const [list, n] of [[0x5482, 8], [0x5484, 5]]) {
      setw(0x37, w(list));
      for (let x = n; x; x--) { flags(0); r = P.next_icon({}); }
    }
    return Object.assign(r, { x: 0 });
  };
  // set_transporter_icons ($531D): the left-hand panel's pictures and flags from the table at $5465, to
  // the end of its list.
  P.set_transporter_icons = function () {
    setw(0x37, w(0x5482));
    let x = 0, r;
    do {
      pic(M[0x5465 + x], M[0x5466 + x]); flags(M[0x5467 + x]);
      x = (x + 3) & 255;
      r = P.next_icon({});
    } while (!r.c);
    return Object.assign(r, { x });
  };
  // list_route ($5346): the seven people the character's route is made of (record bytes $0A-$10,
  // $FF for none) into the battle screen's left-hand panel, then the eighth icon's picture blanked.
  P.list_route = function () {
    setw(0x37, w(0x7E22));
    let x = 0;
    for (let y = 0x0A; y !== 0x11; y++) {
      const v = M[(w(0x41) + y) & 0xFFFF];
      M[0x7D] = y;
      if (v === 0xFF) blank();
      else { x = (((v & 0x3F) << 2) + 2) & 255; pic(M[0x6CFE + x], M[0x6CFF + x]); }
      flags(0);
      P.next_icon({});
    }
    blank();
    return { a: M[0x8D33], x, y: 1 };
  };
  // reset_door_icons ($5417): the movement screen's eight exits that are doors (flags bit 3) made
  // plain exits again (flags 5), and a byte $39 at the same place on from $7B72.
  P.reset_door_icons = function () {
    let y = 4;
    for (let x = 8; x; x--) {
      if (M[0x7975 + y] & 8) { M[0x7975 + y] = 5; M[0x7B72 + y] = 0x39; }
      y = (y + 0x0B) & 255;
    }
    return { a: y, x: 0, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
