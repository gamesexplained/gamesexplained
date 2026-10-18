// The actors' moves ($8ED8-$9612): each pass every actor steps through its animation in bank 1,
// a frame at a time, and each step is tried against the scenery's boxes, the other actors and the
// ground before it is taken.
//
// An actor's record is 32 bytes from $8300: its type (+0), +1 ($FF for none; bit 7 while it is
// moved, bit 6 falling or held), its animation list (+7), animation (+9) and frame (+$0B, bit 7
// played backwards), its action (+$0C, bit 7 to start it) and state (+$0D), its place across,
// down and up (+$0E, +$10, +$12), its screen place (+$14, +$16), and its frame drawn (+$1B).
// An animation is its length, two states, a byte, then four bytes a frame: the step across, down
// and up, and the frame drawn; the last frame's fourth byte names an event at the end (high
// nibble).
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.actor = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const rd = a => M[P.mem.alias(a & 0xFFFF)];
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const signed = v => (v & 0x80 ? v - 256 : v);
  const no = { zf: false };
  const yes = () => ({ zf: true, a: 0 });

  // the step at `at` (three signed bytes) added to the actor's place, or taken off it when the
  // animation plays backwards, into $8ED1-$8ED6
  const deltas = (iy, at, sign) => {
    for (let k = 0; k < 3; k++) {
      const p = iy + 0x0E + 2 * k;
      setw(0x8ED1 + 2 * k, (M[p] | M[p + 1] << 8) + sign * signed(rd(at + k)));
    }
  };
  // the actor's place followed on the screen (bank 3's projection), bank 1 paged back in
  const follow = iy => { P.follow_actor({ hl: iy + 1, iy }); P.page_bank_1(); };
  // a step backwards ($8F23): the frame counts down when it is taken
  const back = (iy, at) => {
    deltas(iy, at, -1);
    if (!P.try_move({ iy }).zf) return;
    M[iy + 0x0B] = (M[iy + 0x0B] - 1) & 255;
    follow(iy);
  };
  // a step forwards ($8F6E): the frame drawn is the entry's fourth byte; the frame counts up when
  // it is taken, and at the last the animation's event, if it has one
  const fwd = (iy, at) => {
    deltas(iy, at, 1);
    M[0x8ED7] = rd(at + 3);
    if (!P.try_move({ iy }).zf) return;
    M[iy + 0x0B] = (M[iy + 0x0B] + 1) & 255;
    const anim = w(iy + 9);
    if (rd(anim) === M[iy + 0x0B]) {
      const ev = rd(anim + 3) & 0xF0;
      if (ev) P.animation_event({ a: ev, hl: iy + 0x0B, iy, de: (anim + 3) & 0xFFFF });
    }
    follow(iy);
  };
  // start_animation ($8FDA): the animation for the actor's action and state: bank 1's table at
  // $E2F2, twelve bytes a state, gives the entry in its animation list; an entry with bit 7 plays
  // it backwards. The animation's second or third byte, unless $FF, is the new state. Then its
  // first step.
  const start = iy => {
    M[iy + 0x0C] &= 0x7F;
    const st = M[iy + 0x0D];
    const entry = (0xE2F2 + ((st * 6) & 255) * 2 + M[iy + 0x0C]) & 0xFFFF;
    const e = rd(entry);
    const p = (w(iy + 7) + ((e * 2) & 255)) & 0xFFFF;
    const anim = rd(p) | rd(p + 1) << 8;
    setw(iy + 9, anim);
    if (e & 0x80) {
      const n = rd(anim);
      M[iy + 0x0B] = n | 0x80;
      const s = rd(anim + 1);
      if (s !== 0xFF) M[iy + 0x0D] = s;
      const at = (anim + 4) & 0xFFFF;
      M[0x8ED7] = rd(at + (((n * 4) - 1) & 255));
      return back(iy, at);
    }
    M[iy + 0x0B] = 0;
    const s = rd(anim + 2);
    if (s !== 0xFF) M[iy + 0x0D] = s;
    return fwd(iy, (anim + 4) & 0xFFFF);
  };
  // one actor's step: a new animation when its action asks for one or the last ran out
  const step = iy => {
    if (M[iy + 0x0C] & 0x80) return start(iy);
    const anim = w(iy + 9);
    let n = M[iy + 0x0B];
    if (n & 0x80) {
      n &= 0x7F;
      if (!n) return start(iy);
      const at = (anim + (((n + 1) * 4) & 255)) & 0xFFFF;
      M[0x8ED7] = rd(at - 1);
      return back(iy, at);
    }
    if (n === rd(anim)) return start(iy);
    return fwd(iy, (anim + (((n + 1) * 4) & 255)) & 0xFFFF);
  };

  // animate_actors ($8ED8): the eight actors moved, a step each, with bank 1 paged in; each is
  // marked to be drawn (+$18) and, while it moves, as moving (+1)
  P.def(0x8ED8, 'animate_actors', () => {
    M[0x8ECD] = 0;
    P.page_bank_1();
    for (let iy = 0x8300; iy < 0x8400; iy += 0x20) {
      const hl = iy + 1;
      if (M[hl] === 0xFF) continue;
      M[iy + 0x18] |= 0x80; M[hl] |= 0x80;
      step(iy);
      if (M[hl] !== 0xFF) M[hl] &= 0x7F;
    }
    return {};
  });
  P.def(0x8FDA, 'start_animation', r => { start(r.iy); return {}; });

  // follow_actor ($9048): bank 3's projection ($C362) for the actor's place, HL at +1
  P.def(0x9048, 'follow_actor', r => {
    P.page_bank_3();
    const q = Object.assign({}, r, { hl: lo(r.hl, 0x0D) });
    delete q.h; delete q.l;
    return P.project(q);
  });

  // animation_event ($9052): the event in A's high nibble ($F none): the routine named by the
  // word at $9071 plus twice its number (written into the CALL that follows) runs with bank 3
  // paged in, HL at the actor's +$0B
  P.def(0x9052, 'animation_event', r => {
    const n = (r.a >> 4) & 0x0F;
    if (n === 0x0F) return { zf: true };
    P.page_bank_3();
    const fn = w(0x9071 + 2 * n);
    setw(0x906E, fn);
    P.jump(fn, { a: n, bc: n, de: fn, hl: r.hl, iy: r.iy });
    return P.page_bank_1();
  });
  // event 5 is the JP that ends animation_event: no event
  P.def(0x9070, 'animation_event_9070', () => P.page_bank_1());
  // event_stun ($9085): an actor of type 4 or more gets action $8A and bit 6 of +1
  P.def(0x9085, 'event_stun', r => {
    if (M[r.iy] < 4) return {};
    M[lo(r.hl, 1)] = 0x8A;
    M[r.iy + 1] |= 0x40;
    return {};
  });
  // event_clear ($9093): the byte after HL (the action) cleared
  P.def(0x9093, 'event_clear', r => { M[lo(r.hl, 1)] = 0; return {}; });

  // try_move ($9097): whether the actor at IY may move to $8ED1-$8ED6: not into a box of the
  // scenery, not into another actor, and the ground allows it (the leader taken as any other while
  // $8D1B is $FF or the first actor's +1 is 3); if so it moves there, its frame drawn from $8ED7
  P.def(0x9097, 'try_move', r => {
    const iy = r.iy;
    const box = P.box_collide({ iy });
    P.page_bank_1();
    if (!box.zf) return no;
    if (!P.actor_collide({ iy }).zf) return no;
    if (M[0x8D1B] === 0xFF || (M[0x8301] & 0x7F) === 3) M[0x8D0A] |= 0x80;
    const g = P.ground_allows({ iy });
    M[0x8D0A] &= 0x7F;
    if (!g.zf) return no;
    for (let k = 0; k < 6; k++) M[iy + 0x0E + k] = M[0x8ED1 + k];
    M[iy + 0x1B] = M[0x8ED7];
    return yes();
  });

  // ground_cell_at ($90DE): the cell of bank 1's grid ($C000, 64 cells to a row, each 16 units
  // square) under $8ED1 (across) and $8ED3 (down), each with the area's offset added (the
  // operands at $90E2 and $90F0, which the area loader writes): its byte and address
  P.def(0x90DE, 'ground_cell_at', () => {
    const de = (((w(0x8ED1) + w(0x90E2)) & 0xFFF0) * 4) & 0xFFFF;
    const bc = w(0x90F0);
    const hl = (0xC000 + ((((w(0x8ED3) + bc) & 0xFFFF) >> 4) & 0x3F) + de) & 0xFFFF;
    return { a: rd(hl), hl, de, bc };
  });
  P.def(0x90D5, 'ground_cell', () => { P.page_bank_1(); const g = P.ground_cell_at(); P.page_bank_3(); return g; });

  // $91B8: the actor drops: bit 6 of +1 set, state $0C plus its direction, action $81; for the
  // leader not climbing, $10 in the leader's slope ($8ECD)
  const drop = iy => {
    if (M[0x8D0A] === M[iy] && !(M[0x8ED6] & 0x80)) M[0x8ECD] = 0x10;
    M[iy + 1] |= 0x40;
    M[iy + 0x0D] = (M[iy + 0x0D] & 3) + 0x0C;
    M[iy + 0x0C] = 0x81;
    return yes();
  };
  // ground_allows ($9104): whether the ground lets the actor at IY stand at the new place. A cell
  // under $72 is a height ($A039), compared with the new height over 8: a step of one is taken
  // (ground_slope sets the height on a slope), a climb of two or more is refused (but by types
  // from $28), a drop of two or more falls, and from 7 or more a character not falling already
  // is refused (the leader falls, shouting). Cells $72 to $7E are special ground, each its own
  // routine ($9267). Types $2D and $14-$17 go anywhere; $10-$13 anywhere but $00 and $7B.
  P.def(0x9104, 'ground_allows', r => {
    const iy = r.iy;
    const g = P.ground_cell_at();
    const cell = g.a, at = g.hl;
    const type = M[iy];
    if (type === 0x2D) return yes();
    const t = type & 0x3C;
    if (t === 0x10) return cell === 0 || cell === 0x7B ? P.turn_aside({ iy }) : yes();
    if (t === 0x14) return yes();
    if (M[0x8D0A] === type) { setw(0x8ECE, at); M[0x8ED0] = rd(at); }
    const bc = P.type_byte({ a: type }).bc;
    M[0xA039] = cell;
    if (cell >= 0x72) {
      if ((cell === 0x7C || cell === 0x7B) && M[0x8ED5] >= 8) return drop(iy);
      const fn = w((0x9267 + (((cell - 0x72) * 2) & 255)) & 0xFFFF);
      return P.jump(fn, { a: fn & 255, bc, de: iy, hl: fn, iy });
    }
    P.clear_ground_flag({ bc, iy });
    const level = (w(0x8ED5) >> 3) & 0x3F;
    if (level < cell) {
      if (cell - level >= 2 && type < 0x28) return P.turn_aside({ iy });
    } else if (level - cell >= 2) {
      if (level - cell >= 7) {
        if (M[0x8D0A] !== type) {
          if (type > 0x27) return drop(iy);
          if (!(M[iy + 1] & 0x40)) return P.turn_aside({ iy });
        }
        M[iy + 1] = 8;
        M[0x701F] = 4;
      }
      return drop(iy);
    }
    if (M[iy + 1] & 0x40) {
      if ((M[iy + 1] & 0x1F) === 8) M[iy + 0x0C] = 0x0B;
      else { M[iy + 1] &= 0xBF; M[iy + 0x0D] &= 3; M[iy + 0x0C] = 0x80; }
    }
    return P.ground_slope({ hl: at, iy });
  });

  // ground_slope ($91FE): the height at the new place in the cell at HL: of the neighbours one
  // cell left, up, right and down (the offsets at $925F, each from the last), the first one
  // higher by one is the way the cell slopes (1 to 4, the leader's into $8ECD), and the place's
  // eighths across or down it (with the operands at $9237 and $9244 added) are the height within
  // the cell, above the cell's own height times 8
  P.def(0x91FE, 'ground_slope', r => {
    const c = rd(r.hl);
    let n = r.hl, dir = 0;
    for (let b = 4, t = 0x925F; b > 0; b--, t += 2) {
      n = (n + w(t)) & 0xFFFF;
      const v = rd(n);
      if (c < v && c + 1 >= v) { dir = 5 - b; break; }
    }
    let a = 0;
    if (dir) {
      if ((M[0x8D0A] & 0x7F) === M[r.iy]) M[0x8ECD] = dir;
      if ((dir - 1) & 1) {
        a = ((M[0x8ED1] + M[0x9237]) >> 1) & 255;
        if (dir & 2) a = ~a & 255;
      } else {
        a = ((M[0x8ED3] + M[0x9244]) >> 1) & 255;
        if (!(dir & 2)) a = ~a & 255;
      }
    }
    const base = ((M[0xA039] * 2) & 255) * 4;
    setw(0x8ED5, (base & 0xFF00) | (((a & 7) + base) & 255));
    return yes();
  });

  // --- the special ground, entered with DE at the actor and BC at its sink count ---
  // ground_72 ($9283): only the leader steps on it: the end of the game (bank 3's $E910), his
  // action cleared
  P.def(0x9283, 'ground_72', r => {
    if (M[0x8D0A] !== M[r.de]) return P.turn_aside(r);
    P.page_bank_3();
    P.game_end({ a: M[0x8D0A], bc: r.bc, de: r.hl, hl: r.de, iy: r.iy });
    M[0x830C] = 0;
    P.page_bank_1();
    return yes();
  });
  // ground_73 ($9298): only types from $28; their height becomes $A0
  P.def(0x9298, 'ground_73', r => {
    if (M[r.de] < 0x28) return P.turn_aside(r);
    setw(0x8ED5, 0xA0);
    return yes();
  });
  // ground_74 ($92A6): Clive falls through (bank 3's $E609); anyone else as on $75
  P.def(0x92A6, 'ground_74', r => {
    if (M[r.de] !== 3) return P.ground_75(r);
    P.page_bank_3();
    P.clive_falls({ a: 3, bc: r.bc, de: r.de, hl: r.hl, iy: r.iy });
    P.page_bank_1();
    return yes();
  });
  // ground_75 ($92B6): while the leader stands on $75 or $76, a party member walking (+1 under 4)
  // takes the leader's action (less 5 if running), +4 set to 3
  P.def(0x92B6, 'ground_75', r => {
    const s = M[0x8ED0];
    if (s === 0x75 || s === 0x76) {
      const iy = r.de;
      if (M[0x8D0A] === M[iy]) return yes();
      if ((M[iy + 1] & 0x7F) < 4) {
        let a = M[0x830C] & 0x7F;
        if (a) {
          if (a >= 5) a -= 5;
          M[r.iy + 0x0C] = a;
          M[r.iy + 4] = 3;
        }
      }
    }
    return yes();
  });
  // ground_7e ($92E5): the leader, or the character in $8D0C, takes state $49 and the sink count
  // is cleared; others of types to $27 are turned aside; then action $80, the state's direction
  // plus $0C, and sound 4
  P.def(0x92E5, 'ground_7e', r => {
    const iy = r.de, type = M[iy];
    const c = M[0x8D0C];
    if (((c & 0x80) && (c & 0x7F) === type) || M[0x8D0A] === type) {
      M[iy + 1] = 0x49;
      M[r.bc] = 0;
    } else if (type <= 0x27) return P.turn_aside(r);
    return P.ground_7e_9306({ hl: iy + 1 });
  });
  // $9306: the actor whose +1 is at HL stops (action $80) and drops (state $0C plus its
  // direction), sound effect 4 on channel B
  P.def(0x9306, 'ground_7e_9306', r => {
    const iy = lo(r.hl, -1);
    M[iy + 0x0C] = 0x80;
    M[iy + 0x0D] = (M[iy + 0x0D] & 3) + 0x0C;
    M[0x701F] = 4;
    return yes();
  });
  // ground_76 ($931A), ground_77 ($934C), ground_78 ($9350): a ledge: refused at height 0 and to
  // others than the leader of types to $1B ($76) or $27; facing the right way (state bits 0-1:
  // 2 or 3 on $76, 3 on $77, 2 on $78) the actor climbs it: state $0C plus that, action $84 ($83),
  // bit 6 of +1; facing another way, the step is refused and +$18's bit 6 marks it
  const ledge = (r, ok, top, action) => {
    if (!M[0x8ED5]) return P.turn_aside(r);
    const iy = r.de;
    if (M[0x8D0A] !== M[iy] && M[iy] <= top) return P.turn_aside(r);
    const a = M[iy + 0x0D] & 3;
    M[r.iy + 0x18] |= 0x40;
    if (!ok(a)) return { zf: false };
    M[r.iy + 0x18] &= 0xBF;
    M[iy + 0x0D] = a + 0x0C;
    M[iy + 0x0C] = action;
    M[r.iy + 1] |= 0x40;
    return yes();
  };
  P.def(0x931A, 'ground_76', r => ledge(r, a => a >= 2, 0x1B, 0x84));
  P.def(0x934C, 'ground_77', r => ledge(r, a => a === 3, 0x27, 0x83));
  P.def(0x9350, 'ground_78', r => ledge(r, a => a === 2, 0x27, 0x83));
  // clear_ground_flag ($9394): the sink count at BC cleared, and bit 4 of a state $10-$13
  const clearFlag = iy => { if ((M[iy + 0x0D] & 0xFC) === 0x10) M[iy + 0x0D] &= 0xEF; return yes(); };
  P.def(0x9394, 'clear_ground_flag', r => { M[r.bc] = 0; return clearFlag(r.iy); });
  P.def(0x9396, 'clear_ground_flag_9396', r => clearFlag(r.iy));
  // ground_7d ($93A6): water: an actor filling a bottle (+1 state 7) has filled it (bank 3's
  // $FA02); else only the leader, his bit 6 of +1 cleared, who drops from height $10 or wades in:
  // state $10 plus his direction, the sink count $14 or $15, $8D1B cleared
  P.def(0x93A6, 'ground_7d', r => {
    const iy = r.de;
    if ((M[iy + 1] & 0x1F) === 7) {
      P.page_bank_3();
      const z = P.bottle_filled({ a: 7, bc: r.bc, de: r.hl, hl: r.de, iy: r.iy });
      P.page_bank_1();
      return { zf: !!z.zf };
    }
    if (M[0x8D0A] !== M[iy]) return P.turn_aside(r);
    M[iy + 1] &= 0xBF;
    if (M[0x8ED5] >= 0x10) return drop(iy);
    M[iy + 0x0D] = (M[iy + 0x0D] & 3) + 0x10;
    M[r.bc] = (M[0x8D1C] & 1) + 0x14;
    M[0x8D1B] = 0;
    return yes();
  });
  // ground_79 ($93E3): only types whose bits 2-5 are clear
  P.def(0x93E3, 'ground_79', r => (M[r.de] & 0x3C ? P.turn_aside(r) : yes()));
  // ground_7c ($93EB): the height becomes 0
  P.def(0x93EB, 'ground_7c', () => { setw(0x8ED5, 0); return yes(); });
  // ground_7b ($93F3): the leader, or an actor falling, falls: bit 6 of +1, action $80 unless it
  // is $0B, the sink count up
  P.def(0x93F3, 'ground_7b', r => {
    const iy = r.de;
    if (M[0x8D0A] !== M[iy] && !(M[iy + 1] & 0x40)) return P.turn_aside(r);
    clearFlag(r.iy);
    M[iy + 1] |= 0x40;
    if (M[iy + 0x0C] !== 0x0B) M[iy + 0x0C] = 0x80;
    M[r.bc] = (M[r.bc] + 1) & 255;
    return yes();
  });
  // ground_7a ($9413): swamp: with no menu up, an actor not falling whose sink count has reached
  // $10 starts to fall (bit 6, action $80); the count goes up, or down while the actor stands
  // still (no action)
  P.def(0x9413, 'ground_7a', r => {
    if (M[0x8D22]) return yes();
    const iy = r.de;
    if (!(M[iy + 1] & 0x40)) {
      if (M[r.bc] >= 0x10) { M[iy + 1] |= 0x40; M[r.iy + 0x0C] = 0x80; }
      if (M[r.iy + 0x0C] & 0x3F) {
        if (M[r.bc]) M[r.bc] = (M[r.bc] - 1) & 255;
        return yes();
      }
    }
    M[r.bc] = (M[r.bc] + 1) & 255;
    return yes();
  });

  // $950A: the actor turned: +$18's bit 6 set; one not walking (+1 from 5) only that, else +4's
  // low nibble set to 5; zf clear (the step refused)
  const turned = iy => {
    M[iy + 0x18] |= 0x40;
    const a = M[iy + 1] & 0x7F;
    if (a >= 5) return { zf: false, a: a | 1 };
    M[iy + 4] = (M[iy + 4] & 0xF0) | 5;
    return { zf: false, a: M[iy + 4] };
  };
  // $950A, where a bottle filled ($FA02) ends too
  P.def(0x950A, 'actor_collide_950a', r => turned(r.iy));
  // $9533: a new action, its direction plus C (2, or 3 entered at $9531), as a walk 1 to 4 with
  // bit 7 set, unless it is falling or held (bit 6 of +1)
  const turnBy = (iy, c) => {
    if (M[iy + 1] & 0x40) return { zf: false };
    M[iy + 0x0C] = (((M[iy + 0x0D] + c) & 3) + 1) | 0x80;
    return turned(iy);
  };
  // turn_aside ($9525): bit 5 of +$18 flipped, and the actor turned a quarter
  P.def(0x9525, 'turn_aside', r => { M[r.iy + 0x18] ^= 0x20; return turnBy(r.iy, 2); });

  // actor_collide ($9440): whether the actor at IY (types to $0F, not falling) would touch
  // another at the new place, within 4 units across and down of it (other than one moving now and
  // types $10-$17). Touching a type from $28 that is moving, a character (types under 4) is
  // seized: +1 $48, action $8B. Otherwise it turns aside, a half turn when the other is still,
  // facing it, or busy, and a quarter (with +$0C at $80) when not. Type $2D lets it pass.
  P.def(0x9440, 'actor_collide', r => {
    const iy = r.iy;
    if ((M[iy] & 0xFC) >= 0x10 || (M[iy + 1] & 0x40)) return yes();
    const down = w(0x8ED3), across = w(0x8ED1);
    for (let hl = 0x8301; hl < 0x8400; hl += 0x20) {
      if (M[hl] & 0x80) continue;
      const t = M[hl - 1];
      if (t >= 0x10 && t < 0x18) continue;
      const x = w(hl + 0x0D), y = w(hl + 0x0F);
      if (x < ((across - 4) & 0xFFFF) || x > ((across + 4) & 0xFFFF)) continue;
      if (y < ((down - 4) & 0xFFFF) || y > ((down + 4) & 0xFFFF)) continue;
      const o = hl - 1;
      if (t >= 0x28) {
        if (t === 0x2D) return yes();
        if (M[o + 0x0C] && M[iy] < 4) { M[iy + 1] = 0x48; M[iy + 0x0C] = 0x8B; return { zf: false, a: 0x8B | 1 }; }
      }
      const act = M[o + 0x0C];
      if (act === 5 || !(act & 0x7F) || M[o + 0x0D] >= 8 || ((M[o + 0x0D] & 3) ^ 2) === M[iy + 0x0D]) return turnBy(iy, 3);
      M[iy + 0x0C] = 0x80;
      return turned(iy);
    }
    M[iy + 0x18] &= 0xBF;
    return yes();
  });

  // box_collide ($9546): whether an actor (types under $28) at the new place, over 4, stands in
  // one of the area's boxes (bank 3's list at $C000, $962D of them: across from and to, down from
  // and to); if so it turns to walk along the box's nearer side (action $81 to $84)
  P.def(0x9546, 'box_collide', r => {
    const iy = r.iy;
    if (M[iy] >= 0x28) return yes();
    let n = M[0x962D];
    if (!n) return yes();
    P.page_bank_3();
    const e = (w(0x8ED1) >> 2) & 255, d = (w(0x8ED3) >> 2) & 255;
    let box = 0xC000;
    do {
      const B = k => rd(lo(box, k));
      if (e >= B(0) && e <= B(1) && d >= B(2) && d <= B(3)) {
        let a, c, at;
        if (!(M[iy + 0x0D] & 1)) { a = d; at = box + 2; c = 2; } else { a = e; at = box; c = 1; }
        const d1 = Math.abs(a - rd(at)), d2 = Math.abs(a - rd(at + 1));
        M[iy + 0x0C] = ((d2 < d1 ? c : c + 2) | 0x80) & 255;
        return turned(iy);
      }
      box = lo(box, 4);
      n = (n - 1) & 255;
    } while (n);
    return yes();
  });

  // find_cell_near ($95C0): the cell value in A looked for in the eight cells from the leader's
  // ($8ECE) to the right, then the left, down and up: zf and its distance in H (across, signed)
  // or L (down); bank 3 paged back in
  P.def(0x95C0, 'find_cell_near', r => {
    P.page_bank_1();
    const base = w(0x8ECE), a = r.a;
    let res = null;
    let hl = base, last = base;
    for (let b = 8; b > 0 && !res; b--, hl = lo(hl, 1)) if (rd(hl) === a) res = { h: 8 - b, l: 0 };
    hl = base;
    for (let b = 8; b > 0 && !res; b--, hl = lo(hl, -1)) if (rd(hl) === a) res = { h: (b - 8) & 255, l: 0 };
    hl = base;
    for (let b = 8; b > 0 && !res; b--, hl = (hl + 0x40) & 0xFFFF) if (rd(hl) === a) res = { h: 0, l: 8 - b };
    hl = base;
    for (let b = 8; b > 0 && !res; b--, hl = (hl - 0x40) & 0xFFFF) { last = hl; if (rd(hl) === a) res = { h: 0, l: (b - 8) & 255 }; }
    P.page_bank_3();
    return res ? Object.assign(res, { zf: true, a: 0 }) : { zf: false, b: 1, h: ((last - 0x40) >> 8) & 255, l: (last - 0x40) & 255 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
