// The crack, the controls and the opponent ($1B88-$2457): the crack across the top of the frame
// grown to the damage, the joystick read into the steering and the throttle, the horizon drawn
// when the car is high, and the opponent's car: how it picks its line across the road, how fast it
// goes, its three wheels' springs, and the bump when the two cars meet.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.opponent = P => {
  const M = P.M;

  // CRACK ($1B88): grows the crack across the top of the frame, a pixel pair at a time, until its
  // length $25 reaches the damage $C3CB: each step wanders up or down a row at random (rows 3 to
  // 5 of the frame's top line, $1C15), cuts a notch three rows deep into the bitmap at $6026 and
  // goes on; a step into a gap already open takes the damage up by one instead (SET_DAMAGE). The
  // crack reaching the far side ($78), or the damage $80, wrecks the car (WRECK).
  P.CRACK = r => {
    for (;;) {
      if (M[0xC3CB] <= M[0x25]) return { a: M[0xC3CB] };
      M[0x25] = (M[0x25] + 1) & 255;
      let y = M[0x1C15];
      let a = P.RANDOM({}).a & 255;
      let c = a & 1; a >>= 1;
      if (c) {
        c = a & 1; a >>= 1;
        let up = false, down = false;
        if (c) {
          if (y < 5) up = true;
          else { c = a & 1; a >>= 1; if (c) { y--; up = true; } else down = true; }
        } else down = true;
        if (down && !up) {
          if (y >= 3) y--;
          else { c = a & 1; a >>= 1; if (!c) up = true; else { y++; y--; } }
        }
        if (up) y++;
        y &= 255;
      }
      M[0x1C15] = y;
      if (M[0x25] >= 0x78) { M[0x25]--; return P.WRECK({}); }
      const x = M[0x25] & 3;
      y = ((M[0x25] << 1) & 0xF8) | M[0x1C15];
      if (M[0x6028 + y] & M[0x1C1A + x]) {
        const k = M[0x1C16 + x];
        M[0x6028 + y] &= k;
        M[0x6027 + y] &= k;
        M[0x6026 + y] = (M[0x6026 + y] & k) | M[0x1C1A + x];
      } else {
        M[0xC3CB] = (M[0xC3CB] + 1) & 255;
        if (M[0xC3CB] & 0x80) return P.WRECK({});
        P.SET_DAMAGE({});
      }
    }
  };
  // SET_DAMAGE ($1C08): each point's damage ($C3C3-$C3C5) set to twice the mean ($C3CB)
  P.SET_DAMAGE = r => {
    for (let y = 2; y >= 0; y--) M[0xC3C3 + y] = (M[0xC3CB] << 1) & 255;
    return { y: 0xFF };
  };
  // CMD_CRANE_CHAINS ($1C1E): command $3F
  P.CMD_CRANE_CHAINS = r => P.DISPATCH({ a: 0x3F, x: r.x, y: r.y });
  // CLEAR_PANEL ($1C23): clears the menus' panel in the bitmap at $4000: sixteen character rows of
  // 28 characters from $4B60
  P.CLEAR_PANEL = r => {
    let p = 0x4B60;
    for (let x = 0x10; x; x--) {
      for (let y = 0xDF; y >= 0; y--) M[p + y] = 0;
      p = (p + 0x140) & 0xFFFF;
    }
    M[0x1E] = p & 255; M[0x1F] = p >> 8;
    return { a: M[0x1F], x: 0, y: 0xFF };
  };
  // RACE_SCREEN ($1C49): the screen for a race: eight rows filled (command $55), $3A3C, and the
  // dashboard unpacked (command $32)
  P.RACE_SCREEN = r => {
    M[0x52] = 8;
    P.DISPATCH({ a: 0x55, x: 0, y: 0x40 });
    P.HLINE_SCREEN({ a: 0x20, x: 0x38, y: 0x5F });
    return P.DISPATCH({ a: 0x32 });
  };
  // CONTROLS ($1C64): the joystick ($F79E, into $66): left and right steer ($C5 = $F1 or $0F)
  // while a spring is pressed; fire ($C398, 0 while held) is the boost; forward sets the engine
  // to drive ($0150/$0151 from $C384/$C385) and keeps it driving after it is let go ($C39B),
  // back brakes ($FF10) until forward again. Nothing while the car is lowered, dropped or past
  // $78 along the road. Then $F60F.
  P.CONTROLS = r => {
    P.s_F79E({});
    let a = M[0x6A];
    if (a) {
      a = M[0x2F];
      if (!a) {
        a = M[0x66] & 0x0C;
        if (a) a = a === 4 ? 0xF1 : 0x0F;
      }
    }
    M[0xC5] = a;
    M[0xC398] = (M[0x66] & 0x10) ^ 0x10;
    let x = 0, y = 0;
    const s = M[0x0159];
    if (!(!(s & 0x80) && s >= 0x78) && !M[0x2F] && !M[0x0E]) {
      const j = M[0x66] & 3;
      let drive = false;
      if (j === 1) drive = true;
      else if (j > 1) { x = 0x10; y = 0xFF; M[0xC39B] = 0; }
      else if (M[0xC39B] & 0x80) drive = true;
      if (drive) { x = M[0xC384]; y = M[0xC385]; M[0xC39B] = 0x80; }
    }
    M[0x0150] = x; M[0x0151] = y;
    P.s_F60F({});
    return {};
  };
  // HORIZON ($1CCB): with $C359 set, in place of the view's column limits: a line across the
  // whole view (points 2 and 3 from -376 to 632 across, at the height the pitch gives, $33/$69)
  // in colour $2C, then $3D; $C365 keeps the roll's sign ($0124) for it
  P.HORIZON = r => {
    M[0xC365] = M[0x0124] & 0x80;
    M[0xA29B] = 2; M[0xA29A] = 0xFE; M[0xA202] = 0x88; M[0xA203] = 0x78;
    let x = 3;
    do {
      M[0xA330 + x] = 0;
      const t = 0 - M[0x33];
      M[0xA24C + x] = t & 255;
      M[0xA2E4 + x] = (1 - M[0x69] - (t < 0 ? 1 : 0)) & 255;
      P.ROLL_POINT({ x });
      x--;
    } while (x >= 2);
    P.s_FC16({ a: 0x2C });
    P.s_FE91({ x: 2, y: 3 });
    P.s_FC16({ a: 0x3D });
    M[0xC365] = (M[0xC365] << 1) & 255;
    return {};
  };
  // CMD_DRAWBRIDGE ($1D18): command $3C, on Draw Bridge (track 5) only
  P.CMD_DRAWBRIDGE = r => M[0xC77D] === 5 ? P.DISPATCH({ a: 0x3C, x: r.x, y: r.y }) : { a: M[0xC77D] };

  // OPPONENT_LINE ($1D25): where across the road the opponent aims ($2C, from its place $B0):
  // when it is close ($39/$3A, the distance between the cars) it may slow behind ($209C), hold the
  // player's line ($2B, a driver with bit 1 of its flags at $AEE0) or go round the player
  // (LINE_ROUND, LINE_PASS); otherwise its own line, $40 or $6E across (by bit 3 of its flags),
  // mirrored for the odd-numbered drivers; the middle ($80) when either of the next two pieces
  // says so ($B240). Then it steers $B0 towards $2C, by ten a pass ($C357 can force a way), while
  // a wheel is on the road ($C9), between $20 and $E0. $C308 is set while the cars are close
  // (within $40) and either the opponent is ahead ($C36A bit 7) or they are in line (less than
  // $32 apart across): the car in front then has less drag.
  P.OPPONENT_LINE = r => {
    let x = M[0xC773];
    let y = 0;
    M[0xC308] = 0;
    let a = M[0xB0];
    M[0x2C] = a;
    const t = a - M[0x2B];
    a = t & 255;
    if (t < 0) { a = (-a) & 255; y = 0xFF; }
    M[0x51] = a; M[0x77] = y;
    let to = 0;
    const L1DCB = 1, L1DE1 = 2, L1E00 = 3;
    if (M[0x3A]) to = L1DCB;
    else {
      a = M[0x39];
      if (a < 0x40 && ((M[0xC36A] & 0x80) || M[0x51] < 0x32)) M[0xC308] = 0xFF;
      let near = false;
      if (a < 0x10 && M[0x51] < 0x32) {
        if (M[0xB8] < 1) near = true;
        else if (M[0xB8] === 1 && M[0xB7] < 0x80) near = true;
      }
      let go86 = false;
      if (near) { P.OPP_BUMP({ x }); go86 = true; }
      else {
        M[0xC369] = 0; M[0xE0] = 0;
        a = M[0x39];
        if (a < 0x18) go86 = true;
        else if (M[0xC36A] & 0x80) { P.LINE_PASS({}); to = L1E00; }
        else if (a < 0x32) {
          if (M[0xAEE0 + x] & 2) P.LINE_HOLD({}); else P.LINE_PASS({});
          to = L1DE1;
        } else if (a >= 0xC8 || !(M[0xAEE0 + x] & 0x20)) to = L1DCB;
        else { P.LINE_PASS({}); to = L1DE1; }
      }
      if (go86) {
        if ((M[0xAEE0 + x] & 8) && !(M[0xC36A] & 0x80) && M[0x39] >= 0x0E) to = L1DCB;
        else { P.LINE_ROUND({}); to = L1E00; }
      }
    }
    if (to === L1DCB) {
      y = (M[0xAEE0 + x] & 8) ? 0x6E : 0x40;
      if (x & 1) y ^= 0xFF;
      M[0x2C] = y;
      to = L1DE1;
    }
    if (to === L1DE1) {
      M[0x16] = 2;
      x = M[0xC375]; M[0x2E] = x;
      do {
        if (M[0xB240 + (M[0x0400 + x] & 0x0F)] & 0x80) M[0x2C] = 0x80;
        x = P.PIECE_AHEAD({}).x;
      } while (--M[0x16]);
    }
    // steer
    a = M[0xC357];
    let step = 0;
    if (a & 0x80) step = a >= 0xF0 ? 0 : 0xF6;
    else if (a) step = a < 0x10 ? 0 : 0x0A;
    else {
      const d = M[0x2C] - M[0xB0];
      a = d & 255;
      if (!a) return {};
      if (d >= 0) step = a < 0x10 ? 0 : 0x0A;
      else step = a >= 0xF0 ? 0 : 0xF6;
    }
    if (!step) return {};
    a = (step + M[0xB0]) & 255;
    if (!M[0xC9]) return {};
    if (a >= 0xE1 || a < 0x20) return {};
    M[0xB0] = a;
    return {};
  };
  // LINE_ROUND ($1E30): aims $20 or $E0 across, away from the player's side ($77), when the cars
  // are within $38 across
  P.LINE_ROUND = r => {
    if (M[0x51] >= 0x38) return {};
    M[0x2C] = (M[0x77] & 0x80) ? 0x20 : 0xE0;
    return {};
  };
  // LINE_PASS ($1E3C): aims $20 or $E0 across, to pass the player on the side with more room
  P.LINE_PASS = r => {
    if (M[0x51] >= 0x38) return {};
    const a = M[0x2B];
    if (M[0x77] & 0x80) M[0x2C] = a < 0x60 ? 0xE0 : 0x20;
    else M[0x2C] = a >= 0xA0 ? 0x20 : 0xE0;
    return {};
  };
  // LINE_HOLD ($1E5A): aims at the player's line ($2B)
  P.LINE_HOLD = r => { M[0x2C] = M[0x2B]; return { a: M[0x2B] }; };
  // PIECE_FROM_HERE ($1E5F): the first piece from the player's ($C374) on round the track whose
  // number at $044E is A, or $FF; X is kept
  P.PIECE_FROM_HERE = r => {
    const x0 = r.x & 255;
    M[0x1E84] = x0;
    const a = x0;
    let x = M[0xC374];
    if (x < M[0xC764]) {
      do {
        if (a === M[0x044E + x]) return { a: x, x: x0 };
        x++;
        if (x >= M[0xC764]) x = 0;
      } while (x !== M[0xC374]);
    }
    return { a: 0xFF, x: x0 };
  };
  // OPPONENT_MOVE ($1E85): while the opponent races ($C37C): its piece's place ($F02F), its
  // wheels (OPP_WHEELS), a swerve (SWERVE), its engine (OPP_ENGINE, OPP_GRIP, OPP_SPEED), then it
  // moves along the road by its speed ($D6/$D7) times $BD, in $A1/$23/$C4, on to the next piece
  // ($C375) when $C4 passes the piece's length $BE
  P.OPPONENT_MOVE = r => {
    if (!M[0xC37C]) return { a: 0 };
    P.s_F02F({ x: M[0xC375] });
    P.OPP_WHEELS({});
    P.SWERVE({});
    P.OPP_ENGINE({});
    P.OPP_GRIP({});
    P.OPP_SPEED({});
    M[0x15] = M[0xBD]; M[0x14] = M[0xD6];
    let o = P.MUL_S16_U8({ a: M[0xD7] });
    o = P.A_TO_15({ a: o.a });
    o = P.SHIFT16({ a: M[0x15], y: 0xFD });
    M[0x15] = o.a;
    let t = M[0xA1] + M[0x14]; M[0xA1] = t & 255;
    t = M[0x23] + M[0x15] + (t >> 8); M[0x23] = t & 255;
    t = M[0xC4] + M[0x2D] + (t >> 8);
    M[0xC4] = t & 255;
    if (M[0xC4] < M[0xBE]) return {};
    M[0xC4] = (M[0xC4] - M[0xBE]) & 255;
    let x = M[0xC375] + 1;
    if (x >= M[0xC764]) x = 0;
    M[0xC375] = x;
    return { x };
  };
  // OPP_DROP ($1EE2): the opponent lowered onto the track ($E4DA): its three wheels' heights set to
  // the road's plus $68 to $E7 at random
  P.OPP_DROP = r => {
    P.s_E4DA({});
    M[0x14] = ((P.RANDOM({}).a & 0x7F) + 0x68) & 255;
    for (let x = 3; x >= 0; x--) {
      const t = M[0x07EC + x] + M[0x14];
      M[0x07CC + x] = t & 255;
      M[0x07D0 + x] = (M[0x07F0 + x] + (t >> 8)) & 255;
    }
    return { x: 0xFF };
  };
  // OPP_PICK ($1F06): the opponent's limits for the race, at random from its track's ranges (the
  // second set while $C71A is set): the top speed at $2099 ($BFAA/$BFB2), $209A ($BFBA/$BFC2)
  // and $209B ($C774/$C775); kept while $31A1 and $C77F are both set. RANDOM is first run 256
  // times.
  P.OPP_PICK = r => {
    if (M[0x31A1] && M[0xC77F]) return {};
    let x = 0;
    do { P.RANDOM({}); x = (x - 1) & 255; } while (x);
    let a = M[0xC77D], y = M[0xC774];
    if (M[0xC71A]) { a = (a + 0x20) & 255; y = M[0xC775]; }
    x = a;
    M[0x209B] = y;
    M[0x2099] = ((P.RANDOM({}).a & M[0xBFAA + x]) + M[0xBFB2 + x]) & 255;
    M[0x209A] = ((P.RANDOM({}).a & M[0xBFBA + x]) + M[0xBFC2 + x]) & 255;
    return { x };
  };
  // OPP_SPEED ($1F48): the opponent's speed $D6/$D7: the engine's push ($C3B6/$C3B7, less what it
  // loses climbing, $B2) less a drag of its speed squared over 64 (its speed less 20 while it is
  // in front and close, $C308), and while a wheel is on the road the slope's pull from its wheels'
  // heights ($07EC-$07F2); never below 0
  P.OPP_SPEED = r => {
    M[0x17] = 0; M[0x16] = 0;
    const skip = (M[0xD7] & 0x80) !== 0;
    if (!skip) {
      let a = ((M[0xD7] << 1) | (M[0xD6] >> 7)) & 255;
      if ((M[0xC308] & 0x80) && (M[0xC36A] & 0x80)) { a -= 0x14; if (a < 0) a = 0; }
      M[0x15] = a;
      let o = P.MUL8({ a: M[0xD7] });
      a = o.a;
      for (let i = 0; i < 2; i++) {
        let c = M[0x14] >> 7; M[0x14] = (M[0x14] << 1) & 255;
        const c2 = a >> 7; a = ((a << 1) | c) & 255;
        M[0x17] = ((M[0x17] << 1) | c2) & 255;
      }
      M[0x16] = a;
      if (M[0xC9] && !(M[0xC3B7] & 0x80)) {
        let yy = M[0xC3B7];
        let t = M[0xC3B6] - M[0xD7];
        if (t < 0) yy--;
        a = t & 255;
        if (M[0xB2] & 0x80) {
          t = a - M[0xD7]; if (t < 0) yy--; a = t & 255;
          t = a - 0x23; if (t < 0) yy--; a = t & 255;
        }
        M[0xC3B6] = a; M[0xC3B7] = yy & 255;
      }
    }
    let t = M[0xC3B6] - M[0x16];
    M[0x16] = t & 255; M[0x14] = t & 255;
    t = M[0xC3B7] - M[0x17] - (t < 0 ? 1 : 0);
    M[0x17] = t & 255;
    let a;
    if (M[0xC9]) {
      // the front wheels' mean road height, the sum's carry shifted back in at the top
      t = M[0x07EC] + M[0x07ED]; M[0x14] = t & 255;
      const h = M[0x07F0] + M[0x07F1] + (t >> 8);
      a = ((h >> 8) << 7) | ((h & 255) >> 1);
      M[0x14] = ((h & 1) << 7) | (M[0x14] >> 1);
      M[0x15] = a;
      t = M[0x14] - M[0x07EE]; M[0x14] = t & 255;
      t = M[0x15] - M[0x07F2] - (t < 0 ? 1 : 0);
      M[0x18] = t & 255;
      let o = P.NEG16_IF_MINUS({ a: t & 255, n: (t >> 7) & 1 });
      a = o.a;
      if (a >= 2) a = 0xFF;
      else { const c = a & 1; a >>= 1; M[0x14] = (M[0x14] >> 1) | (c << 7); a = M[0x14]; }
      M[0x14] = a;
      t = (a >> 2) + M[0x14];
      M[0x14] = t & 255;
      a = t >> 8;
      o = P.NEG16_IF_MINUS({ a, n: (M[0x18] >> 7) & 1 });
      M[0x15] = o.a;
      t = M[0x16] + M[0x14]; M[0x14] = t & 255;
      a = (M[0x17] + M[0x15] + (t >> 8)) & 255;
    } else a = M[0x17];
    const o = P.A_TO_15({ a });
    t = o.a + M[0xD6];
    M[0xD6] = t & 255;
    a = (M[0xD7] + M[0x15] + (t >> 8)) & 255;
    if (a & 0x80) a = 0;
    M[0xD7] = a;
    return { a };
  };
  // OPP_ENGINE ($201B): the engine's push $C3B6/$C3B7 from $C386/$C387, 25 less while it swerves
  // ($C30F), none while no wheel is on the road ($C9)
  P.OPP_ENGINE = r => {
    let a = M[0xC386], y = M[0xC387];
    if (M[0xC30F]) a = (a - 0x19) & 255;
    if (!M[0xC9]) { a = 0; y = 0; }
    M[0xC3B6] = a; M[0xC3B7] = y;
    return { a, y };
  };
  // OPP_GRIP ($2037): while a wheel is on the road: the piece's speed limit ($0710, or the
  // opponent's own at $2099 when lower and the piece does not insist, bit 7) against its speed
  // $D7: over it, the engine's push is reversed ($C3C7 set); far over it or under, the push is
  // doubled, except just under a limit it has reached
  P.OPP_GRIP = r => {
    if (!M[0xC9]) return { a: 0 };
    const x = M[0xC375];
    let a = M[0x0710 + x];
    if (!(a & 0x80) && a >= M[0x2099]) a = M[0x2099];
    a &= 0x7F;
    M[0xE3] = a;
    const t = M[0xD7] - M[0xE3];
    M[0x15] = t & 255;
    if (t >= 0) {
      if (t === 0) { M[0xC3C7] = 0x80; return { a: 0x80 }; }
      M[0xC3C7] = 0x80;
      let u = 0 - M[0xC3B6]; M[0xC3B6] = u & 255;
      M[0xC3B7] = (0 - M[0xC3B7] - (u < 0 ? 1 : 0)) & 255;
      if (M[0x15] < 0x0E) return {};
    }
    // $2077
    if (!(M[0x0710 + x] & 0x80) && (M[0x15] & 0x80) && M[0xC3C7]) {
      if (M[0x15] >= 0xFE) return {};
      M[0xC3C7] = (M[0xC3C7] << 1) & 255;
    }
    const c = M[0xC3B6] >> 7;
    M[0xC3B6] = (M[0xC3B6] << 1) & 255;
    M[0xC3B7] = ((M[0xC3B7] << 1) | c) & 255;
    return {};
  };
  // OPP_BUMP ($209C): the cars meet: while the opponent races and is in the air or the player's
  // springs are free, and its middle wheel is within $C0 of the player's height ($46/$64, plus
  // $28), three times ($C369) it pushes the player's car up ($0180/$0183); close beside, sideways
  // ($0182); and along by the difference of the speeds ($0181/$0184), once a bump ($E0); then the
  // pushes' sum, plus 2, is added to each point's damage ($C3C3-$C3C5) and $C352 set
  P.OPP_BUMP = r => {
    if (!M[0xC37C]) return { a: 0 };
    let skipUp = false;
    if (M[0xC9] && M[0x6A]) skipUp = true;
    if (!skipUp) {
      let t = M[0x46] - M[0x07CC]; M[0x14] = t & 255;
      M[0x17] = (M[0x64] - M[0x07D0] - (t < 0 ? 1 : 0)) & 255;
      t = M[0x14] + 0x28; M[0x14] = t & 255;
      M[0x17] = (M[0x17] + (t >> 8)) & 255;
      const o = P.NEG16_IF_MINUS({ a: M[0x17], n: (M[0x17] >> 7) & 1 });
      if (o.a || M[0x14] >= 0xC0) { M[0xC369] = 3; return { a: 3 }; }
      if (M[0xC369]) {
        M[0xC369]--;
        t = 0 - M[0x14]; M[0x14] = t & 255;
        let a = (1 - 0 - (t < 0 ? 1 : 0)) & 255;
        const n = (M[0x17] >> 7) & 1;
        let o2 = P.NEG16_IF_MINUS({ a, n });
        o2 = P.SHIFT16({ a: o2.a, y: 0xFC });
        M[0x0183] = o2.a;
        M[0x0180] = M[0x14];
      }
    }
    if (M[0x51] < 0x2D && M[0x39] < 0x08) M[0x0182] = (M[0x77] & 0x80) ? 0x08 : 0xF8;
    if (!(M[0xE0] & 0x80)) {
      let y = 0x03;
      let t = M[0xD6] - M[0x0156]; M[0x14] = t & 255;
      t = M[0xD7] - M[0x0159] - (t < 0 ? 1 : 0);
      let a = t & 255;
      let c = 0;
      if (a & 0x80) { c = 1; y = 0xFD; }
      const c2 = a & 1;
      a = (a >> 1) | (c << 7);
      M[0x14] = (M[0x14] >> 1) | (c2 << 7);
      M[0x15] = y;
      M[0x0184] = (a + M[0x15]) & 255;
      M[0x0181] = M[0x14];
    }
    M[0xC371] = 0x80; M[0xE0] = 0x80;
    M[0x16] = 2;
    for (let y = 2; y >= 0; y--) {
      M[0x14] = M[0x017F + y];
      const v = M[0x0182 + y];
      const o = P.NEG16_IF_MINUS({ a: v, n: (v >> 7) & 1 });
      M[0x16] = (o.a + M[0x16]) & 255;
    }
    for (let y = 2; y >= 0; y--) {
      const t = M[0xC3C3 + y] + M[0x16];
      M[0xC3C3 + y] = t > 255 ? 0xFF : t;
    }
    M[0xC352] = 0x80;
    return { a: 0x80, y: 0xFF };
  };
  // OPP_PUSH ($2176): a bump's pushes ($C371) taken in: the opponent's speed less the push along
  // ($0181/$0184, never below 0), its wheels' heights' speeds less the push up over 16, the
  // player's springs' forces ($0170-$0175) plus the pushes, which are then cleared; sound effect 2
  P.OPP_PUSH = r => {
    if (!M[0xC371]) return { a: 0 };
    M[0xC371] = 0;
    let t = M[0xD6] - M[0x0181]; M[0xD6] = t & 255;
    let a = (M[0xD7] - M[0x0184] - (t < 0 ? 1 : 0)) & 255;
    if (a & 0x80) a = 0;
    M[0xD7] = a;
    M[0x14] = M[0x0180];
    const o = P.SHIFT16({ a: M[0x0183], y: 4 });
    M[0x15] = o.a;
    for (let x = 2; x >= 0; x--) {
      t = M[0x07DC + x] - M[0x14]; M[0x07DC + x] = t & 255;
      M[0x07E0 + x] = (M[0x07E0 + x] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    }
    for (let x = 2; x >= 0; x--) {
      t = M[0x0170 + x] + M[0x017F + x]; M[0x0170 + x] = t & 255;
      M[0x0173 + x] = (M[0x0173 + x] + M[0x0182 + x] + (t >> 8)) & 255;
      M[0x017F + x] = 0; M[0x0182 + x] = 0;
    }
    return P.s_CF68({ a: 2, x: 0xFF });
  };
  // OPP_WHEELS ($21DE): the opponent's three wheels: each one's height ($07CC/$07D0) against the
  // road's under it ($07EC/$07F0) less its spring's length ($28, or $7C on a piece with $B2 bit
  // 7), held to $FFA0 at the lowest; the spring's push ($07C4/$07C8, at most $3FF), and $C9 non-zero
  // while any is on the road; a share of the three pushes' sum and each one's own, over 8, into
  // the wheels' speeds ($07E4/$07E8); a driver with bit 2 of its flags sometimes (one pass in 16)
  // bounces its back wheel ($07DE = $A0) when all are nearly still; the speeds moved into the
  // heights (half of them); then the wheels kept together (OPP_SPREAD) and the opponent's model's
  // points placed ($8040/$A330, points $3C-$3F) from them
  P.OPP_WHEELS = r => {
    M[0xC9] = 0;
    M[0x52] = (M[0xB2] & 0x80) ? 0x7C : 0x28;
    for (let x = 2; x >= 0; x--) {
      let t = M[0x07EC + x] - M[0x07CC + x]; M[0x18] = t & 255;
      let y = (M[0x07F0 + x] - M[0x07D0 + x] - (t < 0 ? 1 : 0)) & 255;
      t = M[0x18] + M[0x52]; M[0x18] = t & 255;
      let a = (y + (t >> 8)) & 255;
      if (a & 0x80) {
        if (a !== 0xFF || M[0x18] < 0xA0) M[0x18] = 0xA0;
        a = 0xFF;
      }
      M[0x19] = a;
      t = M[0x18] - M[0x07D4 + x]; M[0x14] = t & 255;
      const o = P.ADD16_18({ a: (M[0x19] - M[0x07D8 + x] - (t < 0 ? 1 : 0)) & 255 });
      a = o.a;
      if (o.n) { a = 0; M[0x14] = 0; }
      if (a >= 4) { M[0x14] = 0xFF; a = 3; }
      y = a;
      M[0xC9] |= (a | M[0x14]);
      t = M[0x14] - M[0x52]; M[0x07C4 + x] = t & 255;
      M[0x07C8 + x] = (y - (t < 0 ? 1 : 0)) & 255;
      M[0x07D4 + x] = M[0x18]; M[0x07D8 + x] = M[0x19];
    }
    let s16 = 0, s17 = 0;
    for (let x = 2; x >= 0; x--) {
      const t = s16 + M[0x07C4 + x]; s16 = t & 255;
      s17 = (s17 + M[0x07C8 + x] + (t >> 8)) & 255;
    }
    M[0x16] = s16; M[0x17] = s17;
    for (let x = 2; x >= 0; x--) {
      M[0x1A] = M[0x07C4 + x];
      let a = M[0x07C8 + x];
      for (let i = 0; i < 2; i++) {
        const c = M[0x1A] >> 7; M[0x1A] = (M[0x1A] << 1) & 255; a = ((a << 1) | c) & 255;
      }
      M[0x1B] = a;
      let t = M[0x16] + M[0x07C4 + x]; M[0x14] = t & 255;
      M[0x15] = (M[0x17] + M[0x07C8 + x] + (t >> 8)) & 255;
      t = M[0x14] + M[0x1A]; M[0x14] = t & 255;
      a = (M[0x15] + M[0x1B] + (t >> 8)) & 255;
      const o = P.SHIFT16({ a, y: 3 });
      M[0x07E8 + x] = o.a; M[0x07E4 + x] = M[0x14];
    }
    const d = M[0xC773];
    if (M[0xAEE0 + d] & 4) {
      if (!((M[0x07E2] | M[0x07DE] | M[0x07EA] | M[0x07E6]) & 0xFC)) {
        if (!(P.RANDOM({}).a & 0x0F)) M[0x07DE] = 0xA0;
      }
    }
    for (let x = 2; x >= 0; x--) {
      M[0x14] = M[0x07E4 + x];
      let o = P.A_TO_15({ a: M[0x07E8 + x] });
      let t = o.a + M[0x07DC + x];
      M[0x07DC + x] = t & 255; M[0x14] = t & 255;
      const a = (M[0x07E0 + x] + M[0x15] + (t >> 8)) & 255;
      M[0x07E0 + x] = a;
      P.A_TO_15({ a });
      const c = (M[0x15] >> 7) & 1;
      const c2 = M[0x15] & 1;
      M[0x15] = (M[0x15] >> 1) | (c << 7);
      const lo = (M[0x14] >> 1) | (c2 << 7);
      t = lo + M[0x07CC + x]; M[0x07CC + x] = t & 255;
      M[0x07D0 + x] = (M[0x07D0 + x] + M[0x15] + (t >> 8)) & 255;
    }
    M[0x51] = 0x28;
    P.OPP_SPREAD({ a: 1, x: 0, y: 1 });
    M[0x51] = 0x70;
    P.OPP_SPREAD({ a: 1, x: (M[0x17] & 0x80) ? 1 : 0, y: 2 });
    for (let x = 2; x >= 0; x--) {
      const y = M[0x238A + x];
      const t = M[0x07CC + x] + 0x50;
      M[0x8040 + y] = t & 255;
      M[0xA330 + y] = (M[0x07D0 + x] + (t >> 8)) & 255;
    }
    let t = M[0x807E] - M[0x807C]; M[0x14] = t & 255;
    let a = (M[0xA36E] - M[0xA36C] - (t < 0 ? 1 : 0)) & 255;
    const c = (a >> 7) & 1, c2 = a & 1;
    a = (a >> 1) | (c << 7);
    M[0x14] = (M[0x14] >> 1) | (c2 << 7);
    M[0x15] = a;
    t = M[0x807D] + M[0x14]; M[0x807F] = t & 255;
    M[0xA36F] = (M[0xA36D] + M[0x15] + (t >> 8)) & 255;
    t = M[0x807D] - M[0x14]; M[0x807D] = t & 255;
    M[0xA36D] = (M[0xA36D] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    return {};
  };
  // OPP_GAP ($238E): the difference of wheels X and Y's heights, its size in A:$14, its sign in
  // $17's bit 7
  P.OPP_GAP = r => {
    const x = r.x & 255, y = r.y & 255;
    const t = M[0x07CC + x] - M[0x07CC + y]; M[0x14] = t & 255;
    const v = (M[0x07D0 + x] - M[0x07D0 + y] - (t < 0 ? 1 : 0)) & 255;
    M[0x17] = v;
    return Object.assign({ x, y }, P.NEG16_IF_MINUS({ a: v, n: (v >> 7) & 1, c: t >= 0 ? 1 : 0 }));
  };
  // OPP_SPREAD ($23A2): wheels X and Y kept within A:$51 of each other in height: the higher is
  // lowered to it and their speeds averaged (all three's when Y is 2); with Y = 2 and no wheel on
  // the road, when wheel X rises no faster than the back wheel by $10, the car is tilted: the
  // front wheels' speeds up by 4 and the back's down by 4 ($242D/$2430)
  P.OPP_SPREAD = r => {
    let x = r.x & 255, y = r.y & 255;
    M[0x77] = r.a & 255; M[0x52] = x;
    const o = P.OPP_GAP({ x, y });
    M[0x15] = o.a;
    let t = M[0x51] - M[0x14]; M[0x14] = t & 255;
    const a = (M[0x77] - M[0x15] - (t < 0 ? 1 : 0)) & 255;
    if (a & 0x80) {
      M[0x15] = a;
      if (M[0x17] & 0x80) x = y;
      t = M[0x07CC + x] + M[0x14]; M[0x07CC + x] = t & 255;
      M[0x07D0 + x] = (M[0x07D0 + x] + M[0x15] + (t >> 8)) & 255;
      if (y !== 2) return P.OPP_AVERAGE({ x: 0, y });
      P.OPP_AVERAGE({ x: 0, y: 1 });
      P.OPP_AVERAGE({ x: 2, y: 1 });
      P.OPP_AVERAGE({ x: 0, y: 1 });
      y = 2; x = M[0x52];
    }
    if (y !== 2 || M[0xC9]) return {};
    t = M[0x07DC + x] - M[0x07DE]; M[0x14] = t & 255;
    const h = (M[0x07E0 + x] - M[0x07E2] - (t < 0 ? 1 : 0)) & 255;
    if (!(h & 0x80)) { if (h || M[0x14] >= 0x10) return {}; }
    for (x = 2; x >= 0; x--) {
      t = M[0x07DC + x] + M[0x242D + x]; M[0x07DC + x] = t & 255;
      M[0x07E0 + x] = (M[0x07E0 + x] + M[0x2430 + x] + (t >> 8)) & 255;
    }
    return {};
  };
  // OPP_AVERAGE ($2433): wheels X and Y's speeds ($07DC/$07E0) both set to their mean
  P.OPP_AVERAGE = r => {
    const x = r.x & 255, y = r.y & 255;
    let t = M[0x07DC + x] + M[0x07DC + y]; M[0x14] = t & 255;
    let a = (M[0x07E0 + x] + M[0x07E0 + y] + (t >> 8)) & 255;
    const c = (a >> 7) & 1, c2 = a & 1;
    a = (a >> 1) | (c << 7);
    M[0x14] = (M[0x14] >> 1) | (c2 << 7);
    M[0x07E0 + x] = a; M[0x07E0 + y] = a;
    M[0x07DC + x] = M[0x14]; M[0x07DC + y] = M[0x14];
    return { a: M[0x14], x, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
