// The car's physics, the part at $0841-$0F29: one step of the world a pass, the wheels against the
// road, the springs, the drag, and the moves. The car's state lives in the stack page ($0100-$018F,
// below where the stack reaches): position $0100-$0108 (three axes, three bytes each), velocity
// $0109/$010F, its own spin $010C/$0112, the forces $0115-$0120, the angles $0121-$0126, the
// wheels' contact points $0130-$013B, and more.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.physics = P => {
  const M = P.M;
  const sb = v => (v << 24) >> 24;
  // add the 16 bits at lo/hi to M[a]/M[b], as LDA lo, A_TO_15 (hi), ADC a, STA a, LDA b, ADC $15
  const add16 = (a, b, lo, hi) => { const t = M[a] + lo; M[a] = t & 255; M[b] = (M[b] + hi + (t >> 8)) & 255; };
  // the same through $14 and $15, as LDA lo, STA $14, LDA hi, JSR A_TO_15 leave them
  const add15 = (a, b, lo, hi) => { M[0x14] = lo; M[0x15] = hi; add16(a, b, lo, hi); };
  // the signed halving the physics uses: CLC, BPL +1, SEC, ROR A, ROR lo
  const half = (hi, lo) => ({ hi: ((hi >> 1) | (hi & 0x80)) & 255, lo: ((lo >> 1) | ((hi & 1) << 7)) & 255 });

  // STEP ($0841): one step of the world, called once a pass in the race (twice as it starts). The
  // bitmap that was drawn is shown at four points along it, as soon as the interrupt is ready for it
  // (FLIP_IF_READY): the steps take longer than a frame
  // Each routine is given the registers the one before it left, as the game's are: SIN_COS keeps
  // the X it was given at $C780.
  P.STEP = r => {
    let q = Object.assign({}, r);
    const go = (...fs) => { for (const f of fs) q = Object.assign({}, q, f(q) || {}); };
    go(P.FLIP_IF_READY, P.ROTATION_MATRIX, P.WHEEL_OFFSETS, P.FLIP_IF_READY, P.WHEELS_ROAD_HEIGHT, P.CAR_POINT_HEIGHTS, P.FLIP_IF_READY,
      P.VELOCITY_TO_CAR, P.ENGINE_NOTE, P.PULL_IN_CAR, P.WHEELS_ON_ROAD, P.FLIP_IF_READY);
    q.a = M[0xC307];
    if (M[0xC307]) {
      go(P.SPRINGS, P.STEERING, P.FORCES_TO_WORLD, P.FLIP_IF_READY, P.DRAG, P.SPIN_FORCES, P.ADD_SPIN, P.SPIN_TO_ANGLES,
        P.FLIP_IF_READY);
    }
    go(P.ADD_FORCES, P.MOVE_CAR, P.ROLL_TABLES);
    q.a = M[0xC37A];
    if (M[0xC37A]) go(P.FLIP_DONE);
    return q;
  };

  // WHEEL_OFFSETS ($0897): where the three wheels' contact points sit from the car's middle, from the
  // rotation matrix: $0130-$0132 and $0136-$0138 (low bytes; high at +3) are the matrix's row $22
  // and row $23 less, plus and less half the sum and difference of the rows $1F, $1A, $1C and $21
  P.WHEEL_OFFSETS = r => {
    M[0x52] = M[0x0796]; M[0x78] = M[0x07BE]; M[0x7E] = M[0x0797]; M[0x80] = M[0x07BF];
    let t = M[0x0793] + M[0x078E];
    let h = half((M[0x07BB] + M[0x07B6] + (t >> 8)) & 255, t & 255);
    M[0x51] = h.lo; M[0x77] = h.hi;
    t = M[0x0790] - M[0x0795];
    h = half((M[0x07B8] - M[0x07BD] - (t < 0 ? 1 : 0)) & 255, t & 255);
    M[0x7D] = h.lo; M[0x7F] = h.hi;
    t = 0 - M[0x52]; M[0x0132] = t & 255; M[0x0135] = (0 - M[0x78] - (t < 0 ? 1 : 0)) & 255;
    t = 0 - M[0x7E]; M[0x0138] = t & 255; M[0x013B] = (0 - M[0x80] - (t < 0 ? 1 : 0)) & 255;
    for (let x = 1; x >= 0; x--) { M[0x0130 + x] = M[0x52]; M[0x0133 + x] = M[0x78]; M[0x0136 + x] = M[0x7E]; M[0x0139 + x] = M[0x80]; }
    const sub = (a, b, lo, hi) => { const u = M[a] - lo; M[a] = u & 255; M[b] = (M[b] - hi - (u < 0 ? 1 : 0)) & 255; };
    sub(0x0130, 0x0133, M[0x51], M[0x77]); sub(0x0136, 0x0139, M[0x7D], M[0x7F]);
    add16(0x0131, 0x0134, M[0x51], M[0x77]); add16(0x0137, 0x013A, M[0x7D], M[0x7F]);
    return { x: 0xFF };
  };

  // MOVE_CAR ($0957): the position moved by the velocity (a quarter of it across, a half upwards),
  // the height kept below $03E8, the angles turned by their speeds ($016A/$016D) with the pitch and
  // the roll kept inside limits ($0A55, $0A57: wider while landing from a jump), and the height of
  // the car above the road at $33/$69
  P.MOVE_CAR = r => {
    for (let x = 2; x >= 0; x--) {
      M[0x16] = 0; M[0x14] = M[0x0109 + x]; M[0x15] = M[0x010F + x];
      if (M[0x15] & 0x80) M[0x16] = 0xFF;
      let a = M[0x16];
      for (let y = x === 1 ? 1 : 2; y; y--) {
        const c1 = a & 1; a >>= 1;
        const c2 = M[0x15] & 1; M[0x15] = (M[0x15] >> 1) | (c1 << 7);
        M[0x14] = (M[0x14] >> 1) | (c2 << 7);
      }
      M[0x16] = (M[0x15] & 0x80) ? 0xFF : 0;
      let t = M[0x14] + M[0x0100 + x]; M[0x0100 + x] = t & 255;
      t = M[0x0103 + x] + M[0x15] + (t >> 8); M[0x0103 + x] = t & 255;
      M[0x0106 + x] = (M[0x0106 + x] + M[0x16] + (t >> 8)) & 255;
    }
    const hy = M[0x0107];
    if (!(hy & 0x80) && hy >= 3 && (hy !== 3 || M[0x0104] >= 0xE8)) { M[0x0104] = 0xE7; M[0x0107] = 3; }
    for (let x = 2; x >= 0; x--) {
      add15(0x0121 + x, 0x0124 + x, M[0x016A + x], M[0x016D + x]);
      if (x === 1) continue;
      const y = (M[0xC373] & 0x80) && M[0xC359] === 0xE0 ? 1 : 0;
      const a = M[0x0124 + x];
      let lim;
      if (!(a & 0x80)) { lim = M[0x0A55 + y]; if (lim >= a) continue; }
      else { lim = M[0x0A57 + y]; if (lim < a) continue; }
      M[0x0124 + x] = lim;
      if (!((lim ^ M[0x0112 + x]) & 0x80)) { M[0x0112 + x] = 0; M[0x010C + x] = 0; }
      M[0x0121 + x] = 0;
    }
    let a = M[0x0126];
    if (a & 0x80) a = (-a) & 255;
    M[0xC3DC] = (M[0xC3DC] >> 1) | (a >= 0x0F ? 0x80 : 0);
    let s = M[0x0124] & 0x80 ? 0xFF : 0, hi = M[0x0124], lo = M[0x0121];
    for (let y = 5; y; y--) { const c1 = s & 1; s >>= 1; const c2 = hi & 1; hi = (hi >> 1) | (c1 << 7); lo = (lo >> 1) | (c2 << 7); }
    M[0x16] = s; M[0x14] = lo; M[0x15] = hi;
    const t = M[0x3C] - lo;
    M[0x33] = t & 255; M[0x69] = (0 - hi - (t < 0 ? 1 : 0)) & 255;
    return { x: 0xFF, y: 0, a: M[0x69] };
  };

  // ADD_FORCES ($0A59): the velocity's three axes ($0109/$010F) each moved on by its force
  // ($0115/$011B)
  P.ADD_FORCES = r => { for (let x = 2; x >= 0; x--) add15(0x0109 + x, 0x010F + x, M[0x0115 + x], M[0x011B + x]); return { x: 0xFF }; };
  // ADD_SPIN ($0A78): the spin's three axes ($010C/$0112) each moved on by its torque ($0118/$011E)
  P.ADD_SPIN = r => { for (let x = 2; x >= 0; x--) add15(0x010C + x, 0x0112 + x, M[0x0118 + x], M[0x011E + x]); return { x: 0xFF }; };

  // WHEELS_ON_ROAD ($0A97): for each of the three wheels, its height above the road ($C340-$C34B
  // and $C3CE-$C3D3, less $0E) and how far its spring is pressed ($0148/$014B), a hard landing
  // counted at $C3BC and its force kept at $C3C3 (the damage it does, after $C38B); then the
  // springs' sum and difference ($0160/$0161, $0166/$0167, $014E/$014F) and the road's grip
  P.WHEELS_ON_ROAD = r => {
    M[0xC3BC] = 0; M[0xC35C] = 0;
    for (let x = 2; x >= 0; x--) {
      let t = M[0xC340 + x] - M[0xC346 + x];
      let v = t & 255, c = t < 0 ? 0 : 1;
      M[0x83 + x] = v; M[0x0179 + x] = v; M[0x18] = v;
      t = M[0xC343 + x] - M[0xC349 + x] - (1 - c); M[0x15] = t & 255; c = t < 0 ? 0 : 1;
      t = M[0xC3CE + x] - M[0xC3D1 + x] - (1 - c); M[0x16] = t & 255;
      t = M[0x15] - M[0x0E]; M[0x017C + x] = t & 255; M[0x15] = t & 255; c = t < 0 ? 0 : 1;
      const hi = (M[0x16] - (1 - c)) & 255;
      M[0xC3D4 + x] = hi;
      let lo = -1;
      if (hi === 0) lo = M[0x15] < 0x14 ? M[0x15] : 0x14;
      else if (!(hi & 0x80)) lo = 0x14;
      else if (hi === 0xFF && M[0x15] >= 0xFD) lo = M[0x15];
      let air = false;
      if (lo < 0) { M[0x83 + x] = 0; M[0x86 + x] = 0xFD; air = true; }
      else {
        M[0x86 + x] = lo; M[0x19] = lo;
        t = M[0x18] - M[0x0142 + x]; M[0x14] = t & 255;
        let a = (M[0x19] - M[0x0145 + x] - (t < 0 ? 1 : 0)) & 255;
        const s = P.ADD16_18({ a });
        a = s.a;
        if (a & 0x80) air = true;
        else {
          M[0x0148 + x] = M[0x14];
          M[0x17] = a;
          if (a >= 4 && M[0x014B + x] < 2) M[0xC3BC]++;
          M[0x014B + x] = a;
          const d = (a - M[0xC38B]) & 255;
          if (!(d & 0x80) && d >= 7) {
            if (d >= M[0xC35C]) M[0xC35C] = d;
            let e = (d - 6) & 255;
            M[0xE1] = (M[0xE1] + 1) & 255;
            if (M[0xE1] < M[0x209B]) {
              if (e >= 0x80) e = 0x7F;
              M[0x15] = e;
              let u = (e >> 1) + e;
              u = (u & 255) + M[0xC3C3 + x];
              M[0xC3C3 + x] = u > 255 ? 0xFF : u;
              M[0xC352] = 0x80;
            }
            if (M[0x17] >= 0x12) { M[0x0148 + x] = 0xFF; M[0x014B + x] = 0x11; }
            else M[0x014B + x] = M[0x17];
          } else M[0xE1] = 0;
        }
      }
      if (air) { M[0x0148 + x] = 0; M[0x014B + x] = 0; M[0xE1] = 0; }
      M[0x0142 + x] = M[0x83 + x]; M[0x0145 + x] = M[0x86 + x];
    }
    // the springs' sum, the front pair's halved, then with the rear's, halved again
    let t = M[0x0148] + M[0x0149];
    let h = half((M[0x014B] + M[0x014C] + (t >> 8)) & 255, t & 255);
    M[0x51] = h.lo; M[0x77] = h.hi;
    t = M[0x51] + M[0x014A];
    h = half((M[0x77] + M[0x014D] + (t >> 8)) & 255, t & 255);
    M[0x0160] = h.lo; M[0x0161] = h.hi;
    P.WHEEL_LEVERS({});
    // three times the front pair's difference, at most 16 either way
    t = M[0x0148] - M[0x0149];
    M[0x16] = t & 255; M[0x14] = t & 255;
    M[0x17] = (M[0x014B] - M[0x014C] - (t < 0 ? 1 : 0)) & 255; M[0x15] = M[0x17];
    let c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255; M[0x15] = ((M[0x15] << 1) | c) & 255;
    t = M[0x16] + M[0x14]; M[0x14] = t & 255;
    let a = (M[0x17] + M[0x15] + (t >> 8)) & 255;
    M[0x17] = a;
    let o = P.NEG16_IF_MINUS({ a, n: a >> 7 });
    a = o.a;
    if (a >= 0x10) { M[0x14] = 0; a = 0x10; }
    o = P.NEG16_IF_MINUS({ a, n: M[0x17] >> 7 });
    M[0x0167] = o.a; M[0x0166] = M[0x14];
    // the front pair's mean less the rear's
    t = M[0x51] - M[0x014A]; M[0x014E] = t & 255;
    M[0x014F] = (M[0x77] - M[0x014D] - (t < 0 ? 1 : 0)) & 255;
    M[0x6A] = M[0x0161] | M[0x0160];
    if (!M[0x6A] && !M[0x2F]) holdOnSlope();
    P.CRANE({});
    M[0xE4] = M[0x0175];
    P.OPP_PUSH({});
    if (M[0xC3BC]) P.EFFECT({ a: 3 });
    return {};
  };
  // $0C1D, in WHEELS_ON_ROAD with no wheel on the road and the car not hanging from the crane: the
  // pitch's torque ($014E) kept from going past a limit, set by the pitch ($0124) and the track
  // (on Roller Coaster and Ski Jump, nose down, a smaller one)
  const holdOnSlope = () => {
    let x = 0x80, y = 0xFF;
    const p = M[0x0124];
    if (p & 0x80) {
      if (M[0xC77D] === 7) x = 0xF0;
      else if (M[0xC77D] === 4) x = 0xF8;
      else return {};
    } else if (p >= 0x10) { x = 0; y = 0xFF; }
    const t = x - M[0x014E];
    const hi = (y - M[0x014F] - (t < 0 ? 1 : 0)) & 255;
    if (!(hi & 0x80)) return {};
    if ((M[0x0112] & 0x80) && M[0x0112] < 0xFF) return {};
    M[0x014E] = x; M[0x014F] = y;
    return {};
  };

  // SPRINGS ($0C71): the wheels' pull on the car ($015B, $015C, $015A and their high bytes) from
  // the springs, the grip ($0150/$0151, worn down by $0159 while both are positive) limited by the
  // road's hold (ROAD_HOLD), and the levers ($0170-$0175)
  P.SPRINGS = r => {
    let t = M[0x013D] + M[0x0171]; M[0x015B] = t & 255;
    M[0x015E] = (M[0x0140] + M[0x0174] + (t >> 8)) & 255;
    if (!((M[0x0151] | M[0x0159]) & 0x80) && M[0x0150]) {
      t = M[0x0150] - M[0x0159]; M[0x0150] = t & 255;
      if (t < 0) M[0x0151] = (M[0x0151] - 1) & 255;
    }
    M[0x14] = M[0x0150];
    let o = P.NEG16_IF_MINUS({ a: M[0x0151], n: M[0x0151] >> 7 });
    M[0x17] = o.a; M[0x16] = M[0x14];
    P.ROAD_HOLD({});
    t = M[0x16] - M[0x14];
    const c = (M[0x17] - M[0x15] - (t < 0 ? 1 : 0)) >= 0;
    if (c) {
      o = P.NEG16_IF_MINUS({ a: M[0x15], n: M[0x0151] >> 7 });
      M[0x0151] = o.a; M[0x0150] = M[0x14];
    }
    t = M[0x0150] + M[0x0172]; M[0x14] = t & 255;
    M[0x15] = (M[0x0151] + M[0x0175] + (t >> 8)) & 255;
    t = M[0x14] + M[0x013E]; M[0x015C] = t & 255;
    M[0x015F] = (M[0x15] + M[0x0141] + (t >> 8)) & 255;
    return P.SIDE_GRIP({});
  };
  // SPIN_FORCES ($0CF2): the torques: about the first axis ($0118/$011E) the springs' pitch
  // ($014E) less a sixteenth of the spin, plus a quarter of the side pull ($015C) when on the road;
  // about the third ($011A/$0120) the roll ($0166) less a sixteenth of the spin
  P.SPIN_FORCES = r => {
    M[0x14] = M[0x010C];
    let o = P.SHIFT16({ a: M[0x0112], y: 4 });
    M[0x15] = o.a;
    let t = M[0x014E] - M[0x14]; M[0x16] = t & 255;
    M[0x17] = (M[0x014F] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    M[0x14] = 0;
    let a = 0;
    if (M[0x6A]) {
      M[0x14] = M[0x015C];
      o = P.NEG16_IF_MINUS({ a: M[0x015F], n: M[0x015F] >> 7 });
      o = P.SHIFT16({ a: o.a, y: 2 });
      o = P.NEG16_IF_MINUS({ a: o.a, n: M[0x015F] >> 7 });
      a = o.a;
    }
    M[0x15] = a;
    t = M[0x16] + M[0x14]; M[0x0118] = t & 255;
    M[0x011E] = (M[0x17] + M[0x15] + (t >> 8)) & 255;
    M[0x14] = M[0x010E];
    o = P.SHIFT16({ a: M[0x0114], y: 4 });
    M[0x15] = o.a;
    t = M[0x0166] - M[0x14]; M[0x011A] = t & 255;
    M[0x0120] = (M[0x0167] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    return {};
  };
  // SIDE_GRIP ($0D60): the pull along the road ($015A/$015D): the spring's ($013C, $0170) less the
  // grip's ($0154/$0157), held to what the road can take (ROAD_HOLD); $C3C6 bit 7 says it slid
  P.SIDE_GRIP = r => {
    let t = M[0x013C] + M[0x0170]; M[0x51] = t & 255;
    M[0x77] = (M[0x013F] + M[0x0173] + (t >> 8)) & 255;
    t = M[0x51] - M[0x0154]; M[0x14] = t & 255;
    let a = (M[0x77] - M[0x0157] - (t < 0 ? 1 : 0)) & 255;
    let o = P.NEG16_IF_MINUS({ a, n: a >> 7 });
    M[0x17] = o.a; M[0x16] = M[0x14];
    P.ROAD_HOLD({});
    t = M[0x16] - M[0x14];
    const c = (M[0x17] - M[0x15] - (t < 0 ? 1 : 0)) >= 0;
    if (c) {
      o = P.NEG16_IF_MINUS({ a: M[0x15], n: M[0x0157] >> 7 });
      M[0x15] = o.a;
      t = M[0x51] - M[0x14]; M[0x015A] = t & 255;
      M[0x015D] = (M[0x77] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
      M[0xC3C6] = 0x80;
      return { a: 0x80 };
    }
    t = M[0x0170] - M[0x0154]; M[0x015A] = t & 255;
    M[0x015D] = (M[0x0173] - M[0x0157] - (t < 0 ? 1 : 0)) & 255;
    M[0xC3C6] = 0;
    return { a: 0 };
  };
  // ROAD_HOLD ($0DCD): how hard the road can push sideways, in $14/$15: twice the lever $0171/$0174
  // when a wheel is on the road and that is positive, else 0
  P.ROAD_HOLD = r => {
    if (M[0x6A] && !(M[0x0174] & 0x80)) {
      const v = ((M[0x0174] << 8 | M[0x0171]) << 1) & 0xFFFF;
      M[0x14] = v & 255; M[0x15] = v >> 8;
      return { a: M[0x15] };
    }
    M[0x14] = 0; M[0x15] = 0;
    return { a: 0 };
  };

  // DRAG ($0DE8): the forces each lose a part of the velocity: $C350 of it, shifted by 2, 4 or 6
  // places: the road's friction from the springs on the road ($0154-$0159), less when boosting
  // ($C308) with the engine on ($C36A clear), and a fixed $C0 in the air, on a steep slide ($E4), at
  // a wreck ($6B), or at the start
  P.DRAG = r => {
    let y = 2, a = -1;
    const calc = () => {
      for (let x = 2; x >= 0; x--) {
        M[0x14] = M[0x0154 + x];
        const o = P.NEG16_IF_MINUS({ a: M[0x0157 + x], n: M[0x0157 + x] >> 7 });
        const c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
        M[0x15 + x] = ((o.a << 1) | c) & 255;
      }
      y = 6;
      a = Math.max(M[0x15], M[0x16], M[0x17]);
      if ((M[0xC308] & 0x80) && !(M[0xC36A] & 0x80)) { a -= 0x14; if (a < 0) a = 0; }
    };
    if (M[0x6A]) {
      let e = M[0xE4]; if (e & 0x80) e ^= 0xFF;
      if (e >= 3 || (M[0x6B] & 0x80)) a = 0xC0;
      else if (M[0x0E] || M[0x2F]) { y = 4; a = 0xC0; }
      else calc();
    } else if (M[0x2F]) { y = 4; a = 0xC0; }
    else calc();
    M[0xC350] = a; M[0x1A] = y;
    for (let x = 2; x >= 0; x--) {
      M[0x15] = M[0xC350]; M[0x14] = M[0x0109 + x];
      let o = P.MUL_S16_U8({ a: M[0x010F + x] });
      o = P.SHIFT16({ a: o.a, y: M[0x1A] });
      M[0x15] = o.a;
      const t = M[0x0115 + x] - M[0x14]; M[0x0115 + x] = t & 255;
      M[0x011B + x] = (M[0x011B + x] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    }
    return { x: 0xFF };
  };

  // WHEEL_LEVERS ($0E73): the three wheels' heights ($0179-$017E, $C3D4) divided by 8; the pitch
  // and roll they make, as sines ($0178, $0176) turned into cosines by the table at $B080 ($44,
  // $91, $8F, $90); and the springs' sum ($0160) along each axis ($0170-$0175)
  P.WHEEL_LEVERS = r => {
    M[0x0177] = 0;
    for (let x = 2; x >= 0; x--) {
      for (let y = 3; y; y--) {
        const c1 = M[0xC3D4 + x] & 1; M[0xC3D4 + x] >>= 1;
        const c2 = M[0x017C + x] & 1; M[0x017C + x] = (M[0x017C + x] >> 1) | (c1 << 7);
        M[0x0179 + x] = (M[0x0179 + x] >> 1) | (c2 << 7);
      }
    }
    let t = M[0x0179] + M[0x017A]; M[0x14] = t & 255;
    let h = half((M[0x017C] + M[0x017D] + (t >> 8)) & 255, M[0x14]);
    M[0x14] = h.lo; M[0x15] = h.hi;
    t = M[0x14] - M[0x017B]; M[0x14] = t & 255;
    h = half((M[0x15] - M[0x017E] - (t < 0 ? 1 : 0)) & 255, M[0x14]);
    M[0x14] = h.lo;
    M[0x0178] = h.hi ^ 0x80;
    P.COSINE_OF({ a: h.hi });
    M[0x44] = M[0x57]; M[0x91] = M[0x56];
    t = M[0x0179] - M[0x017A]; M[0x14] = t & 255;
    const a = (M[0x017C] - M[0x017D] - (t < 0 ? 1 : 0)) & 255;
    M[0x0176] = a;
    P.COSINE_OF({ a });
    M[0x15] = M[0x44];
    M[0x90] = P.MUL8({ a: M[0x57] }).a;
    M[0x8F] = P.MUL8({ a: M[0x56] }).a;
    for (let x = 2; x >= 0; x--) {
      M[0x15] = M[0x8F + x]; M[0x5A] = M[0x0176 + x];
      M[0x14] = M[0x0160];
      const o = P.MUL_S16_S8({ a: M[0x0161] });
      M[0x0173 + x] = o.a; M[0x0170 + x] = M[0x14];
    }
    return { x: 0xFF };
  };
  // COSINE_OF ($0F12): the size of the signed 16 bits in A:$14, as a byte ($FF when past 255) in
  // $56, and the cosine of the angle with that sine from the table at $B080 in $57
  P.COSINE_OF = r => {
    const o = P.NEG16_IF_MINUS({ a: r.a & 255, n: (r.a >> 7) & 1 });
    const x = o.a === 0 ? M[0x14] : 0xFF;
    M[0x56] = x;
    M[0x57] = M[0xB080 + (x >> 1)];
    return { a: M[0x57], x: x >> 1 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
