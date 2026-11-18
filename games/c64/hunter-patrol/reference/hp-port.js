/* hp-port.js */
// Hunter Patrol, ported routine by routine from the game's engine ($1170-$2FD8, with the cracker's
// $0C55, $0D14 and the engine's own routines at $0F00-$0FBD), for the Play tab and for test_play.js,
// which runs it beside the game's own code in the kit's lockstep (kit/c64/lockstep.js). Each function
// is the routine at the listing label it is named after, and keeps every variable where the game keeps
// it: the zero page from $02, the object records at $80C0-$88FF, the band images at $8060 and $8090,
// the screens at $4000 and $4400. The stack page is the processor's and is not kept.
//
// HunterPort.create(M, io, opts) gives P. M is the game's 64 KB; io the chips: read(a) and write(a, v)
// at the chips' addresses ($D000-$DFFF), and irqByte(a), the lockstep's (on the page, a => M[a]).
// opts.CPU is the kit's 6502 (cpu6502.js's CPU, C64Cpu.CPU on the page), on which the title's music
// runs: Rob Hubbard's driver ($A000-$AE3F) is the game's own player, run as the Music tab runs it
// (kit/skills/c64/steps, "sound"). opts.saveScores(table), when given, keeps the highscore table
// where the cracker's saver would have written it to disk.
//
// P.program() is the whole program from start_game ($1450) as a generator. It yields { cp: a } where
// the game's program counter reaches a, at each call the main loops make and at the reads of the
// raster and the timers; { cycles: n, at: a } after the game's delay loops; and a bare yield at each
// turn of a polling loop (the stick, the raster). P.irqs holds the two interrupt handlers by the
// address $0314 points at: game_irq ($13AB) and the music's ($AE03). P.cheats, set by the page, are
// read where the routine they change runs; with every cheat off the port is the game.
globalThis.HunterPort = (function () {
  'use strict';
  const CHECKPOINTS = [
    0x1456, 0x145D, 0x1460, 0x1463,
    0x1466, 0x146A, 0x1471, 0x1478, 0x147B, 0x147E, 0x1481, 0x1488, 0x148B, 0x1492, 0x1495, 0x1498,
    0x149B, 0x149E, 0x14A1, 0x14A9,
    0x193C, 0x1928, 0x192D, 0x1932, 0x26DA, 0x26E4, 0x2BA5, 0x12EB, 0x1310, 0x24D9, 0x11B1, 0x11C2, 0x1349, 0x135F, 0x2B83, 0x2B8A, 0x2B9B, 0x2E80, 0x2E87, 0x2E98,
    0x2A58, 0x2A5B, 0x2A5E, 0x2A65, 0x2A68, 0x2A6B, 0x2A6E, 0x2A75, 0x2A78, 0x2A7B, 0x2A82, 0x2A85,
    0x2A88, 0x2A8B, 0x2A8E, 0x2A91, 0x2AA7,
  ];
  // the delay loops' cycles, counted from their code
  // $1304-$130B: INC pass_count/BNE until it wraps to 0, 63 times; the first round starts from where
  // pass_count stands
  const nameDelay = (v) => 2 + ((v ? 256 - v : 256) + 62 * 256) * 8 - 63 + 63 * 5 - 1;
  const LIFE_DELAY = 2 + 255 * (2 + 255 * 5 - 1 + 2 + 3) - 1;   // $24CF-$24D7: DEY/BNE 255 x 255

  const GEN = Object.getPrototypeOf(function* () {});
  class Restart extends Error {}                                 // the cracker's saver jumps to start_game

  function create(M, io, opts = {}) {
    const P = { M, io, cheats: {}, cpuPort: 0x36, I: 0 };
    const rd = (a) => P.io.read(a) & 255, wr = (a, v) => P.io.write(a, v & 255);
    const w16 = (z) => M[z] | M[z + 1] << 8;
    const at = (z, y) => (w16(z) + y) & 0xFFFF;                  // (z),y
    const R = (y) => M[at(0x2E, y)], RW = (y, v) => { M[at(0x2E, y)] = v & 255; };   // (rec_ptr),y
    const S = (y) => M[at(0x26, y)], SW = (y, v) => { M[at(0x26, y)] = v & 255; };   // (src_ptr),y
    const cp = (a) => ({ cp: a });
    const irqb = (a) => (P.io.irqByte ? P.io.irqByte(a) : M[a]) & 255;   // a byte an interrupt writes

    // ---- the music: the game's own driver on the kit's 6502, over M and the port's chips
    let cpu = null;
    function driver() {
      if (!cpu) {
        cpu = new opts.CPU(M, { port: { dir: 0x2F, data: 0x36 }, io: { read: (a) => rd(a), write: (a, v) => wr(a, v) } });
      }
      return cpu;
    }
    function music_start() {                                     // $ADD0, through $A000
      M[0x0314] = 0x03; M[0x0315] = 0xAE;
      wr(0xDC0E, 0); wr(0xD01A, 0); wr(0xDC04, 0); wr(0xDC05, 0x48);
      wr(0xDC0D, 0x7F); wr(0xDC0D, 0x81); wr(0xDC0E, 1);
      const c = driver(); c.sp = 0xFF; c.call(0xAE1E, {}, { maxSteps: 100000 });   // music_reset
    }
    function music_irq() {                                       // $AE03: a tick, then the KERNAL's $EA7E
      const c = driver(); c.sp = 0xFF; c.call(0xA006, {}, { maxSteps: 100000 });
      rd(0xDC0D);
    }

    // ---- the interrupt of play: the three bands and the collision latches
    function game_irq() {                                        // $13AB
      if (rd(0xD019) & 1) {
        rd(0xD01E);
        const band = M[0x20];
        let next;
        if (band === 0) {
          wr(0xD021, M[0x8081]);
          for (let x = 0; x < 0x2F; x++) wr(0xD000 + x, M[0x8060 + x]);
          for (let x = 7; x >= 0; x--) M[0x47F8 + x] = M[0x8520 + x];
          next = 1;
        } else if (band === 1) {
          wr(0xD021, M[0x80B1]);
          for (let x = 8; x < 0x2F; x++) wr(0xD000 + x, M[0x8090 + x]);
          for (let x = 7; x >= 0; x--) M[0x47F8 + x] = M[0x8528 + x];
          next = 2;
        } else {
          wr(0xD021, 0x0B); wr(0xD011, 0x1B); wr(0xD012, 0xFB); wr(0xD016, 0x18);
          next = 0;
        }
        M[0x20] = next;
        wr(0xD019, 1);
      }
      if (rd(0xD019) & 4) {
        let done = false;
        if (M[0x20] === 1) {
          if (M[0x3D]) done = true;
          else { const v = rd(0xD01E); M[0x3D] = v; if (v) done = true; }
        }
        if (!done && !M[0x3E]) M[0x3E] = rd(0xD01E);
        wr(0xD019, 4);
      }
    }

    // ---- start and title
    function init_noise() {                                      // $1900
      wr(0xDC0E, 1); wr(0xD40F, 0x80); wr(0xD412, 0x80);
      P.cpuPort &= 0xFE; M[0x01] = M[0x01];                      // $01: BASIC out
    }
    function init_video() {                                      // $1170
      wr(0xDD02, rd(0xDD02) | 3);
      wr(0xDD00, (rd(0xDD00) & 0xFC) | 2);
      for (let x = 0x50; x >= 0; x--) M[0x02 + x] = 0;
      reload_video();
    }
    function reload_video() {                                    // $118B
      for (let x = 0x2E; x >= 0; x--) { const v = M[0x8030 + x]; if (v !== 0xFF) wr(0xD000 + x, v); }
      show_score_row();
    }
    function show_score_row() {                                  // $2EE0
      for (let x = 4; x >= 0; x--) { M[0x4023 + x] = M[0x13 + x]; wr(0xD823 + x, 1); }
      M[0x401B] = M[0x44]; wr(0xD81B, 1);
    }
    function start_music() { wr(0xD417, 0); music_start(); }     // $14F0
    function colour_title() {                                    // $0F90
      let x = 0;
      do {
        wr(0xD800 + x, M[0x8100 + M[0x4000 + x]]);
        wr(0xD900 + x, M[0x8100 + M[0x4100 + x]]);
        wr(0xDA00 + x, M[0x8100 + M[0x4200 + x]]);
        wr(0xDB00 + x, M[0x8100 + M[0x4300 + x]]);
        x = (x - 1) & 255;
      } while (x !== 0);
      colour_title_rows();
    }
    function colour_title_rows() {                               // $11D0
      for (let x = 0xB4; x > 0; x--) { wr(0xD917 + x, 4); wr(0xD9CB + x, 4); }
      for (let x = 0x28; x > 0; x--) wr(0xDB47 + x, 4);
      for (let x = 0x28; x > 0; x--) wr(0xDBBF, 0x0F);
      for (let x = 0x50; x > 0; x--) wr(0xDAA7 + x, 0);
      for (let x = 0x27; x >= 0; x--) wr(0xD800 + x, M[0x8100 + M[0x4000 + x]]);
    }
    // $1210: the row the score takes in the table, 1 (bottom) to 5 (top), or 0; the table's rows
    // are 5 digits at $4122 + $50 n
    function insert_score() {
      let x = 4;
      while (x >= 0 && M[0x13 + x] === 0) x--;
      if (x < 0) return 0;
      M[0x18] = 0x22; M[0x19] = 0x41;
      for (x = 5; ; ) {
        let y = 0, higher = true;
        for (; y < 5; y++) {
          const s = M[0x13 + y], t = M[at(0x18, y)];
          if (s !== t) { higher = s > t; break; }
        }
        if (higher) { insert_row(x); return x; }
        if (--x === 0) return 0;
        const lo = M[0x18] + 0x50;
        M[0x18] = lo & 255; if (lo > 255) M[0x19] = (M[0x19] + 1) & 255;
      }
    }
    function insert_row(y0) {                                    // $1256
      let y = y0 - 1;
      const rows = [0x4122, 0x4172, 0x41C2, 0x4212, 0x4262];
      for (let k = 3; y > 0 && k >= 0; k--, y--) {
        for (let x = 0x16; x >= 0; x--) M[rows[k + 1] + x] = M[rows[k] + x];
      }
      for (let i = 0x14; i >= 0; i--) M[at(0x18, i)] = i < 5 ? M[0x13 + i] : 0x20;
      let hi = (M[0x19] + 0x97) & 255;
      const lo = M[0x18] + 0xFC;
      M[0x1B] = hi; M[0x1A] = lo & 255;
      if (lo > 255) M[0x1B] = (hi + 1) & 255;
      for (let i = 0x20; i >= 0; i--) wr(0xD800 + ((at(0x1A, i) - 0xD800) & 0xFFFF), 1);
    }
    function* title_screen() {                                   // $11A0
      wr(0xD018, 2);
      colour_title();
      if (insert_score()) yield* enter_name();
      // the waits for the fire button name the head of each loop of the game's at every turn, so
      // that the game and the port read the button at the same turns
      for (;;) {
        yield cp(0x11B1);
        for (let x = 0x12; x >= 0; x--) wr(0xDADA + x, 3);
        if (rd(0xDC01) & 0x10) break;
      }
      for (;;) { yield cp(0x11C2); if (!(rd(0xDC01) & 0x10)) break; }
    }
    function* enter_name() {                                     // $12D0
      M[0x18] = (M[0x18] + 9) & 255;
      for (let x = 0x27; x >= 0; x--) wr(0xDAA8 + x, 7);
      M[0x1C] = 0xFF; M[0x1D] = 0;
      let x = 0x1B;
      for (;;) {                                                 // b_12EB
        yield cp(0x12EB);
        if (x !== M[0x1C]) {
          wr(0xDB4D + M[0x1C], 4);
          M[0x1C] = x;
          wr(0xDB4D + x, 1);
        }
        { const c = nameDelay(M[0x1E]); M[0x1E] = 0; yield { cycles: c + 4, at: 0x1310 }; }
        const s = rd(0xDC01);
        M[0x1F] = s;
        if (!(s & 0x10)) {                                       // fire: the letter, or END
          if (x === 0x1B) break;
          M[at(0x18, M[0x1D])] = (x + 0x80) & 255;
          M[0x1D] = (M[0x1D] + 1) & 255;
          if (M[0x1D] >= 0x0C) break;
          for (;;) { yield cp(0x1349); if (rd(0xDC01) & 0x10) break; }
          continue;
        }
        if (!(s & 0x04)) { x--; if (x < 0) x = 0x1B; continue; }
        if (!(s & 0x08)) { x++; if (x >= 0x1C) x = 0; continue; }
      }
      for (let i = 0x27; i >= 0; i--) wr(0xDAA8 + i, 0);
      for (;;) {
        yield cp(0x135F);
        wr(0xDB4D + M[0x1C], 4);
        if (rd(0xDC01) & 0x10) break;
      }
      save_highscores();
    }
    // $0C55, the cracker's: copies the table to $0C00, saves it to disk through the KERNAL and
    // starts the game again. The KERNAL's own work (IOINIT, the save) is not the game's; the port
    // does what the routine itself does, and the page keeps the table (opts.saveScores).
    function save_highscores() {
      P.I = 1;
      M[0x0314] = 0x31; M[0x0315] = 0xEA;
      wr(0xD01A, 0xF0); wr(0xDC0D, 0); wr(0xD011, 0x0B);
      P.cpuPort = 0x37;
      ioinit();
      P.I = 0;
      M[0x9D] = 0; M[0x02A1] = 0;
      for (let x = 0; x < 0x1F; x++) wr(0xD400 + x, 0);
      for (let x = 4; x >= 0; x--) {
        M[0x0C00 + x] = M[0x4122 + x]; M[0x0C05 + x] = M[0x4172 + x]; M[0x0C0A + x] = M[0x41C2 + x];
        M[0x0C0F + x] = M[0x4212 + x]; M[0x0C14 + x] = M[0x4262 + x];
      }
      for (let x = 0x0B; x >= 0; x--) {
        M[0x0C19 + x] = M[0x412B + x]; M[0x0C25 + x] = M[0x417B + x]; M[0x0C31 + x] = M[0x41CB + x];
        M[0x0C3D + x] = M[0x421B + x]; M[0x0C49 + x] = M[0x426B + x];
      }
      M[0xFB] = 0x00; M[0xFC] = 0x0C;
      if (opts.saveScores) opts.saveScores(M.slice(0x0C00, 0x0C55));
      throw new Restart();
    }
    // the KERNAL's IOINIT, as far as this game depends on it: CIA 1's timer A back at the
    // KERNAL's $4025 with its interrupt, both CIAs' other interrupts off, the SID's volume off
    function ioinit() {
      wr(0xDC0D, 0x7F); wr(0xDD0D, 0x7F);
      wr(0xDC0E, 0x08); wr(0xDD0E, 0x08); wr(0xDC0F, 0x08); wr(0xDD0F, 0x08);
      wr(0xD418, 0);
      wr(0xDC04, 0x25); wr(0xDC05, 0x40); wr(0xDC0D, 0x81); wr(0xDC0E, 0x11);
    }
    P.ioinit = ioinit;
    // the KERNAL's own interrupt, while the cracker's saver runs: acknowledged and left
    function kernal_irq() { rd(0xDC0D); }

    // ---- the new game and its levels
    function* new_game_screen() {                                // $14D0
      for (let x = 0x27; x >= 0; x--) M[0x4518 + x] = M[0x8F00 + x];
      yield* new_game();
    }
    function* new_game() {                                       // $24F0
      for (let x = 5; x >= 0; x--) M[0x13 + x] = 0;
      M[0x40] = 4; M[0x44] = 0; M[0x28] = 0;
      if (P.cheats.level !== undefined) M[0x44] = P.cheats.level;
      for (let x = 0x27; x >= 0; x--) { M[0x44C8 + x] = M[0x8D00 + x]; M[0x44F0 + x] = M[0x8E00 + x]; }
      yield* start_level();
    }
    function* start_level() {                                    // $2516
      for (let y = 0xA0; y > 0; y--) M[0x496F + y] = 0xFF;
      M[0x45] = 0;
      yield* reset_after_life();
      set_hits_needed();
      M[0x41] = 0;
      add_score(0);
      yield* setup_raster_irq();
      show_target_hits();
      M[0x476E] = M[0x44];
    }
    function* reset_after_life() {                               // $2480
      M[0x8071] &= 0xEF;
      M[0x8075] = 0; M[0x80A5] = 0;
      M[0x22] = 0; M[0x37] = 0; M[0x1F] = 0; M[0x3F] = 0; M[0x3D] = 0; M[0x3E] = 0;
      for (let x = 0x3F; x >= 0; x--) { M[0x80C0 + x] = 0; M[0x8530 + x] = 0; }
      for (let x = 0x1F; x >= 0; x--) M[0x8670 + x] = 0;
      M[0x8075] = 9; M[0x80A5] = 9;
      M[0x8061] = 0xA0; M[0x8091] = 0xA0;
      M[0x47E6] = M[0x40];
      wr(0xDBE6, 1);
      yield { cycles: LIFE_DELAY, at: 0x24D9 };
      start_engine_sound();
      wr(0xDC0E, 1);
      M[0x8071] |= 0x10;
    }
    function set_hits_needed() {                                 // $0F60: 5, 10, 20, 20
      let x = M[0x44];
      if (x === 3) x--;
      let a = 5;
      for (x--; x >= 0; x--) a = (a << 1) & 255;
      M[0x42] = a;
    }
    function bar_fill_bits() {                                   // $0F40
      let x = M[0x44];
      if (x === 3) x--;
      let a = M[0x42];
      do { a = (a << 1) & 255; x++; } while (x < 3);
      M[0x2B] = a;
      return a;
    }
    function* setup_raster_irq() {                               // $1370
      P.I = 1;                                                   // SEI: an interrupt waits for the CLI
      wr(0xDC0D, 0x7F); wr(0xDD0D, 0x7F);
      M[0x0314] = 0xAB; M[0x0315] = 0x13;
      wr(0xD019, 5); wr(0xD01A, 5);
      M[0x20] = 0;
      wr(0xD011, rd(0xD011) & 0x7F);
      wr(0xD012, 0xD2);
      while (rd(0xD012) < 0xFB) yield;
      rd(0xD01E); rd(0xD01F);
      P.I = 0;
    }
    function add_score(a) {                                      // $2540: a added to the units
      M[0x17] = (a + M[0x17]) & 255;
      for (let x = 4; x >= 0; x--) {
        while (M[0x13 + x] >= 0x0A) { M[0x12 + x] = (M[0x12 + x] + 1) & 255; M[0x13 + x] -= 0x0A; }
      }
      for (let x = 4; x >= 0; x--) { M[0x4771 + x] = M[0x13 + x]; wr(0xDB71 + x, 1); }
    }
    function show_target_hits() {                                // $2DE1
      let a = M[0x45], x = -1;
      for (;;) { x++; M[0x29] = a; if (a < 0x64) break; a -= 0x64; }
      M[0x47BC] = x & 255;
      a = M[0x29]; x = -1;
      for (;;) { x++; M[0x29] = a; if (a < 0x0A) break; a -= 0x0A; }
      M[0x47BD] = x & 255;
      M[0x47BE] = M[0x29];
      for (let i = 2; i >= 0; i--) wr(0xDB92 + i, 1);
      for (let i = 4; i >= 0; i--) M[0x47C1 + i] = M[0x4122 + i];
    }
    function colour_play() {                                     // $2150
      let x = 0, a = 0;
      do {
        wr(0xD800 + x, M[0x8100 + M[0x4400 + x]]);
        wr(0xD900 + x, M[0x8100 + M[0x4500 + x]]);
        wr(0xDA00 + x, M[0x8100 + M[0x4600 + x]]);
        // the last eight bytes are the sprite pointers, which game_irq writes while this runs
        a = M[0x8100 + (x >= 0xF8 ? irqb(0x4700 + x) : M[0x4700 + x])];
        wr(0xDB00 + x, a);
        x = (x + 1) & 255;
      } while (x !== 0);
      return a;                                                  // A, as the trainer's return finds it
    }
    function start_engine_sound() {                              // $2580
      wr(0xD418, 0);
      for (let x = 0x18; x >= 0; x--) wr(0xD400 + x, M[0x8850 + x]);
      wr(0xD404, 0x15);
    }

    // ---- input
    function read_joystick() { return rd(0xDC01); }              // $0D14, the cracker's
    function* read_inputs() {                                    // $1920
      M[0x33] = P.io.read(0xD41B) & 255;
      yield cp(0x1928); M[0x35] = rd(0xDC04);
      yield cp(0x192D); M[0x34] = rd(0xDC05);
      yield cp(0x1932); M[0x36] = rd(0xD012);
      M[0x1F] = yield* trainer_or_stick();
    }
    // $1934 calls $0D14, the stick; the cracker's level-skip trainer changes the call to $0D03,
    // which the page offers as a cheat: every 8th pass, unless the plane is crashing, the key that
    // holds $DC01 at $DF jumps into the end of the strafing runs ($2AA7) with the level passed, whose
    // RTS comes back here with the last colour colour_play wrote in A
    function* trainer_or_stick() {
      if (P.cheats.skip && !M[0x3F] && !(M[0x1E] & 7) && rd(0xDC01) === 0xDF) {
        M[0x45] = 0x40;
        yield cp(0x2AA7); yield* run_result();
        return colour_play();
      }
      return read_joystick();
    }
    class SkipLevel extends Error {}
    function* steer_plane() {                                    // $193C
      yield cp(0x193C);
      if (M[0x3F] || (M[0x1E] & 7)) return;
      const s = M[0x1F];
      if (!(s & 0x08)) { if (M[0x22] !== 0x02) M[0x22] = (M[0x22] + 1) & 255; }
      else if (!(s & 0x04)) { if (M[0x22] !== 0xFE) M[0x22] = (M[0x22] - 1) & 255; }
      if (!(s & 0x02)) { if (M[0x37] !== 0x01) M[0x37] = (M[0x37] + 1) & 255; }
      else if (!(s & 0x01)) { if (M[0x37] !== 0xFF) M[0x37] = (M[0x37] - 1) & 255; }
      if (!(s & 0x10)) fire_shot();
    }
    function move_plane() {                                      // $1990
      if (M[0x3F]) return;
      M[0x8520] = M[0x8528] = (M[0x22] + 0x42) & 255;
      if (!(M[0x1E] & 1) && M[0x37]) {
        if (!(M[0x37] & 0x80)) {
          if (M[0x8061] >= 0x52) { M[0x8061]--; M[0x8091] = (M[0x8091] - 1) & 255; }
        } else {
          if (M[0x8061] >= 0xA0) return;
          M[0x8061]++; M[0x8091] = (M[0x8091] + 1) & 255;
        }
      }
      plane_shadow();
    }
    function plane_shadow() {                                    // $22B0
      let y = ((0xA0 - M[0x8061]) & 255) >> 4, a = 0;
      for (y--; y >= 0; y--) a += 5;
      M[0x852B] = (a + 0x87 + M[0x22]) & 255;
    }
    function set_fine_scroll(a) { a |= 0x10; M[0x8076] = a; M[0x80A6] = a; }   // $14C0

    // ---- record pointers
    const pointTo = (name, z, base, n, step) => { P.ticks[name] = (P.ticks[name] || 0) + 1; const v = base + step * n; M[z] = v & 255; M[z + 1] = (v >> 8) & 255; };
    const point_ground = () => pointTo('point_ground', 0x2E, 0x80C0, M[0x30], 16);         // $1630
    const point_ground_template = () => pointTo('point_ground_template', 0x26, 0x8400, M[0x31], 16); // $1650
    const point_aircraft = () => pointTo('point_aircraft', 0x2E, 0x8530, M[0x30], 16);       // $19D0
    const point_aircraft_template = () => pointTo('point_aircraft_template', 0x26, 0x8570, M[0x38], 16);   // $19F0
    const point_shot = () => pointTo('point_shot', 0x2E, 0x8670, M[0x30], 16);           // $1E00
    const point_shot_template = () => pointTo('point_shot_template', 0x26, 0x86A0, M[0x38], 16);  // $1E20
    const point_stripe = () => pointTo('point_stripe', 0x2E, 0x87A0, M[0x30], 3);          // $2130
    const point_flak = () => pointTo('point_flak', 0x2E, 0x8880, M[0x30], 16);           // $2640
    const point_flak_template = () => pointTo('point_flak_template', 0x26, 0x88A0, M[0x38], 16);  // $2660
    const point_stripe_template = () => pointTo('point_stripe_template', 0x26, 0x8A00, M[0x31], 16);   // $28A0

    // ---- moving a record with the scroll, and left and right
    function move_by_scroll() {                                  // $2220
      M[0x2A] = 0;
      const sp = M[0x22];
      if (!sp) return;
      if (sp !== 2 && sp !== 0xFE && (M[0x21] & 1)) return;
      const r7 = R(7);
      if (!(r7 & 0x80)) { if (r7 & M[0x1E]) return; M[0x29] = 1; }
      else M[0x29] = r7 & 0x7F;
      if (!(sp & 0x80)) move_left(); else move_right();
      M[0x2A] = (M[0x2A] + 1) & 255;
    }
    function move_left() {                                       // $225C
      const v = R(1) - M[0x29];
      RW(1, v);
      if (v >= 0) return;
      const h = R(3) ^ 1;
      RW(3, h);
      if (h) return;
      RW(1, R(1) - 8);
    }
    function move_right() {                                      // $227B
      const v = R(1) + M[0x29];
      RW(1, v);
      if (v <= 255) {
        if (!R(3)) return;
        if (R(1) < 0xF8) return;
        RW(1, R(1) + 8);
      }
      RW(3, R(3) ^ 1);
    }

    // ---- the ground objects
    function* spawn_ground() {                                   // $1670
      M[0x30] = 3;
      let free = false;
      for (;;) {
        point_ground();
        if (R(0) === 0) { free = true; break; }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) break;
      }
      if (free && !(R(15) & 0x80) && !(M[0x33] & 0x7F)) {
        RW(0, 1);
        RW(1, (M[0x36] & 0x7F) + 0x61);
        RW(2, 0x73); RW(3, 0);
        RW(6, 0);
        RW(15, M[0x41]);
      }
      yield* advance_ground();
    }
    function* advance_ground() {                                 // $16BC
      M[0x30] = 3;
      do {
        point_ground();
        M[0x31] = R(6);
        point_ground_template();
        if (S(0) === R(0)) {
          const v = R(1) - S(1);
          RW(1, v);
          if (v < 0) {
            const h = R(3) ^ 1;
            RW(3, h);
            if (!h && R(1) >= 0xF8) { M[0x29] = (0xFF - R(1)) & 255; RW(1, 0xF7 - M[0x29]); }
          }
          for (let y = 4; y < 0x0A; y++) RW(y, S(y));
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      yield* move_ground();
      free_ground();
    }
    function* move_ground() {                                    // $1720
      M[0x32] = 0;
      if (!(M[0x1E] & 7)) yield* scroll_ground();
      M[0x30] = 3;
      do {
        point_ground();
        if (R(0)) {
          move_by_scroll();
          if (M[0x2A]) M[0x32]++;
          const r8 = R(8);
          let go = true;
          if (!(r8 & 0x80)) { if (r8 & M[0x1E]) go = false; else M[0x29] = 1; }
          else M[0x29] = r8 & 0x7F;
          if (go) {
            M[0x32]++;
            RW(2, R(2) + M[0x29]);
            RW(0, R(0) + M[0x29]);
          }
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      M[0x32] &= 255;
    }
    function free_ground() {                                     // $1780
      M[0x30] = 3;
      do {
        point_ground();
        if (R(0) >= 0x58) RW(0, 0);
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
    }
    function* scroll_ground() {                                  // $1500
      M[0x21] = (M[0x21] + 1) & 255;
      const sp = M[0x22];
      if (!sp) return;
      if (sp !== 2 && sp !== 0xFE && (M[0x21] & 1)) return;
      if (!(sp & 0x80)) {
        if (M[0x23]) { M[0x23]--; return; }
        while (rd(0xD012) < 0x60) yield;
        scroll_left();
        M[0x23] = 7;
      } else {
        if (M[0x23] !== 7) { M[0x23]++; return; }
        while (rd(0xD012) < 0x60) yield;
        scroll_right();
        M[0x23] = 0;
      }
    }
    function point_hill_rows() {                                 // $1550
      M[0x18] = 0xC8; M[0x24] = 0xC8; M[0x19] = 0x44; M[0x25] = 0xD8;
      M[0x2D] = 3; M[0x26] = 0; M[0x27] = 0x8D;
    }
    function next_hill_row() {                                   // $15A0
      const v = M[0x18] + 0x28;
      M[0x18] = M[0x24] = v & 255;
      if (v > 255) { M[0x19] = (M[0x19] + 1) & 255; M[0x25] = (M[0x25] + 1) & 255; }
    }
    const colAt = (y) => at(0x24, y);
    function scroll_left() {                                     // $15C0
      point_hill_rows();
      M[0x28] = (M[0x28] + 1) & 255;
      for (;;) {
        let y = 1;
        do {
          const ch = M[at(0x18, y)], co = rd(colAt(y));
          wr(colAt(y - 1), co);
          M[at(0x18, y - 1)] = ch;
          y += 2 - 1;
        } while (y < 0x28);
        hill_column_right(y - 1);
        if (--M[0x2D] === 0) return;
        next_hill_row();
      }
    }
    function scroll_right() {                                    // $1600
      point_hill_rows();
      M[0x28] = (M[0x28] - 1) & 255;
      for (;;) {
        let y = 0x26;
        do {
          const ch = M[at(0x18, y)], co = rd(colAt(y));
          wr(colAt(y + 1), co);
          M[at(0x18, y + 1)] = ch;
          y--;
        } while (y >= 0);
        hill_column_left(0);
        if (--M[0x2D] === 0) return;
        next_hill_row();
      }
    }
    function hill_column_right(y) {                             // $2F80
      let a = M[0x28];
      if (a >= 0x28) { a = 0; M[0x28] = 0; }
      M[0x29] = a;
      const ch = S(M[0x29]);
      M[at(0x18, y)] = ch;
      wr(colAt(y), M[0x8100 + ch]);
      M[0x27] = (M[0x27] + 1) & 255;
    }
    function hill_column_left(y) {                               // $2FB0
      let a = M[0x28];
      if (a === 0xFF) { a = 0x27; M[0x28] = 0x27; }
      M[0x29] = a;
      if (y) M[0x29] = (M[0x29] + 0x27) & 255;
      const ch = S(M[0x29]);
      M[at(0x18, y)] = ch;
      wr(colAt(y), M[0x8100 + ch]);
      M[0x27] = (M[0x27] + 1) & 255;
    }

    // ---- placing the objects in the band images: the sorts
    function* place_ground() { yield* resolve_hits(); sort_ground(); }      // $17A0
    function sort_ground() {                                     // $17A3
      if (M[0x41] & 0x80) return;
      sortRecords(0x8500, 0x00, 'ground');
      sortGroundSlots();
    }
    // the three sorts share their shape: a list of (record, y) pairs at list, by y, then a sprite
    // slot for each pair; what each slot sets differs
    function sortRecords(list, fill, kind) {
      for (let x = 0x0F; x >= 0; x--) M[list + x] = fill;
      const first = kind === 'shot' ? 0 : 3;
      M[0x30] = first;
      do {
        (kind === 'ground' ? point_ground : kind === 'air' ? point_aircraft : point_shot)();
        if (R(0)) {
          M[0x29] = R(2);
          let x = 1, ins = false;
          for (; x < 7; x += 2) {
            const v = M[list + x];
            if (kind === 'air' ? v >= M[0x29] : v < M[0x29]) { ins = true; break; }
          }
          if (ins) {
            M[0x2A] = x;
            let k = 9;
            do { M[list + k] = M[list - 2 + k]; k--; } while (k !== M[0x2A]);
            x = k;
          }
          M[list + x] = M[0x29];
          x--;
          M[list + x] = M[0x30];
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
    }
    function sortGroundSlots() {
      let x = 0;
      for (;;) {                                                 // j_17F8
        M[0x29] = x;
        const slot = x >> 1;
        M[0x2B] = slot;
        M[0x2A] = (0x10 << slot) & 255;
        const mask = M[0x2A];
        x = M[0x29];
        if (M[0x8501 + x]) {
          M[0x30] = M[0x8500 + x];
          point_ground();
          x = M[0x29];
          M[0x8098 + x] = R(1);
          M[0x8099 + x] = R(2);
          M[0x80A0] = R(3) ? (M[0x80A0] | mask) : (~mask & M[0x80A0]) & 255;
          M[0x80A5] |= mask;
          M[0x80A7] = R(4) ? (M[0x80A7] | mask) : (~mask & M[0x80A7]) & 255;
          M[0x80AD] = R(5) ? (M[0x80AD] | mask) : (~mask & M[0x80AD]) & 255;
          let pic;
          const r15 = R(15);
          if (!(r15 & 0x40)) {
            let k = r15 & 3, a = 0;
            for (k--; k >= 0; k--) a += 10;
            pic = (a + R(9)) & 255;
            if (pic === 0) pic = hitPicture(R(9), 0x5D, 0xC0);   // BNE falls through on a zero sum
          } else pic = hitPicture(R(9), 0x5D, 0xC0);
          M[0x852C + M[0x2B]] = pic;
        } else {
          M[0x80A5] = (~mask & M[0x80A5]) & 255;
        }
        x = M[0x29] + 2;
        if (x >= 7) return;
      }
    }
    // $189D/$1CE4: a hit object's picture, base + 2 (picture - first), and the next every 4 passes
    function hitPicture(pic, first, base) {
      let k = (pic - first) & 255, a = 0;
      if (k & 0x80) k -= 256;
      for (k--; k >= 0; k--) a = (a + 2) & 255;
      M[0x2C] = (a + base) & 255;
      return (((M[0x1E] >> 2) & 1) + M[0x2C]) & 255;
    }

    function* place_aircraft() { yield* resolve_hits(); sort_aircraft(); }  // $1BFD
    function sort_aircraft() {                                   // $1C00
      sortRecords(0x8508, 0xFF, 'air');
      let x = 0;
      for (;;) {                                                 // j_1C4E
        M[0x29] = x;
        const slot = x >> 1;
        M[0x2B] = slot;
        M[0x2A] = (0x10 << slot) & 255;
        const mask = M[0x2A];
        x = M[0x29];
        if (!(M[0x8509 + x] & 0x80)) {
          M[0x30] = M[0x8508 + x];
          point_aircraft();
          x = M[0x29];
          M[0x8068 + x] = R(1);
          M[0x8069 + x] = R(2);
          M[0x8070] = R(3) ? (M[0x8070] | mask) : (~mask & M[0x8070]) & 255;
          M[0x8075] |= mask;
          M[0x8077] = R(4) ? (M[0x8077] | mask) : (~mask & M[0x8077]) & 255;
          M[0x807D] = R(5) ? (M[0x807D] | mask) : (~mask & M[0x807D]) & 255;
          let pic;
          if (R(15) & 0x40) {
            M[0x807C] |= mask;
            pic = hitPicture(R(9), 0x4D, 0xA2);
            if (pic === 0) pic = aircraftPicture();             // BNE falls through on a zero sum
          } else pic = aircraftPicture();
          M[0x8524 + M[0x2B]] = pic;
        } else {
          M[0x8075] = (~mask & M[0x8075]) & 255;
        }
        x = M[0x29] + 2;
        if (x >= 7) return;
      }
      function aircraftPicture() {                               // $1D07: heading left adds 10
        M[0x807C] = (~M[0x2A] & M[0x807C]) & 255;
        return ((R(10) & 0x10 ? 0 : 0x0A) + R(9)) & 255;
      }
    }

    function* place_shot() { yield* resolve_hits(); sort_shot(); }          // $1F8D
    function sort_shot() {                                       // $1F90
      for (let x = 0x0F; x >= 0; x--) M[0x8510 + x] = 0;
      M[0x30] = 0;
      do {
        point_shot();
        if (R(0)) {
          M[0x29] = R(2);
          let x = 1, ins = false;
          for (; x < 7; x += 2) if (M[0x8510 + x] < M[0x29]) { ins = true; break; }
          if (ins) {
            M[0x2A] = x;
            let k = 9;
            do { M[0x8510 + k] = M[0x850E + k]; k--; } while (k !== M[0x2A]);
            x = k;
          }
          M[0x8510 + x] = M[0x29];
          x--;
          M[0x8510 + x] = M[0x30];
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      // one slot: the shot, sprite 1, in both bands
      M[0x29] = 0; M[0x2B] = 0; M[0x2A] = 0x02;
      const mask = 0x02;
      if (M[0x8511]) {
        M[0x30] = M[0x8510];
        point_shot();
        M[0x8062] = M[0x8092] = R(1);
        M[0x8063] = M[0x8093] = R(2);
        M[0x8070] = R(3) ? (M[0x8070] | mask) : (~mask & M[0x8070]) & 255;
        M[0x8075] |= mask;
        M[0x8521] = M[0x8529] = R(9);                            // $2035 always branches to $207C
      } else {
        M[0x8075] = (~mask & M[0x8075]) & 255;
      }
      M[0x29] = 2 - 2;                                           // $2098: X back to 0, then 2
      let t = M[0x80A5] & 0xF1; M[0x80A5] = (M[0x8075] & 0x0E) | t;
      t = M[0x80A0] & 0xF1; M[0x80A0] = (M[0x8070] & 0x0E) | t;
      t = M[0x80A7] & 0xF1; M[0x80A7] = (M[0x8077] & 0x0E) | t;
      t = M[0x80AD] & 0xF1; M[0x80AD] = (M[0x807D] & 0x0E) | t;
      M[0x29] = t;
    }

    // ---- the aircraft
    function spawn_aircraft() {                                  // $1A10
      M[0x30] = 3;
      let free = false;
      for (;;) {
        point_aircraft();
        if (R(0) === 0) { free = true; break; }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) break;
      }
      if (free && M[0x33] === 0) {
        RW(2, 0x3A);                                             // ($34 AND #$00) + $3A
        let pic, hi, x;
        if (!(M[0x1E] & 0x80)) { pic = 0x4A; hi = 1; x = 0x4F; } else { pic = 0x54; hi = 0; x = 0; }
        RW(3, hi); RW(1, x); RW(10, pic);
        RW(0, 0x36); RW(6, 0x0C);
      }
      M[0x30] = 3;
      do {
        point_aircraft();
        M[0x38] = R(6);
        let skip = false;
        if (R(10) & 0x40) {
          const t = (M[0x38] - 2) & 255;
          if (t & 0x80) skip = true; else M[0x38] = t;
        }
        if (!skip) {
          point_aircraft_template();
          if (R(0) === S(0)) {
            const v = R(1) + S(1);
            RW(1, v);
            if (v > 255) {
              const h = R(3) ^ 1;
              RW(3, h);
              if (!h) RW(1, R(1) - 8);
            }
            for (let y = 4; y < 0x0A; y++) RW(y, S(y));
          }
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      move_aircraft();
      free_aircraft();
    }
    function move_aircraft() {                                   // $1AD9
      M[0x39] = 0;
      M[0x30] = 3;
      for (;;) {
        point_aircraft();
        if (R(0)) {
          move_by_scroll();
          if (M[0x2A]) M[0x39] = (M[0x39] + 1) & 255;
          let down = true;
          if (R(15) & 0x40) M[0x39] = (M[0x39] + 1) & 255;      // a falling aircraft only sinks
          else {
            const sp = M[0x22];
            M[0x3A] = R(10) & 0x1E;
            let test8 = true;
            if (M[0x3A] & 0x10) {
              M[0x22] = 0xFF; move_by_scroll();
              if (M[0x2A]) M[0x39] = (M[0x39] + 1) & 255; else test8 = false;   // $1B1B skips the $08 test
            }
            if (test8 && (M[0x3A] & 0x08)) {
              M[0x22] = 1; move_by_scroll();
              if (M[0x2A]) M[0x39] = (M[0x39] + 1) & 255;
            }
            M[0x22] = sp;
            if (!(R(8) & M[0x1E])) {
              if (M[0x3A] & 0x04) { aircraft_down(); M[0x39] = (M[0x39] + 1) & 255; }
              else if (M[0x3A] & 0x02) { aircraft_up(); M[0x39] = (M[0x39] + 1) & 255; }
            }
            if (!(M[0x33] & 0x1F)) {                             // a turn now and then
              const [a, x] = (M[0x36] & 0x40) ? [4, 2] : [2, 4];
              M[0x29] = x;
              RW(10, (R(10) | a) ^ x);
            }
            down = !(M[0x1E] & 0x0F);
          }
          if (down) RW(0, R(0) - 1);
        }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) break;
      }
    }
    function free_aircraft() {                                   // $1BD0
      M[0x30] = 3;
      do {
        point_aircraft();
        if (R(0) < 1) { RW(0, 0); RW(15, 0); }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
    }
    function aircraft_up() { if (R(2) >= 0x38) RW(2, R(2) - 1); }        // $1B8D
    function aircraft_down() { if (R(2) < 0x50) RW(2, R(2) + 1); }       // $1B9F

    // ---- the shots
    function fire_shot() {                                       // $1E40
      M[0x30] = 0;
      for (;;) {
        point_shot();
        if (R(0) === 0) break;
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) return;
      }
      RW(1, 0xA0); RW(2, M[0x8061] + 4); RW(3, 0);
      RW(6, 0); RW(10, 2);
      M[0x0A] = 1;
      RW(0, 1);
    }
    function move_shots() {                                      // $1E80
      M[0x30] = 0;
      do {
        point_shot();
        M[0x38] = R(6);
        let skip = false;
        if (R(10) & 0x40) { const t = (M[0x38] - 2) & 255; if (t & 0x80) skip = true; else M[0x38] = t; }
        if (!skip) {
          point_shot_template();
          if (S(0) === R(0)) {
            const v = R(1) - S(1);
            RW(1, v);
            if (v < 0) {
              const h = R(3) ^ 1;
              RW(3, h);
              if (!h && R(1) >= 0xF8) { M[0x29] = (0xFF - R(1)) & 255; RW(1, 0xF7 - M[0x29]); }
            }
            for (let y = 4; y < 0x0B; y++) RW(y, S(y));
          }
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      move_shot_records();
      free_shots();
    }
    function move_shot_records() {                               // $1F00
      M[0x3B] = 0;
      M[0x30] = 0;
      do {
        point_shot();
        if (R(0)) {
          move_by_scroll();
          if (M[0x2A]) M[0x3B]++;
          const r8 = R(8);
          let go = true;
          if (!(r8 & 0x80)) { if (r8 & M[0x1E]) go = false; else M[0x29] = 1; }
          else M[0x29] = r8 & 0x7F;
          if (go) {
            RW(0, R(0) + M[0x29]);
            M[0x3C] = R(10) & 0x1E;
            if (M[0x3C] & 0x04) { RW(2, R(2) + M[0x29]); M[0x3B]++; }
            else if (M[0x3C] & 0x02) { RW(2, R(2) - M[0x29]); M[0x3B]++; }
          }
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      M[0x3B] &= 255;
    }
    function free_shots() {                                      // $2100
      M[0x30] = 1;
      do {
        point_shot();
        if (!(R(10) & 0x40) && R(0) >= 0x40) RW(0, 0);
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
    }

    // ---- the hits
    function* resolve_hits() {                                   // $2F00
      if (M[0x41] & 0x80) yield* hits_strafing();
      else yield* hits_play();
    }
    function slotHi(a) { let x = -1; do { x++; } while (!((a >> x) & 1) && x < 8); return ((x - 4) * 2) & 255; }   // $23DB
    function slotLo(a) { let x = -1; do { x++; } while (!((a >> x) & 1) && x < 8); return ((x - 1) * 2) & 255; }   // $23E8
    // The collision latches $3D (sky) and $3E (ground) are ORed in by game_irq as the bands are
    // drawn, so the routines below read them once for each LDA the game makes (irqb), in its order.
    function* hits_play() {                                      // $22D0
      let ls = 0;
      if (irqb(0x3D) & 0x02 && (ls = irqb(0x3D)) & 0xF0) {
        M[0x2A] = M[0x8508 + slotHi(ls & 0xF0)];
        M[0x2B] = M[0x30] = M[0x8510 + slotLo(irqb(0x3D) & 0x02)];
        point_shot();
        M[0x26] = M[0x2E]; M[0x27] = M[0x2F];
        M[0x30] = M[0x2A];
        point_aircraft();
        if (!(R(15) & 0x40)) {
          SW(0, 0);
          RW(15, 0x40); RW(0, 0x20); RW(9, 0x4D); RW(7, 0);
          if (M[0x42]) M[0x42]--;
          add_score(0x32);
          sort_aircraft(); sort_shot(); hit_sound();
        }
      }
      let lg = 0;
      if (irqb(0x3E) & 0x02 && (lg = irqb(0x3E)) & 0xF0) {
        M[0x2A] = M[0x8500 + slotHi(lg & 0xF0)];
        M[0x2B] = M[0x30] = M[0x8510 + slotLo(irqb(0x3E) & 0x02)];
        point_shot();
        M[0x26] = M[0x2E]; M[0x27] = M[0x2F];
        M[0x30] = M[0x2A];
        point_ground();
        if (!(R(15) & 0x40)) {
          SW(0, 0);
          RW(15, 0x40);
          if (M[0x42]) M[0x42]--;
          add_score(0x64);
          sort_ground(); sort_shot(); hit_sound();
        }
      }
      if (M[0x3F]) return;
      // the plane flying into the ground ($05) or into a ground object low enough to meet it
      let crash = (irqb(0x3E) & 0x05) === 0x05;
      if (!crash && irqb(0x3E) & 0x08 && M[0x852B] < 0x8A) {
        const g = irqb(0x3E);
        if (g & 0xF0) {
          M[0x30] = M[0x8500 + slotHi(g & 0xF0)];
          point_ground();
          crash = !(R(15) & 0x40);
        }
      }
      if (crash && !P.cheats.immune) { M[0x3F] = 1; return; }
      yield* hits_sky_crash();
    }
    function* hits_sky_crash() {                                 // $0F00
      if (irqb(0x3D) & 0x01) {
        const s = irqb(0x3D);
        if (s & 0xF0) {
          M[0x30] = M[0x8508 + slotHi(s & 0xF0)];
          point_aircraft();
          if (R(6) >= 0x09 && !(R(15) & 0x40) && !P.cheats.immune) { RW(15, 0x40); M[0x3F] = 1; }
        }
      }
      M[0x3D] = 0; M[0x3E] = 0;
      yield* draw_distance_bar();
    }
    function hit_sound() { wr(0xD412, 0x80); wr(0xD412, 0x81); }        // $23F5
    function* draw_distance_bar() {                              // $29E0
      if (M[0x41] & 0x80) return;
      let a = 0x78;
      for (let x = M[0x41] - 1; x >= 0; x--) a = (a - 0x28) & 255;
      M[0x29] = a;
      a = bar_fill_bits();
      do { M[0x2A] = a; a -= 8; } while (a >= 0);
      M[0x29] = ((M[0x2B] - M[0x2A]) + M[0x29]) & 255;
      let x = (M[0x2A] >> 1) - 1;
      a = 0x55;
      for (; x >= 0; x--) { a = (a >> 1) | 0x80; a = (a >> 1) | 0x80; }
      for (let y = 0, i = M[0x29]; y < 8; y++, i++) M[0x4970 + (i & 255)] = a;
      if (M[0x42]) return;
      set_hits_needed();
      M[0x41] = (M[0x41] + 1) & 255;
      if (M[0x41] >= 4) yield* strafing_runs();
    }

    // ---- the crash
    function* plane_crash() {                                    // $2400
      if (!M[0x3F]) return;
      if (M[0x3F] === 1) {
        for (let x = 0x18; x >= 0; x--) wr(0xD400 + x, M[0x8B00 + x]);
        wr(0xD404, 0x81); wr(0xD40B, 0x81); wr(0xD412, 0x81);
      }
      if (M[0x1E] & 1) return;
      M[0x8520] = ((M[0x3F] >> 4) & 0x0F) + 0x9E;
      set_plane_pictures(M[0x8520]);
      M[0x807C] |= 1; M[0x80AC] |= 1;
      M[0x8087] = 6; M[0x80B7] = 6;
      M[0x3F] = (M[0x3F] + 1) & 255;
      if (M[0x3F] < 0xA0) return;
      if (!P.cheats.lives) M[0x40] = (M[0x40] - 1) & 255;
      yield* reset_after_life();
      M[0x807C] &= 0xFE; M[0x80AC] &= 0xFE;
      M[0x8087] = 6; M[0x80B7] = 6;
    }
    function set_plane_pictures(a) { M[0x8528] = a; M[0x852B] = a; }       // $25C0
    function engine_sound() {                                    // $25A0
      const a = M[0x8061] ^ 0xFF;
      wr(0xD402, a); wr(0xD400, a);
      shot_sound(); shot_sound();
    }
    function shot_sound() {                                      // $2600
      const a = M[0x0A];
      if (!a) return;
      if (a === 0x38) { M[0x0E00] = 0x80; return; }
      if (a > 0x38) return;
      if (a === 1 || !(a & 0x0F)) { wr(0xD40B, 0x88); wr(0xD40B, 0x81); }
      M[0x0A] = (M[0x0A] + 1) & 255;
      if (!M[0x0A]) M[0x0E00] = 0x80;
    }

    // ---- the flak
    function spawn_flak() {                                      // $2680, the reads after its checkpoints
      M[0x30] = 0;
      for (;;) {
        point_flak();
        if (R(0) === 0) break;
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) return false;
      }
      RW(0, 1);
      const v = (P.io.read(0xD41B) & 255) + 0x21;
      RW(1, v);
      RW(2, 0x50); RW(3, v > 255 ? 1 : 0);
      RW(6, 0);
      M[0x09] = 1;
      RW(10, (!R(3) && R(1) < 0xA0) ? 0x12 : 0x0A);
      return true;
    }
    function* move_flak() {                                      // $2700
      if (spawn_flak()) {
        yield cp(0x26DA);
        M[0x29] = ((rd(0xD012) & 0x3F) + 0x10) & 255;
        yield cp(0x26E4);
        RW(11, ((rd(0xDC05) & 0x1F) + M[0x29]) & 255);
      }
      M[0x30] = 0;
      do {
        point_flak();
        let burst = !!(R(11) & 0x80);
        if (!burst) {
          M[0x38] = R(6);
          point_flak_template();
          if (R(0) === S(0)) {
            for (let y = 4; y < 0x0A; y++) RW(y, S(y));
            RW(10, (R(10) & 0x18) | S(10));
          } else if (R(0) >= R(11)) {
            RW(11, 0xFD);
            M[0x09] = 0x80;
            burst = true;
          }
        }
        if (burst && !(M[0x1E] & 0x1F)) {
          RW(9, (R(11) & 3) + 0x45);
          const v = (R(11) + 1) & 255;
          RW(11, v); RW(0, v);
        }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      move_flak_record();
      place_flak();
    }
    function move_flak_record() {                                // $2780
      M[0x30] = 0;
      for (;;) {
        point_flak();
        if (R(0)) {
          move_by_scroll();
          const sp = M[0x22];
          M[0x3A] = R(10) & 0x1E;
          if (M[0x3A] & 0x10) { M[0x22] = 0xFF; move_by_scroll(); }
          else if (M[0x3A] & 0x08) { M[0x22] = 0x01; move_by_scroll(); }
          M[0x22] = sp;
          const r8 = R(8);
          let go = true;
          if (r8 & 0x80) M[0x29] = r8 & 0x7F;
          else if (r8 & M[0x1E]) go = false;
          else M[0x29] = 1;
          if (go) {
            let moved = false;
            if (M[0x3A] & 0x04) { if (R(2) < 0xC2) RW(2, R(2) + M[0x29]); moved = true; }
            else if (M[0x3A] & 0x02) { RW(2, R(2) - M[0x29]); moved = true; }
            if (moved && !(R(0) & 0x80)) RW(0, R(0) + 1);
          }
        }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) return;
      }
    }
    function place_flak() {                                      // $2820
      M[0x30] = 0;
      do {
        point_flak();
        if (R(0)) {
          M[0x8064] = M[0x8094] = R(1);
          M[0x8065] = M[0x8095] = R(2);
          if (R(3)) { M[0x8070] |= 4; M[0x80A0] |= 4; }
          else { M[0x8070] &= 0xFB; M[0x80A0] &= 0xFB; }
          M[0x8522] = M[0x852A] = R(9);
          M[0x8075] |= 4; M[0x80A5] |= 4;
        } else { M[0x8075] &= 0xFB; M[0x80A5] &= 0xFB; }
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
    }

    // ---- the ground's stripes
    function move_stripes() {                                    // $2900
      if (!(M[0x1E] & 0x1F)) {
        M[0x30] = 0x0B;
        do {
          point_stripe();
          if (R(0) < 1) { RW(0, 1); RW(1, 1); RW(2, 0x1F); break; }
          M[0x30] = (M[0x30] - 1) & 255;
        } while (!(M[0x30] & 0x80));
      }
      M[0x30] = 0x0B;
      for (;;) {
        point_stripe();
        if (R(0)) {
          const r2 = R(2);
          let go = true;
          if (r2 & 0x80) M[0x29] = r2 & 0x7F;
          else if (r2 & M[0x1E]) go = false;
          else M[0x29] = 1;
          if (go) stripeStep();
        }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) break;
      }
      M[0x4908] = 0xFF;
    }
    function stripeStep() {                                      // $294B
      M[0x2B] = 0;
      let x = R(0);
      const a = (M[0x30] & 1) ? 0xAA : 0x55;
      M[0x4907 + x] = a;
      M[0x2A] = a;
      for (;;) {
        if (x >= 0x68) { RW(2, 0); RW(1, 0); RW(0, 0); return; }
        x++;
        M[0x4907 + x] = M[0x2A];
        RW(0, x);
        M[0x2B] = (M[0x2B] + 1) & 255;
        if (M[0x2B] === M[0x29]) break;
      }
      M[0x31] = R(1);
      point_stripe_template();
      if (R(0) !== S(0)) return;
      RW(1, S(6));
      RW(2, S(8));
    }

    // ---- the strafing runs
    function* strafing_runs() {                                  // $2A4C
      M[0x41] = 0x80; M[0x45] = 0;
      try {
        for (;;) {
          M[0x43] = M[0x40];
          let again = false;
          for (;;) {                                             // b_2A58
            yield cp(0x2A58); yield* start_run();
            for (;;) {                                           // b_2A5B
              yield cp(0x2A5B); yield* steer_plane();
              yield cp(0x2A5E); yield* place_target();
              M[0x1E] = (M[0x1E] + 1) & 255;
              yield cp(0x2A65); set_fine_scroll(M[0x23]);
              yield cp(0x2A68); yield* read_inputs();
              yield cp(0x2A6B); move_plane();
              yield cp(0x2A6E); spawn_aircraft();
              if (M[0x39]) { yield cp(0x2A75); sort_aircraft(); yield cp(0x2A78); yield* hits_strafing(); }
              yield cp(0x2A7B); move_shots();
              if (M[0x3B]) { yield cp(0x2A82); sort_shot(); yield cp(0x2A85); yield* hits_strafing(); }
              yield cp(0x2A88); move_stripes();
              yield cp(0x2A8B); yield* plane_crash();
              yield cp(0x2A8E); engine_sound();
              yield cp(0x2A91); yield* move_flak();
              if (M[0x40] & 0x80) throw new SkipLevel();
              if (M[0x3F]) continue;
              if (M[0x80C0]) continue;
              break;
            }
            M[0x43] = (M[0x43] - 1) & 255;
            if (M[0x43] & 0x80) break;
          }
          if (!again) break;
        }
      } catch (e) {
        if (!(e instanceof SkipLevel)) throw e;
      }
      yield cp(0x2AA7); yield* run_result();
      colour_play();
    }
    function* start_run() {                                      // $2B00
      M[0x22] = 0; M[0x37] = 0;
      M[0x8061] = 0xA0; M[0x8091] = 0xA0;
      move_plane();
      for (const a of [0x80C0, 0x80D0, 0x80E0, 0x8530, 0x8540, 0x8550, 0x8880, 0x8670, 0x8680]) M[a] = 0;
      M[0x80A5] = 9; M[0x8075] = 9;
      for (let x = 0x20; x >= 0; x--) { M[0x479C + x] = M[0x8B20 + x]; wr(0xDB9C + x, 1); }
      M[0x47B8] = M[0x43];
      M[0x2E] = 0; M[0x2F] = 0x78;
      const x2 = (M[0x44] << 1) & 255;
      M[0x26] = M[0x8B80 + x2]; M[0x27] = M[0x8B81 + x2];
      for (let x = 7; x >= 0; x--) {
        let y = 0;
        do { M[at(0x2E, y)] = M[at(0x26, y)]; y = (y - 1) & 255; } while (y !== 0);
        M[0x27] = (M[0x27] + 1) & 255; M[0x2F] = (M[0x2F] + 1) & 255;
      }
      for (let x = 0x20; x >= 0; x--) { M[0x44A4 + x] = M[0x8B40 + x]; wr(0xD8A4 + x, 1); }
      for (;;) { yield cp(0x2B83); if (rd(0xDC01) & 0x10) break; }
      for (;;) { yield cp(0x2B8A); if (!(rd(0xDC01) & 0x10)) break; }
      for (let x = 0x20; x >= 0; x--) M[0x44A4 + x] = 0x20;
      for (;;) { yield cp(0x2B9B); if (rd(0xDC01) & 0x10) break; }
      yield cp(0x2BA5);
      M[0x29] = ((rd(0xDC04) & 0x7F) + 0x6C) & 255;             // the carry is clear, from the ASL at $2B55
      M[0x30] = 2;
      do {
        point_ground();
        RW(0, 1); RW(1, M[0x29]); RW(2, 0x73); RW(3, 0); RW(6, 0);
        RW(14, 1);
        M[0x29] = (M[0x29] - 0x18) & 255;
        M[0x30] = (M[0x30] - 1) & 255;
      } while (!(M[0x30] & 0x80));
      M[0x3D] = 0; M[0x3E] = 0;
    }
    function* place_target() {                                   // $2C00
      yield* advance_ground();
      M[0x30] = 2;
      for (;;) {
        point_ground();
        const n = M[0x30];
        M[0x29] = (0x10 << n) & 255;
        M[0x2A] = (n << 1) & 255;
        if (R(0)) {
          const x = M[0x2A];
          M[0x8098 + x] = R(1);
          M[0x8099 + x] = R(2);
          M[0x80A0] = R(3) ? (M[0x80A0] | M[0x29]) : (~M[0x29] & M[0x80A0]) & 255;
          if (R(15) & 0x40) {
            RW(15, R(15) & 0xBF);
            M[0x80BC] = 0;
          } else if (!(M[0x1E] & 0x0F)) {
            M[0x80BB + n] = R(14);
          }
          let k = (R(9) - 0x5D) & 255, a = 0;
          if (k & 0x80) k -= 256;
          for (k--; k >= 0; k--) a = (a + 3) & 255;
          M[0x852C + n] = (a + 0xE0 + n) & 255;
          M[0x80A5] |= M[0x29];
        } else {
          M[0x80A5] = (~M[0x29] & M[0x80A5]) & 255;
        }
        M[0x30] = (M[0x30] - 1) & 255;
        if (M[0x30] & 0x80) return;
      }
    }
    function* hits_strafing() {                                  // $2CD0
      let ls = 0, lg = 0;
      if (irqb(0x3D) & 0x06 && (ls = irqb(0x3D)) & 0x70) {
        M[0x2A] = M[0x8508 + slotHi(ls & 0x70)];
        M[0x2B] = M[0x30] = M[0x8510 + slotLo(irqb(0x3D) & 0x06)];
        point_shot();
        M[0x26] = M[0x2E]; M[0x27] = M[0x2F];
        M[0x30] = M[0x2A];
        point_aircraft();
        if (!(R(15) & 0x40)) {
          SW(0, 0); RW(15, 0x40);
          add_score(0x32);
          sort_aircraft(); sort_shot(); target_hit();
        }
      }
      M[0x3D] = 0;
      if (irqb(0x3E) & 0x06 && (lg = irqb(0x3E)) & 0x70) {
        M[0x2A] = M[0x8500 + slotHi(lg & 0x70)];
        M[0x2B] = M[0x30] = M[0x8510 + slotLo(irqb(0x3E) & 0x06)];
        point_shot();
        M[0x26] = M[0x2E]; M[0x27] = M[0x2F];
        M[0x30] = M[0x2A];
        point_ground();
        if (!(R(15) & 0x40)) {
          SW(0, 0); RW(15, 0x40);
          add_score(0x64);
          yield* place_target(); sort_shot(); target_hit();
        }
      }
      if (!M[0x3F]) {
        let crash = (irqb(0x3E) & 0x81) === 0x81;
        if (!crash && irqb(0x3E) & 0x08 && M[0x852B] < 0x8A) {
          const g = irqb(0x3E);
          if (g & 0x70) {
            M[0x30] = M[0x8500 + slotHi(g & 0x70)];
            point_ground();
            crash = !(R(15) & 0x40);
          }
        }
        if (crash && !P.cheats.immune) M[0x3F] = 1;
      }
      M[0x3E] = 0;
    }
    function target_hit() {                                      // $2DD5
      wr(0xD412, 0x80); wr(0xD412, 0x81);
      M[0x45] = (M[0x45] + 1) & 255;
      show_target_hits();
    }
    function* run_result() {                                     // $2E30
      M[0x22] = 0; M[0x37] = 0;
      M[0x8061] = 0xA0; M[0x8091] = 0xA0;
      move_plane();
      const h = M[0x45];
      const x = h >= 0x40 ? 3 : h >= 0x30 ? 2 : h >= 0x10 ? 1 : 0;
      M[0x2E] = M[0x8B90 + 2 * x]; M[0x2F] = M[0x8B91 + 2 * x];
      for (let y = 0x1F; y >= 0; y--) { M[0x479C + y] = M[at(0x2E, y)]; wr(0xDB9C + y, 1); }
      for (let i = 0x20; i >= 0; i--) { M[0x44A4 + i] = M[0x8B40 + i]; wr(0xD8A4 + i, 1); }
      for (;;) { yield cp(0x2E80); if (rd(0xDC01) & 0x10) break; }
      for (;;) { yield cp(0x2E87); if (!(rd(0xDC01) & 0x10)) break; }
      for (let i = 0x20; i >= 0; i--) M[0x44A4 + i] = 0x20;
      for (;;) { yield cp(0x2E98); if (rd(0xDC01) & 0x10) break; }
      if (M[0x45] >= 0x10) {
        if (M[0x40] < 9) M[0x40]++;
        if (M[0x44] >= 3) M[0x44] = 0xFF;
        M[0x44] = (M[0x44] + 1) & 255;
      }
      M[0x476E] = M[0x44];
      wr(0xDB96, 1);
      yield* start_level();
      for (let i = 0x1F; i >= 0; i--) { M[0x479C + i] = M[0x8B60 + i]; wr(0xDB9C + i, 1); }
    }

    // ---- the main loop
    function* main_loop() {                                      // $1466
      for (;;) {
        yield cp(0x1466); yield* steer_plane();
        yield cp(0x146A); yield* spawn_ground();
        M[0x1E] = (M[0x1E] + 1) & 255;
        yield cp(0x1471); set_fine_scroll(M[0x23]);
        if (M[0x32]) { yield cp(0x1478); yield* place_ground(); }
        yield cp(0x147B); yield* read_inputs();
        yield cp(0x147E); move_plane();
        yield cp(0x1481); spawn_aircraft();
        if (M[0x39]) { yield cp(0x1488); yield* place_aircraft(); }
        yield cp(0x148B); move_shots();
        if (M[0x3B]) { yield cp(0x1492); yield* place_shot(); }
        yield cp(0x1495); move_stripes();
        yield cp(0x1498); yield* resolve_hits();
        yield cp(0x149B); yield* plane_crash();
        yield cp(0x149E); engine_sound();
        yield cp(0x14A1); yield* move_flak();
        if (M[0x40] & 0x80) break;
      }
      yield cp(0x14A9);
      reload_video();
    }
    function* game_loop() {                                      // $1456
      for (;;) {
        yield cp(0x1456); start_music();
        yield cp(0x145D); yield* title_screen();
        yield cp(0x1460); yield* new_game_screen();
        yield cp(0x1463); colour_play();
        yield* main_loop();
      }
    }
    function* start_game() {                                     // $1450
      init_noise();
      init_video();
      yield* game_loop();
    }
    P.program = function* () {
      for (;;) {
        try { yield* start_game(); } catch (e) { if (!(e instanceof Restart)) throw e; }
      }
    };

    // Each routine counted as it is called from the main program (P.ticks, by name), for the page's
    // clock, which charges each call its measured cost, and for test_play.js, which measures it.
    P.ticks = {};
    // A routine that yields (a generator) is not counted: its own code runs across the stretches it
    // yields in, and the page pays for it there, with each stretch's own cost.
    const T = (name, f) => (Object.getPrototypeOf(f) === GEN ? f
      : function (...a) { P.ticks[name] = (P.ticks[name] || 0) + 1; return f.apply(this, a); });
    music_start = T('music_start', music_start); init_noise = T('init_noise', init_noise);
    init_video = T('init_video', init_video); reload_video = T('reload_video', reload_video);
    show_score_row = T('show_score_row', show_score_row); start_music = T('start_music', start_music);
    colour_title = T('colour_title', colour_title);
    colour_title_rows = T('colour_title_rows', colour_title_rows);
    insert_score = T('insert_score', insert_score); insert_row = T('insert_row', insert_row);
    title_screen = T('title_screen', title_screen); enter_name = T('enter_name', enter_name);
    save_highscores = T('save_highscores', save_highscores); ioinit = T('ioinit', ioinit);
    new_game_screen = T('new_game_screen', new_game_screen); new_game = T('new_game', new_game);
    start_level = T('start_level', start_level); reset_after_life = T('reset_after_life', reset_after_life);
    set_hits_needed = T('set_hits_needed', set_hits_needed);
    bar_fill_bits = T('bar_fill_bits', bar_fill_bits);
    setup_raster_irq = T('setup_raster_irq', setup_raster_irq); add_score = T('add_score', add_score);
    show_target_hits = T('show_target_hits', show_target_hits); colour_play = T('colour_play', colour_play);
    start_engine_sound = T('start_engine_sound', start_engine_sound);
    read_joystick = T('read_joystick', read_joystick); read_inputs = T('read_inputs', read_inputs);
    trainer_or_stick = T('trainer_or_stick', trainer_or_stick); steer_plane = T('steer_plane', steer_plane);
    move_plane = T('move_plane', move_plane); plane_shadow = T('plane_shadow', plane_shadow);
    set_fine_scroll = T('set_fine_scroll', set_fine_scroll);
    move_by_scroll = T('move_by_scroll', move_by_scroll); move_left = T('move_left', move_left);
    move_right = T('move_right', move_right); spawn_ground = T('spawn_ground', spawn_ground);
    advance_ground = T('advance_ground', advance_ground); move_ground = T('move_ground', move_ground);
    free_ground = T('free_ground', free_ground); scroll_ground = T('scroll_ground', scroll_ground);
    point_hill_rows = T('point_hill_rows', point_hill_rows);
    next_hill_row = T('next_hill_row', next_hill_row); scroll_left = T('scroll_left', scroll_left);
    scroll_right = T('scroll_right', scroll_right);
    hill_column_right = T('hill_column_right', hill_column_right);
    hill_column_left = T('hill_column_left', hill_column_left);
    place_ground = T('place_ground', place_ground); sort_ground = T('sort_ground', sort_ground);
    sortRecords = T('sortRecords', sortRecords); sortGroundSlots = T('sortGroundSlots', sortGroundSlots);
    hitPicture = T('hitPicture', hitPicture); place_aircraft = T('place_aircraft', place_aircraft);
    sort_aircraft = T('sort_aircraft', sort_aircraft); place_shot = T('place_shot', place_shot);
    sort_shot = T('sort_shot', sort_shot); spawn_aircraft = T('spawn_aircraft', spawn_aircraft);
    move_aircraft = T('move_aircraft', move_aircraft); free_aircraft = T('free_aircraft', free_aircraft);
    aircraft_up = T('aircraft_up', aircraft_up); aircraft_down = T('aircraft_down', aircraft_down);
    fire_shot = T('fire_shot', fire_shot); move_shots = T('move_shots', move_shots);
    move_shot_records = T('move_shot_records', move_shot_records); free_shots = T('free_shots', free_shots);
    resolve_hits = T('resolve_hits', resolve_hits); slotHi = T('slotHi', slotHi);
    slotLo = T('slotLo', slotLo); hits_play = T('hits_play', hits_play);
    hits_sky_crash = T('hits_sky_crash', hits_sky_crash); hit_sound = T('hit_sound', hit_sound);
    draw_distance_bar = T('draw_distance_bar', draw_distance_bar);
    plane_crash = T('plane_crash', plane_crash);
    set_plane_pictures = T('set_plane_pictures', set_plane_pictures);
    engine_sound = T('engine_sound', engine_sound); shot_sound = T('shot_sound', shot_sound);
    spawn_flak = T('spawn_flak', spawn_flak); move_flak = T('move_flak', move_flak);
    move_flak_record = T('move_flak_record', move_flak_record); place_flak = T('place_flak', place_flak);
    move_stripes = T('move_stripes', move_stripes); stripeStep = T('stripeStep', stripeStep);
    strafing_runs = T('strafing_runs', strafing_runs); start_run = T('start_run', start_run);
    place_target = T('place_target', place_target); hits_strafing = T('hits_strafing', hits_strafing);
    target_hit = T('target_hit', target_hit); run_result = T('run_result', run_result);
    main_loop = T('main_loop', main_loop); game_loop = T('game_loop', game_loop);
    start_game = T('start_game', start_game);

    Object.assign(P, {
      game_irq, music_irq, music_start, init_noise, init_video, reload_video, show_score_row, start_music,
      colour_title, colour_title_rows, insert_score, insert_row, title_screen, enter_name, save_highscores,
      new_game_screen, new_game, start_level, reset_after_life, set_hits_needed, bar_fill_bits,
      setup_raster_irq, add_score, show_target_hits, colour_play, start_engine_sound, read_joystick,
      read_inputs, steer_plane, move_plane, plane_shadow, set_fine_scroll, move_by_scroll, move_left,
      move_right, spawn_ground, advance_ground, move_ground, free_ground, scroll_ground, scroll_left,
      scroll_right, hill_column_right, hill_column_left, place_ground, sort_ground, place_aircraft,
      sort_aircraft, place_shot, sort_shot, spawn_aircraft, move_aircraft, free_aircraft, fire_shot,
      move_shots, move_shot_records, free_shots, resolve_hits, hits_play, hits_sky_crash, hit_sound,
      draw_distance_bar, plane_crash, engine_sound, shot_sound, spawn_flak, move_flak, move_flak_record,
      place_flak, move_stripes, strafing_runs, start_run, place_target, hits_strafing, target_hit,
      run_result, main_loop,
    });
    P.irqs = { 0x13AB: game_irq, 0xAE03: music_irq, 0xEA31: kernal_irq };
    P.checkpoints = CHECKPOINTS;
    P.irqBytes = [0x3D, 0x3E, 0x47F8, 0x47F9, 0x47FA, 0x47FB, 0x47FC, 0x47FD, 0x47FE, 0x47FF];
    return P;
  }
  return { create, CHECKPOINTS, LIFE_DELAY };
})();
if (typeof module !== 'undefined') module.exports = globalThis.HunterPort;
