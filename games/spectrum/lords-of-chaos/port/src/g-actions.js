// The select menu's actions and END TURN ($6FF1-$755F): drop, change and pick up an object, ride a
// mount or let the rider off, pick a target square, use an object on a square (doors, keys,
// chests), drink, fill a vial and eat; the distance between squares; END TURN asked again.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.actions = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;
  const rlca = a => ((a << 1) | (a >> 7)) & 255;
  const rrca = a => ((a >> 1) | (a << 7)) & 255;
  // the pair of number and type the choice ($C662, 1 up) names in a list at p
  const chosen = p => (p + rlca((M[0xC662] - 1) & 255)) & 0xFFFF;

  // drop: the object in use ($D0DB) no longer in use or carried; a sound when the turn is shown.
  def(0x6FF1, 'drop', r => {
    P.IFF = false;
    const ix = w(0xD0DB);
    M[(ix + 3) & 0xFFFF] &= 0x7F;
    M[(ix + 4) & 0xFFFF] = 0xFF;
    M[0x5B57] = 0;
    if (M[0xD066]) return { a: M[0xD066], zf: false };
    return P.start_sound({ a: 9 });
  });

  // change: what the creature carries listed (NO OBJECT IN USE first), the chosen one in use; another
  // than before costs 4 action points.
  def(0x700D, 'change', function* (r) {
    P.IFF = false;
    P.clear_screen({});
    if (M[0xD0D9]) M[(w(0xD0DB) + 3) & 0xFFFF] &= 0x7F;
    M[0xC662] = M[0x5B59];
    M[0x5B0A] = M[0xD0DE];
    P.print_text_big({ a: 0xC2 });
    yield* P.choose_from_list({ hl: 0xD1C0 });
    M[0x5B57] = 0;
    if (M[0xC662]) {
      const p = chosen(0xD1C1);
      M[0x5B57] = M[p];
      const e = P.entry_address({ a: M[(p - 1) & 0xFFFF] }).hl;
      M[(e + 3) & 0xFFFF] |= 0x80;
    }
    if (M[0xC662] !== M[0x5B59]) P.spend_action_points({ a: 4 });
    return P.clear_screen({});
  });

  // pick_up: the objects on the square listed with the weight the creature can still carry; one too
  // heavy gives TOO HEAVY, one it can take becomes its object in use, for 8 action points; while it
  // has 8 more, room and objects remain, the list comes again.
  def(0x706A, 'pick_up', function* (r) {
    for (;;) {
      P.IFF = false;
      P.clear_screen({});
      M[0xC662] = 0;
      P.carried_weight({});
      M[0xFF52] = (P.carry_limit({}).a - M[0xFF51]) & 255;
      let p, iy;
      for (;;) {
        P.print_text_big({ a: 0xC3 });
        setw(0x5B17, 0x4707);
        M[0x5B16] = (M[0x5B16] - 1) & 255;
        P.print_number({ a: M[0xFF52] });
        M[0x5B0A] = M[0xD0DD];
        yield* P.choose_from_list({ hl: 0xD1D4 });
        if (!M[0xC662]) return P.clear_screen({});
        p = chosen(0xD1D5);
        iy = P.object_record({ a: M[p] }).iy;
        if (M[0xFF52] >= M[(iy + 1) & 0xFFFF]) break;
        P.IFF = false;
        P.colour_choice_row({ a: 0, b: 0 });
        P.print_text_big({ a: 0xC4 });
        P.IFF = true;
        yield* P.wait_release({});
        yield* P.wait_press({});
        P.IFF = false;
        P.colour_choice_row({ a: 0, b: 0 });
      }
      M[0x5B57] = M[p];
      const e = P.entry_address({ a: M[(p - 1) & 0xFFFF] }).hl;
      M[(e + 3) & 0xFFFF] |= 0x80;
      M[(e + 4) & 0xFFFF] = M[0x5B4F];
      if (M[0xD0D9]) M[(w(0xD0DB) + 3) & 0xFFFF] &= 0x7F;
      M[0xD0D9] = M[0x5B57];
      M[0xFF90] = M[0xFF91];
      P.start_sound({ a: 0x0A });
      if (P.spend_action_points({ a: 8 }).a < 8) return P.clear_screen({});
      P.list_objects_here({});
      if (!M[0xD0DD]) return P.clear_screen({});
      P.list_selected_carries({});
      if (M[0xD0DE] >= 0x0A) return P.clear_screen({});
    }
  });

  // carried_weight: the weights of the objects the selected creature carries (list at $D1C0) into
  // $FF51; creatures carried not counted.
  def(0x712C, 'carried_weight', r => {
    M[0xFF51] = 0;
    const n = M[0xD0DE];
    if (!n) return { a: 0, zf: true };
    let hl = 0xD1C1;
    for (let b = n; b; b--, hl += 2) {
      if (M[hl] >= 0x8C) continue;
      const iy = P.object_record({ a: M[hl] }).iy;
      M[0xFF51] = (M[(iy + 1) & 0xFFFF] + M[0xFF51]) & 255;
    }
    return { b: 0 };
  });

  // find_partner: another creature on the selected creature's square at its height ($5B2F) that
  // rides nothing: Z, its entry in IX and its number in $D1A3.
  def(0x7156, 'find_partner', r => {
    P.find_others_at({ hl: w(0x5B55) });
    let ix = r.ix;
    if (M[0xD1AE]) {
      M[0xD1A3] = M[0xD1B1];
      ix = w(0xD1AF);
      if (M[0x5B2F] === M[(ix + 4) & 0xFFFF]) return { a: M[0x5B2F], zf: true, ix };
      if (M[0xD1B2]) {
        M[0xD1A3] = M[0xD1B5];
        ix = w(0xD1B3);
        if (M[0x5B2F] === M[(ix + 4) & 0xFFFF]) return { a: M[0x5B2F], zf: true, ix };
      }
    }
    return { a: 1, zf: false, ix };
  });

  // ride: the selected creature climbs onto the mount on its square (10 action points unless
  // flying, $5B43); the mount takes over its engaged bit and select mode starts again on the mount,
  // the two return addresses below dropped. (A generator, as the jump to select mode is one.)
  def(0x718E, 'ride', function* (r) {
    if (!M[0x5B43]) P.spend_action_points({ a: 0x0A });
    const ix = w(0x5B4D);
    M[0x5B3A] = M[0xD1A3];
    M[(ix + 4) & 0xFFFF] = M[0xD1A3];
    M[(ix + 3) & 0xFFFF] |= 0x80;
    const mount = w(0xD1A1);
    setw(0x5B38, mount);
    const iy = P.creature_record_of({ ix: mount }).iy;
    M[(iy + 4) & 0xFFFF] |= M[(w(0x5B50) + 4) & 0xFFFF] & 0x10;
    setw(0xD0D3, w(0x5B55));
    M[0x5B43] = 0;
    return P.unwind(2, { a: 0, ix: w(0x5B50), iy }, 0x691F);
  });
  // rider: the mount's rider ($D0DA) gets off at the mount's height, kept in $5B43, and select mode
  // starts again on it.
  def(0x71D3, 'rider', function* (r) {
    M[0x5B3A] = M[0xD0DA];
    const e = P.entry_address({ a: M[0xD0DA] }).hl;
    setw(0x5B38, e);
    const a = M[(w(0x5B4D) + 4) & 0xFFFF];
    M[(e + 4) & 0xFFFF] = a;
    M[(e + 3) & 0xFFFF] &= 0x7F;
    setw(0xD0D3, w(0x5B55));
    M[0x5B43] = a;
    return P.unwind(2, { a, ix: e, hl: w(0x5B55) }, 0x691F);
  });

  // pick_target: a target square within range A ($FF60, from $5B45) chosen with the cursor until fire;
  // $FF86 and the rider kept, the object in use put back in $D0D9.
  def(0x7202, 'pick_target', function* (r) {
    M[0xFF60] = r.a;
    const f86 = w(0xFF86);
    setw(0xFF86, 0x0103);
    setw(0x5B45, w(0xD0D3));
    const da = M[0xD0DA];
    P.describe_cursor_square({});
    P.fill_icon_list({});
    P.draw_creature_panel({});
    M[0xD0DF] = 5;
    yield* P.wait_release({});
    do {
      yield* P.read_controls({});
      P.move_cursor({});
      yield* P.update_info_panel({});
      P.IFF = true;
    } while (M[0x5B13] & 1);
    M[0xD0DA] = da;
    setw(0xFF86, f86);
    M[0xD0D9] = M[0x5B57];
    return { a: M[0x5B57], hl: f86 };
  });

  // distance: between squares HL and DE on the wrapping map, in half squares (line_setup's longer
  // difference twice plus the shorter).
  const distance = (hl, de) => {
    setw(0xFF3B, hl); setw(0xFF3D, de);
    P.line_setup({});
    return { a: (2 * M[0xFF46] + M[0xFF45]) & 255, hl: 0xFF45 };
  };
  def(0x724A, 'distance_from_selected', r => distance(w(0x5B55), r.de));
  def(0x724D, 'distance', r => distance(r.hl, r.de));

  // use: a square next to the creature picked (range 4), then use_square.
  def(0x7260, 'use', function* (r) {
    P.centre({});
    yield* P.pick_target({ a: 4 });
    M[0xD0D0] = 0;
    return yield* useSquare();
  });
  // use_square: the object in use on the cursor's square: a key ($7D) opens a locked door ($1F-$21)
  // into a closed one and is used up; a closed door ($22-$24) opens, an open one ($25-$27) with
  // nothing in it closes; a chest key ($7E) unlocks a locked chest ($7A); an unlocked chest ($7B)
  // opens ($7C) and lets go what is in it. Anything else, in the air or with a creature there, goes
  // to the scenario ($D024). Four action points.
  function* useSquare() {
    P.IFF = false;
    M[0x5B10] = P.what_is_under_cursor({}).a;
    P.list_objects_at({ de: w(0xD0D3) });
    const scenario = function* () { return yield* P.jumpGen(0xD024, {}); };
    if (M[0x5B2F] === 0xFE) return yield* scenario();
    P.find_creatures_any({ hl: w(0xD0D3) });
    if (M[0xD1AE]) {
      if (P.is_loose({ ix: w(0xD1AF) }).zf) return yield* scenario();
      if (M[0xD1B2]) return yield* scenario();
    }
    const t = M[0x5B10];
    let b = -1, opened = false;
    if (t >= 0x1F && t < 0x22) {
      if (M[0x5B57] === 0x7D) {
        M[(w(0xD0DB) + 2) & 0xFFFF] = 0xFF;
        M[0x5B57] = 0;
        b = (t + 3) & 255;
      }
    } else if (t >= 0x22 && t < 0x25) b = (t + 3) & 255;
    if (b < 0 && !M[0x5B2C] && t >= 0x25 && t < 0x28) b = t - 3;
    if (b < 0) {
      if (M[0x5B2C] === 0x7A && M[0x5B57] === 0x7E) {
        M[(P.entry_address({ a: M[0x5B2D] }).hl + 2) & 0xFFFF] = 0x7B;
        M[(w(0xD0DB) + 2) & 0xFFFF] = 0xFF;
        M[0x5B57] = 0;
        opened = true;
      } else if (M[0x5B2C] === 0x7B) {
        M[(P.entry_address({ a: M[0x5B2D] }).hl + 2) & 0xFFFF] = 0x7C;
        for (let k = 0, hl = 0x5B5E; k < 0x91; k++, hl += 6) if (M[hl] === M[0x5B2D]) M[hl] = 0xFF;
        P.trip_square({ de: w(0xD0D3) });
        opened = true;
      } else return yield* scenario();
    }
    if (!opened) {
      P.IFF = false;
      M[0xD0D0] = 0;
      if (!M[0xD066]) P.draw_map({});
      if (M[0x5B12] < 0x50) M[w(0x5B3B)] = b;
      M[0x5B10] = b;
      P.set_terrain_under({ de: w(0xD0D3) });
    }
    P.spend_action_points({ a: 4 });
    if (M[0xD063]) return { a: M[0xD063], zf: false };
    P.draw_map({});
    P.start_sound({ a: 1 });
    M[0xB45B] = 8;
    P.IFF = true;
    return {};
  }
  def(0x726C, 'use_square', function* (r) { return yield* useSquare(); });

  // set_terrain_under: terrain $5B10 under every entry at row E, column D (bit 7 kept), then
  // trip_square.
  def(0x7381, 'set_terrain_under', r => {
    const e = r.de & 255, d = r.de >> 8;
    for (let b = 0, hl = 0x5B5A; b < 0x91; b++, hl += 6) {
      if (M[hl] !== e || (M[hl + 1] & 0x3F) !== d) continue;
      M[hl + 3] = (M[hl + 3] & 0x80) | M[0x5B10];
    }
    return P.trip_square({ de: r.de });
  });

  // can_drink: NZ when the object in use is a vial ($73-$79), or the creature is on the ground with a
  // potion in a cauldron ($6B-$71) on its square.
  def(0x73AA, 'can_drink', r => {
    const a = M[0xD0D9];
    if (a >= 0x73 && a < 0x7A) return { a: 1, zf: false };
    if (M[0x5B2F] !== 0xFE) {
      P.list_objects_here({});
      const c = M[0x5B2C];
      if (c >= 0x6B && c < 0x72) return { a: 1, zf: false };
    }
    return { a: 0, zf: true };
  });
  // drink: 4 action points and a sound; the vial in use emptied ($72), or a gulp from the cauldron
  // (the high four bits of byte 5; empty, $67, when none is left). Potion 7 restores stamina and
  // skill and clears the potion; the others become the creature's potion with a strength scaled by
  // its type (byte 9); potion 3 makes it invisible, the others visible, except for type $93.
  def(0x73D0, 'drink', r => {
    P.spend_action_points({ a: 4 });
    P.start_sound({ a: 0x0B });
    const a = M[0x5B57];
    if (a >= 0x73 && a < 0x7A) {
      M[0xFF26] = a - 0x72;
      const ix = w(0xD0DB);
      M[(ix + 2) & 0xFFFF] = 0x72;
      M[0x5B57] = 0x72;
      M[0xFF27] = M[(ix + 5) & 0xFFFF];
    } else {
      P.list_objects_here({});
      M[0xFF26] = (M[0x5B2C] - 0x6A) & 255;
      const hl = (P.entry_address({ a: M[0x5B2D] }).hl + 5) & 0xFFFF;
      M[0xFF27] = M[hl] & 0x0F;
      M[hl] = (M[hl] - 0x10) & 255;
      if (!(M[hl] & 0xF0)) M[(hl - 3) & 0xFFFF] = 0x67;
    }
    const ix = w(0x5B50);
    if (M[0xFF26] === 7) {
      M[(ix + 2) & 0xFFFF] = M[0xD202];
      M[(ix + 1) & 0xFFFF] = M[0xD201];
      M[(ix + 4) & 0xFFFF] &= 0x1F;
      return {};
    }
    const iy = w(0x5B52), s = M[0xFF27];
    const q = P.divide({ a: (((s * 2) & 255) + s + 0x0A) & 255, b: M[(iy + 9) & 0xFFFF] }).a;
    M[(ix + 3) & 0xFFFF] = rrca(rrca(rrca(M[0xFF26]))) | q;
    if (M[0xFF26] === 3) { M[(ix + 4) & 0xFFFF] |= 8; return {}; }
    if (M[0x5B54] === 0x93) return { zf: true };
    M[(ix + 4) & 0xFFFF] &= ~8;
    return {};
  });
  // can_fill: Z when the object in use is an empty vial ($72) and a potion in a cauldron lies here.
  def(0x747E, 'can_fill', r => {
    if (M[0x5B57] !== 0x72) return { a: M[0x5B57], zf: false };
    P.list_objects_here({});
    const c = M[0x5B2C];
    if (c >= 0x6B && c < 0x72) return { a: 0, zf: true };
    return { a: 1, zf: false };
  });
  // fill: a gulp from the cauldron into the empty vial, which becomes the potion's ($cauldron + 8)
  // with its strength; 4 action points.
  def(0x7498, 'fill', r => {
    P.list_objects_here({});
    const ix = P.entry_address({ a: M[0x5B2D] }).hl;
    M[(ix + 5) & 0xFFFF] = (M[(ix + 5) & 0xFFFF] - 0x10) & 255;
    if (!(M[(ix + 5) & 0xFFFF] & 0xF0)) M[(ix + 2) & 0xFFFF] = 0x67;
    const b = M[(ix + 5) & 0xFFFF] & 0x0F;
    const a = (M[0x5B2C] + 8) & 255;
    const v = w(0xD0DB);
    M[(v + 2) & 0xFFFF] = a;
    M[(v + 5) & 0xFFFF] = b;
    M[0x5B57] = a;
    return P.spend_action_points({ a: 4 });
  });
  // can_eat: NZ when the object in use can be eaten (bit 2 of byte 5 of its record).
  def(0x74D2, 'can_eat', r => {
    const a = M[0xD0D9];
    if (!a || a >= 0x8C) return { a: 0, zf: true };
    const iy = P.object_record({ a }).iy;
    return { iy, zf: !(M[(iy + 5) & 0xFFFF] & 4) };
  });
  // eat: 4 action points and a sound; the object used up; its byte 2 restores stamina four times
  // over and skill once, each up to the creature's own ($D201, $D202); for a wizard byte 3 restores
  // mana.
  def(0x74E5, 'eat', r => {
    P.spend_action_points({ a: 4 });
    P.start_sound({ a: 0x0C });
    const ix = w(0xD0DB);
    const iy = P.object_record_of({ ix }).iy;
    M[(ix + 2) & 0xFFFF] = 0xFF;
    M[0x5B57] = 0;
    const rec = w(0x5B50);
    let a = (((M[(iy + 2) & 0xFFFF] * 4) & 255) + M[(rec + 1) & 0xFFFF]) & 255;
    if (a >= M[0xD201]) a = M[0xD201];
    M[(rec + 1) & 0xFFFF] = a;
    a = (M[(rec + 2) & 0xFFFF] + M[(iy + 2) & 0xFFFF]) & 255;
    if (a >= M[0xD202]) a = M[0xD202];
    M[(rec + 2) & 0xFFFF] = a;
    if (M[0x5B54] >= 0x90) return { a: M[0x5B54] };
    return P.add_mana({ a: M[(iy + 3) & 0xFFFF], iy, ix: rec });
  });

  // end_turn: CANCEL or END TURN, asked again. END TURN drops three return addresses, leaving the
  // human turn's loop; CANCEL drops the menu's own and goes back to the cursor.
  def(0x7532, 'end_turn', P.frame(function* (r) {
    P.clear_bars({});
    P.start_menu({});
    P.print_text({ a: 0xB3 });
    P.add_menu_option({ a: 0 });
    P.print_text({ a: 0xB2 });
    P.add_menu_option({ a: 1 });
    P.IFF = true;
    yield* P.run_menu({});
    P.IFF = false;
    return yield* P.dispatch_menu({ hl: 0x7557 });
  }));
  def(0x755B, 'end_turn_yes', r => { P.IFF = false; return P.unwind(3, {}); });
  def(0x755D, 'end_turn_no', r => { P.IFF = false; return P.unwind(1, {}); });
};
})(typeof window !== 'undefined' ? window : globalThis);
