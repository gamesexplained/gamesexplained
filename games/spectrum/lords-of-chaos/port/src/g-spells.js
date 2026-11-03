// Close combat and the spells cast at a target ($84EC-$8C0B): an attack and the blow struck back, a
// blow landing, picking a spell's target and its bolt, the area spells, the turn's opening panel,
// enchant, magic bolt and lightning, subversion, curse, magic attack, magic eye, teleport, the
// enchantments wearing off, and the magic shield.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.spells = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;
  // a drop of the return addresses that names HL, the last one popped, when its caller says
  const drop = (n, regs, ret) => { if (ret !== undefined) regs.hl = ret; P.unwind(n, regs); };

  // attack: the selected creature attacks the one it walked into ($FF2A), for 8 action points and 8
  // stamina (NOT ENOUGH ACTION POINTS, NOT ENOUGH STAMINA); a defender left alive with 4 of each
  // strikes back ($5B0C). An attacker killed by the blow back leaves the routine that moved it too.
  def(0x84EC, 'attack', function* (r) {
    P.IFF = false;
    M[0xFF30] = 0;
    const ix = w(0x5B50);
    if (M[ix] < 8) { const m = yield* P.show_message({ a: 0xB4 }); P.IFF = true; return m; }
    if (M[(ix + 1) & 0xFFFF] < 8) { const m = yield* P.show_message({ a: 0xB5 }); P.IFF = true; return m; }
    M[(ix + 1) & 0xFFFF] -= 8;
    M[ix] -= 8;
    M[0x5B29] = 1;
    P.keep_figures({});
    M[0xFF2C] = M[0x5B4F]; M[0xFF2B] = M[0xFF2A];
    M[0xD0DF] = 5; M[0xFF63] = 0; M[0x5B0C] = 0;
    yield* P.strike({});
    P.IFF = false;
    if (!M[0xD066]) P.draw_map({});
    if (!M[0xFF30]) {
      const iy = P.creature_record_of({ ix: w(0xFF28) }).iy;
      if (M[iy] >= 4 && M[(iy + 1) & 0xFFFF] >= 4) {
        M[(iy + 1) & 0xFFFF] -= 4;
        M[iy] -= 4;
        M[0x5B0C] = 1;
        M[0xFF2C] = M[0xFF2A]; M[0xFF2B] = M[0x5B4F];
        M[0xD0DF] = 0x15; M[0xFF63] = 0;
        yield* P.strike({});
        P.IFF = false;
        if (!M[0xD066]) P.draw_map({});
        if (M[0xFF30]) {
          P.work_out_sight({ hl: w(0x5B55) });
          P.reset_ff86({});
          drop(1, { a: 1, zf: false }, r.ret);
        }
      }
    }
    M[0xD0DF] = 0x15;
    P.load_creature({ a: M[0x5B4F] });
    P.update_view({});
    if (M[0xD066]) return { a: M[0xD066], zf: false };
    P.IFF = true;
    return { a: 0, zf: true };
  });
  // strike: one blow from creature $FF2C at $FF2B: $5B26 the attacker's player less 1, $5B27 set for
  // a wizard, $FF62 its combat ($D1FE); an undead attacker (bit 1 of byte 11 of its type) or a magic
  // weapon in use ($60-$66, not the magic bow $63) counts as magic ($FF63).
  def(0x85BD, 'strike', function* (r) {
    const lc = P.load_creature({ a: M[0xFF2C] });
    M[0x5B26] = ((M[(lc.ix + 4) & 0xFFFF] & 7) - 1) & 255;
    M[0x5B27] = M[(w(0xFFF9) + 2) & 0xFFFF] < 0x90 ? 1 : 0;
    M[0xFF62] = M[0xD1FE];
    if (M[0xFF63]) return yield* P.strike_hit({});
    if (M[(lc.iy + 0x0B) & 0xFFFF] & 2) { M[0xFF63] = 1; return yield* P.strike_hit({}); }
    return yield* P.strike_ranged({});
  });
  def(0x85F1, 'strike_ranged', function* (r) {
    const a = M[0xD0D9];
    if (a >= 0x60 && a < 0x67 && a !== 0x63) M[0xFF63] = 1;
    return yield* P.strike_hit({});
  });
  // strike_hit: the blow lands on $FF2B: the computer's creature attacked first is seen; the hit is
  // drawn when the turn is shown. An undead defender takes nothing from a blow that is not magic.
  // The damage is a random number below twice the strength plus 2 ($FF62), less the defence ($D1FF).
  def(0x8605, 'strike_hit', function* (r) {
    const lc = P.load_creature({ a: M[0xFF2B] });
    if (M[0xD063] && !M[0x5B0C]) M[(lc.ix + 4) & 0xFFFF] &= ~8;
    const e = w(0xFFF9);
    const de = M[e] | (M[(e + 1) & 0xFFFF] & 0x3F) << 8;
    P.IFF = false;
    M[0xD0D0] = 0;
    M[0xB45B] = 5;
    if (!M[0xD066]) { P.draw_hit({ de }); P.draw_map({}); }
    if ((M[(lc.iy + 0x0B) & 0xFFFF] & 2) && !M[0xFF63]) return { a: 0, zf: true };
    let a = (M[0xFF62] + 1) & 255;
    a = a >= 0x80 ? 0xFF : 2 * a;
    const k = P.random_below_a({ a }).a;
    const d = k - M[0xD1FF];
    if (d <= 0) return { a: d & 255, cf: d < 0, zf: d === 0 };
    yield* P.damage_and_rider({ a: d, ix: lc.ix, iy: lc.iy });
    return yield* P.show_hit({});
  });
  // pick_spell_target: a square within twice the level plus 7; carry when the cursor is left on the
  // wizard. Spells from enchant on ($24) need it in sight (NO LINE OF SIGHT, $CE, and again).
  def(0x865E, 'pick_spell_target', function* (r) {
    M[0xD0DF] = 1;
    for (;;) {
      P.IFF = true;
      P.centre({});
      yield* P.wait_release({});
      yield* P.pick_target({ a: (2 * M[0xFF0B] + 7) & 255 });
      if (P.cursor_on_selected({}).zf) return { zf: true, cf: true };
      if (M[0xFF3A] < 0x24) return { a: M[0xFF3A], cf: false };
      const s = P.line_of_sight({});
      if (s.zf) return { zf: true, cf: false };
      yield* P.show_message({ a: 0xCE });
    }
  });
  // draw_spell_bolt: the spell's flight to the target (projectile 4), keeping the cursor's square.
  def(0x868C, 'draw_spell_bolt', r => {
    const hl = w(0xD0D3);
    P.set_missile({ a: 4 });
    P.draw_missile({});
    setw(0xD0D3, hl);
    return { hl };
  });
  // area_spell: magic fire, gooey blob, tangle vine and flood, refused at the air.
  def(0x869D, 'area_spell', function* (r) {
    if (M[0xFF31] === 0xFE) return { a: 0xFE, zf: true, cf: true };
    P.clear_screen({});
    const p = yield* P.pick_spell_target({});
    if (p.cf) return p;
    return P.area_spell_at({ hl: P.draw_spell_bolt({}).hl });
  });
  // area_spell_at: at square HL ($FF94), nothing where the terrain's susceptibility to the spell is
  // 0 (fire: low four bits of byte 3 of its record; blob: high four; flood: low four of byte 2;
  // vine: high four). Flood and vine cover an area (flood_area). Fire and blob take the square when
  // a random number below 10 less the level is below it, setting the player's strengths for them
  // from its levels of the two spells ($D04B, $D04F), and spread to the neighbours at once.
  def(0x86B2, 'area_spell_at', r => {
    setw(0xFF94, r.hl);
    const iy = P.terrain_record({ a: P.what_is_at({ hl: r.hl }).a }).iy;
    const s = M[0xFF3A];
    let v;
    if (s === 0x20) { M[0xFF04] = 1; v = M[(iy + 3) & 0xFFFF] & 0x0F; }
    else if (s === 0x21) { M[0xFF04] = 0; v = M[(iy + 3) & 0xFFFF] >> 4; }
    else if (s === 0x23) { M[0x5B21] = 0; v = M[(iy + 2) & 0xFFFF] & 0x0F; }
    else { M[0x5B21] = 1; v = M[(iy + 2) & 0xFFFF] >> 4; }
    if (!v) return { a: 0, zf: true, cf: false };
    if (s >= 0x22) {
      P.flood_area({ b: v });
      return { a: M[0xFF88], zf: !M[0xFF88], cf: false };
    }
    P.set_spread_types({});
    const t = M[0xFF04] & 1 ? M[0xFF07] : M[0xFF06];
    M[0x5B10] = t; M[0xFF05] = t;
    const p = M[0x5B11], rec = w(0x5B04);
    let a = M[(rec + 0x22) & 0xFFFF] & 0x0F;
    M[(0xD04B + p) & 0xFFFF] = a;
    M[0xFF0A] = a;
    a = ((M[(rec + 0x23) & 0xFFFF] & 0x0F) - 1) & 255;
    M[(0xD050 + ((p - 1) & 255)) & 0xFFFF] = a;
    if (!(M[0xFF04] & 1)) M[0xFF0A] = a;
    M[0x5B22] = (0x0A - M[0xFF0B]) & 255;
    setw(0xFF88, w(0xFF94));
    if (P.maybe_set_terrain({ b: v }).cf) {
      setw(0xD0CC, w(0xFF94));
      P.spread_to_neighbours({ a: (2 * M[0xFF0A]) & 255 });
    }
    if (!M[0xD066]) P.draw_map({});
    return { cf: false };
  });
  // draw_turn_panel: the panel before each turn: INDEPENDENT CREATURES in a frame for player 0; for
  // a wizard WIZARD ... TURN with its name and the turn ($D065), PORTAL and the turns it has left
  // ($D042) from turn $D062, then the victory points.
  def(0x8777, 'draw_turn_panel', r => {
    P.clear_screen({});
    if (!M[0x5B11]) {
      P.print_text_big({ a: 0xE9 });
      M[0x5B17] = 0x44;
      return P.draw_frame({ hl: 0x0908, de: 0x150D });
    }
    M[0x5B17] = 0x46;
    P.draw_frame({ hl: 0x0101, de: 0x1E16 });
    P.print_text_big({ a: 0xE0 });
    setw(0x5B1A, 0x0D03);
    setw(0x5B17, 0x4505);
    P.print_text_big({ a: (M[0x5B11] + 0x8C) & 255 });
    setw(0x5B15, 0x0B06);
    P.print_number({ a: M[0xD065] });
    if (M[0xD065] >= M[0xD062]) {
      setw(0x5B1A, 0x0F06);
      setw(0x5B17, 0x4606);
      P.print_text_big({ a: 0x36 });
      setw(0x5B15, 0x1606);
      P.print_number({ a: M[0xD042] });
    }
    return P.print_victory_points({});
  });
  // enchant: the ordinary weapons ($59-$5F) carried by the creature at the target and by its rider
  // become magic (type + 7) for the level plus 3 turns; on the ground the weapons lying on the
  // square too. A target left on the wizard is not a cancel here.
  def(0x87F1, 'enchant', function* (r) {
    P.clear_screen({});
    yield* P.pick_spell_target({});
    P.draw_spell_bolt({});
    const c = P.creature_at_height({ hl: w(0xD0D3) });
    let cf = false;
    if (c.a !== 0xFF) {
      P.list_carried({ a: c.a, ix: c.ix });
      if (M[0xD0D9] >= 0x8C) P.list_carried({ a: M[0xD0DA] });
      cf = P.enchant_list({ a: M[0xD0DE], ix: 0xD1C0 }).cf;
    }
    if (M[0xFF31] !== 0xFF) return { a: (M[0xFF31] + 1) & 255, zf: false, cf };
    P.list_objects_at({ de: w(0xD0D3) });
    P.enchant_list({ a: M[0xD0DD], ix: 0xD1D4 });
    return { a: 0, zf: true, cf: false };
  });
  // enchant_list: the weapons in a list of A pairs of index and type at IX. Carry as the last pair's
  // compare left it.
  def(0x8833, 'enchant_list', r => {
    const n = r.a & 255;
    if (!n) return { a: 0, zf: true, cf: false };
    let ix = r.ix, cf = false;
    for (let b = n; b; b--, ix += 2) {
      const t = M[(ix + 1) & 0xFFFF];
      cf = t < 0x59;
      if (t < 0x59 || t >= 0x60) continue;
      const e = P.entry_address({ a: M[ix & 0xFFFF] }).hl;
      M[(e + 2) & 0xFFFF] = (t + 7) & 255;
      M[(e + 5) & 0xFFFF] = (M[0xFF0B] + 3) & 255;
    }
    return { cf, b: 0, ix: ix & 0xFFFF };
  });
  // magic_bolt, magic_bolt_at: the bolt (projectile 5) at the cursor's square, and a magic blow of
  // four times the level plus $19 at the creature at the target's height.
  def(0x885F, 'magic_bolt', function* (r) {
    P.clear_screen({});
    const p = yield* P.pick_spell_target({});
    if (p.cf) return p;
    return yield* P.magic_bolt_at({});
  });
  def(0x8866, 'magic_bolt_at', function* (r) {
    const hl = w(0xD0D3);
    P.set_missile({ a: 5 });
    if (!M[0xD066]) P.draw_missile({});
    const c = P.creature_at_height({ hl });
    if (c.a === 0xFF) return { a: 0xFF, zf: true, cf: false };
    M[0xFF2B] = c.a;
    M[0xFF62] = (4 * M[0xFF0B] + 0x19) & 255;
    M[0xFF63] = 1;
    const s = yield* P.strike_hit({});
    return s.a !== undefined ? { a: s.a, zf: !(s.a & 255), cf: false } : { cf: false };
  });
  // creature_at_height: A the index of the creature at square HL at the height $FF31 asks for ($FF
  // for none), IX its entry.
  def(0x888F, 'creature_at_height', r => {
    P.find_creatures_any({ hl: r.hl });
    const ix = w(0xD1AF), h = M[(ix + 4) & 0xFFFF];
    if (h === M[0xFF31]) return { a: M[0xD1B1], ix, zf: true, cf: false, hl: 0xFF31 };
    return { a: M[0xD1B5], ix: w(0xD1B3), zf: false, cf: h < M[0xFF31], hl: 0xFF31 };
  });
  // magic_lightning, magic_lightning_at: refused to the computer; a square whose terrain has bit 3
  // of its flags cannot be the target, and another is asked for. The lightning (projectile 6) breaks
  // the terrain of the target and its eight neighbours (to what remains of it) when a random number
  // below twice four times the level plus $1E beats its byte 1, and strikes the creatures there at
  // the target's height. A caster it kills leaves three routines more.
  function* lightning() {
    for (;;) {
      if (M[0xD063]) return { cf: true };
      const p = yield* P.pick_spell_target({});
      if (p.cf) return p;
      const s = yield* strikeLightning();
      if (s) return s;
    }
  }
  function* strikeLightning() {
    if (M[(0xD38E + P.what_is_under_cursor({}).a) & 0xFFFF] & 8) return null;
    const hl = w(0xD0D3);
    P.set_missile({ a: 6 });
    if (!M[0xD066]) P.draw_missile({});
    setw(0xD0D3, hl);
    P.centre_on({ hl });
    if (!M[0xD066]) P.draw_map({});
    setw(0xFF24, w(0xD0D3));
    P.list_neighbours({ hl: w(0xD0D3) });
    M[0xFF62] = (4 * M[0xFF0B] + 0x1E) & 255;
    for (let k = 0; k < 9; k++) {
      const sq = w(0xFF0C + 3 * k);
      setw(0x5B47, sq);
      const iy = P.terrain_record({ a: P.what_is_at({ hl: sq }).a }).iy;
      if (P.random_below_a({ a: (2 * M[0xFF62]) & 255 }).a >= M[(iy + 1) & 0xFFFF]) {
        M[0x5B10] = P.terrain_remains({ iy }).a;
        const m = w(0x5B3B);
        if (M[m] < 0x50) M[m] = M[0x5B10];
        P.set_terrain_under({ de: w(0x5B47) });
      }
      const c = P.creature_at_height({ hl: w(0x5B47) });
      if (c.a !== 0xFF) {
        M[0xFF2B] = c.a;
        M[0xFF63] = 1;
        yield* P.strike_hit({});
        P.IFF = false;
      }
    }
    const a = M[(w(0x5B50) + 2) & 0xFFFF];
    if (a) return { a, zf: false };
    P.reset_ff86({});
    M[0xFF60] = 0;
    P.unwind(3, { a: 0, zf: true, hl: 1 });
  }
  def(0x88AB, 'magic_lightning', function* (r) { P.clear_screen({}); return yield* lightning(); });
  def(0x88B8, 'magic_lightning_at', function* (r) {
    const s = yield* strikeLightning();
    return s || (yield* lightning());
  });
  // subversion: fails on a wizard. The target's magic resistance (byte 6 of its type), or its
  // rider's if higher (a wizard rider makes it fail), against a random number; success puts the
  // target and its rider on the caster's side. SPELL FAILS ($E1) otherwise. The rider's flag
  // ($895A) is never cleared.
  function* fails() { const m = yield* P.show_message({ a: 0xE1 }); return { a: m.a, cf: false }; }
  def(0x895C, 'subversion', P.frame(function* (r) {
    const t = yield* P.pick_creature_target({ ret: 0x895F });
    if (t.cf) return t;
    let ix = t.ix, iy = t.iy;
    if (M[(ix + 2) & 0xFFFF] < 0x90) return yield* fails();
    setw(0x5B47, iy);
    M[0x895B] = t.b;
    P.list_carried({ a: t.c });
    if (M[0xD0D9] >= 0x8C) {
      M[0x895A] = 1;
      ix = P.entry_address({ a: M[0xD0DA] }).hl;
      if (M[(ix + 2) & 0xFFFF] < 0x90) return yield* fails();
      const mr = P.magic_resistance({ ix });
      iy = mr.iy;
      if (M[0x895B] < mr.b) M[0x895B] = mr.b;
    }
    if (P.random_below({}).a < M[0x895B]) return yield* fails();
    P.take_over({ iy });
    if (!M[0x895A]) return { a: 0, zf: true };
    P.take_over({ iy: w(0x5B47) });
    return { a: 0, zf: true, cf: false };
  }));
  // take_over: the creature record at IY given to the current player.
  def(0x89BD, 'take_over', r => {
    const a = (M[(r.iy + 4) & 0xFFFF] & 0xF8) | M[0x5B11];
    M[(r.iy + 4) & 0xFFFF] = a;
    return { a, hl: 0x5B11 };
  });
  // magic_resistance: B the magic resistance of the creature at IX (byte 6 of its type), IY its record.
  def(0x89CA, 'magic_resistance', r => {
    const b = M[(P.type_record_of({ ix: r.ix }).iy + 6) & 0xFFFF];
    const c = P.creature_record_of({ ix: r.ix });
    return { b, iy: c.iy, a: c.a };
  });
  // curse: a random number plus 10 against the target's magic resistance; success gives it the
  // worst fatal wound (the top three bits of byte 4). SPELL FAILS otherwise.
  def(0x89D4, 'curse', P.frame(function* (r) {
    const t = yield* P.pick_creature_target({ ret: 0x89D7 });
    if (t.cf) return t;
    if (((P.random_below({}).a + 0x0A) & 255) < t.b) return yield* fails();
    const a = M[(t.iy + 4) & 0xFFFF] | 0xE0;
    M[(t.iy + 4) & 0xFFFF] = a;
    return { a, cf: false };
  }));
  // pick_creature_target: the target picked and the bolt drawn; with no creature at the target's
  // height the spell is spent and its caller left. $5B22 eight times the level plus $37; C the
  // target, B its resistance.
  def(0x89EA, 'pick_creature_target', function* (r) {
    P.clear_screen({});
    const p = yield* P.pick_spell_target({});
    if (p.cf) return p;
    P.draw_spell_bolt({});
    const c = P.creature_at_height({ hl: w(0xD0D3) });
    if (c.a === 0xFF) drop(1, { a: 0, zf: true, cf: false }, r.ret);
    M[0x5B22] = (8 * M[0xFF0B] + 0x37) & 255;
    const mr = P.magic_resistance({ ix: c.ix });
    return { a: 0, zf: true, cf: false, c: c.a, b: mr.b, ix: c.ix, iy: mr.iy };
  });
  // magic_attack: every creature of the target's type within twice the level plus 1 of the target
  // square that fails a magic resistance check is killed, each shown with the map redrawn.
  def(0x8A13, 'magic_attack', P.frame(function* (r) {
    const t = yield* P.pick_creature_target({ ret: 0x8A16 });
    if (t.cf) return t;
    M[0x8A10] = M[(t.ix + 2) & 0xFFFF];
    M[0x8A0F] = (2 * M[0xFF0B] + 1) & 255;
    setw(0x8A11, w(0xD0D3));
    for (let b = 0x91, ix = 0x5B5A; b; b--, ix += 6) {
      if (M[ix + 2] !== M[0x8A10]) continue;
      const de = M[ix] | P.entry_column({ ix }).a << 8;
      setw(0xFF94, de);
      if (P.distance({ hl: w(0x8A11), de }).a >= M[0x8A0F]) continue;
      const mr = P.magic_resistance({ ix });
      if (P.random_below({}).a < mr.b) continue;
      P.IFF = false;
      P.centre_on({ hl: w(0xFF94) });
      P.draw_map({});
      P.draw_hit({ de: w(0xFF94) });
      M[0xFF2B] = (0x91 - b) & 255;
      yield* P.damage_and_rider({ a: 0xFF, ix, iy: mr.iy });
      yield* P.show_hit({});
    }
    return { b: 0 };
  }));
  // magic_eye: a square within three times the level plus 10, and the sight from there at the
  // target's height worked out as if a creature stood there ($8A89 set meanwhile).
  def(0x8A8A, 'magic_eye', function* (r) {
    P.clear_screen({});
    M[0xD0DF] = 1;
    P.IFF = true;
    P.centre({});
    yield* P.wait_release({});
    yield* P.pick_target({ a: (3 * M[0xFF0B] + 0x0A) & 255 });
    if (P.cursor_on_selected({}).zf) return { zf: true, cf: true };
    const old = M[0x5B2F];
    M[0xFF4B] = 0;
    M[0x5B2F] = M[0xFF31];
    if (M[0xFF31] === 0xFF) M[0xFF4B] = M[(0xD38E + P.what_is_under_cursor({}).a) & 0xFFFF] & 4;
    M[0x8A89] = 1;
    P.work_out_sight({ hl: w(0xD0D3) });
    M[0x8A89] = 0;
    M[0x5B2F] = old;
    return { a: old, zf: !old, cf: false };
  });
  // teleport: into the air only under a flying potion. A square within twice the level plus $1E;
  // the further beyond twice the level, the more the landing square moves at random. It must be free
  // at the height (SPELL FAILS); the wizard and what it carries move there, with 8 action points.
  const jitter = (a, v, b) => {
    let t = ((a + v) & 255) - b;
    if (t < 0) t = (t + 0x24) & 255;
    else if (t >= 0x24) t -= 0x24;
    return t;
  };
  def(0x8BB1, 'jitter_coordinate', r => { const a = jitter(r.a & 255, M[r.hl], r.b & 255); M[r.hl] = a; return { a, hl: r.hl }; });
  def(0x8AE1, 'teleport', function* (r) {
    P.IFF = false;
    if (M[0xFF31] !== 0xFF) {
      const a = P.selected_potion({}).a & 0xE0;
      if (a !== 0xA0) return { a, zf: false, cf: true };
    }
    P.clear_screen({});
    M[0xD0DF] = 1;
    P.IFF = true;
    P.centre({});
    yield* P.wait_release({});
    yield* P.pick_target({ a: (2 * M[0xFF0B] + 0x1E) & 255 });
    P.IFF = false;
    if (P.cursor_on_selected({}).zf) return { zf: true, cf: true };
    const x = P.distance_from_selected({ de: w(0xD0D3) }).a - ((2 * M[0xFF0B]) & 255);
    if (x >= 0) {
      const a = ((x & 255) >> 1) + 1;
      M[0x5B22] = a;
      const b = a >> 1;
      P.jitter_coordinate({ a: P.random_below({}).a, hl: 0xD0D3, b });
      P.jitter_coordinate({ a: P.random_below({}).a, hl: 0xD0D4, b });
    }
    let ok = false, t = 0;
    if (P.creature_at_height({ hl: w(0xD0D3) }).a === 0xFF) {
      t = P.what_is_under_cursor({}).a;
      const iy = P.terrain_record({ a: t }).iy;
      ok = M[0xFF31] !== 0xFF ? !(M[(iy + 4) & 0xFFFF] & 8) : M[iy] !== 0xFF;
    }
    if (!ok) {
      M[0xD0DF] = 0;
      yield* P.show_message({ a: 0xE1 });
      return { a: 0, zf: true, cf: false };
    }
    M[P.map_address_selected({}).hl] = M[0xFF90];
    M[0xFF91] = t;
    setw(0x5B55, w(0xD0D3));
    const ix = w(0x5B4D);
    M[(ix + 3) & 0xFFFF] = t;
    M[ix] = M[0x5B55]; M[(ix + 1) & 0xFFFF] = M[0x5B56];
    M[(ix + 4) & 0xFFFF] = M[0xFF31];
    M[0x5B2F] = M[0xFF31];
    M[0x5B43] = 0;
    P.move_carried({ hl: w(0xD0D3) });
    M[P.map_address({ hl: w(0xD0D3) }).hl] = M[0x5B54];
    P.centre({});
    P.draw_map({});
    M[w(0x5B50)] = 8;
    return { cf: false };
  });
  // enchantments_wear_off: once a game turn every magic weapon ($60-$66) counts down byte 5 and
  // turns back into its ordinary weapon at 0.
  def(0x8BC1, 'enchantments_wear_off', r => {
    for (let b = 0x91, ix = 0x5B5A; b; b--, ix += 6) {
      const t = M[ix + 2];
      if (t < 0x60 || t >= 0x67) continue;
      const v = (M[ix + 5] - 1) & 255;
      M[ix + 5] = v;
      if (!v) M[ix + 2] = t - 7;
    }
    return { b: 0, de: 6 };
  });
  // magic_shield: the wizard's shield ($D054, by wizard) the level plus 1; its square shows the
  // sparkle on a human's turn.
  def(0x8BEC, 'magic_shield', r => {
    const a = (M[0xFF0B] + 1) & 255;
    M[(0xD054 + ((M[0x5B54] - 0x8C) & 255)) & 0xFFFF] = a;
    M[0x5B25] = a;
    if (M[0xD063]) return { a: M[0xD063], zf: false, cf: false };
    const hl = P.map_address_selected({}).hl;
    M[hl] = 0x4F;
    return { a: 0, zf: true, cf: false, hl };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
