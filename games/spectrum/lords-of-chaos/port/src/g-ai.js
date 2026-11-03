// The computer's play ($96BA-$A733): its turn, each creature it moves (loaded, its list entry and
// orders found, then up to fifty steps of drinking, casting, picking up, eating, delivering,
// shooting, fleeing, hunting, seeking objects and following its route), the squares around a
// creature ranked by distance from its target, the steps tried in that order, the spells its wizard
// casts by the scenario's priorities, the list of the wizard's creatures and their routes, and the
// trip squares that wake the independent creatures.
//
// Five routines leave by dropping return addresses and jumping back into computer_move_creature at
// $9817 (the end of a step): computer_choose_target, computer_pick_up and computer_open_chest drop
// their own, computer_spell_done (where every spell the wizard casts ends) and computer_brew three,
// through computer_try_spell and computer_cast. computer_move_creature takes each such drop where
// it ends, in its own body; $9817 is named computer_move_resume for a drop that ends elsewhere.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.ai = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;
  const RESUME = 0x9817, STEPS = 0x9849;
  // a figure plus a half, as the game adds them (SRL A, ADD A,B: eight bits)
  const half = a => (a + (a >> 1)) & 255;
  const twice = a => (2 * a) & 255;
  // a drop that ends in computer_move_creature's body, at $9817
  const toResume = e => e instanceof P.Unwind && e.n === 1 && e.then === RESUME;
  function* call(name, r) {
    try { yield* P.cw(name, r || {}); return false; } catch (e) { if (toResume(e)) return true; throw e; }
  }

  // debug_probe: nothing calls it. A counter ($96B9) printed at row 21, column 0 in the ROM's font,
  // yellow on red, then the controls let go and fire pressed; every register kept.
  def(0x96BA, 'debug_probe', function* (r) {
    M[0x5B17] = 0x56; setw(0x5B15, 0x0015); M[0x5B14] = 0; setw(0x5B0E, 0x3C00);
    M[0x96B9] = (M[0x96B9] + 1) & 255;
    P.print_number({ a: M[0x96B9] });
    M[0x5B16] = (M[0x5B16] + 1) & 255;
    yield* P.cw('wait_release', {});
    yield* P.cw('wait_fire', {});
    return { a: r.a, f: r.f, b: r.b, c: r.c, d: r.d, e: r.e, h: r.h, l: r.l };
  });

  // computer_turn: every creature of the player ($5B11) that is not riding moved in turn, the
  // computer moving and the turn hidden ($D063, $D066) meanwhile; $D184 and $D186 the entry and its
  // number.
  def(0x96EB, 'computer_turn', function* (r) {
    M[0xD063] = M[0xD066] = M[0xD1BB] = 1;
    setw(0xD184, 0x5B5A);
    M[0xD186] = 0;
    for (let b = 0x91; b; b--) {
      M[STEPS] = 0;
      const ix = w(0xD184), t = M[(ix + 2) & 0xFFFF];
      if (t !== 0xFF && t >= 0x8C && !P.is_flying({ ix }).cf) {
        const iy = P.creature_record_of({ ix }).iy;
        if (P.owner_is_player({ iy }).zf) yield* P.computer_move_creature({ ix, iy });
      }
      setw(0xD184, (w(0xD184) + 6) & 0xFFFF);
      M[0xD186] = (M[0xD186] + 1) & 255;
    }
    M[0xD063] = M[0xD066] = 0;
    return { a: 0, zf: true };
  });

  // clear_plan: $D0E4-$D11F to $FF, no enemies noted ($D188).
  def(0x973C, 'clear_plan', r => { M.fill(0xFF, 0xD0E4, 0xD120); M[0xD188] = 0; return { a: 0, zf: true, hl: 0xD11F, de: 0xD120, bc: 0 }; });

  // computer_move_creature: creature $D186 loaded, its entry in the list found ($D182; not found,
  // the border blue and the creature counted a guard, $D1BA); an order to wait (bit 6) obeyed unless
  // it saw an enemy when loaded. Then steps until it is done ($D181) or has taken fifty (the border
  // red), and its move ended.
  function* steps(at) {
    for (;;) {
      if (at === 0x9795) {
        at = 0x9817;
        M[0x5B0D] = 1;
        if (P.find_partner({}).zf) M[0x5B0D] = 0;
        else {
          P.computer_drink({});
          if (yield* call('computer_cast')) continue;
          if (yield* call('computer_pick_up')) continue;
          P.computer_choose_vial({});
          P.computer_eat({});
          yield* P.cw('computer_deliver', {});
          P.computer_choose_weapon({});
          P.computer_take_off({});
        }
        M[0xD19B] = 0;
        if (M[0x5B0D]) {
          yield* P.cw('computer_shoot', {});
          if (M[0xD18A] || M[0xD181]) continue;
        }
        P.computer_flee({});
        if (!M[0xD198]) {
          P.computer_find_prey({});
          if (!M[0xD18C]) {
            P.computer_seek_object({});
            const t = M[0xD19B];
            if (t) {
              if (t !== 0x7A && t !== 0x7B) {
                if (P.at_target({}).zf) { at = 0x982B; continue; }
                P.io.out(0xFE, 0, P.T);
              }
            } else if (yield* call('computer_choose_target')) continue;
          }
        }
        P.rank_neighbours({});
        P.computer_maybe_land({});
        if (yield* call('computer_open_chest')) continue;
        yield* P.cw('computer_try_steps', {});
        continue;
      }
      if (at === 0x9817) {
        M[0xD18E] = 0;
        if (M[0xD19A] && P.at_target({}).zf) M[0xD181] = 4;
        at = 0x982B;
      }
      M[STEPS] = (M[STEPS] + 1) & 255;
      if (M[STEPS] === 0x32) { P.io.out(0xFE, 2, P.T); return P.end_move({}); }
      if (M[0xD181]) return P.end_move({});
      at = 0x9795;
    }
  }
  def(0x974E, 'computer_move_creature', P.frame(function* (r) {
    P.IFF = false;
    P.clear_plan({});
    P.computer_load_creature({});
    const f = P.find_in_list({ a: M[0xD186] });
    setw(0xD182, f.hl);
    M[0xD1BA] = f.zf ? M[(f.hl + 3) & 0xFFFF] & 0x80 : f.a;
    const o = (w(0xD182) + 3) & 0xFFFF;
    if (M[0xD188]) M[o] &= ~0x40;
    if (M[o] & 0x40) return { a: M[0xD188], zf: false, hl: o };
    P.computer_combat_figures({});
    P.forget_trail({});
    P.remember_square({});
    M[0xD19B] = M[0xD1BC] = M[0xD198] = M[0xD18E] = M[0xD181] = 0;
    return yield* steps(0x9795);
  }));
  // computer_move_resume: the same from the end of a step ($9817)
  def(RESUME, 'computer_move_resume', P.frame(function* (r) { return yield* steps(0x9817); }));

  // at_target: Z when the selected creature stands on the target square ($D1B6).
  def(0x984A, 'at_target', r => {
    if (M[0x5B55] !== M[0xD1B6]) return { a: M[0x5B55], hl: 0xD1B6, zf: false };
    return { a: M[0x5B56], hl: 0xD1B7, zf: M[0x5B56] === M[0xD1B7] };
  });

  // computer_land: landed when the rules allow it ($6DC2), the creature loaded again and its panel
  // drawn when shown. Z clear when it landed.
  const land = () => {
    P.can_fly_or_land({});
    if (!M[0xD191]) return { a: 0, zf: true };
    P.land({});
    P.load_creature({ a: M[0x5B4F] });
    if (!M[0xD066]) P.draw_creature_panel({});
    P.update_view({});
    return { a: 1, zf: false };
  };
  def(0x988C, 'computer_land', r => land());
  // computer_maybe_land: a flier lands once it has made its step ($D18E), unless it is fleeing
  // ($D198), or has no object or prey to go for and is not a wizard, or its target is a chest and it
  // cannot carry more ($D17A).
  def(0x9858, 'computer_maybe_land', r => {
    if (M[0x5B2F] === 0xFF) return { a: 0, zf: true };
    if (M[0xD198]) return { a: M[0xD198], zf: false };
    if (!M[0xD19B] && !M[0xD18C] && M[0x5B54] >= 0x90) return { a: M[0x5B54] };
    if (!M[0xD18E]) return { a: 0, zf: true };
    const t = M[0xD19B];
    if (t === 0x7A || t === 0x7B) { if (!M[0xD17A]) return { a: 0, zf: true }; }
    return land();
  });

  // look_at_creature: creature A looked at and made the selected one: its square to $FF88 and the
  // cursor, described, its figures loaded, its panel drawn when shown.
  def(0x98AB, 'look_at_creature', r => {
    M[0x5B58] = r.a;
    const ix = P.entry_address({ a: r.a }).hl;
    setw(0xFFF9, ix);
    M[0xFF88] = M[0xD0D3] = M[ix];
    M[0xFF89] = M[0xD0D4] = P.entry_column({ ix }).a;
    M[0x5B12] = M[(ix + 2) & 0xFFFF];
    const d = P.describe_creature({ ix });
    P.fill_icon_list({});
    P.load_figures({ ix: d.ix, iy: d.iy });
    if (!M[0xD066]) P.draw_creature_panel({});
    return P.make_selected({ ix: d.ix, iy: d.iy });
  });

  // computer_load_creature: creature $D186 looked at; $D17B and $D17C the ranged combat and range of
  // its weapon (a dragon's breath $23 and $0C), $D17A the weight it can still carry, $D17F and $D180
  // its type's weapon and USE bits.
  def(0x98E4, 'computer_load_creature', r => {
    P.look_at_creature({ a: M[0xD186] });
    setw(0xD17B, P.weapon_range({ a: M[0xD0D9] }).de);
    if (M[0x5B54] >= 0x90 && M[0x5B54] < 0x93) setw(0xD17B, 0x0C23);
    P.carried_weight({});
    const c = P.carry_limit({});
    M[0xD17A] = (c.a - M[0xFF51]) & 255;
    M[0xD17F] = M[(c.iy + 0x0B) & 0xFFFF] & 4;
    M[0xD180] = M[(c.iy + 0x0B) & 0xFFFF] & 0x80;
    return { a: M[0xD180], iy: c.iy };
  });

  // computer_combat_figures: creature $D186's combat and defence ratios ($D1FE, $D1FF) to $D17D and
  // $D17E.
  def(0x9924, 'computer_combat_figures', r => {
    P.load_creature({ a: M[0xD186] });
    M[0xD17D] = M[0xD1FE]; M[0xD17E] = M[0xD1FF];
    return { a: M[0xD1FF] };
  });

  // weapon_range: DE the ranged figures of object A: a bow ($5C) $100F, a magic bow ($63) $161E.
  def(0x9937, 'weapon_range', r => {
    const a = r.a & 255;
    return { a, de: a === 0x5C ? 0x100F : a === 0x63 ? 0x161E : 0 };
  });

  // find_in_wizard_list, find_in_list: creature A in a list of four-byte entries ending with $FE:
  // the scenario's ($D015) for the independent creatures, the computer wizard's at $CF76 for its
  // own. Z with HL on the entry; not there, the border blue and HL $CF76.
  const findIn = (hl, b) => {
    for (;;) {
      const a = M[hl];
      if (a === 0xFE) { P.io.out(0xFE, 1, P.T); return { a: 1, zf: false, hl: 0xCF76, b, de: 4 }; }
      if (a === b) return { a, zf: true, hl, b, de: 4 };
      hl = (hl + 4) & 0xFFFF;
    }
  };
  def(0x994B, 'find_in_wizard_list', r => findIn(0xCF76, r.a & 255));
  def(0x994E, 'find_in_list', r => findIn(M[0x5B11] ? 0xCF76 : w(0xD015), r.a & 255));

  // waypoint_square: DE square A of the waypoint table at ($D013), the row in E.
  def(0x9971, 'waypoint_square', r => {
    const de = w((w(0xD013) + 2 * (r.a & 255)) & 0xFFFF);
    return { de, e: de & 255, d: de >> 8 };
  });

  // route_address: HL the first waypoint of route A in the list at ($D00F), each route led by its
  // length in the low seven bits.
  def(0x997F, 'route_address', r => {
    let hl = w(0xD00F), b = (r.a + 1) & 255;
    for (;;) {
      b = (b - 1) & 255;
      if (!b) break;
      hl = (hl + (M[hl] & 0x7F)) & 0xFFFF;
    }
    return { hl: (hl + 1) & 0xFFFF, b: 0 };
  });

  // computer_choose_target: the square to head for ($D1B6). A creature carrying treasure ($D1BC) or
  // guarding ($D1BA) heads for the wizard (entry 1) while it lives, a guard within five squares
  // staying where it is ($D181 = 5, the step ended). Past the scenario's last turn of routes ($D062)
  // every creature heads for $D060; otherwise for the next waypoint of its route not yet reached,
  // the route starting again past its end.
  def(0x9992, 'computer_choose_target', function* (r) {
    const iy = w(0xD182);
    if ((M[0xD1BC] || M[0xD1BA]) && M[0x5B62] !== 0xFF) {
      const ix = 0x5B60, p = P.entry_position({ ix }), de = p.e | p.d << 8;
      setw(0xD1B6, de);
      if (M[0xD1BC]) return { a: M[0xD1BC], iy, ix, de };
      const a = P.distance_from_selected({ de }).a;
      if (a >= 5) return { a, iy, ix, de };
      M[0xD181] = 5;
      P.unwind(1, { a: 5, iy, ix, de }, RESUME);
    }
    if (M[0xD065] >= M[0xD062]) { setw(0xD1B6, w(0xD060)); return { iy, hl: w(0xD060) }; }
    for (;;) {
      let hl = (P.route_address({ a: M[(iy + 1) & 0xFFFF] }).hl + M[(iy + 2) & 0xFFFF]) & 0xFFFF;
      const de = P.waypoint_square({ a: M[hl] }).de;
      if (M[0x5B55] !== (de & 255) || M[0x5B56] !== de >> 8) { setw(0xD1B6, de); return { iy, de, hl }; }
      hl = (hl + 1) & 0xFFFF;
      M[(iy + 2) & 0xFFFF] = (M[(iy + 2) & 0xFFFF] + 1) & 255;
      if (M[hl] & 0x80) M[(iy + 2) & 0xFFFF] = 0;
      P.forget_trail({});
      P.remember_square({});
    }
  });

  // rank_neighbours: the eight squares around the creature, each one's distance from the target added
  // to its third byte, sorted nearest first; $D18E set when the nearest is the target.
  def(0x9A0D, 'rank_neighbours', r => {
    M[0xD18E] = 0;
    P.list_neighbours_of_selected({});
    const de = w(0xD1B6);
    for (let k = 0; k < 8; k++) {
      const p = 0xFF0C + 3 * k;
      M[p + 2] = (M[p + 2] + P.distance({ hl: w(p), de }).a) & 255;
    }
    P.sort_neighbours({});
    if (M[0xD1B6] !== M[0xFF0C] || M[0xD1B7] !== M[0xFF0D]) return { zf: false };
    M[0xD18E] = 1;
    return { a: 1, zf: true };
  });

  // sort_neighbours: the eight three-byte squares at $FF0C sorted by the low seven bits of their
  // third byte, smallest first: seven passes from the end, each pair swapped unless the first is the
  // smaller ($9A45 the comparisons in a pass, $9A46 the entry compared).
  def(0x9A48, 'sort_neighbours', r => {
    M[0x9A45] = 7;
    let e = 0xFF23;
    for (let p = 7; p; p--) {
      e = 0xFF23;
      for (let b = 7; b; b--, e -= 3) {
        if ((M[e - 3] & 0x7F) < (M[e] & 0x7F)) continue;
        for (let i = 0; i < 3; i++) { const a = M[e - i]; M[e - i] = M[e - i - 3]; M[e - i - 3] = a; }
      }
    }
    setw(0x9A46, e);
    return { b: 0 };
  });

  // forget_trail, on_trail, remember_square: the last eight squares the creature stood on
  // ($9AA2, $FE after; trail_next $9AA0 where the next goes): emptied; Z when square $FF8A is one;
  // the creature's square added over the oldest.
  def(0x9AB3, 'forget_trail', r => { setw(0x9AA0, 0x9AA2); M.fill(0xFF, 0x9AA2, 0x9AB2); return { hl: 0x9AB1, de: 0x9AB2, bc: 0 }; });
  def(0x9AC4, 'on_trail', r => {
    for (let b = 8, hl = 0x9AA2; b; b--, hl += 2) {
      if (M[hl] === M[0xFF8A] && M[hl + 1] === M[0xFF8B]) return { a: M[0xFF8B], zf: true, hl: hl + 1, b };
    }
    return { zf: false, b: 1 };
  });
  def(0x9ADC, 'remember_square', r => {
    let hl = w(0x9AA0);
    if (M[hl] === 0xFE) hl = 0x9AA2;
    M[hl] = M[0x5B55]; M[(hl + 1) & 0xFFFF] = M[0x5B56];
    setw(0x9AA0, (hl + 2) & 0xFFFF);
    return { hl: (hl + 2) & 0xFFFF, de: w(0x5B55) };
  });

  // computer_try_steps: the eight squares around the creature, nearest the target first, until one
  // does something: each classified ($CA2B; bit 7 of its third byte, a diagonal, in $FF92), passed
  // through the scenario's hook ($D01E), and the class ($FF8F) picks the action from the table at
  // $9B27: cannot enter (open or unlock a door, or break the terrain), done ($D181 = 7), end the
  // move, attack, step, or the next square. None, the creature is done ($D181 = 6). A creature that
  // dies on the square it stepped onto (a portal) leaves through here too.
  def(0x9AF3, 'computer_try_steps', P.frame(function* (r) {
    let hl = 0xFF0C;
    for (let b = 8; b; b--) {
      const de = w(hl);
      M[0xFF92] = M[(hl + 2) & 0xFFFF] & 0x80;
      hl = (hl + 3) & 0xFFFF;
      const k = P.classify_step({ hl: de });
      yield* P.jumpGen(0xD01E, Object.assign({ hl: de, de: hl }, k));
      const act = w((0x9B27 + twice(M[0xFF8F])) & 0xFFFF);
      if (act === 0x9BCB) continue;                                   // computer_step_skip
      if (act === 0x9B37) { M[0xD181] = 7; return { a: 7 }; }          // computer_step_done
      if (act === 0x9B3E) return P.end_move({});                       // computer_step_end
      if (act === 0x9B44) {                                            // computer_step_attack
        if ((yield* P.computer_decide_attack({})).zf) continue;
        if (!M[(w(0x5B50) + 2) & 0xFFFF]) M[0xD181] = 8;
        else P.computer_combat_figures({});
        P.IFF = false;
        return {};
      }
      if (act === 0x9BA0) {                                            // computer_step_move
        if (M[(w(0x5B50) + 4) & 0xFFFF] & 0x10) continue;
        if (P.on_trail({}).zf) continue;
        P.move_selected({});
        yield* P.cw('step_effects', { ret: 0x9BB9 });
        P.remember_square({});
        yield* P.jumpGen(0xD021, {});
        P.IFF = false;
        P.centre({});
        if (!M[0xD066]) P.draw_map({});
        return {};
      }
      if (act === 0x9BCE) {                                            // computer_step_blocked
        if (P.find_partner({}).zf) continue;
        let go = 0x9C15;
        if (M[0xD180]) {
          const t = M[0xFF91];
          if (t >= 0x22 && t < 0x25) go = 0x9BE5;
          else if (t >= 0x1F && t < 0x22) {
            const k2 = P.computer_take_object({ a: 0x7D });
            go = k2.cf ? 0x9C2A : k2.zf ? 0x9BE5 : 0x9C15;
          }
        }
        if (go === 0x9BE5) {
          if (M[0xD1FB] < 4) go = 0x9C2A;
          else {
            M[0xD1FB] -= 4;
            setw(0xD0D3, w(0xFF8A));
            yield* P.cw('use_square', {});
            if (!M[0xD066]) P.draw_map({});
            return {};
          }
        }
        if (go === 0x9C15) {
          const iy = P.terrain_record_here({}).iy;
          if (half(M[0xD1FE]) < M[(iy + 1) & 0xFFFF]) continue;
          yield* P.cw('attack_terrain', {});
          return {};
        }
        M[0xD181] = 9;
        return { a: 9 };
      }
      throw new Error('computer_try_steps: no action at $' + act.toString(16));
    }
    M[0xD181] = 6;
    return { a: 6 };
  }));

  // computer_decide_attack: the enemy at ($FF28) attacked with eight action points and eight stamina,
  // an undead one by a creature that is not undead only with a magic hand weapon ($60-$66, not the
  // magic bow $63). Z clear when it attacked. An attacker killed by the blow back returns from here
  // at once (attack's drop).
  def(0x9B61, 'computer_decide_attack', P.frame(function* (r) {
    if (M[0xD1FB] < 8 || M[0xD1FC] < 8) return { a: 0, zf: true };
    let iy = P.type_record_of({ ix: w(0xFF28) }).iy;
    if (M[(iy + 0x0B) & 0xFFFF] & 2) {
      iy = w(0x5B52);
      if (!(M[(iy + 0x0B) & 0xFFFF] & 2)) {
        const a = M[0xD0D9];
        if (a === 0x63) return { a, zf: true };
        if (a < 0x60 || a >= 0x67) return { a: 0, zf: true };
      }
    }
    yield* P.cw('attack', { ret: 0x9B97 });
    P.update_view({});
    return { a: 1, zf: false };
  }));

  // computer_take_object: object type A made the one in use: Z when it already is, or when it is
  // carried and four action points are paid (the old one's in-use bit cleared, the new one's set);
  // carry with Z clear when there are not four; Z clear when it is not carried.
  def(0x9C32, 'computer_take_object', r => {
    const c = r.a & 255;
    if (c === M[0xD0D9]) return { a: c, zf: true, cf: false, hl: 0xD0D9 };
    const n = M[0xD0DE];
    let hl = 0xD1C1, found = false;
    if (n) for (let b = n; b; b--, hl += 2) if (M[hl] === c) { found = true; break; }
    if (!found) return { a: 1, zf: false, cf: false, c };
    if (M[0xD1FB] < 4) return { a: M[0xD1FB], zf: false, cf: true, c };
    const old = M[0xD0DA];
    M[0xD0D9] = c; M[0x5B57] = c;
    M[0xD0DA] = M[hl - 1];
    let e = P.entry_address({ a: M[hl - 1] }).hl;
    setw(0xD0DB, e);
    M[(e + 3) & 0xFFFF] |= 0x80;
    if (old !== 0xFF) { e = P.entry_address({ a: old }).hl; M[(e + 3) & 0xFFFF] &= 0x7F; }
    P.spend_action_points({ a: 4 });
    M[0xD1FB] = (M[0xD1FB] - 4) & 255;
    return { a: 0, zf: true, cf: false };
  });

  // note_enemy: enemy $5B20, seen by the computer, added to its list at $D0E4 (the creature, its
  // combat and defence ratios from load_creature), at most twenty; $D187 set.
  def(0x9C8C, 'note_enemy', r => {
    const n = M[0xD188];
    if (n === 0x14) return { ix: r.ix };
    let hl = 0xD0E1;
    for (let b = n + 1; b; b--) {
      hl += 3;
      if (M[hl] === M[0x5B20]) return { ix: r.ix };
    }
    M[hl] = M[0x5B20];
    P.load_creature({ a: M[0x5B20] });
    M[hl + 1] = M[0xD1FE]; M[hl + 2] = M[0xD1FF];
    M[0xD188] = (M[0xD188] + 1) & 255;
    M[0xD187] = 1;
    return { a: 1, ix: r.ix };
  });

  // computer_shoot: a creature with a ranged weapon or a dragon's breath ($D17C its range) shoots the
  // first enemy on its list it can harm (defence plus a half at most twice its ranged combat, not
  // riding, within range and in sight; an undead one only with the magic bow, or by a breath on
  // terrain that burns), for eight action points ($D181 = $0A with fewer). $D18A set when it shot.
  def(0x9CC5, 'computer_shoot', function* (r) {
    M[0xD18A] = 0;
    if (!M[0xD188] || !M[0xD17C]) return { a: 0, zf: true };
    M[0x5B26] = (M[0x5B11] - 1) & 255;
    const dragon = () => M[0x5B54] >= 0x90 && M[0x5B54] < 0x93;
    let hl = 0xD0E6;
    for (let b = M[0xD188]; b; b = (b - 1) & 255, hl += 3) {
      if (twice(M[0xD17B]) < half(M[hl])) continue;
      const ix = P.entry_address({ a: M[hl - 2] }).hl;
      if (P.is_flying({ ix }).cf) continue;
      setw(0xFF02, P.entry_square({ ix }).hl);
      const iy = P.type_record_of({ ix }).iy;
      if (M[(iy + 0x0B) & 0xFFFF] & 2) {
        if (dragon()) {
          if (!P.is_loose({ ix }).zf) continue;
          const tr = P.terrain_record({ a: P.what_is_at({ hl: w(0xFF02) }).a }).iy;
          if (!(M[(tr + 3) & 0xFFFF] & 0x0F)) continue;
        } else if (M[0xD0D9] !== 0x63) continue;
      }
      if (P.distance_from_selected({ de: w(0xFF02) }).a >= M[0xD17C]) continue;
      if (M[0xD1FB] < 8) { M[0xD181] = 0x0A; return { a: 0x0A }; }
      M[0xFF60] = dragon() ? 0x0C : M[0xD0D9] === 0x5C ? 0x10 : 0x16;
      M[0xFF31] = M[(ix + 4) & 0xFFFF];
      M[0xFF48] = 0;
      if (!P.line_of_sight({}).zf) continue;
      if (M[0xFF60] < M[0xFF48]) continue;
      yield* P.cw('fire_missile', {});
      M[0xD1FB] = (M[0xD1FB] - 8) & 255;
      M[0xD18A] = 1;
      return P.look_at_creature({ a: M[0xD186] });
    }
    return { b: 0 };
  });

  // computer_find_prey: the nearest enemy on the list the creature could hurt (defence plus a half at
  // most twice its combat, not riding, at its height unless it flies; an undead one only with a magic
  // hand weapon, $60-$67 but not the magic bow) made its target ($D1B6; $D18C set, the enemy's height
  // in $D18D, the distance in $D18B).
  def(0x9DAD, 'computer_find_prey', r => {
    M[0xD18C] = 0;
    const n = M[0xD188];
    if (!n) return { a: 0, zf: true };
    M[0xD18B] = 0xFF;
    for (let b = n, e = 0xD0E4; b; b = (b - 1) & 255, e += 3) {
      if (twice(M[0xD17D]) < half(M[e + 2])) continue;
      const ix = P.entry_address({ a: M[e] }).hl;
      if (P.is_flying({ ix }).cf) continue;
      if (M[0x5B2F] !== 0xFE && M[0x5B2F] !== M[(ix + 4) & 0xFFFF]) continue;
      let iy = P.type_record_of({ ix }).iy;
      if (M[(iy + 0x0B) & 0xFFFF] & 2) {
        iy = w(0x5B52);
        if (!(M[(iy + 0x0B) & 0xFFFF] & 2)) {
          const a = M[0xD0D9];
          if (a === 0x63 || a < 0x60 || a >= 0x68) continue;
        }
      }
      const p = P.entry_position({ ix }), de = p.e | p.d << 8;
      const d = P.distance_from_selected({ de }).a;
      if (d >= M[0xD18B]) continue;
      M[0xD18B] = d;
      setw(0xD1B6, de);
      M[0xD18C] = 1;
      M[0xD18D] = M[(ix + 4) & 0xFFFF];
    }
    return { b: 0 };
  });

  // computer_take_off: a creature on the ground with wings ($FF59) takes off when the rules allow it,
  // for six action points ($D181 = $0B with fewer).
  def(0x9E3A, 'computer_take_off', r => {
    M[0xD190] = M[0xD191] = 0;
    if (M[0x5B2F] === 0xFE || !M[0xFF59]) return {};
    P.can_fly_or_land({});
    if (M[0xD1FB] < 6) { M[0xD181] = 0x0B; return { a: 0x0B }; }
    if (!M[0xD190]) return { a: 0, zf: true };
    M[0xD1FB] = (M[0xD1FB] - 6) & 255;
    P.fly({});
    P.load_creature({ a: M[0x5B4F] });
    if (!M[0xD066]) P.draw_creature_panel({});
    return P.update_view({});
  });

  // computer_flee: a creature that is not a guard flees the enemies on its list it fears (combat plus
  // a half more than twice its defence; a flier fears only fliers, an undead creature only the undead
  // and those holding a magic weapon): their squares listed at $D120 ($D199 of them, $D1B8 and $D198
  // set). It goes to the square around it no feared enemy sees and it can stand on, the first such
  // when sorted ($D19A set); with none, the one farthest from them all.
  def(0x9E7D, 'computer_flee', r => {
    M[0xD199] = M[0xD19A] = M[0xD1B8] = 0;
    if (M[0xD1BA]) return { a: M[0xD1BA], zf: false };
    const n = M[0xD188];
    if (n) {
      M.fill(0xFF, 0xD120, 0xD148);
      setw(0xD192, 0xD120);
      setw(0xD196, 0xD0E4);
      for (let b = n; b; b = (b - 1) & 255) {
        const e0 = w(0xD196);
        const fear = (() => {
          if (twice(M[0xD17E]) >= half(M[(e0 + 1) & 0xFFFF])) return false;
          const e = P.entry_address({ a: M[e0] }).hl;
          M[0xD194] = M[e]; M[0xD195] = M[(e + 1) & 0xFFFF] & 0x3F;
          const iy = P.type_record({ a: M[(e + 2) & 0xFFFF] }).iy;
          const ix = w(0x5B52);
          if (M[(ix + 1) & 0xFFFF] && !M[(iy + 1) & 0xFFFF]) return false;
          if ((M[(ix + 0x0B) & 0xFFFF] & 2) && !(M[(iy + 0x0B) & 0xFFFF] & 2)) {
            P.list_carried({ a: M[w(0xD196)] });
            if (M[0xD0D9] < 0x60 || M[0xD0D9] >= 0x67) return false;
          }
          return true;
        })();
        if (fear) {
          const p = w(0xD192);
          M[p] = M[0xD194]; M[(p + 1) & 0xFFFF] = M[0xD195];
          setw(0xD192, (p + 2) & 0xFFFF);
          M[0xD1B8] = 1;
          M[0xD199] = (M[0xD199] + 1) & 255;
        }
        setw(0xD196, (w(0xD196) + 3) & 0xFFFF);
      }
    }
    if (!n || !M[0xD1B8]) { M[0xD198] = 0; return { a: 0, zf: true }; }
    if (!M[0xD198]) P.forget_trail({});
    M[0xD198] = M[0xD1B8];
    // each square around: 1 when a feared enemy sees it or it cannot be stood on
    P.list_neighbours_of_selected({});
    setw(0xD194, 0xFF0C);
    for (let b = 8; b; b--) {
      let hl = w(0xD194);
      const de = w(hl);
      hl = (hl + 2) & 0xFFFF;
      setw(0xD194, hl);
      M[hl] = 0;
      setw(0xFF4D, de);
      for (let c = M[0xD188] || 256, e0 = 0xD0E4; c; c--, e0 += 3) {
        const e = P.entry_address({ a: M[e0] }).hl;
        const sq = M[e] | (M[(e + 1) & 0xFFFF] & 0x3F) << 8;
        const h = M[(e + 4) & 0xFFFF];
        let mark = false;
        if (h >= 0xFE) { M[0xFF31] = h; setw(0xFF88, sq); mark = !!P.line_between({}).zf; }
        if (!mark) {
          const tr = P.terrain_record({ a: P.what_is_at({ hl: w(0xFF4D) }).a }).iy;
          mark = M[0x5B2F] !== 0xFF ? !!(M[(tr + 4) & 0xFFFF] & 8) : M[tr] === 0xFF;
        }
        if (mark) M[w(0xD194)] = 1;
      }
      setw(0xD194, (w(0xD194) + 1) & 0xFFFF);
    }
    P.sort_neighbours({});
    if (!M[0xFF0E]) { setw(0xD1B6, w(0xFF0C)); M[0xD19A] = 1; return { a: 1 }; }
    // none: each square scored by its distances from the feared enemies, the farthest taken
    P.list_neighbours_of_selected({});
    setw(0xD194, 0xFF0C);
    for (let b = 8; b; b--) {
      let hl = w(0xD194);
      const de = w(hl);
      hl = (hl + 2) & 0xFFFF;
      M[hl] = 0;
      setw(0xD194, hl);
      setw(0xFF4D, de);
      for (let c = M[0xD199] || 256, p = 0xD120; c; c--, p += 2) {
        const d = P.distance({ hl: w(0xFF4D), de: w(p) }).a;
        const q = w(0xD194);
        M[q] = Math.min(255, M[q] + d);
      }
      setw(0xD194, (w(0xD194) + 1) & 0xFFFF);
    }
    P.sort_neighbours({});
    setw(0xD1B6, w(0xFF21));
    return { hl: w(0xFF21) };
  });

  // computer_seek_object: of the objects the creature has seen ($D189, entries listed at $D148), the
  // one worth most for its distance (the scenario's worth table at $D3B9 over the distance plus one),
  // if it carries fewer than ten: on a square it can stand on, a locked chest only with a chest key, a
  // chest or a potion it can open or drink without carrying it, anything else only if it can carry
  // its weight. $D19B the object, $D19C its score, $D1B6 its square.
  def(0xA021, 'computer_seek_object', r => {
    M[0xD19B] = M[0xD19C] = 0;
    if (!M[0xD189]) return { a: 0, zf: true };
    P.list_selected_carries({});
    if (M[0xD0DE] >= 0x0A) return { a: M[0xD0DE] };
    let hl = 0xD148;
    for (let b = M[0xD189]; b; b = (b - 1) & 255) {
      const ix = w(hl);
      hl = (hl + 2) & 0xFFFF;
      const worth = M[(0xD3B9 + M[(ix + 2) & 0xFFFF]) & 0xFFFF] & 0x7F;
      if (!worth) continue;
      M[0x5B22] = worth;
      M[0x5B23] = M[ix];
      M[0x5B24] = P.entry_column({ ix }).a;
      if (!P.square_free({ a: M[0x5B4F] }).zf) continue;
      const t = M[(ix + 2) & 0xFFFF];
      if (t === 0x7A) {
        const n = M[0xD0DE];
        if (!n) continue;
        let key = false;
        for (let k = 0; k < n; k++) if (M[0xD1C1 + 2 * k] === 0x7E) { key = true; break; }
        if (!key) continue;
      }
      // the weight checked unless it is a chest a user can open, a healing potion it needs or a
      // potion while none is working
      let weigh = true;
      if (M[0xD180] && (t === 0x7A || t === 0x7B)) weigh = false;
      else if (M[0xD180] && t === 0x71 && M[(w(0x5B50) + 2) & 0xFFFF] < M[0xD202]) weigh = false;
      else if (t >= 0x6B && t < 0x71 && !(P.selected_potion({}).a & 0x1F)) weigh = false;
      if (weigh) {
        const iy = P.object_record_of({ ix }).iy;
        if (M[0xD17A] < M[(iy + 1) & 0xFFFF]) continue;
      }
      const p = P.entry_position({ ix }), de = p.e | p.d << 8;
      const d = (P.distance_from_selected({ de }).a + 1) & 255;
      const s = P.divide({ a: M[0x5B22], b: d }).a;
      if (s < M[0xD19C]) continue;
      M[0xD19C] = s;
      M[0xD19B] = t;
      setw(0xD1B6, de);
    }
    return { b: 0 };
  });

  // computer_pick_up: on the target object's square with no partner there ($D181 = $0C otherwise,
  // the step ended): chests and potions left to computer_open_chest and computer_drink; anything else
  // picked up and made the object in use for eight action points ($D181 = $0D with fewer), a flier
  // landing first. Either way the step ends.
  def(0xA0F0, 'computer_pick_up', function* (r) {
    if (!M[0xD19B]) return { a: 0, zf: true };
    if (!P.at_target({}).zf) return { zf: false };
    if (P.find_partner({}).zf) { M[0xD181] = 0x0C; P.unwind(1, { a: 0x0C }, RESUME); }
    const t = M[0xD19B];
    if (t === 0x7A || t === 0x7B) return { a: t, zf: true };
    if (t >= 0x6B && t < 0x72) return { a: t, cf: true };
    if (M[0x5B2F] === 0xFE && land().zf) return { a: 0, zf: true };
    if (M[0xD1FB] < 8) { M[0xD181] = 0x0D; P.unwind(1, { a: 0x0D }, RESUME); }
    M[0xD1FB] = (M[0xD1FB] - 8) & 255;
    P.spend_action_points({ a: 8 });
    P.list_selected_carries({});
    P.list_objects_here({});
    // no end to the search: past the list (ten objects) it goes on through memory, and with the type
    // nowhere at the addresses it looks at, for ever
    let hl = 0xD1D5;
    for (let n = 0; M[hl] !== M[0xD19B]; n++) {
      if (n === 0x8000) throw new P.Hang('computer_pick_up: the search never ended');
      hl = (hl + 2) & 0xFFFF;
    }
    const iy = P.object_record({ a: M[hl] }).iy;
    M[0xD17A] = (M[0xD17A] - M[(iy + 1) & 0xFFFF]) & 255;
    M[0x5B57] = M[hl];
    const e = P.entry_address({ a: M[(hl - 1) & 0xFFFF] }).hl;
    M[(e + 3) & 0xFFFF] |= 0x80;
    M[(e + 4) & 0xFFFF] = M[0x5B4F];
    if (M[0xD0D9]) { const o = w(0xD0DB); M[(o + 3) & 0xFFFF] &= 0x7F; }
    M[0xD0D9] = M[0x5B57];
    M[0xFF90] = M[0xFF91];
    M[0xD19B] = 0;
    P.update_view({});
    P.list_objects_here({});
    P.forget_trail({});
    P.unwind(1, { a: 0 }, RESUME);
  });

  // computer_drink: a potion ($6B-$71) lying on the square drunk: the healing potion only below the
  // most constitution, the others only when none is working; four action points ($D181 = $0E with
  // fewer), a flier landing first.
  def(0xA196, 'computer_drink', r => {
    P.list_objects_here({});
    const a = M[0x5B2C];
    if (a < 0x6B || a >= 0x72) return { a };
    if (a === 0x71) { if (M[(w(0x5B50) + 2) & 0xFFFF] >= M[0xD202]) return {}; }
    else if (P.selected_potion({}).a & 0x1F) return {};
    if (M[0xD1FB] < 4) { M[0xD181] = 0x0E; return { a: 0x0E }; }
    if (M[0x5B2F] === 0xFE && land().zf) return { a: 0, zf: true };
    M[0xD1FB] = (M[0xD1FB] - 4) & 255;
    P.drink({});
    P.update_view({});
    P.list_objects_here({});
    M[0xFF90] = M[0x5B2C];
    return P.forget_trail({});
  });

  // computer_open_chest: when the next step reaches a target chest, USE on it for four action
  // points, a locked one with a chest key made the object in use ($D181 = $0F when it cannot). The
  // step ends.
  def(0xA1ED, 'computer_open_chest', function* (r) {
    if (!M[0xD18E]) return { a: 0, zf: true };
    const t = M[0xD19B];
    if (t !== 0x7B) {
      if (t !== 0x7A) return { a: t, zf: false };
      if (P.computer_take_object({ a: 0x7E }).cf) { M[0xD181] = 0x0F; P.unwind(1, { a: 0x0F }, RESUME); }
    }
    if (M[0xD1FB] < 4) { M[0xD181] = 0x0F; P.unwind(1, { a: 0x0F }, RESUME); }
    M[0xD1FB] = (M[0xD1FB] - 4) & 255;
    setw(0xD0D3, w(0xD1B6));
    yield* P.cw('use_square', {});
    P.update_view({});
    if (!M[0xD066]) P.draw_map({});
    P.unwind(1, {}, RESUME);
  });

  // computer_choose_weapon: a creature that uses weapons holds the best it carries by the worth table,
  // swords to axes and their magic kinds ($59-$66) but not shields ($5B, $62).
  def(0xA22B, 'computer_choose_weapon', r => {
    if (!(M[(w(0x5B52) + 0x0B) & 0xFFFF] & 4)) return { a: 0, zf: true };
    const n = M[0xD0DE];
    if (!n) return { a: 0, zf: true };
    M[0xD19D] = M[0xD19E] = 0;
    for (let k = 0; k < n; k++) {
      const a = M[0xD1C1 + 2 * k];
      if (a === 0x5B || a === 0x62 || a < 0x59 || a >= 0x67) continue;
      const v = P.value_against_best_at({ hl: 0xD3B9, de: a });
      if (v.cf) continue;
      M[0xD19D] = v.a;
      M[0xD19E] = a;
    }
    const best = M[0xD19E];
    if (!best || best === M[0xD0D9]) return { a: best, zf: true };
    return P.computer_take_object({ a: best });
  });

  // computer_choose_vial: a vial ($73-$79) it carries drunk for four action points: the healing vial
  // at once when constitution plus a half is below its most; otherwise the worthiest, unless the
  // potion already working is worth as much. The healing vial's test loads the constitution into B,
  // the loop's count: when the vial is not taken the loop goes on for that many more.
  def(0xA279, 'computer_choose_vial', r => {
    P.list_selected_carries({});
    const n = M[0xD0DE];
    if (!n) return { a: 0, zf: true };
    M[0xD19D] = M[0xD19E] = 0;
    let hl = 0xD1C1, b = n, heal = false;
    do {
      const a = M[hl];
      if (a >= 0x73 && a < 0x7A) {
        if (a === 0x79) {
          b = M[(w(0x5B50) + 2) & 0xFFFF];
          if (half(b) < M[0xD202]) { M[0xD19E] = 0x79; heal = true; break; }
        } else {
          const v = P.value_against_best_at({ hl: 0xD3B9, de: a });
          if (!v.cf) { M[0xD19D] = v.a; M[0xD19E] = a; }
        }
      }
      hl = (hl + 2) & 0xFFFF;
      b = (b - 1) & 255;
    } while (b);
    if (!heal) {
      if (!M[0xD19E]) return { a: 0, zf: true };
      const p = P.selected_potion({}).a & 0xE0;
      if (p && !P.value_against_best_at({ hl: 0xD409, de: ((p >> 5) + 0x22) & 255 }).cf) return {};
    }
    const best = M[0xD19E];
    if (best !== M[0xD0D9] && P.computer_take_object({ a: best }).cf) return { cf: true };
    if (M[0xD1FB] < 4) return { cf: true };
    M[0xD1FB] = (M[0xD1FB] - 4) & 255;
    return P.drink({});
  });

  // computer_eat: a creature that can carry eats the best food it carries (bit 2 of byte 5 of the
  // object's record) for four action points: a wizard scores food by twice the mana it gives; others
  // by the constitution it gives, only while constitution plus a half is below its most or stamina is
  // at most a quarter of its most.
  def(0xA2FC, 'computer_eat', r => {
    if (!P.carry_limit({}).a) return { a: 0, zf: true };
    const n = M[0xD0DE];
    if (!n) return { a: 0, zf: true };
    M[0xD19E] = 0; M[0xD19D] = 1;
    for (let k = 0; k < n; k++) {
      const e = M[0xD1C1 + 2 * k];
      const iy = P.object_record({ a: e }).iy;
      if (!(M[(iy + 5) & 0xFFFF] & 4)) continue;
      let s;
      if (M[0x5B54] < 0x90 && M[(iy + 3) & 0xFFFF]) s = twice(M[(iy + 3) & 0xFFFF]);
      else {
        const rec = w(0x5B50);
        if (half(M[(rec + 2) & 0xFFFF]) >= M[0xD202] && P.divide({ a: M[0xD201], b: 4 }).a < M[(rec + 1) & 0xFFFF]) continue;
        s = M[(iy + 2) & 0xFFFF];
      }
      if (s < M[0xD19D]) continue;
      M[0xD19D] = s;
      M[0xD19E] = e;
    }
    const best = M[0xD19E];
    if (!best) return { a: 0, zf: true };
    if (best !== M[0xD0D9] && P.computer_take_object({ a: best }).cf) return { cf: true };
    if (M[0xD1FB] < 4) return { cf: true };
    M[0xD1FB] = (M[0xD1FB] - 4) & 255;
    P.eat({});
    return P.list_selected_carries({});
  });

  // computer_cast: a computer wizard (type below $90) with eight action points and no partner casts
  // when enemies are in view ($5B40, $5B41) or it has half its action points left: the spells tried
  // in the order of the scenario's priorities ($D3DC, 45 bytes), highest first, each tried spell's
  // priority one more so it is not tried again. At the end the game means to clear every
  // priority's bit 0 but clears only the first's, so each tried spell keeps its extra point.
  def(0xA382, 'computer_cast', P.frame(function* (r) {
    if (M[0x5B54] >= 0x90 || M[0xD1FB] < 8) return {};
    if (P.find_partner({}).zf) return { zf: true };
    M[0x5B27] = M[0x5B26] = 1;
    if (!M[0x5B40] && !M[0x5B41] && twice(M[0xD1FB]) < M[0xD200]) return { cf: true };
    setw(0x5B04, P.wizard_record({ a: M[0x5B11] }).hl);
    M[0xD1B9] = 0xFF;
    for (;;) {
      M[0xD19E] = M[0xD19D] = 0;
      for (let k = 0; k < 0x2D; k++) {
        const a = M[0xD3DC + k];
        if (a > M[0xD19D] && a < M[0xD1B9]) { M[0xD19D] = a; M[0xFF3A] = M[0xD19E]; }
        M[0xD19E] = (M[0xD19E] + 1) & 255;
      }
      if (!M[0xD19D]) break;
      M[0xD1B9] = (M[0xD19D] + 1) & 255;
      yield* P.computer_try_spell({});
    }
    // the loop never moves on: only the first priority's bit 0 is cleared, 45 times
    M[0xD3DC] &= 0xFE;
    return { a: M[0xD3DC], b: 0, hl: 0xD3DC };
  }));

  // computer_try_spell: spell $FF3A, with a level left and the mana for it ($D0E1): the summons
  // ($03-$18) to computer_summon, the dragons and potions to computer_brew, the rest to the
  // scenario's own routine (scenario_spell). Its priority one more.
  def(0xA407, 'computer_try_spell', P.frame(function* (r) {
    P.spell_cost({ a: M[0xFF3A] });
    if (M[0xFF0B] && M[0xD0E1] >= M[0xFF39]) {
      M[0xFF31] = M[0x5B2F];
      const s = M[0xFF3A];
      if (s >= 3 && s < 0x19) yield* P.computer_summon({ a: s });
      else if (s < 0x20) yield* P.computer_brew({ a: s });
      else yield* P.scenario_spell({ a: s });
    }
    const p = (0xD3DC + M[0xFF3A]) & 0xFFFF;
    M[p] = (M[p] + 1) & 255;
    return { hl: p };
  }));

  // scenario_spell: the scenario's routine for spell A ($20 up), from its table at ($D019).
  def(0xA452, 'scenario_spell', function* (r) {
    const e = twice((r.a - 0x20) & 255);
    const t = P.read_table_word({ hl: w(0xD019), de: e });
    return yield* P.jumpGen(t.hl, { a: e, hl: t.hl, de: t.de });
  });
  // no_scenario_spell: a RET, for the spells a scenario's wizard never casts.
  def(0xA45F, 'no_scenario_spell', r => ({}));

  // computer_spell_done: the view centred, the map drawn when shown, the creature loaded again, the
  // spell's priority halved and the spell paid for; the step ends, three return addresses dropped.
  const spellDone = () => {
    P.centre({});
    if (!M[0xD066]) P.draw_map({});
    P.load_creature({ a: M[0xD186] });
    const p = (0xD3DC + M[0xFF3A]) & 0xFFFF;
    M[p] >>= 1;
    P.pay_for_spell({});
    M[0x5B57] = M[0xD0D9];
    P.update_view({});
    P.list_objects_here({});
    if (M[0x5B2C]) M[0xFF90] = M[0x5B2C];
    P.unwind(3, { a: M[0x5B2C] }, RESUME);
  };
  def(0xA4C0, 'computer_spell_done', function* (r) { return spellDone(); });

  // computer_summon: a summons cast when it leaves the scenario's reserve of mana ($D046) or enemies
  // are in view, and as many squares around the wizard are free as the spell's level; a flier lands
  // first. Dragons to summon_dragon, the rest to summon_creature, then computer_spell_done.
  def(0xA460, 'computer_summon', function* (r) {
    if (((M[0xD0E1] - M[0xFF39]) & 255) < M[0xD046] && !M[0x5B41] && !M[0x5B40]) return { a: 0, zf: true };
    P.list_neighbours_of_selected({});
    M[0xD19E] = 0;
    for (let k = 0; k < 8; k++) {
      setw(0x5B23, w(0xFF0C + 3 * k));
      if (P.square_free({ a: 0xFF }).zf) M[0xD19E] = (M[0xD19E] + 1) & 255;
    }
    if (M[0xD19E] < M[0xFF0B]) return { a: M[0xD19E], cf: true };
    if (M[0x5B2F] === 0xFE && land().zf) return { a: 0, zf: true };
    if (M[0xFF3A] < 3) P.summon_dragon({});
    else P.summon_creature({});
    return spellDone();
  });

  // add_to_wizard_list: creature $5B1F (entry IX, type IY) added to the wizard's list at $CF76 (35
  // entries; full, the border yellow): a route picked at random among the scenario's $D047 until its
  // flags ($D011) suit the type (bit 0 a flier, 1 bit 7 of byte 11, 2 one that can carry, 3 to 5 bits
  // 4 to 6 of byte 11, 6 needed for a wizard), its waypoint nearest the creature's square ($5B23)
  // first, and the order to guard (bit 7) when a roll below 100 is under the type's byte 8.
  def(0xA4FA, 'add_to_wizard_list', r => {
    let hl = 0xCF76;
    for (let b = 0x23; b; b--, hl += 4) {
      if (M[hl] !== 0xFF) continue;
      M[hl] = M[0x5B1F];
      setw(0xFF37, hl + 1);
      M[0x5B22] = M[0xD047];
      const iy = r.iy, ix = r.ix, bit = (o, m) => M[(iy + o) & 0xFFFF] & m;
      for (;;) {
        M[0xD19E] = P.random_below({}).a;
        const f = M[(w(0xD011) + M[0xD19E]) & 0xFFFF];
        if ((f & 1) && !bit(1, 0xFF)) continue;
        if ((f & 2) && !bit(0x0B, 0x80)) continue;
        if ((f & 4) && !bit(7, 0xFF)) continue;
        if ((f & 8) && !bit(0x0B, 0x10)) continue;
        if ((f & 0x10) && !bit(0x0B, 0x20)) continue;
        if ((f & 0x20) && !bit(0x0B, 0x40)) continue;
        if (M[(ix + 2) & 0xFFFF] < 0x90 && !(f & 0x40)) continue;
        break;
      }
      M[w(0xFF37)] = M[0xD19E];
      let p = P.route_address({ a: M[0xD19E] }).hl;
      M[0xFF36] = 0; M[0xD19D] = 0xFF;
      do {
        const d = P.distance({ hl: w(0x5B23), de: P.waypoint_square({ a: M[p] }).de }).a;
        if (d < M[0xD19D]) { M[0xD19D] = d; M[0xFF64] = M[0xFF36]; }
        M[0xFF36] = (M[0xFF36] + 1) & 255;
        p = (p + 1) & 0xFFFF;
      } while (!(M[p] & 0x80));
      const q = (w(0xFF37) + 2) & 0xFFFF;
      M[(q - 1) & 0xFFFF] = M[0xFF64];
      M[q] = 0;
      if (P.random_below_a({ a: 0x64 }).a < M[(iy + 8) & 0xFFFF]) M[q] = 0x80;
      return { hl: q };
    }
    P.io.out(0xFE, 6, P.T);
    return { a: 6, b: 0 };
  });

  // computer_deliver: a creature of the wizard (not the wizard, not an independent) carrying treasure
  // for it (worth with bit 7 set; the worthiest in $D1BC) throws it to the wizard when within
  // throwing range and in sight, the treasure made the object in use, for eight action points
  // ($D181 = $10 when it cannot); again while there is more.
  def(0xA5BD, 'computer_deliver', function* (r) {
    for (;;) {
      if (!M[0x5B11]) return { a: 0, zf: true };
      if (M[0x5B54] < 0x90) return { cf: true };
      M[0xD19D] = M[0xD1BC] = 0;
      if (M[0x5B62] === 0xFF) return { a: 0, zf: true };
      const n = M[0xD0DE];
      if (!n) return { a: 0, zf: true };
      for (let k = 0; k < n; k++) {
        const a = M[0xD1C1 + 2 * k];
        if (a >= 0x8C) continue;
        const p = (0xD3B9 + a) & 0xFFFF;
        if (!(M[p] & 0x80)) continue;
        const v = P.value_against_best({ hl: p });
        if (v.cf) continue;
        M[0xD19D] = v.a;
        M[0xD1BC] = a;
      }
      if (!M[0xD1BC]) return { a: 0, zf: true };
      const range = P.throw_range({ a: M[0xD1BC] }).a;
      const de = M[0x5B60] | (M[0x5B61] & 0x3F) << 8;
      setw(0xD0D3, de);
      if (P.distance_from_selected({ de }).a >= range) return {};
      M[0xFF31] = 0xFF;
      if (!P.line_of_sight({}).zf) return { zf: false };
      if (P.computer_take_object({ a: M[0xD1BC] }).cf || M[0xD1FB] < 8) { M[0xD181] = 0x10; return { a: 0x10 }; }
      M[0xD1FB] = (M[0xD1FB] - 8) & 255;
      yield* P.cw('throw_object', {});
      P.list_selected_carries({});
    }
  });

  // computer_brew: for a dragon or potion spell, with nothing but the cauldron and ingredients on the
  // square: a cauldron ($67) carried dropped there unless one lies there, and the ingredient (dragon
  // herb $53, or potion_ingredients) likewise, each made the object in use first; then for eight
  // action points ($D181 = $11 with fewer, the step ended) a dragon is summoned or the potion
  // brewed, and computer_spell_done.
  const findType = (n, hl, c) => {
    if (!n) return { a: 0, zf: true };
    for (let b = n; b; b--, hl += 2) if (M[hl] === c) return { a: 1, zf: false };
    return { a: 0, zf: true };
  };
  def(0xA6DE, 'carries_type', r => findType(M[0xD0DE], 0xD1C1, r.c & 255));
  def(0xA6E9, 'lies_here', r => findType(M[0xD0DD], 0xD1D5, r.c & 255));
  def(0xA644, 'computer_brew', function* (r) {
    const f = M[0xFF90];
    if (f >= 0x8C) return { a: f };
    if (f >= 0x6B) {
      if (f < 0x72) return { a: f, cf: true };
      if (f === 0x7A || f === 0x7B || f === 0x7C) return { a: f, zf: true };
    }
    M[0xD1BE] = M[0xD1BD] = 0;
    P.list_objects_here({});
    if (M[0x5B2C] !== 0x67) {
      if (P.carries_type({ c: 0x67 }).zf) return { a: 0, zf: true };
      M[0xD1BE] = 0x67;
    }
    const s = M[0xFF3A];
    const c = s < 3 ? 0x53 : M[(0x84CE + ((s - 0x19) & 255)) & 0xFFFF];
    if (P.lies_here({ c }).zf) {
      if (P.carries_type({ c }).zf) return { a: 0, zf: true };
      M[0xD1BD] = c;
    }
    for (const o of [0xD1BE, 0xD1BD]) {
      if (!M[o]) continue;
      const t = P.computer_take_object({ a: M[o] });
      if (!t.zf) return t;
      P.drop({});
    }
    if (M[0xD1FB] < 8) { M[0xD181] = 0x11; P.unwind(3, { a: 0x11 }, RESUME); }
    M[0xD19B] = 0;
    if (M[0xFF3A] < 3) return yield* P.computer_summon({});
    P.update_view({});
    P.brew_potion({});
    return spellDone();
  });

  // release_group: the independent creatures of group B (bits 0-5 of the orders in the scenario's
  // list at ($D015)) let move, bit 6 cleared.
  def(0xA700, 'release_group', r => {
    const b = r.a & 255;
    let hl = w(0xD015);
    while (M[hl] !== 0xFE) {
      hl = (hl + 3) & 0xFFFF;
      if ((M[hl] & 0x3F) === b) M[hl] &= ~0x40;
      hl = (hl + 1) & 0xFFFF;
    }
    return { a: 0xFE, zf: true, b, hl };
  });

  // trip_square: when square E, D is one of the scenario's trip squares (three bytes each at
  // ($D017), ending with $FE: row, column, group), that group released.
  def(0xA716, 'trip_square', r => {
    const de = r.de !== undefined ? r.de : (r.d << 8 | r.e);
    const e = de & 255, d = (de >> 8) & 255;
    for (let hl = w(0xD017); ; hl = (hl + 3) & 0xFFFF) {
      if (M[hl] === 0xFE) return { a: 0xFE, zf: true };
      if (M[hl] === e && M[(hl + 1) & 0xFFFF] === d) P.release_group({ a: M[(hl + 2) & 0xFFFF] });
    }
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
