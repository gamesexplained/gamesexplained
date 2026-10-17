// The records of everyone in the world, in play or not (bank 3, $DB0B-$E4C1): the routes they
// walk, the places they are kept at while out of the view, and who is brought in or put back as
// the leader moves.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.records = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const far = (a, b) => Math.abs(a - b);
  // a byte added to or taken from one in memory: the carry or borrow
  const addTo = (a, v) => { const s = M[a] + v; M[a] = s & 255; return s > 255 ? 1 : 0; };
  const subFrom = (a, v) => { const s = M[a] - v; M[a] = s & 255; return s < 0 ? 1 : 0; };



  // --- the area the leader walks into ---
  // area_edges ($DB0B): after each step of the scrolling, the view's column ($9633) or row ($9634)
  // off an edge of the area moves it into the next ($DB43 east, $DB56 west, $DB75 south, $DB88
  // north); in a new area the objects are carried ($F72A twice), drawn ($F633) and it is loaded
  P.def(0xDB0B, 'area_edges', () => {
    const old = M[0x8D1F];
    const col = M[0x9633];
    if (col >= 0xF2) P.area_east_db56({}); else if (col >= 0xE4) P.area_east({});
    const row = M[0x9634];
    if (row & 0x80) P.area_east_db88({}); else if (row >= 0x6C) P.area_east_db75({});
    if (old === M[0x8D1F]) return { a: old, zf: true, hl: 0x8D1F };
    P.carry_objects({ a: old, hl: 0x8D1F });
    P.carry_objects({ a: old, hl: 0x8D1F });
    P.objects_pass({});
    return P.load_area({});
  });
  // area_east ($DB43) and the others: the view at the opposite edge, the area one along or four up
  // or down, and the actors beyond DE across or down (+$14 or +$16, the comparison flipped by the
  // CCF or NOP put at $DBC7) carried by BC, with A' 0 or $FF for the other coordinate
  const toArea = (ccf, view, at, de, bc, step, a_, which) => {
    M[0xDBC7] = ccf;
    M[view] = at;
    M[0x8D1F] = (M[0x8D1F] + step) & 255;
    return P.carry_actors({ a: which, de, bc, af_: a_ << 8 });
  };
  P.def(0xDB43, 'area_east', () => toArea(0x3F, 0x9633, 0, 0x0720, 0x01C8, 1, 0, 0x13));
  P.def(0xDB56, 'area_east_db56', () => toArea(0, 0x9633, 0xE3, 0x00E0, 0xFE38, 0xFF, 0, 0x13));
  P.def(0xDB75, 'area_east_db75', () => toArea(0x3F, 0x9634, 0, 0x0360, 0x01B0, 4, 0xFF, 0x15));
  P.def(0xDB88, 'area_east_db88', () => toArea(0, 0x9634, 0x6B, 0x00A0, 0xFE50, 0xFC, 0xFF, 0x15));
  // carry_actors ($DBA8): every actor in play but type $2D whose word at +1 plus A ($DBBD) is
  // below DE (or not, after a CCF at $DBC7) is carried into the new area ($DBDD)
  P.def(0xDBA8, 'carry_actors', r => {
    M[0xDBBD] = r.a & 255;
    for (let hl = 0x8300; hl < 0x8400; hl += 0x20) {
      if (M[hl] === 0x2D || M[hl + 1] === 0xFF) continue;
      const at = lo(hl + 1, M[0xDBBD]);
      let cf = (M[at] | M[lo(at, 1)] << 8) < r.de;
      if (M[0xDBC7] === 0x3F) cf = !cf;
      if (cf) P.carry_actor({ hl, de: r.de, bc: r.bc, af_: r.af_ });
    }
    return {};
  });
  // carry_actor ($DBDD): the actor at HL given the area ($8D1F, +$1E), BC added to its across
  // (+$0E) and taken from its down (+$10), or added when A' is not 0, and projected again ($C362)
  P.def(0xDBDD, 'carry_actor', r => {
    const hl = r.hl, bc = r.bc & 0xFFFF;
    M[lo(hl, 0x1E)] = M[0x8D1F];
    let v = (M[lo(hl, 0x0E)] | M[lo(hl, 0x0F)] << 8) + bc;
    M[lo(hl, 0x0E)] = v & 255; M[lo(hl, 0x0F)] = (v >> 8) & 255;
    v = (M[lo(hl, 0x10)] | M[lo(hl, 0x11)] << 8) - bc;
    if ((r.af_ >> 8) & 255) v += 2 * bc;
    M[lo(hl, 0x11)] = (v >> 8) & 255; M[lo(hl, 0x10)] = v & 255;
    return P.project({ hl: lo(hl, 0x0E), a: lo(hl, 0x0F) & 255 });
  });

  // --- the records brought into play and put back ---
  // place_creatures ($DC0B): each of the 46 records from $EB06 (8 bytes: the byte before the type,
  // then bit 7 in play, area, across, down, height in units of four) not in play nor of kind 9, in
  // this area and within reach of the view (its screen across within 44 characters right of eight
  // left of the view's column, its screen down within 34 below eight above the view's row, over
  // the ground under it, $DCA0) is brought into play ($DD1C); then the objects ($F633)
  const within = (e, c, n) => {
    if (e >= c) return false;
    return e + n > 255 || e + n >= c;
  };
  P.def(0xDC0B, 'place_creatures', () => {
    const e = M[0x9633] >= 8 ? M[0x9633] - 8 : 0;
    const d = M[0x9634] >= 8 ? M[0x9634] - 8 : 0;
    let hl = 0xEB06;
    for (let b = 0x2E; b > 0; b--, hl = (hl + 8) & 0xFFFF) {
      const t = M[hl];
      if (t & 0x80 || (t & 0x1F) === 9) continue;
      if (M[hl + 1] !== M[0x8D1F]) continue;
      if (!within(e, (M[hl + 3] - M[hl + 2] + 0x80) & 255, 0x2C)) continue;
      let g = P.record_ground({ hl: hl + 2 }).a & 255;
      if (g > 0x3F) g = 0;
      let a = ((g * 2) & 255) + M[hl + 4];
      a &= 255;
      setw(0x8ED5, a * 4);
      let s = a + M[hl + 2], c = s > 255 ? 1 : 0;
      s = (s & 255) + M[hl + 3]; c += s > 255 ? 1 : 0;
      a = ((c & 1) << 7) | ((s & 255) >> 1);
      const y = (0xC0 - a) & 255;
      if (!within(d, y, 0x22)) continue;
      P.bring_in({ hl: (hl - 1) & 0xFFFF, de: d << 8 | e, bc: b << 8 | y, b, c: y });
    }
    return P.objects_pass({});
  });
  // record_ground ($DCA0): the place at HL (across, then down, in units of four) to $8ED1 and $8ED3
  // in pixels, and the ground cell under it ($90D5); HL left at the down
  P.def(0xDCA0, 'record_ground', r => {
    const hl = r.hl;
    setw(0x8ED1, M[hl] * 4);
    setw(0x8ED3, M[(hl + 1) & 0xFFFF] * 4);
    return Object.assign({}, P.ground_cell({}), { hl: (hl + 1) & 0xFFFF });
  });
  // drop_far_actors ($DCB9): each actor out of this area, or whose place on the screen is not
  // within 44 characters below or 54 right of 13 above and left of the view, is put back ($DE58)
  P.def(0xDCB9, 'drop_far_actors', () => {
    const e = M[0x9633] >= 0x0D ? M[0x9633] - 0x0D : 0;
    const d = M[0x9634] >= 0x0D ? M[0x9634] - 0x0D : 0;
    const near = (lim, v, n) => !(lim >= v) && (Math.min(lim + n, 0xFF) >= v);
    for (let hl = 0x8301; hl < 0x8400; hl += 0x20) {
      if (M[hl] === 0xFF) continue;
      const keep = M[hl + 0x1D] === M[0x8D1F]
        && near(d, P.divide_8({ a: M[hl + 0x15], c: M[hl + 0x16] }).a, 0x2C)
        && near(e, P.divide_8({ a: M[hl + 0x13], c: M[hl + 0x14] }).a, 0x36);
      if (!keep) P.put_back({ hl: hl - 1, de: d << 8 | e });
    }
    return {};
  });
  // bring_in ($DD1C): the record whose bit-7 byte is at HL+1 (its type at HL) made an actor in the
  // first free slot (the leader's character may take slot 0): type, state $80, and if it touches
  // no actor nor box ($9440, $9546) and the ground lets it stand ($90D5: under $77, or $7B and $7D,
  // $7C for types $10 up, or type $14-$17 on any), its state (1 for a character, $F012 for types
  // 4 to 6, or the record's), place, area, speeds by kind ($EAC8), route; otherwise the slot freed
  const kind = t => (t < 4 ? t : t < 0x10 ? 4 : t < 0x14 ? 5 : t < 0x18 ? 6 : t < 0x1C ? 7 : t < 0x20 ? 8
    : t < 0x28 ? 9 : t < 0x2D ? 0x0A : 0x0B);
  P.def(0xDD1C, 'bring_in', r => {
    const T = r.hl & 0xFFFF, X = (T + 1) & 0xFFFF;
    if (M[X] & 0x80) return { zf: false, hl: X };
    let hl = 0x8301, b = 8;
    if ((M[T] & 0x3F) !== M[0x8D0A]) { hl += 0x20; b = 7; }
    while (M[hl] !== 0xFF) {
      hl += 0x20;
      if (!--b) return { hl: X, b: 1, zf: false };
    }
    const iy = hl - 1;
    M[iy] = M[T] & 0x3F;
    M[iy + 1] = 0x80;
    let o = P.actor_collide({ iy, hl: iy + 1 });
    if (o.zf) o = P.box_collide({ iy, hl: iy + 1 });
    let ok = false;
    if (o.zf) {
      let a = P.ground_cell({}).a & 255;
      if (a < 0x77) ok = true;
      else {
        if (a === 0x7C) { a = M[iy]; if (a >= 0x10) ok = true; }
        if (!ok && a === 0x73) { a = M[iy]; if (a >= 0x28) ok = true; }
        if (!ok && (a === 0x7D || a === 0x7B)) ok = true;
        if (!ok && (M[iy] & 0xFC) === 0x14) ok = true;
      }
    }
    if (!ok) { M[iy + 1] = 0xFF; return { zf: false, hl: iy + 1, de: X }; }
    const tp = M[iy];
    let c = M[X];
    if (tp < 7 && c < 7) c = tp < 4 ? 1 : M[0xF012];
    M[X] |= 0x80;
    M[iy + 1] = c & 0x3F;
    P.ldir(0x8ED1, iy + 0x0E, 6);
    let p = (0xEAC8 + ((kind(tp) * 5) & 255)) & 0xFFFF;
    M[iy + 0x1E] = M[0x8D1F];
    M[iy + 0x1F] = M[p++];
    M[iy + 0x19] = M[p++]; M[iy + 0x1A] = M[p++];
    M[iy + 0x07] = M[p++]; M[iy + 0x08] = M[p++];
    P.follow_actor({ hl: iy + 1, iy });
    M[iy + 2] = M[X + 5]; M[iy + 3] = M[X + 6];
    M[iy + 4] = 0; M[iy + 5] = 0xFF; M[iy + 0x0C] = 0x80; M[iy + 0x0D] = 2;
    M[iy + 0x1B] = 0; M[iy + 0x0B] = 0x80;
    if (M[iy] === 0x2D) { M[iy + 1] = 0x40; M[iy + 0x0D] = 0; return { a: 0x2D, zf: true }; }
    if ((M[iy] & 0xFC) === 0x14) M[0x7038] = 0x0A;
    return { a: 0, zf: true };
  });
  // put_back ($DE58): the actor at HL leaving play: its record ($E492) takes its state (bit 6
  // off; one of type 4 up in state 1 is left in state 0), area, place in units of four and route
  // (a character not in state 0 keeps no route); the slot is freed
  const quarter = (from, to, n) => {
    for (; n > 0; n--, from = lo(from, 2), to = (to + 1) & 0xFFFF) M[to] = ((M[lo(from, 1)] << 8 | M[from]) >> 2) & 255;
    return { hl: from, de: to };
  };
  P.def(0xDE58, 'put_back', r => {
    const hl = r.hl, b = M[hl];
    let c = M[lo(hl, 1)];
    if (c === 0xFF) return { zf: true, c: 0 };
    M[lo(hl, 0x18)] = 0;
    let rec = (P.record_of({ a: b }).hl + 1) & 0xFFFF;
    c &= 0xBF;
    if ((c & 0x3F) === 1 && b >= 4) c = 0;
    M[rec] = c;
    M[rec + 1] = M[lo(hl, 0x1E)];
    rec = quarter(lo(hl, 0x0E), rec + 2, 2).de + 1;
    const st = M[lo(hl, 1)];
    M[lo(hl, 1)] = 0xFF;
    if ((b & 0x3F) < 4 && st) { M[rec] = 0; return { a: 0, zf: true }; }
    M[rec] = M[lo(hl, 2)]; M[rec + 1] = M[lo(hl, 3)];
    return { hl: lo(hl, 4), de: rec + 2 };
  });
  // leader_place ($DEB5): the leader's place in units of four to $DB05; $DEBD the actor's at HL
  // to $DB08
  P.def(0xDEB5, 'leader_place', () => Object.assign(quarter(0x830E, 0xDB05, 3), { b: 0 }));
  P.def(0xDEBD, 'leader_place_debd', r => Object.assign(quarter(lo(r.hl, 0x0E), 0xDB08, 3), { b: 0 }));

  // --- the actors' states ---
  // actors_pass ($DED5): the alarms ($F02C), the leader's place, then each actor not held (bit 6
  // of +1): the leader too when he is not being steered (state 3 up, or 2 up after 65 passes
  // without input): its place to $DB08, its mind ($F116), its state ($DF24) and needs ($D70A)
  P.def(0xDED5, 'actors_pass', () => {
    P.alarm_pass({});
    P.leader_place({});
    M[0xEAC7] = M[0x8D1F];
    let hl = 0x8320, b = 7, c = 3;
    if (M[0x8D1B] === 0xFF) c = 2;
    if ((M[0x8301] & 0x0F) >= c) { hl = 0x8300; b = 8; }
    for (; b > 0; b--, hl += 0x20) {
      if (M[hl + 1] & 0x40) continue;
      const q = { hl, iy: hl, b, c, bc: b << 8 | c };
      const de = P.leader_place_debd({ hl }).de;
      P.actor_ai(Object.assign({}, q, { de }));
      P.actor_step(q);
      P.needs_check(q);
    }
    return {};
  });
  // the action A for the actor at IY, marked to start (bit 7) when it changes ($DF7E)
  const setAction = (iy, a) => {
    if (a === M[iy + 0x0C]) return { a, zf: true };
    M[iy + 0x0C] = a | 0x80;
    return { a: a | 0x80, zf: false };
  };
  // actor_step ($DF24): when the countdown (+4) has run out, the routine for the state (+1, low
  // nibble) from the table at $DF46, HL at +1
  P.def(0xDF24, 'actor_step', r => {
    const iy = r.iy;
    if (M[iy + 4] & 0x0F) {
      M[iy + 4] = (M[iy + 4] - 1) & 255;
      if (M[iy + 4]) return { zf: false };
    }
    const hl = lo(r.hl, 1);
    if (M[hl] === 0xFF) return { a: 0xFF, zf: true };
    const a = ((M[hl] & 0x0F) * 2) & 255, t = (0xDF46 + a) & 0xFFFF;
    const fn = M[t] | M[(t + 1) & 0xFFFF] << 8;
    return P.jump(fn, { hl, de: (t + 1) & 0xFFFF, bc: fn, b: fn >> 8, c: fn & 255, a: (0x46 + a) & 255, iy });
  });
  // state_die ($DF5A, 8): held ($48), action $0B
  P.def(0xDF5A, 'state_die', r => { M[r.hl] = 0x48; return setAction(r.iy, 0x0B); });
  // state_route ($DF60, 0): the route in +2 and +3 walked towards its next point, the next once
  // there; at its end turned round ($E449), or for types $28 up the route ended ($F0A3)
  P.def(0xDF60, 'state_route', r => {
    const iy = r.iy, hl = lo(r.hl, 1);
    if (!M[hl]) return setAction(iy, 0);
    const o = routePoint(hl);
    if (!((o.a + 1) & 255)) {
      const q = Object.assign({}, o, { a: M[iy], iy });
      return M[iy] < 0x28 ? P.turn_round(q) : P.route_ended(q);
    }
    const a = walk((o.hl + 1) & 0xFFFF, o.de, iy);
    if (!a) P.next_point({ iy, a });
    return setAction(iy, a);
  });
  // state_stand ($DF88, 9): action 0
  P.def(0xDF88, 'state_stand', r => setAction(r.iy, 0));
  // state_follow ($DF8B, 1): follows the leader: towards him on ground $7B, when more than 5 units
  // away either way, or for one not of the party, after looking for a step near him when the
  // height between them is two or more ($E04E); near him, while he walks, a character stands one
  // pass in eight; while he rests, sits down (one in eight, or fewer in the evening, $BF2E 5), or
  // stands up one pass in 16
  const toLeader = (de, iy) => {
    M[0xDAFF] = M[0x8D1F];
    setw(0xDB00, w(0xDB05));
    return toPoint(lo(de, 2), iy);
  };
  const toPoint = (de, iy) => {
    let c = walk(0xDB00, de, iy);
    if ((M[0x830D] & 0xFC) === 4 && c) c += 5;
    return setAction(iy, c);
  };
  const restOrStand = (act, c) => {
    const a = P.random({}).a & c ? 0 : 0x0A;
    M[act] = a;
    return { a };
  };
  const stepRound = (de, c, iy) => {
    let a = (M[0xDB0A] >> 1) + 1;
    if (!(c & 0x80)) a = (a - 2) & 255;
    const o = P.find_cell_near({ a });
    if (!o.zf) return null;
    M[0xDB00] = (o.l * 4 + M[0xDB05]) & 255;
    M[0xDB01] = (o.h * 4 + M[0xDB06]) & 255;
    return toPoint(lo(de, 2), iy);
  };
  P.def(0xDF8B, 'state_follow', r => {
    const de = r.hl, iy = r.iy;
    if (M[0x8ED0] === 0x7B) return toLeader(de, iy);
    if (far(M[0xDB0A], M[0xDB07]) >= 2) {
      const o = stepRound(de, (M[0xDB0A] - M[0xDB07]) & 255, iy);
      if (o) return o;
    }
    if (far(M[0xDB05], M[0xDB08]) >= 6 || far(M[0xDB06], M[0xDB09]) >= 6) return toLeader(de, iy);
    const t = M[lo(de, -1)] & 0x3F;
    if (t >= 4) return toLeader(de, iy);
    if ((M[0x830D] & 0xFC) !== 8) {
      M[0xED5E] = 0;
      if (P.random({}).a & 7) return toLeader(de, iy);
      M[iy + 0x0C] = 0;
      return { a: 0, zf: true };
    }
    const act = lo(de, 0x0B);
    if ((M[lo(de, 0x0C)] & 0xFC) !== 8) return restOrStand(act, 7);
    if ((M[0xBF2E] & 0x1F) === 5) {
      if (M[act] === 0x0A) return { a: 0x0A, zf: true };
      let a = 7;
      for (let b = (4 - t) & 255 || 256; b > 0; b--) a = ((a << 1) | 1) & 255;
      return restOrStand(act, a);
    }
    M[0xED5E] = 0;
    if (P.random({}).a & 0x0F) return { zf: false };
    M[act] = 0;
    return { a: 0, zf: true };
  });
  // walk_to_leader ($E023): towards the leader's place ($E115), running when he wades; $E033
  // towards $DB00 from DE at +3
  P.def(0xE023, 'walk_to_leader', r => toLeader(r.de, r.iy));
  P.def(0xE033, 'walk_to_leader_e033', r => toPoint(r.de, r.iy));
  // step_round ($E04E): a step near the leader ($95C0) to walk to; found, the CALL's return is
  // dropped and the walk ends the state
  P.def(0xE04E, 'step_round', r => {
    const o = stepRound(r.de, r.c, r.iy);
    return o || { zf: false, de: r.de };
  });
  // state_fixed ($E07A, 7): the action in +6
  P.def(0xE07A, 'state_fixed', r => setAction(r.iy, M[lo(r.hl, 5)]));
  // state_fetch ($E082, 3): walks to the object in +6 ($F83E) while it lies on the ground (bit 7
  // of its owner byte), else back to following; within 3 units it is taken: owner $20 plus the
  // type, the state 1 for a character, and while an object is being fetched for the menu ($C898)
  // into a free slot of its four ($CCB7), owner $24
  P.def(0xE082, 'state_fetch', r => {
    const hl = r.hl, iy = r.iy;
    let rec = (P.object_record({ a: M[lo(hl, 5)] }).hl + 1) & 0xFFFF;
    if (!(M[rec] & 0x80)) { M[hl] = 1; return setAction(iy, 0); }
    M[0xDAFF] = M[rec] & 0x0F;
    M[0xDB00] = M[rec + 1]; M[0xDB01] = M[rec + 2];
    let a = 0;
    if (far(M[0xDB08], M[0xDB00]) >= 3 || far(M[0xDB09], M[0xDB01]) >= 3) a = walk(0xDB00, lo(hl, 2), iy);
    if (a) return setAction(iy, a);
    const t = M[lo(hl, -1)];
    M[hl] = t < 4 ? 1 : 0;
    M[iy + 0x0C] = 0x80;
    const c = M[iy + 6];
    const own = (P.object_record({ a: c }).hl + 1) & 0xFFFF;
    M[own] = (t & 7) | 0x20;
    const f = M[0xC898] & 3;
    if (!f) return { zf: true };
    M[0xC898] = f & 0xFE;
    const o = P.four_clear({ c });
    if (!o.zf) return o;
    M[o.hl] = c;
    M[own] = 0x24;
    return { a: 0x24 };
  });
  // next_point ($E106): the route's index (+3) on, or back when bit 7 of +2 is set
  P.def(0xE106, 'next_point', r => {
    const hl = lo(r.iy, 3);
    if (M[lo(r.iy, 2)] & 0x80) { M[hl] = (M[hl] - 1) & 255; return { a: 0, zf: true, hl }; }
    M[hl] = (M[hl] + 1) & 255;
    return { a: r.a, zf: !M[hl], hl };
  });
  // walk_towards ($E115): the walk (1 to 4) taking the actor whose across is at DE+$0B towards the
  // point at HL (units of four), across and down in turn (bit 5 of +$18); 0 within 2 units
  // axis_walk ($E14C): one axis, B beyond the point, C short of it (into the LD BC at $E15E)
  const axis = (hl, de, b, c) => {
    M[0xE15F] = c; M[0xE160] = b;
    const v = ((M[de] | M[lo(de, 1)] << 8) - M[hl] * 4) & 0xFFFF;
    if (!v) return 0;
    if (v & 0x8000) return v >= 0xFFFE ? 0 : M[0xE15F];
    return v < 3 ? 0 : M[0xE160];
  };
  const walk = (hl, de, iy) => {
    de = lo(de, 0x0B);
    if (!(M[iy + 0x18] & 0x20)) {
      const a = axis(hl, de, 3, 1);
      if (a) return a;
      M[iy + 0x18] |= 0x20;
      return axis((hl + 1) & 0xFFFF, lo(de, 2), 4, 2);
    }
    const a = axis((hl + 1) & 0xFFFF, lo(de, 2), 4, 2);
    if (a) return a;
    M[iy + 0x18] &= 0xDF;
    return axis(hl, de, 3, 1);
  };
  P.def(0xE115, 'walk_towards', r => { const a = walk(r.hl, r.de, r.iy); return { a, zf: !a }; });
  P.def(0xE14C, 'axis_walk', r => { const a = axis(r.hl, r.de, r.b, r.c); return { a, zf: !a, hl: r.hl, de: r.de }; });

  // --- the records out of play ---
  // move_records ($E187): once a pass the next of the 46 records ($EAC6) not in play: in states
  // 0 to 7 it walks its route ($E399) a step at a time ($E458) and across the edges of areas
  // ($E316), turned round at the end (records $28 up take their place from $ECC9 and stop); in
  // state 1, with no route, it walks to the leader when near him in his area ($E2B4), else takes
  // the nearest route ($E24E). Record 3 stops at the fourth point of route 1.
  P.def(0xE187, 'move_records', () => {
    let n = (M[0xEAC6] + 1) & 255;
    if (n === 0x2E) n = 0;
    M[0xEAC6] = n;
    let hl = (P.record_of({ a: n }).hl + 1) & 0xFFFF;
    const c = M[hl];
    if (c & 0x80) return { zf: false };
    hl++;
    M[0xEAC7] = M[hl];
    if ((c & 0x0F) === 1) {
      const area = M[hl];
      hl = (hl + 4) & 0xFFFF;
      if (M[hl]) return walkRoute(hl);
      if (M[0x8D1F] === area && P.near_leader({ hl }).zf) {
        M[0xDB02] = M[0x8D1F];
        setw(0xDB03, w(0xDB05));
        const o = pointIn(0xDB02, (hl + 1) & 0xFFFF);
        return stepOn(o.hl, o.de);
      }
      const o = P.nearest_route({ hl });
      M[hl] = o.de >> 8; M[hl + 1] = o.de & 255;
      return walkRoute(hl);
    }
    if ((c & 0x0F) >= 8) return {};
    return walkRoute((hl + 4) & 0xFFFF);
  });
  const walkRoute = hl => {
    if (M[0xEAC6] === 3 && M[hl] === 1 && M[hl + 1] === 4) M[hl] = 0;
    if (!M[hl]) return { a: 0, zf: true };
    const o = routePoint(hl);
    if ((o.a + 1) & 255) return stepOn(o.hl, o.de);
    if (M[0xEAC6] < 0x28) return P.turn_round(o);
    const s = (0xECC9 + (((M[0xEAC6] - 0x28) * 3) & 255)) & 0xFFFF;
    M[o.de] = 0;
    return P.ldir(s, (o.de - 5) & 0xFFFF, 3);
  };
  // the record's place (DE at its route index) a step towards the point after HL, across the edges
  const stepOn = (hl, de) => {
    const s = P.step_record({ hl: (hl + 1) & 0xFFFF, de: (de - 4) & 0xFFFF });
    edges((s.de - 1) & 0xFFFF);
    if (s.c) return { a: s.c, zf: false };
    const p = (s.de + 1) & 0xFFFF;
    if (M[p] & 0x80) M[p + 1] = (M[p + 1] - 1) & 255;
    else M[p + 1] = (M[p + 1] + 1) & 255;
    return {};
  };
  // edge_east ($E2D2) and record_edges ($E316): the record whose down is at DE crossed into the next
  // area when its place on the screen passes an edge: across 128 plus down less across, the edges
  // by whether the record is in the leader's area, the next to the east, or another; down 192 less
  // half the sum of across, down and height, the edges by the leader's area, the next to the
  // south, or another. Across moves it $72 units ($E375, $E37A), down $6C ($E36B, $E370).
  const across = (way, hl, x) => {
    let bc = 0;
    if (way === 0) { if (hl & 0x8000) bc = 0xFF8E; else if (hl >> 8) bc = 0x0172; }
    else if (way === 1) { if ((hl & 255) < 0x1C) bc = 0xFF8E; else if ((hl & 255) >= 0xE4) bc = 0x0172; }
    else if (hl & 0x8000) bc = 0xFF8E; else if ((hl & 255) >= 0xE5) bc = 0x0172;
    if (!bc) return;
    addTo((x - 1) & 0xFFFF, bc >> 8); addTo(x, bc & 255); subFrom((x + 1) & 0xFFFF, bc & 255);
  };
  const down = x => {
    const de0 = (x + 1) & 0xFFFF;
    const hl = (0xC0 - ((M[x] + M[de0] + M[(de0 + 1) & 0xFFFF]) >> 1)) & 0xFFFF;
    const lead = M[0x8D1F], rec = M[0xEAC7];
    let bc = 0;
    if (rec === lead) { if (hl & 0x8000) bc = 0xFC94; else if (hl & 0x80) bc = 0x046C; }
    else if (((rec - 4) & 255) === lead) { if ((hl & 255) < 0x14) bc = 0xFC94; else if ((hl & 255) >= 0x6D) bc = 0x046C; }
    else if (hl & 0x8000) bc = 0xFC94; else if ((hl & 255) >= 0x6D) bc = 0x046C;
    if (!bc) return {};
    addTo(de0, bc & 255); addTo(x, bc & 255); addTo((x - 1) & 0xFFFF, bc >> 8);
    return {};
  };
  const edges = de0 => {
    const x = (de0 - 1) & 0xFFFF;
    const hl = (0x80 + M[de0] - M[x]) & 0xFFFF;
    const lead = M[0x8D1F], rec = M[0xEAC7];
    across(rec === lead ? 0 : ((rec - 1) & 255) === lead ? 1 : 2, hl, x);
    return down(x);
  };
  P.def(0xE316, 'record_edges', r => edges(r.de));
  // entered from record_edges with DE at the across (and pushed): the leader's area's edges
  P.def(0xE2D2, 'edge_east', r => { across(0, r.hl, r.de); return down(r.de); });
  // $E36B and $E370 (an object carried, $F72A): the down at DE-1 and the across at DE-2 moved by
  // C, the area at DE-3 by B (four areas back or on); $E375 and $E37A: the area at DE-1 by B (one
  // back or on), the across at DE by C and the down at DE+1 by -C
  const move4 = (de, bc) => {
    for (let k = 0; k < 2; k++) { de = (de - 1) & 0xFFFF; M[de] = (M[de] + (bc & 255)) & 255; }
    de = (de - 1) & 0xFFFF; M[de] = (M[de] + (bc >> 8)) & 255;
    return { a: M[de], de, bc };
  };
  const move1 = (de, bc) => {
    const p = (de - 1) & 0xFFFF, q = (de + 1) & 0xFFFF;
    M[p] = (M[p] + (bc >> 8)) & 255;
    M[de] = (M[de] + (bc & 255)) & 255;
    M[q] = (M[q] - (bc & 255)) & 255;
    return { a: M[q], de: q, bc };
  };
  P.def(0xE36B, 'record_edges_e36b', r => move4(r.de, 0xFC94));
  P.def(0xE370, 'record_edges_e370', r => move4(r.de, 0x046C));
  P.def(0xE375, 'record_edges_e375', r => move1(r.de, 0xFF8E));
  P.def(0xE37A, 'record_edges_e37a', r => move1(r.de, 0x0172));

  // route_point ($E399): the point of the route whose number is at HL and index after it (from
  // $ED68: first point, count; $EDB0: area, across, down): A $FF past the end; in another area
  // than $EAC7 it is copied to $DAFF and moved into that area's frame, across and down clamped to
  // 0 or $FF ($E3BB), HL at it, A 0
  const routePoint = hl0 => {
    let de = hl0;
    let t = (0xED68 + ((M[de] * 2) & 255)) & 0xFFFF;
    let c = M[t];
    t = (t + 1) & 0xFFFF;
    de = (de + 1) & 0xFFFF;
    const a = M[de];
    if (a === 0xFF) return { a, zf: true, de, hl: t, c };
    if (a >= M[t]) return { a: 0xFF, zf: false, de, hl: t, c };
    c = (a + c) & 255;
    return pointIn(0xEDB0 + 3 * c, de);
  };
  const pointIn = (hl, de) => {
    if (M[0xEAC7] === M[hl]) return { a: M[hl], zf: true, hl, de };
    const area = M[hl];
    P.ldir(hl, 0xDAFF, 3);
    let e = 0, d = 0;
    const ra = M[0xEAC7] & 3, pa = area & 3;
    if (ra !== pa) {
      if (ra < pa) { e = (e - subFrom(0xDB00, 0x72)) & 255; d = (d + addTo(0xDB01, 0x72)) & 255; }
      else { e = (e + addTo(0xDB00, 0x72)) & 255; d = (d - subFrom(0xDB01, 0x72)) & 255; }
    }
    const rd = M[0xEAC7] & 0x0C, pd = M[0xDAFF] & 0x0C;
    if (rd !== pd) {
      if (rd < pd) { e = (e - subFrom(0xDB00, 0x6C)) & 255; d = (d - subFrom(0xDB01, 0x6C)) & 255; }
      else { e = (e + addTo(0xDB00, 0x6C)) & 255; d = (d + addTo(0xDB01, 0x6C)) & 255; }
    }
    if (e & 0x80) M[0xDB00] = 0; else if (e) M[0xDB00] = 0xFF;
    if (d & 0x80) M[0xDB01] = 0; else if (d) M[0xDB01] = 0xFF;
    return { a: 0, zf: true, hl: 0xDAFF, de };
  };
  P.def(0xE399, 'route_point', r => routePoint(r.hl));
  P.def(0xE3BB, 'route_point_e3bb', r => pointIn(r.hl, r.de));
  // turn_round ($E449): the route at DE-1 turned round: bit 7 flipped, the index stepped back
  P.def(0xE449, 'turn_round', r => {
    const hl = (r.de - 1) & 0xFFFF;
    const a = M[hl] ^ 0x80;
    M[hl] = a;
    const i = (hl + 1) & 0xFFFF;
    M[i] = (M[i] + (a & 0x80 ? 255 : 1)) & 255;
    return { a, hl: i, de: r.hl, zf: !M[i] };
  });
  // step_record ($E458): the place at DE up to 4 units across and down towards the point at HL;
  // C the axes it moved (A is 0)
  P.def(0xE458, 'step_record', r => {
    let hl = r.hl, de = r.de, c = 0;
    for (let b = 2; b > 0; b--) {
      const a = M[de] - M[hl];
      if (a) {
        M[de] = (M[de] + (a > 0 ? -Math.min(a, 4) : Math.min(-a, 4))) & 255;
        c++;
      }
      hl = (hl + 1) & 0xFFFF; de = (de + 1) & 0xFFFF;
    }
    return { a: 0, zf: true, b: 0, c, bc: c, hl, de };
  });
  // random ($E481): the next byte of bank 3, the pointer at $E490 stepping round $C000-$FFFF
  P.def(0xE481, 'random', () => {
    const p = ((w(0xE490) + 1) & 0xFFFF) | 0xC000;
    setw(0xE490, p);
    return { a: M[p] };
  });
  // record_of ($E492): HL the record of number A at $EB05, 8 bytes each
  P.def(0xE492, 'record_of', r => {
    let a = (r.a * 4) & 255, h = 0xEB;
    if (a & 0x80) h++;
    a = (a * 2) & 255;
    const l = a + 5;
    if (l > 255) h++;
    return { hl: (h << 8 | (l & 255)) & 0xFFFF, a: l & 255, cf: l > 255 };
  });

  // nearest_route ($E24E): the point of routes 1 to 4 (two bytes each from $ED6A: the first point,
  // the count; three bytes a point at $EDB0: area, across, down) in area A nearest a place across
  // and down at HL+1 and HL+2, by the sum of the distances under 256: D the route, E the point (0
  // when none). Entered at $E24E, the area is at HL-4 and the place three on.
  const nearest = (area, hl) => {
    M[0xE280] = M[(hl + 1) & 0xFFFF];
    M[0xE28B] = M[(hl + 2) & 0xFFFF];
    let best = 0xFF, d = 0, e = 0;
    for (let route = 1, rt = 0xED6A; route < 5; route++, rt += 2) {
      let c = M[rt], n = M[rt + 1], i = 0;
      do {
        const p = 0xEDB0 + 3 * c;
        if (M[p] === area) {
          const dx = Math.abs(M[p + 1] - M[0xE280]), dy = Math.abs(M[p + 2] - M[0xE28B]);
          if (dx + dy < best) { best = dx + dy; d = route; e = i; }
        }
        i = (i + 1) & 255; c = (c + 1) & 255; n = (n - 1) & 255;
      } while (n);
    }
    return { de: d << 8 | e, d, e, bc: 0x0500, b: 5, c: 0, l: best, a: 5, zf: true };
  };
  P.def(0xE24E, 'nearest_route', r => {
    const hl = (r.hl - 4) & 0xFFFF;
    return nearest(M[hl], hl);
  });
  P.def(0xE253, 'nearest_route_e253', r => nearest(r.a & 255, r.hl));

  // near_leader ($E2B4): Z when the record whose +6 is at HL is within 48 of the leader's place
  // ($DB05 across, $DB06 down) both ways
  P.def(0xE2B4, 'near_leader', r => {
    let hl = (r.hl - 2) & 0xFFFF;
    let a = Math.abs(M[0xDB06] - M[hl]);
    if (a < 0x30) {
      hl = (hl - 1) & 0xFFFF;
      a = Math.abs(M[0xDB05] - M[hl]);
      if (a < 0x30) a = 0;
    }
    return { a, zf: !a, cf: false, hl };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
