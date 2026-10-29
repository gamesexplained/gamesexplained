// The main program: the start-up ($4000) and cold_start, a new game (the title and the intro),
// main_loop, one pass a frame, and the parts of the game it JMPs to: a stage's end and the
// intermission (stage_complete), a death (lose_life), game over, a stage's start. Every call it
// makes is a checkpoint, and so are the calls inside frame_wait.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.main = function (P) {
  const M = P.M, B = P.B, io = P.io, N = root.GBNames;
  const { frame_flag, scroll_pending, scroll_step, fine_scroll, scroll_copy, boss_on, para_hit, enemy_wait, enemy_timer,
    vic_colours, difficulty, map_col, map_col_hi, stage, loop_count, spr_colour, score, fire_frame_b, fire_frame_c,
    player_frozen, lives, walk_speed, status_d018, status_dd00, scroll_limit, frame_counters, spr_y, hero_bot_y,
    stage_start_lo, stage_start_hi, stage_tunes, weapon_shown, player_xu, y_save, checkpoints, boss_phase,
    stage_swap_a, stage_swap_b, stage_swap_c, flame_free, lane_timer, spr_xhi, spr_xlo, spawn_done, enemy_climb_y,
    serial_check_src, cia2_serial_check, exit_vector, next_life, joy } = N;
  P.CHECKPOINTS.push(
    0x06E0, 0x06EF, 0x06F2, 0x06F5, 0x06F8, 0x06FB, 0x06FE, 0x0701, 0x0704, 0x0707, 0x0717, 0x0727, 0x072A, 0x072D,
    0x0730, 0x0733, 0x0736, 0x0739, 0x073C, 0x073F, 0x0742, 0x0745, 0x0748, 0x074B, 0x074E, 0x0751, 0x0754, 0x0757,
    0x075A, 0x075D, 0x0760, 0x0763, 0x0766, 0x0769, 0x076C, 0x076F, 0x0772,
    0x3696, 0x3699, 0x369C,
    0x36F9, 0x36FC, 0x36FF, 0x3702, 0x370A, 0x3712, 0x3722, 0x3727, 0x372C, 0x372F, 0x3734, 0x3739, 0x373E, 0x3741,
    0x3756, 0x375B, 0x375E, 0x3761, 0x3764, 0x3767, 0x376A, 0x376D, 0x3770, 0x3773, 0x3776, 0x377B, 0x377E, 0x3781,
    0x3784, 0x3793, 0x3798, 0x37A3, 0x37A6, 0x37A9, 0x37AF, 0x37B2,
    0xC4FF, 0xC502, 0xC507, 0xC50A,
    0x142A, 0x1442, 0x1445, 0x144A, 0x1454, 0x1464, 0x146D, 0x1475, 0x147A, 0x14A6, 0x14A9, 0x14B1, 0x14BE,
    0x14C1, 0x14C4, 0x14C7, 0x14CA, 0x14CD, 0x14D2, 0x14D7, 0x14DA, 0x14DD, 0x14EC, 0x1513, 0x1516, 0x1519, 0x151F,
    0x1527,
    0x1532, 0x153A, 0x153F, 0x1542, 0x1545, 0x154B, 0x1550, 0x1582, 0x1585, 0x1588,
    0x15F0, 0x15FA, 0x15FD, 0x1600);

  // The game: from the start-up, or from where a part of it is named; each part returns the name of
  // the one it goes to next, and a JMP from inside a routine is thrown (P.jump) and caught here.
  P.main = function* (go = 'startup') {
    for (;;) {
      try { go = yield* P[go](); }
      catch (e) { if (!P.isJump(e)) throw e; go = e.go; }
    }
  };
  // The main loop taken up where a pass starts, for a moment of play saved there.
  P.resume = function* () { yield* P.main('main_loop'); };

  // startup ($4000): CIA 2's timer A at 2 cycles, its interrupts off, the timer started with the
  // serial port shifting out (CRA $C1); its interrupt data read and a byte written to the serial
  // port; cia2_serial_check copied to $0100 (21 bytes); the depacker's exit cleared.
  P.startup = function* () {
    io.cia2Write(0x05, 0); io.cia2Write(0x04, 2);
    io.cia2Write(0x0D, 0x7F);
    io.cia2Write(0x0E, 0xC1);
    io.cia2Write(0x0C, io.cia2Read(0x0D));
    for (let x = 0x14; x >= 0; x--) M[cia2_serial_check + x] = M[serial_check_src + x];
    M[0x3DFF] = 0; M[exit_vector] = 0;
    return 'cold_start';
  };
  // cold_start ($36A8): the screen blanked, every sprite multicolour (X is $FF from the start-up's
  // copy), the screen's colours (vic_colours); then a new game.
  P.cold_start = function* () {
    io.vicWrite(0x11, 0x0B);
    io.vicWrite(0x1C, 0xFF);
    for (let y = 6; y >= 0; y--) io.vicWrite(0x20 + y, M[vic_colours + y]);
    return 'new_game';
  };
  // new_game ($36BC): the game's variables set for a new game, the swapped blocks and the animated
  // characters put back, the sound off and the interrupt started; the title until fire; the intro,
  // the captives and their guards until its tune ends; the first stage.
  P.new_game = function* () {
    M[difficulty] = 0; M[map_col] = 0; M[map_col_hi] = 0;
    io.vicWrite(0x15, 0);
    M[stage] = 0; M[loop_count] = 0;
    M[spr_colour] = 0x0B; M[spr_colour + 1] = 0x0B;
    for (let x = 8; x >= 0; x--) M[score + x] = 0;
    M[next_life + 1] = 0x30;
    M[fire_frame_b] = 0x50; M[fire_frame_c] = 0x50;
    M[player_frozen] = 1;
    M[lives] = 2;
    M[1] = 0x35;
    yield* P.cp(0x36F9); P.sprite_order_reset();
    yield* P.cp(0x36FC); P.swaps_undo();
    yield* P.cp(0x36FF); P.anim_chars_restore();
    yield* P.cp(0x3702); P.play_reset();
    M[walk_speed] = 0x80;
    yield* P.cp(0x370A); P.sound_off();
    io.sidWrite(0x18, 0x0F);
    yield* P.cp(0x3712); P.irq_start();
    P.cli();
    M[status_d018] = 0x0F; M[status_dd00] = 0x92;
    yield* P.cp(0x3722); P.block_swap({ a: 8 });
    yield* P.cp(0x3727); P.picture_draw({ a: 3 });
    yield* P.cp(0x372C); P.picture_draw({ a: 2 });
    yield* P.cp(0x372F); yield* P.title_wait();
    yield* P.cp(0x3734); P.picture_draw({ a: 3 });
    yield* P.cp(0x3739); P.picture_draw({ a: 1 });
    yield* P.cp(0x373E); P.text_draw({ a: 1 });
    yield* P.cp(0x3741); P.captives_place();
    M[0x0387] = 0xFD; M[0x0388] = 0xFD;
    M[frame_flag] = 0;
    io.vicWrite(0x15, 0xFF);
    yield* P.cp(0x3756); P.guards_send();
    yield* P.cp(0x375B); P.tune_start({ y: 5 });
    yield* P.cp(0x375E); P.screen_toggle();
    do {
      yield* P.cp(0x3761); P.captives_struggle();
      yield* P.cp(0x3764); P.enemies_anim();
      yield* P.cp(0x3767); P.sprites_to_irq();
      yield* P.cp(0x376A); P.enemies_move();
      yield* P.cp(0x376D); P.enemies_offscreen();
      yield* P.cp(0x3770); P.sprites_sort();
      yield* P.cp(0x3773); yield* P.frame_wait();
      yield* P.cp(0x3776);
    } while (!P.tune_playing().z);
    yield* P.cp(0x377B); P.screen_toggle();
    yield* P.cp(0x377E); P.play_reset();
    yield* P.cp(0x3781); P.sprite_order_reset();
    yield* P.cp(0x3784); P.sprites_to_irq();
    M[status_d018] = 0x12; M[status_dd00] = 0x90;
    yield* P.cp(0x3793); P.block_swap({ a: 8 });
    yield* P.cp(0x3798); P.tune_start({ y: 0x0B });
    M[frame_flag] = 0; M[difficulty] = 0;
    yield* P.cp(0x37A3); P.status_draw();
    yield* P.cp(0x37A6); yield* P.stage_draw();
    yield* P.cp(0x37A9); P.hero_init();
    return 'main_loop';
  };

  // main_loop ($06E0): one pass. Waits for the frame (frame_wait), takes the scroll the interrupt
  // counted and the fine scroll, then the frame's work; in an end-of-stage fight the stage's fight
  // instead of the second half (stage_end_dispatch).
  P.main_loop = function* () {
    for (;;) {
      // Each routine is handed the registers the one before left, as the game's calls do: a
      // routine that saves a register it did not set (enemy_contact's Y) saves those.
      let reg = {};
      const call = f => { const r = f(Object.assign({}, reg)); if (r) Object.assign(reg, r); };
      yield* P.cp(0x06E0); Object.assign(reg, yield* P.frame_wait());
      M[scroll_step] = B(scroll_pending);
      reg.a = M[scroll_copy] = B(fine_scroll);
      yield* P.cp(0x06EF); call(P.sprites_to_irq);
      yield* P.cp(0x06F2); call(P.column_draw);
      yield* P.cp(0x06F5); call(P.coarse_scroll);
      yield* P.cp(0x06F8); call(P.lives_draw);
      yield* P.cp(0x06FB); call(P.score_add);
      yield* P.cp(0x06FE); call(P.score_draw);
      yield* P.cp(0x0701); call(P.hi_score_check);
      yield* P.cp(0x0704); call(P.hi_score_draw);
      yield* P.cp(0x0707); call(P.next_life_check);
      if ((reg.a = M[boss_on])) {
        // the fight, or the Missile Base's wait for the stage's last enemy, which goes on with this
        // second half (missile_fight_wait)
        const go = yield* P.stage_end_dispatch(Object.assign({}, reg));
        if (go === 'main_loop') continue;
        if (typeof go === 'string') return go;
        Object.assign(reg, go.r);
      }
      const h = reg.x = M[para_hit];
      if (h) {
        yield* P.cp(0x0717);
        call(P.para_release);
        const x = reg.x;
        M[para_hit] = 0;
        M[enemy_wait + x] = 0x80; M[enemy_timer + x] = 0x80;
        reg.a = 0x80;
      }
      yield* P.cp(0x0727); call(P.scripted_spawn);
      yield* P.cp(0x072A); call(P.para_find);
      yield* P.cp(0x072D); call(P.random_spawn);
      yield* P.cp(0x0730); call(P.sprites_to_units);
      yield* P.cp(0x0733); call(P.hero_chars);
      yield* P.cp(0x0736); call(P.enemy_floors);
      yield* P.cp(0x0739); call(P.enemies_scroll);
      yield* P.cp(0x073C); call(P.enemies_chars);
      yield* P.cp(0x073F); call(P.hero_floor_find);
      yield* P.cp(0x0742); call(P.enemies_ladders);
      yield* P.cp(0x0745); call(P.enemies_anim);
      yield* P.cp(0x0748); call(P.weapon_update);
      yield* P.cp(0x074B); call(P.weapon_special);
      yield* P.cp(0x074E); call(P.eshots_update);
      yield* P.cp(0x0751); call(P.enemies_move);
      yield* P.cp(0x0754); call(P.enemies_offscreen);
      yield* P.cp(0x0757); call(P.jet_update);
      yield* P.cp(0x075A); call(P.sprites_sort);
      yield* P.cp(0x075D); call(P.pickup_update);
      yield* P.cp(0x0760); call(P.enemy_deaths);
      yield* P.cp(0x0763); call(P.enemy_contact);
      yield* P.cp(0x0766); call(P.chars_animate);
      yield* P.cp(0x0769); { const r = yield* P.mine_check(Object.assign({}, reg)); if (r) Object.assign(reg, r); }
      yield* P.cp(0x076C); call(P.spawn_timers);
      yield* P.cp(0x076F); call(P.enemy_hold_timers);
      yield* P.cp(0x0772); call(P.stage_end_check);
    }
  };

  // frame_wait ($3696): the driver's three note readers, then the interrupt's frame flag waited for
  // and taken down. The flag is read as the game's loop first read it (P.irqByte), and from M once
  // a turn has passed, as the interrupts the lockstep runs at each yield leave it there.
  P.frame_wait = function* () {
    yield* P.cp(0x3696); P.v3_tick();
    yield* P.cp(0x3699); P.v2_tick();
    yield* P.cp(0x369C); P.v1_tick();
    let polled = false, a;
    while (!(a = polled ? M[frame_flag] : B(frame_flag))) { polled = true; yield; }
    M[frame_flag] = ((polled ? M[frame_flag] : B(frame_flag)) - 1) & 255;
    return { a };
  };
  // wait_tune ($37AF): frame by frame until the driver has finished every voice.
  P.wait_tune = function* () {
    let r;
    do {
      yield* P.cp(0x37AF); yield* P.frame_wait();
      yield* P.cp(0x37B2); r = P.tune_playing();
    } while (!r.z);
    return r;
  };

  // stage_end_check ($1404): the scroll at the stage's end (scroll_limit $E0) and the alarm over:
  // the fight begins (boss_on), the frame counter at $FA.
  P.stage_end_check = function () {
    if (B(scroll_limit) !== 0xE0) return {};
    if (!P.tune_playing().z) return {};
    M[boss_on] = 1;
    M[frame_counters] = 0xFA;
    return {};
  };
  // sprites_clear ($141B): every virtual sprite's Y but the last two cleared, sorted and handed to
  // the interrupt.
  P.sprites_clear = function () {
    for (let x = 0x12; x >= 0; x--) M[spr_y + 2 + x] = 0;
    P.sprites_sort();
    return P.sprites_to_irq();
  };

  // stage_complete ($142A): the next stage, its first column and its intermission tune; the
  // intermission's map with the hero walking along it (or, after the fourth, the captives freed)
  // until the tune ends; the stage's graphics; after the fourth the first stage again.
  P.stage_complete = function* () {
    yield* P.cp(0x142A); P.screen_toggle();
    const s = (M[stage] + 1) & 255;
    M[stage] = s;
    M[map_col] = M[stage_start_lo + s]; M[map_col_hi] = M[stage_start_hi + s];
    yield* P.cp(0x1442); P.tune_start({ y: M[stage_tunes + s] });
    yield* P.cp(0x1445); P.sprites_clear();
    yield* P.cp(0x144A); P.block_swap({ a: 8 });
    M[player_frozen] = 1;
    yield* P.cp(0x1454); P.picture_draw({ a: 3 });
    const last = M[stage] === 4;
    yield* P.cp(0x1464); P.picture_draw({ a: last ? 1 : 0 });
    if (last) { yield* P.cp(0x146D); P.text_draw({ a: 3 }); }
    else { yield* P.cp(0x1475); P.text_draw({ a: 1 }); yield* P.cp(0x147A); P.text_draw({ a: 2 }); }
    M[fine_scroll] = 0; M[difficulty] = 0; M[weapon_shown] = 0; M[player_xu] = 0;
    M[status_d018] = 0x0F; M[status_dd00] = 0x96;
    M[spr_y] = 0xBB; M[hero_bot_y] = 0xBB + 0x15;
    M[y_save] = 8;
    if (last) { yield* P.cp(0x14A6); P.captives_place(); }
    yield* P.cp(0x14A9); P.screen_toggle();
    M[frame_flag] = 0;
    do {
      yield* P.cp(0x14B1); P.sprites_to_irq();
      if (M[stage] === 4) {
        yield* P.cp(0x151F); P.rescue_walk();
        const y = M[y_save];
        if (y) { yield* P.cp(0x1527); P.player_anim_step({ y }); }
      } else {
        yield* P.cp(0x14BE); P.player_anim_step({ y: M[y_save] });
        yield* P.cp(0x14C1); P.map_progress();
        yield* P.cp(0x14C4); P.hero_walk_map();
      }
      yield* P.cp(0x14C7); P.sprites_sort();
      yield* P.cp(0x14CA); yield* P.frame_wait();
      yield* P.cp(0x14CD);
    } while (!P.tune_playing().z);
    yield* P.cp(0x14D2); P.screen_toggle();
    yield* P.cp(0x14D7); P.block_swap({ a: 8 });
    yield* P.cp(0x14DA); P.play_reset();
    yield* P.cp(0x14DD); P.hero_init();
    M[status_d018] = 0x12; M[status_dd00] = 0x90;
    yield* P.cp(0x14EC); P.tune_start({ y: 0x41 });
    if (M[stage] === 4) {
      M[stage] = 0; M[map_col] = 0; M[map_col_hi] = 0;
      const y = M[loop_count];
      M[fire_frame_b] = 0x82;
      if (!((y - 1) & 0x80)) M[fire_frame_c] = 0xFA;
      M[loop_count] = y;
      yield* P.cp(0x1513); P.swaps_undo();
      yield* P.cp(0x1516); P.anim_chars_restore();
    }
    yield* P.cp(0x1519); P.stage_swaps();
    return 'stage_start';
  };

  // lose_life ($152D): the hero frozen until the death tune ends, a life taken; with none left GAME
  // OVER, its tune, and a new game. Otherwise tune $41 and play again 40 columns before the last
  // checkpoint passed (checkpoints), the Harbour's dogs swapped out if their fight had begun.
  P.lose_life = function* () {
    M[player_frozen] = 1;
    yield* P.cp(0x1532); yield* P.wait_tune();
    const l = (M[lives] - 1) & 255;
    M[lives] = l;
    if (l & 0x80) {
      yield* P.cp(0x153A); P.draw_game_over();
      yield* P.cp(0x153F); P.tune_start({ y: 0x23 });
      yield* P.cp(0x1542); yield* P.wait_tune();
      yield* P.cp(0x1545); P.screen_toggle();
      return 'new_game';
    }
    yield* P.cp(0x154B); P.screen_toggle();
    yield* P.cp(0x1550); P.tune_start({ y: 0x41 });
    let y = 0x2E;
    for (; y !== 0; y -= 2) {
      const hi = M[map_col_hi], chi = M[checkpoints + 1 + y];
      if (hi > chi || (hi === chi && M[map_col] >= M[checkpoints + y])) break;
    }
    const col = (M[checkpoints + y] | M[checkpoints + 1 + y] << 8) - 0x28;
    M[map_col] = col & 255; M[map_col_hi] = (col >> 8) & 255;
    if (M[stage] === 1 && B(boss_phase)) { yield* P.cp(0x1582); P.block_swap({ a: 7 }); }
    yield* P.cp(0x1585); P.play_reset();
    yield* P.cp(0x1588); P.sprites_clear();
    M[difficulty] = 0;
    return 'stage_start';
  };

  // stage_swaps ($15CB): the stage's graphics swapped into place, up to three blocks
  // (stage_swap_a, stage_swap_b, stage_swap_c), then play_reset; nothing on the Missile Base.
  P.stage_swaps = function () {
    if (!M[stage]) return {};
    P.block_swap({ a: M[stage_swap_a + M[stage]] });
    let a = M[stage_swap_b + M[stage]];
    if (a) {
      P.block_swap({ a });
      a = M[stage_swap_c + M[stage]];
      if (a) P.block_swap({ a });
    }
    return P.play_reset();
  };
  // stage_start ($15F0): the status line, the Prison Camp's extras, the screen from the map, the
  // hero; then the main loop.
  P.stage_start = function* () {
    yield* P.cp(0x15F0); P.status_draw();
    if (M[stage] === 3) { yield* P.cp(0x15FA); P.prison_setup(); }
    yield* P.cp(0x15FD); yield* P.stage_draw();
    yield* P.cp(0x1600); P.hero_init();
    return 'main_loop';
  };
  // screen_toggle ($1606): the display bit of VIC control register 1 flipped, its bit 7 cleared.
  P.screen_toggle = function () {
    const a = (io.vicRead(0x11) & 0x7F) ^ 0x10;
    io.vicWrite(0x11, a);
    return { a };
  };
  // play_reset ($1626): the play variables cleared ($0200-$02CC, $02CD-$0354), every virtual
  // sprite's Y and X, the scripted spawns' flags; each enemy's climb height $15.
  P.play_reset = function () {
    M.fill(0, flame_free, flame_free + 0xCD);
    M.fill(0, lane_timer, lane_timer + 0x88);
    for (let x = 0x14; x >= 0; x--) { M[spr_y + x] = 0; M[spr_xhi + x] = 0; M[spr_xlo + x] = 0; }
    M.fill(0, spawn_done, spawn_done + 0x3C);
    for (let x = 5; x >= 0; x--) M[enemy_climb_y + x] = 0x15;
    return { a: 0x15, x: 0xFF, y: 0x88 };
  };
  // next_life_check ($FEBA): the score at next_life or more: next_life 70,000 on (in decimal), and a
  // life more when the hero has fewer than 9.
  P.next_life_check = function () {
    for (let x = 2; x >= 0; x--) {
      const s = M[score + x], n = M[next_life + x];
      if (s < n) return {};
      if (s > n) break;
    }
    let r = P.adcD(0x70, M[next_life + 1], 0);
    M[next_life + 1] = r.v;
    r = P.adcD(M[next_life + 2], 0, r.c);
    M[next_life + 2] = r.v;
    if (M[lives] >= 9) return {};
    M[lives] = M[lives] + 1;
    return P.lives_draw();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
