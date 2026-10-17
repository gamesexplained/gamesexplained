// The creatures' minds and the party's watchfulness (bank 3, $F02C-$F615): the alarm when a
// hostile type comes near, looking round for a target and turning to it or firing, the grabbers
// that seize one of the party and carry it off or drag it into the ground, and a new leader
// picked from the third menu.
//
// $F00D is the direction being looked in, $F00E the distance to the nearest target found ($FF for
// none), $F00F its address and $F011 its slot's low byte ($FF for a box). An actor's +5 is the
// slot of the victim it holds ($FF for none); a victim's +5 counts down to its death.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.ai = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const wl = a => M[a] | M[lo(a, 1)] << 8;

  // --- the alarm ---
  // alarm_pass ($F02C): when an actor in slots 1 to 7, not held, is of a type whose byte at $EFED
  // (type / 4) has bit 1, $ED5E is cleared and everyone below state 3 who is not a creature of
  // types $10-$17 or $1C up is set to state 2 (gather round the leader); otherwise, once, to state
  // 1 (follow), types 4 to 7 to $F012's. $F013 holds which was last done.
  P.def(0xF02C, 'alarm_pass', () => {
    let hostile = false;
    for (let hl = 0x8321; hl < 0x8400; hl += 0x20) {
      if (M[hl] & 0x40) continue;
      if (M[0xEFED + ((M[hl - 1] >> 2) & 0x1F)] & 2) { hostile = true; break; }
    }
    let d, e;
    if (hostile) { M[0xED5E] = 0; d = 2; e = 2; M[0xF013] = 2; }
    else {
      d = M[0xF012]; e = 1;
      if (M[0xF013] === 1) return { a: 1, zf: true };
      M[0xF013] = 1;
    }
    for (let hl = 0x8300; hl < 0x8400; hl += 0x20) {
      const c = M[hl], t = c & 0x3C;
      if (t >= 0x1C || (t >= 0x10 && t < 0x18)) continue;
      if (M[hl + 1] >= 3) continue;
      M[hl + 1] = e;
      if (c >= 4 && c < 8) M[hl + 1] = d;
    }
    return {};
  });

  // --- the ends of routes, and gathering ---
  // route_ended ($F0A3, also event 3): the record of the actor at IY leaves play (state 0) at the
  // place kept for its type ($EC75, three bytes from type less 4, less 8 more for $18 up), with
  // +5 and +7 cleared; the slot is freed
  P.def(0xF0A3, 'route_ended', r => {
    const iy = r.iy;
    const rec = P.record_of({ a: M[iy] & 0x7F }).hl;
    let a = M[rec] & 0x3F;
    M[(rec + 1) & 0xFFFF] = 0;
    if (a >= 0x18) a -= 8;
    a = (a - 4) & 255;
    P.ldir((0xEC75 + 3 * a) & 0xFFFF, (rec + 2) & 0xFFFF, 3);
    M[(rec + 5) & 0xFFFF] = 0; M[(rec + 7) & 0xFFFF] = 0;
    M[iy + 1] = 0xFF;
    return { a: 0 };
  });
  // state_gather ($F0D3, state 2): walks to one of eight places around the leader ($DB05; around
  // $F00B for the leader's own character), which changes every 16 passes; the action is the walk's
  // direction plus 5, or 0 when there
  P.def(0xF0D3, 'state_gather', r => {
    const iy = r.iy, hl = lo(r.hl, -1);
    const bc = M[0x8D0A] === M[hl] ? w(0xF00B) : w(0xDB05);
    const t = 0xEFFB + (((((M[0x8D1C] >> 4) & 0x0F) + M[hl]) & 7) * 2);
    M[0xDB00] = ((bc & 255) + M[t]) & 255;
    M[0xDB01] = ((bc >> 8) + M[t + 1]) & 255;
    let a = P.walk_towards({ hl: 0xDB00, de: lo(hl, 3), iy }).a & 255;
    if (a) a = (a + 5) & 255;
    M[iy + 0x0C] = a;
    return { a };
  });

  // --- each actor's mind ---
  // actor_ai ($F116): for an actor below state 8 and type $28 (its type's bit 7 set while it is
  // worked on): grabbers ($18-$27), chasers ($14-$17) and types $10-$13 have minds of their own;
  // the rest, in state 2 or more and with a shot free ($C735), look round and turn to a target
  P.def(0xF116, 'actor_ai', r => {
    const hl = r.hl, iy = r.iy;
    if (M[lo(hl, 1)] >= 8) return {};
    const a = M[hl];
    if (a >= 0x28) return {};
    M[hl] |= 0x80;
    const q = Object.assign({}, r, { a });
    if (a >= 0x18) return P.grabber_ai(q);
    if (a >= 0x14) return P.type_14_ai(q);
    if (a >= 0x10) return P.type_10_ai(q);
    if (M[lo(hl, 1)] >= 2 && P.can_fire(Object.assign({}, r, { a: M[hl] & 0x3F })).zf) {
      if (!P.look_round({ hl, iy }).zf) P.face_target({ iy });
    }
    M[iy] &= 0x7F;
    return {};
  });
  // grabber_ai ($F14A): types $18 to $27. On odd frames, a sound on channel A ($7006): $0F for
  // $18-$1B, 5 every fourth pass for the rest (the test for $A0 up compares the $0F). Holding no victim, it looks round and seizes ($F232),
  // and once its reach is over walks on in the direction it looked. Holding one, the victim is
  // held and moved with it ($F014 for $1C up, $F01C below, by its direction); the leader held is
  // followed ($8D17); when the victim's count runs out it dies (state $48, action $8B)
  P.def(0xF14A, 'grabber_ai', r => {
    const iy = r.iy, hl = r.hl;
    if (M[iy + 0x0B] & 1) {
      const a = M[hl];
      if (a < 0x9C) M[0x7006] = 0x0F;
      else if (!(M[0x8D1C] & 3)) M[0x7006] = 5;
    }
    if (M[iy + 5] === 0xFF) {
      if (!P.look_round({ hl, iy }).zf) P.seize({ iy });
      M[iy] &= 0x7F;
      if ((M[iy + 0x0C] & 0x7F) !== 5) return {};
      M[iy + 0x0C] = ((M[0xF00D] & 3) + 1) & 255;
      return {};
    }
    M[hl] &= 0x7F;
    const h = P.hold_victim({ hl: lo(hl, 0x0B), iy });
    const o = P.move_with({ hl: (M[iy] & 0x3F) < 0x1C ? 0xF01C : 0xF014, de: lo(h.de, -6), iy });
    const v = lo(o.hl, -0x17);
    if (M[0x8D0A] === M[v]) M[0x8D17] = M[iy + 0x0D];
    const n = lo(v, 5);
    M[n] = (M[n] - 1) & 255;
    if (M[n]) return {};
    M[lo(v, 1)] = 0x48;
    M[lo(v, 0x0C)] = 0x8B;
    M[iy + 5] = 0xFF;
    M[0x8D17] = 0xFF;
    return P.project({ hl: lo(v, 0x0E), a: 0xFF });
  });
  // type_10_ai ($F1D6): types $10 to $13: the type's sink count ($9613) is cleared unless the
  // action is 5; they look round and seize; reaching (action 6 up), a sound on channel C ($701F)
  // every eighth pass
  P.def(0xF1D6, 'type_10_ai', r => {
    const iy = r.iy, hl = r.hl;
    if ((M[iy + 0x0C] & 0x7F) !== 5) M[P.type_byte({ a: M[hl] & 0x7F }).bc] = 0;
    let o = P.look_round({ hl, iy });
    if (!o.zf) o = P.seize({ iy });
    M[iy] &= 0x7F;
    if ((o.a & 0x7F) < 6 || M[0x8D1C] & 7) return {};
    M[0x701F] = 0x12;
    return {};
  });
  // type_14_ai ($F202): types $14 to $17, which chase: in action 5 they keep it (+4 = 5);
  // otherwise they look ahead only and seize, with sound $0B on channel C ($7038) when they reach;
  // their height (+$12) is kept at $20 or more
  P.def(0xF202, 'type_14_ai', r => {
    const iy = r.iy, hl = r.hl;
    if (M[iy + 0x0C] === 5) { M[hl] &= 0x7F; M[iy + 4] = 5; return {}; }
    let o = P.look_round_f341({ hl, iy, b: 1, c: r.c });
    if (!o.zf) o = P.seize({ iy });
    if ((o.a & 0x7F) === 5) M[0x7038] = 0x0B;
    M[iy] &= 0x7F;
    if (M[iy + 0x12] < 0x20) M[iy + 0x12] = 0x20;
    return {};
  });
  // seize ($F232): the target ($F00F) within 3 units across and down of this actor ($DB08 against
  // its place over four, $FAEB) becomes the victim: its slot in +5, its own +5 the count to its
  // death ($0C), and the action 5; otherwise the action is to reach in the direction looked (6-9)
  P.def(0xF232, 'seize', r => {
    const iy = r.iy, t = w(0xF00F);
    P.coarse_place({ hl: lo(t, 0x0E) });
    let near = true;
    for (let k = 0; k < 2; k++) if (Math.abs(M[0xDB08 + k] - M[0xA03A + k]) >= 3) { near = false; break; }
    if (near) {
      M[iy + 5] = t & 255;
      M[lo(t, 5)] = 0x0C;
      return setAction(iy, 5);
    }
    return setAction(iy, ((M[0xF00D] & 3) + 6) & 255);
  });
  // coarse_place ($FAEB): the three words at HL (across, down, height) over four, into $A03A-$A03C
  P.def(0xFAEB, 'coarse_place', r => {
    let hl = r.hl, a = 0, c = 0;
    for (let k = 0; k < 3; k++, hl = (hl + 2) & 0xFFFF) {
      c = M[(hl + 1) & 0xFFFF];
      a = ((M[hl] | c << 8) >> 2) & 255;
      M[0xA03A + k] = a;
    }
    return { a, b: 0, c: c >> 2, de: 0xA03D, hl };
  });

  // --- carried off, dragged down ---
  // carry_flight ($F26E, event 6): a victim carried off; the leader carried makes the view follow
  // ($8D1B cleared, $8D16 the direction). While the carrier's height is above $C0 it flies on
  // (sound $0B on channel C, the action its direction plus 1); then the victim is dropped ($F2A8)
  P.def(0xF26E, 'carry_flight', r => {
    const iy = r.iy, v = 0x8300 | M[iy + 5];
    if (M[0x8D0A] === M[v]) { M[0x8D1B] = 0; M[0x8D16] = M[iy + 0x0D] & 3; }
    const h = P.hold_victim({ hl: r.hl, iy });
    const at = lo(h.hl, -2);
    if (M[at] <= 0xC0) return P.drop_victim({ de: h.de, iy });
    M[0x7038] = 0x0B;
    M[iy + 0x0C] = ((M[iy + 0x0D] & 3) + 1) & 255;
    M[0x8D16] = 0xFF;
    return { a: 0xFF };
  });
  // drop_victim ($F2A8): the victim (DE at its +$14) is put down beside the carrier ($F024 by
  // direction) and dies (state $48, action $8B)
  P.def(0xF2A8, 'drop_victim', r => {
    const o = P.move_with({ hl: 0xF024, de: lo(r.de, -6), iy: r.iy });
    M[lo(o.hl, -0x0B)] = 0x8B;
    M[lo(o.hl, -0x16)] = 0x48;
    return {};
  });
  // move_with ($F2BE): the pair at HL for the actor's direction (+$0D) added, each signed, to the
  // across and down words at DE, and the place projected ($C362)
  P.def(0xF2BE, 'move_with', r => {
    const t = (r.hl + (M[r.iy + 0x0D] & 3) * 2) & 0xFFFF, at = r.de;
    const sx = M[t], sy = M[(t + 1) & 0xFFFF];
    const x = (wl(at) + (sx & 0x80 ? sx - 256 : sx)) & 0xFFFF;
    M[lo(at, 1)] = x >> 8; M[at] = x & 255;
    const y = (wl(lo(at, 2)) + (sy & 0x80 ? sy - 256 : sy)) & 0xFFFF;
    M[lo(at, 3)] = y >> 8; M[lo(at, 2)] = y & 255;
    return P.project({ hl: at, a: sy });
  });
  // sink ($F2F5, event 4): while holding a victim, the grabber's and the victim's sink counts
  // ($9613) go up by 3, the grabber's to at most 12: both sink into the ground
  P.def(0xF2F5, 'sink', r => {
    const iy = r.iy;
    if (M[iy + 5] === 0xFF) return { a: 0, zf: true };
    P.hold_victim({ hl: r.hl, iy });
    let bc = P.type_byte({ a: M[iy] & 0x7F }).bc;
    let a = (M[bc] + 3) & 255;
    if (a >= 0x0C) a = 0x0C;
    M[bc] = a;
    bc = P.type_byte({ a: M[0x8300 | M[iy + 5]] }).bc;
    M[bc] = (M[bc] + 3) & 255;
    return {};
  });
  // hold_victim ($F31D): the victim (slot +5) says HELP (message 14), is marked held (bit 6 of +1),
  // its action $80, and takes the holder's place across, down and height (from HL+3)
  P.def(0xF31D, 'hold_victim', r => {
    const v = 0x8300 | M[r.iy + 5];
    P.queue_message({ b: 0x0E, c: M[v] });
    M[lo(v, 1)] |= 0x40;
    M[lo(v, 0x0C)] = 0x80;
    const o = P.ldir(lo(r.hl, 3), lo(v, 0x0E), 6);
    return { hl: o.hl, de: o.de, bc: 0 };
  });

  // --- looking for a target ---
  // look_round ($F33E): looks in all four directions, the one faced first (+$0D), then the
  // opposite, then the two others; $F341 with B 1 looks ahead only. NZ when a target is found
  // that $F4C0 accepts, the direction in $F00D
  const lookRound = (hl, iy, b, c) => {
    const at = lo(hl, 0x0D);
    let a = M[at] & 3;
    do {
      M[0xF00D] = a;
      P.look_one_way({ a, hl: at, iy });
      if (M[0xF00E] !== 0xFF) {
        const t = P.will_target({ iy });
        if (!t.zf) return { a: t.a, zf: false };
      }
      c ^= 3;
      a = M[0xF00D] ^ c;
      b = (b - 1) & 255;
    } while (b);
    return { a: 0, zf: true };
  };
  P.def(0xF33E, 'look_round', r => lookRound(r.hl, r.iy, 4, 1));
  P.def(0xF341, 'look_round_f341', r => lookRound(r.hl, r.iy, r.b & 255, r.c & 255));
  // look_one_way ($F367): along direction A from the place at HL+1: the actor's height ($F411; 0
  // for types $14 to $17) and a margin of 4 ($F3E4) set the scan for actors ($F3AA across, $F39F
  // down), and when one is found the boxes too ($F446, $F452). Looking across and finding no actor,
  // the game goes on to look down from where the scan left HL ($8301): slot 0's +2 to +5 taken for
  // a place, looking forwards
  P.def(0xF367, 'look_one_way', r => {
    const iy = r.iy, dir = r.a & 255, neg = (dir >> 1) & 1, hl = r.hl;
    setw(0xF411, (M[iy] & 0x3C) === 0x14 ? 0 : w((iy + 0x12) & 0xFFFF));
    M[0xF3E4] = 4;
    const across = wl(lo(hl, 1)), down = wl(lo(hl, 3));
    if (dir & 1) {
      if (!P.scan_down({ hl, a: neg }).zf) P.scan_boxes_f452({ bc: across, bc_: down, af_: neg << 8 });
      return {};
    }
    if (!P.scan_down_f3aa({ hl, a: neg }).zf) { P.scan_boxes({ bc: down, bc_: across, af_: neg << 8 }); return {}; }
    if (!P.scan_down({ hl: 0x8301, a: 0 }).zf) P.scan_boxes_f452({ bc: wl(0x8302), bc_: wl(0x8304), af_: 0 });
    return {};
  });
  // will_target ($F4C0): Z for a box; otherwise NZ when the byte at $EFED for the target's type
  // (type / 4) has the bit for the one looking: 4 for the party, 8 for types 4 to 7, 1 for the rest
  P.def(0xF4C0, 'will_target', r => {
    if (M[0xF011] === 0xFF) return { a: 0, zf: true };
    const k = M[r.iy] & 0x3C, b = !k ? 4 : k >= 8 ? 1 : 8;
    const a = M[0xEFED + ((M[w(0xF00F)] & 0x3C) >> 2)] & b;
    return { a, zf: !a, b };
  });
  // face_target ($F4E9): turns to face the target, unless it faces this way already and this is
  // one of the party: the action is the direction looked plus 1, or 5 when already facing it
  P.def(0xF4E9, 'face_target', r => {
    const iy = r.iy, c = M[0xF00D];
    if (!((c ^ 2 ^ M[lo(w(0xF00F), 0x0D)]) & 3) && (M[iy] & 0x3F) < 4) return {};
    return setAction(iy, (M[iy + 0x0D] & 3) === c ? 5 : (c + 1) & 255);
  });
  // set_action ($F50F): +4 set to 2 and the action to A, with bit 7 when it changes
  const setAction = (iy, a) => {
    M[iy + 4] = 2;
    if (a === M[iy + 0x0C]) return { a, zf: true };
    a |= 0x80;
    M[iy + 0x0C] = a;
    return { a, zf: false };
  };
  P.def(0xF50F, 'set_action', r => setAction(r.iy, r.a & 255));

  // --- a new leader ---
  // new_leader ($F51D): a portrait of the third menu (actions 12 to 15): $8D0A becomes that
  // character; if that is the captive ($8D0C), the ceremony's count stops ($8D15 = $FF). One in
  // play has his or her actor swapped into slot 0 (action $80). One out of play is put at a point
  // of the record's route ($ED68, $EDB0; the nearest route, $E24E, when it has none), in its area
  // (loaded when it is another), the old leader put back and the new one brought in. The view is
  // centred on slot 0 ($9633-$9638) and the area's edges checked ($DB0B); then $F607
  P.def(0xF51D, 'new_leader', r => {
    const a = (r.a - 0x0C) & 255;
    M[0x8D0A] = a;
    if (a === M[0x8D0C]) M[0x8D15] = 0xFF;
    const rec = P.record_of({ a }).hl;
    if (M[(rec + 1) & 0xFFFF] & 0x80) {
      let hl = 0x8300;
      for (let n = 0; M[hl] !== M[0x8D0A]; n++) {
        if (n > 0x800) throw new Error('new_leader: no actor for character ' + a);
        hl = (hl + 0x20) & 0xFFFF;
      }
      for (let k = 0; k < 0x20; k++) {
        const d = 0x8300 + k, s = lo(hl, k), t = M[d];
        M[d] = M[s]; M[s] = t;
      }
      M[0x830C] = 0x80;
    } else {
      const p6 = (rec + 6) & 0xFFFF, p7 = (rec + 7) & 0xFFFF;
      if (!M[p6]) {
        const o = P.nearest_route({ hl: p6 });
        M[p6] = (o.de >> 8) & 255; M[p7] = o.de & 255;
      }
      const t = (0xED68 + ((M[p6] * 2) & 255)) & 0xFFFF;
      let x = M[p7];
      if (x >= M[(t + 1) & 0xFFFF]) x = (x - 1) & 255;
      x = (x + M[t]) & 255;
      P.ldir((0xEDB0 + 3 * x) & 0xFFFF, (rec + 2) & 0xFFFF, 3);
      const area = M[(rec + 2) & 0xFFFF], same = M[0x8D1F] === area;
      M[0x8D1F] = area;
      if (!same) { P.load_area({}); P.page_bank_3(); }
      P.put_back({ hl: 0x8300 });
      const g = P.record_ground({ hl: (rec + 3) & 0xFFFF });
      setw(0x8ED5, (((g.hl & 0xFF00) | (g.a & 255)) * 8) & 0xFFFF);
      P.bring_in({ hl: rec });
    }
    let v = ((w(0x8314) & 0xFFF8) - 0x68) & 0xFFFF;
    setw(0x9635, v); M[0x9633] = (v >> 3) & 255;
    v = ((w(0x8316) & 0xFFF8) - 0x48) & 0xFFFF;
    setw(0x9637, v); M[0x9634] = (v >> 3) & 255;
    P.area_edges({});
    P.page_bank_3();
    return P.leader_done({ hl: rec });
  });
  // leader_done ($F607): $8D09 cleared, $8D16 and $8D17 $FF, and on at $868E: the view drawn and
  // the main loop afresh
  P.def(0xF607, 'leader_done', () => {
    M[0x8D09] = 0;
    M[0x8D16] = 0xFF; M[0x8D17] = 0xFF;
    return P.new_game_868e({});
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
