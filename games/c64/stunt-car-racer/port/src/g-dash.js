// The race's clocks, laps and dashboard ($0F2A-$1648): the two cars' lap clocks in decimal, the laps
// counted, the best lap kept, the digits and messages drawn into the dashboard's sprites, the
// front wheels' sprites, the damage and the boost.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.dash = P => {
  const M = P.M, S = root.SCRPort.S;

  // RACE_CLOCKS ($0F2A), once a pass: the best-lap display's count ($82) run down; both cars' lap
  // clocks moved on and their laps checked; the race's end checked (LAPS_DONE); and the countdown
  // at $6C run down (twice a pass while $C373 bit 7 says the car is landing)
  P.RACE_CLOCKS = r => {
    if (M[0x82]) { M[0x82]--; if (!M[0x82]) P.SHOW_BEST_LAP({ x: r.x }); }
    for (let x = 1; x >= 0; x--) { P.TICK_CLOCK({ x }); P.LAP_CHECK({ x }); }
    P.LAPS_DONE({});
    if (M[0xC373] & 0x80) P.COUNTDOWN({});
    return P.COUNTDOWN({});
  };
  // COUNTDOWN ($0F4B): $6C counts down while it is from 1 to $7F, each pass the car is off the
  // road or lowered, or while it is 6 or more; bit 2 of it flashes $C399; at 0 it becomes $80 and
  // $C351 is set
  P.COUNTDOWN = r => {
    const a = M[0x6C];
    if (!a || (a & 0x80)) return {};
    M[0xC399] = (a >> 2) & 1;
    if (!M[0x2F] && !M[0x6A] && M[0x6C] < 6) return {};
    M[0x6C]--;
    if (!M[0x6C]) { M[0xC351] = 0x80; M[0x6C] = 0x80; }
    return {};
  };

  // LAP_CHECK ($0FAD): car X (0 the player, 1 the opponent) passing the start line: its piece
  // ($C374) reaching $C77C, the piece the line is on, counts a lap ($C378) once $C376 has been
  // cleared by the car reaching $C767, half way round. A lap after the first is timed: the player's
  // shows its time for 25 passes; a lap faster than the best ($8398/$82B0/$8298, entry 2) becomes
  // the best and is shown. Then the car's lap clock starts again.
  P.LAP_CHECK = r => {
    let x = r.x & 255;
    if (!x && (M[0x6B] & 0x40)) return {};
    const a = M[0xC374 + x];
    if (M[0xC376 + x] & 0x80) {
      if (a === M[0xC767]) M[0xC376 + x] = 0;
      return {};
    }
    if (a !== M[0xC77C]) return {};
    M[0xC376 + x] = 0x80;
    M[0xC378 + x] = (M[0xC378 + x] + 1) & 255;
    if (M[0xC378 + x] !== 1) P.TIME_PENALTY({ x });
    if (!x) {
      if (M[0xC378] !== 1) { P.CHECK_RECORDS({ x }); M[0x82] = 0x19; P.SHOW_LAP_TIME({ x }); }
      M[0xC6] = x;
      P.DIGIT_SPLIT({ a: M[0xC378], x: 4 });
      x = M[0xC6];
    }
    if (M[0xC378 + x] !== 1) {
      const o = P.FASTER({ x, y: 2 });
      if (!o.c) {
        M[0xC395] = (x & 1) << 6;
        if (M[0xC395]) { M[0x82] = 0; P.SHOW_BEST_LAP({ x }); }
      }
    }
    return P.CLEAR_CLOCK({ x });
  };

  // LAPS_DONE ($1020): when a car has run the race's laps ($C354) and the race has not ended
  // ($C364), it ends: the countdown starts if it has not, the lamp is lit, and the message shows:
  // RACE LOST when the opponent was first (and $C362 is set), LAPS OVER in practice, RACE WON
  // otherwise. $C362 bit 6 is then $C395's.
  P.LAPS_DONE = r => {
    for (let x = 1; x >= 0; x--) {
      if (!M[0xC364] && M[0xC378 + x] === M[0xC354]) {
        M[0xC364] = M[0xC378 + x];
        if (!M[0x6C]) M[0x6C] = 0x2C;
        const o = P.WIN_LAMP({});
        let y;
        if (o.y === 0x0B) { M[0xC362] = 0x80; y = 0x1C; }
        else y = (M[0xC76C] & 0x80) ? 0x08 : 0x54;
        P.SHOW_MESSAGE({ a: 4, y, x });
      }
      M[0xC362] = (M[0xC362] & 0xBF) | M[0xC395];
    }
    return { x: 0xFF };
  };

  // FASTER ($0F72): compares clock X with clock Y in decimal (minutes $8398, seconds $82B0,
  // hundredths $8298); when X's is the shorter it is copied over Y's. Carry clear when it was.
  P.FASTER = r => {
    const x = r.x & 255, y = r.y & 255;
    let t = M[0x8298 + x] - M[0x8298 + y];
    t = M[0x82B0 + x] - M[0x82B0 + y] - (t < 0 ? 1 : 0);
    t = M[0x8398 + x] - M[0x8398 + y] - (t < 0 ? 1 : 0);
    if (t >= 0) return { c: 1, a: t & 255 };
    M[0x8298 + y] = M[0x8298 + x]; M[0x82B0 + y] = M[0x82B0 + x]; M[0x8398 + y] = M[0x8398 + x];
    return { c: 0, a: M[0x8398 + x] };
  };
  // SHOW_BEST_LAP ($0F9C): the lamp for the best lap set, and the best lap's time (clock 2) drawn in
  // the third place on the dashboard. X is kept.
  P.SHOW_BEST_LAP = r => {
    P.BEST_LAMP({});
    P.DRAW_TIME({ y: 2, x: 3, a: 0x80 });
    return { x: r.x };
  };
  // CLEAR_CLOCK ($1090): clock X set to 0:00.00
  P.CLEAR_CLOCK = r => { const x = r.x & 255; M[0x82B0 + x] = 0; M[0x8298 + x] = 0; M[0x8398 + x] = 0; return { a: 0, x }; };
  // TICK_CLOCK ($109C): clock X moves on by 0.14 seconds, the length of a pass (seven frames)
  P.TICK_CLOCK = r => P.ADD_TO_CLOCK({ a: 0x14, x: r.x });
  // ADD_TO_CLOCK ($109E): adds A hundredths to clock X in decimal: past 59 seconds the minutes go
  // on, up to 9. The player's clock (X 0) is drawn when it carries into the seconds, unless the
  // best lap is showing or the race has not started.
  P.ADD_TO_CLOCK = r => {
    const x = r.x & 255;
    let o = S.adcD(r.a & 255, M[0x8298 + x], 0);
    M[0x8298 + x] = o.v;
    if (!o.c) return { a: o.v, x };
    o = S.adcD(M[0x82B0 + x], 0, 1);
    M[0x82B0 + x] = o.v;
    if (o.v >= 0x60) {
      M[0x82B0 + x] = 0;
      const m = S.adcD(M[0x8398 + x], 1, 0).v;
      if (m < 0x0A) M[0x8398 + x] = m;
    }
    if (!x && !M[0x82] && M[0xC378]) P.SHOW_LAP_TIME({ x });
    return { x };
  };
  // SHOW_LAP_TIME ($1078): the player's clock (0) drawn in the dashboard's third place, the
  // hundredths only while $82 says the lap's time is showing. X is kept.
  P.SHOW_LAP_TIME = r => { P.DRAW_TIME({ x: 2, y: 0, a: M[0x82] ? 0x80 : 0 }); return { x: r.x }; };

  // DAMAGE ($10D9): after a bump ($C352), the crack is drawn to the mean of the three points'
  // damage ($C3CB, from $C3C3-$C3C5); a bump of 20 or more ($C35C) also takes one from $C719, a
  // count the player keeps from race to race (10 at a season's start), shown through $F021 and
  // $F673 for 64 passes ($C302), with sound effect 1; a smaller bump, sound effect 4. When the 64
  // passes are up, $F668.
  P.DAMAGE = r => {
    if (M[0xC352]) {
      let t = M[0xC3C3] + M[0xC3C4];
      let a = ((t >> 1) | ((t > 255 ? 1 : 0) << 7)) & 255;
      t = a + M[0xC3C5];
      a = ((t >> 1) & 0x7F) | (t > 255 ? 0x80 : 0);
      M[0xC3CB] = a >> 1;
      P.CRACK({});
    }
    let e;
    // plug-in point once: with Fast CPU, the 64 passes counted once a step, and each sound started
    // at most once a step
    if (M[0xC302]) {
      const a = P.plug.once('hole') ? M[0xC302]-- : 0;
      if (a === 0x40) { P.BAR_HOLE(P.BAR_PART_AT({ y: M[0xC719] })); e = 1; }
      else if (M[0xC352]) e = 4;
      else return {};
    } else {
      if (!M[0xC352]) return {};
      if (M[0xC35C] < 0x14 || !M[0xC719]) e = 4;
      else {
        M[0xC719]--;
        P.BAR_HOLE_LIT(P.BAR_PART_AT({ y: M[0xC719] }));
        M[0xC302] = 0x40; e = 1;
      }
    }
    if (e === 1) M[0xAF8C] = 0x20;
    if (P.plug.once('damage' + e)) P.EFFECT({ a: e });
    M[0xC352] = 0;
    return { a: 0 };
  };

  // BEST_LAMP ($1144) and LAMP_A ($114D): the lamp at $DBDA/$DBDB lit (11) for the opponent's best,
  // else (7)
  P.BEST_LAMP = r => P.LAMP_A({ y: M[0xC395] ? 0x0B : 0x07 });
  P.LAMP_A = r => { P.wr(0xDBDA, r.y & 255); P.wr(0xDBDB, r.y & 255); return { y: r.y & 255 }; };
  // WIN_LAMP ($1154) and LAMP_B ($115D): the lamp at $DBCC/$DBCD, 11 while $F5E9 says the
  // opponent leads, else 7; Y comes back with it
  P.WIN_LAMP = r => { const o = P.SAME_LAP({ y: 0x0B }); return P.LAMP_B({ y: (o.n ? 7 : 0x0B) }); };
  P.LAMP_B = r => { P.wr(0xDBCC, r.y & 255); P.wr(0xDBCD, r.y & 255); return { y: r.y & 255 }; };

  // SHOW_DISTANCE ($1164), every fourth pass: the sixteen bits at $39/$3A times 5/16, as four
  // digits (thousands, hundreds, tens, units) in the dashboard's sprites, with a blank or a minus
  // before them by $C36A
  P.SHOW_DISTANCE = r => {
    if (M[0xC30C] & 3) return {};
    let x = 0, y = 0;
    M[0x18] = 0;
    // LSR $15, ROR A twice, then ADC $39, ADC $3A: the sum's carry is lost by the LSRs that follow
    const q = (M[0x3A] << 8 | M[0x39]) >> 2;
    const t = (q & 255) + M[0x39];
    let hi = ((q >> 8) + M[0x3A] + (t >> 8)) & 255;
    let lo = t & 255;
    for (let i = 0; i < 2; i++) { lo = (lo >> 1) | ((hi & 1) << 7); hi >>= 1; }
    M[0x14] = lo; M[0x15] = hi;
    while (M[0x15] > 3 || (M[0x15] === 3 && M[0x14] >= 0xE8)) {
      const u = M[0x14] - 0xE8; M[0x14] = u & 255; M[0x15] = (M[0x15] - 3 - (u < 0 ? 1 : 0)) & 255; M[0x18]++;
    }
    let a = M[0x14];
    for (;;) {
      if (a >= 0x64) { a -= 0x64; y++; continue; }
      M[0x15] = (M[0x15] - 1) & 255;
      if (M[0x15] & 0x80) break;
      a = (a - 0x65) & 255; y++;
    }
    while (a >= 0x0A) { a -= 0x0A; x++; }
    M[0x17] = a; M[0x15] = x; M[0x16] = y;
    P.DIGIT({ a: (M[0xC36A] & 0x80) ? 0xFD : 0xF0, x: 0x22 });
    P.DIGIT({ a: M[0x18], x: 0x23 });
    P.DIGIT({ a: M[0x16], x: 0x61 });
    P.DIGIT({ a: M[0x15], x: 0x62 });
    P.DIGIT({ a: M[0x17], x: 0x63 });
    if (!M[0xC364]) P.WIN_LAMP({});
    M[0x6F] |= 3;
    return {};
  };

  // SPEED_TO_BAR ($1206): the speed bar's length from the speed along the road ($0159): twice
  // (less 17) and one, times $B7/256, through command $43
  P.SPEED_TO_BAR = r => {
    let a = M[0x0159] - 0x11, c;
    if (a & 0x80 || a < 0) { a = 0; c = 0; } else c = 1;
    a = ((a << 1) | c) & 255;
    M[0x15] = a;
    const o = P.MUL8({ a: 0xB7 });
    return P.SPEED_BAR({ x: o.a });
  };

  // DRAW_TIME ($121F): clock Y drawn at place X of the dashboard (the four sprite places at $1296)
  // as M:SS.HH, the hundredths only with bit 7 of A; $6F marks the sprites changed
  P.DRAW_TIME = r => {
    M[0xC7] = r.y & 255; M[0xC3CC] = r.a & 255;
    M[0xC6] = M[0x1296 + (r.x & 255)];
    let y = M[0xC7], x = M[0xC6];
    P.DIGIT_SHIFT_LEFT({ a: M[0x8398 + y] & 0x0F, x });
    y = M[0xC7];
    let o = P.DIGIT_SPLIT({ a: M[0x82B0 + y] >> 4, x: (M[0xC6] + 1) & 255 });
    P.COLON({ x: o.x });
    y = M[0xC7];
    P.DIGIT_SHIFT_RIGHT({ a: M[0x82B0 + y] & 0x0F, x: (M[0xC6] + 2) & 255 });
    y = M[0xC7];
    let a = M[0x8298 + y] >> 4;
    if (!(M[0xC3CC] & 0x80)) a = 0xF0;
    o = P.DIGIT({ a, x: (M[0xC6] + 0x41) & 255 });
    M[0x3FF6 + o.x] = 2;
    y = M[0xC7];
    a = M[0x8298 + y] & 0x0F;
    if (!(M[0xC3CC] & 0x80)) a = 0xF0;
    P.DIGIT_SHIFT_LEFT({ a, x: (M[0xC6] + 0x42) & 255 });
    M[0x6F] |= (M[0xC6] & 0x80) ? 0x0C : 0x03;
    return {};
  };
  // DASH_LABELS ($129A): the L and the B on the dashboard
  P.DASH_LABELS = r => { P.DIGIT_SPLIT({ x: 3, a: 0x1C }); return P.DIGIT({ x: 0x43, a: 0x12 }); };

  // SHOW_MESSAGE ($12A9): a message in the two sprites at $7F80 and $7FC0, from the table at $1329:
  // A groups of a place and three characters, from Y; a '<' starts the line half a character
  // further left. $C355 says it is showing. X is kept.
  P.SHOW_MESSAGE = r => {
    let y = r.y & 255;
    M[0x1327] = y; M[0x1328] = r.a & 255; M[0xA0] = r.a & 255;
    M[0x18] = 0;
    for (let x = 0x7F; x >= 0; x--) M[0x7F80 + x] = 0;
    do {
      let x = M[0x1329 + y]; y = (y + 1) & 255;
      M[0x08] = 3;
      do {
        let a = M[0x1329 + y];
        if (a === 0x3C) { M[0x18] = x; a = 0x20; }
        a = (a - 0x30) & 255;
        M[0xC7] = y; M[0xC6] = x;
        P.GLYPH_ADDRESS({ a });
        const p = M[0x1E] | M[0x1F] << 8;
        for (let k = 1; k < 7; k++) { M[0x7F80 + x] = M[(p + k) & 0xFFFF]; x = (x + 3) & 255; }
        y = (M[0xC7] + 1) & 255; x = (M[0xC6] + 1) & 255;
      } while (--M[0x08]);
    } while (--M[0xA0]);
    if (M[0x18]) {
      M[0x08] = 6;
      let x = M[0x18];
      do {
        for (let k = 4; k; k--) {
          let c = 0;
          for (const o of [0x7FC2, 0x7FC1, 0x7FC0, 0x7F82, 0x7F81, 0x7F80]) {
            const v = M[o + x]; M[o + x] = ((v << 1) | c) & 255; c = v >> 7;
          }
        }
        x = (x + 3) & 255;
      } while (--M[0x08]);
    }
    M[0xC355] = 0x80;
    return { a: r.x & 255, x: r.x };
  };

  // COLON ($1411): the two dots between the minutes and the seconds, bit 7 of the bytes 15 and 6
  // before X
  P.COLON = r => { const x = r.x & 255; M[0x3FFA + x] |= 0x80; M[0x3FF1 + x] |= 0x80; return { x }; };
  // the four ways a digit goes into a sprite at X, rows 1-6 of its glyph a row of three bytes
  // apart: DIGIT_SHIFT_LEFT ($1422) a pixel left, DIGIT_SPLIT ($1426) two pixels right and across
  // into the next byte, DIGIT_SHIFT_RIGHT ($142A) a pixel right keeping the byte's bit 7, DIGIT
  // ($142E) as it is. A digit $F0 is a space and $FD a minus.
  P.DIGIT_SHIFT_LEFT = r => digit(r, 0x00);
  P.DIGIT_SPLIT = r => digit(r, 0x80);
  P.DIGIT_SHIFT_RIGHT = r => digit(r, 0xC0);
  P.DIGIT = r => digit(r, 0x40);
  const digit = (r, mode) => {
    M[0xDB] = mode;
    let x = r.x & 255;
    P.GLYPH_ADDRESS({ a: r.a & 255 });
    const p = M[0x1E] | M[0x1F] << 8;
    let a = 0;
    for (let y = 1; y < 7; y++) {
      a = M[(p + y) & 0xFFFF];
      if (mode & 0x80) {
        let c = a & 1; a >>= 1;
        if (!(mode & 0x40)) { c = a & 1; a >>= 1; }
        M[0x14] = a;
        M[0x4000 + x] = (M[0x4000 + x] & 0x80) | M[0x14];
        if (!(mode & 0x40)) { a = c << 7; M[0x4001 + x] = a; }
      } else {
        if (!(mode & 0x40)) a = (a << 1) & 255;
        M[0x4000 + x] = a;
      }
      x = (x + 3) & 255;
    }
    return { x, y: 7, a };
  };
  // GLYPH_ADDRESS ($1469): ($1E) set to the glyph of character A + $30 (its low seven bits) in the
  // font at $7FC0, eight bytes a character; Y is 1, the first row the sprites take
  P.GLYPH_ADDRESS = r => {
    const c = ((r.a & 255) + 0x30) & 0x7F;
    const p = 0x7FC0 + c * 8;
    M[0x14] = (c >> 5) & 3;
    M[0x1E] = p & 255; M[0x1F] = (p >> 8) & 255;
    return { y: 1, a: M[0x1F] };
  };

  // DASH_SPRITES ($1484): sprites 2-7 placed, pointed and coloured for the dashboard (the clocks,
  // the messages, the wheels), multicolour 0 black and 1 white, and turned on
  P.DASH_SPRITES = r => {
    for (let x = 7; x >= 2; x--) {
      P.wr(0xD000 + x * 2, M[0x14C2 + x]); P.wr(0xD001 + x * 2, M[0x14C8 + x]);
      M[0x5FF8 + x] = M[0x14B6 + x]; P.wr(0xD027 + x, M[0x14BC + x]);
    }
    P.wr(0xD025, 0); P.wr(0xD026, 1);
    M[0x6E] = 0xFC; P.wr(0xD015, 0xFC);
    return { x: 1, a: 0xFC };
  };
  // WHEEL_SPRITES ($14D0): the two front wheels' sprites (5 and 7) moved up and down with the
  // first two points' springs ($83/$86), through the sine table at $A700, from the height $1C;
  // where a wheel would sit too low its sprite is hidden and its top drawn into the bitmap
  // (command $40) instead. The game reads the sprites' switches back from the video chip ($152D),
  // which the interrupt sets band by band, so the read is a checkpoint: the port reads what the
  // game read, the interrupts that came before it run
  P.GEN.add('WHEEL_SPRITES');
  P.CHECKPOINTS.push(0x152D);
  P.WHEEL_SPRITES = function* (r) {
    let y = 0x0A, a = 4;
    for (let x = 0; x < 2; x++) {
      M[0x16] = a;
      M[0x14] = M[0x83 + x];
      a = (M[0x86 + x] + 1) & 255;
      if (a & 0x80) { a = 0; M[0x14] = 0; }
      if (a >= 8) { M[0x14] = 0xFF; a = 7; }
      a = ((a << 8 | M[0x14]) >> 3) & 255;
      M[0x15] = 0;
      a ^= 0xFF;
      M[0x17] = x;
      a = M[0xA700 + a] >> 3;
      a = ((a ^ 0xFF) + M[0x1C]) & 255;
      const c = M[0xC30A] >> 7; M[0xC30A] = (M[0xC30A] << 1) & 255;
      if (c || a >= 0xBA) a = 0xB9;
      if (a < 0x97) a = 0x97;
      P.wr(0xD001 + y, a);
      a = (a + 0x15) & 255;
      if (a >= 0xBE) {
        y = M[0x16];
        yield { cp: 0x152D };
        P.wr(0xD015, P.rd(0xD015) & M[0x38B4 + y]);
        M[0x14] = a; P.FRONT_WHEEL({ x });
        y = M[0x16];
        a = M[0x6E] & M[0x38B4 + y];
      } else {
        P.wr(0xCFFF + y, a);
        y = M[0x16];
        if (!(M[0x6E] & M[0x38BC + y])) { M[0x14] = 0xB2; P.FRONT_WHEEL({ x }); y = M[0x16]; }
        a = M[0x6E] | M[0x38BC + y];
      }
      M[0x6E] = a;
      y = 0x0E; a = 6;
    }
    return { x: 2, y: 0x0E, a: 6 };
  };

  // WRECK ($1572): the car is wrecked: unless a countdown is running, the car drops ($0E, $1C,
  // $3C), the countdown starts at $3C and WRECK shows
  P.WRECK = r => {
    if (M[0x6C]) return {};
    M[0x0E] = 2; M[0x1C] = 0x92; M[0x3C] = 0x82; M[0x6C] = 0x3C;
    return P.SHOW_MESSAGE({ a: 2, y: 0, x: r.x });
  };

  // SWERVE ($158E): while $C9 is set, a swerve of sixteen passes ($C30F) steers by the wave at
  // $1601 ($C30D pushes the left end of the line its corners are set out on along, $C30E the
  // right end, $C357 the way it steers, by the value five places on); a new one starts at
  // random, more often the higher $C773, when $C353 allows it and the piece ahead does not
  // forbid it
  // (plug-in point once: with Fast CPU, the count and the dice once a step, the wave's values kept
  // for the step's other loops; plug-in point glide: the wheels' offsets moved from one step's to
  // the next's over the step)
  P.SWERVE = r => {
    if (!M[0xC9]) return {};
    let x = 0;
    if (P.plug.once('swerve')) {
      M[0xC30D] = 0; M[0xC30E] = 0; M[0xC357] = 0;
      if (M[0xC30F]) {
        const old = M[0xC30F]--;
        let y = (old + M[0xC358]) & 0x0F;
        let a = M[0x1601 + y];
        if (a & 0x80) { a = (-a) & 255; x++; }
        M[0xC30D + x] = a;
        y = (y + 5) & 0x0F;
        M[0xC357] = M[0x1601 + y];
      } else if (!((M[0x0710 + M[0xC375]] | M[0xC36A] | M[0xB2]) & 0x80) && (M[0xC353] & 0x80)) {
        M[0xC358] = (M[0xC353] & 0x40) ? 0x10 : 0x08;
        const a = P.RANDOM({}).a & 0x1F;
        M[0x14] = a;
        if (M[0xC773] >= a) M[0xC30F] = 0x10;
      }
      wave = M[0xC30D] - M[0xC30E];
    }
    const w = P.plug.glide('swerve', wave);
    M[0xC30D] = w > 0 ? w : 0; M[0xC30E] = w < 0 ? -w : 0;
    M[0xC353] = (M[0xA4] >> 1) ^ M[0xB2];
    return {};
  };
  let wave = 0;

  // RESET_SEASON ($1611): the league's points ($C728-$C763) cleared, the twelve drivers back in
  // their places ($C758) with no holes worth $0A ($83B0), and $C77F cleared
  P.RESET_SEASON = r => {
    for (let x = 0x3B; x >= 0; x--) {
      M[0xC77F] = 0; M[0xC728 + x] = 0;
      if (x < 0x0C) { M[0xC758 + x] = x; M[0x83B0 + x] = 0x0A; }
    }
    return { x: 0xFF, a: 0 };
  };
  // SAVE_RANDOM ($162C): $02-$06 kept at $1648
  P.SAVE_RANDOM = r => { for (let x = 4; x >= 0; x--) M[0x1648 + x] = M[0x02 + x]; return { x: 0xFF }; };
  // LOAD_RANDOM ($1637): $02-$06 set from the five bytes ending at $1643 + Y (Y 4 the defaults, 9
  // those SAVE_RANDOM kept)
  P.LOAD_RANDOM = r => {
    let y = r.y & 255;
    for (let x = 4; x >= 0; x--) { M[0x02 + x] = M[0x1643 + y]; y = (y - 1) & 255; }
    return { x: 0xFF, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
