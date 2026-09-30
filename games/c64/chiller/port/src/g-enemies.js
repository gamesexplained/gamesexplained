// The enemies: the five enemy slots on sprites 2-6 (spawning, walking their path scripts, the
// death animation, leaving by an edge and coming back), the extra enemy thrown on sprite 7, the
// collisions with the boy and the girl, the game's random numbers, the lives, the speed-up each
// LEVEL, and the play-area scroll that no level switches on.
(function (root) {
'use strict';
(root.ChillerGroups = root.ChillerGroups || {}).enemies = function (P) {
  const M = P.M, io = P.io;
  const regs = (r, o) => Object.assign({}, r, o);
  const nz = v => ({ z: (v & 255) === 0 ? 1 : 0, n: (v >> 7) & 1 });
  // A byte at a 16-bit address as the game's code sees it: the chips at $D000-$DFFF, RAM elsewhere.
  const rd = a => { a &= 0xFFFF; return a >= 0xD000 && a < 0xE000 ? P.io.read(a) : M[a]; };
  const wr = (a, v) => { a &= 0xFFFF; if (a >= 0xD000 && a < 0xE000) P.io.write(a, v & 255); else M[a] = v & 255; };
  // The zero-page pointer at z plus y, as (z),y addresses it.
  const ptr = (z, y) => (M[z] | (M[(z + 1) & 255] << 8)) + y;
  // A call to another group's routine from a generator, whether that routine waits or not.
  function* call(f, r) { const v = f(r); return v && typeof v.next === 'function' ? yield* v : v; }
  // BPL after CMP: the difference's sign bit is clear.
  const pl = (a, b) => (((a - b) & 0x80) === 0);

  // $2ED0 screen_exit: the boy left the screen; $0384 = 0 and $CF81 = 1, which enemy_pass turns
  // into restart_screen.
  P.screen_exit = function* (r) {
    M[0x0384] = 0;
    M[0xCF81] = 1;
    return regs(r, { a: 1 });
  };

  // $2F38 set_enemy_colour: slot X's colour (A) into its sprite's colour register, then its
  // first direction from its path script (s_2F47).
  P.set_enemy_colour = function (r) {
    wr(0xD029 + r.x, r.a);
    M[0xFB] = M[0x575E + r.x];
    M[0xFC] = M[0xCF24 + r.x];
    return P.s_2F47(regs(r, { y: 0 }));
  };
  // $2F47 s_2F47: the byte Y of the path script at ($FB) becomes slot X's direction.
  P.s_2F47 = function (r) {
    const a = rd(ptr(0xFB, r.y));
    M[0xCF15 + r.x] = a;
    return regs(r, { a });
  };

  // $2FB2 respawn_timer: every 255th pass, each slot whose sprite is off and which has lives left
  // comes back with probability $45E2,x / 128: spawn_enemy, one life fewer, its script from the
  // start and its step count cleared.
  P.respawn_timer = function* (r) {
    const t = M[0xCF75] = (M[0xCF75] + 1) & 255;
    if (t !== 0xFF) return regs(r, { a: t });
    M[0xCF75] = 0;
    let a = 0, x = 0, y = r.y;
    do {
      a = M[0xCF08 + x] & io.vicRead(0x15);
      if (a === 0) {
        a = M[0xCF76 + x];
        if (a !== 0) {
          y = P.random(regs(r, { a: x, x, y })).y;
          a = y & 0x7F;
          if (!pl(a, M[0x45E2 + x])) {
            const s = yield* call(P.spawn_enemy, regs(r, { a: x, x, y }));
            x = s.x; y = s.y;
            M[0xCF76 + x] = (M[0xCF76 + x] - 1) & 255;
            M[0xCF29 + x] = 1;
            a = 0;
            M[0xCF1A + x] = 0;
          }
        }
      }
      x = (x + 1) & 255;
    } while (x !== 5);
    return regs(r, { a, x, y });
  };

  // $5662 mark_moving: keep the slot being spawned (A) in $C0E3 and set its frame timer to 1.
  P.mark_moving = function (r) {
    M[0xC0E3] = r.a;
    M[0xCF33 + r.a] = 1;
    return regs(r, { x: r.a });
  };
  // $566D enemy_lives_reset: each slot's lives from $45E7, and sprite 0's frame from $45EC.
  P.enemy_lives_reset = function (r) {
    for (let x = 0; x < 5; x++) M[0xCF76 + x] = M[0x45E7 + x];
    const a = M[0x07F8] = M[0x45EC];
    return regs(r, { a, x: 5 });
  };
  // $5681 speed_up: at each LEVEL, each slot whose move delay is not already its value at $34E8
  // gets it halved; an odd delay drops to 1 instead, and only an even one halves the frame delay
  // too ($54E5, 1 becoming 2).
  P.speed_up = function (r) {
    let a = 0;
    for (let x = 0; x < 5; x++) {
      a = M[0x34E8 + x];
      if (a === M[0xCF9C + x]) continue;
      const d = M[0xCF9C + x];
      a = M[0xCF9C + x] = d >> 1;
      if (d & 1) { a = M[0xCF9C + x] = 1; continue; }
      a = M[0x54E5 + x] = M[0x54E5 + x] >> 1;
      if (a === 1) a = M[0x54E5 + x] = 2;
    }
    return regs(r, { a, x: 5 });
  };
  // $56B2 set_enemy_speed: slot X's move delay (A), and its frame delay from $4548.
  P.set_enemy_speed = function (r) {
    M[0xCF9C + r.x] = r.a;
    const a = M[0x54E5 + r.x] = M[0x4548 + r.x];
    return regs(r, { a });
  };
  // $56BC enemy_lives: enemy_lives_reset, for new_life.
  P.enemy_lives = function (r) { return P.enemy_lives_reset(r); };
  // $570A j_570A: gravity_setup with gravity: $4501 = A, try_move's row offset $2C, and slot X's
  // direction reloaded from the script (s_2F47).
  P.j_570A = function (r) {
    M[0x4501] = r.a;
    M[0x2A0C] = 0x2C;
    return P.s_2F47(regs(r, { a: 0x2C }));
  };
  // $5716 j_5716: gravity_setup without gravity: the direction reloaded, then the row offset $30.
  P.j_5716 = function (r) {
    r = P.s_2F47(r);
    M[0x2A0C] = 0x30;
    return regs(r, { a: 0x30 });
  };

  // $C000 launch_extra: throw the extra enemy from slot X when that slot's sprite is on and it is
  // not dying (the direction from $454E, extra_launch); otherwise just extra_move.
  P.launch_extra = function (r) {
    let a = M[0xCF46 + r.x] & io.vicRead(0x15);
    if (a === 0) return P.extra_move(regs(r, { a }));
    a = M[0xCF4F + r.x];
    if (a === 1) return P.extra_move(regs(r, { a }));
    return P.extra_launch(regs(r, { a: M[0x454E + r.x] }));
  };
  // $C011 scroll_timer: when the scroll period $4555 is not $FF, count $CF43 down (nudging the
  // boy every 8th count) and at 0 reload it, set 38 columns and scroll (scroll_wait).
  P.scroll_timer = function* (r) {
    let a = M[0x4555];
    if (a === 0xFF) return regs(r, { a });
    M[0xCF43] = (M[0xCF43] - 1) & 255;
    r = yield* call(P.scroll_nudge, r);
    if (!r.z) return r;
    M[0xCF43] = M[0x4555];
    a = io.vicRead(0x16) & 0xF7;
    io.vicWrite(0x16, a);
    return yield* call(P.scroll_wait, regs(r, { a }));
  };

  // $C0E4 spawn_enemy: bring slot A onto the screen: mark it moving, put it on its path, its
  // sprite on, its first frame, then its colour and first direction ($C6E0).
  P.spawn_enemy = function* (r) {
    r = P.mark_moving(r);
    r = P.enemy_to_path(r);
    const x = M[0xC0E3];
    io.vicWrite(0x15, M[0xCF46 + x] | io.vicRead(0x15));
    const a = M[0x07FA + x] = M[0xCF68 + x];
    return yield* call(P.j_C6E0, regs(r, { a, x }));
  };
  // $C144 j_C144: place_boy continued: sprite 0's Y (A) and X ($4516), then its MSB ($C1E1).
  P.j_C144 = function* (r) {
    io.vicWrite(0x01, r.a);
    const a = M[0x4516];
    io.vicWrite(0x00, a);
    return yield* call(P.j_C1E1, regs(r, { a }));
  };

  // $C412 scroll_left: the play area (rows 1-24, characters and colours) one cell to the left;
  // the first cell's character and colour are kept in $C411 and $C410 for scroll_rows.
  P.scroll_left = function (r) {
    M[0xC410] = rd(0xD828);
    M[0xC411] = M[0x0428];
    let a = 0;
    const run = (from, n) => {
      for (let x = 0; x < n; x++) {
        M[from + x - 1] = M[from + x];
        a = rd(0xD400 + from + x);
        wr(0xD400 + from + x - 1, a);
      }
    };
    run(0x0429, 0xD2); run(0x04FA, 0xFA); run(0x05F4, 0xFA); run(0x06EE, 0xFA);
    return regs(r, { a, x: 0xFA });
  };
  // $C46B scroll_wait: wait for raster line $4B, then scroll_left and scroll_rows.
  P.scroll_wait = function* (r) {
    while (io.vicRead(0x12) !== 0x4B) yield { wait: 0x4B };
    r = P.scroll_left(regs(r, { a: 0x4B }));
    return P.scroll_rows(r);
  };
  // $C47F scroll_rows: each row's last cell moves down a row (from $07BF up, the pointers at $FB
  // and $FD), then the saved first cell goes to the end of row 1.
  P.scroll_rows = function (r) {
    M[0xFB] = 0xBF; M[0xFC] = 0x07; M[0xFD] = 0xBF; M[0xFE] = 0xDB;
    let x = r.x;
    for (;;) {
      x = rd(ptr(0xFB, 0));
      wr(ptr(0xFD, 0x28), rd(ptr(0xFD, 0)));
      wr(ptr(0xFB, 0x28), x);
      const lo = M[0xFB] - 40;
      if (lo < 0) { M[0xFC] = (M[0xFC] - 1) & 255; M[0xFE] = (M[0xFE] - 1) & 255; }
      M[0xFB] = M[0xFD] = lo & 255;
      if (M[0xFC] === 3) break;
      if (M[0xFB] === 0x27 && M[0xFC] === 4) break;
    }
    wr(0xD84F, M[0xC410]);
    const a = M[0x044F] = M[0xC411];
    return regs(r, { a, x, y: 0x28 });
  };
  // $C4FB sprite1_hit_scenery: A = 1 switches sprite 1 off; otherwise its frame flips and on the
  // fifth flip ($C544) it goes off.
  P.sprite1_hit_scenery = function (r) {
    let a;
    if (r.a !== 1) {
      a = M[0x07F9] = M[0x07F9] ^ 0x01;
      a = M[0xC544] = (M[0xC544] + 1) & 255;
      if (a !== 5) return regs(r, { a });
      M[0xC544] = 0;
    }
    a = io.vicRead(0x15) & 0xFD;
    io.vicWrite(0x15, a);
    return regs(r, { a });
  };
  // $C525 scroll_nudge: every 8th scroll count, the boy one pixel right and left (try_move 3,
  // then 2). Returns $CF43, whose zero flag scroll_timer reads.
  P.scroll_nudge = function* (r) {
    if ((M[0xCF43] & 7) === 0) {
      r = yield* call(P.try_move, regs(r, { a: 3, x: 1 }));
      r = yield* call(P.try_move, regs(r, { a: 2 }));
    }
    const a = M[0xCF43];
    return regs(r, Object.assign({ a }, nz(a)));
  };
  // $C607 enemy_dying: slot X's death animation: every 10 passes, and every $455B,x of those,
  // the next frame; at frame $FC its sprite goes off and the slot stops dying.
  P.enemy_dying = function (r) {
    const x = r.x;
    let a = M[0xCF82 + x] = (M[0xCF82 + x] - 1) & 255;
    if (a !== 0) return regs(r, { a });
    M[0xCF82 + x] = 0x0A;
    a = M[0xCF54 + x] = (M[0xCF54 + x] - 1) & 255;
    if (a !== 0) return regs(r, { a });
    a = M[0x07FA + x] = (M[0x07FA + x] + 1) & 255;
    if (a === 0xFC) {
      io.vicWrite(0x15, (M[0xCF46 + x] ^ 0xFF) & io.vicRead(0x15));
      M[0xCF4F + x] = 0;
    }
    a = M[0xCF54 + x] = M[0x455B + x];
    return regs(r, { a });
  };

  // $C9F1 random: the next byte of the code at $C000 (index $CF14) EOR $A2, in A and Y; X = $20.
  P.random = function (r) {
    const i = M[0xCF14] = (M[0xCF14] + 1) & 255;
    const a = M[0xC000 + i] ^ P.irq_byte(0xA2);
    return regs(r, { a, x: 0x20, y: a, z: 0, n: 0 });
  };
  // $CA64 enemy_move_if_on: move sprite X one pixel in direction Y when its $D015 bit (read as
  // $CF06,x, which is enemy_bits for X = 2-6) is on. The move is $C37A: move_sprite with A = Y.
  P.enemy_move_if_on = function (r) {
    const a = M[0xCF06 + r.x] & io.vicRead(0x15);
    if (a === 0) return regs(r, { a });
    return P.move_sprite(regs(r, { a: r.y }));
  };

  // $CAED new_life: a life off ($CF7C), only the boy's sprite on, the enemies' lives reloaded.
  P.new_life = function (r) {
    M[0xCF7C] = (M[0xCF7C] - 1) & 255;
    io.vicWrite(0x15, 1);
    return P.enemy_lives(regs(r, { a: 1 }));
  };
  // $CAF9 j_CAF9: Y into the address in its own operand ($FFFF), then lose_life.
  P.j_CAF9 = function (r) {
    wr(M[0xCAFA] | (M[0xCAFB] << 8), r.y);
    return P.lose_life(r);
  };
  // $CB24 enemy_to_path: place slot A at its path block's X, Y and MSB ($4519 + $CF0D,x), then
  // walk it right by a random part of the block's count right (starting again from the block's X
  // each time the count is reached), and the same downwards.
  P.enemy_to_path = function (r) {
    const s = M[0xCB23] = r.a;
    let x = M[0xCF0D + s], y, a;
    const setX = y0 => {
      wr(0xD004 + ((s << 1) & 255), M[0x4519 + x]);
      if (y0) wr(0xD005 + ((s << 1) & 255), M[0x451A + x]);
      a = (M[0xCF08 + s] ^ 0xFF) & io.vicRead(0x10);
      io.vicWrite(0x10, a);
      a = M[0x451B + x] | io.vicRead(0x10);
      io.vicWrite(0x10, a);
    };
    setX(true);
    y = s;
    // walk in direction dir by the count at $451C or $451D; true when the random count ran out
    const walk = (count, dir, restart) => {
      y = P.random(regs(r, { a, x, y })).y;
      for (;;) {
        a = M[0xCF12] = 0;
        for (;;) {
          x = M[0xCF0D + s];
          a = M[0xCF12];
          if (a === M[count + x]) break;
          y = (y - 1) & 255;
          if (y === 0) return;
          M[0xCF12] = (M[0xCF12] + 1) & 255;
          M[0xCF13] = y;
          P.move_sprite(regs(r, { a: dir, x: (s + 2) & 255, y }));
          y = M[0xCF13];
        }
        M[0xCF13] = y;
        x = M[0xCF0D + s];
        restart();
        y = M[0xCF13];
      }
    };
    a = M[0x451C + x];
    if (a !== 0) walk(0x451C, 3, () => setX(false));
    a = M[0x451D + x];
    if (a !== 0) walk(0x451D, 1, () => { a = M[0x451A + x]; wr(0xD005 + ((s << 1) & 255), a); });
    return regs(r, { a, x, y });
  };
  // $CC12 path_step: slot A one pixel in its direction; at an edge, unless $4538,x lets it stay,
  // it leaves (enemy_gone, sprite off). Every 8 steps the next direction from its script ($FF
  // starts it again), or with $453D,x set a random one of the script's first 64 bytes.
  P.path_step = function (r) {
    M[0xCC11] = r.a;
    const s = r.a;
    let a = M[0xCF15 + s];
    r = P.enemy_move_if_on(regs(r, { a, x: (s + 2) & 255, y: a }));
    let x, y = r.y;
    if (y === 0xFF) {
      x = s;
      a = M[0x4538 + x];
      if (a === 0) {
        r = P.enemy_gone(regs(r, { a, x }));
        a = (r.a ^ 0xFF) & io.vicRead(0x15);
        io.vicWrite(0x15, a);
        return regs(r, { a });
      }
    }
    x = s;
    a = M[0xCF1A + x] = (M[0xCF1A + x] + 1) & 255;
    if (a !== 8) return regs(r, { a, x, y });
    M[0xCF1A + x] = 0;
    if (M[0x453D + x] !== 0) {
      y = P.random(regs(r, { a, x, y })).y & 0x3F;
      M[0xFB] = M[0x575E + s];
      M[0xFC] = M[0xCF24 + s];
      a = M[0xCF15 + s] = rd(ptr(0xFB, y));
      return regs(r, { a, x: s, y });
    }
    M[0xFB] = M[0x575E + x];
    M[0xFC] = M[0xCF24 + x];
    y = M[0xCF29 + x];
    M[0xCF29 + x] = (y + 1) & 255;
    a = rd(ptr(0xFB, y));
    if (a === 0xFF) {
      M[0xCF29 + s] = 1;
      y = 0;
      a = rd(ptr(0xFB, 0));
    }
    M[0xCF15 + s] = a;
    return regs(r, { a, x: s, y });
  };
  // $CCAB enemy_move: slot X's path step every $CF9C,x passes; every 16 passes, and every $54E5
  // of those, its sprite's next frame (for the slot in $CEFF), from the last back to the first.
  P.enemy_move = function (r) {
    let x = r.x;
    let a = M[0xCF2E + x] = (M[0xCF2E + x] + 1) & 255;
    if (a === M[0xCF9C + x]) {
      M[0xCF2E + x] = 0;
      r = P.path_step(regs(r, { a: x }));
      x = r.x;
    }
    a = M[0xCF97 + x] = (M[0xCF97 + x] + 1) & 255;
    if (a !== 0x10) return regs(r, { a, x });
    M[0xCF97 + x] = 0;
    x = M[0xCEFF];
    a = M[0xCF33 + x] = (M[0xCF33 + x] + 1) & 255;
    if (a !== M[0x54E5 + x]) return regs(r, { a, x });
    M[0xCF33 + x] = 0;
    a = M[0x07FA + x];
    M[0x07FA + x] = (a + 1) & 255;
    if (a === M[0xCF38 + x]) a = M[0x07FA + x] = M[0xCF3D + x];
    return regs(r, { a, x });
  };
  // $CCF5 extra_enemy: the extra enemy on sprite 7. While it is off, when extra_roll comes in
  // below $4553, launch it from a random slot 0-4 (launch_extra); otherwise extra_move.
  P.extra_enemy = function (r) {
    let a = io.vicRead(0x15) & 0x80;
    if (a !== 0) return P.extra_move(regs(r, { a }));
    r = P.extra_roll(r);
    if (pl(r.y, M[0x4553])) return P.extra_move(r);
    do { r = P.random(r); a = r.y & 7; } while (pl(a, 5));
    return P.launch_extra(regs(r, { a, x: a }));
  };
  // $CD17 extra_launch: direction A (4: none) into $CF44, sprite 7 on at slot X's sprite's X, Y
  // and MSB in colour $454D, then extra_move.
  P.extra_launch = function (r) {
    let a = r.a;
    if (a === 4) return P.extra_move(r);
    M[0xCF44] = a;
    io.vicWrite(0x15, io.vicRead(0x15) | 0x80);
    io.vicWrite(0x2E, M[0x454D]);
    const x2 = (r.x << 1) & 255;
    io.vicWrite(0x0E, rd(0xD004 + x2));
    a = rd(0xD005 + x2);
    io.vicWrite(0x0F, a);
    const x = x2 >> 1;
    a = 0x7F & io.vicRead(0x10);
    io.vicWrite(0x10, a);
    a &= M[0xCF46 + x];
    if (a !== 0) { a = 0x80 | io.vicRead(0x10); io.vicWrite(0x10, a); }
    return P.extra_move(regs(r, { a, x }));
  };
  // $CD55 extra_move: every $4554 passes ($CF45) sprite 7 one pixel in its direction ($CF44);
  // at an edge it goes off.
  P.extra_move = function (r) {
    let a = M[0xCF45] = (M[0xCF45] + 1) & 255;
    if (a !== M[0x4554]) return regs(r, { a });
    M[0xCF45] = 0;
    r = P.move_sprite(regs(r, { a: M[0xCF44], x: 7 }));
    if (r.y !== 0xFF) return r;
    a = io.vicRead(0x15) & 0x7F;
    io.vicWrite(0x15, a);
    return regs(r, { a });
  };
  // $CD7B extra_roll: two random rolls; Y is the first (0-127) when the second is at least
  // $78, else $7F.
  P.extra_roll = function (r) {
    r = P.random(r);
    M[0xCF4C] = r.y & 0x7F;
    r = P.random(r);
    const a = r.y & 0x7F;
    return regs(r, { a, y: pl(a, 0x78) ? M[0xCF4C] : 0x7F });
  };
  // $CD9D girl_touch: sprite 1 in the collisions kept at $FD with any of sprites 2-6 costs
  // energy (poison_add X = 2).
  P.girl_touch = function* (r) {
    let a = M[0xFD] & 2;
    if (a === 0) return regs(r, { a });
    let y = 0;
    for (let x = 0; x < 5; x++) { a = M[0xCF46 + x] & M[0xFD]; if (a) y++; }
    if (y === 0) return regs(r, { a, x: 5, y });
    return yield* call(P.poison_add, regs(r, { a, x: 2, y }));
  };
  // $CDE9 enemy_step: slot A's turn: enemy_dying while it dies, else enemy_move.
  P.enemy_step = function* (r) {
    const x = r.a, a = M[0xCF4F + x];
    if (a === 1) return P.enemy_dying(regs(r, { a, x }));
    return P.enemy_move(regs(r, { a, x }));
  };
  // $CDFA j_CDFA: unused_shot_hit continued: a dying slot X is left alone; otherwise the boy
  // loses energy ($CDDE).
  P.j_CDFA = function* (r) {
    const a = M[0xCF4F + r.x];
    if (a === 1) return regs(r, { a, z: 1, c: 1, n: 0 });
    return yield* call(P.b_CDDE, regs(r, { a, z: 0, c: a >= 1 ? 1 : 0, n: ((a - 1) >> 7) & 1 }));
  };
  // $CE87 sprite_touch: the collisions ($D01E, kept at $FD). The boy (sprite 0) touching exactly
  // one of sprites 2-7 without the girl: its bits into $CF5E, its slot into $CF5F, and energy
  // lost (poison_add X = 2). Then girl_touch, unless both the boy and the girl are in it.
  P.sprite_touch = function* (r) {
    let a = M[0xFD] = io.vicRead(0x1E);
    if ((a & 1) === 0) return yield* call(P.girl_touch, regs(r, { a: 0 }));
    if (a & 2) return regs(r, { a: 2 });
    let y = 0;
    for (let x = 0; x < 6; x++) { a = M[0xCF46 + x] & M[0xFD]; if (a) y++; }
    if (y !== 1) return regs(r, { a, x: 6, y });
    a = M[0xCF5E] = M[0xFD] & 0xFC;
    let x = 0;
    while (a !== 4) { x++; a >>= 1; }
    M[0xCF5F] = x;
    r = yield* call(P.poison_add, regs(r, { a, x: 2, y }));
    return yield* call(P.girl_touch, r);
  };
  // $CEDA lose_life: new_life, the lives digit at $041A down, and at "0" the screen-over flag.
  P.lose_life = function (r) {
    r = P.new_life(r);
    let a = M[0x041A] = (M[0x041A] - 1) & 255;
    if (a === 0xB0) a = M[0xCF7D] = 1;
    return regs(r, { a });
  };
  // $CEEE enemy_gone: slot X left by an edge: a life back, and A its sprite bit for the caller.
  P.enemy_gone = function (r) {
    M[0xCF76 + r.x] = (M[0xCF76 + r.x] + 1) & 255;
    return regs(r, { a: M[0xCF08 + r.x] });
  };
  // $CEF6 j_CEF6: place_boy's end: the boy's colour (A), then new_life.
  P.j_CEF6 = function (r) {
    io.vicWrite(0x27, r.a);
    return P.new_life(regs(r, { a: M[0x45EC] }));
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
