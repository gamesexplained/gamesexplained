// The shots (bank 3's $C100-$C8D3), what lies in a shot's path ($F393-$F4BF, which the actors'
// looking shares) and the score ($E4A0).
//
// A shot is 24 bytes at $C100, one for each actor at $8300: +0 its direction (0 across, 1 down, 2
// back across, 3 back down, 4 falling) with bit 7 while it flies and bit 6 an enemy's, $FF for
// none; +1 bit 7 once drawn this pass, its low nibble a count; then its start and its end, each
// five words: across, down, height, and the screen's across and down (+2 to +$0B, +$0C to +$15).
// The party's shots are drawn whole the pass they are fired and gone; an enemy's is a line 12
// units long that flies on 128 units a pass until it hits something.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.shot = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const wl = a => M[a] | M[lo(a, 1)] << 8;
  const setl = (a, v) => { M[a] = v & 255; M[lo(a, 1)] = (v >> 8) & 255; };
  const L = r => (r.l !== undefined ? r.l : r.hl & 255);

  // --- the score: five decimal digits from $8D04, the percentage of the game done ---
  // add_percent ($E4A0): B added to the units ($8D06), $E4A6 to the hundredths ($8D08), $E4AC at
  // HL, a step at a time, carrying up
  const addAt = (at, b) => {
    do {
      for (let p = at; ; p = (p - 1) & 0xFFFF) {
        M[p] = (M[p] + 1) & 255;
        if (M[p] !== 10) break;
        M[p] = 0;
      }
      b = (b - 1) & 255;
    } while (b);
  };
  const add = at => r => { addAt(at === null ? r.hl : at, r.b & 255); return { a: 10, b: 0, hl: r.hl }; };
  P.def(0xE4A0, 'add_percent', add(0x8D06));
  P.def(0xE4A6, 'add_percent_e4a6', add(0x8D08));
  P.def(0xE4AC, 'add_percent_e4ac', add(null));

  // --- what lies along a line ---
  // own_place ($F393): the place across and down at HL+1 into BC and the other set's BC, the sets
  // exchanged
  P.def(0xF393, 'own_place', r => {
    const across = wl(lo(r.hl, 1)), down = wl(lo(r.hl, 3));
    return { bc: down, de: r.de_, hl: r.hl_, bc_: across, de_: down, hl_: lo(r.hl, 4) };
  });
  // scan_actors ($F3B4): each actor in play (+1's low nibble under 8) and not being worked on (bit
  // 7 of its type): its place E bytes in (written into $F3D6) less BC within the margin at $F3E4
  // of the line, ahead along it (D+1 bytes in, written into $F3EB, less the other set's BC; behind
  // when bit 0 of A, a negative direction) and its height (+$12) within $1B of $F411's: the
  // nearest goes in $F00E (its distance; $FF for none), $F00F and $F011. A is $F00E plus one.
  const scanActors = (perp, along, cur, alt, neg) => {
    M[0xF00E] = 0xFF;
    M[0xF3D6] = perp; M[0xF3EB] = along;
    const margin = M[0xF3E4], from = w(0xF411);
    for (let k = 0; k < 8; k++) {
      const p = 0x8301 + 0x20 * k, t = p - 1;
      if ((M[p] & 0x0F) >= 8 || M[t] & 0x80) continue;
      const pa = (t & 255) + M[0xF3D6];
      let v = wl(lo(t, M[0xF3D6])) - cur - (pa > 255 ? 1 : 0);
      let a = v < 0 ? (-(v & 255)) & 255 : v & 255;
      if (a >= margin) continue;
      const pb = (p & 255) + M[0xF3EB];
      v = wl(lo(p, M[0xF3EB])) - alt - (pb > 255 ? 1 : 0);
      let dist;
      if (!neg) { if (v < 0) continue; dist = v & 255; } else { if (v >= 0) continue; dist = (-(v & 255)) & 255; }
      const h = from - wl(lo(p, 0x11));
      a = h < 0 ? (-(h & 255)) & 255 : h & 255;
      if (a >= 0x1B) continue;
      if (M[0xF00E] < dist) continue;
      M[0xF00E] = dist; M[0xF011] = t & 255; setw(0xF00F, t);
    }
    const a = (M[0xF00E] + 1) & 255;
    return { a, zf: a === 0 };
  };
  P.def(0xF3B4, 'scan_actors', r => Object.assign(scanActors(r.e, r.d, r.bc, r.bc_, r.a & 1), { bc: r.bc, bc_: r.bc_ }));
  // scan_down ($F39F): from the place at HL, along the down axis ($F3A3: E $0E, D $0F); $F3AA
  // along the across axis ($F3AD: E $10, D $0D)
  const down = r => Object.assign(scanActors(0x0E, 0x0F, r.bc, r.bc_, r.a & 1), { bc: r.bc, bc_: r.bc_ });
  const across = r => Object.assign(scanActors(0x10, 0x0D, r.bc, r.bc_, r.a & 1), { bc: r.bc, bc_: r.bc_ });
  P.def(0xF39F, 'scan_down', r => {
    const o = P.own_place(r);
    return down({ a: r.a, bc: o.bc_, bc_: o.bc });
  });
  P.def(0xF3A3, 'scan_down_f3a3', down);
  P.def(0xF3AA, 'scan_down_f3aa', r => {
    const o = P.own_place(r);
    return across({ a: r.a, bc: o.bc, bc_: o.bc_ });
  });
  P.def(0xF3AD, 'scan_down_f3ad', across);
  // scan_boxes ($F446): the area's boxes ($962D of them, four bytes each from $C000: across from
  // and to, down from and to, in fours of units) for one the line crosses (BC over 4 within its
  // span; from $C002 for a line across, from $C000, $F452, for one down) ahead within $40 (the
  // other set's BC over 4; behind when bit 0 of A'): nearer than $F00E, it goes there and in
  // $F00F, with $F011 $FF. The start ($F478) and the two INC L or DEC L at $F484 are written in.
  const scanBoxes = (base, ops, cur, alt, neg) => {
    setw(0xF478, base); setw(0xF484, ops);
    const e = (cur >> 2) & 255, d = (alt >> 2) & 255, n0 = M[0x962D];
    if (!n0) return { zf: true, a: 0 };
    let hl = w(0xF478);
    for (let n = n0; n > 0; n--, hl = lo(hl, 4)) {
      if (e < M[hl] || e >= M[lo(hl, 1)]) continue;
      let p = lo(hl, 1);
      for (const op of [M[0xF484], M[0xF485]]) p = lo(p, op === 0x2C ? 1 : -1);
      let dist;
      if (!neg) { p = lo(p, -1); if (d >= M[p]) continue; dist = (M[p] - d) & 255; } else { if (d < M[p]) continue; dist = d - M[p]; }
      if (dist >= 0x40) continue;
      const c = (dist * 4) & 255;
      if (M[0xF00E] < c) continue;
      M[0xF00E] = c; M[0xF011] = 0xFF; setw(0xF00F, p & 0xFFFC);
    }
    return { b: 0 };
  };
  P.def(0xF446, 'scan_boxes', r => scanBoxes(0xC002, 0x2D2D, r.bc, r.bc_, (r.af_ >> 8) & 1));
  P.def(0xF452, 'scan_boxes_f452', r => scanBoxes(0xC000, 0x2C2C, r.bc, r.bc_, (r.af_ >> 8) & 1));

  // shot_path ($C638): what lies in the shot's path from its start, its height in $F411 and a
  // margin of 6: the nearest actor and then any nearer box along it, then sixteen cells of the
  // ground along it (from bank 1, $8CD0); one as high as the shot is nearer still, $FE in $F011
  const shotPath = hl => {
    setw(0xF411, wl(lo(hl, 6)));
    const dir = M[hl] & 3, along = wl(lo(hl, 2)), down = wl(lo(hl, 4)), neg = dir >> 1;
    M[0xF3E4] = 6;
    if (!(dir & 1)) { scanActors(0x10, 0x0D, down, along, neg); scanBoxes(0xC002, 0x2D2D, down, along, neg); }
    else { scanActors(0x0E, 0x0F, along, down, neg); scanBoxes(0xC000, 0x2C2C, along, down, neg); }
    const s = w(0xC218);
    P.ldir(lo(s, 2), 0x8ED1, 4);
    const g = P.ground_cell({});
    const d = M[0xC21A];
    const bc = d === 0 ? 0x40 : d === 1 ? 1 : d === 2 ? 0xFFC0 : d === 3 ? 0xFFFF : 0;
    P.copy_from_bank1({ a: 0x10, hl: g.hl, bc });
    const c = (wl(lo(s, 6)) >> 3) & 0x7F;
    for (let i = 0; i < 16; i++) {
      let a = M[0x8521 + i];
      if (a >= 0x3F) a = 0;
      if (a < c) continue;
      const dist = (i * 16) & 255;
      if (dist >= M[0xF00E]) return { a: dist };
      M[0xF00E] = dist; M[0xF011] = 0xFE;
      return { a: dist };
    }
    return { zf: true, a: 0 };
  };
  P.def(0xC638, 'shot_path', r => shotPath(r.hl));

  // project ($C362): the isometric projection of the across, down and height words at HL: the
  // screen across, twice (down - across + 512), at HL+6, and the screen down, $607 - height -
  // down - across, at HL+8 (each subtraction borrowing from the last)
  const project = h => {
    const word = k => M[(h + k) & 0xFFFF] | M[(h + k + 1) & 0xFFFF] << 8;
    const along = word(0), down = word(2), height = word(4);
    const sx = (((down + 0x200 - along) & 0xFFFF) * 2) & 0xFFFF;
    M[(h + 6) & 0xFFFF] = sx & 255; M[(h + 7) & 0xFFFF] = sx >> 8;
    let v = 0x607 - height, cy = v < 0 ? 1 : 0;
    v = (v & 0xFFFF) - down - cy; cy = v < 0 ? 1 : 0;
    v = (v & 0xFFFF) - along - cy; cy = v < 0 ? 1 : 0;
    v &= 0xFFFF;
    M[(h + 8) & 0xFFFF] = v & 255; M[(h + 9) & 0xFFFF] = v >> 8;
    return { hl: (h + 9) & 0xFFFF, de: v, bc: along, cf: !!cy, zf: v === 0 };
  };
  P.def(0xC362, 'project', r => Object.assign(project(r.hl), { a: r.a }));

  // screen_address ($C38E): the screen address of the point whose screen across and down are at
  // HL: across over 8 less the view's column ($9633), down less the view's top ($9637) and its
  // pixel row ($9632, borrowing nothing), through the row table at $8D5D
  const screenAddress = h => {
    const col = (((wl(h) >> 3) & 255) - M[0x9633]) & 255;
    let v = (wl(lo(h, 2)) - w(0x9637)) & 0xFFFF;
    v = (v & 0xFF00) | ((v - M[0x9632]) & 255);
    const row = ((v * 2) + 0x8D5D) & 0xFFFF;
    return (col + w(row)) & 0xFFFF;
  };
  P.def(0xC38E, 'screen_address', r => ({ hl: screenAddress(r.hl) }));

  // shot_offsets ($C4F7) and shot_line ($C462): the next stretch of the shot's line, from its start
  // to its end on the screen, at most 12 rows ($8D1A $FF when more remain), drawn with the line
  // routine for its direction; the visibility mask is built for the shot's coarse place nudged by
  // the direction ($C544), and the pattern's first byte (DE) chosen in it. NZ when there is
  // nothing left to draw.
  const shotOffsets = ix => {
    P.coarse_position({ hl: lo(ix, 2) });
    const d = M[0xC21A];
    const nudge = (0xC544 + ((d * 4) & 255)) & 0xFFFF;
    for (let k = 0; k < 4; k++) M[0xA03A + k] = (M[(nudge + k) & 0xFFFF] + M[0xA03A + k]) & 255;
    const c = M[lo(ix, 0x0A)];
    let e = 0x21, a;
    if (d === 4) a = c & 7;
    else {
      let bits = 0;
      for (let x = d; x; x >>= 1) bits += x & 1;
      if (!(bits & 1)) e = 0x24;
      if (d & 2) a = c & 7;
      else {
        M[0xA03E] = (M[0xA03E] - (c & 4 ? 1 : 2)) & 255;
        a = (c & 7) + 0x0C;
      }
    }
    return 0x8500 | ((e + a * 4) & 255);
  };
  const LINES = ['line_up_right_87ae', 'line_up_right', 'line_up_right_8792', 'line_up_right_879f'];
  const shotLine = ix => {
    const de = shotOffsets(ix);
    const diff = wl(lo(ix, 0x0A)) - wl(lo(ix, 0x14));
    const len = diff < 0 ? (-(diff & 255)) & 255 : diff & 255;
    if (diff >= 0 ? diff === 0 : len === 0) return { zf: false, a: 1, de };
    let b = len, flag = 0;
    if (len >= 12) { b = 12; flag = 0xFF; }
    M[0x8D1A] = flag;
    const s = w(0xC218);
    let c = M[s] & 0x60 ? 0xC0 : 0x80;
    for (let n = M[lo(ix, 8)] & 6; n; n--) c >>= 1;
    const hl = screenAddress(lo(s, 8));
    const name = LINES[M[0xC21A]] || 'line_up_right_87bb';
    return P[name]({ hl, de, bc: b << 8 | c, b, c });
  };
  P.def(0xC4F7, 'shot_offsets', r => ({ de: shotOffsets(r.ix) }));
  P.def(0xC462, 'shot_line', r => shotLine(r.ix));
  // shot_advance ($C4CD): the five words at DE moved on a stretch, each by its step for the
  // direction ($C558)
  const advance = de => {
    let t = (0xC558 + ((M[0xC21A] * 10) & 255)) & 0xFFFF;
    for (let k = 0; k < 5; k++, t = (t + 2) & 0xFFFF, de = lo(de, 2)) setl(de, wl(de) + (M[t] | M[(t + 1) & 0xFFFF] << 8));
  };
  P.def(0xC4CD, 'shot_advance', r => { advance(r.de); return {}; });

  // draw_shot ($C41E): the party's shot at $C218 drawn whole, a stretch at a time, a half character
  // left when the view is at one ($9631); then gone
  P.def(0xC41E, 'draw_shot', () => {
    const s = w(0xC218);
    if (M[0x9631]) {
      const v = M[lo(s, 8)] - 4;
      M[lo(s, 8)] = v & 255;
      if (v < 0) M[lo(s, 9)] = (M[lo(s, 9)] - 1) & 255;
    }
    M[0xC21A] = M[s] & 7;
    M[lo(s, 1)] |= 0x80;
    do {
      if (!shotLine(s).zf) { M[s] = 0xFF; return {}; }
      advance(lo(s, 2));
    } while (M[0x8D1A]);
    M[w(0xC218)] = 0xFF;
    return {};
  });

  // shot_step's end ($C260): a shot left with nothing on the screen goes; otherwise both its ends
  // are projected, and one falling is clipped to the view
  const tail = s => {
    if (!P.shot_visible({}).zf) { M[s] = 0xFF; return; }
    project(lo(s, 2)); project(lo(s, 0x0C));
    if (M[0xC21A] !== 4) return;
    if (!P.clip_falling({ hl: s }).zf) M[s] = 0xFF;
  };

  P.shot_tail = tail;

  // draw_any_shot ($C58A): the shot at HL drawn: the party's go to draw_shot. An enemy's, until it
  // has hit something ($C6DC, while +1's count is under 5), has its end put 128 units on from its
  // start, is clipped and projected ($C260), and its line drawn; then its start moves on a stretch,
  // or, once it has hit, it drops to the ground under it. +1 counts the passes, to 4 in flight;
  // after a hit on to 15, when it goes.
  P.def(0xC58A, 'draw_any_shot', r => {
    const hl = r.hl;
    if (!(M[hl] & 0x40)) return P.draw_shot({});
    M[0xC21A] = M[hl] & 3;
    if ((M[lo(hl, 1)] & 0x7F) < 5) P.enemy_shot_hit({ hl: lo(hl, 1) });
    let s = w(0xC218);
    const d = M[0xC21A];
    let p = lo(s, 2);
    if (d & 1) p = lo(p, 2);
    const v = (wl(p) + (d & 2 ? 0xFF80 : 0x80)) & 0xFFFF;
    M[lo(p, 0x0B)] = v >> 8; M[lo(p, 0x0A)] = v & 255;
    s = w(0xC218);
    tail(s);
    if (M[s] === 0xFF) return {};
    if (M[0x9631]) setl(lo(s, 8), wl(lo(s, 8)) - 4);
    if (!shotLine(s).zf) { M[s] = 0xFF; return {}; }
    if ((M[lo(s, 1)] & 0x7F) >= 5) {
      P.ldir(lo(s, 2), 0x8ED1, 6);
      let a = P.ground_cell({}).a;
      if (a >= 0x1F) a = 0;
      M[lo(s, 7)] = (a * 8) >> 8; M[lo(s, 6)] = (a * 8) & 255;
    } else advance(lo(s, 2));
    const p1 = lo(w(0xC218), 1);
    let a = M[p1] & 0x0F;
    if (a !== 4) a++;
    a &= 0x0F;
    M[p1] = a | 0x80;
    if (!a) M[lo(p1, -1)] = 0xFF;
    return {};
  });

  // enemy_shot_hit ($C6DC): whether an enemy's shot (HL at +1) hits: with the shooter's type
  // marked meanwhile, its path is looked along; something within 21 units is hit ($C282), with
  // sound effect 8 on channel B, and the shot's start put 12 units back from where it ends, +1 5
  P.def(0xC6DC, 'enemy_shot_hit', r => {
    const s = lo(r.hl, -1);
    let a = s & 255, b = 0;
    do { b = (b + 1) & 255; a = (a - 0x18) & 255; } while (a && b);
    const shooter = 0x8300 | ((b * 8 + (s & 255)) & 255);
    M[shooter] |= 0x80;
    shotPath(s);
    if (M[shooter] !== 0xFF) M[shooter] &= 0x7F;
    if (M[0xF00E] >= 0x15) return {};
    M[0x701F] = 8;
    const sp = w(0xC218);
    P.shot_end({ hl: sp });
    M[lo(sp, 1)] = 5;
    const d = M[0xC21A];
    let p = lo(sp, 0x0C);
    if (d & 1) p = lo(p, 2);
    const v = (wl(p) + (d & 2 ? 12 : 0xFFF4)) & 0xFFFF;
    M[lo(p, -0x0A)] = v & 255; M[lo(p, -9)] = v >> 8;
    return {};
  });

  // shot_end ($C282): the shot's end placed by what is in its path: with nothing ($F00E $FF) 128
  // units on from its start, sound effect 3 for the party's; at a box ($F011 $FF) at its near
  // face, effect $17; at the ground ($FE) at the edge of the cell before it, effect $17; at an
  // actor, which is hit ($C7B6), at the actor's place, effect 3
  P.def(0xC282, 'shot_end', r => {
    const hl = r.hl;
    const own = () => !(M[hl] & 0x40);
    if (M[0xF00E] === 0xFF) {
      if (own()) M[0x7006] = 3;
      const d = M[0xC21A];
      let p = lo(hl, 2);
      if (d & 1) p = lo(p, 2);
      const v = (wl(p) + (d & 2 ? 0xFF80 : 0x80)) & 0xFFFF;
      M[lo(p, 0x0A)] = v & 255; M[lo(p, 0x0B)] = v >> 8;
      return {};
    }
    if (M[0xF011] === 0xFF) {
      if (own()) M[0x7006] = 0x17;
      let de = w(0xF00F), q = lo(hl, 0x0C);
      const a = M[hl];
      if (a & 1) { q = lo(q, 2); de = (de + 2) & 0xFFFF; }
      if (a & 2) de = (de + 1) & 0xFFFF;
      const v = M[de] * 4;
      M[q] = v & 255; M[lo(q, 1)] = v >> 8;
      return {};
    }
    if (M[0xF011] === 0xFE) {
      if (own()) M[0x7006] = 0x17;
      const a = M[hl];
      let p = lo(hl, 2), off = w(0x90E2);
      if (a & 1) { p = lo(p, 2); off = w(0x90F0); }
      off &= 0x0F;
      let v = (wl(p) + off) & 0xFFFF;
      const dist = M[0xF00E];
      if (a & 2) {
        v = (v - dist) & 0xFFFF;
        const l = (v & 0xF0) + 0x10;
        v = (((v & 0xFF00) + (l & 0x100)) | (l & 255)) & 0xFFFF;
      } else v = (v + dist) & 0xFFF0;
      v = (v - off) & 0xFFFF;
      const q = lo(p, 0x0A);
      M[q] = v & 255; M[lo(q, 1)] = v >> 8;
      return {};
    }
    P.shot_hits({ hl, bc: r.bc, de: r.de });
    if (own()) M[0x7006] = 3;
    let q = lo(hl, 0x0C), e = lo(w(0xF00F), 0x0E);
    if (M[hl] & 1) { q = lo(q, 2); e = lo(e, 2); }
    M[q] = M[e]; M[(q + 1) & 0xFFFF] = M[(e + 1) & 0xFFFF];
    return {};
  });

  // shot_hits ($C7B6): the shot has hit the actor at $F00F. One of the party loses 12 strength
  // (never below 1, and then +1 of its needs 1) and says so (message 0) unless its strength's
  // bits 4-5 are set; one left at 1 is killed. Types 4 to 7 make their people hostile ($EFED 9,
  // $EFEE 7, $8D0D $FF; at the altar, zone state 4, with $8D15 set, the sacrifice begins); types 8
  // to $17 are killed outright, $18 to $27 after $C208's count of hits ($19 or $0A hundredths
  // more). Each kill adds $0F hundredths and sets the actor's +1 to $48 and its action to $8B.
  // Types $10 to $17 and from $28 are not hit.
  P.def(0xC7B6, 'shot_hits', r => {
    const hl = w(0xF00F), t = M[hl] & 0x3F;
    if (t >= 0x10 && (t < 0x18 || t >= 0x28)) return {};
    let at = hl;
    const killed = () => { M[lo(at, 1)] = 0x48; M[lo(at, 0x0C)] = 0x8B; return {}; };
    const scored = () => { addAt(0x8D08, 0x0F); return killed(); };
    if (t < 4) {
      const de = (0xD5C3 + t * 8) & 0xFFFF;
      let a = M[de] - 12;
      if (a < 0) { a = 1; M[(de + 1) & 0xFFFF] = 1; }
      M[de] = a;
      if (!(M[de] & 0x30)) P.queue_message({ b: 0, c: M[hl] & 3, bc: M[hl] & 3 });
      return M[de] === 1 ? killed() : {};
    }
    if (t < 8) {
      M[0xEFED] = 9; M[0xEFEE] = 7;
      // the sacrifice leaves HL elsewhere, and the kill is marked there
      if (M[0xFB5D] === 4 && M[0x8D15] && M[0x8D15] !== 0xFF) at = P.sacrifice({ a: (M[0x8D15] + 1) & 255, hl, bc: r.bc, de: r.de }).hl;
      M[0x8D0D] = 0xFF;
      return scored();
    }
    if (t <= 0x17) return scored();
    const p = (0xC208 + t - 0x18) & 0xFFFF;
    M[p] = (M[p] - 1) & 255;
    if (M[p]) return {};
    const bc = t >= 0x1C ? 0x0A02 : 0x1904;
    M[p] = bc & 255;
    addAt(0x8D08, bc >> 8);
    return scored();
  });

  // --- firing ---
  // can_fire ($C735): whether the actor of type A, whose record L is in, has its shot free (Z, DE
  // its shot); one of the party (under 4) also needs ammunition (+4 of its needs, $D5C7, HL'),
  // and without it NZ comes back with the register sets exchanged
  const canFire = (t, l) => {
    const ammo = (0xD5C7 + ((t * 8) & 255)) & 0xFFFF;
    if (t < 4 && !M[ammo]) return { nz: true, ammo };
    const de = 0xC100 | ((((l & 0xE0) >> 1) + ((l & 0xE0) >> 2)) & 255);
    return { zf: M[de] === 0xFF, a: (M[de] + 1) & 255, de, ammo, b: (l & 0xE0) >> 1 };
  };
  P.def(0xC735, 'can_fire', r => {
    const t = r.a & 255, f = canFire(t, L(r));
    if (f.nz) return { zf: false, a: 1, hl: f.ammo, de: (t * 8) & 255, bc: (r.bc_ & 0xFF00) | t, hl_: r.hl, de_: r.de, bc_: r.bc };
    const out = { zf: f.zf, a: f.a, de: f.de, b: f.b };
    if (t < 4) Object.assign(out, { hl_: f.ammo, de_: (t * 8) & 255, bc_: (r.bc_ & 0xFF00) | t });
    return out;
  });

  // muzzle ($C859): a shot's start, written at DE' (three words): the place at HL' (three words)
  // with the muzzle's offsets for shooter A and direction B from $C1C0 (three bytes, bit 7 to take
  // away); it comes back with the register sets exchanged
  P.def(0xC859, 'muzzle', r => {
    const b3 = (r.b * 3) & 255;
    let tbl = (0xC1C0 + ((((r.a * 12) & 255) + b3) & 255)) & 0xFFFF;
    let pos = r.hl_, de = r.de_, a = 0, c = 0;
    for (let k = 0; k < 3; k++) {
      const low = M[pos];
      pos = lo(pos, 1);
      c = M[tbl]; tbl = (tbl + 1) & 0xFFFF;
      let v, hi;
      if (c & 0x80) { c &= 0x7F; v = low - c; hi = M[pos] - (v < 0 ? 1 : 0); }
      else { v = low + c; hi = M[pos] + (v > 255 ? 1 : 0); }
      M[de] = v & 255; de = lo(de, 1);
      a = hi & 255; M[de] = a; de = lo(de, 1);
      pos = lo(pos, 1);
    }
    return { a, b: 0, c: r.bc_ & 255, hl: pos, de, hl_: tbl, bc_: b3 << 8 | c, de_: r.de };
  });

  // shot_collapse ($C7A9): the shot's start (+2 to +7) copied over its end
  const collapse = hl => { P.ldir(lo(hl, 2), lo(hl, 0x0C), 6); return { hl: lo(hl, 8), de: lo(hl, 0x12), bc: 0 }; };
  P.def(0xC7A9, 'shot_collapse', r => collapse(r.hl));

  // fire ($C75A), event 1, the end of a firing animation (HL at the actor's +$0B): an actor of
  // type under $10 whose shot is free fires it from its muzzle, the way it faces (its state's low
  // bits); one of the party spends 2 of its ammunition (message 1 when it runs out); an enemy's
  // shot has bit 6, with sound effect 2 on channel C
  P.def(0xC75A, 'fire', r => {
    const iy = r.iy, t = M[iy];
    if (t >= 0x10) return {};
    const f = canFire(t, L(r));
    if (f.nz || !f.zf) return {};
    if (t < 4) {
      const v = M[f.ammo] - 2;
      M[f.ammo] = v & 255;
      if (v < 0) { M[f.ammo] = 0; P.queue_message({ b: 1, c: t, bc: 0x100 | t }); }
    }
    const st = lo(r.hl, 2);
    let b = (M[st] & 3) | 0x80;
    if (t >= 4) { M[0x7038] = 2; b |= 0x40; }
    M[f.de] = b;
    M[lo(f.de, 1)] = 0;
    P.muzzle({ a: t < 4 ? t : 4, b: b & 3, c: t, hl_: lo(st, 1), de_: lo(f.de, 2), bc_: b << 8 | t });
    return collapse(f.de);
  });

  // --- each pass ---
  // shot_step ($C249): an enemy's shot has its end put back on its start; any other's path is
  // looked along, its end placed, and its ends projected and clipped as $C260
  P.def(0xC249, 'shot_step', r => {
    const hl = r.hl;
    setw(0xC218, hl);
    if (M[hl] & 0x40) return collapse(hl);
    M[0xC21A] = M[hl] & 7;
    shotPath(hl);
    P.shot_end({ hl });
    tail(hl);
    return {};
  });
  // move_shots ($C21B): each shot flying (+0 $7F up) is stepped, with its shooter's type marked
  // (bit 7) meanwhile so that it cannot hit the one who fired it; every shot's +1 bit 7 cleared
  P.def(0xC21B, 'move_shots', () => {
    for (let k = 0; k < 8; k++) {
      const hl = 0xC100 + 0x18 * k, de = 0x8300 + 0x20 * k, a = M[hl];
      if (a === 0xFF) continue;
      M[hl + 1] &= 0x7F;
      if (a < 0x7F) continue;
      M[de] |= 0x80;
      P.shot_step({ hl });
      M[de] &= 0x7F;
    }
    return {};
  });
  // next_shot ($C3C7): for the drawing order: of the shots not drawn this pass, the last whose
  // place down (one going across, against the other set's BC) or across plus $100 (one going down,
  // against BC) is no less than the bound becomes $C218, and the bound; NZ if there was one
  P.def(0xC3C7, 'next_shot', r => {
    let bc = r.bc, bc_ = r.bc_, found = false;
    for (let k = 0; k < 8; k++) {
      const hl = 0xC100 + 0x18 * k;
      if (M[hl] === 0xFF || M[hl + 1] & 0x80) continue;
      if (!(M[hl] & 1)) { const v = wl(hl + 4); if (v < bc_) continue; bc_ = v; }
      else { const v = (wl(hl + 2) + 0x100) & 0xFFFF; if (v < bc) continue; bc = v; }
      found = true;
      setw(0xC218, hl);
    }
    return { zf: !found, a: found ? 0xFF : 0, bc, bc_ };
  });

  // --- the view's edges for a shot's line ---
  // view_limits ($E871, HL at the shot's down; $E88C at its across): the bounds along the line that
  // keep it in the view's columns ($9635) and rows ($9637, $9632) at the shot's height: BC the
  // upper, HL the lower
  const limits = (hl, top, next, ix) => {
    let de = w(0x9637);
    de = (de & 0xFF00) | ((M[0x9632] + de) & 255);
    let t = hl + de;
    t = (t & 0xFFFF) + (M[(ix + 6) & 0xFFFF] | M[(ix + 7) & 0xFFFF] << 8);
    const cy = t > 0xFFFF ? 1 : 0;
    const u = (0x607 - (t & 0xFFFF) - cy) & 0xFFFF;
    const low = (u + 0xFF71) & 0xFFFF;
    return { bc: top < u ? top : u, hl: low < next ? next : low, de: next };
  };
  const half = () => ((w(0x9635) >> 1) + 1) & 0xFFFF;
  const viewDown = (h, ix) => {
    const down = wl(h), y = (down + 0x200 - half()) & 0xFFFF;
    return limits(down, y, (y + 0xFF92) & 0xFFFF, ix);
  };
  const viewAcross = (h, ix) => {
    const along = wl(h), x = (along + half() - 0x200) & 0xFFFF;
    return limits(along, (x + 0x6E) & 0xFFFF, x, ix);
  };
  P.def(0xE871, 'view_limits', r => viewDown(r.hl, r.ix));
  P.def(0xE88C, 'view_limits_e88c', r => viewAcross(r.hl, r.ix));

  // shot_visible ($E7C7): the shot at $C218's line (one falling aside) clipped to the view along
  // its axis, its start and end brought within the bounds; NZ when nothing of it is left
  P.def(0xE7C7, 'shot_visible', () => {
    const s = w(0xC218);
    if ((M[s] & 7) === 4) return { zf: true, a: 4, ix: s };
    const d = M[0xC21A];
    let p = lo(s, 2), lim;
    if (!(d & 1)) lim = viewDown(lo(p, 2), s);
    else { lim = viewAcross(p, s); p = lo(p, 2); }
    const upper = lim.bc, lower = lim.hl, q = lo(p, 0x0A);
    if (!(d & 2)) {
      if (lower >= wl(p)) setl(p, lower);
      if (wl(q) >= upper) setl(q, upper);
    } else {
      if (wl(p) >= upper) setl(p, upper);
      if (wl(q) < lower) setl(q, lower);
    }
    let cy = wl(p) < wl(q);
    if (d & 2) cy = !cy;
    return cy ? { zf: true, a: 0, ix: s } : { zf: false, a: d | 1, ix: s };
  });

  // clip_falling ($E75E): a falling shot's line (HL) kept within the view: NZ when it is outside
  // the view's columns or ends above the next shot's height word (+$1E, as the game reads it);
  // otherwise its ends are brought within the view's rows
  P.def(0xE75E, 'clip_falling', r => {
    const s = r.hl, sx = wl(lo(s, 8)), left = w(0x9635);
    if (sx < left) return { zf: false, cf: true, hl: s };
    if (sx >= ((left + 0xDF) & 0xFFFF)) return { zf: false, hl: s };
    let top = w(0x9637);
    const c = M[0x9632] + (top & 255);
    top = (top & 0xFF00) | (c & 255);
    const p = lo(s, 0x0A);
    if (wl(p) - top - (c > 255 ? 1 : 0) < 0) setl(p, top);
    const bottom = (top + 0x8F) & 0xFFFF, q = lo(s, 0x14), end = wl(q);
    if (end >= bottom) setl(q, bottom);
    if (end < wl(lo(s, 0x1E))) return { zf: false, cf: true, hl: s };
    return { zf: true, a: 0, hl: s };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
