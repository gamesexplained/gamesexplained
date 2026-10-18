// HIVE!, the arcade cabinet in a base (HCODE, loaded over TALK at $5700 by act_hive). Its island
// is a base map of its own (H.MAP at $5100, H.TIL's tiles at $4000) and its pieces are the map's
// entries: 0 the trooper, 1 his shot, the rest Manchi (type 1, the number of the mound that bred
// them in the action byte at $5618) and mounds (picture $62). The base's own entries are kept at
// $6200 while it runs.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.hive = function (P) {
  const M = P.M;
  const R = (r, o) => Object.assign({}, r, o);
  const ptr = zp => M[zp] | M[(zp + 1) & 255] << 8;
  const load = (x, y, to) => { M[0x80] = 0; M[0x81] = to; return P.load_file({ x, y }); };
  // two pages from page `from` to page `to`
  const copy = (from, to) => {
    M[0x80] = 0; M[0x81] = from; M[0x82] = 0; M[0x83] = to; M[0x84] = 0; M[0x85] = 2;
    return P.copy_memory();
  };
  const cf = x => P.print_wrapped({ x, a: 0xCF });

  // The base's entries saved, the cabinet's picture and the island's tiles; then the menu
  P.hive_start = function* () {
    copy(0x55, 0x62);
    P.load_picture({ a: 3 });
    load(0x57, 0x58, 0x40);
    return yield* P.hive_menu();
  };
  // The menu, the island loaded again before each game: INSERT CREDIT (1 credit) or QUIT GAME. A
  // game ends at hive_game_over, whose JMP back here is this loop.
  P.hive_menu = function* () {
    for (;;) {
      P.select_window({ y: 6 });
      load(0x5D, 0x58, 0x51);
      M[0x0D30] = 9; M[0x0D31] = 0xB7; M[0x0D32] = 0;
      yield* cf(0x33);
      M[0x4F] = (M[0x0D20] + 4) & 255;
      M[0x50] = (M[0x50] + 9) & 255;
      M[0x79] = 0;
      const m = yield* P.menu_choose({ a: 2, y: 0x0D });
      if (!m.z) return yield* P.hive_quit();
      M[0x60] = 1; M[0x61] = 0;
      if (!P.pay_credits().c) return yield* P.hive_quit();
      yield* P.hive_game();
    }
  };
  // Back to the base: its screen, its map file again and its entries as they were
  P.hive_quit = function* () {
    yield* P.base_screen();
    load(0x78, 0x07, 0x51);
    M[0x0D30] = 1; M[0x0D31] = 0xBF; M[0x0D32] = 8;
    return copy(0x62, 0x55);
  };
  // Drop after drop ($D0), drop n with 3n mounds, until the trooper is caught
  P.hive_game = function* () {
    M[0xD0] = 1;
    for (;;) {
      yield* cf(0x31);
      yield* P.print_signed({ a: M[0xD0] });
      yield* cf(0x30);
      yield* P.wait_key();
      const x = M[0xD0], t = x << 1;
      const d = yield* P.hive_drop({ a: ((t & 255) + x + (t >> 8)) & 255, x });
      yield* P.hive_clear_view();
      if (!(d.a & 0x80)) return yield* P.hive_game_over();
      yield* cf(0x2F);
      yield* P.wait_ticks({ a: 0x0A });
      M[0xD0] = (M[0xD0] + 1) & 255;
      if (!M[0xD0]) return yield* P.hive_game_over();
    }
  };
  // From drop 5 on, (n - 4) * 8 credits; before, the Manchi win. A key and the view cleared.
  P.hive_game_over = function* () {
    const a = (M[0xD0] - 4) & 255;
    if (!(a & 0x80) && a) {
      M[0x60] = (a << 3) & 255; M[0x61] = 0;
      P.add_credits();
      yield* cf(0x2E);
      yield* P.print_number({});
      yield* cf(0x2D);
    } else yield* cf(0x32);
    yield* P.wait_key();
    return yield* P.hive_clear_view();
  };
  // The chart window filled with tile $7C and drawn, and the MOUNDS line blanked
  P.hive_clear_view = function* () {
    P.fill_chart_window({ a: 0x7C, x: 0x40, y: 0x40 });
    P.draw_chart();
    M[0x4F] = 0x0F; M[0x50] = 0x10;
    return yield* P.print_text({ a: 0x10, x: 0x4C, y: 0x58 });
  };

  // A drop at level X with A mounds: every entry but the trooper and his shot taken off; then
  // pass after pass until the trooper is caught (A 0) or back at the ship with no mound left
  // (A $FF), each of which drops this routine's return in the game
  P.hive_drop = function* (r) {
    M[0xCE] = r.x; M[0xCC] = r.a;
    for (let x = 0x1F; x !== 1; x--) P.remove_entry({ y: x });
    M[0xCD] = 0x1E;
    yield* P.hive_show_mounds();
    for (;;) {
      const k = P.hive_moves({ a: M[0xCE] });
      yield* P.hive_shoot(k);
      if (P.hive_recall().up) return { a: 0xFF, n: 1, z: 0 };
      yield* P.hive_raise_mound();
      if (!(M[0x5E] & 0x1F)) P.hive_breed();
      P.hive_draw();
      P.animate_chart();
      P.draw_chart();
      yield* P.wait_ticks({ a: 1 });
      P.hive_mood();
      if (P.hive_caught().up) return { a: 0, n: 0, z: 1 };
      M[0x5E] = (M[0x5E] + 1) & 255;
    }
  };
  // Two Manchi beside the trooper at once catch him: the chart drawn and sound 9 (up)
  P.hive_caught = function () {
    M[0x96] = 1;
    for (let y = 0x1F; y; y--) {
      if (M[0x5590 + y] !== 1 || P.entry_distance({ y }).a >= 2) continue;
      M[0x96] = (M[0x96] - 1) & 255;
      if (M[0x96] & 0x80) {
        P.hive_draw();
        P.animate_chart();
        P.draw_chart();
        P.sound_play({ a: 9 });
        return { a: 0, up: 1 };
      }
    }
    return { y: 0, z: 1 };
  };
  // Any Manchi that sees the trooper makes them all chase (kind 3) and look angry (picture 8);
  // else they all wander (kind 1), calm (picture 0)
  P.hive_mood = function () {
    M[0xC8] = 1; M[0xC9] = 0;
    M[0xC7] = 0x1F;
    let y = 0x1F;
    do {
      if (M[0x5590 + y] === 1 && !P.hive_sees({ y }).c) { M[0xC9] = 8; M[0xC8] = 3; break; }
      M[0xC7] = (M[0xC7] - 1) & 255;
      y = M[0xC7];
    } while (y);
    for (y = 0x1F; y; y--) {
      if (M[0x5590 + y] !== 1) continue;
      M[0x5550 + y] = (M[0x5550 + y] & 0xF8) | M[0xC8];
      M[0x5570 + y] = M[0xC9];
    }
    return { y: 0, z: 1 };
  };
  // A mound rises when there are fewer than five: a timer ($CD), counted twice a pass while there
  // are none, set again at zero to 1 (or 150 - 8 * level when that goes below zero, the BCC at
  // $59E4) plus a random 0-90 and random_upto's carry; the mound on a random free square that
  // neither blocks nor is brush or water, never the ship's hatch (18, 14), shown rising in three
  // frames when it is in the window
  P.hive_raise_mound = function* () {
    let x = 0;
    for (let y = 0x1F; y; y--) if (M[0x5570 + y] === 0x62) x++;
    if (x === 5) return { a: 0x62, x, y: 0, z: 1 };
    x = (x - 1) & 255;
    let reset = false;
    if (x & 0x80) { M[0xCD] = (M[0xCD] - 1) & 255; reset = !M[0xCD]; }
    if (!reset) {
      M[0xCD] = (M[0xCD] - 1) & 255;
      if (M[0xCD]) return { a: M[0xCD], x, y: 0, z: 0 };
    }
    M[0xCD] = (M[0xCE] << 3) & 255;
    const d = 0x96 - M[0xCD];
    M[0xCD] = d < 0 ? d & 255 : 1;
    const t = P.random_upto({ a: 0x5A });
    M[0xCD] = (t.a + M[0xCD] + t.c) & 255;
    for (;;) {
      M[0x97] = P.random_upto({ a: 0x1F }).a;
      M[0x98] = P.random_upto({ a: 0x1F }).a;
      if (P.sector_entries({ x: M[0x97], y: M[0x98] }).y) continue;
      if (M[0x97] === 0x12 && M[0x98] === 0x0E) continue;
      const k = P.sector_kind({ x: M[0x97], y: M[0x98] });
      if (!(k.a & 0x80) && !(k.a & 0x30)) break;
    }
    const f = P.free_entry();
    if (f.y & 0x80) return f;
    const y = f.y;
    M[0x5510 + y] = M[0x97]; M[0x5530 + y] = M[0x98];
    M[0x5570 + y] = 0x62; M[0x5550 + y] = 0x80;
    P.sound_play({ a: 0x0A });
    M[0x51] = M[0x5510]; M[0x53] = M[0x5530];
    const w = P.in_chart_window({ x: M[0x97], y: M[0x98] });
    if (w.c) return yield* P.wait_ticks({ a: 2 });
    M[0x95] = P.chart_cell_index(w).y;
    M[0xC7] = 0x5F;
    yield* P.hive_mound_frame();
    M[0xC7] = (M[0xC7] + 1) & 255;
    yield* P.hive_mound_frame();
    M[0xC7] = (M[0xC7] + 1) & 255;
    return yield* P.hive_mound_frame();
  };
  // One frame of a mound rising: tile $C7 in its cell ($95), the chart drawn, two ticks
  P.hive_mound_frame = function* () {
    P.hive_draw();
    M[0xFA00 + M[0x95]] = M[0xC7];
    P.draw_chart();
    return yield* P.wait_ticks({ a: 2 });
  };
  // Every 32nd pass each mound with fewer than four of its brood left breeds one more
  P.hive_breed = function () {
    let y = 0x1F;
    M[0xC7] = y;
    do {
      if (M[0x5570 + y] === 0x62) {
        M[0xC6] = y;
        let x = 3;
        for (let k = 0x1F; k >= 0; k--) if (M[0x5618 + k] === y) x = (x - 1) & 255;
        if (!(x & 0x80)) P.hive_breed_one();
      }
      M[0xC7] = (M[0xC7] - 1) & 255;
      y = M[0xC7];
    } while (y);
    return { y: 0, z: 1 };
  };
  // A Manchi on mound $C6's square, unless one stands there: a free entry, wandering and solid
  P.hive_breed_one = function () {
    const m = M[0xC6];
    for (let x = 0x1F; x; x--) {
      if (M[0x5590 + x] === 1 && M[0x5510 + x] === M[0x5510 + m] && M[0x5530 + x] === M[0x5530 + m]) return { a: M[0x5530 + x], x, y: m };
    }
    const f = P.free_entry();
    if (f.y & 0x80) return f;
    const y = f.y;
    M[0x5618 + y] = m;
    M[0x5510 + y] = M[0x5510 + m]; M[0x5530 + y] = M[0x5530 + m];
    M[0x5550 + y] = 0x81; M[0x5590 + y] = 1;
    return { a: 1, x: m, y };
  };

  // The trooper's shot, from his step (A the key, X and Y the step): a step taken is the aim
  // ($CA, $CB); ESC pauses for a key; space or fire shoots up to five squares along the aim.
  // Rock or water stops it; brush burns (its tile in the grid twelve on); the first Manchi it
  // meets dies; a mound is destroyed only from the square beside it.
  P.hive_shoot = function* (r) {
    M[0x95] = r.x;
    if (r.y | r.x) { M[0xCA] = r.x; M[0xCB] = r.y; }
    if (r.a === 0x1B) return yield* P.wait_key();
    if (r.a !== 0x20) { const f = P.fire_pressed(); if (!f.a) return f; }
    P.sound_play({ a: 8 });
    M[0x5511] = M[0x5510]; M[0x5531] = M[0x5530];
    M[0xC7] = 5;
    for (;;) {
      M[0x5511] = (M[0x5511] + M[0xCA]) & 255;
      M[0x5531] = (M[0x5531] + M[0xCB]) & 255;
      P.hive_draw();
      P.draw_chart();
      const k = P.sector_kind({ x: M[0x5511], y: M[0x5531] });
      if (k.a & 0x80) break;
      if ((k.a & 0x30) === 0x10) {
        M[0x95] = (k.y + 0x0C) & 255;
        const a = (0x1F - M[0x5531]) & 255;
        M[0x74] = (a << 5) & 255;
        M[0x75] = (((a >> 3) & 3) + 0x51) & 255;
        M[(ptr(0x74) + M[0x5511]) & 0xFFFF] = M[0x95];
      }
      const s = P.sector_entries({ x: M[0x5511], y: M[0x5531] });
      let hit = false;
      for (let y = (s.y - 1) & 255; s.y && !(y & 0x80); y = (y - 1) & 255) {
        const x = M[(ptr(0x74) + y) & 0xFFFF];
        if (M[0x5590 + x] === 1) { P.remove_entry({ y: x }); hit = true; break; }
        if (M[0x5570 + x] !== 0x62) continue;
        hit = true;
        if (M[0xC7] !== 5) break;
        M[0xCC] = (M[0xCC] - 1) & 255;
        if (M[0xCC] & 0x80) M[0xCC] = (M[0xCC] + 1) & 255;
        M[0x95] = x;
        yield* P.hive_show_mounds();
        P.remove_entry({ y: M[0x95] });
        break;
      }
      if (hit) break;
      M[0xC7] = (M[0xC7] - 1) & 255;
      if (!M[0xC7]) break;
    }
    M[0x5511] = 0x7F;
    return { a: 0x7F };
  };
  // "MOUNDS: " and the count at column 15, row 16; none left, "! RECALL !" and sound 3
  P.hive_show_mounds = function* () {
    M[0x4F] = 0x0F; M[0x50] = 0x10;
    if (M[0xCC]) {
      yield* P.print_text({ a: M[0xCC], x: 0x61, y: 0x5C });
      return yield* P.print_signed({ a: M[0xCC] });
    }
    yield* P.print_text({ a: 0, x: 0x6A, y: 0x5C });
    return P.sound_play({ a: 3 });
  };
  // No mound left and the trooper on the ship's hatch (18, 14): the drop is won (up)
  P.hive_recall = function () {
    if (M[0xCC] || M[0x5510] !== 0x12 || M[0x5530] !== 0x0E) return { a: M[0xCC] ? M[0xCC] : M[0x5510] };
    return { a: 0xFF, up: 1 };
  };
  // The chart window around the trooper, off the map water ($39), and the entries drawn in
  P.hive_draw = function () {
    P.fill_chart_window({ a: 0x39, x: M[0x5510], y: M[0x5530] });
    return P.draw_map_objects({ x: M[0x5510], y: M[0x5530] });
  };
  // Carry clear when Manchi Y sees the trooper: five steps toward him, a square at a time, rock
  // and the ship (kind bit 2) hiding him and brush costing two more
  P.hive_sees = function (r) {
    M[0x97] = M[0x5510 + r.y]; M[0x98] = M[0x5530 + r.y];
    M[0x94] = 5;
    const toward = (p, q) => (p === q ? 0 : ((p - q) & 0x80) ? 0xFF : 1);
    for (;;) {
      M[0x97] = (toward(M[0x5510], M[0x97]) + M[0x97]) & 255;
      M[0x98] = (toward(M[0x5530], M[0x98]) + M[0x98]) & 255;
      M[0x94] = (M[0x94] - 1) & 255;
      const k = P.sector_kind({ x: M[0x97], y: M[0x98] });
      M[0x95] = k.a;
      if (k.a & 4) return { a: 4, c: 1 };
      if ((M[0x95] & 0x30) === 0x10) M[0x94] = (M[0x94] - 2) & 255;
      if (M[0x94] & 0x80) return { a: M[0x94], c: 1 };
      if (M[0x5510] === M[0x97] && M[0x5530] === M[0x98]) return { a: M[0x5530], c: 0 };
    }
  };

  // The moves. Each Manchi moves on a pass when a random 0 to level + 10 is 9 or more, by its
  // motion kind's routine, called through a JSR whose operand is written from the table at $5D95
  // + 2 * kind (kind 1 hive_wander, 2 an RTS, 3 move_chase), and its heading set. Then the
  // trooper's step from the keys or the stick, unless fire is held, as a base's player's.
  // A, X and Y: the key and the step.
  const MOVES = { 0x5D74: 'hive_wander', 0x5D73: null, 0xA785: 'move_chase' };
  P.hive_moves = function (r) {
    M[0xC0] = r.a;
    let y = 0x1F;
    M[0xBC] = y;
    do {
      if (M[0x5590 + y] === 1 && P.random_upto({ a: (M[0xC0] + 0x0A) & 255 }).a >= 9) {
        y = M[0xBC];
        const kind = M[0x5550 + y] & 7;
        if (kind) {
          const i = kind << 1;
          M[0x5D31] = M[0x5D95 + i]; M[0x5D32] = M[0x5D96 + i];
          const to = M[0x5D31] | M[0x5D32] << 8;
          if (!(to in MOVES)) throw new Error('hive_moves: no motion routine at $' + to.toString(16));
          if (MOVES[to]) P[MOVES[to]]();
          P.set_ship_heading({ a: M[0xBC], x: M[0xBD], y: M[0xBE] });
        }
      }
      M[0xBC] = (M[0xBC] - 1) & 255;
      y = M[0xBC];
    } while (y);
    const k = P.key_direction();
    M[0xBF] = k.a; M[0xBD] = k.x; M[0xBE] = k.y;
    if (!P.fire_pressed().a && P.try_step({ a: 0, x: M[0xBD], y: M[0xBE] }).c) P.slide_step();
    P.set_ship_heading({ a: 0, x: M[0xBD], y: M[0xBE] });
    P.set_still({ a: M[0xBE], x: M[0xBD], y: 0 });
    return { a: M[0xBF], x: M[0xBD], y: M[0xBE] };
  };
  // Kind 1: a Manchi sharing its square always takes a random step, one alone one pass in four
  P.hive_wander = function () {
    const e = M[0xBC];
    const s = P.sector_entries({ x: M[0x5510 + e], y: M[0x5530 + e] });
    if (s.y === 1) {
      const t = P.random_upto({ a: 3 });
      if (t.a) return t;
    }
    P.random_step();
    return P.try_step({ a: M[0xBC], x: M[0xBD], y: M[0xBE] });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
