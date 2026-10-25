// The engine's frame: the main loop ($47C5-$4802), the controls turned into actions and the end of
// a session ($480D-$4A52), the scripts each frame selects ($4A58-$4B23), the scene drawn when it
// is dirty ($2754-$27B6, $35E9-$3696), the action status ($72DA-$734D) and the viewport's
// transition ($82E3-$8366), and the interrupt ($737F-$7579) with its entry ($FF48).
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.main = function (P) {
  const M = P.M, io = P.io;
  const R = (r, o) => Object.assign({}, r, o);
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };

  // ---- the main loop. A moment of play starts at a pass ($47F0, UPDATE_FRAME_INPUT_EVENTS's
  // call); the start-up's program enters at MAIN_LOOP ($47C5) instead (fresh). Each pass reads the
  // controls and runs what they ask, runs the scripts the pass's events select, and, unless a
  // new session was asked for (bit 1 of $1059), draws the scene when it is dirty.
  P.main_loop = function* (o = {}) {
    let fresh = !!o.fresh, c = o.c || 0;
    for (;;) {
      if (fresh) {
        yield { cp: 0x47C5 }; P.SID_CLEAR_REGISTERS({});
        M[0x1059] = 0xFD; M[0x105A] = 0xFF; M[0x1065] = 2;
        yield { cp: 0x47D7 }; c = (yield* P.RENDER_SCENE_IF_DIRTY({})).c;
        M[0x109B] = 0;
        if (!M[0x123A]) M[0x123A] = M[0x123B];
      }
      fresh = true;
      for (;;) {
        yield { cp: 0x47F0 }; yield* P.UPDATE_FRAME_INPUT_EVENTS({ c });
        yield { cp: 0x47F3 }; yield* P.DISPATCH_FRAME_CONDITIONS({});
        if (M[0x1059] & 2) break;
        yield { cp: 0x47ED }; c = (yield* P.RENDER_SCENE_IF_DIRTY({})).c;
      }
      yield { cp: 0x47FD }; P.INITIALIZE_NEW_SESSION({});
    }
  };
  P.CHECKPOINTS.push(0x47C5, 0x47D7, 0x47F0, 0x47F3, 0x47ED, 0x47FD);

  // ---- UPDATE_FRAME_INPUT_EVENTS: the pass's events cleared; the lightning (a countdown reseeded
  // from the clock, in an area with a sky a flash of the border and background white for one tick
  // of the timer and a redraw); the escape's end (bit 6 of $243C) or a drop to the support below;
  // the controls read, the timer's event raised when its tick has moved on, and each control code
  // turned into an action and run, last first.
  P.UPDATE_FRAME_INPUT_EVENTS = function* (r) {
    for (const a of [0x1059, 0x105A, 0x1065, 0x1082, 0x1084, 0x105E, 0x105D, 0x1085, 0x1081]) M[a] = 0;
    const lc = P.irqByte(0x2459);
    // plug-in point: a streak kept on show puts the flash and the next countdown off until it goes
    let c = r.c ? 1 : 0, lightning = lc === 0 && P.plug.held(0x2459, lc) !== 1;
    if (lc === 1) {
      c = 1;
      if (M[0x2464]) { M[0x105A] = 8; return { a: 8, c: 1 }; }
      lightning = true;
    }
    if (lightning) {
      M[0x2459] = ((P.irqByte(0x1C64) & 0x3F) + 0x0A + c) & 255;
      if (M[0x2464]) {
        P.SID_INITIALIZE_IF_ENABLED({ a: 8 });
        M[0x1C73] = 0;
        while (M[0x1C73] === 0) yield;
        io.vicWrite(0x21, 1); io.vicWrite(0x20, 1);
        M[0x1C73] = 0;
        while (M[0x1C73] === 0) yield;
        io.vicWrite(0x21, M[0x2431]); io.vicWrite(0x20, M[0x2431]);
        M[0x105A] = 8;
      }
    }
    if (M[0x243C] & 0x40) { M[0x109B] = 5; return yield* P.session_end(); }
    if (M[0x1087] && !M[0x109B]) { P.DROP_PLAYER_TO_SUPPORT({}); return {}; }
    const controls = P.READ_CONTROL_INPUT({}).c;
    P.plug.read();
    if (M[0x109B]) return yield* P.session_end();
    const tick = P.irqByte(0x246D);
    if (tick !== M[0x246C]) { M[0x246C] = tick; M[0x1085] = 8; }
    if (!controls) return {};
    // each code through the map at $1382 (22 pairs), $7F where it has none, to $4803 + its index
    let y = M[0x1379], a = 0;
    for (;;) {
      M[0x480A] = M[0x1381];
      a = M[0x1379 + y];
      let x = 0, found = false;
      do {
        if (a === M[0x1382 + x]) { found = true; break; }
        x += 2; M[0x480A] = (M[0x480A] - 1) & 255;
      } while (M[0x480A]);
      a = found ? M[0x1383 + x] : 0x7F;
      M[0x4803 + y] = a;
      y = (y - 1) & 255;
      if (!y) break;
    }
    M[0x480A] = 0;
    for (;;) {
      // $48F1: actions 1-20 move the player (3-6 move the aiming cursor instead while it is on),
      // 21-30 aim, fire and act, 41 opens the information menu; plug-in point: whether a held
      // control's action is taken again
      if (a >= 1 && P.plug.take(a)) {
        if (a < 0x15 && !(a >= 3 && a < 7 && M[0x2467])) yield* P.DISPATCH_PLAYER_MOVEMENT({ a });
        else {
          if (a < 0x15) { M[0x4803] = a; a = (0x1D - a) & 255; }
          if (a < 0x1F) {
            if (a === 0x16 && !M[0x2467]) {
              yield* P.DISPATCH_AIM_FIRE_ACTIVATE({ a: 0x1E });
              yield* P.DISPATCH_AIM_FIRE_ACTIVATE({ a: 0x16 });
              a = 0x1E;
            }
            yield* P.DISPATCH_AIM_FIRE_ACTIVATE({ a });
          } else if (a === 0x29) { yield* P.RUN_INFORMATION_MENU({}); return {}; }
        }
      }
      M[0x1379] = (M[0x1379] - 1) & 255;
      if (!M[0x1379]) return {};
      const i = (M[0x480A] + 1) & 255;
      a = M[0x4804 + i];
      M[0x480A] = i;
    }
  };

  // The end of a session ($4954): the reason's message in the panel, the aiming sprites off, the
  // scene drawn again (but for the escape and reason 3) and the viewport closed (but for the
  // escape), the music started again when the sound was on effects, the statistics formatted, and
  // four messages in turn until a control is pressed, which ends the session (WAIT_FOR_SESSION_
  // MESSAGE drops its return, so this returns from UPDATE_FRAME_INPUT_EVENTS).
  P.session_end = function* () {
    const reason = M[0x109B];
    const lo = { 1: 0x10, 2: 0x20, 4: 0x40, 5: 0x50, 6: 0x60 }[reason] || 0x30;
    M[0x7E] = lo; M[0x480B] = lo; M[0x7F] = 0x14; M[0x480C] = 0x14;
    setp(0x7C, 0x1D6F);
    P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2, y: 0x14 });
    io.vicWrite(0x15, 0xFC & io.vicRead(0x15));
    M[0x246B] = 0; M[0x2467] = 0;
    if (M[0x109B] !== 5) {
      if (M[0x109B] !== 3) P.DRAW_SORTED_VISIBLE_QUEUE({});
      yield* P.RUN_VIEWPORT_TRANSITION({ c: 0 });
    }
    if (!M[0x123A]) {
      while (M[0xC806]) yield;
      M[0x123A] = (M[0x123A] + 1) & 255;
      M[0x1239] = 0;
      P.SID_PLAYER_INITIALIZE({ a: 0 });
    }
    P.FORMAT_MENU_STATISTICS({});
    P.FORMAT_SPIRITS_DESTROYED_FOR_MENU({});
    P.FORMAT_SCORE_FOR_MENU({});
    for (;;) {
      for (const [x, y] of [[0x74, 0x18], [0x54, 0x18], [0x64, 0x18], [M[0x480B], M[0x480C]]]) {
        yield { cp: 0x49FC };
        if ((yield* P.WAIT_FOR_SESSION_MESSAGE({ x, y })).up) return {};
      }
    }
  };
  P.CHECKPOINTS.push(0x49FC);

  // WAIT_FOR_SESSION_MESSAGE: 50 ticks of the timer for a control; with none, the message at X/Y in
  // the panel. With one, the sound switch as it was before the session ended (an effect, or the
  // title music stopped), 30 ticks, and a new session asked for; and up, for the caller's caller.
  P.WAIT_FOR_SESSION_MESSAGE = function* (r) {
    M[0x1063] = 0x32; M[0x7E] = r.x; M[0x7F] = r.y;
    for (;;) {
      yield { cp: 0x4A05 };
      if (P.READ_CONTROL_INPUT({}).c) break;
      if (!P.irqByte(0x1063)) {
        setp(0x7C, 0x1D6F);
        return P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2, y: r.y });
      }
    }
    M[0x123A] = M[0x123B];
    if (!M[0x123A]) P.SID_INITIALIZE_IF_ENABLED({ a: 3 });
    else if (M[0x1239]) { M[0x1239] = 0; P.SID_PLAYER_INITIALIZE({ a: 0 }); }
    M[0x1063] = 0x1E;
    while (M[0x1063]) yield;
    M[0x1059] = 2; M[0x105A] = 0;
    return { a: 0, up: true };
  };
  P.CHECKPOINTS.push(0x4A05);

  // ---- DISPATCH_FRAME_CONDITIONS: with an event this pass, the script of the object it names
  // (or, with none and $105D set, the built-in stream at $4A56), then each global script, then
  // each of the area's condition scripts.
  P.DISPATCH_FRAME_CONDITIONS = function* (r) {
    const ev = M[0x1084] | M[0x1085];
    if (!ev) return { a: 0 };
    M[0x1084] = ev;
    // plug-in point: the script of an object a step alone runs into, which adds up with each run
    if (M[0x1082] && (ev !== 1 || P.plug.once(0x1082))) {
      M[0x105C] = M[0x1082];
      if (P.FIND_OBJECT_BY_ID({ a: 0 }).z) {
        const base = 0x13DF + (M[ptr(0x7C)] & 0x0F);
        setp(0x7E, base);
        const len = (M[(ptr(0x7C) + 8) & 0xFFFF] - M[base]) & 255;
        if (len) {
          setp(0x7C, ptr(0x7C) + M[base]);
          yield* P.EXECUTE_FCL_STREAM({ a: len });
        } else if (M[0x105D]) {
          setp(0x7C, 0x4A56);
          yield* P.EXECUTE_FCL_STREAM({ a: M[0x4A55], x: M[0x105D] });
        }
      }
    }
    for (const list of [0x1096, 0x242F]) {
      setp(0x7C, ptr(list));
      const n = M[ptr(0x7C)];
      if (!n) continue;
      setp(0x7C, ptr(0x7C) + 1);
      M[0x4A53] = n;
      do {
        const len = M[ptr(0x7C)];
        setp(0x7C, ptr(0x7C) + 1);
        yield* P.EXECUTE_FCL_STREAM({ a: len, y: 0 });
        setp(0x7C, ptr(0x7C) + len);
        M[0x4A53] = (M[0x4A53] - 1) & 255;
      } while (M[0x4A53]);
    }
    return { y: 0 };
  };

  // ---- RENDER_SCENE_IF_DIRTY: with a crush check pending, the objects a script has just shown
  // tested first (the player crushed: only the panel). Bit 2 of $1059 rebuilds the scene (the
  // view's bounds and matrix, both object lists traversed, the painter's sort), and that or bit 3
  // of $105A draws and shows it; the panel's figures and the action status each time.
  P.RENDER_SCENE_IF_DIRTY = function* (r) {
    let draw = false;
    if (M[0x1086] && P.CHECK_NEWLY_VISIBLE_CRUSH({}).c) draw = false;
    else if (M[0x1059] & 4) {
      P.COMPUTE_COARSE_VIEW_BOUNDS({});
      P.BUILD_VIEW_PROJECTION_MATRIX({});
      M[0x1099] = 0;
      if (M[0x1060]) { M[0x80] = M[0x1061]; M[0x81] = M[0x1062]; P.TRAVERSE_OBJECT_LIST({ x: M[0x1060] }); }
      if (M[0x242A]) { M[0x80] = M[0x242B]; M[0x81] = M[0x242C]; P.TRAVERSE_OBJECT_LIST({ x: M[0x242A] }); }
      P.PAINTER_SORT_VISIBLE_ENTRIES({});
      draw = true;
    } else draw = (M[0x105A] & 8) !== 0;
    P.REFRESH_HUD_STATS({});
    if (draw) {
      P.DRAW_SORTED_VISIBLE_QUEUE({});
      yield* P.PRESENT_FRAME({});
    }
    return yield* P.REFRESH_ACTION_STATUS({});
  };

  // DRAW_SORTED_VISIBLE_QUEUE: the sky and the floor, then each entry of the sorted queue (four
  // bytes from $10A6 + 4), each of its faces rasterised (type 2, a line, by RASTERIZE_LINE_SPANS)
  // and painted into the linear buffer; then the centre reticle, when it is on and the aiming
  // cursor is not.
  P.DRAW_SORTED_VISIBLE_QUEUE = function (r) {
    P.DRAW_SKY_FLOOR_BACKGROUND({});
    setp(0x7A, (M[0x10A6] | M[0x10A7] << 8) + 4);
    let n = M[0x106A];
    while (n) {
      setp(0x7C, (M[ptr(0x7A)] | M[(ptr(0x7A) + 1) & 0xFFFF] << 8) + 1);
      const faces = M[ptr(0x7C)];
      if (faces) {
        M[0x35E8] = faces & 0x7F;
        setp(0x7C, ptr(0x7C) + 1);
        do {
          const b = M[ptr(0x7C)];
          M[0x1235] = b >> 4;
          M[0x10B0] = b & 0x0F;
          if (M[0x10B0] !== 2) P.RASTERIZE_POLYGON_EDGES({ y: 0 }); else P.RASTERIZE_LINE_SPANS({ y: 0 });
          P.PAINT_SCANLINE_SPANS_LINEAR({});
          setp(0x7C, ptr(0x7C) + ((M[0x10B0] << 1) & 255) + 1);
          M[0x35E8] = (M[0x35E8] - 1) & 255;
        } while (M[0x35E8]);
      }
      setp(0x7A, ptr(0x7A) + 4);
      n = (n - 1) & 255;
    }
    if (!M[0x2467] && M[0x246B]) P.XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT({});
    return {};
  };

  // PRESENT_FRAME: the sensors counted in the rebuild made active; the view's colours when $1064
  // asks; then the buffer copied to the bitmap, or the viewport's opening when $1065 asks.
  P.PRESENT_FRAME = function* (r) {
    M[0x109A] = M[0x1099];
    if (M[0x1064]) P.UPDATE_VIEWPORT_COLOR_CELLS({});
    if (!M[0x1065]) return P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP({});
    return yield* P.RUN_VIEWPORT_TRANSITION({ c: 1, x: 0x78 });
  };

  // ---- REFRESH_ACTION_STATUS: the panel's action picture ($1081, the action this pass) drawn when
  // it changed or bits 5-6 of $1059 ask, after a little animation for action 8 (six frames three
  // ticks apart); with bit 5 of $105A, the area's name in the panel once the countdown has run out.
  // The carry it leaves is a caller's (the lightning's reseed reads it): the blit keeps the one it
  // is given (PHP and PLP), which is the last comparison's, of $1081 with $7025 or with 8.
  P.REFRESH_ACTION_STATUS = function* (r) {
    let c = 1, x = r.x, y = r.y;
    if (M[0x1081] !== M[0x7025] || (M[0x1059] & 0x60)) {
      setp(0x7A, 0x1FB0); setp(0x7C, 0x1D65);
      c = 8 >= M[0x1081] ? 1 : 0;
      if (M[0x1081] === 8) {
        let a = 7;
        do {
          a = (a - 1) & 255;
          y = P.BLIT_PACKED_2BPP_GRAPHIC({ a, x: 1, y, c: 1 }).y;
          M[0x1063] = 3;
          while (M[0x1063]) yield;
        } while (a !== 5);
        M[0x1081] = 0; c = 1;
      }
      M[0x7025] = M[0x1081];
      const o = P.BLIT_PACKED_2BPP_GRAPHIC({ a: M[0x1081], x: 1, y, c });
      x = o.x; y = o.y; c = o.c;
    }
    // plug-in point: whether the loop waits now to put the area's name back
    if (!P.plug.after(M[0x105A] & 0x20, 0x1063)) return { a: M[0x105A] & 0x20, x, y, c };
    while (M[0x1063]) yield;
    setp(0x7C, 0x1D6F); setp(0x7E, 0x2419);
    return P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2, y, c });
  };

  // ---- RUN_VIEWPORT_TRANSITION: with the carry clear, the viewport closes in the steps listed at
  // $82C2 (to $FF), two ticks each, with a sound as it reaches row $78. With it set, it is shut at
  // once, the message at $1400 shown, a control waited for (let go, then pressed), the area's name
  // shown again, and it opens in 60 steps of two rows, two ticks each, with a sound at each.
  P.RUN_VIEWPORT_TRANSITION = function* (r) {
    let y;
    if (!r.c) {
      setp(0x7A, 0x82C2);
      for (y = 0; ; y = (y + 1) & 255) {
        const s = M[0x82C2 + y];
        if (s === 0xFF) return { a: 0xFF, y };
        M[0x1063] = 2;
        P.APPLY_VERTICAL_BITMAP_TRANSITION_STEP({ x: s, y });
        if (M[0x82C2 + y] === 0x78) P.SID_INITIALIZE_IF_ENABLED({ a: 2, y });
        while (M[0x1063]) yield;
      }
    }
    P.APPLY_VERTICAL_BITMAP_TRANSITION_STEP({ x: 0x78, y: r.y });
    setp(0x7C, 0x1D6F); setp(0x7E, 0x1400);
    P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2 });
    for (;;) { yield { cp: 0x832E }; if (!P.READ_CONTROL_INPUT({}).c) break; }
    for (;;) { yield { cp: 0x8333 }; if (P.READ_CONTROL_INPUT({}).c) break; }
    setp(0x7E, 0x2419);
    P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2 });
    y = 0x76;
    do {
      P.SID_INITIALIZE_IF_ENABLED({ a: 3, y });
      M[0x1063] = 2;
      P.APPLY_VERTICAL_BITMAP_TRANSITION_STEP({ x: y, y });
      while (M[0x1063]) yield;
      y = (y - 2) & 255;
    } while (!(y & 0x80));
    return P.SID_INITIALIZE_IF_ENABLED({ a: 2, y });
  };
  P.CHECKPOINTS.push(0x832E, 0x8333);

  // ---- the interrupts: INSTALL_RUNTIME_VECTORS points $0314 at $737F and $0318 at $7579 (a bare
  // RTI) and starts the raster at line 0. COMMON_IRQ_SOURCE_DISPATCHER serves both sources: the
  // raster's (bit 0 of $D019) starts the music again when it has stopped, or with the sound on
  // effects restarts the sensors' alarm (tune 16) every frame while one is active, ticks the
  // driver and sets the raster to line $28; CIA 1's timer A, 60 times a second, moves the clock
  // and the script delay on, flashes the view's colours while a sensor is active, animates the
  // panel's two meters and its picture, and, while a game is on, counts the lightning, the
  // sensors' drain on strength, the spirit meter's clock and the scripts' timer.
  P.INSTALL_RUNTIME_VECTORS = function (r) {
    M[0x0314] = 0x7F; M[0x0315] = 0x73; M[0x0318] = 0x79; M[0x0319] = 0x75;
    io.vicWrite(0x12, 0);
    M[0x1067] = 0; M[0x1C72] = 0;
    return R(r, { a: 0 });
  };
  P.IRQ_DISPATCH = function () { P.COMMON_IRQ_SOURCE_DISPATCHER(); };
  P.COMMON_IRQ_SOURCE_DISPATCHER = function () {
    M[0x1C72] = 1;
    if (io.vicRead(0x19) & 1) {
      io.vicWrite(0x19, 1);
      if (M[0x123A]) { if (!M[0xC806]) P.SID_PLAYER_INITIALIZE({ a: M[0x1239] }); }
      else if (M[0x109A] && !M[0x109B]) P.SID_PLAYER_INITIALIZE({ a: 0x10 });
      P.SID_PLAYER_TICK({});
      io.vicWrite(0x12, 0x28);
    } else {
      M[0x1C73] = 1;
      M[0x1C64] = (M[0x1C64] + 1) & 255;
      if (M[0x1063]) M[0x1063]--;
      // the view's colours: with a sensor active, every tick a quarter of 10 a colour from $735A
      // (a step of 4 apart), and at 10 the area's own; without, the area's own once
      let colour = -1;
      if (M[0x109B] || !M[0x109A]) { if (M[0x7355] !== 0x0A) colour = -2; }
      else {
        M[0x7355] = (M[0x7355] - 1) & 255;
        if (!M[0x7355]) colour = -2;
        else if (!(M[0x7355] & 3)) colour = M[0x735A + (M[0x7355] >> 2)];
      }
      if (colour === -2) { M[0x7355] = 0x0A; colour = ((M[0x2432] << 4) | M[0x2433]) & 255; }
      if (colour >= 0) {
        P.NI.fill++;
        let at = 0xC4A5;
        for (let row = 0; row < 15; row++) { M.fill(colour, at, at + 0x1E); at += 0x28; }
        M[0x7417] = at & 255; M[0x7418] = at >> 8;
      }
      // the two meters' blinks, each with a period of the clock's low bits
      const blink = (lo, hi, bit, cell, on, off) => {
        M[lo] = (M[lo] - 1) & 255;
        if (M[lo] !== 0xFF) return;
        M[hi] = (M[hi] - 1) & 255;
        if (M[hi] !== 0xFF) return;
        M[hi] = 0;
        if (!(M[0x7357] & bit)) {
          M[0x7357] = (M[0x7357] + bit) & 255;
          M[cell] = on;
          const s = M[0x1C64] << 1;
          M[hi] = ((M[hi] << 1) | (s >> 8)) & 255; M[hi] = (M[hi] + 2) & 255;
          M[lo] = s & 255;
        } else {
          M[0x7357] = (M[0x7357] - bit) & 255;
          M[cell] = off;
          M[lo] = 0x0F;
        }
        return true;
      };
      if (!blink(0x7350, 0x7351, 1, 0xE8A5, 0x80, 0x8C)) blink(0x7352, 0x7353, 2, 0xF18B, 0x60, 0x63);
      // the panel's picture: four frames, one each 8 ticks
      M[0x7354] = (M[0x7354] - 1) & 255;
      if (!M[0x7354]) {
        M[0x7354] = 8;
        const f = (M[0x7356] + 1) & 3;
        M[0x7356] = f;
        const src = [0x2038, 0x2068, 0x2098, 0x20C8][f];
        for (let x = 0x17; x >= 0; x--) { M[0xE128 + x] = M[src + x]; M[0xE268 + x] = M[src + 0x18 + x]; }
      }
      if (!M[0x109B]) {
        M[0x2468] = (M[0x2468] - 1) & 255;
        if (!M[0x2468]) {
          M[0x2468] = 0x3C;
          if (M[0x2459] >= 2) M[0x2459]--;
          let drained = true;
          M[0x7358] = (M[0x7358] - 1) & 255;
          if (!M[0x7358]) {
            M[0x7358] = 0x0A;
            if (M[0x109A]) { if (M[0x2455]) M[0x2455]--; else drained = false; }
          }
          if (drained) {
            M[0x7359] = (M[0x7359] - 1) & 255;
            if (!M[0x7359]) { M[0x7359] = 0x78; M[0x246A] = (M[0x246A] + 1) & 255; }
          }
          M[0x2469] = (M[0x2469] - 1) & 255;
          if (!M[0x2469]) { M[0x2469] = 0x0A; M[0x246D] = (M[0x246D] + 1) & 255; }
        }
      }
      io.ciaRead(0x0D);
    }
    M[0x1C72] = 0;
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
