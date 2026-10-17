// The zones (bank 3, $FB9B-$FFCD): nine places that start something when the leader stands in
// them ($FB1E, five bytes each: the area, and the range across and down), and the dynamite's fuse.
// Zone 0 is the tribe's welcome, 1 and 2 the creature $2D near its nest, 3 the capture, 4 the
// altar and its ceremony, 5 where the dynamite is wanted, 6 to 8 the rivers.
//
// $FB5D is the zone the leader is in ($FF none), $FB5E the object dropped in it ($FF none), $FB5F a
// count for the zone; $8D0B the fuse (bit 7 once the dynamite is placed), $8D0C the captive (bit 7
// once the sacrifice has begun), $8D0D the welcome, $8D0E the creature $2D's meal, $8D0F the
// capture done and $8D15 the ceremony's count (also the calendar's month).
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.zones = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const say = (b, c) => P.queue_message({ b, c });

  // zones_pass ($FB9B): the dynamite ($FBED), then the zone the leader stands in ($DB05) found and
  // its handler ($FB4B) run; in none, $FB5D-$FB5F and $8D0E are reset
  P.def(0xFB9B, 'zones_pass', () => {
    P.dynamite({});
    const e = M[0xDB05], d = M[0xDB06], c = M[0x8D1F];
    for (let b = 9, hl = 0xFB1E; b > 0; b--, hl += 5) {
      if (M[hl] !== c || e < M[hl + 1] || e >= M[hl + 2] || d < M[hl + 3] || d >= M[hl + 4]) continue;
      const z = 9 - b, fn = w(0xFB4B + 2 * z);
      M[0xFB5D] = z;
      return P.jump(fn, { a: 2 * z, b: 0, c: 2 * z, de: 0xFB4C + 2 * z, hl: fn });
    }
    M[0xFB5D] = 0xFF; M[0xFB5E] = 0xFF; M[0xFB5F] = 0; M[0x8D0E] = 0;
    return { a: 0 };
  });

  // --- the dynamite ---
  // dynamite ($FBED): the fuse ($8D0B) counts down. At $0F the explosion: sound effect 9 on
  // channel A, the view flashes ($BF2E). Carried, the dynamite kills its carrier (state 8); in the
  // bag, the bag is gone (area 0) and so is its carrier, or lying, the blast is where it lay; lying,
  // everyone but types $10, $14 and $28 up within 8 units of it dies (state $48). It is gone
  // ($ED49); placed in its zone (bit 7 of the fuse), creatures $2B and $2C take route $17 and the
  // score goes up 10%. Below $0F the leader stands still and the view flickers ($9632, $96C5)
  P.def(0xFBED, 'dynamite', () => {
    const a = M[0x8D0B] & 0x7F;
    if (!a) return { a: 0, zf: true };
    M[0x8D0B] = (M[0x8D0B] - 1) & 255;
    if (a - 1 >= 0x10) return {};
    if (a - 1 !== 0x0F) {
      M[0x830C] = 0x80;
      M[0xBF2E] = M[0xFB1D] | 0xC0;
      M[0x9632] ^= 4;
      return P.scroll_up_96c5({});
    }
    M[0x7006] = 9;
    M[0xFB1D] = M[0xAA7D];
    M[0xBF2E] = 0xB8;
    const kill = ch => { const r = P.within_reach({ a: ch }); if (r.zf) M[(r.hl + 1) & 0xFFFF] = 8; };
    let blast = true;
    if (M[0xED49] & 0x20) {
      const ch = M[0xED49] & 0x1F;
      if (ch !== 4) { blast = false; kill(ch); }
      else {
        const bag = M[0xECD9];
        M[0xECD9] = 0;
        if (bag & 0x20) { blast = false; kill(bag & 0x1F); } else setw(0xED4A, w(0xECDA));
      }
    }
    if (blast) {
      for (let hl = 0x8300; hl < 0x8400; hl += 0x20) {
        const t = M[hl] & 0xFC;
        if (t >= 0x28 || t === 0x10 || t === 0x14) continue;
        P.leader_place_debd({ hl });
        const p = w(0xED4A);
        if (Math.abs(M[0xDB08] - (p & 255)) >= 9 || Math.abs(M[0xDB09] - (p >> 8)) >= 9) continue;
        M[hl + 1] = 0x48;
      }
    }
    M[0xED49] = 0;
    if (!(M[0x8D0B] & 0x80)) return { a: 0, zf: true };
    for (const [t, at] of [[0x2B, 0xEC63], [0x2C, 0xEC6B]]) {
      const f = P.find_actor({ a: t });
      M[at] = 0x17;
      if (f.zf) M[lo(f.hl, 2)] = 0x17;
    }
    return P.add_percent({ b: 0x0A });
  });

  // --- the rivers ---
  // river ($FCBD, $FCC1, $FCC5 for zones 6 to 8, the lines at $9C, $2A and $96 down): the leader,
  // in a state below 8, walking down (action 2) while above the line or up (4) while below it
  // (running counts as walking), stops (action $80) and says THE CURRENTS TOO STRONG (message $24)
  const river = line => {
    if (M[0x8301] >= 8) return {};
    const c = M[0xDB06] < line ? 2 : 4;
    let a = M[0x830C] & 0x7F;
    if (a >= 6) a -= 5;
    if (a !== c) return {};
    M[0x830C] = 0x80;
    return say(0x24, M[0x8D0A]);
  };
  P.def(0xFCBD, 'river', () => river(0x9C));
  P.def(0xFCC1, 'river_fcc1', () => river(0x2A));
  P.def(0xFCC5, 'river_fcc5', () => river(0x96));

  // --- the tribe ---
  // tribe_welcome ($FCF0, zone 0): 5% the first time ($8D0D). An object dropped here ends the
  // meeting ($8D0D $FF) with 10%; the compact (object $0B) adds 5% more and is answered with THATS
  // GREAT TAKE THIS (message 4) and the ham put down by the chief (type 7), and the chief goes for
  // the object ($F7AF, his +2 7); everyone is at peace ($F012, $F013). Nothing dropped, $FB5F counts
  // down the tribe's talk, a tin found ($ECE0), and at the end their mood ($EFED, $EFEE)
  P.def(0xFCF0, 'tribe_welcome', () => {
    const a0 = (M[0x8D0D] + 1) & 255;
    if (!a0) return { zf: true };
    M[0x8D0D] |= 0x80;
    if (!(a0 & 0x80)) P.add_percent({ b: 5 });
    const obj = M[0xFB5E];
    if (obj === 0xFF) {
      const n = M[0xFB5F] = (M[0xFB5F] - 1) & 255;
      if (!n) { M[0x8D0D] = 0xFF; return {}; }
      if (n === 0xC0) { P.tribe_says({ b: 0x12, c: 4 }); return P.tribe_says({ b: 7, c: 4 }); }
      if (n === 0xA0) { M[0xECE0] = 5; return {}; }
      if (n === 0x80) return P.tribe_says({ b: 0x14, c: 4 });
      if (n === 0x40) return P.tribe_says({ b: 0x14, c: 5 });
      if (n === 0x20) { M[0xEFED] = 9; return {}; }
      if (n === 0x10) M[0xEFEE] = 6;
      return {};
    }
    M[0x8D0D] = 0xFF;
    P.add_percent({ b: 0x0A });
    if (obj === 0x0B) {
      P.add_percent({ b: 5 });
      P.tribe_says({ b: 4, c: 4 });
      say(0x1D, M[0x8D0A]);
      P.put_down({ a: 7, hl: 0xED18 });
    }
    M[0xC891] = obj;
    const f = P.fetch_object_f7af({ a: 7, c: 7 });
    M[lo(f.hl, -4)] = 7;
    M[0xF012] = 0; M[0xF013] = 0;
    return {};
  });
  // tribe_says ($FD95): message B for speaker C (a tribesman, whose letters are mirrored), and
  // when Dirk (character 2) is within reach for him too: he translates, beginning HE SAID
  P.def(0xFD95, 'tribe_says', r => {
    say(r.b, r.c);
    if (!P.within_reach({ a: 2 }).zf) return {};
    return say(r.b, 2);
  });

  // --- the creature $2D ---
  // zone_2d_outer ($FDA5, zone 2): its action 0, or 4 every 32nd pass. The ham (object 9) dropped
  // here is put at $ED64's place, $8D0E = $7F and the action 2; then $8D0E counts down, and at
  // $7B it has fed ($FE01)
  P.def(0xFDA5, 'zone_2d_outer', () => {
    const c = M[0x8D1C] & 0x1F ? 0 : 4;
    const f = P.find_actor({ a: 0x2D });
    if (!f.zf) return {};
    const de = lo(f.hl, 0x0C);
    M[de] = c;
    const a = M[0x8D0E];
    if (a) {
      M[0x8D0E] = (a - 1) & 255;
      return a === 0x7B ? fed(de) : {};
    }
    if (M[0xFB5E] !== 9) return {};
    M[0x8D0E] = 0x7F;
    P.ldir(0xED64, 0xED18, 6);
    M[de] = 2;
    return {};
  });
  // zone_2d_inner ($FDE3, zone 1): its action 4. With $8D0E at $7B it has fed; at $7F, action 2;
  // otherwise it grabs ($FE17)
  P.def(0xFDE3, 'zone_2d_inner', () => {
    const f = P.find_actor({ a: 0x2D });
    if (!f.zf) return {};
    const de = lo(f.hl, 0x0C);
    M[de] = 4;
    const a = M[0x8D0E];
    if (a === 0x7B) return fed(de);
    if (a === 0x7F) { M[0x8D0E] = 0x7E; M[de] = 2; return {}; }
    return grab(a, de);
  });
  // zone_2d_fed ($FE01): the object dropped ($FB5E, the ham) is gone (+1 $1C), $FB5E $FF, the
  // action 0 and 10% added
  const fed = de => {
    M[0x8D0E] = (M[0x8D0E] - 1) & 255;
    M[de] = 0;
    M[(P.object_record({ a: M[0xFB5E] }).hl + 1) & 0xFFFF] = 0x1C;
    M[0xFB5E] = 0xFF;
    return P.add_percent({ b: 0x0A });
  };
  P.def(0xFE01, 'zone_2d_fed', r => fed(r.de));
  // zone_2d_grab ($FE17): with $8D0E at 0 it becomes $FD and the action 0; at $FF nothing
  // happens; below $80 it counts down with the action 0. From $80 up it counts down (the action 1
  // below $F0) and the leader is held (bit 6 of $8301, action $80) at the place across from $FFCE
  // by the creature's frame, $20A down
  const grab = (a, de) => {
    if (!a) M[0x8D0E] = 0xFE;
    if (a === 0xFF) return { zf: true };
    M[0x8D0E] = (M[0x8D0E] - 1) & 255;
    if (!(a & 0x80)) { M[de] = 0; return {}; }
    if (M[0x8D0E] < 0xF0) M[de] = 1;
    const t = (0xFFCE + ((M[lo(de, 0x0F)] * 2) & 255)) & 0xFFFF;
    setw(0x830E, M[t] | M[(t + 1) & 0xFFFF] << 8);
    M[0x830C] = 0x80;
    setw(0x8310, 0x020A);
    M[0x8301] |= 0x40;
    return P.project({ hl: 0x830E });
  };
  P.def(0xFE17, 'zone_2d_grab', r => grab(r.a & 255, r.de));

  // --- the capture and the ceremony ---
  // capture ($FE5B, zone 3): until done ($8D0F), of the other three characters in turn, the first
  // within reach has +4 counted down and then the action 7; the first away from the area in a state
  // below 7 is captured: $8D0C, its record and records 5 to 7 from $FFDE, the tribe at war ($F012,
  // $EFED, $EFEE), the ceremony's count started ($8D15), 5% and message $0A. None: done
  P.def(0xFE5B, 'capture', () => {
    if (M[0x8D0F] === 0xFF) return { zf: true };
    let c = (M[0x8D0A] + 1) & 255;
    for (let b = 3; b > 0; b--, c = (c + 1) & 255) {
      const r = P.within_reach({ a: c & 3 });
      if (r.zf) {
        const p = lo(r.hl, 4);
        if (M[p] & 0x0F) M[p] = (M[p] - 1) & 255; else M[lo(p, 8)] = 7;
        return {};
      }
      if (!r.cf) continue;
      M[0x8D0C] = M[r.hl];
      M[0x8D0F] = 0xFF;
      P.ldir(0xFFDE, (r.hl + 1) & 0xFFFF, 7);
      P.ldir(0xFFE5, 0xEB2D, 0x18);
      M[0xF012] = 0; M[0x8D15] = 0; M[0xEFEE] = 0; M[0xEFED] = 1;
      P.add_percent({ b: 5 });
      return say(0x0A, M[0x8D0A]);
    }
    M[0x8D0F] = 0xFF; M[0x8D15] = 0xFF;
    return {};
  });
  // altar ($FEC8, zone 4): $8D15 counts up, unless it is $FF. The jewel (object $0A) dropped here
  // is fetched by the chief and ends the ceremony with 10%. Otherwise the captive in play, its
  // state taken down by 2 (the ceremony over at 0), cries HELP (message $0E) and the tribe speaks
  // at $40, $80 and $C0 (a different line, $0C, unless the jewel lies in area 2), the last sending
  // type 5 along route $1A; at $E8 the sacrifice
  P.def(0xFEC8, 'altar', () => {
    const a0 = (M[0x8D15] + 1) & 255;
    if (!a0) return { zf: true };
    M[0x8D15] = a0;
    if (M[0xFB5E] === 0x0A) {
      M[0xC891] = 0x0A;
      const f = P.fetch_object_f7af({ a: 7, c: 7 });
      M[lo(f.hl, -4)] = 7;
      P.add_percent({ b: 0x0A });
      return ceremonyOver();
    }
    const f = P.find_actor({ a: M[0x8D0C] & 0x7F });
    if (!f.zf) return {};
    const ch = M[f.hl], s = lo(f.hl, 1);
    M[s] = (M[s] - 2) & 255;
    if (!M[s]) return ceremonyOver();
    M[s] = 0;
    M[lo(s, 0x0B)] = 1;
    say(0x0E, ch);
    const e = (M[0xED1F] & 0x3F) === 2 ? 0 : 0xFF, a = M[0x8D15];
    const line = b => P.tribe_says({ b: a & e ? 0x0C : b, c: 5 });
    if (a === 0x40) return line(0x0B);
    if (a === 0x80) return line(0x08);
    if (a === 0xC0) { line(0x09); return P.set_route({ a: 5, de: 0x001A }); }
    if (a !== 0xE8) return {};
    return P.sacrifice({});
  });
  // sacrifice ($FF50; at $E8, or when a tribesman is shot in the zone, $C817): $8D0C gets bit 7 and
  // the captive, in play, is put at $82 across; type 5, or else 6, at $7B; then the ceremony ends
  P.def(0xFF50, 'sacrifice', () => {
    const a = M[0x8D0C] | 0x80;
    M[0x8D0C] = a;
    let f = P.find_actor({ a: a & 0x7F });
    if (!f.zf) return f;
    M[lo(f.hl, 0x0E)] = 0x82;
    P.project({ hl: lo(f.hl, 0x0E) });
    f = P.find_actor({ a: 5 });
    if (!f.zf) f = P.find_actor({ a: 6 });
    if (f.zf) {
      M[lo(f.hl, 0x0E)] = 0x7B;
      P.project({ hl: lo(f.hl, 0x0E) });
    }
    return ceremonyOver();
  });
  // ceremony_over ($FF7F): $8D15 = $FF and types 5 to 7 take route 4 from point 6 ($FFC1)
  const ceremonyOver = () => {
    M[0x8D15] = 0xFF;
    let o;
    for (let a = 5; a < 8; a++) o = P.set_route({ a, de: 0x0604 });
    return Object.assign({}, o, { a: 8, b: 0 });
  };
  P.def(0xFF7F, 'ceremony_over', ceremonyOver);
  // dynamite_zone ($FF96, zone 5): the dynamite (object $10) dropped here is placed (bit 7 of
  // $8D0B) and its record's place moved ($ED66, $ED69); otherwise, unless bit 5 of $ED65 is set,
  // WE COULD HAVE DONE WITH SOME DYNAMITE (message 3) from the leader
  P.def(0xFF96, 'dynamite_zone', () => {
    if (M[0x8D0B] & 0x80) return { zf: false };
    if (M[0xFB5E] === 0x10) {
      M[0x8D0B] |= 0x80;
      setw(0xED66, 0x9680); setw(0xED69, 0x1596);
      return {};
    }
    if (M[0xED65] & 0x20) return {};
    return say(3, M[0x8D0A]);
  });
  // set_route ($FFC1): the actor of type A, in play, gets route E from point D (+2, +3)
  P.def(0xFFC1, 'set_route', r => {
    const f = P.find_actor({ a: r.a & 255 });
    if (!f.zf) return Object.assign({}, f, { de: r.de });
    M[lo(f.hl, 2)] = r.de & 255;
    M[lo(f.hl, 3)] = (r.de >> 8) & 255;
    return { a: 0, zf: true, hl: lo(f.hl, 3), de: r.de };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
