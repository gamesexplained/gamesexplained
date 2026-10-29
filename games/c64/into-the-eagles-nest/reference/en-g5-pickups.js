/* en-g5-pickups */
// Into the Eagle's Nest, Play port, group "pickups" ($4C22-$55FF): the wipe interrupt and its two
// bands, the unused tile fade, the test for what the player has walked onto and every pickup it
// leads to, the tile grid's write-back, the lift and the doors a key opens, the map address of a
// place on the screen, what a shot hits and everything a shot can do: pickups spoilt, furniture
// broken, doors shot open, chests opened. One function per listing label, on the game's own memory
// P.M, its chips through P.io (en-core.js). All of it runs inside the play interrupt except the
// wipe, which is an interrupt of its own.
(function (root) {
  'use strict';
  function install(P, H) {
    const M = P.M, { rd, wr, ptr } = H;
    const print_message = H.call('print_message', 0x592E);
    const read_tile_grid = H.call('read_tile_grid', 0x5C55);
    const next_random = H.call('next_random', 0x67F3);               // go_next_random $6012
    const shot_hit_figure = H.call('shot_hit_figure', 0x6EAA);       // go_shot_hit_figure $6040
    const shot_hit_prisoner = H.call('shot_hit_prisoner', 0x6E21);   // j_6021 $6021
    const shot_hit_scenery = H.call('shot_hit_scenery', 0x67FD);     // j_6015 $6015, to j_67FD

    const GRID = 0x5C22;                                             // the six-by-six tile grid
    // a message for the line at the bottom of the screen, at hi:lo
    const say = (lo, hi) => { M[0xFC] = lo; M[0xFD] = hi; print_message(); };
    const idle = () => M[0x592B] === M[0x592C];
    // the pointer at zero page z moved on (or back) by d, its carry or borrow taken to the high byte
    const add16 = (z, d) => {
      const s = M[z] + d;
      M[z] = s & 255;
      if (s > 255) M[z + 1] = (M[z + 1] + 1) & 255;
      else if (s < 0) M[z + 1] = (M[z + 1] - 1) & 255;
    };
    // (z),y
    const at = (z, y) => (ptr(z) + (y & 255)) & 0xFFFF;

    // ---------------------------------------------------------------- the wipe
    P.wipe_irq = function () {                                       // $4C22
      wr(0xD019, 1);
      const band = M[0x4BF0] ^ 1;
      M[0x4BF0] = band;
      if (band) {
        P.wipe_band_closed();
        wr(0xD012, M[0x4BEE]);
        P.kernal_irq();                                              // jmp $EA31
      } else {
        P.wipe_band_open();
        wr(0xD012, M[0x4BEF]);
      }
    };
    P.irqs[0x4C22] = P.wipe_irq;
    P.wipe_band_closed = function () {                               // $4C4A
      wr(0xD011, 0x7B);
      wr(0xD027, 0); wr(0xD028, 0); wr(0xD029, 0); wr(0xD02A, 0);
      wr(0xD025, 0); wr(0xD026, 0);
      const s = M[0x4BF1];
      if (s === 0) {                                                 // shutting
        if (M[0x4BEE] === 0x92) { M[0x4BF1] = 3; return; }
        M[0x4BEE] = (M[0x4BEE] + 4) & 255;
        M[0x4BEF] = (M[0x4BEF] - 4) & 255;
      } else if (s === 1) {                                          // opening
        if (M[0x4BEE] === 0x32) { M[0x4BF1] = 2; return; }
        M[0x4BEE] = (M[0x4BEE] - 4) & 255;
        M[0x4BEF] = (M[0x4BEF] + 4) & 255;
      }
    };
    P.wipe_band_open = function () {                                 // $4CAD
      wr(0xD011, 0x1B);
      wr(0xD027, 7); wr(0xD028, 7); wr(0xD029, 7); wr(0xD02A, 7);
      wr(0xD025, 0); wr(0xD026, 5);
    };

    // the tile fade nothing calls: the character set at $2000-$27FF kept at $8000 and cleared, then
    // copied back eight times through a mask growing a bit at a time
    P.fade_in_tiles = function () {                                  // $4CCB
      for (let i = 0; i < 0x800; i++) { M[0x8000 + i] = M[0x2000 + i]; M[0x2000 + i] = 0; }
      M[0x02AB] = 1;
      for (;;) {
        for (let i = 0; i < 0x800; i++) M[0x2000 + i] = M[0x8000 + i] & M[0x02AB];
        const m = M[0x02AB];
        M[0x02AB] = ((m << 1) | 1) & 255;
        if (m & 0x80) break;
      }
      M[0x02] = 0x00; M[0x03] = 0x28; M[0x04] = 0x00; M[0x05] = 0x88;
    };

    // ---------------------------------------------------------------- walking onto things
    P.walked_onto_something = function () {                          // $4D3A
      let hit = false;
      for (let y = 0; y < 16; y++) if (M[GRID + M[0x4D2A + y]] & 0x38) { hit = true; break; }
      if (!hit) {
        const lo = M[0x06], hi = M[0x07];
        P.redraw_tile_grid();
        M[0x07] = hi; M[0x06] = lo;
        return P.step_onto_lift();
      }
      let y = 0;
      for (;;) {                                                     // $4D5F
        const t = M[GRID + y];
        if (t === 0x10) return P.found_door_key({ y });
        if (t === 0x14) return P.found_painting({ y });
        if (t === 0x18) return P.found_vase({ y });
        if (t === 0x1C) return P.found_food({ y });
        if (t === 0x28) return P.found_pendant({ y });
        if (t === 0x12 && y > 4) return P.took_ammo({ y });
        if (t === 0x20) return P.found_first_aid({ y });
        if (t === 0x08) return P.found_lift_pass({ y });
        do y++; while (y === 0x05 || y === 0x0B || y === 0x11 || y === 0x17 || y === 0x1D);
        if (y === 0x1E) return;
      }
    };
    P.found_door_key = function (r) {                                // $4DC5
      const y = r.y & 255;
      M[0x02AC] = H.adcD(M[0x02AC], 1, 0).a;
      M[0x02D5] = 1;
      say(0x09, 0x56);                                               // YOU HAVE FOUND
      say(0x65, 0x56);                                               // A DOOR KEY.
      M[GRID + y] = 0; M[GRID + ((y + 1) & 255)] = 0;
      P.redraw_tile_grid();
    };
    // j_4DF7: a shot pushes a door key a place the way it was going ($02D2), into empty tiles
    P.push_door_key = function (r) {                                 // $4DF7
      const y = r.y & 255;
      let x = y;
      const d = M[0x02D2];
      if (d === 1 || d === 2) {
        x = (x + (d === 1 ? -6 : 6)) & 255;
        if (M[GRID + x]) return P.redraw_tile_grid();
        x = (x + 1) & 255;
        if (M[GRID + x]) return P.redraw_tile_grid();
        x = (x - 1) & 255;
      } else if (d === 3) {
        M[0xFC] = M[0x02]; M[0xFD] = M[0x03];
        add16(0xFC, -2);
        if (rd(ptr(0xFC))) return P.redraw_tile_grid();
        wr(ptr(0xFC), 0x10);
        M[GRID + x] = 0x11;
        x = (x + 1) & 255;
        M[GRID + x] = 0;
        return P.redraw_tile_grid();
      } else {
        x = (x + 2) & 255;
        if (M[GRID + x]) return P.redraw_tile_grid();
        x = (x - 1) & 255;
      }
      M[GRID + y] = 0; M[GRID + ((y + 1) & 255)] = 0;               // j_4E63
      M[GRID + x] = 0x10; M[GRID + ((x + 1) & 255)] = 0x11;
      P.redraw_tile_grid();
    };
    // the grid back into the castle map at ($06), a map row of 128 bytes to each grid row of six
    P.redraw_tile_grid = function () {                               // $4E77
      for (let x = 0; x !== 0x24; x += 6) {
        for (let k = 0; k < 6; k++) wr(at(0x06, k), M[GRID + x + k]);
        add16(0x06, 0x80);
      }
    };
    P.found_painting = function (r) {                                // $4EB4
      say(0x09, 0x56);
      M[0x02D5] = 1;
      M[0x02C5] = (M[0x02C5] + 0x19) & 255;
      P.took_painting(r);
    };
    P.took_painting = function (r) {                                 // $4ECD
      P.clear_object_tiles(r);
      say(0x1E, 0x56);                                               // A PAINTING.
      P.redraw_tile_grid();
    };
    P.found_vase = function (r) {                                    // $4EDE
      say(0x09, 0x56);
      M[0x02D5] = 1;
      M[0x02C5] = (M[0x02C5] + 0x0F) & 255;
      P.took_vase(r);
    };
    P.took_vase = function (r) {                                     // $4EF7
      P.clear_object_tiles(r);
      say(0x2A, 0x56);                                               // A VASE.
      P.redraw_tile_grid();
    };
    P.found_food = function (r) {                                    // $4F08
      say(0x09, 0x56);
      M[0x02D5] = 4;
      const s = H.sbcD(M[0x02C6], 0x10, 1);
      M[0x02C6] = s.c ? s.a : 0;
      P.took_food(r);
    };
    P.took_food = function (r) {                                     // $4F27
      P.clear_object_tiles(r);
      say(0x32, 0x56);                                               // SOME COLD FOOD.
      P.redraw_tile_grid();
    };
    P.found_pendant = function (r) {                                 // $4F38
      say(0x09, 0x56);
      M[0x02D5] = 1;
      M[0x02C5] = (M[0x02C5] + 0x28) & 255;
      P.took_pendant(r);
    };
    P.took_pendant = function (r) {                                  // $4F51
      P.clear_object_tiles(r);
      say(0x4D, 0x56);                                               // A PENDANT.
      P.redraw_tile_grid();
    };
    P.took_ammo = function (r) {                                     // $4F62
      const y = r.y & 255;
      M[GRID + y] = 0; M[GRID + ((y + 1) & 255)] = 0;
      const s = H.adcD(M[0x02BD], 0x10, 0);
      let a = s.a;
      if (s.c) {
        if (idle()) say(0xBA, 0x56);                                 // ANY MORE AMMO WOULD BE WASTED !
        a = 0x99;
      }
      M[0x02BD] = a;
      P.redraw_tile_grid();
    };
    P.found_first_aid = function (r) {                              // $4F90
      say(0x09, 0x56);
      M[0x02D5] = 4;
      M[0x02C6] = 0;
      P.took_first_aid(r);
    };
    P.took_first_aid = function (r) {                               // $4FA5
      const y0 = r.y & 255;
      let y = y0;
      M[0xFC] = M[0x06]; M[0xFD] = M[0x07];
      while (y >= 6) { y -= 6; add16(0xFC, 0x80); }                 // a map row for each grid row
      const s = y + M[0xFC];                                         // the column, whose carry
      M[0xFC] = s & 255;                                             // takes the high byte down
      if (s > 255) M[0xFD] = (M[0xFD] - 1) & 255;
      add16(0xFC, -1);
      P.clear_object_tiles({ y: y0 });
      P.redraw_tile_grid();
      wr(at(0xFC, 0), 0); wr(at(0xFC, 0x80), 0);
      M[0xFD] = (M[0xFD] + 1) & 255;
      wr(at(0xFC, 0), 0); wr(at(0xFC, 1), 0); wr(at(0xFC, 2), 0);
      say(0x42, 0x56);                                               // FIRST AID.
    };
    P.found_lift_pass = function (r) {                               // $5002
      const y = r.y & 255;
      say(0x09, 0x56);
      M[0x02D5] = 1;
      M[GRID + y] = 0;
      say(0x58, 0x56);                                               // A LIFT PASS.
      M[0x02C8] = 1;
      P.redraw_tile_grid();
    };
    // an object's two-by-two square out of the grid, from place y
    P.clear_object_tiles = function (r) {                            // $502A
      const y = r.y & 255;
      for (const k of [0, 1, 6, 7]) M[GRID + ((y + k) & 255)] = 0;
    };

    // ---------------------------------------------------------------- the lift and the doors
    // the message a locked door or the lift gives, once, when the message line is idle
    const locked = (lo, hi) => {
      if (!idle()) { M[0x02BE] = M[0x592B]; return; }
      if (M[0x02BE]) return;
      if (!M[0x02BA]) return;
      M[0x02BE] = (M[0x02BE] + 1) & 255;
      say(lo, hi);
    };
    P.step_onto_lift = function () {                                 // $5040
      const t = M[0x5C42];
      if (t === 0x54 || t === 0x55) {
        if (M[0x02C8]) { M[0x02C8] = 2; say(0xC5, 0x57); return; }  // YOU ARE ENTERING THE LIFT.
        return locked(0x9C, 0x57);                                   // YOU NEED A LIFT PASS !
      }
      M[0x02B8] = 0x44;                                              // j_508B: a steel door
      if (M[0x5C33] === 0x43) { M[0x02AD] = 0x06; M[0x02AE] = 0x86; }
      else if (M[0x5C2E] === 0x44) { M[0x02AD] = 0x00; M[0x02AE] = 0x80; }
      else {
        M[0x02B9] = 0x45;                                            // j_5146: a wooden door
        if (M[0x5C42] === 0x45) { M[0x07] = (M[0x07] + 2) & 255; add16(0x06, 0x80); }
        else if (M[0x5C24] === 0x46) add16(0x06, -0x80);
        else return;
        if (!M[0x02AC]) return locked(0x03, 0x57);                   // THIS DOOR IS LOCKED !
        M[0x02AC] = H.sbcD(M[0x02AC], 1, 1).a;
        M[0x02D5] = 6;
        return P.open_wooden_door();
      }
      if (!M[0x02AC]) return locked(0x03, 0x57);                     // j_50BB
      M[0x02AC] = H.sbcD(M[0x02AC], 1, 1).a;
      M[0x02D5] = 6;
      P.open_steel_door();
    };
    // j_50F7: up the column at ($06) + $02AD to the door's top, then the door's tiles rewritten
    P.open_steel_door = function () {                                // $50F7
      while (rd(at(0x06, M[0x02AD])) === M[0x02B8]) add16(0x06, -0x80);
      M[0x06] = (M[0x06] - 1) & 255;
      if (M[0x06] === 0) M[0x07] = (M[0x07] - 1) & 255;
      const a = M[0x02AD], b = M[0x02AE];
      wr(at(0x06, b), 5); wr(at(0x06, b + 1), 5);
      for (let i = 0; i < 2; i++) {
        M[0x07] = (M[0x07] + 1) & 255;
        wr(at(0x06, a), 0); wr(at(0x06, a + 1), 0);
        wr(at(0x06, b), 0); wr(at(0x06, b + 1), 0);
      }
    };
    // j_5192: left along the row at ($06) to the door's end, then its two rows cleared
    P.open_wooden_door = function () {                               // $5192
      while (rd(at(0x06, 0)) === M[0x02B9]) {
        M[0x06] = (M[0x06] - 1) & 255;
        if (M[0x06] === 0) M[0x07] = (M[0x07] - 1) & 255;
      }
      for (const row of [0x00, 0x80]) {
        for (let y = 1; y <= 4; y++) wr(at(0x06, row + y), 0);
        wr(at(0x06, row + 5), 4);
      }
    };

    // ---------------------------------------------------------------- shots
    // the map address of the place at $02B6, $02B7 on the screen, in $02 and $03
    P.map_address = function () {                                    // $51CD
      M[0x03] = 0;
      M[0x02] = (M[0x02B7] - 0x3A) & 255;
      for (let i = 0; i < 4; i++) {
        const c = M[0x02] >> 7;
        M[0x02] = (M[0x02] << 1) & 255;
        M[0x03] = ((M[0x03] << 1) | c) & 255;
      }
      add16(0x02, ((M[0x02B6] - 0x20) & 255) >> 3);
      add16(0x02, M[0xFA]);
      M[0x03] = (M[0x03] + M[0xFB]) & 255;
    };
    // what each shot in the air has reached, 1 the first shot and 2 the second
    const shotStops = (n) => {
      M[0x02B6] = M[n === 1 ? 0x02DB : 0x02DD];
      M[0x02B7] = M[n === 1 ? 0x02DC : 0x02DE];
      P.map_address();
      const t = rd(at(0x02, 0));
      if (t === 0x3E || t === 0x3F || !(t & 0xF8)) return;
      if (n === 1) {
        M[0x02AF] &= 0xF0;
        M[0x02DB] = 0; M[0x02DC] = 0; M[0x02B2] = 0;
        M[0x02D2] = M[0x02B1];
      } else {
        M[0x02AF] &= 0x0F;
        M[0x02DD] = 0; M[0x02DE] = 0; M[0x02B4] = 0;
        M[0x02D2] = M[0x02B3];
      }
      P.shot_hit_tile({ y: 0 });
    };
    P.shots_hit_anything = function () {                             // $5212
      if (M[0x02AF] & 0x01) shotStops(1);
      if (M[0x02AF] & 0x10) shotStops(2);
    };
    P.shot_hit_tile = function (r) {                                 // $529B
      const y = r.y & 255;
      let t = rd(at(0x02, y));
      if (t >= 0x76 && t <= 0xC0) { shot_hit_figure({ a: (t - 0xC1) & 255, y, c: 0 }); return; }
      t = rd(at(0x02, y));
      if (t >= 0xD4 && t < 0xE4) { shot_hit_prisoner({ a: t, y, c: 0 }); return; }
      if ((t >= 0x30 && t < 0x3F) || (t >= 0xC0 && t < 0xCC) || (t >= 0xE7 && t < 0xEF)) { shot_hit_scenery({ a: t, y, c: 0 }); return; }
      if (t >= 0x5E && t < 0x6E) return P.shoot_chest({ a: t, y });
      if (t === 0x49) return P.shoot_steel_door_left();
      if (t === 0x4A) return P.shoot_steel_door_right();
      if (t === 0x47) return P.shoot_wooden_door_upper();
      if (t === 0x48) return P.shoot_wooden_door_lower();
      if (t >= 0x43 && t <= 0x46) { M[0x02D5] = 3; return; }
      if (t >= 0x40 && t < 0xFC) return P.shoot_furniture({ a: t });
      read_tile_grid();                                              // the nine places round the shot
      for (let x = 0; x < 9; x++) {
        const g = M[0x5374 + x], k = M[GRID + g], q = { y: g };
        if (k === 0x10) return P.shoot_door_key(q);
        if (k === 0x12) return P.shoot_ammo_box(q);
        if (k === 0x14) return P.shot_hit_painting(q);
        if (k === 0x18) return P.shot_hit_vase(q);
        if (k === 0x1C) return P.shot_hit_food(q);
        if (k === 0x28) return P.shot_hit_pendant(q);
        if (k === 0x20) return P.shot_hit_first_aid(q);
        if (k === 0x08) return P.shoot_lift_pass();
        if (k === 0xFC) return P.shoot_detonator(q);
      }
    };
    P.shoot_detonator = function (r) {                               // $5386
      say(0x71, 0x56);                                               // DETONATOR ACTIVATED.
      M[0x5F9A + M[0x02A7]] = 1;
      M[0x02D5] = 1;
      P.clear_object_tiles(r);
      P.redraw_tile_grid();
    };
    P.shoot_door_key = function (r) {                                // $53A4
      if (idle()) say(0x5F, 0x58);                                   // YOU ARE WAISTING AMMO.
      M[0x02D5] = 2;
      P.push_door_key(r);
    };
    P.shoot_ammo_box = function (r) {                                // $53BF
      const y = r.y & 255;
      M[GRID + y] = 0; M[GRID + ((y + 1) & 255)] = 0;
      M[0x02D5] = 9;
      P.redraw_tile_grid();
    };
    // YOU HAVE SHOT, sound 9, and the pickup's own tail names it and clears it
    const shotPickup = (r, tail) => { say(0x86, 0x56); M[0x02D5] = 9; tail(r); };
    P.shot_hit_painting = (r) => shotPickup(r, P.took_painting);    // $53D0
    P.shot_hit_food = (r) => shotPickup(r, P.took_food);            // $53E3
    P.shot_hit_pendant = (r) => shotPickup(r, P.took_pendant);      // $53F6
    P.shot_hit_vase = (r) => shotPickup(r, P.took_vase);            // $5409
    P.shot_hit_first_aid = (r) => shotPickup(r, P.took_first_aid);  // $541C
    P.shoot_furniture = function (r) {                               // $542F
      read_tile_grid();
      const t = r.a & 255;
      const y = { 0x4C: 7, 0x4D: 6, 0x4E: 1, 0x4F: 0, 0x50: 7, 0x51: 6, 0x52: 1, 0x53: 0 }[t];
      if (y === undefined) return;
      if (t < 0x50) {                                                // j_547D: broken
        M[GRID + y] = 0x50; M[GRID + y + 1] = 0x51; M[GRID + y + 6] = 0x52; M[GRID + y + 7] = 0x53;
      } else P.clear_object_tiles({ y });                            // j_549B: gone
      P.redraw_tile_grid();
    };
    P.shoot_lift_pass = function () {                                // $54A1
      if (!idle()) return;
      say(0x76, 0x57);                                               // SHOOTING A LIFT PASS IS A BIT SILLY !
    };
    const shotDoor = () => { M[0x06] = M[0x02]; M[0x07] = M[0x03]; };
    P.shoot_steel_door_left = function () {                          // $54B5
      M[0x02AD] = 0x01; M[0x02AE] = 0x81; M[0x02B8] = 0x4A;
      shotDoor();
      M[0x02D5] = 9;
      P.open_steel_door();
    };
    P.shoot_steel_door_right = function () {                         // $54D4
      M[0x02AD] = 0x00; M[0x02AE] = 0x80; M[0x02B8] = 0x4A;
      shotDoor();
      M[0x02D5] = 9;
      P.open_steel_door();
    };
    P.shoot_wooden_door_upper = function () {                        // $54F3
      M[0x02B9] = 0x47;
      shotDoor();
      M[0x02D5] = 9;
      P.open_wooden_door();
    };
    P.shoot_wooden_door_lower = function () {                        // $5508
      M[0x02B9] = 0x47;
      shotDoor();
      add16(0x06, -0x80);
      M[0x02D5] = 9;
      P.open_wooden_door();
    };

    // ---------------------------------------------------------------- chests
    // the tile hit names which of the chest's four it was: back to the chest's corner, and its state
    P.shoot_chest = function (r) {                                   // $5528
      const t = r.a & 255, y = r.y & 255;
      const back = { 0x5E: 0x80, 0x66: 0x80, 0x6A: 0x80, 0x5F: 0x81, 0x67: 0x81, 0x6B: 0x81,
        0x60: 0, 0x68: 0, 0x6C: 0, 0x61: 1, 0x69: 1, 0x6D: 1 }[t];
      if (back === undefined) return;
      add16(0x02, -back);
      const s = rd(at(0x02, y));
      if (s >= 0x66 && s < 0x6A) return P.chest_holds_jewels();
      if (s >= 0x6A && s < 0x6E) return P.chest_explodes();
      P.open_closed_chest();
    };
    P.open_closed_chest = function () {                              // $5598
      if ((next_random().a & 255) < 0xC0) {
        say(0x89, 0x58);                                             // EMPTY!
        return P.open_the_chest();
      }
      chestTiles((next_random().a & 255) >= 0x80 ? 0x66 : 0x6A);     // jewels, or explosives
    };
    // j_55BD: the chest's four tiles from x, the bottom row first
    const chestTiles = (x) => {
      wr(at(0x02, 0x80), x); wr(at(0x02, 0x81), x + 1);
      wr(at(0x02, 0x00), x + 2); wr(at(0x02, 0x01), x + 3);
    };
    P.open_the_chest = function () { chestTiles(0x62); };           // $55BB
    P.chest_explodes = function () {                                 // $55D5
      say(0x90, 0x58);                                               // FOOL!....EXPLOSIVES.
      M[0x02D3] = 1; M[0x02C9] = 1;
      M[0x02D5] = 7;
      P.open_the_chest();
    };
    P.chest_holds_jewels = function () {                             // $55F0
      say(0x86, 0x56);                                               // YOU HAVE SHOT
      say(0xA5, 0x58);                                               // SOME JEWELS.
      P.open_the_chest();
    };
  }
  if (typeof module !== 'undefined') module.exports = install;
  else root.EN_GROUPS = (root.EN_GROUPS || []).concat([install]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
