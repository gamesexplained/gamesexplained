// The energy group: the energy bar and what fills and drains it (walking, jumping, mushrooms,
// toadstools and poison), the tiles the boy touches, the magic crosses, the score, the switch
// between the boy and the girl, the high score and the GAME OVER line.
(function (root) {
'use strict';
(root.ChillerGroups = root.ChillerGroups || {}).energy = function (P) {
  const M = P.M, io = P.io;
  const BAR = 0x042E;          // the energy bar's first cell, screen row 1 column 6
  const SCORE = 0x0405;        // the six score digits are $0406-$040B, indexed 1 to 6 from here
  const SPACE = 0xA0;

  // A byte at an address as the 6502 sees it, with the chips at $D000-$DFFF.
  const rd = a => { a &= 0xFFFF; return a >= 0xD000 && a < 0xE000 ? io.read(a) & 0xFF : M[a]; };
  const wr = (a, v) => { a &= 0xFFFF; if (a >= 0xD000 && a < 0xE000) io.write(a, v & 0xFF); else M[a] = v & 0xFF; };
  // (zp),y
  const ind = (zp, y) => ((M[zp] | (M[(zp + 1) & 0xFF] << 8)) + y) & 0xFFFF;
  // a CMP followed by BMI: the sign of the difference
  const minus = (a, k) => ((a - k) & 0x80) !== 0;
  const regs = (r, o) => Object.assign({}, r, o);

  // $5733 s_5733: three NOPs, then show_press_ctrl.
  P.s_5733 = function (r) { return P.show_press_ctrl(r); };

  // $5736 show_press_ctrl: reads PRESS CTRL FOR MENU and the screen and colour bytes of row 23
  // but stores nothing. It leaves X = $13 and A the last colour-RAM byte it read.
  P.show_press_ctrl = function (r) {
    return regs(r, { a: rd(0xDBCA + 0x12), x: 0x13 });
  };

  // $5768 to_switch_allowed: on to switch_allowed.
  P.to_switch_allowed = function* (r) { return yield* P.switch_allowed(r); };

  // The frame numbers player_swap patches into read_controls, walk_frame and jump_lockout.
  const FRAME_AT = [0x582D, 0x5832, 0x58A9, 0x5848, 0x584C, 0x5876, 0x587B, 0x58A4, 0x589B];
  const GIRL_FRAMES = [0xE8, 0xEC, 0xF0, 0xF1, 0xF6, 0xF2, 0xF6, 0xF1, 0xF0];
  const BOY_FRAMES = [0xD8, 0xDC, 0xE0, 0xE1, 0xE6, 0xE2, 0xE6, 0xE1, 0xE0];

  // $576B player_swap: wait for line 16, swap the boy's and the girl's sprites and turn both on;
  // patch in the other character's frames, flip $5A08 and set the border (light red for the
  // girl, blue for the boy); then idle_frame.
  P.player_swap = function* (r) {
    r = yield* P.wait_line16(r);
    r = yield* P.swap_sprites(r);
    io.vicWrite(0x15, io.vicRead(0x15) | 0x03);
    const girl = M[0x5A08] === 0;
    M[0x5A08] = girl ? 1 : 0;
    const f = girl ? GIRL_FRAMES : BOY_FRAMES;
    for (let i = 0; i < FRAME_AT.length; i++) M[FRAME_AT[i]] = f[i];
    const border = girl ? 0x0A : 0x06;
    io.vicWrite(0x20, border);
    return P.idle_frame(regs(r, { a: border }));
  };

  // $5800 player_step: once per main-loop pass: count the pass, the bar's speed check and the
  // energy and poison timers. In a jump put back the take-off direction; on the ground switch
  // input and frame_step back on, look for a switch request and reset the jump frames. Then
  // drain_step, whose A main_loop compares.
  // The jump frames written back ($C79C, $C7C6) are the current character's, from the operands at
  // $582D and $5832 that player_swap patches.
  P.player_step = function* (r) {
    M[0xCF02] = (M[0xCF02] + 1) & 0xFF;
    r = P.bar_speed(r);
    r = yield* P.energy_tick(r);
    if (M[0x5A00] !== 0) M[0xC1ED] = M[0x5A01];
    if (M[0xC19C] === 0) {
      M[0xC84D] = 0xA9;
      M[0x5980] = 0xAD;
      r = yield* P.switch_request(regs(r, { a: 0xAD }));
      // the operands of these two LDAs are patched by player_swap
      M[0xC79C] = M[0x582D];
      M[0xC7C6] = M[0x5832];
      r = regs(r, { a: M[0x5832] });
    }
    return P.drain_step(r);
  };

  // $58B3 switch_request: fire or the '?' key ($C5 = $37) asks for a switch; only the first
  // press after a release goes on to switch_allowed. Otherwise idle_frame.
  P.switch_request = function* (r) {
    if (M[0x4503] === 0) return regs(r, { a: 0 });
    let x = 0;
    if ((io.ciaRead(0) & 0x10) === 0) x = 1;
    if (P.irq_byte(0xC5) === 0x37) x = 1;
    if (x === 0) {
      M[0x5A06] = 0;
      return P.idle_frame(regs(r, { a: 0, x: 0 }));
    }
    const held = M[0x5A06];
    if (held !== 0) return P.idle_frame(regs(r, { a: held, x: 1 }));
    return yield* P.to_switch_allowed(regs(r, { a: 0, x: 1 }));
  };

  // $58E6 swap_sprites: exchange sprite 0 and sprite 1: X, Y, their X MSB bits and their
  // pointers. The one under control is always sprite 0. Marks the switch as held ($5A06).
  P.swap_sprites = function* (r) {
    M[0x5A06] = 1;
    const x0 = io.vicRead(0x00), x1 = io.vicRead(0x02);
    io.vicWrite(0x00, x1); io.vicWrite(0x02, x0);
    const y0 = io.vicRead(0x01), y1 = io.vicRead(0x03);
    io.vicWrite(0x01, y1); io.vicWrite(0x03, y0);
    const msb = io.vicRead(0x10), b0 = msb & 0x01, b1 = msb & 0x02;
    let m = msb & 0xFC;
    if (b1) m |= 0x01;
    if (b0) m |= 0x02;
    M[0x5A07] = m;
    io.vicWrite(0x10, m);
    const p0 = M[0x07F8], p1 = M[0x07F9];
    M[0x07F8] = p1; M[0x07F9] = p0;
    return regs(r, { a: p1, x: p0, y: b1 });
  };

  // $5900 reset_players: for a new game: score_reset, sprite 1 parked at $E0,$E0, the border
  // blue and sprite 1's pointer $EE.
  P.reset_players = function* (r) {
    r = yield* P.score_reset(r);
    io.vicWrite(0x02, 0xE0);
    io.vicWrite(0x03, 0xE0);
    io.vicWrite(0x20, 0x06);
    M[0x07F9] = 0xEE;
    return regs(r, { a: 0xEE });
  };

  // $5961 bar_speed: while the bar's seventh cell is full, input every $20 passes and a frame
  // step every 2; once it is not, input every $80 passes and a frame step every 4.
  P.bar_speed = function (r) {
    if (M[0x0430] !== 0xA9) {
      M[0xCA19] = 0x80;
      M[0x450C] = 0x04;
      return regs(r, { a: 0x04 });
    }
    const a = M[0x450C];
    if (a !== 0x04) return regs(r, { a });
    M[0x450C] = 0x02;          // $5A88
    M[0xCF07] = 0x00;
    M[0xCA19] = 0x20;
    return regs(r, { a: 0x20 });
  };

  // $5998 find_bar_end: the first cell of the energy bar that is not a full block ($A9), its
  // index in X and its glyph in A.
  P.find_bar_end = function (r) {
    let x = 0;
    while (M[BAR + x] === 0xA9) x = (x + 1) & 0xFF;
    return regs(r, { a: M[BAR + x], x });
  };

  // $59A3 energy_down: one eighth-cell off the bar; an empty cell ($A1) moves the end back a
  // cell, and with no cell left the boy is out of energy.
  P.energy_down = function (r) {
    r = P.find_bar_end(r);
    const x = r.x, a = r.a;
    if (a !== 0xA1) { M[BAR + x] = (a - 1) & 0xFF; return r; }
    if (x === 0) return P.out_of_energy(r);
    M[BAR + x - 1] = 0xA8;
    return regs(r, { a: 0xA8, x: x - 1 });
  };

  // $59C3 energy_up: one step onto the bar, up to 33 cells; a full bar scores 10 instead.
  P.energy_up = function (r) {
    r = P.find_bar_end(r);
    if (r.x !== 0x21) { M[BAR + r.x] = (M[BAR + r.x] + 1) & 0xFF; return r; }
    M[0xCF5A] = 0x0A; M[0xCF5B] = 0x00; M[0xCF5C] = 0x11;
    return P.add_score(regs(r, { a: 0x11 }));
  };

  // $59E6 drain_step: in a jump one step off the bar each time $5A09 counts to zero; walking,
  // walk_drain.
  P.drain_step = function (r) {
    const a = M[0xC19C];
    if (a === 0) return P.walk_drain(regs(r, { a }));
    M[0x5A09] = (M[0x5A09] - 1) & 0xFF;
    if (M[0x5A09] !== 0) return regs(r, { a });
    return P.energy_down(regs(r, { a: 0 }));
  };

  // $5A20 walk_drain: while a direction is held, one step off the bar every 255 x 3 passes.
  P.walk_drain = function (r) {
    const a = M[0xC1ED];
    if (a === 0) return regs(r, { a });
    M[0x5A0A] = (M[0x5A0A] - 1) & 0xFF;
    if (M[0x5A0A] !== 0) return regs(r, { a });
    M[0x5A0A] = 0xFF;
    M[0x5A0B] = (M[0x5A0B] - 1) & 0xFF;
    if (M[0x5A0B] !== 0) return regs(r, { a: 0xFF });
    M[0x5A0B] = 0x03;
    return P.energy_down(regs(r, { a: 0x03 }));
  };

  // $5A70 out_of_energy: the energy is gone: set the screen-over flag $CF7D, and the slow pace
  // ($450C = 2, $CA19 = $20).
  P.out_of_energy = function (r) {
    M[0xCF7D] = 0x01;
    M[0x450C] = 0x02;
    M[0xCF07] = 0x00;
    M[0xCA19] = 0x20;
    return regs(r, { a: 0x20 });
  };

  // $5A9A tile_touch_a: tiles $2A-$53. Below $4D solid. $4D-$53 from the side let him move;
  // underfoot (Y = $50) every 8th try the ledge crumbles a stage, and $53 becomes a space.
  P.tile_touch_a = function* (r) {
    const a = r.a & 0xFF, y = r.y & 0xFF;
    if (minus(a, 0x4D)) return regs(r, {});
    if (y !== 0x50) return yield* P.j_2A57(r);
    M[0x5A0F] = (M[0x5A0F] - 1) & 0xFF;
    if (M[0x5A0F] !== 0) return regs(r, {});
    M[0x5A0F] = 0x08;
    const at = ind(0xFB, y);
    if (a === 0x53) { wr(at, SPACE); return regs(r, { a: SPACE, x: 0x08 }); }
    const v = (rd(at) + 1) & 0xFF;
    wr(at, v);
    return regs(r, { a: v, x: v });
  };

  // $5AC7 tile_touch_b: tiles $54 up. A mushroom ($54) gives energy, a toadstool ($55) poison,
  // a bonus ($56) 100 points, each taken off the screen; a cross ($57) goes to cross_touch. The
  // rest decide whether he may move: $58-$61 and $66 up are solid underfoot; $62-$65 give way
  // underfoot every 3rd try.
  P.tile_touch_b = function* (r) {
    const a = r.a & 0xFF, y = r.y & 0xFF;
    if (a === 0x54) {
      r = P.energy_add_slow(regs(r, { x: 0x18 }));
      wr(ind(0xFB, r.y & 0xFF), SPACE);
      return regs(r, { a: SPACE });
    }
    if (a === 0x55) {
      r = yield* P.poison_add(regs(r, { x: 0x19 }));
      wr(ind(0xFB, r.y & 0xFF), SPACE);
      return regs(r, { a: SPACE });
    }
    if (a === 0x56) {
      M[0xCF5A] = 0x64; M[0xCF5B] = 0x00; M[0xCF5C] = 0x11;
      r = P.add_score(regs(r, { a: 0x11 }));
      wr(ind(0xFB, r.y & 0xFF), SPACE);
      return regs(r, { a: SPACE });
    }
    if (a === 0x57) return yield* P.cross_touch(r);
    if (minus(a, 0x62)) return yield* P.j_5B8D(r);
    if (!minus(a, 0x66)) return yield* P.j_7673(r);
    if (y !== 0x50) return yield* P.j_2A57(r);
    M[0x5A14] = (M[0x5A14] - 1) & 0xFF;
    if (M[0x5A14] !== 0) return regs(r, {});
    M[0x5A14] = 0x03;
    return yield* P.j_2A57(regs(r, { a: 0x03 }));
  };

  // $5B8D j_5B8D: a tile solid underfoot: with the probe below (Y = $50) he does not move,
  // otherwise he does (j_2A57).
  P.j_5B8D = function* (r) {
    if ((r.y & 0xFF) === 0x50) return regs(r, {});
    return yield* P.j_2A57(r);
  };

  // $5B00 energy_tick: every 16th call while energy is pending ($5A0D), spend a unit on one
  // step of the bar. Then poison_tick.
  P.energy_tick = function* (r) {
    if (M[0x5A0D] !== 0) {
      M[0x5A0E] = (M[0x5A0E] - 1) & 0xFF;
      if (M[0x5A0E] === 0) {
        M[0x5A0E] = 0x10;
        M[0x5A0D] = (M[0x5A0D] - 1) & 0xFF;
        r = P.energy_up(regs(r, { a: 0x10 }));
      }
    }
    return yield* P.poison_tick(r);
  };

  // Add X-1 to a pending counter, stopping at 255; the count is left in its scratch byte.
  function addPending(r, scratch, counter) {
    M[scratch] = r.x & 0xFF;
    for (;;) {
      M[scratch] = (M[scratch] - 1) & 0xFF;
      if (M[scratch] === 0) break;
      M[counter] = (M[counter] + 1) & 0xFF;
      if (M[counter] === 0) break;
    }
    return regs(r, {});
  }

  // $5B18 energy_add_slow: add X-1 to the pending energy $5A0D (stopping at 255).
  P.energy_add_slow = function (r) { return addPending(r, 0x5A10, 0x5A0D); };

  // $5B2C poison_tick: every 18th call while poison is pending ($5A11), spend a unit on
  // flash_border, which takes a step off the bar.
  P.poison_tick = function* (r) {
    const a = M[0x5A11];
    if (a === 0) return regs(r, { a });
    M[0x5A12] = (M[0x5A12] - 1) & 0xFF;
    if (M[0x5A12] !== 0) return regs(r, { a });
    M[0x5A12] = 0x12;
    M[0x5A11] = (M[0x5A11] - 1) & 0xFF;
    return yield* P.flash_border(regs(r, { a: 0x12 }));
  };

  // $5B44 poison_add: add X-1 to the pending poison $5A11 (stopping at 255).
  P.poison_add = function* (r) { return addPending(r, 0x5A13, 0x5A11); };

  // $5B5E cross_count: one more cross on the two-digit MAGIC CROSSES counter ($041C tens,
  // $041D units, 99 wraps to 00), then crosses_left.
  P.cross_count = function* (r) {
    let a = M[0x041D];
    if (a !== 0xB9) M[0x041D] = a + 1;
    else if (M[0x041C] === 0xB9) { a = 0xB0; M[0x041D] = 0xB0; M[0x041C] = 0xB0; }
    else { a = 0xB0; M[0x041D] = 0xB0; M[0x041C] = (M[0x041C] + 1) & 0xFF; }
    return yield* P.crosses_left(regs(r, { a }));
  };

  // $5D60 boy_first: a new game starts with the boy: $5A08 = 1, then player_swap flips it.
  P.boy_first = function* (r) {
    M[0x5A08] = 0x01;
    return yield* P.player_swap(regs(r, { a: 0x01 }));
  };

  // $7280 switch_allowed: a switch only from level byte 10 on (the way back); then player_swap.
  P.switch_allowed = function* (r) {
    const a = rd(ind(0x11, 0x73));
    r = regs(r, { a, y: 0x73 });
    if (minus(a, 0x0A)) return r;
    return yield* P.player_swap(r);
  };

  // $72BA flash_border: a step off the bar; every 4th call wait for line 16 and flip bit 3 of
  // the border colour.
  P.flash_border = function* (r) {
    r = P.energy_down(r);
    M[0x72B9] = (M[0x72B9] - 1) & 0xFF;
    if (M[0x72B9] !== 0) return r;
    M[0x72B9] = 0x04;
    yield { wait: 0x10 };
    const a = io.vicRead(0x20) ^ 0x08;
    io.vicWrite(0x20, a);
    return regs(r, { a });
  };

  // $7780 check_hiscore: compare the score with hiscore_digits ($8422) from digit X on; when
  // higher, copy it there. Then reset game_over_wait's timers.
  P.check_hiscore = function (r) {
    let x = r.x & 0xFF;
    for (;;) {
      const a = M[0x0406 + x], h = M[0x8422 + x];
      if (minus(a, h)) break;
      if (a !== h) {
        for (x = 0; x < 6; x++) M[0x8422 + x] = M[0x0406 + x];
        break;
      }
      x = (x + 1) & 0xFF;
      if (x === 6) break;
    }
    M[0x771E] = 0x0A;
    M[0x771D] = 0xFF;
    M[0x771C] = 0xFF;
    return regs(r, { a: 0xFF, x });
  };

  // $7F00 crosses_left: one fewer cross needed ($5A15). At zero the screen is done: sprites 0
  // and 1 on and next_screen with the level byte, or $FE after the last level ($12).
  P.crosses_left = function* (r) {
    M[0x5A15] = (M[0x5A15] - 1) & 0xFF;
    if (M[0x5A15] !== 0) return regs(r, {});
    io.vicWrite(0x15, 0x03);
    const a = rd(ind(0x11, 0x73));
    const x = a === 0x12 ? 0xFE : a;
    return yield* P.next_screen(regs(r, { a, x, y: 0x73 }));
  };

  // $7F50 cross_touch: a cross tile. Its colour (bit 2 of the colour-RAM cell) says blue or
  // red; the boy takes blue ones, the girl red ones. A cross taken becomes a space and is
  // counted. $FC is left pointing at colour RAM when the cross is not taken.
  P.cross_touch = function* (r) {
    const y = r.y & 0xFF;
    M[0xFC] = (M[0xFC] + 0xD4) & 0xFF;
    const x = rd(ind(0xFB, y)) & 0x04;
    const a = M[0x5A08];
    if (a !== 0 ? x !== 0 : x !== 0x04) return regs(r, { a, x });
    M[0xFC] = (M[0xFC] - 0xD4) & 0xFF;
    wr(ind(0xFB, y), SPACE);
    return yield* P.cross_count(regs(r, { a: SPACE, x }));
  };

  // $CE11 score_inc: one point, carried leftwards through the six score digits.
  P.score_inc = function (r) {
    let x = 6, a;
    for (;;) {
      a = M[SCORE + x] = (M[SCORE + x] + 1) & 0xFF;
      if (a !== 0xBA) break;
      a = M[SCORE + x] = 0xB0;
      x--;
      if (x === 0) break;
    }
    return regs(r, { a, x });
  };

  // $CE28 score_dec: one point off, borrowed leftwards; only when the borrow runs through all
  // six digits is score_inc called. Nothing calls it.
  P.score_dec = function (r) {
    let x = 6, a;
    for (;;) {
      a = M[SCORE + x] = (M[SCORE + x] - 1) & 0xFF;
      if (a !== 0xAF) return regs(r, { a, x });
      a = M[SCORE + x] = 0xB9;
      x--;
      if (x === 0) break;
    }
    return P.score_inc(regs(r, { a, x }));
  };

  // The routine the JSR at $CE52 calls; its low byte is patched from $CF5C.
  function scoreStep(r) {
    const at = M[0xCE53] | (M[0xCE54] << 8);
    if (at === 0xCE11) return P.score_inc(r);
    if (at === 0xCE28) return P.score_dec(r);
    throw new Error('add_score: no port of a counter at $' + at.toString(16));
  }

  // $CE42 add_score: add $CF5A + 255 x $CF5B points, one at a time, with the counter whose low
  // byte is $CF5C.
  P.add_score = function (r) {
    M[0xCE53] = M[0xCF5C];
    for (;;) {
      if (M[0xCF5A] !== 0) {
        M[0xCF5A] = (M[0xCF5A] - 1) & 0xFF;
        r = scoreStep(regs(r, { a: M[0xCF5A] + 1 & 0xFF }));
        continue;
      }
      if (M[0xCF5B] === 0) return regs(r, { a: 0 });
      M[0xCF5B] = (M[0xCF5B] - 1) & 0xFF;
      M[0xCF5A] = 0xFF;
      r = scoreStep(regs(r, { a: 0xFF }));
    }
  };

  // $CE6B add_score_for: the points of enemy $CF4E (s_CE6E with X from $CF4E).
  P.add_score_for = function (r) { return P.s_CE6E(regs(r, { x: M[0xCF4E] })); };

  // $CE6E s_CE6E: the points of enemy X from the tables at $4560, $4565 and $456A, added.
  P.s_CE6E = function (r) {
    const x = r.x & 0xFF;
    M[0xCF5A] = M[0x4560 + x];
    M[0xCF5B] = M[0x4565 + x];
    M[0xCF5C] = M[0x456A + x];
    return P.add_score(regs(r, { a: M[0xCF5C] }));
  };

  // $CFC0 show_game_over: GAME OVER on screen row 1 at $0438, in white.
  P.show_game_over = function (r) {
    r = P.s_5733(r);
    let a = 0;
    for (let x = 0; x < 9; x++) {
      io.colourWrite(0x38 + x, 0x01);
      a = M[0xCFAA + x];
      M[0x0438 + x] = a;
    }
    return regs(r, { a, x: 9 });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
