// The rope rescue and the end of the game (bank 3, $E4C2-$EA3C): Clive falling through ground
// $74 and hanging, a rescuer throwing the rope, pulling and hauling him up; the turn marker; the
// end reached and the end screen.
//
// $FA9C is 3 while a rescue is under way, $FA9D the address of Clive's actor, $FA9F the
// rescuer's; $8D11 counts the passes Clive hangs ($FF once the rope is thrown), $8D12 asks for the
// rope to be drawn.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.rope = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);

  // the action A for the actor at IY, marked to start (bit 7) when it changes ($DF7E)
  const setAction = (iy, a) => {
    if (a === M[iy + 0x0C]) return { a, zf: true };
    M[iy + 0x0C] = a | 0x80;
    return { a: a | 0x80, zf: false };
  };
  // back_to_follow ($E5A8): the actor whose +1 is at HL back to state 1 and action 0, facing as it
  // was; $E5A4 the rescuer
  const back = hl => {
    if (M[hl] !== 0xFF) M[hl] = 1;
    const s = lo(hl, 0x0C);
    M[s] &= 3;
    M[lo(s, -1)] = 0x80;
    return { hl: lo(s, -1), a: M[s] };
  };
  P.def(0xE5A8, 'back_to_follow', r => back(r.hl));
  P.def(0xE5A4, 'state_haul_e5a4', () => back(lo(w(0xFA9F), 1)));

  // state_pull ($E4C2, 4): with a rescue under way and Clive in play ($FB60), the rescuer standing
  // on ground $75 or $76 walks along until level with him across ($FAEB puts his place in
  // $A03A), then faces him (state $15 or $17), takes state 6 and Clive 5; anywhere else message
  // $10 (I CAN'T REACH FROM HERE) and back to following
  P.def(0xE4C2, 'state_pull', r => {
    const hl = r.hl, iy = r.iy;
    if (M[0xFA9C] !== 3) return P.state_haul_e5a4({});
    const f = P.find_actor({ a: 3 });
    setw(0xFA9D, f.hl);
    if (!f.zf) return P.state_haul_e5a4({});
    P.ldir(lo(hl, 0x0D), 0x8ED1, 4);
    const g = P.ground_cell({}).a & 255;
    if (g !== 0x76 && g !== 0x75) {
      M[hl] = 1;
      return P.queue_message({ b: 0x10, c: M[lo(hl, -1)] });
    }
    P.coarse_place({ hl: lo(w(0xFA9D), 0x0E) });
    let c = 3, a = M[0xDB08] - M[0xA03A];
    if (a < 0) { a = -a; c = 1; }
    if (a) return setAction(iy, c);
    M[iy + 0x0D] = M[0xDB09] >= M[0xA03B] ? 0x17 : 0x15;
    M[iy + 1] = 6;
    M[lo(w(0xFA9D), 1)] = 5;
    return {};
  });

  // state_throw ($E535, 6): the rope drawn ($8D12) and the rescuer turned towards Clive while he
  // is in play: a quarter turn, or while he hangs a turn back, the rope taken ($8D11 $FF) once he
  // is above height $B0
  P.def(0xE535, 'state_throw', r => {
    M[0x8D12] = 0xFF;
    const iy = r.iy;
    if (!P.find_actor({ a: 3 }).zf) return P.state_haul_e5a4({});
    let b = 0, c = 3;
    if (M[0x8D11] !== 0xFF) {
      b = 0x80; c = 1;
      if (M[lo(w(0xFA9D), 0x12)] < 0xB0) { c = 3; M[0x8D11] = 0xFF; }
    }
    let a = (M[lo(r.hl, 0x0C)] + c) & 3;
    if (!a) a = 4;
    return setAction(iy, a | b);
  });

  // state_haul ($E576, 5): Clive hauled up while he stands on ground $75: he faces away from the
  // rescuer, rising four units a pass until his height is 0, then takes the rescuer's action; or
  // while he still hangs he turns and comes down to $A8. Off ground $75 the rescue is done: 10%
  // on the score ($E4A0) and both back to following.
  P.def(0xE576, 'state_haul', r => {
    const hl = r.hl, iy = r.iy;
    P.rope_timer({});
    P.ldir(lo(hl, 0x0D), 0x8ED1, 4);
    if ((P.ground_cell({}).a & 255) === 0x75) {
      const res = w(0xFA9F), b = M[lo(res, 0x0D)], c = M[lo(res, 0x0C)];
      const p = lo(hl, 0x11), v = M[p] | M[lo(p, 1)] << 8;
      if (M[0x8D11] === 0xFF) {
        M[iy + 0x0D] = b ^ 2;
        if (!(v & 0x8000)) return setAction(iy, c);
        const u = v + 4 > 0xFFFF ? 0 : v + 4;
        M[lo(p, 1)] = u >> 8; M[p] = u & 255;
        return {};
      }
      if (v & 0x80 && ((v - 4) & 255) >= 0xA8) M[p] = (v - 4) & 255;
      const s = lo(p, -5);
      M[s] = (M[s] + 1) & 3;
      return {};
    }
    P.add_percent({ b: 0x0A });
    M[0x8D12] = 0;
    M[0x8D11] = 0xFF;
    M[0xFA9C] = 0xFF;
    back(hl);
    return P.state_haul_e5a4({});
  });

  // clive_falls ($E609): Clive (DE) on ground $74, unless being hauled (state 5): a rescue under
  // way, state 9; once the rope is taken he drops ($9306). The first pass he falls 24 units
  // shouting HELP (message $0E, sound effect 5) and the place he fell from is kept in object
  // record 18 ($ED50, $F818); then $8D11 counts on, his frame swinging ($8ED7), the rope timer
  // runs, and at $C0 he calls again (message $0F)
  P.def(0xE609, 'clive_falls', r => {
    M[0xFA9C] = 3;
    const hl = r.de, iy = r.iy;
    if ((M[lo(hl, 1)] & 0x3F) === 5) return { a: 5, zf: true };
    setw(0xFA9D, hl);
    let a = M[0x8D11];
    M[lo(hl, 1)] = 9;
    if (a === 0xFF) return P.ground_7e_9306({ hl: lo(hl, 1), iy });
    if (!a) {
      M[0x7006] = 5;
      setw(0x8ED5, 0xFFE8);
      P.queue_message({ b: 0x0E, c: 3 });
      M[iy + 0x0C] = 0x80;
      M[0xED50] = 0x0E;
      M[0xED51] = (w(0x8ED1) >> 2) & 255;
      M[0xED52] = (w(0x8ED3) >> 2) & 255;
      M[0xED53] = 0;
      P.object_screen({ de: 0xED52, hl: 0x8ED5, a: 0 });
    }
    a = (a + 1) & 255;
    M[0x8D11] = a;
    let c = (a & 3) + 2;
    const s = M[iy + 0x0D];
    if (s & 2) c += 4;
    M[0x8ED7] = s & 1 ? c | 0x80 : c;
    P.rope_timer({});
    if (M[0x8D11] === 0xC0) P.queue_message({ b: 0x0F, c: 3 });
    return { a: 0, zf: true };
  });

  // rope_timer ($E68D): while object 17 ($ED4F) is $11, $ED55 counts to $48; then it becomes $12
  // with $306F at $ED54 and $FFFF at $ED51
  P.def(0xE68D, 'rope_timer', () => {
    if ((M[0xED4F] & 0x1F) !== 0x11) return { zf: false, hl: 0xED4F };
    const a = (M[0xED55] + 1) & 255;
    M[0xED55] = a;
    if (a < 0x48) return { a, cf: true, hl: 0xED55 };
    M[0xED4F] = 0x12;
    setw(0xED54, 0x306F);
    setw(0xED51, 0xFFFF);
    return { a: 0x12, hl: 0xFFFF };
  });

  // draw_rope ($E6B3): asked once by $8D12: the rope made of shot records: shot 0 ($C100) from the
  // rescuer's muzzle (shooter 5, his direction) to Clive's (across from the rescuer's), shot 1
  // ($C118) falling from that end 16 units below Clive's height when he is below 0; each clipped
  // and projected as a shot is ($C260), the second only when the first's end was not clipped
  // ($E74F)
  const line = s => {
    setw(0xC218, s);
    if (M[s] === 0xFF) return;
    M[0xC21A] = M[s] & 7;
    P.shot_tail(s);
  };
  const ropeEnd = saved => {
    if (w(0xC10E) !== saved) { M[0xC118] = 0xFF; return {}; }
    line(0xC118);
    return {};
  };
  P.def(0xE6B3, 'draw_rope', () => {
    if (!M[0x8D12]) return { a: 0, zf: true };
    M[0x8D12] = 0;
    const res = w(0xFA9F), dir = M[lo(res, 0x0D)] & 3;
    M[0xC100] = dir | 0x20;
    const o = P.muzzle({ a: 5, b: dir, hl_: lo(res, 0x0E), de_: 0xC102 });
    const cl = w(0xFA9D);
    P.muzzle({ a: 5, b: 0, hl_: lo(cl, 0x0E), de_: lo(o.de, 4) });
    setw(0xC10C, w(0xC102));
    setw(0xC110, w(0xC106));
    const hp = lo(cl, 0x12);
    if (M[hp] & 0x80) {
      M[0xC118] = 4;
      P.ldir(0xC10C, 0xC11A, 6);
      P.ldir(0xC11A, 0xC124, 4);
      setw(0xC128, ((M[hp] | M[lo(hp, 1)] << 8) + 0x10) & 0xFFFF);
    }
    const saved = w(0xC10E);
    line(0xC100);
    return ropeEnd(saved);
  });
  // rope_end ($E74F): reached by the first line's RET; the word it POPs, the first line's end
  // before clipping, is DE here
  P.def(0xE74F, 'rope_end', r => ropeEnd(r.de));

  // turn_marker ($E8D7): an actor's event (HL at +$0B): every 16 passes, for the character whose
  // turn it is (0 to 3 from the pass; $ED5E cleared at 0), object record 19 ($ED5D) put at its
  // place ($F801) and shifted: down 3 for Jarret and Dirk, 1 down and 3 across for Gloria, 2
  // down for Clive
  P.def(0xE8D7, 'turn_marker', r => {
    const hl = lo(r.hl, -0x0B), n = M[0x8D1C];
    if (n & 0x0F) return { zf: false };
    const c = (n >> 4) & 3;
    if (!c) M[0xED5E] = 0;
    if ((M[hl] & 0x3F) !== c) return { zf: false };
    P.place_object({ hl, de: 0xED5E, b: r.b, c, bc: (r.b & 255) << 8 | c });
    M[0xED63] = (M[0xED63] - 1) & 255;
    if (c === 1) { M[0xED62] = (M[0xED62] + 3) & 255; return {}; }
    M[0xED63] = (M[0xED63] - 1) & 255;
    if (c === 3) return { zf: true };
    M[0xED63] = (M[0xED63] - 1) & 255;
    return {};
  });

  // game_end ($E910): the end reached, once ($8D10): the actor (HL) held meanwhile, the days and
  // left-behind flags cleared, each character within reach ($FB7C, its answer the flag) adding
  // (100 less the score's whole percent, at least 60) / 4 to the score; the end tune ($0E) and
  // menu 2 opened with the end screen in it
  P.def(0xE910, 'game_end', r => {
    if (M[0x8D10]) return { a: 0, zf: true };
    M[0x8D10] = 0xFF;
    const hl = lo(r.hl, 1);
    M[hl] &= 0x7F;
    setw(0xEA91, 0); setw(0xEA93, 0); setw(0xE4BE, 0); setw(0xE4C0, 0);
    let a = (10 * M[0x8D05] + M[0x8D06]) & 255;
    if (a < 0x3C) a = 0x3C;
    const bonus = (((0x64 - a) & 255) >> 2) & 0x1F;
    for (let c = 0; c < 4; c++) {
      const o = P.within_reach({ a: c });
      M[0xE4BE + c] = o.a & 255;
      if (o.zf) P.add_percent({ b: bonus });
    }
    M[0x7002] = 0x0E;
    P.pick_character_cd39({});
    M[hl] |= 0x80;
    return { a: 0, zf: true };
  });

  // end_screen ($E975): menu 2's window made the end's: colour 7, the frame's counts $93, drawn,
  // the icons from the third cleared; the days (from $BF2D, leading zeros blanked) and the
  // score's three digits put in the texts at $EA58, printed a line apart from $5BAA with rows 21
  // bytes apart ($D916), PITY ABOUT and those left behind where the $80 marker is
  P.def(0xE975, 'end_screen', () => {
    P.menu_colour({ a: 7 });
    P.frame_size({ b: 0x93, c: 0, bc: 0x9300 });
    P.draw_menu_frame({ b: 0x15, c: 0x09, bc: 0x1509 });
    P.copy_window({ hl: 0xC899 });
    for (let hl = 0xD0BD, b = 9; b > 0; b--, hl += 5) M[hl] = 0;
    P.draw_icon({ hl: 0xD0B5 });
    const days = M[0xBF2D];
    if (days) {
      P.add_percent_e4ac({ hl: 0xEA94, b: days });
      for (let hl = 0xEA91; !M[hl]; hl++) M[hl] = 0xF9;
    }
    P.ldir(0x8D04, 0xEAAA, 3);
    if (!M[0xEAAA]) M[0xEAAA] = 0xF9;
    M[0xD916] = 0x15;
    M[0xD5C2] = 0x15;
    let hl = 0xEA58, de = 0x5BAA;
    for (let b = 4; b > 0; b--) {
      M[0xD5C0] = 1;
      hl = (P.show_message_d838({ hl, de }).hl + 1) & 0xFFFF;
      de = (de + 0xA8) & 0xFFFF;
      if (M[hl] === 0x80) {
        P.pity_line({ de });
        de = (de + 0xA8) & 0xFFFF;
        hl = (hl + 1) & 0xFFFF;
      }
    }
    M[0xD916] = 0x0C;
    return { a: 0, zf: true };
  });
  // pity_line ($EA0B): when any of the four left-behind flags is set, PITY ABOUT ($EABA) and the
  // name of each ($D8E3), its flag made $FF
  P.def(0xEA0B, 'pity_line', r => {
    if (!w(0xE4BE) && !w(0xE4C0)) return { a: 0, zf: true };
    M[0xD5C0] = 1;
    let de = P.show_message_d838({ hl: 0xEABA, de: r.de }).de;
    for (let c = 0; c < 4; c++) {
      if (!M[0xE4BE + c]) continue;
      M[0xE4BE + c] = 0xFF;
      de = P.code_name_d8e3({ a: c, de }).de;
    }
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
