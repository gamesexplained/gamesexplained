// Each scenario's own code above the engine: the seven hooks at $D01B (a JP or a RET each, read
// from memory as the game runs them), the first hook that fills the object table, the start-up
// that scatters objects ($FE03), the computer wizard's own spells, and what the scenarios add: the
// computer's creatures kept out of hazards, the lava of scenario 2 and its dungeon thing, and the
// trap floors, teleports, deadly floors and scroll of scenario 3. A routine of the same name in
// more than one scenario sits at a different address in each; P.part says which is loaded.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.scenario = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;
  const half = a => (a + (a >> 1)) & 255;
  const twice = a => (2 * a) & 255;
  // one function for a name over the scenarios, by P.part, defined at each scenario's address
  const per = (name, at, f) => {
    const g = f.constructor.name === 'GeneratorFunction'
      ? function* (r) { return yield* f(r, P.part); } : r => f(r, P.part);
    for (const [part, a] of Object.entries(at)) def(a, name, g, [+part]);
  };

  // the hooks: a JP to the scenario's routine, or a RET (nothing); in every part
  const hooks = [[0xD01B, 'hook_start'], [0xD01E, 'hook_classify_step'], [0xD021, 'hook_after_step'], [0xD024, 'hook_use_square'],
    [0xD027, 'hook_turn_start'], [0xD02A, 'hook_select_menu'], [0xD02D, 'hook_read']];
  for (const [a, name] of hooks) {
    def(a, name, function* (r) {
      if (M[a] === 0xC3) return yield* P.jumpGen(w(a + 1), r);
      return {};
    }, [0, 1, 2, 3]);
  }

  // keep_out_hazards ($D01E): a step onto water, tangle vine or fire ($36-$41) made one that cannot
  // be entered ($FF8F = 0): in scenario 1 for the computer wizard's creatures (player 2, against the
  // computer, $D064); in 2 and 3 for any creature the computer moves ($D063), in 3 the trap floors
  // ($28-$2A) too.
  per('keep_out_hazards', { 1: 0xE16A, 2: 0xE1B9, 3: 0xE1E0 }, (r, part) => {
    if (part === 1) {
      if (!M[0xD064]) return { a: 0, zf: true };
      if (M[0x5B11] !== 2) return { a: M[0x5B11], zf: false };
    } else if (!M[0xD063]) return { a: 0, zf: true };
    const t = M[0xFF91];
    if (part === 3 && t >= 0x28 && t < 0x2B) { M[0xFF8F] = 0; return { a: 0 }; }
    if (t < (part === 3 ? 0x28 : 0x36) || (part === 3 && t < 0x36) || t >= 0x42) return { a: t };
    M[0xFF8F] = 0;
    return { a: 0 };
  });

  // start_hook ($D01B): the object table and the creature records ($5B5A-$606D) emptied ($FF), then
  // the scenario's objects copied in from entry 4 and its creatures' records from the first.
  const START = { 1: [0x2A, 0xFF3F, 0x0F], 2: [0x78, 0xFF8D, 0x46], 3: [0x90, 0xFFA5, 0x23] };
  per('start_hook', { 1: 0xE183, 2: 0xE1CC, 3: 0xE1FA }, (r, part) => {
    const [n, src, m] = START[part];
    M.fill(0xFF, 0x5B5A, 0x5B5A + 0x514);
    for (let i = 0; i < n; i++) M[0x5B72 + i] = M[0xFF15 + i];
    for (let i = 0; i < m; i++) M[0x5EC0 + i] = M[src + i];
    return { hl: src + m, de: 0x5EC0 + m, bc: 0 };
  });

  // friend_near: Z clear when a creature of player 2 stands within A half squares of the cursor's
  // square ($D1BF keeps A).
  per('friend_near', { 1: 0xE2EF, 2: 0xE35C, 3: 0xE2B6 }, r => {
    M[0xD1BF] = r.a & 255;
    for (let b = 0x91, ix = 0x5B5A; b; b--, ix += 6) {
      const t = M[ix + 2];
      if (t < 0x8C || t === 0xFF) continue;
      const p = P.entry_position({ ix }), de = p.e | p.d << 8;
      setw(0x5B23, de);
      const iy = P.creature_record_of({ ix }).iy;
      if ((M[(iy + 4) & 0xFFFF] & 7) !== 2) continue;
      if (P.distance({ hl: w(0xD0D3), de }).a < M[0xD1BF]) return { a: 1, zf: false, ix, iy };
    }
    return { a: 0, zf: true };
  });

  // The computer wizard's own spells, from the table each scenario's ($D019) points at. Each ends
  // by jumping to computer_spell_done, outside the routine's own frame (it was jumped to, by
  // scenario_spell), so that the drops it makes count from computer_try_spell.
  const DONE = {};
  const spell = (name, at, body) => {
    const framed = P.frame(body);
    per(name, at, function* (r, part) {
      const x = yield* framed(r, part);
      return x === DONE ? yield* P.computer_spell_done({}) : x;
    });
  };
  // computer_shield: only while wizard 2 has no shield ($D055)
  spell('computer_shield', { 1: 0xE1C1, 2: 0xE22E, 3: 0xE238 }, function* (r) {
    if (M[0xD055]) return { a: M[0xD055], zf: false };
    P.magic_shield({});
    return DONE;
  });
  // computer_bolt: MAGIC BOLT and MAGIC LIGHTNING at the first enemy on the list whose defence and a
  // half is at most twice the blow (four times the level plus $19), in the air or on the ground
  // within twice the level plus 6, the lightning only with no creature of the computer's within 4.
  spell('computer_bolt', { 1: 0xE1CC, 2: 0xE239, 3: 0xE243 }, function* (r) {
    const n = M[0xD188];
    if (!n) return { a: 0, zf: true };
    let hl = 0xD0E6;
    for (let b = n; b; b = (b - 1) & 255, hl = (hl + 3) & 0xFFFF) {
      if (twice((twice(twice(M[0xFF0B])) + 0x19) & 255) < half(M[hl])) continue;
      const ix = P.entry_address({ a: M[(hl - 2) & 0xFFFF] }).hl;
      const h = M[(ix + 4) & 0xFFFF];
      if (h < 0xFE) continue;
      M[0xFF31] = h;
      const sq = P.entry_square({ ix }).hl;
      setw(0xD0D3, sq);
      if (((twice(M[0xFF0B]) + 6) & 255) < P.distance({ hl: sq, de: w(0x5B55) }).a) continue;
      if (M[0xFF3A] === 0x29 && !P.friend_near({ a: 4 }).zf) continue;
      if (M[0xFF3A] !== 0x29) yield* P.magic_bolt_at({ hl, ix });
      else {
        const s = yield* P.magic_lightning_at({ hl, ix });
        if (s.cf) return s;
      }
      P.IFF = false;
      return DONE;
    }
    return { b: 0 };
  });
  // computer_area_spell: MAGIC FIRE, GOOEY BLOB, TANGLE VINE and FLOOD at the first enemy on the
  // ground within twice the level plus 6, on a square not the computer's fire ($3C) or blob ($44),
  // water or vine, whose terrain the spell can take; vine and flood only with no creature of the
  // computer's within twice the level plus 1.
  spell('computer_area_spell', { 1: 0xE23F, 2: 0xE2AC }, function* (r) {
    const n = M[0xD188];
    if (!n) return { a: 0, zf: true };
    let hl = 0xD0E4;
    for (let b = n; b; b = (b - 1) & 255, hl = (hl + 3) & 0xFFFF) {
      const ix = P.entry_address({ a: M[hl] }).hl;
      const l = P.is_loose({ ix });
      if (!l.zf) continue;
      M[0xFF31] = (l.a - 1) & 255;
      const sq = P.entry_square({ ix }).hl;
      setw(0xD0D3, sq);
      if (((twice(M[0xFF0B]) + 6) & 255) < P.distance({ hl: sq, de: w(0x5B55) }).a) continue;
      const t = P.terrain_under({ ix }).a;
      if (t === 0x3C || t === 0x44 || t === 0x36 || t === 0x37) continue;
      const iy = P.terrain_record({ a: t }).iy, s = M[0xFF3A];
      const k = s === 0x20 ? M[(iy + 3) & 0xFFFF] & 0x0F : s === 0x21 ? M[(iy + 3) & 0xFFFF] & 0xF0
        : s === 0x22 ? M[(iy + 2) & 0xFFFF] & 0xF0 : M[(iy + 2) & 0xFFFF] & 0x0F;
      if (!k) continue;
      if (s >= 0x22 && !P.friend_near({ a: (twice(M[0xFF0B]) + 1) & 255 }).zf) continue;
      if (!M[0xD066]) { P.set_sound({ a: 0x0D }); P.draw_spell_bolt({}); }
      P.area_spell_at({ hl: w(0xD0D3) });
      P.IFF = false;
      return DONE;
    }
    return { b: 0 };
  });

  // scatter_objects ($FE03), the start-up: each square of terrain below $35 with a chance in the
  // table at $D0C8 (two bytes a terrain: chance, list) gets, when a number from 1 to 200 is below
  // the chance, one object from the list and up to three more while numbers stay below a halving
  // limit; then every chest gets one to six objects from list 0 or 1 (closed or open chest), each
  // put inside it (byte 4 of the entry). IX is kept from object to object, as the game keeps it, so
  // a placing that gives up puts the last object placed into the chest instead.
  def(0xFE03, 'scatter_objects', r => {
    let ix = r.ix;
    M[0xFF88] = 0;
    for (let row = 0x24; row; row--) {
      M[0xFF89] = 0;
      for (let col = 0x24; col; col--) {
        let hl = P.map_address({ hl: w(0xFF88) }).hl;
        const a = M[hl];
        if (a < 0x35 && a) {
          let e = twice(a);
          hl = (0xD0C8 + e) & 0xFFFF;
          e = M[hl];
          if (((P.random_below_a({ a: 0xC8 }).a + 1) & 255) < e) {
            let c = 0;
            for (let b = 4; b; b--) {
              c++;
              const x = P.random_below({}).a;
              e >>= 1;
              if (x >= e) break;
            }
            const type = M[(hl + 1) & 0xFFFF];
            M[0xFE02] = 0;
            for (let b = c; b; b--) ix = P.place_object({ a: type, ix }).ix;
          }
        }
        M[0xFF89] = (M[0xFF89] + 1) & 255;
      }
      M[0xFF88] = (M[0xFF88] + 1) & 255;
    }
    for (let b = 0x91, iy = 0x5B5A; b; b--, iy += 6) {
      const t = M[iy + 2];
      if (t < 0x7A || t >= 0x7C) continue;
      M[0xFE01] = t - 0x7A;
      M[0xFF88] = M[iy]; M[0xFF89] = M[iy + 1];
      M[0xFE00] = (0x91 - b) & 255;
      for (let k = P.random_below_a({ a: 6 }).a + 1; k; k--) {
        ix = P.place_object({ a: M[0xFE01], ix }).ix;
        M[(ix + 4) & 0xFFFF] = M[0xFE00];
      }
    }
    return { ix, iy: 0x5B5A + 6 * 0x91, b: 0 };
  }, [1, 2, 3]);

  // place_object: one object from list A (sixteen bytes at $D168 each) on square $FF88: up to forty
  // draws of an entry, giving up at an entry of 0, until a type with some left to place ($D132,
  // counted down); a second chest on the square refused ($FE02). A vial or chest ($74-$7B) gets a
  // random strength below 8 (byte 5).
  def(0xFEA7, 'place_object', r => {
    const list = (0xD168 + ((16 * r.a) & 255)) & 0xFFFF;
    setw(0xFF57, list);
    let c = 0, n = 0;
    for (let b = 0x28; ; b--) {
      c = M[(w(0xFF57) + P.random_below_a({ a: 0x10 }).a) & 0xFFFF];
      if (!c) return { a: 0, zf: true, ix: r.ix };
      n = (0xD132 + ((c - 0x50) & 255)) & 0xFFFF;
      if (M[n]) break;
      if (b === 1) return { a: 0, zf: true, ix: r.ix };
    }
    M[n] = (M[n] - 1) & 255;
    if (c === 0x7A || c === 0x7B) {
      if (M[0xFE02]) return { a: M[0xFE02], zf: false, ix: r.ix };
      M[0xFE02] = 1;
    }
    const ix = P.free_entry_after_wizards({}).ix;
    M[(ix + 2) & 0xFFFF] = c;
    M[ix] = M[0xFF88];
    M[(ix + 1) & 0xFFFF] = M[0xFF89];
    M[(ix + 3) & 0xFFFF] = M[P.map_address({ hl: w(0xFF88) }).hl];
    if (c >= 0x74 && c < 0x7C) M[(ix + 5) & 0xFFFF] = P.random_below_a({ a: 8 }).a;
    return { ix };
  }, [1, 2, 3]);

  // interrupt_jump: where the IM 2 vector at $FFFF leads, the interrupt handler.
  def(0xFFF4, 'interrupt_jump', r => P.interrupt(r), [1, 2, 3]);

  // lava_burns (scenario 2, $D021): a creature a human moves into the river of lava ($18-$1D)
  // takes 7 points of damage and the blow is shown; one it kills leaves the step's caller too.
  def(0xE1F0, 'lava_burns', function* (r) {
    if (M[0xD063]) return { a: M[0xD063], zf: false };
    const t = M[0xFF91];
    if (t < 0x18 || t >= 0x1E) return { a: t };
    M[0xFF2B] = M[0x5B4F];
    yield* P.damage_creature({ a: 7 });
    yield* P.show_hit({});
    P.IFF = false;
    if (!M[0xFF30]) return { a: 0, zf: true };
    P.unwind(1, { a: M[0xFF30], zf: false, hl: r.ret });
  }, [2]);

  // dungeon_thing_hides (scenario 2, $D027): the DUNGEON THING ($A9) made invisible again at the
  // start of its turn: bit 3 of byte 4 of the record at IX, which start_of_turn gives.
  def(0xE39E, 'dungeon_thing_hides', r => {
    const iy = w(0x5B4D);
    if (M[(iy + 2) & 0xFFFF] !== 0xA9) return { a: M[(iy + 2) & 0xFFFF], zf: false, iy };
    M[(r.ix + 4) & 0xFFFF] |= 8;
    return { a: 0xA9, zf: true, iy };
  }, [2]);

  // offer_read (scenario 3, $D02A): READ offered when the object in use is a SCROLL ($83).
  def(0xE2F8, 'offer_read', r => {
    if (M[0xD0D9] !== 0x83) return { a: M[0xD0D9], zf: false };
    P.add_menu_option({ a: 0x15 });
    return P.print_text({ a: 0x50 });
  }, [3]);

  // read_scroll (scenario 3, $D02D): the scroll's message (byte 5 of its entry) printed big, yellow
  // on black, on a clear screen until fire is pressed.
  def(0xE309, 'read_scroll', function* (r) {
    P.IFF = false;
    P.clear_screen({});
    setw(0x5B17, 0x0646);
    P.print_text_big({ a: M[(w(0xD0DB) + 5) & 0xFFFF] });
    yield* P.wait_fire_flashing({});
    return P.clear_screen({});
  }, [3]);

  // floor_traps (scenario 3, $D021): a creature on the ground on one of the seven teleport squares
  // (four bytes each at $E3AD: the square, where it leads) is moved there when a creature can stand
  // there, terrain 9 recorded under it; on a trap floor ($28-$2A) the eight squares around it turn
  // to that floor's terrain ($E3AA: vine, water, green fire).
  def(0xE324, 'floor_traps', r => {
    if (M[0x5B2F] !== 0xFF) return { a: M[0x5B2F], zf: false };
    let hl = 0xE3AD, found = false;
    for (let b = 7; b; b--, hl += 4) if (M[0x5B55] === M[hl] && M[0x5B56] === M[hl + 1]) { found = true; break; }
    if (found) {
      setw(0x5B23, w(hl + 2));
      if (!P.square_free({ a: 0xFF }).zf) return { zf: false };
      setw(0xFF8A, w(0x5B23));
      setw(0xFF8C, P.map_address({ hl: w(0x5B23) }).hl);
      M[0xFF8E] = 0;
      M[0xFF91] = 9;
      P.move_selected({});
      P.IFF = false;
      P.centre({});
      if (!M[0xD066]) P.draw_map({});
      return {};
    }
    const t = M[0xFF91];
    if (t < 0x28 || t >= 0x2B) return { a: t };
    M[0x5B10] = M[0xE3AA + t - 0x28];
    P.list_neighbours_of_selected({});
    for (let k = 0; k < 8; k++) { setw(0xFF88, w(0xFF0C + 3 * k)); P.set_square_terrain({}); }
    return { b: 0 };
  }, [3]);

  // deadly_floors (scenario 3, $D027): at the start of its turn a creature on the ground on terrain
  // 7 dies (255 points), and so does the creature it has in use; on the altar ($0A) it dies and four
  // squares of row 6 from column 16, every other one, turn to terrain $1F.
  def(0xE3C9, 'deadly_floors', function* (r) {
    const ix = w(0x5B4D);
    if (!P.is_loose({ ix }).zf) return { zf: false };
    const t = P.terrain_under({ ix }).a;
    if (t === 7) {
      P.list_carried({ a: M[0xFF2B] });
      yield* P.damage_creature({ a: 0xFF });
      if (M[0xD0D9] < 0x8C) return { a: M[0xD0D9], cf: true };
      M[0xFF2B] = M[0xD0DA];
      return yield* P.damage_creature({ a: 0xFF });
    }
    if (t !== 0x0A) return { a: t, zf: false };
    yield* P.damage_creature({ a: 0xFF });
    M[0x5B10] = 0x1F;
    setw(0xFF88, 0x0610);
    for (let b = 4; b; b--) { P.set_square_terrain({}); M[0xFF89] = (M[0xFF89] + 2) & 255; }
    return { b: 0 };
  }, [3]);
};
})(typeof window !== 'undefined' ? window : globalThis);
