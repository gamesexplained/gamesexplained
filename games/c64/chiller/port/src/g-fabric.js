// The game's flow: the start, the main loop and its second half, the checks between them, a
// screen's restart, a new game and the end of one. Everything else is called from here through
// P. The main loop yields a checkpoint { cp } at each place the game's loop calls a routine.
(function (root) {
'use strict';
(root.ChillerGroups = root.ChillerGroups || {}).fabric = function (P) {
  const M = P.M, io = P.io, K = root.ChillerKernal;
  const nz = v => ({ z: v === 0 ? 1 : 0, n: (v >> 7) & 1 });
  const regs = (r, o) => Object.assign({}, r, o);

  // $2DFA game_entry, where the loader hands over: init_irq_vector (the STOP vector's low byte
  // to $EA, which turns off RUN/STOP, then first_setup), then title_start.
  P.game_entry = function* (r) {
    r = P.init_irq_vector(r);
    return yield* P.title_start(r);
  };
  // $75A7 init_irq_vector
  P.init_irq_vector = function (r) {
    M[0x0328] = 0xEA;
    return P.first_setup(regs(r, { a: 0xEA }));
  };
  // $2CE4 title_start: main_loop's two compares from the settings, the pass count that runs
  // player_input ($45FC into $CA19) and the one that runs joy_move ($45FD into $CA07); then
  // $2EE3, which reads $45FE for nothing and starts a game.
  P.title_start = function* (r) {
    M[0xCA19] = M[0x45FC];
    M[0xCA07] = M[0x45FD];
    return yield* P.j_2EE3(regs(r, { a: M[0xCA07] }));
  };
  P.j_2EE3 = function* (r) {
    throw new P.Goto('start_game', regs(r, { a: M[0x45FE] }, nz(M[0x45FE])));
  };

  // $C646 start_game: reset the players and the score, the boy first, the background from the
  // settings, CHR$(8) (SHIFT and C= may no longer swap the character sets), sprites off; build
  // the forest (setup_screen with X = 0), copy the block at $56C0, then restart_screen.
  P.start_game = function* (r) {
    r = yield* P.reset_players(r);
    r = yield* P.boy_first(r);
    io.vicWrite(0x21, M[0x450F]);
    K.chrout(P.k, 0x08);
    io.vicWrite(0x15, 0);
    r = yield* P.setup_screen(regs(r, { a: 0, x: 0 }));
    r = P.copy_block(regs(r, { x: 0xC0, y: 0x56 }));
    throw new P.Goto('restart_screen', r);
  };

  // $C694 restart_screen: the level's first enemies (when $45AB is 0, spawn_enemy for slots 0 to
  // $45AC - 1), the boy at his start (place_boy), the play font ($D018 = $1C), $0F into the RAM
  // under $FFFF, sprite 7's frame $F8 and sprite 1's colour from the settings, each slot's
  // counters cleared, $D01E read to clear it, then enemy_setup and the main loop.
  P.restart_screen = function* (r) {
    if (M[0x45AB] === 0) {
      M[0xCEFF] = 0;
      let a = 0;
      do {
        r = yield* P.spawn_enemy(regs(r, { a }));
        M[0xCEFF] = (M[0xCEFF] + 1) & 255;
        a = M[0xCEFF];
      } while (a !== M[0x45AC]);
    }
    r = yield* P.place_boy(r);
    io.vicWrite(0x18, 0x1C);
    M[0xFFFF] = 0x0F;
    M[0x07FF] = 0xF8;
    io.vicWrite(0x28, M[0x45B2]);
    for (let x = 0; x < 5; x++) M[0xCF1A + x] = M[0xCF29 + x] = M[0xCF2E + x] = M[0xCF4F + x] = 0;
    const c = io.vicRead(0x1E);
    return yield* P.enemy_setup(regs(r, { a: c, x: 5, c: 1 }, nz(c)));
  };
  // $C032 place_boy: Y from $4517, then $C144 (the enemies' group) does the rest.
  P.place_boy = function* (r) {
    return yield* P.j_C144(regs(r, { a: M[0x4517] }));
  };
  // $C6E0: slot X's colour from $45AD,x, then set_enemy_colour.
  P.j_C6E0 = function* (r) {
    return P.set_enemy_colour(regs(r, { a: M[0x45AD + r.x] }));
  };
  // $2D00 enemy_setup: each slot's lives from $45E7, the sprite multicolours, which sprites are
  // multicolour and which are twice as wide; then the main loop.
  P.enemy_setup = function* (r) {
    for (let x = 0; x < 5; x++) M[0xCF76 + x] = M[0x45E7 + x];
    io.vicWrite(0x25, M[0x45F5]);
    io.vicWrite(0x26, M[0x45F6]);
    io.vicWrite(0x1C, M[0x45F4]);
    io.vicWrite(0x1D, M[0x45F1]);
    throw new P.Goto('main_loop', regs(r, { a: M[0x45F1], x: 5 }));
  };

  // $CA00 main_loop: tick_border, player_step, joy_move when player_step's count reaches the
  // compare at $CA07, player_input every $CA19th pass, then collect_check and enemy_pass.
  P.main_loop = function* (r) {
    for (;;) {
      yield { cp: 0xCA00 };
      r = yield* P.tick_border(r);
      yield { cp: 0xCA03 };
      r = yield* P.player_step(r);
      if (r.a === M[0xCA07]) {
        M[0xCF02] = 0;
        yield { cp: 0xCA0F };
        r = P.joy_move(regs(r, { a: 0 }));
      }
      M[0xCF03] = (M[0xCF03] + 1) & 255;
      if (M[0xCF03] === M[0xCA19]) {
        M[0xCF03] = 0;
        yield { cp: 0xCA21 };
        r = yield* P.player_input(regs(r, { a: 0 }));
      }
      yield { cp: 0xCA24 };
      r = yield* P.collect_check(regs(r, { a: M[0xCF03] }));
      r = yield* P.enemy_pass(r);
    }
  };

  // $2D4B collect_check. For the slots in turn: one with no lives left whose sprite is off counts
  // as gone (respawn_check); one the settings do not let hit the scenery ($45F7,x = 0) is passed
  // over; the first that is still in play and may hit the scenery ends the scan: sprite 1 (the
  // other player) against the scenery ($D01F bit 1) on screens with $45FE set runs
  // sprite1_hit_scenery. All five gone is the next LEVEL (level_up). Then, energy gone ($CF7D = 1),
  // screen_done and the wait for the jingle; otherwise on to enemy_pass.
  P.collect_check = function* (r) {
    let x = 0;
    for (;;) {
      if (M[0xCF76 + x] === 0) {                       // respawn_check
        if ((M[0xCF08 + x] & io.vicRead(0x15)) === 0) {
          if (++x === 5) return yield* P.level_up(regs(r, { x }));
          continue;
        }
      }
      if (M[0x45F7 + x] === 0) {                       // $2D5D: passed over
        if (++x === 5) return yield* P.level_up(regs(r, { x }));
        continue;
      }
      break;
    }
    const c = io.vicRead(0x1F);                        // $2D60
    M[0x2D7A] = c;
    let a = c & 2;
    if (a !== 0) {
      a = M[0x45FE];
      if (a !== 0) r = P.sprite1_hit_scenery(regs(r, { a, x, c: 1 }, nz(a)));
      else r = regs(r, { a, x });
    } else r = regs(r, { a, x });
    if (M[0xCF7D] === 1) {                             // $2D7B
      r = yield* P.screen_done(regs(r, { a: 1, c: 1, z: 1, n: 0 }));
      return yield* P.j_5DA9(r);
    }
    return regs(r, { a: M[0xCF7D] });
  };
  // $2EB7 respawn_check (its code is part of collect_check above; this is the entry for others).
  P.respawn_check = function* (r) {
    throw new Error('respawn_check is entered only from collect_check');
  };

  // $CA27 enemy_pass: enemy_step for slots 0-4, extra_enemy, sprite_touch; the screen left
  // ($CF81 = 1) restarts it; otherwise the scroll and respawn timers, and RUN/STOP ($CF7F = $FF)
  // ends the game.
  P.enemy_pass = function* (r) {
    M[0xCEFF] = 0;
    let a = 0;
    do {
      yield { cp: 0xCA2F };
      r = yield* P.enemy_step(regs(r, { a }));
      yield { cp: 0xCA32 };                            // (a checkpoint may not follow itself)
      M[0xCEFF] = (M[0xCEFF] + 1) & 255;
      a = M[0xCEFF];
    } while (a !== 5);
    yield { cp: 0xCA3C };
    r = P.extra_enemy(regs(r, { a: 5 }));
    yield { cp: 0xCA3F };
    r = yield* P.sprite_touch(r);
    if (M[0xCF81] === 1) {
      M[0xCF81] = 0;
      throw new P.Goto('restart_screen', regs(r, { a: 0 }));
    }
    yield { cp: 0xCA51 };
    r = yield* P.scroll_timer(regs(r, { a: M[0xCF81] }));
    yield { cp: 0xCA54 };
    r = yield* P.respawn_timer(r);
    if (M[0xCF7F] === 0xFF) throw new P.Goto('end_game', regs(r, { a: 0xFF }));
    return regs(r, { a: M[0xCF7F] });
  };

  // $2C19 level_up: all of the enemies are gone: the LEVEL counter's three digits ($CFA7-$CFA9)
  // count up, speed_up makes them faster, and level_banner shows it.
  P.level_up = function* (r) {
    let x = 3;
    for (;;) {
      const d = M[0xCFA6 + x] = (M[0xCFA6 + x] + 1) & 255;
      if (d !== 0xBA) break;
      M[0xCFA6 + x] = 0xB0;
      if (--x === 0) break;
    }
    r = P.speed_up(regs(r, { x }));
    return yield* P.level_banner(r);
  };
  // $2C44 level_banner: only the boy's sprite on; LEVEL nnn over row 11 (the nine cells at $05EF
  // and their colours kept at $0345 and $034E), in the colour of the cell at $D81A; the two
  // operands at $2E07 and $2E21 set to 3 and 4 while it shows; wait until the jiffy clock's middle
  // byte, set to 4, reaches 6 (512 interrupts, about eight and a half seconds); put it all back
  // and restart the screen.
  P.level_banner = function* (r) {
    io.vicWrite(0x15, 1);
    for (let x = 0; x < 9; x++) {
      M[0x0345 + x] = M[0x05EF + x];
      M[0x034E + x] = io.colourRead(0x1EF + x);
      M[0x05EF + x] = M[0xCFA1 + x];            // txt_level: LEVEL and the three digits
      io.colourWrite(0x1EF + x, io.colourRead(0x01A));
    }
    M[0xCF73] = 0;
    M[0x2E07] = 3;
    M[0x2E21] = 4;
    M[0xA1] = 4;
    while (M[0xA1] !== 6) yield;
    M[0x2E07] = 5;
    M[0x2E21] = 7;
    M[0xCF74] = 0;
    for (let x = 0; x < 9; x++) {
      M[0x05EF + x] = M[0x0345 + x];
      io.colourWrite(0x1EF + x, M[0x034E + x]);
    }
    throw new P.Goto('restart_screen', regs(r, { a: M[0x034E + 8], x: 9, c: 1, z: 1, n: 0 }));
  };

  // $2C00 hud_reset: each slot's move and frame delays (set_enemy_speed with $4542,x), then
  // hud_and_music.
  P.hud_reset = function* (r) {
    for (let x = 0; x < 5; x++) r = P.set_enemy_speed(regs(r, { a: M[0x4542 + x], x }));
    r = yield* P.hud_and_music(regs(r, { x: 5 }));
    return r;
  };
  // $2CA4 score_reset: the LEVEL counter to 001, then hud_reset.
  P.score_reset = function* (r) {
    M[0xCFA7] = M[0xCFA8] = 0xB0;
    M[0xCFA9] = 0xB1;
    return yield* P.hud_reset(regs(r, { a: 0xB1 }));
  };
  // $2E62 hud_and_music: lives from $45ED, the screen-over flag cleared; the music setting and
  // the tune started ($2E8B); sprite priorities from $45F1; A = $450E.
  P.hud_and_music = function* (r) {
    M[0xCF7C] = M[0x45ED];
    M[0xCF7D] = 0;
    r = P.s_2CF3(regs(r, { a: M[0x45EF] }));
    r = P.s_2F4D(r);
    io.vicWrite(0x1B, M[0x45F1]);
    return regs(r, { a: M[0x450E] }, nz(M[0x450E]));
  };

  // $2DA0 game_over: sprites off, the death tune's setting, a pause (delay with $CF65 and $CF66
  // at $FF); then, until fire or a key: game_over_wait (after a while the title card) and, with
  // the border not black (still the play screen), the score against the high score; then a new
  // game.
  P.game_over = function* (r) {
    io.vicWrite(0x15, 0);
    r = P.s_2CF3(regs(r, { a: M[0x45EE] }));
    M[0xCF65] = M[0xCF66] = 0xFF;
    r = yield* P.delay(regs(r, { a: 0xFF }));
    return yield* waitLoop(r, false);
  };
  // $2D97 wait_fire, in the loop at $2DB6 it belongs to. Each turn: RUN/STOP ($CF7F) would end
  // the game; game_over_wait; a key held ($C5 not $40) goes on; otherwise wait_fire: fire goes
  // on, else round again. A turn takes the game 55 cycles when game_over_wait only counts.
  function* waitLoop(r, atFire) {
    for (;;) {
      if (!atFire) {
        if (M[0xCF7F] !== 0) throw new P.Goto('end_game', regs(r, { a: M[0xCF7F] }));
        r = yield* P.game_over_wait(regs(r, { a: 0 }));
        if (P.irq_byte(0xC5) !== 0x40) break;
      }
      atFire = false;
      const s = io.ciaRead(0);
      yield { cycles: 55 };
      if ((s & 0x10) === 0) break;
    }
    if ((io.vicRead(0x20) & 0x0F) !== 0) r = P.check_hiscore(r);   // $2DC9
    throw new P.Goto('start_game', r);
  }
  P.wait_fire = function* (r) { return yield* waitLoop(r, true); };

  // $2CB4 end_game (RUN/STOP: nothing in the game sets $CF7F to $FF, so it is never reached):
  // the KERNAL's interrupt back, green border, light grey background, the ROM's characters, the
  // screen cleared, the keyboard buffer emptied, $00 into the RAM under $FFFF, sprites off and
  // 40 columns; then an RTS to wherever the stack points.
  P.end_game = function* (r) {
    M[0x0314] = 0x31; M[0x0315] = 0xEA;
    M[0xCF7F] = 0;
    io.vicWrite(0x20, 5);
    io.vicWrite(0x21, 0x0F);
    io.vicWrite(0x18, 0x15);
    K.chrout(P.k, 0x93);
    M[0xC6] = 0;
    M[0xFFFF] = 0;
    io.vicWrite(0x15, 0);
    io.vicWrite(0x16, io.vicRead(0x16) | 8);
    for (;;) yield;
  };

  // Two tails no group took, ported here.
  // $C1E1 j_C1E1: place_boy continued: sprite 0's X MSB from $4518 into $D010 ($C407), then
  // its colour from $4510 (j_CEF6).
  P.j_C1E1 = function (r) {
    const a = (io.vicRead(0x10) & 0xFE) | M[0x4518];
    io.vicWrite(0x10, a);
    return P.j_CEF6(regs(r, { a: M[0x4510] }));
  };
  // $CDDE b_CDDE: poison_add with X = 2.
  P.b_CDDE = function* (r) {
    return yield* P.poison_add(regs(r, { x: 2 }));
  };

  // The main program: from the hand-over, following each place the game jumps to for good.
  P.program = function* (start, r0) {
    let at = start || 'game_entry', r = r0 || {};
    for (;;) {
      try {
        yield* P[at](r);
        throw new Error(at + ' returned, which the game never does');
      } catch (e) {
        if (!(e instanceof P.Goto)) throw e;
        at = e.to; r = e.r;
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
