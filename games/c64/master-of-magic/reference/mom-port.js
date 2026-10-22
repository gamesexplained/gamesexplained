/* mom-port */
// Master of Magic, ported routine by routine from the listing (listing.json), for the Play tab and for
// test_play.js, which runs it beside the game's own code in the kit's lockstep (kit/c64/lockstep.js).
// The port runs on the game's 64 KB (M) and keeps every variable where the game keeps it: page 3's
// variables at $0380-$03DB, the objects' and creatures' tables at $3D45-$5B26, the sprite images the
// interrupt copies at $3A00-$3A3D, the dungeon map at $9000, the demonstration's buffer at $A540, the
// music driver's variables at $C3EF-$C426, the title's at $5E4A-$5E4D, and the operands the game
// rewrites: the main loop's dispatch at $0847/$0848 and the exits table's page at $25A7. What it does
// not keep are the processor's registers and the stack.
//
// MoMPort.create(M, io) gives P. P.program() is the whole program from the game's entry at $07F9 as a
// generator, which yields where the game's code has got to: { cp: a } at the calls of its loops and
// wherever the game reads a byte its interrupt writes (the frame counter $03A0, the collisions in
// $038D, the KERNAL's key $C5 and shift keys $028D, the title's request for the demonstration $03D9),
// so that it reads them where the game does, and before the SEI that ends the title, whose
// interrupts write the video chip's registers the code after it sets; a bare yield at each turn of a loop that waits for the
// interrupt (a new frame, CTRL let go); and { cycles: n } for the busy-wait delay $0F35. P.play_irq()
// ($2653), P.title_irq() ($5D08) and P.kernal_irq() ($EA31, when the vector is the KERNAL's) are the
// interrupt's handlers. io is the chips: vicRead(r), vicWrite(r, v), sidWrite(r, v), colourRead(i),
// colourWrite(i, v), ciaRead(r), ciaWrite(r, v) (CIA 1), cia2Read(r), cia2Write(r, v), read(a),
// write(a, v). The collision register $D01F is read through vicRead, as the game reads it. P.I is the
// processor's interrupt mask as the game sets it with SEI and CLI: a page does not run an interrupt
// while it is set. P.tally(name, n), when a page or a test sets it, hears each piece of work the port
// does (the names are the cost keys of reference/mom-play.js) as it does it.
//
// The game calls a few routines of the ROMs, and MoMPort.ROM stands in for them, the same in the
// port and on test_play.js's machine: the KERNAL's screen clear ($E544), BASIC's RAM initialisation
// ($E3BF, of which only the zero it leaves at $0800 is kept), CHROUT ($FFD2, the screen editor's
// subset the game's strings use: the colour codes, the cursor moves, clear and home, the case lock),
// and the KERNAL's interrupt work at $EA31 (the jiffy clock, the STOP key's row, the keyboard scan
// into $CB, $C5, $028D and $028E, and the read of $DC0D). random_byte reads three tables of the
// KERNAL ROM; the game can only ever be on two of the 256 cycles they make, and MoMPort.create takes
// the numbers of both (IMG.rngCycle0 and IMG.rngCycle191, worked out from the KERNAL ROM 901227-03).
// The music driver is reference/mom-music.js (MoMMusic), run here on the game's memory.
globalThis.MoMPort = (function () {
  'use strict';
  const neg = (v) => (v & 0x80) !== 0;                     // the N flag of an 8-bit result

  // ---- the ROM routines the game calls (the header). M is the memory, io the chips.
  const PETSCII_COLOUR = { 0x90: 0, 0x05: 1, 0x1C: 2, 0x9F: 3, 0x9C: 4, 0x1E: 5, 0x1F: 6, 0x9E: 7,
    0x81: 8, 0x95: 9, 0x96: 10, 0x97: 11, 0x98: 12, 0x99: 13, 0x9A: 14, 0x9B: 15 };
  const ROM = {
    // $E544 clear the screen: spaces in the text colour $0286, the cursor home
    clearScreen(M, io) {
      const col = M[0x286] & 15;
      for (let i = 0; i < 1000; i++) { M[0x400 + i] = 0x20; io.colourWrite(i, col); }
      M[0xD3] = 0; M[0xD6] = 0;
    },
    // $E3BF BASIC's RAM initialisation: of what it writes, the zero at the bottom of BASIC memory
    basicInit(M) { M[0x800] = 0; },
    // $FFD2 CHROUT to the screen: the cursor's row in $D6 and column in $D3, the colour in $0286
    chrout(M, io, c) {
      let row = M[0xD6], col = M[0xD3];
      if (c === 0x93) {
        const k = M[0x286] & 15;
        for (let i = 0; i < 1000; i++) { M[0x400 + i] = 0x20; io.colourWrite(i, k); }
        row = col = 0;
      } else if (PETSCII_COLOUR[c] !== undefined) M[0x286] = PETSCII_COLOUR[c];
      else if (c === 0x13) row = col = 0;
      else if (c === 0x11) { if (row < 24) row++; }
      else if (c === 0x91) { if (row > 0) row--; }
      else if (c === 0x9D) { if (col > 0) col--; else if (row > 0) { row--; col = 39; } }
      else if (c === 0x1D) { if (++col === 40) { col = 0; row++; } }
      else if (c === 0x0D || c === 0x8D) { row++; col = 0; }
      else if (c === 0x08) M[0x291] = 0x80;               // SHIFT and C= may no longer switch the case
      else if (c === 0x09) M[0x291] = 0;
      else {
        let s = -1;
        if (c >= 0x20 && c < 0x40) s = c; else if (c >= 0x40 && c < 0x60) s = c & 0x3F; else if (c >= 0x60 && c < 0x80) s = (c & 0x1F) | 0x40;
        else if (c >= 0xA0 && c < 0xC0) s = c - 0x40; else if (c >= 0xC0 && c < 0xFF) s = c - 0x80; else if (c === 0xFF) s = 0x5E;
        if (s >= 0 && row < 25) {
          M[0x400 + row * 40 + col] = s; io.colourWrite(row * 40 + col, M[0x286]);
          if (++col === 40) { col = 0; row++; }
        }
      }
      M[0xD6] = row; M[0xD3] = col;
    },
    // $EA31's work before its exit: the jiffy clock and the STOP key's row (UDTIM), the keyboard
    // scan through CIA 1 (SCNKEY: the last key found in $CB and $C5, $40 for none; SHIFT 1, C= 2 and
    // CTRL 4 in $028D, the last scan's in $028E; port A left at $7F), and the read of $DC0D that
    // acknowledges CIA 1's timer
    irq(M, io) {
      M[0xA2] = M[0xA2] + 1;
      if (M[0xA2] === 0) { M[0xA1] = M[0xA1] + 1; if (M[0xA1] === 0) M[0xA0] = M[0xA0] + 1; }
      if (M[0xA0] === 0x4F && M[0xA1] === 0x1A && M[0xA2] === 0x01) M[0xA0] = M[0xA1] = M[0xA2] = 0;
      M[0x91] = io.ciaRead(1);
      M[0xC0] = 0;
      let shift = 0, key = 0x40;
      for (let row = 0; row < 8; row++) {
        io.ciaWrite(0, ~(1 << row) & 0xFF);
        const v = io.ciaRead(1);
        for (let col = 0; col < 8; col++) {
          if (v & (1 << col)) continue;
          const k = row * 8 + col;
          if (k === 0x0F || k === 0x34) shift |= 1; else if (k === 0x3D) shift |= 2; else if (k === 0x3A) shift |= 4;
          else key = k;
        }
      }
      io.ciaWrite(0, 0x7F);
      M[0x28E] = M[0x28D]; M[0x28D] = shift; M[0xCB] = key; M[0xC5] = key;
      io.ciaRead(13);
      return key !== 0x40 || shift !== 0;                   // a key held: the scan's longer path
    },
  };

  // The checkpoints the port yields (the header), for the lockstep.
  const CHECKPOINTS = [
    0x081E, 0x0821, 0x0824, 0x082C, 0x0846, 0x0849,                   // the restart and the main loop
    0x0858, 0x086C, 0x0876, 0x088B, 0x08AA,                           // the game over
    0x08CC, 0x08D1, 0x08D4, 0x08E1, 0x08E4, 0x08ED, 0x08F0, 0x08F8, 0x08FB, 0x08FE, 0x0901, 0x0914,   // run_world
    0x0AC4, 0x0AE9, 0x0AF1,                                           // the movement tick
    0x0C94, 0x0CEA, 0x0CFF, 0x17AD,                                   // the input
    0x132F, 0x1373, 0x146C,                                           // the menu chooser
    0x5BBA, 0x5BC1, 0x5BCE, 0x5BE4, 0x5BF1, 0x5BFE, 0x5C19, 0x5C7F, 0x5E29, 0x5E36,   // the title
  ];

  function create(M, io, IMG) {
    const P = { M, io, I: 1, tally: null };
    const cy = (k, n = 1) => { if (P.tally) P.tally(k, n); };
    const CP = {};
    const cp = (a) => CP[a] || (CP[a] = { cp: a });
    // the processor port: $01 at $36 or $37 in this game, so the chips are always in at $D000-$DFFF
    const chips = (a) => a >= 0xD000 && a < 0xE000 && (M[1] & 3) !== 0 && (M[1] & 4) !== 0;
    const rb = (a) => { a &= 0xFFFF; return chips(a) ? P.io.read(a) & 255 : M[a]; };
    const wb = (a, v) => { a &= 0xFFFF; if (chips(a)) P.io.write(a, v & 255); else M[a] = v & 255; };
    const vr = (r) => P.io.vicRead(r) & 255, vw = (r, v) => P.io.vicWrite(r, v & 255);
    const sw = (r, v) => P.io.sidWrite(r, v & 255);
    const zp = (a) => M[a] | M[a + 1] << 8;
    const setzp = (a, v) => { M[a] = v & 0xFF; M[a + 1] = (v >> 8) & 0xFF; };
    const inc = (a) => (M[a] = (M[a] + 1) & 0xFF);
    const dec = (a) => (M[a] = (M[a] - 1) & 0xFF);
    const where = (x) => M[0x3F70 + x] | M[0x3FB0 + x] << 8;
    const noun = (x) => M[0x4588 + x] | M[0x45C9 + x] << 8;
    const RNG0 = IMG.rngCycle0, RNG191 = IMG.rngCycle191;
    P.sei = () => { P.I = 1; };
    P.cli = () => { P.I = 0; };

    // ---- the ROMs' routines, on the port's memory and chips
    P.rom_clear_screen = function () { cy('rom_clear_screen'); ROM.clearScreen(M, P.io); };   // $E544
    P.rom_basic_init = function () { cy('rom_basic_init'); ROM.basicInit(M); };               // $E3BF
    P.rom_chrout = function (c) { cy('rom_chrout'); ROM.chrout(M, P.io, c); };                // $FFD2
    P.kernal_irq = function () { ROM.irq(M, P.io); };                                         // $EA31

    // ---- the music driver, $C000-$C32E and $CBC3-$CBE6 (reference/mom-music.js)
    const music = globalThis.MoMMusic.createDriver(null, { mem: M, sid: (r, v) => sw(r, v) });
    P.music_init = function (tune) { cy('music_init'); music.init(tune); };                  // $C000
    P.music_stop = function () { cy('music_stop'); music.stop(); };                          // $C003
    P.music_play = function () { cy('music_play'); music.play(); };                          // $C006
    P.music_frame = function () {                                                             // $1949
      if (M[0x2A6] === 0 && dec(0x3DB) === 0) { M[0x3DB] = 6; return; }
      P.music_play();
    };

    // ------------------------------------------------------------------ the program
    P.program = function* () {
      // $07F9 entry: SEI, CLD, an empty stack, $00 = $2F, $01 = $37, the screen cleared, BASIC's RAM set
      P.sei();
      M[0] = 0x2F; M[1] = 0x37;
      P.rom_clear_screen();
      P.rom_basic_init();
      M[0xCC] = 1; M[0x3DB] = 1; M[0x3DA] = 1;
      for (;;) {                                                       // $0818 restart
        M[1] &= 0xFE;
        yield cp(0x081E); yield* P.title_screen();
        yield cp(0x0821); P.new_game();
        yield* P.main_loop();
        yield* P.game_over();
      }
    };

    // ------------------------------------------------------------------ the title, $5B27-$5E43
    P.title_screen = function* () {                                    // $5B27
      cy('title_screen');
      P.sei(); M[0x314] = 0x31; M[0x315] = 0xEA; vw(0x1A, vr(0x1A) & 0xFE); P.cli();
      vw(0x11, vr(0x11) & 0x6F);
      vw(0x15, 0);
      M[0x5E4C] = 0x09; M[0x5E4D] = 0x80;
      vw(0x20, 0); vw(0x21, 0);
      P.rom_chrout(0x08); P.rom_chrout(0x93);
      for (let y = 0; y < 256; y++) { wb(0xD800 + y, 0); wb(0xD900 + y, 0); wb(0xDA00 + y, 0); wb(0xDB00 + y, 0); }
      vw(0x21, 0);
      P.copy_block(0x5E44);
      M[0x5E4A] = 0;
      P.music_init(0);
      P.sei(); M[0x314] = 0x08; M[0x315] = 0x5D; vw(0x12, 0x30); vw(0x1A, vr(0x1A) | 1); P.cli();
      vw(0x11, (vr(0x11) & 0x7F) | 0x10);
      M[0x3D3] = 0; M[0x3D9] = 0;
      for (;;) {                                                       // $5BBA title_wait_loop
        yield cp(0x5BBA);
        cy('title_wait_loop');
        if (M[0x28D] === 4) {
          yield cp(0x5BC1);
          if (M[0xC5] === 0x11) {                                      // CTRL and R: record the next game
            while (M[0x28D] === 4) { cy('title_ctrl_wait'); yield; }   // $5BC7: until CTRL is let go
            yield cp(0x5BCE);
            M[0x3D3] = 1;
            M[0xA540] = M[0x383]; M[0xA541] = M[0x384];
          }
        }
        if (M[0x3D3]) break;
        yield cp(0x5BE4);
        if (M[0x3D9]) { M[0x3D3] = 2; break; }                         // the story is over: the demonstration
        yield cp(0x5BF1); yield* P.read_input_demo();
        if (!M[0x387]) continue;
        yield* P.delay(5);
        do { yield cp(0x5BFE); yield* P.read_input_demo(); } while (M[0x387]);
        yield* P.delay(5);
        break;
      }
      return yield* P.title_leave();
    };
    P.title_leave = function* () {                                     // $5C0B
      cy('title_leave');
      vw(0x11, vr(0x11) & 0x6F);
      P.music_stop(); P.music_play();
      yield cp(0x5C19);                                                // before the SEI: the title's interrupts write $D016 too
      P.sei(); M[0x314] = 0x31; M[0x315] = 0xEA;
      vw(0x16, (vr(0x16) & 0xC8) | 0x18);
      vw(0x18, 0x1D);
      vw(0x11, vr(0x11) & 0x5F);
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, P.io.cia2Read(0) | 3);
      vw(0x1A, vr(0x1A) & 0xFE);
      P.cli();
      vw(0x20, 0x0E); vw(0x21, 0); vw(0x22, 2); vw(0x23, 0x0F);
      vw(0x11, (vr(0x11) & 0x6F) | 0x10);
      if (M[0x3D3]) return;
      P.print_via_chrout(0x838E);                                      // the controls page
      for (;;) {                                                       // $5C7F
        yield cp(0x5C7F); yield* P.read_input_demo();
        if (M[0x389] === 1) return yield* P.title_instructions();
        if (M[0x387]) return yield* P.wait_fire_press();
      }
    };
    P.title_instructions = function* () {                              // $5C92: five pages, a whole press each
      cy('title_instructions');
      for (const a of [0x84B7, 0x86E7, 0x8893, 0x8B1B, 0x8DB1]) {
        P.print_via_chrout(a);
        yield* P.wait_fire_press();
      }
    };
    P.wait_fire_press = function* () {                                 // $5E29
      cy('wait_fire_press');
      do { yield cp(0x5E29); yield* P.read_input_demo(); } while (!M[0x387]);
      yield* P.delay(5);
      do { yield cp(0x5E36); yield* P.read_input_demo(); } while (M[0x387]);
      yield* P.delay(5);
    };
    P.copy_block = function (params) {                                 // $5CC5: from, to (not included), into
      cy('copy_block');
      setzp(0x63, params);
      setzp(0x9B, M[params] | M[params + 1] << 8);
      setzp(0x9D, M[params + 2] | M[params + 3] << 8);
      setzp(0x63, M[params + 4] | M[params + 5] << 8);
      let n = 0;
      do {
        wb(zp(0x63), rb(zp(0x9B)));
        setzp(0x9B, zp(0x9B) + 1); setzp(0x63, zp(0x63) + 1); n++;
      } while (M[0x9C] !== M[0x9E] || M[0x9B] !== M[0x9D]);
      cy('copy_block.byte', n);
    };
    P.print_via_chrout = function (a) {                                // $2BC7
      cy('print_via_chrout');
      setzp(0x9B, a);
      for (let c; (c = rb(zp(0x9B))) !== 0; setzp(0x9B, zp(0x9B) + 1)) P.rom_chrout(c);
    };

    // The title's interrupt ($5D08): the picture half at raster $30, the scroller half at $EE.
    P.title_irq = function () {                                        // $5D08
      const f = vr(0x19);
      vw(0x19, f);
      if (!(f & 1)) return;                                           // CIA 1's timer: out, $DC0D unread
      if (M[0x5E4A] === 0) P.title_irq_picture(); else P.title_irq_scroller();
    };
    P.title_irq_scroller = function () {                               // $5D20
      vw(0x16, vr(0x16) & 0xCF);
      vw(0x18, 0x1D);
      vw(0x11, vr(0x11) & 0x5F);
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, P.io.cia2Read(0) | 3);
      vw(0x12, 0x30);
      M[0x5E4A] = 0;
      vw(0x16, (vr(0x16) & 0xF0) + M[0x5E4B]);
      P.music_frame();
      P.kernal_irq();                                                  // JMP $EA31
    };
    P.title_irq_picture = function () {                                // $5D63
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, P.io.cia2Read(0) & 0xFC);
      vw(0x12, 0xEE);
      vw(0x16, (vr(0x16) & 0xDF) | 0x10);
      vw(0x11, (vr(0x11) & 0x7F) | 0x20);
      inc(0x5E4A);
      vw(0x18, (vr(0x18) & 1) | 0x38);
      vw(0x16, (vr(0x16) & 0xF8) | 0x08);
      P.title_scroll_step(); P.title_scroll_step();
    };
    P.title_scroll_step = function () {                                // $5DAC: a pixel of the story
      if (M[0x2A6] === 0 && dec(0x3DA) === 0) { M[0x3DA] = 2; return; }
      if (dec(0x5E4B) !== 0xFF) return;
      M[0x5E4B] = 7;
      setzp(0x5E4C, zp(0x5E4C) + 1);
      if (M[0x5E4C] === 0x66 && M[0x5E4D] === 0x83) {                 // the end of the story: again, and the demonstration
        M[0x5E4C] = 0x09; M[0x5E4D] = 0x80;
        M[0x3D9] = 2;
        M[0x383] = M[0xA540]; M[0x384] = M[0xA541];
      }
      let p = zp(0x5E4C);
      for (let x = 0; x < 0x28; x++, p = (p + 1) & 0xFFFF) {
        let a = M[p];
        if (!neg(a - 0x40)) a = (a - 0x40) & 0xFF;
        M[0x7C0 + x] = a;
        wb(0xDBC0 + x, 7);
      }
      setzp(0x63, p);
    };

    // ------------------------------------------------------------------ the play interrupt, $2653
    P.play_irq = function () {                                         // $2653
      const f = vr(0x19);
      vw(0x19, f);
      if (!(f & 1)) { P.io.ciaRead(0x0D); return; }                   // $265D: CIA 1's timer
      const b = M[0x3B7];
      if (b === 0) P.irq_band0(); else if (b === 1) P.irq_band1(); else P.irq_band2();
    };
    P.irq_band0 = function () {                                        // $2675, raster $28: the top band
      inc(0x3B7);
      vw(0x12, 0x8E);
      vr(0x1F);                                                        // empties the collision latch
      vw(0x18, 0x1D);
      vw(0x11, vr(0x11) & 0x5F);
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, P.io.cia2Read(0) | 3);
      vw(0x21, 7);
      for (let r = 0; r < 0x10; r++) vw(r, M[0x3A00 + r]);
      vw(0x15, M[0x3A10]); vw(0x17, M[0x3A11]); vw(0x1B, M[0x3A12]); vw(0x1C, M[0x3A13]); vw(0x1D, M[0x3A14]);
      for (let n = 0; n < 8; n++) vw(0x27 + n, M[0x3A15 + n]);
      vw(0x17, 0); vw(0x1D, 0); vw(0x10, 0);
      P.kernal_irq();                                                  // JMP $EA31
    };
    P.irq_band1 = function () {                                        // $275E, raster $8E: the menu band
      inc(0x3B7);
      vw(0x12, 0xB6);
      vw(0x11, vr(0x11) & 0x7F);
      vw(0x21, 8);
      if (M[0x3D1]) P.music_frame();
      else if (M[0x3CF]) {                                             // a footstep: a burst of noise on voice 1
        M[0x3CF] = 0;
        sw(0x18, 0x0F); sw(0x00, 0x00); sw(0x01, 0x10); sw(0x05, 0x00); sw(0x06, 0x53); sw(0x04, 0x81); sw(0x04, 0x80);
      }
      P.io.ciaRead(0x0D);
    };
    P.irq_band2 = function () {                                        // $27AE, raster $B6: the picture strip
      M[0x3B7] = 0;
      vw(0x12, 0x28);
      inc(0x3A0);
      M[0x38D] |= vr(0x1F);
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, (P.io.cia2Read(0) & 0xFC) | 1);
      vw(0x11, (vr(0x11) & 0x7F) | 0x20);
      vw(0x18, 0xA8);
      vw(0x21, 0);
      for (let r = 0; r < 0x10; r++) vw(r, M[0x3A20 + r]);
      vw(0x15, M[0x3A30]);
      vw(0x1B, 0); vw(0x1C, 0);
      for (let n = 0; n < 8; n++) vw(0x27 + n, 0x0A);
      vw(0x10, M[0x3A3D]);
      vw(0x17, 0xFF); vw(0x1D, 0xFF);
      P.io.ciaRead(0x0D);
    };
    P.play_irq_install = function () {                                 // $2627
      cy('play_irq_install');
      P.sei();
      M[0x314] = 0x53; M[0x315] = 0x26;
      vw(0x11, vr(0x11) & 0x7F);
      vw(0x12, 0x28);
      vw(0x1A, vr(0x1A) | 1);
      M[0x3B7] = 0; M[0x3D1] = 1;
      P.cli();
    };

    // ------------------------------------------------------------------ the input, $179D
    P.read_input_demo = function* () {                                 // $179D
      cy('read_input_demo');
      yield* P.input_poll();
      const mode = M[0x3D3];
      if (mode === 0) return;
      if (mode !== 1) { P.demo_replay(); return; }
      // recording ($03D3 = 1)
      yield cp(0x17AD);
      if (M[0xC5] === 0x15) {                                          // F: the end mark, and the game over
        M[0x14] = M[0x3D4]; M[0x15] = M[0x3D5];
        M[(zp(0x14) + 1) & 0xFFFF] = 0xEF;
        M[0x3C7] = 1; M[0x3D3] = 0;
        return;
      }
      if (!M[0x387]) { P.demo_rec_stick(); return; }
      if (M[0x3D6] === 0x0F) return;                                   // fire held: recorded once
      setzp(0x3D4, zp(0x3D4) + 1);
      if (M[0x3D5] === 0xA8) { M[0x3D3] = 0; return; }
      M[0x3D6] = 0x0F;
      M[0x14] = M[0x3D4]; M[0x15] = M[0x3D5];
      M[zp(0x14)] = 0xFA;
    };
    P.input_poll = function* () {                                      // $0C94
      yield cp(0x0C94);
      cy('input_poll');
      if (M[0xC5] === 0x24) {                                          // M toggles the music, once a press
        if (!M[0x3D2]) {
          M[0x3D2] = 1;
          M[0x3D1] ^= 1;
          if (M[0x3D1] === 0) { P.music_stop(); P.music_play(); } else P.music_init(0);
        }
      } else M[0x3D2] = 0;
      // $0CC6 input_read: joystick port 2
      const j = P.io.ciaRead(0);
      let x = 0, y = 0;
      if (!(j & 1)) y--;
      if (!(j & 2)) y++;
      if (!(j & 4)) x--;
      if (!(j & 8)) x++;
      M[0x387] = (j & 0x10) ? 0 : 1; M[0x388] = x & 0xFF; M[0x389] = y & 0xFF;
      yield cp(0x0CEA);                                                // the keys: SHIFT right, C= left
      if (M[0x28D] === 1) M[0x388] = 1;
      if (M[0x28D] === 2) M[0x388] = 0xFF;
      yield cp(0x0CFF);                                                // H up, B down, SPACE fire
      const k = M[0xC5];
      if (k === 0x1D) M[0x389] = 0xFF;
      else if (k === 0x1C) M[0x389] = 1;
      else if (k === 0x3C) M[0x387] = 1;
    };
    P.demo_rec_stick = function () {                                   // $1806
      cy('demo_rec');
      let s = 0;
      if (M[0x388]) s |= neg(M[0x388]) ? 2 : 1;
      if (M[0x389]) s |= neg(M[0x389]) ? 8 : 4;
      M[0x14] = M[0x3D4]; M[0x15] = M[0x3D5];
      if (s === M[0x3D6]) {
        const p = zp(0x14);
        if ((M[p] & 0x0F) !== 0x0F) { M[p] = (M[p] + 1) & 0xFF; return; }
        s = M[p] >> 4;
      }
      P.demo_rec_new_run(s);
    };
    P.demo_rec_new_run = function (s) {                                // $1858
      cy('demo_rec_new_run');
      M[0x3D6] = s;
      setzp(0x3D4, zp(0x3D4) + 1);
      const p = zp(0x14);
      if (M[0x3D5] === 0xA8) {                                         // the buffer is full
        M[0x3D3] = 0; M[0x3C7] = 1;
        M[p] = 0xEF;
        return;
      }
      M[(p + 1) & 0xFFFF] = (M[0x3D6] << 4) & 0xFF;
    };
    P.demo_replay = function () {                                      // $1888
      cy('demo_replay');
      if (M[0x387]) { M[0x3C7] = 1; M[0x3D8] = 1; M[0x3D3] = 0; return; }
      if (M[0x3D7] !== 0xFF) { dec(0x3D7); P.demo_replay_apply(); return; }
      setzp(0x3D4, zp(0x3D4) + 1);                                     // $1907: the next entry
      if (M[0x3D5] === 0xA8) { M[0x3D3] = 0; M[0x3C7] = 1; M[0x3D8] = 1; M[0x387] = 1; return; }
      M[0x14] = M[0x3D4]; M[0x15] = M[0x3D5];
      const b = M[zp(0x14)];
      M[0x3D7] = ((b & 0x0F) - 1) & 0xFF;
      M[0x3D6] = b >> 4;
      P.demo_replay_apply();
    };
    P.demo_replay_apply = function () {                                // $18A5
      cy('demo_replay_apply');
      const s = M[0x3D6];
      if (s === 0x0F) { M[0x387] = 1; M[0x388] = 0; M[0x389] = 0; return; }
      if (s === 0x0E) { M[0x3C7] = 1; M[0x3D3] = 0; M[0x3D8] = 1; return; }
      M[0x388] = 0; M[0x389] = 0;
      if (s & 1) M[0x388] = 1;
      if (s & 2) M[0x388] = 0xFF;
      if (s & 4) M[0x389] = 1;
      if (s & 8) M[0x389] = 0xFF;
    };

    P.delay = function* (a) {                                          // $0F35: A + 1 rounds of 6,438 cycles
      cy('delay');
      yield { cycles: (a + 1) * 6438 };
    };

    // ------------------------------------------------------------------ $2B9E random_byte
    // A = ROM[$F000 + ROM[$E000 + i]] EOR ROM[$E800 + j]; i + 1, j - 3. (j + 3i) mod 256 never
    // changes, and the game can only be on two of those cycles: 0 (the demonstration's seed) and 191
    // (the seed in the loaded file).
    P.random_byte = function () {
      cy('random_byte');
      const i = M[0x383], j = M[0x384], c = (j + 3 * i) & 0xFF;
      let v;
      if (c === 0) v = RNG0[(i - 0xF8) & 0xFF];
      else if (c === 191) v = RNG191[(i - 0x07) & 0xFF];
      else throw new Error('random state $' + i.toString(16) + ' $' + j.toString(16) + ' is on neither cycle');
      M[0x383] = (i + 1) & 0xFF; M[0x384] = (j - 3) & 0xFF;
      return v;
    };
    const rnd = () => P.random_byte();

    // ------------------------------------------------------------------ the view: rays ($0B25 ...)
    P.view_record_cell = function () {                                 // $0C77
      cy('view_record_cell');
      if (!neg(M[0x381] - 0x38)) return;
      const bb = M[0xBB];
      M[0x3E37 + bb] = M[zp(0xF9)];
      M[0x3D45 + bb] = M[0xF9]; M[0x3DBE + bb] = M[0xFA];
    };
    P.view_clear_cells = function () {                                 // $0F45
      cy('view_clear_cells');
      for (let x = 0; x < 0x79; x++) { M[0x3D45 + x] = 0x7F; M[0x3DBE + x] = 0x7F; M[0x3E37 + x] = 0x7F; }
    };
    P.view_draw_cells = function () {                                  // $0F58
      cy('view_draw_cells');
      let p = 0x400, x = 0;
      while (x !== 0x79) {
        for (let y = 0; y < 11; y++, x++) {
          const t = M[0x3E37 + x];
          M[p + y] = t; M[0x038A] = x; wb(p + 0xD400 + y, M[0xA400 + t]);
        }
        p += 0x28;
      }
      setzp(0x9B, p); setzp(0x9D, p + 0xD400);
    };
    P.view_find_visible = function () {                                // $0FAA: 121 cells x 63 entries
      cy('view_find_visible');
      for (let x = 1; x < 0x40; x++) { M[0x3EB0 + x] = 0; M[0x5041 + x] = 0; }
      for (let x = 0; x < 0x79; x++) {
        for (let y = 1; y < 0x40; y++) {
          if (M[0x3F70 + y] !== M[0x3D45 + x]) continue;
          cy('view_find_visible.lo');
          if (M[0x3FB0 + y] !== M[0x3DBE + x]) continue;
          cy('view_find_visible.seen');
          M[0x3EB0 + y] = 1;
          M[0x4C4F + y] = M[0x3F70]; M[0x4C8F + y] = M[0x3FB0];
          M[0x5041 + y] = M[0x5081 + x];
        }
      }
    };
    P.view_cast_ray = function () {                                    // $0B25
      cy('view_cast_ray');
      if (inc(0x380) === 0x1C) M[0x380] = 0;
      if (M[0x38B]) { M[0x38B] = 0; M[0x39F] = 0; P.view_clear_cells(); }
      if (inc(0x39F) === 0x1D) { M[0x39F] = 0; P.view_draw_cells(); P.view_find_visible(); P.view_clear_cells(); }
      M[0xF7] = M[0x3FF0]; M[0xF8] = M[0x4030]; M[0xF9] = M[0x3F70]; M[0xFA] = M[0x3FB0];
      M[0xBB] = 0x3C;
      P.view_record_cell();
      M[0xFF] = M[0x3BCB + M[0x380]];
      M[0x381] = 0; M[0x382] = 0;
      for (;;) {                                                       // $0B89
        cy('view_cast_ray.step');
        const d = M[0x3BF7 + M[0xFF]];
        if (d === 0) {
          if (dec(0xF8) === 0xFF) { M[0xF8] = 7; setzp(0xF9, zp(0xF9) - 0x80); M[0xBB] = (M[0xBB] - 0x0B) & 0xFF; P.view_record_cell(); }
        } else if (d === 1) {
          if (inc(0xF8) === 8) { M[0xF8] = 0; setzp(0xF9, zp(0xF9) + 0x80); M[0xBB] = (M[0xBB] + 0x0B) & 0xFF; P.view_record_cell(); }
        } else if (d === 2) {
          if (dec(0xF7) === 0xFF) { M[0xF7] = 7; if (dec(0xF9) === 0xFF) dec(0xFA); dec(0xBB); P.view_record_cell(); }
        } else if (d === 3) {
          if (inc(0xF7) === 8) { M[0xF7] = 0; if (inc(0xF9) === 0) inc(0xFA); inc(0xBB); P.view_record_cell(); }
        }
        inc(0xFF);                                                     // $0C24
        if (inc(0x382) === 7) { M[0x382] = 0; M[0xFF] = M[0x3BCB + M[0x380]]; }
        const code = M[zp(0xF9)];                                      // $0C3D
        M[0x9D] = M[0xA200 + code]; M[0x9E] = M[0xA300 + code];
        const x = M[0xF7], v = M[0x3BEF + x] & M[(zp(0x9D) + M[0xF8]) & 0xFFFF];
        if (M[0xA400 + code] === 0x0F && v === M[0x3BEF + x]) return;
        if (v === M[0x3BE7 + x]) return;
        if (inc(0x381) === 0x38) return;
      }
    };
    P.view_refresh = function () {                                     // $0B05
      cy('view_refresh');
      M[0x380] = 0x1B; M[0x3C9] = 0; M[0x38B] = 1;
      do { P.view_cast_ray(); } while (inc(0x3C9) !== 0x1E);
      P.draw_entity_sprites();
    };

    // $0FEF draw_entity_sprites: up to seven entries in sight as sprites 1-7 of the top band
    P.draw_entity_sprites = function () {
      cy('draw_entity_sprites');
      let x = M[0x394];
      M[0x38A] = 2; M[0x391] = 0; M[0x393] = 0; M[0x38E] = 1;
      M[0x9D] = 0x40; M[0x9E] = 0x38;
      for (;;) {
        cy('draw_entity_sprites.scan');
        if (M[0x3EB0 + x]) {
          cy('draw_entity_sprites.sprite');
          M[0x38E] |= M[0x38A];
          let d = (where(0) - 0xCD) & 0xFFFF;
          d = (d - where(x)) & 0xFFFF;
          M[0x38F] = d & 0xFF; M[0x390] = d >> 8;
          M[0x392] = M[0x38F] & 0x7F;
          let a = (((0x10 - M[0x392]) & 0xFF) << 3) & 0xFF;
          let s = a + 0x53; a = s & 0xFF;
          s = a + M[0x3FF0 + x] + (s > 0xFF ? 1 : 0);
          M[0x3A02 + M[0x391]] = s & 0xFF;
          M[0x390] = ((M[0x390] << 1) | (M[0x38F] >> 7)) & 0xFF;
          a = (((0x10 - M[0x390]) & 0xFF) << 3) & 0xFF;
          s = a + 0xC5; a = s & 0xFF;
          s = a + M[0x4030 + x] + (s > 0xFF ? 1 : 0);
          M[0x3A03 + M[0x391]] = s & 0xFF;
          const g = M[0x4070 + x];
          M[0x3A16 + M[0x393]] = M[0xA400 + g];
          M[0x9B] = (g << 3) & 0xFF; M[0x9C] = 0x30 | (g >> 5);
          M[0x392] = 0;
          do {                                                         // 8 glyph rows into the sprite's left column
            M[zp(0x9D)] = M[zp(0x9B)];
            inc(0x9B); inc(0x9D); inc(0x9D); inc(0x9D);
          } while (inc(0x392) !== 8);
          M[0x38A] = ((M[0x38A] << 1) | 1) & 0xFF;                     // ROL: the carry in is 1 (CMP #8 found A = 8)
          M[0x391] += 2; inc(0x393);
          setzp(0x9D, zp(0x9D) + 0x28);
        }
        if (++x === 0x40) x = 1;                                       // $10E6
        if (M[0x393] === 7 || x === M[0x394]) break;
      }
      M[0x3A10] = M[0x38E];
      M[0x394] = x;
    };

    // ------------------------------------------------------------------ the player's movement
    function scrollRows(p) { setzp(0x9B, p); setzp(0x9D, p + 0xD400); }
    P.player_cross_right = function () {                               // $0DA0: into the cell to the right
      cy('player_cross');
      M[0x38B] = 1;
      if (inc(0x3F70) === 0) inc(0x3FB0);
      M[0x3FF0] = 0;
      let p = 0x400;
      for (let r = 0; r < 11; r++, p += 0x28) {
        for (let y = 1; y < 11; y++) { M[p + y - 1] = M[p + y]; wb(p + 0xD400 + y - 1, rb(p + 0xD400 + y)); }
        M[p + 10] = 0x7F; wb(p + 0xD400 + 10, M[0xA47F]);
      }
      scrollRows(p);
    };
    P.player_cross_left = function () {                                // $0DF6
      cy('player_cross');
      M[0x38B] = 1;
      if (dec(0x3F70) === 0xFF) dec(0x3FB0);
      M[0x3FF0] = 7;
      let p = 0x400;
      for (let r = 0; r < 11; r++, p += 0x28) {
        for (let y = 9; y >= 0; y--) { M[p + y + 1] = M[p + y]; wb(p + 0xD400 + y + 1, rb(p + 0xD400 + y)); }
        M[p] = 0x7F; wb(p + 0xD400, M[0xA47F]);
      }
      scrollRows(p);
    };
    P.player_cross_down = function () {                                // $0E51: into the cell below
      cy('player_cross');
      M[0x38B] = 1;
      const w = where(0) + 0x80; M[0x3F70] = w & 0xFF; M[0x3FB0] = (w >> 8) & 0xFF;
      M[0x4030] = 0;
      let p = 0x400;
      for (M[0x38A] = 0; M[0x38A] !== 0x0A; inc(0x38A), p += 0x28) {
        for (let x = 0; x < 11; x++) { M[p + x] = M[p + 0x28 + x]; wb(p + 0xD400 + x, rb(p + 0xD400 + 0x28 + x)); }
      }
      for (let y = 0; y < 11; y++) { M[p + y] = 0x7F; wb(p + 0xD400 + y, M[0xA47F]); }
      scrollRows(p);
    };
    P.player_cross_up = function () {                                  // $0EC3
      cy('player_cross');
      M[0x38B] = 1;
      const w = (where(0) - 0x80) & 0xFFFF; M[0x3F70] = w & 0xFF; M[0x3FB0] = w >> 8;
      M[0x4030] = 7;
      let p = 0x568;
      for (M[0x38A] = 9; M[0x38A] !== 0xFF; dec(0x38A), p -= 0x28) {
        for (let x = 0; x < 11; x++) { M[p + 0x28 + x] = M[p + x]; wb(p + 0xD400 + 0x28 + x, rb(p + 0xD400 + x)); }
      }
      for (let y = 0x28; y < 0x33; y++) { M[p + y] = 0x7F; wb(p + 0xD400 + y, M[0xA47F]); }
      scrollRows(p);
    };
    P.player_step = function () {                                      // $0D44
      cy('player_step');
      if (M[0x388] || M[0x389]) {
        if (dec(0x3D0) === 0) { M[0x3D0] = 3; M[0x3CF] = 1; }           // a footstep, every third step
      }
      M[0x3FF0] = (M[0x388] + M[0x3FF0]) & 0xFF;
      if (M[0x3FF0] === 8) P.player_cross_right();
      else if (M[0x3FF0] === 0xFF) P.player_cross_left();
      M[0x3A00] = (M[0x3FF0] + 0x3E) & 0xFF;
      M[0x4030] = (M[0x389] + M[0x4030]) & 0xFF;
      if (M[0x4030] === 8) P.player_cross_down();
      else if (M[0x4030] === 0xFF) P.player_cross_up();
      M[0x3A01] = (M[0x4030] + 0x58) & 0xFF;
    };
    P.player_bounce = function () {                                    // $0F95
      cy('player_bounce');
      if (M[0x388]) M[0x388] ^= 0xFE;
      if (M[0x389]) M[0x389] ^= 0xFE;
    };
    P.player_move_tick = function* () {                                // $0ABF
      cy('player_move_tick');
      if (dec(0x39C) !== 0) return;
      yield cp(0x0AC4);
      M[0x39C] = M[0x39A];
      while (M[0x3A0] === M[0x3A1]) { cy('frame_wait'); yield; }      // $0ACA: a frame since the last tick
      P.sei();
      if (M[0x38D] & 1) { M[0x38D] = 0; P.player_bounce(); }          // the figure touched a wall: back
      else yield* P.read_input_demo();
      P.cli();
      yield cp(0x0AE9); P.player_step();
      M[0x38D] = 0;
      yield cp(0x0AF1);
      const f = M[0x3A0];
      while (M[0x3A0] === f) { cy('frame_wait'); yield; }             // $0AF4: the next frame
      M[0x3A1] = M[0x3A0];
      M[0x38D] = 0;
    };

    P.passage_check = function (x) {                                   // $20CC
      cy('passage_check');
      M[0x9B] = M[0x3F70 + x]; M[0x9C] = M[0x3FB0 + x];
      let a = M[zp(0x9B)];
      if (a === 0xB1) { const w = where(x) + 0x20; M[0x3F70 + x] = w & 0xFF; M[0x3FB0 + x] = (w >> 8) & 0xFF; a = w & 0xFF; }
      else if (a === 0xB2) { const w = (where(x) - 0x20) & 0xFFFF; M[0x3F70 + x] = w & 0xFF; M[0x3FB0 + x] = w >> 8; a = w & 0xFF; }
      if (a === 0xA3) { const w = where(x) + 0x20; M[0x3F70 + x] = w & 0xFF; M[0x3FB0 + x] = (w >> 8) & 0xFF; }
    };
    P.passages_all = function () {                                     // $20BC
      cy('passages_all');
      for (let x = 0x21; x < 0x40; x++) P.passage_check(x);
      P.passage_check(0);
    };

    // ------------------------------------------------------------------ doors
    P.door_open = function () {                                        // $1BBF at the pointer $9B/$9C
      cy('door_open');
      let p = zp(0x9B);
      const c = M[p];
      if (c === 0xF0 || c === 0xF4) { M[p] = c | 1; M[(p + 0x80) & 0xFFFF] |= 1; }
      else if (c === 0xF2 || c === 0xF6) { M[p] = c | 1; p = (p - 0x80) & 0xFFFF; setzp(0x9B, p); M[p] |= 1; }
      else if (c === 0xF8 || c === 0xFC) { M[p] = c | 1; M[(p + 1) & 0xFFFF] |= 1; }
      else if (c === 0xFA || c === 0xFE) { M[p] = c | 1; p = (p - 1) & 0xFFFF; setzp(0x9B, p); M[p] |= 1; }
    };
    P.player_centre_if_on = function (y) {                             // $1C50
      cy('player_centre_if_on');
      setzp(0x9B, zp(0x9B) + y);
      if (M[0x3F70] === M[0x9B] && M[0x3FB0] === M[0x9C]) {
        M[0x3FF0] = 4; M[0x4030] = 4;
        M[0x3A00] = (M[0x3FF0] + 0x3E) & 0xFF; M[0x3A01] = (M[0x4030] + 0x58) & 0xFF;
      }
    };
    P.door_close = function () {                                       // $1C85
      cy('door_close');
      P.player_centre_if_on(0);
      let p = zp(0x9B), y = 0;
      const c = M[p];
      if (c === 0xF1 || c === 0xF5) { M[p] = c & 0xFE; y = 0x80; M[(p + 0x80) & 0xFFFF] &= 0xFE; }
      else if (c === 0xF3 || c === 0xF7) { M[p] = c & 0xFE; p = (p - 0x80) & 0xFFFF; setzp(0x9B, p); M[p] &= 0xFE; }
      else if (c === 0xF9 || c === 0xFD) { M[p] = c & 0xFE; y = 1; M[(p + 1) & 0xFFFF] &= 0xFE; }
      else if (c === 0xFB || c === 0xFF) { M[p] = c & 0xFE; p = (p - 1) & 0xFFFF; setzp(0x9B, p); M[p] &= 0xFE; }
      P.player_centre_if_on(y);
      P.view_refresh();
    };

    // ------------------------------------------------------------------ the message window
    P.message_new_line = function () {                                 // $28DD
      cy('message_new_line');
      let p = zp(0x3B0);
      let x = 0;
      for (;;) {
        let y = 0x28;
        for (;;) {
          const ch = M[(p + y) & 0xFFFF], co = rb(p + 0xD400 + y);
          y -= 0x28;
          wb(p + 0xD400 + y, co); M[(p + y) & 0xFFFF] = ch;
          y++;
          if (y === M[0x3B2]) break;
          y += 0x28;
        }
        p = (p + 0x28) & 0xFFFF;
        x += 2;
        if (x === M[0x3B3]) break;
        x--;
      }
      for (let y = 0; y < M[0x3B2]; y++) { M[(p + y) & 0xFFFF] = 0x20; wb(p + 0xD400 + y, 1); }
      setzp(0x9B, p); setzp(0x9D, p + 0xD400);
      M[0x3A3] = 0;
    };
    P.clear_message_window = function () {                             // $28AE
      cy('clear_message_window');
      let p = zp(0x3B0);
      for (let x = 0; x < M[0x3B3]; x++, p += 0x28) for (let y = 0; y < M[0x3B2]; y++) M[p + y] = 0x20;
      setzp(0x9B, p);
      M[0x3A3] = 0;
    };
    P.print_message = function (a) {                                   // $2941
      cy('print_message');
      setzp(0xF9, a);
      for (;;) {                                                       // $2945: the next word
        cy('print_message.word');
        M[0x9B] = M[0x3B4]; M[0x9D] = M[0x3B4]; M[0x9C] = M[0x3B5]; M[0x9E] = (M[0x3B5] + 0xD4) & 0xFF;
        M[0x3A4] = M[0x3A3];
        M[0x3A5] = 0;
        let y = 0;
        for (;;) {
          cy('print_message.measure');
          if (neg(M[(zp(0xF9) + y) & 0xFFFF] - 0x21)) break;
          inc(0x3A4);
          if (++y === 0xFF) return;
        }
        dec(0x3A4);                                                    // $2973
        if (!neg(M[0x3A4] - M[0x3B2])) { inc(0x3A4); P.message_new_line(); continue; }
        M[0x3A4] = M[0x3A3]; M[0x3A5] = 0;                             // $2987
        for (;;) {
          const c = M[(zp(0xF9) + M[0x3A5]) & 0xFFFF];
          if (c === 0) { M[0x3A3] = M[0x3A4]; return; }
          if (c === 0x20) {                                            // $29BB
            inc(0x3A4); inc(0x3A5);
            setzp(0xF9, zp(0xF9) + M[0x3A5]);
            M[0x3A3] = M[0x3A4];
            break;
          }
          if (neg(c - 0x20)) {                                         // $29DD: a colour code
            setzp(0xF9, zp(0xF9) + 1);
            M[0x3A6] = c & 0x0F;
            M[0x3A3] = M[0x3A4];
            break;
          }
          cy('print_message.char');
          const ch = neg(c - 0x40) ? c : (c - 0x40) & 0xFF;
          M[(zp(0x9B) + M[0x3A4]) & 0xFFFF] = ch;
          wb(zp(0x9D) + M[0x3A4], M[0x3A6]);
          inc(0x3A4); inc(0x3A5);
        }
      }
    };
    P.print_full_stop = function () { cy('print_full_stop'); P.print_message(0x4943); P.message_new_line(); };   // $29F1

    // ------------------------------------------------------------------ bars and clock
    P.draw_mind_body_bars = function () {                              // $2BDE
      cy('draw_mind_body_bars');
      let y = 0;
      M[0x3BB] = (M[0x4F46] << 1) & 0xFF;
      while (!neg(M[0x3BB] - 8)) { M[0x40D + y] = 0x29; y++; M[0x3BB] = (M[0x3BB] - 8) & 0xFF; }
      M[0x40D + y] = (M[0x3BB] + 0x21) & 0xFF;
      do { y++; M[0x40D + y] = 0x21; } while (neg(y - 8));
      y = 0;
      let a = (M[0x4EC5] + 1) & 0xFF;
      if (neg(a)) a = 0;
      M[0x3BB] = (a << 1) & 0xFF;
      while (!neg(M[0x3BB] - 8)) { M[0x417 + y] = 0x29; y++; M[0x3BB] = (M[0x3BB] - 8) & 0xFF; }
      M[0x417 + y] = (M[0x3BB] + 0x21) & 0xFF;
      do { y++; M[0x417 + y] = 0x21; } while (neg(y - 8));
    };
    P.advance_clock = function () {                                    // $2C50
      cy('advance_clock');
      if (dec(0x3BC) !== 0) return;
      M[0x3BC] = 8;
      const digit = (a, top) => { const v = M[a] + 1; if (v === top) { M[a] = 0x30; return true; } M[a] = v; return false; };
      if (!digit(0x427, 0x3A)) return;
      if (!digit(0x426, 0x36)) return;
      if (!digit(0x424, 0x3A)) return;
      if (!digit(0x423, 0x36)) return;
      if (!digit(0x421, 0x3A)) return;
      inc(0x420);
      M[0x421] = 0x30;
      if (M[0x420] === 0x3A) M[0x420] = 0x30;
    };

    // ------------------------------------------------------------------ the picture strip
    P.picture_slot_clear = function (x) {                              // $14C3
      cy('picture_slot_clear');
      M[0x9B] = M[0x57E3 + x]; M[0x9C] = M[0x57EF + x];
      M[0x58B3 + x] = 0;
      if (M[0x59BD + x] !== 0xFF) {
        const s = M[0x59BD + x];
        M[0x3A30] &= M[0x4960 + s] ^ 0xFF;
        M[0x59BD + x] = 0xFF; M[0x59C9 + s] = 0xFF;
      }
      for (let r = 0; r < 4; r++) {
        const p = zp(0x9B);
        for (let y = 0; y < 0x30; y++) M[(p + y) & 0xFFFF] = 0;
        setzp(0x9B, p + 0x140);
      }
    };
    P.pictures_clear_all = function () {                               // $149E
      cy('pictures_clear_all');
      for (let x = 0; x < 12; x++) P.picture_slot_clear(x);
      for (let y = 1; y < 0x44; y++) M[0x58BF + y] = 0xFF;
      M[0x59F9] = M[0x59FA] = M[0x59FB] = M[0x59FC] = 0;
    };
    function copyRows(srcLo, srcHi, dstLo, dstHi, x, y, n, rows, stride) {
      cy('picture_show.rows', rows); cy('picture_show.bytes', rows * n);
      setzp(0x9B, M[srcLo + x] | M[srcHi + x] << 8); setzp(0x9D, M[dstLo + y] | M[dstHi + y] << 8);
      for (let r = 0; r < rows; r++) {
        const s = zp(0x9B), d = zp(0x9D);
        for (let i = 0; i < n; i++) wb(d + i, rb(s + i));
        setzp(0x9B, s + stride); setzp(0x9D, d + stride);
      }
    }
    P.picture_show = function (x, tall) {                              // $1515
      cy('picture_show');
      M[0x3CC] = tall;
      M[0x3CD] = tall ? 8 : 4;
      let y = 0;
      for (;;) {
        if (M[0x58B3 + y] === 0) {
          if (!M[0x3CC]) break;
          y++;
          if (M[0x58B3 + y] === 0) { y--; break; }
        } else if (M[0x3CC]) y++;
        y++;
        if (y === 12) return;
      }
      M[0x58B3 + y] = x;
      if (M[0x3CC]) M[0x58B4 + y] = x;
      M[0x58BF + x] = y;
      M[0x3CA] = x; M[0x3CB] = y;
      if (!neg(x - 0x21) && neg(x - 0x40) && neg(M[0x4EC5 + x])) {
        let s = 0;
        while (s < 8 && M[0x59C9 + s] !== 0xFF) s++;
        if (s < 8) {
          M[0x59C9 + s] = y; M[0x59BD + y] = s;
          M[0x3A30] |= M[0x4960 + s];
          M[0x3A3D] &= M[0x4960 + s] ^ 0xFF;
          if (M[0x59E9 + y]) M[0x3A3D] |= M[0x4960 + s];
          M[0x3A20 + 2 * s] = M[0x59D1 + y]; M[0x3A21 + 2 * s] = M[0x59DD + y];
        }
      }
      const pic = M[0x582B + x];
      M[0x3CA] = pic; M[0x3CB] = y;
      copyRows(0x5941, 0x5960, 0x57FB, 0x5807, pic, y, 6, M[0x3CD], 0x28);
      copyRows(0x597F, 0x599E, 0x5813, 0x581F, pic, y, 6, M[0x3CD], 0x28);
      copyRows(0x5903, 0x5922, 0x57E3, 0x57EF, pic, y, 0x30, M[0x3CD], 0x140);
    };
    P.pictures_update = function () {                                  // $1695
      cy('pictures_update');
      for (let x = 1; x < 0x40; x++) {
        if (M[0x3EB0 + x]) {
          if (M[0x58BF + x] === 0xFF) P.picture_show(x, M[0x586F + x]);
        } else if (M[0x58BF + x] !== 0xFF) {
          M[0x3A7] = x;
          P.picture_slot_clear(M[0x58BF + x]);
          if (M[0x586F + x]) { M[0x3A7] = x; P.picture_slot_clear((M[0x58BF + x] + 1) & 0xFF); }
          M[0x58BF + x] = 0xFF;
        }
      }
      M[0x59F5] = M[0x59F6] = M[0x59F7] = M[0x59F8] = 0;
      let p = 0x400;
      for (let r = 0; r < 11; r++, p += 0x28) {
        for (let y = 0; y < 11; y++) {
          const a = M[p + y];
          if (a >= 0xF0) {
            if (!(a & 1)) inc(0x59F5);
            else if (!(a & 2)) inc(0x59F6);
          } else if (a === 0xB0) inc(0x59F7);
          else if (a === 0xB3) inc(0x59F8);
        }
      }
      setzp(0x63, p);
      for (let y = 0; y < 4; y++) P.picture_sync_feature(y);
    };
    P.picture_sync_feature = function (y) {                            // $1741
      cy('picture_sync_feature');
      for (;;) {
        const a = M[0x59F5 + y];
        if (a === M[0x59F9 + y]) return;
        if (!neg(a - M[0x59F9 + y])) {
          inc(0x59F9 + y);
          const x = M[0x3CFB + y];
          P.picture_show(x, M[0x586F + x]);
        } else {
          dec(0x59F9 + y);
          let x = 0;
          while (x < 12 && M[0x58B3 + x] !== M[0x3CFB + y]) x++;
          if (x === 12) continue;
          M[0x3A7] = x;
          P.picture_slot_clear(x);
          if (M[0x58AF + y]) P.picture_slot_clear((M[0x3A7] + 1) & 0xFF);
        }
      }
    };

    // ------------------------------------------------------------------ menus
    P.menu_clear = function () {                                       // $1106
      cy('menu_clear'); cy('menu_clear.cell', M[0x3BF] * M[0x3BE]);
      let p = zp(0x3C5);
      for (let x = 0; x < M[0x3BF]; x++) {
        for (let y = 0; y < M[0x3BE]; y++) { M[(p + y) & 0xFFFF] = 0x20; wb(p + 0xD400 + y, 1); }
        p = (p + M[0x3BE]) & 0xFFFF;
      }
      setzp(0x9B, p); setzp(0x9D, p + 0xD400);
      M[0x395] = M[0x3C5]; M[0x396] = M[0x3C6]; M[0x397] = 0;
    };
    P.menu_add_entry = function (value, str) {                         // $1151
      cy('menu_add_entry');
      setzp(0x9D, str);
      M[0x41C8 + M[0x397]] = value;
      if (M[0x397] === M[0x3BF]) return;
      M[0x9B] = M[0x395]; M[0x9C] = M[0x396];
      let y = 0;
      for (;;) {
        cy('menu_add_entry.char');
        const a = M[(zp(0x9D) + y) & 0xFFFF];
        if (a === 0) break;
        if (neg(a - 0x20)) {                                           // skipped; the carry of CMP #$20 decides $9E
          inc(0x9D);
          if (a >= 0x20) inc(0x9E);
        } else {
          M[(zp(0x9B) + y) & 0xFFFF] = neg(a - 0x40) ? a : (a - 0x40) & 0xFF;
          y++;
        }
        if (y === M[0x3BE]) break;
      }
      setzp(0x395, zp(0x395) + M[0x3BE]);
      inc(0x397);
    };
    P.menu_colour_slot = function (c) {                                // $1483
      cy('menu_colour_slot'); cy('menu_colour_slot.cell', M[0x3BE]);
      const p = (zp(0x9B) + 0xD400) & 0xFFFF;
      for (let y = 0; y < M[0x3BE]; y++) wb(p + y, c);
    };
    P.menu_choose = function* () {                                     // $1320
      cy('menu_choose');
      M[0x9B] = M[0x3C5]; M[0x9C] = M[0x3C6];
      M[0x399] = 0;
      for (;;) {                                                       // wait for fire to be released
        yield cp(0x132F); yield* P.read_input_demo();
        if (M[0x3C7]) return yield* P.menu_choose_leave();
        if (!M[0x387]) break;
      }
      yield* P.delay(5);
      M[0x3CE] = 0; P.menu_colour_slot(0);
      for (;;) {                                                       // $134E
        yield* P.delay(1);
        inc(0x3CE);
        if (M[0x3CE] === 0x14) P.menu_colour_slot(1);
        if (M[0x3CE] === 0x1E) { M[0x3CE] = 0; P.menu_colour_slot(0); }
        yield cp(0x1373); yield* P.read_input_demo();
        if (M[0x3C7] || M[0x387]) return yield* P.menu_choose_leave();
        if (!M[0x388] && !M[0x389]) continue;
        cy('menu_choose.move');
        M[0x398] = M[0x399];
        M[0x9D] = M[0x9B]; M[0x9E] = M[0x9C];
        if (M[0x388] === 1) {
          if (M[0x399] === M[0x3BF]) continue;
          setzp(0x9D, zp(0x9D) + M[0x3BE]); inc(0x399);
        } else if (M[0x388] === 0xFF) {
          if (M[0x399] === 0) continue;
          setzp(0x9D, zp(0x9D) - M[0x3BE]); dec(0x399);
        } else if (M[0x389] === 1) {
          if (!neg(M[0x399] - M[0x3C1])) continue;
          setzp(0x9D, zp(0x9D) + 0x28); M[0x399] = (M[0x399] + M[0x3C0]) & 0xFF;
        } else if (M[0x389] === 0xFF) {
          if (neg(M[0x399] - M[0x3C2])) continue;
          setzp(0x9D, zp(0x9D) - 0x28); M[0x399] = (M[0x399] - M[0x3C0]) & 0xFF;
        }
        if (M[zp(0x9D)] === 0x20) { M[0x399] = M[0x398]; continue; }   // $1437: an empty slot
        P.menu_colour_slot(1);
        M[0x9B] = M[0x9D]; M[0x9C] = M[0x9E];
        M[0x3CE] = 0; P.menu_colour_slot(0);
        yield* P.delay(0x1E);
      }
    };
    P.menu_choose_leave = function* () {                               // $1467
      cy('menu_choose_leave');
      yield* P.delay(5);
      for (;;) {
        yield cp(0x146C); yield* P.read_input_demo();
        if (M[0x3C7] || !M[0x387]) break;
      }
      P.menu_clear();
      return M[0x41C8 + M[0x399]];
    };
    P.menu_layout_normal = function () { cy('menu_layout'); M[0x3BE] = 0x0A; M[0x3BF] = 0x10; M[0x3C0] = 4; M[0x3C1] = 0x0C; M[0x3C2] = 4; };   // $3A79
    P.menu_layout_spells = function () { cy('menu_layout'); M[0x3BE] = 0x14; M[0x3BF] = 8; M[0x3C0] = 2; M[0x3C1] = 6; M[0x3C2] = 2; };        // $3A93
    P.menu_add_entity = function (x) {                                 // $3AAD
      cy('menu_add_entity');
      P.menu_add_entry(x, noun(x));
      P.picture_show(x, M[0x586F + x]);
    };
    P.main_menu_conditions = function () {                             // $128F
      cy('main_menu_conditions');
      for (const a of [0x3A9, 0x3AA, 0x3AB, 0x3AC, 0x3AD, 0x3AE, 0x3BD]) M[a] = 0;
      for (let x = 1; x < 0x21; x++) {
        if (M[0x3F70 + x] === M[0x3F70] && M[0x3FB0 + x] === M[0x3FB0]) inc(0x3A9);
        if (M[0x3F70 + x] || M[0x3FB0 + x]) continue;
        if (M[0x4A81 + x] && !M[0x4AC1 + x]) inc(0x3AA);
        if (M[0x4A41 + x]) inc(0x3AB);
        if (M[0x4AC1 + x] === 2) inc(0x3AC);
        if (M[0x4B41 + x]) inc(0x3BD);
      }
      if (M[0x4C01] !== 0xFF) inc(0x3AD);
      if (M[0x4C02] !== 0xFF) inc(0x3AD);
      for (let x = 0x21; x < 0x40; x++) if (M[0x3F70 + x] === M[0x3F70] && M[0x3FB0 + x] === M[0x3FB0]) inc(0x3AE);
    };
    P.main_menu = function* () {                                       // $11A2
      cy('main_menu');
      P.pictures_clear_all();
      P.pictures_update();
      P.main_menu_conditions();
      P.menu_clear();
      const add = P.menu_add_entry;
      add(1, 0x4136);
      if (M[0x3A9]) add(2, 0x413B);
      if (M[0x3AD]) { add(3, 0x4145); add(0x0D, 0x41A0); }
      add(4, 0x4150);
      const c = M[0x4CD];
      if (!neg(c - 0xF0)) { if (c & 1) add(6, 0x4161); else add(5, 0x415B); }
      if (M[0x3AA]) add(7, 0x4168);
      if (M[0x3AC]) add(8, 0x416F);
      if (M[0x3AB]) {
        if (M[0x3AD]) add(9, 0x417A);
        add(0x0A, 0x4182); add(0x0B, 0x418D);
      }
      if (M[0x3AE]) add(0x0C, 0x4197);
      add(0x0E, 0x41A6);
      if (M[0x3BD]) add(0x0F, 0x41B0);
      if (M[0x57D2] === 0xFF) add(0x10, 0x41B8);
      if (M[0x57D2] !== 0xFF) add(0x11, 0x41BF);
      return yield* P.menu_choose();
    };

    // ------------------------------------------------------------------ the verbs
    const pm = (a) => P.print_message(a), stop = () => P.print_full_stop(), nl = () => P.message_new_line();
    P.verb_walk = function* () { cy('verb_walk'); M[0x39A] = 2; P.pictures_clear_all(); };                  // $08B0
    P.verb_run = function* () { cy('verb_run'); M[0x39A] = 1; P.pictures_clear_all(); pm(0x4136); stop(); };   // $08B9

    P.sum_held_weight = function (y) {                                 // $2883
      cy('sum_held_weight');
      for (let x = 1; x < 0x21; x++) {
        if (M[0x3FB0 + x] || M[0x3F70 + x] !== y) continue;
        const s = M[0x4A01 + x] + M[0x3A2];
        M[0x3A2] = s & 0xFF;
        if (s > 0xFF) throw new Error('BRK at $28AD: weight past 255');
        P.sum_held_weight(x);
      }
    };
    const noFreeHand = () => { pm(0x47C1); nl(); };
    P.verb_pick_up = function* () {                                    // $195C
      cy('verb_pick_up');
      if (M[0x4C01] !== 0xFF && M[0x4C02] !== 0xFF) { noFreeHand(); P.view_refresh(); return; }
      P.menu_clear();
      P.pictures_clear_all();
      for (M[0x39B] = 1; M[0x39B] !== 0x21; inc(0x39B)) {
        const x = M[0x39B];
        if (M[0x3F70 + x] !== M[0x3F70] || M[0x3FB0 + x] !== M[0x3FB0]) continue;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      if (!M[0x397]) { P.view_refresh(); return; }
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x3A7] = x;
      pm(0x413B); pm(noun(x)); stop();
      M[0x3A2] = M[0x4A01 + x];
      P.sum_held_weight(0);
      P.sum_held_weight(M[0x3A7]);
      if (!neg(M[0x3A2] - 0x46)) { pm(0x46B2); nl(); P.view_refresh(); return; }
      M[0x3F70 + x] = 0; M[0x3FB0 + x] = 0;
      if (M[0x4C01] === 0xFF) M[0x4C01] = x; else M[0x4C02] = x;
      P.view_refresh();
    };
    const nameAndPicture = (x) => { pm(noun(x)); P.picture_show(x, M[0x586F + x]); };
    P.verb_inventory = function* () {                                  // $1A30
      cy('verb_inventory');
      P.pictures_clear_all();
      pm(0x476F);
      if (M[0x4C01] === 0xFF) pm(0x46A3); else nameAndPicture(M[0x4C01]);
      pm(0x4782);
      if (M[0x4C02] === 0xFF) pm(0x46A3); else nameAndPicture(M[0x4C02]);
      pm(0x4798);
      M[0x38E] = 0;
      for (let x = 1; x < 0x21; x++) {
        if (x === M[0x4C01] || x === M[0x4C02] || M[0x3F70 + x] || M[0x3FB0 + x]) continue;
        M[0x38F] = x;
        if (M[0x38E]) pm(0x4940);
        pm(noun(x));
        inc(0x38E);
        P.picture_show(x, M[0x586F + x]);
      }
      if (!M[0x38E]) pm(0x491B);
      stop();
    };
    P.verb_put_down = function* () {                                   // $1AED
      cy('verb_put_down');
      P.menu_clear();
      P.pictures_clear_all();
      for (const h of [0x4C01, 0x4C02]) {
        if (M[h] === 0xFF) continue;
        P.menu_add_entry(M[h], noun(M[h]));
        P.picture_show(M[h], M[0x586F + M[h]]);
      }
      if (!M[0x397]) return;
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x3F70 + x] = M[0x3F70]; M[0x3FB0 + x] = M[0x3FB0];
      if (x === M[0x4C01]) M[0x4C01] = 0xFF; else M[0x4C02] = 0xFF;
      M[0x3A7] = x;
      pm(0x4145); pm(noun(x)); stop();
      if (x === 0x15 && M[0x3F70] === 0x77 && M[0x3FB0] === 0x96) M[0x3C7] = 0x7B;   // the amulet on the pedestal
      P.view_refresh();
    };
    P.verb_open = function* () {                                       // $1B9D
      cy('verb_open');
      M[0x9B] = M[0x3F70]; M[0x9C] = M[0x3FB0];
      P.door_open();
      pm(0x415B); pm(0x4934); stop();
      P.view_refresh();
    };
    P.verb_close = function* () {                                      // $1C31
      cy('verb_close');
      M[0x9B] = M[0x3F70]; M[0x9C] = M[0x3FB0];
      P.door_close();
      pm(0x4161); pm(0x4934); stop();
    };
    P.verb_wear = function* () {                                       // $1D00
      cy('verb_wear');
      P.menu_clear();
      P.pictures_clear_all();
      for (const h of [0x4C01, 0x4C02]) {
        const x = M[h];
        if (x === 0xFF || !M[0x4A81 + x]) continue;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x4AC1 + x] = 2;
      if (x === M[0x4C01]) M[0x4C01] = 0xFF; else M[0x4C02] = 0xFF;
      M[0x3A7] = x;
      pm(0x4168); pm(noun(x)); stop();
    };
    P.verb_take_off = function* () {                                   // $1D8B
      cy('verb_take_off');
      P.menu_clear();
      if (M[0x4C01] !== 0xFF && M[0x4C02] !== 0xFF) { noFreeHand(); return; }
      P.pictures_clear_all();
      for (let x = 1; x < 0x21; x++) {
        if (M[0x3F70 + x] || M[0x3FB0 + x] || M[0x4AC1 + x] !== 2) continue;
        M[0x3A7] = x;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x4AC1 + x] = 0;
      if (M[0x4C01] === 0xFF) M[0x4C01] = x; else M[0x4C02] = x;
      M[0x3A7] = x;
      pm(0x416F); pm(noun(x)); stop();
    };
    P.verb_put_in = function* () {                                     // $1E21
      cy('verb_put_in');
      P.menu_clear();
      P.pictures_clear_all();
      for (const h of [0x4C01, 0x4C02]) {
        const x = M[h];
        if (x === 0xFF) continue;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const o = yield* P.menu_choose();
      if (o === 0xFF) return;
      M[0x3A7] = o;
      pm(0x47D0); pm(noun(o)); pm(0x47D6);
      P.pictures_clear_all();
      for (let x = 1; x < 0x21; x++) {
        if (M[0x3F70 + x] || M[0x3FB0 + x] || !M[0x4A41 + x] || x === M[0x3A7]) continue;
        M[0x3A8] = x;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const c = yield* P.menu_choose();
      if (c === 0xFF) { pm(0x46A3); stop(); return; }
      const y = M[0x3A7];
      if (y === M[0x4C01]) M[0x4C01] = 0xFF; else M[0x4C02] = 0xFF;
      M[0x4AC1 + y] = 1;
      M[0x3F70 + y] = c;
      pm(noun(c)); stop();
    };
    P.verb_take_out = function* () {                                   // $1F15
      cy('verb_take_out');
      if (M[0x4C01] !== 0xFF && M[0x4C02] !== 0xFF) { noFreeHand(); return; }
      P.menu_clear();
      P.pictures_clear_all();
      for (let x = 1; x < 0x21; x++) {
        if (M[0x4AC1 + x] !== 1) continue;
        const h = M[0x3F70 + x];
        if (M[0x3F70 + h] || M[0x3FB0 + h]) continue;
        M[0x3A7] = x;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x3A7] = x;
      pm(0x4182); pm(noun(x)); pm(0x47DB); pm(noun(M[0x3F70 + x])); stop();
      M[0x4AC1 + x] = 0; M[0x3F70 + x] = 0;
      if (M[0x4C01] === 0xFF) M[0x4C01] = x; else M[0x4C02] = x;
    };
    P.verb_look_in = function* () {                                    // $1FCB
      cy('verb_look_in');
      P.menu_clear();
      P.pictures_clear_all();
      for (let x = 1; x < 0x21; x++) {
        if (M[0x3F70 + x] || M[0x3FB0 + x] || !M[0x4A41 + x]) continue;
        M[0x3A7] = x;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const c = yield* P.menu_choose();
      if (c === 0xFF) return;
      M[0x3A7] = c;
      pm(0x418D); pm(noun(c)); stop();
      pm(0x47E2); pm(noun(c)); pm(0x47EB);
      P.pictures_clear_all();
      M[0x390] = 0;
      for (let x = 1; x < 0x21; x++) {
        if (M[0x4AC1 + x] !== 1 || M[0x3F70 + x] !== M[0x3A7]) continue;
        M[0x3A8] = x;
        if (M[0x390]) pm(0x4940);
        inc(0x390);
        pm(noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      if (!M[0x390]) pm(0x46A3);
      stop();
    };
    P.verb_swap = function* () {                                       // $20A5
      cy('verb_swap');
      pm(0x4868); nl();
      const x = M[0x4C01], y = M[0x4C02];
      M[0x4C02] = x; M[0x4C01] = y;
    };
    P.verb_examine = function* () {                                    // $2CD4
      cy('verb_examine');
      P.menu_clear();
      P.pictures_clear_all();
      if (M[0x3F70] === 0x77 && M[0x3FB0] === 0x96) P.menu_add_entry(0x40, noun(0x40));
      for (let x = 1; x < 0x40; x++) {
        if (!M[0x3FB0 + x] && !M[0x3F70 + x]) P.menu_add_entity(x);
        else if (M[0x3FB0 + x] === M[0x3FB0] && M[0x3F70 + x] === M[0x3F70]) P.menu_add_entity(x);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x3A7] = x;
      pm(0x41A6); pm(noun(x)); stop();
      const d = M[0x571E + x];
      pm(M[0x575F + d] | M[0x577B + d] << 8); stop();
    };
    P.verb_drink = function* () {                                      // $2D5E
      cy('verb_drink');
      P.menu_clear();
      P.pictures_clear_all();
      for (let x = 1; x < 0x21; x++) if (!M[0x3FB0 + x] && !M[0x3F70 + x] && M[0x4B41 + x]) P.menu_add_entity(x);
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) return;
      M[0x3A7] = x;
      pm(0x41B0); pm(noun(x)); stop();
      M[0x3FB0 + x] = 0; M[0x3F70 + x] = 0xFF;
      if (x === 0x0B || x === 0x0F) {
        let a = ((rnd() & 7) + 8 + M[0x4EC5]) & 0xFF;
        if (!neg(a - M[0x4E85])) a = M[0x4E85];
        M[0x4EC5] = a;
      } else if (x === 0x0C) {
        let a = ((rnd() & 7) + 8 + M[0x4F46]) & 0xFF;
        if (!neg(a - M[0x4F05])) a = M[0x4F05];
        M[0x4F46] = a;
      } else if (x === 0x0D) M[0x4EC5] >>= 1;
      else if (x === 0x0E) M[0x4F46] >>= 1;
      if (M[0x4C01] === M[0x3A7]) M[0x4C01] = 0xFF;
      if (M[0x4C02] === M[0x3A7]) M[0x4C02] = 0xFF;
      P.draw_mind_body_bars();
    };

    // ---- combat
    P.drop_possessions = function (x) {                                // $3B63
      cy('drop_possessions');
      for (let y = 1; y < 0x21; y++) {
        if (M[0x3FB0 + y] || M[0x3F70 + y] !== x) continue;
        M[0x3F70 + y] = M[0x3F70 + x]; M[0x3FB0 + y] = M[0x3FB0 + x];
        M[0x4AC1 + y] = 0;
      }
    };
    P.attack_special_roll = function (a, x) {                          // $2B5F (only the third test can pass)
      cy('attack_special_roll');
      const w = M[0x3A8];
      if (w === 0x16 && w === 0x17 && !neg(x - 0x28) && neg(x - 0x30)) a = (a + 8) & 0xFF;
      if (w === 5 && x === 0x3D && x === 0x3E) a = M[0x4E04];
      if (w === 6 && x === 0x3F) a = M[0x4E06];
      return a;
    };
    P.verb_attack = function* () {                                     // $29FC
      cy('verb_attack');
      pm(0x4197);
      P.menu_clear();
      P.pictures_clear_all();
      for (let x = 0x21; x < 0x40; x++) {
        if (M[0x3F70 + x] !== M[0x3F70] || M[0x3FB0 + x] !== M[0x3FB0] || neg(M[0x4EC5 + x])) continue;
        M[0x3A7] = x;
        P.menu_add_entry(x, noun(x));
        P.picture_show(x, M[0x586F + x]);
      }
      P.menu_add_entry(0xFF, 0x46A3);
      const t = yield* P.menu_choose();
      if (t === 0xFF) { pm(0x46A3); stop(); return; }
      M[0x3A7] = t;
      pm(noun(t)); pm(0x47F9);
      let w = M[0x4C01];
      if (w === 0xFF) w = 0;
      else if (!M[0x4B01 + w]) { nl(); pm(0x4800); nl(); return; }
      M[0x3A8] = w;
      if (neg(M[0x4EC5 + t])) { nl(); pm(0x4853); nl(); return; }
      if (w === 0) pm(0x4827); else pm(noun(w));
      stop();
      let a = ((rnd() & 0x1F) + M[0x4E05]) & 0xFF;                    // $2ACC
      if (M[0x4AD3] === 2) a = (a + 8) & 0xFF;
      a = P.attack_special_roll(a, t);
      if (neg(a - M[0x4DC7 + t])) { pm(0x482C); nl(); return; }
      pm(0x4839); nl();
      M[0x38A] = rnd() & M[0x4E45 + M[0x3A8]];
      M[0x38A] = ((M[0x4D89] >> 3) + M[0x38A]) & 0xFF;
      if (M[0x3A8] === 6 && M[0x3A7] === 0x3F) M[0x38A] = 0x1E;
      if (M[0x3A8] === 5 && !neg(M[0x3A7] - 0x3D) && neg(M[0x3A7] - 0x3F)) M[0x38A] = 0x1E;
      const x = M[0x3A7], b = M[0x4EC5 + x] - M[0x38A];
      M[0x4EC5 + x] = b & 0xFF;
      if (b < 0) { P.drop_possessions(x); pm(0x4843); nl(); }
    };

    // ---- magic
    P.spell_hit_creature = function (dmg) {                            // $3AC7, the target in $03A7
      cy('spell_hit_creature');
      M[0x3A8] = dmg;
      let x = M[0x3A7];
      if (neg(M[0x4EC5 + x])) return;
      rnd();
      const a = (0x1F + M[0x57D4]) & 0xFF;
      if (neg(a - M[0x4DC7 + x])) return;
      rnd();
      x = M[0x3A7];
      const b = M[0x4EC5 + x] - M[0x3A8];
      M[0x4EC5 + x] = b & 0xFF;
      if (b >= 0) return;
      M[0x4EC5 + x] = 0xFF;
      P.drop_possessions(x);
      pm(0x490A); pm(noun(M[0x3A7])); stop();
    };
    P.choose_creature_in_sight = function* () {                        // $3B17
      cy('choose_creature_in_sight');
      P.menu_clear();
      P.pictures_clear_all();
      for (let x = 0x21; x < 0x40; x++) if (M[0x3EB0 + x] && !neg(M[0x4EC5 + x])) P.menu_add_entity(x);
      P.menu_add_entry(0xFF, 0x46A3);
      const x = yield* P.menu_choose();
      if (x === 0xFF) { pm(0x46A3); stop(); return 0xFF; }
      M[0x3A7] = x;
      pm(noun(x)); stop();
      return x;
    };
    P.uncast = function () {                                           // $2F22
      cy('uncast');
      pm(0x41BF);
      pm(M[0x57CA + M[0x57D2]] | M[0x57CE + M[0x57D2]] << 8);
      stop();
      M[0x3C3] = 0; M[0x3C4] = 0;
      const x = M[0x57D2];
      M[0x57D2] = 0xFF;
      if (x === 2) M[0x57D3] = 0;
    };
    P.verb_uncast = function* () { cy('verb_uncast'); P.uncast(); };
    P.verb_cast = function* () {                                       // $2E23
      cy('verb_cast');
      P.menu_layout_spells();
      P.menu_clear();
      for (let a = 0; a < 4; a++) P.menu_add_entry(a, M[0x57CA + a] | M[0x57CE + a] << 8);
      P.menu_add_entry(0xFF, 0x46A3);
      M[0x3A7] = yield* P.menu_choose();
      P.menu_layout_normal();
      if (M[0x3A7] === 0xFF) return;
      const x = M[0x3A7];
      pm(0x41B8); pm(M[0x57CA + x] | M[0x57CE + x] << 8);
      if (neg(M[0x4F46] - M[0x57D5 + x])) {
        M[0x4F46] = 0; P.draw_mind_body_bars(); stop(); pm(0x48B9); stop();
        return;
      }
      M[0x4F46] = (M[0x4F46] - M[0x57D5 + x]) & 0xFF;
      if (M[0x57D9 + x]) M[0x57D2] = x;
      if (x === 2) { M[0x57D3] = 8; stop(); return; }
      if (x === 0 || x === 3) {
        pm(0x4905);
        const t = yield* P.choose_creature_in_sight();
        if (t === 0xFF) return;
        M[0x3A7] = t;
        M[0x57D4] = x === 0 ? 0x14 : 0x3C;
        P.spell_hit_creature(x === 0 ? 0x0F : 0x07);
        return;
      }
      if (x === 1) {
        stop();
        for (let t = 0x21; t < 0x40; t++) {
          if (!M[0x3EB0 + t] || !neg(M[0x5041 + t] - 0x11)) continue;
          M[0x3A7] = t;
          M[0x57D4] = 0x3C;
          P.spell_hit_creature(0x0F);
        }
      }
    };
    P.spell_upkeep = function () {                                     // $3A40
      cy('spell_upkeep');
      const x = M[0x57D2];
      if (x === 0xFF) return;
      if (inc(0x3C3) !== 0x64) return;
      M[0x3C3] = 0;
      if (inc(0x3C4) !== M[0x57D9 + x]) return;
      M[0x3C4] = 0;
      if (dec(0x4F46) === 0xFF) { M[0x4F46] = 0; P.uncast(); }
    };

    // ------------------------------------------------------------------ the creatures
    P.direction_from_delta = function () {                             // $2114
      cy('direction_from_delta');
      M[0x392] = 0;
      M[0x38F] = M[0x38A] & 0x7F; if (!(M[0x38A] & 0x80)) M[0x392] |= 2;
      M[0x390] = M[0x38E] & 0x7F; if (!(M[0x38E] & 0x80)) M[0x392] |= 4;
      if (neg(M[0x38F] - M[0x390])) { const t = M[0x38F]; M[0x38F] = M[0x390]; M[0x390] = t; M[0x392] |= 1; }
      M[0x393] = 0xFF;
      if (M[0x390] === 0) {
        if (M[0x38F] === 0) return 0xFF;
        M[0x393] = 0x20;
      } else {
        let a = M[0x38F], c;
        do { cy('direction_from_delta.divide'); c = a >= M[0x390]; a = (a - M[0x390]) & 0xFF; inc(0x393); } while (c);
      }
      if (!neg(M[0x393] - 2)) M[0x392] |= 8;
      return M[0x4947 + M[0x392]];
    };
    P.direction_towards = function () {                                // $219B: from $038F/$0390 to $0391/$0392
      cy('direction_towards');
      let a = (M[0x391] & 0x7F) - (M[0x38F] & 0x7F);
      M[0x38A] = a & 0xFF;
      if (a < 0) M[0x38A] = ((((a & 0xFF) ^ 0xFF) + 1) | 0x80) & 0xFF;
      M[0x38E] = ((M[0x390] << 1) | (M[0x38F] >> 7)) & 0xFF;
      M[0x392] = ((M[0x392] << 1) | (M[0x391] >> 7)) & 0xFF;
      a = M[0x392] - M[0x38E];
      M[0x38E] = a & 0xFF;
      if (a < 0) M[0x38E] = ((((a & 0xFF) ^ 0xFF) + 1) | 0x80) & 0xFF;
      return P.direction_from_delta();
    };
    const setRoute = (fromLo, fromHi, toLo, toHi) => { M[0x38F] = fromLo; M[0x390] = fromHi; M[0x391] = toLo; M[0x392] = toHi; };

    P.creature_choose_move = function (y, want) {                      // $2566
      cy('creature_choose_move');
      let x = want;
      M[0x38A] = 0; M[0x3B9] = 0; M[0x38E] = 0;
      M[0x9B] = M[0x3F70 + y]; M[0x9C] = M[0x3FB0 + y];
      M[0x25A7] = M[0x5001 + y] ? 0xA0 : 0xA1;                        // the operand of LDA $A100,Y at $25A5
      M[0x9D] = M[0x4968 + x]; M[0x9E] = M[0x4970 + x];
      M[0x49B8] = M[0x49B9 + y];
      const exits = M[(M[0x25A7] << 8) | M[zp(0x9B)]];
      for (;;) {
        cy('creature_choose_move.try');
        x = M[(zp(0x9D) + M[0x38A]) & 0xFFFF];
        if (x !== M[0x49B8] && (exits & M[0x4960 + x])) { M[0x49B8] = M[0x49F9 + x]; break; }
        inc(0x38A);
        if (neg(M[0x38A] - 6)) continue;
        x = M[0x49B8]; M[0x49B8] = M[0x49F9 + x];                      // none open: back the way it came
        break;
      }
      if (!(M[0xA100 + M[zp(0x9B)]] & M[0x4960 + x])) M[0x3B9] = 1;
      M[0x40B0 + y] = x; M[0x40F0 + y] = 0; M[0x49B9 + y] = M[0x49B8];
      M[0x3BA] = y;
      if (M[0x4FE2 + y]) { M[0x4FE2 + y] = 0; P.door_close(); }
      if (M[0x3B9]) { P.door_open(); M[0x4FE2 + M[0x3BA]] = 1; }
    };
    P.creature_attack_player = function (y) {                          // $23F9
      cy('creature_attack_player');
      M[0x40F0 + y] = M[0x4FC3 + y];
      M[0x40B0 + y] = 8;
      M[0x3A7] = y;
      pm(0x4875); pm(noun(y)); pm(0x487B);
      M[0x3A8] = 0;
      for (let x = 1; x < 0x21; x++) if (!M[0x3FB0 + x] && M[0x3F70 + x] === M[0x3A7] && M[0x4B01 + x]) M[0x3A8] = x;
      let mask;
      if (M[0x3A8]) { pm(noun(M[0x3A8])); stop(); mask = M[0x4E45 + M[0x3A8]]; }
      else {
        const k = M[0x4F66 + M[0x3A7]];
        pm(M[0x4FA6 + k] | M[0x4FAC + k] << 8); stop();
        mask = M[0x4FDE + M[0x4F66 + M[0x3A7]]];
      }
      M[0x38A] = mask;
      let a = ((rnd() & 0x1F) + M[0x4E05 + M[0x3A7]]) & 0xFF;
      a = (a - M[0x57D3]) & 0xFF;
      a = P.player_protection(a);
      if (neg(a - M[0x4DC7])) { pm(0x4894); nl(); return; }
      pm(0x48A0); nl();
      M[0x38A] = rnd() & M[0x38A];
      M[0x38A] = ((M[0x4D89 + M[0x3A7]] >> 3) + M[0x38A]) & 0xFF;
      M[0x4EC5] = (M[0x4EC5] - M[0x38A]) & 0xFF;                      // $24CC
      if (neg(M[0x4EC5])) { pm(0x48A9); M[0x3C7] = 1; P.draw_mind_body_bars(); }
    };
    P.player_protection = function (a) {                               // $24F1
      cy('player_protection');
      if (M[0x4A82] === 1 && !M[0x3F71] && !M[0x3FB1]) a = (a - 5) & 0xFF;
      if (M[0x4A83] === 1 && !M[0x3F72] && !M[0x3FB2]) a = (a - 2) & 0xFF;
      if (M[0x4A91] === 1 && !M[0x3F80] && !M[0x3FC0]) a = (a + 8) & 0xFF;
      if (M[0x4A92] === 1 && !M[0x3F81] && !M[0x3FC1]) a = (a - 4) & 0xFF;
      return a;                                                        // the shield tests never pass
    };
    P.creature_decide = function (y) {                                 // $2308
      cy('creature_decide');
      if (M[0x3EB0 + y]) {                                             // $2367
        M[0x4D2A + y] = M[0x4D49 + y] & 0x7F;
        if (M[0x4D49 + y] & 0x80) M[0x4CEC + y] = 1; else M[0x4D0B + y] = 1;
      }
      if (M[0x3F70 + y] === M[0x3F70] && M[0x3FB0 + y] === M[0x3FB0] && !(M[0x4D49 + y] & 0x80)) { P.creature_attack_player(y); return; }
      if (M[0x4CEC + y]) {
        if (M[0x4D2A + y] === 0) M[0x4CEC + y] = 0; else dec(0x4D2A + y);
        setRoute(M[0x4C4F + y], M[0x4C8F + y], M[0x3F70 + y], M[0x3FB0 + y]);   // $23AF flee
        const d = P.direction_towards();
        if (d === 0xFF) P.creature_go_home(y); else P.creature_choose_move(y, d);
        return;
      }
      if (M[0x4D0B + y]) {
        if (M[0x4D2A + y] === 0) M[0x4D0B + y] = 0; else dec(0x4D2A + y);
        setRoute(M[0x3F70 + y], M[0x3FB0 + y], M[0x4C4F + y], M[0x4C8F + y]);   // $2381 chase
        let d = P.direction_towards();
        if (d === 0xFF) d = M[0x49F9 + M[0x49B9 + y]];
        P.creature_choose_move(y, d);
        return;
      }
      P.creature_go_home(y);
    };
    P.creature_go_home = function (y) {                                // $23D5
      cy('creature_go_home');
      setRoute(M[0x3F70 + y], M[0x3FB0 + y], M[0x4CAE + y], M[0x4CCD + y]);
      const d = P.direction_towards();
      if (d !== 0xFF) P.creature_choose_move(y, d);
    };
    P.creature_step = function (y) {                                   // $222E
      cy('creature_step');
      if (M[0x40B0 + y] === 0xFF) { P.creature_decide(y); return; }
      if (M[0x59DC + y] && M[0x3EB0 + y]) {
        if (dec(0x5A1C + y) === 0) { M[0x5A1C + y] = 3; M[0x3CF] = 1; }   // a walking creature's footstep
      }
      const bits = M[0x4957 + M[0x40B0 + y]], x = y;
      M[0x38A] = y;
      if (bits & 1) {
        if (dec(0x4030 + x) === 0xFF) { M[0x4030 + x] = 7; const w = (where(x) - 0x80) & 0xFFFF; M[0x3F70 + x] = w & 0xFF; M[0x3FB0 + x] = w >> 8; }
      }
      if (bits & 2) {
        if (inc(0x4030 + x) === 8) { M[0x4030 + x] = 0; const w = (where(x) + 0x80) & 0xFFFF; M[0x3F70 + x] = w & 0xFF; M[0x3FB0 + x] = w >> 8; }
      }
      if (bits & 4) {
        if (dec(0x3FF0 + x) === 0xFF) { M[0x3FF0 + x] = 7; if (dec(0x3F70 + x) === 0xFF) dec(0x3FB0 + x); }
      }
      if (bits & 8) {
        if (inc(0x3FF0 + x) === 8) { M[0x3FF0 + x] = 0; if (inc(0x3F70 + x) === 0) inc(0x3FB0 + x); }
      }
      M[0x38A] = x;
      if (inc(0x40F0 + x) === 8) M[0x40B0 + y] = 0xFF;
    };
    P.creatures_tick = function () {                                   // $2205
      cy('creatures_tick');
      for (let y = 0x21; y < 0x40; y++) {
        cy('creatures_tick.creature');
        if (M[0x3C7]) return;
        if (neg(M[0x4EC5 + y])) continue;
        cy('creatures_tick.alive');
        if (inc(0x4BC1 + y) === M[0x4B81 + y]) { M[0x4BC1 + y] = 0; P.creature_step(y); }
      }
    };
    P.wanderers_new_goals = function () {                              // $3B87
      cy('wanderers_new_goals');
      if (inc(0x3C8) !== 0x32) return;
      M[0x3C8] = 0;
      for (const x of [0x22, 0x23, 0x2A, 0x2B, 0x2E, 0x33, 0x35]) {   // $3BBA
        M[0x4CAE + x] = rnd();
        M[0x4CCD + x] = (rnd() & 0x0F) | 0x90;
      }
    };

    // ------------------------------------------------------------------ the world pass, $08CC
    P.run_world = function* () {
      for (;;) {
        yield cp(0x08CC);
        cy('run_world');
        M[0x38C] = 0;
        do {
          yield cp(0x08D1); P.view_cast_ray();
          yield cp(0x08D4); P.creatures_tick();
        } while (inc(0x38C) !== 6);
        yield cp(0x08E1); P.wanderers_new_goals();
        yield cp(0x08E4); P.draw_mind_body_bars();
        if (M[0x3C7]) return;
        yield cp(0x08ED); P.advance_clock();
        yield cp(0x08F0); P.spell_upkeep();
        if (M[0x3AF] === 0) {
          yield cp(0x08F8); yield* P.player_move_tick();
          yield cp(0x08FB); P.pictures_update();
        }
        yield cp(0x08FE); P.draw_entity_sprites();
        yield cp(0x0901); P.passages_all();
        if (M[0x387]) {                                                // fire: wait a frame, and stop unless a wall was hit
          yield cp(0x0914);
          const f = M[0x3A0];
          while (M[0x3A0] === f) { cy('frame_wait'); yield; }
          if (M[0x38D] & 1) continue;
          return;
        }
        if (M[0x3AF] === 0) continue;
        if (dec(0x3AF) !== 0) continue;
        return;
      }
    };

    const HANDLERS = {
      0x08B0: 'verb_walk', 0x08B9: 'verb_run', 0x195C: 'verb_pick_up', 0x1AED: 'verb_put_down', 0x1A30: 'verb_inventory',
      0x1B9D: 'verb_open', 0x1C31: 'verb_close', 0x1D00: 'verb_wear', 0x1D8B: 'verb_take_off', 0x1E21: 'verb_put_in',
      0x1F15: 'verb_take_out', 0x1FCB: 'verb_look_in', 0x29FC: 'verb_attack', 0x20A5: 'verb_swap', 0x2CD4: 'verb_examine',
      0x2D5E: 'verb_drink', 0x2E23: 'verb_cast', 0x2F22: 'verb_uncast',
    };

    // ------------------------------------------------------------------ a new game, $0924
    P.new_game = function () {
      cy('new_game');
      for (const a of [0x3C7, 0x380, 0x39F, 0x3D8, 0x38B, 0x3C3, 0x3C4, 0x3A11, 0x3A12, 0x3A13, 0x3A14, 0x3A30]) M[a] = 0;
      for (let y = 0; y < 0x40; y++) {
        M[0x3F70 + y] = M[0x3EF0 + y]; M[0x3FB0 + y] = M[0x3F30 + y];
        M[0x40B0 + y] = 0xFF;
        M[0x4AC1 + y] = 0; M[0x4BC1 + y] = 0; M[0x4CEC + y] = 0; M[0x4D0B + y] = 0;
        M[0x4EC5 + y] = M[0x4E85 + y];
        M[0x4F46 + y] = M[0x4F05 + y];
        M[0x3FF0 + y] = 4; M[0x4030 + y] = 4;
        M[0x5A1C + y] = 1;
      }
      M[0x4ADA] = 1;
      for (let y = 0; y < 12; y++) M[0x59BD + y] = 0xFF;
      M[0x57D2] = 0xFF; M[0x57D3] = 0; M[0x4C02] = 0xFF; M[0x4C01] = 0xFF;
      for (let a = 0x9000; a < 0xA000; a++) {                          // $09AE: every door shut
        const c = M[a];
        if (c >= 0xF0 && (c & 1)) M[a] = c & 0xFE;
      }
      M[0x63] = 0; M[0x64] = 0xA0;
      M[0x3C5] = 0xE0; M[0x3C6] = 0x05;                                // $09D5
      P.menu_layout_normal();
      M[0x39C] = 1; M[0x394] = 1; M[0x3D0] = 1; M[0x3A6] = 1;
      P.view_clear_cells();
      M[0x3BC] = 4;
      M[0x3B0] = 0x5C; M[0x3B1] = 0x04; M[0x3B2] = 0x1B; M[0x3B3] = 8; M[0x3B4] = 0x74; M[0x3B5] = 0x05;
      vw(0x16, vr(0x16) | 0x10);                                       // $0A18: the play screen
      vw(0x18, 0x1C); vw(0x20, 6); vw(0x21, 7); vw(0x22, 0x0B); vw(0x23, 0x0C);
      P.print_via_chrout(0x50FA);                                      // the frame
      P.rom_chrout(0x08);
      for (let x = 0; x < 0x200; x++) M[0x3800 + x] = 0;
      M[0x3800] = 0x60; M[0x3803] = 0xF0; M[0x3806] = 0xF0; M[0x3809] = 0x60;
      for (let x = 0; x < 8; x++) { M[0x7F8 + x] = 0xE0 + x; M[0x59C9 + x] = 0xFF; M[0xABF8 + x] = 0x94; }
      M[0x3D4] = 0x42; M[0x3D5] = 0xA5; M[0x3D6] = 7; M[0x3D7] = 0xFF;   // $0A7E
      P.music_init(0);
      // $0D1F player_sprite_init
      M[0x3A10] |= 1; M[0x3A00] = (0x3E + M[0x3FF0]) & 0xFF; M[0x3A01] = (0x58 + M[0x4030]) & 0xFF;
      M[0x3A15] = 7; M[0x7F8] = 0xE0;
      P.view_refresh();
      P.play_irq_install();
      P.clear_message_window();
      pm(0x46D6); pm(0x476E); nl();
      P.copy_block(0x57DD);
      P.pictures_clear_all();
    };

    // ------------------------------------------------------------------ the main loop, $0824
    P.main_loop = function* () {
      for (;;) {
        yield cp(0x0824); P.draw_mind_body_bars();
        if (M[0x3C7]) return;
        yield cp(0x082C);
        const v = yield* P.main_menu();
        M[0x3AF] = M[0x4C27 + v];
        const k = M[0x4C3A + v];
        M[0x847] = M[0x4C03 + k]; M[0x848] = M[0x4C04 + k];             // the dispatch JSR's operand
        const h = HANDLERS[M[0x847] | M[0x848] << 8];
        if (!h) throw new Error('no verb handler at $' + (M[0x847] | M[0x848] << 8).toString(16));
        yield cp(0x0846); yield* P[h]();
        yield cp(0x0849); yield* P.run_world();
        if (M[0x3C7]) return;
      }
    };
    P.game_over = function* () {                                       // $0851
      cy('game_over');
      if (M[0x3C7] === 0x7B) {                                         // the win
        yield cp(0x0858); pm(0x5A5C);
        P.music_init(2);
        M[0x3D1] = 1;
      } else {
        yield cp(0x086C); P.music_init(1);
        M[0x3D1] = 1;
      }
      yield cp(0x0876);                                                // $0876 game_over_wait
      if (M[0x3D8]) return;
      yield* P.delay(0xFF);
      M[0x38A] = 0; M[0x38E] = 0; M[0x38F] = 0;
      for (;;) {
        yield cp(0x088B); yield* P.read_input_demo();
        if (M[0x387]) { yield cp(0x08AA); yield* P.wait_fire_press(); return; }
        if (inc(0x38A) !== 0) continue;
        if (inc(0x38E) !== 0) continue;
        if (inc(0x38F) === 0x0A) return;
      }
    };

    return P;
  }

  // The machine as the game starts it, for the page and for test_play.js alike: the listing's bytes
  // (ram, 64 KB), with the bytes the game changes as it runs put back as the file loads them
  // (IMG.blocks, [address, base64]), the entry's first instructions at $07F9 (SEI CLD LDX #$FF TXS
  // LDA #$2F STA $00, in the sprite pointers that a new game writes over), and the two KERNAL
  // variables it reads before it sets them: PAL in $02A6, and the light blue text of a machine just
  // switched on in $0286.
  function memory(ram, IMG) {
    const M = Uint8Array.from(ram);
    for (const [a, s] of IMG.blocks) M.set(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), a);
    [0x78, 0xD8, 0xA2, 0xFF, 0x9A, 0xA9, 0x2F, 0x85, 0x00].forEach((v, i) => { M[0x07F9 + i] = v; });
    M[0x2A6] = 1; M[0x286] = 14;
    return M;
  }

  return { create, memory, ROM, CHECKPOINTS };
})();
