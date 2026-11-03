// Select mode ($6904-$6FE3): a creature selected from the cursor menu, moved a square at a time with
// fire on a neighbouring square (a step, an attack or a message, as classify_step and the scenario
// say), and the select menu, built from what this creature can do now; flying and landing, and the
// list a creature chooses an object from.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.select = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;
  const rlca = a => ((a << 1) | (a >> 7)) & 255;

  // select_air, select_ground: the flying creature ($5B35, number $5B37) or the one on the ground
  // ($5B38, $5B3A) selected; its figures loaded, its panel drawn, and select mode: the controls move
  // the cursor, and fire on a neighbouring square steps there, attacks or explains why not, fire
  // elsewhere opens the select menu. END MOVE, and an attacker that dies, leave by dropping return
  // addresses.
  function* select(at, num) {
    P.IFF = false;
    // IX and IY as the game's would hold them, for the select menu, which reads IX when no partner
    // is found
    const rg = {};
    const keep = o => { if (o) for (const k of ['ix', 'iy']) if (o[k] !== undefined) rg[k] = o[k]; return o; };
    const ma = P.map_address_cursor({}).hl;
    const ix = rg.ix = w(at);
    setw(0xFFF9, ix);
    const t = M[(ix + 2) & 0xFFFF];
    M[0x5B12] = t;
    M[ma] = t;
    M[0x5B58] = M[num];
    setw(0xFF88, w(0xD0D3));
    const d = keep(P.describe_creature({ ix }));
    keep(P.fill_icon_list({}));
    keep(P.load_figures({ ix: d.ix, iy: d.iy }));
    keep(P.draw_creature_panel({}));
    keep(P.make_selected({ ix: d.ix, iy: d.iy }));
    keep(P.centre({}));
    keep(P.draw_map({}));
    P.IFF = true;
    yield* P.wait_release({});
    for (;;) {
      keep(yield* P.read_controls({}));
      keep(P.move_cursor({}));
      let menu = false;
      if (!(M[0x5B13] & 1)) {
        P.IFF = false;
        keep(P.list_neighbours_of_selected({}));
        let c = 0, hl = 0xFF0C;
        for (; c < 8; c++, hl += 3) if (M[hl] === M[0xD0D3] && M[hl + 1] === M[0xD0D4]) break;
        if (c === 8) menu = true;
        else {
          M[0xFF92] = M[hl + 2];
          M[0xFF93] = c;
          const k = keep(P.classify_step({ hl: w(0xD0D3) }));
          keep(yield* P.jumpGen(0xD01E, Object.assign({}, k, rg)));
          const v = M[0xFF8F];
          if (v === 5) {
            if (M[0xD065] === 1) menu = true;
            else {
              keep(P.move_selected({}));
              keep(yield* P.jumpGen(0xD021, Object.assign({}, rg)));
              keep(P.start_sound({ a: 4 }));
              keep(yield* P.cw('step_effects', { ret: 0x69B4 }));
              if (M[0xFF30]) return { a: M[0xFF30], zf: false };
              keep(P.cursor_to_step({}));
              const iy = w(0x5B50);
              if (M[(iy + 4) & 0xFFFF] & 0x10) keep(yield* P.show_message({ a: 0xB9 }));
              else {
                if (keep(P.show_enemy_spotted({})).zf) keep(P.print_square_name({}));
                P.IFF = true;
                keep(yield* P.wait_release({}));
              }
            }
          } else if (v === 4) { keep(yield* P.cw('attack', { ret: 0x69E3 })); P.IFF = false; }
          else if (v === 0) keep(yield* P.attack_terrain({}));
          else if (v === 7) menu = true;
          else keep(yield* P.show_message({ a: (v + 0xB3) & 255 }));
        }
      }
      if (menu) { P.IFF = true; keep(yield* P.select_menu(Object.assign({}, rg))); continue; }
      keep(yield* P.update_info_panel({}));
      P.IFF = true;
    }
  }
  def(0x6904, 'select_air', P.frame(function* (r) { return yield* select(0x5B35, 0x5B37); }));
  def(0x691F, 'select_ground', P.frame(function* (r) { return yield* select(0x5B38, 0x5B3A); }));

  // update_info_panel: while the cursor moves ($D0D8) the information display is cleared once ($D0D7
  // set) and a control's release awaited; when it stops the display is filled again for the square
  // under the cursor.
  def(0x6A0D, 'update_info_panel', function* (r) {
    if (M[0xD0D8]) {
      if (M[0xD0D7]) return { a: M[0xD0D7], zf: false };
      M[0xD0D7] = 1;
      P.clear_info_panel({});
      return yield* P.short_wait({});
    }
    if (!M[0xD0D7]) return { a: 0, zf: true };
    P.describe_cursor_square({});
    P.fill_icon_list({});
    P.print_square_name({});
    M[0xD0D7] = 0;
    return { a: 0 };
  });

  // cursor_to_step: the cursor on the square the creature stepped to (three plus the step $FF93 of
  // the table at $B49D from the window's origin, wrapping), the map redrawn, the message line
  // cleared.
  def(0x6A37, 'cursor_to_step', r => {
    P.centre({});
    const p = (0xB49D + ((2 * M[0xFF93]) & 255)) & 0xFFFF;
    M[0xD0D1] = (3 + M[p]) & 255;
    M[0xD0D2] = (3 + M[(p + 1) & 0xFFFF]) & 255;
    const wrap = a => (a >= 0x24 ? a - 0x24 : a);
    M[0xD0D3] = wrap((M[0xD0C8] + M[0xD0D1]) & 255);
    M[0xD0D4] = wrap((M[0xD0C9] + M[0xD0D2]) & 255);
    P.draw_map({});
    M[0x5B12] = M[P.map_address_cursor({}).hl];
    return P.clear_message_line({});
  });

  // show_message: message A in white, double height, on the message line; $5B42 set; the controls
  // let go and pressed; the line cleared.
  def(0x6A82, 'show_message', function* (r) {
    P.blank_message_line({});
    setw(0x5B17, 0x4707);
    setw(0x5B1A, 0x0016);
    P.print_text_big({ a: r.a });
    M[0x5B42] = 1;
    P.IFF = true;
    yield* P.wait_release({});
    yield* P.wait_press({});
    return P.clear_message_line({});
  });

  // end_move: the selected creature put down where it stands: the square it left gets back what
  // lay there ($FF90), its position, terrain, action points and stamina from the copies at
  // $5B30-$5B34, no longer engaged; a mount's rider goes with it. In a human's turn it leaves select
  // mode, dropping two return addresses (its own and the select menu's).
  def(0x6AA6, 'end_move', r => {
    const fp = P.find_partner({});
    if (fp.zf) {
      setw(0xD1A1, fp.ix);
      M[P.map_address_selected({}).hl] = M[0xFF90];
      const sq = w(0x5B30);
      setw(0x5B55, sq);
      const ix = w(0x5B4D);
      P.set_entry_square({ ix, hl: sq });
      M[(ix + 3) & 0xFFFF] = (M[(ix + 3) & 0xFFFF] & 0x80) | M[0x5B34];
      M[0xB45C] = M[0x5B34];
      M[0xFF91] = M[0x5B34];
      const ma = P.map_address_selected({}).hl;
      M[0xFF90] = M[ma];
      if (M[ma] < 0x8C) M[ma] = M[0x5B54];
      const rec = w(0x5B50);
      M[rec] = M[0xD1FB] = M[0x5B32];
      M[(rec + 1) & 0xFFFF] = M[0xD1FC] = M[0x5B33];
      M[(rec + 4) & 0xFFFF] &= ~0x10;
      P.centre({});
      P.move_carried({ hl: w(0x5B55) });
      if (M[0xFF90] >= 0x8C) {
        M[0x5B43] = 0;
        if (P.find_partner({}).zf) {
          const e = w(0x5B4D);
          M[(e + 4) & 0xFFFF] = M[0xD1A3];
          M[(e + 3) & 0xFFFF] |= 0x80;
        }
      }
    }
    if (M[0xD063]) return { a: M[0xD063], zf: false };
    return P.unwind(2, { a: 0, zf: true });
  });

  // select_menu: the options this creature can take now, each added with its name, run, and the
  // choice dispatched through select_actions ($6D8E); then the map, the display, the creature and its
  // panel put back.
  def(0x6B31, 'select_menu', P.frame(function* (r) {
    M[0xD0DF] = 1;
    P.clear_message_line({});
    P.print_square_name({});
    P.clear_bars({});
    P.start_menu({});
    M[0xFF91] = P.what_is_at({ hl: w(0x5B55) }).a;
    M[0x5B26] = (M[0x5B11] - 1) & 255;
    M[0x5B27] = M[0x5B54] < 0x90 ? 1 : 0;
    P.list_selected_carries({});
    const opt = (a, t) => { P.add_menu_option({ a }); if (t !== undefined) P.print_text({ a: t }); };
    opt(0, 0xB8); opt(4, 0xBE); opt(0x14, 0xB1);
    const fp = P.find_partner({ ix: r.ix });
    setw(0xD1A1, fp.ix);
    // the options whose turn may never come: each returns false to go straight to the end
    const options = () => {
      if (fp.zf) {
        if (!M[0x5B43]) {
          if (M[0xD1FB] < 0x0A || M[0x5B2F] === 0xFE) return;
          if (!(M[(w(0x5B52) + 0x0B) & 0xFFFF] & 8)) return;
          const iy = P.type_record_of({ ix: fp.ix }).iy;
          if (!(M[(iy + 0x0B) & 0xFFFF] & 1)) return;
          P.list_carried({ a: M[0xD1A3] });
          if (M[0xD0D9]) return;
          P.list_selected_carries({});
        }
        opt(8, 0xC5);
        if (!M[0x5B43]) return;
      }
      if (M[0x5B54] < 0x90) { P.print_text({ a: 0xD1 }); opt(0x12, 0xD2); opt(0x13); }
      P.can_fly_or_land({});
      if (M[0xD191]) opt(2, 0xBA);
      if (M[0xD190]) opt(3, 0xBB);
      if (M[0xD0D9]) { if (M[0xD0D9] >= 0x8C) opt(9, 0xC6); else opt(5, 0xBF); }
      if (P.carry_limit({}).a) {
        if (M[0x5B2F] !== 0xFE && !M[0x5B43] && M[0xD0DE] !== 0x0A && M[0xD1FB] >= 8) {
          P.list_objects_here({});
          if (M[0xD0DD]) opt(6, 0xC0);
        }
        if (M[0xD1FB] < 4) return;
        if (M[0xD0DE]) opt(7, 0xC1);
      }
      if (M[0xD1FB] < 4) return;
      if (!P.can_drink({}).zf) opt(0x0B, 0xC8);
      if (P.can_fill({}).zf) opt(0x0C, 0xC9);
      if (!P.can_eat({}).zf) opt(0x0D, 0xCA);
      const iy = w(0x5B52);
      if (M[(iy + 0x0B) & 0xFFFF] & 0x80) opt(0x0A, 0xC7);
      if (M[0xD1FB] < 8) return;
      if (M[0xD0D9]) {
        if (M[0xD0D9] >= 0x8C) return;
        opt(0x0E, 0xCC); opt(0x0F, 0xCD);
      }
      const t = M[0x5B54];
      if (!(t >= 0x90 && t < 0x93)) {
        if (!(M[(iy + 0x0B) & 0xFFFF] & 4)) return;
        if (M[0xD0D9] !== 0x5C && M[0xD0D9] !== 0x63) return;
      }
      P.print_text({ a: 0xCF }); opt(0x10, 0xD0); opt(0x11);
    };
    options();
    yield* P.jumpGen(0xD02A, {});
    opt(1, 0xB3);
    P.IFF = true;
    yield* P.run_menu({});
    yield* P.dispatch_menu({ hl: 0x6D8E });
    P.IFF = false;
    P.draw_map({});
    P.clear_bars({});
    P.describe_cursor_square({});
    P.fill_icon_list({});
    P.load_creature({ a: M[0x5B4F] });
    const rec = w(0x5B50);
    if (M[rec] >= M[0xD200]) { M[rec] = M[0xD200]; M[0xD1FB] = M[0xD200]; }
    P.draw_creature_panel({});
    if (M[0x5B25]) yield* P.cw('summon_display', {});
    P.update_view({});
    P.clear_message_line({});
    if (P.show_enemy_spotted({}).zf) P.print_square_name({});
    if (!P.find_partner({}).zf) P.keep_figures({});
    if (M[0x5B43]) P.keep_figures({});
    M[0xD0DF] = 0x15;
    M[0xFF60] = 0;
    P.IFF = true;
    return yield* P.wait_release({});
  }));

  // spend_action_points: A taken from the selected creature's action points; what is left in A.
  def(0x6DBA, 'spend_action_points', r => {
    const hl = w(0x5B50);
    M[hl] = (M[hl] - r.a) & 255;
    return { a: M[hl], b: r.a & 255, hl };
  });

  // can_fly_or_land: FLY ($D190) or LAND ($D191) offered: neither with another creature on the square
  // or the creature engaged; a flying one may land unless the terrain forbids it (bit 5); one on
  // the ground may take off, not from terrain $37 or $42-$49 or that forbids it (bit 4), with wings
  // ($FF59) and six action points.
  def(0x6DC2, 'can_fly_or_land', r => {
    const iy = P.terrain_record_here({}).iy;
    M[0xD190] = M[0xD191] = 0;
    P.find_others_at({ hl: w(0x5B55) });
    if (M[0xD1AE]) return { a: M[0xD1AE] };
    if (M[(w(0x5B50) + 4) & 0xFFFF] & 0x10) return {};
    if (P.is_flying({ ix: w(0x5B4D) }).zf) {
      if (M[(iy + 4) & 0xFFFF] & 0x20) return {};
      M[0xD191] = 1;
      return { a: 1 };
    }
    const t = M[0xFF91];
    if (t === 0x37 || (t >= 0x42 && t < 0x4A)) return { a: t };
    if (M[(iy + 4) & 0xFFFF] & 0x10) return {};
    if (!M[0xFF59] || M[0xD1FB] < 6) return { iy: w(0x5B52) };
    M[0xD190] = 1;
    return { a: 1, iy: w(0x5B52) };
  });

  // land, fly: the creature on the ground ($FF) or in the air ($FE, six action points to take off),
  // what is left rescaled from the one kind of points to the other.
  const rescale = per => {
    const bc = P.ratio_divisor({ a: M[0xD200], b: M[0xD1FB] }).bc;
    const e = P.scale_by_ratio({ hl: per, bc }).e;
    M[w(0x5B50)] = e;
    M[0xD1FB] = e;
    return e;
  };
  def(0x6E1B, 'land', r => {
    const ix = w(0x5B4D);
    M[(ix + 4) & 0xFFFF] = 0xFF; M[0x5B2F] = 0xFF;
    rescale(M[0xFF5A]);
    setw(0xFF86, 0x0302);
    M[0x5B29] = 1;
    return { a: 1, hl: 0x0302 };
  });
  def(0x6E51, 'fly', r => {
    const ix = w(0x5B4D);
    M[(ix + 4) & 0xFFFF] = 0xFE; M[0x5B2F] = 0xFE;
    M[0xD1FB] = P.spend_action_points({ a: 6 }).a;
    rescale(M[0xFF59]);
    setw(0xFF86, 0x0204);
    M[0x5B29] = 1;
    return { a: 1, hl: 0x0204 };
  });
  // ratio_divisor: BC = (A x 32) / B, 0 when B is 0. scale_by_ratio: E = (HL x 32) / BC, rounded.
  def(0x6E8C, 'ratio_divisor', r => {
    const b = r.b & 255;
    if (!b) return { bc: 0, a: 0, zf: true };
    let hl = ((r.a & 255) * 32) & 0xFFFF, bc = 0;
    while (hl >= b) { hl -= b; bc = (bc + 1) & 0xFFFF; }
    return { bc, hl: (hl - b) & 0xFFFF, de: b, a: b, cf: true };
  });
  def(0x6EA3, 'scale_by_ratio', r => {
    let bc = r.bc;
    if (!bc) return { e: 0, a: 0, zf: true };
    let hl = (r.hl * 32) & 0xFFFF, e = 0;
    while (hl >= bc) { hl -= bc; e = (e + 1) & 255; }
    bc >>= 1;
    if (hl >= bc) e = (e + 1) & 255;
    return { e, bc };
  });

  // choose_from_list: the objects at HL (pairs of number and type, $5B0A of them) listed from row 6,
  // name and weight (byte 1 of its record, unless $FF), their types kept at $B474; the bar on the
  // choice ($C662, 0 for none) moved by up and down, wrapping, until fire.
  def(0x6EC5, 'choose_from_list', function* (r) {
    setw(0xFF54, 0x0602);
    let de = 0xB474;
    M[0xFF56] = M[0xC662];
    let hl = (r.hl + 1) & 0xFFFF;
    let b = M[0x5B0A];
    do {
      M[de] = M[hl];
      const iy = P.object_record({ a: M[hl] }).iy;
      setw(0x5B17, 0x4303);
      setw(0x5B1A, w(0xFF54));
      P.print_text_big({ a: (M[hl] + 1) & 255 });
      setw(0x5B17, 0x4505);
      if (M[(iy + 1) & 0xFFFF] !== 0xFF) {
        setw(0x5B15, (w(0xFF54) + 0x1200) & 0xFFFF);
        P.print_number({ a: M[(iy + 1) & 0xFFFF] });
      }
      M[0xFF54] = (M[0xFF54] + 2) & 255;
      const p = (de + 1) & 0xFFFF;
      setw(0x5B1A, ((M[(p + 1) & 0xFFFF] - 1) & 255) << 8 | ((M[p] - 1) & 255));
      M[0x5B17] = 0x42;
      P.print_panel_text({ a: 6 });
      de = (de + 3) & 0xFFFF;
      hl = (hl + 2) & 0xFFFF;
      b = (b - 1) & 255;
    } while (b);
    P.draw_choice_bar({ a: 0x46, b: M[0xC662] });
    M[0xD0DF] = 8;
    P.IFF = true;
    yield* P.wait_release({});
    for (;;) {
      yield* P.read_controls({});
      const a = M[0x5B13];
      if (!(a & 1)) { P.IFF = false; return { a }; }
      P.IFF = false;
      let moved = true;
      if (!(a & 4)) {
        M[0xC662] = (M[0xC662] + 1) & 255;
        if (M[0x5B0A] < M[0xC662]) M[0xC662] = 0;
      } else if (!(a & 2)) {
        const v = (M[0xC662] - 1) & 255;
        M[0xC662] = v === 0xFF ? M[0x5B0A] : v;
      } else moved = false;
      if (moved) {
        P.draw_choice_bar({ a: 0x42, b: M[0xFF56] });
        P.colour_choice_row({ a: 0x43, b: M[0xFF56] });
        P.draw_choice_bar({ a: 0x46, b: M[0xC662] });
        M[0xFF56] = M[0xC662];
      }
      P.IFF = true;
      yield* P.key_repeat({});
    }
  });
  // draw_choice_bar: the bar (panel graphic 6) in colour A round choice B, where the table at $B475
  // puts it; nothing for choice 0.
  def(0x6FA3, 'draw_choice_bar', r => {
    M[0x5B17] = r.a;
    const b = r.b & 255;
    if (!b) return { a: 0, zf: true };
    const p = (0xB475 + ((rlca((b - 1) & 255) + b - 1) & 255)) & 0xFFFF;
    setw(0x5B1A, ((M[(p + 1) & 0xFFFF] - 1) & 255) << 8 | ((M[p] - 1) & 255));
    return P.print_panel_text({ a: 6 });
  });
  // colour_choice_row: two attribute rows of 18 cells from column 6 of character row B x 2, in A.
  def(0x6FC3, 'colour_choice_row', r => {
    let hl = (0x5806 + 64 * (r.b & 255)) & 0xFFFF;
    for (let k = 0; k < 2; k++, hl = (hl + 32) & 0xFFFF) for (let i = 0; i < 18; i++) M[(hl + i) & 0xFFFF] = r.a;
    return { b: 0, hl, de: 0x0F };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
