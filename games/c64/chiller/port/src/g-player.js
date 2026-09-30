// The player: the boy's moves through the scenery (try_move, move_sprite), the keyboard and
// joystick (read_controls, player_input), the jump and the fall with their sounds, the walking
// and standing frames, the second player's arrival on screens without jumping, the border's
// colour for the current player and the flashing of the crosses.
//
// Several of these routines are rewritten by other code while the game runs, and read here from
// P.M: try_move's row offset ($2A0C, gravity_setup), the frame numbers in idle_frame ($5848,
// $584C, $5876, $587B), jump_lockout ($589B, $58A4, $58A9) and player_input ($C79C, $C7C6,
// player_swap and player_step), and the first bytes of read_controls ($C84D) and frame_step
// ($5980), which become RTS ($60) while the boy is in the air.
(function (root) {
'use strict';
(root.ChillerGroups = root.ChillerGroups || {}).player = function (P) {
  const M = P.M, io = P.io;
  const nz = v => ({ z: (v & 0xFF) === 0 ? 1 : 0, n: (v >> 7) & 1 });
  const cmp = (a, b) => ({ c: a >= b ? 1 : 0, z: a === b ? 1 : 0, n: ((a - b) >> 7) & 1 });
  const regs = (r, ...o) => Object.assign({}, r, ...o);
  // A byte as the processor sees it with the KERNAL and I/O banked in: $D000-$DFFF are the chips.
  const rd = a => (a >= 0xD000 && a < 0xE000) ? io.read(a) : M[a];
  const wr = (a, v) => { if (a >= 0xD000 && a < 0xE000) io.write(a, v & 0xFF); else M[a] = v & 0xFF; };

  // $2A04 try_move: try to move the boy one pixel in direction A (0 up, 1 down, 2 left, 3
  // right). His sprite position becomes a screen row (Y less the offset at $2A0C, over 8) and a
  // column (X less $0C, over 2, with the MSB as bit 7; left of $0C the MSB is not added).
  P.try_move = function* (r) {
    M[0x2AFE] = r.a;
    const row = ((io.vicRead(1) - M[0x2A0C]) & 0xFF) >> 3;
    const dx = io.vicRead(0) - 0x0C;
    let a;
    if (dx < 0) a = (dx & 0xFF) >> 1;          // $2A00: the half column, no MSB
    else {
      M[0x2AFF] = dx >> 1;
      a = ((io.vicRead(0x10) & 1) ? 0x80 : 0) | M[0x2AFF];
    }
    return yield* P.b_2A29(regs(r, { a, y: row }));
  };
  // $2A29 b_2A29: the cell for row Y and half column A: the row's address from row_offsets plus
  // column and $0400 (the screen), and probe_offset[direction] the cell to look at. A space ($A0)
  // or a tile that is positive and below $2A lets him move; tiles $2A-$53 are tile_touch_a's,
  // the rest tile_touch_b's.
  P.b_2A29 = function* (r) {
    const col = r.a >> 2, ty = (r.y << 1) & 0xFF;
    M[0xFB] = M[0x5100 + ty];
    M[0xFC] = M[0x5101 + ty];
    const lo = M[0xFB] + col;
    M[0xFB] = lo & 0xFF;
    if (lo > 0xFF) M[0xFC] = (M[0xFC] + 1) & 0xFF;
    M[0xFC] = (M[0xFC] + 4) & 0xFF;
    const x = M[0x2AFE], y = M[0x5145 + x];
    const t = rd(((M[0xFB] | (M[0xFC] << 8)) + y) & 0xFFFF);
    if (t === 0xA0 || (((t - 0x2A) & 0x80) !== 0)) return yield* P.j_2A57(regs(r, { a: t, x, y }));
    const f = cmp(t, 0x54);
    const out = regs(r, { a: t, x, y }, f);
    if (f.n) return yield* P.tile_touch_a(out);
    return yield* P.tile_touch_b(out);
  };
  // $2A57 j_2A57: the way is open: move the boy (sprite 0) in try_move's direction.
  P.j_2A57 = function* (r) {
    return P.move_sprite(regs(r, { a: M[0x2AFE], x: 0 }));
  };
  // $2A72 jump_setup: the rising flag ($C19B) from A, the first step's time from jump_speeds
  // into the step timer $2A7F, then jump_lockout.
  P.jump_setup = function (r) {
    M[0xC19B] = r.a;
    M[0x2A7F] = M[0x544A];
    return P.jump_lockout(regs(r, { a: M[0x544A] }));
  };
  // $2D8D s_2D8D: sprite 1's pointer from A, and $C544 cleared.
  P.s_2D8D = function (r) {
    M[0x07F9] = r.a;
    M[0xC544] = 0;
    return regs(r, { a: 0, z: 1, n: 0 });
  };
  // $2F00 second_player_in: sprite 1's MSB (A) into $D010, voice 3 silenced, then its seven
  // settings from $45B3.
  P.second_player_in = function (r) {
    io.vicWrite(0x10, r.a);
    io.sidWrite(0x12, 0);
    for (let x = 0; x < 7; x++) io.sidWrite(0x0E + x, M[0x45B3 + x]);
    return regs(r, { a: M[0x45B9], x: 7, c: 1, z: 1, n: 0 });
  };

  // $5350 fall_step: gravity when not jumping, on screens that have it ($45FF). Every $534B
  // calls try him a pixel down: if he moved he falls (the whistle, the fall count, up and down
  // locked), if not he stands (silence, land).
  P.fall_step = function* (r) {
    if (M[0x45FF] === 0) return regs(r, { a: 0, z: 1, n: 0 });
    M[0x534C] = (M[0x534C] - 1) & 0xFF;
    if (M[0x534C] !== 0) return regs(r, { a: M[0x45FF], z: 0, n: M[0x534C] >> 7 });
    M[0x534C] = M[0x534B];
    M[0x534A] = io.vicRead(1);
    r = yield* P.try_move(regs(r, { a: 1, x: 0 }));
    if (io.vicRead(1) === M[0x534A]) return P.fall_sound_off(regs(r, { a: M[0x534A] }));
    r = P.fall_sound(regs(r, { a: io.vicRead(1) }));
    M[0x534E] = (M[0x534E] + 1) & 0xFF;
    M[0x4502] = 0;
    M[0x4503] = 0;
    return regs(r, { a: 0, z: 1, n: 0 });
  };
  // $538E jump_step: the boy's vertical motion each pass. Not jumping: fall_step. Jumping: when
  // the step timer $2A7F runs out, a pixel up while rising ($C19B = 0), with jump_counter $2A7E
  // counting up to 24 through jump_speeds, or a pixel down while falling, the counter counting
  // back to 0; the jump sound's pitch follows.
  P.jump_step = function* (r) {
    M[0xCF02] = (M[0xCF02] + 1) & 0xFF;
    if (M[0xC19C] === 0) return yield* P.fall_step(regs(r, { a: 0 }));
    M[0x2A7F] = (M[0x2A7F] - 1) & 0xFF;
    if (M[0x2A7F] !== 0) return regs(r, { a: M[0xC19C] }, nz(M[0x2A7F]));
    r = P.remember_y(r);
    if (r.a === 0) {
      r = yield* P.try_move(regs(r, { a: 0 }));
      r = P.rise_blocked(r);
      const x = M[0x2A7E];
      if (x === 0x18) {
        M[0xC19B] = 1;
        return regs(r, { a: 1, x, z: 0, n: 0, c: 1 });
      }
      M[0x2A7F] = M[0x544A + x];
      return P.jump_pitch_rise(regs(r, { a: M[0x2A7F], x }));
    }
    r = yield* P.fall_blocked(regs(r, { a: 1 }));
    M[0x2A7E] = (M[0x2A7E] - 1) & 0xFF;
    const x = M[0x2A7E];
    if (x === 0) {
      M[0xC19C] = 0;
      M[0x534E] = 0x18;
      return regs(r, { a: 0x18, x, z: 0, n: 0, c: 1 });
    }
    M[0x2A7F] = M[0x544A + x];
    return P.jump_pitch_fall(regs(r, { a: M[0x2A7F], x }));
  };
  // $53EF land: standing, so up and down are allowed again and the fall count is cleared. (Its
  // compare of the fall with $457A leads only to NOPs: there is no fall damage.)
  P.land = function (r) {
    M[0x4502] = 1;
    M[0x4503] = 1;
    const f = cmp(M[0x534E], M[0x457A]);
    M[0x534E] = 0;
    return regs(r, { a: 0, c: f.c, z: 1, n: 0 });
  };
  // $5418 start_jump: only when the boy is not falling ($534E = 0): in the air ($C19C = 1),
  // jump_counter 0, the rising flag 0, then jump_setup. Falling: walk_frame.
  P.start_jump = function (r) {
    if (M[0x534E] !== 0) return P.walk_frame(regs(r, { a: M[0x534E] }));
    M[0xC19C] = 1;
    M[0x2A7E] = 0;                               // $C1B4
    return P.jump_setup(regs(r, { a: 0 }));
  };
  // $542B remember_y: keep sprite 0's Y in $542A before a step; return the rising/falling flag.
  P.remember_y = function (r) {
    M[0x542A] = io.vicRead(1);
    return regs(r, { a: M[0xC19B] }, nz(M[0xC19B]));
  };
  // $5437 rise_blocked: after a rising step an unchanged Y means a ceiling: he falls from here
  // ($C19B = 1). Count the step.
  P.rise_blocked = function (r) {
    let a = io.vicRead(1);
    const c = a >= M[0x542A] ? 1 : 0;
    if (a === M[0x542A]) { a = 1; M[0xC19B] = 1; }
    M[0x2A7E] = (M[0x2A7E] + 1) & 0xFF;
    return regs(r, { a, c }, nz(M[0x2A7E]));
  };
  // $5467 fall_blocked: one falling step; an unchanged Y means he has landed and the jump is over.
  P.fall_blocked = function* (r) {
    M[0x5466] = io.vicRead(1);
    r = yield* P.try_move(regs(r, { a: 1 }));
    const f = cmp(M[0x5466], io.vicRead(1));
    if (!f.z) return regs(r, { a: M[0x5466] }, f);
    M[0xC19C] = 0;
    return regs(r, { a: 0, c: 1, z: 1, n: 0 });
  };
  // $5483 jump_sound: start the jump sound on voice 3 (attack/decay $0D, sustain/release 0, the
  // waveform from $45B7), its frequency $0800 (jump_sound_freq), then walk_frame.
  P.jump_sound = function (r) {
    io.sidWrite(0x12, 0);
    io.sidWrite(0x13, 0x0D);
    io.sidWrite(0x14, 0);
    io.sidWrite(0x12, M[0x45B7]);
    return P.jump_sound_freq(regs(r, { a: 0 }));
  };
  // $54A0 fall_sound_off: silence voice 3, forget the whistle, then land.
  P.fall_sound_off = function (r) {
    io.sidWrite(0x12, 0);
    M[0x549F] = 0;
    return P.land(regs(r, { a: 0 }));
  };
  // $54AC fall_sound: the falling whistle. The first call starts it (the jump sound, then $8080);
  // each later one lowers the frequency by $80. The first call's BEQ lands inside the JMP after
  // it and runs a CMP ($54,X), a read with no effect unless it reaches a chip.
  P.fall_sound = function (r) {
    if (M[0x549F] !== 0) {
      const d = M[0x54C0] - 0x80;
      M[0x54C0] = d & 0xFF;
      io.sidWrite(0x0E, M[0x54C0]);
      if (d < 0) M[0x54BF] = (M[0x54BF] - 1) & 0xFF;
      io.sidWrite(0x0F, M[0x54BF]);
      return regs(r, { a: M[0x54BF], c: d < 0 ? 0 : 1 }, nz(M[0x54BF]));
    }
    const ea = M[(0x54 + r.x) & 0xFF] | (M[(0x55 + r.x) & 0xFF] << 8);
    if (ea >= 0xD000 && ea < 0xE000) io.read(ea);
    M[0x549F] = 1;
    r = P.jump_sound(regs(r, { a: 1 }));
    M[0x54BF] = 0x80;
    M[0x54C0] = 0x80;
    return regs(r, { a: 0x80, z: 0, n: 1 });
  };
  // $54EA jump_sound_freq: the jump sound's starting frequency, $0800, then walk_frame.
  P.jump_sound_freq = function (r) {
    M[0x54F9] = 0;
    M[0x54FA] = 8;
    return P.walk_frame(regs(r, { a: 8 }));
  };
  // $54FC jump_pitch_rise: a rising step lowers the jump sound's low byte by 5; the high byte
  // goes up when there was no borrow.
  P.jump_pitch_rise = function (r) {
    const d = M[0x54F9] - 5;
    M[0x54F9] = d & 0xFF;
    io.sidWrite(0x0E, M[0x54F9]);
    if (d >= 0) M[0x54FA] = (M[0x54FA] + 1) & 0xFF;
    io.sidWrite(0x0F, M[0x54FA]);
    return regs(r, { a: M[0x54FA], c: d >= 0 ? 1 : 0 }, nz(M[0x54FA]));
  };
  // $5518 jump_pitch_fall: a falling step raises the low byte by 5, and (its BCS going to the
  // next instruction) lowers the high byte every time.
  P.jump_pitch_fall = function (r) {
    const s = M[0x54F9] + 5;
    M[0x54F9] = s & 0xFF;
    io.sidWrite(0x0E, M[0x54F9]);
    M[0x54FA] = (M[0x54FA] - 1) & 0xFF;
    io.sidWrite(0x0F, M[0x54FA]);
    return regs(r, { a: M[0x54FA], c: s > 0xFF ? 1 : 0 }, nz(M[0x54FA]));
  };
  // $5651 gravity_setup: with gravity ($45FF) down is blocked from above ($4500 = 0) and $570A
  // sets try_move's offset $2C; without it $5716 sets $30.
  P.gravity_setup = function (r) {
    if (M[0x45FF] !== 0) {
      M[0x4500] = 0;
      return P.j_570A(regs(r, { a: 0, z: 1, n: 0 }));
    }
    return P.j_5716(regs(r, { a: 0, z: 1, n: 0 }));
  };
  // $5844 idle_frame: after a jump's frame ($5848) the standing frame ($584C); when sprite 0's X
  // has not changed for $90 passes ($5A03), the standing frame for the facing ($5876 or $587B).
  P.idle_frame = function (r) {
    if (M[0x07F8] === M[0x5848]) M[0x07F8] = M[0x584C];
    const x = io.vicRead(0), a = M[0x5A02];
    M[0x5A02] = x;
    if (a !== x) {
      M[0x5A03] = 0;
      return regs(r, { a: 0, x, z: 1, n: 0, c: a >= x ? 1 : 0 });
    }
    M[0x5A03] = (M[0x5A03] + 1) & 0xFF;
    const n = M[0x5A03];
    if (n !== 0x90) return regs(r, { a: n, x }, cmp(n, 0x90));
    const f = (M[0x07F8] & 4) ? M[0x587B] : M[0x5876];
    M[0x07F8] = f;
    return regs(r, { a: f, x, c: 1 }, nz(f));
  };
  // $5880 jump_lockout: in the air read_controls and frame_step are switched off (RTS), the
  // take-off direction kept ($5A01), the jumping frame shown by facing, player_input's vertical
  // frame bases set, and the jump sound started.
  P.jump_lockout = function (r) {
    M[0x5A00] = 0;
    M[0x5A01] = M[0xC1ED];
    M[0xC84D] = 0x60;
    M[0x5980] = 0x60;
    M[0x07F8] = (M[0x07F8] & 4) ? M[0x58A4] : M[0x589B];
    M[0xC79C] = M[0x58A9];
    M[0xC7C6] = M[0x58A9];
    return P.jump_sound(regs(r, { a: M[0x58A9] }));
  };
  // $5980 frame_step: sprite 0's next walking frame, the low two bits of $07F8 wrapping from 3
  // to 0. Its first byte is RTS during a jump.
  P.frame_step = function (r) {
    if (M[0x5980] === 0x60) return regs(r);
    const v = M[0x07F8];
    if ((v & 3) !== 3) {
      M[0x07F8] = (v + 1) & 0xFF;
      return regs(r, { a: v & 3, c: 0 }, nz(M[0x07F8]));
    }
    M[0x07F8] = v & 0xFC;
    return regs(r, { a: M[0x07F8], c: 1 }, nz(M[0x07F8]));
  };
  // $75B0 tick_border: with no energy-refill countdown ($5A11), the border in the current
  // player's colour, 6 for the boy and 10 for the girl ($5A08); then jump_colour_step.
  P.tick_border = function* (r) {
    if (M[0x5A11] === 0) {
      const c = M[0x5A08] === 0 ? 6 : 0x0A;
      io.vicWrite(0x20, c);
      r = regs(r, { a: c });
    } else r = regs(r, { a: M[0x5A11] });
    return yield* P.jump_colour_step(r);
  };
  // $75E0 j_75E0: when the colour at $DA5C is white (the title card), show_programmed_by.
  P.j_75E0 = function* (r) {
    const a = io.colourRead(0x25C) & 0x0F;
    if (a === 1) return P.show_programmed_by(regs(r, { a, c: 1, z: 1, n: 0 }));
    return regs(r, { a }, cmp(a, 1));
  };
  // $7EF1 set_boy_msb: sprite 0's X MSB in $D010 from A (0 or 1).
  P.set_boy_msb = function (r) {
    M[0x7EF0] = r.a;
    const a = (io.vicRead(0x10) & 0xFE) | M[0x7EF0];
    io.vicWrite(0x10, a);
    return regs(r, { a }, nz(a));
  };
  // $7F20 set_boy_x: sprite 0's X, kept in $4516 as the start.
  P.set_boy_x = function (r) {
    M[0x4516] = r.a;
    io.vicWrite(0, r.a);
    return regs(r);
  };
  // $7F27 set_boy_y: sprite 0's Y, kept in $4517 as the start.
  P.set_boy_y = function (r) {
    M[0x4517] = r.a;
    io.vicWrite(1, r.a);
    return regs(r);
  };
  // $7F2E set_boy_xmsb: sprite 0's X MSB, kept in $4518.
  P.set_boy_xmsb = function (r) {
    M[0x4518] = r.a;
    return P.set_boy_msb(r);
  };
  // $7F80 colour_cycle: every 40th call, the ten crosses flash: for each colour-RAM cell listed
  // at +$5E..+$71 of the level record (zp $11) subtract 8 from its colour.
  P.colour_cycle = function (r) {
    M[0x5A16] = (M[0x5A16] - 1) & 0xFF;
    if (M[0x5A16] !== 0) return regs(r, nz(M[0x5A16]));
    M[0x5A16] = 0x28;
    const base = M[0x11] | (M[0x12] << 8);
    let y = 0x5D;
    for (let x = 0; x < 10; x++) {
      y++;
      M[0xFB] = rd((base + y) & 0xFFFF);
      y++;
      M[0xFC] = (rd((base + y) & 0xFFFF) + 0xD4) & 0xFF;
      const at = M[0xFB] | (M[0xFC] << 8);
      wr(at, rd(at) - 8);
    }
    return regs(r, { a: y, x: 10, y, c: 1, z: 1, n: 0 });
  };
  // $7FAE jump_colour_step: the jump or fall step, then the crosses' colour cycle.
  P.jump_colour_step = function* (r) {
    r = yield* P.jump_step(r);
    return P.colour_cycle(r);
  };
  // $C19D fire_pressed: fire or SHIFT. Where the level allows jumping ($45FF) start a jump unless
  // he is in the air ($C19C); where it does not, bring in the second player (switch_check).
  P.fire_pressed = function (r) {
    if (M[0x45FF] === 0) return P.switch_check(regs(r, { a: io.vicRead(0x15) }));
    if (M[0xC19C] !== 0) return P.walk_frame(regs(r, { a: M[0xC19C] }));
    return P.start_jump(regs(r, { a: 0 }));
  };
  // $C700 joy_move: move sprite 1 one pixel, its frame number ($07F9 - $E0) as the direction.
  P.joy_move = function (r) {
    r = P.move_sprite(regs(r, { a: (M[0x07F9] - 0xE0) & 0xFF, x: 1 }));
    return regs(r, { c: 1 }, nz(r.y));
  };
  // $C71B player_input: read the controls, then move the boy a pixel for each direction held
  // and allowed ($4500-$4503: up, down, left, right), choosing the frame when $4504-$4507 say
  // so; $CF06 counts the moves. With fire (C1EE) fire_pressed, else walk_frame.
  P.player_input = function* (r) {
    M[0xCF06] = 0;
    r = P.read_controls(regs(r, { a: 0 }));
    const dirs = [
      [0xC1EC, 0xFF, 0x4500, 0x4504, 1, 0xD8],
      [0xC1EC, 0x01, 0x4501, 0x4505, 1, 0xDA],
      [0xC1ED, 0xFF, 0x4502, 0x4506, 3, 0xC79C],
      [0xC1ED, 0x01, 0x4503, 0x4507, 3, 0xC7C6],
    ];
    for (let d = 0; d < 4; d++) {
      const [key, want, allow, anim, mask, base] = dirs[d];
      if (M[key] !== want || M[allow] === 0) continue;
      r = yield* P.try_move(regs(r, { a: d, x: 0 }));
      M[0xCF06] = (M[0xCF06] + 1) & 0xFF;
      if (M[anim] === 0) continue;
      const b = d < 2 ? base : M[base];        // the last two bases are rewritten ($C79C, $C7C6)
      M[0x07F8] = ((M[0x07F8] & mask) + b) & 0xFF;
    }
    if (M[0xC1EE] === 0) return P.walk_frame(regs(r, { a: 0 }));
    return P.fire_pressed(regs(r, { a: M[0xC1EE] }));
  };
  // $C7D4 switch_check: fire without jumping. With sprite 1 off (A, $D015, bit 1 clear) and a
  // frame for the facing in $4508 (not $FF), bring sprite 1 in on top of the boy: its pointer,
  // on, his position and MSB, voice 3 from $45B3 (second_player_in). Then walk_frame.
  P.switch_check = function (r) {
    if (r.a & 2) return P.walk_frame(regs(r, { a: 2 }));
    const x = ((M[0x07F8] - 0xD8) & 0xFF) >> 1;
    const f = M[0x4508 + x];
    if (f === 0xFF) return P.walk_frame(regs(r, { a: f, x }));
    r = P.s_2D8D(regs(r, { a: (f + 0xE0) & 0xFF, x }));
    io.vicWrite(0x15, 2 | io.vicRead(0x15));
    io.vicWrite(0x02, io.vicRead(0x00));
    io.vicWrite(0x03, io.vicRead(0x01));
    const y = io.vicRead(0x10) & 1;
    io.vicWrite(0x10, io.vicRead(0x10) & 0xFD);
    r = P.second_player_in(regs(r, { a: (y << 1) | io.vicRead(0x10), y }));
    return P.walk_frame(r);
  };
  // $C819 walk_frame: when the boy moved this pass ($CF06), or always with $450D = 1, every
  // $450C calls ($CF07) step his walking frame (frame_step).
  P.walk_frame = function (r) {
    if (M[0x450D] !== 1 && M[0xCF06] === 0) return regs(r, { a: 0, c: 1, z: 1, n: 0 });
    M[0xCF07] = (M[0xCF07] + 1) & 0xFF;
    const n = M[0xCF07];
    if (n !== M[0x450C]) return regs(r, { a: n }, cmp(n, M[0x450C]));
    M[0xCF07] = 0;
    return P.frame_step(regs(r, { a: 0, c: 1, z: 1, n: 0 }));
  };
  // $C84D read_controls: the keyboard and the port-2 stick into directions: $C1EC vertical and
  // $C1ED horizontal ($FF up or left, 1 down or right), $C1EE = 1 to jump. Keys from $C5
  // against the level's table $4512-$4515, SHIFT from $028D, the stick from $DC00 (up jumps).
  // With $4511 = 1 the last direction stays while nothing is pressed. RTS during a jump.
  P.read_controls = function (r) {
    if (M[0xC84D] === 0x60) return regs(r);
    M[0xC1EE] = 0;
    if (M[0x4511] !== 1) { M[0xC1EC] = 0; M[0xC1ED] = 0; }
    const k = P.irq_byte(0xC5);
    if (k !== 0x40) {
      M[0xC1EC] = 0; M[0xC1ED] = 0;
      if (k === M[0x4512]) M[0xC1EC] = 0xFF;
      if (k === M[0x4513]) M[0xC1EC] = 0x01;
      if (k === M[0x4514]) M[0xC1ED] = 0xFF;
      if (k === M[0x4515]) M[0xC1ED] = 0x01;
    }
    if (P.irq_byte(0x028D) !== 0) M[0xC1EE] = 1;
    const s = P.read_stick(r).a;
    if ((s & 1) === 0) M[0xC1EE] = 1;
    if ((io.ciaRead(0) & 2) === 0) M[0xC1EC] = 1;
    if ((io.ciaRead(0) & 4) === 0) M[0xC1ED] = 0xFF;
    if ((io.ciaRead(0) & 8) === 0) { M[0xC1ED] = 1; return regs(r, { a: 1, c: 0, z: 0, n: 0 }); }
    return regs(r, { a: 8, c: 1, z: 1, n: 0 });
  };
  // $C900 move_sprite: move sprite X one pixel in direction A (0 up, 1 down, 2 left, 3 right)
  // within Y $32-$E3 and X 8-$14F, keeping its $D010 bit. Y = 0 when it moved, $FF at an edge.
  P.move_sprite = function (r) {
    M[0xC8FE] = r.a;
    M[0xC8FF] = r.x;
    const x = (r.x << 1) & 0xFF, d = r.a, s = M[0xC8FF];
    const out = o => regs(r, Object.assign({ x }, o));
    if (d === 0 || d === 1) {
      const at = 0xD001 + x, v = io.read(at), edge = d === 0 ? 0x32 : 0xE3;
      if (v === edge) return out({ a: v, y: 0xFF, c: 1, z: 1, n: 0 });
      io.write(at, (v + (d === 0 ? -1 : 1)) & 0xFF);
      return out({ a: v, y: 0, c: v >= edge ? 1 : 0, z: 1, n: 0 });
    }
    if (d === 2) {
      const at = 0xD000 + x, v = io.read(at);
      if (v === 8) {
        const t = M[0xC9E9 + s] & io.vicRead(0x10);
        if (t === 0) return out({ a: 0, y: 0xFF, c: 1, z: 0, n: 1 });
      }
      io.write(at, (v - 1) & 0xFF);
      const w = io.read(at);                   // read back, as the game does
      if (w !== 0xFF) return out({ a: w, y: 0, c: w >= 0xFF ? 1 : 0, z: 1, n: 0 });
      const m = M[0xC9E1 + s] & io.vicRead(0x10);
      io.vicWrite(0x10, m);
      return out({ a: m, y: 0, c: 1, z: 1, n: 0 });
    }
    if (d === 3) {
      const at = 0xD000 + x, v = io.read(at);
      if (v === 0x4F) {
        const t = M[0xC9E9 + s] & io.vicRead(0x10);
        if (t !== 0) return out({ a: t, y: 0xFF, c: 1, z: 0, n: 1 });
      }
      io.write(at, (v + 1) & 0xFF);
      const w = io.read(at);
      if (w !== 0) return out({ a: w, y: 0, c: 1, z: 1, n: 0 });
      const m = M[0xC9E9 + s] | io.vicRead(0x10);
      io.vicWrite(0x10, m);
      return out({ a: m, y: 0, c: 1, z: 1, n: 0 });
    }
    return out(Object.assign({ a: d, y: 0xFF }, cmp(d, 3)));
  };
  // $C9C4 read_stick: $DC00 (the port-2 stick) in A; with the stick pushed and no key down the
  // remembered directions are cleared first, so the stick replaces a key's direction.
  P.read_stick = function (r) {
    if ((io.ciaRead(0) & 0x0F) !== 0x0F && P.irq_byte(0xC5) === 0x40) { M[0xC1EC] = 0; M[0xC1ED] = 0; }
    const a = io.ciaRead(0);
    return regs(r, { a }, nz(a));
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
