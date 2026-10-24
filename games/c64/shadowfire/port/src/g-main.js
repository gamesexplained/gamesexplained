// The main program: the start ($4000-$40A2), the restart and the control menu ($40A3-$427C), the
// command loop every screen runs ($4AD7-$4CE9), the screens it hands over to and their icons'
// handlers, the team, movement, status, objects and battle screens ($6DCB-$7281), the objects' own
// routines ($7282-$74B8), the start menu with Old game and New game ($74B9-$7603), and the file
// name screen with the load and save ($762F-$7899).
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.main = function (P) {
  const M = P.M, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  // the record of the character on show, at ($41), and its status byte, which the interrupt
  // changes under the main program
  const charRec = () => w(0x41);
  const charStatus = () => P.irqByte(charRec());
  // the location on show's record, at ($3F)
  const place = y => M[(w(0x3F) + y) & 0xFFFF];

  // ---- the main program. It never returns: each place it goes on from is reached by a JMP, which
  // the port throws (P.jump) and this catches.
  P.main = function* (o = {}) {
    let at = o.at || 'start';
    for (;;) {
      try {
        yield* P[at]({});
        throw new Error('the main program returned from ' + at);
      } catch (e) {
        if (!(e instanceof P.Jump)) throw e;
        at = e.to;
      }
    }
  };

  // The main program taken up at a pass of the command loop with no choice under way (the tests'
  // moments of play).
  P.resume = () => P.main({ at: 'icon_poll' });

  // ---- the start ($4000), from the tape's stub: page 3 cleared, the character-output vector at an
  // RTS, the game's state copied under the chips for New game, colour RAM from $1000, the text
  // screen blank, the clock's cells clear and two strips of colour RAM. The copy of the KERNAL's
  // vectors from $FD30 into page 3 is left out: the port has no ROM, and only the KERNAL's own
  // routines read them, which the port's load and save do not run.
  P.start = function* () {
    P.sei();
    for (let x = 0; x < 256; x++) M[0x0300 + x] = 0;
    M[0x0326] = M[0x4272]; M[0x0327] = M[0x4273];
    M[0x00] |= 3;
    M[0x01] = 0x14;
    for (let i = 0; i < 0x600; i++) M[0xD000 + i] = M[0xCA00 + i];
    M[0x2D] = 0; M[0x2E] = 0xD0; M[0x33] = 0; M[0x34] = 0xD6;
    M[0x01] = 0x35;
    for (let n = 0, x = 0; n < 256; n++, x = (x - 1) & 255) {
      io.colourWrite(x, M[0x1000 + x]); io.colourWrite(0x100 + x, M[0x1100 + x]);
      io.colourWrite(0x200 + x, M[0x1200 + x]); io.colourWrite(0x300 + x, M[0x1300 + x]);
      M[0x0400 + x] = 0x20; M[0x0500 + x] = 0x20; M[0x0600 + x] = 0x20; M[0x0700 + x] = 0x20;
    }
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0);
    for (let x = 0x28; x; x--) M[0x28F7 + x] = 0;
    for (let x = 5; x; x--) io.colourWrite(0x11E + x, 7);
    for (let x = 0x0C; x; x--) io.colourWrite(0x168 + x, 5);
    return yield* P.restart();
  };

  // ---- the restart ($40A3), where RUN/STOP with RESTORE lands too: the CIAs' interrupts off,
  // the keyboard's ports, the video chip's bank and modes, the five sprites, the welcome message
  // queued, the interrupt vectors, and the raster interrupt started at line $F8 once the beam has
  // passed line $80. Then the control menu ($41BD): the monitor blank, the iris closed, the game
  // stopped.
  P.restart = function* () {
    // a checkpoint, so that the page's clock pays for the start before the video chip's set
    yield { cp: 0x40A3 };
    P.sei();
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.ciaWrite(0x0D, 0x1F); io.cia2Write(0x0D, 0x1F);
    M[0x68B0] = 1; M[0x42C1] = 0; M[0x1600] = 7;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x00, 0); io.ciaWrite(0x03, 0);
    io.cia2Write(0x02, 3 | io.cia2Read(0x02));
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 3);
    io.vicWrite(0x18, 0x38);
    io.vicWrite(0x11, (io.vicRead(0x11) & 0x7F) | 0x30);
    io.vicWrite(0x16, io.vicRead(0x16) | 0x10);
    for (const r of [0x28, 0x29, 0x2A, 0x2B]) io.vicWrite(r, 0x0B);
    io.vicWrite(0x27, 0); io.vicWrite(0x25, 1); io.vicWrite(0x15, 0x1E);
    io.vicWrite(0x02, 0x88); io.vicWrite(0x06, 0x88); io.vicWrite(0x03, 0x38); io.vicWrite(0x05, 0x38);
    io.vicWrite(0x04, 0xB8); io.vicWrite(0x08, 0xB8); io.vicWrite(0x07, 0x62); io.vicWrite(0x09, 0x62);
    io.vicWrite(0x00, 0xAC);
    M[0x68E5] = 0x56;
    io.vicWrite(0x01, 0xBD); io.vicWrite(0x1D, 0x1E); io.vicWrite(0x17, 0x1E); io.vicWrite(0x1C, 1); io.vicWrite(0x10, 0);
    M[0x0FF9] = 0x24; M[0x0FFA] = 0x25; M[0x0FFB] = 0x26; M[0x0FFC] = 0x27; M[0x0FF8] = 0x28;
    P.queue_message({ a: M[0x42C3], y: M[0x42C4] });
    M[0x66CF] = 0;
    M[0x01] = 0x35;
    M[0xFFFE] = M[0x5499]; M[0xFFFF] = M[0x549A];
    M[0xFFFA] = M[0x0318] = M[0x42D2];
    M[0xFFFB] = M[0x0319] = M[0x42D3];
    M[0x45] = M[0xCA08]; M[0x46] = M[0xCA09];
    yield { wait: 0x80, at: 0x41AD };
    io.vicWrite(0x12, 0xF8); io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.cli();
    M[0x5436] = 6;
    yield* P.show_portrait({ a: 6 });
    if (M[0x6C8C]) yield* P.iris_close({});
    M[0x66CD] = 0; M[0x66CC] = 0; M[0x6C8C] = 0; M[0x8189] = 0;
    M[0x68B0] = 1;
    P.sei(); io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1); P.cli();
    return yield* P.control_menu();
  };
  P.CHECKPOINTS.push(0x40A3);
  P.WAITS.push(0x41AD);

  // The control menu's screen ($41EA, the start menu's Quit too): the keyboard polled for F1, F3,
  // F5 or F7 until the music driver's $1600 reads $82, the end of the title tune, which starts the
  // demonstration. A key chooses its input routine for the interrupt, from $42C6.
  P.control_menu = function* () {
    io.vicWrite(0x15, 0x1E);
    yield* P.clear_panels({});
    yield* P.draw_screen({ a: 6 });
    P.print_clock({});
    M[0x42D8] = 0; M[0x6932] = 0;
    M[0x1602] = 0x30;
    for (;;) {
      const k = io.ciaRead(0x01);
      for (let x = 4; x >= 0; x--) {
        if (k !== M[0x42CE + x]) continue;
        P.sei(); M[0x54EF] = M[0x42C6 + 2 * x]; M[0x54F0] = M[0x42C7 + 2 * x]; P.cli();
        io.vicWrite(0x15, 0x1F);
        P.jump('j_74BE');
      }
      if (M[0x1600] === 0x82) break;
      yield;
    }
    // the demonstration: its input routine ($5570) and the first point of its script ($1571)
    P.sei();
    M[0x54EF] = M[0x42D4]; M[0x54F0] = M[0x42D5];
    M[0x6931] = 2;
    M[0x692E] = M[0x1571]; M[0x692F] = M[0x1572];
    M[0x6933] = 0;
    M[0x42D8] = 1;
    P.cli();
    io.vicWrite(0x15, 0x1F);
    P.queue_message({ a: M[0x8163], y: M[0x8164] });
    P.jump('j_74BE');
  };

  // set_tune ($4274): the music driver's request, but not in the demonstration
  P.set_tune = function (r) {
    const x = M[0x42D8];
    if (!x) M[0x1600] = r.a;
    return { a: r.a, x, z: x ? 0 : 1 };
  };

  // ---- the command loop. shake_screen ($4AD7), Zoff V blown up: 256 frames of random fine scroll
  // and flashing colours with the interrupt off, each frame's colours set when the beam is at line
  // 1, then the scroll put back and on into leave_to_start_menu.
  P.shake_screen = function* () {
    P.sei();
    io.vicWrite(0x15, 0);
    const d011 = io.vicRead(0x11), d016 = io.vicRead(0x16);
    let x = 0;
    do {
      M[0x7B] = io.vicRead(0x11) & 0x78;
      io.vicWrite(0x11, (M[0x4000 + x] & 7) | M[0x7B]);
      M[0x7B] = io.vicRead(0x16) & 0xF8;
      io.vicWrite(0x16, (M[0x5000 + x] & 7) | M[0x7B]);
      yield { wait: 1, at: 0x4B15 };
      const c = M[0x5489 + (x & 0x0F)];
      io.vicWrite(0x20, c); io.vicWrite(0x21, c);
      x = (x + 1) & 255;
    } while (x);
    io.vicWrite(0x16, d016);
    io.vicWrite(0x11, d011 & 0x7F);
    io.vicWrite(0x15, 0x1F);
    P.cli();
    return yield* P.leave_to_start_menu();
  };
  P.WAITS.push(0x4B15);
  // leave_to_start_menu ($4B35): the iris closed and the monitor blank if the view was open, Old
  // game refused ($CF7F), the leave request cleared, then the start menu.
  P.leave_to_start_menu = function* () {
    if (M[0x6C8C]) {
      yield* P.iris_close({});
      M[0x66CD] = 0; M[0x66CC] = 0; M[0x6C8C] = 0;
      M[0x5436] = 6;
      yield* P.show_portrait({ a: 6 });
    }
    M[0xCF7F] = 1;
    M[0x6932] = 0;
    P.jump('start_menu');
  };

  // screen_ptr ($4CEA): the first icon of the current screen ($5435), from the table at $789C.
  P.screen_ptr = function () {
    const y = (M[0x5435] << 1) & 255;
    M[0x37] = M[0x789C + y]; M[0x38] = M[0x789D + y];
    return { a: M[0x38], y };
  };

  // icon_loop ($4B64): the team-changed flag and the choice under way cleared, then the loop.
  P.icon_loop = function* () {
    M[0x68B2] = 0; M[0x543E] = 0;
    return yield* P.icon_poll();
  };
  // icon_poll ($4B6C), a pass: the current screen's icons and the cursor's cell; a reason to leave
  // (the demonstration's end, the mission over, Zoff V blown up, the character on show unable to
  // act, a team member dead); a door just opened; then each icon tested against the cursor. A
  // chosen icon's handler goes on elsewhere or, for the second step of a choice, returns, and so
  // does this.
  P.icon_poll = function* () {
    for (;;) {
      yield { cp: 0x4B6C };
      P.screen_ptr({});
      yield* P.cursor_cell({});
      if (P.irqByte(0x6932)) return yield* P.leave_to_start_menu();
      if (!M[0x68B0]) {
        const mission = P.irqByte(0xCA05);
        if (mission === 0 || mission === 0x1F) return yield* P.leave_to_start_menu();
        if ((mission & 0x0C) === 4) return yield* P.shake_screen();
        if (M[0x6C8C]) {
          if (charStatus() & 3) P.jump('team_screen');
        } else if (P.irqByte(0x68B2)) {
          yield* P.draw_screen({ a: 0 });
          P.jump('icon_loop');
        }
      }
      if (P.irqByte(0xCF82) && M[0x6C8C]) {
        P.reset_door_icons({});
        M[0xCF82] = 0;
      }
      for (;;) {
        const r = yield* P.icon_test();
        if (r) return r.value;
        if (P.next_icon({}).c) break;
      }
    }
  };
  P.CHECKPOINTS.push(0x4B6C);
  // icon_test ($4BC4): the icon at ($37) against the cursor's cell. An icon is enabled by bit 0 of
  // its flags; one without bit 1 must also carry the mask of the choice under way ($545F); one with
  // bit 1 starts a choice, and only when none is under way. Inside its rectangle its frame is
  // drawn with fire_flag ($78) set first: the interrupt clears it while fire is held, and that
  // chooses the icon. Gives null to go on to the next icon, or { value }, what its handler returned.
  P.icon_test = function* () {
    let ip = w(0x37);
    const flags = M[ip + 4];
    if (!(flags & 1)) return null;
    if (flags & 2) {
      if (M[0x543E]) return null;
    } else {
      const g = M[0x545F + M[0x543E]];
      if ((g & flags) !== g) return null;
    }
    M[0x31] = M[ip]; M[0x32] = M[ip + 1];
    P.N.enabled++;
    const pic = w(0x31);
    M[0x49F1] = M[pic]; M[0x49F2] = M[pic + 1];
    const col = M[ip + 2], row = M[ip + 3];
    if (row >= M[0x76] || ((row + M[0x49F2]) & 255) < M[0x76]) return null;
    P.N.inrow++;
    if (col >= M[0x77] || ((col + M[0x49F1]) & 255) < M[0x77]) return null;
    M[0x78] = 0xFF;
    let f = yield* P.frame_icon({ x: col, y: row });
    if (P.irqByte(0x78)) return null;
    // chosen: a click when the icon has a label; the carry is set only when it has none
    let c = 0;
    if (M[ip + 7] === 0xFF && M[ip + 8] === 0xFF) c = 1;
    else M[0x1601] = 0xDE;
    M[0x6933] = 0;
    if (M[ip + 4] & 2) {
      // the first step of a two-step choice: its frame stays up while the loop runs for the second
      M[0x543E] = (M[ip + 4] & 0xFC) >> 2;
      const saved = ip;
      M[0x543B] = M[0x49F1]; M[0x543C] = M[0x49F2];
      M[0x543F] = 1;
      yield* P.frame_icon({ x: M[ip + 2], y: M[ip + 3] });
      do {
        M[0x543F] = 0; M[0x543A] = 0;
        yield* P.icon_poll();
      } while (M[0x543A]);
      M[0x49F1] = M[0x543B]; M[0x49F2] = M[0x543C];
      ip = saved; setw(0x37, ip);
      f = yield* P.frame_icon({ x: M[ip + 2], y: M[ip + 3] });
      c = f.c;
      if (M[0x5439]) { M[0x5439] = 0; P.jump('icon_loop'); }
    }
    // the handler, through the JMP at $4CDC
    M[0x4CDD] = M[ip + 9]; M[0x4CDE] = M[ip + 10];
    const h = w(0x4CDD);
    return { value: yield* P.handler(h)({ a: M[ip + 10], x: f.x, y: 0x0A, c }) };
  };

  // The icons' handlers, by address: P's routine of that name, or a function. The entries between
  // the labels load a number and branch on (Sevrina's icon at $6ED4, the second exit at $6E4B ...).
  P.HANDLERS = {};
  P.handler = h => {
    const f = P.HANDLERS[h];
    if (f === undefined) throw new Error('the port has no icon handler at $' + h.toString(16));
    return typeof f === 'string' ? P[f] : f;
  };
  const entries = (first, step, n, f) => { for (let k = 0; k < n; k++) P.HANDLERS[first + step * k] = function* (r) { return yield* f(k, r); }; };

  // ---- the team screen ($6DCB): the iris closed, the bars and the scan off, the monitor blank,
  // then (at $6DE9, where a new or old game starts) the panels cleared in $68, screen 0 and the loop.
  P.team_screen = function* () {
    yield* P.iris_close({});
    M[0x66CD] = 0; M[0x66CC] = 0; M[0x6C8C] = 0; M[0x8189] = 0;
    M[0x5436] = 6;
    yield* P.show_portrait({ a: 6 });
    M[0x4A62] = 0x68;
    return yield* P.j_6DE9();
  };
  P.j_6DE9 = function* () {
    yield* P.clear_panels({});
    yield* P.draw_screen({ a: 0 });
    P.jump('icon_loop');
  };
  // The movement screen ($6DF4): its eight arrows choosable (flag bit 2) only out of combat.
  P.movement_screen = function* () {
    M[0x66CC] = 0; M[0x66CD] = 0;
    M[0x4A62] = 0x57;
    yield* P.clear_panels({});
    M[0x8189] = 0;
    const combat = charStatus() & 0x0C;
    for (let y = 4, x = 8; x; x--, y += 0x0B) {
      const f = M[0x7975 + y] & 1;
      if (combat) M[0x7975 + y] = f;
      else if (f) M[0x7975 + y] = f | 4;
    }
    yield* P.draw_screen({ a: 2 });
    P.jump('icon_loop');
  };
  // move_by_exit ($6E65): through the exit at offset Y of the location's record, unless defending
  // or attacking away from the battle screen; a retreat moves. The time for each unit of the exit's distance
  // comes from the character's agility and the base for the character (the ADC takes the carry the
  // handler is entered with).
  P.move_by_exit = function* (r) {
    const save = r.y, rec = charRec();
    const s = M[rec + 5] + M[0xCFB7 + M[0x5436]] + (r.c ? 1 : 0);
    let a = ((s & 255) >> 1) | (s > 255 ? 0x80 : 0);
    a = (((a >> 1) | 0x80) ^ 0xFF) >> 3;
    M[0x81A9] = a | 1;
    const st = P.irqByte(rec) & 0x0C;
    if (st && st !== 4 && (st === 8 || !M[0x8189])) {
      P.queue_message({ a: M[0x7F4B], y: M[0x7F4C] });
      P.jump('icon_loop');
    }
    const dist = place(save) & 7;
    M[rec + 3] = place((save - 1) & 255);
    M[0x7D] = 1;
    M[rec + 1] = P.multiply({ a: dist, y: M[0x81A9] }).a;
    if (!(P.irqByte(rec) & 0x0C)) { M[rec] = 1; P.jump('team_screen'); }
    P.jump('j_7134');
  };
  P.move_exit_1 = function* (r) { return yield* P.move_by_exit(Object.assign({}, r, { y: 4 })); };
  entries(0x6E47, 4, 8, (k, r) => P.move_by_exit(Object.assign({}, r, { y: 4 + 2 * k })));

  // choose_character ($6EEA): character A on show, its record at ($41), its location kept, the
  // arrows for it, its portrait; on into the status screen.
  P.choose_character = function* (r) {
    M[0x5436] = r.a;
    const p = P.multiply({ a: r.a, y: 0x12 });
    setw(0x41, ((p.a | p.y << 8) + w(0xCA08)) & 0xFFFF);
    M[0x5437] = P.irqByte(charRec() + 2);
    yield* P.build_directions({ a: M[0x5437], y: 2 });
    yield* P.show_portrait({});
    return yield* P.status_screen();
  };
  P.choose_syylk = function* () { return yield* P.choose_character({ a: 0 }); };
  entries(0x6ECF, 5, 6, k => P.choose_character({ a: k }));
  // The status screen ($6F0B): the bars from 0 again, screen 1, the bars on, the iris opened.
  P.status_screen = function* () {
    M[0x66CD] = 0; M[0x8189] = 0; M[0x66CC] = 0;
    for (let x = 5; x; x--) M[0x66BD + x] = 0;
    M[0x4A62] = 0x29;
    yield* P.clear_panels({});
    yield* P.draw_screen({ a: 1 });
    M[0x66CC] = 1;
    if (!M[0x6C8C]) { yield* P.iris_open({}); M[0x6C8C] = 1; }
    P.jump('icon_loop');
  };

  // ---- the objects screen ($6F42), and $6F62 where its handlers come back to: the objects here and
  // those carried listed, screen 4, the weight bar from 0 the first time.
  P.objects_screen = function* () {
    M[0x66CC] = 0; M[0x5440] = 0; M[0x5441] = 0; M[0x8189] = 0;
    M[0x4A62] = 0x73;
    yield* P.clear_panels({});
    for (let x = 0x4F; x >= 0; x--) M[0x0F98 + x] = 0x27;
    return yield* P.j_6F62();
  };
  P.j_6F62 = function* () {
    P.list_objects_here({});
    P.list_objects_carried({});
    yield* P.draw_screen({ a: 4 });
    if (!M[0x66CD]) {
      M[0x66C1] = 0; M[0x66C2] = 0;
      M[0x66CD] = 1; M[0x66CC] = 1;
    }
    P.jump('icon_loop');
  };
  // the object icons, the second step of Pick-up, Drop, Ready and Activate: each records its slot
  const slot = function* (k) { M[0x5438] = k; return { a: k }; };
  P.object_slot_0 = function* () { return yield* slot(0); };
  P.object_slot_6 = function* () { return yield* slot(6); };
  entries(0x6F85, 6, 14, slot);
  // object n's record, at ($2D)
  const objectRec = n => {
    const p = P.multiply({ a: n, y: 7 });
    const a = ((p.a | p.y << 8) + w(0xCD96)) & 0xFFFF;
    setw(0x2D, a);
    return a;
  };
  // Pick-up ($6FD9): unless already carried, carried by the character on show, its weight added.
  P.pick_up = function* () {
    const o = objectRec(M[0x5449 + M[0x5438]]), rec = charRec();
    if (!(M[o] & 1)) {
      M[o] |= 1;
      M[o + 1] = M[0x5436];
      M[rec + 7] = M[o + 2] + M[rec + 7];
    }
    return yield* P.j_6F62();
  };
  // Drop ($7011): left in the character's location, the weight taken off, not held ready any more.
  P.drop = function* () {
    const o = objectRec(M[0x5449 + M[0x5438]]), rec = charRec();
    M[o] &= 0xFE;
    M[o + 1] = M[0x5437];
    M[rec + 7] = M[rec + 7] - M[o + 2];
    if (M[rec + 8] === M[0x5449 + M[0x5438]]) M[rec + 8] = 0;
    return yield* P.j_6F62();
  };
  // Ready ($7056): held ready, and picked up.
  P.ready = function* () {
    M[charRec() + 8] = M[0x5449 + M[0x5438]];
    return yield* P.pick_up();
  };
  // Activate ($7063): the object's own routine, from +5 and +6 of its record, through the JSR at
  // $708A.
  P.activate = function* () {
    const n = M[0x5449 + M[0x5438]];
    M[0x5438] = n;
    const o = objectRec(n);
    M[0x708B] = M[o + 5]; M[0x708C] = M[o + 6];
    const f = P.objectRoutine(w(0x708B));
    const r = f.call(P, { a: M[o + 6], x: n, y: 6 });
    if (r && typeof r.next === 'function') yield* r;
    return yield* P.j_6F62();
  };
  // The objects' routines, by address.
  P.OBJECT_ROUTINES = {
    0x7282: 'activate_time_delay', 0x729C: 'activate_master_key', 0x72A3: 'activate_key_0', 0x7301: 'activate_tool_kit',
    0x734D: 'activate_beacon', 0x7406: 'activate_ballistic', 0x746C: 'activate_destruct_card',
    0x747F: 'activate_destruct_unit', 0x74AD: 'activate_object_4', 0x74B3: 'activate_weapon',
  };
  P.objectRoutine = a => {
    const f = P.OBJECT_ROUTINES[a];
    if (f === undefined) throw new Error('the port has no object routine at $' + a.toString(16));
    return typeof f === 'string' ? P[f] : f;
  };
  // the page arrows ($7090, $70CB): the next entries; inside a choice they keep it going
  P.page_here = function* () {
    if (M[0x543E] === 5) {
      M[0x5444] += 8;
      P.list_team_beacon1({});
      if (M[0x5488]) P.clear_object_icons({});
    } else {
      M[0x5440] += 8;
      P.list_objects_here({});
    }
    yield* P.draw_screen({ a: 4 });
    if (M[0x543E]) { M[0x543A]++; return { a: M[0x543E] }; }
    P.jump('icon_loop');
  };
  P.page_carried = function* () {
    if (M[0x543E] === 5) {
      M[0x5445] += 5;
      P.list_team_beacon2({});
      if (M[0x5488]) P.clear_object_icons({});
    } else {
      M[0x5441] += 5;
      P.list_objects_carried({});
    }
    yield* P.draw_screen({ a: 4 });
    if (M[0x543E]) { M[0x543A]++; return { a: M[0x543E] }; }
    P.jump('icon_loop');
  };
  // Quit on the objects and battle screens ($7106): cancels a choice, or back to the status screen.
  P.quit_choice = function* () {
    if (M[0x543E]) { M[0x5439] = 1; return { a: 1 }; }
    P.jump('status_screen');
  };

  // ---- the battle screen ($7119), and $7134 and $713C where its handlers come back to.
  P.battle_screen = function* () {
    M[0x66CC] = 0; M[0x66CD] = 0;
    M[0x4A62] = 0x25;
    yield* P.clear_panels({});
    M[0x5446] = M[0x5437];
    M[0x5442] = 0;
    return yield* P.j_7134();
  };
  P.j_7134 = function* () {
    P.list_people_here({});
    M[0x8189] = 1;
    return yield* P.j_713C();
  };
  P.j_713C = function* () {
    yield* P.draw_screen({ a: 5 });
    P.jump('icon_loop');
  };
  // the direction icons, the second step of Attack, Retreat and Location scan: the exit's offset
  const scanExit = function* (k) { M[0x5446] = 4 + 2 * k; return { y: 4 + 2 * k }; };
  P.scan_exit_1 = function* () { return yield* scanExit(0); };
  entries(0x7144, 4, 8, scanExit);
  // Location scan ($7166): the exit's destination, or the character's own location for $FF.
  P.location_scan = function* () {
    const y = (M[0x5446] - 1) & 255;
    M[0x5446] = y === 0xFE ? M[0x5437] : place(y);
    return yield* P.j_7134();
  };
  P.scan_here = function* () { M[0x5446] = 0xFF; return { a: 0xFF }; };
  const person = function* (k) { M[0x818A] = k; return { a: k }; };
  P.person_slot_0 = function* () { return yield* person(0); };
  entries(0x7185, 6, 8, person);
  P.page_people = function* () {
    M[0x5442] += 8;
    P.list_people_here({});
    yield* P.draw_screen({ a: 5 });
    if (M[0x543E]) { M[0x543A]++; return { a: M[0x543E] }; }
    P.jump('icon_loop');
  };
  // Attack ($71D2): with a living enemy in the location chosen, the character's destination that
  // location, its countdown the exit's distance x 4, its status $0C.
  P.attack = function* () {
    const e = M[0x7B] = M[0x5446];
    M[0x5446] = e === 0xFF ? M[0x5437] : place((e - 1) & 255);
    if (!P.enemy_at({}).c) {
      P.queue_message({ a: M[0x7F2A], y: M[0x7F2B] });
      return yield* P.j_7134();
    }
    const rec = charRec();
    const dist = place(M[0x7B]) & 7;
    M[rec + 3] = M[0x5446];
    M[rec + 1] = dist << 2;
    M[rec] = 0x0C;
    return yield* P.j_7134();
  };
  // Retreat ($721A): refused into a location with an enemy; otherwise status 5 and the move.
  P.retreat = function* () {
    const y = M[0x5446];
    M[0x5446] = place((y - 1) & 255);
    const e = P.enemy_at({});
    if (e.c) {
      P.queue_message({ a: M[0x7F03], y: M[0x7F04] });
      return yield* P.j_7134();
    }
    M[0x5446] = y;
    M[charRec()] = 5;
    return yield* P.move_by_exit({ y, c: 0 });
  };
  P.defend = function* () {
    M[charRec()] = 8;
    return yield* P.j_7134();
  };
  // enemy_at ($7250): carry set when one of fifty entities from entity 8 on is alive and in
  // location $5446 (the last eight records are past the end of the table); its record at ($2D).
  P.enemy_at = function () {
    let p = w(0xCA0C), y = 0;
    setw(0x2D, p);
    for (let x = 0x32; x; x--) {
      y = 0;
      if (!(P.irqByte(p) & 2)) {
        y = 2;
        const at = P.irqByte((p + 2) & 0xFFFF);
        if (at === M[0x5446]) return { a: at, x, y, c: 1 };
      }
      p = (p + 0x12) & 0xFFFF;
      setw(0x2D, p);
    }
    return { a: M[0x2D], x: 0, y, c: 0 };
  };

  // ---- the objects' own routines, through Activate's JSR
  // The time delay unit ($7282): 120 seconds in which only its user acts; it works once.
  P.activate_time_delay = function () {
    M[0xCF83] = 0x78; M[0xCF84] = M[0x5436];
    M[0x6803] = P.irqByte(0xCA00);
    M[0xCE0F] &= 0xFB;
    return {};
  };
  // The keys ($729C-$72B1): the first door among the exits whose colour ($18 of the door's number)
  // is the key's, or any door for the master key, opened; the arrows drawn again for the new way.
  P.activate_master_key = function () {
    M[0x818D] = 1;
    return unlock();
  };
  P.open_door = function (r) {
    M[0x7B] = r.a;
    M[0x818D] = 0;
    return unlock();
  };
  P.activate_key_0 = function () { return P.open_door({ a: 0 }); };
  Object.assign(P.OBJECT_ROUTINES, { 0x72A7: () => P.open_door({ a: 8 }), 0x72AB: () => P.open_door({ a: 0x10 }), 0x72AF: () => P.open_door({ a: 0x18 }) });
  function unlock() {
    P.count_exits({});
    let open = false;
    for (let y = 4; M[0x74]; y += 2, M[0x74]--) {
      const d = place(y) & 0xF8;
      if (!d) continue;
      M[0x7C] = d >> 3;
      if (M[0x818D] || (M[0x7C] & 0x18) === M[0x7B]) { M[0xCFC9 + M[0x7C]] = 0; open = true; break; }
    }
    if (!open) P.queue_message({ a: M[0x8177], y: M[0x8178] });
    // with no_map set it draws nothing, and so never yields
    M[0x6DC6] = 1;
    P.drain(P.build_directions({ a: M[0x5437] }));
    M[0x6DC6] = 0;
    return { a: 0 };
  }
  // The tool kit ($7301): Sevrina starts to pick the first locked door among the exits.
  P.activate_tool_kit = function () {
    if (M[0x5436] !== 1) return {};
    P.count_exits({});
    for (let y = 4; M[0x74]; y += 2, M[0x74]--) {
      const d = place(y) & 0xF8;
      if (d && M[0xCFC9 + (d >> 3)]) {
        M[0xCF81] = d >> 3;
        M[charRec()] = 0x10;
        return { a: 0x10 };
      }
    }
    P.queue_message({ a: M[0x8177], y: M[0x8178] });
    return {};
  };
  // count_exits ($733B): the location's exits, the bits of its mask, in $74.
  P.count_exits = function () {
    let a = place(2), x = 0;
    for (let y = 8; y; y--) { if (a & 0x80) x++; a = (a << 1) & 255; }
    M[0x74] = x;
    return { a: 0, x, y: 0 };
  };
  // A transporter beacon ($734D): the people at each beacon listed, one of them chosen (group 5)
  // and sent to the other beacon in a second; with Manto sent, the view follows the character on
  // show.
  P.activate_beacon = function* () {
    M[0x5444] = 0; M[0x5445] = 0; M[0x5488] = 0;
    P.list_team_beacon1({});
    P.list_team_beacon2({});
    if (M[0x5488]) P.clear_object_icons({});
    yield* P.draw_screen({ a: 4 });
    do {
      M[0x543E] = 5; M[0x543A] = 0; M[0x5439] = 0;
      yield* P.icon_poll();
      if (M[0x5439]) { M[0x5439] = 0; P.jump('j_6F62'); }
    } while (M[0x543A]);
    const n = M[0x5438] = M[0x5449 + M[0x5438]];
    const p = P.multiply({ a: n, y: 0x12 });
    const e = ((p.a | p.y << 8) + w(0xCA08)) & 0xFFFF;
    setw(0x33, e);
    const at = P.irqByte(e + 2);
    if (at === M[0xCDA0] || at === M[0xCD99]) {
      M[e + 3] = at === M[0xCDA0] ? M[0xCD99] : M[0xCDA0];
      M[e + 1] = 1; M[e] = 1;
    }
    if (n === 2) yield* viewFollows();
    P.jump('j_6F62');
  };
  // $73DF and $7445: the iris closed, the arrows for the location of the character on show, the
  // iris opened again.
  function* viewFollows() {
    yield* P.iris_close({});
    M[0x5437] = P.irqByte(charRec() + 2);
    yield* P.build_directions({ a: M[0x5437], y: 2 });
    M[0x4A61] = 1;
    M[0x6C8C] = 0;
    yield* P.iris_open({});
    M[0x6C8C] = 1;
    M[0x4A61] = 0;
  }
  // The ballistic control ($7406): one of its three destinations chosen, the character on show sent
  // there in a second.
  P.activate_ballistic = function* () {
    P.set_transporter_icons({});
    yield* P.draw_screen({ a: 4 });
    M[0x543E] = 5; M[0x5439] = 0;
    yield* P.icon_poll();
    if (M[0x5439]) { M[0x5439] = 0; P.jump('j_6F62'); }
    let x = 0;
    while (M[0x5438] !== M[0x81A3 + x]) x = (x + 1) & 255;
    const rec = charRec();
    M[rec + 3] = M[0x81A6 + x];
    M[rec + 1] = 1; M[rec] = 1;
    yield* viewFollows();
    P.jump('j_6F62');
  };
  // The self-destruct card ($746C) and unit ($747F).
  P.activate_destruct_card = function () {
    if (M[0x5437] === M[0xCDAE]) M[0xCDAD] |= 4;
    P.jump('j_6F62');
  };
  P.activate_destruct_unit = function () {
    if (!M[0xCA06]) {
      M[0xCA06] = 1;
      P.queue_message({ a: M[0x80F0], y: M[0x80F1] });
    }
    P.jump('j_6F62');
  };
  // Object 4's routine and the weapons' ($74AD, $74B3): the border one colour on or back.
  P.activate_object_4 = function () { io.vicWrite(0x20, (io.vicRead(0x20) + 1) & 255); P.jump('objects_screen'); };
  P.activate_weapon = function () { io.vicWrite(0x20, (io.vicRead(0x20) - 1) & 255); P.jump('objects_screen'); };

  // ---- the start menu ($74B9): tune 7, the game stopped; at $74BE Old game offered unless $CF7F
  // says not, the mission's state in the summary's two tokens (the first objective still to do, or
  // mission complete), screen 7.
  P.start_menu = function* () {
    P.set_tune({ a: 7 });
    return yield* P.j_74BE();
  };
  P.j_74BE = function* () {
    M[0x68B0] = 1;
    M[0x7C7C] = M[0xCF7F] ? 0 : 5;
    const mission = M[0xCA05];
    if (mission & 1 && mission === 0x1F) {
      M[0xCF7B] = 0xB1; M[0xCF7D] = 0xB7; M[0x7C7C] = 0;
    } else {
      if (mission & 1) M[0xCF7B] = 0xB0;
      else { M[0xCF7B] = 0xAF; M[0x7C7C] = 0; }
      let a = mission, x = 0;
      while (a & 1) { a >>= 1; x++; }
      M[0xCF7D] = x + 0xB2;
      M[0x4A62] = 0x21;
    }
    yield* P.clear_panels({});
    yield* P.draw_screen({ a: 7 });
    P.jump('icon_loop');
  };
  // Old game ($7526): tune 1, the team icons and the map put back, the game running again; each
  // dead team member gets a black status icon and the dead picture, disabled. Then the team screen.
  P.old_game = function* () {
    P.set_tune({ a: 1 });
    P.reset_team_icons({});
    M[0x68B0] = 0;
    P.print_clock({});
    for (let e = 5; e >= 0; e--) {
      M[0x7B] = e;
      if (!(P.irqByte(0xCA0E + P.multiply({ a: e, y: 0x12 }).a) & 2)) continue;
      P.colour_status_icon({ a: e, y: 0 });
      const x = P.multiply({ a: e, y: 0x0B }).a;
      const pic = e === 2 || e === 3 ? 0x8D82 : 0xFF2E;
      M[0x78AE + x] = M[pic]; M[0x78AE + x + 1] = M[pic + 1];
      M[0x78AE + x + 4] = 0;
    }
    M[0x7B] = 0xFF;
    return yield* P.j_6DE9();
  };
  // New game ($758E): tune 1, the game's state copied back from under the chips ($D000-$D5FF to
  // $CA00-$CFFF, with $01 = $34), the team icons and the map put back, the game running.
  P.new_game = function* () {
    P.set_tune({ a: 1 });
    P.sei();
    M[0x01] = 0x34;
    for (let i = 0; i < 0x600; i++) M[0xCA00 + i] = M[0xD000 + i];
    M[0x2D] = 0; M[0x2E] = 0xD6; M[0x33] = 0; M[0x34] = 0xD0;
    M[0x01] = 0x35;
    P.cli();
    P.reset_team_icons({});
    M[0x68B0] = 0;
    return yield* P.j_6DE9();
  };
  // reset_team_icons ($75C8): the clock printed, the six team icons' pictures from $818F with
  // flags 5, and the six cells of the ship's map that Zoff's escape changes put back.
  P.reset_team_icons = function () {
    P.print_clock({});
    for (let x = 0, y = 0; x !== 0x0C; x += 2, y += 11) {
      M[0x78AE + y] = M[0x818F + x]; M[0x78AE + y + 1] = M[0x818F + x + 1];
      M[0x78AE + y + 4] = 5;
    }
    for (let x = 2; x >= 0; x--) { M[0x85CD + x] = M[0x81AA + x]; M[0x85ED + x] = M[0x81AD + x]; }
    return { a: M[0x81AD], x: 0xFF, y: 0x42 };
  };

  // ---- the file name screen. Load game ($762F) and Save game ($7648): silence, the heading; then
  // ($765E) an empty name, the tape's prompt off, the return icon off until a letter is typed.
  P.load_game = function* () {
    P.set_tune({ a: 0 });
    M[0x818B] = 1;
    M[0x7E13] = M[0x819B]; M[0x7E14] = M[0x819C];
    return yield* P.name_screen();
  };
  P.save_game = function* () {
    P.set_tune({ a: 0 });
    M[0x818B] = 0;
    M[0x7E13] = M[0x819D]; M[0x7E14] = M[0x819E];
    return yield* P.name_screen();
  };
  P.name_screen = function* () {
    M[0x4A62] = 0x31;
    yield* P.clear_panels({});
    M[0x818E] = 0;
    for (let x = 7; x >= 0; x--) M[0x7F9A + x] = 0x24;
    M[0x800E] = 0xBA;
    M[0x7E0C] = 0;
    return yield* P.j_767F();
  };
  P.j_767F = function* () {
    yield* P.draw_screen({ a: 8 });
    P.jump('icon_loop');
  };
  P.choose_tape = function* () {
    M[0x818C] = 1;
    M[0x7DFD] = M[0x819F]; M[0x7DFE] = M[0x81A0];
    return yield* P.j_767F();
  };
  P.choose_disk = function* () {
    M[0x818C] = 8;
    M[0x7DFD] = M[0x81A1]; M[0x7DFE] = M[0x81A2];
    return yield* P.j_767F();
  };
  // the letters ($76AF-$7716) and add_letter ($7717): up to eight, and the return icon on
  P.add_letter = function* (r) {
    const x = M[0x818E];
    if (x !== 8) {
      M[0x7F9A + x] = r.a;
      M[0x818E] = x + 1;
      M[0x7E0C] = 5;
    }
    return yield* P.j_767F();
  };
  P.letter_a = function* () { return yield* P.add_letter({ a: 0x0A }); };
  entries(0x76AF, 4, 26, k => P.add_letter({ a: 0x0A + k }));
  P.rub_out = function* () {
    const x = M[0x818E];
    if (x) { M[0x818E] = x - 1; M[0x7F9A + x - 1] = 0x24; }
    return yield* P.j_767F();
  };
  // start_file ($773E), the return icon: the game's state, $CA00-$CFFE, saved or loaded back. On
  // tape, the prompt to press play (and record). The raster interrupt stops and the ROMs come in;
  // at line $F8 the video chip's registers $D010-$D018 get the KERNAL's defaults and the screen is
  // blanked; the KERNAL's IOINIT, a delay, then its SETLFS, SETNAM and SAVE or LOAD. The port has
  // no KERNAL: it does what IOINIT does to the chips, and keeps the file in P.io.files, the page's
  // storage (files.load(name, device), the bytes or null; files.save(name, device, bytes)); a file
  // not there is error 4, no storage at all error 5. Then the game's screen and interrupt put back,
  // and the name screen.
  // The KERNAL's defaults for $D010-$D018, from its table at $ECC9-$ECD1 (KERNAL 901227-03).
  const VIC_DEFAULTS = [0x00, 0x9B, 0x37, 0x00, 0x00, 0x00, 0x08, 0x00, 0x14];
  P.start_file = function* () {
    if (M[0x818C] === 1) {
      M[0x800E] = M[0x818B] ? 0xBB : 0xBC;
      yield* P.draw_screen({ a: 8 });
    }
    P.sei();
    M[0x00] = 0x2F; M[0x01] = 0x37;
    io.vicWrite(0x1A, 0); io.vicWrite(0x19, 0xFF);
    P.cli();
    M[0x9D] = 0;
    // on tape the game waits for a button on the cassette ($01 bit 4): the page's is always down
    yield { wait: 0xF8, at: 0x7786 };
    for (let x = 0x18; x >= 0x10; x--) io.vicWrite(x, VIC_DEFAULTS[x - 0x10]);
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    // IOINIT ($FDA3), what reaches the chips
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F); io.ciaWrite(0x00, 0x7F);
    for (const r of [0x0E, 0x0F]) { io.ciaWrite(r, 8); io.cia2Write(r, 8); }
    io.ciaWrite(0x03, 0); io.cia2Write(0x03, 0); io.sidWrite(0x18, 0);
    io.ciaWrite(0x02, 0xFF); io.cia2Write(0x00, 7); io.cia2Write(0x02, 0x3F);
    // the delay, 255 x 255 turns of a DEY loop
    yield { cycles: 0xFF * (0xFF * 5 + 4) };
    const len = M[0x818E], name = [];
    for (let x = len - 1; x >= 0; x--) M[0x7FA9 + x] = M[0x7F9A + x] + 0x37;
    for (let x = 0; x < len; x++) name.push(M[0x7FA9 + x]);
    const files = io.files || null;
    let err = 0;
    if (!M[0x818B]) {
      if (files) files.save(name, M[0x818C], M.slice(0xCA00, 0xCFFF)); else err = 5;
    } else {
      const b = files ? files.load(name, M[0x818C]) : null;
      if (b) M.set(Array.from(b).slice(0, 0x600), 0xCA00);
      else err = files ? 4 : 5;
    }
    if (err === 4) P.queue_message({ a: M[0x7FF6], y: M[0x7FF7] });
    else if (err === 5) { P.queue_message({ a: M[0x800C], y: M[0x800D] }); M[0xCF7F] = 1; }
    io.vicWrite(0x18, 0x38);
    io.vicWrite(0x16, io.vicRead(0x16) | 0x10);
    io.vicWrite(0x15, 0x1F); io.vicWrite(0x17, 0x1E);
    P.sei();
    io.cia2Write(0x0D, 0x1F); io.ciaWrite(0x0D, 0x1F);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.vicWrite(0x11, (io.vicRead(0x11) & 0x7F) | 0x30);
    io.vicWrite(0x12, 0xF8); io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x00, 0); io.ciaWrite(0x03, 0);
    M[0x00] |= 3; M[0x01] = 0x35;
    P.cli();
    return yield* P.name_screen();
  };
  P.WAITS.push(0x7786);
  // music_up and music_down ($7884, $7891): the pulse width of the in-game tune, 0 to $40
  P.music_up = function* () { if (M[0x1603] !== 0x40) M[0x1603]++; P.jump('icon_loop'); };
  P.music_down = function* () { if (M[0x1603]) M[0x1603]--; P.jump('icon_loop'); };
  P.no_action = function* () { return {}; };

  Object.assign(P.HANDLERS, {
    0x41EA: 'control_menu', 0x6DCB: 'team_screen', 0x6DE9: 'j_6DE9', 0x6DF4: 'movement_screen', 0x6F0B: 'status_screen',
    0x6F42: 'objects_screen', 0x6FD9: 'pick_up', 0x7011: 'drop', 0x7056: 'ready', 0x7063: 'activate',
    0x7090: 'page_here', 0x70CB: 'page_carried', 0x7106: 'quit_choice', 0x7119: 'battle_screen', 0x7166: 'location_scan',
    0x7179: 'scan_here', 0x71B5: 'page_people', 0x71D2: 'attack', 0x721A: 'retreat', 0x7247: 'defend',
    0x74B9: 'start_menu', 0x7526: 'old_game', 0x758E: 'new_game', 0x7603: 'no_action',
    0x762F: 'load_game', 0x7648: 'save_game', 0x7687: 'choose_tape', 0x769B: 'choose_disk', 0x772D: 'rub_out',
    0x773E: 'start_file', 0x7884: 'music_up', 0x7891: 'music_down',
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
