// The big map, magic fire and gooey blob spreading, flood and tangle vine, what a square stepped
// onto does, and the spells ($7C1C-$84EB): the spell list and its costs, casting and paying, the
// summons, the potions brewed in a cauldron, and the mana a wizard gets back.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.magic = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw, H = P.H = P.H || {};
  const wrap = a => (a >= 0x24 ? a - 0x24 : a);
  const back = (a, n) => (a < n ? a - n + 0x24 : a - n);
  const sat = a => (a > 0xFF ? 0xFF : a);
  const mana = () => (0xD0E0 + ((M[0x5B11] - 1) & 255)) & 0xFFFF;

  // big_map: 23 rows of 31 squares of the map from 8 rows above and 12 columns left of the window,
  // in the scenario's small font ($D009): terrain then creatures. Then 100 reads of the controls,
  // ending when fire is pressed; otherwise the creatures are drawn again with the other height
  // ($7C1B flips between $FE and $FF), over and over.
  def(0x7C1C, 'big_map', function* (r) {
    P.IFF = false;
    P.clear_screen({});
    setw(0xD0CC, w(0xD0C8));
    M[0xD0CC] = M[0xFF37] = back(M[0xD0CC], 8);
    M[0xD0CD] = M[0xFF38] = back(M[0xD0CD], 0x0C);
    setw(0x5B0E, w(0xD009));
    setw(0x5B15, 0);
    M[0x5B14] = 1; M[0xFF36] = 1;
    const draw = () => {
      for (let b = 0x17; b; b--) {
        M[0x5B16] = 0;
        M[0xD0CD] = M[0xFF38];
        for (let c = 0x1F; c; c--) {
          if (M[0xFF36]) P.big_map_terrain({});
          P.big_map_creature({});
          M[0x5B16] = (M[0x5B16] + 1) & 255;
          M[0xD0CD] = wrap(M[0xD0CD] + 1);
        }
        M[0x5B15] = (M[0x5B15] + 1) & 255;
        M[0xD0CC] = wrap(M[0xD0CC] + 1);
      }
    };
    draw();
    for (;;) {
      M[0xFF36] = 0;
      P.big_map_frame({});
      for (let b = 0x64; b; b--) {
        yield* P.read_controls({});
        yield { tstates: H.delayT(2) };
        if (!(M[0x5B13] & 1)) return P.clear_screen({});
      }
      P.big_map_frame({});
      setw(0xD0CC, w(0xFF37));
      setw(0x5B15, 0);
      M[0x7C1B] = (0xFD - M[0x7C1B]) & 255;
      draw();
    }
  });
  // big_map_terrain: the map byte's character and colour from ($D007), or character 8 in red for an
  // object; nothing for a creature.
  def(0x7CD9, 'big_map_terrain', r => {
    const hl = P.map_address_window({}).hl;
    let a = M[hl];
    if (a >= 0x8C) return { a, cf: false, hl };
    if (a >= 0x50) { M[0x5B17] = 0x42; a = 8; }
    else { const p = (w(0xD007) + 2 * a) & 0xFFFF; M[0x5B17] = M[(p + 1) & 0xFFFF]; a = M[p]; }
    return P.print_char_small({ a });
  });
  // big_map_creature: the creature there (the shown one, unless it is on the ground at the height
  // $7C1B not asked for and the other one there is shown) as character 1 (a wizard), 2 (on the
  // ground) or 3 (in the air), in colour $47 less its owner.
  def(0x7D00, 'big_map_creature', r => {
    const hl = P.map_address_window({}).hl;
    if (M[hl] < 0x8C) return { a: M[hl], cf: true, hl };
    P.find_creatures_any({ hl: w(0xD0CC) });
    let ix = w(0xD1AF);
    if (M[0xD1B2] && !((M[(ix + 1) & 0xFFFF] & 0x80) && M[(ix + 4) & 0xFFFF] === M[0x7C1B])) {
      const o = w(0xD1B3);
      if (M[(o + 1) & 0xFFFF] & 0x80) ix = o;
    }
    const iy = P.creature_record_of({ ix }).iy;
    M[0x5B17] = (0x47 - (M[(iy + 4) & 0xFFFF] & 7)) & 255;
    const a = M[(ix + 2) & 0xFFFF] < 0x90 ? 1 : P.is_loose({ ix }).zf ? 2 : 3;
    return P.print_char_small({ a });
  });
  // big_map_frame: two lines of 56 points across and two of 54 down, plotted ($ACC9).
  def(0x7D5B, 'big_map_frame', r => {
    M[0xFF32] = 2; M[0xFF61] = 0xFF; M[0xFF33] = 0x40;
    for (let b = 0x38; b; b--) {
      M[0xFF34] = 0x60; P.plot({});
      M[0xFF34] = 0x97; P.plot({});
      M[0xFF33] = (M[0xFF33] + 1) & 255;
    }
    M[0xFF34] = 0x61;
    for (let b = 0x36; b; b--) {
      M[0xFF33] = 0x40; P.plot({});
      M[0xFF33] = 0x77; P.plot({});
      M[0xFF34] = (M[0xFF34] + 1) & 255;
    }
    return { b: 0, hl: 0xFF34 };
  });

  // set_spread_types: $FF07 the player's magic fire ($38 + 2 x player), $FF06 its gooey blob ($40 +
  // 2 x player; none, $FE, for player 0).
  def(0x7DA4, 'set_spread_types', r => {
    const a = (2 * M[0x5B11] + 0x38) & 255;
    M[0xFF07] = a; M[0xFF06] = (a + 8) & 255;
    if (M[0x5B11]) return { a: M[0x5B11], zf: false };
    M[0xFF06] = 0xFE;
    return { a: 0xFE };
  });
  // spread_magic: each square of the player's fire or blob spreads to its neighbours as the next
  // type up, by the player's strength for it ($D04B or $D04F); the square itself then dies back
  // (to $D049 or $D04A) when a random number below the strength's chance ($B4B5 or $B4AD) is at
  // least a quarter of the neighbours' susceptibility plus $28. Then every square of the next type
  // up becomes the type again.
  def(0x7DBD, 'spread_magic', r => {
    P.set_spread_types({});
    M[0xD0CC] = 0;
    for (let b = 0x24; b; b--) {
      M[0xD0CD] = 0;
      for (let c = 0x24; c; c--) {
        const a = M[P.map_address_window({}).hl];
        let fire = -1;
        if (a === M[0xFF07]) fire = 1;
        else if (a === M[0xFF06]) fire = 0;
        if (fire >= 0) {
          M[0xFF05] = a; M[0xFF04] = fire;
          const s = M[((fire ? 0xD04B : 0xD04F) + M[0x5B11]) & 0xFFFF];
          M[0xFF0B] = s;
          M[0xFF05] = (M[0xFF05] + 1) & 255;
          P.spread_to_neighbours({ a: s });
          M[0xFF0A] = ((M[0xFF0A] >> 2) + 0x28) & 255;
          const k = P.random_below_a({ a: M[((fire ? 0xB4B5 : 0xB4AD) + M[0xFF0B]) & 0xFFFF] }).a;
          if (k >= M[0xFF0A]) {
            const t = M[(0xD049 + M[0xFF04]) & 0xFFFF];
            M[0x5B10] = t;
            M[P.map_address_window({}).hl] = t;
            P.set_terrain_under({ de: w(0xD0CC) });
          }
        }
        M[0xD0CD] = (M[0xD0CD] + 1) & 255;
      }
      M[0xD0CC] = (M[0xD0CC] + 1) & 255;
    }
    M[0xD0CC] = 0;
    for (let b = 0x24; b; b--) {
      M[0xD0CD] = 0;
      for (let c = 0x24; c; c--) {
        const hl = P.map_address_window({}).hl;
        let a = -1;
        if (M[hl] === ((M[0xFF07] + 1) & 255)) a = M[0xFF07];
        else if (M[hl] === ((M[0xFF06] + 1) & 255)) a = M[0xFF06];
        if (a >= 0) {
          M[0x5B10] = a;
          M[P.map_address_window({}).hl] = a;
          P.set_terrain_under({ de: w(0xD0CC) });
        }
        M[0xD0CD] = (M[0xD0CD] + 1) & 255;
      }
      M[0xD0CC] = (M[0xD0CC] + 1) & 255;
    }
    return { b: 0 };
  });
  // spread_to_neighbours: terrain $FF05 to each of the eight neighbours of square $D0CC whose
  // terrain's susceptibility (fire, $FF04 set: the low four bits of byte 3 of its record; blob: the
  // high four) is at least a random number plus 1; the susceptibilities added into $FF0A. $5B22,
  // the random numbers' range, is $46 less three times A.
  def(0x7EA5, 'spread_to_neighbours', r => {
    M[0x5B22] = (0x46 - 3 * (r.a & 255)) & 255;
    M[0xFF0A] = 0;
    P.list_neighbours({ hl: w(0xD0CC) });
    for (let k = 0; k < 8; k++) {
      const sq = w(0xFF0C + 3 * k);
      setw(0xFF08, sq);
      const iy = P.terrain_record({ a: P.what_is_at({ hl: sq }).a }).iy;
      const b = (P.random_below({}).a + 1) & 255;
      const v = M[0xFF04] ? M[(iy + 3) & 0xFFFF] & 0x0F : M[(iy + 3) & 0xFFFF] >> 4;
      M[0xFF0A] = (M[0xFF0A] + v) & 255;
      if (v >= b) {
        M[0x5B10] = M[0xFF05];
        setw(0xFF88, w(0xFF08));
        P.set_square_terrain({ de: w(0xFF08) });
      }
    }
    return { b: 0, hl: 0xFF24 };
  });
  // flood_area: every square of the 9 x 9 around $FF94 within the spell's level plus 3 ($FF0B)
  // becomes water ($36) or tangle vine ($37, by $5B21) when a random number is below its terrain's
  // resistance (the low or high four bits of byte 2 of its record); the range of the random numbers
  // ($5B22) grows with the distance.
  def(0x7F09, 'flood_area', r => {
    M[0xFF88] = back(M[0xFF94], 4);
    M[0xFF89] = back(M[0xFF95], 4);
    for (let b = 9; b; b--) {
      for (let c = 9; c; c--) {
        const d = P.distance({ hl: w(0xFF94), de: w(0xFF88) }).a;
        if (((M[0xFF0B] + 3) & 255) >= d) {
          M[0x5B22] = (0x12 - 2 * M[0xFF0B] + 2 * d) & 255;
          const iy = P.terrain_record({ a: P.what_is_at({ hl: w(0xFF88) }).a }).iy;
          const v = M[0x5B21] ? M[(iy + 2) & 0xFFFF] >> 4 : M[(iy + 2) & 0xFFFF] & 0x0F;
          M[0x5B10] = (0x36 + M[0x5B21]) & 255;
          P.maybe_set_terrain({ b: v });
        }
        M[0xFF89] = wrap(M[0xFF89] + 1);
      }
      M[0xFF89] = back(M[0xFF89], 9);
      M[0xFF88] = wrap(M[0xFF88] + 1);
    }
    return { b: 0 };
  });

  // step_effects: the square stepped onto ($FF91). Water ($36): a creature on the ground that
  // cannot swim (bit 5 of byte 11 of its type) drowns one time in four ($D181 = 2). The portal
  // ($35): a wizard escapes, its objects' values and $D045 added to its player's score, and the
  // routine that moved it is left too.
  def(0x7F98, 'step_effects', function* (r) {
    M[0xFF30] = 0;
    const t = M[0xFF91];
    if (t === 0x35) return yield* portal(r);
    if (t !== 0x36) return { a: t, zf: false };
    const lo = P.is_loose({ ix: w(0x5B4D) });
    if (!lo.zf) return lo;
    const iy = w(0x5B52);
    if (M[(iy + 0x0B) & 0xFFFF] & 0x20) return { zf: false, iy };
    const k = P.random_below_a({ a: 4 }).a;
    if (k) return { a: k, zf: false };
    M[0xD181] = 2;
    M[0xFF2B] = M[0x5B4F];
    yield* P.cw('damage_creature', { a: 0xFF });
    M[0xFF2D] = 1; M[0xFF30] = 1;
    yield* P.cw('show_hit', {});
    P.IFF = false;
    P.destroy_lost_objects({});
    const hl = w(0x5B3B);
    M[hl] = M[0xFF90];
    if (M[0x5B57] < 0x8C) return { a: M[0x5B57], cf: true, hl };
    const ix = w(0xD0DB);
    M[hl] = M[(ix + 2) & 0xFFFF];
    M[(ix + 4) & 0xFFFF] = 0xFF;
    return { a: 0xFF, hl, ix };
  });
  function* portal(r) {
    if (M[0x5B54] >= 0x90) return { a: M[0x5B54], cf: false };
    M[(w(0x5B4D) + 2) & 0xFFFF] = 0xFF;
    M[P.map_address_selected({}).hl] = M[0xFF90];
    P.list_selected_carries({});
    let c = 0;
    for (let b = M[0xD0DE], hl = 0xD1C0; b; b--, hl += 2) {
      M[(P.entry_address({ a: M[hl] }).hl + 2) & 0xFFFF] = 0xFF;
      c = sat(M[P.object_record({ a: M[hl + 1] }).iy] + c);
    }
    const e = (M[0x5B11] - 1) & 255;
    const p = 0xD058 + e;
    M[p] = sat(M[p] + c);
    M[p] = sat(M[0xD045] + M[p]);
    M[0xD05C + e] = M[p];
    M[0xFF05] = M[0x5B54];
    yield* P.cw('wizard_gone', { a: M[0xFF05], ix: w(0x5B4D) });
    M[0xD181] = 3;
    // the return address popped into HL: the caller's ($69B4 in select mode) when it says
    const u = { a: 3 };
    if (r.ret !== undefined) u.hl = r.ret;
    P.unwind(1, u);
  }

  // spell_name: the message of spell A's name: the summons the creatures ($91 up), the potions
  // ($6C up), magic fire and gooey blob ($42, $43), tangle vine ($38), flood on ($D3 up).
  def(0x80A0, 'spell_name', r => {
    const a = r.a & 255;
    if (a < 0x19) return { a: (a + 0x91) & 255 };
    if (a < 0x20) return { a: a + 0x53 };
    if (a < 0x22) return { a: a + 0x22 };
    if (a < 0x23) return { a: 0x38 };
    return { a: (a + 0xB0) & 255 };
  });
  // spell_list: the wizard's name, MANA, COST and LEVEL, its mana ($5B2A) and nine lines of the
  // spells; the player chooses ($FF3A, $2D cancel). A spell with a level left needs 8 action points
  // (NOT ENOUGH ACTION POINTS, $B4) and its cost in mana (NOT ENOUGH MANA, $DF), or the choice goes on.
  def(0x80BF, 'spell_list', function* (r) {
    P.IFF = false;
    M[0xB45A] = 3;
    P.clear_screen({});
    setw(0x5B1A, 0);
    setw(0x5B17, 0x4606);
    P.print_text_big({ a: (M[0x5B11] + 0x8C) & 255 });
    P.print_text_big({ a: 0xDE });
    setw(0x5B17, 0x4747);
    setw(0x5B15, 0x010B); P.print_char_big({ a: 0x3E });
    setw(0x5B15, 0x160B); P.print_char_big({ a: 0x3C });
    setw(0x5B15, 0x0F00); P.print_char_big({ a: 0x3D });
    setw(0x5B15, 0x1000);
    const a = M[mana()];
    M[0x5B2A] = a;
    P.print_number({ a });
    M[0x5B17] = 0x42;
    P.draw_frame({ hl: 0x0002, de: 0x1F15 });
    P.print_spell_page({});
    yield* P.wait_release({});
    for (;;) {
      yield* P.choose_spell({});
      P.sound_0({});
      P.spell_cost({ a: M[0xFF3A] });
      let msg = 0;
      if (M[0xFF0B]) {
        if (M[0xD1FB] < 8) msg = 0xB4;
        else if (M[0x5B2A] < M[0xFF39]) msg = 0xDF;
      }
      if (!msg) { P.clear_screen({}); M[0xB45A] = 1; return { a: 1 }; }
      M[0xD0DF] = 0;
      yield* P.show_message({ a: msg });
      P.IFF = false;
    }
  });
  // print_spell_line: spell A's name, white when it can be cast and red when not, to column 21,
  // then its cost and level, each blank (black) when the level is 0.
  def(0x816E, 'print_spell_line', r => {
    const s = r.a & 255;
    setw(0x5B17, 0x4606);
    if (!P.spell_cost({ a: s }).a) setw(0x5B17, 0x4202);
    P.print_text_big({ a: P.spell_name({ a: s }).a });
    M[0x5B16] = (M[0x5B16] - 1) & 255;
    for (let b = (0x15 - M[0x5B16]) & 255; b; b--) {
      P.print_char_big({ a: 0x20 });
      M[0x5B16] = (M[0x5B16] + 1) & 255;
    }
    M[0x5B16] = (M[0x5B16] + 3) & 255;
    setw(0x5B17, M[0xFF39] ? 0x4404 : 0);
    P.print_number({ a: M[0xFF39] });
    M[0x5B16] = (M[0x5B16] + 1) & 255;
    setw(0x5B17, M[0xFF39] ? 0x4505 : 0);
    return P.print_number({ a: M[0xFF0B] });
  });
  // spell_cost: spell A of the wizard ($5B04): $FF0B its level (the low four bits of its byte at
  // record + 2 + A), $FF39 its cost, the base cost ($B4BE) times the level plus one; both 0 for
  // $2D. HL on the spell's byte.
  def(0x81D4, 'spell_cost', r => {
    const s = r.a & 255;
    if (s === 0x2D) { M[0xFF39] = 0; M[0xFF0B] = 0; return { a: 0, zf: true }; }
    const hl = (w(0x5B04) + s + 2) & 0xFFFF;
    const lv = M[hl] & 0x0F;
    M[0xFF0B] = lv;
    const c = M[(0xB4BE + s) & 0xFFFF];
    const a = lv ? (c * (lv + 1)) & 255 : 0;
    M[0xFF39] = a;
    return lv ? { a, hl, de: s, b: 0, c } : { a, hl, de: s };
  });
  // print_spell_page: nine lines, from four before the choice to four after, wrapping round the 46.
  def(0x8202, 'print_spell_page', r => {
    const s = M[0xFF3A];
    M[0xFF05] = (s - 4 + (s < 4 ? 0x2E : 0)) & 255;
    setw(0x5B1A, 0x0203);
    for (let b = 9; b; b--) {
      P.print_spell_line({ a: M[0xFF05] });
      M[0x5B1A] = (M[0x5B1A] + 2) & 255;
      const a = M[0xFF05] + 1;
      M[0xFF05] = a >= 0x2E ? 0 : a;
    }
    return { b: 0 };
  });
  // choose_spell: down and up move the choice, wrapping, until fire.
  def(0x8232, 'choose_spell', function* (r) {
    for (;;) {
      yield* P.read_controls({});
      const a = M[0x5B13];
      if (!(a & 1)) return { a, zf: true };
      if (!(a & 4)) {
        const s = M[0xFF3A] + 1;
        M[0xFF3A] = s >= 0x2E ? 0 : s;
        P.print_spell_page({});
      } else if (!(a & 2)) {
        const s = (M[0xFF3A] - 1) & 255;
        M[0xFF3A] = s === 0xFF ? 0x2D : s;
        P.print_spell_page({});
      }
      yield* P.key_repeat({});
    }
  });
  // cast_air, cast_ground: a spell chosen and cast at a target in the air ($FE) or on the ground
  // ($FF); one not refused (carry clear) is paid for, and after magic fire to magic bolt ($20-$2A)
  // twenty frames go by before the view is centred again.
  function* cast(t) {
    M[0xFF31] = t;
    M[0x5B25] = 0;
    yield* P.spell_list({});
    if (!M[0xFF0B]) return { a: 0, zf: true };
    const c = yield* P.cast_spell({});
    if (c.cf) return c;
    P.pay_for_spell({});
    M[0xD0D0] = 0;
    M[0xB45B] = 0x10;
    const s = M[0xFF3A];
    if (s < 0x20) return { a: s, cf: true };
    if (s >= 0x2B) return { a: s, cf: false };
    P.IFF = true;
    for (let b = 0x14; b; b--) yield { halt: true };
    P.IFF = false;
    return P.centre({});
  }
  // (frames: magic lightning that kills its caster drops this routine's return address and two more)
  def(0x8266, 'cast_air', P.frame(function* (r) { return yield* cast(0xFE); }));
  def(0x826D, 'cast_ground', P.frame(function* (r) { return yield* cast(0xFF); }));
  // pay_for_spell: the spell's level down by one, its cost off the player's mana, 8 action points
  // spent and the selected creature's figures kept.
  def(0x82A2, 'pay_for_spell', r => {
    const hl = P.spell_cost({ a: M[0xFF3A] }).hl;
    if (hl !== undefined) M[hl] = (M[hl] & 0xF0) | ((M[0xFF0B] - 1) & 255);
    const p = mana();
    M[p] = (M[p] - M[0xFF39]) & 255;
    const ix = w(0x5B50);
    const a = (M[ix] - 8) & 255;
    M[ix] = a; M[0xD1FB] = a;
    return P.keep_figures({ ix, a });
  });
  // cast_spell: spell $FF3A to its routine: the dragons, the other summons, the potions, magic fire
  // to flood ($869D), then through spell_routines ($82FA). Carry set when refused.
  def(0x82D7, 'cast_spell', function* (r) {
    const s = M[0xFF3A];
    if (s < 3) return yield* P.cw('summon_dragon', { a: s });
    if (s < 0x19) return yield* P.cw('summon_creature', { a: s });
    if (s < 0x20) return yield* P.cw('brew_potion', { a: s });
    if (s < 0x24) return yield* P.jumpGen(0x869D, { a: s });
    const e = (2 * (s - 0x24)) & 255;
    const t = P.read_table_word({ hl: 0x82FA, de: e });
    return yield* P.jumpGen(t.hl, { a: e, hl: t.hl, de: t.de });
  });
  // free_record: a free creature record (byte 0 $FF) among the 86 at $5EC0: Z with C its number and
  // HL on it.
  def(0x830C, 'free_record', r => {
    let hl = 0x5EC0;
    for (let b = 0x56; b; b--, hl += 5) if (M[hl] === 0xFF) return { a: 0, zf: true, hl, b, c: 0x56 - b, de: 5 };
    return { zf: false, hl, b: 1, c: 0x55, de: 5 };
  });
  // summon_dragon: on the ground, over the matching dragon potion ($68 + spell, the heaviest object
  // there, $5B2C) the dragon is summoned; over an empty cauldron ($67) with dragon herb ($53) the
  // potion is brewed, and the summons goes on from there. Cast at the air it does nothing, and is
  // paid for.
  def(0x8320, 'summon_dragon', r => {
    if (M[0xFF31] === 0xFE) return { a: 0xFE, zf: true, cf: false };
    P.list_objects_here({});
    const p = (M[0xFF3A] + 0x68) & 255;
    M[0xFF26] = p;
    if (p === M[0x5B2C]) return P.summon_creature({});
    if (M[0x5B2C] !== 0x67) return { a: M[0x5B2C], zf: false, cf: true };
    const b = brewWith(0x53);
    return b.cf ? b : P.summon_creature({});
  });
  // summon_creature: creature type $90 + spell, refused at the air or by a flying wizard. For each
  // level, while a free record and a free entry remain, up to 40 random squares among the eight
  // around the wizard ($FF0C, three bytes each) are tried for one that is free; the creature appears
  // there.
  def(0x8342, 'summon_creature', r => {
    if (M[0xFF31] === 0xFE || M[0x5B2F] === 0xFE) return { a: 0xFE, zf: true, cf: true };
    P.list_neighbours_of_selected({});
    let b = M[0xFF0B];
    do {
      if (!P.free_record({}).zf || !P.free_entry_after_wizards({}).zf) return { a: 0, zf: true, cf: false };
      let found = false;
      for (let k = 0x28; k && !found; k--) {
        const n = P.random_below_a({ a: 8 }).a;
        setw(0x5B23, P.read_table_word({ hl: 0xFF0C, de: (3 * n) & 255 }).hl);
        found = P.square_free({ a: 0xFF }).zf;
      }
      if (!found) return { a: 0, zf: true, cf: false };
      const t = (M[0xFF3A] + 0x90) & 255;
      M[0x5B25] = t;
      M[w(0x5B3B)] = M[0xD063] ? t : 0x4F;
      P.create_creature({});
      b = (b - 1) & 255;
    } while (b);
    return { a: 0, zf: true, cf: false };
  });
  // square_free: Z when square $5B23 can take a creature on the ground: its terrain passable (byte 0
  // of its record not $FF) and nobody there, or only a flier. The terrain in $5B10.
  def(0x83A6, 'square_free', r => {
    P.find_creatures_at({ hl: w(0x5B23), a: r.a });
    const t = P.what_is_at({ hl: w(0x5B23) }).a;
    M[0x5B10] = t;
    const iy = P.terrain_record({ a: t }).iy;
    let free;
    if (M[iy] === 0xFF) free = false;
    else if (!M[0xD1AE]) free = true;
    else if (P.is_loose({ ix: w(0xD1AF) }).zf) free = false;
    else free = !M[0xD1B2];
    return free ? { a: 0, zf: true, iy } : { a: 1, zf: false, iy };
  });
  // create_creature, create_creature_any: a creature of type $5B25 at square $5B23 for the current
  // player, in a free entry (from entry 4, or any) and a free record: the entry the square, the type,
  // the terrain under it ($5B10), $FF and the record; the record its type's action points, stamina
  // and constitution, no potion, the owner (a pixie, $93, invisible). Against the computer it goes
  // in its wizard's list.
  const create = f => {
    const ix = f.ix, sq = w(0x5B23);
    M[ix] = sq & 255; M[(ix + 1) & 0xFFFF] = sq >> 8;
    M[(ix + 2) & 0xFFFF] = M[0x5B25]; M[(ix + 3) & 0xFFFF] = M[0x5B10]; M[(ix + 4) & 0xFFFF] = 0xFF;
    const fr = P.free_record({});
    M[(ix + 5) & 0xFFFF] = fr.c;
    const iy = P.type_record({ a: M[0x5B25] }).iy;
    const hl = fr.hl;
    M[hl] = M[iy]; M[(hl + 1) & 0xFFFF] = M[(iy + 2) & 0xFFFF]; M[(hl + 2) & 0xFFFF] = M[(iy + 3) & 0xFFFF];
    M[(hl + 3) & 0xFFFF] = 0; M[(hl + 4) & 0xFFFF] = M[0x5B11];
    if (M[0x5B25] === 0x93) M[(hl + 4) & 0xFFFF] |= 8;
    if (!M[0xD063]) return { a: 0, zf: true, ix, iy, hl: (hl + 4) & 0xFFFF, c: fr.c };
    return P.add_to_wizard_list({ a: M[0xD063], ix, iy, hl: (hl + 4) & 0xFFFF, c: fr.c });
  };
  def(0x83DB, 'create_creature_any', r => create(P.free_entry({})));
  def(0x83E3, 'create_creature', r => create(P.free_entry_after_wizards({})));
  // summon_display: the summoning sound, then its effect played over and over while the interrupt
  // runs the summoning animation (the counter at ($D032) + $18F from $A5 to $A8).
  def(0x8436, 'summon_display', function* (r) {
    P.start_sound({ a: 0x0F });
    P.set_sound({ a: 2 });
    const hl = (w(0xD032) + 0x18F) & 0xFFFF;
    M[hl] = 0xA5;
    M[0xD0DF] = 0x15; M[0xC839] = 0x15;
    P.IFF = true;
    // the counter is the interrupt's, read just after the call returns: through P.irqByte
    do {
      yield* H.playSound(true);
      yield { cp: 0x8456 };
    } while (P.irqByte(hl) !== 0xA8);
    P.IFF = false;
    M[0xC839] = 0; M[0x5B25] = 0;
    return { a: 0, zf: true, hl };
  });
  // brew_potion: an empty cauldron ($67) on the square and the potion's ingredient
  // (potion_ingredients, $84CE) among the objects there; refused otherwise.
  def(0x8465, 'brew_potion', r => {
    P.list_objects_here({});
    if (!M[0xD0DD]) return { a: 0, zf: true, cf: true };
    if (M[0x5B2C] !== 0x67) return { a: M[0x5B2C], zf: false, cf: true };
    M[0xFF26] = (M[0xFF3A] + 0x52) & 255;
    return brewWith(M[(0x84CE + ((M[0xFF3A] - 0x19) & 255)) & 0xFFFF]);
  });
  // brew_with: potion $FF26 from ingredient C, refused (carry) if none lies on the square: the
  // ingredient gone, the cauldron the potion, with the level plus 3 gulps in the high four bits of
  // byte 5 and its strength, the level less 1, in the low four. Shown as a cauldron ($4F) unless
  // hidden.
  const brewWith = c => {
    let hl = 0xD1D5, b = M[0xD0DD];
    for (;;) {
      if (M[hl] === c) break;
      hl += 2;
      b = (b - 1) & 255;
      if (!b) return { a: M[hl - 2], cf: true, hl, b: 0 };
    }
    M[(P.entry_address({ a: M[hl - 1] }).hl + 2) & 0xFFFF] = 0xFF;
    const e = P.entry_address({ a: M[0x5B2D] }).hl;
    M[(e + 2) & 0xFFFF] = M[0xFF26];
    const l = (M[0xFF0B] - 1) & 255;
    const v = (((l + 4) << 4) | l) & 255;
    M[(e + 5) & 0xFFFF] = v;
    M[0x5B25] = v;
    const ma = P.map_address_selected({}).hl;
    if (M[0xD063]) return { a: M[0xD063], zf: false, cf: false, hl: ma };
    M[ma] = 0x4F;
    return { a: M[0xD063], zf: true, cf: false, hl: ma };
  };
  def(0x848A, 'brew_with', r => brewWith(r.c & 255));
  // add_mana: A to the player's mana ($D0E0), up to its wizard's starting mana (byte 0 of its record).
  def(0x84D5, 'add_mana', r => {
    const hl = mana();
    const a = ((r.a & 255) + M[hl]) & 255;
    M[hl] = a;
    const top = M[w(0x5B04)];
    if (a < top) return { a: top, cf: true, hl };
    M[hl] = top;
    return { a: top, cf: false, hl };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
