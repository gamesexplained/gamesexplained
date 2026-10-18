/* jsw-port */
// Jet Set Willy, ported routine by routine from the listing (listing.json), for the Play tab and for
// test_play.js, which runs it beside the game's own code in the kit's lockstep. The port runs on the
// game's 64 KB (M) and keeps every variable where the game keeps it: the zero page at $07-$63, the
// rope's state at $0400-$0408 and its staged sprites at $0500-$05C5, the room's record at $0840 and
// its guardians at $0940-$098F, the player's own bytes at $1011-$101A and $14C0, the 80 item records
// at $22C3 (taken flags among them), the arrows at $2403, the screen at $7C00, the glyphs it builds
// at $7908-$79F7, the conveyor glyph rows it rotates in every room's record, and the vectors the game
// sets at $CFF0-$CFFD. What it does not keep are the processor's registers and the stack.
//
// JSWPort.create(M, io) gives P. P.program() is the whole program from the crackers' start-up at
// $080D as a generator, which yields where the game's code has got to: { cp: a } at the calls in its
// loops (the title's at $A7D3, the play loop's at $30FF-$3392, the player update's at $3349, each
// read of a collision register, the room's build step by step, the death and the game over), and
// { cycles: n } inside the long sound sweeps, so that a page's clock moves through them.
// P.title_irq() ($A801) and P.game_irq() ($33E1) are the raster interrupts. io is the chips: vicRead(r), vicWrite(r, v), sidWrite(r, v),
// colourWrite(i, v), ciaRead(r), ciaWrite(r, v), cia2Read(r), cia2Write(r, v), read(a), write(a, v);
// irqByte(a), a byte an interrupt writes as the main program reads it (on a page, M[a]); and
// collide(r), the collision register $D01E or $D01F as a read of it gives it, which clears it on a
// page. P.I is the processor's interrupt mask as the game sets it with SEI and CLI: a page does not
// run an interrupt while it is set.
//
// The player update ends by jumping through the game's vectors from wherever it is, however deep in
// its calls, and the game resets the stack where they lead. The port throws instead: AGAIN ($101E,
// the update again from the top), STAGE ($107B) and DISPATCH ($107E, back into the update's dispatch),
// CONT ($1021, the rest of the main loop), ROOM ($1027, a new room) and KILL ($102A, the death).
globalThis.JSWPort = (function () {
  'use strict';
  // NMOS decimal-mode addition, as the 6510 does it (Bruce Clark, "Decimal Mode", 6502.org,
  // appendix A): the result | the carry << 8. The item count is the one sum the game makes in it.
  function adcD(a, b, c) {
    let al = (a & 15) + (b & 15) + c;
    if (al >= 10) al = ((al + 6) & 15) + 16;
    let s = (a & 0xF0) + (b & 0xF0) + al;
    if (s >= 0xA0) s += 0x60;
    return (s & 255) | (s >= 0x100 ? 0x100 : 0);
  }
  const AGAIN = { to: 0x101E }, STAGE = { to: 0x107B }, DISPATCH = { to: 0x107E };
  const CONT = { to: 0x1021 }, ROOM = { to: 0x1027 }, KILL = { to: 0x102A };

  function create(M, io) {
    const P = { M, io, I: 1 };
    // the processor port: with $01 at $34 the game sees RAM under the chips, at $36 the chips
    const IO = (a) => a >= 0xD000 && a < 0xE000 && (M[1] & 3) !== 0 && (M[1] & 4) !== 0;
    const wb = (a, v) => { a &= 0xFFFF; if (IO(a)) P.io.write(a, v & 255); else M[a] = v & 255; };
    const vr = (r) => P.io.vicRead(r), vw = (r, v) => P.io.vicWrite(r, v & 255);
    // $D010, the sprites' ninth bits of X, read, changed (f) and written back by the main program,
    // with a checkpoint at the read (lda) and at the write (sta): the play interrupt sets Willy's bit
    // in it, and where it comes between the two the game writes back the bit as it was and loses the
    // interrupt's, until its next. A replay in test_play.js's lockstep, and the page's interrupt,
    // then fall where the game's did.
    function* msb(lda, sta, f) { yield { cp: lda }; const d = vr(0x10); yield { cp: sta }; vw(0x10, f(d)); }
    const sw = (r, v) => P.io.sidWrite(r, v & 255);
    const ib = (a) => P.io.irqByte(a) & 255;                       // a byte the interrupt writes
    const w16 = (a) => M[a] | M[a + 1] << 8;
    const dec = (a) => (M[a] = (M[a] - 1) & 255);
    const inc = (a) => (M[a] = (M[a] + 1) & 255);
    P.sei = () => { P.I = 1; };
    P.cli = () => { P.I = 0; };

    // ---- the start-up and the title ($080D, $A000-$AA94)
    P.bcs_start = function () {                                    // $080D
      M[0x033C] = 0xE5; M[0x033D] = 0xCB; M[1] = 0x36;
    };
    P.initialize_title = function () {                             // $A744
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, (P.io.cia2Read(0) & 0xFC) | 2);
      vw(0x18, (vr(0x18) & 0x0F) | 0xF0);
      vw(0x18, (vr(0x18) & 0xF0) | 0x0E);
      vw(0x11, vr(0x11) & 0xBF);
      P.clear_and_copy_title_screen();
      vw(0x21, 0); vw(0x20, 0);
      for (let x = 0; x < 0x28; x++) wb(0xDB98 + x, 1);
      M[0x4B] = 8; M[0x4F] = 2;
      P.initialize_title_music();
      vw(0x16, 0);
      M[0xFB] = 0xC7; M[0xFC] = 0xA2;
      P.sei();
      vw(0x1A, 1); vw(0x12, 0xEA); vw(0x11, vr(0x11) & 0x7F);
      P.io.ciaWrite(0x0E, P.io.ciaRead(0x0E) & 0xFE);
      M[0x50] = 0; M[0x51] = 0;
      vw(0x15, 0);
      M[0x0314] = 0x01; M[0x0315] = 0xA8;
      P.cli();
    };
    P.clear_and_copy_title_screen = function () {                  // $A8AA
      M.fill(0x20, 0x7C00, 0x8000);
      // CHROUT $08 (Shift and Commodore no longer switch the character set): nothing kept of it
      for (let x = 0; x < 256; x++) M[0x7CF0 + x] = M[0xA8D9 + x];
      for (let x = 0; x < 0xB0; x++) M[0x7DF0 + x] = M[0xA9D9 + x];
    };
    P.clear_sid_registers = function () {                          // $AA89
      for (let x = 0; x < 0x19; x++) sw(x, 0);
    };
    P.initialize_title_music = function () {                       // $A0CD
      M[0x0A] = 0x00; M[0x0B] = 0x6C; M[0x0C] = 0x48; M[0x0D] = 0x72; M[0x0E] = 0x50; M[0x0F] = 0x73;
      P.clear_sid_registers();
      sw(0x05, 8); sw(0x0C, 8); sw(0x13, 8);
      sw(0x06, 0x90); sw(0x0D, 0x90); sw(0x14, 0x90);
      sw(0x02, 0x58); sw(0x03, 0x02); sw(0x09, 0x6C); sw(0x0A, 0x02); sw(0x10, 0x80); sw(0x11, 0x02);
      sw(0x04, 0x41); sw(0x0B, 0x41); sw(0x12, 0x41);
      sw(0x18, 0x0A);
      M[0xFE] = 0;
      M[0x4C] = 1; M[0x4D] = 1; M[0x4E] = 1;
    };
    // One tick of the title tune. The end of voice 1's part (a length of $FF) pulls the tick's own
    // return off the stack, so the rest of that tick does not run.
    P.tick_title_music = function () {                             // $A139
      if (dec(0x4C) === 0 && !P.read_title_music_voice1()) return;
      if (dec(0x4D) === 0) P.read_title_music_voice2();
      if (dec(0x4E) === 0) P.read_title_music_voice3();
    };
    // a voice's next note: the pitch (0 a rest) and its length, at the voice's pointer; freq is the
    // voice's first SID register
    function titleNote(ptr, dur, freq) {
      const p = w16(ptr);
      M[dur] = M[(p + 1) & 0xFFFF];
      const n = M[p];
      if (n === 0) P.silence_title_sid_voice(freq);
      else {
        const x = (n << 1) & 255;
        sw(freq, M[0xA207 + x]); sw(freq + 1, M[0xA208 + x]); sw(freq + 4, 0x41);
      }
      const q = p + 2;
      M[ptr] = q & 255; M[ptr + 1] = (q >> 8) & 255;
    }
    P.read_title_music_voice1 = function () {                      // $A14F: false at the tune's end
      const p = w16(0x0A);
      if (M[(p + 1) & 0xFFFF] === 0xFF) {
        M[0xFE] = 0xFF;
        P.clear_sid_registers();
        return false;
      }
      titleNote(0x0A, 0x4C, 0);
      return true;
    };
    P.read_title_music_voice2 = function () { titleNote(0x0C, 0x4D, 7); };      // $A191
    P.read_title_music_voice3 = function () { titleNote(0x0E, 0x4E, 0x0E); };   // $A1C5
    P.silence_title_sid_voice = function (x) {                     // $A1F9
      sw(x, 0); sw(x + 1, 0); sw(x + 4, 0x40);
    };
    // The keyboard for the title: the rows of CIA 1 in turn, then the first key down, as a code from
    // the table at $A043, in $51, with $50 the count (0 or 1).
    P.scan_title_keyboard = function () {                          // $A083
      M[0x50] = 0;
      M[0x55] = 0xFE;
      for (let x = 0; ; x++) {
        P.io.ciaWrite(0, M[0x55]);
        M[0xA003 + x] = P.io.ciaRead(1);
        const c = M[0x55] >> 7;
        M[0x55] = ((M[0x55] << 1) | 1) & 255;
        if (!c) break;
      }
      for (let x = 0; x < 8; x++) {
        const row = M[0xA003 + x];
        for (let y = 0; y < 8; y++) {
          if (row & (0x80 >> y)) continue;
          M[0x54] = y;
          M[0x50] = 1;
          M[0x51] = M[0xA043 + ((x << 3) | y)];
          return;
        }
      }
    };
    P.fill_title_color_rows = function () {                        // $A88F
      const v = M[0xA8A8 + ((ib(0xFB) >> 2) & 1)];
      for (let x = 0; x < 0x300; x++) wb(0xD800 + x, v);
    };
    // The title loop, until Return or the fire button starts a game ($2000).
    P.title_main_loop = function* () {                             // $A7D3
      for (;;) {
        yield { cp: 0xA7D3 };
        P.fill_title_color_rows();
        if (ib(0x50) && (ib(0x51) === 0x0D || !(P.io.ciaRead(0) & 0x10))) {
          yield { cp: 0xA7E0 };
          P.sei();
          vw(0x11, 0x5B); vw(0x16, 0x08);
          return;
        }
        if (ib(0xFE)) {
          P.sei(); P.initialize_title_music(); P.cli();
        }
      }
    };
    // The title's raster interrupt, at line 0 and line $EA: the tune, three ticks every second
    // frame; the keys; the ticker, moved a pixel a frame by the fine scroll and a character every
    // eight; the KERNAL's exit at $FEBC.
    P.title_irq = function () {                                    // $A801
      vw(0x19, vr(0x19));
      if (!(vr(0x12) & 0x80)) {
        vw(0x12, 0xEA); vw(0x11, vr(0x11) & 0x7F); vw(0x16, vr(0x16) & 0xF8);
        if (dec(0x4F) === 0) {
          M[0x4F] = 2;
          P.tick_title_music(); P.tick_title_music(); P.tick_title_music();
        }
        if (M[0xFC] === 0xA7 && M[0xFB] === 0x1C) { M[0xFB] = 0xC7; M[0xFC] = 0xA2; }
        P.scan_title_keyboard();
        return;
      }
      vw(0x12, 0); vw(0x11, vr(0x11) & 0x7F);
      if (dec(0x4B) === 0) {
        if (inc(0xFB) === 0) inc(0xFC);
        const p = w16(0xFB);
        for (let y = 0x27; y >= 0; y--) {
          let c = M[(p + y) & 0xFFFF];
          if (c >= 0x41) c &= 0x1F;
          M[0x7F98 + y] = c;
        }
        M[0x4B] = 8;
        vw(0x16, vr(0x16) & 0xF8);
      } else vw(0x16, (vr(0x16) & 0xF0) | M[0x4B]);
    };

    // ---- the in-game tune ($2005-$20EB)
    P.initialize_game_music = function () {                        // $2005
      M[0x90] = 0x00; M[0x91] = 0x9C; M[0x92] = 0xEE; M[0x93] = 0x9D;
      M[0x0180] = 0xEC; M[0x0181] = 0x20;
      for (let x = 1; x < 0x19; x++) sw(x, 1);
      sw(0x05, 0x3A); sw(0x06, 0x98); sw(0x0C, 0x28); sw(0x0D, 0xAA);
      sw(0x02, 0x20); sw(0x03, 0x03); sw(0x09, 0x58); sw(0x0A, 0x02);
      sw(0x04, 0x41); sw(0x0B, 0x41);
      sw(0x18, 0x0C);
      M[0x94] = 1; M[0x95] = 1;
    };
    // One tick: each voice counts its note down and reads the next at 0. The end of voice 1's part
    // starts the tune again and pulls the tick's own return, so voice 2 waits for the next tick.
    P.tick_game_music = function () {                              // $2066
      if (dec(0x94) === 0 && !P.read_game_music_voice1()) return;
      if (dec(0x95) === 0) P.read_game_music_voice2();
    };
    function gameNote(ptr, dur, freq, off) {
      const p = w16(ptr), n = M[p];
      if (n === 0) P.silence_sid_voice_by_offset(off);
      else {
        const x = (n << 1) & 255;
        sw(freq, M[0x20EC + x]); sw(freq + 1, M[0x20ED + x]); sw(freq + 4, 0x41);
      }
      const q = p + 2;
      M[ptr] = q & 255; M[ptr + 1] = (q >> 8) & 255;
    }
    P.read_game_music_voice1 = function () {                       // $2075: false at the tune's end
      const d = M[(w16(0x90) + 1) & 0xFFFF];
      if (d === 0xFF) { P.initialize_game_music(); return false; }
      M[0x94] = d;
      gameNote(0x90, 0x94, 0, 4);
      return true;
    };
    P.read_game_music_voice2 = function () {                       // $20B2
      M[0x95] = M[(w16(0x92) + 1) & 0xFFFF];
      gameNote(0x92, 0x95, 7, 0x0B);
    };
    P.silence_sid_voice_by_offset = function (x) { sw(x, 0x40); }; // $20E6

    // ---- a game ($2C57-$30FE)
    P.initialize_game = function () {                              // $2C57
      P.sei();
      P.io.cia2Write(2, P.io.cia2Read(2) | 3);
      P.io.cia2Write(0, (P.io.cia2Read(0) & 0xFC) | 2);
      vw(0x18, 0xFE);
      // CHROUT $08: nothing kept of it
      M[1] = 0x36;
      P.io.ciaWrite(0x0D, P.io.ciaRead(0x0D) & 0x7F);
      P.io.ciaWrite(0x0E, P.io.ciaRead(0x0E) & 0xFE);
      vw(0x11, vr(0x11) | 0x40);
      M.fill(0, 0x07, 0x60);
      for (let p = 0x22C3; p < 0x2403; p += 4) M[p + 3] = 0;
      M[0x16] = 0x03; M[0x17] = 0x24;
      M[0x56] = 6; M[0x55] = 6;
      M[0x0E] = 0x21; M[0x5C] = 0x21;
      M[0x4F] = 0x14; M[0x5B] = 0x14;
      M[0x1C] = 0x68; M[0x58] = 0x68; vw(0x01, 0x68);
      vw(0x22, 0); vw(0x15, 0); M[0x0400] = 0; M[0x0401] = 0; vw(0x23, 0);
      vw(0x00, 0xD8); vw(0x01, 0x68);
      M[0x7FF8] = 6;
      M[0x3E] = 0x0C; M[0x5F] = 0x0C;
      M[0x42] = 2; M[0x41] = 8; M[0x35] = 0xFF;
      vw(0x2D, 1);
      M[0x3F] = 0x0F;
      for (let x = 0; x < 0x19; x++) sw(x, 0);
      vw(0x11, vr(0x11) & 0x7F); vw(0x12, 0xFB); vw(0x1A, 1);
      M[0x0314] = 0xE1; M[0x0315] = 0x33;
      P.cli(); P.sei();
      P.initialize_game_music();
      P.cli();
      M[0xCFF0] = 0x91; M[0xCFF1] = 0x37; M[0xCFF2] = 0x49; M[0xCFF3] = 0x33;
      M[0xCFF4] = 0x4F; M[0xCFF5] = 0x33; M[0xCFF6] = 0xE4; M[0xCFF7] = 0x35;
      M[0xCFF8] = 0xC6; M[0xCFF9] = 0x2D; M[0xCFFA] = 0xEF; M[0xCFFB] = 0x38;
      M[0xCFFC] = 0xC3; M[0xCFFD] = 0x22;
      M.fill(0xC0, 0x7C00, 0x8000);
      M.fill(0xA0, 0x7EF8, 0x7EF8 + 0xFF);
      for (let x = 0; x < 0xFF; x++) wb(0xDAF8 + x, 1);
      for (let x = 5; x >= 0; x--) M[0x37 + x] = M[0x2267 + x];
      for (let x = 0x1F; x >= 0; x--) M[0x7F20 + x] = M[0x2241 + x] | 0x40;
    };
    // Willy at the edge of the room he enters, by which exit of the last room led here.
    P.prepare_room_entry = function () {                           // $2DC6
      const r = M[0x0E];
      if (r === M[0x1D]) { M[0x33] = 2; M[0x51] = 0; M[0x53] = 0; M[0x1C] = 0x68; }
      else if (r === M[0x1E]) { M[0x1C] = 0; M[0x33] = 2; }
      else if (r === M[0x20]) { M[0x4F] = 0; M[0x32] = 4; }
      else if (r === M[0x1F]) { M[0x4F] = 0x1E; M[0x32] = 4; }
    };
    // The sprites placed for the room. The interrupt moves the rope's three (5 to 7) too, so there is
    // a checkpoint at each write to theirs: test_play.js's lockstep replays an interrupt where the
    // port next yields, and so on the side of the write it came on.
    P.initialize_room_vic_state = function* () {                   // $2E07
      vw(0x15, 1);
      vw(0x00, 0); vw(0x10, 0); vw(0x02, 0); vw(0x04, 0); vw(0x06, 0); vw(0x08, 0);
      yield { cp: 0x2E20 }; vw(0x0A, 0);
      yield { cp: 0x2E23 }; vw(0x0C, 0);
      yield { cp: 0x2E26 }; vw(0x0E, 0);
      yield { cp: 0x2E29 }; vw(0x12, 0); vw(0x01, 0);
      vw(0x03, 0x10); vw(0x05, 0x30); vw(0x07, 0x50); vw(0x09, 0x70);
      yield { cp: 0x2E45 }; vw(0x0B, 0x90);
      yield { cp: 0x2E4A }; vw(0x0D, 0xB0);
      yield { cp: 0x2E4F }; vw(0x0F, 0xD0);
      yield { cp: 0x2E52 };
      P.io.collide(0x1E);
    };
    P.copy_room_record = function () {                             // $2E55
      const r = M[0x0E];
      M[0x28] = (r < 0x1E ? r + 0xB0 : r + 0xC2) & 255;
      M[0x27] = 0;
      P.sei();
      M[1] = 0x34;
      const src = M[0x28] << 8;
      for (let y = 0; y < 256; y++) M[0x0840 + y] = M[src + y];
      M[1] = 0x36;
      P.cli();
    };
    P.capture_room_entry_checkpoint = function () {                // $2E7C
      M[0x57] = M[0x33]; M[0x59] = M[0x51]; M[0x5B] = M[0x4F]; M[0x58] = M[0x1C];
      M[0x5C] = M[0x0E]; M[0x5A] = M[0x32]; M[0x5D] = ib(0x50); M[0x5E] = M[0x52];
    };
    // One cell of the room's map: its two bits pick the screen code at $222C and the colour at $23.
    P.expand_packed_room_cell = function (a) {                     // $35A7
      const x = a & 3;
      M[0x08] = 0;
      const y = (M[0x62] << 1) & 255, s = M[0x2BCB + y] + M[0x61];
      M[0x07] = s & 255; M[0x09] = s & 255;
      M[0x08] = (M[0x2BCC + y] + (s >> 8)) & 255;
      M[0x0A] = (M[0x08] + 0x5C) & 255;
      M[w16(0x07)] = M[0x222C + x];
      wb(w16(0x09), M[0x23 + x]);
      if (inc(0x61) === 0x20) { M[0x61] = 0; inc(0x62); }
      return M[0x0C];
    };
    P.build_room_visuals = function () {                           // $2E9C
      let a = M[0x0916];
      vw(0x20, a); vw(0x24, a);
      a = M[0x0917]; M[0x23] = a; vw(0x21, a);
      M[0x24] = M[0x0918]; M[0x25] = M[0x0919]; M[0x26] = M[0x091A]; M[0x15] = M[0x091B];
      M[0x61] = 0; M[0x62] = 0;
      sw(0x0E, 0); sw(0x0F, 0);
      for (let y = 0x1F; y >= 0; y--) {
        let c = M[0x0840 + y];
        if (c >= 0x41) c &= 0x1F;
        M[0x7EAC + y] = c | 0x80;
        wb(0xDAAC + y, 1);
      }
      for (let y = 0x20; y < 0xA0; y++) {
        M[0x0F] = y;
        M[0x0C] = M[0x0840 + y];
        a = P.expand_packed_room_cell(M[0x0C] >> 6);
        a = P.expand_packed_room_cell(a >> 4);
        a = P.expand_packed_room_cell(a >> 2);
        P.expand_packed_room_cell(a);
      }
      for (let x = 0x2F; x >= 0; x--) M[0x7908 + x] = M[0x08E0 + x];
      M[0x1A] = 4;
      for (let x = 3; x >= 0; x--) M[0x1D + x] = M[0x091C + x];
    };
    P.draw_room_conveyor = function () {                           // $2F28
      M[0x13] = 0;
      const a = M[0x0910];
      if (!a) return;
      if (a & 0x80) M[0x13] = 0xFE;
      inc(0x13);
      M[0x0D] = a & 0x3F;
      M[0x08] = 0;
      P.lookup_tile_at_cell(M[0x0912], M[0x0911]);
      let y = 0;
      do {
        M[(w16(0x07) + y) & 0xFFFF] = 0x25;
        wb(w16(0x09) + y, M[0x15]);
        y = (y + 1) & 255;
      } while (dec(0x0D) !== 0);
    };
    P.draw_room_ramp = function () {                               // $2F5A
      M[0x10] = 0; M[0x0B] = 0x29;
      if (M[0x0913] & 0x80) { M[0x10] = 0xFF; M[0x11] = M[0x0914]; return; }
      const a = M[0x0915];
      if (!a) return;
      let x = 1;
      if (a & 0x80) { M[0x0B] = 0x27; x = 0xFF; }
      M[0x11] = x;
      if (a & 0x40) M[0x12] = 0xFF;
      M[0x0D] = a & 0x3F;
      P.lookup_tile_at_cell(M[0x0914], M[0x0913]);
      x = M[0x0D];
      do {
        M[w16(0x07)] = 0x24;
        wb(w16(0x09), M[0x26]);
        let s = M[0x07] + M[0x0B]; M[0x07] = s & 255; M[0x08] = (M[0x08] + (s >> 8)) & 255;
        s = M[0x09] + M[0x0B]; M[0x09] = s & 255; M[0x0A] = (M[0x0A] + (s >> 8)) & 255;
        x = (x - 1) & 255;
      } while (x !== 0);
    };
    P.load_room_guardians = function* () {                         // $2FCD: false with none
      const n = M[0x0921];
      M[0x2D] = n;
      if (!n) return false;
      M[0x0C] = n;
      const src = (0x2443 + (M[0x0920] << 3)) & 0xFFFF;
      M[0x2B] = src & 255; M[0x2C] = src >> 8;
      let y = 0;
      do { for (let x = 0; x < 8; x++, y++) M[0x0940 + y] = M[(src + y) & 0xFFFF]; } while (dec(0x0C) !== 0);
      M[0x0C] = n;
      let x = 1;
      do { vw(0x15, M[0x2231 + x] | vr(0x15)); x++; } while (dec(0x0C) !== 0);
      M[0x0C] = n;
      x = 0; y = 0;
      do {
        M[0x0980 + y] = M[0x0940 + x] & 0x40 ? 0x80 : 0;
        const col = M[0x0941 + x];
        M[0x0988 + y] = col;
        M[0x14] = (col << 3) & 255;
        M[0x0F] = (M[0x0942 + x] << 3) & 255;
        M[0x7FF9 + y] = M[0x0943 + x];
        vw(3 + 2 * y, M[0x0F] + 0x32);
        const s = M[0x14] + 0x38;
        vw(2 + 2 * y, s);
        const b = y;
        yield* msb(s > 255 ? 0x3064 : 0x306C, 0x3072, (d) => (s > 255 ? d | M[0x2232 + b] : d & M[0x223A + b]));
        y++; x += 8;
      } while (dec(0x0C) !== 0);
      const c = (0x29EB + (M[0x0E] << 3)) & 0xFFFF;                 // the room's sprite colours
      M[0x07] = c & 255; M[0x08] = c >> 8;
      for (let k = 7; k >= 0; k--) vw(0x27 + k, M[c + k]);
      vw(0x17, 0);
      return true;
    };
    P.initialize_room_rope = function () {                         // $30A8
      const r = M[0x0922];
      M[0x0402] = r;
      if (!r) return;
      vw(0x17, 0xE0);
      M[0x0403] = 0x10; M[0x0404] = 1; M[0x0405] = 0xFF; M[0x0406] = 0xFF;
      M[0x7FFD] = 0xAC; M[0x7FFE] = 0xAD; M[0x7FFF] = 0xAE;
      P.io.collide(0x1F);
    };
    P.settle_collision_latches = function () {                     // $30D9
      for (let x = 0; x < 256; x++) P.io.collide(0x1E);
    };
    P.apply_room32_conveyor_fix = function () {                    // $30E1
      if (M[0x0E] !== 0x20) return;
      M[0x13] = 1;
      for (const a of [0x7C5A, 0x7C83, 0x7CAC, 0x7CD5, 0x7CFE, 0x7D27]) M[a] = 0x25;
    };
    // The room build, from $2E07 to the main loop, one routine after another, each a checkpoint: the
    // play interrupt sets the rope's sprites while the build sets the guardians' in the same registers.
    P.build_room = function* () {
      yield* P.initialize_room_vic_state();
      yield { cp: 0x2E55 };
      P.copy_room_record();
      yield { cp: 0x2E7C };
      P.capture_room_entry_checkpoint();
      yield { cp: 0x2E9C };
      P.build_room_visuals();
      yield { cp: 0x2F28 };
      P.draw_room_conveyor();
      yield { cp: 0x2F5A };
      P.draw_room_ramp();
      yield { cp: 0x2FCD };
      yield* P.load_room_guardians();
      yield { cp: 0x30A8 };
      P.initialize_room_rope();
      yield { cp: 0x30D9 };
      P.settle_collision_latches();
      yield { cp: 0x30E1 };
      P.apply_room32_conveyor_fix();
    };

    // ---- the main loop's routines ($30FF-$33DA, $35E4-$3A01)
    // The kind of tile in the room's cell at column x and row y: $07/$08 left at its screen
    // address, $09/$0A at its colour; a floor reads as a ramp (4) when $10 is set.
    P.lookup_tile_at_cell = function (x, y) {                      // $35E4
      M[0x08] = 0; M[0x14] = x & 255;
      const i = (y << 1) & 255, s = M[0x2BCB + i] + M[0x14];
      M[0x07] = s & 255; M[0x09] = s & 255;
      M[0x08] = (M[0x2BCC + i] + (s >> 8)) & 255;
      M[0x0A] = (M[0x08] + 0x5C) & 255;
      let a = M[w16(0x07)] & 0x1F;
      if (a === 1 && M[0x10]) a = 4;
      return a;
    };
    P.short_busy_wait = function () {};                            // $33D0: its cycles are its cost
    P.render_room_items = function () {                            // $3983
      if (dec(0x55) !== 0) return;
      M[0x55] = 0x12;
      inc(0x19);
      M[0x18] = 0;
      let p = 0x22C3;
      do {
        if (M[p] === M[0x0E] && M[p + 3] === 0) {
          M[0x08] = 0; M[0x14] = M[p + 1];
          const i = (M[p + 2] << 1) & 255, s = M[0x2BCB + i] + M[0x14];
          M[0x07] = s & 255; M[0x09] = s & 255;
          M[0x08] = (M[0x2BCC + i] + (s >> 8)) & 255;
          M[0x0A] = (M[0x08] + 0x5C) & 255;
          M[w16(0x07)] = 0x26;
          wb(w16(0x09), M[0x19]);
        }
        p += 4; M[0x16] = p & 255; M[0x17] = p >> 8;
        inc(0x19);
      } while (inc(0x18) !== 0x50);
      P.toggle_music_on_return();
    };
    P.toggle_music_on_return = function () {                       // $39F1
      if (ib(0x43) && ib(0x44) === 0x0D) M[0x35] ^= 0xFF;
    };
    P.position_arrow_sprite = function* (f, x, y) {                // $320E
      M[0x7FFE] = f;
      vw(0x0D, ((y << 3) & 255) + 0x32);
      const s = ((x << 3) & 255) + 0x38;
      vw(0x0C, s);
      if (s > 255) yield* msb(0x3227, 0x322C, (d) => d | 0x40);
      else yield* msb(0x3231, 0x3236, (d) => d & 0xBF);
    };
    P.update_arrows = function* () {                               // $314D
      M[0x18] = 0x0F; M[0x16] = 0x03; M[0x17] = 0x24;
      do {
        const p = w16(0x16);
        if ((M[p] & 0x7F) === M[0x0E]) yield* arrow(p);
        const q = p + 4;
        M[0x16] = q & 255; M[0x17] = q >> 8;
      } while (dec(0x18) !== 0);
    };
    function* arrow(p) {
      if (!(M[p] & 0x80)) {
        const t = (M[p + 1] - 1) & 255;
        M[p + 1] = t;
        if (t !== 0) {
          if (t === 0x0A) { sw(0x13, 0x29); sw(0x14, 0x49); sw(0x0F, 0x14); sw(0x12, 0x81); }
          return;
        }
        sw(0x12, 0); sw(0x0E, 0); sw(0x0F, 0);
        M[p] |= 0x80;
        vw(0x15, vr(0x15) | 0x40);
      }
      let a = M[p + 2];
      if (!(a & 0x80)) {
        a = (a + 1) & 255;
        if (a >= 0x20) {
          M[p + 2] = 0; vw(0x0D, 0);
          M[p] &= 0x7F;
          vw(0x15, vr(0x15) & 0xBF);
          return;
        }
        M[p + 2] = a;
        yield* P.position_arrow_sprite(0xAA, a, M[p + 3]);
        return;
      }
      a = ((a & 0x7F) - 1) & 255;
      if (a & 0x80) {
        M[p + 2] = 0x9F; vw(0x0D, 0);
        M[p] &= 0x7F;
        return;
      }
      M[p + 2] = a | 0x80;
      yield* P.position_arrow_sprite(0xAB, a, M[p + 3]);
    }
    P.animate_bathroom_toilet = function* () {                     // $324E: false outside The Bathroom
      if (M[0x0E] !== 0x21) return false;
      vw(0x15, vr(0x15) | 0x80);
      vw(0x2E, 1);
      inc(0x1B);
      M[0x7FFF] = ((M[0x1B] >> 4) & 1) | 0x0E;
      yield* msb(0x3270, 0x3275, (d) => d | 0x80);
      vw(0x0E, 0x18); vw(0x0F, 0x9A);
      return true;
    };
    P.animate_maria = function* () {                               // $3284
      if (M[0x0400] || M[0x0E] !== 0x23) return;
      vw(0x15, 0x81);
      yield* msb(0x3294, 0x3299, (d) => d & 0x7F);
      vw(0x0E, 0xA8); vw(0x0F, 0x8A); vw(0x2E, 7);
      const r = M[0x1C] >> 3;
      if (r >= 0x0D) { inc(0x1B); M[0x7FFF] = ((M[0x1B] & 8) >> 3) | 2; }
      else M[0x7FFF] = r >= 0x0C ? 4 : 5;
    };
    P.schedule_guardian_updates = function* () {                   // $32D4
      if (dec(0x3E) !== 0) return;
      M[0x3E] = 0x0C;
      M[0x34] = M[0x2D];
      if (!M[0x34]) return;
      let x = 0;
      do {
        M[0x2F] = x >> 3; M[0x2E] = x;
        if (M[0x0940 + x] & 0x80) yield* P.update_horizontal_guardian(x);
        else P.update_vertical_guardian(x);
        x = (M[0x2E] + 8) & 255;
      } while (dec(0x34) !== 0);
    };
    // A guardian that goes up and down: its sprite's Y moved by its step ($0946) between its
    // limits ($0944 below, $0947 above), its frame stepped through the record's mask ($0945).
    P.update_vertical_guardian = function (x) {                    // $3614
      const y = x >> 2, n = M[0x2F], r = M[0x2E];
      const flip = () => { M[0x0980 + n] ^= 0x80; };
      M[0x0C] = M[0x0980 + n];
      if (!(M[0x0C] & 0x80)) {
        M[0x31] = (vr(3 + y) + M[0x0946 + r]) & 255;
        if ((((M[0x31] - 0x32) & 255) >> 3) >= M[0x0944 + r]) { flip(); return; }
        vw(3 + y, M[0x31]);
        const a = inc(0x0C) & M[0x0945 + r] & 3;
        M[0x0980 + n] = a;
        M[0x7FF9 + n] = (a + M[0x0943 + r]) & 255;
        return;
      }
      M[0x31] = (vr(3 + y) - M[0x0946 + r]) & 255;
      const row = ((M[0x31] - 0x32) & 255) >> 3;
      if (row >= 0x0F || row < M[0x0947 + r]) { flip(); return; }
      vw(3 + y, M[0x31]);
      const a = (dec(0x0C) & M[0x0945 + r] & 3) | 0x80;
      M[0x0980 + n] = a;
      M[0x7FF9 + n] = ((a & 3) + M[0x0943 + r]) & 255;
    };
    // A guardian that goes across: four frames a cell, then a cell on, between its columns
    // ($0944 right, $0947 left); facing right it takes the frames four on when $0945 is 4 or more.
    P.update_horizontal_guardian = function* (x) {                 // $369E
      const y = x >> 2, n = M[0x2F], r = M[0x2E];
      const flip = () => { M[0x0980 + n] ^= 0x80; };
      const frame = (a) => {
        let f = ((a & 3) + M[0x0943 + r]) & 255;
        if (M[0x0945 + r] >= 4) f = (f + 4) & 255;
        M[0x7FF9 + n] = f;
      };
      const place = function* (a) {                                // $36F8
        M[0x0988 + n] = a;
        const s = ((a << 3) & 255) + 0x38;
        vw(2 + y, s);
        yield* msb(s > 255 ? 0x370A : 0x3712, 0x3718, (d) => (s > 255 ? d | M[0x2232 + n] : d & M[0x223A + n]));
        const st = M[0x0980 + n];
        if (st & 0x80) M[0x7FF9 + n] = ((st & 3) + M[0x0943 + r]) & 255;
        else frame(st);
      };
      const st = M[0x0980 + n];
      if (!(st & 0x80)) {
        M[0x31] = (st + 1) & 0x0F;
        if ((M[0x0945 + r] & 3) >= M[0x31]) {
          M[0x0980 + n] = M[0x31];
          frame(M[0x31]);
          return;
        }
        M[0x0980 + n] = 0;
        const a = inc(0x0988 + n);
        if (a >= M[0x0944 + r]) { flip(); return; }
        yield* place(a);
        return;
      }
      const a = ((st & 0x7F) - 1) & 255;
      if (!(a & 0x80)) {
        M[0x0980 + n] = a | 0x80;
        M[0x7FF9 + n] = ((a & 0x7F) + M[0x0943 + r]) & 255;
        return;
      }
      M[0x0980 + n] = 0x83;
      const c = dec(0x0988 + n);
      if ((c & 0x80) || c < M[0x0947 + r]) { flip(); return; }
      yield* place(c);
    };
    P.draw_spare_life_icons = function () {                        // $3304
      if (!M[0x41]) return;
      for (let y = 1, x = 0; ; y++, x += 3) {
        M[0x7F70 + x] = 0x7B; wb(0xDB70 + x, y);
        M[0x7F71 + x] = 0x7D; wb(0xDB71 + x, y);
        M[0x7F98 + x] = 0x7C; wb(0xDB98 + x, y);
        M[0x7F99 + x] = 0x7E; wb(0xDB99 + x, y);
        if (y === M[0x41]) return;
      }
    };
    // After a player update: the item sound, voice 3's pulse swept up from $20xx to $2500 when the
    // count has changed, each turn of the loop ($3377) yielding its cycles, for a page's clock and
    // its sound.
    P.continue_after_player_update = function* () {                // $334F
      if (M[0x0401] === M[0x0408]) return;
      sw(0x13, 0x4A); sw(0x14, 0x68);
      M[0x08] = 0x20;
      sw(0x12, 0x41); sw(0x10, 0x4C); sw(0x11, 0x04);
      do {
        const wrap = inc(0x07) === 0;
        if (wrap) inc(0x08);
        sw(0x0E, M[0x07]); sw(0x0F, M[0x08]);
        yield { cycles: wrap ? 34 : 30 };
      } while (M[0x08] !== 0x25);
      sw(0x12, 0x20);
    };
    // The death: the sprites off, a white border, voice 3's noise swept from $0200 to $1200 (each
    // turn of the loop at $3919 yielding its cycles); Willy back where he entered the room; the
    // spare lives' rows cleared; a life less.
    P.run_death_sequence = function* () {                          // $38EF: false at the last life
      vw(0x15, 0);
      const border = vr(0x20);
      vw(0x20, 1);
      sw(0x13, 0x4A); sw(0x14, 0xA6);
      M[0x07] = 0; M[0x08] = 2;
      sw(0x12, 0x81); sw(0x18, 0x0F);
      do {
        sw(0x0E, M[0x07]); sw(0x0F, M[0x08]);
        const wrap = inc(0x07) === 0;
        if (wrap) inc(0x08);
        yield { cycles: wrap ? 34 : 30 };
      } while (M[0x08] !== 0x12);
      sw(0x0E, 0); sw(0x0F, 0); sw(0x12, 0);
      sw(0x18, ib(0x5F));
      vw(0x20, border);
      M[0x33] = M[0x57]; M[0x51] = M[0x59]; M[0x4F] = M[0x5B]; M[0x1C] = M[0x58];
      M[0x0E] = M[0x5C]; M[0x32] = M[0x5A]; M[0x50] = M[0x5D]; M[0x52] = M[0x5E];
      for (let x = 0x1F; x >= 0; x--) { M[0x7F70 + x] = 0x80; M[0x7F98 + x] = 0x80; }
      P.io.collide(0x1E);
      return !(dec(0x41) & 0x80);
    };
    P.game_over_delay_inner = function* () {                       // $38E3
      M[0x31] = 0x10;
      do { yield { cp: 0x38E7 }; P.short_busy_wait(); } while (dec(0x31) !== 0);
    };
    P.game_over_delay_outer = function* () {                       // $38D8
      M[0x34] = 0x14;
      do { yield* P.game_over_delay_inner(); } while (dec(0x34) !== 0);
      yield* P.game_over_delay_inner();
    };
    // Game over: the room wiped column by column with the border stepping through the colours, then
    // the boot coming down on Willy, and back to the title.
    P.game_over_or_abort_to_title = function* () {                 // $383B
      sw(0x18, 0); vw(0x15, 0);
      M[0x36] = 0xFF;
      M[0x34] = 0; M[0x0F] = 0;
      do {
        do {
          P.lookup_tile_at_cell(M[0x34], M[0x0F]);
          M[w16(0x07)] = 0x20;
          wb(w16(0x09), 0);
        } while (inc(0x0F) !== 0x10);
        M[0x0F] = 0;
        vw(0x20, M[0x34]);
        yield { cp: 0x386D };
        yield* P.game_over_delay_inner();
      } while (inc(0x34) !== 0x20);
      vw(0x05, 0xA2); vw(0x02, 0xB0); vw(0x04, 0xB0);
      M[0x7FF9] = 8; M[0x7FFA] = 1;
      vw(0x03, 0x92); vw(0x27, 1); vw(0x28, 1); vw(0x29, 0x0A); vw(0x10, 0); vw(0x15, 7); vw(0x00, 0xB0);
      vw(0x01, 0); M[0x7FF8] = 0;
      do {
        vw(0x01, vr(0x01) + 1);
        vw(0x20, vr(0x01));
        yield { cp: 0x38C1 };
        P.short_busy_wait();
      } while (vr(0x01) !== 0x92);
      vw(0x28, vr(0x21));
      yield { cp: 0x38D1 };
      yield* P.game_over_delay_outer();
      P.sei();
    };

    // ---- the keys and the joystick ($3791)
    P.scan_gameplay_input = function () {                          // $3791
      M[0x4B] = 0; M[0x49] = 0; M[0x4A] = 0;
      const j = P.io.ciaRead(0);
      M[0x54] = j;
      if (!(j & 0x10)) M[0x4A] = 0xFF;
      if (!(j & 0x04)) M[0x49] = 0xFF;
      if (!(j & 0x08)) M[0x49] = 0x01;
      M[0x43] = 0;
      M[0x48] = 0xFE;
      for (let x = 0; ; x++) {
        P.io.ciaWrite(0, M[0x48]);
        M[0x0800 + x] = P.io.ciaRead(1);
        const c = M[0x48] >> 7;
        M[0x48] = ((M[0x48] << 1) | 1) & 255;
        if (!c) break;
      }
      rows: for (let x = 0; x < 8; x++) {
        const row = M[0x0800 + x];
        for (let y = 0; y < 8; y++) {
          if (row & (0x80 >> y)) continue;
          M[0x47] = y;
          const n = inc(0x43);
          M[(0x43 + n) & 255] = M[0x2BEB + ((x << 3) | y)];
          if (n === 3) break rows;
        }
      }
      // each key down against the lists of left, right and jump keys, last key first; a match
      // leaves A at what it stored, so the lists after it in the same turn see that, not the key
      for (let x = M[0x43]; x !== 0; x--) {
        let a = M[0x43 + x];
        for (let y = 0x0A; y >= 0; y--) {
          if (a === M[0x2C2B + y]) { a = 0xFF; M[0x49] = 0xFF; }
          if (a === M[0x2C36 + y]) { a = 0x01; M[0x49] = 0x01; }
          if (a === M[0x2C41 + y]) { a = 0xFF; M[0x4A] = 0xFF; }
        }
      }
      if (M[0x43] && ((M[0x49] ^ M[0x60]) === 0xFE)) { M[0x4B] = 0xFE; M[0x60] = M[0x49]; }
    };

    // ---- the play interrupt ($33DB-$3593)
    P.game_irq = function () {                                     // $33E1
      const s = vr(0x19);
      vw(0x19, s);
      if (!(s & 1) || M[0x36]) return;
      if (!(vr(0x12) & 0x80)) {                                    // $3594, at line 0
        vw(0x11, vr(0x11) & 0x7F); vw(0x12, 0xFB);
        P.scan_gameplay_input();
        return;
      }
      vw(0x12, 0); vw(0x11, vr(0x11) & 0x7F);
      if (M[0x36]) { sw(0x18, 0); return; }
      if (!M[0x35]) {
        sw(0x04, 0x40); sw(0x0B, 0x40);
        sw(0x00, 0); sw(0x01, 0); sw(0x07, 0); sw(0x08, 0);
      } else if (dec(0x42) === 0) {
        P.tick_game_music(); P.tick_game_music(); P.tick_game_music();
        M[0x42] = 2;
      }
      if (dec(0x3D) === 0) {                                       // the clock, every 50 frames
        M[0x3D] = 0x32;
        for (let x = 5; x >= 0; x--) {
          if (inc(0x37 + x) < M[0x2261 + x]) break;
          M[0x37 + x] = 0x30;
        }
      }
      M[0x7F47] = M[0x3C]; M[0x7F46] = M[0x3B]; M[0x7F45] = 0x3A; M[0x7F44] = M[0x3A];
      M[0x7F43] = M[0x39]; M[0x7F42] = 0x3A; M[0x7F41] = M[0x38]; M[0x7F40] = M[0x37];
      for (let x = 7; x >= 0; x--) M[0x7F40 + x] |= 0x40;
      M[1] = 0x34;                                                 // the conveyors' glyph rows
      for (let x = 0x25; x > 0; x -= 2) {
        M[0x22] = M[0x2271 + x]; M[0x21] = M[0x2271 + x - 1];
        const p = w16(0x21), v = M[p];
        M[p] = (v >> 1) | (v & 1 ? 0x80 : 0);
      }
      for (let x = 0x2B; x > 0; x -= 2) {
        M[0x22] = M[0x2297 + x]; M[0x21] = M[0x2297 + x - 1];
        const p = w16(0x21), v = M[p];
        M[p] = ((v << 1) & 255) | (v >> 7);
      }
      const room = w16(0x27);
      for (let x = 7; x >= 0; x--) M[0x7928 + x] = M[(room + 0xC0 + x) & 0xFFFF];
      M[1] = 0x36;
      if (dec(0x3F) === 0) {                                       // every 15 frames
        M[0x3F] = 0x0F;
        if (M[0x35]) {
          let a = M[0x44];
          if (a === 0x2B) {
            M[0x44] = 0;
            a = inc(0x5F);
            if (a === 0x10) { a = M[0x5F] = 0x0F; }
          }
          if (a === 0x2D) {
            M[0x44] = 0;
            if (dec(0x5F) & 0x80) M[0x5F] = 0;
          }
          sw(0x18, M[0x5F]);
          const f = (inc(0x40) & 3) << 5;
          for (let y = 0; y < 0x20; y++) M[0x79D8 + y] = M[0x21AC + f + y];
        }
      }
      if (M[0x0402] && !M[0x0407]) {                               // a rope's staged sprites
        for (let x = 0; x < 0xC0; x++) M[0x6B00 + x] = M[0x0500 + x];
        for (let x = 5; x >= 0; x--) vw(0x0A + x, M[0x05C0 + x]);
        M[0x0407] = 0xFF;
      }
      const sx = ((M[0x4F] << 3) & 255) + 0x38;                     // Willy's sprite
      vw(0x00, sx);
      vw(0x10, sx > 255 ? vr(0x10) | 1 : vr(0x10) & 0xFE);
      vw(0x01, M[0x1C] + 0x32);
      M[0x54] = M[0x32] >> 1;
      M[0x50] = (M[0x50] & 4) | M[0x54];
      M[0x7FF8] = (M[0x50] + 6) & 255;
    };

    // ---- the player ($0FD2-$1CAD)
    const kill = () => { M[0x51] = 0; M[0x53] = 0; throw KILL; };   // $15F0
    P.initialize_tile_location = function () {                    // $1688
      M[0x1014] = M[0x4F]; M[0x0F] = M[0x1C] >> 3;
    };
    P.probe_tile_right = () => P.lookup_tile_at_cell((M[0x1014] + 1) & 255, M[0x0F]);           // $1051
    P.probe_tile_current = () => P.lookup_tile_at_cell(M[0x1014], M[0x0F]);                    // $105A
    P.probe_tile_above = () => P.lookup_tile_at_cell(M[0x1014], (M[0x0F] - 1) & 255);          // $1062
    P.probe_tile_two_rows_below = () => P.lookup_tile_at_cell(M[0x1014], (M[0x0F] + 2) & 255); // $106B
    P.align_ramp_animation_phase = function () {                   // $1695
      M[0x32] = ib(0x50) < 4 ? 2 : 6;
    };
    // Takes the item in the cell the last lookup pointed $07/$08 at, if one there is not yet taken.
    P.collect_item_if_present = function () {                      // $15FB
      M[0x18] = 0;
      M[0x16] = M[0xCFFC]; M[0x17] = M[0xCFFD];
      M[0x15F9] = M[0x07]; M[0x15FA] = M[0x08];
      do {
        const p = w16(0x16);
        if (M[p] === M[0x0E] && M[p + 3] === 0) {
          P.lookup_tile_at_cell(M[p + 1], M[p + 2]);
          if (M[0x07] === M[0x15F9] && M[0x08] === M[0x15FA]) {
            M[w16(0x07)] = 0x20;
            M[p + 3] = 0xFF;
            P.sei();
            const n = adcD(M[0x0401], 1, 0) & 255;
            M[0x0401] = n;
            if (n === 0x50) M[0x0400] = 1;
            P.cli();
          }
        }
        const q = p + 4;
        M[0x16] = q & 255; M[0x17] = q >> 8;
      } while (inc(0x18) !== 0x50);
      const n = M[0x0401];
      M[0x7F32] = (n & 0x0F) | 0xB0;
      M[0x7F31] = (n >> 4) | 0xB0;
    };
    // the cells beside or under Willy, by the kind the lookup gave
    P.handle_grounded_tile = function (a) {                        // $1187
      if (a === 2) throw CONT;
      if (a === 4) {
        if (ib(0x49) === M[0x11]) return;
        M[0x33] = 3;
        P.align_ramp_animation_phase();
        throw AGAIN;
      }
      if (a === 3) kill();
      if (a === 6) P.collect_item_if_present();
    };
    P.handle_ground_support_tile = function (a) {                  // $11C4
      if (a === 5) {
        const s = M[0x33];
        if (s === 4 || s === 5) return;                            // and A, the state, is not 3
        M[0x1015] = s; M[0x33] = 5; M[0x1016] = 0;
        return;
      }
      if (a === 3) kill();
    };
    // a new cell under Willy's feet after a step: air or an item lets him fall
    function stepped(a) {                                          // $11B1
      if (a === 0 || a === 6) { M[0x51] = 0; M[0x33] = 2; }
      throw CONT;
    }
    P.grounded_move_right = function () {                          // $10CC
      let a = M[0x32];
      if (a < 2) {
        if (M[0x4F] === 0x1F) {
          M[0x0E] = M[0x20]; M[0x33] = 2; M[0x51] = 0; M[0x53] = 0;
          throw ROOM;
        }
        P.initialize_tile_location();
        P.handle_grounded_tile(P.probe_tile_right());
        inc(0x0F);
        P.handle_grounded_tile(P.probe_tile_right());
        dec(0x0F);
        inc(0x1014);
        P.handle_ground_support_tile(P.probe_tile_two_rows_below());
        a = 2;
      } else {
        a++;
        if (a === 8) {
          inc(0x4F); M[0x32] = 0; M[0x50] = 0;
          P.initialize_tile_location();
          stepped(P.probe_tile_two_rows_below());
        }
      }
      M[0x32] = a; M[0x50] = a >> 1;
      throw CONT;
    };
    P.grounded_move_left = function () {                           // $112A
      if ((M[0x4F] | M[0x32]) === 0) {
        M[0x0E] = M[0x1F]; M[0x33] = 2; M[0x51] = 0; M[0x53] = 0;
        throw ROOM;
      }
      let a = M[0x32];
      if (a >= 6) {
        P.initialize_tile_location();
        P.handle_grounded_tile(P.probe_tile_current());
        inc(0x0F);
        P.handle_grounded_tile(P.probe_tile_current());
        dec(0x0F);
        P.handle_ground_support_tile(P.probe_tile_two_rows_below());
        a = 5;
      } else {
        a = (a - 1) & 255;
        if (a === 0xFF) {
          dec(0x4F); M[0x32] = 7; M[0x50] = 7;
          P.initialize_tile_location();
          stepped(P.probe_tile_two_rows_below());
        }
      }
      M[0x32] = a; M[0x50] = (a >> 1) | 4;
      throw CONT;
    };
    const walk = (a) => (a & 0x80 ? P.grounded_move_left() : P.grounded_move_right());   // $10C7
    P.update_player_grounded = function () {                       // $1091, state 0
      if (ib(0x4B) === 0xFE) { M[0x50] = ib(0x50) ^ 4; M[0x49] = 0; throw CONT; }
      M[0x1C] &= 0xF8;
      if (ib(0x4A)) {
        M[0x33] = 1; M[0x1013] = ib(0x49); M[0x52] = 0; M[0x51] = 0;
        throw AGAIN;
      }
      const a = ib(0x49);
      if (!a) throw CONT;
      walk(a);
    };
    P.update_player_falling = function () {                        // $11FB, state 2
      const fall = () => { M[0x1C] = (M[0x1C] + 2) & 255; inc(0x51); throw CONT; };
      M[0x1C] &= 0xFE;
      if (M[0x1C] & 6) fall();
      if ((M[0x1C] >> 3) >= 0x0E) { M[0x0E] = M[0x1E]; throw ROOM; }
      if (M[0x51] >= 0x11) M[0x53] = 0xFF;
      P.probe_jump_landing();
      if (M[0x33] === 2) fall();
      if (M[0x53] === 0xFF) kill();
      throw CONT;
    };
    P.handle_upward_jump_collision = function (a) {                // $12CB
      if (a === 2) { M[0x52] = 0; M[0x33] = 2; throw CONT; }
      if (a === 3) kill();
      if (a === 6) P.collect_item_if_present();
    };
    P.probe_jump_ceiling = function () {                           // $1296
      const up = () => P.handle_upward_jump_collision(P.probe_tile_above());
      if (ib(0x50) >= 4) {
        if (M[0x32] < 6) up();
        inc(0x1014); up();
        return;
      }
      if (M[0x32] >= 2) { inc(0x1014); up(); dec(0x1014); }
      up();
    };
    P.handle_landing_tile = function (a) {                         // $1321
      if (a === 1 || a === 2) { M[0x33] = 0; return; }
      if (a === 3) kill();
      if (a === 6) { P.collect_item_if_present(); return; }
      if (a === 4) {
        M[0x33] = 3;
        if (M[0x4F] !== 0x1F) P.align_ramp_animation_phase();
        return;
      }
      if (a === 5) { M[0x1015] = M[0x33]; M[0x33] = 5; M[0x1016] = 0; }
    };
    P.probe_jump_landing = function () {                           // $12E9
      P.initialize_tile_location();
      const down = () => P.handle_landing_tile(P.probe_tile_two_rows_below());
      if (ib(0x50) >= 4) {
        if (M[0x32] < 6) down();
        inc(0x1014); down();
        return;
      }
      if (M[0x32] >= 2) { inc(0x1014); down(); dec(0x1014); }
      down();
    };
    // The jump goes on a step: after the 36th Willy falls.
    function jumpCount() {                                         // $138F, $1444
      if (inc(0x52) === 0x24) { M[0x52] = 0; M[0x51] = 0; M[0x33] = 2; }
      throw CONT;
    }
    P.handle_horizontal_jump_collision = function (a) {            // $14A9
      if (a === 3) kill();
      if (a === 6) { P.collect_item_if_present(); return; }
      if (a === 2) jumpCount();
    };
    const climbs = () => M[0x102D + M[0x52]] !== 0 && (M[0x1C] & 6) === 0;
    P.update_player_jumping = function () {                        // $123D, state 1
      const d = M[0x1013];
      if (d & 0x80) P.advance_jump_left();
      if (d) P.advance_jump_right();
      if (climbs()) {
        if (M[0x1C] < 2) { M[0x0E] = M[0x1D]; throw ROOM; }
        P.initialize_tile_location();
        if (M[0x52] < 0x12) P.probe_jump_ceiling(); else P.probe_jump_landing();
      }
      M[0x1C] = (M[0x1C] + M[0x102D + M[0x52]]) & 255;
      if (inc(0x52) === 0x24) { M[0x52] = 0; M[0x33] = 2; }
      throw CONT;
    };
    P.advance_jump_right = function () {                           // $1362
      if (climbs()) {
        if (M[0x1C] < 2) { M[0x0E] = M[0x1D]; throw ROOM; }
        P.initialize_tile_location();
        if (M[0x52] < 0x12) P.probe_jump_ceiling();
        else {
          P.probe_jump_landing();
          if (M[0x33] !== 1) throw CONT;                           // $0FD2
        }
      }
      P.advance_jump_right_position();
    };
    P.advance_jump_right_position = function () {                  // $1372
      M[0x1C] = (M[0x102D + M[0x52]] + M[0x1C]) & 255;
      let a = M[0x32];
      if (a === 0) {
        if (M[0x4F] === 0x1F) { M[0x1C] &= 0xFE; M[0x0E] = M[0x20]; throw ROOM; }
        P.initialize_tile_location();
        P.handle_horizontal_jump_collision(P.probe_tile_right());
        inc(0x0F);
        P.handle_horizontal_jump_collision(P.probe_tile_right());
        if (M[0x1C] & 6) { inc(0x0F); P.handle_horizontal_jump_collision(P.probe_tile_right()); }
        a = 1;
      } else {
        a++;
        if (a === 8) { inc(0x4F); M[0x32] = 0; M[0x50] = 0; jumpCount(); }
      }
      M[0x32] = a; M[0x50] = a >> 1;
      jumpCount();
    };
    P.advance_jump_left = function () {                            // $1404
      if (climbs()) {
        if (M[0x1C] < 2) { M[0x0E] = M[0x1D]; throw ROOM; }
        P.initialize_tile_location();
        if (M[0x52] < 0x12) P.probe_jump_ceiling();
        else {
          P.probe_jump_landing();
          if (M[0x33] !== 1) throw CONT;                           // $0FE6
        }
      }
      P.advance_jump_left_position();
    };
    P.advance_jump_left_position = function () {                   // $1414
      M[0x1C] = (M[0x102D + M[0x52]] + M[0x1C]) & 255;
      if ((M[0x4F] | M[0x32]) === 0) { M[0x0E] = M[0x1F]; M[0x1C] &= 0xFE; throw ROOM; }
      let a = M[0x32];
      if (a >= 6) {
        P.initialize_tile_location();
        P.handle_horizontal_jump_collision(P.probe_tile_current());
        inc(0x0F);
        P.handle_horizontal_jump_collision(P.probe_tile_current());
        if (M[0x1C] & 6) { inc(0x0F); P.handle_horizontal_jump_collision(P.probe_tile_current()); }
        a = 5;
      } else {
        a = (a - 1) & 255;
        if (a & 0x80) { dec(0x4F); M[0x32] = 7; M[0x50] = 7; jumpCount(); }
      }
      M[0x32] = a; M[0x50] = (a >> 1) | 4;
      jumpCount();
    };
    P.update_player_on_ramp = function () {                        // $14C1, state 3
      const back = () => { M[0x33] = 0; throw CONT; };
      if (!M[0x14C0]) {
        if (ib(0x4B)) { M[0x50] = ib(0x50) ^ 4; throw CONT; }
        if ((ib(0x49) ^ M[0x11]) !== 0xFE) back();
        M[0x1C] &= 0xF8;
        if (!M[0x1C]) { M[0x0E] = M[0x1D]; throw ROOM; }
        if (M[0x32] !== (ib(0x50) < 4 ? 2 : 6)) back();
        M[0x14C0] = 8;
      }
      M[0x1C] = (M[0x1C] - 2) & 255;
      M[0x14C0] = (M[0x14C0] - 2) & 255;
      if (!M[0x14C0]) back();
      throw CONT;
    };
    P.update_player_on_conveyor = function () {                    // $151F, state 4
      if (ib(0x4A)) { M[0x33] = 1; M[0x1013] = M[0x13]; M[0x52] = 0; throw AGAIN; }
      walk(M[0x13]);
    };
    P.enter_or_reconcile_conveyor = function () {                  // $1538, state 5
      if (!M[0x1016]) {
        M[0x1C] &= 0xF8;
        M[0x1016] = 0xFF;
        const s = M[0x1015];
        if (s === 0) M[0x1017] = ib(0x50) < 4 ? 0x01 : 0xFF;
        else if (s === 1 || M[0x51] < 2) M[0x1017] = M[0x1013];
        else M[0x1017] = 0;
      }
      const d = M[0x1017];
      if (d === M[0x13]) { M[0x33] = 4; throw AGAIN; }
      const against = () => (ib(0x49) ^ M[0x13]) === 0xFE;
      if (!d) {
        if (!((((ib(0x50) & 4) << 5) ^ M[0x13]) & 0x80)) { M[0x33] = 4; throw AGAIN; }
        if (ib(0x4A)) { M[0x33] = 1; M[0x52] = 0; M[0x1013] = 0; throw AGAIN; }
        if (!against()) M[0x33] = 4;
        throw CONT;
      }
      if (!against()) { M[0x33] = 4; throw CONT; }
      if (ib(0x4A)) {
        M[0x33] = 1; M[0x52] = 0; M[0x1013] = ((M[0x13] ^ 0xFF) + 1) & 255;
        throw AGAIN;
      }
      walk(d);
    };
    // The rope: every second update its sprites are staged at $0500 and their places at $05C0, for
    // the interrupt to copy, and the swing moves on a position.
    P.produce_rope_sprite_staging = function* () {                 // $16A2
      if (!M[0x0402]) { M[0x1018] = 2; return; }
      if (dec(0x1018) !== 0) return;
      M[0x1018] = 2;
      vw(0x15, vr(0x15) | 0xE0);
      yield* msb(0x16C0, 0x16C5, (d) => d & 0x1F);
      const pos = M[0x0403], x = (pos << 1) & 255;
      M[0x07] = M[0x1856 + x]; M[0x08] = M[0x1857 + x];
      M[0x0407] = 0xFF;
      const src = w16(0x07);
      for (let y = 0; y < 0xC0; y++) M[0x0500 + y] = M[(src + y) & 0xFFFF];
      M[0x31] = (pos << 1) & 255;
      const at = 0x178A + ((pos * 6) & 0xFFFF);
      M[0x07] = at & 255; M[0x08] = (at >> 8) & 255;
      for (let y = 0; y < 6; y++) M[0x05C0 + y] = M[(at + y) & 0xFFFF];
      M[0x0407] = 0;
      const a = (M[0x0403] + M[0x0406]) & 255;
      if (M[0x0404] & 0x80) {
        if (a === 0x10) { M[0x0403] = 0; M[0x0406] = 1; M[0x0404] = 1; }
        else if (a === 0x22) { M[0x0403] = 0x21; M[0x0406] = 0xFF; M[0x0404] = 0xFF; }
        else M[0x0403] = a;
      } else if (a === 0xFF) { M[0x0403] = 0x11; M[0x0406] = 1; M[0x0404] = 0xFF; }
      else if (a === 0x11) { M[0x0403] = 0x10; M[0x0406] = 0xFF; M[0x0404] = 1; }
      else M[0x0403] = a;
    };
    P.compute_rope_trajectory_pointer = function () {              // $1C86
      let a = M[0x0403];
      if (a >= 0x11) a -= 0x11;
      const p = 0x189C + (a << 5);
      M[0x07] = p & 255; M[0x08] = (p >> 8) & 255;
      return p;
    };
    P.attach_player_to_rope_if_colliding = function* () {          // $1C4C
      if (!M[0x0402]) return;
      yield { cp: 0x1C52 };
      const c = P.io.collide(0x1E);
      M[0x31] = c;
      if (!(c & 1) || !(c & 0xE0) || M[0x33] === 6) return;
      const p = P.compute_rope_trajectory_pointer();
      for (let y = 0x1F; y >= 0; y -= 2) {
        if (M[0x1C] >= M[p + y]) {
          M[0x1019] = y >> 1; M[0x33] = 6; M[0x101A] = 2;
          return;
        }
      }
    };
    P.handle_rope_tile_collision = function (y) {                  // $1B96
      const a = M[(w16(0x07) + y) & 0xFFFF];
      if (a === 3) kill();
      if (a === 0) return;
      M[0x53] = 0; M[0x51] = 0; M[0x33] = 2;
      P.io.collide(0x1E);
      throw STAGE;
    };
    P.update_player_attached_to_rope = function* () {              // $1ABC, state 6
      M[0x0405] = ((M[0x0406] ^ M[0x0404]) + 1) & 255;
      if (dec(0x101A) === 0) {
        M[0x101A] = 2;
        let cells = true;
        if (ib(0x4B) === 0xFE) { M[0x50] = ib(0x50) ^ 4; M[0x49] = 0; }
        else {
          let a = ((ib(0x49) ^ M[0x0405]) + 1) & 255;
          if (a === 2) a = 0;
          a = (a + M[0x1019]) & 255;
          if (a === 0x10) {
            M[0x33] = 2; M[0x51] = 0; M[0x53] = 0;
            P.io.collide(0x1E);
            throw STAGE;
          }
          if (a === 0xFF) { M[0x0E] = M[0x1D]; throw ROOM; }
          M[0x1019] = a;
          if (ib(0x4A)) {
            M[0x1013] = ib(0x49); M[0x33] = 1; M[0x52] = 0; M[0x53] = 0; M[0x51] = 0;
            P.io.collide(0x1E);
            throw DISPATCH;
          }
        }
        if (cells) {
          yield { cp: 0x1B37 };
          if (P.io.collide(0x1F) & 1) {
            P.initialize_tile_location();
            P.lookup_tile_at_cell(M[0x1014], M[0x0F]);
            for (const y of [0, 1, 0x28, 0x29, 0x50, 0x51]) P.handle_rope_tile_collision(y);
          }
        }
      }
      const p = P.compute_rope_trajectory_pointer(), y = (M[0x1019] << 1) & 255;
      let a = M[(p + y) & 0xFFFF];
      if (M[0x0403] >= 0x11) a = (0xF7 - a) & 255;
      M[0x4F] = a >> 3; M[0x32] = a & 7;
      M[0x31] = M[0x32] >> 1;
      M[0x50] = (ib(0x50) & 4) | M[0x31];
      M[0x1C] = M[(p + y + 1) & 0xFFFF];
      throw CONT;
    };
    P.room_select_cheat = function () {                            // $1BBC
      if (M[0x1BBC] !== 0x60) throw new Error('the room-select cheat at $1BBC is not ported');
    };
    const STATES = ['update_player_grounded', 'update_player_jumping', 'update_player_falling', 'update_player_on_ramp',
      'update_player_on_conveyor', 'enter_or_reconcile_conveyor', 'update_player_attached_to_rope'];
    P.dispatch_state_from_table = function* () {                   // $107E
      const s = M[0x33], x = (s << 1) & 255;
      M[0x1011] = M[0x1003 + x]; M[0x1012] = M[0x1004 + x];
      if (s > 6) throw new Error('player state ' + s + ' has no handler');
      if (s === 6) yield* P.update_player_attached_to_rope();
      else P[STATES[s]]();
    };
    // One player update, from $3349 to where its vectors lead: CONT, ROOM or KILL.
    P.reset_stack_and_enter_player_tick = function* () {           // $3349
      let at = 0x1075;
      for (;;) {
        try {
          if (at === 0x1075) {
            yield { cp: 0x3349 };
            P.room_select_cheat();
            yield* P.attach_player_to_rope_if_colliding();
          }
          if (at !== 0x107E) yield* P.produce_rope_sprite_staging();
          yield* P.dispatch_state_from_table();
          throw new Error('a player state handler returned');
        } catch (e) {
          if (e === AGAIN) at = 0x1075;
          else if (e === STAGE) at = 0x107B;
          else if (e === DISPATCH) at = 0x107E;
          else if (e === CONT || e === ROOM || e === KILL) return e;
          else throw e;
        }
      }
    };

    // ---- the main loop ($30FF-$33CF): 'room', 'death' or 'over'
    P.game_main_loop = function* () {                              // $30FF
      for (;;) {
        yield { cp: 0x30FF };
        P.short_busy_wait();
        if (M[0x36]) {
          sw(0x18, 0);
          P.sei();
          yield { cp: 0x310C };
          P.scan_gameplay_input();
          yield { cp: 0x310F };
          P.cli();
          if (!ib(0x43)) continue;
        }
        if (ib(0x43)) {
          M[0x36] = 0;
          const k = ib(0x44);
          let pause = false;
          for (let x = 0x0A; x >= 0; x--) if (k === M[0x2C4C + x]) { pause = true; break; }
          if (pause) { M[0x36] = 0xFF; continue; }
        }
        if (ib(0x43) && ib(0x44) === 3) return 'over';
        yield { cp: 0x313F };
        P.render_room_items();
        if (dec(0x1A) === 0) { M[0x1A] = 8; yield* P.update_arrows(); }
        if (!(yield* P.animate_bathroom_toilet())) yield* P.animate_maria();
        yield* P.schedule_guardian_updates();
        P.draw_spare_life_icons();
        if (dec(0x56) === 0) {
          M[0x56] = 6;
          M[0x0408] = M[0x0401];
          const r = yield* P.reset_stack_and_enter_player_tick();
          if (r === ROOM) return 'room';
          if (r === KILL) return 'death';
          yield { cp: 0x334F };
          yield* P.continue_after_player_update();
        }
        yield { cp: 0x3392 };
        const c = P.io.collide(0x1E);
        M[0x31] = c;
        if (c & 1) {
          if (M[0x0E] === 0x21) { if (!(c & 0x80)) return 'death'; }
          else if (!M[0x0402] || (c & 0x1E)) return 'death';
        }
        if (ib(0x37) === 0x31 && ib(0x38) === 0x32) return 'over';
      }
    };

    // ---- the whole program
    P.game = function* () {                                        // $2000
      yield { cp: 0x2000 };
      P.initialize_game();
      let next = 'room';
      for (;;) {
        if (next === 'room') { yield { cp: 0x2DC6 }; P.prepare_room_entry(); }
        yield { cp: 0x2E07 };
        yield* P.build_room();
        next = yield* P.game_main_loop();
        if (next === 'death') {
          yield { cp: 0x38EF };
          if (!(yield* P.run_death_sequence())) next = 'over';
        }
        if (next === 'over') {
          yield { cp: 0x383B };
          yield* P.game_over_or_abort_to_title();
          return;
        }
      }
    };
    P.program = function* () {                                     // $080D
      P.bcs_start();
      for (;;) {
        P.initialize_title();
        yield* P.title_main_loop();
        yield* P.game();
      }
    };
    return P;
  }
  return { create, adcD, AGAIN, STAGE, DISPATCH, CONT, ROOM, KILL };
})();
