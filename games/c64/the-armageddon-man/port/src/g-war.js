// The war ($C641-$CDD6): a limited strike or a missile exchange between countries A and B, six
// missiles on the map each running a routine a frame (launch, flight, explosion, a shot from an SDI
// satellite), the damage, the radiation, and the report after it. line_setup and line_step
// ($C190-$C24E) draw a missile's straight line.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`script_strike script_exchange war_run war_frame war_report`);
G.war = function (P) {
  const M = P.M;
  const w = P.w, setw = P.setw;
  const at = (p, i) => M[(p + i) & 0xFFFF];
  const put = (p, i, v) => { M[(p + i) & 0xFFFF] = v & 255; };
  const routine = (lo, hi) => { const r = w(0x80); put(r, 15, lo); put(r, 16, hi); return { a: hi, y: 16 }; };
  const destroyed = rec => ((at(rec, 11) + 1) & 255) === 0;

  // ---- a strike, an exchange
  P.script_strike = function* () {
    for (let y = 5; y >= 0; y--) M[0xC5C7 + y] = 0;
    setw(0xC5C5, w(0x8E));
    setw(0xC5C3, w(0x90));
    setw(0x80, w(0xC5C3));
    if (at(w(0x80), 10) < at(w(0x80), 11)) return {};
    setw(0x82, 0xC5C7);
    setw(0x80, w(0x8E));
    P.take_missiles({ a: 3 });
    return yield* P.war_run();
  };
  P.script_exchange = function* () {
    setw(0x80, w(0x90));
    setw(0xC5C3, w(0x80));
    let r = w(0x80);
    if (at(r, 10) < at(r, 11)) return {};
    setw(0x82, 0xC5C7);
    setw(0x80, w(0x8E));
    P.take_missiles({ a: (at(r, 10) - at(r, 11)) & 255 });
    setw(0x80, w(0x8E));
    setw(0xC5C5, w(0x80));
    r = w(0x80);
    if (at(r, 10) < at(r, 11)) return {};
    setw(0x82, 0xC5CA);
    setw(0x80, w(0x90));
    P.take_missiles({ a: (at(r, 10) - at(r, 11)) & 255 });
    return yield* P.war_run();
  };
  // take_missiles ($C68D): A missiles from the record at $80/$81 into the counts at $82/$83, MX1
  // first; the number it could not find returned
  P.take_missiles = function (r) {
    const rec = w(0x80), dst = w(0x82);
    let a = r.a;
    for (let i = 0; i < 3; i++) {
      const have = at(rec, 6 + i);
      if (a < have) {
        put(dst, i, a);
        put(rec, 6 + i, have - a);
        return { a: (have - a) & 255, y: 6 + i };
      }
      a -= have;
      put(dst, i, have);
      put(rec, 6 + i, 0);
    }
    return { a, y: 8 };
  };

  // ---- the war on the map
  P.war_run = function* () {
    P.sei();
    M[0x6286] = 0xDA; M[0x6287] = 0x8D;
    P.cli();
    M[0x88] = 0; M[0x89] = 0;
    M[0xCC0E] = 0; M[0xCC0F] = 0;
    M[0xC7E1] = 0;
    P.war_missiles_init();
    for (;;) {
      yield* P.war_frame();
      let s = 0;
      for (let y = 5; y >= 0; y--) s = (s + M[0xC5C7 + y]) & 255;
      setw(0x82, 0xC5C7);
      if (!s) break;
    }
    M[0xC7E1] = 1;
    for (;;) {
      yield* P.war_frame();
      setw(0x80, 0xC5CD);
      let busy = false;
      for (let x = 6; x; x--) {
        if (at(w(0x80), 6) & 1) { busy = true; break; }
        setw(0x80, w(0x80) + 0x13);
      }
      if (!busy) break;
    }
    yield* P.war_report();
    P.do_nothing();
    return yield* P.script_missiles_both();
  };
  // war_frame ($C7E2): a frame, then each missile's routine
  P.war_frame = function* () {
    yield* P.wait_frames({ a: 1 });
    setw(0x80, 0xC5CD);
    for (let x = 6; x; x--) {
      const s = w(0x80);
      P.missile_run();
      setw(0x80, s + 0x13);
    }
    return { x: 0 };
  };
  P.missile_run = function () {
    const r = w(0x80);
    M[0x88] = M[0xC828] = at(r, 15);
    M[0x89] = M[0xC829] = at(r, 16);
    const a = w(0x88);
    const name = P.nameAt(a);
    if (!name || !P[name]) throw new Error('no missile routine at $' + a.toString(16));
    return P[name]({ a: M[0x89], y: 16 });
  };
  P.missile_at_target = function () {
    const r = w(0x80);
    return { z: at(r, 0) === at(r, 17) && at(r, 1) === at(r, 18) ? 1 : 0 };
  };
  P.missile_fly = function () {
    if (P.missile_at_target().z) return routine(0x10, 0xCA);
    P.draw_dot();
    P.line_step();
    put(w(0x80), 0, M[0x84]);
    put(w(0x80), 1, M[0x85]);
    P.draw_dot();
    return P.sdi_check();
  };
  // missile_launch ($C868): to a random point in the target's box at $82/$83, from one in the
  // launcher's (missile_from)
  P.missile_launch = function () {
    const r = w(0x80);
    const pickIn = (s, i) => { let a; do { a = P.random().a & 0x7F; } while (a >= at(s, 2 + i)); return (a + at(s, i)) & 255; };
    put(r, 17, pickIn(w(0x82), 0));
    put(r, 18, pickIn(w(0x82), 1));
    setw(0x82, w(0xC8F5));
    put(r, 0, pickIn(w(0x82), 0));
    put(r, 1, pickIn(w(0x82), 1));
    P.draw_dot();
    M[0x86] = at(r, 0); M[0x87] = at(r, 1);
    M[0x84] = at(r, 17); M[0x85] = at(r, 18);
    P.line_setup();
    put(r, 6, at(r, 6) | 1);
    return routine(0x2A, 0xC8);
  };
  // the launchers: the next of the side's missiles, MX1 first, while any is left
  const launcher = (from, target, counts) => {
    setw(0xC8F5, w(from));
    const t = w(target);
    setw(0x82, counts);
    for (let i = 0; i < 3; i++) {
      if (at(counts, i)) {
        put(w(0x80), 14, i);
        setw(0x82, t);
        return P.missile_launch();
      }
    }
    setw(0x82, t);
    return {};
  };
  P.launcher_b = () => launcher(0xC5C3, 0xC5C5, 0xC5CA);
  P.launcher_a = () => launcher(0xC5C5, 0xC5C3, 0xC5C7);
  P.war_tally = function () {
    const t = at(w(0x80), 14);
    M[0x84] = (t + ((t << 1) & 255)) & 255;
    const v = M[0xC996] - M[0x84];
    M[0xC996] = v < 0 ? 0 : v;
    return { a: M[0xC996] };
  };
  P.war_missiles_init = function () {
    setw(0x80, 0xC5CD);
    for (let x = 3; x; x--) {
      const r = w(0x80);
      put(r, 15, 0x16); put(r, 16, 0xC9);
      put(r, 6, (M[0x8B] << 1) & 0xFE);
      put(r, 2, 2); put(r, 3, 2);
      setw(0x80, r + 0x13);
    }
    setw(0x80, 0xC606);
    for (let x = 3; x; x--) {
      const r = w(0x80);
      put(r, 15, 0xF7); put(r, 16, 0xC8);
      put(r, 6, M[0x8A] << 1);
      put(r, 2, 2); put(r, 3, 2);
      setw(0x80, r + 0x13);
    }
    return { a: 1, x: 0, y: 3 };
  };
  // the explosion: five frames of rings, then the hit
  P.missile_explode = function () {
    P.war_tally();
    P.draw_dot();
    const r = w(0x80);
    put(r, 0, at(r, 0) - 3);
    put(r, 1, at(r, 1) - 3);
    M[0x86] = 0xFF; M[0x87] = 0xCC;
    P.draw_blast();
    routine(0x4F, 0xCA);
    const a = (at(r, 14) + 1) & 255;
    M[0x84] = (a + ((a << 1) & 255)) & 255;
    return { a: M[0x84], y: 14 };
  };
  const blast = (off, on, lo) => () => {
    M[0x86] = off & 255; M[0x87] = off >> 8; P.draw_blast();
    M[0x86] = on & 255; M[0x87] = on >> 8; P.draw_blast();
    return routine(lo, 0xCA);
  };
  P.blast_2 = blast(0xCCFF, 0xCD07, 0x72);
  P.blast_3 = blast(0xCD07, 0xCD0F, 0x95);
  P.blast_4 = blast(0xCD0F, 0xCD07, 0xB8);
  P.blast_5 = blast(0xCD07, 0xCCFF, 0xDB);
  P.blast_end = function () {
    M[0x86] = 0xFF; M[0x87] = 0xCC;
    P.draw_blast();
    P.war_damage();
    return P.missile_done();
  };
  // missile_done ($CAE9): its type's count down by one, and back to its launcher
  P.missile_done = function () {
    const r = w(0x80);
    M[0x84] = at(r, 6) >> 1;
    setw(0x82, M[0x8B] === M[0x84] ? 0xC5C7 : 0xC5CA);
    M[0x86] = at(r, 14); M[0x87] = 0;
    setw(0x82, w(0x82) + M[0x86]);
    if (M[w(0x82)]) M[w(0x82)]--;
    put(r, 6, at(r, 6) & 0xFE);
    if (M[0xC7E1]) return P.missile_idle();
    M[0x84] = at(r, 6) >> 1;
    if (M[0x8B] === M[0x84]) return P.missile_back_a();
    return routine(0xF7, 0xC8);
  };
  P.missile_idle = () => routine(0x4F, 0xCB);
  P.missile_back_a = () => routine(0x16, 0xC9);
  // sdi_check ($CB69): each SDI satellite in orbit, by a 1 in 4 chance, may have the missile
  P.sdi_check = function () {
    const s = [M[0x82], M[0x83], M[0x84], M[0x85]];
    setw(0x82, 0x5D5C);
    for (let x = 6; x; x--) {
      if ((at(w(0x82), 6) & 1) && !(P.random().a & 3) && P.in_cover().c) {
        M[0x88] = M[0x82]; M[0x89] = M[0x83];
        put(w(0x80), 7, M[0x88]);
        put(w(0x80), 13, M[0x89]);
        routine(0xE3, 0xCB);
        [M[0x82], M[0x83], M[0x84], M[0x85]] = s;
        return { x };
      }
      setw(0x82, w(0x82) + 8);
    }
    [M[0x82], M[0x83], M[0x84], M[0x85]] = s;
    return { x: 0 };
  };
  P.laser_on = function () {
    P.draw_dot();
    P.laser_line();
    return routine(0xF6, 0xCB);
  };
  P.laser_off = function () {
    P.laser_line();
    routine(0xE9, 0xCA);
    setw(0xCC0E, w(0xCC0E) + 1);
    return {};
  };
  // war_damage ($CC10): the target takes a hit; the hit that reaches byte 10 destroys it
  P.war_damage = function () {
    M[0x84] = at(w(0x80), 6) >> 1;
    setw(0x82, M[0x8B] === M[0x84] ? w(0x90) : w(0x8E));
    const s = w(0x82);
    const a = (at(s, 11) + 1) & 255;
    if (a && a === at(s, 10)) {
      put(s, 11, 0xFF);
      M[0x5B50] = (M[0x5B50] + 1) & 255;
      put(s, 5, 0); put(s, 4, 0);
      return { a: 0, y: 4 };
    }
    if (a) put(s, 11, a);
    return P.radiation_up();
  };
  P.radiation_up = function () {
    if (P.random().a & 3) return {};
    const a = (M[0x5B53] + 1) & 255;
    if (a) M[0x5B53] = a;
    return { a };
  };
  // laser_line ($CC6D): a dot flipped at every pixel from the satellite to the missile, walked by
  // the scratch missile at laser_scratch ($CCE9)
  P.laser_line = function () {
    const r = w(0x80);
    M[0x88] = at(r, 7); M[0x89] = at(r, 13);
    setw(0x82, w(0x88));
    const s = w(0x82);
    M[0x85] = at(r, 1); M[0x87] = at(s, 1);
    M[0x84] = at(r, 0); M[0x86] = at(s, 0);
    setw(0x80, 0xCCE9);
    const l = 0xCCE9;
    put(l, 0, M[0x86]); put(l, 1, M[0x87]);
    put(l, 17, M[0x84]); put(l, 18, M[0x85]);
    P.line_setup();
    while (!P.missile_at_target().z) {
      P.draw_dot();
      M[0x85] = at(l, 1); M[0x84] = at(l, 0);
      P.line_step();
      put(l, 0, M[0x84]); put(l, 1, M[0x85]);
    }
    setw(0x80, r);
    return {};
  };
  P.draw_dot = function () { M[0x86] = 0x17; M[0x87] = 0xCD; return P.draw_shape(); };
  P.draw_blast = () => P.draw_shape();

  // ---- a straight line, for the missile at $80/$81
  // line_setup ($C190): from x $86, y $87 to x $84, y $85; the steps in bytes 8 to 11, the shorter
  // distance in 12, the longer in 13 and half of it in 7
  P.line_setup = function () {
    const r = w(0x80);
    let a = (M[0x85] - M[0x87]) & 255, x = 1;
    if (M[0x85] < M[0x87]) { a = (-a) & 255; x = 0xFF; }
    M[0x85] = a; M[0x87] = x;
    a = (M[0x84] - M[0x86]) & 255; x = 1;
    if (M[0x84] < M[0x86]) { a = (-a) & 255; x = 0xFF; }
    M[0x84] = a;
    put(r, 9, M[0x87]); put(r, 8, x);
    put(r, 10, M[0x87]); put(r, 11, x);
    if (M[0x84] >= M[0x85]) {
      if (!M[0x84]) return { a: 0, x, y: 11 };
      put(r, 12, M[0x85]);
      M[0x85] = M[0x84];
      put(r, 9, 0);
    } else {
      put(r, 12, M[0x84]);
      put(r, 8, 0);
    }
    put(r, 13, M[0x85]);
    put(r, 7, M[0x85] >> 1);
    return { a: M[0x85] >> 1, x, y: 7 };
  };
  // line_step ($C203): one pixel along the line, into $84 (x) and $85 (y)
  P.line_step = function () {
    const r = w(0x80);
    let a = at(r, 7) + at(r, 12);
    if (a > 255 || a >= at(r, 13)) {
      a = (a - at(r, 13)) & 255;
      M[0x89] = at(r, 10); M[0x88] = at(r, 11);
    } else {
      M[0x89] = at(r, 9); M[0x88] = at(r, 8);
    }
    put(r, 7, a);
    M[0x85] = (at(r, 1) + M[0x89]) & 255;
    M[0x84] = (at(r, 0) + M[0x88]) & 255;
    return { a: M[0x84], y: 0 };
  };

  // ---- war_report ($CD2B)
  P.war_report = function* () {
    P.letter_window();
    setw(0x80, w(0x8E));
    setw(0x88, destroyed(w(0x80)) ? 0xCDB2 : 0xCD89);
    yield* P.print_text();
    setw(0x80, w(0x90));
    setw(0x88, destroyed(w(0x80)) ? 0xCDBA : 0xCD92);
    yield* P.print_text();
    yield* P.wait_press({});
    return P.close_window();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
