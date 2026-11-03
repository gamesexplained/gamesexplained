// Numbers, blows shown, throwing and firing, and a wizard's end ($78ED-$7C1A, $8C0C-$8CF9): numbers
// printed, ENEMY SPOTTED, the map cleared of things after a turn, a blow landing on a creature
// (the hit graphic, a flicker for each point, the death), an object thrown or a missile fired at a
// square in range and sight, terrain set by fire, objects lost in water and fire, and the death of
// a wizard with its animation.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.combat = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw, H = P.H = P.H || {};
  const rlca = a => ((a << 1) | (a >> 7)) & 255;

  // print_number: A as up to three digits, no leading zeros, spaces after to three columns.
  // print_digit: how often B goes into A, printed unless a leading zero (C counts those printed).
  const digit = (a, b, c) => {
    let e = 0;
    while (a >= b) { a -= b; e = (e + 1) & 255; }
    if (e || b === 1 || c) {
      P.print_char({ a: (e + 0x30) & 255 });
      M[0x5B16] = (M[0x5B16] + 1) & 255;
      c = (c + 1) & 255;
    }
    return { a, c, d: a, e, b, hl: 0x5B16 };
  };
  def(0x790F, 'print_digit', r => digit(r.a & 255, r.b & 255, r.c & 255));
  def(0x78ED, 'print_number', r => {
    let o = digit(r.a & 255, 100, 0);
    o = digit(o.a, 10, o.c);
    o = digit(o.a, 1, o.c);
    const n = 3 - o.c;
    if (!n) return { a: 0, zf: true, c: o.c };
    for (let b = n; b; b--) {
      P.print_char({ a: 0x20 });
      M[0x5B16] = (M[0x5B16] + 1) & 255;
    }
    return { b: 0, c: o.c, hl: 0x5B16 };
  });

  // show_enemy_spotted: with enemies in view ($5B40 on the ground, $5B41 in the air) ENEMY SPOTTED
  // and the counts on the message line, Z clear; Z set and nothing printed with none.
  def(0x7933, 'show_enemy_spotted', r => {
    if (!((M[0x5B40] + M[0x5B41]) & 255)) return { a: 0, zf: true, hl: 0x5B41 };
    P.clear_message_line({});
    P.print_text_big({ a: 0xBD });
    setw(0x5B17, 0x4747);
    M[0x5B16] = 0x16;
    P.print_number({ a: M[0x5B40] });
    M[0x5B16] = 0x1D;
    P.print_number({ a: M[0x5B41] });
    M[0xD0D7] = 0; M[0xD0D8] = 0;
    return { a: 1, zf: false };
  });

  // clear_map_things: every entry off the map: bits 6 and 7 of byte 1 cleared, its square shows the
  // terrain under it again.
  def(0x796A, 'clear_map_things', r => {
    for (let b = 0x91, ix = 0x5B5A; b; b--, ix += 6) {
      if (M[ix + 2] === 0xFF) continue;
      const s = P.entry_square({ ix });
      M[ix + 1] = s.a;
      M[P.map_address({ hl: s.hl }).hl] = H.terrain(ix);
    }
    return { b: 0 };
  });

  // show_hit: a blow on creature $FFF9 shown, unless the turn is hidden or skip_hit ($79F9, cleared)
  // says not: the hit graphic ($4E) with a sound, a flicker for each point of damage ($FF2D, into
  // sound_running), and for a death the death graphic ($4F) until the interrupt has moved its
  // animation on to $A8.
  def(0x798B, 'show_hit', function* (r) {
    if (M[0xD066]) return { a: M[0xD066], zf: false };
    const s = M[0x79F9];
    M[0x79F9] = 0;
    if (s) return { a: s, zf: false };
    const ix = w(0xFFF9);
    const ma = P.map_address({ hl: P.entry_square({ ix }).hl }).hl;
    setw(0x5B3B, ma);
    M[0x5B12] = M[ma];
    M[ma] = 0x4E;
    P.set_sound({ a: 3 });
    P.IFF = true;
    if (M[0xFF2D]) {
      M[0xC839] = M[0xFF2D];
      for (let b = M[0xFF2D]; b; b--) {
        M[0xD0D0] = 0; M[0xB45B] = 0;
        yield { tstates: H.delayT(8) };
      }
      P.IFF = false;
      if (M[0xFF30]) {
        M[w(0x5B3B)] = 0x4F;
        P.set_sound({ a: 2 });
        const hl = (w(0xD032) + 0x18F) & 0xFFFF;
        M[hl] = 0xA5;
        P.IFF = true;
        while (M[hl] !== 0xA8) yield;
      }
    }
    P.IFF = true;
    M[0xC839] = 0;
    M[w(0x5B3B)] = M[0x5B12];
    M[0xB45B] = 5;
    return { a: 5, hl: w(0x5B3B) };
  });

  // throw_air, throw_ground: a throw at a target in the air ($FF31 $FE) or on the ground ($FF). The
  // thrower's own square cancels; impassable terrain on the ground, or no line of sight, gives NO
  // LINE OF SIGHT and asks again.
  function* throwAt(h) {
    M[0xFF31] = h;
    for (;;) {
      if ((yield* P.pick_throw_target({})).zf) return { zf: true };
      const iy = P.terrain_record({ a: P.what_is_under_cursor({}).a }).iy;
      if (!(M[0xFF31] === 0xFF && M[iy] === 0xFF) && P.line_of_sight({}).zf) return yield* P.throw_object({});
      yield* P.show_message({ a: 0xCE });
    }
  }
  def(0x79FA, 'throw_air', function* (r) { return yield* throwAt(0xFE); });
  def(0x7A01, 'throw_ground', function* (r) { return yield* throwAt(0xFF); });
  // throw_object: the object in use flies to the cursor's square and lies there, shown, with the
  // square's terrain under it; the flight drawn (projectile 3); one that does damage when thrown
  // (byte 4 of its record) strikes the creature there at the height thrown at. 8 action points.
  def(0x7A28, 'throw_object', function* (r) {
    M[0x5B10] = P.what_is_under_cursor({}).a;
    const e = P.entry_address({ a: M[0xD0DA] }).hl;
    M[e] = M[0xD0D3];
    M[(e + 1) & 0xFFFF] = M[0xD0D4] | 0x80;
    M[(e + 3) & 0xFFFF] = M[0x5B10];
    M[(e + 4) & 0xFFFF] = 0xFF;
    P.set_missile({ a: 3 });
    if (!M[0xD066]) P.draw_missile({});
    const ma = P.map_address({ hl: w(0xFF3D) }).hl;
    if (M[ma] < 0x50) M[ma] = M[0xD0D9];
    if (!M[0xD066]) P.draw_map({});
    M[0xFF63] = 0;
    const iy = P.object_record({ a: M[0xD0D9] }).iy;
    const dmg = M[(iy + 4) & 0xFFFF];
    if (dmg) { M[0xFF62] = dmg; return yield* strikeThere(true); }
    return yield* strikeThere(false);
  });
  // $7A7D, which fire_missile calls too: the creature at $FF3D at the height aimed at (or else the
  // second there) struck from afar; then the action points, a pause when the turn is shown, and the
  // cursor back on the thrower.
  function* strikeThere(strike) {
    if (strike) {
      P.find_creatures_any({ hl: w(0xFF3D) });
      if (M[0xD1AE]) {
        let a = -1;
        if (M[(w(0xD1AF) + 4) & 0xFFFF] === M[0xFF31]) a = M[0xD1B1];
        else if (M[0xD1B2]) a = M[0xD1B5];
        if (a >= 0) {
          M[0xFF2B] = a;
          M[0xFF2C] = M[0x5B4F];
          yield* P.strike_ranged({});
        }
      }
    }
    P.spend_action_points({ a: 8 });
    if (!M[0xD063]) { P.IFF = true; yield { tstates: H.delayT(0xFF) }; }
    return P.centre({});
  }
  // pick_throw_target: a square within throwing range picked; Z when it is the thrower's.
  def(0x7AC1, 'pick_throw_target', function* (r) {
    P.centre({});
    yield* P.wait_release({});
    yield* P.pick_target({ a: P.throw_range({ a: M[0x5B57] }).a });
    return P.cursor_on_selected({});
  });
  // throw_range: twice the thrower's strength ($D1FE) over the object's weight, plus 5, at most 36.
  def(0x7AD4, 'throw_range', r => {
    const iy = P.object_record({ a: r.a }).iy;
    const a = (P.divide({ a: rlca(M[0xD1FE]), b: M[(iy + 1) & 0xFFFF] }).a + 5) & 255;
    return { a: a < 0x24 ? a : 0x24, iy };
  });

  // line_of_sight, line_between: Z when the line from $FF88 (the selected creature) to $FF4D (the
  // cursor) is clear: traced through the air at once for a target or a shooter in the air, except
  // that a shooter on the ground under a roof (bit 4 of byte 4 of its terrain record), or a target
  // under one, cannot be seen past it; on the ground at both ends, traced on the ground.
  const between = () => {
    if (M[0xFF31] !== 0xFF) {
      if (M[0x5B2F] === 0xFE) return P.trace_line_air({});
      const iy = P.terrain_record({ a: P.what_is_at({ hl: w(0xFF88) }).a }).iy;
      if (M[(iy + 4) & 0xFFFF] & 0x10) return { zf: false, iy };
      return P.trace_line_air({});
    }
    if (M[0x5B2F] !== 0xFF) {
      const iy = P.terrain_record({ a: P.what_is_under_cursor({}).a }).iy;
      if (M[(iy + 4) & 0xFFFF] & 0x10) return { zf: false, iy };
      return P.trace_line_air({});
    }
    return P.trace_line_ground({});
  };
  def(0x7AE9, 'line_of_sight', r => { setw(0xFF88, w(0x5B55)); setw(0xFF4D, w(0xD0D3)); return between(); });
  def(0x7AF5, 'line_between', r => between());

  // fire_air, fire_ground, fire_missile: dragons ($90-$92) breathe flame (projectile 0), archers
  // shoot arrows (1) or, with anything but a bow ($5C), magic bolts (2). The computer's target is
  // $FF02; a human picks one in range ($FF60), the shooter's square cancelling, no line of sight
  // asking again. The creature there is struck; flame may set the square alight ($38, by its
  // terrain's chance, byte 3).
  function* fire(h) {
    if (h !== undefined) M[0xFF31] = h;
    M[0xFF63] = 0;
    const t = M[0x5B54];
    if (t >= 0x90 && t < 0x93) P.set_missile({ a: 0 });
    else { P.set_missile({ a: 1 }); if (M[0xD0D9] !== 0x5C) P.set_missile({ a: 2 }); }
    for (;;) {
      P.centre({});
      if (M[0xD063]) { setw(0xFF3D, w(0xFF02)); setw(0xD0D3, w(0xFF02)); break; }
      yield* P.wait_release({});
      yield* P.pick_target({ a: M[0xFF60] });
      if (P.cursor_on_selected({}).zf) return { zf: true };
      if (P.line_of_sight({}).zf) break;
      yield* P.show_message({ a: 0xCE });
    }
    if (!M[0xD066]) { P.draw_missile({}); P.draw_map({}); }
    M[0xD0D9] = 0;
    yield* strikeThere(true);
    if (!M[0xFF5D]) return { a: 0, zf: true };
    M[0x5B10] = 0x38;
    M[0x5B22] = 0x14;
    setw(0xFF88, w(0xFF3D));
    const iy = P.terrain_record({ a: P.what_is_at({ hl: w(0xFF3D) }).a }).iy;
    return P.maybe_set_terrain({ b: M[(iy + 3) & 0xFFFF] & 0x0F });
  }
  def(0x7B31, 'fire_air', function* (r) { return yield* fire(0xFE); });
  def(0x7B38, 'fire_ground', function* (r) { return yield* fire(0xFF); });
  def(0x7B3D, 'fire_missile', function* (r) { return yield* fire(); });
  // maybe_set_terrain: square $FF88 set to terrain $5B10 when a random number is below B (carry).
  def(0x7BC4, 'maybe_set_terrain', r => {
    const a = P.random_below({}).a;
    if (a >= (r.b & 255)) return { a, cf: false };
    return P.set_square_terrain({});
  });
  // set_square_terrain: the entries on square $FF88 get terrain $5B10 under them, and the square
  // shows it unless something stands there. Carry set.
  def(0x7BC9, 'set_square_terrain', r => {
    P.set_terrain_under({ de: w(0xFF88) });
    const ma = P.map_address({ hl: w(0xFF88) }).hl;
    if (M[ma] < 0x50) M[ma] = M[0x5B10];
    return { cf: true, hl: ma };
  });
  // destroy_lost_objects: objects loose in water ($36), or in fire ($38-$41) unless fireproof (bit 3
  // of byte 5 of their record), gone.
  def(0x7BE1, 'destroy_lost_objects', r => {
    for (let b = 0x91, ix = 0x5B5A; b; b--, ix += 6) {
      const t = M[ix + 2];
      if (t < 0x50 || t >= 0x8C || M[ix + 4] !== 0xFF) continue;
      const g = H.terrain(ix);
      if (g !== 0x36) {
        if (g < 0x38 || g >= 0x42) continue;
        if (M[(H.orec(t) + 5) & 0xFFFF] & 8) continue;
      }
      M[ix + 2] = 0xFF;
    }
    return { b: 0 };
  });

  // wizard_gone: the wizard ($FF05) at IX dead or escaped: its square shown, the death animation (seven
  // frames) with a sound, the next show_hit skipped. When every wizard is out ($D069), or against
  // the computer the human's ($8C), the game is over.
  def(0x8C0C, 'wizard_gone', function* (r) {
    P.IFF = false;
    if (M[0xD1BB]) P.clear_screen({});
    P.centre_on({ hl: P.entry_square({ ix: r.ix }).hl });
    P.draw_map({});
    M[0xFF07] = 0;
    M[0x79F9] = 0x0D;
    P.set_sound({ a: 0x0D });
    for (let b = 7; b; b--) {
      P.death_animation_frame({});
      M[0xFF07] = (M[0xFF07] + 1) & 255;
    }
    P.draw_map({});
    if (M[0xD1BB]) P.draw_turn_panel({});
    const n = (M[0xD069] + 1) & 255;
    M[0xD069] = n;
    if (n === M[0xD067]) return yield* P.game_over({});
    if (!M[0xD064]) return { a: 0, zf: true };
    if (M[0xFF05] !== 0x8C) return { a: M[0xFF05], zf: false };
    M[0xD05D] = M[0xD059];
    return yield* P.game_over({});
  });
  // entry_square: HL = the square of the entry at IX, A its column.
  def(0x8C62, 'entry_square', r => { const c = H.column(r.ix); return { hl: M[r.ix] | c << 8, a: c }; });
  // death_animation_frame: the figure drawn at eight points round the window's middle, moving out
  // a step ($FF06) at a time, ten times, with a sound.
  def(0x8C6A, 'death_animation_frame', r => {
    M[0xFF06] = 0;
    const fig = (row, col) => { if (row !== null) M[0xD0D5] = row & 255; if (col !== null) M[0xD0D6] = col & 255; P.draw_death_figure({}); };
    for (let b = 10; b; b--) {
      const s = () => M[0xFF06];
      fig(b - 1, 9);
      fig(null, s() + 9);
      fig(9, null);
      fig(s() + 9, null);
      fig(null, 9);
      fig(null, 9 - s());
      fig(9, null);
      fig(9 - s(), null);
      P.play_sound({});
      M[0xFF06] = (M[0xFF06] + 1) & 255;
    }
    return { b: 0 };
  });
  // draw_death_figure: frame $FF07 (as its colour set) of figure $FF05 at $D0D5, $D0D6.
  def(0x8CCF, 'draw_death_figure', r => {
    const g = P.thing_graphic({ a: M[0xFF05], b: M[0xFF07] });
    return P.draw_block_at({ a: g.a, b: M[0xFF07] });
  });
  // copy_wizard_name: the player's wizard's name (ten bytes from byte 59 of its record) into the
  // scenario's table of names ($D03A), eleven bytes a player.
  def(0x8CDF, 'copy_wizard_name', r => {
    let de = w(0xD03A);
    for (let b = M[0x5B11] || 256; b; b--) de = (de + 11) & 0xFFFF;
    const hl = (w(0x5B04) + 0x3B) & 0xFFFF;
    for (let i = 0; i < 10; i++) M[(de + i) & 0xFFFF] = M[(hl + i) & 0xFFFF];
    return { hl: (hl + 10) & 0xFFFF, de: (de + 10) & 0xFFFF, bc: 0 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
